/* MP21019 — JENIS KONTRAK DINAMIS (SPPP · SPKP · SPMB) · NOMOR DOKUMEN · VALIDASI KEUANGAN BAP ADDENDUM
 * (2.10.19; Modul server 1.10.17 · fitur "jenisSPMB"). Aditif — data Register, Master, BK & Paket Tagihan tidak diubah.
 *  1. JENIS KONTRAK: kode jenis = ruas ke-2 nomor kontrak (ADDn dilewati). SPMB (Upah / Mandor Borong) kini dikenali di seluruh aplikasi:
 *     kategori checklist & Paket Tagihan = SUBKON, kode BA = BAPP, Excel = "BAP format" (BAPP · BAP · BAPR · rincian · lampiran).
 *     Berganti jenis kontrak = berganti ruas kode pada nomor: …/SPPP/… → …/SPKP/… → …/SPMB/…; seluruh nomor dokumen ikut.
 *  2. NOMOR DOKUMEN: <termin 2 digit>/<BAP|BAPP|BAPM|BAPR|BAST>/<nomor kontrak dasar termin itu>
 *        tanpa / sebelum addendum : 01/BAP/15/SPPP/WSKT-NK KSO/1726012/2026
 *        sesudah addendum ke-n    : 02/BAP/15/ADD-1/SPPP/WSKT-NK KSO/1726012/2026   (penulisan ADD mengikuti nomor addendum di Register)
 *     Teks jenis pada format baku tidak lagi tetap "SPPP"/"SPKP": narasi BAPP, judul lampiran, label DATA dan nama dokumen kontrak
 *     pada BAPR (DATA!B37) mengikuti kode jenis kontrak.
 *  3. VALIDASI KEUANGAN (kumulatif antar-termin, dihitung terpisah dari Excel lalu dibandingkan):
 *        prestasi yang lalu  = Σ volume BAP terdahulu × harga satuan rincian yang berlaku (kontrak awal / addendum)
 *        prestasi saat ini   = Σ volume BAP ini × harga satuan
 *        retensi / uang muka : yang lalu = Σ ROUND(% × nilai termin k) · saat ini = ROUND(% × prestasi saat ini) · s/d = lalu + ini
 *     PERBAIKAN 0% KELIRU: BK yang tercatat atas nomor ADDENDUM dengan kode item addendum (bukan kode item kontrak awal) terbaca
 *     volume 0 → "Prestasi saat ini 0%" / "Prestasi yang lalu 0%". Volume kini dipetakan lewat alias kode item keluarga kontrak.
 *     Galat (prestasi 0% padahal ada volume, retensi yang lalu 0 padahal BAP terdahulu dipotong, kumulatif > 100%, Excel ≠ hitungan)
 *     ditampilkan sebelum dokumen dipakai; hasilnya ada di window.mp21019Validasi(K) dan I.validasi. */
