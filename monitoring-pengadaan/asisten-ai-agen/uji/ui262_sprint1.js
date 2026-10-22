// Uji UI 2.6.2 (blok Sprint 1 di atas 2.6.1) di Chromium (Sprint 1): lonceng berjenjang Kritis/Warning/Info, Tandai ditangani, Prioritas Hari Ini, Register per halaman,
// tooltip dokumen kurang di Keuangan & Bayar, Jejak Audit (server 1.8.6 asli lewat harness). Aplikasi dasar ditiru seperlunya (lonceng 2.2.0, tabel register & keuangan).
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const { C, K, P, ADM, STF } = require('./vt_data.js')();
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.7.json', 'utf8')), js = PK.js, css = PK.css, mp258 = js.slice(js.indexOf('/* MP258 — PEMBARUAN'));
const hari = d => { const t = new Date(Date.now() + d * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
// data kontrak: 30 kontrak (agar register > 25 baris), beberapa lewat jatuh tempo, 2 draf Rp 0
const REGD = [];
for (let i = 1; i <= 30; i++) REGD.push({ id: 'R' + i, noKontrak: String(i).padStart(3, '0') + '/SPSA/WK/2026', namaVendor: 'Vendor ' + i, nilai: 1e7 * i, diposting: true, versi: 1, status: 'DIPOSTING',
  tglSelesai: hari(i === 1 ? -123 : i === 2 ? -40 : i === 3 ? -5 : i === 4 ? 0 : i === 5 ? 6 : i === 6 ? 25 : 200), dibuatPada: new Date(Date.now() - 90 * 864e5).toISOString() });
REGD.push({ id: 'D1', noKontrak: '031/SPM/WK/2026', namaVendor: 'CV Draf Lama', nilai: 0, diposting: false, versi: 1, status: 'DRAF', dibuatPada: new Date(Date.now() - 45 * 864e5).toISOString() });
REGD.push({ id: 'D2', noKontrak: '032/SPM/WK/2026', namaVendor: 'CV Draf Baru', nilai: 0, diposting: false, versi: 1, status: 'DRAF', dibuatPada: new Date(Date.now() - 3 * 864e5).toISOString() });
// log: beberapa aksi agar Jejak Audit berisi
STF('save', { data: { noKontrak: '099/SPSA/WK/2026', noPO: '45001', items: [] } });   // ditolak gerbang
const cl = JSON.parse(C.__sheets[P + '_ChecklistTagihan'].rows.find(x => x[0] === 'TSPSA')[6]); delete cl.items.UMUM_05; delete cl.items.ALAT_04;
K.cl217SimpanBaris_(P, cl, C.__sheets[P + '_ChecklistTagihan'].rows.findIndex(x => x[0] === 'TSPSA') + 1);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#E9EEF5;--f-bg:#fff;--f-ink:#14233A;--f-muted:#5B6B82;--f-line:#DCE3EC;--f-soft:#F3F6FA}
    .app-header{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;background:#0B1F3A}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff;cursor:pointer}.btn-primary{background:#1763B3;color:#fff}.card{background:#fff;border-radius:10px;padding:10px;margin:12px 16px}
    .mp220-bell-w{position:relative}.mp220-bell{position:relative;width:36px;height:34px}.mp220-bell b{position:absolute;top:-7px;right:-7px;background:red;color:#fff;border-radius:9px;padding:0 4px;font-size:11px}.mp220-bell b[hidden]{display:none}
    table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #DCE3EC;padding:5px;font-size:.8rem;text-align:left}.form-select,.form-control{padding:3px 6px}.btn-close{width:24px;height:24px}.btn-close::after{content:'×'}</style><style>${css}</style></head>
    <body><div class="app-header"><div class="mp220-bell-w"><button type="button" id="mp220Bell" class="btn mp220-bell" onclick="mp220Lonceng()">🔔<b id="mp220BellN" hidden>0</b></button><div id="mp220Panel" hidden></div></div><div class="menu-akun"><button class="btn">Joko</button></div></div>
    <div id="tab-dashboard-tagihan"><div class="card"><h4>Dashboard</h4></div></div>
    <div id="tab-register" class="card"><div class="table-responsive"><table><thead><tr><th>Kontrak</th><th>Vendor</th><th>Nilai</th></tr></thead><tbody id="regBody"></tbody></table></div></div>
    <div id="tab-keuangan" class="card"></div></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(([P, REGD, hari0]) => {
    const nama = 'Joko Supriyono', pin = '1234';
    window.REG = { url: 'https://contoh/exec', sesi: { nama, admin: true, peran: 'PENGADAAN' }, data: REGD, filter: 'semua' }; window.PROYEK = { id: P, nama: 'Uji' };
    window.PROG = { data: [{ id: 'TSPM', noKontrak: '001/SPM', nilai: 45031500, nomorBA: 'BK-1', bayar: { status: 'BELUM' } }, { id: 'TSPSA', noKontrak: '001/SPSA', nilai: 118500000, nomorBA: 'BK-2', bayar: { status: 'DIAJUKAN' } }, { id: 'TX', noKontrak: '009/SPPP', nilai: 5e6, nomorBA: 'BK-3' }] };
    const fitur = ['dokKurang', 'jejakAudit', 'eskalasiNotif', 'gerbangNilai'];
    window.mp220Srv = f => fitur.includes(f);
    window.notif = (m, t) => { (window.__notif = window.__notif || []).push([m, t]); };
    window.regAksi = async (a, extra) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {})))); if (!r.ok) throw new Error(r.error); return r; };
    window.bukaEditReg = id => { window.__buka = 'reg:' + id; }; window.bukaKoreksi = k => { window.__buka = 'kor:' + k; }; window.cl217Buka = id => { window.__buka = 'cl:' + id; }; window.bukaTab = t => { window.__tab = t; };
    window.semuaKontrak214 = () => REG.data.map(r => ({ t: 'reg', r, key: r.noKontrak, vendor: r.namaVendor, statusKey: 'berjalan' }));
    const sisa = t => Math.round((Date.parse(t + 'T00:00:00') - Date.parse(hari0 + 'T00:00:00')) / 864e5);
    window.mp220Masa = x => { const t = x.r.tglSelesai; if (!t) return { k: 'kosong' }; const s = sisa(t); return { k: s < 0 ? 'lewat' : s <= 30 ? 'h30' : 'aman', tgl: t, sisa: s, label: s < 0 ? 'Lewat ' + (-s) + ' h' : s === 0 ? 'Hari ini' : 'H-' + s }; };
    window.mp220NotifDaftar = () => [{ g: 'dokumen', urg: 0, sisa: -3, judul: 'SIUP · CV Gema', ket: 'Berlaku s.d. kemarin', nilai: 'Lewat 3 h', buka: "window.__buka='arsip'" },
      { g: 'tagihan', urg: 3, sisa: 40, judul: 'BK-2 · CV Gema', ket: 'Dokumen 23/25', nilai: '92%', buka: "cl217Buka('TSPSA')" }];
    window.__asliLonceng = 0; window.mp220Lonceng = () => { window.__asliLonceng++; document.getElementById('mp220Panel').hidden = false; }; window.mp220TutupPanel = () => { document.getElementById('mp220Panel').hidden = true; };
    window.renderRegister = function () { document.getElementById('regBody').innerHTML = REG.data.map(r => `<tr data-id="${r.id}" class="baris-kontrak"><td>${r.noKontrak}</td><td>${r.namaVendor}</td><td>${r.nilai}</td></tr>`).join(''); };
    window.renderRegister();
    document.getElementById('tab-keuangan').innerHTML = `<table class="mp219-tb"><tbody>${PROG.data.map(e => `<tr><td>${e.nomorBA}</td><td data-l="Kelengkapan"><div class="mp219-pg"><b>?</b></div></td><td><button type="button" onclick="cl217Buka('${e.id}')">Checklist</button></td></tr>`).join('')}</tbody></table>`;
  }, [P, REGD, hari(0)]);
  await pg.addScriptTag({ content: mp258 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.waitForSelector('#mp258N:not([hidden])', { timeout: 8000 });
  console.log('1. Lonceng berjenjang');
  const lenc = await pg.evaluate(() => ({ n: document.getElementById('mp258N').textContent, kls: document.getElementById('mp258N').className, t: document.getElementById('mp220Bell').title, asli: getComputedStyle(document.getElementById('mp220BellN')).display, N: MP258_NT.n }));
  // Kritis: kontrak -123, -40 (H+30), -5, 0 (H+0) = 4 · draf D1 > 30 h = 1 · dokumen lewat = 1 → 6; Warning: kontrak H-7 (6 h) + draf D2 = 2; Info: kontrak 25 h + tagihan = 2
  ok(lenc.n === '6' && lenc.kls === 'kritis' && lenc.asli === 'none', 'angka lonceng = jumlah Kritis saja (6), bukan seluruh butir (' + (lenc.N.KRITIS + lenc.N.WARNING + lenc.N.INFO) + ')');
  ok(lenc.N.WARNING === 2 && lenc.N.INFO === 2 && /Kritis 6 · Warning 2 · Info 2/.test(lenc.t), 'judul lonceng: ' + lenc.t);
  await pg.click('#mp220Bell'); await pg.waitForSelector('#mp258Panel:not([hidden])');
  ok(await pg.evaluate(() => window.__asliLonceng === 1 && document.getElementById('mp220Panel').hidden), 'lonceng lama tetap memuat data, panelnya diganti panel prioritas');
  const it = await pg.$$eval('#mp258Panel .mp258-it', a => a.map(x => x.querySelector('.g').textContent.trim() + ' | ' + x.querySelector('.t > b').textContent));
  ok(it.length === 6 && /H\+30/.test(it[0]) && /001\/SPSA/.test(it[0]) && /H\+30/.test(it[1]) && /H\+0/.test(it[2]), 'tab Kritis: H+30 (eskalasi) paling atas → ' + it.slice(0, 3).map(s => s.split(' | ')[0]).join(' ; '));
  ok(it.some(s => /Draf Rp 0 · > 30 h/.test(s)) && it.some(s => /Dokumen vendor/.test(s)), 'draf Rp 0 > 30 hari & dokumen kedaluwarsa ikut Kritis');
  await pg.screenshot({ path: OUT + '/sprint1-lonceng.png', clip: { x: 760, y: 0, width: 600, height: 640 } });
  await pg.click('#mp258Panel .mp258-tabs button.warning');
  ok((await pg.$$eval('#mp258Panel .mp258-it', a => a.map(x => x.textContent))).some(s => /H-7/.test(s) && /005\/SPSA/.test(s)), 'tab Warning: kontrak H-7');
  await pg.click('#mp258Panel .mp258-tabs button.kritis');
  await pg.click('#mp258Panel .mp258-it:first-child .ok');
  const st = await pg.evaluate(() => ({ n: document.getElementById('mp258N').textContent, tg: MP258_NT.n.tangani, ls: Object.keys(JSON.parse(localStorage.getItem('mp258Tangani_' + PROYEK.id + '_Joko Supriyono') || '{}')) }));
  ok(st.n === '5' && st.tg === 1 && /H\+30\|KRITIS$/.test(st.ls[0]), 'Tandai ditangani: Kritis 6 → 5, disimpan per pengguna (' + st.ls[0].split('|').slice(-2).join('|') + ')');
  await pg.evaluate(() => { REG.data.find(r => r.id === 'R3').tglSelesai = REG.data.find(r => r.id === 'R2').tglSelesai; MP258_NT.tab = 'tangani'; mp258Hitung(); });
  ok(await pg.evaluate(() => MP258_NT.n.tangani === 1), 'butir lain tidak terpengaruh');
  await pg.evaluate(() => { const x = MP258_NT.L.find(y => y.tangani); mp258Tangani(MP258_NT.L.indexOf(x)); });
  ok(await pg.evaluate(() => MP258_NT.n.tangani === 0 && document.getElementById('mp258N').textContent === '6'), 'Kembalikan dari tab Ditangani');
  await pg.evaluate(() => { MP258_NT.tab = 'KRITIS'; mp258Panel(); });
  await pg.click('#mp258Panel .mp258-it:first-child .t');
  ok(await pg.evaluate(() => window.__buka === 'reg:R1' && document.getElementById('mp258Panel').hidden), 'klik butir membuka kontrak & menutup panel');
  console.log('2. Prioritas Hari Ini (Dashboard)');
  await pg.waitForFunction(() => /\d+\/3/.test((document.getElementById('mp258Ringkas') || {}).textContent || ''), null, { timeout: 8000 });
  const rk = await pg.$$eval('#mp258Ringkas .mp258-k', a => a.map(x => x.querySelector('.l').textContent + '=' + x.querySelector('b').textContent));
  ok(rk[0] === 'Kritis=6' && rk[1] === 'Kontrak lewat jatuh tempo=4' && rk[2] === 'Draf kontrak Rp 0=2' && rk[3] === 'Tagihan belum diproses bayar=2', 'kartu: ' + rk.slice(0, 4).join(' · '));
  ok(/Dokumen tagihan lengkap=1\/3/.test(rk[4]), 'kelengkapan dokumen dari server 1.8.6: ' + rk[4]);
  const dr = await pg.$$eval('#mp258Draf .r', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(dr.length === 2 && /031\/SPM.*mandek > 30 hari/.test(dr[0]), 'daftar Draf Rp 0 (terlama di atas, mandek > 30 hari)');
  await pg.click('#mp258Draf .r button'); ok(await pg.evaluate(() => window.__buka === 'reg:D1'), 'tombol Lanjutkan membuka form kontrak');
  await pg.screenshot({ path: OUT + '/sprint1-prioritas.png', clip: { x: 0, y: 50, width: 1360, height: 330 } });
  console.log('3. Register per halaman');
  let pgr = await pg.evaluate(() => ({ tampil: [...document.querySelectorAll('#regBody tr')].filter(r => !r.hidden).length, txt: document.getElementById('mp258RegPager').textContent.replace(/\s+/g, ' ') }));
  ok(pgr.tampil === 25 && /1–25.*32 kontrak.*1 \/ 2/.test(pgr.txt), 'halaman 1: 25 dari 32 kontrak');
  await pg.click('#mp258RegPager button[aria-label="Halaman berikutnya"]');
  pgr = await pg.evaluate(() => ({ tampil: [...document.querySelectorAll('#regBody tr')].filter(r => !r.hidden).map(r => r.dataset.id) }));
  ok(pgr.tampil.length === 7 && pgr.tampil[0] === 'R26', 'halaman 2: 7 baris (mulai R26)');
  await pg.selectOption('#mp258RegPager select', '0');
  ok(await pg.evaluate(() => [...document.querySelectorAll('#regBody tr')].every(r => !r.hidden)), 'pilihan "Semua" menampilkan seluruh baris');
  await pg.evaluate(() => { MP258_PG.per = 25; REG.data = REG.data.slice(0, 10); renderRegister(); });
  ok(await pg.evaluate(() => document.getElementById('mp258RegPager').hidden && [...document.querySelectorAll('#regBody tr')].every(r => !r.hidden)), 'filter ≤ 25 baris → tanpa pager');
  console.log('4. Dokumen kurang (Keuangan & Bayar)');
  await pg.waitForFunction(() => document.querySelectorAll('#tab-keuangan .mp258-dk').length === 3, null, { timeout: 8000 });
  const tt = await pg.$$eval('#tab-keuangan .mp258-dk', a => a.map(x => x.title));
  ok(/Semua 25 dokumen wajib lengkap/.test(tt[0]) && /Dokumen kurang \(2\/25\): Faktur Pajak, Rekap Timesheet Alat/.test(tt[1]) && /Checklist belum diisi/.test(tt[2]), 'tooltip: ' + tt[1]);
  await pg.click('#tab-keuangan tr:nth-child(2) .mp258-dk'); await pg.waitForSelector('#mp258Pop');
  ok(/Templat Sewa Alat/.test(await pg.textContent('#mp258Pop')) && (await pg.$$('#mp258Pop li')).length === 2, 'ketuk → daftar dokumen kurang (templat Sewa Alat) + Buka Checklist');
  await pg.screenshot({ path: OUT + '/sprint1-dokumen-kurang.png', clip: { x: 0, y: 380, width: 700, height: 360 } });
  await pg.click('#mp258Pop button'); ok(await pg.evaluate(() => window.__buka === 'cl:TSPSA' && !document.getElementById('mp258Pop')), 'Buka Checklist dari popover');
  console.log('5. Jejak Audit');
  await pg.click('#mp258Ringkas .mp258-rk-h button'); await pg.waitForSelector('#mp258Au .mp258-tb tbody tr');
  let au = await pg.$$eval('#mp258Au .mp258-tb tbody tr', a => a.map(x => x.textContent));
  ok(au.length > 0 && au.some(s => /GERBANG NILAI DITOLAK/.test(s)), 'daftar log terbaru (' + au.length + ' baris), termasuk penolakan gerbang nilai');
  await pg.selectOption('#mp258Au select[aria-label="Aksi"]', 'GERBANG NILAI DITOLAK');
  await pg.waitForFunction(() => document.querySelectorAll('#mp258Au .mp258-tb tbody tr').length === 1);
  ok(/Staf Pengadaan/.test(await pg.textContent('#mp258Au .mp258-tb tbody')), 'filter aksi');
  await pg.screenshot({ path: OUT + '/sprint1-jejak-audit.png' });
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#mp258Au .btn-outline-success')]);
  const isi = fs.readFileSync(await dl.path(), 'utf8');
  ok(/^Jejak-Audit-1726012-\d{4}-\d{2}-\d{2}\.xls$/.test(dl.suggestedFilename()) && /GERBANG NILAI DITOLAK/.test(isi) && /terfilter/.test(isi), 'ekspor Excel: ' + dl.suggestedFilename());
  await pg.keyboard.press('Escape');
  await pg.evaluate(() => { REG.sesi.admin = false; mp258Ringkas(); });
  ok(!(await pg.$('#mp258Ringkas .mp258-rk-h button')), 'tombol Jejak Audit hanya untuk Admin');
  console.log('6. Tampilan HP');
  await pg.setViewportSize({ width: 390, height: 800 }); await pg.evaluate(() => { REG.sesi.admin = true; window.scrollTo(0, 0); }); await pg.click('#mp220Bell'); await pg.waitForSelector('#mp258Panel:not([hidden])');
  const bx = await pg.evaluate(() => { const r = document.getElementById('mp258Panel').getBoundingClientRect(); return { l: r.left, r: r.right, sw: document.documentElement.scrollWidth }; });
  ok(bx.l >= 0 && bx.r <= 390 && bx.sw <= 390, 'panel muat di layar 390 px tanpa gulir samping');
  await pg.screenshot({ path: OUT + '/sprint1-hp.png' });
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji UI Sprint 1 (2.6.6)');
})().catch(e => { console.error(e); process.exit(1); });
