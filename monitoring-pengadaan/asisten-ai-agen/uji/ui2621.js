// Uji UI 2.6.21 di Chromium (blok MP2619 + perbaikan 2.6.21, server 1.9.6 asli): Kesehatan & Backup + LOKASI DATABASE + peringatan Mode lokal.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.6.json';
const { C, P } = require('./vt_data.js')();
// tiruan Drive / ScriptApp / MailApp / Session (seperti uji_pemantauan.js)
let urut = 0; const D = { berkas: {}, folder: {} };
const folderT = id => D.folder[id] || (D.folder[id] = { getId: () => id, getUrl: () => 'https://drive.google.com/drive/folders/' + id, isTrashed: () => false,
  getFiles: () => { const L = Object.values(D.berkas).filter(f => f.induk === id && !f.sampah).map(f => f.api); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; } });
const berkasT = (nama, induk) => { const id = 'BK' + (++urut), f = D.berkas[id] = { nama, induk, dibuat: Date.now() + urut, sampah: false };
  f.api = { getId: () => id, getName: () => nama, getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id, getDateCreated: () => new Date(f.dibuat), setTrashed: v => { f.sampah = !!v; } }; return f; };
const asliDrive = C.DriveApp;
C.DriveApp = Object.assign({}, asliDrive, { createFolder: () => folderT('FB' + (++urut)), getFolderById: id => { if (!D.folder[id]) throw new Error('tidak ada'); return D.folder[id]; },
  getFileById: id => id === 'DB' ? { makeCopy: (nama, folder) => berkasT(nama, folder.getId()).api } : asliDrive.getFileById(id) });
const pemicu = []; C.ScriptApp = { getProjectTriggers: () => pemicu.map(h => ({ getHandlerFunction: () => h })),
  newTrigger: h => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create: () => pemicu.push(h) }) }) }) }) }) };
C.MailApp = { getRemainingDailyQuota: () => 90, sendEmail: () => { } }; C.Session = { getEffectiveUser: () => ({ getEmail: () => 'pemilik@contoh.id' }) };
const SS = C.SpreadsheetApp.getActiveSpreadsheet(); SS.getId = () => 'DB'; SS.getName = () => 'DB Monitoring SAP';
const proto = Object.getPrototypeOf(SS.getSheets()[0]); proto.getMaxRows = () => 1000; proto.getMaxColumns = () => 20; if (!proto.getName) proto.getName = function () { return this.nama; };
const post = o => JSON.parse(C.__k.doPost({ postData: { contents: JSON.stringify(o) } }));
const js = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.21.json', 'utf8')), BLOK = js.js.slice(js.js.indexOf('/* MP2619'), js.js.indexOf('/* MP264 — PEMBARUAN'));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1280, height: 860 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#E9EEF5}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-close::after{content:'×'}.form-control{width:100%;box-sizing:border-box}</style><style>${js.css}</style></head>
    <body><div class="app-header"><div class="menu-akun"><ul class="dropdown-menu"><li><a class="dropdown-item">Profil</a></li></ul></div></div></body></html>`);
  const masuk = (nama, pin, admin) => pg.evaluate(([P, nama, pin, admin]) => { window.PROYEK = { id: P }; window.REG = { url: 'x', sesi: { nama, pin, admin, proyek: P } };
    window.mp220Srv = f => f === 'pemantauan'; window.notif = (m, t) => (window.__n = window.__n || []).push([m, t]); window.regPost = async b => JSON.parse(await window.srvPost(JSON.stringify(b))); }, [P, nama, pin, admin]);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await masuk('Staf Pengadaan', '1111', false); await pg.addScriptTag({ content: BLOK }); await pg.waitForTimeout(700);
  ok(!(await pg.$('#mp2619Menu')), 'staf: menu Kesehatan & Backup tidak tampil');
  await masuk('Joko Supriyono', '1234', true); await pg.evaluate(() => document.body.appendChild(document.createElement('i'))); await pg.waitForSelector('#mp2619Menu', { state: 'attached' });
  ok(true, 'Admin: menu akun › Kesehatan & Backup');
  await pg.evaluate(() => document.getElementById('mp2619Menu').click()); await pg.waitForSelector('.mp2619-tb');
  let t = await pg.textContent('.mp2619-isi');
  ok(/Lokasi database/.test(t) && /DB Monitoring SAP · buka spreadsheet/.test(t) && await pg.$$eval('.mp2619-db tbody tr', x => x.length) >= 3 && /_Register/.test(t), 'Lokasi database: nama file + tautan + sheet proyek beserta jumlah baris');
  ok(/Simpan terakhir:/.test(t), 'waktu simpan terakhir dari Log tampil');
  ok(/Backup terakhir\s*belum ada/.test(t) && /Jadwal otomatis\s*belum aktif/.test(t) && /Perlu perhatian/.test(t), 'status awal: belum ada backup & jadwal → "Perlu perhatian"');
  await pg.click('button:has-text("Backup sekarang")'); await pg.waitForFunction(() => /oleh Joko Supriyono/.test(document.querySelector('.mp2619-isi').textContent));
  ok(Object.keys(D.berkas).length === 1 && await pg.$$eval('.mp2619-ls li', x => x.length) === 1, 'Backup sekarang → salinan dibuat & tampil di daftar');
  await pg.click('button:has-text("Aktifkan jadwal harian")'); await pg.waitForFunction(() => /Jadwal otomatis\s*aktif/.test(document.querySelector('.mp2619-isi').textContent));
  t = await pg.textContent('.mp2619-isi');
  ok(pemicu.join() === 'jadwalNotifikasi' && /Semua pemeriksaan normal/.test(t) && !/Aktifkan jadwal/.test(t), 'Aktifkan jadwal → 1 pemicu kernel, status normal, tombol hilang');
  await pg.click('.mp2619-set summary'); await pg.fill('#mp2619Email', 'admin@contoh.id'); await pg.click('button:has-text("Simpan setelan")');
  await pg.waitForFunction(() => /admin@contoh\.id/.test(document.querySelector('.mp2619-isi').textContent));
  ok(true, 'setelan email peringatan tersimpan & tampil');
  await pg.screenshot({ path: OUT + '/kesehatan-backup-lokasi-db.png' });
  await pg.setViewportSize({ width: 390, height: 800 }); await pg.waitForTimeout(200);
  const bx = await pg.evaluate(() => { const r = document.querySelector('.mp2619-dlg').getBoundingClientRect(); return { l: r.left, r: r.right, sw: document.documentElement.scrollWidth }; });
  ok(bx.l >= 0 && bx.r <= 390 && bx.sw <= 390, 'muat di layar HP 390 px');
  await pg.evaluate(() => { window.REG.url = ''; mp2619Buka(); }); await pg.waitForSelector('.mp2619-al.no');
  ok(/Mode lokal:/.test(await pg.textContent('.mp2619-isi')) && /TIDAK di Google Sheets/.test(await pg.textContent('.mp2619-isi')), 'Mode lokal → peringatan jelas: data hanya di browser');
  await pg.keyboard.press('Escape'); ok(!(await pg.$('#mp2619Kb')), 'Esc menutup dialog');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' uji UI 2.6.21');
})().catch(e => { console.error(e); process.exit(1); });
