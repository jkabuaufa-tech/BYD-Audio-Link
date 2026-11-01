// Uji ujung-ke-ujung MP299 (2.9.9) di Chromium: kasus tiruan Farika BAPM 02 → Koreksi BK dari Excel dokumen benar (+ addendum volume kontrak),
// server = kernel Code.gs 2.5.1 ASLI + modul 1.10.5 (harness). Juga Cek & Koreksi Tagihan.
//   python3 -I tagihan/uji/buat_bapm_farika.py /tmp/BAPM_02_Farika.xlsx
//   KODE_GS=/tmp/Code.gs NODE_PATH=$(npm root -g) node tagihan/uji/ui299.js
const assert = require('assert'), fs = require('fs');
const { chromium } = require('playwright');
const R = __dirname + '/../../asisten-ai-agen', OUT = '/tmp/ui299';
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
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.5.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji ui 2.9.9 koreksi' }).ok);
const NO = '005/SPPM/WK-NK.KSO/PDBJ/1726012/2026';
const IT = [['Pipa Baja SPSP dia 1524 t=19mm Grd 3', 4696603, 'KG', 12900], ['Clutch/Interlock System SPSP dia 1524', 4440, 'M', 1900000], ['Cat Coating Pipa 300 Micron Jotun', 2125.78, 'M2', 370000],
  ['Pipa Baja SPSP dia 1524 t=14mm Grd 3', 159531.1, 'KG', 12900], ['Clutch/Interlock System SPSP dia 1524', 272, 'M', 1900000], ['Pipa Baja SPP dia 702 mm t = 19mm', 161936, 'KG', 12550], ['Cat Coating Pipa 300 Micron Jotun', 48.52, 'M2', 370000], ['Bottom Pile - Penebalan ASTM A 252 14mm', 12, 'PC', 4250000]]
  .map(x => ({ kode: '30000001', uraian: x[0], vol: x[1], sat: x[2], harga: x[3] }));
const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPPM', namaVendor: 'Farika Steel, PT', idVendor: '2100001234', tglKontrak: '2026-05-01', tglSelesai: '2026-12-31', noPO: '4100099000', items: IT } });
assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
const id = i => NO + '#' + i, v1 = { [id(0)]: 469629.9, [id(1)]: 468.3, [id(2)]: 254.86, [id(3)]: 15952.09, [id(4)]: 27.4, [id(5)]: 20608.64, [id(6)]: 7.28, [id(7)]: 1.2 };
let bk1 = STF('saveProgres', { data: { noKontrak: NO, periode: 'Juli 2026', periodeKey: 202607, tanggal: '2026-07-10', tagihanKe: 1, kodeBA: 'BAPM', items: v1, nilai: Object.keys(v1).reduce((a, k) => a + v1[k] * IT[+k.split('#')[1]].harga, 0) } }).data;
let bk2 = STF('saveProgres', { data: { noKontrak: NO, periode: 'Juli 2026', periodeKey: 202607, tanggal: '2026-07-17', tagihanKe: 2, kodeBA: 'BAPM', items: { [id(7)]: 10.8 }, nilai: 45900000 } }).data;
STF('saveProgres', { data: { id: bk1.id, versi: bk1.versi, terbit: true } }); bk2 = STF('saveProgres', { data: { id: bk2.id, versi: bk2.versi, terbit: true } }).data;
assert.ok(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: { kategori: 'BAHAN', uangMukaPersen: 0, retensiPersen: 0, ppn: { skema: 'NILAI_LAIN', tarif: 12 }, pph: { jenis: 'PPh 22', tarif: 1.5 } } } }).ok);
const pk = STF('blSimpan', { data: { noKontrak: NO, progresId: bk2.id, jenis: 'PROGRES', sumber: { items: [] }, vendor: { ttdNama: 'Kasim' } } }).data;

const js = JSON.parse(fs.readFileSync(R + '/pembaruan-2.9.9.json', 'utf8')), css = js.css;
const potong = (a, b) => { const i = js.js.indexOf('\n' + a), j = js.js.indexOf('\n' + b); assert.ok(i > 0 && j > i, a); return js.js.slice(i, j); };
const blok = potong('/* MP292', '/* MP297') + potong('/* MP298', '/* MP264');

