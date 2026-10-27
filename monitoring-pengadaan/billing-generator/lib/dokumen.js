/* disalin dari monitoring-pengadaan/tagihan/sumber/dokumen.js oleh alat/rakit.py — jangan diubah di sini */
/* TAGIHAN DOKUMEN 1.0.0 — model dokumen paket tagihan (BAHAN · ALAT · SUBKON), tidak bergantung pada cara cetak.
 * Model = daftar blok (kop, judul, paragraf, info, tabel, hitung, kotak, ttd, catatan) yang digambar oleh render-html.js
 * (pratinjau & cetak browser) dan render-pdf.js (PDF berkas, pdf-lib). Seluruh angka berasal dari BLI.hitung → semua dokumen
 * dalam satu paket memakai angka yang sama. Teks **tebal** ditandai dengan dua bintang.
 * Tanda tangan, cap & meterai TIDAK pernah dibuat: kolom TTD dibiarkan kosong, invoice & kwitansi selalu berlabel DRAF. */
var BLD = (function () {
  'use strict';
  const B = (typeof BLI !== 'undefined' && BLI) || (typeof require === 'function' ? require('./inti.js') : null);
  const S = v => (v === null || v === undefined) ? '' : String(v);
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const rp = x => B.rupiah(x, { tanpaRp: true }), rpR = x => B.rupiah(x), ang = (x, d) => (N(x) ? B.angka(x, d) : '-'), pc = (x, d) => B.persen(x, d === undefined ? 2 : d);
  const ang2 = x => (N(x) ? N(x).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-');   // volume BAPM/BAPA: 36,00 · 721,363
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const tglObj = iso => { const m = S(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  const tglPanjang = iso => { const d = tglObj(iso); return d ? String(d.getUTCDate()).padStart(2, '0') + ' ' + BULAN[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : '...........'; };
  const kalimatTanggal = iso => { const d = tglObj(iso); if (!d) return 'Pada hari ini ........., tanggal ......... bulan ......... tahun .........';
    return 'Pada hari ini ' + HARI[d.getUTCDay()] + ', tanggal ' + B.terbilang(d.getUTCDate()) + ' bulan ' + BULAN[d.getUTCMonth()] + ' tahun ' + B.terbilang(d.getUTCFullYear()) + ' (' + String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear() + ')'; };
  const KOSONG = '..............................';

  const JUDUL = {
    BAPM: 'BERITA ACARA PENERIMAAN MATERIAL', BAPA: 'BERITA ACARA PEMAKAIAN ALAT', BAPSA: 'BERITA ACARA PENERIMAAN ALAT', BAPP: 'BERITA ACARA PRESTASI PEKERJAAN',
    BAP: 'BERITA ACARA PEMBAYARAN', REKAP_TERIMA: 'REKAPITULASI PENERIMAAN MATERIAL', REKAP_SJ: 'REKAP SURAT JALAN', REKAP_BAYAR: 'REKAP PERHITUNGAN PEMBAYARAN',
    REKAP_TS: 'REKAP TIMESHEET ALAT', SEWA: 'PERHITUNGAN SEWA ALAT', PAKAI: 'REKAP PENGGUNAAN ALAT', REKAP_QTY: 'RINCIAN PROGRES PEKERJAAN',
    INVOICE: 'INVOICE', KWITANSI: 'KWITANSI', CHECKLIST: 'CHECKLIST KELENGKAPAN TAGIHAN'
  };

  /* ---------- konteks bersama ---------- */
  // p: {kategori, jenis, kontrak, vendor, identitas, progres, tanggal, revisi, hasil, lampiran, checklist, riwayatTermin, tempat}
  function ctx(p) {
    const I = p.identitas || {}, V = p.vendor || {}, Kt = p.kontrak || {}, Pg = p.progres || {}, h = p.hasil;
    const kodeBA = S(Pg.kodeBA) && /^BAP[MAP]|^BAPSA$/.test(S(Pg.kodeBA)) ? S(Pg.kodeBA) : ({ BAHAN: 'BAPM', ALAT: 'BAPA', SUBKON: 'BAPP' }[p.kategori] || 'BAPP');
    const ke = Math.max(1, parseInt(Pg.tagihanKe, 10) || 1);
    return {
      p, I, V, Kt, Pg, h, ke, kodeBA,
      vendor: S(V.nama || Kt.namaVendor).toUpperCase() || KOSONG, ttdVendor: V.ttdNama ? S(V.ttdNama).toUpperCase() : '(' + KOSONG + ')', jabVendor: V.ttdJabatan || 'Direktur',
      nomor: kode => B.nomorDok(kode, ke, Kt.noKontrak, kode === kodeBA ? Pg.nomorBA : ''),
      jenisK: S(Kt.jenisKontrak || (S(Kt.noKontrak).split('/')[1] || '')).toUpperCase() || 'Kontrak',
      kapro: I.kapro || { nama: KOSONG, jabatan: 'Kepala Proyek' }, kasi: I.kasi || { nama: KOSONG, jabatan: 'Kasi Pengadaan' },
      kso: I.nama || 'WASKITA - NINDYA, KSO', tempat: p.tempat || I.kota || 'Jakarta', tanggal: p.tanggal || Pg.tanggal || ''
    };
  }
  function kerangka(c, kode, isi, opsi) {
    opsi = opsi || {};
    return {
      kode, judul: opsi.judul || JUDUL[kode] || kode, nomor: opsi.nomor || c.nomor(kode), orientasi: opsi.orientasi || 'P',
      tandaAir: opsi.tandaAir !== undefined ? opsi.tandaAir : (c.p.final ? '' : 'DRAF'),
      kaki: S(c.Kt.noKontrak) + ' · Paket tagihan ke-' + c.ke + ' · Rev. ' + (N(c.p.revisi) || 0) + (c.p.billingId ? ' · ' + c.p.billingId : ''),
      blok: [{ t: 'kop' }, { t: 'judul', teks: (opsi.judul || JUDUL[kode] || kode) + (opsi.sufiks || ''), nomor: 'Nomor : ' + (opsi.nomor || c.nomor(kode)) }].concat(isi)
    };
  }
  const dasarKontrak = c => ({ t: 'info', lebar: 150, baris: [
    ['1.', 'Kontrak / ' + c.jenisK + ' No.', ': **' + S(c.Kt.noKontrak) + '**   Tanggal : ' + tglPanjang(c.Kt.tglKontrak)],
    ['2.', 'Nilai Kontrak', ': **' + rpR(c.h.nilaiKontrak) + '** (belum termasuk PPN)' + (c.h.konfig.nilaiAddendum ? ' · setelah addendum ' + S(c.h.konfig.noAddendum) + ': **' + rpR(c.h.batasNilai) + '**' : '')],
    ['3.', 'Waktu Pelaksanaan', ': ' + tglPanjang(c.Kt.tglKontrak) + ' s/d ' + tglPanjang(c.Kt.tglSelesai)],
    ['4.', 'No. PO SAP', ': ' + (S(c.Kt.noPO) || '-') + (c.Kt.noPR ? '   ·   No. PR : ' + S(c.Kt.noPR) : '')],
    ['5.', 'Periode / Tagihan ke-', ': ' + (S(c.Pg.periode) || '-') + ' / ' + c.ke]] });
  const pihak = c => ({ t: 'info', lebar: 140, baris: [
    ['I.', '**' + S(c.kapro.nama) + '**', ': Selaku ' + S(c.kapro.jabatan) + ', ' + S(c.I.proyek || '') + ', dalam hal ini bertindak untuk dan atas nama **' + c.kso + '**, berkedudukan di ' + S(c.I.alamat || KOSONG) + ', selanjutnya disebut **PIHAK PERTAMA**.'],
    ['II.', '**' + c.ttdVendor + '**', ': Selaku ' + c.jabVendor + ' **' + c.vendor + '**, dalam hal ini bertindak untuk dan atas nama **' + c.vendor + '**, berkedudukan di ' + (S(c.V.alamat) || KOSONG) + ', selanjutnya disebut **PIHAK KEDUA**.']] });
  const ttd3 = (c, kolom) => ({ t: 'ttd', tempat: c.tempat + ', ' + tglPanjang(c.tanggal), kolom });
  const tVendor = c => ({ atas: 'PIHAK KEDUA', instansi: c.vendor, nama: c.ttdVendor, jabatan: c.jabVendor });
  const tKasi = c => ({ atas: 'Diperiksa oleh,', instansi: c.kso, nama: S(c.kasi.nama), jabatan: S(c.kasi.jabatan) });
  const tKapro = (c, atas) => ({ atas: atas || 'PIHAK PERTAMA', instansi: c.kso, nama: S(c.kapro.nama), jabatan: S(c.kapro.jabatan) });
  const isiItems = h => h.items;
  const jml = (h, f) => h.items.reduce((a, r) => a + (r.judul ? 0 : N(r[f])), 0);

  /* ---------- penomoran per bagian (seperti BAPP proyek: nomor mulai lagi dari 1 di bawah setiap judul A/B) ---------- */
  function nomorLokal(items) { const o = {}; let n = 0; items.forEach(r => { if (r.judul && !r.nol) n = 0; else o[r.id] = ++n; }); return o; }
  // kotak paraf verifikasi internal (kosong — diparaf manual), urutan sesuai BAP/kwitansi proyek
  function paraf(c) {
    const G = (c.I.paraf && c.I.paraf.length ? c.I.paraf : [['VERIFIKASI', ['Staf KSDM', 'Staf Adkon']], ['DIPERIKSA', ['Kasi Adkon', 'Kasi Danloglat', 'Kasi KSDM', 'Kasi QHSE']], ['DISETUJUI', ['Wakapro', 'Kapro']]]);
    const peran = [].concat(...G.map(g => g[1])), n = peran.length;
    const grup = []; G.forEach(g => { grup.push({ teks: g[0], span: g[1].length }); for (let i = 1; i < g[1].length; i++) grup.push(null); });
    return { t: 'tabel', ukuran: 5.6, lebarPersen: 58, tengah: true, utuh: true, kolom: peran.map(() => ({ l: 1, r: 'c' })),
      kepala: [peran.map((_, i) => ({ teks: String(i + 1), idx: 1 })), grup, peran.map(p => ({ teks: p }))], isi: [{ tinggi: 24, sel: peran.map(() => '') }] };
  }

  /* ---------- BA progres: BAPM / BAPA / BAPP (format BAPP 01/BAPP/02/SPPP proyek) ---------- */
  function docBA(c) {
    const h = c.h, kode = c.kodeBA, P = kode === 'BAPP', no = nomorLokal(h.items);
    // BAPP (Subkon, format BAPP CV Mirsel): volume 6 kolom termasuk BA yang ditagihkan. BAPM/BAPA (format BAPM PT Surya Salim): progres real volume 4 kolom.
    const kolom = P ? 'MACAM PEKERJAAN' : 'JENIS ITEM';
    const kepala = !P ? [[{ teks: 'NO.' }, { teks: kolom }, { teks: 'VOLUME KONTRAK' }, { teks: 'SAT' }, { teks: 'PROGRES REAL VOLUME', span: 4 }, null, null, null, { teks: 'HARGA (Rp)' }, { teks: 'JUMLAH HARGA (Rp)' }],
      [{ teks: '' }, { teks: '' }, { teks: '' }, { teks: '' }, { teks: 'YG LALU' }, { teks: 'SAAT INI' }, { teks: 'SD. SAAT INI' }, { teks: 'SISA' }, { teks: '' }, { teks: '' }],
      ['1', '2', '3', '4', '5', '6', '7=5+6', '8=3-7', '9', '10 = 6 x 9'].map(t => ({ teks: t, idx: 1 }))] : [[{ teks: 'NO.' }, { teks: kolom }, { teks: 'SATUAN' }, { teks: 'VOLUME', span: 6 }, null, null, null, null, null, { teks: 'HARGA SATUAN (Rp)' }, { teks: 'JUMLAH HARGA (Rp) YANG DITAGIHKAN' }],
      [{ teks: '' }, { teks: '' }, { teks: '' }, { teks: 'SESUAI SPK/ KONTRAK' }, { teks: 'S/D SAAT INI' }, { teks: 'BA S/D YANG LALU' }, { teks: 'PERIODE INI' }, { teks: 'BA YANG DITAGIHKAN' }, { teks: 'SISA YANG BELUM DI BA KAN' }, { teks: '' }, { teks: '' }],
      ['1', '2', '3', '4', '5 = 6+7', '6', '7', '8', '9 = 4-5', '10', '11 = 8×10'].map(t => ({ teks: t, idx: 1 }))];
    const isi = !P ? h.items.map(r => r.nol ? { sel: [String(no[r.id]), r.uraian, '-', r.sat || '-', '-', '-', '-', '-', '-', '-'] } : r.judul ? { gaya: 'judul', sel: ['', r.uraian, '', '', '', '', '', '', '', ''] }
      : { sel: [String(no[r.id]), r.uraian, ang2(r.vol), r.sat, ang2(r.lalu), ang2(r.ini), ang2(r.sd), ang2(r.sisa), r.harga ? rp(r.harga) : 'include', r.jmlIni ? rp(r.jmlIni) : '-'] })
      : h.items.map(r => r.nol ? { sel: [String(no[r.id]), r.uraian, r.sat || '-', '-', '-', '-', '-', '-', '-', '-', '-'] } : r.judul ? { gaya: 'judul', sel: ['', r.uraian, '', '', '', '', '', '', '', '', ''] }
      : { sel: [String(no[r.id]), r.uraian, r.sat, ang(r.vol), ang(r.sd), ang(r.lalu), ang(r.ini), ang(r.ini), ang(r.sisa), r.harga ? rp(r.harga) : 'include', r.jmlIni ? rp(r.jmlIni) : '-'] });
    isi.push(!P ? { gaya: 'jumlah', sel: ['', 'JUMLAH', null, null, null, null, null, null, null, rp(h.prestasi.ini)], span: [0, 8] } : { gaya: 'jumlah', sel: ['', 'JUMLAH', '', '', '', '', '', '', '', '', rp(h.prestasi.ini)] });
    const kolomTabel = !P ? [{ l: 3.5, r: 'c' }, { l: 30 }, { l: 8, r: 'r' }, { l: 5.5, r: 'c' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 9, r: 'r' }, { l: 11, r: 'r' }]
      : [{ l: 3.5, r: 'c' }, { l: 24 }, { l: 6, r: 'c' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 7.5, r: 'r' }, { l: 9, r: 'r' }, { l: 11, r: 'r' }];
    const bayar = [{ no: '1.', label: 'Prestasi s/d saat ini', pct: pc(h.persen.sd), tanda: '', nilai: rp(h.prestasi.sd) }, { no: '2.', label: 'Prestasi yang lalu', pct: pc(h.persen.lalu), tanda: '', nilai: h.prestasi.lalu ? rp(h.prestasi.lalu) : '-' },
      { no: '3.', label: 'Prestasi yang dapat dibayarkan', pct: pc(h.persen.ini), tanda: '', nilai: rp(h.prestasi.ini), garis: true }, { no: '4.', label: 'Potongan :', pct: null, tanda: '', nilai: '' },
      { no: '', label: '- Uang Muka', pct: h.uangMuka.total ? pc(h.uangMuka.persen) : pc(0), tanda: '(-)', nilai: h.uangMuka.potong ? rp(h.uangMuka.potong) : '-' },
      { no: '', label: '- Retensi', pct: pc(h.retensi.persen), tanda: '(-)', nilai: h.retensi.nilai ? rp(h.retensi.nilai) : '-', garis: !h.potonganLain.length }]
      .concat(h.potonganLain.map((x, i) => ({ no: '', label: '- ' + x.nama, pct: x.persen ? pc(x.persen) : '', tanda: '(-)', nilai: rp(x.nilai), garis: i === h.potonganLain.length - 1 })))
      .concat([{ no: '5.', label: 'Jumlah pembayaran yang diterima', pct: '', tanda: '', nilai: rp(h.dasarTagihan), tebal: true }]);
    return kerangka(c, kode, [
      { t: 'p', teks: kalimatTanggal(c.tanggal) + ', kami yang bertanda tangan di bawah ini :' },
      { t: 'info', lebar: 70, baris: [['I.', 'Dari', ': **' + c.vendor + '** — Sebagai Pihak Kedua'], ['II.', 'Kepada', ': **' + c.kso + '** ' + S(c.I.proyek || '') + ' — Sebagai Pihak Pertama']] },
      { t: 'p', teks: 'Menerangkan bahwa kedua belah pihak telah setuju dan sepakat melakukan pemeriksaan ' + (P ? 'pekerjaan' : 'pengadaan') + ' dan serah terima berdasarkan :' },
      dasarKontrak(c), { t: 'p', teks: 'Dengan rincian sebagai berikut :' },
      { t: 'tabel', ukuran: 6.6, kolom: kolomTabel, kepala, isi },
      { t: 'p', teks: '**Maka Pihak Kedua berhak menerima pembayaran dengan perhitungan sebagai berikut :**' },
      { t: 'hitung', baris: bayar },
      { t: 'kotak', teks: 'Terbilang : == ' + B.terbilangRp(h.dasarTagihan) + ' ==' },
      { t: 'p', teks: (P ? 'Pekerjaan' : kode === 'BAPM' ? 'Material' : 'Alat') + ' tersebut di atas dalam kondisi baik, perlengkapan serta surat-surat terlampir.' },
      ttd3(c, [tKapro(c, 'Mengetahui,'), { atas: 'Yang Menerima,', instansi: c.kso, nama: S(c.kasi.nama), jabatan: S(c.kasi.jabatan) }, { atas: 'Yang Menyerahkan,', instansi: c.vendor, nama: c.ttdVendor, jabatan: c.jabVendor }]),
      { t: 'catatan', teks: '**Catatan :** ' + kode + ' ini harus dilampirkan pada saat permintaan pembayaran.' }], { judul: (JUDUL[kode] || kode) + ' (' + kode + ')' });
  }

  /* ---------- baris perhitungan pembayaran (BAP & rekap) ---------- */
  function barisBayar(h) {
    const L = [], tambah = (no, label, pct, tanda, nilai, o) => L.push(Object.assign({ no, label, pct: pct === null ? '' : pct, tanda: tanda || '', nilai }, o || {}));
    if (h.jenis === 'UANG_MUKA') {
      tambah('1.', 'Nilai Kontrak (belum termasuk PPN)', '', '', rp(h.nilaiKontrak));
      tambah('2.', 'Uang Muka', pc(h.uangMuka.persen), '', rp(h.dasarTagihan), { garis: true });
    } else if (h.jenis === 'RETENSI') {
      tambah('1.', 'Retensi tertahan s/d saat ini', '', '', rp(h.retensi.sebelum));
      tambah('2.', 'Retensi yang dilepas (dibayarkan)', '', '', rp(h.dasarTagihan), { garis: true });
    } else {
      tambah('1.', 'Prestasi s/d saat ini', pc(h.persen.sd), '', rp(h.prestasi.sd));
      tambah('2.', 'Prestasi s/d yang lalu', pc(h.persen.lalu), '(-)', rp(h.prestasi.lalu));
      tambah('3.', 'Prestasi yang dapat dibayarkan saat ini', pc(h.persen.ini), '', rp(h.prestasi.ini), { garis: true });
      tambah('4.', 'Potongan :', null, '', '');
      tambah('', '- Pengembalian Uang Muka', h.uangMuka.total ? pc(h.uangMuka.persen) : '0%', '(-)', rp(h.uangMuka.potong));
      tambah('', '- Retensi', pc(h.retensi.persen), '(-)', rp(h.retensi.nilai), { garis: !h.potonganLain.length });
      h.potonganLain.forEach((x, i) => tambah('', '- ' + x.nama, x.persen ? pc(x.persen) : '', '(-)', rp(x.nilai), { garis: i === h.potonganLain.length - 1 }));
      tambah('5.', 'Jumlah tagihan (sebelum PPN)', '', '', rp(h.dasarTagihan), { tebal: true });
    }
    const k = h.konfig.ppn, lbl = k.skema === 'NILAI_LAIN' ? 'DPP Nilai Lain ' + k.pembilang + '/' + k.penyebut : 'Dasar Pengenaan Pajak';
    const n = h.jenis === 'PROGRES' ? 6 : 3;
    tambah(n + '.', lbl + (h.ppnPerItem ? ' (per baris barang)' : ''), '', '', rp(h.dpp));
    tambah((n + 1) + '.', 'PPN' + (k.skema === 'TIDAK_DIPUNGUT' ? ' (tidak dipungut' + (k.keterangan ? ': ' + k.keterangan : '') + ')' : k.skema === 'DIBEBASKAN' ? ' (dibebaskan' + (k.keterangan ? ': ' + k.keterangan : '') + ')' : ''), k.tarif !== null && k.tarif !== undefined ? pc(k.tarif, k.tarif % 1 ? 2 : 0) : '-', '', rp(h.ppn), { garis: true });
    tambah((n + 2) + '.', 'Jumlah tagihan termasuk PPN', '', '', rp(h.totalTagihan), { tebal: true });
    if (h.pph.tarif) tambah((n + 3) + '.', (h.pph.jenis || 'PPh') + ' (dipotong saat pembayaran)', pc(h.pph.tarif), '(-)', rp(h.pph.nilai));
    if (h.ppnDipungut) tambah(h.pph.tarif ? (n + 4) + '.' : (n + 3) + '.', 'PPN dipungut & disetor Pihak Pertama (pemungut PPN)', '', '(-)', rp(h.ppn), { garis: true });
    tambah('', 'Jumlah yang dibayarkan kepada Pihak Kedua', '', '=', 'Rp ' + rp(h.neto), { tebal: true, total: true });
    return L;
  }

  function docBAP(c) {
    const h = c.h, ba = c.nomor(c.kodeBA), k = h.konfig.ppn, P = h.jenis === 'PROGRES';
    const pembuka = [{ t: 'p', teks: kalimatTanggal(c.tanggal) + ', kami yang bertanda tangan di bawah ini :' }, pihak(c),
      { t: 'p', teks: 'Menerangkan bahwa kedua belah pihak telah melakukan pemeriksaan atas ' + (S(c.Kt.uraian) || 'pekerjaan / pengadaan') + ' sesuai lampiran pada ' + S(c.I.proyek || '') + ' berdasarkan :' },
      { t: 'info', lebar: 150, baris: [['1', 'Kontrak/' + c.jenisK + ' No.', ': **' + S(c.Kt.noKontrak) + '**   Tanggal, ' + tglPanjang(c.Kt.tglKontrak)], ['2', 'Jangka Waktu Pelaksanaan', ': ' + tglPanjang(c.Kt.tglKontrak) + ' s/d ' + tglPanjang(c.Kt.tglSelesai)],
        ['3', 'Nilai Kontrak', ': **' + rpR(h.nilaiKontrak) + '** (Exclude PPN)' + (h.konfig.nilaiAddendum ? ' · setelah addendum ' + S(h.konfig.noAddendum) + ': **' + rpR(h.batasNilai) + '**' : '')], ['4', 'No. PO SAP', ': ' + (S(c.Kt.noPO) || '-')]] }];
    if (!P) return kerangka(c, 'BAP', pembuka.concat([
      { t: 'p', teks: 'Maka **PIHAK KEDUA** berhak menerima pembayaran ' + ({ UANG_MUKA: 'uang muka', RETENSI: 'pelepasan retensi' }[h.jenis]) + ' dengan perhitungan sebagai berikut :' },
      { t: 'hitung', baris: barisBayar(h) }, { t: 'kotak', teks: 'Terbilang : == ' + B.terbilangRp(h.totalTagihan) + ' ==' },
      { t: 'p', teks: 'Demikian Berita Acara Pembayaran ini dibuat untuk dapat dipergunakan sebagaimana mestinya.' }, ttd3(c, [tVendor(c), { kosong: true }, tKapro(c)]), paraf(c)]));
    // rincian a–b–c seperti BAP proyek: s/d saat ini, yang lalu, saat ini (persen × dasar = nilai)
    const nk = h.nilaiKontrak, umSd = h.uangMuka.kembaliSebelum + h.uangMuka.potong, retSd = h.retensi.sebelum + h.retensi.nilai;
    const pr = x => nk ? x / nk * 100 : 0, br = (lbl, p, dasar, nilai) => ({ sel: [lbl, pc(p), 'x', 'Rp', dasar ? rp(dasar) : '-', '=', 'Rp', nilai ? rp(nilai) : '-', '', '', ''] });
    const sub = (nilai) => ({ gaya: 'garisAtas', sel: ['', '', '', '', '', '', '', '', '', 'Rp', nilai ? rp(nilai) : '-'] });
    const rinci = [{ gaya: 'judulPolos', sel: ['a  Perhitungan Pembayaran', null, null, null, null, null, null, null, null, null, null], span: [11] },
      br('- Prestasi s/d saat ini', h.persen.sd, nk, h.prestasi.sd), br('- Prestasi yang lalu', h.persen.lalu, nk, h.prestasi.lalu), br('- Prestasi saat ini', h.persen.ini, nk, h.prestasi.ini), sub(h.prestasi.ini),
      { gaya: 'judulPolos', sel: ['b  Potongan Retensi', null, null, null, null, null, null, null, null, null, null], span: [11] },
      br('Potongan Retensi s/d saat ini', h.retensi.persen, h.prestasi.sd, retSd), br('Potongan Retensi yang lalu', h.prestasi.lalu ? h.retensi.sebelum / h.prestasi.lalu * 100 : 0, h.prestasi.lalu, h.retensi.sebelum),
      br('Potongan Retensi saat ini', h.retensi.persen, h.prestasi.ini, h.retensi.nilai), sub(h.retensi.nilai),
      { gaya: 'judulPolos', sel: ['c  Pengembalian Uang Muka', null, null, null, null, null, null, null, null, null, null], span: [11] },
      br('Pengembalian Uang Muka s/d saat ini', pr(umSd), nk, umSd), br('Pengembalian Uang Muka yang lalu', pr(h.uangMuka.kembaliSebelum), nk, h.uangMuka.kembaliSebelum), br('Pengembalian Uang Muka saat ini', pr(h.uangMuka.potong), nk, h.uangMuka.potong), sub(h.uangMuka.potong)];
    if (h.potonganLain.length) { rinci.push({ gaya: 'judulPolos', sel: ['d  Potongan Lain', null, null, null, null, null, null, null, null, null, null], span: [11] }); h.potonganLain.forEach(x => rinci.push({ sel: ['- ' + x.nama, x.persen ? pc(x.persen) : '', '', '', '', '=', 'Rp', rp(x.nilai), '', '', ''] })); rinci.push(sub(h.potonganLain.reduce((a, x) => a + x.nilai, 0))); }
    const ket = k.skema === 'NILAI_LAIN' ? ' ' + pc(k.tarif, k.tarif % 1 ? 2 : 0) + ' × DPP ' + k.pembilang + '/' + k.penyebut + ' Rp ' + rp(h.dpp) : k.skema === 'NORMAL' ? ' ' + pc(k.tarif, k.tarif % 1 ? 2 : 0) : k.skema === 'TIDAK_DIPUNGUT' ? ' (tidak dipungut)' : k.skema === 'DIBEBASKAN' ? ' (dibebaskan)' : '';
    rinci.push({ gaya: 'kotak', sel: ['JUMLAH SETELAH DIKURANGI RETENSI, UANG MUKA (a-b-c' + (h.potonganLain.length ? '-d' : '') + ')', null, null, null, null, null, null, null, null, 'Rp', rp(h.dasarTagihan)], span: [9] },
      { gaya: 'kotak', sel: ['PAJAK PERTAMBAHAN NILAI (PPN)' + ket, null, null, null, null, null, null, null, null, 'Rp', rp(h.ppn)], span: [9] },
      { gaya: 'kotak', sel: ['TOTAL', null, null, null, null, null, null, null, null, 'Rp', rp(h.totalTagihan)], span: [9] });
    const catPph = h.pph.tarif || h.ppnDipungut ? [{ t: 'catatan', teks: (h.pph.tarif ? (h.pph.jenis || 'PPh') + ' ' + pc(h.pph.tarif) + ' Rp ' + rp(h.pph.nilai) + ' dipotong saat pembayaran. ' : '') + (h.ppnDipungut ? 'PPN dipungut & disetor Pihak Pertama. ' : '') + 'Dibayarkan kepada Pihak Kedua: **' + rpR(h.neto) + '**.' }] : [];
    return kerangka(c, 'BAP', pembuka.concat([
      { t: 'p', teks: 'Menyatakan bahwa prestasi Pihak Kedua s/d tanggal ' + tglPanjang(c.Pg.tanggal || c.tanggal) + ' telah mencapai **' + pc(h.persen.sd) + '** sesuai dengan ' + (JUDUL[c.kodeBA] || 'Berita Acara').replace(/\b\w+/g, w => w.charAt(0) + w.slice(1).toLowerCase()) + ' ' + ba + '. Maka Pihak Kedua berhak menerima pembayaran dengan perincian sebagai berikut :' },
      { t: 'tabel', polos: true, utuh: true, ukuran: 7.6, kolom: [{ l: 30 }, { l: 7, r: 'r' }, { l: 2.5, r: 'c' }, { l: 3, r: 'c' }, { l: 13, r: 'r' }, { l: 2.5, r: 'c' }, { l: 3, r: 'c' }, { l: 12, r: 'r' }, { l: 4 }, { l: 3, r: 'c' }, { l: 14, r: 'r' }], kepala: [], isi: rinci },
      { t: 'kotak', teks: 'Terbilang : == ' + B.terbilangRp(h.totalTagihan) + ' ==' }]).concat(catPph, [
      { t: 'p', teks: 'Demikian Berita Acara Pembayaran ini dibuat untuk dapat dipergunakan sebagaimana mestinya.' },
      ttd3(c, [tVendor(c), { kosong: true }, tKapro(c)]), paraf(c)]), { judul: 'BERITA ACARA PEMBAYARAN (BAP)' });
  }

  function docRekapBayar(c) {
    const h = c.h, R = (c.p.riwayatTermin || []).filter(x => N(x.tagihanKe) !== c.ke).concat([{ tagihanKe: c.ke, nomor: c.nomor('BAP'), jenis: h.jenis, prestasi: h.prestasi.ini, um: h.uangMuka.potong, ret: h.jenis === 'RETENSI' ? -h.dasarTagihan : h.retensi.nilai, dasar: h.dasarTagihan, ppn: h.ppn, total: h.totalTagihan, pph: h.pph.nilai, neto: h.neto, status: 'Paket ini' }])
      .sort((a, b) => N(a.tagihanKe) - N(b.tagihanKe));
    let kum = 0, kumRet = 0, kumUm = 0;
    const isi = R.map(x => { kum += N(x.prestasi); kumRet += N(x.ret); kumUm += N(x.um);
      return { gaya: x.status === 'Paket ini' ? 'sorot' : '', sel: [String(x.tagihanKe), S(x.nomor), { PROGRES: 'Progres', UANG_MUKA: 'Uang muka', RETENSI: 'Retensi' }[x.jenis] || 'Progres', rp(x.prestasi), rp(x.um), rp(x.ret), rp(x.dasar), rp(x.ppn), rp(x.total), rp(x.pph), rp(x.neto), S(x.status)] }; });
    isi.push({ gaya: 'jumlah', sel: ['', 'JUMLAH', '', rp(kum), rp(kumUm), rp(kumRet), rp(R.reduce((a, x) => a + N(x.dasar), 0)), rp(R.reduce((a, x) => a + N(x.ppn), 0)), rp(R.reduce((a, x) => a + N(x.total), 0)), rp(R.reduce((a, x) => a + N(x.pph), 0)), rp(R.reduce((a, x) => a + N(x.neto), 0)), ''] });
    return kerangka(c, 'REKAP_BAYAR', [dasarKontrak(c),
      { t: 'tabel', ukuran: 6.6, kolom: [{ l: 4, r: 'c' }, { l: 17 }, { l: 7 }, { l: 9, r: 'r' }, { l: 8, r: 'r' }, { l: 8, r: 'r' }, { l: 9, r: 'r' }, { l: 8, r: 'r' }, { l: 9, r: 'r' }, { l: 7, r: 'r' }, { l: 9, r: 'r' }, { l: 7 }],
        kepala: [[{ teks: 'KE' }, { teks: 'NO. BAP' }, { teks: 'JENIS' }, { teks: 'PRESTASI' }, { teks: 'PENGEMB. UM' }, { teks: 'RETENSI' }, { teks: 'TAGIHAN' }, { teks: 'PPN' }, { teks: 'TOTAL + PPN' }, { teks: 'PPh' }, { teks: 'DIBAYARKAN' }, { teks: 'STATUS' }]], isi },
      { t: 'info', lebar: 210, baris: [['', 'Uang muka diterima / dikembalikan s/d ini', ': ' + rpR(h.uangMuka.total) + ' / ' + rpR(h.uangMuka.kembaliSebelum + h.uangMuka.potong) + ' (sisa ' + rpR(h.uangMuka.sisa) + ')'],
        ['', 'Retensi tertahan s/d saat ini', ': ' + rpR(h.retensi.kumulatif)], ['', 'Sisa nilai kontrak belum ditagih', ': ' + rpR(Math.max(0, h.batasNilai - h.prestasi.sd))]] },
      { t: 'catatan', teks: 'Angka per termin terdahulu diambil dari paket tagihan tersimpan di Monitoring SAP; perhitungan dilakukan mesin tagihan ' + B.VERSI + ' (pembulatan ' + (h.konfig.pembulatan === 'AKHIR' ? 'di akhir' : 'per komponen') + ').' },
      ttd3(c, [{ atas: 'Dibuat oleh,', instansi: c.kso, nama: S((c.p.pembuat && c.p.pembuat.nama) || KOSONG), jabatan: S((c.p.pembuat && c.p.pembuat.jabatan) || 'Staf Pengadaan') }, tKasi(c), tKapro(c, 'Disetujui oleh,')])], { orientasi: 'L' });
  }

  function docRekapQty(c) {   // RINCIAN PROGRES PEKERJAAN (lampiran BAPP proyek): bobot per item & progres s/d lalu, periode ini, s/d periode ini
    const h = c.h, no = nomorLokal(h.items), tot = h.items.reduce((a, r) => a + (r.judul ? 0 : r.jmlKontrak), 0) || 1, bb = x => pc(x / tot * 100);
    const isi = h.items.map(r => r.nol ? { sel: [String(no[r.id]), r.uraian, '-', r.sat || '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] } : r.judul ? { gaya: 'judul', sel: ['', r.uraian, '', '', '', '', '', '', '', '', '', '', ''] }
      : { sel: [String(no[r.id]), r.uraian, ang(r.vol), r.sat, r.harga ? rp(r.harga) : 'include', r.jmlKontrak ? rp(r.jmlKontrak) : '-', bb(r.jmlKontrak), r.lalu ? ang(r.lalu) : '-', bb(r.jmlLalu), r.ini ? ang(r.ini) : '-', bb(r.jmlIni), r.sd ? ang(r.sd) : '-', bb(r.jmlSd)] });
    isi.push({ gaya: 'jumlah', sel: ['', 'JUMLAH', '', '', '', rp(tot), '100,00%', '', bb(h.prestasi.lalu), '', bb(h.prestasi.ini), '', bb(h.prestasi.sd)] });
    return kerangka(c, 'REKAP_QTY', [
      { t: 'info', lebar: 120, baris: [['', 'Pekerjaan', ': ' + (S(c.Kt.uraian) || '-')], ['', 'Kontrak / Vendor', ': ' + S(c.Kt.noKontrak) + ' · ' + c.vendor], ['', 'Proyek', ': ' + S(c.I.proyek || '')], ['', 'Periode / BA', ': ' + (S(c.Pg.periode) || '-') + ' · ' + c.nomor(c.kodeBA)]] },
      { t: 'tabel', ukuran: 6.6, kolom: [{ l: 3.5, r: 'c' }, { l: 26 }, { l: 6.5, r: 'r' }, { l: 4, r: 'c' }, { l: 8, r: 'r' }, { l: 10, r: 'r' }, { l: 6, r: 'r' }, { l: 6, r: 'r' }, { l: 5.5, r: 'r' }, { l: 6, r: 'r' }, { l: 5.5, r: 'r' }, { l: 6, r: 'r' }, { l: 5.5, r: 'r' }],
        kepala: [[{ teks: 'NO' }, { teks: 'URAIAN' }, { teks: 'VOLUME' }, { teks: 'SAT' }, { teks: 'HARGA SATUAN (Rp)' }, { teks: 'JUMLAH HARGA (Rp)' }, { teks: 'BOBOT (%)' }, { teks: 'S/D PERIODE LALU', span: 2 }, null, { teks: 'PERIODE INI', span: 2 }, null, { teks: 'S/D PERIODE INI', span: 2 }, null],
          [{ teks: '' }, { teks: '' }, { teks: '' }, { teks: '' }, { teks: '' }, { teks: '' }, { teks: '' }, { teks: 'PROGRES' }, { teks: 'BOBOT' }, { teks: 'PROGRES' }, { teks: 'BOBOT' }, { teks: 'PROGRES' }, { teks: 'BOBOT' }]], isi },
      ttd3(c, [tKapro(c, 'Mengetahui / Menyetujui,'), { atas: 'Diperiksa oleh,', instansi: c.kso, nama: S((c.I.adkon && c.I.adkon.nama) || KOSONG), jabatan: S((c.I.adkon && c.I.adkon.jabatan) || 'Kasi Administrasi Kontrak') },
        { atas: 'Diperiksa oleh,', instansi: c.kso, nama: S(c.kasi.nama), jabatan: S(c.kasi.jabatan) }, { atas: 'Diajukan oleh,', instansi: c.vendor, nama: c.ttdVendor, jabatan: c.jabVendor }])], { orientasi: 'L', judul: 'RINCIAN PROGRES PEKERJAAN' });
  }

  function docRekapTerima(c) {
    const h = c.h, sj = (c.p.lampiran && c.p.lampiran.sjVol) || {};
    const isi = h.items.filter(r => !r.judul).map(r => ({ sel: [String(r.no), r.uraian, r.sat, ang(r.vol), ang(r.lalu), ang(r.ini), ang(r.sd), ang(r.sisa), sj[r.id] === undefined ? '-' : ang(sj[r.id]), sj[r.id] === undefined ? 'tidak ada SJ' : Math.round(N(sj[r.id]) * 1e4) === Math.round(r.ini * 1e4) ? 'sesuai' : 'BEDA'] }));
    return kerangka(c, 'REKAP_TERIMA', [dasarKontrak(c),
      { t: 'tabel', ukuran: 7, kolom: [{ l: 4, r: 'c' }, { l: 34 }, { l: 6, r: 'c' }, { l: 9, r: 'r' }, { l: 9, r: 'r' }, { l: 9, r: 'r' }, { l: 9, r: 'r' }, { l: 8, r: 'r' }, { l: 9, r: 'r' }, { l: 8, r: 'c' }],
        kepala: [[{ teks: 'NO' }, { teks: 'MATERIAL' }, { teks: 'SAT' }, { teks: 'VOL KONTRAK' }, { teks: 'DITERIMA S/D LALU' }, { teks: 'DITERIMA PERIODE INI (BK)' }, { teks: 'S/D SAAT INI' }, { teks: 'SISA' }, { teks: 'QTY SURAT JALAN' }, { teks: 'COCOK' }]], isi },
      { t: 'catatan', teks: 'Volume periode ini mengikuti Input Progres (BK ' + S(c.Pg.nomorBA || '-') + '). Qty surat jalan dari penerimaan gudang Monitoring SAP yang ditautkan ke paket ini.' },
      ttd3(c, [{ atas: 'Petugas Gudang,', instansi: c.kso, nama: KOSONG, jabatan: 'Gudang' }, tKasi(c), tKapro(c, 'Mengetahui,')])]);
  }
  function docRekapSJ(c) {
    const L = (c.p.lampiran && c.p.lampiran.sj) || [];
    const isi = L.map((g, i) => ({ sel: [String(i + 1), tglPanjang(g.tanggal), S(g.noSJ), S(g.kode), S(g.uraian), ang(g.qty), S(g.sat), S(g.bonNomor)] }));
    if (!isi.length) isi.push({ sel: ['', 'Belum ada penerimaan gudang yang ditautkan ke paket ini.', '', '', '', '', '', ''] });
    isi.push({ gaya: 'jumlah', sel: ['', L.length + ' surat jalan', '', '', '', '', '', ''] });
    return kerangka(c, 'REKAP_SJ', [dasarKontrak(c),
      { t: 'tabel', ukuran: 7, kolom: [{ l: 4, r: 'c' }, { l: 12 }, { l: 14 }, { l: 11 }, { l: 32 }, { l: 8, r: 'r' }, { l: 6, r: 'c' }, { l: 22 }],
        kepala: [[{ teks: 'NO' }, { teks: 'TANGGAL' }, { teks: 'NO. SURAT JALAN' }, { teks: 'KODE' }, { teks: 'MATERIAL' }, { teks: 'QTY' }, { teks: 'SAT' }, { teks: 'NO. BON PERMINTAAN' }]], isi },
      ttd3(c, [{ atas: 'Petugas Gudang,', instansi: c.kso, nama: KOSONG, jabatan: 'Gudang' }, tKasi(c), tVendor(c)])]);
  }

  /* ---------- ALAT ---------- */
  const tsRekap = c => (c.p.lampiran && c.p.lampiran.tsRekap) || { item: [] };
  function docRekapTS(c) {
    const R = tsRekap(c), isi = [];
    R.item.forEach(it => it.unit.forEach((u, i) => isi.push({ sel: [i ? '' : it.uraian, S(u.unit), S(u.operator), String(u.hari), ang(u.jam, 2), ang(u.jamTagih, 2), u.vol === null ? '-' : ang(u.vol), i ? '' : it.sat] })));
    if (!isi.length) isi.push({ sel: ['Belum ada timesheet pada paket ini.', '', '', '', '', '', '', ''] });
    return kerangka(c, 'REKAP_TS', [dasarKontrak(c),
      { t: 'tabel', ukuran: 7, kolom: [{ l: 28 }, { l: 13 }, { l: 15 }, { l: 7, r: 'r' }, { l: 9, r: 'r' }, { l: 9, r: 'r' }, { l: 9, r: 'r' }, { l: 8, r: 'c' }],
        kepala: [[{ teks: 'ALAT (ITEM KONTRAK)' }, { teks: 'UNIT / NO. POL / SN' }, { teks: 'OPERATOR' }, { teks: 'HARI KERJA' }, { teks: 'JAM KERJA' }, { teks: 'JAM DITAGIH' }, { teks: 'VOLUME' }, { teks: 'SAT' }]], isi },
      { t: 'catatan', teks: 'Jam ditagih memperhitungkan jam minimum per hari sesuai konfigurasi kontrak. Timesheet asli bertanda tangan wajib dilampirkan (checklist ALAT_05).' },
      ttd3(c, [{ atas: 'Dibuat oleh,', instansi: c.vendor, nama: c.ttdVendor, jabatan: c.jabVendor }, { atas: 'Diperiksa oleh,', instansi: c.kso, nama: KOSONG, jabatan: 'Pelaksana / Peralatan' }, tKasi(c)])]);
  }
  function docSewa(c) {
    const h = c.h, R = tsRekap(c), isi = h.items.filter(r => !r.judul).map(r => {
      const t = R.item.find(x => x.itemId === r.id), cfg = h.konfig.sewa[r.id] || {}, basis = cfg.basis || B.basisDariSatuan(r.sat);
      return { sel: [String(r.no), r.uraian, r.sat, { JAM: 'per jam' + (cfg.jamMinHari ? ' (min. ' + cfg.jamMinHari + ' jam/hari)' : ''), HARI: 'per hari', BULAN: 'per bulan' + (cfg.hariPerBulan ? ' (' + cfg.hariPerBulan + ' hari)' : cfg.jamPerBulan ? ' (' + cfg.jamPerBulan + ' jam)' : ''), TETAP: 'lumpsum / tetap' }[basis] || basis,
        t && t.volTerukur ? ang(t.vol) : '-', ang(r.ini), rp(r.harga), rp(r.jmlIni), t && t.volTerukur ? (Math.round(t.vol * 1e4) === Math.round(r.ini * 1e4) ? 'sesuai' : 'BEDA') : '-'] };
    });
    isi.push({ gaya: 'jumlah', sel: ['', 'JUMLAH SEWA PERIODE INI', '', '', '', '', '', rp(h.prestasi.ini), ''] });
    return kerangka(c, 'SEWA', [dasarKontrak(c),
      { t: 'tabel', ukuran: 7, kolom: [{ l: 4, r: 'c' }, { l: 28 }, { l: 6, r: 'c' }, { l: 15 }, { l: 9, r: 'r' }, { l: 9, r: 'r' }, { l: 11, r: 'r' }, { l: 12, r: 'r' }, { l: 6, r: 'c' }],
        kepala: [[{ teks: 'NO' }, { teks: 'ALAT' }, { teks: 'SAT' }, { teks: 'DASAR SEWA' }, { teks: 'VOL TIMESHEET' }, { teks: 'VOL DITAGIH (BK)' }, { teks: 'TARIF (Rp)' }, { teks: 'JUMLAH (Rp)' }, { teks: 'COCOK' }]], isi },
      { t: 'hitung', baris: barisBayar(h) },
      ttd3(c, [tVendor(c), tKasi(c), tKapro(c)])]);
  }
  function docPakai(c) {
    const ts = (c.p.lampiran && c.p.lampiran.ts) || [], isi = [];
    ts.forEach(u => (u.baris || []).forEach(b => isi.push({ sel: [tglPanjang(b.tgl), S(u.unit), S(u.operator), S(b.mulai || ''), S(b.selesai || ''), ang(b.istirahat, 2), ang(b.jam !== undefined && b.jam !== '' ? b.jam : null, 2), S(b.ket || '')] })));
    if (!isi.length) isi.push({ sel: ['Belum ada catatan penggunaan alat.', '', '', '', '', '', '', ''] });
    return kerangka(c, 'PAKAI', [{ t: 'info', lebar: 130, baris: [['', 'Kontrak', ': ' + S(c.Kt.noKontrak)], ['', 'Vendor', ': ' + c.vendor], ['', 'Periode', ': ' + S(c.Pg.periode || '-')]] },
      { t: 'tabel', ukuran: 7, kolom: [{ l: 15 }, { l: 15 }, { l: 17 }, { l: 8, r: 'c' }, { l: 8, r: 'c' }, { l: 8, r: 'r' }, { l: 8, r: 'r' }, { l: 21 }],
        kepala: [[{ teks: 'TANGGAL' }, { teks: 'UNIT' }, { teks: 'OPERATOR' }, { teks: 'MULAI' }, { teks: 'SELESAI' }, { teks: 'ISTIRAHAT (JAM)' }, { teks: 'JAM KERJA' }, { teks: 'KETERANGAN' }]], isi },
      ttd3(c, [{ atas: 'Operator / Vendor,', instansi: c.vendor, nama: c.ttdVendor, jabatan: c.jabVendor }, { atas: 'Diperiksa oleh,', instansi: c.kso, nama: KOSONG, jabatan: 'Pelaksana / Peralatan' }, tKasi(c)])]);
  }

  /* ---------- INVOICE & KWITANSI (draf; dokumen resmi diterbitkan vendor) ---------- */
  function docInvoice(c) {
    const h = c.h, isi = h.jenis === 'PROGRES' ? h.items.filter(r => !r.judul && r.ini).map(r => ({ sel: [String(r.no), r.uraian, ang(r.ini), r.sat, rp(r.harga), rp(r.jmlIni)] }))
      : [{ sel: ['1', h.jenis === 'UANG_MUKA' ? 'Uang muka ' + pc(h.uangMuka.persen) + ' ' + c.jenisK + ' ' + S(c.Kt.noKontrak) : 'Pelepasan retensi ' + S(c.Kt.noKontrak), '1', 'Ls', rp(h.dasarTagihan), rp(h.dasarTagihan)] }];
    const tot = [['Sub Total', rp(h.jenis === 'PROGRES' ? h.prestasi.ini : h.dasarTagihan)]];
    if (h.uangMuka.potong) tot.push(['Pengembalian uang muka', '(' + rp(h.uangMuka.potong) + ')']);
    if (h.retensi.nilai && h.jenis === 'PROGRES') tot.push(['Retensi ' + pc(h.retensi.persen), '(' + rp(h.retensi.nilai) + ')']);
    h.potonganLain.forEach(x => tot.push([x.nama, '(' + rp(x.nilai) + ')']));
    tot.push(['Harga Jual / DPP kontraktual', rp(h.dasarTagihan)]);
    if (h.konfig.ppn.skema === 'NILAI_LAIN') tot.push(['DPP Nilai Lain ' + h.konfig.ppn.pembilang + '/' + h.konfig.ppn.penyebut, rp(h.dpp)]);
    tot.push(['PPN ' + (h.konfig.ppn.tarif === null ? '-' : pc(h.konfig.ppn.tarif, h.konfig.ppn.tarif % 1 ? 2 : 0)), rp(h.ppn)], ['TOTAL', rp(h.totalTagihan)]);
    tot.forEach((t, i) => isi.push({ gaya: i === tot.length - 1 ? 'jumlah' : 'sub', sel: ['', '', '', '', t[0], t[1]] }));
    return kerangka(c, 'INVOICE', [
      { t: 'info', lebar: 120, baris: [['', 'Dari', ': **' + c.vendor + '**' + (c.V.alamat ? ', ' + S(c.V.alamat) : '')], ['', 'NPWP', ': ' + (S(c.V.npwp) || '..............................')], ['', 'Kepada', ': **' + c.kso + '** — ' + S(c.I.proyek || '')],
        ['', 'No. Invoice / Tanggal', ': (diisi vendor) / ' + tglPanjang(c.tanggal)], ['', 'Referensi', ': ' + c.jenisK + ' ' + S(c.Kt.noKontrak) + ' · BAP ' + c.nomor('BAP') + (h.jenis === 'PROGRES' ? ' · ' + c.kodeBA + ' ' + c.nomor(c.kodeBA) : '') + ' · PO ' + (S(c.Kt.noPO) || '-')]] },
      { t: 'tabel', ukuran: 7.2, kolom: [{ l: 5, r: 'c' }, { l: 45 }, { l: 9, r: 'r' }, { l: 7, r: 'c' }, { l: 16, r: 'r' }, { l: 18, r: 'r' }],
        kepala: [[{ teks: 'NO' }, { teks: 'URAIAN' }, { teks: 'QTY' }, { teks: 'SAT' }, { teks: 'HARGA SATUAN (Rp)' }, { teks: 'JUMLAH (Rp)' }]], isi },
      { t: 'kotak', teks: 'Terbilang : == ' + B.terbilangRp(h.totalTagihan) + ' ==' },
      { t: 'info', lebar: 120, baris: [['', 'Pembayaran ke rekening', ': Bank ........................ No. ........................ a.n. ' + c.vendor]] },
      { t: 'catatan', teks: '**DRAF PEMBANDING** — invoice resmi, faktur pajak, tanda tangan dan cap diterbitkan sendiri oleh vendor. Draf ini dipakai untuk mencocokkan angka; tidak sah sebagai dokumen tagihan.' },
      { t: 'ttd', tempat: '.................., ' + tglPanjang(c.tanggal), kolom: [{ kosong: true }, { kosong: true }, { atas: 'Hormat kami,', instansi: c.vendor, nama: c.ttdVendor, jabatan: c.jabVendor }] }],
      { nomor: '(diisi vendor)', tandaAir: 'DRAF' });
  }
  function docKwitansi(c) {
    const h = c.h;
    return kerangka(c, 'KWITANSI', [
      { t: 'info', lebar: 130, baris: [['', 'Telah terima dari', ': **' + c.kso + '**'], ['', 'Uang sejumlah', ': **' + B.terbilangRp(h.totalTagihan) + '**'],
        ['', 'Untuk pembayaran', ': ' + ({ PROGRES: 'Tagihan ke-' + c.ke + ' prestasi ' + pc(h.persen.ini) + ' (s/d ' + pc(h.persen.sd) + ')', UANG_MUKA: 'Uang muka ' + pc(h.uangMuka.persen), RETENSI: 'Pelepasan retensi' }[h.jenis]) + ' ' + c.jenisK + ' No. ' + S(c.Kt.noKontrak) + ', BAP No. ' + c.nomor('BAP') + ', ' + S(c.I.proyek || '')]] },
      { t: 'kotak', besar: true, teks: 'Rp ' + rp(h.totalTagihan) + ',-' },
      { t: 'catatan', teks: 'Rincian: harga jual ' + rpR(h.dasarTagihan) + ' + PPN ' + rpR(h.ppn) + ' = ' + rpR(h.totalTagihan) + '. **DRAF PEMBANDING** — kwitansi resmi bermeterai ditandatangani & dicap oleh vendor.' },
      { t: 'ttd', tempat: '.................., ' + tglPanjang(c.tanggal), kolom: [{ kosong: true }, { kosong: true }, { atas: 'Yang menerima,', instansi: c.vendor, nama: c.ttdVendor, jabatan: c.jabVendor, meterai: true }] }],
      { nomor: '(diisi vendor)', tandaAir: 'DRAF' });
  }

  /* ---------- CHECKLIST ---------- */
  // Form Checklist Kelengkapan Tagihan proyek (Form_Checklist_BAHAN/ALAT/SUBKON.docx): kepala 1–6, A. UMUM, B. <kategori>,
  // kolom No · Jenis Dokumen · Tanggal · Ketentuan · Checklist (Ada/Tidak) · Keterangan. Tanda "V" hanya dari status tercatat di
  // Checklist Tagihan Monitoring SAP; dokumen yang belum diperiksa dibiarkan kosong (tidak dianggap ada / lolos).
  function docChecklist(c) {
    const ck = c.p.checklist || {}, tpl = ck.template || [], st = ck.status || {};
    const tglP = iso => { const d = tglObj(iso); return d ? String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear() : ''; };
    const idProyek = S(c.I.idProyek) || ((S(c.Kt.noKontrak).match(/\/(\d{6,8})\/\d{4}\s*$/) || [])[1] || '');
    const blokSeksi = (seksi, si) => {
      const isi = (seksi.items || []).map((d, i) => {
        const s = st[d.k] || {}, ada = s.status === 'DIUNGGAH' || s.status === 'TERVERIFIKASI', tidak = s.status === 'NA';
        const ket = tidak ? 'Tidak berlaku' + (s.alasan ? ': ' + S(s.alasan) : '') : ada ? S(s.ket || '') + (s.status === 'TERVERIFIKASI' ? '' : (s.ket ? ' · ' : '') + 'belum diverifikasi Admin') : s.status && s.status !== 'BELUM' ? (B.DOK_LABEL[s.status] || s.status) + (s.ket ? ' · ' + S(s.ket) : '') : '';
        return { sel: [String(i + 1), S(d.nama), ada ? tglP(s.tgl) : '', S(d.ketentuan), ada ? 'V' : '', tidak ? 'V' : '', ket] };
      });
      return [{ t: 'p', teks: '**' + String.fromCharCode(65 + si) + '.  ' + S(seksi.nama).toUpperCase() + '**' },
        { t: 'tabel', ukuran: 7.4, kolom: [{ l: 5, r: 'c' }, { l: 34 }, { l: 10, r: 'c' }, { l: 9, r: 'c' }, { l: 6, r: 'c' }, { l: 6, r: 'c' }, { l: 30 }],
          kepala: [[{ teks: 'No.' }, { teks: 'Jenis Dokumen' }, { teks: 'Tanggal' }, { teks: 'Ketentuan' }, { teks: 'Checklist', span: 2 }, null, { teks: 'Keterangan' }],
            [{ teks: '' }, { teks: '' }, { teks: '' }, { teks: '' }, { teks: 'Ada' }, { teks: 'Tidak' }, { teks: '' }]], isi }];
    };
    return kerangka(c, 'CHECKLIST', [].concat(
      c.p.kategori === 'BAHAN' ? [{ t: 'catatan', teks: 'Lampiran V' }] : [],
      [{ t: 'info', lebar: 120, baris: [['1.', 'Divisi', ': ' + S(ck.divisi || 'Infrastruktur')], ['2.', 'Nama Proyek', ': ' + S(c.I.proyek || '')], ['3.', 'Id Proyek', ': ' + idProyek],
        ['4.', 'Nomor Pengajuan', ': ' + S(ck.pengajuan || '')], ['5.', 'Nama Mitra', ': ' + c.vendor], ['6.', 'Pekerjaan', ': ' + (S(c.Kt.uraian) || '')]] }],
      ...tpl.map(blokSeksi),
      [{ t: 'catatan', teks: 'Paket tagihan ke-' + c.ke + ' · BA ' + S(c.Pg.nomorBA || c.nomor(c.kodeBA)) + ' · Kontrak ' + S(c.Kt.noKontrak) + '. Tanda V dibaca dari Checklist Tagihan Monitoring SAP; baris kosong = belum diperiksa. Verifikasi kelengkapan & keaslian dokumen dilakukan Admin; cetakan ini tidak menyatakan checklist lolos.' }]),
      { judul: 'CHECKLIST KELENGKAPAN TAGIHAN' });
  }

  const PEMBUAT = { BAPM: docBA, BAPA: docBA, BAPP: docBA, BAPSA: docBA, BAP: docBAP, REKAP_BAYAR: docRekapBayar, REKAP_QTY: docRekapQty, REKAP_TERIMA: docRekapTerima, REKAP_SJ: docRekapSJ,
    REKAP_TS: docRekapTS, SEWA: docSewa, PAKAI: docPakai, INVOICE: docInvoice, KWITANSI: docKwitansi, CHECKLIST: docChecklist };
  function daftar(kategori) { return (B.DOKUMEN[kategori] || []).map(d => ({ kode: d[0], nama: d[1], checklist: d[2] })); }
  function buat(p, kode) {
    const c = ctx(p);
    if (['BAPM', 'BAPA', 'BAPP'].indexOf(kode) >= 0) { if (p.hasil.jenis !== 'PROGRES' && kode !== 'BAPP') return null; }
    const f = PEMBUAT[kode]; if (!f) throw new Error('Jenis dokumen tidak dikenal: ' + kode);
    return f(c);
  }
  function semua(p, pilih) { return daftar(p.kategori).filter(d => !pilih || pilih.indexOf(d.kode) >= 0).map(d => buat(p, d.kode)).filter(Boolean); }

  return { VERSI: '1.0.0', JUDUL, daftar, buat, semua, barisBayar, tglPanjang, kalimatTanggal };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BLD;
