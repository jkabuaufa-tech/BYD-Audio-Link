// Uji UI 2.6.20 di Chromium (blok asli 2.6.20 + server 1.9.5 asli): MODE MANUAL — bundel tersimpan tanpa AI, dipetakan & dipotong manual, Admin mengubah mode.
// bundel hasil pindai yang AI-nya membalas "0 dokumen" → lapisan teks PDF dibaca di perangkat → server memisah menurut judul;
// dokumen tak dikenali dipetakan manual dari peta dokumen; halaman pindai dipetakan manual (hal. a–b → item); baca ulang dengan penyedia lain.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
process.env.VT_MANUAL = '1';
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.5.json';
const NPM = process.env.NPM_UJI || '/tmp/claude-0/-home-user-BYD-Audio-Link/d850bcdb-d612-55a8-bccd-b337607271a4/scratchpad/npm/node_modules';
const { C, K, P, NO } = require('./vt_data.js')();
// PDF uji: halaman berteks (judul tercetak) + halaman "pindai" tanpa lapisan teks; penanda BUNPG per halaman untuk AI tiruan
function buatPdf(label) {
  const obj = [], tambah = t => { obj.push(t); return obj.length; };
  const kat = tambah(''), hal = tambah(''), font = tambah('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'), kids = [];
  label.forEach((t, i) => { const isi = '% BUNPG:BUN-T13:' + (i + 1) + '\n' + (t ? 'BT /F1 22 Tf 60 760 Td (' + t + ') Tj 0 -40 Td /F1 12 Tf (Nomor 0' + (i + 1) + '/GMK/2025 tanggal 18 Juli 2025) Tj ET' : '0.6 g 40 300 515 400 re f'), st = tambah('<< /Length ' + isi.length + ' >>\nstream\n' + isi + '\nendstream');
    kids.push(tambah('<< /Type /Page /Parent ' + hal + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + font + ' 0 R >> >> /Contents ' + st + ' 0 R >>')); });
  obj[kat - 1] = '<< /Type /Catalog /Pages ' + hal + ' 0 R >>'; obj[hal - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
  let out = '%PDF-1.4\n%FILE:BUN-T13\n', off = []; obj.forEach((o, i) => { off.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const x = out.length; out += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (obj.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
  return out;
}
const LABEL = ['KWITANSI', 'INVOICE', 'FAKTUR PAJAK', 'BERITA ACARA PEMBAYARAN', '', 'SURAT KETERANGAN DOMISILI'], PDF = buatPdf(LABEL);
const d = (jenis, judul, h, x) => Object.assign({ jenis, judul, halamanMulai: h, halamanAkhir: h }, x || {});
C.__ekstrak['BUN-T13'] = [d('KWITANSI', 'KWITANSI', 1, { nomor: '01/GMK/2025', nilai: { total: 118500000 } }), d('INVOICE', 'INVOICE', 2, { nomor: 'INV-01', nilai: { total: 118500000 } }),
  d('FAKTUR_PAJAK', 'FAKTUR PAJAK', 3), d('BAP', 'BERITA ACARA PEMBAYARAN', 4), d('LAINNYA', 'DOKUMENTASI', 5), d('LAINNYA', 'SURAT KETERANGAN DOMISILI', 6)];
const L0 = K.bacaKoleksi_(P, 'progres'); L0.push({ id: 'T13', versi: 1, noKontrak: NO.spsa, tagihanKe: 4, nomorBA: '04/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L0);
const it0 = {}; K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []).forEach(x => { it0[x.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'T13', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items: it0, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.20.json', 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const BLOK = [potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'), potong('/* MP230 — PEMBARUAN', '/* MP241 — PEMBARUAN'), potong('/* MP241 — PEMBARUAN', '/* MP250 — PEMBARUAN'),
  potong('/* MP250 — PEMBARUAN', '/* MP259 — PEMBARUAN'), potong('/* MP2618 — PEMBARUAN', '/* MP264 — PEMBARUAN')];
const progres = K.bacaKoleksi_(P, 'progres').map(x => Object.assign({ periode: 'Juli 2025', periodeKey: 202507, baTerbit: '2025-07-18' }, x));
// AI tiruan: Anthropic membaca bundel "pindai" sebagai 0 dokumen selama KOSONG > 0
let KOSONG = 99, nAI = 0; const bacaPdf = C.__jawabHTTP;
C.__jawabHTTP = (u, o) => { nAI++; if (KOSONG > 0 && /BUNDEL scan/.test(JSON.stringify(JSON.parse(o.payload).messages))) { KOSONG--; C.__jawabHTTP.n = (C.__jawabHTTP.n || 0) + 1; return { kode: 200, teks: { content: [{ type: 'text', text: '{"dokumen":[]}' }], usage: { input_tokens: 4100, output_tokens: 9 } } }; }
  const r = bacaPdf(u, o); r.teks.usage = { input_tokens: 4100, output_tokens: 620 }; return r; };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } });
  const galatJS = []; pg.on('pageerror', e => galatJS.push(e.message)); pg.on('dialog', x => x.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  let nUp = 0;
  await pg.exposeFunction('simpanBerkas', (nama, b64) => { const id = 'UP13-' + (++nUp); C.__files[id] = { nama, data: Buffer.from(b64, 'base64').toString('latin1'), biner: true, induk: K.folderProyek_(P).getId(), diubah: 9 + nUp }; return JSON.stringify({ id, idServer: id, nama, lokasi: 'server' }); });
  const lib = (re, f) => pg.route(re, r => r.fulfill({ body: fs.readFileSync(f, 'utf8'), contentType: 'application/javascript' }));
  await lib('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/**', NPM + '/pdf-lib/dist/pdf-lib.min.js');
  await lib('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', NPM + '/pdfjs-dist/build/pdf.min.js');
  await lib('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', NPM + '/pdfjs-dist/build/pdf.worker.min.js');
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,Arial;margin:0;background:#E9EEF5;color:#14233A;font-size:15px;--f-bg:#fff;--f-ink:#14233A;--f-muted:#5B6B82;--f-line:#DCE3EC;--f-soft:#F3F6FA}
    .btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;cursor:pointer;background:#fff;display:inline-flex;gap:6px;align-items:center}.btn-primary{background:#1763B3;color:#fff;border-color:#1763B3}.btn-sm{font-size:.8rem}
    .d-flex{display:flex}.gap-2{gap:8px}.justify-content-end{justify-content:flex-end}.form-control,.form-select{box-sizing:border-box;padding:4px 6px}.alert{padding:8px 12px;border-radius:8px;margin:8px 0}.text-muted{color:#6B7A90}.m-3{margin:12px}.mt-2{margin-top:8px}.me-1{margin-right:4px}
    .modal{position:fixed;inset:0;background:rgba(0,0,0,.45);overflow:auto;z-index:1050}.modal-dialog{max-width:1140px;margin:20px auto}.modal-content{background:#fff;border-radius:12px;overflow:hidden}
    .mp219-tb{width:100%;border-collapse:collapse}.mp219-tb th,.mp219-tb td{border-bottom:1px solid #DCE3EC;padding:5px 6px;text-align:left;font-size:.8rem}.mp219-tw{overflow-x:auto}#tab-keuangan{padding:16px}</style><style>${css}</style></head>
    <body><div id="tab-keuangan"><h3>Keuangan</h3><div id="keuIsi"></div></div></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(([P, progres]) => {
    const nama = 'Joko Supriyono', pin = '1234';
    window.REG = { url: 'https://contoh/exec', sesi: { nama, admin: true, peran: 'PENGADAAN' } };
    window.PROYEK = { id: P, nama: 'Proyek uji', namaLengkap: 'Proyek uji', kso: 'WASKITA', kapro: 'KAPRO', kasi: 'JOKO SUPRIYONO' };
    window.PROG = { data: progres }; window.barisBK = () => ({ vendor: 'CV Gema Multi Kencana' });
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.notif = (m, t) => { (window.__notif = window.__notif || []).push([m, t]); }; window.mp220Srv = () => true; window.MP250_JEDA = [1, 1];
    window.tampilModal = (id, ya) => { const m = document.getElementById(id); m.style.display = ya ? 'block' : 'none'; m.classList.toggle('show', !!ya); };
    window.unggahPdf = async file => { const b = new Uint8Array(await file.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return JSON.parse(await window.simpanBerkas(file.name, btoa(s))); };
    window.__minta = [];
    window.regAksi = async (a, extra) => { if (a === 'vtBundel') window.__minta.push(JSON.parse(JSON.stringify(extra.data))); const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {})))); if (!r.ok) throw new Error(r.error); return r; };
    window.bukaTab = () => { };
  }, [P, progres]);
  for (const b of BLOK) await pg.addScriptTag({ content: b });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.evaluate(() => window.renderKeuangan());
  await pg.evaluate(() => window.cl217Buka('T13')); await pg.waitForSelector('#mp241FileBundel', { state: 'attached', timeout: 8000 }); await pg.waitForTimeout(300);

  await pg.evaluate(async () => { window.MP230_VT.info = await window.regAksi('vtInfo'); });   // info setelan (dimuat aplikasi saat membuka menu)

  console.log('1. Mode manual: bundel tersimpan tanpa AI');
  const nAwal = nAI;
  await pg.setInputFiles('#mp241FileBundel', { name: 'Bundel SPSA 004 (scan).pdf', mimeType: 'application/pdf', buffer: Buffer.from(PDF, 'latin1') });
  await pg.waitForFunction(() => (window.__notif || []).some(n => /mode manual|gagal|tertunda/i.test(n[0])), null, { timeout: 60000 });
  const N = await pg.evaluate(() => window.__notif.map(n => n[0]));
  ok(!N.some(n => /gagal|tertunda/.test(n)) && N.some(n => /Bundel tersimpan tanpa AI \(mode manual\)/.test(n)) && nAI === nAwal, 'unggah bundel → tersimpan, 0 panggilan AI, pesan mode manual');
  ok(await pg.evaluate(() => !window.__minta[0].petaTeks), 'lapisan teks tidak dikirim (tidak diperlukan tanpa AI)');
  await pg.evaluate(() => window.mp240Sub('T13', 'bundel')); await pg.waitForSelector('.mp2618');
  const t = await pg.textContent('.mp2618');
  ok(/Mode manual \(tanpa AI\)/.test(t) && !/AI tidak menemukan/.test(t) && !(await pg.$('.mp2618-ul button')) && /Izinkan AI membaca dokumen/.test(t), 'panel: keterangan mode manual, tanpa pesan "AI tidak menemukan" & tanpa tombol baca ulang AI');

  console.log('2. Pemetaan manual & potong ke checklist');
  if (!(await pg.$eval('.mp2618-man', x => x.open))) await pg.click('.mp2618-man summary');
  for (const [a, b, k] of [['1', '1', 'UMUM_03'], ['2', '2', 'UMUM_04'], ['3', '3', 'UMUM_05']]) { await pg.fill('#mp2618A', a); await pg.fill('#mp2618B', b); await pg.selectOption('#mp2618K', k); await pg.click('.mp2618-man .btn-primary'); await pg.waitForTimeout(150); }
  ok(await pg.evaluate(() => window.MP230_VT.bundel.T13.usulan.map(u => u.k).join()) === 'UMUM_03,UMUM_04,UMUM_05', 'hal. 1–3 dipetakan manual ke Kwitansi, Invoice, Faktur Pajak');
  await pg.evaluate(() => window.mp240Terapkan('T13'));
  await pg.waitForFunction(() => (window.__notif || []).some(n => /dipotong dari bundel/.test(n[0])), null, { timeout: 60000 });
  const ck = post({ action: 'checklistBaca', nama: 'Joko Supriyono', pin: '1234', proyek: P, id: 'T13' }).data;
  ok(['UMUM_03', 'UMUM_04', 'UMUM_05'].every(k => ck.items[k].status === 'ADA' && /^Dipetakan manual dari bundel hal\./.test(ck.items[k].ket)) && nAI === nAwal, 'Terapkan: 3 baris checklist terisi potongan PDF, tetap 0 panggilan AI');
  ok(/BUNPG:BUN-T13:2\b/.test(C.__files[ck.items.UMUM_04.file.idServer].data) && !/BUNPG:BUN-T13:[13]\b/.test(C.__files[ck.items.UMUM_04.file.idServer].data), 'potongan Invoice tepat hal. 2');
  const N2 = await pg.evaluate(() => window.__notif.map(n => n[0]).join(' | '));
  ok(/Mode manual aktif: verifikasi AI dimatikan/.test(N2), 'verifikasi otomatis setelah Terapkan → pesan "mode manual", bukan galat AI');

  console.log('3. Admin mengubah mode');
  await pg.evaluate(() => window.mp240Sub('T13', 'bundel')); await pg.waitForSelector('.mp2618');
  await pg.click('button:has-text("Izinkan AI membaca dokumen")'); await pg.waitForFunction(() => /AI membaca dokumen tagihan/.test(document.querySelector('.mp2618').textContent));
  ok(await pg.evaluate(() => window.MP230_VT.info.setelan.tanpaAI === false) && /Aktifkan mode manual/.test(await pg.textContent('.mp2618')), 'Izinkan AI → server tanpaAI=false; panel menawarkan "Aktifkan mode manual"');
  await pg.click('button:has-text("Aktifkan mode manual")'); await pg.waitForFunction(() => /Mode manual \(tanpa AI\)/.test(document.querySelector('.mp2618').textContent));
  ok(post({ action: 'vtInfo', nama: 'Joko Supriyono', pin: '1234', proyek: P }).setelan.tanpaAI === true, 'Aktifkan mode manual → tersimpan di server');
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(200);
  const lb = await pg.evaluate(() => { const p = document.querySelector('.mp2618'); return p.scrollWidth - p.clientWidth; });
  ok(lb <= 1, 'panel muat di layar HP 390 px');
  ok(!galatJS.length, 'tanpa galat JavaScript' + (galatJS.length ? ': ' + galatJS.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' uji UI 2.6.20 (mode manual)'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
