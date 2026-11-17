#!/usr/bin/env node
/* AUDIT TANGGAL BAPM SELURUH MATERIAL — OFFLINE, SEBELUM MODUL SERVER 1.10.21 DITERBITKAN
 *
 * Menjalankan logika server 1.10.21 yang SAMA PERSIS (gudangAuditTanggalBA + gudangMigrasiTanggalBA dry-run) pada file ekspor
 * Google Spreadsheet proyek (File › Download › Microsoft Excel .xlsx). Tidak pernah menulis ke Google; hasil berupa laporan Excel.
 *
 *   node alat/audit-tanggal-bapm.js <ekspor.xlsx> [--proyek 1726012] [--modul server-modul-1.10.22.json] [--keluar laporan.xlsx]
 *
 * Sheet yang dibaca: <ID>_GudangMasuk, <ID>_GudangKeluar, <ID>_Progres, <ID>_Register, <ID>_Permintaan
 * (koleksi kernel dibaca dari kolom JSON "DATA" — atau sel pertama yang berisi objek JSON bila kolom DATA tidak ditemukan).
 */
const fs = require('fs'), path = require('path');
const AKAR = path.join(__dirname, '..');
const XLSX = require(path.join(AKAR, '..', 'billing-generator', 'xlsx.full.min.js'));
const { buat } = require(path.join(AKAR, 'uji', 'kernel_tiruan.js'));

