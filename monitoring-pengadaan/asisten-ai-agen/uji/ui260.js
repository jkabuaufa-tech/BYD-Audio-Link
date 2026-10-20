// Uji UI 2.6.0 di Chromium: blok MP260 ASLI dari paket.
// A. Kontrak Master 028 hasil migrasi berisi 12 item Putra Paloh (027) + 5 item anugerah (028) → perbaikan sesuai spreadsheet, Master tidak diubah, dapat dibatalkan.
// B. Detak kehadiran & panel Pengguna online (Admin).
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.0.json', 'utf8')), js = PK.js, css = PK.css;
const mp260 = js.slice(js.indexOf('/* MP260 — PEMBARUAN 2.6.0')); assert.ok(mp260.length > 5000);
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const K28 = '028/SPM/WK-NK.KSO/PDBJ/1726012/2026', K27 = '027/SPM/WK-NK.KSO/PDBJ/1726012/2026', PFX = 'SISTEM-PERBAIKAN-REGISTER|';
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1300, height: 950 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,Arial;margin:0;font-size:14px}.form-control{width:100%;box-sizing:border-box;padding:4px}.btn{border:1px solid #ccc;border-radius:6px;padding:3px 9px;background:#fff}.text-end{text-align:right}.d-none{display:none}</style><style>${css}</style></head>
    <body><nav id="sidebar"><ul class="nav"><li><a class="nav-link active">Register Kontrak</a></li></ul></nav>
    <div class="menu-akun"><ul class="dropdown-menu"><li><a onclick="bukaKoneksi()">Koneksi server</a></li><li><a id="mp220MenuDiag">Diagnostik sistem</a></li></ul></div>
    <main><div class="content-tab" id="tab-kontrak"><table><tbody id="regBody"></tbody></table></div><div class="content-tab" id="tab-dash" style="display:none">dasbor</div></main></body></html>` }));
  await pg.goto('https://app.test/');
  await pg.evaluate(([K28, K27]) => {
    // Master (Excel) hasil migrasi — 028 berisi 12 item Putra Paloh (No 23 / 027) + 5 item anugerah (No 24 / 028)
    const it = (kodeItem, itemPekerjaan, volume, satuan, harga) => ({ kodeItem, itemPekerjaan, volume, satuan, harga, wbs: '1726012-99-02-02' });
    const I = [it('1800000619', 'HT Alinco DJ-A10', 4, 'UN', 2150000), it('1800000034', 'Terpal 4x3', 20, 'LBR', 95000), it('2100000176', 'LCD Proyektor Epson Eb-X450', 1, 'UN', 8900000),
      it('2100000100', 'Meja Kantor 120x75x75cm', 6, 'UN', 1850000), it('1400000628', 'Kabel Twisted 2x16mm2 Martindo', 300, 'M', 18500), it('1400000491', 'Box Panel Listrik 50x60', 2, 'UN', 1250000),
      it('1400000045', 'Kabel NYM 2x1,5mm2 ETERNA', 10, 'ROL', 525000), it('1000003678', 'Semen PC Tiga Roda @40 Kg', 25, 'Zak', 62000), it('1100003068', 'Cat Tembok Q Luc Putih @18kg', 3, 'PL', 1150000),
      it('1000000892', 'Besi Hollow 30x30mm t=1,2mm L=6m', 15, 'BTG', 78000), it('1800003249', 'Mesin Bor Tangan 10mm GBM 350 Bosch', 1, 'UN', 865000), it('1800000088', 'Gerinda Tangan GWS 060', 2, 'UN', 640000),
      it('1800000052', 'Converter 1 Phase', 1, 'UN', 24500000), it('1800001651', 'Shaft Vibrator Mikasa Fx 50 Mikasa', 2, 'UN', 9750000), it('1800001652', 'Shaft Vibrator Mikasa Fx 60 Mikasa', 2, 'UN', 10850000),
      it('1800002258', 'Portable Vibrator Mtr Assy MGX-28 Mikasa', 1, 'UN', 21500000), it('1800002259', 'Portable Vibrator MGX 28x1680mm Mikasa', 1, 'UN', 0)];
    const s16 = I.slice(0, 16).reduce((s, x) => s + x.volume * x.harga, 0); I[16].harga = 162044900 - s16;
    window.MASTER = [{ key: K28, namaVendor: 'Putra Paloh, CV', idVendor: '2100010709', jenisKontrak: 'SPM', kelompok: 'BAHAN', noPO: '4500012345', statusKey: 'selesai', realisasi: 162044900, items: I },
      { key: '001/SPSA/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'CV Gema', idVendor: '2100000001', jenisKontrak: 'SPSA', kelompok: 'ALAT', statusKey: 'berjalan', realisasi: 0, items: [it('3000000001', 'Sewa Excavator', 1, 'BLN', 50000000)] }];
    window.MASTER_ASLI = JSON.stringify(window.MASTER);
    window.KOREKSI = { data: {} }; window.koreksiDari = k => KOREKSI.data[k] || null;
    window.PROG = { data: [{ id: 'P1', noKontrak: K28, tagihanKe: 1, nilai: 162044900 }] };
    window.REG = { url: 'https://srv/exec', sesi: { nama: 'Joko Supriyono', peran: 'PENGADAAN', admin: true }, data: [{ id: 'L1', noKontrak: '005/SPM/WK-NK.KSO/PDBJ/1726012/2026' }] };
    window.RINGKASAN = []; window.__kirim = []; window.__notif = []; window.__online = 'ada';
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.notif = (m, t) => __notif.push([m, t]); window.tanya = async () => true; window.kontrakValid = k => /^\d+\/[A-Z]+\//.test(k);
    window.MENU_CEPAT = [['kontrak', 'Register Kontrak', '', '', ''], ['dash', 'Dasbor', '', '', '']];
    window.showTab = t => { document.querySelectorAll('main .content-tab').forEach(d => { d.style.display = d.id === 'tab-' + t ? '' : 'none'; }); };
    // ringkasan kontrak dasar: dibangun ulang dari Master + koreksi setiap kali (seperti aplikasi dasar)
    window.getRingkasanKontrak = function () { return MASTER.map(m => Object.assign(JSON.parse(JSON.stringify(m)), { keyAsli: m.key, nilai: m.items.reduce((s, x) => s + x.volume * x.harga, 0), koreksi: koreksiDari(m.key), entriProgres: PROG.data.filter(e => e.noKontrak === m.key) })); };
    window.renderAllTables = () => { RINGKASAN = getRingkasanKontrak(); document.getElementById('regBody').innerHTML = RINGKASAN.map(g => `<tr class="baris-kontrak" data-key="${escHtml(g.key)}"><td><code>${escHtml(g.key)}</code></td><td class="v">${escHtml(g.namaVendor)}<div>${escHtml(g.idVendor || '')}</div></td><td class="n">${Math.round(g.nilai)}</td><td class="i">${g.items.length}</td><td><button>Perbaiki</button></td></tr>`).join(''); };
    window.regAksi = async (a, x) => {
      __kirim.push([a, JSON.parse(JSON.stringify(x || {}))]);
      if (a === 'saveKoreksi') { const d = x.data, l = KOREKSI.data[d.key]; if ((l ? l.versi : 0) !== d.versi) throw new Error('KONFLIK'); return { ok: true, data: Object.assign({}, d.data, { key: d.key, versi: d.versi + 1, diubahOleh: 'Joko Supriyono', diubahPada: '2026-10-20T03:00:00Z' }) }; }
      if (a === 'hadirDetak') { if (window.__online === 'tidak') throw new Error('Aksi tidak dikenal: hadirDetak'); return { ok: true }; }
      if (a === 'hadirDaftar') { if (window.__online === 'tidak') throw new Error('Aksi tidak dikenal: hadirDaftar');
        return { ok: true, waktu: '2026-10-20T03:05:00Z', data: [{ nama: 'Staf Pengadaan', peran: 'PENGADAAN', jabatan: 'Staf', online: true, umurDetik: 25, hadir: { menu: 'Register Kontrak', aktivitas: 'Perbaiki item kontrak Master · 028/SPM', aksi: 'saveKoreksi · perbaikan 028/SPM', aksiPada: '2026-10-20T03:04:00Z', perangkat: 'Komputer · browser', mulai: '2026-10-20T01:00:00Z' }, logTerakhir: [{ waktu: '2026-10-20T03:04:00Z', aksi: 'KOREKSI KONTRAK', noKontrak: K28 }] },
          { nama: 'Staf Gudang', peran: 'PENGADAAN', online: false, diam: true, umurDetik: 400, hadir: { menu: 'Kartu Gudang', perangkat: 'HP/Tablet · browser' }, logTerakhir: [] },
          { nama: 'Kepala Proyek', peran: 'LIHAT', online: false, diam: false, umurDetik: null, hadir: null, logTerakhir: [] }] }; }
      if (a === 'save') return { ok: true, data: x.data };
      throw new Error('aksi tidak dikenal: ' + a);
    };
    renderAllTables();
  }, [K28, K27]);
  await pg.addScriptTag({ content: mp260 });
  await pg.evaluate(() => renderAllTables()); await pg.waitForTimeout(400);
  const g = k => pg.evaluate(k => { const x = RINGKASAN.find(z => z.key === k); return x ? { n: x.items.length, nilai: Math.round(x.nilai), v: x.namaVendor, id: x.idVendor, kode: x.items.map(i => i.kodeItem), ent: (x.entriProgres || []).length, real: x.realisasi, st: x.statusKey, wbs: x.items.every(i => i.wbs === '1726012-99-02-02'), po: x.noPO } : null; }, k);

  console.log('1. Keadaan migrasi (sebelum perbaikan)');
  let a = await g(K28); ok(a.n === 17 && a.nilai === 162044900 && a.v === 'Putra Paloh, CV' && !(await g(K27)), '028 = 17 item · Putra Paloh, CV · Rp 162.044.900; 027 belum ada (masalah yang dilaporkan)');
  ok(await pg.evaluate(() => document.querySelectorAll('tr.baris-kontrak .mp260-btn').length === 2), 'tombol "Perbaiki item kontrak" tampil di setiap baris Master');
  console.log('2. Buka perbaikan 028 → usulan sesuai spreadsheet terisi');
  await pg.click(`tr[data-key="${K28}"] .mp260-btn`); await pg.waitForTimeout(200);
  ok(await pg.isVisible('#mp260Reg') && /Usulan sesuai spreadsheet/.test(await pg.textContent('#mp260Reg .mp260-isi')), 'dialog terbuka dengan usulan sesuai spreadsheet');
  const cek = await pg.$$eval('#mp260Reg input[data-i]', L => L.map(x => x.checked));
  ok(cek.length === 17 && cek.slice(0, 12).every(Boolean) && cek.slice(12).every(x => !x), '12 item Putra Paloh dicentang pindah, 5 item anugerah (Converter, Shaft Vibrator Fx50/60, MGX-28, MGX 28x1680) tetap');
  ok(await pg.inputValue('#mp260Ke') === K27 && await pg.inputValue('#mp260VT') === 'Putra Paloh, CV' && await pg.inputValue('#mp260KT') === '2100010709' && await pg.inputValue('#mp260VS') === 'anugerah' && await pg.inputValue('#mp260KS') === '', 'tujuan 027 · Putra Paloh, CV · 2100010709; sumber 028 · anugerah (kode vendor kosong seperti spreadsheet)');
  const rk = await pg.textContent('#mp260Rekap'); ok(/028 tetap: 5 item/.test(rk) && /027: 12 item/.test(rk) && /Jumlah Rp 162\.044\.900/.test(rk) && (rk.match(/tagihan 100%/g) || []).length === 2, 'rekap: 028 5 item, 027 12 item, jumlah tetap Rp 162.044.900, tagihan keduanya 100%');
  ok(await pg.$eval('#mp260Bagi', el => el.checked), 'opsi "bagi tagihan proporsional" tercentang pada usulan');
  ok(/tagihan\/progres: realisasi Rp 162\.044\.900 \(100%\)/.test(await pg.textContent('#mp260Reg')), 'info tagihan tercatat 100% ditampilkan');
  await pg.screenshot({ path: OUT + '/260-perbaikan-usulan.png' });
  console.log('3. Validasi');
  const coba = async (sel, val, pola, m) => { const lama = await pg.inputValue(sel); await pg.fill(sel, val); await pg.click('#mp260Simpan'); await pg.waitForTimeout(150); ok(pola.test(await pg.textContent('#mp260Pesan')), m); await pg.fill(sel, lama); };
  await coba('#mp260Ke', K28, /harus berbeda/, 'tujuan = sumber ditolak');
  await coba('#mp260Ke', '005/SPM/WK-NK.KSO/PDBJ/1726012/2026', /kontrak Register/, 'tujuan kontrak Register ditolak (edit lewat Register)');
  await coba('#mp260Alasan', 'singkat', /minimal 10 karakter/, 'alasan wajib ≥ 10 karakter');
  ok(!(await pg.evaluate(() => __kirim.some(k => k[0] === 'saveKoreksi'))), 'tidak ada yang tersimpan selama validasi gagal');
  console.log('4. Simpan perbaikan');
  await pg.click('#mp260Simpan'); await pg.waitForTimeout(300);
  const kir = await pg.evaluate(() => __kirim.filter(k => k[0] === 'saveKoreksi'));
  ok(kir.length === 1 && kir[0][1].data.key === PFX_() && kir[0][1].data.versi === 0 && kir[0][1].data.data.pindah[0].items.length === 12, 'satu catatan koreksi berversi "' + 'SISTEM-PERBAIKAN-REGISTER|028/…" (aksi saveKoreksi yang sudah ada)'.replace('PFX_()', ''));
  a = await g(K28); let b = await g(K27);
  ok(a.n === 5 && a.v === 'anugerah' && a.id === '' && a.kode.join() === '1800000052,1800001651,1800001652,1800002258,1800002259', '028: 5 item anugerah (sesuai spreadsheet No 24)');
  ok(b && b.n === 12 && b.v === 'Putra Paloh, CV' && b.id === '2100010709' && b.kode[0] === '1800000619' && b.kode[10] === '1800003249', '027: 12 item Putra Paloh, CV · 2100010709 (sesuai spreadsheet No 23)');
  ok(a.nilai + b.nilai === 162044900 && b.nilai === (await pg.evaluate(() => MASTER[0].items.slice(0, 12).reduce((s, x) => s + x.volume * x.harga, 0))), 'nilai dipecah per item: 027 + 028 = Rp 162.044.900');
  ok(a.ent === 1 && b.ent === 0 && a.real === a.nilai && b.real === b.nilai && b.st === 'selesai' && a.real + b.real === 162044900, 'tagihan dibagi proporsional: 027 & 028 masing-masing tetap 100% (catatan tagihan tetap di 028, tidak dipindah)');
  ok(await pg.evaluate(() => PROG.data.length === 1 && PROG.data[0].noKontrak === MASTER[0].key && PROG.data[0].nilai === 162044900), 'catatan tagihan asli tidak berubah');
  ok(a.wbs && b.wbs && b.po === '4500012345', 'WBS item tetap; data PO ikut tersalin ke 027 (dapat dikoreksi)');
  ok(await pg.evaluate(() => JSON.stringify(MASTER) === MASTER_ASLI), 'data Master (Excel) TIDAK berubah');
  ok(await pg.evaluate(k => document.querySelector(`tr[data-key="${k}"] .mp260-tanda`) && /item diperbaiki/.test(document.querySelector(`tr[data-key="${k}"]`).textContent), K28) && await pg.evaluate(k => /dipisah dari 028/.test(document.querySelector(`tr[data-key="${k}"]`).textContent), K27), 'daftar: 028 bertanda "item diperbaiki", 027 bertanda "dipisah dari 028"');
  await pg.evaluate(() => { renderAllTables(); renderAllTables(); }); a = await g(K28); b = await g(K27);
  ok(a.n === 5 && b.n === 12 && (await pg.evaluate(() => RINGKASAN.length)) === 3, 'dibangun ulang berkali-kali → hasil sama, tanpa kontrak ganda');
  await pg.screenshot({ path: OUT + '/260-perbaikan-hasil.png' });
  console.log('5. Buka ulang & batalkan');
  await pg.click(`tr[data-key="${K27}"] .mp260-tanda`).catch(() => { }); await pg.evaluate(k => mp260Buka(k), K27); await pg.waitForTimeout(150);
  ok(await pg.inputValue('#mp260Ke') === K27 && !/Usulan sesuai/.test(await pg.textContent('#mp260Reg .mp260-isi')) && /Perbaikan aktif/.test(await pg.textContent('#mp260Reg .mp260-isi')), 'membuka 027 → diarahkan ke perbaikan sumber 028 (isian tersimpan, versi 1)');
  await pg.click('#mp260Reg .btn-outline-danger'); await pg.waitForTimeout(300);
  a = await g(K28); ok(a.n === 17 && a.v === 'Putra Paloh, CV' && !(await g(K27)), 'Batalkan → kembali ke tampilan Master asli');
  ok(await pg.evaluate(() => { const k = __kirim.filter(x => x[0] === 'saveKoreksi'); return k.length === 2 && k[1][1].data.versi === 1 && k[1][1].data.data.aktif === false; }), 'pembatalan = versi baru aktif:false (riwayat tetap)');
  console.log('6. Peran LIHAT: hanya melihat');
  await pg.evaluate(() => { REG.sesi.peran = 'LIHAT'; mp260Buka(MASTER[0].key); });
  ok(!(await pg.$('#mp260Simpan')) && await pg.$eval('#mp260Ke', el => el.disabled), 'tanpa tombol Simpan, isian terkunci'); await pg.evaluate(() => { REG.sesi.peran = 'PENGADAAN'; mp260Tutup('mp260Reg'); });
  console.log('7. Kehadiran: detak & panel Admin');
  await pg.evaluate(() => { __kirim = []; mp260Detak(); }); await pg.waitForTimeout(100);
  let d = await pg.evaluate(() => __kirim.filter(k => k[0] === 'hadirDetak').map(k => k[1].data));
  ok(d.length === 1 && d[0].menu === 'Register Kontrak' && d[0].tab === 'kontrak' && /Komputer/.test(d[0].perangkat) && d[0].status === 'aktif', 'detak: menu Register Kontrak · tab · perangkat · aktif');
  await pg.evaluate(async () => { __kirim = []; await regAksi('save', { data: { id: 'L1', noKontrak: '005/SPM/WK-NK.KSO/PDBJ/1726012/2026' } }); }); await pg.waitForTimeout(2800);
  d = await pg.evaluate(() => __kirim.filter(k => k[0] === 'hadirDetak').map(k => k[1].data));
  ok(d.length === 1 && d[0].aksi === 'Simpan kontrak Register · 005/SPM/WK-NK.KSO/PDBJ/1726012/2026', 'setelah menyimpan → detak membawa aksi terakhir "Simpan kontrak Register · 005/SPM/…"');
  await pg.evaluate(() => { __kirim = []; showTab('dash'); }); await pg.waitForTimeout(2800);
  d = await pg.evaluate(() => __kirim.filter(k => k[0] === 'hadirDetak').map(k => k[1].data)); ok(d.length >= 1 && d.every(x => x.menu === 'Dasbor'), 'pindah menu → detak segera (Dasbor)');
  ok(await pg.evaluate(() => !!document.getElementById('mp260MenuOnline')), 'menu akun › "Pengguna online" untuk Admin');
  await pg.evaluate(() => { showTab('kontrak'); mp260Online(); }); await pg.waitForTimeout(300);
  const t = await pg.textContent('#mp260Online');
  ok(/1 online · 1 diam\/tidak aktif · 1 offline/.test(t) && /Staf Pengadaan/.test(t) && /Perbaiki item kontrak Master/.test(t) && /saveKoreksi · perbaikan 028\/SPM/.test(t) && /KOREKSI KONTRAK/.test(t) && /Kartu Gudang/.test(t), 'panel: status, menu/aktivitas, aksi terakhir, catatan Log');
  await pg.screenshot({ path: OUT + '/260-pengguna-online.png' });
  await pg.evaluate(() => { REG.sesi.admin = false; }); await pg.evaluate(() => mp260Online()); ok((await pg.evaluate(() => __notif.pop()[0])) === 'Khusus Admin.', 'non-Admin tidak dapat membuka panel'); await pg.evaluate(() => { REG.sesi.admin = true; mp260Tutup('mp260Online'); });
  await pg.evaluate(() => { window.__online = 'tidak'; mp260Online(); }); await pg.waitForTimeout(300);
  ok(/unggah server-modul-1\.8\.8\.json/.test(await pg.textContent('#mp260Online')), 'server tanpa modul 1.8.8 → panduan pasang modul');
  await pg.evaluate(async () => { MP260_HADIR.dukung = null; __kirim = []; await mp260Detak(); await mp260Detak(); await mp260Detak(); }); ok(await pg.evaluate(() => __kirim.filter(k => k[0] === 'hadirDetak').length === 1 && MP260_HADIR.dukung === false), 'detak berhenti otomatis bila server belum mendukung (1 percobaan, tanpa galat)');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); console.log('\nLULUS ' + lulus + ' cek');
})().catch(e => { console.error(e); process.exit(1); });
function PFX_() { return PFX + K28; }
