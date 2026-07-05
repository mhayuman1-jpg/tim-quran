// Service Worker for Tim Qur'an PWA
const CACHE_NAME = 'tim-quran-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/profil',
  '/program',
  '/pengumuman',
  '/artikel',
  '/agenda',
];

const CACHE_STRATEGIES = {
  // Network first for API calls
  networkFirst: ['/api/'],
  // Cache first for static assets
  cacheFirst: ['/_next/static/', '/images/', '/fonts/', '/favicon.png'],
  // Stale while revalidate for pages
  staleWhileRevalidate: ['/dashboard', '/profil', '/program'],
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== location.origin) return;

  // Determine strategy
  let strategy = 'networkFirst';
  if (CACHE_STRATEGIES.cacheFirst.some((path) => url.pathname.startsWith(path))) {
    strategy = 'cacheFirst';
  } else if (CACHE_STRATEGIES.staleWhileRevalidate.some((path) => url.pathname.startsWith(path))) {
    strategy = 'staleWhileRevalidate';
  } else if (CACHE_STRATEGIES.networkFirst.some((path) => url.pathname.startsWith(path))) {
    strategy = 'networkFirst';
  }

  event.respondWith(handleRequest(request, strategy));
});

async function handleRequest(request, strategy) {
  const cache = await caches.open(CACHE_NAME);

  switch (strategy) {
    case 'cacheFirst': {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return new Response('Offline', { status: 503 });
      }
    }

    case 'networkFirst': {
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response('Offline', { status: 503 });
      }
    }

    case 'staleWhileRevalidate': {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      return cached || fetchPromise;
    }

    default:
      return fetch(request);
  }
}

// Handle push notifications (if needed in future)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'close', title: 'Tutup' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});
