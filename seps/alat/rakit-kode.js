'use strict';

/**
 * Merakit "folder kode" SEPS — isi yang dibawa installer (kode bawaan) dan
 * yang dikemas ke paket pembaruan:
 *   versi.json · backend/src/** · backend/migrasi/sqlite/*.sql · web/** (frontend/out)
 *
 *   node alat/rakit-kode.js <folder-tujuan>
 * Syarat: frontend sudah dibangun (cd frontend && npm run build → frontend/out).
 */
const fs = require('fs');
const path = require('path');

const SEPS = path.resolve(__dirname, '..');

function salinDir(dari, ke, saring = () => true) {
  fs.mkdirSync(ke, { recursive: true });
  for (const n of fs.readdirSync(dari)) {
    const a = path.join(dari, n);
    const b = path.join(ke, n);
    if (!saring(a)) continue;
    if (fs.statSync(a).isDirectory()) salinDir(a, b, saring);
    else fs.copyFileSync(a, b);
  }
}

function rakitKode(tujuan) {
  const web = path.join(SEPS, 'frontend', 'out');
  if (!fs.existsSync(path.join(web, 'index.html'))) {
    throw new Error('frontend/out belum ada. Jalankan: cd seps/frontend && npm run build');
  }
  fs.rmSync(tujuan, { recursive: true, force: true });
  fs.mkdirSync(tujuan, { recursive: true });
  fs.copyFileSync(path.join(SEPS, 'versi.json'), path.join(tujuan, 'versi.json'));
  salinDir(path.join(SEPS, 'backend', 'src'), path.join(tujuan, 'backend', 'src'));
  salinDir(path.join(SEPS, 'backend', 'migrasi', 'sqlite'), path.join(tujuan, 'backend', 'migrasi', 'sqlite'));
  salinDir(web, path.join(tujuan, 'web'));
  return tujuan;
}

module.exports = { rakitKode, SEPS };

if (require.main === module) {
  const t = process.argv[2];
  if (!t) { console.error('Pakai: node alat/rakit-kode.js <folder-tujuan>'); process.exit(1); }
  console.log(`Kode dirakit di ${rakitKode(path.resolve(t))}`);
}
