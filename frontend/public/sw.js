/* Service worker Perugros : installation de l'app et cache hors-ligne des ressources lourdes
   (modèles 3D, textures). */
const CACHE = 'perugros-v3';
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
    if (url.pathname.startsWith('/socket.io') || url.pathname === '/health') return;

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
    // (manifest.json exclu : il doit pouvoir être mis à jour)
    if (/^\/(static|model|texture)\//.test(url.pathname) || /\.(png|webp)$/.test(url.pathname)) {
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
