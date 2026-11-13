// Gabungkan seluruh aplikasi menjadi SATU berkas HTML yang mudah dibagikan
// (WhatsApp/email/flashdisk):  npm run build:single  →  dist/JIAT-Monitoring.html
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/, (_, f) => `<style>${read(f)}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>${read(f).replace(/<\/script/gi, '<\\/script')}</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'JIAT-Monitoring.html'), html);
console.log('dist/JIAT-Monitoring.html', (html.length / 1024).toFixed(0) + ' KB');
