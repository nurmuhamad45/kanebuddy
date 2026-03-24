const CACHE_NAME = 'kanebuddy-v1';
const CORE_ASSETS = [
    './',
    './index.html',
    './app.js',
    './style.css',
    './manifest.json'
];

// Install: Cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: Network-first strategy (always fetch fresh, fallback to cache)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and API calls (always live data from server)
    if (event.request.method !== 'GET' || event.request.url.includes('localhost:3000')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((res) => {
                const resCopy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resCopy));
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