const arg = process.argv.slice(2), opsi = {}, pos = [];
for (let i = 0; i < arg.length; i++) { if (/^--/.test(arg[i])) opsi[arg[i].slice(2)] = arg[++i]; else pos.push(arg[i]); }
if (!pos[0]) { console.error('Pakai: node alat/audit-tanggal-bapm.js <ekspor.xlsx> [--proyek ID] [--modul server-modul-1.10.22.json] [--keluar laporan.xlsx]'); process.exit(2); }
const wb = XLSX.read(fs.readFileSync(pos[0]), { type: 'buffer', cellDates: false, raw: true });
const nama = wb.SheetNames, cari = s => nama.filter(n => n.endsWith(s));
const P = opsi.proyek || ((cari('_GudangMasuk')[0] || '').replace(/_GudangMasuk$/, ''));
if (!P || nama.indexOf(P + '_GudangMasuk') < 0) { console.error('Sheet <ID>_GudangMasuk tidak ditemukan. Sheet tersedia: ' + nama.join(', ')); process.exit(2); }
const baris = n => nama.indexOf(n) >= 0 ? XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }) : null;
const objek = v => { if (typeof v !== 'string' || !/^\s*\{/.test(v)) return null; try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
function koleksi(n) {
  const R = baris(n); if (!R || !R.length) return { L: [], ada: false };
  const h = R[0].map(x => String(x).trim().toUpperCase()), iD = h.indexOf('DATA');
  const L = R.slice(1).map(r => (iD >= 0 && objek(r[iD])) || r.map(objek).find(Boolean)).filter(Boolean);
  return { L, ada: true };
}

const MODUL_BERKAS = opsi.modul || path.join(AKAR, 'server-modul-1.10.22.json');
const T = buat(MODUL_BERKAS, { proyek: P });
['masuk', 'keluar'].forEach(j => {
  const n = P + (j === 'masuk' ? '_GudangMasuk' : '_GudangKeluar'), R = baris(n) || [], sh = T.lembar(n);
  R.slice(1).filter(r => String(r[0] || '').trim()).forEach(r => sh.rows.push(r.slice()));
});
const info = {};
[['progres', '_Progres'], ['data', '_Register'], ['permintaan', '_Permintaan']].forEach(([k, s]) => { const c = koleksi(P + s); T.KOL[k] = c.L; info[k] = c.ada ? c.L.length : 'sheet tidak ada'; });

const ADM = { nama: 'Audit offline', peran: 'PENGADAAN', admin: true }, now = new Date().toISOString();
const H = T.MODUL.aksi.gudangAuditTanggalBA({ data: {} }, ADM, P, now);
// simulasi: migrasi DITERAPKAN pada salinan di memori (bukan Google) dengan SEMUA usulan disetujui → kondisi sesudah migrasi
const U = T.MODUL.aksi.gudangMigrasiTanggalBA({ data: { dryRun: false, konfirmasi: 'SINKRONKAN', terapkanUsulan: true } }, ADM, P, now);
const NM = { BEDA_TANGGAL: 'Tanggal GR ≠ BAPM', GR_BELUM_TERTAUT: 'GR manual belum tertaut', GR_KURANG_DARI_BAPM: 'GR kurang dari volume BAPM', GR_MELEBIHI_BAPM: 'GR melebihi volume BAPM',
  BAPM_BARIS_GANDA: 'Baris ganda di BAPM', BAPM_TANPA_TANGGAL: 'BAPM belum bertanggal BA', ANOMALI_DIPAKSA: 'Beda tanggal dipaksa Admin', SINKRON_DITOLAK: 'Sinkron ditolak (saldo/Bon)',
  TANGGAL_MASA_DEPAN: 'Tanggal GR di masa depan', SEBELUM_BON: 'Tanggal GR sebelum Bon', BK_HILANG: 'Tertaut ke BK yang sudah tidak ada' };

const RM = H.ringkasMaterial, RU = U.ringkasMaterial;
console.log('AUDIT TANGGAL BAPM — proyek ' + P + ' · ' + path.basename(pos[0]) + ' · modul ' + path.basename(MODUL_BERKAS));
console.log('  data: ' + (T.SH[P + '_GudangMasuk'].rows.length) + ' baris GR · ' + (T.SH[P + '_GudangKeluar'].rows.length) + ' baris GI · BK ' + info.progres + ' · Register ' + info.data + ' · Bon ' + info.permintaan);
console.log('  material: ' + RM.total + ' · OK ' + RM.ok + ' · ANOMALI ' + RM.anomali + (RM.bapmTidakTerbaca ? ' · ' + RM.bapmTidakTerbaca + ' BAPM kontrak Master (volume tidak terbaca)' : ''));
Object.keys(RM.perKode).forEach(k => console.log('    - ' + (NM[k] || k) + ': ' + RM.perKode[k] + ' material'));
console.log('  rencana sinkron: ' + H.jumlah.tanggal + ' tanggal GR · ' + H.jumlah.tautan + ' tautan pasti · ' + H.jumlah.usulan + ' usulan · ' + H.jumlah.galat + ' ditolak · ' + H.jumlah.bkTanpaTanggal + ' BAPM tanpa tanggal BA');
console.log('  SIMULASI bila semua usulan disetujui & migrasi diterapkan: material ANOMALI ' + RM.anomali + ' → ' + RU.anomali);
Object.keys(RU.perKode).forEach(k => console.log('    - tersisa ' + (NM[k] || k) + ': ' + RU.perKode[k] + ' material'));

const keluar = opsi.keluar || pos[0].replace(/\.xlsx$/i, '') + '-AUDIT-TANGGAL-BAPM.xlsx', out = XLSX.utils.book_new();
const tambah = (judul, L) => XLSX.utils.book_append_sheet(out, XLSX.utils.aoa_to_sheet(L.length > 1 ? L : L.concat([['(tidak ada)']])), judul);
tambah('Ringkasan', [['Butir', 'Sekarang', 'Sesudah migrasi (simulasi semua usulan)'], ['Material', RM.total, RU.total], ['Material OK', RM.ok, RU.ok], ['Material ANOMALI', RM.anomali, RU.anomali]]
  .concat(Object.keys(NM).map(k => [NM[k], RM.perKode[k] || 0, RU.perKode[k] || 0]))
  .concat([['GR akan disamakan ke tanggal BAPM', H.jumlah.tanggal, ''], ['Tautan pasti', H.jumlah.tautan, ''], ['Usulan tautan (perlu keputusan Admin)', H.jumlah.usulan, ''], ['Ditolak (koreksi data dulu)', H.jumlah.galat, ''], ['BAPM tanpa tanggal BA', H.jumlah.bkTanpaTanggal, '']]));
const mtab = L => [['Status', 'Kode', 'Material', 'Satuan', 'Qty GR', 'Baris GR', 'Tertaut', 'Belum tertaut', 'Migrasi', 'Vol BAPM', 'BAPM (tanggal · vol · GR tertaut)', 'Masalah']]
  .concat(L.map(o => [o.status, o.kode || o.kunci, o.uraian, o.sat, o.qtyGR, o.gr, o.tertaut, o.takTertaut, o.migrasi, o.qtyBAPM, o.bapm.map(b => b.nomorBA + ' · ' + b.tanggalBA + ' · ' + (b.qtyBAPM === null ? '?' : b.qtyBAPM) + ' · ' + b.qtyGR).join('\n'), o.masalah.map(x => (NM[x.kode] || x.kode) + ': ' + x.ket).join('\n')]));
tambah('Material (sekarang)', mtab(H.material));
tambah('Material (sesudah migrasi)', mtab(U.material));
tambah('Perubahan tanggal', [['ID GR', 'Material', 'Qty', 'Sat', 'Tanggal sekarang', 'Tanggal BAPM', 'BAPM', 'Sumber tautan']].concat(H.perubahan.map(p => [p.grId, p.uraian, p.qty, p.sat, p.tanggalLama, p.tanggalBaru, p.nomorBA, p.cara])));
tambah('Usulan tautan', [['ID GR', 'Material', 'Qty', 'Sat', 'Tanggal GR', 'No Bon', 'No SJ', 'Usulan BAPM', 'ID BK', 'Tanggal BAPM', 'Kapasitas']].concat(H.usulan.map(z => [z.grId, z.uraian, z.qty, z.sat, z.tanggalGR, z.bonNomor, z.noSJ, z.nomorBA, z.bkId, z.tanggalBA, z.kapasitas])));
tambah('Ditolak', [['Rincian']].concat(H.galat.map(g => [g])));
tambah('BAPM tanpa tanggal', [['BAPM', 'Kontrak', 'GR tertaut']].concat(H.bkTanpaTanggal.map(b => [b.nomorBA, b.noKontrak, b.gr])));
fs.writeFileSync(keluar, XLSX.write(out, { type: 'buffer', bookType: 'xlsx' }));
console.log('  laporan: ' + keluar);
process.exitCode = RU.anomali ? 1 : 0;   // 1 = masih ada anomali sesudah simulasi migrasi (perlu tindakan data)
