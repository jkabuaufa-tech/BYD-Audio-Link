/* MP21028 — PEMBARUAN 2.10.28 / 2.10.29: IDENTITAS NON-KSO MENYELURUH — KOP RESMI PT. WASKITA KARYA (PERSERO) Tbk
 * (aditif; berjalan dengan Modul server 1.10.18; isian kop tersimpan di server mulai Modul 1.10.20 · fitur "identitasKop")
 * Berlaku HANYA bila Identitas Pelaksana proyek = "Non-KSO (Tunggal)". Proyek KSO tidak berubah sedikit pun.
 *  1. [2.10.29] KOP RESMI sesuai acuan: logo Waskita · "PT. Waskita Karya (Persero) Tbk" (biru tua) · "INDUSTRI KONSTRUKSI" (merah) ·
 *     "Infrastructure Division" + nama proyek di kanan · garis merah tebal · baris alamat (biru muda). Dipakai SPM / Preview PO, BASO-BASTA,
 *     Bon Permintaan, BAP, BAPP, BAPM, BAPR, lampiran, dokumen paket tagihan, formulir gudang dan pratinjau Excel format baku.
 *     Nama proyek di kop & dokumen = "Pekerjaan Jaringan Irigasi Air Tanah (JIAT)" (dapat diubah Admin di Identitas Pelaksana).
 *  2. Setiap dokumen yang dicetak / dipratinjau: tulisan "WASKITA - NINDYA KSO" (semua ejaan) → nama perusahaan; NPWP KSO → NPWP perusahaan;
 *     baris "Kantor KSO : …" → alamat kantor perusahaan.
 *  3. Excel format baku (Master SPM 069 & BAP): logo Nindya dilepas, logo gabungan diganti logo Waskita; teks KSO di sel, kop dan
 *     blok tanda tangan diganti; INPUT!B6/B8/B15 dan DATA!B17/B18 diisi identitas perusahaan.
 *  4. Tampilan layar: ejaan "WASKITA - NINDYA, KSO" (berkoma) ikut diganti. */
