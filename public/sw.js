// public/sw.js — Brume service worker with offline support

const CACHE_NAME = 'brume-v1';
const STATIC_ASSETS = [
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// ── Install: precache static assets ──────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// ── Activate: clean old caches ───────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// ── Fetch: cache strategy ────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET, chrome-extension, and external requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // Next.js immutable static assets → cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Precached static assets → cache-first
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Navigation requests → network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses for offline fallback
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/map')))
    );
    return;
  }

  // Everything else → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ── Background Sync: flush offline pin queue ─────────────────────────────────

const OFFLINE_DB = 'brume_offline';
const OFFLINE_STORE = 'pending_pins';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(OFFLINE_STORE)) {
        req.result.createObjectStore(OFFLINE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readonly');
    const req = tx.objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function syncPendingPins() {
  const db = await openOfflineDB();
  const pending = await idbGetAll(db);
  if (pending.length === 0) return;

  const SUPABASE_URL = '@@SUPABASE_URL@@'; // Replaced at runtime by env
  let synced = 0;

  for (const pin of pending) {
    try {
      // Upload media blobs first
      const mediaUrls = [];
      for (const media of (pin.media_blobs || [])) {
        const fileName = `${pin.user_id}/${Date.now()}-${media.name}`;
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/pin-photos/${fileName}`, {
          method: 'POST',
          headers: { 'Content-Type': media.type },
          body: media.blob,
        });
        if (uploadRes.ok) {
          mediaUrls.push({
            url: `${SUPABASE_URL}/storage/v1/object/public/pin-photos/${fileName}`,
            type: media.type.startsWith('image') ? 'image' : media.type.startsWith('video') ? 'video' : 'audio',
          });
        }
      }

      // Insert pin via REST
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '@@SUPABASE_ANON_KEY@@',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: pin.user_id,
          lat: pin.lat,
          lng: pin.lng,
          category: pin.category,
          severity: pin.severity,
          environment: pin.environment,
          urban_context: pin.urban_context,
          urban_context_custom: pin.urban_context_custom,
          is_moving: pin.is_moving,
          description: pin.description,
          photo_url: mediaUrls.find((m) => m.type === 'image')?.url ?? null,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        }),
      });

      if (res.ok) {
        await idbDelete(db, pin.id);
        synced++;
      }
    } catch {
      // Network still down — stop and let next sync attempt handle it
      break;
    }
  }

  // Notify all clients
  if (synced > 0) {
    const allClients = await clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ type: 'BRUME_SYNC_COMPLETE', synced });
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'brume-sync-pins') {
    event.waitUntil(syncPendingPins());
  }
});

// ── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🆘 Brume Alert', {
      body: data.body || 'Emergency alert in your area',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'brume-emergency',
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
