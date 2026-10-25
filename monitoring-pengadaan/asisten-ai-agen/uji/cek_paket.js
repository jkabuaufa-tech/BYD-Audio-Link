// Pemeriksaan kernel Code.gs 2.5.1: paket pembaruan & modul server terbaru diterima di atas versi yang sedang terpasang.
const { buatKonteks } = require('./harness.js'); const vm = require('vm'), fs = require('fs'); const C = buatKonteks();
C.__p = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.19.json', 'utf8')); C.__a = { versi: '2.6.18' };
vm.runInContext('mp218Validasi_(__p,__a,false)', C); console.log('  ✓ kernel menerima paket 2.6.19 (kumulatif, > 2.6.18, < 5 MB)');
C.__m = JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.9.4.json', 'utf8'));
const m = vm.runInContext('modulKompilasi_(__m)', C);
if (vm.runInContext('mp218VersiBanding_', C)(C.__m.versi, '1.9.3') <= 0) throw new Error('modul harus > 1.9.3');
console.log('  ✓ modul server ' + C.__m.versi + ' terkompilasi (' + Object.keys(m.aksi).length + ' aksi, timpa: ' + m.timpa.join(', ') + ') dan lebih baru dari 1.9.3');
