// Uji alat/audit-tanggal-bapm.js: membuat ekspor .xlsx tiruan (meniru BAPM 01/065/SPM di laporan bug) lalu menjalankan audit offline.
//   node uji/uji_audit_offline.js
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert'), { execFileSync } = require('child_process');
const XLSX = require(path.join(__dirname, '..', '..', 'billing-generator', 'xlsx.full.min.js'));
const P = '1726012', NO = '065/SPM/WK-NK.KSO/PDBJ/1726012/2026', BA = '01/BAPM/' + NO;
const IT = [['1800007128', 'Environment Meter 5in1 pro Krisbow', 'PC'], ['1800007201', 'Lampu Sorot LED 1000W COB', 'PC'], ['1800007202', 'Balok Kayu Kelas 1', 'M3'], ['1800007203', 'Regulator Oksigen YAMATO', 'PC'],
  ['1800007204', 'Tempat sampah 3 pilah HDPE 50 Ltr', 'UN'], ['1800007205', 'Eyewash Porta Stream', 'EA'], ['1800007206', 'Papan Tulis 2454x516x2025 mm', 'UN'], ['1800007207', 'Cairan Penghapus Dries Quickly Joyko', 'PC'],
  ['1800007208', 'Spidol Permanen', 'Box'], ['1800007209', 'Spidol Permanen Snowman Merah @12pc', 'Box'], ['1800007210', 'Pompa Jet Pump 500W Shimizu', 'UN'], ['1800007211', 'Triplek Melamin t=2,5mm', 'SHT'], ['1800007128', 'Environment Meter 5in1 pro Krisbow', 'PC']];
const VOL = [1, 1, 1, 1, 3, 2, 1, 2, 1, 1, 1, 3, 1];
const bon = { nomor: 'BON-01', tanggal: '2026-09-01', items: [] }, idxBon = {};
IT.forEach(([k, u, s], i) => { if (idxBon[k] === undefined) { idxBon[k] = bon.items.length; bon.items.push({ kode: k, uraian: u, sat: s, vol: 0 }); } bon.items[idxBon[k]].vol += VOL[i]; });
const BK = { id: 'BK-01', noKontrak: NO, nomorBA: BA, tagihanKe: 1, tanggal: '2026-11-01', tanggalBA: '2026-11-05', baTerbit: true, versi: 4, items: {} };
IT.forEach((x, i) => { BK.items[NO + '#' + i] = VOL[i]; });
const REG = { id: 'R1', noKontrak: NO, namaVendor: 'Cahaya Utama Safety Indonesia, PT', tglKontrak: '2026-09-01', tglSelesai: '2026-12-31', items: IT.map(([k, u, s]) => ({ kode: k, uraian: u, sat: s })) };
const GM = ['ID', 'Tanggal', 'No Bon', 'Baris Bon', 'Kode Material', 'Uraian', 'Satuan', 'Qty', 'Harga', 'No Surat Jalan', 'Diterima Oleh', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA'];
const gr = (id, tgl, k, qty, ext) => { const i = idxBon[k], it = bon.items[i]; const r = Object.assign({ id, tanggal: tgl, bonNomor: 'BON-01', bonIdx: i, bonTanggal: '2026-09-01', kode: k, uraian: it.uraian, sat: it.sat, kunci: k, qty, noSJ: 'SJ-' + id, status: 'AKTIF', versi: 1, dibuatPada: tgl + 'T03:00:00Z' }, ext || {});
  return [r.id, r.tanggal, r.bonNomor, i + 1, r.kode, r.uraian, r.sat, r.qty, 0, r.noSJ, 'Gudang', r.status, '', '', JSON.stringify(r)]; };
const masuk = [GM,
  gr('GR-M1', '2026-09-30', '1800007128', 1),                                                              // kasus laporan: manual 30/09, tak tertaut ("Masuk - -")
  gr('GR-O1', '2026-11-05', '1800007128', 1, { otomatis: true, refProgres: 'BK-01', noSJ: 'OTOMATIS ' + BA })]   // GR otomatis 05/11
  .concat(IT.slice(1, 12).map(([k], i) => gr('GR-O' + (i + 2), i === 3 ? '2026-11-01' : '2026-11-05', k, VOL[i + 1], { otomatis: true, refProgres: 'BK-01' })));   // Tempat sampah: GR otomatis masih tgl opname 01/11
const kol = (L) => [['ID', 'Diubah Pada', 'DATA']].concat(L.map(o => [o.id || o.nomor, '', JSON.stringify(o)]));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(masuk), P + '_GudangMasuk');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['ID', 'Tanggal', 'Kode Material', 'Uraian', 'Satuan', 'Qty', 'Untuk', 'Penerima', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA']]), P + '_GudangKeluar');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kol([BK])), P + '_Progres');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kol([REG])), P + '_Register');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kol([bon])), P + '_Permintaan');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-bapm-')), f = path.join(dir, 'Monitoring-SAP-ekspor.xlsx');
fs.writeFileSync(f, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
let out = '', kode = 0;
try { out = execFileSync('node', [path.join(__dirname, '..', 'alat', 'audit-tanggal-bapm.js'), f], { encoding: 'utf8' }); } catch (e) { out = e.stdout; kode = e.status; }
console.log(out);
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
ok(/material: 12 · OK 10 · ANOMALI 2/.test(out), '12 material BAPM diaudit: 10 OK, 2 anomali (Environment Meter, Tempat sampah)');
ok(/GR manual belum tertaut: 1/.test(out) && /Tanggal GR ≠ BAPM: 1/.test(out) && /Baris ganda di BAPM: 1/.test(out), 'temuan: GR 30/09 belum tertaut · Tempat sampah 01/11 ≠ 05/11 · Environment Meter ganda di BAPM');
ok(/ANOMALI 2 → 1/.test(out) && /tersisa Baris ganda di BAPM: 1/.test(out) && kode === 1, 'simulasi migrasi: tersisa hanya catatan baris ganda BAPM (konfirmasi data kontrak) → kode keluar 1');
const L = XLSX.read(fs.readFileSync(f.replace(/\.xlsx$/, '-AUDIT-TANGGAL-BAPM.xlsx')), { type: 'buffer' });
const U = XLSX.utils.sheet_to_json(L.Sheets['Usulan tautan']);
ok(L.SheetNames.length === 7 && U.length === 1 && U[0]['ID GR'] === 'GR-M1' && U[0]['Tanggal BAPM'] === '2026-11-05', 'laporan Excel 7 sheet; usulan: GR-M1 (30/09) → ' + BA.slice(0, 8) + ' 05/11/2026');
console.log('\nLULUS ' + lulus + ' uji');
