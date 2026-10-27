// Uji mesin perhitungan tagihan (inti.js) — rekonsiliasi dengan angka 3 berkas tagihan nyata (transkripsi di asisten-ai-agen/uji/vt_data.js):
// SPM (Bahan, CV Berkah Bintang Harapan), SPSA (Alat, CV Gema Multi Kencana), SPPP (Subkon uang muka, CV Rizki Kurnia),
// serta berkas proyek 1726012: CV Mirsel (SPPP) dan PT Surya Salim Sejahtera (SPM 047).
//   node uji/uji_inti.js
const assert = require('assert'), BLI = require('../sumber/inti.js');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const sama = (a, b, m) => { assert.strictEqual(a, b, m + ' (dapat ' + a + ', harus ' + b + ')'); lulus++; console.log('  ✓ ' + m); };
const it = (uraian, qty, sat, harga) => ({ uraian, qty, sat, harga });
const susun = (L, volKontrak) => {   // item kontrak + progres periode ini
  const items = L.map((x, i) => ({ id: 'I' + i, kode: '', uraian: x.uraian, sat: x.sat, vol: volKontrak ? volKontrak(x) : x.qty, harga: x.harga }));
  const ini = {}; L.forEach((x, i) => { ini['I' + i] = x.qty; }); return { items, ini };
};
const WAPU = (o) => Object.assign({ skema: 'NILAI_LAIN', tarif: 12, pembilang: 11, penyebut: 12, dipungut: true }, o || {});

console.log('SPM — Bahan, 24 item, 100% (BAPM 01, BAP 01, Invoice 013/INV/JB/BBH/VII/2025, SPKTV 03)');
const SPM = [it('Alat Tulis (Papan Tulis + Pena)', 5, 'Pcs', 20000), it('Baterai Drone & Tas', 1, 'Set', 3432000), it('Bendera Segitiga Merah', 20, 'Pcs', 50000), it('Colokan (Kabel 2 x 1,5 + Steker + Stop Kontak)', 1, 'Pcs', 128500),
  it('Drone DJI Mini 4 Pro', 1, 'Unit', 18058000), it('Helm Merah MSA + Tali', 10, 'Pcs', 123500), it('Helm Putih Biasa Fastrack + Tali', 40, 'Pcs', 63000), it('Helm Putih MSA + Tali', 10, 'Pcs', 123500),
  it('Kalkulator FX 5800P', 2, 'Unit', 1650000), it('Lakban Kertas 1"', 12, 'Pcs', 10000), it('Meteran 50 Meter', 3, 'Pcs', 90000), it('Meteran Tajima 5 Meter', 12, 'Pcs', 178000), it('Meteran Tajima 7,5 Meter', 1, 'Pcs', 255000),
  it('Paku Beton 1 1/2"', 2, 'Kg', 62000), it('Parang', 2, 'Pcs', 50000), it('Rompi Jaring', 50, 'Pcs', 37500), it('Sarung Tangan Bintik', 2, 'Lusin', 45000), it('Senter Kepala', 2, 'Pcs', 70000),
  it('Sepatu Boat', 26, 'Pasang', 110000), it('Sepatu Boat', 38, 'Pasang', 110000), it('Sepatu Boat Sawah', 6, 'Pasang', 200000), it('Sipatan Tolsen', 2, 'Pcs', 68500), it('Spidol Hitam', 3, 'Kotak', 110000), it('Tinta Yamura', 2, 'Kotak', 103000)];
{
  const s = susun(SPM), k = { kategori: 'BAHAN', ppn: WAPU(), pph: { jenis: 'PPh 22', tarif: 1.5 } };
  const h = BLI.hitung({ kontrak: { nilai: 45031500 }, items: s.items, progres: { lalu: {}, ini: s.ini }, konfig: k });
  sama(h.prestasi.ini, 45031500, 'prestasi periode ini = harga jual BAP/Invoice Rp 45.031.500');
  sama(h.persen.sd, 100, 'prestasi s/d saat ini 100%');
  sama(h.dpp, 41278875, 'DPP nilai lain 11/12 = Faktur Pajak Rp 41.278.875');
  sama(h.ppn, 4953465, 'PPN 12% × DPP = Rp 4.953.465');
  sama(h.totalTagihan, 49984965, 'total tagihan (Invoice & Kwitansi) Rp 49.984.965');
  sama(h.pph.nilai, 675473, 'PPh 22 1,5% = Rp 675.473 (SPKTV)');
  sama(h.neto, 44356027, 'neto pembulatan per komponen = 45.031.500 − 675.473 = Rp 44.356.027 (PPN dipungut pemungut)');
  const b = BLI.bandingkan(h, { invoice: { hargaJual: 45031500, ppn: 4953465, total: 49984965 }, faktur: { dpp: 41278875, ppn: 4953465 }, kwitansi: { total: 49984965 }, spktv: { hargaJual: 45031500, pph: 675473, neto: 44356028 } });
  ok(b.length === 1 && b[0].kode === 'BEDA_SPKTV_NILAI_DIAJUKAN' && b[0].selisih === 1 && b[0].tingkat === 'PERINGATAN', 'deteksi silang: Invoice, Faktur & Kwitansi cocok; SPKTV "nilai diajukan" Rp 44.356.028 selisih Rp 1 (pembulatan) ditandai');
  const h2 = BLI.hitung({ kontrak: { nilai: 45031500 }, items: s.items, progres: { lalu: {}, ini: s.ini }, konfig: Object.assign({}, k, { pembulatan: 'AKHIR' }) });
  sama(h2.neto, 44356028, 'mode pembulatan AKHIR mereproduksi angka SPKTV Rp 44.356.028 (45.031.500 − 675.472,5)');
  ok(h2.pembulatan.some(l => l.komponen === 'PPh' && l.eksak === 675472.5 && l.bulat === 675473), 'jejak pembulatan PPh: 675.472,5 → 675.473 tercatat');
  ok(!BLI.adaGalat(h.temuan), 'tanpa galat');
  sama(BLI.terbilangRp(h.totalTagihan), 'Empat Puluh Sembilan Juta Sembilan Ratus Delapan Puluh Empat Ribu Sembilan Ratus Enam Puluh Lima Rupiah', 'terbilang total tagihan');
}

