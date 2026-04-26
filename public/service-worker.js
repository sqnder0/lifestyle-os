// Service Worker for Lifestyle OS
// This service worker provides the foundation for PWA functionality.
// Currently does not cache for offline (can be added in future).

const CACHE_VERSION = 'v1';
const CACHE_NAME = `lifestyle-os-${CACHE_VERSION}`;

// Install event: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event: network-first strategy (hits network first, caches as fallback)
// This allows the app to work online while supporting future offline capabilities
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-first strategy for API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // For static assets: cache-first strategy (use cache, fall back to network)
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request)
        .then((networkResponse) => {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return networkResponse;
        });
    })
  );
});

// Message handler for cache control commands
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
