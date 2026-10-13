import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export type Job = { id: string; status: 'queued' | 'running' | 'succeeded' | 'failed'; input: { roadmapId: string; nodeId: string; sourceId: string }; packetId: string | null; error: string | null; createdAt: string; updatedAt: string };
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS entities (kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, input TEXT NOT NULL, packet_id TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status,created_at);`);
    // Preserve career identity on roadmaps created before the catalog was added.
    this.db.exec(`UPDATE entities SET body=json_set(body, '$.targetCareer',
      COALESCE((SELECT json_extract(learner.body, '$.targetCareer') FROM entities AS learner
        WHERE learner.kind='learner' AND learner.id=json_extract(entities.body, '$.learnerId')),
        'Flutter Mobile Developer'))
      WHERE kind='roadmap' AND json_type(body, '$.targetCareer') IS NULL;`);
    // One worker process owns a database. Interrupted jobs are safe to regenerate.
    this.db.prepare("UPDATE jobs SET status='queued' WHERE status='running'").run();
  }
  put(kind: string, value: { id: string }) {
    this.db.prepare('INSERT INTO entities(kind,id,body) VALUES (?,?,?)').run(kind, value.id, JSON.stringify(value));
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT body FROM entities WHERE kind=? AND id=?').get(kind, id);
    return row ? JSON.parse(row.body as string) as T : undefined;
  }
  list<T>(kind: string): T[] {
    return this.db.prepare('SELECT body FROM entities WHERE kind=? ORDER BY rowid').all(kind).map(r => JSON.parse(r.body as string) as T);
  }
  enqueue(input: Job['input']): Job {
    const id = randomUUID(), now = new Date().toISOString();
    this.db.prepare("INSERT INTO jobs VALUES (?,'queued',?,NULL,NULL,?,?)").run(id, JSON.stringify(input), now, now);
    return this.job(id)!;
  }
  job(id: string): Job | undefined {
    const r = this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
    return r ? { id: r.id as string, status: r.status as Job['status'], input: JSON.parse(r.input as string), packetId: r.packet_id as string | null, error: r.error as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string } : undefined;
  }
  claim(): Job | undefined {
    const row = this.db.prepare("UPDATE jobs SET status='running', updated_at=? WHERE id=(SELECT id FROM jobs WHERE status='queued' ORDER BY created_at,rowid LIMIT 1) RETURNING id").get(new Date().toISOString());
    return row ? this.job(row.id as string) : undefined;
  }
  complete(jobId: string, packet: { id: string }) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.put('packet', packet);
      this.db.prepare("UPDATE jobs SET status='succeeded', packet_id=?, updated_at=? WHERE id=? AND status='running'").run(packet.id, new Date().toISOString(), jobId);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  fail(id: string) {
    this.db.prepare("UPDATE jobs SET status='failed',error=?,updated_at=? WHERE id=?").run('Generation failed validation. Check the source and retry with a new job.', new Date().toISOString(), id);
  }
  close() { this.db.close(); }
}
