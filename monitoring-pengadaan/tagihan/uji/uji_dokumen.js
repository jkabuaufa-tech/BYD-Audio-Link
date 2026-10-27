// Uji model dokumen + penggambar HTML & PDF: BAHAN, ALAT, SUBKON; PDF berhalaman banyak (kepala tabel berulang, teks tidak keluar
// batas halaman, blok tanda tangan utuh), angka di semua dokumen sama dengan mesin hitung, PDF terbaca ulang (pdf.js).
//   NODE_PATH=<folder berisi pdf-lib & pdfjs-dist> node uji/uji_dokumen.js [folder-keluaran]
const assert = require('assert'), fs = require('fs'), path = require('path');
global.BLI = require('../sumber/inti.js'); const BLD = require('../sumber/dokumen.js'), BLRH = require('../sumber/render-html.js'), BLRP = require('../sumber/render-pdf.js');
const PDFLib = require('pdf-lib'), pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const OUT = process.argv[2] || ''; let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const ID = { namaKop: 'WASKITA - NINDYA KSO', nama: 'WASKITA - NINDYA, KSO', alamatKop: 'Kantor KSO : Gedung Waskita Rajawali Tower, Jl. M.T. Haryono Kav. No.12-13 Bidaracina, Jatinegara - Jakarta Timur 13330', alamat: 'Gedung Waskita Rajawali Tower, Jakarta Timur',
  proyek: 'Proyek Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok', kapro: { nama: 'DEDY HARIYANTO', jabatan: 'Kepala Proyek' }, kasi: { nama: 'JOKO SUPRIYONO', jabatan: 'Kasi Pengadaan, Logistik & Peralatan' }, kota: 'Jakarta' };
