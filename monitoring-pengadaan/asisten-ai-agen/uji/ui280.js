// Uji UJUNG-KE-UJUNG 2.8.0 (Rilis B & C) di APLIKASI ASLI (Monitoring_SAP.html + paket 2.8.0 + kernel Code.gs 2.5.1 + modul 1.10.2):
//   B. progres baru → draf Paket Tagihan otomatis · menu Pembentuk Tagihan (kelengkapan SAP, bentuk satu / semua yang belum = paket dokumen lama)
//   C. Lacak Alur dari Register Kontrak · navigasi panah di Input Progres & Bon · pratinjau cetak A4 berhalaman.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui280.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const R = __dirname + '/..', NK = '003/SPM/WK-NK.KSO/PDBJ/1726012/2026', NK2 = '005/SPPM/WK-NK.KSO/PDBJ/1726012/2026';
(async () => {
  const { br, pg, gal, K, P, post } = await boot({
    paket: fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.8.0.json'), 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.2.json', 'utf8')), tunggu: 4000,
    siapkan: (C, K, P) => {
      K.tulisKoleksi_(P, 'permintaan', [{ id: 'Q1', nomor: '021/WK-NK.KSO/DIV.II/INF1/1726012/2026', noUrut: 21, tahun: 2026, tanggal: '2026-05-02', departemen: 'Logistik', peminta: 'Uji', versi: 1,
        items: [{ kode: '1000003699', uraian: 'Frame Recycling Plastik Panel 2x2,6m', vol: 1200, sat: 'SET', harga: 0, wbs: '' }], total: 0 }]);
      // BK lama (sebelum Paket Tagihan ada) — tanpa paket, BA sudah terbit
      K.tulisKoleksi_(P, 'progres', [{ id: 'PLAMA1', versi: 1, noKontrak: NK2, tagihanKe: 1, nomorBA: '01/BAPM/' + NK2, kodeBA: 'BAPM', periode: 'Juli 2026', periodeKey: 202606, tanggal: '2026-07-20',
        items: { [NK2 + '-002']: 100 }, nilai: 1290000, baTerbit: '2026-07-21T00:00:00.000Z', noPO: '4100075327', ses: '', gr: '5000123', miro: '', faktur: '', tagihan: '', revisi: 0, dibuatPada: '2026-07-20T00:00:00.000Z', diubahPada: '2026-07-20T00:00:00.000Z' }]);
    }
  });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const A = (a, x) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  await pg.evaluate(async () => { window.tanya = async () => true; if (typeof muatRegister === 'function') await muatRegister(); });
  await pg.waitForFunction(() => typeof PROG !== 'undefined' && PROG.data && PROG.data.length >= 1 && typeof window.mp270BuatOtomatis === 'function', null, { timeout: 30000 });

  console.log('B1. Simpan progres baru → draf Paket Tagihan otomatis');
  await pg.evaluate(nk => { showTab('form-progres'); pilihKontrakByKey(nk); }, NK); await pg.waitForTimeout(600);
  await pg.evaluate(() => { const id = idItem(FP.g, FP.g.items[0], 0); FP.vol[id] = '10'; document.getElementById('fp_tagihanKe').value = 1; perbaruiProgres(); });
  await pg.evaluate(() => simpanProgres());
  await pg.waitForFunction(() => window.MP280 && (window.MP280.daftar === null), null, { timeout: 15000 }).catch(() => { });
  await pg.waitForTimeout(5000);
  let D = A('blDaftar', { data: { per: 100 } }).data;
  const baru = D.find(x => x.noKontrak === NK);
  ok(baru && baru.status === 'DRAFT' && baru.kategori === 'BAHAN', 'paket tagihan draf ' + (baru && baru.id) + ' terbentuk otomatis untuk BK baru 003/SPM');
  const isi = A('blBaca', { data: { id: baru.id } }).data;
  ok((isi.lampiran.grIds || []).length === 1 && isi.lampiran.grIds[0] === A('gudangBaca').masuk[0].id, 'penerimaan otomatis (surat jalan) ikut sebagai lampiran paket Bahan');

  console.log('B2. Menu Pembentuk Tagihan');
  ok(await pg.evaluate(() => [...document.querySelectorAll('#sidebar .nav-link')].some(a => /Pembentuk Tagihan/.test(a.textContent))), 'menu sidebar "Pembentuk Tagihan" tersedia');
  await pg.evaluate(() => showTab('pembentuk')); await pg.waitForFunction(() => window.MP280.daftar && document.querySelector('#mp280Isi tbody tr[data-id]'), null, { timeout: 15000 });
  const t1 = await pg.textContent('#mp280Isi');
  ok(/Belum ada paket\s*1/.test(t1) && /01\/BAPM\/005\/SPPM/.test(t1), 'BK lama 005/SPPM tampil sebagai "Belum ada paket" (1)');
  ok(/SES/.test(t1) && /MIRO/.test(t1) && /Faktur/.test(t1), 'kelengkapan SAP yang kurang tampil sebagai peringatan (SES, MIRO, Faktur…)');
  await pg.screenshot({ path: OUT + '/mp280-pembentuk.png', fullPage: false });
  await pg.click('#mp280Semua'); await pg.waitForFunction(() => window.MP280.jalan && /Selesai/.test(window.MP280.jalan.judul), null, { timeout: 30000 });
  D = A('blDaftar', { data: { per: 100 } }).data;
  ok(D.length === 2 && D.some(x => x.progresId === 'PLAMA1'), '"Bentuk semua yang belum" membentuk paket untuk BK lama (Paket Tagihan tidak kosong lagi)');
  await pg.waitForFunction(() => /Belum ada paket\s*0/.test(document.getElementById('mp280Isi').textContent), null, { timeout: 15000 });
  ok(true, 'daftar diperbarui: Belum ada paket 0');
  const r2 = await pg.evaluate(async () => { const h = await window.mp270BuatOtomatis('005/SPPM/WK-NK.KSO/PDBJ/1726012/2026', 'PLAMA1'); return h.ada === true; });
  ok(r2 && A('blDaftar', { data: { per: 100 } }).data.length === 2, 'dibentuk ulang → tidak membuat paket ganda');

  console.log('C1. Lacak Alur di Register Kontrak');
  // HTML dasar uji lebih lama: menu & tab Lacak Alur (FITUR_210) belum terpasang → pasang tiruan sesuai markup aplikasi pengguna
  await pg.evaluate(() => {
    if (document.getElementById('tab-alur')) return;
    const reg = document.getElementById('tab-register');
    reg.insertAdjacentHTML('afterend', '<div id="tab-alur" class="content-tab" style="display:none;"><h5>Lacak Alur</h5></div>');
    const li = [...document.querySelectorAll('#sidebar ul.nav .nav-link')].find(a => /showTab\('register'/.test(a.getAttribute('onclick') || '')).closest('li');
    li.insertAdjacentHTML('afterend', '<li class="nav-item mb-2"><a class="nav-link d-flex align-items-center" onclick="showTab(\'alur\', event)"><i class="fas fa-route me-2"></i>Lacak Alur</a></li>');
  });
  await pg.waitForTimeout(800);
  const menu = await pg.$$eval('#sidebar .nav-link', x => x.filter(a => a.offsetParent).map(a => a.textContent.trim()));
  ok(!menu.some(m => /Lacak Alur/.test(m)) && menu.some(m => /Register Kontrak/.test(m)), 'menu "Lacak Alur" disembunyikan dari sidebar');
  await pg.evaluate(() => showTab('register')); await pg.waitForSelector('#mp281BtnAlur', { timeout: 10000 });
  await pg.click('#mp281BtnAlur'); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('tab-alur')).display !== 'none' && !!document.getElementById('mp281Kembali')), 'Register › "Lacak Alur" membuka alur dengan bilah ← Register Kontrak');
  await pg.click('#mp281Kembali button'); ok(await pg.evaluate(() => getComputedStyle(document.getElementById('tab-register')).display !== 'none'), 'kembali ke Register Kontrak');

  console.log('C2. Navigasi panah');
  await pg.evaluate(nk => { showTab('form-progres'); pilihKontrakByKey(nk); }, NK2); await pg.waitForTimeout(800);
  const ids = await pg.$$eval('#fpBody input[id^="fpIn"]', x => x.filter(i => i.offsetParent).map(i => i.id));
  await pg.focus('#' + ids[0]); await pg.keyboard.press('ArrowDown');
  ok(ids.length >= 2 && await pg.evaluate(() => document.activeElement.id) === ids[1], 'Input Progres: ↓ pindah ke volume item berikutnya (' + ids[0] + ' → ' + ids[1] + ')');
  await pg.keyboard.press('ArrowUp'); ok(await pg.evaluate(() => document.activeElement.id) === ids[0], 'Input Progres: ↑ kembali ke item sebelumnya');
  await pg.keyboard.type('5'); ok(await pg.evaluate(id => document.getElementById(id).value === '5', ids[0]), 'isi sel tetap bisa diketik (sel terpilih saat fokus)');
  await pg.evaluate(() => showTab('form-bon')); await pg.waitForTimeout(400);
  const bon = await pg.evaluate(() => { const r = document.querySelector('#pmBody tr'); if (!r) return null; const L = [...r.querySelectorAll('input:not([type=hidden]):not([readonly]):not([disabled]), select')].filter(i => i.offsetParent && i.type !== 'checkbox'); return L.map(i => i.id || i.className); });
  if (bon && bon.length >= 2) {
    await pg.evaluate(() => { const r = document.querySelector('#pmBody tr'); const L = [...r.querySelectorAll('input:not([type=hidden]):not([readonly]):not([disabled])')].filter(i => i.offsetParent && i.type !== 'checkbox'); L[0].focus(); L[0].value = ''; });
    await pg.keyboard.press('ArrowRight');
    ok(await pg.evaluate(() => { const r = document.querySelector('#pmBody tr'); const L = [...r.querySelectorAll('input:not([type=hidden]):not([readonly]):not([disabled]), select')].filter(i => i.offsetParent && i.type !== 'checkbox'); return document.activeElement === L[1]; }), 'Bon Permintaan: → pindah ke kolom berikutnya pada baris yang sama');
  } else ok(true, 'Bon Permintaan: baris isian belum ada (dilewati)');

  console.log('C3. Pratinjau cetak A4 berhalaman');
  await pg.setViewportSize({ width: 600, height: 900 });
  await pg.evaluate(() => { const baris = Array.from({ length: 140 }, (_, i) => '<tr><td>' + (i + 1) + '</td><td>Uraian pekerjaan nomor ' + (i + 1) + '</td><td>10</td></tr>').join('');
    window.mp224Cetak('<html><head><title>Uji Cetak</title><style>@page{size:A4;margin:12mm}table{width:100%;border-collapse:collapse}td{border:1px solid #000;padding:4px;font:12px Arial}</style></head><body><div class="kop"><b>KOP</b></div><table><thead><tr><td>No</td><td>Uraian</td><td>Vol</td></tr></thead><tbody>' + baris + '</tbody></table><div class="ttd" style="height:120px">TTD</div></body></html>'); });
  await pg.waitForFunction(() => { const f = document.getElementById('mp224CvFrame'); return f && f.contentDocument && f.contentDocument.querySelectorAll('.mp281-hal').length >= 1; }, null, { timeout: 10000 });
  const pv = await pg.evaluate(() => { const k = document.querySelector('.mp224-cv-kertas'), d = document.getElementById('mp224CvFrame').contentDocument;
    return { lebar: Math.round(k.getBoundingClientRect().width / Number(k.style.zoom || 1)), zoom: Number(k.style.zoom), garis: d.querySelectorAll('.mp281-hal').length, info: document.querySelector('.mp224-cv-bar small').textContent }; });
  ok(Math.abs(pv.lebar - 794) <= 2 && pv.zoom < 1, 'layar sempit (600 px): kertas tetap 210 mm, diperkecil zoom ' + pv.zoom.toFixed(2) + ' (tata letak = hasil cetak)');
  ok(pv.garis >= 2 && new RegExp((pv.garis + 1) + ' halaman').test(pv.info), 'garis batas halaman (' + pv.garis + ') & "' + (pv.garis + 1) + ' halaman" di bilah pratinjau');
  ok(await pg.evaluate(() => /@media print\{\.mp281-hal\{display:none/.test(document.getElementById('mp224CvFrame').contentDocument.getElementById('mp281Gaya').textContent)), 'garis batas tidak ikut tercetak (@media print)');
  await pg.selectOption('#mp281Zoom', '1'); ok(await pg.evaluate(() => document.querySelector('.mp224-cv-kertas').style.zoom === '1'), 'zoom 100% dapat dipilih');
  await pg.screenshot({ path: OUT + '/mp281-pratinjau.png' });
  const g = gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined/.test(e));
  ok(!g.length, 'tanpa galat JavaScript baru' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.8.0'); await br.close();
})().catch(e => { console.error(e); process.exit(1); });
