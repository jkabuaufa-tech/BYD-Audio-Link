/* MP291 — CHEKLIS WBS TAGIHAN (Register Kontrak) · unduh Excel format "CHEKLIS WBS TAGIHAN BULAN …" untuk permintaan WBS ke Adkon
 *  Hanya kontrak yang WBS-nya belum ada / belum lengkap: ada item bernilai (volume/harga) tanpa WBS; baris judul tidak dihitung. Kontrak yang seluruh itemnya sudah ber-WBS tidak ikut.
 *  Tata letak sama dengan berkas acuan: Sheet1, judul kolom di B4:L4 (No. · WBS · NAMA VENDOR · No. KONTRAK · ID · URAIAN · VOLUME · HARSAT · JUMLAH ·
 *  TOTAL KONTRAK · KETERANGAN), satu blok per kontrak + 1 baris kosong bergaris, JUMLAH = HARSAT×VOLUME, TOTAL KONTRAK = SUM(JUMLAH blok),
 *  baris TOTAL = SUM(TOTAL KONTRAK); lebar kolom, huruf, garis & format #,##0 sama. Berkas .xlsx ditulis langsung (tanpa pustaka tambahan),
 *  rumus disertai nilai tersimpan agar langsung tampil. Tanpa perubahan server & data. */
