/* Service worker: aplikasi tetap terbuka saat offline (aset di-cache).
 * Strategi: network-first (batas 4 dtk) lalu fallback cache. Data proyek tidak lewat sini
 * (disimpan di localStorage + antrean sinkron di sinkron.js). Naikkan VERSI saat deploy besar. */
const VERSI = 'jiat-v2';
const ASET = ['./', './index.html', './app.js', './sinkron.js', './config.js', './styles.css', './lib/xlsx.bundle.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSI);
    try {
      const res = await Promise.race([fetch(req), new Promise((_, tolak) => setTimeout(() => tolak(new Error('timeout')), 4000))]);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    }
  })());
});
