// Uji Billing Generator 2.1.0: Master Data lokal dihapus → master (vendor, material, service) ditarik dari Monitoring SAP
// (Register Kontrak + master tambahan/pelengkap vendor baku) sebagai cache baca-saja. Server = kernel Code.gs 2.5.1 asli + modul 1.10.2.
//   KODE_GS=…/Code.gs node uji/ui_bg_master.js [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const D = path.join(__dirname, '..'), R = path.join(D, '..', 'asisten-ai-agen');
const { buatKonteks } = require(R + '/uji/harness.js');
const OUT = process.argv[2] || '';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const kirim = (n, p) => (a, x) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action: a, nama: n, pin: p, proyek: P }, x || {})) } }));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.2.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji master billing generator' }).ok);
assert.ok(STF('save', { data: { noKontrak: '091/SPKP/WK-NK.KSO/PDBJ/1726012/2026', jenisKontrak: 'SPKP', namaVendor: 'CV Mirsel', idVendor: '2100007777', tglKontrak: '2026-05-04', items: [{ kode: '39000010', uraian: 'Pekerjaan bekisting dermaga', vol: 1200, sat: 'M2', harga: 185000, wbs: 'C-01' }] } }).ok);
assert.ok(STF('save', { data: { noKontrak: '092/SPM/WK-NK.KSO/PDBJ/1726012/2026', jenisKontrak: 'SPM', namaVendor: 'PT Surya Salim', idVendor: '2100008888', tglKontrak: '2026-06-01', items: [{ kode: '1000003699', uraian: 'Frame Panel 2x2,6m', vol: 50, sat: 'SET', harga: 250000, wbs: '' }] } }).ok);
// pelengkap vendor baku (2.7.2): ID SAP sama dengan vendor Register
const pel = ADM('simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-V-UJI1', nama: 'CV Mirsel', satuan: '', keterangan: JSON.stringify({ kodeSAP: '2100007777' }), detail: { kodeSAP: '2100007777', alamat: 'Jl. Pelabuhan 9, Jakarta Utara', kota: 'Jakarta', npwp: '01.111.222.3-444.000', pimpinan: 'Budi', jabatan: 'Direktur', telp: '021-555' } } });
assert.ok(pel.ok, pel.error);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
(async () => {
  const br = await chromium.launch(), ctx = await br.newContext({ viewport: { width: 1366, height: 900 } });
  const pg = await ctx.newPage(), gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept());
  await ctx.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.host === 'bg.test') { const f = path.join(D, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname)); return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); }
    if (u.host === 'srv.test') return r.fulfill({ body: K.doPost({ postData: { contents: q.postData() } }), contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' } });
    return r.fulfill({ status: 204, body: '' });
  });
  await pg.goto('https://bg.test/index.html'); await pg.waitForSelector('#blPanel form');
  await pg.waitForFunction(() => typeof openMasterForm === 'function' && openMasterForm.__blTolak, null, { timeout: 10000 });
  // master lokal lama di perangkat (impor Excel versi 1.x)
  await pg.evaluate(async () => { await dbPutMasterItems([makeMasterItem('vendors', { code: '2100000001', name: 'Vendor Lokal Lama' }), makeMasterItem('materials', { code: 'LOK-1', name: 'Material Lokal Lama', unit: 'UN' })]); await loadMasterData(); renderMasterData(); });
  ok(await pg.evaluate(() => masterData.vendors.length === 1 && /Belum disinkronkan/.test(document.querySelector('.master-desc').textContent)), 'sebelum terhubung: master lama ditandai "Belum disinkronkan" (baca saja)');
  ok(await pg.evaluate(() => [...document.querySelectorAll('.master-actions .btn')].filter(b => b.offsetParent).map(b => b.textContent.trim()).join('|')) === '🔄 Sinkronkan dari Monitoring SAP|📤 Export Excel', 'tombol + Tambah, Import Excel, Kosongkan disembunyikan; tersisa Sinkronkan & Export');
  await pg.evaluate(() => openMasterForm(-1)); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('masterOverlay')).display === 'none'), 'form tambah/ubah master lokal tidak dapat dibuka');
  await pg.fill('#blUrl', 'https://srv.test/exec'); await pg.fill('#blNama', 'Staf Pengadaan'); await pg.fill('#blSandi', '1111'); await pg.fill('#blProyek', P);
  await pg.click('#blPanel button.btn-primary'); await pg.waitForSelector('#blPanel .bl-kpi');
  await pg.waitForFunction(() => { const i = blInfoMaster(); return i && i.jumlah.vendors >= 2; }, null, { timeout: 15000 });
  const m = await pg.evaluate(() => ({ v: masterData.vendors.map(x => x.code + '|' + x.name + '|' + x.address + '|' + x.npwp), mat: masterData.materials.map(x => x.code + '|' + x.name + '|' + x.unit + '|' + x.price), svc: masterData.services.map(x => x.code + '|' + x.name), lok: masterData.vendors.some(x => /Lokal Lama/.test(x.name)), info: blInfoMaster() }));
  ok(!m.lok && m.info.lokalDihapus === 2, 'master lokal lama dihapus dari perangkat (2 item)');
  ok(m.v.length === 2 && m.v.some(x => /^2100007777\|CV Mirsel\|Jl\. Pelabuhan 9, Jakarta Utara\|01\.111\.222\.3-444\.000$/.test(x)) && m.v.some(x => /^2100008888\|PT Surya Salim/.test(x)), 'vendor dari Register + pelengkap vendor baku (alamat & NPWP dari Monitoring SAP)');
  ok(m.mat.join() === '1000003699|Frame Panel 2x2,6m|SET|250000' && m.svc.join() === '39000010|Pekerjaan bekisting dermaga', 'material (kontrak SPM) & service (kontrak SPKP) dari item Register Kontrak');
  ok(await pg.evaluate(() => /Disinkronkan/.test(document.querySelector('.master-desc').textContent) && !document.getElementById('blSinkronMaster').disabled), 'status "✔ Disinkronkan … proyek" & tombol Sinkronkan aktif');
  // perubahan di Monitoring SAP → sinkron ulang
  assert.ok(STF('save', { data: { noKontrak: '093/SPSA/WK-NK.KSO/PDBJ/1726012/2026', jenisKontrak: 'SPSA', namaVendor: 'PT Alat Berat', idVendor: '2100009999', items: [{ kode: '49000001', uraian: 'Sewa crane 50T', vol: 2, sat: 'BLN', harga: 90000000 }] } }).ok);
  await pg.click('#blSinkronMaster'); await pg.waitForFunction(() => blInfoMaster().jumlah.vendors === 3, null, { timeout: 15000 });
  ok(await pg.evaluate(() => masterData.vendors.length === 3 && masterData.services.some(x => x.code === '49000001')), 'Sinkronkan ulang menarik data baru dari Monitoring SAP');
  ok(await pg.evaluate(() => typeof openCreate === 'function' && !!document.getElementById('docGrid')), 'mode dokumen lokal lama tetap berjalan');
  if (OUT) await pg.screenshot({ path: OUT + '/billing-generator-master-sap.png' });
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek master Billing Generator 2.1.0'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
