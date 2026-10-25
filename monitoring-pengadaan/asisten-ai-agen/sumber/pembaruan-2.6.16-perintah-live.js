/* MP2616 — PEMBARUAN 2.6.16: RUANG PERINTAH LIVE — Manajer memerintah staf di Kantor Live (aditif; butuh MP2613/MP2614 · Modul server 1.9.2 "asistenAgen")
 *  Di bawah Kantor Tim Pengadaan ada bilah perintah: pilih staf (atau klik karakternya) → ketik perintah → staf berjalan ke meja, mengetik,
 *  lalu menjawab di utas & balon. Jika butuh data tambahan, staf bertanya balik; jawaban Anda melanjutkan utas yang sama.
 *  HEMAT TOKEN — dua jalur:
 *   (1) Lokal, 0 token: laporan/status, temuan, tugas, "berapa …", buka form, periksa ulang — dijawab dari hasil pemeriksaan Agen AI.
 *   (2) AI (aiTanya mode agen, 1 panggilan per perintah): pekerjaan & pertanyaan baru. Persona + tugas + ≤ 600 karakter temuan staf itu,
 *       riwayat maks. 4 pesan terakhir; staf hanya boleh menyiapkan aksi tulis sesuai tugasnya (Salma/Vicha: savePBJ, Charles: gudangTerimaBon/
 *       keuanganProgres, Yusuf: keuanganProgres, Adkon: tanpa aksi tulis — WBS diisi di Form Bon; Ilham/BOSS Pengadaan: reviu prosedur, tanpa aksi tulis).
 *  KENDALI: AI TIDAK menyimpan apa pun sendiri. Aksi tulis selalu berupa USULAN (pratinjau dry-run server, token 30 menit) → Manajer menekan
 *  "Setujui & Terapkan" → aiTerapkan (hak Pengadaan/Admin, diperiksa server, tercatat AI-AKSI di Log). Batal menghapus usulan. */
