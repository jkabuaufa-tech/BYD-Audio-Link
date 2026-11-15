const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
(async () => { const b = await chromium.launch(), pg = await b.newPage(); const galat = []; pg.on('pageerror', e => galat.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ contentType: 'text/html', body: '<title>App</title><body><iframe id="f" srcdoc="<title>BA 1</title><p>isi bingkai</p>"></iframe></body>' }));
  await pg.goto('https://app.test/');
  await pg.evaluate(() => { window.L = []; window.AndroidApp = { simpan: (b, m, n) => L.push(['simpan', atob(b), m, n]), cetak: () => L.push(['cetak']), cetakHtml: (h, j) => L.push(['cetakHtml', h, j]), bukaLuar: u => L.push(['luar', u]), pesan: t => L.push(['pesan', t]) }; });
  await pg.addScriptTag({ content: fs.readFileSync((process.argv[2] || __dirname + '/app/src/main/assets/jembatan.js'), 'utf8') }); await pg.addScriptTag({ content: fs.readFileSync((process.argv[2] || __dirname + '/app/src/main/assets/jembatan.js'), 'utf8') });
  await pg.waitForTimeout(1500);
  const L = await pg.evaluate(async () => {
    const u = URL.createObjectURL(new Blob(['halo excel'], { type: 'application/vnd.ms-excel' })); const a = document.createElement('a'); a.href = u; a.download = 'SPM 069.xls'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(u);
    const a2 = document.createElement('a'); a2.href = 'data:text/plain;base64,' + btoa('dua'); a2.download = 'b.txt'; a2.innerHTML = '<span id="sp">x</span>'; document.body.appendChild(a2); document.getElementById('sp').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    window.print(); document.getElementById('f').contentWindow.print();
    const w = window.open('', '_blank'); w.document.write('<html><head><title>Cetak PO</title></head><body>po</body></html>'); w.document.close(); w.focus(); w.onload = () => w.print(); setTimeout(() => w.close(), 500);
    window.open('https://drive.google.com/file/d/x', '_blank');
    await new Promise(r => setTimeout(r, 700)); return L; });
  const j = L.map(x => x[0]).sort().join(); console.log(JSON.stringify(L).slice(0, 700));
  assert.deepStrictEqual(L.filter(x => x[0] === 'simpan').map(x => x.slice(1)).sort(), [['dua', 'text/plain', 'b.txt'], ['halo excel', 'application/vnd.ms-excel', 'SPM 069.xls']]);
  assert.ok(L.some(x => x[0] === 'cetak')); assert.ok(L.some(x => x[0] === 'cetakHtml' && /isi bingkai/.test(x[1]) && x[2] === 'BA 1')); assert.ok(L.some(x => x[0] === 'cetakHtml' && />po</.test(x[1]) && x[2] === 'Cetak PO'));
  assert.ok(L.some(x => x[0] === 'luar' && /drive\.google/.test(x[1]))); assert.strictEqual(L.filter(x => x[0] === 'simpan').length, 2); assert.deepStrictEqual(galat, []);
  console.log('UJI jembatan.js: 7 cek LULUS'); await b.close(); })().catch(e => { console.error('GAGAL', e.message); process.exit(1); });
