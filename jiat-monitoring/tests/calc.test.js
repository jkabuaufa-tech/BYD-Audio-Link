// Jalankan: npm test   (membandingkan hasil dengan angka di Excel sumber)
const test = require('node:test');
const assert = require('node:assert/strict');
global.window = global;
require('../js/data/seed.js');
const calc = require('../js/core/calc.js');
const seed = () => JSON.parse(JSON.stringify(global.JIAT.SEED));
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('total nilai nego BOQ sama dengan Excel', () => {
  near(calc.compute(seed(), '2026-11-13').summary.totalNilai, 80323036615.49, 0.005);
});

test('11 divisi, bobot berjumlah 100%, target detail ≈ 30,05%', () => {
  const v = calc.compute(seed(), '2026-11-13');
  assert.equal(v.divisions.length, 11);
  near(v.divisions.reduce((s, d) => s + d.bobot, 0), 1);
  near(v.summary.targetDetailDes, 0.3005, 5e-5);
});

test('realisasi mengikuti tanggal monitoring (N055: 80 m pada 11 Nov)', () => {
  const s = seed();
  const sebelum = calc.compute(s, '2026-11-10'), sesudah = calc.compute(s, '2026-11-11');
  assert.equal(sebelum.summary.realisasiSd, 0);
  near(sesudah.summary.realisasiSd, (80 * 650000) / 80323036615.49, 1e-12);
  near(sesudah.summary.realisasiHariIni, sesudah.summary.realisasiSd);
  const it = sesudah.items.find((i) => i.id === 'N055');
  assert.equal(it.status, calc.STATUS.RUNNING);
  near(it.sisa, 1659.92);
});

test('target linier: hari pertama 1/52, hari terakhir = target Des', () => {
  const p = seed().project;
  near(calc.targetKumulatif(p, '2026-11-10'), 0.3005 / 52);
  near(calc.targetKumulatif(p, '2026-12-31'), 0.3005);
  assert.equal(calc.targetKumulatif(p, '2026-11-09'), 0);
  assert.equal(calc.targetKumulatif(p, '2027-01-15'), 0.3005);
});

test('status: TERLAMBAT, SELESAI, CEK > BOQ', () => {
  const s = seed();
  assert.equal(calc.compute(s, '2026-11-23').items.find((i) => i.id === 'N055').status, calc.STATUS.LATE);
  s.progress.push({ itemId: 'N011', tanggal: '2026-11-12', volume: 1 });
  assert.equal(calc.compute(s, '2026-11-12').items.find((i) => i.id === 'N011').status, calc.STATUS.DONE);
  s.progress.push({ itemId: 'N011', tanggal: '2026-11-13', volume: 0.5 });
  const v = calc.compute(s, '2026-11-13');
  assert.equal(v.items.find((i) => i.id === 'N011').status, calc.STATUS.OVER);
  assert.equal(v.summary.itemCekBoq, 1);
});

test('validasi input harian melebihi sisa BOQ', () => {
  const item = { volume: 100 };
  assert.equal(calc.cekInputHarian(item, 60, 40).melebihiBoq, false);
  const r = calc.cekInputHarian(item, 60, 40.5);
  assert.equal(r.melebihiBoq, true);
  near(r.kelebihan, 0.5);
});
