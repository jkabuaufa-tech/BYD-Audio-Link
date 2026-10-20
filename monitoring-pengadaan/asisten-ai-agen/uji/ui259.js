// Uji UI 2.5.9 di Chromium: blok MP223 (gudang) & MP259 ASLI dari paket — data gudang dimuat bertahap, ulang otomatis,
// halaman diperkecil bila respons terlalu besar, server lama → gudangBaca lama + diagnosis yang tepat, tanpa aksi tulis.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const PK = JSON.parse(fs.readFileSync(__dirname + '/../' + (process.argv[2] || 'pembaruan-2.5.9.json'), 'utf8')), js = PK.js;
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const mp223 = potong('/* MP223 — PEMBARUAN 2.2.5', '/* MP224 — PEMBARUAN 2.2.5'), mp259 = potong('/* MP259 — PEMBARUAN 2.5.9');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage(); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ body: '<!doctype html><html><body><nav id="sidebar"><ul class="nav"></ul></nav><main><div class="content-tab" id="tab-dash">dasbor</div></main></body></html>', contentType: 'text/html' }));
  await pg.route('https://srv-*/**', r => { const u = r.request().url(); if (/action=ping/.test(u) && /srv-hidup|srv-baru|srv-lama/.test(u)) return r.fulfill({ body: JSON.stringify({ ok: true, versiServer: '2.5.1', modul: { versi: /srv-baru/.test(u) ? '1.8.7' : '1.8.6' } }), contentType: 'application/json' });
    return r.fulfill({ status: 404, body: '<html><title>Halaman Tidak Ditemukan</title>Drive Maaf, tidak dapat membuka file saat ini.</html>', contentType: 'text/html' }); });
  await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    const HTML404 = 'Server mengirim halaman HTML, bukan data (HTTP 404). Alamat server tidak valid atau deployment diarsipkan → pakai URL /exec terbaru. Detail: Halaman Tidak Ditemukan Drive Maaf, tidak dapat membuka file saat ini.';
    const masuk = Array.from({ length: 1730 }, (_, i) => ({ id: 'GR-MIG-' + i, kunci: 'K' + (i % 30), kode: 'K' + (i % 30), uraian: 'Material ' + (i % 30), sat: 'BH', tanggal: '2026-06-01', qty: 10, status: 'AKTIF' }));
    const keluar = Array.from({ length: 412 }, (_, i) => ({ id: 'GI-MIG-' + i, kunci: 'K' + (i % 30), kode: 'K' + (i % 30), uraian: 'Material ' + (i % 30), sat: 'BH', tanggal: '2026-07-01', qty: 1, status: 'AKTIF' }));
    const S = window.__S = { mode: 'baru', gagalSekali: {}, maksBatas: 1000, kirim: [] };
    window.REG = { url: 'https://srv-baru/exec', sesi: { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' } };
    window.PROYEK = { id: '1726012', nama: 'Rehab Irigasi' }; window.PMT = { data: [] }; window.MENU_CEPAT = [];
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.notif = () => { }; window.showTab = () => { }; window.bukaTab = () => { }; window.renderSemuaData = () => { }; window.itemCmdk = () => [];
    window.regAksi = async (a, x) => {   // = regAksi dasar: !ok → throw Error(error)
      S.kirim.push([a, JSON.parse(JSON.stringify(x || {}))]);
      let r;
      if (a === 'gudangBacaHal') {
        if (S.mode !== 'baru') r = { ok: false, error: 'Aksi tidak dikenal: gudangBacaHal' };
        else if (x.batas > S.maksBatas) r = { ok: false, error: HTML404 };   // respons terlalu besar → halaman Drive 404
        else { const k = x.jenis + '@' + x.mulai; if (S.gagalSekali[k]) { delete S.gagalSekali[k]; r = { ok: false, error: HTML404 }; }
          else { const L = x.jenis === 'masuk' ? masuk : keluar, b = Math.min(1000, x.batas || 250), n = Math.max(0, Math.min(b, L.length - x.mulai));
            r = { ok: true, versiServer: '2.5.1', jenis: x.jenis, mulai: x.mulai, berikut: x.mulai + n, total: L.length, selesai: x.mulai + n >= L.length, data: JSON.parse(JSON.stringify(L.slice(x.mulai, x.mulai + n))) }; } }
      } else if (a === 'gudangBaca') r = S.mode === 'lamaKecil' || (x && x.cari) ? { ok: true, masuk: masuk.slice(0, 5), keluar: [] } : { ok: false, error: HTML404 };
      else if (a === 'gudangKeluarSimpan') r = { ok: true, data: Object.assign({ id: 'GI-BARU' }, x.data) };
      else r = { ok: false, error: 'aksi tidak dikenal: ' + a };
      if (!r.ok) throw new Error(r.error); return r;
    };
  });
  await pg.addScriptTag({ content: mp223 }); await pg.addScriptTag({ content: mp259 });
  const muat = async (url, mode, siapkan) => pg.evaluate(async ([url, mode, siapkan]) => {
    const S = window.__S; S.mode = mode; S.kirim = []; S.maksBatas = 1000; S.gagalSekali = {}; if (siapkan) new Function('S', siapkan)(S);
    REG.url = url; MP223.gagal = 0; await mp223Muat(true); for (let i = 0; i < 200 && MP223.muat; i++) await new Promise(r => setTimeout(r, 50));
    return { siap: MP223.siap, galat: MP223.galat, dukung: MP223.dukung, m: MP223.masuk.length, k: MP223.keluar.length, uniq: new Set(MP223.masuk.map(r => r.id)).size, kirim: S.kirim.map(z => z[0] + (z[1].jenis ? ':' + z[1].jenis + '@' + z[1].mulai + '/' + z[1].batas : '')), g: window.MP259_GUDANG.dukung, batas: window.MP259_GUDANG.batas };
  }, [url, mode, siapkan || '']);

  console.log('1. Server modul 1.8.7: data gudang dimuat bertahap');
  let h = await muat('https://srv-baru/exec', 'baru');
  ok(h.siap && !h.galat && h.m === 1730 && h.k === 412 && h.uniq === 1730, 'gudang tampil: 1.730 GR + 412 GI lengkap tanpa ganda (gudangBaca utuh yang 404 tidak dipakai)');
  ok(h.kirim.every(a => /^gudangBacaHal:/.test(a)) && h.kirim.length === 7 + 2 && h.g === true, '9 permintaan gudangBacaHal @250 baris (7 GR + 2 GI), tanpa gudangBaca utuh');
  console.log('2. Satu halaman gagal sesaat (HTML 404) → diulang otomatis');
  h = await muat('https://srv-baru/exec?b', 'baru', "S.gagalSekali['masuk@500'] = 1; S.gagalSekali['keluar@250'] = 1;");
  ok(h.siap && !h.galat && h.m === 1730 && h.k === 412 && h.uniq === 1730, 'tetap lengkap 1.730 GR + 412 GI setelah 2 halaman diulang');
  ok(h.kirim.filter(a => a === 'gudangBacaHal:masuk@500/250').length === 2, 'halaman yang gagal diulang sekali dengan ukuran sama');
  console.log('3. Halaman masih terlalu besar → diperkecil otomatis');
  h = await muat('https://srv-baru/exec?c', 'baru', 'S.maksBatas = 70;');
  ok(h.siap && !h.galat && h.m === 1730 && h.k === 412 && h.uniq === 1730 && h.batas <= 70, 'ukuran halaman turun 250 → ' + h.batas + ' baris; data tetap lengkap');
  console.log('4. Server lama (modul 1.8.6) — data kecil: cara lama tetap jalan');
  h = await muat('https://srv-lama/exec?kecil', 'lamaKecil');
  ok(h.siap && !h.galat && h.m === 5 && h.kirim.join() === 'gudangBacaHal:masuk@0/250,gudangBaca' && h.g === false, 'gudangBacaHal tidak dikenal → otomatis memakai gudangBaca lama (1 percobaan saja)');
  h = await muat('https://srv-lama/exec?kecil', 'lamaKecil'); ok(h.kirim.join() === 'gudangBaca', 'muat ulang berikutnya langsung gudangBaca (tanpa percobaan berulang)');
  console.log('5. Server lama — data besar (404 Drive): diagnosis tepat, bukan "deployment diarsipkan"');
  h = await muat('https://srv-lama/exec?besar', 'lama');

  ok(!h.siap && /^Data gudang gagal dimuat: Server AKTIF \(v2\.5\.1, modul 1\.8\.6\) dan aksi lain berjalan/.test(h.galat) && /server-modul-1\.8\.7\.json/.test(h.galat) && /AMAN dan tidak berubah/.test(h.galat), 'pesan: server aktif, respons gudang terlalu besar → unggah server-modul-1.8.7.json; data aman');
  ok(h.dukung !== false, 'menu gudang tidak dinonaktifkan (tombol Coba lagi tetap bisa dipakai)');
  console.log('6. URL /exec memang tidak valid (ping juga gagal) → arahkan ke Koneksi server');
  h = await muat('https://srv-mati/exec', 'lama');
  ok(/Tes ping server juga gagal/.test(h.galat) && /Kelola deployment/.test(h.galat), 'pesan menyebut URL /exec tidak valid / deployment diarsipkan & langkah perbaikannya');
  console.log('7. Aksi lain tidak tersentuh');
  const lain = await pg.evaluate(async () => { const S = window.__S; S.kirim = []; S.mode = 'lama'; REG.url = 'https://srv-baru/exec';
    const a = await regAksi('gudangKeluarSimpan', { data: { kunci: 'K1', qty: 2 } }); const b = await regAksi('gudangBaca', { cari: 'K1', batas: 5 });
    return { a: a.data.id, b: b.masuk.length, kirim: S.kirim.map(z => z[0]) }; });
  ok(lain.a === 'GI-BARU' && lain.b === 5 && lain.kirim.join() === 'gudangKeluarSimpan,gudangBaca', 'aksi tulis & gudangBaca ber-argumen (Asisten AI) diteruskan apa adanya');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' cek');
})().catch(e => { console.error(e); process.exit(1); });
