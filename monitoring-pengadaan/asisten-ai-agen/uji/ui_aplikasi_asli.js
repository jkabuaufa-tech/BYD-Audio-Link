// Uji di APLIKASI ASLI: HTML dasar Monitoring SAP (tidak di-commit — berisi data proyek) + paket pembaruan yang diuji,
// terhubung ke "server" yang menjalankan Modul server LENGKAP di Node (uji/kernel_tiruan.js). Skenario = laporan pengguna:
// Kartu Gudang Oktober 2026 menampilkan Environment Meter masuk 30-Sep-2026 "Masuk - -" (penerimaan Terima Bon, bukan migrasi),
// padahal BAPM 01/BAPM/065/SPM bertanggal 05-Nov-2026.
//   node uji/ui_aplikasi_asli.js <index.html dasar> [pembaruan-2.10.34.json] [server-modul-1.10.23.json] [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const AKAR = path.join(__dirname, '..');
const [HTML, PAKET = path.join(AKAR, 'pembaruan-2.10.34.json'), MODUL = path.join(AKAR, 'server-modul-1.10.23.json'), TANGKAP = ''] = process.argv.slice(2);
if (!HTML) { console.error('Pakai: node uji/ui_aplikasi_asli.js <index.html dasar> [paket.json] [modul.json] [folder-tangkapan]'); process.exit(2); }
const P = '1726012', URL_SRV = 'https://srv.uji.local/exec', NO = '065/SPM/WK-NK.KSO/PDBJ/1726012/2026', BA = '01/BAPM/' + NO;
const T = require('./kernel_tiruan.js').buat(MODUL, { proyek: P, hariIni: '2026-11-17' });
const ADM = { nama: 'Joko Supriyono', peran: 'PENGADAAN', admin: true };

