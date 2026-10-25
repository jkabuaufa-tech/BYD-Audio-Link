/* MP2613 — PEMBARUAN 2.6.13 / 2.6.15: AGEN AI PROYEK — bekerja nyata & hemat token (aditif; tanpa perubahan server & data)
 *  Agen yang terlihat bekerja di aplikasi: kartu dock di pojok kiri bawah (avatar, status, langkah yang sedang dikerjakan) dan panel
 *  "Meja Kerja Agen" (Aktivitas langsung · Temuan prioritas · Briefing). Setiap putaran kerja memeriksa data yang SUDAH ada di aplikasi:
 *  masa kontrak & notifikasi berjenjang (2.6.2), nilai/tagihan kontrak (Periksa kontrak 2.6.10), draf Rp 0, tagihan belum diproses bayar,
 *  dokumen vendor, bon gudang belum lengkap → temuan diurutkan Kritis/Warning/Info dengan tombol Buka ke form aslinya.
 *  HEMAT TOKEN: seluruh pemeriksaan dihitung di perangkat (0 token). AI hanya dipanggil bila pengguna menekan "Ringkas dengan AI":
 *  satu panggilan aiTanya tanpa konteks & tanpa mode agen, berisi intisari ≤ 1.400 karakter (angka agregat + 8 temuan teratas),
 *  jawaban dibatasi ±120 kata, dan disimpan per sidik data — data sama = tanpa panggilan ulang. Putaran tanpa perubahan data dilewati.
 *  Agen tidak mengubah data apa pun; Buka hanya membuka form yang sama dengan lonceng / Periksa kontrak.
 *  Akses: dock di pojok kiri bawah · menu akun › Agen AI · Ctrl+Shift+A. */
