// ═══════════════════════════════════════════════════════════
//  sw.js — Service Worker
//  Body Tracker PWA · Fase 1
//  Estrategia: cache-first para assets estáticos.
//  Las operaciones de datos van directo a IndexedDB, sin cache aquí.
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'body-tracker-v4';

// Assets que se cachean en la instalación del SW.
// Las CDNs externas se cachean en el primer acceso (runtime caching).
const ASSETS_ESTATICOS = [
  '/',
  '/index.html',
  '/app.js',
  '/db.js',
  '/manifest.json',
];

// ─────────────────────────────────────────────────────────
//  INSTALL — Pre-cachear assets del app shell
// ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_ESTATICOS);
    })
  );
  // Activar inmediatamente sin esperar a que cierren las pestañas anteriores
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────
//  ACTIVATE — Limpiar caches viejos
// ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Tomar control de todas las pestañas abiertas inmediatamente
  self.clients.claim();
});

// ─────────────────────────────────────────────────────────
//  FETCH — Cache-first para todos los requests
// ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Solo interceptar requests GET
  if (event.request.method !== 'GET') return;

  // No interceptar requests a chrome-extension ni otros esquemas
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Cache hit: devolver desde cache y actualizar en background (stale-while-revalidate)
        const fetchUpdate = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Sin conexión: OK, ya devolvimos el cached
        });

        return cachedResponse;
      }

      // Cache miss: ir a la red y guardar para la próxima vez
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      }).catch(() => {
        // Sin conexión y sin cache: para CDN assets esto puede fallar en primer uso offline
        // En uso normal (app ya cargada al menos una vez) esto no debería ocurrir
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// ─────────────────────────────────────────────────────────
//  PUSH NOTIFICATIONS (preparado para Fase 3)
// ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Body Tracker', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: data.tag || 'body-tracker',
      renotify: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
