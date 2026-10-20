// Uji paket HP 2.2.1 di Chromium (tampilan HP): file lokal (seperti APK), link ?server=, config.json, mode lokal pilihan.
// Pakai: node uji-hp-2.2.1.js <folder paket 2.2.1> <folder tangkapan>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), assert = require('assert');
const D = process.argv[2], OUT = process.argv[3], URL_X = 'https://script.google.com/macros/s/AKfycbUJI123_contoh-Server/exec';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const baru = async (konfig) => {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.route(/fonts\.|cdnjs|jsdelivr|unpkg/, r => r.abort());
    await ctx.route('https://script.google.com/**', r => { const u = r.request().url(); if (/action=ping/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, versiServer: '2.5.2', fitur: [] }) }); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'uji' }) }); });
    await ctx.route('https://hp.test/**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html';
      if (p === 'config.json') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ server: konfig }) });
      const f = path.join(D, p); r.fulfill(fs.existsSync(f) ? { path: f } : { status: 404, body: 'x' }); });
    const pg = await ctx.newPage(); const gal = []; pg.on('pageerror', e => gal.push(e.message)); return { ctx, pg, gal };
  };
  const st = pg => pg.evaluate(() => ({ kartu: !!document.getElementById('hpServer'), url: localStorage.getItem('JICT_REG_URL'), reg: (typeof REG !== 'undefined' ? REG.url : undefined), mode: (document.getElementById('loginMode') || {}).textContent, alamat: location.href }));

  console.log('1. Dibuka sebagai file lokal (seperti APK), belum ada alamat server');
  let { ctx, pg, gal } = await baru('');
  await pg.goto('file://' + D + '/index.html'); await pg.waitForTimeout(2500);
  let s = await st(pg); ok(s.kartu, 'kartu "Hubungkan ke server" tampil (dulu: diam-diam mode lokal → dashboard kosong)');
  await pg.screenshot({ path: OUT + '/hp221-hubungkan.png' });
  await pg.fill('#hpServerUrl', 'https://contoh.com/exec'); await pg.click('#hpServerOk'); await pg.waitForTimeout(200);
  ok(/harus berbentuk/.test(await pg.textContent('#hpServerS')), 'alamat salah ditolak dengan pesan jelas');
  await pg.evaluate(() => localStorage.setItem('JICT_REG_SESI', JSON.stringify({ nama: 'Joko Supriyono', peran: 'PENGADAAN', pin: '1234' })));   // sesi mode lokal lama
  await pg.fill('#hpServerUrl', URL_X); await Promise.all([pg.waitForNavigation({ timeout: 15000 }), pg.click('#hpServerOk')]); await pg.waitForTimeout(3000);
  s = await st(pg); ok(!s.kartu && s.url === URL_X && s.reg === URL_X, 'alamat diuji (ping) & disimpan → aplikasi tersambung ke server');
  ok(await pg.evaluate(() => !localStorage.getItem('JICT_REG_SESI')) && /Terhubung ke server/.test(s.mode || ''), 'sesi mode lokal lama dilepas → layar masuk "Terhubung ke server Google Sheets"');
  await pg.screenshot({ path: OUT + '/hp221-terhubung.png' });
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : '')); await ctx.close();

  console.log('2. Link sekali-atur ?server=…');
  ({ ctx, pg, gal } = await baru('TEMPEL_URL_APPS_SCRIPT_DI_SINI'));
  await pg.goto('https://hp.test/index.html?server=' + encodeURIComponent(URL_X)); await pg.waitForTimeout(3000);
  s = await st(pg); ok(!s.kartu && s.url === URL_X && s.reg === URL_X && !/server=/.test(s.alamat), 'alamat tersimpan, parameter hilang dari alamat, tanpa kartu');
  await ctx.close();

  console.log('3. config.json berisi alamat (hosting resmi)');
  ({ ctx, pg, gal } = await baru(URL_X));
  await pg.goto('https://hp.test/'); await pg.waitForTimeout(3000);
  s = await st(pg); ok(!s.kartu && s.reg === URL_X, 'langsung tersambung tanpa kartu (alamat dari config.json)');
  await ctx.close();

  console.log('4. config.json contoh + pilih mode lokal');
  ({ ctx, pg, gal } = await baru('TEMPEL_URL_APPS_SCRIPT_DI_SINI'));
  await pg.goto('https://hp.test/'); await pg.waitForTimeout(2500);
  ok((await st(pg)).kartu, 'config.json contoh → kartu tampil');
  await Promise.all([pg.waitForNavigation({ timeout: 15000 }), pg.click('#hpServerLokal')]); await pg.waitForTimeout(2500);
  s = await st(pg); ok(!s.kartu && s.url === '-' && /Mode lokal/.test(s.mode || ''), 'pilihan "lanjut tanpa server" dihormati (tidak ditanya terus)');
  await ctx.close();
  await br.close(); console.log('\nLULUS ' + lulus + ' cek');
})().catch(e => { console.error(e); process.exit(1); });
