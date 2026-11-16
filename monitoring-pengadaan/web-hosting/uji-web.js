// Uji folder web siap unggah (hasil rakit-web.py) di Chromium: server Apps Script ditirukan.
// Pakai: node uji-web.js <folder-web> [paket-baru.json] [paket-lama.json]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const DIR = process.argv[2], A = path.join(__dirname, '..', 'asisten-ai-agen');
const BARU = fs.readFileSync(process.argv[3] || path.join(A, 'pembaruan-2.10.26.json'), 'utf8'), LAMA = fs.readFileSync(process.argv[4] || path.join(A, 'pembaruan-2.6.2.json'), 'utf8');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DIR, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const U = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(); let n = 0;
  async function skenario(nama, siap, harap) {
    const ctx = await b.newContext({ serviceWorkers: 'block' }), pg = await ctx.newPage(); let muat = 0, minta = 0; const galat = [];
    pg.on('pageerror', e => galat.push(e.message)); pg.on('framenavigated', f => { if (f === pg.mainFrame()) muat++; });
    await ctx.route(/script\.google\.com/, r => { const u = r.request().url(); if (/action=pembaruan/.test(u)) { minta++; return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true,"data":' + BARU + '}' }); }
      return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":false,"error":"tiruan"}' }); });
    if (siap) await ctx.addInitScript(siap.fn, siap.arg);
    await pg.goto(U); await pg.waitForTimeout(9000);
    const r = await pg.evaluate(() => ({ v: PEMB.aktif && PEMB.aktif.versi, gagal: PEMB.gagal, url: /\/exec$/.test(REG.url || ''), polos: (localStorage.getItem.call ? Object.keys(localStorage).includes('JICT_PEMBARUAN') : false), lz: (Storage.prototype.hasOwnProperty, Object.keys(localStorage).includes('JICT_PEMBARUAN_LZ')), radial: !!window.MP21026, hpServer: !!document.getElementById('hpServer') }));
    console.log(nama, JSON.stringify(r), 'muat', muat, 'minta', minta, galat.filter(g => !/Maximum call stack/.test(g)));
    assert.ok(r.v === '2.10.26' && !r.gagal && r.url && r.radial && !r.hpServer, nama); harap(r, muat); n++; await ctx.close();
  }
  await skenario('1. perangkat baru', null, (r, muat) => assert.ok(r.polos && !r.lz && muat === 2));
  await skenario('2. dari paket lama < 2.6.5', { fn: lama => { try { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('JICT_PEMBARUAN', lama); } } catch (e) { } }, arg: LAMA }, (r, muat) => assert.ok(muat === 2));
  await skenario('3. kuota localStorage penuh', { fn: () => { try { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); let i = 0; const blok = 'x'.repeat(250000); for (; i < 40; i++) { try { localStorage.setItem('PENUH_' + i, blok); } catch (e) { break; } } for (let j = i - 1; j > i - 8 && j >= 0; j--) localStorage.removeItem('PENUH_' + j); } } catch (e) { } } }, (r, muat) => assert.ok(!r.polos && r.lz && muat === 2, 'harus tersimpan terkompresi'));
  console.log('UJI web siap unggah: ' + n + ' skenario LULUS'); await b.close(); srv.close();
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
