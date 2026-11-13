// Uji Modul server 1.10.18 — kontrol Release / Unrelease (SOP SAP HANA) + BASO & BASTA per alat.
// Kernel Code.gs TIDAK disertakan di repo → modul dijalankan di atas kernel tiruan minimal (fungsi inti yang dipakai blok 1.10.15–1.10.18).
// Aksi "posting" kernel ditiru: modul mengembalikan undefined → kernel tiruan memposting.
//   node uji/uji_11018.js [server-modul-1.10.18.json]
const fs = require('fs'), vm = require('vm'), path = require('path');
const PAKET = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'server-modul-1.10.18.json'), 'utf8'));
const P = '1726012', sheets = {}, kol = { data: [], progres: [], permintaan: [] }, log = [], cache = {}, props = { GUDANG_PETUGAS: JSON.stringify(['Petugas Gudang']) };
function Sheet(n) { this.n = n; this.rows = []; }
Sheet.prototype.getLastRow = function () { return this.rows.length; };
Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(x => typeof x === 'string' && x[0] === "'" ? x.slice(1) : x)); };
Sheet.prototype.getRange = function (r, c, nr, nc) { const sh = this; return { getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || []; o.push(Array.from({ length: nc }, (_, j) => row[c - 1 + j] === undefined ? '' : row[c - 1 + j])); } return o; },
  setValues: v => { for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] = sh.rows[r - 1 + i] || []; for (let j = 0; j < nc; j++) row[c - 1 + j] = typeof v[i][j] === 'string' && v[i][j][0] === "'" ? v[i][j].slice(1) : v[i][j]; } } }; };
