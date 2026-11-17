/* MP21032 — TANGGAL BAPM = SUMBER KEBENARAN: BAPM · PENERIMAAN (GR) · HARIAN GUDANG · KARTU GUDANG SATU TANGGAL (2.10.32; Modul server 1.10.21 · fitur "tanggalBAPMSumber")
 *  Akar masalah (≤ 2.10.31 / 1.10.20): sinkron tanggal BAPM hanya menyentuh GR OTOMATIS. GR yang dicatat manual (Terima Bon) memakai tanggal
 *  ketik petugas tanpa tautan ke BK; bila GR otomatis digabung ke GR manual, tanggal BAPM hilang (contoh: BAPM 05/11/2026, Kartu Gudang 30/09/2026).
 *  1. Terbit BAPM & simpan tanggal BA: diuji dulu ke server (gudangCekTanggalBA) — bila tanggal BA membuat GR/Kartu Gudang tidak konsisten
 *     (saldo minus, lebih awal dari Bon) BAPM DITOLAK terbit, bukan sekadar peringatan.
 *  2. Terima Bon: tanggal terima wajib = tanggal BAPM bila item sudah ditagih (GR otomatis menunggu foto / BK bertanggal BA). Isian diberi
 *     tombol "Pakai tanggal BAPM"; server menolak tanggal berbeda (Admin dapat memaksa dengan alasan → ditandai anomali).
 *  3. Kartu Gudang & Laporan Harian Gudang menampilkan tanggal BAPM untuk setiap GR tertaut (refProgres / refBA); baris yang di server masih
 *     berbeda diberi tanda ⚠ dan pita peringatan sampai disinkronkan.
 *  4. Audit & migrasi tanggal BAPM (Pengadaan: lihat & sinkron pasti · Admin: tautkan GR manual lama + terapkan, dry-run lebih dulu).
 *  5. BAPM yang memuat 2 baris untuk material/item Bon yang sama dijumlah sebelum GR otomatis dibuat (dulu baris kedua terlewat). */
