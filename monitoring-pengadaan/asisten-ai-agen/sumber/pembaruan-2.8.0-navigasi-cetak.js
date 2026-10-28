/* MP281 — RILIS C: LACAK ALUR DI REGISTER KONTRAK · NAVIGASI PANAH · PRATINJAU CETAK BERHALAMAN
 * A. Menu "Lacak Alur" disembunyikan; alur dibuka dari Register Kontrak (tombol "Lacak Alur") dengan bilah kembali.
 * B. Navigasi keyboard di tabel isian (Bon Permintaan, Form/Register Kontrak, Input Progres, dialog multi-item):
 *    ↑ ↓ pindah ke kolom yang sama di baris atas/bawah; ← → pindah antar-kolom (di awal/akhir teks; angka: langsung).
 *    Tidak mengganggu daftar saran (autocomplete) yang sedang terbuka. Isi sel terpilih saat fokus agar mudah ditimpa.
 * C. Pratinjau Cetak: kertas tetap A4 (diperkecil dengan zoom, tidak disempitkan) sehingga tata letak = hasil cetak;
 *    garis batas halaman & perkiraan jumlah halaman memakai aturan potong yang sama dengan Unduh PDF; kontrol zoom. */
(function () {
  'use strict';
  if (window.__MP281__) return; window.__MP281__ = true;
  const $ = id => document.getElementById(id);

  /* ---------- A. Lacak Alur di Register Kontrak ---------- */
  const tabDari = el => (/(?:showTab|bukaTab)\('([\w-]+)'/.exec(el.getAttribute('onclick') || '') || [])[1] || el.getAttribute('data-tab') || '';
  function rapikanAlur() {
    document.querySelectorAll('#sidebar ul.nav .nav-link').forEach(a => { if (tabDari(a) === 'alur') (a.closest('li') || a).classList.add('mp281-sembunyi'); });
    document.querySelectorAll('#navBawah [data-tab="alur"]').forEach(b => b.classList.add('mp281-sembunyi'));
    if (!$('mp281BtnAlur') && $('tab-alur')) {
      const acuan = $('mp272BtnForm') || $('mp2622Btn') || ($('tab-register') && $('tab-register').querySelector('input[type="search"], input[placeholder*="Cari no kontrak"]'));
      if (acuan) {
        const b = document.createElement('button'); b.type = 'button'; b.id = 'mp281BtnAlur'; b.className = 'btn btn-sm btn-outline-primary mp281-btn';
        b.innerHTML = '<i class="fas fa-route me-1"></i>Lacak Alur'; b.title = 'Lacak alur Bon → PBJ → PR/RFQ/PO → Kontrak → Bayar';
        b.onclick = () => { if (typeof window.showTab === 'function') window.showTab('alur'); };
        if (acuan.tagName === 'BUTTON') acuan.insertAdjacentElement('beforebegin', b); else acuan.insertAdjacentElement('afterend', b);
      }
    }
    const ta = $('tab-alur');
    if (ta && !$('mp281Kembali')) ta.insertAdjacentHTML('afterbegin', '<div id="mp281Kembali" class="mp272-kembali mp281-kembali"><button type="button" class="btn btn-sm btn-light border" onclick="showTab(\'register\')"><i class="fas fa-arrow-left me-1"></i>Register Kontrak</button><span>Lacak alur pengadaan · bagian dari Register Kontrak.</span></div>');
  }
  (function () {
    const asli = window.showTab; if (typeof asli !== 'function') return;
    window.showTab = function (nama) {
      const r = asli.apply(this, arguments);
      try { if (nama === 'alur') { document.querySelectorAll('#sidebar ul.nav .nav-link').forEach(a => a.classList.toggle('active', tabDari(a) === 'register')); const j = $('judulHalaman'); if (j) j.textContent = 'Register Kontrak › Lacak Alur'; } } catch (e) { }
      return r;
    };
  })();

  /* ---------- B. navigasi panah ---------- */
  const BIDANG = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([type=button]):not([type=submit]):not([disabled]):not([readonly]), select:not([disabled])';
  const terlihat = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const sel = el => el && el.closest('td, th');
  function bidangDi(td) { return td ? [...td.querySelectorAll(BIDANG)].filter(terlihat)[0] || null : null; }
  function kolomIndeks(td) { let i = 0; for (let c = td.parentNode.firstElementChild; c && c !== td; c = c.nextElementSibling) i += c.colSpan || 1; return i; }
  function selPadaKolom(tr, idx) { let i = 0; for (let c = tr.firstElementChild; c; c = c.nextElementSibling) { const n = c.colSpan || 1; if (idx >= i && idx < i + n) return c; i += n; } return null; }
  function pindahBaris(el, arah) {
    const td = sel(el), tr = td && td.parentNode; if (!tr) return false;
    const idx = kolomIndeks(td);
    for (let r = arah > 0 ? tr.nextElementSibling : tr.previousElementSibling; r; r = arah > 0 ? r.nextElementSibling : r.previousElementSibling) {
      const t = bidangDi(selPadaKolom(r, idx)); if (t) { fokus(t); return true; }
    }
    return false;
  }
  function pindahKolom(el, arah) {
    const tbody = el.closest('tbody, table'); if (!tbody) return false;
    const L = [...tbody.querySelectorAll(BIDANG)].filter(x => terlihat(x) && sel(x));
    const i = L.indexOf(el), t = L[i + arah]; if (t) { fokus(t); return true; } return false;
  }
  function fokus(t) { t.focus(); try { if (t.select && t.type !== 'date') t.select(); } catch (e) { } try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } }
  const acTerbuka = el => { const L = el.parentNode && el.parentNode.querySelector('.ac-list'); return !!(L && L.style.display !== 'none'); };
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
    const el = e.target; if (!el || !el.matches || !el.matches(BIDANG) || !sel(el) || !el.closest('tbody') || acTerbuka(el)) return;
    if (el.tagName === 'SELECT' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;   // pilihan daftar tetap memakai ↑ ↓ bawaan
    let ok = false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') ok = pindahBaris(el, e.key === 'ArrowDown' ? 1 : -1);
    else {
      let tepi = true;
      try { if (typeof el.selectionStart === 'number' && el.type !== 'number') { const v = el.value.length, a = el.selectionStart, b = el.selectionEnd; tepi = a !== b ? (a === 0 && b === v) : (e.key === 'ArrowLeft' ? a === 0 : a === v); } } catch (x) { }
      if (tepi) ok = pindahKolom(el, e.key === 'ArrowRight' ? 1 : -1);
    }
    if (ok) e.preventDefault();
  });

  /* ---------- C. pratinjau cetak berhalaman ---------- */
  const MM = 96 / 25.4;
  function batasHalaman(d, lanskap) {   // aturan potong = window.mp224CetakPdf (margin 12 mm, tidak memotong baris/TTD/kop)
    const body = d.body; if (!body) return [];
    const ch = ((lanskap ? 210 : 297) - 24) * MM, cs = d.defaultView.getComputedStyle(body);
    const top0 = body.getBoundingClientRect().top + d.defaultView.scrollY + parseFloat(cs.paddingTop || 0);
    const pos = el => { const r = el.getBoundingClientRect(); return { a: r.top + d.defaultView.scrollY - top0, b: r.bottom + d.defaultView.scrollY - top0 }; };
    const H = Math.max(0, body.scrollHeight - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0));
    const putus = [...body.querySelectorAll('tr, h1, .kop, table, .cat, .ft, p, li, .ttd')].map(el => pos(el).b).sort((x, y) => x - y);
    const utuh = [...body.querySelectorAll('.ttd, .kop, thead')].map(pos);
    const out = []; let y = 0, n = 0;
    while (y < H - 2 && n < 300) {
      let akhir = Math.min(H, y + ch);
      if (akhir < H) { const c = putus.filter(v => v > y + 60 && v <= akhir); if (c.length) akhir = c[c.length - 1]; utuh.forEach(u => { if (u.a > y + 60 && u.a < akhir && u.b > akhir) akhir = u.a; }); }
      if (akhir <= y) akhir = y + ch;
      out.push(akhir); y = akhir; n++;
    }
    return { batas: out, top0: parseFloat(cs.paddingTop || 0) };
  }
  function tandaiHalaman(w) {
    const f = w.querySelector('#mp224CvFrame'), kertas = w.querySelector('.mp224-cv-kertas'); if (!f || !kertas) return;
    let d; try { d = f.contentDocument; } catch (e) { return; } if (!d || !d.body) return;
    d.querySelectorAll('.mp281-hal').forEach(x => x.remove());
    if (!d.getElementById('mp281Gaya')) { const s = d.createElement('style'); s.id = 'mp281Gaya'; s.textContent = '.mp281-hal{position:absolute;left:0;right:0;height:0;border-top:2px dashed #E0464B;z-index:99;pointer-events:none}.mp281-hal span{position:absolute;right:4px;top:-18px;font:600 10px Arial,sans-serif;color:#E0464B;background:#fff;padding:1px 4px}@media print{.mp281-hal{display:none!important}}'; d.head.appendChild(s); }
    const lanskap = kertas.classList.contains('l'), h = batasHalaman(d, lanskap), N = h.batas.length || 1;
    h.batas.slice(0, -1).forEach((y, i) => { const g = d.createElement('div'); g.className = 'mp281-hal'; g.style.top = (h.top0 + y) + 'px'; g.innerHTML = '<span>batas halaman ' + (i + 1) + ' · ' + (i + 2) + '</span>'; d.body.appendChild(g); });
    if (d.defaultView.getComputedStyle(d.body).position === 'static') d.body.style.position = 'relative';
    const inf = w.querySelector('.mp224-cv-bar small'); if (inf && !/halaman/.test(inf.textContent)) inf.insertAdjacentHTML('beforeend', ' · <span class="mp281-jml">' + N + ' halaman</span>');
    else if (inf) { const j = inf.querySelector('.mp281-jml'); if (j) j.textContent = N + ' halaman'; }
    try { f.style.height = Math.max(600, d.documentElement.scrollHeight + 20) + 'px'; } catch (e) { }
  }
  function aturZoom(w, mode) {
    const kertas = w.querySelector('.mp224-cv-kertas'), badan = w.querySelector('.mp224-cv-body'); if (!kertas || !badan) return;
    const lebar = (kertas.classList.contains('l') ? 297 : 210) * MM, ruang = badan.clientWidth - 24;
    const z = mode === 'pas' ? Math.min(1, ruang / lebar) : Number(mode) || 1;
    kertas.style.zoom = String(Math.max(0.3, z)); w.dataset.mp281Zoom = mode;
    const s = w.querySelector('#mp281Zoom'); if (s) s.value = mode;
  }
  function tingkatkan(w) {
    if (w.dataset.mp281) return; w.dataset.mp281 = '1';
    const a = w.querySelector('.mp224-cv-bar .a');
    if (a) a.insertAdjacentHTML('afterbegin', '<select id="mp281Zoom" class="form-select form-select-sm mp281-zoom" title="Perbesaran pratinjau (tidak mengubah hasil cetak)"><option value="pas">Pas layar</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option></select>');
    const s = w.querySelector('#mp281Zoom'); if (s) s.onchange = () => aturZoom(w, s.value);
    aturZoom(w, 'pas');
    const f = w.querySelector('#mp224CvFrame');
    if (f) { f.addEventListener('load', () => setTimeout(() => tandaiHalaman(w), 60)); setTimeout(() => tandaiHalaman(w), 400); }
    const info = w.querySelector('#mp224CvInfo'); if (info) info.insertAdjacentHTML('beforeend', ' Garis merah putus-putus = batas halaman A4 (tidak ikut tercetak).');
  }
  window.mp281Halaman = () => { const w = $('mp224Cetak'); if (w) tandaiHalaman(w); };
  window.addEventListener('resize', () => { const w = $('mp224Cetak'); if (w && w.dataset.mp281Zoom === 'pas') aturZoom(w, 'pas'); });

  let t = 0;
  const jalan = () => { t = 0; try { rapikanAlur(); } catch (e) { } try { const w = $('mp224Cetak'); if (w) tingkatkan(w); } catch (e) { } };
  const tunda = () => { if (!t) t = setTimeout(jalan, 120); };
  if (document.body) new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }));
  tunda();
})();
