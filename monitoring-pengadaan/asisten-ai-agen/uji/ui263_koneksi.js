// Uji 2.6.3 / 1.9.1: paket UTUH dimuat (seluruh rantai regPost: 2.1.6 → MP259B → MP261 → MP263) dan Google ditiru mengirim halaman HTML
// (a) SEBELUM script berjalan (permintaan ditolak) atau (b) SESUDAH script berjalan (jawaban terputus). Server = kernel + modul 1.9.1 asli.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.1.json';
const { C, K, P, ADM } = require('./vt_data.js')();
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.3.json', 'utf8')), js = PK.js;
// rantai regPost asli dari paket (urutan sama dengan aplikasi): MP259 bagian B → MP261 → MP263; lapisan 2.1.6 (sudah ada di HTML dasar v2.2) ditiru di bawah
const potong = (a, b) => { const i = js.indexOf(a), j = b ? js.indexOf(b, i) : js.length; assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const RANTAI = [potong('/* MP259 bagian B', '/* MP260'), potong('/* MP261', '/* MPWV'), potong('/* MP263')];
const HTML_GOOGLE = '<!DOCTYPE html><html><head><title>Error</title><meta name="description" content="authorization permission"></head><body>Maaf, terjadi kesalahan server. Coba lagi nanti.</body></html>';
const F = { mode: [], log: [] };   // antrean gangguan per permintaan POST: 'sebelum' | 'sesudah' | undefined (normal)
const D = () => K.bacaKoleksi_(P, 'data');
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage(); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://server.test/**', async r => {
    const q = r.request();
    if (q.method() === 'GET') return r.fulfill(F.pingGagal ? { body: HTML_GOOGLE, contentType: 'text/html' } : { body: JSON.stringify({ ok: true, versiServer: '2.5.1' }), contentType: 'application/json' });   // ping
    const body = JSON.parse(q.postData()), m = F.mode.shift(); F.log.push(body.action + ':' + (m || 'ok'));
    if (m === 'sebelum') return r.fulfill({ status: 200, body: HTML_GOOGLE, contentType: 'text/html' });
    const out = K.doPost({ postData: { contents: JSON.stringify(body) } });
    r.fulfill(m === 'sesudah' ? { status: 200, body: HTML_GOOGLE, contentType: 'text/html' } : { body: out, contentType: 'application/json' });
  });
  await pg.route('https://app.test/**', r => r.fulfill({ body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div class="app-header"><div class="menu-akun"></div></div></body></html>', contentType: 'text/html' }));
  await pg.goto('https://app.test/');
  await pg.evaluate(P => { window.REG = { url: 'https://server.test/exec', sesi: { nama: 'Staf Pengadaan', pin: '1111', peran: 'PENGADAAN', admin: false }, data: [], dataSiap: true }; window.PROG = { data: [] }; window.PMT = { data: [] }; window.PROYEK = { id: P }; window.notif = () => { };
    // tiruan lapisan 2.1.6 di HTML dasar v2.2: fetch → JSON; halaman HTML → pesan yang sama persis; baca diulang sekali, simpan dikembalikan sebagai {ok:false}
    const BACA0 = ['baca', 'login', 'ambilBerkas', 'bacaSemua', 'bacaMasterTambahan', 'bacaAlokasiBon'];
    async function kirim0(body) { let r; try { r = await fetch(REG.url, { method: 'POST', redirect: 'follow', body: JSON.stringify(body) }); } catch (e) { const x = new Error('Koneksi ke server terputus. Periksa internet lalu coba lagi.'); x.jaringan = true; throw x; }
      const t = await r.text(); try { return JSON.parse(t); } catch (e) { const x = new Error('Server mengirim halaman HTML, bukan data (HTTP ' + r.status + '). ' + (/authorization|otorisasi|izin|permission/.test(t.toLowerCase()) ? 'Script belum diotorisasi ulang → buka editor Apps Script, jalankan fungsi setup lalu Izinkan.' : 'Server Google mengalami galat saat memproses.')); x.html = true; throw x; } }
    window.regPost = async function (body) { const baca = BACA0.indexOf(body.action) >= 0; try { return await kirim0(body); } catch (e) { if (baca && (e.html || e.jaringan)) { await new Promise(r => setTimeout(r, 300)); return kirim0(body); } return { ok: false, error: e.message }; } }; }, P);
  for (const b of RANTAI) await pg.addScriptTag({ content: b });
  await pg.evaluate(() => { window.mp220Srv = f => ['jejakSimpan', 'wvHalaman', 'dokKurang'].includes(f); window.__muatUlang = 0; window.muatRegister = async () => { window.__muatUlang++; }; window.mp261Status = t => { (window.__status = window.__status || []).push(t); }; });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const kirim = (action, extra) => pg.evaluate(([a, e]) => window.regPost(Object.assign({ action: a, nama: REG.sesi.nama, pin: REG.sesi.pin, proyek: PROYEK.id }, e || {})).then(r => r, g => ({ dilempar: true, error: g.message })), [action, extra]);
  const item = { kode: 'K1', uraian: 'Sewa crane', vol: 10, sat: 'jam', harga: 500000, wbs: 'W1' };
  await kirim('x186Kurang');   // jawaban normal pertama → server tercatat sehat

  console.log('1. SIMPAN, jawaban terputus SESUDAH script berjalan');
  F.mode = ['sesudah']; let r = await kirim('save', { data: { noKontrak: '101/SPSA/WK/2026', namaVendor: 'CV Uji', items: [item] } });
  assert.ok(await pg.evaluate(() => !!(window.__MP259B__ && window.__MP261__ && window.__MP263__)), 'rantai terpasang');
  ok(r.tersimpan && /SUDAH TERSIMPAN/.test(r.error) && /BUAT/.test(r.error), 'pesan: "' + r.error.slice(0, 70) + '…"');
  ok(D().filter(x => x.noKontrak === '101/SPSA/WK/2026').length === 1, 'kontrak tersimpan TEPAT satu kali (tidak dikirim ulang)');
  ok(await pg.evaluate(() => window.__muatUlang) === 1, 'data dimuat ulang otomatis');

  console.log('2. SIMPAN, ditolak Google SEBELUM script berjalan');
  F.log = []; F.mode = ['sebelum']; r = await kirim('save', { data: { noKontrak: '102/SPSA/WK/2026', namaVendor: 'CV Uji', items: [item] } });
  ok(r.ok && r.data && r.data.noKontrak === '102/SPSA/WK/2026', 'belum tercatat di Log → dikirim ulang otomatis sekali → berhasil');
  ok(D().filter(x => x.noKontrak === '102/SPSA/WK/2026').length === 1 && F.log.filter(x => /^save/.test(x)).length === 2, 'tetap satu kontrak (2 kiriman: ' + F.log.filter(x => /^save/.test(x)).join(', ') + ')');

  console.log('3. SIMPAN, gagal di kedua kiriman');
  const n0 = D().length;
  F.mode = ['sebelum', undefined, undefined, 'sebelum', undefined, undefined];   // save(gagal) · jejak · jejak · save ulang(gagal) · jejak · jejak
  r = await kirim('save', { data: { noKontrak: '103/SPSA/WK/2026', namaVendor: 'CV Uji', items: [item] } });
  ok(!r.ok && /BELUM tersimpan/.test(r.error) && D().length === n0, 'pesan "BELUM tersimpan — klik Simpan lagi", tidak ada data setengah jadi');

  console.log('4. SIMPAN ditolak gerbang Rp 0, jawaban terputus sesudahnya');
  F.mode = ['sesudah']; r = await kirim('save', { data: { noKontrak: '104/SPSA/WK/2026', namaVendor: 'CV Uji', noPO: '4500', items: [] } });
  ok(!r.ok && /Ditolak server \(GERBANG NILAI DITOLAK\)/.test(r.error) && !/SUDAH TERSIMPAN/.test(r.error), 'catatan penolakan TIDAK dianggap tersimpan: "' + r.error.slice(0, 60) + '…"');

  console.log('5. BACA tersendat');
  F.log = []; F.mode = ['sebelum', 'sebelum', 'sebelum', 'sebelum']; r = await kirim('x186Kurang');
  ok(r.ok && r.data, 'gagal 4× lalu berhasil (2× ulang bawaan 2.5.9 + 2× ulang 2.6.3)');
  ok((await pg.evaluate(() => window.__status || [])).some(t => /tersendat/.test(t || '')), 'penanda kecil "Koneksi ke Google tersendat — memuat ulang otomatis" tampil');
  F.pingGagal = true; F.mode = Array(12).fill('sebelum'); r = await kirim('x186Kurang'); F.pingGagal = false;
  const pesan = r.error || '';
  ok(!r.ok && /Server & otorisasi BAIK/.test(pesan) && !/belum diotorisasi/.test(pesan) && !/tempel URL/.test(pesan), 'pesan jujur: "…' + pesan.slice(pesan.indexOf('Server &'), pesan.indexOf('Server &') + 70) + '…"');
  F.mode = [];

  console.log('6. Data Vendor WAVE per halaman (server 1.9.1)');
  const L = []; for (let i = 1; i <= 3200; i++) L.push({ id: 'V' + i, nama: 'Vendor Uji ' + i, status: i % 50 ? 'Rekanan Terdaftar' : 'Blacklist', alamat: 'Indonesia, Jawa, Kota ' + (i % 7) + ', Jl. ' + i });
  for (let i = 0; i < 3; i++) assert.ok(ADM('wvImpor', { data: { baris: L.slice(i * 1200, (i + 1) * 1200), akhir: i === 2 } }).ok);
  const h0 = ADM('wvDaftar', { data: { hal: 0 } }), h2 = ADM('wvDaftar', { data: { hal: 2 } }), lama = ADM('wvDaftar', { data: {} });
  ok(h0.data.length === 1500 && h0.lanjut && h2.data.length === 200 && !h2.lanjut && lama.data.length === 3200, 'hal 0: 1.500 · hal 2: 200 (selesai) · tanpa hal: 3.200 (kompatibel)');
  ok(JSON.stringify(h0).length < JSON.stringify(lama).length / 2, 'respons per halaman ' + Math.round(JSON.stringify(h0).length / 1024) + ' KB (seluruhnya ' + Math.round(JSON.stringify(lama).length / 1024) + ' KB)');
  ok(h2.status[h2.data[49][4]] === 'Blacklist', 'indeks status konsisten antar halaman');
  ok(!gal.length, 'tanpa galat JavaScript baru' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji koneksi 2.6.3 / 1.9.1');
})().catch(e => { console.error(e); process.exit(1); });
