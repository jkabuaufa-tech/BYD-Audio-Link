// Uji UI 2.5.6 di Chromium: unggah PDF checklist TANPA AI (Mode Manual), status & sebab gagal, Coba lagi tanpa berkas ganda,
// riwayat berkas lama, gerbang tetap, dan bundel saat AI gagal (penyimpanan tetap). Server = Code.gs ASLI + modul 1.8.4 ASLI (harness);
// unggah memakai aksi kernel "unggahBerkas" yang sebenarnya (Drive tiruan) sehingga Manifest SHA-256 terisi seperti di server.
// Catatan: fungsi unggahPdf aplikasi dasar (HTML v2.0) tidak ada di paket — ditiru: PDF → base64 → regAksi('unggahBerkas') → ref {id, idServer, lokasi:'server'}.
const { chromium } = require('playwright');
const { buatKonteks } = require('./harness.js');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[3] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.argv[2] || 'pembaruan-2.5.6.json'), 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const keu = potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'), vt = potong('/* MP230 — PEMBARUAN', '/* MP241 — PEMBARUAN'), mp241 = potong('/* MP241 — PEMBARUAN', '/* MP250 — PEMBARUAN');
// ---------- server: kernel + modul asli ----------
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
C.Utilities.base64Decode = s => [...Buffer.from(String(s), 'base64')].map(b => b > 127 ? b - 256 : b);
const tulisBlob = C.Utilities.newBlob; C.Utilities.newBlob = (v, tipe, nama) => Array.isArray(v) ? { bytes: v, tipe, nama, getBytes: () => v } : tulisBlob(v);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]); K.tulisProyek_([K.PROYEK_AWAL]);
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const ADM = (a, e) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, e || {}));
assert.ok(ADM('modulUnggah', { data: JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.8.4.json', 'utf8')) }).ok); assert.ok(ADM('modulTerbit', { versi: '1.8.4', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis pembaruan 2.5.6' }).ok);
const folderId = K.folderProyek_(P).getId(), fo = C.DriveApp.getFolderById(folderId); let nId = 0;
fo.createFile = blob => { const fid = 'DRV' + (++nId); C.__files[fid] = { nama: blob.nama, data: Buffer.from(blob.bytes.map(b => b & 255)).toString('latin1'), biner: true, induk: folderId, diubah: Date.now() };
  return { getId: () => fid, getName: () => blob.nama, getUrl: () => 'drive://' + fid, getSize: () => blob.bytes.length, setDescription() { } }; };
const NO = '001/SPSA/WK/DIV.II/INF1/1425011/2025';
K.tulisKoleksi_(P, 'data', [{ id: 'R1', noKontrak: NO, namaVendor: 'CV Gema Multi Kencana', tglKontrak: '2025-06-23', nilai: 151300000 }]);
K.tulisKoleksi_(P, 'progres', [{ id: 'TB1', versi: 1, noKontrak: NO, tagihanKe: 1, nomorBA: '01/BAP/001/SPSA', nilai: 118500000, baTerbit: true }, { id: 'TB0', versi: 1, noKontrak: NO, tagihanKe: 0, nomorBA: '00/BAP/LAMA', nilai: 1, baTerbit: true }]);
C.__files['LAMA-1'] = { nama: 'CHECKLIST · lama · Kwitansi lama.pdf', data: '%PDF-1.4 lama', induk: folderId, diubah: 1 };
K.cl217SimpanBaris_(P, { id: 'TB0', noKontrak: NO, kategori: 'ALAT', versi: 3, items: { UMUM_03: { status: 'ADA', file: { id: 'LAMA-1', idServer: 'LAMA-1', nama: 'Kwitansi lama.pdf', lokasi: 'server' }, tgl: '2025-07-01', ket: 'data lama' } }, verified: false, diubahOleh: 'lama', diubahPada: '' }, 0);
K.cl217SimpanBaris_(P, { id: 'TB1', noKontrak: NO, kategori: 'ALAT', versi: 1, items: {}, verified: false, diubahOleh: 'uji', diubahPada: '' }, 1);
const snapTB0 = JSON.stringify(ADM('checklistBaca', { id: 'TB0' }).data);
C.__jawabHTTP = () => ({ kode: 401, teks: { error: { type: 'authentication_error', message: 'invalid x-api-key' } } });   // semua penyedia AI menolak
const jmlDrive = () => Object.keys(C.__files).filter(k => /^DRV/.test(k)).length;
const progres = K.bacaKoleksi_(P, 'progres').map(x => Object.assign({ periode: 'Juli 2025', periodeKey: 202507, baTerbit: '2025-07-18' }, x));
function pdf(label, kb) { const isi = '%PDF-1.4\n%' + label + '\n' + (kb ? 'x'.repeat(kb * 1024) : '') + '\n%%EOF'; return Buffer.from(isi, 'latin1'); }
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,Arial;margin:0;background:#E9EEF5;color:#14233A;font-size:15px}
    .btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;cursor:pointer;background:#fff;display:inline-flex;gap:6px;align-items:center}.btn-primary{background:#1763B3;color:#fff;border-color:#1763B3}.btn-success{background:#2E9E5B;color:#fff}.btn-sm{font-size:.8rem}
    .d-flex{display:flex}.gap-2{gap:8px}.form-control,.form-select{width:100%;box-sizing:border-box;padding:4px 6px}.modal{position:fixed;inset:0;background:rgba(0,0,0,.45);overflow:auto;z-index:1050}.modal-dialog{max-width:1140px;margin:20px auto}.modal-content{background:var(--f-bg,#fff);border-radius:12px;overflow:hidden}
    .modal-header,.modal-footer{display:flex;gap:8px;align-items:center;padding:10px 14px}.alert{padding:8px 12px;border-radius:8px;margin:8px 0}.alert-danger{background:#FDE2E2}.small{font-size:.82rem}.text-muted{color:#6B7A90}#tab-keuangan{padding:16px}</style><style>${css}</style></head>
    <body><div id="tab-keuangan"><h3>Keuangan</h3><div id="keuIsi"></div></div></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(([P, progres]) => {
    const nama = 'Joko Supriyono', pin = '1234';
    window.REG = { url: 'https://contoh/exec', sesi: { nama, admin: true, peran: 'PENGADAAN' } };
    window.PROYEK = { id: P, nama: 'Rehabilitasi Jaringan Irigasi', kso: 'WASKITA - NINDYA KSO' };
    window.PROG = { data: progres }; window.barisBK = () => ({ vendor: 'CV Gema Multi Kencana' });
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.__notif = []; window.notif = (m, t) => { window.__notif.push([m, t]); }; window.mp220Srv = () => true;
    window.tampilModal = (id, ya) => { const m = document.getElementById(id); m.style.display = ya ? 'block' : 'none'; m.classList.toggle('show', !!ya); };
    window.BERKAS_REF = {}; window.__dilihat = []; window.lihatBerkas = id => { window.__dilihat.push(window.BERKAS_REF[id]); };
    window.cekPdf = async f => { if (f.size > 30 * 1048576) throw new Error('Ukuran PDF maksimal 30 MB (berkas ini ' + (f.size / 1048576).toFixed(1) + ' MB). Pisahkan menjadi beberapa file.');
      const h = new Uint8Array(await f.slice(0, 5).arrayBuffer()); if (String.fromCharCode.apply(null, h) !== '%PDF-') throw new Error('Isi berkas bukan PDF yang valid.'); };
    window.__gagal = null;   // { aksi, waktu: 'sebelum' | 'sesudah', pesan } — tiruan gangguan jaringan / izin
    window.regAksi = async (a, extra) => {
      const g = window.__gagal; if (g && g.aksi === a && g.waktu === 'sebelum') { window.__gagal = null; throw new Error(g.pesan); }
      const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {}))));
      if (g && g.aksi === a && g.waktu === 'sesudah') { window.__gagal = null; throw new Error(g.pesan); }   // server sudah menyimpan, jawaban hilang
      if (!r.ok) throw new Error(r.error); return r; };
    window.unggahPdf = async (file, meta) => {   // tiruan unggahPdf HTML dasar → aksi kernel unggahBerkas
      const b = new Uint8Array(await file.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
      const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const r = await window.regAksi('unggahBerkas', { berkas: { id, data: btoa(s), nama: file.name, jenis: meta.jenis, ket: meta.ket } });
      return { id, idServer: r.id, nama: file.name, ukuran: file.size, jenis: meta.jenis, ket: meta.ket, lokasi: 'server' }; };
    window.keluarLogin = () => { }; window.renderSemuaData = () => { }; window.itemCmdk = () => []; window.showTab = () => { }; window.bukaTab = () => { };
  }, [P, progres]);
  await pg.addScriptTag({ content: keu }); await pg.addScriptTag({ content: vt }); await pg.addScriptTag({ content: mp241 });
  await pg.evaluate(() => window.renderKeuangan()); await pg.waitForTimeout(800);
  await pg.evaluate(() => window.cl217Buka('TB1')); await pg.waitForSelector('#mp219ClPanel .mp256-mode', { timeout: 8000 }); await pg.waitForTimeout(500);
  const unggah = async (k, buf, nama) => {
    await pg.evaluate(k => window.mp219ClUpload(k), k); await pg.waitForSelector('#mp219UpFile', { state: 'attached' });
    await pg.setInputFiles('#mp219UpFile', { name: nama, mimeType: 'application/pdf', buffer: buf }); await pg.click('#mp219UpOk');
    await pg.waitForFunction(() => { const s = document.getElementById('mp219UpStatus'); return s && /\b(ok|gagal)\b/.test(s.className); }, null, { timeout: 15000 });
    return pg.evaluate(() => ({ kelas: document.getElementById('mp219UpStatus').className, teks: document.getElementById('mp219UpStatus').innerText, tombol: (document.getElementById('mp219UpOk') || {}).innerText }));
  };
  const server = k => (ADM('checklistBaca', { id: 'TB1' }).data.items[k] || {});
  const ulang = async () => { await pg.evaluate(() => { document.getElementById('mp219UpStatus').className = 'mp256-up'; }); await pg.click('#mp219UpOk'); await pg.waitForFunction(() => { const s = document.getElementById('mp219UpStatus'); return s && /\b(ok|gagal)\b/.test(s.className); }, null, { timeout: 15000 });
    return pg.evaluate(() => ({ kelas: document.getElementById('mp219UpStatus').className, teks: document.getElementById('mp219UpStatus').innerText })); };

  console.log('1. Mode Manual (Tanpa AI) — bawaan bila AI belum tersedia');
  ok(await pg.evaluate(() => window.mp256ModeManual() && /Mode Manual/.test(document.querySelector('.mp256-mode').innerText)), 'tanpa penyedia AI aktif → Mode Manual (Tanpa AI) terpilih otomatis');
  ok(/Unggahan berhasil ≠ LOLOS verifikasi/.test(await pg.innerText('.mp256-mode')) && /alasan pengecualian/.test(await pg.innerText('.mp256-mode')), 'strip menegaskan unggahan ≠ LOLOS & gerbang Verifikasi Admin tetap');
  console.log('2. Unggah tanpa API key AI: Drive → idServer → Simpan checklist');
  let s = await unggah('UMUM_03', pdf('KWITANSI', 20), 'Kwitansi 001.pdf');
  ok(/\bok\b/.test(s.kelas) && /Berhasil/.test(s.teks) && /belum berarti LOLOS/.test(s.teks), 'status "Berhasil" + penjelasan belum LOLOS verifikasi');
  let v = server('UMUM_03');
  ok(v.status === 'ADA' && /^DRV/.test(v.file.idServer) && C.__files[v.file.idServer] && jmlDrive() === 1, 'server: Kwitansi ADA dengan idServer ' + v.file.idServer + ' (berkas ada di Drive proyek)');
  ok(C.__http.length === 0 && !ADM('baca', { jenis: 'log' }).data.some(l => /AI-AKSI|BACA DOKUMEN/.test(l.aksi)), 'tidak ada panggilan penyedia AI sama sekali (tanpa biaya, tidak bergantung API key)');
  const mf = ADM('manifestBaca').data.find(x => x.id === v.file.idServer);
  ok(mf && mf.sha256 === require('crypto').createHash('sha256').update(pdf('KWITANSI', 20)).digest('hex'), 'Manifest server mencatat SHA-256 berkas yang sama dengan isi PDF');
  await pg.waitForTimeout(2400);
  ok(await pg.evaluate(() => !document.getElementById('mp219UpStatus')) && /✓ Drive/.test(await pg.innerText('#mp219ClPanel')), 'dialog tertutup otomatis; baris menampilkan lencana "✓ Drive"');
  console.log('3. Koneksi terputus SETELAH server menyimpan (jawaban hilang) → Coba lagi tanpa berkas ganda');
  await pg.evaluate(() => { window.__gagal = { aksi: 'unggahBerkas', waktu: 'sesudah', pesan: 'Failed to fetch' }; });
  s = await unggah('UMUM_04', pdf('INVOICE', 30), 'Invoice 001.pdf');
  ok(/gagal/.test(s.kelas) && /Koneksi terputus/.test(s.teks) && /Coba lagi/.test(s.tombol), 'status "Gagal — Koneksi terputus" + tombol Coba lagi');
  ok(jmlDrive() === 2 && !server('UMUM_04').file, 'server sudah menyimpan PDF (Drive 2 berkas) tetapi checklist belum memuatnya');
  s = await ulang();
  v = server('UMUM_04');
  ok(/\bok\b/.test(s.kelas) && jmlDrive() === 2 && v.file && v.file.idServer === 'DRV2', 'Coba lagi menemukan PDF di Manifest (SHA-256) → dipakai ulang, Drive tetap 2 berkas (tidak ganda)');
  console.log('4. Koneksi terputus SEBELUM sampai server → Coba lagi mengunggah sekali');
  await pg.evaluate(() => { window.__gagal = { aksi: 'unggahBerkas', waktu: 'sebelum', pesan: 'NetworkError when attempting to fetch resource.' }; });
  s = await unggah('UMUM_05', pdf('FAKTUR', 10), 'Faktur 001.pdf');
  ok(/Koneksi terputus/.test(s.teks) && jmlDrive() === 2, 'gagal sebelum terkirim: tidak ada berkas baru');
  s = await ulang(); ok(/\bok\b/.test(s.kelas) && jmlDrive() === 3 && server('UMUM_05').file.idServer === 'DRV3', 'Coba lagi: diunggah tepat sekali (Drive 3 berkas)');
  console.log('5. PDF tersimpan tetapi Simpan checklist gagal → peringatan jelas, Coba lagi tidak mengunggah ulang');
  await pg.evaluate(() => { window.__gagal = { aksi: 'checklistSimpan', waktu: 'sebelum', pesan: 'Failed to fetch' }; });
  s = await unggah('UMUM_07', pdf('BAP', 10), 'BAP 001.pdf');
  ok(/Checklist belum tersimpan/.test(s.teks) && /sudah tersimpan di Google Drive/.test(s.teks) && /tidak diunggah ulang/.test(s.teks), 'status: PDF SUDAH di Drive, checklist BELUM tersimpan, Coba lagi tidak mengunggah ulang');
  ok(/belum disimpan/.test(await pg.innerText('#mp219ClPanel')) && /belum disimpan/.test(await pg.innerText('.mp256-tunda')) && /Ada perubahan belum disimpan/.test(await pg.innerText('#mp219ClKaki')), 'baris "belum disimpan" + peringatan "PDF sudah di Drive tetapi checklist belum disimpan" + kaki modal');
  await pg.screenshot({ path: OUT + '/ui256-checklist-tunda.png' });
  s = await ulang(); ok(/\bok\b/.test(s.kelas) && jmlDrive() === 4 && server('UMUM_07').file.idServer === 'DRV4', 'Coba lagi → hanya menyimpan checklist (Drive tetap 4 berkas)');
  console.log('6. Sebab gagal spesifik');
  s = await unggah('UMUM_08', Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(31 * 1048576, 32)]), 'Scan besar.pdf');
  ok(/File terlalu besar/.test(s.teks) && /30 MB/.test(s.teks) && jmlDrive() === 4, 'PDF 31 MB → "File terlalu besar" (tidak ada yang diunggah)');
  await pg.evaluate(() => window.mp219TutupLapis());
  await pg.evaluate(() => { window.__gagal = { aksi: 'unggahBerkas', waktu: 'sebelum', pesan: 'Akun Lihat saja tidak dapat mengunggah berkas.' }; });
  s = await unggah('UMUM_08', pdf('BAPA', 5), 'BAPA.pdf'); ok(/Izin ditolak/.test(s.teks), 'penolakan akun/izin → "Izin ditolak"');
  await pg.evaluate(() => window.mp219TutupLapis());
  await pg.evaluate(() => { window.__gagal = { aksi: 'unggahBerkas', waktu: 'sebelum', pesan: 'Exception: Service error: Drive' }; });
  s = await unggah('UMUM_08', pdf('BAPA', 5), 'BAPA.pdf'); ok(/Penyimpanan gagal/.test(s.teks), 'galat layanan Drive → "Penyimpanan gagal"');
  await pg.evaluate(() => window.mp219TutupLapis());
  s = await unggah('UMUM_08', Buffer.from('bukan pdf sama sekali'), 'palsu.pdf'); ok(/bukan PDF yang sah/.test(s.teks), 'isi bukan PDF → "Berkas bukan PDF yang sah"');
  await pg.evaluate(() => window.mp219TutupLapis());
  console.log('7. Ganti PDF resmi: berkas lama tetap ada & riwayat dapat dibuka');
  const lama = server('UMUM_03').file.idServer;
  await pg.evaluate(() => window.mp219ClUpload('UMUM_03')); await pg.waitForSelector('#mp219UpFile', { state: 'attached' });
  ok(/tidak menghapus berkas lama/.test(await pg.innerText('.mp256-ganti')), 'dialog ganti: "berkas lama tetap tersimpan di Google Drive"');
  await pg.setInputFiles('#mp219UpFile', { name: 'Kwitansi 001 rev.pdf', mimeType: 'application/pdf', buffer: pdf('KWITANSI-REV', 20) }); await pg.click('#mp219UpOk');
  await pg.waitForFunction(() => /\bok\b/.test((document.getElementById('mp219UpStatus') || {}).className || ''));
  ok(server('UMUM_03').file.idServer !== lama && C.__files[lama] && jmlDrive() === 5, 'checklist menunjuk PDF baru; PDF lama ' + lama + ' tetap di Drive');
  await pg.waitForTimeout(2400); await pg.evaluate(() => window.mp219ClUpload('UMUM_03')); await pg.waitForSelector('.mp256-ganti a');
  await pg.click('.mp256-ganti a'); await pg.waitForSelector('.mp256-riw li');
  const riw = await pg.$$eval('.mp256-riw li', L => L.map(li => li.innerText.replace(/\s+/g, ' ')));
  ok(riw.length === 2 && /dipakai/.test(riw[0]) && /Kwitansi 001 rev/.test(riw[0]) && /Kwitansi 001\.pdf/.test(riw[1]), 'riwayat berkas baris: versi baru (dipakai) & versi lama dari Manifest');
  await pg.click('.mp256-riw li:nth-child(2) button'); ok(await pg.evaluate(() => window.__dilihat.pop().idServer) === lama, 'versi lama dapat dibuka kembali (lihatBerkas idServer lama)');
  await pg.evaluate(() => window.mp219TutupLapis());
  console.log('8. Data lama & gerbang tidak berubah');
  ok(JSON.stringify(ADM('checklistBaca', { id: 'TB0' }).data) === snapTB0 && C.__files['LAMA-1'] && ADM('ambilBerkas', { id: 'LAMA-1' }).ok, 'checklist tagihan lain (data lama) identik; PDF lama tetap dapat diambil');
  const tb1 = ADM('checklistBaca', { id: 'TB1' }).data; ok(!tb1.verified, 'unggahan tidak memverifikasi otomatis (verified tetap false)');
  const it0 = {}; K.CL217_TEMPLATES.ALAT.reduce((a, x) => a.concat(x.items), []).forEach(d => { it0[d.k] = tb1.items[d.k] && tb1.items[d.k].status === 'ADA' ? tb1.items[d.k] : { status: 'NA', alasan: 'Tidak berlaku untuk paket uji ini' }; });
  const sv = ADM('checklistSimpan', { data: { id: 'TB1', versi: tb1.versi, items: it0 } }); assert.ok(sv.ok, sv.error);
  let g = ADM('checklistVerifikasi', { data: { id: 'TB1', versi: sv.data.versi, konfirmasiAsli: true } });
  ok(!g.ok && /Gerbang verifikasi tagihan: belum ada hasil verifikasi/.test(g.error), 'tanpa hasil AI: Verifikasi Admin tetap ditolak gerbang (alasan ≥ 20 karakter wajib)');
  g = ADM('checklistVerifikasi', { data: { id: 'TB1', versi: sv.data.versi, konfirmasiAsli: true, vtAlasan: 'Diperiksa manual oleh Admin, AI tidak tersedia' } });
  ok(g.ok && g.data.verified && ADM('baca', { jenis: 'log' }).data.some(l => l.aksi === 'VERIFIKASI ADMIN DENGAN CATATAN AI'), 'dengan alasan pengecualian: Verifikasi Admin berhasil & tercatat "VERIFIKASI ADMIN DENGAN CATATAN AI"');
  console.log('9. Mode AI saat API key ditolak: bundel tersimpan, analisis AI gagal → informasi + opsi Manual');
  ADM('aiSetel', { data: { bawaanId: 'anthropic', kuota: 50, peran: ['ADMIN', 'PENGADAAN'], providers: [{ id: 'anthropic', model: 'claude-sonnet-5-5', aktif: true, kunci: 'sk-ant-api03-uji-0123456789abcdef' }] } });
  K.tulisKoleksi_(P, 'progres', K.bacaKoleksi_(P, 'progres').concat([{ id: 'TB2', versi: 1, noKontrak: NO, tagihanKe: 2, nomorBA: '02/BAP/001/SPSA', nilai: 5, baTerbit: true }]));
  K.cl217SimpanBaris_(P, { id: 'TB2', noKontrak: NO, kategori: 'ALAT', versi: 1, items: {}, verified: false, diubahOleh: 'uji', diubahPada: '' }, 2);
  await pg.evaluate(async () => { window.PROG.data.push({ id: 'TB2', versi: 1, noKontrak: '001/SPSA/WK/DIV.II/INF1/1425011/2025', tagihanKe: 2, nomorBA: '02/BAP/001/SPSA', nilai: 5, periode: 'Juli 2025', periodeKey: 202507 });
    window.MP230_VT.info = await window.regAksi('vtInfo'); localStorage.removeItem('MP256_MODE_CHECKLIST'); window.cl217Buka('TB2'); });
  await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => !window.mp256ModeManual()), 'penyedia AI aktif & belum ada pilihan → Mode AI');
  const dAwal = jmlDrive(), vtAwal = JSON.stringify(ADM('vtRingkas').data);
  await pg.evaluate(() => { window.MP219_KEU.dirty = false; window.MP230_VT.sub.TB2 = 'bundel'; window.mp230ClTab(); });
  await pg.evaluate(b64 => { const b = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); return window.mp240Unggah(new File([b], 'Bundel TB2.pdf', { type: 'application/pdf' })); }, pdf('BUNDEL', 40).toString('base64'));
  await pg.waitForSelector('.mp256-gagal-ai', { timeout: 15000 });
  const ban = await pg.innerText('.mp256-gagal-ai');
  ok(/Penyimpanan berhasil — analisis AI belum berhasil/.test(ban) && /1 PDF bundel sudah tersimpan di Google Drive/.test(ban) && jmlDrive() === dAwal + 1, 'banner: "Penyimpanan berhasil — analisis AI belum berhasil", bundel tetap di Drive');
  ok(/401|ditolak/i.test(ban) && /Ulangi analisis AI/.test(ban) && /Beralih ke Mode Manual/.test(ban), 'sebab (API key ditolak) + tombol Ulangi analisis AI & Beralih ke Mode Manual');
  ok(JSON.stringify(ADM('vtRingkas').data) === vtAwal && !ADM('checklistBaca', { id: 'TB2' }).data.verified, 'tidak ada hasil verifikasi baru/LOLOS; status checklist tidak berubah');
  await pg.screenshot({ path: OUT + '/ui256-ai-gagal.png' });
  await pg.click('.mp256-gagal-ai button:has-text("Beralih ke Mode Manual")'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => window.mp256ModeManual()) && await pg.isVisible('.mp256-mode'), 'beralih → Mode Manual, kembali ke Checklist Dokumen');
  await pg.evaluate(() => { window.__notif = []; window.MP219_KEU.dirty = false; const b = document.getElementById('mp241BtnBundel'); if (b) b.click(); });
  ok(await pg.evaluate(() => window.__notif.some(n => /Mode Manual \(Tanpa AI\) aktif: bundel PDF memerlukan pembacaan AI/.test(n[0]))), 'Mode Manual: tombol Unggah Bundel memberi petunjuk (fitur bundel tetap ada di Mode AI)');
  const http0 = C.__http.length; s = await unggah('UMUM_03', pdf('KWT-TB2', 8), 'Kwitansi TB2.pdf');
  ok(/\bok\b/.test(s.kelas) && C.__http.length === http0, 'Mode Manual dengan API key rusak: unggah tetap berhasil, tanpa panggilan AI');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
