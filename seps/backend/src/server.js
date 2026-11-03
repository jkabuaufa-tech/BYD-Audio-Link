'use strict';

const { buatApp } = require('./app');

const PORT = Number(process.env.PORT || 4000);

function buatRepo() {
  if (process.env.DATABASE_URL) {
    const { buatPgRepo } = require('./repositories/pgRepo');
    return buatPgRepo({ connectionString: process.env.DATABASE_URL });
  }
  const { buatMemoryRepo } = require('./repositories/memoryRepo');
  console.warn('[SEPS] DATABASE_URL tidak diset → mode DEMO in-memory (data hilang saat restart).');
  return buatMemoryRepo();
}

const repo = buatRepo();
buatApp({ repo }).listen(PORT, () => console.log(`[SEPS] API berjalan di http://localhost:${PORT}/api/v1 (${repo.jenis})`));
