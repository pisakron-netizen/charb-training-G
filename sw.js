// Offline support: always try the network first so updates show immediately,
// and fall back to the last cached copy when the workshop has no signal.
const CACHE = 'charb-training-v1';
const CORE = ['./', 'index.html', 'print.html', 'video-player.css', 'chairatchakarn-group-logo.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => hit ||
          // Versioned URLs (?v=) may differ from the cached copy; any version beats nothing offline.
          caches.match(req, { ignoreSearch: true }).then(any => any ||
            (req.mode === 'navigate' ? caches.match('index.html', { ignoreSearch: true }) : Response.error())))
      )
  );
});
