// Uji UI 2.6.14 di Chromium: Kantor Agen AI Live (MP2614) di atas MP2613 dari pembaruan-2.6.14.json dengan data aplikasi tiruan —
// karakter mengikuti langkah kerja nyata, balon dari hasil pemeriksaan, berjalan & kembali ke meja, klik karakter → temuan, 0 panggilan AI, ponsel.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const P = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.14.json', 'utf8'));
const JS = P.js.slice(P.js.indexOf('/* MP2613'), P.js.indexOf('/* MP264 — PEMBARUAN')), CSS = P.css.slice(P.css.indexOf('/* MP2613'));
assert(JS.indexOf('/* MP2614') > 0 && CSS.indexOf('/* MP2614') > 0);
const lulus = m => console.log('  ✓ ' + m);
(async () => {
  const br = await chromium.launch(); const gal = [];
  const pg = await br.newPage({ viewport: { width: 1280, height: 860 } }); pg.on('pageerror', e => gal.push(e.message));
    const HTML = (`<!doctype html><html data-tema="terang"><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#E9EEF5}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-success{background:#2E9E5B;color:#fff}.btn-close{border:0;background:none;width:24px;height:24px}.btn-close::after{content:'×';font-size:20px}.app-header{padding:10px 16px;background:#0B1F3A;color:#fff}${CSS}</style></head>
    <body><div class="app-header">Monitoring SAP<div class="menu-akun"><ul class="dropdown-menu"><li><a class="dropdown-item">Profil</a></li></ul></div></div><main style="padding:20px">Dashboard</main></body></html>`);
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    const hari = n => new Date(Date.now() - n * 864e5).toISOString();
    window.PROYEK = { id: '1726012' }; window.AI_PANGGIL = 0; window.DIBUKA = [];
    window.REG = { url: 'https://contoh/exec', sesi: { nama: 'Joko Supriyono', admin: true }, data: [
      { id: 'r1', noKontrak: '061/SPM/WK/2026', namaVendor: 'CV Limas Jaya', nilai: 0, diposting: false, dibuatPada: hari(41) },
      { id: 'r2', noKontrak: '062/SPM/WK/2026', namaVendor: 'PT Beton Prima', nilai: 125e6, diposting: true }] };
    window.PROG = { data: [{ id: 'b1', noKontrak: '015/SPM', nilai: 48.5e6, tanggal: hari(45), bayar: { status: 'BELUM' } }, { id: 'b2', noKontrak: '027/SPM', nilai: 40877000, bayar: { status: 'DIBAYAR' } }] };
    window.semuaKontrak214 = () => [{ key: '015/SPM' }, { key: '027/SPM' }, { key: '055/SPM' }];
    window.MP258_NT = { L: [] };
    window.mp258Hitung = () => { MP258_NT.L = [{ g: 'kontrak', level: 'KRITIS', tahap: 'H+0', judul: '055/SPM · Cahaya Utama', ket: 'Masa berlaku berakhir 20 Okt 2026', nilai: 'Rp 310 jt', buka: "DIBUKA.push('055')" },
      { g: 'dokumen', level: 'WARNING', tahap: 'H-5', judul: 'Surya Salim · SBUJK', ket: 'Berakhir 30 Okt 2026', buka: '' }, { g: 'tagihan', level: 'INFO', judul: 'abaikan' }]; };
    window.mp2610Periksa = () => ({ T: [{ tingkat: 'galat', kode: 'BK_YATIM', key: '099/SPM', vendor: '', pesan: 'BK tidak terhubung ke kontrak mana pun', tagihan: 5e6, buka: '' },
      { tingkat: 'info', kode: 'TGL_KOSONG', key: '027/SPM', vendor: 'Putra Paloh', pesan: 'Tanggal selesai kontrak belum diisi', buka: "DIBUKA.push('027')" }] });
    window.regAksi = async (a, x) => { if (a !== 'aiTanya') throw new Error('aksi ' + a); AI_PANGGIL++; window.AI_X = x;
      return { ok: true, teks: 'Kondisi: 2 hal kritis.\n1. **Pengadaan** perpanjang 055/SPM hari ini.\n2. Keuangan proses BK 015/SPM.\n3. Admin hubungkan BK 099/SPM.', model: 'claude-uji', pakai: { masuk: 412, keluar: 96 }, sisa: 49 }; };
    window.notif = () => {}; window.RENDER = 0; window.renderAllTables = () => { RENDER++; };
  });
  await pg.addScriptTag({ content: JS });
  await pg.waitForSelector('#mp2613Dock'); assert(await pg.$('#mp2614Menu')); lulus('menu akun › Kantor Agen (Live) terpasang');
  await pg.click('#mp2613Dock'); await pg.waitForSelector('#mp2614Lapis canvas'); assert(!(await pg.$('#mp2613Pn'))); lulus('klik dock membuka Kantor Agen AI Live');
  assert.strictEqual(await pg.$$eval('#mp2614Strip li', L => L.length), 7); lulus('7 agen tercantum di daftar status');
  // selama putaran berjalan: tepat satu agen "Bekerja" & sesuai langkah aktif, langkah diperlambat agar terlihat
  await pg.waitForFunction(() => MP2613_AGEN.jalan && MP2613_AGEN.aktif === 'nilai', null, { timeout: 20000 });
  await pg.waitForTimeout(700);
  const K = await pg.evaluate(() => ({ lambat: MP2613_AGEN.lambat, kerja: MP2614_KANTOR.ch.filter(c => c.status === 'kerja').map(c => c.r.id + '|' + c.teks), selesai: MP2614_KANTOR.ch.filter(c => c.status === 'selesai').map(c => c.teks) }));
  assert(K.lambat); assert.deepStrictEqual(K.kerja.map(x => x.split('|')[0]), ['nilai']); assert(/Mencocokkan nilai kontrak/.test(K.kerja[0]));
  assert(K.selesai.some(t => /^✓ .*kontrak jatuh tempo/.test(t)), JSON.stringify(K)); lulus('putaran berjalan: Auditor Nilai mengetik langkahnya; agen yang sudah selesai menampilkan hasil nyata');
  await pg.screenshot({ path: OUT + '/kantor-live-bekerja.png' });
  await pg.waitForFunction(() => MP2613_AGEN.pada > 0 && !MP2613_AGEN.jalan, null, { timeout: 20000 });
  // perilaku santai: paksa satu agen ke papan, lalu harus kembali ke meja
  const jalan = await pg.evaluate(async () => { const c = MP2614_KANTOR.ch.find(x => x.r.id === 'susun'); c.sampai = 0; const r = Math.random; Math.random = () => 0.01; await new Promise(r => setTimeout(r, 120)); Math.random = r;
    return { mode: c.mode, tujuan: c.tujuan, teks: c.teks, jalur: c.jalur.length }; });
  assert.strictEqual(jalan.tujuan, 'papan'); assert(/Rapat: 3 temuan kritis/.test(jalan.teks) && jalan.jalur > 0, JSON.stringify(jalan)); lulus('Manajer berjalan ke papan temuan: "📌 Rapat: 3 temuan kritis"');
  await pg.waitForTimeout(1500); await pg.screenshot({ path: OUT + '/kantor-live-berjalan.png' });
  await pg.waitForFunction(() => { const c = MP2614_KANTOR.ch.find(x => x.r.id === 'susun'); return c.mode === 'titik' && !c.jalur.length; }, null, { timeout: 15000 });
  await pg.evaluate(() => { const c = MP2614_KANTOR.ch.find(x => x.r.id === 'susun'); c.sampai = 0; });
  await pg.waitForFunction(() => { const c = MP2614_KANTOR.ch.find(x => x.r.id === 'susun'); return c.mode === 'meja' && !c.jalur.length && Math.abs(c.j - 8.05) < .01; }, null, { timeout: 15000 });
  lulus('setelah di papan, Manajer kembali ke mejanya lewat lorong');
  const idle = await pg.evaluate(() => MP2614_KANTOR.ch.find(x => x.r.id === 'masa').teks); assert(/^🔎 Pantau (055\/SPM|Surya Salim)|^📌|^☕|^🛋|^🌆|^🥤|^↩/.test(idle), idle); lulus('balon patroli memakai temuan nyata (' + idle + ')');
  // klik karakter → kartu temuan
  const pos = await pg.evaluate(() => { const c = MP2614_KANTOR.ch.find(x => x.r.id === 'nilai'); const b = document.getElementById('mp2614Cv').getBoundingClientRect(), k = c.kotak, s = MP2614_KANTOR.s; return [b.left + (k[0] + k[2] / 2) * s, b.top + (k[1] + k[3] / 2) * s]; });
  await pg.mouse.click(pos[0], pos[1]); await pg.waitForSelector('#mp2614Info:not([hidden])');
  assert(/099\/SPM/.test(await pg.textContent('#mp2614Info'))); lulus('klik Auditor Nilai → kartu temuan Nilai & tagihan (099/SPM)');
  await pg.screenshot({ path: OUT + '/kantor-live-kartu.png' });
  await pg.locator('#mp2614Info .t', { hasText: '027/SPM' }).locator('button').click(); assert.deepStrictEqual(await pg.evaluate(() => DIBUKA), ['027']); assert(!(await pg.$('#mp2614Lapis'))); lulus('Buka dari kartu menutup kantor & membuka form asli');
  const henti = await pg.evaluate(async () => { const a = MP2614_KANTOR.t; await new Promise(r => setTimeout(r, 300)); return [MP2614_KANTOR.buka, MP2614_KANTOR.t === a, MP2613_AGEN.lambat]; });
  assert.deepStrictEqual(henti, [false, true, false]); lulus('animasi berhenti total saat kantor ditutup (tanpa beban CPU)');
  assert.strictEqual(await pg.evaluate(() => AI_PANGGIL), 0); lulus('0 panggilan AI selama Kantor Live');
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.evaluate(() => mp2614Kantor()); await pg.waitForTimeout(800);
  const m = await pg.evaluate(() => [document.documentElement.scrollWidth, document.getElementById('mp2614Wrap').scrollWidth > document.getElementById('mp2614Wrap').clientWidth]);
  assert(m[0] <= 390 && m[1], m); await pg.screenshot({ path: OUT + '/kantor-live-ponsel.png' }); lulus('ponsel 390 px: kantor dapat digeser di dalam bingkai, halaman tidak bergeser');
  await pg.keyboard.press('Escape'); assert(!(await pg.$('#mp2614Lapis'))); lulus('Esc menutup kantor');
  assert.deepStrictEqual(gal, []); lulus('tanpa galat JavaScript');
  await br.close(); console.log('ui2614: semua cek lulus');
})().catch(e => { console.error(e); process.exit(1); });
