// Uji UI Asisten AI (paket 2.4.0) di Chromium: panel Asisten AI → regAksi → kernel Code.gs + modul 1.7.0 asli (LLM tiruan)
const { chromium } = require('playwright');
const { buatKonteks } = require('./harness.js');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
K.tulisKoleksi_(P, 'data', [{ id: 'R1', noKontrak: 'WK-NK.KSO/PDBJ/SPM/001/2026', namaVendor: 'PT Baja Jaya', nilai: 500000000, items: [{ kode: 'M1', uraian: 'Besi', vol: 10, harga: 1000 }], noPR: '1001' }]);
K.tulisKoleksi_(P, 'progres', [{ id: 'T1', versi: 1, noKontrak: 'WK-NK.KSO/PDBJ/SPM/001/2026', tagihanKe: 1, nomorBA: 'BA-001', periode: 'Sep 2026', nilai: 100000000, baTerbit: true }]);
K.tulisKoleksi_(P, 'permintaan', [{ id: 'B1', nomor: 'BON-01', tanggal: '2026-09-01', items: [{ kode: 'M1', uraian: 'Besi D13', vol: 100, sat: 'btg', harga: 90000 }] }]);
const paket = JSON.parse(fs.readFileSync(process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.2.json', 'utf8'));
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
assert.ok(post({ action: 'modulUnggah', nama: 'Joko Supriyono', pin: '1234', proyek: P, data: paket }).ok);
assert.ok(post({ action: 'modulTerbit', nama: 'Joko Supriyono', pin: '1234', proyek: P, versi: paket.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji UI playwright' }).ok);
const jawab = isi => ({ kode: 200, teks: { model: 'gpt-5-mini', choices: [{ message: { content: isi } }], usage: {} } });
C.__jawabHTTP = (url, o) => {
  const b = JSON.parse(o.payload), sys = b.messages[0].content, akhir = b.messages[b.messages.length - 1].content;
  if (/MODE ANALISIS/.test(sys)) return jawab(JSON.stringify({ ringkasan: 'Satu kontrak **belum lengkap** dan satu tagihan tertahan.', temuan: [{ judul: 'Register WK-NK.KSO/PDBJ/SPM/001/2026 kurang RFQ, PO, TOP', detail: 'Nilai Rp 500.000.000', tingkat: 'tinggi' }, { judul: 'Tagihan BA-001 checklist 0/25', detail: 'Faktur Pajak, Invoice belum diunggah', tingkat: 'sedang' }],
    saran: [{ judul: 'Lihat ringkasan checklist', aksi: 'checklistRingkas', arg: {}, dampak: 'Mengetahui dokumen yang kurang' }, { judul: 'Buat paket PBJ untuk bon besi', aksi: 'savePBJ', arg: { nama: 'Paket Besi D13' }, dampak: 'Bon segera diproses' }, { judul: 'Hubungi vendor untuk faktur pajak', aksi: '', dampak: 'Dokumen lengkap' }] }));
  if (/^HASIL AKSI/.test(akhir)) return jawab('Register berisi **1 kontrak**: WK-NK.KSO/PDBJ/SPM/001/2026 (PT Baja Jaya), nilai Rp 500.000.000.\n\n| No | Vendor |\n|---|---|\n| 001 | PT Baja Jaya |');
  if (/paket/i.test(akhir)) return jawab('{"aksi":"savePBJ","arg":{"nama":"Paket Semen Uji","noPR":"7001"},"alasan":"Bon semen belum dipaketkan."}');
  if (/Koneksi OK/.test(akhir)) return jawab('Koneksi OK');
  return jawab('{"aksi":"bacaSemua","arg":{"koleksi":"list"},"alasan":"cek register"}');
};
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.4.4.json', 'utf8')), js = PK.js, css = PK.css;
const mp227 = js.slice(js.indexOf('/* MP227 — PEMBARUAN'));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const pg = await br.newPage({ viewport: { width: 1280, height: 860 } });
  const galatJS = []; pg.on('pageerror', e => galatJS.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.exposeFunction('srvPost', s => JSON.stringify(post(JSON.parse(s))));
  const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#E9EEF5;color:#14233A} html[data-tema="gelap"] body{background:#0A1626;color:#E6EDF6}
    .btn{border:1px solid #ccc;border-radius:6px;padding:3px 8px;cursor:pointer}.btn-primary{background:#1763B3;color:#fff;border-color:#1763B3}.d-flex{display:flex}.gap-2{gap:8px}.flex-grow-1{flex-grow:1}.align-items-center{align-items:center}
    .form-control{width:100%;box-sizing:border-box;padding:3px 6px}.row{display:flex;flex-wrap:wrap}.col-md-4{width:33%}.col-12{width:100%}</style><style>${css}</style></head>
    <body><div class="app-header"><div class="menu-akun"><ul class="dropdown-menu"></ul></div><h1 id="judulHalaman">Dashboard</h1></div></body></html>`;
  await pg.route('https://app.test/**', r => r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  const masuk = (nama, pin, admin, peran) => pg.evaluate(([nama, pin, admin, peran, P]) => {
    window.REG = { url: 'https://contoh/exec', sesi: { nama, admin, peran } }; window.PROYEK = { id: P, nama: 'Perkuatan Dermaga Barat JICT' };
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.notif = (m, t) => { (window.__notif = window.__notif || []).push([m, t]); }; window.mp220Srv = f => true;
    window.regAksi = async (a, extra) => { const r = JSON.parse(await window.srvPost(JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, extra || {})))); if (!r.ok) throw new Error(r.error); return r; };
  }, [nama, pin, admin, peran, P]);
  await masuk('Joko Supriyono', '1234', true, 'PENGADAAN');
  await pg.addScriptTag({ content: mp227 });
  await pg.evaluate(() => window.dispatchEvent(new Event('load')));
  await pg.waitForSelector('#mp227AiFab:not([hidden])', { timeout: 8000 });
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  // 1. setelan dinamis
  await pg.evaluate(() => window.mp227AiSetel()); await pg.waitForSelector('#mp227PvDaftar .mp227-pv');
  ok(await pg.locator('#mp227PvDaftar .mp227-pv').count() === 6, 'form dinamis: 6 penyedia');
  const pv = pg.locator('.mp227-pv[data-id="openai"]'); await pv.locator('.pv-kunci').fill('sk-test-0123456789abcdef'); await pv.locator('.pv-aktif').check();
  await pg.evaluate(() => window.mp227AiTambahProv()); const nb = pg.locator('.mp227-pv[data-baru="1"]');
  await nb.locator('.pv-id').fill('lokal'); await nb.locator('.pv-nama').fill('LLM Lokal'); await nb.locator('.pv-model').fill('qwen3:32b'); await nb.locator('.pv-base').fill('https://llm.contoh.id/v1/chat/completions'); await nb.locator('.pv-kunci').fill('kunci-lokal-0123456789');
  await pg.selectOption('#mp227ABw', 'openai');
  const jawabSemula = C.__jawabHTTP;
  C.__jawabHTTP = (u, o) => /llm\.contoh/.test(u) ? { kode: 401, teks: { error: { message: 'Invalid API Key' } } } : jawabSemula(u, o);
  await pg.evaluate(() => window.mp227AiSimpan(true)); await pg.waitForSelector('#mp227AMsg .mp227-uj', { timeout: 10000 });
  const msgSetel = await pg.textContent('#mp227AMsg');
  ok(/1 dari 2 penyedia siap/.test(msgSetel) && /OpenAI — Koneksi OK/.test(msgSetel) && /HTTP 401/.test(msgSetel) && /API key ditolak/.test(msgSetel) && !/LLM Lokal: LLM Lokal/.test(msgSetel), 'hasil uji per penyedia: ' + msgSetel.replace(/\s+/g, ' ').trim().slice(0, 110));
  await pg.evaluate(() => { document.documentElement.setAttribute('data-tema', 'gelap'); const b = document.querySelector('#mp227Lapis .mp219-db'); b.scrollTop = b.scrollHeight; }); await pg.waitForTimeout(400); await pg.screenshot({ path: OUT + '/ui-uji-penyedia.png' }); await pg.evaluate(() => document.documentElement.removeAttribute('data-tema'));
  await pg.locator('#mp227AMsg button:has-text("Nonaktifkan")').click(); await pg.waitForFunction(() => /Setelan tersimpan/.test((document.getElementById('mp227AMsg') || {}).textContent || ''));
  ok(!(await pg.locator('.mp227-pv[data-id="lokal"] .pv-aktif').isChecked()) && JSON.parse(C.__props.AI_SET).providers.lokal.aktif === false, 'tombol "Nonaktifkan penyedia yang gagal" menyimpan aktif=false');
  C.__jawabHTTP = jawabSemula; await pg.locator('.mp227-pv[data-id="lokal"] .pv-aktif').check(); await pg.evaluate(() => window.mp227AiSimpan(false)); await pg.waitForFunction(() => /Setelan tersimpan/.test((document.getElementById('mp227AMsg') || {}).textContent || ''));
  await pg.locator('.mp227-pv[data-id="openai"] .pv-kunci').fill('https://api.openai.com/v1/xx6812'); await pg.evaluate(() => window.mp227AiSimpan(false)); await pg.waitForSelector('#mp227AMsg .alert-danger');
  ok(/berisi alamat URL/.test(await pg.textContent('#mp227AMsg')), 'key berupa URL ditolak di form setelan');
  await pg.locator('.mp227-pv[data-id="openai"] .pv-kunci').fill('');
  ok(await pg.locator('.mp227-pv[data-id="lokal"]').count() === 1, 'penyedia tambahan tersimpan');
  await pg.screenshot({ path: OUT + '/ui-setelan.png' });
  await pg.evaluate(() => window.mp227Tutup());
  // 2. panel + dropdown
  await pg.click('#mp227AiFab'); await pg.waitForSelector('#mp227Ai');
  const opsi = await pg.$$eval('#mp227AiProv option', o => o.map(x => x.value)); ok(opsi.join() === 'openai,lokal' && await pg.inputValue('#mp227AiProv') === 'openai', 'dropdown penyedia aktif: ' + opsi.join());
  ok(await pg.locator('.mp227-pc button').count() === 5, '5 tombol Perintah Cepat (termasuk Verifikasi tagihan)');
  // 3. chat agen (baca otomatis)
  await pg.fill('#mp227AiIn', 'Berapa kontrak di register?'); await pg.keyboard.press('Enter');
  await pg.waitForFunction(() => !document.querySelector('.mp227-ngetik') && document.querySelectorAll('.mp227-msg.ai').length >= 1);
  ok(await pg.locator('.mp227-lk span.ok').count() === 1 && /1 kontrak/.test(await pg.locator('.mp227-msg.ai .isi').last().textContent()), 'agen: langkah baca + jawaban (tabel md)');
  // 4. usulan tulis → Terapkan
  await pg.fill('#mp227AiIn', 'Tolong buat paket PBJ semen'); await pg.keyboard.press('Enter');
  await pg.waitForSelector('.mp227-us .btn-primary');
  ok(/PBJ BARU/.test(await pg.locator('.mp227-us .pr').textContent()), 'kartu usulan + pratinjau dry-run');
  ok(K.bacaPBJ_(P).length === 0, 'belum tertulis sebelum Terapkan');
  await pg.locator('.mp227-us .btn-primary').click(); await pg.waitForSelector('.mp227-us.diterapkan');
  ok(K.bacaPBJ_(P).length === 1 && K.bacaPBJ_(P)[0].nama === 'Paket Semen Uji', 'Terapkan → PBJ tertulis');
  // 5. perintah cepat + saran
  await pg.locator('.mp227-pc button').first().click(); await pg.waitForSelector('.mp227-msg.an');
  ok(await pg.locator('.mp227-tm li').count() === 2 && await pg.locator('.mp227-sr').count() === 3, 'analisis: temuan & kartu saran');
  await pg.locator('.mp227-sr').nth(0).locator('.btn-primary').click(); await pg.waitForFunction(() => !!document.querySelector('.mp227-an-h .fa-magnifying-glass'));
  ok(/"total"/.test(await pg.locator('.mp227-pre').last().textContent()), 'Jalankan saran baca → hasil');
  await pg.locator('.mp227-sr').nth(1).locator('.btn-primary').click(); await pg.waitForFunction(() => document.querySelectorAll('.mp227-us').length === 2);
  ok(/Paket Besi D13/.test(await pg.locator('.mp227-us').last().textContent()), 'Jalankan saran tulis → usulan');
  await pg.locator('.mp227-us').last().locator('button:has-text("Batal")').click(); await pg.waitForSelector('.mp227-us.dibatalkan');
  ok(K.bacaPBJ_(P).length === 1, 'Batal → tidak ada penulisan');
  await pg.locator('.mp227-sr').nth(2).locator('button:has-text("Tandai selesai")').click(); await pg.waitForSelector('.mp227-sr.selesai');
  ok(true, 'Tandai selesai');
  ok(await pg.locator('.mp227-pc button[disabled]').count() === 5 && /tunggu \d+ dtk/.test(await pg.textContent('#mp227Pc')), 'jeda 60 detik: tombol nonaktif + hitung mundur (bukan galat)');
  ok(await pg.locator('.mp227-pc').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Perintah Cepat tanpa scroll horizontal');
  // [2.2.10] dropdown = penyedia terkirim; galat HTML; Coba lagi / Coba dengan penyedia lain
  await pg.selectOption('#mp227AiProv', 'lokal');
  const jawabAsli = C.__jawabHTTP; let urlTerakhir = '';
  C.__jawabHTTP = (u, o) => { urlTerakhir = u; return { kode: 404, teks: '<html lang="en"><meta charset=utf-8><title>Error 404 (Not Found)!!1</title></html>' }; };
  await pg.fill('#mp227AiIn', 'Tagihan mana yang dokumennya belum lengkap?'); await pg.keyboard.press('Enter');
  await pg.waitForSelector('.mp227-msg.galat .mp227-ul');
  const tg = await pg.locator('.mp227-msg.galat').last().textContent();
  ok(/llm\.contoh\.id/.test(C.__http.find(h => /llm\.contoh/.test(h.url)).url) && /LLM Lokal \(HTTP 404\)/.test(tg) && !/<html|<meta/.test(tg), 'penyedia dari dropdown dipakai; galat tanpa HTML: ' + tg.slice(0, 70));
  ok(await pg.locator('.mp227-ul button').count() === 2 && /Coba dengan OpenAI/.test(await pg.textContent('.mp227-ul')), 'tombol Coba lagi + Coba dengan OpenAI');
  C.__jawabHTTP = (u, o) => { urlTerakhir = u; return { kode: 200, teks: { model: 'gpt-5-mini', choices: [{ message: { content: 'Jawaban dari OpenAI setelah dialihkan.' } }], usage: {} } }; };
  const nMsg = await pg.locator('.mp227-msg').count();
  await pg.locator('.mp227-ul button:has-text("Coba dengan OpenAI")').click();
  await pg.waitForFunction(() => /dialihkan/.test(document.getElementById('mp227AiLog').innerText) && !document.querySelector('.mp227-ngetik'));
  ok(await pg.locator('.mp227-msg.galat .mp227-ul').count() === 0 && await pg.locator('.mp227-msg').count() === nMsg && await pg.inputValue('#mp227AiProv') === 'openai' && /api\.openai\.com/.test(urlTerakhir), 'Coba dengan OpenAI: galat diganti jawaban, dropdown ikut OpenAI');
  C.__jawabHTTP = jawabAsli;
  // 6. ekspor
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.evaluate(() => window.mp227AiEkspor())]);
  const isiMd = fs.readFileSync(await dl.path(), 'utf8'); fs.writeFileSync(OUT + '/contoh-ekspor-ringkasan.md', isiMd);
  ok(/^# Ringkasan Asisten AI/.test(isiMd) && /Temuan:/.test(isiMd) && dl.suggestedFilename().endsWith('.md'), 'Ekspor ringkasan .md: ' + dl.suggestedFilename());
  // 7. kontras (terang & gelap)
  const kontras = () => pg.evaluate(() => {
    const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number), lum = c => { const a = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
    const cr = (f, b) => { const x = lum(rgb(f)), y = lum(rgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const cs = el => getComputedStyle(el), bgOf = el => { while (el) { const b = cs(el).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; el = el.parentElement; } return 'rgb(255,255,255)'; };
    const cek = sel => { const el = document.querySelector(sel); return el ? +cr(cs(el).color, bgOf(el)).toFixed(2) : null; };
    const panel = document.getElementById('mp227Ai'), body = document.getElementById('mp227AiLog');
    return { panelBg: cs(panel).backgroundColor, bodyBg: cs(body).backgroundColor, bodyColor: cs(body).color, filter: cs(panel).filter + '|' + cs(body).filter, opacity: cs(body).opacity,
      isi: cek('.mp227-msg.ai .isi'), kaki: cek('.mp227-msg .kaki'), header: cek('.mp227-ai-h b'), headerSmall: cek('.mp227-ai-h small'), temuan: cek('.mp227-tm li > div > div'), saranD: cek('.mp227-sr .d'), pc: cek('.mp227-pc button'), ta: cek('#mp227AiIn') };
  });
  const T = await kontras(); console.log('    terang:', JSON.stringify(T));
  ok(T.panelBg === 'rgb(255, 255, 255)' && T.bodyBg === 'rgb(244, 246, 250)' && T.bodyColor === 'rgb(11, 31, 58)', 'terang: panel solid #fff, isi #0B1F3A di #F4F6FA');
  ok(['isi', 'kaki', 'header', 'headerSmall', 'temuan', 'saranD', 'pc', 'ta'].every(k => T[k] >= 4.5) && T.filter === 'none|none' && T.opacity === '1', 'terang: semua teks ≥ 4.5:1, tanpa filter/opacity');
  await pg.screenshot({ path: OUT + '/ui-terang.png' });
  await pg.evaluate(() => document.documentElement.setAttribute('data-tema', 'gelap'));
  const G = await kontras(); console.log('    gelap :', JSON.stringify(G));
  ok(G.panelBg === 'rgb(19, 37, 59)' && ['isi', 'kaki', 'header', 'headerSmall', 'temuan', 'saranD', 'pc', 'ta'].every(k => G[k] >= 4.5), 'gelap: --f-kartu konsisten & semua teks ≥ 4.5:1');
  await pg.screenshot({ path: OUT + '/ui-gelap.png' });
  ok(!galatJS.length, 'tanpa galat JavaScript' + (galatJS.length ? ': ' + galatJS.join('; ') : ''));
  console.log('\nLULUS ' + lulus + ' cek UI'); await br.close();
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
