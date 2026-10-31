/* MP297 — BLOKIR TANGGAL MELEWATI MASA BERLAKU PO/KONTRAK · TTD STOK PERSEDIAAN · BATAS HALAMAN KARTU GUDANG (2.9.7)
 *  A. Masa berlaku = Tanggal Selesai kontrak/PO di Register Kontrak (bila kosong: Master Kontrak). Perpanjangan → ubah Tanggal Selesai (addendum).
 *     1. BAPP / BAPM / BAPA bertanggal SETELAH masa berlaku PO berakhir otomatis DIBLOKIR (berlaku untuk BK berikutnya seterusnya):
 *        simpan Form Input Progres, terbitkan nomor, cetak & unduh Excel Preview BA ditolak; peringatan merah di form & Preview BA.
 *     2. Tanggal BAP & Kwitansi (Paket Tagihan › Tanggal dokumen) melewati masa berlaku kontrak juga DIBLOKIR:
 *        Simpan Draft, terbitkan PDF & unduh Excel paket ditolak.
 *  B. Cetak Laporan Stok Material (dan formulir gudang lain dengan 2 penanda tangan): Kasi DanLoglat (Mengetahui) di kiri, Petugas Gudang di
 *     kanan dengan tanggal di atasnya; nama sejajar (sama seperti Kartu Gudang).
 *  C. Batas halaman: blok tanda tangan + catatan + kaki cetak tidak terpisah (pratinjau, PDF & cetak) dan dibuat lebih ringkas
 *     sehingga halaman terpotong SETELAH catatan. */
