// Uji UI 2.6.7 di Chromium (blok MP204 WBS, MP260 & MP267 asli dari paket): koreksi item kontrak Master —
// kasus 010/SPSA Koperasi Karyawan PT Nindya, Hiab Crane 2 unit × 4 bulan (item #1 di Master bervolume kosong).
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const PK = JSON.parse(fs.readFileSync(__dirname + '/../pembaruan-2.6.7.json', 'utf8')), js = PK.js;
const potong = (a, b) => { const i = js.indexOf(a), j = js.indexOf(b, i + 10); assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const MP204 = potong('/* ---------- 2.0.4: WBS', '\n/* ---------- '), MP260 = potong('/* MP260 —', '/* MP261'), MP267 = potong('/* MP267 —', '/* MP264 — PEMBARUAN');
const NO = '010/SPSA/WK-NK.KSO/PDBJ/1726012/2026', NO2 = '002/SPSA/WK-NK.KSO/PDBJ/1726012/2026';
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1280, height: 860 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#E9EEF5}.btn{border:1px solid #ccc;border-radius:6px;padding:4px 10px;background:#fff}.btn-primary{background:#1763B3;color:#fff}
    .modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4)}.modal.show{display:block}.modal-content{background:#fff;margin:40px auto;width:900px;padding:10px}
    .form-control{width:100%;box-sizing:border-box}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:3px}.d-none{display:none}</style><style>${PK.css}</style></head><body>
    <table><tbody id="daftar"></tbody></table>
    <div class="modal" id="modalKor"><div class="modal-content"><h5>Perbaiki &amp; lengkapi data kontrak <span id="korNo"></span></h5><label>Nilai kontrak <input id="korNilai"></label>
      <div class="modal-footer d-flex"><button type="button" class="btn">Input Progres</button><button type="button" class="btn" onclick="document.getElementById('modalKor').classList.remove('show')">Batal</button><button type="button" class="btn btn-primary">Simpan Perbaikan</button></div></div></div></body></html>`);
  await pg.evaluate(([NO, NO2]) => {
    window.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.REG = { url: 'https://contoh/exec', sesi: { nama: 'Ilham A P', peran: 'PENGADAAN', admin: false }, data: [{ id: 'R9', noKontrak: '099/SPM/WK-NK.KSO/PDBJ/1726012/2026', items: [] }] };
    window.PROG = { data: [] }; window.PMT = { data: [] }; window.BKM = {}; window.KOREKSI = { data: {} };
    window.__notif = []; window.notif = (m, t) => window.__notif.push([m, t]); window.tampilModal = (id, v) => { const m = document.getElementById(id); if (m) m.classList.toggle('show', !!v); };
    window.poAktif = v => !!v; window.pesanServerLama = e => e.message; window.renderMonitoringBulanan = () => { };
    window.koreksiDari = k => window.KOREKSI.data[k] || null;
    // HTML dasar: Master dari Excel → objek ringkasan dibangun ulang tiap panggilan (item #1 Hiab Crane bervolume kosong)
    const MASTER = () => [
      { key: NO, namaVendor: 'Koperasi Karyawan PT Nindya', nilai: 408000000, realisasi: 0, entriProgres: [], items: [
        { kodeItem: '49000633', itemPekerjaan: 'Truck Uni / Mounted / Hiab Crane 10 Ton', volume: '', satuan: 'MON', hargaSatuan: 51000000 },
        { kodeItem: '49000633', itemPekerjaan: 'Truck Uni / Mounted / Hiab Crane 10 Ton', volume: 4, satuan: 'MON', hargaSatuan: 51000000 }] },
      { key: NO2, namaVendor: 'Koperasi Karyawan PT Nindya', nilai: 12000000, realisasi: 0, entriProgres: [], items: [{ kodeItem: '49000633', itemPekerjaan: 'Sewa Hiab Crane harian', volume: 1, satuan: 'LS', hargaSatuan: 12000000 }] }];
    window.getRingkasanKontrak = () => MASTER().map(g => Object.assign(g, { koreksi: window.KOREKSI.data[g.key] || null }));
    window.renderAllTables = () => { window.RINGKASAN = getRingkasanKontrak(); document.getElementById('daftar').innerHTML = RINGKASAN.map(g => `<tr class="baris-kontrak" data-key="${g.key}"><td><code>${g.key}</code></td><td>${g.items.map(i => (Number(i.volume) || 0) + ' ' + i.satuan).join(' + ')}</td><td></td></tr>`).join(''); };
    window.bukaKoreksi = k => { document.getElementById('korNo').textContent = k; document.getElementById('modalKor').classList.add('show'); };
    // server saveKoreksi (kernel): berversi, menolak versi usang
    window.__simpan = [];
    window.regAksi = async (a, x) => { window.__simpan.push([a, JSON.parse(JSON.stringify(x))]); if (a !== 'saveKoreksi') throw new Error('aksi tak terduga ' + a);
      const d = x.data, lama = window.KOREKSI.data[d.key]; if ((lama ? lama.versi : 0) !== d.versi) throw new Error('KONFLIK: data sudah diubah pengguna lain');
      return { ok: true, data: Object.assign({}, d.data, { key: d.key, versi: d.versi + 1, diubahOleh: REG.sesi.nama, diubahPada: '2026-10-22T09:15:00' }) }; };
  }, [NO, NO2]);
  for (const b of [MP204, MP260, MP267]) await pg.addScriptTag({ content: b });
  await pg.evaluate(() => renderAllTables());
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const vol = k => pg.evaluate(k => RINGKASAN.find(g => g.key === k).items.map(i => Number(i.volume) || 0), k);

  console.log('1. Pintu masuk di form Perbaiki & lengkapi data kontrak');
  await pg.evaluate(k => bukaKoreksi(k), NO);
  await pg.waitForSelector('#modalKor .mp267-btn');
  const t = await pg.evaluate(() => { const b = document.querySelector('#modalKor .mp267-btn'); return { teks: b.textContent, sesudah: b.previousElementSibling.textContent, key: b.dataset.key }; });
  ok(t.key === NO && /Perbaiki item/.test(t.teks) && /1/.test(t.teks) && t.sesudah === 'Input Progres', 'tombol "Perbaiki item" (lencana 1 item bervolume kosong) di sebelah Input Progres');
  await pg.click('#modalKor .mp267-btn'); await pg.waitForSelector('#mp267Item.tampil');
  const awal = await pg.evaluate(() => ({ usul: (document.getElementById('mp267Usul') || {}).textContent || '', rekap: document.getElementById('mp267Rekap').textContent }));
  ok(/#1 Truck Uni \/ Mounted \/ Hiab Crane 10 Ton \(sama dengan #2 = 4 MON\)/.test(awal.usul), 'usulan: item kembar #1 bervolume kosong, samakan dengan #2 = 4 MON');
  ok(/Jumlah item Rp 204\.000\.000/.test(awal.rekap) && /selisih Rp -204\.000\.000/.test(awal.rekap), 'rekap: jumlah item Rp 204 jt ≠ nilai kontrak Rp 408 jt (4 bulan × 1 unit)');

  console.log('2. Samakan volume → 4 bulan × 2 unit');
  await pg.click('#mp267Usul .btn-warning');
  const r2 = await pg.evaluate(() => ({ v: document.querySelector('#mp267Item tr[data-r="0"] input[data-f="vol"]').value, rekap: document.getElementById('mp267Rekap').textContent, alasan: document.getElementById('mp267Alasan').value }));
  ok(r2.v === '4' && /Jumlah item Rp 408\.000\.000/.test(r2.rekap) && /sesuai/.test(r2.rekap) && /1 item diubah/.test(r2.rekap), 'volume #1 = 4 → jumlah item Rp 408.000.000 sesuai nilai kontrak');
  ok(/Volume item kembar disamakan/.test(r2.alasan), 'alasan terisi otomatis (dapat disunting)');
  await pg.screenshot({ path: OUT + '/koreksi-item-hiab.png' });
  await pg.click('#mp267Simpan'); await pg.waitForFunction(() => !document.getElementById('mp267Item').classList.contains('tampil'));
  const sv = await pg.evaluate(() => window.__simpan[0]);
  const rec = sv[1].data;
  ok(sv[0] === 'saveKoreksi' && rec.key === 'SISTEM-KOREKSI-ITEM|010/SPSA/WK-NK.KSO/PDBJ/1726012/2026' && rec.versi === 0 && rec.data.jenis === 'koreksiItem'
    && JSON.stringify(rec.data.ubah) === JSON.stringify({ 'K:49000633|truck uni / mounted / hiab crane 10 ton|0#1': { volume: 4 } }), 'disimpan lewat saveKoreksi (berversi): hanya volume item #1 0 → 4');
  ok(JSON.stringify(await vol(NO)) === '[4,4]' && JSON.stringify(await vol(NO2)) === '[1]', 'ringkasan kontrak: Hiab Crane 4 + 4 MON (kontrak lain tidak berubah)');
  await pg.waitForSelector('tr.baris-kontrak .mp267-tanda');
  ok(await pg.evaluate(k => !!document.querySelector(`tr[data-key="${k}"] .mp267-tanda`) && !RINGKASAN.some(g => /^SISTEM-/.test(g.key)), NO), 'penanda "item dikoreksi" di daftar; catatan koreksi tidak tampil sebagai kontrak');
  ok(JSON.stringify(await pg.evaluate(() => getRingkasanKontrak().find(g => g.key === RINGKASAN[0].key).items.map(i => Number(i.volume)))) === '[4,4]', 'dibangun ulang berkali-kali tetap 4 + 4 (tidak berlipat)');

  console.log('3. WBS & tambah item');
  await pg.evaluate(k => bukaWbs(k), NO); await pg.waitForSelector('#aksiWbs .mp267-btn');
  ok(await pg.evaluate(() => [...document.querySelectorAll('#isiWbs tbody tr')].map(r => r.children[3].textContent.trim()).join('|') === '4 MON|4 MON'), 'form Isi WBS menampilkan volume terkoreksi 4 MON | 4 MON + tombol Perbaiki item');
  await pg.click('#aksiWbs .mp267-btn'); await pg.waitForSelector('#mp267Item.tampil');
  ok(await pg.evaluate(() => document.querySelector('#mp267Item tr[data-r="0"] input[data-f="vol"]').value === '4' && /Koreksi aktif.*versi 1/.test(document.querySelector('#mp267Item .mp260-isi').textContent)), 'form dibuka ulang: koreksi aktif versi 1, volume #1 = 4');
  await pg.click('#mp267Item .btn-outline-primary');
  await pg.fill('#mp267Item tr[data-t="0"] input[data-f="volume"]', '1,5');
  ok(/Jumlah item Rp 484\.500\.000/.test(await pg.textContent('#mp267Rekap')), 'tambah item (salin kode/satuan/harga) 1,5 MON → rekap Rp 484.500.000 & peringatan selisih');
  await pg.click('#mp267Simpan'); await pg.waitForFunction(() => !document.getElementById('mp267Item').classList.contains('tampil'));
  const it3 = await pg.evaluate(k => RINGKASAN.find(g => g.key === k).items.map(i => [Number(i.volume), i.kodeUnik || '']), NO);
  ok(it3.length === 3 && it3[2][0] === 1.5 && /^MP267-/.test(it3[2][1]) && it3[0][0] === 4, 'item tambahan di akhir (ber-kodeUnik sendiri), urutan item Master tetap');
  ok(await pg.evaluate(() => document.getElementById('modalWbs').classList.contains('show') && document.querySelectorAll('#isiWbs tbody tr').length === 3), 'form Isi WBS yang terbuka dimuat ulang dengan 3 item');

  console.log('4. Batalkan & hak akses');
  await pg.evaluate(k => mp267Buka(k), NO); await pg.click('#mp267Item .btn-outline-danger');
  await pg.waitForFunction(() => !document.getElementById('mp267Item').classList.contains('tampil'));
  ok(JSON.stringify(await vol(NO)) === '[0,4]' && (await pg.evaluate(() => window.__simpan.slice(-1)[0][1].data.data.aktif)) === false, 'Batalkan koreksi → kembali ke Master asli (catatan aktif:false, tetap di Log)');
  await pg.evaluate(() => { REG.sesi.peran = 'LIHAT'; }); await pg.evaluate(k => mp267Buka(k), NO);
  ok(await pg.evaluate(() => !document.getElementById('mp267Simpan') && document.querySelector('#mp267Item input[data-f="vol"]').disabled), 'peran selain Pengadaan: hanya lihat');
  await pg.evaluate(() => { mp267Tutup(); REG.sesi.peran = 'PENGADAAN'; });
  await pg.evaluate(() => { document.getElementById('modalKor').classList.remove('show'); bukaKoreksi('099/SPM/WK-NK.KSO/PDBJ/1726012/2026'); });
  await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => !document.querySelector('#modalKor .mp267-btn')), 'kontrak Register: tombol tidak dipasang (item disunting di Edit kontrak Register)');
  await pg.setViewportSize({ width: 390, height: 800 }); await pg.evaluate(k => { document.getElementById('modalKor').classList.remove('show'); mp267Buka(k); }, NO);
  ok(await pg.evaluate(() => { const r = document.querySelector('#mp267Item .mp260-kotak').getBoundingClientRect(); return r.left >= 0 && r.right <= 390 && document.documentElement.scrollWidth <= 390; }), 'form muat di layar HP 390 px (tabel bergulir di dalam)');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji UI 2.6.7');
})().catch(e => { console.error(e); process.exit(1); });
