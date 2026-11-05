/* MP2104 — NPWP KSO BENAR · ALAMAT VENDOR DARI MASTER DATA · AUTO-FILL SPM/PO & BAP (2.10.7; Modul server 1.10.10 · fitur "rekeningVendor", "identitasNpwp")
 *  A. NPWP WASKITA - NINDYA, KSO: nomor keliru 1000000007845820 dikoreksi otomatis menjadi 1000000007845824 di seluruh keluaran:
 *     Excel format baku (Master SPM INPUT!B15 → SPM, BAPM, BAP), cetak HTML/PDF (BA, BAPM, dokumen paket), dan layar.
 *     Identitas Pelaksana (Admin) kini memuat NPWP & alamat KSO; bila kosong dipakai NPWP resmi di atas dan alamat
 *     Gedung Waskita IDSurvey Tower Jl. M.T. Haryono Kavling No.10, Jatinegara, Jakarta Timur (SPM INPUT!B8 & BAP DATA!B18 diseragamkan).
 *  B. Alamat, NPWP & Direktur vendor: Master Data › Vendor (lalu tabel rekanan SAP) DIUTAMAKAN di atas profil isian Input Progres/Preview BA,
 *     sehingga dokumen cetak selalu memakai alamat resmi terdaftar (mis. "Ruko Mitra …"), bukan format ketikan yang berbeda-beda.
 *  C. Rekening vendor (Bank · Nomor Rekening · Atas Nama) disimpan di server (sheet _RekeningVendor, lintas proyek), diisi dari form
 *     Master Data › Vendor. Saat Unduh/Cetak Excel SPM/PO & BAP, sel berikut terisi presisi:
 *     SPM INPUT: B6 nama KSO · B8 alamat KSO · B15 NPWP KSO · B23 Direktur · B24 nama · B25 alamat · B26 NPWP · B27 a.n. · B28 no. rek · B29 bank
 *     BAP DATA : B17 nama KSO · B18 alamat KSO · B22 Direktur · B23 jabatan · B24/B75 nama · B76/B84 alamat · B77/B85 NPWP · B80 bank · B81 no. rek · B82 a.n.
 *  Aditif: tidak mengubah struktur sheet inti; kait dipasang dengan membungkus fungsi yang sudah ada (mp298TambahIsian, mp292Isian, profilVendor, mp296Cetak). */
