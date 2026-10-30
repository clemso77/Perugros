/* Service worker Perugros : installation de l'app, cache hors-ligne des ressources lourdes
   (modèles 3D, textures) et notifications « c'est votre tour ». */
const CACHE = 'perugros-v1';
const PRECACHE = ['/', '/logo.png', '/model/dice/dice.glb', '/model/fond/fond.glb', '/texture/hdr/lilienstein_1k.exr'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;
    // Temps réel et API : jamais de cache
    if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/push') || url.pathname === '/health') return;

    // Page : réseau d'abord (pour recevoir les mises à jour), cache si hors-ligne
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put('/', copy));
                    return response;
                })
                .catch(() => caches.match('/'))
        );
        return;
    }

    // Ressources statiques (build hashé, modèles, textures, icônes) : cache d'abord
    if (/^\/(static|model|texture)\//.test(url.pathname) || /\.(png|webp|json)$/.test(url.pathname)) {
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request).then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put(request, copy));
                }
                return response;
            }))
        );
    }
});

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data && event.data.text() };
    }
    event.waitUntil(
        self.registration.showNotification(data.title || 'Perugros', {
            body: data.body || '',
            tag: data.tag || 'perugros',
            renotify: true,
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [120, 60, 120],
            data: { url: '/' }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            const client = clients.find(c => 'focus' in c);
            return client ? client.focus() : self.clients.openWindow('/');
        })
    );
});
