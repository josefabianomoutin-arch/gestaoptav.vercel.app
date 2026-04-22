const CACHE_NAME = 'taiuvagesti-v1';
const assets = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  'https://cdn-icons-png.flaticon.com/512/2897/2897785.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
