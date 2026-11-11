// Uji Modul server 1.10.11 — integritas data gudang (audit & pembersihan duplikat), anti entri ganda, Ubah Foto penerimaan.
//   node uji/uji_integritas_gudang.js [server-modul-x.json]
// Skenario utama = kasus lapangan Peluit 1600000073: migrasi 12 (01-Sep-2026) + GR otomatis BAPM 12 (02-Nov-2026) → terusan 24.
const assert = require('assert'), path = require('path');
const { buatModul } = require('./kernel_tiruan.js');
const K = buatModul(process.argv[2] || path.join(__dirname, '..', 'server-modul-1.10.11.json')), A = K.MODUL.aksi, P = 'JICT';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const galat = (fn, re, m) => { assert.throws(fn, re, m); lulus++; console.log('  ✓ ' + m); };
const ADMIN = { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' }, STAF = { nama: 'Staf Pengadaan', peran: 'PENGADAAN' }, LIHAT = { nama: 'Kepala Proyek', peran: 'LIHAT' }, PETUGAS = { nama: 'Nabila', peran: 'LIHAT' };
K.props.GUDANG_PETUGAS = JSON.stringify(['Nabila']);
let jam = 0; const now = () => '2026-11-11T0' + Math.floor(jam / 60) + ':' + String(jam++ % 60).padStart(2, '0') + ':00.000Z';
const BAPM = '01/BAPM/064/SPM/WK-NK.KSO/PDBJ/1726012/2026', SPM = '064/SPM/WK-NK.KSO/PDBJ/1726012/2026';
K.koleksi[P + '|permintaan'] = [{ nomor: 'BON/001', tanggal: '2026-10-05', departemen: 'Logistik', items: [
  { kode: '1600000073', uraian: 'Peluit', sat: 'EA', vol: 12, harga: 20000 }, { kode: '1600000074', uraian: 'Gembok ATS 70mm', sat: 'PC', vol: 7, harga: 75000 },
  { kode: '1600000076', uraian: 'Kabel Ducting 25x40mm 1,7m', sat: 'BTG', vol: 100, harga: 30000 }, { kode: '1600000080', uraian: 'Semen', sat: 'SAK', vol: 300, harga: 60000 },
  { kode: '1600000075', uraian: 'Penghapus White Board Magnet', sat: 'PC', vol: 2, harga: 20000 }] }];
K.koleksi[P + '|progres'] = [{ id: 'PRG1', nomorBA: BAPM, noKontrak: SPM, tanggal: '2026-11-02', tanggalBA: '2026-11-02', versi: 1 }];
const JPG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4]).toString('base64');
const foto = (u, ket) => A.gudangUnggahFoto({ berkas: { id: 'x', data: JPG, nama: 'foto.jpg', jenis: 'FOTO-GR', ket: ket || '' } }, u || STAF, P, now()).data;
const baca = () => A.gudangBaca({}, ADMIN, P);
const aktif = (L, kode) => L.filter(r => r.status === 'AKTIF' && r.kode === kode), jumlah = L => L.reduce((a, r) => a + r.qty, 0);

console.log('A. Data awal: migrasi gudang lama + penerimaan resmi BAPM');
const mig = { format: 'monitoring-pengadaan-migrasi-gudang', proyek: P, sumber: 'LOGINV-08 lama', masuk: [
  { id: 'GR-MIG-0001', tanggal: '2026-09-01', kode: '1600000073', uraian: 'Peluit', sat: 'EA', qty: 12 },
  { id: 'GR-MIG-0002', tanggal: '2026-09-01', kode: '1600000076', uraian: 'Kabel Ducting 25x40mm 1,7m', sat: 'BTG', qty: 100 },
  { id: 'GR-MIG-0003', tanggal: '2026-08-20', kode: '1600000080', uraian: 'Semen', sat: 'SAK', qty: 500 },
  { id: 'GR-MIG-0004', tanggal: '2026-08-15', kode: '1600000099', uraian: 'Helm Proyek', sat: 'PC', qty: 20 }],
  keluar: [
  { id: 'GI-MIG-0001', tanggal: '2026-09-01', kode: '1600000073', uraian: 'Peluit', sat: 'EA', qty: 12, penerima: '(data lama - tidak tercatat)' },
  { id: 'GI-MIG-0002', tanggal: '2026-09-03', kode: '1600000076', uraian: 'Kabel Ducting 25x40mm 1,7m', sat: 'BTG', qty: 40, penerima: 'Pak Budi', untuk: 'Dermaga' },
  { id: 'GI-MIG-0004', tanggal: '2026-08-16', kode: '1600000099', uraian: 'Helm Proyek', sat: 'PC', qty: 5, penerima: 'Mandor' }] };
