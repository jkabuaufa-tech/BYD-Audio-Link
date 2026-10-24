// Uji 2.6.12 di demo aplikasi lengkap (HTML dasar + paket + kernel Code.gs + modul 1.9.2): calon vendor Paket PBJ diisi manual dari
// Master Data › Vendor — paket baru tanpa vendor contoh; paket lama ber-vendor contoh dapat dibersihkan tanpa menyentuh vendor isian.
//   HTML_DASAR=…/index.html KODE_GS=…/Code.gs node uji/ui2612.js [pembaruan.json]     (pembaruan-2.6.11.json → memperlihatkan galat lama)
const { chromium } = require('playwright'), fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), { execFileSync } = require('child_process');
const R = path.join(__dirname, '..'), PAKET = process.argv[2] || 'pembaruan-2.6.12.json';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-')), F = path.join(TMP, 'demo.html');
execFileSync('python3', ['-I', path.join(R, 'demo/rakit_demo_app.py'), process.env.HTML_DASAR, process.env.KODE_GS, path.join(R, PAKET), F]);
const CONTOH = ['Cahaya Utama Safety Indonesia, PT', 'Surya Salim Sejahtera, PT', 'Membangun Indonesia Maju, PT', 'Pulau Indah Dirgantara, PT', 'Farika Steel, PT', 'Inti Teknik Solusi Cemerlang, PT', 'Karsa Buana Lestari, PT', 'Putra Paloh, CV'];
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1366, height: 900 } }), gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.route(/^https?:/, r => r.fulfill({ status: 204, body: '' }));
  await pg.goto('file://' + F, { timeout: 120000 });
  await pg.waitForFunction(() => typeof PEMB !== 'undefined' && PEMB.aktif && PMT.data.length >= 2 && REG.sesi, null, { timeout: 60000 }); await pg.waitForTimeout(2500);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const versi = await pg.evaluate(() => PEMB.aktif.versi);
  await pg.evaluate(() => window.demoMasuk && 0);   // tetap sebagai Admin (peran Pengadaan)
  const bingkai = () => pg.frames().find(f => f !== pg.mainFrame() && f.parentFrame() === pg.mainFrame() && f.url() === 'about:srcdoc') || pg.frames().find(f => f !== pg.mainFrame());
  const tunggu = async () => { await pg.waitForFunction(() => { const f = document.getElementById('pbjFrame'); return f && f.contentWindow && f.contentWindow.__pbjApi && PBJ.ed && PBJ.ed.siap; }, null, { timeout: 30000 }); await pg.waitForTimeout(1500); };
  const state = () => pg.evaluate(() => document.getElementById('pbjFrame').contentWindow.__pbjApi.ambilState());

  console.log('1. Paket PBJ baru');
  await pg.evaluate(() => { showTab('pbj'); window.pbjBaru(); });
  await tunggu();
  let s = await state();
  console.log('    paket ' + versi + ' baru: ' + s.vendors.length + ' vendor · pembanding ' + JSON.stringify(s.pemb) + ' · pemenang "' + s.pemenang + '"');
  ok(s.vendors.length === 0, 'paket baru: database vendor paket KOSONG (tidak ada vendor kontrak berjalan / vendor contoh)');
  ok(s.pemb.every(x => !x) && !s.pemenang && !Object.keys(s.nilai || {}).length, 'tanpa pembanding, pemenang & nilai evaluasi bawaan');
  const f = bingkai();
  await f.evaluate(() => { VIEW = 's2'; render(); });
  ok(/Belum ada calon vendor/.test(await f.textContent('#main')), 'Tahap 2: petunjuk "Belum ada calon vendor — pilih manual dari Master Data › Vendor"');

  console.log('2. Tambah calon vendor manual dari Master Data › Vendor');
  await f.fill('#mpCariV', 'mandala'); await f.click('button[data-act="mpCariV"]'); await pg.waitForTimeout(300);
  const hasil = await f.$$eval('#mpHasilV tr', a => a.slice(1).map(t => t.textContent.replace(/\s+/g, ' ').trim()));
  console.log('    hasil cari "mandala": ' + hasil.length + ' — ' + hasil.slice(0, 2).join(' | '));
  ok(hasil.length > 0 && hasil.every(t => /baku|Tambahan/i.test(t)), 'pencarian membaca Master Data › Vendor (sumber: baku / tambahan)');
  await f.click('#mpHasilV button[data-act="mpAmbilV"]'); await pg.waitForTimeout(300);
  await f.fill('#mpCariV', 'wika'); await f.click('button[data-act="mpCariV"]'); await pg.waitForTimeout(300);
  if (await f.$('#mpHasilV button[data-act="mpAmbilV"]')) await f.click('#mpHasilV button[data-act="mpAmbilV"]');
  await pg.waitForTimeout(300);
  s = await state();
  ok(s.vendors.length >= 1 && s.vendors.every(v => CONTOH.indexOf(v.nama) < 0 || !/^vendor[a-z]@email\.com$/.test(v.email || '')), 'calon vendor terisi hanya pilihan manual: ' + s.vendors.map(v => v.nama).join(', '));
  await pg.screenshot({ path: path.join(process.env.TANGKAPAN || TMP, 'pbj-calon-vendor.png') });
  await pg.evaluate(() => window.pbjSimpan()); await pg.waitForTimeout(1500);
  const srv = await pg.evaluate(() => { const r = window.DEMO_SERVER.kirim({ action: 'baca', jenis: 'pbj', nama: 'Joko Supriyono', pin: '1234', proyek: '1726012' }); const p = (r.data || []).slice(-1)[0]; return p && p.state ? p.state.vendors.map(v => v.nama) : null; });
  ok(srv && srv.length === s.vendors.length, 'tersimpan di server (sheet PBJ): ' + (srv || []).join(', '));

  console.log('3. Paket lama yang terlanjur berisi vendor contoh');
  // paket tersimpan dengan state lama (blankState sebelum 2.6.12 = 8 vendor contoh) + 1 vendor isian staf
  const idLama = await pg.evaluate(CONTOH => {
    const fr = document.getElementById('pbjFrame').contentWindow, st = fr.eval('blankState()');
    st.paket.nama = 'Paket lama (vendor contoh)'; st.vendors.push({ id: 'vStaf', nama: 'Vendor Isian Staf, CV', alamat: 'Jakarta', pimpinan: 'Budi', jabatan: 'Direktur', email: 'staf@contoh.co.id', telp: '021', npwp: '', kualifikasi: '', wave: '', plant: '', schedul: '', kirim: '', approval: '' });
    st.nilai.vStaf = st.nilai.v1.slice(); st.items[0].awal = { v1: 100, vStaf: 120 }; st.pemb = [CONTOH[0], 'Vendor Isian Staf, CV', CONTOH[1]];
    const r = window.DEMO_SERVER.kirim({ action: 'savePBJ', nama: 'Joko Supriyono', pin: '1234', proyek: '1726012', data: { nama: st.paket.nama, state: st, status: 'DRAF', tahap: 1 } });
    return r.ok ? r.data.id : r.error;
  }, CONTOH);
  await pg.evaluate(() => { window.pbjTutup && window.pbjTutup(); return muatRegister(true); }); await pg.waitForTimeout(1500);
  await pg.evaluate(id => { showTab('pbj'); window.pbjBuka(id); }, idLama);
  await tunggu();
  const f2 = bingkai(); await f2.evaluate(() => { VIEW = 's2'; render(); });
  const info = await f2.textContent('#main');
  ok(/8 vendor contoh bawaan PBJ Studio/.test(info) && !!(await f2.$('button[data-act="mp2612Hapus"]')), 'paket lama: pemberitahuan "8 vendor contoh bawaan" + tombol Hapus vendor contoh');
  await f2.click('button[data-act="mp2612Hapus"]'); await pg.waitForTimeout(500);
  s = await state();
  ok(s.vendors.length === 1 && s.vendors[0].nama === 'Vendor Isian Staf, CV' && s.items[0].awal.vStaf === 120 && !('v1' in s.items[0].awal) && s.pemb.join('|') === '|Vendor Isian Staf, CV|',
    'setelah hapus: tersisa vendor isian staf (harga 120 & pembanding tetap), vendor contoh + harga/nilainya hilang');
  ok(!(await f2.$('#mp2612Info')) || !/vendor contoh/.test(await f2.textContent('#mp2612Info')), 'pemberitahuan vendor contoh hilang');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log('\nLULUS ' + lulus + ' uji ' + versi + ' (calon vendor PBJ dari Master Data)');
})().catch(e => { console.error(e.message || e); process.exit(1); });
