/* ═══════════════════════════════════════════════════
   ACT-III — Service Worker
   Cache statique + stratégie Network First
   ═══════════════════════════════════════════════════ */

const CACHE_NAME   = 'act3-v1';
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'
];

/* ── Installation : mise en cache des fichiers statiques ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES).catch((err) => {
        console.warn('[SW] Certains fichiers non mis en cache:', err);
      });
    })
  );
  self.skipWaiting();
});

/* ── Activation : nettoyage des anciens caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

/* ── Fetch : Network First, Cache Fallback ── */
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes Supabase (toujours en ligne)
  if (event.request.url.includes('supabase.co')) return;

  // Ne pas intercepter les requêtes non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse fraîche
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // En cas d'échec réseau → servir depuis le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback vers index.html pour les navigations
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
