'use strict';

/**
 * Master data acuan — diambil dari spreadsheet monitoring proyek sebelumnya
 * ("Swakeloal" / DASHBOARD_EVALUASI, Proyek Pengarah Rukoh Lanjutan).
 *
 * hs_ahsp      : Harga Satuan Analisis (target) per satuan.
 *                Khusus Batching Plant dipakai HPP TOTAL K350 (bahan + operasional
 *                = Rp 1.448.977/m3), bukan hanya biaya operasional Rp 356.819/m3,
 *                agar apple-to-apple dengan harga ready-mix Beli Jadi yang sudah
 *                termasuk material.
 * volume_rencana: volume rencana dari sheet DASHBOARD_EVALUASI.
 */
const PROYEK = { id: 1, kode: 'PRJ-RUKOH-2026', nama: 'Pengarah Rukoh Lanjutan', mulai: '2026-03-01', selesai: '2026-12-31' };

const UNIT_PRODUKSI = [
  { id: 1, kode: 'BP', nama: 'Batching Plant', sheet_acuan: 'Batching Plant' },
  { id: 2, kode: 'SC', nama: 'Stone Crusher', sheet_acuan: 'STONE CRUSHER' },
  { id: 3, kode: 'AGR', nama: 'Agregat Blending', sheet_acuan: 'AGREGATE' },
  { id: 4, kode: 'AMP', nama: 'Asphalt Mixing Plant', sheet_acuan: 'AMP' },
  { id: 5, kode: 'ANG', nama: 'Angkutan Material', sheet_acuan: 'UPAH ANGKUT' },
  { id: 6, kode: 'SRT', nama: 'Quarry Sirtu', sheet_acuan: 'SIRTU' },
  { id: 7, kode: 'BTG', nama: 'Quarry Batu Gelondong', sheet_acuan: 'BATU GEL' },
  { id: 8, kode: 'HPD', nama: 'Hampar & Padat', sheet_acuan: 'HAMPAR PADAT' },
  { id: 9, kode: 'GAL', nama: 'Galian', sheet_acuan: 'GALIAN' },
];

const ITEMS = [
  { id: 1, unit_id: 1, kode: 'BP-K350', nama: 'Beton Ready Mix K350', satuan: 'm3', volume_rencana: 26762, hs_ahsp: 1448977.09, overhead_pct: 0.03 },
  { id: 2, unit_id: 2, kode: 'SC-SPLIT', nama: 'Batu Pecah 1-2 & 2-3', satuan: 'm3', volume_rencana: 3367, hs_ahsp: 90760, overhead_pct: 0.03 },
  { id: 3, unit_id: 3, kode: 'AGR-BC', nama: 'Agregat Base Course', satuan: 'm3', volume_rencana: 7200, hs_ahsp: 74910, overhead_pct: 0.03 },
  { id: 4, unit_id: 4, kode: 'AMP-HM', nama: 'Aspal Hotmix', satuan: 'Ton', volume_rencana: 872, hs_ahsp: 1261904, overhead_pct: 0.03 },
  { id: 5, unit_id: 5, kode: 'ANG-DT', nama: 'Angkutan Dump Truck', satuan: 'm3.km', volume_rencana: 50000, hs_ahsp: 16057, overhead_pct: 0.03 },
  { id: 6, unit_id: 6, kode: 'SRT-01', nama: 'Penggalian & Pemuatan Sirtu', satuan: 'm3', volume_rencana: 8000, hs_ahsp: 79048, overhead_pct: 0.03 },
  { id: 7, unit_id: 7, kode: 'BTG-01', nama: 'Batu Gelondong', satuan: 'm3', volume_rencana: 6000, hs_ahsp: 87405, overhead_pct: 0.03 },
  { id: 8, unit_id: 8, kode: 'HPD-01', nama: 'Hampar Padat', satuan: 'm3', volume_rencana: 7000, hs_ahsp: 38027, overhead_pct: 0.03 },
  { id: 9, unit_id: 9, kode: 'GAL-01', nama: 'Galian Excavator', satuan: 'm3', volume_rencana: 42860, hs_ahsp: 15548.89, overhead_pct: 0.03 },
];

