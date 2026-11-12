// Uji Modul server 1.10.16 — notifikasi hanya kontrak aktif (ringkasan kontrak disaring di server).   node uji/uji_notif_aktif.js [server-modul-x.json]
const assert = require('assert'), path = require('path');
const { buatModul } = require('./kernel_tiruan.js');
const K = buatModul(process.argv[2] || path.join(__dirname, '..', 'server-modul-1.10.16.json'), { hariIni: '2026-11-12' }), A = K.MODUL.aksi, P = 'JICT';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const ADMIN = { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' }, STAF = { nama: 'Staf Pengadaan', peran: 'PENGADAAN' };
let n = 0; const now = () => new Date(Date.UTC(2026, 10, 12, 2, 0, n++)).toISOString();
K.ctx.IZIN_REG = {}; K.ctx.mp24Baca_ = () => []; K.ctx.mp24IsiAlokasi_ = () => ({}); K.ctx.mp24TulisBaris_ = () => { };
const T = '/WK-NK.KSO/PDBJ/1726012/2026', FAJAR = '024/SPK' + T, ADHI = '031/SPM' + T, FARIK = '005/SPPM' + T, KANE = '015/SPPP' + T, KANE1 = '015/ADD1/SPPP' + T, HAPUS = '040/SPK' + T, HOLD = '041/SPK' + T;
K.koleksi[P + '|data'] = [
  { id: 'R1', noKontrak: KANE, namaVendor: 'Kane Perkasa Indonesia, PT', nilai: 81700000, diposting: true, tglSelesai: '2026-08-27', versi: 1, items: [] },
  { id: 'R2', noKontrak: KANE1, namaVendor: 'Kane Perkasa Indonesia, PT', nilai: 136800000, diposting: true, tglSelesai: '2026-11-30', versi: 1, items: [] },
  { id: 'R3', noKontrak: HOLD, namaVendor: 'Vendor Tahan, CV', nilai: 5000000, diposting: true, tglSelesai: '2026-11-01', versi: 1, items: [] }];
K.koleksi[P + '|progres'] = [];
const butir = (no, vendor, tgl, reg) => ({ no, reg, judul: no.split('/').slice(0, 2).join('/') + '/2026 · ' + vendor, tgl, ket: 'Masa berlaku berakhir', nilai: 'Lewat' });
const SNAP = [butir(FAJAR, 'Fajar Mulia Utama, CV', '2026-07-03', 0), butir(ADHI, 'Adhimix RMC Indonesia, PT', '2026-07-08', 0), butir(FARIK, 'Farika Steel, PT', '2026-10-03', 0),
  butir(KANE, 'Kane Perkasa Indonesia, PT', '2026-08-27', 1), butir(KANE1, 'Kane Perkasa Indonesia, PT', '2026-11-30', 1), butir(HAPUS, 'Vendor Dihapus, CV', '2026-10-01', 1), butir(HOLD, 'Vendor Tahan, CV', '2026-11-01', 1)];
const susun = () => A.notifInfo({}, ADMIN, P).pratinjau.grup.find(g => g.k === 'kontrak').item.map(x => x.judul);   // = isi email / Telegram terjadwal

console.log('A. Ringkasan baru (membawa nomor kontrak)');
ok(A.notifSnapshot({ data: { kontrak: SNAP } }, STAF, P, now()).ok, 'ringkasan kontrak tersimpan');
const simpan = JSON.parse(K.sheets[P + '_Notifikasi'].rows.find(r => r[0] === 'SNAP')[3]).grup.kontrak.item;
ok(simpan.length === 7 && simpan[0].no === FAJAR && simpan[3].reg === 1 && simpan[0].reg === 0, 'butir menyimpan nomor kontrak lengkap (no) & asal baris (reg)');
let L = susun();
ok(L.some(j => j.indexOf('024/SPK') === 0) && L.some(j => j.indexOf('031/SPM') === 0) && L.some(j => j.indexOf('005/SPPM') === 0), 'kontrak Master aktif (Fajar, Adhimix, Farika) tetap dinotifikasikan');
ok(!L.some(j => j.indexOf('040/SPK') === 0), 'kontrak Register yang sudah dihapus / dibatalkan dari Register tidak dimuat');
ok(!L.some(j => j.indexOf('015/SPPP') === 0) && L.some(j => j.indexOf('015/ADD1') === 0), 'kontrak awal yang sudah ber-addendum tidak dimuat; addendum terakhir (s.d. 30 Nov 2026) dimuat');

console.log('B. PO CANCEL / HOLD → langsung hilang tanpa menunggu ringkasan baru dari aplikasi');
A.kontrakBatal({ data: { noKontrak: FAJAR, status: 'CANCELLED', alasan: 'Kontrak dibatalkan, vendor tidak melanjutkan pekerjaan', sumber: 'MASTER', namaVendor: 'Fajar Mulia Utama, CV', nilai: 1774117561 } }, STAF, P, now());
A.kontrakBatal({ data: { noKontrak: HOLD, status: 'HOLD', alasan: 'Ditahan menunggu klarifikasi spesifikasi' } }, STAF, P, now());
L = susun();
ok(!L.some(j => /Fajar Mulia/.test(j)), 'Fajar Mulia (PO CANCEL) tidak lagi muncul sebagai "Lewat"');
ok(!L.some(j => j.indexOf('041/SPK') === 0), 'kontrak HOLD tidak dimuat');
ok(L.length === 3 && L.some(j => /Adhimix/.test(j)) && L.some(j => /Farika/.test(j)) && L.some(j => /015\/ADD1/.test(j)), 'kontrak aktif lain tidak terpengaruh (Adhimix, Farika, Kane Add.1)');

console.log('C. Ringkasan lama (aplikasi ≤ 2.10.15, tanpa nomor kontrak)');
A.notifSnapshot({ data: { kontrak: SNAP.map(x => ({ judul: x.judul, tgl: x.tgl, ket: x.ket, nilai: x.nilai })) } }, STAF, P, now());
L = susun();
ok(!L.some(j => /Fajar Mulia/.test(j)) && !L.some(j => j.indexOf('041/SPK') === 0), 'PO CANCEL / HOLD tetap tersaring lewat awalan judul');
ok(L.some(j => /Adhimix/.test(j)) && L.some(j => /Farika/.test(j)), 'butir lain tetap ada');

console.log('D. Pemulihan');
A.kontrakPulih({ data: { noKontrak: FAJAR, alasan: 'Pembatalan keliru, kontrak dilanjutkan' } }, ADMIN, P, now());
A.notifSnapshot({ data: { kontrak: SNAP } }, STAF, P, now());
ok(susun().some(j => /Fajar Mulia/.test(j)), 'kontrak yang dipulihkan (AKTIF) kembali dinotifikasikan');
ok(K.MODUL.fitur.indexOf('notifKontrakAktif') >= 0 && K.MODUL.fitur.indexOf('kontrakBatal') >= 0, 'fitur notifKontrakAktif terdaftar; fitur 1.10.15 utuh');
console.log('\n' + lulus + ' cek lulus');
