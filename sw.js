/* Форма — офлайн-кэш */
const V = 'forma-v4';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache:'reload'})).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* фото упражнений: кэш -> сеть */
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith((async () => {
      const cache = await caches.open(V);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req, {mode:'no-cors'});
        if (res) await cache.put(req, res.clone());
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    })());
    return;
  }

  if (url.origin !== location.origin) return;

  /* страница и файлы: сеть -> кэш */
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(V);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const cache = await caches.open(V);
      return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error();
    }
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});
