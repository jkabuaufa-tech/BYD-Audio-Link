// Uji ujung-ke-ujung MP298 (2.9.8) di Chromium: blok asli MP292 · XLH · XLR · MP293 · MP296 · MP298 dari pembaruan-2.9.8.json,
// server = kernel Code.gs 2.5.1 ASLI + modul 1.10.4 (harness). Simpan BK → Excel tersusun & tersimpan di arsip → diperiksa sel per sel.
//   KODE_GS=/tmp/Code.gs NODE_PATH=$(npm root -g) node tagihan/uji/ui298.js   (berkas hasil: /tmp/ui298/*.xlsx untuk diperiksa openpyxl)
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const { chromium } = require('playwright');
const R = __dirname + '/../../asisten-ai-agen', OUT = '/tmp/ui298';
const { buatKonteks } = require(R + '/uji/harness.js');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
fs.mkdirSync(OUT, { recursive: true });

const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
require('./drive_biner.js')(C, K, P);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const post = o => K.doPost({ postData: { contents: JSON.stringify(o) } });
const kirim = (nama, pin) => (action, x) => JSON.parse(post(Object.assign({ action, nama, pin, proyek: P }, x || {})));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.4.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji ui 2.9.8 backup' }).ok);

// kontrak: SPPP (BAP format) & SPM (Master SPM)
const SPPP = '134/SPPP/WK-NK.KSO/PDBJ/1726012/2026', SPM = '047/SPM/WK-NK.KSO/PDBJ/1726012/2026';
const itSPPP = [['Galian Tanah (Exca Std+Miting)', 39302, 'M3', 16000], ['Galian Tanah (Exca Long Arm)', 49088, 'M3', 21000], ['Mobilisasi dan Demobilisasi', 8, 'Unit', 67000000]];
const itSPM = [['Semen Portland 50 kg', 200, 'Sak', 75000], ['Besi Beton D16', 120, 'Btg', 180000], ['Paku Beton 3"', 10, 'Dus', 45000], ['Kawat Bendrat', 30, 'Kg', 25000], ['Pasir Beton', 20, 'M3', 350000]];
const simpanReg = (no, jenis, vendor, idV, items, pek) => { const r = STF('save', { data: { noKontrak: no, jenisKontrak: jenis, namaVendor: vendor, idVendor: idV, namaPekerjaan: pek, tglKontrak: '2026-06-30', tglSelesai: '2026-12-31', noPO: '41000770' + no.slice(0, 2), items: items.map(x => ({ kode: '39000001', uraian: x[0], vol: x[1], sat: x[2], harga: x[3] })) } }); assert.ok(r.ok, r.error); assert.ok(STF('posting', { id: r.data.id, versi: r.data.versi }).ok); };
simpanReg(SPPP, 'SPPP', 'CV Rizki Kurnia', '2100009999', itSPPP, 'Pekerjaan Galian Tanah Dermaga');
simpanReg(SPM, 'SPM', 'PT Surya Salim Sejahtera', '2100008888', itSPM, '');
assert.ok(STF('blKonfigSimpan', { data: { noKontrak: SPPP, versi: 0, konfig: { kategori: 'SUBKON', uangMukaPersen: 20, retensiPersen: 5, ppn: { skema: 'NILAI_LAIN', tarif: 12 }, pph: { jenis: 'PPh 4(2)', tarif: 1.75 } } } }).ok);
// BK termin 1 SPPP sudah ada (dibuat sebelum 2.9.8, tanpa backup)
const bk1 = STF('saveProgres', { data: { noKontrak: SPPP, periode: 'Juli 2026', periodeKey: 202607, tanggal: '2026-07-28', tagihanKe: 1, kodeBA: 'BAPP', items: { [SPPP + '#0']: 10000, [SPPP + '#2']: 4 }, nilai: 428000000 } }).data;
const g = (no, vendor, idV, items, pek) => ({ key: no, namaVendor: vendor, idVendor: idV, nilai: items.reduce((a, x) => a + x[1] * x[3], 0), tglMulai: '2026-06-30', tglSelesai: '2026-12-31', namaPekerjaan: pek,
  items: items.map(x => ({ itemPekerjaan: x[0], satuan: x[2], volume: x[1], hargaSatuan: x[3] })) });
