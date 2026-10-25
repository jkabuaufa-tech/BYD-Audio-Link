/* MP2614 — PEMBARUAN 2.6.14 / 2.6.15: KANTOR AGEN AI LIVE — ruang kerja isometrik beranimasi, 0 token (aditif; butuh blok MP2613 · tanpa perubahan server & data)
 *  Tujuh agen digambar sebagai karakter di kantor isometrik (canvas, tanpa berkas gambar): Pendata, Pemantau Kontrak, Auditor Nilai, Admin Draf,
 *  Analis Keuangan, Petugas Gudang (helm proyek) dan Manajer. Setiap karakter memegang satu langkah kerja Agen AI 2.6.13: saat langkahnya berjalan
 *  ia duduk mengetik di mejanya dengan balon tugas & "•••"; sesudahnya balon berisi hasil nyata (mis. "✓ 3 kejanggalan (1 galat)").
 *  Di sela putaran, karakter berpatroli atas temuan nyata ("🔎 Pantau 055/SPM · Cahaya Utama"), berjalan ke papan temuan, dispenser kopi,
 *  jendela atau sofa, lalu kembali ke meja. Papan di dinding berisi catatan tempel sejumlah temuan (warna Kritis/Warning/Info).
 *  Langit jendela mengikuti jam perangkat (siang/malam). Klik karakter → kartu temuan bagiannya + Buka.
 *  0 token: semua teks berasal dari hasil pemeriksaan lokal MP2613; tidak ada panggilan AI. Animasi hanya berjalan selama Kantor terbuka
 *  (requestAnimationFrame, berhenti saat tab tersembunyi); prefers-reduced-motion → tanpa berjalan & 2 bingkai/detik.
 *  [2.6.15] Roster = tim pengadaan proyek: Joko Supriyono (Manajer Pengadaan), Charles Van Anto (tagihan SPM/SPPM & administrasi gudang),
 *          M Yusuf Van Basten (tagihan service SPK/SPPP/SPKP/SPSA), Vicha Ramadhani (SAP: PR/PO/GR/GI/SES/MIRO), Salma (bon → PBJ → register kontrak),
 *          Rowin & Gede (Adkon: WBS bon permintaan — langkah baru Agen AI).
 *  [2.6.17] Ilham = BOSS Pengadaan (tim divisi): mereviu kepatuhan prosedur — memegang langkah 'prosedur' & seluruh temuan Kritis.
 *  Akses: klik dock Agen AI · menu akun › Kantor Agen (Live) · tombol Kantor Live di Meja Kerja Agen. */
