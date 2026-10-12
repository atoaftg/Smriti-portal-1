/* Minimal offline shell: network-first for everything, cached copy as fallback. */
const CACHE = 'smriti-v2';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/seed.js', 'js/util.js', 'js/store.js', 'js/auth.js', 'js/search.js', 'js/tts.js', 'js/views-learner.js', 'js/views-employee.js', 'js/views-admin.js', 'js/views-landing.js', 'js/app.js', 'img/ongc-logo-64.png', 'img/ongc-logo-128.png', 'img/ongc-logo-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
