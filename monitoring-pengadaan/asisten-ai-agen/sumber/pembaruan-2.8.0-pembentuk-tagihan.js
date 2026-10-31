/* MP280 — PEMBENTUK TAGIHAN (Rilis B; Modul server 1.10.0+ Paket Tagihan)
 * A. Simpan progres (BK) baru → draf Paket Tagihan otomatis terbentuk & siap dicetak (penerimaan otomatis Bahan ikut sebagai lampiran surat jalan).
 * B. Menu "Pembentuk Tagihan": seluruh BK dengan kelengkapan SAP (BA terbit, PO, SES/GR, MIRO, faktur, no. tagihan) & status paket.
 *    Paket dapat dibentuk meskipun kelengkapan belum lengkap (kekurangan ditampilkan sebagai peringatan, tidak memblokir).
 * C. "Bentuk semua yang belum": inisialisasi paket untuk BK/dokumen lama agar Paket Tagihan tidak tampak kosong; status efektif
 *    (Terverifikasi/Diajukan/Dibayar) tetap dibaca dari Checklist & Keuangan dan Bayar. */
(function () {
  'use strict';
  if (window.__MP280__) return; window.__MP280__ = true;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const rp = n => 'Rp ' + Math.round(N(n)).toLocaleString('id-ID');
  const sesi = () => (typeof REG !== 'undefined' && REG && REG.sesi) || null;
  const kabar = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || 'ok'); } catch (e) { } };
  const siap = () => typeof window.mp270Siap === 'function' && window.mp270Siap();
  const boleh = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN')); };
  const progres = () => { try { return (typeof PROG !== 'undefined' && PROG && PROG.data) || []; } catch (e) { return []; } };
  const SAP = [['ses', 'SES'], ['gr', 'GR'], ['miro', 'MIRO'], ['faktur', 'Faktur'], ['tagihan', 'No. tagihan']];
  const S = { daftar: null, muat: false, galat: '', saring: 'belum', cari: '', jalan: null };
  window.MP280 = S;

  /* ---------- A. otomatis setelah simpan progres ---------- */
  async function setelahProgres(r, data) {
    if (!r || !r.data || !r.data.id || !data || data.id || !siap() || !boleh()) return;   // hanya BK baru (revisi memakai paket yang sudah ada)
    const id = r.data.id, key = r.data.noKontrak;
    let gr = [];
    for (let i = 0; i < 25; i++) {   // tunggu penerimaan otomatis (MP273) selesai, maks. ±5 detik
      const t = window.MP273 && window.MP273.terakhir;
      if (t && t.progresId === id) { gr = ((t.hasil && t.hasil.data) || []).map(x => x.id); break; }
      if (!(window.MP273 && /\/(SPM|SPPM)\//i.test(key))) break;
      await new Promise(ok => setTimeout(ok, 200));
    }
    try {
      const h = await window.mp270BuatOtomatis(key, id, { grIds: gr });
      if (h.baru) kabar('Draf Paket Tagihan ' + h.paket.id + ' terbentuk untuk ' + (r.data.nomorBA || key) + ' — siap dicetak di Paket Tagihan.', 'ok');
      S.daftar = null;
    } catch (e) { kabar('Paket tagihan belum terbentuk otomatis: ' + e.message + ' (bisa dibentuk dari menu Pembentuk Tagihan).', 'warning'); }
  }
  (function () {
    const ra = window.regAksi; if (typeof ra !== 'function') return;
    window.regAksi = async function (a, x) {
      const r = await ra.apply(this, arguments);
      if (a === 'saveProgres') setelahProgres(r, x && x.data);
      return r;
    };
  })();

  /* ---------- B. menu Pembentuk Tagihan ---------- */
  function pasangTab() {
    const main = document.querySelector('main');
    if (main && !$('tab-pembentuk')) {
      const d = document.createElement('div'); d.id = 'tab-pembentuk'; d.className = 'content-tab'; d.style.display = 'none';
      d.innerHTML = '<h3 class="fw-bold mb-1">Pembentuk Tagihan</h3><p class="text-muted petunjuk mb-2">Setiap BK (Input Progres) dibentuk menjadi Paket Tagihan siap cetak. Kelengkapan SAP yang belum ada ditampilkan sebagai peringatan dan <b>tidak menghalangi</b> pembentukan tagihan.</p><div id="mp280Isi"></div>';
      const akhir = [...main.querySelectorAll('.content-tab')].pop(); if (akhir) akhir.after(d); else main.appendChild(d);
    }
    const ul = document.querySelector('#sidebar ul.nav');
    if (ul && !$('mp280Nav')) {
      const acuan = [...ul.querySelectorAll('.nav-link')].find(a => /showTab\('keuangan'/.test(a.getAttribute('onclick') || ''));
      const li = document.createElement('li'); li.className = 'nav-item mb-2'; li.id = 'mp280Nav';
      li.innerHTML = '<a class="nav-link d-flex align-items-center" onclick="showTab(\'pembentuk\', event)"><i class="fas fa-file-circle-plus me-2"></i>Pembentuk Tagihan</a>';
      if (acuan) (acuan.closest('li') || acuan).after(li); else ul.appendChild(li);
    }
  }
  (function () {
    const asli = window.showTab; if (typeof asli !== 'function') return;
    window.showTab = function (nama) {
      const r = asli.apply(this, arguments);
      if (nama === 'pembentuk') { try { const j = $('judulHalaman'); if (j) j.textContent = 'Pembentuk Tagihan'; } catch (e) { } muat(); }
      return r;
    };
  })();
  async function muat(paksa) {
    gambar();
    if (!siap()) { S.galat = 'Modul server Paket Tagihan (1.10.0+) belum aktif atau aplikasi belum terhubung ke server.'; gambar(); return; }
    if (S.muat || (S.daftar && !paksa)) return;
    S.muat = true; S.galat = ''; gambar();
    try { S.daftar = await window.mp270Daftar(); } catch (e) { S.galat = e.message; }
    S.muat = false; gambar();
  }
  function baris() {
    const paket = {}; (S.daftar || []).filter(x => x.status !== 'BATAL').forEach(x => { paket[x.progresId] = x; });
    return progres().slice().sort((a, b) => String(b.dibuatPada || '').localeCompare(String(a.dibuatPada || ''))).map(e => {
      const kurang = SAP.filter(([k]) => !String(e[k] || '').trim()).map(x => x[1]);
      if (!e.baTerbit) kurang.unshift('BA belum terbit');
      if (!String(e.noPO || '').trim()) kurang.unshift('PO');
      return { e, p: paket[e.id] || null, kurang };
    });
  }
  function gambar() {
    const el = $('mp280Isi'); if (!el) return;
    const L = baris(), q = S.cari.trim().toLowerCase();
    const tampil = L.filter(x => (S.saring === 'semua' || (S.saring === 'belum' ? !x.p : S.saring === 'kurang' ? x.kurang.length : !!x.p)) &&
      (!q || [x.e.noKontrak, x.e.nomorBA, x.e.periode, x.p && x.p.namaVendor].join(' ').toLowerCase().includes(q)));
    const nBelum = L.filter(x => !x.p).length;
    const chip = (k, l, n) => `<button type="button" class="reg-chip ${S.saring === k ? 'aktif' : ''}" onclick="mp280Saring('${k}')">${l}<span class="n">${n}</span></button>`;
    el.innerHTML = `${S.galat ? `<div class="alert alert-warning small py-2">${E(S.galat)}</div>` : ''}${S.muat ? '<div class="small text-muted mb-2"><i class="fas fa-spinner fa-spin me-1"></i>Memuat paket tagihan…</div>' : ''}
      ${S.jalan ? `<div class="mp280-jalan"><b>${E(S.jalan.judul)}</b> ${S.jalan.n}/${S.jalan.total} · berhasil ${S.jalan.ok} · gagal ${S.jalan.gagal.length}${S.jalan.gagal.length ? `<ul>${S.jalan.gagal.slice(0, 20).map(g => `<li>${E(g)}</li>`).join('')}</ul>` : ''}</div>` : ''}
      <div class="card shadow-sm p-3"><div class="d-flex flex-wrap gap-2 align-items-center mb-2">
        ${chip('belum', 'Belum ada paket', nBelum)}${chip('kurang', 'Kelengkapan SAP kurang', L.filter(x => x.kurang.length).length)}${chip('ada', 'Sudah ada paket', L.length - nBelum)}${chip('semua', 'Semua BK', L.length)}
        <input type="search" class="form-control form-control-sm ms-auto" style="max-width:260px" placeholder="Cari kontrak, No BA, periode…" value="${E(S.cari)}" oninput="mp280Cari(this.value)">
        ${boleh() && siap() ? `<button type="button" class="btn btn-sm btn-primary" id="mp280Semua" ${nBelum && !S.jalan ? '' : 'disabled'} onclick="mp280BentukSemua()"><i class="fas fa-layer-group me-1"></i>Bentuk semua yang belum (${nBelum})</button>` : ''}
        <button type="button" class="btn btn-sm btn-light border" title="Muat ulang" onclick="mp280Muat()"><i class="fas fa-rotate"></i></button></div>
      <div class="table-responsive"><table class="table table-sm align-middle mb-0 mp280-t"><thead><tr><th>BK / No BA</th><th>Kontrak</th><th>Periode</th><th class="text-end">Nilai BK</th><th>Kelengkapan SAP</th><th>Paket tagihan</th><th></th></tr></thead><tbody>
      ${tampil.length ? tampil.map(x => `<tr data-id="${E(x.e.id)}"><td><code>${E(x.e.nomorBA || '-')}</code><div class="small text-muted">Tagihan ke-${E(x.e.tagihanKe)}</div></td>
        <td class="small"><span class="font-monospace">${E(x.e.noKontrak)}</span>${x.p ? `<div class="text-muted">${E(x.p.namaVendor || '')}</div>` : ''}</td><td>${E(x.e.periode || '')}</td><td class="text-end">${rp(x.e.nilai)}</td>
        <td>${x.kurang.length ? x.kurang.map(k => `<span class="mp280-k">${E(k)}</span>`).join(' ') : '<span class="mp280-k ok">Lengkap</span>'}</td>
        <td>${x.p ? `<span class="mp270-st st-${String(x.p.statusEfektif || x.p.status || '').replace(/\s+/g, '-').toLowerCase()}">${E(x.p.statusEfektif || x.p.status)}</span><div class="small text-muted font-monospace">${E(x.p.id)}</div>` : '<span class="text-muted small">belum ada</span>'}</td>
        <td class="text-end text-nowrap">${x.p ? `<button type="button" class="btn btn-sm btn-outline-primary py-0" onclick="mp270Buka(${E(JSON.stringify(x.e.noKontrak))},${E(JSON.stringify(x.e.id))})">Buka</button>`
          : boleh() && siap() ? `<button type="button" class="btn btn-sm btn-primary py-0" onclick="mp280Bentuk(${E(JSON.stringify(x.e.id))})"><i class="fas fa-file-circle-plus me-1"></i>Bentuk</button>` : ''}</td></tr>`).join('')
        : `<tr><td colspan="7" class="text-center text-muted py-4">${S.daftar === null && !S.galat ? 'Memuat…' : 'Tidak ada BK pada saringan ini.'}</td></tr>`}</tbody></table></div></div>`;
  }
  async function bentuk(id, diam) {
    const e = progres().find(x => x.id === id); if (!e) throw new Error('BK tidak ditemukan.');
    const h = await window.mp270BuatOtomatis(e.noKontrak, e.id);
    if (!diam) { kabar(h.baru ? 'Paket ' + h.paket.id + ' terbentuk untuk ' + e.nomorBA + '.' : 'BK ' + e.nomorBA + ' sudah memiliki paket.', 'ok'); S.daftar = null; await muat(true); }
    return h;
  }
  Object.assign(window, {
    mp280Muat: () => { S.daftar = null; return muat(true); },
    mp280Saring: k => { S.saring = k; gambar(); },
    mp280Cari: v => { S.cari = v; clearTimeout(S._t); S._t = setTimeout(gambar, 200); },
    mp280Bentuk: async id => { try { await bentuk(id); } catch (e) { kabar(e.message, 'err'); } },
    mp280BentukSemua: async () => {
      const L = baris().filter(x => !x.p);
      if (!L.length) return;
      if (typeof window.tanya === 'function' ? !(await window.tanya('Bentuk draf paket tagihan untuk ' + L.length + ' BK yang belum memiliki paket?\nStatus Terverifikasi/Diajukan/Dibayar tetap dibaca dari Checklist & Keuangan dan Bayar.', { judul: 'Bentuk semua paket', ok: 'Bentuk ' + L.length + ' paket' })) : !confirm('Bentuk ' + L.length + ' paket tagihan?')) return;
      S.jalan = { judul: 'Membentuk paket…', n: 0, total: L.length, ok: 0, gagal: [] }; gambar();
      for (const x of L) {
        try { await bentuk(x.e.id, true); S.jalan.ok++; } catch (err) { S.jalan.gagal.push((x.e.nomorBA || x.e.id) + ': ' + err.message); }
        S.jalan.n++; gambar();
      }
      S.jalan.judul = 'Selesai.'; S.daftar = null; await muat(true);
      kabar('Pembentuk Tagihan: ' + S.jalan.ok + ' paket terbentuk' + (S.jalan.gagal.length ? ', ' + S.jalan.gagal.length + ' gagal (lihat daftar)' : '') + '.', S.jalan.gagal.length ? 'warning' : 'ok');
      setTimeout(() => { S.jalan = null; gambar(); }, 15000);
    }
  });

  let t = 0;
  const jalan = () => { t = 0; try { pasangTab(); } catch (e) { } };
  const tunda = () => { if (!t) t = setTimeout(jalan, 200); };
  if (document.body) new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }));
  tunda();
})();