console.log('SPSA — Alat, 6 unit × 1 bulan (BAPA 01, BAP 01 78,32%, Faktur 03002500223281091)');
const SPSA = ['Ary', 'Yanki', 'Irwan', 'Irfan'].map(o => it('GPS Geodetic efix Opr. ' + o, 1, 'Bulan', 25525000)).concat([it('Total Station Opr. Choki & Yanki', 1, 'Bulan', 8200000), it('Total Station Opr. Danny & Rizky', 1, 'Bulan', 8200000)]);
{
  const s = susun(SPSA, () => 2), k = { kategori: 'ALAT', ppn: WAPU({ perItem: true }), pph: { jenis: 'PPh 23', tarif: 2 } };
  const h = BLI.hitung({ kontrak: { nilai: 151300000 }, items: s.items, progres: { lalu: {}, ini: s.ini }, konfig: k });
  sama(h.prestasi.ini, 118500000, 'prestasi Rp 118.500.000');
  sama(BLI.persen(h.persen.sd), '78,32%', 'persen prestasi terhadap nilai kontrak Rp 151.300.000 = 78,32% (BAP)');
  sama(h.dpp, 108625002, 'DPP per baris barang (e-Faktur) = Rp 108.625.002 — sama persis dengan Faktur Pajak (bukan 108.625.000)');
  sama(h.ppn, 13035000, 'PPN Rp 13.035.000');
  sama(h.totalTagihan, 131535000, 'total Rp 131.535.000');
  sama(h.pph.nilai, 2370000, 'PPh 23 2% Rp 2.370.000');
  sama(h.neto, 116130000, 'nilai diajukan SPKTV Rp 116.130.000');
  const h2 = BLI.hitung({ kontrak: { nilai: 151300000 }, items: s.items, progres: { lalu: {}, ini: s.ini }, konfig: Object.assign({}, k, { ppn: WAPU() }) });
  ok(h2.dpp === 108625000 && BLI.bandingkan(h2, { faktur: { dpp: 108625002 } })[0].selisih === 2, 'DPP dari total Rp 108.625.000 → beda Rp 2 dengan Faktur terdeteksi');
  ok(h.temuan.some(t => t.kode === 'NILAI_ITEM_BEDA'), 'info: jumlah harga item ≠ nilai kontrak dicatat');
}

