'use strict';

/**
 * Repository PostgreSQL. Skema: seps/database/001_schema.sql.
 * NUMERIC dikembalikan driver `pg` sebagai string — dikonversi ke Number di sini
 * (aman: presisi Rupiah s.d. 15 digit masih dalam batas IEEE-754 double).
 */
const { Pool, types } = require('pg');

types.setTypeParser(1700, (v) => (v == null ? null : Number(v))); // NUMERIC
types.setTypeParser(1082, (v) => v); // DATE → 'YYYY-MM-DD' tanpa konversi zona waktu

function buatPgRepo({ connectionString }) {
  const pool = new Pool({ connectionString });

  const filter = ({ item_id, dari, sampai }, kolomTanggal = 'tanggal') => {
    const w = [];
    const v = [];
    if (item_id) { v.push(Number(item_id)); w.push(`item_id = $${v.length}`); }
    if (dari) { v.push(dari); w.push(`${kolomTanggal} >= $${v.length}`); }
    if (sampai) { v.push(sampai); w.push(`${kolomTanggal} <= $${v.length}`); }
    return { where: w.length ? `WHERE ${w.join(' AND ')}` : '', values: v };
  };

  return {
    jenis: 'postgres',
    pool,
    async listItems() {
      const { rows } = await pool.query(
        `SELECT i.*, u.nama AS unit_nama
           FROM m_item i JOIN m_unit_produksi u ON u.id = i.unit_id
          WHERE i.aktif ORDER BY i.id`,
      );
      return rows;
    },
    async getItem(id) {
      const { rows } = await pool.query(
        `SELECT i.*, u.nama AS unit_nama FROM m_item i JOIN m_unit_produksi u ON u.id = i.unit_id WHERE i.id = $1`,
        [Number(id)],
      );
      return rows[0] || null;
    },
    async listProduksi(f = {}) {
      const { where, values } = filter(f);
      const { rows } = await pool.query(`SELECT * FROM t_produksi_harian ${where} ORDER BY tanggal, item_id, shift`, values);
      return rows;
    },
    async listBiaya(f = {}) {
      const { where, values } = filter(f);
      const { rows } = await pool.query(`SELECT * FROM t_biaya_aktual ${where} ORDER BY tanggal, item_id`, values);
      return rows;
    },
    async listBenchmark({ item_id } = {}) {
      const { where, values } = filter({ item_id });
      const { rows } = await pool.query(`SELECT * FROM t_benchmark_beli_jadi ${where} ORDER BY item_id, berlaku_mulai`, values);
      return rows;
    },
    async getParameter() {
      const { rows } = await pool.query(`SELECT kunci, nilai FROM m_parameter_evaluasi`);
      const p = {};
      for (const r of rows) p[r.kunci] = Number.isNaN(Number(r.nilai)) ? r.nilai : Number(r.nilai);
      return p;
    },
    async simpanProduksi(row) {
      const { rows } = await pool.query(
        `INSERT INTO t_produksi_harian
           (item_id, tanggal, shift, volume, jam_kerja, ritase, bbm_liter, cuaca, catatan, dibuat_oleh)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (item_id, tanggal, shift) DO UPDATE SET
           volume = EXCLUDED.volume, jam_kerja = EXCLUDED.jam_kerja, ritase = EXCLUDED.ritase,
           bbm_liter = EXCLUDED.bbm_liter, cuaca = EXCLUDED.cuaca, catatan = EXCLUDED.catatan,
           diubah_pada = now()
         RETURNING *, (xmax = 0) AS dibuat`,
        [row.item_id, row.tanggal, row.shift || 1, row.volume, row.jam_kerja ?? null, row.ritase ?? null,
          row.bbm_liter ?? null, row.cuaca ?? null, row.catatan ?? null, row.dibuat_oleh ?? null],
      );
      return rows[0];
    },
    async simpanBiaya(rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const hasil = [];
        for (const r of rows) {
          const { rows: x } = await client.query(
            `INSERT INTO t_biaya_aktual (item_id, tanggal, kategori, sumber_daya_kode, qty, harga_satuan, jumlah, no_dokumen, keterangan)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [r.item_id, r.tanggal, r.kategori, r.sumber_daya_kode ?? null, r.qty ?? null, r.harga_satuan ?? null,
              r.jumlah, r.no_dokumen ?? null, r.keterangan ?? null],
          );
          hasil.push(x[0]);
        }
        await client.query('COMMIT');
        return hasil;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    async simpanBenchmark(row) {
      const { rows } = await pool.query(
        `INSERT INTO t_benchmark_beli_jadi
           (item_id, vendor, no_penawaran, harga_satuan, biaya_angkut_per_satuan, berlaku_mulai, berlaku_sampai, memenuhi_spesifikasi, sumber, keterangan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [row.item_id, row.vendor, row.no_penawaran ?? null, row.harga_satuan, row.biaya_angkut_per_satuan ?? 0,
          row.berlaku_mulai, row.berlaku_sampai ?? null, row.memenuhi_spesifikasi ?? true, row.sumber ?? 'SPH', row.keterangan ?? null],
      );
      return rows[0];
    },
    async tutup() {
      await pool.end();
    },
  };
}

module.exports = { buatPgRepo };
