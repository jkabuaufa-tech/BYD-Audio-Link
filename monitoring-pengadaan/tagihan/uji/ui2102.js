// Uji 2.10.2 dengan dialog ASLI "Lengkapi foto penerimaan" (blok MP273) + MP2100: kasus SPM 063 — GR otomatis bertanggal 01-11 (opname),
// BAPM bertanggal 04-11 terbit sebelum 2.10 (hanya di register Preview BA perangkat). Server = kernel asli + modul 1.10.6.
//   KODE_GS=/tmp/Code.gs NODE_PATH=$(npm root -g) node tagihan/uji/ui2101.js
const assert = require('assert'), fs = require('fs');
const { chromium } = require('playwright');
const R = __dirname + '/../../asisten-ai-agen', OUT = '/tmp/ui2101';
const { buatKonteks } = require(R + '/uji/harness.js');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
fs.mkdirSync(OUT, { recursive: true });
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
require('./drive_biner.js')(C, K, P);
const gf = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { const f = gf(id), b = C.__files[id]; if (b && /\.(jpg|png)$/i.test(b.nama || '')) f.getMimeType = () => 'image/jpeg'; return f; };
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const post = o => K.doPost({ postData: { contents: JSON.stringify(o) } });
const kirim = (nama, pin) => (action, x) => JSON.parse(post(Object.assign({ action, nama, pin, proyek: P }, x || {})));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.7.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji ui 2.10.1 lengkapi' }).ok);
const NO = '063/SPM/WK-NK.KSO/PDBJ/1726012/2026';
K.tulisKoleksi_(P, 'permintaan', [{ id: 'B13', nomor: '013/WK-NK.KSO/DIV.II/INF1/1726012/2026', tanggal: '2026-10-01', departemen: 'Gudang', items: [
  { kode: '2100000004', uraian: 'Container Office 20 Feet', vol: 2, sat: 'UN', harga: 50000000 }, { kode: '2100000177', uraian: 'Mesin Fotocopy A3 Canon', vol: 1, sat: 'UN', harga: 30000000 }, { kode: '2100000053', uraian: 'Kulkas 1 Pintu Polytron', vol: 1, sat: 'PC', harga: 2500000 }] }]);
const BON = '013/WK-NK.KSO/DIV.II/INF1/1726012/2026';
const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPM', namaVendor: 'PT Mitra', idVendor: '2100007777', tglKontrak: '2026-10-01', tglSelesai: '2026-12-31', noPO: '4100002222',
  items: [{ kode: '2100000004', uraian: 'Container Office 20 Feet', vol: 2, sat: 'UN', harga: 50000000, noPermintaan: BON }, { kode: '2100000177', uraian: 'Mesin Fotocopy A3 Canon', vol: 1, sat: 'UN', harga: 30000000, noPermintaan: BON }, { kode: '2100000053', uraian: 'Kulkas 1 Pintu Polytron', vol: 1, sat: 'PC', harga: 2500000, noPermintaan: BON }] } });
assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
let bk = STF('saveProgres', { data: { noKontrak: NO, periode: 'November 2026', periodeKey: 202611, tanggal: '2026-11-01', tagihanKe: 1, kodeBA: 'BAPM', items: { [NO + '#0']: 2, [NO + '#1']: 1, [NO + '#2']: 1 }, nilai: 132500000 } }).data;
bk = STF('saveProgres', { data: { id: bk.id, versi: bk.versi, terbit: true } }).data;
const oto = STF('gudangOtomatisProgres', { data: { progresId: bk.id, baris: [0, 1, 2].map(i => ({ bonNomor: BON, bonIdx: i, sd: [2, 1, 1][i] })) } });
assert.ok(oto.ok && oto.data.length === 3);
const masuk = () => C.__sheets[P + '_GudangMasuk'].rows.slice(1).map(r => JSON.parse(r[r.length - 1]));
ok(masuk().every(r => r.tanggal === '2026-11-01' && r.fotoKurang), 'kondisi awal (seperti tangkapan layar): 3 GR otomatis 01-Nov-2026, foto belum lengkap');
const pkt = JSON.parse(fs.readFileSync(R + '/pembaruan-2.10.2.json', 'utf8'));
const potong = (a, b) => { const i = pkt.js.indexOf('\n' + a), j = pkt.js.indexOf('\n' + b); assert.ok(i > 0 && j > i, a); return pkt.js.slice(i, j); };
const blok = potong('/* MP273', '/* MP280') + potong('/* MP2100', '/* MP264');
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');

