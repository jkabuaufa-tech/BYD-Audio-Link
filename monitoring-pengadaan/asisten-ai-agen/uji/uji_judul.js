// Uji modul 1.8.1: bundel dipisah & dipetakan menurut JUDUL tercetak, termasuk dokumen pendukung (KTP, NPWP, Timesheet, Laporan Cuaca, Dokumentasi).
const assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, S, NO, STF } = require('./vt_data.js')();
const folderId = K.folderProyek_(P).getId();
const d = (judul, jenis, h, x) => Object.assign({ jenis: jenis || 'LAINNYA', judul, halamanMulai: h, halamanAkhir: h }, x || {});
const isi = [d('JURNAL HUTANG SUPPLIER', 'LAINNYA', 1, { nomor: '1900019874' }), d('KWITANSI', 'LAINNYA', 2, { nomor: '001/GMK', nilai: { total: 131535000 } }), d('INVOICE', 'INVOICE', 3),
  d('FAKTUR PAJAK', 'LAINNYA', 4), d('BERITA ACARA PEMBAYARAN', 'BAP', 5), d('KARTU TANDA PENDUDUK', 'LAINNYA', 6), d('NOMOR POKOK WAJIB PAJAK', 'LAINNYA', 7),
  d('REKAP TIMESHEET ALAT', 'LAINNYA', 8), d('TIME SHEET ALAT', 'LAINNYA', 9), d('TIME SHEET ALAT', 'LAINNYA', 10), d('LAPORAN CUACA HARIAN', 'LAINNYA', 11),
  d('FOTO DOKUMENTASI ALAT', 'LAINNYA', 12), d('SURAT PENYALURAN PEMBAYARAN', 'LAINNYA', 13), d('MEMO INTERNAL', 'LAINNYA', 14)];
C.__files['BUN-J'] = { nama: 'Bundel judul.pdf', data: 'FILE:BUN-J', induk: folderId, diubah: 1 }; C.__ekstrak['BUN-J'] = isi;
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TJ', versi: 1, noKontrak: NO.spsa, tagihanKe: 9, nomorBA: '09/BAP/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
const items = {}, tpl = K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []); tpl.forEach(x => { items[x.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'TJ', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
const kd = nama => tpl.find(x => x.nama === nama).k;
console.log('1. Pemetaan menurut judul (kategori Alat)');
const r = STF('vtBundel', { data: { id: 'TJ', file: { id: 'BUN-J', idServer: 'BUN-J', nama: 'Bundel judul.pdf', lokasi: 'server' } } }); assert.ok(r.ok, r.error);
ok(/judul/.test(S.sistem) && /JURNAL HUTANG SUPPLIER/.test(S.sistem), 'prompt AI meminta judul tercetak & memberi contoh judul');
const U = {}; r.usulan.forEach(u => { U[u.k] = u; }), seg = n => r.segmen.find(z => z.halamanMulai === n);
ok(seg(1).jenis === 'JURNAL_HUTANG' && seg(2).jenis === 'KWITANSI' && seg(4).jenis === 'FAKTUR_PAJAK', 'judul mengoreksi jenis: "JURNAL HUTANG SUPPLIER" → Jurnal, "KWITANSI" → Kwitansi, "FAKTUR PAJAK" → Faktur');
ok(U.UMUM_02 && U.UMUM_03 && U.UMUM_04 && U.UMUM_05 && U.UMUM_07, 'dokumen keuangan masuk baris Jurnal, Kwitansi, Invoice, Faktur, BAP');
ok(U[kd('KTP')] && U[kd('KTP')].halaman === '6' && U[kd('NPWP')] && U[kd('NPWP')].halaman === '7', 'KTP (Kartu Tanda Penduduk) → baris KTP hal. 6; NPWP (Nomor Pokok Wajib Pajak) → baris NPWP hal. 7');
ok(U[kd('Rekap Timesheet Alat')].halaman === '8' && U[kd('Timesheet Alat')].halaman === '9, 10', 'Rekap Timesheet → baris Rekap (hal. 8); 2 Timesheet → satu baris Timesheet Alat (hal. 9, 10)');
ok(U[kd('Laporan Cuaca (Prod 06)')].halaman === '11' && U[kd('Dokumentasi Alat')].halaman === '12', 'Laporan Cuaca → Prod 06; Foto Dokumentasi Alat → Dokumentasi Alat');
ok(r.tanpaPeta.some(t => /Surat Penyaluran/.test(t)) && r.tanpaPeta.some(t => /MEMO INTERNAL/.test(t)) && !Object.values(U).some(u => u.nama === 'Surat Pernyataan (Untuk alat yang beda kepemilikan)'),
  'judul tanpa baris checklist tidak dipaksakan (Surat Penyaluran ≠ Surat Pernyataan; Memo) → dilaporkan');
ok(seg(6).nama === 'KTP' && seg(14).nama === 'MEMO INTERNAL', 'peta dokumen menampilkan nama baris / judul tercetak');
console.log('2. Verifikasi tetap dari dokumen keuangan');
S.nPanggil = 0; const lap = STF('vtNilai', { data: { id: 'TJ' } }).data;
ok(S.nPanggil === 0 && lap.dokumenDiperiksa[0].k === 'BUNDEL', 'verifikasi memakai hasil baca bundel (tanpa panggilan AI)');
console.log('\nLULUS ' + lulus + ' cek');
