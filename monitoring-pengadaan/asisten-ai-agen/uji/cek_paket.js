const { buatKonteks } = require('./harness.js'); const vm = require('vm'), fs = require('fs'); const C = buatKonteks();
C.__p = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.2.8.json', 'utf8')); C.__a = { versi: '2.2.7' };
vm.runInContext('mp218Validasi_(__p,__a,false)', C); console.log('  ✓ kernel menerima paket 2.2.8 (kumulatif, > 2.2.7, < 5 MB)');
