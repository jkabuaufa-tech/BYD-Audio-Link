// Uji UI 2.10.0 di Chromium (blok asli MP292…MP298 + MP2100 dari pembaruan-2.10.0.json, server = kernel asli + modul 1.10.6 harness):
// isian Tanggal BAPM/BAP di Input Progres (+validasi kontrak), foto per material di Terima Bon, Tanggal BAPM di Paket, Excel BAPM/BAP terpisah.
//   KODE_GS=/tmp/Code.gs NODE_PATH=$(npm root -g) node tagihan/uji/ui2100.js
const assert = require('assert'), fs = require('fs');
const { chromium } = require('playwright');
const R = __dirname + '/../../asisten-ai-agen', OUT = '/tmp/ui2100';
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
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.6.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji ui 2.10.0 gudang' }).ok);
K.tulisKoleksi_(P, 'permintaan', [{ id: 'B1', nomor: 'BON-01', tanggal: '2026-09-01', departemen: 'Gudang', items: [{ kode: 'M1', uraian: 'Besi D13', vol: 100, sat: 'btg', harga: 90000 }, { kode: 'M2', uraian: 'Semen', vol: 50, sat: 'zak', harga: 60000 }] }]);
const NO = '047/SPM/WK-NK.KSO/PDBJ/1726012/2026';
const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPM', namaVendor: 'PT Surya Salim Sejahtera', idVendor: '2100008888', tglKontrak: '2026-09-01', tglSelesai: '2026-11-30', noPO: '4100001111', items: [{ kode: 'M1', uraian: 'Besi D13', vol: 100, sat: 'btg', harga: 90000, noPermintaan: 'BON-01' }, { kode: 'M2', uraian: 'Semen', vol: 50, sat: 'zak', harga: 60000, noPermintaan: 'BON-01' }] } });
assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
const pkt = JSON.parse(fs.readFileSync(R + '/pembaruan-2.10.0.json', 'utf8'));
const potong = (a, b) => { const i = pkt.js.indexOf('\n' + a), j = pkt.js.indexOf('\n' + b); assert.ok(i > 0 && j > i, a); return pkt.js.slice(i, j); };
const blok = potong('/* MP292', '/* MP297') + potong('/* MP298', '/* MP299') + potong('/* MP2100', '/* MP264');
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

