const CACHE_NAME = 'spell-hearts-shell-v1';
const OFFLINE_SHELL = '/spell-hearts.html';
const APP_SHELL = [OFFLINE_SHELL, '/manifest.webmanifest', '/assets/spell-hearts-token.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('spell-hearts-shell-') && key !== CACHE_NAME)
    .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(OFFLINE_SHELL, copy));
      return response;
    }).catch(() => caches.match(OFFLINE_SHELL))
  );
});
