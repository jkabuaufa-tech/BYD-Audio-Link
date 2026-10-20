// Uji UI 2.5.9 bagian B di Chromium: regPost tahan gangguan sesaat Google ("halaman HTML … HTTP 404 Drive" / "HTTP 200 … otorisasi")
// pada aksi apa pun (mis. modulInfo = "Gagal membaca status modul"). Blok MP259 ASLI dari paket; regPost 2.1.6 ditiru (pesan sama persis).
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const js = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.argv[2] || 'pembaruan-2.5.9.json'), 'utf8')).js;
const mp259 = js.slice(js.indexOf('/* MP259 — PEMBARUAN 2.5.9')); assert.ok(mp259.length > 1000);
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage(); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ body: '<!doctype html><html><body></body></html>', contentType: 'text/html' }));
  await pg.route('https://srv-*/**', r => /srv-hidup/.test(r.request().url()) ? r.fulfill({ body: JSON.stringify({ ok: true, versiServer: '2.5.1', modul: { versi: '1.8.6' } }), contentType: 'application/json' }) : r.fulfill({ status: 404, body: '<html>Drive</html>' }));
  await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    const H404 = 'Server mengirim halaman HTML, bukan data (HTTP 404). Alamat server tidak valid atau deployment diarsipkan → pakai URL /exec terbaru. Detail: Halaman Tidak Ditemukan Drive Maaf, saat ini tidak dapat membuka file.';
    const H200 = 'Server mengirim halaman HTML, bukan data (HTTP 200). Script belum diotorisasi ulang → buka editor Apps Script, jalankan fungsi setup lalu Izinkan.';
    const S = window.__S = { gagal: {}, panggil: [], aktif: 0, puncak: 0, lambat: 0 };
    window.REG = { url: 'https://srv-hidup/exec', sesi: { nama: 'Joko', admin: true } };
    // regPost 2.1.6 (lapisan dalam): galat HTML → {ok:false, error} (tidak throw)
    window.regPost = async body => { S.panggil.push(body.action); S.aktif++; S.puncak = Math.max(S.puncak, S.aktif);
      await new Promise(r => setTimeout(r, S.lambat)); S.aktif--;
      const g = S.gagal[body.action]; if (g && g.n > 0) { g.n--; return { ok: false, error: g.jenis === 200 ? H200 : H404 }; }
      return { ok: true, data: body.action }; };
    window.regAksi = async (a, x) => { const r = await regPost(Object.assign({ action: a }, x || {})); if (!r.ok) throw new Error(r.error); return r; };   // = regAksi dasar
  });
  await pg.addScriptTag({ content: mp259 });
  const jalan = (kode) => pg.evaluate(async kode => { const S = window.__S; S.panggil = []; S.puncak = 0; S.lambat = 0; return await (new Function('S', 'return (async () => {' + kode + '})()'))(S); }, kode);

  console.log('1. "Gagal membaca status modul" (modulInfo HTML 404) → diulang otomatis');
  let h = await jalan("S.gagal.modulInfo = { n: 2 }; const r = await regAksi('modulInfo'); return { r: r.data, p: S.panggil };");
  ok(h.r === 'modulInfo' && h.p.join() === 'modulInfo,modulInfo,modulInfo', 'gagal 2× lalu berhasil pada percobaan ke-3 — panel Modul server tampil');
  h = await jalan("S.gagal.checklistRingkas = { n: 1, jenis: 200 }; const r = await regAksi('checklistRingkas'); return { r: r.data, p: S.panggil };");
  ok(h.r === 'checklistRingkas' && h.p.length === 2, 'HTTP 200 "otorisasi" sesaat pada aksi baca juga diulang');
  console.log('2. Tetap gagal → pesan menyebut sebab sebenarnya');
  h = await jalan("S.gagal.modulInfo = { n: 9 }; try { await regAksi('modulInfo'); } catch (e) { return { m: e.message, p: S.panggil.length }; }");
  ok(h.p === 3 && /Server AKTIF \(ping v2\.5\.1 · modul 1\.8\.6 berhasil\), jadi alamat \/exec & deployment BENAR/.test(h.m) && /dicoba ulang otomatis 2×/.test(h.m) && !/deployment diarsipkan/.test(h.m) && /Halaman Tidak Ditemukan Drive/.test(h.m), 'ping berhasil → "server aktif, alamat & deployment benar, gangguan sesaat" (tanpa saran URL yang menyesatkan), detail asli tetap');
  h = await jalan("S.gagal.modulInfo = { n: 9 }; REG.url = 'https://srv-mati/exec'; window.MP259_ANTREAN.pingPada = 0; try { await regAksi('modulInfo'); } catch (e) { REG.url = 'https://srv-hidup/exec'; window.MP259_ANTREAN.pingPada = 0; return { m: e.message }; }");
  ok(/deployment diarsipkan/.test(h.m) && /Tes ping server juga gagal/.test(h.m), 'ping gagal → pesan asli + langkah memperbaiki URL /exec');
  console.log('3. Aksi tulis & AI berbiaya TIDAK diulang (cegah data ganda / biaya)');
  h = await jalan("S.gagal = { savePBJ: { n: 1 }, gudangKeluarSimpan: { n: 1 }, aiTanya: { n: 1 }, vtBundel: { n: 1 } }; const o = {}; for (const a of ['savePBJ', 'gudangKeluarSimpan', 'aiTanya', 'vtBundel']) { try { await regAksi(a); o[a] = 'ok'; } catch (e) { o[a] = e.message; } } return { o, p: S.panggil };");
  ok(h.p.join() === 'savePBJ,gudangKeluarSimpan,aiTanya,vtBundel', 'masing-masing hanya 1 kali dikirim');
  ok(/Aksi simpan tidak diulang otomatis: muat ulang data dahulu/.test(h.o.savePBJ), 'pesan simpan: periksa dulu apakah sudah tersimpan sebelum simpan lagi');
  console.log('4. Antrean: maksimal 4 permintaan bersamaan, semua selesai');
  h = await jalan("S.gagal = {}; S.lambat = 120; const L = ['baca','bacaSemua','checklistRingkas','vtRingkas','notifInfo','modulInfo','manifestBaca','identitasBaca','diagServer','arsipBaca']; const r = await Promise.all(L.map(a => regAksi(a))); return { n: r.length, puncak: S.puncak, sisa: window.MP259_ANTREAN.aktif + window.MP259_ANTREAN.antre.length };");
  ok(h.n === 10 && h.puncak === 4 && h.sisa === 0, '10 permintaan serentak → puncak 4 bersamaan, semua berhasil, antrean kosong lagi');
  h = await jalan("S.lambat = 300; const t = [regAksi('aiTanya'), regAksi('timJalan'), regAksi('vtEkstrak'), regAksi('vtBundel'), regAksi('aiAksi')]; await new Promise(r => setTimeout(r, 50)); const ant = window.MP259_ANTREAN.aktif; await Promise.all(t); return { ant, puncak: S.puncak };");
  ok(h.ant === 0 && h.puncak === 5, 'panggilan AI yang lama tidak menempati/menahan antrean');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' cek');
})().catch(e => { console.error(e); process.exit(1); });
