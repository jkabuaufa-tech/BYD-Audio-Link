// Uji UI 2.5.6 di Chromium: blok MP223 (gudang) & MP241 ASLI dari paket — kotak cari material Kartu Gudang & formulir GI,
// periode Bulan/Tahun 26–25 (WIB), keterangan per transaksi, cetak & Excel, isian GI tidak hilang saat render ulang, ket terkirim ke server.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[3] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.argv[2] || 'pembaruan-2.5.6.json'), 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = js.indexOf(b, i); assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const mp223 = potong('/* MP223 — PEMBARUAN 2.2.5', '/* MP224 — PEMBARUAN 2.2.5'), mp241 = potong('/* MP241 — PEMBARUAN', '/* MP250 — PEMBARUAN');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1300, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.clock.setFixedTime(new Date('2026-10-15T10:00:00+07:00'));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,Arial;margin:0;padding:12px;font-size:14px}.form-control,.form-select{padding:4px 6px;box-sizing:border-box}.col-12{width:100%}.col-6{width:48%;display:inline-block}
    .btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff}.mp219-fl{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.mp219-fl2{display:flex;gap:6px;align-items:center;flex-wrap:wrap}</style><style>${css}</style></head>
    <body><nav id="sidebar"><ul class="nav"><li><a class="nav-link" onclick="showTab('keuangan', event)">Keuangan</a></li></ul></nav><main><div class="content-tab" id="tab-dash">dasbor</div></main></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    const mats = [['1000234561', 'Semen PCC 50 kg', 'ZAK'], ['1000187730', 'Besi beton D13', 'BTG'], ['1000187731', 'Besi beton D16', 'BTG'], ['1000001017', 'Beton Readymix Fc-10', 'M3']];
    for (let i = 0; i < 120; i++) mats.push(['20000' + String(i).padStart(5, '0'), 'Material contoh ' + i, 'BH']);   // daftar panjang (dulu harus di-scroll)
    const masuk = mats.map((m, i) => ({ id: 'GR' + i, kunci: m[0], kode: m[0], uraian: m[1], sat: m[2], tanggal: '2026-07-0' + (1 + (i % 8)), qty: 100, harga: 1000, status: 'AKTIF', bonNomor: 'BON/' + i + '/2026', noSJ: 'SJ-' + i, ket: i === 0 ? 'Kiriman tahap 1 untuk pile cap' : '' }));
    const keluar = [{ id: 'GI1', kunci: '1000234561', kode: '1000234561', uraian: 'Semen PCC 50 kg', sat: 'ZAK', tanggal: '2026-07-01', qty: 30, status: 'AKTIF', untuk: 'Pile Cap P3', penerima: 'Mandor B', ket: 'Pengecoran pile cap P3', dibuatPada: '2026-07-01T09:00:00Z' },
      { id: 'GI2', kunci: '1000234561', kode: '1000234561', uraian: 'Semen PCC 50 kg', sat: 'ZAK', tanggal: '2026-07-01', qty: 5, status: 'AKTIF', untuk: 'Saluran BS-1', penerima: 'Mandor C', dibuatPada: '2026-07-01T10:00:00Z' }];
    window.__kirim = []; window.__notif = []; window.__cetak = ''; window.__excel = '';
    window.REG = { url: 'https://contoh/exec', sesi: { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' } };
    window.PROYEK = { id: '1726012', nama: 'Rehab Irigasi', kso: 'WASKITA - NINDYA KSO', kasi: 'JOKO SUPRIYONO' }; window.PMT = { data: [] }; window.MENU_CEPAT = [];
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.notif = (m, t) => { window.__notif.push([m, t]); };
    window.regAksi = async (a, x) => { window.__kirim.push([a, JSON.parse(JSON.stringify(x || {}))]);
      if (a === 'gudangBaca') return { ok: true, masuk: JSON.parse(JSON.stringify(masuk)), keluar: JSON.parse(JSON.stringify(keluar)) };
      if (a === 'gudangUnggahFoto') return { ok: true, data: { id: 'FOTO1', idServer: 'FOTO1', nama: 'serah-terima.jpg', ukuran: 1000 } };
      if (a === 'gudangKeluarSimpan') { const m = masuk.find(r => r.kunci === x.data.kunci); return { ok: true, data: Object.assign({ id: 'GI-BARU', kode: m.kode, uraian: m.uraian, sat: m.sat, status: 'AKTIF', dibuatOleh: 'Joko' }, x.data) }; }
      throw new Error('aksi tidak dikenal: ' + a); };
    window.showTab = t => { document.querySelectorAll('main .content-tab').forEach(d => { d.style.display = d.id === 'tab-' + t ? '' : 'none'; }); };
    window.bukaTab = t => window.showTab(t); window.renderSemuaData = () => { }; window.keluarLogin = () => { }; window.itemCmdk = () => [];
    window.mp224Cetak = html => { window.__cetak = html; };
    const cu = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(t => { window.__excel = t; }); return cu.call(URL, b); };
  });
  await pg.addScriptTag({ content: mp223 }); await pg.addScriptTag({ content: mp241 });
  await pg.evaluate(() => showTab('gdkartu')); await pg.waitForTimeout(500);

  console.log('1. Kartu Gudang — kotak cari material');
  ok(await pg.isVisible('#mp223KMatCari') && await pg.evaluate(() => document.getElementById('mp223KMat').hidden && document.getElementById('mp223KMat').options.length === 124), 'kotak cari tampil; <select> asli (124 material) tetap ada tersembunyi');
  const daftar = async () => pg.$$eval('#mp223KMatCariLb li[role=option]', L => L.map(li => li.textContent.replace(/\s+/g, ' ').trim()));
  await pg.click('#mp223KMatCari'); await pg.keyboard.type('semen'); await pg.waitForTimeout(100);
  let L = await daftar(); ok(L.length === 1 && /1000234561/.test(L[0]) && /Semen PCC 50 kg/.test(L[0]) && /ZAK/.test(L[0]), 'ketik "semen" → 1 hasil: kode · uraian · satuan');
  await pg.fill('#mp223KMatCari', ''); await pg.keyboard.type('BESI beton'); await pg.waitForTimeout(100);
  L = await daftar(); ok(L.length === 2 && L.every(x => /Besi beton/.test(x)), 'tanpa peduli huruf besar & beberapa kata: "BESI beton" → D13, D16');
  await pg.fill('#mp223KMatCari', ''); await pg.keyboard.type('87731'); await pg.waitForTimeout(100);
  L = await daftar(); ok(L.length === 1 && /D16/.test(L[0]), 'sebagian kode "87731" → Besi beton D16');
  await pg.fill('#mp223KMatCari', ''); await pg.keyboard.type('fc10'); await pg.waitForTimeout(100);
  L = await daftar(); ok(L.length === 1 && /Fc-10/.test(L[0]), 'tanpa tanda baca: "fc10" → Beton Readymix Fc-10');
  await pg.fill('#mp223KMatCari', ''); await pg.keyboard.type('besi'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => mp223K.kunci === '1000187731' && /D16/.test(document.querySelector('.mp223-kg-h').textContent)), 'keyboard ↓ + Enter memilih D16 → kartu memakai kunci asli 1000187731');
  ok(await pg.inputValue('#mp223KMatCari') === '1000187731 · Besi beton D16 (BTG)', 'label terpilih: kode · uraian (satuan)');
  await pg.click('#mp223KMatCari'); await pg.keyboard.type('xyz-tidak-ada'); await pg.waitForTimeout(100);
  ok(/Tidak ada material yang cocok/.test(await pg.textContent('#mp223KMatCariLb')), 'teks tanpa hasil → pesan, tidak membuat master baru');
  await pg.keyboard.press('Escape'); ok(await pg.inputValue('#mp223KMatCari') === '1000187731 · Besi beton D16 (BTG)' && await pg.evaluate(() => mp223K.kunci) === '1000187731', 'Esc → kembali ke material terpilih');
  await pg.click('#mp223KMatCari'); await pg.keyboard.type('sem'); await pg.evaluate(() => mp223Render()); await pg.waitForTimeout(100);   // render ulang (muat data 5 menit) saat mengetik
  ok(await pg.evaluate(() => document.activeElement.id === 'mp223KMatCari' && document.activeElement.value === 'sem' && document.activeElement.selectionStart === 3 && !document.getElementById('mp223KMatCariLb').hidden), 'render ulang saat mengetik: fokus, teks "sem" & kursor tetap, daftar tetap terbuka');
  await pg.keyboard.type('en'); await pg.waitForTimeout(80); await pg.click('#mp223KMatCariLb li[role=option]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => mp223K.kunci === '1000234561'), 'lanjut mengetik "semen" lalu klik → Semen PCC dipilih');

  console.log('2. Periode Bulan | Tahun | Tampilkan (26–25 WIB)');
  ok(/Periode Oktober 2026: 26 September 2026 s\.d\. 25 Oktober 2026/.test(await pg.textContent('#mp223KPeriode')), 'bawaan 15-Okt-2026 → periode Oktober 2026 (26 Sep – 25 Okt)');
  await pg.selectOption('#mp223KBulan', '7'); await pg.selectOption('#mp223KTahun', '2026');
  await pg.evaluate(() => mp223Render()); ok(await pg.inputValue('#mp223KBulan') === '7', 'pilihan bulan belum diterapkan tidak hilang saat render ulang');
  await pg.click('#mp223KTampil'); await pg.waitForTimeout(300);
  ok(/Periode Juli 2026: 26 Juni 2026 s\.d\. 25 Juli 2026/.test(await pg.textContent('#mp223KPeriode')), 'Tampilkan → Juli 2026: 26 Juni s.d. 25 Juli 2026');
  let R = await pg.$$eval('#mp223KartuIsi tbody tr', T => T.map(tr => [...tr.cells].map(c => c.innerText.trim())));
  ok(R.length === 30 && /^26-Jun-2026/.test(R[0][0]) && /^25-Jul-2026/.test(R[29][0]), '30 tanggal tampil (hari tanpa transaksi termasuk)');
  const r1 = R.find(r => /^01-Jul/.test(r[0]));
  ok(r1[6].split('\n').length === 3 && /GR Kiriman tahap 1 untuk pile cap \(BON\/2026 · SJ SJ-0\)/.test(r1[6]) && /GI Pengecoran pile cap P3 \(Pile Cap P3 · Mandor B\)/.test(r1[6]) && /GI Saluran BS-1 · Mandor C/.test(r1[6]), '01-Jul: 3 transaksi, satu baris keterangan per transaksi (ket diutamakan, bawaan bila kosong)');
  ok(/Saldo akhir\s*65/.test(await pg.innerText('.mp223-kg-h')), 'kotak Saldo akhir = 0 + 100 − 35 = 65');
  await pg.evaluate(() => showTab('gdkartu')); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => mp223K.bulan === 7 && mp223K.tahun === 2026 && mp223K.dari === '2026-06-26'), 'siapkanK (MP241) tidak menimpa pilihan Juli 2026 saat tab dibuka ulang');
  await pg.evaluate(() => mp223KartuCetak()); const h = await pg.evaluate(() => window.__cetak);
  ok(/size:A4 portrait/.test(h) && /Bulan<\/td><td>: Juli/.test(h) && /Periode<\/td><td>: 26 Juni 2026 s\.d\. 25 Juli 2026/.test(h) && (h.match(/<tr><td class="c">/g) || []).length === 30 && /Pile Cap P3 · Mandor B\)<br>GI Saluran/.test(h), 'cetak LOGINV-09: Juli 2026, periode 26 Jun–25 Jul, 30 tanggal, keterangan per transaksi, A4 portrait (MP241)');
  await pg.evaluate(() => mp223KartuExcel()); await pg.waitForFunction(() => window.__excel.length > 0);
  const x = await pg.evaluate(() => window.__excel);
  ok(/periode Juli 2026 2026-06-26 s\.d\. 2026-07-25/.test(x) && /1\) GR Kiriman tahap 1 untuk pile cap/.test(x) && (x.match(/<tr>/g) || []).length === 33, 'Excel: periode & keterangan sama dengan layar (30 baris data)');
  await pg.clock.setFixedTime(new Date('2026-10-26T01:00:00+07:00'));   // 25-Okt 18:00 UTC = 26-Okt WIB
  ok(await pg.evaluate(() => JSON.stringify(mp256PeriodeKini())) === '{"bulan":11,"tahun":2026}', 'zona Asia/Jakarta: 26-Okt 01:00 WIB (masih 25-Okt UTC) → periode November 2026');
  await pg.clock.setFixedTime(new Date('2026-10-15T10:00:00+07:00'));
  await pg.screenshot({ path: OUT + '/ui256-kartu-periode.png', fullPage: false });

  console.log('3. Stok & Pengeluaran — kotak cari material GI & isian tidak hilang');
  await pg.evaluate(() => showTab('gdstok')); await pg.waitForTimeout(400);
  ok(await pg.isVisible('#mp223KItemCari') && await pg.evaluate(() => document.getElementById('mp223KItem').hidden), 'formulir GI: kotak cari tampil, <select id="mp223KItem"> asli tetap (tersembunyi)');
  await pg.click('#mp223KItemCari'); await pg.keyboard.type('d13'); await pg.waitForTimeout(100);
  L = await pg.$$eval('#mp223KItemCariLb li[role=option]', T => T.map(li => li.textContent.replace(/\s+/g, ' ')));
  ok(L.length === 1 && /BTG · stok 100/.test(L[0]), 'hasil cari menampilkan satuan & stok tersedia ("BTG · stok 100")');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(() => document.getElementById('mp223KItem').value === '1000187730' && /Stok per .*100 BTG/.test(document.getElementById('mp223KInfo').textContent)), 'Enter memilih D13 → kunci asli di <select>, info stok diperbarui (cekKeluar)');
  ok(!(await pg.evaluate(() => __kirim.some(k => k[0] === 'gudangKeluarSimpan'))), 'Enter pada daftar cari tidak mengirim formulir');
  await pg.fill('#mp223KQty', '12'); await pg.fill('#mp223KUntuk', 'Abutment A1'); await pg.fill('#mp223KPen', 'Mandor B'); await pg.fill('#mp223KKet', 'Lantai kerja abutment A1');
  await pg.click('#mp223SCari'); await pg.keyboard.type('besi'); await pg.waitForTimeout(450);   // cari di tabel stok → render ulang seluruh tab
  const isian = await pg.evaluate(() => ['mp223KItem', 'mp223KQty', 'mp223KUntuk', 'mp223KPen', 'mp223KKet'].map(id => document.getElementById(id).value));
  ok(JSON.stringify(isian) === JSON.stringify(['1000187730', '12', 'Abutment A1', 'Mandor B', 'Lantai kerja abutment A1']) && await pg.inputValue('#mp223SCari') === 'besi', 'mencari di tabel stok (render ulang) tidak menghapus isian GI & pilihan material');
  await pg.evaluate(() => mp223Render()); ok(await pg.inputValue('#mp223KKet') === 'Lantai kerja abutment A1' && await pg.inputValue('#mp223KItemCari') === '1000187730 · Besi beton D13 (BTG)', 'muat ulang data (render) → isian & label material tetap');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await pg.setInputFiles('#mp223FKFoto', { name: 'serah.png', mimeType: 'image/png', buffer: png }); await pg.waitForTimeout(400);
  await pg.click('#mp223KOk'); await pg.waitForFunction(() => __kirim.some(k => k[0] === 'gudangKeluarSimpan'));
  const kirim = await pg.evaluate(() => __kirim.find(k => k[0] === 'gudangKeluarSimpan')[1].data);
  ok(kirim.kunci === '1000187730' && kirim.qty === 12 && kirim.untuk === 'Abutment A1' && kirim.penerima === 'Mandor B' && kirim.ket === 'Lantai kerja abutment A1' && kirim.foto && kirim.foto.idServer === 'FOTO1', 'gudangKeluarSimpan: kunci asli, qty, lokasi, penerima, foto serah terima & ket terkirim');
  await pg.waitForTimeout(300);
  ok(await pg.inputValue('#mp223KQty') === '' && await pg.inputValue('#mp223KKet') === '' && await pg.inputValue('#mp223KItemCari') === '', 'setelah tersimpan formulir kosong kembali (draf tidak terbawa)');
  await pg.fill('#mp223SCari', ''); await pg.waitForTimeout(400);
  await pg.click('#mp223StokIsi .mp227-stok tbody tr:has-text("Besi beton D16")'); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => mp223K.kunci === '1000187731') && await pg.inputValue('#mp223KMatCari') === '1000187731 · Besi beton D16 (BTG)', 'klik baris tabel stok → Kartu Gudang material itu (akses langsung tetap)');
  await pg.evaluate(() => showTab('gdstok')); await pg.waitForTimeout(300);
  await pg.click('#mp223KItemCari'); await pg.keyboard.type('semen'); await pg.waitForTimeout(100);
  await pg.screenshot({ path: OUT + '/ui256-gi-cari.png', fullPage: false });
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(150);
  ok(await pg.evaluate(() => { const lb = document.getElementById('mp223KItemCariLb').getBoundingClientRect(); return lb.right <= 391 && lb.left >= -1; }), 'ponsel 390 px: daftar cari tidak melebar keluar layar');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
