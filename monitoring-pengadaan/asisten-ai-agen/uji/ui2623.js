// Uji UI 2.6.23 di Chromium (blok MP2622 versi 2.6.23 + kernel/modul asli lewat harness, aksi "save"): PO dari Bon — sebagian & gabungan.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.6.json';
const { K, P } = require('./vt_data.js')();
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const STF = (a, x) => post(Object.assign({ action: a, nama: 'Staf Pengadaan', pin: '1111', proyek: P }, x || {}));
// kontrak lama: Besi D13 50 btg dari BON-007 (volume bon 80 → sisa 30)
let r = STF('save', { data: { noKontrak: '001/SPM/WK-NK.KSO/PDBJ/2026', jenisKontrak: 'SPM', namaVendor: 'CV Lama', tglKontrak: '2026-09-01', items: [{ kode: 'M-01', uraian: 'Semen Portland 50 kg', vol: 100, sat: 'sak', harga: 65000 }, { uraian: 'Besi beton D13', vol: 50, sat: 'btg', harga: 98000, noPermintaan: 'BON-007' }] } }); assert.ok(r.ok, r.error);
const PMT = [
  { nomor: 'BON-007', tanggal: '2026-10-20', keperluan: 'Pengecoran pile cap', wbs: 'B.2', items: [{ uraian: 'Besi beton D13', vol: 80, sat: 'btg' }, { uraian: 'Kawat bendrat', vol: 10, sat: 'kg' }, { uraian: 'Semen Portland 50 kg', vol: 40, sat: 'sak', wbs: 'B.3' }] },
  { nomor: 'BON-008', tanggal: '2026-10-21', keperluan: 'Bekisting', wbs: 'C.1', items: [{ uraian: 'Multiplek 12 mm', vol: 30, sat: 'lbr' }, { uraian: 'Paku 7 cm', vol: 20, sat: 'kg' }] },
  { nomor: 'BON-009', tanggal: '2026-10-22', keperluan: 'Drainase', wbs: 'D.1', items: [{ uraian: 'Pipa PVC 4 inch', vol: 12, sat: 'btg' }, { uraian: 'Genset 100 kVA', vol: 1, sat: 'unit', pbj: true }] }];
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.23.json', 'utf8')), BLOK = PK.js.slice(PK.js.indexOf('/* MP2622'), PK.js.indexOf('/* MP264 — PEMBARUAN'));
assert.ok(/2\.6\.23: PO dari Bon/.test(BLOK), 'blok MP2622 versi 2.6.23');
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
    window.noKontrakSudahAda = () => false; window.getVendorList = () => [{ id: '1000123', name: 'CV Maju Jaya' }];
    window.notif = (m, t) => (window.__n = window.__n || []).push([m, t]);
    window.regAksi = async (a, x) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama: 'Staf Pengadaan', pin: '1111', proyek: P }, x || {})))); if (!r.ok) throw new Error(r.error); return r; };
    window.muatRegister = async () => { REG.data = JSON.parse(await window.srvData()); document.getElementById('regBody').innerHTML = REG.data.map(r => `<tr><td>${r.noKontrak}</td><td>${r.namaVendor}</td><td></td></tr>`).join(''); };
    // tiruan status bawaan aplikasi: item "sudah" bila ada item kontrak ber-No Bon sama (berapa pun volumenya) atau tertaut PBJ
    window.statusKontrakPermintaan = p => { const sudah = p.items.map(it => !!it.pbj || (REG.data || []).some(k => (k.items || []).some(x => x.noPermintaan === p.nomor && x.uraian === it.uraian))); const n = sudah.filter(Boolean).length;
      return { kode: n === p.items.length ? 'selesai' : n ? 'sebagian' : 'belum', n, total: p.items.length, kontrak: [], sudah, alok: {} }; };
  }, [P, PMT]);
  await pg.evaluate(() => muatRegister());
  await pg.addScriptTag({ content: BLOK }); await pg.waitForSelector('#mp2622BtnBon');
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const n = () => pg.evaluate(() => (window.__n || []).map(x => x[0]));
  const bi = (nomor, i) => `.m22-bi:has(input[data-k="${nomor}#${i}"])`;
  const ambil = async (nomor, i, vol) => { await pg.check(bi(nomor, i) + ' input[type=checkbox]'); if (vol != null) { await pg.fill(bi(nomor, i) + ' input.r', String(vol)); await pg.press(bi(nomor, i) + ' input.r', 'Tab'); } };
  const sel = (r, c) => `.mp2622-tb tbody tr:nth-child(${r}) td:nth-child(${c}) input`;
  const rows = () => pg.evaluate(() => [...document.querySelectorAll('.mp2622-tb tbody tr')].map(t => ({ u: t.querySelector('td:nth-child(3) input').value, v: t.querySelector('td:nth-child(4) input').value, h: t.querySelector('td:nth-child(6) input').value, w: t.querySelector('td:nth-child(8) input').value, b: t.querySelector('td:nth-child(9)').textContent })).filter(x => x.u));
  async function header() { await pg.selectOption('#m22Jenis', 'SPM'); await pg.fill('.mp2622-g input[list=m22Vendor]', 'CV Maju Jaya'); await pg.press('.mp2622-g input[list=m22Vendor]', 'Tab'); }
  async function hargaKosong() { const L = await rows(); for (let i = 0; i < L.length; i++) if (!L[i].h) { await pg.fill(sel(i + 1, 6), '1.000'); await pg.press(sel(i + 1, 6), 'Tab'); } }
  async function simpan() { await pg.click('.mp2622-dlg footer .btn-primary'); await pg.waitForFunction(() => !document.getElementById('mp2622Kd')); }
  const status = nomor => pg.evaluate(nm => { const s = statusKontrakPermintaan(PMT.data.find(b => b.nomor === nm)); return { kode: s.kode, sudah: s.sudah, sisa: s.sisaPO || {}, kontrak: s.kontrak }; }, nomor);
  const lihat = new Set(K.bacaKoleksi_(P, 'data').map(x => x.id)), poBaru = () => { const x = K.bacaKoleksi_(P, 'data').find(x => !lihat.has(x.id)); if (x) lihat.add(x.id); return x; };

  console.log('1. Panel PO dari Bon');
  await pg.click('#mp2622BtnBon'); await pg.waitForSelector('.mp2622-bonl');
  ok(await pg.$$eval('.mp2622-bk', x => x.length) === 3, 'tombol "PO dari Bon" membuka dialog langsung di daftar bon (3 bon bersisa)');
  const t7 = await pg.textContent(bi('BON-007', 0));
  ok(/bon 80/.test(t7) && /sudah PO 50 \(001\/SPM/.test(t7) && /sisa 30/.test(t7), 'Besi D13: bon 80 · sudah PO 50 (no kontrak) · sisa 30');
  ok(await pg.$eval(bi('BON-009', 1) + ' input[type=checkbox]', x => x.disabled) && /sisa 0/.test(await pg.textContent(bi('BON-009', 1))), 'item yang sudah dikontrakkan lewat PBJ/Master (status bawaan) tidak dapat diambil');

  console.log('2. PO-1: sebagian dari BON-007');
  await ambil('BON-007', 0, 40);
  await pg.click('#m22AmbilBtn'); ok((await n()).some(m => /volume 40 melebihi sisa bon 30/.test(m)), 'volume di atas sisa → ditolak (40 > 30)');
  await ambil('BON-007', 0, 10); await ambil('BON-007', 2, 15);
  ok(await pg.textContent('#m22AmbilBtn') === 'Tambahkan 2 item ke PO', 'tombol menghitung item tercentang');
  await pg.click('#m22AmbilBtn'); await pg.waitForFunction(() => !document.querySelector('.mp2622-bonl'));
  let L = await rows();
  ok(L.length === 2 && L[0].u === 'Besi beton D13' && L[0].v === '10' && L[0].h === '98000' && L[0].w === 'B.2' && L[0].b === 'BON-007' && L[1].v === '15' && L[1].w === 'B.3', 'baris PO: volume sebagian, harga dari kontrak lalu, WBS & No Bon terisi');
  await header(); await simpan();
  const po1 = poBaru();
  ok(po1 && po1.items.length === 2 && po1.items.every(i => i.noPermintaan === 'BON-007') && po1.nilai === 10 * 98000 + 15 * 65000, 'PO-1 tersimpan (' + po1.noKontrak + '), nilai ' + po1.nilai.toLocaleString('id-ID'));
  let s = await status('BON-007');
  ok(s.kode === 'sebagian' && s.sudah.join() === 'false,false,false' && s.sisa[0] === 20 && s.sisa[2] === 25, 'menu Bon: BON-007 tetap "sebagian" — sisa Besi 20, Semen 25 (bukan "sudah")');

  console.log('3. PO-2: gabungan 3 bon → 1 PO');
  await pg.click('#mp2622BtnBon'); await pg.waitForSelector('.mp2622-bonl');
  ok(new RegExp('sudah PO 15 \\(' + po1.noKontrak.replace(/[./]/g, '\\$&') + '\\)').test(await pg.textContent(bi('BON-007', 2))) && /sisa 25/.test(await pg.textContent(bi('BON-007', 2))), 'Semen: sisa berkurang menjadi 25 setelah PO-1');
  await ambil('BON-007', 2, 15);
  await pg.click('.mp2622-bk:has(input[data-k="BON-008#0"]) summary button'); await ambil('BON-009', 0);
  await pg.click('#m22AmbilBtn'); await pg.waitForFunction(() => !document.querySelector('.mp2622-bonl'));
  L = await rows();
  ok(L.length === 4 && new Set(L.map(x => x.b)).size === 3 && L.find(x => x.u === 'Multiplek 12 mm').v === '30' && L.find(x => x.u === 'Pipa PVC 4 inch').v === '12', '4 item dari 3 bon; "pilih semua sisa" & volume kosong = seluruh sisa');
  ok((await n()).some(m => /4 item dari 3 bon ditambahkan/.test(m)), 'notifikasi ringkas jumlah item & bon');
  await header(); await hargaKosong(); await simpan();
  const po2 = poBaru(); ok(po2 && po2.items.length === 4 && new Set(po2.items.map(i => i.noPermintaan)).size === 3, 'PO-2 tersimpan (' + po2.noKontrak + ') berisi item 3 bon');
  ok((await status('BON-008')).kode === 'selesai' && (await status('BON-009')).kode === 'selesai', 'BON-008 & BON-009 selesai');

  console.log('4. PO-3: sisa terakhir BON-007 + validasi simpan');
  await pg.click('#mp2622BtnBon'); await pg.waitForSelector('.mp2622-bonl');
  ok(await pg.$$eval('.mp2622-bk', x => x.length) === 1, 'hanya BON-007 yang masih bersisa');
  await pg.click('.mp2622-bk summary button'); await pg.click('#m22AmbilBtn'); await pg.waitForFunction(() => !document.querySelector('.mp2622-bonl'));
  L = await rows();
  ok(L.map(x => x.u + '=' + x.v).join('|') === 'Besi beton D13=20|Kawat bendrat=10|Semen Portland 50 kg=10', 'pilih semua sisa: Besi 20, Kawat 10, Semen 10');
  await pg.fill(sel(3, 4), '11'); await pg.press(sel(3, 4), 'Tab'); await header(); await hargaKosong();
  await pg.click('.mp2622-dlg footer .btn-primary'); await pg.waitForTimeout(200);
  ok((await n()).some(m => /BON-007 · Semen Portland 50 kg: total PO 41 melebihi volume bon 40/.test(m)) && await pg.$('#mp2622Kd'), 'volume diubah di tabel melebihi bon → simpan ditolak');
  await pg.fill(sel(3, 4), '10'); await pg.press(sel(3, 4), 'Tab');
  await pg.screenshot({ path: OUT + '/po-dari-bon.png' });
  await simpan();
  s = await status('BON-007');
  ok(s.kode === 'selesai' && s.kontrak.length === 4, 'BON-007 selesai setelah 3 PO baru (+1 lama): ' + s.kontrak.join(', '));
  await pg.click('#mp2622BtnBon'); await pg.waitForSelector('.mp2622-bonl');
  ok(/Tidak ada bon dengan sisa item/.test(await pg.textContent('.mp2622-bonl')), 'semua bon habis → daftar kosong');
  await pg.check('.mp2622-cb input'); ok(await pg.$$eval('.mp2622-bk', x => x.length) === 3 && await pg.$$eval('.m22-bi input[type=checkbox]:not(:disabled)', x => x.length) === 0, '"tampilkan bon yang sudah habis": tampil, tidak dapat dicentang');
  await pg.fill('.mp2622-cari', 'pvc'); ok(await pg.$$eval('.mp2622-bk', x => x.length) === 1, 'cari bon berdasarkan item');

  console.log('5. Tampilan');
  await pg.fill('.mp2622-cari', ''); await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(200);
  const bx = await pg.evaluate(() => { const r = document.querySelector('.mp2622-dlg').getBoundingClientRect(), isi = document.querySelector('.mp2622-isi'); return { l: r.left, r: r.right, luap: isi.scrollWidth - isi.clientWidth }; });
  ok(bx.l >= 0 && bx.r <= 390 && bx.luap <= 1, 'HP 390 px: panel bon muat tanpa geser samping');
  await pg.screenshot({ path: OUT + '/po-dari-bon-hp.png' });
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' uji UI 2.6.23');
})().catch(e => { console.error(e); process.exit(1); });