ok(A.gudangImporMigrasi({ data: mig }, ADMIN, P, now()).ringkas.masukBaru === 4, 'impor migrasi gudang lama: 4 GR + 3 GI');
const oto = A.gudangOtomatisProgres({ data: { progresId: 'PRG1', baris: [{ bonNomor: 'BON/001', bonIdx: 0, kode: '1600000073', sd: 12 }, { bonNomor: 'BON/001', bonIdx: 1, kode: '1600000074', sd: 7 }, { bonNomor: 'BON/001', bonIdx: 2, kode: '1600000076', sd: 100 }, { bonNomor: 'BON/001', bonIdx: 3, kode: '1600000080', sd: 300 }] } }, STAF, P, now());
ok(oto.data.length === 4 && oto.data.every(r => r.tanggal === '2026-11-02'), 'BAPM 02-Nov-2026 → 4 penerimaan otomatis bertanggal BAPM');
A.gudangLengkapiFoto({ data: { kiriman: oto.kiriman, foto: [foto(), foto(), null, null] } }, STAF, P, now());
A.gudangKeluarSimpan({ data: { kunci: '1600000073', tanggal: '2026-11-02', qty: 12, untuk: 'Pos jaga', penerima: 'Nabila', foto: foto() } }, STAF, P, now());
let D = baca();
ok(jumlah(aktif(D.masuk, '1600000073')) === 24 && jumlah(aktif(D.keluar, '1600000073')) === 24, 'kondisi lapangan tereproduksi: Peluit terima 24 / keluar 24 (ganda), catatan awal 01-Sep');

console.log('B. gudangAudit — seluruh material');
galat(() => A.gudangAudit({}, LIHAT, P), /Pengadaan \/ Admin/, 'akun Lihat saja tidak dapat mengaudit');
galat(() => A.gudangAudit({}, PETUGAS, P), /Petugas Gudang hanya/, 'Petugas Gudang tidak dapat mengaudit');
let au = A.gudangAudit({}, STAF, P), T = id => au.data.find(t => t.id === id);
const pl = T('DUPLIKAT_MIGRASI|1600000073');
ok(pl && pl.tingkat === 'PASTI' && pl.sebelum.terima === 24 && pl.sesudah.terima === 12 && pl.sesudah.keluar === 12 && pl.volBon === 12, 'Peluit: duplikat migrasi PASTI, terima 24 → 12, keluar 24 → 12');
ok(pl.sebelum.tanggalAwal === '2026-09-01' && pl.sesudah.tanggalAwal === '2026-11-02', 'Peluit: catatan awal 01-Sep-2026 → 02-Nov-2026 (tanggal BAPM)');
ok(pl.tindakan.length === 2 && pl.tindakan.every(t => t.aksi === 'BATAL' && /-MIG-0001$/.test(t.id)), 'Peluit: yang dibatalkan hanya GR-MIG & GI-MIG penyeimbang (data BAPM & pengeluaran Nabila utuh)');
const kb = T('DUPLIKAT_MIGRASI|1600000076');
ok(kb && kb.tingkat === 'PASTI' && kb.tindakan.some(t => t.id === 'GR-MIG-0002' && t.aksi === 'BATAL') && kb.tindakan.some(t => t.id === 'GI-MIG-0002' && t.aksi === 'TANGGAL' && t.tanggalBaru === '2026-11-02') && kb.sesudah.saldo === 60,
  'Kabel: GR migrasi batal, pengeluaran lama 40 (Pak Budi) dipertahankan & digeser ke tanggal BAPM → saldo 60');
const sm = T('DUPLIKAT_MIGRASI|1600000080');
ok(sm && sm.tingkat === 'TINJAU' && /stok lama|tidak sama persis/.test(sm.catatan), 'Semen: migrasi 500 > penerimaan resmi 300 → TINJAU (tidak dibersihkan otomatis)');
ok(!au.data.some(t => t.kunci === '1600000099' || t.kunci === '1600000074'), 'Helm (hanya stok lama) & Gembok (hanya BAPM) tidak ditandai');
ok(au.ringkas.pasti === 2 && au.ringkas.batalGR === 2 + sm.tindakan.filter(t => t.jenis === 'masuk').length, 'ringkasan audit: 2 temuan pasti');