(async () => {
  const br = await chromium.launch(), pg = await br.newPage({ acceptDownloads: true, viewport: { width: 1360, height: 900 } });
  const log = []; pg.on('pageerror', e => log.push('PAGEERROR ' + e.message)); pg.on('console', m => { if (m.type() === 'error') log.push(m.text()); });
  await pg.exposeFunction('__srv', body => post(JSON.parse(body)));
  await pg.route('https://uji.lokal/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body><main><div id="mp280Isi"></div></main></body></html>' }));
  await pg.goto('https://uji.lokal/index.html');
  await pg.evaluate(P => {
    window.__notif = []; window.notif = (m, t) => window.__notif.push([t, m]);
    window.REG = { url: 'harness', sesi: { nama: 'Staf Pengadaan', pin: '1111', peran: 'PENGADAAN', proyek: P }, data: [] }; window.PROG = { data: [] }; window.RINGKASAN = [];
    window.PROYEK = { id: P, namaLengkap: 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' };
    window.idItem = (g, it, i) => it.kodeUnik || g.key + '#' + i; window.volItem = it => Number(it.volume) || 0; window.hargaItem = it => Number(it.hargaSatuan) || 0;
    window.profilVendor = () => ({ nama: 'Kasim', jabatan: 'Direktur', alamat: 'Karang Anyar No. 55, Jakarta Pusat', npwp: '31.271.247.4-075.000' });
    window.mp220Srv = f => ['paketTagihan', 'paketTagihanExcel', 'koreksiBK'].indexOf(f) >= 0;
    window.regPost = async o => JSON.parse(await window.__srv(JSON.stringify(Object.assign({}, o, { proyek: P }))));
    window.regAksi = async (a, x) => { const r = await window.regPost(Object.assign({ action: a, nama: REG.sesi.nama, pin: REG.sesi.pin }, x || {})); if (!r.ok) throw new Error(r.error); return r; };
    window.muatRegister = async () => {   // tiruan muat ulang aplikasi: Register → RINGKASAN, Progres → PROG
      const q = j => window.regPost({ action: 'baca', jenis: j, nama: REG.sesi.nama, pin: REG.sesi.pin });
      REG.data = (await q('list')).data || []; PROG.data = (await q('progres')).data || [];
      RINGKASAN = REG.data.map(r => ({ key: r.noKontrak, namaVendor: r.namaVendor, idVendor: r.idVendor, nilai: r.nilai, tglMulai: r.tglKontrak, tglSelesai: r.tglSelesai, items: r.items.map(i => ({ itemPekerjaan: i.uraian, satuan: i.sat, volume: i.vol, hargaSatuan: i.harga })) }));
      window.RINGKASAN = RINGKASAN;
    };
  }, P);
  await pg.evaluate(() => window.muatRegister());
  await pg.addScriptTag({ content: blok });

  console.log('A. Paket Tagihan BAPM 02 (salah input Rp 45.900.000) → tombol Koreksi BK');
  await pg.evaluate(({ NO, id2 }) => { const d = document.createElement('div'); d.id = 'mp270Dlg'; d.innerHTML = '<div><button class="btn" onclick="mp270Pratinjau()">Pratinjau</button></div>'; document.body.appendChild(d);
    window.mp270Aktif = () => ({ g: RINGKASAN[0], l: { progresId: id2, vendor: {} }, baca: null }); window.mp270Buka = () => { }; }, { NO, id2: bk2.id });
  await pg.waitForSelector('#mp298Aksi .mp299-btn', { timeout: 8000 });
  ok(true, 'tombol "Koreksi BK" tampil di bar Excel backup Paket Tagihan');
  await pg.click('#mp298Aksi .mp299-btn'); await pg.waitForSelector('#mp299Lapis .mp299-t');
  ok((await pg.$$eval('#mp299Lapis .mp299-in', x => x.length)) === 8, 'dialog koreksi: 8 item, kolom "Saat ini (koreksi)" dapat diubah');

  console.log('B. Isi dari Excel dokumen benar (BAPM 02 bertanda tangan)');
  await pg.setInputFiles('#mp299File', '/tmp/BAPM_02_Farika.xlsx');
  await pg.waitForSelector('#mp299Lapis .mp299-impor');
  const peta = await pg.$$eval('#mp299Lapis .mp299-impor tbody tr', tr => tr.map(t => [t.cells[1].textContent.trim(), t.querySelector('select').value, t.cells[5].textContent.trim()]));
  ok(peta.length === 8, '8 baris item terbaca (judul A/B/C, keterangan batang & baris nomor kolom dilewati)');
  ok(peta.map(p => p[1].split('#')[1]).join(',') === '0,1,2,3,4,5,6,7', 'semua baris cocok ke item kontrak yang benar (Cat Coating ganda dibedakan urutan): ' + peta.map(p => p[1].split('#')[1] + '/' + p[2]).join(' '));
  await pg.click('#mp299Lapis .mp299-impor .btn-primary');
  const v = await pg.$$eval('#mp299Lapis .mp299-in', x => x.map(i => i.value));
  ok(v[5] === '185477,8' && v[6] === '65,54' && v[7] === '10,8' && v[0] === '0', 'kolom koreksi terisi: SPP Ø702 185.477,8 · Cat Coating 65,54 · Bottom Pile 10,8');
  const ring = await pg.$eval('#mp299Lapis .mp299-ringkas', x => x.textContent.replace(/\s+/g, ' '));
  ok(/Rp 45\.900\.000.*Rp 2\.397\.896\.190/.test(ring), 'ringkasan: Rp 45.900.000 → Rp 2.397.896.190');
  const cat = await pg.$$eval('#mp299Lapis .mp299-cat', x => x.map(c => c.textContent));
  ok(cat.some(c => /Vol\. kontrak di dokumen 206\.086,44/.test(c)) && cat.some(c => /"Yang lalu" di dokumen 444/.test(c)), 'catatan beda volume kontrak & "yang lalu" (Clutch 444 vs 468,30) ditampilkan');
  await pg.screenshot({ path: OUT + '/1-bandingkan.png' });

  console.log('C. Dampak & alasan → simpan');
  await pg.click('#mp299Lapis footer .btn-primary');
  await pg.waitForSelector('#mp299Alasan');
  const dmp = await pg.$eval('#mp299Lapis .mp299-dampak', x => x.textContent);
  ok(/Volume kontrak di Register Kontrak diperbarui/.test(dmp) && /BA sudah terbit/.test(dmp) && /dihitung ulang otomatis/.test(dmp), 'dampak: addendum Register, BA terbit (cetak ulang), paket dihitung ulang');
  await pg.fill('#mp299Alasan', 'BAPM 02 fisik: SPP Ø702 185.477,80 kg & Cat Coating 65,54 m² belum diinput di BK');
  await pg.fill('#mp299Acuan', 'BAPM 02 bertanda tangan 17/07/2026'); await pg.fill('#mp299Add', 'ADD-01/SPPM/005/2026');
  await pg.check('#mp299Lapis input[type=checkbox]');
  await pg.click('#mp299Lapis footer .btn-primary');
  await pg.waitForSelector('#mp299Simpan:not([disabled])', { timeout: 5000 });
  await pg.screenshot({ path: OUT + '/2-tinjau.png' });
  await pg.click('#mp299Simpan');
  await pg.waitForSelector('#mp299Lapis .mp299-sukses', { timeout: 30000 });
  const e2 = K.bacaKoleksi_(P, 'progres').find(x => x.id === bk2.id), reg = K.bacaKoleksi_(P, 'data').find(x => x.noKontrak === NO);
  ok(e2.nilai === 2397896190 && e2.nomorBA === bk2.nomorBA && e2.revisi === 1, 'server: BK BAPM 02 = Rp 2.397.896.190, nomor BA tetap, revisi 1');
  ok(reg.items[5].vol === 206086.44 && reg.items[6].vol === 72.82 && reg.items[0].vol === 4696299, 'Register: volume kontrak diperbarui sesuai dokumen (addendum)');
  const pk2 = STF('blBaca', { id: pk.id }); ok(pk2.data.hasil.prestasi.ini === 2397896190 && !pk2.data.hasil.temuan.some(t => t.tingkat === 'GALAT'), 'paket BAPM 02 dihitung ulang: prestasi Rp 2.397.896.190 tanpa GALAT');
  await pg.waitForFunction(() => window.__notif.some(n => /Backup Excel .*Termin-2\.xlsx tersimpan/.test(n[1])), null, { timeout: 60000 });
  const bx = C.__sheets[P + '_BackupExcelTagihan'].rows.filter(r => r[2] === bk2.id && r[15] === 'AKTIF')[0];
  ok(bx && bx[14] === 'KOREKSI', 'Excel backup disusun ulang otomatis (sumber KOREKSI): ' + bx[7]);
  fs.writeFileSync(OUT + '/bapm02_koreksi.xlsx', Buffer.from(C.__files[bx[8]].data, 'latin1'));
  await pg.screenshot({ path: OUT + '/3-selesai.png' });
  await pg.click('#mp299Lapis footer .btn-primary');

  console.log('D. Cek & Koreksi Tagihan (seluruh BK)');
  await pg.evaluate(() => { document.getElementById('mp280Isi').innerHTML = '<div class="card"><div class="d-flex"></div><table><tbody>' + PROG.data.map(e => `<tr data-id="${e.id}"><td>${e.nomorBA}</td><td></td></tr>`).join('') + '</tbody></table></div>'; });
  await pg.waitForSelector('#mp280Isi .mp299-cek'); await pg.click('#mp280Isi .mp299-cek');
  await pg.waitForSelector('#mp299Cek .reg-chip', { timeout: 15000 });
  await pg.click('#mp299Cek .reg-chip:nth-child(3)');
  const rowsC = await pg.$$eval('#mp299Cek .mp299-t tbody tr', tr => tr.map(t => t.textContent.replace(/\s+/g, ' ')));
  ok(rowsC.length === 2 && rowsC.some(t => /02\/BAPM.*1× dikoreksi/.test(t)), 'Cek Tagihan: 2 BK, BAPM 02 bertanda "1× dikoreksi"');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#mp299Cek button:has-text("CSV")')]);
  ok(/^cek-tagihan-.*\.csv$/.test(dl.suggestedFilename()), 'ekspor CSV: ' + dl.suggestedFilename());
  await pg.screenshot({ path: OUT + '/4-cek.png' });
  ok(!log.some(l => /PAGEERROR/.test(l)), 'tanpa galat halaman' + (log.length ? ' (' + log.slice(0, 2).join(' / ') + ')' : ''));
  await br.close();
  console.log('\n' + lulus + ' cek lulus — UI 2.9.9 koreksi tagihan (tangkapan di ' + OUT + ')');
})().catch(e => { console.error(e); process.exit(1); });
