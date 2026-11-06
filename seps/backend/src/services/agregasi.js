'use strict';

const { periodeDari } = require('./periode');

/** Kategori biaya aktual & sifatnya untuk analisis titik impas (BEP). */
const KATEGORI_BIAYA = ['MATERIAL', 'ALAT', 'UPAH', 'BBM', 'OVERHEAD_LAIN'];
const SIFAT_BIAYA_DEFAULT = {
  MATERIAL: 'VARIABEL', // habis per volume (JMF / koefisien AHSP)
  BBM: 'VARIABEL', // sebanding jam kerja efektif
  ALAT: 'TETAP', // sewa bulanan / jam minimum tetap jalan walau produksi turun
  UPAH: 'TETAP', // gaji operator, mekanik, surveyor
  OVERHEAD_LAIN: 'TETAP', // PLN, mess, perizinan quarry, dll.
};

const bulat = (n, d = 2) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Harga pembanding "Beli Jadi" yang berlaku pada suatu periode.
 * Harga landed = harga satuan vendor + biaya angkut ke lokasi (excl. PPN, karena
 * PPN masukan dapat dikreditkan sehingga netral terhadap perbandingan).
 */
function hargaBeliJadi(benchmarks, mulai, selesai, metode = 'TERENDAH') {
  const berlaku = (benchmarks || []).filter(
    (b) =>
      b.memenuhi_spesifikasi !== false &&
      b.berlaku_mulai <= selesai &&
      (!b.berlaku_sampai || b.berlaku_sampai >= mulai),
  );
  if (!berlaku.length) return null;
  const landed = berlaku.map((b) => Number(b.harga_satuan) + Number(b.biaya_angkut_per_satuan || 0));
  if (metode === 'RATA_RATA') return landed.reduce((a, b) => a + b, 0) / landed.length;
  return Math.min(...landed);
}

function biayaKosong() {
  return Object.fromEntries(KATEGORI_BIAYA.map((k) => [k.toLowerCase(), 0]));
}

/**
 * Agregasi produksi & biaya satu item ke periode harian / mingguan / bulanan.
 *
 * @param {object} p
 * @param {object} p.item         baris m_item (hs_ahsp, overhead_pct, ...)
 * @param {Array}  p.produksi     baris t_produksi_harian milik item
 * @param {Array}  p.biaya        baris t_biaya_aktual milik item
 * @param {Array}  p.benchmarks   baris t_benchmark_beli_jadi milik item
 * @param {string} p.granularitas harian | mingguan | bulanan
 * @param {object} [p.parameter]  { overhead_pct, metode_benchmark }
 */
