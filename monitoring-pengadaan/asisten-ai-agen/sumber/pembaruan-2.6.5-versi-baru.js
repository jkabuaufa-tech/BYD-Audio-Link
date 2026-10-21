/* MP264 — PEMBARUAN 2.6.4 / 2.6.5: PEMBERITAHUAN VERSI BARU TIDAK MENGGANGGU (aditif, tanpa perubahan data)
 * Gejala: staf mendapat kotak besar "Versi baru x tersedia. <seluruh catatan rilis>" tanpa tombol tutup — muncul di tengah layar
 * saat sedang mengisi form; satu-satunya jalan menutup aplikasi lalu masuk ulang.
 * Kini: kotak besar diganti kartu kecil di pojok kanan bawah: [Muat ulang] [Catatan] [×]. × / Nanti = disembunyikan sampai
 * aplikasi dibuka lagi. Bila pengguna sedang mengetik, kartu tampil sebagai tombol kecil saja. Muat ulang mengingatkan bila
 * ada isian form yang belum disimpan.
 * [2.6.5] juga menangkap dialog tanya() HTML dasar (tombolnya terdorong keluar layar oleh catatan rilis panjang) dan kotak yang
 *        diisi ulang (teks/<b> di dalam wadah yang sudah ada); Esc menutup kotak versi baru yang tersisa. */
