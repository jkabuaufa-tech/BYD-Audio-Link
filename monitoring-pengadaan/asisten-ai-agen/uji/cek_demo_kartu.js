// Uji demo: Kartu Gudang demo memakai fungsi asli paket — terusan dibawa ke periode berikutnya (sama dengan uji_kartu_terusan.js).
const { chromium } = require('playwright'), assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const pg = await br.newPage({ viewport: { width: 1300, height: 900 } });
  const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.goto('file://' + __dirname + '/../demo/demo-verifikasi-tagihan.html'); await pg.waitForTimeout(800);
  const baca = async (dari, sd) => { await pg.evaluate(([a, b]) => { mp223K.kunci = 'M-SM50'; mp223K.dari = a; mp223K.sd = b; mp223K.semua = true; mp223K._mp241User = true; mp223K._mp241SemuaUser = true; showTab('gdkartu'); mp223Render(); }, [dari, sd]); await pg.waitForTimeout(300);
    return pg.$$eval('#mp223KartuIsi tbody tr', L => L.map(tr => [...tr.cells].map(c => c.textContent.trim()))); };
  const tx = await pg.evaluate(() => ({ m: MP223.masuk.filter(r => r.kunci === 'M-SM50' && r.status === 'AKTIF').map(r => [r.tanggal, r.qty]), k: MP223.keluar.filter(r => r.kunci === 'M-SM50' && r.status === 'AKTIF').map(r => [r.tanggal, r.qty]) }));
  const akhir = [...tx.m, ...tx.k].map(x => x[0]).sort().pop(), d = new Date(akhir + 'T00:00:00'); d.setDate(d.getDate() + 1); const besok = d.toISOString().slice(0, 10); d.setDate(d.getDate() + 30); const sd = d.toISOString().slice(0, 10);
  const tm = tx.m.reduce((a, x) => a + x[1], 0), tk = tx.k.reduce((a, x) => a + x[1], 0), f = n => n.toLocaleString('id-ID');
  const R = await baca(besok, sd);
  ok(R.length > 20 && R[0][2] === f(tm) && R[0][4] === f(tk) && R[0][5] === f(tm - tk), 'periode setelah transaksi terakhir (' + besok + '): terusan GR ' + R[0][2] + ' / GI ' + R[0][4] + ' dibawa, sisa ' + R[0][5]);
  ok(R.every(r => r[2] === f(tm) && r[4] === f(tk)), 'terusan tetap di setiap tanggal periode (tidak kembali 0)');
  ok(/kumulatif sejak awal proyek/.test(await pg.textContent('#mp223KartuIsi')), 'keterangan rumus diperbarui');
  await pg.screenshot({ path: process.argv[2] + '/demo-kartu-terusan.png' });
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
