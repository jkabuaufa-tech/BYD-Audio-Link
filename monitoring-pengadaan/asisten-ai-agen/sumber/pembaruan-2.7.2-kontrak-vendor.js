/* MP272 — REGISTER KONTRAK = SATU MENU KONTRAK · UBAH VENDOR BAKU
 * A. Menu "Form Input Kontrak" disembunyikan dari sidebar; formnya tetap ada dan dibuka dari Register Kontrak
 *    (tombol "+ Input Kontrak"), dengan bilah "← Register Kontrak" untuk kembali. Seluruh fungsi form (simpan, checklist banyak item → 1 PO) tidak berubah.
 * B. Master Data › Vendor: baris baku punya tombol Ubah. Isian (alamat, direktur, NPWP, kontak) disimpan sebagai master tambahan
 *    dengan ID vendor SAP yang sama (Master baku Excel tidak diubah); baris baku lalu tampil sebagai "Baku · dilengkapi". */
(function () {
  'use strict';
  if (window.__MP272__) return; window.__MP272__ = true;
  const $ = id => document.getElementById(id);
  const sesi = () => (typeof REG !== 'undefined' && REG && REG.sesi) || null;
  const lower = s => String(s == null ? '' : s).trim().toLowerCase();

  /* ---------- A. Form Input Kontrak di dalam Register Kontrak ---------- */
  const tabDari = el => (/(?:showTab|bukaTab)\('([\w-]+)'/.exec(el.getAttribute('onclick') || '') || [])[1] || el.getAttribute('data-tab') || '';
  const bolehBuat = () => { const s = sesi(); return !s || s.admin || s.peran === 'PENGADAAN'; };
  function bukaForm() { if (typeof window.showTab === 'function') window.showTab('form-kontrak'); }
  window.mp272BukaForm = bukaForm;
  function rapikanMenu() {
    document.querySelectorAll('#sidebar ul.nav .nav-link').forEach(a => { if (tabDari(a) === 'form-kontrak') (a.closest('li') || a).classList.add('mp272-sembunyi'); });
    document.querySelectorAll('#navBawah [data-tab="form-kontrak"]').forEach(b => b.classList.add('mp272-sembunyi'));
    // tombol di Register Kontrak (di depan "+ Kontrak multi-item"; bila tidak ada, setelah kolom cari)
    if (!$('mp272BtnForm') && bolehBuat()) {
      const acuan = $('mp2622Btn') || ($('tab-register') && $('tab-register').querySelector('input[type="search"], input[placeholder*="Cari no kontrak"]'));
      if (acuan) {
        const b = document.createElement('button'); b.type = 'button'; b.id = 'mp272BtnForm'; b.className = 'btn btn-sm btn-primary mp272-btn';
        b.innerHTML = '<i class="fas fa-file-signature me-1"></i>Input Kontrak'; b.title = 'Form Input Kontrak (satu kontrak, item dari Bon / checklist banyak item)';
        b.onclick = bukaForm;
        if (acuan.id === 'mp2622Btn') acuan.insertAdjacentElement('beforebegin', b); else acuan.insertAdjacentElement('afterend', b);
      }
    } else if ($('mp272BtnForm') && !bolehBuat()) $('mp272BtnForm').remove();
    // bilah kembali di atas form
    const tf = $('tab-form-kontrak');
    if (tf && !$('mp272Kembali')) tf.insertAdjacentHTML('afterbegin', `<div id="mp272Kembali" class="mp272-kembali"><button type="button" class="btn btn-sm btn-light border" onclick="showTab('register')"><i class="fas fa-arrow-left me-1"></i>Register Kontrak</button><span>Input kontrak baru · setelah disimpan, kontrak tampil di Register Kontrak.</span></div>`);
  }
  // sidebar: saat form terbuka, tandai Register Kontrak sebagai menu aktif
  (function () {
    const asli = window.showTab; if (typeof asli !== 'function') return;
    window.showTab = function (nama) {
      const r = asli.apply(this, arguments);
      try {
        if (nama === 'form-kontrak') {
          document.querySelectorAll('#sidebar ul.nav .nav-link').forEach(a => a.classList.toggle('active', tabDari(a) === 'register'));
          const j = $('judulHalaman'); if (j) j.textContent = 'Register Kontrak › Input Kontrak';
        }
      } catch (e) { }
      return r;
    };
  })();

  /* ---------- B. Ubah vendor baku ---------- */
  const vendorBaku = id => (typeof MASTER_VENDORS !== 'undefined' ? MASTER_VENDORS : []).find(v => !v._mp214 && String(v.id) === String(id));
  window.mdBakuAda272 = id => !!(id && vendorBaku(id));
  window.mdBaku272 = id => {
    const x = vendorBaku(id); if (!x) return;
    const MP = window.MP214 || {}, L = Array.isArray(MP.master) ? MP.master : [];
    const detail = m => { if (m && m.detail && typeof m.detail === 'object') return m.detail; const k = String((m && m.keterangan) || '').trim(); if (k.startsWith('{')) { try { return JSON.parse(k) || {}; } catch (e) { } } return {}; };   // sama dengan detailMaster MP214
    const ada = L.find(m => m.jenis === 'VENDOR' && String(detail(m).kodeSAP || '') === String(id));
    if (window.MD214) window.MD214.jenis = 'VENDOR';
    if (ada) { window.mdForm214(ada.id); return; }
    window.mdForm214();
    if (window.MD214 && window.MD214.ed) window.MD214.ed.baku = String(x.id);   // izinkan ID SAP baku pada simpan (pelengkap)
    const isi = (k, v) => { const el = $('md_' + k); if (el && !el.value) el.value = v || ''; };
    isi('nama', x.name); isi('kodeSAP', x.id); isi('kota', x.city); isi('jabatan', 'Direktur');
    isi('catatan', 'Melengkapi data vendor baku ' + x.id);
    const kode = $('md_kodeSAP'); if (kode) kode.readOnly = true;
    const info = $('mp214MdIsi') && $('mp214MdIsi').querySelector('.alert');
    if (info) info.innerHTML = '<i class="fas fa-circle-info me-1"></i>Melengkapi vendor <b>baku</b> <span class="font-monospace">' + String(x.id).replace(/[<>&"]/g, '') + '</span>: isi alamat, direktur, NPWP, dan kontak. Tersimpan di Google Sheets proyek sebagai pelengkap (master baku Excel tidak diubah) dan dipakai di BA, kontrak, serta paket tagihan.';
    setTimeout(() => { const a = $('md_alamat'); if (a) a.focus(); }, 350);
  };

  let t = 0;
  const jalan = () => { t = 0; try { rapikanMenu(); } catch (e) { } };
  const tunda = () => { if (!t) t = setTimeout(jalan, 150); };
  if (document.body) new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }));
  tunda();
})();
