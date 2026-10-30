// Uji UJUNG-KE-UJUNG 2.9.4 di APLIKASI ASLI: Kantor Agen Live sesuai denah asli kantor — tim, posisi meja, rute A* menghormati dinding,
// santai berenang & merokok, Salma dihapus (tugas ke Yusuf), ruang perintah tanpa Salma.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui294.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan', R = __dirname + '/..';
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const b = await boot({ paket: fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.9.4.json'), 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), tunggu: 3000, viewport: { width: 1500, height: 1000 }, sebelum: SEBELUM });
  const pg = b.pg; await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  await pg.evaluate(() => window.mp2614Kantor()); await pg.waitForSelector('#mp2614Cv'); await pg.waitForTimeout(3000);
  const R0 = await pg.evaluate(() => window.MP2614_ROSTER.map(r => ({ id: r.id, nama: r.nama, peran: r.peran, langkah: r.langkah, santai: !!r.santai, duduk: r.duduk })));
  const cari = id => R0.find(r => r.id === id);
  ok(!cari('salma') && cari('yusuf').langkah.join() === 'nilai,masa,draf', 'Salma dihapus; tugas masa kontrak & draf kontrak dialihkan ke Yusuf');
  ok(cari('dedy').peran === 'Kepala Proyek' && cari('imam').peran === 'Wakil Kepala Proyek' && cari('henoc').peran === 'Bos QC' && cari('dedy').santai && cari('imam').santai && cari('henoc').santai, 'Pak Dedy (Kepala Proyek), Pak Imam (Wakil), Om Henoc (Bos QC) — santai memantau');
  ok(cari('joko').peran === 'Logistic Manager' && Math.abs(cari('joko').duduk[0] - 17.0) < 0.1, 'Joko Supriyono di meja Logistic Manager (sesuai denah)');
  ok(cari('dedy').duduk[0] > 33.4 && cari('imam').duduk[0] > 24.8 && cari('imam').duduk[0] < 29.2, 'Pak Dedy di R. Project Manager, Pak Imam di R. Deputy Manager');
  const jl = await pg.evaluate(() => { const K = window.MP2614_KANTOR, c = K.ch.find(x => x.r.id === 'dedy'); const s = [c.x, c.y]; return { n: K.ch.filter(x => x.r.warga).length }; });
  ok(jl.n >= 15, 'suasana kantor: ' + jl.n + ' staf lain bekerja di ruang-ruang sesuai denah');
  // santai: dari meja masing-masing berjalan ke kolam renang & area merokok (rute A* dari aplikasi), lalu berenang / merokok
  const tiba = await pg.evaluate(async () => {
    const K = window.MP2614_KANTOR, dedy = K.ch.find(q => q.r.id === 'dedy'), henoc = K.ch.find(q => q.r.id === 'henoc');
    const kirim = (c, tuj, x, y) => { c.x = c.r.duduk[0]; c.y = c.r.duduk[1]; c.ov = null; c.mode = 'titik'; c.tujuan = tuj; c.sampai = performance.now() + 120000; K.pergi(c, x, y, tuj); return c.jalur.slice(); };
    const jd = kirim(dedy, 'kolam', 20.5, 17.4), jh = kirim(henoc, 'rokok', 27.4, 16.2);
    const tembus = j => { let p = [dedy.r.duduk[0], dedy.r.duduk[1]]; return j.some(q => { const r = K.potongDinding(p[0], p[1], q[0], q[1]); p = q; return r; }); };
    const T0 = performance.now();
    while (performance.now() - T0 < 60000) { await new Promise(r => setTimeout(r, 300)); if (!dedy.jalur.length && !henoc.jalur.length) break; }
    await new Promise(r => setTimeout(r, 2500));
    return { dedy: [dedy.tujuan, dedy.x, dedy.y, dedy.mode], henoc: [henoc.tujuan, henoc.x, henoc.y, henoc.mode], titik: jd.length, tembus: tembus(jd) };
  });
  ok(tiba.titik >= 3 && !tiba.tembus, 'rute Pak Dedy dari R. Project Manager ke teras lewat pintu (' + tiba.titik + ' titik belok, tidak menembus dinding)');
  ok(tiba.dedy[0] === 'kolam' && tiba.dedy[2] > 15.6 && tiba.dedy[2] < 19.1, 'Pak Dedy berjalan dari R. Project Manager ke kolam renang & berenang (' + tiba.dedy[1].toFixed(1) + ', ' + tiba.dedy[2].toFixed(1) + ')');
  ok(tiba.henoc[0] === 'rokok' && tiba.henoc[1] > 25.5 && tiba.henoc[2] > 15 && tiba.henoc[2] < 18, 'Om Henoc berjalan ke area merokok (' + tiba.henoc[1].toFixed(1) + ', ' + tiba.henoc[2].toFixed(1) + ')');
  ok(await pg.evaluate(() => window.MP2614_KANTOR.asap.length > 0), 'asap rokok teranimasi di area merokok');
  await (await pg.$('#mp2614Cv')).screenshot({ path: OUT + '/mp294-kantor.png' });
  await pg.evaluate(() => mp2614Zoom(2)); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => document.getElementById('mp2614Zoom').textContent === '200%' && document.getElementById('mp2614Wrap').scrollWidth > document.getElementById('mp2614Wrap').clientWidth), 'zoom 200% & peta dapat digeser');
  const opsi = await pg.evaluate(() => [...document.querySelectorAll('#mp2616Ke option')].map(o => o.value));
  ok(opsi.indexOf('salma') < 0 && ['yusuf', 'dedy', 'imam', 'henoc'].every(x => opsi.indexOf(x) >= 0), 'ruang perintah: Salma tidak ada; Yusuf, Pak Dedy, Pak Imam, Om Henoc dapat diberi perintah');
  const g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g.length, 'tanpa galat JavaScript' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.4');
})().catch(e => { console.error(e); process.exit(1); });