console.log('C. gudangBersihkan — atomik, beraudit, dapat diurungkan');
const pilihPasti = () => au.data.filter(t => t.tingkat === 'PASTI' && t.tindakan.length).map(t => ({ id: t.id, sidik: t.sidik }));
galat(() => A.gudangBersihkan({ data: { konfirmasi: 'BERSIHKAN', pilih: pilihPasti() } }, STAF, P, now()), /khusus Admin/, 'pembersihan khusus Admin');
galat(() => A.gudangBersihkan({ data: { konfirmasi: 'ya', pilih: pilihPasti() } }, ADMIN, P, now()), /BERSIHKAN/, 'wajib mengetik BERSIHKAN');
galat(() => A.gudangBersihkan({ data: { konfirmasi: 'BERSIHKAN', pilih: [{ id: pl.id, sidik: 'basi' }] } }, ADMIN, P, now()), /berubah sejak audit/, 'audit basi ditolak (tidak ada yang diubah)');
const nBaris = K.sheets[P + '_GudangMasuk'].rows.length + K.sheets[P + '_GudangKeluar'].rows.length;
const br = A.gudangBersihkan({ data: { konfirmasi: 'bersihkan', pilih: pilihPasti() } }, ADMIN, P, now());
D = baca();
ok(br.ok && /^BRS-\d{14}$/.test(br.batch) && br.ringkas.batalGR === 2 && br.ringkas.batalGI === 1 && br.ringkas.ubahTanggal === 1, 'pembersihan: 2 GR migrasi + 1 GI migrasi batal, 1 tanggal disesuaikan');
const plM = aktif(D.masuk, '1600000073'), plK = aktif(D.keluar, '1600000073');
ok(jumlah(plM) === 12 && plM.every(r => r.tanggal === '2026-11-02') && jumlah(plK) === 12 && plK[0].penerima === 'Nabila', 'Peluit: penerimaan kumulatif 12 (bukan 24), catatan pertama 02-Nov-2026, keluar 12 (Nabila)');
ok(K.sheets[P + '_GudangMasuk'].rows.length + K.sheets[P + '_GudangKeluar'].rows.length === nBaris, 'tidak ada baris yang dihapus');
const gm = D.masuk.find(r => r.id === 'GR-MIG-0001');
ok(gm.status === 'BATAL' && gm.pembersihan.batch === br.batch && /migrasi ganda/.test(gm.alasanBatal) && K.sheets[P + '_GudangMasuk'].rows.find(r => r[0] === 'GR-MIG-0001')[11] === 'BATAL', 'baris migrasi berstatus BATAL + jejak batch (kolom Status ikut diperbarui)');
ok(D.keluar.find(r => r.id === 'GI-MIG-0002').tanggal === '2026-11-02' && D.keluar.find(r => r.id === 'GI-MIG-0002').tanggalAwal === '2026-09-03', 'pengeluaran lama Kabel tetap aktif, tanggal awal tersimpan');
ok(jumlah(aktif(D.masuk, '1600000080')) === 800 && jumlah(aktif(D.masuk, '1600000099')) === 20, 'material TINJAU & stok lama sah tidak tersentuh');
ok(K.log.filter(l => l.jenis === 'PEMBERSIHAN DATA GUDANG').length === 3, 'Log: 1 baris per temuan + 1 ringkasan batch');
au = A.gudangAudit({}, STAF, P);
ok(!T('DUPLIKAT_MIGRASI|1600000073') && !T('DUPLIKAT_MIGRASI|1600000076') && au.batch[0].batch === br.batch, 'audit ulang: Peluit & Kabel bersih; batch terakhir tercantum');
galat(() => A.gudangBersihkanUrung({ data: { batch: br.batch, alasan: 'salah' } }, ADMIN, P, now()), /12 karakter/, 'urungkan butuh alasan');
const ur = A.gudangBersihkanUrung({ data: { batch: br.batch, alasan: 'uji mengurungkan pembersihan' } }, ADMIN, P, now());
D = baca();
ok(ur.kembali.masuk === 2 && ur.kembali.keluar === 2 && jumlah(aktif(D.masuk, '1600000073')) === 24 && D.keluar.find(r => r.id === 'GI-MIG-0002').tanggal === '2026-09-03', 'urungkan batch: data kembali persis seperti sebelum pembersihan');
galat(() => A.gudangBersihkanUrung({ data: { batch: br.batch, alasan: 'uji mengurungkan pembersihan' } }, ADMIN, P, now()), /sudah diurungkan/, 'batch tidak dapat diurungkan dua kali');
au = A.gudangAudit({}, STAF, P);
A.gudangBersihkan({ data: { konfirmasi: 'BERSIHKAN', pilih: pilihPasti() } }, ADMIN, P, now());
D = baca(); ok(jumlah(aktif(D.masuk, '1600000073')) === 12, 'dibersihkan lagi → Peluit 12');
// TINJAU dipilih Admin secara sadar
au = A.gudangAudit({}, STAF, P);
const sm2 = T('DUPLIKAT_MIGRASI|1600000080');
ok(sm2.tindakan.length === 1 && sm2.tindakan[0].id === 'GR-MIG-0003', 'Semen: usulan batal GR migrasi 500 tersedia untuk keputusan Admin');

