// Uji Modul server 1.10.20 — Bank Data Vendor Global (tanpa kernel Code.gs: fungsi kernel ditirukan).
// Kode modul dijalankan utuh; yang ditirukan hanya layanan kernel (sheet, daftar proyek, grup berbagi, Drive).
// Pakai: node uji/uji_vendor_global.js [server-modul.json]
const fs = require('fs'), path = require('path'), assert = require('assert');
const M = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'server-modul-1.10.20.json'), 'utf8'));
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const s_ = v => (v == null ? '' : String(v));
// ---- data tiruan: 3 proyek; grup berbagi hanya A+B (C = proyek baru Non-KSO di luar grup) ----
const MASTER = {
  '1726012': [{ id: 'M1', jenis: 'VENDOR', kode: 'CUST-V001', nama: 'PT Cahaya Utama Safety Indonesia', keterangan: JSON.stringify({ kodeSAP: '1000555', alamat: 'Jl. Raya Bekasi Km 21 No. 5, Kel. Rawa Terate, Jakarta Timur 13920', npwp: '012345678901000', pimpinan: 'Siti Aminah', jabatan: 'Direktur' }), diubahPada: '2026-10-01T00:00:00Z', versi: 2, aktif: true },
    { id: 'M2', jenis: 'MATERIAL', kode: 'CUST-M001', nama: 'Helm Proyek', satuan: 'PC', diubahPada: '2026-10-01T00:00:00Z' }],
  '1726029': [{ id: 'M9', jenis: 'VENDOR', kode: 'CUST-V777', nama: 'Cahaya Utama Safety Indonesia, PT.', keterangan: JSON.stringify({ telp: '021-555000', alamat: '' }), diubahPada: '2026-11-10T00:00:00Z', versi: 1, aktif: true },
    { id: 'M8', jenis: 'VENDOR', kode: 'CUST-V002', nama: 'CV Tirta Bor Lampung', keterangan: JSON.stringify({ alamat: 'Jl. Soekarno Hatta No. 9, Bandar Lampung 35122' }), diubahPada: '2026-11-11T00:00:00Z' }],
  'UJI': [{ id: 'M5', jenis: 'MATERIAL', kode: 'CUST-M900', nama: 'Material uji', diubahPada: '2026-01-01T00:00:00Z' }] };
const ARSIP = { '1726012': ['KTP', 'NPWP', 'SIUP', 'NIB'].map((j, i) => ({ id: 'AV' + i, kodeVendor: '1000555', namaVendor: 'PT Cahaya Utama Safety Indonesia', jenis: j, status: 'AKTIF', versi: 1, diubahPada: '2026-10-0' + (i + 1), file: { idServer: 'F' + i, nama: j + '.pdf' } })), '1726029': [], 'UJI': [] };
const FOLDER = { '1726012': 'FD-A', '1726029': 'FD-C' }, INDUK = { F0: 'FD-A', F1: 'FD-A', F2: 'FD-A', F3: 'FD-A', RAHASIA: 'FD-A' };
const tulis = [];
const tiruan = {
  s_, console, JSON, Object, Array, String, Number, Math, Date, Set, Map, RegExp, Error, isFinite, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent, Promise, Symbol, Boolean, undefined, NaN, Infinity,
  VERSI_SERVER: 'uji', PROYEK_AWAL: { id: '1726012' },
  jsonProp: (k, d) => k === 'PROYEK_BERBAGI' ? ['1726012', 'UJI'] : d,
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => k === 'PROYEK_BERBAGI' ? JSON.stringify(['1726012', 'UJI']) : null, setProperty() { }, deleteProperty() { }, getProperties: () => ({}) }) },
  semuaProyek_: () => [{ id: '1726012', aktif: true }, { id: '1726029', aktif: true }, { id: 'UJI', aktif: true }],
  semuaPengguna_: () => [{ nama: 'Staf JIAT', peran: 'PENGADAAN', proyek: '1726029' }], aksesProyek_: (rec, Q) => rec.proyek === '*' || rec.proyek === Q,
  mp24Baca_: (Q, j) => j === 'master' ? (MASTER[Q] || []).map(r => Object.assign({}, r)) : [],
  mp24IsiMaster_: (G, d, u, now) => { const lama = d.id ? G.find(r => r.id === d.id) : null; if (d.id && !lama) throw new Error('tidak ditemukan'); const rec = Object.assign({}, lama || { id: 'BARU1', versi: 0 }, { jenis: d.jenis, kode: d.kode, nama: d.nama, keterangan: d.keterangan, versi: (lama ? lama.versi : 0) + 1, diubahPada: now, aktif: true }); return { rec, oldId: lama ? lama.id : '' }; },
  mp24TulisBaris_: (P, j, rec, id) => { tulis.push([P, j, rec.id, id]); const L = MASTER[P] = MASTER[P] || [], i = L.findIndex(r => r.id === rec.id); if (i < 0) L.push(rec); else L[i] = rec; },
  catat_: () => { }, baris_: sh => sh.rows,
  ss_: () => ({ getSheetByName: n => { const m = /^(.*)_ArsipVendor$/.exec(n); return m && ARSIP[m[1]] ? { rows: ARSIP[m[1]].map(r => [r.id, '', '', '', '', '', '', '', '', JSON.stringify(r)]) } : null; } }),
  folderBerkas_: () => ({ getFoldersByName: nm => { const id = FOLDER[nm]; return { hasNext: () => !!id, next: () => ({ getId: () => id }) }; } }),
  DriveApp: { getFileById: id => { if (!INDUK[id]) throw new Error('tidak ada'); return { getName: () => id + '.pdf', getParents: () => { let i = 0; return { hasNext: () => i < 1, next: () => (i++, { getId: () => INDUK[id] }) }; }, getBlob: () => ({ getContentType: () => 'application/pdf', getBytes: () => [1, 2, 3] }) }; } },
  Utilities: { base64Encode: b => Buffer.from(b).toString('base64') }
};
const serba = new Proxy(function () { }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : serba, apply: () => serba, construct: () => serba });   // layanan kernel lain yang tidak diuji
const G = new Proxy(tiruan, { has: () => true, get: (t, k) => k === Symbol.unscopables ? undefined : k in t ? t[k] : serba });
const MOD = new Function('G', 'with (G) { return (function () {' + M.kode + '\n})(); }')(G);
ok(MOD && MOD.aksi && MOD.fitur.indexOf('vendorGlobal') >= 0 && MOD.baca.indexOf('vendorGlobalInfo') >= 0, 'modul ' + M.versi + ' terkompilasi · fitur vendorGlobal, identitasKop');
const U = { nama: 'Staf JIAT', peran: 'PENGADAAN', admin: true }, det = r => JSON.parse(r.keterangan || '{}');