(function () {
  'use strict';
  if (window.__MP21028__) return; window.__MP21028__ = true;
  var LOGO_WASKITA = 'data:image/png;base64,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';
  var KOSONG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var X = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var RE_KSO = /WASKITA\s*[-–—]\s*NINDYA\s*,?\s*KSO/gi, RE_NPWP = /1000[\s.]?0000[\s.]?0784[\s.]?582[04](?!\d)/g;
  var RE_ALAMAT_KSO = /Gedung Waskita IDSurvey\s*Tower\s*Jl\. M\.T\. Haryono Kavling No\.10, Jatinegara, Jakarta Timur/g, RE_KANTOR = /Kantor KSO\s*:/i;
  var ALAMAT_REF = 'Gedung Waskita Rajawali Tower, Jl. M.T. Haryono Kav. No.12-13 Bidaracina, Jatinegara-Jakarta Timur 13330', KONTAK_REF = '• Telp (021)8515521• waskitanindya.jict@gmail.com';
  var PROYEK_REF = 'Pekerjaan Jaringan Irigasi Air Tanah (JIAT)', KOP_ISIAN = ['kopNama', 'kopTagline', 'kopDivisi', 'kopAlamat', 'kopProyek'];
  var E = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var idProyek = function () { try { return S((typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || (REG && REG.sesi && REG.sesi.proyek)) || 'umum'; } catch (e) { return 'umum'; } };
  function kopLokal(baru) {   // cadangan di perangkat: dipakai selama server belum menyimpan isian kop (Modul < 1.10.20)
    var k = 'JICT_KOP_' + idProyek(), o = {}; try { o = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { o = {}; }
    if (baru) { o = Object.assign(o, baru); try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) { } }
    return o;
  }
  var resmi = function (n) { return S(n).toUpperCase().replace(/\(PERSERO\)/g, '(Persero)').replace(/\bTBK\b\.?/g, 'Tbk'); };
  function proyek() { try { return (typeof REG !== 'undefined' && REG && REG.sesi && (REG.sesi.cfg || REG.proyek)) || (typeof REG !== 'undefined' && REG && REG.proyek) || (typeof PROYEK !== 'undefined' && PROYEK) || {}; } catch (e) { return {}; } }

  /* ---------- identitas Non-KSO (null = proyek KSO) ---------- */
  function info() {
    var I = null; try { I = window.mp224Identitas && window.mp224Identitas(); } catch (e) { }
    if (!I || S(I.bentuk) !== 'TUNGGAL') return null;
    var nm = S(I.nama) || 'PT Waskita Karya (Persero) Tbk', np = S(I.npwp).replace(/\D/g, ''), al = S(I.alamat), L = kopLokal(), wk = /waskita\s+karya/i.test(nm) && !/nindya/i.test(nm);
    var isi = function (k, bawaan) { return S(I[k]) || S(L[k]) || bawaan; };
    if (np === '1000000007845824' || np === '1000000007845820') np = '';   // bawaan KSO yang ikut tersimpan = belum diisi
    if (/IDSurvey|Kantor KSO/i.test(al)) al = '';
    var T = { nama: nm, resmi: resmi(nm), npwp: np, alamat: al || (wk ? ALAMAT_REF : ''), unit: S(I.unit), logo: wk ? LOGO_WASKITA : '',
      kopNama: isi('kopNama', wk ? 'PT. Waskita Karya (Persero) Tbk' : nm), tagline: isi('kopTagline', wk ? 'INDUSTRI KONSTRUKSI' : ''), divisi: isi('kopDivisi', 'Infrastructure Division'),
      kopAlamat: isi('kopAlamat', wk ? ALAMAT_REF + KONTAK_REF : al), proyek: isi('kopProyek', PROYEK_REF) };
    T.kopHtml = kopHtml(T, 'kd'); return T;
  }
  /* kop resmi (gaya di dalam elemen → sama di dokumen mana pun). kelas "kd": dikenali pembagi halaman & unduh Word blok MP21024 */
  function kopHtml(T, kelas) {
    return '<div class="' + (kelas || 'kopw') + ' mp21028-kop" style="display:block;border:0;padding:0;margin:0 0 9px;font-family:Arial,Helvetica,sans-serif;text-align:left">' +
      '<div style="display:flex;align-items:flex-end;gap:9px;border-bottom:3px solid #D0021B;padding:0 0 2px">' +
      (T.logo ? '<img src="' + E(T.logo) + '" alt="Waskita" style="height:15mm;width:auto;flex:0 0 auto;display:block">' : '') +
      '<div class="kt" style="flex:1 1 auto;min-width:0;line-height:1.12"><div class="nm" style="font-size:17pt;font-weight:900;color:#0B1F6B;white-space:nowrap;letter-spacing:.2px;text-decoration:none">' + E(T.kopNama) + '</div>' +
      (T.tagline ? '<div class="tg" style="font-size:9.5pt;font-weight:700;color:#E30613">' + E(T.tagline) + '</div>' : '') + '</div>' +
      '<div class="kn" style="flex:0 0 auto;text-align:right;line-height:1.2;max-width:45%"><div class="dv" style="font-size:10pt;font-weight:700;color:#111">' + E(T.divisi) + '</div>' +
      (T.proyek ? '<div class="pr" style="font-size:7.5pt;font-weight:700;color:#111">' + E(T.proyek) + '</div>' : '') + '</div></div>' +
      (T.kopAlamat ? '<div class="al" style="font-size:6.6pt;color:#1E9BE0;padding-top:2px;line-height:1.25">' + E(T.kopAlamat) + '</div>' : '') + '</div>';
  }
  /* dokumen cetak lain (BA, Bon Permintaan, generator, formulir gudang, pratinjau Excel): kop di dalamnya diganti kop resmi */
  function kopDok(doc) {
    var T = info(); if (!T || !doc || !doc.querySelectorAll) return false;
    [].slice.call(doc.querySelectorAll('.kop')).forEach(function (k) {
      if (k.querySelector('.mp21028-kop') || (k.closest && k.closest('.mp21028-kop'))) return;
      if (k.querySelector('.nm, .mp296-kt')) {   // kop surat penuh
        var al = k.nextElementSibling; if (al && al.classList && al.classList.contains('alamat')) al.remove();
        var w = doc.createElement('div'); w.innerHTML = kopHtml(T, 'kopw'); k.replaceWith(w.firstChild); return;
      }
      var co = k.querySelector('.co');   // formulir: kotak identitas di kiri, kotak nomor formulir tetap
      if (co && k.querySelector('.fm')) co.innerHTML = '<span class="mp21028-kop" style="display:flex;align-items:center;gap:6px">' + (T.logo ? '<img class="lgi" src="' + E(T.logo) + '" alt="Waskita" style="height:40px;width:auto">' : '') +
        '<span style="line-height:1.15"><b style="color:#0B1F6B">' + E(T.kopNama) + '</b>' + (T.tagline ? '<small style="display:block;font-weight:700;font-size:7pt;color:#E30613">' + E(T.tagline) + '</small>' : '') + '<small style="display:block;font-weight:400;font-size:7pt">' + E(T.divisi) + ' · ' + E(T.proyek) + '</small></span></span>';
    });
    if (doc.querySelector('.xl-kop') && doc.head && !doc.getElementById('mp21028Xl')) { var st = doc.createElement('style'); st.id = 'mp21028Xl'; st.textContent = '.xl-kop-t .n{color:#0B1F6B;letter-spacing:.2px}.xl-kop-t .s{color:#E30613;font-size:9pt}.xl-kop-g{border-top-width:3px;border-top-color:#D0021B}.xl-kop-al{color:#1E9BE0}'; doc.head.appendChild(st); }
    return true;
  }
  window.mp21028KopDok = kopDok;
  window.mp21028Info = info;

  /* ---------- logo untuk bingkai gambar Excel (rasio bingkai dipertahankan agar logo tidak melar) ---------- */
  var PAS = {}, GBR = null;
  function pas(rasio) {   // logo rata kiri di kanvas transparan ber-rasio `rasio`
    var k = String(rasio); if (PAS[k]) return PAS[k];
    if (!GBR || !GBR.complete || !GBR.naturalWidth) return LOGO_WASKITA;
    try { var h = GBR.naturalHeight, w = Math.max(GBR.naturalWidth, Math.round(h * rasio)), c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(GBR, 0, 0); PAS[k] = c.toDataURL('image/png'); return PAS[k]; } catch (e) { return LOGO_WASKITA; }
  }
  try { GBR = new Image(); GBR.src = LOGO_WASKITA; } catch (e) { GBR = null; }

  /* ---------- 1. kop standar & gambar templat Excel mengikuti identitas ---------- */
  var ASLI = null;
  function terap() {
    var M = window.MP296, K = M && M.kop; if (!K) return null;
    if (!ASLI) ASLI = { nama: K.nama, proyek: K.proyek, alamat: K.alamat, sub: K.sub, logo: (K.logo || []).slice() };
    var T = info();
    if (!T) {
      if (K.__mp21028) { K.nama = ASLI.nama; K.proyek = ASLI.proyek; K.alamat = ASLI.alamat; K.logo = ASLI.logo.slice(); if (ASLI.sub === undefined) delete K.sub; else K.sub = ASLI.sub; delete K.__mp21028; }
      return null;
    }
    K.nama = T.kopNama; K.sub = T.tagline; K.proyek = T.divisi + (T.proyek ? ' · ' + T.proyek : ''); K.alamat = T.kopAlamat || ''; K.logo = [T.logo || KOSONG]; K.__mp21028 = true;
    return T;
  }
  window.mp21028Terap = terap;

  /* ---------- 2. teks: nama / NPWP / alamat KSO → perusahaan ---------- */
  function gantiTeks(t, T, esc) {
    var e = esc || function (v) { return v; };
    t = String(t).replace(RE_KSO, e(T.resmi)).replace(RE_NPWP, e(T.npwp || '-'));
    if (T.alamat) t = t.replace(RE_ALAMAT_KSO, e(T.alamat));
    return t.replace(/PT WASKITA KARYA \(PERSERO\) TBK\b\.?/g, e(resmi('PT WASKITA KARYA (PERSERO) TBK')));
  }
  function gantiHtml(html, T) {
    if (typeof html !== 'string' || !/NINDYA|Kantor KSO|0784|PERSERO\) TBK/i.test(html)) return html;
    var bag = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/g);   // hanya teks di antara tag
    for (var i = 0; i < bag.length; i += 2) { var s = bag[i]; if (!s) continue; if (RE_KANTOR.test(s)) s = s.replace(/Kantor KSO\s*:[\s\S]*/i, X(T.kopAlamat)); bag[i] = gantiTeks(s, T, X); }
    return bag.join('');
  }
  window.mp21028GantiHtml = function (h) { var T = info(); return T ? gantiHtml(h, T) : h; };
  window.mp21028Teks = function (t) { var T = info(); return T ? gantiTeks(t, T) : t; };

  /* ---------- 3. Excel: sharedStrings & teks gambar (kop, tanda tangan) ---------- */
  var LABEL = { 'Nama KSO': 'Nama Perusahaan', 'Alamat KSO': 'Alamat Perusahaan', 'NPWP KSO': 'NPWP Perusahaan', 'Nama Kuasa KSO': 'Nama Kuasa', 'Jabatan Kuasa KSO': 'Jabatan Kuasa', 'Batas Nilai Wajib Kuasa KSO (Rp)': 'Batas Nilai Wajib Kuasa (Rp)', 'H. KUASA KSO (BERLAKU DI BAP, LAMPIRAN, BAPR)': 'H. KUASA (BERLAKU DI BAP, LAMPIRAN, BAPR)' };   // judul isian; nilai sel tidak diubah
  function gantiRun(blok, tag, T, kop) {   // teks dapat terpecah di beberapa run ("W" + "ASKITA - NINDYA," + " KS" + "O")
    var re = new RegExp('(<' + tag + '(?:\\s[^>]*)?>)([^<]*)(</' + tag + '>)', 'g'), L = [], m;
    while ((m = re.exec(blok))) L.push(m[2]);
    if (!L.length) return blok;
    var utuh = L.join(''), baru;
    if (LABEL[utuh.trim()]) baru = LABEL[utuh.trim()];
    else if (RE_KANTOR.test(utuh)) baru = X(T.kopAlamat);
    else if (kop && /^\s*WASKITA\s*[-–—]\s*NINDYA\s*,?\s*KSO\s*$/i.test(utuh)) baru = X(T.kopNama);   // judul kop
    else if (kop && T.proyek && /Perkuatan Dermaga Barat JICT/i.test(utuh) && utuh.length < 140) baru = X(T.proyek);   // baris nama proyek di kop templat
    else baru = gantiTeks(utuh, T, X);
    if (baru === utuh) return blok;
    var n = 0; return blok.replace(re, function (s, a, t, z) { return n++ ? a + z : a + baru + z; });
  }
  function olah(F, jenis, dec, enc) {
    var T = info(); if (!T) return;
    Array.from(F.keys()).forEach(function (p) {
      var ss = p === 'xl/sharedStrings.xml', dr = /^xl\/drawings\/drawing\d+\.xml$/.test(p); if (!ss && !dr) return;
      var x = dec.decode(F.get(p)); if (!/NINDYA|KSO|JICT/i.test(x)) return;
      var y = ss ? x.replace(/<si>[\s\S]*?<\/si>/g, function (si) { return /NINDYA|KSO|0784/i.test(si) ? gantiRun(si, 't', T) : si; })
        : x.replace(/<a:p>[\s\S]*?<\/a:p>|<a:p\s[^>]*>[\s\S]*?<\/a:p>/g, function (par) { return /NINDYA|KSO|JICT/i.test(par) ? gantiRun(par, 'a:t', T, true) : par; });
      if (y !== x) F.set(p, enc.encode(y));
    });
  }
  /* gambar templat: logo Nindya dilepas dari setiap lembar; logo gabungan Waskita + Nindya diganti logo Waskita (rasio bingkai dipertahankan) */
  var GAMBAR = { spm: { buang: ['image2.png'], ganti: {} }, bap: { buang: ['image3.png'], ganti: { 'xl/media/image1.png': 326 / 148, 'xl/media/image4.png': 165 / 87 } } };
  var bita = function (url) { var b = atob(String(url).replace(/^data:[^,]*,/, '')), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  function zip(F, jenis, dec, enc) {   // F = Map jalur → Uint8Array isi berkas .xlsx templat (sebelum ditutup)
    var T = info(); if (!T || !F || typeof F.get !== 'function') return;
    var C = GAMBAR[jenis] || { buang: [], ganti: {} }, buang = C.buang.slice();
    Object.keys(C.ganti).forEach(function (p) { if (!F.has(p)) return; if (T.logo) F.set(p, bita(pas(C.ganti[p]))); else buang.push(p.split('/').pop()); });
    Array.from(F.keys()).filter(function (p) { return /^xl\/drawings\/_rels\/.+\.rels$/.test(p); }).forEach(function (rp) {
      var ids = (dec.decode(F.get(rp)).match(/<Relationship [^>]*>/g) || []).filter(function (r) { return buang.some(function (b) { return r.indexOf('media/' + b) >= 0; }); }).map(function (r) { return /Id="([^"]+)"/.exec(r)[1]; });
      var dp = rp.replace('_rels/', '').replace(/\.rels$/, ''); if (!ids.length || !F.has(dp)) return;
      var kena = function (x) { return ids.some(function (id) { return x.indexOf('r:embed="' + id + '"') >= 0; }); };
      var d = dec.decode(F.get(dp)).replace(/<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/xdr:\1>/g, function (a) {
        if (!kena(a)) return a;
        if (a.indexOf('<xdr:grpSp') < 0) return '';   // bingkai berisi gambar itu saja → dilepas utuh
        return a.replace(/<xdr:pic\b[\s\S]*?<\/xdr:pic>/g, function (g) { return kena(g) ? '' : g; });   // kop berupa grup (teks + logo): hanya gambarnya yang dilepas
      });
      F.set(dp, enc.encode(d));
    });
    olah(F, jenis, dec, enc);
  }
  window.mp21028Zip = zip;

  /* ---------- pemasangan: bungkus fungsi cetak, segarkan kop, rapikan layar ---------- */
  function bungkus(nama) {
    var c = window[nama]; if (typeof c !== 'function' || c.__mp21028) return;
    var g = function (html) { var T = null; try { T = terap(); } catch (e) { } var a = [].slice.call(arguments); if (T) { try { a[0] = gantiHtml(html, T); } catch (e) { } } return c.apply(this, a); };
    Object.keys(c).forEach(function (k) { g[k] = c[k]; }); g.__mp21028 = true; window[nama] = g;
  }
  function layar(T) {   // ejaan berkoma "WASKITA - NINDYA, KSO" di layar (blok 2.2.5 menangani ejaan tanpa koma)
    if (!document.body || !/NINDYA\s*,\s*KSO/i.test(document.body.textContent || '')) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.nodeName) || (p.closest && p.closest('[contenteditable="true"]'))) return NodeFilter.FILTER_REJECT; return /NINDYA\s*,\s*KSO/i.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
    var L = []; while (w.nextNode()) L.push(w.currentNode);
    L.forEach(function (n) { n.nodeValue = n.nodeValue.replace(RE_KSO, T.resmi); });
  }
  /* Identitas Pelaksana (Admin): isian kop resmi proyek Non-KSO */
  var LBL = { kopNama: 'Nama perusahaan di kop', kopTagline: 'Baris merah di bawah nama', kopDivisi: 'Divisi (kanan atas)', kopProyek: 'Nama proyek di kop & dokumen', kopAlamat: 'Baris alamat di bawah garis' };
  function kaitDialog() {
    var f = window.mp224IdentitasBuka; if (typeof f !== 'function' || f.__mp21028) return;
    var g = function () {
      var r = f.apply(this, arguments);
      try {
        var u = document.getElementById('mp224IdUnit'); if (!u || document.getElementById('mp21028_kopNama')) return r;
        var T = info() || {}, nilai = { kopNama: T.kopNama, kopTagline: T.tagline, kopDivisi: T.divisi, kopProyek: T.proyek, kopAlamat: T.kopAlamat };
        var jangkar = document.getElementById('mp2104IdAlamat') || u, kol = (jangkar.closest && jangkar.closest('.col-12')) || jangkar.parentNode;
        kol.insertAdjacentHTML('afterend', '<div class="col-12 mp21028-isian"><div class="small fw-bold mt-1">Kop surat proyek Non-KSO <span class="fw-normal text-muted">— dipakai bila bentuk = Non-KSO (Tunggal); kosongkan untuk nilai baku</span></div></div>' +
          ['kopNama', 'kopTagline', 'kopDivisi', 'kopProyek', 'kopAlamat'].map(function (k) { return '<div class="col-12 ' + (k === 'kopAlamat' || k === 'kopProyek' ? '' : 'col-md-4') + ' mp21028-isian"><label class="form-label small mb-0" for="mp21028_' + k + '">' + LBL[k] + '</label><input class="form-control form-control-sm" id="mp21028_' + k + '" maxlength="' + (k === 'kopAlamat' ? 300 : 200) + '" value="' + E(nilai[k] || '') + '"></div>'; }).join(''));
      } catch (e) { }
      return r;
    };
    g.__mp21028 = true; window.mp224IdentitasBuka = g;
  }
  function kaitSimpan() {
    var f = window.regAksi; if (typeof f !== 'function' || f.__mp21028) return;
    var g = function (nama, req) {
      if (nama === 'identitasSimpan' && req && req.data && document.getElementById('mp21028_kopNama')) {
        try { var o = {}; KOP_ISIAN.forEach(function (k) { var el = document.getElementById('mp21028_' + k); if (el) o[k] = S(el.value).slice(0, k === 'kopAlamat' ? 300 : 200); }); Object.assign(req.data, o); kopLokal(o); } catch (e) { }
      }
      return f.apply(this, arguments);
    };
    Object.keys(f).forEach(function (k) { g[k] = f[k]; }); g.__mp21028 = true; window.regAksi = g;
  }
  function pasang() { try { bungkus('mp224Cetak'); bungkus('mp296Cetak'); kaitDialog(); kaitSimpan(); var T = terap(); if (T) layar(T); } catch (e) { } }
  setInterval(pasang, 2000);
  if (document.body) setTimeout(pasang, 300); else document.addEventListener('DOMContentLoaded', function () { setTimeout(pasang, 300); });
  window.MP21028 = { info: info, terap: terap, gantiHtml: gantiHtml, olah: olah, zip: zip, kopHtml: kopHtml, kopDok: kopDok, kopLokal: kopLokal, logo: LOGO_WASKITA };
})();
