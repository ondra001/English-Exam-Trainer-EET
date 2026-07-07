/* CAE Ace — service worker.
 *
 * Caching strategy:
 *   - App shell precached on install (each file added individually so one
 *     missing asset can't brick the whole install).
 *   - Navigations: network-first, falling back to the cached page, then
 *     the cached index.html (SPA shell).
 *   - Same-origin static assets: cache-first with background fill.
 *   - Chart.js CDN: stale-while-revalidate so the dashboard chart works
 *     offline after the first visit.
 *   - AI/API traffic (api.anthropic.com or any /api/ path) is NEVER
 *     intercepted or cached — it passes straight to the network.
 */
'use strict';

const CACHE_NAME = 'cambridge-trainer-v1';

const CHART_CDN_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';

const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/config.js',
  './js/levels.js',
  './js/util.js',
  './js/icons.js',
  './js/storage.js',
  './js/prompts.js',
  './js/mock.js',
  './js/api.js',
  './js/marking.js',
  './js/timer.js',
  './js/ui.js',
  './js/parts/uoe.js',
  './js/parts/reading.js',
  './js/parts/listening.js',
  './js/parts/writing.js',
  './js/parts/speaking.js',
  './js/mocktest.js',
  './js/vocab.js',
  './js/dashboard.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        // Individual adds via allSettled: a single 404 (e.g. an icon that
        // hasn't been generated yet) must not fail the whole install.
        Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => (key.startsWith('cae-ace-') || key.startsWith('cambridge-trainer-')) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Requests that must never be intercepted or cached (AI/API traffic). */
function isApiRequest(url) {
  if (url.hostname === 'api.anthropic.com') return true;
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return true;
  return false;
}

/** Network-first for page navigations; offline fallback to cached shell. */
function handleNavigation(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || caches.match('./index.html'))
    );
}

/** Cache-first for same-origin static assets. */
function handleStatic(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    });
  });
}

/** Stale-while-revalidate for the Chart.js CDN bundle. */
function handleChartCdn(request) {
  return caches.match(request).then((cached) => {
    const refresh = fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => cached);
    return cached || refresh;
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Hard rule: AI/API calls pass through untouched — no interception, no cache.
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (request.url === CHART_CDN_URL) {
    event.respondWith(handleChartCdn(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(handleStatic(request));
  }
  // Other cross-origin requests fall through to the browser default.
});
