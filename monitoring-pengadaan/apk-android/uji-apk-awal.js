// apk-awal.js di aplikasi asli: paket lewat "berkas" tiruan, muat ulang sekali, tampilan 2.10.26 aktif
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const D = process.env.HTML_DASAR, AW = fs.readFileSync(process.argv[2], 'utf8'), PK = fs.readFileSync(process.argv[3], 'utf8');
(async () => { const b = await chromium.launch(), ctx = await b.newContext(); let berkas = '', muat = 0;
  await ctx.exposeBinding('__simpan', (s, v) => { berkas = v; }); await ctx.exposeBinding('__hapus', () => { berkas = ''; });
  const html = fs.readFileSync(D, 'utf8').replace('<script src="hp-awal.js"></script>', '');
  const pg = await ctx.newPage(); const galat = []; pg.on('pageerror', e => galat.push(e.message));
  await pg.route('https://appassets.androidplatform.net/app/**', r => { const u = r.request().url();
    if (u.endsWith('index.html')) { muat++; return r.fulfill({ contentType: 'text/html', body: html.replace(/<head>/i, m => m + '<script>window.AndroidApp={bacaPaket:()=>{var x=new XMLHttpRequest();x.open("GET","paket.txt",false);x.send();return x.status===200?x.responseText:""},versi:()=>"2.10.26",kode:()=>5,simpanPaket:v=>{window.__simpan(v)},hapusPaket:()=>{window.__hapus()}};try{if(!localStorage.getItem("JICT_REG_URL"))localStorage.setItem("JICT_REG_URL","-")}catch(e){}</script><script>' + AW.replace(/<\/script/g, '<\\/script') + '</script>') }); }
    if (u.endsWith('paket.txt')) return r.fulfill({ contentType: 'text/plain; charset=utf-8', body: berkas });
    return r.fulfill({ status: 404, body: '' }); });
  await pg.goto('https://appassets.androidplatform.net/app/index.html'); await pg.waitForTimeout(2500);
  assert.strictEqual(await pg.evaluate(() => PEMB.aktif), null);
  await pg.evaluate(pk => tulisSimpan(KUNCI_PEMB, JSON.parse(pk)), PK);   // = yang dilakukan cekPembaruanServer() saat paket datang
  await pg.waitForTimeout(5000);
  const r = await pg.evaluate(() => ({ v: PEMB.aktif && PEMB.aktif.versi, ls: Object.keys(localStorage).includes('JICT_PEMBARUAN'), radial: !!window.MP21026 }));
  console.log(JSON.stringify(r), 'muat', muat, 'berkas', berkas.length);
  assert.ok(r.v === '2.10.26' && !r.ls && r.radial && muat === 2 && berkas.length > 3e6);
  await pg.evaluate(pk => tulisSimpan(KUNCI_PEMB, JSON.parse(pk)), PK); await pg.waitForTimeout(1500); assert.strictEqual(muat, 2, 'tidak muat ulang lagi');
  // diagnosa: server (ditirukan) aktif tetapi paket tidak terpasang → papan + Coba lagi memasang paket
  berkas = ''; await pg.route('https://srv.test/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, data: JSON.parse(PK) }) }));
  await pg.evaluate(() => { localStorage.setItem('JICT_REG_URL', 'https://srv.test/exec'); localStorage.setItem('JICT_PEMB_GAGAL', '2.10.26'); sessionStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(2500);
  await pg.evaluate(() => { REG.url = 'https://srv.test/exec'; __apkDiag.periksa(); });
  const t = await pg.textContent('#apkDiag'); console.log(t.slice(0, 220)); assert.ok(/belum aktif/.test(t) && /Tanda gagal tersimpan: v2\.10\.26/.test(t) && /WebView \d+/.test(t));
  await pg.click('#apkDiagCoba'); await pg.waitForTimeout(6000);
  assert.strictEqual(await pg.evaluate(() => PEMB.aktif && PEMB.aktif.versi), '2.10.26'); assert.ok(!(await pg.$('#apkDiag')));
  console.log('UJI apk-awal.js: LULUS'); await b.close(); })().catch(e => { console.error('GAGAL', e.message); process.exit(1); });
