'use strict';

/**
 * Membuat paket pembaruan yang diunggah lewat Pengaturan › Pembaruan:
 *   seps/dist/seps-pembaruan-<versi>.json
 *
 *   1. Naikkan "versi" di seps/versi.json (mis. 1.0.0 → 1.1.0) dan isi "catatan".
 *   2. Perubahan database? Tambah berkas BARU backend/migrasi/sqlite/00N_nama.sql
 *      (hanya CREATE … IF NOT EXISTS / ALTER TABLE … ADD COLUMN / INSERT OR IGNORE).
 *      Jangan pernah mengubah berkas migrasi lama.
 *   3. cd seps/frontend && npm run build
 *   4. node seps/alat/buat-paket.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { rakitKode, SEPS } = require('./rakit-kode');
const { sidikPaket } = require('../backend/src/sistem/pembaruan');
const { periksaMigrasiAman } = require('../backend/src/sistem/sqlAman');

function daftarBerkas(dir, akar = dir) {
  return fs.readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return fs.statSync(p).isDirectory() ? daftarBerkas(p, akar) : [path.relative(akar, p).split(path.sep).join('/')];
  });
}

/** Kemas satu folder kode (versi.json, backend/, web/) menjadi objek paket. */
function paketDariFolder(dir, { catatan, untukShell, dependensi = ['cors', 'express', 'sql.js'] } = {}) {
  const versi = JSON.parse(fs.readFileSync(path.join(dir, 'versi.json'), 'utf8'));
  const berkas = {};
  for (const p of daftarBerkas(dir).sort()) {
    const buf = fs.readFileSync(path.join(dir, ...p.split('/')));
    if (p.endsWith('.sql')) {
      const cek = periksaMigrasiAman(buf.toString('utf8'));
      if (!cek.aman) throw new Error(`Migrasi ${p} tidak aman: ${cek.pelanggaran.join(' | ')}`);
    }
    berkas[p] = { sha256: crypto.createHash('sha256').update(buf).digest('hex'), isi: buf.toString('base64') };
  }
  return {
    format: 'seps-pembaruan',
    versi: versi.versi,
    untukShell: untukShell || versi.untukShell,
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: catatan ?? versi.catatan ?? '',
    dependensi,
    sidik: sidikPaket(berkas),
    berkas,
  };
}

function buatPaket({ keluar = path.join(SEPS, 'dist') } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seps-paket-'));
  try {
    rakitKode(tmp);
    const deps = require(path.join(SEPS, 'desktop', 'package.json')).dependencies || {};
    const paket = paketDariFolder(tmp, { dependensi: Object.keys(deps) });
    fs.mkdirSync(keluar, { recursive: true });
    const tujuan = path.join(keluar, `seps-pembaruan-${paket.versi}.json`);
    fs.writeFileSync(tujuan, JSON.stringify(paket));
    return { tujuan, paket };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { buatPaket, paketDariFolder, daftarBerkas };

if (require.main === module) {
  const { tujuan, paket } = buatPaket({ keluar: process.argv[2] ? path.resolve(process.argv[2]) : undefined });
  const kb = Math.round(fs.statSync(tujuan).size / 1024);
  console.log(`Paket ${paket.versi}: ${Object.keys(paket.berkas).length} berkas, ${kb} KB → ${tujuan}`);
}
