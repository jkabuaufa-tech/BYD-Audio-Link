// Uji UI 2.4.0 di Chromium: checklist › Verifikasi AI › Bundel PDF — unggah 1 PDF scan → pisah AI → pratinjau dua panel → terapkan → verifikasi → gerbang kunci.
// Data: transkripsi 3 berkas tagihan nyata (vt_data.js); AI pembaca PDF ditiru.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const { C, K, P, NO, ADM } = require('./vt_data.js')();
// PDF uji asli (10 halaman berlabel) + penanda %FILE:<id> agar AI tiruan mengenali berkas
function buatPdf(label, tanda) {
  const obj = [], tambah = t => { obj.push(t); return obj.length; };
  const kat = tambah(''), hal = tambah(''), font = tambah('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'), kids = [];
  label.forEach((t, i) => { const isi = 'BT /F1 28 Tf 60 700 Td (Halaman ' + (i + 1) + ') Tj 0 -50 Td /F1 22 Tf (' + t + ') Tj ET', st = tambah('<< /Length ' + isi.length + ' >>\nstream\n' + isi + '\nendstream');
    kids.push(tambah('<< /Type /Page /Parent ' + hal + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + font + ' 0 R >> >> /Contents ' + st + ' 0 R >>')); });
  obj[kat - 1] = '<< /Type /Catalog /Pages ' + hal + ' 0 R >>'; obj[hal - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
  let out = '%PDF-1.4\n%' + tanda + '\n', off = []; obj.forEach((o, i) => { off.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const x = out.length; out += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (obj.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
  return out;
}
let hal = 1; const isi = [], label = [];
['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_07', 'UMUM_08', 'ALAT_09'].forEach(k => C.__ekstrak['TSPSA-' + k].forEach(d => {
  const n = d.jenis === 'BAP' || d.jenis === 'SURAT_JALAN' ? 2 : 1; isi.push(Object.assign({}, d, { halamanMulai: hal, halamanAkhir: hal + n - 1 })); for (let j = 0; j < n; j++) label.push(d.jenis + (n > 1 ? ' (' + (j + 1) + '/' + n + ')' : '')); hal += n; }));
C.__ekstrak['BUN-TB1'] = isi; const PDF = buatPdf(label, 'FILE:BUN-TB1');
const L0 = K.bacaKoleksi_(P, 'progres'); L0.push({ id: 'TB1', versi: 1, noKontrak: NO.spsa, tagihanKe: 2, nomorBA: '02/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L0);
const it0 = {}; K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []).forEach(d => { it0[d.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'TB1', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items: it0, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.4.0.json', 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const keu = potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'), vt = potong('/* MP230 — PEMBARUAN');
const progres = K.bacaKoleksi_(P, 'progres').map(x => Object.assign({ periode: 'Juli 2025', periodeKey: 202507, baTerbit: '2025-07-18' }, x));
const vendor = { TB1: 'CV Gema Multi Kencana', TSPM: 'CV Berkah Bintang Harapan', TSPSA: 'CV Gema Multi Kencana', TSPPP: 'CV Rizki Kurnia' };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } });
  const galatJS = []; pg.on('pageerror', e => galatJS.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  await pg.exposeFunction('simpanBerkas', (nama, b64) => { const folderId = K.folderProyek_(P).getId(); C.__files['BUN-TB1'] = { nama, data: Buffer.from(b64, 'base64').toString('latin1'), biner: true, induk: folderId, diubah: 9 };
    return JSON.stringify({ id: 'BUN-TB1', idServer: 'BUN-TB1', nama, lokasi: 'server' }); });
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,Arial;margin:0;background:#E9EEF5;color:#14233A;font-size:15px} html[data-tema="gelap"] body{background:#0A1626;color:#E6EDF6}
    .btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;cursor:pointer;background:#fff;display:inline-flex;gap:6px;align-items:center}.btn-primary{background:#1763B3;color:#fff;border-color:#1763B3}.btn-success{background:#2E9E5B;color:#fff}.btn-sm{font-size:.8rem}
    .d-flex{display:flex}.gap-2{gap:8px}.ms-auto{margin-left:auto}.align-items-center{align-items:center}.form-control,.form-select{width:100%;box-sizing:border-box;padding:4px 6px}.row{display:flex;flex-wrap:wrap}.col-sm-6{width:50%;box-sizing:border-box;padding:0 4px}
    .modal{position:fixed;inset:0;background:rgba(0,0,0,.45);overflow:auto;z-index:1050}.modal-dialog{max-width:1140px;margin:20px auto}.modal-content{background:var(--f-bg,#fff);border-radius:12px;overflow:hidden}.modal-header,.modal-footer{display:flex;gap:8px;align-items:center;padding:10px 14px}
    .alert{padding:8px 12px;border-radius:8px;margin:8px 0}.alert-warning{background:#FFF4D6}.alert-danger{background:#FDE2E2}.small{font-size:.82rem}.text-muted{color:#6B7A90}.p-0{padding:0}.m-3{margin:12px}.mt-2{margin-top:8px}
    #tab-keuangan{padding:16px}</style><style>${css}</style></head>
    <body><div id="tab-keuangan"><h3>Keuangan</h3><div id="keuIsi"></div></div></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(([P, progres, vendor]) => {
    const nama = 'Joko Supriyono', pin = '1234';
    window.REG = { url: 'https://contoh/exec', sesi: { nama, admin: true, peran: 'PENGADAAN' } };
    window.PROYEK = { id: P, nama: 'Rehabilitasi Jaringan Irigasi D.I/D.I.R Sumsel', namaLengkap: 'Rehabilitasi Jaringan Irigasi D.I/D.I.R Sumatera Selatan', kso: 'WASKITA - NINDYA KSO', kapro: 'DEDY HARIYANTO', kasi: 'JOKO SUPRIYONO' };
    window.PROG = { data: progres }; window.barisBK = x => ({ vendor: vendor[x.id] || '-' });
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.notif = (m, t) => { (window.__notif = window.__notif || []).push([m, t]); }; window.mp220Srv = f => true;
    window.tampilModal = (id, ya) => { const m = document.getElementById(id); m.style.display = ya ? 'block' : 'none'; m.classList.toggle('show', !!ya); };
    window.unggahPdf = async (file) => { const b = new Uint8Array(await file.arrayBuffer()); let s = ''; b.forEach(x => { s += String.fromCharCode(x); }); return JSON.parse(await window.simpanBerkas(file.name, btoa(s))); };
    window.regAksi = async (a, extra) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {})))); if (!r.ok) throw new Error(r.error); return r; };
  }, [P, progres, vendor]);
  await pg.addScriptTag({ content: keu }); await pg.addScriptTag({ content: vt });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.evaluate(() => window.renderKeuangan());
  await pg.waitForFunction(() => document.querySelectorAll('#keuIsi .mp219-aksi button.v').length >= 3, null, { timeout: 8000 });
  // 1. dropzone di tab Verifikasi AI
  await pg.evaluate(() => window.mp230Buka('TB1')); await pg.waitForSelector('#mp240Drop', { timeout: 8000 });
  ok(await pg.locator('.mp240-sub button.on').textContent() === 'Bundel PDF & Pratinjau', 'checklist tanpa laporan: tab Verifikasi AI membuka Bundel PDF & Pratinjau');
  ok(/Unggah 1 PDF bundel/.test(await pg.textContent('#mp240Drop')), 'satu titik dropzone untuk 1 PDF scan utuh');
  await pg.screenshot({ path: OUT + '/vt-bundel-dropzone.png' });
  // 2. unggah → pisah & klasifikasi
  await pg.setInputFiles('#mp240File', { name: 'Bundel SPSA 002.pdf', mimeType: 'application/pdf', buffer: Buffer.from(PDF, 'latin1') });
  await pg.waitForSelector('.mp240-peta tbody tr', { timeout: 15000 });
  ok(await pg.locator('.mp240-peta tbody tr').count() === isi.length, 'AI memisahkan bundel menjadi ' + isi.length + ' dokumen (peta dokumen)');
  await pg.waitForSelector('#mp240Pv iframe', { timeout: 8000 });
  ok(/^blob:.*#page=1/.test(await pg.getAttribute('#mp240Pv iframe', 'src')), 'panel kiri: pratinjau PDF (blob) mulai halaman 1');
  const iBap = isi.findIndex(d => d.jenis === 'BAP');
  await pg.click('.mp240-peta tbody tr[data-i="' + iBap + '"]');
  ok(/#page=7/.test(await pg.getAttribute('#mp240Pv iframe', 'src')) && /hal\. 7/.test(await pg.textContent('#mp240HalTeks')) && await pg.locator('.mp240-peta tr.on').count() === 1, 'klik BAP → pratinjau melompat ke halaman 7');
  const kanan = await pg.textContent('.mp240-kanan');
  ok(/BAPM \/ pengganti \(BAPA, BAST Alat\)\s*BAPA hal\. 9/.test(kanan.replace(/\s+/g, ' ')) && /Surat Jalan \/ BAST Alat/.test(kanan), 'kelengkapan 6 dokumen wajib dengan halaman (BAPA hal. 9)');
  ok(/DPP faktur Rp 108\.625\.002 tidak sesuai/.test(kanan) && /PPN faktur Rp 13\.035\.000 sesuai/.test(kanan), 'rekonsiliasi: DPP 11/12 tidak sesuai (+Rp2), PPN 12% sesuai');
  ok(await pg.locator('.mp240-cek li.no', { hasText: '11889088986' }).count() === 1, 'rekening SPKTV berbeda ditandai');
  ok(await pg.locator('.mp240-usul input[data-k]:checked').count() === 7, '7 item checklist diusulkan (Kwitansi, Invoice, Faktur, BAP, BAPA, SPKTV, Jurnal)');
  await pg.screenshot({ path: OUT + '/vt-bundel-pratinjau.png' });
  // 3. lembar rekonsiliasi
  await pg.evaluate(() => window.mp230Cetak('TB1', 'rekon')); let doc = await pg.$eval('#mp230PvFrame', f => f.srcdoc);
  ok(/LEMBAR REKONSILIASI DOKUMEN TAGIHAN/.test(doc) && /Bundel SPSA 002\.pdf/.test(doc) && /DEDY HARIYANTO/.test(doc), 'lembar rekonsiliasi A4 (peta, nilai, checklist, tanda tangan)');
  await pg.evaluate(() => window.mp230Tutup());
  // 4. terapkan → checklist tersimpan → verifikasi → gerbang kunci
  await pg.click('.mp240-usul .btn-primary');
  await pg.waitForSelector('#mp219ClPanel .mp230-kep', { timeout: 15000 });
  const ck = JSON.parse(post({ action: 'checklistBaca', nama: 'Joko Supriyono', pin: '1234', proyek: P, id: 'TB1' }).data ? JSON.stringify(post({ action: 'checklistBaca', nama: 'Joko Supriyono', pin: '1234', proyek: P, id: 'TB1' }).data) : '{}');
  ok(ck.items.UMUM_07.status === 'ADA' && ck.items.UMUM_07.file.idServer === 'BUN-TB1' && /Bundel hal\. 7–8/.test(ck.items.UMUM_07.ket), 'checklist tersimpan di server: BAP → bundel hal. 7–8');
  const lap = await pg.textContent('#mp219ClPanel');
  ok(/BUTUH REVISI/.test(lap) && /B03/.test(lap) && /Gerbang terkunci/.test(lap), 'verifikasi otomatis: BUTUH REVISI + banner gerbang terkunci');
  ok(await pg.locator('#mp219ClPanel .mp240-hal', { hasText: 'lihat hal.' }).count() > 0, 'temuan memiliki tautan ke halaman bundel');
  await pg.evaluate(() => { document.querySelector('#mp219Cl').scrollTop = 0; }); await pg.screenshot({ path: OUT + '/vt-bundel-laporan.png' });
  const vb = await pg.$('#mp219ClKaki button[onclick="mp219ClVerifikasi()"]');
  ok(vb && await vb.isDisabled() && /terkunci/i.test(await pg.textContent('#mp219ClKaki')), 'tombol Verifikasi Admin terkunci (Kritis/Mayor)');
  const r = post({ action: 'checklistVerifikasi', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: { id: 'TB1', versi: ck.versi, konfirmasiAsli: true, vtAlasan: 'mencoba melewati gerbang dengan alasan panjang' } });
  ok(!r.ok && /TERKUNCI/.test(r.error), 'server juga menolak Verifikasi Admin (tidak bisa dilewati dari klien)');
  await pg.click('#mp219ClPanel .mp240-hal >> text=lihat hal.');
  await pg.waitForSelector('.mp240-peta tr.on');
  ok(await pg.locator('.mp240-sub button.on').textContent() === 'Bundel PDF & Pratinjau', 'tautan temuan membuka pratinjau pada halaman dokumen terkait');
  ok(!galatJS.length, 'tanpa galat JavaScript' + (galatJS.length ? ': ' + galatJS.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