console.log('1. Master Data › Vendor dari proyek mana pun');
let r = MOD.aksi.bacaMasterTambahan({}, U, '1726029').data, V = r.filter(x => x.jenis === 'VENDOR');
ok(V.length === 2, 'proyek 1726029 (di luar grup berbagi) melihat 2 vendor: vendor sendiri + vendor proyek 1726012, tanpa ganda');
let c = V.find(x => /Cahaya/.test(x.nama)), d = det(c);
ok(c.id === 'M9' && !c._proyek && d.telp === '021-555000', 'vendor yang sama (nama beda ejaan "…, PT.") dilebur — catatan terbaru menang');
ok(/Rawa Terate/.test(d.alamat) && d.npwp === '012345678901000' && d.pimpinan === 'Siti Aminah' && d.kodeSAP === '1000555', 'isian kosong (alamat, NPWP, direktur, kode SAP) dilengkapi dari catatan proyek 1726012 — tidak lagi kosong');
ok(!r.some(x => x.jenis === 'MATERIAL'), 'material proyek lain di luar grup TIDAK ikut (hanya vendor yang global)');
r = MOD.aksi.bacaMasterTambahan({}, U, '1726012').data;
if (process.env.DEBUG) console.log(r.map(x => [x.jenis, x.kode, x.nama, x._proyek]));
ok(r.filter(x => x.jenis === 'VENDOR').length === 2 && r.some(x => x.nama === 'CV Tirta Bor Lampung' && x._proyek === '1726029') && r.some(x => x.kode === 'CUST-M900'), 'proyek 1726012 melihat vendor proyek 1726029; material tetap menurut grup berbagi');

console.log('2. Ubah vendor dari proyek lain = salin-saat-ubah');
const tirta = r.find(x => x.nama === 'CV Tirta Bor Lampung');
MOD.aksi.simpanMasterTambahan({ data: { id: tirta.id, versi: tirta.versi, jenis: 'VENDOR', kode: tirta.kode, nama: tirta.nama, keterangan: JSON.stringify({ alamat: 'Jl. Soekarno Hatta No. 9, Bandar Lampung 35122', npwp: '998877665544000' }) } }, U, '1726012', '2026-11-16T10:00:00Z');
ok(tulis.length === 1 && tulis[0][0] === '1726012' && MASTER['1726029'].find(x => x.id === 'M8').keterangan.indexOf('9988') < 0, 'ditulis ke proyek yang sedang dibuka; sheet proyek asal tidak disentuh');
ok(det(MOD.aksi.bacaMasterTambahan({}, U, '1726029').data.find(x => x.nama === 'CV Tirta Bor Lampung')).npwp === '998877665544000', 'perubahan langsung tampil di proyek lain');

console.log('3. Arsip Dokumen Vendor');
let a = MOD.aksi.arsipBaca({}, U, '1726029').data;
ok(a.length === 4 && a.every(x => x._proyek === '1726012' && x.kodeVendor === '1000555'), 'proyek 1726029 membaca 4 dokumen arsip yang diunggah di proyek 1726012 (sebelumnya 0)');
const info = MOD.aksi.vendorGlobalInfo({}, U, '1726029');
ok(info.vendor === 2 && info.arsip === 4 && info.proyek.length === 3 && info.per.find(x => x.proyek === '1726012').arsip === 4, 'vendorGlobalInfo: 2 vendor · 4 dokumen dari 3 proyek');
let b = MOD.aksi.ambilBerkas({ id: 'F2' }, U, '1726029');
ok(b && b.ok && b.proyekAsal === '1726012' && b.tipe === 'application/pdf', 'berkas arsip vendor milik proyek lain dapat dibuka walau pengguna tidak punya akses proyek itu');
ok(MOD.aksi.ambilBerkas({ id: 'RAHASIA' }, U, '1726029') === undefined, 'berkas proyek lain yang BUKAN arsip vendor tetap tidak dibuka');
console.log('\n' + lulus + ' cek lulus');
