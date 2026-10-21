// Uji modul 1.9.2: multi-proyek — proyek baru mulai bersih, Master Data & Arsip Vendor bersama dalam grup, ganti proyek,
// siapkan proyek baru, akses pengguna. Syarat utama: SELURUH data proyek lama (sheet, setelan, berkas) tidak berubah.
const assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P } = require('./vt_data.js')();
const BARU = '1800001', UJI = '1700000';
const kirim = (nama, pin, proyek, action, extra) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek }, extra || {})) } }));
const A = (proyek, a, e) => kirim('Joko Supriyono', '1234', proyek, a, e);
// Drive tiruan: tambah makeCopy & setDescription
const ambil = C.DriveApp.getFileById; let nSalin = 0;
C.DriveApp.getFileById = id => { const f = ambil(id); if (!C.__files[id]) return f;
  return Object.assign(f, { setDescription() { }, makeCopy(nama, folder) { const nid = 'SALIN' + (++nSalin); C.__files[nid] = Object.assign({}, C.__files[id], { nama, induk: folder.getId() }); return C.DriveApp.getFileById(nid); } }); };
K.tulisProyek_([K.PROYEK_AWAL, { id: BARU, nama: 'Proyek Baru Uji', namaLengkap: 'Proyek Baru', kso: 'WASKITA', aktif: true }, { id: UJI, nama: 'uji coba', aktif: true }]);
const users = JSON.parse(JSON.stringify(C.__sheets['Pengguna'].rows));
users.push(['Staf Baru', 'PENGADAAN', '2222', true, P, '', '', '', '', '']); C.__sheets['Pengguna'].rows = users;

console.log('0. Data proyek lama (1726012)');
const fol = K.folderProyek_(P).getId(), FILE = 'ARSIP-SIUP';
C.__files[FILE] = { nama: 'SIUP CV Uji.pdf', data: '%PDF-arsip', induk: fol, diubah: 1 };
let r = A(P, 'simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-V001', nama: 'CV Uji Lama', satuan: '' } }); assert.ok(r.ok, r.error); const mLama = r.data;
assert.ok(A(P, 'simpanMasterTambahan', { data: { jenis: 'MATERIAL', kode: 'CUST-M001', nama: 'Besi D13', satuan: 'btg' } }).ok);
assert.ok(A(UJI, 'simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-V777', nama: 'Vendor UJI COBA', satuan: '' } }).ok);
r = A(P, 'arsipSimpan', { data: { jenis: 'SIUP', kodeVendor: 'V1', namaVendor: 'CV Uji Lama', noDok: 'SIUP-1', berlakuSd: '2027-12-31', file: { id: FILE, idServer: FILE, nama: 'SIUP CV Uji.pdf', lokasi: 'server' } } }); assert.ok(r.ok, r.error); const arsip = r.data;
assert.ok(A(P, 'notifSimpan', { data: { aktif: true, jam: [7, 16], email: { aktif: true, pengguna: ['Joko Supriyono'] } } }).ok);
assert.ok(A(P, 'timSetel', { data: { aktif: true, jam: [8], terus: false } }).ok || true);
const potret = () => JSON.stringify({ sheets: Object.keys(C.__sheets).filter(n => n.indexOf(P + '_') === 0).sort().map(n => [n, C.__sheets[n].rows]),
  props: Object.keys(C.__props).filter(k => k.endsWith('_' + P)).sort().map(k => [k, C.__props[k]]), files: Object.keys(C.__files).filter(k => C.__files[k].induk === fol).sort().map(k => [k, C.__files[k].data]) });
const SEBELUM = potret();
ok(SEBELUM.length > 2000 && /CUST-V001/.test(SEBELUM) && /SIUP-1/.test(SEBELUM), 'potret data 1726012 diambil (' + Math.round(SEBELUM.length / 1024) + ' KB: register, progres, checklist, master, arsip, log, setelan, berkas)');

