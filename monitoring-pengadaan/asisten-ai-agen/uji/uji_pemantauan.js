// Uji modul 1.9.4: pemantauan & backup otomatis lewat pemicu kernel asli jadwalNotifikasi (kait "terjadwal") — tanpa mengubah Code.gs.
// Drive (makeCopy/rotasi), ScriptApp (pemicu), MailApp & Session ditiru; kernel & modul asli.
const assert = require('assert'), vm = require('vm');
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.4.json';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, ADM, STF } = require('./vt_data.js')();

// --- tiruan layanan Google yang dipakai pemantauan ---
let jam = Date.parse('2026-10-25T03:00:00Z'), urut = 0;   // 10.00 WIB
const D = { berkas: {}, folder: {} };
const folderT = id => D.folder[id] || (D.folder[id] = { getId: () => id, getUrl: () => 'drive://' + id, isTrashed: () => false,
  getFiles: () => { const L = Object.values(D.berkas).filter(f => f.induk === id && !f.sampah).map(f => f.api); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; } });
const berkasT = (id, nama, induk) => { const f = D.berkas[id] = { id, nama, induk, dibuat: jam + (urut++), sampah: false };
  f.api = { getId: () => id, getName: () => nama, getUrl: () => 'drive://' + id, getDateCreated: () => new Date(f.dibuat), setTrashed: v => { f.sampah = !!v; } }; return f; };
const asliDrive = C.DriveApp;
C.DriveApp = Object.assign({}, asliDrive, {
  createFolder: nama => folderT('FB' + (++urut)), getFolderById: id => { if (!D.folder[id]) throw new Error('tidak ada'); return D.folder[id]; },
  getFileById: id => id === 'DB' ? { makeCopy: (nama, folder) => berkasT('BK' + (++urut), nama, folder.getId()).api } : asliDrive.getFileById(id) });
const pemicu = []; C.ScriptApp = { getProjectTriggers: () => pemicu.map(h => ({ getHandlerFunction: () => h })),
  newTrigger: h => ({ timeBased: () => ({ everyDays: () => ({ atHour: j => ({ inTimezone: () => ({ create: () => pemicu.push(h) }) }) }) }) }) };
const email = []; C.MailApp = { getRemainingDailyQuota: () => 90, sendEmail: (ke, subjek, isi) => email.push({ ke, subjek, isi }) };
C.Session = { getEffectiveUser: () => ({ getEmail: () => 'pemilik@contoh.id' }) };
const SS = C.SpreadsheetApp.getActiveSpreadsheet(); SS.getId = () => 'DB'; SS.getName = () => 'DB Monitoring SAP';
let SEL = 400000; const sh0 = SS.getSheets()[0], proto = Object.getPrototypeOf(sh0);
proto.getMaxRows = function () { return SEL / 20 / SS.getSheets().length; }; proto.getMaxColumns = () => 20; if (!proto.getName) proto.getName = function () { return this.nama || this.name || 'Sheet'; };
const NowAsli = C.Date; C.Date = class extends NowAsli { constructor(...a) { a.length ? super(...a) : super(jam); } static now() { return jam; } };
const jadwal = () => vm.runInContext('jadwalNotifikasi()', C);
const aktif = () => Object.values(D.berkas).filter(f => !f.sampah);
const prop = k => C.__props[k];

console.log('1. Pemicu jadwal kernel → backup harian + cek kesehatan');
jadwal();
ok(aktif().length === 1 && / — backup 2026-10-25 1000$/.test(aktif()[0].nama), 'pemicu jadwalNotifikasi (Code.gs tidak diubah) membuat backup pertama: "' + aktif()[0].nama + '"');
ok(JSON.parse(prop('PM_BACKUP_TERAKHIR')).tanggal === '2026-10-25' && JSON.parse(prop('PM_CEK_TERAKHIR')).persenSel === 4, 'status backup & hasil cek tersimpan (sel 4%)');
jam += 6 * 36e5; jadwal();
ok(aktif().length === 1, 'pemicu kedua pada hari yang sama: tidak ada backup ganda');
ok(email.length === 0, 'tanpa masalah → tanpa email');

console.log('2. Rotasi & setelan Admin');
let r = STF('pmStatus'); ok(!r.ok && /khusus Admin/.test(r.error), 'staf non-Admin ditolak');
r = ADM('pmSetel', { data: { simpan: 3, email: 'admin@contoh.id' } }); assert.ok(r.ok, r.error);
for (let i = 0; i < 4; i++) { jam += 60e3; r = ADM('pmBackup'); assert.ok(r.ok, r.error); }
ok(aktif().length === 3 && Object.values(D.berkas).filter(f => f.sampah).length === 2, 'Backup sekarang ×4 dengan simpan = 3 → 3 salinan terbaru, 2 ke Sampah');
r = ADM('pmStatus'); assert.ok(r.ok, r.error);
ok(r.data.backup.daftar.length === 3 && r.data.setelan.email === 'admin@contoh.id' && r.data.backup.terakhir.oleh === 'Joko Supriyono' && r.data.cek.pemicu === 0, 'pmStatus: 3 backup, email Admin, pelaku tercatat, pemicu = 0');

console.log('3. Pemicu belum ada → Aktifkan jadwal harian');
ok(r.data.cek.masalah.some(m => /Tidak ada pemicu jadwal/.test(m)), 'status menyebut "tidak ada pemicu jadwal"');
r = ADM('pmJadwal'); ok(r.ok && r.data.dibuat && pemicu.join() === 'jadwalNotifikasi', 'pmJadwal memasang 1 pemicu harian ke fungsi kernel jadwalNotifikasi (01.00 WIB)');
r = ADM('pmJadwal'); ok(r.ok && !r.data.dibuat && pemicu.length === 1, 'dipanggil lagi → tidak menggandakan pemicu');

console.log('4. Peringatan email');
SEL = 8.8e6; jam += 60e3; jadwal();
ok(email.length === 1 && email[0].ke === 'admin@contoh.id' && /KRITIS: database memakai 88%/.test(email[0].isi), 'sel 88% → email KRITIS ke Admin');
jam += 2 * 36e5; jadwal(); ok(email.length === 1, 'dalam 6 jam tidak dikirim ulang');
jam += 5 * 36e5; jadwal(); ok(email.length === 2, 'setelah 6 jam masalah masih ada → email lagi');
SEL = 400000; C.__props.PM_BACKUP_TERAKHIR = JSON.stringify({ t: jam - 40 * 36e5, tanggal: '2026-10-25', nama: 'x' }); jam += 7 * 36e5;
jadwal(); ok(aktif().some(f => / — backup 2026-10-26/.test(f.nama)), 'hari berganti → backup baru otomatis');
ok(!email.slice(2).some(e => /Backup terakhir/.test(e.isi)), 'backup berhasil sebelum dicek → tidak ada peringatan backup');

console.log('5. Fungsi lama tetap berjalan');
r = ADM('vtInfo'); ok(r.ok, 'Verifikasi Tagihan (vtInfo) tetap berjalan');
r = ADM('pyInfo'); ok(r.ok, 'Multi-proyek (pyInfo) tetap berjalan');
const fit = JSON.parse(K.doPost({ postData: { contents: JSON.stringify({ action: 'login', nama: 'Joko Supriyono', pin: '1234', proyek: K.PROYEK_AWAL.id }) } }));
ok(fit.ok, 'login kernel tetap berjalan');
console.log('\nLULUS ' + lulus + ' cek pemantauan (1.9.4)');