(function () {
  'use strict';
  if (window.__MP2614__) return; window.__MP2614__ = true;
  const A = () => window.MP2613_AGEN || null;
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const proyek = () => (typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || '';
  const hemat = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pendek = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const rpS = n => { n = N(n); return n >= 1e9 ? 'Rp ' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : 'Rp ' + Math.round(n).toLocaleString('id-ID'); };

  /* ======================= 1. GEOMETRI ISOMETRIK ======================= */
  const LW = 700, LH = 505, TW = 56, TH = 28, GW = 13, GH = 10, WH = 132;
  const OX = (LW - (GW + GH) * TW / 2) / 2 + GH * TW / 2, OY = 168;
  const P = (i, j, z) => [OX + (i - j) * TW / 2, OY + (i + j) * TH / 2 - (z || 0)];
  function poly(c, pts, fill, garis) { c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (garis) { c.strokeStyle = garis; c.lineWidth = 1; c.stroke(); } }
  function kotak(c, i, j, w, d, h, z0, atas, kiri, kanan) {   // balok: sisi j+d (kiri-depan) & i+w (kanan-depan) terlihat
    const z1 = z0 + h;
    poly(c, [P(i, j + d, z0), P(i + w, j + d, z0), P(i + w, j + d, z1), P(i, j + d, z1)], kiri);
    poly(c, [P(i + w, j, z0), P(i + w, j + d, z0), P(i + w, j + d, z1), P(i + w, j, z1)], kanan);
    poly(c, [P(i, j, z1), P(i + w, j, z1), P(i + w, j + d, z1), P(i, j + d, z1)], atas);
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  const acak = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function teksDinding(c, i0, j0, z, arahI, teks, font, warna, glow) {   // teks menempel pada bidang dinding (dinding belakang: arahI; dinding kiri: dari depan ke belakang)
    const [x, y] = P(i0, j0, z), u = Math.hypot(TW / 2, TH / 2);
    c.save(); c.translate(x, y); c.transform(arahI ? TW / 2 / u : TW / 2 / u, arahI ? TH / 2 / u : -TH / 2 / u, 0, 1, 0, 0);
    c.font = font; c.fillStyle = warna; c.textBaseline = 'middle'; if (glow) { c.shadowColor = glow; c.shadowBlur = 10; } c.fillText(teks, 0, 0); c.restore();
  }

  /* ======================= 2. PEMERAN & PERABOT ======================= */
  // [2.6.15] tim pengadaan proyek: tiap orang memegang langkah kerja Agen AI sesuai tugasnya
  const ROSTER = [
    { id: 'vicha', nama: 'Vicha Ramadhani', peran: 'SAP', ik: '💻', langkah: ['sinkron'], kerja: { sinkron: 'Sinkron PR · PO · GR · GI · SES · MIRO' }, sumber: [], meja: [1.5, 2], kulit: '#F1C27D', rambut: '#2B2622', baju: '#8E5BC2', celana: '#2F3B52', gaya: 'panjang' },
    { id: 'salma', nama: 'Salma', peran: 'Kontrak', ik: '📑', langkah: ['masa', 'draf'], kerja: { masa: 'Cek masa kontrak & dokumen vendor', draf: 'Cek bon → PBJ → register kontrak' }, sumber: ['Kontrak', 'Dokumen vendor', 'Draf kontrak'], meja: [5, 2], kulit: '#E0AC69', rambut: '#3A2418', baju: '#B83A2E', celana: '#C8B88A', gaya: 'panjang', kacamata: 1 },
    { id: 'yusuf', nama: 'M Yusuf Van Basten', peran: 'Tagihan Service', ik: '🧾', langkah: ['nilai'], kerja: { nilai: 'Cocokkan SPK · SPPP · SPKP · SPSA & tagihan' }, sumber: ['Nilai & tagihan'], meja: [8.5, 2], kulit: '#C68B5E', rambut: '#141414', baju: '#1F2D44', celana: '#2B2F38', gaya: 'pendek' },
    { id: 'rowin', nama: 'Rowin', peran: 'Adkon', ik: '🏷️', langkah: ['wbs'], kerja: { wbs: 'Beri WBS bon permintaan' }, sumber: ['WBS bon'], meja: [1.5, 5.5], kulit: '#F5D0A9', rambut: '#1A1A1A', baju: '#F2B705', celana: '#2F3B52', gaya: 'pendek' },
    { id: 'gede', nama: 'Gede', peran: 'Adkon', ik: '🏷️', langkah: ['wbs'], kerja: { wbs: 'Beri WBS bon permintaan' }, sumber: ['WBS bon'], meja: [5, 5.5], kulit: '#8D5524', rambut: '#1A1A1A', baju: '#2E9E5B', celana: '#3A3A3A', gaya: 'pendek' },
    { id: 'ilham', nama: 'Ilham', peran: 'BOSS Pengadaan', ik: '🛡️', langkah: ['prosedur'], kerja: { prosedur: 'Reviu kepatuhan prosedur pengadaan' }, sumber: [], kritis: 1, meja: [8.5, 5.5], kulit: '#E8B88A', rambut: '#4A3020', baju: '#5A2D82', celana: '#2B2F38', gaya: 'pendek', dasi: 1 },
    { id: 'charles', nama: 'Charles Van Anto', peran: 'Tagihan & Gudang', ik: '📦', langkah: ['bayar', 'gudang'], kerja: { bayar: 'Rekap tagihan SPM & SPPM', gudang: 'Cek kartu gudang & pengeluaran' }, sumber: ['Keuangan', 'Gudang'], meja: [11.2, 2.6], lebar: 1.5, kulit: '#D9A066', rambut: '#6B4A2B', baju: '#3D7DCA', celana: '#2B2F38', gaya: 'pendek' },
    { id: 'joko', nama: 'Joko Supriyono', peran: 'Manajer Pengadaan', ik: '📋', langkah: ['susun'], kerja: { susun: 'Susun prioritas pengadaan' }, sumber: [], manajer: 1, meja: [11.2, 6.5], lebar: 1.5, kulit: '#C68B5E', rambut: '#3B2A20', baju: '#0B1F3A', celana: '#1E2633', gaya: 'pendek', dasi: 1 }
  ];
  const TITIK = { papan: [0.85, 2.3, '📌 Tempel temuan di papan'], kopi: [11.0, 1.4, '☕ Ambil kopi'], jendela: [7.75, 0.95, '🌆 Lihat progres lapangan'], sofa: [4.6, 8.15, '🛋️ Rehat sebentar'], dispenser: [11.0, 1.4, '🥤 Isi air minum'] };
  const LORONG = j => j < 5 ? 4.5 : 8.05, CELAH = 7.75, LAJU = 1.8;
  const duduk = r => [r.meja[0] + (r.lebar || 2) / 2, r.meja[1] + 1.55];
  const KT = { buka: false, raf: 0, last: 0, t: 0, ch: [], bg: null, bgKunci: '', s: 1, dpr: 1, pilih: '', strip: 0, idle: 0 };
  window.MP2614_KANTOR = KT; window.MP2614_ROSTER = ROSTER;
  function siapkan() {
    if (KT.ch.length) return;
    KT.ch = ROSTER.map((r, k) => { const [i, j] = duduk(r); return { r, i, j, jalur: [], sampai: 0, mode: 'meja', teks: '', titik: false, fase: k * 1.7, k: 0, urut: k, hadap: 0, jalan: false }; });
  }

  /* ======================= 3. TEKS BALON — dari hasil pemeriksaan nyata (0 token) ======================= */
  const temuanDari = id => { const a = A(), r = ROSTER.find(x => x.id === id) || {}; return a ? a.temuan.filter(x => (r.sumber || []).indexOf(x.sumber) >= 0 || ((r.manajer || r.kritis) && x.level === 'KRITIS')) : []; };
  function baris(c) {
    const a = A(), r = c.r; if (!a || !a.pada) return '☕ Menunggu data proyek…';
    const R = a.ring || {}, n = R.n || {}, T = temuanDari(r.id), x = T.length ? T[(c.k++ + c.urut) % T.length] : null;   // Adkon bertiga mulai dari bon berbeda
    switch (r.id) {
      case 'vicha': return '💻 SAP: ' + (R.kontrak || 0) + ' kontrak · ' + (R.bk || 0) + ' BK tersinkron';
      case 'salma': return x ? '📑 ' + x.judul : '📑 Kontrak & register tertib';
      case 'yusuf': return x ? '🧾 Cek ' + x.judul : '🧾 Tagihan service konsisten';
      case 'charles': return x ? (x.sumber === 'Gudang' ? '📦 ' : '🧾 ') + x.judul : R.bayar ? '🧾 ' + R.bayar + ' tagihan belum bayar · ' + rpS(R.nilaiBayar) : '📦 Gudang & tagihan aman';
      case 'ilham': return x ? '🛡️ Reviu ' + x.judul : '🛡️ Alur pengadaan sesuai prosedur';
      case 'joko': return n.KRITIS ? '📋 Prioritas: ' + n.KRITIS + ' kritis' : '📋 Pengadaan terkendali';
      default: return x ? '🏷️ WBS ' + x.judul : /dilewati/.test((a.hasilL || {}).wbs || '') ? '🏷️ Menunggu bon permintaan' : '🏷️ Semua bon ber-WBS';
    }
  }

  /* ======================= 4. GERAK & PERILAKU ======================= */
  function jalurKe(c, ti, tj) {
    const L = [], la = LORONG(c.j), lb = LORONG(tj);
    if (Math.abs(c.j - la) > .05) L.push([c.i, la]);
    if (la !== lb) { L.push([CELAH, la]); L.push([CELAH, lb]); }
    L.push([ti, lb]); L.push([ti, tj]);
    c.jalur = L.filter((p, k) => k === 0 || p[0] !== L[k - 1][0] || p[1] !== L[k - 1][1]);
    if (hemat()) { c.i = ti; c.j = tj; c.jalur = []; }
  }
  const diMeja = c => { const [i, j] = duduk(c.r); return Math.abs(c.i - i) < .05 && Math.abs(c.j - j) < .05; };
  const keMeja = c => { const [i, j] = duduk(c.r); if (!diMeja(c) && !(c.jalur.length && c.tuju === 'meja')) { c.tuju = 'meja'; jalurKe(c, i, j); } };
  function perilaku(c, now) {
    const a = A(), r = c.r;
    if (c.ov && now < c.ov.sampai) { if (c.ov.meja) keMeja(c); c.teks = c.ov.teks; c.titik = !!c.ov.titik; c.status = c.ov.status || 'kerja'; return; }   // [2.6.16] sedang mengerjakan perintah Manajer
    if (c.ov) { c.ov = null; c.sampai = 0; }
    if (a && a.jalan) {   // putaran kerja: semua kembali ke meja; pemegang langkah aktif mengetik
      keMeja(c); c.mode = 'meja'; c.sampai = now + 6000;
      const hs = r.langkah.filter(l => (a.hasilL || {})[l]), h = hs.length ? a.hasilL[hs[hs.length - 1]] : '';
      if (r.langkah.indexOf(a.aktif) >= 0) { c.teks = r.ik + ' ' + (r.kerja[a.aktif] || a.langkah.replace(/…$/, '')); c.titik = true; c.status = 'kerja'; }
      else if (h) { c.teks = (/^gagal/.test(h) ? '⚠️ ' : /^dilewati/.test(h) ? '⏭️ ' : '✓ ') + h; c.titik = false; c.status = 'selesai'; }
      else { c.teks = '⏳ Menunggu giliran'; c.titik = false; c.status = 'antre'; }
      return;
    }
    if (c.jalur.length || now < c.sampai) return;
    if (c.mode === 'titik') { c.mode = 'meja'; c.teks = '↩️ Kembali ke meja'; c.titik = false; c.status = 'jalan'; keMeja(c); c.sampai = now + 1500; return; }
    const kritis = (((a && a.ring) || {}).n || {}).KRITIS || 0, peluang = Math.random();
    if (diMeja(c) && peluang < 0.35 && a && a.pada) {   // pergi ke suatu tempat lalu kembali
      const L = ['kopi', 'sofa', 'jendela', 'dispenser'].concat(r.sumber.length || r.kritis ? ['papan'] : []), pilih = r.manajer ? (kritis ? 'papan' : 'jendela') : L[Math.floor(Math.random() * L.length)];
      const t = TITIK[pilih], sibuk = KT.ch.some(o => o !== c && o.mode === 'titik' && o.tujuan === pilih);
      if (!sibuk) {
        c.mode = 'titik'; c.tujuan = pilih; c.tuju = pilih; c.status = 'jalan';
        c.teks = pilih === 'papan' && kritis ? '📌 Rapat: ' + kritis + ' temuan kritis' : t[2]; c.titik = false;
        jalurKe(c, t[0], t[1]); c.sampai = now + 5000 + Math.random() * 3000; return;
      }
    }
    keMeja(c); c.mode = 'meja'; c.teks = baris(c); c.titik = Math.random() < .6; c.status = 'meja'; c.sampai = now + 7000 + Math.random() * 7000;
  }
  function gerak(c, dt) {
    c.jalan = false; if (!c.jalur.length) return;
    const [ti, tj] = c.jalur[0], di = ti - c.i, dj = tj - c.j, d = Math.hypot(di, dj), l = LAJU * dt;
    if (d <= l) { c.i = ti; c.j = tj; c.jalur.shift(); if (!c.jalur.length && c.mode === 'titik') c.sampai = Math.max(c.sampai, performance.now() + 4000); }
    else { c.i += di / d * l; c.j += dj / d * l; }
    c.jalan = d > 0.001; c.hadap = (di + dj) >= 0 ? 0 : 1;   // 0 = menghadap penonton, 1 = membelakangi
    c.balik = (di - dj) < 0;
  }

  /* ======================= 5. MENGGAMBAR ======================= */
  function latar(c) {   // lapisan tetap: dinding, jendela + kota, lantai, karpet, papan nama — digambar sekali per ukuran & jam
    const jam = new Date().getHours(), siang = jam >= 6 && jam < 18, rnd = acak(7);
    const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#0A1428'); g.addColorStop(1, '#101C33'); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
    poly(c, [P(0, 0, WH), P(GW, 0, WH), P(GW, 0, 0), P(0, 0, 0)], '#3A4150');
    poly(c, [P(0, 0, WH), P(0, GH, WH), P(0, GH, 0), P(0, 0, 0)], '#2E3441');
    // jendela dinding belakang
    for (let i = 0.5; i < GW - 1.6; i += 1.75) {
      const a = i, b = i + 1.6, z0 = 26, z1 = WH - 14, w = [P(a, 0, z0), P(b, 0, z0), P(b, 0, z1), P(a, 0, z1)];
      c.save(); poly(c, w); c.clip();
      const lg = c.createLinearGradient(0, w[2][1], 0, w[0][1]); lg.addColorStop(0, siang ? '#7FB3E6' : '#0B1530'); lg.addColorStop(1, siang ? '#CFE3F5' : '#1B2C52'); c.fillStyle = lg; c.fill();
      for (let k = a - 0.2; k < b; k += 0.25 + rnd() * 0.35) {
        const lb = 0.2 + rnd() * 0.3, t = z0 + 18 + rnd() * (z1 - z0 - 20);
        poly(c, [P(k, 0, z0), P(k + lb, 0, z0), P(k + lb, 0, t), P(k, 0, t)], siang ? (rnd() < .5 ? '#8FA6BF' : '#A7B8CB') : (rnd() < .5 ? '#16223D' : '#1D2B4B'));
        for (let zz = z0 + 4; zz < t - 4; zz += 6) for (let ii = k + 0.04; ii < k + lb - 0.05; ii += 0.08) if (rnd() < (siang ? .25 : .35)) poly(c, [P(ii, 0, zz), P(ii + .04, 0, zz), P(ii + .04, 0, zz + 3), P(ii, 0, zz + 3)], siang ? '#D6E2EE' : '#F6C85F');
      }
      c.restore();
      c.lineWidth = 3; c.strokeStyle = '#1F242E'; poly(c, w); c.stroke();
      c.beginPath(); const m1 = P((a + b) / 2, 0, z0), m2 = P((a + b) / 2, 0, z1); c.moveTo(m1[0], m1[1]); c.lineTo(m2[0], m2[1]); c.lineWidth = 2; c.stroke();
    }
    // lantai kayu (papan berselang)
    for (let j = 0; j < GH; j += 0.5) {
      poly(c, [P(0, j), P(GW, j), P(GW, j + .5), P(0, j + .5)], (j * 2) % 2 ? '#A9784A' : '#B4855A');
      for (let i = rnd() * 2; i < GW; i += 1.5 + rnd() * 2) { const p1 = P(i, j), p2 = P(i, j + .5); c.strokeStyle = 'rgba(70,40,15,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke(); }
    }
    poly(c, [P(2.6, 7.9), P(6.6, 7.9), P(6.6, 9.9), P(2.6, 9.9)], '#5B6B7F'); poly(c, [P(2.8, 8.05), P(6.4, 8.05), P(6.4, 9.75), P(2.8, 9.75)], '#6E7F94');
    // list dinding
    poly(c, [P(0, 0, 6), P(GW, 0, 6), P(GW, 0, 0), P(0, 0, 0)], '#262B35'); poly(c, [P(0, 0, 6), P(0, GH, 6), P(0, GH, 0), P(0, 0, 0)], '#22262F');
    // papan nama neon di dinding kiri
    poly(c, [P(0, 8.9, 104), P(0, 3.7, 104), P(0, 3.7, 58), P(0, 8.9, 58)], '#141A26', '#000');
    teksDinding(c, 0, 8.55, 90, false, 'KANTOR PENGADAAN', '800 14.5px system-ui, sans-serif', '#FF5FA2', '#FF5FA2');
    teksDinding(c, 0, 8.55, 70, false, 'Proyek ' + proyek() + ' · 0 token', '600 11px system-ui, sans-serif', '#7FD3FF', '#7FD3FF');
  }
  function papan(c) {   // papan gabus di dinding kiri: catatan tempel = temuan
    poly(c, [P(0, 3.4, 98), P(0, 0.9, 98), P(0, 0.9, 40), P(0, 3.4, 40)], '#9C6B3C', '#5C3A1C');
    const a = A(), T = a ? a.temuan.slice(0, 12) : [], W = { KRITIS: '#F28B82', WARNING: '#FDD663', INFO: '#8AB4F8' };
    T.forEach((x, k) => { const jj = 3.2 - (k % 4) * 0.6, zz = 88 - Math.floor(k / 4) * 16; poly(c, [P(0, jj, zz), P(0, jj - .42, zz), P(0, jj - .42, zz - 11), P(0, jj, zz - 11)], W[x.level] || '#ccc'); });
    if (!T.length) teksDinding(c, 0, 3.1, 70, false, a && a.pada ? '✓ Bersih' : '…', '700 11px system-ui', '#FFF5D6');
  }
  function meja(c, r, t, ch) {
    const [i, j] = r.meja, w = r.lebar || 2, kerja = ch && ch.status === 'kerja';
    kotak(c, i + .08, j + .1, .12, .8, 16, 0, '#5C3A1C', '#4A2E15', '#3E2611'); kotak(c, i + w - .2, j + .1, .12, .8, 16, 0, '#5C3A1C', '#4A2E15', '#3E2611');
    kotak(c, i, j, w, 1, 4, 16, '#A87447', '#7A5232', '#6A4529');
    kotak(c, i + .35, j + .12, w - .7, .14, 22, 20, '#20262F', '#151A21', '#1B2028');
    const sc = [P(i + .42, j + .26, 23), P(i + w - .42, j + .26, 23), P(i + w - .42, j + .26, 40), P(i + .42, j + .26, 40)];
    const kedip = kerja ? (Math.sin(t * 9 + i) > 0 ? '#57C7FF' : '#3FA9E8') : (ch && ch.mode === 'meja' && ch.status === 'meja' ? '#2F7FB8' : '#24394F');
    poly(c, sc, kedip);
    if (kerja || (ch && ch.status === 'meja')) for (let k = 0; k < 4; k++) { const y0 = 37 - k * 3.5, l = .3 + ((k * 37 + Math.floor(t * (kerja ? 4 : 1))) % 5) / 10; poly(c, [P(i + .5, j + .27, y0), P(i + .5 + l * (w - 1) / 1, j + .27, y0), P(i + .5 + l * (w - 1), j + .27, y0 - 1.4), P(i + .5, j + .27, y0 - 1.4)], 'rgba(255,255,255,.55)'); }
    kotak(c, i + w / 2 - .35, j + .5, .7, .22, 1.5, 20, '#2B2F38', '#1E2129', '#1E2129');
    kotak(c, i + .25, j + .45, .3, .25, 5, 20, '#E9E2D0', '#CFC6B0', '#BFB59D');   // berkas
  }
  function kursi(c, i, j) { kotak(c, i - .28, j - .1, .56, .5, 3, 10, '#2B2F38', '#1E2129', '#23272F'); kotak(c, i - .28, j + .32, .56, .1, 22, 12, '#30353F', '#22262E', '#272B33'); kotak(c, i - .04, j + .1, .08, .08, 10, 0, '#555', '#444', '#333'); }
  function tanaman(c, i, j, besar) { kotak(c, i, j, .5, .5, 14, 0, '#9A6440', '#7B4E30', '#6A4329'); const [x, y] = P(i + .25, j + .25, 14 + (besar ? 12 : 6)); [['#2F7D35', 0, 0, besar ? 16 : 11], ['#3E9A44', -6, 4, besar ? 11 : 8], ['#4CAF50', 6, 2, besar ? 10 : 7]].forEach(d => { c.fillStyle = d[0]; c.beginPath(); c.ellipse(x + d[1], y + d[2] - (besar ? 6 : 2), d[3], d[3] * .8, 0, 0, Math.PI * 2); c.fill(); }); }
  function sofa(c) { kotak(c, 3, 8.75, 3.2, .9, 10, 0, '#D8C6A5', '#BBA783', '#A8946F'); kotak(c, 3, 9.45, 3.2, .3, 22, 0, '#CDBA98', '#B29E7A', '#9E8A66'); kotak(c, 2.75, 8.75, .3, 1, 16, 0, '#C9B592', '#AE9A76', '#9B8763'); kotak(c, 6.2, 8.75, .3, 1, 16, 0, '#C9B592', '#AE9A76', '#9B8763'); }
  function kopi(c, t) {
    kotak(c, 11.8, .15, 1.1, .75, 18, 0, '#7A5232', '#5E3E25', '#4F3420');
    kotak(c, 11.95, .25, .4, .4, 18, 18, '#2B2F38', '#1E2129', '#23272F'); kotak(c, 12.45, .25, .32, .32, 26, 18, '#9FD3F2', '#7DBBE0', '#6AAAD2');
    const [x, y] = P(12.15, .5, 40); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); for (let k = 0; k < 3; k++) { const o = Math.sin(t * 2 + k) * 2; c.moveTo(x - 3 + k * 3, y); c.quadraticCurveTo(x - 3 + k * 3 + o, y - 6, x - 3 + k * 3, y - 12); } c.stroke();
  }
  function lemari(c) { kotak(c, .1, 6.2, .55, 2.1, 70, 0, '#6E4A2C', '#5A3B22', '#4C321D'); const W = ['#C0392B', '#2E86C1', '#F1C40F', '#27AE60', '#8E44AD', '#E67E22']; for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) kotak(c, .62, 6.3 + k * .3, .04, .22, 14, 8 + r * 21, W[(k + r) % 6], W[(k + r) % 6], W[(k + r + 1) % 6]); }

  function orang(c, ch, t) {
    const r = ch.r, [x, y] = P(ch.i, ch.j, 0), dk = !ch.jalur.length && diMeja(ch), bel = dk || ch.hadap === 1;
    const ay = ch.jalan ? Math.sin(t * 12 + ch.fase) : 0, tinggi = dk ? 9 : 15, by = y - tinggi, ketik = dk && (ch.status === 'kerja' || ch.titik) ? Math.sin(t * 22 + ch.fase) : 0;
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2); c.fill();
    if (!dk) { c.fillStyle = r.celana; c.fillRect(x - 5, by, 4, 14 - Math.max(0, ay) * 3); c.fillRect(x + 1, by, 4, 14 - Math.max(0, -ay) * 3); c.fillStyle = '#1B1B1B'; c.fillRect(x - 6, y - 2 - Math.max(0, ay) * 3, 5, 3); c.fillRect(x + 1, y - 2 - Math.max(0, -ay) * 3, 5, 3); }
    c.fillStyle = r.baju; rr(c, x - 8, by - 17, 16, 18, 5); c.fill();
    if (r.id === 'salma') { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (let k = -6; k < 8; k += 4) { c.beginPath(); c.moveTo(x + k, by - 16); c.lineTo(x + k, by); c.stroke(); } }
    if (r.dasi && !bel) { c.fillStyle = '#C0262D'; c.beginPath(); c.moveTo(x - 2, by - 16); c.lineTo(x + 2, by - 16); c.lineTo(x + 1, by - 6); c.lineTo(x, by - 4); c.lineTo(x - 1, by - 6); c.fill(); }
    c.fillStyle = r.baju; const ln = ch.jalan ? ay * 3 : 0;
    rr(c, x - 11, by - 15 + ln + (dk ? ketik : 0), 4, 12, 2); c.fill(); rr(c, x + 7, by - 15 - ln - (dk ? ketik : 0), 4, 12, 2); c.fill();
    c.fillStyle = r.kulit; c.fillRect(x - 11, by - 4 + ln + (dk ? ketik : 0), 4, 3); c.fillRect(x + 7, by - 4 - ln - (dk ? ketik : 0), 4, 3);
    const hy = by - 25; c.fillStyle = r.kulit; c.beginPath(); c.arc(x, hy, 8, 0, Math.PI * 2); c.fill();
    if (r.gaya !== 'botak') { c.fillStyle = r.rambut; c.beginPath();
      if (bel) { c.arc(x, hy, 8.4, 0, Math.PI * 2); c.fill(); if (r.gaya === 'panjang') { rr(c, x - 8.5, hy, 17, 13, 4); c.fill(); } }
      else { c.arc(x, hy - 1, 8.4, Math.PI * 1.05, Math.PI * 1.95); c.fill(); if (r.gaya === 'panjang') { c.fillRect(x - 9, hy - 3, 3, 14); c.fillRect(x + 6, hy - 3, 3, 14); } } }
    if (!bel) { c.fillStyle = '#1B1B1B'; c.fillRect(x - 4 + (ch.balik ? -1 : 1), hy, 2, 2.5); c.fillRect(x + 2 + (ch.balik ? -1 : 1), hy, 2, 2.5);
      if (r.kacamata) { c.strokeStyle = '#111'; c.lineWidth = 1.2; c.strokeRect(x - 6, hy - 1.5, 5, 4.5); c.strokeRect(x + 1, hy - 1.5, 5, 4.5); } }
    if (r.helm) { c.fillStyle = '#F5C518'; c.beginPath(); c.arc(x, hy - 2, 8.8, Math.PI, 0); c.fill(); c.fillStyle = '#C99A00'; c.fillRect(x - 10.5, hy - 2.5, 21, 2.6); c.fillRect(x - 1.2, hy - 10.5, 2.4, 8); }
    return hy - 10;   // puncak kepala
  }
  function balon(c, ch, x, puncak, t) {
    c.font = '600 10px system-ui, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; c.textBaseline = 'middle';
    let y = puncak - 6;
    if (ch.titik) { const w = 24, h = 12, y0 = y - h; c.fillStyle = '#FFFFFF'; rr(c, x - w / 2, y0, w, h, 6); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke();
      for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(40,48,60,' + (hemat() ? .8 : .35 + .65 * Math.max(0, Math.sin(t * 6 - k * .8))) + ')'; c.beginPath(); c.arc(x - 6 + k * 6, y0 + 6, 1.8, 0, Math.PI * 2); c.fill(); } y = y0 - 4; }
    if (!ch.teks) return;
    const s = pendek(ch.teks, 34), w = Math.min(230, c.measureText(s).width + 14), h = 16, y0 = y - h;
    c.fillStyle = 'rgba(255,255,255,.96)'; rr(c, x - w / 2, y0, w, h, 6); c.fill(); c.strokeStyle = 'rgba(15,25,40,.35)'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(x - 4, y0 + h); c.lineTo(x + 4, y0 + h); c.lineTo(x, y0 + h + 4); c.fillStyle = '#fff'; c.fill();
    c.fillStyle = '#16233A'; c.fillText(s, x - w / 2 + 7, y0 + h / 2 + .5);
  }
  function label(c, ch, x, y) {
    c.font = '700 9px system-ui, sans-serif'; c.textBaseline = 'middle';
    const n = ch.r.nama, w1 = c.measureText(n).width; c.font = '600 7.5px system-ui, sans-serif'; const w2 = c.measureText(ch.r.peran).width, w = w1 + w2 + 22;
    c.fillStyle = 'rgba(11,31,58,.86)'; rr(c, x - w / 2, y + 5, w, 13, 6.5); c.fill();
    c.fillStyle = ch.status === 'kerja' ? '#F5C518' : ch.status === 'jalan' ? '#7FD3FF' : '#43D17A'; c.beginPath(); c.arc(x - w / 2 + 7, y + 11.5, 2.6, 0, Math.PI * 2); c.fill();
    c.font = '700 9px system-ui, sans-serif'; c.fillStyle = '#fff'; c.fillText(n, x - w / 2 + 12, y + 12);
    c.font = '600 7.5px system-ui, sans-serif'; c.fillStyle = '#A9B6C9'; c.fillText(ch.r.peran, x - w / 2 + 15 + w1, y + 12);
    if (KT.pilih === ch.r.id) { c.strokeStyle = '#F5C518'; c.lineWidth = 2; rr(c, x - w / 2 - 2, y + 3, w + 4, 17, 8); c.stroke(); }
  }
  function gambar(t) {
    const cv = $('mp2614Cv'); if (!cv) return; const c = cv.getContext('2d');
    c.setTransform(KT.s * KT.dpr, 0, 0, KT.s * KT.dpr, 0, 0);
    const kunci = cv.width + 'x' + new Date().getHours() + proyek();
    if (KT.bgKunci !== kunci) { KT.bg = document.createElement('canvas'); KT.bg.width = cv.width; KT.bg.height = cv.height; const b = KT.bg.getContext('2d'); b.setTransform(KT.s * KT.dpr, 0, 0, KT.s * KT.dpr, 0, 0); latar(b); KT.bgKunci = kunci; }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(KT.bg, 0, 0); c.restore();
    papan(c);
    const D = [];   // urutan kedalaman (i + j)
    KT.ch.forEach(ch => { const r = ch.r, [si, sj] = duduk(r); D.push({ k: r.meja[0] + (r.lebar || 2) / 2 + r.meja[1] + .5, f: () => meja(c, r, t, ch) }); D.push({ k: si + sj - .02, f: () => kursi(c, si, sj) }); D.push({ k: ch.i + ch.j + .01, ch }); });
    D.push({ k: 13.6, f: () => sofa(c) }, { k: 13.4, f: () => kopi(c, t) }, { k: 7.5, f: () => lemari(c) }, { k: .9, f: () => tanaman(c, .25, .2, true) }, { k: 9.6, f: () => tanaman(c, .25, 9.25) }, { k: 16.6, f: () => tanaman(c, 7.3, 9.1) }, { k: 17.6, f: () => tanaman(c, 12.35, 5.0, true) }, { k: 11.6, f: () => tanaman(c, 10.9, .3) });
    D.sort((a, b) => a.k - b.k);
    const B = [];
    D.forEach(d => { if (d.f) return d.f(); const ch = d.ch, [x, y] = P(ch.i, ch.j, 0); const pk = orang(c, ch, t); ch.kotak = [x - 13, pk - 4, 26, y - pk + 22]; B.push([ch, x, y, pk]); });
    B.forEach(([ch, x, y]) => label(c, ch, x, y));
    B.forEach(([ch, x, y, pk]) => balon(c, ch, x, pk, t));
  }

  /* ======================= 6. DIALOG, STRIP STATUS, KARTU TEMUAN ======================= */
  const STATUS = { kerja: 'Bekerja', selesai: 'Selesai', antre: 'Antre', jalan: 'Berjalan', meja: 'Di meja' };
  function strip() {
    const ul = $('mp2614Strip'); if (!ul) return;
    KT.ch.forEach(ch => { let li = ul.querySelector('[data-id="' + ch.r.id + '"]');
      if (!li) { li = document.createElement('li'); li.dataset.id = ch.r.id; li.tabIndex = 0; li.setAttribute('role', 'button'); li.innerHTML = '<b></b><span></span><small></small>'; li.onclick = () => window.mp2614Pilih(ch.r.id); li.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); window.mp2614Pilih(ch.r.id); } }; ul.appendChild(li); }
      const s = ch.status || 'meja', v = [ch.r.ik + ' ' + ch.r.nama + ' · ' + ch.r.peran, STATUS[s] || s, ch.teks || ''];
      li.className = 'st-' + s + (KT.pilih === ch.r.id ? ' aktif' : '');
      [...li.children].forEach((e, k) => { if (e.textContent !== v[k]) e.textContent = v[k]; }); });
    const a = A(), h = $('mp2614Sub'); if (h && a) h.textContent = a.jalan ? 'Putaran #' + a.putaran + ' sedang berjalan · ' + a.langkah : a.pada ? 'Putaran #' + a.putaran + ' selesai ' + new Date(a.pada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' · ' + a.temuan.length + ' temuan' : 'Menunggu data proyek…';
  }
  function kartu() {
    const w = $('mp2614Info'); if (!w) return; const ch = KT.ch.find(x => x.r.id === KT.pilih);
    if (!ch) { w.hidden = true; w.innerHTML = ''; return; }
    const T = temuanDari(ch.r.id), a = A();
    w.hidden = false;
    w.innerHTML = `<div class="h"><b>${E(ch.r.ik + ' ' + ch.r.nama)}</b><small>${E(STATUS[ch.status] || '')} · ${E(ch.r.peran)} · ${E(ch.teks || '')}</small><button type="button" class="btn-close" aria-label="Tutup kartu" onclick="mp2614Pilih('')"></button></div>
      ${T.length ? T.slice(0, 4).map(x => `<div class="t ${E(x.level.toLowerCase())}"><span>${E(x.judul)}<small>${E(pendek(x.ket, 90))}</small></span>${x.buka ? `<button type="button" class="btn btn-sm btn-outline-primary" onclick="mp2614Tutup(); ${E(x.buka)}">Buka</button>` : ''}</div>`).join('') + (T.length > 4 ? `<div class="lagi">+${T.length - 4} lainnya</div>` : '')
        : '<p class="kosong">Tidak ada temuan di bagian ini.</p>'}
      <button type="button" class="btn btn-sm btn-light border" onclick="mp2614Tutup(); mp2613Buka('temuan')">Semua temuan di Meja Kerja</button>`;
  }
  window.mp2614Pilih = id => { KT.pilih = KT.pilih === id ? '' : id; kartu(); strip(); };
  function ukur() {
    const cv = $('mp2614Cv'), wr = $('mp2614Wrap'); if (!cv || !wr) return;
    const sl = $('mp2614Slot'), bawah = sl && sl.offsetHeight && window.innerWidth < 1000 ? sl.offsetHeight : 0;   // [2.6.16] panel perintah di bawah canvas pada layar sempit
    const lebar = wr.clientWidth || LW, tinggiMaks = Math.max(260, window.innerHeight - 250 - bawah);
    KT.s = Math.max(Math.min(lebar / LW, tinggiMaks / LH), lebar < 600 ? 0.62 : 0.3); KT.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = Math.round(LW * KT.s) + 'px'; cv.style.height = Math.round(LH * KT.s) + 'px';
    cv.width = Math.round(LW * KT.s * KT.dpr); cv.height = Math.round(LH * KT.s * KT.dpr); KT.bgKunci = '';
    if (wr.scrollWidth > wr.clientWidth) wr.scrollLeft = (wr.scrollWidth - wr.clientWidth) / 2;
  }
  function langkah(ts) {
    if (!KT.buka) return;
    const now = performance.now(), dt = Math.min(0.06, Math.max(0, (now - (KT.last || now)) / 1000)); KT.last = now; KT.t = now / 1000;
    KT.ch.forEach(ch => { perilaku(ch, now); gerak(ch, hemat() ? 1 : dt); });
    gambar(KT.t);
    if (now - KT.strip > 500) { KT.strip = now; strip(); if (KT.pilih) kartu(); }
    KT.raf = hemat() ? setTimeout(() => langkah(), 500) : requestAnimationFrame(langkah);
  }
  window.mp2614Tutup = () => {
    KT.buka = false; KT.pilih = ''; cancelAnimationFrame(KT.raf); clearTimeout(KT.raf); const a = A(); if (a) a.lambat = false;
    const w = $('mp2614Lapis'); if (w) w.remove(); window.removeEventListener('resize', ukur);
    const d = $('mp2613Dock'); if (d) d.focus();
  };
  window.mp2614Kantor = () => {
    if (!sesi() || !A()) return;
    siapkan(); const a = A(); a.lambat = true;
    if (typeof window.mp2613Tutup === 'function' && $('mp2613Pn')) window.mp2613Tutup();
    let w = $('mp2614Lapis');
    if (!w) {
      w = document.createElement('div'); w.id = 'mp2614Lapis'; w.className = 'mp2614-lapis';
      w.innerHTML = `<section class="mp2614-dlg" role="dialog" aria-modal="true" aria-labelledby="mp2614Jdl">
        <header><div><b id="mp2614Jdl"><span class="live"><i></i>LIVE</span>Kantor Tim Pengadaan</b><small id="mp2614Sub">Menunggu data proyek…</small></div>
          <span class="nol" title="Seluruh animasi & teks dari pemeriksaan lokal — tidak memanggil AI">0 token</span>
          <button type="button" class="btn btn-sm btn-success" onclick="mp2613Kerja()"><i class="fas fa-play me-1"></i>Kerjakan sekarang</button>
          <button type="button" class="btn btn-sm btn-light" onclick="mp2614Tutup(); mp2613Buka()"><i class="fas fa-table-list me-1"></i>Meja Kerja</button>
          <button type="button" class="btn-close btn-close-white" aria-label="Tutup" onclick="mp2614Tutup()"></button></header>
        <div class="mp2614-wrap" id="mp2614Wrap"><canvas id="mp2614Cv" role="img" aria-label="Animasi kantor: tim pengadaan bekerja di meja masing-masing. Status tiap agen tercantum di daftar di bawah."></canvas><div class="mp2614-info" id="mp2614Info" hidden></div></div>
        <ul class="mp2614-strip" id="mp2614Strip" aria-label="Status agen"></ul><div id="mp2614Slot"></div></section>`;
      w.addEventListener('click', ev => { if (ev.target === w) window.mp2614Tutup(); });
      document.body.appendChild(w);
      $('mp2614Cv').addEventListener('click', ev => {
        const b = ev.currentTarget.getBoundingClientRect(), x = (ev.clientX - b.left) / KT.s, y = (ev.clientY - b.top) / KT.s;
        const ch = KT.ch.slice().reverse().find(h => h.kotak && x >= h.kotak[0] && x <= h.kotak[0] + h.kotak[2] && y >= h.kotak[1] && y <= h.kotak[1] + h.kotak[3]);
        window.mp2614Pilih(ch ? ch.r.id : '');
      });
      window.addEventListener('resize', ukur);
    }
    KT.buka = true; KT.last = 0; ukur(); strip(); langkah();
    const b = w.querySelector('.btn-close'); if (b) b.focus();
    if (!a.pada && !a.jalan) window.mp2613Kerja();
  };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && $('mp2614Lapis')) { if (KT.pilih) window.mp2614Pilih(''); else window.mp2614Tutup(); } });

  /* ======================= 7. PINTU MASUK: menu akun ======================= */
  function pasang() {
    const dd = document.querySelector('.app-header .menu-akun .dropdown-menu') || document.querySelector('.menu-akun .dropdown-menu');
    if (dd && sesi() && !$('mp2614Menu')) { const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp2614Menu" onclick="mp2614Kantor();return false;"><i class="fas fa-building me-2"></i>Kantor Agen (Live)</a>'; dd.insertBefore(li, dd.firstChild); }
  }
  let _tm = 0; const jadwal = () => { clearTimeout(_tm); _tm = setTimeout(() => { try { pasang(); } catch (e) { } }, 300); };
  const awasi = () => { if (!document.body) return; pasang(); new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('#mp2614Lapis,#mp2613Pn,#mp2613Dock')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();

