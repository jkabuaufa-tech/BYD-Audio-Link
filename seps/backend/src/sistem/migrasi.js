'use strict';

/**
 * Pelaksana migrasi SQLite berurutan (001_…, 002_…).
 * - Setiap migrasi dicatat di _migrasi beserta SHA-256 isinya.
 * - Migrasi yang sudah diterapkan TIDAK BOLEH berubah isinya (paket ditolak).
 * - Semua migrasi wajib lolos periksaMigrasiAman (hanya menambah).
 * - Backup dibuat otomatis sebelum migrasi diterapkan ke database yang sudah berisi.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { periksaMigrasiAman } = require('./sqlAman');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function bacaDirMigrasi(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_[\w-]+\.sql$/.test(f))
    .sort()
    .map((f) => {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      return { id: f.replace(/\.sql$/, ''), sql, sha256: sha256(sql) };
    });
}

function pastikanTabel(db) {
  db.run(`CREATE TABLE IF NOT EXISTS _migrasi (
    id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, versi TEXT, diterapkan_pada TEXT NOT NULL DEFAULT (datetime('now')))`);
}

function sudahDiterapkan(db) {
  pastikanTabel(db);
  const st = db.prepare('SELECT id, sha256 FROM _migrasi ORDER BY id');
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}

/**
 * Periksa daftar migrasi terhadap database (tanpa menulis).
 * izinkanLebihBaru: dipakai saat start — database boleh berisi migrasi dari versi lebih baru.
 * @returns {{tertunda: Array, galat: string[]}}
 */
function rencanaMigrasi(db, daftar, { izinkanLebihBaru = false } = {}) {
  const galat = [];
  const lama = new Map(sudahDiterapkan(db).map((r) => [r.id, r.sha256]));
  const ids = new Set(daftar.map((m) => m.id));
  for (const [id, sh] of lama) {
    const m = daftar.find((x) => x.id === id);
    // Kode versi lama (setelah "Kembalikan versi") boleh berjalan di database yang sudah
    // punya migrasi versi baru: migrasi hanya menambah, jadi kode lama tetap kompatibel.
    if (!m && izinkanLebihBaru) continue;
    if (!m) galat.push(`Migrasi ${id} sudah diterapkan tetapi tidak ada di paket.`);
    else if (m.sha256 !== sh) galat.push(`Migrasi ${id} sudah diterapkan dan isinya tidak boleh diubah.`);
  }
  for (const m of daftar) {
    const cek = periksaMigrasiAman(m.sql);
    if (!cek.aman) galat.push(`Migrasi ${m.id} mengandung perintah yang dapat mengubah/menghapus data: ${cek.pelanggaran.join(' | ')}`);
  }
  const tertunda = daftar.filter((m) => !lama.has(m.id));
  if (ids.size !== daftar.length) galat.push('Ada nomor migrasi ganda.');
  return { tertunda, galat };
}

/** Terapkan migrasi tertunda dalam satu transaksi. Mengembalikan id yang diterapkan. */
function terapkan(db, tertunda, versi) {
  if (!tertunda.length) return [];
  db.run('BEGIN');
  try {
    for (const m of tertunda) {
      db.exec(m.sql);
      db.run('INSERT INTO _migrasi (id, sha256, versi) VALUES (?, ?, ?)', [m.id, m.sha256, versi || null]);
    }
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
  return tertunda.map((m) => m.id);
}

module.exports = { bacaDirMigrasi, rencanaMigrasi, terapkan, sudahDiterapkan, sha256 };