(function () {
  'use strict';
  if (window.__MP297__) return; window.__MP297__ = true;
  const $ = id => document.getElementById(id);
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const iso = v => { if (!v) return ''; if (v instanceof Date) return isNaN(v) ? '' : v.toISOString().slice(0, 10); const s = String(v), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0]; const d = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s); return d ? d[3] + '-' + d[2].padStart(2, '0') + '-' + d[1].padStart(2, '0') : ''; };
  const tglID = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? +m[3] + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : '-'; };
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || 'err'); else alert(m); };

  /* ======================= A. masa berlaku ======================= */
  function regDari(g) {
    if (!g) return null;
    const no = new Set([g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean));
    try { return ((typeof REG !== 'undefined' && REG.data) || []).find(r => no.has(r.noKontrak)) || null; } catch (e) { return null; }
  }
  function akhirKontrak(g) { const r = regDari(g); return iso(r && r.tglSelesai) || iso(g && g.tglSelesai); }
  // → null (boleh) | { pesan, akhir, tgl }
  function cek(g, tanggal, jenis) {
    const akhir = akhirKontrak(g), t = iso(tanggal); if (!g || !akhir || !t || t <= akhir) return null;
    const lewat = Math.round((Date.parse(t) - Date.parse(akhir)) / 864e5);
    return { akhir, tgl: t, pesan: 'DIBLOKIR — ' + jenis + ' bertanggal ' + tglID(t) + ' melewati masa berlaku ' + (/BAP |Kwitansi/.test(jenis) ? 'kontrak' : 'PO') + ' ' + g.key + ' yang berakhir ' + tglID(akhir) + ' (' + lewat + ' hari). Perpanjang lewat addendum (ubah Tanggal Selesai di Register Kontrak) sebelum dokumen dibuat.' };
  }
  window.mp297Cek = cek; window.mp297AkhirKontrak = akhirKontrak;
  const kodeBA = g => { try { return typeof window.kodeBA === 'function' ? window.kodeBA(g) : ''; } catch (e) { return ''; } };
  const namaBA = g => { const k = kodeBA(g); return k ? k : /\/(SPM|SPPM)\//.test(g && g.key || '') ? 'BAPM' : 'BAPP'; };

  // 1. Form Input Progres (BK → BAPP/BAPM)
  function cekProgres() {
    let g = null; try { g = typeof FP !== 'undefined' && FP ? FP.g : null; } catch (e) { }
    const t = ($('fp_tanggal') || {}).value; return cek(g, t, namaBA(g) + ' (BK)');
  }
  function bannerProgres() {
    const i = $('fp_tanggal'); if (!i) return; const c = cekProgres(); let b = $('mp297Fp');
    if (!c) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'mp297Fp'; b.className = 'alert alert-danger py-2 px-3 mt-2 mb-0 small mp297-blok'; (i.closest('.col, [class*="col-"], .mb-3, div') || i.parentElement).appendChild(b); }
    b.innerHTML = '<i class="fas fa-ban me-1"></i>' + E(c.pesan);
  }
  // Preview BA
  function cekBA() { try { if (typeof BA === 'undefined' || !BA || !BA.g) return null; return cek(BA.g, BA.tanggal, (BA.kode || namaBA(BA.g))); } catch (e) { return null; } }
  function bannerBA() {
    const m = $('modalBA'); if (!m) return; const c = cekBA(); let b = $('mp297Ba');
    if (!c) { if (b) b.remove(); return; }
    const body = m.querySelector('.modal-body') || m; if (!b) { b = document.createElement('div'); b.id = 'mp297Ba'; b.className = 'alert alert-danger py-2 px-3 mb-2 small mp297-blok'; body.insertBefore(b, body.firstChild); }
    b.innerHTML = '<i class="fas fa-ban me-1"></i>' + E(c.pesan);
  }
  // 2. Paket Tagihan (tanggal dokumen BAP & Kwitansi)
  function cekPaket() {
    let T = null; try { T = window.mp270Aktif && window.mp270Aktif(); } catch (e) { }
    if (!T || !T.g) return null; const t = (T.l && T.l.tanggalDok) || (T.entri && T.entri.tanggal) || '';
    return cek(T.g, t, 'Tanggal BAP & Kwitansi');
  }
  function bannerPaket() {
    const l = [...document.querySelectorAll('label')].find(x => /^\s*Tanggal dokumen/.test(x.textContent)); let b = $('mp297Pk');
    const c = l ? cekPaket() : null; if (!c) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'mp297Pk'; b.className = 'alert alert-danger py-2 px-3 my-2 small mp297-blok'; (l.closest('.mp270-g') || l.parentElement).insertAdjacentElement('beforebegin', b); }
    b.innerHTML = '<i class="fas fa-ban me-1"></i>' + E(c.pesan);
  }
  function jaga(nama, cekFn) {
    const f = window[nama]; if (typeof f !== 'function' || f.__mp297) return;
    const g = function () { const c = cekFn.apply(this, arguments); if (c) { pesan(c.pesan, 'err'); return false; } return f.apply(this, arguments); };
    Object.keys(f).filter(k => /^__mp\d+/.test(k)).forEach(k => { g[k] = f[k]; });   // tanda pembungkus lain ikut (tidak dibungkus ulang)
    g.__mp297 = true; window[nama] = g;
  }
  function pasangJaga() {
    jaga('simpanProgres', cekProgres);
    ['terbitkanBA', 'cetakBA', 'mp293UnduhBA'].forEach(n => jaga(n, cekBA));
    ['mp270Simpan', 'mp270BuatPdf', 'mp293PvUnduh'].forEach(n => jaga(n, cekPaket));
    // cetak paket (format Excel) dari pratinjau Paket Tagihan
    const cf = window.mp296CetakFrame; if (typeof cf === 'function' && !cf.__mp297) { const g = function (id) { if ((id === 'mp293Frame' || id === 'mp270Frame') && $('mp270Dlg')) { const c = cekPaket(); if (c) { pesan(c.pesan, 'err'); return false; } } if (id === 'baFrame') { const c = cekBA(); if (c) { pesan(c.pesan, 'err'); return false; } } return cf.apply(this, arguments); }; g.__mp297 = true; window.mp296CetakFrame = g; }
  }

  /* ======================= B & C. tanda tangan & batas halaman cetak gudang ======================= */
  function ttdRapi(h) {
    const a = h.indexOf('<div class="ttd"'); if (a < 0) return h;
    if (h.indexOf('<div class="ttd">') === a) {   // belum ditata (Laporan Stok dll.): Mengetahui di kiri, Dibuat/Diisi oleh di kanan, nama sejajar
      const ujung = ['<div class="cat">', '<div class="ft">'].map(t => h.indexOf(t, a)).filter(i => i > a), b = ujung.length ? Math.min.apply(null, ujung) : -1;
      if (b > a) {
        const blok = h.slice(a, b), tgl = (/^<div class="ttd"><div>([^<]*)<br>/.exec(blok) || [])[1] || '';
        const P = [...blok.matchAll(/([^<>]+)<br>([^<>]+)<div class="sp"><\/div><b>([^<]*)<\/b>/g)].map(m => m.slice(1, 4));
        if (P.length === 2) {
          const kol = (x, kepala) => `<div style="flex:0 0 auto;min-width:62mm;text-align:center">${kepala}<br>${x[0]}<br>${x[1]}<div class="sp" style="height:52px"></div><b style="display:block;text-decoration:underline">${x[2]}</b></div>`;
          h = h.slice(0, a) + `<div class="ttd" style="display:flex;justify-content:space-between;align-items:flex-start;gap:0;margin-top:12px;page-break-inside:avoid">` + kol(P[0], '&nbsp;') + kol(P[1], tgl || '&nbsp;') + `</div>\n      ` + h.slice(b);
        }
      }
    }
    // blok TTD + catatan + kaki cetak satu kesatuan: halaman terpotong setelah catatan (tidak di antara TTD & catatan)
    const a2 = h.indexOf('<div class="ttd"'), z = h.lastIndexOf('</body>');
    if (a2 > 0 && z > a2 && h.indexOf('class="ttdblok"') < 0) h = h.slice(0, a2) + '<div class="ttdblok" style="page-break-inside:avoid;break-inside:avoid">' + h.slice(a2, z) + '</div>' + h.slice(z);
    return h.replace(/(\.ttd \.sp\{height:)58px/, '$152px').replace('.cat{margin-top:10px;', '.cat{margin-top:6px;');
  }
  window.mp297TtdRapi = ttdRapi;
  function pasangCetak() {
    const c = window.mp224Cetak; if (typeof c !== 'function' || c.__mp297) return;
    const g = function (html, opt) { let h = String(html); try { if (/class="ttd"/.test(h)) h = ttdRapi(h); } catch (e) { } return c.call(this, h, opt); };
    g.__mp297 = true; window.mp224Cetak = g;
  }

  /* ======================= pemasangan ======================= */
  const segar = () => { try { pasangJaga(); pasangCetak(); bannerProgres(); bannerBA(); bannerPaket(); } catch (e) { } };
  document.addEventListener('change', ev => { const id = ev.target && ev.target.id; if (id === 'fp_tanggal' || /^fp_/.test(id || '')) setTimeout(bannerProgres, 50); }, true);
  document.addEventListener('input', ev => { if (ev.target && ev.target.id === 'fp_tanggal') bannerProgres(); }, true);
  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(segar, 250); };
  const awasi = () => { if (!document.body) return; segar(); new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length && !(x.target.closest && x.target.closest('.mp297-blok')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
  window.addEventListener('load', segar);
})();
