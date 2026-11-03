'use strict';

const fs = require('fs');
const path = require('path');
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
// Bila tampilan sudah dibangun (frontend/out), disajikan sekalian di http://localhost:PORT/.
const webDir = path.resolve(__dirname, '..', '..', 'frontend', 'out');
buatApp({ repo, webDir: fs.existsSync(path.join(webDir, 'index.html')) ? webDir : undefined }).listen(PORT, () => console.log(`[SEPS] API berjalan di http://localhost:${PORT}/api/v1 (${repo.jenis})`));
