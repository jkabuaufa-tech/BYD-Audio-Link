// Pemeriksaan kernel Code.gs 2.5.1: paket pembaruan & modul server terbaru diterima di atas versi yang sedang terpasang.
// (PAKET / MODUL dapat diganti lewat variabel lingkungan untuk memeriksa rilis tertentu)
const { buatKonteks } = require('./harness.js'); const vm = require('vm'), fs = require('fs'); const C = buatKonteks();
C.__p = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.env.PAKET || 'pembaruan-2.7.2.json'), 'utf8')); C.__a = { versi: process.env.PAKET_LAMA || '2.7.1' };
vm.runInContext('mp218Validasi_(__p,__a,false)', C); console.log('  ✓ kernel menerima paket ' + C.__p.versi + ' (kumulatif, > ' + C.__a.versi + ', < 5 MB)');
C.__m = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.env.MODUL || 'server-modul-1.10.1.json'), 'utf8'));
const m = vm.runInContext('modulKompilasi_(__m)', C);
if (vm.runInContext('mp218VersiBanding_', C)(C.__m.versi, process.env.MODUL_LAMA || '1.10.0') <= 0) throw new Error('modul harus lebih baru dari modul terpasang');
console.log('  ✓ modul server ' + C.__m.versi + ' terkompilasi (' + Object.keys(m.aksi).length + ' aksi, timpa: ' + m.timpa.join(', ') + ') dan lebih baru dari ' + (process.env.MODUL_LAMA || '1.10.0'));
