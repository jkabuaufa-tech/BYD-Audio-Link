/* Demo Verifikasi Tagihan: keadaan server awal (snapshot) + Drive/AI tiruan + jembatan regAksi → kernel doPost + panel kontrol */
(function () {
  'use strict';
  const S = window.__SNAP, P = S.P;
  const USER = { admin: ['Joko Supriyono', '1234', true, 'PENGADAAN'], pengadaan: ['Staf Pengadaan', '1111', false, 'PENGADAAN'], lihat: ['Kepala Proyek', '0000', false, 'LIHAT'] };

  /* ---------- SHA-256 sinkron (PIN & sidik kernel memakai Utilities.computeDigest) ---------- */
  const K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(bytes) {
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(bytes); m[l] = 0x80;
    const bits = l * 8; for (let i = 0; i < 4; i++) m[n - 1 - i] = (bits >>> (8 * i)) & 255;
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const a = W[i - 15], b = W[i - 2]; W[i] = (W[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + W[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + W[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    const out = []; H.forEach(x => { for (let i = 3; i >= 0; i--) { const b = (x >>> (8 * i)) & 255; out.push(b > 127 ? b - 256 : b); } }); return out;
  }
  const utf8 = s => Array.from(new TextEncoder().encode(String(s)));
  Utilities.computeDigest = (alg, v) => sha256(typeof v === 'string' ? utf8(v) : (v || []).map(b => b & 255));
  Utilities.base64Encode = b => { b = b || []; let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, Array.prototype.slice.call(b, i, i + 32768).map(x => x & 255)); return btoa(s); };   // dipotong: PDF bagian s.d. 9,5 MB
  Utilities.newBlob = s => ({ teks: String(s), getBytes: () => utf8(s) });

  /* ---------- Drive tiruan: folder proyek + PDF checklist ---------- */
  let FILES = {}, EKS = {};
  const folder = id => ({ getId: () => id, getUrl: () => 'drive://' + id, getFoldersByName: () => { const f = folder('FP'); return { hasNext: () => true, next: () => f }; }, createFolder: () => folder('FP'),
    getFiles: () => { const L = Object.keys(FILES).filter(k => FILES[k].induk === id).map(berkas); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; },
    createFile: blob => { const fid = 'D' + Date.now(); DEMO.drive[fid] = blob.teks; return { getId: () => fid }; } });
  const berkas = id => { const b = FILES[id]; return { getId: () => id, getName: () => b.nama, getSize: () => b.data.length, getMimeType: () => 'application/pdf', getLastUpdated: () => new Date(b.diubah || 0),
    getParents: () => { let i = 0; return { hasNext: () => i < 1, next: () => (i++, folder(b.induk)) }; }, getBlob: () => ({ getBytes: () => b.biner ? Array.from(b.data, c => c.charCodeAt(0) & 255) : utf8(b.data), getDataAsString: () => b.data, getContentType: () => 'application/pdf' }), isTrashed: () => false, getUrl: () => 'drive://' + id }; };
  window.DriveApp = { getFileById: id => { if (FILES[id]) return berkas(id); if (!(id in DEMO.drive)) throw new Error('Berkas tidak ada (demo).'); return { getBlob: () => ({ getDataAsString: () => DEMO.drive[id] }) }; },
    getFolderById: id => folder(id), createFolder: () => folder('F1') };

  /* ---------- AI tiruan: "membaca" PDF = mengembalikan transkripsi berkas tagihan Anda ---------- */
  window.demoLLM = (url, o) => {
    const b = JSON.parse(o.payload), blok = ((b.messages || [])[0] && Array.isArray(b.messages[0].content) ? b.messages[0].content : []).find(c => c.type === 'document');
    if (!blok && /MODE TIM AI PROYEK/.test(b.system || '')) return { kode: 200, teks: { model: 'claude-sonnet-5-5', content: [{ type: 'text', text: JSON.stringify(demoTim(b)) }], usage: {} } };
    if (!blok) return { kode: 200, teks: { content: [{ type: 'text', text: 'Demo: hanya pembacaan dokumen yang disimulasikan.' }], usage: {} } };
    if (window.__demo502 > 0) { window.__demo502--; return { kode: 502, teks: '<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center><hr><center>cloudflare</center></body></html>' }; }
    const isi = atob(blok.source.data), fid = (/FILE:([\w.-]+)/.exec(isi) || [])[1] || '';
    const hal = [...isi.matchAll(/BUNPG:([\w.-]+):(\d+)/g)];   // bagian hasil pecah: penanda per halaman → dokumen di halaman itu
    if (hal.length) { const id = hal[0][1], H = hal.map(m => Number(m[2])), a = Math.min.apply(null, H), b = Math.max.apply(null, H);
      const dok = (EKS[id] || []).filter(x => x.halamanAkhir >= a && x.halamanMulai <= b).map(x => Object.assign({}, x, { halamanMulai: Math.max(x.halamanMulai, a) - a + 1, halamanAkhir: Math.min(x.halamanAkhir, b) - a + 1 }));
      return { kode: 200, teks: { model: 'claude-sonnet-5-5', content: [{ type: 'text', text: JSON.stringify({ dokumen: dok }) }], usage: {} } }; }
    return { kode: 200, teks: { model: 'claude-sonnet-5-5', content: [{ type: 'text', text: '```json\n' + JSON.stringify({ dokumen: EKS[fid] || [] }) + '\n```' }], usage: {} } };
  };

  function demoTim(b) {   // Penyusun Laporan Tim AI tiruan: merangkum DATA yang dikirim server (angka asli dari mesin aturan & data demo)
    const t = JSON.stringify(b.messages || []), ang = (re, d) => { const m = re.exec(t); return m ? Number(m[1]) : d; };
    const revisi = ang(/\\"butuhRevisi\\":(\d+)/, 0), tertahan = ang(/\\"tagihanTertahan\\":(\d+)/, 0), kontrak = ang(/\\"kontrakBelumLengkap\\":(\d+)/, 0);
    return { ringkasan: 'Tim AI menyelesaikan putaran kerja: Verifikator memproses tagihan yang lengkap/berbundel. ' + revisi + ' hasil verifikasi butuh revisi — prioritaskan temuan kritis rekening & faktur pajak sebelum pengajuan bayar. ' + tertahan + ' tagihan masih tertahan checklist; ' + kontrak + ' kontrak belum lengkap register (WBS/PR/RFQ/PO/TOP).',
      temuan: [{ judul: 'Rekening pembayaran tidak konsisten antar-dokumen', detail: 'Nomor rekening pada Invoice/Kwitansi SPSA berbeda dengan SPKTV — risiko salah transfer.', tingkat: 'tinggi', anggota: 'verifikator' },
        { judul: 'Jaminan uang muka SPPP berakhir 28 Agt 2025', detail: 'Perpanjangan jaminan diperlukan sebelum pembayaran berikutnya.', tingkat: 'tinggi', anggota: 'keuangan' },
        { judul: 'Register kontrak belum lengkap', detail: kontrak + ' kontrak tanpa WBS/PR/RFQ/PO/TOP lengkap.', tingkat: 'sedang', anggota: 'kontrak' }],
      saran: [{ judul: 'Periksa register kontrak SPSA & lengkapi PR/PO', aksi: 'bacaSemua', arg: { koleksi: 'list', cari: 'SPSA' }, dampak: 'Register lengkap mempercepat verifikasi tagihan berikutnya', anggota: 'kontrak', prioritas: 'sedang', pj: 'Pengadaan', tenggat: '' },
        { judul: 'Minta vendor SPPP memperpanjang jaminan uang muka', aksi: '', arg: {}, dampak: 'Syarat pembayaran uang muka/termin berikutnya', anggota: 'keuangan', prioritas: 'tinggi', pj: 'Keuangan', tenggat: '' },
        { judul: 'Ringkas status checklist seluruh tagihan', aksi: 'checklistRingkas', arg: { batas: 20 }, dampak: 'Melihat tagihan yang masih kurang dokumen', anggota: 'keuangan', prioritas: 'rendah', pj: 'Keuangan', tenggat: '' }] };
  }

  /* ---------- keadaan awal ---------- */
  function isiData() {
    DEMO.sheets = {}; DEMO.cache = {}; DEMO.http = []; DEMO.props = JSON.parse(JSON.stringify(S.props));
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(S.sheets).forEach(n => { const sh = ss.insertSheet(n); sh.rows = JSON.parse(JSON.stringify(S.sheets[n])); });
    FILES = JSON.parse(JSON.stringify(S.files)); EKS = JSON.parse(JSON.stringify(S.ekstrak));
    DEMO.drive = { 'DEMO-MODUL': JSON.stringify({ format: 'monitoring-sap-modul-server', versi: '1.8.3', untukKernel: '2.5', kode: '(dimuat langsung di demo)' }) };
    const reg = bacaKoleksi_(P, 'data'), vendor = {}; reg.forEach(r => { vendor[r.noKontrak] = r.namaVendor; });
    window.PROG = { data: bacaKoleksi_(P, 'progres').map(x => Object.assign({ periode: 'Juli 2025', periodeKey: 202507, baTerbit: '2025-07-18' }, x)) };
    window.barisBK = x => ({ vendor: vendor[x.noKontrak] || '-' });
  }
  window.modulKompilasi_ = function () { const m = window.__MODUL; return { versi: '1.8.3', aksi: m.aksi, kait: m.kait, fitur: m.fitur, baca: m.baca, timpa: m.timpa || [] }; };

  /* ---------- jembatan aplikasi ---------- */
  let peran = 'admin';
  window.REG = { url: 'https://demo.monitoring-pengadaan/exec', sesi: null };
  window.PROYEK = { id: P, nama: 'Rehabilitasi Jaringan Irigasi D.I/D.I.R Sumsel', namaLengkap: 'Rehabilitasi Jaringan Irigasi D.I/D.I.R Sumatera Selatan', kso: 'WASKITA - NINDYA KSO', kapro: 'DEDY HARIYANTO', kasi: 'JOKO SUPRIYONO' };
  window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.mp220Srv = () => true;
  window.confirm = () => true;   // dialog konfirmasi aplikasi dianggap "Ya" di demo
  const aturSesi = () => { const u = USER[peran]; REG.sesi = { nama: u[0], admin: u[2], peran: u[3] }; };
  aturSesi();
  window.regAksi = function (action, extra) {
    const u = USER[peran], body = Object.assign({ action, nama: u[0], pin: u[1], proyek: P }, extra || {});
    const tunda = action === 'vtEkstrak' ? 380 + Math.random() * 420 : action === 'vtNilai' ? 500 : action === 'timJalan' ? 1600 : 90;
    return new Promise((ok, gagal) => setTimeout(() => {
      let out; try { out = JSON.parse(doPost({ postData: { contents: JSON.stringify(body) } })); } catch (e) { out = { ok: false, error: e.message }; }
      segarJejak();
      if (!out || out.ok === false) gagal(new Error((out && out.error) || 'Gagal')); else ok(out);
    }, tunda));
  };
  window.tampilModal = (id, ya) => { const m = document.getElementById(id); if (!m) return; m.style.display = ya ? 'block' : 'none'; m.classList.toggle('show', !!ya); };
  document.addEventListener('click', ev => {   // pengganti Bootstrap: tombol tutup modal
    const t = ev.target.closest('[data-bs-dismiss="modal"]'); if (!t) return; const m = t.closest('.modal'); if (!m) return;
    const e1 = new Event('hide.bs.modal', { cancelable: true }); m.dispatchEvent(e1); if (e1.defaultPrevented) return;
    m.style.display = 'none'; m.classList.remove('show'); m.dispatchEvent(new Event('hidden.bs.modal'));
  });
  let toastT; window.notif = (m, t) => { const el = document.getElementById('dToast'); if (!el) return; el.textContent = m; el.className = 'd-toast ' + (t || ''); el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200); };

  /* ---------- unduhan .md: tampilkan isinya (unduhan dapat diblokir di halaman pratinjau) ---------- */
  const klikAsli = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^blob:/.test(this.href)) { const nama = this.download; fetch(this.href).then(r => r.text()).then(t => { document.getElementById('dEksNama').textContent = nama; document.getElementById('dEksIsi').value = t; document.getElementById('dEks').hidden = false; }); return; }
    return klikAsli.apply(this, arguments);
  };
  window.demoTutupEkspor = () => { document.getElementById('dEks').hidden = true; };

  /* ---------- tema mengikuti penampil ---------- */
  function syncTema() { const t = document.documentElement.getAttribute('data-theme'), gelap = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-tema', gelap ? 'gelap' : 'terang'); }
  syncTema(); try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTema); } catch (e) { }
  new MutationObserver(syncTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- panel kontrol ---------- */
  const esc = window.escHtml, jam = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  function segarJejak() {
    const el = document.getElementById('dJejak'); if (!el) return;
    let L = []; try { L = bacaLog_(P).filter(l => /VERIFIKASI|AI-AKSI|SETELAN/.test(l.aksi)).slice(0, 10); } catch (e) { }
    el.innerHTML = L.length ? L.map(l => `<li class="${l.aksi === 'AI-AKSI' ? 'ai' : /CATATAN AI/.test(l.aksi) ? 'warn' : 'kernel'}"><span class="w">${jam(l.waktu)}</span><span class="a">${esc(l.aksi)}</span><span class="o">${esc(l.oleh)}</span><span class="dt">${esc(String(l.detail || '').slice(0, 160))}</span></li>`).join('')
      : '<li class="kosong">Belum ada aktivitas verifikasi.</li>';
    let n = 0; try { n = Object.keys(DEMO.cache).filter(k => /^AIQ_/.test(k)).reduce((a, k) => a + Number(DEMO.cache[k] || 0), 0); } catch (e) { }
    const q = document.getElementById('dKuota'); if (q) q.textContent = n;
    const c = document.getElementById('dCache'); if (c) c.textContent = Math.max(0, ((DEMO.sheets[P + '_VerifikasiEkstrak'] || { rows: [] }).rows.length - 1));
  }
  function muatUlang() {
    const VT = window.MP230_VT; if (VT) { VT.kunci = ''; VT.siap = false; VT.galat = ''; VT.lap = {}; VT.jalan = {}; }
    const F = window.MP219_KEU; if (F) { F.ringkas = {}; F.siap = false; F.kunci = ''; }
    const m = document.getElementById('mp219Cl'); if (m) { m.style.display = 'none'; m.classList.remove('show'); }
    window.renderKeuangan(); segarJejak();
  }
  window.demoPeran = v => { peran = v; aturSesi(); document.querySelectorAll('[name=dPeran]').forEach(r => { r.checked = r.value === v; }); muatUlang(); notif('Masuk sebagai ' + USER[v][0] + (v === 'lihat' ? ' (hanya melihat laporan)' : '') + '.', 'ok'); };
  window.demoReset = () => { isiData(); peran = 'admin'; aturSesi(); document.querySelectorAll('[name=dPeran]').forEach(r => { r.checked = r.value === 'admin'; }); if (window.MP219_KEU) window.MP219_KEU.tab = 'daftar'; muatUlang(); notif('Data demo dikembalikan ke awal.', 'ok'); };
  window.demoGantiFaktur = () => {   // vendor menyerahkan Faktur Pajak SPSA yang sudah dibetulkan → PDF baru di checklist
    const sh = DEMO.sheets[P + '_ChecklistTagihan'], i = sh.rows.findIndex(r => r[0] === 'TSPSA'); if (i < 0) return;
    const rec = JSON.parse(sh.rows[i][6]), lama = rec.items.UMUM_05; if (!lama || !lama.file) return;
    if (/-v2$/.test(lama.file.idServer)) { notif('Faktur Pajak SPSA sudah diganti. Jalankan ulang verifikasi di tab Verifikasi AI.', ''); return; }
    const fid = lama.file.idServer + '-v2'; FILES[fid] = { nama: 'Faktur Pajak (pembetulan).pdf', data: 'FILE:' + fid, induk: 'FP', diubah: Date.now() };
    EKS[fid] = JSON.parse(JSON.stringify(EKS[lama.file.idServer])).map(d => { d.nilai = Object.assign({}, d.nilai, { dpp: 108625000 }); return d; });
    rec.items.UMUM_05 = Object.assign({}, lama, { file: Object.assign({}, lama.file, { id: fid, idServer: fid, nama: 'Faktur Pajak (pembetulan).pdf' }) });
    rec.versi = (Number(rec.versi) || 1) + 1; sh.rows[i][3] = rec.versi; sh.rows[i][6] = JSON.stringify(rec);
    muatUlang(); notif('Faktur Pajak SPSA diganti (DPP Rp108.625.000). Hasil verifikasi SPSA kini "Kedaluwarsa" — jalankan ulang: hanya faktur yang dibaca ulang.', 'ok');
  };
  window.demoBuka = tab => { window.showTab('keuangan'); if (window.MP219_KEU) window.mp219Keu({ tab }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  /* ---------- 1.7.0: 1 PDF bundel (contoh dibuat di browser: 10 halaman berlabel + penanda untuk AI tiruan) ---------- */
  function buatPdf(label, tanda, isiMB) {
    const obj = [], tambah = t => { obj.push(t); return obj.length; };
    const kat = tambah(''), hal = tambah(''), font = tambah('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'), kids = [];
    label.forEach((t, i) => { const isi = (isiMB ? '% BUNPG:BUN-TB1:' + (i + 1) + '\n' + ('% ' + 'x'.repeat(98) + '\n').repeat(Math.round(isiMB * 1048576 / 101)) : '') + 'BT /F1 30 Tf 60 720 Td (Halaman ' + (i + 1) + ') Tj 0 -54 Td /F1 24 Tf (' + t + ') Tj 0 -40 Td /F1 12 Tf (Contoh bundel demo - isi asli dibaca AI dari scan) Tj ET', st = tambah('<< /Length ' + isi.length + ' >>\nstream\n' + isi + '\nendstream');
      kids.push(tambah('<< /Type /Page /Parent ' + hal + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + font + ' 0 R >> >> /Contents ' + st + ' 0 R >>')); });
    obj[kat - 1] = '<< /Type /Catalog /Pages ' + hal + ' 0 R >>'; obj[hal - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
    let out = '%PDF-1.4\n%' + tanda + '\n'; const off = []; obj.forEach((o, i) => { off.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const x = out.length; out += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (obj.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
    return out;
  }
  window.unggahPdf = async (file, opsi) => {   // pengganti unggah Google Drive di demo
    const b = new Uint8Array(await file.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
    const id = 'UP-' + Date.now(); FILES[id] = { nama: file.name, data: s, biner: true, induk: 'FP', diubah: Date.now() };
    if (!/FILE:BUN-|BUNPG:/.test(s) && !/potongan bundel/.test((opsi && opsi.ket) || '')) notif('Demo: AI disimulasikan hanya untuk contoh bundel. Gunakan tombol "Contoh bundel SPSA".', '');
    return { id, idServer: id, nama: file.name, lokasi: 'server' };
  };
  window.demoBukaChecklist = () => { if (peran === 'lihat') demoPeran('admin'); window.showTab('keuangan'); window.cl217Buka('TB1'); };
  window.demoBundel = (besar, galat502) => {   // 2.4.1: lewat tombol header "Unggah Bundel Tagihan" (MP241) → mp240Unggah; 2.4.2: besar = ±25 MB (dipecah otomatis)
    window.__demo502 = galat502 ? 2 : 0; window.MP250_JEDA = [3, 6];   // 2.5.0: 502 dua kali (percobaan server) → aplikasi mencoba ulang otomatis
    if (peran === 'lihat') demoPeran('pengadaan');
    if (besar) notif('Membuat contoh scan ±25 MB di browser…', '');
    const pdf = buatPdf(S.labelBundel || [], 'FILE:BUN-TB1', besar ? 2.4 : 0), b = new Uint8Array(pdf.length); for (let i = 0; i < pdf.length; i++) b[i] = pdf.charCodeAt(i) & 255;
    const file = new File([b], besar ? 'Bundel SPSA 002 (scan 25 MB).pdf' : 'Bundel SPSA 002 (contoh).pdf', { type: 'application/pdf' });
    window.showTab('keuangan'); window.cl217Buka('TB1'); let n = 0;
    const t = setInterval(() => {
      const inp = document.getElementById('mp241FileBundel'), btn = document.getElementById('mp241BtnBundel');
      if ((inp && btn && window.MP219_KEU && window.MP219_KEU.rec) || ++n > 50) { clearInterval(t); if (!inp) return;
        btn.classList.add('d-sorot'); setTimeout(() => btn.classList.remove('d-sorot'), 1600);
        const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; inp.dispatchEvent(new Event('change')); }
    }, 150);
  };
  window.demoCmdk = q => {
    const el = document.getElementById('dCmdkHasil'), L = (window.itemCmdk(q) || []).slice(0, 4); window.__cmdk = L;
    el.innerHTML = L.map((x, i) => '<button type="button" class="d-btn" onclick="__cmdk[' + i + '].aksi()"><b>' + esc(x.l) + '</b><br><small>' + esc(x.grup + ' · ' + (x.s || '')) + '</small></button>').join('') || (q.trim().length > 1 ? '<span class="d-note">Tidak ada hasil.</span>' : '');
  };
  window.demoMulai = () => { isiData(); window.renderKeuangan(); segarJejak(); const p = document.getElementById('dP25'); if (p && window.mp241Tanggal25Prev) p.textContent = window.mp241Tanggal25Prev() + ' s.d. ' + window.mp241Tanggal25Now(); };
})();
