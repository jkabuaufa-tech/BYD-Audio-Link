// Uji 2.5.4: Kartu Gudang — Jumlah terusan kumulatif sejak awal proyek (fungsi dataKartu & cetak ASLI dari paket, dievaluasi dengan data tiruan).
const fs = require('fs'), assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const js = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.argv[2] || 'pembaruan-2.5.5.json'), 'utf8')).js;
const potong = (a, b) => { const i = js.indexOf(a); return js.slice(i, js.indexOf(b, i)); };
const fData = potong('function dataKartu()', '  function vKartu()'), fCetak = potong('window.mp223KartuCetak = () => {', '  window.mp223KartuExcel');
const iso = d => d.toISOString().slice(0, 10), tambahHari = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const GD = { masuk: [{ kunci: 'FC10', tanggal: '2026-07-03', qty: 14, status: 'AKTIF', bonNomor: 'MIGRASI/2026', noSJ: 'MIG-1' }, { kunci: 'FC10', tanggal: '2026-08-02', qty: 5, status: 'AKTIF', bonNomor: 'B-2', noSJ: 'SJ-2' }],
  keluar: [{ kunci: 'FC10', tanggal: '2026-07-03', qty: 14, status: 'AKTIF', untuk: 'Migrasi', penerima: 'lama' }, { kunci: 'FC10', tanggal: '2026-08-05', qty: 3, status: 'AKTIF', untuk: 'Pengecoran', penerima: 'Mandor' }] };
const K = { kunci: 'FC10', dari: '', sd: '', semua: true };
const ctx = { GD, K, N: Number, aktif: L => L.filter(r => r.status === 'AKTIF'), materi: () => [{ kunci: 'FC10', kode: '1000001017', uraian: 'Beton Readymix Fc-10', sat: 'M3' }], hariIni: () => '2026-10-15', tambahHari,
  stokPada: (k, t) => GD.masuk.filter(r => r.tanggal <= t).reduce((a, r) => a + r.qty, 0) - GD.keluar.filter(r => r.tanggal <= t).reduce((a, r) => a + r.qty, 0), bonPendek: s => s };
const dataKartu = new Function(...Object.keys(ctx), fData + '; return dataKartu;')(...Object.values(ctx));
console.log('1. Periode Juli (03-Jul GR 14, GI 14)');
Object.assign(K, { dari: '2026-06-25', sd: '2026-07-25' }); let D = dataKartu(), r = D.rows.find(x => x.d === '2026-07-25');
ok(r.tm === 14 && r.tk === 14 && r.sisa === 0, '25-Jul: terusan GR 14, GI 14, sisa 0');
console.log('2. Periode berikutnya 25-Jul s.d. 25-Agt — terusan DIBAWA, tidak kembali 0');
Object.assign(K, { dari: '2026-07-26', sd: '2026-08-25' }); D = dataKartu();
const d1 = D.rows[0], d2 = D.rows.find(x => x.d === '2026-08-02'), d3 = D.rows.find(x => x.d === '2026-08-25');
ok(d1.tm === 14 && d1.tk === 14 && d1.qm === 0 && D.awal === 0, 'hari pertama periode: jumlah 0, terusan GR 14 / GI 14 (dibawa), saldo awal 0');
ok(d2.qm === 5 && d2.tm === 19 && d2.sisa === 5, '02-Agt: GR 5 → terusan 19, sisa 5');
ok(d3.tm === 19 && d3.tk === 17 && d3.sisa === 2, '25-Agt: terusan GR 19, GI 17, sisa 2 (= saldo awal 0 + mutasi 5 − 3)');
ok(D.rows.every(x => x.sisa === x.tm - x.tk), 'sisa = terusan masuk − terusan keluar pada setiap baris');
console.log('3. Cetak tanpa "Semua hari": baris kosong tetap membawa terusan');
K.semua = false; let html = '';
const cctx = { K, dataKartu, ttd: () => ({ kasi: 'Joko', petugas: 'Gudang' }), tambahHari, BLNP: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  tglK: s => s, ang: v => String(v), E: s => String(s == null ? '' : s), cetak: (a, b, c, t) => { html = t; } };
new Function(...Object.keys(cctx), 'const window = {}; ' + fCetak + '; return window.mp223KartuCetak;')(...Object.values(cctx))();
const baris = [...html.matchAll(/<tr><td class="c">(\d{4}-\d{2}-\d{2})<\/td><td class="r">[^<]*<\/td><td class="r">([^<]*)<\/td>/g)];
ok(baris[0][1] === '2026-07-26' && baris[0][2] === '14' && baris.find(b => b[1] === '2026-08-01')[2] === '14', 'cetak: 26-Jul & 01-Agt terusan GR 14 (bukan "-")');
console.log('\nLULUS ' + lulus + ' cek');
