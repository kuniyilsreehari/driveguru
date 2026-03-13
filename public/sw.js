// Simple service worker to satisfy PWA requirements
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through fetch handler
  event.respondWith(fetch(event.request));
});
