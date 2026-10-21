/* MP266 — PEMBARUAN 2.6.6: GANTI PROYEK & SIAPKAN PROYEK BARU (butuh Modul server 1.9.2 · fitur "multiProyek")
 *  1. Ganti Proyek tanpa keluar-masuk: klik nama proyek di atas / menu akun › Ganti proyek / Ctrl+K "proyek". Hanya proyek yang boleh
 *     dibuka akun ini. Server memeriksa akses, lalu aplikasi dimuat ulang dengan data proyek tujuan (cache proyek lama tidak terbawa).
 *  2. Siapkan proyek baru (Admin): salin setelan Notifikasi & Kantor AI dari proyek sumber, grup berbagi Master Data & Arsip Vendor,
 *     akses pengguna. Data transaksi proyek baru mulai kosong; data proyek lain tidak diubah. */
(function () {
  'use strict';
  if (window.__MP266__) return; window.__MP266__ = true;
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const $ = id => document.getElementById(id);
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const adm = () => !!(sesi() && sesi().admin);
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const kini = () => (typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || (sesi() && sesi().proyek) || '';
  const angka = n => Number(n || 0).toLocaleString('id-ID');
  const PY = { info: null, muat: false, galat: '', siap: false, hasil: null, sibuk: false };
  window.MP266_PY = PY;
  const muatUlang = () => (window.mp266MuatUlang || (() => location.reload()))();
  function adaIsian() {
    return [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=search]):not([readonly]), textarea:not([readonly])')]
      .some(el => el.offsetParent !== null && !el.closest('#mp266Py') && el.value && el.value !== el.defaultValue);
  }
  async function kirim(action, data) {
    const s = sesi(); const r = await window.regPost(Object.assign({ action, nama: s.nama, pin: s.pin, proyek: kini() }, data === undefined ? {} : { data }));
    if (!r || !r.ok) throw new Error((r && r.error) || 'Gagal menghubungi server.'); return r;
  }
  async function muatInfo() {
    PY.muat = true; PY.galat = ''; gambar();
    try {
      if (srv('multiProyek')) PY.info = await kirim('pyInfo');
      else {   // server < 1.9.2: daftar proyek aktif publik + akses dari daftar pengguna tersimpan
        const r = await fetch(REG.url + (REG.url.includes('?') ? '&' : '?') + 'action=proyek&t=' + Date.now(), { cache: 'no-store' }).then(x => x.json());
        const u = (REG.users || []).find(x => x.nama === sesi().nama) || {}, d = String(u.proyek || '*').split(',').map(t => t.trim());
        PY.info = { proyek: (r.data || []).map(p => ({ id: p.id, nama: p.nama, aktif: true, boleh: d.includes('*') || d.includes(p.id), kini: p.id === kini() })), lama: true };
      }
    } catch (e) { PY.galat = e.message || String(e); }
    PY.muat = false; gambar();
  }
  window.mp266Buka = () => {
    if (!sesi() || !REG.url) return pesan('Ganti proyek memerlukan koneksi server & sudah masuk.', 'err');
    if (!$('mp266Py')) { const w = document.createElement('div'); w.id = 'mp266Py'; w.className = 'mp266-lapis'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Ganti proyek');
      w.addEventListener('mousedown', ev => { if (ev.target === w) w.remove(); }); w.addEventListener('keydown', ev => { if (ev.key === 'Escape') w.remove(); }); document.body.appendChild(w); }
    PY.siap = false; PY.hasil = null; muatInfo();
  };
  window.mp266Pindah = async id => {
    const s = sesi(); if (!s || id === kini()) return;
    if (adaIsian() && !window.confirm('Ada isian form yang belum disimpan. Simpan dahulu agar tidak hilang.\n\nTetap pindah proyek?')) return;
    PY.sibuk = true; gambar();
    try {
      const r = await window.regPost({ action: 'login', nama: s.nama, pin: s.pin, proyek: id });   // server memeriksa akses ke proyek tujuan
      if (!r || !r.ok) throw new Error((r && r.error) || 'Tidak dapat membuka proyek ' + id + '.');
      const baru = Object.assign({}, s, { proyek: id, cfg: Object.assign({}, r.proyek || { id }) });
      if (typeof tulisSimpan === 'function' && typeof KUNCI_SESI !== 'undefined') {
        tulisSimpan(KUNCI_SESI, baru);
        try { if (typeof KUNCI_INGAT !== 'undefined' && typeof bacaSimpan === 'function') { const ing = bacaSimpan(KUNCI_INGAT); if (ing && ing.nama === s.nama) tulisSimpan(KUNCI_INGAT, Object.assign({}, ing, { proyek: id })); } } catch (e) { }
        try { sessionStorage.setItem('mp266Pindah', JSON.stringify({ id, nama: (r.proyek && r.proyek.nama) || '' })); } catch (e) { }
        muatUlang();
      } else {   // cadangan: layar masuk dengan proyek tujuan terpilih
        if (typeof window.keluarLogin === 'function') window.keluarLogin();
        setTimeout(() => { const p = $('loginProyek'); if (p) p.value = id; pesan('Masukkan kata sandi untuk membuka proyek ' + id + '.', 'ok'); }, 300);
      }
    } catch (e) { PY.sibuk = false; PY.galat = e.message || String(e); gambar(); }
  };
  window.mp266Siapkan = () => { PY.siap = !PY.siap; PY.hasil = null; gambar(); };
  window.mp266Jalankan = async () => {
    const v = id => $(id), tujuan = v('mp266Tujuan').value, sumber = v('mp266Sumber').value;
    if (!tujuan) return pesan('Pilih proyek baru.', 'err');
    const grup = [...document.querySelectorAll('#mp266Py input[name=mp266Grup]:checked')].map(x => x.value);
    const akses = [...document.querySelectorAll('#mp266Py input[name=mp266Akses]')];
    const tambah = akses.filter(x => x.checked).map(x => x.value), lepas = akses.filter(x => !x.checked && x.dataset.ada === '1').map(x => x.value);
    if (grup.length === 1) return pesan('Grup berbagi minimal 2 proyek — centang proyek sumber dan proyek baru, atau kosongkan semua.', 'err');
    PY.sibuk = true; gambar();
    try {
      let r = await kirim('pySiapkan', { sumber, tujuan, salin: { notif: v('mp266SNotif').checked, tim: v('mp266STim').checked }, grup });
      const hasil = r.hasil || [];
      if (tambah.length || lepas.length) { r = await kirim('pyAkses', { proyek: tujuan, tambah, lepas }); if (r.diubah && r.diubah.length) hasil.push('Akses pengguna: ' + r.diubah.join(', ')); }
      PY.info = r; PY.hasil = hasil; pesan('Proyek ' + tujuan + ' siap dipakai.', 'ok');
    } catch (e) { PY.galat = e.message || String(e); }
    PY.sibuk = false; gambar();
  };
  function kartuProyek(p) {
    const kosong = !p.kontrak && !p.tagihan && !p.permintaan;
    return `<div class="mp266-p ${p.kini ? 'kini' : ''}"><div class="mp266-pi"><b><code>${E(p.id)}</code> ${E(p.nama || '')}</b>
        <small>${p.kini ? '<span class="mp266-tag kini">Sedang dibuka</span>' : ''}${p.berbagi ? '<span class="mp266-tag">Master & arsip bersama</span>' : ''}${p.aktif === false ? '<span class="mp266-tag mati">Nonaktif</span>' : ''}
        ${PY.info.lama ? '' : kosong ? 'Belum ada data — proyek baru' : angka(p.kontrak) + ' kontrak · ' + angka(p.tagihan) + ' tagihan · ' + angka(p.permintaan) + ' permintaan'}</small></div>
      ${p.kini ? '' : p.boleh ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp266Pindah('${E(p.id)}')" ${PY.sibuk ? 'disabled' : ''}><i class="fas fa-right-left me-1"></i>Buka</button>` : `<span class="mp266-sub">${adm() ? 'beri akses dahulu ↓' : 'tanpa akses'}</span>`}</div>`;
  }
  function formSiapkan() {
    const L = PY.info.proyek || [], k = kini(), calon = L.filter(p => p.id !== k), def = calon.find(p => !p.kontrak && !p.tagihan) || calon[0];
    if (!calon.length) return `<div class="mp266-info">Belum ada proyek lain. Buat dahulu di <b>Pengguna &amp; Proyek › Proyek</b> (ID, nama, kode nomor kontrak, Kepala Proyek, Kasi), lalu buka lagi menu ini.</div>`;
    const tuj = ($('mp266Tujuan') && $('mp266Tujuan').value) || (def && def.id), g = PY.info.grup || [], U = (PY.info.pengguna || []).filter(u => String(u.proyek || '*').split(',').map(t => t.trim()).indexOf('*') < 0);
    const punya = (u, id) => String(u.proyek || '').split(',').map(t => t.trim()).indexOf(id) >= 0;
    return `<div class="mp266-form">
      <div class="mp266-g2"><label>Proyek baru<select id="mp266Tujuan" class="form-select form-select-sm" onchange="MP266_PY.hasil=null;mp266Gambar()">${calon.map(p => `<option value="${E(p.id)}" ${p.id === tuj ? 'selected' : ''}>${E(p.id + ' · ' + (p.nama || ''))}${!p.kontrak && !p.tagihan ? ' (kosong)' : ''}</option>`).join('')}</select></label>
        <label>Salin setelan dari<select id="mp266Sumber" class="form-select form-select-sm">${L.map(p => `<option value="${E(p.id)}" ${p.id === k ? 'selected' : ''}>${E(p.id + ' · ' + (p.nama || ''))}</option>`).join('')}</select></label></div>
      <fieldset><legend>Setelan yang disalin</legend>
        <label class="mp266-cb"><input type="checkbox" id="mp266SNotif" checked> Notifikasi (penerima email/Telegram, jam kirim)</label>
        <label class="mp266-cb"><input type="checkbox" id="mp266STim" checked> Kantor AI / Tim AI (jadwal, mode terus-menerus)</label>
        <small>Setelan Asisten AI &amp; Verifikasi Tagihan sudah berlaku untuk semua proyek. Identitas pelaksana (KSO) diisi di proyek baru. Setelan yang sudah ada di proyek baru tidak ditimpa.</small></fieldset>
      <fieldset><legend>Master Data &amp; Arsip Dokumen Vendor bersama</legend>
        ${L.map(p => `<label class="mp266-cb"><input type="checkbox" name="mp266Grup" value="${E(p.id)}" ${g.indexOf(p.id) >= 0 || p.id === k || p.id === tuj ? 'checked' : ''}> <code>${E(p.id)}</code> ${E(p.nama || '')}</label>`).join('')}
        <small>Proyek yang dicentang memakai master &amp; arsip vendor yang sama. Proyek lain hanya dibaca — perubahan disimpan di proyek yang sedang dibuka. Jangan centang proyek uji coba.</small></fieldset>
      <fieldset><legend>Akses pengguna ke proyek ${E(tuj || '')}</legend>
        ${U.length ? U.map(u => `<label class="mp266-cb"><input type="checkbox" name="mp266Akses" value="${E(u.nama)}" data-ada="${punya(u, tuj) ? 1 : 0}" ${punya(u, tuj) ? 'checked' : ''}> ${E(u.nama)} <small>${E(u.peran)} · ${E(u.proyek)}</small></label>`).join('') : '<small>Semua pengguna aktif sudah berakses ke seluruh proyek ("*").</small>'}
        <small>Akun berakses "*" otomatis bisa membuka semua proyek.</small></fieldset>
      <div class="mp266-info"><i class="fas fa-shield-halved me-1"></i>Data transaksi proyek baru (kontrak, BK, permintaan, PBJ, gudang, checklist) mulai <b>kosong</b>. Data proyek lain <b>tidak diubah</b>.</div>
      ${PY.hasil ? `<div class="mp266-ok"><b><i class="fas fa-circle-check me-1"></i>Selesai</b><ul>${PY.hasil.map(h => '<li>' + E(h) + '</li>').join('')}</ul></div>` : ''}
      <div class="mp266-a"><button type="button" class="btn btn-sm btn-success" onclick="mp266Jalankan()" ${PY.sibuk ? 'disabled' : ''}><i class="fas fa-wand-magic-sparkles me-1"></i>Siapkan proyek</button>
        ${PY.hasil && tuj ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp266Pindah('${E(tuj)}')"><i class="fas fa-right-left me-1"></i>Buka proyek ${E(tuj)}</button>` : ''}</div></div>`;
  }
  function gambar() {
    const w = $('mp266Py'); if (!w) return;
    const L = (PY.info && PY.info.proyek) || [];
    w.innerHTML = `<div class="mp266-dlg"><header><b><i class="fas fa-building me-2"></i>Ganti proyek</b><small>Data tiap proyek terpisah. Master Data &amp; Arsip Vendor dapat dibagi antar proyek.</small><button type="button" class="btn-close" aria-label="Tutup" onclick="document.getElementById('mp266Py').remove()"></button></header>
      <div class="mp266-isi">${PY.muat && !PY.info ? '<div class="mp266-sub"><i class="fas fa-spinner fa-spin me-1"></i>Memuat daftar proyek…</div>' : ''}
        ${PY.galat ? `<div class="alert alert-danger py-1 px-2">${E(PY.galat)}</div>` : ''}
        ${PY.sibuk && !PY.siap ? '<div class="mp266-sub"><i class="fas fa-spinner fa-spin me-1"></i>Membuka proyek…</div>' : ''}
        ${L.length ? L.map(kartuProyek).join('') : PY.info ? '<div class="mp266-sub">Tidak ada proyek lain yang dapat dibuka akun ini.</div>' : ''}
        ${adm() && PY.info && !PY.info.lama ? `<button type="button" class="mp266-tog" onclick="mp266Siapkan()" aria-expanded="${PY.siap}"><i class="fas fa-${PY.siap ? 'chevron-up' : 'plus'} me-1"></i>Siapkan proyek baru (Admin)</button>${PY.siap ? formSiapkan() : ''}` : ''}
        ${adm() && PY.info && PY.info.lama ? '<div class="mp266-info">Pasang <b>Modul server 1.9.2</b> untuk menyiapkan proyek baru, Master Data &amp; Arsip Vendor bersama.</div>' : ''}</div></div>`;
  }
  window.mp266Gambar = gambar;
  /* ---------- pintu masuk ---------- */
  function pasang() {
    if (!sesi()) return;
    const dd = document.querySelector('.app-header .menu-akun .dropdown-menu') || document.querySelector('.menu-akun .dropdown-menu');
    if (dd && !$('mp266Menu')) { const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp266Menu" onclick="mp266Buka();return false;"><i class="fas fa-right-left me-2"></i>Ganti proyek</a>'; dd.appendChild(li); }
    const id = kini(); if (!id) return;
    document.querySelectorAll('.app-header *, header *, aside *, nav *, .sidebar *, #sidebar *').forEach(el => {
      const bukanChip = e => !!e.querySelector('.menu-akun,.dropdown-menu,input,button,select,textarea');
      if (el.dataset.mp266 || el.childElementCount > 4 || bukanChip(el) || el.closest('#mp266Py,.dropdown-menu,button,a,input,select')) return;
      const t = (el.textContent || '').trim(); if (t.length > 160 || t.indexOf(id) !== 0) return;
      const p = el.parentElement, tp = p ? (p.textContent || '').trim() : '';
      if (p && tp.indexOf(id) === 0 && tp.length <= 160 && p.childElementCount <= 4 && !bukanChip(p) && !p.matches('header,aside,nav,body,.app-header')) return;   // pakai wadah terluar saja
      el.dataset.mp266 = '1'; el.classList.add('mp266-chip'); el.setAttribute('role', 'button'); el.tabIndex = 0; el.title = 'Ganti proyek';
      el.addEventListener('click', () => window.mp266Buka()); el.addEventListener('keydown', ev => { if (ev.key === 'Enter') window.mp266Buka(); });
    });
  }
  let _o = 0;
  const obs = () => { if (!document.body) return; new MutationObserver(() => { if (_o) return; _o = setTimeout(() => { _o = 0; pasang(); }, 400); }).observe(document.body, { childList: true, subtree: true }); pasang(); };
  if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
  window.addEventListener('load', () => setTimeout(() => {
    let x = null; try { x = JSON.parse(sessionStorage.getItem('mp266Pindah') || 'null'); sessionStorage.removeItem('mp266Pindah'); } catch (e) { }
    if (x && x.id) pesan('Proyek aktif: ' + x.id + (x.nama ? ' · ' + x.nama : '') + '. Data proyek ini dimuat.', 'ok');
  }, 800));
  const cmd = window.itemCmdk;
  if (typeof cmd === 'function') window.itemCmdk = function (q) {
    const out = cmd.apply(this, arguments) || [], t = String(q || '').trim().toLowerCase();
    try { if (sesi() && t.length >= 2 && /proyek|project|ganti|pindah/.test(t)) out.unshift({ grup: 'Proyek', ik: 'fa-right-left', l: 'Ganti proyek' + (adm() ? ' / siapkan proyek baru' : ''), s: 'Proyek ' + kini(), aksi: () => window.mp266Buka() }); } catch (e) { }
    return out;
  };
})();
