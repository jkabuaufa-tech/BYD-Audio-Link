/* MP293 — EXCEL FORMAT BAKU TERKINI (Preview BA) · PRATINJAU PAKET TAGIHAN = FORMAT EXCEL BAKU
 *  A. Tombol "Unduh Excel" di samping "Cetak / Simpan PDF" pada Preview BA (BAPM/BAPP/BAPA): Excel format baku diisi NILAI & NOMOR yang
 *     sedang dipratinjau (volume periode ini & s/d lalu, tanggal, nomor BA, penandatangan & alamat vendor, uang muka, retensi).
 *     Seluruh rumus dihitung di aplikasi (mesin XLH, divalidasi sama dengan nilai Excel pada berkas baku) dan nilainya disimpan
 *     di berkas → angka langsung tampil, termasuk di Protected View; Excel tetap menghitung ulang saat diedit.
 *  B. Paket Tagihan › Pratinjau: menampilkan sheet format baku (SPM · BAPM · BAP, atau rincian · lamp1 · BAPP · BAP) persis seperti
 *     cetakan Excel (penampil XLR: gaya sel, gabungan, kop & logo, skala & halaman A4) dari data paket; Cetak / Unduh Excel dari jendela yang sama.
 *     Dokumen generator lama tetap dapat dibuka dari tombol "Dokumen generator".
 *  Butuh blok MP292 (template format baku) & 2.9.2. Tanpa perubahan server.
 *  2.9.6: uraian pekerjaan dinamis (tanpa teks statis "SPPP"), daftar material utama BAP SPM urut nilai, tabel BAPP dipetakan ulang
 *  per baris lamp1 (baris kosong disembunyikan), tanggal kosong → "-" (bukan 30 Desember 1899), nomor kontrak & tanggal tidak bertumpuk,
 *  baris Addendum & Pekerjaan / Pengadaan tampil, narasi dibungkus utuh (XLR.rapikan), pratinjau berkop standar & dicetak lewat MP296. */
