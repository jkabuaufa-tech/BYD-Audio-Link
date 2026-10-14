// Render kop/ttd Kartu Gudang dari fungsi cetak() asli (MP223) + pembungkus MP241 → PNG A4 portrait
const fs = require('fs'), { chromium } = require('playwright');
const paket = process.argv[2], keluar = process.argv[3];
const js = JSON.parse(fs.readFileSync(paket, 'utf8')).js;
const a = js.indexOf('function cetak(judul, form, meta'), b = js.indexOf('function excel(', a), src = js.slice(a, b);
const mp241 = js.slice(js.indexOf('/* MP241 — PEMBARUAN'), js.indexOf('/* MP250 — PEMBARUAN'));
const w2c = mp241.slice(mp241.indexOf('[2.5.2] blok tanda tangan') >= 0 ? mp241.indexOf('[2.5.2] blok tanda tangan') : mp241.indexOf('2C. CETAK A4'), mp241.indexOf('/* ======================= PEMASANGAN'));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 794, height: 1123 } });
  await pg.setContent('<html><body></body></html>');
  const html = await pg.evaluate(([src, w2c]) => {
    const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    window.PROYEK = { id: '1726012', nama: 'Rehab', namaLengkap: 'Rehabilitasi Jaringan Irigasi D.I/D.I.R Sumatera Selatan', kso: 'WASKITA - NINDYA KSO' };
    const ttd = () => ({ kota: 'Jakarta', kasi: 'Joko Supriyono', petugas: 'Ngadianto' }), tglP = s => '25 September 2026', hariIni = () => '2026-09-25', sesi = () => ({ nama: 'uji' });
    let out = ''; window.mp224Cetak = h => { out = h; };
    const cetak = new Function('E', 'ttd', 'tglP', 'hariIni', 'sesi', src + '; return cetak;')(E, ttd, tglP, hariIni, sesi);
    window.mp223KartuCetak = () => cetak('KARTU GUDANG / STOCK CARD', 'LOGINV-09', '', '<table class="t"><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Sisa</th></tr></thead><tbody><tr><td class="c">24-Des-2025</td><td class="r">-</td><td class="r">-</td></tr></tbody></table>',
      [['Mengetahui,', 'Kasi DanLoglat', 'Joko Supriyono'], ['Diisi oleh,', 'Petugas Gudang', 'Ngadianto']], 'Catatan: Dibuat rangkap 2 (dua), 1. Untuk Gudang, 2. Untuk SPLEM', '2026-09-25', true);
    const hariIni2 = hariIni; window.siapkanK = () => { };
    try { new Function('hariIni', 'siapkanK', 'migrasiAktif', '/* ' + w2c)(hariIni2, () => { }, () => []); } catch (e) { return 'GALAT ' + e.message; }
    window.mp223KartuCetak(); return out;
  }, [src, w2c]);
  if (/^GALAT/.test(html)) { console.log(html); process.exit(1); }
  fs.writeFileSync(keluar.replace(/\.png$/, '.html'), html);
  await pg.setContent(html); await pg.screenshot({ path: keluar, fullPage: true });
  const pos = await pg.evaluate(() => [...document.querySelectorAll('.ttd b')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent, kiri: Math.round(r.left), kanan: Math.round(r.right) }; }));
  console.log(JSON.stringify(pos), 'lebar', await pg.evaluate(() => document.body.clientWidth)); await br.close();
})();