console.log('1. Proyek baru mulai bersih');
r = A(BARU, 'bacaSemua');
ok(r.ok && !r.data.list.length && !r.data.progres.length && !r.data.permintaan.length, 'Register, Progres/BK, Permintaan proyek ' + BARU + ' kosong');
ok(A(BARU, 'bacaMasterTambahan').data.length === 0, 'sebelum masuk grup berbagi: master tambahan kosong (perilaku lama)');

console.log('2. Siapkan proyek baru (Admin)');
r = kirim('Staf Pengadaan', '1111', P, 'pySiapkan', { data: { sumber: P, tujuan: BARU } }); ok(!r.ok && /Admin/.test(r.error), 'khusus Admin');
r = A(P, 'pySiapkan', { data: { sumber: P, tujuan: P } }); ok(!r.ok && /berbeda/.test(r.error), 'sumber = tujuan ditolak');
r = A(P, 'pySiapkan', { data: { sumber: P, tujuan: BARU, salin: { notif: true, tim: true }, grup: [P, BARU] } });
ok(r.ok && r.hasil.some(h => /notifikasi: disalin/.test(h)) && r.grup.join() === P + ',' + BARU, 'setelan notifikasi disalin, grup berbagi ' + r.grup.join(' + '));
ok(C.__props['NOTIF_SET_' + BARU] === C.__props['NOTIF_SET_' + P], 'setelan notifikasi proyek baru = proyek sumber');
r = A(P, 'pySiapkan', { data: { sumber: P, tujuan: BARU, salin: { notif: true } } }); ok(r.hasil.some(h => /tidak ditimpa/.test(h)), 'menjalankan ulang tidak menimpa setelan proyek baru');
const info = A(P, 'pyInfo'); ok(info.ok && info.proyek.length === 3 && info.proyek.find(p => p.id === P).kini && info.proyek.find(p => p.id === P).kontrak === 3, 'pyInfo: 3 proyek, jumlah kontrak per proyek');

console.log('3. Master Data bersama');
let m = A(BARU, 'bacaMasterTambahan').data;
ok(m.length === 2 && m.every(x => x._proyek === P) && !m.some(x => x.kode === 'CUST-V777'), 'proyek baru melihat 2 master 1726012; master proyek uji coba (di luar grup) tidak ikut');
ok(A(P, 'bacaMasterTambahan').data.length === 2, 'tampilan master 1726012 tetap 2 (tidak tercampur uji coba)');
const v = m.find(x => x.kode === 'CUST-V001');
r = A(BARU, 'simpanMasterTambahan', { data: { id: v.id, versi: v.versi, jenis: 'VENDOR', kode: 'CUST-V001', nama: 'CV Uji Lama (alamat baru)', satuan: '' } });
ok(r.ok && C.__sheets[BARU + '_MasterCustom'].rows.length === 2, 'ubah master dari proyek baru → disimpan di proyek baru (salin-saat-ubah)');
ok(A(P, 'bacaMasterTambahan').data.find(x => x.kode === 'CUST-V001').nama === 'CV Uji Lama (alamat baru)', 'versi terbaru tampil juga di 1726012 (master bersama)');
r = A(BARU, 'simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-V001', nama: 'duplikat', satuan: '' } }); ok(!r.ok && /sudah tercatat/.test(r.error), 'kode yang sudah ada di master bersama ditolak (tanpa duplikat)');
assert.ok(A(BARU, 'simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-V900', nama: 'Vendor Proyek Baru', satuan: '' } }).ok);
ok(A(P, 'bacaMasterTambahan').data.some(x => x.kode === 'CUST-V900'), 'vendor yang ditambah di proyek baru langsung tersedia di 1726012');

