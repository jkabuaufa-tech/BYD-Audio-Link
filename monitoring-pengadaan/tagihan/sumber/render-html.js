/* TAGIHAN RENDER HTML 1.0.0 — model dokumen (BLD) → HTML A4 untuk pratinjau & cetak browser.
 * Kepala tabel berulang tiap halaman (thead), baris tidak terpotong, blok tanda tangan tidak terpisah. */
var BLRH = (function () {
  'use strict';
  const E = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tebal = s => E(s).replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>').replace(/\*\*/g, '');
  const CSS = `
    @page { size: A4; margin: 10mm 11mm 14mm 11mm; @bottom-right { content: "Hal " counter(page) " / " counter(pages); font: 6.5pt Arial, sans-serif; color: #666; } }
    @page lanskap { size: A4 landscape; }
    * { box-sizing: border-box; }
    html { background: #8a94a6; } body { font-family: Arial, Helvetica, sans-serif; font-size: 8.3pt; color: #111; margin: 0; }
    .kertas { width: 210mm; min-height: 297mm; margin: 14px auto; background: #fff; padding: 11mm 12mm 16mm; box-shadow: 0 2px 12px rgba(0,0,0,.25); position: relative; overflow: hidden; page-break-after: always; break-after: page; }
    .kertas.L { width: 297mm; min-height: 210mm; page: lanskap; }
    .kertas:last-child { page-break-after: auto; break-after: auto; }
    @media print { html { background: #fff; } .kertas { margin: 0; width: auto; min-height: 0; padding: 0; box-shadow: none; overflow: visible; } .kertas.L { width: auto; } }
    .kop { display: flex; align-items: center; gap: 14px; padding-bottom: 5px; } .kop img { height: 46px; } .kop .nm { font-size: 18pt; font-weight: 800; color: #0b2a6b; letter-spacing: .5px; }
    .alamat { font-size: 7pt; color: #333; border-top: 2.2px solid #0b2a6b; border-bottom: .8px solid #c8102e; padding: 3px 0; text-align: center; }
    h1 { font-size: 11pt; text-align: center; margin: 10px 0 2px; text-decoration: underline; letter-spacing: .4px; } .nomor { text-align: center; font-weight: 700; margin-bottom: 8px; }
    p { margin: 4px 0; line-height: 1.38; text-align: justify; }
    table.info { border-collapse: collapse; margin: 2px 0 4px 6px; width: calc(100% - 6px); } table.info td { padding: 1.5px 3px; vertical-align: top; line-height: 1.4; } table.info td.n { width: 18px; }
    table.data { width: 100%; border-collapse: collapse; margin: 4px 0; } table.data th, table.data td { border: .6pt solid #222; padding: 2px 3px; vertical-align: top; }
    table.data th { background: #dfe7f3; font-weight: 700; text-align: center; vertical-align: middle; } table.data th.idx { background: #eef2f8; font-style: italic; font-weight: 400; font-size: 90%; padding: 1px; }
    table.data thead { display: table-header-group; } table.data tr { page-break-inside: avoid; break-inside: avoid; }
    table.data tr.judul td { font-weight: 700; background: #f7f9fc; } table.data tr.jumlah td { font-weight: 700; background: #eef2f8; } table.data tr.sorot td { background: #fff8db; } table.data tr.sub td { border-left: 0; border-right: 0; }
    table.data.polos td { border: 0; padding: 1.2px 3px; } table.data.polos tr.garisAtas td { border-top: .8pt solid #111; } table.data.polos tr.kotak td { border-top: .8pt solid #111; border-bottom: .8pt solid #111; font-weight: 700; }
    table.data tr.tebal td { font-weight: 700; } table.data tr.judulPolos td { font-weight: 700; text-decoration: underline; padding-top: 4px; }
    .r { text-align: right; white-space: nowrap; } .c { text-align: center; }
    table.bayar { border-collapse: collapse; margin: 2px 0 4px 6px; width: calc(100% - 6px); } table.bayar td { padding: 1.5px 4px; } table.bayar td.p { width: 64px; text-align: right; } table.bayar td.v { width: 130px; text-align: right; white-space: nowrap; }
    table.bayar td.g { border-bottom: .8pt solid #111; } table.bayar tr.b td { font-weight: 700; } table.bayar tr.t td { padding-top: 5px; font-size: 9pt; }
    .kotak { margin: 6px 0 8px 6px; padding: 5px 8px; background: #f3f6fb; border-left: 3px solid #0b2a6b; font-weight: 700; } .kotak.besar { font-size: 16pt; text-align: center; border: 1.5px solid #0b2a6b; }
    .ttd { page-break-inside: avoid; break-inside: avoid; margin-top: 8px; } .ttd .tmp { text-align: right; margin-bottom: 2px; } .ttd table { width: 100%; text-align: center; } .ttd td { width: 33.3%; vertical-align: top; line-height: 1.35; }
    .ttd .ruang { height: 52px; } .ttd .u { text-decoration: underline; font-weight: 700; } .ttd .meterai { display: inline-block; border: .8px dashed #999; color: #999; font-size: 6.5pt; padding: 8px 6px; margin: 4px 0; }
    .catatan { margin-top: 6px; font-size: 7.2pt; } .kaki { margin-top: 12px; font-size: 6.5pt; color: #666; border-top: .6px solid #bbb; padding-top: 2px; }
    .draf { position: absolute; top: 38%; left: 0; right: 0; text-align: center; font-size: 110pt; font-weight: 800; color: rgba(200,16,46,.08); transform: rotate(-30deg); pointer-events: none; }`;
  function blok(b, opsi) {
    switch (b.t) {
      case 'kop': return `<div class="kop">${opsi.logo ? `<img src="${E(opsi.logo)}" alt="Logo">` : ''}<div class="nm">${E(opsi.namaKop || '')}</div></div><div class="alamat">${E(opsi.alamatKop || '')}</div>`;
      case 'judul': return `<h1>${E(b.teks)}</h1><div class="nomor">${E(b.nomor || '')}</div>`;
      case 'p': return `<p>${tebal(b.teks)}</p>`;
      case 'catatan': return `<div class="catatan">${tebal(b.teks)}</div>`;
      case 'info': return `<table class="info">${b.baris.map(r => `<tr><td class="n">${tebal(r[0])}</td><td style="width:${b.lebar || 150}px">${tebal(r[1])}</td><td>${tebal(r[2])}</td></tr>`).join('')}</table>`;
      case 'kotak': return `<div class="kotak${b.besar ? ' besar' : ''}">${tebal(b.teks)}</div>`;
      case 'hitung': return `<table class="bayar">${b.baris.map(r => `<tr class="${r.tebal ? 'b' : ''} ${r.total ? 't' : ''}"><td style="width:18px">${E(r.no)}</td><td>${E(r.label)}</td><td class="p">${E(r.pct)}</td><td class="c" style="width:12px">${r.label && r.nilai !== '' ? '=' : ''}</td><td class="c" style="width:24px">${E(r.tanda === '=' ? '' : r.tanda)}</td><td class="v ${r.garis ? 'g' : ''}">${E(r.nilai)}</td></tr>`).join('')}</table>`;
      case 'tabel': {
        const tot = b.kolom.reduce((a, k) => a + k.l, 0), rata = k => k.r === 'r' ? 'r' : k.r === 'c' ? 'c' : '';
        const kep = (b.kepala || []).map(row => `<tr>${row.map((cel, i) => cel === null ? '' : `<th${cel.span ? ` colspan="${cel.span}"` : ''} class="${cel.idx ? 'idx' : ''}">${E(cel.teks)}</th>`).join('')}</tr>`).join('');
        const isi = b.isi.map(row => `<tr class="${row.gaya || ''}"${row.tinggi ? ` style="height:${row.tinggi}pt"` : ''}>${row.sel.map((v, i) => v === null ? '' : `<td class="${rata(b.kolom[i] || {})}"${row.span && row.span[i] ? ` colspan="${row.span[i]}"` : ''}>${tebal(v)}</td>`).join('')}</tr>`).join('');
        const lebar = b.lebarPersen ? `width:${b.lebarPersen}%;${b.tengah ? 'margin-left:auto;margin-right:auto;' : ''}` : '';
        return `<table class="data${b.polos ? ' polos' : ''}" style="font-size:${b.ukuran || 7.3}pt;${lebar}"><colgroup>${b.kolom.map(k => `<col style="width:${(k.l / tot * 100).toFixed(2)}%">`).join('')}</colgroup>${kep ? `<thead>${kep}</thead>` : ''}<tbody>${isi}</tbody></table>`;
      }
      case 'ttd': return `<div class="ttd">${b.tempat ? `<div class="tmp">${E(b.tempat)}</div>` : ''}<table><tr>${b.kolom.map(k => k.kosong ? '<td></td>' : `<td><div>${E(k.atas)}</div><b>${E(k.instansi)}</b><div class="ruang">${k.meterai ? '<span class="meterai">meterai</span>' : ''}</div><div class="u">${E(k.nama)}</div><div>${E(k.jabatan)}</div></td>`).join('')}</tr></table></div>`;
      default: return '';
    }
  }
  function kertas(m, opsi) {
    return `<section class="kertas ${m.orientasi === 'L' ? 'L' : ''}" data-kode="${E(m.kode)}">${m.tandaAir ? `<div class="draf">${E(m.tandaAir)}</div>` : ''}${m.blok.map(b => blok(b, opsi)).join('')}<div class="kaki">${E(m.nomor)} · ${E(m.kaki)}</div></section>`;
  }
  // opsi: {logo, namaKop, alamatKop, judul}
  function dokumen(models, opsi) {
    opsi = opsi || {}; models = [].concat(models).filter(Boolean);
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${E(opsi.judul || (models[0] && models[0].nomor) || 'Paket Tagihan')}</title><style>${CSS}</style></head><body>${models.map(m => kertas(m, opsi)).join('')}</body></html>`;
  }
  return { VERSI: '1.0.0', dokumen, kertas, CSS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BLRH;
