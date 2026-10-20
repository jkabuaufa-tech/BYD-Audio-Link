/* Service worker Monitoring SAP (aplikasi HP)
   - Halaman aplikasi disimpan di perangkat → terbuka instan & tetap bisa dibuka saat sinyal putus.
   - Setiap dibuka, versi di server diperiksa diam-diam (tanpa unduh ulang bila tidak berubah).
     Bila index.html di GitHub diganti, pengguna mendapat tombol "Muat ulang".
   - 2.2.1: hp-awal.js ikut disimpan (kartu "Hubungkan ke server" & link ?server=… tetap jalan saat offline).
   - Permintaan ke server Google (Apps Script) TIDAK disentuh — data selalu langsung dari server. */
const CACHE = 'monitoring-sap-v2';   // 2.2.1: + hp-awal.js (penghubung server)
const INTI = ['./', 'hp-awal.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(INTI)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const tanda = r => r && (r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length'));
async function kabari() { (await self.clients.matchAll({ includeUncontrolled: true })).forEach(c => c.postMessage({ jenis: 'versi-baru' })); }

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/config.json')) {   // alamat server: selalu terbaru, cadangan dari cache bila offline
    e.respondWith(fetch(req, { cache: 'no-store' }).then(r => { const k = r.clone(); caches.open(CACHE).then(c => c.put(req, k)); return r; }).catch(() => caches.match(req)));
    return;
  }
  const halaman = req.mode === 'navigate' || url.pathname.endsWith('/index.html');
  const kunci = halaman ? new URL('./', self.registration.scope).href : req;
  e.respondWith(caches.open(CACHE).then(async c => {
    const ada = await c.match(kunci, { ignoreSearch: true });
    const ambil = fetch(halaman ? new Request(kunci, { cache: 'no-cache' }) : req).then(async r => {
      if (r && r.ok && r.type === 'basic') {
        if (halaman && ada && tanda(ada) && tanda(r) && tanda(ada) !== tanda(r)) { await c.put(kunci, r.clone()); kabari(); }
        else await c.put(kunci, r.clone());
      }
      return r;
    }).catch(() => ada);
    if (ada) { e.waitUntil(ambil); return ada; }
    return ambil;
  }));
});