function agregasi({ item, produksi, biaya, benchmarks, granularitas, parameter = {} }) {
  const overhead = Number(parameter.overhead_pct ?? item.overhead_pct ?? 0);
  const metode = parameter.metode_benchmark || 'TERENDAH';
  const hsAhsp = Number(item.hs_ahsp);
  const peta = new Map();

  const ambil = (tanggal) => {
    const per = periodeDari(tanggal, granularitas);
    if (!peta.has(per.kunci)) {
      peta.set(per.kunci, { ...per, volume: 0, jam_kerja: 0, hari_kerja: new Set(), biaya: biayaKosong() });
    }
    return peta.get(per.kunci);
  };

  for (const r of produksi || []) {
    const b = ambil(r.tanggal);
    b.volume += Number(r.volume) || 0;
    b.jam_kerja += Number(r.jam_kerja) || 0;
    if (Number(r.volume) > 0) b.hari_kerja.add(String(r.tanggal).slice(0, 10));
  }
  for (const r of biaya || []) {
    const b = ambil(r.tanggal);
    const k = String(r.kategori).toLowerCase();
    if (!(k in b.biaya)) throw new Error(`Kategori biaya tidak dikenal: ${r.kategori}`);
    b.biaya[k] += Number(r.jumlah) || 0;
  }

  const hasil = [...peta.values()].sort((a, b) => (a.kunci < b.kunci ? -1 : 1));
  const kum = { volume: 0, biaya_swakelola: 0, biaya_swakelola_oh: 0, biaya_ahsp: 0, biaya_beli_jadi: 0, volume_dengan_benchmark: 0, biaya_oh_dengan_benchmark: 0 };

  return hasil.map((b) => {
    const total = Object.values(b.biaya).reduce((a, c) => a + c, 0);
    const totalOh = total * (1 + overhead);
    const hsAktual = b.volume > 0 ? total / b.volume : null;
    const hsEfektif = hsAktual == null ? null : hsAktual * (1 + overhead);
    const bj = hargaBeliJadi(benchmarks, b.mulai, b.selesai, metode);

    const biayaAhsp = hsAhsp * b.volume;
    const biayaBeliJadi = bj == null ? null : bj * b.volume;
    // Efisiensi terhadap target AHSP; volume 0 + biaya > 0 = overrun 100% (alat idle).
    const efisiensi = biayaAhsp > 0 ? (biayaAhsp - total) / biayaAhsp : total > 0 ? -1 : null;

    kum.volume += b.volume;
    kum.biaya_swakelola += total;
    kum.biaya_swakelola_oh += totalOh;
    kum.biaya_ahsp += biayaAhsp;
    if (biayaBeliJadi != null) {
      kum.biaya_beli_jadi += biayaBeliJadi;
      kum.volume_dengan_benchmark += b.volume;
      kum.biaya_oh_dengan_benchmark += totalOh;
    }

    return {
      periode: b.kunci,
      label: b.label,
      mulai: b.mulai,
      selesai: b.selesai,
      volume: bulat(b.volume, 3),
      jam_kerja: bulat(b.jam_kerja, 2),
      hari_kerja: b.hari_kerja.size,
      biaya: Object.fromEntries(Object.entries(b.biaya).map(([k, v]) => [k, bulat(v, 0)])),
      biaya_total: bulat(total, 0),
      biaya_total_dengan_overhead: bulat(totalOh, 0),
      hs_ahsp: bulat(hsAhsp, 2),
      hs_aktual: bulat(hsAktual, 2),
      hs_efektif: bulat(hsEfektif, 2),
      hs_beli_jadi: bulat(bj, 2),
      efisiensi_pct: bulat(efisiensi == null ? null : efisiensi * 100, 2),
      cost_saving_vs_ahsp: bulat(biayaAhsp - total, 0),
      biaya_jika_beli_jadi: bulat(biayaBeliJadi, 0),
      // Positif = swakelola lebih hemat dibanding beli jadi.
      selisih_vs_beli_jadi: biayaBeliJadi == null ? null : bulat(biayaBeliJadi - totalOh, 0),
      swakelola_lebih_mahal: bj == null ? null : total > 0 && (b.volume === 0 || hsEfektif > bj),
      kumulatif: {
        volume: bulat(kum.volume, 3),
        biaya_swakelola: bulat(kum.biaya_swakelola, 0),
        biaya_swakelola_dengan_overhead: bulat(kum.biaya_swakelola_oh, 0),
        biaya_ahsp: bulat(kum.biaya_ahsp, 0),
        biaya_beli_jadi: bulat(kum.biaya_beli_jadi, 0),
        efisiensi_pct: bulat(kum.biaya_ahsp > 0 ? ((kum.biaya_ahsp - kum.biaya_swakelola) / kum.biaya_ahsp) * 100 : null, 2),
        cost_saving_vs_ahsp: bulat(kum.biaya_ahsp - kum.biaya_swakelola, 0),
        selisih_vs_beli_jadi: kum.volume_dengan_benchmark > 0 || kum.biaya_beli_jadi > 0
          ? bulat(kum.biaya_beli_jadi - kum.biaya_oh_dengan_benchmark, 0)
          : null,
      },
    };
  });
}

module.exports = { agregasi, hargaBeliJadi, KATEGORI_BIAYA, SIFAT_BIAYA_DEFAULT };
