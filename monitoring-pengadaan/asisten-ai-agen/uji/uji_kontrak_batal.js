// Uji Modul server 1.10.12 — PO CANCEL / HOLD (soft-delete beraudit).   node uji/uji_kontrak_batal.js [server-modul-x.json]
const assert = require('assert'), path = require('path');
const { buatModul } = require('./kernel_tiruan.js');
const K = buatModul(process.argv[2] || path.join(__dirname, '..', 'server-modul-1.10.12.json')), A = K.MODUL.aksi, P = 'JICT';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const galat = (fn, re, m) => { assert.throws(fn, re, m); lulus++; console.log('  ✓ ' + m); };
const ADMIN = { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' }, STAF = { nama: 'Staf Pengadaan', peran: 'PENGADAAN' }, KEU = { nama: 'Keu', peran: 'KEUANGAN' };
let n = 0; const now = () => new Date(Date.UTC(2026, 10, 12, 2, 0, n++)).toISOString();
// tiruan bagian kernel yang dipakai blok ini
K.ctx.IZIN_REG = {}; const alokSheet = [];
K.ctx.mp24Baca_ = () => alokSheet.map(x => JSON.parse(JSON.stringify(x)));
K.ctx.mp24IsiAlokasi_ = (L, x, u, t) => { const l = L.find(z => z.id === x.id); if (!x.alasan) throw new Error('alasan'); return { rec: Object.assign({}, l, { batal: true, alasanBatal: x.alasan, dibatalkanOleh: u.nama, dibatalkanPada: t, versi: l.versi + 1 }), oldId: l.id }; };
K.ctx.mp24TulisBaris_ = (P_, j, rec, oldId) => { alokSheet[alokSheet.findIndex(z => z.id === oldId)] = rec; };
const SPM = '029/SPM/WK-NK.KSO/PDBJ/1726012/2026', SPK = '024/SPK/WK-NK.KSO/PDBJ/1726012/2026', REG = '026/SPK/WK-NK.KSO/PDBJ/1726012/2026';
K.koleksi[P + '|data'] = [{ id: 'L1', noKontrak: REG, namaVendor: 'Surveyor Indonesia, PT', nilai: 295000000, versi: 3, diposting: true, items: [{ kode: '300', uraian: 'Jasa survei', vol: 1, sat: 'LS', noPermintaan: '006/WK-NK.KSO/DIV.II/INF1/1726012/2026' }, { uraian: 'Laporan', vol: 1, sat: 'LS' }] }];
K.koleksi[P + '|progres'] = [{ id: 'B1', noKontrak: SPK, nomorBA: '01/BAPP/024/SPK' }];
alokSheet.push({ id: 'AL1', bonNomor: '006/WK', bonIdx: 2, noKontrak: SPM, wbs: 'W.01', volume: 5, versi: 1 }, { id: 'AL2', bonNomor: '006/WK', bonIdx: 3, noKontrak: SPK, wbs: 'W.01', volume: 2, versi: 1 }, { id: 'AL3', bonNomor: '007/WK', bonIdx: 0, noKontrak: SPM, wbs: 'W.02', volume: 9, versi: 2, batal: true });

console.log('A. Validasi & hak akses');
galat(() => A.kontrakBatal({ data: { noKontrak: SPM, status: 'CANCELLED', alasan: 'vendor mundur dari kontrak' } }, KEU, P, now()), /Pengadaan atau Admin/, 'selain Pengadaan/Admin ditolak');
galat(() => A.kontrakBatal({ data: { noKontrak: SPM, status: 'CANCELLED', alasan: 'batal' } }, STAF, P, now()), /min\. 12 karakter/, 'alasan wajib ≥ 12 karakter');
galat(() => A.kontrakBatal({ data: { noKontrak: SPM, status: 'HAPUS', alasan: 'vendor mundur dari kontrak' } }, STAF, P, now()), /CANCELLED.*HOLD/, 'status selain CANCELLED / HOLD ditolak');
galat(() => A.kontrakBatal({ data: { noKontrak: SPK, status: 'CANCELLED', alasan: 'vendor mundur dari kontrak' } }, STAF, P, now()), /sudah memiliki 1 tagihan\/BK.*Gunakan HOLD/, 'kontrak yang sudah punya tagihan tidak dapat PO CANCEL');

console.log('B. PO CANCEL kontrak Master — soft-delete + lepas Bon');
const c = A.kontrakBatal({ data: { noKontrak: SPM, status: 'CANCELLED', alasan: 'Vendor mundur, PO diterbitkan ulang ke vendor lain', sumber: 'MASTER', namaVendor: 'Adhimix RMC Indonesia, PT', nilai: 1538735000 } }, STAF, P, now());
ok(c.ok && c.data.status === 'CANCELLED' && c.data.oleh === 'Staf Pengadaan' && c.data.riwayat.length === 1 && c.data.riwayat[0].dari === 'AKTIF' && c.data.versi === 1, 'status CANCELLED tercatat: pengguna, waktu, alasan, riwayat');
ok(c.alokasiDibatalkan === 1 && alokSheet.find(a => a.id === 'AL1').batal && /PO CANCEL 029\/SPM/.test(alokSheet.find(a => a.id === 'AL1').alasanBatal) && !alokSheet.find(a => a.id === 'AL2').batal, 'alokasi Bon kontrak itu dibatalkan otomatis (alokasi kontrak lain utuh)');
ok(c.data.bonDilepas.length === 1 && c.data.bonDilepas[0].cara === 'ALOKASI' && alokSheet.length === 3, 'item Bon yang dilepas tercatat; tidak ada baris alokasi yang dihapus');
const sh = K.sheets[P + '_KontrakStatus'];
ok(sh.rows.length === 2 && sh.rows[1][0] === SPM && sh.rows[1][1] === 'CANCELLED' && JSON.parse(sh.rows[1][5]).alasan.startsWith('Vendor mundur'), 'sheet _KontrakStatus: 1 baris per kontrak + DATA JSON');
ok(K.log.some(l => l.jenis === 'PO CANCEL' && /AKTIF → PO CANCEL.*1 item Bon dilepas/.test(l.ket)), 'Log PO CANCEL');
galat(() => A.kontrakBatal({ data: { noKontrak: SPM, status: 'CANCELLED', alasan: 'Vendor mundur, PO diterbitkan ulang' } }, STAF, P, now()), /sudah berstatus PO CANCEL/, 'tidak dapat dibatalkan dua kali');
galat(() => A.saveProgres({ data: { noKontrak: SPM, items: {} } }, STAF, P, now()), /berstatus PO CANCEL.*tagihan \/ BK baru dikunci/, 'tagihan baru untuk kontrak PO CANCEL ditolak');
ok(A.saveProgres({ data: { noKontrak: SPK, items: {} } }, STAF, P, now()) === undefined, 'kontrak aktif: saveProgres diteruskan ke kernel');
galat(() => A.kontrakPulih({ data: { noKontrak: SPM, alasan: 'salah pilih kontrak saat membatalkan' } }, STAF, P, now()), /hanya dapat dipulihkan.*Admin/, 'PO CANCEL hanya dapat dipulihkan Admin');
const p = A.kontrakPulih({ data: { noKontrak: SPM, alasan: 'salah pilih kontrak saat membatalkan' } }, ADMIN, P, now());
ok(p.data.status === 'AKTIF' && p.data.riwayat.length === 2 && p.data.bonDilepas.length === 1 && sh.rows.length === 2 && alokSheet.find(a => a.id === 'AL1').batal, 'Admin memulihkan: status AKTIF, riwayat bertambah (alokasi yang sudah batal tidak dihidupkan otomatis)');

console.log('C. HOLD & kontrak Register');
const h = A.kontrakBatal({ data: { noKontrak: SPK, status: 'HOLD', alasan: 'Menunggu keputusan addendum harga' } }, STAF, P, now());
ok(h.data.status === 'HOLD' && h.alokasiDibatalkan === 0 && !alokSheet.find(a => a.id === 'AL2').batal, 'HOLD: kontrak bertagihan boleh ditahan, Bon tidak dilepas');
galat(() => A.kontrakBatal({ data: { noKontrak: SPK, status: 'HOLD', alasan: 'Menunggu keputusan addendum harga', versi: 0 } }, STAF, P, now()), /sudah berstatus HOLD/, 'HOLD dua kali ditolak');
ok(A.kontrakPulih({ data: { noKontrak: SPK, alasan: 'addendum harga sudah disetujui' } }, STAF, P, now()).data.status === 'AKTIF', 'HOLD dapat dipulihkan Pengadaan');
const r = A.kontrakBatal({ data: { noKontrak: REG, status: 'CANCELLED', alasan: 'Lingkup dialihkan ke kontrak lain' } }, ADMIN, P, now());
ok(r.data.sumber === 'REGISTER' && r.data.idRegister === 'L1' && r.data.namaVendor === 'Surveyor Indonesia, PT' && r.data.nilai === 295000000 && r.data.bonDilepas[0].cara === 'ITEM-REGISTER' && r.data.bonDilepas[0].bonNomor.startsWith('006/'), 'kontrak Register: vendor/nilai diambil dari server, tautan No Bon item dicatat sebagai dilepas');
ok(K.koleksi[P + '|data'].length === 1 && K.koleksi[P + '|data'][0].items[0].noPermintaan && K.koleksi[P + '|data'][0].versi === 3, 'data kontrak Register TIDAK diubah / dihapus');
galat(() => A.save({ data: { id: 'L1', versi: 3, catatan: 'x' } }, STAF, P, now()), /berstatus PO CANCEL.*perubahan data kontrak dikunci/, 'ubah kontrak PO CANCEL ditolak');
galat(() => A.posting({ id: 'L1', versi: 3 }, STAF, P, now()), /posting dikunci/, 'posting kontrak PO CANCEL ditolak');
galat(() => A.save({ data: { noKontrak: REG, items: [] } }, STAF, P, now()), /pembuatan ulang nomor ini dikunci/, 'nomor kontrak PO CANCEL tidak dapat dipakai ulang');
const B = A.kontrakStatusBaca({}, KEU, P).data;
ok(B.length === 3 && B.find(x => x.noKontrak === REG).status === 'CANCELLED' && B.find(x => x.noKontrak === SPM).riwayat.length === 2, 'kontrakStatusBaca: semua peran dapat membaca status & riwayat');
ok(K.MODUL.fitur.indexOf('kontrakBatal') >= 0 && K.MODUL.baca.indexOf('kontrakStatusBaca') >= 0 && K.MODUL.timpa.indexOf('saveProgres') >= 0, 'fitur, aksi baca & timpa terdaftar');
console.log('UJI KONTRAK BATAL 1.10.12: ' + lulus + ' cek LULUS');