const KONF = { ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: true }, pph: { jenis: 'PPh 4(2)', tarif: 1.75 }, retensiPersen: 5, uangMukaPersen: 10 };
async function teksPdf(bytes) {
  const d = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true, verbosity: 0 }).promise, hal = [];
  for (let i = 1; i <= d.numPages; i++) { const p = await d.getPage(i), vp = p.getViewport({ scale: 1 }), t = await p.getTextContent();
    hal.push({ teks: t.items.map(x => x.str).join(' ').replace(/\s+/g, ' '), keluar: t.items.filter(x => x.str.trim() && (x.transform[4] < 20 || x.transform[4] + x.width > vp.width - 20 || x.transform[5] < 15 || x.transform[5] > vp.height - 15)).map(x => x.str) }); }
  return hal;
}
(async () => {
  console.log('SUBKON — 130 item pekerjaan (BAPP berhalaman banyak), termin 2 dengan UM & retensi');
  const items = []; for (let i = 0; i < 130; i++) items.push(i % 26 === 0 ? { id: 'J' + i, uraian: 'DIVISI ' + (i / 26 + 1) + ' — PEKERJAAN STRUKTUR DERMAGA SEGMEN ' + (i / 26 + 1), judul: true }
    : { id: 'I' + i, kode: '39' + String(1000 + i), uraian: 'Pekerjaan pemasangan steel pipe sheet pile Ø1524 t=19 mm termasuk pengelasan sambungan & coating zona ' + i, sat: 'M1', vol: 100 + i, harga: 1250000 + i * 1000 });
  const lalu = {}, ini = {}; items.forEach((x, i) => { if (!x.judul) { lalu[x.id] = 20; ini[x.id] = i % 3 ? 15.5 : 0; } });
  const nilai = items.reduce((a, x) => a + (x.judul ? 0 : x.vol * x.harga), 0);
  const h = BLI.hitung({ kontrak: { nilai }, items, progres: { lalu, ini }, konfig: KONF, riwayat: { umKembaliSebelum: 0 } });
  ok(!BLI.adaGalat(h.temuan), 'perhitungan tanpa galat (prestasi ini ' + BLI.rupiah(h.prestasi.ini) + ', neto ' + BLI.rupiah(h.neto) + ')');
  const p = { kategori: 'SUBKON', billingId: 'BL-UJI-1', kontrak: { noKontrak: '091/SPPP/WK-NK.KSO/PDBJ/1726012/2026', tglKontrak: '2026-05-04', tglSelesai: '2026-12-31', noPO: '4100076091', nilai, jenisKontrak: 'SPPP' },
    vendor: { nama: 'CV Mirsel', alamat: 'Jl. Contoh No. 1, Jakarta Utara', ttdNama: 'Nama Direktur', ttdJabatan: 'Direktur', npwp: '00.000.000.0-000.000' }, identitas: ID,
    progres: { id: 'P2', tagihanKe: 2, periode: 'September 2026', tanggal: '2026-09-30', nomorBA: '02/BAPP/091/SPPP/WK-NK.KSO/PDBJ/1726012/2026', kodeBA: 'BAPP' }, tanggal: '2026-10-05', revisi: 1, hasil: h,
    riwayatTermin: [{ tagihanKe: 1, nomor: '01/BAP/091/SPPP/WK-NK.KSO/PDBJ/1726012/2026', jenis: 'PROGRES', prestasi: h.prestasi.lalu, um: 1000, ret: 2000, dasar: 3000, ppn: 360, total: 3360, pph: 50, neto: 2950, status: 'DIBAYAR' }],
    checklist: { template: [{ nama: 'UMUM', items: [{ k: 'UMUM_07', nama: 'BAP', ketentuan: 'Asli' }, { k: 'UMUM_08', nama: 'BAPP', ketentuan: 'Asli' }] }, { nama: 'SUBKON', items: [{ k: 'SUBKON_01', nama: 'BA Final Account', ketentuan: 'Copy' }] }], status: { UMUM_07: { status: 'DRAFT' }, SUBKON_01: { status: 'NA', alasan: 'Progres ≤ 85%' } } } };
  const M = BLD.semua(p);
  ok(M.map(m => m.kode).join() === 'BAPP,REKAP_QTY,BAP,REKAP_BAYAR,INVOICE,KWITANSI,CHECKLIST', 'urutan dokumen Subkon: BAPP, Rekap kuantitas & harga, BAP, Rekap pembayaran, Invoice, Kwitansi, Checklist');
  const bapp = M[0], bap = M[2];
  ok(bapp.nomor === p.progres.nomorBA && bap.nomor === '02/BAP/091/SPPP/WK-NK.KSO/PDBJ/1726012/2026', 'nomor BAPP = nomor BA Input Progres; BAP 02/BAP/<no kontrak>');
  const html = BLRH.dokumen(M, { namaKop: ID.namaKop, alamatKop: ID.alamatKop });
  ok(html.includes('<thead>') && html.includes(BLI.rupiah(h.neto, { tanpaRp: true })) && html.includes(BLI.terbilangRp(h.totalTagihan)) && (html.match(/class="kertas/g) || []).length === 7, 'HTML: 7 lembar, kepala tabel berulang (thead), neto & terbilang tercetak');
  ok(!/<script/i.test(html) && BLRH.dokumen([{ kode: 'X', judul: '<img onerror=1>', nomor: '<script>', kaki: '', blok: [{ t: 'p', teks: '<b>x</b>' }] }], {}).indexOf('<script>') < 0, 'HTML: isi di-escape (tanpa injeksi)');
  const r = await BLRP.satu(PDFLib, bapp, { namaKop: ID.namaKop, alamatKop: ID.alamatKop });
  if (OUT) fs.writeFileSync(path.join(OUT, 'contoh-bapp.pdf'), r.bytes);
  const hal = await teksPdf(r.bytes);
  ok(r.halaman >= 4 && hal.length === r.halaman, 'BAPP 130 item → ' + r.halaman + ' halaman PDF');
  ok(hal.filter(x => /\d+\.\d{3}/.test(x.teks) && /zona/.test(x.teks)).every(x => /MACAM PEKERJAAN/.test(x.teks)), 'kepala tabel diulang di setiap halaman yang memuat baris tabel');
  ok(hal.every((x, i) => new RegExp('Hal ' + (i + 1) + ' / ' + r.halaman).test(x.teks)), 'nomor halaman "Hal x / n" di setiap halaman');
  ok(hal.every(x => !x.keluar.length), 'tidak ada teks di luar batas kertas');
  const akhir = hal[hal.length - 1].teks;
  ok(/PIHAK KEDUA/.test(akhir) && /DEDY HARIYANTO/.test(akhir) && /JOKO SUPRIYONO/.test(akhir) && /NAMA DIREKTUR/.test(akhir), 'blok tanda tangan utuh di satu halaman (3 kolom)');
  ok(hal.map(x => x.teks).join(' ').includes(BLI.rupiah(h.prestasi.ini, { tanpaRp: true })), 'jumlah periode ini tercetak sama dengan mesin hitung');
  ok(/Rev\. 1/.test(hal[0].teks) && /DRAF/.test(hal[0].teks), 'kaki halaman memuat revisi; tanda air DRAF');
  const rb = await BLRP.satu(PDFLib, bap, { namaKop: ID.namaKop, alamatKop: ID.alamatKop }), tb = (await teksPdf(rb.bytes)).map(x => x.teks).join(' ');
  const nilaiBAP = [h.prestasi.sd, h.prestasi.lalu, h.prestasi.ini, h.uangMuka.potong, h.retensi.nilai, h.dasarTagihan, h.dpp, h.ppn, h.totalTagihan, h.pph.nilai].map(x => BLI.rupiah(x, { tanpaRp: true }));
  ok(nilaiBAP.every(v => tb.includes(v)) && tb.includes('Rp ' + BLI.rupiah(h.neto, { tanpaRp: true })), 'BAP: seluruh baris perhitungan (prestasi, UM, retensi, DPP, PPN, PPh, neto) sama dengan mesin hitung');
  const ti = (await teksPdf((await BLRP.satu(PDFLib, M[4], {})).bytes)).map(x => x.teks).join(' '), tk = (await teksPdf((await BLRP.satu(PDFLib, M[5], {})).bytes)).map(x => x.teks).join(' ');
  ok(ti.includes(BLI.rupiah(h.totalTagihan, { tanpaRp: true })) && tk.includes(BLI.rupiah(h.totalTagihan, { tanpaRp: true })) && /DRAF PEMBANDING/.test(ti) && /DRAF PEMBANDING/.test(tk) && /diisi vendor/.test(ti), 'Invoice & Kwitansi: total sama dengan BAP, berlabel DRAF PEMBANDING, nomor diisi vendor');
  const bd = await BLRP.bundel(PDFLib, M, { namaKop: ID.namaKop, alamatKop: ID.alamatKop, sampul: ['Kontrak : ' + p.kontrak.noKontrak, 'Vendor : CV Mirsel'], judul: 'BL-UJI-1' });
  const bt = await teksPdf(bd.bytes);
  ok(bt.length === bd.halaman && /DAFTAR ISI/.test(bt[0].teks) && bd.isi.length === 7 && bd.isi[0].dari === 2 && bd.isi[6].sampai === bd.halaman, 'bundel PDF: sampul + daftar isi + 7 dokumen (' + bd.halaman + ' hal), rentang halaman tepat');
  const dk = await PDFLib.PDFDocument.load(bd.bytes); ok(dk.getPageCount() === bd.halaman && /Bundel/.test(dk.getTitle()), 'bundel terbaca ulang oleh pdf-lib (metadata judul)');
  if (OUT) { fs.writeFileSync(path.join(OUT, 'contoh-bapp.pdf'), r.bytes); fs.writeFileSync(path.join(OUT, 'contoh-bundel-subkon.pdf'), bd.bytes); fs.writeFileSync(path.join(OUT, 'contoh-subkon.html'), html); }

  console.log('BAHAN & ALAT');
  const hb = BLI.hitung({ kontrak: { nilai: 2000000 }, items: [{ id: 'm', kode: '1000000001', uraian: 'Semen PCC 50 kg', sat: 'Sak', vol: 25, harga: 80000 }], progres: { lalu: {}, ini: { m: 10 } }, konfig: { ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: true }, pph: { jenis: 'PPh 22', tarif: 1.5 } } });
  const pb = { kategori: 'BAHAN', kontrak: { noKontrak: '055/SPM/WK-NK.KSO/PDBJ/1726012/2026', nilai: 2000000 }, vendor: { nama: 'Cahaya Utama' }, identitas: ID, progres: { tagihanKe: 1, nomorBA: '01/BAPM/055/SPM/WK-NK.KSO/PDBJ/1726012/2026', kodeBA: 'BAPM' }, hasil: hb,
    lampiran: { sj: [{ tanggal: '2026-10-02', noSJ: 'SJ-001', kode: '1000000001', uraian: 'Semen PCC 50 kg', qty: 6, sat: 'Sak', bonNomor: '007/WK-NK.KSO/DIV.II/INF1/1726012/2026' }, { tanggal: '2026-10-09', noSJ: 'SJ-002', kode: '1000000001', uraian: 'Semen PCC 50 kg', qty: 4, sat: 'Sak' }], sjVol: { m: 10 } } };
  const MB = BLD.semua(pb);
  ok(MB.map(m => m.kode).join() === 'BAPM,REKAP_TERIMA,REKAP_SJ,BAP,REKAP_BAYAR,INVOICE,KWITANSI,CHECKLIST', 'dokumen Bahan: BAPM, rekap penerimaan, rekap surat jalan, BAP, rekap bayar, invoice, kwitansi, checklist');
  const tsj = (await teksPdf((await BLRP.satu(PDFLib, MB[2], {})).bytes))[0].teks, trm = (await teksPdf((await BLRP.satu(PDFLib, MB[1], {})).bytes))[0].teks;
  ok(/SJ-001/.test(tsj) && /SJ-002/.test(tsj) && /2 surat jalan/.test(tsj) && /sesuai/.test(trm), 'rekap surat jalan dari penerimaan gudang; rekap penerimaan: qty SJ = volume BK (sesuai)');
  const items3 = [{ id: 'x', uraian: 'Excavator PC200', sat: 'Jam', vol: 500, harga: 350000 }];
  const ts = [{ itemId: 'x', unit: 'EX-01', operator: 'Budi', baris: Array.from({ length: 31 }, (_, i) => ({ tgl: '2026-10-' + String(i + 1).padStart(2, '0'), mulai: '07:00', selesai: '17:00', istirahat: 1, ket: i % 7 === 6 ? 'Minggu' : '' })) }];
  const rk = BLI.rekapTimesheet(ts, items3, { sewa: { x: { jamMinHari: 7 } } });
  const ha = BLI.hitung({ kontrak: { nilai: 175000000 }, items: items3, progres: { lalu: {}, ini: { x: rk.item[0].vol } }, konfig: { ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: true }, pph: { jenis: 'PPh 23', tarif: 2 } } });
  const pa = { kategori: 'ALAT', kontrak: { noKontrak: '012/SPSA/WK-NK.KSO/PDBJ/1726012/2026', nilai: 175000000 }, vendor: { nama: 'Sewa Alat Jaya' }, identitas: ID, progres: { tagihanKe: 1, nomorBA: '01/BAPSA/012/SPSA/WK-NK.KSO/PDBJ/1726012/2026', kodeBA: 'BAPSA' }, hasil: ha, lampiran: { ts, tsRekap: rk } };
  const MA = BLD.semua(pa);
  ok(MA.map(m => m.kode).join() === 'REKAP_TS,SEWA,PAKAI,BAPSA,BAP,INVOICE,KWITANSI,CHECKLIST' && MA[3].judul === 'BERITA ACARA PENERIMAAN ALAT (BAPSA)', 'dokumen Alat; BA mengikuti kode BA resmi Input Progres (BAPSA)');
  const tsw = (await teksPdf((await BLRP.satu(PDFLib, MA[1], {})).bytes)).map(x => x.teks).join(' ');
  ok(/279/.test(tsw) && /sesuai/.test(tsw) && tsw.includes(BLI.rupiah(279 * 350000, { tanpaRp: true })), 'perhitungan sewa: 31 hari × 9 jam = 279 jam (≥ min. 7) × Rp 350.000, cocok dengan BK');
  console.log('\nLULUS ' + lulus + ' uji dokumen & PDF');
})().catch(e => { console.error(e); process.exit(1); });
