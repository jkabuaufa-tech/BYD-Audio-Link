// Uji UI 2.6.8 di Chromium memakai APLIKASI ASLI: HTML dasar (HTML_DASAR=…/index.html) + paket pembaruan-2.6.8.json lengkap,
// tersambung ke kernel Code.gs 2.5.1 asli (KODE_GS) + modul server 1.9.2 lewat harness. Form Bon Permintaan: Bahan · Alat · Sub.
//   HTML_DASAR=…/index.html KODE_GS=…/Code.gs node uji/ui268.js [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), vm = require('vm'), assert = require('assert');
const { buatKonteks } = require('./harness.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const HTML = fs.readFileSync(process.env.HTML_DASAR, 'utf8');
const PKT = fs.readFileSync(__dirname + '/../' + (process.env.PAKET || 'pembaruan-2.6.8.json'), 'utf8');
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id, doGet = vm.runInContext('doGet', C);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const STF = (action, x) => post(Object.assign({ action, nama: 'Staf Pengadaan', pin: '1111', proyek: P }, x || {}));
const modul = JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.9.2.json', 'utf8'));
assert.ok(post({ action: 'modulUnggah', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: modul }).ok);
{ const t = post({ action: 'modulTerbit', nama: 'Joko Supriyono', pin: '1234', proyek: P, versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji bon bahan alat sub' }); assert.ok(t.ok, t.error); }
// Bon lama (sebelum 2.6.8): bahan + satu baris di luar master
const bon = (noUrut, items) => STF('savePermintaan', { data: { noUrut, tahun: 2026, tanggal: '2026-10-01', departemen: 'Logistik', peminta: 'Budi', keperluan: 'uji', items } });
assert.ok(bon(1, [{ kode: '1000000001', uraian: 'Timbunan / Urug Tanah / Batu Kapur', sat: 'M3', vol: 10, harga: 150000 }, { kode: '', uraian: 'Paku campur', sat: 'KG', vol: 5, harga: 20000 }]).ok);
assert.ok(bon(2, [{ kode: '49000000', uraian: 'Excavator', sat: 'JAM', vol: 40, harga: 350000 }]).ok);
const login = STF('login');
// paket 2.6.8 = versi terbit di server (seperti setelah Admin menerbitkan), agar aplikasi memakainya untuk staf
C.__pkt = JSON.parse(PKT);
vm.runInContext("(function (p) { const f = folderPembaruan_().createFile(Utilities.newBlob(JSON.stringify(p), 'application/json', 'pembaruan-' + p.versi + '.json')); mp219SimpanMeta_(f.getId(), p); PropertiesService.getScriptProperties().setProperty('PEMB_AKTIF', f.getId()); })(__pkt)", C);
assert.ok(JSON.parse(doGet({ parameter: { action: 'pembaruanInfo' } })).data.versi === C.__pkt.versi);

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1366, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  const dialog = []; pg.on('dialog', d => { dialog.push(d.message()); d.accept(); });
  await pg.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.host === 'app.test') return u.pathname === '/' ? r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }) : r.fulfill({ body: '', contentType: 'text/javascript' });
    if (u.host === 'srv.test') {
      const out = q.method() === 'POST' ? K.doPost({ postData: { contents: q.postData() } }) : doGet({ parameter: Object.fromEntries(u.searchParams) });
      return r.fulfill({ body: typeof out === 'string' ? out : JSON.stringify(out), contentType: 'application/json' });
    }
    return r.fulfill({ body: '', status: 204 });
  });
  await pg.addInitScript(([pkt, sesi]) => { try { if (!sessionStorage.getItem('uji')) { sessionStorage.setItem('uji', 1); localStorage.setItem('JICT_PEMBARUAN', pkt); localStorage.setItem('JICT_REG_URL', 'https://srv.test/exec'); localStorage.setItem('JICT_REG_SESI', JSON.stringify(sesi)); } } catch (e) { } },
    [PKT, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', proyek: P, admin: false, cfg: login.proyek || { id: P } }]);
  await pg.goto('https://app.test/', { timeout: 120000 });
  await pg.waitForFunction(v => typeof PEMB !== 'undefined' && PEMB.aktif && PEMB.aktif.versi === v && PMT.data.length === 2, C.__pkt.versi, { timeout: 60000 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const cari = async (i, teks) => { await pg.fill('#pmNama' + i, ''); await pg.click('#pmNama' + i); await pg.keyboard.type(teks); await pg.waitForTimeout(150);
    return pg.$$eval(`#pmBody tr:nth-child(${i + 1}) .ac-list button`, a => a.map(x => (x.querySelector('code') || {}).textContent + ' ' + x.textContent.replace(/\s+/g, ' ').trim())); };
  const pilih = async (i, n) => { await pg.locator(`#pmBody tr:nth-child(${i + 1}) .ac-list button`).nth(n).dispatchEvent('mousedown'); await pg.click('#pm_keperluan'); await pg.waitForTimeout(100); };

  console.log('1. Form Bon');
  await pg.evaluate(() => showTab('form-bon'));
  const awal = await pg.evaluate(() => ({ opsi: [...document.querySelectorAll('#mp268Pilih .mp268-opsi')].map(b => b.dataset.j + (b.classList.contains('aktif') ? '*' : '')), th: [...document.querySelectorAll('#tab-form-bon thead th')].slice(1, 3).map(t => t.textContent), h: document.querySelector('#tab-form-bon > h3').textContent }));
  ok(awal.opsi.join() === 'BAHAN*,ALAT,SUB' && awal.th.join() === 'Nama Bahan,Kode Material' && awal.h === 'Form Bon Permintaan', 'pilihan jenis Bahan (aktif) · Alat · Sub; kolom "Nama Bahan / Kode Material"');

  console.log('2. Bahan — Master Material 1xxx / 21xxx');
  let h = await cari(0, 'container office');
  ok(h.length && h.every(t => /^(1|21)\d/.test(t)) && h.some(t => /^2100000004/.test(t)), 'cari "container office" → ' + h.length + ' hasil, semua kode 1/21 (mis. 2100000004)');
  h = await cari(0, 'lift penumpang');
  ok(!h.some(t => /^\d/.test(t)), 'kode 22xxx (Lift Penumpang, di luar 1/21) tidak ditawarkan sebagai bahan');
  h = await cari(0, 'excavator');
  ok(!h.some(t => /^49/.test(t)), 'Bahan tidak menawarkan kode Service (49xxx)');

  console.log('3. Alat — Master Service 49xxx');
  await pg.click('#mp268Pilih [data-j=ALAT]');
  const thA = await pg.$$eval('#tab-form-bon thead th', t => t.slice(1, 3).map(x => x.textContent).join());
  h = await cari(0, 'excavator');
  ok(thA === 'Nama Alat (sewa),Kode Service' && h.length && h.every(t => /^49\d{6}/.test(t)) && /^49000000 /.test(h[0]), 'Alat: cari "excavator" → ' + h.length + ' hasil, semua 49xxx (pertama ' + h[0].slice(0, 28) + '…)');
  await pilih(0, 0);
  let r0 = await pg.evaluate(() => ({ kode: pmtId('pmKode0').value, sat: pmtId('pmSat0').value, bdg: pmtId('pmJenis0').textContent.trim() }));
  ok(r0.kode === '49000000' && r0.sat && /Alat/.test(r0.bdg), 'dipilih → kode 49000000, satuan ' + r0.sat + ', lencana "' + r0.bdg + '"; tetap setelah keluar kolom');

  console.log('4. Sub — Master Service 29xxx / 39xxx');
  await pg.click('#mp268Pilih [data-j=SUB]');
  h = await cari(1, 'bekisting');
  ok(h.length && h.every(t => /^(29|39)\d{6}/.test(t)) && /^29000000 /.test(h[0]), 'Sub: cari "bekisting" → ' + h.length + ' hasil, hanya 29xxx / 39xxx (pertama ' + h[0].slice(0, 26) + '…)');
  h = await cari(1, 'perancah finishing');
  ok(h.length && h.every(t => /^(29|39)\d{6}/.test(t)) && h.some(t => /^39000001 /.test(t)), 'Sub: cari "perancah finishing" → subkon 39000001 ditawarkan');
  await pilih(1, h.findIndex(t => /^39000001 /.test(t)));
  const r1 = await pg.evaluate(() => pmtId('pmKode1').value);
  ok(/^39/.test(r1) && await pg.evaluate(() => /1 baris berjenis lain \(Alat\)/.test(document.getElementById('mp268Pilih').textContent)), 'baris 2 = ' + r1 + '; info: 1 baris berjenis lain (Alat) tetap tersimpan');
  ok(await pg.evaluate(() => /0 bahan · 1 alat · 1 sub/.test(document.getElementById('pmRingkas').textContent)), 'ringkasan: 0 bahan · 1 alat · 1 sub');

  console.log('5. Master tambahan');
  await pg.evaluate(() => { MASTER_SERVICES.push({ code: 'CUST-S-0001', desc: 'Sewa Crane Uji Tambahan', unit: 'HARI', category: 'Sewa Alat', group: 'TAMBAHAN', _mp214: true }); MASTER_SERVICES.push({ code: '39990001', desc: 'Subkon Uji Tambahan', unit: 'LS', category: 'Subkon', group: 'TAMBAHAN', _mp214: true }); });
  h = await cari(2, 'uji tambahan');
  ok(h.length === 1 && /39990001/.test(h[0]), 'Sub: master tambahan berkode 39xxx ikut; Sewa Crane (kategori alat) tidak');
  await pg.click('#mp268Pilih [data-j=ALAT]'); h = await cari(2, 'uji tambahan');
  ok(h.length === 1 && /Sewa Crane Uji Tambahan/.test(h[0]), 'Alat: master tambahan CUST- berkategori "Sewa Alat" ikut');
  await pg.fill('#pmNama2', ''); await pg.dispatchEvent('#pmNama2', 'input');

  console.log('6. Simpan ke server (kernel 2.5.1 asli)');
  await pg.fill('#pm_noUrut', '3'); await pg.selectOption('#pm_dept', 'Pelaksana'); await pg.fill('#pm_peminta', 'Andi'); await pg.fill('#pm_keperluan', 'Sewa alat & subkon bekisting');
  await pg.fill('#pmVol0', '24'); await pg.fill('#pmHarga0', '350000'); await pg.fill('#pmVol1', '120'); await pg.fill('#pmHarga1', '95000');
  await pg.screenshot({ path: OUT + '/bon-jenis.png' });
  await pg.click('#btnSimpanPmt'); await pg.waitForFunction(() => PMT.data.length === 3);
  const srv = STF('baca', { jenis: 'permintaan' }).data.find(p => p.noUrut === 3);
  ok(srv && srv.items.map(i => i.kode).join() === '49000000,' + r1 && !dialog.length, 'tersimpan di Sheets: ' + srv.nomor + ' · item ' + srv.items.map(i => i.kode).join(', ') + ' (tanpa konfirmasi "di luar master")');

  console.log('7. Daftar Permintaan');
  const chip = async () => pg.$$eval('#mp268Daftar .reg-chip', a => a.map(x => x.textContent.replace(/\s+/g, '')));
  ok((await chip()).join() === 'Semuajenis3,Bahan1,Alat2,Sub1', 'filter jenis: Semua 3 · Bahan 1 · Alat 2 · Sub 1 (Bon lama 001 = Bahan)');
  await pg.click('#mp268Daftar .reg-chip:nth-child(3)');
  const rows = await pg.$$eval('#pmDaftar tr', a => a.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(rows.length === 2 && rows.every(t => /Alat/.test(t)) && !rows.some(t => /^ ?001/.test(t)), 'filter Alat → 2 Bon ber-lencana Alat; Bon 001 tidak tampil');
  ok(await pg.$$eval('#pmDaftar .mp214-al-btn', a => a.length === 2), 'tombol alokasi WBS (2.1.4) tetap ada di setiap baris');
  await pg.click('#mp268Daftar .reg-chip:nth-child(1)');

  console.log('8. Ubah Bon lama & cetak');
  const id2 = await pg.evaluate(() => PMT.data.find(p => p.noUrut === 2).id), id1 = await pg.evaluate(() => PMT.data.find(p => p.noUrut === 1).id);
  await pg.evaluate(id => editPermintaan(id), id2);
  ok(await pg.evaluate(() => MP268.jenis === 'ALAT' && document.querySelector('#mp268Pilih .aktif').dataset.j === 'ALAT'), 'ubah Bon 002 (excavator) → jenis otomatis Alat');
  await pg.evaluate(id => editPermintaan(id), id1);
  ok(await pg.evaluate(() => MP268.jenis === 'BAHAN'), 'ubah Bon 001 (dibuat sebelum 2.6.8) → Bahan');
  await pg.evaluate(() => resetFormPermintaan());
  const cetak = await pg.evaluate(id => dokumenPermintaan(PMT.data.find(p => p.id === id), false, {}), await pg.evaluate(() => PMT.data.find(p => p.noUrut === 3).id));
  const cetak1 = await pg.evaluate(id => dokumenPermintaan(PMT.data.find(p => p.id === id), false, {}), id1);
  ok(/<span class="off">Material<\/span> \/ <span class="on">Alat<\/span> \/ <span class="on">Tenaga \(Sub\)<\/span>/.test(cetak) && /<span class="on">Material<\/span> \/ <span class="off">Alat<\/span>/.test(cetak1), 'cetak formulir: Bon 003 → Alat & Tenaga (Sub) dicentang; Bon 001 → Material');

  console.log('9. Tampilan');
  await pg.setViewportSize({ width: 390, height: 820 }); await pg.waitForTimeout(200);
  const bx = await pg.evaluate(() => { const r = document.getElementById('mp268Pilih').getBoundingClientRect(); return { l: r.left, r: r.right, vw: innerWidth }; });
  ok(bx.l >= 0 && bx.r <= bx.vw, 'pilihan jenis muat di layar HP 390 px (bertumpuk)');
  await pg.evaluate(() => { document.querySelectorAll('.toast-x').forEach(x => x.remove()); document.getElementById('mp268Pilih').scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(200);
  await pg.screenshot({ path: OUT + '/bon-jenis-hp.png' });
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji UI Bon jenis (paket ' + C.__pkt.versi + ')');
})().catch(e => { console.error(e); process.exit(1); });
