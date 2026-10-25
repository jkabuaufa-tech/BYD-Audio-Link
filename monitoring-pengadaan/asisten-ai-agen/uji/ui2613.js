// Uji UI 2.6.13 di Chromium: blok MP2613 (Agen AI) dari pembaruan-2.6.17.json dengan data aplikasi tiruan — putaran kerja lokal (0 token),
// temuan dari lonceng 2.6.2 & Periksa kontrak 2.6.10, putaran ulang dilewati bila data sama, ringkasan AI 1 panggilan + cache, tema gelap & ponsel.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const P = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.17.json', 'utf8'));
const JS = P.js.slice(P.js.indexOf('/* MP2613'), P.js.indexOf('/* MP2614')), CSS = P.css.slice(P.css.indexOf('/* MP2613'));
const lulus = m => console.log('  ✓ ' + m);
(async () => {
  const br = await chromium.launch(); const gal = [];
  const pg = await br.newPage({ viewport: { width: 1280, height: 860 } }); pg.on('pageerror', e => gal.push(e.message));
  await pg.emulateMedia({ reducedMotion: 'reduce' });
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
  await pg.waitForSelector('#mp2613Dock'); lulus('dock Agen AI tampil setelah login');
  assert(await pg.$('#mp2613Menu') && await pg.$('#mp2613MenuDock')); lulus('menu akun › Agen AI & Sembunyikan dock terpasang');
  await pg.waitForFunction(() => MP2613_AGEN.pada > 0, null, { timeout: 15000 }); lulus('agen bekerja sendiri saat data tersedia (tanpa diminta)');
  const A = await pg.evaluate(() => ({ n: MP2613_AGEN.ring.n, T: MP2613_AGEN.temuan.map(x => x.level + ':' + x.sumber), log: MP2613_AGEN.log.map(l => l.teks), ai: AI_PANGGIL }));
  assert.deepStrictEqual(A.n, { KRITIS: 3, WARNING: 2, INFO: 1 }, JSON.stringify(A));
  assert.strictEqual(A.T[0].split(':')[0], 'KRITIS'); assert(A.T.includes('WARNING:Keuangan') && A.T.includes('KRITIS:Draf kontrak') && !A.T.some(t => /abaikan/.test(t)));
  lulus('temuan: kontrak H+0, BK yatim & draf Rp 0 > 30 hari = Kritis; dokumen vendor & tagihan BELUM > 30 hari = Warning; urut Kritis dulu');
  assert(A.log.some(t => /gudang.*dilewati/i.test(t)) && /0 token AI/.test(A.log[0]) && A.ai === 0); lulus('9 langkah tercatat di log, gudang belum dibuka → dilewati, 0 panggilan AI');
  const ul = await pg.evaluate(async () => { const p = MP2613_AGEN.putaran, h = MP2613_AGEN.tokenHemat; renderAllTables(); await new Promise(r => setTimeout(r, 2800)); return [MP2613_AGEN.putaran - p, MP2613_AGEN.tokenHemat - h, RENDER]; });
  assert.deepStrictEqual(ul, [0, 1, 1]); lulus('renderAllTables asli tetap jalan; data tidak berubah → putaran dilewati (tanpa kerja ulang)');
  await pg.click('#mp2613Dock'); await pg.waitForSelector('#mp2613Pn .mp2613-kpi'); lulus('klik dock membuka Meja Kerja Agen');
  await pg.screenshot({ path: OUT + '/agen-ai-aktivitas.png' });
  await pg.click('.mp2613-tabs button:nth-child(2)'); const kartu = await pg.$$eval('.mp2613-t', L => L.length); assert.strictEqual(kartu, 6);
  await pg.click('.mp2613-chip.kritis'); assert.strictEqual(await pg.$$eval('.mp2613-t', L => L.length), 3); lulus('tab Temuan 6 kartu, saring Kritis = 3');
  await pg.click('.mp2613-chip:not(.kritis):not(.warning):not(.info)');
  await pg.screenshot({ path: OUT + '/agen-ai-temuan.png' });
  await pg.locator('.mp2613-t', { hasText: '055/SPM' }).locator('button').click(); assert.deepStrictEqual(await pg.evaluate(() => DIBUKA), ['055']); assert(!(await pg.$('#mp2613Pn'))); lulus('Buka menutup panel & menjalankan aksi form asli (bukaKoreksi dll.)');
  await pg.keyboard.press('Control+Shift+A'); await pg.waitForSelector('#mp2613Pn'); lulus('Ctrl+Shift+A membuka panel');
  await pg.click('.mp2613-tabs button:nth-child(3)'); assert(/hal kritis/.test(await pg.textContent('.mp2613-br'))); lulus('briefing lokal tersedia tanpa AI');
  await pg.click('text=Ringkas dengan AI'); await pg.waitForSelector('.mp2613-ai');
  const x = await pg.evaluate(() => AI_X.data); assert.strictEqual(x.agen, false); assert.strictEqual(x.konteks, ''); assert(x.pesan[0].teks.length < 1700, x.pesan[0].teks.length);
  lulus('Ringkas dengan AI: 1 panggilan aiTanya tanpa konteks & tanpa mode agen, pesan ' + x.pesan[0].teks.length + ' karakter');
  assert(/508 token/.test(await pg.textContent('#mp2613Pn'))); lulus('pemakaian token dilaporkan (412 + 96 = 508)');
  await pg.click('text=Tampilkan (cache)'); assert.strictEqual(await pg.evaluate(() => AI_PANGGIL), 1); lulus('data sama → ringkasan dari cache, tanpa panggilan AI ke-2');
  await pg.screenshot({ path: OUT + '/agen-ai-briefing.png' });
  await pg.evaluate(async () => { REG.data.push({ id: 'r3', noKontrak: '070/SPM', namaVendor: 'Koperasi', nilai: 0, diposting: false, dibuatPada: new Date().toISOString() }); await mp2613Kerja(); });
  const B = await pg.evaluate(() => ({ baru: MP2613_AGEN.temuan.filter(x => x.baru).map(x => x.judul), put: MP2613_AGEN.putaran }));
  assert.deepStrictEqual(B.baru, ['070/SPM · Koperasi']); lulus('putaran berikutnya menandai temuan BARU saja (070/SPM)');
  await pg.click('.mp2613-tabs button:nth-child(3)'); assert(/Data sudah berubah/.test(await pg.textContent('#mp2613Pn'))); lulus('ringkasan AI lama ditandai bila data berubah (tidak dipanggil ulang otomatis)');
  // tema gelap & ponsel
  await pg.evaluate(() => document.documentElement.setAttribute('data-tema', 'gelap')); await pg.click('.mp2613-tabs button:nth-child(2)');
  await pg.screenshot({ path: OUT + '/agen-ai-gelap.png' });
  const bg = await pg.$eval('.mp2613-pn', e => getComputedStyle(e).backgroundColor); assert.strictEqual(bg, 'rgb(19, 36, 61)'); lulus('tema gelap memakai token gelap');
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.keyboard.press('Escape'); assert(!(await pg.$('#mp2613Pn'))); lulus('Esc menutup panel');
  const lebar = await pg.$eval('#mp2613Dock', e => e.getBoundingClientRect().width); assert(lebar < 60, lebar);
  await pg.click('#mp2613Dock'); const w = await pg.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.mp2613-pn').getBoundingClientRect().width]);
  assert(w[0] <= 390 && w[1] <= 390, w); await pg.screenshot({ path: OUT + '/agen-ai-ponsel.png' }); lulus('ponsel 390 px: dock jadi avatar, panel bottom-sheet tanpa geser horizontal');
  await pg.keyboard.press('Escape'); await pg.evaluate(() => mp2613Dock(false)); assert(!(await pg.$('#mp2613Dock'))); lulus('dock dapat disembunyikan dari menu akun');
  assert.deepStrictEqual(gal, []); lulus('tanpa galat JavaScript');
  await br.close(); console.log('ui2613: semua cek lulus');
})().catch(e => { console.error(e); process.exit(1); });
