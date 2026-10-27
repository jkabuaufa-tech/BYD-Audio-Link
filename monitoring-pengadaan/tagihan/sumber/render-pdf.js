/* TAGIHAN RENDER PDF 1.0.0 — model dokumen (BLD) → PDF vektor (teks dapat dicari) dengan pdf-lib 1.17.
 * A4 tegak/lanskap, tabel berhalaman banyak dengan kepala berulang, baris & blok tanda tangan tidak terpotong,
 * kaki halaman "nomor · revisi · Hal x / n", tanda air DRAF, PDF terpisah per dokumen & PDF bundel ber-daftar isi. */
var BLRP = (function () {
  'use strict';
  const A4 = [595.28, 841.89], TEPI = { a: 30, b: 42, k: 32 };
  const NAVY = [0.043, 0.165, 0.42], MERAH = [0.784, 0.063, 0.18];
  const GANTI = { '≠': '<>', '≤': '<=', '≥': '>=', '→': '->', '←': '<-', '✓': 'v', '✔': 'v', '✗': 'x', '…': '...', ' ': ' ', ' ': ' ', '​': '' };

  async function siapkan(PDFLib, doc, opsi) {
    const { StandardFonts } = PDFLib;
    const F = { n: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
    const set = new Set(F.n.getCharacterSet());
    const bersih = t => Array.from(String(t === null || t === undefined ? '' : t)).map(ch => GANTI[ch] !== undefined ? GANTI[ch] : set.has(ch.codePointAt(0)) ? ch : (ch === '\n' || ch === '\t') ? ' ' : '?').join('');
    let logo = null;
    if (opsi && opsi.logo) {
      try {
        const m = String(opsi.logo).match(/^data:image\/(jpe?g|png);base64,(.+)$/);
        if (m) { const raw = Uint8Array.from(atobAman(m[2]), c => c.charCodeAt(0)); logo = /png/.test(m[1]) ? await doc.embedPng(raw) : await doc.embedJpg(raw); }
      } catch (e) { logo = null; }
    }
    return { F, bersih, logo, rgb: PDFLib.rgb, degrees: PDFLib.degrees };
  }
  function atobAman(s) { if (typeof atob === 'function') return atob(s); return Buffer.from(s, 'base64').toString('binary'); }

  // teks kaya: "a **b** c" → [{t:'a ', b:0},{t:'b', b:1},{t:' c', b:0}]
  function segmen(teks) { const out = []; String(teks).split('**').forEach((t, i) => { if (t) out.push({ t, b: i % 2 === 1 }); }); return out; }
  function bungkus(R, teks, lebar, uk, tebalSemua) {
    const kata = []; segmen(R.bersih(teks)).forEach(s => s.t.split(/(\s+)/).forEach(w => { if (w) kata.push({ t: w, b: tebalSemua || s.b }); }));
    const baris = []; let kini = [], w = 0;
    const ukur = k => (k.b ? R.F.b : R.F.n).widthOfTextAtSize(k.t, uk);
    kata.forEach(k => {
      const sp = /^\s+$/.test(k.t); if (sp && !kini.length) return;
      let lw = ukur(k);
      if (!sp && w + lw > lebar && kini.length) { while (kini.length && /^\s+$/.test(kini[kini.length - 1].t)) kini.pop(); baris.push(kini); kini = []; w = 0; }
      if (!sp && lw > lebar) {   // kata sangat panjang (mis. nomor kontrak) → dipotong per karakter
        let pot = ''; for (const ch of k.t) { const c = { t: pot + ch, b: k.b }; if (ukur(c) > lebar && pot) { baris.push([{ t: pot, b: k.b }]); pot = ch; } else pot += ch; }
        k = { t: pot, b: k.b }; lw = ukur(k);
      }
      kini.push(k); w += lw;
    });
    while (kini.length && /^\s+$/.test(kini[kini.length - 1].t)) kini.pop();
    if (kini.length) baris.push(kini);
    return baris.length ? baris : [[]];
  }
  const lebarBaris = (R, ln, uk) => ln.reduce((a, k) => a + (k.b ? R.F.b : R.F.n).widthOfTextAtSize(k.t, uk), 0);
  function tulis(R, pg, ln, x, y, uk, rata, lebar, warna, miring) {
    let cx = x; const w = lebarBaris(R, ln, uk);
    if (rata === 'r') cx = x + lebar - w; else if (rata === 'c') cx = x + (lebar - w) / 2;
    ln.forEach(k => { const f = miring ? R.F.i : k.b ? R.F.b : R.F.n; if (k.t) pg.drawText(k.t, { x: cx, y, size: uk, font: f, color: R.rgb.apply(null, warna || [0.07, 0.07, 0.07]) }); cx += f.widthOfTextAtSize(k.t, uk); });
  }

  /* ---------- tata letak satu dokumen ---------- */
  function Penata(PDFLib, doc, R, m, opsi) {
    const ukuran = m.orientasi === 'L' ? [A4[1], A4[0]] : A4;
    const L = { pages: [], pg: null, y: 0, W: ukuran[0] - TEPI.k * 2, x0: TEPI.k };
    L.baru = () => { L.pg = doc.addPage(ukuran); L.pages.push(L.pg); L.y = ukuran[1] - TEPI.a; return L.pg; };
    L.sisa = () => L.y - TEPI.b;
    L.butuh = h => { if (L.sisa() < h) { L.baru(); return true; } return false; };
    L.baru();
    return L;
  }
  const LH = uk => uk * 1.32;

  function gambarBlok(R, L, b, opsi, m) {
    const rgb = R.rgb;
    if (b.t === 'kop') {
      const h = 40; let x = L.x0;
      if (R.logo) { const s = h / R.logo.height; L.pg.drawImage(R.logo, { x, y: L.y - h, width: R.logo.width * s, height: h }); x += R.logo.width * s + 12; }
      tulis(R, L.pg, [{ t: R.bersih(opsi.namaKop || ''), b: true }], x, L.y - h / 2 - 6, 17, 'l', 0, NAVY);
      L.y -= h + 4;
      L.pg.drawLine({ start: { x: L.x0, y: L.y }, end: { x: L.x0 + L.W, y: L.y }, thickness: 1.6, color: rgb.apply(null, NAVY) });
      const al = bungkus(R, opsi.alamatKop || '', L.W, 6.6); L.y -= 8.5;
      al.forEach(ln => { tulis(R, L.pg, ln, L.x0, L.y, 6.6, 'c', L.W, [0.2, 0.2, 0.2]); L.y -= LH(6.6); });
      L.pg.drawLine({ start: { x: L.x0, y: L.y + 4 }, end: { x: L.x0 + L.W, y: L.y + 4 }, thickness: 0.6, color: rgb.apply(null, MERAH) });
      L.y -= 4; return;
    }
    if (b.t === 'judul') {
      L.y -= 10; const j = bungkus(R, b.teks, L.W, 11, true);
      j.forEach(ln => { L.butuh(20); tulis(R, L.pg, ln, L.x0, L.y - 11, 11, 'c', L.W); const w = lebarBaris(R, ln, 11); L.pg.drawLine({ start: { x: L.x0 + (L.W - w) / 2, y: L.y - 12.5 }, end: { x: L.x0 + (L.W + w) / 2, y: L.y - 12.5 }, thickness: 0.7 }); L.y -= 14; });
      if (b.nomor) { tulis(R, L.pg, [{ t: R.bersih(b.nomor), b: true }], L.x0, L.y - 9, 8.5, 'c', L.W); L.y -= 14; }
      return;
    }
    if (b.t === 'p' || b.t === 'catatan') {
      const uk = b.t === 'p' ? 8.3 : 7.2, ls = bungkus(R, b.teks, L.W, uk); L.y -= 2;
      ls.forEach(ln => { L.butuh(LH(uk) + 2); tulis(R, L.pg, ln, L.x0, L.y - uk, uk, 'l', L.W); L.y -= LH(uk); });
      L.y -= 2; return;
    }
    if (b.t === 'info') {
      const uk = 8.1, wN = 16, wL = Math.min(b.lebar || 150, L.W * 0.4), wV = L.W - 6 - wN - wL;
      b.baris.forEach(r => {
        const a = bungkus(R, r[1], wL - 4, uk), v = bungkus(R, r[2], wV, uk), n = Math.max(a.length, v.length), h = n * LH(uk) + 1.5;
        L.butuh(h);
        tulis(R, L.pg, bungkus(R, r[0], wN, uk)[0], L.x0 + 6, L.y - uk, uk, 'l', wN);
        a.forEach((ln, i) => tulis(R, L.pg, ln, L.x0 + 6 + wN, L.y - uk - i * LH(uk), uk, 'l', wL));
        v.forEach((ln, i) => tulis(R, L.pg, ln, L.x0 + 6 + wN + wL, L.y - uk - i * LH(uk), uk, 'l', wV));
        L.y -= h;
      });
      L.y -= 3; return;
    }
    if (b.t === 'kotak') {
      const uk = b.besar ? 15 : 8.3, w = L.W - 6, ls = bungkus(R, b.teks, w - 16, uk, true), h = ls.length * LH(uk) + 8;
      L.butuh(h + 6); L.y -= 3;
      L.pg.drawRectangle({ x: L.x0 + 6, y: L.y - h, width: w, height: h, color: rgb(0.953, 0.965, 0.984), borderColor: b.besar ? rgb.apply(null, NAVY) : undefined, borderWidth: b.besar ? 1.2 : 0 });
      if (!b.besar) L.pg.drawRectangle({ x: L.x0 + 6, y: L.y - h, width: 2.5, height: h, color: rgb.apply(null, NAVY) });
      ls.forEach((ln, i) => tulis(R, L.pg, ln, L.x0 + 14, L.y - 4 - uk - i * LH(uk) + (b.besar ? 2 : 0), uk, b.besar ? 'c' : 'l', w - 16));
      L.y -= h + 5; return;
    }
    if (b.t === 'hitung') {
      const uk = 8.1, wNo = 18, wP = 58, wEq = 12, wT = 24, wV = 118, wLab = L.W - 6 - wNo - wP - wEq - wT - wV;
      b.baris.forEach(r => {
        const u = r.total ? 9 : uk, lab = bungkus(R, r.label, wLab - 4, u, r.tebal), h = lab.length * LH(u) + (r.total ? 4 : 1.5);
        L.butuh(h); let x = L.x0 + 6; const y = L.y - u - (r.total ? 3 : 0);
        tulis(R, L.pg, [{ t: R.bersih(r.no), b: r.tebal }], x, y, u, 'l', wNo); x += wNo;
        lab.forEach((ln, i) => tulis(R, L.pg, ln, x, y - i * LH(u), u, 'l', wLab)); x += wLab;
        tulis(R, L.pg, [{ t: R.bersih(r.pct), b: r.tebal }], x, y, u, 'r', wP - 4); x += wP;
        if (r.label && r.nilai !== '') tulis(R, L.pg, [{ t: '=', b: false }], x, y, u, 'c', wEq); x += wEq;
        tulis(R, L.pg, [{ t: R.bersih(r.tanda === '=' ? '' : r.tanda), b: false }], x, y, u, 'c', wT); x += wT;
        tulis(R, L.pg, [{ t: R.bersih(r.nilai), b: r.tebal }], x, y, u, 'r', wV);
        if (r.garis) L.pg.drawLine({ start: { x, y: y - 2.5 }, end: { x: x + wV, y: y - 2.5 }, thickness: 0.7 });
        L.y -= h;
      });
      L.y -= 3; return;
    }
    if (b.t === 'tabel') return tabel(R, L, b);
    if (b.t === 'ttd') {
      const uk = 8, kol = b.kolom, w = L.W / kol.length;
      const tinggi = kol.reduce((mx, k) => k.kosong ? mx : Math.max(mx, (bungkus(R, k.atas, w - 8, uk).length + bungkus(R, k.instansi, w - 8, uk, true).length + 2) * LH(uk) + 52), 0) + (b.tempat ? 14 : 0) + 8;
      L.butuh(tinggi); L.y -= 6;
      if (b.tempat) { tulis(R, L.pg, [{ t: R.bersih(b.tempat), b: false }], L.x0, L.y - uk, uk, 'r', L.W - 10); L.y -= 13; }
      const y0 = L.y;
      kol.forEach((k, i) => {
        if (k.kosong) return; let y = y0; const x = L.x0 + i * w;
        bungkus(R, k.atas, w - 8, uk).forEach(ln => { tulis(R, L.pg, ln, x, y - uk, uk, 'c', w); y -= LH(uk); });
        bungkus(R, k.instansi, w - 8, uk, true).forEach(ln => { tulis(R, L.pg, ln, x, y - uk, uk, 'c', w); y -= LH(uk); });
        if (k.meterai) { L.pg.drawRectangle({ x: x + w / 2 - 28, y: y - 40, width: 56, height: 30, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.6, borderDashArray: [2, 2] }); tulis(R, L.pg, [{ t: 'meterai', b: false }], x + w / 2 - 28, y - 28, 6.5, 'c', 56, [0.6, 0.6, 0.6]); }
        y -= 52;
        const nm = [{ t: R.bersih(k.nama), b: true }]; tulis(R, L.pg, nm, x, y - uk, uk, 'c', w);
        const nw = lebarBaris(R, nm, uk); L.pg.drawLine({ start: { x: x + (w - nw) / 2, y: y - uk - 1.5 }, end: { x: x + (w + nw) / 2, y: y - uk - 1.5 }, thickness: 0.6 }); y -= LH(uk);
        tulis(R, L.pg, [{ t: R.bersih(k.jabatan), b: false }], x, y - uk, uk, 'c', w);
      });
      L.y = y0 - tinggi + (b.tempat ? 14 : 0) + 4; return;
    }
  }

  function tabel(R, L, b) {
    const rgb = R.rgb, uk = b.ukuran || 7.3, tot = b.kolom.reduce((a, k) => a + k.l, 0), W = L.W * (b.lebarPersen || 100) / 100, lebar = b.kolom.map(k => k.l / tot * W), pad = 2.2;
    const xs = []; lebar.reduce((a, w, i) => { xs[i] = a; return a + w; }, L.x0 + (b.tengah ? (L.W - W) / 2 : 0));
    const kepala = (b.kepala || []).map(row => { const sel = []; row.forEach((c, i) => { if (c === null) return; const sp = c.span || 1; const w = lebar.slice(i, i + sp).reduce((a, x) => a + x, 0); sel.push({ i, w, c }); }); return sel; });
    const tinggiKepala = kepala.map(row => Math.max.apply(null, [1].concat(row.map(s => bungkus(R, s.c.teks, s.w - pad * 2, s.c.idx ? uk - 0.8 : uk - 0.4, true).length))) * LH(uk) + pad * 2);
    const totalKepala = tinggiKepala.reduce((a, x) => a + x, 0);
    function gambarKepala() {
      kepala.forEach((row, r) => {
        const h = tinggiKepala[r];
        row.forEach(s => {
          L.pg.drawRectangle({ x: xs[s.i], y: L.y - h, width: s.w, height: h, color: s.c.idx ? rgb(0.933, 0.949, 0.973) : rgb(0.875, 0.906, 0.953), borderColor: rgb(0.13, 0.13, 0.13), borderWidth: 0.5 });
          const ls = bungkus(R, s.c.teks, s.w - pad * 2, s.c.idx ? uk - 0.8 : uk - 0.4, !s.c.idx), u = s.c.idx ? uk - 0.8 : uk - 0.4, y0 = L.y - (h - ls.length * LH(uk)) / 2;
          ls.forEach((ln, i) => tulis(R, L.pg, ln, xs[s.i] + pad, y0 - u - i * LH(uk) + 1, u, 'c', s.w - pad * 2, null, s.c.idx));
        });
        L.y -= h;
      });
    }
    L.butuh(b.utuh ? totalKepala + b.isi.length * (LH(uk) + pad * 2) + 8 : totalKepala + LH(uk) * 2 + pad * 2); L.y -= 3; gambarKepala();
    b.isi.forEach(row => {
      const tebal = row.gaya === 'judul' || row.gaya === 'jumlah' || row.gaya === 'tebal' || row.gaya === 'kotak' || row.gaya === 'judulPolos';
      // sel bernilai null = tergabung ke sel sebelumnya (row.span[i] = jumlah kolom)
      const sel = [], lb = [], xx = [];
      row.sel.forEach((v, i) => { if (v === null) return; const sp = (row.span && row.span[i]) || 1, w = lebar.slice(i, i + sp).reduce((a, x) => a + x, 0); sel.push({ i, ls: bungkus(R, v, w - pad * 2, uk, tebal) }); lb.push(w); xx.push(xs[i]); });
      const h = Math.max(Math.max.apply(null, sel.map(s => s.ls.length)) * LH(uk) + pad * 2, row.tinggi || 0);
      if (L.sisa() < h) { L.baru(); gambarKepala(); }
      const latar = b.polos ? null : row.gaya === 'judul' ? rgb(0.969, 0.976, 0.988) : row.gaya === 'jumlah' ? rgb(0.933, 0.949, 0.973) : row.gaya === 'sorot' ? rgb(1, 0.973, 0.86) : null;
      sel.forEach((s, k) => {
        if (!b.polos) L.pg.drawRectangle({ x: xx[k], y: L.y - h, width: lb[k], height: h, color: latar || undefined, borderColor: rgb(0.13, 0.13, 0.13), borderWidth: 0.5 });
        const r = (b.kolom[s.i] || {}).r || 'l';
        s.ls.forEach((ln, j) => tulis(R, L.pg, ln, xx[k] + pad, L.y - pad - uk - j * LH(uk) + 0.5, uk, r, lb[k] - pad * 2));
        if (row.gaya === 'judulPolos' && s.ls[0] && s.ls[0].length) { const w0 = lebarBaris(R, s.ls[0], uk); L.pg.drawLine({ start: { x: xx[k] + pad, y: L.y - pad - uk - 1 }, end: { x: xx[k] + pad + w0, y: L.y - pad - uk - 1 }, thickness: 0.5 }); }
      });
      if (b.polos && (row.gaya === 'garisAtas' || row.gaya === 'kotak')) L.pg.drawLine({ start: { x: xs[0], y: L.y }, end: { x: xs[0] + W, y: L.y }, thickness: 0.7 });
      if (b.polos && row.gaya === 'kotak') L.pg.drawLine({ start: { x: xs[0], y: L.y - h }, end: { x: xs[0] + W, y: L.y - h }, thickness: 0.7 });
      L.y -= h;
    });
    L.y -= 4;
  }

  function kakiHalaman(R, pages, m, opsi, mulai) {
    const n = pages.length;
    pages.forEach((pg, i) => {
      const { width } = pg.getSize(), uk = 6.4;
      if (m.tandaAir) pg.drawText(R.bersih(m.tandaAir), { x: width / 2 - 150, y: pg.getSize().height / 2 - 120, size: 110, font: R.F.b, color: R.rgb.apply(null, MERAH), opacity: 0.08, rotate: R.degrees(30) });
      pg.drawLine({ start: { x: TEPI.k, y: TEPI.b - 14 }, end: { x: width - TEPI.k, y: TEPI.b - 14 }, thickness: 0.4, color: R.rgb(0.7, 0.7, 0.7) });
      const kiri = bungkus(R, m.nomor + ' · ' + (m.kaki || ''), width - TEPI.k * 2 - 110, uk)[0];
      tulis(R, pg, kiri, TEPI.k, TEPI.b - 22, uk, 'l', width, [0.4, 0.4, 0.4]);
      tulis(R, pg, [{ t: 'Hal ' + (i + 1) + ' / ' + n + (mulai ? '  ·  bundel ' + (mulai + i) : ''), b: false }], TEPI.k, TEPI.b - 22, uk, 'r', width - TEPI.k * 2, [0.4, 0.4, 0.4]);
    });
  }

  async function tambahDokumen(PDFLib, doc, R, m, opsi, mulai) {
    const L = Penata(PDFLib, doc, R, m, opsi);
    m.blok.forEach(b => gambarBlok(R, L, b, opsi, m));
    kakiHalaman(R, L.pages, m, opsi, mulai);
    return L.pages.length;
  }
  function metadata(doc, m, opsi) {
    doc.setTitle((m && m.judul ? m.judul + ' ' : '') + (m && m.nomor || ''));
    doc.setAuthor(opsi.penulis || 'Monitoring SAP · Billing Generator'); doc.setSubject(opsi.subjek || 'Paket tagihan'); doc.setCreator('Tagihan inti ' + (opsi.versiMesin || '1.0.0'));
    doc.setProducer('pdf-lib'); doc.setKeywords([].concat(opsi.kataKunci || [])); const t = opsi.waktu ? new Date(opsi.waktu) : new Date(); doc.setCreationDate(t); doc.setModificationDate(t);
  }
  // satu dokumen → Uint8Array
  async function satu(PDFLib, m, opsi) {
    opsi = opsi || {}; const doc = await PDFLib.PDFDocument.create(), R = await siapkan(PDFLib, doc, opsi);
    const n = await tambahDokumen(PDFLib, doc, R, m, opsi, 0); metadata(doc, m, opsi);
    return { bytes: await doc.save({ useObjectStreams: true }), halaman: n };
  }
  // bundel: halaman sampul + daftar isi, lalu seluruh dokumen berurutan
  async function bundel(PDFLib, models, opsi) {
    opsi = opsi || {}; const doc = await PDFLib.PDFDocument.create(), R = await siapkan(PDFLib, doc, opsi);
    const sampul = doc.addPage(A4), isi = [];
    let hal = 2;
    for (const m of models) { const n = await tambahDokumen(PDFLib, doc, R, m, opsi, hal); isi.push({ m, dari: hal, sampai: hal + n - 1 }); hal += n; }
    // sampul
    let y = A4[1] - 60; const W = A4[0] - TEPI.k * 2;
    tulis(R, sampul, [{ t: R.bersih(opsi.namaKop || ''), b: true }], TEPI.k, y, 15, 'c', W, NAVY); y -= 34;
    tulis(R, sampul, [{ t: 'BUNDEL DOKUMEN TAGIHAN', b: true }], TEPI.k, y, 14, 'c', W); y -= 22;
    (opsi.sampul || []).forEach(r => { bungkus(R, r, W - 40, 9).forEach(ln => { tulis(R, sampul, ln, TEPI.k + 20, y, 9, 'l', W - 40); y -= 13; }); });
    y -= 12; tulis(R, sampul, [{ t: 'DAFTAR ISI', b: true }], TEPI.k + 20, y, 10, 'l', W); y -= 16;
    isi.forEach((x, i) => {
      const t = (i + 1) + '. ' + x.m.judul + ' — ' + x.m.nomor;
      const ls = bungkus(R, t, W - 120, 8.5); ls.forEach((ln, j) => { tulis(R, sampul, ln, TEPI.k + 26, y, 8.5, 'l', W - 120); if (!j) tulis(R, sampul, [{ t: 'hal. ' + x.dari + (x.sampai > x.dari ? '–' + x.sampai : ''), b: false }], TEPI.k, y, 8.5, 'r', W - 20); y -= 12; });
    });
    if (opsi.catatanSampul) { y -= 10; bungkus(R, opsi.catatanSampul, W - 40, 7.5).forEach(ln => { tulis(R, sampul, ln, TEPI.k + 20, y, 7.5, 'l', W - 40, [0.35, 0.35, 0.35]); y -= 10; }); }
    metadata(doc, { judul: 'Bundel', nomor: opsi.judul || '' }, opsi);
    return { bytes: await doc.save({ useObjectStreams: true }), halaman: hal - 1, isi: isi.map(x => ({ kode: x.m.kode, nomor: x.m.nomor, dari: x.dari, sampai: x.sampai })) };
  }
  return { VERSI: '1.0.0', satu, bundel, _bungkus: bungkus };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BLRP;
