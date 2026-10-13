/* Data contoh proyek + jembatan aplikasi (regAksi → kernel doPost) + panel kontrol demo */
(function () {
  var P = 'DEMO01';
  var USER = { admin: ['Admin Demo', '1234', true, 'PENGADAAN'], pengadaan: ['Staf Pengadaan', '1111', false, 'PENGADAAN'], lihat: ['Kepala Proyek', '0000', false, 'LIHAT'] };
  var hari = function (d) { var t = new Date(Date.now() + (d || 0) * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
  var now = function () { return new Date().toISOString(); };
  function lembar(nama, kolom, rows) { var sh = sheet_(nama, kolom); rows.forEach(function (r) { sh.appendRow(r); }); }

  function isiData() {
    DEMO.sheets = {}; DEMO.props = {}; DEMO.cache = {}; DEMO.drive = {}; DEMO.http = [];
    tulisPengguna_([{ nama: 'Admin Demo', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*', jabatan: 'Kasi Pengadaan' },
      { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*', jabatan: 'Staf Pengadaan' },
      { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*', jabatan: 'Kepala Proyek' }]);
    tulisProyek_([{ id: P, nama: 'Jembatan Sungai Lematang (Demo)', namaLengkap: 'Proyek Demo Pembangunan Jembatan Sungai Lematang', kso: 'KSO DEMO', kodeKontrak: 'DEMO/JSL', kodePermintaan: 'DEMO/DIV.II', kapro: 'Kepala Proyek', kasi: 'Admin Demo', aktif: true }]);
    var it = function (kode, uraian, vol, sat, harga, wbs) { return { kode: kode, uraian: uraian, vol: vol, sat: sat, harga: harga, wbs: wbs || '' }; };
    tulisKoleksi_(P, 'data', [
      { id: 'R1', noKontrak: 'DEMO/JSL/SPM/001/2026', namaVendor: 'PT Baja Prima Nusantara', nilai: 1250000000, items: [it('M-BJ13', 'Besi beton D13', 8000, 'btg', 95000), it('M-BJ16', 'Besi beton D16', 3500, 'btg', 142000)], noPR: '1100231' },
      { id: 'R2', noKontrak: 'DEMO/JSL/SPM/002/2026', namaVendor: 'CV Beton Mandiri', nilai: 820500000, items: [it('M-RM30', 'Readymix K-350', 750, 'm3', 1094000, 'JSL.01.02')], noPR: '1100244', noRFQ: '6000318', noPO: '4500912', top: '30 hari' },
      { id: 'R3', noKontrak: 'DEMO/JSL/SPSA/003/2026', namaVendor: 'PT Alat Berat Sejahtera', nilai: 475000000, items: [it('S-CR50', 'Sewa crawler crane 50 ton', 5, 'bln', 95000000)], noPR: '1100250', noRFQ: '6000322' },
      { id: 'R4', noKontrak: 'DEMO/JSL/SPK/004/2026', namaVendor: 'PT Geoteknik Andalan', nilai: 2100000000, items: [it('S-BP80', 'Bored pile Ø800', 1400, 'm', 1500000)], noPR: '1100198', noRFQ: '6000290', noPO: '4500870', top: 'Termin bulanan' },
      { id: 'R5', noKontrak: 'DEMO/JSL/SPM/005/2026', namaVendor: 'PT Semen Andalas Jaya', nilai: 310000000, items: [it('M-SM50', 'Semen PCC 50 kg', 4500, 'zak', 68000)] },
      { id: 'R6', noKontrak: 'DEMO/JSL/SPK/006/2026', namaVendor: 'CV Marka Jalan Persada', nilai: 95000000, items: [it('S-MRK', 'Marka thermoplastic', 1900, 'm2', 50000)], noPR: '1100301' }]);
    tulisKoleksi_(P, 'progres', [
      { id: 'T1', versi: 2, noKontrak: 'DEMO/JSL/SPM/001/2026', tagihanKe: 1, nomorBA: 'BA-JSL/001', periode: 'Agt 2026', periodeKey: 202608, nilai: 375000000, baTerbit: true, diubahOleh: 'Admin Demo', diubahPada: now() },
      { id: 'T2', versi: 3, noKontrak: 'DEMO/JSL/SPK/004/2026', tagihanKe: 2, nomorBA: 'BA-JSL/014', periode: 'Sep 2026', periodeKey: 202609, nilai: 980000000, baTerbit: true, bayar: { status: 'BELUM' }, diubahOleh: 'Admin Demo', diubahPada: now() },
      { id: 'T3', versi: 1, noKontrak: 'DEMO/JSL/SPM/002/2026', tagihanKe: 1, nomorBA: 'BA-JSL/009', periode: 'Agt 2026', periodeKey: 202608, nilai: 410250000, baTerbit: true, bayar: { status: 'DIBAYAR', tglAju: hari(-30), tglBayar: hari(-9), nilaiBayar: 410250000 }, diubahOleh: 'Admin Demo', diubahPada: now() },
      { id: 'T4', versi: 1, noKontrak: 'DEMO/JSL/SPSA/003/2026', tagihanKe: 1, nomorBA: 'BA-JSL/017', periode: 'Sep 2026', periodeKey: 202609, nilai: 118750000, baTerbit: false, diubahOleh: 'Admin Demo', diubahPada: now() }]);
    tulisKoleksi_(P, 'permintaan', [
      { id: 'B1', nomor: 'BON-JSL/021', tanggal: hari(-26), departemen: 'Struktur', peminta: 'Site Manager', items: [it('M-BJ13', 'Besi beton D13', 800, 'btg', 95000, 'JSL.02.01'), it('M-BJ16', 'Besi beton D16', 400, 'btg', 142000, 'JSL.02.01')] },
      { id: 'B2', nomor: 'BON-JSL/024', tanggal: hari(-12), departemen: 'Gudang', peminta: 'Kepala Gudang', items: [it('M-SM50', 'Semen PCC 50 kg', 300, 'zak', 68000, 'JSL.02.03'), it('M-PSR', 'Pasir beton', 40, 'm3', 310000, 'JSL.02.03')] },
      { id: 'B3', nomor: 'BON-JSL/027', tanggal: hari(-3), departemen: 'Mekanikal', peminta: 'Kepala Peralatan', items: [it('M-SLR', 'Solar industri', 5000, 'ltr', 14500, 'JSL.09.01')] }]);
    var gm = function (id, tgl, bon, idx, kode, ur, sat, qty, harga, sj) { var r = { id: id, tanggal: tgl, bonNomor: bon, bonIdx: idx, kode: kode, uraian: ur, sat: sat, kunci: kode, qty: qty, harga: harga, noSJ: sj, diterimaOleh: 'Kepala Gudang', status: 'AKTIF', versi: 1, kiriman: 'KR' + id, kirimanKe: 1, dibuatOleh: 'Kepala Gudang', dibuatPada: now() };
      return [r.id, r.tanggal, r.bonNomor, idx + 1, kode, ur, sat, qty, harga, sj, r.diterimaOleh, 'AKTIF', 'Kepala Gudang', now(), JSON.stringify(r)]; };
    lembar(P + '_GudangMasuk', ['ID', 'Tanggal', 'No Bon', 'Baris Bon', 'Kode Material', 'Uraian', 'Satuan', 'Qty', 'Harga', 'No Surat Jalan', 'Diterima Oleh', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA'],
      [gm('GR1', hari(-20), 'BON-JSL/021', 0, 'M-BJ13', 'Besi beton D13', 'btg', 500, 95000, 'SJ-BPN-0412'), gm('GR2', hari(-9), 'BON-JSL/024', 0, 'M-SM50', 'Semen PCC 50 kg', 'zak', 50, 68000, 'SJ-SAJ-1180'), gm('GR3', hari(-8), 'BON-JSL/024', 1, 'M-PSR', 'Pasir beton', 'm3', 40, 310000, 'SJ-PSR-0091')]);
    var gk = function (id, tgl, kode, ur, sat, qty, untuk) { var r = { id: id, tanggal: tgl, kode: kode, uraian: ur, sat: sat, kunci: kode, qty: qty, untuk: untuk, penerima: 'Mandor Struktur', status: 'AKTIF', versi: 1, dibuatOleh: 'Kepala Gudang', dibuatPada: now() };
      return [id, tgl, kode, ur, sat, qty, untuk, r.penerima, 'AKTIF', 'Kepala Gudang', now(), JSON.stringify(r)]; };
    lembar(P + '_GudangKeluar', ['ID', 'Tanggal', 'Kode Material', 'Uraian', 'Satuan', 'Qty', 'Untuk', 'Penerima', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA'],
      [gk('GI1', hari(-15), 'M-BJ13', 'Besi beton D13', 'btg', 200, 'Pilecap P2'), gk('GI2', hari(-10), 'M-SM50', 'Semen PCC 50 kg', 'zak', 60, 'Lantai kerja abutmen')]);
    var cl = function (id, no, kat, n) { var items = {}; ['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_06', 'UMUM_07'].slice(0, n).forEach(function (k) { items[k] = { status: 'ADA', file: { idServer: 'F-' + k, nama: k + '.pdf' } }; });
      var r = { id: id, noKontrak: no, kategori: kat, versi: 1, items: items, verified: false, diubahOleh: 'Staf Pengadaan', diubahPada: now() }; return [id, no, kat, 1, 'Staf Pengadaan', now(), JSON.stringify(r)]; };
    lembar(P + '_ChecklistTagihan', ['ID Progres', 'Nomor Kontrak', 'Kategori', 'Versi', 'Diubah Oleh', 'Diubah Pada', 'DATA'], [cl('T1', 'DEMO/JSL/SPM/001/2026', 'BAHAN', 3), cl('T2', 'DEMO/JSL/SPK/004/2026', 'SUBKON', 7)]);
    var av = { id: 'AV1', kodeVendor: 'V-GEO', namaVendor: 'PT Geoteknik Andalan', jenis: 'JAMPEL', noDok: 'BG-0091/2026', berlakuSd: hari(5), status: 'AKTIF', versi: 1, diubahOleh: 'Staf Pengadaan', diubahPada: now() };
    lembar(P + '_ArsipVendor', ['ID', 'Kode Vendor', 'Nama Vendor', 'Jenis', 'No Dokumen', 'Berlaku s.d.', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA'], [[av.id, av.kodeVendor, av.namaVendor, av.jenis, av.noDok, av.berlakuSd, 'AKTIF', av.diubahOleh, av.diubahPada, JSON.stringify(av)]]);
    var snap = { pada: now(), oleh: 'Admin Demo', grup: {
      kontrak: { pada: now(), item: [{ judul: 'DEMO/JSL/SPSA/003 · PT Alat Berat Sejahtera', tgl: hari(4), ket: 'Masa sewa berakhir', nilai: 'H-4' }, { judul: 'DEMO/JSL/SPK/004 · PT Geoteknik Andalan', tgl: hari(12), ket: 'Masa pelaksanaan berakhir', nilai: 'H-12' }] },
      tagihan: { pada: now(), item: [{ judul: 'BA-JSL/014 · PT Geoteknik Andalan', ket: 'Checklist 7/26 · belum diajukan', nilai: 'Rp 980 jt' }, { judul: 'BA-JSL/001 · PT Baja Prima Nusantara', ket: 'Checklist 3/25', nilai: 'Rp 375 jt' }] },
      gudang: { pada: now(), item: [{ judul: 'BON-JSL/021 · Struktur', ket: '2 item belum lengkap', nilai: '26 hari', umur: 26 }, { judul: 'BON-JSL/024 · Gudang', ket: '1 item sebagian diterima', nilai: '12 hari', umur: 12 }] } } };
    lembar(P + '_Notifikasi', ['Kunci', 'Waktu', 'Oleh', 'DATA'], [['SNAP', now(), 'Admin Demo', JSON.stringify(snap)]]);
    var U = { nama: 'Admin Demo', peran: 'PENGADAAN', admin: true }, L = [], h = logikaPBJ_(L, U, { nama: 'Paket Besi Beton Struktur Atas', noPR: '1100231', tahap: 3 }, now(), 'BDEMO1'); L.push(h.data); tulisPBJ_(P, L);
    // setelan Asisten AI (seperti kondisi server Anda: 5 penyedia aktif, key OpenAI salah tempel berupa URL)
    DEMO.props.AI_SET = JSON.stringify({ bawaan: 'claude', bawaanId: 'anthropic', peran: ['ADMIN', 'PENGADAAN', 'LIHAT'], kuota: 60, maksToken: 2048, claude: { model: 'claude-sonnet-5-5' }, gemini: { model: 'gemini-3.8-flash' },
      providers: { anthropic: { model: 'claude-sonnet-5-5', aktif: true }, google: { model: 'gemini-3.8-flash', aktif: true }, openai: { model: 'gpt-5-mini', aktif: true }, deepseek: { model: 'deepseek-chat', aktif: true }, groq: { model: 'llama-3.3-70b-versatile', aktif: true } } });
    DEMO.props.AI_KEY_ANTHROPIC = DEMO.props.AI_KEY_CLAUDE = 'sk-ant-DEMO-bukan-key-asli';
    DEMO.props.AI_KEY_GOOGLE = DEMO.props.AI_KEY_GEMINI = 'AIza-DEMO-bukan-key-asli';
    DEMO.props.AI_KEY_OPENAI = 'https://platform.openai.com/api-keys#demo6812';
    DEMO.props.AI_KEY_DEEPSEEK = 'sk-DEMO-bukan-key-asli';
    DEMO.props.AI_KEY_GROQ = 'gsk_DEMO-bukan-key-asli';
    DEMO.props.MODUL_AKTIF = 'DEMO-MODUL';
    DEMO.drive['DEMO-MODUL'] = JSON.stringify({ format: 'monitoring-sap-modul-server', versi: '1.5.2', untukKernel: '2.5', kode: '(dimuat langsung di demo)' });
  }
  // kernel memuat modul tanpa eval: kompilasi diganti objek modul yang sudah dimuat di halaman
  window.modulKompilasi_ = function () { var m = window.__MODUL; return { versi: '1.5.2', aksi: m.aksi, kait: m.kait, fitur: m.fitur, baca: m.baca, timpa: m.timpa || [] }; };

  /* ---------- jembatan aplikasi ---------- */
  var peran = 'admin';
  window.REG = { url: 'https://demo.monitoring-pengadaan/exec', sesi: null };
  window.PROYEK = { id: P, nama: 'Jembatan Sungai Lematang (Demo)', namaLengkap: 'Proyek Demo Pembangunan Jembatan Sungai Lematang' };
  window.escHtml = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  window.mp220Srv = function () { return true; };
  window.renderSemuaData = function () { };
  window.keluarLogin = function () { };
  window.confirm = function () { return true; };   // layar konfirmasi aplikasi asli muncul di sini; demo menganggap "Ya"
  function aturSesi() { var u = USER[peran]; REG.sesi = { nama: u[0], admin: u[2], peran: u[3], jabatan: '' }; }
  aturSesi();
  window.regAksi = function (action, extra) {
    var u = USER[peran], body = Object.assign({ action: action, nama: u[0], pin: u[1], proyek: P }, extra || {});
    var tunda = action === 'aiTanya' ? 650 + Math.random() * 500 : 120;
    return new Promise(function (ok, gagal) {
      setTimeout(function () {
        var out; try { out = JSON.parse(doPost({ postData: { contents: JSON.stringify(body) } })); } catch (e) { out = { ok: false, error: e.message }; }
        segarJejak();
        if (!out || out.ok === false) gagal(new Error((out && out.error) || 'Gagal')); else ok(out);
      }, tunda);
    });
  };
  var toastT; window.notif = function (m, t) { var el = document.getElementById('dToast'); if (!el) return; el.textContent = m; el.className = 'd-toast ' + (t || ''); el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 4200); };

  /* ---------- ekspor .md: unduhan diblokir di halaman ini → tampilkan isinya ---------- */
  var klikAsli = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^blob:/.test(this.href)) { var nama = this.download; fetch(this.href).then(function (r) { return r.text(); }).then(function (t) { bukaEkspor(nama, t); }); return; }
    return klikAsli.apply(this, arguments);
  };
  function bukaEkspor(nama, t) { document.getElementById('dEksNama').textContent = nama; document.getElementById('dEksIsi').value = t; document.getElementById('dEks').hidden = false; }
  window.demoTutupEkspor = function () { document.getElementById('dEks').hidden = true; };
  window.demoSalinEkspor = function () { var ta = document.getElementById('dEksIsi'); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { notif('Isi ringkasan disalin.', 'ok'); }, function () { ta.select(); notif('Pilih teks lalu salin manual (Ctrl+C).', ''); }); };

  /* ---------- tema: ikuti tema penampil ---------- */
  function syncTema() { var t = document.documentElement.getAttribute('data-theme'), gelap = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-tema', gelap ? 'gelap' : 'terang'); }
  syncTema(); try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTema); } catch (e) { }
  new MutationObserver(syncTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- panel kontrol demo ---------- */
  var esc = window.escHtml, jam = function (s) { var d = new Date(s); return isNaN(d) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  function segarJejak() {
    var el = document.getElementById('dJejak'); if (!el) return;
    var L = []; try { L = bacaLog_(P).slice(0, 9); } catch (e) { }
    el.innerHTML = L.length ? L.map(function (l) { var ai = l.aksi === 'AI-AKSI', j = (/^(\w+)/.exec(l.detail) || [])[1] || '';
      return '<li class="' + (ai ? 'ai ' + j.toLowerCase() : 'kernel') + '"><span class="w">' + jam(l.waktu) + '</span><span class="a">' + esc(l.aksi) + (ai ? ' · ' + esc(j) : '') + '</span><span class="o">' + esc(l.oleh) + '</span><span class="dt">' + esc(String(l.detail).replace(/^\w+ · /, '').slice(0, 150)) + '</span></li>'; }).join('')
      : '<li class="kosong">Belum ada aktivitas. Kirim pertanyaan di panel Asisten AI.</li>';
    var pbj = 0, gr = 0; try { pbj = bacaPBJ_(P).length; gr = (DEMO.sheets[P + '_GudangMasuk'] || { rows: [] }).rows.length - 1; } catch (e) { }
    document.getElementById('dPbj').textContent = pbj; document.getElementById('dGr').textContent = gr;
    var q = DEMO.cache[Object.keys(DEMO.cache).find(function (k) { return /^AIQ_/.test(k) && k.indexOf(USER[peran][0].toLowerCase().replace(/[^a-z0-9]+/g, '_')) > 0; })] || 0;
    document.getElementById('dKuota').textContent = q + '/60';
  }
  function gantiSesi() {
    aturSesi(); if (window.mp227AiTutup) mp227AiTutup(); window.renderSemuaData();
    document.querySelectorAll('[name=dPeran]').forEach(function (r) { r.checked = r.value === peran; });
    setTimeout(function () { if (window.mp227AiBuka) mp227AiBuka(); }, 350);
  }
  window.demoPeran = function (v) { peran = v; gantiSesi(); notif('Masuk sebagai ' + USER[v][0] + '.', 'ok'); };
  window.demoSkenario = function (v) { DEMO.skenario = v; notif({ normal: 'Penyedia normal (OpenAI tetap gagal karena key berisi URL).', sibuk: 'Gemini dibuat sibuk (HTTP 503) — pilih Google Gemini di dropdown untuk melihat pengalihan.', uji: 'Kondisi sama seperti hasil uji Anda: 401 / 402 / 503.' }[v], ''); };
  window.demoCoba = function (t) { if (window.mp227AiBuka) mp227AiBuka(); setTimeout(function () { window.mp227AiKirim(t); }, 120); };
  window.demoSetelan = function () { if (peran !== 'admin') demoPeran('admin'); setTimeout(function () { window.mp227AiSetel(); }, 450); };
  window.demoReset = function () { if (window.mp227AiBaru) mp227AiBaru(); isiData(); DEMO.skenario = 'normal'; var s = document.querySelector('[name=dSkn][value=normal]'); if (s) s.checked = true; peran = 'admin'; gantiSesi(); segarJejak(); notif('Data demo dikembalikan ke awal.', 'ok'); };
  window.demoMulai = function () {
    isiData(); window.renderSemuaData(); segarJejak();
    var n = 0, t = setInterval(function () { if (document.getElementById('mp227AiFab') || ++n > 40) { clearInterval(t); if (innerWidth >= 1100 && window.mp227AiBuka) mp227AiBuka(); } }, 150);
  };
})();
