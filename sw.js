const CACHE = 'mc-pro-v5';
const URLS = [
  './mc-pro.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap'
];

// Installation — mise en cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Mettre en cache ce qu'on peut (les fonts peuvent échouer offline)
      return Promise.allSettled(URLS.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// Activation — nettoyer anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first, puis réseau
self.addEventListener('fetch', e => {
  // Ne pas intercepter les requêtes non-GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Mettre en cache les nouvelles ressources valides
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — retourner mc-pro.html pour toute navigation
        if (e.request.mode === 'navigate') {
          return caches.match('./mc-pro.html');
        }
      });
    })
  );
});

// Notifications push — alarmes veille
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Créative Planner', {
      body: data.body || 'Rappel événement',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [300, 200, 300, 200, 300],
      requireInteraction: true,
      tag: data.tag || 'mc-rappel',
      data: { url: './mc-pro.html' }
    })
  );
});

// Clic sur notification — ouvrir l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('mc-pro') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('./mc-pro.html');
    })
  );
});
