/* MP2614 — PEMBARUAN 2.6.14 … 2.9.4: KANTOR AGEN AI LIVE — denah kantor proyek sebenarnya (Kantor Kontraktor JICT), 0 token
 *  [2.9.4] Digambar ulang mengikuti DENAH ASLI kantor (skala meter): Kantor Kontraktor (meja klaster), R. Project Manager, R. Deputy Manager,
 *          QC / QS / ADKON / Legal Manager, Kantor & R. Pimpro Pelindo, Deputy Konstruksi 1, Deputy Pimpro, KSDM, Teknik Engineer, Logistic
 *          Manager, pantry, toilet, R. Arsip, R. Meeting Kontraktor, tangga & pilar; teras selatan dengan kolam renang, taman & area merokok.
 *          Suasana nyata: lantai kayu/keramik/karpet per ruang, dinding potong (cutaway) dengan jendela, cahaya lampu & jendela (siang/malam),
 *          tanaman, rak, printer, dispenser, staf lain yang bekerja & lalu-lalang. Karakter bergaya avatar (kepala besar, rambut, kacamata,
 *          hijab/dasi), papan nama seperti kantor sungguhan, jalan memakai pencari rute (A*) yang menghormati dinding & pintu.
 *          Tim: Joko Supriyono (Logistic Manager — meja Logistic Manager), Pak Dedy (Kepala Proyek — R. Project Manager), Pak Imam (Wakil Kepala
 *          Proyek — R. Deputy Manager), Om Henoc (Bos QC — meja QC Manager); ketiganya santai memantau, berenang & merokok. Ilham (Manager
 *          Pengadaan divisi), Vicha, Yusuf (juga tugas kontrak & dokumen vendor, dulu Salma), Charles, Rowin & Gede (ADKON).
 *  Setiap karakter memegang langkah kerja Agen AI 2.6.13; balon berisi hasil pemeriksaan nyata (0 token). Klik karakter → kartu temuan.
 *  Akses: dock Agen AI · menu akun › Kantor Agen (Live). */
