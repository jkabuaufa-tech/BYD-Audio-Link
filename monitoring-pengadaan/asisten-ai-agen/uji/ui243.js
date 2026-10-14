// Uji UI 2.4.3 di Chromium: Kartu Gudang — semua tanggal 25–25 tampil, hari tanpa transaksi = 0, jumlah terusan berjalan (blok MP241 asli pada tiruan halaman gudang
// yang meniru logika dataKartu/vKartu/cetak MP223: baris hanya hari bertransaksi kecuali "Semua hari", nol ditulis "-").
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.4.4.json', 'utf8')), js = PK.js, css = PK.css;
const mp241 = js.slice(js.indexOf('/* MP241 — PEMBARUAN'));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1200, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ body: '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body><div id="mp223KartuIsi"></div></body></html>', contentType: 'text/html' }));
  await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'], dua = n => String(n).padStart(2, '0');
    const iso = d => d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate()), hariIni = () => iso(new Date());
    const tambah = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
    const tglK = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m[3] + '-' + BLN[+m[2] - 1] + '-' + m[1]; };
    const ang = v => Number(v).toLocaleString('id-ID'), n = new Date(), bl = (m, d) => iso(new Date(n.getFullYear(), n.getMonth() + m, d));
    window.MP223 = { masuk: [{ kunci: 'S', tanggal: bl(-1, 20), qty: 400, status: 'AKTIF' }, { kunci: 'S', tanggal: bl(-1, 27), qty: 300, status: 'AKTIF', migrasi: true }, { kunci: 'S', tanggal: bl(0, 3), qty: 250, status: 'AKTIF' }],
      keluar: [{ kunci: 'S', tanggal: bl(0, 10), qty: 180, status: 'AKTIF' }] };
    const K = window.mp223K = { kunci: 'S', dari: '', sd: '', semua: false };
    window.dataKartu = () => {   // = logika dataKartu MP223
      const dari = K.dari || hariIni().slice(0, 8) + '01', sd = K.sd || hariIni(), M = MP223.masuk, Kl = MP223.keluar;
      const awal = M.filter(r => r.tanggal < dari).reduce((a, r) => a + r.qty, 0) - Kl.filter(r => r.tanggal < dari).reduce((a, r) => a + r.qty, 0);
      let tm = 0, tk = 0; const rows = [];
      for (let d = dari, i = 0; d <= sd && i < 800; d = tambah(d, 1), i++) { const qm = M.filter(r => r.tanggal === d).reduce((a, r) => a + r.qty, 0), qk = Kl.filter(r => r.tanggal === d).reduce((a, r) => a + r.qty, 0); tm += qm; tk += qk;
        if (K.semua || qm || qk) rows.push({ d, qm, qk, tm, tk, sisa: awal + tm - tk }); }
      return { dari, sd, rows, awal };
    };
    window.mp223Render = () => { const D = dataKartu(); document.getElementById('mp223KartuIsi').innerHTML = '<input type="checkbox" id="mp223KAll" ' + (K.semua ? 'checked' : '') + ' onchange="mp223K.semua=this.checked;mp223Render()"><table class="mp219-tb mp223-tb"><tbody>' +
      D.rows.map(r => `<tr><td class="nw">${tglK(r.d)}</td><td class="r">${r.qm ? ang(r.qm) : '-'}</td><td class="r">${r.tm ? ang(r.tm) : '-'}</td><td class="r">${r.qk ? ang(r.qk) : '-'}</td><td class="r">${r.tk ? ang(r.tk) : '-'}</td><td class="r b">${ang(r.sisa)}</td><td class="sub">-</td></tr>`).join('') + '</tbody></table>'; };
    window.showTab = t => { if (t === 'gdkartu') mp223Render(); };
    window.mp224Cetak = (html, opt) => { window.__cetak = html; };
    window.mp223KartuCetak = () => { const D = dataKartu(); window.mp224Cetak('<style>@page{size:A4 landscape}</style><table class="t"><tbody>' + D.rows.map(r => `<tr><td class="c">${tglK(r.d)}</td><td class="r">${r.qm ? ang(r.qm) : '-'}</td><td class="r">${r.tm ? ang(r.tm) : '-'}</td><td class="r">${r.qk ? ang(r.qk) : '-'}</td><td class="r">${r.tk ? ang(r.tk) : '-'}</td><td class="r">${r.sisa ? ang(r.sisa) : '-'}</td><td>-</td></tr>`).join('') + '</tbody></table><div class="ft">x</div>', { lanskap: true }); };
    window.itemCmdk = () => []; window.keluarLogin = () => {}; window.renderSemuaData = () => {};
  });
  await pg.addScriptTag({ content: mp241 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.evaluate(() => showTab('gdkartu')); await pg.waitForTimeout(400);
  const R = await pg.$$eval('#mp223KartuIsi tbody tr', L => L.map(tr => [...tr.cells].map(c => c.textContent.trim())));
  const hari = Math.round((new Date(await pg.evaluate(() => mp241Tanggal25Now())) - new Date(await pg.evaluate(() => mp241Tanggal25Prev()))) / 864e5) + 1;
  ok(R.length === hari && /^25-/.test(R[0][0]) && /^25-/.test(R[R.length - 1][0]), 'semua ' + hari + ' tanggal tampil: ' + R[0][0] + ' s.d. ' + R[R.length - 1][0]);
  ok(R[0][1] === '0' && R[0][2] === '0' && R[0][3] === '0' && R[0][4] === '0' && R[0][5] === '400', 'hari pertama tanpa transaksi: 0 · terusan 0 · sisa 400 (saldo awal)');
  const i27 = R.findIndex(r => /^27-/.test(r[0])), i28 = i27 + 1;
  ok(R[i27][1] === '300' && R[i28][1] === '0' && R[i28][2] === '300' && R[i28][5] === '700' && /Migrasi/.test(R[i27][6]), 'setelah penerimaan 300: hari berikutnya jumlah 0, terusan tetap 300, sisa 700 (penanda migrasi tetap ada)');
  ok(R.every(r => r.slice(1, 6).every(v => v !== '-')), 'tidak ada "-" pada kolom jumlah/terusan/sisa');
  await pg.evaluate(() => mp223KartuCetak()); const h = await pg.evaluate(() => window.__cetak);
  ok((h.match(/<tr>/g) || []).length === hari && !/<td class="r">-<\/td>/.test(h) && /size:A4 portrait/.test(h), 'cetakan: ' + hari + ' tanggal, nol tertulis 0, A4 portrait');
  await pg.evaluate(() => { const c = document.getElementById('mp223KAll'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); showTab('gdkartu'); }); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => mp223K.semua === false && mp223K._mp241SemuaUser === true) && await pg.locator('#mp223KartuIsi tbody tr').count() < hari, 'pengguna mematikan "Semua hari" → pilihan dihormati');
  await pg.evaluate(() => keluarLogin()); ok(await pg.evaluate(() => !('_mp241SemuaUser' in mp223K)), 'keluar akun mengembalikan bawaan');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
