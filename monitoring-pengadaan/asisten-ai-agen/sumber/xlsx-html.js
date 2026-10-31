/* XLR — menampilkan sheet .xlsx (format baku tagihan) sebagai halaman HTML A4 yang menyerupai cetakan Excel.
 *  Membaca: styles.xml (huruf, isian, garis, perataan, format angka), tema, lebar kolom & tinggi baris, sel gabungan, area cetak
 *  (_xlnm.Print_Area), baris judul berulang (_xlnm.Print_Titles), pengaturan halaman (skala, orientasi, margin, horizontalCentered),
 *  pemisah halaman manual, dan gambar/kop (DrawingML: grup, kotak teks, gambar, garis). Nilai rumus dari mesin XLH.
 *  Teks yang tidak dibungkus meluber ke sel kosong di sebelahnya seperti Excel.
 *  2.9.6: opsi.margin (mm, ukuran cetak A4 tetap & isi dipaskan lebar), opsi.kop (kop surat standar di setiap halaman menggantikan kop
 *  gambar template), rapikan() — teks narasi yang melewati batas kanan area cetak dibungkus (wrap + rata kanan-kiri, tinggi baris
 *  menyesuaikan) langsung di berkas, sehingga Excel & pratinjau sama-sama utuh. Angka mengikuti XLH.lokal ('id' → 1.234.567,89). */
