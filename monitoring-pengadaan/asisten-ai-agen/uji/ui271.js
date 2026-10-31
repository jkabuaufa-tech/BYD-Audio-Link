// Uji UI 2.7.1 di Chromium (blok MP271, server: kernel Code.gs 2.5.1 asli + modul 1.10.1): mode Petugas Gudang, menu Admin, rute surat jalan, desimal.
//   KODE_GS=…/Code.gs node uji/ui2623.js [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const { buatKonteks } = require('./harness.js');
const C = buatKonteks(), K = C.__k;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' },
  { nama: 'Petugas Gudang', peran: 'LIHAT', pin: '2222', aktif: true, proyek: '*', jabatan: 'Staf Gudang' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]); const P = K.PROYEK_AWAL.id;
C.Utilities.base64Decode = t => [...Buffer.from(t, 'base64')].map(b => (b > 127 ? b - 256 : b));
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
let r = post({ action: 'modulUnggah', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.10.1.json', 'utf8')) }); assert.ok(r.ok, r.error);
r = post({ action: 'modulTerbit', nama: 'Joko Supriyono', pin: '1234', proyek: P, versi: '1.10.1', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis ui271' }); assert.ok(r.ok, r.error);
const fp = K.folderProyek_(P); let nU = 0; fp.createFile = () => { const id = 'UP' + (++nU); return { getId: () => id, getUrl: () => 'drive://' + id, setDescription() { } }; };
C.Utilities.newBlob = (b, t, n) => ({ nama: n, getBytes: () => b });
const js = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.7.1.json', 'utf8')), BLOK = js.js.slice(js.js.indexOf('/* MP271'), js.js.indexOf('/* MP264 — PEMBARUAN'));
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#E9EEF5}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-close::after{content:'×'}#sidebar{width:220px;float:left;background:#123}#sidebar a{color:#fff;display:block;padding:6px}main{margin-left:230px;padding:10px}</style><style>${js.css}</style></head><body>
  <div class="app-header"><div class="menu-akun"><ul class="dropdown-menu"><li><a class="dropdown-item">Profil</a></li></ul></div></div>
  <nav id="sidebar"><ul class="nav">
    <li class="nav-item"><a class="nav-link" onclick="showTab('dashboard-tagihan', event)">Dashboard</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('register', event)">Register Kontrak</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('form-progres', event)">Input Progres</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('form-bon', event)">Bon Permintaan</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('gdmasuk', event)">Penerimaan Material</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('gdstok', event)">Stok & Pengeluaran</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('gdkartu', event)">Kartu Gudang</a></li>
    <li class="nav-item"><a class="nav-link" onclick="showTab('keuangan', event)">Keuangan & Bayar</a></li></ul></nav>
  <main>${['dashboard-tagihan', 'register', 'form-progres', 'form-bon', 'gdmasuk', 'gdstok', 'gdkartu', 'keuangan'].map((t, i) => `<div id="tab-${t}" class="content-tab" style="display:${i ? 'none' : 'block'}"><h3>${t}</h3></div>`).join('')}</main>
  <nav id="navBawah"><button data-tab="dashboard-tagihan">Dashboard</button><button data-tab="gdmasuk">Gudang</button><button data-tab="form-progres">Progres</button></nav></body></html>`;
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 820 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  await pg.setContent(HTML);
  await pg.evaluate(P => {
    window.PROYEK = { id: P }; window.mp220Srv = f => f === 'petugasGudang';
    window.showTab = n => { document.querySelectorAll('main .content-tab').forEach(t => { t.style.display = t.id === 'tab-' + n ? 'block' : 'none'; }); window.__tab = n; };
    window.notif = (m, t) => (window.__n = window.__n || []).push([m, t]);
    window.__kirim = []; window.regAksi = async (a, x) => { window.__kirim.push([a, JSON.parse(JSON.stringify(x || {}))]); const s = window.REG.sesi; const o = await window.srvPost(JSON.stringify(Object.assign({ action: a, nama: s.nama, pin: s.pin, proyek: s.proyek }, x || {}))); const res = JSON.parse(o); if (!res.ok) throw new Error(res.error); return res; };
  }, P);
  const masuk = (nama, pin, peran, admin) => pg.evaluate(([P, nama, pin, peran, admin]) => { window.REG = { url: 'x', sesi: { nama, pin, peran, admin, proyek: P } }; document.body.appendChild(document.createElement('i')); }, [P, nama, pin, peran, admin]);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await masuk('Staf Pengadaan', '1111', 'PENGADAAN', false); await pg.addScriptTag({ content: BLOK }); await pg.waitForTimeout(500);
  ok(!(await pg.$('#mp271Menu')) && !(await pg.evaluate(() => document.body.classList.contains('mp271-gudang'))), 'Pengadaan: tanpa menu Petugas Gudang, tanpa mode gudang');
  console.log('1. desimal: kuantitas 3 desimal & rupiah bulat sebelum dikirim');
  await pg.evaluate(async () => { for (const [a, d] of [['save', { items: [{ vol: 1.23456, harga: 1500.6 }] }], ['savePermintaan', { items: [{ vol: '2.0005', harga: 999.4 }] }], ['saveProgres', { items: { a: 0.12349, b: 3 }, nilai: 1234.5 }]]) { try { await window.regAksi(a, { data: d }); } catch (e) { } } });
  const k = await pg.evaluate(() => window.__kirim.slice(-3).map(x => x[1].data));
  ok(k[0].items[0].vol === 1.235 && k[0].items[0].harga === 1501, 'Register: vol 1,23456 → 1,235 · harga 1500,6 → 1501');
  ok(k[1].items[0].vol === 2.001 && k[1].items[0].harga === 999, 'Bon: vol "2,0005" → 2,001 · harga 999,4 → 999');
  ok(k[2].items.a === 0.123 && k[2].items.b === 3 && k[2].nilai === 1235, 'Progres: volume per item 3 desimal · nilai bulat');
  console.log('2. Admin: menu akun › Petugas Gudang');
  await masuk('Joko Supriyono', '1234', 'PENGADAAN', true); await pg.waitForSelector('#mp271Menu', { state: 'attached', timeout: 4000 });
  ok(true, 'Admin melihat menu akun › Petugas Gudang');
  await pg.evaluate(() => document.getElementById('mp271Menu').click()); await pg.waitForSelector('.mp271-daftar');
  const calon = await pg.$$eval('.mp271-baris b', x => x.map(e => e.textContent));
  ok(calon.join() === 'Petugas Gudang,Kepala Proyek', 'daftar calon = akun "Lihat saja" saja');
  await pg.check('.mp271-baris input[value="Petugas Gudang"]'); await pg.screenshot({ path: OUT + '/mp271-atur.png' });
  await pg.click('#mp271Simpan'); await pg.waitForFunction(() => /Tersimpan/.test(document.getElementById('mp271Pesan').textContent));
  ok(JSON.parse(C.__props.GUDANG_PETUGAS).join() === 'Petugas Gudang', 'tersimpan di server: GUDANG_PETUGAS = [Petugas Gudang]');
  await pg.evaluate(() => document.getElementById('mp271Modal').remove());
  console.log('3. Petugas Gudang masuk: hanya menu Gudang');
  await masuk('Petugas Gudang', '2222', 'LIHAT', false); await pg.waitForFunction(() => document.body.classList.contains('mp271-gudang'), null, { timeout: 4000 });
  const tampil = await pg.$$eval('#sidebar .nav-link', x => x.filter(a => a.offsetParent).map(a => a.textContent));
  ok(tampil.join('|') === 'Penerimaan Material|Stok & Pengeluaran|Kartu Gudang', 'sidebar hanya: Penerimaan · Stok & Pengeluaran · Kartu Gudang');
  ok(await pg.evaluate(() => window.__tab === 'gdmasuk' && getComputedStyle(document.getElementById('tab-gdmasuk')).display === 'block'), 'langsung dibuka di tab Penerimaan Material');
  ok(await pg.$$eval('#navBawah [data-tab]', x => x.filter(b => b.offsetParent).map(b => b.dataset.tab).join()) === 'gdmasuk', 'navigasi bawah HP hanya Gudang');
  ok(await pg.isVisible('#mp271Pita'), 'pita "Mode Petugas Gudang" tampil');
  ok(!(await pg.$('#mp271Menu')), 'Petugas tidak melihat pengaturan Admin');
  await pg.evaluate(() => window.showTab('register'));
  ok(await pg.evaluate(() => window.__tab === 'gdmasuk' && getComputedStyle(document.getElementById('tab-register')).display === 'none'), 'membuka tab lain (Register) dialihkan ke Gudang');
  await pg.screenshot({ path: OUT + '/mp271-mode-gudang.png' });
  console.log('4. surat jalan PDF Petugas lewat gudangUnggahSJ');
  const u = await pg.evaluate(async () => { const r = await window.regAksi('unggahBerkas', { berkas: { data: btoa('%PDF-1.4 sj'), nama: 'sj.pdf', jenis: 'SURAT-JALAN' } }); return [window.__kirim.slice(-1)[0][0], r.ok, !!r.id]; });
  ok(u[0] === 'gudangUnggahSJ' && u[1] && u[2], 'unggahBerkas dialihkan ke gudangUnggahSJ & tersimpan');
  const tolak = await pg.evaluate(async () => { try { await window.regAksi('baca', { jenis: 'list' }); return 'lolos'; } catch (e) { return e.message; } });
  ok(/Bon Permintaan/.test(tolak), 'server menolak baca Register untuk Petugas');
  console.log('5. akun Lihat saja lain & Pengadaan kembali normal');
  await masuk('Kepala Proyek', '0000', 'LIHAT', false); await pg.waitForFunction(() => !document.body.classList.contains('mp271-gudang'), null, { timeout: 4000 });
  ok((await pg.$$eval('#sidebar .nav-link', x => x.filter(a => a.offsetParent).length)) === 8, 'Kepala Proyek (Lihat saja, bukan petugas) melihat semua menu');
  const up = await pg.evaluate(async () => { try { await window.regAksi('unggahBerkas', { berkas: { data: btoa('%PDF-1.4'), nama: 'x.pdf' } }); return 'lolos'; } catch (e) { return [window.__kirim.slice(-1)[0][0], e.message]; } });
  ok(up[0] === 'unggahBerkas' && /Lihat saja/.test(up[1]), 'akun Lihat saja biasa tetap memakai unggahBerkas kernel (ditolak)');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI 2.7.1'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
