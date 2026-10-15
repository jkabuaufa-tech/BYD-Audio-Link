// Uji 2.5.6: Kartu Gudang — periode Bulan/Tahun 26–25, keterangan "ket" per transaksi (fallback bawaan), saldo akhir, cetak & Excel.
// Memakai fungsi dataKartu, mp223KartuCetak & mp223KartuExcel ASLI dari paket, dievaluasi dengan data tiruan (data tidak diubah).
const fs = require('fs'), assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const js = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.argv[2] || 'pembaruan-2.5.6.json'), 'utf8')).js;
const potong = (a, b) => { const i = js.indexOf(a); assert.ok(i >= 0, a); return js.slice(i, js.indexOf(b, i)); };
const fData = potong('function dataKartu()', '  function vKartu()'), fCetak = potong('window.mp223KartuCetak = () => {', '  /* ======================= 6. STOK');
const iso = d => d.toISOString().slice(0, 10), tambahHari = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const BLNP = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
// data historis: saldo sebelum Juli, GR dengan & tanpa ket, 2 transaksi pada tanggal yang sama, transaksi tepat 25 & 26
const GD = { masuk: [
    { id: 'GR1', kunci: 'SM', tanggal: '2026-06-10', qty: 100, status: 'AKTIF', bonNomor: 'BON/001/2026', noSJ: 'SJ-01', ket: '' },
    { id: 'GR2', kunci: 'SM', tanggal: '2026-07-03', qty: 50, status: 'AKTIF', bonNomor: 'BON/002/2026', noSJ: 'SJ-02', ket: 'Kiriman tahap 2 — semen untuk pile cap', dibuatPada: '2026-07-03T08:00:00Z' },
    { id: 'GR3', kunci: 'SM', tanggal: '2026-07-25', qty: 20, status: 'AKTIF', bonNomor: 'BON/003/2026', noSJ: 'SJ-03' },
    { id: 'GR4', kunci: 'SM', tanggal: '2026-07-26', qty: 30, status: 'AKTIF', bonNomor: 'BON/004/2026', noSJ: 'SJ-04', ket: 'Tambahan lapangan' },
    { id: 'GRX', kunci: 'SM', tanggal: '2026-07-05', qty: 999, status: 'BATAL', bonNomor: 'BON/009/2026', noSJ: 'SJ-X' }],
  keluar: [
    { id: 'GI1', kunci: 'SM', tanggal: '2026-06-20', qty: 40, status: 'AKTIF', untuk: 'Direksi Keet', penerima: 'Mandor A' },
    { id: 'GI2', kunci: 'SM', tanggal: '2026-07-03', qty: 10, status: 'AKTIF', untuk: 'Pile Cap P3', penerima: 'Mandor B', ket: 'Pengecoran pile cap P3', dibuatPada: '2026-07-03T09:00:00Z' },
    { id: 'GI3', kunci: 'SM', tanggal: '2026-07-03', qty: 5, status: 'AKTIF', untuk: 'Saluran BS-1', penerima: 'Mandor C', dibuatPada: '2026-07-03T10:00:00Z' },
    { id: 'GI4', kunci: 'SM', tanggal: '2026-08-02', qty: 25, status: 'AKTIF', untuk: 'Abutment A1', penerima: 'Mandor B', ket: 'Lantai kerja abutment' }] };
const salinan = JSON.stringify(GD);
const K = { kunci: 'SM', dari: '', sd: '', semua: true, bulan: 0, tahun: 0 };
const ctx = { GD, K, N: Number, aktif: L => L.filter(r => r.status === 'AKTIF'), materi: () => [{ kunci: 'SM', kode: '1000234561', uraian: 'Semen PCC 50 kg', sat: 'ZAK', sisa: 130 }], hariIni: () => '2026-10-15', tambahHari,
  bonPendek: n => { const p = String(n || '').split('/'); return p[0] + (p.length > 1 ? '/' + p[p.length - 1] : ''); } };
const dataKartu = new Function(...Object.keys(ctx), fData + '; return dataKartu;')(...Object.values(ctx));

console.log('1. Periode Juli 2026 = 26 Juni s.d. 25 Juli');
Object.assign(K, { bulan: 7, tahun: 2026 }); let D = dataKartu();
ok(D.dari === '2026-06-26' && D.sd === '2026-07-25' && D.rows.length === 30, 'rentang ' + D.dari + ' s.d. ' + D.sd + ' · ' + D.rows.length + ' tanggal (termasuk hari tanpa transaksi)');
ok(D.awal === 60 && D.masuk === 70 && D.keluar === 15 && D.akhir === 115, 'saldo awal 60 (100 − 40 sebelum 26 Jun) · masuk 70 · keluar 15 · saldo akhir 115 = 60 + 70 − 15');
const r25 = D.rows[D.rows.length - 1];
ok(r25.d === '2026-07-25' && r25.qm === 20 && r25.sisa === D.akhir, 'transaksi tanggal 25 Juli masuk periode Juli; sisa baris terakhir = saldo akhir');
ok(D.rows[0].tm === 100 && D.rows[0].tk === 40, 'jumlah terusan dibawa dari sebelum periode (GR 100 / GI 40) — tidak kembali 0');
const r3 = D.rows.find(r => r.d === '2026-07-03');
ok(r3.kets.length === 3 && r3.kets[0] === 'GR Kiriman tahap 2 — semen untuk pile cap (BON/2026 · SJ SJ-02)' && r3.kets[1] === 'GI Pengecoran pile cap P3 (Pile Cap P3 · Mandor B)' && r3.kets[2] === 'GI Saluran BS-1 · Mandor C',
  '03-Jul: 3 transaksi — ket GR & GI tersimpan diutamakan (rujukan bon/SJ & lokasi/penerima tetap), GI tanpa ket → keterangan bawaan');
