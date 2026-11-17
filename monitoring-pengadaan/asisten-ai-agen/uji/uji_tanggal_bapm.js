// Uji Modul server 1.10.21 (tanggal BAPM = sumber kebenaran GR) — modul LENGKAP 1.10.21 dijalankan di atas tiruan kernel ringan
// (Sheets/Lock/Cache di memori; fungsi kernel lain → tiruan kosong). Kernel Code.gs asli tidak diperlukan.
//   node uji/uji_tanggal_bapm.js [server-modul-1.10.21.json]
const assert = require('assert'), fs = require('fs'), path = require('path');
const BERKAS = process.argv[2] || path.join(__dirname, '..', 'server-modul-1.10.21.json');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const tolak = (f, re, m) => { let e = null; try { f(); } catch (x) { e = x; } assert.ok(e && re.test(e.message), m + ' — dapat: ' + (e ? e.message : 'tidak ditolak')); lulus++; console.log('  ✓ ' + m); };

/* ---------- tiruan kernel ---------- */
const SH = {}, KOL = { progres: [], permintaan: [], data: [] }, LOG = [];
function lembar(nama) {
  const rows = [];
  return SH[nama] = { rows, getLastRow: () => rows.length + 1, appendRow: v => rows.push(v.slice()),
    getRange: (r, c, nr, nc) => ({ getValues: () => rows.slice(r - 2, r - 2 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))),
      setValues: V => V.forEach((v, i) => { const t = rows[r - 2 + i] || (rows[r - 2 + i] = []); v.forEach((z, j) => { t[c - 1 + j] = z; }); }) }) };
}
let nId = 0;
const K = {
  s_: v => String(v == null ? '' : v),
  ss_: () => ({ getSheetByName: n => SH[n] || null }),
  sheet_: n => SH[n] || lembar(n),
  baris_: sh => sh.rows,
  bacaKoleksi_: (P, j) => JSON.parse(JSON.stringify(KOL[j] || [])),
  tulisKoleksi_: (P, j, L) => { KOL[j] = JSON.parse(JSON.stringify(L)); },
  catat_: (P, r, u, aksi, det) => LOG.push({ aksi, det, oleh: u.nama }),
  tglValid_: t => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(t || '').trim()); return m && !isNaN(Date.parse(m[0])) ? m[0] : ''; },
  hariIniISO_: () => '2026-11-17',
  idBaru_: p => p + 'X' + (++nId),
  bulat4_: x => Math.round((Number(x) || 0) * 1e4) / 1e4,
  LockService: { getScriptLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock: () => { } }) },
  CacheService: { getScriptCache: () => ({ get: k => /^GDF\|/.test(k) ? JSON.stringify({ P: 'P1', ref: { idServer: k.slice(4), nama: k.slice(4) + '.jpg', ukuran: 1000, tipe: 'image/jpeg', url: 'https://drive/' + k.slice(4) } }) : null, put: () => { }, getAll: () => ({}) }) },
  refBerkas_: x => x && (x.idServer ? x : { idServer: x.id || x }),
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => { }, getProperties: () => ({}) }) },
  KERNEL: { versi: '2.5.1', kaitTersedia: [] }, VERSI_SERVER: '1.10.21'
};
const kosong = new Proxy(function () { }, { get: (t, p) => p === Symbol.toPrimitive ? () => '' : kosong, apply: () => undefined });
const lingkup = new Proxy(K, { has: (t, p) => typeof p === 'string' && !(p in globalThis), get: (t, p) => p === Symbol.unscopables ? undefined : p in t ? t[p] : kosong });
const kode = JSON.parse(fs.readFileSync(BERKAS, 'utf8')).kode;
const MODUL = new Function('__L', 'with (__L) { return (function () {\n' + kode + '\n})(); }')(lingkup);
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

console.log('\nLULUS ' + lulus + ' uji');
