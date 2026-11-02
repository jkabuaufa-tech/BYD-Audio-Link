// Uji modul server 1.10.8 (foto penerimaan per material langsung per baris GR + tulis/baca gudang ringan) di kernel Code.gs 2.5.1 asli.
//   KODE_GS=…/Code.gs MODUL=server-modul-1.10.8.json [MODUL_LAMA=…/server-modul-1.10.7.json] node uji/uji_gudang_1108.js
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const { buatKonteks } = require('./harness.js');
const R = __dirname + '/..';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const JPG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6]).toString('base64');

function siapkan(berkasModul) {
  const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
  require(R + '/../tagihan/uji/drive_biner.js')(C, K, P);
  const gf = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { drv++; const f = gf(id), b = C.__files[id]; if (b && /^GUDANG/.test(b.nama)) f.getMimeType = () => 'image/jpeg'; return f; };
  let sel = 0, drv = 0; const SP = Object.getPrototypeOf(C.SpreadsheetApp.getActiveSpreadsheet().insertSheet('__x')), gr = SP.getRange;
  SP.getRange = function (r, c, nr, nc) { const g = gr.apply(this, arguments), gv = g.getValues; g.getValues = function () { sel += (nr || 1) * (nc || 1); return gv.apply(this, arguments); }; return g; };
  K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
  K.tulisProyek_([K.PROYEK_AWAL]);
  const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
  const ADM = (a, x) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  const STF = (a, x) => post(Object.assign({ action: a, nama: 'Staf Pengadaan', pin: '1111', proyek: P }, x || {}));
  const m = JSON.parse(fs.readFileSync(berkasModul, 'utf8'));
  assert.ok(ADM('modulUnggah', { data: m }).ok); { const t = ADM('modulTerbit', { versi: m.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji gudang foto per material' }); assert.ok(t.ok, t.error); }
  const foto = (ket) => { const r = STF('gudangUnggahFoto', { berkas: { id: 'f' + Math.random(), data: JPG, nama: 'f.jpg', jenis: 'FOTO-GR-ITEM', ket } }); assert.ok(r.ok, r.error); return r.data; };
  return { C, K, P, STF, ADM, foto, versi: m.versi, sel: () => sel, drv: () => drv, nolkan: () => { sel = 0; drv = 0; } };
}

function skenario(X, label) {
  const { STF, foto } = X;
  // bon nomor 14: 3 item
  let r = STF('savePermintaan', { data: { noUrut: 14, tahun: 2026, tanggal: '2026-10-01', departemen: 'Logistik', peminta: 'Budi', keperluan: 'uji', items: [
    { kode: '1000000001', uraian: 'Besi D13', sat: 'BTG', vol: 100, harga: 90000 }, { kode: '1000000002', uraian: 'Semen PCC 50 kg', sat: 'ZAK', vol: 50, harga: 65000 }, { kode: '1000000003', uraian: 'Pasir beton', sat: 'M3', vol: 20, harga: 300000 }] } });
  assert.ok(r.ok, r.error); const bon = r.data.nomor;
  // 600 baris gudang lama (beban baca)
  const sh = X.C.__sheets[X.P + '_GudangMasuk'] || null;
  const sj = foto('sj');
  r = STF('gudangTerimaBon', { data: { bonNomor: bon, tanggal: '2026-10-02', noSJ: 'SJ-PRE', sjFile: sj, foto: [foto('u'), null, null, null], baris: [{ idx: 0, qty: 1 }] } }); assert.ok(r.ok, r.error);
  const S = X.C.__sheets[X.P + '_GudangMasuk'], b0 = S.rows[1];
  for (let i = 0; i < 600; i++) { const o = JSON.parse(b0[14]); o.id = 'GRLAMA-' + i; o.status = 'BATAL'; const v = b0.slice(); v[0] = o.id; v[14] = JSON.stringify(o); S.rows.push(v); }
  const fA = [foto('A1'), foto('A2'), null, null], fB = [null, foto('B1'), null, null];
  X.nolkan();
  r = STF('gudangTerimaBon', { data: { bonNomor: bon, tanggal: '2026-10-03', noSJ: 'SJ-14', sjFile: sj, foto: [null, null, null, null], fotoItem: { 0: fA, 1: fB }, baris: [{ idx: 0, qty: 10 }, { idx: 1, qty: 5 }] } });
  const selTerima = X.sel(); X.__drv = X.drv();
  ok(r.ok, label + ': terima bon 14 dengan foto per material tanpa foto utama — ' + (r.error || 'ok'));
  const rows = S.rows.slice(1).map(x => JSON.parse(x[14])).filter(x => x.noSJ === 'SJ-14');
  const g0 = rows.find(x => x.bonIdx === 0), g1 = rows.find(x => x.bonIdx === 1);
  ok(g0.foto[0].idServer === fA[0].idServer && g0.foto[1].idServer === fA[1].idServer && !g0.fotoWakil, label + ': item 1 menyimpan 2 foto miliknya sendiri');
  ok(!g1.foto[0] && g1.foto[1].idServer === fB[1].idServer && !g1.fotoWakil, label + ': item 2 menyimpan foto miliknya sendiri (tidak tertimpa foto item 1)');
  // campuran: foto utama + 1 item foto sendiri → item lain memakai foto utama (wakil)
  const fU = [foto('U'), null, null, null], fC = [foto('C1'), null, null, null];
  r = STF('gudangTerimaBon', { data: { bonNomor: bon, tanggal: '2026-10-04', noSJ: 'SJ-15', sjFile: sj, foto: fU, fotoItem: { 2: fC }, baris: [{ idx: 0, qty: 2 }, { idx: 2, qty: 3 }] } });
  ok(r.ok, label + ': kiriman campuran foto utama + foto item');
  const rr = S.rows.slice(1).map(x => JSON.parse(x[14])).filter(x => x.noSJ === 'SJ-15');
  ok(rr.find(x => x.bonIdx === 2).foto[0].idServer === fC[0].idServer && rr.find(x => x.bonIdx === 0).fotoWakil === true && rr.find(x => x.bonIdx === 0).foto[0].idServer === fU[0].idServer, label + ': item tanpa foto sendiri memakai foto utama (fotoWakil)');
  // item tanpa foto & tanpa foto utama → ditolak, tidak ada yang tertulis
  const n0 = S.rows.length;
  r = STF('gudangTerimaBon', { data: { bonNomor: bon, tanggal: '2026-10-04', noSJ: 'SJ-16', sjFile: sj, foto: [null, null, null, null], fotoItem: { 0: [foto('x'), null, null, null] }, baris: [{ idx: 0, qty: 1 }, { idx: 1, qty: 1 }] } });
  ok(!r.ok && /wajib per material/.test(r.error) && S.rows.length === n0, label + ': item tanpa foto ditolak, tidak ada baris tertulis');
  // batal kiriman (tulis massal)
  const kid = g0.kiriman;
  r = STF('gudangBatalKiriman', { data: { kiriman: kid, alasan: 'salah input kiriman uji 1108' } });
  ok(r.ok && S.rows.slice(1).map(x => JSON.parse(x[14])).filter(x => x.kiriman === kid).every(x => x.status === 'BATAL'), label + ': batal kiriman menulis semua item');
  // sinkron tanggal BAPM massal: 2 BK, 1 BK bentrok dengan pengeluaran (saldo minus) → hanya BK itu yang ditolak
  const Kk = X.K, tulisGR = (id, ref, kode, tgl) => { const o = Object.assign(JSON.parse(S.rows[1][14]), { id, refProgres: ref, otomatis: true, fotoKurang: false, status: 'AKTIF', tanggal: tgl, kode, kunci: kode, bonTanggal: '2026-10-01', qty: 5, versi: 1 }); const v = S.rows[1].slice(); v[0] = id; v[14] = JSON.stringify(o); S.rows.push(v); };
  tulisGR('GROTO-1', 'BK-A', 'MAT-A', '2026-10-01'); tulisGR('GROTO-2', 'BK-A', 'MAT-A', '2026-10-01'); tulisGR('GROTO-3', 'BK-B', 'MAT-B', '2026-10-01');
  Kk.tulisKoleksi_(X.P, 'progres', [{ id: 'BK-A', nomorBA: 'BAPM-A', noKontrak: 'K-A', tanggalBA: '2026-10-10', versi: 1 }, { id: 'BK-B', nomorBA: 'BAPM-B', noKontrak: 'K-B', tanggalBA: '2026-10-20', versi: 1 }]);
  const SK = X.C.__sheets[X.P + '_GudangKeluar'] || X.C.SpreadsheetApp.getActiveSpreadsheet().insertSheet(X.P + '_GudangKeluar');
  if (!SK.rows.length) SK.rows.push(['ID']); const gi = { id: 'GI-B', tanggal: '2026-10-05', kunci: 'MAT-B', kode: 'MAT-B', uraian: 'Mat B', qty: 2, status: 'AKTIF', dibuatPada: 'x' };
  SK.rows.push(['GI-B', '2026-10-05', 'MAT-B', 'Mat B', 'M3', 2, 'u', 'p', 'AKTIF', 'x', 'x', JSON.stringify(gi)]);
  r = STF('gudangSinkronTanggal', { data: {} });
  const gr = id => JSON.parse(S.rows.find(x => x[0] === id)[14]);
  ok(r.ok && r.data.length === 1 && r.data[0].n === 2 && gr('GROTO-1').tanggal === '2026-10-10' && gr('GROTO-2').tanggal === '2026-10-10', label + ': sinkron tanggal BAPM massal menggeser GR otomatis BK-A');
  ok(r.galat.length === 1 && /minus/.test(r.galat[0]) && gr('GROTO-3').tanggal === '2026-10-01', label + ': BK-B yang membuat saldo minus ditolak, GR-nya tidak berubah');
  return selTerima;
}

console.log('Modul baru:'); const B = siapkan(process.env.MODUL || R + '/server-modul-1.10.8.json');
ok(/^1\.10\.(8|9|\d\d)$/.test(B.versi), 'versi modul ' + B.versi);
const selBaru = skenario(B, B.versi);
if (process.env.MODUL_LAMA) {
  console.log('Pembanding modul lama:'); const L = siapkan(process.env.MODUL_LAMA);
  let selLama = 0; try { selLama = skenario(L, L.versi); } catch (e) { console.log('  ✗ ' + L.versi + ': ' + e.message.split('\n')[0]); selLama = L.sel(); }
  console.log('  sel sheet dibaca saat terima bon (600+ baris): ' + L.versi + ' = ' + selLama + ' · ' + B.versi + ' = ' + selBaru);
  ok(selBaru * 5 < selLama, 'beban baca sheet saat simpan penerimaan turun > 5×');
  console.log('  panggilan Google Drive saat simpan penerimaan (3 foto): ' + L.versi + ' = ' + L.__drv + ' · ' + B.versi + ' = ' + B.__drv);
  if (B.versi >= '1.10.9') ok(B.__drv === 0, 'foto divalidasi dari cache unggah — 0 panggilan Drive saat simpan');
}
console.log(lulus + ' cek lulus');
