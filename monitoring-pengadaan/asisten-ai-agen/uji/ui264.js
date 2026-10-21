// Uji 2.6.4 di Chromium: (1) pemberitahuan versi baru = kartu kecil yang dapat ditutup (blok MP264 asli);
// (2) kontrak dengan tagihan 100% tidak dinotifikasi lewat / H-30 — masa() asli blok MP220 + lonceng MP258 asli.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.5.json', 'utf8')), js = PK.js;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i + 10) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const MP220 = potong('/* MP220', '\n/* MP2'), MP258 = potong('/* MP258', '/* MP263'), MP264 = potong('/* MP264 — PEMBARUAN');
const hari = d => { const t = new Date(Date.now() + d * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
const CATATAN = '<b>Versi baru 2.6.2 tersedia.</b> Pembaruan 2.6.2 (kumulatif dari 2.6.1 … 2.2.7; pasangan Modul server 1.9.0). ' + 'BARU 2.6.2 — Data Vendor WAVE, lonceng berjenjang, Prioritas Hari Ini, Register per halaman, Jejak Audit. '.repeat(12);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1280, height: 820 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  let dialog = 0; pg.on('dialog', d => { dialog++; d.dismiss(); });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;background:#0e1a2b;color:#fff;margin:0}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;cursor:pointer}.btn-light{background:#fff;color:#0B2B54}.btn-outline-light{background:none;color:#fff;border-color:#fff}.btn-link{background:none;border:0}
    form{padding:20px}input{padding:6px;width:300px}</style><style>${PK.css}</style></head><body><div class="app-header"><div class="mp220-bell-w"><button id="mp220Bell" onclick="mp220Lonceng()">🔔<b id="mp220BellN" hidden>0</b></button><div id="mp220Panel" hidden></div></div><div class="menu-akun"></div></div>
    <form><h3>Form Permintaan</h3><label>Nama barang <input id="barang" value=""></label></form><div id="tab-dashboard-tagihan"></div></body></html>`);
  await pg.evaluate(() => { window.REG = { url: '', sesi: { nama: 'Ilham A P', peran: 'PENGADAAN', admin: false }, data: [] }; window.PROG = { data: [] }; window.PMT = { data: [] }; window.PROYEK = { id: '1726012' };
    window.__notif = []; window.notif = (m, t) => { window.__notif.push([String(m).slice(0, 60), t]); }; });
  for (const b of [MP220, MP258, MP264]) await pg.addScriptTag({ content: b });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };

  console.log('1. Pemberitahuan versi baru untuk staf');
  await pg.evaluate(c => notif(c, 'info'), CATATAN);
  ok(await pg.evaluate(() => !window.__notif.length && !!document.getElementById('mp264Versi')), 'kotak besar tidak ditampilkan; diganti kartu kecil');
  const kr = await pg.evaluate(() => { const r = document.getElementById('mp264Versi').getBoundingClientRect(); return { w: r.width, h: r.height, b: innerHeight - r.bottom, t: document.getElementById('mp264Versi').textContent }; });
  ok(kr.w <= 380 && kr.h < 160 && kr.b >= 0 && /Versi baru 2\.6\.2 tersedia/.test(kr.t) && /Muat ulang/.test(kr.t) && /Nanti/.test(kr.t), 'kartu ' + Math.round(kr.w) + '×' + Math.round(kr.h) + ' px di pojok kanan bawah: Muat ulang · Catatan · Nanti · ×');
  await pg.screenshot({ path: OUT + '/versi-baru-kartu.png', clip: { x: 860, y: 600, width: 420, height: 220 } });
  await pg.click('#mp264Versi .mp264-a .btn-outline-light');
  ok(await pg.evaluate(() => /kumulatif dari 2\.6\.1/.test(document.querySelector('.mp264-cat').textContent)), 'catatan rilis dibuka di dalam kartu (dapat digulir)');
  await pg.click('#mp264Versi .mp264-x');
  ok(await pg.evaluate(() => !document.getElementById('mp264Versi')), 'tombol × menutup kartu');
  await pg.evaluate(c => notif(c, 'info'), CATATAN);
  ok(await pg.evaluate(() => !document.getElementById('mp264Versi')), 'versi yang sama tidak muncul lagi selama aplikasi terbuka');
  await pg.evaluate(c => notif(c.replace(/2\.6\.2/g, '2.6.5'), 'info'), CATATAN);
  ok(await pg.evaluate(() => /2\.6\.5/.test(document.getElementById('mp264Versi').textContent)), 'versi berikutnya tetap diberitahukan');
  await pg.evaluate(() => mp264Versi('tutup'));
  console.log('2. Muncul saat sedang entri');
  await pg.click('#barang'); await pg.keyboard.type('Sika Grout 215');
  await pg.evaluate(c => notif(c.replace(/2\.6\.2/g, '2.6.6'), 'info'), CATATAN);
  ok(await pg.evaluate(() => document.getElementById('mp264Versi').classList.contains('kecil') && document.activeElement.id === 'barang'), 'sedang mengetik → hanya tombol kecil "Versi baru", kursor tetap di isian');
  await pg.screenshot({ path: OUT + '/versi-baru-saat-entri.png' });
  await pg.click('#mp264Versi .mp264-pil');
  ok(await pg.evaluate(() => !document.getElementById('mp264Versi').classList.contains('kecil')), 'tombol kecil dibuka menjadi kartu');
  await pg.click('#mp264Versi .mp264-a .btn-light');
  ok(dialog === 1 && await pg.evaluate(() => document.getElementById('barang').value === 'Sika Grout 215'), 'Muat ulang mengingatkan isian belum disimpan; Batal → isian tetap');
  await pg.evaluate(() => mp264Versi('tutup'));
  await pg.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:10px;left:20%;width:60%;background:#1763B3;padding:20px'; d.className = 'toast'; d.innerHTML = '<b>Versi baru 2.6.7 tersedia.</b> ' + 'catatan panjang '.repeat(60); document.body.appendChild(d); });
  await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => document.querySelector('.toast').style.display === 'none' && /2\.6\.7/.test(document.getElementById('mp264Versi').textContent)), 'kotak versi baru dari HTML dasar disembunyikan & diganti kartu');
  await pg.evaluate(() => notif('Tersimpan', 'ok'));
  ok(await pg.evaluate(() => window.__notif.some(x => x[0] === 'Tersimpan')), 'pesan biasa tetap tampil seperti sebelumnya');

  console.log('3. Notifikasi kontrak lewat hanya untuk tagihan < 100%');
  const M = await pg.evaluate(h => {
    const g = (key, nilai, realisasi, tgl, statusKey) => ({ t: 'master', key, nomor: [key], vendor: 'V', nilai, realisasi, statusKey, g: { key, tglSelesai: tgl } });
    const rows = [g('015/SPM · Limas Jaya', 15.2e6, 15.2e6, h.lewat, 'lengkapi'), g('015/SPPP · KANE', 81.7e6, 16.3e6, h.lewat, 'berjalan'), g('049/SPM · Lubana', 133.2e6, 133.19995e6, h.dekat, 'proses'),
      g('X/SPM · nilai 0', 0, 0, h.lewat, 'lengkapi'), { t: 'reg', key: 'R/SPSA', nomor: ['R/SPSA'], vendor: 'Reg', nilai: 50e6, realisasi: 0, statusKey: 'berjalan', r: { id: 'R1', tglSelesai: h.lewat }, g: null }];
    PROG.data = [{ noKontrak: 'R/SPSA', nilai: 30e6 }, { noKontrak: 'R/SPSA', nilai: 20e6 }];
    return rows.map(x => x.key + '=' + mp220Masa(x).k);
  }, { lewat: hari(-40), dekat: hari(5) });
  ok(M[0] === '015/SPM · Limas Jaya=selesai', 'Limas Jaya (tagihan 100%, status "perlu dilengkapi") → selesai, tidak dinotifikasi');
  ok(M[1] === '015/SPPP · KANE=lewat', 'KANE (tagihan 20%) → tetap "lewat"');
  ok(M[2] === '049/SPM · Lubana=selesai', 'selisih pembulatan Rp 50 dari 133,2 jt dianggap lunas');
  ok(M[3] === 'X/SPM · nilai 0=lewat' && M[4] === 'R/SPSA=selesai', 'kontrak nilai 0 tetap dipantau; kontrak Register lunas dari jumlah BK progres → selesai');
  const L = await pg.evaluate(h => {
    const mk = (key, nilai, realisasi) => ({ t: 'master', key, nomor: [key], vendor: 'V', nilai, realisasi, statusKey: 'lengkapi', g: { key, tglSelesai: h } });
    window.semuaKontrak214 = () => [mk('015/SPM', 15.2e6, 15.2e6), mk('015/SPPP', 81.7e6, 16.3e6), mk('062/SPM', 20.2e6, 20.2e6)];
    window.mp220NotifDaftar = () => []; mp258Hitung(); return MP258_NT.L.filter(x => x.g === 'kontrak').map(x => x.judul.split(' · ')[0]);
  }, hari(-40));
  ok(L.length === 1 && L[0] === '015/SPPP', 'lonceng Kritis hanya berisi kontrak tagihan < 100% (' + L.join(', ') + ')');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji 2.6.4');
})().catch(e => { console.error(e); process.exit(1); });
