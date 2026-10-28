// Uji UI 2.6.22 di Chromium (blok MP2622 asli + kernel/modul asli lewat harness, aksi "save"): input kontrak multi-item & rincian item draf.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.6.json';
const { K, P } = require('./vt_data.js')();
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const STF = (a, x) => post(Object.assign({ action: a, nama: 'Staf Pengadaan', pin: '1111', proyek: P }, x || {}));
// kontrak Register sebelumnya (sumber isian otomatis satuan/harga) + 1 kontrak sudah diposting
let r = STF('save', { data: { noKontrak: '001/SPM/WK-NK.KSO/PDBJ/2026', jenisKontrak: 'SPM', namaVendor: 'CV Lama', tglKontrak: '2026-09-01', items: [{ kode: 'M-01', uraian: 'Semen Portland 50 kg', vol: 100, sat: 'sak', harga: 65000, wbs: 'A.1' }, { uraian: 'Besi beton D13', vol: 50, sat: 'btg', harga: 98000, wbs: 'A.1', noPermintaan: 'BON-007' }] } }); assert.ok(r.ok, r.error);
const L = K.bacaKoleksi_(P, 'data'); L.push({ id: 'LPOST', noKontrak: '009/SPPP/WK-NK.KSO/PDBJ/2026', namaVendor: 'CV Posting', diposting: true, versi: 1, items: [{ uraian: 'Pasir', vol: 1, sat: 'm3', harga: 1 }] }); K.tulisKoleksi_(P, 'data', L);
const PMT = [{ nomor: 'BON-007', tanggal: '2026-10-20', keperluan: 'Pengecoran pile cap', wbs: 'B.2', items: [{ kode: 'M-02', uraian: 'Besi beton D13', vol: 80, sat: 'btg' }, { uraian: 'Kawat bendrat', vol: 10, sat: 'kg' }, { uraian: 'Semen Portland 50 kg', vol: 40, sat: 'sak', wbs: 'B.3' }] }];
const EXCEL = Array.from({ length: 12 }, (_, i) => ['Item tempel ' + (i + 1), (i + 1) + ',5', 'm3', '1.250.000'].join('\t')).join('\n');
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.22.json', 'utf8')), BLOK = PK.js.slice(PK.js.indexOf('/* MP2622'), PK.js.indexOf('/* MP264 — PEMBARUAN'));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  await pg.exposeFunction('srvData', () => JSON.stringify(K.bacaKoleksi_(P, 'data')));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0}.btn{border:1px solid #ccc;border-radius:6px;padding:3px 8px;background:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-close::after{content:'×'}.form-control,.form-select{width:100%;box-sizing:border-box;padding:3px 5px}</style><style>${PK.css}</style></head>
    <body><div id="tab-register" style="padding:12px"><input id="regCari"><table><tbody id="regBody"></tbody></table></div><datalist id="dlWbs"><option value="A.1"></datalist></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(([P, PMT]) => {
    window.PROYEK = { id: P }; window.REG = { url: 'x', sesi: { nama: 'Staf Pengadaan', pin: '1111', peran: 'PENGADAAN', proyek: P }, data: [] }; window.PMT = { data: PMT }; window.RINGKASAN = [];
    window.NO_KONTRAK_TENGAH = 'WK-NK.KSO/PDBJ'; window.KELOMPOK_MAP = { SPM: 'MATERIAL' }; window.NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    window.saranNoUrut = (j, th) => 1 + (REG.data || []).filter(r => (r.noKontrak || '').split('/')[1] === j).length;
    window.noKontrakSudahAda = () => false; window.getVendorList = () => [{ id: '1000123', name: 'CV Maju Jaya' }, { id: '1000456', name: 'PT Beton Kuat' }];
    window.notif = (m, t) => (window.__n = window.__n || []).push([m, t]);
    window.regAksi = async (a, x) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama: 'Staf Pengadaan', pin: '1111', proyek: P }, x || {})))); if (!r.ok) throw new Error(r.error); return r; };
    window.muatRegister = async () => { REG.data = JSON.parse(await window.srvData()); document.getElementById('regBody').innerHTML = REG.data.map(r => `<tr><td>${r.noKontrak}</td><td>${r.namaVendor}</td><td></td></tr>`).join(''); };
  }, [P, PMT]);
  await pg.evaluate(() => muatRegister());
  await pg.addScriptTag({ content: BLOK }); await pg.waitForSelector('#mp2622Btn');
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const n = () => pg.evaluate(() => (window.__n || []).map(x => x[0]));
  ok(true, 'Register Kontrak: tombol "+ Kontrak multi-item" (peran Pengadaan)');
  ok(await pg.$$eval('#regBody .mp2622-rinci', x => x.length) === 4 && await pg.evaluate(() => ![...document.querySelectorAll('#regBody tr')].find(t => /^009\/SPPP/.test(t.textContent)).querySelector('.mp2622-rinci')), 'tombol "Item (n)" pada 4 draf; kontrak diposting tidak');

  console.log('1. Header & isian otomatis');
  await pg.click('#mp2622Btn'); await pg.waitForSelector('.mp2622-dlg');
  await pg.selectOption('#m22Jenis', 'SPM');
  ok(/003\/SPM\/WK-NK\.KSO\/PDBJ\/2026/.test(await pg.$eval('.mp2622-g', el => [...el.querySelectorAll('input')].map(i => i.value).join(' '))), 'no urut otomatis → 003/SPM/WK-NK.KSO/PDBJ/2026');
  await pg.fill('.mp2622-g input[list=m22Vendor]', 'CV Maju Jaya'); await pg.press('.mp2622-g input[list=m22Vendor]', 'Tab');
  ok(await pg.evaluate(() => [...document.querySelectorAll('.mp2622-g input')].some(i => i.value === '1000123')), 'vendor dari Master → ID SAP terisi');
  const sel = (r, c) => `.mp2622-tb tbody tr:nth-child(${r}) td:nth-child(${c}) input`;
  await pg.fill(sel(1, 3), 'Semen Portland 50 kg'); await pg.press(sel(1, 3), 'Tab');
  ok(await pg.$eval(sel(1, 5), x => x.value) === 'sak' && await pg.$eval(sel(1, 6), x => x.value) === '65000' && await pg.$eval(sel(1, 2), x => x.value) === 'M-01', 'uraian dari kontrak sebelumnya → kode, satuan & harga terisi');
  await pg.fill(sel(1, 4), '120'); await pg.press(sel(1, 4), 'Enter'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(() => document.activeElement && document.activeElement.closest('tr') && document.activeElement.closest('tr').querySelector('.n').textContent === '2'), 'Enter → pindah ke baris berikutnya (kolom sama)');

  console.log('2. Tempel dari Excel (12 baris, angka format Indonesia)');
  await pg.click('button:has-text("Tempel dari Excel")'); await pg.fill('#m22Tempel', EXCEL); await pg.click('button:has-text("Tambahkan ke tabel")');
  const t1 = await pg.evaluate(() => [...document.querySelectorAll('.mp2622-tb tbody tr')].filter(tr => tr.querySelector('td:nth-child(3) input').value).length);
  ok(t1 === 13, '12 baris tempel + 1 baris manual = 13 item');
  ok(await pg.$eval(sel(2, 3), x => x.value) === 'Item tempel 1' && await pg.$eval(sel(2, 4), x => x.value) === '1.5' && await pg.$eval(sel(2, 6), x => x.value) === '1250000', 'tempelan mengisi baris kosong di bawah baris manual; "1,5" → 1.5 dan "1.250.000" → 1250000');

  console.log('3. Ambil dari Bon Permintaan');
  await pg.click('button:has-text("Ambil dari Bon Permintaan")'); await pg.selectOption('.mp2622-pn select', 'BON-007');
  ok(await pg.$$eval('.mp2622-bon input:disabled', x => x.length) === 1, 'item bon yang sudah dikontrakkan dari bon ini tidak dapat diambil ulang (Besi D13)');
  await pg.click('button:has-text("Tambahkan item tercentang")');
  const kawat = await pg.evaluate(() => { const tr = [...document.querySelectorAll('.mp2622-tb tbody tr')].find(t => t.querySelector('td:nth-child(3) input').value === 'Kawat bendrat'); return tr && [tr.querySelector('td:nth-child(8) input').value, tr.querySelector('td:nth-child(9)').textContent]; });
  ok(kawat && kawat[0] === 'B.2' && kawat[1] === 'BON-007' && await pg.evaluate(() => { const tr = [...document.querySelectorAll('.mp2622-tb tbody tr')].filter(t => t.querySelector('td:nth-child(3) input').value === 'Semen Portland 50 kg').pop(); return tr.querySelector('td:nth-child(6) input').value === '65000' && tr.querySelector('td:nth-child(8) input').value === 'B.3'; }), 'Kawat bendrat & Semen ditambahkan dengan WBS bon (B.2) & No Bon; harga Semen terisi dari kontrak sebelumnya');

  console.log('4. Validasi & simpan');
  await pg.click('.mp2622-dlg footer .btn-primary');
  ok((await n()).some(m => /Baris 14: uraian, volume dan harga satuan wajib/.test(m)), 'harga kosong → simpan ditolak dengan nomor baris');
  const iK = await pg.evaluate(() => [...document.querySelectorAll('.mp2622-tb tbody tr')].findIndex(t => t.querySelector('td:nth-child(3) input').value === 'Kawat bendrat') + 1);
  await pg.fill(sel(iK, 6), '25.000'); await pg.press(sel(iK, 6), 'Tab');
  const total = await pg.$eval('.mp2622-tb tfoot', x => x.textContent);
  await pg.screenshot({ path: OUT + '/kontrak-multi-item.png' });
  await pg.click('.mp2622-dlg footer .btn-primary'); await pg.waitForFunction(() => !document.getElementById('mp2622Kd'));
  const rec = K.bacaKoleksi_(P, 'data').find(x => x.noKontrak === '003/SPM/WK-NK.KSO/PDBJ/2026');
  const harap = 120 * 65000 + Array.from({ length: 12 }, (_, i) => (i + 1.5) * 1250000).reduce((a, b) => a + b, 0) + 10 * 25000 + 40 * 65000;
  ok(rec && rec.items.length === 15 && rec.nilai === harap && rec.idVendor === '1000123' && rec.kelompok === 'MATERIAL', 'tersimpan di server: 15 item, nilai ' + rec.nilai.toLocaleString('id-ID') + ' (sesuai total di layar: ' + /Rp [\d.]+/.exec(total)[0] + ')');
  ok(rec.items.find(i => i.uraian === 'Kawat bendrat').noPermintaan === 'BON-007', 'No Bon tersimpan per item (noPermintaan)');

  console.log('5. Draf isian & rincian item draf kontrak');
  await pg.click('#mp2622Btn'); await pg.fill(sel(1, 3), 'Item belum selesai'); await pg.press(sel(1, 3), 'Tab'); await pg.click('.mp2622-dlg .btn-close');
  await pg.click('#mp2622Btn');
  ok(await pg.$eval(sel(1, 3), x => x.value) === 'Item belum selesai', 'isian belum disimpan dipulihkan saat dibuka lagi'); await pg.click('.mp2622-dlg .btn-close');
  await pg.waitForSelector('#regBody .mp2622-rinci'); await pg.evaluate(() => [...document.querySelectorAll('#regBody tr')].find(t => /^003\/SPM/.test(t.textContent)).querySelector('.mp2622-rinci').click());
  await pg.waitForSelector('.mp2622-info');
  ok(await pg.evaluate(() => document.querySelectorAll('.mp2622-tb tbody tr').length) === 16, 'Rincian item: 15 item lama + 1 baris kosong');
  await pg.fill(sel(16, 3), 'Paku 7 cm'); await pg.fill(sel(16, 4), '5'); await pg.fill(sel(16, 5), 'kg'); await pg.fill(sel(16, 6), '22000'); await pg.press(sel(16, 6), 'Tab');
  await pg.click('.mp2622-dlg footer .btn-primary');
  await pg.waitForFunction(() => !document.getElementById('mp2622Kd'));
  const rec2 = K.bacaKoleksi_(P, 'data').find(x => x.noKontrak === '003/SPM/WK-NK.KSO/PDBJ/2026');
  ok(rec2.items.length === 16 && rec2.versi === 2 && rec2.nilai === harap + 110000 && rec2.namaVendor === 'CV Maju Jaya', 'item ditambah pada draf: 16 item, versi 2, header tidak berubah');
  const lama = K.bacaKoleksi_(P, 'data').find(x => x.noKontrak === '001/SPM/WK-NK.KSO/PDBJ/2026');
  ok(lama.items.length === 2 && lama.versi === 1, 'kontrak lain tidak berubah');

  console.log('6. Tampilan');
  await pg.click('#mp2622Btn'); await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(200);
  const bx = await pg.evaluate(() => { const r = document.querySelector('.mp2622-dlg').getBoundingClientRect(), isi = document.querySelector('.mp2622-isi'), tb = document.querySelector('.mp2622-tb'); return { l: r.left, r: r.right, luap: isi.scrollWidth - isi.clientWidth, geser: tb.scrollWidth > tb.clientWidth }; });
  ok(bx.l >= 0 && bx.r <= 390 && bx.luap <= 1 && bx.geser, 'HP 390 px: dialog muat, tabel item digeser di dalamnya');
  await pg.keyboard.press('Escape'); ok(!(await pg.$('#mp2622Kd')), 'Esc menutup');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' uji UI 2.6.22');
})().catch(e => { console.error(e); process.exit(1); });
