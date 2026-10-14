// Uji UI 2.3.0+ (paket 2.4.0) di Chromium: menu Keuangan & Bayar (blok MP219 asli) + Verifikasi Tagihan (MP230) → regAksi → kernel Code.gs + modul 1.7.0 asli.
// Data: transkripsi 3 berkas tagihan nyata (vt_data.js); AI pembaca PDF ditiru.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const { C, K, P, ADM } = require('./vt_data.js')();
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.4.4.json', 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const keu = potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'), vt = potong('/* MP230 — PEMBARUAN');
const progres = K.bacaKoleksi_(P, 'progres').map(x => Object.assign({ periode: 'Juli 2025', periodeKey: 202507, baTerbit: '2025-07-18' }, x));
const vendor = { TSPM: 'CV Berkah Bintang Harapan', TSPSA: 'CV Gema Multi Kencana', TSPPP: 'CV Rizki Kurnia' };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } });
  const galatJS = []; pg.on('pageerror', e => galatJS.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
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
    window.regAksi = async (a, extra) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {})))); if (!r.ok) throw new Error(r.error); return r; };
  }, [P, progres, vendor]);
  await pg.addScriptTag({ content: keu }); await pg.addScriptTag({ content: vt });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.evaluate(() => window.renderKeuangan());
  // 1. Daftar Tagihan: tab baru + lencana + tombol per baris
  await pg.waitForSelector('#keuIsi .mp219-tabs [data-vt]', { timeout: 8000 });
  await pg.waitForFunction(() => document.querySelectorAll('#keuIsi .mp219-aksi button.v').length === 3, null, { timeout: 8000 });
  ok(/Verifikasi Dokumen/.test(await pg.textContent('#keuIsi .mp219-tabs [data-vt]')), 'tab "Verifikasi Dokumen" ada di menu Keuangan & Bayar');
  ok(await pg.locator('#keuIsi .mp230-sel .mp230-bd').count() === 3 && /Belum diverifikasi/.test(await pg.textContent('#keuIsi .mp230-sel')), 'Daftar Tagihan: lencana "Belum diverifikasi" + tombol Verifikasi per baris');
  // 2. Dasbor & verifikasi massal
  await pg.click('#keuIsi .mp219-tabs [data-vt]'); await pg.waitForSelector('#keuIsi .mp230-dash .mp230-kpi');
  ok(/Verifikasi semua yang lengkap \(3\)/.test(await pg.textContent('.mp230-kp-a')), 'dasbor: tombol verifikasi massal (3 tagihan lengkap)');
  await pg.click('.mp230-kp-a .mp219-btn-p');
  await pg.waitForFunction(() => !window.MP230_VT.massal && Object.keys(window.MP230_VT.ringkas).length === 3, null, { timeout: 20000 });
  const kpi = await pg.$$eval('.mp230-k b', L => L.map(x => x.textContent));
  ok(kpi.join() === '0,0,3,0', 'KPI setelah verifikasi: belum 0 · lolos 0 · butuh revisi 3 · kedaluwarsa 0');
  ok(/rekening|Rekening/.test(await pg.textContent('.mp230-dash tbody')), 'tabel dasbor menampilkan temuan utama (rekening)');
  await pg.screenshot({ path: OUT + '/vt-dasbor.png', fullPage: true });
  // 3. Laporan di modal checklist (tab Verifikasi AI)
  await pg.evaluate(() => window.mp230Buka('TSPSA'));
  await pg.waitForSelector('#mp219ClPanel .mp230-kep', { timeout: 8000 });
  ok(await pg.locator('#mp219Cl .mp219-tabs-s [data-vt].on').count() === 1, 'modal checklist: tab "Verifikasi AI" aktif');
  const lap = await pg.textContent('#mp219ClPanel');
  ok(/BUTUH REVISI/.test(lap) && /B03/.test(lap) && /I05/.test(lap) && /N05/.test(lap), 'laporan SPSA: B03 kritis, I05 mayor, N05 minor');
  ok(await pg.locator('#mp219ClPanel .mp230-sek').first().locator('tbody tr').count() === 6 && /digantikan BAPA|dipenuhi: BAPA/.test(lap), 'Tabel Status 6 dokumen wajib, BAPM dipenuhi BAPA');
  ok(/Rekap Nilai Terbaca/.test(lap) && /Rp 108\.625\.002/.test(lap), 'rekap nilai terbaca (DPP faktur Rp108.625.002) tampil');
  await pg.evaluate(() => { document.querySelector('#mp219Cl').scrollTop = 0; });
  await pg.screenshot({ path: OUT + '/vt-laporan.png' });
  await pg.evaluate(() => document.documentElement.setAttribute('data-tema', 'gelap')); await pg.screenshot({ path: OUT + '/vt-laporan-gelap.png' });
  await pg.evaluate(() => document.documentElement.removeAttribute('data-tema'));
  // 4. Keluaran cetak
  await pg.evaluate(() => window.mp230Cetak('TSPSA', 'ba')); await pg.waitForSelector('#mp230PvFrame');
  let doc = await pg.$eval('#mp230PvFrame', f => f.srcdoc);
  ok(/BERITA ACARA HASIL VERIFIKASI DOKUMEN TAGIHAN/.test(doc) && /CV Gema Multi Kencana/.test(doc) && /DEDY HARIYANTO/.test(doc) && /11889088986/.test(doc), 'BA Hasil Verifikasi: identitas, temuan, tanda tangan Kapro');
  await pg.waitForTimeout(300); await pg.screenshot({ path: OUT + '/vt-ba.png' });
  await pg.evaluate(() => window.mp230Cetak('TSPSA', 'surat')); doc = await pg.$eval('#mp230PvFrame', f => f.srcdoc);
  ok(/Permintaan Perbaikan Dokumen Tagihan/.test(doc) && /3 \(tiga\) hari kerja/.test(doc) && /Rekening di SPKTV/.test(doc), 'Surat Permintaan Perbaikan ke vendor berisi daftar temuan & batas waktu');
  await pg.waitForTimeout(300); await pg.screenshot({ path: OUT + '/vt-surat.png' });
  await pg.evaluate(() => window.mp230Tutup());
  const md = await pg.evaluate(async () => { let t = ''; const a = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(x => { t = x; }); return 'blob:x'; }; await window.mp230Unduh('TSPSA'); await new Promise(r => setTimeout(r, 100)); URL.createObjectURL = a; return t; });
  ok(/## 1\. Tabel Status Dokumen/.test(md) && /## 3\. Keputusan Akhir/.test(md) && /BUTUH REVISI/.test(md), 'ekspor .md 3 bagian');
  // 5. Setelan Admin → gerbang wajib
  await pg.evaluate(() => window.mp230Setelan()); await pg.waitForSelector('#mp230SProv');
  await pg.check('input[name="mp230SG"][value="wajib"]'); await pg.click('#mp230SOk'); await pg.waitForFunction(() => !document.getElementById('mp230Lapis'));
  ok(await pg.evaluate(() => window.MP230_VT.info.setelan.gerbang) === 'wajib', 'Setelan Admin: gerbang Wajib tersimpan di server');
  // 6. Gerbang di dialog Verifikasi Admin
  await pg.evaluate(() => window.mp219ClTab('checklist'));
  ok(await pg.locator('#mp219Cl .mp219-tabs-s [data-vt].on').count() === 0, 'pindah tab checklist: tab Verifikasi AI tidak lagi aktif');
  await pg.evaluate(() => window.mp219ClVerifikasi()); await pg.waitForSelector('#mp219Lapis .mp230-gb.no');
  ok(/BUTUH REVISI/.test(await pg.textContent('.mp230-gb')), 'dialog Verifikasi Admin menampilkan hasil AI + kolom alasan pengecualian');
  await pg.waitForTimeout(400); await pg.screenshot({ path: OUT + '/vt-gerbang.png' });
  await pg.check('#mp219VfAsli'); await pg.evaluate(() => window.mp219ClVerifikasiOk());
  ok(/minimal 20 karakter/.test(await pg.textContent('#mp219VfPesan')), 'gerbang wajib: tanpa alasan → ditahan di klien');
  await pg.fill('#mp230VfAlasan', 'Rekening dikonfirmasi via surat pernyataan vendor No. 12/GMK/VIII/2025');
  await pg.evaluate(() => window.mp219ClVerifikasiOk()); await pg.waitForFunction(() => !document.getElementById('mp219Lapis'), null, { timeout: 8000 });
  const log = K.bacaLog_(P).filter(l => l.aksi === 'VERIFIKASI ADMIN DENGAN CATATAN AI');
  ok(log.length === 1 && /surat pernyataan vendor/.test(log[0].detail), 'Verifikasi Admin dengan alasan → tercatat di Log server');
  // 7. Tampilan ponsel
  await pg.evaluate(() => { const m = document.getElementById('mp219Cl'); if (m) m.style.display = 'none'; window.mp219Keu({ tab: 'verifikasi' }); });
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'lebar ponsel 390px: tanpa scroll horizontal halaman');
  await pg.screenshot({ path: OUT + '/vt-ponsel.png', fullPage: false });
  ok(!galatJS.length, 'tanpa galat JavaScript' + (galatJS.length ? ': ' + galatJS.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
