'use strict';

/**
 * Repository SQLite (aplikasi desktop). Antarmuka identik dengan pgRepo & memoryRepo.
 * `d` = objek dari sistem/db.js (bukaDb).
 */
function buatSqliteRepo(d) {
  const filter = ({ item_id, dari, sampai }) => {
    const w = [];
    const v = [];
    if (item_id) { w.push('item_id = ?'); v.push(Number(item_id)); }
    if (dari) { w.push('tanggal >= ?'); v.push(dari); }
    if (sampai) { w.push('tanggal <= ?'); v.push(sampai); }
    return { where: w.length ? `WHERE ${w.join(' AND ')}` : '', v };
  };
  const bool = (r) => (r ? { ...r, memenuhi_spesifikasi: Boolean(r.memenuhi_spesifikasi) } : r);

  return {
    jenis: 'sqlite',
    async listItems() {
      return d.semua(
        `SELECT i.*, u.nama AS unit_nama FROM m_item i JOIN m_unit_produksi u ON u.id = i.unit_id WHERE i.aktif = 1 ORDER BY i.id`,
      );
    },
    async getItem(id) {
      return d.satu(`SELECT i.*, u.nama AS unit_nama FROM m_item i JOIN m_unit_produksi u ON u.id = i.unit_id WHERE i.id = ?`, [Number(id)]);
    },
    async listProduksi(f = {}) {
      const { where, v } = filter(f);
      return d.semua(`SELECT * FROM t_produksi_harian ${where} ORDER BY tanggal, item_id, shift`, v);
    },
    async listBiaya(f = {}) {
      const { where, v } = filter(f);
      return d.semua(`SELECT * FROM t_biaya_aktual ${where} ORDER BY tanggal, item_id, id`, v);
    },
    async listBenchmark({ item_id } = {}) {
      const { where, v } = filter({ item_id });
      return d.semua(`SELECT * FROM t_benchmark_beli_jadi ${where} ORDER BY item_id, berlaku_mulai, id`, v).map(bool);
    },
    async getParameter() {
      const p = {};
      for (const r of d.semua('SELECT kunci, nilai FROM m_parameter_evaluasi')) {
        p[r.kunci] = Number.isNaN(Number(r.nilai)) ? r.nilai : Number(r.nilai);
      }
      return p;
    },
    async simpanProduksi(row) {
      const shift = row.shift || 1;
      return d.transaksi(() => {
        const lama = d.satu('SELECT id FROM t_produksi_harian WHERE item_id = ? AND tanggal = ? AND shift = ?', [row.item_id, row.tanggal, shift]);
        const nilai = [row.volume, row.jam_kerja ?? null, row.ritase ?? null, row.bbm_liter ?? null, row.cuaca ?? null, row.catatan ?? null];
        if (lama) {
          d.jalankan(
            `UPDATE t_produksi_harian SET volume=?, jam_kerja=?, ritase=?, bbm_liter=?, cuaca=?, catatan=?, diubah_pada=datetime('now') WHERE id=?`,
            [...nilai, lama.id],
          );
          return { ...d.satu('SELECT * FROM t_produksi_harian WHERE id = ?', [lama.id]), dibuat: false };
        }
        const { idTerakhir } = d.jalankan(
          `INSERT INTO t_produksi_harian (item_id, tanggal, shift, volume, jam_kerja, ritase, bbm_liter, cuaca, catatan) VALUES (?,?,?,?,?,?,?,?,?)`,
          [row.item_id, row.tanggal, shift, ...nilai],
        );
        return { ...d.satu('SELECT * FROM t_produksi_harian WHERE id = ?', [idTerakhir]), dibuat: true };
      });
    },
    async simpanBiaya(rows) {
      return d.transaksi(() =>
        rows.map((r) => {
          const { idTerakhir } = d.jalankan(
            `INSERT INTO t_biaya_aktual (item_id, tanggal, kategori, sumber_daya_kode, qty, harga_satuan, jumlah, no_dokumen, keterangan) VALUES (?,?,?,?,?,?,?,?,?)`,
            [r.item_id, r.tanggal, r.kategori, r.sumber_daya_kode ?? null, r.qty ?? null, r.harga_satuan ?? null, r.jumlah, r.no_dokumen ?? null, r.keterangan ?? null],
          );
          return d.satu('SELECT * FROM t_biaya_aktual WHERE id = ?', [idTerakhir]);
        }),
      );
    },
    async simpanBenchmark(row) {
      return d.transaksi(() => {
        const { idTerakhir } = d.jalankan(
          `INSERT INTO t_benchmark_beli_jadi (item_id, vendor, no_penawaran, harga_satuan, biaya_angkut_per_satuan, berlaku_mulai, berlaku_sampai, memenuhi_spesifikasi, sumber, keterangan) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [row.item_id, row.vendor, row.no_penawaran ?? null, row.harga_satuan, row.biaya_angkut_per_satuan ?? 0, row.berlaku_mulai,
            row.berlaku_sampai ?? null, row.memenuhi_spesifikasi === false ? 0 : 1, row.sumber ?? 'SPH', row.keterangan ?? null],
        );
        return bool(d.satu('SELECT * FROM t_benchmark_beli_jadi WHERE id = ?', [idTerakhir]));
      });
    },
    /** Ubah masa berlaku / status lolos spesifikasi satu harga Beli Jadi (atas tindakan pengguna). */
    async ubahBenchmark(id, { berlaku_sampai, memenuhi_spesifikasi }) {
      return d.transaksi(() => {
        const lama = d.satu('SELECT * FROM t_benchmark_beli_jadi WHERE id = ?', [Number(id)]);
        if (!lama) return null;
        d.jalankan('UPDATE t_benchmark_beli_jadi SET berlaku_sampai = ?, memenuhi_spesifikasi = ? WHERE id = ?', [
          berlaku_sampai === undefined ? lama.berlaku_sampai : berlaku_sampai,
          memenuhi_spesifikasi === undefined ? lama.memenuhi_spesifikasi : memenuhi_spesifikasi ? 1 : 0,
          Number(id),
        ]);
        return bool(d.satu('SELECT * FROM t_benchmark_beli_jadi WHERE id = ?', [Number(id)]));
      });
    },
  };
}

module.exports = { buatSqliteRepo };
