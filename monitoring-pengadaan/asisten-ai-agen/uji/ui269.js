// Uji 2.6.9 di Chromium memakai APLIKASI ASLI (HTML_DASAR + paket utuh + kernel Code.gs 2.5.1 asli + modul 1.9.2):
// notifikasi masa berlaku kontrak hanya untuk kontrak yang tagihan (BK)-nya belum 100%.
//   HTML_DASAR=…/index.html KODE_GS=…/Code.gs node uji/ui269.js            (PAKET=pembaruan-2.6.8.json → memperlihatkan galat lama)
const { chromium } = require('playwright'), fs = require('fs'), vm = require('vm'), assert = require('assert');
const { buatKonteks } = require('./harness.js');
const HTML = fs.readFileSync(process.env.HTML_DASAR, 'utf8');
const PKT = fs.readFileSync(__dirname + '/../' + (process.env.PAKET || 'pembaruan-2.6.9.json'), 'utf8'), VERSI = JSON.parse(PKT).versi;
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id, doGet = vm.runInContext('doGet', C);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const ADM = (action, x) => post(Object.assign({ action, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
const modul = JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.9.2.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok);
{ const t = ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji notifikasi kontrak lunas' }); assert.ok(t.ok, t.error); }
C.__pkt = JSON.parse(PKT);
vm.runInContext("(function (p) { const f = folderPembaruan_().createFile(Utilities.newBlob(JSON.stringify(p), 'application/json', 'pembaruan-' + p.versi + '.json')); mp219SimpanMeta_(f.getId(), p); PropertiesService.getScriptProperties().setProperty('PEMB_AKTIF', f.getId()); })(__pkt)", C);

// Register: 3 kontrak SPM bernomor uji (927/928/929 — tidak bentrok dengan Master Kontrak tertanam), masa berlaku berakhir
// 19 Jun 2026, nilai Rp 2.000.000 (2 item × 10 × Rp 100.000)
const NO = n => n + '/SPM/WK-NK.KSO/PDBJ/1726012/2026', A = NO('927'), B = NO('928'), Cn = NO('929');
const kontrak = (id, no, vendor) => ({ id, noKontrak: no, namaVendor: vendor, idVendor: '2100010709', jenisKontrak: 'SPM', kelompok: 'BAHAN', tahun: 2026, bulan: 'Mei', tglKontrak: '2026-05-20', tglSelesai: '2026-06-19',
  noPR: '1', noRFQ: '1', noPO: '4500000001', items: [{ kode: '1300002547', uraian: 'Pipa PVC', vol: 10, sat: 'BTG', harga: 100000, wbs: '1726012-99-02-02' }, { kode: '1100000554', uraian: 'Cat Minyak', vol: 10, sat: 'KLG', harga: 100000, wbs: '1726012-99-02-02' }],
  nilai: 2000000, diposting: true, versi: 1, dibuatOleh: 'uji', dibuatPada: '2026-05-20T00:00:00Z', diubahPada: '2026-05-20T00:00:00Z' });
K.tulisKoleksi_(P, 'data', [kontrak('R1', A, 'Putra Paloh, CV'), kontrak('R2', B, 'Vendor Sebagian, CV'), kontrak('R3', Cn, 'Vendor Belum Tagih, CV')]);
// 927 (= kasus 027/SPM Putra Paloh): BK 1 per volume item (item 1 penuh), BK 2 hanya nilai (sisa Rp 1.000.000) → jumlah BK 100%
// 928: BK Rp 1.250.000 (62,5%) · 929: belum ada BK
const bk = (id, no, ke, items, nilai) => ({ id, versi: 1, noKontrak: no, tagihanKe: ke, periode: ke === 1 ? 'Juni 2026' : 'Juli 2026', tanggal: '2026-07-0' + ke, items, nilai, baTerbit: true, nomorBA: '0' + ke + '/BAPM/' + no, dibuatPada: '2026-07-0' + ke + 'T00:00:00Z' });
K.tulisKoleksi_(P, 'progres', [bk('T1', A, 1, { [A + '#0']: 10 }, 1000000), bk('T2', A, 2, {}, 1000000), bk('T3', B, 1, { [B + '#0']: 10, [B + '#1']: 2.5 }, 1250000)]);
const login = ADM('login');

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1366, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  pg.on('dialog', d => d.dismiss());
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
    [PKT, { nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', proyek: P, admin: true, cfg: login.proyek || { id: P } }]);
  await pg.goto('https://app.test/', { timeout: 120000 });
  await pg.waitForFunction(v => typeof PEMB !== 'undefined' && PEMB.aktif && PEMB.aktif.versi === v && REG.data.length === 3 && PROG.data.length === 3 && typeof window.mp258Hitung === 'function', VERSI, { timeout: 60000 });
  await pg.waitForTimeout(2500);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const notif = () => pg.evaluate(() => { window.mp258Hitung(); return window.MP258_NT.L.filter(x => x.g === 'kontrak' && /^92\d\//.test(x.judul)).map(x => x.judul + ' | ' + x.ket); });
  const info = no => pg.evaluate(no => { const x = window.semuaKontrak214().find(k => k.key === no); return { realisasi: x.realisasi, nilai: x.nilai, masa: window.mp220Masa(x).k }; }, no);
  const [kA, kB, kC, N1] = [await info(A), await info(B), await info(Cn), await notif()];
  console.log('paket ' + VERSI + ' · 927: realisasi baris Rp ' + kA.realisasi.toLocaleString('id-ID') + ' dari Rp ' + kA.nilai.toLocaleString('id-ID') + ' (BK progres Rp 2.000.000) → ' + kA.masa);
  const baru = VERSI.split('.').map(Number).reduce((a, v, i) => a + v * [1e6, 1e3, 1][i], 0) >= 2006010;   // 2.6.10: realisasi ringkasan = jumlah BK
  if (baru) ok(kA.realisasi === kA.nilai, 'kasus 027/SPM (uji 927): sejak 2.6.10 tagihan di Dashboard = jumlah BK Input Progres (Rp 2.000.000), bukan BK per volume saja');
  else ok(kA.realisasi < kA.nilai, 'kasus 027/SPM (uji 927): realisasi baris kontrak hanya menghitung BK ber-volume, jumlah BK progres sudah 100%');
  ok(kA.masa === 'selesai' && !N1.some(t => t.startsWith('927/')), '927 Putra Paloh (BK 100%) → selesai, tidak ada di Notifikasi prioritas');
  const nB = N1.find(t => t.startsWith('928/')), nC = N1.find(t => t.startsWith('929/'));
  ok(kB.masa === 'lewat' && nB && /BK 62,5%/.test(nB), '928 (BK 62,5%) tetap muncul: "' + (nB || '').split(' | ')[1] + '"');
  ok(kC.masa === 'lewat' && nC && /BK 0%/.test(nC), '929 (belum ada BK) tetap muncul dengan BK 0%');
  // tagihan 928 dilunasi → otomatis selesai tanpa mengubah status kontrak
  await pg.evaluate(no => { PROG.data.push({ id: 'T4', versi: 1, noKontrak: no, tagihanKe: 2, periode: 'Juli 2026', items: {}, nilai: 750000, baTerbit: true }); }, B);
  const N2 = (await notif()).map(t => t.split('/')[0]);
  ok(N2.join() === '929', 'BK 928 ditambah hingga 100% → hilang dari notifikasi; tersisa ' + N2.join(', '));
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji ' + VERSI + ' (notifikasi kontrak)');
})().catch(e => { console.error(e.message || e); process.exit(1); });
