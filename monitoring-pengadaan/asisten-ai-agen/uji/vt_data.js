// Data uji Verifikasi Tagihan: transkripsi 3 berkas tagihan nyata (SPM, SPSA, SPPP) + AI tiruan pembaca PDF.
// Dipakai uji_vt.js (server) dan ui230.js (antarmuka).
const { buatKonteks } = require('./harness.js');
const fs = require('fs'), assert = require('assert');
module.exports = function siapkan() {
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const kirim = (nama, pin, action, extra) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek: P }, extra || {})) } }));
const ADM = (a, e) => kirim('Joko Supriyono', '1234', a, e), STF = (a, e) => kirim('Staf Pengadaan', '1111', a, e), LHT = (a, e) => kirim('Kepala Proyek', '0000', a, e);
const paket = JSON.parse(fs.readFileSync(process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.0.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: paket }).ok); assert.ok(ADM('modulTerbit', { versi: paket.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji verifikasi tagihan' }).ok);
ADM('aiSetel', { data: { bawaanId: 'anthropic', kuota: 200, peran: ['ADMIN', 'PENGADAAN', 'LIHAT'], providers: [{ id: 'anthropic', model: 'claude-sonnet-5-5', aktif: true, kunci: 'sk-ant-api03-uji-0123456789abcdef' }, { id: 'groq', model: 'llama', aktif: true, kunci: 'gsk_uji0123456789abcdefgh' }] } });

/* ---------- data tagihan & checklist ---------- */
const NO = { spm: '001/SPM/WK/DIV.II/INF1/1425011/2025', spsa: '001/SPSA/WK/DIV.II/INF1/1425011/2025', sppp: '00134/SPPP/WK/1425011/2025' };
K.tulisKoleksi_(P, 'data', [{ id: 'R1', noKontrak: NO.spm, namaVendor: 'CV Berkah Bintang Harapan', tglKontrak: '2025-07-03', nilai: 45031500 },
  { id: 'R2', noKontrak: NO.spsa, namaVendor: 'CV Gema Multi Kencana', tglKontrak: '2025-06-23', nilai: 151300000 }, { id: 'R3', noKontrak: NO.sppp, namaVendor: 'CV Rizki Kurnia', tglKontrak: '2025-06-30', nilai: 2195707500 }]);
K.tulisKoleksi_(P, 'progres', [{ id: 'TSPM', versi: 1, noKontrak: NO.spm, tagihanKe: 1, nomorBA: '01/BAP/001/SPM', nilai: 45031500, baTerbit: true },
  { id: 'TSPSA', versi: 1, noKontrak: NO.spsa, tagihanKe: 1, nomorBA: '01/BAP/001/SPSA', nilai: 118500000, baTerbit: true }, { id: 'TSPPP', versi: 1, noKontrak: NO.sppp, tagihanKe: 1, nomorBA: '01/BAP/00134', nilai: 439141500, baTerbit: true }]);
const folderId = K.folderProyek_(P).getId(); C.__ekstrak = {};
function checklist(id, noK, kat, isi) {   // isi: {kode: [dokumen hasil baca]}; selain itu ditandai N/A beralasan
  const items = {}, tpl = K.CL217_TEMPLATES[kat].reduce((a, s) => a.concat(s.items), []);
  tpl.forEach(d => { if (isi[d.k]) { const fid = id + '-' + d.k; C.__files[fid] = { nama: d.nama + '.pdf', data: 'FILE:' + fid, induk: folderId, diubah: 1 }; C.__ekstrak[fid] = isi[d.k];
      items[d.k] = { status: 'ADA', file: { id: fid, idServer: fid, nama: d.nama + '.pdf', lokasi: 'server' } }; }
    else items[d.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
  K.cl217SimpanBaris_(P, { id, noKontrak: noK, kategori: kat, versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
}
const it = (uraian, qty, satuan, hargaSatuan) => ({ uraian, qty, satuan, hargaSatuan, jumlah: qty * hargaSatuan });
const ttd2 = { pihakPertama: true, pihakKedua: true };
// --- SPM (BAHAN) ---
const SPM_IT = [it('Alat Tulis (Papan Tulis + Pena)', 5, 'Pcs', 20000), it('Baterai Drone & Tas', 1, 'Set', 3432000), it('Bendera Segitiga Merah', 20, 'Pcs', 50000), it('Colokan (Kabel 2 x 1,5 + Steker + Stop Kontak)', 1, 'Pcs', 128500),
  it('Drone DJI Mini 4 Pro', 1, 'Unit', 18058000), it('Helm Merah MSA + Tali', 10, 'Pcs', 123500), it('Helm Putih Biasa Fastrack + Tali', 40, 'Pcs', 63000), it('Helm Putih MSA + Tali', 10, 'Pcs', 123500),
  it('Kalkulator FX 5800P', 2, 'Unit', 1650000), it('Lakban Kertas 1"', 12, 'Pcs', 10000), it('Meteran 50 Meter', 3, 'Pcs', 90000), it('Meteran Tajima 5 Meter', 12, 'Pcs', 178000), it('Meteran Tajima 7,5 Meter', 1, 'Pcs', 255000),
  it('Paku Beton 1 1/2"', 2, 'Kg', 62000), it('Parang', 2, 'Pcs', 50000), it('Rompi Jaring', 50, 'Pcs', 37500), it('Sarung Tangan Bintik', 2, 'Lusin', 45000), it('Senter Kepala', 2, 'Pcs', 70000),
  it('Sepatu Boat', 26, 'Pasang', 110000), it('Sepatu Boat', 38, 'Pasang', 110000), it('Sepatu Boat Sawah', 6, 'Pasang', 200000), it('Sipatan Tolsen', 2, 'Pcs', 68500), it('Spidol Hitam', 3, 'Kotak', 110000), it('Tinta Yamura', 2, 'Kotak', 103000)];
const SPM_FP_IT = SPM_IT.map(x => Object.assign({}, x, { uraian: x.uraian === 'Bendera Segitiga Merah' ? 'Baterai Segitiga Merah' : x.uraian === 'Sarung Tangan Bintik' ? 'Sarung Tangan Bintik Hitam' : x.uraian, satuan: 'Piece' }));
const sjSPM = (tgl, L) => ({ jenis: 'SURAT_JALAN', nomor: null, tanggal: tgl, tandaTangan: ttd2, item: L.map(x => ({ uraian: x[0], qty: x[1], satuan: x[2] })), keyakinan: 0.8 });
checklist('TSPM', NO.spm, 'BAHAN', {
  UMUM_01: [{ jenis: 'SPKTV', nomor: '03/SPKTV/WK/1425011/VIII/2025', tanggal: '2025-08-01', nomorKontrak: NO.spm, nilai: { hargaJual: 45031500, dpp: 41278875, ppn: 4953465, pph: 675473, total: 49984965, nilaiDiajukan: 44356028 }, rekening: [{ bank: 'Mandiri', nomor: '217401000163308' }], rujukan: [{ jenis: 'INVOICE', nomor: '013/INV/JB/BBH/VII/2025' }], keyakinan: 0.95 }],
  UMUM_02: [{ jenis: 'JURNAL_HUTANG', nomor: '1900019539', rujukan: [{ jenis: 'KWITANSI', nomor: '013/INV/KW/JB/BBH/VII/2025' }, { jenis: 'FAKTUR_PAJAK', nomor: '030002500219109310' }, { jenis: 'KONTRAK', nomor: NO.spm }], keyakinan: 0.9 }],
  UMUM_03: [{ jenis: 'KWITANSI', nomor: '013/INV/KW/JB/BBH/VII/2025', tanggal: '2025-07-18', nilai: { total: 49984965 }, terbilangSesuaiAngka: true, meterai: true, cap: true, tandaTangan: { pihakKedua: true },
    rujukan: [{ jenis: 'BAP', nomor: '01/BAP/001/SPM/WK/DIV.II/INF1/1425011/2025' }, { jenis: 'KONTRAK', nomor: NO.spm }, { jenis: 'INVOICE', nomor: '013/INV/JB/BBH/VII/2025' }], keyakinan: 0.95 }],
  UMUM_04: [{ jenis: 'INVOICE', nomor: '013/INV/JB/BBH/VII/2025', tanggal: '2025-07-18', nilai: { hargaJual: 45031500, ppn: 4953465, total: 49984965 }, rekening: [{ bank: 'BNI', nomor: '1010-2018-34' }, { bank: 'BRI', nomor: '2174-01-000163-30-8' }, { bank: 'Mandiri', nomor: '113-00-1311982-5' }], item: SPM_IT, keyakinan: 0.95 },
    { jenis: 'SURAT_PENYALURAN', nomor: '013/SPP/BBH/VII/2025', tanggal: '2025-07-18', rekening: [{ bank: 'BNI', nomor: '1010-2018-34' }, { bank: 'BRI', nomor: '2174-01-000163-390-8' }, { bank: 'Mandiri', nomor: '113-00-1311982-5' }], keyakinan: 0.9 }],
  UMUM_05: [{ jenis: 'FAKTUR_PAJAK', nomorSeriFaktur: '03002500219109310', tanggal: '2025-07-18', nilai: { hargaJual: 45031500, dpp: 41278875, ppn: 4953465 }, namaPembeli: 'WASKITA KARYA (PERSERO) Tbk', npwpPembeli: '0010016145093000', item: SPM_FP_IT,
    rujukan: [{ jenis: 'KONTRAK', nomor: NO.spm }, { jenis: 'INVOICE', nomor: '013/INV/JB/BBH/VII/2025' }], keyakinan: 0.95 }],
  UMUM_07: [{ jenis: 'BAP', nomor: '01/BAP/001/SPM/WK/DIV.II/INF1/1425011/2025', tanggal: '2025-07-18', nomorKontrak: NO.spm, tanggalKontrak: '2025-07-03', jenisPembayaran: 'PROGRES', persenPrestasi: 100, nilai: { hargaJual: 45031500, ppn: 4953465, total: 49984965, nilaiKontrak: 45031500 }, tandaTangan: ttd2,
    rujukan: [{ jenis: 'BAPM', nomor: '01/BAPM/001/SPM/WK/DIV.II/INF1/1425011/2025' }], keyakinan: 0.95 }],
  UMUM_08: [{ jenis: 'BAPM', nomor: '01/BAPM/001/SPM/WK/DIV.II/INF1/1425011/2025', tanggal: '2025-07-18', nomorKontrak: NO.spm, tanggalKontrak: '2025-07-03', nilai: { hargaJual: 45031500 }, tandaTangan: ttd2, item: SPM_IT, keyakinan: 0.95 }],
  BAHAN_02: [sjSPM('2025-07-03', [['Meteran 50 m', 3, 'Pcs'], ['Papan tulis + Pena', 5, 'Pcs'], ['Tinta Yamura', 2, 'kotak'], ['Spidol hitam', 3, 'kotak'], ['Meteran Tajima 5 m', 12, 'Pcs'], ['Bendera Segitiga', 20, 'Pcs'], ['Lakban kertas 1"', 12, 'Pcs'], ['Parang', 2, 'Pcs'], ['Paku beton', 2, 'kg'], ['Sipatan Tolsen', 2, 'Pcs']]),
    sjSPM('2025-07-04', [['Helm merah MSA + Tali', 10, 'Pcs'], ['Helm putih MSA + Tali', 10, 'Pcs'], ['Helm putih biasa Fastrack + Tali', 40, 'Pcs'], ['Sepatu boot no. 39-43', 26, 'Psg'], ['Sarung tangan Bintik', 2, 'lusin'], ['Rompi jaring', 50, 'Pcs']]),
    sjSPM('2025-07-07', [['Kalkulator FX 5800P', 2, 'unit'], ['Senter kepala', 2, 'Pcs'], ['Meteran 7,5 m', 1, 'Pcs'], ['Colokan (kabel 2x1,5 + Steker + Stop kontak)', 1, 'Pcs']]),
    sjSPM('2025-07-09', [['Sepatu boot Sawah uk 42', 6, 'Psg'], ['Sepatu boot uk 39-42', 38, 'Psg']]), sjSPM('2025-07-18', [['Baterai drone & tas', 1, 'Set'], ['Drone DJI mini 4 pro', 1, 'Unit']])]
});
// --- SPSA (ALAT) ---
const SPSA_IT = ['Ary', 'Yanki', 'Irwan', 'Irfan'].map(o => it('GPS Geodetic efix Opr. ' + o, 1, 'Bulan', 25525000)).concat([it('Total Station Opr. Choki & Yanki', 1, 'Bulan', 8200000), it('Total Station Opr. Danny & Rizky', 1, 'Bulan', 8200000)]);
checklist('TSPSA', NO.spsa, 'ALAT', {
  UMUM_01: [{ jenis: 'SPKTV', nomor: '18/SPKTV/WK/1425011/VIII/2025', nomorKontrak: NO.spsa, nilai: { hargaJual: 118500000, dpp: 108625002, ppn: 13035000, pph: 2370000, total: 131535000, nilaiDiajukan: 116130000 }, rekening: [{ bank: 'BNI', nomor: '11889088986' }], keyakinan: 0.95 }],
  UMUM_02: [{ jenis: 'JURNAL_HUTANG', nomor: '1900019874', rujukan: [{ jenis: 'FAKTUR_PAJAK', nomor: '03002500223281091' }, { jenis: 'KONTRAK', nomor: NO.spsa }], keyakinan: 0.9 }],
  UMUM_03: [{ jenis: 'KWITANSI', nomor: '001/GMK-WK/ALT/VII/2025', tanggal: '2025-07-22', nilai: { total: 131535000 }, terbilangSesuaiAngka: true, meterai: true, tandaTangan: { pihakKedua: true }, rekening: [{ bank: 'BNI', nomor: '1889088986' }],
    rujukan: [{ jenis: 'KONTRAK', nomor: NO.spsa, tanggal: '2025-06-23' }, { jenis: 'BAPA', nomor: '01/BAPA/001/SPSA/WK/DIV.II/INF1/1425011/2025' }, { jenis: 'BAP', nomor: '01/BAP/001/SPSA/WK/DIV.II/INF1/1425011/2025' }], keyakinan: 0.95 }],
  UMUM_04: [{ jenis: 'INVOICE', nomor: '001/GMK-WK/ALT/VII/2025', tanggal: '2025-07-22', nomorKontrak: NO.spsa, tanggalKontrak: '2025-06-23', nilai: { hargaJual: 118500000, ppn: 13035000, total: 131535000 }, rekening: [{ bank: 'BNI', nomor: '1889088986' }], item: SPSA_IT, keyakinan: 0.95 },
    { jenis: 'SURAT_PENYALURAN', nomor: '001/GMK-WK/ALT/VII/2025', rekening: [{ bank: 'BNI', nomor: '1889088986' }], keyakinan: 0.9 }],
  UMUM_05: [{ jenis: 'FAKTUR_PAJAK', nomorSeriFaktur: '03002500223281091', tanggal: '2025-07-22', nilai: { hargaJual: 118500000, dpp: 108625002, ppn: 13035000 }, namaPembeli: 'WASKITA KARYA (PERSERO) Tbk', npwpPembeli: '0010016145093000',
    item: SPSA_IT.map(x => Object.assign({}, x, { uraian: x.uraian + ' Sesuai No SPSA : ' + NO.spsa + ' Tanggal : 23-06-2025 dan No BAPK : 01/BAP/001/SPSA/WK/DIV.II/INF1/1425011/2025 Pada Proyek Rehabilitasi Jaringan Irigasi' })), keyakinan: 0.9 }],
  UMUM_07: [{ jenis: 'BAP', nomor: '01/BAP/001/SPSA/WK/DIV.II/INF1/1425011/2025', tanggal: '2025-07-22', nomorKontrak: NO.spsa, tanggalKontrak: '2025-06-23', jenisPembayaran: 'PROGRES', persenPrestasi: 78.32, nilai: { hargaJual: 118500000, ppn: 13035000, total: 131535000, nilaiKontrak: 151300000 }, tandaTangan: ttd2,
    rujukan: [{ jenis: 'BAPA', nomor: '01/BAPA/001/SPSA/WK/DIV.II/INF1/1425011/2025', tanggal: '2025-07-22' }], keyakinan: 0.95 }],
  UMUM_08: [{ jenis: 'BAPA', nomor: '01/BAPA/001/SPSA/WK/DIV.II/INF1/1425011/2025', tanggal: '2025-07-22', nomorKontrak: NO.spsa, tanggalKontrak: '2025-06-23', nilai: { hargaJual: 118500000 }, tandaTangan: ttd2, item: SPSA_IT, keyakinan: 0.95 }],
  ALAT_09: [{ jenis: 'SURAT_JALAN', nomor: '01/SJ/GMK/2025', tanggal: '2025-06-23', tandaTangan: ttd2, item: [{ uraian: 'GPS Geodetic Hi- Target V30+', qty: 1 }, { uraian: 'GPS Geodetic EFIX C5', qty: 1 }, { uraian: 'GPS Geodetic EFIX C5', qty: 1 }, { uraian: 'GPS Geodetic EFIX C5', qty: 1 }, { uraian: 'Total Station', qty: 1 }, { uraian: 'Total Station', qty: 1 }], keyakinan: 0.9 }]
});
// --- SPPP (SUBKON, uang muka) ---
const SPPP_IT = [it('Galian Tanah termasuk perapihan (Exca Std+Miting)', 39302, 'M3', 16000), it('Galian Tanah termasuk perapihan (Exca Long Arm+Miting)', 49088, 'M3', 21000), it('Galian Tanah termasuk perapihan (Exca Long Arm+Ponton)', 1, 'M3', 27500), it('Mobilisasi dan Demobilisasi', 8, 'Unit', 67000000)];
const fpSPPP = (seri, uraian) => ({ jenis: 'FAKTUR_PAJAK', nomorSeriFaktur: seri, tanggal: '2025-07-18', jenisPembayaran: 'UANG_MUKA', nilai: { hargaJual: 439141500, dpp: 402546375, ppn: 48305565 }, namaPembeli: 'WASKITA KARYA (PERSERO) Tbk', npwpPembeli: '0010016145093000', item: [it(uraian, 1, 'Lainnya', 439141500)], keyakinan: 0.95 });
checklist('TSPPP', NO.sppp, 'SUBKON', {
  UMUM_01: [{ jenis: 'SPKTV', nomor: '1.1/SPKTV/WK/1425011/VII/2025', nomorKontrak: NO.sppp, nilai: { hargaJual: 439141500, dpp: 402546375, ppn: 48305565, pph: 7684976, total: 487447065, nilaiDiajukan: 431456524 }, rekening: [{ bank: 'Sumsel Babel', nomor: '1803050026' }], keyakinan: 0.95 }],
  UMUM_02: [{ jenis: 'JURNAL_HUTANG', nomor: '1900019212', rujukan: [{ jenis: 'FAKTUR_PAJAK', nomor: '03032500215605954' }, { jenis: 'KONTRAK', nomor: '001134/SPPP/WK/1425011/2025' }, { jenis: 'BAP', nomor: '01/BAP/00134/SPPP/WK/1425011/2025' }], keyakinan: 0.9 }],
  UMUM_03: [{ jenis: 'KWITANSI', nomor: '001/RK-WK/2025', tanggal: '2025-07-18', jenisPembayaran: 'UANG_MUKA', nilai: { total: 487447065 }, terbilangSesuaiAngka: true, meterai: true, tandaTangan: { pihakKedua: true }, rekening: [{ bank: 'Bank Sumsel Babel', nomor: '1803050026' }],
    rujukan: [{ jenis: 'KONTRAK', nomor: NO.sppp, tanggal: '2025-06-30' }, { jenis: 'BAP', nomor: '01/BAPP/00134/SPPP/WK/1425011/2025', tanggal: '2025-07-18' }], keyakinan: 0.95 }],
  UMUM_04: [{ jenis: 'INVOICE', nomor: '001/rk-wk/2025', tanggal: '2025-07-18', jenisPembayaran: 'UANG_MUKA', nilai: { hargaJual: 439141500, ppn: 48305565, total: 487447065, uangMuka: 439141500, nilaiKontrak: 2195707500 }, rekening: [{ bank: 'Bank Sumsel', nomor: '1803050026' }], item: SPPP_IT, keyakinan: 0.95 }],
  UMUM_05: [fpSPPP('03032500215605954', 'PEMBAYARAN UANG MUKA (20 %) SENILAI 439.141.500 DARI NILAI KONTRAK 2.195.707.500'), fpSPPP('03002500215605954', 'Jasa Kontruksi')],
  UMUM_07: [{ jenis: 'BAP', nomor: '01/BAP/00134/SPPP/WK/1425011/2025', tanggal: '2025-07-18', nomorKontrak: NO.sppp, tanggalKontrak: '2025-06-30', jenisPembayaran: 'UANG_MUKA', nilai: { uangMuka: 439141500, hargaJual: 439141500, ppn: 48305565, total: 487447065, nilaiKontrak: 2195707500 }, tandaTangan: ttd2, keyakinan: 0.95 }],
  UMUM_08: [{ jenis: 'BAPP', nomor: '01/BAPP/00134/SPPP/WK/1425011/2025', tanggal: '2025-07-18', nomorKontrak: NO.sppp, tanggalKontrak: '2025-06-30', persenPrestasi: 0, nilai: { hargaJual: 0 }, tandaTangan: ttd2, item: SPPP_IT.map(x => Object.assign({}, x, { jumlah: 0 })), keyakinan: 0.9 }],
  SUBKON_02: [{ jenis: 'JAMINAN_PELAKSANAAN', nomor: 'PP16131125106781', nilai: { total: 121861766 }, berlakuDari: '2025-06-30', berlakuSampai: '2025-08-28', nomorKontrak: NO.sppp, tanggalKontrak: '2025-06-30', keyakinan: 0.9 }],
  SUBKON_03: [{ jenis: 'JAMINAN_UANG_MUKA', nomor: 'PP16131125106782', nilai: { total: 487447065 }, berlakuDari: '2025-06-30', berlakuSampai: '2025-08-28', nomorKontrak: NO.sppp, tanggalKontrak: '2025-07-21', keyakinan: 0.9 }]
});

/* ---------- AI tiruan: membaca PDF (base64 berisi ID berkas) → hasil transkripsi ---------- */
const S = { nPanggil: 0, sistem: '' };
C.__jawabHTTP = (u, o) => {
  S.nPanggil++; const b = JSON.parse(o.payload); S.sistem = b.system;
  const blok = (b.messages[0].content || []).find(c => c.type === 'document');
  assert.ok(blok && blok.source.media_type === 'application/pdf', 'PDF dikirim ke Anthropic sebagai blok document');
  const isiPdf = Buffer.from(blok.source.data, 'base64').toString('latin1'), fid = (/FILE:([\w.-]+)/.exec(isiPdf) || [])[1] || isiPdf;
  const hal = [...isiPdf.matchAll(/BUNPG:([\w.-]+):(\d+)/g)];   // bagian hasil pecah pdf-lib: penanda per halaman → dokumen pada halaman itu (nomor halaman lokal)
  if (hal.length) { const id = hal[0][1], P0 = hal.map(m => Number(m[2])), m0 = Math.min.apply(null, P0), m1 = Math.max.apply(null, P0);
    C.__ekstrak['__BAG'] = (C.__ekstrak[id] || []).filter(d => d.halamanMulai >= m0 && d.halamanMulai <= m1).map(d => Object.assign({}, d, { halamanMulai: d.halamanMulai - m0 + 1, halamanAkhir: Math.min(d.halamanAkhir, m1) - m0 + 1 }));
    return { kode: 200, teks: { content: [{ type: 'text', text: JSON.stringify({ dokumen: C.__ekstrak['__BAG'] }) }], usage: {} } }; }   // berkas uji: 'FILE:<id>' atau PDF asli bertanda %FILE:<id>
  return { kode: 200, teks: { content: [{ type: 'text', text: '```json\n' + JSON.stringify({ dokumen: C.__ekstrak[fid] }) + '\n```' }], usage: {} } };
};
return { C, K, P, S, NO, kirim, ADM, STF, LHT };
};
