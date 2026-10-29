// Uji UJUNG-KE-UJUNG 2.9.1 di APLIKASI ASLI: Register Kontrak › "Cheklis WBS" → hanya kontrak tanpa / kurang WBS → unduh Excel format CHEKLIS WBS TAGIHAN.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui291.js [folder-tangkapan]   (berkas hasil: <folder>/cheklis-wbs.xlsx; dicek uji/cek_cheklis_wbs.py)
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const R = __dirname + '/..';
const K1 = '091/SPSA/WK-NK.KSO/PDBJ/1726012/2026', K2 = '093/SPM/WK-NK.KSO/PDBJ/1726012/2026', K3 = '092/SPPP/WK-NK.KSO/PDBJ/1726012/2026', K4 = '094/SPM/WK-NK.KSO/PDBJ/1726012/2026';
const it = (kode, uraian, vol, harga, wbs) => ({ kode, uraian, vol, sat: 'Unit', harga, wbs: wbs || '' });
const siapkan = (C, K, P) => {
  K.tulisKoleksi_(P, 'data', [
    { id: 'R1', noKontrak: K1, namaVendor: 'Pulau Indah Dirgantara, PT', jenisKontrak: 'SPSA', tglKontrak: '2026-05-02', nilai: 123500000, items: [it('49000901', 'Trailer 12m', 1, 123500000)] },
    { id: 'R2', noKontrak: K2, namaVendor: 'Cahaya Utama Safety Indonesia, PT', jenisKontrak: 'SPM', tglKontrak: '2026-05-03', nilai: 1475000, items: [it('1800000466', 'Tali Tambang Plastik 2mm', 1, 875000, '1726012-01-22-40'), it('1600000055', 'Bendera Silang Merah Kuning (Semaphore)', 10, 60000)] },
    { id: 'R3', noKontrak: K3, namaVendor: 'Soilens, PT', jenisKontrak: 'SPPP', tglKontrak: '2026-05-04', nilai: 7600000, items: [it('', 'Index Properties', 0, 0), it('39002997', 'Specific Gravity Test', 8, 225000), it('39011841', 'Natural Density Test', 4, 950000)] },
    { id: 'R4', noKontrak: K4, namaVendor: 'Sudah Lengkap WBS, PT', jenisKontrak: 'SPM', tglKontrak: '2026-05-05', nilai: 500000, items: [it('1800000018', 'Mata Bor Besi', 1, 500000, '1726012-01-22-40')] }]);
};
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const b = await boot({ paket: fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.9.1.json'), 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), tunggu: 4000, siapkan, sebelum: SEBELUM });
  const pg = b.pg;
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); showTab('register'); });
  await pg.waitForSelector('#mp291Btn', { timeout: 15000 });
  ok(await pg.evaluate(() => !!document.querySelector('#tab-register #mp291Btn') || !!document.getElementById('mp291Btn').offsetParent), 'tombol "Cheklis WBS" di Register Kontrak');
  await pg.click('#mp291Btn'); await pg.waitForSelector('#mp291Lapis .mp291-tb');
  const daftar = await pg.$$eval('#mp291Lapis tbody .mp291-no', x => x.map(e => e.textContent));
  const cek = await pg.evaluate(L => { const M = new Map(window.semuaKontrak214().map(x => [x.key, x])); return L.every(k => M.get(k)) && !L.some(k => /\((\d+)\/\1\)/.test(document.querySelector('#mp291Lapis').textContent)); }, daftar);
  ok([K1, K2, K3].every(k => daftar.includes(k)) && !daftar.includes(K4) && cek, 'hanya kontrak tanpa / kurang WBS (' + daftar.length + ', termasuk kontrak Master); kontrak yang seluruh itemnya ber-WBS (094/SPM) tidak ikut');
  await pg.evaluate(L => { window.mp291Semua(false); L.forEach(k => window.mp291Pilih(k, true)); }, [K1, K2, K3]);
  ok(await pg.evaluate(() => /Unduh Excel \(3 kontrak\)/.test(document.getElementById('mp291Unduh').textContent)), 'kontrak dapat dipilih (3 dipilih)');
  ok(await pg.evaluate(() => /WBS belum lengkap \(1\/2\)/.test(document.getElementById('mp291Lapis').textContent) && /Belum Ada WBS/.test(document.getElementById('mp291Lapis').textContent)), 'keterangan: "Belum Ada WBS" / "WBS belum lengkap (1/2)"');
  await pg.screenshot({ path: OUT + '/mp291-dialog.png' });
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#mp291Unduh')]);
  ok(/^CHEKLIS_WBS_TAGIHAN_BULAN_[A-Z]+\.xlsx$/.test(dl.suggestedFilename()), 'nama berkas: ' + dl.suggestedFilename());
  await dl.saveAs(OUT + '/cheklis-wbs.xlsx');
  const g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g.length, 'tanpa galat JavaScript' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.1 (berkas: ' + OUT + '/cheklis-wbs.xlsx)');
})().catch(e => { console.error(e); process.exit(1); });
