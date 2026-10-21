/* MP264 — PEMBARUAN 2.6.4: PEMBERITAHUAN VERSI BARU TIDAK MENGGANGGU (aditif, tanpa perubahan data)
 * Gejala: staf mendapat kotak besar "Versi baru x tersedia. <seluruh catatan rilis>" tanpa tombol tutup — muncul di tengah layar
 * saat sedang mengisi form; satu-satunya jalan menutup aplikasi lalu masuk ulang.
 * Kini: kotak besar diganti kartu kecil di pojok kanan bawah: [Muat ulang] [Catatan] [×]. × / Nanti = disembunyikan sampai
 * aplikasi dibuka lagi. Bila pengguna sedang mengetik, kartu tampil sebagai tombol kecil saja. Muat ulang mengingatkan bila
 * ada isian form yang belum disimpan. */
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
  // 2. jalur lain (elemen langsung dari HTML dasar): sembunyikan kotak versi baru yang besar, tampilkan kartu kecil
  function periksa(n) {
    if (!n || n.nodeType !== 1 || n.id === 'mp264Versi' || n.closest('#mp264Versi') || n.id === 'bannerVersiBaru') return;
    const t = (n.textContent || '').trim(); if (t.length < 15 || t.length > 60000) return;
    const m = RE.exec(t); if (!m) return;
    const st = getComputedStyle(n), mengambang = /fixed|absolute/.test(st.position) || n.closest('[role=alert],[role=status],.toast,.notif,.modal');
    if (!mengambang && t.length < 400) return;
    n.style.display = 'none'; n.setAttribute('data-mp264', 'disembunyikan');
    tampil(m[1] || '', t.replace(RE, '').replace(/^[\s.:—-]+/, ''));
  }
  let _t = 0, antre = [];
  const obs = () => { if (!document.body) return; new MutationObserver(m => { m.forEach(x => x.addedNodes.forEach(n => { if (n.nodeType === 1 && antre.length < 200) antre.push(n); })); if (_t) return; _t = setTimeout(() => { _t = 0; const L = antre; antre = []; L.forEach(periksa); }, 120); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
  // saat pengguna selesai mengetik, tombol kecil kembali jadi kartu
  document.addEventListener('focusout', () => setTimeout(() => { const b = document.getElementById('mp264Versi'); if (b && b.classList.contains('kecil') && !mengetik()) tampil(); }, 400));
})();
