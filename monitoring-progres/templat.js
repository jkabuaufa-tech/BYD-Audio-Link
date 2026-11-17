/* =====================================================================
 * XlsxTemplat – mengisi / memotong file Excel ASLI tanpa mengubah format.
 * File .xlsx = arsip zip berisi XML. Modul ini membuka zip (SheetJS CFB),
 * mengubah hanya sel/elemen yang perlu, lalu menulis ulang. Gaya, font,
 * border, lebar kolom, gambar/logo, grafik & rumus lain tetap byte-identik.
 *
 *  - risalah(opsi)          : Form PW-PROD-30 Risalah Rapat Koordinasi terisi
 *  - sisakanLembar(z, nama) : workbook hanya berisi satu lembar (format asli)
 * Data template Risalah ada di templat-data.js (window.JIAT_TEMPLAT_RISALAH).
 * ===================================================================== */
window.XlsxTemplat = (function () {
  'use strict';
  var NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var DEKL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

  function cfb() { if (!window.XLSX || !XLSX.CFB) throw new Error('Pustaka Excel belum dimuat'); return XLSX.CFB; }
  function b64keBytes(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function bytesKeB64(u) { var s = '', K = 0x8000; for (var i = 0; i < u.length; i += K) s += String.fromCharCode.apply(null, u.subarray(i, i + K)); return btoa(s); }

  function buka(data) {
    var u = typeof data === 'string' ? b64keBytes(data) : (data instanceof Uint8Array ? data : new Uint8Array(data));
    return cfb().read(u, { type: 'array' });
  }
  function jalur(p) { return '/' + String(p).replace(/^\/+/, ''); }
  function ada(z, p) { return !!cfb().find(z, jalur(p)); }
  function teks(z, p) { var e = cfb().find(z, jalur(p)); if (!e) return null; return new TextDecoder('utf-8').decode(e.content); }
  function tulis(z, p, isi) { cfb().utils.cfb_add(z, jalur(p), typeof isi === 'string' ? new TextEncoder().encode(isi) : isi); }
  function hapus(z, p) { if (ada(z, p)) cfb().utils.cfb_del(z, jalur(p)); }
  function simpan(z) { return new Uint8Array(cfb().write(z, { type: 'array', fileType: 'zip', compression: true })); }
  function unduh(bytes, nama) {
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function dom(s) { var d = new DOMParser().parseFromString(s, 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('XML template rusak'); return d; }
  function xml(d) { return DEKL + new XMLSerializer().serializeToString(d.documentElement); }
  function el(d, nama) { return d.getElementsByTagNameNS(NS, nama); }

  /* ---------- alamat sel ---------- */
  function kolKeNo(k) { var n = 0; for (var i = 0; i < k.length; i++) n = n * 26 + (k.charCodeAt(i) - 64); return n; }
  function noKeKol(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function pecah(ref) { var m = /^([A-Z]+)(\d+)$/.exec(ref); return { k: m[1], r: +m[2] }; }

  /* ---------- daftar lembar ---------- */
  function lembar(z) {
    var wb = dom(teks(z, 'xl/workbook.xml')), rel = dom(teks(z, 'xl/_rels/workbook.xml.rels'));
    var peta = {};
    Array.prototype.forEach.call(rel.getElementsByTagNameNS(NS_REL, 'Relationship'), function (r) { peta[r.getAttribute('Id')] = r.getAttribute('Target'); });
    return Array.prototype.map.call(el(wb, 'sheet'), function (s, i) {
      var rid = s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      var t = peta[rid] || ''; t = t.charAt(0) === '/' ? t.slice(1) : 'xl/' + t;
      return { nama: s.getAttribute('name'), rid: rid, path: t, index: i };
    });
  }

  /* ---------- relasi bagian (untuk membuang bagian milik lembar yang dihapus) ---------- */
  function relsDari(path) { var i = path.lastIndexOf('/'); return path.slice(0, i) + '/_rels/' + path.slice(i + 1) + '.rels'; }
  function resolve(dasar, target) {
    if (target.charAt(0) === '/') return target.slice(1);
    var bag = dasar.split('/'); bag.pop();
    target.split('/').forEach(function (p) { if (p === '..') bag.pop(); else if (p !== '.') bag.push(p); });
    return bag.join('/');
  }
  function bagianTerkait(z, path, kumpul) {
    if (kumpul[path]) return kumpul; kumpul[path] = 1;
    var r = teks(z, relsDari(path)); if (!r) return kumpul;
    kumpul[relsDari(path)] = 1;
    var d = dom(r);
    Array.prototype.forEach.call(d.getElementsByTagNameNS(NS_REL, 'Relationship'), function (x) {
      if (x.getAttribute('TargetMode') === 'External') return;
      bagianTerkait(z, resolve(path, x.getAttribute('Target')), kumpul);
    });
    return kumpul;
  }

  /** Workbook hanya berisi lembar `nama`; semua byte lain dari lembar itu tetap. */
  function sisakanLembar(z, nama) {
    var daftar = lembar(z), simpanL = daftar.filter(function (l) { return l.nama === nama; })[0];
    if (!simpanL) throw new Error('Lembar "' + nama + '" tidak ada di file Master');
    var tetap = bagianTerkait(z, simpanL.path, {}), buang = {};
    daftar.forEach(function (l) { if (l.nama !== nama) bagianTerkait(z, l.path, buang); });
    // workbook.xml: hapus <sheet> lain, petakan definedName, hitung ulang saat dibuka
    var wb = dom(teks(z, 'xl/workbook.xml'));
    Array.prototype.slice.call(el(wb, 'sheet')).forEach(function (s) { if (s.getAttribute('name') !== nama) s.parentNode.removeChild(s); });
    Array.prototype.slice.call(el(wb, 'definedName')).forEach(function (d) {
      var lid = d.getAttribute('localSheetId');
      if (lid != null) { if (+lid === simpanL.index) d.setAttribute('localSheetId', '0'); else d.parentNode.removeChild(d); return; }
      var isi = d.textContent || '';
      var lain = daftar.some(function (l) { return l.nama !== nama && (isi.indexOf("'" + l.nama + "'!") >= 0 || isi.indexOf(l.nama + '!') >= 0); });
      if (lain) d.parentNode.removeChild(d);
    });
    var dn = el(wb, 'definedNames')[0]; if (dn && !dn.getElementsByTagNameNS(NS, 'definedName').length) dn.parentNode.removeChild(dn);
    Array.prototype.forEach.call(el(wb, 'workbookView'), function (v) { v.removeAttribute('activeTab'); v.removeAttribute('firstSheet'); });
    var cp = el(wb, 'calcPr')[0]; if (cp) cp.setAttribute('fullCalcOnLoad', '1');
    tulis(z, 'xl/workbook.xml', xml(wb));
    // workbook rels: buang lembar lain & calcChain (Excel membangun ulang)
    var rel = dom(teks(z, 'xl/_rels/workbook.xml.rels'));
    Array.prototype.slice.call(rel.getElementsByTagNameNS(NS_REL, 'Relationship')).forEach(function (r) {
      var t = resolve('xl/workbook.xml', r.getAttribute('Target'));
      if ((buang[t] && !tetap[t]) || /calcChain/.test(r.getAttribute('Type'))) r.parentNode.removeChild(r);
    });
    tulis(z, 'xl/_rels/workbook.xml.rels', xml(rel));
    buang['xl/calcChain.xml'] = 1;
    // hapus file & Override content type
    var ct = dom(teks(z, '[Content_Types].xml'));
    Object.keys(buang).forEach(function (p) {
      if (tetap[p]) return; hapus(z, p);
      Array.prototype.slice.call(ct.getElementsByTagName('Override')).forEach(function (o) { if (o.getAttribute('PartName') === '/' + p) o.parentNode.removeChild(o); });
    });
    tulis(z, '[Content_Types].xml', xml(ct));
    // docProps/app.xml: daftar judul lembar opsional → dihapus agar konsisten
    var app = teks(z, 'docProps/app.xml');
    if (app) tulis(z, 'docProps/app.xml', app.replace(/<HeadingPairs>[\s\S]*?<\/HeadingPairs>/, '').replace(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/, ''));
    return z;
  }

  /* ---------- pengisian sel (mempertahankan atribut gaya s) ---------- */
  function Lembar(z, path) {
    this.z = z; this.path = path; this.d = dom(teks(z, path)); this.sd = el(this.d, 'sheetData')[0];
  }
  Lembar.prototype.baris = function (r) {
    var rows = this.sd.getElementsByTagNameNS(NS, 'row');
    for (var i = 0; i < rows.length; i++) { var n = +rows[i].getAttribute('r'); if (n === r) return rows[i]; if (n > r) { var b = this.d.createElementNS(NS, 'row'); b.setAttribute('r', r); this.sd.insertBefore(b, rows[i]); return b; } }
    var nb = this.d.createElementNS(NS, 'row'); nb.setAttribute('r', r); this.sd.appendChild(nb); return nb;
  };
  Lembar.prototype.sel = function (ref) {
    var p = pecah(ref), row = this.baris(p.r), cs = row.getElementsByTagNameNS(NS, 'c'), no = kolKeNo(p.k);
    for (var i = 0; i < cs.length; i++) { var q = pecah(cs[i].getAttribute('r')); if (q.k === p.k) return cs[i]; if (kolKeNo(q.k) > no) { var c = this.d.createElementNS(NS, 'c'); c.setAttribute('r', ref); row.insertBefore(c, cs[i]); return c; } }
    var c2 = this.d.createElementNS(NS, 'c'); c2.setAttribute('r', ref); row.appendChild(c2); return c2;
  };
  Lembar.prototype.isi = function (ref, nilai, gaya) {
    var c = this.sel(ref);
    while (c.firstChild) c.removeChild(c.firstChild);
    c.removeAttribute('t');
    if (gaya != null) c.setAttribute('s', gaya);
    if (nilai == null || nilai === '') return c;
    if (typeof nilai === 'number') { var v = this.d.createElementNS(NS, 'v'); v.textContent = String(nilai); c.appendChild(v); return c; }
    c.setAttribute('t', 'inlineStr');
    var is = this.d.createElementNS(NS, 'is'), t = this.d.createElementNS(NS, 't');
    t.setAttribute('xml:space', 'preserve'); t.textContent = String(nilai);
    is.appendChild(t); c.appendChild(is); return c;
  };
  Lembar.prototype.gaya = function (ref) { var c = this.sel(ref); return c.getAttribute('s'); };
  Lembar.prototype.tinggi = function (r, ht) { var b = this.baris(r); b.setAttribute('ht', ht); b.setAttribute('customHeight', '1'); };
  Lembar.prototype.gabung = function (ref) {
    var mc = el(this.d, 'mergeCells')[0];
    if (!mc) { mc = this.d.createElementNS(NS, 'mergeCells'); var sd = this.sd; sd.parentNode.insertBefore(mc, sd.nextSibling); }
    var m = this.d.createElementNS(NS, 'mergeCell'); m.setAttribute('ref', ref); mc.appendChild(m); mc.setAttribute('count', mc.getElementsByTagNameNS(NS, 'mergeCell').length);
  };
  /** Sisipkan n baris salinan baris `dari` sebelum baris `sebelum`; baris >= sebelum digeser. */
  Lembar.prototype.sisipBaris = function (dari, sebelum, n) {
    if (n <= 0) return;
    var geser = function (ref) { var p = pecah(ref); return p.r >= sebelum ? p.k + (p.r + n) : ref; };
    var rows = Array.prototype.slice.call(this.sd.getElementsByTagNameNS(NS, 'row'));
    rows.forEach(function (row) {
      var r = +row.getAttribute('r'); if (r < sebelum) return;
      row.setAttribute('r', r + n);
      Array.prototype.forEach.call(row.getElementsByTagNameNS(NS, 'c'), function (c) { c.setAttribute('r', geser(c.getAttribute('r'))); });
    });
    var contoh = this.baris(dari), acuan = this.baris(sebelum + n);
    for (var i = 0; i < n; i++) {
      var b = contoh.cloneNode(true), rb = sebelum + i; b.setAttribute('r', rb);
      Array.prototype.forEach.call(b.getElementsByTagNameNS(NS, 'c'), function (c) { var p = pecah(c.getAttribute('r')); c.setAttribute('r', p.k + rb); while (c.firstChild) c.removeChild(c.firstChild); c.removeAttribute('t'); });
      this.sd.insertBefore(b, acuan);
    }
    Array.prototype.forEach.call(el(this.d, 'mergeCell'), function (m) { m.setAttribute('ref', m.getAttribute('ref').split(':').map(geser).join(':')); });
    var dim = el(this.d, 'dimension')[0];
    if (dim) dim.setAttribute('ref', dim.getAttribute('ref').split(':').map(geser).join(':'));
  };
  Lembar.prototype.simpan = function () { tulis(this.z, this.path, xml(this.d)); };

  /** Tambah gaya sel baru = salinan gaya `s` + wrap text (styles.xml lain tidak berubah). */
  function GayaWrap(z) { this.z = z; this.d = dom(teks(z, 'xl/styles.xml')); this.xfs = el(this.d, 'cellXfs')[0]; this.cache = {}; }
  GayaWrap.prototype.dari = function (s, horizontal, fontId) {
    var key = s + '|' + horizontal + '|' + fontId; if (this.cache[key] != null) return this.cache[key];
    var semua = this.xfs.getElementsByTagNameNS(NS, 'xf'), asal = semua[+s || 0], xf = asal.cloneNode(true);
    var al = xf.getElementsByTagNameNS(NS, 'alignment')[0];
    if (!al) { al = this.d.createElementNS(NS, 'alignment'); xf.appendChild(al); }
    al.setAttribute('wrapText', '1'); al.setAttribute('vertical', 'top');
    if (horizontal) al.setAttribute('horizontal', horizontal);
    xf.setAttribute('applyAlignment', '1');
    if (fontId != null) { xf.setAttribute('fontId', fontId); xf.setAttribute('applyFont', '1'); }
    this.xfs.appendChild(xf);
    var idx = this.xfs.getElementsByTagNameNS(NS, 'xf').length - 1;
    this.xfs.setAttribute('count', idx + 1);
    return (this.cache[key] = idx);
  };
  GayaWrap.prototype.font = function (s) { return this.xfs.getElementsByTagNameNS(NS, 'xf')[+s || 0].getAttribute('fontId'); };
  GayaWrap.prototype.simpan = function () { tulis(this.z, 'xl/styles.xml', xml(this.d)); };

  /* ---------- Form PW-PROD-30 Risalah Rapat ---------- */
  var R = { awal: 13, akhir: 26, min: 14 }; // baris isian bawaan template
  function barisTeks(s, lebarKar) {
    return String(s || '').split('\n').reduce(function (n, p) { return n + Math.max(1, Math.ceil(p.length / lebarKar)); }, 0);
  }
  /**
   * opsi: { proyek, judulRapat, tanggalTeks, kotaTanggal, pimpinan, notulis,
   *         baris: [{ lalu, pjLalu, realisasi, pjRealisasi, datang, pjDatang, target }] }
   */
  function risalah(opsi) {
    if (!window.JIAT_TEMPLAT_RISALAH) throw new Error('Template Risalah PROD-30 tidak tersedia');
    var z = buka(window.JIAT_TEMPLAT_RISALAH);
    var L = lembar(z)[0], sh = new Lembar(z, L.path), gw = new GayaWrap(z);
    var data = opsi.baris || [], n = Math.max(data.length, R.min), tambah = n - R.min;
    var fontIsi = gw.font(sh.gaya('C14')); // Tahoma 10 – font baris isian di template
    // baris tambahan memakai gaya baris tengah (25); baris terakhir tetap bergaya penutup (garis tebal)
    sh.sisipBaris(R.akhir - 1, R.akhir, tambah);
    var akhir = R.akhir + tambah;
    // kop
    if (opsi.judulRapat) sh.isi('D4', opsi.judulRapat, sh.gaya('C4')); // di bawah nama perusahaan, tidak menimpa logo
    if (opsi.proyek) sh.isi('H6', opsi.proyek, sh.gaya('C6'));
    if (opsi.kotaTanggal) sh.isi('L' + (28 + tambah), opsi.kotaTanggal, sh.gaya('L' + (28 + tambah)));
    if (opsi.pimpinan) sh.isi('C' + (34 + tambah), opsi.pimpinan, sh.gaya('C' + (34 + tambah)));
    if (opsi.notulis) sh.isi('L' + (34 + tambah), opsi.notulis, sh.gaya('L' + (34 + tambah)));
    // isi tabel: B no · C:E rencana lalu · F PJ · G:I realisasi · J PJ · K:L rencana datang · M PJ · N target
    for (var i = 0; i < n; i++) {
      var r = R.awal + i, x = data[i];
      sh.gabung('C' + r + ':E' + r); sh.gabung('G' + r + ':I' + r);
      if (r >= R.akhir && r < akhir) sh.gabung('K' + r + ':L' + r); // baris sisipan (K:L baris 13–26 sudah digabung di template)
      if (!x) continue;
      var kiri = function (k, v) { sh.isi(k + r, v, gw.dari(sh.gaya(k + r), 'left', fontIsi)); };
      var tengah = function (k, v) { sh.isi(k + r, v, gw.dari(sh.gaya(k + r), 'center', fontIsi)); };
      tengah('B', i + 1);
      kiri('C', x.lalu); tengah('F', x.pjLalu);
      kiri('G', x.realisasi); tengah('J', x.pjRealisasi);
      kiri('K', x.datang); tengah('M', x.pjDatang);
      tengah('N', x.target);
      // perkiraan karakter per baris pada Tahoma 10 sesuai lebar kolom template
      var garis = Math.max(barisTeks(x.lalu, 22), barisTeks(x.realisasi, 27), barisTeks(x.datang, 19),
        barisTeks(x.pjLalu, 12), barisTeks(x.pjRealisasi, 12), barisTeks(x.pjDatang, 12), barisTeks(x.target, 10));
      sh.tinggi(r, Math.max(15.75, Math.min(409, garis * 13.2 + 5)));
    }
    sh.simpan(); gw.simpan();
    return simpan(z);
  }

  return { buka: buka, teks: teks, tulis: tulis, hapus: hapus, simpan: simpan, unduh: unduh, lembar: lembar, sisakanLembar: sisakanLembar, risalah: risalah, b64keBytes: b64keBytes, bytesKeB64: bytesKeB64, kolKeNo: kolKeNo, noKeKol: noKeKol };
})();