(async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 1360, height: 900 } });
  const log = []; pg.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  await pg.exposeFunction('__srv', body => post(JSON.parse(body)));
  await pg.route('https://uji.lokal/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"><style>${pkt.css}</style></head><body>
    <div class="row" id="fpRow"><div class="col-lg-2 col-6"><label class="form-label">Tanggal Opname / BA</label><input type="date" class="form-control" id="fp_tanggal" value="2026-10-01"></div></div>
    <div id="tab-gdmasuk"><h3>Penerimaan Material</h3></div></body></html>` }));
  await pg.goto('https://uji.lokal/index.html');
  await pg.evaluate(({ P, NO }) => {
    window.__notif = []; window.notif = (m, t) => window.__notif.push([t, m]);
    window.REG = { url: 'h', sesi: { nama: 'Staf Pengadaan', pin: '1111', peran: 'PENGADAAN', proyek: P }, data: [] }; window.PROG = { data: [] }; window.RINGKASAN = []; window.PMT = { data: [] };
    window.PROYEK = { id: P, namaLengkap: 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' };
    window.idItem = (g, it, i) => g.key + '#' + i; window.volItem = it => Number(it.volume) || 0; window.hargaItem = it => Number(it.hargaSatuan) || 0;
    window.profilVendor = () => ({ nama: 'Salim', jabatan: 'Direktur', alamat: 'Jakarta', npwp: '02.111.222.3-444.000' });
    window.mp220Srv = f => ['paketTagihan', 'paketTagihanExcel', 'koreksiBK', 'tanggalBAPMBAP', 'fotoPerMaterial', 'sinkronTanggalGudang'].indexOf(f) >= 0;
    window.regPost = async o => JSON.parse(await window.__srv(JSON.stringify(Object.assign({}, o, { proyek: P }))));
    window.regAksi = async (a, x) => { const r = await window.regPost(Object.assign({ action: a, nama: REG.sesi.nama, pin: REG.sesi.pin }, x || {})); if (!r.ok) throw new Error(r.error); return r; };
    window.muatRegister = async () => { const q = j => window.regPost({ action: 'baca', jenis: j, nama: REG.sesi.nama, pin: REG.sesi.pin }); REG.data = (await q('list')).data; PROG.data = (await q('progres')).data; PMT.data = (await q('permintaan')).data;
      window.RINGKASAN = REG.data.map(r => ({ key: r.noKontrak, namaVendor: r.namaVendor, idVendor: r.idVendor, nilai: r.nilai, tglMulai: r.tglKontrak, tglSelesai: r.tglSelesai, items: r.items.map(i => ({ itemPekerjaan: i.uraian, satuan: i.sat, volume: i.vol, hargaSatuan: i.harga })) })); };
    window.FP = { g: null, edit: null };
    window.simpanProgres = async () => { const r = await regAksi('saveProgres', { data: { noKontrak: NO, periode: 'Oktober 2026', periodeKey: 202610, tanggal: document.getElementById('fp_tanggal').value, tagihanKe: 1, kodeBA: 'BAPM', items: { [NO + '#0']: 40, [NO + '#1']: 20 }, nilai: 4800000 } }); await muatRegister(); return r; };
  }, { P, NO });
  await pg.evaluate(() => muatRegister()); await pg.evaluate(() => { FP.g = RINGKASAN[0]; });
  await pg.addScriptTag({ content: blok });

  console.log('A. Input Progres: Tanggal BAPM & Tanggal BAP terpisah + validasi kontrak');
  await pg.waitForSelector('#mp2100TglBA'); ok(await pg.$('#mp2100TglBAP') !== null && (await pg.$eval('#mp2100NmBA', x => x.textContent)) === 'BAPM', 'isian "Tanggal BAPM" & "Tanggal BAP" tampil di samping Tanggal Opname');
  await pg.fill('#mp2100TglBA', '2026-12-04'); await pg.dispatchEvent('#mp2100TglBA', 'change');
  ok(/melewati masa berlaku kontrak\/SPM \(30\/11\/2026\)/.test(await pg.$eval('#mp2100FpPesan', x => x.textContent)), 'peringatan: tanggal BAPM melewati masa berlaku SPM');
  const blok1 = await pg.evaluate(async () => { const r = await window.simpanProgres(); return r === false; });
  ok(blok1 && (await pg.evaluate(() => PROG.data.length)) === 0, 'Simpan BK diblokir selama tanggal BAPM melewati kontrak');
  await pg.fill('#mp2100TglBA', '2026-11-04'); await pg.fill('#mp2100TglBAP', '2026-11-06'); await pg.dispatchEvent('#mp2100TglBAP', 'change');
  await pg.evaluate(() => window.simpanProgres());
  await pg.waitForFunction(() => PROG.data[0] && PROG.data[0].tanggalBA === '2026-11-04', null, { timeout: 15000 });
  const bk = K.bacaKoleksi_(P, 'progres')[0];
  ok(bk.tanggal === '2026-10-01' && bk.tanggalBA === '2026-11-04' && bk.tanggalBAP === '2026-11-06', 'server: BK opname 01-10 · BAPM 04-11 · BAP 06-11 tersimpan terpisah');
  const oto = STF('gudangOtomatisProgres', { data: { progresId: bk.id, baris: [{ bonNomor: 'BON-01', bonIdx: 0, kode: 'M1', sd: 40 }] } });
  ok(oto.data[0] && C.__sheets[P + '_GudangMasuk'].rows.slice(1).every(r => JSON.parse(r[r.length - 1]).tanggal === '2026-11-04'), 'GR otomatis / Kartu Gudang bertanggal BAPM 04-11-2026 (bukan tanggal 1)');

  console.log('B. Terima Bon: slot foto per material');
  await pg.evaluate(() => { document.getElementById('tab-gdmasuk').insertAdjacentHTML('beforeend', '<form id="mp223FM"><input id="mp223MTgl" value="2026-11-05"><div class="small">Foto barang</div><div class="mp223-foto"><label id="mp223Slot0"></label></div></form>');
    window.MP223F = { bon: 'BON-01', qty: { 0: 10, 1: 5 }, harga: {}, foto: [null, null, null, null] }; window.MP223 = { masuk: [] }; document.getElementById('mp223MTgl').dispatchEvent(new Event('input', { bubbles: true })); });
  await pg.waitForSelector('#mp2100FIbon .mp2100-fi-t tr');
  ok((await pg.$$eval('#mp2100FIbon .mp2100-fi-t tr', t => t.length)) === 2 && (await pg.$$eval('#mp2100FIbon .mp2100-sl', t => t.length)) === 8, 'Besi & Semen masing-masing punya 4 slot (D/B/Ka/Ki)');
  ok(await pg.evaluate(() => window.mp2100FotoCukup() === false), 'tanpa foto utama & tanpa foto item → belum cukup');
  const buf = Buffer.from(JPG.split(',')[1], 'base64');
  for (const [k, i] of [['0', 0], ['0', 1], ['1', 0]]) await pg.setInputFiles(`#mp2100FIbon input[data-k="${k}"][data-i="${i}"]`, { name: 'f.jpg', mimeType: 'image/jpeg', buffer: buf });
  await pg.waitForFunction(() => window.mp2100FotoCukup() === true, null, { timeout: 8000 });
  ok(true, 'setiap item punya foto sendiri → cukup tanpa foto utama');
  await pg.screenshot({ path: OUT + '/terima-bon.png' });
  const sj = STF('gudangUnggahFoto', { berkas: { id: 'sj', data: buf.toString('base64'), nama: 'sj.jpg', jenis: 'SURAT-JALAN', ket: 'SJ' } }).data;
  const tb = await pg.evaluate(sj => regAksi('gudangTerimaBon', { data: { bonNomor: 'BON-01', tanggal: '2026-10-25', noSJ: 'SJ-11', sjFile: sj, foto: [null, null, null, null], baris: [{ idx: 0, kode: 'M1', qty: 10 }, { idx: 1, kode: 'M2', qty: 5 }] } }), sj);
  const rs = C.__sheets[P + '_GudangMasuk'].rows.slice(1).map(r => JSON.parse(r[r.length - 1])).filter(r => r.kiriman === tb.kiriman);
  ok(rs.find(r => r.kode === 'M1').foto.filter(Boolean).length === 2 && rs.find(r => r.kode === 'M2').foto.filter(Boolean).length === 1 && rs.every(r => r.fotoWakil === false), 'server: Besi 2 foto, Semen 1 foto — tersimpan per material');

  console.log('C. Paket Tagihan: Tanggal BAPM terpisah dari Tanggal dokumen (BAP & Kwitansi)');
  await pg.evaluate(({ NO }) => { const d = document.createElement('div'); d.id = 'mp270Dlg'; d.innerHTML = '<label>Tanggal dokumen<input type="date" value=""></label>'; document.body.appendChild(d);
    window.__T = { g: RINGKASAN[0], l: { progresId: PROG.data[0].id, tanggalDok: '' }, entri: PROG.data[0] }; window.mp270Aktif = () => window.__T; window.mp270L = (k, v) => { window.__T.l[k] = v; }; }, { NO });
  await pg.waitForSelector('#mp2100PkBAIn');
  ok((await pg.$eval('#mp2100PkBAIn', x => x.value)) === '2026-11-04' && /BAP & Kwitansi/.test(await pg.$eval('#mp270Dlg', x => x.textContent)) && (await pg.evaluate(() => __T.l.tanggalDok)) === '2026-11-06', 'Paket: "Tanggal BAPM" 04-11 & "Tanggal dokumen (BAP & Kwitansi)" 06-11 terisi dari BK');
  await pg.fill('#mp2100PkBAIn', '2026-12-01'); await pg.dispatchEvent('#mp2100PkBAIn', 'change');
  await pg.waitForSelector('#mp2100PkPesan'); ok(/melewati masa berlaku/.test(await pg.$eval('#mp2100PkPesan', x => x.textContent)), 'Paket: tanggal BAPM > akhir kontrak ditandai & Simpan/PDF diblokir');
  await pg.fill('#mp2100PkBAIn', '2026-11-04'); await pg.dispatchEvent('#mp2100PkBAIn', 'change');

  console.log('D. Excel format baku: tanggal BAPM & BAP terpisah');
  const H = await pg.evaluate(async id => { const h = await MP298.susun(id); const W = await XLH.muat(h.bytes); const { hasil } = XLH.hitungSemua(W);
    const v = (s, r) => { const o = W.byNama[s.toUpperCase()].sel.get(r); return o ? o.v : null; }, hv = (s, r) => (hasil.get(s) || new Map()).get(r);
    return { b55: v('INPUT', 'B55'), g55: v('INPUT', 'G55'), o2: hv('BAPM', 'O2'), n2: hv('BAP', 'N2'), e55: hv('INPUT', 'E55') }; }, bk.id);
  const ser = t => Math.round((Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);
  ok(H.b55 === ser('2026-11-04') && H.g55 === ser('2026-11-06') && H.o2 === ser('2026-11-04') && H.n2 === ser('2026-11-06'), 'Master SPM: BAPM bertanggal 04-11 (INPUT!B55 → BAPM!O2), BAP bertanggal 06-11 (INPUT!G55 → BAP!N2)');
  console.log('E. Agen Tagihan 1-klik: Periset → Penulis → Pemeriksa → Editor → Admin (persetujuan tiap langkah tulis)');
  assert.ok(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: { kategori: 'BAHAN', ppn: { skema: 'NILAI_LAIN', tarif: 12 } } } }).ok);
  await pg.evaluate(() => { window.mp270BuatOtomatis = async (key, progresId) => { const r = await regPost({ action: 'blSimpan', nama: REG.sesi.nama, pin: REG.sesi.pin, data: { noKontrak: key, progresId, jenis: 'PROGRES', sumber: { items: [] }, vendor: { ttdNama: 'Salim' } } }); if (!r.ok) throw new Error(r.error); return { baru: true, paket: r.data }; };
    document.getElementById('mp270Dlg').remove(); });
  await pg.evaluate(id => mp2101Buka(id), bk.id);
  await pg.waitForFunction(() => { const a = MP2101.keadaan(); return a && a.st.editor === 'setuju'; }, null, { timeout: 30000 });
  const st1 = await pg.evaluate(() => MP2101.keadaan().st);
  ok(st1.periset === 'selesai' && st1.penulis === 'selesai' && st1.pemeriksa === 'selesai' && st1.editor === 'setuju', 'agen berjalan sendiri sampai langkah Editor lalu menunggu persetujuan');
  const per = await pg.$eval('#mp2101O-pemeriksa', x => x.textContent);
  ok(/Nilai BK Rp 4\.800\.000 = Σ volume × harga/.test(per) && /Tanggal BAPM 04\/11\/2026 & BAP 06\/11\/2026 dalam masa berlaku kontrak/.test(per) && /Paket tagihan belum dibentuk/.test(per), 'Pemeriksa: nilai, tanggal BAPM/BAP vs masa kontrak, paket belum ada');
  ok(/Narasi BAP.*pengadaan material Besi D13, Semen/.test(await pg.$eval('#mp2101O-penulis', x => x.textContent)), 'Penulis: narasi BAP material utama urut nilai');
  await pg.screenshot({ path: OUT + '/agen-1.png' });
  ok(STF('blDaftar', { per: 50 }).data.length === 0, 'belum ada data ditulis sebelum persetujuan');
  await pg.click('#mp2101O-editor .btn-primary');
  await pg.waitForFunction(() => { const a = MP2101.keadaan(); return a && (a.st.admin === 'setuju' || a.st.admin === 'selesai' || a.st.editor === 'galat'); }, null, { timeout: 60000 });
  const pk = STF('blDaftar', { per: 50 }).data; ok(pk.length === 1 && pk[0].progresId === bk.id && pk[0].backupExcel, 'Editor (disetujui): paket ' + (pk[0] && pk[0].id) + ' dibentuk & Excel backup tersimpan');
  ok((await pg.evaluate(() => MP2101.keadaan().st.admin)) === 'setuju' && /DALAM PENYUSUNAN/.test(await pg.$eval('#mp2101O-admin', x => x.textContent)), 'Admin menunggu persetujuan: DRAFT → DALAM PENYUSUNAN');
  await pg.click('#mp2101O-admin .btn-primary');
  await pg.waitForFunction(() => MP2101.keadaan().st.admin === 'selesai', null, { timeout: 30000 });
  ok(STF('blDaftar', { per: 50 }).data[0].status === 'DALAM PENYUSUNAN' && /Ringkasan siap kirim/.test(await pg.$eval('#mp2101O-admin', x => x.textContent)), 'Admin (disetujui): status paket maju & ringkasan siap kirim tampil');
  await pg.screenshot({ path: OUT + '/agen-2.png' });
  ok(!log.length, 'tanpa galat halaman' + (log.length ? ': ' + log.join(' / ') : ''));
  await br.close();
  console.log('\n' + lulus + ' cek lulus — UI 2.10.0');
})().catch(e => { console.error(e); process.exit(1); });
