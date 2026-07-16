// Service Worker — LG HVAC Especificaciones
// Cachea el HTML principal para uso offline. El chat (API) requiere internet.

const CACHE_NAME = 'lg-hvac-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación: pre-cachear los archivos principales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first para la API de Claude, cache-first para el resto
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Siempre ir a la red para la API de Anthropic (chat)
  if (url.hostname === 'api.anthropic.com') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Solo cachear respuestas OK de nuestro propio dominio
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // Si falla la red, devolver cache si existe
    })
  );
});
