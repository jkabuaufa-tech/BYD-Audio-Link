/* MP292 — FORMAT EXCEL BAKU TAGIHAN di Form Input Progres · NPWP vendor otomatis dari Master Data di Paket Tagihan
 *  A. Tombol "Excel Format Baku" di Form Input Progres: pilih BK kontrak terpilih → unduh .xlsx berformat BAKU tanpa perubahan tata letak:
 *     - SPM / SPPM  → "Master SPM" (sheet INPUT · ITEM · SPM · BAPM · BAP …)
 *     - SPK / SPPP / SPKP → "BAP format" (sheet DATA · lamp1 · rincian · BAPP · BAP 1 · BAPR …)
 *     Hanya sel isian yang diisi aplikasi (INPUT/ITEM, atau DATA/lamp1/REKAP PROGRES); seluruh rumus, gaya, gabungan sel, logo &
 *     pengaturan cetak berasal dari berkas baku. Excel menghitung ulang saat dibuka (klik "Enable Editing" bila berkas dari internet).
 *     Template ringan disiapkan dengan alat/siapkan-format-tagihan.py (sheet database "rekanan" & tautan berkas lain dibuang).
 *     Termin: BK ke-n mengisi termin ke-n (SPM 1–4, BAP format 1–6); BK ke-n di atas kapasitas → termin sebelumnya digabung,
 *     nomor BA tetap nomor BK sebenarnya.
 *  B. NPWP, email, telepon vendor dari Master Data › Vendor (pelengkap vendor baku 2.7.2) ikut ke profil vendor →
 *     Paket Tagihan mengisi NPWP otomatis (isian yang sudah tersimpan di paket tetap diutamakan bila tidak kosong). */