console.log('D. Temuan lain: melebihi volume bon · tanggal BAPM · pengeluaran identik');
const shM = K.sheets[P + '_GudangMasuk'], gb = D.masuk.find(r => r.kode === '1600000074' && r.status === 'AKTIF');
const kembar = Object.assign({}, gb, { id: 'GR-KEMBAR-1', dibuatPada: '2026-11-11T09:00:00.000Z' });   // baris ganda warisan (mis. kirim ulang sebelum 1.10.11)
shM.rows.push([kembar.id, kembar.tanggal, kembar.bonNomor, 2, kembar.kode, kembar.uraian, kembar.sat, kembar.qty, kembar.harga, kembar.noSJ, kembar.diterimaOleh, 'AKTIF', '', '', JSON.stringify(kembar)]);
K.koleksi[P + '|progres'][0].tanggalBA = '2026-11-03';   // tanggal BAPM dikoreksi di BK, gudang belum ikut
const shK = K.sheets[P + '_GudangKeluar'], nb = D.keluar.find(r => r.id === 'GI-MIG-0004'), nb2 = Object.assign({}, nb, { id: 'GI-MIG-0004B', dibuatPada: '2026-11-11T09:30:00.000Z' });   // impor ganda dengan ID lain
au = A.gudangAudit({}, STAF, P);
const gk = T('DUPLIKAT_PENERIMAAN|1600000074|BON/001|1');
ok(gk && gk.tingkat === 'PASTI' && gk.tindakan.length === 1 && gk.sebelum.terima === 14 && gk.sesudah.terima === 7, 'Gembok: 14 diterima > volume bon 7 → 1 baris ganda dibatalkan');
const tg = T('TANGGAL_BAPM|1600000073');
ok(tg && tg.tingkat === 'TINJAU' && !tg.tindakan.length && /saldo menjadi minus/.test(tg.catatan), 'Peluit: geser ke 03-Nov membuat saldo minus (keluar 02-Nov) → tidak diubah, ditandai TINJAU');
ok(T('TANGGAL_BAPM|1600000074').tingkat === 'PASTI' && T('TANGGAL_BAPM|1600000074').tindakan.every(t => t.tanggalBaru === '2026-11-03'), 'Gembok: tanggal gudang → tanggal BAPM 03-Nov');
A.gudangBersihkan({ data: { konfirmasi: 'BERSIHKAN', pilih: [gk, T('TANGGAL_BAPM|1600000074')].map(t => ({ id: t.id, sidik: t.sidik })) } }, ADMIN, P, now());
D = baca(); ok(jumlah(aktif(D.masuk, '1600000074')) === 7 && aktif(D.masuk, '1600000074')[0].tanggal === '2026-11-03' && /^BAPM /.test(aktif(D.masuk, '1600000074')[0].tanggalSumber), 'Gembok bersih: 7 PC, bertanggal BAPM');
K.koleksi[P + '|progres'][0].tanggalBA = '2026-11-02';
shK.rows.push([nb2.id, nb2.tanggal, nb2.kode, nb2.uraian, nb2.sat, nb2.qty, nb2.untuk, nb2.penerima, 'AKTIF', '', '', JSON.stringify(nb2)]);
au = A.gudangAudit({}, STAF, P);
const hk = T('DUPLIKAT_PENGELUARAN|1600000099');
ok(hk && hk.tingkat === 'TINJAU' && hk.tindakan.length === 1 && hk.tindakan[0].id === 'GI-MIG-0004B', 'pengeluaran identik → TINJAU, yang diusulkan batal = entri yang lebih baru');
A.gudangBersihkan({ data: { konfirmasi: 'BERSIHKAN', pilih: [{ id: hk.id, sidik: hk.sidik }] } }, ADMIN, P, now());
D = baca(); ok(jumlah(aktif(D.keluar, '1600000099')) === 5 && jumlah(aktif(D.masuk, '1600000073')) === 12 && jumlah(aktif(D.keluar, '1600000073')) === 12, 'Helm keluar 5 (bukan 10); Peluit tetap 12 / 12');

