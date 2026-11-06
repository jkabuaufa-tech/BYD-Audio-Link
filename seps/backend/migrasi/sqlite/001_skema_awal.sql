-- SEPS desktop — skema awal SQLite.
-- ATURAN MIGRASI: hanya boleh MENAMBAH (CREATE ... IF NOT EXISTS, ALTER TABLE ADD COLUMN,
-- INSERT OR IGNORE, DROP/CREATE VIEW). Pemeriksa di src/sistem/sqlAman.js menolak yang lain,
-- sehingga pembaruan tidak pernah mengubah atau menghapus data yang sudah ada.

CREATE TABLE IF NOT EXISTS m_unit_produksi (
  id          INTEGER PRIMARY KEY,
  kode        TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL,
  kapasitas_harian REAL,
  satuan_kapasitas TEXT,
  sheet_acuan TEXT
);

CREATE TABLE IF NOT EXISTS m_item (
  id             INTEGER PRIMARY KEY,
  unit_id        INTEGER NOT NULL REFERENCES m_unit_produksi(id),
  kode           TEXT NOT NULL UNIQUE,
  nama           TEXT NOT NULL,
  satuan         TEXT NOT NULL,
  spesifikasi    TEXT,
  volume_rencana REAL NOT NULL DEFAULT 0,
  hs_ahsp        REAL NOT NULL CHECK (hs_ahsp > 0),
  overhead_pct   REAL NOT NULL DEFAULT 0.03 CHECK (overhead_pct BETWEEN 0 AND 1),
  aktif          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS m_sumber_daya (
  kode          TEXT PRIMARY KEY,
  nama          TEXT NOT NULL,
  kategori      TEXT NOT NULL CHECK (kategori IN ('MATERIAL','ALAT','UPAH','BBM','OVERHEAD_LAIN')),
  sifat         TEXT NOT NULL CHECK (sifat IN ('TETAP','VARIABEL')),
  satuan        TEXT NOT NULL,
  tarif_standar REAL NOT NULL CHECK (tarif_standar >= 0),
  keterangan    TEXT
);

CREATE TABLE IF NOT EXISTS m_koefisien_ahsp (
  id               INTEGER PRIMARY KEY,
  item_id          INTEGER NOT NULL REFERENCES m_item(id),
  sumber_daya_kode TEXT NOT NULL REFERENCES m_sumber_daya(kode),
  koefisien        REAL NOT NULL,
  waste_pct        REAL NOT NULL DEFAULT 0,
  UNIQUE (item_id, sumber_daya_kode)
);

CREATE TABLE IF NOT EXISTS m_parameter_evaluasi (
  kunci      TEXT PRIMARY KEY,
  nilai      TEXT NOT NULL,
  keterangan TEXT
);

CREATE TABLE IF NOT EXISTS t_produksi_harian (
  id          INTEGER PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES m_item(id),
  tanggal     TEXT NOT NULL,
  shift       INTEGER NOT NULL DEFAULT 1 CHECK (shift BETWEEN 1 AND 3),
  volume      REAL NOT NULL CHECK (volume >= 0),
  jam_kerja   REAL CHECK (jam_kerja BETWEEN 0 AND 24),
  ritase      INTEGER CHECK (ritase >= 0),
  bbm_liter   REAL CHECK (bbm_liter >= 0),
  cuaca       TEXT,
  catatan     TEXT,
  dibuat_pada TEXT NOT NULL DEFAULT (datetime('now')),
  diubah_pada TEXT,
  UNIQUE (item_id, tanggal, shift)
);
CREATE INDEX IF NOT EXISTS ix_produksi_item_tgl ON t_produksi_harian (item_id, tanggal);

CREATE TABLE IF NOT EXISTS t_biaya_aktual (
  id               INTEGER PRIMARY KEY,
  item_id          INTEGER NOT NULL REFERENCES m_item(id),
  tanggal          TEXT NOT NULL,
  kategori         TEXT NOT NULL CHECK (kategori IN ('MATERIAL','ALAT','UPAH','BBM','OVERHEAD_LAIN')),
  sumber_daya_kode TEXT,
  qty              REAL,
  harga_satuan     REAL,
  jumlah           REAL NOT NULL CHECK (jumlah >= 0),
  no_dokumen       TEXT,
  keterangan       TEXT,
  dibuat_pada      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_biaya_item_tgl ON t_biaya_aktual (item_id, tanggal);

CREATE TABLE IF NOT EXISTS t_benchmark_beli_jadi (
  id                      INTEGER PRIMARY KEY,
  item_id                 INTEGER NOT NULL REFERENCES m_item(id),
  vendor                  TEXT NOT NULL,
  no_penawaran            TEXT,
  harga_satuan            REAL NOT NULL CHECK (harga_satuan > 0),
  biaya_angkut_per_satuan REAL NOT NULL DEFAULT 0,
  berlaku_mulai           TEXT NOT NULL,
  berlaku_sampai          TEXT,
  memenuhi_spesifikasi    INTEGER NOT NULL DEFAULT 1,
  sumber                  TEXT NOT NULL DEFAULT 'SPH',
  keterangan              TEXT
);
CREATE INDEX IF NOT EXISTS ix_benchmark_item ON t_benchmark_beli_jadi (item_id, berlaku_mulai);
