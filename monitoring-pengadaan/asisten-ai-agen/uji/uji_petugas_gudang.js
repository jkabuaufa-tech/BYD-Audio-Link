// Uji 1.10.1: Petugas Gudang (akun Lihat saja + daftar petugas) — kernel Code.gs 2.5.1 asli + modul 1.10.1.
//   KODE_GS=…/Code.gs node uji/uji_petugas_gudang.js
const { buatKonteks } = require('./harness.js');
const fs = require('fs'), assert = require('assert');
const C = buatKonteks(), K = C.__k;
let lulus = 0; const ok = (c, m) => { if (!c && typeof r !== 'undefined') console.log('   jawaban:', JSON.stringify(r).slice(0, 300)); assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' },
  { nama: 'Petugas Gudang', peran: 'LIHAT', pin: '2222', aktif: true, proyek: '*' }, { nama: 'Petugas Dua', peran: 'LIHAT', pin: '4444', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const P = K.PROYEK_AWAL.id;
K.tulisKoleksi_(P, 'data', [{ id: 'R1', noKontrak: '01/SPM/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'PT Baja', nilai: 1000, items: [] }]);
K.tulisKoleksi_(P, 'progres', [{ id: 'T1', versi: 1, noKontrak: '01/SPM/WK-NK.KSO/PDBJ/1726012/2026', tagihanKe: 1, nomorBA: 'BA-1', periode: 'Sep 2026', periodeKey: 202609, nilai: 100 }]);
K.tulisKoleksi_(P, 'permintaan', [{ id: 'B1', nomor: 'BON-01', tanggal: '2026-09-01', departemen: 'Gudang', items: [{ kode: 'M1', uraian: 'Besi D13', vol: 100, sat: 'btg', harga: 90000 }, { kode: 'M2', uraian: 'Semen', vol: 50, sat: 'zak', harga: 60000 }] }]);
const paket = JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.10.1.json', 'utf8'));
const kirim = (nama, pin, action, extra) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek: P }, extra || {})) } }));
const ADM = (a, e) => kirim('Joko Supriyono', '1234', a, e), STF = (a, e) => kirim('Staf Pengadaan', '1111', a, e), GDG = (a, e) => kirim('Petugas Gudang', '2222', a, e),
  GD2 = (a, e) => kirim('Petugas Dua', '4444', a, e), LHT = (a, e) => kirim('Kepala Proyek', '0000', a, e);

