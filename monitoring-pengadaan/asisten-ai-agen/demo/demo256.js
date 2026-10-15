/* Demo 2.5.6 — lapisan di atas vt-demo.js (kernel Code.gs ASLI + modul 1.8.4 ASLI di browser):
 *  · data gudang contoh ditulis ke sheet <ID>_GudangMasuk/_GudangKeluar (format modul) → Kartu Gudang, Stok & Pengeluaran memakai blok MP223 ASLI 2.5.6;
 *  · unggah PDF checklist meniru aksi kernel "unggahBerkas" + Manifest SHA-256 (seperti kait modul setelahUnggah) agar "Coba lagi tanpa berkas ganda" dapat dicoba;
 *  · simulasi gangguan: koneksi putus (sebelum / sesudah server menyimpan), Simpan checklist gagal, izin ditolak, API key AI ditolak (bundel).
 * Data contoh fiktif; tidak ada data proyek asli. */
(function () {
  'use strict';
  const S = window.__SNAP, P = S.P;
  const dua = n => String(n).padStart(2, '0');
  /* ---------- tab aplikasi (MP223 memasang tab gudang di <main>) ---------- */
  window.showTab = nama => {
    document.querySelectorAll('main .content-tab').forEach(s => { s.style.display = s.id === 'tab-' + nama ? '' : 'none'; });
    document.querySelectorAll('.d-nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === nama));
    if (nama === 'keuangan' && typeof window.renderKeuangan === 'function') window.renderKeuangan();
  };
  window.bukaTab = t => window.showTab(t);
  window.renderSemuaData = () => { }; window.keluarLogin = () => { }; window.itemCmdk = () => [];
  window.cekPdf = async f => {   // aturan cekPdf aplikasi (2.2.2): PDF ≤ 30 MB, header %PDF-
    if (!f) throw new Error('Tidak ada berkas.');
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') throw new Error('Berkas harus PDF.');
    if (f.size > 30 * 1048576) throw new Error('Ukuran PDF maksimal 30 MB (berkas ini ' + (f.size / 1048576).toFixed(1) + ' MB). Pisahkan menjadi beberapa file.');
    const h = new Uint8Array(await f.slice(0, 5).arrayBuffer()); if (String.fromCharCode.apply(null, h) !== '%PDF-') throw new Error('Isi berkas bukan PDF yang valid.');
  };
  window.BERKAS_REF = window.BERKAS_REF || {};
  window.lihatBerkas = async id => {   // pratinjau PDF lewat aksi kernel ambilBerkas
    const ref = window.BERKAS_REF[id]; if (!ref) return;
    try { const r = await window.regAksi('ambilBerkas', { id: ref.idServer }); document.getElementById('dCetakInfo').textContent = r.nama || ref.nama || '';
      document.getElementById('dCetakFrame').removeAttribute('srcdoc'); document.getElementById('dCetakFrame').src = 'data:application/pdf;base64,' + r.data; document.getElementById('dCetak').hidden = false; }
    catch (e) { window.notif('PDF tidak dapat dibuka: ' + e.message, 'err'); }
  };
  window.mp224Cetak = (html, opt) => {   // pratinjau cetak demo (aplikasi asli: dialog cetak MP224)
    const f = document.getElementById('dCetakFrame'); f.removeAttribute('src');
    document.getElementById('dCetakInfo').textContent = 'Orientasi: A4 ' + (opt && opt.lanskap ? 'lanskap' : 'portrait');
    f.srcdoc = html; document.getElementById('dCetak').hidden = false;
  };
  window.demoTutupCetak = () => { document.getElementById('dCetak').hidden = true; };

  /* ---------- data gudang contoh (format sheet modul 1.8.4) ---------- */
  const MAT = [['1000234561', 'Semen PCC 50 kg', 'ZAK'], ['1000187729', 'Besi beton D10', 'BTG'], ['1000187730', 'Besi beton D13', 'BTG'], ['1000187731', 'Besi beton D16', 'BTG'], ['1000187732', 'Besi beton D19', 'BTG'],
    ['1000001017', 'Beton Readymix Fc-10', 'M3'], ['1000001025', 'Beton Readymix Fc-25', 'M3'], ['1000001030', 'Beton Readymix Fc-30', 'M3'], ['1000045510', 'Pasir beton', 'M3'], ['1000045520', 'Batu split 1-2', 'M3'],
    ['1000067001', 'Kawat bendrat', 'KG'], ['1000067120', 'Multiplek 12 mm', 'LBR'], ['1000067150', 'Kayu bekisting 5/7', 'BTG'], ['1000071005', 'Paku 5 cm', 'KG'], ['1000071007', 'Paku 7 cm', 'KG'],
    ['1000082104', 'Pipa PVC 4" AW', 'BTG'], ['1000082106', 'Pipa PVC 6" AW', 'BTG'], ['1000090301', 'Geotextile non woven 300 gr', 'M2'], ['1000090410', 'Waterstop PVC 200 mm', 'M'], ['1000091111', 'Bata ringan 10 cm', 'M3'],
    ['1000093001', 'Cat anti karat', 'KLG'], ['1000094020', 'Solar (BBM alat)', 'LTR'], ['1000095100', 'Sika Grout 215', 'ZAK'], ['1000096007', 'Plastik cor 0,1 mm', 'ROL'], ['1000097300', 'Batu kali', 'M3']];
  for (let i = 1; i <= 25; i++) MAT.push(['20000' + dua(i) + '000', 'Material pendukung ' + dua(i), 'BH']);
  const T = s => s;   // tanggal ISO
  const rekMasuk = [], rekKeluar = []; let nGR = 0, nGI = 0;
  const gr = (kode, tgl, qty, bon, sj, ket, migrasi) => { const m = MAT.find(x => x[0] === kode); rekMasuk.push({ id: 'GR-DEMO-' + (++nGR), tanggal: T(tgl), bonNomor: bon, bonIdx: 0, kode, uraian: m[1], sat: m[2], kunci: kode, qty, harga: 1000 + nGR * 37,
    noSJ: sj, sjFile: null, foto: [null, null, null, null], diterimaOleh: 'Petugas Gudang', ket: ket || '', migrasi: !!migrasi, status: 'AKTIF', versi: 1, dibuatOleh: 'Petugas Gudang', dibuatPada: tgl + 'T0' + (nGR % 9) + ':00:00Z', diubahOleh: 'Petugas Gudang', diubahPada: tgl }); };
  const gi = (kode, tgl, qty, untuk, pen, ket) => { const m = MAT.find(x => x[0] === kode); rekKeluar.push({ id: 'GI-DEMO-' + (++nGI), tanggal: T(tgl), kode, uraian: m[1], sat: m[2], kunci: kode, qty, untuk, penerima: pen,
    foto: null, ket: ket || '', status: 'AKTIF', versi: 1, dibuatOleh: 'Petugas Gudang', dibuatPada: tgl + 'T1' + (nGI % 9) + ':00:00Z', diubahOleh: 'Petugas Gudang', diubahPada: tgl }); };
  gr('1000234561', '2026-06-10', 400, 'MIG-001/2026', '-', 'Saldo awal dari gudang lama', true);
  gi('1000234561', '2026-06-20', 120, 'Direksi Keet', 'Mandor A');                                   // data lama tanpa keterangan
  gr('1000234561', '2026-06-27', 200, '0118/BON/GDG/1726012/2026', 'SJ-SAJ-1102');                    // data lama tanpa keterangan → bawaan
  gr('1000234561', '2026-07-03', 250, '0131/BON/GDG/1726012/2026', 'SJ-SAJ-1180', 'Kiriman tahap 2 — semen untuk pile cap');
  gi('1000234561', '2026-07-03', 180, 'Pile Cap P3', 'Mandor B', 'Pengecoran pile cap P3');
  gi('1000234561', '2026-07-03', 40, 'Saluran BS-1', 'Mandor C');
  gi('1000234561', '2026-07-25', 60, 'Bangunan bagi BB-2', 'Mandor B', 'Lantai kerja BB-2');
  gr('1000234561', '2026-07-26', 150, '0140/BON/GDG/1726012/2026', 'SJ-SAJ-1233', 'Tambahan untuk abutment');
  gi('1000234561', '2026-08-02', 90, 'Abutment A1', 'Mandor D', 'Pengecoran abutment A1 tahap 1');
  gr('1000187730', '2026-07-05', 500, '0133/BON/GDG/1726012/2026', 'SJ-KS-77', 'Besi untuk pier P1–P3');
  gi('1000187730', '2026-07-12', 120, 'Pier P1', 'Mandor Besi');
  gr('1000187731', '2026-07-05', 300, '0133/BON/GDG/1726012/2026', 'SJ-KS-77');
  gr('1000001017', '2026-07-03', 14, 'MIG-014/2026', '-', 'Migrasi readymix', true);
  gi('1000001017', '2026-07-03', 14, 'Lantai kerja', 'Mandor A');
  MAT.slice(5).forEach((m, i) => gr(m[0], '2026-0' + (6 + (i % 4)) + '-' + dua(5 + (i % 20)), 20 + i * 3, '0' + (150 + i) + '/BON/GDG/1726012/2026', 'SJ-' + (500 + i), i % 3 ? '' : 'Pengadaan rutin bulan ' + (6 + (i % 4))));
  const MCOL = ['ID', 'Tanggal', 'No Bon', 'Baris Bon', 'Kode Material', 'Uraian', 'Satuan', 'Qty', 'Harga', 'No Surat Jalan', 'Diterima Oleh', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA'];
  const KCOL = ['ID', 'Tanggal', 'Kode Material', 'Uraian', 'Satuan', 'Qty', 'Untuk', 'Penerima', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA'];
  function isiGudang() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const m = ss.getSheetByName(P + '_GudangMasuk') || ss.insertSheet(P + '_GudangMasuk'), k = ss.getSheetByName(P + '_GudangKeluar') || ss.insertSheet(P + '_GudangKeluar');
    m.rows = [MCOL].concat(rekMasuk.map(r => [r.id, r.tanggal, r.bonNomor, 1, r.kode, r.uraian, r.sat, r.qty, r.harga, r.noSJ, r.diterimaOleh, r.status, r.diubahOleh, r.diubahPada, JSON.stringify(r)]));
    k.rows = [KCOL].concat(rekKeluar.map(r => [r.id, r.tanggal, r.kode, r.uraian, r.sat, r.qty, r.untuk, r.penerima, r.status, r.diubahOleh, r.diubahPada, JSON.stringify(r)]));
    FOTO = {};
  }
  /* ---------- foto serah terima: aksi gudangUnggahFoto ditiru (Drive tiruan demo tidak menyimpan biner); validasi GI tetap oleh modul asli ---------- */
  let FOTO = {};
  const gf = window.DriveApp.getFileById;
  window.DriveApp.getFileById = id => {
    const f = FOTO[id]; if (!f) return gf(id);
    const fp = window.DriveApp.getFolderById('FP');
    return { getId: () => id, getName: () => f.nama, getSize: () => f.ukuran, getMimeType: () => 'image/jpeg', getUrl: () => 'drive://' + id, getParents: () => { let i = 0; return { hasNext: () => i < 1, next: () => (i++, fp) }; },
      getBlob: () => ({ getBytes: () => [], getContentType: () => 'image/jpeg', getDataAsString: () => '' }) };
  };
  /* ---------- simulasi gangguan & unggah PDF dengan Manifest ---------- */
  window.__gagal = null;   // { aksi, waktu: 'sebelum' | 'sesudah', pesan }
  const ra = window.regAksi;
  window.regAksi = async function (aksi, extra) {
    const g = window.__gagal;
    if (g && g.aksi === aksi && g.waktu === 'sebelum') { window.__gagal = null; segarPanel(); await new Promise(r => setTimeout(r, 400)); throw new Error(g.pesan); }
    if (aksi === 'gudangUnggahFoto') { const id = 'FOTO-' + Date.now().toString(36); FOTO[id] = { nama: 'GUDANG · ' + ((extra.berkas || {}).nama || 'foto.jpg'), ukuran: Math.round(String((extra.berkas || {}).data || '').length * 0.75) };
      return { ok: true, data: { id, idServer: id, nama: FOTO[id].nama, ukuran: FOTO[id].ukuran, jenis: (extra.berkas || {}).jenis, lokasi: 'server', tipe: 'image/jpeg' } }; }
    const r = await ra.apply(this, arguments);
    if (g && g.aksi === aksi && g.waktu === 'sesudah') { window.__gagal = null; segarPanel(); throw new Error(g.pesan); }
    return r;
  };
  const up = window.unggahPdf;   // vt-demo: menyimpan PDF ke Drive tiruan; ditambah catatan Manifest SHA-256 seperti kait modul setelahUnggah
  window.unggahPdf = async (file, meta) => {
    const g = window.__gagal;
    if (g && g.aksi === 'unggahBerkas' && g.waktu === 'sebelum') { window.__gagal = null; segarPanel(); await new Promise(r => setTimeout(r, 600)); throw new Error(g.pesan); }
    const n0 = window.notif; window.notif = () => { };
    let ref; try { ref = await up(file, meta); } finally { window.notif = n0; }
    const b = await file.arrayBuffer(), d = await crypto.subtle.digest('SHA-256', b), sha = [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
    sheet_(P + '_ManifestBerkas', ['Waktu', 'ID Berkas', 'Nama Berkas', 'Ukuran', 'SHA-256', 'Oleh', 'Jenis', 'Keterangan', 'Sumber']).appendRow([new Date().toISOString(), ref.idServer, (meta.jenis || 'BERKAS') + ' · ' + (meta.ket || '') + ' · ' + file.name, b.byteLength, sha, (REG.sesi || {}).nama || '', meta.jenis || '', meta.ket || '', 'unggah']);
    ref = Object.assign({ ukuran: b.byteLength, jenis: meta.jenis, ket: meta.ket }, ref);
    segarPanel();
    if (g && g.aksi === 'unggahBerkas' && g.waktu === 'sesudah') { window.__gagal = null; segarPanel(); await new Promise(r => setTimeout(r, 500)); throw new Error(g.pesan); }   // server sudah menyimpan, jawaban hilang
    return ref;
  };
  window.demoGangguan = (aksi, waktu, pesan) => { window.__gagal = { aksi, waktu, pesan }; segarPanel(); window.notif('Gangguan disiapkan untuk ' + (aksi === 'unggahBerkas' ? 'unggahan PDF' : 'Simpan checklist') + ' berikutnya. Buka checklist lalu Upload.', ''); };
  const jmlPdf = () => { const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(P + '_ManifestBerkas'); return sh ? sh.rows.slice(1).filter(r => /CHECKLIST/.test(r[6])).length : 0; };
  function segarPanel() {
    const a = document.getElementById('dPdfDrive'); if (a) a.textContent = jmlPdf();
    const g = document.getElementById('dGangguan'); if (g) g.textContent = window.__gagal ? (window.__gagal.aksi === 'unggahBerkas' ? 'unggah PDF' : 'Simpan checklist') + ' · ' + (window.__gagal.waktu === 'sesudah' ? 'setelah server menyimpan' : 'sebelum terkirim') + ' · "' + window.__gagal.pesan + '"' : 'tidak ada';
    const ai = document.getElementById('dAI'); if (ai) ai.textContent = window.__demo401 ? 'API key DITOLAK (401)' : 'normal (simulasi)';
    const m = document.getElementById('dMode'); if (m && window.mp256ModeManual) m.textContent = window.mp256ModeManual() ? 'Manual (Tanpa AI)' : 'AI';
  }
  window.demoSegarPanel = segarPanel;
  /* ---------- API key ditolak: penyedia AI menjawab 401 ---------- */
  const llm = window.demoLLM;
  window.demoLLM = (url, o) => window.__demo401 ? { kode: 401, teks: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } } : llm(url, o);
  window.demoAI401 = on => { window.__demo401 = !!on; segarPanel(); window.notif(on ? 'Simulasi: semua API key AI ditolak penyedia (HTTP 401). Unggahan tetap tersimpan; analisis AI gagal.' : 'Simulasi AI kembali normal.', on ? 'err' : 'ok'); };
  /* ---------- pintasan panduan ---------- */
  window.demoKartuJuli = () => { const K = window.mp223K; window.showTab('gdkartu'); setTimeout(() => { K.kunci = '1000234561'; K.bulan = 7; K.tahun = 2026; window.mp223Render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 60); };
  window.demoKartuCari = () => { window.showTab('gdkartu'); setTimeout(() => { const i = document.getElementById('mp223KMatCari'); if (i) { i.focus(); } }, 120); };
  window.demoStok = () => { window.showTab('gdstok'); setTimeout(() => { const i = document.getElementById('mp223KItemCari'); if (i) i.scrollIntoView({ block: 'center' }); }, 150); };
  window.demoChecklistManual = () => { try { localStorage.setItem('MP256_MODE_CHECKLIST', 'manual'); } catch (e) { } if (window.demoPeran && REG.sesi && !REG.sesi.admin && REG.sesi.peran !== 'PENGADAAN') window.demoPeran('admin'); window.showTab('keuangan'); window.cl217Buka('TB1'); setTimeout(segarPanel, 600); };
  window.demoBundelGagal = () => { window.demoAI401(true); try { localStorage.setItem('MP256_MODE_CHECKLIST', 'ai'); } catch (e) { } window.demoBundel(false, false); setTimeout(segarPanel, 800); };
  const mulai = window.demoMulai;
  window.demoMulai = () => { mulai(); isiGudang(); window.showTab('keuangan'); if (window.mp223Muat) window.mp223Muat(true); segarPanel(); setInterval(segarPanel, 1500); };
  const reset = window.demoReset;
  window.demoReset = () => { reset(); isiGudang(); window.__gagal = null; window.__demo401 = false; if (window.MP223) window.MP223.siap = false; if (window.mp223Muat) window.mp223Muat(true); segarPanel(); };
})();
