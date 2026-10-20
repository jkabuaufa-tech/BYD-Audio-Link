// Uji UI 2.5.6 di Chromium: Data Vendor WAVE di Master Data › Vendor — impor file ekspor WAVE, analisis kekurangan, pelengkap kolom kosong,
// peringatan Blacklist, vendor WAVE di pencarian PBJ & profil BA. File asli dipakai bila WAVE_XLS diberikan; selain itu contoh sintetis.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const { C, K, P } = require('./vt_data.js')();
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.5.6.json', 'utf8')), js = PK.js, css = PK.css, mp256 = js.slice(js.indexOf('/* MP256 — PEMBARUAN'));
const KOL = ['ID VENDOR', 'BP NUMBER', 'KUALIFIKASI PERUSAHAAN', 'NAMA VENDOR', 'STATUS REKANAN', 'BIDANG USAHA', 'CQSMS VENDOR', 'EMAIL VENDOR', 'NOMOR TELEPON', 'ALAMAT', 'NEGARA', 'PROVINSI', 'SKN VENDOR', 'NPWP VENDOR', 'INDUSTRY KEY', 'PB-04', 'Nilai Rata-Rata PB06', 'STATUS USER', 'NAMA PIC', 'ASAL VENDOR'];
const asli = process.env.WAVE_XLS && fs.existsSync(process.env.WAVE_XLS);
const XLS = asli ? fs.readFileSync(process.env.WAVE_XLS) : Buffer.from('<meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><table border="1"><tr>' + KOL.map(k => '<th>' + k + '</th>').join('') + '</tr>' + [
  ['01000', '2100003778', 'PT', 'Mitra Hijau Lestari', 'Rekanan Terseleksi Waskita', 'Supplier Menengah', '', 'mhl@contoh.co.id', "'0711 555 123", 'Indonesia, Sumatera Selatan, Palembang, Jl. Contoh No. 1, 01, 30111', 'Indonesia', 'Sumatera Selatan', '', '01.234.567.8-901.000', '', '', '', 'Active', 'Budi Santoso', ''],
  ['15087', '2100009806', 'PT', 'ERDA INDAH', 'Blacklist', 'Sub Kontraktor Besar', '', 'erda@contoh.co.id', "'0548 3048168", 'Indonesia, Kalimantan Timur, Bontang, Jl. Pupuk Raya, 00, 75313', 'Indonesia', 'Kalimantan Timur', '', '03.035.877.4-724.000', '', '', '', 'Active', 'Yuni', ''],
  ['14058', '', 'PT', 'PT. HARMONY PILAR SENTOSA', 'Unverified', 'Supplier Besar', '', 'fina@contoh.co.id', "'081553524808", 'Indonesia, Jawa Timur, SURABAYA, Jalan Raya Bumi Maspion Blok C, 02, 60195', 'Indonesia', 'Jawa Timur', '', '75.786.280.0-612.000', '', '', '', 'Active', 'Fina', ''],
  ['20001', '2100020001', 'CV', 'CV BARU JAYA ABADI', 'Rekanan Terdaftar', 'Sewa Alat', '', 'baru@contoh.co.id', "'0711 777", 'Indonesia, Sumatera Selatan, Ogan Ilir, Jl. Lintas Timur, 03, 30662', 'Indonesia', 'Sumatera Selatan', '', '11.222.333.4-555.000', '', '', '', 'Active', 'Rahmat', '']
].map(r => '<tr>' + r.map(v => '<td>' + v + '</td>').join('') + '</tr>').join('') + '</table>', 'utf8');
// master tambahan lama (proyek): satu vendor tanpa NPWP/alamat — harus dilengkapi tanpa mengganti kode/nama
assert.ok(post({ action: 'simpanMasterTambahan', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: { jenis: 'VENDOR', kode: 'CUST-V001', nama: 'PT. HARMONY PILAR SENTOSA', satuan: '', detail: { pimpinan: 'Direktur Lama' } } }).ok);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;padding:16px;background:#E9EEF5;--f-bg:#fff;--f-ink:#14233A;--f-muted:#5B6B82;--f-line:#DCE3EC;--f-soft:#F3F6FA}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff}.btn-primary{background:#1763B3;color:#fff}.d-flex{display:flex}.gap-2{gap:8px}.flex-wrap{flex-wrap:wrap}.mp219-tb{width:100%;border-collapse:collapse;background:#fff}.mp219-tb td,.mp219-tb th{border-bottom:1px solid #DCE3EC;padding:5px;font-size:.8rem;text-align:left}.alert-danger{background:#FDE2E2;padding:8px;border-radius:8px}.form-control{padding:4px 6px;width:100%}</style><style>${css}</style></head>
    <body><h3>Master Data</h3><div id="mdIsi"><div class="card"><table class="mp219-tb"><thead><tr><th>Kode</th><th>Nama</th><th>Kontak</th><th>Kota / Alamat</th><th>Sumber</th><th></th></tr></thead><tbody>
    <tr><td><code>2100003778</code></td><td>Mitra Hijau Lestari</td><td>-</td><td class="small"></td><td><span class="badge">Baku</span></td><td></td></tr>
    <tr><td><code>2100009806</code></td><td>Erda Indah</td><td>-</td><td class="small">Bontang</td><td><span class="badge">Baku</span></td><td></td></tr>
    <tr><td><code>3000000001</code></td><td>Vendor Lokal Tanpa WAVE</td><td>-</td><td class="small">Palembang</td><td><span class="badge">Baku</span></td><td></td></tr></tbody></table></div></div></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(P => {
    const nama = 'Joko Supriyono', pin = '1234';
    window.REG = { url: 'https://contoh/exec', sesi: { nama, admin: true, peran: 'PENGADAAN' } }; window.PROYEK = { id: P }; window.mp220Srv = () => true; window.MD214 = { jenis: 'VENDOR' };
    window.MASTER_VENDORS = [{ id: '2100003778', name: 'Mitra Hijau Lestari', city: '' }, { id: '2100009806', name: 'Erda Indah', city: 'Bontang' }, { id: '3000000001', name: 'Vendor Lokal Tanpa WAVE', city: 'Palembang' }];
    window.notif = (m, t) => { (window.__notif = window.__notif || []).push([m, t]); };
    window.regAksi = async (a, extra) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {})))); if (!r.ok) throw new Error(r.error); return r; };
    window.profilVendor = (id, n) => ({ namaVendor: n, nama: '', alamat: '' });
    window.__PBJ_HOST = { cariVendor: q => MASTER_VENDORS.filter(v => !v._mp214 && (v.name + ' ' + v.id).toLowerCase().includes(String(q).toLowerCase())).map(v => ({ nama: v.name, id: v.id, alamat: v.city, pimpinan: '', jabatan: 'Direktur', email: '', telp: '', npwp: '', sumber: 'Baku' })) };
  }, P);
  await pg.addScriptTag({ content: mp256 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.waitForSelector('#mp256Panel', { timeout: 8000 }); await pg.waitForTimeout(500);
  ok(/Belum ada data/.test(await pg.textContent('#mp256Info')), 'panel "Data Vendor WAVE" tampil di Master Data › Vendor (belum ada data)');
  const t0 = Date.now();
  await pg.setInputFiles('#mp256File', { name: '2026-10-20_list_Master_Data_perusahaan.xls', mimeType: 'application/vnd.ms-excel', buffer: XLS });
  await pg.waitForSelector('.mp256-kotak', { timeout: 180000 });
  const N0 = await pg.evaluate(() => window.__notif.map(n => n[0]).join(' | '));
  ok(/Data vendor WAVE diimpor/.test(N0) && /Master Data lama tidak diubah/.test(N0), 'impor lewat aplikasi (' + ((Date.now() - t0) / 1000).toFixed(1) + ' dtk): ' + N0.slice(0, 110));
  const A = await pg.evaluate(() => { const a = MP256_WV.analisis; return { total: a.total, cocok: a.cocok, bisa: a.bisa, hitam: a.hitam.map(x => x.nama), baru: a.baruWave }; });
  ok(A.total === 4 && A.cocok === 3, 'analisis: 4 vendor aplikasi (3 baku + 1 tambahan), ' + A.cocok + ' cocok dengan WAVE (BP / NPWP / nama)');
  if (!asli) ok(A.hitam.length === 1 && A.hitam[0] === 'Erda Indah' && /BLACKLIST/.test(await pg.textContent('#mp256Isi .alert-danger')), 'peringatan: vendor master berstatus BLACKLIST di WAVE (Erda Indah)');
  await pg.screenshot({ path: OUT + '/wave-analisis.png', fullPage: true });
  const baris = await pg.$$eval('#mdIsi > .card tbody tr', L => L.map(tr => [...tr.cells].map(c => c.textContent.trim())));
  ok(asli ? /WAVE/.test(baris[0][4]) && baris[2][2] === '-' : /0711 555 123|mhl@/.test(baris[0][2]) && /Palembang/.test(baris[0][3]) && /WAVE/.test(baris[0][4]) && baris[2][2] === '-' && /Bontang/.test(baris[1][3]), 'tabel Master Data: kolom KOSONG baku diisi dari WAVE (tampilan), kolom berisi & vendor tanpa WAVE tidak diubah');
  await pg.click('text=Simpan pelengkap ke Master Tambahan'); await pg.waitForFunction(() => window.__notif.some(n => /Master tambahan dilengkapi/.test(n[0])), null, { timeout: 15000 });
  const M = post({ action: 'bacaMasterTambahan', nama: 'Joko Supriyono', pin: '1234', proyek: P }).data.find(m => m.kode === 'CUST-V001');
  ok(M.nama === 'PT. HARMONY PILAR SENTOSA' && M.detail.pimpinan === 'Direktur Lama' && /75.786.280.0-612.000/.test(M.detail.npwp) && /Maspion/i.test(M.detail.alamat) && M.versi === 2, 'master tambahan: NPWP & alamat (kosong) dilengkapi, pimpinan/kode/nama lama TIDAK diganti');
  ok(await pg.evaluate(() => MASTER_VENDORS.some(v => v._mp256 && /BARU JAYA/.test(v.name)) && !MASTER_VENDORS.some(v => v._mp256 && /ERDA/i.test(v.name))) || asli, 'vendor WAVE yang belum ada ikut di daftar vendor aplikasi (sumber WAVE); Blacklist tidak ditambahkan');
  const pbj = await pg.evaluate(() => ({ baru: __PBJ_HOST.cariVendor('baru jaya'), erda: __PBJ_HOST.cariVendor('erda'), mitra: __PBJ_HOST.cariVendor('mitra') }));
  if (!asli) ok(pbj.baru[0] && /WAVE/.test(pbj.baru[0].sumber) && pbj.baru[0].npwp && /BLACKLIST/.test(pbj.erda[0].sumber) && pbj.mitra[0].email === 'mhl@contoh.co.id' && pbj.mitra[0].sumber === 'Baku · WAVE Rekanan Terseleksi Waskita', 'pencarian vendor PBJ: vendor WAVE baru, peringatan Blacklist, email/NPWP kosong dilengkapi');
  const pv = await pg.evaluate(() => profilVendor('2100003778', 'Mitra Hijau Lestari'));
  ok(/Palembang|Jl\./.test(pv.alamat || '') || asli, 'profil vendor untuk BA: alamat kosong diisi dari WAVE');
  await pg.fill('#mp256Q', asli ? 'mitra' : 'baru jaya'); await pg.waitForTimeout(300);
  ok((await pg.$$('#mp256Hasil tbody tr')).length >= 1, 'Cari di WAVE: hasil tampil');
  if (!asli) { await pg.click('#mp256Hasil button:has-text("+ Master")'); await pg.waitForTimeout(500);
    const B = post({ action: 'bacaMasterTambahan', nama: 'Joko Supriyono', pin: '1234', proyek: P }).data.find(m => m.kode === 'CUST-WV-20001');
    ok(B && B.detail.kodeSAP === '2100020001' && B.detail.npwp && B.detail.pimpinan === 'Rahmat', '"+ Master": vendor WAVE ditambahkan sebagai master tambahan CUST-WV-20001 (lengkap BP, NPWP, PIC)'); }
  await pg.screenshot({ path: OUT + '/wave-cari.png', fullPage: true });
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 || document.querySelector('#mp256Panel').getBoundingClientRect().right <= window.innerWidth + 1), 'tampilan ponsel tanpa geser horizontal pada panel');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