console.log('SPPP — Subkon, tagihan UANG MUKA 20% (BAP 01, Invoice 001/rk-wk/2025)');
{
  const items = [it('Galian Tanah termasuk perapihan (Exca Std+Miting)', 39302, 'M3', 16000), it('Galian Tanah termasuk perapihan (Exca Long Arm+Miting)', 49088, 'M3', 21000), it('Galian Tanah termasuk perapihan (Exca Long Arm+Ponton)', 1, 'M3', 27500), it('Mobilisasi dan Demobilisasi', 8, 'Unit', 67000000)].map((x, i) => ({ id: 'S' + i, uraian: x.uraian, sat: x.sat, vol: x.qty, harga: x.harga }));
  const k = { kategori: 'SUBKON', uangMukaPersen: 20, retensiPersen: 5, ppn: WAPU(), pph: { jenis: 'PPh 4(2)', tarif: 1.75 } };
  const h = BLI.hitung({ jenis: 'UANG_MUKA', kontrak: { nilai: 2195707500 }, items, progres: { lalu: {}, ini: {} }, konfig: k });
  sama(h.nilaiItem, 2195707500, 'jumlah harga 4 item = nilai kontrak Rp 2.195.707.500');
  sama(h.dasarTagihan, 439141500, 'uang muka 20% Rp 439.141.500');
  sama(h.dpp, 402546375, 'DPP Rp 402.546.375'); sama(h.ppn, 48305565, 'PPN Rp 48.305.565'); sama(h.totalTagihan, 487447065, 'total Rp 487.447.065');
  sama(h.pph.nilai, 7684976, 'PPh 4(2) 1,75% Rp 7.684.976'); sama(h.neto, 431456524, 'nilai diajukan Rp 431.456.524');
  ok(h.prestasi.ini === 0 && !BLI.adaGalat(h.temuan), 'BAPP uang muka: prestasi 0, tanpa galat');

  console.log('Subkon multi-termin: pengembalian UM proporsional, retensi 5%, pelunasan UM di termin terakhir');
  const prog = [{ id: 'P1', periodeKey: 202607, tagihanKe: 1, items: { S0: 10000, S3: 4 } }, { id: 'P2', periodeKey: 202608, tagihanKe: 2, items: { S0: 20000, S1: 30000, S3: 4 } }, { id: 'P3', periodeKey: 202609, tagihanKe: 3, items: { S0: 9302, S1: 19088, S2: 1 } }];
  let umKembali = 0, ret = 0, total = 0;
  const hasil = prog.map(p => {
    const v = BLI.volumeDariProgres(prog, p.id, {}), r = BLI.hitung({ kontrak: { nilai: 2195707500 }, items, progres: v, konfig: k, riwayat: { umKembaliSebelum: umKembali, retensiSebelum: ret } });
    umKembali += r.uangMuka.potong; ret += r.retensi.nilai; total += r.prestasi.ini; return r;
  });
  sama(hasil[0].prestasi.ini, 160000000 + 268000000, 'termin 1: prestasi Rp 428.000.000');
  sama(hasil[0].uangMuka.potong, 85600000, 'termin 1: pengembalian UM 20% × 428 jt = Rp 85.600.000');
  sama(hasil[0].retensi.nilai, 21400000, 'termin 1: retensi 5% = Rp 21.400.000');
  sama(hasil[0].dasarTagihan, 428000000 - 85600000 - 21400000, 'termin 1: nilai tagihan setelah potongan Rp 321.000.000');
  sama(hasil[1].prestasi.lalu, 428000000, 'termin 2: prestasi s/d yang lalu = termin 1');
  sama(hasil[2].persen.sd, 100, 'termin 3: kumulatif 100%');
  sama(umKembali, 439141500, 'total pengembalian UM = UM dibayar Rp 439.141.500 (sisa dilunasi di termin terakhir)');
  sama(hasil[2].uangMuka.sisa, 0, 'sisa UM 0');
  sama(total, 2195707500, 'Σ prestasi 3 termin = nilai kontrak');
  sama(ret, BLI.hitung({ kontrak: { nilai: 2195707500 }, items, progres: { lalu: {}, ini: { S0: 39302, S1: 49088, S2: 1, S3: 8 } }, konfig: Object.assign({}, k, { uangMukaPersen: 0 }) }).retensi.nilai, 'Σ retensi per termin = 5% × nilai kontrak (Rp 109.785.375)');
  const rel = BLI.hitung({ jenis: 'RETENSI', kontrak: { nilai: 2195707500 }, items, progres: { lalu: {}, ini: {} }, konfig: k, riwayat: { retensiSebelum: ret }, nilaiRetensiDilepas: ret });
  ok(rel.dasarTagihan === ret && rel.retensi.kumulatif === 0 && !BLI.adaGalat(rel.temuan), 'tagihan pelepasan retensi = retensi tertahan, sisa 0');
  ok(BLI.hitung({ jenis: 'RETENSI', kontrak: { nilai: 2195707500 }, items, progres: { lalu: {}, ini: {} }, konfig: k, riwayat: { retensiSebelum: 100 }, nilaiRetensiDilepas: 500 }).temuan.some(t => t.kode === 'RETENSI_LEBIH'), 'pelepasan retensi > retensi tertahan ditolak');

  console.log('Kontrol');
  const lebih = BLI.hitung({ kontrak: { nilai: 2195707500 }, items, progres: { lalu: { S3: 6 }, ini: { S3: 3 } }, konfig: k });
  ok(lebih.temuan.some(t => t.kode === 'VOLUME_LEBIH' && t.tingkat === 'GALAT'), 'kumulatif 9 > volume kontrak 8 → GALAT');
  ok(BLI.hitung({ kontrak: { nilai: 2195707500 }, items, progres: { lalu: { S3: 6 }, ini: { S3: 3 } }, konfig: Object.assign({}, k, { izinLebihVolume: true, noAddendum: 'ADD-01/SPPP' }) }).temuan.some(t => t.kode === 'VOLUME_LEBIH_ADDENDUM' && t.tingkat === 'PERINGATAN'), 'dengan addendum sah → peringatan, bukan galat');
  ok(BLI.hitung({ kontrak: { nilai: 2195707500 }, items, progres: { lalu: { S3: 6 }, ini: { S3: 3 } }, konfig: Object.assign({}, k, { izinLebihVolume: true }) }).temuan.some(t => t.kode === 'VOLUME_LEBIH'), 'izin lebih volume tanpa nomor addendum diabaikan');
  ok(BLI.hitung({ kontrak: { nilai: 400000000 }, items, progres: { lalu: {}, ini: { S3: 7 } }, konfig: k }).temuan.some(t => t.kode === 'NILAI_LEBIH'), 'prestasi > nilai kontrak → GALAT');
  ok(BLI.hitung({ kontrak: { nilai: 2195707500 }, items, progres: { lalu: {}, ini: { S3: 1 } }, konfig: { kategori: 'SUBKON' } }).temuan.some(t => t.kode === 'PPN_BELUM' && t.tingkat === 'GALAT'), 'PPN tidak diatur → GALAT (tarif tidak pernah diisi otomatis)');
  ok(BLI.hitung({ kontrak: { nilai: 2195707500 }, items, progres: { lalu: {}, ini: {} }, konfig: k }).temuan.some(t => t.kode === 'INI_KOSONG'), 'tanpa volume periode ini → GALAT');
  const nr = BLI.hitung({ kontrak: { nilai: 1000 }, items: [{ id: 'a', uraian: 'x', vol: 3, harga: 333.33 }], progres: { lalu: {}, ini: { a: 3 } }, konfig: { ppn: { skema: 'NORMAL', tarif: 11 } } });
  ok(nr.prestasi.ini === 1000 && nr.ppn === 110 && nr.totalTagihan === 1110, 'PPN skema NORMAL tarif 11% (dikonfigurasi) atas Rp 999,99 → prestasi Rp 1.000, PPN Rp 110');
  ok(0.1 + 0.2 !== 0.3 && BLI.hitung({ kontrak: { nilai: 3 }, items: [{ id: 'a', vol: 3, harga: 0.1 }, { id: 'b', vol: 1, harga: 0.2 }].map(x => Object.assign({ uraian: 'u' }, x)), progres: { lalu: {}, ini: { a: 1, b: 1 } }, konfig: { ppn: { skema: 'DIBEBASKAN', tarif: 0 } } }).pembulatan.find(l => l.komponen === 'Prestasi periode ini').eksak === 0.3, 'aritmetika desimal tepat (0,1 + 0,2 = 0,3)');
}

