/* Billing Generator 2.0.0 — MODE TERHUBUNG ke Monitoring SAP (modul server 1.10.0, aksi bl*).
 * Monitoring SAP = sumber kebenaran: login & hak akses sama (Admin / Pengadaan / Lihat), paket tagihan, BK, checklist & status bayar
 * dibaca dari server; aplikasi ini menyusun & menerbitkan dokumen (pratinjau, PDF terpisah & bundel → Drive), mengunggah dokumen
 * bertanda tangan, dan memasangnya ke Checklist Tagihan. IndexedDB (JICT_Priuk_Tagihan) hanya untuk salinan baca (offline) &
 * antrean kirim — data resmi selalu lewat server. Kata sandi disimpan di sessionStorage (hilang saat tab ditutup), tidak di berkas.
 * Mode lokal lama (dokumen, master, backup) tetap utuh di app.js. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const E = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const rp = x => BLI.rupiah(x);
  const toast = (m, t) => { try { if (typeof showToast === 'function') showToast(m, t === 'error' ? 'error' : 'ok'); else console.info(m); } catch (e) { } };
  const KUNCI_KONEKSI = 'JICT_BG_KONEKSI', KUNCI_SANDI = 'JICT_BG_SANDI';
  const S = { url: '', nama: '', proyek: '', sandi: '', user: null, fitur: [], daftar: [], paket: null, baca: null, sibuk: '', galat: '', filter: { status: '', kategori: '', cari: '' }, online: navigator.onLine !== false, antrean: 0, reg: [] };

  /* ---------- IndexedDB: salinan baca & antrean ---------- */
  const DB = { _p: null,
    buka() { if (!this._p) this._p = new Promise((ok, no) => { if (!window.indexedDB) return no(new Error('IndexedDB tidak tersedia')); const r = indexedDB.open('JICT_Priuk_Tagihan', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('cache')) d.createObjectStore('cache'); if (!d.objectStoreNames.contains('antrean')) d.createObjectStore('antrean', { keyPath: 'kunciIdem' }); };
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); return this._p; },
    async op(store, mode, fn) { const d = await this.buka(); return new Promise((ok, no) => { const t = d.transaction(store, mode), q = fn(t.objectStore(store)); t.oncomplete = () => ok(q && q.result); t.onerror = () => no(t.error); }); },
    simpan(k, v) { return this.op('cache', 'readwrite', s => s.put(v, k)).catch(() => null); }, ambil(k) { return this.op('cache', 'readonly', s => s.get(k)).catch(() => null); },
    antre(x) { return this.op('antrean', 'readwrite', s => s.put(x)); }, semuaAntre() { return this.op('antrean', 'readonly', s => s.getAll()).then(x => x || []).catch(() => []); }, hapusAntre(k) { return this.op('antrean', 'readwrite', s => s.delete(k)); }
  };
  const kunciCache = k => S.url + '|' + S.proyek + '|' + k;

  /* ---------- koneksi (mekanisme sama dengan Monitoring SAP: POST teks tanpa preflight CORS, ikuti redirect Google) ---------- */
  async function post(body) {
    if (!S.url) throw new Error('URL server Monitoring SAP belum diisi.');
    let r; try { r = await fetch(S.url, { method: 'POST', redirect: 'follow', body: JSON.stringify(body) }); } catch (e) { throw new Error('Koneksi ke server terputus (' + e.message + ').'); }
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { throw new Error('Server mengirim halaman HTML, bukan data (HTTP ' + r.status + '). Jawaban Google terputus — coba lagi; penyimpanan aman diulang.'); }
  }
  async function kirim(action, data) {
    if (!S.sandi) throw new Error('Masuk dahulu (kata sandi belum diisi di sesi ini).');
    const r = await post(Object.assign({ action, nama: S.nama, pin: S.sandi, proyek: S.proyek }, data === undefined ? {} : { data }));
    if (!r || !r.ok) throw new Error((r && r.error) || 'Gagal'); return r;
  }
  async function tulis(action, data, bolehAntre) {
    try { return await BLK.tulisAman(kirim, action, data); }
    catch (e) { if (bolehAntre && BLK.putus(e)) { const x = { kunciIdem: data.kunciIdem || BLK.kunciIdem(action), action, data: Object.assign({}, data), pada: new Date().toISOString() }; x.data.kunciIdem = x.kunciIdem; await DB.antre(x); await hitungAntre(); toast('Offline: perubahan masuk antrean & dikirim otomatis saat koneksi pulih.', 'ok'); return null; } throw e; }
  }
  async function hitungAntre() { S.antrean = (await DB.semuaAntre()).length; gambar(); }
  async function kirimAntrean() {
    const L = (await DB.semuaAntre()).sort((a, b) => String(a.pada).localeCompare(String(b.pada)));
    for (const x of L) {
      try { await kirim(x.action, x.data); await DB.hapusAntre(x.kunciIdem); }
      catch (e) { if (BLK.putus(e)) break; await DB.hapusAntre(x.kunciIdem); toast('Antrean ' + x.action + ' ditolak server: ' + e.message, 'error'); }
    }
    await hitungAntre();
  }
  window.addEventListener('online', () => { S.online = true; kirimAntrean().then(muatDaftar); });
  window.addEventListener('offline', () => { S.online = false; gambar(); });

  async function masuk(url, nama, sandi, proyek) {
    S.url = String(url || '').trim(); S.nama = String(nama || '').trim(); S.sandi = String(sandi || ''); S.proyek = String(proyek || '').trim();
    S.sibuk = 'masuk'; S.galat = ''; gambar();
    try {
      if (!/^https:\/\/[^\s/]+\/[^\s]*exec(\?[^\s]*)?$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(S.url)) throw new Error('URL harus URL aplikasi web Apps Script Monitoring SAP (https://script.google.com/macros/s/…/exec).');
      const r = await post({ action: 'login', nama: S.nama, pin: S.sandi, proyek: S.proyek });
      if (!r.ok) throw new Error(r.error || 'Gagal masuk');
      S.user = r.user; S.fitur = r.fitur || []; S.cfg = r.proyek || {};
      if (S.fitur.indexOf('paketTagihan') < 0) throw new Error('Server Monitoring SAP belum memasang Modul server 1.10.0 (fitur paketTagihan). Minta Admin penerbit modul mengunggah server-modul-1.10.0.json.');
      try { localStorage.setItem(KUNCI_KONEKSI, JSON.stringify({ url: S.url, nama: S.nama, proyek: S.proyek })); } catch (e) { }
      try { sessionStorage.setItem(KUNCI_SANDI, S.sandi); } catch (e) { }
      toast('Terhubung ke Monitoring SAP sebagai ' + S.user.nama + ' (' + (S.user.admin ? 'Admin' : S.user.peran) + ').', 'ok');
      S.sibuk = ''; await kirimAntrean(); await muatDaftar();
    } catch (e) { S.galat = e.message; S.user = null; S.sibuk = ''; gambar(); }
  }
  function keluar() { S.user = null; S.sandi = ''; S.paket = null; try { sessionStorage.removeItem(KUNCI_SANDI); } catch (e) { } gambar(); }
  const bolehUbah = () => !!(S.user && S.user.peran === 'PENGADAAN'), admin = () => !!(S.user && S.user.admin);

  async function muatDaftar() {
    if (!S.user) return; S.sibuk = 'daftar'; gambar();
    try { const r = await kirim('blDaftar', { per: 500 }); S.daftar = r.data; S.waktu = r.waktu; await DB.simpan(kunciCache('daftar'), { data: r.data, waktu: r.waktu }); S.dariCache = false; }
    catch (e) { const c = await DB.ambil(kunciCache('daftar')); if (c && BLK.putus(e)) { S.daftar = c.data; S.waktu = c.waktu; S.dariCache = true; } else S.galat = e.message; }
    S.sibuk = ''; gambar();
  }
  async function bukaPaket(id) {
    S.sibuk = 'paket'; gambar();
    try { S.baca = await kirim('blBaca', { id }); S.paket = S.baca.data; await DB.simpan(kunciCache('paket:' + id), S.baca); S.dariCache = false; }
    catch (e) { const c = await DB.ambil(kunciCache('paket:' + id)); if (c && BLK.putus(e)) { S.baca = c; S.paket = c.data; S.dariCache = true; } else S.galat = e.message; }
    S.sibuk = ''; gambar();
  }

  /* ---------- dokumen dari paket server ---------- */
  function setelan() { try { return (typeof settings !== 'undefined' && settings) || {}; } catch (e) { return {}; } }   // let settings di app.js (mode lokal)
  function identitas() {
    const st = setelan(), c = S.cfg || {};
    return { namaKop: c.kso || st.company || '', nama: c.kso || st.company || '',   // identitas proyek dari server Monitoring SAP (sumber kebenaran) alamatKop: st.address || '', alamat: st.address || '', proyek: c.namaLengkap || st.project || '',
      kapro: { nama: c.kapro || st.sign3Name || '', jabatan: st.sign3Title || 'Kepala Proyek' }, kasi: { nama: c.kasi || st.sign2Name || '', jabatan: st.sign2Title || 'Kasi Pengadaan, Logistik & Peralatan' }, kota: 'Jakarta', logo: st.logo || '' };
  }
  function paketCetak() {
    const P = S.paket, B = S.baca || {}, ck = B.checklist, st = {};
    (B.template || []).forEach(s => s.items.forEach(d => { const v = ck && ck.items && ck.items[d.k]; st[d.k] = v ? { status: v.status === 'ADA' ? (ck.verified ? 'TERVERIFIKASI' : 'DIUNGGAH') : v.status === 'NA' ? 'NA' : 'BELUM', ket: v.ket, alasan: v.alasan } : { status: 'BELUM' }; }));
    const lain = S.daftar.filter(x => x.noKontrak === P.noKontrak && x.id !== P.id && x.statusEfektif !== 'BATAL');
    return { kategori: P.kategori, billingId: P.id, kontrak: P.sumber.kontrak, vendor: P.vendor, identitas: identitas(), progres: { id: P.progresId, tagihanKe: P.tagihanKe, periode: P.periode, tanggal: P.tanggalBK, nomorBA: P.nomorBA, kodeBA: P.kodeBA },
      tanggal: P.tanggalDok || P.tanggalBK, revisi: P.revisi, hasil: P.hasil, lampiran: P.lampiran || {}, pembuat: { nama: S.user && S.user.nama, jabatan: S.user && S.user.jabatan },
      riwayatTermin: lain.map(x => ({ tagihanKe: x.tagihanKe, nomor: BLI.nomorDok('BAP', x.tagihanKe, x.noKontrak), jenis: x.jenis, prestasi: (x.prestasi || {}).ini || 0, um: 0, ret: 0, dasar: x.dasarTagihan, ppn: x.ppn, total: x.totalTagihan, pph: x.pph, neto: x.neto, status: x.statusEfektif })),
      checklist: { template: B.template || [], status: st, divisi: ck && ck.divisi, pengajuan: ck && ck.pengajuan } };
  }
  const opsiCetak = () => { const I = identitas(); return { logo: I.logo, namaKop: I.namaKop, alamatKop: I.alamatKop, judul: S.paket && S.paket.id }; };
  function pratinjau(kode) {
    const p = paketCetak(), M = kode ? [BLD.buat(p, kode)].filter(Boolean) : BLD.semua(p);
    const w = $('#printContent'); if (!w) return;
    w.innerHTML = '<iframe id="blFrame" style="width:100%;height:78vh;border:0;background:#8a94a6" title="Pratinjau dokumen tagihan"></iframe>';
    $('#printTitle').textContent = 'Pratinjau ' + (kode ? (BLD.JUDUL[kode] || kode) : 'paket ' + S.paket.id);
    $('#blFrame').srcdoc = BLRH.dokumen(M, opsiCetak());
    const bEdit = $('#btnPreviewEdit'); if (bEdit) bEdit.style.display = 'none';
    const bCetak = document.querySelector('#printOverlay .btn-primary'); if (bCetak) bCetak.setAttribute('onclick', "var f=document.getElementById('blFrame'); if(f) f.contentWindow.print(); else window.print();");
    if (typeof openOverlay === 'function') openOverlay('#printOverlay');
  }
  async function terbitkanPdf(pilih) {
    const P = S.paket; if (!P) return; S.sibuk = 'pdf'; S.pesanPdf = 'Memuat pustaka PDF…'; S.galat = ''; gambar();
    try {
      const PDFLib = await BLK.muatPdfLib(['lib/pdf-lib.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js']), p = paketCetak(), M = BLD.semua(p, pilih), o = opsiCetak();
      let paket = P;
      for (let i = 0; i < M.length; i++) {
        const m = M[i]; S.pesanPdf = 'PDF ' + (i + 1) + '/' + M.length + ' ' + m.judul; gambar();
        const r = await BLRP.satu(PDFLib, m, Object.assign({ kataKunci: [paket.id, m.kode], versiMesin: BLI.VERSI, penulis: 'Billing Generator 2.0.0' }, o));
        const f = await BLK.unggah(kirim, r.bytes, { nama: m.kode + ' ' + paket.tagihanKe + ' Rev' + paket.revisi + '.pdf', jenis: m.kode, ket: paket.noKontrak });
        paket = (await tulis('blDokumen', { id: paket.id, versi: paket.versi, dok: { aksi: 'TERBIT', kode: m.kode, nomor: m.nomor, file: f, sidikHitung: paket.sidik, halaman: r.halaman } })).data;
      }
      S.pesanPdf = 'Menyusun bundel…'; gambar();
      const b = await BLRP.bundel(PDFLib, M, Object.assign({ judul: paket.id, sampul: ['Paket tagihan : ' + paket.id + ' (Rev. ' + paket.revisi + ')', 'Kontrak : ' + paket.noKontrak, 'BK : ' + (paket.nomorBA || '-'), 'Total (+PPN) : ' + rp(paket.hasil.totalTagihan)] }, o));
      const fb = await BLK.unggah(kirim, b.bytes, { nama: 'BUNDEL ' + paket.id + ' Rev' + paket.revisi + '.pdf', jenis: 'BUNDEL', ket: paket.noKontrak });
      await tulis('blDokumen', { id: paket.id, versi: paket.versi, dok: { aksi: 'TERBIT', kode: 'BUNDEL', nomor: paket.id, file: fb, sidikHitung: paket.sidik, halaman: b.halaman } });
      toast(M.length + ' PDF + bundel tersimpan di Drive proyek (paket ' + paket.id + ').', 'ok');
      await bukaPaket(paket.id);
    } catch (e) { S.galat = 'Buat PDF: ' + e.message; }
    S.sibuk = ''; S.pesanPdf = ''; gambar();
  }
  async function unggahTTD(kode, input) {
    const f = input.files && input.files[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) return toast('PDF maksimal 10 MB.', 'error');
    const vendor = ['INVOICE', 'KWITANSI'].indexOf(kode) >= 0; let nilai;
    if (vendor) { const t = prompt('Total pada ' + kode.toLowerCase() + ' resmi vendor (Rp, untuk kontrol silang):', ''); if (t === null) return; nilai = { total: N(String(t).replace(/[^\d]/g, '')) || undefined }; }
    S.sibuk = 'unggah'; gambar();
    try { const ref = await BLK.unggah(kirim, new Uint8Array(await f.arrayBuffer()), { nama: f.name, jenis: kode + (vendor ? '-VENDOR' : '-TTD'), ket: S.paket.noKontrak });
      await tulis('blDokumen', { id: S.paket.id, versi: S.paket.versi, dok: { aksi: vendor ? 'VENDOR' : 'UNGGAH_TTD', kode, file: ref, nilai } }); toast(f.name + ' diunggah.', 'ok'); await bukaPaket(S.paket.id); }
    catch (e) { S.galat = e.message; } S.sibuk = ''; gambar();
  }
  async function keChecklist(documentId) { try { await kirim('blKeChecklist', { id: S.paket.id, pasang: [{ documentId }] }); toast('Dipasang ke Checklist Tagihan (menunggu verifikasi Admin).', 'ok'); await bukaPaket(S.paket.id); } catch (e) { S.galat = e.message; gambar(); } }
  async function ubahStatus(ke) {
    let alasan = ''; if (ke === 'REVISI' || ke === 'BATAL') { alasan = prompt('Alasan (min. 12 karakter):', ''); if (alasan === null) return; }
    try { const r = await tulis('blStatus', { id: S.paket.id, versi: S.paket.versi, ke, alasan }, true); if (r) { toast('Status: ' + ke, 'ok'); await bukaPaket(S.paket.id); await muatDaftar(); } } catch (e) { S.galat = e.message; gambar(); }
  }
  async function ubahData(k, v) {   // data ringan (tanggal dokumen, penandatangan vendor) — server menghitung ulang; dapat diantre saat offline
    const P = S.paket, d = { id: P.id, versi: P.versi }; if (k === 'tanggalDok') d.tanggalDok = v; else d.vendor = Object.assign({}, P.vendor, { [k]: v });
    try { const r = await tulis('blSimpan', d, true); if (r) { S.paket = r.data; toast('Paket diperbarui (v' + r.data.versi + ').', 'ok'); await bukaPaket(P.id); } } catch (e) { S.galat = e.message; gambar(); }
  }

  /* ---------- buat paket dari kontrak Register (item ada di server) ---------- */
  async function bukaBuat() {
    S.sibuk = 'reg'; gambar();
    try { const s = await post({ action: 'baca', jenis: 'list', nama: S.nama, pin: S.sandi, proyek: S.proyek }); if (!s.ok) throw new Error(s.error); S.reg = (s.data || []).filter(r => r.diposting); S.buat = { noKontrak: '', konteks: null }; }
    catch (e) { S.galat = e.message; } S.sibuk = ''; gambar();
  }
  async function pilihKontrak(no) {
    S.buat = { noKontrak: no, konteks: null }; gambar(); if (!no) return;
    try { S.buat.konteks = await kirim('blKonteks', { noKontrak: no }); } catch (e) { S.galat = e.message; } gambar();
  }
  async function buatPaket() {
    const b = S.buat, pid = $('#blBuatBK') && $('#blBuatBK').value, jenis = $('#blBuatJenis') && $('#blBuatJenis').value; if (!b || !b.noKontrak || !pid) return toast('Pilih kontrak & BK.', 'error');
    const reg = S.reg.find(r => r.noKontrak === b.noKontrak);
    try { const r = await tulis('blSimpan', { noKontrak: b.noKontrak, progresId: pid, jenis, sumber: { kontrak: { namaVendor: reg.namaVendor, idVendor: reg.idVendor, nilai: reg.nilai }, items: (reg.items || []).map((it, i) => ({ id: b.noKontrak + '#' + i, kode: it.kode, uraian: it.uraian, sat: it.sat, vol: it.vol, harga: it.harga, wbs: it.wbs })) }, vendor: { nama: reg.namaVendor } });
      S.buat = null; toast('Paket ' + r.data.id + ' dibuat.', 'ok'); await muatDaftar(); await bukaPaket(r.data.id); } catch (e) { S.galat = e.message; gambar(); }
  }
  async function simpanKonfig() {
    const b = S.buat, k = b.konteks.konfig, v = id => $('#' + id).value;
    const konfig = { kategori: v('blKfKat'), uangMukaPersen: N(v('blKfUM')), retensiPersen: N(v('blKfRet')), ppn: { skema: v('blKfSkema'), tarif: v('blKfTarif') === '' ? null : N(v('blKfTarif')), dipungut: $('#blKfDip').checked, pembilang: 11, penyebut: 12 }, pph: { jenis: v('blKfPphJ'), tarif: N(v('blKfPph')) } };
    let alasan = ''; if (k.versi) { alasan = prompt('Alasan perubahan konfigurasi (min. 8 karakter):', ''); if (alasan === null) return; }
    try { await kirim('blKonfigSimpan', { noKontrak: b.noKontrak, versi: k.versi || 0, konfig, alasan }); toast('Konfigurasi tersimpan.', 'ok'); await pilihKontrak(b.noKontrak); } catch (e) { S.galat = e.message; gambar(); }
  }

  /* ---------- tampilan ---------- */
  const lencana = s => `<span class="bl-st bl-st-${String(s || '').replace(/\s+/g, '-').toLowerCase()}">${E(s)}</span>`;
  function gambar() {
    const w = $('#blPanel'); if (!w) return;
    if (!S.user) {
      const c = (() => { try { return JSON.parse(localStorage.getItem(KUNCI_KONEKSI) || '{}'); } catch (e) { return {}; } })();
      w.innerHTML = `<div class="bl-kop"><h2>🔗 Mode Terhubung — Monitoring SAP</h2><span class="bl-ket">Paket tagihan dari kontrak & BK Monitoring SAP (modul server 1.10.0). Dokumen lokal di bawah tetap dapat dipakai tanpa koneksi.</span></div>
        <form class="bl-masuk" onsubmit="event.preventDefault(); blMasuk()">
          <label>URL server (Apps Script …/exec)<input id="blUrl" value="${E(S.url || c.url || '')}" placeholder="https://script.google.com/macros/s/…/exec" required></label>
          <label>Nama pengguna<input id="blNama" value="${E(S.nama || c.nama || '')}" required autocomplete="username"></label>
          <label>Kata sandi<input id="blSandi" type="password" required autocomplete="current-password"></label>
          <label>ID proyek<input id="blProyek" value="${E(S.proyek || c.proyek || '1726012')}" required></label>
          <button class="btn btn-primary" ${S.sibuk ? 'disabled' : ''}>${S.sibuk === 'masuk' ? 'Menghubungkan…' : 'Masuk'}</button></form>
        ${S.galat ? `<div class="bl-galat">${E(S.galat)}</div>` : ''}<p class="bl-ket">Kata sandi hanya disimpan selama tab ini terbuka (sessionStorage). Hak akses mengikuti akun Monitoring SAP.</p>`;
      return;
    }
    const F = S.filter, L = S.daftar.filter(x => (!F.status || x.statusEfektif === F.status) && (!F.kategori || x.kategori === F.kategori) && (!F.cari || (x.id + ' ' + x.noKontrak + ' ' + x.namaVendor).toLowerCase().indexOf(F.cari.toLowerCase()) >= 0));
    const jml = (A, k) => A.reduce((a, x) => a + N(x[k]), 0), st = s => S.daftar.filter(x => [].concat(s).indexOf(x.statusEfektif) >= 0);
    w.innerHTML = `<div class="bl-kop"><h2>🔗 Monitoring SAP · proyek ${E(S.proyek)}</h2><span class="bl-ket">${E(S.user.nama)} (${S.user.admin ? 'Admin' : E(S.user.peran)}) · ${S.online ? 'online' : '<b>offline</b>'}${S.dariCache ? ' · <b>salinan perangkat</b>' : ''}${S.antrean ? ' · ' + S.antrean + ' perubahan di antrean' : ''}</span>
        <span class="bl-aksi"><button class="btn btn-sm" onclick="blMuat()">⟳ Muat ulang</button>${bolehUbah() ? '<button class="btn btn-sm btn-primary" onclick="blBukaBuat()">+ Paket dari kontrak Register</button>' : ''}<button class="btn btn-sm" onclick="blKeluar()">Keluar</button></span></div>
      ${S.galat ? `<div class="bl-galat">${E(S.galat)} <button class="btn btn-sm" onclick="blTutupGalat()">×</button></div>` : ''}
      <div class="bl-kpi">${[['Paket aktif', S.daftar.filter(x => x.statusEfektif !== 'BATAL').length, ''], ['Menunggu dokumen', st('MENUNGGU DOKUMEN').length, rp(jml(st('MENUNGGU DOKUMEN'), 'totalTagihan')) + ' +PPN'], ['Perlu revisi', st('REVISI').length, ''], ['Terverifikasi', st('TERVERIFIKASI').length, ''],
        ['Diajukan / proses', st(['DIAJUKAN', 'PROSES PEMBAYARAN']).length, 'neto ' + rp(jml(st(['DIAJUKAN', 'PROSES PEMBAYARAN']), 'neto'))], ['Dibayar', st('DIBAYAR').length, 'neto ' + rp(jml(st('DIBAYAR'), 'neto'))]].map(k => `<div><span>${k[0]}</span><b>${k[1]}</b><i>${k[2]}</i></div>`).join('')}</div>
      ${S.buat ? panelBuat() : ''}
      <div class="bl-filter"><select onchange="blFilter('status',this.value)"><option value="">Semua status</option>${BLI.STATUS.map(s => `<option ${F.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <select onchange="blFilter('kategori',this.value)"><option value="">Semua kategori</option>${BLI.KATEGORI.map(s => `<option ${F.kategori === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <input placeholder="Cari paket / kontrak / vendor" value="${E(F.cari)}" oninput="blFilter('cari',this.value)"></div>
      <div class="bl-tabel"><table class="master-table"><thead><tr><th>Paket</th><th>Kontrak / Vendor</th><th>Kat.</th><th>Ke</th><th class="num">Tagihan (DPP)</th><th class="num">Total +PPN</th><th class="num">Neto</th><th>Checklist</th><th>Status</th></tr></thead>
        <tbody>${L.map(x => `<tr class="${S.paket && S.paket.id === x.id ? 'bl-pilih' : ''}" onclick="blBuka('${E(x.id)}')" style="cursor:pointer"><td><code>${E(x.id)}</code></td><td><code>${E(x.noKontrak)}</code><div class="muted">${E(x.namaVendor)}</div></td><td>${E(x.kategori)}</td><td>${E(x.tagihanKe)}</td>
          <td class="num">${rp(x.dasarTagihan)}</td><td class="num">${rp(x.totalTagihan)}</td><td class="num">${rp(x.neto)}</td><td>${x.checklist ? x.checklist.lengkap + '/' + x.checklist.total + (x.checklist.verified ? ' ✓' : '') : '-'}</td><td>${lencana(x.statusEfektif)}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Belum ada paket tagihan.</td></tr>'}</tbody></table></div>
      ${S.paket ? panelPaket() : ''}`;
  }
  function panelBuat() {
    const b = S.buat, k = b.konteks && b.konteks.konfig;
    return `<div class="bl-kartu"><h3>Paket baru dari kontrak Register</h3><p class="bl-ket">Kontrak Master (data Excel tertanam) dibuatkan paket dari aplikasi Monitoring SAP; di sini tersedia kontrak Register yang itemnya tersimpan di server.</p>
      <label>Kontrak<select onchange="blPilihKontrak(this.value)"><option value="">— pilih —</option>${S.reg.map(r => `<option ${b.noKontrak === r.noKontrak ? 'selected' : ''} value="${E(r.noKontrak)}">${E(r.noKontrak)} · ${E(r.namaVendor)}</option>`).join('')}</select></label>
      ${b.konteks ? `<label>BK (Input Progres)<select id="blBuatBK">${b.konteks.progres.filter(p => !p.paket).map(p => `<option value="${E(p.id)}">ke-${E(p.tagihanKe)} · ${E(p.nomorBA)} · ${rp(p.nilai)}</option>`).join('')}</select></label>
        <label>Jenis<select id="blBuatJenis"><option value="PROGRES">Progres</option><option value="UANG_MUKA">Uang muka</option><option value="RETENSI">Pelepasan retensi</option></select></label>
        <details ${k && k.ppn && k.ppn.skema ? '' : 'open'}><summary>Konfigurasi tagihan kontrak ${k && k.versi ? '(versi ' + k.versi + ')' : '(belum diatur)'}</summary><div class="bl-g">
          <label>Kategori<select id="blKfKat">${BLI.KATEGORI.map(x => `<option ${b.konteks.kategori === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label>Uang muka %<input id="blKfUM" type="number" step="any" value="${E(k.uangMukaPersen)}"></label><label>Retensi %<input id="blKfRet" type="number" step="any" value="${E(k.retensiPersen)}"></label>
          <label>Skema PPN<select id="blKfSkema"><option value="">— pilih —</option>${BLI.SKEMA_PPN.map(s => `<option ${k.ppn.skema === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label>Tarif PPN %<input id="blKfTarif" type="number" step="any" value="${k.ppn.tarif === null ? '' : E(k.ppn.tarif)}" placeholder="wajib"></label>
          <label class="cek"><input id="blKfDip" type="checkbox" ${k.ppn.dipungut ? 'checked' : ''}> PPN dipungut pemungut</label>
          <label>Jenis PPh<input id="blKfPphJ" value="${E(k.pph.jenis)}"></label><label>Tarif PPh %<input id="blKfPph" type="number" step="any" value="${E(k.pph.tarif)}"></label></div>
          <button class="btn btn-sm" onclick="blSimpanKonfig()">Simpan konfigurasi</button></details>
        <div class="modal-actions"><button class="btn" onclick="blBatalBuat()">Batal</button><button class="btn btn-primary" onclick="blBuatPaket()">Buat paket</button></div>` : ''}</div>`;
  }
  function panelPaket() {
    const P = S.paket, B = S.baca || {}, h = P.hasil, ef = B.efektif || P.status, ok = bolehUbah() && BLI.TERKUNCI.indexOf(ef) < 0 && S.online, tm = h.temuan.concat(P.temuanServer || []);
    const D = (P.dokumen || []), daftar = BLD.daftar(P.kategori);
    const tr = []; if (ok) { if (P.status === 'DRAFT' || P.status === 'REVISI') tr.push('DALAM PENYUSUNAN'); if (P.status === 'DALAM PENYUSUNAN') tr.push('MENUNGGU DOKUMEN'); if (P.status === 'MENUNGGU DOKUMEN') tr.push('SIAP DIPERIKSA'); }
    return `<div class="bl-kartu"><div class="bl-kop"><h3>Paket <code>${E(P.id)}</code> · Rev. ${E(P.revisi)} ${lencana(ef)}</h3><span class="bl-aksi">
        <button class="btn btn-sm" onclick="blPratinjau()">🖨️ Pratinjau semua</button>${ok ? `<button class="btn btn-sm btn-primary" ${S.sibuk ? 'disabled' : ''} onclick="blPdf()" ${BLI.adaGalat(h.temuan) ? 'disabled title="Masih ada galat"' : ''}>${S.sibuk === 'pdf' ? E(S.pesanPdf) : '📄 Buat PDF & kirim ke Drive'}</button>` : ''}
        ${tr.map(s => `<button class="btn btn-sm" onclick="blStatus('${s}')">→ ${s}</button>`).join('')}${bolehUbah() && admin() && ['MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', 'TERVERIFIKASI'].indexOf(ef) >= 0 ? `<button class="btn btn-sm btn-danger-ghost" onclick="blStatus('REVISI')">Revisi</button>` : ''}</span></div>
      <div class="bl-g3"><div><b>${E(P.noKontrak)}</b><div class="muted">${E(P.vendor.nama)} · ${E(P.kategori)} · ${E(P.jenis)} · BK ${E(P.nomorBA)} (${E(P.periode)})</div>
        <table class="bl-hitung">${BLD.barisBayar(h).map(b => `<tr class="${b.tebal ? 'tebal' : ''}"><td>${E(b.no)}</td><td>${E(b.label)}</td><td class="num">${E(b.pct)}</td><td class="num">${E(b.nilai)}</td></tr>`).join('')}</table></div>
        <div><h4>Data dokumen</h4>${ok ? `<label>Tanggal dokumen<input type="date" value="${E(P.tanggalDok)}" onchange="blUbah('tanggalDok',this.value)"></label><label>Penandatangan vendor<input value="${E(P.vendor.ttdNama)}" onchange="blUbah('ttdNama',this.value)"></label><label>Jabatan<input value="${E(P.vendor.ttdJabatan)}" onchange="blUbah('ttdJabatan',this.value)"></label>` : '<div class="muted">Baca saja.</div>'}
          <h4>Temuan</h4>${tm.length ? `<ul class="bl-tm">${tm.map(t => `<li class="${t.tingkat.toLowerCase()}">${E(t.tingkat)}: ${E(t.pesan)}</li>`).join('')}</ul>` : '<div class="muted">Tidak ada temuan.</div>'}</div></div>
      <h4>Dokumen</h4><table class="master-table small"><thead><tr><th>Dokumen</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${daftar.map(d => { const L = D.filter(x => x.kode === d.kode && !x.diganti), g = L.find(x => x.jenisFile === 'GENERATED'), t = L.find(x => x.jenisFile !== 'GENERATED');
        return `<tr><td>${E(d.nama)}${d.checklist ? ` <span class="muted">(${E(d.checklist)})</span>` : ''}</td><td>${E(BLI.DOK_LABEL[t ? t.status : g ? g.status : 'BELUM'])}</td><td><button class="btn btn-sm" onclick="blPratinjau('${d.kode}')">pratinjau</button>
          ${ok ? `<label class="btn btn-sm">unggah ${['INVOICE', 'KWITANSI'].indexOf(d.kode) >= 0 ? 'resmi vendor' : 'TTD'}<input type="file" accept="application/pdf" style="display:none" onchange="blUnggah('${d.kode}',this)"></label>` : ''}${ok && t && d.checklist ? `<button class="btn btn-sm" onclick="blKeCK('${E(t.documentId)}')">pasang ke checklist</button>` : ''}</td></tr>`; }).join('')}</tbody></table>
      <details><summary>Riwayat (${(B.riwayat || []).length})</summary><table class="master-table small">${(B.riwayat || []).map(r => `<tr><td>${E(String(r.waktu).replace('T', ' ').slice(0, 16))}</td><td>${E(r.oleh)}</td><td>${E(r.aksi)}</td><td>${E(r.ringkas)}</td><td>${E(r.alasan)}</td></tr>`).join('')}</table></details></div>`;
  }

  Object.assign(window, {
    blMasuk: () => masuk($('#blUrl').value, $('#blNama').value, $('#blSandi').value, $('#blProyek').value), blKeluar: keluar, blMuat: () => kirimAntrean().then(muatDaftar), blBuka: bukaPaket,
    blFilter: (k, v) => { S.filter[k] = v; gambar(); }, blTutupGalat: () => { S.galat = ''; gambar(); }, blPratinjau: pratinjau, blPdf: () => terbitkanPdf(), blUnggah: unggahTTD, blKeCK: keChecklist, blStatus: ubahStatus, blUbah: ubahData,
    blBukaBuat: bukaBuat, blPilihKontrak: pilihKontrak, blBuatPaket: buatPaket, blBatalBuat: () => { S.buat = null; gambar(); }, blSimpanKonfig: simpanKonfig, blKeadaan: () => S,
    blMasukLangsung: masuk
  });
  function pasang() {
    if ($('#blPanel')) return; const m = $('.app-main'); if (!m) return;
    const s = document.createElement('section'); s.id = 'blPanel'; s.className = 'bl-panel'; m.insertBefore(s, m.firstChild);
    try { const c = JSON.parse(localStorage.getItem(KUNCI_KONEKSI) || 'null'), sd = sessionStorage.getItem(KUNCI_SANDI); if (c && sd) { masuk(c.url, c.nama, sd, c.proyek); return; } } catch (e) { }
    gambar(); hitungAntre();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
  new MutationObserver(() => { if (!$('#blPanel')) pasang(); }).observe(document.body, { childList: true });
})();
