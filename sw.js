// Service Worker — Le Grimoire Marin de Cécile Keraudren
const CACHE_NAME = 'grimoire-v1';

// Fichiers à mettre en cache pour fonctionner hors-ligne
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// Installation : mise en cache des assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Si certains assets échouent, on continue quand même
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour les assets locaux, network-first pour les polices Google
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Polices Google — réseau d'abord, cache en fallback
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets locaux — cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources locales
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Hors-ligne et pas en cache : retourner la page principale
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