/** Master sumber daya (sheet App_Architecture_Schema). Harga BBM diseragamkan di sini. */
const SUMBER_DAYA = [
  { kode: 'MAT-01', nama: 'Pasir Cor', kategori: 'MATERIAL', satuan: 'm3', tarif: 132000 },
  { kode: 'MAT-02', nama: 'Batu Split 1-2', kategori: 'MATERIAL', satuan: 'm3', tarif: 330000 },
  { kode: 'MAT-03', nama: 'Batu Split 2-3', kategori: 'MATERIAL', satuan: 'm3', tarif: 330000 },
  { kode: 'MAT-04', nama: 'Semen Portland (PC)', kategori: 'MATERIAL', satuan: 'kg', tarif: 1575 },
  { kode: 'MAT-05', nama: 'Sirtu Material', kategori: 'MATERIAL', satuan: 'm3', tarif: 40000 },
  { kode: 'EBM-01', nama: 'Solar Industri (BBM)', kategori: 'BBM', satuan: 'ltr', tarif: 18000 },
  { kode: 'ALT-01', nama: 'Sewa Excavator', kategori: 'ALAT', satuan: 'jam', tarif: 210000 },
  { kode: 'ALT-02', nama: 'Sewa Wheel Loader', kategori: 'ALAT', satuan: 'jam', tarif: 200000 },
  { kode: 'ALT-03', nama: 'Sewa Truck Mixer', kategori: 'ALAT', satuan: 'jam', tarif: 350000 },
  { kode: 'ALT-04', nama: 'Sewa Batching Plant', kategori: 'ALAT', satuan: 'jam', tarif: 600000 },
  { kode: 'ALT-05', nama: 'Sewa Dump Truck', kategori: 'ALAT', satuan: 'jam', tarif: 95568 },
  { kode: 'UPH-01', nama: 'Upah Operator', kategori: 'UPAH', satuan: 'hari', tarif: 300000 },
  { kode: 'UPH-02', nama: 'Upah Mekanik', kategori: 'UPAH', satuan: 'hari', tarif: 240000 },
  { kode: 'OPS-01', nama: 'Listrik PLN BP', kategori: 'OVERHEAD_LAIN', satuan: 'hari', tarif: 1250000 },
];

/**
 * CONTOH harga Beli Jadi (fiktif, untuk demo). WAJIB diganti dengan SPH vendor riil
 * yang memenuhi spesifikasi, harga franco lokasi, excl. PPN.
 */
const BENCHMARK_CONTOH = [
  { item_id: 1, vendor: 'Vendor Ready Mix A (contoh)', harga_satuan: 1470000, biaya_angkut_per_satuan: 0 },
  { item_id: 1, vendor: 'Vendor Ready Mix B (contoh)', harga_satuan: 1515000, biaya_angkut_per_satuan: 0 },
  { item_id: 2, vendor: 'Supplier Split A (contoh)', harga_satuan: 88000, biaya_angkut_per_satuan: 9000 },
  { item_id: 3, vendor: 'Supplier Agregat A (contoh)', harga_satuan: 82000, biaya_angkut_per_satuan: 9000 },
  { item_id: 4, vendor: 'AMP Pihak Ketiga A (contoh)', harga_satuan: 1225000, biaya_angkut_per_satuan: 35000 },
  { item_id: 5, vendor: 'Rental Dump Truck A (contoh)', harga_satuan: 18200, biaya_angkut_per_satuan: 0 },
  { item_id: 6, vendor: 'Quarry Sirtu A (contoh)', harga_satuan: 76000, biaya_angkut_per_satuan: 8000 },
  { item_id: 7, vendor: 'Quarry Batu A (contoh)', harga_satuan: 82000, biaya_angkut_per_satuan: 9500 },
  { item_id: 8, vendor: 'Subkon Hampar Padat A (contoh)', harga_satuan: 44500, biaya_angkut_per_satuan: 0 },
  { item_id: 9, vendor: 'Subkon Galian A (contoh)', harga_satuan: 17800, biaya_angkut_per_satuan: 0 },
].map((b, i) => ({ id: i + 1, berlaku_mulai: '2026-07-01', berlaku_sampai: null, memenuhi_spesifikasi: true, sumber: 'SPH', ...b }));

const PARAMETER_EVALUASI = {
  periode_berturut: 3,
  ambang_waspada_pct: 2,
  granularitas: 'mingguan',
  metode_benchmark: 'TERENDAH',
};

module.exports = { PROYEK, UNIT_PRODUKSI, ITEMS, SUMBER_DAYA, BENCHMARK_CONTOH, PARAMETER_EVALUASI };
