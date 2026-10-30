// Uji UJUNG-KE-UJUNG 2.9.5 di APLIKASI ASLI: Kantor Agen (Live) dapat DILIHAT semua akun; PERINTAH hanya akun Joko Supriyono.
//   A. Staf Pengadaan: dock & menu Kantor tampil · Kantor terbuka (mode lihat, tanpa panel perintah & tombol kerja) · perintah langsung ditolak klien & server
//   B. Joko Supriyono: panel perintah tetap ada.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui295.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan', R = __dirname + '/..';
const STAF = { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' };
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const tampak = (pg, s) => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden'; }, s);   // dock = position:fixed → offsetParent selalu null
(async () => {
  const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), paket = fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.9.5.json'), 'utf8');
  console.log('A. Akun Staf Pengadaan (lihat saja)');
  let b = await boot({ paket, modul, tunggu: 4000, viewport: { width: 1500, height: 1000 }, pengguna: [STAF], sebelum: SEBELUM, sebagai: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111' } });
  let pg = b.pg;
  await pg.waitForFunction(() => window.MP290 && window.MP290.dari === 'server', null, { timeout: 15000 });
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); }); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => !window.mp290AksesAI()) && await tampak(pg, '#mp2613Dock'), 'akses AI nonaktif, namun dock Agen AI tampil');
  ok(await pg.evaluate(() => !!document.getElementById('mp2614Menu') && getComputedStyle(document.getElementById('mp2614Menu')).display !== 'none'), 'menu akun › Kantor Agen (Live) tersedia');
  ok(!(await tampak(pg, '#mp227AiFab')) && !(await tampak(pg, '#mp250MenuTim')), 'Asisten AI & Tim AI tetap tersembunyi');
  await pg.click('#mp2613Dock'); await pg.waitForSelector('#mp2614Cv', { timeout: 10000 }); await pg.waitForTimeout(3500);
  ok(await pg.evaluate(() => !!document.getElementById('mp2614Lapis') && window.MP2614_KANTOR.ch.length > 10), 'klik dock → Kantor Agen (Live) terbuka & tim bergerak');
  const sl = await pg.evaluate(() => ({ form: !!document.getElementById('mp2616Form'), lihat: (document.getElementById('mp2616Lihat') || {}).textContent || '', ada: document.querySelector('.mp2614-dlg').classList.contains('mp2616-ada') }));
  ok(!sl.form && !sl.ada && /Mode lihat/.test(sl.lihat) && /Joko Supriyono/.test(sl.lihat), 'mode lihat: tanpa panel perintah — "' + sl.lihat.trim().slice(0, 70) + '…"');
  ok(!(await tampak(pg, '#mp2614Lapis button[onclick*="mp2613Kerja"]')) && !(await tampak(pg, '#mp2614Lapis button[onclick*="mp2613Buka"]')), 'tombol "Kerjakan sekarang" & Meja Kerja tersembunyi');
  await pg.evaluate(() => window.mp2614Pilih('yusuf')); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => (document.getElementById('mp2614Info') || {}).textContent.length > 10) && !(await tampak(pg, '#mp2614Info button[onclick*="mp2613Buka"]')), 'kartu staf (Yusuf) dapat dibuka, tanpa tombol Meja Kerja');
  await pg.evaluate(() => window.mp2614Pilih('')); await pg.screenshot({ path: OUT + '/mp295-kantor-staf.png' });
  const kirim = await pg.evaluate(async () => { const n = (window.MP2616 && window.MP2616.L || []).length; await window.mp2616Kirim('laporan'); return { log: !!document.getElementById('mp2616Log') }; });
  ok(!kirim.log, 'memanggil perintah langsung (mp2616Kirim) → ditolak di klien');
  const srv = await pg.evaluate(async () => { try { return await window.regAksi('aiTanya', { data: { tanya: 'uji' } }); } catch (e) { return { galat: String(e.message || e) }; } });
  ok(!srv || srv.ok === false || srv.galat || srv.error, 'server menolak aksi AI dari akun Staf (' + JSON.stringify(srv).slice(0, 80) + ')');
  let g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined|Fitur AI hanya tersedia/.test(e)); ok(!g.length, 'tanpa galat JavaScript (Staf)' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  await b.br.close();

  console.log('B. Akun Joko Supriyono (memerintah)');
  b = await boot({ paket, modul, tunggu: 4000, viewport: { width: 1500, height: 1000 }, pengguna: [STAF], sebelum: SEBELUM });
  pg = b.pg;
  await pg.waitForFunction(() => window.MP290 && window.MP290.dari === 'server', null, { timeout: 15000 });
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  await pg.evaluate(() => window.mp2614Kantor()); await pg.waitForSelector('#mp2614Cv'); await pg.waitForTimeout(1500);
  ok(await pg.evaluate(() => !!document.getElementById('mp2616Form') && !document.getElementById('mp2616Lihat') && document.querySelector('.mp2614-dlg').classList.contains('mp2616-ada')), 'Joko: panel perintah tim tersedia');
  ok(await tampak(pg, '#mp2614Lapis button[onclick*="mp2613Kerja"]'), 'Joko: tombol "Kerjakan sekarang" tampil');
  await pg.evaluate(() => window.mp2616Kirim('laporan')); await pg.waitForTimeout(1500);
  ok(await pg.evaluate(() => (document.getElementById('mp2616Log') || {}).textContent.length > 20), 'Joko: perintah "laporan" dijawab staf');
  await pg.screenshot({ path: OUT + '/mp295-kantor-joko.png' });
  g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g.length, 'tanpa galat JavaScript (Joko)' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.5');
})().catch(e => { console.error(e); process.exit(1); });
