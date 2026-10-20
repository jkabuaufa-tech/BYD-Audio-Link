  /* ======================= [2.5.6] UNGGAH PDF CHECKLIST — TANPA AI =======================
   * Penyimpanan dokumen terpisah dari pembacaan AI: PDF → Google Drive (unggahPdf kernel, kompres > 10 MB tetap) → idServer wajib → Simpan checklist.
   * Status tahap demi tahap, sebab gagal yang spesifik, dan "Coba lagi" yang aman:
   *  · PDF yang sudah diterima server pada sesi ini dipakai ulang (tidak diunggah dua kali);
   *  · bila koneksi putus saat mengunggah, sebelum mengunggah ulang aplikasi mencari sidik SHA-256 berkas di Manifest server
   *    (manifestBaca, baca saja) — bila sudah sampai di Drive, berkas itu yang dipakai (tidak ada dokumen ganda).
   * Berkas lama TIDAK dihapus/ditimpa saat diganti; riwayat unggahan baris dapat dilihat dari Manifest. */
  const UNGGAH = {}, RAGU = {};   // UNGGAH: baris|sidik → ref server (sesi ini) · RAGU: sidik yang hasil unggahnya tidak pasti (koneksi putus)
  async function sidikPdf(file) {
    try { if (!(window.crypto && crypto.subtle && file && file.arrayBuffer)) return ''; const d = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { return ''; }
  }
  function sebabUnggah(err) {
    const m = String((err && err.message) || err || ''), putus = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (/bukan PDF|harus PDF|PDF yang (sah|valid)|Tidak ada berkas/i.test(m)) return { jenis: 'format', judul: 'Berkas bukan PDF yang sah', saran: 'Pilih berkas PDF asli (bukan foto atau berkas yang hanya diganti ekstensinya).', ulang: false };
    if (/maksimal\s*(10|30|60)\s*MB|terlalu besar|di atas 10 MB|\b413\b|too large|payload/i.test(m)) return { jenis: 'besar', judul: 'File terlalu besar', saran: 'Batas simpan 10 MB per PDF; pilihan sampai 30 MB dikompres otomatis. Pisahkan PDF atau scan ulang 150–200 dpi.', ulang: false };
    if (putus || /failed to fetch|networkerror|network error|load failed|koneksi|terputus|timeout|timed out|waktu habis|ERR_[A-Z_]+|offline|aborted|jaringan/i.test(m)) return { jenis: 'koneksi', judul: 'Koneksi terputus', saran: 'Periksa internet, lalu klik Coba lagi. Bila PDF ternyata sudah sampai di Drive, aplikasi memakainya kembali — tidak dibuat berkas ganda.', ulang: true };
    if (/Lihat saja|izin|permission|denied|tidak berhak|tidak diizinkan|unauthori[sz]ed|forbidden|\b40[13]\b|sesi berakhir|masuk (dahulu|ulang)|bukan milik proyek/i.test(m)) return { jenis: 'izin', judul: 'Izin ditolak', saran: 'Akun atau izin Google Drive tidak mengizinkan penyimpanan. Pastikan peran Pengadaan/Admin dan sesi masih aktif (masuk ulang); bila tetap ditolak, Admin memeriksa akses folder Drive proyek.', ulang: true };
    return { jenis: 'simpan', judul: 'Penyimpanan gagal', saran: 'Server / Google Drive belum menyimpan berkas. Klik Coba lagi; bila berulang, sampaikan pesan ini kepada Admin.', ulang: true };
  }
  async function cariDiManifest(sidik) {   // unggahan sebelumnya sampai di server tetapi jawabannya hilang?
    if (!/^[0-9a-f]{64}$/.test(sidik || '')) return null;
    try {
      const r = await regAksi('manifestBaca'), L = (r.data || []).filter(x => x && x.id && String(x.sha256 || '').toLowerCase() === sidik && /CHECKLIST/i.test(String(x.jenis || '')));
      const x = L[L.length - 1]; if (!x) return null;
      return { id: 'mf' + String(x.id).slice(-12), idServer: x.id, nama: x.nama, ukuran: x.ukuran, jenis: 'CHECKLIST', ket: x.ket, lokasi: 'server', tipe: 'application/pdf' };
    } catch (e) { return null; }
  }
  function statusUnggah(html, kelas) { const el = document.getElementById('mp219UpStatus'); if (el) { el.className = 'mp256-up ' + (kelas || ''); el.innerHTML = html; el.hidden = !html; } }
  function tahapUnggah(aktifKe, L, ket) {
    statusUnggah(`<ol class="mp256-tahap">${L.map((t, i) => `<li class="${i < aktifKe ? 'ok' : i === aktifKe ? 'jalan' : ''}"><i class="fas ${i < aktifKe ? 'fa-circle-check' : i === aktifKe ? 'fa-spinner fa-spin' : 'fa-circle'}"></i>${E(t)}</li>`).join('')}</ol>${ket ? `<div class="sub">${E(ket)}</div>` : ''}`, 'jalan');
  }
  window.mp219ClUploadSimpan = async k => {
    const f = (document.getElementById('mp219UpFile') || {}).files, file = f && f[0], pesan = document.getElementById('mp219UpPesan'), ok = document.getElementById('mp219UpOk');
    const salah = m => { if (pesan) pesan.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0">' + E(m) + '</div>'; };
    if (pesan) pesan.innerHTML = '';
    if (!file) return salah('Pilih file PDF terlebih dahulu.');
    if (F.sibukUp) return;
    const tg = (document.getElementById('mp219UpTgl') || {}).value || '', kt = (document.getElementById('mp219UpKet') || {}).value || '';
    if (tg && !/^\d{4}-\d{2}-\d{2}$/.test(tg)) return salah('Tanggal tidak valid.');
    try { await cekPdf(file); } catch (e) { const s = sebabUnggah(e); statusUnggah(`<b><i class="fas fa-circle-xmark me-1"></i>Gagal — ${E(s.judul)}</b><div>${E(e.message)}</div><div class="sub">${E(s.saran)}</div>`, 'gagal'); return; }
    const TAHAP = ['Menyiapkan PDF' + (file.size > 10 * 1048576 ? ' (kompres otomatis > 10 MB)' : ''), 'Mengunggah ke Google Drive', 'Memastikan berkas tersimpan di server (idServer)', 'Menyimpan checklist'];
    let tahap = 0, ref = null, sidik = '';
    F.sibukUp = true; if (ok) { ok.disabled = true; ok.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sedang mengunggah…'; }
    try {
      ambilForm();
      tahapUnggah(0, TAHAP);
      const siap = typeof window.mp222SiapkanPdf === 'function' ? await window.mp222SiapkanPdf(file) : file;   // kompres sekali per berkas (cache kernel 2.2.2)
      sidik = (await sidikPdf(siap)) || ['n', file.name, file.size, file.lastModified].join('|');
      const kunciU = k + '|' + sidik;
      ref = UNGGAH[kunciU] || null;
      tahap = 1;
      if (ref) tahapUnggah(1, TAHAP, 'PDF yang sama sudah diterima server pada percobaan sebelumnya — tidak diunggah ulang.');
      else if (RAGU[sidik]) { tahapUnggah(1, TAHAP, 'Memeriksa apakah percobaan sebelumnya sudah sampai di Drive…'); ref = await cariDiManifest(sidik); if (ref) UNGGAH[kunciU] = ref; }
      if (!ref) { tahapUnggah(1, TAHAP, ukuranTeks(siap)); ref = await unggahPdf(siap, { jenis: 'CHECKLIST', ket: F.rec.noKontrak + ' · ' + k }); }
      tahap = 2; tahapUnggah(2, TAHAP);
      if (!ref || !ref.idServer) throw new Error('PDF belum tersimpan di server (Google Drive): server tidak mengembalikan idServer. Dokumen tidak dihitung lengkap.');
      UNGGAH[kunciU] = ref; delete RAGU[sidik];
      F.rec.items[k] = Object.assign({}, F.rec.items[k] || {}, { status: 'ADA', file: ref, tgl: tg, ket: kt.trim().slice(0, 350), alasan: '' });
      F.dirty = true; gambarPanel();
      tahap = 3; tahapUnggah(3, TAHAP, 'PDF sudah di Google Drive. Menyimpan checklist agar tercatat permanen…');
      F.galatSimpan = '';
      const tersimpan = await simpan('PDF ' + file.name + ' tersimpan di Google Drive & checklist diperbarui.');
      if (!tersimpan) throw new Error(F.galatSimpan || 'Checklist belum tersimpan.');
      statusUnggah(`<b><i class="fas fa-circle-check me-1"></i>Berhasil</b><div>PDF tersimpan di Google Drive dan checklist tersimpan di server.</div><div class="sub">Status dokumen: <b>Ada (tersimpan)</b> — belum berarti LOLOS verifikasi. Verifikasi tetap oleh Admin sesuai gerbang yang berlaku.</div>`, 'ok');
      if (ok) { ok.disabled = false; ok.textContent = 'Tutup'; ok.onclick = () => tutupLapis(); }
      setTimeout(() => { const s = document.getElementById('mp219UpStatus'); if (s && /\bok\b/.test(s.className)) tutupLapis(); }, 2200);
    } catch (err) {
      const s = sebabUnggah(err), diDrive = tahap >= 3 && ref && ref.idServer;
      if (tahap === 1 && (s.jenis === 'koneksi' || s.jenis === 'simpan') && sidik) RAGU[sidik] = 1;
      statusUnggah(`<b><i class="fas fa-circle-xmark me-1"></i>Gagal — ${E(diDrive ? 'Checklist belum tersimpan' : s.judul)}</b><div>${E(err.message || err)}</div>
        ${diDrive ? '<div class="mp256-up-drive"><i class="fas fa-cloud me-1"></i>PDF <b>sudah tersimpan</b> di Google Drive, tetapi checklist <b>belum tersimpan</b>. "Coba lagi" hanya menyimpan checklist — PDF tidak diunggah ulang.</div>' : ''}
        <div class="sub">${E(diDrive ? 'Bila pesan menyebut versi/konflik, tutup dialog lalu buka ulang checklist; PDF tetap tersedia di Drive.' : s.saran)}</div>`, 'gagal');
      if (ok) { ok.disabled = false; ok.innerHTML = s.ulang || diDrive ? '<i class="fas fa-rotate-right me-1"></i>Coba lagi' : 'Simpan'; }
    } finally { F.sibukUp = false; }
  };
  function ukuranTeks(f) { return f && f.size ? 'Ukuran ' + (f.size / 1048576).toFixed(2).replace('.', ',') + ' MB' : ''; }
  // [2.5.6] riwayat berkas baris checklist dari Manifest server (baca saja) — berkas lama tetap ada di Drive & dapat dibuka
  window.mp256RiwayatBerkas = async k => {
    const el = document.getElementById('mp219UpRiwayat'); if (!el || !F.rec) return;
    el.hidden = false; el.innerHTML = '<span class="text-muted"><i class="fas fa-spinner fa-spin me-1"></i>Membaca riwayat berkas…</span>';
    try {
      const ket = F.rec.noKontrak + ' · ' + k, kini = ((F.rec.items[k] || {}).file || {}).idServer || '';
      const r = await regAksi('manifestBaca'), L = (r.data || []).filter(x => x && x.id && /CHECKLIST/i.test(String(x.jenis || '')) && (String(x.ket || '') === ket || x.id === kini)).reverse();
      window.__mp256Riwayat = L;
      el.innerHTML = L.length ? `<ul class="mp256-riw">${L.map((x, i) => `<li><span><b>${E(String(x.nama || '').replace(/^.* · /, ''))}</b>${x.id === kini ? ' <span class="mp256-bd ok">dipakai</span>' : ''}<small>${E(String(x.waktu || '').replace('T', ' ').slice(0, 16))} · ${E(x.oleh || '-')} · ${Math.max(1, Math.round((Number(x.ukuran) || 0) / 1024))} KB</small></span><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp256BukaRiwayat(${i})"><i class="fas fa-eye"></i></button></li>`).join('')}</ul><div class="sub">Sumber: Manifest SHA-256 server. Unggahan sebelum Manifest aktif mungkin tidak tercantum.</div>`
        : '<span class="text-muted">Belum ada riwayat di Manifest untuk baris ini (unggahan lama sebelum Manifest aktif tidak tercantum).</span>';
    } catch (e) { el.innerHTML = '<span class="text-danger">Riwayat tidak dapat dibaca: ' + E(e.message) + '</span>'; }
  };
  window.mp256BukaRiwayat = i => { const x = (window.__mp256Riwayat || [])[i]; if (!x) return; const ref = { id: 'mfh' + String(x.id).slice(-12), idServer: x.id, nama: x.nama, ukuran: x.ukuran, lokasi: 'server', tipe: 'application/pdf' };
    try { BERKAS_REF[ref.id] = ref; lihatBerkas(ref.id); } catch (e) { notif('PDF tidak dapat dibuka: ' + e.message, 'err'); } };
  /* [2.5.6] MODE CHECKLIST: Manual (Tanpa AI) / AI — pilihan per perangkat; tidak mengubah data, syarat checklist, gerbang verifikasi, atau hak akses */
  const MODE_KUNCI = 'MP256_MODE_CHECKLIST';
  const aiTersedia = () => { const VT = window.MP230_VT; return !!(VT && VT.info && (VT.info.penyedia || []).length); };
  function modeCl() { let m = ''; try { m = localStorage.getItem(MODE_KUNCI) || ''; } catch (e) { } return m === 'manual' || m === 'ai' ? m : (aiTersedia() ? 'ai' : 'manual'); }
  window.mp256ModeManual = () => modeCl() === 'manual';
  window.mp256SetMode = m => { try { localStorage.setItem(MODE_KUNCI, m === 'ai' ? 'ai' : 'manual'); } catch (e) { } if (F.rec) { if (typeof window.mp219ClTab === 'function' && m === 'manual' && window.MP230_VT && window.MP230_VT.clAktif) window.mp219ClTab('checklist'); else gambarPanel(); }
    notif(m === 'ai' ? 'Mode AI: verifikasi AI berjalan otomatis saat checklist lengkap (bila penyedia AI tersedia).' : 'Mode Manual (Tanpa AI): unggah PDF per baris lalu Simpan. Tidak memakai API key / kuota AI.', 'ok'); };
  function tandaiTersimpan() { F.idSimpan = new Set(Object.values((F.rec && F.rec.items) || {}).map(v => v && v.file && v.file.idServer).filter(Boolean)); }
  const tersimpanDiServer = v => !!(v && v.file && v.file.idServer && (!F.dirty || (F.idSimpan && F.idSimpan.has(v.file.idServer))));
  const NAMA_GERBANG = { kunci: 'Kunci', wajib: 'Wajib', peringatan: 'Peringatan' };
  function stripMode() {
    if (!F.rec || !(bisaUbah() || adm())) return '';
    const man = modeCl() === 'manual', VT = window.MP230_VT || {}, info = VT.info || {}, gb = (info.setelan || {}).gerbang || 'kunci';
    const tunda = docs(F.rec.kategori).filter(d => { const v = F.rec.items[d.k]; return v && v.file && v.file.idServer && !tersimpanDiServer(v); }).length;
    return `<div class="mp256-mode"><div class="mp256-seg" role="group" aria-label="Mode checklist">
        <button type="button" class="${man ? 'on' : ''}" aria-pressed="${man}" onclick="mp256SetMode('manual')"><i class="fas fa-hand me-1"></i>Manual (Tanpa AI)</button>
        <button type="button" class="${man ? '' : 'on'}" aria-pressed="${!man}" onclick="mp256SetMode('ai')" ${VT.info && !aiTersedia() ? 'title="Belum ada penyedia AI pembaca PDF aktif"' : ''}><i class="fas fa-robot me-1"></i>AI</button></div>
      <div class="mp256-mode-t">${man ? '<b>Mode Manual:</b> pilih jenis dokumen → Upload PDF → tersimpan di Google Drive → <b>Simpan</b>. Tanpa API key / kuota AI.' : '<b>Mode AI:</b> saat checklist lengkap, Verifikasi Dokumen (AI) berjalan otomatis' + (aiTersedia() ? '' : ' — <span class="text-danger">penyedia AI belum aktif</span>') + '. Unggahan PDF tetap tersimpan walau AI gagal.'}
        <span>Unggahan berhasil ≠ LOLOS verifikasi. Verifikasi Admin & gerbang bayar (<b>${E(NAMA_GERBANG[gb] || gb)}</b>) tetap berlaku${gb !== 'peringatan' ? '; tanpa hasil AI yang LOLOS, Admin mengisi alasan pengecualian (min. 20 karakter)' : ''}.</span></div></div>
      ${tunda ? `<div class="mp256-tunda" role="status"><i class="fas fa-triangle-exclamation me-1"></i>${tunda} PDF sudah tersimpan di Google Drive tetapi checklist <b>belum disimpan</b>. Klik <b>Simpan</b> agar tercatat permanen.</div>` : ''}
      ${window.mp256BannerAI ? window.mp256BannerAI(F.rec.id) : ''}`;
  }
  // [2.5.6] bundel: penyimpanan berhasil tetapi analisis AI gagal → informasi jelas + Ulangi AI / Mode Manual (dokumen tersimpan tidak dibatalkan)
  window.mp256BannerAI = id => {
    const VT = window.MP230_VT || {}, g = (VT.gagalAI || {})[id]; if (!g) return '';
    const simpanOk = g.tersimpan > 0;
    return `<div class="mp256-gagal-ai" role="status"><i class="fas fa-robot"></i><div><b>${simpanOk ? 'Penyimpanan berhasil — analisis AI belum berhasil' : 'Analisis bundel belum berhasil'}</b>
      <div>${simpanOk ? E(g.tersimpan + (g.n > 1 ? '/' + g.n + ' bagian' : '') + ' PDF bundel sudah tersimpan di Google Drive dan tidak dihapus.') + ' ' : ''}Sebab: ${E(g.pesan)}</div>
      <div class="sub">Hasil verifikasi lama tidak ditandai baru dan status verifikasi tidak diubah. Ulangi AI nanti (bagian yang sudah selesai tidak diulang), atau lanjutkan dengan Mode Manual: unggah PDF per baris checklist.</div>
      <div class="mp256-gagal-b">${g.file ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp256UlangAI('${E(id)}')"><i class="fas fa-rotate-right me-1"></i>Ulangi analisis AI</button>` : ''}<button type="button" class="btn btn-sm mp219-btn-o" onclick="mp256SetMode('manual')"><i class="fas fa-hand me-1"></i>Beralih ke Mode Manual</button><button type="button" class="btn btn-sm btn-light border" onclick="mp256TutupBanner('${E(id)}')">Sembunyikan</button></div></div></div>`;
  };
  window.mp256UlangAI = id => { const VT = window.MP230_VT || {}, g = (VT.gagalAI || {})[id]; if (!g || !g.file || typeof window.mp240Unggah !== 'function') return; if (window.mp256ModeManual()) { try { localStorage.setItem(MODE_KUNCI, 'ai'); } catch (e) { } } window.mp240Unggah(g.file); };
  window.mp256TutupBanner = id => { const VT = window.MP230_VT || {}; if (VT.gagalAI) delete VT.gagalAI[id]; if (VT.clAktif && typeof window.mp230ClTab === 'function') window.mp230ClTab(); else gambarPanel(); };
