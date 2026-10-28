// Uji UJUNG-KE-UJUNG 2.7.3 di APLIKASI ASLI (HTML dasar Monitoring_SAP.html + paket 2.7.3 + kernel Code.gs 2.5.1 + modul 1.10.2):
//   Input Progres SPM disimpan lewat form → GR otomatis (foto belum lengkap) → Penerimaan Material: pita & "Lengkapi foto" → foto tersimpan.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui273.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert'), path = require('path');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const R = __dirname + '/..', NK = '003/SPM/WK-NK.KSO/PDBJ/1726012/2026', KODE = '1000003699';
const JPG = path.join(OUT, 'mp273-foto-uji.jpg');
(async () => {
  // foto JPG kecil yang valid (1×1 piksel)
  fs.writeFileSync(JPG, Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64'));
  const fid = {}, mime = {};
  const { br, pg, gal, C, K, P, post } = await boot({
    paket: fs.readFileSync(R + '/pembaruan-2.7.3.json', 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.2.json', 'utf8')), tunggu: 4000,
    pasangDrive: (C, K, P) => {   // unggah foto/PDF ke "Drive" tiruan milik folder proyek, lengkap dengan tipe berkas
      C.Utilities.base64Decode = t => [...Buffer.from(t, 'base64')].map(b => (b > 127 ? b - 256 : b));
      C.Utilities.newBlob = (b, tipe, nama) => ({ nama, tipe, getBytes: () => b });
      const fp = K.folderProyek_(P), induk = fp.getId(); let n = 0;
      fp.createFile = blob => { const id = 'UP' + (++n); C.__files[id] = { nama: blob.nama || id, data: 'x', induk }; mime[id] = blob.tipe; return { getId: () => id, getUrl: () => 'drive://' + id, getName: () => blob.nama || id, setDescription() { } }; };
      const asli = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { const f = asli(id); if (mime[id]) f.getMimeType = () => mime[id]; return f; };
    },
    siapkan: (C, K, P) => K.tulisKoleksi_(P, 'permintaan', [{ id: 'Q1', nomor: '021/WK-NK.KSO/DIV.II/INF1/1726012/2026', noUrut: 21, tahun: 2026, tanggal: '2026-05-02', departemen: 'Logistik', peminta: 'Uji', versi: 1,
      items: [{ kode: KODE, uraian: 'Frame Recycling Plastik Panel 2x2,6m', vol: 1200, sat: 'SET', harga: 0, wbs: '1726012-01-01-40' }], total: 0 }])
  });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const A = (a, x) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  ok(await pg.evaluate(() => typeof window.mp273PetaBon === 'function' && typeof FP !== 'undefined' && typeof sdLaluMap === 'function'), 'aplikasi asli: blok MP273 aktif, FP & sdLaluMap dari HTML dasar terbaca');
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  await pg.waitForFunction(() => typeof PMT !== 'undefined' && PMT.data && PMT.data.length >= 1, null, { timeout: 30000 });
  const peta = await pg.evaluate(nk => { const d = getDaftarNoKontrak().find(x => x.no === nk); return d && window.mp273PetaBon(nk, d.g.items[0]); }, NK);
  ok(peta && peta.bonIdx === 0 && /021\//.test(peta.bonNomor), 'item kontrak 003/SPM terhubung ke Bon 021 (' + (peta && peta.cara) + ')');

  console.log('1. Simpan progres lewat form Input Progres asli');
  await pg.evaluate(nk => { showTab('form-progres'); window.tanya = async () => true; pilihKontrakByKey(nk); }, NK); await pg.waitForTimeout(600);
  const id = await pg.evaluate(() => { const it = FP.g.items[0]; return idItem(FP.g, it, 0); });
  await pg.evaluate(id => { FP.vol[id] = '12.34567'; document.getElementById('fp_tagihanKe').value = 1; perbaruiProgres(); }, id);
  await pg.evaluate(() => simpanProgres()); await pg.waitForTimeout(3500);
  const pr = K.bacaKoleksi_(P, 'progres').find(e => e.noKontrak === NK);
  ok(pr && Object.values(pr.items)[0] === 12.346, 'progres tersimpan di server (volume 12,34567 → 12,346 · 3 desimal)');
  let M = A('gudangBaca').masuk;
  ok(M.length === 1 && M[0].otomatis && M[0].fotoKurang && M[0].qty === 12.346 && M[0].refProgres === pr.id && M[0].bonIdx === 0, 'GR otomatis 12,346 SET dicatat dari progres, menunggu foto');
  ok(await pg.evaluate(() => !!(window.MP273.terakhir && window.MP273.terakhir.hasil && window.MP273.terakhir.hasil.data.length === 1)), 'notifikasi pengguna: penerimaan otomatis dicatat');

  console.log('2. Simpan progres yang sama lagi (revisi tanpa tambah volume) → tidak dobel');
  await pg.evaluate(async () => { await window.regAksi('gudangOtomatisProgres', { data: { progresId: window.MP273.terakhir.progresId, baris: [{ bonNomor: PMT.data[0].nomor, bonIdx: 0, kode: '1000003699', sd: 12.346 }] } }); });
  ok(A('gudangBaca').masuk.length === 1, 'dijalankan ulang → tetap 1 penerimaan');

  console.log('3. Menu Penerimaan Material: pita & Lengkapi foto');
  await pg.evaluate(async () => { showTab('gdmasuk'); if (window.mp223Muat) await window.mp223Muat(true); if (window.mp223Render) window.mp223Render(); }); await pg.waitForSelector('#mp273Pita', { timeout: 15000 });
  ok(/1 penerimaan otomatis dari progres menunggu foto/.test(await pg.textContent('#mp273Pita')), 'pita "1 penerimaan otomatis … menunggu foto" tampil');
  await pg.screenshot({ path: OUT + '/mp273-pita.png' });
  await pg.click('#mp273Pita button'); await pg.waitForSelector('#mp273Modal');
  await pg.click('#mp273Ok'); ok(/minimal 1 foto/.test(await pg.textContent('#mp273Pesan')), 'tanpa foto: diminta minimal 1 foto');
  await pg.setInputFiles('#mp273F0', JPG); await pg.setInputFiles('#mp273F1', JPG); await pg.fill('#mp273SJ', 'SJ-LAP-01');
  await pg.screenshot({ path: OUT + '/mp273-lengkapi.png' });
  await pg.click('#mp273Ok'); await pg.waitForFunction(() => !document.getElementById('mp273Modal'), null, { timeout: 20000 });
  M = A('gudangBaca').masuk;
  ok(!M[0].fotoKurang && M[0].foto.filter(Boolean).length === 2 && M[0].noSJ === 'SJ-LAP-01' && M[0].dilengkapiOleh === 'Joko Supriyono', 'foto (2) & no. surat jalan tersimpan di server; tidak lagi menunggu');
  await pg.waitForTimeout(800);
  ok(!(await pg.$('#mp273Pita')), 'pita hilang setelah foto dilengkapi');

  console.log('4. Gudang mencatat barang berikutnya untuk bon yang sama');
  const sisa = 1200 - 12.346;
  const r = A('gudangTerimaBon', { data: { bonNomor: '021/WK-NK.KSO/DIV.II/INF1/1726012/2026', tanggal: '2026-10-20', noSJ: 'SJ-2', sjFile: M[0].foto[0], foto: [M[0].foto[0]], baris: [{ idx: 0, qty: 100 }] } });
  ok(r.ok && r.digabung === 0 && A('gudangBaca').masuk.filter(x => x.status === 'AKTIF').reduce((a, x) => a + x.qty, 0) === 112.346, 'GR otomatis yang sudah berfoto tidak digabung; total 112,346 (sisa bon ' + sisa.toFixed(3) + ' sebelum)');
  const g = gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined/.test(e));   // itemCmdk: blok palet perintah 2.7.0 butuh HTML dasar lebih baru (galat sama di 2.7.0)
  ok(!g.length, 'tanpa galat JavaScript baru' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.7.3'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
