import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { ZodError } from 'zod';
import { LearnerInput, SourceInput, GenerateInput, validatePacket } from './schema.ts';
import type { Learner, Packet, Roadmap, Source } from './schema.ts';
import { createRoadmap } from './generator.ts';
import { openApi } from './openapi.ts';
import { careerCatalog } from './careers.ts';
import type { Store } from './store.ts';
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
async function readJson(req: IncomingMessage): Promise<unknown> {
  if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') throw new HttpError(415, 'Use Content-Type: application/json');
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 850_000) throw new HttpError(413, 'Request body exceeds 850000 bytes');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Malformed JSON'); }
}
function reply(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function requireEntity<T>(store: Store, kind: string, id: string): T {
  const value = store.get<T>(kind, id);
  if (!value) throw new HttpError(404, `${kind} not found`);
  return value;
}
function authorized(req: IncomingMessage, token: string) {
  const actual = createHash('sha256').update(req.headers.authorization ?? '').digest();
  const expected = createHash('sha256').update(`Bearer ${token}`).digest();
  return timingSafeEqual(actual, expected);
}
export function createApp(store: Store, options: { token?: string } = {}) {
  const server = createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-ID', requestId);
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      const method = req.method;
      if (method === 'GET' && path === '/health') {
        reply(res, 200, { status: 'ok', generator: 'development-extractive-v1' }); return;
      }
      if (options.token && !authorized(req, options.token)) throw new HttpError(401, 'A valid bearer token is required');
      if (method === 'GET' && path === '/openapi.json') { reply(res, 200, openApi(Boolean(options.token))); return; }
      if (method === 'GET' && path === '/v1/careers') { reply(res, 200, { items: careerCatalog }); return; }
      if (method === 'POST' && path === '/v1/learners') {
        const learner = { ...LearnerInput.parse(await readJson(req)), id: randomUUID(), createdAt: new Date().toISOString() };
        store.put('learner', learner); reply(res, 201, learner); return;
      }
      let match = /^\/v1\/learners\/([^/]+)\/roadmaps$/.exec(path);
      if (match && method === 'POST') {
        const learner = requireEntity<Learner>(store, 'learner', match[1]);
        const roadmap = createRoadmap(match[1], learner);
        store.put('roadmap', roadmap); reply(res, 201, roadmap); return;
      }
      if (match && method === 'GET') {
        requireEntity(store, 'learner', match[1]);
        reply(res, 200, { items: store.list<Roadmap>('roadmap').filter(r => r.learnerId === match![1]) }); return;
      }
      match = /^\/v1\/roadmaps\/([^/]+)$/.exec(path);
      if (match && method === 'GET') { reply(res, 200, requireEntity(store, 'roadmap', match[1])); return; }
      if (path === '/v1/sources' && method === 'POST') {
        const source = { ...SourceInput.parse(await readJson(req)), id: randomUUID(), createdAt: new Date().toISOString() };
        store.put('source', source);
        const { text, ...metadata } = source;
        reply(res, 201, { ...metadata, textBytes: Buffer.byteLength(text, 'utf8') }); return;
      }
      if (path === '/v1/packet-jobs' && method === 'POST') {
        const input = GenerateInput.parse(await readJson(req));
        const roadmap = requireEntity<Roadmap>(store, 'roadmap', input.roadmapId);
        requireEntity<Source>(store, 'source', input.sourceId);
        if (!roadmap.nodes.some(n => n.id === input.nodeId)) throw new HttpError(422, 'Node does not belong to this roadmap');
        const job = store.enqueue(input);
        res.setHeader('Location', `/v1/jobs/${job.id}`); reply(res, 202, job); return;
      }
      match = /^\/v1\/jobs\/([^/]+)$/.exec(path);
      if (match && method === 'GET') {
        const job = store.job(match[1]);
        if (!job) throw new HttpError(404, 'Job not found');
        reply(res, 200, job); return;
      }
      match = /^\/v1\/roadmaps\/([^/]+)\/packets$/.exec(path);
      if (match && method === 'GET') {
        requireEntity(store, 'roadmap', match[1]);
        reply(res, 200, { items: store.list<Packet>('packet').filter(p => p.roadmapId === match![1]).map(p => ({ id: p.id, nodeId: p.nodeId, title: p.title, version: p.version, bytes: validatePacket(p).bytes, reviewStatus: p.reviewStatus })) }); return;
      }
      match = /^\/v1\/packets\/([^/]+)(\/download)?$/.exec(path);
      if (match && method === 'GET') {
        const { json, bytes } = validatePacket(requireEntity<Packet>(store, 'packet', match[1]));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Length', bytes);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Packet-Bytes', bytes);
        if (match[2]) res.setHeader('Content-Disposition', `attachment; filename="packet-${match[1]}.json"`);
        res.end(json); return;
      }
      throw new HttpError(404, 'Route not found');
    } catch (error) {
      if (res.destroyed || res.writableEnded) return;
      if (error instanceof ZodError) reply(res, 422, { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', issues: error.issues.map(i => ({ path: i.path, message: i.message })), requestId } });
      else if (error instanceof HttpError) reply(res, error.status, { error: { code: `HTTP_${error.status}`, message: error.message, requestId } });
      else {
        console.error('Request failed:', requestId, error instanceof Error ? error.name : 'UnknownError');
        reply(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred', requestId } });
      }
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  return server;
}
