// Uji 2.10.29 di Chromium (blok MP292–MP296, MP2104, MP21028, MP21024 dari paket; tanpa HTML dasar / kernel):
// kop resmi PT. Waskita Karya (Persero) Tbk pada SPM & dokumen lain, nama proyek JIAT, alamat lengkap & pemberi tugas di SPM,
// kunci vendor arsip lintas proyek (potongan MP220), Excel format baku. Server: uji/uji_vendor_global.js.
// Pakai: node uji/ui21029.js [paket.json] [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), assert = require('assert'), { execFileSync } = require('child_process');
const PK = process.argv[2] || path.join(__dirname, '..', 'pembaruan-2.10.29.json'), OUT = process.argv[3] || os.tmpdir();   // tangkapan resmi dibuat uji/ui21030.js
const JS = JSON.parse(fs.readFileSync(PK, 'utf8')).js, blok = (a, z) => { const i = JS.indexOf(a), j = JS.indexOf(z, i + 10); assert.ok(i >= 0 && j > i, 'blok ' + a); return JS.slice(i, j); };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const D = { no: '012/SPM/WK/DIV.II/INF2/1726029/2026', jenis: 'SPM', vendor: 'PT Cahaya Utama Safety Indonesia', idVendor: '1000555', tgl: '2026-11-16', selesai: '2026-12-15', top: '45 hari', items: [{ uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC', vol: 1, harga: 4850000 }, { uraian: 'Lampu Sorot LED 1000W COB', sat: 'PC', vol: 1, harga: 8450000 }, { uraian: 'Helm Delta Putih+Tali Dagu 3M', sat: 'PC', vol: 14, harga: 325000 }] };
const ALAMAT = 'Gedung Waskita Rajawali Tower, Jl. M.T. Haryono Kav. No.12-13 Bidaracina, Jatinegara-Jakarta Timur 13330';
(async () => {
  console.log('1. Kunci vendor arsip lintas proyek (potongan blok MP220)');
  const a0 = JS.indexOf('  const gvN = n =>'), a1 = JS.indexOf('\n', JS.indexOf('  const kunciArsip = d =>', a0)); assert.ok(a0 > 0 && a1 > a0);
  const ctx = { S: { arsip: [], arsipKunci: 'k' }, K: [], normNama: s => String(s || '').toLowerCase().replace(/\b(pt|cv|ud|tbk)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim(), getVendorList: () => [{ id: '1000777', name: 'CV Tirta Bor Lampung' }] };
  ctx.semuaK = () => ctx.K; vm.createContext(ctx); vm.runInContext(JS.slice(a0, a1) + '\nthis.kunciVendor = kunciVendor; this.kunciArsip = kunciArsip;', ctx);
  // arsip diunggah di proyek A dengan kode SAP; proyek B mencatat kontrak vendor yang sama tanpa kode & ejaan lain
  ctx.S.arsip = ['KTP', 'NPWP', 'SIUP', 'NIB'].map(j => ({ kodeVendor: '1000555', namaVendor: 'PT Cahaya Utama Safety Indonesia', jenis: j, status: 'AKTIF' })).concat([{ kodeVendor: 'N:tirta bor lampung', namaVendor: 'CV. Tirta Bor Lampung', jenis: 'KTP', status: 'AKTIF' }]);
  ctx.K = [{ idVendor: '', vendor: 'Cahaya Utama Safety Indonesia, PT', key: '003/SPM' }];
  const kB = ctx.kunciVendor('', 'Cahaya Utama Safety Indonesia, PT');
  ok(kB === '1000555' && ctx.S.arsip.filter(d => ctx.kunciArsip(d) === kB).length === 4, 'kontrak proyek lain tanpa kode + ejaan "…, PT" → kunci 1000555 → 4 dokumen arsip terbaca (sebelumnya kunci "N:…" → 0/11)');
  ok(ctx.kunciArsip(ctx.S.arsip[4]) === '1000777' && ctx.kunciVendor('1000777', 'CV Tirta Bor Lampung') === '1000777', 'arsip yang dulu disimpan dengan kunci nama ("N:…") menaut ke kode vendor dari Master Data');
  ok(ctx.kunciVendor('', 'PT Vendor Baru Sekali') === 'N:vendor baru sekali' && ctx.kunciVendor('9', 'PT Vendor Baru Sekali') === '9', 'vendor tanpa tautan: perilaku lama (kode, atau N:nama)');

  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 900, height: 1250 }, deviceScaleFactor: 2 }), gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', q => q.fulfill({ body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>', contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    window.PROYEK = { id: '1726029', nama: 'JIAT', kso: 'PT Waskita Karya (Persero) Tbk' };
    window.REG = { url: 'x', data: [], sesi: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', proyek: '1726029', hp: '0812-0000-0000', cfg: { id: '1726029', nama: 'JIAT', namaLengkap: 'Proyek lama yang belum diganti', kapro: 'Ir. Budi Santoso, M.T.' } } };
    window.__idt = { bentuk: 'TUNGGAL', nama: 'PT Waskita Karya (Persero) Tbk', npwp: '01.001.614.5-093.000', alamat: '', asal: 'server' };
    window.mp224Identitas = () => window.__idt; window.notif = () => { };
    window.__mt = [{ jenis: 'VENDOR', aktif: true, kode: 'CUST-V001', nama: 'PT Cahaya Utama Safety Indonesia', keterangan: JSON.stringify({ kodeSAP: '1000555', alamat: 'Jl. Raya Bekasi Km 21 No. 5', kelurahan: 'Kel. Rawa Terate', kota: 'Jakarta Timur', kodePos: '13920', npwp: '012345678901000', pimpinan: 'Siti Aminah', jabatan: 'Direktur' }) }];
    window.regAksi = async a => a === 'bacaMasterTambahan' ? { data: window.__mt } : { data: [] };
    window.escHtml = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  });
  for (const [a, z] of [['/* MP292 —', '/* MP296 —'], ['/* MP296 —', '/* MP297 —'], ['/* MP2104 —', '/* MP2105 —'], ['/* MP21028 —', '/* MP264 — PEMBARUAN'], ['/* MP21024 — PEMBARUAN', '\u0000']]) await pg.addScriptTag({ content: z === '\u0000' ? JS.slice(JS.indexOf(a)) : blok(a, z) });
  gal.splice(0); await pg.waitForTimeout(700);

  console.log('2. Kop resmi & SPM Non-KSO');
  await pg.evaluate(() => MP21024.previewPO).catch(() => { });
  let r = await pg.evaluate(async D => { await regAksi('bacaMasterTambahan').then(() => { }); try { await MP21024.vendor; } catch (e) { }
    // muat master vendor seperti previewPO
    const x0 = MP21024.htmlSPM(D); await new Promise(r => setTimeout(r, 50));
    const x = new DOMParser().parseFromString(x0, 'text/html'), kd = x.querySelector('.kd'), t = s => (kd.querySelector(s) || {}).textContent || '';
    return { nm: t('.nm'), tg: t('.tg'), dv: t('.dv'), pr: t('.pr'), al: t('.al'), logo: kd.querySelector('img').src === MP21028.logo, merah: /border-bottom:\s*3px solid #D0021B/i.test(kd.innerHTML), teks: x.body.textContent, T: MP21028.info() }; }, D);
  ok(r.logo && r.nm === 'PT. Waskita Karya (Persero) Tbk' && r.tg === 'INDUSTRI KONSTRUKSI' && r.dv === 'Infrastructure Division' && r.merah, 'kop: logo Waskita · PT. Waskita Karya (Persero) Tbk · INDUSTRI KONSTRUKSI · Infrastructure Division · garis merah');
  ok(r.al === ALAMAT + '• Telp (021)8515521• waskitanindya.jict@gmail.com', 'baris alamat kop = acuan (Gedung Waskita Rajawali Tower … Telp … email)');
  ok(r.pr === 'Pekerjaan Jaringan Irigasi Air Tanah (JIAT)' && /Lokasi Serah Terima Material \/ Franco : Pekerjaan Jaringan Irigasi Air Tanah \(JIAT\)/.test(r.teks) && !/Proyek lama yang belum diganti|JICT|NINDYA|KSO/i.test(r.teks.replace('waskitanindya.jict@gmail.com', '')), 'nama proyek di kop & isi dokumen = Pekerjaan Jaringan Irigasi Air Tanah (JIAT); tanpa sisa KSO / proyek lama');
  ok(new RegExp('Pemberi Tugas,\\s*Nama Perusahaan: PT WASKITA KARYA \\(Persero\\) Tbk\\s*Alamat: ' + ALAMAT.replace(/[.()]/g, '\\$&') + '\\s*NPWP: 010016145093000\\s*Proyek: Pekerjaan Jaringan').test(r.teks.replace(/\s+/g, ' ')), 'blok Pemberi Tugas: nama, alamat, NPWP, proyek tercetak utuh');
  // data vendor dari Master Data (dimuat seperti saat Preview PO)
  r = await pg.evaluate(async D => { window.mp21020DataPO = () => D; window.mp224Cetak = (h) => { window.__cetak = h; const w = document.createElement('div'); w.id = 'mp224Cetak'; w.innerHTML = '<div class="mp224-cv-bar"><small></small><div class="a"></div></div><div id="mp224CvInfo"></div>'; document.body.appendChild(w); }; await MP21024.previewPO('reg', 'x', true); const x = new DOMParser().parseFromString(window.__cetak, 'text/html'); return { teks: x.body.textContent.replace(/\s+/g, ' '), hal: x.querySelectorAll('.hal').length, info: document.querySelector('.mp21024-info') ? document.querySelector('.mp21024-info').textContent : '' }; }, D);
  if (process.env.DEBUG) console.log(r.teks.slice(r.teks.indexOf('Kepada'), r.teks.indexOf('Kepada') + 400), '|', r.info, gal);
  ok(/Alamat: Jl\. Raya Bekasi Km 21 No\. 5, Kel\. Rawa Terate, Jakarta Timur 13920\s*NPWP: 012345678901000/.test(r.teks), 'alamat vendor lengkap dari master: jalan, kelurahan, kota, kode pos (+ NPWP)');
  ok(r.hal === 1 && !/belum lengkap \(alamat/.test(r.info), 'SPM tetap 1 halaman A4; tidak ada peringatan alamat vendor kosong');

  console.log('3. Kop dokumen lain (BA / Bon Permintaan / formulir gudang) & isian Admin');
  r = await pg.evaluate(() => {
    const d = new DOMParser().parseFromString('<html><head></head><body><div class="kop"><img src="lama.png"><div class="nm">WASKITA - NINDYA KSO</div></div><div class="alamat">Kantor KSO : lama</div><h1>BON PERMINTAAN PENGADAAN</h1><div class="kop" id="f"><div class="co"><img src="kso.png"><span>WASKITA - NINDYA KSO</span></div><div class="fm"><div class="a">FORMULIR G-01</div></div></div></body></html>', 'text/html');
    mp296Kop(d); mp296Kop(d);
    const k = d.querySelector('.mp21028-kop'), f = d.getElementById('f');
    return { n: d.querySelectorAll('.kopw').length, nm: k.querySelector('.nm').textContent, pr: k.querySelector('.pr').textContent, logo: k.querySelector('img').getAttribute('src') === MP21028.logo, alamatLama: !!d.querySelector('.alamat'), sisa: /NINDYA|kso\.png|lama\.png/i.test(d.body.innerHTML.split('waskitanindya.jict@gmail.com').join('')), fm: f.querySelector('.fm .a').textContent, co: f.querySelector('.co').textContent, K: { nama: MP296.kop.nama, sub: MP296.kop.sub, alamat: MP296.kop.alamat, proyek: MP296.kop.proyek } };
  });
  ok(r.n === 1 && r.nm === 'PT. Waskita Karya (Persero) Tbk' && r.pr === 'Pekerjaan Jaringan Irigasi Air Tanah (JIAT)' && r.logo && !r.alamatLama && !r.sisa, 'kop surat dokumen (Bon Permintaan / BA) diganti kop resmi — sekali, tanpa sisa logo / nama / alamat KSO');
  ok(r.fm === 'FORMULIR G-01' && /PT\. Waskita Karya \(Persero\) Tbk/.test(r.co) && /INDUSTRI KONSTRUKSI/.test(r.co), 'formulir gudang: identitas kiri = perusahaan, kotak nomor formulir tetap');
  ok(r.K.nama === 'PT. Waskita Karya (Persero) Tbk' && r.K.sub === 'INDUSTRI KONSTRUKSI' && /Rajawali Tower/.test(r.K.alamat) && /JIAT/.test(r.K.proyek), 'kop pratinjau Excel format baku (MP296.kop) = kop resmi');
  r = await pg.evaluate(D => { window.__idt.kopProyek = 'Pekerjaan Jaringan Irigasi Air Tanah (JIAT) Lampung'; window.__idt.kopDivisi = 'Infrastructure II Division'; const a = new DOMParser().parseFromString(MP21024.htmlSPM(D), 'text/html').querySelector('.kd'); delete window.__idt.kopProyek; delete window.__idt.kopDivisi;
    MP21028.kopLokal({ kopDivisi: 'Divisi Lokal' }); const b = MP21028.info().divisi; localStorage.clear(); return { pr: a.querySelector('.pr').textContent, dv: a.querySelector('.dv').textContent, lokal: b }; }, D);
  ok(r.pr === 'Pekerjaan Jaringan Irigasi Air Tanah (JIAT) Lampung' && r.dv === 'Infrastructure II Division' && r.lokal === 'Divisi Lokal', 'isian kop dari Identitas Pelaksana (server 1.10.20) atau cadangan perangkat menggantikan nilai baku');

  console.log('4. Excel format baku, tangkapan & proyek KSO');
  const b64 = await pg.evaluate(async D => { const u8 = new Uint8Array(await (await MP21024.excelBlob(D)).arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }, D);
  const fX = path.join(os.tmpdir(), 'uji21029-spm.xlsx'); fs.writeFileSync(fX, Buffer.from(b64, 'base64'));
  const z = JSON.parse(execFileSync('python3', ['-I', '-c', 'import zipfile,re,sys,json\nz=zipfile.ZipFile(sys.argv[1]);t=" ".join(re.sub(r"<[^>]+>","",z.read(n).decode("utf-8","ignore")) for n in z.namelist() if n.endswith(".xml") and "drawings/drawing" in n)\nprint(json.dumps({"nm":len(re.findall(r"PT\\. Waskita Karya \\(Persero\\) Tbk",t)),"jiat":len(re.findall("JIAT",t)),"al":len(re.findall("Rajawali Tower",t)),"sisa":len(re.findall("NINDYA|Kantor KSO|JICT Pelabuhan",t)),"rusak":z.testzip()}))', fX], { encoding: 'utf8' }));
  ok(!z.rusak && z.nm >= 9 && z.al >= 9 && z.jiat >= 1 && !z.sisa, 'SPM .xlsx: kop setiap lembar = PT. Waskita Karya (Persero) Tbk + alamat acuan; proyek JIAT; tanpa sisa KSO (' + z.nm + ' lembar)');
  const hal = await pg.evaluate(D => MP21024.berhalaman(MP21024.htmlSPM(D)), D);
  const p2 = await br.newPage({ viewport: { width: 900, height: 1250 }, deviceScaleFactor: 2 }); await p2.setContent(hal.html); await p2.evaluate(() => document.body.classList.add('siap')); await p2.waitForTimeout(400);
  const u = await p2.evaluate(() => { const k = document.querySelector('.kd').getBoundingClientRect(), i = document.querySelector('.hal .isi').getBoundingClientRect(), n = document.querySelector('.kd .nm').getBoundingClientRect(), d = document.querySelector('.kd .kn').getBoundingClientRect(); return { dalam: k.left >= i.left - 1 && k.right <= i.right + 1, tumpang: n.right > d.left, hal: document.querySelectorAll('.hal').length }; });
  ok(u.dalam && !u.tumpang && u.hal === 1, 'kop muat di lebar halaman, nama & divisi tidak bertumpuk, 1 halaman');
  await (await p2.$('.hal')).screenshot({ path: path.join(OUT, 'spm-non-kso.png') }); await p2.close();
  r = await pg.evaluate(D => { window.__idt = { bentuk: 'KSO', nama: 'WASKITA - NINDYA, KSO', asal: 'server' }; MP21028.terap(); const K = MP296.kop, x = MP21024.htmlSPM(D).replace(/<style>[\s\S]*?<\/style>/, ''), d = new DOMParser().parseFromString('<html><head></head><body><div class="kop"><img src="a.png"><div class="nm">X</div></div></body></html>', 'text/html'); mp296Kop(d);
    return { nama: K.nama, sub: K.sub, proyek: K.proyek, spm: /class="kd"><img/.test(x) && /WASKITA - NINDYA, KSO/.test(x) && !/Pemberi Tugas|mp21028-kop|mtr|stp/.test(x), dok: !d.querySelector('.mp21028-kop') && d.querySelector('.mp296-kt .nm').textContent }; }, D);
  ok(r.nama === 'WASKITA - NINDYA KSO' && r.sub === undefined && /JICT/.test(r.proyek) && r.spm && r.dok === 'WASKITA - NINDYA KSO', 'proyek KSO: kop, SPM dan dokumen kembali format KSO (tanpa kop resmi / blok Pemberi Tugas)');
  ok(!gal.length, 'tanpa galat JS: ' + gal.join(' | '));
  await br.close(); console.log('\n' + lulus + ' cek lulus');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
