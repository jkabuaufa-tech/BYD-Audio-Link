-- =====================================================================
-- SEPS — Sistem Evaluasi & Produksi Swakelola
-- Skema PostgreSQL 14+
-- Konvensi: m_* = master, t_* = transaksi, v_* = view laporan.
-- Nilai uang NUMERIC(18,2) Rupiah, EXCLUDE PPN (PPN masukan dapat dikreditkan).
-- =====================================================================

BEGIN;

CREATE TYPE kategori_biaya AS ENUM ('MATERIAL', 'ALAT', 'UPAH', 'BBM', 'OVERHEAD_LAIN');
CREATE TYPE sifat_biaya    AS ENUM ('TETAP', 'VARIABEL');
CREATE TYPE status_keputusan AS ENUM ('DATA_KURANG', 'AMAN', 'WASPADA', 'ALERT_BELI_JADI');
CREATE TYPE status_approval AS ENUM ('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- ---------------------------------------------------------------------
-- MASTER
-- ---------------------------------------------------------------------
CREATE TABLE m_proyek (
  id            SERIAL PRIMARY KEY,
  kode          VARCHAR(30)  NOT NULL UNIQUE,          -- PRJ-RUKOH-2026
  nama          VARCHAR(200) NOT NULL,
  lokasi        VARCHAR(200),
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  aktif         BOOLEAN NOT NULL DEFAULT TRUE
);

-- Unit produksi / sumber swakelola: Batching Plant, Stone Crusher, AMP, Galian, ...
CREATE TABLE m_unit_produksi (
  id          SERIAL PRIMARY KEY,
  proyek_id   INT NOT NULL REFERENCES m_proyek(id),
  kode        VARCHAR(20) NOT NULL,
  nama        VARCHAR(120) NOT NULL,
  kapasitas_harian NUMERIC(14,3),                     -- kapasitas desain per hari
  satuan_kapasitas VARCHAR(20),
  sheet_acuan VARCHAR(60),                            -- nama sheet di spreadsheet lama
  UNIQUE (proyek_id, kode)
);

-- Item output yang dievaluasi (Master Item). hs_ahsp = target Harga Satuan Analisa.
CREATE TABLE m_item (
  id             SERIAL PRIMARY KEY,
  unit_id        INT NOT NULL REFERENCES m_unit_produksi(id),
  kode           VARCHAR(30) NOT NULL UNIQUE,
  nama           VARCHAR(200) NOT NULL,
  satuan         VARCHAR(20) NOT NULL,                 -- m3, Ton, m3.km
  spesifikasi    TEXT,                                 -- mutu / gradasi / JMF acuan
  volume_rencana NUMERIC(14,3) NOT NULL DEFAULT 0,
  hs_ahsp        NUMERIC(18,2) NOT NULL CHECK (hs_ahsp > 0),
  overhead_pct   NUMERIC(6,4)  NOT NULL DEFAULT 0.05 CHECK (overhead_pct BETWEEN 0 AND 1),
  aktif          BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON COLUMN m_item.overhead_pct IS 'Biaya tidak langsung swakelola (site overhead, pengawasan, penyusutan, risiko) ditambahkan saat dibandingkan dengan harga Beli Jadi';

-- Sumber daya (material, alat, upah, BBM, utilitas) = single source of truth tarif.
CREATE TABLE m_sumber_daya (
  kode       VARCHAR(20) PRIMARY KEY,                  -- MAT-01, ALT-01, UPH-01
  nama       VARCHAR(150) NOT NULL,
  kategori   kategori_biaya NOT NULL,
  sifat      sifat_biaya NOT NULL,
  satuan     VARCHAR(20) NOT NULL,
  tarif_standar NUMERIC(18,2) NOT NULL CHECK (tarif_standar >= 0),
  berlaku_mulai DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT
);

-- Koefisien analisa (AHSP / JMF) per item → dasar hs_ahsp & kontrol pemakaian.
CREATE TABLE m_koefisien_ahsp (
  id               SERIAL PRIMARY KEY,
  item_id          INT NOT NULL REFERENCES m_item(id) ON DELETE CASCADE,
  sumber_daya_kode VARCHAR(20) NOT NULL REFERENCES m_sumber_daya(kode),
  koefisien        NUMERIC(14,6) NOT NULL,             -- per 1 satuan item
  waste_pct        NUMERIC(6,4) NOT NULL DEFAULT 0,
  UNIQUE (item_id, sumber_daya_kode)
);

-- Parameter Decision Engine (key-value agar bisa diubah tanpa deploy).
CREATE TABLE m_parameter_evaluasi (
  kunci      VARCHAR(50) PRIMARY KEY,
  nilai      VARCHAR(50) NOT NULL,
  keterangan TEXT
);

-- ---------------------------------------------------------------------
-- TRANSAKSI
-- ---------------------------------------------------------------------
-- Input Produksi Harian (per item per shift).
CREATE TABLE t_produksi_harian (
  id          BIGSERIAL PRIMARY KEY,
  item_id     INT  NOT NULL REFERENCES m_item(id),
  tanggal     DATE NOT NULL,
  shift       SMALLINT NOT NULL DEFAULT 1 CHECK (shift BETWEEN 1 AND 3),
  volume      NUMERIC(14,3) NOT NULL CHECK (volume >= 0),
  jam_kerja   NUMERIC(5,2) CHECK (jam_kerja BETWEEN 0 AND 24),
  ritase      INT CHECK (ritase >= 0),
  bbm_liter   NUMERIC(12,2) CHECK (bbm_liter >= 0),
  cuaca       VARCHAR(20),                             -- CERAH / HUJAN / ...
  catatan     TEXT,
  status      status_approval NOT NULL DEFAULT 'DRAFT',
  dibuat_oleh VARCHAR(80),
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  diubah_pada TIMESTAMPTZ,
  UNIQUE (item_id, tanggal, shift)
);
CREATE INDEX ix_produksi_item_tgl ON t_produksi_harian (item_id, tanggal);

-- Biaya Aktual (Material, Alat, Upah, BBM, Overhead lain) — dari BPB, timesheet alat,
-- daftar upah, kupon BBM, tagihan vendor.
CREATE TABLE t_biaya_aktual (
  id               BIGSERIAL PRIMARY KEY,
  item_id          INT  NOT NULL REFERENCES m_item(id),
  tanggal          DATE NOT NULL,
  kategori         kategori_biaya NOT NULL,
  sumber_daya_kode VARCHAR(20) REFERENCES m_sumber_daya(kode),
  qty              NUMERIC(14,3),
  harga_satuan     NUMERIC(18,2),
  jumlah           NUMERIC(18,2) NOT NULL CHECK (jumlah >= 0),
  no_dokumen       VARCHAR(60),                        -- No. BPB / Timesheet / Kupon BBM
  keterangan       TEXT,
  dibuat_pada      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (qty IS NULL OR harga_satuan IS NULL OR abs(jumlah - qty * harga_satuan) < 1)
);
CREATE INDEX ix_biaya_item_tgl ON t_biaya_aktual (item_id, tanggal);

-- Benchmark Harga "Beli Jadi" (SPH vendor / kontrak pembanding / harga pasar).
CREATE TABLE t_benchmark_beli_jadi (
  id                      SERIAL PRIMARY KEY,
  item_id                 INT NOT NULL REFERENCES m_item(id),
  vendor                  VARCHAR(150) NOT NULL,
  no_penawaran            VARCHAR(60),
  harga_satuan            NUMERIC(18,2) NOT NULL CHECK (harga_satuan > 0),  -- excl. PPN
  biaya_angkut_per_satuan NUMERIC(18,2) NOT NULL DEFAULT 0,                 -- bila tidak franco lokasi
  berlaku_mulai           DATE NOT NULL,
  berlaku_sampai          DATE,
  memenuhi_spesifikasi    BOOLEAN NOT NULL DEFAULT TRUE,                    -- hasil klarifikasi teknis
  sumber                  VARCHAR(30) NOT NULL DEFAULT 'SPH',               -- SPH / KONTRAK / SURVEI
  keterangan              TEXT,
  CHECK (berlaku_sampai IS NULL OR berlaku_sampai >= berlaku_mulai)
);
CREATE INDEX ix_benchmark_item ON t_benchmark_beli_jadi (item_id, berlaku_mulai);

-- Log hasil Decision Engine (snapshot per tutup periode) + tindak lanjut manajemen.
CREATE TABLE t_rekomendasi (
  id             BIGSERIAL PRIMARY KEY,
  item_id        INT NOT NULL REFERENCES m_item(id),
  granularitas   VARCHAR(10) NOT NULL,
  periode        VARCHAR(10) NOT NULL,                 -- 2026-W44 / 2026-10
  status         status_keputusan NOT NULL,
  hs_aktual      NUMERIC(18,2),
  hs_efektif     NUMERIC(18,2),
  hs_beli_jadi   NUMERIC(18,2),
  efisiensi_pct  NUMERIC(8,3),
  streak         SMALLINT,
  payload        JSONB NOT NULL,                       -- output lengkap evaluasi()
  keputusan_manajemen VARCHAR(30),                     -- LANJUT_SWAKELOLA / BELI_JADI / HYBRID
  catatan_manajemen   TEXT,
  dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, granularitas, periode)
);

-- ---------------------------------------------------------------------
-- VIEW LAPORAN (untuk BI / ekspor Excel; API memakai agregasi di aplikasi)
-- ---------------------------------------------------------------------
CREATE VIEW v_harian AS
WITH p AS (
  SELECT item_id, tanggal, SUM(volume) AS volume, SUM(jam_kerja) AS jam_kerja
    FROM t_produksi_harian GROUP BY item_id, tanggal
), b AS (
  SELECT item_id, tanggal,
         SUM(jumlah) FILTER (WHERE kategori = 'MATERIAL')      AS material,
         SUM(jumlah) FILTER (WHERE kategori = 'ALAT')          AS alat,
         SUM(jumlah) FILTER (WHERE kategori = 'UPAH')          AS upah,
         SUM(jumlah) FILTER (WHERE kategori = 'BBM')           AS bbm,
         SUM(jumlah) FILTER (WHERE kategori = 'OVERHEAD_LAIN') AS overhead_lain,
         SUM(jumlah) AS biaya_total
    FROM t_biaya_aktual GROUP BY item_id, tanggal
)
SELECT COALESCE(p.item_id, b.item_id) AS item_id,
       COALESCE(p.tanggal, b.tanggal) AS tanggal,
       COALESCE(p.volume, 0)          AS volume,
       p.jam_kerja,
       COALESCE(b.material, 0) AS material, COALESCE(b.alat, 0) AS alat, COALESCE(b.upah, 0) AS upah,
       COALESCE(b.bbm, 0) AS bbm, COALESCE(b.overhead_lain, 0) AS overhead_lain,
       COALESCE(b.biaya_total, 0) AS biaya_total
  FROM p FULL OUTER JOIN b ON b.item_id = p.item_id AND b.tanggal = p.tanggal;

-- Harga Beli Jadi landed terendah yang berlaku pada suatu tanggal.
CREATE FUNCTION f_harga_beli_jadi(p_item INT, p_mulai DATE, p_selesai DATE)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT MIN(harga_satuan + biaya_angkut_per_satuan)
    FROM t_benchmark_beli_jadi
   WHERE item_id = p_item AND memenuhi_spesifikasi
     AND berlaku_mulai <= p_selesai
     AND (berlaku_sampai IS NULL OR berlaku_sampai >= p_mulai)
$$;

CREATE VIEW v_evaluasi_mingguan AS
SELECT h.item_id,
       to_char(date_trunc('week', h.tanggal), 'IYYY-"W"IW') AS periode,
       date_trunc('week', h.tanggal)::date                   AS mulai,
       (date_trunc('week', h.tanggal) + INTERVAL '6 day')::date AS selesai,
       SUM(h.volume)      AS volume,
       SUM(h.biaya_total) AS biaya_total,
       SUM(h.biaya_total) / NULLIF(SUM(h.volume), 0) AS hs_aktual,
       i.hs_ahsp,
       SUM(h.biaya_total) / NULLIF(SUM(h.volume), 0) * (1 + i.overhead_pct) AS hs_efektif,
       f_harga_beli_jadi(h.item_id, date_trunc('week', h.tanggal)::date,
                         (date_trunc('week', h.tanggal) + INTERVAL '6 day')::date) AS hs_beli_jadi,
       ROUND(100 * (i.hs_ahsp * SUM(h.volume) - SUM(h.biaya_total)) / NULLIF(i.hs_ahsp * SUM(h.volume), 0), 2) AS efisiensi_pct,
       i.hs_ahsp * SUM(h.volume) - SUM(h.biaya_total) AS cost_saving_vs_ahsp
  FROM v_harian h JOIN m_item i ON i.id = h.item_id
 GROUP BY h.item_id, date_trunc('week', h.tanggal), i.hs_ahsp, i.overhead_pct;

CREATE VIEW v_evaluasi_bulanan AS
SELECT h.item_id,
       to_char(date_trunc('month', h.tanggal), 'YYYY-MM') AS periode,
       SUM(h.volume)      AS volume,
       SUM(h.biaya_total) AS biaya_swakelola,
       SUM(h.biaya_total) * (1 + i.overhead_pct) AS biaya_swakelola_dengan_overhead,
       SUM(h.volume) * f_harga_beli_jadi(h.item_id, date_trunc('month', h.tanggal)::date,
                         (date_trunc('month', h.tanggal) + INTERVAL '1 month - 1 day')::date) AS biaya_jika_beli_jadi,
       i.hs_ahsp * SUM(h.volume) AS biaya_ahsp
  FROM v_harian h JOIN m_item i ON i.id = h.item_id
 GROUP BY h.item_id, date_trunc('month', h.tanggal), i.hs_ahsp, i.overhead_pct;

COMMIT;