/* data kasus: BK BAPM 01 (2 baris Environment Meter, tanggal BA 05/11) · Bon · GR Terima Bon 30/09 · GR otomatis 05/11 */
T.KOL.permintaan = [{ nomor: 'BON-01', tanggal: '2026-09-01', items: [{ kode: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC', vol: 2 }] }];
T.KOL.data = [{ id: 'R1', noKontrak: NO, namaVendor: 'Cahaya Utama Safety Indonesia, PT', tglKontrak: '2026-09-01', tglSelesai: '2026-12-31', items: [{ kode: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC' }, { kode: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC' }] }];
T.KOL.progres = [{ id: 'BK-01', noKontrak: NO, nomorBA: BA, tagihanKe: 1, tanggal: '2026-11-01', tanggalBA: '2026-11-05', baTerbit: true, versi: 3, items: { [NO + '#0']: 1, [NO + '#1']: 1 } }];
const sh = T.lembar(P + '_GudangMasuk'); T.lembar(P + '_GudangKeluar');
const gr = (id, tgl, ext) => { const r = Object.assign({ id, tanggal: tgl, bonNomor: 'BON-01', bonIdx: 0, bonTanggal: '2026-09-01', kode: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC', kunci: '1800007128', qty: 1, harga: 0, noSJ: 'SJ-0930', diterimaOleh: 'Gudang', status: 'AKTIF', versi: 1, dibuatPada: tgl + 'T03:00:00.000Z' }, ext || {});
  sh.rows.push([r.id, "'" + r.tanggal, r.bonNomor, 1, "'" + r.kode, r.uraian, r.sat, r.qty, 0, r.noSJ, r.diterimaOleh, r.status, '', '', JSON.stringify(r)]); };
gr('GR-TB-0930', '2026-09-30');
gr('GR-OTO-1105', '2026-11-05', { otomatis: true, refProgres: 'BK-01', noSJ: 'OTOMATIS ' + BA, noKontrak: NO });

function layani(body) {   // "server": aksi modul nyata; selain itu jawaban netral + daftar fitur modul
  const a = body.action, f = T.MODUL.aksi[a];
  try {
    if (typeof f === 'function') return Object.assign({ ok: true }, f(Object.assign({}, body), ADM, P, new Date().toISOString()));
    return { ok: true, fitur: T.MODUL.fitur, versiServer: '1.10.23', data: [], list: [], progres: T.KOL.progres, permintaan: T.KOL.permintaan };
  } catch (e) { return { ok: false, error: e.message }; }
}

(async () => {
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }), pg = await ctx.newPage(), galat = [];
  pg.on('pageerror', e => { if (!/Maximum call stack/.test(e.message)) galat.push(e.message); });   // stack overflow fab/aiTutup sudah ada di 2.10.31 (bukan dari blok yang diuji)
  pg.on('dialog', d => d.accept());
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith(URL_SRV)) { let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) { } return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(layani(body)) }); }
    return /^file:/.test(u) ? r.continue() : r.fulfill({ status: 200, body: '' });
  });
  const paket = fs.readFileSync(PAKET, 'utf8');
  await pg.addInitScript(p => { try { if (!sessionStorage.getItem('uji')) { localStorage.setItem('JICT_PEMBARUAN', p); sessionStorage.setItem('uji', '1'); } } catch (e) { } }, paket);
  await pg.goto('file://' + path.resolve(HTML), { waitUntil: 'load', timeout: 180000 });
  await pg.waitForTimeout(3000);
  const v = await pg.evaluate(() => PEMB.aktif && PEMB.aktif.versi);
  console.log('Aplikasi asli + pembaruan ' + v + ' + ' + path.basename(MODUL));
  ok(v === JSON.parse(paket).versi, 'paket ' + v + ' terpasang & berjalan di aplikasi asli');

  // masuk sebagai Admin ke "server" uji, data BK & Bon dari server, fitur server dari modul
  await pg.evaluate(async ([url, fitur, prog, bon, reg]) => {
    REG.url = url; REG.sesi = { nama: 'Joko Supriyono', pin: '0000', admin: true, peran: 'PENGADAAN', proyek: '1726012' };
    PROG.data = prog; PMT.data = bon; REG.data = reg; window.MP220.fitur = fitur;
    const lm = document.getElementById('layarMasuk'); if (lm) lm.classList.remove('tampil');   // sesi dipasang langsung (tanpa form login)
    await window.mp223Muat(true);
  }, [URL_SRV, T.MODUL.fitur, T.KOL.progres, T.KOL.permintaan, T.KOL.data]);
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { bukaTab('gdkartu'); });
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { const K = window.mp223K; K.kunci = '1800007128'; K.bulan = 10; K.tahun = 2026; K._pB = 10; K._pT = 2026; K.semua = false; window.mp223Render(); });
  await pg.waitForTimeout(2500);
  if (TANGKAP) await pg.screenshot({ path: path.join(TANGKAP, '1-kartu-oktober-sebelum.png'), fullPage: true });

  console.log('Kartu Gudang Oktober 2026 — sebelum tindakan');
  let r = await pg.evaluate(() => ({ tabel: (document.querySelector('#mp223KartuIsi .mp223-tb') || {}).innerText || '', panel: (document.getElementById('mp21032MigKartu') || {}).innerText || '',
    btnKor: document.querySelectorAll('#mp21032MigKartu button[onclick^="mp21032Koreksi"]').length, btnTaut: document.querySelectorAll('#mp21032MigKartu button[onclick^="mp21032Tautkan"]').length,
    pita: (document.getElementById('mp21032Pita-gdkartu') || {}).innerText || '' }));
  ok(/30\/09\/2026/.test(r.panel) || /30-Sep-2026/.test(r.tabel), 'Kartu Oktober memuat penerimaan 30-Sep (kondisi laporan pengguna)');
  ok(/Transaksi material ini — koreksi & tautan BAPM/.test(r.panel) && /Modul server aktif/.test(r.panel), 'panel koreksi tampil di bawah Kartu Gudang + status "Modul server aktif"');
  ok(r.btnKor === 1 && r.btnTaut === 1 && /Masuk · Terima Bon/.test(r.panel) && /belum tertaut/.test(r.panel), 'baris Terima Bon 30/09: tombol Koreksi & Tautkan BAPM tersedia, status "belum tertaut"');
  ok(/BELUM tertaut ke BAPM/.test(r.pita) && /⚠ belum tertaut ke BAPM — usulan 01\/BAPM/.test(r.tabel), 'pita peringatan + tanda ⚠ & usulan BAPM di keterangan Kartu Gudang');

  console.log('Admin menekan "Tautkan BAPM"');
  await pg.click('#mp21032MigKartu button[onclick^="mp21032Tautkan"]');
  await pg.waitForTimeout(300);
  r = await pg.evaluate(() => ({ pilih: document.getElementById('tbBK').selectedOptions[0].textContent }));
  ok(/01\/BAPM.*05\/11\/2026.*usulan audit/.test(r.pilih), 'dialog: BAPM 01 (05/11/2026) terpilih otomatis sebagai usulan audit');
  if (TANGKAP) await pg.screenshot({ path: path.join(TANGKAP, '2-dialog-tautkan.png') });
  await pg.fill('#tbAlasan', 'barang untuk BAPM 01, tanggal terima keliru');
  await pg.click('#tbOk');
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => window.mp223Render());
  await pg.waitForTimeout(1200);
  if (TANGKAP) await pg.screenshot({ path: path.join(TANGKAP, '3-kartu-oktober-sesudah.png'), fullPage: true });
  r = await pg.evaluate(() => ({ tabel: (document.querySelector('#mp223KartuIsi .mp223-tb') || {}).innerText || '', ring: (document.querySelector('#mp223KartuIsi .mp223-kg-h') || {}).innerText || '', pita: !!document.getElementById('mp21032Pita-gdkartu') }));
  const srvGR = T.SH[P + '_GudangMasuk'].rows.map(x => JSON.parse(x[x.length - 1])).find(x => x.id === 'GR-TB-0930');
  ok(srvGR.tanggal === '2026-11-05' && srvGR.refBA === 'BK-01' && srvGR.tanggalAwal === '2026-09-30', 'server: GR 30/09 tertaut ke BK-01, tanggal = 05/11/2026 (tanggal lama tersimpan)');
  ok(!/30-Sep-2026/.test(r.tabel) && /Penerimaan periode\s*0,00/.test(r.ring) && !r.pita, 'Kartu Gudang Oktober: penerimaan 30-Sep hilang, penerimaan periode 0,00, pita peringatan hilang');
  await pg.evaluate(() => { const K = window.mp223K; K.bulan = 11; K.tahun = 2026; K._pB = 11; K._pT = 2026; window.mp223Render(); });
  await pg.waitForTimeout(1500);
  r = await pg.evaluate(() => ({ tabel: (document.querySelector('#mp223KartuIsi .mp223-tb') || {}).innerText || '', ring: (document.querySelector('#mp223KartuIsi .mp223-kg-h') || {}).innerText || '' }));
  if (TANGKAP) await pg.screenshot({ path: path.join(TANGKAP, '4-kartu-november.png'), fullPage: true });
  ok(/05-Nov-2026\s+2,00/.test(r.tabel) && /Penerimaan periode\s*2,00/.test(r.ring), 'Kartu Gudang November: 2 PC masuk pada 05-Nov-2026 = tanggal BAPM');
  ok((r.tabel.match(/Masuk - Cahaya Utama Safety Indonesia, PT/g) || []).length === 2, 'keterangan kedua penerimaan: "Masuk - Cahaya Utama Safety Indonesia, PT" (bukan lagi "Masuk - -")');
  ok(!galat.length, 'tanpa galat halaman baru' + (galat.length ? ': ' + galat.join(' | ') : ''));
  await b.close();
  console.log('\nLULUS ' + lulus + ' uji (aplikasi asli)');
})().catch(e => { console.error(e); process.exit(1); });
