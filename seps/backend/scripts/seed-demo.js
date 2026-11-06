'use strict';

/** Mengisi t_produksi_harian & t_biaya_aktual dengan data DEMO 13 minggu. */
const { buatPgRepo } = require('../src/repositories/pgRepo');
const { buatDataDemo } = require('../src/data/demo');

(async () => {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL terlebih dahulu');
  const repo = buatPgRepo({ connectionString: process.env.DATABASE_URL });
  const { produksi, biaya } = buatDataDemo();
  for (const p of produksi) {
    const { id, ...row } = p;
    await repo.simpanProduksi(row);
  }
  await repo.simpanBiaya(biaya.map(({ id, ...r }) => r));
  console.log(`Demo: ${produksi.length} baris produksi, ${biaya.length} baris biaya.`);
  await repo.tutup();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