(function () {
  'use strict';
  if (window.__MP2616__) return; window.__MP2616__ = true;
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const proyek = () => (typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || '';
  const A = () => window.MP2613_AGEN || null, KT = () => window.MP2614_KANTOR || null, RS = () => window.MP2614_ROSTER || [];
  const pendek = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const md = t => E(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
  const TUGAS = {
    salma: { t: 'bon permintaan, paket PBJ (PR/RFQ/PO, HPS, pemenang) sampai register kontrak', w: ['savePBJ'], c: ['Buat paket PBJ dari bon terbaru', 'Status PBJ yang belum ada PO'] },
    vicha: { t: 'SAP: PR, PO, GR, GI, SES, MIRO; mencatat nomor PR/RFQ/PO SAP pada paket PBJ', w: ['savePBJ'], c: ['Paket PBJ mana yang belum ada nomor PO?', 'Ringkas GR/GI minggu ini'] },
    yusuf: { t: 'tagihan service SPK, SPPP, SPKP, SPSA sampai pengajuan bayar', w: ['keuanganProgres'], c: ['Tagihan service yang siap diajukan bayar', 'Checklist tagihan service yang belum lengkap'] },
    charles: { t: 'tagihan SPM & SPPM, kartu gudang, pengeluaran, penerimaan bon & administrasi gudang', w: ['gudangTerimaBon', 'keuanganProgres'], c: ['Bon yang belum diterima lengkap', 'Tagihan SPM yang belum diajukan'] },
    rowin: { t: 'Adkon — memberi WBS pada bon permintaan', w: [], c: ['Bon mana yang belum ber-WBS?'] },
    gede: { t: 'Adkon — memberi WBS pada bon permintaan', w: [], c: ['Bon mana yang belum ber-WBS?'] },
    ilham: { t: 'BOSS Pengadaan (tim divisi) — memastikan pekerjaan pengadaan berjalan sesuai prosedur: bon permintaan → PBJ → kontrak → tagihan, mereviu penyimpangan & temuan kritis serta memberi arahan perbaikan (reviu, tidak mengubah data)', w: [], c: ['Reviu kepatuhan prosedur minggu ini', 'Temuan kritis yang menyimpang dari prosedur'] }
  };
  const PR = { ke: 'salma', sibuk: false, L: [] };
  window.MP2616_PERINTAH = PR;
  const kunci = () => 'mp2616_' + proyek() + '_' + ((sesi() || {}).nama || '');
  const muat = () => { try { PR.L = JSON.parse(localStorage.getItem(kunci()) || '[]') || []; } catch (e) { PR.L = []; } };
  const simpan = () => { PR.L = PR.L.slice(-60); try { localStorage.setItem(kunci(), JSON.stringify(PR.L.map(m => Object.assign({}, m, { usulan: m.usulan ? Object.assign({}, m.usulan, { token: m.usulan.status === 'menunggu' ? m.usulan.token : '' }) : null })))); } catch (e) { } };
  const orang = id => RS().find(r => r.id === id) || { id, nama: id, peran: '', ik: '👥' };
  const ch = id => ((KT() || {}).ch || []).find(c => c.r.id === id);
  const ov = (id, teks, ms, titik, status) => { const c = ch(id); if (c) c.ov = { teks, titik: !!titik, meja: true, status: status || 'kerja', sampai: performance.now() + ms }; };
  const temuan = id => { const a = A(), r = orang(id); return a ? a.temuan.filter(x => (r.sumber || []).indexOf(x.sumber) >= 0 || (r.kritis && x.level === 'KRITIS')) : []; };

  /* ======================= 1. JALUR LOKAL (0 token) ======================= */
  const BUKA = [[/bon|wbs/, "bukaTab('form-bon')", 'Form Bon Permintaan'], [/register/, "bukaTab('register')", 'Register Kontrak'], [/kontrak/, "bukaTab('kontrak')", 'Kontrak'],
    [/keuangan|tagihan|bayar/, "bukaTab('keuangan')", 'Keuangan & Bayar'], [/progres|bk\b|bapm|ba\b/, "bukaTab('form-progres')", 'Input Progres'], [/vendor/, "bukaTab('vendor')", 'Master Vendor'], [/service/, "bukaTab('service')", 'Master Service'], [/material/, "bukaTab('material')", 'Master Material']];
  function lokal(id, t) {
    const a = A(), R = (a && a.ring) || {}, r = orang(id), q = t.toLowerCase(), T = id === 'semua' ? [] : temuan(id);
    const hasil = () => (r.langkah || []).map(l => (a && a.hasilL && a.hasilL[l]) || '').filter(Boolean).join('; ');
    if (/^(periksa|cek) ulang|kerjakan sekarang|jalankan (pemeriksaan|agen)|refresh/.test(q)) { if (typeof window.mp2613Kerja === 'function') window.mp2613Kerja(); return { teks: 'Siap, pemeriksaan ulang seluruh data dimulai sekarang.' }; }
    if (/(buka|tampilkan|lihat) .*(form|menu|halaman)?/.test(q)) { const b = BUKA.find(x => x[0].test(q)); if (b) return { teks: 'Saya bukakan **' + b[2] + '**.', buka: b[1] }; }
    if (q.split(/\s+/).length <= 5 && /\b(tugas|kerjaan|job ?desc|tanggung jawab)/.test(q) && id !== 'semua') return { teks: 'Tugas saya: ' + (TUGAS[id] || {}).t + '.' };
    if (/\bberapa\b/.test(q)) {
      const P = (typeof PMT !== 'undefined' && PMT.data) || [];
      if (/wbs/.test(q)) return { teks: (R.wbs || 0) + ' bon permintaan belum lengkap WBS.' };
      if (/bon/.test(q)) return { teks: P.length + ' bon permintaan termuat' + (R.bon != null ? ', ' + R.bon + ' belum diterima lengkap.' : '.') };
      if (/belum (di)?bayar|tagihan/.test(q)) return { teks: (R.bayar || 0) + ' tagihan berstatus BELUM bayar.' };
      if (/kontrak/.test(q)) return { teks: (R.kontrak || 0) + ' kontrak · ' + (R.draf || 0) + ' draf Rp 0.' };
      if (/bk|progres/.test(q)) return { teks: (R.bk || 0) + ' BK tercatat.' };
    }
    const singkat = q.split(/\s+/).length <= 5;   // perintah panjang (mis. "buat laporan bulanan untuk direksi") = pekerjaan → AI
    if (singkat && /temuan|masalah|kendala|kritis|warning|prioritas/.test(q)) {
      const L = id === 'semua' ? ((a && a.temuan) || []) : T;
      return { teks: L.length ? L.length + ' temuan' + (id === 'semua' ? ' tim' : ' di bagian saya') + ':\n' + L.slice(0, 5).map((x, i) => (i + 1) + '. [' + x.level + '] ' + x.judul + ' — ' + pendek(x.ket, 70)).join('\n') + (L.length > 5 ? '\n…dan ' + (L.length - 5) + ' lainnya.' : '') : 'Tidak ada temuan' + (id === 'semua' ? '.' : ' di bagian saya.') };
    }
    if (singkat && /status|laporan|lapor|progres kerja|sedang apa|lagi apa|update|kabar/.test(q)) {
      if (id === 'semua') return { teks: RS().filter(x => !x.manajer).map(x => '• ' + x.nama + ': ' + (((x.langkah || []).map(l => (a && a.hasilL && a.hasilL[l]) || '').filter(Boolean).join('; ')) || 'belum ada putaran')).join('\n') };
      return { teks: 'Laporan: ' + (hasil() || 'belum ada putaran pemeriksaan') + '. ' + (T.length ? T.length + ' temuan di bagian saya, teratas: ' + T.slice(0, 2).map(x => x.judul).join('; ') + '.' : 'Tidak ada temuan di bagian saya.') };
    }
    return null;
  }

  /* ======================= 2. JALUR AI (1 panggilan, persona & aksi sesuai tugas) ======================= */
  function persona(id) {
    const r = orang(id), g = TUGAS[id] || { t: '', w: [] }, T = temuan(id);
    return ('Anda berperan sebagai ' + r.nama + ' (' + r.peran + ') di tim pengadaan proyek ' + proyek() + ', menerima perintah langsung dari Manajer Pengadaan ' + ((sesi() || {}).nama || '') + '. ' +
      'Tugas Anda: ' + g.t + '. Kerjakan perintah langsung, jawab ringkas & profesional (maks. 120 kata, bahasa Indonesia, istilah pengadaan konstruksi). ' +
      'Pakai aksi baca bila butuh data. Perubahan data HANYA lewat satu aksi tulis berikut: ' + (g.w.length ? g.w.join(', ') : 'TIDAK ADA — jelaskan langkahnya & sebut form yang harus dibuka') + '; jangan memakai aksi tulis lain. ' +
      'Bila data perintah kurang (mis. nama paket, nomor bon, vendor, nilai), JANGAN mengarang: tanyakan balik singkat berupa poin yang dibutuhkan. ' +
      'Temuan bagian Anda: ' + (T.length ? T.slice(0, 6).map(x => '[' + x.level + '] ' + x.judul + ' — ' + pendek(x.ket, 60)).join('; ') : 'tidak ada')).slice(0, 1600);
  }
  async function keAI(id, teks, idx) {
    if (typeof regAksi !== 'function') throw new Error('Tidak terhubung ke server.');
    const r = orang(id), riw = PR.L.filter(m => m.ke === id && (m.dari === 'manajer' || m.dari === id) && m.ai !== false).slice(-5, -1)
      .map(m => ({ role: m.dari === 'manajer' ? 'user' : 'assistant', teks: String(m.teks).slice(0, 800) }));
    const pesan = riw.concat([{ role: 'user', teks: '[Perintah Manajer kepada ' + r.nama + '] ' + teks }]);
    const res = await regAksi('aiTanya', { data: { agen: true, konteks: persona(id), pesan } });
    const p = res.pakai || {};
    return { teks: String(res.teks || '').slice(0, 3000), usulan: res.usulan || null, token: N(p.masuk) + N(p.keluar), langkah: (res.langkah || []).length, sisa: res.sisa };
  }

  /* ======================= 3. KIRIM PERINTAH ======================= */
  window.mp2616Kirim = async teksAwal => {
    const tx = $('mp2616Tx'), teks = String(teksAwal != null ? teksAwal : (tx && tx.value) || '').trim(), id = PR.ke;
    if (!teks || PR.sibuk) return; if (tx) tx.value = '';
    const r = orang(id), man = RS().find(x => x.manajer);
    PR.L.push({ ke: id, dari: 'manajer', teks, pada: Date.now() }); gambar();
    if (man) ov(man.id, '🗣️ Perintah ke ' + (id === 'semua' ? 'tim' : r.nama.split(' ')[0]), 4000, false, 'jalan');
    const lk = lokal(id, teks);
    if (lk) {
      const daftar = id === 'semua' ? RS().filter(x => !x.manajer).map(x => x.id) : [id];
      daftar.forEach((d, k) => ov(d, k === 0 ? '💬 ' + pendek(lk.teks.replace(/\*\*/g, ''), 40) : '💬 Siap', 9000, false, 'selesai'));
      PR.L.push({ ke: id, dari: id, teks: lk.teks, pada: Date.now(), ai: false, buka: lk.buka || '' }); simpan(); gambar();
      if (lk.buka) setTimeout(() => { if (typeof window.mp2614Tutup === 'function') window.mp2614Tutup(); try { (0, eval)(lk.buka); } catch (e) { } }, 900);
      return;
    }
    if (id === 'semua') { PR.L.push({ ke: id, dari: 'sistem', teks: 'Perintah pekerjaan ditujukan ke satu staf agar jelas penanggung jawabnya — pilih nama staf (atau klik karakternya).', pada: Date.now() }); simpan(); gambar(); return; }
    PR.sibuk = true; ov(id, '✍️ Mengerjakan: ' + pendek(teks, 24), 180000, true, 'kerja'); gambar();
    try {
      const h = await keAI(id, teks);
      const tanya = !h.usulan && /\?\s*$|\?\s*\n/.test(h.teks);
      PR.L.push({ ke: id, dari: id, teks: h.teks, usulan: h.usulan, token: h.token, langkah: h.langkah, pada: Date.now() });
      ov(id, h.usulan ? '📝 Usulan ' + pendek(h.usulan.judul || h.usulan.aksi, 22) + ' — menunggu persetujuan' : tanya ? '❓ Ada pertanyaan untuk Manajer' : '✅ ' + pendek(h.teks.replace(/[*#`]/g, '').split(/[.\n]/)[0], 34), 20000, false, 'selesai');
    } catch (err) { PR.L.push({ ke: id, dari: 'sistem', teks: 'Tidak dapat diproses: ' + err.message, pada: Date.now() }); ov(id, '⚠️ Perintah gagal diproses', 8000, false, 'selesai'); }
    finally { PR.sibuk = false; simpan(); gambar(); }
  };
  window.mp2616Terapkan = async (i, batal) => {
    const m = PR.L[i], u = m && m.usulan; if (!u || u.status !== 'menunggu' || PR.sibuk) return;
    if (batal) { if (u.token) { try { await regAksi('aiTerapkan', { data: { token: u.token, batal: true } }); } catch (e) { } } Object.assign(u, { status: 'dibatalkan', token: '' }); ov(m.ke, '↩️ Usulan dibatalkan', 6000, false, 'selesai'); simpan(); gambar(); return; }
    if (!window.confirm('Setujui & terapkan "' + (u.judul || u.aksi) + '" yang disiapkan ' + orang(m.ke).nama + '?\n\n' + pendek((u.pratinjau || {}).ringkas, 600) + '\n\nData produksi diubah dan dicatat di Log (AI-AKSI).')) return;
    PR.sibuk = true; ov(m.ke, '💾 Menyimpan ' + pendek(u.judul || u.aksi, 24), 60000, true, 'kerja'); gambar();
    try {
      const r = await regAksi('aiTerapkan', { data: { token: u.token } });
      Object.assign(u, { status: 'diterapkan', token: '', ringkasTerap: r.ringkas || '' });
      ov(m.ke, '✅ ' + pendek(u.judul || u.aksi, 26) + ' tersimpan', 15000, false, 'selesai');
      try { if (u.aksi === 'gudangTerimaBon' && typeof window.mp223Muat === 'function') window.mp223Muat(true); else if (typeof window.muatRegister === 'function') window.muatRegister(true); } catch (e) { }
    } catch (err) { u.galat = err.message; if (/kedaluwarsa|sudah diproses/i.test(err.message)) Object.assign(u, { status: 'dibatalkan', token: '' }); ov(m.ke, '⚠️ Gagal menyimpan', 8000, false, 'selesai'); }
    finally { PR.sibuk = false; simpan(); gambar(); }
  };

  /* ======================= 4. TAMPILAN ======================= */
  function kartuUsulan(u, i) {
    const pr = u.pratinjau || {}, bisa = u.status === 'menunggu' && u.boleh && u.token && pr.siap;
    const st = { menunggu: 'Menunggu persetujuan', diterapkan: 'Diterapkan', dibatalkan: 'Dibatalkan' }[u.status] || u.status;
    return `<div class="mp2616-us ${E(u.status)}"><div class="h"><b><i class="fas fa-file-signature me-1"></i>Usulan: ${E(u.judul || u.aksi)}</b><span>${E(st)}</span></div>
      ${u.alasan ? `<p>${E(u.alasan)}</p>` : ''}${pr.ringkas ? `<pre>${E(pendek(pr.ringkas, 900))}</pre>` : ''}
      ${(pr.peringatan || []).length ? `<ul>${pr.peringatan.slice(0, 5).map(x => '<li>' + E(x) + '</li>').join('')}</ul>` : ''}${pr.galat ? `<p class="g">${E(pr.galat)}</p>` : ''}${u.catatan ? `<p class="g">${E(u.catatan)}</p>` : ''}${u.galat ? `<p class="g">${E(u.galat)}</p>` : ''}
      ${u.ringkasTerap ? `<p class="ok">${E(u.ringkasTerap)}</p>` : ''}
      ${u.status === 'menunggu' ? `<div class="a">${bisa ? `<button type="button" class="btn btn-sm btn-success" onclick="mp2616Terapkan(${i})"><i class="fas fa-check me-1"></i>Setujui & Terapkan</button>` : ''}<button type="button" class="btn btn-sm btn-light border" onclick="mp2616Terapkan(${i}, true)">Batal</button></div>` : ''}</div>`;
  }
  function gambar() {
    const w = $('mp2616Log'); if (!w) return;
    const L = PR.L.map((m, i) => [m, i]).filter(([m]) => PR.ke === 'semua' || m.ke === PR.ke || m.ke === 'semua').slice(-30);
    const r = orang(PR.ke);
    w.innerHTML = L.length ? L.map(([m, i]) => { const o = m.dari === 'manajer' ? null : orang(m.dari);
      return `<div class="mp2616-m ${m.dari === 'manajer' ? 'saya' : m.dari === 'sistem' ? 'sis' : ''}"><small>${m.dari === 'manajer' ? 'Anda (Manajer) → ' + E(m.ke === 'semua' ? 'Semua tim' : orang(m.ke).nama) : m.dari === 'sistem' ? 'Sistem' : E(o.ik + ' ' + o.nama + ' · ' + o.peran)} · ${new Date(m.pada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}${m.dari !== 'manajer' && m.dari !== 'sistem' ? ' · ' + (m.ai === false ? '0 token' : (m.token ? m.token + ' token' : 'AI')) : ''}</small>
        <div>${md(m.teks)}</div>${m.buka ? `<button type="button" class="btn btn-sm btn-link p-0" onclick="mp2614Tutup(); ${E(m.buka)}">Buka lagi</button>` : ''}${m.usulan ? kartuUsulan(m.usulan, i) : ''}</div>`; }).join('')
      : `<p class="mp2616-kosong">Beri perintah kepada ${E(PR.ke === 'semua' ? 'tim' : r.nama)} — contoh di bawah. Perintah rutin dijawab tanpa token; perubahan data selalu menunggu persetujuan Anda.</p>`;
    if (PR.sibuk) w.insertAdjacentHTML('beforeend', `<div class="mp2616-m sis"><span class="mp2613-ketik"><i></i><i></i><i></i></span>${E(r.nama)} sedang mengerjakan…</div>`);
    w.scrollTop = w.scrollHeight;
    const sel = $('mp2616Ke'); if (sel && sel.value !== PR.ke) sel.value = PR.ke;
    const tx = $('mp2616Tx'); if (tx) { tx.placeholder = PR.ke === 'semua' ? 'Perintah ke semua tim, mis. "laporan"' : 'Perintahkan ' + r.nama.split(' ')[0] + '…'; tx.disabled = PR.sibuk; }
    const b = $('mp2616Btn'); if (b) b.disabled = PR.sibuk;
    const c = $('mp2616Cepat'); if (c) c.innerHTML = ['Laporan', 'Temuan', 'Tugas'].concat(PR.ke === 'semua' ? [] : (TUGAS[PR.ke] || { c: [] }).c).map((q, k) => `<button type="button" class="mp2616-chip${k > 2 ? ' ai' : ''}" onclick="mp2616Kirim(${E(JSON.stringify(q))})" title="${k > 2 ? 'Memakai AI (1 panggilan)' : '0 token'}">${k > 2 ? '✨ ' : ''}${E(q)}</button>`).join('');
  }
  window.mp2616Ke = id => { PR.ke = id || 'salma'; gambar(); const tx = $('mp2616Tx'); if (tx) tx.focus(); };
  function pasangSlot() {
    const s = $('mp2614Slot'); if (!s || s.dataset.mp2616) return;
    s.dataset.mp2616 = '1'; muat(); const dlg = s.closest('.mp2614-dlg'); if (dlg) dlg.classList.add('mp2616-ada');
    const staf = RS().filter(r => !r.manajer);
    s.innerHTML = `<div class="mp2616"><div class="mp2616-log" id="mp2616Log" aria-live="polite"></div>
      <form class="mp2616-bar" id="mp2616Form"><label class="visually-hidden" for="mp2616Ke">Staf tujuan</label>
        <select id="mp2616Ke">${staf.map(r => `<option value="${E(r.id)}">${E(r.ik + ' ' + r.nama + ' · ' + r.peran)}</option>`).join('')}<option value="semua">👥 Semua tim</option></select>
        <input id="mp2616Tx" type="text" autocomplete="off" maxlength="600" aria-label="Perintah"><button type="submit" id="mp2616Btn" class="btn btn-sm btn-warning fw-semibold"><i class="fas fa-paper-plane me-1"></i>Kirim</button></form>
      <div class="mp2616-cepat" id="mp2616Cepat"></div>
      <small class="mp2616-ket">Laporan · temuan · tugas · berapa · buka form = 0 token. ✨ Pekerjaan & pertanyaan baru = 1 panggilan AI. Data hanya berubah setelah Anda tekan <b>Setujui & Terapkan</b>.</small></div>`;
    // pengendali dipasang lewat JS: atribut onchange di dalam <form> akan menunjuk elemen ber-id sama (form.mp2616Ke), bukan fungsi global
    $('mp2616Ke').addEventListener('change', ev => window.mp2616Ke(ev.target.value));
    $('mp2616Form').addEventListener('submit', ev => { ev.preventDefault(); window.mp2616Kirim(); });
    gambar(); window.dispatchEvent(new Event('resize'));   // Kantor menghitung ulang ukuran canvas (panel perintah di samping / di bawah)
  }
  const _buka = window.mp2614Kantor;
  if (typeof _buka === 'function') window.mp2614Kantor = function () { const r = _buka.apply(this, arguments); try { pasangSlot(); } catch (e) { console.warn('[2.6.16] perintah', e); } return r; };
  const _pilih = window.mp2614Pilih;
  if (typeof _pilih === 'function') window.mp2614Pilih = function (id) { const r = _pilih.apply(this, arguments); const o = RS().find(x => x.id === id); if (o && !o.manajer && $('mp2616Ke')) { PR.ke = id; gambar(); } return r; };
})();

