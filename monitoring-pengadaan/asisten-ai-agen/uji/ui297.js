// Uji UJUNG-KE-UJUNG 2.9.7 di APLIKASI ASLI: blokir BAPP/BAPM & BAP/Kwitansi bertanggal melewati masa berlaku PO/kontrak,
// tanda tangan Laporan Stok Material, batas halaman Kartu Gudang (TTD + catatan tidak terpisah).
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui297.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan', R = __dirname + '/..';
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
(async () => {
  const b = await boot({ paket: fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.9.7.json'), 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), tunggu: 4000, viewport: { width: 1400, height: 1000 }, sebelum: SEBELUM });
  const { pg, K, P } = b;
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  const k = await pg.evaluate(() => {
    const V = it => Number(it.volumeEfektif ?? it.volume ?? it.volumeKontrak) || 0, H = it => Number(it.hargaSatuanEfektif ?? it.hargaSatuan) || 0;
    const g = RINGKASAN.find(g => /\/SPM\//.test(g.key) && g.items.filter(i => V(i) && H(i)).length >= 3);
    return { key: g.key, ids: g.items.map((it, i) => (V(it) && H(it)) ? [idItem(g, it, i), V(it)] : null).filter(Boolean) };
  });
  const bk = (id, ke, tgl, f) => ({ id, versi: 1, noKontrak: k.key, tagihanKe: ke, nomorBA: String(ke).padStart(2, '0') + '/BAPM/' + k.key, periode: 'Uji', tanggal: tgl, items: Object.fromEntries(k.ids.map(([i, v]) => [i, Math.round(v * f * 1000) / 1000])), nilai: 0, revisi: 0 });
  K.tulisKoleksi_(P, 'progres', [bk('U1', 1, '2026-08-10', 0.25), bk('U2', 2, '2026-09-10', 0.25)]);
  await pg.evaluate(async () => { await muatRegister(); });
  // masa berlaku PO/kontrak berakhir 31 Agustus 2026 (Tanggal Selesai Register / Master Kontrak)
  const AKHIR = '2026-08-31';
  await pg.evaluate(([key, akhir]) => { const g = RINGKASAN.find(x => x.key === key); g.tglSelesai = akhir; (REG.data || []).filter(r => r.noKontrak === key).forEach(r => { r.tglSelesai = akhir; }); }, [k.key, AKHIR]);
  ok(await pg.evaluate(k => window.mp297AkhirKontrak(RINGKASAN.find(x => x.key === k)), k.key) === AKHIR, 'masa berlaku dibaca dari Tanggal Selesai kontrak (' + AKHIR + ')');
  await pg.evaluate(() => { const n = window.notif; window.__notif = []; window.notif = function (m, t) { window.__notif.push(t + ': ' + m); return n && n.apply(this, arguments); }; });

  console.log('A1. BAPP/BAPM setelah masa berlaku PO habis → diblokir');
  await pg.evaluate(key => { showTab('form-progres'); pilihKontrakByKey(key); }, k.key); await pg.waitForTimeout(800);
  await pg.evaluate(() => { const i = document.getElementById('fp_tanggal'); i.value = '2026-09-15'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await pg.waitForTimeout(400);
  const ban = await pg.evaluate(() => (document.getElementById('mp297Fp') || {}).textContent || '');
  ok(/DIBLOKIR/.test(ban) && /31 Agustus 2026/.test(ban), 'Form Input Progres: peringatan merah — "' + ban.trim().slice(0, 110) + '…"');
  const nProg = await pg.evaluate(() => PROG.data.length);
  ok(await pg.evaluate(async () => (await simpanProgres()) === false) && await pg.evaluate(() => PROG.data.length) === nProg && await pg.evaluate(() => window.__notif.some(m => /DIBLOKIR/.test(m))), 'simpan progres (BK → BAPM) ditolak');
  await pg.screenshot({ path: OUT + '/mp297-progres.png' });
  await pg.evaluate(() => { const i = document.getElementById('fp_tanggal'); i.value = '2026-08-20'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await pg.waitForTimeout(400);
  ok(!(await pg.evaluate(() => !!document.getElementById('mp297Fp'))), 'tanggal dalam masa berlaku → tidak diblokir');

  await pg.evaluate(() => { window.MP296.tahan = true; window.tanya = async () => true; previewBAEntri('U2'); }); await pg.waitForTimeout(1500);
  const bnBA = await pg.evaluate(() => (document.getElementById('mp297Ba') || {}).textContent || '');
  ok(/DIBLOKIR/.test(bnBA), 'Preview BA BK-2 (10 Sep 2026): peringatan blokir tampil');
  const nReg = await pg.evaluate(() => JSON.stringify(bacaSimpan(KUNCI_REGISTER)[BA.g.key] || []));
  ok(await pg.evaluate(async () => (await terbitkanBA()) === false && (await cetakBA()) === false) && await pg.evaluate(() => JSON.stringify(bacaSimpan(KUNCI_REGISTER)[BA.g.key] || [])) === nReg && await pg.evaluate(() => !BA.final), 'terbitkan nomor & cetak BAPM ditolak (BK berikutnya seterusnya ikut diblokir)');
  await pg.screenshot({ path: OUT + '/mp297-preview-ba.png' });
  await pg.evaluate(() => tutupModalBA()); await pg.waitForTimeout(300);
  await pg.evaluate(() => previewBAEntri('U1')); await pg.waitForTimeout(1200);
  ok(!(await pg.evaluate(() => !!document.getElementById('mp297Ba'))), 'Preview BA BK-1 (10 Agu 2026, masih berlaku) tidak diblokir');
  await pg.evaluate(() => tutupModalBA()); await pg.waitForTimeout(300);

  console.log('A2. Tanggal BAP & Kwitansi melewati masa berlaku kontrak → diblokir');
  await pg.evaluate(key => window.mp270Buka(key, 'U2'), k.key);
  await pg.waitForFunction(() => [...document.querySelectorAll('label')].some(l => /Tanggal dokumen/.test(l.textContent)), null, { timeout: 15000 }); await pg.waitForTimeout(800);
  const bnP = await pg.evaluate(() => (document.getElementById('mp297Pk') || {}).textContent || '');
  ok(/Tanggal BAP & Kwitansi/.test(bnP) && /DIBLOKIR/.test(bnP), 'Paket Tagihan: peringatan "Tanggal BAP & Kwitansi … melewati masa berlaku kontrak"');
  ok(await pg.evaluate(async () => (await mp270Simpan()) === false && (await mp270BuatPdf('BAP')) === false), 'Simpan Draft & terbitkan PDF (BAP/Kwitansi) ditolak');
  await pg.screenshot({ path: OUT + '/mp297-paket.png' });
  await pg.evaluate(() => { const i = [...document.querySelectorAll('label')].find(l => /Tanggal dokumen/.test(l.textContent)).querySelector('input'); i.value = '2026-08-28'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await pg.waitForTimeout(800);
  ok(!(await pg.evaluate(() => !!document.getElementById('mp297Pk'))), 'tanggal dokumen diubah ke dalam masa berlaku → blokir hilang');
  await pg.evaluate(() => document.querySelectorAll('.mp270-latar').forEach(e => e.remove()));

  console.log('B. Tanda tangan Laporan Stok Material');
  await pg.evaluate(() => { try { localStorage.setItem('JICT_GD_TTD', JSON.stringify({ kota: 'Jakarta', kasi: 'Joko Supriyono', petugas: '' })); } catch (e) { } window.mp227StokCetak(); });
  await pg.waitForSelector('#mp224CvFrame', { timeout: 15000 }); await pg.waitForTimeout(1500);
  const fr = await (await pg.$('#mp224CvFrame')).contentFrame();
  const T = await fr.evaluate(() => {
    const t = document.querySelector('.ttd'), k = [...t.children], b = [...t.querySelectorAll('b')].map(x => x.getBoundingClientRect()), bw = document.body.getBoundingClientRect();
    return { n: k.length, kiri: k[0].textContent, kanan: k[1].textContent, rata: getComputedStyle(t).justifyContent, sejajar: Math.abs(b[0].bottom - b[1].bottom) < 1.5, xKiri: Math.round(b[0].left - bw.left), xKanan: Math.round(bw.right - b[1].right) };
  });
  ok(T.n === 2 && /Mengetahui,\s*Kasi DanLoglat/.test(T.kiri) && /Joko Supriyono/.test(T.kiri) && /Jakarta, \d+ \w+ \d{4}/.test(T.kanan) && /Dibuat oleh,\s*Petugas Gudang/.test(T.kanan) && T.rata === 'space-between', 'Kasi DanLoglat (Joko Supriyono) di kiri; tanggal + Petugas Gudang di kanan');
  ok(T.sejajar, 'nama Joko Supriyono & (.....) sejajar satu garis (kiri ' + T.xKiri + ' px dari tepi, kanan ' + T.xKanan + ' px)');
  await (await pg.$('#mp224CvFrame')).screenshot({ path: OUT + '/mp297-stok.png' });
  await pg.evaluate(() => { if (typeof window.mp224CetakTutup === 'function') window.mp224CetakTutup(); });

  console.log('C. Batas halaman Kartu Gudang: TTD + catatan satu kesatuan');
  const baris = n => Array.from({ length: n }, (_, i) => `<tr><td class="c">${i + 1}-Sep-2026</td><td class="r">10</td><td class="r">10</td><td class="r">-</td><td class="r">-</td><td class="r">${100 + i}</td><td>uji</td></tr>`).join('');
  let hasil = null;
  for (const n of [30, 33, 36, 39, 42]) {
    await pg.evaluate(rows => { window.mp224Cetak(`<!doctype html><html><head><meta charset="utf-8"><title>Kartu</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font:9pt Arial;margin:0}h1{border:1px solid #111;text-align:center;font-size:11pt;margin:6px 0 8px;padding:6px}table.t{width:100%;border-collapse:collapse}.t th,.t td{border:1px solid #333;padding:3px 5px}.ttd{display:flex;justify-content:flex-end;gap:60px;margin-top:14px;page-break-inside:avoid;text-align:center}.ttd .sp{height:58px}.ttd b{text-decoration:underline}.cat{margin-top:10px;font-size:8pt}tr{page-break-inside:avoid}.ft{margin-top:8px;font-size:7.5pt;color:#555}</style></head><body><h1>KARTU GUDANG / STOCK CARD</h1><table class="t"><thead><tr><th>Tanggal</th><th>GR</th><th>GR Terusan</th><th>GI</th><th>GI Terusan</th><th>Sisa</th><th>Ket</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="ttd"><div>Jakarta, 24 November 2026<br>Mengetahui,<br>Kasi DanLoglat<div class="sp"></div><b>Joko Supriyono</b></div><div>Diisi oleh,<br>Petugas Gudang<div class="sp"></div><b>(.........................)</b></div></div>
      <div class="cat">Catatan: Dibuat rangkap 2 (dua), 1. Untuk Gudang, 2. Untuk SPLEM</div><div class="ft">Dicetak dari Monitoring Pengadaan · uji</div>
      </body></html>`, { judul: 'Kartu Gudang', lanskap: false }); }, baris(n));
    await pg.waitForTimeout(1200);
    const f2 = await (await pg.$('#mp224CvFrame')).contentFrame();
    const h = await f2.evaluate(() => { const blk = document.querySelector('.ttdblok'); if (!blk) return null; const top = blk.offsetTop, bot = top + blk.offsetHeight, garis = [...document.querySelectorAll('.mp281-hal')].map(g => parseFloat(g.style.top)); return { ada: true, cat: !!blk.querySelector('.cat'), garis, top, bot, potong: garis.some(y => y > top + 2 && y < bot - 2) }; });
    if (h && h.garis.length) { hasil = Object.assign(h, { n }); break; }
    hasil = Object.assign(h || {}, { n });
  }
  ok(hasil && hasil.ada && hasil.cat, 'TTD, catatan & kaki cetak dibungkus satu blok (tidak boleh terpotong)');
  ok(hasil.garis.length >= 1 && !hasil.potong, 'batas halaman tidak lagi di antara TTD dan catatan (' + hasil.n + ' baris; garis di ' + hasil.garis.map(Math.round).join(', ') + ' px; blok ' + Math.round(hasil.top) + '–' + Math.round(hasil.bot) + ' px)');
  await (await pg.$('#mp224CvFrame')).screenshot({ path: OUT + '/mp297-kartu-batas.png' });

  const g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g.length, 'tanpa galat JavaScript' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.7');
})().catch(e => { console.error(e); process.exit(1); });