console.log('0. pasang modul 1.10.1 lewat kernel');
let r = ADM('modulUnggah', { data: paket }); ok(r.ok, 'modulUnggah 1.10.1 diterima kernel 2.5.1');
r = ADM('modulTerbit', { versi: '1.10.1', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis' }); ok(r.ok, 'modulTerbit 1.10.1 (timpa "baca" valid)');
// berkas Drive milik folder proyek (PDF surat jalan & foto JPG)
const fid = K.folderProyek_(P).getId(), mime = {};
const berkas = (id, nama, tipe) => { C.__files[id] = { nama, data: 'x', induk: fid }; mime[id] = tipe; return { id, idServer: id, nama }; };
const asli = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { const f = asli(id); if (mime[id]) f.getMimeType = () => mime[id]; return f; };
const SJ = berkas('SJ1', 'sj.pdf', 'application/pdf'), FOTO = berkas('FT1', 'foto.jpg', 'image/jpeg'), SJ2 = berkas('SJ2', 'sj2.pdf', 'application/pdf'), FOTO2 = berkas('FT2', 'f2.jpg', 'image/jpeg');
// tiruan unggah: base64Decode & createFile lengkap (harness lama hanya untuk teks)
C.Utilities.base64Decode = t => [...Buffer.from(t, 'base64')].map(b => (b > 127 ? b - 256 : b));
const fp = K.folderProyek_(P); let nUnggah = 0;
fp.createFile = blob => { const id = 'UP' + (++nUnggah); C.__files[id] = { nama: blob.nama || 'berkas', data: 'x', induk: fid }; return { getId: () => id, getUrl: () => 'drive://' + id, getName: () => 'berkas', setDescription() { } }; };
C.Utilities.newBlob = (b, tipe, nama) => ({ nama, tipe, getBytes: () => b });
const terima = (f, sj, foto, qty, noSJ) => f('gudangTerimaBon', { data: { bonNomor: 'BON-01', tanggal: '2026-10-01', noSJ: noSJ || 'SJ-A', sjFile: sj, foto: [foto], baris: [{ idx: 0, qty }] } });

console.log('1. sebelum didaftarkan: akun Lihat saja tetap tidak bisa menulis gudang');
r = terima(GDG, SJ, FOTO, 5); ok(!r.ok && /Pengadaan atau Admin/.test(r.error), 'GR ditolak untuk akun Lihat saja biasa');
r = GDG('gudangPetugasBaca'); ok(r.ok && r.saya === false && !r.calon, 'gudangPetugasBaca: saya=false, daftar calon hanya untuk Admin');

console.log('2. Admin mengatur daftar Petugas Gudang');
r = STF('gudangPetugasSimpan', { data: { daftar: ['Petugas Gudang'] } }); ok(!r.ok && /khusus Admin/.test(r.error), 'non-Admin tidak bisa mengatur');
r = ADM('gudangPetugasSimpan', { data: { daftar: ['Staf Pengadaan'] } }); ok(!r.ok && /Lihat saja/.test(r.error), 'akun Pengadaan ditolak (harus Lihat saja)');
r = ADM('gudangPetugasSimpan', { data: { daftar: ['Tidak Ada'] } }); ok(!r.ok && /tidak ditemukan/.test(r.error), 'nama tidak terdaftar ditolak');
r = ADM('gudangPetugasSimpan', { data: { daftar: ['petugas gudang', 'Petugas Dua'] } }); ok(r.ok && r.daftar.join() === 'Petugas Gudang,Petugas Dua', 'disimpan dengan nama baku (huruf besar/kecil diseragamkan)');
r = ADM('gudangPetugasBaca'); ok(r.ok && r.calon.filter(c => c.petugas).length === 2 && r.calon.length === 3, 'Admin melihat calon (akun Lihat saja) & tanda petugas');
ok(K.bacaLog_(P).some(l => l.aksi === 'PETUGAS GUDANG' && /\+ Petugas Gudang, Petugas Dua/.test(l.detail)), 'perubahan daftar tercatat di Log');

console.log('3. Petugas Gudang: menerima & mengeluarkan persediaan');
r = GDG('gudangPetugasBaca'); ok(r.saya === true, 'gudangPetugasBaca: saya=true');
r = GDG('gudangUnggahSJ', { berkas: { data: Buffer.from('%PDF-1.4 sj').toString('base64'), nama: 'sj.pdf' } }); ok(r.ok && r.id, 'unggah surat jalan PDF lewat gudangUnggahSJ');
r = GDG('gudangUnggahSJ', { berkas: { data: Buffer.from('bukan pdf').toString('base64'), nama: 'x.pdf' } }); ok(!r.ok && /PDF/.test(r.error), 'surat jalan bukan PDF ditolak');
r = terima(GDG, SJ, FOTO, 12.34567); ok(r.ok && r.data[0].qty === 12.346 && r.data[0].dibuatOleh === 'Petugas Gudang', 'GR oleh Petugas Gudang; qty dibulatkan 3 desimal (12,34567 → 12,346)');
ok(r.data[0].harga === 90000, 'harga rupiah bulat dari bon');
const gr1 = r.data[0];
r = GDG('gudangKeluarSimpan', { data: { kunci: gr1.kunci, tanggal: '2026-10-02', qty: 2.0004, untuk: 'Pile cap', penerima: 'Mandor A', foto: FOTO } });
ok(r.ok && r.data.qty === 2 && r.data.dibuatOleh === 'Petugas Gudang', 'GI oleh Petugas Gudang; qty 2,0004 → 2');
r = GDG('gudangKeluarSimpan', { data: { kunci: gr1.kunci, tanggal: '2026-10-02', qty: 50, untuk: 'Pile cap', penerima: 'Mandor A', foto: FOTO } }); ok(!r.ok && /minus/.test(r.error), 'aturan stok tidak boleh minus tetap berlaku');
r = GDG('gudangBaca'); ok(r.ok && r.masuk.length === 1 && r.keluar.length === 1, 'gudangBaca diizinkan');

console.log('4. Petugas Gudang: menu lain ditolak di server');
r = GDG('baca', { jenis: 'permintaan' }); ok(r.ok && r.data[0].nomor === 'BON-01', 'baca Bon Permintaan diizinkan (sumber penerimaan)');
r = GDG('baca', { jenis: 'list' }); ok(!r.ok && /Bon Permintaan/.test(r.error), 'baca Register Kontrak ditolak');
r = GDG('baca', { jenis: 'progres' }); ok(!r.ok, 'baca Progres ditolak');
for (const a of ['arsipBaca', 'aiInfo', 'vtInfo', 'timInfo', 'wvInfo', 'bacaMasterTambahan', 'diagServer', 'blInfo', 'blDaftar']) { r = GDG(a); ok(!r.ok && /hanya dapat mengakses menu Gudang/.test(r.error), a + ' ditolak'); }
r = GDG('saveProgres', { data: { noKontrak: '01/SPM/WK-NK.KSO/PDBJ/1726012/2026', periode: 'Okt 2026', periodeKey: 202610, tagihanKe: 2, items: { a: 1 } } }); ok(!r.ok, 'simpan progres ditolak (kernel: hanya PENGADAAN)');
r = GDG('savePermintaan', { data: { nomor: 'BON-X', items: [] } }); ok(!r.ok, 'simpan Bon ditolak (kernel)');

console.log('5. Pembatalan: Petugas hanya transaksinya sendiri');
r = terima(STF, SJ2, FOTO2, 3, 'SJ-B'); ok(r.ok, 'GR kedua oleh Staf Pengadaan');
const kirimStf = r.kiriman;
r = GD2('gudangBatalKiriman', { data: { kiriman: kirimStf, alasan: 'salah input jumlah barang' } }); ok(!r.ok && /dicatatnya sendiri/.test(r.error), 'Petugas Dua tidak bisa membatalkan kiriman Staf Pengadaan');
r = STF('gudangBatalKiriman', { data: { kiriman: kirimStf, alasan: 'salah input jumlah barang' } }); ok(r.ok, 'Staf Pengadaan membatalkan kirimannya');

console.log('6. Akun lain tidak berubah');
r = LHT('gudangPetugasBaca'); ok(r.ok && r.saya === false, 'Kepala Proyek (Lihat saja, bukan petugas) bukan Petugas Gudang');
r = terima(LHT, SJ2, FOTO2, 1, 'SJ-C'); ok(!r.ok, 'Kepala Proyek tetap tidak bisa menulis gudang');
r = LHT('baca', { jenis: 'list' }); ok(r.ok && r.data.length === 1, 'Kepala Proyek tetap bisa membaca Register (perilaku kernel sama)');
r = STF('baca', { jenis: 'log' }); ok(r.ok && Array.isArray(r.data), 'baca log untuk Pengadaan identik dengan kernel');
r = LHT('aiInfo'); ok(r.ok, 'aksi modul lain tetap jalan untuk akun bukan petugas');
r = ADM('gudangPetugasSimpan', { data: { daftar: [] } }); ok(r.ok && r.daftar.length === 0, 'daftar dikosongkan');
r = terima(GDG, SJ2, FOTO2, 1, 'SJ-D'); ok(!r.ok, 'setelah dicabut, akun kembali Lihat saja biasa');
console.log('\nLULUS ' + lulus + ' cek Petugas Gudang (1.10.1)');