(function () {
  'use strict';
  if (window.__MP21019__) return; window.__MP21019__ = true;
  const S = v => String(v == null ? '' : v).trim();
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const ambil = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined || v === null ? fb : v; } catch (e) { return fb; } };
  const pilih = function () { for (let i = 0; i < arguments.length; i++) { const v = arguments[i]; if (v !== undefined && v !== null && S(v) !== '') return v; } return ''; };
  const NA = no => typeof window.mpNoAdd === 'function' ? window.mpNoAdd(no) : { induk: S(no), n: 0 };
  const b4 = x => Math.round(num(x) * 10000) / 10000;
  const rp = n => 'Rp ' + Math.round(num(n)).toLocaleString('id-ID');
  const pc = n => (num(n) * 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const progres = () => (ambil('PROG', {}) || {}).data || [];
  const ringkas = () => ambil('RINGKASAN', []) || [];
  const itVol = it => num(pilih(it.volumeEfektif, it.volume, it.volumeKontrak, it.vol));
  const itHarga = it => num(pilih(it.hargaSatuanEfektif, it.hargaSatuan, it.harga, it.hargaKontrak));
  const beri = (teks, jenis) => { try { if (typeof window.notif === 'function') window.notif(teks, jenis || 'err'); } catch (e) { } };

  /* ======================= 1. JENIS KONTRAK ======================= */
  /* nama: nama dokumen kontrak pada narasi BAPR · kategori: checklist & Paket Tagihan · ba: kode BA progres · format: Excel format baku */
  const JENIS = {
    SPM: { nama: '', kategori: 'BAHAN', ba: 'BAPM', format: 'spm' },
    SPPM: { nama: '', kategori: 'BAHAN', ba: 'BAPM', format: 'spm' },
    SPSA: { nama: '', kategori: 'ALAT', ba: 'BAPSA', format: '' },
    SPK: { nama: 'Surat Perintah Kerja (SPK)', kategori: 'SUBKON', ba: 'BAPP', format: 'bap' },
    SPPP: { nama: 'Surat Perjanjian Pemborongan Pekerjaan (SPPP)', kategori: 'SUBKON', ba: 'BAPP', format: 'bap' },
    SPKP: { nama: 'Surat Perjanjian Konsultan Perencana (SPKP)', kategori: 'SUBKON', ba: 'BAPP', format: 'bap' },
    SPKU: { nama: '', kategori: 'SUBKON', ba: 'BAPP', format: 'bap' },
    SPMB: { nama: 'Surat Perjanjian Mandor Borong (SPMB)', kategori: 'SUBKON', ba: 'BAPP', format: 'bap', upah: true }
  };
  const DOK = ['BAPP', 'BAPM', 'BAPA', 'BAPSA', 'BAPR', 'BAST', 'BAP'];
  const reADD = /^ADD-?\d+$/i;
  /* kode jenis kontrak dari nomor kontrak ATAU nomor dokumen (01/BAP/15/ADD-1/SPPP/…) */
  function jenis(no) {
    const r = S(no).split('/').map(x => x.trim().toUpperCase());
    for (let i = 0; i < r.length; i++) if (JENIS[r[i]]) return r[i];
    const t = r.filter(x => !reADD.test(x) && DOK.indexOf(x) < 0); return t[1] || '';
  }
  const info = no => JENIS[jenis(no)] || null;
  const namaDokumen = no => { const j = jenis(no), d = JENIS[j]; return (d && d.nama) || S('Kontrak ' + j); };
  /* ganti ruas kode jenis pada nomor kontrak / nomor dokumen: gantiJenis('02/BAP/15/ADD-1/SPPP/WSKT-NK KSO/1726012/2026', 'SPKP') */
  function gantiJenis(nomor, baru) {
    baru = S(baru).toUpperCase(); if (!baru) return S(nomor);
    const r = S(nomor).split('/'); let k = r.findIndex(x => !!JENIS[x.trim().toUpperCase()]);
    if (k < 0) { const t = r.map((x, i) => [x.trim().toUpperCase(), i]).filter(x => !reADD.test(x[0]) && DOK.indexOf(x[0]) < 0); k = t[1] ? t[1][1] : -1; }
    if (k < 0) return S(nomor); r[k] = baru; return r.join('/');
  }
  /* nomor kontrak dasar sebuah termin: add 0 → nomor kontrak awal, add n → <no urut>/ADDn/<sisa> (gaya penulisan ADD yang sudah ada dipertahankan) */
  function nomorKontrak(noKontrak, add, jenisBaru) {
    const asal = S(noKontrak), gaya = (/(?:^|\/)(ADD-?)\d+(?=\/)/i.exec(asal) || [])[1] || 'ADD';
    let no = NA(asal).induk; if (jenisBaru) no = gantiJenis(no, jenisBaru);
    add = Math.max(0, Math.round(num(add))); if (!add) return no;
    const k = no.indexOf('/'); return k < 0 ? no : no.slice(0, k) + '/' + gaya + add + no.slice(k);
  }
  /* nomor dokumen: { urut, dok, noKontrak, jenis?, add? } → "02/BAP/15/ADD-1/SPPP/…"; add tidak diisi = mengikuti noKontrak yang diberikan */
  function nomor(o) {
    o = o || {}; const dok = S(o.dok || 'BAP').toUpperCase(); if (DOK.indexOf(dok) < 0) throw new Error('Kode dokumen tidak dikenal: ' + dok);
    const add = o.add === undefined || o.add === null || o.add === '' ? NA(o.noKontrak).n : o.add;
    return String(Math.max(1, Math.round(num(o.urut)) || 1)).padStart(2, '0') + '/' + dok + '/' + nomorKontrak(o.noKontrak, add, o.jenis);
  }
  const nomorSet = (urut, noKontrak, o) => { const h = {}; ['BAPP', 'BAP', 'BAPM', 'BAPR', 'BAST'].forEach(d => { h[d] = nomor(Object.assign({}, o, { urut: urut, dok: d, noKontrak: noKontrak })); }); return h; };
  /* kode BA lain atas nomor BA yang sama: gantiDok('02/BAPP/15/…', 'BAPR') */
  const gantiDok = (nomorBA, dok) => S(nomorBA).replace(/\/(BAPP|BAPM|BAPA|BAPSA|BAPR|BAST|BAP)\//, '/' + S(dok).toUpperCase() + '/');

  /* kode BA progres: kontrak SPMB (upah) memakai BAPP seperti subkon */
  (function kaitKodeBA() {
    const f = window.kodeBA; if (typeof f !== 'function') { if ((kaitKodeBA.n = (kaitKodeBA.n || 0) + 1) < 40) setTimeout(kaitKodeBA, 1500); return; } if (f.__mp21019) return;
    const g = function (x) { let r = ''; try { r = f.apply(this, arguments); } catch (e) { }
      try { const d = info(x && (x.key || x.noKontrak || x)); if (d && d.upah && DOK.indexOf(S(r).toUpperCase()) < 0) return d.ba; } catch (e) { } return r; };
    g.__mp21019 = true; window.kodeBA = g;
  })();
  /* pilihan Jenis Kontrak di form (HTML dasar): daftar yang memuat SPPP & SPKP dilengkapi SPMB */
  function lengkapiPilihan() {
    document.querySelectorAll('select').forEach(sel => {
      if (sel.__mp21019) return; const O = [...sel.options], nilai = O.map(o => S(o.value || o.textContent).toUpperCase());
      if (nilai.indexOf('SPPP') < 0 || nilai.indexOf('SPKP') < 0) return; sel.__mp21019 = true;
      if (nilai.indexOf('SPMB') >= 0) return;
      const c = O[nilai.indexOf('SPPP')], o = document.createElement('option');
      o.value = S(c.value).toUpperCase() === 'SPPP' ? c.value.replace(/SPPP/i, 'SPMB') : 'SPMB';
      o.textContent = /^\s*SPPP\s*$/i.test(c.textContent) ? 'SPMB' : 'SPMB — Upah (Mandor Borong)';
      sel.appendChild(o);
    });
  }
  setInterval(() => { try { lengkapiPilihan(); } catch (e) { } }, 1500);

  /* ======================= 3. VALIDASI KEUANGAN KUMULATIF ======================= */
  const urut = (a, b) => (num(a.periodeKey) - num(b.periodeKey)) || (num(a.tagihanKe) - num(b.tagihanKe)) || S(a.dibuatPada).localeCompare(S(b.dibuatPada));
  const sumber = g => (g && g._mp21016 && g._mp21016.sumber) || g;
  const idDari = (g, it, i) => { const f = ambil('idItem', null); try { if (typeof f === 'function') return f(g, it, i); } catch (e) { } return it.kodeUnik || (g.key + '#' + i); };
  function keluarga(g0, e) {   // BK keluarga kontrak (kontrak awal + addendum) yang terbit sebelum BK e
    const kel = [g0.key, g0.keyAsli].concat(g0.terkait || []).filter(Boolean), fam = NA(g0.key).induk;
    return progres().filter(x => x && (!e || x.id !== e.id) && (kel.indexOf(x.noKontrak) >= 0 || NA(x.noKontrak).induk === fam) && (!e || urut(x, e) < 0));
  }
  /* volume sebuah BK per kode item dokumen (kode item addendum → kode item kontrak awal lewat alias leburan 2.10.13) */
  function volBK(x, al, ids) { const v = {}; Object.keys((x && x.items) || {}).forEach(k => { const t = k in ids ? k : (al[k] in ids ? al[k] : ''); if (t) v[t] = b4((v[t] || 0) + num(x.items[k])); }); return v; }

  /* PERBAIKAN 0% KELIRU: volume BK yang tersimpan dengan kode item addendum tidak terbaca pencarian per kode item dokumen.
   * Hanya nilai yang jelas berasal dari pencarian mentah (tanpa alias) yang dilengkapi — isian Preview BA yang sudah benar tidak disentuh. */
  function aliasVolume(K) {
    const g = K.g, g0 = sumber(g), al = g0._idAlias || {}; if (!K.progresId || !Object.keys(al).length || (g._mp21016 && g._mp21016.tahap === 0)) return 0;
    const e = progres().find(x => x && x.id === K.progresId); if (!e) return 0;
    const ids = {}; (g.items || []).forEach((it, i) => { if (itVol(it) > 0 || itHarga(it) > 0) ids[idDari(g, it, i)] = it; });
    const sebelum = keluarga(g0, e), vE = volBK(e, al, ids), vS = sebelum.map(x => volBK(x, al, ids)); let ubah = 0;
    K.ini = K.ini || {}; K.lalu = K.lalu || {};
    Object.keys(ids).forEach(id => {
      const iniMentah = num((e.items || {})[id]), iniAlias = num(vE[id]);
      if (Math.abs(num(K.ini[id]) - iniMentah) < 1e-6 && Math.abs(iniAlias - iniMentah) > 1e-6) { K.ini[id] = iniAlias; ubah++; }
      const kum = num(ids[id].volumeProgresKumulatif), laluMentah = kum + sebelum.reduce((s, x) => s + num((x.items || {})[id]), 0), laluAlias = b4(kum + vS.reduce((s, v) => s + num(v[id]), 0));
      if (Math.abs(num(K.lalu[id]) - laluMentah) < 1e-6 && Math.abs(laluAlias - laluMentah) > 1e-6) { K.lalu[id] = laluAlias; ubah++; }
    });
    return ubah;
  }

  function validasi(K) {
    const g = K.g, g0 = sumber(g), al = g0._idAlias || {}, a = K.mp21016 || null, butir = [];
    const e = K.progresId ? progres().find(x => x && x.id === K.progresId) || null : null;
    const ids = {}; let nilai = 0, lalu = 0, ini = 0;
    (g.items || []).forEach((it, i) => { const v = itVol(it), h = itHarga(it); if (!(v > 0) && !(h > 0)) return; const id = idDari(g, it, i); ids[id] = it;
      nilai += v * h; lalu += num((K.lalu || {})[id]) * h; ini += num((K.ini || {})[id]) * h; });
    const sebelum = keluarga(g0, e || { id: '', periodeKey: Infinity }), ret = num(K.retensi) / 100, um = num(K.uangMuka) / 100;
    /* nilai tiap termin terdahulu atas harga rincian dokumen ini (BK ber-termin sama digabung, seperti slot termin format baku) */
    const T = {}; let volLalu = 0;
    sebelum.forEach(x => { const v = volBK(x, g._mp21016 && g._mp21016.tahap === 0 ? {} : al, ids), k = Math.round(num(x.tagihanKe)) || 0;
      T[k] = (T[k] || 0) + Object.keys(v).reduce((s, id) => { volLalu += v[id]; return s + v[id] * itHarga(ids[id]); }, 0); });
    const termin = Object.keys(T).map(Number).sort((p, q) => p - q).map(k => ({ ke: k, nilai: T[k] }));
    const terminJml = termin.reduce((s, x) => s + x.nilai, 0), sisa = lalu - terminJml;   // progres bawaan sebelum aplikasi (volumeProgresKumulatif) → termin pertama
    if (Math.abs(sisa) > 0.5) { if (termin.length) termin[0].nilai += sisa; else termin.push({ ke: 0, nilai: sisa }); }
    const potong = p => { const L = termin.reduce((s, x) => s + Math.round(p * x.nilai), 0), I = Math.round(p * ini); return { persen: p, lalu: L, ini: I, sd: L + I }; };
    const R = potong(ret), U = potong(um), volIni = e ? Object.keys(e.items || {}).reduce((s, k) => s + num(e.items[k]), 0) : 0;
    const galat = (kode, teks) => butir.push({ kode: kode, tingkat: 'galat', teks: teks }), awas = (kode, teks) => butir.push({ kode: kode, tingkat: 'peringatan', teks: teks });
    const dok = S(K.nomor || g.key), tahap = a ? a.tahap : 0;
    if (!(nilai > 0)) galat('NILAI_NOL', 'Nilai dasar kontrak dokumen ' + dok + ' Rp 0 — rincian item (volume × harga) belum terbaca.');
    if (sebelum.length && volLalu > 0 && !(lalu > 0)) galat('LALU_NOL', 'Prestasi yang lalu 0% pada ' + dok + ' padahal ada ' + sebelum.length + ' BAP terdahulu bervolume — kode item BK terdahulu tidak cocok dengan rincian ' + (tahap > 0 ? 'addendum' : 'kontrak') + '.');
    if (e && volIni > 0 && !(ini > 0)) galat('INI_NOL', 'Prestasi saat ini 0% pada ' + dok + ' padahal BK memuat volume — kode item BK tidak cocok dengan rincian ' + (tahap > 0 ? 'addendum' : 'kontrak') + '.');
    if (nilai > 0 && lalu + ini > nilai + 1) galat('LEBIH_100', 'Prestasi s/d saat ini ' + pc((lalu + ini) / nilai) + ' (' + rp(lalu + ini) + ') melebihi nilai dasar ' + rp(nilai) + ' pada ' + dok + '.');
    if (!(ret > 0)) awas('RETENSI_NOL', 'Retensi 0% pada ' + dok + ': isi "Retensi (%)" di Buat Paket Tagihan › Konfigurasi bila kontrak ini beretensi.');
    else if (lalu > 0 && !(R.lalu > 0)) galat('RETENSI_LALU_NOL', 'Potongan retensi yang lalu Rp 0 pada ' + dok + ' padahal prestasi yang lalu ' + rp(lalu) + '.');
    if (a && tahap > 0 && !(num(a.nilaiAwal) > 0)) awas('NILAI_AWAL_NOL', 'Nilai Kontrak awal belum terbaca untuk kepala BAP addendum ' + dok + '.');
    if (a && tahap > 0 && !S(a.tgl)) awas('TGL_ADD_KOSONG', 'Tanggal addendum ' + S(a.no) + ' belum diisi di Register — kepala BAP hanya memuat nomornya.');
    const bayar = Math.round(ini - R.ini - U.ini);
    return { ok: !butir.some(b => b.tingkat === 'galat'), dokumen: dok, jenis: jenis(g.key), tahap: tahap, terminLalu: termin, butir: butir,
      angka: { nilaiDasar: Math.round(nilai), nilaiAwal: a ? Math.round(num(a.nilaiAwal)) : Math.round(nilai), nilaiAddendum: a && tahap > 0 ? Math.round(num(a.nilai)) : 0,
        prestasi: { lalu: lalu, ini: ini, sd: lalu + ini }, persen: { lalu: nilai ? lalu / nilai : 0, ini: nilai ? ini / nilai : 0, sd: nilai ? (lalu + ini) / nilai : 0 },
        retensi: R, uangMuka: U, setelahPotongan: bayar } };
  }
  window.mp21019Validasi = K => { try { return validasi(K); } catch (e) { return { ok: false, butir: [{ kode: 'GAGAL', tingkat: 'galat', teks: e.message }] }; } };
  const _beri = {};
  function umumkan(V) { (V.butir || []).filter(b => b.tingkat === 'galat').forEach(b => { if (_beri[b.teks]) return; _beri[b.teks] = 1; beri('VALIDASI BAP — ' + b.teks); }); }

  /* kasus dokumen: sesudah basis kontrak per BAP ditetapkan (2.10.16) → alias volume, lalu validasi */
  (function kaitKasus() {
    const f = window.mp21016Kasus; if (typeof f !== 'function') { if ((kaitKasus.n = (kaitKasus.n || 0) + 1) < 40) setTimeout(kaitKasus, 1500); return; } if (f.__mp21019) return;
    const g = function (K) {
      K = f.apply(this, arguments);
      try { if (K && K.g && !K.mp21019) { const n = aliasVolume(K); K.mp21019 = validasi(K); K.mp21019.aliasDipakai = n; umumkan(K.mp21019); } } catch (e) { try { console.warn('[MP21019] validasi', e); } catch (x) { } }
      return K;
    };
    g.__mp21019 = true; window.mp21016Kasus = g;
  })();

  /* ======================= 2. TEKS JENIS KONTRAK PADA FORMAT BAKU ======================= */
  function tulisJenis(K, I) {
    const no = S((K.mp21016 && K.mp21016.noAwal) || (sumber(K.g) || {}).keyAsli || K.g.key), j = jenis(no) || 'SPK', t = I.tulisan = I.tulisan || {}, add = K.mp21016 && K.mp21016.tahap > 0;
    const D = t.DATA = t.DATA || {}, P = t.BAPP = t.BAPP || {}, L = t.lamp1 = t.lamp1 || {};
    Object.assign(D, { A3: 'A. KONTRAK / ' + j, A4: 'Nomor ' + j + ' / Kontrak', A5: 'Tanggal ' + j, B37: namaDokumen(no) });
    if (!add) {   // dokumen addendum: narasi & judul lampiran sudah ditulis kepala addendum 2.10.16 (ikut kode jenis)
      P.C21 = { f: '"Menerangkan bahwa kedua belah pihak telah setuju dan sepakat melakukan pemeriksaan pekerjaan sesuai dengan lampiran ' + j + ' Nomor "&DATA!$B$4&", dan menyetujui prestasi pekerjaan berdasarkan :"' };
      L.B3 = { f: '"LAMPIRAN ' + j + ' NO. "&DATA!$B$4' };
    }
    I.jenisKontrak = j;
  }
  (function kaitIsian() {
    const f = window.mp298TambahIsian; if (typeof f !== 'function') { if ((kaitIsian.n = (kaitIsian.n || 0) + 1) < 40) setTimeout(kaitIsian, 1500); return; } if (f.__mp21019) return;
    const g = function (K, I, fmt) {
      const r = f.apply(this, arguments);
      try { if (fmt === 'bap' && K && K.g && I) tulisJenis(K, I); } catch (e) { try { console.warn('[MP21019] teks jenis kontrak', e); } catch (x) { } }
      try { if (K && K.mp21019 && I) I.validasi = K.mp21019; } catch (e) { }
      return r;
    };
    g.__mp21019 = true; Object.keys(f).forEach(k => { if (!(k in g)) g[k] = f[k]; }); window.mp298TambahIsian = g;
  })();
  (function kaitAsli() {   // mode rumus asli hanya menulis sel isian → teks jenis kontrak (bukan angka) ikut ditulis
    const f = window.mp298Asli; if (typeof f !== 'function') { if ((kaitAsli.n = (kaitAsli.n || 0) + 1) < 40) setTimeout(kaitAsli, 1500); return; } if (f.__mp21019) return;
    const g = function (K, I0) {
      const r = f.apply(this, arguments);
      try { if (r && r.I && r.I.jenis === 'bap' && I0 && I0.tulisan) { const s = I0.tulisan, t = r.I.tulisan = r.I.tulisan || {};
        if (s.BAPP && s.BAPP.C21) (t.BAPP = t.BAPP || {}).C21 = s.BAPP.C21;
        if (s.lamp1 && s.lamp1.B3) (t.lamp1 = t.lamp1 || {}).B3 = s.lamp1.B3; } } catch (e) { }
      return r;
    };
    g.__mp21019 = true; window.mp298Asli = g;
  })();
  /* hasil Excel dibandingkan dengan hitungan validasi (backup otomatis, pratinjau & cetak PDF paket) */
  function cekExcel(B, V) {
    const H = B && B.hasil && B.hasil.get('BAP  1'); if (!H || !V || !V.angka) return null;
    const A = V.angka, pasang = [['P31', A.prestasi.lalu, 'Prestasi yang lalu'], ['P32', A.prestasi.ini, 'Prestasi saat ini'], ['P36', A.retensi.lalu, 'Potongan retensi yang lalu'], ['P37', A.retensi.ini, 'Potongan retensi saat ini'],
      ['P35', A.retensi.sd, 'Potongan retensi s/d saat ini'], ['P41', A.uangMuka.lalu, 'Pengembalian uang muka yang lalu'], ['P42', A.uangMuka.ini, 'Pengembalian uang muka saat ini'], ['P40', A.uangMuka.sd, 'Pengembalian uang muka s/d saat ini']];
    const beda = pasang.filter(p => Math.abs(num(H.get(p[0])) - num(p[1])) > 1.5).map(p => ({ sel: 'BAP  1!' + p[0], nama: p[2], excel: num(H.get(p[0])), hitung: num(p[1]) }));
    return { cocok: !beda.length, beda: beda };
  }
  (function kaitBangun() {
    const f = window.mp293Bangun; if (typeof f !== 'function') { if ((kaitBangun.n = (kaitBangun.n || 0) + 1) < 40) setTimeout(kaitBangun, 1500); return; } if (f.__mp21019) return;
    const g = async function (K) {
      const B = await f.apply(this, arguments);
      try { const V = K && K.mp21019; if (V && B && B.I && B.I.jenis === 'bap') { B.I.validasi = V; V.excel = cekExcel(B, V);
        if (V.excel && !V.excel.cocok) { V.ok = false; const x = V.excel.beda[0], teks = 'Excel ' + V.dokumen + ': ' + x.nama + ' ' + rp(x.excel) + ' ≠ hitungan kumulatif ' + rp(x.hitung) + ' (' + x.sel + ').';
          V.butir.push({ kode: 'EXCEL_BEDA', tingkat: 'galat', teks: teks }); umumkan(V); } } } catch (e) { try { console.warn('[MP21019] cek Excel', e); } catch (x) { } }
      return B;
    };
    g.__mp21019 = true; window.mp293Bangun = g;
  })();

  window.mp21019Jenis = jenis; window.mp21019GantiJenis = gantiJenis; window.mp21019Nomor = nomor; window.mp21019NomorSet = nomorSet; window.mp21019GantiDok = gantiDok;
  window.MP21019 = { JENIS: JENIS, DOK: DOK, jenis: jenis, info: info, namaDokumen: namaDokumen, gantiJenis: gantiJenis, nomorKontrak: nomorKontrak, nomor: nomor, nomorSet: nomorSet, gantiDok: gantiDok, validasi: window.mp21019Validasi,
    dasarTermin: (key, progresId) => { try { const g = ringkas().find(x => x && (x.key === key || x.keyAsli === key || (x.terkait || []).indexOf(key) >= 0)); if (!g || typeof window.mp21016TahapBK !== 'function') return 0;
      return window.mp21016TahapBK(g, progresId ? progres().find(x => x && x.id === progresId) || null : null) || 0; } catch (e) { return 0; } } };
})();