console.log('E. Pencegahan entri ganda');
galat(() => A.gudangImporMigrasi({ data: Object.assign({}, mig, { masuk: [{ id: 'GR-MIG-9001', tanggal: '2026-09-01', kode: '1600000073', uraian: 'Peluit', sat: 'EA', qty: 12 }], keluar: [] }) }, ADMIN, P, now()),
  /sudah diterima lewat Bon\/BAPM.*menggandakan/, 'impor migrasi material yang sudah diterima penuh lewat BAPM ditolak');
const cek = A.gudangImporCek({ data: Object.assign({}, mig, { masuk: [{ id: 'GR-MIG-9004', tanggal: '2026-08-15', kode: '1600000099', uraian: 'Helm Proyek', sat: 'PC', qty: 20 }], keluar: [] }) }, ADMIN, P);
ok(cek.ringkas.isiSama === 1 && cek.ringkas.masukBaru === 0, 'impor ulang berkas yang sama dengan ID baru → dilewati (isi sudah ada)');
galat(() => A.gudangKeluarSimpan({ data: { kunci: '1600000099', tanggal: '2026-08-16', qty: 5, untuk: 'Migrasi data gudang lama', penerima: 'mandor', foto: foto() } }, STAF, P, now()), /Pengeluaran yang sama sudah tercatat/, 'pengeluaran identik (material + tanggal + qty + penerima + untuk) ditolak');
ok(A.gudangKeluarSimpan({ data: { kunci: '1600000099', tanggal: '2026-08-16', qty: 5, untuk: 'Area fabrikasi', penerima: 'Mandor', foto: foto() } }, STAF, P, now()).ok, 'pengambilan kedua yang berbeda keperluan tetap diterima');
const sj = foto();
A.gudangTerimaBon({ data: { bonNomor: 'BON/001', tanggal: '2026-11-05', noSJ: 'SJ-001', sjFile: sj, foto: [foto()], baris: [{ idx: 4, qty: 1 }] } }, STAF, P, now());
galat(() => A.gudangTerimaBon({ data: { bonNomor: 'BON/001', tanggal: '2026-11-05', noSJ: 'sj 001', sjFile: sj, foto: [foto()], baris: [{ idx: 4, qty: 1 }] } }, STAF, P, now()), /sudah dicatat untuk bon ini/, 'surat jalan sama ("SJ-001" = "sj 001") ditolak');
galat(() => A.gudangTerimaBon({ data: { bonNomor: 'BON/001', tanggal: '2026-11-06', noSJ: 'SJ-002', sjFile: sj, foto: [foto()], baris: [{ idx: 0, qty: 1 }] } }, STAF, P, now()), /melebihi sisa bon/, 'penerimaan di atas volume bon tetap ditolak');
ok(A.gudangOtomatisProgres({ data: { progresId: 'PRG1', baris: [{ bonNomor: 'BON/001', bonIdx: 0, kode: '1600000073', sd: 12 }] } }, STAF, P, now()).data.length === 0, 'BAPM yang sama disimpan ulang → 0 penerimaan baru (idempoten)');

