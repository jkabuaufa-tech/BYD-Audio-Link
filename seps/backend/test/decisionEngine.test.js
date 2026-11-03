'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { agregasi, hargaBeliJadi } = require('../src/services/agregasi');
const { evaluasi, volumeImpas } = require('../src/services/decisionEngine');
const { mingguIso } = require('../src/services/periode');

const item = { id: 1, nama: 'Uji', hs_ahsp: 100000, overhead_pct: 0.05 };
const bench = [{ item_id: 1, harga_satuan: 100000, biaya_angkut_per_satuan: 0, berlaku_mulai: '2026-01-01', berlaku_sampai: null }];

/** Satu baris produksi + biaya per minggu (Senin), hs aktual sesuai daftar. */
function mingguan(hsList) {
  const produksi = [];
  const biaya = [];
  hsList.forEach((hs, i) => {
    const d = new Date(Date.UTC(2026, 7, 3 + i * 7)).toISOString().slice(0, 10); // Senin
    produksi.push({ tanggal: d, item_id: 1, volume: 100 });
    biaya.push({ tanggal: d, item_id: 1, kategori: 'MATERIAL', jumlah: hs * 60 });
    biaya.push({ tanggal: d, item_id: 1, kategori: 'ALAT', jumlah: hs * 40 });
  });
  return agregasi({ item, produksi, biaya, benchmarks: bench, granularitas: 'mingguan' });
}

test('minggu ISO: 3 Agt 2026 (Senin) = W32, 1 Jan 2026 = W01', () => {
  assert.equal(mingguIso('2026-08-03').kunci, '2026-W32');
  assert.equal(mingguIso('2026-08-09').kunci, '2026-W32');
  assert.equal(mingguIso('2026-01-01').kunci, '2026-W01');
  assert.equal(mingguIso('2027-01-01').kunci, '2026-W53');
});

test('agregasi menghitung HS aktual, efisiensi, dan cost saving', () => {
  const [p] = mingguan([90000]);
  assert.equal(p.hs_aktual, 90000);
  assert.equal(p.hs_efektif, 94500);
  assert.equal(p.efisiensi_pct, 10);
  assert.equal(p.cost_saving_vs_ahsp, 1000000);
  assert.equal(p.selisih_vs_beli_jadi, 10000000 - 9450000);
  assert.equal(p.swakelola_lebih_mahal, false);
});

test('volume 0 tapi ada biaya (alat idle) = efisiensi -100% dan lebih mahal', () => {
  const per = agregasi({
    item,
    produksi: [{ tanggal: '2026-08-03', item_id: 1, volume: 0 }],
    biaya: [{ tanggal: '2026-08-03', item_id: 1, kategori: 'ALAT', jumlah: 500000 }],
    benchmarks: bench,
    granularitas: 'harian',
  });
  assert.equal(per[0].hs_aktual, null);
  assert.equal(per[0].efisiensi_pct, -100);
  assert.equal(per[0].swakelola_lebih_mahal, true);
});

test('R1: 3 periode berturut swakelola+OH > beli jadi → ALERT', () => {
  // HS 97.000 → +5% = 101.850 > 100.000, efisiensi tetap positif (3%).
  const e = evaluasi({ item, periode: mingguan([90000, 97000, 97000, 97000]) });
  assert.equal(e.status, 'ALERT_BELI_JADI');
  assert.equal(e.aturan.r1_beli_jadi_lebih_murah_berturut, true);
  assert.equal(e.aturan.r2_efisiensi_negatif, false);
  assert.equal(e.metrik.streak_lebih_mahal, 3);
  assert.equal(e.rekomendasi, 'Rekomendasi Alert: Pertimbangkan Beli Jadi');
});

test('streak terputus → hanya WASPADA', () => {
  const e = evaluasi({ item, periode: mingguan([97000, 97000, 90000, 97000, 97000]) });
  assert.equal(e.status, 'WASPADA');
  assert.equal(e.metrik.streak_lebih_mahal, 2);
});

test('R2: efisiensi periode terakhir < 0 → ALERT walau streak belum 3', () => {
  const e = evaluasi({ item, periode: mingguan([90000, 101000]) });
  assert.equal(e.status, 'ALERT_BELI_JADI');
  assert.equal(e.aturan.r2_efisiensi_negatif, true);
});

test('efisien & lebih murah dari beli jadi → AMAN', () => {
  const e = evaluasi({ item, periode: mingguan([90000, 91000, 90000]) });
  assert.equal(e.status, 'AMAN');
});

test('tanpa data → DATA_KURANG', () => {
  assert.equal(evaluasi({ item, periode: [] }).status, 'DATA_KURANG');
});

test('benchmark: pilih harga landed terendah yang berlaku & memenuhi spek', () => {
  const b = [
    { harga_satuan: 90000, biaya_angkut_per_satuan: 15000, berlaku_mulai: '2026-01-01' },
    { harga_satuan: 98000, biaya_angkut_per_satuan: 0, berlaku_mulai: '2026-01-01' },
    { harga_satuan: 50000, biaya_angkut_per_satuan: 0, berlaku_mulai: '2026-01-01', memenuhi_spesifikasi: false },
    { harga_satuan: 60000, biaya_angkut_per_satuan: 0, berlaku_mulai: '2026-01-01', berlaku_sampai: '2026-06-30' },
  ];
  assert.equal(hargaBeliJadi(b, '2026-08-01', '2026-08-31'), 98000);
  assert.equal(hargaBeliJadi(b, '2026-08-01', '2026-08-31', 'RATA_RATA'), 101500);
});

test('volume impas: F(1+OH)/(HBJ − v(1+OH))', () => {
  const p = { volume: 100, hs_beli_jadi: 100000, biaya: { material: 5000000, bbm: 0, alat: 4000000, upah: 0, overhead_lain: 0 } };
  const bep = volumeImpas(p, 0.05);
  // F=4jt, v=50rb → 4.2jt / (100rb − 52.5rb) = 88,42
  assert.equal(bep.volume, 88.42);
  assert.equal(bep.tidak_pernah_kompetitif, false);
  const mahal = volumeImpas({ ...p, biaya: { ...p.biaya, material: 10000000 } }, 0.05);
  assert.equal(mahal.tidak_pernah_kompetitif, true);
});