(function () {
  'use strict';
  if (window.__MP2104__) return; window.__MP2104__ = true;
  const NPWP_SALAH = '1000000007845820', NPWP_BENAR = '1000000007845824';
  const ALAMAT_KSO = 'Gedung Waskita IDSurvey Tower Jl. M.T. Haryono Kavling No.10, Jatinegara, Jakarta Timur';   // alamat resmi KSO (ditetapkan pengguna 05-11-2026)
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = v => S(v).replace(/\D/g, '');
  const pesan = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || ''); } catch (e) { } };
  const $ = id => document.getElementById(id);
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const bolehRek = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN' || s.peran === 'ADMIN')); };
  const aksi = (a, d) => typeof window.regAksi === 'function' ? window.regAksi(a, d) : Promise.reject(new Error('regAksi belum siap'));

  /* ======================= A. NPWP & identitas KSO ======================= */
  const npwpBenar = v => { const d = D(v); return d === NPWP_SALAH ? NPWP_BENAR : d; };
  // nomor keliru dalam bentuk apa pun (1000000007845820 · 1000.0000.0784.5820 · 10.000.000.078.458-20 · dsb.) → nomor benar, format pemisah dipertahankan
  const RE_SALAH = /1[\s.\-]*0[\s.\-]*0[\s.\-]*0[\s.\-]*0[\s.\-]*0[\s.\-]*0[\s.\-]*0[\s.\-]*0[\s.\-]*7[\s.\-]*8[\s.\-]*4[\s.\-]*5[\s.\-]*8[\s.\-]*2[\s.\-]*0(?!\d)/g;
  const ADA_SALAH = new RegExp(RE_SALAH.source);
  const koreksiTeks = s => String(s == null ? '' : s).replace(RE_SALAH, m => m.slice(0, -1) + '4');
  const bawaanKSO = n => /^WASKITA\s*[-–—]\s*NINDYA,?\s*KSO$/i.test(S(n).replace(/\s+/g, ' '));
  window.mp2104KoreksiNpwp = koreksiTeks;
  function kso() {
    let I = {}; try { I = (window.mp224Identitas && window.mp224Identitas()) || {}; } catch (e) { }
    return { nama: S(I.nama) || 'WASKITA - NINDYA, KSO', npwp: npwpBenar(I.npwp) || NPWP_BENAR, alamat: S(I.alamat) || ALAMAT_KSO, asal: I.asal || '' };
  }
  window.mp2104KSO = kso;

  /* ======================= C. rekening vendor (server _RekeningVendor) ======================= */
  const RV = { data: null, muat: null, mati: false };
  const kunciNama = n => S(n).toUpperCase().replace(/[.,]/g, ' ').replace(/\b(PT|CV|UD|TBK|PERSERO)\b/g, ' ').replace(/\s+/g, ' ').trim();
  function muatRek(paksa) {
    if (RV.mati) return Promise.resolve([]);
    if (RV.muat && !paksa) return RV.muat;
    RV.muat = aksi('rekVendorBaca', {}).then(r => { RV.data = (r && r.data) || []; return RV.data; })
      .catch(e => { if (/tidak dikenal/i.test(S(e && e.message))) RV.mati = true; RV.muat = null; return RV.data || []; });
    return RV.muat;
  }
  function rekening(id, nama) {
    const L = RV.data || []; id = S(id); const k = kunciNama(nama);
    return (id && L.find(r => S(r.kodeSAP) === id)) || (k && L.find(r => kunciNama(r.nama) === k)) || null;
  }
  window.mp2104Rekening = rekening; window.mp2104MuatRekening = muatRek;

  /* ======================= B. vendor: Master Data diutamakan ======================= */
  function master(id, nama) {
    let m = null; try { m = window.mp292VendorMaster ? window.mp292VendorMaster(id, nama) : null; } catch (e) { }   // master tambahan (+ rekanan SAP via MP296)
    if (!m && id && window.mp296Rekanan) { try { const r = window.mp296Rekanan(id); if (r) m = { alamat: r.alamat, npwp: r.npwp, kota: r.kota, telp: r.telp, email: r.email }; } catch (e) { } }
    return m || {};
  }
  // vendor final untuk dokumen: Master Data > rekanan SAP > isian dokumen (profil Input Progres / Paket Tagihan)
  function vendorFinal(id, nama, isian) {
    const m = master(id, nama), v = isian || {}, rk = rekening(id, nama) || {};
    const nm = S(nama) || S(m.nama) || S(v.nama);
    return { nama: nm, direktur: S(m.pimpinan) || S(v.direktur), jabatan: S(m.jabatan) || S(v.jabatan) || 'Direktur',
      alamat: S(m.alamat) || S(v.alamat), npwp: S(m.npwp) || S(v.npwp), email: S(m.email) || S(v.email), telp: S(m.telp) || S(v.telp),
      bank: S(rk.bank), noRek: S(rk.noRek), atasNama: S(rk.atasNama) || (rk.noRek ? nm : ''), dariMaster: !!(m.alamat || m.npwp || m.pimpinan) };
  }
  window.mp2104Vendor = vendorFinal;

  // profil vendor (Preview BA, Input Progres, Paket Tagihan baru): alamat/NPWP/Direktur dari Master Data menimpa isian profil
  (function bungkusProfil() {
    const asli = window.profilVendor; if (typeof asli !== 'function') { setTimeout(bungkusProfil, 1500); return; } if (asli.__mp2104) return;
    const g = function (id, nama) {
      const p = asli.apply(this, arguments) || {};
      try {
        const m = master(id, nama || p.namaVendor);
        if (S(m.alamat)) { if (p.alamat && S(p.alamat) !== S(m.alamat)) p.alamatProfil = p.alamat; p.alamat = S(m.alamat); p.sumberAlamat = 'master'; }
        if (S(m.npwp)) p.npwp = S(m.npwp);
        if (S(m.pimpinan)) { p.nama = S(m.pimpinan); if (S(m.jabatan)) p.jabatan = S(m.jabatan); }
        const rk = rekening(id, nama || p.namaVendor); if (rk) { p.bank = rk.bank; p.noRek = rk.noRek; p.atasNama = rk.atasNama; }
        p.lengkap = !!(p.nama && p.alamat);
      } catch (e) { }
      return p;
    };
    g.__mp2104 = true; Object.keys(asli).forEach(k => { if (!(k in g)) g[k] = asli[k]; }); window.profilVendor = g;
  })();

  /* ---------- isian sel Excel format baku ---------- */
  const isiDefinit = (o, k, v) => { if (v !== undefined && v !== null && S(v) !== '') o[k] = v; };
  function tambahSPM(t, V, K) {
    const IN = t.INPUT = t.INPUT || {};
    IN.B15 = K.npwp;                                   // NPWP KSO (templat lama: …5820)
    if ((K.asal === 'server' || K.asal === 'cache') && !bawaanKSO(K.nama)) isiDefinit(IN, 'B6', K.nama);   // nama bawaan: ejaan templat "WASKITA - NINDYA, KSO" dipertahankan
    isiDefinit(IN, 'B8', K.alamat);
    isiDefinit(IN, 'B23', V.direktur); isiDefinit(IN, 'B24', V.nama); isiDefinit(IN, 'B25', V.alamat); isiDefinit(IN, 'B26', V.npwp);
    isiDefinit(IN, 'B30', V.email);
    if (V.noRek) { IN.B27 = V.atasNama || V.nama; IN.B28 = V.noRek; IN.B29 = V.bank; }
  }
  function tambahBAP(t, V, K) {
    const DT = t.DATA = t.DATA || {};
    if ((K.asal === 'server' || K.asal === 'cache') && !bawaanKSO(K.nama)) isiDefinit(DT, 'B17', K.nama);
    isiDefinit(DT, 'B18', K.alamat);
    isiDefinit(DT, 'B22', V.direktur); isiDefinit(DT, 'B23', V.jabatan); isiDefinit(DT, 'B24', V.nama); isiDefinit(DT, 'B75', V.nama);
    isiDefinit(DT, 'B76', V.alamat); isiDefinit(DT, 'B84', V.alamat); isiDefinit(DT, 'B77', V.npwp); isiDefinit(DT, 'B85', V.npwp);
    isiDefinit(DT, 'B78', V.telp); isiDefinit(DT, 'B79', V.email);
    if (V.noRek) { DT.B80 = V.bank; DT.B81 = V.noRek; DT.B82 = V.atasNama || V.nama; }
  }
  function lengkapi(I, f, id, nama, isian) {
    const t = I.tulisan = I.tulisan || {}, V = vendorFinal(id, nama, isian), K = kso();
    if (f === 'spm') tambahSPM(t, V, K); else if (f === 'bap') tambahBAP(t, V, K);
    I.mp2104 = { vendor: V, kso: K };
    return I;
  }
  window.mp2104Lengkapi = lengkapi;

  // MP293/MP298 (Preview BA › Unduh Excel, Paket Tagihan, Agen Tagihan): kait setelah isian bawaan
  (function kaitExcel() {
    const f = window.mp298TambahIsian; if (typeof f !== 'function') { setTimeout(kaitExcel, 1500); return; } if (f.__mp2104) return;
    const g = function (K, I, fmt) {
      f.apply(this, arguments);
      try { const gk = (K && K.g) || {}; lengkapi(I, fmt, gk.idVendor, gk.namaVendor, K && K.vendor); } catch (e) { console.warn('[MP2104] isian Excel', e); }
    };
    g.__mp2104 = true; Object.keys(f).forEach(k => { if (!(k in g)) g[k] = f[k]; }); window.mp298TambahIsian = g;
  })();
  // MP292 (Form Input Progres › Format Excel baku)
  (function kaitInputProgres() {
    const f = window.mp292Isian; if (typeof f !== 'function') { setTimeout(kaitInputProgres, 1500); return; } if (f.__mp2104) return;
    const g = function (key) {
      const I = f.apply(this, arguments);
      try {
        let r = null; try { r = ((typeof REG !== 'undefined' && REG.data) || []).find(x => x.noKontrak === key) || null; } catch (e) { }
        const t = I.tulisan || {}, nama = S((r && (r.namaVendor || r.vendor)) || (t.INPUT && t.INPUT.B24) || (t.DATA && t.DATA.B24));
        lengkapi(I, I.jenis, r && (r.idVendor || r.kodeVendor), nama, null);
      } catch (e) { console.warn('[MP2104] isian Input Progres', e); }
      return I;
    };
    g.__mp2104 = true; window.mp292Isian = g;
  })();

  /* ---------- A2. cetak HTML/PDF & layar: koreksi NPWP KSO lama ---------- */
  (function kaitCetak() {
    const f = window.mp296Cetak; if (typeof f !== 'function') { setTimeout(kaitCetak, 1500); return; } if (f.__mp2104) return;
    const g = function (html, judul) { return f.call(this, koreksiTeks(html), judul); };
    g.__mp2104 = true; window.mp296Cetak = g;
  })();
  let _tScan = null;
  function pindai() {
    clearTimeout(_tScan);
    _tScan = setTimeout(() => {
      try {
        const teks = doc => { if (!doc || !doc.body) return;
          const w = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, { acceptNode: n => ADA_SALAH.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
          const L = []; while (w.nextNode()) L.push(w.currentNode);
          L.forEach(n => { n.nodeValue = koreksiTeks(n.nodeValue); }); };
        teks(document);
        document.querySelectorAll('input:not([type=file]),textarea').forEach(el => { if (ADA_SALAH.test(el.value)) el.value = koreksiTeks(el.value); });
        document.querySelectorAll('iframe').forEach(fr => { try { teks(fr.contentDocument); } catch (e) { } });   // pratinjau BA/SPM (srcdoc, asal sama)
      } catch (e) { }
    }, 300);
  }
  try { new MutationObserver(pindai).observe(document.documentElement, { childList: true, subtree: true, characterData: true }); } catch (e) { }

  /* ---------- A3. Identitas Pelaksana: isian NPWP & alamat KSO ---------- */
  (function kaitIdentitas() {
    const f = window.mp224IdentitasBuka; if (typeof f !== 'function') { setTimeout(kaitIdentitas, 1500); return; } if (f.__mp2104) return;
    const g = function () {
      const r = f.apply(this, arguments);
      try {
        const u = $('mp224IdUnit'); if (!u || $('mp2104IdNpwp')) return r;
        const K = kso(), kol = u.closest('.col-12') || u.parentNode;
        kol.insertAdjacentHTML('afterend', `<div class="col-12 col-md-5"><label class="form-label small mb-0" for="mp2104IdNpwp">NPWP pelaksana (KSO)</label><input class="form-control font-monospace" id="mp2104IdNpwp" maxlength="25" inputmode="numeric" value="${E(K.npwp)}" placeholder="${NPWP_BENAR}"></div>
          <div class="col-12 col-md-7"><label class="form-label small mb-0" for="mp2104IdAlamat">Alamat pelaksana (KSO)</label><input class="form-control" id="mp2104IdAlamat" maxlength="300" value="${E(K.alamat)}" placeholder="${E(ALAMAT_KSO)}"></div>`);
      } catch (e) { }
      return r;
    };
    g.__mp2104 = true; window.mp224IdentitasBuka = g;
  })();
  (function kaitRegAksi() {
    const f = window.regAksi; if (typeof f !== 'function') { setTimeout(kaitRegAksi, 1500); return; } if (f.__mp2104) return;
    const g = function (nama, req) {
      if (nama === 'identitasSimpan' && req && req.data) {
        const n = $('mp2104IdNpwp'), a = $('mp2104IdAlamat');
        if (n) { const v = npwpBenar(n.value); if (v && (v.length < 15 || v.length > 16)) return Promise.reject(new Error('NPWP pelaksana harus 15/16 digit.')); req.data.npwp = v; }
        if (a) req.data.alamat = S(a.value);
      }
      return f.apply(this, arguments);
    };
    g.__mp2104 = true; Object.keys(f).forEach(k => { if (!(k in g)) g[k] = f[k]; }); window.regAksi = g;
  })();

  /* ---------- C2. Master Data › Vendor: isian rekening ---------- */
  (function kaitMaster() {
    const fo = window.mdForm214, fs = window.mdSimpan214;
    if (typeof fo !== 'function' || typeof fs !== 'function') { setTimeout(kaitMaster, 1500); return; } if (fo.__mp2104) return;
    const go = function () {
      const r = fo.apply(this, arguments);
      setTimeout(async () => {
        try {
          const nm = $('md_nama'), em = $('md_email'); if (!nm || !em || $('md_rekBank')) return;   // hanya form VENDOR (punya e-mail)
          await muatRek();
          const rk = rekening(S(($('md_kodeSAP') || {}).value), nm.value) || {};
          const kol = em.closest('[class*="col-"]') || em.parentNode;
          kol.insertAdjacentHTML('afterend', `<div class="col-12"><div class="small fw-semibold mt-2">Rekening pembayaran (auto-fill SPM/PO &amp; BAP)</div></div>
            <div class="col-md-4"><label class="form-label small mb-0" for="md_rekBank">Bank</label><input class="form-control form-control-sm" id="md_rekBank" maxlength="80" value="${E(rk.bank)}" placeholder="mis. Bank Mandiri KCP …" ${bolehRek() ? '' : 'disabled'}></div>
            <div class="col-md-4"><label class="form-label small mb-0" for="md_rekNo">Nomor rekening</label><input class="form-control form-control-sm font-monospace" id="md_rekNo" maxlength="40" inputmode="numeric" value="${E(rk.noRek)}" ${bolehRek() ? '' : 'disabled'}></div>
            <div class="col-md-4"><label class="form-label small mb-0" for="md_rekAn">Atas nama</label><input class="form-control form-control-sm" id="md_rekAn" maxlength="200" value="${E(rk.atasNama)}" placeholder="kosong = nama vendor" ${bolehRek() ? '' : 'disabled'}></div>`);
        } catch (e) { console.warn('[MP2104] form rekening', e); }
      }, 50);
      return r;
    };
    const gs = async function () {
      const b = $('md_rekBank'), n = $('md_rekNo'), a = $('md_rekAn');
      const rek = b ? { kodeSAP: S(($('md_kodeSAP') || {}).value), nama: S(($('md_nama') || {}).value), bank: S(b.value), noRek: S(n && n.value), atasNama: S(a && a.value) } : null;
      const lama = rek ? rekening(rek.kodeSAP, rek.nama) || {} : {};
      if (rek && rek.noRek && !rek.bank) { pesan('Isi nama bank untuk nomor rekening vendor.', 'err'); return; }
      const r = await fs.apply(this, arguments);
      const md = $('mp214Md'), tersimpan = !md || !md.classList.contains('show');   // gagal simpan → modal tetap terbuka
      if (rek && tersimpan && (rek.bank !== S(lama.bank) || rek.noRek !== S(lama.noRek) || rek.atasNama !== S(lama.atasNama))) {   // master tersimpan (form tertutup) → simpan rekening
        try { await aksi('rekVendorSimpan', { data: rek }); await muatRek(true); pesan('Rekening vendor ' + rek.nama + ' tersimpan · dipakai otomatis di SPM/PO & BAP.', 'ok'); }
        catch (e) { pesan('Master tersimpan, namun rekening gagal disimpan: ' + (/tidak dikenal/i.test(e.message) ? 'terbitkan Modul server 1.10.10 dulu.' : e.message), 'err'); }
      }
      return r;
    };
    go.__mp2104 = true; gs.__mp2104 = true; window.mdForm214 = go; window.mdSimpan214 = gs;
  })();

  /* ---------- C3. draf Invoice paket: baris rekening terisi ---------- */
  window.mp2104RekTeks = c => {
    let id = ''; try { const T = window.mp270Aktif && window.mp270Aktif(); id = (T && T.g && T.g.idVendor) || ''; } catch (e) { }
    const rk = rekening(id, c && c.vendor);
    return rk && rk.noRek ? ': Bank ' + rk.bank + ' No. ' + rk.noRek + ' a.n. ' + (rk.atasNama || c.vendor) : ': Bank ........................ No. ........................ a.n. ' + (c && c.vendor);
  };

  // muat awal: rekening (setelah login) agar unduhan pertama sudah lengkap
  let coba = 0;
  (function awal() { if (sesi() && typeof window.regAksi === 'function') { muatRek(); return; } if (++coba < 40) setTimeout(awal, 1500); })();
})();
