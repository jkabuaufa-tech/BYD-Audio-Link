// Uji Modul server 1.10.21 (tanggal BAPM = sumber kebenaran GR) — modul LENGKAP 1.10.21 dijalankan di atas tiruan kernel ringan
// (Sheets/Lock/Cache di memori; fungsi kernel lain → tiruan kosong). Kernel Code.gs asli tidak diperlukan.
//   node uji/uji_tanggal_bapm.js [server-modul-1.10.21.json]
const assert = require('assert'), fs = require('fs'), path = require('path');
const BERKAS = process.argv[2] || path.join(__dirname, '..', 'server-modul-1.10.21.json');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const tolak = (f, re, m) => { let e = null; try { f(); } catch (x) { e = x; } assert.ok(e && re.test(e.message), m + ' — dapat: ' + (e ? e.message : 'tidak ditolak')); lulus++; console.log('  ✓ ' + m); };

/* ---------- tiruan kernel (bersama dengan alat/audit-tanggal-bapm.js) ---------- */
const { MODUL, SH, KOL, LOG, lembar } = require('./kernel_tiruan.js').buat(BERKAS, { proyek: 'P1', hariIni: '2026-11-17' });
const A = MODUL.aksi, P = 'P1';
const ADM = { nama: 'Joko Supriyono', peran: 'PENGADAAN', admin: true }, STF = { nama: 'Staf Pengadaan', peran: 'PENGADAAN', admin: false };
const jalan = (aksi, data, u, now) => A[aksi]({ data }, u || STF, P, now || '2026-11-17T03:00:00.000Z');
const masuk = () => SH[P + '_GudangMasuk'].rows.map(r => JSON.parse(r[r.length - 1]));
const gr = id => masuk().find(r => r.id === id);
const tulisGR = rec => { const sh = SH[P + '_GudangMasuk'] || lembar(P + '_GudangMasuk'); sh.rows.push([rec.id, "'" + rec.tanggal, rec.bonNomor, rec.bonIdx + 1, "'" + rec.kode, rec.uraian, rec.sat, rec.qty, 0, rec.noSJ, '', rec.status, '', '', JSON.stringify(rec)]); };
const tulisGI = rec => { const sh = SH[P + '_GudangKeluar'] || lembar(P + '_GudangKeluar'); sh.rows.push([rec.id, "'" + rec.tanggal, "'" + rec.kode, rec.uraian, rec.sat, rec.qty, '', '', rec.status, '', '', JSON.stringify(rec)]); };
function reset() {
  Object.keys(SH).forEach(k => delete SH[k]); LOG.length = 0; lembar(P + '_GudangMasuk'); lembar(P + '_GudangKeluar');
  KOL.permintaan = [{ nomor: 'BON-01', tanggal: '2026-09-01', items: [{ kode: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC', vol: 2 }, { kode: '1800007200', uraian: 'Lampu Sorot LED 1000W COB', sat: 'PC', vol: 1 }] }];
  KOL.data = [{ noKontrak: NO, tglKontrak: '2026-09-01', tglSelesai: '2026-12-31', items: Array.from({ length: 13 }, (x, i) => i === 0 || i === 12 ? { kode: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC' } : { kode: '19' + i, uraian: 'Item ' + i, sat: 'PC' }) }];
  KOL.progres = [{ id: 'BK1', noKontrak: NO, nomorBA: BA, tagihanKe: 1, tanggal: '2026-11-01', baTerbit: true, versi: 1, items: { [NO + '#0']: 1, [NO + '#12']: 1 } }];
}
const NO = '065/SPM/WK-NK.KSO/PDBJ/1726012/2026', BA = '01/BAPM/' + NO;
const manual = (id, tgl, qty, idx) => ({ id, tanggal: tgl, bonNomor: 'BON-01', bonIdx: idx || 0, bonTanggal: '2026-09-01', kode: idx ? '1800007200' : '1800007128', uraian: idx ? 'Lampu Sorot LED 1000W COB' : 'Environment Meter 5in1 pro Krisbow', sat: 'PC', kunci: idx ? '1800007200' : '1800007128', qty, noSJ: 'SJ-' + id, status: 'AKTIF', versi: 1, dibuatPada: tgl + 'T02:00:00.000Z' });

console.log('A. Kasus nyata: GR manual 30/09/2026 lebih dulu, BAPM 01 (2 baris Environment Meter) bertanggal 05/11/2026');
reset(); tulisGR(manual('GRM1', '2026-09-30', 1));
let r = jalan('gudangOtomatisProgres', { progresId: 'BK1', baris: [{ bonNomor: 'BON-01', bonIdx: 0, kode: '1800007128', uraian: 'Environment Meter', sd: 1 }, { bonNomor: 'BON-01', bonIdx: 0, kode: '1800007128', uraian: 'Environment Meter', sd: 1 }] });
ok(r.ok && r.data.length === 1 && r.data[0].qty === 1, 'baris BAPM ganda dijumlah (s.d. 2) → GR otomatis 1 PC untuk sisa (dulu: baris kedua terlewat)');
ok(r.barisGanda.length === 1 && r.barisGanda[0].baris === 2, 'server melaporkan baris BAPM ganda');
ok(r.tautan.length === 1 && gr('GRM1').refBA === 'BK1' && gr('GRM1').tautBA === 'PROGRES' && !gr('GRM1').refProgres, 'GR manual 30/09 yang terhitung "diterima" ditautkan ke BK1 lewat refBA (refProgres tetap kosong)');
r = A.bkTanggal({ data: { id: 'BK1', tanggalBA: '2026-11-05' } }, STF, P, '2026-11-17T04:00:00.000Z');
ok(r.ok && r.gudang.n === 2 && r.gudang.manual === 1, 'simpan tanggal BAPM 05/11 → 2 GR disinkronkan (1 otomatis + 1 manual tertaut)');
ok(masuk().filter(x => x.status === 'AKTIF').every(x => x.tanggal === '2026-11-05'), 'semua GR Environment Meter kini 05/11/2026 = tanggal BAPM (Kartu Gudang satu tanggal)');
ok(gr('GRM1').tanggalAwal === '2026-09-30' && /BAPM 01\/BAPM/.test(gr('GRM1').tanggalSumber), 'tanggal fisik 30/09 tetap tersimpan di tanggalAwal, sumber = BAPM');
ok(SH[P + '_GudangMasuk'].rows.find(x => x[0] === 'GRM1')[1] === "'2026-11-05", 'kolom Tanggal di sheet ikut diperbarui');
r = jalan('gudangAuditTanggalBA', {});
ok(r.ok && r.jumlah.tanggal === 0 && r.jumlah.usulan === 0, 'audit sesudah sinkron: tidak ada anomali');

console.log('B. Data lama (sudah terlanjur): GR manual 30/09 tak tertaut + GR otomatis 05/11 milik BK1 → audit & migrasi');
reset(); KOL.progres[0].tanggalBA = '2026-11-05';
tulisGR(manual('GRM1', '2026-09-30', 1));
tulisGR(Object.assign(manual('GRO1', '2026-11-05', 1), { otomatis: true, fotoKurang: false, refProgres: 'BK1', noSJ: 'OTOMATIS ' + BA }));
r = jalan('gudangAuditTanggalBA', {});
ok(r.jumlah.usulan === 1 && r.usulan[0].grId === 'GRM1' && r.usulan[0].bkId === 'BK1' && r.usulan[0].tanggalBA === '2026-11-05', 'audit mengusulkan GR 30/09 ditautkan ke BAPM 01 (05/11)');
ok(/volume BAPM 2, tertaut 2/.test(r.usulan[0].kapasitas), 'kapasitas diverifikasi dari volume BAPM di Register (2 PC)');
tolak(() => jalan('gudangMigrasiTanggalBA', { dryRun: false }, STF), /khusus Admin/, 'migrasi khusus Admin');
tolak(() => jalan('gudangMigrasiTanggalBA', { dryRun: false }, ADM), /SINKRONKAN/, 'migrasi nyata wajib konfirmasi SINKRONKAN');
r = jalan('gudangMigrasiTanggalBA', { tautan: [{ grId: 'GRM1', bkId: 'BK1' }] }, ADM);
ok(r.dryRun && r.ditulis === 0 && r.jumlah.tanggal === 1 && gr('GRM1').tanggal === '2026-09-30', 'dry-run: rencana 1 perubahan tanggal, data belum berubah');
r = jalan('gudangSinkronTanggal', {}, STF);
ok(r.ok && gr('GRM1').tanggal === '2026-09-30' && r.usulan === 1, 'sinkron biasa TIDAK menautkan usulan (perlu keputusan Admin) dan melaporkannya');
r = jalan('gudangMigrasiTanggalBA', { dryRun: false, konfirmasi: 'SINKRONKAN', tautan: [{ grId: 'GRM1', bkId: 'BK1' }] }, ADM);
ok(r.ok && r.ditulis === 1 && gr('GRM1').tanggal === '2026-11-05' && gr('GRM1').refBA === 'BK1' && gr('GRM1').tautBA === 'MIGRASI', 'migrasi: GR 30/09 → 05/11/2026, tertaut ke BK1');
ok(LOG.some(l => l.aksi === 'MIGRASI TANGGAL BAPM'), 'migrasi tercatat di Log');

console.log('C. Guard: GR baru untuk item yang sudah ditagih wajib bertanggal BAPM');
reset(); KOL.progres[0].tanggalBA = '2026-11-05';
tulisGR(Object.assign(manual('GRO2', '2026-11-05', 1, 1), { otomatis: true, fotoKurang: true, refProgres: 'BK1', noSJ: 'OTOMATIS ' + BA }));
const terima = (tgl, u, extra) => jalan('gudangTerimaBon', Object.assign({ bonNomor: 'BON-01', tanggal: tgl, noSJ: 'SJ-77', baris: [{ idx: 1, qty: 1 }] }, extra || {}), u);
tolak(() => terima('2026-09-30', STF), /ANOMALI TANGGAL.*01\/BAPM.*2026-11-05/, 'Terima Bon 30/09 untuk item BAPM 05/11 → DITOLAK (anomali)');
tolak(() => terima('2026-09-30', ADM, { izinBedaTanggal: true, alasanBedaTanggal: 'pendek' }), /ANOMALI TANGGAL/, 'Admin memaksa tanpa alasan cukup → tetap ditolak');
const berkas = { sjFile: { idServer: 'sj1' }, foto: [{ idServer: 'f1' }, null, null, null] };
r = terima('2026-11-05', STF, berkas);
const baru = masuk().find(x => x.noSJ === 'SJ-77');
ok(r.ok && r.tautBA === 1 && baru.refBA === 'BK1' && baru.tautBA === 'MANUAL' && baru.tanggal === '2026-11-05', 'Terima Bon 05/11 (= BAPM) diterima & langsung tertaut ke BK1');
ok(gr('GRO2').status === 'DIGABUNG', 'GR otomatis yang menunggu foto digabung (anti dobel) — tanggal BAPM tidak hilang karena GR manual tertaut');
reset(); KOL.progres[0].tanggalBA = '2026-11-05';
tulisGR(Object.assign(manual('GRO2', '2026-11-05', 1, 1), { otomatis: true, fotoKurang: true, refProgres: 'BK1', noSJ: 'OTOMATIS ' + BA }));
r = terima('2026-09-30', ADM, Object.assign({ izinBedaTanggal: true, alasanBedaTanggal: 'barang tiba lebih dulu, BAPM menyusul' }, berkas));
const paksa = masuk().find(x => x.noSJ === 'SJ-77');
ok(r.ok && paksa.anomaliTanggal && paksa.anomaliTanggal.tanggalBA === '2026-11-05' && LOG.some(l => /ANOMALI TANGGAL GR/.test(l.aksi)), 'Admin memaksa dengan alasan → tersimpan, ditandai anomaliTanggal & tercatat di Log');
ok(jalan('gudangAuditTanggalBA', {}).perubahan.some(p => p.grId === paksa.id && p.tanggalBaru === '2026-11-05'), 'baris anomali tetap muncul di audit untuk diselaraskan ke tanggal BAPM');

console.log('D. Saldo Kartu Gudang tetap dijaga');
reset(); KOL.progres[0].tanggalBA = '';
tulisGR(Object.assign(manual('GRM3', '2026-09-30', 1), { refBA: 'BK1', tautBA: 'MANUAL' }));
tulisGI({ id: 'GI1', tanggal: '2026-10-10', kunci: '1800007128', kode: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC', qty: 1, status: 'AKTIF', dibuatPada: '2026-10-10T02:00:00Z' });
r = jalan('gudangCekTanggalBA', { progresId: 'BK1', tanggalBA: '2026-11-05' });
ok(r.ok && r.aman === false && /minus pada 2026-10-10/.test(r.pesan), 'uji sebelum terbit: BAPM 05/11 membuat saldo minus (barang keluar 10/10) → aplikasi menolak terbit');
tolak(() => A.bkTanggal({ data: { id: 'BK1', tanggalBA: '2026-11-05' } }, STF, P, '2026-11-17T05:00:00Z'), /minus/, 'bkTanggal ditolak, BK tidak berubah');
ok(!KOL.progres[0].tanggalBA, 'tanggal BA BK tetap kosong setelah penolakan');
r = jalan('gudangCekTanggalBA', { progresId: 'BK1', tanggalBA: '2026-10-01' });
ok(r.aman === true && r.n === 1 && r.manual === 1, 'tanggal BAPM 01/10 aman → 1 GR manual tertaut akan ikut');

console.log('E. GR manual dicatat SESUDAH progres (GR otomatis digabung) → tautan GABUNG pasti');
reset(); KOL.progres[0].tanggalBA = '2026-11-05';
tulisGR(Object.assign(manual('GRO4', '2026-11-01', 1), { otomatis: true, refProgres: 'BK1', status: 'DIGABUNG', qtyAwal: 1, dibatalkanPada: '2026-11-03T01:00:00.000Z', alasanBatal: 'Digabung ke penerimaan gudang SJ SJ-88 (barang yang sama dengan progres)' }));
tulisGR(Object.assign(manual('GRM4', '2026-11-03', 1), { noSJ: 'SJ-88', dibuatPada: '2026-11-03T01:00:00.000Z' }));
r = jalan('gudangSinkronTanggal', {}, STF);
ok(r.ok && gr('GRM4').tanggal === '2026-11-05' && gr('GRM4').refBA === 'BK1' && gr('GRM4').tautBA === 'GABUNG', 'GR manual yang menggabung GR otomatis ditautkan (pasti) & disamakan ke 05/11');
ok(gr('GRO4').status === 'DIGABUNG', 'GR otomatis yang digabung tetap DIGABUNG (tidak dobel di Kartu Gudang)');

console.log('F. Audit SELURUH material (setiap item) sebelum terbit');
reset(); KOL.progres[0].tanggalBA = '2026-11-05';
KOL.permintaan[0].items.push({ kode: '1800007300', uraian: 'Balok Kayu Kelas 1', sat: 'M3', vol: 1 }, { kode: '1800007400', uraian: 'Regulator Oksigen YAMATO', sat: 'PC', vol: 1 });
KOL.data[0].items[1] = { kode: '1800007200', uraian: 'Lampu Sorot LED 1000W COB', sat: 'PC' };
KOL.data[0].items[2] = { kode: '1800007300', uraian: 'Balok Kayu Kelas 1', sat: 'M3' };
KOL.data[0].items[3] = { kode: '1800007400', uraian: 'Regulator Oksigen YAMATO', sat: 'PC' };
Object.assign(KOL.progres[0].items, { [NO + '#1']: 1, [NO + '#2']: 1, [NO + '#3']: 1 });
tulisGR(manual('GRM1', '2026-09-30', 1));                                                                    // Environment Meter: manual belum tertaut
tulisGR(Object.assign(manual('GRO1', '2026-11-05', 1), { otomatis: true, refProgres: 'BK1' }));              // Environment Meter: otomatis OK
tulisGR(Object.assign(manual('GRL1', '2026-10-20', 1, 1), { refBA: 'BK1', tautBA: 'MANUAL' }));               // Lampu: tertaut, beda tanggal
tulisGR(Object.assign(manual('GRB1', '2026-11-05', 1), { kode: '1800007300', kunci: '1800007300', uraian: 'Balok Kayu Kelas 1', sat: 'M3', bonIdx: 2, otomatis: true, refProgres: 'BK1' }));   // Balok: OK
// Regulator: ada di BAPM, belum ada GR sama sekali
r = jalan('gudangAuditTanggalBA', {});
const mt = k => r.material.find(o => o.kunci === k), kode = o => o.masalah.map(x => x.kode).sort().join();
ok(r.ringkasMaterial.total === 4 && r.ringkasMaterial.ok === 1 && r.ringkasMaterial.anomali === 3, 'audit mencakup 4 material (yang punya GR + yang tercantum di BAPM): 1 OK, 3 anomali');
ok(kode(mt('1800007128')) === 'BAPM_BARIS_GANDA,GR_BELUM_TERTAUT,GR_KURANG_DARI_BAPM', 'Environment Meter: baris ganda di BAPM, GR 30/09 belum tertaut, GR tertaut kurang dari volume BAPM');
ok(kode(mt('1800007200')) === 'BEDA_TANGGAL', 'Lampu Sorot: GR tertaut 20/10 ≠ BAPM 05/11');
ok(mt('1800007300').status === 'OK' && mt('1800007300').bapm[0].qtyBAPM === 1 && mt('1800007300').bapm[0].qtyGR === 1, 'Balok Kayu: OK (tanggal & volume sama dengan BAPM)');
ok(kode(mt('1800007400')) === 'GR_KURANG_DARI_BAPM' && mt('1800007400').gr === 0, 'Regulator Oksigen: tercantum di BAPM tetapi belum ada penerimaan gudang');
r = jalan('gudangMigrasiTanggalBA', { dryRun: false, konfirmasi: 'SINKRONKAN', terapkanUsulan: true }, ADM);
ok(r.ditulis === 2 && r.ringkasMaterial.anomali === 2 && r.material.find(o => o.kunci === '1800007400').status === 'ANOMALI', 'sesudah migrasi: semua masalah tanggal selesai — tersisa Regulator (barang belum diterima) & catatan baris ganda BAPM');
ok(r.material.find(o => o.kunci === '1800007128').masalah.map(x => x.kode).join() === 'BAPM_BARIS_GANDA', 'Environment Meter tinggal catatan baris ganda di BAPM (perlu konfirmasi data kontrak)');

console.log('G. Tagihan terkunci: tanggal BAPM tidak boleh berubah diam-diam');
reset(); Object.assign(KOL.progres[0], { tanggalBA: '2026-11-05', bayar: { status: 'DIAJUKAN' } });
r = jalan('gudangCekTanggalBA', { progresId: 'BK1', tanggalBA: '2026-11-07' });
ok(r.aman === false && /sudah DIAJUKAN/.test(r.pesan), 'terbit ulang BAPM dengan tanggal lain saat tagihan DIAJUKAN → ditolak (dulu hanya peringatan)');
ok(jalan('gudangCekTanggalBA', { progresId: 'BK1', tanggalBA: '2026-11-05' }).aman === true, 'tanggal sama → aman');

console.log('\nLULUS ' + lulus + ' uji');
