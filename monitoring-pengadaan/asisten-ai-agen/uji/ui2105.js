// Uji UI 2.10.5 (watermark semua foto pojok kanan bawah, unggah latar belakang, PDF dokumentasi rapat) + 2.10.4 (watermark foto, dokumentasi penerimaan, keterangan vendor/pengambil, cetak Kartu Gudang A4) di Chromium: Monitoring_SAP.html (HTML_DASAR) + paket pembaruan (PAKET) disuntikkan + kernel Code.gs asli (KODE_GS) + modul (MODUL).
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs PAKET=pembaruan-2.10.5.json MODUL=server-modul-1.10.8.json node uji/ui2105.js [tangkapan]
//   PEMBANDING=pembaruan-2.10.2.json → ukur juga waktu callback pengamat DOM paket lama.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const { buatKonteks } = require('./harness.js');
const R = __dirname + '/..', OUT = process.argv[2] || R + '/tangkapan';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const JPG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6]).toString('base64');
const baca = f => JSON.parse(fs.readFileSync(f.startsWith('/') ? f : R + '/' + f, 'utf8'));

async function jalankan(berkasPaket, catat) {
  const PKT = baca(berkasPaket), modul = baca(process.env.MODUL || 'server-modul-1.10.9.json');
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
  const sj = foto('sj'), fA = [foto('A1'), foto('A2'), foto('A3'), foto('A4')], fB = [foto('B1'), foto('B2'), foto('B3'), null];
  r = ADM('gudangTerimaBon', { data: { bonNomor: BON, tanggal: '2026-10-03', noSJ: 'SJ-14', sjFile: sj, foto: [null, null, null, null], fotoItem: { 0: fA, 1: fB }, baris: [{ idx: 0, qty: 10 }, { idx: 1, qty: 5 }] } });
  assert.ok(r.ok, r.error);
  r = ADM('gudangKeluarSimpan', { data: { kunci: '1000000001', tanggal: '2026-10-04', qty: 3, untuk: 'Pembesian pile cap P12', penerima: 'Andi (Pelaksana Struktur)', foto: foto('gi'), ket: 'teks otomatis panjang yang tidak perlu tampil' } });
  assert.ok(r.ok, r.error);
  for (let d = 5; d <= 24; d++) for (let j = 0; j < 3; j++) { const q = ADM('gudangKeluarSimpan', { data: { kunci: '1000000002', tanggal: '2026-10-' + String(d).padStart(2, '0'), qty: 0.05, untuk: 'Pengecoran segmen ' + d + '-' + j, penerima: 'Mandor ' + String.fromCharCode(65 + j) + ' Lapangan Struktur Dermaga', foto: foto('gi' + d + j) } }); assert.ok(q.ok, q.error); }
  const login = ADM('login'); const X = { unggah: 0 };

  const HTML = fs.readFileSync(process.env.HTML_DASAR, 'utf8').replace(/<\/body>(?![\s\S]*<\/body>)/, () => `<style>${PKT.css}</style><script>window.itemCmdk = window.itemCmdk || (q => []); window.URL_MODE_LOKAL = 'MODE-LOKAL'; window.SERVER_BAWAAN = window.SERVER_BAWAAN || '';   /* Monitoring_SAP.html tanpa pemuat pembaruan: palet perintah v2.0 */</script><script>${PKT.js.replace(/<\/script/gi, '<\\/script')}</script></body>`);
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 1366, height: 900 } }), gal = [];
  pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.dismiss());
  await pg.route('**/*', async q => { const u = new URL(q.request().url());
    if (u.host === 'app.test') return q.fulfill({ body: u.pathname === '/' ? HTML : '', contentType: u.pathname === '/' ? 'text/html; charset=utf-8' : 'text/javascript' });
    if (u.host === 'srv.test') { try { const a = JSON.parse(q.request().postData() || '{}').action; if (a === 'gudangUnggahFoto') X.unggah++; } catch (e) { } const o = q.request().method() === 'POST' ? K.doPost({ postData: { contents: q.request().postData() } }) : vmGet(u); return q.fulfill({ body: typeof o === 'string' ? o : JSON.stringify(o), contentType: 'application/json' }); }
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
    // 3. keterangan Kartu Gudang
    await pg.evaluate(() => { bukaTab('gdkartu'); }); await pg.evaluate(() => window.mp223Muat(true));
    await pg.evaluate(() => { window.mp223K.kunci = '1000000001'; window.mp223K.bulan = 10; window.mp223K.tahun = 2026; window.mp223K.semua = false; window.mp223Render(); }); await pg.waitForTimeout(500);
    const ket = await pg.evaluate(() => [...document.querySelectorAll('#mp223KartuIsi table tbody tr')].map(tr => tr.lastElementChild.textContent.trim()).filter(k => k && k !== '-'));
    console.log('    keterangan: ' + JSON.stringify(ket));
    ok(ket.includes('Masuk - PT Baja Uji') && ket.includes('Keluar - Andi (Pelaksana Struktur)'), 'Kartu Gudang: Masuk = nama vendor, Keluar = nama pengambil');
    // 4. cetak A4: 1 material sedikit transaksi → 1 halaman (tanpa pemecah)
    await pg.evaluate(() => window.mp223KartuCetak()); await pg.waitForSelector('#mp224CvFrame'); await pg.waitForTimeout(1200);
    const c1 = await pg.evaluate(() => { const d = document.getElementById('mp224CvFrame').contentDocument; return { a4: !!d.getElementById('mp2103A4'), pg: d.querySelectorAll('.mp2103-pg').length, kls: d.body.className, thead: getComputedStyle(d.querySelector('.t thead')).display }; });
    ok(c1.a4 && c1.pg === 0 && /p[123]/.test(c1.kls) && c1.thead === 'table-header-group', 'cetak Kartu Gudang sedikit transaksi: 1 halaman A4 (mode padat ' + c1.kls + ')');
    await pg.screenshot({ path: OUT + '/gudang-2.10.4-cetak-1hal.png' });
    await pg.evaluate(() => window.mp224CetakTutup());
    // banyak transaksi → dipecah per halaman, header berulang, TTD utuh di halaman terakhir
    await pg.evaluate(() => { window.mp223K.kunci = '1000000002'; window.mp223K.semua = true; window.mp223Render(); window.mp223KartuCetak(); }); await pg.waitForSelector('#mp224CvFrame'); await pg.waitForTimeout(1500);
    const c2 = await pg.evaluate(() => { const d = document.getElementById('mp224CvFrame').contentDocument, T = [...d.querySelectorAll('table.t')], H = Math.floor(273 * 96 / 25.4);
      const y0 = (() => { let e = d.body.firstElementChild; while (e && /^(SCRIPT|STYLE)$/.test(e.tagName)) e = e.nextElementSibling; return e.getBoundingClientRect().top; })();
      const blok = d.querySelector('.ttdblok') || d.querySelector('.ttd'), bb = blok.getBoundingClientRect();
      return { n: T.length, thead: T.every(t => t.tHead && t.tHead.rows.length === 2), rows: T.map(t => t.tBodies[0].rows.length), cap: [...d.querySelectorAll('.mp2103-pg')].map(x => x.textContent),
        ttdUtuh: Math.floor((bb.top - y0) / H) === Math.floor((bb.bottom - y0 - 1) / H), tblUtuh: T.every(t => { const r = t.getBoundingClientRect(); return Math.floor((r.top - y0) / H) === Math.floor((r.bottom - y0 - 1) / H); }) }; });
    console.log('    cetak padat: ' + JSON.stringify(c2));
    ok(c2.n >= 2 && c2.thead && c2.cap.some(x => /Hal\. 2 \//.test(x)), 'cetak banyak transaksi: ' + c2.n + ' halaman, header tabel berulang di tiap halaman');
    ok(c2.tblUtuh && c2.ttdUtuh, 'tiap potongan tabel muat 1 halaman A4 dan blok tanda tangan tidak terpotong');
    await pg.screenshot({ path: OUT + '/gudang-2.10.4-cetak-multi.png' });
    await pg.evaluate(() => window.mp224CetakTutup());
    // 1. watermark SEMUA foto (paralel, berbagai jenis) di pojok kanan bawah
    const wm = await pg.evaluate(async () => {
      const buat = w => { const c = document.createElement('canvas'); c.width = w; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#7fbf7f'; g.fillRect(0, 0, w, 600); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; };
      let inp = document.getElementById('mp223KTgl'); if (!inp) { inp = document.createElement('input'); inp.id = 'mp223KTgl'; inp.type = 'date'; inp.hidden = true; document.body.appendChild(inp); } inp.value = '2026-10-04';
      const J = [['FOTO-GR', 'SJ · utama · Tampak Depan'], ['FOTO-GR', 'SJ · utama · Tampak Belakang'], ['FOTO-GR-ITEM', 'SJ · item 0 · Tampak Depan'], ['FOTO-GR-ITEM', 'SJ · item 0 · Samping Kiri'], ['FOTO-GR-ITEM', 'SJ · item 1 · Tampak Depan'], ['FOTO-GI', 'serah terima']];
      const R = await Promise.all(J.map((j, i) => window.regAksi('gudangUnggahFoto', { berkas: { id: 'wm' + i, data: buat(i % 2 ? 2000 : 800), nama: 'x.jpg', jenis: j[0], ket: j[1] } })));
      const out = [];
      for (const r of R) { const b = await window.regAksi('ambilBerkas', { id: r.data.idServer });
        const im = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/jpeg;base64,' + b.data; });
        const k = document.createElement('canvas'); k.width = im.width; k.height = im.height; const h = k.getContext('2d'); h.drawImage(im, 0, 0); const px = (x, y) => h.getImageData(x, y, 1, 1).data[1];
        out.push({ w: im.width, kb: Math.round(b.data.length * 0.75 / 1024), kanan: (() => { const p = Math.round(Math.max(12, Math.round(Math.min(im.width, im.height) / 30)) * 0.6); return px(im.width - p - 3, im.height - p - 3); })(), kiri: px(8, im.height - 8), atas: px(im.width / 2, 20), ket: r.data.ket, jam: (/ (\d\d\.\d\d) WIB/.exec(r.data.ket) || [])[1] }); }
      return out;
    });
    console.log('    watermark: ' + JSON.stringify(wm.map(x => ({ w: x.w, kb: x.kb, kanan: x.kanan, kiri: x.kiri, jam: x.jam }))));
    ok(wm.length === 6 && wm.every(x => x.kanan < x.atas - 40 && x.kiri > x.atas - 15), 'watermark di pojok kanan bawah pada SEMUA 6 foto (unggah paralel, 3 jenis)');
    ok(wm.every(x => x.ket.includes('No.1 Jalan Sulawesi Ujung, Kecamatan Koja, Jakarta Utara, Daerah Khusus Ibukota Jakarta, WASKITA-NINDYA KSO') && /\d\d\/\d\d\/2026 \d\d\.\d\d WIB/.test(x.ket)), 'metadata tanggal, jam & alamat baku di setiap foto');
    const mnt = j => +j.slice(0, 2) * 60 + +j.slice(3);
    ok(wm.every(x => mnt(x.jam) >= 480 && mnt(x.jam) <= 1020) && new Set([wm[0].jam, wm[2].jam, wm[4].jam]).size === 3, 'jam acak dalam jam kerja, berbeda per material (' + wm.map(x => x.jam).join(', ') + ')');
    ok(wm.every(x => x.w <= 1280) && wm[1].w === 1280, 'foto dikompres di klien: maks. 1280 px (' + wm.map(x => x.kb + ' KB').join(', ') + ')');
    // 3. unggah latar belakang: pilih foto di slot per material → Simpan tidak mengunggah ulang
    await pg.evaluate(() => { window.MP223F.bon = window.MP223F.bon || ''; });
    const pra = await pg.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 700; c.getContext('2d').fillStyle = '#c33'; c.getContext('2d').fillRect(0, 0, 900, 700);
      const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9)), dt = new DataTransfer(); dt.items.add(new File([blob], 'p.jpg', { type: 'image/jpeg' }));
      const inp = document.createElement('input'); inp.type = 'file'; inp.dataset.k = '0'; inp.dataset.i = '1'; inp.dataset.j = 'bon'; inp.files = dt.files;
      await window.mp2100Foto(inp);
      const d = window.MP2100.FI.bon['0'][1].split(',')[1]; for (let n = 0; n < 60 && !(window.mp2103Pra.get(d) && window.mp2103Pra.get(d).ok); n++) { const c2 = window.mp2103Pra.get(d); if (c2) c2.p.then(() => { c2.ok = 1; }); await new Promise(r => setTimeout(r, 100)); }
      const t0 = performance.now(), out = await window.MP2100.FI.unggah('gudangTerimaBon', { noSJ: 'SJ-X' });
      return { ada: !!window.mp2103Pra.get(d), id: out['0'] && out['0'][1] && out['0'][1].idServer, ms: Math.round(performance.now() - t0) };
    });
    const nUnggah = X.unggah;
    ok(pra.ada && pra.id, 'foto per material diunggah di latar belakang saat dipilih');
    await pg.evaluate(async () => { await window.MP2100.FI.unggah('gudangTerimaBon', { noSJ: 'SJ-X' }); });
    ok(X.unggah === nUnggah, 'Simpan memakai hasil unggah latar belakang — tidak ada unggah ulang (' + pra.ms + ' ms)');
    // 2. dokumentasi PDF: judul tidak sendirian, baris foto utuh, mengalir antar halaman
    await pg.evaluate(() => { bukaTab('gdmasuk'); window.MP223F.bulan = '2026-10'; window.MP223F.bon = ''; window.mp223Render(); }); await pg.waitForTimeout(600);
    ok(await pg.$$eval('#tab-gdmasuk .mp2103-dok', x => x.length) === 1, 'tombol "Dokumentasi" di daftar kiriman');
    await pg.click('#tab-gdmasuk .mp2103-dok'); await pg.waitForSelector('#mp224CvFrame', { timeout: 20000 }); await pg.waitForTimeout(1500);
    const dk = await pg.evaluate(() => { const d = document.getElementById('mp224CvFrame').contentDocument, H = 273 * 96 / 25.4;
      const y0 = d.querySelector('.kop').getBoundingClientRect().top, R = [...d.querySelectorAll('table.g tr')].map(tr => { const r = tr.getBoundingClientRect(); return { a: r.top - y0, b: r.bottom - y0 }; });
      // pemotongan halaman = aturan mp224CetakPdf (titik potong di akhir baris/tabel; .ttd & .kop utuh)
      const putus = [...d.querySelectorAll('tr, h1, .kop, table, .cat, .ft, p, li, .ttd')].map(e => e.getBoundingClientRect().bottom - y0).sort((a, b) => a - b), tt = d.querySelector('.ttd').getBoundingClientRect();
      let y = 0, hal = []; const Ht = d.body.scrollHeight; while (y < Ht - 40 && hal.length < 20) { let z = Math.min(Ht, y + H); const c = putus.filter(v => v > y + 60 && v <= z); if (z < Ht && c.length) z = c[c.length - 1]; if ((tt.top - y0) > y + 60 && (tt.top - y0) < z && (tt.bottom - y0) > z) z = tt.top - y0; hal.push([y, z]); y = z; }
      const isi = hal.map(([a, b]) => R.filter(r => r.a >= a - 1 && r.b <= b + 1).length);
      return { n: d.querySelectorAll('table.g .sel').length, lbl: [...d.querySelectorAll('.lbl b')].map(x => x.textContent), hal: hal.length, isi, utuh: R.every(r => hal.some(([a, b]) => r.a >= a - 1 && r.b <= b + 1)), t: d.body.innerText }; });
    console.log('    dokumentasi: ' + dk.n + ' foto · ' + dk.hal + ' halaman · baris foto per halaman ' + JSON.stringify(dk.isi));
    ok(dk.n === 7 && dk.lbl.filter(x => x === 'Besi D13').length === 4 && dk.lbl.filter(x => x === 'Semen PCC 50 kg').length === 3, 'dokumentasi: 7 foto, label nama material sesuai PO di bawah tiap foto');
    ok(dk.isi[0] >= 2 && dk.utuh && dk.isi.every(n => n > 0), 'halaman 1 = judul + 2 baris foto (judul tidak sendirian); tiap baris foto utuh, mengalir ' + dk.hal + ' halaman');
    ok(/DOKUMENTASI PENERIMAAN MATERIAL/.test(dk.t) && dk.t.includes('001/BAPM/WK-NK.KSO/X/2026') && dk.t.includes('PT Baja Uji') && dk.t.includes('210/SPM/'), 'dokumentasi memuat No. BAPM, SPM/PO & vendor (lampiran tagihan)');
    await pg.screenshot({ path: OUT + '/gudang-2.10.5-dokumentasi.png' });
  }
  await br.close();
  return hasil;
}
(async () => {
  console.log('Paket baru: ' + (process.env.PAKET || 'pembaruan-2.10.5.json'));
  const B = await jalankan(process.env.PAKET || 'pembaruan-2.10.5.json', true);
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
