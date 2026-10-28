// Uji 2.6.22: Kartu Gudang periode 25–24 (fungsi periodeKini / periodeRentang / dataKartu ASLI dari paket, data tiruan).
//   node uji/uji_periode_2524.js [pembaruan-2.6.22.json]
const fs = require('fs'), assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const berkas = process.argv[2] || __dirname + '/../pembaruan-2.6.22.json';
const js = JSON.parse(fs.readFileSync(berkas, 'utf8')).js;
const potong = (a, b) => { const i = js.indexOf(a); assert.ok(i >= 0, 'tidak ditemukan: ' + a); return js.slice(i, js.indexOf(b, i)); };
const fKini = potong('function periodeKini()', '  window.mp256PeriodeKini');
const fData = potong('function dataKartu()', '  function vKartu()');
const iso = d => d.toISOString().slice(0, 10), tambahHari = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

console.log('1. Periode berjalan menurut tanggal hari ini (WIB)');
const kini = tgl => { const D = class extends Date { constructor(...a) { super(...(a.length ? a : [tgl + 'T05:00:00Z'])); } };
  return new Function('Date', 'hariIni', fKini + '; return { periodeKini, periodeRentang };')(D, () => tgl); };
const P = (tgl) => { const f = kini(tgl), p = f.periodeKini(); return Object.assign(p, f.periodeRentang(p.bulan, p.tahun)); };
let p = P('2026-10-24'); ok(p.bulan === 10 && p.dari === '2026-09-25' && p.sd === '2026-10-24', '24 Okt → periode Oktober: 25 Sep s.d. 24 Okt');
p = P('2026-10-25'); ok(p.bulan === 11 && p.dari === '2026-10-25' && p.sd === '2026-11-24', '25 Okt → periode November: 25 Okt s.d. 24 Nov (tanggal potong 25)');
p = P('2026-12-25'); ok(p.bulan === 1 && p.tahun === 2027 && p.dari === '2026-12-25' && p.sd === '2027-01-24', '25 Des 2026 → periode Januari 2027: 25 Des s.d. 24 Jan');
p = P('2027-01-10'); ok(p.bulan === 1 && p.tahun === 2027 && p.dari === '2026-12-25', '10 Jan 2027 → periode Januari 2027 (lintas tahun)');

console.log('2. Kartu Gudang bulan/tahun dipilih: transaksi tanggal 24 & 25 hanya masuk satu periode');
const GD = { masuk: [{ kunci: 'FC10', tanggal: '2026-10-24', qty: 7, status: 'AKTIF', bonNomor: 'B-1', noSJ: 'SJ-1' }, { kunci: 'FC10', tanggal: '2026-10-25', qty: 5, status: 'AKTIF', bonNomor: 'B-2', noSJ: 'SJ-2' }],
  keluar: [{ kunci: 'FC10', tanggal: '2026-10-25', qty: 2, status: 'AKTIF', untuk: 'Pengecoran', penerima: 'Mandor' }] };
const K = { kunci: 'FC10', dari: '', sd: '', semua: true, bulan: 0, tahun: 0 };
const ctx = { GD, K, N: Number, aktif: L => L.filter(r => r.status === 'AKTIF'), materi: () => [{ kunci: 'FC10', kode: '1000001017', uraian: 'Beton Readymix Fc-10', sat: 'M3' }], hariIni: () => '2026-11-10', tambahHari,
  stokPada: (k, t) => GD.masuk.filter(r => r.tanggal <= t).reduce((a, r) => a + r.qty, 0) - GD.keluar.filter(r => r.tanggal <= t).reduce((a, r) => a + r.qty, 0), bonPendek: s => s };
const dataKartu = new Function(...Object.keys(ctx), fData + '; return dataKartu;')(...Object.values(ctx));
const jml = D => ({ m: D.rows.reduce((a, r) => a + (r.qm || 0), 0), k: D.rows.reduce((a, r) => a + (r.qk || 0), 0) });
Object.assign(K, { bulan: 10, tahun: 2026 }); let Dk = dataKartu();
ok(Dk.dari === '2026-09-25' && Dk.sd === '2026-10-24', 'Oktober 2026 = 25 Sep s.d. 24 Okt');
let j = jml(Dk); ok(j.m === 7 && j.k === 0, 'Oktober: hanya GR tanggal 24 (7), transaksi tanggal 25 tidak ikut');
Object.assign(K, { bulan: 11, tahun: 2026 }); Dk = dataKartu();
ok(Dk.dari === '2026-10-25' && Dk.sd === '2026-11-24', 'November 2026 = 25 Okt s.d. 24 Nov');
j = jml(Dk); ok(j.m === 5 && j.k === 2 && Dk.awal === 7, 'November: GR 5 & GI 2 tanggal 25, saldo awal 7 (tidak terhitung dua kali)');
ok(!/26–25|'-26'/.test(fKini + fData), 'tidak ada sisa rumus 26–25 di fungsi periode');
console.log('\nLULUS ' + lulus + ' cek');