(function () {
  'use strict';
  if (window.__MP2613__) return; window.__MP2613__ = true;
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const $ = id => document.getElementById(id);
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const proyek = () => (typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || '';
  const rpS = n => { n = N(n); return n >= 1e9 ? 'Rp ' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : 'Rp ' + Math.round(n).toLocaleString('id-ID'); };
  const jam = d => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const kunci = s => 'mp2613_' + s + '_' + proyek() + '_' + ((sesi() || {}).nama || '');
  const hemat = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tidur = ms => new Promise(r => setTimeout(r, hemat() ? 0 : ms));
  const sidik = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const TK = { KRITIS: ['Kritis', 'kritis', 0], WARNING: ['Warning', 'warning', 1], INFO: ['Info', 'info', 2] };
  const A = { status: 'siaga', langkah: '', aktif: '', hasilL: {}, lambat: false, log: [], temuan: [], ring: null, sig: '', pada: 0, tab: 'aktivitas', saring: '', jalan: false, ai: lsGet('mp2613_ai', null), aiSibuk: false, putaran: 0, tokenHemat: 0 };
  window.MP2613_AGEN = A;

  /* ======================= 1. AVATAR (SVG ringan, tanpa berkas) ======================= */
  const avatar = (uk) => `<svg class="mp2613-av" viewBox="0 0 64 64" width="${uk}" height="${uk}" aria-hidden="true">
    <circle cx="32" cy="32" r="31" fill="#0B1F3A"/><path d="M14 30a18 18 0 0 1 36 0v2H14z" fill="#F5C518"/><rect x="11" y="30" width="42" height="5" rx="2.5" fill="#C99A00"/>
    <rect x="29" y="12" width="6" height="12" rx="3" fill="#C99A00"/><rect x="17" y="36" width="30" height="16" rx="8" fill="#E8EEF7"/>
    <g class="mp2613-mata"><circle cx="25.5" cy="44" r="3" fill="#0B1F3A"/><circle cx="38.5" cy="44" r="3" fill="#0B1F3A"/></g>
    <path class="mp2613-mulut" d="M28 49.5q4 2.5 8 0" fill="none" stroke="#0B1F3A" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  /* ======================= 2. LANGKAH KERJA (semua dihitung lokal, 0 token) ======================= */
  const reg = () => ((typeof REG !== 'undefined' && REG.data) || []);
  const prog = () => ((typeof PROG !== 'undefined' && PROG.data) || []).filter(e => e && !e.batal);
  const kontrak = () => { try { return typeof window.semuaKontrak214 === 'function' ? window.semuaKontrak214() : []; } catch (e) { return []; } };
  const tambah = (L, x) => { x.kunci = x.kunci || (x.sumber + '|' + x.judul + '|' + x.ket).slice(0, 220); if (!L.some(y => y.kunci === x.kunci)) L.push(x); };
  const LANGKAH = [
    { id: 'sinkron', judul: 'Membaca data proyek', kerja: (L, R) => { R.kontrak = kontrak().length; R.reg = reg().length; R.bk = prog().length;
      return R.kontrak + ' kontrak · ' + R.reg + ' register · ' + R.bk + ' BK tersinkron'; } },
    { id: 'masa', judul: 'Memeriksa masa berlaku kontrak & dokumen vendor', kerja: (L, R) => {
      try { if (typeof window.mp258Hitung === 'function') window.mp258Hitung(); } catch (e) { }
      const NT = (window.MP258_NT && window.MP258_NT.L) || []; let k = 0, d = 0;
      NT.forEach(x => { if (x.tangani || (x.g !== 'kontrak' && x.g !== 'dokumen')) return; x.g === 'kontrak' ? k++ : d++;
        tambah(L, { level: x.level, sumber: x.g === 'kontrak' ? 'Kontrak' : 'Dokumen vendor', judul: x.judul, ket: (x.tahap ? x.tahap + ' · ' : '') + (x.ket || ''), nilai: x.nilai || '', buka: x.buka || '' }); });
      R.masa = k; R.dokVendor = d; return k || d ? k + ' kontrak jatuh tempo/H-30 · ' + d + ' dokumen vendor perlu diperbarui' : 'semua kontrak & dokumen vendor masih berlaku'; } },
    { id: 'nilai', judul: 'Mencocokkan nilai kontrak, item & tagihan (BK)', kerja: (L, R) => {
      if (typeof window.mp2610Periksa !== 'function') return 'dilewati — Periksa kontrak (2.6.10) belum termuat';
      const T = (window.mp2610Periksa() || {}).T || [], lv = { galat: 'KRITIS', peringatan: 'WARNING', info: 'INFO' };
      T.forEach(x => tambah(L, { level: lv[x.tingkat] || 'INFO', sumber: 'Nilai & tagihan', judul: (x.key || '-') + (x.vendor ? ' · ' + x.vendor : ''), ket: x.pesan || x.kode, nilai: x.tagihan ? 'tagihan ' + rpS(x.tagihan) : '', buka: x.buka || '' }));
      R.nilai = T.length; R.galat = T.filter(x => x.tingkat === 'galat').length;
      return T.length ? T.length + ' kejanggalan (' + R.galat + ' galat) ditemukan' : 'nilai, item & tagihan konsisten'; } },
    { id: 'draf', judul: 'Menelusuri draf kontrak Rp 0', kerja: (L, R) => {
      const D = reg().filter(r => !r.diposting && N(r.nilai) <= 0), js = v => JSON.stringify(String(v));
      D.forEach(r => { const u = Math.floor((Date.now() - Date.parse(r.dibuatPada || r.diubahPada || '')) / 864e5);
        tambah(L, { level: u > 30 ? 'KRITIS' : 'WARNING', sumber: 'Draf kontrak', judul: (r.noKontrak || '-') + ' · ' + (r.namaVendor || '-'), ket: 'Item kontrak belum bernilai' + (isFinite(u) ? ' · mandek ' + u + ' hari' : ''), nilai: 'Rp 0', buka: 'bukaEditReg(' + js(r.id) + ')' }); });
      R.draf = D.length; return D.length ? D.length + ' draf belum bisa diposting' : 'tidak ada draf mandek'; } },
    { id: 'bayar', judul: 'Merekap tagihan yang belum diproses bayar', kerja: (L, R) => {
      const B = prog().filter(e => !e.bayar || !e.bayar.status || e.bayar.status === 'BELUM'), n = B.reduce((a, e) => a + N(e.nilai), 0);
      const lama = B.filter(e => Date.now() - Date.parse(e.tanggal || e.tglBA || e.dibuatPada || '') > 30 * 864e5);
      if (lama.length) tambah(L, { level: 'WARNING', sumber: 'Keuangan', judul: lama.length + ' tagihan menunggu bayar > 30 hari', ket: lama.slice(0, 3).map(e => e.noKontrak || e.nomorBA || '-').join(', ') + (lama.length > 3 ? ', …' : ''),
        nilai: rpS(lama.reduce((a, e) => a + N(e.nilai), 0)), buka: "if(window.MP219_KEU){MP219_KEU.tab='daftar';MP219_KEU.status=''}bukaTab('keuangan')" });
      R.bayar = B.length; R.nilaiBayar = n; return B.length ? B.length + ' tagihan · ' + rpS(n) + ' berstatus BELUM' + (lama.length ? ' (' + lama.length + ' > 30 hari)' : '') : 'tidak ada tagihan tertahan'; } },
    { id: 'gudang', judul: 'Mengecek bon gudang yang belum lengkap', kerja: (L, R) => {
      const G = window.mp227Gd; if (!G || !G.GD || !G.GD.siap || typeof G.itemBon !== 'function') return 'dilewati — data gudang belum dibuka di perangkat ini';
      const m = new Map(); G.itemBon().forEach(z => { if (z.sisa > 1e-9 && z.b) m.set(z.b.nomor, z.b); });
      const tua = [...m.values()].filter(b => Date.now() - Date.parse(b.tanggal || '') > 14 * 864e5);
      if (tua.length) tambah(L, { level: 'WARNING', sumber: 'Gudang', judul: tua.length + ' bon belum diterima lengkap > 14 hari', ket: tua.slice(0, 3).map(b => b.nomor).join(', ') + (tua.length > 3 ? ', …' : ''), nilai: '', buka: "bukaTab('gudang')" });
      R.bon = m.size; return m.size ? m.size + ' bon terbuka (' + tua.length + ' > 14 hari)' : 'semua bon sudah diterima'; } },
    { id: 'wbs', judul: 'Memeriksa WBS bon permintaan', kerja: (L, R) => {   // [2.6.15] tugas Adkon: setiap item bon bervolume harus ber-WBS (item atau bon)
      const B = ((typeof PMT !== 'undefined' && PMT.data) || []).filter(b => b && !b.batal), js = v => JSON.stringify(String(v));
      if (!B.length) return 'dilewati — belum ada bon permintaan termuat';
      const K = B.map(b => ({ b, n: (b.items || []).filter(it => N(it.vol) > 0 && !String(it.wbs || b.wbs || '').trim()).length })).filter(x => x.n);
      K.forEach(x => { const u = Math.floor((Date.now() - Date.parse(x.b.tanggal || '')) / 864e5);
        tambah(L, { level: u > 7 ? 'WARNING' : 'INFO', sumber: 'WBS bon', judul: (x.b.nomor || '-') + (x.b.departemen ? ' · ' + x.b.departemen : ''), ket: x.n + ' item belum ber-WBS' + (isFinite(u) ? ' · bon ' + u + ' hari' : ''), nilai: '', buka: "bukaTab('form-bon')" }); });
      R.wbs = K.length; return K.length ? K.length + ' bon (' + K.reduce((a, x) => a + x.n, 0) + ' item) belum ber-WBS' : B.length + ' bon sudah lengkap WBS'; } },
    { id: 'prosedur', judul: 'Mereviu kepatuhan prosedur pengadaan', kerja: (L, R) => {   // [2.6.17] BOSS Pengadaan: temuan Kritis = penyimpangan alur bon → PBJ → kontrak → tagihan
      const K = L.filter(x => x.level === 'KRITIS'), g = {}; K.forEach(x => { g[x.sumber] = (g[x.sumber] || 0) + 1; });
      R.prosedur = K.length; return K.length ? K.length + ' penyimpangan prosedur perlu tindak lanjut (' + Object.keys(g).map(k => k + ' ' + g[k]).join(', ') + ')' : 'alur pengadaan sesuai prosedur'; } },
    { id: 'susun', judul: 'Menyusun prioritas & briefing', kerja: (L, R) => { L.sort((a, b) => TK[a.level][2] - TK[b.level][2] || String(a.sumber).localeCompare(String(b.sumber)));
      const n = k => L.filter(x => x.level === k).length; R.n = { KRITIS: n('KRITIS'), WARNING: n('WARNING'), INFO: n('INFO') };
      return R.n.KRITIS + ' kritis · ' + R.n.WARNING + ' warning · ' + R.n.INFO + ' info'; } }
  ];

  function catat(teks, jenis) { A.log.unshift({ t: Date.now(), teks, jenis: jenis || '' }); if (A.log.length > 60) A.log.length = 60; gambarLog(); }
  const sigData = () => sidik(JSON.stringify([proyek(), reg().map(r => [r.id, r.nilai, r.diposting, r.diubahPada]), prog().map(e => [e.id, e.nilai, e.bayar && e.bayar.status]),
    kontrak().length, ((window.MP258_NT && window.MP258_NT.L) || []).length, !!(window.mp227Gd && window.mp227Gd.GD && window.mp227Gd.GD.siap), new Date().toDateString()]));

  async function kerja(paksa) {
    if (A.jalan || !sesi()) return;
    const sig = sigData();
    if (!paksa && sig === A.sig) { A.tokenHemat++; return; }   // data sama → tidak bekerja ulang
    A.jalan = true; A.status = 'bekerja'; A.putaran++; A.hasilL = {}; const L = [], R = {}, lama = new Set(lsGet(kunci('kunci'), []));
    catat('Memulai putaran kerja #' + A.putaran + (paksa ? ' (diminta)' : ' (data berubah)'), 'mulai');
    for (const s of LANGKAH) {
      A.aktif = s.id; A.langkah = s.judul + '…'; gambarDock(); gambarStatus();
      await tidur((380 + Math.random() * 420) * (A.lambat ? 2.6 : 1));   // A.lambat: Kantor Live terbuka → langkah terlihat
      let h; try { h = s.kerja(L, R); } catch (e) { h = 'gagal: ' + e.message; console.warn('[2.6.13] langkah ' + s.id, e); }
      A.hasilL[s.id] = h;
      catat(s.judul + ' — ' + h, /^gagal/.test(h) ? 'gagal' : /^dilewati/.test(h) ? 'lewat' : 'ok');
    }
    L.forEach(x => { x.baru = lama.size > 0 && !lama.has(x.kunci); });
    const nBaru = L.filter(x => x.baru).length, selesai = [...lama].filter(k => !L.some(x => x.kunci === k)).length;
    lsSet(kunci('kunci'), L.map(x => x.kunci));
    A.temuan = L; A.ring = R; A.sig = sigData(); A.pada = Date.now(); A.jalan = false; A.aktif = ''; A.status = R.n && R.n.KRITIS ? 'waspada' : 'siaga'; A.langkah = '';
    catat('Selesai: ' + L.length + ' temuan' + (nBaru ? ' · ' + nBaru + ' baru' : '') + (selesai ? ' · ' + selesai + ' sudah beres sejak putaran lalu' : '') + ' · 0 token AI dipakai', 'selesai');
    gambarDock(); gambar();
  }
  window.mp2613Kerja = () => kerja(true);   // promise: selesai setelah putaran kerja

  /* ======================= 3. BRIEFING: lokal (0 token) + ringkasan AI opsional (1 panggilan, dipadatkan, di-cache) ======================= */
  function intisari() {   // ≤ 1.400 karakter — hanya angka agregat & 8 temuan teratas, tanpa data mentah
    const R = A.ring || {}, n = R.n || {};
    const top = A.temuan.slice(0, 8).map((x, i) => (i + 1) + '. [' + TK[x.level][0] + '] ' + x.sumber + ': ' + x.judul + ' — ' + String(x.ket).slice(0, 90)).join('\n');
    return ('Proyek ' + proyek() + '. ' + (R.kontrak || 0) + ' kontrak, ' + (R.bk || 0) + ' BK. Temuan: ' + (n.KRITIS || 0) + ' kritis, ' + (n.WARNING || 0) + ' warning, ' + (n.INFO || 0) + ' info. ' +
      'Tagihan BELUM bayar ' + (R.bayar || 0) + ' (' + rpS(R.nilaiBayar) + '). Draf Rp 0: ' + (R.draf || 0) + '.\n' + top).slice(0, 1400);
  }
  function briefLokal() {
    const R = A.ring || {}, n = R.n || {}, k = A.temuan.filter(x => x.level === 'KRITIS');
    const L = [];
    L.push(n.KRITIS ? `Ada <b>${n.KRITIS} hal kritis</b> yang perlu ditangani hari ini.` : 'Tidak ada hal kritis — kondisi proyek terkendali.');
    if (k.length) L.push('Mulai dari: ' + k.slice(0, 3).map(x => '<b>' + E(x.judul) + '</b> (' + E(x.sumber) + ')').join(', ') + '.');
    if (R.bayar) L.push(`${R.bayar} tagihan senilai <b>${E(rpS(R.nilaiBayar))}</b> masih berstatus BELUM — koordinasikan dengan Keuangan.`);
    if (R.draf) L.push(`${R.draf} draf kontrak Rp 0 belum dapat diposting; lengkapi item volume × harga.`);
    if (n.WARNING) L.push(`${n.WARNING} warning sebaiknya dijadwalkan minggu ini.`);
    return L.map(t => '<li>' + t + '</li>').join('');
  }
  window.mp2613RingkasAI = async () => {
    if (A.aiSibuk || !A.ring) return;
    const isi = intisari(), sg = sidik(isi);
    if (A.ai && A.ai.sg === sg) { catat('Ringkasan AI dipakai ulang dari cache — data tidak berubah, 0 token', 'ok'); A.tab = 'brief'; gambar(); return; }
    if (typeof regAksi !== 'function') { catat('Ringkasan AI tidak tersedia (tidak terhubung ke server)', 'gagal'); return; }
    A.aiSibuk = true; A.tab = 'brief'; gambar(); catat('Mengirim intisari ' + isi.length + ' karakter (±' + Math.ceil(isi.length / 4) + ' token) ke AI…', 'mulai');
    try {
      const r = await regAksi('aiTanya', { data: { agen: false, konteks: '', pesan: [{ role: 'user', teks:
        'Anda manajer pengendalian proyek konstruksi. Dari intisari berikut, tulis briefing harian maksimal 120 kata dalam bahasa Indonesia: ' +
        '1 kalimat kondisi, lalu 3 tindakan prioritas bernomor (siapa/fungsi & tenggat). Tanpa pembuka, tanpa mengulang data.\n\n' + isi }] } });
      const p = r.pakai || {};
      A.ai = { sg, teks: String(r.teks || '').slice(0, 2000), pada: Date.now(), model: r.model || r.provider || '', token: N(p.masuk) + N(p.keluar) };
      lsSet('mp2613_ai', A.ai);
      catat('Ringkasan AI diterima · ' + (A.ai.token ? A.ai.token + ' token' : 'token tidak dilaporkan') + (r.sisa != null ? ' · sisa kuota ' + r.sisa : ''), 'selesai');
    } catch (err) { catat('Ringkasan AI gagal: ' + err.message + ' — briefing lokal tetap tersedia', 'gagal'); }
    finally { A.aiSibuk = false; gambar(); }
  };
  const md = t => E(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*(\d+)[.)]\s+/gm, '<br><b>$1.</b> ').replace(/\n/g, ' ');

  /* ======================= 4. TAMPILAN: dock + panel ======================= */
  const LABEL = { bekerja: 'Bekerja', siaga: 'Siaga', waspada: 'Perlu perhatian' };
  function gambarDock() {
    if (!sesi() || lsGet('mp2613_sembunyi', false)) { const d = $('mp2613Dock'); if (d) d.remove(); return; }
    let d = $('mp2613Dock');
    if (!d) { d = document.createElement('button'); d.type = 'button'; d.id = 'mp2613Dock'; d.onclick = () => (window.mp2614Kantor || window.mp2613Buka)(); document.body.appendChild(d); }
    const n = (A.ring && A.ring.n) || {}, baru = A.temuan.filter(x => x.baru && x.level !== 'INFO').length;
    d.className = 'mp2613-dock ' + A.status;
    d.setAttribute('aria-label', 'Agen AI — ' + LABEL[A.status] + (n.KRITIS ? ', ' + n.KRITIS + ' kritis' : ''));
    d.innerHTML = `<span class="mp2613-avw">${avatar(34)}<i class="mp2613-dot"></i></span><span class="mp2613-dt"><b>Agen AI · ${E(LABEL[A.status])}</b>
      <small>${E(A.jalan ? A.langkah : A.pada ? (n.KRITIS ? n.KRITIS + ' kritis · ' : '') + A.temuan.length + ' temuan · ' + jam(A.pada).slice(0, 5) : 'menunggu data…')}</small></span>${baru ? `<em class="mp2613-bdg">${baru}</em>` : ''}`;
  }
  function gambarStatus() { const s = $('mp2613St'); if (s) s.innerHTML = statusHtml(); }
  const statusHtml = () => `<span class="mp2613-pill ${A.status}"><i class="mp2613-dot"></i>${E(LABEL[A.status])}</span>
    <span class="mp2613-now">${A.jalan ? '<span class="mp2613-ketik"><i></i><i></i><i></i></span>' + E(A.langkah) : A.pada ? 'Terakhir bekerja ' + jam(A.pada) : 'Belum bekerja'}</span>`;
  function gambarLog() {
    const w = $('mp2613Log'); if (!w) return;
    const ik = { mulai: 'fa-play', ok: 'fa-check', lewat: 'fa-forward', gagal: 'fa-xmark', selesai: 'fa-flag-checkered' };
    w.innerHTML = A.log.length ? A.log.map(l => `<li class="${l.jenis}"><i class="fas ${ik[l.jenis] || 'fa-circle'}"></i><time>${jam(l.t)}</time><span>${E(l.teks)}</span></li>`).join('') : '<li class="lewat"><span>Belum ada aktivitas.</span></li>';
  }
  function gambar() {
    const w = $('mp2613Pn'); if (!w) return;
    const R = A.ring || {}, n = R.n || { KRITIS: 0, WARNING: 0, INFO: 0 }, T = A.temuan.filter(x => !A.saring || x.level === A.saring);
    const tab = (k, l, c) => `<button type="button" role="tab" aria-selected="${A.tab === k}" class="${A.tab === k ? 'aktif' : ''}" onclick="mp2613Tab('${k}')">${l}${c != null ? ' <span>' + c + '</span>' : ''}</button>`;
    const chip = (k, l) => `<button type="button" class="mp2613-chip ${k ? TK[k][1] : ''} ${A.saring === k ? 'aktif' : ''}" onclick="mp2613Saring('${k}')">${l} <b>${k ? n[k] : A.temuan.length}</b></button>`;
    w.querySelector('.mp2613-isi').innerHTML = `
      <div class="mp2613-kpi">${[['Kritis', n.KRITIS, 'kritis'], ['Warning', n.WARNING, 'warning'], ['Kontrak', R.kontrak || 0, ''], ['BK belum bayar', R.bayar || 0, '']].map(k => `<div class="${k[2]}"><b>${k[1]}</b><small>${k[0]}</small></div>`).join('')}</div>
      <div class="mp2613-tabs" role="tablist">${tab('aktivitas', 'Aktivitas')}${tab('temuan', 'Temuan', A.temuan.length)}${tab('brief', 'Briefing')}</div>
      <div class="mp2613-tb" ${A.tab === 'aktivitas' ? '' : 'hidden'}><ol class="mp2613-log" id="mp2613Log" aria-live="polite"></ol></div>
      <div class="mp2613-tb" ${A.tab === 'temuan' ? '' : 'hidden'}>
        <div class="mp2613-chips">${chip('', 'Semua')}${chip('KRITIS', 'Kritis')}${chip('WARNING', 'Warning')}${chip('INFO', 'Info')}</div>
        ${T.length ? T.slice(0, 80).map(x => `<div class="mp2613-t ${TK[x.level][1]}"><div><span class="mp2613-lv">${TK[x.level][0]}</span><small>${E(x.sumber)}</small>${x.baru ? '<em>BARU</em>' : ''}
          <b>${E(x.judul)}</b><p>${E(x.ket)}${x.nilai ? ' · ' + E(x.nilai) : ''}</p></div>${x.buka ? `<button type="button" class="btn btn-sm btn-outline-primary" onclick="mp2613Tutup(); ${E(x.buka)}">Buka</button>` : ''}</div>`).join('')
          + (T.length > 80 ? `<p class="mp2613-mute">+${T.length - 80} temuan lain — lihat Periksa kontrak / lonceng notifikasi.</p>` : '')
          : `<p class="mp2613-mute"><i class="fas fa-circle-check me-1"></i>${A.pada ? 'Tidak ada temuan pada tingkat ini.' : 'Agen belum bekerja — tekan Kerjakan sekarang.'}</p>`}</div>
      <div class="mp2613-tb" ${A.tab === 'brief' ? '' : 'hidden'}>
        <h6><i class="fas fa-clipboard-list me-1"></i>Briefing lokal <small>0 token</small></h6><ul class="mp2613-br">${A.ring ? briefLokal() : '<li>Belum ada data.</li>'}</ul>
        <h6><i class="fas fa-wand-magic-sparkles me-1"></i>Ringkasan AI <small>${A.ai ? E((A.ai.model ? A.ai.model + ' · ' : '') + (A.ai.token ? A.ai.token + ' token · ' : '') + jam(A.ai.pada).slice(0, 5)) : 'opsional · ±' + Math.ceil(intisari().length / 4 + 250) + ' token'}</small></h6>
        ${A.aiSibuk ? '<p class="mp2613-mute"><span class="mp2613-ketik"><i></i><i></i><i></i></span>AI sedang menyusun briefing…</p>' : A.ai ? `<div class="mp2613-ai">${md(A.ai.teks)}</div>${A.ai.sg !== sidik(intisari()) ? '<p class="mp2613-mute">Data sudah berubah sejak ringkasan ini.</p>' : ''}` : '<p class="mp2613-mute">AI hanya dipanggil bila Anda meminta — data yang dikirim berupa intisari angka, bukan dokumen.</p>'}
        <button type="button" class="btn btn-sm btn-primary" onclick="mp2613RingkasAI()" ${A.aiSibuk || !A.ring ? 'disabled' : ''}><i class="fas fa-wand-magic-sparkles me-1"></i>${A.ai && A.ai.sg === sidik(intisari()) ? 'Tampilkan (cache)' : 'Ringkas dengan AI'}</button>
        ${typeof window.mp227AiBuka === 'function' ? '<button type="button" class="btn btn-sm btn-light border" onclick="mp2613Tutup(); mp227AiBuka()"><i class="fas fa-comments me-1"></i>Tanya Asisten</button>' : ''}
        ${typeof window.mp250Buka === 'function' ? '<button type="button" class="btn btn-sm btn-light border" onclick="mp2613Tutup(); mp250Buka()"><i class="fas fa-people-group me-1"></i>Kantor AI</button>' : ''}</div>`;
    gambarLog(); gambarStatus();
    const f = w.querySelector('.mp2613-hemat'); if (f) f.textContent = 'Putaran ' + A.putaran + ' · ' + A.tokenHemat + ' pemeriksaan ulang dilewati (data sama) · analisis lokal 0 token';
  }
  window.mp2613Tab = t => { A.tab = t; gambar(); };
  window.mp2613Saring = k => { A.saring = k; A.tab = 'temuan'; gambar(); };
  window.mp2613Tutup = () => { const w = $('mp2613Pn'); if (w) w.remove(); const d = $('mp2613Dock'); if (d) d.focus(); };
  window.mp2613Buka = tab => {
    if (!sesi()) return;
    if (tab) A.tab = tab;
    let w = $('mp2613Pn');
    if (!w) {
      w = document.createElement('div'); w.id = 'mp2613Pn'; w.className = 'mp2613-lapis';
      w.innerHTML = `<section class="mp2613-pn" role="dialog" aria-modal="true" aria-labelledby="mp2613Jdl"><header>${avatar(44)}<div><b id="mp2613Jdl">Meja Kerja Agen AI</b><div id="mp2613St" class="mp2613-st"></div></div>
        <button type="button" class="btn-close" aria-label="Tutup" onclick="mp2613Tutup()"></button></header><div class="mp2613-isi"></div>
        <footer><small class="mp2613-hemat"></small>${typeof window.mp2614Kantor === 'function' ? '<button type="button" class="btn btn-sm btn-light border" onclick="mp2613Tutup(); mp2614Kantor()"><i class="fas fa-building me-1"></i>Kantor Live</button>' : ''}<button type="button" class="btn btn-sm btn-success" onclick="mp2613Kerja()"><i class="fas fa-play me-1"></i>Kerjakan sekarang</button></footer></section>`;
      w.addEventListener('click', ev => { if (ev.target === w) window.mp2613Tutup(); });
      document.body.appendChild(w);
    }
    gambar(); const b = w.querySelector('.btn-close'); if (b) b.focus();
    if (!A.pada) kerja(true);
  };
  window.mp2613Dock = tampil => { lsSet('mp2613_sembunyi', !tampil); gambarDock(); pasang(); if (typeof notif === 'function') notif(tampil ? 'Agen AI ditampilkan.' : 'Agen AI disembunyikan. Tampilkan lagi dari menu akun.', 'ok'); };

  /* ======================= 5. PEMASANGAN: menu akun, pintasan, jadwal kerja ======================= */
  function pasang() {
    const dd = document.querySelector('.app-header .menu-akun .dropdown-menu') || document.querySelector('.menu-akun .dropdown-menu');
    if (dd && sesi() && !$('mp2613Menu')) { const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp2613Menu" onclick="mp2613Buka();return false;"><i class="fas fa-robot me-2"></i>Agen AI</a>'; dd.insertBefore(li, dd.firstChild); }
    const s = lsGet('mp2613_sembunyi', false), t = $('mp2613MenuDock');
    if (dd && sesi() && !t) { const li = document.createElement('li'); li.innerHTML = `<a class="dropdown-item" href="#" id="mp2613MenuDock" onclick="mp2613Dock(${s});return false;"><i class="fas fa-eye${s ? '' : '-slash'} me-2"></i>${s ? 'Tampilkan' : 'Sembunyikan'} dock Agen AI</a>`; const m = $('mp2613Menu'); dd.insertBefore(li, m ? m.parentNode.nextSibling : dd.firstChild); }
    else if (t) { t.setAttribute('onclick', 'mp2613Dock(' + s + ');return false;'); t.innerHTML = `<i class="fas fa-eye${s ? '' : '-slash'} me-2"></i>${s ? 'Tampilkan' : 'Sembunyikan'} dock Agen AI`; }
    gambarDock();
  }
  const ra = window.renderAllTables;   // setiap data dirender ulang → agen memeriksa (hanya bila sidik data berubah)
  let _k = 0; const kerjaT = () => { if (_k) return; _k = setTimeout(() => { _k = 0; if (!document.hidden) kerja(false); }, 2500); };   // tidak diundur ulang: perubahan DOM terus-menerus tidak menunda kerja agen
  if (typeof ra === 'function' && !ra.__mp2613) { const b = function () { const r = ra.apply(this, arguments); kerjaT(); return r; }; Object.keys(ra).forEach(k => { b[k] = ra[k]; }); b.__mp2613 = true; window.renderAllTables = b; }
  setInterval(() => { if (!document.hidden && sesi()) kerja(false); }, 15 * 60e3);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && $('mp2613Pn')) { window.mp2613Tutup(); return; } if (ev.ctrlKey && ev.shiftKey && (ev.key === 'A' || ev.key === 'a')) { ev.preventDefault(); $('mp2613Pn') ? window.mp2613Tutup() : window.mp2613Buka(); } });
  let _tm = 0; const jadwal = () => { clearTimeout(_tm); _tm = setTimeout(() => { try { pasang(); if (sesi() && !A.pada && !A.jalan) kerjaT(); } catch (e) { } }, 300); };
  const awasi = () => { if (!document.body) return; pasang(); if (sesi()) kerjaT(); new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('#mp2613Pn,#mp2613Dock')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();

