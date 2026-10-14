// Uji UI 2.4.1 di Chromium: tombol Unggah Bundel Tagihan di header checklist (MP241 → mp240Unggah) + Kartu Gudang 25–25, penanda Migrasi, cetak A4 portrait.
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
  await pg.evaluate(() => {   // tiruan blok gudang MP223/MP224 (antarmuka yang di-hook MP241)
    window.mp223K = { kunci: 'M-SEMEN', dari: '', sd: '', semua: false };
    window.MP223 = { masuk: [{ kunci: 'M-SEMEN', tanggal: '2026-09-28', status: 'AKTIF', migrasi: true }, { kunci: 'M-SEMEN', tanggal: '2026-10-02', status: 'AKTIF' }, { kunci: 'M-SEMEN', tanggal: '2026-10-05', status: 'BATAL', migrasi: true }],
      keluar: [{ kunci: 'M-SEMEN', tanggal: '2026-10-03', status: 'AKTIF', migrasi: true }, { kunci: 'M-BESI', tanggal: '2026-10-03', status: 'AKTIF', migrasi: true }] };
    window.__tab = '';
    window.showTab = nama => { window.__tab = nama; const K = window.mp223K; let el = document.getElementById('mp223KartuIsi'); if (!el) { el = document.createElement('div'); el.id = 'mp223KartuIsi'; document.body.appendChild(el); }
      el.innerHTML = '<input id="mp223KDari" type="date" value="' + K.dari + '"><input id="mp223KSd" type="date" value="' + K.sd + '"><table class="mp223-tb"><tbody>' +
        ['28-Sep-2026', '02-Okt-2026', '03-Okt-2026', '05-Okt-2026'].map(t => '<tr><td>' + t + '</td><td>1</td><td>GR</td></tr>').join('') + '</tbody></table>'; };
    window.bukaTab = t => window.showTab(t);
    window.mp224Cetak = (html, opt) => { window.__cetak = { html, opt }; };
    window.mp223KartuCetak = () => window.mp224Cetak('<html><style>@page{size:A4 landscape;margin:12mm}</style><body><table></table><div class="cat">c</div><div class="ft">Dicetak</div></body></html>', { judul: 'KARTU GUDANG', lanskap: true });
    window.itemCmdk = q => [];
    window.keluarLogin = () => {}; window.renderSemuaData = () => {};
  });
  await pg.addScriptTag({ content: keu }); await pg.addScriptTag({ content: vt }); await pg.addScriptTag({ content: mp241 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.evaluate(() => window.renderKeuangan());
  await pg.waitForFunction(() => document.querySelectorAll('#keuIsi .mp219-aksi button.v').length >= 3, null, { timeout: 8000 });
  console.log('1. Tombol Unggah Bundel Tagihan');
  await pg.evaluate(() => window.cl217Buka('TB1'));
  await pg.waitForSelector('#mp241BtnBundel', { timeout: 5000 });
  await pg.waitForTimeout(400);
  const urut = await pg.evaluate(() => { const b = document.getElementById('mp241BtnBundel'); return { next: b.nextElementSibling && b.nextElementSibling.id, kelas: b.className, judul: b.title, file: !!document.getElementById('mp241FileBundel'), gb: !!document.getElementById('mp227BtnGb'), cetak: document.getElementById('mp219BtnCetak').textContent.trim() }; });
  ok(urut.next === 'mp219BtnCetak' && /btn-sm/.test(urut.kelas) && /btn-success/.test(urut.kelas), 'tombol hijau tepat sebelum "Preview & Cetak PDF"');
  ok(/AI pisah per dokumen/.test(urut.judul) && urut.file && urut.cetak === 'Preview & Cetak PDF', 'tooltip, input file tersembunyi, tombol cetak tidak berubah');
  await pg.evaluate(() => { window.MP219_KEU.dirty = true; window.__notif = []; document.getElementById('mp241BtnBundel').click(); });
  ok(await pg.evaluate(() => (window.__notif || []).some(n => /Simpan perubahan checklist/.test(n[0]) && n[1] === 'err')), 'ada perubahan belum disimpan → notif, tidak membuka pemilih berkas');
  await pg.evaluate(() => { window.MP219_KEU.dirty = false; });
  await pg.setInputFiles('#mp241FileBundel', { name: 'Bundel SPSA 002.pdf', mimeType: 'application/pdf', buffer: Buffer.from(PDF, 'latin1') });
  await pg.waitForSelector('.mp240-peta tbody tr', { timeout: 15000 });
  ok(await pg.locator('.mp240-peta tbody tr').count() === isi.length && await pg.locator('#mp219Cl .mp219-tabs-s [data-vt].on').count() === 1, 'unggah via tombol header → mp240Unggah → tab Verifikasi AI, ' + isi.length + ' dokumen dipisahkan');
  await pg.evaluate(() => { document.querySelector('#mp219Cl').scrollTop = 0; }); await pg.screenshot({ path: OUT + '/mp241-tombol-bundel.png', clip: { x: 0, y: 0, width: 1360, height: 260 } });
  await pg.evaluate(() => { const VT = window.MP230_VT, i = VT.info; VT.info = null; window.__notif = []; document.getElementById('mp241BtnBundel').click(); VT.info = i; });
  ok(await pg.evaluate(() => window.__notif.some(n => /Modul server 1\.7\.0/.test(n[0]))), 'tanpa Modul 1.7.0 → notif yang menjelaskan');
  await pg.evaluate(() => { window.REG.sesi.peran = 'LIHAT'; window.REG.sesi.admin = false; window.__notif = []; document.getElementById('mp241BtnBundel').click(); window.REG.sesi.peran = 'PENGADAAN'; window.REG.sesi.admin = true; });
  ok(await pg.evaluate(() => window.__notif.some(n => /Pengadaan atau Admin/.test(n[0]))), 'peran Lihat → ditolak dengan notif');
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(150);
  ok(await pg.evaluate(() => { const b = document.getElementById('mp241BtnBundel'); return getComputedStyle(b.querySelector('.mp241-lbl')).display === 'none' && getComputedStyle(b.querySelector('.mp241-pdk')).display !== 'none'; }), 'layar < 768 px: label ringkas "Bundel"');
  await pg.setViewportSize({ width: 1360, height: 900 });
  console.log('2. Kartu Gudang 25–25, Migrasi, cetak');
  const t = await pg.evaluate(() => [window.mp241Tanggal25Prev(), window.mp241Tanggal25Now()]);
  const d = new Date(), p2 = n => String(n).padStart(2, '0'), prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  ok(t[0] === prev.getFullYear() + '-' + p2(prev.getMonth() + 1) + '-25' && t[1] === d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-25', 'mp241Tanggal25Prev/Now = ' + t.join(' s.d. '));
  await pg.evaluate(() => { const n = new Date(), z = x => String(x).padStart(2, '0'); window.mp223K.dari = n.getFullYear() + '-' + z(n.getMonth() + 1) + '-01'; window.showTab('gdkartu'); });
  ok(await pg.evaluate(() => window.mp223K.dari === window.mp241Tanggal25Prev() && window.mp223K.sd === window.mp241Tanggal25Now()), 'showTab(gdkartu): tgl 01 / kosong → periode 25–25');
  await pg.waitForTimeout(400);
  const mig = await pg.$$eval('#mp223KartuIsi tbody tr', L => L.map(tr => (tr.dataset.mp241mig || '') + ':' + tr.cells[tr.cells.length - 1].textContent.trim()));
  ok(mig[0].startsWith('1:📦 Migrasi') && mig[2].startsWith('1:📦 Migrasi') && !/Migrasi/.test(mig[1]) && !/Migrasi/.test(mig[3]), 'penanda Migrasi hanya pada baris migrasi AKTIF material ini (BATAL & material lain diabaikan)');
  await pg.evaluate(() => { window.renderSemuaData(); }); await pg.waitForTimeout(500);
  ok(await pg.$$eval('#mp223KartuIsi .mp241-mig', L => L.length) === 2, 'tanpa duplikasi penanda setelah render ulang');
  await pg.evaluate(() => { const e = document.getElementById('mp223KDari'); e.value = '2026-08-10'; e.dispatchEvent(new Event('change', { bubbles: true })); window.mp223K.dari = '2026-08-10'; window.showTab('gdkartu'); });
  ok(await pg.evaluate(() => window.mp223K._mp241User === true && window.mp223K.dari === '2026-08-10'), 'tanggal pilihan pengguna tidak ditimpa');
  await pg.evaluate(() => { window.mp223K.dari = window.mp241Tanggal25Prev(); window.mp223KartuCetak(); });
  const c = await pg.evaluate(() => ({ html: window.__cetak.html, opt: window.__cetak.opt, pulih: window.mp224Cetak.toString().indexOf('__cetak') >= 0 }));
  ok(c.opt.lanskap === false && /size:A4 portrait/.test(c.html), 'cetak A4 portrait (opt.lanskap=false)');
  ok(/Ringkasan \(Migrasi\):<\/b>.*\(2 transaksi: 1 penerimaan, 1 pengeluaran\)/.test(c.html) && c.html.indexOf('Ringkasan (Migrasi)') < c.html.indexOf('<div class="ft">'), 'ringkasan migrasi tepat sebelum <div class="ft"> (2 transaksi: 1 penerimaan, 1 pengeluaran)');
  ok(c.pulih, 'window.mp224Cetak dipulihkan setelah cetak');
  const cmd = await pg.evaluate(() => [window.itemCmdk('bundel').map(x => x.l), window.itemCmdk('kartu gudang').map(x => x.l), window.itemCmdk('25').map(x => x.l)]);
  ok(cmd[0].some(l => /Unggah Bundel/.test(l)) && cmd[1].some(l => /25–25/.test(l)) && cmd[2].some(l => /25–25/.test(l)), 'pencarian cepat: bundel, kartu gudang, 25');
  await pg.evaluate(() => window.keluarLogin()); ok(await pg.evaluate(() => !('_mp241User' in window.mp223K)), 'keluar akun menghapus penanda pilihan tanggal');
  ok(!galatJS.length, 'tanpa galat JavaScript' + (galatJS.length ? ': ' + galatJS.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
