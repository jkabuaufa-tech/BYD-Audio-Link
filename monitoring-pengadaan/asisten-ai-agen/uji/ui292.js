// [2.9.3: tombol dipindah ke Preview BA — lihat ui293.js; uji ini untuk paket 2.9.2] Uji UJUNG-KE-UJUNG 2.9.2 di APLIKASI ASLI: Form Input Progres › "Excel Format Baku" (Master SPM untuk SPM/SPPM, BAP format untuk SPK/SPPP/SPKP)
// + NPWP vendor otomatis dari Master Data di Paket Tagihan.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui292.js [folder-tangkapan]
//   Berkas hasil: <folder>/format-spm.xlsx & <folder>/format-bap.xlsx (dicek uji/cek_format_baku.py setelah dihitung ulang LibreOffice).
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const R = __dirname + '/..';
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const b = await boot({ paket: fs.readFileSync(R + '/' + ('pembaruan-2.9.2.json'), 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), tunggu: 4000, sebelum: SEBELUM });
  const { pg, K, P, post } = b;
  const ADM = (a, x) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  // kontrak contoh dari data Master aplikasi: SPM ≥ 2 item & SPPP/SPK dengan judul + item ≤ 23 baris
  const K2 = await pg.evaluate(() => {
    const V = it => Number(it.volumeEfektif ?? it.volume ?? it.volumeKontrak) || 0, H = it => Number(it.hargaSatuanEfektif ?? it.hargaSatuan) || 0;
    const ambil = (re, f) => RINGKASAN.find(g => re.test(g.key) && f(g));
    const spm = ambil(/\/SPM\//, g => g.items.filter(i => V(i) && H(i)).length >= 3 && g.items.filter(i => V(i) && H(i)).length <= 20);
    const bap = ambil(/\/(SPPP|SPK|SPKP)\//, g => g.items.some(i => !V(i) && !H(i)) && g.items.filter(i => V(i) && H(i)).length >= 3 && g.items.length <= 20);
    const info = g => ({ key: g.key, idVendor: g.idVendor || '', namaVendor: g.namaVendor || '', ids: g.items.map((it, i) => (V(it) && H(it)) ? [idItem(g, it, i), V(it)] : null).filter(Boolean) });
    return { spm: info(spm), bap: info(bap) };
  });
  console.log('  kontrak uji: ' + K2.spm.key + ' (' + K2.spm.ids.length + ' item) · ' + K2.bap.key + ' (' + K2.bap.ids.length + ' item)');
  const NPWP = '01.234.567.8-901.000';
  assert.ok(ADM('simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-V-UJI', nama: K2.spm.namaVendor, satuan: '', keterangan: JSON.stringify({ kodeSAP: K2.spm.idVendor }), detail: { kodeSAP: K2.spm.idVendor, alamat: 'Jl. Uji Format No. 1, Jakarta', npwp: NPWP, pimpinan: 'Direktur Uji', jabatan: 'Direktur Utama', email: 'uji@vendor.test' } } }).ok);
  const bk = (id, k, ke, tgl, f) => ({ id, versi: 1, noKontrak: k.key, tagihanKe: ke, nomorBA: String(ke).padStart(2, '0') + (k.key.includes('/SPM/') ? '/BAPM/' : '/BAPP/') + k.key, periode: 'Uji', tanggal: tgl, baTerbit: tgl + 'T00:00:00.000Z',
    items: Object.fromEntries(k.ids.map(([i, v]) => [i, Math.round(v * f * 1000) / 1000])), nilai: 0, revisi: 0 });
  K.tulisKoleksi_(P, 'progres', [bk('U1', K2.spm, 1, '2026-08-10', 0.25), bk('U2', K2.spm, 2, '2026-09-10', 0.5), bk('U3', K2.bap, 1, '2026-08-12', 0.1), bk('U4', K2.bap, 2, '2026-09-12', 0.2)]);
  await pg.evaluate(async () => { await muatRegister(); await window.mp292MuatMaster(true); });

  console.log('A. Excel format baku dari Form Input Progres');
  for (const [k, berkas, judul] of [[K2.spm, 'format-spm.xlsx', 'Master SPM'], [K2.bap, 'format-bap.xlsx', 'BAP format']]) {
    await pg.evaluate(key => { showTab('form-progres'); pilihKontrakByKey(key); }, k.key); await pg.waitForTimeout(700);
    await pg.waitForSelector('#mp292Btn', { timeout: 10000 }); await pg.click('#mp292Btn'); await pg.waitForSelector('#mp292Lapis');
    ok(await pg.evaluate(j => document.getElementById('mp292Jdl').textContent.includes(j) && document.querySelectorAll('#mp292Lapis input[name="mp292Bk"]').length === 2, judul), k.key.split('/')[1] + ': dialog ' + judul + ' dengan 2 BK, BK terakhir terpilih');
    if (berkas === 'format-spm.xlsx') await pg.screenshot({ path: OUT + '/mp292-dialog.png' });
    const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 20000 }), pg.click('#mp292Unduh')]);
    await dl.saveAs(OUT + '/' + berkas);
    ok(/\.xlsx$/.test(dl.suggestedFilename()) && fs.statSync(OUT + '/' + berkas).size > 100000, 'unduh ' + dl.suggestedFilename());
  }

  console.log('B. NPWP vendor otomatis di Paket Tagihan');
  ok(await pg.evaluate(k => (window.profilVendor(k.idVendor, k.namaVendor) || {}).npwp, K2.spm) === NPWP, 'profil vendor membawa NPWP dari Master Data › Vendor');
  await pg.evaluate(k => window.mp270Buka(k.key, 'U2'), K2.spm);
  await pg.waitForFunction(() => [...document.querySelectorAll('label')].some(l => /NPWP vendor/.test(l.textContent)), null, { timeout: 15000 });
  const npwp = await pg.evaluate(() => { const l = [...document.querySelectorAll('label')].find(x => /NPWP vendor/.test(x.textContent)); return l && l.querySelector('input').value; });
  ok(npwp === NPWP, 'Paket Tagihan: kolom NPWP vendor terisi otomatis (' + npwp + ')');
  await pg.screenshot({ path: OUT + '/mp292-paket-npwp.png' });
  const g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g.length, 'tanpa galat JavaScript' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  fs.writeFileSync(OUT + '/format-uji.json', JSON.stringify({ spm: K2.spm, bap: K2.bap, npwp: NPWP }));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.2');
})().catch(e => { console.error(e); process.exit(1); });
