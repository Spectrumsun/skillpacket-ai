import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
function fixture() {
  const events: Record<string, (event: Record<string, unknown>) => void> = {};
  const shell = new Response('<html>cached app</html>');
  const cached = new Map<string, Response>([['/index.html', shell], ['/assets/app.js', new Response('cached script')]]);
  let networkCalls = 0;
  let precached: string[] = [];
  const deleted: string[] = [];
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    URL,
    self: { location: { origin: 'https://skillpacket.test' }, clients: { claim: async () => {} }, addEventListener: (name: string, handler: (event: Record<string, unknown>) => void) => { events[name] = handler; } },
    caches: { open: async () => ({ match: async (key: string | { url: string }) => cached.get(typeof key === 'string' ? key : new URL(key.url).pathname), addAll: async (urls: string[]) => { precached = urls; } }), keys: async () => ['skillpacket-shell-old', 'unrelated-cache'], delete: async (key: string) => { deleted.push(key); } },
    fetch: async (request: string) => { networkCalls++; if (request === '/precache.json') return new Response(JSON.stringify(['/', '/index.html', '/assets/app.js'])); throw new Error('Network offline'); },
  });
  async function lifecycle(name: string) { let promise: Promise<unknown> = Promise.resolve(); events[name]({ waitUntil: (value: Promise<unknown>) => { promise = value; } }); await promise; }
  async function request(path: string, mode: string = 'cors', method = 'GET') {
    let response: Promise<Response> | undefined;
    events.fetch({ request: { url: `https://skillpacket.test${path}`, mode, method }, respondWith: (value: Promise<Response>) => { response = value; } });
    return response;
  }
  return { lifecycle, request, networkCalls: () => networkCalls, precached: () => precached, deleted };
}
test('the app shell and its assets reopen without the network', async () => {
  const sw = fixture();
  assert.equal(await (await sw.request('/', 'navigate'))?.text(), '<html>cached app</html>');
  assert.equal(await (await sw.request('/assets/app.js'))?.text(), 'cached script');
  assert.equal(sw.networkCalls(), 0);
});
test('API requests and mutations bypass shell caching', async () => {
  const sw = fixture();
  assert.equal(await sw.request('/api/health'), undefined);
  assert.equal(await sw.request('/api/v1/learners', 'cors', 'POST'), undefined);
  assert.equal(sw.networkCalls(), 0);
});
test('installation precaches generated assets and activation removes only old app caches', async () => {
  const sw = fixture();
  await sw.lifecycle('install');
  assert.deepEqual(Array.from(sw.precached()), ['/', '/index.html', '/assets/app.js']);
  await sw.lifecycle('activate');
  assert.deepEqual(sw.deleted, ['skillpacket-shell-old']);
});
