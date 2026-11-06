'use strict';

/**
 * Pemeriksa migrasi "hanya menambah". Inilah penjamin bahwa paket pembaruan
 * TIDAK PERNAH mengubah atau menghapus data yang sudah ada.
 *
 * Diizinkan:
 *   CREATE TABLE IF NOT EXISTS …            (tabel baru)
 *   CREATE [UNIQUE] INDEX IF NOT EXISTS …    (indeks; tidak mengubah isi)
 *   ALTER TABLE … ADD [COLUMN] …             (kolom baru; baris lama dapat nilai default)
 *   INSERT OR IGNORE INTO …                  (baris baru; baris yang ada tidak ditimpa)
 *   CREATE VIEW IF NOT EXISTS … / DROP VIEW IF EXISTS …   (view tidak menyimpan data)
 * Selain itu (UPDATE, DELETE, DROP TABLE, REPLACE, INSERT biasa, ALTER … DROP/RENAME,
 * PRAGMA, ATTACH, trigger, dll.) DITOLAK.
 */

/** Pisahkan skrip SQL menjadi pernyataan; menghormati 'string', "identifier", dan komentar. */
function pisahPernyataan(sql) {
  const hasil = [];
  let cur = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (c === '-' && n === '-') {
      const akhir = sql.indexOf('\n', i);
      i = akhir === -1 ? sql.length : akhir + 1;
      cur += ' ';
      continue;
    }
    if (c === '/' && n === '*') {
      const akhir = sql.indexOf('*/', i + 2);
      i = akhir === -1 ? sql.length : akhir + 2;
      cur += ' ';
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c && sql[j + 1] === c) { j += 2; continue; }
        if (sql[j] === c) break;
        j++;
      }
      cur += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === ';') {
      if (cur.trim()) hasil.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) hasil.push(cur.trim());
  return hasil;
}

const POLA_IZIN = [
  /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s/i,
  /^CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s/i,
  /^ALTER\s+TABLE\s+[\w"]+\s+ADD\s+(COLUMN\s+)?[\w"]+/i,
  /^INSERT\s+OR\s+IGNORE\s+INTO\s/i,
  /^CREATE\s+VIEW\s+IF\s+NOT\s+EXISTS\s/i,
  /^DROP\s+VIEW\s+IF\s+EXISTS\s+[\w"]+$/i,
];

// Kata berbahaya yang tidak boleh muncul di luar string walaupun pola awalnya cocok
// (mis. "CREATE TABLE IF NOT EXISTS x AS SELECT …" tetap aman, tetapi "ALTER TABLE x ADD …; DROP" sudah dipisah).
const TERLARANG = /\b(DELETE|UPDATE|DROP\s+TABLE|DROP\s+INDEX|TRUNCATE|REPLACE\s+INTO|ATTACH|DETACH|PRAGMA|VACUUM|CREATE\s+TRIGGER|RENAME)\b/i;

function tanpaString(s) {
  return s.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""');
}

/** @returns {{aman: boolean, pelanggaran: string[], pernyataan: string[]}} */
function periksaMigrasiAman(sql) {
  const pernyataan = pisahPernyataan(sql);
  const pelanggaran = [];
  for (const p of pernyataan) {
    const bersih = tanpaString(p).replace(/\s+/g, ' ').trim();
    const cocok = POLA_IZIN.some((r) => r.test(bersih));
    // "INSERT OR IGNORE … ON CONFLICT DO UPDATE" = upsert → mengubah data lama.
    const upsert = /\bON\s+CONFLICT\b/i.test(bersih);
    if (!cocok || upsert || TERLARANG.test(bersih.replace(/^ALTER\s+TABLE\s+[\w"]+\s+ADD\s+(COLUMN\s+)?/i, ''))) {
      pelanggaran.push(bersih.length > 140 ? `${bersih.slice(0, 140)}…` : bersih);
    }
  }
  return { aman: pelanggaran.length === 0, pelanggaran, pernyataan };
}

module.exports = { periksaMigrasiAman, pisahPernyataan };
