
/* MP241 — PEMBARUAN 2.4.1 (aditif di atas 2.4.0; tanpa perubahan API/data server — murni UI)
 *  1. Tombol "Unggah Bundel Tagihan" di header modal Checklist Kelengkapan Tagihan, tepat sebelum "Preview & Cetak PDF".
 *     Memakai window.mp240Unggah (2.4.0) apa adanya; hasil tampil di tab Verifikasi AI › Bundel PDF & Pratinjau.
 *  2. Kartu Gudang (LOGINV-09): periode bawaan 25 bulan lalu s.d. 25 bulan berjalan, penanda baris Migrasi,
 *     cetak A4 portrait + ringkasan transaksi migrasi. Pencarian cepat (Ctrl+K): bundel, kartu gudang 25-25. */
(function () {
  'use strict';
  if (window.__MP241__) return; window.__MP241__ = true;
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const pesan = (m, t) => { try { if (typeof notif === 'function') notif(m, t || ''); } catch (e) { } };
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const dua = n => String(n).padStart(2, '0');
  const hariIni = () => { const d = new Date(); return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate()); };
  const tglK = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? m[3] + '-' + BLN[+m[2] - 1] + '-' + m[1] : '-'; };   // = format tabel Kartu Gudang
  const tunda = (fn, ms) => { let t = null; return () => { clearTimeout(t); t = setTimeout(() => { try { fn(); } catch (e) { console.warn('[2.4.1]', e); } }, ms); }; };

  /* ======================= 1. TOMBOL UNGGAH BUNDEL TAGIHAN ======================= */
  function pasangTombol() {
    const cetak = document.getElementById('mp219BtnCetak');
    let b = document.getElementById('mp241BtnBundel'), f = document.getElementById('mp241FileBundel');
    if (!cetak) { if (b) b.remove(); if (f) f.remove(); return; }
    if (!b) {
      cetak.insertAdjacentHTML('beforebegin', '<input type="file" accept=".pdf" hidden id="mp241FileBundel">' +
        '<button type="button" class="btn btn-sm btn-success" id="mp241BtnBundel" title="Unggah 1 PDF scan utuh → AI pisah per dokumen &amp; isi baris checklist otomatis" aria-label="Unggah Bundel Tagihan">' +
        '<i class="fas fa-file-arrow-up me-1"></i><span class="mp241-lbl">Unggah Bundel Tagihan</span><span class="mp241-pdk">Bundel</span></button>');
      b = document.getElementById('mp241BtnBundel'); f = document.getElementById('mp241FileBundel');
      b.addEventListener('click', klikBundel);
      f.addEventListener('change', () => { const file = f.files && f.files[0]; f.value = ''; if (file) kirimBundel(file); });
    }
    if (b.nextElementSibling !== cetak) cetak.parentNode.insertBefore(b, cetak);   // tetap TEPAT sebelum "Preview & Cetak PDF"
    if (f.nextElementSibling !== b) b.parentNode.insertBefore(f, b);
  }
  function cekBundel() {   // alasan tidak bisa unggah, atau '' bila siap
    const F = window.MP219_KEU, VT = window.MP230_VT, s = sesi();
    if (!F || !F.rec) return 'Buka checklist tagihan terlebih dahulu.';
    if (!VT || !VT.info) return 'Fitur bundel butuh Modul server 1.7.0. Terbitkan modulnya lalu muat ulang aplikasi.';
    if (!s || !(s.peran === 'PENGADAAN' || s.admin)) return 'Unggah bundel hanya untuk peran Pengadaan atau Admin.';
    if (!VT.info.bolehJalan) return 'Akun Anda belum diizinkan memakai Asisten AI. Minta Admin menambahkan peran Anda di Setelan Asisten AI.';
    if (F.dirty !== false) return 'Simpan perubahan checklist dahulu, lalu unggah bundel.';
    if (typeof window.mp240Unggah !== 'function') return 'Fitur bundel belum termuat. Muat ulang aplikasi (pembaruan 2.4.0 diperlukan).';
    if (VT.unggah && VT.unggah[F.rec.id]) return 'Bundel sedang diproses. Tunggu hingga selesai.';
    return '';
  }
  function klikBundel() {
    const alasan = cekBundel(); if (alasan) { pesan(alasan, 'err'); return; }
    const f = document.getElementById('mp241FileBundel'); if (f) f.click();
  }
  function kirimBundel(file) {
    const alasan = cekBundel(); if (alasan) { pesan(alasan, 'err'); return; }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { pesan('Berkas harus PDF.', 'err'); return; }
    const F = window.MP219_KEU, VT = window.MP230_VT;
    try { VT.sub[F.rec.id] = 'bundel'; if (typeof window.mp230ClTab === 'function') window.mp230ClTab(); } catch (e) { }   // tampilkan progres & hasil di tab Verifikasi AI
    Promise.resolve(window.mp240Unggah(file)).catch(err => pesan('Bundel gagal diproses: ' + err.message, 'err'));
  }

  /* ======================= 2A. KARTU GUDANG — PERIODE 25 s.d. 25 ======================= */
  window.mp241Tanggal25Prev = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-25'; };
  window.mp241Tanggal25Now = () => { const d = new Date(); return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-25'; };
  function siapkanK() {   // timpa hanya nilai bawaan (kosong / tgl 01 / hari ini), tidak pernah pilihan pengguna
    const K = window.mp223K; if (!K || K._mp241User === true) return false;
    let ubah = false;
    if (!K.dari || /-01$/.test(K.dari)) { const v = window.mp241Tanggal25Prev(); if (K.dari !== v) { K.dari = v; ubah = true; } }
    if (!K.sd || K.sd === hariIni()) { const v = window.mp241Tanggal25Now(); if (K.sd !== v) { K.sd = v; ubah = true; } }
    return ubah;
  }
  document.addEventListener('change', ev => {
    const id = ev.target && ev.target.id;
    if ((id === 'mp223KDari' || id === 'mp223KSd') && window.mp223K) window.mp223K._mp241User = true;
  }, true);

  /* ======================= 2B. PENANDA MIGRASI ======================= */
  function migrasiAktif(kunci, dari, sd) {
    const G = window.MP223 || {}, pilih = (L, jenis) => (L || []).filter(r => r && r.migrasi === true && r.status === 'AKTIF' && (!kunci || r.kunci === kunci) && (!dari || r.tanggal >= dari) && (!sd || r.tanggal <= sd)).map(r => ({ jenis, tanggal: r.tanggal }));
    return pilih(G.masuk, 'masuk').concat(pilih(G.keluar, 'keluar'));
  }
  function tandaiMigrasi() {
    const tb = document.querySelector('#mp223KartuIsi .mp223-tb tbody'), K = window.mp223K; if (!tb || !K) return;
    const tgl = new Set(migrasiAktif(K.kunci).map(x => tglK(x.tanggal))); if (!tgl.size) return;
    tb.querySelectorAll('tr').forEach(tr => {
      if (tr.dataset.mp241mig === '1' || tr.cells.length < 2) return;
      if (!tgl.has((tr.cells[0].textContent || '').trim())) return;
      tr.dataset.mp241mig = '1';
      tr.cells[tr.cells.length - 1].insertAdjacentHTML('afterbegin', '<span class="mp220-bd oranye mp241-mig" title="Transaksi hasil migrasi sistem gudang lama — tanpa SJ/foto asli">📦 Migrasi</span> ');
    });
  }

  /* ======================= 2C. CETAK A4 PORTRAIT + RINGKASAN MIGRASI ======================= */
  (function () {
    const asli = window.mp223KartuCetak;
    if (typeof asli !== 'function') return;
    window.mp223KartuCetak = function () {
      try { siapkanK(); } catch (e) { }
      const K = window.mp223K || {}, dari = K.dari || hariIni().slice(0, 8) + '01', sd = K.sd || hariIni();
      const M = migrasiAktif(K.kunci, dari, sd), nM = M.filter(x => x.jenis === 'masuk').length, nK = M.length - nM;
      const kotak = M.length ? '<div style="margin-top:8px;padding:6px 8px;border:1px dashed #888;font-size:8pt;background:#FAFBFC"><b>Ringkasan (Migrasi):</b> sebagian baris periode ini berasal dari migrasi sistem gudang lama (' +
        M.length + ' transaksi: ' + nM + ' penerimaan, ' + nK + ' pengeluaran). Baris migrasi tidak memiliki SJ/foto asli namun tetap dihitung dalam mutasi &amp; saldo. Data non-migrasi tetap lengkap dengan berkas.</div>' : '';
      const c0 = window.mp224Cetak;
      if (typeof c0 === 'function') window.mp224Cetak = function (html, opt) {
        let h = String(html).replace('size:A4 landscape', 'size:A4 portrait');
        if (kotak && h.indexOf('<div class="ft">') >= 0) h = h.replace('<div class="ft">', kotak + '<div class="ft">');
        return c0.call(this, h, Object.assign({}, opt || {}, { lanskap: false }));
      };
      try { return asli.apply(this, arguments); }
      finally { window.mp224Cetak = c0; }
    };
  })();

  /* ======================= PEMASANGAN ======================= */
  (function () {
    const st = window.showTab;
    if (typeof st === 'function') window.showTab = function (nama) {
      try { if (nama === 'gdkartu') siapkanK(); } catch (e) { console.warn('[2.4.1] periode 25', e); }
      const r = st.apply(this, arguments);
      try { if (nama === 'gdkartu') setTimeout(tandaiMigrasi, 0); } catch (e) { }
      return r;
    };
    const rs = window.renderSemuaData;
    if (typeof rs === 'function') window.renderSemuaData = function () { const r = rs.apply(this, arguments); setTimeout(() => { try { tandaiMigrasi(); } catch (e) { } }, 300); return r; };
    const kl = window.keluarLogin;
    if (typeof kl === 'function') window.keluarLogin = function () { try { if (window.mp223K) delete window.mp223K._mp241User; } catch (e) { } return kl.apply(this, arguments); };
    const cmd = window.itemCmdk;
    if (typeof cmd === 'function') window.itemCmdk = function (q) {
      const out = cmd.apply(this, arguments) || [], t = String(q || '').trim().toLowerCase();
      try {
        if (t.length >= 2 && (/bundel|unggah tagihan|unggah bundel/.test(t) || 'unggah bundel tagihan'.indexOf(t) >= 0))
          out.unshift({ grup: 'Keuangan & Bayar', ik: 'fa-file-arrow-up', l: 'Unggah Bundel Tagihan (1 PDF scan utuh)', s: 'Checklist › AI memisahkan per dokumen',
            aksi: () => { if (document.getElementById('mp241BtnBundel') && window.MP219_KEU && window.MP219_KEU.rec) klikBundel(); else { if (typeof window.bukaTab === 'function') window.bukaTab('keuangan'); pesan('Buka Checklist tagihan, lalu klik "Unggah Bundel Tagihan".', ''); } } });
        if (t.length >= 2 && (/kartu gudang|stock card|loginv-09|\b25\b/.test(t) || 'kartu gudang'.indexOf(t) >= 0))
          out.unshift({ grup: 'Gudang', ik: 'fa-id-card', l: 'Kartu Gudang periode 25–25', s: window.mp241Tanggal25Prev() + ' s.d. ' + window.mp241Tanggal25Now(),
            aksi: () => { const K = window.mp223K; if (K) { delete K._mp241User; K.dari = ''; K.sd = ''; } if (typeof window.bukaTab === 'function') window.bukaTab('gdkartu'); else if (typeof window.showTab === 'function') window.showTab('gdkartu'); } });
      } catch (e) { }
      return out;
    };
    const tBtn = tunda(pasangTombol, 120), tMig = tunda(tandaiMigrasi, 180);
    const pasangObs = () => { if (!document.body) return; new MutationObserver(() => { tBtn(); tMig(); }).observe(document.body, { childList: true, subtree: true }); tBtn(); tMig(); };
    if (document.body) pasangObs(); else document.addEventListener('DOMContentLoaded', pasangObs);
  })();
})();
