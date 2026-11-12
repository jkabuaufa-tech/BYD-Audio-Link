// Uji UI Pembaruan 2.10.15 (blok MP21015 — PO CANCEL / HOLD) di Chromium, tersambung ke Modul server 1.10.15 asli lewat kernel tiruan.
//   node uji/ui21010.js [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const { buatModul } = require('./kernel_tiruan.js');
const R = path.join(__dirname, '..'), paket = JSON.parse(fs.readFileSync(path.join(R, 'pembaruan-2.10.15.json'), 'utf8'));
const blok = fs.readFileSync(path.join(R, 'sumber', 'pembaruan-2.10.15-kontrak-batal.js'), 'utf8');
assert.ok(paket.js.includes(blok.trim()) && paket.js.includes('__MP21011__') && paket.js.includes('__MP2105__') && paket.js.includes('__MP21013__'), 'paket 2.10.15 = 2.10.14 utuh + blok MP21015');
const K = buatModul(path.join(R, 'server-modul-1.10.15.json')), A = K.MODUL.aksi, P = 'JICT', out = process.argv[2];
K.ctx.IZIN_REG = {}; const alok = [{ id: 'AL1', bonNomor: '006/WK', bonIdx: 2, noKontrak: '029/SPM/WK-NK.KSO/PDBJ/1726012/2026', wbs: 'W.01', volume: 5, versi: 1 }];
K.ctx.mp24Baca_ = () => JSON.parse(JSON.stringify(alok)); K.ctx.mp24IsiAlokasi_ = (L, x, u, t) => ({ rec: Object.assign({}, L.find(z => z.id === x.id), { batal: true, alasanBatal: x.alasan }), oldId: x.id }); K.ctx.mp24TulisBaris_ = (p, j, rec, id) => { alok[alok.findIndex(z => z.id === id)] = rec; };
const U = { 'Joko Supriyono': { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' }, 'Staf Pengadaan': { nama: 'Staf Pengadaan', peran: 'PENGADAAN' }, 'Kepala Proyek': { nama: 'Kepala Proyek', peran: 'LIHAT' } };
const REG = [{ id: 'L1', noKontrak: '026/SPK/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'Surveyor Indonesia, PT', nilai: 295000000, versi: 1, diposting: true, items: [{ uraian: 'Jasa survei', vol: 1, noPermintaan: '006/WK' }] }];
const RING = [{ key: '029/SPM/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'Adhimix RMC Indonesia, PT', nilai: 1538735000, items: [{ itemPekerjaan: 'Beton K-350', noBonPermintaan: '006/WK' }] }, { key: '024/SPK/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'Fajar Mulia Utama, CV', nilai: 1774117561, items: [] }];
K.koleksi[P + '|data'] = JSON.parse(JSON.stringify(REG)); K.koleksi[P + '|progres'] = [{ id: 'B1', noKontrak: RING[1].key, nomorBA: '01/BAPP/024/SPK' }];
let n = 0; const now = () => new Date(Date.UTC(2026, 10, 12, 3, 0, n++)).toISOString();
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: out ? 2 : 1 }); const galat = []; pg.on('pageerror', e => galat.push(e.message));
  await pg.exposeFunction('__srv', (a, x, nama) => { try { if (!A[a]) throw new Error('Aksi tidak dikenal: ' + a); return JSON.parse(JSON.stringify(A[a](x || {}, U[nama], P, now()))); } catch (e) { return { ok: false, error: e.message }; } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px system-ui,Arial,sans-serif;margin:16px;background:#0e1f3d;color:#dbe6f5}table.r{width:100%;border-collapse:collapse}table.r td{padding:12px 10px;border-bottom:1px solid #1e3a66;vertical-align:middle}code{color:#7db6f2;font-weight:700}
    .btn{border:1px solid #2a78d6;border-radius:6px;padding:4px 9px;font-size:13px;cursor:pointer;background:#12305a;color:#dbe6f5}.btn-outline-danger,.btn-danger{border-color:#e34948;color:#ff8d8c}.btn-danger{background:#d92d20;color:#fff}.btn-primary{background:#1763B3;color:#fff}.btn-light{background:#fff;color:#1f2937}.border{border:1px solid #cbd5e1}
    .btn-close{border:0;background:none;font-size:18px;cursor:pointer}.btn-close:before{content:"×"}.form-control{border:1px solid #cbd5e1;border-radius:6px;padding:5px 8px;width:100%;box-sizing:border-box;font:inherit}.small{font-size:12.5px}.mt-2{margin-top:8px}.mb-2{margin-bottom:8px}.mt-1{margin-top:4px}.ms-1{margin-left:4px}.font-monospace{font-family:monospace}.badge{font-size:11px;border:1px solid #2a78d6;border-radius:5px;padding:1px 6px}
    .fas{font-style:normal}.fa-ban:before{content:"⊘"}.fa-pen:before{content:"✎"}.fa-clock-rotate-left:before{content:"↺"}.fa-sitemap:before{content:"⌥"}.fa-trash:before{content:"🗑"}
    ${paket.css}</style></head><body><h3>Register Kontrak</h3><table class="r"><tbody id="regBody"></tbody></table></body></html>`);
  const masuk = nama => pg.evaluate(async ({ nama, REG, RING }) => {
    window.REG = window.REG || { data: JSON.parse(JSON.stringify(REG)) }; window.REG.sesi = { nama, admin: nama === 'Joko Supriyono', peran: nama === 'Kepala Proyek' ? 'LIHAT' : 'PENGADAAN' };
    window.RINGKASAN = window.RINGKASAN || JSON.parse(JSON.stringify(RING)); window.PROYEK = { id: '1726012' };
    window.__n = []; window.notif = (m, t) => window.__n.push([m, t]); window.mp220Srv = () => true; window.__klik = []; window.__s = window.__s || [];
    window.regAksi = async (a, x) => { window.__s.push([a, JSON.parse(JSON.stringify(x || {}))]); const r = await window.__srv(a, x || {}, window.REG.sesi.nama); if (!r || r.ok === false) throw new Error(r && r.error || 'gagal'); return r; };
    window.bukaEditReg = id => window.__klik.push('edit:' + id); window.bukaKoreksi = k => window.__klik.push('koreksi:' + k); window.mp21011BatalPO = id => window.__klik.push('HAPUS-FISIK:' + id);
    window.renderRegister = () => { document.getElementById('regBody').innerHTML = window.REG.data.map(r => `<tr data-id="${r.id}" class="baris-kontrak" onclick="bukaEditReg(this.dataset.id)"><td><code>${r.noKontrak}</code> <span class="badge">Register</span></td><td>${r.namaVendor}</td><td>${r.nilai.toLocaleString('id-ID')}</td><td>Diposting</td>
        <td><button type="button" class="btn" onclick="event.stopPropagation();bukaEditReg('${r.id}')"><i class="fas fa-pen"></i></button>${window.REG.sesi.admin ? `<button type="button" class="btn btn-outline-danger ms-1 mp21011-batal" title="Batalkan kontrak / PO ini (Admin)" onclick="event.stopPropagation();mp21011BatalPO('${r.id}')"><i class="fas fa-ban"></i></button>` : ''}</td></tr>`).join('')
      + window.RINGKASAN.map(g => `<tr data-key="${g.key}" class="baris-kontrak" onclick="bukaKoreksi(this.dataset.key)"><td><code>${g.key}</code> <span class="badge">Master</span></td><td>${g.namaVendor}</td><td>${g.nilai.toLocaleString('id-ID')}</td><td>Proses Kontrak · Tagihan 0%</td>
        <td><button type="button" class="btn" onclick="event.stopPropagation();bukaKoreksi('${g.key}')"><i class="fas fa-pen"></i></button><button type="button" class="btn ms-1" onclick="event.stopPropagation()"><i class="fas fa-sitemap"></i></button></td></tr>`).join(''); };
    if (window.MP21015) { window.MP21015.siap = false; window.MP21015.kunci = ''; }
    window.renderRegister();
  }, { nama, REG, RING });
  const tunggu = ms => pg.waitForTimeout(ms || 800), teks = sel => pg.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const tangkap = async nm => { if (out) await pg.screenshot({ path: path.join(out, nm) }); };
  const baris = i => `#regBody tr:nth-child(${i})`;

  await masuk('Staf Pengadaan'); await pg.addScriptTag({ content: blok }); await tunggu(1000);
  console.log('A. Tombol batal seragam');
  ok(await pg.locator(baris(2) + ' .mp21015-btn .fa-ban').count() === 1 && await pg.locator(baris(3) + ' .mp21015-btn .fa-ban').count() === 1, 'baris Master (029/SPM, 024/SPK) kini punya tombol batal');
  ok(await pg.locator(baris(1) + ' .mp21015-btn .fa-ban').count() === 1, 'baris Register (Pengadaan non-Admin, dulu tanpa tombol): kini punya tombol batal');
  await masuk('Joko Supriyono'); await tunggu(1000);
  ok(await pg.locator(baris(1) + ' .fa-ban').count() === 1 && await pg.locator(baris(1) + ' .mp21011-batal[data-mp21015-alih]').count() === 1, 'Admin: tombol Batalkan 2.10.11 dipakai (tidak ada tombol ganda)');
  await pg.click(baris(1) + ' [data-mp21015-alih]'); await tunggu(300);
  ok(await pg.locator('#mp21015Modal').count() === 1 && !(await pg.evaluate(() => window.__klik.join())).includes('HAPUS-FISIK'), 'tombol Batalkan 2.10.11 (arsip + hapus) dialihkan ke dialog soft-delete — kontrak tidak dihapus');
  await pg.click('#mp21015Modal [data-tutup]'); await masuk('Staf Pengadaan'); await tunggu(1000);
  console.log('B. PO CANCEL');
  await pg.click(baris(2) + ' .mp21015-btn'); await tunggu(300);
  await pg.click('#mp21015Ok'); ok(/minimal 12 karakter/.test(await teks('#mp21015Pesan')), 'alasan wajib');
  await pg.fill('#mp21015Alasan', 'Vendor mengundurkan diri, surat no. 12/ARI/XI/2026'); await tangkap('po-cancel-dialog.png');
  await pg.click('#mp21015Ok'); await tunggu(1200);
  const t2 = await teks(baris(2));
  ok(/PO CANCEL · Dibatalkan/.test(t2) && /Staf Pengadaan · 12 Nov 2026 10\.00 WIB/.test(t2) && /Vendor mengundurkan diri/.test(t2) && await pg.locator(baris(2) + '.mp21015-batal').count() === 1, 'baris tetap tampil berlabel PO CANCEL + pengguna, waktu, alasan');
  ok(await pg.evaluate(s => [...document.querySelectorAll(s + ' button')].filter(b => !b.classList.contains('mp21015-btn')).every(b => b.disabled), baris(2)) && await pg.locator('#regBody tr').count() === 3, 'tombol aksi baris itu terkunci; tidak ada baris yang hilang');
  ok(alok[0].batal === true && (await pg.evaluate(() => window.RINGKASAN[0].items[0].noBonPermintaan === '' && window.RINGKASAN[0].items[0].noBonPermintaanAsal === '006/WK')), 'item Bon dilepas: alokasi dibatalkan server, tautan No Bon tidak lagi dihitung');
  await pg.click(baris(2) + ' td:nth-child(2)'); await tunggu(300);
  ok(/Status kontrak · PO CANCEL/.test(await teks('#mp21015Modal')) && /AKTIF → PO CANCEL/.test(await teks('.mp21015-tb')) && /Item Bon dilepas \(1\)/.test(await teks('#mp21015Modal')) && !(await pg.evaluate(() => window.__klik.join())).includes('koreksi'), 'klik baris terkunci → riwayat status (form koreksi tidak terbuka)');
  ok(!(await pg.locator('#mp21015Pulih').count()) && /hanya oleh Admin/.test(await teks('#mp21015Modal')), 'Pengadaan tidak dapat memulihkan PO CANCEL');
  await tangkap('po-cancel-riwayat.png'); await pg.click('#mp21015Modal [data-tutup]');
  await pg.click(baris(3) + ' .mp21015-btn'); await tunggu(300); await pg.fill('#mp21015Alasan', 'Lingkup pekerjaan dipindah ke kontrak baru'); await pg.click('#mp21015Ok'); await tunggu(600);
  ok(/sudah memiliki 1 tagihan\/BK.*Gunakan HOLD/.test(await teks('#mp21015Pesan')), 'kontrak bertagihan: PO CANCEL ditolak server, disarankan HOLD');
  console.log('C. HOLD & pemulihan');
  await pg.check('input[name="mp21015St"][value="HOLD"]'); await pg.click('#mp21015Ok'); await tunggu(1200);
  ok(/HOLD · Ditahan/.test(await teks(baris(3))) && await pg.locator(baris(3) + '.mp21015-hold').count() === 1, 'HOLD: baris berlabel HOLD · Ditahan');
  await tangkap('po-cancel-register.png');
  await pg.click(baris(3) + ' td:nth-child(2)'); await tunggu(300); await pg.fill('#mp21015Alasan', 'addendum harga sudah disetujui'); await pg.click('#mp21015Pulih'); await tunggu(1200);
  ok(!/HOLD/.test(await teks(baris(3))) && await pg.locator(baris(3) + ' .mp21015-btn .fa-ban').count() === 1 && await pg.evaluate(s => [...document.querySelectorAll(s + ' button')].every(b => !b.disabled), baris(3)), 'HOLD dipulihkan Pengadaan: baris aktif kembali, tombol terbuka');
  await masuk('Joko Supriyono'); await tunggu(1200);
  await pg.click(baris(2) + ' td:nth-child(2)'); await tunggu(300); await pg.fill('#mp21015Alasan', 'salah pilih kontrak saat membatalkan'); await pg.click('#mp21015Pulih'); await tunggu(1200);
  ok(!/PO CANCEL/.test(await teks(baris(2))) && (await pg.evaluate(() => window.RINGKASAN[0].items[0].noBonPermintaan)) === '006/WK', 'Admin memulihkan PO CANCEL: label hilang, tautan No Bon kembali');
  await masuk('Kepala Proyek'); await tunggu(1000);
  ok(await pg.locator('.mp21015-btn').count() === 0 && await pg.locator('[data-mp21015-alih]').count() === 0, 'akun Lihat saja: tanpa tombol batal');
  const log = K.log.filter(l => /PO CANCEL|PO HOLD|PULIHKAN KONTRAK/.test(l.jenis)).map(l => l.jenis);
  ok(log.join() === 'PO CANCEL,PO HOLD,PULIHKAN KONTRAK,PULIHKAN KONTRAK' && K.sheets[P + '_KontrakStatus'].rows.length === 3 && K.koleksi[P + '|data'].length === 1, 'Log lengkap; sheet status 2 kontrak; data kontrak tidak berkurang');
  assert.deepStrictEqual(galat, []);
  console.log('UJI UI 2.10.15: ' + lulus + ' cek LULUS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