ok(/^1\) GR .*; 2\) GI .*; 3\) GI /.test(r3.ket), 'beberapa transaksi pada tanggal sama: keterangan bernomor per transaksi (Excel)');
ok(!D.rows.some(r => r.qm === 999), 'transaksi BATAL tidak dihitung');
console.log('2. Periode Agustus 2026 = 26 Juli s.d. 25 Agustus (setiap transaksi hanya satu periode)');
Object.assign(K, { bulan: 8, tahun: 2026 }); const A = dataKartu();
ok(A.dari === '2026-07-26' && A.sd === '2026-08-25' && A.awal === D.akhir, 'saldo awal Agustus (' + A.awal + ') = saldo akhir Juli (' + D.akhir + ')');
ok(A.rows[0].qm === 30 && A.masuk === 30 && A.keluar === 25 && A.akhir === 120, '26-Jul (GR 30) masuk Agustus, bukan Juli · saldo akhir 120');
ok(A.rows[0].tm === 200 && A.rows[A.rows.length - 1].tk === 80, 'terusan kumulatif sejak awal proyek: GR 200 · GI 80');
ok(D.masuk + A.masuk === 100 && !A.rows.some(r => r.d === '2026-07-25'), 'tanggal 25 Juli tidak terulang di periode Agustus (tidak ganda)');
console.log('3. Batas tahun & kompatibilitas');
Object.assign(K, { bulan: 1, tahun: 2027 }); let J = dataKartu();
ok(J.dari === '2026-12-26' && J.sd === '2027-01-25', 'Januari 2027 = 26 Des 2026 s.d. 25 Jan 2027');
Object.assign(K, { bulan: 0, tahun: 0, dari: '2026-07-01', sd: '2026-07-10' }); J = dataKartu();
ok(J.dari === '2026-07-01' && J.sd === '2026-07-10' && J.rows.length === 10, 'tanpa bulan/tahun: rentang dari/sd lama tetap berlaku (kompatibel)');
ok(JSON.stringify(GD) === salinan, 'data penerimaan & pengeluaran tidak diubah oleh perhitungan');

console.log('4. Cetak LOGINV-09 & Excel memakai periode & keterangan yang sama');
Object.assign(K, { bulan: 7, tahun: 2026, semua: false }); let html = '', xl = null;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cctx = { K, dataKartu, ttd: () => ({ kasi: 'Joko', petugas: 'Gudang' }), tambahHari, BLNP, tglK: s => s, ang: v => String(v), E, cetak: (a, b, c, t) => { html = c + t; }, excel: (n, j, h, rows) => { xl = { n, j, h, rows }; } };
const W = new Function(...Object.keys(cctx), 'const window = {}; ' + fCetak + '; return window;')(...Object.values(cctx));
W.mp223KartuCetak();
const baris = [...html.matchAll(/<tr><td class="c">(\d{4}-\d{2}-\d{2})<\/td>/g)].map(m => m[1]);
ok(baris.length === 30 && baris[0] === '2026-06-26' && baris[29] === '2026-07-25', 'cetak: 30 tanggal 26 Jun – 25 Jul (termasuk tanpa transaksi meski "Semua hari" mati)');
ok(/Bulan<\/td><td>: Juli/.test(html) && /Tahun<\/td><td>: 2026/.test(html) && /Periode<\/td><td>: 26 Juni 2026 s\.d\. 25 Juli 2026/.test(html), 'cetak: Bulan Juli · Tahun 2026 · Periode 26 Juni 2026 s.d. 25 Juli 2026 (bukan "Juni")');
ok(/Kiriman tahap 2 — semen untuk pile cap \(BON\/2026 · SJ SJ-02\)<br>GI Pengecoran pile cap P3/.test(html) && /Saldo akhir<\/b><\/td><td>: 115/.test(html), 'cetak: keterangan per transaksi (baris baru) & saldo akhir 115');
Object.assign(K, { semua: true }); W.mp223KartuExcel();
const x3 = xl.rows.find(r => r[0] === '2026-07-03');
ok(/Juli 2026 2026-06-26 s\.d\. 2026-07-25/.test(xl.j) && /saldo akhir 115/.test(xl.j) && xl.rows.length === 30 && /^1\) GR Kiriman tahap 2/.test(x3[6]), 'Excel: judul periode & saldo akhir, 30 baris, keterangan bernomor');
console.log('\nLULUS ' + lulus + ' cek');
