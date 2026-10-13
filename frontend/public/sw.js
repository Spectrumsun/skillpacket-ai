const CACHE = 'skillpacket-shell-__SHELL_VERSION__';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('App shell manifest unavailable');
    const urls = await response.json();
    const cache = await caches.open(CACHE);
    await cache.addAll(urls);
    // Activate naturally after existing tabs close; avoids mixing app versions.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('skillpacket-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      // A versioned app shell is served locally; a new build installs a new cache.
      const shell = await cache.match('/index.html') || await cache.match('/');
      if (shell) return shell;
      return fetch(event.request);
    }
    return await cache.match(event.request) || fetch(event.request);
  })());
});
