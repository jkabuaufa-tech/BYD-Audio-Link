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
  ok(M.map(m => m.kode).join() === 'BAPP,REKAP_QTY,BAP,REKAP_BAYAR,INVOICE,KWITANSI,CHECKLIST', 'urutan dokumen Subkon: BAPP, Rincian progres, BAP, Rekap pembayaran, Invoice, Kwitansi, Checklist');
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
  ok(/Yang Menyerahkan/.test(akhir) && /Mengetahui/.test(akhir) && /DEDY HARIYANTO/.test(akhir) && /JOKO SUPRIYONO/.test(akhir) && /NAMA DIREKTUR/.test(akhir), 'blok tanda tangan utuh di satu halaman (Mengetahui · Yang Menerima · Yang Menyerahkan, format BAPP proyek)');
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

  console.log('CV MIRSEL — dokumen dari data tagihan asli 02/SPPP (dibandingkan dengan PDF 5100012506)');
  const NOM = '02/SPPP/WSKT-NK KSO/1726012/2026', MI = [{ id: 'J0', uraian: 'Pekerjaan Pembongkaran Dermaga Meliputi', judul: true }, { id: 'J1', uraian: 'A  PEKERJAAN MILESTONE PHASE 1', judul: true }, { id: 'J2', uraian: 'Pekerjaan Bongkaran Dermaga Existing Phase 1', judul: true }]
    .concat([['Pembongkaran Pile Cap Existing (Include pembuangan keluar lokasi)', 1014.55, 'm3', 280000], ['Pembongkaran Balok Existing (Include pembuangan keluar lokasi)', 3387.02, 'm3', 280000], ['Pembongkaran Pelat Existing (Include pembuangan keluar lokasi)', 4346.37, 'm3', 280000],
      ['Pembongkaran Bollard Existing (Include pembuangan keluar lokasi)', 21, 'unit', 900000], ['Pembongkaran Fender Existing (Include pembuangan keluar lokasi)', 61, 'unit', 925000], ['Pembongkaran Rail Crane Existing (Include pembuangan keluar lokasi)', 705, "m'", 200000],
      ['Pembongkaran Batuan (Include pembuangan keluar lokasi)', 0, '-', 0], ['Pembongkaran Corner Protection (Include pembuangan keluar lokasi)', 356, "m'", 100000], ['Pembongkaran Stopper Rail Crane Existing (Include pembuangan keluar lokasi)', 2, 'unit', 900000]].map((x, i) => ({ id: 'A' + i, uraian: x[0], vol: x[1], sat: x[2], harga: x[3] })))
    .concat([{ id: 'J3', uraian: 'B  PEKERJAAN PENYESUAIAN FACELINE DERMAGA KOLINLAMIL', judul: true }, { id: 'B0', uraian: 'Pembongkaran Kanstin eksisting (Include pembuangan keluar lokasi)', vol: 18.5, sat: 'm3', harga: 280000 }, { id: 'B1', uraian: 'Pembongkaran Fender Existing (Include pembuangan keluar lokasi)', vol: 20, sat: 'unit', harga: 925000 }]);
  const hm = BLI.hitung({ kontrak: { nilai: 2726828200 }, items: MI, progres: { lalu: {}, ini: { A2: 721.363, A3: 19, A4: 61, A5: 704, A8: 2 } }, konfig: { kategori: 'SUBKON', retensiPersen: 5, ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: false, ikutiFaktur: true } }, faktur: { dpp: 364101195, ppn: 43692143, nomor: '04012600259849663' } });
  const IDK = Object.assign({}, ID, { kapro: { nama: 'DEDY HARIYANTO', jabatan: 'Project Coordinator' } });
  const pm = { kategori: 'SUBKON', kontrak: { noKontrak: NOM, jenisKontrak: 'SPPP', tglKontrak: '2026-05-04', tglSelesai: '2030-02-28', nilai: 2726828200, uraian: 'Pekerjaan Bongkaran Dermaga' }, vendor: { nama: 'CV Mirsel', alamat: 'Jl. Mayjen Sutoyo GG Jeruk RT 058 RW 015 Karang Anyar Subang Kab Subang Jawa Barat', ttdNama: 'Achmad Khatami', ttdJabatan: 'Direktur' },
    identitas: IDK, progres: { tagihanKe: 1, periode: 'Juni 2026', tanggal: '2026-06-23', nomorBA: '01/BAPP/' + NOM, kodeBA: 'BAPP' }, tanggal: '2026-07-08', hasil: hm };
  const mBAP = BLD.buat(pm, 'BAP'), mBAPP = BLD.buat(Object.assign({}, pm, { tanggal: '2026-06-23' }), 'BAPP'), mRin = BLD.buat(pm, 'REKAP_QTY');
  const pBAP = await BLRP.satu(PDFLib, mBAP, { namaKop: ID.namaKop, alamatKop: ID.alamatKop }), pBAPP = await BLRP.satu(PDFLib, mBAPP, { namaKop: ID.namaKop, alamatKop: ID.alamatKop }), pRin = await BLRP.satu(PDFLib, mRin, { namaKop: ID.namaKop, alamatKop: ID.alamatKop });
  const tBAP = (await teksPdf(pBAP.bytes)).map(x => x.teks).join(' '), tBAPP = (await teksPdf(pBAPP.bytes)).map(x => x.teks).join(' '), tRin = (await teksPdf(pRin.bytes)).map(x => x.teks).join(' ');
  ok(mBAP.nomor === '01/BAP/' + NOM && /Nomor : 01\/BAP\/02\/SPPP\/WSKT-NK KSO\/1726012\/2026/.test(tBAP), 'BAP bernomor 01/BAP/02/SPPP/WSKT-NK KSO/1726012/2026 (sama dengan asli)');
  ok(['418.106.640', '20.905.332', '397.201.308', '43.692.143', '440.893.451', '15,33%', '2.726.828.200'].every(v => tBAP.includes(v)) && /Perhitungan Pembayaran/.test(tBAP) && /Potongan Retensi/.test(tBAP) && /Pengembalian Uang Muka/.test(tBAP) && /JUMLAH SETELAH DIKURANGI RETENSI, UANG MUKA \(a-b-c\)/.test(tBAP),
    'BAP: susunan a–b–c, jumlah setelah retensi, PPN & TOTAL = BAP asli (418.106.640 · 20.905.332 · 397.201.308 · 43.692.143 · 440.893.451)');
  ok(tBAP.includes('Empat Ratus Empat Puluh Juta Delapan Ratus Sembilan Puluh Tiga Ribu Empat Ratus Lima Puluh Satu Rupiah') && /Project Coordinator/.test(tBAP) && /Staf KSDM/.test(tBAP) && /Kapro/.test(tBAP), 'BAP: terbilang total sama dengan asli; penandatangan Project Coordinator; kotak paraf verifikasi 8 kolom');
  ok(/Dari : CV MIRSEL/.test(tBAPP) && /BA YANG DITAGIH/.test(tBAPP) && /SISA YANG BELUM DI BA KAN/.test(tBAPP) && tBAPP.includes('201.981.640') && /7 Pembongkaran Batuan/.test(tBAPP) && /1 Pembongkaran Corner/.test(tBAPP) === false && /8 Pembongkaran Corner/.test(tBAPP) && tBAPP.includes('397.201.308') && /Tiga Ratus Sembilan Puluh Tujuh Juta Dua Ratus Satu Ribu Tiga Ratus Delapan Rupiah/.test(tBAPP) && /Yang Menyerahkan/.test(tBAPP),
    'BAPP: format Dari/Kepada, penomoran 1–9 utuh (item Batuan bervolume 0 tetap no. 7), 11 kolom (s/d saat ini, BA s/d lalu, periode ini, BA ditagihkan, sisa), jumlah diterima Rp 397.201.308 & terbilangnya = asli');
  ok(/RINCIAN PROGRES PEKERJAAN/.test(tRin) && tRin.includes('2.726.828.200') && tRin.includes('15,33%') && tRin.includes('44,63%') && tRin.includes('34,78%'), 'Rincian progres: bobot item (Pelat 44,63%, Balok 34,78%) & progres periode ini 15,33% = lampiran asli');
  // checklist mengikuti Form_Checklist_SUBKON.docx proyek 1726012 (template CL217 yang sama dengan Monitoring SAP)
  const HD = fs.readFileSync(path.join(__dirname, '../../asisten-ai-agen/demo/demo-verifikasi-tagihan.html'), 'utf8'), CLT = JSON.parse(HD.match(/const CL217_TEMPLATES = (\{.*?\});\n/)[1]);
  const mCk = BLD.buat(Object.assign({}, pm, { checklist: { template: CLT.SUBKON, divisi: 'Infrastruktur', pengajuan: 'PGJ-07/2026', status: { UMUM_07: { status: 'DIUNGGAH', tgl: '2026-07-08', ket: '01/BAP' }, UMUM_08: { status: 'TERVERIFIKASI', tgl: '2026-06-23', ket: '01/BAPP' }, SUBKON_01: { status: 'NA', alasan: 'Progres 15,33% < 85%' }, UMUM_04: { status: 'DRAFT' } } } }), 'CHECKLIST');
  const pCk = await BLRP.satu(PDFLib, mCk, { namaKop: ID.namaKop, alamatKop: ID.alamatKop }), tCk = (await teksPdf(pCk.bytes)).map(x => x.teks).join(' ');
  const tabCk = mCk.blok.filter(b => b.t === 'tabel'), baris = k => tabCk.map(t => t.isi).flat().find(r => r.sel[1] === k);
  ok(/CHECKLIST KELENGKAPAN TAGIHAN/.test(tCk) && /Divisi : Infrastruktur/.test(tCk) && /Id Proyek : 1726012/.test(tCk) && /Nomor Pengajuan : PGJ-07\/2026/.test(tCk) && /Nama Mitra : CV MIRSEL/.test(tCk) && /Pekerjaan : Pekerjaan Bongkaran Dermaga/.test(tCk),
    'Checklist: kepala 1–6 sesuai form DOCX (Divisi, Nama Proyek, Id Proyek 1726012 dari nomor kontrak, Nomor Pengajuan, Nama Mitra, Pekerjaan)');
  ok(tabCk.length === 2 && tabCk[0].isi.length === 13 && tabCk[1].isi.length === 13 && /A\. UMUM/.test(tCk) && /B\. SUBKON/.test(tCk) && /Jenis Dokumen/.test(tCk) && /Ketentuan/.test(tCk) && /Ada/.test(tCk) && /Tidak/.test(tCk) && /Surat Konfirmasi hutang/.test(tCk),
    'Checklist: A. UMUM 13 baris + B. SUBKON 13 baris, kolom No/Jenis Dokumen/Tanggal/Ketentuan/Checklist Ada-Tidak/Keterangan');
  ok(baris('BAPP').sel.slice(2, 6).join('|') === '23/06/2026|Asli|V|' && baris('BAP').sel[4] === 'V' && /belum diverifikasi Admin/.test(baris('BAP').sel[6]) && baris('BA Final Account / Cutt off Proggress > 85%').sel.slice(4, 6).join('|') === '|V'
    && baris('Invoice').sel.slice(4, 6).join('|') === '|' && /Draft/.test(baris('Invoice').sel[6]) && baris('SPKTV').sel.slice(2, 7).join('') === 'Asli' && /tidak menyatakan checklist lolos/.test(tCk),
    'Checklist: V Ada hanya untuk berkas tercatat (BAPP 23/06/2026; BAP diberi catatan belum diverifikasi), V Tidak untuk "tidak berlaku", draft/belum diperiksa dibiarkan kosong');
  if (OUT) fs.writeFileSync(path.join(OUT, 'mirsel-checklist.pdf'), pCk.bytes);
  if (OUT) { fs.writeFileSync(path.join(OUT, 'mirsel-bap.pdf'), pBAP.bytes); fs.writeFileSync(path.join(OUT, 'mirsel-bapp.pdf'), pBAPP.bytes); fs.writeFileSync(path.join(OUT, 'mirsel-rincian.pdf'), pRin.bytes); }

  console.log('PT SURYA SALIM SEJAHTERA — BAPM/BAP/Checklist Bahan dari SPM 047 (dibandingkan dengan PDF 20260827_0010)');
  const SN = '047/SPM/WK-NK.KSO/PDBJ/1726012/2026', SI = [['Cat Pilox Putih', 36, 'klg', 45000], ['Cat Pilox Merah', 36, 'klg', 45000], ['Paku Beton 7 cm ( Kuning )', 2, 'dus', 100000], ['Sipatan Tajima', 2, 'bh', 500000], ['Benang Nylon Besar', 24, 'roll', 25000],
    ['Meteran Wipro RM 70 3 Meter', 3, 'bh', 60000], ['Senter Kepala Merek Luby', 4, 'bh', 275000], ['Tinta Furukawa Merah', 2, 'btl', 385000], ['Steker Broco', 15, 'pcs', 20000], ['Kabel Grounding 6 mm', 20, 'mtr', 30000],
    ['Stop Kontak Panasonic', 4, 'pcs', 40000], ['Mata Bor Besi 6 mm', 1, 'pcs', 60000], ['Klem Kabel 2 x 1.5 No. 9', 10, 'pack', 25000], ['Lampu LED Phillips 4000K 12W', 4, 'bh', 115000], ['Stop Kontak 4 Lubang Broco', 24, 'pcs', 75000]]
    .map((x, i) => ({ id: 'S' + i, uraian: x[0], vol: x[1], sat: x[2], harga: x[3] }));
  const sIni = {}; SI.forEach(x => { sIni[x.id] = x.vol; });
  const hs = BLI.hitung({ kontrak: { nilai: 10720000 }, items: SI, progres: { lalu: {}, ini: sIni }, konfig: { kategori: 'BAHAN', ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: false } } });
  const ps = { kategori: 'BAHAN', kontrak: { noKontrak: SN, jenisKontrak: 'SPM', tglKontrak: '2026-07-16', tglSelesai: '2026-08-16', nilai: 10720000, uraian: 'Pengadaan Material Cat Pilox, Paku dll' },
    vendor: { nama: 'Surya Salim Sejahtera, PT', ttdNama: 'Johan', ttdJabatan: 'Direktur' }, identitas: Object.assign({}, ID, { kapro: { nama: 'DEDY HARIYANTO', jabatan: 'Kepala Proyek' } }),
    progres: { tagihanKe: 1, periode: 'Agustus 2026', tanggal: '2026-08-03', nomorBA: '01/BAPM/' + SN, kodeBA: 'BAPM' }, tanggal: '2026-08-03', hasil: hs };
  const sBAPM = BLD.buat(ps, 'BAPM'), sBAP = BLD.buat(ps, 'BAP');
  const qBAPM = await BLRP.satu(PDFLib, sBAPM, { namaKop: ID.namaKop, alamatKop: ID.alamatKop }), qBAP = await BLRP.satu(PDFLib, sBAP, { namaKop: ID.namaKop, alamatKop: ID.alamatKop });
  const uBAPM = (await teksPdf(qBAPM.bytes)).map(x => x.teks).join(' '), uBAP = (await teksPdf(qBAP.bytes)).map(x => x.teks).join(' ');
  const tbM = sBAPM.blok.find(b => b.t === 'tabel');
  ok(sBAPM.nomor === '01/BAPM/' + SN && tbM.kolom.length === 10 && /PROGRES REAL VOLUME/.test(uBAPM) && /YG LALU/.test(uBAPM) && /SD\. SAAT INI/.test(uBAPM) && /7=5\+6/.test(uBAPM) && /8=3-7/.test(uBAPM) && /10 = 6 x 9/.test(uBAPM),
    'BAPM 01/BAPM/047/SPM/…: tabel 10 kolom (volume kontrak, sat, progres real volume yg lalu/saat ini/sd. saat ini/sisa, harga, jumlah) = BAPM asli');
  ok(tbM.isi[0].sel.join('|') === '1|Cat Pilox Putih|36,00|klg|-|36,00|36,00|-|45.000|1.620.000' && uBAPM.includes('10.720.000') && /Sepuluh Juta Tujuh Ratus Dua Puluh Ribu Rupiah/.test(uBAPM) && /Yang Menyerahkan/.test(uBAPM) && /JOHAN/.test(uBAPM),
    'BAPM: baris Cat Pilox Putih 36,00 klg × 45.000 = 1.620.000; jumlah & terbilang Rp 10.720.000; TTD Mengetahui/Yang Menerima/Yang Menyerahkan');
  ok(sBAP.nomor === '01/BAP/' + SN && ['10.720.000', '1.179.200', '11.899.200', '100,00%'].every(v => uBAP.includes(v)) && /Sebelas Juta Delapan Ratus Sembilan Puluh Sembilan Ribu Dua Ratus Rupiah/.test(uBAP) && /Berita Acara Penerimaan Material 01\/BAPM/.test(uBAP) && /Kepala Proyek/.test(uBAP),
    'BAP 01/BAP/047/SPM/…: a–b–c, jumlah 10.720.000, PPN 1.179.200, TOTAL 11.899.200 & terbilang = BAP asli; merujuk BAPM 01');
  const sCk = BLD.buat(Object.assign({}, ps, { checklist: { template: CLT.BAHAN, divisi: 'Infrastruktur', status: {} } }), 'CHECKLIST'), qCk = await BLRP.satu(PDFLib, sCk, { namaKop: ID.namaKop, alamatKop: ID.alamatKop });
  const uCk = (await teksPdf(qCk.bytes)).map(x => x.teks).join(' ');
  ok(/Lampiran V/.test(uCk) && /B\. BAHAN/.test(uCk) && /Nama Mitra : SURYA SALIM SEJAHTERA, PT/.test(uCk) && /Pekerjaan : Pengadaan Material Cat Pilox, Paku dll/.test(uCk) && /Evaluasi Penggunaan Solar/.test(uCk), 'Checklist Bahan: Lampiran V, B. BAHAN 12 dokumen, mitra & pekerjaan = checklist asli');
  if (OUT) { fs.writeFileSync(path.join(OUT, 'sss-bapm.pdf'), qBAPM.bytes); fs.writeFileSync(path.join(OUT, 'sss-bap.pdf'), qBAP.bytes); fs.writeFileSync(path.join(OUT, 'sss-checklist.pdf'), qCk.bytes); }

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
