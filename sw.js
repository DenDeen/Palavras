// Offline support: network-first (so updates pushed to GitHub show up right away),
// falling back to the cache when offline. The app shell is pre-cached on install.
const CACHE = 'pt-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'vendor/bootstrap-5.3.3.min.css',
  'data/data.js', 'js/util.js', 'js/practice.js', 'js/flashcards.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request)
    .then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
