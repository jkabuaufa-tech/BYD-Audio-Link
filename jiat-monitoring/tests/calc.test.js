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

test('gabung input staf: tambah baru, yang lebih baru menang, item asing dilewati', () => {
  const mem = {};
  global.localStorage = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  require('../js/core/store.js');
  const store = global.JIAT.store;
  store.init();
  store.saveProgress([{ itemId: 'N056', tanggal: '2026-11-12', volume: 10 }], 'Admin');
  const kiriman = seed();
  kiriman.progress = [
    { itemId: 'N056', tanggal: '2026-11-12', volume: 25, diinputOleh: 'Andi', updatedAt: '2999-01-01T00:00:00.000Z' },
    { itemId: 'N057', tanggal: '2026-11-12', volume: 5, diinputOleh: 'Andi', updatedAt: '2026-11-12T10:00:00.000Z' },
    { itemId: 'N055', tanggal: '2026-11-11', volume: 80 },
    { itemId: 'TIDAK-ADA', tanggal: '2026-11-12', volume: 1 },
  ];
  const h = store.mergeProgress(JSON.stringify(kiriman));
  assert.deepEqual(h, { baru: 1, diperbarui: 1, sama: 1, dilewati: 1, catatan: 0 });
  const p = store.get().progress;
  assert.equal(p.find((x) => x.id === 'N056:2026-11-12').volume, 25);
  assert.equal(p.find((x) => x.id === 'N057:2026-11-12').diinputOleh, 'Andi');
  assert.equal(p.length, 3);
});

test('overlay: dua pengguna, entri terbaru menang, hapus = v 0, restore & reset', () => {
  const store = global.JIAT.store;
  const terkirim = [];
  store.attachRemote({ write: (c) => terkirim.push(...c) }, 'u_andi');
  store.saveProgress([{ itemId: 'N058', tanggal: '2026-11-14', volume: 10 }], '');
  assert.equal(terkirim.at(-1).id, '2026-11-14~u_andi');
  // dokumen pengguna lain datang dari remote: lebih baru → menang; tidak menghapus dokumen Andi
  const docs = Object.fromEntries(terkirim.filter((c) => c.col === 'progress').map((c) => [c.id, c.doc]));
  docs['2026-11-14~u_budi'] = { tanggal: '2026-11-14', oleh: 'u_budi', entries: { N058: { v: 30, t: '2999-01-01T00:00:00.000Z' }, N059: { v: 7, t: '2026-11-14T01:00:00.000Z' }, N999: { v: 1, t: 'x' }, N060: { v: 'abc' } } };
  store.applyRemote('progress', docs);
  return new Promise((r) => setTimeout(r, 80)).then(() => {
    const p = store.get().progress;
    assert.equal(p.find((x) => x.id === 'N058:2026-11-14').volume, 30);
    assert.equal(p.find((x) => x.id === 'N058:2026-11-14').diinputOleh, 'u_budi');
    assert.equal(p.find((x) => x.id === 'N059:2026-11-14').volume, 7);
    assert.ok(!p.some((x) => x.itemId === 'N999' || x.itemId === 'N060'), 'entri tak valid diabaikan');
    // cadangan → reset → pulihkan menghasilkan state yang sama
    const cadangan = store.exportJSON(), sebelum = JSON.stringify(store.get().progress.map((x) => [x.id, x.volume]).sort());
    store.reset();
    assert.equal(store.get().progress.length, 1);
    store.importJSON(cadangan);
    assert.equal(JSON.stringify(store.get().progress.map((x) => [x.id, x.volume]).sort()), sebelum);
    // hapus item seed → hilang beserta progresnya
    store.deleteItem('N055');
    assert.ok(!store.get().items.some((i) => i.id === 'N055') && !store.get().progress.some((x) => x.itemId === 'N055'));
    assert.equal(store.get().items.length, 188);
  });
});
