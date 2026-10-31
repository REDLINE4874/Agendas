const CACHE_NAME = 'agenda-pwa-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/styles/main.css?v=13',
  './src/styles/site-auth.css?v=2',
  './src/js/supabase-config.js?v=2',
  './src/js/site-auth.js?v=7',
  './src/js/modules/core.js?v=9',
  './src/js/modules/custom-selects.js?v=8',
  './src/js/modules/date-picker.js?v=1',
  './src/js/modules/ui.js?v=7',
  './src/js/modules/navigation.js?v=9',
  './src/js/modules/api.js?v=9',
  './src/js/modules/sharing.js?v=3',
  './src/js/modules/filters.js?v=7',
  './src/js/modules/views.js?v=8',
  './src/js/modules/actions.js?v=8',
  './src/js/app.js?v=8',
  './src/components/theme-toggle.js?v=7',
  './src/components/theme-background-picker.js?v=7',
  './src/js/pwa.js',
  './assets/icons/talent.svg',
  './assets/icons/agenda-light.svg',
  './assets/icons/agenda-dark.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png'
];

// Instalar el Service Worker y almacenar en caché los recursos estáticos iniciales
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Advertencia al precachear recursos:', err);
      });
    })
  );
});

// Activar y limpiar cachés anteriores si existen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Manejo de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar métodos no GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Omitir peticiones de base de datos en tiempo real (Supabase)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Estrategia Network-First para navegación HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html') || caches.match(event.request))
    );
    return;
  }

  // Estrategia Stale-While-Revalidate para recursos estáticos y fuentes
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin ||
             url.hostname.includes('googleapis.com') ||
             url.hostname.includes('gstatic.com') ||
             url.hostname.includes('jsdelivr.net'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