let seq = 0;
const inti = {
  s_: v => v === null || v === undefined ? '' : String(v), ss_: () => ({ getSheetByName: n => sheets[n] || null }),
  sheet_: (n, cols) => { if (!sheets[n]) { sheets[n] = new Sheet(n); sheets[n].rows.push(cols.slice()); } return sheets[n]; },
  baris_: sh => sh.rows.slice(1).map(r => r.slice()),
  bacaKoleksi_: (p, j) => JSON.parse(JSON.stringify(kol[j] || [])), tulisKoleksi_: (p, j, D) => { kol[j] = JSON.parse(JSON.stringify(D)); },
  catat_: (p, r, u, aksi, detail) => { log.push({ aksi, detail, oleh: u.nama, no: r.noKontrak }); },
  nilaiReg_: items => (items || []).reduce((a, i) => a + (Number(i.vol) || 0) * (Number(i.harga) || 0), 0),
  statusReg_: r => r.diposting ? 'DIPOSTING' : (r.noPO ? 'PROSES' : 'DRAF'), idBaru_: a => a + '-' + (++seq),
  refBerkas_: x => x && typeof x === 'object' ? x : null, VERSI_SERVER: 'uji', PROYEK_AWAL: { id: P }, semuaProyek_: () => [{ id: P }], BATAS_PDF: 10485760,
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  LockService: { getScriptLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock() { } }) },
  DriveApp: { getFileById: () => { throw new Error('tidak ada'); } }, folderProyek_: () => ({ getId: () => 'F1' }),
  Utilities: { getUuid: () => 'u' + (++seq), computeDigest: () => [], DigestAlgorithm: {}, base64Decode: () => [] }, SpreadsheetApp: { flush() { } }, console, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error, isFinite, parseInt, parseFloat, Promise, Symbol, Boolean
};
const tiruan = () => undefined;
const px = new Proxy(inti, { has: () => true, get: (t, k) => k === Symbol.unscopables ? undefined : (k in t ? t[k] : (k in globalThis ? globalThis[k] : tiruan)) });
const ctx = vm.createContext({ px });
const MODUL = vm.runInContext('(function(){ with (px) { return (function(){' + PAKET.kode + '\n})(); } })()', ctx, { filename: 'modul.js' });
// kernel tiruan: jalankan aksi modul; undefined → logika kernel
function proses(aksi, u, req) {
  const now = new Date().toISOString();
  try {
    const f = MODUL.aksi[aksi]; let r = f ? f(Object.assign({ action: aksi }, req), u, P, now) : undefined;
    if (r === undefined && aksi === 'posting') { const D = inti.bacaKoleksi_(P, 'data'), x = D.find(z => z.id === req.id); if (!x) throw new Error('tidak ada'); if (Number(req.versi) !== Number(x.versi)) throw new Error('KONFLIK versi'); x.diposting = true; x.status = 'DIPOSTING'; x.versi++; x.dipostingPada = now; x.diubahOleh = u.nama; inti.tulisKoleksi_(P, 'data', D); r = { ok: true, data: x }; }
    return r || { ok: true, kernel: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
const ADM = { nama: 'Joko Supriyono', peran: 'PENGADAAN', admin: true }, STF = { nama: 'Staf Pengadaan', peran: 'PENGADAAN', admin: false }, LHT = { nama: 'Tamu', peran: 'LIHAT', admin: false }, GDG = { nama: 'Petugas Gudang', peran: 'LIHAT', admin: false };
let lulus = 0, gagal = 0;
const ok = (c, n, info) => { if (c) lulus++; else gagal++; console.log((c ? '  ok   ' : '  GAGAL ') + n + (c ? '' : ' → ' + JSON.stringify(info))); };
const D = () => kol.data, cari = id => D().find(x => x.id === id);
const NO = '021/SPSA/WSKT-NK KSO/1726012/2026', NOM = '022/SPM/WSKT-NK KSO/1726012/2026', NOA = '021/ADD1/SPSA/WSKT-NK KSO/1726012/2026';
kol.data = [
  { id: 'K1', noKontrak: NO, tglKontrak: '2026-08-30', tglSelesai: '2026-12-31', namaVendor: 'PT Sewa Alat Jaya', idVendor: '10001', nilai: 90e6, versi: 1, diposting: false, status: 'DRAF', items: [{ kode: 'A1', uraian: 'Vibro Roller 10 Ton', vol: 3, sat: 'bulan', harga: 20e6 }, { kode: 'A2', uraian: 'Excavator PC200', vol: 1, sat: 'bulan', harga: 30e6 }] },
  { id: 'K2', noKontrak: NOM, tglKontrak: '2026-09-01', namaVendor: 'CV Bahan', nilai: 5e6, versi: 1, diposting: false, status: 'DRAF', items: [{ uraian: 'Semen', vol: 100, sat: 'zak', harga: 50000 }] },
  { id: 'K0', noKontrak: '023/SPM/WSKT-NK KSO/1726012/2026', namaVendor: 'CV Nol', nilai: 0, versi: 1, diposting: false, status: 'DRAF', items: [] }
];
console.log('Modul server ' + PAKET.versi + ' · fitur sapRelease/basoBasta: ' + ['sapRelease', 'basoBasta'].every(f => MODUL.fitur.indexOf(f) >= 0));
ok(PAKET.versi === '1.10.18' && MODUL.fitur.indexOf('sapRelease') >= 0 && MODUL.fitur.indexOf('basoBasta') >= 0 && MODUL.baca.indexOf('basoBaca') >= 0 && MODUL.timpa.indexOf('posting') >= 0, 'versi 1.10.18 · fitur & daftar baca/timpa');

console.log('1. Staf mengajukan · Release khusus Admin');
let r = proses('posting', STF, { id: 'K1', versi: 1 });
ok(!r.ok && /Hanya Admin yang berwenang melakukan Release/.test(r.error) && !cari('K1').diposting, 'Staf TIDAK dapat Release (posting)', r);
r = proses('kontrakAjukan', LHT, { id: 'K1' }); ok(!r.ok && /Hanya Staf Pengadaan/.test(r.error), 'akun Lihat saja tidak dapat mengajukan', r);
r = proses('kontrakAjukan', STF, { id: 'K0' }); ok(!r.ok && /Rp 0/.test(r.error), 'kontrak Rp 0 tidak dapat diajukan', r);
r = proses('kontrakAjukan', STF, { id: 'K1', versi: 9 }); ok(!r.ok && /KONFLIK/.test(r.error), 'versi usang → KONFLIK', r);
r = proses('kontrakAjukan', STF, { id: 'K1', versi: 1, catatan: 'mohon release' });
ok(r.ok && r.data.rilis.status === 'DIAJUKAN' && r.data.rilis.oleh === 'Staf Pengadaan' && cari('K1').versi === 1 && !cari('K1').diposting, 'Staf mengajukan → rilis.status DIAJUKAN (versi tetap)', r);
r = proses('kontrakAjukan', STF, { id: 'K1' }); ok(!r.ok && /sudah diajukan/.test(r.error), 'pengajuan ganda ditolak', r);
ok(log.some(l => l.aksi === 'SAP AJUKAN RELEASE' && l.no === NO), 'Log: SAP AJUKAN RELEASE');
r = proses('posting', ADM, { id: 'K1', versi: 1 });
ok(r.ok && cari('K1').diposting === true && cari('K1').rilis.status === 'DIAJUKAN', 'Admin Release → kernel memposting (diposting = true)', r);
r = proses('kontrakAjukan', STF, { id: 'K1' }); ok(!r.ok && /sudah direlease/.test(r.error), 'kontrak released tidak dapat diajukan lagi', r);

console.log('2. Unrelease (Admin, alasan ≥ 12 karakter)');
r = proses('kontrakUnrelease', STF, { id: 'K1', alasan: 'koreksi harga satuan alat' }); ok(!r.ok && /Hanya Admin/.test(r.error), 'Staf tidak dapat Unrelease', r);
r = proses('kontrakUnrelease', ADM, { id: 'K1', alasan: 'salah harga' }); ok(!r.ok && /min\. 12 karakter/.test(r.error), 'alasan < 12 karakter ditolak', r);
r = proses('kontrakUnrelease', ADM, { id: 'K2', alasan: 'koreksi harga satuan alat' }); ok(!r.ok && /belum pernah direlease/.test(r.error), 'kontrak draf tidak dapat di-unrelease', r);
r = proses('kontrakUnrelease', ADM, { id: 'XX', alasan: 'koreksi harga satuan alat' }); ok(!r.ok && /tidak ditemukan/.test(r.error), 'id tidak dikenal ditolak', r);
kol.progres = [{ id: 'BK1', noKontrak: NO, nomorBA: '01/BAPA/' + NO, periode: 'September 2026', dibuatPada: '2026-09-30T00:00:00Z' }];
r = proses('kontrakUnrelease', ADM, { id: 'K1', alasan: 'koreksi harga satuan alat' }); ok(!r.ok && /Berkas Kerja \(BK\)/.test(r.error) && cari('K1').diposting, 'ada BK / tagihan → Unrelease ditolak', r);
kol.progres = [];
sheets[P + '_GudangMasuk'] = null;
const v2 = cari('K1').versi;
r = proses('kontrakUnrelease', ADM, { id: 'K1', alasan: 'koreksi harga satuan alat', versi: v2 });
ok(r.ok && r.data.diposting === false && r.data.versi === v2 + 1 && r.data.unreleasedOleh === 'Joko Supriyono' && r.data.alasanUnrelease === 'koreksi harga satuan alat' && r.data.rilis.status === 'UNRELEASED' && r.data.status !== 'DIPOSTING' && r.data.rilis.riwayat.length === 2, 'Admin Unrelease → diposting false, versi +1, alasan & riwayat tercatat', r);
ok(log.some(l => l.aksi === 'SAP UNRELEASE KONTRAK' && /koreksi harga satuan alat/.test(l.detail)), 'Log: SAP UNRELEASE KONTRAK + alasan');
r = proses('kontrakAjukan', STF, { id: 'K1' }); ok(r.ok && r.data.rilis.status === 'DIAJUKAN' && r.data.rilis.riwayat.length === 3, 'sesudah koreksi staf mengajukan kembali', r);
r = proses('posting', ADM, { id: 'K1', versi: cari('K1').versi }); ok(r.ok && cari('K1').diposting, 'Admin Release ulang', r);
// addendum di atasnya sudah release → kontrak awal tidak dapat di-unrelease
kol.data.push({ id: 'K1A', noKontrak: NOA, tglKontrak: '2026-10-15', namaVendor: 'PT Sewa Alat Jaya', nilai: 120e6, versi: 1, diposting: true, dipostingPada: '2026-10-15T00:00:00Z', status: 'DIPOSTING', items: [{ uraian: 'Vibro Roller 10 Ton', vol: 4, sat: 'bulan', harga: 30e6 }] });
r = proses('kontrakUnrelease', ADM, { id: 'K1', alasan: 'koreksi harga satuan alat' }); ok(!r.ok && /addendum di atasnya sudah direlease/.test(r.error), 'addendum released di atasnya → kontrak awal ditolak', r);
kol.progres = [{ id: 'BK2', noKontrak: NO, nomorBA: '02/BAPA/' + NO, periode: 'Oktober 2026', dibuatPada: '2026-10-31T00:00:00Z' }];
r = proses('kontrakUnrelease', ADM, { id: 'K1A', alasan: 'koreksi volume addendum' }); ok(!r.ok && /keluarga kontrak/.test(r.error), 'addendum: BK keluarga sesudah release → ditolak', r);
kol.progres = [];
r = proses('kontrakUnrelease', ADM, { id: 'K1A', alasan: 'koreksi volume addendum' }); ok(r.ok && !cari('K1A').diposting, 'addendum tanpa BK dapat di-unrelease', r);
// PO HOLD
r = proses('kontrakBatal', ADM, { data: { noKontrak: NOM, status: 'HOLD', alasan: 'menunggu klarifikasi vendor' } }); ok(r.ok, 'siapkan: kontrak SPM di-HOLD', r);
r = proses('kontrakAjukan', STF, { id: 'K2' }); ok(!r.ok && /HOLD/.test(r.error), 'kontrak HOLD tidak dapat diajukan', r);

console.log('3. BASO & BASTA per alat');
r = proses('basoBaca', STF, {});
ok(r.ok && r.spsa.length === 2 && r.spsa.find(x => x.noKontrak === NO).items.length === 2 && r.spsa.find(x => x.noKontrak === NO).tglKontrak === '2026-08-30' && r.data.length === 0, 'basoBaca: hanya kontrak SPSA + item alat + tanggal', r.spsa && r.spsa.map(x => x.noKontrak));
const isi = (o) => Object.assign({ noSPSA: NO, urutan: 1, totalAlat: 2, jenisAlat: 'Vibro Roller 10 Ton', merk: 'HAM 311D', noMesin: '61J84337040', noRangka: '-', bahanBakar: 'Solar', tahun: 2015, noPolisi: '-', perlengkapan: { manualPabrik: true, stnk: false, kotakP3K: true, kacaSpion: true }, pihak1Nama: 'Dedy Hariyanto', pihak2Nama: 'Andi Jatmiko', tanggalSPSA: '2020-01-01' }, o || {});
r = proses('basoSimpan', LHT, { data: isi() }); ok(!r.ok && /Lihat saja/.test(r.error), 'akun Lihat saja (bukan petugas) ditolak', r);
r = proses('basoSimpan', STF, { data: isi({ noSPSA: NOM }) }); ok(!r.ok && /\/SPSA\//.test(r.error), 'nomor non-SPSA ditolak', r);
r = proses('basoSimpan', STF, { data: isi({ noSPSA: NOA }) }); ok(!r.ok && /belum direlease/.test(r.error), 'SPSA belum direlease → ditolak', r);
r = proses('basoSimpan', STF, { data: isi({ tahun: 1800 }) }); ok(!r.ok && /Tahun pembuatan/.test(r.error), 'tahun tidak valid ditolak', r);
r = proses('basoSimpan', STF, { data: isi() });
ok(r.ok && r.data.tanggal === '2026-08-30' && r.data.namaVendor === 'PT Sewa Alat Jaya' && r.data.pihak1Jabatan === 'Kepala Proyek' && r.data.pihak2Jabatan === 'Direktur' && r.data.status === 'DRAF' && r.data.kurang.length === 3 && r.data.perlengkapan.stnk === false, 'alat 1 tersimpan: tanggal = tanggal SPSA (isian klien diabaikan), Pihak 1 Kepala Proyek, Pihak 2 Direktur, DRAF (kurang 3 foto)', r);
const a1 = r.data;
r = proses('basoSimpan', STF, { data: isi() }); ok(!r.ok && /sudah punya BASO/.test(r.error), 'alat yang sama tidak dapat dibuat ganda', r);
r = proses('basoSimpan', STF, { data: isi({ urutan: 2, jenisAlat: 'Excavator PC200', merk: 'Komatsu PC200-8', noMesin: 'SAA6D107E', tahun: 2018 }) });
ok(r.ok && r.data.urutan === 2 && r.data.id !== a1.id, '1 SPSA 2 alat → 2 dokumen terpisah', r);
// foto 3 sisi: unggahan baru dikenali lewat cache unggah (GDF|id)
['F1', 'F2', 'F3'].forEach(f => { cache['GDF|' + f] = JSON.stringify({ P: P, ref: { idServer: f, nama: f + '.jpg', ukuran: 1000, tipe: 'image/jpeg', url: 'drive://' + f } }); });
r = proses('basoSimpan', STF, { data: isi({ id: a1.id, versi: 9, foto: [{ idServer: 'F1' }, { idServer: 'F2' }, { idServer: 'F3' }] }) }); ok(!r.ok && /KONFLIK/.test(r.error), 'versi usang → KONFLIK', r);
r = proses('basoSimpan', STF, { data: isi({ id: a1.id, versi: a1.versi, foto: [{ idServer: 'F1' }, { idServer: 'F2' }, { idServer: 'FX' }] }) }); ok(!r.ok && /Foto Tampak Samping/.test(r.error), 'foto yang bukan unggahan proyek ditolak', r);
r = proses('basoSimpan', STF, { data: isi({ id: a1.id, versi: a1.versi, foto: [{ idServer: 'F1' }, { idServer: 'F2' }, { idServer: 'F3' }] }) });
ok(r.ok && r.data.status === 'LENGKAP' && r.data.kurang.length === 0 && r.data.foto.map(f => f.sisi).join('|') === 'Tampak Depan|Tampak Belakang|Tampak Samping' && r.data.versi === 2, 'foto 3 sisi lengkap → status LENGKAP', r);
delete cache['GDF|F1'];
r = proses('basoSimpan', STF, { data: isi({ id: a1.id, versi: 2, merk: 'HAMM 311D', foto: r.data.foto }) }); ok(r.ok && r.data.merk === 'HAMM 311D' && r.data.foto[0].idServer === 'F1', 'ubah isian: foto lama tidak divalidasi ulang', r);
const petugas = MODUL.aksi.gudangPetugasBaca({}, GDG, P).saya;
if (petugas) { r = proses('basoSimpan', GDG, { data: isi({ urutan: 3, jenisAlat: 'Dump Truck' }) }); ok(r.ok, 'Petugas Gudang dapat mengisi BASO / BASTA', r); r = proses('kontrakUnrelease', GDG, { id: 'K1', alasan: 'koreksi harga satuan alat' }); ok(!r.ok && /Petugas Gudang/.test(r.error), 'Petugas Gudang tidak dapat aksi kontrak', r); }
else console.log('  (lewati uji Petugas Gudang: daftar petugas tidak terbaca di kernel tiruan)');
r = proses('basoBatal', STF, { data: { id: a1.id, alasan: 'salah' } }); ok(!r.ok && /min\. 12/.test(r.error), 'batal: alasan < 12 karakter ditolak', r);
r = proses('basoBatal', STF, { data: { id: a1.id, alasan: 'alat ditukar unit lain' } }); ok(r.ok && r.data.status === 'BATAL', 'batal BASO/BASTA → status BATAL (baris tetap)', r);
r = proses('basoSimpan', STF, { data: isi({ merk: 'BOMAG BW211' }) }); ok(r.ok && r.data.id !== a1.id, 'sesudah batal, alat 1 dapat dibuat ulang', r);
// SPSA Master (tidak ada di Register): tanggal & vendor dari klien
r = proses('basoSimpan', STF, { data: isi({ noSPSA: '005/SPSA/WSKT-NK KSO/1726012/2025', tanggalSPSA: '', namaVendor: 'PT Lama' }) }); ok(!r.ok && /Tanggal SPSA wajib/.test(r.error), 'SPSA Master tanpa tanggal ditolak', r);
r = proses('basoSimpan', STF, { data: isi({ noSPSA: '005/SPSA/WSKT-NK KSO/1726012/2025', tanggalSPSA: '2025-11-03', namaVendor: 'PT Lama' }) }); ok(r.ok && r.data.sumber === 'MASTER' && r.data.tanggal === '2025-11-03', 'SPSA Master: tanggal SPSA dari Master Kontrak', r);
r = proses('basoBaca', STF, {}); ok(r.ok && r.data.length >= 4 && sheets[P + '_BasoBasta'].rows[0].join('|') === 'ID|No SPSA|Urutan|Jenis Alat|Tanggal|Status|Diubah Oleh|Diubah Pada|DATA', 'sheet <ID>_BasoBasta berisi ' + (r.data || []).length + ' baris', r);
console.log('\n' + lulus + ' lulus · ' + gagal + ' gagal'); process.exit(gagal ? 1 : 0);
