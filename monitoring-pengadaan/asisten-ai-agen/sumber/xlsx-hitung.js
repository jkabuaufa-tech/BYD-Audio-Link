/* XLH — pembaca, penghitung rumus & penulis nilai tersimpan untuk .xlsx format baku tagihan (dipakai blok MP292 & uji Node).
 *  - ZIP: DecompressionStream/CompressionStream ('deflate-raw'), tanpa pustaka luar.
 *  - Rumus: parser + evaluator subset Excel yang dipakai Master SPM & BAP format (IF, INDEX, MATCH, VLOOKUP, SUMPRODUCT, OFFSET, TEXT,
 *    WORKDAY, …), rumus bersama (shared) & array, rujukan antar-sheet. Hasil divalidasi terhadap nilai tersimpan Excel pada berkas asli.
 *  - TEXT/format angka mengikuti Excel pengguna: nama hari & bulan Indonesia, pemisah ribuan "," dan desimal "." (seperti nilai di berkas asli). */
(function (root) {
  'use strict';
  /* ======================= ZIP ======================= */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function aliran(bytes, Kelas, mode) { const s = new Blob([bytes]).stream().pipeThrough(new Kelas(mode)); return new Uint8Array(await new Response(s).arrayBuffer()); }
  async function bukaZip(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let e = u8.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Berkas Excel rusak (ZIP).');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = new Map(), dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      const met = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const nama = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      const lnl = dv.getUint16(off + 26, true), lxl = dv.getUint16(off + 28, true), data = u8.subarray(off + 30 + lnl + lxl, off + 30 + lnl + lxl + csz);
      out.set(nama, met === 8 ? await aliran(data, DecompressionStream, 'deflate-raw') : data.slice());
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  async function tutupZip(files) {
    const enc = new TextEncoder(), lokal = [], pusat = []; let off = 0;
    const u16 = v => [v & 255, v >>> 8 & 255], u32 = v => [v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255];
    for (const [nama, d] of files) {
      const nm = enc.encode(nama), c = crc32(d), z = await aliran(d, CompressionStream, 'deflate-raw');
      const h = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(0), u16(0x21), u32(c), u32(z.length), u32(d.length), u16(nm.length), u16(0));
      lokal.push(Uint8Array.from(h), nm, z);
      pusat.push(Uint8Array.from([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(0), u16(0x21), u32(c), u32(z.length), u32(d.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
      off += h.length + nm.length + z.length;
    }
    const besar = pusat.reduce((a, x) => a + x.length, 0), akhir = Uint8Array.from([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(besar), u32(off), u16(0)));
    const semua = lokal.concat(pusat, [akhir]), out = new Uint8Array(semua.reduce((a, x) => a + x.length, 0)); let q = 0;
    semua.forEach(x => { out.set(x, q); q += x.length; });
    return out;
  }

  /* ======================= alamat sel ======================= */
  const kolNo = h => { let c = 0; for (let i = 0; i < h.length; i++) c = c * 26 + h.charCodeAt(i) - 64; return c; };
  const kolHuruf = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
  const pisahRef = ref => { const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(ref); return m ? [kolNo(m[1]), Number(m[2])] : null; };
  const kunci = (c, r) => kolHuruf(c) + r;
  const unesc = s => s.replace(/&(lt|gt|amp|quot|apos|#(\d+)|#x([0-9a-fA-F]+));/g, (m, a, d, h) => a === 'lt' ? '<' : a === 'gt' ? '>' : a === 'amp' ? '&' : a === 'quot' ? '"' : a === 'apos' ? "'" : String.fromCodePoint(d ? Number(d) : parseInt(h, 16)));
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  /* ======================= workbook ======================= */
  const ERR = e => ({ err: e });
  const isErr = v => v && typeof v === 'object' && 'err' in v;
  function bacaSST(xml) {
    const L = []; if (!xml) return L;
    const re = /<si>([\s\S]*?)<\/si>|<si\/>/g; let m;
    while ((m = re.exec(xml))) { const t = []; const rt = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\/>/g; let x; const isi = m[1] || ''; while ((x = rt.exec(isi))) t.push(unesc(x[1] || '')); L.push(t.join('')); }
    return L;
  }
  function bacaSel(xml, sst) {   // → Map kunci → { c, r, s, t, v, f, fs (shared si), fref, arr }
    const M = new Map(), re = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let m;
    while ((m = re.exec(xml))) {
      const c = kolNo(m[1]), r = Number(m[2]), attr = m[3], isi = m[4] || '';
      const s = /\ss="(\d+)"/.exec(attr), t = /\st="(\w+)"/.exec(attr);
      const o = { c, r, s: s ? Number(s[1]) : 0, t: t ? t[1] : '' };
      const f = /<f([^>]*?)\/>|<f([^>]*)>([\s\S]*?)<\/f>/.exec(isi);
      if (f) {
        const fa = f[1] !== undefined ? f[1] : (f[2] || ''), ft = /\st="(\w+)"/.exec(fa), si = /\ssi="(\d+)"/.exec(fa), rf = /\sref="([^"]+)"/.exec(fa);
        o.f = f[3] !== undefined ? unesc(f[3]) : ''; if (ft && ft[1] === 'shared') { o.si = Number(si[1]); if (rf) o.induk = true; } if (ft && ft[1] === 'array') o.arr = true;
      }
      const v = /<v>([\s\S]*?)<\/v>/.exec(isi);
      if (o.t === 's' && v) o.v = sst[Number(v[1])];
      else if (o.t === 'inlineStr') { const it = /<is>([\s\S]*?)<\/is>/.exec(isi); o.v = it ? (it[1].match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || []).map(x => unesc(x.replace(/<\/?t[^>]*>/g, ''))).join('') : ''; }
      else if (o.t === 'b' && v) o.v = v[1] === '1';
      else if (o.t === 'e' && v) o.v = ERR(v[1]);
      else if ((o.t === 'str') && v) o.v = unesc(v[1]);
      else if (v) o.v = Number(v[1]);
      M.set(kunci(c, r), o);
    }
    return M;
  }
  async function muat(bytes) {
    const F = bytes instanceof Map ? bytes : await bukaZip(bytes), dec = new TextDecoder(), T = n => F.has(n) ? dec.decode(F.get(n)) : '';
    const wb = T('xl/workbook.xml'), rels = T('xl/_rels/workbook.xml.rels'), rid = {};
    rels.replace(/<Relationship [^>]*?\/>/g, a => { const i = /Id="([^"]+)"/.exec(a), t = /Target="([^"]+)"/.exec(a); if (i && t) rid[i[1]] = 'xl/' + t[1].replace(/^\/?xl\//, ''); return a; });
    const sst = bacaSST(T('xl/sharedStrings.xml')), sheets = [];
    wb.replace(/<sheet [^>]*?\/>/g, a => { const n = /name="([^"]*)"/.exec(a), r = /r:id="([^"]+)"/.exec(a), st = /state="(\w+)"/.exec(a); if (n && r) sheets.push({ nama: unesc(n[1]), path: rid[r[1]], hidden: !!st }); return a; });
    const W = { F, sst, sheets, byNama: {} };
    sheets.forEach(s => { s.xml = T(s.path); s.sel = bacaSel(s.xml, sst); W.byNama[s.nama.toUpperCase()] = s; });
    // rumus bersama: induk per si
    sheets.forEach(s => { s.induk = {}; s.sel.forEach(o => { if (o.si !== undefined && o.induk) s.induk[o.si] = o; }); });
    return W;
  }

  /* ======================= tokenizer & parser ======================= */
  const FUNGSI_RE = /^(?:_xlfn\.|_xlws\.)?[A-Z][A-Z0-9.]*(?=\()/i;
  function tokenize(s) {
    const T = []; let i = 0;
    const lihat = re => { const m = re.exec(s.slice(i)); return m ? m[0] : null; };
    while (i < s.length) {
      const ch = s[i];
      if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') { i++; continue; }
      if (ch === '"') { let j = i + 1, t = ''; for (;;) { if (s[j] === '"' && s[j + 1] === '"') { t += '"'; j += 2; } else if (s[j] === '"' || j >= s.length) break; else t += s[j++]; } T.push({ k: 'str', v: t }); i = j + 1; continue; }
      if (ch === '{') { T.push({ k: '{' }); i++; continue; } if (ch === '}') { T.push({ k: '}' }); i++; continue; }
      if (ch === ';') { T.push({ k: ';' }); i++; continue; }
      if (ch === '#') { const m = lihat(/^#(?:REF!|N\/A|DIV\/0!|VALUE!|NAME\?|NUM!|NULL!)/); if (m) { T.push({ k: 'err', v: m }); i += m.length; continue; } }
      // rujukan: 'Sheet'!A1, Sheet!A1:B2, A1, $A$1, A:A, 1:1
      let m = lihat(/^(?:'(?:[^']|'')+'|[A-Za-z_][\w.]*)!/), sh = null, j = i;
      if (m) { sh = m.slice(0, -1).replace(/^'|'$/g, '').replace(/''/g, "'"); j = i + m.length; }
      const rest = s.slice(j);
      let r = /^(#REF!)/.exec(rest);
      if (sh !== null && r) { T.push({ k: 'err', v: '#REF!' }); i = j + r[0].length; continue; }
      r = /^(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?(?![\w(])/.exec(rest) || /^(\$?[A-Z]{1,3}):(\$?[A-Z]{1,3})(?![\w(])/.exec(rest) || /^(\$?\d+):(\$?\d+)(?![\w(])/.exec(rest);
      if (r && !(sh === null && FUNGSI_RE.test(rest))) { T.push({ k: 'ref', sh, a: r[1], b: r[2] || null }); i = j + r[0].length; continue; }
      if (sh !== null) throw new Error('rujukan tidak dikenal: ' + s.slice(i, i + 30));
      m = lihat(FUNGSI_RE); if (m) { T.push({ k: 'fn', v: m.toUpperCase().replace(/^_XLFN\.|^_XLWS\./, '') }); i += m.length + 1; continue; }
      m = lihat(/^(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/); if (m) { T.push({ k: 'num', v: Number(m) }); i += m.length; continue; }
      m = lihat(/^(?:TRUE|FALSE)(?![\w(])/i); if (m) { T.push({ k: 'bool', v: m.toUpperCase() === 'TRUE' }); i += m.length; continue; }
      m = lihat(/^(?:<>|>=|<=|[-+*/^&=<>%(),:])/); if (m) { T.push({ k: 'op', v: m }); i += m.length; continue; }
      m = lihat(/^[A-Za-z_][\w.]*/); if (m) { T.push({ k: 'name', v: m }); i += m.length; continue; }
      throw new Error('karakter tidak dikenal: ' + s.slice(i, i + 20));
    }
    return T;
  }
  function parse(src) {
    const T = tokenize(src); let p = 0;
    const lihat = () => T[p], ambil = () => T[p++], op = v => T[p] && T[p].k === 'op' && T[p].v === v;
    const PREC = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };
    function utama() {
      const t = ambil(); if (!t) throw new Error('rumus terpotong');
      if (t.k === 'num') return { k: 'n', v: t.v };
      if (t.k === 'str') return { k: 's', v: t.v };
      if (t.k === 'bool') return { k: 'b', v: t.v };
      if (t.k === 'err') return { k: 'e', v: t.v };
      if (t.k === 'ref') return { k: 'ref', sh: t.sh, a: t.a, b: t.b };
      if (t.k === 'name') return { k: 'e', v: '#NAME?' };
      if (t.k === 'op' && (t.v === '-' || t.v === '+')) { const x = unary(); return t.v === '-' ? { k: 'neg', x } : x; }
      if (t.k === 'op' && t.v === '(') { const x = expr(0); if (!op(')')) throw new Error('kurung'); p++; return x; }
      if (t.k === 'fn') { const args = []; if (op(')')) { p++; return { k: 'fn', v: t.v, args }; } for (;;) { if (op(',') ) { args.push({ k: 'kosong' }); p++; continue; } if (op(')')) { args.push({ k: 'kosong' }); p++; break; } args.push(expr(0)); if (op(',')) { p++; if (op(')')) { args.push({ k: 'kosong' }); p++; break; } continue; } if (op(')')) { p++; break; } throw new Error('argumen ' + t.v); } return { k: 'fn', v: t.v, args }; }
      if (t.k === '{') { const rows = [[]]; for (;;) { const x = lihat(); if (x.k === '}') { p++; break; } if (x.k === ';') { rows.push([]); p++; continue; } if (x.k === 'op' && x.v === ',') { p++; continue; } let neg = false; if (x.k === 'op' && x.v === '-') { neg = true; p++; } const y = ambil(); rows[rows.length - 1].push(y.k === 'num' ? (neg ? -y.v : y.v) : y.k === 'str' ? y.v : y.k === 'bool' ? y.v : ERR(y.v)); } return { k: 'arr', v: rows }; }
      throw new Error('token tak terduga ' + JSON.stringify(t));
    }
    function unary() { let x = utama(); while (op('%')) { p++; x = { k: 'pct', x }; } return x; }
    function expr(min) {
      let kiri = unary();
      for (;;) { const t = lihat(); if (!t || t.k !== 'op' || !(t.v in PREC) || PREC[t.v] < min) break; p++; const kanan = expr(PREC[t.v] + (t.v === '^' ? 0 : 1)); kiri = { k: 'bin', o: t.v, a: kiri, b: kanan }; }
      return kiri;
    }
    const x = expr(0); if (p < T.length) throw new Error('sisa token di ' + src.slice(0, 40));
    return x;
  }

  /* ======================= nilai & rentang ======================= */
  class Rentang { constructor(sh, c1, r1, c2, r2) { this.sh = sh; this.c1 = Math.min(c1, c2); this.r1 = Math.min(r1, r2); this.c2 = Math.max(c1, c2); this.r2 = Math.max(r1, r2); } }
  const isR = v => v instanceof Rentang, isA = v => Array.isArray(v);
  function Mesin(W) {
    const memo = new Map(), sedang = new Set(), ast = new Map();
    const lembar = n => W.byNama[String(n).toUpperCase()] || null;
    function nilaiSel(sh, c, r) {
      const k = sh.nama + '!' + c + ',' + r;
      if (memo.has(k)) return memo.get(k);
      const o = sh.sel.get(kunci(c, r)); let v;
      if (!o) v = null;
      else if (o.f !== undefined && (o.f !== '' || o.si !== undefined)) {
        if (sedang.has(k)) return 0;
        sedang.add(k);
        try { v = hitungRumus(sh, o); } catch (e) { v = ERR('#VALUE!'); if (root.XLH_DEBUG) console.warn(sh.nama, kunci(c, r), e.message); }
        sedang.delete(k);
      } else v = o.v === undefined ? null : o.v;
      memo.set(k, v); return v;
    }
    function hitungRumus(sh, o) {
      let src = o.f, dr = 0, dc = 0;
      if (o.si !== undefined && !o.induk) { const ind = sh.induk[o.si]; if (!ind) return ERR('#REF!'); src = ind.f; dr = o.r - ind.r; dc = o.c - ind.c; }
      let a = ast.get(src); if (!a) { a = parse(src); ast.set(src, a); }
      let v = ev(a, { sh, c: o.c, r: o.r, dr, dc, arr: !!o.arr });
      if (isR(v)) v = o.arr ? sel1(v) : potong(v, o);
      if (isA(v)) v = v.length && v[0].length ? v[0][0] : null;
      if (v === null) v = 0;   // rumus yang merujuk sel kosong menghasilkan 0
      return v;
    }
    function potong(R, o) {   // irisan implisit
      if (R.c1 === R.c2 && R.r1 === R.r2) return nilaiSel(lembar(R.sh), R.c1, R.r1);
      if (R.c1 === R.c2 && o.r >= R.r1 && o.r <= R.r2) return nilaiSel(lembar(R.sh), R.c1, o.r);
      if (R.r1 === R.r2 && o.c >= R.c1 && o.c <= R.c2) return nilaiSel(lembar(R.sh), o.c, R.r1);
      return ERR('#VALUE!');
    }
    const sel1 = R => nilaiSel(lembar(R.sh), R.c1, R.r1);
    function rentang(node, ctx) {
      const sh = node.sh ? node.sh : ctx.sh.nama;
      if (node.sh && !lembar(node.sh)) return ERR('#REF!');
      const geser = (s, isKol) => { const abs = s.startsWith('$'); const n = isKol ? kolNo(s.replace('$', '')) : Number(s.replace('$', '')); return abs ? n : n + (isKol ? ctx.dc : ctx.dr); };
      const titik = s => { const m = /^(\$?)([A-Z]+)(\$?)(\d+)$/.exec(s); return [m[1] ? kolNo(m[2]) : kolNo(m[2]) + ctx.dc, m[3] ? Number(m[4]) : Number(m[4]) + ctx.dr]; };
      if (/^\$?[A-Z]+\$?\d+$/.test(node.a)) { const [c1, r1] = titik(node.a), [c2, r2] = node.b ? titik(node.b) : [c1, r1]; return new Rentang(sh, c1, r1, c2, r2); }
      if (/^\$?[A-Z]+$/.test(node.a)) { const c1 = geser(node.a, true), c2 = geser(node.b, true); const L = lembar(sh); return new Rentang(sh, c1, 1, c2, maxBaris(L)); }
      const r1 = geser(node.a, false), r2 = geser(node.b, false); return new Rentang(sh, 1, r1, 200, r2);
    }
    const _maks = new Map();
    function maxBaris(L) { if (!L) return 1; if (!_maks.has(L)) { let m = 1; L.sel.forEach(o => { if (o.r > m) m = o.r; }); _maks.set(L, m); } return _maks.get(L); }
    function arr(v) {   // → 2D array of scalars
      if (isR(v)) { const L = lembar(v.sh), out = []; const r2 = Math.min(v.r2, maxBaris(L)); for (let r = v.r1; r <= Math.max(r2, v.r1); r++) { const row = []; for (let c = v.c1; c <= v.c2; c++) row.push(L ? nilaiSel(L, c, r) : ERR('#REF!')); out.push(row); } return out; }
      if (isA(v)) return v;
      return [[v]];
    }
    const skalar = (v, ctx) => isR(v) ? (ctx && ctx.o ? potong(v, ctx.o) : (v.c1 === v.c2 && v.r1 === v.r2 ? sel1(v) : potong(v, { r: ctx.r, c: ctx.c }))) : isA(v) ? v[0][0] : v;
    function num(v) {
      if (isErr(v)) throw v; if (v === null || v === '') return 0; if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0;
      const t = String(v).trim().replace(/,/g, ''); if (t !== '' && isFinite(Number(t))) return Number(t);
      const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t); if (d) return serial(+d[3], +d[2], +d[1]);
      throw ERR('#VALUE!');
    }
    function str(v) { if (isErr(v)) throw v; if (v === null) return ''; if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; if (typeof v === 'number') return angkaTeks(v); return String(v); }
    function bool(v) { if (isErr(v)) throw v; if (v === null) return false; if (typeof v === 'boolean') return v; if (typeof v === 'number') return v !== 0; const t = String(v).toUpperCase(); if (t === 'TRUE') return true; if (t === 'FALSE') return false; throw ERR('#VALUE!'); }
    function peta2(a, b, f) {   // elementwise dengan perluasan
      const A = arr(a), B = arr(b), R = Math.max(A.length, B.length), C = Math.max(A[0].length, B[0].length), out = [];
      for (let i = 0; i < R; i++) { const row = []; for (let j = 0; j < C; j++) { const x = A[A.length === 1 ? 0 : i] ? A[A.length === 1 ? 0 : i][A[0].length === 1 ? 0 : j] : ERR('#N/A'), y = B[B.length === 1 ? 0 : i] ? B[B.length === 1 ? 0 : i][B[0].length === 1 ? 0 : j] : ERR('#N/A'); row.push(x === undefined || y === undefined ? ERR('#N/A') : coba(() => f(x, y))); } out.push(row); }
      return out;
    }
    const coba = f => { try { return f(); } catch (e) { if (isErr(e)) return e; throw e; } };
    function banding(x, y, o) {
      const tip = v => v === null ? 0 : typeof v === 'number' ? 1 : typeof v === 'string' ? 2 : typeof v === 'boolean' ? 3 : 4;
      if (isErr(x)) throw x; if (isErr(y)) throw y;
      if (x === null) x = typeof y === 'string' ? '' : typeof y === 'boolean' ? false : 0; if (y === null) y = typeof x === 'string' ? '' : typeof x === 'boolean' ? false : 0;
      let d; const tx = tip(x), ty = tip(y);
      if (tx !== ty) d = tx - ty; else if (tx === 2) { const a = x.toLowerCase(), b = y.toLowerCase(); d = a < b ? -1 : a > b ? 1 : 0; } else d = (x > y) - (x < y);
      return o === '=' ? d === 0 : o === '<>' ? d !== 0 : o === '<' ? d < 0 : o === '>' ? d > 0 : o === '<=' ? d <= 0 : d >= 0;
    }
    function binop(o, a, b) {
      const f = o === '&' ? (x, y) => str(x) + str(y) : ['=', '<>', '<', '>', '<=', '>='].indexOf(o) >= 0 ? (x, y) => banding(x, y, o)
        : (x, y) => { const p = num(x), q = num(y); if (o === '+') return p + q; if (o === '-') return p - q; if (o === '*') return p * q; if (o === '/') { if (q === 0) throw ERR('#DIV/0!'); return p / q; } return Math.pow(p, q); };
      if (isR(a) || isA(a) || isR(b) || isA(b)) return peta2(a, b, f);
      return coba(() => f(a, b));
    }
    function ev(n, ctx) {
      switch (n.k) {
        case 'n': case 's': case 'b': return n.v;
        case 'e': return ERR(n.v);
        case 'kosong': return null;
        case 'arr': return n.v;
        case 'ref': return rentang(n, ctx);
        case 'neg': { const x = ev(n.x, ctx); return isR(x) || isA(x) ? peta2(x, 0, v => -num(v)) : coba(() => -num(x)); }
        case 'pct': { const x = ev(n.x, ctx); return isR(x) || isA(x) ? peta2(x, 0, v => num(v) / 100) : coba(() => num(x) / 100); }
        case 'bin': { const a = ev(n.a, ctx), b = ev(n.b, ctx); return binop(n.o, isR(a) && a.c1 === a.c2 && a.r1 === a.r2 ? sel1(a) : a, isR(b) && b.c1 === b.c2 && b.r1 === b.r2 ? sel1(b) : b); }
        case 'fn': { const F = FN[n.v]; if (!F) return ERR('#NAME?'); try { return F(n.args, ctx); } catch (e) { if (isErr(e)) return e; throw e; } }
      }
      throw new Error('simpul ' + n.k);
    }
    const S = (n, ctx) => { const v = ev(n, ctx); return isR(v) ? (v.c1 === v.c2 && v.r1 === v.r2 ? sel1(v) : potong(v, { r: ctx.r, c: ctx.c })) : isA(v) ? (v[0] ? v[0][0] : null) : v; };
    const datar = (args, ctx, angkaSaja) => { const out = []; args.forEach(a => { const v = ev(a, ctx); if (isR(v) || isA(v)) arr(v).forEach(r => r.forEach(x => { if (isErr(x)) throw x; if (typeof x === 'number') out.push(x); else if (!angkaSaja && typeof x === 'boolean') { } })); else { if (isErr(v)) throw v; if (v !== null) out.push(num(v)); } }); return out; };
    const kriteria = c => { const m = /^(<>|>=|<=|=|<|>)?(.*)$/.exec(String(c === null ? '' : c)); const o = m[1] || '=', t = m[2]; const nn = t !== '' && isFinite(Number(t)) ? Number(t) : null;
      const pola = /[*?]/.test(t) ? new RegExp('^' + t.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i') : null;
      return x => { if (pola && (o === '=' || o === '<>')) { const ok = typeof x === 'string' && pola.test(x); return o === '=' ? ok : !ok; } if (nn !== null && typeof x === 'number') return banding(x, nn, o); if (nn !== null) return o === '<>'; if (o === '=' && t === '') return x === null || x === ''; return typeof x === 'string' ? banding(x, t, o) : o === '<>'; }; };
    const FN = {
      IF: (a, c) => { const t = S(a[0], c); if (isErr(t)) return t; return bool(t) ? (a[1] ? ev(a[1], c) : true) : (a.length > 2 ? ev(a[2], c) : false); },
      IFERROR: (a, c) => { const v = ev(a[0], c); if (isR(v) || isA(v)) { const B = ev(a[1], c); return arr(v).map(r => r.map(x => isErr(x) ? (isR(B) || isA(B) ? arr(B)[0][0] : B) : x)); } return isErr(v) ? ev(a[1], c) : v; },
      AND: (a, c) => a.every(x => { const v = ev(x, c); return isR(v) || isA(v) ? arr(v).every(r => r.every(y => y === null || bool(y))) : bool(v); }),
      OR: (a, c) => a.some(x => { const v = ev(x, c); return isR(v) || isA(v) ? arr(v).some(r => r.some(y => y !== null && bool(y))) : bool(v); }),
      NOT: (a, c) => !bool(S(a[0], c)),
      SUM: (a, c) => datar(a, c, true).reduce((p, q) => p + q, 0),
      COUNT: (a, c) => { let n = 0; a.forEach(x => { const v = ev(x, c); arr(v).forEach(r => r.forEach(y => { if (typeof y === 'number') n++; })); }); return n; },
      COUNTA: (a, c) => { let n = 0; a.forEach(x => { const v = ev(x, c); arr(v).forEach(r => r.forEach(y => { if (y !== null && y !== '') n++; })); }); return n; },
      COUNTIF: (a, c) => { const k = kriteria(S(a[1], c)); let n = 0; arr(ev(a[0], c)).forEach(r => r.forEach(y => { if (!isErr(y) && k(y)) n++; })); return n; },
      SUMIF: (a, c) => { const R = ev(a[0], c), k = kriteria(S(a[1], c)), A = arr(R), Sm = a[2] ? arr(isR(ev(a[2], c)) ? (() => { const s = ev(a[2], c); return new Rentang(s.sh, s.c1, s.r1, s.c1 + (R.c2 - R.c1), s.r1 + (R.r2 - R.r1)); })() : ev(a[2], c)) : A; let t = 0; A.forEach((r, i) => r.forEach((y, j) => { if (!isErr(y) && k(y)) { const z = Sm[i] && Sm[i][j]; if (typeof z === 'number') t += z; } })); return t; },
      SUMPRODUCT: (a, c) => { const L = a.map(x => arr(ev(x, c))); let t = 0; for (let i = 0; i < L[0].length; i++) for (let j = 0; j < L[0][0].length; j++) { let p = 1; for (const A of L) { const v = A[i] ? A[i][j] : 0; if (isErr(v)) throw v; p *= typeof v === 'number' ? v : typeof v === 'boolean' ? 0 : 0; } t += p; } return t; },
      ROUND: (a, c) => bulat(num(S(a[0], c)), num(S(a[1], c))),
      ROUNDUP: (a, c) => { const x = num(S(a[0], c)), d = num(S(a[1], c)), f = Math.pow(10, d); return Math.sign(x) * Math.ceil(Math.abs(x) * f - 1e-9) / f; },
      ROUNDDOWN: (a, c) => { const x = num(S(a[0], c)), d = num(S(a[1], c)), f = Math.pow(10, d); return Math.sign(x) * Math.floor(Math.abs(x) * f + 1e-9) / f; },
      INT: (a, c) => Math.floor(num(S(a[0], c)) + 1e-12),
      MOD: (a, c) => { const x = num(S(a[0], c)), y = num(S(a[1], c)); if (y === 0) throw ERR('#DIV/0!'); const m = x - y * Math.floor(x / y); return Math.abs(m - Math.round(m)) < 1e-9 ? Math.round(m) : m; },
      ABS: (a, c) => Math.abs(num(S(a[0], c))),
      N: (a, c) => { const v = S(a[0], c); return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : isErr(v) ? v : 0; },
      VALUE: (a, c) => num(S(a[0], c)),
      ISNUMBER: (a, c) => typeof S(a[0], c) === 'number',
      LEN: (a, c) => str(S(a[0], c)).length,
      LEFT: (a, c) => str(S(a[0], c)).slice(0, a[1] ? num(S(a[1], c)) : 1),
      RIGHT: (a, c) => { const s = str(S(a[0], c)), n = a[1] ? num(S(a[1], c)) : 1; return n ? s.slice(-n) : ''; },
      MID: (a, c) => str(S(a[0], c)).substr(num(S(a[1], c)) - 1, num(S(a[2], c))),
      UPPER: (a, c) => str(S(a[0], c)).toUpperCase(),
      LOWER: (a, c) => str(S(a[0], c)).toLowerCase(),
      PROPER: (a, c) => str(S(a[0], c)).toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, p, q) => p + q.toUpperCase()),
      TRIM: (a, c) => str(S(a[0], c)).replace(/ +/g, ' ').replace(/^ | $/g, ''),
      CONCATENATE: (a, c) => a.map(x => str(S(x, c))).join(''),
      SUBSTITUTE: (a, c) => { const s = str(S(a[0], c)), o = str(S(a[1], c)), n = str(S(a[2], c)); if (!o) return s; if (a[3]) { const k = num(S(a[3], c)); let i = -1; for (let j = 0; j < k; j++) { i = s.indexOf(o, i + 1); if (i < 0) return s; } return s.slice(0, i) + n + s.slice(i + o.length); } return s.split(o).join(n); },
      UNICHAR: (a, c) => String.fromCodePoint(num(S(a[0], c))),
      TEXTJOIN: (a, c) => { const d = str(S(a[0], c)), ab = bool(S(a[1], c)), L = []; a.slice(2).forEach(x => arr(ev(x, c)).forEach(r => r.forEach(y => { if (isErr(y)) throw y; const t = str(y); if (!ab || t !== '') L.push(t); }))); return L.join(d); },
      TEXT: (a, c) => { const v = S(a[0], c); if (isErr(v)) return v; return teksFormat(v, str(S(a[1], c))); },
      DAY: (a, c) => tgl(num(S(a[0], c)))[2],
      YEAR: (a, c) => tgl(num(S(a[0], c)))[0],
      MONTH: (a, c) => tgl(num(S(a[0], c)))[1],
      WORKDAY: (a, c) => { let d = Math.floor(num(S(a[0], c))), n = num(S(a[1], c)); const st = n >= 0 ? 1 : -1; n = Math.abs(n); while (n > 0) { d += st; const hari = tgl(d)[3]; if (hari !== 0 && hari !== 6) n--; } return d; },
      ROW: (a, c) => { if (!a.length) return c.r; const R = ev(a[0], c); if (!isR(R)) throw ERR('#VALUE!'); if (R.r1 === R.r2) return R.r1; const o = []; for (let r = R.r1; r <= R.r2; r++) o.push([r]); return o; },
      COLUMN: (a, c) => { if (!a.length) return c.c; const R = ev(a[0], c); if (!isR(R)) throw ERR('#VALUE!'); if (R.c1 === R.c2) return R.c1; const o = []; for (let k = R.c1; k <= R.c2; k++) o.push(k); return [o]; },
      LARGE: (a, c) => { const L = datar([a[0]], c, true).sort((x, y) => y - x), k = num(S(a[1], c)); if (k < 1 || k > L.length) throw ERR('#NUM!'); return L[k - 1]; },
      MATCH: (a, c) => { const x = S(a[0], c), A = arr(ev(a[1], c)), t = a[2] ? num(S(a[2], c)) : 1, L = A.length === 1 ? A[0] : A.map(r => r[0]);
        if (isErr(x)) return x;
        if (t === 0) { for (let i = 0; i < L.length; i++) { const y = L[i]; if (y === null || isErr(y)) continue; if (typeof x === 'string' && typeof y === 'string' ? (/[*?]/.test(x) ? kriteria(x)(y) : x.toLowerCase() === y.toLowerCase()) : x === y) return i + 1; } return ERR('#N/A'); }
        let p = -1; for (let i = 0; i < L.length; i++) { const y = L[i]; if (y === null || isErr(y) || typeof y !== typeof x) continue; if (t > 0 ? !banding(y, x, '>') : !banding(y, x, '<')) p = i; else if (t > 0) break; } return p < 0 ? ERR('#N/A') : p + 1; },
      INDEX: (a, c) => { const R = ev(a[0], c), r = a[1] && a[1].k !== 'kosong' ? num(S(a[1], c)) : 0, k = a[2] && a[2].k !== 'kosong' ? num(S(a[2], c)) : 0;
        if (isR(R)) { const tinggi = R.r2 - R.r1 + 1, lebar = R.c2 - R.c1 + 1; let rr = r, kk = k; if (lebar === 1 && !kk && rr) kk = 1; if (tinggi === 1 && !a[2] && rr) { kk = rr; rr = 1; }
          if (rr < 0 || kk < 0 || rr > tinggi || kk > lebar) throw ERR('#REF!');
          if (!rr) return new Rentang(R.sh, R.c1 + kk - 1, R.r1, R.c1 + kk - 1, R.r2); if (!kk) return new Rentang(R.sh, R.c1, R.r1 + rr - 1, R.c2, R.r1 + rr - 1);
          return new Rentang(R.sh, R.c1 + kk - 1, R.r1 + rr - 1, R.c1 + kk - 1, R.r1 + rr - 1); }
        const A = arr(R); let rr = r, kk = k; if (A.length === 1 && !kk) { kk = rr; rr = 1; } if (A[0].length === 1 && !kk) kk = 1; const row = A[(rr || 1) - 1]; if (!row || row[(kk || 1) - 1] === undefined) throw ERR('#REF!'); return row[(kk || 1) - 1]; },
      VLOOKUP: (a, c) => { const x = S(a[0], c), A = arr(ev(a[1], c)), k = num(S(a[2], c)), apx = a[3] && a[3].k !== 'kosong' ? bool(S(a[3], c)) : true;
        if (isErr(x)) return x;
        if (!apx) { for (const r of A) { const y = r[0]; if (y === null || isErr(y)) continue; if (typeof x === 'string' && typeof y === 'string' ? x.toLowerCase() === y.toLowerCase() : typeof x === 'number' && typeof y === 'number' ? x === y : false) return r[k - 1] === undefined ? ERR('#REF!') : r[k - 1]; } return ERR('#N/A'); }
        let hit = null; for (const r of A) { const y = r[0]; if (y === null || isErr(y) || typeof y !== typeof x) continue; if (banding(y, x, '<=')) hit = r; else break; } return hit ? hit[k - 1] : ERR('#N/A'); },
      OFFSET: (a, c) => { const R = ev(a[0], c); if (!isR(R)) throw ERR('#VALUE!'); const dr = num(S(a[1], c)), dc = num(S(a[2], c)), h = a[3] && a[3].k !== 'kosong' ? num(S(a[3], c)) : R.r2 - R.r1 + 1, w = a[4] && a[4].k !== 'kosong' ? num(S(a[4], c)) : R.c2 - R.c1 + 1; if (h < 1 || w < 1) throw ERR('#REF!'); return new Rentang(R.sh, R.c1 + dc, R.r1 + dr, R.c1 + dc + w - 1, R.r1 + dr + h - 1); },
      ISBLANK: (a, c) => S(a[0], c) === null,
      ISERROR: (a, c) => isErr(S(a[0], c)),
      MIN: (a, c) => { const L = datar(a, c, true); return L.length ? Math.min.apply(null, L) : 0; },
      MAX: (a, c) => { const L = datar(a, c, true); return L.length ? Math.max.apply(null, L) : 0; },
      DATE: (a, c) => serial(num(S(a[0], c)), num(S(a[1], c)), num(S(a[2], c))),
      CHOOSE: (a, c) => { const i = num(S(a[0], c)); if (i < 1 || i >= a.length) throw ERR('#VALUE!'); return ev(a[i], c); }
    };
    return { nilai: (shNama, ref) => { const L = lembar(shNama), p = pisahRef(ref); return L && p ? nilaiSel(L, p[0], p[1]) : null; }, nilaiSel, lembar };
  }

  /* ======================= tanggal & format ======================= */
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const D0 = Date.UTC(1899, 11, 30);
  function serial(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - D0) / 864e5); }
  function tgl(s) { const d = new Date(D0 + Math.floor(s) * 864e5); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCDay()]; }
  function bulat(x, d) { const f = Math.pow(10, d), y = Number((Math.abs(x) * f).toPrecision(15)); const r = Math.round(y) / f; return x < 0 ? -r : r; }   // presisi 15 digit seperti Excel
  function angkaTeks(v) { if (Number.isInteger(v)) return String(v); const s = String(Number(v.toPrecision(15))); return s; }
  function ribuan(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtAngka(v, kode) {   // bagian angka satu seksi (tanpa ;)
    let k = kode, pct = /%/.test(k); if (pct) v *= 100;
    const titik = k.indexOf('.'), intPart = titik >= 0 ? k.slice(0, titik) : k, decPart = titik >= 0 ? k.slice(titik + 1) : '';
    const nd = (decPart.match(/[0#?]/g) || []).length, wajibD = (decPart.match(/0/g) || []).length;
    const pakaiRibu = /[0#?],[0#?]/.test(intPart);
    const minInt = (intPart.replace(/[^0]/g, '')).length;
    let s = bulat(Math.abs(v), nd).toFixed(nd);
    let [i, d = ''] = s.split('.');
    if (minInt === 0 && i === '0') i = ''; i = i.padStart(minInt, '0');
    if (nd > wajibD) d = d.replace(/0+$/, '').padEnd(wajibD, '0');
    if (pakaiRibu) i = ribuan(i);
    let t = i + (d ? '.' + d : (titik >= 0 && wajibD ? '.' : ''));
    // literal di sekitar angka
    const awal = /^[^0#?]*/.exec(intPart)[0], akhir = /[^0#?.,%]*$/.exec(decPart || intPart)[0];
    const lit = x => x.replace(/"([^"]*)"/g, '$1').replace(/\\(.)/g, '$1').replace(/_./g, ' ').replace(/\*./g, '').replace(/\[[^\]]*\]/g, '');
    return lit(awal) + t + (pct ? '%' : '') + lit(akhir.replace('%', ''));
  }
  function fmtTanggal(v, kode) {
    const [y, m, d, w] = tgl(v);
    return kode.replace(/\[[^\]]*\]/g, '').replace(/"([^"]*)"|dddd|ddd|dd|d|mmmm|mmm|mm|m|yyyy|yy/gi, (x, q) => {
      if (q !== undefined) return q; const k = x.toLowerCase();
      return k === 'dddd' ? HARI[w] : k === 'ddd' ? HARI[w].slice(0, 3) : k === 'dd' ? String(d).padStart(2, '0') : k === 'd' ? String(d) : k === 'mmmm' ? BULAN[m - 1] : k === 'mmm' ? BLN3[m - 1] : k === 'mm' ? String(m).padStart(2, '0') : k === 'm' ? String(m) : k === 'yyyy' ? String(y) : String(y).slice(-2);
    });
  }
  const adaTanggal = k => /(^|[^"\\])(d|m|y)/i.test(k.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, ''));
  function teksFormat(v, kode) {
    if (typeof v === 'string') { if (v !== '' && isFinite(Number(v))) v = Number(v); else return v; }
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (v === null) v = 0;
    const sek = kode.split(';');
    let k = sek[0]; if (v < 0 && sek[1] !== undefined) { k = sek[1]; v = -v; } else if (v === 0 && sek[2] !== undefined) k = sek[2];
    if (/^general$/i.test(k)) return angkaTeks(v);
    if (adaTanggal(k)) return fmtTanggal(v, k);
    if (!/[0#?]/.test(k)) return k.replace(/"([^"]*)"/g, '$1').replace(/\\(.)/g, '$1');
    const neg = v < 0 && sek[1] === undefined;
    return (neg ? '-' : '') + fmtAngka(Math.abs(v), k);
  }

  /* ======================= hitung & tulis nilai tersimpan ======================= */
  function hitungSemua(W, saring) {   // → Map sheetNama → Map kunci → nilai, untuk semua sel rumus
    const M = Mesin(W), out = new Map();
    W.sheets.forEach(s => { if (saring && !saring(s)) return; const H = new Map(); s.sel.forEach((o, k) => { if (o.f !== undefined) H.set(k, M.nilaiSel(s, o.c, o.r)); }); out.set(s.nama, H); });
    return { hasil: out, mesin: M };
  }
  function tulisNilai(xml, H) {   // sisipkan <v> hasil hitung ke sel rumus (t="str"/"b"/"e" untuk teks/boolean/galat)
    return xml.replace(/<c r="([A-Z]+\d+)"((?:\s[^>\/]*(?:"[^"]*")?)*?)>(<f\b[^>]*\/>|<f\b[^>]*[^\/]>[\s\S]*?<\/f>|<f>[\s\S]*?<\/f>)(?:<v>[\s\S]*?<\/v>)?<\/c>/g, (m, ref, attr, f) => {   // <f …/> (bersama) dicoba dulu agar tidak menelan sel berikutnya
      if (!H.has(ref)) return m;
      const v = H.get(ref), a = attr.replace(/\st="\w+"/, '');
      if (v === null || v === undefined) return `<c r="${ref}"${a}>${f}</c>`;
      if (isErr(v)) return `<c r="${ref}"${a} t="e">${f}<v>${esc(v.err)}</v></c>`;
      if (typeof v === 'boolean') return `<c r="${ref}"${a} t="b">${f}<v>${v ? 1 : 0}</v></c>`;
      if (typeof v === 'number') return `<c r="${ref}"${a}>${f}<v>${isFinite(v) ? Number(v.toPrecision(15)) : 0}</v></c>`;
      return `<c r="${ref}"${a} t="str">${f}<v>${esc(v)}</v></c>`;
    });
  }
  root.XLH = { bukaZip, tutupZip, muat, parse, tokenize, Mesin, hitungSemua, tulisNilai, teksFormat, serial, tgl, kolNo, kolHuruf, pisahRef, unesc, esc, isErr, bacaSel };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.XLH;
})(typeof window !== 'undefined' ? window : globalThis);