(function (root) {
  'use strict';
  const XLH = root.XLH || (typeof require === 'function' ? require('./xlsx-hitung.js') : null);
  const E = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dec = new TextDecoder();
  const EMU = 9525;   // EMU per px (96 dpi)

  /* ---------- tema & warna ---------- */
  const INDEXED = ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF', '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99', '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696', '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333'];
  function tema(xml) {
    const urut = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'], m = {};
    urut.concat(['dk1', 'lt1']).forEach(k => { const r = new RegExp('<a:' + k + '>([\\s\\S]*?)</a:' + k + '>').exec(xml || ''); if (r) { const c = /srgbClr val="([0-9A-Fa-f]{6})"|sysClr [^>]*lastClr="([0-9A-Fa-f]{6})"/.exec(r[1]); if (c) m[k] = (c[1] || c[2]).toUpperCase(); } });
    return urut.map(k => m[k] || '000000');   // indeks tema Excel: 0 lt1, 1 dk1, 2 lt2, 3 dk2, 4.. accent
  }
  function tint(hex, t) {
    if (!t) return hex; let r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    const f = x => Math.round(t < 0 ? x * (1 + t) : x + (255 - x) * t);
    return [f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function warna(attr, T, bawaan) {
    if (!attr) return bawaan;
    const rgb = /rgb="([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})"/.exec(attr), th = /theme="(\d+)"/.exec(attr), ix = /indexed="(\d+)"/.exec(attr), tn = /tint="(-?[\d.E-]+)"/.exec(attr);
    let h = null;
    if (rgb) h = rgb[1].slice(-6); else if (th) h = T[Number(th[1])] || '000000'; else if (ix) { const i = Number(ix[1]); if (i === 64 || i === 65) return bawaan; h = INDEXED[i] || '000000'; }
    if (!h) return bawaan;
    return '#' + tint(h.toUpperCase(), tn ? Number(tn[1]) : 0);
  }

  /* ---------- styles.xml ---------- */
  const BUILTIN = { 0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 14: 'dd/mm/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 20: 'h:mm', 37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)', 41: '_(* #,##0_);_(* \\(#,##0\\);_(* "-"_);_(@_)', 42: '_("$"* #,##0_);_("$"* \\(#,##0\\);_("$"* "-"_);_(@_)', 43: '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)', 44: '_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)', 49: '@' };
  function gaya(xml, T) {
    const blok = (tag) => { const m = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>').exec(xml); return m ? m[1] : ''; };
    const fmt = {}; (blok('numFmts').match(/<numFmt [^>]*\/>/g) || []).forEach(n => { fmt[/numFmtId="(\d+)"/.exec(n)[1]] = XLH.unesc(/formatCode="([^"]*)"/.exec(n)[1]); });
    const fonts = (blok('fonts').match(/<font>[\s\S]*?<\/font>|<font\/>/g) || []).map(f => ({
      b: /<b\/>|<b val="(1|true)"\/>/.test(f), i: /<i\/>|<i val="(1|true)"\/>/.test(f), u: /<u\/>|<u val="single"\/>|<u val="double"\/>/.test(f), s: /<strike\/>/.test(f),
      sz: Number((/<sz val="([\d.]+)"/.exec(f) || [0, 11])[1]), nama: XLH.unesc((/<name val="([^"]+)"/.exec(f) || [0, 'Calibri'])[1]), warna: warna((/<color ([^>]*)\/>/.exec(f) || [0, ''])[1], T, '#000000') }));
    const fills = (blok('fills').match(/<fill>[\s\S]*?<\/fill>/g) || []).map(f => { const p = /patternType="(\w+)"/.exec(f); if (!p || p[1] === 'none' || p[1] === 'gray125') return null; const fg = /<fgColor ([^>]*)\/>/.exec(f); return warna(fg ? fg[1] : '', T, null); });
    const bd = (blok('borders').match(/<border(?:\s[^>]*)?>[\s\S]*?<\/border>|<border\/>/g) || []).map(b => { const o = {}; ['left', 'right', 'top', 'bottom'].forEach(s => { const m = new RegExp('<' + s + '(?: style="(\\w+)")?(?:/>|>([\\s\\S]*?)</' + s + '>)').exec(b); if (m && m[1]) { const c = /<color ([^>]*)\/>/.exec(m[2] || ''); o[s] = { gaya: m[1], warna: warna(c ? c[1] : '', T, '#000000') }; } }); return o; });
    const xfs = (blok('cellXfs').match(/<xf [^>]*\/>|<xf [^>]*>[\s\S]*?<\/xf>/g) || []).map(x => {
      const n = k => Number((new RegExp('\\s' + k + '="(\\d+)"').exec(x) || [0, 0])[1]), al = /<alignment ([^>]*)\/>/.exec(x), a = al ? al[1] : '';
      const id = n('numFmtId');
      return { fmt: fmt[id] || BUILTIN[id] || 'General', font: fonts[n('fontId')] || fonts[0], fill: fills[n('fillId')] || null, border: bd[n('borderId')] || {},
        h: (/horizontal="(\w+)"/.exec(a) || [])[1] || '', v: (/vertical="(\w+)"/.exec(a) || [])[1] || 'bottom', wrap: /wrapText="(1|true)"/.test(a), indent: Number((/indent="(\d+)"/.exec(a) || [0, 0])[1]), shrink: /shrinkToFit="1"/.test(a), rot: Number((/textRotation="(\d+)"/.exec(a) || [0, 0])[1]) };
    });
    return { xfs, fonts };
  }

  /* ---------- format angka untuk tampilan sel ---------- */
  function bagian(kode) { const out = []; let cur = '', q = false; for (let i = 0; i < kode.length; i++) { const c = kode[i]; if (c === '"') q = !q; if (c === '\\' && !q) { cur += c + kode[++i]; continue; } if (c === ';' && !q) { out.push(cur); cur = ''; continue; } cur += c; } out.push(cur); return out; }
  function tampil(v, kode) {   // → { kiri, isi, kanan, isi (* fill) } untuk format akuntansi; atau { teks }
    if (v === null || v === undefined || v === '') return { teks: '' };
    if (XLH.isErr(v)) return { teks: v.err };
    if (typeof v === 'boolean') return { teks: v ? 'TRUE' : 'FALSE' };
    const sek = bagian(kode || 'General');
    if (typeof v === 'string') { const s = sek[3] !== undefined ? sek[3] : sek.length === 1 && /@/.test(sek[0]) ? sek[0] : null; if (s === null) return { teks: v }; return pecah(s.replace(/@/g, '\u0000'), v); }
    let k = sek[0], x = v;
    if (x < 0 && sek[1] !== undefined) { k = sek[1]; x = -x; } else if (x === 0 && sek[2] !== undefined) k = sek[2];
    k = k.replace(/\[(Red|Black|Blue|Green|Color\d+|Magenta|Cyan|White|Yellow)\]/gi, '').replace(/\[\$([^\]-]*)(-[0-9A-Fa-f]+)?\]/g, (m, s) => s ? '"' + s + '"' : '');
    if (/^general/i.test(k.trim())) return { teks: (v < 0 && sek[1] === undefined ? '' : '') + umum(sek[1] !== undefined && v < 0 ? -v : v) + k.replace(/general/i, '').replace(/_./g, ' ').replace(/"([^"]*)"/g, '$1').replace(/\\(.)/g, '$1') };
    let teks;
    if (/[0#?]/.test(k.replace(/"[^"]*"/g, '')) && !/(^|[^"\\])[dmyhs]/i.test(k.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, ''))) {
      const isiAngka = XLH.teksFormat(x, k.replace(/\*./g, '').replace(/_./g, '').replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/[()]/g, '').trim() || '0');
      return pecah(k, null, isiAngka.replace(/^-/, ''), v < 0 && sek[1] === undefined);
    }
    teks = XLH.teksFormat(x, k.replace(/\*./g, '').replace(/_./g, ' '));
    return { teks };
  }
  function umum(v) { if (Number.isInteger(v)) return String(v); const a = Math.abs(v); if (a >= 1e11 || (a < 1e-9 && a > 0)) return v.toExponential(5).replace(/\.?0+e/, 'E'); let s = String(Number(v.toPrecision(10))); return XLH && XLH.lokal === 'id' ? s.replace('.', ',') : s; }
  function pecah(k, teksAsli, angka, neg) {   // literal, _x (spasi), *x (isi), angka/@
    let kiri = '', kanan = '', isi = false, sudah = false, q = false;
    for (let i = 0; i < k.length; i++) {
      const c = k[i];
      if (c === '"') { const j = k.indexOf('"', i + 1); const t = k.slice(i + 1, j); (isi || sudah ? (kanan += t) : (kiri += t)); i = j; continue; }
      if (c === '\\') { (sudah ? (kanan += k[i + 1]) : (kiri += k[i + 1])); i++; continue; }
      if (c === '_') { (sudah ? (kanan += '\u2007') : (kiri += '\u2007')); i++; continue; }
      if (c === '*') { isi = true; i++; continue; }
      if (c === '\u0000') { if (!sudah) { sudah = true; kiri += teksAsli; } continue; }
      if (/[0#?,.%]/.test(c) || (/[Ee+]/.test(c) && sudah)) { if (!sudah) { sudah = true; kiri += '\u0001'; } continue; }
      if (c === '(' || c === ')' || c === '-' || c === ' ' || c === ':' || c === '/') { (sudah ? (kanan += c) : (kiri += c)); continue; }
      (sudah ? (kanan += c) : (kiri += c));
    }
    const nilai = angka !== undefined && angka !== null ? (neg ? '-' : '') + angka : '';
    if (isi) { const p = kiri.split('\u0001'); return { isi: true, kiri: p[0], kanan: (p[1] !== undefined ? nilai + (p[1] || '') : '') + kanan, teksKiri: p[1] === undefined ? p[0] + nilai + kanan : '' }; }
    return { teks: kiri.replace('\u0001', nilai) + kanan };
  }

  /* ---------- geometri lembar ---------- */
  const lebarPx = w => Math.round(w * 7 + 5);
  const ptPx = pt => pt * 96 / 72;
  function geometri(xml) {
    const fp = /<sheetFormatPr ([^>]*)\/>/.exec(xml), fa = fp ? fp[1] : '';
    const dRow = Number((/defaultRowHeight="([\d.]+)"/.exec(fa) || [0, 15])[1]), dCol = /defaultColWidth="([\d.]+)"/.exec(fa) ? Number(/defaultColWidth="([\d.]+)"/.exec(fa)[1]) : 8.43 + (Number((/baseColWidth="(\d+)"/.exec(fa) || [0, 8])[1]) - 8);
    const cols = []; (xml.match(/<col [^>]*\/>/g) || []).forEach(c => { const a = k => (new RegExp('\\s' + k + '="([^"]*)"').exec(c) || [])[1]; for (let i = Number(a('min')); i <= Math.min(Number(a('max')), 300); i++) cols[i] = { w: a('width') ? Number(a('width')) : dCol, hidden: a('hidden') === '1' }; });
    const rows = []; (xml.match(/<row [^>]*?(?:\/>|>)/g) || []).forEach(r => { const n = Number(/\sr="(\d+)"/.exec(r)[1]), ht = /\sht="([\d.]+)"/.exec(r); rows[n] = { ht: ht ? Number(ht[1]) : dRow, hidden: /\shidden="(1|true)"/.test(r) }; });
    const merge = (xml.match(/<mergeCell ref="([A-Z]+\d+:[A-Z]+\d+)"\/>/g) || []).map(m => { const [a, b] = /ref="([^"]+)"/.exec(m)[1].split(':'); const p = XLH.pisahRef(a), q = XLH.pisahRef(b); return { c1: p[0], r1: p[1], c2: q[0], r2: q[1] }; });
    const ps = /<pageSetup ([^>]*)\/>/.exec(xml), pa = ps ? ps[1] : '', pm = /<pageMargins ([^>]*)\/>/.exec(xml), ma = pm ? pm[1] : '';
    const brk = []; const rb = /<rowBreaks[^>]*>([\s\S]*?)<\/rowBreaks>/.exec(xml); if (rb) (rb[1].match(/<brk [^>]*\/>/g) || []).forEach(b => brk.push(Number(/id="(\d+)"/.exec(b)[1])));
    const m = k => Number((new RegExp('\\s' + k + '="([\\d.]+)"').exec(' ' + ma) || [0, 0.7])[1]);
    return { dRow, dCol, cols, rows, merge, skala: Number((/scale="(\d+)"/.exec(pa) || [0, 100])[1]), lanskap: /orientation="landscape"/.test(pa), fitW: /fitToPage="1"/.test(xml) ? Number((/fitToWidth="(\d+)"/.exec(pa) || [0, 1])[1]) : 0,
      margin: { l: m('left'), r: m('right'), t: m('top'), b: m('bottom') }, tengah: /<printOptions [^>]*horizontalCentered="1"/.test(xml), brk };
  }

  /* ---------- gambar (DrawingML) ---------- */
  function relasi(F, path) { const p = path.replace(/([^/]+)$/, '_rels/$1.rels'), x = F.has(p) ? dec.decode(F.get(p)) : '', o = {}; (x.match(/<Relationship [^>]*\/>/g) || []).forEach(r => { const i = /Id="([^"]+)"/.exec(r)[1], t = /Target="([^"]+)"/.exec(r)[1]; o[i] = t.startsWith('/') ? t.slice(1) : path.replace(/[^/]+$/, '') + t; }); Object.keys(o).forEach(k => { const seg = []; o[k].split('/').forEach(s => { if (s === '..') seg.pop(); else seg.push(s); }); o[k] = seg.join('/'); }); return o; }
  function gambarDari(F, path, ganti) {
    if (ganti && ganti[path]) return ganti[path];
    if (!F.has(path)) return null; const b = F.get(path), ext = path.split('.').pop().toLowerCase(); if (['png', 'jpg', 'jpeg', 'gif'].indexOf(ext) < 0) return null;
    let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return 'data:image/' + (ext === 'jpg' ? 'jpeg' : ext) + ';base64,' + (typeof btoa === 'function' ? btoa(s) : Buffer.from(b).toString('base64'));
  }
  function drawing(F, sheetPath, posX, posY, T, ganti, saring) {   // → HTML elemen gambar; saring({r, c, xml, gambar}) → false = lewati (2.9.6: kop)
    const rs = relasi(F, sheetPath), id = (/<drawing r:id="([^"]+)"/.exec(dec.decode(F.get(sheetPath))) || [])[1]; if (!id || !rs[id] || !F.has(rs[id])) return '';
    const dp = rs[id], dx = dec.decode(F.get(dp)), rd = relasi(F, dp), out = [];
    const ambilAnchor = /<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)[^>]*>([\s\S]*?)<\/xdr:\1>/g; let m;
    const titik = (s) => { const c = Number(/<xdr:col>(\d+)<\/xdr:col>/.exec(s)[1]) + 1, co = Number(/<xdr:colOff>(-?\d+)<\/xdr:colOff>/.exec(s)[1]) / EMU, r = Number(/<xdr:row>(\d+)<\/xdr:row>/.exec(s)[1]) + 1, ro = Number(/<xdr:rowOff>(-?\d+)<\/xdr:rowOff>/.exec(s)[1]) / EMU; return [posX(c) + co, posY(r) + ro]; };
    while ((m = ambilAnchor.exec(dx))) {
      const isi = m[2], fr = /<xdr:from>([\s\S]*?)<\/xdr:from>/.exec(isi); if (!fr) continue;
      const [x1, y1] = titik(fr[1]); let x2, y2;
      const to = /<xdr:to>([\s\S]*?)<\/xdr:to>/.exec(isi); if (to) [x2, y2] = titik(to[1]); else { const ex = /<xdr:ext cx="(\d+)" cy="(\d+)"/.exec(isi); x2 = x1 + Number(ex[1]) / EMU; y2 = y1 + Number(ex[2]) / EMU; }
      if (saring) { const r0 = Number(/<xdr:row>(\d+)<\/xdr:row>/.exec(fr[1])[1]) + 1, c0 = Number(/<xdr:col>(\d+)<\/xdr:col>/.exec(fr[1])[1]) + 1;
        const gb = (isi.match(/r:embed="([^"]+)"/g) || []).map(x => { const id = /"([^"]+)"/.exec(x)[1]; return rd[id] ? gambarDari(F, rd[id], ganti) : null; }).filter(Boolean);
        if (saring({ r: r0, c: c0, xml: isi, gambar: gb, teks: (isi.match(/<a:t>([^<]*)<\/a:t>/g) || []).map(t => XLH.unesc(t.slice(5, -6))).join('') }) === false) continue; }
      const badan = isi.replace(/<xdr:(from|to)>[\s\S]*?<\/xdr:\1>/g, '').replace(/<xdr:clientData[^>]*\/>/, '');
      out.push(bentuk(badan, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, null, rd, F, T, ganti));
    }
    return out.join('');
  }
  function xfrm(s) { const m = /<a:xfrm([^>]*)>([\s\S]*?)<\/a:xfrm>/.exec(s); if (!m) return null; const g = (re) => { const r = re.exec(m[2]); return r ? [Number(r[1]), Number(r[2])] : null; };
    return { off: g(/<a:off x="(-?\d+)" y="(-?\d+)"/), ext: g(/<a:ext cx="(\d+)" cy="(\d+)"/), chOff: g(/<a:chOff x="(-?\d+)" y="(-?\d+)"/), chExt: g(/<a:chExt cx="(\d+)" cy="(\d+)"/), flipH: /flipH="1"/.test(m[1]), flipV: /flipV="1"/.test(m[1]) }; }
  function anakAtas(s) {   // potong elemen anak tingkat pertama (grpSp/sp/pic/cxnSp)
    const out = [], re = /<xdr:(grpSp|sp|pic|cxnSp)[\s>]/g; let m, i = 0;
    while ((re.lastIndex = i, m = re.exec(s))) { const tag = m[1]; let kedalaman = 0, j = m.index; const reT = new RegExp('<xdr:' + tag + '[\\s>]|</xdr:' + tag + '>', 'g'); reT.lastIndex = j; let t; while ((t = reT.exec(s))) { if (t[0][1] === '/') { kedalaman--; if (!kedalaman) { out.push({ tag, xml: s.slice(m.index, t.index + t[0].length) }); i = t.index + t[0].length; break; } } else kedalaman++; } if (!t) break; }
    return out;
  }
  function bentuk(s, kotak, peta, rd, F, T, ganti) {   // peta: fungsi koordinat EMU → px (null = gunakan kotak anchor)
    const anak = anakAtas(s); return anak.map(a => satu(a, kotak, peta, rd, F, T, ganti)).join('');
  }
  function satu(a, kotak, peta, rd, F, T, ganti) {
    const x = xfrm(a.tag === 'grpSp' ? (/<xdr:grpSpPr[\s\S]*?<\/xdr:grpSpPr>/.exec(a.xml) || [''])[0] : (/<xdr:spPr[\s\S]*?<\/xdr:spPr>/.exec(a.xml) || [''])[0]);
    let r;   // persegi dalam px
    if (!peta || !x || !x.off) r = { x: kotak.x, y: kotak.y, w: kotak.w, h: kotak.h };
    else { const p = peta(x.off[0], x.off[1]), q = peta(x.off[0] + x.ext[0], x.off[1] + x.ext[1]); r = { x: p[0], y: p[1], w: q[0] - p[0], h: q[1] - p[1] }; }
    if (a.tag === 'grpSp') {
      if (!x || !x.chExt) return bentuk(a.xml.replace(/^<xdr:grpSp[^>]*>/, '').replace(/<\/xdr:grpSp>$/, ''), r, peta, rd, F, T, ganti);
      const sx = r.w / (x.chExt[0] || 1), sy = r.h / (x.chExt[1] || 1), petaB = (ex, ey) => [r.x + (ex - x.chOff[0]) * sx, r.y + (ey - x.chOff[1]) * sy];
      const dalam = a.xml.replace(/^<xdr:grpSp[^>]*>/, '').replace(/<\/xdr:grpSp>$/, '').replace(/<xdr:nvGrpSpPr>[\s\S]*?<\/xdr:nvGrpSpPr>/, '').replace(/<xdr:grpSpPr[\s\S]*?<\/xdr:grpSpPr>/, '');
      return anakAtas(dalam).map(b => satu(b, r, petaB, rd, F, T, ganti)).join('');
    }
    const ln = /<a:ln(?:\s[^>]*)?>([\s\S]*?)<\/a:ln>|<a:ln(\s[^>]*)?\/>/.exec(a.xml), lnW = ln ? Number((/<a:ln w="(\d+)"/.exec(a.xml) || [0, 9525])[1]) / EMU : 0, lnNo = ln && /<a:noFill\/>/.test(ln[1] || '');
    const lnC = ln && !lnNo ? warnaDML(ln[1] || '', T) : null;
    if (a.tag === 'cxnSp') {
      const x1 = x && x.flipH ? r.x + r.w : r.x, x2 = x && x.flipH ? r.x : r.x + r.w, y1 = x && x.flipV ? r.y + r.h : r.y, y2 = x && x.flipV ? r.y : r.y + r.h;
      const L = Math.min(x1, x2) - 2, Tt = Math.min(y1, y2) - 2, W = Math.abs(x2 - x1) + 4, H = Math.abs(y2 - y1) + 4;
      return `<svg class="xl-g" style="left:${L}px;top:${Tt}px;width:${W}px;height:${H}px" viewBox="${L} ${Tt} ${W} ${H}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lnC || '#000'}" stroke-width="${Math.max(lnW, 0.75)}"/></svg>`;
    }
    if (a.tag === 'pic') {
      const id = (/r:embed="([^"]+)"/.exec(a.xml) || [])[1], src = id && rd[id] ? gambarDari(F, rd[id], ganti) : null; if (!src) return '';
      const sr = /<a:srcRect([^>]*)\/>/.exec(a.xml), g = k => sr ? Number((new RegExp(k + '="(-?\\d+)"').exec(sr[1]) || [0, 0])[1]) / 100000 : 0;
      const l = g('l'), t = g('t'), rr = g('r'), b = g('b'), bw = r.w / (1 - l - rr || 1), bh = r.h / (1 - t - b || 1);
      return `<div class="xl-g" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;overflow:hidden"><img src="${src}" alt="" style="position:absolute;left:${-l * bw}px;top:${-t * bh}px;width:${bw}px;height:${bh}px"></div>`;
    }
    // sp: kotak (isian/garis) + teks
    const sp = (/<xdr:spPr[\s\S]*?<\/xdr:spPr>/.exec(a.xml) || [''])[0], isiW = /<a:noFill\/>/.test(sp.replace(/<a:ln[\s\S]*?<\/a:ln>/, '')) ? null : /<a:solidFill>/.test(sp.replace(/<a:ln[\s\S]*?<\/a:ln>/, '')) ? warnaDML(sp.replace(/<a:ln[\s\S]*?<\/a:ln>/, ''), T) : null;
    const bp = /<a:bodyPr([^>]*)>/.exec(a.xml), ba = bp ? bp[1] : '', ins = k => Number((new RegExp(k + '="(\\d+)"').exec(ba) || [0, k[0] === 'l' || k[0] === 'r' ? 91440 : 45720])[1]) / EMU;
    const jangkar = (/anchor="(\w+)"/.exec(ba) || [0, 't'])[1], par = (a.xml.match(/<a:p>[\s\S]*?<\/a:p>|<a:p\/>/g) || []).map(p => paragraf(p, T)).join('');
    return `<div class="xl-g xl-sp" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;${isiW ? 'background:' + isiW + ';' : ''}${lnC && !lnNo && ln ? 'outline:' + Math.max(lnW, 0.75) + 'px solid ' + lnC + ';outline-offset:-' + Math.max(lnW, 0.75) / 2 + 'px;' : ''}padding:${ins('tIns')}px ${ins('rIns')}px ${ins('bIns')}px ${ins('lIns')}px;justify-content:${jangkar === 'ctr' ? 'center' : jangkar === 'b' ? 'flex-end' : 'flex-start'}">${par}</div>`;
  }
  function warnaDML(s, T) {
    const m = /<a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(s); if (m) return '#' + m[1];
    const sc = /<a:schemeClr val="(\w+)"/.exec(s); if (sc) { const map = { bg1: 0, tx1: 1, bg2: 2, tx2: 3, lt1: 0, dk1: 1, lt2: 2, dk2: 3, accent1: 4, accent2: 5, accent3: 6, accent4: 7, accent5: 8, accent6: 9, hlink: 10, folHlink: 11 }; return '#' + (T[map[sc[1]] !== undefined ? map[sc[1]] : 1] || '000000'); }
    const pc = /<a:prstClr val="(\w+)"/.exec(s); if (pc) return pc[1];
    return '#000000';
  }
  function paragraf(p, T) {
    const algn = (/<a:pPr[^>]*algn="(\w+)"/.exec(p) || [0, 'l'])[1], ta = { l: 'left', ctr: 'center', r: 'right', just: 'justify' }[algn] || 'left';
    const runs = (p.match(/<a:r>[\s\S]*?<\/a:r>|<a:br\/>/g) || []).map(r => {
      if (r === '<a:br/>') return '<br>';
      const pr = (/<a:rPr([^>]*)(?:\/>|>([\s\S]*?)<\/a:rPr>)/.exec(r) || ['', '', '']), at = pr[1] || '', isi = pr[2] || '';
      const sz = Number((/sz="(\d+)"/.exec(at) || [0, 1100])[1]) / 100, b = /\sb="1"/.test(at), i = /\si="1"/.test(at), u = /\su="sng"/.test(at);
      const font = (/<a:latin typeface="([^"]+)"/.exec(isi) || [0, ''])[1], w = /<a:solidFill>/.test(isi) ? warnaDML(isi, T) : '';
      const t = (/<a:t>([\s\S]*?)<\/a:t>/.exec(r) || [0, ''])[1];
      return `<span style="font-size:${sz}pt;${b ? 'font-weight:700;' : ''}${i ? 'font-style:italic;' : ''}${u ? 'text-decoration:underline;' : ''}${font ? 'font-family:' + keluarga(font) + ';' : ''}${w ? 'color:' + w + ';' : ''}">${E(XLH.unesc(t))}</span>`;
    }).join('');
    const endSz = /<a:endParaRPr[^>]*sz="(\d+)"/.exec(p);
    return `<p style="text-align:${ta};${!runs && endSz ? 'font-size:' + Number(endSz[1]) / 100 + 'pt;' : ''}">${runs || '&nbsp;'}</p>`;
  }
  const keluarga = n => `'${n.replace(/['"]/g, '')}', ${/narrow|cond/i.test(n) ? "'Arial Narrow', 'Liberation Sans Narrow', " : ''}${/times|cambria|book|georgia|serif/i.test(n) && !/sans/i.test(n) ? "'Times New Roman', 'Liberation Serif', serif" : "Calibri, Carlito, Arial, 'Liberation Sans', sans-serif"}`;   // tanda kutip tunggal: aman di atribut style

  /* ---------- halaman ---------- */
  function rentangCetak(W, s) {
    const wb = dec.decode(W.F.get('xl/workbook.xml')), idx = W.sheets.indexOf(s);
    const cari = nm => { const re = new RegExp('<definedName name="' + nm + '"[^>]*localSheetId="' + idx + '"[^>]*>([^<]*)</definedName>'); const m = re.exec(wb); return m ? XLH.unesc(m[1]) : ''; };
    const pa = cari('_xlnm.Print_Area').split(',')[0], pt = cari('_xlnm.Print_Titles');
    let R = null; if (pa) { const m = /!\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/.exec(pa); if (m) R = { c1: XLH.kolNo(m[1]), r1: Number(m[2]), c2: XLH.kolNo(m[3]), r2: Number(m[4]) }; }
    if (!R) { let c2 = 1, r2 = 1; s.sel.forEach(o => { if (o.v !== undefined || o.f !== undefined) { c2 = Math.max(c2, o.c); r2 = Math.max(r2, o.r); } }); R = { c1: 1, r1: 1, c2, r2 }; }
    let judul = null; const tm = /!\$(\d+):\$(\d+)/.exec(pt); if (tm) judul = [Number(tm[1]), Number(tm[2])];
    return { R, judul };
  }
  const garis = g => { if (!g) return 'none'; const w = { thin: 1, hair: 0.6, dotted: 1, dashed: 1, mediumDashed: 2, dashDot: 1, mediumDashDot: 2, dashDotDot: 1, mediumDashDotDot: 2, slantDashDot: 2, medium: 2, thick: 3, double: 3 }[g.gaya] || 1; const st = /dash/i.test(g.gaya) ? 'dashed' : g.gaya === 'dotted' || g.gaya === 'hair' ? 'dotted' : g.gaya === 'double' ? 'double' : 'solid'; return w + 'px ' + st + ' ' + g.warna; };
  function render(W, hasil, namaSheet, opsi) {
    opsi = opsi || {};
    const s = W.byNama[namaSheet.toUpperCase()]; if (!s) throw new Error('Sheet ' + namaSheet + ' tidak ada.');
    if (!W._gaya) { W._tema = tema(W.F.has('xl/theme/theme1.xml') ? dec.decode(W.F.get('xl/theme/theme1.xml')) : ''); W._gaya = gaya(dec.decode(W.F.get('xl/styles.xml')), W._tema); }
    const G = W._gaya, T = W._tema, geo = geometri(s.xml), { R, judul } = rentangCetak(W, s);
    if (opsi.margin) geo.margin = { l: opsi.margin.l / 25.4, r: opsi.margin.r / 25.4, t: opsi.margin.t / 25.4, b: opsi.margin.b / 25.4 };
    const nilai = o => { if (!o) return null; if (o.f !== undefined) { const h = hasil && hasil.get(s.nama); const v = h ? h.get(XLH.kolHuruf(o.c) + o.r) : o.v; return v === undefined ? null : v; } return o.v === undefined ? null : o.v; };
    // posisi kolom / baris (px, area cetak)
    const cx = [], cw = []; let x = 0; for (let c = R.c1; c <= R.c2; c++) { const k = geo.cols[c]; const w = k && k.hidden ? 0 : lebarPx(k ? k.w : geo.dCol); cx[c] = x; cw[c] = w; x += w; }
    const lebar = x; cx[R.c2 + 1] = x;
    const rh = []; for (let r = R.r1; r <= R.r2; r++) { const k = geo.rows[r]; rh[r] = k && k.hidden ? 0 : ptPx(k ? k.ht : geo.dRow); }
    // gabungan
    const gab = new Map(), tutup = new Set(); geo.merge.forEach(m => { if (m.r2 < R.r1 || m.r1 > R.r2 || m.c2 < R.c1 || m.c1 > R.c2) return; gab.set(m.c1 + ',' + m.r1, m); for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) tutup.add(c + ',' + r); });
    // halaman: skala & tinggi cetak
    const A4 = geo.lanskap ? [1123, 794] : [794, 1123], mg = geo.margin, lebarCetak = A4[0] - (mg.l + mg.r) * 96, tinggiCetak = A4[1] - (mg.t + mg.b) * 96;
    let skala = (geo.skala || 100) / 100; if ((geo.fitW || opsi.margin) && lebar * skala > lebarCetak) skala = lebarCetak / lebar;
    // kop standar: baris di atas judul dokumen disembunyikan, gambar/kotak teks kop template diganti kop yang sama di setiap halaman
    let kopH = 0, saringG = null;
    if (opsi.kop) {
      let tj = 0;
      for (let r = R.r1; r <= Math.min(R.r2, R.r1 + 14) && !tj; r++) for (let c = R.c1; c <= R.c2; c++) { const v = nilai(s.sel.get(XLH.kolHuruf(c) + r)); if (typeof v === 'string' && /^\s*(BERITA ACARA|LAMPIRAN|RINCIAN|SURAT|REKAP)/i.test(v)) { tj = r; break; } }
      if (tj) for (let r = R.r1; r < tj; r++) rh[r] = 0;
      const batasKop = (tj || R.r1) + 4;
      saringG = a => {
        if (a.r >= batasKop || /PIHAK|Kepala|Direktur|Kuasa|Manager/i.test(a.teks)) return true;
        if (a.gambar.length && !W._kopLogo) W._kopLogo = a.gambar.slice(0, 3);
        if (/Kantor/i.test(a.teks) && !W._kopAlamat) { const sp = (a.xml.match(/<xdr:sp>[\s\S]*?<\/xdr:sp>/g) || []).find(x => /Kantor/i.test(x)) || a.xml; W._kopAlamat = (sp.match(/<a:t>([^<]*)<\/a:t>/g) || []).map(t => XLH.unesc(t.slice(5, -6))).join('').replace(/\s+/g, ' ').trim().replace(/^(.*?@[\w.-]+\.(?:co\.id|com|id|net|org))[\s\S]*$/i, '$1'); }
        return false;
      };
      kopH = opsi.kop.tinggi || 98;
    }
    { let total = 0; for (let r = R.r1; r <= R.r2; r++) total += rh[r] || 0; const muat = tinggiCetak - kopH, n = Math.ceil(total * skala / muat);
      if (n > 1 && !geo.brk.length) { const s2 = muat * (n - 1) / total * 0.985; if (s2 >= skala * 0.86) skala = s2; } }   // isi sedikit melebihi halaman → skala sedikit diperkecil (seperti "Fit")
    const tinggiJudul = judul ? (() => { let h = 0; for (let r = judul[0]; r <= judul[1]; r++) h += rh[r] || 0; return h; })() : 0;
    const halaman = []; let mulai = R.r1, h = 0;
    for (let r = R.r1; r <= R.r2; r++) {
      const batas = ((tinggiCetak - kopH) / skala) - (halaman.length && judul ? tinggiJudul : 0);
      if (r > mulai && (h + rh[r] > batas || geo.brk.indexOf(r - 1) >= 0)) { halaman.push([mulai, r - 1]); mulai = r; h = 0; }
      h += rh[r];
    }
    halaman.push([mulai, R.r2]);
    const ry = r => { let y = 0; for (let i = R.r1; i < r; i++) y += rh[i] || 0; return y; };
    // isi sel per halaman
    const kosong = (c, r) => { const o = s.sel.get(XLH.kolHuruf(c) + r); const v = nilai(o); return (v === null || v === '') && !tutup.has(c + ',' + r) && !gab.has(c + ',' + r); };
    const gambarLayer = drawing(W.F, s.path, c => (cx[Math.min(Math.max(c, R.c1), R.c2 + 1)] || 0), r => ry(Math.min(Math.max(r, R.r1), R.r2 + 1)), T, opsi.gantiGambar, saringG);
    const k = opsi.kop || {}, kop = !opsi.kop ? '' : `<div class="xl-kop" style="width:${lebarCetak}px;height:${kopH}px"><div class="xl-kop-a">${(k.logo || W._kopLogo || []).map(x => `<img src="${E(x)}" alt="">`).join('')}<div class="xl-kop-t"><div class="n">${E(k.nama || '')}</div>${k.sub ? `<div class="s">${E(k.sub)}</div>` : ''}${k.proyek ? `<div class="p">${E(k.proyek)}</div>` : ''}</div></div><div class="xl-kop-g"></div><div class="xl-kop-al">${E(k.alamat || W._kopAlamat || '')}</div></div>`;
    const sel = (c, r, y0) => {
      if (tutup.has(c + ',' + r)) return '';
      const o = s.sel.get(XLH.kolHuruf(c) + r), xf = G.xfs[o ? o.s : 0] || G.xfs[0], m = gab.get(c + ',' + r);
      const c2 = m ? Math.min(m.c2, R.c2) : c, r2 = m ? Math.min(m.r2, R.r2) : r;
      let w = cx[c2 + 1] - cx[c], hh = 0; for (let i = r; i <= r2; i++) hh += rh[i] || 0;
      if (!w || !hh) return '';
      const v = nilai(o), bdr = Object.assign({}, xf.border);
      if (m) { const xr = G.xfs[(s.sel.get(XLH.kolHuruf(c2) + r) || {}).s || 0] || xf, xb = G.xfs[(s.sel.get(XLH.kolHuruf(c) + r2) || {}).s || 0] || xf; if (xr.border.right) bdr.right = xr.border.right; if (xb.border.bottom) bdr.bottom = xb.border.bottom; }
      const adaGaris = bdr.left || bdr.right || bdr.top || bdr.bottom;
      if ((v === null || v === '') && !xf.fill && !adaGaris) return '';
      const f = xf.font, tp = tampil(v, xf.fmt), angka = typeof v === 'number';
      let ha = xf.h || (angka ? 'right' : typeof v === 'boolean' || XLH.isErr(v) ? 'center' : 'left'); if (ha === 'general') ha = angka ? 'right' : 'left';
      if (ha === 'centerContinuous') ha = 'center'; if (ha === 'fill' || ha === 'distributed') ha = 'left';
      // luberan teks (tidak dibungkus, bukan gabungan)
      let lw = w, lx = cx[c];
      if (!xf.wrap && !m && v !== null && v !== '' && !angka && !tp.isi) {
        if (xf.h === 'centerContinuous') { let k = c + 1; while (k <= R.c2 && kosong(k, r) && (G.xfs[(s.sel.get(XLH.kolHuruf(k) + r) || {}).s || 0] || {}).h === 'centerContinuous') k++; lw = cx[k] - cx[c]; }   // rata tengah lintas sel
        else if (ha === 'left' || ha === 'justify') { let k = c + 1; while (k <= R.c2 && kosong(k, r)) k++; lw = cx[k] - cx[c]; }
        else if (ha === 'right') { let k = c - 1; while (k >= R.c1 && kosong(k, r)) k--; lx = cx[k + 1]; lw = cx[c + 1] - lx; }
        else if (ha === 'center') { let k = c + 1, j = c - 1; while (k <= R.c2 && kosong(k, r)) k++; while (j >= R.c1 && kosong(j, r)) j--; const ext = Math.min(cx[k] - cx[c + 1], cx[c] - cx[j + 1]); lx = cx[c] - ext; lw = w + 2 * ext; }
      }
      const st = `left:${cx[c]}px;top:${y0}px;width:${w}px;height:${hh}px;${xf.fill ? 'background:' + xf.fill + ';' : ''}border-left:${garis(bdr.left)};border-right:${garis(bdr.right)};border-top:${garis(bdr.top)};border-bottom:${garis(bdr.bottom)};`;
      const fs = `font-family:${keluarga(f.nama)};font-size:${f.sz}pt;${f.b ? 'font-weight:700;' : ''}${f.i ? 'font-style:italic;' : ''}${f.u || f.s ? 'text-decoration:' + (f.u ? 'underline ' : '') + (f.s ? 'line-through' : '') + ';' : ''}color:${f.warna};`;
      const va = xf.v === 'center' ? 'center' : xf.v === 'top' ? 'flex-start' : 'flex-end';
      let teks;
      if (tp.isi) teks = tp.teksKiri !== undefined && tp.teksKiri !== '' ? `<span>${E(tp.teksKiri)}</span>` : `<span class="xl-acc"><span>${E(tp.kiri)}</span><span>${E(tp.kanan)}</span></span>`;
      else teks = E(tp.teks);
      const kotakSel = `<div class="xl-c" style="${st}"></div>`;
      if (!teks) return kotakSel;
      const ind = xf.indent ? `padding-left:${xf.indent * 9 + 2}px;` : '';
      const tSt = `left:${lx}px;top:${y0}px;width:${lw}px;height:${hh}px;align-items:${va};justify-content:${ha === 'right' ? 'flex-end' : ha === 'center' ? 'center' : 'flex-start'};text-align:${ha === 'justify' ? 'justify' : ha};${fs}${ind}${xf.wrap ? 'white-space:pre-wrap;' : 'white-space:pre;'}${tp.isi ? '' : ''}`;
      return kotakSel + `<div class="xl-t${xf.wrap ? ' w' : ''}${tp.isi ? ' acc' : ''}" style="${tSt}"><div>${teks}</div></div>`;
    };
    const lembarHtml = halaman.map((hal, i) => {
      const brs = []; let y = 0;
      const tambah = (r1, r2) => { for (let r = r1; r <= r2; r++) { for (let c = R.c1; c <= R.c2; c++) brs.push(sel(c, r, y)); y += rh[r] || 0; } };
      if (i > 0 && judul) tambah(judul[0], judul[1]);
      const yAwal = y; tambah(hal[0], hal[1]);
      const tinggi = y, geserGambar = ry(hal[0]) - yAwal;
      const g = gambarLayer ? `<div class="xl-gl" style="top:${-geserGambar}px;width:${lebar}px;height:${tinggi + geserGambar}px;clip-path:inset(${geserGambar}px 0 0 0)">${gambarLayer}</div>` : '';
      return `<section class="xl-hal${geo.lanskap ? ' lanskap' : ''}" data-sheet="${E(s.nama)}" style="padding:${mg.t * 96}px ${mg.r * 96}px ${mg.b * 96}px ${mg.l * 96}px">${kop}<div class="xl-skala" style="width:${lebar * skala}px;height:${tinggi * skala}px;${geo.tengah ? 'margin:0 auto;' : ''}"><div class="xl-isi" style="width:${lebar}px;height:${tinggi}px;transform:scale(${skala})">${brs.join('')}${g}</div></div></section>`;
    }).join('');
    return lembarHtml;
  }
  /* ---------- rapikan: narasi utuh (dibungkus) di berkas — dipakai Excel unduhan & pratinjau ---------- */
  let _kanvas = null;
  function ukurBawaan(teks, f) {   // lebar teks (px) — kanvas peramban bila ada, selain itu perkiraan
    try { if (typeof document !== 'undefined') { _kanvas = _kanvas || document.createElement('canvas').getContext('2d'); _kanvas.font = (f.i ? 'italic ' : '') + (f.b ? '700 ' : '') + f.sz + 'pt ' + keluarga(f.nama); return _kanvas.measureText(teks).width; } } catch (e) { }
    return teks.length * ptPx(f.sz) * (f.b ? 0.56 : 0.52);
  }
  function jumlahBaris(teks, f, lebar, ukur) {
    let n = 0; String(teks).split(/\r?\n/).forEach(par => { let baris = 0, w = 0; const sp = ukur(' ', f); par.split(/\s+/).filter(Boolean).forEach(k => { const lk = ukur(k, f); if (!baris) { baris = 1; w = lk; } else if (w + sp + lk > lebar) { baris++; w = lk; } else w += sp + lk; }); n += Math.max(baris, 1); });
    return Math.max(n, 1);
  }
  function rapikan(W, hasil, F, namaSheet, opsi) {
    opsi = opsi || {}; const ukur = opsi.ukur || ukurBawaan, enc = new TextEncoder();
    let sty = dec.decode(F.get('xl/styles.xml'));
    const T = tema(W.F.has('xl/theme/theme1.xml') ? dec.decode(W.F.get('xl/theme/theme1.xml')) : ''), G = gaya(sty, T);
    const blokXf = /<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/.exec(sty); if (!blokXf) return 0;
    const xfRaw = blokXf[1].match(/<xf [^>]*\/>|<xf [^>]*>[\s\S]*?<\/xf>/g) || [], klon = new Map();
    const xfBungkus = i => {   // salinan gaya sel + wrapText, rata kanan-kiri, rata atas
      if (klon.has(i)) return klon.get(i);
      let x = xfRaw[i] || xfRaw[0]; const va = (G.xfs[i] || {}).v, al = 'horizontal="justify" vertical="' + (va === 'center' ? 'center' : 'top') + '" wrapText="1"';
      if (/<alignment [^>]*\/>/.test(x)) x = x.replace(/<alignment ([^>]*)\/>/, (m, a) => '<alignment ' + (a.replace(/\s*(horizontal|vertical|wrapText)="[^"]*"/g, '').trim() + ' ' + al).trim() + '/>');
      else if (/\/>$/.test(x)) x = x.replace(/\s*\/>$/, '><alignment ' + al + '/></xf>');
      else x = x.replace(/<\/xf>$/, '<alignment ' + al + '/></xf>');
      if (!/applyAlignment=/.test(x)) x = x.replace(/^<xf /, '<xf applyAlignment="1" ');
      xfRaw.push(x); G.xfs.push(Object.assign({}, G.xfs[i] || G.xfs[0], { h: 'justify', v: va === 'center' ? 'center' : 'top', wrap: true })); klon.set(i, xfRaw.length - 1); return xfRaw.length - 1;
    };
    let ubah = 0;
    (namaSheet || []).forEach(nm => {
      const s = W.byNama[String(nm).toUpperCase()]; if (!s) return;
      let xml = dec.decode(F.get(s.path)); const geo = geometri(xml), { R } = rentangCetak(W, s), H = hasil && hasil.get(s.nama);
      const nilai = o => { if (!o) return null; const v = o.f !== undefined ? (H ? H.get(XLH.kolHuruf(o.c) + o.r) : o.v) : o.v; return v === undefined ? null : v; };
      const cx = []; let x = 0; for (let c = R.c1; c <= R.c2 + 1; c++) { const k = geo.cols[c]; cx[c] = x; x += k && k.hidden ? 0 : lebarPx(k ? k.w : geo.dCol); }
      const tinggiPt = r => { const k = geo.rows[r]; return k ? k.ht : geo.dRow; }, tersembunyi = r => !!(geo.rows[r] && geo.rows[r].hidden);
      const gab = new Map(), tutup = new Set(); geo.merge.forEach(m => { gab.set(m.c1 + ',' + m.r1, m); for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) tutup.add(c + ',' + r); });
      const kosong = (c, r) => { const v = nilai(s.sel.get(XLH.kolHuruf(c) + r)); return (v === null || v === '') && !tutup.has(c + ',' + r) && !gab.has(c + ',' + r); };
      const baruGab = [], gayaBaru = new Map(), tinggi = new Map(), naik = (r, pt) => { if (pt > tinggiPt(r) + 0.5 && pt > (tinggi.get(r) || 0)) tinggi.set(r, Math.ceil(pt * 4) / 4); };
      for (let r = R.r1; r <= R.r2; r++) {
        if (tersembunyi(r)) continue;
        for (let c = R.c1; c <= R.c2; c++) {
          if (tutup.has(c + ',' + r)) continue;
          const o = s.sel.get(XLH.kolHuruf(c) + r), v = nilai(o); if (typeof v !== 'string' || !v.trim()) continue;
          const xf = G.xfs[o.s || 0] || G.xfs[0], f = xf.font, lh = f.sz * 1.2; if (xf.rot) continue;
          const m = gab.get(c + ',' + r);
          if (m || xf.wrap) {   // sel dibungkus / gabungan: tinggi baris (terakhir) cukup untuk seluruh baris teks
            const c2 = m ? Math.min(m.c2, R.c2) : c, r2 = m ? m.r2 : r, w = cx[c2 + 1] - cx[c] - 5; if (w <= 20) continue;
            if (!xf.wrap) {   // gabungan tanpa wrap yang teksnya lebih lebar dari gabungan → dibungkus
              if (['left', 'general', 'justify', 'distributed', ''].indexOf(xf.h || '') < 0 || ukur(v, f) + 5 <= w + 5) continue;
              gayaBaru.set(XLH.kolHuruf(c) + r, xfBungkus(o.s || 0));
            }
            const perlu = jumlahBaris(v, f, w, ukur) * lh + 2; let ada = 0; for (let i = r; i <= r2; i++) if (!tersembunyi(i)) ada += tinggiPt(i);
            if (perlu > ada + 0.5) naik(r2, tinggiPt(r2) + perlu - ada);
            continue;
          }
          const ha = xf.h || 'left'; if (['left', 'general', 'justify', ''].indexOf(ha) < 0 || XLH.isErr(v)) continue;
          let k = c + 1; while (k <= R.c2 && kosong(k, r)) k++;
          const lebar = ukur(v, f) + 5; if (lebar <= cx[k] - cx[c]) continue;
          if (k <= R.c2) continue;   // terpotong sel berisi di kanannya — ditata per template
          const w = cx[R.c2 + 1] - cx[c] - 5;
          if (c < R.c2) baruGab.push(XLH.kolHuruf(c) + r + ':' + XLH.kolHuruf(R.c2) + r);
          gayaBaru.set(XLH.kolHuruf(c) + r, xfBungkus(o.s || 0));
          naik(r, jumlahBaris(v, f, w, ukur) * lh + 2);
        }
      }
      if (!baruGab.length && !gayaBaru.size && !tinggi.size) return;
      gayaBaru.forEach((n, ref) => { xml = xml.replace(new RegExp('<c r="' + ref + '"(\\s[^>]*?)?(/?>)'), (m0, a, t) => '<c r="' + ref + '"' + (a || '').replace(/\ss="\d+"/, '') + ' s="' + n + '"' + t); });
      tinggi.forEach((pt, r) => { xml = xml.replace(new RegExp('<row r="' + r + '"(\\s[^>]*?)?(/?>)'), (m0, a, t) => '<row r="' + r + '"' + (a || '').replace(/\s(ht|customHeight)="[^"]*"/g, '') + ' ht="' + pt + '" customHeight="1"' + t); });
      if (baruGab.length) {
        const isi = baruGab.map(g => '<mergeCell ref="' + g + '"/>').join('');
        if (/<mergeCells count="\d+">/.test(xml)) xml = xml.replace(/<mergeCells count="(\d+)">/, (m0, n) => '<mergeCells count="' + (Number(n) + baruGab.length) + '">' + isi);
        else { const p = /<(phoneticPr|conditionalFormatting|dataValidations|hyperlinks|printOptions|pageMargins|pageSetup)\b/.exec(xml); const blk = '<mergeCells count="' + baruGab.length + '">' + isi + '</mergeCells>'; xml = p ? xml.slice(0, p.index) + blk + xml.slice(p.index) : xml.replace('</sheetData>', '</sheetData>' + blk); }
      }
      F.set(s.path, enc.encode(xml)); ubah += baruGab.length + tinggi.size;
    });
    if (klon.size) { sty = sty.replace(/<cellXfs count="\d+">[\s\S]*?<\/cellXfs>/, '<cellXfs count="' + xfRaw.length + '">' + xfRaw.join('') + '</cellXfs>'); F.set('xl/styles.xml', enc.encode(sty)); }
    W._gaya = null;
    return ubah;
  }
  const CSS = `.xl-hal{width:794px;min-height:1123px;box-sizing:border-box;background:#fff;margin:0 auto 18px;box-shadow:0 2px 10px rgba(0,0,0,.25);position:relative;overflow:hidden;page-break-after:always;break-after:page}
.xl-hal.lanskap{width:1123px;min-height:794px}.xl-skala{position:relative;overflow:visible}.xl-isi{position:absolute;left:0;top:0;transform-origin:0 0}
.xl-c{position:absolute;box-sizing:border-box}.xl-t{position:absolute;display:flex;box-sizing:border-box;padding:0 2px;overflow:hidden;line-height:1.15;z-index:1}.xl-t>div{max-width:100%}.xl-t.w>div{width:100%}
.xl-t.acc>div{width:100%}.xl-acc{display:flex;justify-content:space-between;width:100%}.xl-gl{position:absolute;left:0;pointer-events:none;z-index:2}.xl-g{position:absolute;box-sizing:border-box}
.xl-sp{display:flex;flex-direction:column;overflow:hidden}.xl-sp p{margin:0;line-height:1.15}
.xl-kop{box-sizing:border-box;font-family:Arial,'Liberation Sans',sans-serif;color:#0b2a6b;overflow:hidden}.xl-kop-a{display:flex;align-items:center;gap:12px;height:66px}.xl-kop-a img{height:54px;width:auto}
.xl-kop-t{flex:1;min-width:0;line-height:1.25}.xl-kop-t .n{font-size:17pt;font-weight:800;letter-spacing:.5px;padding-left:18px}.xl-kop-t .s{font-size:8pt;color:#333;font-weight:700}.xl-kop-t .p{font-size:9pt;font-weight:700;color:#111;white-space:nowrap;margin-top:3px}
.xl-kop-g{border-top:2.5px solid #c8102e;height:0;margin:4px 0 2px}.xl-kop-al{font-size:7.5pt;color:#111;text-align:left;line-height:1.25;white-space:normal;overflow-wrap:break-word}
@media print{@page{size:A4;margin:0}body{margin:0;background:#fff}.xl-hal{box-shadow:none;margin:0}.xl-hal.lanskap{page:lanskap}@page lanskap{size:A4 landscape}}`;
  root.XLR = { render, CSS, tampil, rapikan, jumlahBaris };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.XLR;
})(typeof window !== 'undefined' ? window : globalThis);