(function () {
  'use strict';
  if (window.__MP292__) return; window.__MP292__ = true;
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const lower = s => String(s || '').trim().toLowerCase();
  const FORMAT = window.__MP292_FORMAT || {};   // { spm: base64, bap: base64 } — disisipkan saat perakitan paket

  /* ======================= B. master tambahan vendor → profil vendor (NPWP dll.) ======================= */
  const MT = { data: null, muat: null };
  const detailMT = m => { if (m && m.detail && typeof m.detail === 'object') return m.detail; const k = String((m && m.keterangan) || '').trim(); if (k.startsWith('{')) { try { return JSON.parse(k) || {}; } catch (e) { } } return {}; };
  function muatMT(paksa) {
    if (MT.muat && !paksa) return MT.muat;
    if (typeof window.regAksi !== 'function') return Promise.resolve([]);
    MT.muat = window.regAksi('bacaMasterTambahan', {}).then(r => { MT.data = (r && r.data) || []; return MT.data; }).catch(() => { MT.muat = null; return MT.data || []; });
    return MT.muat;
  }
  function vendorMT(id, nama) {
    const L = (MT.data || []).filter(m => m.jenis === 'VENDOR' && m.aktif !== false && detailMT(m).aktif !== false);
    const d = m => detailMT(m);
    return L.find(m => id && (String(d(m).kodeSAP || '') === String(id) || String(m.kode || '') === String(id))) || L.find(m => nama && lower(m.nama) === lower(nama)) || null;
  }
  window.mp292VendorMaster = (id, nama) => { const m = vendorMT(id, nama); return m ? Object.assign({ nama: m.nama }, detailMT(m)) : null; };
  (function bungkusProfil() {
    const asli = window.profilVendor; if (typeof asli !== 'function' || asli.__mp292) { if (typeof asli !== 'function') setTimeout(bungkusProfil, 1500); return; }
    const g = function (id, nama) {
      const p = asli.apply(this, arguments) || {};
      try { const m = vendorMT(id, nama || p.namaVendor); if (m) { const d = detailMT(m); ['npwp', 'email', 'telp', 'kota'].forEach(k => { if (!p[k] && d[k]) p[k] = d[k]; }); if (!p.alamat && d.alamat) p.alamat = d.alamat; if (!p.nama && d.pimpinan) p.nama = d.pimpinan; } } catch (e) { }
      return p;
    };
    g.__mp292 = true; window.profilVendor = g;
  })();

  /* ======================= A1. ZIP (DecompressionStream / CompressionStream) ======================= */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function aliran(bytes, Kelas, mode) { const s = new Blob([bytes]).stream().pipeThrough(new Kelas(mode)); return new Uint8Array(await new Response(s).arrayBuffer()); }
  async function bukaZip(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let e = u8.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Template Excel rusak (ZIP).');
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
  async function tutupZip(files) {   // [[nama, Uint8Array]] → Uint8Array (deflate)
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
  const b64 = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };

  /* ======================= A2. tulis sel di XML lembar (gaya sel dipertahankan) ======================= */
  const XE = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const kolNo = h => { let c = 0; for (const ch of h) c = c * 26 + ch.charCodeAt(0) - 64; return c; };
  const pisah = ref => { const m = /^([A-Z]+)(\d+)$/.exec(ref); return [m[1], Number(m[2])]; };
  function isiSel(xml, ref, val) {   // val: string | number | { f: rumus } | null (kosong) — isi lama sel diganti
    const [kh, r] = pisah(ref), kn = kolNo(kh);
    const isi = s => val === null || val === undefined || val === '' ? `<c r="${ref}"${s}/>` : typeof val === 'object' ? `<c r="${ref}"${s}><f>${XE(val.f)}</f></c>` : typeof val === 'number' ? `<c r="${ref}"${s}><v>${val}</v></c>` : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${XE(val)}</t></is></c>`;
    const reSel = new RegExp(`<c r="${ref}"(\\s[^>]*?)?(?:/>|>[\\s\\S]*?</c>)`);
    const m = reSel.exec(xml);
    if (m) { const s = /\ss="\d+"/.exec(m[1] || ''); return xml.slice(0, m.index) + isi(s ? s[0] : '') + xml.slice(m.index + m[0].length); }
    const reBaris = new RegExp(`<row r="${r}"(\\s[^>]*)?(?:/>|>([\\s\\S]*?)</row>)`), b = reBaris.exec(xml);
    if (b) {
      const attr = b[1] || '', isiB = b[2] || '';
      let pos = isiB.length; const reC = /<c r="([A-Z]+)\d+"/g; let c;
      while ((c = reC.exec(isiB))) { if (kolNo(c[1]) > kn) { pos = c.index; break; } }
      const baru = `<row r="${r}"${attr}>` + isiB.slice(0, pos) + isi('') + isiB.slice(pos) + '</row>';
      return xml.slice(0, b.index) + baru + xml.slice(b.index + b[0].length);
    }
    const sd = xml.indexOf('<sheetData>'), sdE = xml.indexOf('</sheetData>'); let pos = sdE;
    const reR = /<row r="(\d+)"/g; reR.lastIndex = sd; let x;
    while ((x = reR.exec(xml)) && x.index < sdE) { if (Number(x[1]) > r) { pos = x.index; break; } }
    if (xml.indexOf('<sheetData/>') >= 0) return xml.replace('<sheetData/>', `<sheetData><row r="${r}">${isi('')}</row></sheetData>`);
    return xml.slice(0, pos) + `<row r="${r}">${isi('')}</row>` + xml.slice(pos);
  }
  function petaSheet(F) {   // nama sheet → path XML
    const dec = new TextDecoder(), wb = dec.decode(F.get('xl/workbook.xml')), rels = dec.decode(F.get('xl/_rels/workbook.xml.rels')), rid = {}, out = {};
    rels.replace(/<Relationship [^>]*?\/>/g, a => { const i = /Id="([^"]+)"/.exec(a), t = /Target="([^"]+)"/.exec(a); if (i && t) rid[i[1]] = 'xl/' + t[1].replace(/^\/?xl\//, ''); return a; });
    wb.replace(/<sheet [^>]*?\/>/g, a => { const n = /name="([^"]*)"/.exec(a), r = /r:id="([^"]+)"/.exec(a); if (n && r) out[n[1].replace(/&amp;/g, '&')] = rid[r[1]]; return a; });
    return out;
  }
  async function bangun(jenis, tulisan) {   // tulisan: { sheet: { ref: nilai } } → Uint8Array .xlsx
    if (!FORMAT[jenis]) throw new Error('Template format baku belum terpasang di paket ini.');
    const F = await bukaZip(b64(FORMAT[jenis])), S = petaSheet(F), enc = new TextEncoder(), dec = new TextDecoder();
    Object.keys(tulisan).forEach(sh => {
      const p = S[sh]; if (!p || !F.has(p)) throw new Error('Sheet "' + sh + '" tidak ada di format baku.');
      let x = dec.decode(F.get(p)); Object.entries(tulisan[sh]).forEach(([ref, v]) => { x = isiSel(x, ref, v); }); F.set(p, enc.encode(x));
    });
    return tutupZip([...F.entries()]);
  }
  window.mp292Bangun = bangun;

  /* ======================= A3. data kontrak & BK dari aplikasi ======================= */
  const SERIAL0 = Date.UTC(1899, 11, 30);
  const serial = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - SERIAL0) / 864e5) : null; };
  const volItem = it => { try { if (typeof window.volItem === 'function') return N(window.volItem(it)); } catch (e) { } return N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak ?? it.vol); };
  const hargaItem = it => { try { if (typeof window.hargaItem === 'function') return N(window.hargaItem(it)); } catch (e) { } return N(it.hargaSatuanEfektif ?? it.hargaSatuan ?? it.harga); };
  const ID = (g, it, i) => { try { if (typeof idItem === 'function') return idItem(g, it, i); } catch (e) { } return (g.key || '') + '-' + i; };
  const jenisDari = no => (String(no || '').split('/')[1] || '').toUpperCase();
  const formatDari = no => ['SPM', 'SPPM'].indexOf(jenisDari(no)) >= 0 ? 'spm' : ['SPK', 'SPPP', 'SPKP', 'SPKU'].indexOf(jenisDari(no)) >= 0 ? 'bap' : '';
  function ringkas() { try { return (typeof RINGKASAN !== 'undefined' && RINGKASAN) || []; } catch (e) { return []; } }
  function kontrakDari(key) { return ringkas().find(g => g.key === key || g.keyAsli === key || (g.terkait || []).indexOf(key) >= 0) || null; }
  function entriDari(g) {
    const T = new Set([g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean));
    let L = []; try { L = (typeof PROG !== 'undefined' && PROG.data) || []; } catch (e) { }
    return L.filter(e => T.has(e.noKontrak)).slice().sort((a, b) => N(a.tagihanKe) - N(b.tagihanKe) || String(a.tanggal || '').localeCompare(String(b.tanggal || '')));
  }
  const noBAP = no => String(no || '').replace(/\/(BAPM|BAPA|BAPP)\//, '/BAP/');
  function slotTermin(L, sel, kap) {   // → { slot: [{ e[], tanggal, nomorBA, nomorBAP }], aktif }
    const ke = N(sel.tagihanKe) || (L.indexOf(sel) + 1);
    const awal = L.filter(e => e !== sel && (N(e.tagihanKe) || 0) < ke);
    if (ke <= kap) {
      const slot = []; for (let k = 1; k <= ke; k++) { const E1 = k === ke ? [sel] : awal.filter(e => N(e.tagihanKe) === k); const e0 = E1[E1.length - 1]; slot.push({ e: E1, tanggal: e0 ? (e0.baTerbit || e0.tanggal) : '', nomorBA: e0 ? e0.nomorBA : '', ke: k }); }
      return { slot, aktif: ke, gabung: false };
    }
    const lalu = awal[awal.length - 1];
    return { slot: [{ e: awal, tanggal: lalu ? (lalu.baTerbit || lalu.tanggal) : '', nomorBA: lalu ? lalu.nomorBA : '', ke: 1 }, { e: [sel], tanggal: sel.baTerbit || sel.tanggal, nomorBA: sel.nomorBA, ke: 2 }], aktif: 2, gabung: true };
  }
  function vendorDari(g) {
    let p = {}; try { p = (window.profilVendor && window.profilVendor(g.idVendor, g.namaVendor)) || {}; } catch (e) { }
    const m = window.mp292VendorMaster(g.idVendor, g.namaVendor) || {};
    return { nama: g.namaVendor || '', direktur: p.nama || m.pimpinan || '', jabatan: p.jabatan || m.jabatan || 'Direktur', alamat: p.alamat || m.alamat || '', npwp: p.npwp || m.npwp || '', email: p.email || m.email || '', telp: p.telp || m.telp || '' };
  }
  function regDari(g) { try { return ((typeof REG !== 'undefined' && REG.data) || []).find(r => r.noKontrak === g.key) || null; } catch (e) { return null; } }

  /* ---------- Master SPM (SPM / SPPM) ---------- */
  function isiSPM(g, sel) {
    const L = entriDari(g), T = slotTermin(L, sel, 4), V = vendorDari(g), r = regDari(g) || {};
    const items = (g.items || []).map((it, i) => ({ it, i, id: ID(g, it, i), vol: volItem(it), harga: hargaItem(it) })).filter(x => x.vol || x.harga);
    if (items.length > 100) throw new Error('Format baku Master SPM memuat 100 item; kontrak ini ' + items.length + ' item.');
    const no = String(g.key).split('/'), INPUT = {}, ITEM = {}, BAPM = {}, BAP = {};
    Object.assign(INPUT, { B23: V.direktur, B24: V.nama, B25: V.alamat || '-', B26: V.npwp || '-', B30: V.email, B32: no[0] || '', B33: no[5] || '', B34: no[6] || '', B35: g.key,
      B36: serial(g.tglMulai || r.tglKontrak), B37: serial(g.tglSelesai || r.tglSelesai), B48: T.slot.length, B49: T.aktif });
    const top = /(\d+)/.exec(String(r.top || g.top || '')); if (top) INPUT.B43 = Number(top[1]);
    for (let k = 0; k < 4; k++) {
      const s = T.slot[k], baris = 55 + k;
      INPUT['B' + baris] = s ? serial(s.tanggal) : null;
      if (s && s.nomorBA) { INPUT['C' + baris] = s.nomorBA; INPUT['D' + baris] = noBAP(s.nomorBA); }
    }
    items.forEach((x, n) => {
      const b = 4 + n, it = x.it;
      ITEM['B' + b] = String(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || ''); ITEM['C' + b] = String(it.satuan || it.sat || ''); ITEM['D' + b] = x.vol; ITEM['E' + b] = x.harga;
      'GHIJ'.split('').forEach((k, s) => { const sl = T.slot[s]; ITEM[k + b] = sl ? Math.round(sl.e.reduce((a, e) => a + N((e.items || {})[x.id]), 0) * 1000) / 1000 : null; });
    });
    BAPM.O1 = T.aktif; BAP.N1 = T.aktif;
    return { jenis: 'spm', tulisan: { INPUT, ITEM, BAPM, BAP }, ringkas: { item: items.length, termin: T.aktif, gabung: T.gabung } };
  }

  /* ---------- BAP format (SPK / SPPP / SPKP) ---------- */
  function isiBAP(g, sel) {
    const L = entriDari(g), T = slotTermin(L, sel, 6), V = vendorDari(g), r = regDari(g) || {};
    const semua = (g.items || []).map((it, i) => ({ it, i, id: ID(g, it, i), vol: volItem(it), harga: hargaItem(it), ur: String(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || '').trim() }));
    const nama = (semua.find(x => !x.vol && !x.harga && x.ur) || {}).ur || String(r.namaPekerjaan || r.uraian || '');
    const baris = []; let huruf = 0, nomor = 0, judulSblm = false, lewatNama = false;
    semua.forEach(x => {
      if (!x.vol && !x.harga) {
        if (!x.ur) return;
        if (!lewatNama && x.ur === nama) { lewatNama = true; return; }   // judul pertama = nama pekerjaan (DATA!B6 / lamp1 C13)
        baris.push(judulSblm ? { C: x.ur } : { B: String.fromCharCode(65 + (huruf++ % 26)), C: x.ur }); judulSblm = true; nomor = 0; return;
      }
      judulSblm = false; baris.push({ B: ++nomor, D: x.ur, H: x.vol, I: String(x.it.satuan || x.it.sat || ''), J: x.harga, x });
    });
    if (baris.length > 25) throw new Error('Format baku BAP (lamp1/rincian) memuat 25 baris; kontrak ini ' + baris.length + ' baris (item + judul).');
    const no = String(g.key), DATA = {}, lamp1 = {}, REKAP = {}, rincian = {}, BAPP = {}, BAP1 = {};
    Object.assign(DATA, { B4: no, B5: serial(g.tglMulai || r.tglKontrak), B6: nama || ('Pekerjaan ' + jenisDari(no)), B8: serial(g.tglMulai || r.tglKontrak), B9: serial(g.tglSelesai || r.tglSelesai),
      B22: V.direktur, B23: V.jabatan, B24: V.nama, B28: T.aktif, B73: V.nama, B75: V.nama, B76: V.alamat || '-', B77: V.npwp || '-', B78: V.telp, B79: V.email, B82: V.nama, B84: V.alamat, B85: V.npwp });
    for (let k = 0; k < 6; k++) { const s = T.slot[k]; DATA['B' + (99 + k)] = s ? serial(s.tanggal) : null; }
    const akt = T.slot[T.aktif - 1];
    if (akt && akt.nomorBA) {   // nomor BA mengikuti BK sebenarnya
      const nb = akt.nomorBA, pola = String(T.aktif).padStart(2, '0') + '/';
      DATA.B30 = nb.replace(/\/(BAPM|BAPA|BAP)\//, '/BAPP/'); DATA.B31 = noBAP(nb); DATA.B32 = nb.replace(/\/(BAPM|BAPA|BAPP|BAP)\//, '/BAPR/'); DATA.B33 = nb.replace(/\/(BAPM|BAPA|BAPP|BAP)\//, '/BAST/');
      if (T.gabung || !String(DATA.B30).startsWith(pola)) { BAPP.B10 = DATA.B30; BAP1.C11 = DATA.B31; }
    }
    lamp1.C14 = nama ? nama + ' meliputi;' : null;
    // rumus per baris mengikuti rumus baku template (baris judul / baris item), karena posisi judul di template contoh tetap
    for (let n = 0; n < 25; n++) {
      const rl = 15 + n, rr = 13 + n, b = baris[n];
      ['B', 'C', 'D', 'H', 'I', 'J'].forEach(k => { lamp1[k + rl] = b && b[k] !== undefined ? b[k] : null; });
      lamp1['K' + rl] = b && b.x ? { f: `H${rl}*J${rl}` } : null;
      const R = {}; 'BCDNOPQRSTUVWX'.split('').forEach(k => { R[k] = null; });
      if (b && b.x) Object.assign(R, { B: { f: `lamp1!B${rl}` }, D: { f: `lamp1!D${rl}` }, N: { f: `lamp1!H${rl}` }, O: { f: `lamp1!I${rl}` }, P: { f: `lamp1!J${rl}` }, Q: { f: `P${rr}*N${rr}` }, R: { f: `IFERROR(Q${rr}/$Q$38,0)` },
        S: { f: `IF($AL$5<=1,0,SUM(OFFSET($AL${rr},0,0,1,$AL$5-1)))` }, T: { f: `IFERROR(S${rr}/N${rr}*R${rr},0)` }, U: { f: `IFERROR(INDEX($AL${rr}:$AQ${rr},$AL$5),0)` }, V: { f: `IFERROR(U${rr}/N${rr}*R${rr},0)` }, W: { f: `S${rr}+U${rr}` }, X: { f: `T${rr}+V${rr}` } });
      else if (b) Object.assign(R, { B: { f: `lamp1!B${rl}` }, C: { f: `lamp1!C${rl}` } });
      Object.keys(R).forEach(k => { rincian[k + rr] = R[k]; });
      'JKLMNO'.split('').forEach((k, s) => { const sl = T.slot[s]; REKAP[k + (rl - 10)] = b && b.x && sl ? Math.round(sl.e.reduce((a, e) => a + N((e.items || {})[b.x.id]), 0) * 1000) / 1000 : 0; });
    }
    rincian.AL5 = T.aktif; BAPP.T8 = T.aktif; BAP1.T9 = T.aktif;
    return { jenis: 'bap', tulisan: { DATA, lamp1, 'REKAP PROGRES': REKAP, 'rincian ': rincian, BAPP, 'BAP  1': BAP1 }, ringkas: { item: baris.filter(b => b.x).length, termin: T.aktif, gabung: T.gabung } };
  }
  window.mp292Isian = (key, progresId) => {
    const g = kontrakDari(key); if (!g) throw new Error('Kontrak ' + key + ' tidak ditemukan.');
    const sel = entriDari(g).find(e => e.id === progresId); if (!sel) throw new Error('BK tidak ditemukan.');
    const f = formatDari(g.key); if (!f) throw new Error('Format baku tersedia untuk SPM/SPPM (Master SPM) dan SPK/SPPP/SPKP (BAP format); kontrak ini ' + jenisDari(g.key) + '.');
    return f === 'spm' ? isiSPM(g, sel) : isiBAP(g, sel);
  };

  /* ======================= A4. dialog di Form Input Progres ======================= */
  const S = { key: '' };
  function tutup() { const w = $('mp292Lapis'); if (w) w.remove(); }
  window.mp292Tutup = tutup;
  window.mp292Buka = async () => {
    let g = null; try { g = typeof FP !== 'undefined' && FP.g ? FP.g : null; } catch (e) { }
    if (!g) { pesan('Pilih kontrak di Form Input Progres terlebih dahulu.', 'err'); return; }
    const f = formatDari(g.key);
    if (!f) { pesan('Format Excel baku tersedia untuk SPM/SPPM dan SPK/SPPP/SPKP; kontrak ini ' + jenisDari(g.key) + '.', 'err'); return; }
    await muatMT();
    S.key = g.key; const L = entriDari(g);
    tutup();
    const w = document.createElement('div'); w.id = 'mp292Lapis'; w.className = 'mp291-lapis';
    w.innerHTML = `<section class="mp291-dlg mp292-dlg" role="dialog" aria-modal="true" aria-labelledby="mp292Jdl"><header><b id="mp292Jdl"><i class="fas fa-file-excel me-2"></i>Excel Format Baku · ${f === 'spm' ? 'Master SPM (SPM · BAPM · BAP)' : 'BAP format (rincian · BAPP · BAP)'}</b><button type="button" class="btn-close" aria-label="Tutup" onclick="mp292Tutup()"></button></header>
      <p class="mp291-ket"><b>${E(g.key)}</b> · ${E(g.namaVendor || '')}. Pilih BK yang ditagihkan. Berkas memakai format baku apa adanya; aplikasi hanya mengisi data kontrak, vendor (alamat & NPWP dari Master Data), item dan volume termin. Buka di Excel lalu klik <b>Enable Editing</b> agar rumus dihitung.</p>
      <div class="mp291-isi">${L.length ? `<table class="table table-sm mp291-tb"><thead><tr><th></th><th>Ke</th><th>No. BA</th><th>Periode</th><th class="text-end">Nilai</th></tr></thead><tbody>${L.map((e, i) => `<tr><td><input type="radio" name="mp292Bk" value="${E(e.id)}" ${i === L.length - 1 ? 'checked' : ''} aria-label="Pilih BK ${E(e.nomorBA || '')}"></td><td>${E(e.tagihanKe || '')}</td><td class="mp291-no">${E(e.nomorBA || '')}</td><td>${E(e.periode || '')}</td><td class="text-end">${Math.round(N(e.nilai)).toLocaleString('id-ID')}</td></tr>`).join('')}</tbody></table>` : '<div class="alert alert-warning m-0">Kontrak ini belum punya BK (Input Progres). Simpan progres terlebih dahulu.</div>'}</div>
      <footer><button type="button" class="btn btn-sm btn-light border" onclick="mp292Tutup()">Tutup</button><button type="button" id="mp292Unduh" class="btn btn-sm btn-success" ${L.length ? '' : 'disabled'} onclick="mp292Unduh()"><i class="fas fa-file-excel me-1"></i>Unduh Excel</button></footer></section>`;
    w.addEventListener('mousedown', ev => { if (ev.target === w) tutup(); });
    w.addEventListener('keydown', ev => { if (ev.key === 'Escape') tutup(); });
    document.body.appendChild(w);
  };
  window.mp292Unduh = async () => {
    const r = document.querySelector('input[name="mp292Bk"]:checked'); if (!r) return;
    const b = $('mp292Unduh'); if (b) { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Menyusun…'; }
    try {
      await muatMT();
      const I = window.mp292Isian(S.key, r.value), bytes = await bangun(I.jenis, I.tulisan);
      const e = entriDari(kontrakDari(S.key)).find(x => x.id === r.value) || {};
      const nama = (I.jenis === 'spm' ? 'Master_SPM_' : 'BAP_format_') + String(e.nomorBA || S.key).replace(/[\\/:*?"<>|]+/g, '_') + '.xlsx';
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = nama;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      pesan('Excel format baku diunduh: ' + I.ringkas.item + ' item · termin ' + I.ringkas.termin + (I.ringkas.gabung ? ' (termin sebelumnya digabung)' : '') + '.', 'ok');
      tutup();
    } catch (err) { pesan(err.message, 'err'); if (b) { b.disabled = false; b.innerHTML = '<i class="fas fa-file-excel me-1"></i>Unduh Excel'; } }
  };

  function pasang() {
    if ($('mp292Btn')) return;
    const tab = $('tab-form-progres'); if (!tab) return;
    const acuan = tab.querySelector('#fp_noKontrak') || tab.querySelector('.card-header, h5, h4');
    if (!acuan) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'mp292Btn'; b.className = 'btn btn-sm btn-outline-success mp292-btn';
    b.innerHTML = '<i class="fas fa-file-excel me-1"></i>Excel Format Baku'; b.title = 'Unduh tagihan dalam format Excel baku (Master SPM / BAP format) untuk BK kontrak ini';
    b.onclick = () => window.mp292Buka();
    const wadah = document.createElement('div'); wadah.className = 'mp292-wadah'; wadah.appendChild(b);
    const kol = acuan.closest('.col-md-6, .col-md-4, .col-md-3, .col-12, .row') || acuan.parentNode;
    kol.insertAdjacentElement('afterend', wadah);
  }
  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(() => { try { pasang(); } catch (e) { } }, 300); };
  const awasi = () => { if (!document.body) return; pasang(); new MutationObserver(m => { if (!$('mp292Btn') && m.some(x => x.addedNodes && x.addedNodes.length)) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
  setTimeout(() => { try { if (typeof REG !== 'undefined' && REG.sesi) muatMT(); } catch (e) { } }, 3000);
  window.mp292MuatMaster = muatMT;
})();
