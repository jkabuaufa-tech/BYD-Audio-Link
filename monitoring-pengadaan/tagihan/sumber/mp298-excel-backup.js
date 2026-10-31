/* MP298 — AUTO-POPULATE EXCEL FORMAT BAKU & BACKUP PAKET TAGIHAN (2.9.8; Modul server 1.10.4 · fitur "paketTagihanExcel")
 *  A. Isian tambahan template baku (dipasang lewat kait window.mp298TambahIsian di MP293, berlaku juga untuk Preview BA & Pratinjau Paket):
 *     - BAP format (SPK/SPPP/SPKP/SPKU) › DATA: B7 Nama Proyek, B44 Retensi Kontrak (%), B45 Uang Muka Kontrak (%) dari Konfigurasi Tagihan
 *       (B10 Nilai Kontrak tetap rumus baku =lamp1!K41 → dibandingkan dengan nilai Register; selisih ditampilkan sebagai peringatan).
 *     - Master SPM (SPM/SPPM) › INPUT: B5 Nama Proyek; narasi BAP (BAP!N31) = nama item urut nilai progres termahal → termurah, min. 3 item
 *       (bila item terealisasi < 3, dilengkapi item kontrak bernilai terbesar).
 *     Print Area, Page Setup, kop, merge cells & rumus sheet cetak tidak diubah oleh blok ini (hanya sel isian DATA/INPUT/ITEM/BAP!N31).
 *  B. Otomatis: setelah Simpan BK (saveProgres baru/revisi), Terbitkan BA, dan pembentukan paket (Pembentuk Tagihan) → template baku
 *     di-clone & diisi (Register Kontrak, Master Data Vendor/rekanan, volume termin 1–6 dari Input Progres) → diunggah bertahap
 *     (SHA-256) → server menyimpan ke <No_Urut> <Jenis> <Vendor>/Kelengkapan/BAP_<Pekerjaan>_<Vendor>_Termin-<X>.xlsx & menautkan ke paket.
 *  C. Paket Tagihan (dialog) & Pembentuk Tagihan (baris BK): "Unduh Excel Backup (.xlsx)", "Pratinjau & Cetak PDF" (render sheet cetak
 *     dari berkas Excel tersimpan → A4 presisi di modal), "Susun ulang backup".
 *  Gagal menyusun/unggah TIDAK menghalangi simpan BK (peringatan saja). Tanpa modul 1.10.4: unduh & pratinjau tetap jalan dari data perangkat. */
