// Uji UI 2.10.8 — ADDENDUM di dialog Kontrak multi-item / "Checklist banyak item → 1 PO" (blok MP2622 dari paket, tanpa HTML dasar).
// Kasus: 015/SPPP/WK-NK.KSO/PDBJ/1726012/2026 (KANE PERKASA INDONESIA, CV) → ADD1/015/SPPP/WK-NK.KSO/PDBJ/1726012/2026.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const js = JSON.parse(fs.readFileSync(path.join(__dirname, '..', process.argv[2] || 'pembaruan-2.10.8.json'), 'utf8')).js;
const a = js.indexOf('/* MP2622 — PEMBARUAN'), b = js.indexOf('/* MP270 — PEMBARUAN 2.7.0'); assert.ok(a > 0 && b > a);
const blok = js.slice(a, b), INDUK = '015/SPPP/WK-NK.KSO/PDBJ/1726012/2026';
(async () => {
  const br = await chromium.launch(), pg = await br.newPage(); const galat = []; pg.on('pageerror', e => galat.push(e.message));
  await pg.setContent(`<body><input id="regCari"><div class="row"><div><label>Tahun</label><input value="2026"></div><div><label>Bulan</label><input value="Agustus"></div><div><label>ID Vendor</label><input value="2100010716"></div><div><label>Nama Vendor</label><input value="KANE PERKASA INDONESIA, CV"></div>
    <div><label>Jenis Kontrak</label><input value="SPPP"></div><div><label>No Urut</label><input value="15"></div><div><label>Add.</label><input id="lamaAdd" value="1"></div><div><label>No Permintaan</label><input value=""></div><div><label>Item dari Permintaan</label></div></div></body>`);
  await pg.evaluate(INDUK => {
    window.REG = { sesi: { nama: 'M Yusuf Van Basten', admin: true, peran: 'PENGADAAN' }, data: [{ id: 'K15', noKontrak: INDUK, namaVendor: 'KANE PERKASA INDONESIA, CV', idVendor: '2100010716', status: 'POSTED', noPR: '1100045678', noRFQ: '6000012345', noPO: '4100076091', top: '30 hari', items: [{ kode: '3000001', uraian: 'Jasa cat ulang platform', vol: 100, sat: 'M2', harga: 50000, wbs: 'W.01', noPermintaan: '006/WK-NK.KSO/DIV.II/INF1/1726012/2026' }, { kode: '3000002', uraian: 'Mobilisasi', vol: 1, sat: 'LS', harga: 2000000, wbs: 'W.01' }] }, { id: 'K28', noKontrak: '028/SPPP/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'CV Lain', idVendor: '99', items: [] }] };
    window.PROYEK = { id: '1726012' }; window.NO_KONTRAK_TENGAH = 'WK-NK.KSO/PDBJ/1726012'; window.PMT = { data: [] };
    window.saranNoUrut = () => 29; window.noKontrakSudahAda = no => no === '020/SPPP/WK-NK.KSO/PDBJ/1726012/2026';
    window.RINGKASAN = [{ key: '020/SPPP/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'CV Master Jaya', idVendor: '2100099999', noPR: '1100000020', top: '14 hari', items: [{ kodeItem: '3000020', itemPekerjaan: 'Sewa crane', volumeKontrak: 10, satuan: 'JAM', hargaSatuan: 750000, wbs: 'W.02', noPO: '4100000020', noRFQ: '6000000020' }] }];
    window.__n = []; window.notif = (m, t) => window.__n.push([m, t]); window.__s = [];
    window.regAksi = async (ak, x) => { window.__s.push([ak, JSON.parse(JSON.stringify(x))]); return { ok: true, data: Object.assign({ id: 'BARU' }, x.data) }; };
    try { localStorage.clear(); } catch (e) { }
  }, INDUK);
  await pg.addScriptTag({ content: blok }); await pg.waitForTimeout(600);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const st = () => pg.evaluate(() => ({ no: document.getElementById('m22No').value, info: document.getElementById('m22NoInfo').textContent, merah: document.getElementById('m22No').classList.contains('is-invalid'), add: document.getElementById('m22Add').value, urut: document.getElementById('m22Urut').value }));
  await pg.evaluate(() => window.mp2622DariForm()); await pg.waitForTimeout(400);
  let s = await st();
  ok(s.no === 'ADD1/' + INDUK && !s.merah && /tersedia · addendum ke-1 atas 015\/SPPP.*KANE PERKASA/.test(s.info) && s.add === '1' && s.urut === '015', 'dari Form Input Kontrak (Add. = 1, No Urut 15): nomor ADD1/015/SPPP/… tersedia, tidak ditolak');
  const isi = () => pg.evaluate(() => ({ pr: [...document.querySelectorAll('#mp2622Kd input')].filter(i => /mp2622H\('(pr|rfq|po|top)'/.test(i.getAttribute('onchange') || '')).map(i => i.value), bon: !!document.getElementById('m22BonL'),
    rows: [...document.querySelectorAll('#mp2622Kd tbody tr')].map(tr => [...tr.querySelectorAll('input')].map(i => i.value).join('|')).filter(x => x.replace(/[|0]/g, '')) }));
  let d = await isi();
  ok(d.pr.join() === '1100045678,6000012345,4100076091,30 hari', 'addendum: No PR, RFQ, PO & TOP kontrak induk terisi otomatis');
  ok(d.rows.length === 2 && /3000001.*Jasa cat ulang platform.*100.*M2.*50000/.test(d.rows[0]) && !/006\/WK-NK/.test(d.rows.join()) && !d.bon, 'addendum: 2 item kontrak induk terbuka (panel Bon tidak dibuka; No Bon tidak ikut)');
  await pg.fill('#m22Add', ''); await pg.dispatchEvent('#m22Add', 'change'); s = await st();
  ok(s.no === INDUK && s.merah && /sudah dipakai \(KANE/.test(s.info), 'tanpa Add.: nomor 015 tetap ditolak (kontrak baru tidak boleh memakai nomor yang ada)');
  await pg.fill('#m22Add', '1'); await pg.dispatchEvent('#m22Add', 'change');
  await pg.fill('#m22Urut', '077'); await pg.dispatchEvent('#m22Urut', 'change'); s = await st();
  ok(s.merah && /kontrak induk 077\/SPPP.*belum ada/.test(s.info), 'addendum atas nomor yang belum ada → ditolak');
  await pg.fill('#m22Urut', '015'); await pg.dispatchEvent('#m22Urut', 'change');
  await pg.evaluate(() => { window.mp2622I(0, 'uraian', 'Pekerjaan tambah perkuatan'); window.mp2622I(0, 'vol', '2'); window.mp2622I(0, 'sat', 'LS'); window.mp2622I(0, 'harga', '1000000'); });
  await pg.evaluate(() => { window.mp2622Vendor('CV Lain'); window.mp2622H('idVendor', '99'); }); await pg.evaluate(() => window.mp2622Simpan()); await pg.waitForTimeout(300);
  ok((await pg.evaluate(() => window.__s.length)) === 0 && /vendor yang sama/.test(await pg.evaluate(() => (window.__n.slice(-1)[0] || [''])[0])), 'addendum dengan vendor berbeda dari kontrak induk → ditolak');
  await pg.evaluate(() => { window.mp2622Vendor('KANE PERKASA INDONESIA, CV'); window.mp2622H('idVendor', '2100010716'); }); await pg.evaluate(() => window.mp2622Simpan()); await pg.waitForTimeout(400);
  const kirim = await pg.evaluate(() => window.__s.filter(x => x[0] === 'save').map(x => x[1].data));
  ok(kirim.length === 1 && kirim[0].noKontrak === 'ADD1/' + INDUK && kirim[0].noUrut === 15 && kirim[0].jenisKontrak === 'SPPP' && !kirim[0].id && kirim[0].items.length === 2 && kirim[0].items[0].uraian === 'Pekerjaan tambah perkuatan' && kirim[0].noPO === '4100076091' && kirim[0].top === '30 hari', 'tersimpan sebagai kontrak BARU ADD1/015/SPPP/… (noUrut 15); kontrak induk tidak disentuh');
  await pg.evaluate(INDUK => { window.REG.data.push({ id: 'A1', noKontrak: 'ADD1/' + INDUK, namaVendor: 'KANE PERKASA INDONESIA, CV', idVendor: '2100010716', items: [] }); document.getElementById('lamaAdd').value = '1'; try { localStorage.clear(); } catch (e) { } window.mp2622DariForm(); }, INDUK); await pg.waitForTimeout(400);
  s = await st(); ok(s.merah && /sudah dipakai/.test(s.info), 'ADD1 yang sama tidak dapat dibuat dua kali');
  await pg.fill('#m22Add', '2'); await pg.dispatchEvent('#m22Add', 'change'); s = await st();
  ok(s.no === 'ADD2/' + INDUK && !s.merah, 'addendum berikutnya: ADD2/015/SPPP/… tersedia');
  await pg.evaluate(() => { document.getElementById('lamaAdd').value = ''; try { localStorage.clear(); } catch (e) { } window.mp2622DariForm(); }); await pg.waitForTimeout(400);
  s = await st(); ok(s.no === INDUK && s.merah, 'form tanpa Add.: perilaku lama tidak berubah');
  await pg.evaluate(() => { try { localStorage.clear(); } catch (e) { } window.mp2622Tutup(); window.mp2622Baru(); }); await pg.waitForTimeout(300);
  await pg.selectOption('#m22Jenis', 'SPPP'); await pg.fill('#m22Urut', '020'); await pg.dispatchEvent('#m22Urut', 'change'); await pg.fill('#m22Add', '1'); await pg.dispatchEvent('#m22Add', 'change'); await pg.waitForTimeout(300);
  d = await isi(); s = await st();
  ok(s.no === 'ADD1/020/SPPP/WK-NK.KSO/PDBJ/1726012/2026' && d.pr.join() === '1100000020,6000000020,4100000020,14 hari' && d.rows.length === 1 && /3000020.*Sewa crane.*10.*JAM.*750000/.test(d.rows[0]), 'kontrak induk di Master (bukan Register): header & item ikut terbuka saat Add. diisi di dialog');
  assert.deepStrictEqual(galat, []);
  console.log('UJI UI 2.10.8 ADDENDUM: ' + lulus + ' cek LULUS'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
