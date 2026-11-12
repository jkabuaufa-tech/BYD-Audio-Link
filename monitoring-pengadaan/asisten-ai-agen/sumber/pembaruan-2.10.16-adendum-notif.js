/* MP21016 — BAP KONTRAK AWAL vs BAP ADDENDUM · PERBANDINGAN KONTRAK AWAL ↔ ADDENDUM · NOTIFIKASI HANYA KONTRAK AKTIF
 * (2.10.16; Modul server 1.10.16 · fitur "notifKontrakAktif"). Aditif — data Register, Master, BK & Paket Tagihan tidak diubah.
 *  1. NOTIFIKASI: lonceng (Notifikasi prioritas), lonceng lama 2.2.x dan ringkasan yang dikirim ke server (email / Telegram terjadwal)
 *     melewati kontrak yang (a) berstatus PO CANCEL / HOLD (2.10.15), atau (b) sudah digantikan addendum yang lebih baru — masa berlaku
 *     keluarga kontrak hanya dihitung sekali, dari addendum terakhir. Kontrak lunas 100% sudah dilewati sejak 2.6.4 / 2.6.9.
 *  2. BASIS KONTRAK PER BAP: sesudah addendum melebur (2.10.13), BK/BAP yang terbit SEBELUM addendum tetap dicetak atas kontrak awal
 *     (nilai, volume, item & masa pelaksanaan kontrak awal); BK sesudahnya memakai rincian addendum, dengan kepala dokumen yang memuat
 *     nomor & tanggal addendum, nilai kontrak awal → nilai addendum dan masa pelaksanaan awal → addendum. Berlaku di Excel format baku
 *     (Preview BA › Unduh Excel, Pratinjau & Cetak PDF Paket Tagihan, Excel backup, Agen Tagihan).
 *  3. PERBANDINGAN ADDENDUM: rincian kontrak awal ↔ addendum per item (tetap / volume berubah / harga berubah / item baru / dihapus),
 *     pekerjaan tambah & kurang, total exclude PPN, PPN, total include PPN dan perubahan masa pelaksanaan — tampil langsung di dialog
 *     "Kontrak multi-item" saat Add. ke- diisi, dan dari Register Kontrak (tombol "Bandingkan awal ↔ addendum"); dapat dicetak. */
