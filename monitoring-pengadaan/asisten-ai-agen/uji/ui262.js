// Uji UI 2.6.2 di Chromium — rantai ASLI paket: regPost 2.1.6 → MP259 (A+B) → MP261 → MP262, fetch tiruan mengirim halaman Google
// persis seperti yang dilaporkan (HTTP 404 Drive, HTTP 200 halaman galat) & jawaban JSON Code.gs 2.5.2 (kode KUOTA / GOOGLE).
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.2.json', 'utf8')), js = PK.js, css = PK.css;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const r216 = potong('    /* ---------- 2.1.6: respons server bukan JSON', '\n    })();\n') + '\n    })();\n';
const mp259 = potong('/* MP259 — PEMBARUAN 2.5.9', '/* MP260 — PEMBARUAN'), mp261 = potong('/* MP261 — PEMBARUAN 2.6.1', '/* MP262 — PEMBARUAN'), mp262 = potong('/* MP262 — PEMBARUAN 2.6.2');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const DRIVE404 = '<html><head><title>Halaman Tidak Ditemukan</title></head><body>Google Drive Maaf, saat ini tidak dapat membuka file. Periksa alamatnya, lalu coba lagi. Selesaikan berbagai hal dengan Google Drive</body></html>';
const GALAT200 = '<html><head><title>Error</title></head><body><div>Maaf, tidak dapat membuka file saat ini.</div><div>Anda memerlukan izin? Kebijakan Privasi</div></body></html>';
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1200, height: 800 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui}${css}</style></head><body><div class="menu-akun"><ul class="dropdown-menu"><li><a id="mp220MenuDiag">Diagnostik sistem</a></li></ul></div></body></html>` }));
  await pg.goto('https://app.test/');
  await pg.evaluate(([DRIVE404, GALAT200]) => {
    const S = window.__S = { skenario: {}, log: [], notif: [], muat: 0 };
    window.REG = { url: 'https://srv.test/exec', sesi: { nama: 'Joko', peran: 'PENGADAAN', proyek: '1726012', admin: true }, versiServer: '2.5.2', dataSiap: true };
    window.notif = (m, t) => S.notif.push([m, t]); window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.fetch = async (url, o) => {
      if (!o || o.method !== 'POST') return new Response(JSON.stringify({ ok: true, versiServer: '2.5.2', modul: { versi: '1.8.10' } }), { status: 200 });   // ping
      const b = JSON.parse(o.body), a = b.action; S.log.push(a);
      const sk = S.skenario[a]; const j = sk && sk.length ? sk.shift() : null;
      if (j === '404') return new Response(DRIVE404, { status: 404 });
      if (j === '200') return new Response(GALAT200, { status: 200 });
      if (j === 'KUOTA') return new Response(JSON.stringify({ ok: false, kode: 'KUOTA', error: 'Kuota harian layanan Google untuk server ini sedang habis (Service invoked too many times for one day: properties get.). Pulih otomatis oleh Google (paling lama 24 jam).' }), { status: 200 });
      if (j === 'GOOGLE') return new Response(JSON.stringify({ ok: false, kode: 'GOOGLE', error: 'Gangguan sementara layanan Google (Service Spreadsheets timed out while accessing document). Data aman; coba lagi beberapa saat.' }), { status: 200 });
      if (a === 'gudangBacaHal') return new Response(JSON.stringify({ ok: true, jenis: b.jenis, mulai: b.mulai, berikut: b.mulai + 3, total: 3, selesai: true, data: [{ id: b.jenis + 1 }, { id: b.jenis + 2 }, { id: b.jenis + 3 }], batasDiminta: b.batas }), { status: 200 });
      if (a === 'ambilBerkas') return new Response(JSON.stringify({ ok: true, data: btoa('%PDF-1.4') }), { status: 200 });
      return new Response(JSON.stringify({ ok: true, data: a }), { status: 200 });
    };
    window.regPost = async body => ({ ok: false, error: 'mode lokal' });
    window.regAksi = async (a, x) => { const r = await regPost(Object.assign({ action: a }, x || {})); if (!r.ok) throw new Error(r.error); return r; };
    window.muatRegister = async () => { S.muat++; };
  }, [DRIVE404, GALAT200]);
  for (const b of [r216, mp259, mp261, mp262]) await pg.addScriptTag({ content: b });
  const jalan = kode => pg.evaluate(async kode => { const S = window.__S; S.log = []; return await (new Function('S', 'return (async () => {' + kode + '})()'))(S); }, kode);

  console.log('1. Pesan galat tidak lagi menyesatkan');
  let h = await jalan("S.skenario.modulInfo = ['404','404','404','404','404','404']; try { await regAksi('modulInfo'); } catch (e) { return { m: e.message, n: S.log.length }; }");
  ok(!/deployment diarsipkan|pakai URL \/exec terbaru/.test(h.m) && /Server AKTIF \(ping v2\.5\.2 · modul 1\.8\.10 berhasil\)/.test(h.m) && /alamat \/exec & deployment BENAR/.test(h.m), 'HTTP 404 Drive: tidak lagi "deployment diarsipkan" → "server aktif, alamat & deployment benar"');
  ok(h.n >= 3, 'dibaca ulang otomatis (' + h.n + ' percobaan termasuk ulangan lapisan 2.1.6)');
  await pg.evaluate(() => { MP259_ANTREAN.jedaSampai = 0; });
  h = await jalan("S.skenario.notifInfo = ['200','200','200','200','200','200']; try { await regAksi('notifInfo'); } catch (e) { return { m: e.message }; }");
  ok(!/belum diotorisasi|jalankan fungsi setup/.test(h.m) && /HTTP 200/.test(h.m), 'HTTP 200 halaman galat yang memuat kata "izin": tidak lagi dianggap "Script belum diotorisasi"');
  console.log('2. Jeda pemulihan setelah Google menolak');
  h = await pg.evaluate(() => ({ jeda: Math.round((MP259_ANTREAN.jedaSampai - Date.now()) / 1000) }));
  ok(h.jeda > 20 && h.jeda <= 30, 'pembacaan latar dijeda ±30 dtk (sisa ' + h.jeda + ' dtk) agar tidak memperparah beban');
  h = await jalan("const t0 = Date.now(); await regAksi('ambilBerkas', { id: 'PO-1' }); await regAksi('save', { data: {} }); return { dt: Date.now() - t0 };");
  ok(h.dt < 1000, 'buka PDF & simpanan tidak ikut dijeda (' + h.dt + ' ms)');
  h = await jalan("const t0 = Date.now(); const p = regAksi('checklistRingkas'); await new Promise(r => setTimeout(r, 400)); const blm = S.log.indexOf('checklistRingkas') < 0; MP259_ANTREAN.jedaSampai = Date.now(); await new Promise(r => setTimeout(r, 50)); return { blm };");
  ok(h.blm, 'pembacaan latar baru menunggu sampai jeda selesai');
  await pg.evaluate(() => { MP259_ANTREAN.jedaSampai = 0; });
  console.log('3. Jawaban JSON Code.gs 2.5.2');
  h = await jalan("S.skenario.checklistRingkas = ['GOOGLE']; const r = await regAksi('checklistRingkas'); return { r: r.data, n: S.log.length };");
  ok(h.r === 'checklistRingkas' && h.n === 2, 'kode GOOGLE (gangguan sementara) → diulang otomatis, berhasil');
  await pg.evaluate(() => { MP259_ANTREAN.jedaSampai = 0; });
  h = await jalan("S.skenario.vtRingkas = ['KUOTA']; let m = ''; try { await regAksi('vtRingkas'); } catch (e) { m = e.message; } return { m, n: S.log.length, notif: S.notif.filter(x => /Kuota harian/.test(x[0])).length, jeda: Math.round((MP259_ANTREAN.jedaSampai - Date.now()) / 1000) };");
  ok(h.n === 1 && /Kuota harian layanan Google/.test(h.m) && h.notif === 1 && h.jeda > 290, 'kode KUOTA → tidak diulang sia-sia, 1 pemberitahuan jelas, pembacaan latar dijeda 5 menit');
  await pg.evaluate(() => { MP259_ANTREAN.jedaSampai = 0; });
  console.log('4. Riwayat galat server');
  ok(await pg.evaluate(() => !!document.getElementById('mp262MenuGalat')), 'menu akun › "Riwayat galat server"');
  await pg.evaluate(() => mp262Galat()); await pg.waitForTimeout(150);
  const t = await pg.textContent('#mp262Galat');
  ok(/modulInfo/.test(t) && /notifInfo/.test(t) && /KUOTA/.test(t) && /vtRingkas/.test(t) && /HTTP 404/.test(t), 'tercatat: aksi, kode, pesan & durasi untuk 404, 200, KUOTA');
  await pg.screenshot({ path: OUT + '/262-riwayat-galat.png' });
  await pg.evaluate(() => document.querySelector('#mp262Galat').classList.remove('tampil'));
  console.log('5. Beban rutin berkurang');
  h = await jalan("const r = await regAksi('gudangBaca', {}); return { b: S.log, m: r.masuk.length };");
  ok(h.m === 3 && h.b.filter(x => x === 'gudangBacaHal').length === 2, 'data gudang: 1 permintaan per jenis (halaman 1.000 baris)');
  h = await pg.evaluate(async () => { const S = __S; S.muat = 0; await muatRegister(); await muatRegister(); await muatRegister(); const a = S.muat; await regAksi('save', { data: {} }); await muatRegister(); const b = S.muat; await muatRegister(true); const c = S.muat; REG.sesi.proyek = '9999'; await muatRegister(); const d = S.muat; REG.sesi.proyek = '1726012'; return { a, b, c, d }; });
  ok(h.a === 1 && h.b === 2 && h.c === 3 && h.d === 4, 'sinkron Register otomatis: 3 panggilan → 1; setelah simpan, muat paksa & ganti proyek tetap langsung');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' cek');
})().catch(e => { console.error(e); process.exit(1); });
