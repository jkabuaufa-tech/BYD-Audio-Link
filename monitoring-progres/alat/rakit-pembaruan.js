#!/usr/bin/env node
/* Merakit file pembaruan "rilis/jiat-pembaruan-<versi>.json" dari kode sumber.
 *
 *   node alat/rakit-pembaruan.js <versi> <file-catatan.txt | "teks catatan"> [--bawaan]
 *
 * Isi file: aplikasi (HTML badan dari index.html, styles.css, sinkron.js, app.js)
 *           + server (apps-script/Kode.gs) + SHA-256 setiap bagian.
 * --bawaan : juga menjadikan versi ini "bawaan" di index.html (dipakai bila folder
 *            juga di-deploy ulang ke Netlify). Tanpa flag ini, Netlify tidak perlu diubah.
 * Sebelum merakit, styles.css dibangun ulang dengan Tailwind (bila npx tersedia).
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const [versi, catatanArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const bawaan = process.argv.includes('--bawaan');
const UNTUK_KERNEL = '1.2.0'; // kernel minimum yang punya mekanisme pembaruan JSON

if (!/^\d+\.\d+\.\d+$/.test(versi || '')) { console.error('Pakai: node alat/rakit-pembaruan.js 1.2.1 "catatan" [--bawaan]'); process.exit(1); }
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const tulis = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const catatan = catatanArg && fs.existsSync(catatanArg) ? fs.readFileSync(catatanArg, 'utf8').trim() : (catatanArg || '');

// 1. Versi server di Kode.gs = versi paket
let kode = baca('apps-script/Kode.gs');
if (!/^var VERSI = '[\d.]+';$/m.test(kode)) throw new Error('Baris VERSI di Kode.gs tidak ditemukan');
kode = kode.replace(/^var VERSI = '[\d.]+';$/m, `var VERSI = '${versi}';`);
tulis('apps-script/Kode.gs', kode);

// 2. Tailwind (kelas baru di app.js/index.html)
try { execSync('npx -y tailwindcss@3 -c tailwind.config.js -i src/input.css -o styles.css --minify', { cwd: ROOT, stdio: 'pipe' }); console.log('✓ styles.css dibangun ulang'); }
catch (e) { console.warn('! Tailwind tidak dijalankan – memakai styles.css yang ada'); }

// 3. Bagian aplikasi
let index = baca('index.html');
const m = index.match(/<!--BADAN-->\n?([\s\S]*?)<!--\/BADAN-->/);
if (!m) throw new Error('Penanda <!--BADAN--> … <!--/BADAN--> tidak ada di index.html');
if (bawaan) { index = index.replace(/<meta name="jiat-versi" content="[\d.]+">/, `<meta name="jiat-versi" content="${versi}">`); tulis('index.html', index); }
const app = { html: m[1], css: baca('styles.css'), js: { sinkron: baca('sinkron.js'), app: baca('app.js') } };
for (const [n, s] of Object.entries({ 'sinkron.js': app.js.sinkron, 'app.js': app.js.app, 'Kode.gs': kode })) {
  try { new Function(s); } catch (e) { throw new Error(`Sintaks ${n} salah: ${e.message}`); }
}

const paket = {
  format: 'jiat-monitoring-pembaruan',
  versi, tanggal: new Date().toISOString().slice(0, 10), untukKernel: UNTUK_KERNEL,
  catatan,
  sha256: { html: sha(app.html), css: sha(app.css), sinkron: sha(app.js.sinkron), app: sha(app.js.app), server: sha(kode) },
  aplikasi: app,
  server: { kode },
};
fs.mkdirSync(path.join(ROOT, 'rilis'), { recursive: true });
const keluar = path.join('rilis', `jiat-pembaruan-${versi}.json`);
tulis(keluar, JSON.stringify(paket, null, 1));
const kb = (fs.statSync(path.join(ROOT, keluar)).size / 1024).toFixed(0);
console.log(`✓ ${keluar} (${kb} KB) – aplikasi + server ${versi}${bawaan ? ' · index.html bawaan = ' + versi : ''}`);
