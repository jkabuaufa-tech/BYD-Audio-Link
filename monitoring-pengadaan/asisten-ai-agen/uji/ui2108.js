// Uji UI Pembaruan 2.10.8 (blok MP2105) di Chromium, tersambung ke Modul server 1.10.11 ASLI lewat kernel tiruan (uji/kernel_tiruan.js):
// pita audit → dialog Periksa & bersihkan → BERSIHKAN → Ubah foto penerimaan → pengaman ID ganda.
//   node uji/ui2108.js [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const { buatModul } = require('./kernel_tiruan.js');
const R = path.join(__dirname, '..'), paket = JSON.parse(fs.readFileSync(path.join(R, 'pembaruan-2.10.8.json'), 'utf8'));
const blok = fs.readFileSync(path.join(R, 'sumber', 'pembaruan-2.10.8-integritas-gudang.js'), 'utf8');
assert.ok(paket.js.includes(blok.trim()), 'paket 2.10.8 memuat blok MP2105 apa adanya');
assert.ok(paket.js.includes("+ (window.mp2105TombolFoto ? window.mp2105TombolFoto(k) : '')"), 'kait tombol Ubah foto terpasang di daftar kiriman');
const K = buatModul(path.join(R, 'server-modul-1.10.11.json')), A = K.MODUL.aksi, P = 'JICT', out = process.argv[2];
const U = { 'Joko Supriyono': { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' }, 'Staf Pengadaan': { nama: 'Staf Pengadaan', peran: 'PENGADAAN' }, 'Nabila': { nama: 'Nabila', peran: 'LIHAT' } };
K.props.GUDANG_PETUGAS = JSON.stringify(['Nabila']);
let n = 0; const now = () => new Date(Date.UTC(2026, 10, 11, 2, 0, n++)).toISOString();
K.koleksi[P + '|permintaan'] = [{ nomor: 'BON/001', tanggal: '2026-10-05', departemen: 'Logistik', items: [{ kode: '1600000073', uraian: 'Peluit', sat: 'EA', vol: 12, harga: 20000 }, { kode: '1600000074', uraian: 'Gembok ATS 70mm', sat: 'PC', vol: 7, harga: 75000 },
  { kode: '1600000076', uraian: 'Kabel Ducting 25x40mm 1,7m', sat: 'BTG', vol: 100, harga: 30000 }, { kode: '1600000080', uraian: 'Semen', sat: 'SAK', vol: 300, harga: 60000 }] }];
K.koleksi[P + '|progres'] = [{ id: 'PRG1', nomorBA: '01/BAPM/064/SPM/WK-NK.KSO/PDBJ/1726012/2026', noKontrak: '064/SPM/WK-NK.KSO/PDBJ/1726012/2026', tanggal: '2026-11-02', tanggalBA: '2026-11-02', versi: 1 }];
A.gudangImporMigrasi({ data: { format: 'monitoring-pengadaan-migrasi-gudang', proyek: P, masuk: [{ id: 'GR-MIG-0001', tanggal: '2026-09-01', kode: '1600000073', uraian: 'Peluit', sat: 'EA', qty: 12 }, { id: 'GR-MIG-0002', tanggal: '2026-09-01', kode: '1600000076', uraian: 'Kabel Ducting 25x40mm 1,7m', sat: 'BTG', qty: 100 }, { id: 'GR-MIG-0003', tanggal: '2026-08-20', kode: '1600000080', uraian: 'Semen', sat: 'SAK', qty: 500 }],
  keluar: [{ id: 'GI-MIG-0001', tanggal: '2026-09-01', kode: '1600000073', uraian: 'Peluit', sat: 'EA', qty: 12, penerima: '(data lama - tidak tercatat)' }, { id: 'GI-MIG-0002', tanggal: '2026-09-03', kode: '1600000076', uraian: 'Kabel Ducting 25x40mm 1,7m', sat: 'BTG', qty: 40, penerima: 'Pak Budi', untuk: 'Dermaga' }] } }, U['Joko Supriyono'], P, now());
const oto = A.gudangOtomatisProgres({ data: { progresId: 'PRG1', baris: [0, 1, 2, 3].map(i => ({ bonNomor: 'BON/001', bonIdx: i, sd: [12, 7, 100, 300][i] })) } }, U['Staf Pengadaan'], P, now());

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: out ? 2 : 1 }); const galat = [];
  pg.on('pageerror', e => galat.push(e.message));
  await pg.exposeFunction('__srv', (a, x, nama) => {
    try {
      if (a === 'ambilBerkas') { const f = K.files[x.id]; if (!f) throw new Error('Berkas tidak ditemukan.'); return { ok: true, tipe: f.tipe, data: Buffer.from(f.bytes.map(v => v & 255)).toString('base64') }; }
      if (!A[a]) throw new Error('Aksi tidak dikenal: ' + a);
      return JSON.parse(JSON.stringify(A[a](x || {}, U[nama], P, now())));
    } catch (e) { return { ok: false, error: e.message }; }
  });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px system-ui,Arial,sans-serif;margin:16px;background:#f4f6f9;color:#1f2937}.content-tab{background:#fff;border-radius:10px;padding:14px;margin-bottom:14px}
    .btn{border:1px solid transparent;border-radius:6px;padding:4px 10px;font-size:13px;cursor:pointer;background:#e5e7eb}.btn-sm{padding:3px 8px;font-size:12.5px}.btn-warning{background:#f7b84b}.btn-danger{background:#d92d20;color:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-light{background:#fff}.border{border:1px solid #cbd5e1}
    .btn-close{border:0;background:none;font-size:18px;cursor:pointer}.btn-close:before{content:"×"}.form-control,.form-select{border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;width:100%;box-sizing:border-box}.small{font-size:12.5px}.mb-2{margin-bottom:8px}.mt-2{margin-top:8px}.mt-1{margin-top:4px}
    .py-0{padding-top:0;padding-bottom:0}.mb-0{margin-bottom:0}.text-success{color:#2E9E5B}.alert{padding:8px;border-radius:8px}table.k{width:100%;border-collapse:collapse;font-size:13px}table.k td,table.k th{border-bottom:1px solid #eef1f5;padding:6px;text-align:left}
    ${paket.css}</style></head><body>
    <div id="tab-gdmasuk" class="content-tab"><h3>Penerimaan Material</h3><div id="mp223MasukIsi"></div></div>
    <div id="tab-gdharian" class="content-tab"><h3>Laporan Harian Gudang</h3><div id="mp223HarianIsi"></div></div>
    <div id="tab-gdkartu" class="content-tab"><h3>Kartu Gudang</h3><div id="mp223KartuIsi"></div></div></body></html>`);
  const masuk = async nama => pg.evaluate(async nama => {
    window.REG = { sesi: { nama, admin: nama === 'Joko Supriyono', peran: nama === 'Nabila' ? 'LIHAT' : 'PENGADAAN', gudang: nama === 'Nabila' } };
    window.__notif = []; window.notif = (m, t) => window.__notif.push([m, t]);
    window.mp220Srv = () => true; window.__aksi = [];
    window.regAksi = async (a, x) => { window.__aksi.push([a, JSON.parse(JSON.stringify(x || {}, (k, v) => k === 'data' && typeof v === 'string' ? '(b64 ' + v.length + ')' : v))]); const r = await window.__srv(a, x || {}, window.REG.sesi.nama); if (!r || r.ok === false) throw new Error(r && r.error || 'gagal'); return r; };
    window.MP223 = window.MP223 || { masuk: [], keluar: [], siap: false, muat: false, dok: {} };
    window.mp223Muat = async () => { const r = await window.regAksi('gudangBaca', {}); window.MP223.masuk = r.masuk; window.MP223.keluar = r.keluar; window.MP223.siap = true; };
    const kk = r => r.kiriman || ('SJ:' + String(r.noSJ || '').toLowerCase() + '|' + r.tanggal);
    window.mp223Render = () => {   // tiruan ringkas Daftar kiriman & Kartu Gudang (kode asli MP223 butuh HTML dasar aplikasi)
      const g = {}; window.MP223.masuk.forEach(r => { (g[kk(r)] = g[kk(r)] || { key: kk(r), rows: [], r0: r }).rows.push(r); });
      document.getElementById('mp223MasukIsi').innerHTML = '<table class="k"><tr><th>Tanggal</th><th>Kiriman</th><th>Item</th><th>Foto</th><th>Status</th></tr>' + Object.values(g).map(k => { k.aktif = k.rows.some(r => r.status === 'AKTIF');
        return '<tr><td>' + k.r0.tanggal + '</td><td>' + k.r0.noSJ + '</td><td>' + k.rows.map(r => r.uraian + ' ' + r.qty).join(' · ') + '</td><td class="foto">' + k.rows[0].foto.filter(Boolean).length + ' foto' + (window.mp2105TombolFoto ? window.mp2105TombolFoto(k) : '') + '</td><td>' + (k.aktif ? 'Aktif' : 'Batal') + '</td></tr>'; }).join('') + '</table>';
      const pl = window.MP223.masuk.filter(r => r.status === 'AKTIF' && r.kode === '1600000073').sort((a, b) => a.tanggal.localeCompare(b.tanggal)); let t = 0;
      document.getElementById('mp223KartuIsi').innerHTML = '<table class="k"><tr><th>Peluit 1600000073 — Tanggal</th><th>Penerimaan</th><th>Jumlah terusan</th></tr>' + pl.map(r => '<tr><td>' + r.tanggal + '</td><td>' + r.qty + '</td><td class="terusan">' + (t += r.qty) + '</td></tr>').join('') + '</table>';
    };
    await window.mp223Muat(); window.mp223Render();
  }, nama);
  const tunggu = ms => pg.waitForTimeout(ms || 700), teks = sel => pg.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const jpeg = Buffer.from((await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.fillStyle = '#2E9E5B'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#fff'; g.font = '28px Arial'; g.fillText('FOTO ULANG', 60, 130); return c.toDataURL('image/jpeg', 0.8); })).split(',')[1], 'base64');
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const tangkap = async nm => { if (out) await pg.screenshot({ path: path.join(out, nm), fullPage: true }); };

  // foto penerimaan dilengkapi dulu oleh Staf (agar ada foto yang bisa diubah)
  await masuk('Staf Pengadaan');
  await pg.evaluate(async ({ kid, b64 }) => { const f = []; for (let i = 0; i < 2; i++) f.push((await window.regAksi('gudangUnggahFoto', { berkas: { id: 'a' + i, data: b64, nama: 'f.jpg', jenis: 'FOTO-GR', ket: 'awal' } })).data);
    await window.regAksi('gudangLengkapiFoto', { data: { kiriman: kid, foto: f } });
    await window.regAksi('gudangKeluarSimpan', { data: { kunci: '1600000073', tanggal: '2026-11-02', qty: 12, untuk: 'Pos jaga', penerima: 'Nabila', foto: f[0] } }); await window.mp223Muat(); window.mp223Render(); }, { kid: oto.kiriman, b64: jpeg.toString('base64') });
  await pg.addScriptTag({ content: blok });
  await tunggu(1200);
  console.log('A. Pita audit (Staf Pengadaan)');
  ok(/3 material perlu dibersihkan/.test(await teks('#mp2105Pita-gdkartu')) && /2 temuan pasti · 1 perlu ditinjau/.test(await teks('#mp2105Pita-gdmasuk')) && await teks('#mp2105Pita-gdharian'), 'pita audit tampil di Penerimaan, Laporan Harian & Kartu Gudang');
  ok((await pg.evaluate(() => [...document.querySelectorAll('#mp223KartuIsi .terusan')].map(e => e.textContent))).join() === '12,24', 'sebelum: Kartu Gudang Peluit 01-Sep 12 → terusan 24');
  await pg.click('#mp2105Pita-gdkartu button'); await tunggu(400);
  ok(await pg.locator('.mp2105-tb tbody tr').count() === 3 && !(await pg.locator('#mp2105Jalan').count()) && /hanya dapat dijalankan Admin/.test(await teks('#mp2105Modal')), 'Pengadaan melihat 3 temuan tanpa tombol Bersihkan');
  await pg.keyboard.press('Escape'); await pg.evaluate(() => { const w = document.getElementById('mp2105Modal'); if (w) w.remove(); });

  console.log('B. Admin: Periksa & bersihkan');
  await pg.evaluate(() => { window.MP2105.hasil = null; window.MP2105.sidik = ''; });
  await masuk('Joko Supriyono'); await tunggu(1200);
  await tangkap('integritas-gudang-pita.png');
  await pg.click('#mp2105Pita-gdmasuk button'); await tunggu(400);
  const baris = await pg.evaluate(() => [...document.querySelectorAll('.mp2105-tb tbody tr')].map(tr => ({ t: tr.textContent.replace(/\s+/g, ' '), cek: tr.querySelector('input').checked, mati: tr.querySelector('input').disabled })));
  const pl = baris.find(x => /Peluit/.test(x.t));
  ok(pl && pl.cek && /24 → 12/.test(pl.t) && /01-Sep-2026 → 02-Nov-2026/.test(pl.t) && /Pasti/.test(pl.t), 'Peluit: Pasti, tercentang, 24 → 12, catatan pertama 01-Sep-2026 → 02-Nov-2026');
  ok(baris.find(x => /Semen/.test(x.t)) && !baris.find(x => /Semen/.test(x.t)).cek && /Perlu ditinjau/.test(baris.find(x => /Semen/.test(x.t)).t), 'Semen: Perlu ditinjau, tidak dicentang otomatis');
  await tangkap('integritas-gudang-audit.png');
  await pg.click('#mp2105Jalan'); ok(/Ketik BERSIHKAN/.test(await teks('#mp2105Pesan')), 'tanpa konfirmasi → tidak dijalankan');
  await pg.fill('#mp2105Konf', 'bersihkan'); await pg.click('#mp2105Jalan'); await tunggu(1500);
  const kirim = await pg.evaluate(() => window.__aksi.filter(a => a[0] === 'gudangBersihkan').map(a => a[1].data));
  ok(kirim.length === 1 && kirim[0].pilih.length === 2 && kirim[0].pilih.every(p => p.sidik), 'gudangBersihkan dikirim sekali dengan 2 temuan pasti + sidik');
  ok((await pg.evaluate(() => [...document.querySelectorAll('#mp223KartuIsi .terusan')].map(e => e.textContent + '@' + e.parentNode.firstChild.textContent))).join() === '12@2026-11-02', 'sesudah: Kartu Gudang Peluit mulai 02-Nov-2026, terusan 12');
  ok(/1 material perlu ditinjau/.test(await teks('#mp2105Pita-gdkartu')) && /0 temuan pasti · 1 perlu ditinjau/.test(await teks('#mp2105Pita-gdkartu')) && /Pembersihan terakhir: BRS-/.test(await teks('#mp2105Modal')), 'pita & dialog diperbarui: tersisa Semen (tinjau); batch dapat diurungkan');
  ok((await pg.evaluate(() => window.__notif.map(n => n[0]).join('|'))).includes('2 material · 2 penerimaan ganda & 1 pengeluaran ganda dibatalkan · 1 tanggal disesuaikan'), 'pemberitahuan hasil pembersihan');
  await tangkap('integritas-gudang-sesudah.png');
  await pg.click('#mp2105Modal [data-tutup]');

  console.log('C. Ubah foto penerimaan');
  ok(await pg.locator('.mp2105-uf').count() === 2, 'tombol Ubah foto hanya pada kiriman aktif (BAPM & migrasi Semen); kiriman migrasi yang sudah batal tidak');
  const tombolBAPM = 'tr:has-text("OTOMATIS") .mp2105-uf';
  await pg.click(tombolBAPM); await tunggu(800);
  ok(await pg.locator('#mp2105Mat option').count() === 4 && await pg.locator('#mp2105Slot .mp2105-s.isi img').count() === 2 && !(await pg.isHidden('#mp2105SekWrap')) && await teks('#mp2105SekN') === '3', 'dialog: 4 material, 2 foto lama tampil, opsi terapkan ke 3 item lain');
  await pg.click('#mp2105FOk'); ok(/Belum ada foto yang diubah/.test(await teks('#mp2105FPesan')), 'tanpa perubahan → ditolak');
  await pg.setInputFiles('#mp2105Slot input[data-i="0"]', { name: 'ulang.jpg', mimeType: 'image/jpeg', buffer: jpeg }); await tunggu(500);
  await pg.setInputFiles('#mp2105Slot input[data-i="2"]', { name: 'kanan.jpg', mimeType: 'image/jpeg', buffer: jpeg }); await tunggu(500);
  await pg.click('#mp2105Slot [data-hapus="1"]');
  ok(await pg.locator('#mp2105Slot .mp2105-s.baru').count() === 2 && await pg.locator('#mp2105Slot .mp2105-s.isi').count() === 2, 'slot: Depan diganti, Belakang dihapus, Samping Kanan ditambah');
  await pg.click('#mp2105FOk'); ok(/alasan/.test(await teks('#mp2105FPesan')), 'alasan wajib');
  await pg.fill('#mp2105Alasan', 'foto buram, difoto ulang di gudang'); await tangkap('integritas-gudang-ubah-foto.png');
  await pg.click('#mp2105FOk'); await tunggu(1500);
  const D = A.gudangBaca({}, U['Joko Supriyono'], P), pel = D.masuk.find(r => r.kode === '1600000073' && r.status === 'AKTIF'), gem = D.masuk.find(r => r.kode === '1600000074' && r.status === 'AKTIF');
  const up = await pg.evaluate(() => window.__aksi.filter(a => a[0] === 'gudangUnggahFoto' && /ubah foto/.test(a[1].berkas.ket)).map(a => a[1].berkas));
  ok(up.length === 2 && up.every(x => x.jenis === 'FOTO-GR' && x.__tgl === '2026-11-02'), 'hanya 2 foto baru yang diunggah (jenis FOTO-GR → ikut watermark, tanggal = tanggal penerimaan)');
  ok(pel.foto[0] && !pel.foto[1] && pel.foto[2] && pel.fotoRiwayat.length === 1 && pel.fotoRiwayat[0].alasan === 'foto buram, difoto ulang di gudang' && pel.fotoWakil === false, 'server: foto Peluit diperbarui + fotoRiwayat');
  ok(gem.foto[1] && !gem.fotoRiwayat, 'item lain sekiriman tidak berubah (opsi tidak dicentang)');
  ok(!(await pg.locator('#mp2105Foto').count()) && (await pg.evaluate(() => window.__notif.slice(-1)[0][0])).includes('Foto penerimaan Peluit diperbarui'), 'dialog tertutup + pemberitahuan');

  console.log('D. Pengaman & peran');
  await pg.evaluate(() => { window.MP223.masuk = window.MP223.masuk.concat([Object.assign({}, window.MP223.masuk.find(r => r.status === 'AKTIF'))]); document.body.appendChild(document.createElement('i')); });
  await tunggu(900);
  ok(await pg.evaluate(() => new Set(window.MP223.masuk.map(r => r.id)).size === window.MP223.masuk.length), 'transaksi ber-ID sama yang terbaca dua kali hanya dihitung sekali');
  await masuk('Nabila'); await tunggu(900);
  ok(!(await pg.locator('.mp2105-pita').count()) && await pg.locator('.mp2105-uf').count() === 2, 'Petugas Gudang: tanpa pita audit, tetap dapat membuka Ubah foto');
  await pg.click(tombolBAPM); await tunggu(400); await pg.click('#mp2105Slot [data-hapus="2"]'); await pg.fill('#mp2105Alasan', 'foto samping tidak diperlukan'); await pg.click('#mp2105FOk'); await tunggu(900);
  ok(/dicatatnya sendiri/.test(await teks('#mp2105FPesan')), 'Petugas Gudang ditolak server untuk penerimaan yang bukan miliknya (pesan tampil di dialog)');
  await pg.setViewportSize({ width: 390, height: 800 }); await pg.evaluate(() => { document.getElementById('mp2105Foto').remove(); }); await masuk('Joko Supriyono'); await tunggu(1200); await pg.click('#mp2105Pita-gdmasuk button'); await tunggu(400);
  ok(await pg.evaluate(() => [...document.querySelectorAll('.mp2105-kotak, .mp2105-kotak .mp273-isi > *, .mp2105-pita')].every(e => e.getBoundingClientRect().right <= innerWidth + 1 && e.getBoundingClientRect().left >= -1)), 'ponsel 390 px: pita & dialog audit muat di layar (tabel temuan bergulir di dalam dialog)');
  await tangkap('integritas-gudang-hp.png');
  assert.deepStrictEqual(galat, [], 'tanpa galat halaman');
  console.log('UJI UI 2.10.8: ' + lulus + ' cek LULUS');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