console.log('CV MIRSEL — Subkon 02/SPPP/WSKT-NK KSO/1726012/2026, tagihan ke-1 (BAPP/BAP 01, Invoice 018/INV.MRS/VII/2026, FP 04012600259849663)');
{
  // Lampiran SPPP (rekapitulasi kuantitas & harga) + volume BAPP periode ini; BAPP mencetak 721,36 tetapi jumlahnya 201.981.640 = 721,363 × 280.000
  const L = [['Pembongkaran Pile Cap Existing', 1014.55, 'm3', 280000], ['Pembongkaran Balok Existing', 3387.02, 'm3', 280000], ['Pembongkaran Pelat Existing', 4346.37, 'm3', 280000], ['Pembongkaran Bollard Existing', 21, 'unit', 900000],
    ['Pembongkaran Fender Existing', 61, 'unit', 925000], ['Pembongkaran Rail Crane Existing', 705, "m'", 200000], ['Pembongkaran Batuan (include)', 0, '', 0], ['Pembongkaran Corner Protection', 356, "m'", 100000],
    ['Pembongkaran Stopper Rail Crane Existing', 2, 'unit', 900000], ['Pembongkaran Kanstin eksisting', 18.5, 'm3', 280000], ['Pembongkaran Fender Existing (Kolinlamil)', 20, 'unit', 925000]].map((x, i) => ({ id: 'M' + i, uraian: x[0], vol: x[1], sat: x[2], harga: x[3] }));
  const ini = { M2: 721.363, M3: 19, M4: 61, M5: 704, M8: 2 }, K = { kategori: 'SUBKON', retensiPersen: 5, ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: false } };
  const h = BLI.hitung({ kontrak: { nilai: 2726828200 }, items: L, progres: { lalu: {}, ini }, konfig: K });
  sama(h.nilaiItem, 2726828200, 'jumlah 11 item lampiran SPPP = nilai kontrak Rp 2.726.828.200');
  sama(h.prestasi.ini, 418106640, 'prestasi periode ini = BAPP/BAP/Invoice Rp 418.106.640');
  sama(BLI.persen(h.persen.sd), '15,33%', 'prestasi s/d saat ini 15,33% (BAP)');
  sama(h.retensi.nilai, 20905332, 'retensi 5% Rp 20.905.332 (BAP, jurnal retensi)');
  sama(h.dasarTagihan, 397201308, 'jumlah setelah dikurangi retensi Rp 397.201.308 = harga jual Faktur');
  const b = BLI.bandingkan(h, { invoice: { hargaJual: 397201308, ppn: 43692143, total: 440893451 }, faktur: { dpp: 364101195, ppn: 43692143 }, kwitansi: { total: 440893451 } });
  ok(h.dpp === 364101199 && h.ppn === 43692144 && b.some(t => t.kode === 'BEDA_FAKTUR_PAJAK_DPP' && t.selisih === -4 && t.tingkat === 'GALAT') && b.some(t => t.kode === 'BEDA_KWITANSI_TOTAL' && t.selisih === -1),
    'DPP 11/12 = Rp 364.101.199 ≠ Faktur Rp 364.101.195 (selisih Rp 4, tidak dapat diturunkan) → ditandai; PPN & total selisih Rp 1');
  const f = BLI.hitung({ kontrak: { nilai: 2726828200 }, items: L, progres: { lalu: {}, ini }, konfig: Object.assign({}, K, { ppn: Object.assign({}, K.ppn, { ikutiFaktur: true }) }), faktur: { dpp: 364101195, ppn: 43692143, nomor: '04012600259849663' } });
  ok(f.dpp === 364101195 && f.ppn === 43692143 && f.totalTagihan === 440893451 && f.temuan.some(t => t.kode === 'PPN_IKUT_FAKTUR') && f.pembulatan.some(l => /Faktur Pajak 04012600259849663/.test(l.komponen)),
    'opsi "ikuti Faktur Pajak": PPN Rp 43.692.143, total Rp 440.893.451 = BAP, Invoice & Kwitansi; selisih tercatat di jejak pembulatan');
  ok(!BLI.bandingkan(f, { invoice: { hargaJual: 397201308, ppn: 43692143, total: 440893451 }, faktur: { dpp: 364101195, ppn: 43692143 }, kwitansi: { total: 440893451 } }).length, 'setelah mengikuti faktur: seluruh dokumen vendor cocok');
  sama(f.neto, 440893451, 'PPN tidak dipungut pemungut (Utang PPN Non Wapu Vendor di jurnal) → dibayarkan termasuk PPN Rp 440.893.451');
  ok(BLI.hitung({ kontrak: { nilai: 2726828200 }, items: L, progres: { lalu: {}, ini }, konfig: Object.assign({}, K, { ppn: Object.assign({}, K.ppn, { ikutiFaktur: true }) }), faktur: { dpp: 364000000, ppn: 43680000 } }).temuan.some(t => t.kode === 'FAKTUR_DI_LUAR_TOLERANSI'),
    'faktur yang selisihnya melebihi toleransi (Rp 10) tidak dipakai → GALAT');
  const bappPpn = Math.round(418106640 * 0.11);
  ok(bappPpn === 45991730 && bappPpn !== f.ppn, 'catatan: tabel BAPP asli mencetak PPN Rp 45.991.730 (11% × prestasi sebelum retensi) — berbeda dengan BAP Rp 43.692.143; generator tidak mencetak PPN di BAPP agar tidak terjadi beda angka');
}

