// Uji UI 2.6.24 di Chromium: Form Input Kontrak lama (tiruan sesuai tampilan aplikasi) › "Checklist banyak item → 1 PO" → dialog multi-item terisi dari form, simpan lewat kernel "save".
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.6.json';
const { K, P } = require('./vt_data.js')();
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const NB = '007/WK-NK.KSO/DIV.II/INF1/1726012/2026';
const PMT = [{ nomor: NB, tanggal: '2026-10-01', keperluan: 'Operasional', peminta: 'Arifin', items: [['1600000492', 'Tabung gas LPG 50kg', 1, 'UN'], ['1800000338', 'Tabung Oksigen', 2, 'UN'], ['1800000043', 'Selang Blender', 24, 'SET'], ['1800000524', 'Regulator Oxygen', 1, 'SET'], ['1800000273', 'Cutting Tip No. 1,2,3', 2, 'SET']].map(([kode, uraian, vol, sat]) => ({ kode, uraian, vol, sat })) },
  { nomor: '008/WK-NK.KSO/DIV.II/INF1/1726012/2026', tanggal: '2026-10-02', items: [{ kode: '1800000999', uraian: 'Kawat las RB 2,6', vol: 5, sat: 'KG' }] }];
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.24.json', 'utf8')), BLOK = PK.js.slice(PK.js.indexOf('/* MP2622'), PK.js.indexOf('/* MP264 — PEMBARUAN'));
const f = (l, inp) => `<div class="col"><label class="form-label">${l}</label>${inp}</div>`;
const FORM = `<style>.sembunyi{display:none!important}</style><div id="tab-input" class="sembunyi" style="padding:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
  ${f('Tahun', '<select class="form-select"><option>2025</option><option selected>2026</option></select>')}${f('Bulan', '<select class="form-select"><option>September</option><option selected>Oktober</option></select>')}
  ${f('ID Vendor <span class="text-muted">(otomatis)</span>', '<input class="form-control" value="2100004523" readonly>')}${f('Nama Vendor', '<input class="form-control" value="Gema Teknik Gemilang,Cv">')}
  ${f('Jenis Kontrak', '<select class="form-select"><option value="">-</option><option selected>SPM</option></select>')}${f('No Urut', '<input class="form-control" value="63"><small>Berikutnya: 063</small>')}
  ${f('No Kontrak <span>(otomatis)</span>', '<input class="form-control" value="063/SPM/WK-NK.KSO/PDBJ/1726012/2026" readonly>')}${f('No Urut Permintaan', '<input class="form-control" value="07">')}
  ${f('No Permintaan <span>(otomatis)</span>', '<input class="form-control" value="' + NB + '" readonly>')}
  <div class="col"><label class="form-label">Item dari Permintaan</label><div id="chips"><button class="btn">1800000273 Cutting Tip No. 1,2,3 · 2 SET</button></div></div>
  ${f('Kode Material', '<input class="form-control" value="1800000273">')}${f('Item Pekerjaan', '<input class="form-control" value="Cutting Tip No. 1,2,3">')}</div>
  <div style="display:none">${f('Nama Vendor', '<input value="SALAH-TAB-TERSEMBUNYI">')}<label>Item dari Permintaan</label></div>`;
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  await pg.exposeFunction('srvData', () => JSON.stringify(K.bacaKoleksi_(P, 'data')));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0}.btn{border:1px solid #ccc;border-radius:6px;padding:3px 8px;background:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-close::after{content:'×'}.form-control,.form-select{width:100%;box-sizing:border-box;padding:3px 5px}.col{display:grid}</style><style>${PK.css}</style></head><body>${FORM}</body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(([P, PMT]) => {
    window.PROYEK = { id: P }; window.REG = { url: 'x', sesi: { nama: 'Joko Supriyono', pin: '1234', peran: 'PENGADAAN', admin: true, proyek: P }, data: [] }; window.PMT = { data: PMT }; window.RINGKASAN = [];
    window.NO_KONTRAK_TENGAH = 'WK-NK.KSO/PDBJ/1726012'; window.KELOMPOK_MAP = { SPM: 'BAHAN' }; window.saranNoUrut = () => 63; window.noKontrakSudahAda = () => false;
    window.getVendorList = () => [{ id: '2100004523', name: 'Gema Teknik Gemilang,Cv' }]; window.notif = (m, t) => (window.__n = window.__n || []).push([m, t]);
    window.regAksi = async (a, x) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {})))); if (!r.ok) throw new Error(r.error); return r; };
    window.muatRegister = async () => { REG.data = JSON.parse(await window.srvData()); };
  }, [P, PMT]);
  await pg.evaluate(() => muatRegister());
  await pg.addScriptTag({ content: BLOK }); await pg.waitForTimeout(600);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  ok(!(await pg.$('.mp2624-ajak')), 'form tertutup: belum ada tombol');
  await pg.evaluate(() => document.getElementById('tab-input').classList.remove('sembunyi')); await pg.mouse.click(5, 880); await pg.waitForSelector('.mp2624-ajak button');
  ok(await pg.$$eval('.mp2624-ajak', x => x.length) === 1 && await pg.evaluate(() => document.querySelector('.mp2624-ajak').previousElementSibling.textContent === 'Item dari Permintaan'), 'Form Input Kontrak: tombol "Checklist banyak item → 1 PO" tepat di bawah "Item dari Permintaan" (muncul saat tab form dibuka; sekali, bukan di tab tersembunyi)');
  await pg.evaluate(() => document.body.appendChild(document.createElement('i'))); await pg.waitForTimeout(600);
  ok(await pg.$$eval('.mp2624-ajak', x => x.length) === 1, 'tidak dobel saat halaman berubah');
  await pg.screenshot({ path: OUT + '/form-lama-checklist.png', clip: { x: 0, y: 0, width: 1360, height: 300 } });
  await pg.click('.mp2624-ajak button'); await pg.waitForSelector('.mp2622-bonl');
  const h = await pg.evaluate(() => [...document.querySelectorAll('.mp2622-g input, .mp2622-g select')].map(i => i.value).join(' | '));
  ok(/SPM/.test(h) && /2026/.test(h) && /Oktober/.test(h) && /063\/SPM\/WK-NK\.KSO\/PDBJ\/1726012\/2026/.test(h) && /Gema Teknik Gemilang,Cv/.test(h) && /2100004523/.test(h) && !/SALAH/.test(h), 'header terisi dari form: SPM · 2026 · Oktober · 063 · vendor & ID');
  ok(await pg.$$eval('.mp2622-bk', x => x.length) === 1 && await pg.$$eval('.m22-bi', x => x.length) === 5, 'langsung menampilkan bon 007 (5 item) untuk dicentang');
  for (const i of [0, 1, 4]) await pg.check(`.m22-bi input[type=checkbox][data-k="${NB}#${i}"]`);
  await pg.fill(`.m22-bi input.r[data-k="${NB}#1"]`, '1'); await pg.press(`.m22-bi input.r[data-k="${NB}#1"]`, 'Tab');
  await pg.click('#m22AmbilBtn'); await pg.waitForFunction(() => !document.querySelector('.mp2622-bonl'));
  const L = await pg.evaluate(() => [...document.querySelectorAll('.mp2622-tb tbody tr')].map(t => [t.querySelector('td:nth-child(2) input').value, t.querySelector('td:nth-child(4) input').value]).filter(x => x[0]));
  ok(L.map(x => x.join('=')).join('|') === '1600000492=1|1800000338=1|1800000273=2', '3 item tercentang masuk tabel (Tabung Oksigen sebagian: 1 dari 2)');
  for (let r = 1; r <= 3; r++) { const s = `.mp2622-tb tbody tr:nth-child(${r}) td:nth-child(6) input`; await pg.fill(s, '150.000'); await pg.press(s, 'Tab'); }
  await pg.screenshot({ path: OUT + '/form-lama-dialog.png' });
  await pg.click('.mp2622-dlg footer .btn-primary'); await pg.waitForFunction(() => !document.getElementById('mp2622Kd'));
  const rec = K.bacaKoleksi_(P, 'data').find(x => x.noKontrak === '063/SPM/WK-NK.KSO/PDBJ/1726012/2026');
  ok(rec && rec.items.length === 3 && rec.namaVendor === 'Gema Teknik Gemilang,Cv' && rec.idVendor === '2100004523' && rec.items.every(i => i.noPermintaan === NB) && rec.nilai === 4 * 150000, '1 PO tersimpan: 3 item, nilai Rp 600.000, No Bon per item');
  await pg.click('.mp2624-ajak button'); await pg.waitForSelector('.mp2622-bonl');
  const t = await pg.textContent(`.m22-bi:has(input[data-k="${NB}#1"])`);
  ok(/sudah PO 1/.test(t) && /sisa 1/.test(t) && await pg.$eval(`.m22-bi input[type=checkbox][data-k="${NB}#0"]`, x => x.disabled), 'dibuka lagi: Tabung Oksigen sisa 1 (tetap di bon), item yang sudah PO penuh tidak bisa dicentang');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' uji UI 2.6.24');
})().catch(e => { console.error(e); process.exit(1); });