(function () {
  'use strict';
  if (window.__MP2614__) return; window.__MP2614__ = true;
  const A = () => window.MP2613_AGEN || null;
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const hemat = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pendek = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const rpS = n => { n = N(n); return n >= 1e9 ? 'Rp ' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : 'Rp ' + Math.round(n).toLocaleString('id-ID'); };
  const acak = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ======================= 1. PROYEKSI ISOMETRIK (satuan meter) ======================= */
  const TW = 34, TH = 17, ZM = 24, LW = 950, LH = 545, OX = 268, OY = 84;   // batas kanvas = gedung + teras
  const P = (x, y, z) => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - (z || 0) * ZM];
  function poly(c, pts, fill, garis, lw) { c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (garis) { c.strokeStyle = garis; c.lineWidth = lw || 1; c.stroke(); } }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const redup = (h, f) => { const [r, g, b] = hex(h); return 'rgb(' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(',') + ')'; };
  function kotak(c, x, y, w, d, h, z0, warna, tepi) {   // balok; sisi selatan (y+d) & timur (x+w) terlihat
    const z1 = z0 + h, a = warna;
    poly(c, [P(x, y + d, z0), P(x + w, y + d, z0), P(x + w, y + d, z1), P(x, y + d, z1)], redup(a, 0.82));
    poly(c, [P(x + w, y, z0), P(x + w, y + d, z0), P(x + w, y + d, z1), P(x + w, y, z1)], redup(a, 0.68));
    poly(c, [P(x, y, z1), P(x + w, y, z1), P(x + w, y + d, z1), P(x, y + d, z1)], a, tepi || null, 0.6);
  }
  function lantai(c, x, y, w, d, isi) { poly(c, [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], isi); }
  function teksLantai(c, x, y, teks, ukuran, warna, tebal) { const [px, py] = P(x, y, 0.005); c.save(); c.translate(px, py); c.transform(TW / 2, TH / 2, -TW / 2, TH / 2, 0, 0); c.font = (tebal ? '800 ' : '700 ') + ukuran + 'px system-ui, sans-serif'; c.fillStyle = warna; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(teks, 0, 0); c.restore(); }
  function bayang(c, x, y, rx, ry, a) { const [px, py] = P(x, y, 0); c.fillStyle = 'rgba(40,30,20,' + (a || 0.18) + ')'; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fill(); }

  /* ======================= 2. DENAH (meter; utara = y kecil) ======================= */
  const R_ = (x, y, w, d, jenis, nama) => ({ x, y, w, d, jenis, nama });
  const RUANG = [   // lantai & label
    R_(0, 0, 3.4, 5.1, 'kayu', 'SEKRETARIAT'), R_(3.4, 0, 3.66, 6.0, 'kayu', 'R. PIMPRO PELINDO'), R_(7.06, 0, 5.54, 6.0, 'karpet', 'KANTOR PELINDO'), R_(12.6, 0, 4.1, 6.0, 'kayu', 'DEPUTY KONSTRUKSI 1'),
    R_(16.7, 0, 8.1, 6.0, 'kayu2', ''), R_(24.8, 0, 4.4, 6.0, 'kayu', 'R. DEPUTY MANAGER'), R_(29.2, 0, 4.2, 5.1, 'kayu', 'R. MANAGER PENGADAAN'), R_(33.4, 0, 4.0, 5.1, 'kayu', 'R. PROJECT MANAGER'),
    R_(0, 5.1, 37.4, 2.0, 'keramik', ''), R_(0, 7.1, 7.5, 7.0, 'keramik', ''), R_(7.5, 7.1, 3.2, 7.0, 'kayu', 'DEPUTY PIMPRO'), R_(10.7, 7.1, 4.5, 7.0, 'kayu', 'KSDM'),
    R_(15.2, 6.0, 14.4, 8.1, 'kayu2', 'KANTOR KONTRAKTOR'), R_(29.6, 7.1, 7.8, 7.0, 'keramik', ''),
    R_(-6, 3.9, 2.4, 4.5, 'keramik2', 'R. ARSIP'), R_(-3.6, 3.9, 2.1, 4.5, 'keramik2', 'PANTRY'), R_(-1.5, 5.1, 3.7, 1.4, 'toilet', 'TOILET PRIA'), R_(-1.5, 6.5, 3.7, 1.4, 'toilet', 'TOILET WANITA'),
    R_(29.7, 9.6, 2.2, 3.0, 'keramik2', 'PANTRY'), R_(31.6, 5.1, 3.8, 1.4, 'toilet', 'TOILET PRIA'), R_(31.6, 6.5, 3.8, 1.4, 'toilet', 'TOILET WANITA'),
    R_(37.4, 3.8, 1.0, 4.6, 'keramik', ''), R_(38.4, 3.8, 4.6, 4.6, 'karpet2', 'R. MEETING KONTRAKTOR')
  ];
  const AREA = [R_(-6, 3.9, 43.4 + 5.6, 4.6), R_(0, 0, 37.4, 14.1), R_(8, 14.1, 23, 7.2)];   // daerah boleh dilalui (gedung + teras)
  // dinding: [x1,y1,x2,y2,tinggi,jendela?] — celah = pintu
  const DIND = [];
  const dH = (x1, x2, y, h, j) => DIND.push([x1, y, x2, y, h || 1.0, !!j]), dV = (x, y1, y2, h, j) => DIND.push([x, y1, x, y2, h || 1.0, !!j]);
  // luar utara (jendela) & barat/timur
  dH(0, 37.4, 0, 1.45, true); dV(0, 0, 3.9, 1.45, true); dV(37.4, 0, 3.8, 1.45, true);
  dH(-6, 0, 3.9, 1.45, true); dV(-6, 3.9, 8.4, 1.45, true); dH(-6, -1.5, 8.4, 1.2); dV(0, 8.4, 14.1, 1.2, true);
  dH(37.4, 43, 3.8, 1.45, true); dV(43, 3.8, 8.4, 1.45, true); dH(37.4, 43, 8.4, 1.2); dV(37.4, 8.4, 14.1, 1.2, true);
  // luar selatan (pintu teras di 21.6–23.4)
  dH(0, 21.6, 14.1, 1.2, true); dH(23.4, 37.4, 14.1, 1.2, true);
  // ruang utara (sekat y = 6.0 / 5.1) + pintu
  [3.4, 7.06, 12.6, 16.7].forEach(x => dV(x, 0, x === 3.4 ? 5.1 : 6.0)); dV(24.8, 0, 6.0); dV(29.2, 0, 6.0); dV(33.4, 0, 5.1);
  dH(0, 1.2, 5.1); dH(2.2, 3.4, 5.1); dH(3.4, 4.6, 6.0); dH(5.6, 7.06, 6.0); dH(7.06, 9.2, 6.0); dH(10.4, 12.6, 6.0); dH(12.6, 14.2, 6.0); dH(15.2, 16.7, 6.0);
  dH(24.8, 26.4, 6.0); dH(27.4, 29.2, 6.0); dH(29.2, 29.6, 5.1); dH(30.6, 33.4, 5.1); dH(33.4, 35.6, 5.1); dH(36.6, 37.4, 5.1);
  // toilet & pantry kanan
  dV(31.6, 5.1, 7.9); dV(35.4, 5.1, 7.9); dH(31.6, 32.2, 7.9); dH(33.0, 34.6, 7.9); dH(31.6, 32.4, 6.5); dH(33.2, 35.4, 6.5);
  dV(29.7, 9.6, 10.6); dV(29.7, 11.6, 12.6); dH(29.7, 31.9, 9.6); dH(29.7, 31.9, 12.6);
  // sayap barat
  dV(-3.6, 3.9, 6.0); dV(-3.6, 7.0, 8.4); dV(-1.5, 3.9, 5.1); dV(-1.5, 7.9, 8.4); dH(-1.5, 2.2, 5.1); dH(-1.5, -0.4, 7.9); dH(0.4, 2.2, 7.9); dV(2.2, 5.1, 5.6); dV(2.2, 6.4, 7.9); dH(-1.5, 2.2, 6.5);
  // sayap timur: R. Meeting
  dV(38.4, 3.8, 5.6); dV(38.4, 6.6, 8.4);
  // ruang selatan
  dV(7.5, 7.1, 14.1); dV(10.7, 7.1, 14.1); dV(15.2, 7.1, 14.1); dH(7.5, 8.4, 7.1); dH(9.4, 10.7, 7.1); dH(10.7, 12.4, 7.1); dH(13.4, 15.2, 7.1);
  const PILAR = [[7.0, 6.6], [12.6, 6.6], [18.4, 6.6], [24.2, 6.6], [30.0, 6.6], [12.6, 13.6], [23.4, 13.6], [33.6, 13.6]];

  /* ======================= 3. TIM & STAF LAIN ======================= */
  // kursi: [x, y, hadap] hadap: n|s|e|w (n/w = membelakangi penonton)
  const ROSTER = [
    { id: 'vicha', nama: 'Vicha Ramadhani', peran: 'SAP', ik: '💻', langkah: ['sinkron'], kerja: { sinkron: 'Sinkron PR · PO · GR · GI · SES · MIRO' }, sumber: [], duduk: [18.15, 11.7, 'e'], kulit: '#F1C27D', rambut: '#2B2622', baju: '#8E5BC2', celana: '#2F3B52', gaya: 'hijab', hijab: '#C9A0DC' },
    { id: 'yusuf', nama: 'M Yusuf Van Basten', peran: 'Tagihan Service & Kontrak', ik: '🧾', langkah: ['nilai', 'masa', 'draf'], kerja: { nilai: 'Cocokkan SPK · SPPP · SPKP · SPSA & tagihan', masa: 'Cek masa kontrak & dokumen vendor', draf: 'Cek bon → PBJ → register kontrak' }, sumber: ['Nilai & tagihan', 'Kontrak', 'Dokumen vendor', 'Draf kontrak'], duduk: [20.25, 9.7, 'w'], kulit: '#C68B5E', rambut: '#141414', baju: '#1F2D44', celana: '#2B2F38', gaya: 'pendek', kacamata: 1 },
    { id: 'charles', nama: 'Charles Van Anto', peran: 'Tagihan & Gudang', ik: '📦', langkah: ['bayar', 'gudang'], kerja: { bayar: 'Rekap tagihan SPM & SPPM', gudang: 'Cek kartu gudang & pengeluaran' }, sumber: ['Keuangan', 'Gudang'], duduk: [18.15, 9.7, 'e'], kulit: '#D9A066', rambut: '#6B4A2B', baju: '#3D7DCA', celana: '#2B2F38', gaya: 'rapi' },
    { id: 'rowin', nama: 'Rowin', peran: 'Adkon', ik: '🏷️', langkah: ['wbs'], kerja: { wbs: 'Beri WBS bon permintaan' }, sumber: ['WBS bon'], duduk: [18.9, 2.55, 'n'], kulit: '#F5D0A9', rambut: '#1A1A1A', baju: '#F2B705', celana: '#2F3B52', gaya: 'pendek' },
    { id: 'gede', nama: 'Gede', peran: 'Adkon', ik: '🏷️', langkah: ['wbs'], kerja: { wbs: 'Beri WBS bon permintaan' }, sumber: ['WBS bon'], duduk: [20.4, 2.55, 'n'], kulit: '#8D5524', rambut: '#1A1A1A', baju: '#2E9E5B', celana: '#3A3A3A', gaya: 'rapi', kumis: 1 },
    { id: 'ilham', nama: 'Ilham', peran: 'Manager', ik: '🛡️', langkah: ['prosedur'], kerja: { prosedur: 'Reviu kepatuhan prosedur pengadaan' }, sumber: [], kritis: 1, duduk: [31.3, 3.05, 'n'], kulit: '#E8B88A', rambut: '#4A3020', baju: '#5A2D82', celana: '#2B2F38', gaya: 'rapi', dasi: 1 },
    { id: 'joko', nama: 'Joko Supriyono', peran: 'Logistic Manager', ik: '📋', langkah: ['susun'], kerja: { susun: 'Susun prioritas pengadaan & logistik' }, sumber: [], manajer: 1, duduk: [17.0, 12.95, 'n'], kulit: '#C68B5E', rambut: '#3B2A20', baju: '#0B1F3A', celana: '#1E2633', gaya: 'rapi', dasi: 1, kacamata: 1 },
    { id: 'dedy', nama: 'Pak Dedy', peran: 'Kepala Proyek', ik: '👷', langkah: [], kerja: {}, sumber: [], kritis: 1, santai: 1, duduk: [35.3, 3.2, 'n'], kulit: '#D2A06E', rambut: '#2A2A2A', baju: '#FFFFFF', celana: '#2B2F38', gaya: 'tipis', kumis: 1, rokok: 1 },
    { id: 'imam', nama: 'Pak Imam', peran: 'Wakil Kepala Proyek', ik: '🧭', langkah: [], kerja: {}, sumber: [], santai: 1, duduk: [26.9, 3.6, 'n'], kulit: '#C68B5E', rambut: '#1C1C1C', baju: '#2D6A4F', celana: '#2B2F38', gaya: 'rapi', kacamata: 1, rokok: 1 },
    { id: 'henoc', nama: 'Om Henoc', peran: 'Bos QC', ik: '🧪', langkah: [], kerja: {}, sumber: ['Gudang'], santai: 1, duduk: [22.9, 5.25, 'n'], kulit: '#8D5524', rambut: '#1A1A1A', baju: '#E85D04', celana: '#1E2633', gaya: 'pendek', helm: 1, rokok: 1 }
  ];
  const WARGA = [   // staf lain di kantor (tanpa langkah Agen AI) — duduk di kursi sesuai denah
    [8.6, 2.35, 'n', '#2E86C1'], [10.4, 2.35, 'n', '#B83A2E'], [9.5, 4.85, 'n', '#6C757D'], [5.2, 2.85, 'n', '#1F2D44'], [14.4, 2.75, 'n', '#7B4E30'], [1.6, 2.55, 'n', '#C0392B'],
    [12.4, 9.8, 'n', '#2E9E5B'], [13.6, 11.6, 'n', '#8E5BC2'], [9.1, 10.2, 'n', '#34495E'], [17.35, 9.3, 'w', '#16A085'], [17.8, 4.35, 'n', '#AF601A'], [24.0, 2.2, 'n', '#C0392B'],
    [22.6, 9.7, 'e', '#5D6D7E'], [24.6, 9.7, 'w', '#A04000'], [22.6, 11.7, 'e', '#1F618D'], [25.6, 11.7, 'e', '#7D3C98'], [27.6, 9.7, 'w', '#117A65'], [40.0, 6.85, 'n', '#2C3E50']
  ].map((w, k) => ({ id: 'w' + k, nama: '', peran: 'Staf', warga: 1, duduk: [w[0], w[1], w[2]], kulit: ['#F1C27D', '#E0AC69', '#C68B5E', '#8D5524', '#F5D0A9'][k % 5], rambut: ['#1A1A1A', '#3A2418', '#2B2622'][k % 3], baju: w[3], celana: ['#2F3B52', '#2B2F38', '#3A3A3A'][k % 3], gaya: k % 4 === 1 ? 'hijab' : k % 4 === 2 ? 'panjang' : 'pendek', hijab: ['#D5DBDB', '#A9CCE3', '#F5B7B1'][k % 3], langkah: [], sumber: [] }));
  const TITIK = { kopiB: [-2.6, 6.3, '☕ Ambil kopi di pantry'], kopiT: [30.8, 11.1, '☕ Ngopi di pantry'], toiletP: [0.2, 5.8, '🚻 Ke toilet'], papan: [16.3, 8.6, '📌 Tempel temuan di papan'], jendela: [22.0, 0.7, '🌆 Lihat lapangan dari jendela'],
    sofa: [25.2, 13.1, '🛋️ Rehat sebentar'], printer: [16.0, 5.6, '🖨️ Ambil cetakan'], kolam: [19.8, 17.6, '🏊 Berenang dulu'], rokok: [27.6, 16.3, '🚬 Rehat merokok'], taman: [12.4, 18.0, '🌳 Jalan-jalan di taman'], rapat: [39.6, 6.0, '🤝 Rapat di R. Meeting'] };
  const KT = { buka: false, raf: 0, last: 0, t: 0, ch: [], bg: null, bgKunci: '', s: 1, dpr: 1, pilih: '', strip: 0, zoom: 1, asap: [], frame: 0 };
  window.MP2614_KANTOR = KT; window.MP2614_ROSTER = ROSTER;

  /* ======================= 4. PERABOT (statis) ======================= */
  const BLOK = [];   // persegi tidak dapat dilalui
  const OBJ = [];    // { k: kedalaman, f: fungsi gambar }
  const blok = (x, y, w, d) => BLOK.push([x, y, w, d]);
  const tambah = (k, f) => OBJ.push({ k, f });
  function meja(x, y, w, d, layar, warnaKayu) {   // layar: n|s|e|w — arah monitor menghadap pengguna
    blok(x, y, w, d);
    tambah(x + w + y + d - 0.2, (c, t) => {
      kotak(c, x + 0.05, y + 0.05, 0.08, d - 0.1, 0.72, 0, '#E9EEF2'); kotak(c, x + w - 0.13, y + 0.05, 0.08, d - 0.1, 0.72, 0, '#E9EEF2');
      kotak(c, x, y, w, d, 0.05, 0.72, warnaKayu || '#C89B6D');
      const monitor = (mx, my, sisi) => { kotak(c, mx - 0.03, my - 0.03, 0.06, 0.06, 0.12, 0.77, '#2B2F38');
        const [a1, a2] = sisi === 'n' || sisi === 's' ? [[mx - 0.28, my], [mx + 0.28, my]] : [[mx, my - 0.28], [mx, my + 0.28]];
        const p1 = P(a1[0], a1[1], 0.88), p2 = P(a2[0], a2[1], 0.88), p3 = P(a2[0], a2[1], 1.2), p4 = P(a1[0], a1[1], 1.2);
        poly(c, [p1, p2, p3, p4], '#1E2228');
        const g = c.createLinearGradient(p4[0], p4[1], p2[0], p2[1]); g.addColorStop(0, '#5AB8F0'); g.addColorStop(1, '#1D5E9A');
        const m = (p, q, f) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
        if (sisi === 's' || sisi === 'e') { poly(c, [m(p1, p3, 0.08), m(p2, p4, 0.08), m(p3, p1, 0.08), m(p4, p2, 0.08)], g); c.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 3; k++) { const q = m(m(p4, p1, 0.3 + k * 0.18), m(p3, p2, 0.3 + k * 0.18), 0.6); const q0 = m(p4, p1, 0.3 + k * 0.18); c.fillRect(Math.min(q0[0] + 3, q[0]), q0[1] + 2 - k, Math.abs(q[0] - q0[0]) - 4, 1.4); } } };
      // layar = sisi tempat pemakai duduk (s: selatan → monitor di tepi utara, layar menghadap penonton); 'ew'/'ns' = meja dua sisi
      (layar.length === 2 ? layar.split('') : [layar]).forEach(sisi => {
        const n = Math.max(1, Math.floor((sisi === 'n' || sisi === 's' ? w : d) / 1.2));
        for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; if (sisi === 's') monitor(x + w * f, y + (layar.length === 2 ? d / 2 - 0.05 : 0.2), 's'); else if (sisi === 'n') monitor(x + w * f, y + (layar.length === 2 ? d / 2 + 0.05 : d - 0.2), 'n'); else if (sisi === 'e') monitor(x + (layar.length === 2 ? w / 2 - 0.05 : 0.2), y + d * f, 'e'); else monitor(x + (layar.length === 2 ? w / 2 + 0.05 : w - 0.2), y + d * f, 'w'); }
        const kb = sisi === 's' ? [x + w / 2 - 0.25, y + d - 0.3, 0.5, 0.16] : sisi === 'n' ? [x + w / 2 - 0.25, y + 0.14, 0.5, 0.16] : sisi === 'e' ? [x + w - 0.3, y + d / 2 - 0.25, 0.16, 0.5] : [x + 0.14, y + d / 2 - 0.25, 0.16, 0.5];
        kotak(c, kb[0], kb[1], kb[2], kb[3], 0.02, 0.77, '#D5D8DC');
      });
      kotak(c, x + w - 0.3, y + 0.12, 0.12, 0.12, 0.1, 0.77, '#FDFEFE');   // gelas
      kotak(c, x + 0.15, y + d - 0.4, 0.3, 0.22, 0.03, 0.77, '#F8F9F9');   // kertas
    });
  }
  function kursi(x, y, hadap, warna) {
    tambah(x + y - 0.05, c => {
      warna = warna || '#2E7D5B';
      const [px, py] = P(x, y, 0); c.fillStyle = '#3B3F45'; c.beginPath(); c.ellipse(px, py, 8, 3.5, 0, 0, Math.PI * 2); c.fill();
      kotak(c, x - 0.03, y - 0.03, 0.06, 0.06, 0.42, 0, '#5D6D7E');
      kotak(c, x - 0.24, y - 0.24, 0.48, 0.48, 0.08, 0.42, warna);
      const b = hadap === 'n' ? [x - 0.24, y + 0.16, 0.48, 0.08] : hadap === 's' ? [x - 0.24, y - 0.24, 0.48, 0.08] : hadap === 'e' ? [x - 0.24, y - 0.24, 0.08, 0.48] : [x + 0.16, y - 0.24, 0.08, 0.48];
      kotak(c, b[0], b[1], b[2], b[3], 0.5, 0.5, warna);
    });
  }
  function tanaman(x, y, besar, jenis) {
    blok(x - 0.25, y - 0.25, 0.5, 0.5);
    tambah(x + y + 0.1, (c, t) => {
      const s = besar ? 1.6 : 1, goyang = hemat() ? 0 : Math.sin(t * 1.3 + x * 3) * 0.8;
      kotak(c, x - 0.2 * s, y - 0.2 * s, 0.4 * s, 0.4 * s, 0.35 * s, 0, jenis === 'putih' ? '#ECEFF1' : '#B5764A');
      const [px, py] = P(x, y, 0.35 * s + 0.35 * s);
      const daun = [['#1E6B3A', 0, 4, 13], ['#2E8B4A', -9, 0, 10], ['#3FA45B', 9, -1, 10], ['#2E8B4A', -4, -10, 10], ['#4CBB6C', 5, -12, 8], ['#245F36', 0, -4, 9]];
      daun.forEach(d => { c.fillStyle = d[0]; c.beginPath(); c.ellipse(px + d[1] * s + goyang, py + d[2] * s, d[3] * s, d[3] * 0.72 * s, (d[1] / 30), 0, Math.PI * 2); c.fill(); });
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(px - 4 * s + goyang, py - 12 * s, 4 * s, 2.5 * s, -0.5, 0, Math.PI * 2); c.fill();
    });
  }
  function rak(x, y, w, d, h) {
    blok(x, y, w, d);
    tambah(x + w + y + d - 0.1, c => {
      kotak(c, x, y, w, d, h, 0, '#8B5E3C');
      const W = ['#C0392B', '#2E86C1', '#F1C40F', '#27AE60', '#8E44AD', '#E67E22', '#ECF0F1'];
      const sb = w > d; const L = sb ? w : d;
      for (let r = 0; r < Math.floor(h / 0.4); r++) for (let k = 0; k < Math.floor(L / 0.18); k++) {
        const z = 0.08 + r * 0.4, f = k * 0.18 + 0.04, col = W[(k * 3 + r) % W.length];
        if (sb) kotak(c, x + f, y + d, 0.12, 0.02, 0.28, z, col); else kotak(c, x + w, y + f, 0.02, 0.12, 0.28, z, col);
      }
    });
  }
  function mejaRapat(x, y, w, d, kursiW) {
    blok(x, y, w, d);
    tambah(x + w + y + d - 0.3, c => { kotak(c, x + w / 2 - 0.1, y + d / 2 - 0.1, 0.2, 0.2, 0.72, 0, '#95A5A6'); kotak(c, x, y, w, d, 0.05, 0.72, '#F4F1EC'); });
    const n = Math.max(2, Math.round(w / 0.8)); for (let k = 0; k < n; k++) { const xx = x + (k + 0.5) * w / n; kursi(xx, y - 0.35, 's', kursiW); kursi(xx, y + d + 0.35, 'n', kursiW); }
  }
  function sofa(x, y, w, hadap) {
    const d = 0.85; blok(x, y, w, d);
    tambah(x + w + y + d - 0.2, c => {
      kotak(c, x, y, w, d, 0.42, 0, '#E8DCC8');
      if (hadap === 's') kotak(c, x, y, w, 0.22, 0.42, 0.42, '#DCCFB8'); else kotak(c, x, y + d - 0.22, w, 0.22, 0.42, 0.42, '#DCCFB8');
      kotak(c, x, y, 0.18, d, 0.22, 0.42, '#D4C6AD'); kotak(c, x + w - 0.18, y, 0.18, d, 0.22, 0.42, '#D4C6AD');
      for (let k = 0; k < Math.floor(w / 0.9); k++) kotak(c, x + 0.3 + k * 0.9, hadap === 's' ? y + 0.24 : y + d - 0.46, 0.4, 0.2, 0.3, 0.45, '#2E7D5B');
    });
  }
  function bangkuDinding(x, y, w) { blok(x, y, w, 0.5); tambah(x + w + y + 0.3, c => { kotak(c, x, y, w, 0.5, 0.45, 0, '#C0392B'); kotak(c, x, y + 0.05, w, 0.4, 0.06, 0.45, '#E74C3C'); }); }
  function tangga(x, y, w, d, arah) {
    blok(x, y, w, d);
    tambah(x + y + 0.2, c => { const n = 14; for (let k = 0; k < n; k++) { const f = k / n; if (arah === 'x') kotak(c, x + f * w, y, w / n, d, 0.05 + f * 1.2, 0, k % 2 ? '#BFC5CC' : '#CDD3D9'); else kotak(c, x, y + f * d, w, d / n, 0.05 + f * 1.2, 0, k % 2 ? '#BFC5CC' : '#CDD3D9'); } teksLantai(c, x + w / 2, y + d / 2, 'TANGGA', 0.5, 'rgba(60,70,80,.0)'); });
  }
  function pantryMeja(x, y, w, d) { blok(x, y, w, d); tambah(x + w + y + d, c => { kotak(c, x, y, w, d, 0.9, 0, '#ECEFF1'); kotak(c, x, y, w, d, 0.04, 0.9, '#7F8C8D'); kotak(c, x + 0.15, y + 0.1, 0.3, 0.25, 0.32, 0.94, '#2B2F38'); kotak(c, x + w - 0.45, y + 0.1, 0.25, 0.3, 0.5, 0.94, '#5DADE2'); }); }
  function kulkas(x, y) { blok(x, y, 0.6, 0.6); tambah(x + y + 1, c => kotak(c, x, y, 0.6, 0.6, 1.7, 0, '#D6DBDF')); }
  function printer(x, y) { blok(x, y, 0.7, 0.55); tambah(x + y + 1, c => { kotak(c, x, y, 0.7, 0.55, 0.85, 0, '#ECF0F1'); kotak(c, x + 0.08, y + 0.08, 0.54, 0.38, 0.06, 0.85, '#5D6D7E'); }); }
  function dispenser(x, y) { blok(x, y, 0.35, 0.35); tambah(x + y + 0.6, c => { kotak(c, x, y, 0.35, 0.35, 0.9, 0, '#F4F6F7'); kotak(c, x + 0.04, y + 0.04, 0.27, 0.27, 0.45, 0.9, '#AED6F1'); }); }
  function lemariArsip(x, y, w, d) { blok(x, y, w, d); tambah(x + w + y + d - 0.2, c => { kotak(c, x, y, w, d, 1.3, 0, '#95A5A6'); }); }
  function wc(x, y) { tambah(x + y, c => { kotak(c, x, y, 0.4, 0.55, 0.42, 0, '#FDFEFE'); kotak(c, x, y, 0.4, 0.15, 0.75, 0, '#F2F4F4'); }); }
  function wastafel(x, y, w) { blok(x, y, w, 0.5); tambah(x + w + y + 0.5, c => { kotak(c, x, y, w, 0.5, 0.85, 0, '#D5D8DC'); for (let k = 0; k < Math.floor(w / 0.7); k++) kotak(c, x + 0.15 + k * 0.7, y + 0.1, 0.4, 0.3, 0.03, 0.85, '#FDFEFE'); }); }
  function papanTemuan(x, y) {
    blok(x - 0.1, y - 0.9, 0.25, 1.8);
    tambah(x + y + 0.5, c => {
      kotak(c, x - 0.05, y - 0.85, 0.08, 0.08, 1.1, 0, '#7F8C8D'); kotak(c, x - 0.05, y + 0.77, 0.08, 0.08, 1.1, 0, '#7F8C8D');
      poly(c, [P(x, y - 0.9, 0.9), P(x, y + 0.9, 0.9), P(x, y + 0.9, 2.0), P(x, y - 0.9, 2.0)], '#FBFCFC', '#839192', 1.2);
      const a = A(), T = a ? a.temuan.slice(0, 12) : [], W = { KRITIS: '#F28B82', WARNING: '#FDD663', INFO: '#8AB4F8' };
      T.forEach((tm, k) => { const yy = y - 0.75 + (k % 4) * 0.42, zz = 1.85 - Math.floor(k / 4) * 0.32; poly(c, [P(x + 0.01, yy, zz), P(x + 0.01, yy + 0.32, zz), P(x + 0.01, yy + 0.32, zz - 0.24), P(x + 0.01, yy, zz - 0.24)], W[tm.level] || '#ccc'); });
    });
  }
  // ---- susun perabot sesuai denah ----
  function susun() {
    if (OBJ.length) return;
    // Sekretariat
    meja(0.9, 1.4, 1.4, 0.7, 's'); kursi(1.6, 2.55, 'n'); rak(0.05, 3.3, 0.45, 1.6, 1.6); tanaman(2.9, 0.5, true);
    // R. Pimpro Pelindo
    meja(4.3, 1.6, 1.8, 0.8, 's', '#8B5A2B'); kursi(5.2, 2.85, 'n', '#1F2D44'); kursi(4.6, 4.3, 's', '#7F8C8D'); kursi(5.8, 4.3, 's', '#7F8C8D'); mejaRapat(4.3, 4.8, 1.8, 0.6, '#7F8C8D'); tanaman(6.6, 0.5, true);
    // Kantor Pelindo (meja biru berkelompok)
    meja(7.9, 1.2, 1.4, 0.75, 's', '#AEB6BF'); meja(9.7, 1.2, 1.4, 0.75, 's', '#AEB6BF'); meja(8.8, 3.6, 1.4, 0.75, 's', '#AEB6BF'); meja(10.6, 3.6, 1.4, 0.75, 's', '#AEB6BF');
    kursi(8.6, 2.35, 'n', '#2E86C1'); kursi(10.4, 2.35, 'n', '#2E86C1'); kursi(9.5, 4.85, 'n', '#2E86C1'); kursi(11.3, 4.85, 'n', '#2E86C1'); tanaman(12.2, 0.5);
    // Deputy Konstruksi 1
    meja(13.6, 1.5, 1.6, 0.8, 's', '#8B5A2B'); kursi(14.4, 2.75, 'n', '#1F2D44'); rak(16.1, 0.5, 0.5, 1.8, 1.6); tanaman(13.1, 5.4);
    // area ADKON / QS / Legal / QC (terbuka)
    meja(18.2, 1.0, 3.0, 0.8, 's'); kursi(18.9, 2.55, 'n'); kursi(20.4, 2.55, 'n');
    meja(23.3, 1.0, 1.4, 0.75, 's'); kursi(24.0, 2.2, 'n');
    meja(17.3, 3.2, 1.4, 0.7, 's'); kursi(17.8, 4.35, 'n'); printer(16.2, 4.7);
    meja(22.2, 4.0, 1.4, 0.7, 's'); kursi(22.9, 5.25, 'n');
    tanaman(21.8, 0.5, true); tanaman(16.95, 0.4);
    // R. Deputy Manager (Pak Imam)
    meja(26.2, 2.2, 1.6, 0.8, 's', '#8B5A2B'); kursi(26.9, 3.6, 'n', '#1F2D44'); sofa(25.1, 4.6, 1.8, 's'); rak(28.6, 0.4, 0.5, 1.6, 1.6); tanaman(25.2, 0.5, true);
    // R. Manager Pengadaan (Ilham) — ruang tanpa nama di denah
    meja(30.5, 1.7, 1.6, 0.8, 's', '#8B5A2B'); kursi(31.3, 3.05, 'n', '#1F2D44'); tanaman(32.9, 0.5);
    // R. Project Manager (Pak Dedy)
    meja(34.6, 1.8, 1.6, 0.8, 's', '#6E4A2C'); kursi(35.3, 3.2, 'n', '#1F2D44'); sofa(33.6, 4.0, 1.6, 's'); rak(36.8, 0.4, 0.5, 2.0, 1.8); tanaman(37.0, 4.6, true);
    // Kantor Kontraktor: klaster meja (warna denah)
    meja(18.7, 8.9, 1.1, 3.8, 'ew', '#E8B4B8'); kursi(18.15, 9.7, 'e'); kursi(18.15, 11.7, 'e'); kursi(20.25, 9.7, 'w'); kursi(20.25, 11.7, 'w');
    meja(23.1, 8.6, 1.1, 4.1, 'ew', '#AFC8E8'); kursi(22.6, 9.7, 'e'); kursi(22.6, 11.7, 'e'); kursi(24.6, 9.7, 'w'); kursi(24.6, 11.7, 'w');
    meja(26.1, 9.0, 1.0, 3.7, 'ew', '#F5C6A5'); kursi(25.6, 11.7, 'e'); kursi(27.6, 9.7, 'w'); kursi(27.6, 11.7, 'w');
    meja(28.3, 9.0, 0.9, 3.7, 'ew', '#B8E0C2');
    meja(16.1, 8.5, 0.8, 1.6, 'e', '#AFC8E8'); kursi(17.35, 9.3, 'w');                       // Teknik Engineer Manager
    meja(16.3, 11.6, 1.4, 0.8, 's', '#8B5A2B'); kursi(17.0, 12.95, 'n', '#1F2D44');          // Logistic Manager (Joko)
    papanTemuan(15.6, 8.6); tanaman(15.6, 13.6, true); tanaman(29.3, 6.4); tanaman(21.0, 13.6);
    bangkuDinding(19.0, 13.5, 2.4); bangkuDinding(24.2, 13.5, 3.0); bangkuDinding(27.6, 13.5, 1.8); sofa(24.3, 12.3, 1.8, 'n');
    // Deputy Pimpro & KSDM
    meja(8.3, 9.2, 1.6, 0.7, 's'); kursi(9.1, 10.2, 'n'); mejaRapat(8.1, 11.6, 2.0, 0.8, '#7F8C8D'); tanaman(10.2, 13.6);
    meja(11.6, 8.8, 1.6, 0.7, 's', '#F7DC6F'); kursi(12.4, 9.8, 'n'); meja(12.8, 10.6, 1.6, 0.7, 's'); kursi(13.6, 11.6, 'n'); lemariArsip(14.6, 12.2, 0.5, 1.6); tanaman(11.0, 13.6, true);
    // pantry, toilet, arsip (barat)
    lemariArsip(-5.9, 4.0, 2.0, 0.5); lemariArsip(-5.9, 7.8, 2.0, 0.5); rak(-5.95, 5.0, 0.45, 2.4, 1.6);
    pantryMeja(-3.5, 4.0, 1.9, 0.6); kulkas(-2.2, 7.7); dispenser(-3.4, 7.9);
    wc(-1.2, 5.25); wc(-0.4, 5.25); wc(-1.2, 7.3); wc(-0.4, 7.3); wastafel(0.6, 5.2, 1.4); wastafel(0.6, 7.3, 1.4);
    tangga(0.4, 8.6, 5.6, 4.8, 'x');
    // timur: toilet, pantry, tangga, R. Meeting
    wc(32.0, 5.25); wc(32.8, 5.25); wc(32.0, 7.3); wc(32.8, 7.3); wastafel(33.8, 5.2, 1.4); wastafel(33.8, 7.3, 1.4);
    pantryMeja(30.0, 9.7, 1.8, 0.6); dispenser(31.4, 12.0); kulkas(29.85, 11.9);
    tangga(32.3, 8.6, 4.8, 5.0, 'y');
    mejaRapat(39.4, 5.4, 2.6, 1.1, '#2E7D5B'); tanaman(42.5, 4.2, true); tanaman(38.8, 8.0);
    PILAR.forEach(([x, y]) => { blok(x - 0.25, y - 0.25, 0.5, 0.5); tambah(x + y + 0.3, c => kotak(c, x - 0.25, y - 0.25, 0.5, 0.5, 1.6, 0, '#4D5656')); });
    // teras: kolam renang, kursi jemur, taman, area merokok
    blok(14.5, 15.0, 0.9, 1.6); blok(14.5, 17.2, 0.9, 1.6);
    tambah(14.5 + 15.0 + 1, c => { kotak(c, 14.5, 15.0, 0.9, 1.6, 0.25, 0, '#FFFFFF'); kotak(c, 14.5, 15.0, 0.9, 0.35, 0.6, 0.25, '#F2F4F4'); kotak(c, 14.5, 17.2, 0.9, 1.6, 0.25, 0, '#FFFFFF'); kotak(c, 14.5, 17.2, 0.9, 0.35, 0.6, 0.25, '#F2F4F4'); });
    tambah(16.0 + 14.8, c => { kotak(c, 15.95, 14.75, 0.08, 0.08, 1.9, 0, '#7F8C8D'); const [px, py] = P(16, 14.8, 2.0); c.fillStyle = '#E8503A'; c.beginPath(); c.ellipse(px, py, 30, 13, 0, Math.PI, 0); c.fill(); c.fillStyle = '#F5F0E6'; c.beginPath(); c.ellipse(px, py, 30, 4, 0, 0, Math.PI * 2); c.fill(); });
    // area merokok (gazebo)
    blok(26.4, 17.2, 2.6, 0.5); blok(25.6, 15.4, 0.3, 0.3);
    tambah(26.4 + 17.7, c => { kotak(c, 26.4, 17.2, 2.6, 0.5, 0.45, 0, '#8B5A2B'); kotak(c, 25.6, 15.4, 0.3, 0.3, 0.8, 0, '#7F8C8D'); kotak(c, 25.55, 15.35, 0.4, 0.4, 0.05, 0.8, '#B3B6B7'); });
    tambah(29.8 + 18.6, c => { [[25.3, 14.7], [29.7, 14.7], [25.3, 18.3], [29.7, 18.3]].forEach(([x, y]) => kotak(c, x - 0.06, y - 0.06, 0.12, 0.12, 2.3, 0, '#5D4037')); poly(c, [P(25.0, 14.4, 2.35), P(30.0, 14.4, 2.35), P(30.0, 18.6, 2.35), P(25.0, 18.6, 2.35)], 'rgba(110,80,50,.45)', '#5D4037', 1.5); teksLantai(c, 27.5, 18.9, 'SMOKING AREA', 0.42, '#5D4037', true); });
    // taman
    [[9.2, 15.3], [11.6, 19.8], [13.6, 15.4], [9.0, 20.2]].forEach(([x, y]) => { blok(x - 0.4, y - 0.4, 0.8, 0.8); tambah(x + y + 0.4, (c, t) => pohon(c, x, y, t)); });
    [[10.2, 17.4], [12.9, 20.6], [30.2, 20.2]].forEach(([x, y]) => tanaman(x, y, true));
    tambah(9 + 17.6, c => { kotak(c, 8.8, 17.0, 1.1, 0.4, 0.42, 0, '#8B5A2B'); });
    blok(8.8, 17.0, 1.1, 0.4);
  }
  function pohon(c, x, y, t) {
    kotak(c, x - 0.12, y - 0.12, 0.24, 0.24, 1.5, 0, '#6B4226');
    const [px, py] = P(x, y, 2.1), g = hemat() ? 0 : Math.sin(t * 0.9 + x) * 1.2;
    [['#1E6B3A', 0, 6, 26], ['#2E8B4A', -16, 0, 18], ['#3FA45B', 15, -2, 18], ['#2E8B4A', -6, -16, 18], ['#4CBB6C', 8, -20, 13]].forEach(d => { c.fillStyle = d[0]; c.beginPath(); c.arc(px + d[1] + g, py + d[2], d[3], 0, Math.PI * 2); c.fill(); });
  }

  /* ======================= 5. LATAR (lantai, dinding, cahaya) — digambar sekali per ukuran & jam ======================= */
  function polaLantai(c, r, siang) {
    const jenis = r.jenis, x = r.x, y = r.y, w = r.w, d = r.d;
    const dasar = { kayu: '#D9B48A', kayu2: '#E4C9A3', karpet: '#7E93A8', karpet2: '#6F8F7A', keramik: '#E9E6E1', keramik2: '#DCD8D2', toilet: '#C9D6DF' }[jenis] || '#E5E1DA';
    lantai(c, x, y, w, d, dasar);
    c.save(); c.beginPath(); const q = [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)]; q.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.clip();
    c.lineWidth = 1;
    if (jenis === 'kayu' || jenis === 'kayu2') { c.strokeStyle = 'rgba(120,80,40,.16)'; for (let yy = y; yy < y + d; yy += 0.25) { const a = P(x, yy), b = P(x + w, yy); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      const rnd = acak(Math.round(x * 13 + y * 7)); c.strokeStyle = 'rgba(120,80,40,.12)'; for (let yy = y; yy < y + d; yy += 0.25) for (let xx = x + rnd() * 1.4; xx < x + w; xx += 1.2 + rnd()) { const a = P(xx, yy), b = P(xx, yy + 0.25); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } }
    else if (jenis === 'keramik' || jenis === 'keramik2' || jenis === 'toilet') { c.strokeStyle = jenis === 'toilet' ? 'rgba(255,255,255,.55)' : 'rgba(150,140,130,.22)'; const st = jenis === 'toilet' ? 0.3 : 0.6;
      for (let xx = Math.ceil(x / st) * st; xx < x + w; xx += st) { const a = P(xx, y), b = P(xx, y + d); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      for (let yy = Math.ceil(y / st) * st; yy < y + d; yy += st) { const a = P(x, yy), b = P(x + w, yy); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } }
    else if (jenis === 'karpet' || jenis === 'karpet2') { const rnd = acak(Math.round(x * 31)); c.fillStyle = 'rgba(255,255,255,.04)'; for (let k = 0; k < w * d * 6; k++) { const p = P(x + rnd() * w, y + rnd() * d); c.fillRect(p[0], p[1], 2, 1); } }
    c.restore();
  }
  function latar(c) {
    const jam = new Date().getHours(), siang = jam >= 6 && jam < 18;
    const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, siang ? '#DCE8F2' : '#0E1A2E'); g.addColorStop(1, siang ? '#B9CCDD' : '#162640'); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
    // teras: rumput, dek, kolam
    lantai(c, 8, 14.1, 23, 7.2, siang ? '#6DAE5A' : '#3E6B36');
    const rnd = acak(5); c.fillStyle = 'rgba(30,80,30,.25)'; for (let k = 0; k < 900; k++) { const p = P(8 + rnd() * 23, 14.1 + rnd() * 7.2); c.fillRect(p[0], p[1], 1.5, 2.5); }
    lantai(c, 16.6, 14.1, 8.4, 6.0, '#C8A57A'); c.strokeStyle = 'rgba(90,60,30,.25)'; for (let xx = 16.6; xx < 25; xx += 0.3) { const a = P(xx, 14.1), b = P(xx, 20.1); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    lantai(c, 21.6, 14.1, 1.8, 0.6, '#C8A57A');
    lantai(c, 17.3, 15.4, 6.8, 3.9, '#EDE7DA');
    const pg = c.createLinearGradient(...P(17.5, 15.6), ...P(23.9, 19.1)); pg.addColorStop(0, siang ? '#5FC6F0' : '#1C6EA4'); pg.addColorStop(1, siang ? '#1E88C8' : '#0C4A78');
    lantai(c, 17.55, 15.65, 6.3, 3.4, pg); c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([5, 4]); [16.5, 17.35, 18.2].forEach(yy => { const a = P(17.7, yy), b = P(23.7, yy); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }); c.setLineDash([]);
    lantai(c, 25.0, 14.4, 5.0, 4.2, '#B9B3A8'); c.strokeStyle = 'rgba(80,70,60,.25)'; for (let xx = 25.0; xx < 30; xx += 0.5) { const a = P(xx, 14.4), b = P(xx, 18.6); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    // lantai gedung
    RUANG.forEach(r => polaLantai(c, r, siang));
    // karpet & cahaya lampu
    lantai(c, 23.9, 11.6, 2.5, 1.6, 'rgba(46,125,91,.25)');
    const lampu = (x, y, r) => { const [px, py] = P(x, y); const gr = c.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, siang ? 'rgba(255,248,225,.35)' : 'rgba(255,214,140,.45)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = gr; c.beginPath(); c.ellipse(px, py, r, r / 2, 0, 0, Math.PI * 2); c.fill(); };
    [[19, 10.5], [23.6, 10.5], [27.4, 10.5], [20, 2.5], [9.5, 3], [5, 3], [14.5, 3], [27, 3], [31.3, 2.6], [35.4, 2.6], [9, 10.5], [13, 10.5], [40.5, 6]].forEach(([x, y]) => lampu(x, y, 70));
    // teks ruang di lantai
    RUANG.forEach(r => { if (r.nama) teksLantai(c, r.x + r.w / 2, r.y + r.d - (r.d > 3 ? 0.5 : r.d / 2), r.nama, r.nama.length > 16 ? 0.32 : 0.38, 'rgba(70,60,50,.45)', true); });
    teksLantai(c, 20.8, 19.8, 'KOLAM RENANG', 0.4, 'rgba(255,255,255,.75)', true);
    teksLantai(c, 11.5, 21.0, 'TAMAN', 0.45, 'rgba(255,255,255,.7)', true);
  }
  // dinding (potong) sebagai objek bertingkat kedalaman
  function pasangDinding() {
    DIND.forEach(([x1, y1, x2, y2, h, jendela]) => {
      const pjg = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(pjg / 1.0));
      for (let k = 0; k < n; k++) {
        const a = k / n, b = (k + 1) / n, xa = x1 + (x2 - x1) * a, ya = y1 + (y2 - y1) * a, xb = x1 + (x2 - x1) * b, yb = y1 + (y2 - y1) * b;
        const horiz = y1 === y2, t = 0.14;
        tambah((xa + xb) / 2 + (ya + yb) / 2 + (horiz ? 0.06 : 0.06), c => {
          const bx = horiz ? Math.min(xa, xb) : xa - t / 2, by = horiz ? ya - t / 2 : Math.min(ya, yb), bw = horiz ? Math.abs(xb - xa) : t, bd = horiz ? t : Math.abs(yb - ya);
          if (jendela) {
            kotak(c, bx, by, bw, bd, 0.45, 0, '#EFE6D6');
            const g0 = horiz ? [P(bx, by + bd, 0.45), P(bx + bw, by + bd, 0.45), P(bx + bw, by + bd, h - 0.1), P(bx, by + bd, h - 0.1)] : [P(bx + bw, by, 0.45), P(bx + bw, by + bd, 0.45), P(bx + bw, by + bd, h - 0.1), P(bx + bw, by, h - 0.1)];
            poly(c, g0, 'rgba(150,200,235,.38)', 'rgba(70,100,130,.55)', 1);
            kotak(c, bx, by, bw, bd, 0.1, h - 0.1, '#A9B7C6');
          } else kotak(c, bx, by, bw, bd, h, 0, '#F1E8D8', null);
          // garis atas biru-abu (seperti contoh)
          const top = horiz ? [P(bx, by, bh(h, jendela)), P(bx + bw, by, bh(h, jendela)), P(bx + bw, by + bd, bh(h, jendela)), P(bx, by + bd, bh(h, jendela))] : [P(bx, by, bh(h, jendela)), P(bx + bw, by, bh(h, jendela)), P(bx + bw, by + bd, bh(h, jendela)), P(bx, by + bd, bh(h, jendela))];
          poly(c, top, '#9FB3C8');
        });
      }
    });
  }
  const bh = (h) => h;

  /* ======================= 6. PENCARI RUTE (A*, grid 0,5 m, menghormati dinding) ======================= */
  const G = { x0: -6.25, y0: -0.25, s: 0.5, w: 100, h: 44, jalan: null, dindingCek: null };
  const dalamArea = (x, y) => AREA.some(a => x >= a.x + 0.05 && x <= a.x + a.w - 0.05 && y >= a.y - 0.3 && y <= a.y + a.d + 0.3) && AREA.some(a => x >= a.x - 0.3 && x <= a.x + a.w + 0.3 && y >= a.y + 0.05 && y <= a.y + a.d - 0.05);   // batas daerah longgar; dinding yang menahan
  const terblok = (x, y) => BLOK.some(b => x > b[0] - 0.12 && x < b[0] + b[2] + 0.12 && y > b[1] - 0.12 && y < b[1] + b[3] + 0.12);
  const potongDinding = (ax, ay, bx, by) => DIND.some(([x1, y1, x2, y2]) => {
    if (y1 === y2) { if ((ay - y1) * (by - y1) >= 0) return false; const tx = ax + (bx - ax) * (y1 - ay) / (by - ay); return tx >= Math.min(x1, x2) - 0.05 && tx <= Math.max(x1, x2) + 0.05; }
    if ((ax - x1) * (bx - x1) >= 0) return false; const ty = ay + (by - ay) * (x1 - ax) / (bx - ax); return ty >= Math.min(y1, y2) - 0.05 && ty <= Math.max(y1, y2) + 0.05;
  });
  const sel = (i, j) => [G.x0 + i * G.s, G.y0 + j * G.s];
  function siapkanGrid() {
    if (G.jalan) return;
    G.jalan = new Uint8Array(G.w * G.h);
    for (let j = 0; j < G.h; j++) for (let i = 0; i < G.w; i++) { const [x, y] = sel(i, j); G.jalan[j * G.w + i] = dalamArea(x, y) && !terblok(x, y) ? 1 : 0; }
    G.kolam = new Uint8Array(G.w * G.h); for (let j = 0; j < G.h; j++) for (let i = 0; i < G.w; i++) { const [x, y] = sel(i, j); if (x > 17.5 && x < 23.9 && y > 15.6 && y < 19.1) G.kolam[j * G.w + i] = 1; }
    G.cek = new Map();
  }
  const keSel = (x, y) => [Math.max(0, Math.min(G.w - 1, Math.round((x - G.x0) / G.s))), Math.max(0, Math.min(G.h - 1, Math.round((y - G.y0) / G.s)))];
  function bisa(i1, j1, i2, j2) {
    const k = i1 + ',' + j1 + ',' + i2 + ',' + j2; if (G.cek.has(k)) return G.cek.get(k);
    const [ax, ay] = sel(i1, j1), [bx, by] = sel(i2, j2), v = !potongDinding(ax, ay, bx, by); G.cek.set(k, v); return v;
  }
  function rute(x1, y1, x2, y2, bolehKolam) {
    siapkanGrid();
    const [si, sj] = keSel(x1, y1), [ti, tj] = keSel(x2, y2), W = G.w, idx = (i, j) => j * W + i;
    const ok = (i, j) => i >= 0 && j >= 0 && i < W && j < G.h && (G.jalan[idx(i, j)] || (i === ti && j === tj) || (i === si && j === sj));
    const g = new Float32Array(W * G.h).fill(1e9), dari = new Int32Array(W * G.h).fill(-1), tutup = new Uint8Array(W * G.h);
    const buka = [[0, si, sj]]; g[idx(si, sj)] = 0;
    const H = (i, j) => Math.hypot(i - ti, j - tj);
    let iter = 0;
    while (buka.length && iter++ < 20000) {
      let m = 0; for (let k = 1; k < buka.length; k++) if (buka[k][0] < buka[m][0]) m = k;
      const [, i, j] = buka.splice(m, 1)[0], id = idx(i, j); if (tutup[id]) continue; tutup[id] = 1;
      if (i === ti && j === tj) break;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di, nj = j + dj; if (!ok(ni, nj)) continue;
        if (di && dj && (!ok(i + di, j) || !ok(i, j + dj) || !bisa(i, j, i + di, j) || !bisa(i, j, i, j + dj))) continue;
        if (!bisa(i, j, ni, nj)) continue;
        const nid = idx(ni, nj), biaya = (di && dj ? 1.414 : 1) * (G.kolam[nid] && !bolehKolam ? 25 : 1), ng = g[id] + biaya;
        if (ng < g[nid]) { g[nid] = ng; dari[nid] = id; buka.push([ng + H(ni, nj), ni, nj]); }
      }
    }
    if (dari[idx(ti, tj)] < 0 && !(si === ti && sj === tj)) return [[x2, y2]];
    const L = []; let cur = idx(ti, tj); while (cur >= 0 && cur !== idx(si, sj)) { L.push(sel(cur % W, Math.floor(cur / W))); cur = dari[cur]; }
    L.reverse();
    // rapikan: buang titik segaris
    const out = []; L.forEach((p, k) => { if (k > 0 && k < L.length - 1) { const a = L[k - 1], b = L[k + 1]; if (Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) < 1e-6) return; } out.push(p); });
    out.push([x2, y2]); return out;
  }

  /* ======================= 7. KARAKTER: data, teks balon, perilaku ======================= */
  function siapkan() {
    if (KT.ch.length) return;
    susun(); pasangDinding();
    KT.ch = ROSTER.concat(WARGA).map((r, k) => ({ r, x: r.duduk[0], y: r.duduk[1], jalur: [], sampai: performance.now() + 2000 + k * 900, mode: 'meja', teks: '', titik: false, fase: k * 1.7, k: 0, urut: k, arah: r.duduk[2], gerak: false, status: 'meja', pose: 'duduk' }));
  }
  const temuanDari = id => { const a = A(), r = ROSTER.find(x => x.id === id) || {}; return a ? a.temuan.filter(x => (r.sumber || []).indexOf(x.sumber) >= 0 || ((r.manajer || r.kritis) && x.level === 'KRITIS')) : []; };
  function baris(c) {
    const a = A(), r = c.r; if (r.warga) return '';
    if (!a || !a.pada) return '☕ Menunggu data proyek…';
    const R = a.ring || {}, n = R.n || {}, T = temuanDari(r.id), x = T.length ? T[(c.k++ + c.urut) % T.length] : null;
    switch (r.id) {
      case 'vicha': return '💻 SAP: ' + (R.kontrak || 0) + ' kontrak · ' + (R.bk || 0) + ' BK tersinkron';
      case 'yusuf': return x ? '🧾 ' + x.judul : '🧾 Tagihan service & kontrak tertib';
      case 'charles': return x ? (x.sumber === 'Gudang' ? '📦 ' : '🧾 ') + x.judul : R.bayar ? '🧾 ' + R.bayar + ' tagihan belum bayar · ' + rpS(R.nilaiBayar) : '📦 Gudang & tagihan aman';
      case 'ilham': return x ? '🛡️ Reviu ' + x.judul : '🛡️ Alur pengadaan sesuai prosedur';
      case 'joko': return n.KRITIS ? '📋 Prioritas: ' + n.KRITIS + ' kritis' : '📋 Pengadaan & logistik terkendali';
      case 'dedy': return n.KRITIS ? '👀 Pantau: ' + n.KRITIS + ' temuan kritis' : '👀 Pantau proyek: aman terkendali';
      case 'imam': return '📊 Pantau ' + (R.kontrak || 0) + ' kontrak · ' + (R.bk || 0) + ' BK';
      case 'henoc': return x ? '🧪 Cek mutu: ' + x.judul : '🧪 Pantau mutu material masuk';
      default: return x ? '🏷️ WBS ' + x.judul : /dilewati/.test((a.hasilL || {}).wbs || '') ? '🏷️ Menunggu bon permintaan' : '🏷️ Semua bon ber-WBS';
    }
  }
  const diKursi = c => Math.abs(c.x - c.r.duduk[0]) < 0.08 && Math.abs(c.y - c.r.duduk[1]) < 0.08;
  function pergi(c, x, y, tujuan) { c.tuju = tujuan; c.jalur = rute(c.x, c.y, x, y, tujuan === 'kolam'); if (hemat()) { c.x = x; c.y = y; c.jalur = []; } }
  KT.pergi = pergi; KT.potongDinding = potongDinding;   // untuk uji
  const keMeja = c => { if (!diKursi(c) && !(c.jalur.length && c.tuju === 'meja')) pergi(c, c.r.duduk[0], c.r.duduk[1], 'meja'); };
  function perilaku(c, now) {
    const a = A(), r = c.r;
    if (c.ov && now < c.ov.sampai) { if (c.ov.meja) keMeja(c); c.teks = c.ov.teks; c.titik = !!c.ov.titik; c.status = c.ov.status || 'kerja'; return; }
    if (c.ov) { c.ov = null; c.sampai = 0; }
    if (a && a.jalan && !r.santai && !r.warga) {
      keMeja(c); c.mode = 'meja'; c.sampai = now + 6000;
      const hs = r.langkah.filter(l => (a.hasilL || {})[l]), h = hs.length ? a.hasilL[hs[hs.length - 1]] : '';
      if (r.langkah.indexOf(a.aktif) >= 0) { c.teks = r.ik + ' ' + (r.kerja[a.aktif] || a.langkah.replace(/…$/, '')); c.titik = true; c.status = 'kerja'; }
      else if (h) { c.teks = (/^gagal/.test(h) ? '⚠️ ' : /^dilewati/.test(h) ? '⏭️ ' : '✓ ') + h; c.titik = false; c.status = 'selesai'; }
      else { c.teks = '⏳ Menunggu giliran'; c.titik = false; c.status = 'antre'; }
      return;
    }
    if (c.jalur.length || now < c.sampai) return;
    if (c.mode === 'titik') { c.mode = 'meja'; c.teks = r.warga ? '' : '↩️ Kembali ke meja'; c.titik = false; c.status = 'jalan'; keMeja(c); c.sampai = now + 1500; return; }
    const peluang = Math.random(), kritis = (((a && a.ring) || {}).n || {}).KRITIS || 0;
    const pilihan = r.warga ? ['kopiB', 'kopiT', 'toiletP', 'printer'] : r.santai ? ['kolam', 'kolam', 'rokok', 'rokok', 'kopiT', 'pantau', 'pantau', 'taman', 'sofa'] : r.manajer ? (kritis ? ['papan', 'pantau', 'rapat'] : ['jendela', 'rapat', 'kopiT', 'kolam']) : ['kopiB', 'kopiT', 'jendela', 'sofa', 'printer', 'taman'].concat(r.sumber.length || r.kritis ? ['papan'] : []);
    const ambang = r.santai ? 0.75 : r.warga ? 0.12 : 0.32;
    if (diKursi(c) && peluang < ambang && (r.warga || (a && a.pada))) {
      let pilih = pilihan[Math.floor(Math.random() * pilihan.length)], t;
      if (pilih === 'pantau') { const staf = KT.ch.filter(o => !o.r.santai && !o.r.warga && !o.r.manajer && diKursi(o)); const o = staf[Math.floor(Math.random() * staf.length)]; if (!o) pilih = 'kopiT'; else { const d = o.r.duduk, dx = d[2] === 'e' ? -0.6 : d[2] === 'w' ? 0.6 : 0, dy = d[2] === 'n' ? 0.6 : d[2] === 's' ? -0.6 : 0.5; t = [d[0] + dx, d[1] + dy, '👀 Pantau kerja ' + o.r.nama.split(' ')[0]]; } }
      if (!t) t = TITIK[pilih].slice();
      if (pilih === 'kolam') t = [18.2 + Math.random() * 5.2, 16.1 + Math.random() * 2.4, t[2]];
      if (pilih === 'rokok') t = [26.2 + Math.random() * 2.8, 15.6 + Math.random() * 1.2, t[2]];
      const sibuk = pilih !== 'kolam' && pilih !== 'rokok' && KT.ch.some(o => o !== c && o.mode === 'titik' && o.tujuan === pilih);
      if (!sibuk) {
        c.mode = 'titik'; c.tujuan = pilih; c.status = 'jalan'; c.teks = r.warga ? '' : (pilih === 'papan' && kritis ? '📌 Rapat: ' + kritis + ' temuan kritis' : t[2]); c.titik = false;
        pergi(c, t[0], t[1], pilih); c.sampai = now + (r.santai ? 14000 + Math.random() * 12000 : 5000 + Math.random() * 4000); return;
      }
    }
    keMeja(c); c.mode = 'meja'; c.teks = baris(c); c.titik = !r.santai && !r.warga && Math.random() < .6; c.status = 'meja'; c.sampai = now + (r.warga ? 9000 : 7000) + Math.random() * 8000;
  }
  function gerak(c, dt, now) {
    c.gerak = false;
    if (!c.jalur.length) {
      // berenang bolak-balik di kolam
      if (c.mode === 'titik' && c.tujuan === 'kolam') { c.renangT = (c.renangT || 0) + dt; c.x = 18.2 + (Math.sin(c.renangT * 0.35 + c.fase) * 0.5 + 0.5) * 5.2; c.arah = Math.cos(c.renangT * 0.35 + c.fase) > 0 ? 'e' : 'w'; }
      return;
    }
    const [tx, ty] = c.jalur[0], dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), l = 1.25 * dt;
    if (d <= l) { c.x = tx; c.y = ty; c.jalur.shift(); if (!c.jalur.length) { if (c.tuju === 'meja') c.arah = c.r.duduk[2]; if (c.mode === 'titik') c.sampai = Math.max(c.sampai, now + 4000); } }
    else { c.x += dx / d * l; c.y += dy / d * l; c.gerak = true; c.arah = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n'); }
  }

  /* ======================= 8. MENGGAMBAR KARAKTER ======================= */
  function pose(ch) {
    if (ch.gerak) return 'jalan';
    if (ch.mode === 'titik' && ch.tujuan === 'kolam' && !ch.jalur.length) return 'renang';
    if (ch.mode === 'titik' && ch.tujuan === 'rokok' && !ch.jalur.length) return 'rokok';
    if (ch.mode === 'titik' && ch.tujuan === 'sofa' && !ch.jalur.length) return 'duduk';
    return diKursi(ch) ? 'duduk' : 'berdiri';
  }
  function orang(c, ch, t) {
    const r = ch.r, ps = pose(ch), [x, y] = P(ch.x, ch.y, 0), bel = ch.arah === 'n' || ch.arah === 'w', balik = ch.arah === 'w' || ch.arah === 's' ? -1 : 1;
    const ay = ps === 'jalan' ? Math.sin(t * 11 + ch.fase) : 0, duduk = ps === 'duduk';
    const k = 1.05;   // skala
    c.save(); c.translate(x, y); c.scale(k, k);
    if (ps === 'renang') {   // kepala & bahu di air
      c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1.2; for (let i = 0; i < 2; i++) { const rr2 = 8 + ((t * 9 + i * 7 + ch.fase * 5) % 14); c.globalAlpha = 1 - rr2 / 22; c.beginPath(); c.ellipse(0, 0, rr2, rr2 / 2.3, 0, 0, Math.PI * 2); c.stroke(); } c.globalAlpha = 1;
      const sw = Math.sin(t * 4 + ch.fase); c.fillStyle = r.kulit; c.beginPath(); c.ellipse(-8 * balik, -3 + sw * 2, 3, 2, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(8 * balik, -3 - sw * 2, 3, 2, 0, 0, Math.PI * 2); c.fill();
      kepala(c, r, 0, -9, !bel, balik, t, ch, true); c.restore(); return -22 * k;
    }
    c.fillStyle = 'rgba(40,30,20,.22)'; c.beginPath(); c.ellipse(0, 0, 9, 3.6, 0, 0, Math.PI * 2); c.fill();
    const by = duduk ? -14 : -18;   // pinggang
    if (!duduk) {   // kaki
      c.fillStyle = r.celana; rr(c, -5, by, 4.2, 17 - Math.max(0, ay) * 3, 2); c.fill(); rr(c, 0.8, by, 4.2, 17 - Math.max(0, -ay) * 3, 2); c.fill();
      c.fillStyle = '#1B1B1B'; rr(c, -6, -2.5 - Math.max(0, ay) * 3, 5.5, 3, 1.5); c.fill(); rr(c, 0.5, -2.5 - Math.max(0, -ay) * 3, 5.5, 3, 1.5); c.fill();
    } else if (!bel) { c.fillStyle = r.celana; rr(c, -5, by, 4.5, 8, 2); c.fill(); rr(c, 0.5, by, 4.5, 8, 2); c.fill(); }
    // badan
    const g = c.createLinearGradient(-8, by - 18, 8, by); g.addColorStop(0, r.baju); g.addColorStop(1, redup(r.baju.length === 7 ? r.baju : '#888888', 0.78));
    c.fillStyle = g; rr(c, -8.5, by - 18, 17, 19, 6); c.fill();
    if (r.baju === '#FFFFFF') { c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1; rr(c, -8.5, by - 18, 17, 19, 6); c.stroke(); }
    if (!bel) { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(-3.5, by - 18); c.lineTo(0, by - 13); c.lineTo(3.5, by - 18); c.fill();
      if (r.dasi) { c.fillStyle = '#B03A2E'; c.beginPath(); c.moveTo(-1.4, by - 15); c.lineTo(1.4, by - 15); c.lineTo(1, by - 6); c.lineTo(0, by - 4); c.lineTo(-1, by - 6); c.fill(); }
      if (r.helm) { c.fillStyle = '#F5C518'; c.fillRect(-8.5, by - 9, 17, 2); } }
    // lengan
    const ketik = duduk && bel && (ch.status === 'kerja' || ch.titik) ? Math.sin(t * 22 + ch.fase) * 1.4 : 0, ln = ps === 'jalan' ? ay * 3 : 0;
    c.fillStyle = r.baju;
    if (ps === 'rokok') { rr(c, -12, by - 16, 4.5, 13, 2.2); c.fill(); c.save(); c.translate(8 * balik, by - 15); c.rotate(-0.9 * balik); rr(c, -2.2, 0, 4.5, 11, 2.2); c.fill(); c.restore();
      c.fillStyle = r.kulit; c.beginPath(); c.arc(5 * balik, by - 23, 2.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#FDFEFE'; c.fillRect(5 * balik + (balik > 0 ? 0 : -6), by - 24.5, 6, 1.6); c.fillStyle = '#FF6B1A'; c.fillRect(5 * balik + (balik > 0 ? 5.5 : -6.5), by - 24.6, 1.4, 1.8);
      if (Math.random() < 0.25) KT.asap.push({ x: ch.x, y: ch.y, ox: (11 * balik) * k, oy: (by - 25) * k, a: 1, t: 0 }); }
    else { rr(c, -12, by - 16 + ln + ketik, 4.5, 13, 2.2); c.fill(); rr(c, 7.5, by - 16 - ln - ketik, 4.5, 13, 2.2); c.fill(); c.fillStyle = r.kulit; c.beginPath(); c.arc(-9.8, by - 2.5 + ln + ketik, 2.2, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(9.8, by - 2.5 - ln - ketik, 2.2, 0, Math.PI * 2); c.fill(); }
    kepala(c, r, 0, by - 28, !bel, balik, t, ch, false);
    c.restore();
    return (by - 40) * k;
  }
  function kepala(c, r, hx, hy, depan, balik, t, ch, basah) {
    c.fillStyle = r.kulit; rr(c, hx - 2.5, hy + 7, 5, 4, 1); c.fill();   // leher
    const gg = c.createRadialGradient(hx - 3, hy - 3, 2, hx, hy, 11); gg.addColorStop(0, r.kulit); gg.addColorStop(1, redup(r.kulit, 0.86));
    if (r.gaya === 'hijab') { c.fillStyle = r.hijab || '#D5DBDB'; c.beginPath(); c.ellipse(hx, hy + 1, 11.5, 12.5, 0, 0, Math.PI * 2); c.fill(); rr(c, hx - 9, hy + 6, 18, 8, 4); c.fill();
      if (depan) { c.fillStyle = gg; c.beginPath(); c.ellipse(hx, hy + 1.5, 7, 8, 0, 0, Math.PI * 2); c.fill(); wajah(c, r, hx, hy + 1, balik, t, ch); } return; }
    c.fillStyle = gg; c.beginPath(); c.ellipse(hx, hy, 9.5, 10.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = r.kulit; c.beginPath(); c.arc(hx - 9.3, hy + 1, 2.2, 0, Math.PI * 2); c.arc(hx + 9.3, hy + 1, 2.2, 0, Math.PI * 2); c.fill();
    const rb = basah ? redup(r.rambut, 0.7) : r.rambut; c.fillStyle = rb;
    if (r.gaya === 'tipis') { c.beginPath(); c.ellipse(hx, hy - 6, 8.8, 5, 0, Math.PI, 0); c.fill(); if (!depan) { c.beginPath(); c.ellipse(hx, hy, 9.6, 10.6, 0, 0, Math.PI * 2); c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1; } }
    else if (!depan) { c.beginPath(); c.ellipse(hx, hy - 0.5, 10, 10.8, 0, 0, Math.PI * 2); c.fill(); if (r.gaya === 'panjang') { rr(c, hx - 10, hy, 20, 14, 5); c.fill(); } }
    else {
      c.beginPath(); c.ellipse(hx, hy - 4, 10.2, 7.5, 0, Math.PI * 1.02, Math.PI * 1.98); c.fill();
      if (r.gaya === 'rapi') { c.beginPath(); c.moveTo(hx - 10, hy - 3); c.quadraticCurveTo(hx - 4, hy - 9, hx + 9, hy - 4); c.lineTo(hx + 10, hy - 6); c.quadraticCurveTo(hx, hy - 15, hx - 10, hy - 6); c.fill(); }
      if (r.gaya === 'pendek') { c.beginPath(); c.moveTo(hx - 10, hy - 2); c.lineTo(hx - 7, hy - 6); c.lineTo(hx - 3, hy - 4); c.lineTo(hx + 1, hy - 7); c.lineTo(hx + 5, hy - 4); c.lineTo(hx + 10, hy - 4); c.lineTo(hx + 9, hy - 10); c.quadraticCurveTo(hx, hy - 15, hx - 9, hy - 9); c.fill(); }
      if (r.gaya === 'panjang') { rr(c, hx - 10.5, hy - 4, 4, 17, 2); c.fill(); rr(c, hx + 6.5, hy - 4, 4, 17, 2); c.fill(); }
      wajah(c, r, hx, hy, balik, t, ch);
    }
    if (r.helm && !basah) { c.fillStyle = '#F5C518'; c.beginPath(); c.ellipse(hx, hy - 4, 11, 9, 0, Math.PI, 0); c.fill(); c.fillStyle = '#D4A90F'; c.fillRect(hx - 12.5, hy - 4.5, 25, 2.4); }
  }
  function wajah(c, r, hx, hy, balik, t, ch) {
    const kedip = (Math.floor(t * 0.7 + ch.fase) % 5 === 0) && ((t * 0.7 + ch.fase) % 1 < 0.12), ox = balik * 1.2;
    c.fillStyle = '#1B1B1B';
    if (kedip) { c.fillRect(hx - 4.6 + ox, hy + 0.5, 3, 0.9); c.fillRect(hx + 1.6 + ox, hy + 0.5, 3, 0.9); }
    else { c.beginPath(); c.ellipse(hx - 3.1 + ox, hy + 0.6, 1.4, 1.8, 0, 0, Math.PI * 2); c.ellipse(hx + 3.1 + ox, hy + 0.6, 1.4, 1.8, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.fillRect(hx - 3.2 + ox, hy - 0.2, 0.8, 0.8); c.fillRect(hx + 3.0 + ox, hy - 0.2, 0.8, 0.8); }
    c.strokeStyle = redup(r.rambut === '#FFFFFF' ? '#555555' : r.rambut, 1); c.lineWidth = 1.1; c.beginPath(); c.moveTo(hx - 5 + ox, hy - 2.6); c.lineTo(hx - 1.6 + ox, hy - 3); c.moveTo(hx + 1.6 + ox, hy - 3); c.lineTo(hx + 5 + ox, hy - 2.6); c.stroke();
    c.strokeStyle = '#8E3B2E'; c.lineWidth = 1.1; c.beginPath(); c.arc(hx + ox, hy + 3.6, 2.4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(230,120,110,.35)'; c.beginPath(); c.arc(hx - 5.5 + ox, hy + 3.2, 1.8, 0, Math.PI * 2); c.arc(hx + 5.5 + ox, hy + 3.2, 1.8, 0, Math.PI * 2); c.fill();
    if (r.kumis) { c.fillStyle = '#2A2A2A'; c.beginPath(); c.ellipse(hx + ox, hy + 3, 3.2, 1, 0, 0, Math.PI * 2); c.fill(); }
    if (r.kacamata) { c.strokeStyle = '#1B1B1B'; c.lineWidth = 1; c.strokeRect(hx - 6.2 + ox, hy - 1.4, 4.6, 3.8); c.strokeRect(hx + 1.6 + ox, hy - 1.4, 4.6, 3.8); c.beginPath(); c.moveTo(hx - 1.6 + ox, hy); c.lineTo(hx + 1.6 + ox, hy); c.stroke(); }
  }
  function papanNama(c, ch, x, y) {
    if (ch.r.warga) return;
    c.font = '700 10px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'; c.textBaseline = 'middle';
    const n = ch.r.nama, w = c.measureText(n).width + 16;
    c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, x - w / 2 + 1, y + 7, w, 16, 5); c.fill();
    c.fillStyle = '#2C2440'; rr(c, x - w / 2, y + 6, w, 16, 5); c.fill(); c.strokeStyle = '#B9A6E8'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.fillText(n, x, y + 14.5); c.textAlign = 'left';
    const st = ch.status === 'kerja' ? '#F5C518' : ch.status === 'jalan' ? '#7FD3FF' : '#43D17A'; c.fillStyle = st; c.beginPath(); c.arc(x - w / 2 + 5, y + 14, 2.4, 0, Math.PI * 2); c.fill();
    if (KT.pilih === ch.r.id) { c.strokeStyle = '#F5C518'; c.lineWidth = 2; rr(c, x - w / 2 - 2, y + 4, w + 4, 20, 7); c.stroke(); }
    c.font = '600 8px system-ui, sans-serif'; const pw = c.measureText(ch.r.peran).width + 10; c.fillStyle = 'rgba(255,255,255,.92)'; rr(c, x - pw / 2, y + 23, pw, 11, 5); c.fill(); c.fillStyle = '#3A3550'; c.textAlign = 'center'; c.fillText(ch.r.peran, x, y + 29); c.textAlign = 'left';
  }
  function balon(c, ch, x, puncak, t) {
    if (ch.r.warga) return;
    c.font = '600 10px system-ui, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; c.textBaseline = 'middle';
    let y = puncak - 4;
    if (ch.titik) { const w = 24, h = 12, y0 = y - h; c.fillStyle = '#FFFFFF'; rr(c, x - w / 2, y0, w, h, 6); c.fill(); for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(40,48,60,' + (hemat() ? .8 : .35 + .65 * Math.max(0, Math.sin(t * 6 - k * .8))) + ')'; c.beginPath(); c.arc(x - 6 + k * 6, y0 + 6, 1.8, 0, Math.PI * 2); c.fill(); } y = y0 - 4; }
    if (!ch.teks) return;
    const s = pendek(ch.teks, 34), w = Math.min(230, c.measureText(s).width + 14), h = 17, y0 = y - h;
    c.fillStyle = 'rgba(0,0,0,.15)'; rr(c, x - w / 2 + 1, y0 + 1.5, w, h, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.97)'; rr(c, x - w / 2, y0, w, h, 7); c.fill();
    c.beginPath(); c.moveTo(x - 4, y0 + h); c.lineTo(x + 4, y0 + h); c.lineTo(x, y0 + h + 4); c.fill();
    c.fillStyle = '#16233A'; c.fillText(s, x - w / 2 + 7, y0 + h / 2 + .5);
  }

  /* ======================= 9. LUKIS SATU BINGKAI ======================= */
  function jamDinding(c) {   // jam di dinding utara Kantor Kontraktor
    const [px, py] = P(17.6, 0, 1.25); const d = new Date(); c.fillStyle = '#FDFEFE'; c.strokeStyle = '#4D5656'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(px, py, 7, 6, 0.5, 0, Math.PI * 2); c.fill(); c.stroke();
    const jarum = (sud, p) => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.sin(sud) * p, py - Math.cos(sud) * p * 0.85); c.stroke(); };
    c.lineWidth = 1.4; jarum((d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, 3.5); c.lineWidth = 1; jarum(d.getMinutes() / 60 * Math.PI * 2, 5.3);
  }
  function gambar(t) {
    const cv = $('mp2614Cv'); if (!cv) return; const c = cv.getContext('2d');
    c.setTransform(KT.s * KT.dpr, 0, 0, KT.s * KT.dpr, 0, 0);
    const kunci = cv.width + 'x' + new Date().getHours();
    if (KT.bgKunci !== kunci) { KT.bg = document.createElement('canvas'); KT.bg.width = cv.width; KT.bg.height = cv.height; const b = KT.bg.getContext('2d'); b.setTransform(KT.s * KT.dpr, 0, 0, KT.s * KT.dpr, 0, 0); latar(b); KT.bgKunci = kunci; }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(KT.bg, 0, 0); c.restore();
    // kilau air kolam
    if (!hemat()) { c.save(); poly(c, [P(17.55, 15.65), P(23.85, 15.65), P(23.85, 19.05), P(17.55, 19.05)]); c.clip(); for (let k = 0; k < 14; k++) { const [px, py] = P(17.8 + (k * 0.47) % 6, 15.9 + ((k * 0.83) % 3) + Math.sin(t * .6 + k) * .1); c.strokeStyle = 'rgba(255,255,255,' + (.18 + .18 * Math.sin(t * 2 + k)) + ')'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(px, py, 9, 2.6, 0, 0, Math.PI * 2); c.stroke(); } c.restore(); }
    const D = OBJ.slice(); KT.ch.forEach(ch => D.push({ k: ch.x + ch.y + 0.02, ch }));
    D.sort((a, b) => a.k - b.k);
    const B = [];
    D.forEach(d => { if (d.f) return d.f(c, t); const ch = d.ch, [x, y] = P(ch.x, ch.y, 0); const pk = orang(c, ch, t); ch.kotak = [x - 14, y + pk - 4, 28, -pk + 10]; B.push([ch, x, y, y + pk]); });
    jamDinding(c);
    // asap rokok
    KT.asap = KT.asap.filter(p => p.a > 0.02).slice(-120);
    KT.asap.forEach(p => { p.t += 0.016; p.a *= 0.985; const [px, py] = P(p.x, p.y, 0); const yy = py + p.oy - p.t * 26, xx = px + p.ox + Math.sin(p.t * 3 + p.x) * 4; c.fillStyle = 'rgba(230,230,230,' + (p.a * 0.5) + ')'; c.beginPath(); c.arc(xx, yy, 2 + p.t * 6, 0, Math.PI * 2); c.fill(); });
    // papan nama di atas kepala (seperti kantor contoh); digeser ke atas bila bertumpuk dengan papan lain
    const taruh = [], posisi = new Map();
    B.filter(b => !b[0].r.warga).sort((p, q) => q[3] - p[3]).forEach(([ch, x, y, pk]) => {
      c.font = '700 10px ui-monospace, Menlo, Consolas, monospace'; const w = c.measureText(ch.r.nama).width + 16; let ty = pk - 40;
      for (let k = 0; k < 6 && taruh.some(r => Math.abs(r[0] - x) < (r[1] + w) / 2 && Math.abs(r[2] - ty) < 30); k++) ty -= 31;
      taruh.push([x, w, ty]); posisi.set(ch, ty);
    });
    B.forEach(([ch, x, y, pk]) => { if (!ch.r.warga) papanNama(c, ch, x, posisi.get(ch)); });
    B.forEach(([ch, x, y, pk]) => balon(c, ch, x, ch.r.warga ? pk : posisi.get(ch) + 2, t));
    // siang/malam: lapisan malam lembut
    const jam = new Date().getHours(); if (jam < 6 || jam >= 18) { c.fillStyle = 'rgba(10,20,50,.12)'; c.fillRect(0, 0, LW, LH); }
  }

  /* ======================= 10. DIALOG, STRIP STATUS, KARTU TEMUAN ======================= */
  const STATUS = { kerja: 'Bekerja', selesai: 'Selesai', antre: 'Antre', jalan: 'Berjalan', meja: 'Di meja' };
  const timSaja = () => KT.ch.filter(ch => !ch.r.warga);
  function strip() {
    const ul = $('mp2614Strip'); if (!ul) return;
    timSaja().forEach(ch => { let li = ul.querySelector('[data-id="' + ch.r.id + '"]');
      if (!li) { li = document.createElement('li'); li.dataset.id = ch.r.id; li.tabIndex = 0; li.setAttribute('role', 'button'); li.innerHTML = '<b></b><span></span><small></small>'; li.onclick = () => window.mp2614Pilih(ch.r.id); li.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); window.mp2614Pilih(ch.r.id); } }; ul.appendChild(li); }
      const s = ch.status || 'meja', v = [ch.r.ik + ' ' + ch.r.nama + ' · ' + ch.r.peran, STATUS[s] || s, ch.teks || ''];
      li.className = 'st-' + s + (KT.pilih === ch.r.id ? ' aktif' : '');
      [...li.children].forEach((e, k) => { if (e.textContent !== v[k]) e.textContent = v[k]; }); });
    const a = A(), h = $('mp2614Sub'); if (h && a) h.textContent = a.jalan ? 'Putaran #' + a.putaran + ' sedang berjalan · ' + a.langkah : a.pada ? 'Putaran #' + a.putaran + ' selesai ' + new Date(a.pada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' · ' + a.temuan.length + ' temuan' : 'Menunggu data proyek…';
  }
  function kartu() {
    const w = $('mp2614Info'); if (!w) return; const ch = KT.ch.find(x => x.r.id === KT.pilih);
    if (!ch) { w.hidden = true; w.innerHTML = ''; return; }
    const T = temuanDari(ch.r.id);
    w.hidden = false;
    w.innerHTML = `<div class="h"><b>${E(ch.r.ik + ' ' + ch.r.nama)}</b><small>${E(STATUS[ch.status] || '')} · ${E(ch.r.peran)} · ${E(ch.teks || '')}</small><button type="button" class="btn-close" aria-label="Tutup kartu" onclick="mp2614Pilih('')"></button></div>
      ${T.length ? T.slice(0, 4).map(x => `<div class="t ${E(x.level.toLowerCase())}"><span>${E(x.judul)}<small>${E(pendek(x.ket, 90))}</small></span>${x.buka ? `<button type="button" class="btn btn-sm btn-outline-primary" onclick="mp2614Tutup(); ${E(x.buka)}">Buka</button>` : ''}</div>`).join('') + (T.length > 4 ? `<div class="lagi">+${T.length - 4} lainnya</div>` : '')
        : `<p class="kosong">${ch.r.santai ? 'Santai memantau tim — tidak memegang langkah kerja Agen AI.' : 'Tidak ada temuan di bagian ini.'}</p>`}
      <button type="button" class="btn btn-sm btn-light border" onclick="mp2614Tutup(); mp2613Buka('temuan')">Semua temuan di Meja Kerja</button>`;
  }
  window.mp2614Pilih = id => { KT.pilih = KT.pilih === id ? '' : id; kartu(); strip(); };
  function ukur() {
    const cv = $('mp2614Cv'), wr = $('mp2614Wrap'); if (!cv || !wr) return;
    const sl = $('mp2614Slot'), bawah = sl && sl.offsetHeight && window.innerWidth < 1000 ? sl.offsetHeight : 0;
    const lebar = wr.clientWidth || LW, tinggiMaks = Math.max(300, window.innerHeight - 250 - bawah);
    const pas = Math.max(Math.min(lebar / LW, tinggiMaks / LH), lebar < 600 ? 0.55 : 0.3);
    KT.s = pas * KT.zoom; KT.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = Math.round(LW * KT.s) + 'px'; cv.style.height = Math.round(LH * KT.s) + 'px';
    cv.width = Math.round(LW * KT.s * KT.dpr); cv.height = Math.round(LH * KT.s * KT.dpr); KT.bgKunci = '';
    wr.style.overflow = KT.zoom > 1 ? 'auto' : ''; wr.style.maxHeight = KT.zoom > 1 ? tinggiMaks + 'px' : '';
    const z = $('mp2614Zoom'); if (z) z.textContent = Math.round(KT.zoom * 100) + '%';
  }
  window.mp2614Zoom = f => { const wr = $('mp2614Wrap'), cx = wr ? (wr.scrollLeft + wr.clientWidth / 2) / (LW * KT.s) : 0.5, cy = wr ? (wr.scrollTop + wr.clientHeight / 2) / (LH * KT.s) : 0.5; KT.zoom = f === 0 ? 1 : Math.max(1, Math.min(3, KT.zoom * f)); ukur(); if (wr) { wr.scrollLeft = cx * LW * KT.s - wr.clientWidth / 2; wr.scrollTop = cy * LH * KT.s - wr.clientHeight / 2; } };
  function langkah() {
    if (!KT.buka) return;
    const now = performance.now(), dt = Math.min(0.08, Math.max(0, (now - (KT.last || now)) / 1000));
    KT.frame++;
    if (KT.frame % 2 === 0 || hemat()) {   // ±30 fps
      KT.last = now; KT.t = now / 1000;
      KT.ch.forEach(ch => { perilaku(ch, now); gerak(ch, hemat() ? 1 : dt, now); });
      gambar(KT.t);
      if (now - KT.strip > 500) { KT.strip = now; strip(); if (KT.pilih) kartu(); }
    }
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
        <header><div><b id="mp2614Jdl"><span class="live"><i></i>LIVE</span>Kantor Tim Proyek Perkuatan Dermaga Barat JICT</b><small id="mp2614Sub">Menunggu data proyek…</small></div>
          <span class="nol" title="Seluruh animasi & teks dari pemeriksaan lokal — tidak memanggil AI">0 token</span>
          <span class="mp2614-zoom"><button type="button" onclick="mp2614Zoom(1/1.4)" aria-label="Perkecil">−</button><span id="mp2614Zoom">100%</span><button type="button" onclick="mp2614Zoom(1.4)" aria-label="Perbesar">+</button><button type="button" onclick="mp2614Zoom(0)">Pas</button></span>
          <button type="button" class="btn btn-sm btn-success" onclick="mp2613Kerja()"><i class="fas fa-play me-1"></i>Kerjakan sekarang</button>
          <button type="button" class="btn btn-sm btn-light" onclick="mp2614Tutup(); mp2613Buka()"><i class="fas fa-table-list me-1"></i>Meja Kerja</button>
          <button type="button" class="btn-close btn-close-white" aria-label="Tutup" onclick="mp2614Tutup()"></button></header>
        <div class="mp2614-wrap" id="mp2614Wrap"><canvas id="mp2614Cv" role="img" aria-label="Animasi kantor proyek sesuai denah: tim bekerja di meja masing-masing. Status tiap orang tercantum di daftar di bawah."></canvas><div class="mp2614-info" id="mp2614Info" hidden></div></div>
        <ul class="mp2614-strip" id="mp2614Strip" aria-label="Status tim"></ul><div id="mp2614Slot"></div></section>`;
      w.addEventListener('click', ev => { if (ev.target === w) window.mp2614Tutup(); });
      document.body.appendChild(w);
      const cv = $('mp2614Cv'); let seret = null;
      cv.addEventListener('mousedown', ev => { if (KT.zoom > 1) seret = { x: ev.clientX, y: ev.clientY, sl: $('mp2614Wrap').scrollLeft, st: $('mp2614Wrap').scrollTop, gerak: false }; });
      window.addEventListener('mousemove', ev => { if (!seret) return; const wr = $('mp2614Wrap'); if (!wr) return; const dx = ev.clientX - seret.x, dy = ev.clientY - seret.y; if (Math.abs(dx) + Math.abs(dy) > 4) seret.gerak = true; wr.scrollLeft = seret.sl - dx; wr.scrollTop = seret.st - dy; });
      window.addEventListener('mouseup', () => { setTimeout(() => { seret = null; }, 0); });
      cv.addEventListener('click', ev => {
        if (seret && seret.gerak) return;
        const b = ev.currentTarget.getBoundingClientRect(), x = (ev.clientX - b.left) / KT.s, y = (ev.clientY - b.top) / KT.s;
        const ch = timSaja().slice().reverse().find(h => h.kotak && x >= h.kotak[0] && x <= h.kotak[0] + h.kotak[2] && y >= h.kotak[1] && y <= h.kotak[1] + h.kotak[3]);
        window.mp2614Pilih(ch ? ch.r.id : '');
      });
      cv.addEventListener('wheel', ev => { if (!ev.ctrlKey) return; ev.preventDefault(); window.mp2614Zoom(ev.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
      window.addEventListener('resize', ukur);
    }
    KT.buka = true; KT.last = 0; ukur(); strip(); langkah();
    const b = w.querySelector('.btn-close'); if (b) b.focus();
    if (!a.pada && !a.jalan) window.mp2613Kerja();
  };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && $('mp2614Lapis')) { if (KT.pilih) window.mp2614Pilih(''); else window.mp2614Tutup(); } });

  /* ======================= 11. PINTU MASUK: menu akun ======================= */
  function pasang() {
    const dd = document.querySelector('.app-header .menu-akun .dropdown-menu') || document.querySelector('.menu-akun .dropdown-menu');
    if (dd && sesi() && !$('mp2614Menu')) { const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp2614Menu" onclick="mp2614Kantor();return false;"><i class="fas fa-building me-2"></i>Kantor Agen (Live)</a>'; dd.insertBefore(li, dd.firstChild); }
  }
  let _tm = 0; const jadwal = () => { clearTimeout(_tm); _tm = setTimeout(() => { try { pasang(); } catch (e) { } }, 300); };
  const awasi = () => { if (!document.body) return; pasang(); new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('#mp2614Lapis,#mp2613Pn,#mp2613Dock')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();