console.log('PT SURYA SALIM SEJAHTERA — Bahan 047/SPM/WK-NK.KSO/PDBJ/1726012/2026 (BAPM/BAP 01, Invoice & Kwitansi 685/SSS/VIII/2026, FP 04002600315424142)');
const SSS = [it('Cat Pilox Putih', 36, 'klg', 45000), it('Cat Pilox Merah', 36, 'klg', 45000), it('Paku Beton 7 cm ( Kuning )', 2, 'dus', 100000), it('Sipatan Tajima', 2, 'bh', 500000), it('Benang Nylon Besar', 24, 'roll', 25000),
  it('Meteran Wipro RM 70 3 Meter', 3, 'bh', 60000), it('Senter Kepala Merek Luby', 4, 'bh', 275000), it('Tinta Furukawa Merah', 2, 'btl', 385000), it('Steker Broco', 15, 'pcs', 20000), it('Kabel Grounding 6 mm', 20, 'mtr', 30000),
  it('Stop Kontak Panasonic', 4, 'pcs', 40000), it('Mata Bor Besi 6 mm', 1, 'pcs', 60000), it('Klem Kabel 2 x 1.5 No. 9', 10, 'pack', 25000), it('Lampu LED Phillips 4000K 12W', 4, 'bh', 115000), it('Stop Kontak 4 Lubang Broco', 24, 'pcs', 75000)];
{
  const s = susun(SSS), K = { kategori: 'BAHAN', ppn: { skema: 'NILAI_LAIN', tarif: 12, pembilang: 11, penyebut: 12, dipungut: false } };
  const h = BLI.hitung({ kontrak: { nilai: 10720000 }, items: s.items, progres: { lalu: {}, ini: s.ini }, konfig: K });
  sama(h.nilaiItem, 10720000, '15 item SPM = nilai kontrak Rp 10.720.000 (exclude PPN)');
  ok(h.prestasi.ini === 10720000 && h.persen.sd === 100 && h.retensi.nilai === 0 && h.uangMuka.potong === 0 && h.dasarTagihan === 10720000, 'BAPM/BAP: prestasi 100% Rp 10.720.000, tanpa uang muka & retensi');
  sama(h.dpp, 9826667, 'DPP nilai lain 11/12 = Faktur Pajak Rp 9.826.667 (9.826.666,67 dibulatkan)');
  sama(h.ppn, 1179200, 'PPN 12% × DPP = Rp 1.179.200 (BAP, Invoice, Faktur, SPM)');
  sama(h.totalTagihan, 11899200, 'total Rp 11.899.200 = BAP, Invoice, Kwitansi & kondisi harga SPM');
  ok(BLI.terbilangRp(11899200) === 'Sebelas Juta Delapan Ratus Sembilan Puluh Sembilan Ribu Dua Ratus Rupiah' && BLI.terbilangRp(10720000) === 'Sepuluh Juta Tujuh Ratus Dua Puluh Ribu Rupiah', 'terbilang BAP (Rp 11.899.200) & BAPM (Rp 10.720.000) sama dengan asli');
  ok(!BLI.bandingkan(h, { invoice: { hargaJual: 10720000, ppn: 1179200, total: 11899200 }, faktur: { dpp: 9826667, ppn: 1179200 }, kwitansi: { total: 11899200 } }).length, 'Invoice, Faktur Pajak & Kwitansi cocok tanpa selisih (tidak perlu opsi ikuti faktur)');
  // 3 surat jalan: 965/SSS/VII (17 Jul, 8 item), 1004/SSS/VII (30 Jul, 6 item), 1011/SSS/VIII (03 Agu, lampu LED)
  const SJ = [[965, 0, 36], [965, 1, 36], [965, 2, 2], [965, 3, 2], [965, 4, 24], [965, 5, 3], [965, 6, 4], [965, 7, 2], [1004, 14, 24], [1004, 8, 15], [1004, 9, 20], [1004, 10, 4], [1004, 11, 1], [1004, 12, 10], [1011, 13, 4]]
    .map(x => ({ noSJ: x[0] + '/SSS', uraian: SSS[x[1]].uraian, qty: x[2] }));
  const r = BLI.rekapSuratJalan(SJ, s.items);
  ok(!r.tidakCocok.length && !BLI.cocokkanVolume('SJ', 'Surat jalan', r.vol, s.ini, s.items).length, '3 surat jalan (965, 1004, 1011) = volume BAPM untuk ke-15 item');
  // kartu gudang Juli 2026 (penerimaan): Stop Kontak Panasonic tercatat 2, sedangkan SJ/BAPM/Invoice 4; 4 item tanpa kartu gudang di berkas
  const KG = { 0: 36, 1: 36, 2: 2, 3: 2, 4: 24, 5: 3, 6: 4, 7: 2, 9: 20, 10: 2, 14: 24 }, vg = {}; Object.keys(KG).forEach(i => { vg['I' + i] = KG[i]; });
  const g = BLI.cocokkanVolume('GUDANG', 'Kartu gudang', vg, s.ini, s.items);
  ok(g.some(t => t.kode === 'GUDANG_BEDA' && t.item === 'I10') && g.filter(t => t.kode === 'GUDANG_KOSONG').map(t => t.item).sort().join() === 'I11,I12,I13,I8',
    'kartu gudang ditandai: Stop Kontak Panasonic 2 ≠ 4 (SJ/BAPM/Invoice); Steker, Mata Bor, Klem Kabel, Lampu LED tidak ada kartu gudangnya');
}

