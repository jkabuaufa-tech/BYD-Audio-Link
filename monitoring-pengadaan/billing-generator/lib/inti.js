/* disalin dari monitoring-pengadaan/tagihan/sumber/inti.js oleh alat/rakit.py — jangan diubah di sini */
/* TAGIHAN INTI 1.0.0 — mesin perhitungan, kontrol, status & syarat dokumen paket tagihan.
 * Satu kode yang sama dipakai: modul server (Google Apps Script), Monitoring SAP (blok MP270) dan Billing Generator.
 * Fungsi murni: tanpa DOM, tanpa layanan Google. Uang dihitung dengan BigInt skala 1e6 (mikro-rupiah) → tidak ada galat
 * pecahan biner; pembulatan rupiah setengah ke atas (menjauhi nol) dan setiap pembulatan dicatat agar dapat diaudit. */
var BLI = (function () {
  'use strict';
  const VERSI = '1.0.0';
  const S = v => (v === null || v === undefined) ? '' : String(v);
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };

  /* ---------- desimal tepat ---------- */
  const M = 1000000n;                                   // 1 rupiah = 1e6 mikro
  const vol4 = v => BigInt(Math.round(N(v) * 1e4));     // volume: 4 desimal (sama dengan bulat4_ kernel)
  const rp2 = v => BigInt(Math.round(N(v) * 100));      // harga satuan: 2 desimal
  const rpM = v => BigInt(Math.round(N(v))) * M;        // rupiah bulat → mikro
  const pct6 = v => BigInt(Math.round(N(v) * 1e4));     // persen → per sejuta (1,5% = 15000)
  const abs = a => a < 0n ? -a : a;
  function bagi(a, b) {                                 // a / b dibulatkan setengah menjauhi nol
    if (b === 0n) return 0n;
    const neg = (a < 0n) !== (b < 0n); const x = abs(a), y = abs(b);
    const q = (x * 2n + y) / (2n * y); return neg ? -q : q;
  }
  const kaliPct = (mikro, p6) => bagi(mikro * p6, M);   // mikro × persen
  const bulatRp = mikro => bagi(mikro, M);              // mikro → rupiah (BigInt)
  const keRp = mikro => Number(bulatRp(mikro));         // mikro → rupiah (Number, tepat < 9e15)
  const keAngka = mikro => Number(mikro) / 1e6;         // nilai eksak untuk catatan audit
  const volAngka = v4 => Number(v4) / 1e4;

  function rupiah(x, opsi) {
    const v = Math.round(N(x)), t = Math.abs(v).toLocaleString('id-ID');
    return (v < 0 ? '-' : '') + ((opsi && opsi.tanpaRp) ? '' : 'Rp ') + t;
  }
  function angka(x, d) { return N(x).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d === undefined ? 4 : d }); }
  function persen(x, d) { return N(x).toLocaleString('id-ID', { minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 2 : d }) + '%'; }
  function terbilang(n) {
    n = Math.floor(Math.abs(N(n)));
    const s = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    if (n === 0) return 'Nol';
    const t = x => {
      if (x < 12) return s[x];
      if (x < 20) return t(x - 10) + ' Belas';
      if (x < 100) return t(Math.floor(x / 10)) + ' Puluh' + (x % 10 ? ' ' + t(x % 10) : '');
      if (x < 200) return 'Seratus' + (x - 100 ? ' ' + t(x - 100) : '');
      if (x < 1000) return t(Math.floor(x / 100)) + ' Ratus' + (x % 100 ? ' ' + t(x % 100) : '');
      if (x < 2000) return 'Seribu' + (x - 1000 ? ' ' + t(x - 1000) : '');
      for (const [b, nm] of [[1e12, ' Triliun'], [1e9, ' Miliar'], [1e6, ' Juta'], [1e3, ' Ribu']])
        if (x >= b) return t(Math.floor(x / b)) + nm + (x % b ? ' ' + t(x % b) : '');
      return '';
    };
    return t(n);
  }
  const terbilangRp = x => (N(x) < 0 ? 'Minus ' : '') + terbilang(x) + ' Rupiah';

  /* ---------- kategori & konfigurasi ---------- */
  const KATEGORI = ['BAHAN', 'ALAT', 'SUBKON'];
  // bawaan dari jenis kontrak (sama dengan cl217Kategori_ kernel), dapat ditimpa konfigurasi per kontrak
  function kategoriDariNomor(no) {
    const m = S(no).toUpperCase().match(/(?:^|\/)(SPSA|SPM|SPPM|SPKP|SPPP|SPKU|SPK)(?=\/|$)/);
    return m ? ({ SPSA: 'ALAT', SPM: 'BAHAN', SPPM: 'BAHAN', SPKP: 'SUBKON', SPPP: 'SUBKON', SPKU: 'SUBKON', SPK: 'SUBKON' }[m[1]] || '') : '';
  }
  const SKEMA_PPN = ['NORMAL', 'NILAI_LAIN', 'TIDAK_DIPUNGUT', 'DIBEBASKAN'];
  const JENIS_TAGIHAN = ['PROGRES', 'UANG_MUKA', 'RETENSI'];
  function konfigBersih(k) {
    k = k || {}; const ppn = k.ppn || {}, pph = k.pph || {};
    const o = {
      kategori: KATEGORI.indexOf(S(k.kategori).toUpperCase()) >= 0 ? S(k.kategori).toUpperCase() : '',
      retensiPersen: Math.max(0, N(k.retensiPersen)),
      uangMukaPersen: Math.max(0, N(k.uangMukaPersen)),
      uangMukaNilai: Math.max(0, Math.round(N(k.uangMukaNilai))),
      nilaiAddendum: Math.max(0, Math.round(N(k.nilaiAddendum))),
      noAddendum: S(k.noAddendum).trim().slice(0, 120),
      izinLebihVolume: !!k.izinLebihVolume && !!S(k.noAddendum).trim(),
      potonganLain: (Array.isArray(k.potonganLain) ? k.potonganLain : []).slice(0, 10).map(p => ({ nama: S(p && p.nama).trim().slice(0, 80), nilai: Math.max(0, Math.round(N(p && p.nilai))), persen: Math.max(0, N(p && p.persen)) })).filter(p => p.nama && (p.nilai || p.persen)),
      ppn: {
        skema: SKEMA_PPN.indexOf(S(ppn.skema).toUpperCase()) >= 0 ? S(ppn.skema).toUpperCase() : '',
        tarif: ppn.tarif === '' || ppn.tarif === null || ppn.tarif === undefined ? null : Math.max(0, N(ppn.tarif)),
        pembilang: Math.max(1, Math.round(N(ppn.pembilang) || 11)), penyebut: Math.max(1, Math.round(N(ppn.penyebut) || 12)),
        perItem: !!ppn.perItem, dipungut: !!ppn.dipungut, keterangan: S(ppn.keterangan).trim().slice(0, 160),
        ikutiFaktur: !!ppn.ikutiFaktur, toleransiFaktur: ppn.toleransiFaktur === undefined || ppn.toleransiFaktur === '' ? 10 : Math.min(1000, Math.max(0, Math.round(N(ppn.toleransiFaktur))))   // DPP/PPN Faktur Pajak vendor dipakai bila selisihnya ≤ toleransi (rupiah)
      },
      pph: { jenis: S(pph.jenis).trim().slice(0, 40), tarif: Math.max(0, N(pph.tarif)), dasar: S(pph.dasar).toUpperCase() === 'DPP' ? 'DPP' : 'TAGIHAN' },
      pembulatan: S(k.pembulatan).toUpperCase() === 'AKHIR' ? 'AKHIR' : 'KOMPONEN',
      sewa: {}
    };
    Object.keys(k.sewa || {}).slice(0, 300).forEach(id => {
      const x = k.sewa[id] || {}, b = S(x.basis).toUpperCase();
      o.sewa[S(id)] = { basis: ['JAM', 'HARI', 'BULAN', 'TETAP'].indexOf(b) >= 0 ? b : '', jamMinHari: Math.max(0, N(x.jamMinHari)), hariPerBulan: Math.max(0, N(x.hariPerBulan)), jamPerBulan: Math.max(0, N(x.jamPerBulan)) };
    });
    return o;
  }

  /* ---------- temuan ---------- */
  const T = (tingkat, kode, pesan, extra) => Object.assign({ tingkat, kode, pesan }, extra || {});
  const adaGalat = L => (L || []).some(t => t.tingkat === 'GALAT');

  /* =====================================================================
   * HITUNG — input:
   *   kontrak {noKontrak, nilai}            nilai = nilai kontrak sebelum PPN (DPP kontraktual) dari Monitoring SAP
   *   items   [{id, kode, uraian, sat, vol, harga, wbs, judul}]  (baris tanpa volume dianggap judul; bila bersatuan/berharga ditandai nol:true = item kontrak bervolume 0)
   *   progres {lalu:{id:vol}, ini:{id:vol}}  volume dari Input Progres (BK) — sumber resmi
   *   konfig  (konfigBersih), jenis: PROGRES | UANG_MUKA | RETENSI
   *   riwayat {umKembaliSebelum, retensiSebelum}  dari paket tagihan sebelumnya kontrak yang sama
   *   nilaiRetensiDilepas (jenis RETENSI)
   * ===================================================================== */
  function hitung(inp) {
    inp = inp || {};
    const K = konfigBersih(inp.konfig), jenis = JENIS_TAGIHAN.indexOf(S(inp.jenis).toUpperCase()) >= 0 ? S(inp.jenis).toUpperCase() : 'PROGRES';
    const lalu = (inp.progres && inp.progres.lalu) || {}, ini = (inp.progres && inp.progres.ini) || {};
    const temuan = [], log = [];
    const catatBulat = (komponen, eksakMikro, rpBig) => { const e = keAngka(eksakMikro), b = Number(rpBig); if (Math.abs(e - b) > 1e-9) log.push({ komponen, eksak: e, bulat: b, selisih: Math.round((b - e) * 1e6) / 1e6 }); };

    let tKontrak = 0n, tLalu = 0n, tIni = 0n, tSd = 0n, no = 0;
    const items = (inp.items || []).map(it => {
      const id = S(it.id), judul = !!it.judul || !(N(it.vol) || N(lalu[id]) || N(ini[id]));
      const r = { id, no: 0, kode: S(it.kode), uraian: S(it.uraian), sat: S(it.sat), wbs: S(it.wbs), judul, nol: judul && !it.judul && (!!S(it.sat).trim() || N(it.harga) > 0), vol: N(it.vol), harga: N(it.harga), lalu: 0, ini: 0, sd: 0, sisa: 0, jmlKontrak: 0, jmlLalu: 0, jmlIni: 0, jmlSd: 0 };
      if (judul) return r;
      r.no = ++no;
      const V = vol4(it.vol), L = vol4(lalu[id]), I = vol4(ini[id]), H = rp2(it.harga), SD = L + I;
      if (L < 0n || I < 0n) temuan.push(T('GALAT', 'VOL_NEGATIF', 'Volume progres item ' + r.no + ' (' + r.uraian.slice(0, 50) + ') negatif.', { item: id }));
      if (SD > V) {
        const pesan = 'Item ' + r.no + ' (' + r.uraian.slice(0, 50) + '): volume s/d saat ini ' + angka(volAngka(SD)) + ' melebihi volume kontrak ' + angka(volAngka(V)) + ' ' + r.sat + '.';
        temuan.push(K.izinLebihVolume ? T('PERINGATAN', 'VOLUME_LEBIH_ADDENDUM', pesan + ' Diizinkan berdasarkan addendum ' + K.noAddendum + '.', { item: id }) : T('GALAT', 'VOLUME_LEBIH', pesan + ' Perlu addendum/perubahan kontrak yang sah.', { item: id }));
      }
      if (I > 0n && H === 0n) temuan.push(T('PERINGATAN', 'HARGA_KOSONG', 'Item ' + r.no + ' (' + r.uraian.slice(0, 50) + ') memiliki progres tetapi harga satuan Rp 0.', { item: id }));
      Object.assign(r, { lalu: volAngka(L), ini: volAngka(I), sd: volAngka(SD), sisa: volAngka(V - SD) });
      const jK = V * H, jL = L * H, jI = I * H;
      r.jmlKontrak = keRp(jK); r.jmlLalu = keRp(jL); r.jmlIni = keRp(jI); r.jmlSd = keRp(jL + jI);
      r._jI = jI;
      tKontrak += jK; tLalu += jL; tIni += jI; tSd += jL + jI;
      return r;
    });

    const nilaiItemRp = bulatRp(tKontrak);
    const nilaiKontrak = N(inp.kontrak && inp.kontrak.nilai) > 0 ? BigInt(Math.round(N(inp.kontrak.nilai))) : nilaiItemRp;
    if (!(N(inp.kontrak && inp.kontrak.nilai) > 0)) temuan.push(T(nilaiItemRp > 0n ? 'PERINGATAN' : 'GALAT', 'NILAI_KONTRAK', nilaiItemRp > 0n ? 'Nilai kontrak tidak tercatat; dipakai jumlah harga item ' + rupiah(Number(nilaiItemRp)) + '.' : 'Nilai kontrak Rp 0 dan item belum berharga.'));
    else if (nilaiItemRp > 0n && abs(nilaiItemRp - nilaiKontrak) > 1n) temuan.push(T('INFO', 'NILAI_ITEM_BEDA', 'Jumlah harga item ' + rupiah(Number(nilaiItemRp)) + ' berbeda dari nilai kontrak ' + rupiah(Number(nilaiKontrak)) + ' (selisih ' + rupiah(Number(nilaiItemRp - nilaiKontrak)) + ').'));
    const batas = K.nilaiAddendum > 0 ? BigInt(K.nilaiAddendum) : nilaiKontrak;

    // prestasi (rupiah): ini & lalu dibulatkan, s/d = lalu + ini → baris BAP selalu bertambah dengan benar
    const iniRp = bulatRp(tIni), laluRp = bulatRp(tLalu), sdRp = iniRp + laluRp;
    catatBulat('Prestasi periode ini', tIni, iniRp); catatBulat('Prestasi s/d yang lalu', tLalu, laluRp);
    if (sdRp !== bulatRp(tSd)) log.push({ komponen: 'Prestasi s/d saat ini (lalu + ini)', eksak: keAngka(tSd), bulat: Number(sdRp), selisih: Number(sdRp - bulatRp(tSd)) });
    if (jenis === 'PROGRES') {
      if (tIni === 0n) temuan.push(T('GALAT', 'INI_KOSONG', 'Tidak ada volume progres periode ini untuk ditagihkan.'));
      if (sdRp > batas + 1n) temuan.push(T('GALAT', 'NILAI_LEBIH', 'Prestasi s/d saat ini ' + rupiah(Number(sdRp)) + ' melebihi nilai kontrak' + (K.nilaiAddendum ? ' setelah addendum' : '') + ' ' + rupiah(Number(batas)) + '.'));
    }

    // uang muka
    const umTotal = K.uangMukaNilai > 0 ? BigInt(K.uangMukaNilai) : bulatRp(kaliPct(nilaiKontrak * M, pct6(K.uangMukaPersen)));
    const umSebelum = BigInt(Math.round(N(inp.riwayat && inp.riwayat.umKembaliSebelum)));
    const retSebelum = BigInt(Math.round(N(inp.riwayat && inp.riwayat.retensiSebelum)));
    let umPotong = 0n, retensi = 0n, lain = [], tLain = 0n, dasar = 0n, umEksak = 0n, retEksak = 0n;
    if (jenis === 'UANG_MUKA') {
      if (umTotal <= 0n) temuan.push(T('GALAT', 'UM_KOSONG', 'Uang muka belum diatur (persen atau nilai) di Konfigurasi Tagihan.'));
      dasar = umTotal;
    } else if (jenis === 'RETENSI') {
      dasar = BigInt(Math.max(0, Math.round(N(inp.nilaiRetensiDilepas))));
      if (dasar <= 0n) temuan.push(T('GALAT', 'RETENSI_KOSONG', 'Nilai retensi yang dilepas belum diisi.'));
      if (dasar > retSebelum + 1n) temuan.push(T('GALAT', 'RETENSI_LEBIH', 'Retensi dilepas ' + rupiah(Number(dasar)) + ' melebihi retensi tertahan ' + rupiah(Number(retSebelum)) + '.'));
    } else {
      if (umTotal > 0n && nilaiKontrak > 0n) {
        umEksak = bagi(iniRp * M * umTotal, nilaiKontrak);                       // proporsional: prestasi ini × (UM ÷ nilai kontrak)
        umPotong = bulatRp(umEksak);
        const sisaUM = umTotal - umSebelum;
        if (sdRp >= batas) umPotong = sisaUM > 0n ? sisaUM : 0n;            // termin terakhir: pelunasan sisa UM
        if (umPotong > sisaUM) { temuan.push(T('INFO', 'UM_DIBATASI', 'Potongan uang muka dibatasi sisa uang muka ' + rupiah(Number(sisaUM)) + '.')); umPotong = sisaUM > 0n ? sisaUM : 0n; }
        catatBulat('Pengembalian uang muka', umEksak, umPotong);
      }
      retEksak = kaliPct(iniRp * M, pct6(K.retensiPersen)); retensi = bulatRp(retEksak); catatBulat('Retensi', retEksak, retensi);
      lain = K.potonganLain.map(p => { const e = p.nilai ? BigInt(p.nilai) * M : kaliPct(iniRp * M, pct6(p.persen)), v = bulatRp(e); catatBulat('Potongan ' + p.nama, e, v); tLain += v; return { nama: p.nama, persen: p.persen, nilai: Number(v) }; });
      dasar = iniRp - umPotong - retensi - tLain;
      if (dasar < 0n) temuan.push(T('GALAT', 'TAGIHAN_NEGATIF', 'Nilai tagihan setelah potongan negatif.'));
    }

    // PPN
    const P = K.ppn, sk = P.skema; let dpp = 0n, ppn = 0n, dppEksak = 0n, ppnEksak = 0n, perItem = false;
    if (!sk || P.tarif === null) temuan.push(T('GALAT', 'PPN_BELUM', 'Perlakuan PPN kontrak belum diatur (skema & tarif) di Konfigurasi Tagihan. Tarif PPN tidak ditetapkan otomatis.'));
    const t6 = pct6(P.tarif || 0), fp = BigInt(P.pembilang), fq = BigInt(P.penyebut);
    if (sk === 'NILAI_LAIN') {
      dppEksak = bagi(dasar * M * fp, fq);
      if (P.perItem && jenis === 'PROGRES' && umPotong === 0n && retensi === 0n && tLain === 0n) {   // e-Faktur: DPP & PPN per baris barang
        perItem = true;
        items.forEach(r => { if (r.judul || !r._jI) return; const d = bulatRp(bagi(r._jI * fp, fq)); dpp += d; ppn += bulatRp(kaliPct(d * M, t6)); });
      } else {
        if (P.perItem) temuan.push(T('INFO', 'DPP_PER_ITEM_DILEWATI', 'DPP per baris hanya dipakai bila tidak ada potongan; DPP dihitung dari total tagihan.'));
        dpp = bulatRp(dppEksak); ppnEksak = kaliPct(dpp * M, t6); ppn = bulatRp(ppnEksak);
      }
    } else if (sk) {
      dpp = dasar; dppEksak = dasar * M;
      if (sk === 'NORMAL') { ppnEksak = kaliPct(dasar * M, t6); ppn = bulatRp(ppnEksak); }
    }
    if (!perItem) { catatBulat('DPP PPN', dppEksak, dpp); if (sk === 'NORMAL' || sk === 'NILAI_LAIN') catatBulat('PPN', kaliPct(dppEksak, t6), ppn); }
    // Faktur Pajak vendor: angka DPP/PPN-nya dipakai di BAP & invoice hanya bila diaktifkan dan selisihnya dalam toleransi
    const fk = inp.faktur || null;
    if (P.ikutiFaktur && fk && N(fk.dpp) > 0 && (sk === 'NORMAL' || sk === 'NILAI_LAIN')) {
      const fD = BigInt(Math.round(N(fk.dpp))), fP = BigInt(Math.round(N(fk.ppn))), dD = fD - dpp, dP = fP - ppn, tol = BigInt(P.toleransiFaktur);
      if (abs(dD) <= tol && abs(dP) <= tol) {
        if (dD || dP) {
          log.push({ komponen: 'DPP mengikuti Faktur Pajak ' + S(fk.nomor), eksak: Number(dpp), bulat: Number(fD), selisih: Number(dD) });
          log.push({ komponen: 'PPN mengikuti Faktur Pajak ' + S(fk.nomor), eksak: Number(ppn), bulat: Number(fP), selisih: Number(dP) });
          temuan.push(T('INFO', 'PPN_IKUT_FAKTUR', 'DPP/PPN memakai Faktur Pajak vendor' + (fk.nomor ? ' ' + S(fk.nomor) : '') + ': DPP ' + rupiah(Number(fD)) + ' (perhitungan ' + rupiah(Number(dpp)) + '), PPN ' + rupiah(Number(fP)) + ' (perhitungan ' + rupiah(Number(ppn)) + '). Angka faktur tidak dapat diturunkan dari rumus — pastikan sudah diverifikasi.'));
        }
        dpp = fD; ppn = fP; ppnEksak = fP * M; perItem = false;
      } else temuan.push(T('GALAT', 'FAKTUR_DI_LUAR_TOLERANSI', 'Faktur Pajak berbeda dari perhitungan melebihi toleransi Rp ' + P.toleransiFaktur + ' (DPP selisih ' + rupiah(Number(dD)) + ', PPN selisih ' + rupiah(Number(dP)) + '). Periksa faktur / perhitungan.'));
    }
    const total = dasar + ppn;

    // PPh & neto
    const dasarPph = K.pph.dasar === 'DPP' ? dpp : dasar, pphEksak = kaliPct(dasarPph * M, pct6(K.pph.tarif)), pph = bulatRp(pphEksak);
    catatBulat('PPh', pphEksak, pph);
    const ppnKeVendor = P.dipungut ? 0n : ppn;
    let neto = dasar + ppnKeVendor - pph;
    if (K.pembulatan === 'AKHIR') {   // seluruh komponen eksak lalu dibulatkan sekali (sama dengan cara sebagian SPKTV/SAP)
      const dasarE = jenis === 'PROGRES' ? tIni - umEksak - retEksak - BigInt(tLain) * M : dasar * M;
      const netoE = dasarE + (P.dipungut ? 0n : ppnEksak || BigInt(ppn) * M) - pphEksak;
      const n2 = bulatRp(netoE); if (n2 !== neto) log.push({ komponen: 'Neto (pembulatan akhir)', eksak: keAngka(netoE), bulat: Number(n2), selisih: Number(n2 - neto) });
      neto = n2;
    }

    const persenDari = x => nilaiKontrak > 0n ? Number(x * 1000000n / nilaiKontrak) / 10000 : 0;   // 4 desimal persen
    items.forEach(r => { delete r._jI; });
    return {
      versiMesin: VERSI, jenis, konfig: K, items, temuan, pembulatan: log,
      nilaiKontrak: Number(nilaiKontrak), nilaiItem: Number(nilaiItemRp), batasNilai: Number(batas),
      prestasi: { lalu: Number(laluRp), ini: Number(iniRp), sd: Number(sdRp) },
      persen: { lalu: persenDari(laluRp), ini: persenDari(iniRp), sd: persenDari(sdRp) },
      uangMuka: { total: Number(umTotal), kembaliSebelum: Number(umSebelum), potong: Number(umPotong), sisa: Number(umTotal - umSebelum - umPotong), persen: nilaiKontrak > 0n ? Number(umTotal * 1000000n / nilaiKontrak) / 10000 : 0 },
      retensi: { persen: K.retensiPersen, nilai: Number(retensi), sebelum: Number(retSebelum), kumulatif: Number(retSebelum + (jenis === 'RETENSI' ? -dasar : retensi)) },
      potonganLain: lain, totalPotongan: Number(umPotong + retensi + tLain),
      dasarTagihan: Number(dasar), dpp: Number(dpp), ppn: Number(ppn), ppnPerItem: perItem, totalTagihan: Number(total),
      pph: { jenis: K.pph.jenis, tarif: K.pph.tarif, dasar: Number(dasarPph), nilai: Number(pph) },
      ppnDipungut: P.dipungut, neto: Number(neto)
    };
  }

  /* ---------- volume dari riwayat progres (BK) ---------- */
  // entri: progres kontrak (semua nomor terkait), dipilih: id progres yang ditagihkan; dasar: {id: kumulatif awal Excel}
  function urutEntri(a, b) { return (N(a.periodeKey) - N(b.periodeKey)) || (N(a.tagihanKe) - N(b.tagihanKe)) || S(a.dibuatPada).localeCompare(S(b.dibuatPada)); }
  function volumeDariProgres(entri, dipilihId, dasar) {
    const L = (entri || []).slice().sort(urutEntri), i = L.findIndex(e => S(e.id) === S(dipilihId));
    if (i < 0) throw new Error('Data progres (BK) yang dipilih tidak ditemukan.');
    const lalu = {}, ini = {};
    Object.keys(dasar || {}).forEach(k => { if (N(dasar[k])) lalu[k] = N(dasar[k]); });
    L.slice(0, i).forEach(e => Object.keys(e.items || {}).forEach(k => { lalu[k] = Math.round(((lalu[k] || 0) + N(e.items[k])) * 1e4) / 1e4; }));
    Object.keys(L[i].items || {}).forEach(k => { ini[k] = N(L[i].items[k]); });
    return { lalu, ini, entri: L[i], sebelum: L.slice(0, i).map(e => S(e.id)), sesudah: L.slice(i + 1).map(e => S(e.id)) };
  }

  /* ---------- kontrol silang antar dokumen ---------- */
  // pembanding: {bk:{nilai}, invoice:{hargaJual,ppn,total}, faktur:{dpp,ppn}, kwitansi:{total}, spktv:{neto,hargaJual,ppn,pph}}
  function bandingkan(h, pb) {
    const out = [], cek = (dok, label, a, b, tol) => {
      if (b === null || b === undefined || b === '') return;
      const d = Math.round(N(b)) - Math.round(N(a));
      if (Math.abs(d) > (tol || 0)) out.push(T(Math.abs(d) <= 2 ? 'PERINGATAN' : 'GALAT', ('BEDA_' + dok + '_' + label).toUpperCase().replace(/\W+/g, '_'), dok + ': ' + label + ' ' + rupiah(b) + ' ≠ perhitungan ' + rupiah(a) + ' (selisih ' + rupiah(d) + (Math.abs(d) <= 2 ? ', kemungkinan pembulatan' : '') + ').', { dok, selisih: d }));
    };
    pb = pb || {};
    if (pb.bk) cek('BK', 'Nilai progres', h.prestasi.ini, pb.bk.nilai, 1);
    if (pb.invoice) { cek('Invoice', 'Harga jual', h.dasarTagihan, pb.invoice.hargaJual); cek('Invoice', 'PPN', h.ppn, pb.invoice.ppn); cek('Invoice', 'Total', h.totalTagihan, pb.invoice.total); }
    if (pb.faktur) { cek('Faktur Pajak', 'DPP', h.dpp, pb.faktur.dpp); cek('Faktur Pajak', 'PPN', h.ppn, pb.faktur.ppn); }
    if (pb.kwitansi) cek('Kwitansi', 'Total', h.totalTagihan, pb.kwitansi.total);
    if (pb.spktv) { cek('SPKTV', 'Harga jual', h.dasarTagihan, pb.spktv.hargaJual); cek('SPKTV', 'PPh', h.pph.nilai, pb.spktv.pph); cek('SPKTV', 'Nilai diajukan', h.neto, pb.spktv.neto); }
    return out;
  }

  /* ---------- timesheet alat → volume sewa ---------- */
  function basisDariSatuan(sat) {
    const s = S(sat).toLowerCase();
    if (/\bjam\b|hour|\bhm\b/.test(s)) return 'JAM';
    if (/hari|day/.test(s)) return 'HARI';
    if (/bulan|bln|month/.test(s)) return 'BULAN';
    return 'TETAP';
  }
  const jamDari = (a, b) => { const m = t => { const x = S(t).match(/^(\d{1,2})[:.](\d{2})$/); return x ? N(x[1]) * 60 + N(x[2]) : null; }; const p = m(a), q = m(b); if (p === null || q === null) return 0; return ((q - p + 1440) % 1440) / 60; };
  // ts: [{itemId, unit, operator, baris:[{tgl, mulai, selesai, istirahat, jam, ket}]}]
  function rekapTimesheet(ts, items, konfig) {
    const K = konfigBersih(konfig), per = {}, temuan = [];
    (ts || []).forEach(u => {
      const it = (items || []).find(i => S(i.id) === S(u.itemId)); if (!it) { temuan.push(T('GALAT', 'TS_ITEM', 'Timesheet unit ' + S(u.unit) + ' tidak terhubung ke item kontrak.')); return; }
      const cfg = K.sewa[S(it.id)] || {}, basis = cfg.basis || basisDariSatuan(it.sat), tgl = new Set();
      let jam = 0, jamTagih = 0, hari = 0;
      (u.baris || []).forEach(b => {
        const j = b.jam !== undefined && b.jam !== '' ? Math.max(0, N(b.jam)) : Math.max(0, jamDari(b.mulai, b.selesai) - N(b.istirahat));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(S(b.tgl))) { temuan.push(T('GALAT', 'TS_TANGGAL', 'Tanggal timesheet tidak valid: ' + S(b.tgl))); return; }
        if (tgl.has(b.tgl)) temuan.push(T('PERINGATAN', 'TS_DOBEL', 'Tanggal ' + b.tgl + ' tercatat dua kali untuk unit ' + S(u.unit) + '.'));
        tgl.add(b.tgl); jam += j; if (j > 0) hari++;
        jamTagih += j > 0 ? Math.max(j, cfg.jamMinHari || 0) : 0;
      });
      const vol = basis === 'JAM' ? jamTagih : basis === 'HARI' ? hari : basis === 'BULAN' ? (cfg.jamPerBulan ? jamTagih / cfg.jamPerBulan : cfg.hariPerBulan ? hari / cfg.hariPerBulan : null) : null;
      const r = per[it.id] || (per[it.id] = { itemId: it.id, uraian: S(it.uraian), sat: S(it.sat), basis, unit: [], jam: 0, jamTagih: 0, hari: 0, vol: 0, volTerukur: true });
      r.unit.push({ unit: S(u.unit), operator: S(u.operator), jam: Math.round(jam * 100) / 100, jamTagih: Math.round(jamTagih * 100) / 100, hari, vol: vol === null ? null : Math.round(vol * 1e4) / 1e4 });
      r.jam += jam; r.jamTagih += jamTagih; r.hari += hari; if (vol === null) r.volTerukur = false; else r.vol = Math.round((r.vol + vol) * 1e4) / 1e4;
      if (basis === 'BULAN' && vol === null) temuan.push(T('INFO', 'TS_PEMBAGI', 'Item ' + S(it.uraian).slice(0, 40) + ' bersatuan bulan: isi "hari per bulan" atau "jam per bulan" sesuai kontrak agar volume dari timesheet dapat dicocokkan.'));
    });
    return { item: Object.values(per), temuan };
  }
  function cocokkanVolume(sumber, label, volPer, ini, items) {   // volPer: {id: vol}
    const out = [];
    Object.keys(volPer).forEach(id => {
      const it = (items || []).find(i => S(i.id) === id), a = Math.round(N(ini[id]) * 1e4), b = Math.round(N(volPer[id]) * 1e4);
      if (a !== b) out.push(T('PERINGATAN', sumber + '_BEDA', label + ' item ' + S(it && it.uraian).slice(0, 50) + ': ' + angka(b / 1e4) + ' ≠ volume BK periode ini ' + angka(a / 1e4) + '. Perbaiki BK lewat Input Progres (revisi) atau lengkapi ' + label.toLowerCase() + '.', { item: id }));
    });
    Object.keys(ini).forEach(id => { if (N(ini[id]) && !(id in volPer)) { const it = (items || []).find(i => S(i.id) === id); out.push(T('PERINGATAN', sumber + '_KOSONG', 'Item ' + S(it && it.uraian).slice(0, 50) + ' ditagihkan ' + angka(ini[id]) + ' tetapi tidak ada di ' + label.toLowerCase() + '.', { item: id })); } });
    return out;
  }
  // penerimaan gudang (surat jalan) → volume per item kontrak; gr: [{id, tanggal, noSJ, kode, uraian, sat, qty, bonNomor}]
  function rekapSuratJalan(gr, items) {
    const kunci = x => S(x).trim().toLowerCase();
    const per = {}, tidak = [];
    (gr || []).forEach(g => {
      const it = (items || []).find(i => !i.judul && ((S(i.kode).trim() && kunci(i.kode) === kunci(g.kode)) || kunci(i.uraian) === kunci(g.uraian)));
      if (!it) { tidak.push(g); return; }
      (per[it.id] = per[it.id] || []).push(g);
    });
    const vol = {}; Object.keys(per).forEach(id => { vol[id] = Math.round(per[id].reduce((a, g) => a + N(g.qty), 0) * 1e4) / 1e4; });
    return { per, vol, tidakCocok: tidak };
  }

  /* ---------- status & kewenangan ---------- */
  const STATUS = ['DRAFT', 'DALAM PENYUSUNAN', 'MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', 'REVISI', 'TERVERIFIKASI', 'DIAJUKAN', 'PROSES PEMBAYARAN', 'DIBAYAR', 'BATAL'];
  const STATUS_SIMPAN = ['DRAFT', 'DALAM PENYUSUNAN', 'MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', 'REVISI', 'BATAL'];
  // status efektif: verifikasi & pembayaran dibaca dari Monitoring SAP (checklist kernel & status bayar BK), bukan disimpan ganda
  function statusEfektif(simpan, cek) {
    cek = cek || {}; const b = S(cek.bayar).toUpperCase();
    if (simpan === 'BATAL') return 'BATAL';
    if (b === 'DIBAYAR') return 'DIBAYAR';
    if (b === 'DIVERIFIKASI') return 'PROSES PEMBAYARAN';
    if (b === 'DIAJUKAN') return 'DIAJUKAN';
    if (cek.checklistVerified && simpan !== 'REVISI') return 'TERVERIFIKASI';
    return STATUS_SIMPAN.indexOf(simpan) >= 0 ? simpan : 'DRAFT';
  }
  const TERKUNCI = ['TERVERIFIKASI', 'DIAJUKAN', 'PROSES PEMBAYARAN', 'DIBAYAR', 'BATAL'];
  // u: {peran:'PENGADAAN'|'LIHAT', admin:bool}; ctx: {galat, checklistLengkap, bayar}
  function transisiBoleh(dari, ke, u, ctx) {
    ctx = ctx || {}; u = u || {};
    if (u.peran !== 'PENGADAAN') return 'Peran ' + (u.peran || '-') + ' hanya dapat melihat paket tagihan.';
    const ef = statusEfektif(dari, ctx), bayar = S(ctx.bayar).toUpperCase() || 'BELUM';
    if (ke === 'BATAL') return ['BELUM', 'DITUNDA'].indexOf(bayar) < 0 ? 'Tagihan sudah ' + bayar + ' di Keuangan & Bayar; tidak dapat dibatalkan.' : ef === 'BATAL' ? 'Paket sudah dibatalkan.' : '';
    if (ke === 'REVISI') {
      if (!u.admin) return 'Hanya Admin yang dapat mengembalikan paket untuk revisi.';
      if (['MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', 'TERVERIFIKASI'].indexOf(ef) < 0) return 'Revisi hanya dari status Menunggu Dokumen, Siap Diperiksa atau Terverifikasi (status kini ' + ef + ').';
      if (bayar !== 'BELUM' && bayar !== 'DITUNDA') return 'Tagihan sudah ' + bayar + '; revisi ditolak.';
      return '';
    }
    if (TERKUNCI.indexOf(ef) >= 0) return 'Paket berstatus ' + ef + ' (dari Monitoring SAP) — terkunci.';
    const jalur = { 'DRAFT': ['DALAM PENYUSUNAN'], 'DALAM PENYUSUNAN': ['DRAFT', 'MENUNGGU DOKUMEN'], 'MENUNGGU DOKUMEN': ['DALAM PENYUSUNAN', 'SIAP DIPERIKSA'], 'SIAP DIPERIKSA': ['DALAM PENYUSUNAN'], 'REVISI': ['DALAM PENYUSUNAN'] };
    if ((jalur[ef] || []).indexOf(ke) < 0) return 'Perubahan status ' + ef + ' → ' + ke + ' tidak diizinkan.';
    if (ke === 'MENUNGGU DOKUMEN' && ctx.galat) return 'Masih ada GALAT perhitungan; perbaiki sebelum dokumen diterbitkan.';
    if (ke === 'SIAP DIPERIKSA' && !ctx.checklistLengkap) return 'Checklist tagihan belum lengkap (semua dokumen Ada / Tidak berlaku beralasan).';
    return '';
  }

  /* ---------- dokumen yang dibuat generator per kategori (kode checklist kernel CL217) ---------- */
  const DOKUMEN = {
    BAHAN: [['BAPM', 'Berita Acara Penerimaan Material', 'UMUM_08'], ['REKAP_TERIMA', 'Rekapitulasi Penerimaan Material', ''], ['REKAP_SJ', 'Rekap Surat Jalan', 'BAHAN_01'], ['BAP', 'Berita Acara Pembayaran', 'UMUM_07'],
      ['REKAP_BAYAR', 'Rekap Perhitungan Pembayaran', ''], ['INVOICE', 'Draft Invoice', 'UMUM_04'], ['KWITANSI', 'Draft Kwitansi', 'UMUM_03'], ['CHECKLIST', 'Checklist Kelengkapan Tagihan Bahan', '']],
    ALAT: [['REKAP_TS', 'Rekap Timesheet Alat', 'ALAT_04'], ['SEWA', 'Perhitungan Sewa Alat', ''], ['PAKAI', 'Rekap Penggunaan Alat', ''], ['BAPA', 'Berita Acara Pemakaian Alat', 'UMUM_08'], ['BAP', 'Berita Acara Pembayaran', 'UMUM_07'],
      ['INVOICE', 'Draft Invoice', 'UMUM_04'], ['KWITANSI', 'Draft Kwitansi', 'UMUM_03'], ['CHECKLIST', 'Checklist Kelengkapan Tagihan Alat', '']],
    SUBKON: [['BAPP', 'Berita Acara Prestasi Pekerjaan', 'UMUM_08'], ['REKAP_QTY', 'Rincian Progres Pekerjaan', 'SUBKON_05'], ['BAP', 'Berita Acara Pembayaran', 'UMUM_07'], ['REKAP_BAYAR', 'Rekap Perhitungan Pembayaran (Retensi & Uang Muka)', ''],
      ['INVOICE', 'Draft Invoice', 'UMUM_04'], ['KWITANSI', 'Draft Kwitansi', 'UMUM_03'], ['CHECKLIST', 'Checklist Kelengkapan Tagihan Subkon', '']]
  };
  const DOK_STATUS = ['BELUM', 'DRAFT', 'MENUNGGU_TTD', 'DIUNGGAH', 'PERLU_REVISI', 'TERVERIFIKASI', 'NA'];
  const DOK_LABEL = { BELUM: 'Belum tersedia', DRAFT: 'Draft dibuat', MENUNGGU_TTD: 'Menunggu tanda tangan', DIUNGGAH: 'Sudah diunggah', PERLU_REVISI: 'Perlu revisi', TERVERIFIKASI: 'Terverifikasi', NA: 'Tidak berlaku' };

  // syarat kondisional checklist: saran "tidak berlaku" + alasan (pengguna tetap mengonfirmasi lewat checklist kernel)
  function syaratKondisional(kategori, ctx) {
    ctx = ctx || {}; const teks = (ctx.items || []).map(i => S(i.uraian) + ' ' + S(i.kode)).join(' ').toLowerCase();
    const ada = re => re.test(teks), out = {};
    const tidak = (k, alasan) => { out[k] = { berlaku: false, alasan }; }, cek = (k, alasan) => { out[k] = { berlaku: 'cek', alasan }; };
    const um = N(ctx.uangMuka) > 0, sd = N(ctx.persenSd), jenis = S(ctx.jenis || 'PROGRES');
    if (kategori === 'BAHAN') {
      if (!ada(/solar|bbm|biosolar|dexlite|\bhsd\b/)) { tidak('BAHAN_09', 'Tidak ada material solar/BBM pada kontrak ini'); tidak('BAHAN_10', 'Tidak ada material solar/BBM pada kontrak ini'); }
      if (!ada(/tanah|pasir|batu|sirtu|urug|split|koral|kerikil|agregat|abu batu/)) tidak('BAHAN_08', 'Bukan material alam (quarry) pada kontrak ini');
      if (!ada(/baja|besi|beton|readymix|ready mix|aspal|semen|pipe|pile|wf|h-beam|tulangan|wiremesh/)) tidak('BAHAN_03', 'Tidak ada material baja/beton/aspal yang wajib uji');
      if (!um) tidak('BAHAN_11', 'Kontrak tanpa uang muka');
      cek('BAHAN_04', 'Wajib hanya untuk item mayor dan ME — periksa daftar material');
    }
    if (kategori === 'SUBKON') {
      if (sd <= 85 && jenis !== 'RETENSI') tidak('SUBKON_01', 'Progres kumulatif ' + sd.toFixed(2).replace('.', ',') + '% (≤ 85%)');
      if (!um) tidak('SUBKON_03', 'Kontrak tanpa uang muka (bank garansi uang muka tidak diperlukan)');
      if (!ada(/mekanikal|elektrikal|\bme\b|\bmep\b|listrik|panel|genset|pompa|plumbing|hvac|kabel/)) tidak('SUBKON_07', 'Bukan pekerjaan ME');
      if (!ada(/tanah|pasir|batu|sirtu|urug|timbunan|agregat|quarry|galian c/)) { tidak('SUBKON_08', 'Bukan pekerjaan material alam'); tidak('SUBKON_09', 'Bukan pekerjaan material alam'); }
      if (sd < 100) { tidak('SUBKON_10', 'Pekerjaan belum selesai 100% (BAST-1 belum berlaku)'); tidak('SUBKON_11', 'Belum masa akhir pemeliharaan (BAST-2)'); tidak('SUBKON_12', 'Belum masa pemeliharaan'); }
      if (jenis === 'UANG_MUKA') { tidak('SUBKON_05', 'Tagihan uang muka tanpa opname'); tidak('SUBKON_06', 'Tagihan uang muka tanpa opname'); }
      cek('SUBKON_04', 'Wajib untuk pekerjaan spesialis — periksa lingkup pekerjaan');
    }
    if (kategori === 'ALAT') {
      cek('ALAT_11', 'Wajib hanya bila pemilik alat berbeda dengan vendor');
      if (!ada(/crane|forklift|excavator|loader|dozer|vibro|pile|hammer|truck|truk|bus|mobil|kendaraan|dump|tronton|trailer|genset|compressor|kompresor|grader|roller|ponton|tug/)) cek('ALAT_01', 'SILO/KIR/STNK wajib untuk alat angkat & kendaraan — periksa jenis alat');
    }
    return out;
  }

  /* ---------- penomoran ---------- */
  function nomorDok(kode, tagihanKe, noKontrak, nomorBA) {
    if (['BAPM', 'BAPA', 'BAPP', 'BAPSA'].indexOf(kode) >= 0 && nomorBA) return S(nomorBA);   // nomor resmi BA dari Input Progres
    const t = String(Math.max(1, parseInt(tagihanKe, 10) || 1)).padStart(2, '0');
    const sing = { BAP: 'BAP', REKAP_TERIMA: 'RPM', REKAP_SJ: 'RSJ', REKAP_BAYAR: 'RPB', REKAP_TS: 'RTS', SEWA: 'PSA', PAKAI: 'RPA', REKAP_QTY: 'RKH', CHECKLIST: 'CKL', INVOICE: 'DRAF-INV', KWITANSI: 'DRAF-KW', BAPM: 'BAPM', BAPA: 'BAPA', BAPP: 'BAPP' }[kode] || kode;
    return t + '/' + sing + '/' + S(noKontrak);
  }

  // sidik isi perhitungan (untuk mendeteksi perubahan & menautkan PDF ke revisi yang benar)
  function sidik(obj) {
    const t = JSON.stringify(obj); let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 2246822519) >>> 0; }
    return ('0000000' + h1.toString(16)).slice(-8) + ('0000000' + h2.toString(16)).slice(-8);
  }
  const sidikHitung = h => sidik({ j: h.jenis, i: h.items.map(r => [r.id, r.vol, r.harga, r.lalu, r.ini]), d: h.dasarTagihan, p: h.ppn, x: h.pph.nilai, n: h.neto, k: h.nilaiKontrak });

  return {
    VERSI, KATEGORI, SKEMA_PPN, JENIS_TAGIHAN, STATUS, STATUS_SIMPAN, TERKUNCI, DOKUMEN, DOK_STATUS, DOK_LABEL,
    hitung, konfigBersih, kategoriDariNomor, volumeDariProgres, urutEntri, bandingkan, rekapTimesheet, basisDariSatuan, cocokkanVolume, rekapSuratJalan,
    statusEfektif, transisiBoleh, syaratKondisional, nomorDok, sidik, sidikHitung, adaGalat,
    rupiah, angka, persen, terbilang, terbilangRp
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BLI;
