/* Service worker : pages principales consultables sans réseau.
   Stratégie « réseau d'abord » (le contenu est toujours à jour), cache en secours. Le dashboard n'est jamais mis en cache. */
const CACHE = 'mpp-v2';
const PRECACHE = ['./', 'index.html', 'mouvement.html', 'projets.html', 'equipe.html', 'faq.html', 'liens.html', 'parking.html', 'annonces.html', 'agenda.html',
  'css/style.css', 'js/config.js', 'js/core.js', 'js/filters.js', 'js/p-home.js', 'js/p-info.js', 'assets/logo.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/admin/')) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {   // revalide toujours auprès du serveur : jamais de contenu périmé
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