const RINGKASAN = [g(SPPP, 'CV Rizki Kurnia', '2100009999', itSPPP, 'Pekerjaan Galian Tanah Dermaga'), g(SPM, 'PT Surya Salim Sejahtera', '2100008888', itSPM, '')];

const js = JSON.parse(fs.readFileSync(R + '/pembaruan-2.9.8.json', 'utf8')).js, css = JSON.parse(fs.readFileSync(R + '/pembaruan-2.9.8.json', 'utf8')).css;
const potong = (a, b) => { const i = js.indexOf('\n' + a), j = js.indexOf('\n' + b); assert.ok(i > 0 && j > i, a); return js.slice(i, j); };
const blok = potong('/* MP292', '/* MP297') + potong('/* MP298', '/* MP264');

(async () => {
  const br = await chromium.launch(), pg = await br.newPage({ acceptDownloads: true });
  const log = []; pg.on('console', m => { if (m.type() === 'error' || /MP29/.test(m.text())) log.push(m.text()); }); pg.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  await pg.exposeFunction('__srv', body => post(JSON.parse(body)));
  // konteks aman (https) seperti aplikasi terpasang → crypto.subtle tersedia
  await pg.route('https://uji.lokal/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body><main><div id="mp280Isi"></div></main></body></html>' }));
  await pg.goto('https://uji.lokal/index.html');
  await pg.evaluate(({ RINGKASAN, bk1 }) => {
    window.__notif = []; window.notif = (m, t) => window.__notif.push([t, m]);
    window.RINGKASAN = RINGKASAN; window.PROG = { data: [bk1] };
    window.REG = { url: 'harness', sesi: { nama: 'Staf Pengadaan', pin: '1111', peran: 'PENGADAAN', proyek: 'P' }, data: [] };
    window.PROYEK = { id: 'P', namaLengkap: 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' };
    window.idItem = (g, it, i) => it.kodeUnik || g.key + '#' + i; window.volItem = it => Number(it.volume) || 0; window.hargaItem = it => Number(it.hargaSatuan) || 0;
    window.profilVendor = (id) => id === '2100009999' ? { nama: 'Rizki Kurniawan', jabatan: 'Direktur', alamat: 'Jl. Melati No. 5, Jakarta Utara', npwp: '01.234.567.8-901.000' } : { nama: 'Salim', jabatan: 'Direktur Utama', alamat: 'Jl Krekot Jaya Blok D No. 1, Jakarta', npwp: '02.111.222.3-444.000' };
    window.mp220Srv = f => ['paketTagihan', 'paketTagihanExcel'].indexOf(f) >= 0;
    window.regPost = async o => JSON.parse(await window.__srv(JSON.stringify(Object.assign({}, o, { proyek: o.proyek === 'P' ? undefined : o.proyek }))));
    window.regAksi = async (a, x) => { const r = await window.regPost(Object.assign({ action: a, nama: REG.sesi.nama, pin: REG.sesi.pin }, x || {})); if (!r.ok) throw new Error(r.error);
      if (a === 'saveProgres' && r.data && r.data.id) { const i = PROG.data.findIndex(e => e.id === r.data.id); if (i >= 0) PROG.data[i] = r.data; else PROG.data.push(r.data); } return r; };
  }, { RINGKASAN, bk1 });
  await pg.evaluate(p => { window.__P = p; const f = window.regPost; window.regPost = o => f(Object.assign({}, o, { proyek: p })); }, P);
  await pg.addScriptTag({ content: blok });
  const tunggu = async (fn, ms, pesan) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { const v = await pg.evaluate(fn); if (v) return v; await pg.waitForTimeout(250); } throw new Error('waktu habis: ' + pesan + '\n' + log.join('\n') + '\n' + JSON.stringify(await pg.evaluate(() => window.__notif))); };
  const simpanXlsx = (nama, id) => { const b = Buffer.from(C.__files[id].data, 'latin1'); fs.writeFileSync(OUT + '/' + nama, b); return b; };
  const sheet = s => C.__sheets[P + s];

  console.log('A. Simpan BK termin 2 SPPP → Excel BAP format otomatis tersimpan di arsip');
  await pg.evaluate(SPPP => regAksi('saveProgres', { data: { noKontrak: SPPP, periode: 'Agustus 2026', periodeKey: 202608, tanggal: '2026-08-28', tagihanKe: 2, kodeBA: 'BAPP', items: { [SPPP + '#0']: 5000, [SPPP + '#1']: 12000 }, nilai: 332000000 } }), SPPP);
  await tunggu(() => window.__notif.some(n => /Backup Excel .* tersimpan/.test(n[1]) || /belum tersimpan/.test(n[1])), 60000, 'backup BK2');
  const n1 = await pg.evaluate(() => window.__notif.map(n => n[1]).join(' | ')); ok(/Backup Excel BAP_Pekerjaan_Galian_Tanah_Dermaga_CV_Rizki_Kurnia_Termin-2\.xlsx tersimpan di 134 SPPP CV Rizki Kurnia\/Kelengkapan/.test(n1), 'notifikasi: ' + n1.slice(0, 140));
  let rows = sheet('_BackupExcelTagihan').rows; ok(rows.length === 2 && rows[1][14] === 'SIMPAN_BK' && rows[1][4] === 2, 'sheet _BackupExcelTagihan: termin 2 · sumber SIMPAN_BK');
  simpanXlsx('sppp_termin2.xlsx', rows[1][8]);

  console.log('B. Terbitkan BA (saveProgres terbit) → backup diperbarui / dipakai ulang tanpa ganda');
  const id2 = await pg.evaluate(() => PROG.data[1].id);
  await pg.evaluate(id => { const e = PROG.data.find(x => x.id === id); return regAksi('saveProgres', { data: { id: e.id, versi: e.versi, terbit: true } }); }, id2);
  await tunggu(() => window.__notif.filter(n => /Backup Excel .* tersimpan/.test(n[1])).length >= 2, 60000, 'backup terbit');
  rows = sheet('_BackupExcelTagihan').rows; ok(rows.length >= 2 && rows.filter(r => r[15] === 'AKTIF' && r[2] === id2).length === 1, 'tepat 1 backup AKTIF untuk BK termin 2 (' + (rows.length - 1) + ' baris riwayat)');
  const akt = rows.filter(r => r[15] === 'AKTIF' && r[2] === id2)[0]; simpanXlsx('sppp_termin2_terbit.xlsx', akt[8]);

  console.log('C. SPM: simpan BK (2 material terealisasi) → Master SPM, narasi BAP min. 3 item urut nilai');
  await pg.evaluate(SPM => regAksi('saveProgres', { data: { noKontrak: SPM, periode: 'Agustus 2026', periodeKey: 202608, tanggal: '2026-08-27', tagihanKe: 1, kodeBA: 'BAPM', items: { [SPM + '#0']: 100, [SPM + '#3']: 30 }, nilai: 8250000 } }), SPM);
  await tunggu(() => window.__notif.some(n => /BAP_Pengadaan_.*_Termin-1\.xlsx tersimpan di 047 SPM PT Surya Salim Sejahtera\/Kelengkapan/.test(n[1])), 60000, 'backup SPM');
  rows = sheet('_BackupExcelTagihan').rows; const spm = rows.filter(r => r[3] === SPM)[0]; ok(!!spm && spm[6] === 'spm', 'backup SPM tersimpan: ' + spm[7]);
  simpanXlsx('spm_termin1.xlsx', spm[8]);

  console.log('D. Dialog Paket Tagihan: tombol Unduh Excel Backup · Pratinjau & Cetak PDF · Susun ulang');
  await pg.evaluate(({ SPPP, id2 }) => {
    const d = document.createElement('div'); d.id = 'mp270Dlg'; d.innerHTML = '<div class="kaki"><button class="btn" onclick="mp270Pratinjau()">Pratinjau</button></div>'; document.body.appendChild(d);
    window.__T = { g: RINGKASAN[0], l: { progresId: id2, vendor: {} }, baca: null }; window.mp270Aktif = () => window.__T;
  }, { SPPP, id2 });
  await pg.waitForSelector('#mp298Aksi button', { timeout: 5000 });
  const tb = await pg.$$eval('#mp298Aksi button', b => b.map(x => x.textContent.trim()));
  ok(tb.join('|') === 'Unduh Excel Backup (.xlsx)|Pratinjau & Cetak PDF|Susun ulang backup', 'tombol: ' + tb.join(' · '));
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#mp298Aksi button:has-text("Unduh Excel Backup")')]);
  const pDl = OUT + '/unduh_' + dl.suggestedFilename(); await dl.saveAs(pDl);
  ok(dl.suggestedFilename() === 'BAP_Pekerjaan_Galian_Tanah_Dermaga_CV_Rizki_Kurnia_Termin-2.xlsx' && fs.readFileSync(pDl).equals(Buffer.from(C.__files[akt[8]].data, 'latin1')), 'unduhan = berkas arsip (byte identik): ' + dl.suggestedFilename());
  await pg.click('#mp298Aksi button:has-text("Pratinjau")');
  await pg.waitForSelector('#mp298Frame:not([hidden])', { timeout: 30000 });
  const fr = await (await pg.$('#mp298Frame')).contentFrame();
  await fr.waitForSelector('.xl-hal');
  const hal = await fr.$$eval('.xl-hal', h => h.map(x => x.dataset.sheet)); ok(['rincian ', 'lamp1', 'BAPP', 'BAP  1'].every(s => hal.indexOf(s) >= 0), 'pratinjau merender sheet cetak: ' + [...new Set(hal)].join(' · '));
  const teks = await fr.evaluate(() => document.body.innerText);
  ok(/Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok/.test(teks) && /CV Rizki Kurnia/i.test(teks) && /134\/SPPP/.test(teks), 'isi pratinjau memuat nama proyek, vendor & nomor kontrak');
  const info = await pg.$eval('#mp298PvInfo', x => x.textContent); ok(/berkas arsip 134 SPPP CV Rizki Kurnia\/Kelengkapan/.test(info), 'sumber pratinjau = berkas arsip');
  await pg.setViewportSize({ width: 1280, height: 900 }); await pg.screenshot({ path: OUT + '/pratinjau.png' });
  await pg.click('#mp298Pv .btn-close');

  console.log('E. Pembentuk Tagihan: tombol per BK');
  await pg.evaluate(() => { document.getElementById('mp280Isi').innerHTML = '<table><tbody>' + PROG.data.map(e => `<tr data-id="${e.id}"><td>${e.nomorBA}</td><td></td></tr>`).join('') + '</tbody></table>'; });
  await pg.waitForSelector('#mp280Isi .mp298-mini', { timeout: 5000 });
  ok((await pg.$$('#mp280Isi .mp298-mini')).length === 3, 'tombol Excel/PDF di 3 baris BK (SPPP ×2, SPM ×1)');
  ok(!log.some(l => /PAGEERROR/.test(l)), 'tanpa galat halaman' + (log.length ? ' (log: ' + log.slice(0, 3).join(' / ') + ')' : ''));
  await br.close();
  console.log('\n' + lulus + ' cek lulus — UI 2.9.8 (berkas di ' + OUT + ')');
})().catch(e => { console.error(e); process.exit(1); });
