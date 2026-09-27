/**
 * ==============================================================================
 * VKU FIELD SURVEY PWA - SERVICE WORKER (sw.js)
 * Course: Cross-Platform Mobile App Development - Week 3
 * Faculty of Computer Science - VKU (Vietnam - Korea University of ICT)
 * Instructor: Nguyen Thanh Tuan, PhD
 * ==============================================================================
 * 
 * Implements:
 * 1. Full Service Worker Lifecycle: Install -> Activate -> Fetch
 * 2. The 5 Core Caching Strategies:
 *    - Cache-First (App Shell: HTML, CSS, JS, Icons)
 *    - Network-First (Dynamic API requests & Sync status)
 *    - Stale-While-Revalidate (Campus Guidelines & Announcements)
 *    - Cache-Only (Dedicated offline fallback page)
 *    - Network-Only (Real-time telemetry & Ping)
 * 3. Background Sync API for offline survey submission queue
 * ==============================================================================
 */

const CACHE_VERSION = 'vku-survey-v1.0.1';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `dynamic-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `data-${CACHE_VERSION}`;

// ------------------------------------------------------------------------------
// 1. APP SHELL ASSETS TO PRE-CACHE DURING INSTALLATION
// ------------------------------------------------------------------------------
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/sw-register.js',
  './data/guidelines.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/vku-logo.png'
];

// ------------------------------------------------------------------------------
// 2. LIFECYCLE: INSTALL EVENT
// Pre-caches the App Shell assets and immediately activates with skipWaiting()
// ------------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing... Cache version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching App Shell assets');
      return cache.addAll(APP_SHELL);
    }).then(() => {
      console.log('[SW] App Shell pre-cached successfully. Skipping waiting.');
      return self.skipWaiting();
    }).catch((err) => {
      console.error('[SW] Pre-cache failed:', err);
    })
  );
});

// ------------------------------------------------------------------------------
// 3. LIFECYCLE: ACTIVATE EVENT
// Cleans up old deprecated cache versions & claims clients immediately
// ------------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  const expectedCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, DATA_CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.includes(cacheName)) {
            console.log('[SW] Removing deprecated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients for instant control.');
      return self.clients.claim();
    })
  );
});

// ------------------------------------------------------------------------------
// 4. LIFECYCLE: FETCH EVENT & 5 CACHING STRATEGIES
// ------------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin or unsupported schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // STRATEGY 5: Network-Only
  // For telemetry, auth endpoints, or real-time ping
  if (url.pathname.includes('/api/ping') || url.pathname.includes('/api/auth')) {
    event.respondWith(networkOnlyStrategy(event.request));
    return;
  }

  // STRATEGY 2: Network-First
  // For dynamic API data (live survey sync, submissions)
  if (url.pathname.includes('/api/surveys') || url.pathname.includes('/api/sync')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // STRATEGY 3: Stale-While-Revalidate
  // For campus guidelines and facility policy data
  if (url.pathname.includes('/data/guidelines.json')) {
    event.respondWith(staleWhileRevalidateStrategy(event.request, DATA_CACHE_NAME));
    return;
  }

  // STRATEGY 4: Cache-Only
  // Dedicated offline asset or explicitly requested offline fallback
  if (url.pathname.includes('offline.html')) {
    event.respondWith(cacheOnlyStrategy(event.request, STATIC_CACHE_NAME));
    return;
  }

  // STRATEGY 1: Cache-First (Default for App Shell: HTML, CSS, JS, Icons)
  event.respondWith(cacheFirstStrategy(event.request));
});

// ------------------------------------------------------------------------------
// STRATEGY IMPLEMENTATIONS
// ------------------------------------------------------------------------------

/**
 * 1. Cache-First (App Shell):
 * Check Cache first; if found, return immediately; else fetch from network.
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // If navigation request fails and nothing in cache, return offline.html
    if (request.mode === 'navigate') {
      const offlineFallback = await caches.match('./offline.html');
      if (offlineFallback) return offlineFallback;
    }
    throw error;
  }
}

/**
 * 2. Network-First (Live Data):
 * Attempt fresh network request; fallback to Cache when offline.
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW:Network-First] Offline detected. Falling back to dynamic cache.');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return structured offline fallback JSON for API calls
    return new Response(
      JSON.stringify({
        status: 'offline',
        message: 'Không có kết nối mạng. Yêu cầu đã được lưu trữ cục bộ trong IndexedDB.',
        offlineQueue: true,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
}

/**
 * 3. Stale-While-Revalidate (Campus Guidelines / Noticeboard):
 * Return cached response instantly while fetching update in background.
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Background network update promise
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((err) => {
    console.warn('[SW:SWR] Background revalidation failed (offline):', err.message);
  });

  // Return cached version immediately if available, or wait for network
  return cachedResponse || fetchPromise;
}

/**
 * 4. Cache-Only:
 * Restrict to pre-cached offline assets.
 */
async function cacheOnlyStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  return new Response('Asset not found in offline cache.', {
    status: 404,
    statusText: 'Not Found'
  });
}

/**
 * 5. Network-Only:
 * Direct pass-through for non-cacheable transactional requests (e.g. Auth tokens, ping).
 */
async function networkOnlyStrategy(request) {
  return fetch(request);
}

// ------------------------------------------------------------------------------
// 5. BACKGROUND SYNC API
// Triggered by the browser when connectivity is restored
// ------------------------------------------------------------------------------
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync event triggered! Tag:', event.tag);
  if (event.tag === 'sync-surveys') {
    event.waitUntil(syncPendingSurveysToBackend());
  }
});

/**
 * Background Sync worker logic
 */
async function syncPendingSurveysToBackend() {
  console.log('[SW] Executing background sync for pending surveys...');
  // Notify all open client windows to perform sync and update UI
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: 'BACKGROUND_SYNC_TRIGGERED',
      tag: 'sync-surveys',
      timestamp: Date.now()
    });
  }

  // Show a notification if permission granted
  if (self.registration.showNotification) {
    try {
      await self.registration.showNotification('VKU Field Survey', {
        body: 'Đã khôi phục kết nối mạng! Dữ liệu khảo sát cơ sở vật chất đang được đồng bộ tự động.',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [100, 50, 100]
      });
    } catch (e) {
      // Notifications might not be permitted; ignore gracefully
    }
  }
}

// ------------------------------------------------------------------------------
// 6. CLIENT MESSAGING
// ------------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
