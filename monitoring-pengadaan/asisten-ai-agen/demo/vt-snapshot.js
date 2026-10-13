// Membuat keadaan awal server untuk demo Verifikasi Tagihan: data 3 tagihan (vt_data.js) setelah modul 1.6.0 terbit, sebelum diverifikasi.
// Keluaran JSON: { P, sheets: {nama: rows}, props, files, ekstrak }. Key AI diganti teks demo (bukan key asli).
const fs = require('fs');
const { C, P } = require('../uji/vt_data.js')();
const props = Object.assign({}, C.__props);
Object.keys(props).filter(k => /^META_MODUL_/.test(k)).forEach(k => delete props[k]);
props.MODUL_AKTIF = 'DEMO-MODUL';
props.AI_KEY_ANTHROPIC = props.AI_KEY_CLAUDE = 'sk-ant-DEMO-bukan-key-asli'; props.AI_KEY_GROQ = 'gsk_DEMO-bukan-key-asli';
const files = {}; Object.keys(C.__files).forEach(id => { const f = C.__files[id]; files[id] = { nama: f.nama, data: f.data, induk: 'FP', diubah: f.diubah }; });
const sheets = {}; Object.keys(C.__sheets).forEach(n => { sheets[n] = C.__sheets[n].rows; });
fs.writeFileSync(process.argv[2], JSON.stringify({ P, sheets, props, files, ekstrak: C.__ekstrak }));
console.log('snapshot', Object.keys(sheets).length, 'sheet,', Object.keys(files).length, 'PDF');
