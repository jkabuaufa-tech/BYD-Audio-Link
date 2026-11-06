'use strict';

/**
 * Repository in-memory — dipakai bila DATABASE_URL tidak diset (mode demo /
 * pengujian). Antarmukanya identik dengan pgRepo sehingga layanan & rute
 * tidak perlu tahu sumber datanya.
 */
const { PROYEK, UNIT_PRODUKSI, ITEMS, BENCHMARK_CONTOH, PARAMETER_EVALUASI } = require('../data/master');
const { buatDataDemo } = require('../data/demo');

function buatMemoryRepo({ denganDemo = true } = {}) {
  const demo = denganDemo ? buatDataDemo() : { produksi: [], biaya: [] };
  const db = {
    items: ITEMS.map((i) => ({ ...i, unit_nama: UNIT_PRODUKSI.find((u) => u.id === i.unit_id).nama, proyek_id: PROYEK.id })),
    produksi: demo.produksi,
    biaya: demo.biaya,
    benchmark: BENCHMARK_CONTOH.map((b) => ({ ...b })),
    parameter: { ...PARAMETER_EVALUASI },
  };
  let seq = { produksi: db.produksi.length, biaya: db.biaya.length, benchmark: db.benchmark.length };

  const dalamRentang = (r, { item_id, dari, sampai }) =>
    (!item_id || r.item_id === Number(item_id)) && (!dari || r.tanggal >= dari) && (!sampai || r.tanggal <= sampai);

  return {
    jenis: 'memory',
    async listItems() {
      return db.items;
    },
    async getItem(id) {
      return db.items.find((i) => i.id === Number(id)) || null;
    },
    async listProduksi(f = {}) {
      return db.produksi.filter((r) => dalamRentang(r, f));
    },
    async listBiaya(f = {}) {
      return db.biaya.filter((r) => dalamRentang(r, f));
    },
    async listBenchmark({ item_id } = {}) {
      return db.benchmark.filter((b) => !item_id || b.item_id === Number(item_id));
    },
    async getParameter() {
      return db.parameter;
    },
    /** Upsert berdasarkan kunci unik (item_id, tanggal, shift). */
    async simpanProduksi(row) {
      const shift = row.shift || 1;
      const idx = db.produksi.findIndex((r) => r.item_id === row.item_id && r.tanggal === row.tanggal && (r.shift || 1) === shift);
      if (idx >= 0) {
        db.produksi[idx] = { ...db.produksi[idx], ...row, shift };
        return { ...db.produksi[idx], dibuat: false };
      }
      const baru = { id: ++seq.produksi, ...row, shift };
      db.produksi.push(baru);
      return { ...baru, dibuat: true };
    },
    async simpanBiaya(rows) {
      const hasil = rows.map((r) => ({ id: ++seq.biaya, ...r }));
      db.biaya.push(...hasil);
      return hasil;
    },
    async simpanBenchmark(row) {
      const baru = { id: ++seq.benchmark, memenuhi_spesifikasi: true, biaya_angkut_per_satuan: 0, berlaku_sampai: null, ...row };
      db.benchmark.push(baru);
      return baru;
    },
    async ubahBenchmark(id, { berlaku_sampai, memenuhi_spesifikasi }) {
      const b = db.benchmark.find((x) => x.id === Number(id));
      if (!b) return null;
      if (berlaku_sampai !== undefined) b.berlaku_sampai = berlaku_sampai;
      if (memenuhi_spesifikasi !== undefined) b.memenuhi_spesifikasi = Boolean(memenuhi_spesifikasi);
      return b;
    },
  };
}

module.exports = { buatMemoryRepo };