(function () {
  'use strict';
  if (window.__MP298__) return; window.__MP298__ = true;
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pesan = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || ''); else console.info('[MP298]', m); } catch (e) { } };
  const g$ = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined ? fb : v; } catch (e) { return fb; } };
  const PROYEK_BAKU = 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok';
  const LEMBAR = { spm: ['BAPM', 'BAP'], bap: ['rincian ', 'lamp1', 'BAPP', 'BAP  1'] };
  const JUDUL = { BAPM: 'BAPM', BAP: 'BAP', 'rincian ': 'Rincian', lamp1: 'Lampiran', BAPP: 'BAPP', 'BAP  1': 'BAP' };
  const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const jenisDari = no => (String(no || '').split('/')[1] || '').trim().toUpperCase();
  const formatDari = no => ({ SPM: 'spm', SPPM: 'spm', SPK: 'bap', SPPP: 'bap', SPKP: 'bap', SPKU: 'bap' })[jenisDari(no)] || '';
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const pid = () => { const s = sesi(); return (s && s.proyek) || (g$('PROYEK', {}) || {}).id || ''; };
  const boleh = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN' || s.peran === 'ADMIN')); };
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  const serverSiap = () => !!(sesi() && typeof window.regPost === 'function') && srv('paketTagihanExcel');
  async function kirim(action, data) {
    const s = sesi(), f = window.regPost; if (!s || typeof f !== 'function') throw new Error('Belum terhubung ke server Monitoring SAP.');
    const r = await f(Object.assign({ action, nama: s.nama, pin: s.pin, proyek: pid() }, data === undefined ? {} : { data }));
    if (!r || !r.ok) throw new Error((r && r.error) || 'Gagal menghubungi server.'); return r;
  }
  const namaProyek = () => { const P = g$('PROYEK', {}) || {}, K = g$('KSO', {}) || {}; return S(P.namaLengkap || K.proyek) || PROYEK_BAKU; };
  const ringkasan = () => { try { return (typeof RINGKASAN !== 'undefined' && RINGKASAN) || []; } catch (e) { return []; } };
  const progresSemua = () => { try { return (typeof PROG !== 'undefined' && PROG && PROG.data) || []; } catch (e) { return []; } };
  const regDari = key => { try { return ((typeof REG !== 'undefined' && REG.data) || []).find(r => r.noKontrak === key) || null; } catch (e) { return null; } };
  const kontrakDari = key => ringkasan().find(g => g.key === key || g.keyAsli === key || (g.terkait || []).indexOf(key) >= 0) || null;
  const idItem = (g, it, i) => { const f = g$('idItem'); return typeof f === 'function' ? f(g, it, i) : (it.kodeUnik || g.key + '#' + i); };
  const volItem = it => { const f = g$('volItem'); return typeof f === 'function' ? N(f(it)) : N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak); };
  const hargaItem = it => { const f = g$('hargaItem'); return typeof f === 'function' ? N(f(it)) : N(it.hargaSatuanEfektif ?? it.hargaSatuan); };
  const namaItem = it => S(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian);
  const b64keBytes = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
  function bytesKeB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  async function sha256(u8) {   // crypto.subtle hanya di konteks aman (https/file) → cadangan BLK.sha256 (JS murni, paket 2.7.0+)
    if (window.BLK && typeof window.BLK.sha256 === 'function') return window.BLK.sha256(u8);
    const h = await crypto.subtle.digest('SHA-256', u8); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const ruas = (t, n) => S(t).replace(/[\\/:*?"<>|\u0000-\u001F]+/g, ' ').replace(/[.,;]+/g, '').replace(/\s+/g, ' ').trim().slice(0, n).replace(/\s+/g, '_');

  /* ======================= A. isian tambahan (kait MP293) ======================= */
  function urutUtama(ITEM, aktif) {   // dari isian ITEM Master SPM: nama · vol · harga · volume termin G..J
    const L = []; for (let b = 4; b < 104; b++) { const nm = S(ITEM['B' + b]); if (!nm) continue;
      const vol = N(ITEM['D' + b]), h = N(ITEM['E' + b]), sd = 'GHIJ'.split('').slice(0, aktif).reduce((a, k) => a + N(ITEM[k + b]), 0);
      L.push({ ur: nm, nilai: sd * h, kontrak: vol * h }); }
    const real = L.filter(x => x.nilai > 0).sort((a, b) => b.nilai - a.nilai), lain = L.filter(x => !(x.nilai > 0)).sort((a, b) => b.kontrak - a.kontrak);
    const nm = real.concat(real.length < 3 ? lain.slice(0, 3 - real.length) : []).slice(0, 3).map(x => x.ur);   // min. 3 item (bila ada)
    return { nm, lebih: L.length > nm.length };
  }
  window.mp298TambahIsian = (K, I, f) => {
    const t = I.tulisan || {}; I.cek = { nilaiRegister: N(K.g && K.g.nilai), format: f };
    if (f === 'bap') {
      const D = t.DATA = t.DATA || {};
      D.B7 = namaProyek();
      D.B44 = N(K.retensi) / 100; D.B45 = N(K.uangMuka) / 100;
      I.namaPekerjaan = S(D.B6).replace(/^-$/, '');
    } else if (f === 'spm') {
      const IN = t.INPUT = t.INPUT || {}, aktif = N(I.ringkas && I.ringkas.termin) || 1;
      IN.B5 = namaProyek();
      const { nm, lebih } = urutUtama(t.ITEM || {}, aktif);
      if (nm.length) { t.BAP = t.BAP || {}; t.BAP.N31 = nm.join(', ') + (lebih ? ', dll.' : ''); }
      const r = regDari(K.g.key) || {};
      I.namaPekerjaan = S(r.namaPekerjaan || K.g.namaPekerjaan) || ('Pengadaan ' + (nm[0] || 'Material'));
      I.utama = nm;
    }
  };

  /* ======================= B. kasus dari BK (tanpa membuka Preview BA / dialog paket) ======================= */
  function vendorDari(g) {
    let p = {}; try { p = (window.profilVendor && window.profilVendor(g.idVendor, g.namaVendor)) || {}; } catch (e) { }
    const m = (window.mp292VendorMaster && window.mp292VendorMaster(g.idVendor, g.namaVendor)) || {};
    let pk = {}; try { const T = window.mp270Aktif && window.mp270Aktif(); if (T && T.g && T.g.key === g.key && T.l && T.l.vendor) pk = T.l.vendor; } catch (e) { }
    return { nama: pk.nama || g.namaVendor || '', direktur: pk.ttdNama || p.nama || m.pimpinan || '', jabatan: pk.ttdJabatan || p.jabatan || m.jabatan || 'Direktur', alamat: pk.alamat || p.alamat || m.alamat || '',
      npwp: pk.npwp || p.npwp || m.npwp || '', email: p.email || m.email || '', telp: p.telp || m.telp || '' };
  }
  async function konfigDari(g, progresId) {
    try { const T = window.mp270Aktif && window.mp270Aktif(); if (T && T.g && T.g.key === g.key && T.konfig && T.l && T.l.progresId === progresId) return T.konfig; } catch (e) { }
    if (sesi() && typeof window.regPost === 'function' && srv('paketTagihan')) { try { return (await kirim('blKonfigBaca', { noKontrak: g.key })).data || {}; } catch (e) { } }
    return {};
  }
  async function kasusBK(progresId, entriBaru) {
    let L = progresSemua().slice(); if (entriBaru && entriBaru.id) L = L.filter(x => x.id !== entriBaru.id).concat([Object.assign({}, L.find(x => x.id === entriBaru.id) || {}, entriBaru)]);
    const e = L.find(x => x.id === progresId); if (!e) throw new Error('BK ' + progresId + ' tidak ditemukan.');
    const g = kontrakDari(e.noKontrak); if (!g) throw new Error('Kontrak ' + e.noKontrak + ' tidak ditemukan di Monitoring SAP.');
    if (!formatDari(g.key)) throw new Error('Format Excel baku hanya untuk SPM/SPPM & SPK/SPPP/SPKP/SPKU; kontrak ini ' + jenisDari(g.key) + '.');
    const T = new Set([g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean)), ke = N(e.tagihanKe) || 1;
    const sblm = L.filter(x => T.has(x.noKontrak) && x.id !== e.id && N(x.tagihanKe) < ke);
    const ini = {}, lalu = {};
    (g.items || []).forEach((it, i) => { if (!volItem(it) && !hargaItem(it)) return; const id = idItem(g, it, i);
      ini[id] = N((e.items || {})[id]); lalu[id] = N(it.volumeProgresKumulatif) + sblm.reduce((a, x) => a + N((x.items || {})[id]), 0); });
    const k = await konfigDari(g, progresId);
    // dipakai MP293 (slot termin, isian sel) — sama dengan kasus Preview BA / Paket Tagihan
    return { g, ke, nomor: e.nomorBA || '', tanggal: e.tanggal || e.baTerbit || '', progresId: e.id, ini, lalu, vendor: vendorDari(g), uangMuka: N(k.uangMukaPersen), retensi: N(k.retensiPersen), entri: e, _L: L };
  }

  /* ---------- susun berkas (clone template → isi → hitung → nilai tersimpan) ---------- */
  const ANTRE = { jalan: Promise.resolve(), tunda: {}, status: {} };
  async function susun(progresId, entriBaru) {
    if (typeof window.mp293Bangun !== 'function' || !window.XLH) throw new Error('Mesin format Excel baku (2.9.3+) belum terpasang.');
    if (window.mp292MuatMaster) { try { await window.mp292MuatMaster(); } catch (e) { } }
    const K = await kasusBK(progresId, entriBaru);
    // MP293 membaca BK sebelumnya dari PROG.data; entri baru dari jawaban server dipakai sementara agar volume terkini ikut
    let pulih = null; try { if (entriBaru && typeof PROG !== 'undefined' && PROG && Array.isArray(PROG.data) && !PROG.data.some(x => x.id === entriBaru.id)) { PROG.data.push(K.entri); pulih = () => { const i = PROG.data.indexOf(K.entri); if (i >= 0) PROG.data.splice(i, 1); }; } } catch (e) { }
    let B; try { B = await window.mp293Bangun(K); } finally { if (pulih) pulih(); }
    const bytes = await window.XLH.tutupZip([...B.F.entries()]), f = formatDari(K.g.key), H = B.hasil;
    const nilaiExcel = f === 'bap' ? N(H.get('DATA') && H.get('DATA').get('B10')) : N(H.get('ITEM') && H.get('ITEM').get('C107'));
    const selisih = Math.round(nilaiExcel - N(K.g.nilai));
    const nama = 'BAP_' + ruas(B.I.namaPekerjaan || jenisDari(K.g.key), 70) + (ruas(K.g.namaVendor, 40) && ruas(B.I.namaPekerjaan, 70).toLowerCase().indexOf(ruas(K.g.namaVendor, 40).toLowerCase()) < 0 ? '_' + ruas(K.g.namaVendor, 40) : '') + '_Termin-' + K.ke + '.xlsx';
    return { K, B, bytes, nama, f, ringkas: { item: B.I.ringkas.item, termin: K.ke, slot: B.I.ringkas.termin, gabung: B.I.ringkas.gabung, nilaiExcel, nilaiRegister: N(K.g.nilai), selisih, utama: B.I.utama || null, uangMuka: K.uangMuka, retensi: K.retensi } };
  }
  async function unggah(H, sumber) {
    const info = (await kirim('blInfo')) || {}, maks = Math.max(100000, N(info.potongUnggah) || 2900000);
    const sha = await sha256(H.bytes), b64 = bytesKeB64(H.bytes), bagian = Math.max(1, Math.ceil(b64.length / maks));
    const m = await kirim('blUnggahMulai', { nama: H.nama, jenis: 'BACKUP_XLSX', ket: H.K.g.key, ukuran: H.bytes.length, sha256: sha, bagian });
    for (let i = 0; i < bagian; i++) {
      let ok = false, err = null;
      for (let c = 0; c < 3 && !ok; c++) { try { await kirim('blUnggahPotong', { uploadId: m.uploadId, ke: i + 1, data: b64.slice(i * maks, (i + 1) * maks) }); ok = true; } catch (e) { err = e; await new Promise(r => setTimeout(r, 800 * (c + 1))); } }
      if (!ok) throw err;
    }
    return (await kirim('blExcelSelesai', { uploadId: m.uploadId, progresId: H.K.progresId, noKontrak: H.K.g.key, termin: H.K.ke, namaPekerjaan: H.B.I.namaPekerjaan || '', namaVendor: H.K.g.namaVendor || '', sumber, ringkas: H.ringkas })).data;
  }
  async function backup(progresId, opsi) {
    opsi = opsi || {}; ANTRE.status[progresId] = { sedang: true };
    try {
      const H = await susun(progresId, opsi.entri);
      if (!serverSiap()) { ANTRE.status[progresId] = { lokal: true, H }; if (!opsi.diam) pesan('Excel backup tersusun di perangkat (Modul server 1.10.4 belum aktif → belum tersimpan ke arsip).', 'warning'); return { H, data: null }; }
      const d = await unggah(H, opsi.sumber || 'APLIKASI');
      ANTRE.status[progresId] = { data: d, H };
      if (!opsi.diam) pesan('Backup Excel ' + d.nama + ' tersimpan di ' + d.folder + (H.ringkas.selisih ? ' · PERINGATAN: nilai kontrak Excel ' + H.ringkas.nilaiExcel.toLocaleString('id-ID') + ' ≠ Register ' + H.ringkas.nilaiRegister.toLocaleString('id-ID') : '') + '.', H.ringkas.selisih ? 'warning' : 'ok');
      gambarDialog(); gambarPembentuk();
      return { H, data: d };
    } catch (e) { ANTRE.status[progresId] = { galat: e.message }; throw e; }
  }
  function jadwalkan(progresId, opsi) {   // debounce per BK; dijalankan berurutan agar tidak membebani perangkat & server
    if (!progresId) return; clearTimeout(ANTRE.tunda[progresId]);
    ANTRE.tunda[progresId] = setTimeout(() => {
      delete ANTRE.tunda[progresId];
      ANTRE.jalan = ANTRE.jalan.then(() => backup(progresId, opsi)).catch(e => pesan('Backup Excel paket tagihan belum tersimpan: ' + e.message + ' (ulangi dari Paket Tagihan › Susun ulang backup).', 'warning'));
    }, (opsi && opsi.jeda) || 1200);
  }
  window.MP298 = { susun, backup, jadwalkan, kasusBK, status: ANTRE.status };

  /* ---------- pemicu otomatis ---------- */
  (function bungkusRegAksi() {
    const ra = window.regAksi; if (typeof ra !== 'function') { setTimeout(bungkusRegAksi, 1500); return; } if (ra.__mp298) return;
    const g = async function (a, x) {
      const r = await ra.apply(this, arguments);
      try {
        if (a === 'saveProgres' && r && r.data && r.data.id && boleh() && formatDari(r.data.noKontrak || ((progresSemua().find(e => e.id === r.data.id) || {}).noKontrak))) {
          const terbit = !!(x && x.data && x.data.terbit);
          jadwalkan(r.data.id, { entri: r.data.noKontrak ? r.data : null, sumber: terbit ? 'TERBIT_BA' : (x && x.data && x.data.id ? 'REVISI_BK' : 'SIMPAN_BK'), jeda: terbit ? 2500 : 1800 });
        }
      } catch (e) { }
      return r;
    };
    Object.keys(ra).forEach(k => { g[k] = ra[k]; }); g.__mp298 = true; window.regAksi = g;
  })();
  (function bungkusBentuk() {
    const f = window.mp270BuatOtomatis; if (typeof f !== 'function') { setTimeout(bungkusBentuk, 1500); return; } if (f.__mp298) return;
    const g = async function (key, progresId) {
      const h = await f.apply(this, arguments);
      try { if (h && h.baru && formatDari(key) && !ANTRE.tunda[progresId] && !(ANTRE.status[progresId] && (ANTRE.status[progresId].sedang || ANTRE.status[progresId].data))) jadwalkan(progresId, { sumber: 'PEMBENTUK', diam: true, jeda: 400 }); } catch (e) { }
      return h;
    };
    g.__mp298 = true; window.mp270BuatOtomatis = g;
  })();

  /* ======================= C. unduh & pratinjau ======================= */
  async function berkas(progresId) {   // utamakan berkas arsip server (persis yang tersimpan), selain itu susun dari data perangkat
    if (serverSiap()) {
      try { const r = await kirim('blExcelAmbil', { progresId }); return { bytes: b64keBytes(r.base64), nama: r.data.nama, f: r.data.format, dari: 'arsip', data: r.data }; }
      catch (e) { if (!/belum ada/i.test(e.message)) throw e; }
    }
    const H = await susun(progresId); return { bytes: H.bytes, nama: H.nama, f: H.f, dari: 'perangkat', H };
  }
  function unduhBytes(bytes, nama) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: MIME })); a.download = nama;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const progresAktif = () => { try { const T = window.mp270Aktif && window.mp270Aktif(); return T && T.l && T.l.progresId ? T.l.progresId : (T && T.entri && T.entri.id) || ''; } catch (e) { return ''; } };
  async function sibuk(btn, teks, fn) {
    const b = btn && btn.nodeType ? btn : null; if (b) { b.disabled = true; b.dataset.l = b.innerHTML; b.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>' + teks; }
    try { return await fn(); } catch (e) { pesan(e.message, 'err'); } finally { if (b) { b.disabled = false; b.innerHTML = b.dataset.l; } }
  }
  window.mp298Unduh = (progresId, btn) => sibuk(btn, 'Menyiapkan…', async () => {
    progresId = progresId || progresAktif(); if (!progresId) throw new Error('Pilih BK / paket tagihan terlebih dahulu.');
    const x = await berkas(progresId); unduhBytes(x.bytes, x.nama);
    pesan('Excel backup diunduh: ' + x.nama + (x.dari === 'arsip' ? ' (salinan arsip ' + (x.data.folder || '') + ')' : ' (disusun dari data perangkat)') + '.', 'ok');
  });
  window.mp298SusunUlang = (progresId, btn) => sibuk(btn, 'Menyusun…', async () => {
    progresId = progresId || progresAktif(); if (!progresId) throw new Error('Pilih BK / paket tagihan terlebih dahulu.');
    if (!boleh()) throw new Error('Hanya Pengadaan/Admin yang dapat menyimpan backup Excel.');
    await backup(progresId, { sumber: 'SUSUN_ULANG' });
    try { const T = window.mp270Aktif && window.mp270Aktif(); if (T && T.paket && serverSiap()) { T.baca = await kirim('blBaca', { id: T.paket.id }); gambarDialog(); } } catch (e) { }
  });

  const PV = { x: null };
  function tutupPv() { const w = $('mp298Pv'); if (w) w.remove(); PV.x = null; }
  window.mp298PvTutup = tutupPv;
  window.mp298PvLembar = nama => {
    const fr = $('mp298Frame'); if (!fr || !fr.contentDocument) return;
    fr.contentDocument.querySelectorAll('.xl-hal').forEach(h => { h.style.display = !nama || h.dataset.sheet === nama ? '' : 'none'; });
    document.querySelectorAll('#mp298Pv .mp298-tab button').forEach(b => b.classList.toggle('on', (b.dataset.s || '') === (nama || '')));
  };
  window.mp298PvCetak = () => { const f = window.mp296CetakFrame; if (typeof f === 'function') return f('mp298Frame', PV.x && PV.x.nama); const fr = $('mp298Frame'); if (fr) { fr.contentWindow.focus(); fr.contentWindow.print(); } };
  window.mp298PvUnduh = () => { if (PV.x) unduhBytes(PV.x.bytes, PV.x.nama); };
  window.mp298Pratinjau = async progresId => {
    progresId = progresId || progresAktif(); if (!progresId) { pesan('Pilih BK / paket tagihan terlebih dahulu.', 'err'); return; }
    tutupPv();
    const w = document.createElement('div'); w.id = 'mp298Pv'; w.className = 'mp270-latar atas mp298-latar';
    w.innerHTML = `<div class="mp270-dlg pv mp293-dlg mp298-dlg" role="dialog" aria-modal="true" aria-label="Pratinjau & Cetak PDF"><header><b id="mp298PvJdl">Pratinjau &amp; Cetak PDF · Excel backup</b>
      <div class="d-flex gap-2 flex-wrap align-items-center"><span class="mp298-tab" id="mp298Tab"></span>
      <button class="btn btn-sm btn-primary" id="mp298BtnCetak" disabled onclick="mp298PvCetak()"><i class="fas fa-print me-1"></i>Cetak / Simpan PDF (A4)</button>
      <button class="btn btn-sm btn-outline-success" id="mp298BtnXl" disabled onclick="mp298PvUnduh()"><i class="fas fa-file-excel me-1"></i>Unduh Excel Backup (.xlsx)</button>
      <button class="btn-close" aria-label="Tutup" onclick="mp298PvTutup()"></button></div></header>
      <div class="mp298-info" id="mp298PvInfo"></div>
      <div class="mp293-isi"><div class="mp293-muat" id="mp298Muat"><i class="fas fa-spinner fa-spin me-2"></i>Membaca berkas Excel backup…</div><iframe id="mp298Frame" title="Pratinjau cetak Excel backup" hidden></iframe></div></div>`;
    w.addEventListener('keydown', ev => { if (ev.key === 'Escape') tutupPv(); });
    document.body.appendChild(w);
    try {
      const x = await berkas(progresId); if (!$('mp298Pv')) return; PV.x = x;
      const XLH = window.XLH, XLR = window.XLR; if (!XLH || !XLR) throw new Error('Penampil Excel (XLR, 2.9.3+) belum terpasang.');
      const W = await XLH.muat(x.bytes), { hasil } = XLH.hitungSemua(W), f = x.f || (W.byNama.ITEM ? 'spm' : 'bap');
      const C = window.MP296 || {}, gbr = (window.__MP293_GAMBAR || {})[f] || {}, lembar = LEMBAR[f].filter(n => W.byNama[n.toUpperCase()]);
      const html = lembar.map(n => XLR.render(W, hasil, n, { gantiGambar: gbr, margin: C.margin, kop: C.kop })).join('');
      const fr = $('mp298Frame'); if (!fr) return;
      fr.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><title>' + E(x.nama.replace(/\.xlsx$/i, '')) + '</title><style>body{margin:0;padding:18px 0;background:#8a94a3}@page{size:A4 portrait}' + XLR.CSS + (C.cssXL || '') + '</style></head><body>' + html + '</body></html>';
      fr.hidden = false; const m = $('mp298Muat'); if (m) m.remove();
      $('mp298Tab').innerHTML = `<button class="on" data-s="" onclick="mp298PvLembar('')">Semua</button>` + lembar.map(s => `<button data-s="${E(s)}" onclick="mp298PvLembar(this.dataset.s)">${E(JUDUL[s] || s)}</button>`).join('');
      $('mp298PvInfo').innerHTML = `<i class="fas fa-file-excel me-1"></i><b>${E(x.nama)}</b> · ${x.dari === 'arsip' ? 'berkas arsip ' + E(x.data.folder || '') + ' · ' + E(String(x.data.pada || '').replace('T', ' ').slice(0, 16)) + (x.data.url ? ` · <a href="${E(x.data.url)}" target="_blank" rel="noopener">buka di Drive</a>` : '') : 'disusun dari data perangkat (belum tersimpan di arsip)'}`;
      $('mp298BtnCetak').disabled = false; $('mp298BtnXl').disabled = false;
    } catch (e) { const m = $('mp298Muat'); if (m) m.innerHTML = '<div class="alert alert-warning m-3">Pratinjau tidak dapat disusun: ' + E(e.message) + '</div>'; }
  };

  /* ---------- tombol di dialog Paket Tagihan ---------- */
  function infoBackup(T) {
    const st = ANTRE.status[T.l && T.l.progresId] || {}, b = (T.baca && T.baca.backupExcel) || (st.data) || null;
    if (st.sedang) return '<span class="mp298-st proses"><i class="fas fa-spinner fa-spin me-1"></i>menyusun backup Excel…</span>';
    if (b) return `<span class="mp298-st ok" title="${E(b.folder || '')}"><i class="fas fa-circle-check me-1"></i>Backup Excel: ${b.url ? `<a href="${E(b.url)}" target="_blank" rel="noopener">${E(b.nama)}</a>` : E(b.nama)} · ${E(String(b.pada || '').replace('T', ' ').slice(0, 16))}</span>`;
    if (st.galat) return `<span class="mp298-st galat"><i class="fas fa-triangle-exclamation me-1"></i>Backup gagal: ${E(st.galat)}</span>`;
    return `<span class="mp298-st wajib"><i class="fas fa-paperclip me-1"></i>Backup Excel belum tersimpan${T.baca && T.baca.backupWajib ? ' (wajib sebelum Siap Diperiksa)' : ''}</span>`;
  }
  function gambarDialog() {
    const dlg = $('mp270Dlg'); if (!dlg) return;
    let T = null; try { T = window.mp270Aktif && window.mp270Aktif(); } catch (e) { }
    let w = $('mp298Aksi');
    if (!T || !T.g || !formatDari(T.g.key) || !(T.l && T.l.progresId)) { if (w) w.remove(); return; }
    const acuan = dlg.querySelector('button[onclick="mp270Pratinjau()"]'); if (!acuan) return;
    if (!w) { w = document.createElement('div'); w.id = 'mp298Aksi'; w.className = 'mp298-aksi'; (acuan.parentElement || dlg).insertAdjacentElement('afterend', w); }
    const pid0 = JSON.stringify(T.l.progresId).replace(/"/g, '&quot;');
    const html = `<button type="button" class="btn btn-sm btn-success" onclick="mp298Unduh(${pid0}, this)"><i class="fas fa-file-excel me-1"></i>Unduh Excel Backup (.xlsx)</button>
      <button type="button" class="btn btn-sm btn-outline-primary" onclick="mp298Pratinjau(${pid0})"><i class="fas fa-file-pdf me-1"></i>Pratinjau &amp; Cetak PDF</button>
      ${boleh() ? `<button type="button" class="btn btn-sm btn-light border" title="Susun ulang dari Register Kontrak & Input Progres terkini lalu simpan ke arsip" onclick="mp298SusunUlang(${pid0}, this)"><i class="fas fa-rotate me-1"></i>Susun ulang backup</button>` : ''}
      ${infoBackup(T)}`;
    if (w.dataset.h !== html) { w.innerHTML = html; w.dataset.h = html; }
  }
  /* ---------- tombol di Pembentuk Tagihan (baris BK) ---------- */
  function gambarPembentuk() {
    const el = $('mp280Isi'); if (!el) return;
    el.querySelectorAll('tr[data-id]').forEach(tr => {
      const e = progresSemua().find(x => x.id === tr.dataset.id); const td = tr.lastElementChild;
      if (!e || !td || !formatDari(e.noKontrak) || td.querySelector('.mp298-mini')) return;
      const id = JSON.stringify(e.id).replace(/"/g, '&quot;');
      td.insertAdjacentHTML('beforeend', `<span class="mp298-mini"><button type="button" class="btn btn-sm btn-outline-success py-0" title="Unduh Excel Backup (.xlsx)" onclick="mp298Unduh(${id}, this)"><i class="fas fa-file-excel"></i></button><button type="button" class="btn btn-sm btn-outline-primary py-0" title="Pratinjau & Cetak PDF" onclick="mp298Pratinjau(${id})"><i class="fas fa-file-pdf"></i></button></span>`);
    });
  }
  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(() => { try { gambarDialog(); gambarPembentuk(); } catch (e) { } }, 250); };
  const awasi = () => { if (!document.body) return; new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length && ![...x.addedNodes].every(n => n.nodeType === 1 && n.closest && n.closest('#mp298Aksi, #mp298Pv')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); jadwal(); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();
