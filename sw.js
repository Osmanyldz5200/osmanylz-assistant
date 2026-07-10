// OsmanYLDZ İş Asistanı — Service Worker
const CACHE_NAME = 'osmanyilmaz-asistan-v13';
const CACHED_URLS = [
  '/styles.css?v=8',
  '/app.js?v=9',
  '/manifest.json'
  // index.html kasıtlı olarak burada YOK — her zaman ağdan gelir
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHED_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Dış CDN ve Firebase — her zaman ağdan
  if (url.includes('firebase') ||
      url.includes('googleapis') ||
      url.includes('gstatic') ||
      url.includes('jsdelivr') ||
      url.includes('unpkg')) {
    return;
  }

  // HTML istekleri — her zaman ağdan, hata olursa cache'den
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // CSS / JS — önce cache, yoksa ağdan
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