console.log('Volume dari BK, timesheet & surat jalan');
{
  const E = [{ id: 'B', periodeKey: 202608, tagihanKe: 2, items: { a: 2 } }, { id: 'A', periodeKey: 202607, tagihanKe: 1, items: { a: 1.5, b: 1 } }, { id: 'C', periodeKey: 202609, tagihanKe: 3, items: { a: 0.25 } }];
  const v = BLI.volumeDariProgres(E, 'C', { b: 0.5 });
  ok(v.lalu.a === 3.5 && v.lalu.b === 1.5 && v.ini.a === 0.25 && v.sebelum.join() === 'A,B', 'lalu = kumulatif awal + BK sebelumnya (urut periode), ini = BK terpilih');
  const items = [{ id: 'x', uraian: 'Excavator PC200', sat: 'Jam', vol: 500 }, { id: 'y', uraian: 'Dump truck', sat: 'Hari', vol: 60 }, { id: 'z', uraian: 'Crane 50T', sat: 'Bulan', vol: 3 }];
  const ts = [{ itemId: 'x', unit: 'EX-01', baris: [{ tgl: '2026-10-01', mulai: '07:00', selesai: '17:00', istirahat: 1 }, { tgl: '2026-10-02', jam: 5 }, { tgl: '2026-10-03', jam: 0 }] },
    { itemId: 'y', unit: 'B 9123 XY', baris: [{ tgl: '2026-10-01', jam: 8 }, { tgl: '2026-10-02', jam: 8 }] }, { itemId: 'z', unit: 'CR-50', baris: Array.from({ length: 15 }, (_, i) => ({ tgl: '2026-10-' + String(i + 1).padStart(2, '0'), jam: 8 })) }];
  const r = BLI.rekapTimesheet(ts, items, { sewa: { x: { jamMinHari: 7 }, z: { hariPerBulan: 30 } } });
  const g = id => r.item.find(i => i.itemId === id);
  ok(g('x').jam === 14 && g('x').jamTagih === 16 && g('x').vol === 16, 'sewa per jam: 9 + 5 jam, minimum 7 jam/hari → 16 jam ditagih');
  ok(g('y').vol === 2 && g('z').vol === 0.5, 'sewa harian 2 hari; sewa bulanan 15 hari ÷ 30 = 0,5 bulan');
  const c = BLI.cocokkanVolume('TS', 'Timesheet', { x: 16, y: 2, z: 0.5 }, { x: 16, y: 3, z: 0.5 }, items);
  ok(c.length === 1 && c[0].kode === 'TS_BEDA' && c[0].item === 'y', 'timesheet ≠ volume BK terdeteksi per item');
  const sj = BLI.rekapSuratJalan([{ id: 'G1', noSJ: 'SJ-1', kode: '100', qty: 5 }, { id: 'G2', noSJ: 'SJ-2', uraian: 'Semen PCC 50 kg', qty: 7.5 }, { id: 'G3', noSJ: 'SJ-3', kode: '999', qty: 1 }], [{ id: 'm1', kode: '100', uraian: 'Pasir' }, { id: 'm2', kode: '', uraian: 'Semen PCC 50 kg' }]);
  ok(sj.vol.m1 === 5 && sj.vol.m2 === 7.5 && sj.tidakCocok.length === 1, 'surat jalan gudang dicocokkan ke item kontrak (kode, lalu uraian)');
}