(function () {
  'use strict';
  if (window.__MP264__) return; window.__MP264__ = true;
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const polos = s => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const RE = /^\s*Versi baru\s+(?:aplikasi\s+)?v?(\d+\.\d+\.\d+)?\s*(?:aplikasi\s+)?tersedia\b/i;
  const V = { versi: '', catatan: '', buka: false };
  window.MP264_VERSI = V;
  const kunciTutup = v => 'mp264Tutup_' + (v || '?');
  const TUTUP = new Set();   // cadangan bila sessionStorage tidak tersedia (mode privat / WebView tertentu)
  const ditutup = v => { if (TUTUP.has(kunciTutup(v))) return true; try { return sessionStorage.getItem(kunciTutup(v)) === '1'; } catch (e) { return false; } };
  const mengetik = () => { const a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && !a.closest('#mp264Versi')); };
  function adaIsian() {   // form yang terlihat & berisi ketikan (bukan bawaan)
    return [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=search]):not([readonly]), textarea:not([readonly])')]
      .some(el => el.offsetParent !== null && !el.closest('#mp264Versi') && el.value && el.value !== el.defaultValue);
  }
  function tampil(versi, catatan) {
    versi = versi || V.versi; if (catatan) V.catatan = catatan; V.versi = versi;
    if (ditutup(versi)) return;
    let b = document.getElementById('mp264Versi');
    if (!b) { b = document.createElement('div'); b.id = 'mp264Versi'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); }
    const kecil = mengetik() && !V.buka;
    b.className = 'mp264-versi' + (kecil ? ' kecil' : '');
    b.innerHTML = kecil
      ? `<button type="button" class="mp264-pil" onclick="mp264Versi('buka')" title="Versi baru ${E(versi)} tersedia — klik untuk melihat"><i class="fas fa-rocket"></i><span>Versi baru</span></button>`
      : `<div class="mp264-h"><i class="fas fa-rocket"></i><div><b>Versi baru ${E(versi || '')} tersedia</b><small>Pakai setelah pekerjaan Anda tersimpan — tidak mengganggu yang sedang dikerjakan.</small></div>
          <button type="button" class="mp264-x" onclick="mp264Versi('tutup')" aria-label="Tutup pemberitahuan versi baru" title="Tutup (muncul lagi saat aplikasi dibuka ulang)">×</button></div>
        ${V.buka && V.catatan ? `<div class="mp264-cat" tabindex="0">${E(V.catatan)}</div>` : ''}
        <div class="mp264-a"><button type="button" class="btn btn-sm btn-light fw-semibold" onclick="mp264Versi('muat')"><i class="fas fa-rotate me-1"></i>Muat ulang</button>
          ${V.catatan ? `<button type="button" class="btn btn-sm btn-outline-light" onclick="mp264Versi('catatan')">${V.buka ? 'Sembunyikan catatan' : 'Catatan'}</button>` : ''}
          <button type="button" class="btn btn-sm btn-link text-white" onclick="mp264Versi('tutup')">Nanti</button></div>`;
  }
  window.mp264Versi = aksi => {
    const b = document.getElementById('mp264Versi');
    if (aksi === 'tutup') { TUTUP.add(kunciTutup(V.versi)); try { sessionStorage.setItem(kunciTutup(V.versi), '1'); } catch (e) { } if (b) b.remove(); V.buka = false; return; }
    if (aksi === 'buka') { V.buka = true; tampil(); return; }
    if (aksi === 'catatan') { V.buka = !V.buka; tampil(); return; }
    if (aksi === 'muat') {
      if (adaIsian() && !window.confirm('Ada isian form yang belum disimpan. Simpan dahulu agar tidak hilang.\n\nTetap muat ulang sekarang?')) return;
      location.reload();
    }
  };
  // 1. jalur notif(): pesan versi baru → kartu kecil, bukan kotak besar
  const nAsli = window.notif;
  if (typeof nAsli === 'function') window.notif = function (pesan, tipe) {
    const t = polos(pesan), m = RE.exec(t);
    if (m) { tampil(m[1] || '', t.replace(RE, '').replace(/^[\s.:—-]+/, '')); return; }
    return nAsli.apply(this, arguments);
  };
  // 2. jalur tanya() (dialog HTML dasar): catatan rilis yang panjang mendorong tombol keluar layar → tidak bisa ditutup.
  //    Dialog versi baru tidak ditampilkan; dijawab "nanti" (false) dan diganti kartu kecil yang memuat tombol Muat ulang.
  const tAsli = window.tanya;
  if (typeof tAsli === 'function') window.tanya = function (pesan, opsi) {
    const t = polos(pesan), j = polos(opsi && opsi.judul), m = RE.exec(t) || RE.exec(j);
    if (m) { tampil(m[1] || '', (RE.test(t) ? t.replace(RE, '') : t).replace(/^[\s.:—-]+/, '')); return Promise.resolve(false); }
    return tAsli.apply(this, arguments);
  };
  // 3. jalur lain (elemen dibuat/diisi langsung oleh HTML dasar): cari wadah melayang/dialognya, sembunyikan, tampilkan kartu kecil
  function wadah(n) {   // naik ke kotak MELAYANG/dialog terluar yang berisi pesan; konten halaman biasa (tidak melayang) tidak pernah disembunyikan
    let lapis = null;
    for (let e = n; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      if (e.id === 'mp264Versi') return null;
      const pos = getComputedStyle(e).position;
      if (pos === 'fixed' || e.matches('.modal,[role=dialog],[role=alertdialog],dialog')) return e;
      if (/absolute|sticky/.test(pos) || e.matches('.modal-dialog,.modal-content,[role=alert],[role=status],.toast')) lapis = e;
    }
    return lapis;
  }
  function sembunyikan(w) {
    const md = w.closest('.modal') || (w.matches('.modal') ? w : null);
    try { if (md && window.bootstrap && bootstrap.Modal) { bootstrap.Modal.getOrCreateInstance(md).hide(); return; } } catch (e) { }
    if (w.tagName === 'DIALOG' && typeof w.close === 'function') { try { w.close(); } catch (e) { } }
    w.style.setProperty('display', 'none', 'important'); w.setAttribute('data-mp264', 'disembunyikan');
  }
  function periksa(n) {
    const el = n && (n.nodeType === 3 ? n.parentElement : n); if (!el || el.nodeType !== 1 || el.closest('#mp264Versi,#bannerVersiBaru')) return;
    const teks = e => (e.textContent || '').trim();
    let awal = el, m = RE.exec(teks(el));
    if (!m) { const p = el.parentElement; if (!p || !(m = RE.exec(teks(p)))) return; awal = p; }   // mis. teks/<b> "Versi baru …" di dalam kotak
    while (awal.parentElement && awal.parentElement !== document.body && RE.test(teks(awal.parentElement))) awal = awal.parentElement;   // seluruh blok pesan
    const w = wadah(awal); if (!w) return;
    const ta = teks(awal), tw = teks(w);
    if (tw.length > 60000 || ta.length < 0.6 * tw.length) return;   // pesan harus menjadi isi utama kotak (bukan satu baris di panel besar, mis. riwayat pembaruan)
    sembunyikan(w);
    tampil(m[1] || '', ta.replace(RE, '').replace(/^[\s.:—-]+/, '').replace(/\s*(Muat ulang|Tutup|OK|Nanti|Batal)\s*$/i, ''));
  }
  const kandidat = n => n.nodeType === 3 ? /Versi baru/i.test(n.data || '') : n.nodeType === 1 && n.childElementCount < 60 && /Versi baru/i.test(n.textContent || '');
  let _t = 0, antre = [];
  const obs = () => { if (!document.body) return;
    new MutationObserver(m => { m.forEach(x => { if (x.type === 'characterData') { if (kandidat(x.target) && antre.length < 50) antre.push(x.target); } else x.addedNodes.forEach(n => { if (antre.length < 50 && kandidat(n)) antre.push(n); }); });
      if (_t || !antre.length) return; _t = setTimeout(() => { _t = 0; const L = antre; antre = []; L.forEach(periksa); }, 80); })
      .observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
  // Esc menutup kotak versi baru yang mungkin tetap lolos (cadangan terakhir)
  document.addEventListener('keydown', ev => { if (ev.key !== 'Escape') return; document.querySelectorAll('body > *, body > * > *, body > * > * > *').forEach(e => { if (e.childElementCount < 60 && /^\s*Versi baru/i.test(e.textContent || '') && getComputedStyle(e).position === 'fixed') sembunyikan(e); }); });
  // saat pengguna selesai mengetik, tombol kecil kembali jadi kartu
  document.addEventListener('focusout', () => setTimeout(() => { const b = document.getElementById('mp264Versi'); if (b && b.classList.contains('kecil') && !mengetik()) tampil(); }, 400));
})();
