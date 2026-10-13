import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localStore } from '../src/storage.ts';
import { starterPacket, starterSession } from '../src/data.ts';
import { canCheckQuiz, parsePacket, quizScore, safeSourceUrl, RoadmapSchema } from '../src/model.ts';

test('packets, sessions, pending jobs and quiz progress persist in IndexedDB', async () => {
  await localStore.savePacket(starterPacket);
  assert.equal((await localStore.packets())[0].id, starterPacket.id);
  await localStore.setSetting('session', starterSession);
  assert.deepEqual(await localStore.setting('session'), starterSession);
  const jobs = [{ id: 'job-1', roadmapId: starterSession.roadmap.id, nodeId: 'dart' }];
  await localStore.setSetting('pending-jobs', jobs);
  assert.deepEqual(await localStore.setting('pending-jobs'), jobs);
  const progress = { packetId: starterPacket.id, answers: { variables: 1, functions: 0 }, checked: true };
  await localStore.saveProgress(progress);
  assert.deepEqual(await localStore.progress(starterPacket.id), progress);
  await localStore.removePacket(starterPacket.id);
  assert.equal((await localStore.packets()).length, 0);
  assert.equal(await localStore.progress(starterPacket.id), undefined);
});
test('imports reject oversized UTF-8 packets, invalid quiz indices, and malformed packets', () => {
  assert.throws(() => parsePacket({ ...starterPacket, summary: '界'.repeat(19_000), narrationScript: '界'.repeat(19_000) }), /100KB/);
  assert.throws(() => parsePacket({ ...starterPacket, quiz: [{ ...starterPacket.quiz[0], correctIndex: 20 }] }));
  assert.throws(() => parsePacket({ title: 'An invalid packet' }));
});
test('quiz checks require all answers and scoring handles zero correctly', () => {
  assert.equal(canCheckQuiz(starterPacket, { variables: 1 }), false);
  assert.equal(canCheckQuiz(starterPacket, { variables: 1, functions: 0 }), true);
  assert.equal(canCheckQuiz(starterPacket, { variables: 1, functions: -1 }), false);
  assert.equal(quizScore(starterPacket, { variables: 1, functions: 0 }), 2);
  assert.equal(quizScore(starterPacket, { variables: 0, functions: 2 }), 0);
});
test('unsafe source links remain text-only', () => {
  assert.equal(safeSourceUrl('javascript:alert(1)'), undefined);
  assert.equal(safeSourceUrl('file:///etc/passwd'), undefined);
  assert.equal(safeSourceUrl('https://example.org/lesson'), 'https://example.org/lesson');
});

test('cached pre-catalog roadmaps recover Flutter identity and new careers keep their identity', () => {
  const { targetCareer, ...legacy } = starterSession.roadmap;
  assert.equal(RoadmapSchema.parse(legacy).targetCareer, 'Flutter Mobile Developer');
  for (const targetCareer of ['Solar Inverter Technician', 'Frontend Web Developer', 'Data Analyst']) {
    assert.equal(RoadmapSchema.parse({ ...starterSession.roadmap, targetCareer }).targetCareer, targetCareer);
  }
});
