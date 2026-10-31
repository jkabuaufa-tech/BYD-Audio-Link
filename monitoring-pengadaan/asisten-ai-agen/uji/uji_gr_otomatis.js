// Uji 1.10.2: penerimaan gudang otomatis dari Input Progres + anti dobel — kernel Code.gs 2.5.1 asli + modul 1.10.2.
//   KODE_GS=…/Code.gs node uji/uji_gr_otomatis.js
const { buatKonteks } = require('./harness.js');
const fs = require('fs'), assert = require('assert');
const C = buatKonteks(), K = C.__k;
let lulus = 0, r; const ok = (c, m) => { if (!c) console.log('   jawaban:', JSON.stringify(r).slice(0, 400)); assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' },
  { nama: 'Petugas Gudang', peran: 'LIHAT', pin: '2222', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]); const P = K.PROYEK_AWAL.id, NK = '003/SPM/WK-NK.KSO/PDBJ/1726012/2026';
K.tulisKoleksi_(P, 'permintaan', [{ id: 'B1', nomor: '001/BON/2026', tanggal: '2026-09-01', departemen: 'Logistik', items: [{ kode: '1000003699', uraian: 'Frame Panel 2x2,6m', vol: 100, sat: 'UN', harga: 250000 }, { kode: '1000001017', uraian: 'Beton Fc-10', vol: 50, sat: 'M3', harga: 900000 }] }]);
const prog = (id, ke, tgl) => ({ id, versi: 1, noKontrak: NK, tagihanKe: ke, nomorBA: String(ke).padStart(2, '0') + '/BAPM/' + NK, periode: 'Oktober 2026', periodeKey: 202609, tanggal: tgl, items: {}, nilai: 0 });
K.tulisKoleksi_(P, 'progres', [prog('T1', 1, '2026-10-05'), prog('T2', 2, '2026-10-12'), prog('T3', 3, '2026-10-20'), prog('T4', 4, '2026-10-21')]);
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
r = post({ action: 'modulUnggah', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.10.2.json', 'utf8')) }); assert.ok(r.ok, r.error);
r = post({ action: 'modulTerbit', nama: 'Joko Supriyono', pin: '1234', proyek: P, versi: '1.10.2', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis gr otomatis' }); assert.ok(r.ok, r.error);
const fid = K.folderProyek_(P).getId(), mime = {};
const berkas = (id, tipe) => { C.__files[id] = { nama: id, data: 'x', induk: fid }; mime[id] = tipe; return { id, idServer: id, nama: id }; };
const asli = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { const f = asli(id); if (mime[id]) f.getMimeType = () => mime[id]; return f; };
const SJ = n => berkas('SJ' + n, 'application/pdf'), FT = n => berkas('FT' + n, 'image/jpeg');
const kirim = (nama, pin) => (a, e) => post(Object.assign({ action: a, nama, pin, proyek: P }, e || {}));
const STF = kirim('Staf Pengadaan', '1111'), ADM = kirim('Joko Supriyono', '1234'), GDG = kirim('Petugas Gudang', '2222');
ADM('gudangPetugasSimpan', { data: { daftar: ['Petugas Gudang'] } });
const oto = (pid, baris) => STF('gudangOtomatisProgres', { data: { progresId: pid, baris } });
const masuk = () => STF('gudangBaca').masuk;
const total = idx => masuk().filter(x => x.status === 'AKTIF' && x.bonIdx === idx).reduce((a, x) => a + x.qty, 0);
const B0 = sd => ({ bonNomor: '001/BON/2026', bonIdx: 0, kode: '1000003699', sd }), B1 = sd => ({ bonNomor: '001/BON/2026', bonIdx: 1, kode: '1000001017', sd });

console.log('1. Progres lebih dulu → GR otomatis + minta foto');
r = oto('T1', [B0(30)]); ok(r.ok && r.data.length === 1 && r.data[0].qty === 30 && r.data[0].fotoKurang && r.data[0].otomatis && r.data[0].refProgres === 'T1', 'progres s.d. 30 → GR otomatis 30, ditandai foto belum lengkap');
ok(r.data[0].tanggal === '2026-10-05' && /^OTOMATIS 01\/BAPM/.test(r.data[0].noSJ) && r.data[0].harga === 250000, 'tanggal = tanggal progres, no. SJ "OTOMATIS <No BA>", harga dari bon');
ok(K.bacaLog_(P).some(l => l.aksi === 'PENERIMAAN OTOMATIS'), 'tercatat di Log: PENERIMAAN OTOMATIS');
r = oto('T1', [B0(30)]); ok(r.ok && !r.data.length && /sudah diterima gudang 30/.test(r.lewat[0].alasan), 'dijalankan ulang → tidak ada GR baru (idempoten)');
r = oto('T2', [B0(50)]); ok(r.data.length === 1 && r.data[0].qty === 20 && total(0) === 50, 'progres berikutnya s.d. 50 → GR otomatis hanya selisih 20 (total 50)');

console.log('2. Gudang menyusul mencatat barang yang sama → digabung, tidak dobel');
r = STF('gudangTerimaBon', { data: { bonNomor: '001/BON/2026', tanggal: '2026-10-22', noSJ: 'SJ-77', sjFile: SJ(1), foto: [FT(1)], baris: [{ idx: 0, qty: 40 }] } });
ok(r.ok && r.digabung === 2, 'penerimaan gudang 40 diterima (sisa bon dihitung tanpa GR otomatis yang menunggu foto)');
const M0 = masuk().filter(x => x.bonIdx === 0);
ok(M0.filter(x => x.otomatis && x.status === 'DIGABUNG').length === 1 && M0.find(x => x.otomatis && x.status === 'AKTIF').qty === 10, 'GR otomatis 30 → DIGABUNG, GR otomatis 20 → sisa 10');
ok(total(0) === 50, 'total diterima tetap 50 = progres s.d. (tidak terhitung ganda)');
r = oto('T3', [B0(50)]); ok(!r.data.length, 'progres yang sama dijalankan lagi setelah digabung → tetap tidak menambah');

console.log('3. Gudang lebih dulu → progres tidak membuat GR ganda');
r = STF('gudangTerimaBon', { data: { bonNomor: '001/BON/2026', tanggal: '2026-10-10', noSJ: 'SJ-80', sjFile: SJ(2), foto: [FT(2)], baris: [{ idx: 1, qty: 20 }] } }); ok(r.ok, 'gudang mencatat Beton 20 lebih dulu');
r = oto('T3', [B1(20)]); ok(!r.data.length && /sudah diterima gudang 20/.test(r.lewat[0].alasan), 'progres s.d. 20 → tidak ada GR otomatis');
r = oto('T4', [B1(25)]); ok(r.data.length === 1 && r.data[0].qty === 5 && total(1) === 25, 'progres s.d. 25 → GR otomatis hanya 5');

console.log('4. Batas sisa bon');
r = oto('T4', [B1(80)]); ok(r.data.length === 1 && r.data[0].qty === 25 && total(1) === 50, 'progres s.d. 80 > volume bon 50 → GR otomatis dibatasi sisa bon (25)');
r = oto('T4', [{ bonNomor: '001/BON/2026', bonIdx: 0, kode: '9999', sd: 99 }, { bonNomor: 'TIDAK-ADA', bonIdx: 0, sd: 5 }]);
ok(!r.data.length && /kode material/.test(r.lewat[0].alasan) && /tidak ditemukan/.test(r.lewat[1].alasan), 'kode berbeda / bon tidak ada → dilewati dengan alasan');

console.log('5. Petugas Gudang melengkapi foto');
const tunggu = masuk().filter(x => x.status === 'AKTIF' && x.fotoKurang);
ok(tunggu.length === 3, '3 GR otomatis menunggu foto');
r = GDG('gudangLengkapiFoto', { data: { kiriman: tunggu[0].kiriman, foto: [] } }); ok(!r.ok && /minimal 1 foto/.test(r.error), 'tanpa foto ditolak');
r = GDG('gudangLengkapiFoto', { data: { kiriman: tunggu[0].kiriman, foto: [FT(3), FT(4)], sjFile: SJ(3), noSJ: 'SJ-90' } });
ok(r.ok && r.data.every(x => !x.fotoKurang && x.foto.filter(Boolean).length === 2 && x.noSJ === 'SJ-90' && x.dilengkapiOleh === 'Petugas Gudang'), 'Petugas Gudang melengkapi 2 foto + surat jalan → tidak lagi menunggu');
r = GDG('gudangLengkapiFoto', { data: { kiriman: tunggu[0].kiriman, foto: [FT(3)] } }); ok(!r.ok && /sudah dilengkapi/.test(r.error), 'dilengkapi dua kali ditolak');
r = GDG('gudangOtomatisProgres', { data: { progresId: 'T1', baris: [B0(99)] } }); ok(!r.ok, 'Petugas Gudang tidak dapat membuat GR otomatis (khusus Pengadaan)');
ok(K.bacaLog_(P).some(l => l.aksi === 'LENGKAPI FOTO PENERIMAAN'), 'tercatat di Log: LENGKAPI FOTO PENERIMAAN');

console.log('6. Stok & pengeluaran memakai GR otomatis');
r = STF('gudangKeluarSimpan', { data: { kunci: '1000001017', tanggal: '2026-10-25', qty: 45, untuk: 'Pengecoran', penerima: 'Mandor', foto: FT(5) } }); ok(r.ok, 'pengeluaran 45 M3 diterima (stok 50 termasuk GR otomatis)');
r = oto('XX', [B0(1)]); ok(!r.ok && /tidak ditemukan/.test(r.error), 'progres tidak dikenal ditolak');
console.log('\nLULUS ' + lulus + ' cek penerimaan otomatis (1.10.2)');