(function () {
  'use strict';
  if (window.__MP293__) return; window.__MP293__ = true;
  const XLH = window.XLH, XLR = window.XLR;
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const GAMBAR = window.__MP293_GAMBAR || {};   // { spm: { 'xl/media/x.emf': dataURL }, bap: {…} } — EMF → PNG untuk pratinjau
  const LEMBAR = { spm: ['SPM', 'BAPM', 'BAP'], bap: ['rincian ', 'lamp1', 'BAPP', 'BAP  1'] };
  const JUDUL = { SPM: 'SPM', BAPM: 'BAPM', BAP: 'BAP', 'rincian ': 'Rincian', lamp1: 'Lampiran (lamp1)', BAPP: 'BAPP', 'BAP  1': 'BAP' };

  /* ---------- sumber data aplikasi ---------- */
  const b64 = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
  const D0 = Date.UTC(1899, 11, 30);
  const serial = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - D0) / 864e5) : null; };
  const volItem = it => N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak ?? it.vol);
  const hargaItem = it => N(it.hargaSatuanEfektif ?? it.hargaSatuan ?? it.harga);
  const ID = (g, it, i) => { try { if (typeof idItem === 'function') return idItem(g, it, i); } catch (e) { } return (g.key || '') + '-' + i; };
  const S = v => String(v == null ? '' : v).trim();
  const jenisDari = no => (String(no || '').split('/')[1] || '').toUpperCase();
  const formatDari = no => ['SPM', 'SPPM'].indexOf(jenisDari(no)) >= 0 ? 'spm' : ['SPK', 'SPPP', 'SPKP', 'SPKU'].indexOf(jenisDari(no)) >= 0 ? 'bap' : '';
  window.mp293Format = formatDari;
  const bulat3 = v => Math.round(N(v) * 1000) / 1000;
  const TITIK = '..................................';   // penanda tangan vendor belum diisi (bukan "0")
  const daftarUtama = (L, n) => { const t = L.slice(0, n || 3).map(x => x.ur).filter(Boolean); return t.join(', ') + (L.length > (n || 3) ? ', dll.' : ''); };
  function entriDari(g) {
    const T = new Set([g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean)); let L = [];
    try { L = (typeof PROG !== 'undefined' && PROG.data) || []; } catch (e) { }
    return L.filter(e => T.has(e.noKontrak)).slice().sort((a, b) => N(a.tagihanKe) - N(b.tagihanKe) || String(a.tanggal || '').localeCompare(String(b.tanggal || '')));
  }
  function regDari(g) { try { return ((typeof REG !== 'undefined' && REG.data) || []).find(r => r.noKontrak === g.key) || null; } catch (e) { return null; } }
  const noBAP = no => String(no || '').replace(/\/(BAPM|BAPA|BAPP)\//, '/BAP/');
  function vendorLengkap(g, v) {
    let p = {}; try { p = (window.profilVendor && window.profilVendor(g.idVendor, g.namaVendor)) || {}; } catch (e) { }
    const m = (window.mp292VendorMaster && window.mp292VendorMaster(g.idVendor, g.namaVendor)) || {}; v = v || {};
    return { nama: v.nama || g.namaVendor || '', direktur: v.direktur || p.nama || m.pimpinan || '', jabatan: v.jabatan || p.jabatan || m.jabatan || 'Direktur', alamat: v.alamat || p.alamat || m.alamat || '', npwp: v.npwp || p.npwp || m.npwp || '', email: p.email || m.email || '', telp: p.telp || m.telp || '' };
  }

  /* ---------- kasus: dari Preview BA / dari Paket Tagihan ---------- */
  function kasusDariBA() {
    if (typeof BA === 'undefined' || !BA || !BA.g) throw new Error('Preview BA belum dibuka.');
    const g = BA.g, ini = {}, lalu = {};
    (BA.items || []).forEach(i => { if (i.judul) return; const it = g.items[i.idx]; if (!it) return; const id = ID(g, it, i.idx); ini[id] = N(i.ini); lalu[id] = N(i.lalu); });
    let nomor = ''; try { nomor = typeof nomorBA === 'function' ? nomorBA(BA.urut, BA.kode, g.key) : ''; } catch (e) { }
    return { g, ke: N(BA.urut) || 1, nomor, tanggal: BA.tanggal, progresId: BA.sumberProgres || null, ini, lalu, vendor: vendorLengkap(g, { direktur: BA.ttdNama, jabatan: BA.ttdJabatan, alamat: BA.alamatVendor }), uangMuka: N(BA.uangMuka), retensi: N(BA.retensi) };
  }
  function kasusDariPaket(T) {
    const g = T.g, e = T.entri || {}, ini = {}, lalu = {}, h = (T.paket && !T.ubah ? T.paket.hasil : T.hasil) || {};
    (h.items || []).forEach(r => { if (r.judul) return; ini[r.id] = N(r.ini); lalu[r.id] = N(r.lalu); });
    if (!(h.items || []).length) Object.keys(e.items || {}).forEach(id => { ini[id] = N(e.items[id]); });
    const v = T.l && T.l.vendor || {}, k = T.konfig || {};
    return { g, ke: N(e.tagihanKe) || 1, nomor: e.nomorBA || '', tanggal: (T.l && T.l.tanggalDok) || e.tanggal, progresId: e.id || null, ini, lalu,
      vendor: vendorLengkap(g, { nama: v.nama, direktur: v.ttdNama, jabatan: v.ttdJabatan, alamat: v.alamat, npwp: v.npwp }), uangMuka: N(k.uangMukaPersen), retensi: N(k.retensiPersen) };
  }
  window.mp293KasusPaket = kasusDariPaket;

  /* ---------- termin: BK sebelumnya per termin, sisa "s/d lalu" (realisasi di luar aplikasi) masuk termin 1 ---------- */
  function slot(K, kap) {
    const prev = entriDari(K.g).filter(e => e.id !== K.progresId && N(e.tagihanKe) < K.ke);
    const ids = Object.keys(Object.assign({}, K.ini, K.lalu));
    if (K.ke <= kap) {
      const S = []; for (let k = 1; k < K.ke; k++) { const L = prev.filter(e => N(e.tagihanKe) === k), e0 = L[L.length - 1]; const vol = {}; ids.forEach(id => { vol[id] = L.reduce((a, e) => a + N((e.items || {})[id]), 0); }); S.push({ vol, tanggal: e0 ? (e0.baTerbit || e0.tanggal) : '', nomor: e0 ? e0.nomorBA : '' }); }
      const sisa = {}; let ada = false; ids.forEach(id => { const s = bulat3(N(K.lalu[id]) - S.reduce((a, x) => a + x.vol[id], 0)); sisa[id] = s; if (Math.abs(s) > 1e-6) ada = true; });
      if (!ada || K.ke > 1) {
        if (ada) ids.forEach(id => { S[0].vol[id] = bulat3(S[0].vol[id] + sisa[id]); });
        S.push({ vol: Object.assign({}, K.ini), tanggal: K.tanggal, nomor: K.nomor });
        return { S, aktif: K.ke, gabung: false };
      }
    }
    const e0 = prev[prev.length - 1];
    return { S: [{ vol: Object.assign({}, K.lalu), tanggal: e0 ? (e0.baTerbit || e0.tanggal) : K.tanggal, nomor: e0 ? e0.nomorBA : '' }, { vol: Object.assign({}, K.ini), tanggal: K.tanggal, nomor: K.nomor }], aktif: 2, gabung: true };
  }

  /* ---------- isian sel format baku ---------- */
  function isianSPM(K) {
    const g = K.g, T = slot(K, 4), V = K.vendor, r = regDari(g) || {};
    const items = (g.items || []).map((it, i) => ({ it, id: ID(g, it, i), vol: volItem(it), harga: hargaItem(it) })).filter(x => x.vol || x.harga);
    if (items.length > 100) throw new Error('Format baku Master SPM memuat 100 item; kontrak ini ' + items.length + ' item.');
    const no = String(g.key).split('/'), INPUT = {}, ITEM = {};
    Object.assign(INPUT, { B23: V.direktur || TITIK, B24: V.nama, B25: V.alamat || '-', B26: V.npwp || '-', B30: V.email, B32: no[0] || '', B33: no[5] || '', B34: no[6] || '', B35: g.key,
      B36: serial(g.tglMulai || r.tglKontrak), B37: serial(g.tglSelesai || r.tglSelesai), B46: K.retensi / 100, B47: K.uangMuka / 100, B48: T.S.length, B49: T.aktif });
    const top = /(\d+)/.exec(String(r.top || g.top || '')); if (top) INPUT.B43 = Number(top[1]);
    for (let k = 0; k < 4; k++) { const s = T.S[k], b = 55 + k; INPUT['B' + b] = s ? serial(s.tanggal) : null; if (s && s.nomor) { INPUT['C' + b] = s.nomor; INPUT['D' + b] = noBAP(s.nomor); } }
    items.forEach((x, n) => { const b = 4 + n, it = x.it;
      ITEM['B' + b] = String(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || ''); ITEM['C' + b] = String(it.satuan || it.sat || '').trim() || '-'; ITEM['D' + b] = x.vol; ITEM['E' + b] = x.harga;
      'GHIJ'.split('').forEach((k, s) => { ITEM[k + b] = T.S[s] ? bulat3(T.S[s].vol[x.id]) : null; }); });
    // material utama BAP: item yang sudah terealisasi s/d termin aktif, urut nilai terbesar (min. 3 nama, "dll." bila lebih)
    const sd = x => T.S.slice(0, T.aktif).reduce((a, s) => a + N(s.vol[x.id]), 0), nm = x => String(x.it.itemPekerjaanEfektif || x.it.itemPekerjaan || x.it.uraian || '').trim();
    let utama = items.filter(x => sd(x) > 0).map(x => ({ ur: nm(x), n: sd(x) * x.harga })); if (!utama.length) utama = items.map(x => ({ ur: nm(x), n: x.vol * x.harga }));
    utama.sort((a, b) => b.n - a.n);
    return { jenis: 'spm', tulisan: { INPUT, ITEM, BAPM: { O1: T.aktif }, BAP: { N1: T.aktif, N31: daftarUtama(utama, 3) || '-' } }, ringkas: { item: items.length, termin: T.aktif, gabung: T.gabung } };
  }
  function isianBAP(K) {
    const g = K.g, T = slot(K, 6), V = K.vendor, r = regDari(g) || {};
    const semua = (g.items || []).map((it, i) => ({ it, id: ID(g, it, i), vol: volItem(it), harga: hargaItem(it), ur: String(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || '').trim() }));
    const nama = (semua.find(x => !x.vol && !x.harga && x.ur) || {}).ur || String(r.namaPekerjaan || r.uraian || '');
    // uraian pekerjaan: nama pekerjaan kontrak / judul lingkup; bila tidak ada → item termahal (jumlah harga) urut menurun
    const mahal = semua.filter(x => x.vol && x.harga).map(x => ({ ur: x.ur, n: x.vol * x.harga })).sort((a, b) => b.n - a.n);
    let uraian = String(r.namaPekerjaan || g.namaPekerjaan || '').trim() || nama || daftarUtama(mahal, 3);
    if (uraian && !/^(pekerjaan|pengadaan)\b/i.test(uraian)) uraian = 'Pekerjaan ' + uraian;
    const baris = []; let huruf = 0, nomor = 0, jdl = false, lewat = false;
    semua.forEach(x => {
      if (!x.vol && !x.harga) { if (!x.ur) return; if (!lewat && x.ur === nama) { lewat = true; return; } baris.push(jdl ? { C: x.ur } : { B: String.fromCharCode(65 + (huruf++ % 26)), C: x.ur }); jdl = true; nomor = 0; return; }
      jdl = false; baris.push({ B: ++nomor, D: x.ur, H: x.vol, I: String(x.it.satuan || x.it.sat || ''), J: x.harga, x });
    });
    if (baris.length > 25) throw new Error('Format baku BAP (lamp1/rincian) memuat 25 baris; kontrak ini ' + baris.length + ' baris (item + judul).');
    const DATA = {}, lamp1 = {}, REKAP = {}, rincian = {}, BAPP = {}, BAP1 = {};
    Object.assign(DATA, { B4: g.key, B5: serial(g.tglMulai || r.tglKontrak), B6: uraian || '-', B8: serial(g.tglMulai || r.tglKontrak), B9: serial(g.tglSelesai || r.tglSelesai),
      B22: V.direktur || TITIK, B23: V.jabatan, B24: V.nama, B28: T.aktif, B46: K.uangMuka / 100, B47: K.retensi / 100, B73: V.nama, B75: V.nama, B76: V.alamat || '-', B77: V.npwp || '-', B78: V.telp, B79: V.email, B82: V.nama, B84: V.alamat, B85: V.npwp });
    for (let k = 0; k < 6; k++) DATA['B' + (99 + k)] = T.S[k] ? serial(T.S[k].tanggal) : null;
    const akt = T.S[T.aktif - 1];
    if (akt && akt.nomor) { const nb = akt.nomor, pola = String(T.aktif).padStart(2, '0') + '/';
      DATA.B30 = nb.replace(/\/(BAPM|BAPA|BAP)\//, '/BAPP/'); DATA.B31 = noBAP(nb); DATA.B32 = nb.replace(/\/(BAPM|BAPA|BAPP|BAP)\//, '/BAPR/'); DATA.B33 = nb.replace(/\/(BAPM|BAPA|BAPP|BAP)\//, '/BAST/');
      if (T.gabung || !String(DATA.B30).startsWith(pola)) { BAPP.B10 = DATA.B30; BAP1.C11 = DATA.B31; } }
    lamp1.C14 = nama ? nama + ' meliputi;' : null;
    for (let n = 0; n < 25; n++) {
      const rl = 15 + n, rr = 13 + n, b = baris[n];
      ['B', 'C', 'D', 'H', 'I', 'J'].forEach(k => { lamp1[k + rl] = b && b[k] !== undefined ? b[k] : null; });
      lamp1['K' + rl] = b && b.x ? { f: `H${rl}*J${rl}` } : null;
      const R = {}; 'BCDNOPQRSTUVWX'.split('').forEach(k => { R[k] = null; });
      if (b && b.x) Object.assign(R, { B: { f: `lamp1!B${rl}` }, D: { f: `lamp1!D${rl}` }, N: { f: `lamp1!H${rl}` }, O: { f: `lamp1!I${rl}` }, P: { f: `lamp1!J${rl}` }, Q: { f: `P${rr}*N${rr}` }, R: { f: `IFERROR(Q${rr}/$Q$38,0)` },
        S: { f: `IF($AL$5<=1,0,SUM(OFFSET($AL${rr},0,0,1,$AL$5-1)))` }, T: { f: `IFERROR(S${rr}/N${rr}*R${rr},0)` }, U: { f: `IFERROR(INDEX($AL${rr}:$AQ${rr},$AL$5),0)` }, V: { f: `IFERROR(U${rr}/N${rr}*R${rr},0)` }, W: { f: `S${rr}+U${rr}` }, X: { f: `T${rr}+V${rr}` } });
      else if (b) Object.assign(R, { B: { f: `lamp1!B${rl}` }, C: { f: `lamp1!C${rl}` } });
      if (b && b.x) 'JKLMNO'.split('').forEach((k, s2) => { R[['AL', 'AM', 'AN', 'AO', 'AP', 'AQ'][s2]] = { f: `'REKAP PROGRES'!${k}${rr - 8}` }; });   // alokasi termin (pola baku; sebagian baris template contoh tidak memilikinya)
      if (b && b.x) R.AR = { f: `SUM($AL${rr}:$AQ${rr})` };
      Object.keys(R).forEach(k => { rincian[k + rr] = R[k]; });
      'JKLMNO'.split('').forEach((k, s) => { REKAP[k + (rl - 10)] = b && b.x && T.S[s] ? bulat3(T.S[s].vol[b.x.id]) : 0; });
    }
    rincian.AL5 = T.aktif; BAPP.T8 = T.aktif; BAP1.T9 = T.aktif;
    // BAPP: tabel dipetakan ulang 1:1 ke baris lamp1 (template contoh memakai baris tak beraturan & angka "0" pada baris kosong)
    const sembunyi = { lamp1: [], 'rincian ': [], BAPP: [] }, gayaB = [];
    for (let n = 0; n < 25; n++) {
      const rb = 36 + n, rl = 15 + n, rr = 13 + n, b = baris[n];
      'BCDJKLMNOPQ'.split('').forEach(k => { BAPP[k + rb] = null; });
      if (b && b.x) Object.assign(BAPP, { ['B' + rb]: { f: `lamp1!B${rl}` }, ['D' + rb]: { f: `lamp1!D${rl}` }, ['J' + rb]: { f: `lamp1!H${rl}` }, ['K' + rb]: { f: `'rincian '!S${rr}` }, ['L' + rb]: { f: `'rincian '!U${rr}` },
        ['M' + rb]: { f: `K${rb}+L${rb}` }, ['N' + rb]: { f: `L${rb}` }, ['O' + rb]: { f: `J${rb}-M${rb}` }, ['P' + rb]: { f: `lamp1!J${rl}` }, ['Q' + rb]: { f: `N${rb}*P${rb}` } });
      else if (b) Object.assign(BAPP, { ['B' + rb]: { f: `lamp1!B${rl}` }, ['C' + rb]: { f: `lamp1!C${rl}` } });
      if (!b) { sembunyi.lamp1.push(rl); sembunyi['rincian '].push(rr); if (n < 24) sembunyi.BAPP.push(rb); }
      else gayaB.push([b.x ? 40 : 36, rb]);   // gaya baris seragam: baris item (contoh baris 40) / baris judul (contoh baris 36)
    }
    BAPP.Q61 = { f: 'SUM(Q36:Q60)' };
    Object.assign(BAPP, { K68: { f: 'DATA!$B$46' }, N68: { f: 'N66*K68' }, K69: { f: 'DATA!$B$47' } });   // uang muka & retensi mengikuti DATA (template: konstanta 0 / 5%)
    // BAP: nomor & tanggal kontrak satu sel (tidak bertumpuk), baris Addendum & Pekerjaan / Pengadaan ditampilkan
    Object.assign(BAP1, { K20: { f: 'DATA!$B$4&"   Tanggal : "&IF(N(DATA!$B$5)<1,"-",TEXT(DATA!$B$5,"[$-21]dd mmmm yyyy"))' }, N20: null, P20: null, K21: S(r.noAddendum || g.noAddendum) || '-', K22: { f: 'DATA!$B$6' },
      // potongan retensi & pengembalian uang muka mengikuti DATA (template contoh: konstanta 5% / 0 pada baris "yang lalu" & "saat ini")
      J36: { f: '$K$27' }, M36: { f: 'P31' }, J37: { f: '$K$27' }, J41: { f: '$K$26' }, M41: { f: 'P31' }, J42: { f: '$K$26' } });
    return { jenis: 'bap', tulisan: { DATA, lamp1, 'REKAP PROGRES': REKAP, 'rincian ': rincian, BAPP, 'BAP  1': BAP1 }, sembunyi, tampil: { 'BAP  1': [21, 22] }, salinGaya: { BAPP: gayaB },
      ringkas: { item: baris.filter(b => b.x).length, termin: T.aktif, gabung: T.gabung } };
  }
  const isian = K => { const f = formatDari(K.g.key); if (!f) throw new Error('Format Excel baku tersedia untuk SPM/SPPM dan SPK/SPPP/SPKP; kontrak ini ' + jenisDari(K.g.key) + '.'); return f === 'spm' ? isianSPM(K) : isianBAP(K); };

  /* ---------- tulis sel, hitung rumus, simpan nilai ---------- */
  const XE = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  function isiSel(xml, ref, val) {
    const [, kh, rs] = /^([A-Z]+)(\d+)$/.exec(ref), r = Number(rs), kn = XLH.kolNo(kh);
    const isi = s => val === null || val === undefined || val === '' ? `<c r="${ref}"${s}/>` : typeof val === 'object' ? `<c r="${ref}"${s}><f>${XE(val.f)}</f></c>` : typeof val === 'number' ? `<c r="${ref}"${s}><v>${val}</v></c>` : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${XE(val)}</t></is></c>`;
    const m = new RegExp(`<c r="${ref}"(\\s[^>]*?)?(?:/>|>[\\s\\S]*?</c>)`).exec(xml);
    if (m) { const s = /\ss="\d+"/.exec(m[1] || ''); return xml.slice(0, m.index) + isi(s ? s[0] : '') + xml.slice(m.index + m[0].length); }
    const b = new RegExp(`<row r="${r}"(\\s[^>]*)?(?:/>|>([\\s\\S]*?)</row>)`).exec(xml);
    if (b) { const isiB = b[2] || ''; let pos = isiB.length; const reC = /<c r="([A-Z]+)\d+"/g; let c; while ((c = reC.exec(isiB))) { if (XLH.kolNo(c[1]) > kn) { pos = c.index; break; } }
      return xml.slice(0, b.index) + `<row r="${r}"${b[1] || ''}>` + isiB.slice(0, pos) + isi('') + isiB.slice(pos) + '</row>' + xml.slice(b.index + b[0].length); }
    const sdE = xml.indexOf('</sheetData>'); let pos = sdE; const reR = /<row r="(\d+)"/g; let x; while ((x = reR.exec(xml)) && x.index < sdE) { if (Number(x[1]) > r) { pos = x.index; break; } }
    return xml.slice(0, pos) + `<row r="${r}">${isi('')}</row>` + xml.slice(pos);
  }
  // tanggal kosong → "-" (Excel/LibreOffice menampilkan 0 sebagai 00 Januari 1900 / 30 Desember 1899)
  const tanggalAman = x => x.replace(/<f(\s[^>]*)?>([^<]*)<\/f>/g, (m, a, f) => f.indexOf('TEXT(') < 0 ? m : '<f' + (a || '') + '>' + f.replace(/(^|[^A-Z])TEXT\(([^(),]+),(&quot;|")((?:\[\$-\d+\])?dd? mmmm yyyy)\3\)/g, (m2, p, ref, q, k) => p + 'IF(N(' + ref + ')&lt;1,' + q + '-' + q + ',TEXT(' + ref + ',' + q + k + q + '))') + '</f>');
  function barisSembunyi(xml, r, ya) {
    const re = new RegExp('<row r="' + r + '"(\\s[^>]*?)?(/?>)'); if (!re.test(xml)) return ya ? xml.replace(/(<row r="(\d+)")/, (m, t, n) => m) : xml;
    return xml.replace(re, (m, a, t) => '<row r="' + r + '"' + (a || '').replace(/\shidden="[^"]*"/, '') + (ya ? ' hidden="1"' : '') + t);
  }
  function salinGayaBaris(xml, dari, ke, asli) {   // gaya sel baris `dari` (dari XML asli template) → baris `ke`
    if (dari === ke) return xml;
    const rd = new RegExp('<row r="' + dari + '"[^>]*>([\\s\\S]*?)</row>').exec(asli || xml); if (!rd) return xml; const gs = {};
    (rd[1].match(/<c r="[A-Z]+\d+"[^>]*>/g) || []).forEach(c => { const k = /<c r="([A-Z]+)/.exec(c)[1], st = /\ss="(\d+)"/.exec(c); if (st) gs[k] = st[1]; });
    return xml.replace(new RegExp('(<row r="' + ke + '"[^>]*>)([\\s\\S]*?)(</row>)'), (m, a, isi, z) => a.replace(/\s(ht|customHeight)="[^"]*"/g, '').replace('>', /\sht=/.test(rd[0]) ? ' ht="' + /\sht="([\d.]+)"/.exec(rd[0])[1] + '" customHeight="1">' : '>') + isi.replace(/<c r="([A-Z]+)(\d+)"(\s[^>]*?)?(\/?>)/g, (m2, k, n, at, t) => gs[k] ? '<c r="' + k + n + '"' + (at || '').replace(/\ss="\d+"/, '') + ' s="' + gs[k] + '"' + t : m2) + z);
  }
  // 2.9.6: logo kop tanpa "Member of Danareksa" (MP296.media: ganti berkas gambar; gambar kop lain berlabel Danareksa dibuang dari drawing)
  function bersihMedia(F, jenis, dec, enc) {
    const M = (window.MP296 && window.MP296.media) || {}, ganti = M[jenis] || {}, buang = M.buang || [];
    Object.keys(ganti).forEach(p => { if (F.has(p)) F.set(p, b64(String(ganti[p]).replace(/^data:[^,]*,/, ''))); });
    if (!buang.length) return;
    [...F.keys()].filter(p => /^xl\/drawings\/_rels\/.+\.rels$/.test(p)).forEach(rp => {
      const rels = dec.decode(F.get(rp)), ids = [...rels.matchAll(/<Relationship [^>]*>/g)].map(m => m[0]).filter(r => buang.some(b => r.indexOf('media/' + b) >= 0)).map(r => /Id="([^"]+)"/.exec(r)[1]);
      if (!ids.length) return;
      const dp = rp.replace('_rels/', '').replace(/\.rels$/, ''); if (!F.has(dp)) return;
      const x = dec.decode(F.get(dp)).replace(/<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/xdr:\1>/g, a => ids.some(id => a.indexOf('r:embed="' + id + '"') >= 0) ? '' : a);
      F.set(dp, enc.encode(x));
    });
  }
  async function bangun(K) {
    const I = isian(K), fmt = (window.__MP292_FORMAT || {})[I.jenis]; if (!fmt) throw new Error('Template format baku belum terpasang (butuh pembaruan 2.9.2).');
    const F = await XLH.bukaZip(b64(fmt)), enc = new TextEncoder(), dec = new TextDecoder();
    bersihMedia(F, I.jenis, dec, enc);
    let W = await XLH.muat(F);
    const ubahSheet = (sh, fn) => { const s = W.byNama[sh.toUpperCase()]; if (!s) throw new Error('Sheet "' + sh + '" tidak ada di format baku.'); F.set(s.path, enc.encode(fn(dec.decode(F.get(s.path))))); };
    Object.keys(I.salinGaya || {}).forEach(sh => ubahSheet(sh, x => { const asli = x; I.salinGaya[sh].forEach(([dari, ke]) => { x = salinGayaBaris(x, dari, ke, asli); }); return x; }));
    Object.keys(I.tulisan).forEach(sh => ubahSheet(sh, x => { Object.entries(I.tulisan[sh]).forEach(([ref, v]) => { x = isiSel(x, ref, v); }); return x; }));
    Object.keys(I.sembunyi || {}).forEach(sh => ubahSheet(sh, x => { I.sembunyi[sh].forEach(r => { x = barisSembunyi(x, r, true); }); return x; }));
    Object.keys(I.tampil || {}).forEach(sh => ubahSheet(sh, x => { I.tampil[sh].forEach(r => { x = barisSembunyi(x, r, false); }); return x; }));
    W.sheets.forEach(s => { const x = dec.decode(F.get(s.path)), y = tanggalAman(x); if (y !== x) F.set(s.path, enc.encode(y)); });
    W = await XLH.muat(F);
    const { hasil } = XLH.hitungSemua(W);
    W.sheets.forEach(s => { const H = hasil.get(s.nama); if (H && H.size) F.set(s.path, enc.encode(XLH.tulisNilai(dec.decode(F.get(s.path)), H))); });
    if (XLR && XLR.rapikan) { try { XLR.rapikan(W, hasil, F, LEMBAR[I.jenis]); W = await XLH.muat(F); } catch (e) { console.warn('[MP293] rapikan', e); } }   // narasi panjang dibungkus utuh
    return { I, W, hasil, F };
  }
  const namaBerkas = K => (formatDari(K.g.key) === 'spm' ? 'Master_SPM_' : 'BAP_format_') + String(K.nomor || K.g.key).replace(/[\\/:*?"<>|]+/g, '_') + '.xlsx';
  async function unduh(K) {
    const B = await bangun(K), bytes = await XLH.tutupZip([...B.F.entries()]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = namaBerkas(K);
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    pesan('Excel format baku diunduh: ' + (K.nomor || K.g.key) + ' · ' + B.I.ringkas.item + ' item · termin ' + B.I.ringkas.termin + (B.I.ringkas.gabung ? ' (BK sebelumnya digabung di termin 1)' : '') + '.', 'ok');
    return B;
  }
  window.mp293Bangun = bangun; window.mp293Unduh = unduh;

  /* ======================= A. Preview BA: tombol "Unduh Excel" ======================= */
  window.mp293UnduhBA = async () => {
    const b = $('mp293BtnBA'); if (b) { b.disabled = true; b.dataset.l = b.innerHTML; b.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Menyusun Excel…'; }
    try { await window.mp292MuatMaster && window.mp292MuatMaster(); await unduh(kasusDariBA()); } catch (e) { pesan(e.message, 'err'); }
    if (b) { b.disabled = false; b.innerHTML = b.dataset.l; }
  };
  function pasangBA() {
    const m = $('modalBA'); if (!m) return;
    const f = m.querySelector('.modal-footer'), cetak = f && [...f.querySelectorAll('button')].find(x => /cetakBA\(/.test(x.getAttribute('onclick') || ''));
    let b = $('mp293BtnBA');
    if (!b && cetak) { b = document.createElement('button'); b.type = 'button'; b.id = 'mp293BtnBA'; b.className = 'btn btn-outline-success me-1'; b.innerHTML = '<i class="fas fa-file-excel me-1"></i>Unduh Excel'; b.title = 'Unduh Excel format baku (Master SPM / BAP format) berisi nilai & nomor BA yang sedang dipratinjau'; b.onclick = () => window.mp293UnduhBA(); cetak.insertAdjacentElement('beforebegin', b); }
    if (b) { let ok = false; try { ok = typeof BA !== 'undefined' && BA && BA.g && !!formatDari(BA.g.key); } catch (e) { } b.hidden = !ok; }
  }
  const lama = $('mp292Btn'); if (lama) lama.remove();

  /* ======================= B. Pratinjau Paket Tagihan = format Excel baku ======================= */
  const PV = { B: null, K: null, f: '' };
  function tutupPv() { const w = $('mp293Pv'); if (w) w.remove(); }
  window.mp293PvTutup = tutupPv;
  window.mp293PvLembar = nama => {
    const fr = $('mp293Frame'); if (!fr || !fr.contentDocument) return;
    fr.contentDocument.querySelectorAll('.xl-hal').forEach(h => { h.style.display = !nama || h.dataset.sheet === nama ? '' : 'none'; });
    document.querySelectorAll('#mp293Pv .mp293-tab button').forEach(b => b.classList.toggle('on', (b.dataset.s || '') === (nama || '')));
  };
  window.mp293PvUnduh = async () => { if (PV.K) { try { await unduh(PV.K); } catch (e) { pesan(e.message, 'err'); } } };
  window.mp293PratinjauPaket = T => {
    if (!T || !T.g || !formatDari(T.g.key) || !(window.__MP292_FORMAT || {})[formatDari(T.g.key)]) return false;
    let K; try { K = kasusDariPaket(T); } catch (e) { return false; }
    PV.K = K; PV.f = formatDari(T.g.key); tutupPv();
    const w = document.createElement('div'); w.id = 'mp293Pv'; w.className = 'mp270-latar atas';
    w.innerHTML = `<div class="mp270-dlg pv mp293-dlg"><header><b>Pratinjau format Excel baku · ${E(PV.f === 'spm' ? 'Master SPM' : 'BAP format')} · ${E(K.nomor || T.g.key)}</b>
      <div class="d-flex gap-2 flex-wrap align-items-center"><span class="mp293-tab"><button class="on" data-s="" onclick="mp293PvLembar('')">Semua</button>${LEMBAR[PV.f].map(s => `<button data-s="${E(s)}" onclick="mp293PvLembar(this.dataset.s)">${E(JUDUL[s] || s)}</button>`).join('')}</span>
      <button class="btn btn-sm btn-primary" onclick="(window.mp296CetakFrame || (i => document.getElementById(i).contentWindow.print()))('mp293Frame')"><i class="fas fa-print me-1"></i>Cetak / Simpan PDF</button>
      <button class="btn btn-sm btn-outline-success" onclick="mp293PvUnduh()"><i class="fas fa-file-excel me-1"></i>Unduh Excel</button>
      <button class="btn btn-sm btn-outline-secondary" onclick="mp293PvTutup(); mp270Pratinjau(undefined, true)">Dokumen generator</button>
      <button class="btn-close" aria-label="Tutup" onclick="mp293PvTutup()"></button></div></header>
      <div class="mp293-isi"><div class="mp293-muat" id="mp293Muat"><i class="fas fa-spinner fa-spin me-2"></i>Menyusun format Excel baku…</div><iframe id="mp293Frame" title="Pratinjau format Excel baku" hidden></iframe></div></div>`;
    document.body.appendChild(w);
    setTimeout(async () => {
      try {
        if (window.mp292MuatMaster) await window.mp292MuatMaster();
        const B = await bangun(K); PV.B = B;
        const C = window.MP296 || {}, html = LEMBAR[PV.f].map(n => XLR.render(B.W, B.hasil, n, { gantiGambar: GAMBAR[PV.f] || {}, margin: C.margin, kop: C.kop })).join('');
        const fr = $('mp293Frame'); if (!fr) return;
        fr.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><title>' + E(K.nomor || T.g.key) + '</title><style>body{margin:0;padding:18px 0;background:#8a94a3}' + XLR.CSS + (C.cssXL || '') + '</style></head><body>' + html + '</body></html>';
        fr.hidden = false; const m = $('mp293Muat'); if (m) m.remove();
      } catch (e) { const m = $('mp293Muat'); if (m) m.innerHTML = '<div class="alert alert-warning m-3">Format Excel baku tidak dapat disusun: ' + E(e.message) + ' <button class="btn btn-sm btn-link" onclick="mp293PvTutup(); mp270Pratinjau(undefined, true)">Buka dokumen generator</button></div>'; }
    }, 30);
    return true;
  };

  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(() => { try { pasangBA(); const l = $('mp292Btn'); if (l) l.remove(); } catch (e) { } }, 150); };
  (function bungkus() { const f = window.bukaPreviewBA; if (typeof f !== 'function' || f.__mp293) return; const g = function () { const r = f.apply(this, arguments); jadwal(); return r; }; g.__mp293 = true; window.bukaPreviewBA = g; })();
  document.addEventListener('shown.bs.modal', ev => { if (ev.target && ev.target.id === 'modalBA') jadwal(); });
  const awasi = () => { if (!document.body) return; pasangBA(); new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length)) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();