(function () {
  'use strict';
  if (window.__MP291__) return; window.__MP291__ = true;
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };

  /* ---------- 1. data: kontrak tanpa / kurang WBS ---------- */
  function itemDari(it, reg) {
    const kode = String((reg ? it.kode : (it.kodeItem || it.itemService || it.kode)) || '').trim();
    const uraian = String((reg ? it.uraian : (it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian)) || '').trim();
    const vol = reg ? N(it.vol) : N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak);
    const harga = reg ? N(it.harga) : N(it.hargaSatuanEfektif ?? it.hargaSatuan);
    return { kode, uraian, vol: Math.round(vol * 1000) / 1000, harga: Math.round(harga), wbs: String(it.wbs || '').trim(), judul: !vol && !harga };
  }
  const urut = k => { const m = /^(\d+)\/([A-Z]+)\/.*\/(\d{4})$/.exec(String(k)); return m ? Number(m[3]) * 100000 + Number(m[1]) : 9e9; };
  function daftar() {
    const rows = typeof window.semuaKontrak214 === 'function' ? window.semuaKontrak214() : [];
    return rows.filter(x => x.k).map(x => {
      const reg = x.t === 'reg', src = reg ? (x.r.items || []) : ((x.g && x.g.items) || []);
      const items = src.map(it => itemDari(it, reg)).filter(i => i.kode || i.uraian || i.vol || i.harga);
      const isi = items.filter(i => !i.judul), ada = isi.filter(i => i.wbs).length;
      return { key: x.key, vendor: x.vendor || '', items, ada, tot: isi.length,
        ket: ada ? 'WBS belum lengkap (' + ada + '/' + isi.length + ')' : 'Belum Ada WBS', perlu: isi.length ? ada < isi.length : (x.k.kurang || []).indexOf('WBS') >= 0 };
    }).filter(k => k.perlu).sort((a, b) => urut(a.key) - urut(b.key) || String(a.key).localeCompare(String(b.key)));
  }
  window.mp291Daftar = daftar;

  /* ---------- 2. penulis .xlsx bergaya (OOXML + ZIP tanpa kompresi) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {   // files: [[nama, teks]] → Uint8Array (metode simpan)
    const enc = new TextEncoder(), lokal = [], pusat = []; let off = 0;
    const u16 = v => [v & 255, v >>> 8 & 255], u32 = v => [v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255];
    files.forEach(([nama, teks]) => {
      const n = enc.encode(nama), d = enc.encode(teks), c = crc32(d);
      const h = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(n.length), u16(0));
      lokal.push(Uint8Array.from(h), n, d);
      pusat.push(Uint8Array.from([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(n.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), n);
      off += h.length + n.length + d.length;
    });
    const besar = pusat.reduce((a, x) => a + x.length, 0);
    const akhir = Uint8Array.from([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(besar), u32(off), u16(0)));
    const semua = lokal.concat(pusat, [akhir]), out = new Uint8Array(semua.reduce((a, x) => a + x.length, 0)); let p = 0;
    semua.forEach(x => { out.set(x, p); p += x.length; });
    return out;
  }
  // gaya (indeks cellXfs): 1 judul · 2 No · 3 teks Aptos · 4 teks Calibri · 5 volume · 6 rupiah · 7 keterangan · 8 uraian judul (wrap) · 9 "TOTAL" · 10 nilai TOTAL
  const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="3"><font><sz val="11"/><color theme="1"/><name val="Aptos Narrow"/><family val="2"/><scheme val="minor"/></font>' +
    '<font><b/><sz val="11"/><color theme="1"/><name val="Aptos Narrow"/><family val="2"/><scheme val="minor"/></font>' +
    '<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color indexed="64"/></left><right style="thin"><color indexed="64"/></right><top style="thin"><color indexed="64"/></top><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border>' +
    '<border><left/><right/><top style="thin"><color indexed="64"/></top><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="11">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="3" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="3" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const KOLOM = 'BCDEFGHIJKL', GAYA = { B: 2, C: 3, D: 4, E: 4, F: 4, G: 4, H: 5, I: 6, J: 6, K: 6, L: 7 };
  const LEBAR = { C: 16.6640625, D: 32.44140625, E: 39.5546875, F: 11.6640625, G: 40.88671875, H: 8.77734375, I: 16.6640625, J: 16.77734375, K: 15.88671875, L: 18.33203125 };
  const angkaKode = v => /^\d{1,15}$/.test(v) && !/^0\d/.test(v);
  function sel(ref, isi, s) {   // isi: {n} angka · {t} teks · {f, v} rumus · null kosong
    if (!isi) return `<c r="${ref}" s="${s}"/>`;
    if (isi.f) return `<c r="${ref}" s="${s}"><f>${E(isi.f)}</f><v>${isi.v}</v></c>`;
    if (isi.n !== undefined) return `<c r="${ref}" s="${s}"><v>${isi.n}</v></c>`;
    return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${E(isi.t)}</t></is></c>`;
  }
  function lembar(D) {
    const baris = [], tinggi = {};
    const tulis = (r, isi, gaya) => baris.push(`<row r="${r}"${tinggi[r] ? ` ht="${tinggi[r]}" customHeight="1"` : ''}>` + KOLOM.split('').map(k => (isi[k] === undefined && !gaya) ? '' : sel(k + r, isi[k] || null, (gaya || GAYA)[k] !== undefined ? (gaya || GAYA)[k] : GAYA[k])).join('') + '</row>');
    const JUDUL = { B: 'No.', C: 'WBS', D: 'NAMA VENDOR', E: 'No. KONTRAK', F: 'ID ', G: 'URAIAN ', H: 'VOLUME ', I: 'HARSAT', J: 'JUMLAH', K: 'TOTAL KONTRAK ', L: 'KETERANGAN ' };
    const g1 = {}; KOLOM.split('').forEach(k => { g1[k] = 1; });
    tulis(4, Object.fromEntries(Object.entries(JUDUL).map(([k, v]) => [k, { t: v }])), g1);
    let r = 5, no = 0, total = 0; const kRef = [];
    D.forEach(k => {
      no++; const awal = r, L = k.items.length ? k.items : [{ kode: '', uraian: '', vol: 0, harga: 0, wbs: '', judul: true }];
      const nilaiRows = L.map((it, i) => ({ it, r: awal + i })).filter(x => !x.it.judul), sum = nilaiRows.reduce((a, x) => a + x.it.vol * x.it.harga, 0);
      const pertama = awal, akhir = awal + L.length - 1;   // TOTAL KONTRAK di baris pertama blok (sejajar No.), SUM seluruh baris item blok
      L.forEach((it, i) => {
        const isi = {};
        if (i === 0) { isi.B = { n: no }; isi.D = { t: k.vendor }; isi.E = { t: k.key }; isi.L = { t: k.ket }; }
        if (it.wbs) isi.C = { t: it.wbs };
        if (it.kode) isi.F = angkaKode(it.kode) ? { n: Number(it.kode) } : { t: it.kode };
        if (it.uraian) isi.G = { t: it.uraian };
        if (!it.judul) { isi.H = { n: it.vol }; isi.I = { n: it.harga }; isi.J = { f: `I${r}*H${r}`, v: Math.round(it.vol * it.harga * 1000) / 1000 }; }
        if (r === pertama) isi.K = { f: pertama === akhir ? `SUM(J${pertama})` : `SUM(J${pertama}:J${akhir})`, v: Math.round(sum * 1000) / 1000 };
        const g = Object.assign({}, GAYA); if (it.judul) g.G = 8; if (!it.judul) g.I = 6; else g.I = 4;
        if (/\n/.test(it.uraian)) tinggi[r] = 28.8;
        tulis(r, isi, g); r++;
      });
      kRef.push(pertama); total += sum;
      tulis(r, {}, GAYA); r++;   // baris kosong bergaris antar-kontrak
    });
    const akhirData = r - 1; r++;
    baris.push(`<row r="${r}"><c r="J${r}" s="9" t="inlineStr"><is><t xml:space="preserve">TOTAL </t></is></c><c r="K${r}" s="10"><f>SUM(K5:K${akhirData})</f><v>${Math.round(total * 1000) / 1000}</v></c></row>`);
    const cols = '<cols>' + Object.entries(LEBAR).map(([k, w]) => { const i = k.charCodeAt(0) - 64; return `<col min="${i}" max="${i}" width="${w}" customWidth="1"/>`; }).join('') + '</cols>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<dimension ref="B4:L${r}"/><sheetViews><sheetView tabSelected="1" zoomScale="74" zoomScaleNormal="74" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="14.4"/>` +
      cols + '<sheetData>' + baris.join('') + '</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
  }
  function buatXlsx(D) {
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', STYLES],
      ['xl/worksheets/sheet1.xml', lembar(D)]
    ]);
  }
  window.mp291Xlsx = buatXlsx;

  /* ---------- 3. dialog pilih kontrak & unduh ---------- */
  const S = { D: [], pilih: new Set() };
  window.MP291 = S;
  const rp = v => Math.round(N(v)).toLocaleString('id-ID');
  function tutup() { const w = $('mp291Lapis'); if (w) w.remove(); }
  function gambar() {
    const w = $('mp291Lapis'); if (!w) return;
    const D = S.D, n = D.filter(k => S.pilih.has(k.key)).length;
    w.querySelector('.mp291-isi').innerHTML = D.length ? `<table class="table table-sm mp291-tb"><thead><tr><th><input type="checkbox" aria-label="Pilih semua" ${n === D.length ? 'checked' : ''} onchange="mp291Semua(this.checked)"></th><th>No. Kontrak</th><th>Vendor</th><th class="text-end">Item</th><th class="text-end">Nilai</th><th>Keterangan</th></tr></thead><tbody>` +
      D.map(k => `<tr><td><input type="checkbox" data-k="${E(k.key)}" ${S.pilih.has(k.key) ? 'checked' : ''} onchange="mp291Pilih(this.dataset.k, this.checked)" aria-label="Pilih ${E(k.key)}"></td><td class="mp291-no">${E(k.key)}</td><td>${E(k.vendor)}</td><td class="text-end">${k.tot}</td><td class="text-end">${rp(k.items.reduce((a, i) => a + (i.judul ? 0 : i.vol * i.harga), 0))}</td><td>${E(k.ket)}</td></tr>`).join('') + '</tbody></table>'
      : '<div class="alert alert-success m-0"><i class="fas fa-check me-1"></i>Semua kontrak sudah ber-WBS — tidak ada yang perlu dimintakan ke Adkon.</div>';
    const b = $('mp291Unduh'); if (b) { b.disabled = !n; b.innerHTML = `<i class="fas fa-file-excel me-1"></i>Unduh Excel (${n} kontrak)`; }
  }
  window.mp291Semua = v => { S.pilih = new Set(v ? S.D.map(k => k.key) : []); gambar(); };
  window.mp291Pilih = (k, v) => { if (v) S.pilih.add(k); else S.pilih.delete(k); gambar(); };
  window.mp291Buka = () => {
    try { S.D = daftar(); } catch (e) { pesan('Daftar kontrak belum dapat dibaca: ' + e.message, 'err'); return; }
    S.pilih = new Set(S.D.map(k => k.key));
    tutup();
    const w = document.createElement('div'); w.id = 'mp291Lapis'; w.className = 'mp291-lapis';
    w.innerHTML = `<section class="mp291-dlg" role="dialog" aria-modal="true" aria-labelledby="mp291Jdl"><header><b id="mp291Jdl"><i class="fas fa-file-excel me-2"></i>Cheklis WBS Tagihan</b><button type="button" class="btn-close" aria-label="Tutup" onclick="mp291Tutup()"></button></header>
      <p class="mp291-ket">Kontrak yang WBS-nya belum ada / belum lengkap. Kontrak yang seluruh itemnya sudah ber-WBS tidak dicantumkan. Unduh lalu kirim ke Adkon untuk dimintakan WBS.</p>
      <div class="mp291-isi"></div>
      <footer><button type="button" class="btn btn-sm btn-light border" onclick="mp291Tutup()">Tutup</button><button type="button" id="mp291Unduh" class="btn btn-sm btn-success" onclick="mp291Unduh()"></button></footer></section>`;
    w.addEventListener('mousedown', ev => { if (ev.target === w) tutup(); });
    w.addEventListener('keydown', ev => { if (ev.key === 'Escape') tutup(); });
    document.body.appendChild(w); gambar();
    const b = w.querySelector('.btn-close'); if (b) b.focus();
  };
  window.mp291Tutup = tutup;
  window.mp291NamaBerkas = (d) => { d = d || new Date(); return 'CHEKLIS_WBS_TAGIHAN_BULAN_' + BULAN[d.getMonth()] + '.xlsx'; };
  window.mp291Unduh = () => {
    const D = S.D.filter(k => S.pilih.has(k.key)); if (!D.length) return;
    const blob = new Blob([buatXlsx(D)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = window.mp291NamaBerkas();
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    pesan('Cheklis WBS diunduh: ' + D.length + ' kontrak.', 'ok');
  };

  /* ---------- 4. tombol di Register Kontrak ---------- */
  function pasang() {
    if ($('mp291Btn')) return;
    const acuan = $('mp281BtnAlur') || $('mp272BtnForm') || $('mp2622Btn'); if (!acuan) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'mp291Btn'; b.className = 'btn btn-sm btn-outline-success mp291-btn';
    b.innerHTML = '<i class="fas fa-file-excel me-1"></i>Cheklis WBS'; b.title = 'Unduh Excel kontrak yang belum ber-WBS untuk dimintakan ke Adkon';
    b.onclick = () => window.mp291Buka();
    acuan.insertAdjacentElement('beforebegin', b);
  }
  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(() => { try { pasang(); } catch (e) { } }, 250); };
  const awasi = () => { if (!document.body) return; pasang(); new MutationObserver(m => { if (!$('mp291Btn') && m.some(x => x.addedNodes && x.addedNodes.length)) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();
