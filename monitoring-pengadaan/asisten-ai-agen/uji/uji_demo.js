// Uji demo aplikasi lengkap (demo/rakit_demo_app.py) untuk dua paket berturut-turut, dengan koreksi 027/028 yang sudah ada di server
// proyek (028/SPM Excel 17 item atas nama Putra Paloh → item 1–12 ke 027/SPM Putra Paloh; 028/SPM = Anugerah Rhadika Pratama, PT).
// Memastikan paket baru TIDAK mengubah data yang sudah benar: hanya kontrak yang memang diperbaiki yang berubah.
//   HTML_DASAR=…/index.html KODE_GS=…/Code.gs node uji/uji_demo.js [paket-lama.json] [paket-baru.json]
const { chromium } = require('playwright'), fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), { execFileSync } = require('child_process');
const R = path.join(__dirname, '..'), [LAMA, BARU] = [process.argv[2] || 'pembaruan-2.6.9.json', process.argv[3] || 'pembaruan-2.6.10.json'];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-'));
const rakit = p => { const f = path.join(TMP, path.basename(p, '.json') + '.html'); execFileSync('python3', ['-I', path.join(R, 'demo/rakit_demo_app.py'), process.env.HTML_DASAR, process.env.KODE_GS, path.join(R, p), f]); return f; };
const NO = n => n + '/SPM/WK-NK.KSO/PDBJ/1726012/2026';
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  async function baca(f) {
    const pg = await br.newPage({ viewport: { width: 1366, height: 900 } }), gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept());
    await pg.route(/^https?:/, r => r.fulfill({ status: 204, body: '' }));
    await pg.goto('file://' + f, { timeout: 120000 });
    await pg.waitForFunction(() => typeof PEMB !== 'undefined' && PEMB.aktif && PMT.data.length >= 2 && Object.keys(KOREKSI.data || {}).length >= 3 && REG.sesi, null, { timeout: 60000 }); await pg.waitForTimeout(2500);
    const d = await pg.evaluate(() => { renderAllTables(); window.mp258Hitung && window.mp258Hitung();
      const notif = new Set(((window.MP258_NT || {}).L || []).filter(x => x.g === 'kontrak').map(x => x.judul.split(' · ')[0]));
      return { versi: PEMB.aktif.versi, srv: window.DEMO_SERVER.galat(), K: Object.fromEntries(window.semuaKontrak214().map(x => [x.key, { vendor: x.vendor, nilai: Math.round(x.nilai), tagihan: Math.round(x.realisasi), status: x.statusKey, masa: window.mp220Masa(x).k, notif: notif.has(x.key) }])),
        periksa: window.mp2610Periksa ? window.mp2610Periksa().T.map(t => ({ kode: t.kode, key: t.key })) : null }; });
    return { pg, gal, d };
  }
  const A = await baca(rakit(LAMA)), B = await baca(rakit(BARU));
  console.log('1. Server demo (kernel Code.gs asli) & koreksi 027/028');
  ok(!A.d.srv && !B.d.srv && Object.keys(B.d.K).length >= 76, 'demo ' + A.d.versi + ' & ' + B.d.versi + ' berjalan: ' + Object.keys(B.d.K).length + ' kontrak, data awal Excel diimpor');
  const k27 = B.d.K[NO('027')], k28 = B.d.K[NO('028')], l27 = A.d.K[NO('027')], l28 = A.d.K[NO('028')];
  ok(l27 && l27.nilai === 0 && l27.masa === 'lewat' && l27.notif, A.d.versi + ': gejala di server proyek terulang — 027/SPM Putra Paloh Nilai Rp 0 · lewat · di notifikasi');
  ok(k27.vendor === 'Putra Paloh, CV' && k27.nilai === 40877000 && k27.tagihan === 40877000 && k27.status === 'selesai' && !k27.notif, B.d.versi + ': 027/SPM Putra Paloh Rp 40.877.000 (DPP, 12 item) · tagihan 100% · Selesai · tidak di notifikasi');
  ok(k28.vendor === 'Anugerah Rhadika Pratama, PT' && k28.nilai === 121167900 && JSON.stringify(k28) === JSON.stringify(l28), '028/SPM Anugerah Rhadika Pratama, PT Rp 121.167.900 — sama persis dengan ' + A.d.versi);
  console.log('2. Data yang sudah benar tidak berubah');
  const beda = Object.keys(A.d.K).filter(k => JSON.stringify(A.d.K[k]) !== JSON.stringify(B.d.K[k]));
  ok(beda.length && beda.every(k => [NO('027'), NO('091')].indexOf(k) >= 0), 'kontrak yang berubah ' + A.d.versi + ' → ' + B.d.versi + ': ' + beda.map(k => k.split('/')[0]).join(', ') + ' (027 = perbaikan nilai Rp 0; 091 = CONTOH BK diisi nilai saja) — kontrak lain identik');
  ok(Object.keys(A.d.K).length === Object.keys(B.d.K).length, 'jumlah kontrak sama (' + Object.keys(B.d.K).length + ')');
  console.log('3. Periksa kontrak');
  const P = B.d.periksa, ada = (kode, no) => P.some(t => t.kode === kode && t.key === no);
  ok(ada('NILAI_ITEM', NO('027')) && ada('LEBIH_100', NO('028')) && ada('BK_YATIM', '093/SPM/WK-NK.KSO/PDBJ/1726012/2O26') && !P.some(t => t.kode === 'NOTIF_100'),
    'temuan: 027 nilai dari item · 028 tagihan Excel Rp 162.044.900 > nilai Rp 121.167.900 (BK lama sebelum dipisah) · BK 093 salah ketik · tidak ada notifikasi BK 100%');
  console.log('4. Panduan demo');
  const pg = B.pg;
  await pg.click('#demoPanel .dp-btn'); await pg.click('#demoPanel .dp-l:nth-of-type(2)'); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => document.querySelector('#demoPanel .dp-isi').hidden), 'panel panduan tertutup setelah langkah diklik');
  const baris = await pg.evaluate(() => [...document.querySelectorAll('#mp214Rekap tbody tr')].map(t => t.textContent.replace(/\s+/g, ' ').trim()).filter(t => /027\/SPM/.test(t)));
  ok(baris.length === 1 && /Putra Paloh/.test(baris[0]) && /100%/.test(baris[0]), 'langkah 2 (cari 027): "' + (baris[0] || '').slice(0, 100) + '…"');
  await pg.screenshot({ path: path.join(process.env.TANGKAPAN || TMP, 'demo-027.png') });
  ok(!A.gal.length && !B.gal.length, 'tanpa galat JavaScript' + (A.gal.concat(B.gal).length ? ': ' + A.gal.concat(B.gal).join(' | ') : ''));
  await br.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log('\nLULUS ' + lulus + ' uji demo (' + LAMA + ' → ' + BARU + ')');
})().catch(e => { console.error(e.message || e); process.exit(1); });