(function () {
  'use strict';
  if (window.__MP21032__) return; window.__MP21032__ = true;
  const VERSI = '2.10.32';
  const $ = id => document.getElementById(id);
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const tglK = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[3] + '/' + m[2] + '/' + m[1] : '-'; };
  const pesan = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || ''); } catch (e) { } };
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  const aktifSrv = () => srv('tanggalBAPMSumber');
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const admin = () => !!(sesi() && sesi().admin);
  const pengadaan = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN')); };
  const progres = () => { try { return (typeof PROG !== 'undefined' && PROG && PROG.data) || []; } catch (e) { return []; } };
  const G = () => window.MP223 || { masuk: [], keluar: [] };
  const tBA = e => { const t = S(e && e.tanggalBA).slice(0, 10); return ISO.test(t) ? t : ''; };
  const refBK = r => (r && r.otomatis ? S(r.refProgres) : '') || S(r && r.refBA);
  const bkMap = () => { const m = {}; progres().forEach(e => { m[e.id] = e; }); return m; };

  /* ======================= 3. Kartu Gudang / Harian: tanggal tampil = tanggal BAPM ======================= */
  let _sig = '';
  function selaraskan() {   // idempotent; data asli server disimpan di _tglServer
    const M = G().masuk || [], B = bkMap(); let ubah = 0;
    const sig = M.length + '|' + progres().length + '|' + progres().reduce((a, e) => a + (e.versi || 0) + tBA(e), '') + '|' + M.reduce((a, r) => a + (r.versi || 0), 0);
    if (sig === _sig) return 0; _sig = sig;
    M.forEach(r => {
      if (!r || r.status !== 'AKTIF') return;
      const asli = r._tglServer !== undefined ? r._tglServer : S(r.tanggal), id = refBK(r), t = id ? tBA(B[id]) : '';
      const target = t || asli;
      if (target !== asli) { if (r._tglServer === undefined) r._tglServer = asli; r._bapm = { nomorBA: S(B[id].nomorBA), tanggalBA: t }; }
      else if (r._tglServer !== undefined) { delete r._tglServer; delete r._bapm; }
      if (S(r.tanggal) !== target) { r.tanggal = target; ubah++; }
    });
    if (ubah && typeof window.mp223Render === 'function') { try { window.mp223Render(); } catch (e) { } }
    return ubah;
  }
  window.mp21032Selaraskan = () => { _sig = ''; return selaraskan(); };
  (function kaitKet() {   // keterangan GR: rujukan BAPM juga untuk GR manual tertaut (refBA) + tanda ⚠
    const f = window.mp2102RujukanBA, k = window.mp2102KetGR;
    if (typeof f !== 'function' || typeof k !== 'function') { setTimeout(kaitKet, 1500); return; }
    if (!f.__mp21032) { const g = function () { const h = f.apply(this, arguments); return r => h(r && !r.refProgres && r.refBA ? Object.assign({}, r, { refProgres: r.refBA }) : r); }; g.__mp21032 = true; window.mp2102RujukanBA = g; }
    if (!k.__mp21032) { const g = function (r) { const s = k.apply(this, arguments); return r && r._bapm ? s + ' ⚠ tercatat ' + tglK(r._tglServer) + ' (≠ ' + r._bapm.nomorBA + ' ' + tglK(r._bapm.tanggalBA) + ') — perlu sinkron' : s; }; g.__mp21032 = true; window.mp2102KetGR = g; }
  })();
  function pita() {
    const L = (G().masuk || []).filter(r => r.status === 'AKTIF' && r._bapm);
    ['gdmasuk', 'gdharian', 'gdkartu'].forEach(nm => {
      const tab = $('tab-' + nm); if (!tab) return; let el = $('mp21032Pita-' + nm);
      if (!L.length) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'mp21032Pita-' + nm; el.className = 'mp21032-pita'; tab.insertBefore(el, tab.firstElementChild ? tab.firstElementChild.nextSibling : null); }
      const isi = `<i class="fas fa-calendar-xmark"></i><div><b>${L.length} penerimaan (GR) di server bertanggal berbeda dari BAPM</b> — tampilan memakai tanggal BAPM.
        <div class="sub">${E(L.slice(0, 3).map(r => S(r.uraian).slice(0, 30) + ': ' + tglK(r._tglServer) + ' → ' + tglK(r._bapm.tanggalBA)).join(' · '))}${L.length > 3 ? ' …' : ''}</div></div>
        ${pengadaan() ? '<button type="button" class="btn btn-sm btn-warning" onclick="mp21032Audit()"><i class="fas fa-calendar-check me-1"></i>Audit &amp; sinkron</button>' : ''}`;
      if (el.dataset.isi !== isi) { el.dataset.isi = isi; el.innerHTML = isi; }
    });
  }

  /* ======================= 2. Terima Bon: tanggal terima = tanggal BAPM ======================= */
  function bkUntukForm() {   // BK (bertanggal BA) dari GR otomatis menunggu foto pada item bon yang diisi qty — sama dengan aturan server
    const F = window.MP223F; if (!F || !F.bon) return [];
    const B = bkMap(), out = {};
    Object.keys(F.qty || {}).filter(i => Number(F.qty[i]) > 0).forEach(i => {
      (G().masuk || []).filter(r => r.status === 'AKTIF' && r.otomatis && r.fotoKurang && r.bonNomor === F.bon && Number(r.bonIdx) === Number(i))
        .forEach(r => { const e = B[r.refProgres], t = tBA(e); if (t) out[e.id] = { nomorBA: S(e.nomorBA), t }; });
    });
    return Object.keys(out).map(k => out[k]);
  }
  function pasangForm() {
    const inp = $('mp223MTgl'); let el = $('mp21032Tgl');
    const L = inp ? bkUntukForm() : [];
    if (!inp || !L.length) { if (el) el.remove(); if (inp) inp.classList.remove('is-invalid'); return; }
    const tg = [...new Set(L.map(x => x.t))], beda = tg.length === 1 && inp.value !== tg[0];
    if (!el) { el = document.createElement('div'); el.id = 'mp21032Tgl'; (inp.parentElement || inp).appendChild(el); }
    const isi = tg.length > 1
      ? `<div class="mp21032-tgl err">Item yang dipilih tertaut ke BAPM bertanggal berbeda (${E(L.map(x => x.nomorBA + ' ' + tglK(x.t)).join('; '))}). Simpan sebagai kiriman terpisah per BAPM.</div>`
      : `<div class="mp21032-tgl ${beda ? 'err' : 'ok'}">Tanggal ${E(L[0].nomorBA)}: <b>${tglK(tg[0])}</b>${beda ? ' — tanggal terima wajib sama. <button type="button" class="btn btn-link btn-sm p-0 align-baseline" onclick="mp21032PakaiTgl()">Pakai tanggal BAPM</button>' : ' ✓'}</div>`;
    if (el.dataset.isi !== isi) { el.dataset.isi = isi; el.innerHTML = isi; }
    inp.classList.toggle('is-invalid', beda || tg.length > 1);
  }
  window.mp21032PakaiTgl = () => { const L = bkUntukForm(), inp = $('mp223MTgl'); if (!inp || !L.length) return; if (inp.max && L[0].t > inp.max) inp.removeAttribute('max'); inp.value = L[0].t; inp.dispatchEvent(new Event('input', { bubbles: true })); pasangForm(); };

  /* ======================= 1 & 5. regAksi: uji tanggal BA sebelum terbit · baris BAPM ganda · anomali ======================= */
  (function bungkus() {
    const ra = window.regAksi; if (typeof ra !== 'function') { setTimeout(bungkus, 1200); return; } if (ra.__mp21032) return;
    const g = async function (a, x) {
      // 1) BAPM terbit / tanggal BA dari form: uji konsistensi gudang lebih dulu (server 1.10.21)
      if (aktifSrv() && a === 'saveProgres' && x && x.data && x.data.id) {
        let t = '';
        try { if (x.data.terbit && typeof BA !== 'undefined' && BA && BA.sumberProgres === x.data.id) t = S(BA.tanggal).slice(0, 10); } catch (e) { }
        if (!t && !x.data.terbit && $('mp2100TglBA')) t = S($('mp2100TglBA').value);
        if (ISO.test(t)) {
          const c = await ra.call(this, 'gudangCekTanggalBA', { data: { progresId: x.data.id, tanggalBA: t } });
          if (c && c.aman === false) throw new Error('Tanggal BAPM ' + tglK(t) + ' ditolak: ' + c.pesan + ' BAPM / BK belum disimpan.');
        }
      }
      // bkTanggal: server 1.10.21 sudah menguji GR otomatis + manual tertaut sebelum menyimpan (gagal = BK tidak berubah)
      // 5) baris BAPM ganda untuk item Bon yang sama → dijumlah (server 1.10.21 juga menjumlah)
      if (a === 'gudangOtomatisProgres' && x && x.data && Array.isArray(x.data.baris)) {
        const m = {}; x.data.baris.forEach(b => { const k = b.bonNomor + '|' + b.bonIdx; if (m[k]) { m[k].sd = Math.round((Number(m[k].sd) + Number(b.sd)) * 1000) / 1000; m[k].ganda = (m[k].ganda || 1) + 1; } else m[k] = Object.assign({}, b); });
        const L = Object.keys(m).map(k => m[k]), ganda = L.filter(b => b.ganda > 1);
        if (ganda.length) pesan('BAPM memuat ' + ganda.length + ' material dengan lebih dari satu baris (' + ganda.slice(0, 3).map(b => S(b.uraian).slice(0, 30) + ' ×' + b.ganda).join(', ') + ') — volume dijumlah untuk penerimaan gudang. Periksa kembali apakah baris ganda pada BAPM disengaja.', 'warning');
        x = Object.assign({}, x, { data: Object.assign({}, x.data, { baris: L.map(b => { const z = Object.assign({}, b); delete z.ganda; return z; }) }) });
      }
      // 2) Terima Bon: anomali tanggal → Admin dapat memaksa dengan alasan
      let r;
      try { r = await ra.call(this, a, x); }
      catch (e) {
        if ((a === 'gudangTerimaBon' || a === 'gudangMasukSimpan') && /ANOMALI TANGGAL/.test(S(e && e.message)) && admin() && x && x.data && !x.data.izinBedaTanggal) {
          const al = window.prompt(S(e.message) + '\n\nAdmin: ketik alasan (min. 12 karakter) untuk tetap menyimpan dengan tanggal berbeda, atau Batal untuk mengubah tanggal.');
          if (al && al.trim().length >= 12) r = await ra.call(this, a, Object.assign({}, x, { data: Object.assign({}, x.data, { izinBedaTanggal: true, alasanBedaTanggal: al.trim() }) }));
          else throw e;
        } else throw e;
      }
      try {
        if (r && r.peringatanTanggal) pesan(r.peringatanTanggal, 'warning');
        if (r && Array.isArray(r.tautan) && r.tautan.length) pesan(r.tautan.length + ' penerimaan manual yang lebih dulu dicatat kini tertaut ke BAPM ini' + (r.sinkronManual && r.sinkronManual.n ? ' dan tanggalnya disamakan ke ' + tglK(r.sinkronManual.tanggal) : '') + '.', 'ok');
        if (a === 'gudangSinkronTanggal' && r && (r.usulan || r.bkTanpaTanggal)) pesan('Masih ada ' + (r.usulan || 0) + ' GR manual belum tertaut ke BAPM' + (r.bkTanpaTanggal ? ' · ' + r.bkTanpaTanggal + ' BAPM tanpa tanggal BA' : '') + ' — buka Audit tanggal BAPM.', 'warning');
        if (/^(gudang|bkTanggal|saveProgres)/.test(a)) { _sig = ''; setTimeout(jadwal, 50); }
      } catch (e) { }
      return r;
    };
    Object.keys(ra).forEach(k => { g[k] = ra[k]; }); g.__mp21032 = true; window.regAksi = g;
  })();

  /* ======================= 4. Audit & migrasi tanggal BAPM ======================= */
  const AU = { hasil: null, pilih: {}, sibuk: false };
  const tutup = () => { const w = $('mp21032Modal'); if (w) w.remove(); };
  function tabel(judul, kolom, baris, kosong) {
    return `<h6 class="mt-3 mb-1">${judul}</h6>${baris.length ? `<div class="mp21032-tw"><table class="mp21032-tb"><thead><tr>${kolom.map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>${baris.join('')}</tbody></table></div>` : `<div class="sub">${kosong}</div>`}`;
  }
  function gambar() {
    const w = $('mp21032Modal'); if (!w) return; const H = AU.hasil, isi = w.querySelector('.mp21032-isi');
    if (!H) { isi.innerHTML = '<div class="sub"><i class="fas fa-spinner fa-spin me-1"></i>Memeriksa data gudang &amp; BAPM…</div>'; return; }
    const J = H.jumlah || {};
    isi.innerHTML = `<div class="mp21032-ring"><span><b>${J.tanggal || 0}</b> GR akan disamakan ke tanggal BAPM</span><span><b>${J.tautan || 0}</b> tautan pasti</span><span><b>${J.usulan || 0}</b> usulan tautan (tinjau)</span><span class="${J.galat ? 'err' : ''}"><b>${J.galat || 0}</b> ditolak</span><span><b>${J.bkTanpaTanggal || 0}</b> BAPM tanpa tanggal BA</span></div>
      ${tabel('Perubahan tanggal (GR → tanggal BAPM)', ['Material', 'Qty', 'Tanggal sekarang', 'Tanggal BAPM', 'BAPM', 'Sumber'], (H.perubahan || []).map(p => `<tr><td>${E(p.uraian)}</td><td class="r">${E(p.qty)} ${E(p.sat)}</td><td><s>${tglK(p.tanggalLama)}</s></td><td><b>${tglK(p.tanggalBaru)}</b></td><td>${E(p.nomorBA)}</td><td>${E(p.cara)}</td></tr>`), 'Semua GR tertaut sudah bertanggal sama dengan BAPM.')}
      ${tabel('Usulan: GR manual belum tertaut ke BAPM (material sama)', ['', 'Material', 'Qty', 'Tanggal GR', 'Usulan BAPM', 'Tanggal BAPM', 'Kapasitas'], (H.usulan || []).map(z => `<tr><td class="c"><input type="checkbox" class="form-check-input" data-gr="${E(z.grId)}" ${AU.pilih[z.grId] ? 'checked' : ''} ${admin() ? '' : 'disabled'} onchange="mp21032Pilih(this)"></td><td>${E(z.uraian)}<div class="sub">${E(z.bonNomor)} · SJ ${E(z.noSJ)}</div></td><td class="r">${E(z.qty)} ${E(z.sat)}</td><td>${tglK(z.tanggalGR)}</td><td>${E(z.nomorBA)}</td><td><b>${tglK(z.tanggalBA)}</b></td><td class="sub">${E(z.kapasitas)}</td></tr>`), 'Tidak ada GR manual yang perlu ditautkan.')}
      ${tabel('Ditolak (perlu koreksi data lebih dulu)', ['Rincian'], (H.galat || []).map(g => `<tr><td class="err">${E(g)}</td></tr>`), 'Tidak ada.')}
      ${tabel('BAPM terbit / bernomor tanpa tanggal BA', ['BAPM', 'Kontrak', 'GR tertaut'], (H.bkTanpaTanggal || []).map(b => `<tr><td>${E(b.nomorBA)}</td><td>${E(b.noKontrak)}</td><td class="r">${E(b.gr)}</td></tr>`), 'Tidak ada.')}
      <div class="sub mt-2">Tanggal fisik penerimaan lama tetap tersimpan (tanggalAwal) dan setiap perubahan tercatat di Log. ${admin() ? 'Usulan hanya diterapkan bila dicentang.' : 'Menautkan GR manual (usulan) khusus Admin.'}</div>`;
  }
  async function muatAudit() {
    AU.hasil = null; gambar();
    try { AU.hasil = await window.regAksi('gudangAuditTanggalBA', {}); } catch (e) { AU.hasil = { jumlah: { galat: 1 }, galat: [e.message] }; }
    gambar();
  }
  window.mp21032Pilih = el => { AU.pilih[el.dataset.gr] = el.checked; };
  window.mp21032Audit = () => {
    if (!aktifSrv()) { pesan('Modul server 1.10.21 belum aktif. Admin: Diagnostik sistem › Modul server › unggah server-modul-1.10.21.json › uji › terbitkan.', 'err'); return; }
    tutup(); AU.pilih = {};
    const w = document.createElement('div'); w.id = 'mp21032Modal'; w.className = 'mp21032-modal';
    w.innerHTML = `<div class="mp21032-kotak" role="dialog" aria-modal="true" aria-label="Audit tanggal BAPM">
      <div class="mp21032-kepala"><b><i class="fas fa-calendar-check me-1"></i>Audit &amp; sinkron tanggal BAPM → Penerimaan · Harian · Kartu Gudang</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp21032-isi"></div>
      <div class="mp21032-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Tutup</button>
        <button type="button" class="btn btn-sm btn-outline-primary" onclick="mp21032Uji()"><i class="fas fa-rotate me-1"></i>Periksa ulang</button>
        <button type="button" class="btn btn-sm btn-primary" id="mp21032Ok" onclick="mp21032Terapkan()"><i class="fas fa-calendar-check me-1"></i>${admin() ? 'Terapkan migrasi' : 'Sinkron (tautan pasti)'}</button></div></div>`;
    w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-tutup]')) tutup(); });
    document.body.appendChild(w); muatAudit();
  };
  window.mp21032Uji = () => muatAudit();
  window.mp21032Terapkan = async () => {
    if (AU.sibuk) return; const b = $('mp21032Ok'); AU.sibuk = true; if (b) b.disabled = true;
    try {
      let r;
      if (admin()) {
        const tautan = (AU.hasil && AU.hasil.usulan || []).filter(z => AU.pilih[z.grId]).map(z => ({ grId: z.grId, bkId: z.bkId }));
        const uji = await window.regAksi('gudangMigrasiTanggalBA', { data: { dryRun: true, tautan } });
        const k = window.prompt('Migrasi akan mengubah ' + uji.jumlah.tanggal + ' tanggal GR dan ' + uji.jumlah.tautan + ' tautan (' + tautan.length + ' usulan dicentang)' + (uji.jumlah.galat ? ', ' + uji.jumlah.galat + ' BAPM ditolak/dilewati' : '') + '.\nKetik SINKRONKAN untuk menerapkan.');
        if (S(k) !== 'SINKRONKAN') { pesan('Migrasi dibatalkan — tidak ada data yang diubah.', 'warning'); return; }
        r = await window.regAksi('gudangMigrasiTanggalBA', { data: { dryRun: false, tautan, konfirmasi: 'SINKRONKAN' } });
        pesan('Migrasi tanggal BAPM: ' + r.ditulis + ' baris GR diperbarui (' + r.jumlah.tanggal + ' tanggal, ' + r.jumlah.tautan + ' tautan).' + (r.jumlah.galat ? ' ' + r.jumlah.galat + ' ditolak — lihat daftar.' : ''), r.jumlah.galat ? 'warning' : 'ok');
      } else {
        r = await window.regAksi('gudangSinkronTanggal', { data: {} });
        pesan('Sinkron tanggal BAPM: ' + (r.data || []).reduce((a, x) => a + x.n, 0) + ' penerimaan disesuaikan.' + ((r.galat || []).length ? ' ' + r.galat.length + ' ditolak.' : ''), (r.galat || []).length ? 'warning' : 'ok');
      }
      if (typeof window.mp223Muat === 'function') { await window.mp223Muat(true); if (typeof window.mp223Render === 'function') window.mp223Render(); }
      _sig = ''; selaraskan(); await muatAudit();
    } catch (e) { pesan(e.message, 'err'); }
    finally { AU.sibuk = false; if (b) b.disabled = false; }
  };
  function pasangTombol() {
    const sb = $('mp2100SinkBtn'); if (!sb || $('mp21032AuditBtn') || !pengadaan()) return;
    sb.insertAdjacentHTML('afterend', ' <button type="button" id="mp21032AuditBtn" class="btn btn-sm btn-outline-warning" title="Periksa GR yang tanggalnya berbeda dari BAPM & GR manual yang belum tertaut" onclick="mp21032Audit()"><i class="fas fa-magnifying-glass-chart me-1"></i>Audit tanggal BAPM</button>');
  }

  /* ======================= pemasangan ======================= */
  let _t = 0;
  function jadwal() { if (_t) return; _t = setTimeout(() => { _t = 0; [selaraskan, pita, pasangForm, pasangTombol].forEach(f => { try { f(); } catch (e) { console.warn('[MP21032]', f.name, e); } }); }, 300); }
  const awasi = () => {
    new MutationObserver(m => { if (m.some(x => [...(x.addedNodes || [])].some(n => !(n.nodeType === 1 && n.closest && n.closest('[id^="mp21032"]'))))) jadwal(); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('input', ev => { if (ev.target && (ev.target.id === 'mp223MTgl' || (ev.target.closest && ev.target.closest('#mp223FM')))) jadwal(); }, true);
    jadwal();
  };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
  window.MP21032 = { VERSI, selaraskan: window.mp21032Selaraskan, AU };
})();
