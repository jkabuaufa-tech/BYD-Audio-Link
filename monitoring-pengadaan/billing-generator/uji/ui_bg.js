// Uji UI Billing Generator 2.0.0 di Chromium: aplikasi dari folder ini (asal https://bg.test) terhubung lintas-origin ke server
// Monitoring SAP tiruan (https://srv.test/exec = kernel Code.gs 2.5.1 asli + modul 1.10.0 lewat harness), mekanisme fetch sama dengan
// Monitoring SAP (POST teks tanpa preflight, CORS "*" seperti Apps Script). Login, buat paket dari kontrak Register, PDF → Drive,
// akun Lihat, antrean offline (IndexedDB) & kirim ulang idempoten, mode lokal lama tetap jalan.
//   KODE_GS=…/Code.gs NODE_PATH=<playwright> node uji/ui_bg.js [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const D = path.join(__dirname, '..'), T = path.join(D, '..', 'tagihan', 'uji'), R = path.join(D, '..', 'asisten-ai-agen');
const { buatKonteks } = require(R + '/uji/harness.js');
const OUT = process.argv[2] || '';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id; require(T + '/drive_biner.js')(C, K, P);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const kirim = (n, p) => (a, x) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action: a, nama: n, pin: p, proyek: P }, x || {})) } }));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.0.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji billing generator 2.0.0' }).ok);
const NO = '091/SPKP/WK-NK.KSO/PDBJ/1726012/2026';
const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPKP', namaVendor: 'CV Mirsel', idVendor: '2100007777', tglKontrak: '2026-05-04', tglSelesai: '2026-12-31', noPR: '1000170001', noRFQ: '2100200001', noPO: '4100076091', top: '30 hari',
  items: [{ kode: '39000010', uraian: 'Pekerjaan bekisting dermaga', vol: 1200, sat: 'M2', harga: 185000, wbs: 'C-01' }, { kode: '39000011', uraian: 'Pembesian D16', vol: 48000, sat: 'Kg', harga: 4200, wbs: 'C-01' }] } });
assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
const bk = STF('saveProgres', { data: { noKontrak: NO, periode: 'September 2026', periodeKey: 202608, tanggal: '2026-09-30', tagihanKe: 1, kodeBA: 'BAPP', items: { [NO + '#0']: 400, [NO + '#1']: 12000 }, nilai: 400 * 185000 + 12000 * 4200 } }).data;
assert.ok(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: { kategori: 'SUBKON', retensiPersen: 5, ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: true }, pph: { jenis: 'PPh 4(2)', tarif: 1.75 } } } }).ok);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }), ctx = await br.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const pg = await ctx.newPage(), gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Uji perubahan status paket' : undefined));
  let putuskan = false, preflight = 0, mati = false;
  await ctx.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.host === 'bg.test') { const f = path.join(D, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname)); return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); }
    if (u.host === 'srv.test') {
      if (mati) return r.abort('internetdisconnected');
      if (q.method() === 'OPTIONS') { preflight++; return r.fulfill({ status: 405, body: '' }); }
      if (putuskan) { const out = K.doPost({ postData: { contents: q.postData() } }); putuskan = false; return r.fulfill({ status: 200, body: '<!DOCTYPE html><html><body>Google: layanan sementara tidak tersedia</body></html>', contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' } }); }   // skrip SUDAH berjalan, jawaban hilang
      return r.fulfill({ body: K.doPost({ postData: { contents: q.postData() } }), contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    return r.fulfill({ status: 204, body: '' });
  });
  await pg.goto('https://bg.test/index.html'); await pg.waitForSelector('#blPanel form');
  ok(await pg.evaluate(() => typeof openCreate === 'function' && typeof BLI === 'object' && typeof BLRP === 'object' && !!document.getElementById('docGrid')), 'Billing Generator 2.0.0 termuat: mode lokal lama + pustaka tagihan + panel terhubung');
  await pg.fill('#blUrl', 'https://srv.test/exec'); await pg.fill('#blNama', 'Staf Pengadaan'); await pg.fill('#blSandi', 'salah'); await pg.fill('#blProyek', P);
  await pg.click('#blPanel button.btn-primary'); await pg.waitForSelector('#blPanel .bl-galat');
  ok(/salah/.test(await pg.textContent('#blPanel .bl-galat')), 'kata sandi salah ditolak server');
  await pg.fill('#blSandi', '1111'); await pg.click('#blPanel button.btn-primary'); await pg.waitForSelector('#blPanel .bl-kpi');
  ok(/Staf Pengadaan \(PENGADAAN\)/.test(await pg.textContent('#blPanel')) && preflight === 0, 'masuk dengan akun Monitoring SAP (lintas origin, tanpa preflight CORS)');
  ok(await pg.evaluate(() => !localStorage.getItem('JICT_BG_KONEKSI').includes('1111') && sessionStorage.getItem('JICT_BG_SANDI') === '1111'), 'kata sandi tidak disimpan permanen (hanya sessionStorage)');
  await pg.click('text=+ Paket dari kontrak Register'); await pg.waitForSelector('.bl-kartu select');
  await pg.selectOption('.bl-kartu select', NO); await pg.waitForSelector('#blBuatBK');
  await pg.click('text=Buat paket'); await pg.waitForFunction(() => blKeadaan().paket && !blKeadaan().sibuk);
  const ps = await pg.evaluate(() => { const S = blKeadaan(); return { id: S.paket.id, ini: S.paket.hasil.prestasi.ini, dasar: S.paket.hasil.dasarTagihan, n: S.daftar.length }; });
  ok(ps.ini === 400 * 185000 + 12000 * 4200 && ps.dasar === Math.round(ps.ini * 0.95) && ps.n === 1, 'paket dibuat dari kontrak Register & BK: prestasi Rp ' + ps.ini.toLocaleString('id-ID') + ', retensi 5%');
  if (OUT) await pg.screenshot({ path: OUT + '/billing-generator-terhubung.png', fullPage: false });
  await pg.click('text=Pratinjau semua'); await pg.waitForSelector('#blFrame'); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => document.getElementById('blFrame').contentDocument.querySelectorAll('.kertas').length) === 7, 'pratinjau 7 dokumen Subkon di jendela cetak');
  await pg.evaluate(() => closePrint());
  await pg.evaluate(() => blStatus('DALAM PENYUSUNAN')); await pg.waitForFunction(() => blKeadaan().paket.status === 'DALAM PENYUSUNAN');
  await pg.click('text=Buat PDF & kirim ke Drive'); await pg.waitForFunction(() => !blKeadaan().sibuk && (blKeadaan().paket.dokumen || []).length >= 8, null, { timeout: 120000 });
  const dk = await pg.evaluate(() => blKeadaan().paket.dokumen.map(d => d.kode + ':' + d.status));
  ok(dk.length === 8 && dk.includes('BAPP:MENUNGGU_TTD') && dk.includes('BUNDEL:DRAFT'), 'Buat PDF: 7 PDF + bundel (pdf-lib lokal) diunggah bertahap ke Drive & tertaut');
  ok(Object.values(C.__files).filter(f => /BUNDEL/.test(f.nama) && f.data.startsWith('%PDF-')).length === 1, 'bundel PDF tersimpan di folder Drive proyek');

  console.log('Ketahanan koneksi');
  putuskan = true;   // jawaban Google terputus SETELAH skrip berjalan → kirim ulang dengan kunci idempotensi yang sama
  await pg.evaluate(() => blStatus('MENUNGGU DOKUMEN')); await pg.waitForFunction(() => blKeadaan().paket.status === 'MENUNGGU DOKUMEN', null, { timeout: 20000 });
  const rw = STF('blBaca', { id: ps.id }).riwayat.filter(r => r.aksi === 'STATUS MENUNGGU DOKUMEN');
  ok(rw.length === 1, 'jawaban terputus setelah tersimpan → kirim ulang aman, perubahan tercatat tepat 1 kali');
  mati = true; await ctx.setOffline(true); await pg.evaluate(() => window.dispatchEvent(new Event('offline')));
  await pg.evaluate(() => blUbah('ttdNama', 'Andi Mirsel')); await pg.waitForFunction(() => blKeadaan().antrean === 1, null, { timeout: 30000 });
  ok(true, 'offline: perubahan penandatangan masuk antrean IndexedDB');
  await pg.evaluate(() => blMuat()); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => blKeadaan().dariCache === true && blKeadaan().daftar.length === 1), 'offline: daftar paket tampil dari salinan perangkat');
  mati = false; await ctx.setOffline(false); await pg.evaluate(() => window.dispatchEvent(new Event('online'))); await pg.waitForFunction(() => blKeadaan().antrean === 0, null, { timeout: 20000 });
  ok(STF('blBaca', { id: ps.id }).data.vendor.ttdNama === 'Andi Mirsel', 'online kembali: antrean terkirim otomatis & tersimpan di server');
  ok(gal.length === 0, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));

  console.log('Akun Lihat & mode lokal');
  await pg.evaluate(() => blKeluar()); await pg.fill('#blNama', 'Kepala Proyek'); await pg.fill('#blSandi', '0000'); await pg.click('#blPanel button.btn-primary'); await pg.waitForSelector('#blPanel .bl-kpi');
  await pg.evaluate(id => blBuka(id), ps.id); await pg.waitForFunction(() => blKeadaan().paket && !blKeadaan().sibuk);
  ok(!(await pg.$('text=+ Paket dari kontrak Register')) && !(await pg.$('text=Buat PDF & kirim ke Drive')) && /Baca saja/.test(await pg.textContent('#blPanel')), 'akun Lihat: tanpa tombol ubah / buat PDF');
  await pg.evaluate(async () => { openCreate(); document.getElementById('docVendor').value = 'Vendor Lokal'; document.getElementById('docContractDate').value = '2026-10-01'; addItemRow(); });
  await pg.evaluate(() => { const r = document.querySelector('#itemBody tr'); r.querySelector('.it-desc, input[data-ac="item"], td:nth-child(3) input').value = 'Item uji'; });
  await pg.click('#docForm button[type=submit]'); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => documents.some(d => d.vendor === 'Vendor Lokal')), 'mode lokal lama: dokumen baru tetap tersimpan di IndexedDB JICT_Priuk_DB');
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji Billing Generator 2.0.0');
})().catch(e => { console.error(e); process.exit(1); });
