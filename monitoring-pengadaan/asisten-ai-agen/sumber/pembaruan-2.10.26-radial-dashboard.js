/* MP21026 — PEMBARUAN 2.10.26: MENU RADIAL + DOK MINI · DASHBOARD RINGKAS (hero donut, KPI, grafik tren & alur, status operasional)
   Aditif, murni tampilan: tanpa aksi server, sheet, maupun data baru. Sidebar lama TETAP ada di DOM (disembunyikan di layar lebar)
   sehingga bukaTab()/showTab() dan seluruh blok lama bekerja seperti biasa; menu radial dibaca langsung dari sidebar itu,
   jadi hak akses per peran (Admin / Pengadaan / Petugas Gudang / Lihat saja) otomatis ikut.
   Angka dashboard baru MENCERMINKAN angka yang sudah dihitung blok lama (hero, KPI, Prioritas Hari Ini, alur 7 langkah) — tidak ada rumus kedua. */
(function () {
  'use strict';
  if (window.MP21026) return;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baca = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
  const sesi = () => { try { return typeof REG !== 'undefined' && REG.sesi; } catch (e) { return null; } };
  const gelap = () => document.documentElement.getAttribute('data-tema') === 'gelap';
  const teks = id => { const el = $(id); return el ? el.textContent.trim() : ''; };
  const angka = s => { const m = String(s || '').replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : 0; };
  const K_MODE = 'JICT_MENU_RADIAL', K_FREK = 'JICT_MENU_FREK', K_DASH = 'JICT_DASH_RINGKAS';
  const S = { buka: false, item: [], frek: {}, tHover: 0, tTutup: 0, tDash: 0, grafik: {}, fokusAsal: null };
  try { S.frek = JSON.parse(baca(K_FREK, '{}')) || {}; } catch (e) { S.frek = {}; }

  /* ======================= 1. MENU RADIAL ======================= */
  const PENDEK = { 'dashboard-tagihan': 'Dashboard', 'form-bon': 'Bon', pbj: 'PBJ', register: 'Register', 'form-progres': 'Progres', 'monitoring-bulanan': 'BK Bulanan', keuangan: 'Keuangan',
    pembentuk: 'Pembentuk Tagihan', arsipvendor: 'Arsip Vendor', gdmasuk: 'Penerimaan', gdharian: 'Laporan Harian', gdkartu: 'Kartu Gudang', gdstok: 'Stok', gdbaso: 'BASO & BASTA', masterdata: 'Master Data',
    'form-kontrak': 'Input Kontrak', kontrak: 'Master Kontrak', alur: 'Lacak Alur', material: 'Material', service: 'Service', vendor: 'Vendor' };
  const BAWAAN = ['dashboard-tagihan', 'form-bon', 'register', 'form-progres', 'keuangan'];
  const radialAktif = () => baca(K_MODE, '1') !== '0';
  const tabKini = () => { try { return typeof tabAktif === 'function' ? tabAktif() : ''; } catch (e) { return ''; } };

  // daftar menu = isi sidebar yang benar-benar boleh dilihat peran ini (display dihitung per <li>, tidak terpengaruh sidebar yang disembunyikan)
  function bacaMenu() {
    const out = []; let grup = '';
    document.querySelectorAll('#sidebar ul.nav > li').forEach(li => {
      if (getComputedStyle(li).display === 'none') return;
      const a = li.querySelector('a.nav-link');
      if (!a) { grup = li.textContent.trim(); return; }
      const m = (a.getAttribute('onclick') || '').match(/showTab\('([^']+)'/); if (!m) return;
      const ik = a.querySelector('i'), bd = a.querySelector('.badge');
      let label = ''; a.childNodes.forEach(n => { if (n.nodeType === 3) label += n.textContent; else if (n !== ik && n !== bd && !(n.classList && n.classList.contains('badge'))) label += n.textContent; });
      label = label.replace(/\s+/g, ' ').trim();
      out.push({ tab: m[1], a, grup, label, pendek: PENDEK[m[1]] || label, ikon: ik ? ik.className.replace(/\bm[es]-\d\b/g, '').trim() : 'fas fa-circle', badge: bd ? bd.textContent.trim() : '' });
    });
    return out;
  }
  function pilih(tab) {
    const it = S.item.find(x => x.tab === tab) || bacaMenu().find(x => x.tab === tab);
    tutup(true);
    if (it && it.a) it.a.click(); else if (typeof bukaTab === 'function') bukaTab(tab);
    window.scrollTo && window.scrollTo(0, 0);
  }
  function pasangKerangka() {
    if ($('mprdRail')) return;
    document.body.insertAdjacentHTML('beforeend', `<nav id="mprdRail" class="mprd-rail" aria-label="Akses cepat">
        <button type="button" id="mprdBtn" class="mprd-trg" aria-haspopup="menu" aria-expanded="false" aria-controls="mprdLapis" title="Semua menu (Alt+M)"><i class="fas fa-compass"></i><span class="visually-hidden">Buka menu</span></button>
        <div id="mprdDok" class="mprd-dok"></div>
      </nav>
      <div id="mprdLapis" class="mprd-lapis" hidden>
        <div class="mprd-roda" id="mprdRoda" role="menu" aria-label="Menu utama"></div>
        <div class="mprd-kaki"><button type="button" data-aksi="cari"><i class="fas fa-magnifying-glass"></i>Cari <kbd>Ctrl K</kbd></button><button type="button" data-aksi="klasik"><i class="fas fa-table-columns"></i>Sidebar klasik</button><span id="mprdVersi"></span></div>
      </div>`);
    const btn = $('mprdBtn'), lapis = $('mprdLapis');
    btn.addEventListener('click', () => { clearTimeout(S.tHover); S.buka ? tutup() : buka(); });
    if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      btn.addEventListener('mouseenter', () => { clearTimeout(S.tHover); S.tHover = setTimeout(() => { if (!S.buka) buka(); }, 380); });
      btn.addEventListener('mouseleave', () => clearTimeout(S.tHover));
    }
    lapis.addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) { tutup(); return; }
      if (b.dataset.tab) pilih(b.dataset.tab);
      else if (b.dataset.aksi === 'tutup') tutup();
      else if (b.dataset.aksi === 'cari') { tutup(true); if (typeof bukaCmdk === 'function') bukaCmdk(); }
      else if (b.dataset.aksi === 'klasik') { tutup(true); aturMode(false); }
    });
    $('mprdDok').addEventListener('click', ev => { const b = ev.target.closest('button[data-tab]'); if (b) pilih(b.dataset.tab); });
    document.addEventListener('keydown', ev => {
      if (ev.altKey && !ev.ctrlKey && !ev.metaKey && (ev.key === 'm' || ev.key === 'M')) { if (!radialAktif() || !sesi()) return; ev.preventDefault(); S.buka ? tutup() : buka(); return; }
      if (!S.buka) return;
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); tutup(); return; }
      const arah = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
      const L = [...$('mprdRoda').querySelectorAll('button[data-tab]')];
      if (arah && L.length) { ev.preventDefault(); const i = L.indexOf(document.activeElement); L[(i + arah + L.length) % L.length].focus(); }
      else if (ev.key === 'Home' && L.length) { ev.preventDefault(); L[0].focus(); }
      else if (ev.key === 'Tab') { const F = [...lapis.querySelectorAll('button')], i = F.indexOf(document.activeElement); if (ev.shiftKey && i <= 0) { ev.preventDefault(); F[F.length - 1].focus(); } else if (!ev.shiftKey && i === F.length - 1) { ev.preventDefault(); F[0].focus(); } }
    }, true);
    window.addEventListener('resize', () => { if (S.buka) susun(); });
  }
  // posisi butir: cincin dalam = menu utama, cincin luar = sisanya; jari-jari menyesuaikan layar (HP s.d. monitor lebar)
  function susun() {
    const roda = $('mprdRoda'); if (!roda) return;
    const L = S.item = bacaMenu(), n = L.length, vw = window.innerWidth, vh = window.innerHeight, hp = vw < 768;
    const uk = hp ? 50 : 62;
    // layar lebar: dua lingkaran; HP (potret): dua elips tegak agar label tidak bertumpuk di layar sempit
    const rx = Math.max(118, Math.min(hp ? 150 : 262, vw / 2 - uk / 2 - (hp ? 20 : 14)));
    const ry = hp ? Math.max(rx, Math.min(rx * 1.72, vh / 2 - uk / 2 - 132)) : Math.max(118, Math.min(rx, vh / 2 - uk / 2 - 64));
    const RL = { x: hp ? rx : Math.min(rx, ry), y: ry }, satu = n <= (hp ? 6 : 8);
    const RD = satu ? { x: Math.min(RL.x, hp ? 120 : 170), y: Math.min(RL.y, hp ? 150 : 170) } : { x: Math.round(RL.x * (hp ? .5 : .56)), y: Math.round(RL.y * (hp ? .52 : .56)) };
    const muat = Math.max(3, Math.floor(Math.PI * (RD.x + RD.y) / (uk + (hp ? 38 : 30))));
    const nDalam = satu ? n : Math.min(muat, hp ? 6 : 8, Math.max(4, Math.round(n * .42)));
    const aktif = tabKini();
    const butir = (it, i, R, total, geser) => { const sdt = -Math.PI / 2 + (i + geser) * 2 * Math.PI / total;
      return `<button type="button" role="menuitem" class="mprd-it${it.tab === aktif ? ' aktif' : ''}" data-tab="${E(it.tab)}" title="${E(it.label)}" style="--x:${Math.round(Math.cos(sdt) * R.x)}px;--y:${Math.round(Math.sin(sdt) * R.y)}px;--d:${Math.min(i * 22 + (R === RD ? 0 : 90), 420)}ms">
        <span class="b"><i class="${E(it.ikon)}"></i>${it.badge ? `<em>${E(it.badge)}</em>` : ''}</span><span class="l">${E(it.pendek)}</span></button>`; };
    const dalam = L.slice(0, nDalam), luar = L.slice(nDalam);
    roda.style.setProperty('--uk', uk + 'px');
    const cincin = R => `<i class="mprd-cincin" style="--rx:${R.x}px;--ry:${R.y}px"></i>`;
    roda.innerHTML = `${cincin(RD)}${luar.length ? cincin(RL) : ''}
      <button type="button" class="mprd-hub" data-aksi="tutup" aria-label="Tutup menu"><i class="fas fa-xmark"></i><small>Tutup</small></button>
      ${dalam.map((it, i) => butir(it, i, RD, dalam.length, 0)).join('')}${luar.map((it, i) => butir(it, i, RL, luar.length, .5)).join('')}`;
    const v = $('mprdVersi'), sv = $('sbVersi'); if (v) v.textContent = sv ? sv.textContent : '';
  }
  function buka() {
    if (S.buka || !sesi()) return;
    pasangKerangka(); clearTimeout(S.tTutup);
    const lapis = $('mprdLapis'); susun(); if (!S.item.length) return;
    S.buka = true; S.fokusAsal = document.activeElement;
    lapis.hidden = false; void lapis.offsetWidth; lapis.classList.add('buka');
    document.body.classList.add('mprd-terbuka'); $('mprdBtn').setAttribute('aria-expanded', 'true');
    const f = lapis.querySelector('.mprd-it.aktif') || lapis.querySelector('.mprd-it'); if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { } }, 60);
  }
  function tutup(segera) {
    const lapis = $('mprdLapis'); clearTimeout(S.tHover); if (!lapis || !S.buka) return;
    S.buka = false; lapis.classList.remove('buka'); document.body.classList.remove('mprd-terbuka');
    const b = $('mprdBtn'); if (b) b.setAttribute('aria-expanded', 'false');
    clearTimeout(S.tTutup); S.tTutup = setTimeout(() => { if (!S.buka) lapis.hidden = true; }, segera ? 0 : 280);
    if (!segera && S.fokusAsal && S.fokusAsal.focus && document.contains(S.fokusAsal)) { try { S.fokusAsal.focus({ preventScroll: true }); } catch (e) { } }
    gambarDok();
  }
  // dok mini: 5 menu yang paling sering dibuka di perangkat ini (urutan mengikuti sidebar agar posisinya tidak berpindah-pindah)
  function gambarDok() {
    const dok = $('mprdDok'); if (!dok) return;
    const L = bacaMenu(), skor = t => (S.frek[t] || 0) + (BAWAAN.indexOf(t) >= 0 ? (BAWAAN.length - BAWAAN.indexOf(t)) * .1 : 0);
    const top = L.map((it, i) => ({ it, i, s: skor(it.tab) })).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 5).sort((a, b) => a.i - b.i).map(x => x.it);
    const aktif = tabKini(), sig = top.map(x => x.tab + x.badge).join('|') + '#' + aktif;
    if (dok.dataset.sig === sig) return; dok.dataset.sig = sig;
    dok.innerHTML = top.map(it => `<button type="button" class="${it.tab === aktif ? 'aktif' : ''}" data-tab="${E(it.tab)}" aria-label="${E(it.label)}" data-tip="${E(it.pendek)}"><i class="${E(it.ikon)}"></i>${it.badge ? `<em>${E(it.badge)}</em>` : ''}</button>`).join('');
  }
  function aturMode(aktif, diam) {
    tulis(K_MODE, aktif ? '1' : '0');
    document.body.classList.toggle('mprd-on', !!aktif);
    if (aktif) { pasangKerangka(); gambarDok(); } else tutup(true);
    const mi = $('mprdMenuMode'); if (mi) mi.innerHTML = `<i class="fas ${aktif ? 'fa-table-columns' : 'fa-compass'} me-2"></i>${aktif ? 'Pakai sidebar klasik' : 'Pakai menu radial'}`;
    if (!diam && typeof notif === 'function') notif(aktif ? 'Menu radial aktif — tombol kompas di kiri atau Alt+M.' : 'Sidebar klasik aktif. Kembali ke menu radial lewat menu akun.', 'ok');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);   // grafik menyesuaikan lebar baru
  }
  function pasangMenuAkun() {
    const ul = document.querySelector('.app-header .menu-akun .dropdown-menu'); if (!ul || $('mprdMenuMode')) return;
    const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mprdMenuMode"></a>';
    const kon = ul.querySelector('.dropdown-item[onclick^="bukaKoneksi"]'); if (kon && kon.closest('li')) kon.closest('li').before(li); else ul.appendChild(li);
    li.firstChild.addEventListener('click', ev => { ev.preventDefault(); aturMode(!radialAktif()); });
  }
  // kait navigasi: hitung frekuensi, tandai aktif, tombol ☰ / "Menu" HP membuka radial
  (function kait() {
    const st = window.showTab;
    if (typeof st === 'function') window.showTab = function (nama) {
      const r = st.apply(this, arguments);
      try { if (nama) { S.frek[nama] = Math.min((S.frek[nama] || 0) + 1, 9999); tulis(K_FREK, JSON.stringify(S.frek)); }
        const dok = $('mprdDok'); if (dok) dok.querySelectorAll('button[data-tab]').forEach(b => b.classList.toggle('aktif', b.dataset.tab === nama));
        if (S.buka) tutup(true); if (nama === 'dashboard-tagihan') jadwalDash(); } catch (e) { }
      return r;
    };
    const mh = window.menuHp;
    if (typeof mh === 'function') window.menuHp = function (b) {
      if (radialAktif() && sesi()) { const sb = $('sidebar'); if (sb) sb.classList.remove('show'); if (b === false) tutup(); else S.buka ? tutup() : buka(); return; }
      return mh.apply(this, arguments);
    };
    const pp = window.perbaruiTampilanPeran;
    if (typeof pp === 'function') window.perbaruiTampilanPeran = function () { const r = pp.apply(this, arguments); try { setTimeout(() => { const d = $('mprdDok'); if (d) d.dataset.sig = ''; gambarDok(); jadwalDash(); }, 0); } catch (e) { } return r; };
  })();

  /* ======================= 2. DASHBOARD RINGKAS ======================= */
  const TETAP = ['mprdDash', 'bannerMigrasi', 'mp214Rekap'];   // selain ini = "rincian", tampil di mode Lengkap
  const ringkas = () => baca(K_DASH, '1') !== '0';
  function aturDash(r) {
    tulis(K_DASH, r ? '1' : '0'); const tab = $('tab-dashboard-tagihan'); if (!tab) return;
    tab.classList.toggle('mprd-ringkas', !!r);
    tab.querySelectorAll('.mprd-mode button').forEach(b => { const on = (b.dataset.mode === 'ringkas') === !!r; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  }
  window.mprdDashMode = aturDash;
  function kerangkaDash() {
    const tab = $('tab-dashboard-tagihan'); if (!tab) return null;
    let el = $('mprdDash');
    if (!el) {
      el = document.createElement('section'); el.id = 'mprdDash'; el.className = 'mprd-dash'; el.setAttribute('aria-label', 'Ringkasan eksekutif pengadaan');
      el.innerHTML = `<div class="mprd-hero">
          <div class="mprd-hero-t">
            <div class="eb"><i class="fas fa-anchor"></i><span>Procurement &amp; SAP Monitoring · Waskita – Nindya KSO</span></div>
            <h2 id="mprdJudul"></h2><p id="mprdSapa"></p>
            <div class="mprd-aksi" id="mprdAksi"></div>
          </div>
          <div class="mprd-ring" role="img" id="mprdRing" aria-label="Realisasi tagihan">
            <svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="58" class="d"/><circle cx="70" cy="70" r="58" class="i" id="mprdRingIsi" stroke-dasharray="0 364.42"/></svg>
            <div class="t"><b id="mprdPersen">0%</b><span>Realisasi<br>Tagihan (BK)</span></div>
          </div>
          <dl class="mprd-makro">
            <div><dt>Nilai Kontrak</dt><dd id="mprdNilai">–</dd><small id="mprdNilaiSub"></small></div>
            <div><dt>Realisasi Tagihan (BK)</dt><dd id="mprdReal">–</dd><small id="mprdRealSub"></small></div>
            <div><dt>Sisa Nilai Kontrak</dt><dd id="mprdSisa">–</dd><small id="mprdSisaSub"></small></div>
          </dl>
          <div class="mprd-mode" role="group" aria-label="Kepadatan dashboard"><button type="button" data-mode="ringkas">Ringkas</button><button type="button" data-mode="lengkap">Lengkap</button></div>
        </div>
        <div class="mprd-kpi" id="mprdKpi"></div>
        <div class="mprd-grid">
          <article class="mprd-kartu mprd-g-tren"><header><div><h4>Tren Realisasi Tagihan</h4><small id="mprdTrenSub">nilai tagihan (BA) per bulan vs yang sudah dibayar</small></div><div class="mprd-leg" id="mprdTrenLeg"></div></header><div class="mprd-kanvas"><canvas id="mprdTren" role="img" aria-label="Grafik garis tren realisasi tagihan bulanan"></canvas><div class="mprd-kosong" id="mprdTrenKosong" hidden></div></div></article>
          <article class="mprd-kartu mprd-g-alur"><header><div><h4>Alur Pengadaan · Langkah 1–7</h4><small>jumlah dokumen di tiap tahap — klik batang untuk membuka</small></div></header><div class="mprd-kanvas"><canvas id="mprdAlur" role="img" aria-label="Grafik batang jumlah dokumen per langkah pengadaan"></canvas><div class="mprd-kosong" id="mprdAlurKosong" hidden></div></div></article>
        </div>
        <article class="mprd-kartu mprd-ops"><header><div><h4>Status Operasional</h4><small id="mprdOpsSub"></small></div></header><div class="mprd-ops-g" id="mprdOps"></div></article>`;
      tab.prepend(el);
      el.querySelector('.mprd-mode').addEventListener('click', ev => { const b = ev.target.closest('button[data-mode]'); if (b) aturDash(b.dataset.mode === 'ringkas'); });
      el.addEventListener('click', ev => {
        const k = ev.target.closest('[data-kpi]'); if (k) { const asal = [...document.querySelectorAll('#mp258Ringkas .mp258-k')][+k.dataset.kpi]; if (asal) { if (/mp258Draf/.test(asal.getAttribute('onclick') || '')) aturDash(false); asal.click(); } return; }
        const o = ev.target.closest('[data-ops]'); if (o) { try { (OPS_AKSI[o.dataset.ops] || (() => { }))(); } catch (e) { } return; }
        const a = ev.target.closest('[data-buka]'); if (a) pilih(a.dataset.buka);
      });
      aturDash(ringkas());
      // blok lama yang menyisipkan / memperbarui panel memicu gambar ulang (dibatasi jadwalDash)
      if (window.MutationObserver) new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('#mprdDash')))) jadwalDash(); }).observe(tab, { childList: true, subtree: true, characterData: true });
    }
    if (tab.firstElementChild !== el) tab.prepend(el);
    [...tab.children].forEach(c => { if (TETAP.indexOf(c.id) < 0 && !c.classList.contains('mprd-lama')) c.classList.add('mprd-lama'); });
    return el;
  }
  const OPS_AKSI = {};
  function jadwalDash() { clearTimeout(S.tDash); S.tDash = setTimeout(() => { try { gambarDash(); } catch (e) { console.warn('[2.10.26] dashboard', e); } }, 140); }
  function setel(id, v) { const el = $(id); if (el && el.textContent !== v) el.textContent = v; }
  function gambarDash() {
    const tab = $('tab-dashboard-tagihan'); if (!tab || !sesi()) { const x = $('mprdDash'); if (x) x.hidden = true; return; }
    const el = kerangkaDash(); if (!el) return; el.hidden = false;
    // --- hero: cermin angka blok lama ---
    setel('mprdJudul', teks('heroJudul') || 'Monitoring Pengadaan'); setel('mprdSapa', teks('heroSapa'));
    const pct = Math.max(0, Math.min(angka(teks('heroPersen')), 100));
    setel('mprdPersen', teks('heroPersen') || '0%');
    const isi = $('mprdRingIsi'), da = (pct / 100 * 364.42).toFixed(1) + ' 364.42'; if (isi && isi.getAttribute('stroke-dasharray') !== da) isi.setAttribute('stroke-dasharray', da); if (isi) isi.style.visibility = pct > 0 ? '' : 'hidden';
    $('mprdRing').setAttribute('aria-label', 'Realisasi tagihan ' + (teks('heroPersen') || '0%') + ' dari nilai kontrak');
    setel('mprdNilai', teks('statTotalNilai') || '–'); setel('mprdNilaiSub', teks('statTotalKontrak') + (teks('statSubKontrak') ? ' · ' + teks('statSubKontrak') : ''));
    setel('mprdReal', teks('statTotalRealisasi') || '–'); setel('mprdRealSub', teks('statSubRealisasi'));
    setel('mprdSisa', teks('statSisa') || '–'); setel('mprdSisaSub', teks('statSubSisa'));
    const menu = bacaMenu(), ada = t => menu.some(m => m.tab === t);
    const aksi = [['form-bon', 'fa-clipboard-list', 'Permintaan'], ['register', 'fa-clipboard-check', 'Register'], ['form-progres', 'fa-list-check', 'Progres & BA'], ['keuangan', 'fa-money-check-dollar', 'Keuangan']].filter(a => ada(a[0]));
    const hA = aksi.map((a, i) => `<button type="button" class="${i ? '' : 'utama'}" data-buka="${a[0]}"><i class="fas ${a[1]}"></i>${a[2]}</button>`).join('');
    const wa = $('mprdAksi'); if (wa.dataset.sig !== hA) { wa.dataset.sig = hA; wa.innerHTML = hA; }
    // --- KPI: cermin kartu Prioritas Hari Ini ---
    const kp = [...document.querySelectorAll('#mp258Ringkas .mp258-k')].map((b, i) => ({ i, kelas: ['kritis', 'warning', 'info', 'ok'].find(c => b.classList.contains(c)) || 'info', ikon: (b.querySelector('i') || {}).className || 'fas fa-circle',
      l: (b.querySelector('.l') || {}).textContent || '', v: (b.querySelector('b') || {}).textContent || '', s: (b.querySelector('small') || {}).textContent || '' }));
    const hK = kp.map(k => `<button type="button" class="mprd-k ${k.kelas}${k.kelas !== 'ok' && angka(k.v) > 0 ? ' nyala' : ''}" data-kpi="${k.i}"><span class="h"><i class="${E(k.ikon)}"></i><span>${E(k.l)}</span></span><b>${E(k.v)}</b><small>${E(k.s)}</small></button>`).join('');
    const wk = $('mprdKpi'); wk.hidden = !kp.length; if (wk.dataset.sig !== hK) { wk.dataset.sig = hK; wk.innerHTML = hK; }
    gambarOps(); gambarGrafik();
  }
  function gambarOps() {
    const ring = (typeof RINGKASAN !== 'undefined' && RINGKASAN) || [], prog = (typeof PROG !== 'undefined' && PROG.data) || [];
    const data = ring.filter(g => g.nilai > 0 || (g.items && g.items.length)), c = k => data.filter(g => g.statusKey === k).length;
    const dibayar = prog.filter(e => e.bayar && e.bayar.status === 'DIBAYAR').length, ba = prog.filter(e => e.baTerbit).length;
    const st = k => () => { if (typeof bukaKontrakStatus === 'function') bukaKontrakStatus(k); };
    const L = [
      ['berjalan', 'Kontrak berjalan', c('berjalan'), 'biru', st('berjalan')], ['proses', 'Proses kontrak', c('proses'), 'navy', st('proses')],
      ['selesai', 'Kontrak selesai', c('selesai'), 'netral', st('selesai')], ['lengkapi', 'Perlu dilengkapi', c('lengkapi'), c('lengkapi') ? 'merah' : 'netral', st('lengkapi')],
      ['pmt', 'Permintaan belum dikontrakkan', angka(teks('heroPermintaan')), angka(teks('heroPermintaan')) ? 'merah' : 'netral', () => pilih('form-bon')],
      ['ba', 'BA terbit', ba, 'biru', () => pilih('form-progres')], ['sap', 'Tagihan menunggu SAP', angka(teks('heroSAP')), angka(teks('heroSAP')) ? 'merah' : 'netral', () => pilih('monitoring-bulanan')],
      ['bayar', 'Tagihan dibayar', dibayar + ' / ' + prog.length, 'navy', () => pilih('keuangan')]];
    L.forEach(x => { OPS_AKSI[x[0]] = x[4]; });
    const h = L.map(x => `<button type="button" class="mprd-o ${x[3]}" data-ops="${x[0]}"><b>${E(typeof x[2] === 'number' ? x[2].toLocaleString('id-ID') : x[2])}</b><span>${E(x[1])}</span></button>`).join('');
    const w = $('mprdOps'); if (w.dataset.sig !== h) { w.dataset.sig = h; w.innerHTML = h; }
    setel('mprdOpsSub', 'posisi ' + (teks('dashTanggal') || new Date().toLocaleDateString('id-ID')) + ' · ' + data.length.toLocaleString('id-ID') + ' kontrak · ' + prog.length.toLocaleString('id-ID') + ' tagihan');
  }
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const rpS = v => { try { if (typeof fmtRpSingkat === 'function') return fmtRpSingkat(v); } catch (e) { } return 'Rp ' + Math.round(v).toLocaleString('id-ID'); };
  const rp = v => { try { if (typeof fmtRp === 'function') return fmtRp(v); } catch (e) { } return 'Rp ' + Math.round(v).toLocaleString('id-ID'); };
  function dataTren() {
    const prog = (typeof PROG !== 'undefined' && PROG.data) || [], m = {};
    prog.forEach(e => { const t = String(e.tanggal || e.baTerbit || '').match(/^(\d{4})-(\d{2})/); if (!t) return; const k = +t[1] * 12 + (+t[2] - 1), n = Number(e.nilai) || 0;
      const o = m[k] || (m[k] = { tagih: 0, bayar: 0 }); o.tagih += n; if (e.bayar && e.bayar.status === 'DIBAYAR') o.bayar += Number(e.bayar.nilaiBayar) || n; });
    const ks = Object.keys(m).map(Number).sort((a, b) => a - b); if (!ks.length) return null;
    const akhir = ks[ks.length - 1], awal = Math.max(ks[0], akhir - 11), mulai = ks.length === 1 ? awal - 1 : awal, out = [];
    for (let k = mulai; k <= akhir; k++) out.push({ label: BLN[k % 12] + ' ' + String(Math.floor(k / 12)).slice(2), tagih: (m[k] || {}).tagih || 0, bayar: (m[k] || {}).bayar || 0 });
    return out;
  }
  function dataAlur() {
    return [...document.querySelectorAll('#alurPengadaan .alur-step')].map((s, i) => ({ el: s, no: i + 1, l: (s.querySelector('.l') || {}).textContent || ('Langkah ' + (i + 1)), v: angka((s.querySelector('.v') || {}).textContent), s: (s.querySelector('.s') || {}).textContent || '' }));
  }
  const namaLangkah = l => { const m = [[/permintaan/i, 'Permintaan'], [/pbj/i, 'PBJ'], [/register/i, 'Register'], [/kontrak/i, 'Kontrak'], [/tagihan|\bBA\b/i, 'Tagihan'], [/sap|miro/i, 'SAP'], [/bayar/i, 'Bayar']].find(x => x[0].test(l)); return m ? m[1] : String(l).split(' ')[0]; };
  function gambarGrafik() {
    const tren = dataTren(), alur = dataAlur(), g = gelap();
    const W = g ? { a: '#4C9BEA', b: '#E6EDF6', grid: 'rgba(255,255,255,.08)', teks: '#98A9BF', bar: '#2D7FD3', barH: '#4C9BEA', tip: '#0C2242' } : { a: '#1763B3', b: '#0B2B54', grid: '#E9EEF5', teks: '#5D6B82', bar: '#1763B3', barH: '#0B2B54', tip: '#0B2B54' };
    const tk = $('mprdTrenKosong'), ak = $('mprdAlurKosong'), ct = $('mprdTren'), ca = $('mprdAlur');
    const tanpaChart = typeof Chart === 'undefined';
    tk.hidden = !!tren && !tanpaChart; ct.hidden = !tren || tanpaChart; if (!tk.hidden) tk.innerHTML = tanpaChart ? 'Grafik tidak tersedia (Chart.js tidak termuat).' : '<i class="fas fa-chart-line"></i>Belum ada tagihan (BA) tercatat.<br>Garis tren muncul setelah progres pertama diinput.';
    ak.hidden = !!alur.length && !tanpaChart; ca.hidden = !alur.length || tanpaChart; if (!ak.hidden) ak.innerHTML = tanpaChart ? 'Grafik tidak tersedia (Chart.js tidak termuat).' : 'Alur pengadaan belum termuat.';
    $('mprdTrenLeg').innerHTML = tren && !tanpaChart ? `<span><i style="background:${W.a}"></i>Tagihan (BA)</span><span><i style="background:${W.b}"></i>Dibayar</span>` : '';
    if (tanpaChart) return;
    const sig = JSON.stringify([g, tren, alur.map(x => [x.l, x.v, x.s])]); if (sig === S.sigGrafik) return; S.sigGrafik = sig;
    const font = { family: getComputedStyle(document.body).fontFamily, size: 11 };
    const dasar = { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: W.tip, titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 8, displayColors: true, boxPadding: 4, titleFont: font, bodyFont: font } } };
    const sumbu = (cb, lewati) => ({ x: { grid: { display: false }, border: { color: W.grid }, ticks: { color: W.teks, font, maxRotation: 0, autoSkip: lewati, autoSkipPadding: 8 } }, y: { beginAtZero: true, grid: { color: W.grid }, border: { display: false }, ticks: { color: W.teks, font, maxTicksLimit: 5, callback: cb } } });
    const buat = (id, kanvas, cfg) => { if (S.grafik[id]) { try { S.grafik[id].destroy(); } catch (e) { } S.grafik[id] = null; } S.grafik[id] = new Chart(kanvas, cfg); };
    if (tren) {
      const set = (label, key, warna, isi) => ({ label, data: tren.map(x => x[key]), borderColor: warna, backgroundColor: isi, fill: !!isi, borderWidth: 2, tension: .32, pointRadius: tren.length > 8 ? 0 : 3, pointHoverRadius: 5, pointBackgroundColor: warna, pointBorderColor: g ? '#0C2242' : '#fff', pointBorderWidth: 2 });
      buat('tren', ct, { type: 'line', data: { labels: tren.map(x => x.label), datasets: [set('Tagihan (BA)', 'tagih', W.a, g ? 'rgba(76,155,234,.14)' : 'rgba(23,99,179,.09)'), set('Dibayar', 'bayar', W.b, '')] },
        options: Object.assign({}, dasar, { scales: sumbu(v => rpS(v), true), plugins: Object.assign({}, dasar.plugins, { tooltip: Object.assign({}, dasar.plugins.tooltip, { callbacks: { label: c => c.dataset.label + ': ' + rp(c.raw) } }) }) }) });
    } else if (S.grafik.tren) { S.grafik.tren.destroy(); S.grafik.tren = null; }
    if (alur.length) {
      buat('alur', ca, { type: 'bar', data: { labels: alur.map(x => ['L' + x.no, namaLangkah(x.l)]), datasets: [{ label: 'Dokumen', data: alur.map(x => x.v), backgroundColor: W.bar, hoverBackgroundColor: W.barH, borderRadius: 6, maxBarThickness: 46, minBarLength: 3 }] },
        options: Object.assign({}, dasar, { scales: sumbu(v => Number.isInteger(v) ? v.toLocaleString('id-ID') : '', false),
          onClick: (ev, els) => { if (els && els.length) { const x = dataAlur()[els[0].index]; if (x && x.el) x.el.click(); } },
          onHover: (ev, els) => { if (ev.native && ev.native.target) ev.native.target.style.cursor = els && els.length ? 'pointer' : ''; },
          plugins: Object.assign({}, dasar.plugins, { tooltip: Object.assign({}, dasar.plugins.tooltip, { displayColors: false, callbacks: { title: c => 'Langkah ' + alur[c[0].dataIndex].no + ' · ' + alur[c[0].dataIndex].l, label: c => c.raw.toLocaleString('id-ID') + ' dokumen', afterLabel: c => alur[c.dataIndex].s } }) }) }) });
    } else if (S.grafik.alur) { S.grafik.alur.destroy(); S.grafik.alur = null; }
  }
  (function kaitDash() {
    const rh = window.renderHeroDashboard;
    if (typeof rh === 'function') window.renderHeroDashboard = function () { const r = rh.apply(this, arguments); jadwalDash(); return r; };
  })();

  /* ======================= 3. MULAI ======================= */
  function mulai() {
    pasangMenuAkun();
    if (radialAktif()) aturMode(true, true); else { const mi = $('mprdMenuMode'); if (mi) mi.innerHTML = '<i class="fas fa-compass me-2"></i>Pakai menu radial'; }
    jadwalDash();
  }
  window.MP21026 = { buka, tutup, mode: aturMode, dash: () => { S.sigGrafik = ''; jadwalDash(); }, menu: bacaMenu, state: S };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.addEventListener('load', () => setTimeout(() => { pasangMenuAkun(); gambarDok(); jadwalDash(); }, 1200));
})();
