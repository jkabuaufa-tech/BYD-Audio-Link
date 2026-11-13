// Uji Pembaruan 2.10.20 — Release / Unrelease, Preview PO, Preview Progres, BASO & BASTA per alat (Chromium, kerangka HTML minimal).
// HTML dasar tidak disertakan di repo → blok MP21020 diambil dari paket dan dijalankan di kerangka yang meniru struktur yang dipakainya
// (#tab-register tr.baris-kontrak, #tab-form-progres a[onclick^=previewBAEntri], main .content-tab, #sidebar ul.nav); server ditiru di regAksi.
//   node uji/ui21020.js [pembaruan-2.10.20.json]      TANGKAPAN=<folder> → simpan tangkapan layar
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const PAKET = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'pembaruan-2.10.20.json'), 'utf8'));
const a = PAKET.js.indexOf('/* MP21020 — '), z = PAKET.js.indexOf('/* MP264 — PEMBARUAN');
const BLOK = PAKET.js.slice(a, z), TANGKAP = process.env.TANGKAPAN || '';
let lulus = 0, gagal = 0;
const cek = (nama, ok, info) => { if (ok) lulus++; else gagal++; console.log((ok ? '  ok   ' : '  GAGAL ') + nama + (ok ? '' : ' → ' + JSON.stringify(info))); };
const NO = '021/SPSA/WSKT-NK KSO/1726012/2026', NOM = '022/SPM/WSKT-NK KSO/1726012/2026', NOMS = '005/SPSA/WSKT-NK KSO/1726012/2025';
const HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"><style>${PAKET.css}</style></head><body>
<div id="sidebar"><ul class="nav flex-column"><li class="nav-item"><a class="nav-link" onclick="showTab('register', event)">Register Kontrak</a></li><li class="nav-item"><a class="nav-link" onclick="showTab('gdstok', event)">Stok</a></li></ul></div>
<h1 id="judulHalaman"></h1><main style="padding:16px">
<div id="tab-register" class="content-tab"><table class="table"><tbody id="regBody"></tbody></table></div>
<div id="tab-form-progres" class="content-tab" style="display:none"><table><tbody><tr><td><code>01/BAPA/${NO}</code></td><td><a href="#" onclick="previewBAEntri('BK1'); return false;">BAPA</a></td></tr></tbody></table></div>
</main></body></html>`;
const AWAL = `
var REG = { sesi: null, data: [] }, PROG = { data: [] }, RINGKASAN = [], PROYEK = { id: '1726012', namaLengkap: 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' }, MENU_CEPAT = [];
window.__notif = []; window.__panggil = []; window.__cetak = [];
function notif(m, t) { window.__notif.push([t || '', String(m)]); }
function idItem(g, it, i) { return it.kodeUnik || (g.key + '#' + i); }
function previewBAEntri(id) { window.__ba = id; }
function showTab(n) { document.querySelectorAll('main .content-tab').forEach(t => { t.style.display = t.id === 'tab-' + n ? '' : 'none'; }); }
function gambarReg() { document.getElementById('regBody').innerHTML = REG.data.map(r => '<tr data-id="' + r.id + '" class="baris-kontrak"><td><code>' + r.noKontrak + '</code><div class="mt-1"><span class="chip-pdf-kosong">PDF PO belum ada</span></div></td><td>' + r.namaVendor + '</td><td><button class="btn btn-sm btn-outline-primary">Edit</button></td></tr>').join('')
  + RINGKASAN.filter(g => !REG.data.some(r => r.noKontrak === g.key)).map(g => '<tr data-key="' + g.key + '" class="baris-kontrak"><td><code>' + g.key + '</code><div class="mt-1"><span class="chip-pdf-kosong">PDF PO belum ada</span></div></td><td>' + g.namaVendor + '</td><td></td></tr>').join(''); }
async function muatRegister() { gambarReg(); }
window.mp220Srv = f => window.__fitur.indexOf(f) >= 0; window.__fitur = ['sapRelease', 'basoBasta'];
window.mp224Cetak = (html, o) => { window.__cetak.push({ html, judul: o && o.judul }); };
window.__server = { baso: [], seq: 0 };
window.regAksi = async (a, x) => {
  window.__panggil.push([a, JSON.parse(JSON.stringify(x || {}))]); const u = REG.sesi, now = '2026-11-13T03:00:00Z';
  if (a === 'kontrakAjukan') { const r = REG.data.find(z => z.id === x.id); r.rilis = { status: 'DIAJUKAN', oleh: u.nama, pada: now }; return { ok: true, data: r }; }
  if (a === 'posting') { if (!u.admin) throw new Error('Hanya Admin yang berwenang melakukan Release (persetujuan) Kontrak/PO.'); const r = REG.data.find(z => z.id === x.id); r.diposting = true; r.dipostingPada = now; r.versi++; return { ok: true, data: r }; }
  if (a === 'kontrakUnrelease') { const r = REG.data.find(z => z.id === x.id); if (PROG.data.some(e => e.noKontrak === r.noKontrak)) throw new Error('Tidak dapat unrelease: kontrak sudah memiliki 1 Berkas Kerja (BK) / tagihan.'); r.diposting = false; r.versi++; r.alasanUnrelease = x.alasan; r.rilis = { status: 'UNRELEASED', oleh: u.nama, pada: now, keterangan: x.alasan }; return { ok: true, data: r }; }
  if (a === 'basoBaca') return { ok: true, spsa: REG.data.filter(r => /\\/SPSA\\//.test(r.noKontrak)).map(r => ({ id: r.id, noKontrak: r.noKontrak, tglKontrak: r.tglKontrak, namaVendor: r.namaVendor, idVendor: r.idVendor, diposting: !!r.diposting, items: r.items })), data: window.__server.baso };
  if (a === 'gudangUnggahFoto') { const id = 'F' + (++window.__server.seq); return { ok: true, data: { id, idServer: id, nama: x.berkas.nama, jenis: x.berkas.jenis } }; }
  if (a === 'basoSimpan') { const d = x.data, S = window.__server; let r = S.baso.find(z => z.id === d.id); const kurang = []; if (!d.merk) kurang.push('Merk / Type'); [0, 1, 2].forEach(i => { if (!(d.foto || [])[i]) kurang.push('Foto ' + i); });
    const rec = Object.assign({}, d, { id: r ? r.id : 'BB-' + (++S.seq), versi: r ? r.versi + 1 : 1, tanggal: d.tanggalSPSA, pihak1Jabatan: 'Kepala Proyek', status: kurang.length ? 'DRAF' : 'LENGKAP', kurang, diubahOleh: u.nama, diubahPada: now, tahun: Number(d.tahun) || '' });
    if (r) S.baso[S.baso.indexOf(r)] = rec; else S.baso.push(rec); return { ok: true, data: rec }; }
  if (a === 'basoBatal') { const r = window.__server.baso.find(z => z.id === x.data.id); r.status = 'BATAL'; return { ok: true, data: r }; }
  if (a === 'ambilBerkas') return { ok: true, tipe: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' };
  throw new Error('Aksi tidak dikenal: ' + a);
};
REG.data = [
  { id: 'K1', noKontrak: '${NO}', tglKontrak: '2026-08-30', tglSelesai: '2026-12-31', namaVendor: 'PT Sewa Alat Jaya', idVendor: '10001', nilai: 90000000, versi: 1, diposting: false, noPO: '4500001234', noPR: '1000555', top: '30 hari', items: [{ kode: 'A1', uraian: 'Vibro Roller 10 Ton', vol: 3, sat: 'bulan', harga: 20000000, wbs: 'W.1.2' }, { kode: 'A2', uraian: 'Excavator PC200', vol: 1, sat: 'bulan', harga: 30000000, wbs: 'W.1.3' }] },
  { id: 'K2', noKontrak: '${NOM}', tglKontrak: '2026-09-01', namaVendor: 'CV Bahan', nilai: 5000000, versi: 1, diposting: true, dipostingPada: '2026-09-02T00:00:00Z', items: [{ uraian: 'Semen', vol: 100, sat: 'zak', harga: 50000 }] }];
RINGKASAN = [
  { key: '${NO}', namaVendor: 'PT Sewa Alat Jaya', items: [{ itemPekerjaan: 'Sewa Alat', volume: 0, hargaSatuan: 0 }, { itemPekerjaan: 'Vibro Roller 10 Ton', volume: 3, satuan: 'bulan', hargaSatuan: 20000000 }, { itemPekerjaan: 'Excavator PC200', volume: 1, satuan: 'bulan', hargaSatuan: 30000000 }], entriProgres: [] },
  { key: '${NOMS}', namaVendor: 'PT Alat Lama', idVendor: '10009', tglMulai: '2025-11-03', tglSelesai: '2026-03-31', items: [{ itemPekerjaan: 'Crane 25 Ton', volume: 2, satuan: 'bulan', hargaSatuan: 45000000, kodeItem: 'C1' }], entriProgres: [] }];
(function () { const g = RINGKASAN[0], id = i => g.key + '#' + i;
  const bk0 = { id: 'BK0', noKontrak: g.key, tagihanKe: 1, periodeKey: 202609, periode: 'September 2026', kodeBA: 'BAPA', nomorBA: '00/BAPA/' + g.key, tanggalBA: '2026-09-30', items: { [id(1)]: 1 }, nilai: 20000000 };
  const bk1 = { id: 'BK1', noKontrak: g.key, tagihanKe: 2, periodeKey: 202610, periode: 'Oktober 2026', kodeBA: 'BAPA', nomorBA: '01/BAPA/' + g.key, tanggalBA: '2026-10-31', items: { [id(1)]: 1.5, [id(2)]: 1 }, nilai: 60000000 };
  g.entriProgres = [bk0, bk1]; window.__BK = [bk0, bk1]; })();
gambarReg();`;
const tunggu = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  cek('paket ' + PAKET.versi + ' memuat blok MP21020 sebelum MP264 & penanda versi seragam', PAKET.versi === '2.10.20' && a > 0 && z > a && /const VERSI = '2\.10\.20'/.test(BLOK) && !/const (?:VERSI_PAKET|VERSI) = '(?!2\.10\.20')/.test(PAKET.js), { a, z });
  cek('perbaikan di tempat: tab gdbaso untuk Petugas Gudang & basoBaca boleh saat pratinjau', PAKET.js.indexOf("const TAB_GD = ['gdmasuk', 'gdstok', 'gdkartu', 'gdbaso'];") > 0 && PAKET.js.indexOf("'vtBundelBaca', 'basoBaca'];") > 0);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const err = [];
  p.on('pageerror', e => err.push(String(e.message).slice(0, 200)));
  await p.route('**/*', r => r.request().url().startsWith('https://cdn.jsdelivr.net') ? r.abort() : r.continue());
  await p.setContent(HTML); await p.addScriptTag({ content: AWAL }); await p.addScriptTag({ content: BLOK });
  const masuk = async (nama, admin, peran) => { await p.evaluate(([n, a, pr]) => { REG.sesi = { nama: n, admin: a, peran: pr, proyek: '1726012' }; gambarReg(); window.mp21020Pasang(); }, [nama, admin, peran]); await tunggu(150); };
  const pasang = () => p.evaluate(() => window.mp21020Pasang());
  const baris = id => p.evaluate(i => { const tr = document.querySelector('tr[data-id="' + i + '"]'); return { st: (tr.querySelector('.mp21020-st') || {}).textContent || '', tombol: [...tr.querySelectorAll('.mp21020-b')].map(x => x.textContent.trim()), pv: !!tr.querySelector('td:first-child > div.mt-1 .mp21020-pv'), als: (tr.querySelector('.mp21020-als') || {}).textContent || '' }; }, id);

  console.log('1. Register Kontrak — Ajukan (staf) · Release / Unrelease (Admin)');
  await masuk('Staf Pengadaan', false, 'PENGADAAN');
  let r = await baris('K1'); cek('staf: status "SAP: Draf", tombol Ajukan saja, Preview PO di samping chip PO', /Draf/.test(r.st) && r.tombol.join() === 'Ajukan' && r.pv, r);
  r = await baris('K2'); cek('staf: kontrak released tanpa tombol Release / Unrelease', /Released/.test(r.st) && r.tombol.length === 0, r);
  cek('baris Master: tombol Preview PO ada, tanpa label SAP', await p.evaluate(k => { const tr = document.querySelector('tr[data-key="' + k + '"]'); return !!tr.querySelector('.mp21020-pv') && !tr.querySelector('.mp21020-st'); }, NOMS));
  await p.click('tr[data-id="K1"] .mp21020-b'); await p.click('#mp21020Ya'); await tunggu(200);
  r = await baris('K1'); cek('staf mengajukan → "SAP: Diajukan", tombol Ajukan hilang', /Diajukan/.test(r.st) && r.tombol.length === 0 && (await p.evaluate(() => window.__panggil.some(c => c[0] === 'kontrakAjukan' && c[1].id === 'K1' && c[1].versi === 1))), r);
  await p.evaluate(() => window.mp21020Release('K1')); await tunggu(100);
  cek('staf tidak dapat Release (ditolak sebelum memanggil server)', await p.evaluate(() => !window.__panggil.some(c => c[0] === 'posting') && window.__notif.some(n => /Hanya Admin/.test(n[1]))));
  await masuk('Joko Supriyono', true, 'PENGADAAN');
  r = await baris('K1'); cek('Admin: tombol Release pada kontrak diajukan', r.tombol.join() === 'Release', r);
  if (TANGKAP) await p.screenshot({ path: path.join(TANGKAP, '21020-register-release.png') });
  await p.click('tr[data-id="K1"] .mp21020-b'); await p.click('#mp21020Ya'); await tunggu(200);
  r = await baris('K1'); cek('Admin Release → "SAP: Released", tombol menjadi Unrelease', /Released/.test(r.st) && r.tombol.join() === 'Unrelease' && (await p.evaluate(() => REG.data[0].diposting === true)), r);
  await p.click('tr[data-id="K1"] .mp21020-b');
  cek('Unrelease: tombol terkunci sampai alasan ≥ 12 karakter', await p.evaluate(() => document.getElementById('mp21020Ya').disabled));
  await p.fill('#mp21020Als', 'salah'); cek('alasan 5 karakter → masih terkunci', await p.evaluate(() => document.getElementById('mp21020Ya').disabled));
  await p.fill('#mp21020Als', 'koreksi harga satuan vibro'); await p.click('#mp21020Ya'); await tunggu(200);
  r = await baris('K1'); cek('Admin Unrelease → "SAP: Unrelease · revisi" + alasan tampil, tombol Release kembali', /Unrelease/.test(r.st) && /koreksi harga satuan vibro/.test(r.als) && r.tombol.join() === 'Release' && (await p.evaluate(() => window.__panggil.some(c => c[0] === 'kontrakUnrelease' && c[1].alasan === 'koreksi harga satuan vibro'))), r);
  await masuk('Staf Pengadaan', false, 'PENGADAAN'); r = await baris('K1'); cek('staf dapat mengajukan kembali sesudah Unrelease', r.tombol.join() === 'Ajukan', r);

  console.log('2. Preview PO');
  await p.evaluate(() => { window.__cetak = []; }); await p.click('tr[data-id="K1"] .mp21020-pv'); await tunggu(100);
  let c = await p.evaluate(() => window.__cetak[0]);
  cek('Preview PO Register: nomor, vendor, item, WBS, jumlah DPP Rp 90.000.000, tanda DRAF', !!c && c.html.includes(NO) && c.html.includes('PT Sewa Alat Jaya') && c.html.includes('Vibro Roller 10 Ton') && c.html.includes('W.1.2') && c.html.includes('90.000.000') && c.html.includes('class="cap">DRAF') && c.html.includes('4500001234') && /Preview PO/.test(c.judul), c && c.judul);
  await p.evaluate(() => { window.__cetak = []; }); await p.click('tr[data-id="K2"] .mp21020-pv'); c = await p.evaluate(() => window.__cetak[0]);
  cek('Preview PO kontrak released: tanpa tanda DRAF, status Released', !!c && !c.html.includes('class="cap"') && c.html.includes('<b>Released</b>') && c.html.includes('5.000.000'));
  await p.evaluate(k => { window.__cetak = []; document.querySelector('tr[data-key="' + k + '"] .mp21020-pv').click(); }, NOMS); c = await p.evaluate(() => window.__cetak[0]);
  cek('Preview PO Master: item & nilai dari Master Kontrak', !!c && c.html.includes('Crane 25 Ton') && c.html.includes('90.000.000') && c.html.includes('Master Kontrak'));
  if (TANGKAP && c) { const q = await b.newPage({ viewport: { width: 900, height: 1200 } }); await q.setContent(c.html.replace('</head>', '<style>body{padding:12mm}</style></head>')); await q.screenshot({ path: path.join(TANGKAP, '21020-preview-po.png') }); await q.close(); }

  console.log('3. Preview Progres (Form Input Progres)');
  await p.evaluate(() => { PROG.data = window.__BK; showTab('form-progres'); window.mp21020Pasang(); });
  cek('tombol Preview di samping tautan BA (satu per baris)', await p.evaluate(() => document.querySelectorAll('#tab-form-progres .mp21020-pvp').length === 1 && document.querySelector('#tab-form-progres a + .mp21020-pvp') !== null));
  let R = await p.evaluate(() => { const x = window.mp21020Rincian('BK1'); return { nIni: x.nIni, nKini: x.nKini, nKontrak: x.nKontrak, vibro: x.baris[1], exca: x.baris[2], kepala: x.baris[0].kepala }; });
  cek('rincian: s/d lalu 1 + periode ini 1,5 = 2,5 dari 3 (83,33%) · nilai periode ini Rp 60.000.000 · kumulatif Rp 80.000.000', R.kepala && R.vibro.lalu === 1 && R.vibro.ini === 1.5 && R.vibro.kini === 2.5 && Math.abs(R.vibro.persen - 83.3333) < 0.01 && R.exca.ini === 1 && R.nIni === 60000000 && R.nKini === 80000000 && R.nKontrak === 90000000, R);
  await p.click('#tab-form-progres .mp21020-pvp'); await tunggu(100);
  cek('dialog Preview Progres tampil dengan tabel & tombol Preview BA', await p.evaluate(() => { const w = document.getElementById('mp21020Pp'); return !!w && w.querySelectorAll('tbody tr').length === 3 && /60\.000\.000/.test(w.textContent) && !!w.querySelector('[data-ba]') && !w.querySelector('.alert-warning'); }));
  if (TANGKAP) await p.screenshot({ path: path.join(TANGKAP, '21020-preview-progres.png') });
  await p.click('#mp21020Pp [data-ba]'); cek('tombol Preview BA membuka previewBAEntri BK yang sama', await p.evaluate(() => window.__ba === 'BK1' && !document.getElementById('mp21020Pp')));
  await p.evaluate(() => { window.__BK[1].items[RINGKASAN[0].key + '#1'] = 2.5; window.mp21020PreviewProgres('BK1'); });
  cek('volume kumulatif > kontrak & nilai ≠ nilai BK → dua peringatan', await p.evaluate(() => { const w = document.getElementById('mp21020Pp'); return !!w.querySelector('.alert-danger') && !!w.querySelector('.alert-warning'); }));
  await p.evaluate(() => { document.getElementById('mp21020Pp').remove(); window.__BK[1].items[RINGKASAN[0].key + '#1'] = 1.5; });

  console.log('4. Gudang › BASO & BASTA Alat');
  cek('tab & menu Gudang "BASO & BASTA Alat" terpasang sesudah menu Stok', await p.evaluate(() => !!document.getElementById('tab-gdbaso') && document.querySelector('#sidebar li.mp21020-nav').previousElementSibling.textContent.trim() === 'Stok' && MENU_CEPAT.some(m => m[0] === 'gdbaso')));
  await p.evaluate(() => showTab('gdbaso')); await tunggu(300);
  let T = await p.evaluate(() => ({ opsi: [...document.querySelectorAll('#mp21020Spsa option')].map(o => o.value), isi: document.getElementById('mp21020BasoIsi').textContent, baris: document.querySelectorAll('#mp21020BasoIsi tbody tr').length }));
  cek('daftar SPSA = Register + Master (kontrak SPM tidak ikut)', T.opsi.length === 2 && T.opsi.indexOf(NO) >= 0 && T.opsi.indexOf(NOMS) >= 0, T.opsi);
  await p.evaluate(k => window.mp21020PilihSPSA(k), NO);
  cek('SPSA belum release → terkunci (tanpa tombol Isi)', await p.evaluate(() => /belum direlease Admin/.test(document.getElementById('mp21020BasoIsi').textContent) && !document.querySelector('#mp21020BasoIsi tbody .btn-outline-primary')));
  await p.evaluate(() => { REG.data[0].diposting = true; }); await p.evaluate(() => window.mp21020MuatBaso()); await tunggu(200);
  T = await p.evaluate(() => ({ baris: [...document.querySelectorAll('#mp21020BasoIsi tbody tr')].map(t => t.cells[0].textContent + '|' + t.cells[1].textContent), tgl: document.querySelector('#mp21020BasoIsi .mp21020-kv').textContent }));
  cek('1 SPSA 2 alat → 2 baris dokumen (1/2, 2/2) · tanggal 30 Agustus 2026 dari SPSA · Pihak 1 Kepala Proyek', T.baris.length === 2 && /^1\/2\|Vibro/.test(T.baris[0]) && /^2\/2\|Excavator/.test(T.baris[1]) && /30 Agustus 2026/.test(T.tgl) && /Kepala Proyek/.test(T.tgl) && /2 alat → 2 berkas/.test(T.tgl), T);
  await p.evaluate(k => window.mp21020IsiBaso(k, 1), NO); await tunggu(100);
  cek('form isian lapangan: jenis alat terisi dari SPSA, 3 slot foto, 4 perlengkapan', await p.evaluate(() => document.getElementById('mp21020fJenis').value === 'Vibro Roller 10 Ton' && document.querySelectorAll('#mp21020Slot .mp21020-s').length === 3 && document.querySelectorAll('.mp21020-cek input[type=checkbox]').length === 4 && /30 Agustus 2026/.test(document.querySelector('#mp21020Form .mp21020-kv').textContent)));
  await p.fill('#mp21020fMerk', 'HAM 311D'); await p.fill('#mp21020fMesin', '61J84337040'); await p.fill('#mp21020fTahun', '2015'); await p.fill('#mp21020fP1', 'Dedy Hariyanto'); await p.fill('#mp21020fP2', 'Andi Jatmiko');
  await p.check('#mp21020c_manualPabrik'); await p.check('#mp21020c_kotakP3K');
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  for (let i = 0; i < 3; i++) { await p.setInputFiles('#mp21020Slot input[data-i="' + i + '"]', { name: 'f' + i + '.png', mimeType: 'image/png', buffer: PNG }); await tunggu(120); }
  if (TANGKAP) await p.screenshot({ path: path.join(TANGKAP, '21020-baso-form.png') });
  await p.click('#mp21020FOk'); await tunggu(400);
  let K = await p.evaluate(() => ({ simpan: window.__panggil.filter(c => c[0] === 'basoSimpan').pop(), unggah: window.__panggil.filter(c => c[0] === 'gudangUnggahFoto').map(c => c[1].berkas.jenis + '|' + c[1].berkas.nama), form: !!document.getElementById('mp21020Form'), st: document.querySelector('#mp21020BasoIsi tbody tr .mp21020-st').textContent }));
  cek('simpan: 3 foto diunggah (FOTO-BASO) lalu basoSimpan berisi isian lapangan & tanggal SPSA', !K.form && K.unggah.length === 3 && K.unggah[0] === 'FOTO-BASO|Tampak-Depan.jpg' && K.unggah[2] === 'FOTO-BASO|Tampak-Samping.jpg' && K.simpan && K.simpan[1].data.noSPSA === NO && K.simpan[1].data.urutan === 1 && K.simpan[1].data.merk === 'HAM 311D' && K.simpan[1].data.tanggalSPSA === '2026-08-30' && K.simpan[1].data.perlengkapan.manualPabrik === true && K.simpan[1].data.perlengkapan.stnk === false && K.simpan[1].data.foto.filter(Boolean).length === 3 && K.st === 'Lengkap', K);
  await p.evaluate(k => { window.__cetak = []; return window.mp21020PreviewBaso(k, 1); }, NO); c = await p.evaluate(() => window.__cetak[0]);
  const h = c ? c.html : '';
  cek('dokumen alat 1: BASO + BASTA + lampiran foto (3 halaman) dalam 1 berkas', (h.match(/class="hal"/g) || []).length === 3 && h.includes('BERITA ACARA ALAT SIAP OPERASI') && h.includes('BERITA ACARA SERAH TERIMA ALAT') && h.includes('LAMPIRAN FOTO KONDISI ALAT') && /alat 1-2/.test(c.judul), c && c.judul);
  cek('narasi tanggal dari SPSA: "Minggu, tanggal Tiga Puluh bulan Agustus tahun Dua Ribu Dua Puluh Enam (30/08/2026)"', h.includes('Minggu, tanggal Tiga Puluh bulan Agustus tahun Dua Ribu Dua Puluh Enam (30/08/2026)'));
  cek('isi: data alat, perlengkapan Ada/Tidak, alat 1 dari 2, 3 foto', h.includes('HAM 311D') && h.includes('61J84337040') && />2015</.test(h) && h.includes('alat 1 dari 2') && (h.match(/<td>Ada<\/td>/g) || []).length === 4 && (h.match(/<td>Tidak<\/td>/g) || []).length === 4 && (h.match(/<img src="data:image/g) || []).length === 3);
  cek('penanda tangan: Pihak Pertama Kepala Proyek (Dedy Hariyanto) · Pihak Kedua Direktur (Andi Jatmiko)', h.includes('Dedy Hariyanto') && h.includes('(Kepala Proyek)') && h.includes('Andi Jatmiko') && h.includes('(Direktur)') && h.includes('PT SEWA ALAT JAYA') && h.includes('Yang menerima') && h.includes('Yang menyerahkan'));
  if (TANGKAP && c) { const q = await b.newPage({ viewport: { width: 860, height: 1180 } }); await q.setContent(c.html.replace('</head>', '<style>body{padding:12mm}.hal{margin-bottom:30mm}</style></head>')); await q.screenshot({ path: path.join(TANGKAP, '21020-baso-basta.png'), fullPage: true }); await q.close(); }
  await p.evaluate(k => { window.__cetak = []; return window.mp21020PreviewBaso(k, 2); }, NO); c = await p.evaluate(() => window.__cetak[0]);
  cek('alat 2 = berkas terpisah (Excavator, alat 2 dari 2, belum ada foto)', !!c && c.html.includes('Excavator PC200') && c.html.includes('alat 2 dari 2') && !c.html.includes('HAM 311D') && (c.html.match(/Foto belum diunggah/g) || []).length === 3 && /alat 2-2/.test(c.judul));
  await p.evaluate(k => window.mp21020IsiBaso(k, 0), NO); await tunggu(100); await p.fill('#mp21020fJenis', 'Vibro Roller 10 Ton (unit 2)'); await p.click('#mp21020FOk'); await tunggu(300);
  T = await p.evaluate(() => [...document.querySelectorAll('#mp21020BasoIsi tbody tr')].map(t => t.cells[0].textContent + '|' + t.cells[7].textContent.trim().split(/\s/)[0]));
  cek('"Tambah unit alat" → 3 dokumen (unit ke-3 berstatus Draf), nama Kepala Proyek terisi otomatis', T.length === 3 && /^3\/3\|Draf/.test(T[2]) && (await p.evaluate(() => window.__panggil.filter(c => c[0] === 'basoSimpan').pop()[1].data.pihak1Nama === 'Dedy Hariyanto')), T);
  if (TANGKAP) await p.screenshot({ path: path.join(TANGKAP, '21020-baso-daftar.png') });
  await p.evaluate(() => { window.mp21020BatalBaso(window.__server.baso[window.__server.baso.length - 1].id); }); await tunggu(100); await p.fill('#mp21020Als', 'unit tidak jadi didatangkan'); await p.click('#mp21020Ya'); await tunggu(200);
  cek('batal unit tambahan → kembali 2 dokumen', await p.evaluate(() => document.querySelectorAll('#mp21020BasoIsi tbody tr').length === 2));
  await p.evaluate(k => window.mp21020PilihSPSA(k), NOMS);
  cek('SPSA Master: 1 alat, tanggal 3 November 2025 dari Master Kontrak', await p.evaluate(() => document.querySelectorAll('#mp21020BasoIsi tbody tr').length === 1 && /3 November 2025/.test(document.querySelector('#mp21020BasoIsi .mp21020-kv').textContent)));
  await masuk('Tamu', false, 'LIHAT'); await p.evaluate(() => showTab('gdbaso')); await tunggu(300);
  cek('akun Lihat saja: tanpa tombol Isi / Batal, tetap dapat mencetak', await p.evaluate(() => !document.querySelector('#mp21020BasoIsi .btn-outline-primary') && !document.querySelector('#mp21020BasoIsi .btn-outline-danger') && !!document.querySelector('#mp21020BasoIsi .btn-outline-secondary')));
  await p.evaluate(() => { window.__fitur = []; REG.sesi = { nama: 'Staf Pengadaan', admin: false, peran: 'PENGADAAN', proyek: '1726012' }; gambarReg(); window.mp21020Pasang(); showTab('gdbaso'); }); await tunggu(300);
  cek('server lama (tanpa fitur): tombol Release/Ajukan tidak tampil, Preview PO tetap ada, tab BASO meminta Modul 1.10.18', await p.evaluate(() => !document.querySelector('.mp21020-b') && !!document.querySelector('tr[data-id="K1"] .mp21020-pv') && /Modul server 1\.10\.18/.test(document.getElementById('mp21020BasoIsi').textContent)));
  cek('terbilang tanggal: 1, 11, 21, 31 & tahun 2026', await p.evaluate(() => [1, 11, 21, 31, 2026, 1999].map(window.mp21020Terbilang).join('|')) === 'satu|sebelas|dua puluh satu|tiga puluh satu|dua ribu dua puluh enam|seribu sembilan ratus sembilan puluh sembilan');
  cek('tanpa galat halaman', err.length === 0, err);
  await b.close();
  console.log('\n' + lulus + ' lulus · ' + gagal + ' gagal'); process.exit(gagal ? 1 : 0);
})();
