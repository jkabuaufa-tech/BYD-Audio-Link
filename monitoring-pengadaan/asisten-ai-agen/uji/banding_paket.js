// Uji banding: paket UTUH lama vs baru dimuat di halaman tiruan yang sama → galat JavaScript tambahan & beban pengamat halaman
// saat 20.000 elemen (tabel/PDF besar) ditambahkan bertahap. Pakai: node banding_paket.js <paket-lama.json> <paket-baru.json>
const { chromium } = require('playwright'), fs = require('fs');
const [A, B] = process.argv.slice(2), BLOK = {};
const HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><div class="app-header"><div class="menu-akun"><ul class="dropdown-menu"></ul></div></div>
  <div id="tab-dashboard-tagihan"></div><div id="tab-register"><div class="card"><table><tbody id="regBody"></tbody></table></div></div><div id="tab-keuangan"></div><div id="mdIsi"></div><div id="besar"></div></body></html>`;
async function ukur(br, berkas) {
  const p = JSON.parse(fs.readFileSync(berkas, 'utf8')), pg = await br.newPage(), gal = [];
  pg.on('pageerror', e => gal.push(e.message.slice(0, 140)));
  await pg.route('https://contoh.test/**', r => r.fulfill({ body: JSON.stringify({ ok: false, error: 'uji luring' }), contentType: 'application/json' }));
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(adaSesi => { window.REG = adaSesi ? { url: 'https://contoh.test/exec', sesi: { nama: 'Joko Supriyono', pin: '1234', admin: true, peran: 'PENGADAAN' }, data: [], dataSiap: true } : { url: '', sesi: null, data: [] }; window.PROG = { data: [] }; window.PMT = { data: [] }; window.PROYEK = { id: '1726012' }; window.notif = () => { }; }, !!process.env.SESI);
  await pg.addStyleTag({ content: p.css });
  // dimuat per blok (penanda "/* MPxxx") agar galat di satu blok (mis. butuh HTML dasar) tidak menghentikan blok berikutnya
  const blok = p.js.split(/\n(?=\/\* MP[0-9A-Z]+ )/), jalan = [];
  for (const b of blok) { const nama = (b.match(/^\/\* (MP[0-9A-Z]+)/) || [, 'awal'])[1], n0 = gal.length; try { await pg.addScriptTag({ content: b }); } catch (e) { gal.push(nama + ': ' + e.message.slice(0, 120)); } await pg.waitForTimeout(30); if (gal.length > n0) gal.splice(n0, gal.length - n0, ...gal.slice(n0).map(g => g.startsWith(nama) ? g : nama + ': ' + g)); jalan.push(nama); }
  BLOK[p.versi] = jalan;
  await pg.waitForTimeout(1500);
  const ms = await pg.evaluate(async () => {   // 40 gelombang × 500 baris, seperti tabel/PDF besar yang tampil bertahap
    const el = document.getElementById('besar'), t0 = performance.now();
    for (let i = 0; i < 40; i++) { const f = document.createDocumentFragment(); for (let j = 0; j < 500; j++) { const d = document.createElement('div'); d.textContent = 'baris ' + i + '-' + j; f.appendChild(d); } el.appendChild(f); await new Promise(r => setTimeout(r, 5)); }
    await new Promise(r => setTimeout(r, 800)); return Math.round(performance.now() - t0);
  });
  await pg.close(); return { versi: p.versi, gal: [...new Set(gal)], ms };
}
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const L = [], R = []; for (let i = 0; i < 3; i++) { L.push(await ukur(br, A)); R.push(await ukur(br, B)); }
  await br.close();
  const med = a => a.map(x => x.ms).sort((x, y) => x - y)[1], a = L[0], b = R[0], baru = b.gal.filter(g => !a.gal.includes(g));
  console.log('blok ' + a.versi + ': ' + BLOK[a.versi].length + ' · ' + b.versi + ': ' + BLOK[b.versi].length + ' (' + BLOK[b.versi].filter(x => !BLOK[a.versi].includes(x)).join(', ') + ' baru)');
  console.log(a.versi + ': ' + a.gal.length + ' galat (halaman tiruan tanpa HTML dasar) · 20.000 elemen ' + med(L) + ' ms');
  console.log(b.versi + ': ' + b.gal.length + ' galat · 20.000 elemen ' + med(R) + ' ms');
  console.log(baru.length ? 'GALAT BARU: ' + baru.join(' | ') : '  ✓ tidak ada galat baru dari blok tambahan');
  process.exit(baru.length ? 1 : 0);
})();
