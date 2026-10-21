// Uji UI 2.6.6 di Chromium (blok MP266 asli + server 1.9.2 asli lewat harness): Ganti proyek dari chip proyek / menu akun,
// sesi tersimpan diperbarui lalu dimuat ulang; Siapkan proyek baru (Admin): salin setelan, grup berbagi, akses pengguna.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.2.json';
const { C, K, P } = require('./vt_data.js')();
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const js = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.6.json', 'utf8')).js, MP266 = js.slice(js.indexOf('/* MP266'), js.indexOf('/* MP264 — PEMBARUAN'));
K.tulisProyek_([K.PROYEK_AWAL, { id: '1800001', nama: 'Dermaga Timur (baru)', aktif: true }, { id: '1700000', nama: 'uji coba', aktif: true }]);
C.__sheets['Pengguna'].rows.push(['Staf Baru', 'PENGADAAN', '2222', true, P, '', '', '', '', '']);
post({ action: 'notifSimpan', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: { aktif: true, jam: [7, 16], email: { aktif: true, pengguna: ['Joko Supriyono'] } } });
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1280, height: 860 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  let dialog = 0; pg.on('dialog', d => { dialog++; d.dismiss(); });
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#E9EEF5;--f-bg:#fff;--f-ink:#14233A;--f-muted:#5B6B82;--f-line:#DCE3EC;--f-soft:#F3F6FA}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-success{background:#2E9E5B;color:#fff}.btn-close::after{content:'×'}
    .app-header{display:flex;gap:12px;align-items:center;padding:10px 16px;background:#0B1F3A;color:#fff}.chip{padding:6px 12px;border:1px solid #E3343F;border-radius:20px}.form-select{padding:3px}</style></head>
    <body><div class="app-header"><div class="chip"><b>1726012</b> Perkuatan Dermaga Bar…</div><div class="menu-akun"><button>Joko</button><ul class="dropdown-menu"><li><a class="dropdown-item">Profil</a></li></ul></div></div><form style="padding:20px"><input id="isian" value=""></form>
    <script>const KUNCI_SESI = 'JICT_SESI', KUNCI_INGAT = 'JICT_INGAT'; function tulisSimpan(k, v) { localStorage.setItem(k, JSON.stringify(v)); } function bacaSimpan(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } }</script></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  const mulai = async (nama, pin, admin) => pg.evaluate(([P, nama, pin, admin, css]) => {
    if (!document.getElementById('cssUji')) { const s = document.createElement('style'); s.id = 'cssUji'; s.textContent = css; document.head.appendChild(s); }
    window.PROYEK = { id: P, nama: 'Perkuatan Dermaga Barat JICT' };
    window.REG = { url: 'https://contoh/exec', sesi: { nama, pin, peran: 'PENGADAAN', admin, proyek: P, cfg: { id: P } }, users: [] };
    localStorage.setItem('JICT_INGAT', JSON.stringify({ nama, proyek: P, sandi: pin }));
    window.mp220Srv = f => ['multiProyek', 'masterBersama', 'arsipBersama'].includes(f); window.notif = (m, t) => { (window.__notif = window.__notif || []).push(m); };
    window.regPost = async b => JSON.parse(await window.srvPost(JSON.stringify(b)));
    window.__reload = 0; window.mp266MuatUlang = () => { window.__reload++; };
  }, [P, nama, pin, admin, JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.6.json', 'utf8')).css]);
  await mulai('Joko Supriyono', '1234', true);
  await pg.addScriptTag({ content: MP266 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };

  console.log('1. Pintu masuk');
  await pg.waitForSelector('.mp266-chip');
  ok(await pg.evaluate(() => !!document.getElementById('mp266Menu') && document.querySelector('.mp266-chip').classList.contains('chip')), 'chip proyek di header dapat diklik & menu akun › Ganti proyek');
  await pg.click('.mp266-chip'); await pg.waitForSelector('#mp266Py .mp266-p');
  const daftar = await pg.$$eval('#mp266Py .mp266-p', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(daftar.length === 3 && /1726012.*Sedang dibuka.*3 kontrak/.test(daftar[0]) && /1800001.*Belum ada data — proyek baru/.test(daftar[1]), 'daftar proyek: ' + daftar.map(d => d.slice(0, 40)).join(' | '));

  console.log('2. Siapkan proyek baru (Admin)');
  await pg.click('#mp266Py .mp266-tog'); await pg.waitForSelector('#mp266Tujuan');
  const awal = await pg.evaluate(() => ({ tujuan: document.getElementById('mp266Tujuan').value, grup: [...document.querySelectorAll('input[name=mp266Grup]')].map(x => x.value + ':' + x.checked), akses: [...document.querySelectorAll('input[name=mp266Akses]')].map(x => x.value + ':' + x.checked) }));
  ok(awal.tujuan === '1800001' && awal.grup.join() === '1726012:true,1800001:true,1700000:false', 'bawaan: proyek baru 1800001, grup berbagi 1726012 + 1800001 (uji coba tidak dicentang)');
  ok(awal.akses.join() === 'Staf Baru:false', 'akses: hanya akun tanpa "*" yang perlu diatur (Staf Baru)');
  await pg.check('input[name=mp266Akses][value="Staf Baru"]');
  await pg.screenshot({ path: OUT + '/proyek-siapkan.png' });
  await pg.click('#mp266Py .btn-success'); await pg.waitForSelector('#mp266Py .mp266-ok');
  const hasil = await pg.textContent('#mp266Py .mp266-ok');
  ok(/notifikasi: disalin dari 1726012/i.test(hasil) && /bersama: 1726012, 1800001/.test(hasil) && /\+Staf Baru/.test(hasil), 'hasil: setelan disalin, grup berbagi, akses Staf Baru');
  ok(C.__props['NOTIF_SET_1800001'] === C.__props['NOTIF_SET_' + P] && JSON.parse(C.__props['PROYEK_BERBAGI']).join() === '1726012,1800001', 'tersimpan di server');
  ok((await pg.$$eval('#mp266Py .mp266-p', a => a.map(x => x.textContent))).filter(t => /Master & arsip bersama/.test(t)).length === 2, 'kartu proyek menandai "Master & arsip bersama"');

  console.log('3. Ganti proyek');
  await pg.fill('#isian', 'sedang mengetik'); await pg.click('#mp266Py .mp266-p:nth-child(2) .btn-primary');
  ok(dialog === 1 && await pg.evaluate(() => window.__reload === 0), 'ada isian belum disimpan → konfirmasi; Batal → tetap di proyek ini');
  await pg.fill('#isian', ''); await pg.evaluate(() => { document.getElementById('isian').defaultValue = ''; });
  await pg.click('#mp266Py .mp266-p:nth-child(2) .btn-primary'); await pg.waitForFunction(() => window.__reload === 1);
  const s = await pg.evaluate(() => ({ sesi: JSON.parse(localStorage.getItem('JICT_SESI')), ingat: JSON.parse(localStorage.getItem('JICT_INGAT')), tanda: sessionStorage.getItem('mp266Pindah') }));
  ok(s.sesi.proyek === '1800001' && s.sesi.cfg.id === '1800001' && s.sesi.cfg.nama === 'Dermaga Timur (baru)' && s.sesi.nama === 'Joko Supriyono', 'sesi tersimpan → proyek 1800001 (konfigurasi dari server), lalu aplikasi dimuat ulang');
  ok(s.ingat.proyek === '1800001' && /1800001/.test(s.tanda), '"Ingat saya" ikut proyek baru; pesan "Proyek aktif" disiapkan untuk setelah muat ulang');

  console.log('4. Akun staf');
  await pg.evaluate(() => document.getElementById('mp266Py').remove());
  await mulai('Staf Baru', '2222', false);
  await pg.evaluate(() => mp266Buka()); await pg.waitForSelector('#mp266Py .mp266-p');
  const st = await pg.$$eval('#mp266Py .mp266-p', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(st.length === 2 && !st.some(t => /uji coba/.test(t)) && !(await pg.$('#mp266Py .mp266-tog')), 'staf hanya melihat proyek yang boleh dibuka (2), tanpa menu Siapkan proyek');
  await pg.evaluate(() => { window.regPost = async b => b.action === 'login' && b.proyek === '1700000' ? { ok: false, error: 'Anda tidak memiliki akses ke proyek 1700000.' } : JSON.parse(await window.srvPost(JSON.stringify(b))); });
  await pg.evaluate(() => mp266Pindah('1700000'));
  ok(/tidak memiliki akses/.test(await pg.textContent('#mp266Py')) && await pg.evaluate(() => window.__reload === 0), 'akses ditolak server → pesan jelas, tidak dimuat ulang');
  await pg.setViewportSize({ width: 390, height: 800 });
  const bx = await pg.evaluate(() => { const r = document.querySelector('.mp266-dlg').getBoundingClientRect(); return { l: r.left, r: r.right, sw: document.documentElement.scrollWidth }; });
  ok(bx.l >= 0 && bx.r <= 390 && bx.sw <= 390, 'dialog muat di layar HP 390 px');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji UI 2.6.6');
})().catch(e => { console.error(e); process.exit(1); });
