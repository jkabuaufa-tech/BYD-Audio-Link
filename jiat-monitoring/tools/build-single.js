// Gabungkan seluruh aplikasi menjadi satu berkas HTML:  npm run build:single
//   dist/JIAT-Monitoring.html   → dibagikan sebagai berkas (mode lokal, offline penuh)
//   dist/artifact/index.html    → dipublikasikan sebagai artifact claude.ai (mode tersinkron);
//                                 pustaka Excel dimuat dari cdnjs agar berkas tetap kecil.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const XLSX_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function build(out, { cdnXlsx }) {
  let html = read('index.html');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/, (_, f) => `<style>${read(f)}</style>`);
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) =>
    cdnXlsx && f.startsWith('vendor/xlsx') ? `<script src="${XLSX_CDN}"></script>`
      : `<script>${read(f).replace(/<\/script/gi, '<\\/script')}</script>`);
  fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
  fs.writeFileSync(path.join(root, out), html);
  console.log(out, (html.length / 1024).toFixed(0) + ' KB');
}
build('dist/JIAT-Monitoring.html', { cdnXlsx: false });
build('dist/artifact/index.html', { cdnXlsx: true });
