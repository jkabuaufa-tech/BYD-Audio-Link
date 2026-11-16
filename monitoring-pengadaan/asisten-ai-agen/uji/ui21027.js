// Uji 2.10.27 di Chromium (blok MP2622 & MP21024 dari paket; tanpa HTML dasar / kernel):
//  A. "Rincian item" atas PO yang itemnya dari Bon Permintaan — volume PO itu sendiri bukan "PO lain".
//  B. Preview SPM proyek Non-KSO — kop, NPWP & tanda tangan perusahaan sendiri, posisi meterai & stempel.
// Pakai: node uji/ui21027.js [paket-baru.json] [paket-lama.json] [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const BARU = process.argv[2] || path.join(__dirname, '..', 'pembaruan-2.10.27.json'), LAMA = process.argv[3] || path.join(__dirname, '..', 'pembaruan-2.10.26.json'), OUT = process.argv[4] || require('os').tmpdir();   // tangkapan resmi SPM Non-KSO (berlogo) dibuat uji/ui21028.js
const blok = (f, awal, akhir) => { const js = JSON.parse(fs.readFileSync(f, 'utf8')).js, a = js.indexOf(awal), b = akhir ? js.indexOf(akhir, a) : js.length; assert.ok(a >= 0 && b > a, 'blok ' + awal); return js.slice(a, b); };
const KEPALA = f => { const js = JSON.parse(fs.readFileSync(f, 'utf8')).js; return js.slice(0, js.indexOf('/* MP2102-MO')); };   // window.mpNoAdd
const NO65 = '065/SPM/WK-NK.KSO/PDBJ/1726012/2026', NO70 = '070/SPM/WK-NK.KSO/PDBJ/1726012/2026', B15 = '015/WK-NK.KSO/DIV.II/INF1/1726012/2026', B20 = '020/WK-NK.KSO/DIV.II/INF1/1726012/2026';
const PMT = [
  { nomor: B15, tanggal: '2026-11-02', keperluan: 'K3 & kantor', items: [{ kode: '18000071', uraian: 'Environment Meter 5in1 pro Krisbow', vol: 1, sat: 'PC' }, { kode: '16000008', uraian: 'Stretcher Stainless 200x65x100 cm', vol: 1, sat: 'UN' },
    { kode: '14000040', uraian: 'Lampu Sorot LED 1000W COB', vol: 1, sat: 'PC' }, { kode: '16000009', uraian: 'Helm Delta Putih+Tali Dagu 3M', vol: 14, sat: 'PC' }] },
  { nomor: B20, tanggal: '2026-11-10', keperluan: 'Tambahan K3', items: [{ kode: '18000064', uraian: 'Figura Sertifikat Kantor A4', vol: 2, sat: 'PC' }] }];
const REG0 = [
  { id: 'R65', versi: 3, noKontrak: NO65, jenisKontrak: 'SPM', namaVendor: 'Cahaya Utama Safety Indonesia, PT', items: [{ kode: '18000071', uraian: 'Environment Meter 5in1 pro Krisbow', vol: 1, sat: 'PC', harga: 4850000, noPermintaan: B15 }, { kode: '14000040', uraian: 'Lampu Sorot LED 1000W COB', vol: 1, sat: 'PC', harga: 8450000, noPermintaan: B15 }] },
  { id: 'R70', versi: 1, noKontrak: NO70, jenisKontrak: 'SPM', namaVendor: 'CV Lain', items: [{ kode: '16000009', uraian: 'Helm Delta Putih+Tali Dagu 3M', vol: 10, sat: 'PC', harga: 325000, noPermintaan: B15 }] }];
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };

