// Uji UJUNG-KE-UJUNG 2.9.3 di APLIKASI ASLI: Preview BA › "Unduh Excel" (format baku terisi nilai & nomor BA terkini, nilai rumus tersimpan)
// + Paket Tagihan › Pratinjau = format Excel baku.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui293.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js'), XLH = require('../sumber/xlsx-hitung.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const R = __dirname + '/..';
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const dekat = (a, b, t) => Math.abs(Number(a) - Number(b)) <= (t || 1);
(async () => {
  const b = await boot({ paket: fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.9.3.json'), 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), tunggu: 4000, sebelum: SEBELUM });
  const { pg, K, P, post } = b;
  const ADM = (a, x) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  const K2 = await pg.evaluate(() => {
    const V = it => Number(it.volumeEfektif ?? it.volume ?? it.volumeKontrak) || 0, H = it => Number(it.hargaSatuanEfektif ?? it.hargaSatuan) || 0;
    const ambil = (re, f) => RINGKASAN.find(g => re.test(g.key) && f(g));
    const spm = ambil(/\/SPM\//, g => g.items.filter(i => V(i) && H(i)).length >= 3 && g.items.filter(i => V(i) && H(i)).length <= 20);
    const bap = ambil(/\/(SPPP|SPK|SPKP)\//, g => g.items.some(i => !V(i) && !H(i)) && g.items.filter(i => V(i) && H(i)).length >= 3 && g.items.length <= 20);
    const info = g => ({ key: g.key, idVendor: g.idVendor || '', namaVendor: g.namaVendor || '', ids: g.items.map((it, i) => (V(it) && H(it)) ? [idItem(g, it, i), V(it)] : null).filter(Boolean) });
    return { spm: info(spm), bap: info(bap) };
  });
  const NPWP = '01.234.567.8-901.000';
  ADM('simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-V-UJI', nama: K2.spm.namaVendor, satuan: '', keterangan: JSON.stringify({ kodeSAP: K2.spm.idVendor }), detail: { kodeSAP: K2.spm.idVendor, alamat: 'Jl. Uji Format No. 1, Jakarta', npwp: NPWP, pimpinan: 'Direktur Uji', jabatan: 'Direktur Utama' } } });
  const bk = (id, k, ke, tgl, f) => ({ id, versi: 1, noKontrak: k.key, tagihanKe: ke, nomorBA: String(ke).padStart(2, '0') + (k.key.includes('/SPM/') ? '/BAPM/' : '/BAPP/') + k.key, periode: 'Uji', tanggal: tgl, baTerbit: tgl + 'T00:00:00.000Z',
    items: Object.fromEntries(k.ids.map(([i, v]) => [i, Math.round(v * f * 1000) / 1000])), nilai: 0, revisi: 0 });
  K.tulisKoleksi_(P, 'progres', [bk('U1', K2.spm, 1, '2026-08-10', 0.25), bk('U2', K2.spm, 2, '2026-09-10', 0.5), bk('U3', K2.bap, 1, '2026-08-12', 0.1), bk('U4', K2.bap, 2, '2026-09-12', 0.2)]);
  await pg.evaluate(async () => { await muatRegister(); await window.mp292MuatMaster(true); });

  console.log('A. Preview BA › Unduh Excel (nilai & nomor terkini)');
  await pg.evaluate(() => { showTab('form-progres'); }); await pg.waitForTimeout(400);
  ok(!(await pg.$('#mp292Btn')), 'tombol lama di Form Input Progres tidak ada lagi');
  for (const [k, id, berkas] of [[K2.spm, 'U2', 'terkini-spm.xlsx'], [K2.bap, 'U4', 'terkini-bap.xlsx']]) {
    await pg.evaluate(i => previewBAEntri(i), id); await pg.waitForSelector('#mp293BtnBA:not([hidden])', { timeout: 10000 });
    const ba = await pg.evaluate(() => { const h = hitungBA(); return { nomor: nomorBA(BA.urut, BA.kode, BA.g.key), bayar: h.bayar, pSd: h.pSd, kode: BA.kode }; });
    ok(await pg.evaluate(() => { const b = document.getElementById('mp293BtnBA'), c = b.nextElementSibling; return /cetakBA/.test(c.getAttribute('onclick') || ''); }), ba.kode + ': tombol "Unduh Excel" di samping "Cetak / Simpan PDF" pada Preview BA');
    if (berkas === 'terkini-spm.xlsx') await pg.screenshot({ path: OUT + '/mp293-preview-ba.png' });
    const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }), pg.click('#mp293BtnBA')]);
    await dl.saveAs(OUT + '/' + berkas);
    const W = await XLH.muat(new Uint8Array(fs.readFileSync(OUT + '/' + berkas))), v = (s, r) => { const o = W.byNama[s.toUpperCase()].sel.get(r); return o ? o.v : undefined; };
    if (ba.kode === 'BAPM') {
      ok(v('BAPM', 'A6') === 'Nomor : ' + ba.nomor, 'Excel BAPM bernomor BA terkini: ' + ba.nomor + ' (nilai tersimpan, tanpa perlu Enable Editing)');
      ok(dekat(v('BAPM', 'K135'), ba.bayar, 2), 'BAPM "jumlah pembayaran diterima" = nilai Preview BA (Rp ' + Math.round(ba.bayar).toLocaleString('id-ID') + ')');
      ok(v('INPUT', 'B26') === NPWP && /Kamis|Senin|Selasa|Rabu|Jumat|Sabtu|Minggu/.test(String(v('HELPER', 'S3'))), 'NPWP vendor dari Master Data & kalimat tanggal berbahasa Indonesia: "' + String(v('HELPER', 'S3')).slice(0, 60) + '…"');
    } else {
      ok(String(v('BAPP', 'B10')) === ba.nomor || String(v('DATA', 'B30')) === ba.nomor, 'Excel BAPP bernomor BA terkini: ' + ba.nomor);
      ok(dekat(Number(v('DATA', 'B42')) * 100, ba.pSd * 100, 0.05), 'prestasi s/d saat ini Excel ' + (Number(v('DATA', 'B42')) * 100).toFixed(2) + '% = Preview BA ' + (ba.pSd * 100).toFixed(2) + '%');
      ok(Number(v('lamp1', 'K41')) > 0 && /Rupiah/.test(String(v('lamp1', 'D46'))), 'lamp1: jumlah & terbilang tersimpan (' + String(v('lamp1', 'D46')).slice(0, 50) + '…)');
    }
    await pg.evaluate(() => tutupModalBA()); await pg.waitForTimeout(300);
  }

  console.log('B. Paket Tagihan › Pratinjau = format Excel baku');
  await pg.evaluate(k => window.mp270Buka(k, 'U2'), K2.spm.key);
  await pg.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /^Pratinjau$/.test(b.textContent.trim()) && !b.disabled), null, { timeout: 20000 });
  await pg.evaluate(() => [...document.querySelectorAll('button')].find(b => /^Pratinjau$/.test(b.textContent.trim())).click());
  await pg.waitForSelector('#mp293Frame:not([hidden])', { timeout: 30000 });
  const fr = await (await pg.$('#mp293Frame')).contentFrame(); await pg.waitForTimeout(800);
  const isi = await fr.evaluate(() => ({ hal: document.querySelectorAll('.xl-hal').length, sheet: [...new Set([...document.querySelectorAll('.xl-hal')].map(h => h.dataset.sheet))], teks: document.body.innerText }));
  ok(isi.sheet.join() === 'SPM,BAPM,BAP' && isi.hal >= 3, 'Pratinjau paket: sheet ' + isi.sheet.join(' · ') + ' (' + isi.hal + ' halaman A4)');
  ok(/BERITA ACARA PENERIMAAN MATERIAL/.test(isi.teks) && isi.teks.includes('02/BAPM/' + K2.spm.key) && isi.teks.includes(NPWP), 'isi pratinjau mengikuti format baku: judul BAPM, nomor BK-2 & NPWP vendor');
  await pg.screenshot({ path: OUT + '/mp293-pratinjau-paket.png' });
  await pg.evaluate(() => mp293PvLembar('BAPM')); await pg.waitForTimeout(300); await pg.screenshot({ path: OUT + '/mp293-pratinjau-bapm.png' });
  const [dl2] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }), pg.evaluate(() => mp293PvUnduh())]);
  ok(/^Master_SPM_02_BAPM_/.test(dl2.suggestedFilename()), 'Unduh Excel dari pratinjau paket: ' + dl2.suggestedFilename());
  await pg.evaluate(() => { mp293PvTutup(); mp270Pratinjau(undefined, true); }); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => !!document.getElementById('mp270Pv')), 'dokumen generator lama tetap dapat dibuka');
  const g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g.length, 'tanpa galat JavaScript' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.3');
})().catch(e => { console.error(e); process.exit(1); });
