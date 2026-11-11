const fs = require('fs'), vm = require('vm'), assert = require('assert');
const arg = process.argv[2] || require('path').join(__dirname, '..', 'server-modul-1.10.10.json'), kode = /\.json$/.test(arg) ? JSON.parse(fs.readFileSync(arg, 'utf8')).kode : fs.readFileSync(arg, 'utf8');
const sheets = {};
function Sheet(n, kol) { this.n = n; this.rows = [kol]; }
Sheet.prototype.appendRow = function (v) { this.rows.push(v.slice()); };
Sheet.prototype.getRange = function (r, c, nr, nc) { const sh = this; return { setValues(v) { sh.rows[r - 1] = v[0].slice(); } }; };
const log = [];
const ctx = {
  s_: v => v == null ? '' : String(v),
  ss_: () => ({ getSheetByName: n => sheets[n] || null }),
  sheet_: (n, kol) => sheets[n] || (sheets[n] = new Sheet(n, kol)),
  baris_: sh => sh.rows.slice(1),
  catat_: (P, o, u, jenis, ket) => log.push([jenis, ket]),
  gdKunciTulis: fn => fn(),
};
// uji fungsi inti dengan mengekstrak potongan 1.10.10
const ip = kode.slice(kode.indexOf('const IP_COL'), kode.indexOf('\n}\n', kode.indexOf('function ipSimpan')) + 3);
const rv = kode.slice(kode.indexOf('/* 1.10.10 — REKENING VENDOR'), kode.indexOf('/* 1.10.11 — INTEGRITAS') > 0 ? kode.indexOf('/* 1.10.11 — INTEGRITAS') : kode.indexOf('/* 1.10.1 — Petugas Gudang'));
const c2 = vm.createContext(Object.assign({}, ctx, { MODUL: { aksi: {}, fitur: [], baca: [] }, JSON, Math, Date, Array, String, Number, RegExp, Error, Object }));
vm.runInContext(ip + '\n' + rv + '\nthis.ipBaca=ipBaca;this.ipSimpan=ipSimpan;', c2);
const A = { nama: 'Admin', admin: true }, now = '2026-11-05T10:00:00Z';
// 1) simpan identitas tanpa npwp (klien lama) lalu dengan npwp keliru → dikoreksi
c2.ipSimpan('JICT', { bentuk: 'KSO', nama: 'WASKITA - NINDYA, KSO', anggota: [{ nama: 'PT Waskita Karya (Persero) Tbk', porsi: 0, leader: true }, { nama: 'PT Nindya Karya', porsi: 0 }] }, A, now);
assert.strictEqual(c2.ipBaca('JICT').npwp, '');
c2.ipSimpan('JICT', { bentuk: 'KSO', nama: 'WASKITA - NINDYA, KSO', npwp: '1000.0000.0784.5820', alamat: 'Jl. M.T. Haryono Kav. 10', anggota: [{ nama: 'A', leader: true }, { nama: 'B' }] }, A, now);
assert.strictEqual(c2.ipBaca('JICT').npwp, '1000000007845824');
// klien lama menyimpan lagi → NPWP & alamat tetap
c2.ipSimpan('JICT', { bentuk: 'KSO', nama: 'WASKITA - NINDYA, KSO', anggota: [{ nama: 'A', leader: true }, { nama: 'B' }] }, A, now);
assert.strictEqual(c2.ipBaca('JICT').npwp, '1000000007845824'); assert.strictEqual(c2.ipBaca('JICT').alamat, 'Jl. M.T. Haryono Kav. 10');
// data lama yang tersimpan dengan nomor keliru → terbaca benar
sheets._IdentitasPelaksana.rows[1][5] = JSON.stringify({ nama: 'X', npwp: '1000000007845820' });
assert.strictEqual(c2.ipBaca('JICT').npwp, '1000000007845824');
assert.throws(() => c2.ipSimpan('JICT', { bentuk: 'TUNGGAL', nama: 'X', npwp: '123', anggota: [{ nama: 'X' }] }, A, now), /15\/16/);
// 2) rekening vendor
const M = c2.MODUL;
assert.deepStrictEqual(M.fitur, ['rekeningVendor', 'identitasNpwp']); assert.deepStrictEqual(M.baca, ['rekVendorBaca']);
assert.throws(() => M.aksi.rekVendorSimpan({ data: { nama: 'CV Cahaya Utama Safety', noRek: '1234567' } }, { nama: 'Staf', peran: 'PENGADAAN' }, 'JICT', now), /bank/);
assert.throws(() => M.aksi.rekVendorSimpan({ data: { nama: 'X', bank: 'BCA', noRek: '1' } }, { nama: 'Keu', peran: 'KEUANGAN' }, 'JICT', now), /Admin \/ Pengadaan/);
M.aksi.rekVendorSimpan({ data: { kodeSAP: '2100012345', nama: 'CV Cahaya Utama Safety', bank: 'Bank Mandiri', noRek: '123-000-4567890', atasNama: 'CV CAHAYA UTAMA SAFETY' } }, { nama: 'Staf', peran: 'PENGADAAN' }, 'JICT', now);
M.aksi.rekVendorSimpan({ data: { kodeSAP: '2100012345', nama: 'CV Cahaya Utama Safety', bank: 'Bank BRI', noRek: '0987654321' } }, A, 'JICT', now);
const L = M.aksi.rekVendorBaca().data;
assert.strictEqual(L.length, 1); assert.strictEqual(L[0].bank, 'Bank BRI'); assert.strictEqual(L[0].noRek, '0987654321');
assert.ok(log.some(l => l[0] === 'UBAH REKENING VENDOR' && /…4321/.test(l[1])));
console.log('UJI SERVER 1.10.10: 11 cek LULUS');
