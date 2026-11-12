// Potong paket pembaruan menjadi blok-blok tingkat atas ("/* MPxxx — …" di awal baris) agar uji dapat memuat blok ASLI paket satu per satu
// di halaman kosong (tanpa HTML dasar & Code.gs, yang tidak ada di repo).   const { blok } = require('./blok_paket.js'); blok(js, 'MP293')
function daftar(js) {
  const re = /^\/\* (MP[0-9A-Z]+(?:[ _-][A-Za-z0-9]+)?|XLH|XLR|TAGIHAN [A-Z ]+ \d[\d.]*|\[2\.10\.11\] NOMOR ADDENDUM BAKU)\b[^\n]*/gm, L = []; let m;
  while ((m = re.exec(js))) L.push({ nama: m[1], awal: m.index, judul: m[0].slice(0, 120) });
  L.forEach((b, i) => { b.akhir = i + 1 < L.length ? L[i + 1].awal : js.length; });
  return L;
}
function blok(js, nama, ke) {   // ke: kemunculan ke- (bawaan 0)
  const L = daftar(js).filter(b => b.nama === nama); const b = L[ke || 0];
  if (!b) throw new Error('blok ' + nama + ' tidak ada di paket');
  return js.slice(b.awal, b.akhir);
}
module.exports = { daftar, blok };
if (require.main === module) { const p = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8')); daftar(p.js).forEach(b => console.log(String(b.akhir - b.awal).padStart(8), b.judul.slice(0, 90))); }
