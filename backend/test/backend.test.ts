import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { Store } from '../src/store.ts';
import { careerNames, careers } from '../src/careers.ts';
import { createApp } from '../src/app.ts';
import { createRoadmap, DevelopmentGenerator, processNext } from '../src/generator.ts';
import { validatePacket, LearnerInput, PacketSchema } from '../src/schema.ts';
import type { Source } from '../src/schema.ts';
const learnerInput = { targetCareer: 'Flutter Mobile Developer' as const, region: 'Lagos, Nigeria', experience: 'beginner' as const, minutesPerDay: 15 };
function fixture(store: Store) {
  const learner = { ...learnerInput, id: '06a27b50-82ca-4c33-85f5-fc08a55b391c' };
  const roadmap = createRoadmap(learner.id, learner);
  const source: Source = { id: '337457eb-aa98-4b87-865c-6d7d26dfaa77', title: 'Dart basics', kind: 'text', text: 'Dart variables hold values. Functions organize reusable logic. Collections group related values so a program can process them.', language: 'en', createdAt: new Date().toISOString() };
  store.put('learner', learner); store.put('roadmap', roadmap); store.put('source', source);
  return { learner, roadmap, source, input: { roadmapId: roadmap.id, nodeId: 'dart', sourceId: source.id } };
}
async function serverFixture(token?: string) {
  const store = new Store(':memory:');
  const app = createApp(store, { token });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const url = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
  const request = (path: string, body?: unknown, headers: Record<string, string> = {}) => fetch(url + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const close = async () => { app.closeAllConnections(); await new Promise<void>(resolve => app.close(() => resolve())); store.close(); };
  return { store, app, url, request, close };
}
test('API completes learner → roadmap → source → queued packet → exact download', async () => {
  const api = await serverFixture();
  try {
    const learnerResponse = await api.request('/v1/learners', learnerInput); assert.equal(learnerResponse.status, 201);
    const learner = await learnerResponse.json() as { id: string };
    const roadmapResponse = await api.request(`/v1/learners/${learner.id}/roadmaps`, {}); assert.equal(roadmapResponse.status, 201);
    const roadmap = await roadmapResponse.json() as { id: string; nodes: { id: string }[] };
    assert.equal(roadmap.nodes.length, 6);
    const sourceResponse = await api.request('/v1/sources', { title: 'Lesson', kind: 'transcript', text: 'Dart variables hold values. Functions organize reusable logic. Collections group related values for processing.' });
    assert.equal(sourceResponse.status, 201);
    const source = await sourceResponse.json() as { id: string; text?: string }; assert.equal(source.text, undefined);
    const jobResponse = await api.request('/v1/packet-jobs', { roadmapId: roadmap.id, nodeId: 'dart', sourceId: source.id });
    assert.equal(jobResponse.status, 202);
    const job = await jobResponse.json() as { id: string; status: string }; assert.equal(job.status, 'queued');
    assert.equal(jobResponse.headers.get('location'), `/v1/jobs/${job.id}`);
    assert.equal(await processNext(api.store, new DevelopmentGenerator()), true);
    const done = await (await api.request(`/v1/jobs/${job.id}`)).json() as { status: string; packetId: string };
    assert.equal(done.status, 'succeeded');
    const response = await api.request(`/v1/packets/${done.packetId}/download`);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(Number(response.headers.get('content-length')), Buffer.byteLength(text));
    assert.ok(Buffer.byteLength(text) < 100_000);
    assert.ok(response.headers.get('content-disposition')?.includes('.json'));
    const packet = PacketSchema.parse(JSON.parse(text));
    assert.equal(packet.sources[0].sourceId, source.id); assert.equal(packet.reviewStatus, 'unreviewed');
    const listing = await (await api.request(`/v1/roadmaps/${roadmap.id}/packets`)).json() as { items: { id: string }[] };
    assert.equal(listing.items[0].id, packet.id);
  } finally { await api.close(); }
});
test('invalid input, unknown IDs, missing nodes, and unsafe source URLs are rejected', async () => {
  const api = await serverFixture();
  try {
    assert.equal((await api.request('/v1/learners', { ...learnerInput, minutesPerDay: 0 })).status, 422);
    assert.equal((await api.request('/v1/learners', { ...learnerInput, admin: true })).status, 422);
    assert.equal((await api.request('/v1/jobs/missing')).status, 404);
    const { input } = fixture(api.store);
    assert.equal((await api.request('/v1/packet-jobs', { ...input, nodeId: 'missing' })).status, 422);
    assert.equal((await api.request('/v1/packet-jobs', { ...input, sourceId: '65600fd7-8980-463e-8f79-97cce96cbf58' })).status, 404);
    assert.equal((await api.request('/v1/sources', { title: 'Unsafe', kind: 'text', text: 'An educational source containing at least forty characters.', url: 'file:///etc/passwd' })).status, 422);
  } finally { await api.close(); }
});
test('bearer authentication protects resources; health remains readable', async () => {
  const api = await serverFixture('test-secret');
  try {
    assert.equal((await api.request('/health')).status, 200);
    assert.equal((await api.request('/v1/learners', learnerInput)).status, 401);
    assert.equal((await api.request('/v1/learners', learnerInput, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await api.request('/v1/learners', learnerInput, { Authorization: 'Bearer test-secret' })).status, 201);
  } finally { await api.close(); }
});
test('malformed JSON and unsupported media types return client errors', async () => {
  const api = await serverFixture();
  try {
    const malformed = await fetch(api.url + '/v1/learners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    const plain = await fetch(api.url + '/v1/learners', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hello' });
    assert.equal(plain.status, 415);
  } finally { await api.close(); }
});
test('oversized request bodies are rejected', async () => {
  const api = await serverFixture();
  try {
    assert.equal((await api.request('/v1/sources', { title: 'Huge', kind: 'text', text: 'a'.repeat(850_001) })).status, 413);
  } finally { await api.close(); }
});
test('packet validation counts UTF-8 bytes and rejects out-of-range quiz answers', async () => {
  const store = new Store(':memory:');
  try {
    const { source, roadmap } = fixture(store);
    const packet = await new DevelopmentGenerator().generate(source, roadmap, roadmap.nodes[0]);
    assert.throws(() => validatePacket({ ...packet, quiz: [{ ...packet.quiz[0], correctIndex: 999 }] }));
    assert.throws(() => validatePacket({ ...packet, summary: '界'.repeat(19_000), narrationScript: '界'.repeat(19_000) }), /below 100000 bytes/);
  } finally { store.close(); }
});
test('a generator failure marks the job failed without publishing a packet', async () => {
  const store = new Store(':memory:');
  try {
    const { input } = fixture(store); const job = store.enqueue(input);
    await processNext(store, { async generate() { throw new Error('Sensitive provider message'); } });
    assert.equal(store.job(job.id)?.status, 'failed');
    assert.ok(!store.job(job.id)?.error?.includes('Sensitive'));
    assert.equal(store.list('packet').length, 0);
  } finally { store.close(); }
});
test('mismatched generated references cannot be published', async () => {
  const store = new Store(':memory:');
  try {
    const { input } = fixture(store); const job = store.enqueue(input);
    await processNext(store, { async generate(source, roadmap, node) { return { ...await new DevelopmentGenerator().generate(source, roadmap, node), nodeId: 'wrong' }; } });
    assert.equal(store.job(job.id)?.status, 'failed'); assert.equal(store.list('packet').length, 0);
  } finally { store.close(); }
});
test('claimed jobs recover after restart and completed packets persist', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'skillpacket-'));
  const path = join(dir, 'test.sqlite');
  let store = new Store(path);
  try {
    const { input } = fixture(store); const job = store.enqueue(input);
    assert.equal(store.claim()?.status, 'running'); store.close();
    store = new Store(path); assert.equal(store.job(job.id)?.status, 'queued');
    await processNext(store, new DevelopmentGenerator());
    const packetId = store.job(job.id)?.packetId; store.close();
    store = new Store(path); assert.equal(store.job(job.id)?.status, 'succeeded'); assert.ok(store.get('packet', packetId!));
    assert.equal(await processNext(store, new DevelopmentGenerator()), false);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
test('unsupported career names are rejected', () => {
  assert.throws(() => LearnerInput.parse({ ...learnerInput, targetCareer: 'An unsupported career' }));
});

test('every supported career has a distinct valid pathway and completes packet generation', async () => {
  const api = await serverFixture();
  try {
    const catalogResponse = await api.request('/v1/careers');
    assert.equal(catalogResponse.status, 200);
    const catalog = await catalogResponse.json() as { items: { title: string; milestoneCount: number }[] };
    assert.deepEqual(catalog.items.map(item => item.title), [...careerNames]);
    for (const targetCareer of careerNames) {
      const learner = await (await api.request('/v1/learners', { ...learnerInput, targetCareer })).json() as { id: string };
      const response = await api.request(`/v1/learners/${learner.id}/roadmaps`, {});
      assert.equal(response.status, 201);
      const roadmap = await response.json() as { id: string; targetCareer: string; nodes: { id: string; prerequisites: string[] }[] };
      assert.equal(roadmap.targetCareer, targetCareer);
      assert.equal(roadmap.nodes[0].id, careers[targetCareer].nodes[0].id);
      assert.equal(roadmap.nodes.length, 6);
      const seen = new Set<string>();
      for (const node of roadmap.nodes) {
        assert.ok(!seen.has(node.id));
        assert.ok(node.prerequisites.every(id => seen.has(id)));
        seen.add(node.id);
      }
      const source = await (await api.request('/v1/sources', { title: 'Training notes', kind: 'text', text: 'These source notes introduce learning objectives, written examples, documentation, and an instructor-reviewed practice task.' })).json() as { id: string };
      const job = await (await api.request('/v1/packet-jobs', { roadmapId: roadmap.id, nodeId: roadmap.nodes[0].id, sourceId: source.id })).json() as { id: string };
      await processNext(api.store, new DevelopmentGenerator());
      assert.equal(api.store.job(job.id)?.status, 'succeeded');
      const packet = PacketSchema.parse(await (await api.request(`/v1/packets/${api.store.job(job.id)?.packetId}`)).json());
      assert.equal(packet.title, careers[targetCareer].nodes[0].title);
      assert.equal(packet.careerConnection, careers[targetCareer].nodes[0].careerTask);
    }
  } finally { await api.close(); }
});
test('legacy Flutter roadmaps retain their career after reopening the database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skillpacket-legacy-'));
  const path = join(dir, 'test.sqlite');
  let store = new Store(path);
  try {
    const { roadmap } = fixture(store);
    const { targetCareer, ...legacy } = roadmap;
    store.db.prepare('UPDATE entities SET body=? WHERE kind=? AND id=?').run(JSON.stringify(legacy), 'roadmap', roadmap.id);
    store.close(); store = new Store(path);
    assert.equal(store.get<{ targetCareer: string }>('roadmap', roadmap.id)?.targetCareer, 'Flutter Mobile Developer');
    assert.equal(store.get<{ nodes: unknown[] }>('roadmap', roadmap.id)?.nodes.length, 6);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
