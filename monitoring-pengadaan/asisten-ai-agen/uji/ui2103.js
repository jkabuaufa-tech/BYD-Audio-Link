// Uji UI 2.10.3 di Chromium: Monitoring_SAP.html (HTML_DASAR) + paket pembaruan (PAKET) disuntikkan + kernel Code.gs asli (KODE_GS) + modul (MODUL).
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs PAKET=pembaruan-2.10.3.json MODUL=server-modul-1.10.8.json node uji/ui2103.js [tangkapan]
//   PEMBANDING=pembaruan-2.10.2.json → ukur juga waktu callback pengamat DOM paket lama.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const { buatKonteks } = require('./harness.js');
const R = __dirname + '/..', OUT = process.argv[2] || R + '/tangkapan';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const JPG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6]).toString('base64');
const baca = f => JSON.parse(fs.readFileSync(f.startsWith('/') ? f : R + '/' + f, 'utf8'));

async function jalankan(berkasPaket, catat) {
  const PKT = baca(berkasPaket), modul = baca(process.env.MODUL || 'server-modul-1.10.8.json');
  const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
  require(R + '/../tagihan/uji/drive_biner.js')(C, K, P);
  const gf = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { const f = gf(id), b = C.__files[id]; if (b && /^GUDANG/.test(b.nama)) f.getMimeType = () => 'image/jpeg'; return f; };
  K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
  K.tulisProyek_([K.PROYEK_AWAL]);
  const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
  const ADM = (a, x) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  assert.ok(ADM('modulUnggah', { data: modul }).ok); { const t = ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji antarmuka gudang 2.10.3' }); assert.ok(t.ok, t.error); }
  const foto = ket => { const r = ADM('gudangUnggahFoto', { berkas: { id: 'f' + Math.random(), data: JPG, nama: 'f.jpg', jenis: 'FOTO-GR-ITEM', ket } }); assert.ok(r.ok, r.error); return r.data; };
  // kontrak SPM + bon 14 + BK BAPM
  const NO = '210/SPM/WK-NK.KSO/PDBJ/1726012/2026';
  let r = ADM('savePermintaan', { data: { noUrut: 14, tahun: 2026, tanggal: '2026-10-01', departemen: 'Logistik', peminta: 'Budi', keperluan: 'uji', items: [
    { kode: '1000000001', uraian: 'Besi D13', sat: 'BTG', vol: 100, harga: 90000 }, { kode: '1000000002', uraian: 'Semen PCC 50 kg', sat: 'ZAK', vol: 50, harga: 65000 }] } });
  assert.ok(r.ok, r.error); const BON = r.data.nomor;
  r = ADM('save', { data: { noKontrak: NO, jenisKontrak: 'SPM', namaVendor: 'PT Baja Uji', idVendor: '2100000001', tglKontrak: '2026-09-30', tglSelesai: '2026-12-31', items: [
    { kode: '1000000001', uraian: 'Besi D13', vol: 100, sat: 'BTG', harga: 90000, noPermintaan: BON, wbs: 'C-1' }, { kode: '1000000002', uraian: 'Semen PCC 50 kg', vol: 50, sat: 'ZAK', harga: 65000, noPermintaan: BON, wbs: 'C-1' }] } });
  assert.ok(r.ok, r.error);
  K.tulisKoleksi_(P, 'progres', [{ id: 'BK-UJI', noKontrak: NO, nomorBA: '001/BAPM/WK-NK.KSO/X/2026', tanggal: '2026-10-01', tanggalBA: '2026-10-05', tagihanKe: 1, baTerbit: true, versi: 1, items: {}, nilai: 0 }]);
  const sj = foto('sj'), fA = [foto('A1'), foto('A2'), null, null], fB = [null, null, foto('B3'), null];
  r = ADM('gudangTerimaBon', { data: { bonNomor: BON, tanggal: '2026-10-03', noSJ: 'SJ-14', sjFile: sj, foto: [null, null, null, null], fotoItem: { 0: fA, 1: fB }, baris: [{ idx: 0, qty: 10 }, { idx: 1, qty: 5 }] } });
  assert.ok(r.ok, r.error);
  r = ADM('gudangKeluarSimpan', { data: { kunci: '1000000001', tanggal: '2026-10-04', qty: 3, untuk: 'Pembesian pile cap P12', penerima: 'Andi (Pelaksana Struktur)', foto: foto('gi'), ket: 'teks otomatis panjang yang tidak perlu tampil' } });
  assert.ok(r.ok, r.error);
  const login = ADM('login');

  const HTML = fs.readFileSync(process.env.HTML_DASAR, 'utf8').replace(/<\/body>(?![\s\S]*<\/body>)/, () => `<style>${PKT.css}</style><script>window.itemCmdk = window.itemCmdk || (q => []); window.URL_MODE_LOKAL = 'MODE-LOKAL'; window.SERVER_BAWAAN = window.SERVER_BAWAAN || '';   /* Monitoring_SAP.html tanpa pemuat pembaruan: palet perintah v2.0 */</script><script>${PKT.js.replace(/<\/script/gi, '<\\/script')}</script></body>`);
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 1366, height: 900 } }), gal = [];
  pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.dismiss());
  await pg.route('**/*', async q => { const u = new URL(q.request().url());
    if (u.host === 'app.test') return q.fulfill({ body: u.pathname === '/' ? HTML : '', contentType: u.pathname === '/' ? 'text/html; charset=utf-8' : 'text/javascript' });
    if (u.host === 'srv.test') { const o = q.request().method() === 'POST' ? K.doPost({ postData: { contents: q.request().postData() } }) : vmGet(u); return q.fulfill({ body: typeof o === 'string' ? o : JSON.stringify(o), contentType: 'application/json' }); }
    return q.fulfill({ body: '', status: 204 }); });
  const vmGet = u => require('vm').runInContext('doGet', C)({ parameter: Object.fromEntries(u.searchParams) });
  const sesi = { nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', proyek: P, admin: true, cfg: login.proyek || { id: P } };
  await pg.addInitScript(s => { try { if (!sessionStorage.getItem('uji')) { sessionStorage.setItem('uji', 1); localStorage.setItem('JICT_REG_URL', 'https://srv.test/exec'); localStorage.setItem('JICT_REG_SESI', JSON.stringify(s)); } } catch (e) { } }, sesi);
  await pg.addInitScript(() => { window.__moMs = 0; window.__moN = 0; const A = window.MutationObserver;
    window.MutationObserver = function (cb) { return new A(function () { const t = performance.now(); try { return cb.apply(this, arguments); } finally { window.__moMs += performance.now() - t; window.__moN++; } }); }; });
  await pg.goto('https://app.test/', { timeout: 120000 });
  await pg.waitForFunction(() => typeof REG !== 'undefined' && REG.sesi && window.__MP2100__ && typeof window.mp223Muat === 'function', null, { timeout: 90000 });
  await pg.waitForTimeout(2500);
  const hasil = { gal };
  // beban pengamat DOM: buka-tutup tab berulang
  await pg.evaluate(() => { window.__moMs = 0; window.__moN = 0; });
  const t0 = Date.now();
  for (let i = 0; i < 6; i++) for (const t of ['gdmasuk', 'gdkartu', 'register', 'form-progres']) { await pg.evaluate(t => bukaTab(t), t); await pg.waitForTimeout(150); }
  await pg.waitForTimeout(600);
  Object.assign(hasil, await pg.evaluate(() => ({ moMs: Math.round(window.__moMs), moN: window.__moN })), { tabMs: Date.now() - t0 });
  if (catat) {
    await pg.evaluate(() => { bukaTab('gdmasuk'); }); await pg.evaluate(() => window.mp223Muat(true)); await pg.evaluate(() => { window.MP223F.bulan = '2026-10'; window.MP223F.bon = ''; window.mp223Render && window.mp223Render(); }); await pg.waitForTimeout(800);
    const isi = await pg.evaluate(() => { const el = document.getElementById('tab-gdmasuk'); const b = el.querySelector('.mp223-fpi'); return { ada: !!b, baris: b ? [...b.querySelectorAll('.mp223-fpi-r')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) : [], chips: b ? [...b.querySelectorAll('.mp223-fpi-r')].map(x => x.querySelectorAll('button.mp223-fc').length) : [] }; });
    ok(isi.ada && isi.baris.length === 2 && isi.chips[0] === 2 && isi.chips[1] === 1, 'daftar kiriman bon 14: foto tampil per item (Besi D13: 2 foto · Semen: 1 foto) — ' + JSON.stringify(isi.baris));
    await pg.screenshot({ path: OUT + '/gudang-2.10.3-foto-per-item.png' });
    const klik = await pg.evaluate(() => { const b = [...document.querySelectorAll('#tab-gdmasuk .mp223-fpi-r')][1].querySelector('button.mp223-fc'); const on = b.getAttribute('onclick'); return on; });
    ok(/mp223LihatMasuk\("GR[^"]*-2",2\)/.test(klik.replace(/&quot;/g, '"')), 'tombol foto item ke-2 membuka foto milik baris GR item ke-2 (Samping Kanan)');
    await pg.evaluate(() => { window.mp223K.kunci = '1000000001'; window.mp223K.bulan = 10; window.mp223K.tahun = 2026; bukaTab('gdkartu'); }); await pg.waitForTimeout(500);
    await pg.evaluate(() => { window.mp223K.kunci = '1000000001'; window.mp223K.bulan = 10; window.mp223K.tahun = 2026; window.mp223Render(); }); await pg.waitForTimeout(500);
    const ket = await pg.evaluate(() => [...document.querySelectorAll('#mp223KartuIsi table tbody tr')].map(tr => tr.lastElementChild.textContent.trim()).filter(Boolean));
    ok(ket.some(k => k === 'Masuk - BAPM: 001/BAPM/WK-NK.KSO/X/2026 | SPM: 210/SPM/WK-NK.KSO/PDBJ/1726012/2026'), 'Kartu Gudang GR: "Masuk - BAPM: … | SPM: …"');
    ok(ket.some(k => k === 'Keluar - Diambil oleh: Andi (Pelaksana Struktur) | Untuk keperluan: Pembesian pile cap P12'), 'Kartu Gudang GI: "Keluar - Diambil oleh: … | Untuk keperluan: …"');
    ok(!ket.some(k => /SJ-14|teks otomatis|GR |GI /.test(k)), 'teks otomatis panjang/redundan (SJ, catatan) tidak lagi tampil');
    await pg.screenshot({ path: OUT + '/gudang-2.10.3-kartu.png' });
    const xl = await pg.evaluate(() => typeof window.mp223KartuExcel === 'function');
    ok(xl, 'ekspor Excel Kartu Gudang tetap tersedia (memakai keterangan yang sama)');
    console.log('    keterangan Kartu Gudang: ' + JSON.stringify(ket.filter(k => k !== '-')));
  }
  await br.close();
  return hasil;
}
(async () => {
  console.log('Paket baru: ' + (process.env.PAKET || 'pembaruan-2.10.3.json'));
  const B = await jalankan(process.env.PAKET || 'pembaruan-2.10.3.json', true);
  console.log('  pengamat DOM: ' + B.moN + ' panggilan, ' + B.moMs + ' ms · 24 buka tab ' + B.tabMs + ' ms');
  if (process.env.PEMBANDING) {
    const L = await jalankan(process.env.PEMBANDING, false);
    console.log('  pembanding ' + process.env.PEMBANDING + ': pengamat DOM ' + L.moN + ' panggilan, ' + L.moMs + ' ms · 24 buka tab ' + L.tabMs + ' ms');
    const baru = [...new Set(B.gal)].filter(m => !L.gal.includes(m));
    ok(!baru.length, 'tanpa galat JavaScript baru dibanding 2.10.2' + (baru.length ? ': ' + baru.join(' | ') : '') + (L.gal.length ? ' (galat bawaan HTML dasar tanpa pemuat, sama di kedua paket: ' + [...new Set(L.gal)].length + ')' : ''));
    ok(B.moN * 3 < L.moN, 'panggilan pengamat DOM turun > 3× (' + L.moN + ' → ' + B.moN + ')');
  }
  console.log(lulus + ' cek lulus');
})().catch(e => { console.error(e); process.exit(1); });
