// Uji 2.10.31 di Chromium (blok MP264 dari paket): kotak besar "Versi baru … tersedia" buatan HTML dasar diganti kartu kecil bertombol Muat ulang.
// Pakai: node uji/ui21031.js [paket-baru.json] [paket-lama.json]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const baca = f => JSON.parse(fs.readFileSync(f, 'utf8')), BARU = baca(process.argv[2] || path.join(__dirname, '..', 'pembaruan-2.10.31.json')), LAMA = baca(process.argv[3] || path.join(__dirname, '..', 'pembaruan-2.10.30.json'));
const blok = p => { const i = p.js.indexOf('/* MP264 — PEMBARUAN'), j = p.js.indexOf('/* MP21011 —', i); assert.ok(i >= 0 && j > i); return p.js.slice(i, j); };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch();
  // HTML dasar: kotak melayang berisi "Versi baru x tersedia. <catatan>" + tombol (tombol terdorong keluar layar oleh catatan panjang)
  const coba = async (kode, versi, catatan) => { const pg = await br.newPage({ viewport: { width: 1280, height: 800 } }); await pg.setContent('<!doctype html><html><body><main>halaman</main></body></html>'); await pg.addScriptTag({ content: kode });
    await pg.evaluate(([v, c]) => { const d = document.createElement('div'); d.id = 'kotakDasar'; d.style.cssText = 'position:fixed;left:25%;top:0;width:50%;background:#123;color:#fff;padding:20px'; d.innerHTML = '<b>Versi baru ' + v + ' tersedia.</b> <span></span> <button>Mulai ulang</button>'; d.querySelector('span').textContent = c; document.body.appendChild(d); }, [versi, catatan]);
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => { const k = document.getElementById('kotakDasar'), c = document.getElementById('mp264Versi'), b = c && [...c.querySelectorAll('button')].find(x => /Muat ulang/.test(x.textContent)), q = b && b.getBoundingClientRect();
      return { besar: getComputedStyle(k).display !== 'none', kartu: !!c, tombol: !!b && q.bottom <= innerHeight && q.right <= innerWidth && q.width > 0, judul: c ? c.querySelector('b').textContent : '' }; });
    await pg.close(); return r; };
  ok(LAMA.catatan.length > 60000 && BARU.catatan.length < 15000, 'catatan rilis: 2.10.30 = ' + LAMA.catatan.length + ' karakter (> 60.000) → 2.10.31 = ' + BARU.catatan.length);
  let r = await coba(blok(LAMA), '2.10.30', LAMA.catatan);
  if (process.env.DEBUG) console.log(r);
  ok(r.besar && !r.kartu, 'galat terulang: aplikasi 2.10.30 + catatan 2.10.30 → kotak besar tetap tampil, tanpa kartu / tombol Muat ulang');
  r = await coba(blok(LAMA), '2.10.31', BARU.catatan);
  ok(!r.besar && r.kartu && r.tombol && r.judul === 'Versi baru 2.10.31 tersedia', 'aplikasi yang masih 2.10.30 menerima 2.10.31 → kartu kecil, tombol Muat ulang terlihat di layar');
  r = await coba(blok(BARU), '2.10.99', 'x '.repeat(100000));
  ok(!r.besar && r.kartu && r.tombol, 'aplikasi 2.10.31: catatan 200.000 karakter pun diganti kartu kecil bertombol');
  ok(/^<b>Versi baru 2\.10\.31 tersedia\.<\/b>/.test(BARU.catatan) && /2\.10\.27/.test(BARU.catatan) && /versi sebelumnya tidak ditampilkan/.test(BARU.catatan), 'catatan memuat versi-versi terbaru (2.10.31 … 2.10.27) + penunjuk Riwayat rilis');
  await br.close(); console.log('\n' + lulus + ' cek lulus');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
