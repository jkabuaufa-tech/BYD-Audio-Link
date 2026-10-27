// Uji UI 2.7.0 di Chromium memakai APLIKASI ASLI (HTML_DASAR + pembaruan-2.7.0 utuh + kernel Code.gs 2.5.1 asli + modul 1.10.0):
// BK dari data awal Excel proyek (Master Kontrak tertanam), tombol "Buat Paket Tagihan" di 4 menu, dialog → simpan → PDF ke Drive (pdf-lib asli)
// → status → dashboard → ekspor; akun Lihat; tampilan HP.
//   HTML_DASAR=…/index.html KODE_GS=…/Code.gs NPM=<folder node_modules berisi pdf-lib> node uji/ui270.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert'), boot = require('./boot_app.js');
const OUT = process.argv[2] || __dirname + '/../../asisten-ai-agen/tangkapan';
const H = fs.readFileSync(process.env.HTML_DASAR, 'utf8'), DA = JSON.parse(H.match(/const DATA_AWAL = (\{[\s\S]*?\});\s*\n/)[1]);
const BK = DA.progres.slice(0, 6).map(e => Object.assign({ versi: 1 }, e)), E0 = BK[0];
const LIB = { 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/': process.env.NPM + '/pdf-lib/dist/pdf-lib.min.js' };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const siapkan = (C, K, P, ADM) => { K.tulisKoleksi_(P, 'progres', BK);
    const r = ADM('blKonfigSimpan', { data: { noKontrak: E0.noKontrak, versi: 0, konfig: { kategori: 'BAHAN', ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: true }, pph: { jenis: 'PPh 22', tarif: 1.5 } } } }); assert.ok(r.ok, r.error); };
  const A = await boot({ siapkan, lib: LIB, pasangDrive: require('./drive_biner.js') });
  const { br, pg, gal, K, P } = A;
  console.log('paket ' + A.VERSI + ' · BK uji: ' + E0.nomorBA + ' Rp ' + E0.nilai.toLocaleString('id-ID'));
  ok(await pg.evaluate(() => !!window.MP270 && !!window.BLI && !!window.BLRP && window.mp220Srv('paketTagihan')), 'blok MP270 & pustaka tagihan termuat; server melaporkan fitur paketTagihan');
  await pg.evaluate(() => bukaTab('monitoring-bulanan')); await pg.waitForTimeout(900);
  ok(await pg.$$eval('#tab-monitoring-bulanan .mp270-btn', x => x.length) === BK.length, 'Monitoring BK: tombol paket tagihan di setiap BK (' + BK.length + ')');
  await pg.evaluate(() => bukaTab('keuangan')); await pg.waitForTimeout(900);
  ok(await pg.$$eval('#tab-keuangan .mp270-btn', x => x.length) >= 1, 'Keuangan & Bayar: tombol Buat Paket Tagihan per tagihan');
  await pg.evaluate(() => { bukaTab('register'); muatRegister(); }); await pg.waitForTimeout(1500);
  ok(await pg.$$eval('#tab-register tr.baris-kontrak .mp270-btn', x => x.length) > 50, 'Register Kontrak: tombol di setiap baris kontrak');
  await pg.evaluate(() => bukaTab('form-progres')); await pg.waitForTimeout(700);
  ok(!!(await pg.$('#mp270FP')) && await pg.$$eval('#tab-form-progres .mp270-btn', x => x.length) >= 2, 'Input Progres: tombol di samping No Kontrak & di daftar tagihan');
  ok(!!(await pg.$('#mp270Menu')) || !!(await pg.$('#mp270Nav')), 'menu akun / navigasi: Paket Tagihan · Dashboard');

  console.log('Dialog paket dari BK Master Kontrak (tanpa isian ulang)');
  await pg.evaluate(() => bukaTab('monitoring-bulanan')); await pg.waitForTimeout(500);
  await pg.click(`#tab-monitoring-bulanan .mp270-btn[onclick*="${E0.id}"]`); await pg.waitForSelector('#mp270Dlg .mp270-t tr.pilih', { timeout: 20000 });
  const hdr = await pg.textContent('#mp270Dlg header');
  ok(hdr.includes(E0.noKontrak) && /Sagara Abadi Persada/.test(hdr) && /PO 41000/.test(hdr), 'header: no kontrak, vendor & PO dari Monitoring SAP');
  await pg.evaluate(() => mp270Tab('hitung')); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => { const T = mp270Keadaan(); return { ini: T.hasil.prestasi.ini, n: T.hasil.items.filter(i => !i.judul).length, galat: T.hasil.temuan.filter(t => t.tingkat === 'GALAT').map(t => t.kode), tm: (T.temuanLokal || []).map(t => t.kode) }; });
  ok(st.ini === Math.round(E0.nilai) && st.galat.length === 0 && st.tm.indexOf('BEDA_BK_NILAI_PROGRES') < 0, 'prestasi periode ini Rp ' + st.ini.toLocaleString('id-ID') + ' = nilai BK (item & harga Master Kontrak, volume BK); tanpa galat');
  await pg.screenshot({ path: OUT + '/paket-tagihan-hitung.png' });
  await pg.click('#mp270Dlg footer button:has-text("Simpan Draft")'); await pg.waitForFunction(() => mp270Keadaan().paket && !mp270Keadaan().sibuk, null, { timeout: 30000 });
  const rec = K.bacaKoleksi_ ? null : null; const L = JSON.parse(K.doPost({ postData: { contents: JSON.stringify({ action: 'blDaftar', nama: 'Joko Supriyono', pin: '1234', proyek: P }) } }));
  ok(L.ok && L.total === 1 && L.data[0].progresId === E0.id && L.data[0].kategori === 'BAHAN' && L.data[0].prestasi.ini === Math.round(E0.nilai), 'Simpan Draft → paket tersimpan di server (dihitung ulang server, angka sama)');
  await pg.evaluate(() => mp270Pratinjau()); await pg.waitForSelector('#mp270Frame'); await pg.waitForTimeout(800);
  const pv = await pg.evaluate(() => { const d = document.getElementById('mp270Frame').contentDocument; return { n: d.querySelectorAll('.kertas').length, t: d.body.innerText }; });
  ok(pv.n === 8 && /BERITA ACARA PENERIMAAN MATERIAL/.test(pv.t) && /BERITA ACARA PEMBAYARAN/.test(pv.t) && pv.t.includes(E0.nomorBA), 'pratinjau 8 dokumen Bahan (BAPM bernomor BA resmi, BAP, rekap, draf invoice/kwitansi, checklist)');
  await pg.screenshot({ path: OUT + '/paket-tagihan-pratinjau.png' });
  await pg.evaluate(() => document.getElementById('mp270Pv').remove());
  await pg.evaluate(() => mp270Tab('dokumen')); await pg.waitForTimeout(300);
  await pg.click('#mp270Dlg footer button:has-text("Buat PDF")');
  await pg.waitForFunction(() => !mp270Keadaan().sibuk, null, { timeout: 120000 });
  const T1 = await pg.evaluate(() => { const T = mp270Keadaan(); return { galat: T.galat, dok: (T.paket.dokumen || []).map(d => d.kode + ':' + d.status + ':' + (d.file && d.file.sha256 || '').length) }; });
  ok(!T1.galat && T1.dok.length === 9 && T1.dok.every(d => /:64$/.test(d)) && T1.dok.some(d => d.startsWith('BUNDEL')), 'Buat PDF: 8 PDF + bundel diunggah bertahap (SHA-256) ke Drive proyek & tertaut ke paket');
  const f = Object.values(A.C.__files).filter(x => /BAPM/.test(x.nama));
  ok(f.length >= 1 && f[0].data.startsWith('%PDF-'), 'berkas PDF BAPM tersimpan di folder Drive proyek');
  ok(T1.dok.find(d => d.startsWith('BAPM')).includes('MENUNGGU_TTD') && T1.dok.find(d => d.startsWith('INVOICE')).includes('DRAFT'), 'status dokumen: BAPM menunggu tanda tangan; invoice tetap draf (bukan dokumen resmi vendor)');
  await pg.click('#mp270Dlg footer button:has-text("Menunggu Dokumen")'); await pg.waitForFunction(() => !mp270Keadaan().sibuk && mp270Keadaan().paket.status === 'MENUNGGU DOKUMEN', null, { timeout: 20000 });
  ok(true, 'status DALAM PENYUSUNAN → MENUNGGU DOKUMEN lewat tombol');
  await pg.screenshot({ path: OUT + '/paket-tagihan-dokumen.png' });
  await pg.evaluate(() => mp270Validasi()); await pg.waitForSelector('#mp270Pv .mp270-isi');
  ok(/Validasi deterministik/.test(await pg.textContent('#mp270Pv')), 'Validasi menampilkan temuan deterministik');
  await pg.evaluate(() => document.getElementById('mp270Pv').remove());
  await pg.evaluate(() => mp270Tutup()); ok(!(await pg.$('#mp270Dlg')), 'dialog ditutup');

  console.log('Dashboard Tagihan');
  await pg.evaluate(() => mp270Dashboard()); await pg.waitForFunction(() => document.querySelectorAll('#mp270Dash tbody tr').length === 1, null, { timeout: 20000 });
  const kpi = await pg.evaluate(() => [...document.querySelectorAll('#mp270Dash .mp270-kpi-k')].map(k => k.innerText.replace(/\s+/g, ' ')));
  const H2 = await pg.evaluate(() => { const h = mp270DashHitung(); return { prestasi: h.prestasi, nilai: h.nilaiKon, tunggu: h.st('MENUNGGU DOKUMEN').length }; });
  ok(kpi.length === 10 && H2.tunggu === 1 && H2.prestasi === BK.reduce((a, e) => a + e.nilai, 0), '10 KPI; progres diakui = Σ nilai BK; 1 paket menunggu dokumen');
  ok(kpi.some(k => /Nilai kontrak \(sebelum PPN\)/.test(k)) && kpi.some(k => /Tagihan diajukan \(sebelum PPN\)/.test(k) && /PPN/.test(k)), 'KPI memisahkan nilai sebelum PPN, PPN & neto');
  await pg.screenshot({ path: OUT + '/paket-tagihan-dashboard.png' });
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 10000 }), pg.evaluate(() => mp270DashEkspor())]);
  const isi = fs.readFileSync(await dl.path(), 'utf8');
  ok(/paket-tagihan-1726012/.test(dl.suggestedFilename()) && isi.includes(E0.noKontrak) && /Tagihan sebelum PPN/.test(isi), 'ekspor Excel (CSV) berisi paket & kolom nilai terpisah');
  await pg.evaluate(() => mp270DashF('kategori', 'ALAT')); ok(await pg.$$eval('#mp270Dash tbody tr', x => x.length) === 0, 'filter kategori ALAT → 0 paket');
  await pg.evaluate(() => document.getElementById('mp270Dash').remove());
  ok(gal.length === 0, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();

  console.log('Akun Lihat & tampilan HP');
  const B = await boot({ siapkan, lib: LIB, pasangDrive: require('./drive_biner.js'), viewport: { width: 390, height: 844 }, sesi: { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', proyek: '1726012', admin: false } });
  await B.pg.evaluate(id => { const e = PROG.data.find(x => x.id === id); return mp270Buka(e.noKontrak, id); }, E0.id); await B.pg.waitForSelector('#mp270Dlg .mp270-t tr.pilih', { timeout: 20000 });
  ok(/hanya dapat membaca/.test(await B.pg.textContent('#mp270Dlg')) && await B.pg.$eval('#mp270Dlg footer button:has-text("Simpan Draft")', b => b.disabled), 'akun Lihat: dialog baca-saja, Simpan dinonaktifkan');
  const lebar = await B.pg.evaluate(() => document.querySelector('#mp270Dlg .mp270-dlg').scrollWidth <= window.innerWidth + 1);
  ok(lebar, 'tampilan HP 390 px: dialog tidak melebar keluar layar');
  await B.pg.screenshot({ path: OUT + '/paket-tagihan-hp.png' });
  ok(B.gal.length === 0, 'tanpa galat JavaScript (HP/Lihat)');
  await B.br.close();
  console.log('\nLULUS ' + lulus + ' uji UI 2.7.0 (paket tagihan)');
})().catch(e => { console.error(e); process.exit(1); });
