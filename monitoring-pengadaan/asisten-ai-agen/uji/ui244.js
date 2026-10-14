// Uji UI 2.4.4 di Chromium (paralel 2 bagian + lanjut otomatis setelah gagal): bundel ±25 MB lewat tombol header → dipecah pdf-lib (asli) per halaman menjadi bagian ≤ 9,5 MB → unggah per bagian → AI per bagian → peta, pratinjau lintas bagian, terapkan, verifikasi.
// Data: transkripsi 3 berkas tagihan nyata (vt_data.js); AI pembaca PDF ditiru.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const { C, K, P, NO, ADM } = require('./vt_data.js')();
// PDF uji asli (10 halaman berlabel) + penanda %FILE:<id> agar AI tiruan mengenali berkas
function buatPdf(label, tanda) {
  const obj = [], tambah = t => { obj.push(t); return obj.length; };
  const kat = tambah(''), hal = tambah(''), font = tambah('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'), kids = [];
  label.forEach((t, i) => { const isi = '% BUNPG:BUN-TB1:' + (i + 1) + '\n' + ('% ' + 'x'.repeat(98) + '\n').repeat(Math.round(2.5 * 1048576 / 101)) + 'BT /F1 28 Tf 60 700 Td (Halaman ' + (i + 1) + ') Tj 0 -50 Td /F1 22 Tf (' + t + ') Tj ET', st = tambah('<< /Length ' + isi.length + ' >>\nstream\n' + isi + '\nendstream');
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
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.4.4.json', 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const keu = potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'), vt = potong('/* MP230 — PEMBARUAN', '/* MP241 — PEMBARUAN'), mp241 = potong('/* MP241 — PEMBARUAN');
const progres = K.bacaKoleksi_(P, 'progres').map(x => Object.assign({ periode: 'Juli 2025', periodeKey: 202507, baTerbit: '2025-07-18' }, x));
const vendor = { TB1: 'CV Gema Multi Kencana', TSPM: 'CV Berkah Bintang Harapan', TSPSA: 'CV Gema Multi Kencana', TSPPP: 'CV Rizki Kurnia' };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } });
  const galatJS = []; pg.on('pageerror', e => galatJS.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  let nUp = 0; const ukuranUp = [];
  await pg.exposeFunction('simpanBerkas', (nama, b64) => { const folderId = K.folderProyek_(P).getId(), id = 'UP-' + (++nUp), data = Buffer.from(b64, 'base64').toString('latin1'); ukuranUp.push(data.length);
    C.__files[id] = { nama, data, biner: true, induk: folderId, diubah: 9 }; return JSON.stringify({ id, idServer: id, nama, lokasi: 'server' }); });
  const PL = fs.readFileSync('/tmp/claude-0/-home-user-BYD-Audio-Link/d850bcdb-d612-55a8-bccd-b337607271a4/scratchpad/npm/node_modules/pdf-lib/dist/pdf-lib.min.js', 'utf8');
  await pg.route('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/**', r => r.fulfill({ body: PL, contentType: 'application/javascript' }));
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
  await pg.addScriptTag({ content: keu }); await pg.addScriptTag({ content: vt }); await pg.addScriptTag({ content: mp241 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.evaluate(() => window.renderKeuangan());
  await pg.waitForFunction(() => document.querySelectorAll('#keuIsi .mp219-aksi button.v').length >= 3, null, { timeout: 8000 });
  ok(PDF.length > 24 * 1048576, 'PDF uji ' + (PDF.length / 1048576).toFixed(1) + ' MB, ' + label.length + ' halaman');
  await pg.evaluate(() => window.cl217Buka('TB1')); await pg.waitForSelector('#mp241FileBundel', { state: 'attached', timeout: 5000 }); await pg.waitForTimeout(300);
  // percobaan 1: bagian ke-3 gagal dibaca AI (mis. API key ditolak) → bundel berhenti
  await pg.evaluate(() => { const ra = window.regAksi; let gagal = 1; window.__nAi = 0; window.regAksi = async (a, x) => { if (a === 'vtBundel' && x && x.data && x.data.bacaSaja) { window.__nAi++; if (gagal && x.data.berkas[0].mulai === 7) { gagal = 0; throw new Error('Anthropic Claude (HTTP 401): API key ditolak'); } } return ra(a, x); }; });
  const berkasUji = { name: 'Bundel SPSA 002 (scan 25 MB).pdf', mimeType: 'application/pdf', buffer: Buffer.from(PDF, 'latin1') };
  await pg.setInputFiles('#mp241FileBundel', berkasUji);
  await pg.waitForFunction(() => (window.__notif || []).some(n => /Bundel gagal diproses/.test(n[0])), null, { timeout: 90000 });
  const up1 = ukuranUp.length, ai1 = await pg.evaluate(() => window.__nAi);
  ok(/bagian yang sudah selesai tidak diulang/.test(await pg.evaluate(() => window.__notif.map(n => n[0]).join(' '))), 'gagal di tengah → pesan mengajak unggah ulang file yang sama');
  const t0 = Date.now();
  await pg.setInputFiles('#mp241FileBundel', berkasUji);
  await pg.waitForSelector('.mp240-peta tbody tr', { timeout: 90000 });
  const B = await pg.evaluate(() => { const b = window.MP230_VT.bundel.TB1; return { n: b.berkas.length, bag: b.berkas.map(x => x.mulai + '-' + x.akhir), seg: b.segmen.length }; });
  ok(up1 === B.n && ukuranUp.length === B.n, 'percobaan ulang tidak mengunggah ulang: ' + B.n + ' bagian diunggah sekali saja');
  ok(await pg.evaluate(() => window.__nAi) === ai1 + 1, 'hanya bagian yang gagal yang dibaca ulang AI (' + ai1 + ' + 1 panggilan)');
  ok(B.n >= 3 &&  ukuranUp.every(x => x <= 9.5 * 1048576), 'dipecah menjadi ' + B.n + ' bagian (' + B.bag.join(', ') + '), semua ≤ 9,5 MB: ' + ukuranUp.map(x => (x / 1048576).toFixed(1)).join(' / ') + ' MB (lanjutan ' + ((Date.now() - t0) / 1000).toFixed(1) + ' dtk)');
  ok(ukuranUp.reduce((a, b) => a + b, 0) > 24 * 1048576, 'tanpa kompres: total isi bagian ≈ ukuran asli');
  ok(B.seg === isi.length, 'peta menyatukan ' + B.seg + ' dokumen dari semua bagian');
  ok(await pg.evaluate(() => (window.__notif || []).some(n => /bagian ≤ 10 MB/.test(n[0]) && n[1] === 'ok')), 'pesan sukses menyebut jumlah bagian');
  const iBap = isi.findIndex(d => d.jenis === 'BAP');
  await pg.click('.mp240-peta tbody tr[data-i="' + iBap + '"]'); await pg.waitForTimeout(300);
  const ht = await pg.textContent('#mp240HalTeks'), src = await pg.getAttribute('#mp240Pv iframe', 'src');
  const bagBap = B.bag.findIndex(r => { const [a, b] = r.split('-').map(Number); return 7 >= a && 7 <= b; }), lokal = 7 - Number(B.bag[bagBap].split('-')[0]) + 1;
  ok(new RegExp('hal\\. 7 · bagian ' + (bagBap + 1) + '/' + B.n).test(ht) && new RegExp('#page=' + lokal + '&').test(src), 'klik BAP → bagian ' + (bagBap + 1) + ' halaman lokal ' + lokal + ' (' + ht + ')');
  await pg.click('.mp240-usul .btn-primary');
  await pg.waitForSelector('#mp219ClPanel .mp230-kep', { timeout: 20000 });
  const ck = post({ action: 'checklistBaca', nama: 'Joko Supriyono', pin: '1234', proyek: P, id: 'TB1' }).data;
  ok(ck.items.UMUM_07.file.idServer === 'UP-' + (bagBap + 1) && new RegExp('bagian ' + (bagBap + 1) + '/' + B.n).test(ck.items.UMUM_07.ket) && ck.items.UMUM_03.file.idServer !== ck.items.UMUM_07.file.idServer, 'kernel menyimpan checklist: tiap item menunjuk bagian yang memuat dokumennya');
  const lap = await pg.textContent('#mp219ClPanel');
  ok(/BUTUH REVISI/.test(lap) && /B03/.test(lap) && /I05/.test(lap) && /N05/.test(lap), 'verifikasi atas seluruh bagian: B03, I05 (surat jalan di bagian terakhir), N05');
  await pg.evaluate(() => { document.querySelector('#mp219Cl').scrollTop = 0; }); await pg.screenshot({ path: OUT + '/vt-bundel-bagian.png' });
  ok(!galatJS.length, 'tanpa galat JavaScript' + (galatJS.length ? ': ' + galatJS.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
