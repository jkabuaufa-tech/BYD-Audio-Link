
/* MP261 — PEMBARUAN 2.6.1: kinerja (aditif, tanpa perubahan data)
 * 1. PDF/berkas yang sudah dibuka disimpan sementara di memori (maks. 16 berkas / ±60 MB, 30 menit): membuka ulang PDF kontrak,
 *    checklist, bukti PO dll instan tanpa mengunduh ulang dari Google Drive. Permintaan ganda untuk berkas yang sama digabung.
 * 2. Penanda kecil saat aplikasi otomatis mencoba lagi simpanan yang tertahan "Server sedang sibuk" (lihat MP259 bagian B). */
(function () {
  'use strict';
  if (window.__MP261__) return;
  window.__MP261__ = true;
  const rp = window.regPost;
  const B = { C: new Map(), jalan: new Map(), total: 0, hit: 0, unduh: 0 };
  window.MP261_BERKAS = B;
  const MAKS_N = 16, MAKS_BYTE = 60e6, UMUR = 30 * 60e3;
  const kunci = id => (REG.url || '') + '|' + ((REG.sesi && REG.sesi.proyek) || '') + '|' + id;
  function simpan(k, r) {
    const n = String(r.data || '').length; if (!n || n > 25e6) return;
    if (B.C.has(k)) { B.total -= B.C.get(k).n; B.C.delete(k); }
    B.C.set(k, { r, n, t: Date.now() }); B.total += n;
    while (B.C.size > MAKS_N || B.total > MAKS_BYTE) { const [k0, v0] = B.C.entries().next().value; B.C.delete(k0); B.total -= v0.n; }
  }
  if (typeof rp === 'function') window.regPost = function (body) {
    if (!body || body.action !== 'ambilBerkas' || !body.id || body.modulUji || typeof REG === 'undefined' || !REG.url) return rp.apply(this, arguments);
    const k = kunci(body.id), c = B.C.get(k);
    if (c && Date.now() - c.t < UMUR) { B.C.delete(k); B.C.set(k, c); B.hit++; return Promise.resolve(Object.assign({}, c.r)); }
    if (B.jalan.has(k)) return B.jalan.get(k).then(r => r && typeof r === 'object' ? Object.assign({}, r) : r);
    B.unduh++;
    const p = Promise.resolve(rp.apply(this, arguments)).then(r => { if (r && r.ok && r.data) simpan(k, r); return r; });
    B.jalan.set(k, p); p.then(() => B.jalan.delete(k), () => B.jalan.delete(k));
    return p;
  };
  window.mp261Lupakan = () => { B.C.clear(); B.total = 0; };

  /* penanda "mencoba lagi" — tidak menghalangi kerja, hilang sendiri */
  let el = null, t = 0;
  window.mp261Status = function (teks) {
    clearTimeout(t);
    if (!teks) { if (el) { el.classList.remove('tampil'); t = setTimeout(() => { if (el) el.hidden = true; }, 250); } return; }
    if (!el) { el = document.createElement('div'); el.className = 'mp261-status'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.hidden = false; el.innerHTML = '<span class="mp261-putar" aria-hidden="true"></span><span></span>'; el.lastChild.textContent = teks;
    requestAnimationFrame(() => el && el.classList.add('tampil'));
    t = setTimeout(() => window.mp261Status(null), 20000);
  };
})();
