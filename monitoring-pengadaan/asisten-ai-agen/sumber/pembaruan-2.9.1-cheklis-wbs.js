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
      const ri = x.t === 'reg' ? (x.r.items || []) : [], gi = (x.g && x.g.items) || [];
      const reg = x.t === 'reg' && ri.length >= gi.length, src = reg ? ri : gi;   // seluruh item kontrak / PO: sumber yang itemnya terlengkap (Register atau Master)
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
  /* Bagian berkas disalin dari berkas acuan "CHEKLIS WBS TAGIHAN BULAN OKTOBER.xlsx" (Excel 365): styles.xml & tema Office apa adanya,
   * sehingga indeks gaya, huruf (Aptos Narrow / Calibri 11), garis, format #,##0 & tampilan sama persis. Indeks cellXfs acuan:
   * 1 garis Aptos · 2 garis Aptos rata tengah (No., Keterangan) · 3 judul tebal · 4 garis Calibri · 5 Calibri #,##0 · 6 Calibri rata tengah (Volume)
   * 7 rata tengah tanpa garis · 8 Calibri bungkus teks · 9 "TOTAL" tebal · 10 nilai TOTAL tebal #,##0 */
  const STYLES = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\r\n<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" mc:Ignorable=\"x14ac x16r2 xr\" xmlns:x14ac=\"http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac\" xmlns:x16r2=\"http://schemas.microsoft.com/office/spreadsheetml/2015/02/main\" xmlns:xr=\"http://schemas.microsoft.com/office/spreadsheetml/2014/revision\"><fonts count=\"3\" x14ac:knownFonts=\"1\"><font><sz val=\"11\"/><color theme=\"1\"/><name val=\"Aptos Narrow\"/><family val=\"2\"/><charset val=\"1\"/><scheme val=\"minor\"/></font><font><b/><sz val=\"11\"/><color theme=\"1\"/><name val=\"Aptos Narrow\"/><family val=\"2\"/><scheme val=\"minor\"/></font><font><sz val=\"11\"/><color rgb=\"FF000000\"/><name val=\"Calibri\"/><family val=\"2\"/></font></fonts><fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills><borders count=\"2\"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style=\"thin\"><color indexed=\"64\"/></left><right style=\"thin\"><color indexed=\"64\"/></right><top style=\"thin\"><color indexed=\"64\"/></top><bottom style=\"thin\"><color indexed=\"64\"/></bottom><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"11\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyBorder=\"1\"/><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyBorder=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\"/></xf><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\"/></xf><xf numFmtId=\"0\" fontId=\"2\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyBorder=\"1\"/><xf numFmtId=\"3\" fontId=\"2\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyNumberFormat=\"1\" applyFont=\"1\" applyBorder=\"1\"/><xf numFmtId=\"0\" fontId=\"2\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\"/></xf><xf numFmtId=\"0\" fontId=\"2\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyBorder=\"1\"/><xf numFmtId=\"3\" fontId=\"1\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyNumberFormat=\"1\" applyFont=\"1\" applyBorder=\"1\"/></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles><dxfs count=\"0\"/><tableStyles count=\"0\" defaultTableStyle=\"TableStyleMedium2\" defaultPivotStyle=\"PivotStyleLight16\"/><extLst><ext uri=\"{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}\" xmlns:x14=\"http://schemas.microsoft.com/office/spreadsheetml/2009/9/main\"><x14:slicerStyles defaultSlicerStyle=\"SlicerStyleLight1\"/></ext><ext uri=\"{9260A510-F301-46a8-8635-F512D64BE5F5}\" xmlns:x15=\"http://schemas.microsoft.com/office/spreadsheetml/2010/11/main\"><x15:timelineStyles defaultTimelineStyle=\"TimeSlicerStyleLight1\"/></ext></extLst></styleSheet>";
  const TEMA = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\r\n<a:theme xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" name=\"Office Theme\"><a:themeElements><a:clrScheme name=\"Office\"><a:dk1><a:sysClr val=\"windowText\" lastClr=\"000000\"/></a:dk1><a:lt1><a:sysClr val=\"window\" lastClr=\"FFFFFF\"/></a:lt1><a:dk2><a:srgbClr val=\"0E2841\"/></a:dk2><a:lt2><a:srgbClr val=\"E8E8E8\"/></a:lt2><a:accent1><a:srgbClr val=\"156082\"/></a:accent1><a:accent2><a:srgbClr val=\"E97132\"/></a:accent2><a:accent3><a:srgbClr val=\"196B24\"/></a:accent3><a:accent4><a:srgbClr val=\"0F9ED5\"/></a:accent4><a:accent5><a:srgbClr val=\"A02B93\"/></a:accent5><a:accent6><a:srgbClr val=\"4EA72E\"/></a:accent6><a:hlink><a:srgbClr val=\"467886\"/></a:hlink><a:folHlink><a:srgbClr val=\"96607D\"/></a:folHlink></a:clrScheme><a:fontScheme name=\"Office\"><a:majorFont><a:latin typeface=\"Aptos Display\" panose=\"02110004020202020204\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"游ゴシック Light\"/><a:font script=\"Hang\" typeface=\"맑은 고딕\"/><a:font script=\"Hans\" typeface=\"等线 Light\"/><a:font script=\"Hant\" typeface=\"新細明體\"/><a:font script=\"Arab\" typeface=\"Times New Roman\"/><a:font script=\"Hebr\" typeface=\"Times New Roman\"/><a:font script=\"Thai\" typeface=\"Tahoma\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"MoolBoran\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Times New Roman\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/><a:font script=\"Armn\" typeface=\"Arial\"/><a:font script=\"Bugi\" typeface=\"Leelawadee UI\"/><a:font script=\"Bopo\" typeface=\"Microsoft JhengHei\"/><a:font script=\"Java\" typeface=\"Javanese Text\"/><a:font script=\"Lisu\" typeface=\"Segoe UI\"/><a:font script=\"Mymr\" typeface=\"Myanmar Text\"/><a:font script=\"Nkoo\" typeface=\"Ebrima\"/><a:font script=\"Olck\" typeface=\"Nirmala UI\"/><a:font script=\"Osma\" typeface=\"Ebrima\"/><a:font script=\"Phag\" typeface=\"Phagspa\"/><a:font script=\"Syrn\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Syrj\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Syre\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Sora\" typeface=\"Nirmala UI\"/><a:font script=\"Tale\" typeface=\"Microsoft Tai Le\"/><a:font script=\"Talu\" typeface=\"Microsoft New Tai Lue\"/><a:font script=\"Tfng\" typeface=\"Ebrima\"/></a:majorFont><a:minorFont><a:latin typeface=\"Aptos Narrow\" panose=\"02110004020202020204\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"游ゴシック\"/><a:font script=\"Hang\" typeface=\"맑은 고딕\"/><a:font script=\"Hans\" typeface=\"等线\"/><a:font script=\"Hant\" typeface=\"新細明體\"/><a:font script=\"Arab\" typeface=\"Arial\"/><a:font script=\"Hebr\" typeface=\"Arial\"/><a:font script=\"Thai\" typeface=\"Tahoma\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"DaunPenh\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Arial\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/><a:font script=\"Armn\" typeface=\"Arial\"/><a:font script=\"Bugi\" typeface=\"Leelawadee UI\"/><a:font script=\"Bopo\" typeface=\"Microsoft JhengHei\"/><a:font script=\"Java\" typeface=\"Javanese Text\"/><a:font script=\"Lisu\" typeface=\"Segoe UI\"/><a:font script=\"Mymr\" typeface=\"Myanmar Text\"/><a:font script=\"Nkoo\" typeface=\"Ebrima\"/><a:font script=\"Olck\" typeface=\"Nirmala UI\"/><a:font script=\"Osma\" typeface=\"Ebrima\"/><a:font script=\"Phag\" typeface=\"Phagspa\"/><a:font script=\"Syrn\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Syrj\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Syre\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Sora\" typeface=\"Nirmala UI\"/><a:font script=\"Tale\" typeface=\"Microsoft Tai Le\"/><a:font script=\"Talu\" typeface=\"Microsoft New Tai Lue\"/><a:font script=\"Tfng\" typeface=\"Ebrima\"/></a:minorFont></a:fontScheme><a:fmtScheme name=\"Office\"><a:fillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:lumMod val=\"110000\"/><a:satMod val=\"105000\"/><a:tint val=\"67000\"/></a:schemeClr></a:gs><a:gs pos=\"50000\"><a:schemeClr val=\"phClr\"><a:lumMod val=\"105000\"/><a:satMod val=\"103000\"/><a:tint val=\"73000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:lumMod val=\"105000\"/><a:satMod val=\"109000\"/><a:tint val=\"81000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"5400000\" scaled=\"0\"/></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:satMod val=\"103000\"/><a:lumMod val=\"102000\"/><a:tint val=\"94000\"/></a:schemeClr></a:gs><a:gs pos=\"50000\"><a:schemeClr val=\"phClr\"><a:satMod val=\"110000\"/><a:lumMod val=\"100000\"/><a:shade val=\"100000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:lumMod val=\"99000\"/><a:satMod val=\"120000\"/><a:shade val=\"78000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"5400000\" scaled=\"0\"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w=\"12700\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/><a:miter lim=\"800000\"/></a:ln><a:ln w=\"19050\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/><a:miter lim=\"800000\"/></a:ln><a:ln w=\"25400\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/><a:miter lim=\"800000\"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"57150\" dist=\"19050\" dir=\"5400000\" algn=\"ctr\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"63000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:solidFill><a:schemeClr val=\"phClr\"><a:tint val=\"95000\"/><a:satMod val=\"170000\"/></a:schemeClr></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"93000\"/><a:satMod val=\"150000\"/><a:shade val=\"98000\"/><a:lumMod val=\"102000\"/></a:schemeClr></a:gs><a:gs pos=\"50000\"><a:schemeClr val=\"phClr\"><a:tint val=\"98000\"/><a:satMod val=\"130000\"/><a:shade val=\"90000\"/><a:lumMod val=\"103000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"63000\"/><a:satMod val=\"120000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"5400000\" scaled=\"0\"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults><a:lnDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"0\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"tx1\"/></a:fontRef></a:style></a:lnDef></a:objectDefaults><a:extraClrSchemeLst/><a:extLst><a:ext uri=\"{05A4C25C-085E-4340-85A3-A5531E510DB2}\"><thm15:themeFamily xmlns:thm15=\"http://schemas.microsoft.com/office/thememl/2012/main\" name=\"Office Theme\" id=\"{2E142A2C-CD16-42D6-873A-C26D2A0506FA}\" vid=\"{1BDDFF52-6CD6-40A5-AB3C-68EB2F1E4D0A}\"/></a:ext></a:extLst></a:theme>";
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac xr xr2 xr3" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2" xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3"';
  const COLS = '<cols><col min="3" max="3" width="16.6640625" bestFit="1" customWidth="1"/><col min="4" max="4" width="32.44140625" customWidth="1"/><col min="5" max="5" width="39.5546875" customWidth="1"/><col min="6" max="6" width="11.6640625" customWidth="1"/><col min="7" max="7" width="40.88671875" customWidth="1"/><col min="8" max="8" width="8.77734375" bestFit="1" customWidth="1"/><col min="9" max="9" width="16.6640625" customWidth="1"/><col min="10" max="10" width="16.77734375" customWidth="1"/><col min="11" max="11" width="15.88671875" customWidth="1"/><col min="12" max="12" width="18.33203125" customWidth="1"/></cols>';
  const KOLOM = 'BCDEFGHIJKL';
  const angkaKode = v => /^\d{1,15}$/.test(v) && !/^0\d/.test(v);
  const angka = v => String(Math.round(v * 1000) / 1000);
  function lembar(D, SS) {
    const idx = t => { t = String(t); if (!SS.m.has(t)) { SS.m.set(t, SS.L.length); SS.L.push(t); } SS.n++; return SS.m.get(t); };
    const sel = (ref, s, isi) => {   // isi: {t} teks · {n} angka · {f, v} rumus · undefined kosong
      if (!isi) return `<c r="${ref}" s="${s}"/>`;
      if (isi.f) return `<c r="${ref}" s="${s}"><f>${E(isi.f)}</f><v>${isi.v}</v></c>`;
      if (isi.n !== undefined) return `<c r="${ref}" s="${s}"><v>${isi.n}</v></c>`;
      return `<c r="${ref}" s="${s}" t="s"><v>${idx(isi.t)}</v></c>`;
    };
    const baris = [];
    const tulis = (r, isi, gaya, ht) => baris.push(`<row r="${r}" spans="2:12"${ht ? ` ht="${ht}" customHeight="1"` : ''} x14ac:dyDescent="0.3">` + KOLOM.split('').filter(k => gaya[k] !== undefined).map(k => sel(k + r, gaya[k], isi[k])).join('') + '</row>');
    const KOSONG = { B: 2, C: 1, D: 4, E: 4, F: 4, G: 4, H: 6, I: 5, J: 5, K: 5, L: 2 };
    const JUDUL = { B: 'No.', C: 'WBS', D: 'NAMA VENDOR', E: 'No. KONTRAK', F: 'ID ', G: 'URAIAN ', H: 'VOLUME ', I: 'HARSAT', J: 'JUMLAH', K: 'TOTAL KONTRAK ', L: 'KETERANGAN ' };
    tulis(4, Object.fromEntries(Object.entries(JUDUL).map(([k, v]) => [k, { t: v }])), Object.fromEntries(KOLOM.split('').map(k => [k, 3])));
    let r = 5, no = 0, total = 0;
    D.forEach(k => {
      no++; const awal = r, L = k.items.length ? k.items : [{ kode: '', uraian: '', vol: 0, harga: 0, wbs: '', judul: true }];
      const akhir = awal + L.length - 1, sum = L.reduce((a, it) => a + (it.judul ? 0 : it.vol * it.harga), 0);
      L.forEach((it, i) => {
        const isi = {}, pertama = i === 0;
        if (pertama) { isi.B = { n: no }; isi.D = { t: k.vendor }; isi.E = { t: k.key }; isi.L = { t: k.ket }; isi.K = { f: awal === akhir ? `SUM(J${awal})` : `SUM(J${awal}:J${akhir})`, v: angka(sum) }; }
        if (it.wbs) isi.C = { t: it.wbs };
        if (it.kode) isi.F = angkaKode(it.kode) ? { n: Number(it.kode) } : { t: it.kode };
        if (it.uraian) isi.G = { t: it.uraian };
        if (!it.judul) { isi.H = { n: angka(it.vol) }; isi.I = { n: angka(it.harga) }; isi.J = { f: `I${r}*H${r}`, v: angka(it.vol * it.harga) }; }
        const bungkus = /\n/.test(it.uraian || '');
        tulis(r, isi, { B: 2, C: 1, D: pertama ? 4 : 1, E: pertama ? 4 : 1, F: 4, G: bungkus ? 8 : 4, H: 6, I: it.judul ? 4 : 5, J: 5, K: 5, L: 2 }, bungkus ? '28.8' : '');
        r++;
      });
      total += sum;
      tulis(r, {}, KOSONG); r++;   // baris kosong bergaris antar-kontrak
    });
    const akhirData = r - 1; r++;
    baris.push(`<row r="${r}" spans="2:12" x14ac:dyDescent="0.3"><c r="H${r}" s="7"/>${sel('J' + r, 9, { t: 'TOTAL ' })}${sel('K' + r, 10, { f: `SUM(K5:K${akhirData})`, v: angka(total) })}</row>`);
    return XML + `<worksheet ${NS} xr:uid="{F2F57F4B-F652-4E11-A719-2BCCE789372A}"><dimension ref="B4:L${r}"/><sheetViews><sheetView tabSelected="1" zoomScale="74" workbookViewId="0"><selection activeCell="B5" sqref="B5"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.4" x14ac:dyDescent="0.3"/>` +
      COLS + '<sheetData>' + baris.join('') + '</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
  }
  function buatXlsx(D) {
    const SS = { L: [], m: new Map(), n: 0 }, sheet = lembar(D, SS), kini = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const shared = XML + `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${SS.n}" uniqueCount="${SS.L.length}">` + SS.L.map(t => `<si><t${/^\s|\s$|\n/.test(t) ? ' xml:space="preserve"' : ''}>${E(t)}</t></si>`).join('') + '</sst>';
    return zip([
      ['[Content_Types].xml', XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'],
      ['_rels/.rels', XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['docProps/app.xml', XML + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Sheet1</vt:lpstr></vt:vector></TitlesOfParts><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>'],
      ['docProps/core.xml', XML + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Monitoring Pengadaan</dc:creator><cp:lastModifiedBy>Monitoring Pengadaan</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${kini}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${kini}</dcterms:modified></cp:coreProperties>`],
      ['xl/workbook.xml', XML + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="30527"/><workbookPr defaultThemeVersion="202300"/><bookViews><workbookView xWindow="-108" yWindow="-108" windowWidth="23256" windowHeight="13896"/></bookViews><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'],
      ['xl/_rels/workbook.xml.rels', XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'],
      ['xl/theme/theme1.xml', TEMA],
      ['xl/worksheets/sheet1.xml', sheet],
      ['xl/styles.xml', STYLES],
      ['xl/sharedStrings.xml', shared]
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