async function halamanPO(br, paket) {
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="tab-register"><input id="regCari"><table><tbody id="regBody"></tbody></table></div></body></html>', contentType: 'text/html; charset=utf-8' }));
  await pg.goto('https://app.test/');
  await pg.evaluate(([PMT, REG0]) => {
    window.PROYEK = { id: 'P1' }; window.REG = { url: 'x', sesi: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', proyek: 'P1' }, data: JSON.parse(JSON.stringify(REG0)) }; window.PMT = { data: PMT }; window.RINGKASAN = [];
    window.NO_KONTRAK_TENGAH = 'WK-NK.KSO/PDBJ'; window.KELOMPOK_MAP = { SPM: 'MATERIAL' }; window.getVendorList = () => []; window.noKontrakSudahAda = () => false; window.saranNoUrut = () => 99;
    window.notif = (m, t) => (window.__n = window.__n || []).push([m, t]); window.__simpan = [];
    window.regAksi = async (a, x) => { window.__simpan.push([a, x]); const r = REG.data.find(k => k.id === x.data.id); if (r) { r.items = x.data.items; r.versi++; } return { ok: true }; };
    window.muatRegister = async () => { };
    // tiruan status bawaan aplikasi (sama dengan uji 2.6.23): item "sudah" bila ADA item kontrak ber-No Bon sama, berapa pun volumenya — termasuk kontrak yang sedang diubah
    window.statusKontrakPermintaan = p => { const K = (REG.data || []).filter(k => (k.items || []).some(x => x.noPermintaan === p.nomor)), sudah = p.items.map(it => K.some(k => k.items.some(x => x.noPermintaan === p.nomor && x.uraian === it.uraian))), n = sudah.filter(Boolean).length;
      return { kode: n === p.items.length ? 'selesai' : n ? 'sebagian' : 'belum', n, total: p.items.length, kontrak: K.map(k => k.noKontrak), sudah, alok: {} }; };
  }, [PMT, REG0]);
  await pg.addScriptTag({ content: KEPALA(paket) }); await pg.addScriptTag({ content: blok(paket, '/* MP2622', '/* MP270 — PEMBARUAN') });
  const pesan = () => pg.evaluate(() => { const L = (window.__n || []).map(x => x[0]); window.__n = []; return L; });
  const simpan = async () => { await pg.evaluate(() => mp2622Simpan()); await pg.waitForTimeout(150); return { pesan: await pesan(), kirim: await pg.evaluate(() => window.__simpan.splice(0)), buka: !!(await pg.$('#mp2622Kd')) }; };
  const rincian = async id => { await pg.evaluate(i => mp2622Rincian(i), id); await pg.waitForSelector('#mp2622Kd'); await pesan(); };
  const dariBon = async (nomor, i, v) => { await pg.evaluate(() => { if (mp2622Keadaan().panel !== 'bon') mp2622Panel('bon'); }); await pg.waitForSelector('.mp2622-bonl');
    const s = `.m22-bi:has(input[data-k="${nomor}#${i}"])`; if (await pg.$eval(s + ' input[type=checkbox]', x => x.disabled)) return false;
    await pg.check(s + ' input[type=checkbox]'); if (v != null) { await pg.fill(s + ' input.r', String(v)); await pg.press(s + ' input.r', 'Tab'); }
    await pg.click('#m22AmbilBtn'); await pg.waitForTimeout(100); return true; };
  const harga = () => pg.evaluate(() => { mp2622Keadaan().items.forEach(it => { if (String(it.uraian || '').trim() && !Number(it.harga)) it.harga = '1000'; }); });
  return { pg, gal, simpan, rincian, dariBon, harga, pesan };
}

(async () => {
  const br = await chromium.launch();

  console.log('A0. Paket lama 2.10.26 — galat terulang (pembanding)');
  let h = await halamanPO(br, LAMA); await h.rincian('R65'); let r = await h.simpan();
  ok(r.pesan.some(m => /Environment Meter 5in1 pro Krisbow: total PO 2 melebihi volume bon 1 PC \(PO lain 1\)/.test(m)) && !r.kirim.length, '2.10.26: simpan rincian PO 065 tanpa perubahan ditolak "total PO 2 melebihi volume bon 1 PC (PO lain 1)"');
  await h.pg.close();

  console.log('A. Paket baru — Rincian item PO 065');
  h = await halamanPO(br, BARU); await h.rincian('R65'); r = await h.simpan();
  ok(!r.pesan.some(m => /melebihi/.test(m)) && r.kirim.length === 1 && r.kirim[0][0] === 'save' && r.kirim[0][1].data.id === 'R65' && r.kirim[0][1].data.items.length === 2 && !r.buka, 'simpan rincian tanpa perubahan diterima (volume PO sendiri bukan PO lain)');
  await h.rincian('R65');
  ok(await h.dariBon(B15, 1) && await h.dariBon(B20, 0), 'item bon lain (Stretcher · Bon 015, Figura · Bon 020) dapat diambil ke PO yang sama');
  ok(!(await h.pg.evaluate(() => { mp2622Panel('bon'); return true; }) && await h.dariBon(B15, 0)), 'Environment Meter (sudah penuh di PO ini) tidak dapat dicentang lagi dari bon — sisa 0');
  await h.pg.evaluate(() => mp2622Panel('')); await h.harga(); r = await h.simpan();
  ok(r.kirim.length === 1 && r.kirim[0][1].data.items.length === 4 && r.kirim[0][1].data.items.filter(i => i.noPermintaan === B20).length === 1, 'PO 065 tersimpan 4 item (2 lama + Stretcher + Figura Bon 020)');

  console.log('A2. Batas volume bon tetap berlaku');
  await h.rincian('R65'); await h.pg.evaluate(() => { mp2622Keadaan().items[0].vol = '2'; }); r = await h.simpan();
  ok(r.pesan.some(m => /Environment Meter 5in1 pro Krisbow: total PO 2 melebihi volume bon 1 PC \(PO lain 0\)/.test(m)) && !r.kirim.length && r.buka, 'volume PO sendiri dinaikkan 1 → 2 (bon 1) tetap ditolak, PO lain 0');
  await h.pg.evaluate(() => { mp2622Keadaan().items[0].vol = '1'; });
  await h.dariBon(B15, 3, 5); r = { pesan: await h.pesan() };
  ok(r.pesan.some(m => /volume 5 melebihi sisa bon 4/.test(m)), 'ambil Helm 5 dari bon ditolak — sisa 4 karena PO 070 memakai 10');
  await h.pg.evaluate(([B15]) => { const K = mp2622Keadaan(); K.items = K.items.filter(i => String(i.uraian || '').trim()).concat([{ kode: '16000009', uraian: 'Helm Delta Putih+Tali Dagu 3M', vol: '5', sat: 'PC', harga: '325000', wbs: '', noPermintaan: B15 }]); }, [B15]);
  r = await h.simpan();
  ok(r.pesan.some(m => /Helm Delta Putih\+Tali Dagu 3M: total PO 15 melebihi volume bon 14 PC \(PO lain 10 — 070\/SPM\)/.test(m)) && !r.kirim.length, 'PO lain yang SUNGGUH memakai bon tetap menolak, dan nomor PO-nya disebut: (PO lain 10 — 070/SPM)');
  ok(!h.gal.length, 'tanpa galat JS: ' + h.gal.join(' | ')); await h.pg.close();

  console.log('B. SPM Non-KSO');
  const pg = await br.newPage({ viewport: { width: 900, height: 1250 }, deviceScaleFactor: 2 }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', q => q.fulfill({ body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>', contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  const LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="52"><rect width="120" height="52" fill="#0B2B54"/><text x="60" y="33" font-size="20" fill="#fff" text-anchor="middle" font-family="Arial">LOGO</text></svg>');
  await pg.evaluate(LOGO => {
    window.REG = { sesi: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', proyek: 'P2', cfg: { id: 'P2', nama: 'Jalan Tol Contoh', namaLengkap: 'Proyek Pembangunan Jalan Tol Contoh Seksi 2', kapro: 'Ir. Budi Santoso, M.T.' } } };
    window.MP296 = { kop: { logo: [LOGO], nama: 'WASKITA - NINDYA KSO', proyek: 'Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok', alamat: 'Kantor KSO : Jl. M.T. Haryono Kav. No.12-13' } };
    window.__idt = { bentuk: 'TUNGGAL', nama: 'PT Waskita Karya (Persero) Tbk', unit: 'Infrastructure II Division', npwp: '', alamat: '' };
    window.mp224Identitas = () => window.__idt;
    window.mp2104KSO = () => ({ nama: window.__idt.nama || 'WASKITA - NINDYA, KSO', npwp: '1000000007845824', alamat: 'Gedung Waskita IDSurvey Tower Jl. M.T. Haryono Kavling No.10, Jatinegara, Jakarta Timur' });
    window.mp2104Vendor = () => ({ alamat: 'Jl. Contoh No. 1, Jakarta', npwp: '0123456789012000', direktur: 'Siti Aminah', jabatan: 'Direktur', bank: 'Bank Mandiri', noRek: '1230001234567', atasNama: 'PT Cahaya Utama Safety Indonesia' });
    window.notif = () => { };
  }, LOGO);
  await pg.addScriptTag({ content: blok(BARU, '/* MP21024 — PEMBARUAN') });
  const D = { no: '012/SPM/WK/DIV.II/INF2/1726099/2026', jenis: 'SPM', vendor: 'PT Cahaya Utama Safety Indonesia', idVendor: '', tgl: '2026-11-16', selesai: '2026-12-15', top: '45 hari', items: [{ uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC', vol: 1, harga: 4850000 }, { uraian: 'Lampu Sorot LED 1000W COB', sat: 'PC', vol: 1, harga: 8450000 }, { uraian: 'Helm Delta Putih+Tali Dagu 3M', sat: 'PC', vol: 14, harga: 325000 }] };
  const baca = async () => pg.evaluate(D => { const x = new DOMParser().parseFromString(MP21024.htmlSPM(D), 'text/html'), t = s => (x.querySelector(s) || {}).textContent || '', c = x.querySelectorAll('.ttd tr')[1].cells;
    return { kop: t('.kd .nm'), pr: x.querySelector('.kd .pr').innerHTML, al: t('.kd .al'), semua: x.body.textContent, kiri: c[0].innerHTML, kanan: c[1].innerHTML, xl: MP21024.tulisanSPM(D).INPUT }; }, D);
  let s = await baca();
  ok(s.kop === 'PT WASKITA KARYA (Persero) Tbk' && !/KSO|NINDYA/i.test(s.kop + s.pr + s.al), 'kop: PT WASKITA KARYA (Persero) Tbk — tanpa KSO / Nindya');
  ok(s.pr === 'Infrastructure II Division<br>Proyek Pembangunan Jalan Tol Contoh Seksi 2', 'kop memuat unit kerja + nama proyek INI (bukan nama proyek bawaan kop KSO)');
  ok(!/KSO|NINDYA|1000000007845824|IDSurvey/i.test(s.semua), 'seluruh dokumen bebas nama, NPWP & alamat KSO');
  ok(/Nomor NPWP : - atas nama PT WASKITA KARYA \(Persero\) Tbk/.test(s.semua), 'NPWP perusahaan belum diisi → "-" (NPWP KSO tidak dipinjam)');
  ok(/<b>PT WASKITA KARYA \(Persero\) Tbk<\/b>/.test(s.kanan) && /class="ruang mt"/.test(s.kanan) && /class="mtr">METERAI<br>Rp 10\.000/.test(s.kanan) && /class="stp">STEMPEL<br>PT WASKITA KARYA \(Persero\) Tbk/.test(s.kanan) && /Ir\. Budi Santoso, M\.T\.<\/span><br>Kepala Proyek/.test(s.kanan), 'tanda tangan perusahaan: nama PT, kotak meterai, stempel, nama Kepala Proyek + jabatan');
  ok(/class="ruang mt"/.test(s.kiri) && !/mtr/.test(s.kiri) && /STEMPEL<br>PERUSAHAAN/.test(s.kiri), 'sisi vendor: ruang sama tinggi, stempel perusahaan vendor, tanpa meterai (bawaan)');
  ok(s.xl.B6 === 'PT WASKITA KARYA (Persero) Tbk' && s.xl.B15 === '-' && s.xl.B8 === '-' && s.xl.B16 === null, 'Excel templat: B6 nama perusahaan, B8/B15 tidak memakai data KSO, B16 (kuasa) kosong');
  await pg.evaluate(() => { window.__idt.npwp = '01.001.614.5-093.000'; window.__idt.alamat = 'Jl. M.T. Haryono Kav. No. 10, Cawang, Jakarta 13340'; MP21024.isian({ kuasa: 'Kuasa Lama', batasKuasa: 1000, meterai: 'keduanya' }); });
  s = await baca();
  ok(/Nomor NPWP : 010016145093000 atas nama/.test(s.semua) && /Cawang/.test(s.al), 'NPWP & alamat dari Identitas Pelaksana tampil di syarat & kop');
  ok(/Kepala Proyek/.test(s.kanan) && !/Kuasa/.test(s.kanan), 'Non-KSO: isian Kuasa KSO diabaikan — tetap Kepala Proyek');
  ok(/mtr/.test(s.kiri) && /mtr/.test(s.kanan), 'Isian SPM › posisi meterai "kedua pihak" → kotak meterai di kedua sisi');
  await pg.evaluate(() => MP21024.isian({ meterai: '' }));
  const hal = await pg.evaluate(D => MP21024.berhalaman(MP21024.htmlSPM(D)), D);
  ok(hal.halaman === 1, 'dokumen Non-KSO tetap 1 halaman A4');
  await pg.setContent(hal.html); await pg.evaluate(() => document.body.classList.add('siap')); await pg.waitForTimeout(300);
  const k = await pg.evaluate(() => { const b = s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }, sel = document.querySelectorAll('.ttd tr')[1].cells[1].getBoundingClientRect(), isi = document.querySelector('.hal .isi').getBoundingClientRect();
    return { m: b('.ttd tr:nth-child(2) td:nth-child(2) .mtr'), s: b('.ttd tr:nth-child(2) td:nth-child(2) .stp'), sel: [sel.left, sel.top, sel.right, sel.bottom], isi: isi.bottom, kaki: document.querySelector('.prf').getBoundingClientRect().bottom }; });
  ok(k.m[0] >= k.sel[0] && k.s[2] <= k.sel[2] && k.m[2] <= k.s[0] + 1 && k.kaki <= k.isi + 1, 'meterai & stempel berada di dalam kolom tanda tangan perusahaan, tidak bertumpuk, tidak terpotong');
  await (await pg.$('.hal')).screenshot({ path: path.join(OUT, 'spm-non-kso.png') });

  console.log('C. Proyek KSO tidak berubah');
  await pg.goto('https://app.test/'); await pg.evaluate(LOGO => {
    window.REG = { sesi: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', proyek: 'P1', cfg: { id: 'P1', nama: 'JICT', namaLengkap: 'Proyek Pekerjaan Perkuatan Dermaga Barat JICT', kapro: 'Kapro KSO' } } };
    window.MP296 = { kop: { logo: [LOGO], nama: 'WASKITA - NINDYA KSO', proyek: 'Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok', alamat: 'Kantor KSO : Jl. M.T. Haryono Kav. No.12-13' } };
    window.mp224Identitas = () => ({ bentuk: 'KSO', nama: 'WASKITA - NINDYA, KSO' }); window.mp2104KSO = () => ({ nama: 'WASKITA - NINDYA, KSO', npwp: '1000000007845824', alamat: 'Gedung Waskita IDSurvey Tower' }); window.notif = () => { };
  }, LOGO);
  const html = async f => { await pg.goto('https://app.test/'); await pg.evaluate(LOGO => { window.REG = { sesi: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', proyek: 'P1', cfg: { id: 'P1', nama: 'JICT', namaLengkap: 'Proyek Pekerjaan Perkuatan Dermaga Barat JICT', kapro: 'Kapro KSO' } } };
      window.MP296 = { kop: { logo: [LOGO], nama: 'WASKITA - NINDYA KSO', proyek: 'Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok', alamat: 'Kantor KSO : Jl. M.T. Haryono Kav. No.12-13' } };
      window.mp224Identitas = () => ({ bentuk: 'KSO', nama: 'WASKITA - NINDYA, KSO' }); window.mp2104KSO = () => ({ nama: 'WASKITA - NINDYA, KSO', npwp: '1000000007845824', alamat: 'Gedung Waskita IDSurvey Tower' }); window.notif = () => { }; }, LOGO);
    await pg.addScriptTag({ content: blok(f, '/* MP21024 — PEMBARUAN') }); return pg.evaluate(D => MP21024.htmlSPM(D).replace(/<style>[\s\S]*?<\/style>/, ''), D); };
  const lamaKSO = await html(LAMA), baruKSO = await html(BARU);
  ok(lamaKSO === baruKSO && /WASKITA - NINDYA, KSO/.test(baruKSO) && !/mtr|stp/.test(baruKSO), 'SPM proyek KSO identik dengan 2.10.26 (tanpa kotak meterai / stempel)');
  ok(!gal.length, 'tanpa galat JS: ' + gal.join(' | '));
  await br.close(); console.log('\n' + lulus + ' cek lulus');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
