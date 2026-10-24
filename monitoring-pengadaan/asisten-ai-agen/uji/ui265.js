// Uji 2.6.5 di Chromium: kotak "Versi baru … tersedia" dari HTML dasar selalu diganti kartu kecil yang dapat ditutup —
// lewat tanya(), notif(), elemen yang dibuat langsung, wadah yang diisi ulang, dialog Bootstrap; konten halaman biasa tidak disentuh.
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.7.json', 'utf8')), js = PK.js, MP264 = js.slice(js.indexOf('/* MP264 — PEMBARUAN'));
const CAT = v => `<b>Versi baru ${v} tersedia.</b> Pembaruan ${v} (kumulatif dari 2.6.3 … 2.2.7; pasangan Modul server 1.9.1). ` + 'PERBAIKAN — catatan rilis panjang yang mendorong tombol keluar layar. '.repeat(40);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1280, height: 760 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;background:#0e1a2b;color:#fff;margin:0}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px}.btn-light{background:#fff;color:#0B2B54}.btn-outline-light{background:none;color:#fff}
    .adm{position:fixed;inset:40px 120px;background:#16243a;border-radius:14px;padding:20px;overflow:auto}.dlg{position:fixed;inset:0;display:flex;justify-content:center;align-items:flex-start;background:rgba(0,0,0,.2);z-index:2000}.dlg .kotak{width:1000px;background:#1763B3;padding:24px;font-size:22px;line-height:1.6;border-radius:14px}</style><style>${PK.css}</style></head>
    <body><div class="adm" id="adminPanel"><h2>Pengguna &amp; Proyek › Pembaruan</h2><p>Riwayat: Versi baru 2.6.3 tersedia sejak kemarin (catatan).</p><div id="riwayat"><div>Versi baru 2.6.2 tersedia — catatan lama</div></div></div><div id="wadahLama" class="dlg" style="display:none"><div class="kotak" id="isiLama"></div></div></body></html>`);
  await pg.evaluate(() => {
    window.REG = { url: '', sesi: { nama: 'Joko Supriyono', admin: true }, data: [] }; window.__notif = []; window.notif = (m, t) => { window.__notif.push(String(m).slice(0, 50)); };
    window.__tanyaAsli = 0;
    window.tanya = (pesan, o) => new Promise(res => { window.__tanyaAsli++; const d = document.createElement('div'); d.className = 'dlg'; d.id = 'dlgTanya';
      d.innerHTML = `<div class="kotak"><h4>${(o && o.judul) || ''}</h4>${pesan}<div><button class="btn btn-light" id="ok">${(o && o.ok) || 'OK'}</button></div></div>`; document.body.appendChild(d); d.querySelector('#ok').onclick = () => { d.remove(); res(true); }; });
    window.__bs = []; window.bootstrap = { Modal: { getOrCreateInstance: m => ({ hide: () => { window.__bs.push(m.id); m.classList.remove('show'); m.style.display = 'none'; } }) } };
  });
  await pg.addScriptTag({ content: MP264 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const kartu = () => pg.evaluate(() => { const b = document.getElementById('mp264Versi'); return b ? b.textContent.replace(/\s+/g, ' ') : ''; });
  const tutup = () => pg.evaluate(() => { if (document.getElementById('mp264Versi')) mp264Versi('tutup'); });

  console.log('1. Dialog tanya() seperti di tangkapan layar (Admin, di atas panel Pembaruan)');
  const jawab = await pg.evaluate(c => tanya(c, { judul: 'Pembaruan aplikasi', ok: 'Muat ulang' }), CAT('2.6.4'));
  ok(jawab === false && await pg.evaluate(() => !document.getElementById('dlgTanya') && window.__tanyaAsli === 0), 'dialog besar tidak dibuat; dijawab "nanti"');
  ok(/Versi baru 2\.6\.4 tersedia/.test(await kartu()) && /Muat ulang/.test(await kartu()), 'diganti kartu kecil dengan tombol Muat ulang');
  await pg.screenshot({ path: OUT + '/versi-baru-admin.png' });
  await pg.click('#mp264Versi .mp264-x'); ok(!(await kartu()), 'tombol × menutup kartu — tidak perlu menutup aplikasi');
  const j2 = await pg.evaluate(() => tanya('Pembaruan 2.6.6 (kumulatif …) catatan panjang', { judul: 'Versi baru 2.6.6 tersedia', ok: 'Muat ulang' }));
  ok(j2 === false && /2\.6\.6/.test(await kartu()), 'versi di judul dialog juga ditangkap'); await tutup();
  ok(await pg.evaluate(async () => (await Promise.race([tanya('Hapus tagihan ini?', { judul: 'Konfirmasi' }), new Promise(r => setTimeout(() => r('tampil'), 200))])) === 'tampil' && !!document.getElementById('dlgTanya')), 'dialog tanya() lain tetap tampil seperti biasa');
  await pg.evaluate(() => document.getElementById('dlgTanya').remove());

  console.log('2. Kotak dari HTML dasar tanpa tanya()/notif()');
  await pg.evaluate(c => { const d = document.createElement('div'); d.className = 'dlg'; d.id = 'dlgLangsung'; d.innerHTML = '<div class="kotak">' + c + '</div>'; document.body.appendChild(d); }, CAT('2.6.7'));
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('dlgLangsung')).display === 'none') && /2\.6\.7/.test(await kartu()), 'kotak melayang yang dibuat langsung disembunyikan (beserta latarnya) → kartu'); await tutup();
  await pg.evaluate(c => { const w = document.getElementById('wadahLama'); w.style.display = 'flex'; document.getElementById('isiLama').innerHTML = c; }, CAT('2.6.8'));
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('wadahLama')).display === 'none') && /2\.6\.8/.test(await kartu()), 'wadah yang sudah ada lalu diisi ulang (<b>Versi baru…</b>) juga ditangkap'); await tutup();
  await pg.evaluate(c => { const m = document.createElement('div'); m.className = 'modal show'; m.id = 'mdlBs'; m.style.cssText = 'display:block;position:fixed;inset:0'; m.innerHTML = '<div class="modal-dialog"><div class="modal-content"><div class="modal-body">' + c + '</div></div></div>'; document.body.appendChild(m); }, CAT('2.6.9'));
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => window.__bs.includes('mdlBs')) && /2\.6\.9/.test(await kartu()), 'dialog Bootstrap ditutup lewat Bootstrap (latar ikut hilang)'); await tutup();
  await pg.evaluate(() => notif('<b>Versi baru 2.7.0 tersedia.</b> catatan', 'info'));
  ok(/2\.7\.0/.test(await kartu()) && await pg.evaluate(() => !window.__notif.length), 'jalur notif() tetap ditangkap'); await tutup();

  console.log('3. Konten halaman biasa tidak disentuh');
  await pg.evaluate(() => { const d = document.createElement('div'); d.textContent = 'Versi baru 2.6.3 tersedia — dicatat di riwayat'; document.getElementById('riwayat').appendChild(d); });
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('adminPanel')).display !== 'none' && [...document.querySelectorAll('#riwayat div')].every(d => getComputedStyle(d).display !== 'none')) && !(await kartu()), 'panel Admin (juga melayang) & baris riwayat "Versi baru 2.6.3 tersedia" tetap tampil — hanya kotak yang isinya pesan versi baru yang diganti');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji 2.6.5');
})().catch(e => { console.error(e); process.exit(1); });
