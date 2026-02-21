// public/sw.js — SafePin service worker

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🆘 SafePin Alert', {
      body: data.body || 'Emergency alert in your area',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'safepin-emergency',
      renotify: true,
      data: { url: data.url || '/map' },
      vibrate: [200, 100, 200, 100, 400],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/map') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('/map');
    })
  );
});
