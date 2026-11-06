'use strict';

/**
 * Database SQLite berkas tunggal (sql.js / WebAssembly — tanpa modul native,
 * sehingga installer Windows tidak perlu kompilator).
 * Setiap penulisan disimpan atomik: tulis ke .tmp lalu rename, sehingga berkas
 * database tidak pernah setengah tertulis bila komputer mati mendadak.
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let SQL = null;
async function sqlJs() {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

async function bukaDb(berkas) {
  const S = await sqlJs();
  const ada = berkas && fs.existsSync(berkas);
  const db = ada ? new S.Database(fs.readFileSync(berkas)) : new S.Database();
  db.run('PRAGMA foreign_keys = ON');

  const api = {
    db,
    berkas,
    baru: !ada,
    /** SELECT → array objek. */
    semua(sql, params = []) {
      const st = db.prepare(sql);
      try {
        st.bind(params);
        const rows = [];
        while (st.step()) rows.push(st.getAsObject());
        return rows;
      } finally {
        st.free();
      }
    },
    satu(sql, params = []) {
      return api.semua(sql, params)[0] || null;
    },
    jalankan(sql, params = []) {
      db.run(sql, params);
      return { perubahan: db.getRowsModified(), idTerakhir: api.satu('SELECT last_insert_rowid() AS id').id };
    },
    /** Jalankan fn dalam transaksi; gagal → rollback; berhasil → simpan ke disk. */
    transaksi(fn) {
      db.run('BEGIN');
      try {
        const h = fn();
        db.run('COMMIT');
        api.simpan();
        return h;
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    },
    simpan() {
      if (!berkas) return;
      fs.mkdirSync(path.dirname(berkas), { recursive: true });
      const tmp = `${berkas}.tmp`;
      const fd = fs.openSync(tmp, 'w');
      try {
        fs.writeSync(fd, Buffer.from(db.export()));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, berkas);
    },
    /** Salinan di memori (untuk uji coba migrasi tanpa menyentuh berkas asli). */
    async salinanMemori() {
      const D = await sqlJs();
      const c = new D.Database(db.export());
      return c;
    },
    tutup() {
      db.close();
    },
  };
  return api;
}

module.exports = { bukaDb, sqlJs };