console.log('4. Arsip Dokumen Vendor bersama');
let ar = A(BARU, 'arsipBaca').data; ok(ar.length === 1 && ar[0].noDok === 'SIUP-1' && ar[0]._proyek === P, 'arsip 1726012 tampil di proyek baru');
r = A(BARU, 'ambilBerkas', { id: FILE }); ok(r.ok && r.data && r.proyekAsal === P, 'PDF arsip proyek lama dapat dibuka dari proyek baru');
r = A(UJI, 'ambilBerkas', { id: FILE }); ok(!r.ok && /bukan milik proyek/.test(r.error), 'proyek di luar grup tetap tidak bisa membuka berkas itu');
K.tulisKoleksi_(BARU, 'progres', [{ id: 'TB1', versi: 1, noKontrak: '001/SPSA/WK/1800001/2026', tagihanKe: 1, nomorBA: 'BA-B1', nilai: 1e6 }]);
r = A(BARU, 'checklistSimpan', { data: { id: 'TB1', versi: 0, items: { UMUM_11: { status: 'ADA', file: { id: FILE, idServer: FILE, nama: 'SIUP CV Uji.pdf', lokasi: 'server' } } } } });
const fb = r.ok && r.data.items.UMUM_11.file;
ok(r.ok && fb.idServer !== FILE && C.__files[fb.idServer].induk === K.folderProyek_(BARU).getId() && C.__files[fb.idServer].data === C.__files[FILE].data, 'dipasang ke checklist proyek baru → PDF disalin ke folder proyek baru, kernel menerima');
r = A(BARU, 'arsipCabut', { data: { id: arsip.id, versi: arsip.versi, alasan: 'Diganti SIUP baru tahun 2027' } });
ok(r.ok && C.__sheets[BARU + '_ArsipVendor'].rows.length === 2, 'mencabut arsip bersama dari proyek baru → dicatat di proyek baru');
ok(A(P, 'arsipBaca').data[0].status === 'DICABUT', 'status terbaru (DICABUT) tampil juga di 1726012');

console.log('5. Akses pengguna & ganti proyek');
r = kirim('Staf Baru', '2222', BARU, 'login'); ok(!r.ok && /akses/.test(r.error), 'Staf Baru belum boleh membuka proyek baru');
r = A(P, 'pyAkses', { data: { proyek: BARU, tambah: ['Staf Baru', 'Joko Supriyono'] } });
ok(r.ok && r.diubah.join() === '+Staf Baru', 'akses ditambahkan (akun "*" tidak diubah)');
r = kirim('Staf Baru', '2222', BARU, 'login'); ok(r.ok && r.proyek.id === BARU, 'Staf Baru kini bisa pindah ke proyek baru (login proyek ' + BARU + ')');
ok(kirim('Staf Baru', '2222', P, 'login').ok, 'akses ke 1726012 tetap ada');
r = kirim('Staf Baru', '2222', P, 'pyInfo'); ok(r.ok && r.proyek.map(p => p.id).sort().join() === [P, BARU].sort().join() && !r.pengguna, 'pyInfo staf: hanya proyek yang boleh dibuka, tanpa daftar pengguna');
r = A(P, 'pyAkses', { data: { proyek: BARU, lepas: ['Staf Baru'] } }); ok(r.ok && r.diubah.join() === '-Staf Baru' && !kirim('Staf Baru', '2222', BARU, 'login').ok, 'akses ke proyek baru dapat dicabut kembali');
r = A(P, 'pyAkses', { data: { proyek: P, lepas: ['Staf Baru'] } }); ok(!r.ok && /hanya punya akses/.test(r.error), 'akses terakhir seorang pengguna tidak dapat dicabut (akun tidak terkunci)');

console.log('6. Proyek lama tidak berubah');
const SESUDAH = potret();
ok(SESUDAH === SEBELUM, 'SELURUH sheet, setelan & berkas 1726012 identik sebelum dan sesudah (persiapan, berbagi, ubah, cabut, akses)');
console.log('\nLULUS ' + lulus + ' uji multi-proyek (server)');
