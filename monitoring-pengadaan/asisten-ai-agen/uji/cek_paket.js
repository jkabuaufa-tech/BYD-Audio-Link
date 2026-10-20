const { buatKonteks } = require('./harness.js'); const vm = require('vm'), fs = require('fs'); const C = buatKonteks();
C.__p = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.5.7.json', 'utf8')); C.__a = { versi: '2.5.6' };
vm.runInContext('mp218Validasi_(__p,__a,false)', C); console.log('  ✓ kernel menerima paket 2.5.7 (kumulatif, > 2.5.6, < 5 MB)');
