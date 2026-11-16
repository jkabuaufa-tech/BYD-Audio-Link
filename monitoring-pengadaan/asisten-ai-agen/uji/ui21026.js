// Uji 2.10.26 (menu radial + dashboard ringkas) di aplikasi ASLI: HTML dasar + paket utuh, mode lokal, Chromium.
// Pakai: HTML_DASAR=/jalur/index.html node uji/ui21026.js [paket.json] [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs');
const D = require('path').dirname(process.env.HTML_DASAR || '');   // HTML_DASAR=…/index.html (HTML dasar aplikasi, tidak ikut repo)
async function buka(paket, o = {}) {
  const b = await chromium.launch(); const ctx = await b.newContext(Object.assign({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: o.dpr || 1 }, o.hp ? { isMobile: true, hasTouch: true } : {}));
  const pk = fs.readFileSync(paket, 'utf8');
  await ctx.addInitScript(([pk, tema, ls]) => { try { if (!localStorage.getItem('JICT_REG_URL')) { localStorage.setItem('JICT_REG_URL', '-'); localStorage.setItem('JICT_PEMBARUAN', pk); if (tema) localStorage.setItem('JICT_TEMA', tema); Object.keys(ls || {}).forEach(k => localStorage.setItem(k, ls[k])); } } catch (e) { } }, [pk, o.tema || '', o.ls || {}]);
  const pg = await ctx.newPage(); const galat = [];
  pg.on('pageerror', e => galat.push(e.message)); pg.on('console', m => { if (m.type() === 'error') galat.push('C: ' + m.text().slice(0, 300)); });
  await pg.goto('file://' + D + '/index.html'); await pg.waitForTimeout(2500);
  const info = await pg.evaluate(async (peran) => {
    const g = lokalGlobal(); const u = g.users.find(x => x.peran === (peran || 'ADMIN') && x.aktif !== false) || g.users[0];
    const sel = document.getElementById('loginNama'); if (![...sel.options].some(op => op.value === u.nama)) sel.add(new Option(u.nama, u.nama));
    sel.value = u.nama; document.getElementById('loginPin').value = u.pin; await prosesLogin();
    return { user: u.nama, peran: u.peran, err: document.getElementById('loginError').textContent, versi: PEMB.aktif && PEMB.aktif.versi, gagal: PEMB.gagal, users: g.users.map(x => x.peran) };
  }, o.peran);
  await pg.waitForTimeout(o.tunggu || 3000);
  return { b, pg, galat, info };
};
const assert = require('assert'), P = process.argv[2] || require('path').join(__dirname, '..', 'pembaruan-2.10.26.json'), O = process.argv[3] || require('os').tmpdir();
let n = 0; const cek = (c, m) => { assert.ok(c, m); n++; };
(async () => {
  let { b, pg, galat, info } = await buka(P, { tema: 'terang' });
  const dasarGalat = galat.length;
  cek(info.versi === '2.10.26' && !info.gagal, 'paket aktif');
  let r = await pg.evaluate(() => ({ on: document.body.classList.contains('mprd-on'), sb: getComputedStyle(sidebar).display, mainW: document.querySelector('main').getBoundingClientRect().width, vw: innerWidth, rail: getComputedStyle(mprdRail).display, dok: [...document.querySelectorAll('#mprdDok button')].map(x => x.dataset.tab), lapis: mprdLapis.hidden,
    dash: !!document.getElementById('mprdDash') && document.getElementById('tab-dashboard-tagihan').firstElementChild.id, ringkas: document.getElementById('tab-dashboard-tagihan').classList.contains('mprd-ringkas'),
    tampil: [...document.getElementById('tab-dashboard-tagihan').children].filter(c => getComputedStyle(c).display !== 'none').map(c => c.id), nilai: mprdNilai.textContent, asli: statTotalNilai.textContent, kpi: document.querySelectorAll('#mprdKpi .mprd-k').length, kpiAsli: document.querySelectorAll('#mp258Ringkas .mp258-k').length,
    ops: [...document.querySelectorAll('#mprdOps .mprd-o b')].map(x => x.textContent), alur: Chart.getChart('mprdAlur') && Chart.getChart('mprdAlur').data.datasets[0].data, alurAsli: [...document.querySelectorAll('#alurPengadaan .alur-step .v')].map(x => x.textContent), trenKosong: !mprdTrenKosong.hidden }));
  cek(r.on && r.sb === 'none' && r.rail === 'flex' && r.mainW === r.vw, 'sidebar tersembunyi, main selebar layar ' + JSON.stringify(r));
  cek(r.dok.length === 5 && r.dok[0] === 'dashboard-tagihan' && r.lapis, 'dok mini 5 menu');
  cek(r.dash === 'mprdDash' && r.ringkas, 'dashboard baru paling atas, mode ringkas');
  cek(r.tampil.every(id => ['mprdDash', 'bannerMigrasi', 'mp214Rekap'].includes(id)) && r.tampil.includes('mp214Rekap'), 'ringkas: ' + r.tampil);
  cek(r.nilai === r.asli && /Miliar/.test(r.nilai), 'nilai kontrak = angka lama'); cek(r.kpi === r.kpiAsli && r.kpi === 5, 'KPI cermin Prioritas');
  cek(r.alur.length === 7 && r.alur.join() === r.alurAsli.map(Number).join(), 'grafik alur 7 langkah = angka lama ' + r.alur); cek(r.trenKosong, 'tren kosong saat belum ada tagihan'); cek(r.ops.length === 8, 'ops 8 ubin');
  // radial: buka lewat klik, isi = sidebar terlihat, pilih menu
  await pg.click('#mprdBtn'); await pg.waitForTimeout(700);
  r = await pg.evaluate(() => ({ buka: mprdLapis.classList.contains('buka'), it: [...document.querySelectorAll('.mprd-it')].map(x => x.dataset.tab), sb: [...document.querySelectorAll('#sidebar ul.nav > li')].filter(li => getComputedStyle(li).display !== 'none' && li.querySelector('a')).map(li => (li.querySelector('a').getAttribute('onclick').match(/showTab\('([^']+)'/) || [])[1]),
    kotak: [...document.querySelectorAll('.mprd-it .b')].map(x => { const k = x.getBoundingClientRect(); return [k.left, k.top, k.right, k.bottom]; }), fokus: document.activeElement.className, exp: mprdBtn.getAttribute('aria-expanded') }));
  cek(r.buka && r.exp === 'true' && r.it.join() === r.sb.join() && r.it.length >= 12, 'isi radial = sidebar ' + r.it.length);
  cek(!r.it.includes('kontrak') && !r.it.includes('form-kontrak'), 'menu tersembunyi tidak ikut');
  const tumpuk = r.kotak.some((a, i) => r.kotak.some((c, j) => j > i && a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3])), luar = r.kotak.some(k => k[0] < 0 || k[1] < 0 || k[2] > 1440 || k[3] > 900);
  cek(!tumpuk && !luar, 'ikon tidak bertumpuk / keluar layar'); cek(/mprd-it/.test(r.fokus), 'fokus masuk menu');
  await pg.keyboard.press('ArrowRight'); cek(await pg.evaluate(() => document.activeElement.dataset.tab) === r.it[1], 'panah pindah fokus');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400); cek(await pg.evaluate(() => mprdLapis.hidden && document.activeElement.id === 'mprdBtn'), 'Esc menutup, fokus kembali');
  await pg.keyboard.press('Alt+m'); await pg.waitForTimeout(500); cek(await pg.evaluate(() => !mprdLapis.hidden), 'Alt+M membuka');
  await pg.click('.mprd-it[data-tab="register"]'); await pg.waitForTimeout(700);
  r = await pg.evaluate(() => ({ tab: tabAktif(), tutup: mprdLapis.hidden, judul: judulHalaman.textContent, akt: document.querySelector('#sidebar .nav-link.active').getAttribute('onclick'), frek: JSON.parse(localStorage.getItem('JICT_MENU_FREK')).register }));
  cek(r.tab === 'register' && r.tutup && /register/.test(r.akt) && r.frek >= 1, 'pilih Register ' + JSON.stringify(r));
  await pg.hover('#mprdBtn'); await pg.waitForTimeout(900); cek(await pg.evaluate(() => !mprdLapis.hidden), 'hover membuka');
  await pg.mouse.click(40, 40); await pg.waitForTimeout(400); cek(await pg.evaluate(() => mprdLapis.hidden), 'klik latar menutup');
  await pg.click('#mprdDok button[data-tab="dashboard-tagihan"]'); await pg.waitForTimeout(500); cek(await pg.evaluate(() => tabAktif()) === 'dashboard-tagihan', 'dok → dashboard');
  // tagihan contoh → tren, hero, KPI klik, mode lengkap
  await pg.evaluate(() => { const now = new Date(), d = m => new Date(now.getFullYear(), now.getMonth() - m, 12).toISOString().slice(0, 10), k = RINGKASAN[0].key;
    [[3, 2e9, 1], [2, 3e9, 1], [1, 4e9, 0]].forEach((x, i) => PROG.data.push({ id: 'T' + i, noKontrak: k, nilai: x[1], tanggal: d(x[0]), items: [], baTerbit: d(x[0]), bayar: x[2] ? { status: 'DIBAYAR', nilaiBayar: x[1] } : { status: 'BELUM' } })); renderDashboardVisual(); });
  await pg.waitForTimeout(700);
  r = await pg.evaluate(() => { const c = Chart.getChart('mprdTren'); return { n: c && c.data.labels.length, t: c && c.data.datasets[0].data, b: c && c.data.datasets[1].data, kosong: mprdTrenKosong.hidden, ops: [...document.querySelectorAll('#mprdOps .mprd-o')].map(x => x.textContent), alur: Chart.getChart('mprdAlur').data.datasets[0].data.join(), alurAsli: [...document.querySelectorAll('#alurPengadaan .alur-step .v')].map(x => Number(x.textContent)).join(), persen: mprdPersen.textContent, asli: heroPersen.textContent }; });
  cek(r.n === 3 && r.t.join() === '2000000000,3000000000,4000000000' && r.b.join() === '2000000000,3000000000,0' && r.kosong, 'tren 3 bulan ' + JSON.stringify(r));
  cek(r.ops.some(x => /2 \/ 3Tagihan dibayar/.test(x)) && r.alur === r.alurAsli && r.persen === r.asli, 'ops & alur ikut data');
  await pg.click('#mprdDash .mprd-mode [data-mode="lengkap"]'); await pg.waitForTimeout(300);
  r = await pg.evaluate(() => ({ hero: getComputedStyle(document.querySelector('.dash-hero')).display, al: getComputedStyle(alurPengadaan).display, ls: localStorage.getItem('JICT_DASH_RINGKAS') }));
  cek(r.hero !== 'none' && r.al !== 'none' && r.ls === '0', 'mode lengkap menampilkan panel lama');
  await pg.click('#mprdDash .mprd-mode [data-mode="ringkas"]');
  await pg.click('#mprdKpi [data-kpi="3"]'); await pg.waitForTimeout(600); cek(await pg.evaluate(() => tabAktif()) === 'keuangan', 'KPI tagihan belum dibayar → Keuangan');
  await pg.evaluate(() => bukaTab('dashboard-tagihan')); await pg.waitForTimeout(300);
  await pg.evaluate(() => gantiTema('gelap')); await pg.waitForTimeout(600); cek(await pg.evaluate(() => Chart.getChart('mprdTren').data.datasets[0].borderColor) === '#4C9BEA', 'grafik ikut tema gelap');
  // sidebar klasik & kembali
  await pg.click('#chipUser'); await pg.click('#mprdMenuMode'); await pg.waitForTimeout(400);
  r = await pg.evaluate(() => ({ on: document.body.classList.contains('mprd-on'), sb: getComputedStyle(sidebar).display, rail: getComputedStyle(mprdRail).display, ls: localStorage.getItem('JICT_MENU_RADIAL') }));
  cek(!r.on && r.sb !== 'none' && r.rail === 'none' && r.ls === '0', 'sidebar klasik kembali');
  await pg.reload(); await pg.waitForTimeout(3500); cek(await pg.evaluate(() => !document.body.classList.contains('mprd-on') && getComputedStyle(sidebar).display !== 'none'), 'pilihan klasik diingat');
  await pg.evaluate(() => MP21026.mode(true)); cek(await pg.evaluate(() => document.body.classList.contains('mprd-on')), 'radial aktif lagi');
  cek(galat.length === dasarGalat, 'tanpa galat JS baru: ' + galat.slice(dasarGalat)); await b.close();
  // HP 390: tombol Menu membuka radial, tanpa rel, ikon dalam layar; peran LIHAT
  ({ b, pg, galat, info } = await buka(P, { w: 390, h: 800, hp: true, tema: 'terang', peran: 'LIHAT' }));
  const g0 = galat.length;
  await pg.tap('#navBawah [data-tab="menu"]'); await pg.waitForTimeout(800);
  r = await pg.evaluate(() => ({ buka: !mprdLapis.hidden, rail: getComputedStyle(mprdRail).display, sbShow: sidebar.classList.contains('show'), n: document.querySelectorAll('.mprd-it').length, sbn: [...document.querySelectorAll('#sidebar ul.nav > li')].filter(li => getComputedStyle(li).display !== 'none' && li.querySelector('a')).length,
    kotak: [...document.querySelectorAll('.mprd-it .b')].map(x => { const k = x.getBoundingClientRect(); return [k.left, k.top, k.right, k.bottom]; }), kaki: document.querySelector('.mprd-kaki').getBoundingClientRect().top, gulir: document.documentElement.scrollWidth }));
  cek(r.buka && r.rail === 'none' && !r.sbShow && r.n === r.sbn, 'HP: Menu → radial ' + r.n);
  cek(!r.kotak.some(k => k[0] < 0 || k[2] > 390 || k[1] < 0 || k[3] > r.kaki) && !r.kotak.some((a, i) => r.kotak.some((c, j) => j > i && a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3])), 'HP: ikon di dalam layar & tidak bertumpuk');
  await pg.screenshot({ path: O + '/r-hp.png' });
  await pg.tap('.mprd-it[data-tab="form-progres"]'); await pg.waitForTimeout(600); cek(await pg.evaluate(() => tabAktif() === 'form-progres' && mprdLapis.hidden), 'HP: pilih Progres');
  await pg.evaluate(() => bukaTab('dashboard-tagihan')); await pg.waitForTimeout(500);
  cek(await pg.evaluate(() => document.documentElement.scrollWidth <= 390), 'HP: tanpa gulir mendatar'); cek(galat.length === g0, 'HP tanpa galat baru ' + galat.slice(g0));
  await pg.screenshot({ path: O + '/d-hp-full.png', fullPage: true }); await b.close();
  console.log('UJI 2.10.26 (aplikasi asli): ' + n + ' cek LULUS');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
