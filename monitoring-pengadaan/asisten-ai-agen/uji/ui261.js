// Uji UI 2.6.1 di Chromium: blok MP259-B (hasil patch 2.6.1) + MP261 ASLI dari paket.
// "Server sedang sibuk" diulang otomatis (juga simpanan), buka PDF tidak menunggu antrean latar, PDF yang sama tidak diunduh ulang.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const js = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.1.json', 'utf8')).js;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const mpB = potong('/* MP259 bagian B', '/* MP260 — PEMBARUAN'), mp261 = potong('/* MP261 — PEMBARUAN 2.6.1'), css = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.1.json', 'utf8')).css;
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1100, height: 700 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ body: `<!doctype html><html><head><style>body{font-family:system-ui}${css}</style></head><body><p>aplikasi</p></body></html>`, contentType: 'text/html' }));
  await pg.route('https://srv/**', r => r.fulfill({ body: JSON.stringify({ ok: true, versiServer: '2.5.1' }), contentType: 'application/json' }));
  await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    const S = window.__S = { log: [], sibuk: {}, lambat: {}, aktif: 0, puncak: 0 };
    window.REG = { url: 'https://srv/exec', sesi: { nama: 'Joko', peran: 'PENGADAAN', proyek: '1726012' } };
    window.regPost = async body => {   // = regPost 2.1.6 + server: "Server sedang sibuk" dikirim sebagai {ok:false,error}
      const a = body.action; S.log.push([a, Date.now()]); S.aktif++; S.puncak = Math.max(S.puncak, S.aktif);
      await new Promise(r => setTimeout(r, S.lambat[a] || 30)); S.aktif--;
      if (S.sibuk[a] > 0) { S.sibuk[a]--; return { ok: false, error: 'Server sedang sibuk, coba lagi sebentar.' }; }
      if (a === 'saveKoreksi') return { ok: false, error: 'KONFLIK: data kontrak ini sudah diperbaiki oleh Rina. Muat ulang dulu.' };
      if (a === 'ambilBerkas') return { ok: true, nama: body.id + '.pdf', tipe: 'application/pdf', data: btoa('%PDF-1.4 ' + body.id) };
      return { ok: true, data: a };
    };
    window.regAksi = async (a, x) => { const r = await regPost(Object.assign({ action: a }, x || {})); if (!r.ok) throw new Error(r.error); return r; };
  });
  await pg.addScriptTag({ content: mpB }); await pg.addScriptTag({ content: mp261 });
  const jalan = kode => pg.evaluate(async kode => { const S = window.__S; S.log = []; S.puncak = 0; return await (new Function('S', 'return (async () => {' + kode + '})()'))(S); }, kode);

  console.log('1. "Server sedang sibuk" → simpanan diulang otomatis');
  let h = await jalan("S.sibuk.checklistSimpan = 2; const t0 = Date.now(); const p = regAksi('checklistSimpan', { data: { id: 'TB1' } }); await new Promise(r => setTimeout(r, 400)); const pill = document.querySelector('.mp261-status'); const tampil = !!pill && !pill.hidden && /mencoba lagi otomatis \\(1\\/3\\)/.test(pill.textContent); const r = await p; await new Promise(r => setTimeout(r, 400)); return { r: r.data, n: S.log.length, tampil, hilang: pill.hidden || !pill.classList.contains('tampil'), dtk: Date.now() - t0 };");
  ok(h.r === 'checklistSimpan' && h.n === 3, 'ditolak sibuk 2× → berhasil pada percobaan ke-3 tanpa tindakan pengguna');
  ok(h.tampil && h.hilang, 'penanda kecil "Server sedang memproses simpanan lain — mencoba lagi otomatis (1/3)…" tampil lalu hilang');
  await pg.evaluate(() => { __S.sibuk.save = 1; regAksi('save', {}); }); await pg.waitForTimeout(300); await pg.screenshot({ path: OUT + '/261-mencoba-lagi.png', clip: { x: 0, y: 560, width: 560, height: 140 } }); await pg.waitForTimeout(2500);
  h = await jalan("S.sibuk.save = 9; try { await regAksi('save', { data: { id: 'L1' } }); } catch (e) { return { m: e.message, n: S.log.length }; }");
  ok(h.n === 4 && /dicoba ulang otomatis 3×/.test(h.m) && /BELUM tersimpan/.test(h.m) && /isian Anda tetap di layar/.test(h.m), 'tetap sibuk → 4 percobaan (±13 dtk), pesan jelas: belum tersimpan, isian tetap, klik Simpan lagi');
  h = await jalan("S.sibuk = {}; try { await regAksi('saveKoreksi', {}); } catch (e) { return { m: e.message, n: S.log.length }; }");
  ok(h.n === 1 && /^KONFLIK/.test(h.m), 'galat lain (KONFLIK) tidak diulang');
  console.log('2. Buka PDF tidak menunggu antrean pembacaan latar');
  h = await jalan("S.lambat = { checklistRingkas: 1200, notifInfo: 1200, vtRingkas: 1200, gudangBacaHal: 1200, bacaSemua: 1200 }; const L = ['checklistRingkas','notifInfo','vtRingkas','gudangBacaHal','bacaSemua'].map(a => regAksi(a)); await new Promise(r => setTimeout(r, 50)); const t0 = Date.now(); await regAksi('ambilBerkas', { id: 'KONTRAK-027' }); const dt = Date.now() - t0; await Promise.all(L); S.lambat = {}; return { dt, puncak: S.puncak };");
  ok(h.dt < 400, 'PDF kontrak terbuka dalam ' + h.dt + ' ms walau 5 pembacaan latar sedang berjalan (dulu menunggu antrean ±1,2 dtk)');
  ok(h.puncak === 5, 'pembacaan latar tetap dibatasi 4 bersamaan (+1 PDF prioritas)');
  h = await jalan("S.lambat = { checklistRingkas: 800, notifInfo: 800, vtRingkas: 800, bacaSemua: 800 }; const L = ['checklistRingkas','notifInfo','vtRingkas','bacaSemua'].map(a => regAksi(a)); await new Promise(r => setTimeout(r, 50)); const t0 = Date.now(); await regAksi('save', { data: {} }); const dt = Date.now() - t0; await Promise.all(L); S.lambat = {}; return { dt };");
  ok(h.dt < 400, 'simpanan juga tidak menunggu antrean latar (' + h.dt + ' ms)');
  console.log('3. PDF yang sama tidak diunduh ulang');
  h = await jalan("const a = await regAksi('ambilBerkas', { id: 'PO-028' }); const b = await regAksi('ambilBerkas', { id: 'PO-028' }); return { n: S.log.filter(x => x[0] === 'ambilBerkas').length, sama: a.data === b.data && atob(b.data).startsWith('%PDF') };");
  ok(h.n === 1 && h.sama, 'buka ulang PDF → dari memori, tanpa unduh ulang');
  h = await jalan("S.lambat = { ambilBerkas: 300 }; const r = await Promise.all([regAksi('ambilBerkas', { id: 'BAP-9' }), regAksi('ambilBerkas', { id: 'BAP-9' }), regAksi('ambilBerkas', { id: 'BAP-9' })]); S.lambat = {}; return { n: S.log.filter(x => x[0] === 'ambilBerkas').length, ok: r.every(x => x.ok) };");
  ok(h.n === 1 && h.ok, '3 permintaan bersamaan untuk berkas yang sama → 1 unduhan');
  h = await jalan("REG.sesi.proyek = '9999999'; await regAksi('ambilBerkas', { id: 'PO-028' }); REG.sesi.proyek = '1726012'; return { n: S.log.filter(x => x[0] === 'ambilBerkas').length };");
  ok(h.n === 1, 'proyek lain → cache terpisah (berkas tidak tertukar antar proyek)');
  h = await jalan("for (let i = 0; i < 20; i++) await regAksi('ambilBerkas', { id: 'F' + i }); return { n: MP261_BERKAS.C.size };");
  ok(h.n === 16, 'memori dibatasi 16 berkas terakhir (yang lama dilepas)');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' cek');
})().catch(e => { console.error(e); process.exit(1); });
