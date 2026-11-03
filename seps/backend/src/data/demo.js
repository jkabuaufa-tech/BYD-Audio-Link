'use strict';

/**
 * Generator data transaksi DEMO (deterministik) untuk 13 minggu:
 * 3 Agt 2026 – 1 Nov 2026, Senin–Sabtu kerja. Biaya dipecah menjadi
 * komponen tetap (alat, upah, overhead lain — tetap jalan walau hujan/idle)
 * dan variabel (material, BBM — sebanding volume), sehingga hari dengan
 * volume rendah memperlihatkan lonjakan harga satuan, seperti di lapangan.
 */
const { ITEMS } = require('./master');
const { tambahHari, keTanggal } = require('../services/periode');

// fixed = porsi biaya tetap pada volume normal; tren = faktor biaya awal → akhir.
const PROFIL = {
  1: { volHarian: 120, fixed: 0.25, tren: [0.92, 0.95], variabel: { MATERIAL: 0.93, BBM: 0.07 }, tetap: { ALAT: 0.8, UPAH: 0.08, OVERHEAD_LAIN: 0.12 } },
  2: { volHarian: 22, fixed: 0.55, tren: [0.94, 1.0], variabel: { MATERIAL: 0.45, BBM: 0.55 }, tetap: { ALAT: 0.75, UPAH: 0.2, OVERHEAD_LAIN: 0.05 } },
  3: { volHarian: 40, fixed: 0.4, tren: [0.93, 0.94], variabel: { MATERIAL: 0.8, BBM: 0.2 }, tetap: { ALAT: 0.75, UPAH: 0.25, OVERHEAD_LAIN: 0 } },
  4: { volHarian: 6, fixed: 0.45, tren: [0.95, 1.12], variabel: { MATERIAL: 0.85, BBM: 0.15 }, tetap: { ALAT: 0.7, UPAH: 0.15, OVERHEAD_LAIN: 0.15 } },
  5: { volHarian: 260, fixed: 0.3, tren: [0.93, 0.93], variabel: { MATERIAL: 0, BBM: 1 }, tetap: { ALAT: 0.75, UPAH: 0.25, OVERHEAD_LAIN: 0 } },
  6: { volHarian: 40, fixed: 0.35, tren: [0.93, 0.93], variabel: { MATERIAL: 0.3, BBM: 0.7 }, tetap: { ALAT: 0.7, UPAH: 0.3, OVERHEAD_LAIN: 0 } },
  7: { volHarian: 30, fixed: 0.4, tren: [0.99, 1.04], variabel: { MATERIAL: 0.2, BBM: 0.8 }, tetap: { ALAT: 0.7, UPAH: 0.3, OVERHEAD_LAIN: 0 } },
  8: { volHarian: 35, fixed: 0.6, tren: [0.95, 0.95], variabel: { MATERIAL: 0.1, BBM: 0.9 }, tetap: { ALAT: 0.75, UPAH: 0.25, OVERHEAD_LAIN: 0 } },
  9: { volHarian: 210, fixed: 0.75, tren: [0.91, 0.91], variabel: { MATERIAL: 0, BBM: 1 }, tetap: { ALAT: 0.55, UPAH: 0.45, OVERHEAD_LAIN: 0 } },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buatDataDemo({ mulai = '2026-08-03', hari = 91 } = {}) {
  const produksi = [];
  const biaya = [];
  for (const item of ITEMS) {
    const p = PROFIL[item.id];
    const rnd = mulberry32(item.id * 7919);
    const fTetapHarian = p.fixed * item.hs_ahsp * p.volHarian;
    for (let i = 0; i < hari; i++) {
      const tanggal = tambahHari(mulai, i);
      if (keTanggal(tanggal).getUTCDay() === 0) continue; // Minggu libur
      const faktor = p.tren[0] + ((p.tren[1] - p.tren[0]) * i) / (hari - 1);
      const hujan = rnd() < 0.06; // ±6% hari tidak produksi (hujan/breakdown)
      const volume = hujan ? 0 : Math.round(p.volHarian * (0.7 + rnd() * 0.6) * 100) / 100;
      const jam = hujan ? 0 : Math.round((6 + rnd() * 3) * 10) / 10;
      produksi.push({
        tanggal,
        item_id: item.id,
        volume,
        jam_kerja: jam,
        ritase: item.id === 1 ? Math.round(volume / 5) : null,
        bbm_liter: null,
        cuaca: hujan ? 'HUJAN' : 'CERAH',
        catatan: hujan ? 'Tidak produksi (hujan / breakdown) — biaya tetap tetap berjalan' : null,
      });
      const vPerSatuan = (1 - p.fixed) * item.hs_ahsp * faktor;
      for (const [k, porsi] of Object.entries(p.variabel)) {
        if (porsi > 0 && volume > 0) biaya.push({ tanggal, item_id: item.id, kategori: k, jumlah: Math.round(vPerSatuan * volume * porsi) });
      }
      for (const [k, porsi] of Object.entries(p.tetap)) {
        if (porsi > 0) biaya.push({ tanggal, item_id: item.id, kategori: k, jumlah: Math.round(fTetapHarian * faktor * porsi) });
      }
    }
  }
  return {
    produksi: produksi.map((r, i) => ({ id: i + 1, ...r })),
    biaya: biaya.map((r, i) => ({ id: i + 1, keterangan: 'Data demo', ...r })),
  };
}

module.exports = { buatDataDemo, PROFIL };
