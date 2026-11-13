#!/usr/bin/env node
// Rakit paket pembaruan dari berkas JS dan/atau CSS:
//   node tools/rakit-pembaruan.js <versi> "<catatan>" [berkas.js] [berkas.css] [keluaran.json]
// Contoh:
//   node tools/rakit-pembaruan.js 1.3.0 "Tab Laporan K3" pembaruan/k3.js pembaruan/k3.css
// Paket bersifat kumulatif: sertakan SELURUH tambahan sejak aplikasi dasar.
// JS dijalankan sebagai badan fungsi dengan satu argumen `JIAT` sebelum aplikasi
// dimulai, sehingga dapat memanggil JIAT.registerModule({...}).
const fs = require('fs');
const [versi, catatan, ...files] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(versi || '')) { console.error('Versi harus berbentuk a.b.c'); process.exit(1); }
const js = files.find((f) => f.endsWith('.js')), css = files.find((f) => f.endsWith('.css'));
const out = files.find((f) => f.endsWith('.json')) || `pembaruan-${versi}.json`;
if (!js && !css) { console.error('Sertakan minimal satu berkas .js atau .css'); process.exit(1); }
if (js) new Function('JIAT', fs.readFileSync(js, 'utf8'));          // periksa sintaks sebelum dibagikan
const dasar = /VERSI_DASAR = '(\d+)\./.exec(fs.readFileSync(require('path').join(__dirname, '..', 'js/core/pembaruan.js'), 'utf8'))[1];
fs.writeFileSync(out, JSON.stringify({ format: 'jiat-monitoring-pembaruan', versi, untukDasar: dasar, tanggal: new Date().toISOString().slice(0, 10),
  catatan: catatan || '', css: css ? fs.readFileSync(css, 'utf8') : '', js: js ? fs.readFileSync(js, 'utf8') : '' }, null, 1));
console.log('ditulis:', out);
