/* MP258 — PEMBARUAN 2.6.2 — SPRINT 1: NOTIFIKASI PRIORITAS & RINGKASAN (butuh Modul server 1.9.0 untuk dokumen kurang & Jejak Audit)
 *  1. Lonceng notifikasi berjenjang: kontrak H-30 (Info) · H-7 (Warning) · H+0 (Kritis) · H+30 (Kritis eskalasi); dokumen vendor kedaluwarsa (Kritis) / ≤ 7 hari (Warning);
 *     draf kontrak Rp 0 (Warning, Kritis bila > 30 hari); tagihan dokumen < 100% (Info). Angka pada lonceng = jumlah KRITIS saja (Warning bila tidak ada Kritis).
 *     "Tandai ditangani" menyembunyikan butir sampai tahapnya naik (mis. H-7 → H+0) — tersimpan per pengguna di perangkat.
 *  2. Ringkasan Prioritas di Dashboard: Kritis, kontrak lewat jatuh tempo, draf Rp 0 (Lanjutkan), tagihan belum dibayar, kelengkapan dokumen; dihitung sekali per versi data.
 *  3. Register Kontrak dibagi per halaman (25 / 50 / semua).
 *  4. Keuangan & Bayar: arahkan kursor / ketuk kolom Kelengkapan → daftar dokumen yang masih kurang (templat per jenis kontrak).
 *  5. Jejak Audit (Admin): seluruh catatan Log — cari, filter aksi/pengguna/tanggal, ekspor Excel.
 */
