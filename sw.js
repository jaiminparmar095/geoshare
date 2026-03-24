// GeoShare Service Worker v4 (FIXED & STABLE)

const CACHE = 'geoshare-v4'; // 🔥 version updated
const PRECACHE = [
  './',
  './index.html',
  './map.html',
  './manifest.json',
  './icon.svg',
];

// ───── INSTALL ─────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => {}) // ignore failures
  );
  self.skipWaiting();
});

// ───── ACTIVATE ─────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ───── FETCH ─────
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = req.url;

  // ❌ NEVER cache Google Apps Script (live GPS data)
  if (url.includes('script.google.com')) {
    return; // let browser handle directly
  }

  // ✅ NETWORK-FIRST for HTML (always fresh UI)
  if (req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(networkRes => {

          // clone SAFELY (only once)
          const copy = networkRes.clone();

          caches.open(CACHE).then(cache => {
            cache.put(req, copy);
          });

          return networkRes;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ✅ CACHE-FIRST for static assets
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(networkRes => {

          // ⚠️ avoid caching bad/opaque responses
          if (
            !networkRes ||
            networkRes.status !== 200 ||
            networkRes.type === 'opaque'
          ) {
            return networkRes;
          }

          // clone BEFORE using
          const copy = networkRes.clone();

          caches.open(CACHE).then(cache => {
            cache.put(req, copy);
          });

          return networkRes;
        })
        .catch(() => cached);
    })
  );
});
