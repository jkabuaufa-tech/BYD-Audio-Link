// Uji 2.6.11 di demo aplikasi lengkap (HTML dasar + paket + kernel Code.gs + modul 1.9.2): No PR/RFQ/PO SAP yang diisi di
// Register Kontrak / Perbaiki data kontrak tampil sama di Register, Monitoring BK Bulanan, Keuangan & Bayar dan form dokumen SAP.
//   HTML_DASAR=…/index.html KODE_GS=…/Code.gs node uji/ui2611.js [pembaruan.json]     (pembaruan-2.6.10.json → memperlihatkan galat lama)
const { chromium } = require('playwright'), fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), { execFileSync } = require('child_process');
const R = path.join(__dirname, '..'), PAKET = process.argv[2] || 'pembaruan-2.6.11.json';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-')), F = path.join(TMP, 'demo.html');
execFileSync('python3', ['-I', path.join(R, 'demo/rakit_demo_app.py'), process.env.HTML_DASAR, process.env.KODE_GS, path.join(R, PAKET), F]);
const NO = (n, j) => n + '/' + (j || 'SPM') + '/WK-NK.KSO/PDBJ/1726012/2026';
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1366, height: 900 } }), gal = []; pg.on('pageerror', e => gal.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.route(/^https?:/, r => r.fulfill({ status: 204, body: '' }));
  await pg.goto('file://' + F, { timeout: 120000 });
  await pg.waitForFunction(() => typeof PEMB !== 'undefined' && PEMB.aktif && PMT.data.length >= 2 && REG.sesi, null, { timeout: 60000 }); await pg.waitForTimeout(2500);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const versi = await pg.evaluate(() => PEMB.aktif.versi);
  // skenario lewat server demo (kernel asli): koreksi PO, BK lama tanpa PO / "IDC" / PO lain, Register atas kontrak Master ber-PO "IDC"
  const siap = await pg.evaluate(([K55, K16, K13]) => {
    const S = window.DEMO_SERVER, A = (a, x) => S.kirim(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: '1726012' }, x || {})), St = (a, x) => S.kirim(Object.assign({ action: a, nama: 'Staf Pengadaan', pin: '1111', proyek: '1726012' }, x || {}));
    const hasil = [];
    hasil.push(St('saveKoreksi', { data: { key: K55, versi: 0, data: { noPO: '4100076091', noPR: '1000180055', noRFQ: '2100200055', catatan: 'PO dari SAP' } } }).ok);
    const g = RINGKASAN.find(x => x.key === K55), id = (g.items[0] && g.items[0].kodeUnik) || (K55 + '#0');
    const bk = (no, ke, po, nilai) => St('saveProgres', { data: { noKontrak: no, tagihanKe: ke, periode: 'Desember 2026', periodeKey: 202611, tanggal: '2026-12-0' + (ke - 6), items: { [id]: 0.001 }, nilai, noPO: po } });
    [bk(K55, 7, '', 1000000), bk(K55, 8, 'IDC', 1000000), bk(K55, 9, '4100070000', 1000000)].forEach(r => hasil.push(r.ok || r.error));
    return hasil;
  }, [NO('055'), NO('016'), NO('013')]);
  console.log('    persiapan:', JSON.stringify(siap));
  await pg.evaluate(() => muatRegister(true)); await pg.waitForTimeout(1500);
  const d = await pg.evaluate(K55 => {
    renderAllTables();
    const K = window.semuaKontrak214(), x = K.find(k => k.key === K55);
    const bk = PROG.data.filter(e => e.noKontrak === K55 && Number(e.tagihanKe) >= 7).map(e => { const b = barisBK(e); return { ke: e.tagihanKe, simpan: e.noPO || '', po: b.nilai.po, pr: b.nilai.pr, rfq: b.nilai.rfq }; });
    // seluruh BK: PO di Monitoring BK = PO SAP kontrak bila kontrak punya nomor SAP
    const sap = v => /^\d{6,}$/.test(String(v || '').trim()), beda = [];
    PROG.data.forEach(e => { const b = barisBK(e), g = b.g, reg = REG.data.find(r => r.noKontrak === e.noKontrak); const kon = [reg && reg.noPO, g && g.noPO].find(sap); if (kon && b.nilai.po !== kon) beda.push(e.noKontrak.split('/')[0] + ' ke-' + e.tagihanKe + ': BK ' + b.nilai.po + ' ≠ kontrak ' + kon); });
    return { reg: x && x.po, bk, beda, total: PROG.data.length };
  }, NO('055'));
  console.log('paket ' + versi + ' · 055 Register PO ' + d.reg + ' · BK: ' + d.bk.map(b => 'ke-' + b.ke + ' (tersimpan "' + b.simpan + '") → ' + b.po).join(' · '));
  ok(d.reg === '4100076091', 'Register Kontrak 055/SPM Cahaya Utama: PO 4100076091');
  ok(d.bk.length === 3 && d.bk.every(b => b.po === '4100076091'), 'Monitoring BK: ketiga BK 055 (PO kosong · "IDC" · PO lain 4100070000) menampilkan PO kontrak 4100076091');
  ok(d.bk.every(b => b.pr === '1000180055' && b.rfq === '2100200055'), 'PR & RFQ isian Perbaiki data kontrak juga terbawa ke BK');
  ok(!d.beda.length, 'seluruh ' + d.total + ' BK: PO di Monitoring BK = PO SAP kontrak' + (d.beda.length ? ' — beda: ' + d.beda.slice(0, 5).join('; ') : ''));
  // tampilan Monitoring BK Bulanan & Keuangan
  await pg.evaluate(() => { showTab('monitoring-bulanan'); BKM.periode = ''; renderMonitoringBulanan(); });
  await pg.waitForTimeout(500);
  const sel = await pg.evaluate(() => { const i = [...document.querySelectorAll('#bkBody tr')].filter(tr => /BAPM\/055\/SPM|055\/SPM/.test(tr.textContent) && /Tagihan ke-[789]/.test(tr.textContent)); return i.map(tr => [...tr.querySelectorAll('.bk-cek')].map(s => s.getAttribute('title') || '').filter(x => /^41\d+/.test(x))); });
  ok(sel.length >= 3 && sel.every(t => t.indexOf('4100076091') >= 0), 'tabel Monitoring BK Bulanan: kolom PO ✓ "4100076091" pada ' + sel.length + ' baris 055');
  await pg.screenshot({ path: path.join(process.env.TANGKAPAN || TMP, 'po-monitoring-bk.png') });
  const dok = await pg.evaluate(K55 => { const e = PROG.data.find(x => x.noKontrak === K55 && x.noPO === 'IDC'); bukaDokSAP(e.id); const v = (document.getElementById('dok_noPO') || {}).value; return v; }, NO('055'));
  ok(dok === '4100076091', 'form Lengkapi dokumen SAP (BK ber-PO "IDC") terisi PO kontrak 4100076091');
  const P = await pg.evaluate(() => window.mp2610Periksa().T.filter(t => /^PO_/.test(t.kode)).map(t => t.kode + ' ' + t.key.split('/')[0] + ' ' + t.pesan));
  console.log('    Periksa: ' + P.length + ' temuan PO, mis. ' + P.slice(0, 3).join(' | '));
  ok(P.some(t => /^PO_BK_BEDA 055 .*4100070000/.test(t)) && P.some(t => /^PO_KOSONG/.test(t)), 'Periksa kontrak: BK 055 ber-PO 4100070000 (berbeda) & kontrak ber-BK tanpa PO SAP dicantumkan');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log('\nLULUS ' + lulus + ' uji ' + versi + ' (PO SAP dari kontrak)');
})().catch(e => { console.error(e.message || e); process.exit(1); });
