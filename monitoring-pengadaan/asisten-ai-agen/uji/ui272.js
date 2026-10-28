// Uji UI 2.7.2 di Chromium (paket utuh per blok, server: kernel Code.gs 2.5.1 asli + modul 1.10.1):
//   A. Form Input Kontrak di dalam Register Kontrak · B. Ubah vendor baku di Master Data.
//   KODE_GS=…/Code.gs node uji/ui272.js [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const { buatKonteks } = require('./harness.js');
const C = buatKonteks(), K = C.__k;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]); const P = K.PROYEK_AWAL.id;
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
let r = post({ action: 'modulUnggah', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.10.1.json', 'utf8')) }); assert.ok(r.ok, r.error);
r = post({ action: 'modulTerbit', nama: 'Joko Supriyono', pin: '1234', proyek: P, versi: '1.10.1', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis ui272' }); assert.ok(r.ok, r.error);
const p = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.env.PAKET || 'pembaruan-2.7.2.json'), 'utf8'));
const TAB = ['dashboard-tagihan', 'form-bon', 'form-kontrak', 'register', 'form-progres'];
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0}#sidebar{width:220px;float:left}main{margin-left:230px;padding:10px}</style></head><body>
  <div class="app-header"><div class="menu-akun"><ul class="dropdown-menu"></ul></div><span id="judulHalaman"></span></div>
  <nav id="sidebar"><ul class="nav">
    <li class="nav-item"><a class="nav-link" onclick="showTab('dashboard-tagihan', event)">Dashboard Tagihan</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('form-bon', event)">Bon Permintaan</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('form-kontrak', event)">Form Input Kontrak</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('register', event)">Register Kontrak</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('form-progres', event)">Form Input Progres</a></li></ul></nav>
  <main>${TAB.map((t, i) => `<div id="tab-${t}" class="content-tab" style="display:${i ? 'none' : 'block'}"><h3>${t}</h3>${t === 'register' ? '<div class="card"><input type="search" placeholder="Cari no kontrak, vendor, PO, PR, item..."><table><tbody id="regBody"></tbody></table></div>' : t === 'form-kontrak' ? '<form id="formKontrak"><label>Jenis Kontrak</label><input id="fJenis"></form>' : ''}</div>`).join('')}</main>
  <nav id="navBawah"><button data-tab="form-kontrak">Kontrak</button><button data-tab="register">Register</button></nav>
  <div id="fabHome"></div><div id="besar"></div></body></html>`;
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 860 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  await pg.route('https://contoh.test/**', rt => { const q = rt.request(); const body = q.method() === 'POST' ? JSON.stringify(post(JSON.parse(q.postData()))) : JSON.stringify({ ok: true, versiServer: '2.5.1', fitur: ['masterTambahan', 'alokasiBon', 'masterDetail', 'alokasiBatal'] }); rt.fulfill({ body, contentType: 'application/json' }); });
  await pg.route('https://app.test/**', rt => rt.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.addScriptTag({ content: `var MASTER_MATERIALS = [], MASTER_SERVICES = [], MASTER_VENDORS = [{ id: '2100000000', name: 'Abaccura Indonesia, PT', city: 'Semarang' }, { id: '2100000001', name: 'Abadi Jaya', city: 'Cikarang' }, { id: '2100000002', name: 'Abdi Karya Usaha Raya, PT', city: 'Batam' }];
    var LOKAL = { post() { return { ok: false, error: 'mode lokal tidak dipakai di uji' }; }, db() { return {}; }, auth() { return {}; }, catat() { }, tulis() { } };
    var PROYEK = { id: '${P}' }; var REG = { url: 'https://contoh.test/exec', sesi: { nama: 'Joko Supriyono', pin: '1234', admin: true, peran: 'PENGADAAN', proyek: '${P}' }, data: [], dataSiap: true }; var PROG = { data: [] }, PMT = { data: [] };
    function showTab(n) { document.querySelectorAll('main .content-tab').forEach(t => { t.style.display = t.id === 'tab-' + n ? 'block' : 'none'; }); window.__tab = n; }
    var SIMPAN_DATA = { _d: {}, async get(k) { return this._d[k] || null; }, async set(k, v) { this._d[k] = v; } };
    function notif(m, t) { (window.__n = window.__n || []).push(m); } function kunciSnap() { return 'UJI_' + PROYEK.id; } function fmtRp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); } function fmtRpSingkat(n) { return fmtRp(n); } function renderRegister() { }
    function tampilModal(id, buka) { const m = document.getElementById(id); if (m) { m.style.display = buka ? 'block' : 'none'; m.classList.toggle('show', !!buka); } } function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function profilVendor(id, nama) { return { namaVendor: nama || '', nama: '', jabatan: '', alamat: '' }; }
    async function regPost(b) { return JSON.parse(await window.srvPost(JSON.stringify(b))); }
    async function regAksi(a, x) { const s = REG.sesi; const r = await regPost(Object.assign({ action: a, nama: s.nama, pin: s.pin, proyek: s.proyek }, x || {})); if (!r.ok) throw new Error(r.error); return r; }` });
  await pg.addStyleTag({ content: p.css });
  // blok Master Data 2.1.4 (IIFE __MP_214__, sudah memuat perbaikan di tempat 2.7.2) + blok MP272; paket utuh butuh HTML dasar
  const i214 = p.js.indexOf('(function () {\n    \'use strict\';\n    if (window.__MP_214__)'), j214 = p.js.indexOf('\n})();', i214) + 6;
  assert.ok(i214 > 0 && /mdBaku272/.test(p.js.slice(i214, j214)), 'blok Master Data dengan perbaikan 2.7.2 ditemukan');
  await pg.addScriptTag({ content: p.js.slice(i214, j214) });
  await pg.addScriptTag({ content: p.js.slice(p.js.indexOf('/* MP272'), p.js.indexOf('/* MP264 — PEMBARUAN')) });
  await pg.waitForTimeout(1200); if (process.env.DEBUG) console.log(gal.slice(0, 8)); gal.length = 0;
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  console.log('A. Form Input Kontrak di dalam Register Kontrak');
  const menu = await pg.$$eval('#sidebar .nav-link', x => x.filter(a => a.offsetParent).map(a => a.textContent));
  ok(!menu.includes('Form Input Kontrak') && menu.includes('Register Kontrak'), 'sidebar: Form Input Kontrak disembunyikan, Register Kontrak tetap');
  ok(!(await pg.isVisible('#navBawah [data-tab="form-kontrak"]')), 'navigasi bawah HP: tombol form kontrak disembunyikan');
  await pg.evaluate(() => showTab('register')); await pg.waitForSelector('#mp272BtnForm');
  ok(await pg.isVisible('#mp272BtnForm'), 'Register Kontrak punya tombol "Input Kontrak"');
  await pg.click('#mp272BtnForm');
  ok(await pg.evaluate(() => window.__tab === 'form-kontrak' && getComputedStyle(document.getElementById('tab-form-kontrak')).display === 'block' && !!document.getElementById('fJenis')), 'tombol membuka form kontrak asli (fungsi & isian tetap)');
  ok(await pg.isVisible('#mp272Kembali') && await pg.evaluate(() => [...document.querySelectorAll('#sidebar .nav-link.active')].map(a => a.textContent).join() === 'Register Kontrak'), 'bilah "← Register Kontrak" tampil & menu aktif = Register Kontrak');
  await pg.screenshot({ path: OUT + '/mp272-form.png' });
  await pg.click('#mp272Kembali button'); ok(await pg.evaluate(() => window.__tab === 'register'), 'tombol kembali membuka Register Kontrak');
  console.log('B. Master Data › Vendor baku › Ubah');
  await pg.evaluate(() => { showTab('masterdata'); MD214.jenis = 'VENDOR'; MD214.cari = ''; mdRender214(); }); await pg.waitForTimeout(1200); await pg.evaluate(() => mdRender214());
  const baris = () => pg.$$eval('#mdIsi tbody tr', x => x.map(t => t.textContent.replace(/\s+/g, ' ').trim()));
  let b = await baris(); ok(b.length === 3 && b.every(t => /Baku/.test(t)), 'tiga vendor baku tampil');
  ok(await pg.$$eval('#mdIsi tbody button[onclick^="mdBaku272"]', x => x.length) === 3, 'setiap baris baku punya tombol Ubah');
  await pg.click('#mdIsi tbody button[data-id="2100000001"]'); await pg.waitForSelector('#md_alamat', { state: 'attached' }); await pg.waitForTimeout(400);
  const f = await pg.evaluate(() => ({ nama: md_nama.value, kode: md_kodeSAP.value, ro: md_kodeSAP.readOnly, kota: md_kota.value, info: document.querySelector('#mp214MdIsi .alert').textContent }));
  ok(f.nama === 'Abadi Jaya' && f.kode === '2100000001' && f.ro && f.kota === 'Cikarang' && /vendor baku/.test(f.info), 'form terisi dari data baku (nama, ID SAP terkunci, kota)');
  await pg.evaluate(() => { md_alamat.value = 'Jl. Industri Selatan 5 Blok GG-3, Cikarang'; md_pimpinan.value = 'Budi Santoso'; md_npwp.value = '01.234.567.8-901.000'; md_telp.value = '021-8990001'; md_email.value = 'admin@abadijaya.co.id'; });
  await pg.screenshot({ path: OUT + '/mp272-ubah-baku.png' });
  await pg.evaluate(() => mdSimpan214()); await pg.waitForTimeout(1500); await pg.evaluate(() => mdRender214());
  b = await baris();
  const pel = b.find(t => /Abadi Jaya/.test(t));
  ok(b.filter(t => /Abadi Jaya/.test(t)).length === 1 && /Baku · dilengkapi/.test(pel) && /Jl\. Industri Selatan/.test(pel) && /Budi Santoso/.test(pel), 'tersimpan: satu baris "Baku · dilengkapi" dengan alamat & direktur (baris baku ganda disembunyikan)');
  ok(await pg.evaluate(() => MASTER_VENDORS.filter(v => String(v.id) === '2100000001').length === 1), 'daftar vendor di form tidak dobel (ID SAP sama)');
  ok(await pg.evaluate(() => profilVendor('2100000001', 'Abadi Jaya').alamat === 'Jl. Industri Selatan 5 Blok GG-3, Cikarang' && profilVendor('2100000001', 'Abadi Jaya').nama === 'Budi Santoso'), 'profil vendor (BA, kontrak, paket tagihan) memakai alamat & direktur baru');
  const srv = post({ action: 'bacaMasterTambahan', nama: 'Joko Supriyono', pin: '1234', proyek: P });
  ok(srv.ok && srv.data.length === 1 && srv.data[0].jenis === 'VENDOR', 'tersimpan di server sebagai master tambahan (master baku tidak diubah)');
  await pg.click('#mdIsi tbody button[onclick^="mdForm214"]'); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => md_alamat.value === 'Jl. Industri Selatan 5 Blok GG-3, Cikarang'), 'Ubah lagi membuka data pelengkap yang sama (tidak membuat baru)');
  await pg.screenshot({ path: OUT + '/mp272-master.png' });
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI 2.7.2'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