console.log('Status, kewenangan & syarat dokumen');
{
  const STF = { peran: 'PENGADAAN', admin: false }, ADM = { peran: 'PENGADAAN', admin: true }, LHT = { peran: 'LIHAT' };
  ok(BLI.transisiBoleh('DRAFT', 'DALAM PENYUSUNAN', STF) === '' && /melihat/.test(BLI.transisiBoleh('DRAFT', 'DALAM PENYUSUNAN', LHT)), 'Lihat tidak dapat mengubah status');
  ok(/GALAT/.test(BLI.transisiBoleh('DALAM PENYUSUNAN', 'MENUNGGU DOKUMEN', STF, { galat: true })), 'dokumen tidak dapat diterbitkan selama ada galat');
  ok(/belum lengkap/.test(BLI.transisiBoleh('MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', STF, { checklistLengkap: false })) && BLI.transisiBoleh('MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', STF, { checklistLengkap: true }) === '', 'Siap Diperiksa hanya bila checklist lengkap');
  ok(/Admin/.test(BLI.transisiBoleh('SIAP DIPERIKSA', 'REVISI', STF)) && BLI.transisiBoleh('SIAP DIPERIKSA', 'REVISI', ADM) === '', 'Revisi hanya oleh Admin');
  ok(BLI.statusEfektif('SIAP DIPERIKSA', { checklistVerified: true }) === 'TERVERIFIKASI' && BLI.statusEfektif('SIAP DIPERIKSA', { checklistVerified: true, bayar: 'DIBAYAR' }) === 'DIBAYAR' && BLI.statusEfektif('SIAP DIPERIKSA', { bayar: 'DIVERIFIKASI' }) === 'PROSES PEMBAYARAN', 'status efektif dibaca dari checklist & status bayar Monitoring SAP');
  ok(/terkunci/.test(BLI.transisiBoleh('SIAP DIPERIKSA', 'DALAM PENYUSUNAN', STF, { checklistVerified: true })) && /DIAJUKAN/.test(BLI.transisiBoleh('SIAP DIPERIKSA', 'BATAL', ADM, { bayar: 'DIAJUKAN' })), 'paket terverifikasi terkunci; tagihan yang sudah diajukan tidak dapat dibatalkan');
  const sb = BLI.syaratKondisional('BAHAN', { items: [{ uraian: 'Semen PCC' }] }), ss = BLI.syaratKondisional('SUBKON', { items: [{ uraian: 'Galian tanah' }], persenSd: 40, uangMuka: 439141500 });
  ok(sb.BAHAN_09.berlaku === false && sb.BAHAN_03 === undefined && sb.BAHAN_11.berlaku === false, 'Bahan: solar tidak berlaku, uji material berlaku (semen), jaminan UM tidak berlaku');
  ok(ss.SUBKON_01.berlaku === false && ss.SUBKON_03 === undefined && ss.SUBKON_08 === undefined && ss.SUBKON_07.berlaku === false, 'Subkon: final account belum (40%), bank garansi UM berlaku, material alam berlaku, ME tidak');
  ok(BLI.nomorDok('BAPP', 1, 'K', '01/BAPP/K') === '01/BAPP/K' && BLI.nomorDok('BAP', 3, '055/SPM/X') === '03/BAP/055/SPM/X', 'nomor BA mengikuti Input Progres; BAP = urut/BAP/no kontrak');
  ok(BLI.kategoriDariNomor('055/SPM/WK-NK.KSO/PDBJ/1726012/2026') === 'BAHAN' && BLI.kategoriDariNomor('001/SPSA/WK') === 'ALAT' && BLI.kategoriDariNomor('00134/SPPP/WK') === 'SUBKON', 'kategori bawaan dari jenis kontrak');
}
console.log('\nLULUS ' + lulus + ' uji mesin tagihan');