console.log('F. gudangUbahFoto');
D = baca(); let r = D.masuk.find(x => x.kode === '1600000076' && x.status === 'AKTIF' && x.otomatis), lama0 = r.foto[0].idServer;
const fb = foto(STAF, 'foto ulang');
galat(() => A.gudangUbahFoto({ data: { id: r.id, versi: r.versi, foto: [fb, r.foto[1]], alasan: 'buram' } }, STAF, P, now()), /minimal 8 karakter/, 'alasan wajib');
galat(() => A.gudangUbahFoto({ data: { id: r.id, versi: r.versi, foto: [null, null, null, null], alasan: 'foto buram, difoto ulang' } }, STAF, P, now()), /Minimal 1 foto/, 'minimal 1 foto tersisa');
galat(() => A.gudangUbahFoto({ data: { id: r.id, versi: r.versi, foto: [r.foto[0], r.foto[1]], alasan: 'foto buram, difoto ulang' } }, STAF, P, now()), /Tidak ada perubahan/, 'tanpa perubahan ditolak');
galat(() => A.gudangUbahFoto({ data: { id: r.id, versi: r.versi - 1, foto: [fb, r.foto[1]], alasan: 'foto buram, difoto ulang' } }, STAF, P, now()), /KONFLIK/, 'versi basi → KONFLIK');
galat(() => A.gudangUbahFoto({ data: { id: r.id, versi: r.versi, foto: [fb, r.foto[1]], alasan: 'foto buram, difoto ulang' } }, LIHAT, P, now()), /Hanya Petugas Gudang, Pengadaan, atau Admin/, 'akun Lihat saja ditolak');
galat(() => A.gudangUbahFoto({ data: { id: r.id, versi: r.versi, foto: [fb, r.foto[1]], alasan: 'foto buram, difoto ulang' } }, PETUGAS, P, now()), /dicatatnya sendiri/, 'Petugas Gudang hanya untuk penerimaan miliknya');
galat(() => A.gudangUbahFoto({ data: { id: r.id, versi: r.versi, foto: [{ id: 'F999', idServer: 'F999' }, r.foto[1]], alasan: 'foto buram, difoto ulang' } }, STAF, P, now()), /tidak ditemukan di Google Drive/, 'foto baru wajib sudah terunggah di proyek');
const uf = A.gudangUbahFoto({ data: { id: r.id, versi: r.versi, foto: [fb, r.foto[1], null, null], alasan: 'foto buram, difoto ulang' } }, STAF, P, now()).data[0];
ok(uf.foto[0].idServer === fb.idServer && uf.foto[1].idServer === r.foto[1].idServer && uf.versi === r.versi + 1 && uf.fotoWakil === false, 'foto Tampak Depan diganti, Tampak Belakang dipertahankan, versi naik');
ok(uf.fotoRiwayat.length === 1 && uf.fotoRiwayat[0].foto[0].idServer === lama0 && uf.fotoRiwayat[0].digantiOleh === 'Staf Pengadaan' && K.files[lama0], 'foto lama tercatat di fotoRiwayat & berkasnya tetap ada di Drive');
ok(K.log.some(l => l.jenis === 'UBAH FOTO PENERIMAAN' && /2 foto → 2 foto \(1 baru\).*difoto ulang/.test(l.ket)), 'Log UBAH FOTO PENERIMAAN');
D = baca(); const sek = D.masuk.filter(x => x.status === 'AKTIF' && x.kiriman === r.kiriman && x.id !== r.id);
const u2 = A.gudangUbahFoto({ data: { id: sek[0].id, versi: sek[0].versi, foto: [sek[0].foto[1], sek[0].foto[0]], alasan: 'urutan sisi foto tertukar', seKiriman: true } }, ADMIN, P, now()).data;
ok(u2.length === sek.length && u2.every(x => x.foto[0].sisi === 'Tampak Depan' && x.foto[0].idServer === sek[0].foto[1].idServer), 'seKiriman: semua item yang memakai foto yang sama ikut diperbarui (item yang fotonya sudah berbeda tidak)');
const tb = baca().masuk.find(x => x.noSJ === 'SJ-001');
ok(A.gudangUbahFoto({ data: { id: tb.id, versi: tb.versi, foto: [tb.foto[0], foto(PETUGAS)], alasan: 'tambah foto tampak belakang' } }, Object.assign({}, STAF), P, now()).data[0].foto.filter(Boolean).length === 2, 'menambah foto pada penerimaan manual');
const bt = baca().masuk.find(x => x.id === 'GR-MIG-0001');
galat(() => A.gudangUbahFoto({ data: { id: bt.id, versi: bt.versi, foto: [fb], alasan: 'foto buram, difoto ulang' } }, ADMIN, P, now()), /sudah dibatalkan/, 'penerimaan batal tidak dapat diubah fotonya');
ok(['gudangAudit', 'gudangUbahFoto', 'gudangAntiGanda'].every(f => K.MODUL.fitur.indexOf(f) >= 0) && K.MODUL.baca.indexOf('gudangAudit') >= 0, 'fitur & aksi baca terdaftar');
console.log('UJI INTEGRITAS GUDANG 1.10.11: ' + lulus + ' cek LULUS');
