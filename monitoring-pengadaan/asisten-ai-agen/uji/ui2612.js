// Uji 2.6.12: Paket PBJ — calon vendor hanya dari Master Data › Vendor (dipilih manual). PBJ Studio ASLI dari paket (PBJ_HTML + PBJ_TEMA +
// PBJ_PASCA) dimuat dalam iframe seperti di aplikasi; host __PBJ_HOST.cariVendor memakai kode host ASLI 2.6.12 (dijalankan dengan data Master tiruan).
const { chromium } = require('playwright'), fs = require('fs'), vm = require('vm'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const js = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.12.json', 'utf8')).js;
const str = nama => { const i = js.indexOf('const ' + nama + ' = "') + ('const ' + nama + ' = ').length; let j = i + 1; while (js[j] !== '"') j += js[j] === '\\' ? 2 : 1; return JSON.parse(js.slice(i, j + 1)); };
const PBJ_HTML = str('PBJ_HTML'), PBJ_PASCA = str('PBJ_PASCA'), PBJ_TEMA = (() => { try { return str('PBJ_TEMA'); } catch (e) { return ''; } })();
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
console.log('1. Host: cariVendor("*") = seluruh Master Data › Vendor');
const a = js.indexOf('window.__PBJ_HOST.cariVendor = q => {'), b = js.indexOf('return semua ? out : out.slice(0, 25);', a), kode = js.slice(a, js.indexOf('};', b) + 2);
const MASTER_VENDORS = [];
for (let i = 1; i <= 60; i++) MASTER_VENDORS.push({ id: String(2100000000 + i), name: 'Vendor Baku ' + i + (i === 7 ? ' Mandala Beton' : ''), city: 'Jakarta' });
const sb = { window: { __PBJ_HOST: {} }, lower: s => String(s || '').toLowerCase(), MASTER_VENDORS, profilVendor: (id, n) => ({ alamat: 'Jl. Contoh ' + id, nama: 'Pimpinan ' + id, jabatan: 'Direktur' }),
  MP: { master: [{ jenis: 'VENDOR', nama: 'CV Mandala Tambahan', kode: 'CUST-V001', detail: { kodeSAP: '', kota: 'Bekasi', npwp: '01.234' } }, { jenis: 'MATERIAL', nama: 'Besi', kode: 'CUST-M1', detail: {} }] },
  aktifMaster: () => true, detailMaster: m => m.detail || {} };
vm.createContext(sb); vm.runInContext(kode, sb);
const cari = sb.window.__PBJ_HOST.cariVendor;
ok(cari('*').length === 61 && cari('ma').length <= 25 && cari('a').length === 0, 'cari("*") = 61 vendor (60 baku + 1 tambahan, tanpa batas 25); pencarian biasa tetap ≤ 25');
const HOSTDATA = cari('*').map((v, i) => i === 2 ? Object.assign({}, v, { sumber: v.sumber + ' · ⚠ BLACKLIST WAVE' }) : i === 3 ? Object.assign({}, v, { sumber: v.sumber + ' · WAVE Rekanan Terdaftar', npwp: '02.111' }) : v);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const gal = [];
  async function buka(opsi) {
    const pg = await br.newPage({ viewport: { width: 1360, height: 900 } }); pg.on('pageerror', e => gal.push(e.message));
    await pg.setContent('<!doctype html><html><body style="margin:0"><iframe id="pbjFrame" style="width:100%;height:880px;border:0"></iframe></body></html>');
    await pg.evaluate(([data, baca]) => { window.__berubah = 0; window.__PBJ_HOST = { info: () => ({ id: '1726012', nama: 'Perkuatan Dermaga Barat JICT', unit: 'Infrastruktur 1', kasi: 'Joko Supriyono' }), hanyaBaca: () => baca, simpan() { }, berubah() { window.__berubah++; }, tarikBon() { }, cariVendor: q => q === '*' ? data : [] }; }, [HOSTDATA, !!opsi.baca]);
    const pra = '<script>window.__PBJ_ID="' + (opsi.id || 'baru') + '";window.__PBJ_AWAL=' + (opsi.awal ? opsi.awal : 'null') + ';window.__PBJ_BARU=' + !(opsi.awal || opsi.lama) + ';window.__PBJ_BON_AWAL=[];window.__PBJ_NAMA="";<\/script>';
    const html = PBJ_HTML.replace('<!--@@PRA@@-->', pra).replace('<!--@@TEMA@@-->', '<style>' + PBJ_TEMA + '</style>').replace('<!--@@PASCA@@-->', '<script>' + PBJ_PASCA + '<\/script>');
    await pg.evaluate(h => { document.getElementById('pbjFrame').srcdoc = h; }, html);
    await pg.waitForFunction(() => { const d = document.getElementById('pbjFrame').contentDocument; return d && d.readyState === 'complete' && d.body && d.body.childElementCount > 0; });
    const f = pg.frames()[1]; await f.waitForFunction(() => typeof S !== 'undefined' && typeof FORMS !== 'undefined' && typeof render === 'function'); return { pg, f };
  }
  console.log('2. Paket baru');
  let { pg, f } = await buka({});
  ok(await f.evaluate(() => S.vendors.length === 0 && S.pemb.every(x => !x)), 'paket baru: database vendor paket KOSONG (tanpa 15 vendor contoh)');
  await f.evaluate(() => { VIEW = 's2'; render(); }); await f.waitForSelector('.mpv-panel');
  const t2 = await f.evaluate(() => ({ pilih: !!document.querySelector('.mpv-panel'), lama: [...document.querySelectorAll('.panel h3')].some(h => /Tambah vendor dari Master/.test(h.textContent)), plus: !!document.querySelector('[data-act=addVendor]'), csv: !!document.querySelector('[data-act=impCsv]'), baris: document.querySelectorAll('#mpvDaftar tr').length - 1, judul: [...document.querySelectorAll('.panel h3')].some(h => /Calon vendor paket/.test(h.textContent)) }));
  ok(t2.pilih && !t2.lama && t2.baris === 61, 'Tahap 2: panel "Pilih calon vendor dari Master Data › Vendor" berisi 61 vendor Master (panel cari lama diganti)');
  ok(!t2.plus && !t2.csv && t2.judul, 'tombol "+ Vendor" (ketik bebas) & "Impor CSV" tidak tersedia; daftar bernama "Calon vendor paket (dari Master Data)"');
  ok(await f.evaluate(() => document.querySelectorAll('#mpvDaftar input.mpv-cb:disabled').length === 1 && /Blacklist WAVE/.test(document.getElementById('mpvDaftar').textContent)), 'vendor Blacklist WAVE ditandai & tidak dapat dicentang');
  await f.fill('#mpvCari', 'mandala');
  ok(await f.evaluate(() => document.querySelectorAll('#mpvDaftar tr').length - 1) === 2, 'saring "mandala" → 2 vendor (baku & tambahan)');
  await f.check('#mpvDaftar input.mpv-cb >> nth=0'); await f.check('#mpvDaftar input.mpv-cb >> nth=1');
  await f.fill('#mpvCari', ''); await f.check('#mpvDaftar tr:nth-child(5) input.mpv-cb');
  await pg.screenshot({ path: OUT + '/pbj-calon-vendor-master.png', clip: { x: 0, y: 0, width: 1360, height: 760 } });
  await f.click('[data-act=mpvTambah]');
  const s1 = await f.evaluate(() => ({ v: S.vendors.map(v => v.nama + '|' + v.kodeMaster + '|' + (v.wave || '')), p: S.pemb.filter(Boolean) }));
  ok(s1.v.length === 3 && s1.p.length === 3 && s1.v.some(x => /^CV Mandala Tambahan\|/.test(x)) && s1.v.some(x => /Mandala Beton\|2100000007/.test(x)), 'centang 3 → masuk database paket (dengan kode Master) & langsung menjadi peserta P1–P3');
  ok(s1.v.some(x => /\|Rekanan Terdaftar$/.test(x)) && await pg.evaluate(() => window.__berubah > 0), 'status WAVE ikut tercatat; aplikasi diberi tahu ada perubahan (Simpan ke server)');
  ok(await f.evaluate(() => [...document.querySelectorAll('#mpvDaftar input.mpv-cb:disabled')].length === 4 && /sudah dipilih/.test(document.getElementById('mpvDaftar').textContent)), 'vendor yang sudah dipilih ditandai "sudah dipilih" (tidak bisa dobel)');
  ok(await f.evaluate(() => { const n = S.vendors.length; const b = document.createElement('button'); b.dataset.act = 'addVendor'; document.body.appendChild(b); b.click(); b.remove(); return S.vendors.length === n; }), 'aksi "+ Vendor" bebas diblok (calon vendor wajib dari Master)');
  await pg.close();

  console.log('3. Paket lama berisi vendor contoh');
  ({ pg, f } = await buka({ id: 'PBJ-LAMA', lama: true }));   // paket tersimpan (bukan baru) → vendor contoh tidak dikosongkan otomatis
  const n0 = await f.evaluate(() => { const s = demoState(); s.pemb = [s.vendors[0].nama, s.vendors[1].nama, '']; s.pemenang = '';
    s.items.forEach(it => ['awal', 'final'].forEach(k => Object.keys(it[k] || {}).forEach(id => { if (!['v1', 'v2', 'v3'].includes(id)) delete it[k][id]; })));
    S = normalize(s); return S.vendors.length; });
  await f.evaluate(() => { VIEW = 's2'; render(); }); await f.waitForSelector('.mpv-panel');
  const ban = await f.evaluate(() => (document.querySelector('.mpv-panel .alert') || {}).textContent || '');
  ok(n0 > 3 && /vendor contoh bawaan PBJ Studio/.test(ban), 'paket lama: ' + n0 + ' vendor (contoh) TIDAK dihapus otomatis; muncul peringatan + tombol "Hapus vendor contoh"');
  await f.click('[data-act=mpvBuangContoh]');
  const s2 = await f.evaluate(() => ({ n: S.vendors.length, nama: S.vendors.map(v => v.nama), pemb: S.pemb.filter(Boolean) }));
  ok(s2.n === 3 && s2.pemb.length === 2 && s2.pemb.every(p => s2.nama.includes(p)), 'hapus → hanya vendor contoh yang BELUM dipakai yang dihapus (peserta & vendor berharga tetap: ' + s2.n + ')');
  await pg.close();

  console.log('4. Mode lihat saja');
  ({ pg, f } = await buka({ baca: true }));
  await f.evaluate(() => { VIEW = 's2'; render(); });
  ok(await f.evaluate(() => !document.querySelector('.mpv-panel')), 'akun LIHAT / paket batal: pemilih tidak tampil');
  await pg.close();
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji 2.6.12 (PBJ calon vendor dari Master)');
})().catch(e => { console.error(e); process.exit(1); });
