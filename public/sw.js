const CACHE_NAME = 'share-your-music-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/offline.html', '/assets/style.css', '/assets/app.js', '/manifest.json', '/icon.svg', '/assets/world.svg'];

const API_PREFIXES = ['/auth/', '/tracks', '/feedback', '/profile', '/community', '/admin'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API-anrop cachas aldrig — alltid färskt från nätet, annars ett tydligt fel.
  if (API_PREFIXES.some(p => url.pathname.startsWith(p))) {
    return;
  }

  // Sidnavigering: nätet först, offline-sidan som fallback.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Statiska tillgångar: cache först, nätet som fallback.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