(function () {
  'use strict';
  if (window.__MP258__) return; window.__MP258__ = true;
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const $ = id => document.getElementById(id);
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const adm = () => !!(sesi() && sesi().admin);
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const proyek = () => (typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || '';
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const tglK = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Number(m[3]) + ' ' + BLN[Number(m[2]) - 1] + ' ' + m[1] : '-'; };
  const rp = n => 'Rp ' + Math.round(N(n)).toLocaleString('id-ID');
  const rpS = n => { n = N(n); return n >= 1e9 ? 'Rp ' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : rp(n); };
  const hariIni = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const umur = s => { const t = Date.parse(String(s || '')); return isNaN(t) ? null : Math.floor((Date.now() - t) / 864e5); };
  const js = v => E(JSON.stringify(String(v)));
  const tunda = (f, ms) => { let t = 0; return function () { clearTimeout(t); t = setTimeout(f, ms); }; };

  /* ======================= 1. NOTIFIKASI BERJENJANG ======================= */
  const LV = { KRITIS: { l: 'Kritis', k: 'kritis', u: 0 }, WARNING: { l: 'Warning', k: 'warning', u: 1 }, INFO: { l: 'Info', k: 'info', u: 2 } };
  const GRUP = { kontrak: ['Kontrak', 'fa-file-contract'], draf: ['Draf Rp 0', 'fa-file-circle-exclamation'], dokumen: ['Dokumen vendor', 'fa-folder-open'], tagihan: ['Tagihan', 'fa-file-invoice-dollar'] };
  function tahap(sisa) {
    if (sisa === null || sisa === undefined || !isFinite(sisa)) return null;
    if (sisa <= -30) return { tahap: 'H+30', level: 'KRITIS' };
    if (sisa <= 0) return { tahap: 'H+0', level: 'KRITIS' };
    if (sisa <= 7) return { tahap: 'H-7', level: 'WARNING' };
    if (sisa <= 30) return { tahap: 'H-30', level: 'INFO' };
    return null;
  }
  window.mp258Tahap = tahap;
  const NT = { L: [], tab: '', pada: 0 };
  window.MP258_NT = NT;
  const KUNCI_TG = () => 'mp258Tangani_' + proyek() + '_' + ((sesi() || {}).nama || '');
  function bacaTangani() { try { return JSON.parse(localStorage.getItem(KUNCI_TG()) || '{}') || {}; } catch (e) { return {}; } }
  function simpanTangani(o) { try { localStorage.setItem(KUNCI_TG(), JSON.stringify(o)); } catch (e) { } }
  const kunciButir = x => x.g + '|' + x.judul + '|' + (x.tahap || '') + '|' + x.level;
  const semuaK = () => { try { return typeof window.semuaKontrak214 === 'function' ? window.semuaKontrak214() : []; } catch (e) { return []; } };
  function kumpul() {
    const L = [];
    if (!sesi()) return L;
    const masa = window.mp220Masa;
    if (typeof masa === 'function') semuaK().forEach(x => {
      let m; try { m = masa(x); } catch (e) { return; }
      if (!m || ['lewat', 'h30'].indexOf(m.k) < 0) return;
      const t = tahap(m.sisa); if (!t) return;
      L.push({ g: 'kontrak', level: t.level, tahap: t.tahap, sisa: m.sisa, judul: (x.key || '-') + ' · ' + (x.vendor || '-'),
        ket: (m.sisa < 0 ? 'Masa berlaku berakhir ' : 'Berakhir ') + tglK(m.tgl) + (t.tahap === 'H+30' ? ' · eskalasi > 30 hari' : ''), nilai: m.label,
        buka: x.t === 'reg' ? 'bukaEditReg(' + js(x.r.id) + ')' : 'bukaKoreksi(' + js(x.g.key) + ')' });
    });
    ((typeof REG !== 'undefined' && REG.data) || []).forEach(r => {
      if (r.diposting || N(r.nilai) > 0) return;
      const u = umur(r.dibuatPada || r.diubahPada);
      L.push({ g: 'draf', level: u !== null && u > 30 ? 'KRITIS' : 'WARNING', tahap: u !== null && u > 30 ? '> 30 h' : '', sisa: -(u || 0), judul: (r.noKontrak || '-') + ' · ' + (r.namaVendor || '-'),
        ket: 'Draf Rp 0 — isi item kontrak (volume × harga)' + (u !== null ? ' · dibuat ' + u + ' hari lalu' : ''), nilai: 'Rp 0', buka: 'bukaEditReg(' + js(r.id) + ')' });
    });
    (typeof window.mp220NotifDaftar === 'function' ? window.mp220NotifDaftar() : []).forEach(x => {
      if (x.g === 'dokumen') L.push({ g: 'dokumen', level: N(x.sisa) <= 0 ? 'KRITIS' : 'WARNING', tahap: N(x.sisa) < 0 ? 'Lewat' : N(x.sisa) === 0 ? 'H+0' : 'H-' + x.sisa, sisa: N(x.sisa), judul: x.judul, ket: x.ket, nilai: x.nilai, buka: x.buka });
      else if (x.g === 'tagihan') L.push({ g: 'tagihan', level: 'INFO', tahap: '', sisa: 100 + N(x.sisa), judul: x.judul, ket: x.ket, nilai: x.nilai, buka: x.buka });
    });
    const tg = bacaTangani(), ada = {};
    L.forEach(x => { x.kunci = kunciButir(x); x.tangani = !!tg[x.kunci]; ada[x.kunci] = 1; });
    let ubah = false; Object.keys(tg).forEach(k => { if (!ada[k] || umur(tg[k]) > 30) { delete tg[k]; ubah = true; } }); if (ubah) simpanTangani(tg);
    const urutG = { kontrak: 0, draf: 1, dokumen: 2, tagihan: 3 };
    L.sort((a, b) => LV[a.level].u - LV[b.level].u || urutG[a.g] - urutG[b.g] || a.sisa - b.sisa);
    return L;
  }
  function hitung() {
    NT.L = kumpul(); NT.pada = Date.now();
    const n = { KRITIS: 0, WARNING: 0, INFO: 0, tangani: 0 };
    NT.L.forEach(x => { if (x.tangani) n.tangani++; else n[x.level]++; });
    NT.n = n; gambarLencana(); if ($('mp258Panel') && !$('mp258Panel').hidden) gambarPanel();
    gambarRingkas();
    return n;
  }
  window.mp258Hitung = hitung;
  const hitungT = tunda(hitung, 250);
  function gambarLencana() {
    const b = $('mp220Bell'), t = $('mp258N'); if (!b || !t || !NT.n) return;
    const n = NT.n, v = n.KRITIS || n.WARNING;
    t.hidden = !v; t.textContent = v > 99 ? '99+' : String(v); t.className = n.KRITIS ? 'kritis' : 'warning';
    b.classList.toggle('ada', !!n.KRITIS);
    b.title = 'Notifikasi — Kritis ' + n.KRITIS + ' · Warning ' + n.WARNING + ' · Info ' + n.INFO + (n.tangani ? ' · ditangani ' + n.tangani : '');
    b.setAttribute('aria-label', b.title);
  }
  function pasangLonceng() {
    const b = $('mp220Bell'); if (!b || b.dataset.mp258) return !!b;
    b.dataset.mp258 = '1'; b.classList.add('mp258-bell'); b.setAttribute('aria-controls', 'mp258Panel');
    const t = document.createElement('b'); t.id = 'mp258N'; t.hidden = true; b.appendChild(t);
    const p = document.createElement('div'); p.id = 'mp258Panel'; p.className = 'mp258-panel'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Notifikasi prioritas');
    (b.parentElement || document.body).appendChild(p);
    const nb = $('mp220BellN'); if (nb) new MutationObserver(hitungT).observe(nb, { childList: true, characterData: true, subtree: true, attributes: true });
    document.addEventListener('mousedown', ev => { const q = $('mp258Panel'); if (q && !q.hidden && !ev.target.closest('#mp258Panel') && !ev.target.closest('#mp220Bell')) tutup(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') tutup(); });
    hitung(); return true;
  }
  function tutup() { const p = $('mp258Panel'), b = $('mp220Bell'); if (p) p.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
  window.mp258Tutup = tutup;
  const asliLonceng = window.mp220Lonceng;
  window.mp220Lonceng = function () {
    const p = $('mp258Panel'); if (!p) return typeof asliLonceng === 'function' ? asliLonceng.apply(this, arguments) : undefined;
    if (!p.hidden) return tutup();
    try { if (typeof asliLonceng === 'function') asliLonceng.apply(this, arguments); } catch (e) { }   // tetap memicu muat ringkasan checklist & arsip
    if (typeof window.mp220TutupPanel === 'function') window.mp220TutupPanel();
    hitung();
    if (!NT.tab || (NT.tab !== 'tangani' && !NT.n[NT.tab])) NT.tab = ['KRITIS', 'WARNING', 'INFO'].find(k => NT.n[k]) || 'KRITIS';
    p.hidden = false; const b = $('mp220Bell'); if (b) b.setAttribute('aria-expanded', 'true'); gambarPanel();
  };
  window.mp258Buka = lv => { if (lv) NT.tab = lv; const p = $('mp258Panel'); if (p && !p.hidden) { gambarPanel(); return; } window.mp220Lonceng(); if (lv) { NT.tab = lv; gambarPanel(); } };
  const MAKS = 40;
  function gambarPanel() {
    const p = $('mp258Panel'); if (!p) return;
    const n = NT.n || { KRITIS: 0, WARNING: 0, INFO: 0, tangani: 0 }, tab = NT.tab || 'KRITIS';
    const L = NT.L.filter(x => tab === 'tangani' ? x.tangani : !x.tangani && x.level === tab);
    const tabs = ['KRITIS', 'WARNING', 'INFO'].map(k => `<button type="button" role="tab" aria-selected="${tab === k}" class="${LV[k].k} ${tab === k ? 'on' : ''}" onclick="MP258_NT.tab='${k}';mp258Panel()">${LV[k].l}<span>${n[k]}</span></button>`).join('')
      + `<button type="button" role="tab" aria-selected="${tab === 'tangani'}" class="tg ${tab === 'tangani' ? 'on' : ''}" onclick="MP258_NT.tab='tangani';mp258Panel()">Ditangani<span>${n.tangani}</span></button>`;
    const it = L.slice(0, MAKS).map(x => { const i = NT.L.indexOf(x), g = GRUP[x.g] || ['', 'fa-bell'];
      return `<div class="mp258-it ${LV[x.level].k}"><button type="button" class="t" onclick="mp258Tutup();${x.buka || ''}"><span class="g"><i class="fas ${g[1]}"></i>${E(g[0])}${x.tahap ? ' · <b>' + E(x.tahap) + '</b>' : ''}</span><b>${E(x.judul)}</b><small>${E(x.ket)}</small></button>
        <span class="v">${E(x.nilai)}</span><button type="button" class="ok" title="${x.tangani ? 'Kembalikan ke daftar' : 'Tandai sudah ditangani — muncul lagi bila tahapnya naik'}" aria-label="${x.tangani ? 'Kembalikan' : 'Tandai ditangani'}" onclick="mp258Tangani(${i})"><i class="fas ${x.tangani ? 'fa-rotate-left' : 'fa-check'}"></i></button></div>`; }).join('');
    const kosong = { KRITIS: 'Tidak ada butir Kritis. Bagus — tidak ada kontrak lewat jatuh tempo yang belum ditangani.', WARNING: 'Tidak ada butir Warning.', INFO: 'Tidak ada butir Info.', tangani: 'Belum ada butir yang ditandai ditangani.' }[tab];
    p.innerHTML = `<div class="mp258-ph"><b><i class="fas fa-bell me-2"></i>Notifikasi prioritas</b><small>diperbarui ${new Date(NT.pada || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small></div>
      <nav class="mp258-tabs" role="tablist">${tabs}</nav>
      <div class="mp258-pb">${L.length ? it + (L.length > MAKS ? `<div class="mp258-more">+${L.length - MAKS} lainnya — buka menu terkait untuk daftar lengkap.</div>` : '') : `<div class="mp258-nol">${E(kosong)}</div>`}</div>
      <div class="mp258-pf"><span>Eskalasi kontrak: H-30 Info · H-7 Warning · H+0 Kritis · H+30 Kritis. Angka lonceng = Kritis.</span><a href="#" onclick="if(window.mp220SegarkanNotif)mp220SegarkanNotif();setTimeout(mp258Hitung,600);return false"><i class="fas fa-rotate me-1"></i>Segarkan</a></div>`;
  }
  window.mp258Panel = gambarPanel;
  window.mp258Tangani = i => {
    const x = NT.L[i]; if (!x) return; const tg = bacaTangani();
    if (x.tangani) delete tg[x.kunci]; else tg[x.kunci] = new Date().toISOString();
    simpanTangani(tg); hitung(); gambarPanel();
  };

  /* ======================= 2. RINGKASAN PRIORITAS (Dashboard) ======================= */
  const RG = { sig: '', kurang: null, kurangPada: 0, kurangMuat: null };
  async function muatKurang(paksa) {
    if (!sesi() || !srv('dokKurang') || typeof regAksi !== 'function') return null;
    if (RG.kurangMuat) return RG.kurangMuat;
    if (!paksa && RG.kurang && Date.now() - RG.kurangPada < 3 * 60000) return RG.kurang;
    RG.kurangMuat = (async () => { try { const r = await regAksi('x186Kurang'); RG.kurang = r; RG.kurangPada = Date.now(); RG.sig = ''; return r; } catch (e) { return RG.kurang; } finally { RG.kurangMuat = null; } })();
    return RG.kurangMuat;
  }
  window.mp258MuatKurang = muatKurang;
  function data() {
    const reg = (typeof REG !== 'undefined' && REG.data) || [], prog = (typeof PROG !== 'undefined' && PROG.data) || [];
    const n = NT.n || { KRITIS: 0, WARNING: 0, INFO: 0 };
    const kon = NT.L.filter(x => x.g === 'kontrak' && x.sisa <= 0);
    const draf = reg.filter(r => !r.diposting && N(r.nilai) <= 0).map(r => ({ r, u: umur(r.dibuatPada || r.diubahPada) })).sort((a, b) => N(b.u) - N(a.u));
    const blm = prog.filter(e => !e.bayar || !e.bayar.status || e.bayar.status === 'BELUM');
    let dok = null; if (RG.kurang && RG.kurang.data) { const ids = prog.filter(e => !(e.bayar && e.bayar.status === 'DIBAYAR')).map(e => e.id), d = RG.kurang.data;
      const ada = ids.filter(id => d[id]), lengkap = ada.filter(id => !d[id].kurang.length); dok = { n: ids.length, isi: ada.length, lengkap: lengkap.length, belum: ids.length - lengkap.length }; }
    return { n, kon, h30: kon.filter(x => x.sisa <= -30).length, draf, blm, nilaiBlm: blm.reduce((a, e) => a + N(e.nilai), 0), dok };
  }
  function gambarRingkas() {
    const tab = $('tab-dashboard-tagihan'); if (!tab) return;
    let el = $('mp258Ringkas');
    if (!sesi()) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('section'); el.id = 'mp258Ringkas'; el.className = 'mp258-rk card shadow-sm mb-3'; el.setAttribute('aria-label', 'Ringkasan prioritas'); tab.prepend(el); }
    const d = data(), sig = JSON.stringify([d.n, d.kon.length, d.h30, d.draf.map(x => x.r.id + x.u), d.blm.length, d.nilaiBlm, d.dok, adm(), srv('jejakAudit'), hariIni()]);
    if (sig === RG.sig && el.innerHTML) return; RG.sig = sig;
    const kartu = [
      ['kritis', 'fa-triangle-exclamation', 'Kritis', d.n.KRITIS, 'Warning ' + d.n.WARNING + ' · Info ' + d.n.INFO, "mp258Buka('KRITIS')"],
      ['kritis', 'fa-calendar-xmark', 'Kontrak lewat jatuh tempo', d.kon.length, d.h30 ? d.h30 + ' lewat > 30 hari (eskalasi)' : 'tidak ada yang > 30 hari', "mp258Buka('KRITIS')"],
      [d.draf.length ? 'warning' : 'ok', 'fa-file-circle-exclamation', 'Draf kontrak Rp 0', d.draf.length, d.draf.length ? 'lengkapi item volume × harga' : 'semua draf bernilai', "document.getElementById('mp258Draf')&&document.getElementById('mp258Draf').scrollIntoView({behavior:'smooth',block:'nearest'})"],
      ['info', 'fa-hourglass-half', 'Tagihan belum diproses bayar', d.blm.length, rpS(d.nilaiBlm) + ' · status BELUM', "if(window.MP219_KEU){MP219_KEU.tab='daftar';MP219_KEU.status=''}bukaTab('keuangan')"],
      [d.dok && d.dok.belum ? 'warning' : 'ok', 'fa-file-circle-check', 'Dokumen tagihan lengkap', d.dok ? d.dok.lengkap + '/' + d.dok.n : '…', d.dok ? (d.dok.n - d.dok.isi) + ' belum punya checklist' : (srv('dokKurang') ? 'memuat…' : 'butuh modul server 1.9.0'), "bukaTab('keuangan')"]];
    el.innerHTML = `<div class="mp258-rk-h"><div><h6><i class="fas fa-bullseye me-2"></i>Prioritas Hari Ini</h6><small>${E(tglK(hariIni()))} · dihitung dari data terakhir tersinkron</small></div>
        ${adm() && srv('jejakAudit') ? '<button type="button" class="btn btn-sm btn-outline-secondary" onclick="mp258Audit()"><i class="fas fa-clock-rotate-left me-1"></i>Jejak Audit</button>' : ''}</div>
      <div class="mp258-rk-k">${kartu.map(k => `<button type="button" class="mp258-k ${k[0]}" onclick="${k[5]}"><i class="fas ${k[1]}"></i><span class="l">${E(k[2])}</span><b>${E(k[3])}</b><small>${E(k[4])}</small></button>`).join('')}</div>
      ${d.draf.length ? `<div class="mp258-draf" id="mp258Draf"><div class="h"><b>Draf belum lengkap (Rp 0)</b><small>Tidak bisa dilengkapi PR/RFQ/PO/TOP atau diposting sebelum item bernilai — modul server 1.9.0</small></div>
        ${d.draf.slice(0, 8).map(x => `<div class="r"><span><code>${E(x.r.noKontrak || '-')}</code> ${E(x.r.namaVendor || '-')}<small>${x.u !== null ? 'dibuat ' + x.u + ' hari lalu' : ''}${x.u > 30 ? ' · mandek > 30 hari' : ''}</small></span><button type="button" class="btn btn-sm btn-primary" onclick="bukaEditReg(${js(x.r.id)})"><i class="fas fa-pen me-1"></i>Lanjutkan</button></div>`).join('')}
        ${d.draf.length > 8 ? `<div class="r more">+${d.draf.length - 8} draf lainnya di Register Kontrak</div>` : ''}</div>` : ''}`;
  }
  window.mp258Ringkas = () => { RG.sig = ''; gambarRingkas(); };

  /* ======================= 3. REGISTER PER HALAMAN ======================= */
  const PG = { hal: 0, per: 25, sig: '' };
  window.MP258_PG = PG;
  function halaman() {
    const body = $('regBody'); if (!body) return;
    const rows = [...body.querySelectorAll('tr.baris-kontrak')], sig = rows.map(r => r.dataset.id || r.dataset.key).join('|');
    if (sig !== PG.sig) { PG.sig = sig; PG.hal = 0; }
    const per = PG.per || rows.length || 1, jh = Math.max(1, Math.ceil(rows.length / per)); if (PG.hal >= jh) PG.hal = jh - 1;
    rows.forEach((r, i) => { r.hidden = Math.floor(i / per) !== PG.hal; });
    const tb = body.closest('table'), wadah = (tb && tb.closest('.table-responsive')) || tb; if (!wadah) return;
    let pg = $('mp258RegPager'); if (!pg) { pg = document.createElement('div'); pg.id = 'mp258RegPager'; pg.className = 'mp258-pager'; wadah.after(pg); }
    if (rows.length <= 25 && PG.per) { pg.hidden = true; return; }
    pg.hidden = false; const a = PG.hal * per;
    pg.innerHTML = `<span>Menampilkan <b>${rows.length ? a + 1 : 0}–${Math.min(a + per, rows.length)}</b> dari <b>${rows.length}</b> kontrak</span>
      <span class="n"><button type="button" class="btn btn-sm btn-outline-secondary" ${PG.hal ? '' : 'disabled'} onclick="MP258_PG.hal--;mp258Halaman()" aria-label="Halaman sebelumnya"><i class="fas fa-chevron-left"></i></button>
      <b>${PG.hal + 1} / ${jh}</b><button type="button" class="btn btn-sm btn-outline-secondary" ${PG.hal < jh - 1 ? '' : 'disabled'} onclick="MP258_PG.hal++;mp258Halaman()" aria-label="Halaman berikutnya"><i class="fas fa-chevron-right"></i></button></span>
      <select class="form-select form-select-sm" aria-label="Baris per halaman" onchange="MP258_PG.per=Number(this.value);MP258_PG.hal=0;mp258Halaman()">${[[25, '25 / halaman'], [50, '50 / halaman'], [0, 'Semua']].map(o => `<option value="${o[0]}" ${PG.per === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  }
  window.mp258Halaman = halaman;
  function bungkusRegister() {
    const asli = window.renderRegister; if (typeof asli !== 'function' || asli.__mp258) return;
    const baru = function () { const r = asli.apply(this, arguments); try { halaman(); } catch (e) { console.warn('[2.6.2] halaman register', e); } hitungT(); return r; };
    baru.__mp258 = true; window.renderRegister = baru;
  }

  /* ======================= 4. TOOLTIP DOKUMEN KURANG (Keuangan & Bayar) ======================= */
  function tandaiKeuangan() {
    const tab = $('tab-keuangan'); if (!tab || !RG.kurang || !RG.kurang.data) return;
    const d = RG.kurang.data;
    tab.querySelectorAll('.mp219-tb tbody tr').forEach(tr => {
      const b = tr.querySelector('button[onclick^="cl217Buka("]'), c = tr.querySelector('.mp219-pg'); if (!b || !c) return;
      const m = /cl217Buka\('([^']+)'\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
      const x = d[m[1]], t = !x ? 'Checklist belum diisi — buka Checklist untuk memilih kategori & dokumen.' : !x.kurang.length ? 'Semua ' + x.total + ' dokumen wajib lengkap' + (x.verified ? ' · terverifikasi' : ' · menunggu verifikasi Admin') : 'Dokumen kurang (' + x.kurang.length + '/' + x.total + '): ' + x.kurang.join(', ');
      if (c.dataset.mp258 === t) return;
      c.dataset.mp258 = t; c.title = t; c.classList.add('mp258-dk'); c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', t);
      c.onclick = ev => { ev.stopPropagation(); popDok(c, x, m[1]); }; c.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); popDok(c, x, m[1]); } };
    });
  }
  function popDok(c, x, id) {
    let p = $('mp258Pop'); if (p && p.dataset.id === id) { p.remove(); return; } if (p) p.remove();
    p = document.createElement('div'); p.id = 'mp258Pop'; p.className = 'mp258-pop'; p.dataset.id = id; p.setAttribute('role', 'tooltip');
    p.innerHTML = !x ? '<b>Checklist belum diisi</b><p>Buka Checklist untuk memilih kategori kontrak & mengisi dokumen.</p>'
      : x.kurang.length ? `<b>Dokumen kurang ${x.kurang.length} dari ${x.total}</b><small>Templat ${E({ ALAT: 'Sewa Alat', BAHAN: 'Bahan / Material', SUBKON: 'Subkon' }[x.kat] || x.kat)}</small><ol>${x.kurang.map(k => '<li>' + E(k) + '</li>').join('')}</ol>`
      : `<b>Semua ${x.total} dokumen lengkap</b><p>${x.verified ? 'Sudah diverifikasi Admin.' : 'Menunggu verifikasi Admin.'}</p>`;
    p.innerHTML += `<button type="button" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('mp258Pop').remove();cl217Buka('${E(id)}')">Buka Checklist</button>`;
    document.body.appendChild(p);
    const r = c.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 24);
    p.style.width = w + 'px'; p.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px'; p.style.top = (r.bottom + window.scrollY + 6) + 'px';
  }
  document.addEventListener('mousedown', ev => { const p = $('mp258Pop'); if (p && !ev.target.closest('#mp258Pop') && !ev.target.closest('.mp258-dk')) p.remove(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { const p = $('mp258Pop'); if (p) p.remove(); } });

  /* ======================= 5. JEJAK AUDIT (Admin) ======================= */
  const AU = { cari: '', aksi: '', oleh: '', dari: '', sd: '', hal: 0, r: null, muat: false, galat: '' };
  window.MP258_AU = AU;
  async function muatAudit() {
    AU.muat = true; AU.galat = ''; gambarAudit();
    try { AU.r = await regAksi('x186Audit', { data: { cari: AU.cari, aksi: AU.aksi, oleh: AU.oleh, dari: AU.dari, sd: AU.sd, hal: AU.hal, per: 50 } }); }
    catch (e) { AU.galat = e.message || String(e); }
    AU.muat = false; gambarAudit();
  }
  window.mp258Audit = () => {
    if (!adm()) return pesan('Jejak Audit khusus Admin.', 'err');
    if (!srv('jejakAudit')) return pesan('Jejak Audit butuh Modul server 1.9.0.', 'err');
    if (!$('mp258Au')) { const w = document.createElement('div'); w.id = 'mp258Au'; w.className = 'mp258-lapis'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Jejak Audit');
      w.addEventListener('mousedown', ev => { if (ev.target === w) w.remove(); }); w.addEventListener('keydown', ev => { if (ev.key === 'Escape') w.remove(); }); document.body.appendChild(w); }
    AU.hal = 0; muatAudit();
  };
  window.mp258AuSet = (k, v) => { AU[k] = v; AU.hal = k === 'hal' ? Number(v) : 0; muatAudit(); };
  const auCari = tunda(() => { AU.cari = ($('mp258AuQ') || {}).value || ''; AU.hal = 0; muatAudit(); }, 400);
  window.mp258AuCari = auCari;
  const wkt = s => { const d = new Date(s); return isNaN(d) ? String(s || '') : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  function gambarAudit() {
    const w = $('mp258Au'); if (!w) return;
    const r = AU.r || { total: 0, data: [], aksiDaftar: [], olehDaftar: [], per: 50, hal: 0 }, jh = Math.max(1, Math.ceil(r.total / (r.per || 50)));
    const fokus = document.activeElement && document.activeElement.id === 'mp258AuQ';
    w.innerHTML = `<div class="mp258-dlg"><header><b><i class="fas fa-clock-rotate-left me-2"></i>Jejak Audit</b><small>Seluruh perubahan data tercatat otomatis (siapa, kapan, apa) — tidak dapat diubah dari aplikasi.</small><button type="button" class="btn-close" aria-label="Tutup" onclick="document.getElementById('mp258Au').remove()"></button></header>
      <div class="mp258-au-f"><input type="search" id="mp258AuQ" class="form-control form-control-sm" placeholder="Cari no kontrak, aksi, detail…" value="${E(AU.cari)}" oninput="mp258AuCari()" aria-label="Cari">
        <select class="form-select form-select-sm" aria-label="Aksi" onchange="mp258AuSet('aksi',this.value)"><option value="">Semua aksi</option>${(r.aksiDaftar || []).map(a => `<option value="${E(a.aksi)}" ${AU.aksi === a.aksi ? 'selected' : ''}>${E(a.aksi)} (${a.n})</option>`).join('')}</select>
        <select class="form-select form-select-sm" aria-label="Pengguna" onchange="mp258AuSet('oleh',this.value)"><option value="">Semua pengguna</option>${(r.olehDaftar || []).map(a => `<option value="${E(a.oleh)}" ${AU.oleh === a.oleh ? 'selected' : ''}>${E(a.oleh)} (${a.n})</option>`).join('')}</select>
        <input type="date" class="form-control form-control-sm" aria-label="Dari tanggal" value="${E(AU.dari)}" onchange="mp258AuSet('dari',this.value)"><input type="date" class="form-control form-control-sm" aria-label="Sampai tanggal" value="${E(AU.sd)}" onchange="mp258AuSet('sd',this.value)">
        <button type="button" class="btn btn-sm btn-outline-success" onclick="mp258AuExcel()" ${r.total ? '' : 'disabled'}><i class="fas fa-file-excel me-1"></i>Ekspor Excel</button></div>
      ${AU.galat ? `<div class="alert alert-danger py-1 px-2 m-2">${E(AU.galat)}</div>` : ''}
      <div class="mp258-au-t">${AU.muat && !AU.r ? '<div class="mp258-nol"><i class="fas fa-spinner fa-spin me-1"></i>Memuat…</div>' : `<table class="mp258-tb"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Kontrak / ID</th><th>Detail</th></tr></thead><tbody>${r.data.length ? r.data.map(l => `<tr><td class="nw">${E(wkt(l.waktu))}</td><td>${E(l.oleh)}<small>${E(l.peran)}</small></td><td><span class="mp258-ak ${/DITOLAK|HAPUS|TOLAK|GAGAL/.test(l.aksi) ? 'm' : /BUAT|POSTING|TERBIT|VERIFIK/.test(l.aksi) ? 'h' : ''}">${E(l.aksi)}</span></td><td class="mono">${E(l.noKontrak || '')}<small>${E(l.id)}</small></td><td class="dt">${E(l.detail)}</td></tr>`).join('') : '<tr><td colspan="5" class="mp258-nol">Tidak ada catatan pada filter ini.</td></tr>'}</tbody></table>`}</div>
      <footer><span>${AU.muat ? '<i class="fas fa-spinner fa-spin me-1"></i>' : ''}${r.total.toLocaleString('id-ID')} catatan${r.jumlahLog !== undefined && r.total !== r.jumlahLog ? ' (dari ' + r.jumlahLog.toLocaleString('id-ID') + ')' : ''}</span>
        <span class="n"><button type="button" class="btn btn-sm btn-outline-secondary" ${AU.hal ? '' : 'disabled'} onclick="mp258AuSet('hal',${AU.hal - 1})" aria-label="Sebelumnya"><i class="fas fa-chevron-left"></i></button><b>${AU.hal + 1} / ${jh}</b><button type="button" class="btn btn-sm btn-outline-secondary" ${AU.hal < jh - 1 ? '' : 'disabled'} onclick="mp258AuSet('hal',${AU.hal + 1})" aria-label="Berikutnya"><i class="fas fa-chevron-right"></i></button></span></footer></div>`;
    if (fokus) { const q = $('mp258AuQ'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }
  window.mp258AuExcel = async () => {
    let r; try { r = await regAksi('x186Audit', { data: { cari: AU.cari, aksi: AU.aksi, oleh: AU.oleh, dari: AU.dari, sd: AU.sd, semua: true } }); } catch (e) { return pesan(e.message, 'err'); }
    const head = ['No', 'Waktu', 'Pengguna', 'Peran', 'Aksi', 'No Kontrak', 'ID', 'Detail'];
    const sel = v => `<td style="mso-number-format:'\\@'">${E(v)}</td>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">
      <tr><td colspan="8"><b>Jejak Audit — Proyek ${E(proyek())}</b></td></tr><tr><td colspan="8">Diekspor ${E(new Date().toLocaleString('id-ID'))} oleh ${E((sesi() || {}).nama || '-')} · ${r.total} catatan${AU.aksi || AU.oleh || AU.cari || AU.dari || AU.sd ? ' (terfilter)' : ''}</td></tr>
      <tr>${head.map(h => `<th style="background:#0B2B54;color:#fff">${h}</th>`).join('')}</tr>${r.data.map((l, i) => '<tr><td>' + (i + 1) + '</td>' + [wkt(l.waktu), l.oleh, l.peran, l.aksi, l.noKontrak, l.id, l.detail].map(sel).join('') + '</tr>').join('')}</table></body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    a.download = 'Jejak-Audit-' + proyek() + '-' + hariIni() + '.xls'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  /* ======================= pemasangan ======================= */
  const jalan = () => {
    pasangLonceng(); bungkusRegister();
    if ($('regBody') && !$('mp258RegPager') && $('regBody').querySelector('tr.baris-kontrak')) halaman();   // tabel sudah tergambar sebelum modul dimuat
    const dash = $('tab-dashboard-tagihan'); if (dash && (!$('mp258Ringkas') || !dash.contains($('mp258Ringkas')))) { RG.sig = ''; }
    gambarRingkas();
    const keu = $('tab-keuangan');
    if (keu && keu.querySelector('.mp219-tb')) { if (!RG.kurang || Date.now() - RG.kurangPada > 3 * 60000) muatKurang().then(tandaiKeuangan); else tandaiKeuangan(); }
  };
  let _o = 0;   // [2.6.2] pengamat dibatasi: paling sering sekali per 250 ms, tanpa memindai node (PDF/tabel besar tetap ringan)
  const obs = () => { if (!document.body) return; new MutationObserver(() => { if (_o) return; _o = setTimeout(() => { _o = 0; jalan(); }, 250); }).observe(document.body, { childList: true, subtree: true }); jalan(); };
  if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
  setInterval(() => { if (sesi() && !document.hidden) hitung(); }, 5 * 60000);
  setTimeout(() => { if (sesi()) muatKurang().then(() => { RG.sig = ''; gambarRingkas(); }); }, 2500);
  (function () {
    const kl = window.keluarLogin;
    if (typeof kl === 'function') window.keluarLogin = function () { RG.kurang = null; AU.r = null; NT.L = []; const w = $('mp258Au'); if (w) w.remove(); return kl.apply(this, arguments); };
    const ra = window.renderAllTables;
    if (typeof ra === 'function' && !ra.__mp258) { const b = function () { const r = ra.apply(this, arguments); hitungT(); return r; }; b.__mp258 = true; window.renderAllTables = b; }
    const cmd = window.itemCmdk;
    if (typeof cmd === 'function') window.itemCmdk = function (q) {
      const out = cmd.apply(this, arguments) || [], t = String(q || '').trim().toLowerCase();
      try {
        if (t.length >= 2 && /prioritas|kritis|eskalasi|notif/.test(t)) out.unshift({ grup: 'Notifikasi', ik: 'fa-triangle-exclamation', l: 'Notifikasi prioritas — Kritis / Warning / Info', s: 'Lonceng', aksi: () => window.mp258Buka('KRITIS') });
        if (adm() && srv('jejakAudit') && t.length >= 2 && /audit|jejak|log|riwayat/.test(t)) out.unshift({ grup: 'Admin', ik: 'fa-clock-rotate-left', l: 'Jejak Audit — seluruh perubahan data', s: 'Admin', aksi: () => window.mp258Audit() });
      } catch (e) { }
      return out;
    };
  })();
})();
