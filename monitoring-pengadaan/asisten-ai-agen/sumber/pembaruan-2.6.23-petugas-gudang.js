/* MP2623 — PETUGAS GUDANG & STANDAR DESIMAL SAP HANA (pasangan Modul server 1.9.7)
 * A. Akun "Lihat saja" yang dicantumkan Admin sebagai Petugas Gudang hanya melihat menu Gudang
 *    (Penerimaan, Stok & Pengeluaran, Kartu Gudang); menu & tab lain disembunyikan, server menolak aksi lain.
 *    Surat jalan PDF Petugas diunggah lewat aksi gudangUnggahSJ (unggahBerkas kernel khusus Pengadaan).
 * B. Admin: menu akun › Petugas Gudang — centang akun "Lihat saja" yang menjadi petugas.
 * C. Kuantitas maks. 3 desimal & nilai rupiah bulat sebelum dikirim ke server (Register, Bon, Progres). */
(function () {
  'use strict';
  if (window.__MP2623__) return; window.__MP2623__ = true;
  const TAB_GD = ['gdmasuk', 'gdstok', 'gdkartu'];
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sesi = () => (typeof REG !== 'undefined' && REG && REG.sesi) || null;
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? !!window.mp220Srv(f) : false; } catch (e) { return false; } };
  const aksi = (a, x) => (typeof window.regAksi === 'function' ? window.regAksi(a, x || {}) : Promise.reject(new Error('Koneksi server belum siap.')));
  const G = { kunci: '', gudang: false, cek: false };
  window.MP2623 = G;

  /* ---------- C. standar desimal ---------- */
  const q3 = v => { const n = Number(v); return isFinite(n) ? Math.round(n * 1000) / 1000 : v; };
  const rp = v => { const n = Number(v); return isFinite(n) ? Math.round(n) : v; };
  function rapikan(a, x) {
    const d = x && x.data; if (!d || typeof d !== 'object') return;
    if ((a === 'save' || a === 'savePermintaan') && Array.isArray(d.items))
      d.items = d.items.map(i => (i && typeof i === 'object') ? Object.assign({}, i, 'vol' in i ? { vol: q3(i.vol) } : {}, 'harga' in i ? { harga: rp(i.harga) } : {}) : i);
    if (a === 'saveProgres' && d.items && typeof d.items === 'object' && !Array.isArray(d.items)) {
      const o = {}; Object.keys(d.items).forEach(k => { o[k] = q3(d.items[k]); }); d.items = o;
      if ('nilai' in d) d.nilai = rp(d.nilai);
    }
  }
  window.mp2623Q3 = q3;

  /* ---------- A. mode Petugas Gudang ---------- */
  function tabDari(el) { const m = /(?:showTab|bukaTab)\('([\w-]+)'/.exec(el.getAttribute('onclick') || '') || []; return m[1] || el.getAttribute('data-tab') || ''; }
  function terapkan() {
    const on = !!(G.gudang && sesi());
    document.body && document.body.classList.toggle('mp2623-gudang', on);
    if (!on) return;
    document.querySelectorAll('#sidebar ul.nav .nav-link').forEach(a => { const li = a.closest('li') || a; li.classList.toggle('mp2623-gd', TAB_GD.indexOf(tabDari(a)) >= 0); });
    document.querySelectorAll('#navBawah [data-tab]').forEach(b => b.classList.toggle('mp2623-gd', TAB_GD.indexOf(tabDari(b)) >= 0));
    const main = document.querySelector('main');
    if (main && !document.getElementById('mp2623Pita')) main.insertAdjacentHTML('afterbegin', '<div id="mp2623Pita" class="mp2623-pita"><i class="fas fa-warehouse"></i> <b>Mode Petugas Gudang</b> — hanya penerimaan & pengeluaran persediaan. Menu lain disembunyikan.</div>');
    const buka = [...document.querySelectorAll('main .content-tab')].find(t => t.style.display !== 'none');
    if (!buka || TAB_GD.indexOf(buka.id.replace(/^tab-/, '')) < 0) keGudang();
  }
  function keGudang() { if (typeof window.showTab === 'function' && document.getElementById('tab-gdmasuk')) { try { window.showTab('gdmasuk'); } catch (e) { } } }
  async function periksa() {
    const s = sesi(), k = s ? s.nama + '|' + s.proyek : '';
    if (k === G.kunci) return; G.kunci = k; G.gudang = false; G.cek = false;
    if (s) s.gudang = false;
    if (!s || s.admin || s.peran !== 'LIHAT' || !srv('petugasGudang')) { terapkan(); return; }
    try { const r = await aksi('gudangPetugasBaca'); if (G.kunci !== k) return; G.gudang = !!(r && r.saya); s.gudang = G.gudang; } catch (e) { G.gudang = false; }
    G.cek = true; terapkan();
  }
  window.mp2623Periksa = () => { G.kunci = '~'; return periksa(); };

  // showTab: Petugas Gudang hanya boleh tab gudang
  (function () {
    const asli = window.showTab; if (typeof asli !== 'function') return;
    window.showTab = function (nama) {
      if (G.gudang && sesi() && TAB_GD.indexOf(nama) < 0 && document.getElementById('tab-gdmasuk')) { if (window.notif) window.notif('Akun Petugas Gudang hanya dapat membuka menu Gudang.', 'warning'); arguments[0] = 'gdmasuk'; }
      return asli.apply(this, arguments);
    };
  })();
  // regAksi: desimal & surat jalan Petugas
  (function () {
    const ra = window.regAksi; if (typeof ra !== 'function') return;
    window.regAksi = function (a, x) {
      try { rapikan(a, x); } catch (e) { }
      if (a === 'unggahBerkas' && G.gudang && sesi()) a = 'gudangUnggahSJ';
      return ra.apply(this, [a].concat([].slice.call(arguments, 1)));
    };
  })();

  /* ---------- B. pengaturan Admin ---------- */
  function modal(isi) {
    let m = document.getElementById('mp2623Modal');
    if (!m) { m = document.createElement('div'); m.id = 'mp2623Modal'; m.className = 'mp2623-modal'; m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-tutup]')) m.remove(); }); document.body.appendChild(m); }
    m.innerHTML = `<div class="mp2623-kotak" role="dialog" aria-modal="true" aria-label="Petugas Gudang"><div class="mp2623-kepala"><b><i class="fas fa-warehouse"></i> Petugas Gudang</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div><div class="mp2623-isi">${isi}</div></div>`;
    return m;
  }
  async function bukaAtur() {
    const m = modal('<div class="mp2623-muat">Memuat…</div>');
    let r; try { r = await aksi('gudangPetugasBaca'); } catch (e) { m.querySelector('.mp2623-isi').innerHTML = '<div class="mp2623-gal">' + E(e.message) + '</div>'; return; }
    const C = r.calon || [];
    m.querySelector('.mp2623-isi').innerHTML = `
      <p class="mp2623-ket">Petugas Gudang adalah akun berperan <b>Lihat saja</b> yang hanya dapat membuka menu Gudang: menerima (GR) dan mengeluarkan (GI) persediaan, unggah foto & surat jalan, serta membatalkan transaksinya sendiri. Kontrak, progres, tagihan, dan menu lain disembunyikan dan ditolak server.<br>
      Belum ada akunnya? Buat dulu di <b>Pengguna &amp; Proyek</b> dengan peran <b>Lihat saja</b>.</p>
      ${C.length ? `<div class="mp2623-daftar">${C.map((c, i) => `<label class="mp2623-baris"><input type="checkbox" value="${E(c.nama)}" ${c.petugas ? 'checked' : ''}> <span><b>${E(c.nama)}</b>${c.jabatan ? ' <small>· ' + E(c.jabatan) + '</small>' : ''}</span></label>`).join('')}</div>`
        : '<div class="mp2623-gal">Belum ada akun aktif berperan "Lihat saja".</div>'}
      <div class="mp2623-aksi"><button type="button" class="btn btn-secondary" data-tutup>Batal</button><button type="button" class="btn btn-primary" id="mp2623Simpan" ${C.length ? '' : 'disabled'}>Simpan</button></div>
      <div id="mp2623Pesan" class="mp2623-pesan" role="status"></div>`;
    const b = document.getElementById('mp2623Simpan');
    if (b) b.onclick = async () => {
      b.disabled = true; const daftar = [...m.querySelectorAll('.mp2623-daftar input:checked')].map(x => x.value);
      try { const h = await aksi('gudangPetugasSimpan', { data: { daftar } }); document.getElementById('mp2623Pesan').innerHTML = '<span class="ok">Tersimpan · ' + h.daftar.length + ' Petugas Gudang. Berlaku saat petugas masuk berikutnya.</span>'; }
      catch (e) { document.getElementById('mp2623Pesan').innerHTML = '<span class="gal">' + E(e.message) + '</span>'; }
      b.disabled = false;
    };
  }
  window.mp2623BukaAtur = bukaAtur;
  function pasangMenu() {
    const s = sesi(), ul = document.querySelector('.menu-akun .dropdown-menu'); if (!ul) return;
    const ada = document.getElementById('mp2623Menu'), boleh = !!(s && s.admin && srv('petugasGudang'));
    if (!boleh) { if (ada) ada.closest('li').remove(); return; }
    if (ada) return;
    const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" id="mp2623Menu" href="#"><i class="fas fa-warehouse me-2"></i>Petugas Gudang</a>';
    ul.appendChild(li); li.firstChild.addEventListener('click', e => { e.preventDefault(); bukaAtur(); });
  }

  let t = 0;
  const jalan = () => { t = 0; periksa(); pasangMenu(); if (G.gudang) terapkan(); };
  const tunda = () => { if (!t) t = setTimeout(jalan, 150); };
  if (document.body) new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }));
  setInterval(jalan, 3000);
  tunda();
})();
