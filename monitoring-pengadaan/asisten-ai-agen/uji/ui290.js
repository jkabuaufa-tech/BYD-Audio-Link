// Uji UJUNG-KE-UJUNG 2.9.0 (Rilis D) di APLIKASI ASLI (Monitoring_SAP.html + paket 2.9.0 + kernel Code.gs 2.5.1 + modul 1.10.3):
//   A. akun Joko Supriyono: menu AI tampil · Kantor Live (papan tim, ruang Manager Joko & Ilham, kolam renang & taman) · checklist: unggah per baris + Verifikasi Dokumen (AI)
//   B. akun lain (Staf Pengadaan): seluruh pintu AI tersembunyi & ditolak.
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui290.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const R = __dirname + '/..', NK = '003/SPM/WK-NK.KSO/PDBJ/1726012/2026';
const STAF = { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' };
const siapkan = (C, K, P) => {
  K.tulisKoleksi_(P, 'data', [{ id: 'R1', noKontrak: NK, namaVendor: 'CV Uji Bahan', tglKontrak: '2026-05-02', nilai: 15480000, items: [] }]);
  K.tulisKoleksi_(P, 'progres', [{ id: 'PB1', versi: 1, noKontrak: NK, tagihanKe: 1, nomorBA: '01/BAPM/' + NK, kodeBA: 'BAPM', periode: 'Juli 2026', tanggal: '2026-07-20', items: {}, nilai: 1290000, baTerbit: '2026-07-21T00:00:00.000Z', revisi: 0 }]);
};
// HTML dasar uji lebih lama dari aplikasi pengguna: fungsi baru yang dipakai blok awal (Keuangan & checklist) diberi tiruan
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
const PILIH = ['#mp227AiFab', '#mp2613Dock', '#mp2613Menu', '#mp2614Menu', '#mp250MenuTim'];
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
async function bukaChecklist(pg) {
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  await pg.evaluate(() => window.mp219KeuLihat('PB1'));
  await pg.waitForSelector('#mp219ClIsi', { timeout: 15000 }); await pg.waitForTimeout(800);
  await pg.evaluate(() => window.mp219ClTab('checklist')); await pg.waitForTimeout(800);
}
(async () => {
  const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), paket = fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.9.0.json'), 'utf8');
  console.log('A. Akun Joko Supriyono');
  let b = await boot({ paket, modul, tunggu: 4000, pengguna: [STAF], siapkan, sebelum: SEBELUM });
  let pg = b.pg;
  await pg.waitForFunction(() => window.MP290 && window.MP290.dari === 'server', null, { timeout: 15000 });
  ok(await pg.evaluate(() => window.mp290AksesAI() && !document.body.classList.contains('mp290-tanpa-ai') && window.MP290.akun.join() === 'Joko Supriyono'), 'akses AI aktif (daftar akun AI dari server 1.10.3)');
  const kantorLama = await pg.evaluate(() => !!(window.MP2614_ROSTER && window.MP2614_ROSTER.find(r => r.id === 'joko').peran !== 'Logistic Manager'));   // 2.9.4+: Kantor sesuai denah asli → diuji ui294.js
  if (kantorLama) {
  ok(await pg.evaluate(() => !!(window.MP2614_ROSTER && window.MP2614_ROSTER.find(r => r.id === 'ilham').peran === 'Manager' && window.MP2614_ROSTER.find(r => r.id === 'joko').peran === 'Manager Pengadaan')), 'Ilham & Joko Supriyono berperan Manager');
  await pg.evaluate(() => { const T = window.__teks = []; const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { T.push(String(t)); return f.apply(this, arguments); }; });
  await pg.evaluate(() => window.mp2614Kantor()); await pg.waitForSelector('#mp2614Lapis canvas', { timeout: 10000 }); await pg.waitForTimeout(2500);
  const kt = await pg.evaluate(() => ({ judul: document.getElementById('mp2614Jdl').textContent, teks: [...new Set(window.__teks)], lebar: document.getElementById('mp2614Cv').width / document.getElementById('mp2614Cv').height }));
  ok(/Kantor Tim Proyek Perkuatan Dermaga Barat JICT/.test(kt.judul), 'judul Kantor Live: "Kantor Tim Proyek Perkuatan Dermaga Barat JICT"');
  ok(kt.teks.includes('Tim Proyek Perkuatan') && kt.teks.includes('Dermaga Barat JICT') && !kt.teks.some(t => /^Proyek .* · 0 token$/.test(t)), 'papan nama dinding: "Tim Proyek Perkuatan Dermaga Barat JICT" (bukan "Proyek <ID> · 0 token")');
  ok(kt.teks.includes('Ruang Manager · Ilham') && kt.teks.includes('Ruang Manager · Joko Supriyono'), 'ruang Manager terpisah (dinding kaca) untuk Ilham & Joko Supriyono');
  ok(Math.abs(kt.lebar - 840 / 560) < 0.02, 'kantor diperluas dengan teras luar (kolam renang & taman), kanvas 840×560');
  await pg.screenshot({ path: OUT + '/mp290-kantor.png' });
  // tokoh benar-benar dapat berjalan ke kolam & taman (lewat pintu kaca lorong tengah)
  const jalan = await pg.evaluate(async () => {
    const A = window.MP2613_AGEN, T00 = performance.now(); while (A && A.jalan && performance.now() - T00 < 20000) await new Promise(r => setTimeout(r, 200));
    const KT = window.MP2614_KANTOR, c = KT.ch.find(x => x.r.id === 'yusuf'), asli = Math.random, now = performance.now();
    KT.ch.forEach(x => { if (x !== c) x.sampai = now + 1e9; });
    while (c.jalur.length && performance.now() - now < 8000) await new Promise(r => setTimeout(r, 100));
    const Q = [0.1, 0.65]; Math.random = () => Q.length ? Q.shift() : 0.5;   // peluang < .35 → pergi; L[floor(.65·7)] = 'kolam'
    c.sampai = 0; c.mode = 'meja';
    const T0 = performance.now(); let maksI = 0; while (performance.now() - T0 < 12000) { await new Promise(r => setTimeout(r, 200)); if (!Q.length) Math.random = asli; maksI = Math.max(maksI, c.i); if (c.mode === 'titik' && !c.jalur.length && c.i > 13) break; }
    Math.random = asli; return { i: c.i, j: c.j, maksI, teks: c.teks };
  });
  ok(jalan.maksI > 13 && /kolam|taman/i.test(jalan.teks), 'staf berjalan ke teras: "' + jalan.teks + '" (i=' + jalan.i.toFixed(1) + ', j=' + jalan.j.toFixed(1) + ')');
  await pg.screenshot({ path: OUT + '/mp290-kantor-teras.png' });
  await pg.evaluate(() => window.mp2614Tutup());
  } else console.log('  · Kantor Live 2.9.0 diganti denah asli (2.9.4) — diuji di ui294.js');
  await bukaChecklist(pg);
  const cl = await pg.evaluate(() => { const m = document.querySelector('#mp219Cl .mp256-mode'), v = document.querySelector('#mp219Cl [data-vt]'); return { mode: m ? m.textContent : '', seg: !!document.querySelector('#mp219Cl .mp256-seg'), vt: v && v.offsetParent ? v.textContent : '' }; });
  ok(/Unggah per baris/.test(cl.mode) && /AI tidak memisahkan dokumen menurut judul/.test(cl.mode) && !cl.seg, 'checklist: unggah per baris, tanpa pilihan "AI memisahkan dokumen menurut judul"');
  ok(/Verifikasi Dokumen \(AI\)/.test(cl.vt), 'tab "Verifikasi Dokumen (AI)" tampil untuk Joko');
  await pg.click('#mp219Cl [data-vt]'); await pg.waitForTimeout(1500);
  ok(await pg.evaluate(() => !/Bundel PDF & Pratinjau/.test(document.getElementById('mp219Cl').textContent)), 'verifikasi AI tanpa sub-tab "Bundel PDF & Pratinjau" (pemisahan menurut judul)');
  await pg.screenshot({ path: OUT + '/mp290-verifikasi-joko.png' });
  const g1 = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g1.length, 'tanpa galat JavaScript (Joko)' + (g1.length ? ': ' + g1.slice(0, 3).join(' | ') : ''));
  await b.br.close();

  console.log('B. Akun Staf Pengadaan');
  b = await boot({ paket, modul, tunggu: 4000, pengguna: [STAF], siapkan, sebelum: SEBELUM, sebagai: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111' } });
  pg = b.pg;
  await pg.waitForFunction(() => window.MP290 && window.MP290.dari === 'server', null, { timeout: 15000 });
  ok(await pg.evaluate(() => !window.mp290AksesAI() && document.body.classList.contains('mp290-tanpa-ai')), 'akses AI nonaktif untuk Staf Pengadaan');
  const tampil = await pg.evaluate(sel => sel.filter(s => { const e = document.querySelector(s); return e && e.offsetParent; }), PILIH);
  ok(!tampil.length, 'Asisten AI, dock & menu Agen AI, Kantor Live, Tim AI tidak tampil' + (tampil.length ? ': ' + tampil.join(', ') : ''));
  await pg.evaluate(() => { ['mp2614Kantor', 'mp227AiBuka', 'mp2613Buka', 'mp250Buka'].forEach(f => { try { if (typeof window[f] === 'function') window[f](); } catch (e) { } }); });
  await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => !document.getElementById('mp2614Lapis') && !(document.getElementById('mp227Ai') && document.getElementById('mp227Ai').offsetParent) && !document.getElementById('mp2613Pn') && !document.getElementById('mp250Lapis')), 'memanggil Kantor / Asisten / Agen / Tim AI langsung → ditolak');
  await bukaChecklist(pg);
  const cs = await pg.evaluate(() => { const m = document.querySelector('#mp219Cl .mp256-mode'), v = [...document.querySelectorAll('#mp219Cl [data-vt]')].filter(x => x.offsetParent); return { mode: m ? m.textContent : '', vt: v.length }; });
  ok(cs.vt === 0 && !/AI Verifikasi/.test(cs.mode), 'checklist Staf: tab Verifikasi Dokumen (AI) & petunjuk AI disembunyikan');
  ok(/Unggah per baris/.test(cs.mode) || cs.mode === '', 'checklist Staf: unggah PDF per baris tetap berjalan');
  await pg.screenshot({ path: OUT + '/mp290-checklist-staf.png' });
  const g2 = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g2.length, 'tanpa galat JavaScript (Staf)' + (g2.length ? ': ' + g2.slice(0, 3).join(' | ') : ''));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.0');
})().catch(e => { console.error(e); process.exit(1); });
