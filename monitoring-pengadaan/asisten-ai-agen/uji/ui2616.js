// Uji UI 2.6.16 di Chromium: Ruang Perintah Live (MP2616) — perintah lokal 0 token, perintah AI dengan persona & aksi sesuai tugas,
// usulan → Setujui & Terapkan (aiTerapkan), staf bertanya balik & utas berlanjut, perintah pekerjaan ke 'Semua tim' ditolak tanpa AI.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const P = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.16.json', 'utf8'));
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
    window.TERAP = []; window.AI_LOG = [];
    window.regAksi = async (a, x) => { await new Promise(r => setTimeout(r, 400));
      if (a === 'aiTerapkan') { TERAP.push(x.data); return { ok: true, status: x.data.batal ? 'dibatalkan' : 'diterapkan', ringkas: 'Paket PBJ "Besi beton BON-031" tersimpan (tahap 0).' }; }
      if (a !== 'aiTanya') throw new Error('aksi ' + a); AI_PANGGIL++; AI_LOG.push(x.data); const t = x.data.pesan[x.data.pesan.length - 1].teks;
      if (/PBJ/.test(t)) return { ok: true, teks: 'Siap. Paket PBJ dari **BON-031** sudah saya siapkan, mohon persetujuan.', pakai: { masuk: 1800, keluar: 120 }, langkah: [{ aksi: 'baca' }],
        usulan: { aksi: 'savePBJ', judul: 'Buat/ubah paket PBJ', alasan: 'Bon BON-031 belum punya paket PBJ', pratinjau: { siap: true, ringkas: 'BARU · Besi beton BON-031 · tahap 0', peringatan: [] }, boleh: true, token: 'tok123', status: 'menunggu' } };
      if (/SPK/.test(t)) return { ok: true, teks: 'Untuk menyiapkan pengajuan bayar, mohon info:\n- Nomor SPK\n- Periode tagihan?', pakai: { masuk: 900, keluar: 40 } };
      return { ok: true, teks: 'Baik, SPK 012/SPK periode Oktober saya proses.', pakai: { masuk: 950, keluar: 30 } }; };
    window.PMT = { data: [{ nomor: 'BON-031', departemen: 'Struktur', tanggal: hari(12), items: [{ vol: 5, wbs: '' }, { vol: 2, wbs: 'W-01' }] }, { nomor: 'BON-032', tanggal: hari(1), wbs: 'W-02', items: [{ vol: 3 }] }] }; window.notif = () => {}; window.RENDER = 0; window.renderAllTables = () => { RENDER++; };
  });
  await pg.addScriptTag({ content: JS });
  await pg.waitForTimeout(300); if (gal.length) throw new Error(gal.join(' | '));
  await pg.waitForSelector('#mp2613Dock'); await pg.waitForFunction(() => MP2613_AGEN.pada > 0, null, { timeout: 20000 });
  await pg.evaluate(() => mp2614Kantor()); await pg.waitForSelector('#mp2616Tx'); lulus('bilah perintah tampil di Kantor Live');
  assert.strictEqual(await pg.$$eval('#mp2616Ke option', L => L.length), 8); lulus('pilihan tujuan: 7 staf (tanpa Manajer) + Semua tim');
  // 1. lokal 0 token
  await pg.fill('#mp2616Tx', 'laporan'); await pg.press('#mp2616Tx', 'Enter');
  await pg.waitForFunction(() => MP2616_PERINTAH.L.length >= 2);
  const L1 = await pg.evaluate(() => [MP2616_PERINTAH.L[1].teks, MP2616_PERINTAH.L[1].ai, AI_PANGGIL, MP2614_KANTOR.ch.find(c => c.r.id === 'salma').teks]);
  assert(/^Laporan: .*kontrak jatuh tempo/.test(L1[0]) && L1[1] === false && L1[2] === 0 && /^💬 Laporan/.test(L1[3]), JSON.stringify(L1)); lulus('"laporan" ke Salma dijawab lokal dari hasil pemeriksaan (0 token) + balon 💬');
  await pg.evaluate(() => mp2616Kirim('berapa bon belum ber-WBS?')); assert(/1 bon permintaan belum lengkap WBS/.test(await pg.evaluate(() => MP2616_PERINTAH.L.slice(-1)[0].teks))); lulus('"berapa … WBS" dijawab lokal');
  // 2. perintah AI → usulan → setujui
  await pg.click('.mp2616-chip.ai'); await pg.waitForTimeout(150);
  const kerja = await pg.evaluate(() => { const c = MP2614_KANTOR.ch.find(c => c.r.id === 'salma'); return [c.status, c.teks, c.titik]; });
  assert.deepStrictEqual([kerja[0], /^✍️ Mengerjakan/.test(kerja[1]), kerja[2]], ['kerja', true, true]); lulus('saat menunggu AI, Salma mengetik di meja: "' + kerja[1] + '"');
  await pg.waitForSelector('.mp2616-us');
  const X = await pg.evaluate(() => AI_LOG[0]);
  assert(X.agen === true && /Salma \(Kontrak\)/.test(X.konteks) && /savePBJ/.test(X.konteks) && !/gudangTerimaBon/.test(X.konteks) && X.konteks.length <= 1600 && /^\[Perintah Manajer kepada Salma\] Buat paket PBJ/.test(X.pesan.slice(-1)[0].teks), JSON.stringify(X));
  lulus('1 panggilan aiTanya mode agen: persona Salma, hanya aksi savePBJ, konteks ' + X.konteks.length + ' karakter');
  assert(/^📝 Usulan Buat\/ubah paket PBJ/.test(await pg.evaluate(() => MP2614_KANTOR.ch.find(c => c.r.id === 'salma').teks))); lulus('balon Salma: "📝 Usulan … — menunggu persetujuan"; data belum berubah');
  assert.strictEqual(await pg.evaluate(() => TERAP.length), 0);
  await pg.screenshot({ path: OUT + '/perintah-live-usulan.png' });
  pg.once('dialog', d => d.accept()); await pg.click('text=Setujui & Terapkan'); await pg.waitForSelector('.mp2616-us.diterapkan');
  assert.deepStrictEqual(await pg.evaluate(() => TERAP), [{ token: 'tok123' }]); assert(/✅ .*tersimpan/.test(await pg.evaluate(() => MP2614_KANTOR.ch.find(c => c.r.id === 'salma').teks)));
  lulus('Setujui & Terapkan → aiTerapkan(token) sekali; balon "✅ … tersimpan"');
  // 3. staf bertanya balik, utas berlanjut
  await pg.evaluate(() => mp2616Ke('yusuf')); await pg.evaluate(() => mp2616Kirim('Siapkan pengajuan bayar SPK service bulan ini'));
  await pg.waitForFunction(() => /❓/.test(MP2614_KANTOR.ch.find(c => c.r.id === 'yusuf').teks), null, { timeout: 5000 }); lulus('Yusuf bertanya balik → balon "❓ Ada pertanyaan untuk Manajer"');
  await pg.evaluate(() => mp2616Kirim('SPK 012/SPK, periode Oktober')); await pg.waitForFunction(() => AI_LOG.length === 3);
  const riw = await pg.evaluate(() => AI_LOG[2].pesan.map(p => p.role)); assert.deepStrictEqual(riw, ['user', 'assistant', 'user']); assert(/keuanganProgres/.test(await pg.evaluate(() => AI_LOG[2].konteks)));
  lulus('jawaban Manajer melanjutkan utas (riwayat user → assistant → user), persona Yusuf: keuanganProgres');
  // 4. semua tim
  await pg.waitForFunction(() => !MP2616_PERINTAH.sibuk); const n0 = await pg.evaluate(() => AI_PANGGIL); await pg.selectOption('#mp2616Ke', 'semua'); await pg.evaluate(() => mp2616Kirim('buat laporan bulanan lengkap untuk direksi'));
  assert.strictEqual(await pg.evaluate(() => AI_PANGGIL), n0); assert(/satu staf/.test(await pg.evaluate(() => MP2616_PERINTAH.L.slice(-1)[0].teks))); lulus('perintah pekerjaan ke "Semua tim" diminta ditujukan ke satu staf (tanpa AI)');
  await pg.evaluate(() => mp2616Kirim('laporan')); assert(/• Charles Van Anto: /.test(await pg.evaluate(() => MP2616_PERINTAH.L.slice(-1)[0].teks))); lulus('"laporan" ke Semua tim: rekap tiap staf (0 token)');
  // 5. klik karakter memilih tujuan
  await pg.evaluate(() => mp2614Pilih('charles')); assert.strictEqual(await pg.$eval('#mp2616Ke', e => e.value), 'charles'); lulus('klik karakter Charles → tujuan perintah Charles');
  await pg.evaluate(() => mp2614Pilih('charles'));
  await pg.evaluate(() => { mp2616Ke('salma'); }); await pg.screenshot({ path: OUT + '/perintah-live.png' });
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(300);
  assert(await pg.evaluate(() => document.documentElement.scrollWidth <= 390)); await pg.screenshot({ path: OUT + '/perintah-live-ponsel.png' }); lulus('ponsel 390 px tanpa geser horizontal');
  assert.deepStrictEqual(gal, []); lulus('tanpa galat JavaScript');
  await br.close(); console.log('ui2616: semua cek lulus');
})().catch(e => { console.error(e); process.exit(1); });