(function () {
  'use strict';
  if (window.__MP21016__) return; window.__MP21016__ = true;
  const $ = id => document.getElementById(id);
  const S = v => String(v == null ? '' : v).trim();
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ambil = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined || v === null ? fb : v; } catch (e) { return fb; } };
  const NA = no => typeof window.mpNoAdd === 'function' ? window.mpNoAdd(no) : { induk: S(no), n: 0 };
  const b4 = x => Math.round(num(x) * 10000) / 10000;
  const pilih = function () { for (let i = 0; i < arguments.length; i++) { const v = arguments[i]; if (v !== undefined && v !== null && S(v) !== '') return v; } return ''; };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const iso = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[0] : ''; };
  const tglP = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[3] + ' ' + BLN[Number(m[2]) - 1] + ' ' + m[1] : '-'; };
  const hariAntara = (a, b) => { a = iso(a); b = iso(b); return a && b ? Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5) : null; };
  const ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const rom = n => ROM[n] || String(n);
  const rp = n => 'Rp ' + Math.round(num(n)).toLocaleString('id-ID');
  const ang = (n, d) => num(n).toLocaleString('id-ID', { minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 4 : d });
  const regData = () => ambil('REG', {}).data || [];
  const ringkas = () => ambil('RINGKASAN', []) || [];
  const progres = () => (ambil('PROG', {}) || {}).data || [];
  const kecil = v => S(v).toLowerCase().replace(/\s+/g, ' ');
  const longgar = v => kecil(v).replace(/\s*([()+\-\/,.;:])\s*/g, '$1');   // "Mesin + Alat (2 unit)" ≈ "Mesin+Alat(2 unit)" — hanya untuk petunjuk, bukan pencocokan
  const itUr = it => S(pilih(it.itemPekerjaanEfektif, it.itemPekerjaan, it.uraian));
  const itKode = it => S(pilih(it.kodeItem, it.itemService, it.kode));
  const itVol = it => num(pilih(it.volumeEfektif, it.volume, it.volumeKontrak, it.vol));
  const itHarga = it => num(pilih(it.hargaSatuanEfektif, it.hargaSatuan, it.harga, it.hargaKontrak));
  const itSat = it => S(pilih(it.satuan, it.sat));

  /* ======================= 1. NOTIFIKASI: hanya kontrak aktif ======================= */
  let _fam = { t: 0, max: {} };
  function famMaks() {   // nomor induk → addendum tertinggi yang BERLAKU (Register: sudah diposting) dan punya barisnya sendiri
    const kini = Date.now(); if (kini - _fam.t < 1500) return _fam.max;
    const max = {}, catat = no => { no = S(no); if (!no) return; const p = NA(no); if (!(max[p.induk] >= p.n)) max[p.induk] = p.n; };
    regData().forEach(r => { if (!r) return; const p = NA(r.noKontrak); if (p.n === 0 || r.diposting) catat(r.noKontrak); });
    ringkas().forEach(g => { if (g) catat(g.key); });
    _fam = { t: kini, max: max }; return max;
  }
  /* true → kontrak ini tidak dipindai notifikasi. hanyaStatus: hanya uji PO CANCEL / HOLD (dipakai notifikasi "Draf Rp 0"). */
  window.mp21016Lewati = function (x, hanyaStatus) {
    try {
      const no = S(x && (x.key || (x.r && x.r.noKontrak) || (x.g && x.g.key))); if (!no) return false;
      const semua = [no].concat((x && x.nomor) || []).filter(Boolean);
      if (typeof window.mp21015Status === 'function' && semua.some(n => !!window.mp21015Status(n))) return true;   // PO CANCEL / HOLD
      if (hanyaStatus) return false;
      const p = NA(no);
      return (famMaks()[p.induk] || 0) > p.n;   // digantikan addendum yang lebih baru: yang dipantau addendum terakhir
    } catch (e) { return false; }
  };
  // status kontrak (2.10.15) dimuat belakangan / berubah → hitung ulang lonceng & kirim ringkasan baru ke server
  let _sidik = null;
  function pantauStatus() {
    const K = window.MP21015; if (!K || !K.siap) return;
    const s = Object.keys(K.peta || {}).sort().map(k => k + ':' + K.peta[k].status + ':' + K.peta[k].versi).join('|');
    if (s === _sidik) return; const awal = _sidik === null; _sidik = s; _fam.t = 0;
    try { if (typeof window.mp220HitungNotif === 'function') window.mp220HitungNotif(); } catch (e) { }
    try { if (typeof window.mp258Hitung === 'function') window.mp258Hitung(); } catch (e) { }
    try { if (!awal && typeof window.mp227KirimSnapshot === 'function') window.mp227KirimSnapshot(true); } catch (e) { }
  }
  setInterval(() => { try { pantauStatus(); } catch (e) { } }, 2000);

  /* ======================= 2. BASIS KONTRAK PER BAP (kontrak awal / addendum ke-n) ======================= */
  const regNo = no => regData().find(r => r && S(r.noKontrak) === S(no)) || null;
  /* susunan tahap keluarga kontrak yang sudah melebur: [0] kontrak awal, [n] addendum ke-n */
  function tahapan(g) {
    const ad = g && g._mp21013 && g.addendum; if (!ad || !ad.awal) return null;
    const rAwal = regNo(g.keyAsli || g.key) || regNo(g.key) || {};
    const T = [{ n: 0, no: g.keyAsli || g.key, nilai: num(ad.awal.nilai), tgl: iso(g.tglMulai || rAwal.tglKontrak), selesai: iso(ad.awal.tglSelesai || rAwal.tglSelesai), dibuat: S(rAwal.dibuatPada), items: ad.awal.items || [] }];
    (ad.rantai || []).slice().sort((a, b) => a.n - b.n).forEach(a => { const r = regNo(a.no) || {};
      T.push({ n: a.n, no: a.no, nilai: num(a.nilai) || num(r.nilai), tgl: iso(r.tglKontrak || a.tglMulai), selesai: iso(a.tglSelesai || r.tglSelesai), dibuat: S(r.dipostingPada || r.dibuatPada || a.dibuatPada), items: a.items || [] }); });
    return T.length > 1 ? T : null;
  }
  const idAwal = (g, it, i) => it.kodeUnik || ((g.keyAsli || g.key) + '#' + i);
  /* tahap kontrak yang menjadi dasar sebuah BK: 0 = kontrak awal, n = addendum ke-n (null = kontrak tanpa addendum melebur) */
  function tahapBK(g, e) {
    const T = tahapan(g); if (!T) return null;
    const akhir = T[T.length - 1].n; if (!e) return akhir;   // BK baru (belum tersimpan) selalu atas rincian yang berlaku
    const nBK = NA(e.noKontrak).n; if (nBK > 0) return Math.min(nBK, akhir);
    const tBA = iso(e.tanggalBA || e.tanggal), dibuat = S(e.dibuatPada); let t = 0;
    T.slice(1).forEach(a => {
      if (a.tgl && tBA && a.tgl > T[0].tgl) { if (tBA >= a.tgl) t = a.n; }                 // tanggal addendum bermakna → banding tanggal BA
      else if (a.dibuat && dibuat) { if (dibuat >= a.dibuat) t = a.n; }                     // cadangan: urutan pencatatan di aplikasi
      else t = a.n;
    });
    if (t < akhir) {   // pengaman: volume BK tidak muat di tahap itu (item baru addendum / melebihi volume tahap) → naik ke rincian berlaku
      const al = g._idAlias || {}, v0 = {}; tampak(g, t).items.forEach((it, i) => { v0[it.kodeUnik || idAwal(g, it, i)] = itVol(it); });
      const muat = Object.keys(e.items || {}).every(id => { const v = num(e.items[id]); if (!(v > 0)) return true; const k = al[id] || id; return k in v0 && v <= v0[k] + 1e-6; });
      if (!muat) t = akhir;
    }
    return t;
  }
  /* rincian addendum antara (bukan terakhir) dipetakan ke kode item kontrak awal — aturan sama dengan MP21013 */
  function petakan(g, a) {
    const asal = (g.addendum.awal.items || []).map((it, i) => ({ it: it, id: idAwal(g, it, i), pakai: false })).filter(x => itVol(x.it) > 0);
    const bebas = f => asal.filter(x => !x.pakai && f(x.it));
    return (a.items || []).map((it, i) => {
      if (!(itVol(it) > 0)) return it;
      const k = kecil(itKode(it)), u = kecil(itUr(it));
      let c = bebas(x => k && u && kecil(itKode(x)) === k && kecil(itUr(x)) === u);
      if (!c.length && u) c = bebas(x => kecil(itUr(x)) === u);
      if (!c.length && k) { c = bebas(x => kecil(itKode(x)) === k); if (c.length !== 1) c = []; }
      const m = c[0]; if (m) m.pakai = true;
      return Object.assign({}, it, { kodeUnik: m ? m.id : (it.kodeUnik || (a.no + '#' + i)), volumeProgresKumulatif: m ? num(m.it.volumeProgresKumulatif) : 0 });
    });
  }
  /* grup kontrak sebagaimana berlaku pada tahap t (tanpa mengubah grup asli) */
  function tampak(g, t) {
    const T = tahapan(g); if (!T) return g;
    const akhir = T[T.length - 1].n; if (t === null || t === undefined || t >= akhir) return g;
    const x = T.find(z => z.n === t) || T[0], aw = g.addendum.awal;
    const kor = aw.koreksi ? Object.assign({}, aw.koreksi) : g.koreksi;
    return Object.assign({}, g, { items: t === 0 ? aw.items : petakan(g, x), nilai: x.nilai, tglSelesai: x.selesai || g.tglSelesai, koreksi: kor, addendum: null, _mp21013: false, _idAlias: null,
      _mp21016: { tahap: t, no: x.no, sumber: g } });
  }
  function infoTahap(g, t) {
    const T = tahapan(g); if (!T) return null;
    const x = T.find(z => z.n === t) || T[T.length - 1], a0 = T[0];
    return { tahap: x.n, akhir: T[T.length - 1].n, no: x.no, noAwal: a0.no, tgl: x.tgl, tglAwal: a0.tgl, nilai: x.nilai, nilaiAwal: a0.nilai, selesai: x.selesai, selesaiAwal: a0.selesai };
  }
  /* NOMOR BA MENGIKUTI ADDENDUM: BK atas addendum ke-n → "02/BAPP/<nomor addendum ke-n>" (mis. 02/BAP/015/ADD1/SPPP/…), BK sebelum addendum
   * tetap "01/BAPP/<nomor kontrak awal>". Nomor yang sudah memuat ADDn (tahap mana pun) diseragamkan ke addendum tahap BK itu. */
  function nomorTahap(nomor, g, noTahap) {
    const n = S(nomor), tujuan = S(noTahap); if (!n || !tujuan || n.indexOf(tujuan) >= 0) return n;
    const T = tahapan(g) || [], calon = T.map(x => x.no).concat([g.keyAsli, g.key]).filter(Boolean).sort((a, b) => b.length - a.length);
    for (let i = 0; i < calon.length; i++) { const k = n.indexOf(calon[i]); if (k >= 0 && calon[i] !== tujuan) return n.slice(0, k) + tujuan + n.slice(k + calon[i].length); }
    return n;
  }
  window.mp21016NomorBA = (nomor, key, progresId) => { try { const g = ringkas().find(x => x && (x.key === key || x.keyAsli === key || (x.terkait || []).indexOf(key) >= 0)); if (!g) return S(nomor);
    const e = progresId ? progres().find(x => x && x.id === progresId) || null : null, t = tahapBK(g, e); return t > 0 ? nomorTahap(nomor, g, infoTahap(g, t).no) : S(nomor); } catch (e) { return S(nomor); } };
  window.mp21016Tahapan = tahapan; window.mp21016TahapBK = tahapBK; window.mp21016Tampak = tampak;

  /* kasus dokumen Excel (K dari Preview BA / Paket Tagihan / BK): dipanggil di awal isian() blok MP293.
   * BK sebelum addendum → K.g diganti tampilan kontrak awal dan volume ini / s.d. lalu dihitung ulang atas item kontrak awal. */
  window.mp21016Kasus = function (K) {
    try {
      if (!K || K.mp21016 || !K.g) return K;
      const g = K.g, T = tahapan(g); if (!T) return K;
      const e = K.progresId ? progres().find(x => x && x.id === K.progresId) || null : null;
      const t = tahapBK(g, e), akhir = T[T.length - 1].n;
      K.mp21016 = infoTahap(g, t);
      if (t > 0) { const nb = nomorTahap(K.nomor, g, K.mp21016.no); if (nb !== K.nomor) { K.nomorTersimpan = K.nomor; K.nomor = nb; } }   // nomor BA mengikuti addendum
      if (t !== null && t >= akhir && e) { try { cekHargaLalu(K, g, e); } catch (x) { } }
      if (t === null || t >= akhir || !e) return K;
      const gv = tampak(g, t), al = g._idAlias || {}, kunci = id => (t === 0 ? id : (al[id] || id)), ini = {}, lalu = {};
      const fID = ambil('idItem', null), idv = (it, i) => { try { if (typeof fID === 'function') return fID(gv, it, i); } catch (x) { } return it.kodeUnik || idAwal(g, it, i); };   // = ID() blok MP293
      const urut = (a, b) => (num(a.periodeKey) - num(b.periodeKey)) || (num(a.tagihanKe) - num(b.tagihanKe)) || S(a.dibuatPada).localeCompare(S(b.dibuatPada));
      const kel = [g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean), fam = NA(g.key).induk;
      const sebelum = progres().filter(x => x && x.id !== e.id && (kel.indexOf(x.noKontrak) >= 0 || NA(x.noKontrak).induk === fam) && urut(x, e) < 0);
      gv.items.forEach((it, i) => {
        if (!(itVol(it) > 0) && !(itHarga(it) > 0)) return;
        const id = idv(it, i);
        ini[id] = b4(Object.keys(e.items || {}).reduce((s, k) => s + (kunci(k) === id ? num(e.items[k]) : 0), 0));
        lalu[id] = b4(num(it.volumeProgresKumulatif) + sebelum.reduce((s, x) => s + Object.keys(x.items || {}).reduce((q, k) => q + (kunci(k) === id ? num(x.items[k]) : 0), 0), 0));
      });
      K.g = gv; K.ini = ini; K.lalu = lalu;
      return K;
    } catch (err) { try { console.warn('[MP21016] basis kontrak BK', err); } catch (x) { } return K; }
  };

  /* Addendum yang MENGUBAH HARGA SATUAN item yang sudah ditagihkan: dokumen menghitung "prestasi yang lalu" = volume s.d. lalu × harga
   * addendum, sehingga tidak sama dengan nilai BAP yang sudah terbit dan selisih harga atas volume lama tidak ikut tertagih.
   * Tidak dikoreksi otomatis (perlu keputusan kontraktual) — diberi tanda & peringatan agar diperiksa sebelum dokumen dipakai. */
  function cekHargaLalu(K, g, e) {
    const urut = (a, b) => (num(a.periodeKey) - num(b.periodeKey)) || (num(a.tagihanKe) - num(b.tagihanKe)) || S(a.dibuatPada).localeCompare(S(b.dibuatPada));
    const kel = [g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean), fam = NA(g.key).induk;
    const sebelum = progres().filter(x => x && x.id !== e.id && (kel.indexOf(x.noKontrak) >= 0 || NA(x.noKontrak).induk === fam) && urut(x, e) < 0);
    if (!sebelum.length || sebelum.some(x => !(num(x.nilai) > 0)) || (g.items || []).some(it => num(it.volumeProgresKumulatif) > 0)) return;
    const fID = ambil('idItem', null), nyata = sebelum.reduce((s, x) => s + num(x.nilai), 0);
    const hitung = (g.items || []).reduce((s, it, i) => { let id = it.kodeUnik || ((g.keyAsli || g.key) + '#' + i); try { if (typeof fID === 'function') id = fID(g, it, i); } catch (x) { } return s + num((K.lalu || {})[id]) * itHarga(it); }, 0);
    const beda = Math.round(hitung - nyata);
    if (Math.abs(beda) < 2) return;
    K.mp21016.selisihLalu = beda; K.mp21016.laluTerbit = Math.round(nyata);
    const teks = 'PERIKSA: prestasi yang lalu di dokumen ' + rp(hitung) + ' ≠ nilai BAP yang sudah terbit ' + rp(nyata) + ' (selisih ' + rp(beda) + '). Addendum mengubah harga satuan item yang sudah ditagihkan — potongan retensi "yang lalu" dan prestasi saat ini ikut bergeser. Tetapkan perlakuannya (item penyesuaian harga / koreksi BK) sebelum dokumen dipakai.';
    if (cekHargaLalu._t !== teks) { cekHargaLalu._t = teks; try { if (typeof window.notif === 'function') window.notif(teks, 'err'); } catch (x) { } }
  }

  /* kepala dokumen "BAP format" (SPK / SPPP / SPKP) untuk BK atas addendum */
  const jenisDari = no => (S(no).replace(/^ADD-?\d+\/|\/ADD-?\d+(?=\/)/i, '').split('/')[1] || '').toUpperCase();
  function tulisAddendum(I, a) {
    const t = I.tulisan = I.tulisan || {}, R = rom(a.tahap), tA = tglP(a.tgl), jn = jenisDari(a.noAwal) || 'SPKP';
    const B = t['BAP  1'] = t['BAP  1'] || {}, P = t.BAPP = t.BAPP || {}, Q = t['BAPR '] = t['BAPR '] || {}, L = t.lamp1 = t.lamp1 || {};
    const bedaWaktu = a.selesaiAwal && a.selesai && a.selesaiAwal !== a.selesai;
    // BAP: Kontrak (awal) · Addendum (no & tanggal) · Nilai Kontrak (awal) · Nilai Addendum (dasar perhitungan prestasi)
    Object.assign(B, { D21: 'Addendum ' + R + ' No. dan Tanggal ', K21: a.no + (a.tgl ? '   Tanggal : ' + tA : ''), K24: Math.round(a.nilaiAwal), D25: 'Nilai Addendum ' + R + ' ', K25: { f: 'lamp1!K41' },
      P24: '(Exclude PPN)' + (bedaWaktu ? ' · s/d. ' + tglP(a.selesaiAwal) : ''), P25: '(Exclude PPN)' + (bedaWaktu ? ' · s/d. ' + tglP(a.selesai) : ''),
      M30: { f: '$K$25' }, M31: { f: '$K$25' }, M32: { f: '$K$25' } });
    I.tampil = I.tampil || {}; I.tampil['BAP  1'] = [...new Set((I.tampil['BAP  1'] || []).concat([21, 25]))];
    // BAPP: nilai & waktu = addendum, nilai / waktu semula dicantumkan
    P.C21 = { f: '"Menerangkan bahwa kedua belah pihak telah setuju dan sepakat melakukan pemeriksaan pekerjaan sesuai dengan lampiran Addendum ' + R + ' Nomor ' + a.no.replace(/"/g, '') + (a.tgl ? ' tanggal ' + tA : '')
      + ' atas ' + jn + ' Nomor "&DATA!$B$4&", dan menyetujui prestasi pekerjaan berdasarkan :"' };
    P.M24 = '— Addendum ' + R + '; semula ' + rp(a.nilaiAwal);   // K24:L24 sel gabungan (teks terpotong) → catatan di M24
    if (bedaWaktu) P.M25 = '(Addendum ' + R + '; semula s.d. ' + tglP(a.selesaiAwal) + ')';
    // BAPR: baris Addendum di bawah Berita Acara Serah Terima
    Object.assign(Q, { B25: '-', C25: 'Addendum ' + R, F25: ':', G25: a.no + (a.tgl ? '   Tanggal : ' + tA : ''), K25: null, L25: null });   // satu sel agar nomor tidak terpotong
    I.salinGaya = I.salinGaya || {}; I.salinGaya['BAPR '] = (I.salinGaya['BAPR '] || []).concat([[24, 25]]);
    // Lampiran rekapitulasi kuantitas & harga = lampiran addendum
    Object.assign(L, { B3: 'LAMPIRAN ' + jn + ' NO. ' + a.no, F6: a.no }); if (a.tgl) L.F7 = tA;
    I.mp21016 = a;
  }
  /* POTONGAN RETENSI & PENGEMBALIAN UANG MUKA KONSISTEN ANTAR-BAP ("BAP format"):
   *   yang lalu    = Σ potongan tiap BAP terdahulu, masing-masing dibulatkan seperti saat BAP itu terbit: ROUND(% × nilai termin k)
   *   saat ini     = ROUND(% × prestasi saat ini)
   *   s/d saat ini = yang lalu + saat ini   (templat: ROUND(% × (lalu + ini)) dengan "yang lalu" tidak dibulatkan → dapat selisih Rp 1
   *                  terhadap jumlah potongan BAP-BAP yang sudah terbit bila nilai prestasi berpecahan)
   * BAPR: retensi per BAP dibulatkan sama, sehingga JUMLAH RETENSI = Σ potongan pada setiap BAP. */
  function rumusPotongan(t, aktif) {
    const B = t['BAP  1'] = t['BAP  1'] || {}, Q = t['BAPR '] = t['BAPR '] || {};
    const termin = k => "SUMPRODUCT(INDEX('rincian '!$AL$13:$AQ$37,0," + k + "),'rincian '!$P$13:$P$37)";
    const lalu = sel => { const L = []; for (let k = 1; k < aktif; k++) L.push('ROUND(' + sel + '*' + termin(k) + ',0)'); return L.length ? L.join('+') : '0'; };
    Object.assign(B, { P36: { f: lalu('$K$27') }, P35: { f: 'P36+P37' }, P41: { f: lalu('$K$26') }, P40: { f: 'P41+P42' } });
    for (let k = 0; k < 6; k++) Q['O' + (32 + k)] = { f: 'ROUND(J' + (32 + k) + '*$O$31,0)' };
  }
  const terminAktif = I => Math.max(1, Math.min(6, Math.round(num(I && I.tulisan && I.tulisan.DATA && I.tulisan.DATA.B28)) || 1));
  /* Master SPM (SPM / SPPM): daftar nomor BAPM / BAPA / BAPSA (kolom C) & BAP (kolom D) tiap termin, INPUT baris 55–58 —
   * termin terdahulu memakai nomor tersimpan di BK; yang terbit atas addendum diseragamkan ke nomor addendum tahapnya. */
  function nomorTerminSPM(IN, K) {
    for (let b = 55; b <= 58; b++) { const d = IN['D' + b]; if (typeof d === 'string') IN['D' + b] = d.replace(/\/BAPSA\//, '/BAP/'); }   // pasangan BAP untuk kode BAPSA (noBAP bawaan hanya mengenal BAPM / BAPA / BAPP)
    const g = (K.g._mp21016 && K.g._mp21016.sumber) || K.g; if (!tahapan(g)) return;
    const kel = [g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean), fam = NA(g.key).induk, sama = (a, b) => S(a).replace(/\/(BAPM|BAPA|BAPSA|BAPP)\//, '/BAP/') === S(b).replace(/\/(BAPM|BAPA|BAPSA|BAPP)\//, '/BAP/');
    const BK = progres().filter(e => e && (kel.indexOf(e.noKontrak) >= 0 || NA(e.noKontrak).induk === fam));
    for (let b = 55; b <= 58; b++) ['C', 'D'].forEach(k => { const v = IN[k + b]; if (typeof v !== 'string' || !v) return;
      const e = BK.find(x => sama(x.nomorBA, v)); if (!e) return; const t = tahapBK(g, e); if (t > 0) IN[k + b] = nomorTahap(v, g, infoTahap(g, t).no); });
  }
  (function kaitIsian() {
    const f = window.mp298TambahIsian; if (typeof f !== 'function') { setTimeout(kaitIsian, 1500); return; } if (f.__mp21016) return;
    const g = function (K, I, fmt) {
      const r = f.apply(this, arguments);
      try { if (fmt === 'bap' && I && I.tulisan) rumusPotongan(I.tulisan, terminAktif(I)); } catch (e) { try { console.warn('[MP21016] rumus potongan', e); } catch (x) { } }
      try { if (fmt === 'spm' && K && K.g && I && I.tulisan && I.tulisan.INPUT) nomorTerminSPM(I.tulisan.INPUT, K); } catch (e) { try { console.warn('[MP21016] nomor termin SPM', e); } catch (x) { } }
      try { const a = K && K.mp21016; if (a) { I.mp21016 = a; if (fmt === 'bap' && a.tahap > 0) tulisAddendum(I, a); } } catch (e) { try { console.warn('[MP21016] kepala addendum', e); } catch (x) { } }
      return r;
    };
    g.__mp21016 = true; Object.keys(f).forEach(k => { if (!(k in g)) g[k] = f[k]; }); window.mp298TambahIsian = g;
  })();
  (function kaitAsli() {   // dokumen addendum memakai mode perbaikan 2.9.6 (baris Addendum & Nilai Addendum ditampilkan; mode rumus asli menyembunyikannya)
    const f = window.mp298Asli; if (typeof f !== 'function') { setTimeout(kaitAsli, 1500); return; } if (f.__mp21016) return;
    const g = function (K, I0) {
      if (I0 && I0.jenis === 'bap' && I0.mp21016 && I0.mp21016.tahap > 0) return { alasan: 'BAP addendum: baris Addendum & Nilai Addendum ditampilkan (kepala dokumen 2.10.16)' };
      const r = f.apply(this, arguments);
      try { if (r && r.I && r.I.jenis === 'bap' && r.I.tulisan) rumusPotongan(r.I.tulisan, terminAktif(r.I)); } catch (e) { try { console.warn('[MP21016] rumus potongan (asli)', e); } catch (x) { } }
      return r;
    };
    g.__mp21016 = true; window.mp298Asli = g;
  })();

  /* ======================= 3. PERBANDINGAN KONTRAK AWAL ↔ ADDENDUM ======================= */
  const EPS_V = 1e-4, EPS_H = 0.005;
  /* cocokkan item: kode + uraian → uraian → kode (hanya bila tidak ambigu) — sama dengan aturan leburan MP21013, sehingga status
   * "tetap / berubah" di sini identik dengan item yang volume s.d. lalu-nya terbawa di BAP; "baru" = dihitung dari nol. */
  function banding(awal, baru) {
    const norm = (L, sumber) => { let seksi = ''; return (L || []).map((it, i) => { const ur = itUr(it), v = itVol(it), h = itHarga(it); if (!ur && !v && !h) return null;
      if (!v && !h) { seksi = ur; return { judul: true, ur: ur, seksi: ur, i: i }; }
      return { ur: ur, kode: itKode(it), sat: itSat(it), vol: v, harga: h, seksi: seksi, i: i, it: it, pakai: false }; }).filter(Boolean); };
    const A = norm(awal), B = norm(baru), a = A.filter(x => !x.judul), baris = [];
    const bebas = f => a.filter(x => !x.pakai && f(x));
    B.forEach(b => {
      if (b.judul) { baris.push({ judul: true, ur: b.ur }); return; }
      const k = kecil(b.kode), u = kecil(b.ur);
      let c = bebas(x => k && u && kecil(x.kode) === k && kecil(x.ur) === u);
      if (!c.length && u) c = bebas(x => kecil(x.ur) === u);
      if (!c.length && k) { c = bebas(x => kecil(x.kode) === k); if (c.length !== 1) c = []; }
      const m = c[0]; if (m) m.pakai = true;
      const r = { ur: b.ur, kode: b.kode, sat: b.sat, seksi: b.seksi, volAwal: m ? m.vol : 0, volAdd: b.vol, hargaAwal: m ? m.harga : 0, hargaAdd: b.harga, satAwal: m ? m.sat : '', awal: m ? m.it : null, add: b.it, catatan: [] };
      r.dVol = b4(r.volAdd - r.volAwal); r.jmlAwal = Math.round(r.volAwal * r.hargaAwal * 100) / 100; r.jmlAdd = Math.round(r.volAdd * r.hargaAdd * 100) / 100; r.dJml = Math.round((r.jmlAdd - r.jmlAwal) * 100) / 100;
      const vU = Math.abs(r.dVol) > EPS_V, hU = m && Math.abs(r.hargaAdd - r.hargaAwal) > EPS_H;
      r.status = !m ? 'BARU' : vU && hU ? 'VOLUME_HARGA' : vU ? 'VOLUME' : hU ? 'HARGA' : 'TETAP';
      if (m && kecil(m.sat) !== kecil(b.sat)) r.catatan.push('satuan ' + (m.sat || '-') + ' → ' + (b.sat || '-'));
      if (hU) r.catatan.push('harga satuan ' + rp(r.hargaAwal) + ' → ' + rp(r.hargaAdd));
      baris.push(r);
    });
    const hapus = a.filter(x => !x.pakai).map(x => ({ ur: x.ur, kode: x.kode, sat: x.sat, seksi: x.seksi, volAwal: x.vol, volAdd: 0, dVol: b4(-x.vol), hargaAwal: x.harga, hargaAdd: 0, satAwal: x.sat, awal: x.it, add: null,
      jmlAwal: Math.round(x.vol * x.harga * 100) / 100, jmlAdd: 0, dJml: -Math.round(x.vol * x.harga * 100) / 100, status: 'HAPUS', catatan: [] }));
    // petunjuk: item "baru" yang uraiannya mirip item "dihapus" (beda penulisan) — volume s.d. lalu TIDAK terbawa sebelum disamakan
    baris.filter(r => r.status === 'BARU').forEach(r => { const m = hapus.find(h => !h.mirip && longgar(h.ur) === longgar(r.ur)); if (m) { m.mirip = true;
      r.catatan.push('uraian mirip item rincian sebelumnya "' + m.ur + '" — samakan penulisan agar volume s.d. lalu terbawa'); m.catatan.push('mirip item addendum "' + r.ur + '"'); } });
    // item dihapus diletakkan di akhir seksi asalnya (bila seksi itu masih ada), selain itu di akhir tabel
    hapus.forEach(h => { let pos = -1, dalam = false;
      baris.forEach((r, i) => { if (r.judul) dalam = kecil(r.ur) === kecil(h.seksi); else if (dalam || (!h.seksi && !r.seksi)) pos = i; if (r.judul && dalam && pos < i) pos = i; });
      if (pos >= 0) baris.splice(pos + 1, 0, h); else baris.push(h); });
    const it = baris.filter(r => !r.judul), jum = f => Math.round(it.reduce((s, r) => s + f(r), 0) * 100) / 100;
    const T = { awal: jum(r => r.jmlAwal), add: jum(r => r.jmlAdd), tambah: jum(r => r.dJml > 0 ? r.dJml : 0), kurang: jum(r => r.dJml < 0 ? r.dJml : 0) };
    T.selisih = Math.round((T.add - T.awal) * 100) / 100; T.persen = T.awal ? T.selisih / T.awal : null;
    const hit = s => it.filter(r => r.status === s).length;
    T.n = { item: it.length, tetap: hit('TETAP'), volume: hit('VOLUME'), harga: hit('HARGA') + hit('VOLUME_HARGA'), baru: hit('BARU'), hapus: hit('HAPUS') }; T.n.volume += hit('VOLUME_HARGA');
    return { baris: baris, total: T };
  }
  window.mp21016BandingItem = banding;

  /* versi rincian satu keluarga kontrak: [0] kontrak awal, [n] addendum ke-n (Register: termasuk draf, ditandai) */
  function versi(noApa) {
    const ind = NA(noApa).induk, V = {};
    const g = ringkas().find(x => x && (x.key === ind || x.keyAsli === ind || (x.terkait || []).indexOf(ind) >= 0)) || null;
    if (g) {
      const T = tahapan(g);
      if (T) T.forEach(x => { V[x.n] = { n: x.n, no: x.no, items: x.items, nilai: x.nilai, tgl: x.tgl, selesai: x.selesai, sumber: 'RINGKASAN', g: g }; });
      else if (NA(g.key).n === 0) V[0] = { n: 0, no: g.keyAsli || g.key, items: g.items || [], nilai: num(g.nilai), tgl: iso(g.tglMulai), selesai: iso((g.koreksi && g.koreksi.tglSelesai) || g.tglSelesai), sumber: 'RINGKASAN', g: g };
    }
    regData().forEach(r => { if (!r || NA(r.noKontrak).induk !== ind) return; const n = NA(r.noKontrak).n;
      if (V[n]) { V[n].draf = !r.diposting; V[n].reg = r; if (!V[n].tgl) V[n].tgl = iso(r.tglKontrak); if (!V[n].selesai) V[n].selesai = iso(r.tglSelesai); return; }
      V[n] = { n: n, no: S(r.noKontrak), items: r.items || [], nilai: num(r.nilai), tgl: iso(r.tglKontrak), selesai: iso(r.tglSelesai), sumber: 'REGISTER', draf: !r.diposting, reg: r }; });
    ringkas().forEach(x => { if (!x || x === g) return; const p = NA(x.key); if (p.induk === ind && p.n > 0 && !V[p.n]) V[p.n] = { n: p.n, no: x.key, items: x.items || [], nilai: num(x.nilai), tgl: iso(x.tglMulai), selesai: iso(x.tglSelesai), sumber: 'RINGKASAN' }; });
    const L = Object.keys(V).map(Number).sort((a, b) => a - b).map(n => V[n]), mulai = (L[0] && L[0].n === 0 && L[0].tgl) || '';   // mulai pelaksanaan = tanggal kontrak awal
    L.forEach(x => { x.mulai = mulai || x.tgl; });
    return L;
  }
  window.mp21016Versi = versi;
  /* volume yang sudah ditagihkan per item versi `v` (BK seluruh keluarga, kode item disatukan lewat alias leburan) — untuk peringatan
   * addendum kurang di bawah realisasi. → Map(item → volume s.d. saat ini), atau null bila versi itu tidak berasal dari ringkasan kontrak. */
  function sudahTagih(v, sebelumTahap) {   // sebelumTahap: hanya BK yang terbit atas tahap < n (ditagih dengan harga lama)
    const g = v && v.g; if (!g) return null;
    const al = g._idAlias || {}, kel = [g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean), fam = NA(g.key).induk, m = new Map(), dasar = {};
    const satu = id => al[id] || id, idRaw = (it, i) => it.kodeUnik || (v.no + '#' + i);
    (g.items || []).forEach((it, i) => { dasar[it.kodeUnik || ((g.keyAsli || g.key) + '#' + i)] = num(it.volumeProgresKumulatif); });
    const BK = progres().filter(e => e && (kel.indexOf(e.noKontrak) >= 0 || NA(e.noKontrak).induk === fam)).filter(e => { if (sebelumTahap === undefined) return true; const t = tahapBK(g, e); return t === null || t < sebelumTahap; });
    (v.items || []).forEach((it, i) => { const id = satu(idRaw(it, i));
      m.set(it, b4((dasar[id] || 0) + BK.reduce((s, e) => s + Object.keys(e.items || {}).reduce((q, k) => q + (satu(k) === id ? num(e.items[k]) : 0), 0), 0))); });
    return m;
  }
  const KUNCI_PPN = 'MP21016_PPN';
  let _ppn = null;   // pilihan sesi ini (juga dipakai bila localStorage tidak tersedia)
  const batasPPN = v => Math.max(0, Math.min(100, Number(v)));
  const tarifPPN = () => { if (_ppn !== null) return _ppn; try { const v = localStorage.getItem(KUNCI_PPN); if (v !== null && v !== '' && isFinite(Number(v))) return batasPPN(v); } catch (e) { } return 11; };
  const setPPN = v => { if (v === '' || !isFinite(Number(v))) return; _ppn = batasPPN(v); try { localStorage.setItem(KUNCI_PPN, String(_ppn)); } catch (e) { } };
  /* susun perbandingan: dari = versi lama, ke = versi baru (objek versi atau { no, items, nilai, tgl, selesai, draf }) */
  function susun(dari, ke) {
    const H = banding(dari.items, ke.items), T = H.total, ppn = tarifPPN() / 100, peringatan = [];
    const tagih = sudahTagih(dari);
    if (tagih) H.baris.forEach(r => { if (r.judul || !r.awal) return; const s = tagih.get(r.awal); if (!(s > 0)) return; r.tagih = s;
      if (r.volAdd + EPS_V < s) { r.kurangTagih = true; r.catatan.push(r.status === 'HAPUS' ? 'item dihapus padahal sudah ditagihkan ' + ang(s) : 'volume addendum ' + ang(r.volAdd) + ' di bawah volume yang sudah ditagihkan ' + ang(s)); } });
    const tagihLama = tagih ? sudahTagih(dari, ke.n) : null;
    let selHarga = 0; H.baris.forEach(r => { if (r.judul || !r.awal || !tagihLama || r.status === 'HAPUS' || !(Math.abs(r.hargaAdd - r.hargaAwal) > EPS_H)) return; const vl = tagihLama.get(r.awal); if (!(vl > 0)) return; const d = Math.round(vl * (r.hargaAdd - r.hargaAwal)); selHarga += d; r.hargaTagih = true;
      r.catatan.push('harga berubah atas volume yang sudah ditagihkan dengan harga lama ' + ang(vl) + ' (selisih ' + rp(d) + ' tidak otomatis tertagih)'); });
    if (selHarga) peringatan.push('Harga satuan berubah pada item yang sudah ditagihkan: selisih ' + rp(selHarga) + ' atas volume s.d. lalu tidak otomatis masuk BAP berikutnya, dan "prestasi yang lalu" di BAP tidak lagi sama dengan nilai BAP terbit. Atur sebagai item penyesuaian harga tersendiri atau koreksi BK.');
    const nKur = H.baris.filter(r => r.kurangTagih).length;
    if (nKur) peringatan.push(nKur + ' item: volume addendum lebih kecil dari volume yang sudah ditagihkan (BAP terbit), termasuk item yang dihapus. Sesuaikan volume addendum atau koreksi BK terlebih dahulu.');
    if (num(dari.nilai) > 0 && Math.abs(num(dari.nilai) - T.awal) > 1) peringatan.push('Nilai ' + (dari.n ? 'addendum ke-' + dari.n : 'kontrak awal') + ' tercatat ' + rp(dari.nilai) + ' ≠ Σ volume × harga rincian ' + rp(T.awal) + ' (selisih ' + rp(num(dari.nilai) - T.awal) + ').');
    if (num(ke.nilai) > 0 && Math.abs(num(ke.nilai) - T.add) > 1) peringatan.push('Nilai addendum tercatat ' + rp(ke.nilai) + ' ≠ Σ volume × harga rincian ' + rp(T.add) + ' (selisih ' + rp(num(ke.nilai) - T.add) + ').');
    if (T.n.baru && H.baris.some(r => r.status === 'BARU' && /mirip/.test(r.catatan.join(' ')))) peringatan.push('Ada item addendum yang uraiannya hanya berbeda penulisan dari item rincian sebelumnya — dianggap item BARU (volume s.d. lalu tidak terbawa) sampai uraiannya disamakan.');
    const hr = hariAntara(dari.selesai, ke.selesai);
    return { dari: dari, ke: ke, baris: H.baris, total: T, tarif: tarifPPN(), ppnAwal: Math.round(T.awal * ppn), ppnAdd: Math.round(T.add * ppn), peringatan: peringatan,
      waktu: { mulai: dari.mulai || dari.tgl || ke.tgl, selesaiAwal: dari.selesai, selesaiAdd: ke.selesai, tambahHari: hr, durasiAwal: hariAntara(dari.mulai || dari.tgl, dari.selesai), durasiAdd: hariAntara(dari.mulai || dari.tgl, ke.selesai) } };
  }
  window.mp21016Susun = (no, dariN, keN) => { const V = versi(no); if (V.length < 2) return null; const ke = V.find(x => x.n === keN) || V[V.length - 1], dari = V.find(x => x.n === dariN) || V[Math.max(0, V.indexOf(ke) - 1)]; return susun(dari, ke); };

  const LBL = { TETAP: ['Tetap', 'tetap'], VOLUME: ['Volume berubah', 'ubah'], HARGA: ['Harga berubah', 'ubah'], VOLUME_HARGA: ['Volume & harga berubah', 'ubah'], BARU: ['Item baru', 'baru'], HAPUS: ['Dihapus', 'hapus'] };
  const tanda = (n, d) => (n > 0 ? '+' : n < 0 ? '−' : '') + ang(Math.abs(n), d);
  function tabel(D, ringkasSaja) {
    const T = D.total, w = D.waktu, nmDari = D.dari.n ? 'Addendum ' + rom(D.dari.n) : 'Kontrak awal', nmKe = 'Addendum ' + rom(D.ke.n || 1);
    const baris = D.baris.filter(r => !ringkasSaja || r.judul || r.status !== 'TETAP');
    const body = baris.map((r, i) => {
      if (r.judul) { const lanjut = baris[i + 1]; return (!lanjut || lanjut.judul) && ringkasSaja ? '' : `<tr class="jdl"><td colspan="11">${E(r.ur)}</td></tr>`; }
      const L = LBL[r.status];
      return `<tr class="${L[1]}${r.kurangTagih ? ' awas' : ''}"><td><span class="ur">${E(r.ur)}</span>${r.catatan.length ? `<div class="ct">${E(r.catatan.join(' · '))}</div>` : ''}</td><td class="c">${E(r.sat || r.satAwal || '')}</td>
        <td class="n">${r.status === 'BARU' ? '–' : ang(r.volAwal)}</td><td class="n">${r.status === 'HAPUS' ? '–' : ang(r.volAdd)}</td><td class="n d">${Math.abs(r.dVol) > EPS_V ? tanda(r.dVol) : '0'}</td>
        <td class="n">${r.status === 'BARU' ? '–' : ang(r.hargaAwal, 0)}</td><td class="n">${r.status === 'HAPUS' ? '–' : ang(r.hargaAdd, 0)}</td>
        <td class="n">${ang(r.jmlAwal, 0)}</td><td class="n">${ang(r.jmlAdd, 0)}</td><td class="n d">${Math.abs(r.dJml) >= 0.5 ? tanda(r.dJml, 0) : '0'}</td><td class="s"><span>${L[0]}</span></td></tr>`;
    }).join('');
    const kaki = (l, a, b, c, kelas) => `<tr class="tot ${kelas || ''}"><td colspan="7">${l}</td><td class="n">${a}</td><td class="n">${b}</td><td class="n d">${c}</td><td></td></tr>`;
    return `<table class="mp21016-tb"><thead><tr><th rowspan="2">Uraian pekerjaan</th><th rowspan="2">Sat</th><th colspan="3">Volume</th><th colspan="2">Harga satuan (Rp)</th><th colspan="3">Jumlah harga (Rp)</th><th rowspan="2">Status</th></tr>
      <tr><th>${E(nmDari)}</th><th>${E(nmKe)}</th><th>Tambah / kurang</th><th>${E(nmDari)}</th><th>${E(nmKe)}</th><th>${E(nmDari)}</th><th>${E(nmKe)}</th><th>Tambah / kurang</th></tr></thead>
      <tbody>${body || '<tr><td colspan="11" class="c">Tidak ada perbedaan rincian.</td></tr>'}</tbody>
      <tfoot>${kaki('Pekerjaan tambah', '', '', tanda(T.tambah, 0))}${kaki('Pekerjaan kurang', '', '', tanda(T.kurang, 0))}
        ${kaki('JUMLAH (Exclude PPN)', ang(T.awal, 0), ang(T.add, 0), tanda(T.selisih, 0) + (T.persen !== null ? ' (' + tanda(T.persen * 100, 2) + '%)' : ''), 'tebal')}
        ${kaki('PPN ' + ang(D.tarif, 0) + '%', ang(D.ppnAwal, 0), ang(D.ppnAdd, 0), tanda(D.ppnAdd - D.ppnAwal, 0))}
        ${kaki('TOTAL (Include PPN)', ang(T.awal + D.ppnAwal, 0), ang(T.add + D.ppnAdd, 0), tanda(T.add + D.ppnAdd - T.awal - D.ppnAwal, 0), 'tebal')}
        <tr class="tot"><td colspan="7">Masa pelaksanaan${w.mulai ? ' (mulai ' + E(tglP(w.mulai)) + ')' : ''}</td><td class="n">s.d. ${E(tglP(w.selesaiAwal))}</td><td class="n">s.d. ${E(tglP(w.selesaiAdd))}</td>
          <td class="n d">${w.tambahHari === null ? '-' : tanda(w.tambahHari, 0) + ' hari'}</td><td></td></tr></tfoot></table>`;
  }
  function ringkasTeks(D) {
    const n = D.total.n, T = D.total, b = [];
    if (n.baru) b.push(n.baru + ' item baru'); if (n.volume) b.push(n.volume + ' volume berubah'); if (n.harga) b.push(n.harga + ' harga berubah'); if (n.hapus) b.push(n.hapus + ' dihapus'); b.push(n.tetap + ' tetap');
    return `<div class="mp21016-rk"><span><b>${n.item}</b> item · ${E(b.join(' · '))}</span><span>Nilai (excl. PPN): <b>${E(rp(T.awal))}</b> → <b>${E(rp(T.add))}</b> <i class="${T.selisih < 0 ? 'turun' : 'naik'}">${E(tanda(T.selisih, 0))}${T.persen !== null ? ' · ' + E(tanda(T.persen * 100, 2)) + '%' : ''}</i></span>
      <span>Incl. PPN ${E(ang(D.tarif, 0))}%: <b>${E(rp(T.add + D.ppnAdd))}</b></span>${D.waktu.tambahHari ? `<span>Waktu: s.d. ${E(tglP(D.waktu.selesaiAwal))} → <b>${E(tglP(D.waktu.selesaiAdd))}</b> (${E(tanda(D.waktu.tambahHari, 0))} hari)</span>` : ''}</div>
      ${D.peringatan.map(p => `<div class="mp21016-awas"><i class="fas fa-triangle-exclamation me-1"></i>${E(p)}</div>`).join('')}`;
  }
  /* cetak: lampiran perbandingan (A4 lanskap) */
  const CSS_CETAK = '@page{size:A4 landscape;margin:12mm}body{font:10pt Arial,Helvetica,sans-serif;color:#000;margin:0}h1{font-size:12pt;text-align:center;margin:0 0 2px;text-transform:uppercase}h2{font-size:10pt;text-align:center;margin:0 0 10px;font-weight:400}'
    + '.id{margin:0 0 8px;border-collapse:collapse}.id td{padding:1px 6px 1px 0;vertical-align:top}.mp21016-tb{width:100%;border-collapse:collapse;font-size:8.5pt}.mp21016-tb th,.mp21016-tb td{border:1px solid #000;padding:2px 4px;vertical-align:top}.mp21016-tb th{background:#d9e2f3;text-align:center}'
    + '.mp21016-tb td.n{text-align:right;white-space:nowrap}.mp21016-tb td.c,.mp21016-tb td.s{text-align:center}.mp21016-tb tr.jdl td{font-weight:700;background:#f2f2f2}.mp21016-tb tr.baru td{background:#e7f6ec}.mp21016-tb tr.hapus td{background:#fde8e6}.mp21016-tb tr.ubah td.d{font-weight:700}'
    + '.mp21016-tb .ct{font-size:7.5pt;font-style:italic}.mp21016-tb tfoot td{font-weight:400}.mp21016-tb tfoot tr.tebal td{font-weight:700;background:#f2f2f2}.cat{font-size:8.5pt;margin:6px 0 0}.ttd{width:100%;margin-top:22px;text-align:center;font-size:10pt}.ttd td{width:50%;padding-top:0}.ttd .n{padding-top:56px;font-weight:700;text-decoration:underline}';
  function htmlCetak(D, vendor) {
    const K = ambil('KSO', {}) || {}, P = ambil('PROYEK', {}) || {};
    return `<h1>Perbandingan Kuantitas dan Harga</h1><h2>${D.dari.n ? 'Addendum ' + rom(D.dari.n) : 'Kontrak Awal'} terhadap Addendum ${rom(D.ke.n || 1)}${D.ke.draf ? ' (DRAF — belum diposting)' : ''}</h2>
      <table class="id"><tr><td>Nomor ${D.dari.n ? 'Addendum ' + rom(D.dari.n) : 'Kontrak'}</td><td>: ${E(D.dari.no)}${D.dari.tgl ? ' · tanggal ' + E(tglP(D.dari.tgl)) : ''}</td></tr>
        <tr><td>Nomor Addendum ${rom(D.ke.n || 1)}</td><td>: ${E(D.ke.no)}${D.ke.tgl ? ' · tanggal ' + E(tglP(D.ke.tgl)) : ''}</td></tr>
        <tr><td>Pihak Kedua</td><td>: ${E(vendor || '-')}</td></tr><tr><td>Proyek</td><td>: ${E(P.namaLengkap || K.proyek || P.nama || '-')}</td></tr></table>
      ${tabel(D, false)}
      ${D.peringatan.length ? `<div class="cat"><b>Catatan pemeriksaan:</b><br>${D.peringatan.map(p => '• ' + E(p)).join('<br>')}</div>` : ''}
      <div class="cat">Status item mengikuti pencocokan kode + uraian pekerjaan. "Item baru" dihitung dari volume nol; item yang "tetap / berubah" melanjutkan volume s.d. lalu dari BAP sebelum addendum. Harga belum termasuk PPN.</div>
      <table class="ttd"><tr><td>PIHAK KEDUA<br>${E(S(vendor).toUpperCase())}</td><td>PIHAK PERTAMA<br>${E(S(K.nama || 'WASKITA - NINDYA, KSO').toUpperCase())}</td></tr><tr><td class="n">( ………………………… )</td><td class="n">( ………………………… )</td></tr></table>`;
  }
  function cetak(D, vendor) {
    const isi = htmlCetak(D, vendor), judul = 'Perbandingan ' + D.dari.no + ' - ' + D.ke.no;
    const w = window.open('', '_blank');
    if (!w) { try { if (typeof window.notif === 'function') window.notif('Jendela cetak diblokir peramban. Izinkan pop-up untuk aplikasi ini.', 'err'); } catch (e) { } return false; }
    w.document.open(); w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + E(judul) + '</title><style>' + CSS_CETAK + '</style></head><body>' + isi + '</body></html>'); w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 350);
    return true;
  }
  window.mp21016HtmlCetak = htmlCetak;

  /* ---------- dialog perbandingan (Register Kontrak) ---------- */
  const M = { no: '', dari: null, ke: null, ringkas: false };
  const tutup = () => { const w = $('mp21016Modal'); if (w) w.remove(); };
  function gambarModal() {
    const V = versi(M.no); if (V.length < 2) { tutup(); try { if (typeof window.notif === 'function') window.notif('Kontrak ' + M.no + ' belum memiliki addendum untuk dibandingkan.', ''); } catch (e) { } return; }
    const ke = V.find(x => x.n === M.ke) || V[V.length - 1], dari = V.find(x => x.n === M.dari && x.n < ke.n) || V[Math.max(0, V.indexOf(ke) - 1)]; M.ke = ke.n; M.dari = dari.n;
    const D = susun(dari, ke), vendor = S((ke.reg && ke.reg.namaVendor) || (dari.g && dari.g.namaVendor) || (dari.reg && dari.reg.namaVendor));
    const nm = x => x.n ? 'Addendum ' + rom(x.n) + (x.draf ? ' (draf)' : '') : 'Kontrak awal';
    let w = $('mp21016Modal'); if (!w) { w = document.createElement('div'); w.id = 'mp21016Modal'; w.className = 'mp273-modal';
      w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-tutup]')) w.remove(); }); w.addEventListener('keydown', e => { if (e.key === 'Escape') w.remove(); }); document.body.appendChild(w); }
    w.innerHTML = `<div class="mp273-kotak mp21016-kotak" role="dialog" aria-modal="true" aria-labelledby="mp21016J"><div class="mp273-kepala"><b id="mp21016J"><i class="fas fa-code-compare me-1"></i>Perbandingan kontrak awal ↔ addendum</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi"><div class="mp21016-atas"><div><b class="font-monospace">${E(dari.no)}</b> → <b class="font-monospace">${E(ke.no)}</b><div class="mp21016-sub">${E(vendor || '-')}</div></div>
        <label>Dari<select class="form-select form-select-sm" id="mp21016Dari">${V.filter(x => x.n < ke.n).map(x => `<option value="${x.n}" ${x.n === dari.n ? 'selected' : ''}>${E(nm(x))}</option>`).join('')}</select></label>
        <label>Ke<select class="form-select form-select-sm" id="mp21016Ke">${V.filter(x => x.n > 0).map(x => `<option value="${x.n}" ${x.n === ke.n ? 'selected' : ''}>${E(nm(x))}</option>`).join('')}</select></label>
        <label>Tarif PPN (%)<input type="number" min="0" max="100" step="any" class="form-control form-control-sm" id="mp21016Ppn" value="${E(D.tarif)}"></label>
        <label class="cek"><input type="checkbox" id="mp21016Rk" ${M.ringkas ? 'checked' : ''}> Hanya yang berubah</label></div>
        ${ringkasTeks(D)}<div class="mp21016-gulung">${tabel(D, M.ringkas)}</div>
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Tutup</button><button type="button" class="btn btn-sm btn-primary" id="mp21016Cetak"><i class="fas fa-print me-1"></i>Cetak / Simpan PDF</button></div></div></div>`;
    // gambar ulang ditunda satu putaran: mengganti isi dialog di dalam penangan 'change' memicu blur → 'change' kedua pada elemen yang sedang dibuang
    const ulang = () => setTimeout(() => { if ($('mp21016Modal')) gambarModal(); }, 0);
    $('mp21016Dari').onchange = ev => { M.dari = Number(ev.target.value); ulang(); };
    $('mp21016Ke').onchange = ev => { M.ke = Number(ev.target.value); M.dari = null; ulang(); };
    $('mp21016Ppn').onchange = ev => { const lama = tarifPPN(); setPPN(ev.target.value); if (tarifPPN() !== lama) ulang(); };
    $('mp21016Rk').onchange = ev => { M.ringkas = !!ev.target.checked; ulang(); };
    $('mp21016Cetak').onclick = () => cetak(D, vendor);
  }
  window.mp21016Banding = no => { M.no = S(no); M.dari = null; M.ke = null; gambarModal(); };

  /* ---------- Register Kontrak: tombol "Bandingkan awal ↔ addendum" pada kartu kontrak ber-addendum ---------- */
  function hiasRegister() {
    const body = $('regBody'); if (!body) return;
    body.querySelectorAll('tr.baris-kontrak').forEach(tr => {
      let no = ''; if (tr.dataset.id) { const r = regData().find(x => x.id === tr.dataset.id); no = r ? S(r.noKontrak) : ''; } if (!no) no = S(tr.dataset.key); if (!no) return;
      const p = NA(no), ada = p.n > 0 || (famMaks()[p.induk] || 0) > 0 || ringkas().some(g => g && g._mp21013 && g.addendum && (g.key === no || g.keyAsli === no));
      const lama = tr.querySelector('.mp21016-btn');
      if (!ada) { if (lama) lama.remove(); return; }
      if (lama && lama.dataset.no === no) return; if (lama) lama.remove();
      const td = tr.children[1] || tr.children[0]; if (!td) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-link btn-sm p-0 mp21016-btn'; b.dataset.no = no; b.title = 'Perbandingan rincian kontrak awal ↔ addendum (volume, harga, item baru, total excl./incl. PPN)';
      b.innerHTML = '<i class="fas fa-code-compare me-1"></i>Bandingkan awal ↔ addendum'; td.appendChild(b);
    });
  }
  document.addEventListener('click', ev => {
    const b = ev.target && ev.target.closest ? ev.target.closest('.mp21016-btn') : null; if (!b) return;
    ev.preventDefault(); ev.stopImmediatePropagation(); window.mp21016Banding(b.dataset.no);
  }, true);

  /* ---------- dialog Kontrak multi-item: panel langsung saat Add. ke- diisi ---------- */
  function drafDialog() {
    const KD = typeof window.mp2622Keadaan === 'function' ? window.mp2622Keadaan() : null; if (!KD || KD.mode !== 'baru' || !KD.h) return null;
    const n = parseInt(KD.h.add, 10); if (!(n >= 1 && n <= 99)) return null;
    const no = S(($('m22No') || {}).value); if (!no || NA(no).n !== n) return null;
    const V = versi(no).filter(x => x.n < n && !x.draf); if (!V.length) return null;
    const items = (KD.items || []).filter(it => S(it.uraian) || num(it.vol) || num(it.harga));
    return { dari: V[V.length - 1], ke: { n: n, no: no, items: items, nilai: 0, tgl: iso(KD.h.tgl), selesai: iso(KD.h.selesai), draf: true }, vendor: S(KD.h.vendor) };
  }
  let _sidikDraf = '';
  function panelDialog() {
    const dlg = document.querySelector('#mp2622Kd .mp2622-dlg'); if (!dlg) { _sidikDraf = ''; return; }
    const X = drafDialog(), lama = $('mp21016Pan');
    if (!X) { if (lama) lama.remove(); _sidikDraf = ''; return; }
    const sidik = JSON.stringify([X.dari.no, X.ke.no, X.ke.tgl, X.ke.selesai, tarifPPN(), X.ke.items.map(i => [i.kode, i.uraian, i.vol, i.sat, i.harga])]);
    if (lama && sidik === _sidikDraf && lama.parentNode) return; _sidikDraf = sidik;
    const D = susun(X.dari, X.ke), buka = !lama || lama.open;
    const p = lama || document.createElement('details'); p.id = 'mp21016Pan'; p.className = 'mp21016-pan'; p.open = buka;
    p.innerHTML = `<summary><i class="fas fa-code-compare me-1"></i><b>Perbandingan ${X.dari.n ? 'Addendum ' + rom(X.dari.n) : 'kontrak awal'} ↔ Addendum ${rom(X.ke.n)}</b> <span class="mp21016-sub">${E(X.dari.no)} → ${E(X.ke.no)}</span>
        <button type="button" class="btn btn-sm btn-outline-secondary py-0 ms-2" id="mp21016PanCetak"><i class="fas fa-print me-1"></i>Cetak</button></summary>
      ${ringkasTeks(D)}<div class="mp21016-gulung">${tabel(D, true)}</div>`;
    if (!lama || !lama.parentNode) { const f = dlg.querySelector('footer'); if (f) dlg.insertBefore(p, f); else dlg.appendChild(p); }
    const c = $('mp21016PanCetak'); if (c) c.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); cetak(susun(X.dari, X.ke), X.vendor); };
  }

  /* ---------- pemasangan ---------- */
  let _t = 0;
  const jalan = () => { _t = 0; try { hiasRegister(); } catch (e) { } try { panelDialog(); } catch (e) { } };
  const tunda = () => { if (!_t) _t = setTimeout(jalan, 350); };
  const awasi = () => { new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }); document.addEventListener('input', ev => { if (ev.target && ev.target.closest && ev.target.closest('#mp2622Kd')) tunda(); }, true);
    document.addEventListener('change', ev => { if (ev.target && ev.target.closest && ev.target.closest('#mp2622Kd')) tunda(); }, true); tunda(); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();
