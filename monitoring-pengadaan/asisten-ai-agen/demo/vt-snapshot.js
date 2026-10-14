// Membuat keadaan awal server untuk demo Verifikasi Tagihan: data 3 tagihan (vt_data.js) setelah modul 1.6.0 terbit, sebelum diverifikasi.
// Keluaran JSON: { P, sheets: {nama: rows}, props, files, ekstrak }. Key AI diganti teks demo (bukan key asli).
const fs = require('fs');
const { C, K, P, NO } = require('../uji/vt_data.js')();
// 1.7.0: tagihan ke-2 SPSA dengan checklist kosong + transkripsi bundel (contoh "1 PDF scan utuh")
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TB1', versi: 1, noKontrak: NO.spsa, tagihanKe: 2, nomorBA: '02/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
K.cl217SimpanBaris_(P, { id: 'TB1', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items: {}, verified: false, diubahOleh: 'demo', diubahPada: '' }, 0);
let hal = 1; const bundel = [], label = [];
['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_07', 'UMUM_08', 'ALAT_09'].forEach(k => C.__ekstrak['TSPSA-' + k].forEach(d => {
  const n = d.jenis === 'BAP' || d.jenis === 'SURAT_JALAN' ? 2 : 1; bundel.push(Object.assign({}, d, { halamanMulai: hal, halamanAkhir: hal + n - 1 }));
  for (let j = 0; j < n; j++) label.push(d.jenis.replace(/_/g, ' ') + (n > 1 ? ' (' + (j + 1) + '/' + n + ')' : '')); hal += n; }));
C.__ekstrak['BUN-TB1'] = bundel;
const props = Object.assign({}, C.__props);
Object.keys(props).filter(k => /^META_MODUL_/.test(k)).forEach(k => delete props[k]);
props.MODUL_AKTIF = 'DEMO-MODUL';
props.AI_KEY_ANTHROPIC = props.AI_KEY_CLAUDE = 'sk-ant-DEMO-bukan-key-asli'; props.AI_KEY_GROQ = 'gsk_DEMO-bukan-key-asli';
const files = {}; Object.keys(C.__files).forEach(id => { const f = C.__files[id]; files[id] = { nama: f.nama, data: f.data, induk: 'FP', diubah: f.diubah }; });
const sheets = {}; Object.keys(C.__sheets).forEach(n => { sheets[n] = C.__sheets[n].rows; });
fs.writeFileSync(process.argv[2], JSON.stringify({ P, sheets, props, files, ekstrak: C.__ekstrak, labelBundel: label }));
console.log('snapshot', Object.keys(sheets).length, 'sheet,', Object.keys(files).length, 'PDF');
