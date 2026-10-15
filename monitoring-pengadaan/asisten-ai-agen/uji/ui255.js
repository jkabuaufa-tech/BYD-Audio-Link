// Uji UI 2.5.5 di Chromium — KANTOR AI: instruksi Manajer, antrean Petugas Input, draf Staf Administrasi, mode terus-menerus, pemberitahuan. (Riwayat:) (1) bundel ±25 MB → bagian kecil ≤ 4,5 MB, 502 pada satu bagian dicoba ulang otomatis, verifikasi langsung dari bundel TANPA Terapkan;
// (2) Tim AI Proyek: menu akun → dialog → Jalankan sekarang → laporan, saran (Jalankan aksi baca, Tandai selesai), tab anggota/antrean/riwayat/setelan, tampilan ponsel.
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
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.5.5.json', 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const keu = potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'), vt = potong('/* MP230 — PEMBARUAN', '/* MP241 — PEMBARUAN'), mp241 = potong('/* MP241 — PEMBARUAN', '/* MP250 — PEMBARUAN'), mp250 = potong('/* MP250 — PEMBARUAN');
const progres = K.bacaKoleksi_(P, 'progres').map(x => Object.assign({ periode: 'Juli 2025', periodeKey: 202507, baTerbit: '2025-07-18' }, x));
const vendor = { TB1: 'CV Gema Multi Kencana', TSPM: 'CV Berkah Bintang Harapan', TSPSA: 'CV Gema Multi Kencana', TSPPP: 'CV Rizki Kurnia' };
// AI tiruan: tanpa PDF → laporan Tim AI
const bacaPdf = C.__jawabHTTP; C.__jawabHTTP = (u, o) => JSON.stringify(JSON.parse(o.payload).messages).indexOf('"document"') >= 0 ? bacaPdf(u, o)
  : { kode: 200, teks: { content: [{ type: 'text', text: JSON.stringify({ ringkasan: 'Tim memverifikasi tagihan berbundel; temuan kritis rekening & faktur pada SPSA perlu surat permintaan perbaikan ke vendor.',
    temuan: [{ judul: 'Rekening invoice berbeda dengan SPKTV', detail: 'BNI 1889088986 vs 11889088986', tingkat: 'tinggi', anggota: 'verifikator' }],
    saran: [{ judul: 'Periksa register kontrak SPSA', aksi: 'bacaSemua', arg: { koleksi: 'list', cari: 'SPSA' }, dampak: 'Pastikan WBS/PR/PO lengkap sebelum tagihan berikutnya', anggota: 'kontrak', prioritas: 'sedang', pj: 'Pengadaan', tenggat: '2026-10-21' }],
    instruksi: [{ untuk: 'Pengadaan', tugas: 'Lengkapi register kontrak SPSA & SPM hari ini', prioritas: 'tinggi', tenggat: '2026-10-16' }, { untuk: 'Keuangan', tugas: 'Tahan pengajuan bayar SPPP sampai faktur diperbaiki', prioritas: 'tinggi' }],
    draf: [{ jenis: 'surat', judul: 'Permintaan Perbaikan Dokumen 01/BAP/00134', kepada: 'CV Rizki Kurnia', isi: 'Kepada Yth. CV Rizki Kurnia\n\nDengan hormat, mohon perbaikan faktur pajak ganda ...' }] }) }], usage: {} } };
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
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,Arial;margin:0;background:#E9EEF5;color:#14233A;font-size:15px;--f-bg:#fff;--f-ink:#14233A;--f-muted:#5B6B82;--f-line:#DCE3EC;--f-soft:#F3F6FA}
    .btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;cursor:pointer;background:#fff;display:inline-flex;gap:6px;align-items:center}.btn-primary{background:#1763B3;color:#fff;border-color:#1763B3}.btn-success{background:#2E9E5B;color:#fff}.btn-sm{font-size:.8rem}.btn-link{border:0;background:none}
    .d-flex{display:flex}.gap-2{gap:8px}.ms-auto{margin-left:auto}.align-items-center{align-items:center}.justify-content-end{justify-content:flex-end}.form-control,.form-select{width:100%;box-sizing:border-box;padding:4px 6px}.row{display:flex;flex-wrap:wrap}.col-sm-4{width:33%;box-sizing:border-box;padding:0 4px}.col-sm-6{width:50%;box-sizing:border-box;padding:0 4px}
    .modal{position:fixed;inset:0;background:rgba(0,0,0,.45);overflow:auto;z-index:1050}.modal-dialog{max-width:1140px;margin:20px auto}.modal-content{background:var(--f-bg,#fff);border-radius:12px;overflow:hidden}.modal-header,.modal-footer{display:flex;gap:8px;align-items:center;padding:10px 14px}
    .mp219-lapis{position:fixed;inset:0;background:rgba(10,20,40,.5);display:flex;align-items:flex-start;justify-content:center;overflow:auto;z-index:1060;padding:16px;box-sizing:border-box}.mp219-dlg{background:#fff;border-radius:12px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.3)}.mp219-dh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #DCE3EC}.mp219-dh h5{margin:0}
    .mp219-tb{width:100%;border-collapse:collapse}.mp219-tb th,.mp219-tb td{border-bottom:1px solid #DCE3EC;padding:5px 6px;text-align:left;font-size:.8rem}.mp219-tw{overflow-x:auto}
    .alert{padding:8px 12px;border-radius:8px;margin:8px 0}.alert-warning{background:#FFF4D6}.alert-danger{background:#FDE2E2}.small{font-size:.82rem}.text-muted{color:#6B7A90}.p-0{padding:0}.m-3{margin:12px}.mt-2{margin-top:8px}.mt-1{margin-top:4px}.me-1{margin-right:4px}.me-2{margin-right:8px}
    .app-header{display:flex;justify-content:flex-end;padding:8px 16px;background:#0B1F3A;color:#fff}.dropdown-menu{list-style:none;margin:0;padding:0;display:flex;gap:10px}.dropdown-item{color:#fff}
    #tab-keuangan{padding:16px}</style><style>${css}</style></head>
    <body><header class="app-header"><div class="menu-akun"><ul class="dropdown-menu"><li><a class="dropdown-item" href="#">Profil</a></li></ul></div></header><div id="tab-keuangan"><h3>Keuangan</h3><div id="keuIsi"></div></div></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(([P, progres, vendor]) => {
    const nama = 'Joko Supriyono', pin = '1234';
    window.REG = { url: 'https://contoh/exec', sesi: { nama, admin: true, peran: 'PENGADAAN' } };
    window.PROYEK = { id: P, nama: 'Rehabilitasi Jaringan Irigasi D.I/D.I.R Sumsel', namaLengkap: 'Rehabilitasi Jaringan Irigasi D.I/D.I.R Sumatera Selatan', kso: 'WASKITA - NINDYA KSO', kapro: 'DEDY HARIYANTO', kasi: 'JOKO SUPRIYONO' };
    window.PROG = { data: progres }; window.barisBK = x => ({ vendor: vendor[x.id] || '-' });
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.notif = (m, t) => { (window.__notif = window.__notif || []).push([m, t]); }; window.mp220Srv = f => true; window.MP250_JEDA = [1, 1];
    window.tampilModal = (id, ya) => { const m = document.getElementById(id); m.style.display = ya ? 'block' : 'none'; m.classList.toggle('show', !!ya); };
    window.unggahPdf = async (file) => { const b = new Uint8Array(await file.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return JSON.parse(await window.simpanBerkas(file.name, btoa(s))); };
    window.regAksi = async (a, extra) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {})))); if (!r.ok) throw new Error(r.error); return r; };
    window.bukaTab = () => { };
  }, [P, progres, vendor]);
  await pg.addScriptTag({ content: keu }); await pg.addScriptTag({ content: vt }); await pg.addScriptTag({ content: mp241 }); await pg.addScriptTag({ content: mp250 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.evaluate(() => window.renderKeuangan());
  await pg.waitForFunction(() => document.querySelectorAll('#keuIsi .mp219-aksi button.v').length >= 3, null, { timeout: 8000 });
  console.log('Kantor AI (2.5.5)');
  await pg.waitForSelector('#mp250MenuTim', { state: 'attached', timeout: 5000 });
  ok(await pg.evaluate(() => !document.getElementById('mp250MenuTim').parentElement.hidden), 'menu akun: "Tim AI Proyek" tampil');
  const cm = await pg.evaluate(() => typeof window.itemCmdk === 'function' ? (window.itemCmdk('tim ai') || []).map(x => x.l) : ['(tanpa cmdk)']);
  await pg.click('#mp250MenuTim'); await pg.waitForSelector('.mp250-kosong, .mp250-ring', { timeout: 10000 });
  ok(/Tim belum pernah bekerja/.test(await pg.textContent('.mp250-isi')), 'dialog Tim AI terbuka (belum ada laporan)');
  await pg.evaluate(() => { window.__kerja = false; new MutationObserver(() => { if (document.querySelector('.mp250-kerja')) window.__kerja = true; }).observe(document.body, { childList: true, subtree: true }); });
  await pg.click('#mp250Jalan'); await pg.waitForSelector('.mp250-ring', { timeout: 120000 });
  ok(await pg.evaluate(() => window.__kerja), 'status "Tim AI sedang bekerja" tampil saat berjalan');
  const t1 = await pg.textContent('.mp250-isi');
  ok(/Hasil kerja Verifikator Tagihan/.test(t1) && /Saran prioritas/.test(t1) && /Tim memverifikasi tagihan berbundel/.test(t1), 'laporan: ringkasan AI, hasil Verifikator, saran prioritas');
  const nK = await pg.$$eval('.mp250-kartu', x => x.length); ok(nK >= 2, nK + ' kartu saran');
  await pg.screenshot({ path: OUT + '/tim-ai-laporan.png', fullPage: false });
  const kAksi = await pg.$('.mp250-kartu:has(code) button.btn-primary'); await kAksi.click();
  await pg.waitForSelector('.mp250-hasil pre', { timeout: 10000 });
  ok(/Baca data utama|total/.test(await pg.textContent('.mp250-hasil')), 'saran beraksi "Jalankan" → hasil aksi baca tampil di kartu');
  const n1 = await pg.$$eval('.mp250-kartu', x => x.length);
  await pg.click('.mp250-kartu footer button:has-text("Tandai selesai")'); await pg.waitForTimeout(400);
  ok(await pg.$$eval('.mp250-kartu', x => x.length) === n1 - 1, 'Tandai selesai → saran disembunyikan dari daftar aktif');
  await pg.selectOption('.mp250-flt', 'semua'); ok(await pg.$$eval('.mp250-kartu.redup', x => x.length) === 1, 'saring "Semua" menampilkan saran selesai (redup)');
  await pg.click('.mp250-tabs button:has-text("Anggota")'); ok((await pg.$$eval('.mp250-ang section', x => x.length)) >= 5 && /Verifikator Tagihan/.test(await pg.textContent('.mp250-ang')), 'tab Anggota: 5 anggota + log kerja');
  await pg.screenshot({ path: OUT + '/tim-ai-anggota.png' });
  await pg.click('.mp250-tabs button:has-text("Riwayat")'); ok(/Joko Supriyono/.test(await pg.textContent('.mp250-isi')), 'tab Riwayat');
  await pg.click('.mp250-tabs button:has-text("Antrean")'); ok(await pg.$('.mp250-isi') !== null, 'tab Antrean');
  await pg.click('.mp250-tabs button:has-text("Setelan")'); await pg.fill('#mp250SJam', '7, 16'); await pg.click('#mp250SOk'); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => (window.__notif || []).some(n => /Setelan Tim AI disimpan/.test(n[0]) || /Tim AI/.test(n[0]))), 'setelan Admin tersimpan');
  await pg.click('.mp250-tabs button:has-text("Instruksi")'); await pg.waitForSelector('.mp255-ins', { timeout: 5000 });
  const ti = await pg.textContent('.mp250-isi');
  ok(/Lengkapi register kontrak SPSA/.test(ti) && /Keuangan/.test(ti) && /Antrean Petugas Input AI/.test(ti) && (await pg.$$eval('.mp250-isi .mp250-kartu', x => x.length)) >= 2, 'tab Instruksi & Input: instruksi Manajer per fungsi + antrean Petugas Input');
  await pg.screenshot({ path: OUT + '/kantor-ai-instruksi.png' });
  await pg.selectOption('.mp250-isi .mp250-flt', 'aktif'); await pg.waitForTimeout(200);
  const nIn = await pg.$$eval('.mp250-isi .mp250-kartu', x => x.length); await pg.click('.mp250-isi .mp250-kartu footer button:has-text("Tandai selesai")'); await pg.waitForTimeout(400);
  ok((await pg.$$eval('.mp250-isi .mp250-kartu', x => x.length)) === nIn - 1, 'tugas input ditandai selesai → hilang dari antrean');
  await pg.click('.mp250-tabs button:has-text("Draf")'); await pg.waitForSelector('.mp255-draf textarea', { timeout: 5000 });
  ok(/faktur pajak ganda/.test(await pg.inputValue('#mp255D0')) && /CV Rizki Kurnia/.test(await pg.textContent('.mp255-draf')), 'tab Draf Surat: draf Staf Administrasi AI dapat disunting');
  await pg.evaluate(() => { window.__salin = ''; navigator.clipboard.writeText = async t => { window.__salin = t; }; }); await pg.click('.mp255-draf footer button:has-text("Salin")');
  ok(/faktur pajak ganda/.test(await pg.evaluate(() => window.__salin)), 'tombol Salin menyalin draf');
  await pg.screenshot({ path: OUT + '/kantor-ai-draf.png' });
  const pem = []; C.ScriptApp = { getProjectTriggers: () => pem.slice(), deleteTrigger: t => pem.splice(pem.indexOf(t), 1), newTrigger: f => { const t = { getHandlerFunction: () => f, getUniqueId: () => 'T' }; const c = { timeBased: () => c, everyDays: () => c, everyHours: h => { t.perJam = h; return c; }, atHour: () => c, nearMinute: () => c, inTimezone: () => c, create: () => { pem.push(t); return t; } }; return c; } };
  await pg.click('.mp250-tabs button:has-text("Setelan")'); await pg.check('#mp255STerus'); await pg.selectOption('#mp255SInt', '2'); await pg.fill('#mp255SMul', '7'); await pg.fill('#mp255SSel', '18'); await pg.click('#mp250SOk'); await pg.waitForTimeout(600);
  const sP = post({ action: 'timInfo', nama: 'Joko Supriyono', pin: '1234', proyek: P }).setelan;
  ok(pem.length === 1 && pem[0].perJam === 1 && sP.aktif && sP.terus && sP.interval === 2 && sP.jamMulai === 7 && sP.jamSelesai === 18 && /terus-menerus tiap 2 jam/.test(await pg.textContent('.mp250-status')), 'setelan Mode terus-menerus tersimpan & tampil di status');
  await pg.evaluate(() => { try { localStorage.setItem('mp255Lihat_' + PROYEK.id + '_Joko Supriyono', '2000-01-01'); } catch (e) { } window.mp250Tutup(); window.__notif = []; });
  await pg.evaluate(() => window.mp255Cek()); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => (window.__notif || []).some(n => /Kantor AI: laporan baru/.test(n[0]))) && /\d/.test(await pg.textContent('#mp250MenuTim .mp255-lencana')), 'laporan baru diberitahukan otomatis + lencana jumlah tugas di menu akun');
  await pg.click('#mp250MenuTim'); await pg.waitForSelector('.mp250-tabs', { timeout: 10000 });
  await pg.click('.mp250-tabs button:has-text("Laporan")'); await pg.waitForSelector('.mp250-ring', { timeout: 5000 });
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(300);
  const lebar = await pg.evaluate(() => { const d = document.querySelector('.mp250-dlg'), r = d.getBoundingClientRect(); return { kanan: Math.round(r.right), layar: document.documentElement.clientWidth, luap: d.scrollWidth - d.clientWidth, isi: document.querySelector('.mp250-isi').scrollWidth - document.querySelector('.mp250-isi').clientWidth }; });
  ok(lebar.isi <= 1 && lebar.luap <= 1 && lebar.kanan <= lebar.layar, 'tampilan ponsel 390 px: tanpa geser horizontal (' + JSON.stringify(lebar) + ')');
  await pg.screenshot({ path: OUT + '/tim-ai-ponsel.png' });
  ok(!galatJS.length, 'tanpa galat JavaScript' + (galatJS.length ? ': ' + galatJS.join(' | ') : ''));
  console.log('  (Ctrl+K: ' + cm.join(' | ') + ')');
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