(async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 1360, height: 950 } });
  const log = []; pg.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  await pg.exposeFunction('__srv', body => post(JSON.parse(body)));
  await pg.route('https://uji.lokal/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"><style>${pkt.css}</style></head><body><div id="tab-gdmasuk"><h3>Penerimaan Material</h3></div></body></html>` }));
  await pg.goto('https://uji.lokal/index.html');
  await pg.evaluate(({ P, NO, bkId }) => {
    window.__notif = []; window.notif = (m, t) => window.__notif.push([t, m]);
    window.REG = { url: 'h', sesi: { nama: 'Staf Pengadaan', pin: '1111', peran: 'PENGADAAN', proyek: P }, data: [] }; window.PROG = { data: [] }; window.RINGKASAN = [];
    window.mp220Srv = f => ['gudangOtomatis', 'tanggalBAPMBAP', 'fotoPerMaterial', 'sinkronTanggalGudang'].indexOf(f) >= 0;
    window.regPost = async o => JSON.parse(await window.__srv(JSON.stringify(Object.assign({}, o, { proyek: P }))));
    window.regAksi = async (a, x) => { const r = await window.regPost(Object.assign({ action: a, nama: REG.sesi.nama, pin: REG.sesi.pin }, x || {})); if (!r.ok) throw new Error(r.error); return r; };
    const q = j => window.regPost({ action: 'baca', jenis: j, nama: REG.sesi.nama, pin: REG.sesi.pin });
    window.MP223 = { masuk: [] };
    window.mp223Muat = async () => { const r = await window.regPost({ action: 'gudangBaca', nama: REG.sesi.nama, pin: REG.sesi.pin, data: { jenis: 'masuk' } }); window.MP223.masuk = r.masuk || []; };
    window.muatAwal = async () => { REG.data = (await q('list')).data; PROG.data = (await q('progres')).data; window.RINGKASAN = REG.data.map(r => ({ key: r.noKontrak, namaVendor: r.namaVendor, tglMulai: r.tglKontrak, tglSelesai: r.tglSelesai, items: [] })); };
    // register BA Preview di perangkat: BAPM 01 terbit bertanggal 04-11-2026 (sebelum 2.10)
    window.KUNCI_REGISTER = 'BA_REG'; localStorage.setItem('BA_REG', JSON.stringify({ [NO]: [{ urut: 1, nomor: '01/BAPM/' + NO, tanggal: '2026-11-04' }] }));
    window.bacaSimpan = k => JSON.parse(localStorage.getItem(k) || '{}');
  }, { P, NO, bkId: bk.id });
  await pg.evaluate(() => muatAwal());
  const gb = await pg.evaluate(async () => { await mp223Muat(); return MP223.masuk.length; });
  assert.ok(gb === 3, 'gudangBaca ' + gb);
  // sesi otomatis dimatikan dulu untuk menguji dialog; dinyalakan di bagian B
  await pg.evaluate(() => { sessionStorage.setItem('MP2100_SINK_' + REG.sesi.proyek + '_' + new Date().toISOString().slice(0, 10), '1'); });
  // 2.10.2: dialog dibuka lewat fungsi ASLI (pembungkus dilewati) — isian harus tetap terpasang
  await pg.addScriptTag({ content: potong('/* MP273', '/* MP280') + '\nwindow.__asli = window.mp273Lengkapi;' });
  await pg.addScriptTag({ content: potong('/* MP2100', '/* MP264') });

  console.log('A. Dialog asli "Lengkapi foto penerimaan" (MP273) + 2.10.1');
  await pg.waitForTimeout(600);
  const kir = await pg.evaluate(() => MP223.masuk[0].kiriman);
  await pg.evaluate(k => window.__asli(k), kir); await pg.waitForTimeout(800);
  await pg.waitForSelector('#mp273Modal #mp2100FIoto .mp2100-fi-t tr', { timeout: 5000 });
  ok((await pg.$$eval('#mp2100FIoto .mp2100-fi-t tr', t => t.length)) === 3 && (await pg.$$eval('#mp2100FIoto .mp2100-sl', t => t.length)) === 12, 'dialog: bagian "Foto per material" — 3 material × 4 slot (D/B/Ka/Ki)');
  ok(/Foto utama \(mewakili item tanpa foto sendiri\)/.test(await pg.$eval('#mp273Modal', x => x.textContent)), 'slot lama berlabel "Foto utama"');
  ok((await pg.$eval('#mp2100OtoTgl', x => x.value)) === '2026-11-04' && /usulan dari Preview BA/.test(await pg.$eval('#mp273Modal', x => x.textContent)), 'isian "Tanggal penerimaan = Tanggal BAPM" terisi 04-11-2026 dari Preview BA');
  await pg.screenshot({ path: OUT + '/lengkapi-foto.png' });
  const ids = await pg.evaluate(k => MP223.masuk.filter(r => r.kiriman === k).map(r => r.id), kir);
  await pg.setInputFiles(`#mp2100FIoto input[data-k="${ids[0]}"][data-i="0"]`, { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG });
  await pg.setInputFiles(`#mp2100FIoto input[data-k="${ids[0]}"][data-i="2"]`, { name: 'b.jpg', mimeType: 'image/jpeg', buffer: JPG });
  await pg.setInputFiles(`#mp2100FIoto input[data-k="${ids[1]}"][data-i="0"]`, { name: 'c.jpg', mimeType: 'image/jpeg', buffer: JPG });
  await pg.waitForFunction(id => (MP2100.FI.oto[id] || []).filter(Boolean).length === 2, ids[0]);
  await pg.setInputFiles('#mp273F0', { name: 'utama.jpg', mimeType: 'image/jpeg', buffer: JPG });   // foto utama mewakili Kulkas
  await pg.click('#mp273Ok');
  await pg.waitForFunction(() => !document.getElementById('mp273Modal'), null, { timeout: 30000 });
  const M = masuk(), by = k => M.find(r => r.kode === k);
  ok(by('2100000004').foto.filter(Boolean).length === 2 && by('2100000177').foto.filter(Boolean).length === 1 && by('2100000053').fotoWakil === true && M.every(r => !r.fotoKurang), 'server: Container 2 foto, Fotocopy 1 foto (sendiri), Kulkas memakai foto utama — semua lengkap');
  ok(M.every(r => r.tanggal === '2026-11-04') && K.bacaKoleksi_(P, 'progres')[0].tanggalBA === '2026-11-04', 'tanggal penerimaan & Kartu Gudang → 04-11-2026; BK tanggal BAPM 04-11-2026');

  console.log('B. Sinkron otomatis saat aplikasi dibuka (BK lain, BA terbit sebelum 2.10)');
  let bk2 = STF('saveProgres', { data: { noKontrak: NO, periode: 'November 2026', periodeKey: 202611, tanggal: '2026-11-01', tagihanKe: 2, kodeBA: 'BAPM', items: { [NO + '#0']: 0.0, [NO + '#1']: 0 }, nilai: 0 } });
  // BK ke-2 tidak perlu untuk Kartu Gudang; uji sinkron massal memakai BK ke-1 yang tanggalnya dikembalikan ke 01-11
  let L = K.bacaKoleksi_(P, 'progres'); L[0].tanggalBA = ''; K.tulisKoleksi_(P, 'progres', L);
  const rows = C.__sheets[P + '_GudangMasuk'].rows; rows.slice(1).forEach(r => { const o = JSON.parse(r[r.length - 1]); o.tanggal = '2026-11-01'; r[1] = "'2026-11-01"; r[r.length - 1] = JSON.stringify(o); });
  await pg.evaluate(async () => { await muatAwal(); sessionStorage.clear(); document.body.appendChild(document.createElement('div')); });
  await pg.waitForFunction(() => window.__notif.some(n => /Sinkron otomatis/.test(n[1])), null, { timeout: 20000 });
  ok(masuk().every(r => r.tanggal === '2026-11-04') && K.bacaKoleksi_(P, 'progres')[0].tanggalBA === '2026-11-04', 'tanpa klik tombol: tanggal BAPM dari Preview BA → BK, penerimaan & Laporan Harian Gudang 04-11-2026');
  ok(!log.length, 'tanpa galat halaman' + (log.length ? ': ' + log.join(' / ') : ''));
  await br.close();
  console.log('\n' + lulus + ' cek lulus — 2.10.2 lengkapi foto & tanggal BAPM');
})().catch(e => { console.error(e); process.exit(1); });
