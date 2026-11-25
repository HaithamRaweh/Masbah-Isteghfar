// Service Worker v3: يعمل التطبيق بدون إنترنت بعد أول فتح ناجح.
const CACHE = 'istighfar-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req, cache) {
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: true })) ||
           (await cache.match('./index.html')) ||
           new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(req, cache) {
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  event.respondWith(
    caches.open(CACHE).then((cache) => {
      // الصفحة الرئيسية: أحدث نسخة عند توفر الإنترنت، وإلا من الكاش
      if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
        return networkFirst(req, cache);
      }
      // الخطوط الخارجية وملفات الموقع: من الكاش أولاً (أسرع، ويعمل بدون إنترنت)
      if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
        return cacheFirst(req, cache);
      }
      return fetch(req);
    })
  );
});
