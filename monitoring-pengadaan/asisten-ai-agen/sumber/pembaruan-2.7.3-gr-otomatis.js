/* MP273 — PENERIMAAN GUDANG OTOMATIS DARI INPUT PROGRES (pasangan Modul server 1.10.2)
 * A. Simpan progres kontrak material (SPM/SPPM): setiap item dicocokkan ke item Bon Permintaan
 *    (No Bon pada item kontrak → alokasi Bon → kode material yang unik di seluruh Bon), lalu server mencatat GR otomatis sebesar
 *    progres s.d. saat ini − yang sudah diterima gudang (anti dobel; dijalankan ulang = 0). GR otomatis ditandai "foto belum lengkap".
 * B. Menu Gudang: pita daftar penerimaan otomatis yang menunggu foto + tombol "Lengkapi foto" (4 foto lapangan, surat jalan opsional).
 *    Penerimaan yang dicatat gudang belakangan untuk item bon yang sama otomatis menggabungkan GR otomatis (server). */
(function () {
  'use strict';
  if (window.__MP273__) return; window.__MP273__ = true;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lower = s => String(s == null ? '' : s).trim().toLowerCase();
  const q3 = v => Math.round((Number(v) || 0) * 1000) / 1000;
  const sesi = () => (typeof REG !== 'undefined' && REG && REG.sesi) || null;
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? !!window.mp220Srv(f) : false; } catch (e) { return false; } };
  const kabar = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || 'ok'); } catch (e) { } };
  const SISI = ['Tampak Depan', 'Tampak Belakang', 'Samping Kanan', 'Samping Kiri'];

  /* ---------- A. item kontrak → item Bon ---------- */
  function daftarBon() { try { return (typeof PMT !== 'undefined' && PMT && Array.isArray(PMT.data)) ? PMT.data : []; } catch (e) { return []; } }
  function cocokItem(bon, kode, uraian) {
    const L = (bon && bon.items) || [];
    let i = kode ? L.findIndex(x => String(x.kode || '').trim() === kode) : -1;
    if (i < 0 && uraian) i = L.findIndex(x => lower(x.uraian) === lower(uraian));
    return i;
  }
  function petaBon(noKontrak, it) {
    const kode = String(it.kodeItem || it.kode || it.itemService || '').trim(), uraian = it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || '', B = daftarBon();
    // 1) No Bon / No Permintaan pada item kontrak (Register & Master)
    const nomor = String(it.noBonPermintaan || it.noPermintaan || '').trim();
    if (nomor) { const b = B.find(x => x.nomor === nomor); const i = cocokItem(b, kode, uraian); if (i >= 0) return { bonNomor: b.nomor, bonIdx: i, cara: 'No Bon item kontrak' }; }
    // 2) item Register Kontrak ber-No Permintaan
    try {
      const reg = (REG.data || []).find(r => r.noKontrak === noKontrak);
      const ri = reg && (reg.items || []).find(x => x.noPermintaan && ((kode && String(x.kode || '').trim() === kode) || lower(x.uraian) === lower(uraian)));
      if (ri) { const b = B.find(x => x.nomor === ri.noPermintaan), i = cocokItem(b, kode, uraian); if (i >= 0) return { bonNomor: b.nomor, bonIdx: i, cara: 'Register Kontrak' }; }
    } catch (e) { }
    // 3) alokasi Bon → kontrak (Master Data / PBJ)
    try {
      const A = ((window.MP214 && window.MP214.alok) || []).filter(a => !a.batal && a.noKontrak === noKontrak);
      for (const a of A) { const b = B.find(x => x.nomor === a.bonNomor), x = b && (b.items || [])[Number(a.bonIdx)]; if (x && ((kode && String(x.kode || '').trim() === kode) || lower(x.uraian) === lower(uraian))) return { bonNomor: b.nomor, bonIdx: Number(a.bonIdx), cara: 'alokasi Bon' }; }
    } catch (e) { }
    // 4) kode material unik di seluruh Bon
    if (kode) { const cal = []; B.forEach(b => (b.items || []).forEach((x, i) => { if (String(x.kode || '').trim() === kode && Number(x.vol) > 0) cal.push({ bonNomor: b.nomor, bonIdx: i }); })); if (cal.length === 1) return Object.assign(cal[0], { cara: 'kode material unik' }); }
    return null;
  }
  window.mp273PetaBon = petaBon;
  const bahan = (g, no) => /\/(SPM|SPPM)\//i.test(String(no || (g && g.key) || '')) || ((g && g.items) || []).some(i => String(i.kelompok || '').toUpperCase() === 'BAHAN');

  function siapkan(data) {   // dihitung SEBELUM simpan (FP masih berisi isian form)
    try {
      if (typeof FP === 'undefined' || !FP || !FP.g || !data || !data.items || data.terbit) return null;
      const g = FP.g; if (g.key !== data.noKontrak || !bahan(g, data.noKontrak)) return null;
      const lalu = typeof sdLaluMap === 'function' ? sdLaluMap(g, FP.edit) : {};
      const baris = [], lepas = [];
      Object.keys(data.items).forEach(id => {
        const idx = g.items.findIndex((it, i) => (typeof idItem === 'function' ? idItem(g, it, i) : (it.kodeUnik || g.key + '#' + i)) === id); if (idx < 0) return;
        const it = g.items[idx], sd = q3((Number(lalu[id]) || 0) + (Number(data.items[id]) || 0)), p = petaBon(data.noKontrak, it);
        const uraian = it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || '';
        if (p) baris.push({ bonNomor: p.bonNomor, bonIdx: p.bonIdx, kode: String(it.kodeItem || it.kode || '').trim(), uraian, sd });
        else lepas.push(uraian);
      });
      return { baris, lepas };
    } catch (e) { console.warn('MP273', e); return null; }
  }
  async function jalankan(ctx, progresId) {
    if (!ctx || !progresId || !srv('gudangOtomatis')) return;
    let r = null;
    if (ctx.baris.length) { try { r = await window.regAksi('gudangOtomatisProgres', { data: { progresId, baris: ctx.baris } }); } catch (e) { kabar('Penerimaan gudang otomatis gagal: ' + e.message, 'err'); return; } }
    const n = r && r.data ? r.data.length : 0;
    const pesan = [];
    if (n) pesan.push('Penerimaan gudang otomatis: ' + n + ' item dicatat dari progres — Petugas Gudang diminta melengkapi foto penerimaan.');
    if (ctx.lepas.length) pesan.push(ctx.lepas.length + ' item tidak terhubung ke Bon Permintaan (' + ctx.lepas.slice(0, 3).join(', ') + (ctx.lepas.length > 3 ? ', …' : '') + ') — catat penerimaannya manual di menu Gudang.');
    if (pesan.length) kabar(pesan.join(' '), ctx.lepas.length && !n ? 'warning' : 'ok');
    window.MP273.terakhir = { progresId, hasil: r, lepas: ctx.lepas };
    if (n && typeof window.mp223Muat === 'function') { try { await window.mp223Muat(true); } catch (e) { } }
  }
  window.MP273 = { terakhir: null };
  (function () {
    const ra = window.regAksi; if (typeof ra !== 'function') return;
    window.regAksi = async function (a, x) {
      const ctx = a === 'saveProgres' ? siapkan(x && x.data) : null;
      const r = await ra.apply(this, arguments);
      if (ctx && r && r.data && r.data.id) jalankan(ctx, r.data.id);
      return r;
    };
  })();

  /* ---------- B. lengkapi foto ---------- */
  const tunggu = () => { const GD = window.MP223; return GD && Array.isArray(GD.masuk) ? GD.masuk.filter(r => r.status === 'AKTIF' && r.otomatis && r.fotoKurang) : []; };
  function kelompok(L) { const m = {}; L.forEach(r => { (m[r.kiriman] = m[r.kiriman] || []).push(r); }); return Object.keys(m).map(k => ({ kiriman: k, rows: m[k], r0: m[k][0] })); }
  window.mp273Badge = r => `<span class="mp220-bd ${r.fotoKurang ? 'oranye mp273-bd' : 'biru'}" title="${E(r.ket || '')}">Otomatis dari progres</span> <span class="sub">${E(r.noSJ)}</span>${r.fotoKurang && r.status === 'AKTIF' ? ` <button type="button" class="btn btn-sm btn-warning py-0 mp273-btn" onclick="mp273Lengkapi(${E(JSON.stringify(r.kiriman))})"><i class="fas fa-camera me-1"></i>Lengkapi foto</button>` : ''}`;
  function pita() {
    const tab = $('tab-gdmasuk'); if (!tab) return;
    const G = kelompok(tunggu()); let el = $('mp273Pita');
    if (!G.length) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'mp273Pita'; el.className = 'mp273-pita'; tab.insertBefore(el, tab.firstChild.nextSibling || null); }
    const isi = `<div class="h"><i class="fas fa-camera"></i> <b>${G.length} penerimaan otomatis dari progres menunggu foto lapangan</b></div>
      <div class="sub">Progres material sudah diinput sebelum barang dicatat gudang. Lengkapi foto penerimaan (min. 1) agar arsip & tagihan lengkap. Bila barang dicatat lewat Terima kiriman, penerimaan otomatis ini digabung (tidak dobel).</div>
      <ul>${G.map(k => `<li><span><b>${E(k.r0.noSJ)}</b> · ${E(k.r0.bonNomor)} · ${E(k.rows.map(r => r.uraian + ' ' + r.qty + ' ' + r.sat).join('; '))}</span><button type="button" class="btn btn-sm btn-warning py-0" onclick="mp273Lengkapi(${E(JSON.stringify(k.kiriman))})"><i class="fas fa-camera me-1"></i>Lengkapi foto</button></li>`).join('')}</ul>`;
    if (el.innerHTML !== isi) el.innerHTML = isi;
  }
  function kecilkan(file, maks, mutu) {
    return new Promise((ok, gagal) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const s = Math.min(1, maks / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', mutu)); };
      im.onerror = () => { URL.revokeObjectURL(u); gagal(new Error('Format foto tidak bisa dibaca. Gunakan JPG atau PNG.')); };
      im.src = u;
    });
  }
  const baca64 = f => new Promise((ok, gagal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => gagal(new Error('Berkas tidak dapat dibaca.')); r.readAsDataURL(f); });
  window.mp273Lengkapi = kiriman => {
    const rows = tunggu().filter(r => r.kiriman === kiriman); if (!rows.length) { kabar('Penerimaan ini sudah dilengkapi atau digabung. Muat ulang.', 'warning'); return; }
    const r0 = rows[0];
    let w = $('mp273Modal'); if (w) w.remove();
    w = document.createElement('div'); w.id = 'mp273Modal'; w.className = 'mp273-modal';
    w.innerHTML = `<div class="mp273-kotak" role="dialog" aria-modal="true" aria-label="Lengkapi foto penerimaan">
      <div class="mp273-kepala"><b><i class="fas fa-camera me-1"></i>Lengkapi foto penerimaan</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi"><div class="small mb-2">${E(r0.noSJ)} · Bon ${E(r0.bonNomor)} · ${E(r0.tanggal)}<br>${rows.map(r => `<b>${E(r.uraian)}</b> ${E(r.qty)} ${E(r.sat)}`).join(' · ')}</div>
        <div class="mp273-slot">${SISI.map((s, i) => `<label class="mp273-f"><span>${s}${i ? '' : ' *'}</span><input type="file" accept="image/jpeg,image/png" capture="environment" id="mp273F${i}"></label>`).join('')}</div>
        <div class="row g-2 mt-1"><div class="col-sm-6"><label class="small">No. surat jalan (opsional)</label><input class="form-control form-control-sm" id="mp273SJ" maxlength="60" placeholder="mis. SJ-0123"></div>
          <div class="col-sm-6"><label class="small">File surat jalan (PDF/foto, opsional)</label><input type="file" class="form-control form-control-sm" id="mp273SJF" accept="application/pdf,image/jpeg,image/png"></div></div>
        <div id="mp273Pesan" class="mp273-pesan" role="status"></div>
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Batal</button><button type="button" class="btn btn-sm btn-primary" id="mp273Ok"><i class="fas fa-cloud-arrow-up me-1"></i>Simpan foto</button></div></div></div>`;
    w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-tutup]')) w.remove(); });
    document.body.appendChild(w);
    $('mp273Ok').onclick = async () => {
      const b = $('mp273Ok'), msg = t => { $('mp273Pesan').textContent = t; };
      const F = SISI.map((s, i) => ($('mp273F' + i).files || [])[0] || null);
      if (!F.some(Boolean)) { msg('Pilih minimal 1 foto barang di lapangan.'); return; }
      b.disabled = true;
      try {
        const foto = [];
        for (let i = 0; i < 4; i++) {
          if (!F[i]) { foto.push(null); continue; } msg('Unggah foto ' + (i + 1) + '/4…');
          const d = await kecilkan(F[i], 1600, 0.85);
          const r = await window.regAksi('gudangUnggahFoto', { berkas: { id: 'g' + Date.now().toString(36), data: d.split(',')[1], nama: SISI[i].replace(/\s+/g, '-') + '.jpg', jenis: 'FOTO-GR', ket: r0.noSJ + ' · ' + SISI[i] } });
          foto.push(r.data);
        }
        let sjFile = null; const sf = ($('mp273SJF').files || [])[0];
        if (sf) {
          msg('Unggah surat jalan…');
          if (/pdf/i.test(sf.type) || /\.pdf$/i.test(sf.name)) { const r = await window.regAksi('unggahBerkas', { berkas: { id: 'sj' + Date.now().toString(36), data: await baca64(sf), nama: sf.name, jenis: 'SURAT-JALAN', ket: r0.noSJ } }); sjFile = { id: r.id, idServer: r.id, nama: sf.name, tipe: 'application/pdf' }; }
          else { const r = await window.regAksi('gudangUnggahFoto', { berkas: { id: 'sj' + Date.now().toString(36), data: (await kecilkan(sf, 2000, 0.85)).split(',')[1], nama: sf.name, jenis: 'SURAT-JALAN', ket: r0.noSJ } }); sjFile = r.data; }
        }
        msg('Menyimpan…');
        await window.regAksi('gudangLengkapiFoto', { data: { kiriman, foto, sjFile, noSJ: $('mp273SJ').value.trim() } });
        w.remove(); kabar('Foto penerimaan tersimpan · ' + rows.length + ' item.', 'ok');
        if (typeof window.mp223Muat === 'function') { await window.mp223Muat(true); if (typeof window.mp223Render === 'function') window.mp223Render(); }
        pita();
      } catch (e) { msg(e.message); b.disabled = false; }
    };
  };
  let t = 0, diberi = '';
  const jalan = () => {
    t = 0; try { pita(); } catch (e) { }
    try { const s = sesi(), n = kelompok(tunggu()).length, k = s ? s.nama + '|' + n : ''; if (s && s.gudang && n && diberi !== k) { diberi = k; kabar(n + ' penerimaan otomatis dari progres menunggu foto lapangan — buka Penerimaan Material › Lengkapi foto.', 'warning'); } } catch (e) { }
  };
  const tunda = () => { if (!t) t = setTimeout(jalan, 200); };
  if (document.body) new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }));
  tunda();
})();
