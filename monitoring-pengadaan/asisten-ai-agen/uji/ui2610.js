// Uji 2.6.10 di Chromium memakai APLIKASI ASLI (HTML_DASAR + paket utuh + kernel Code.gs 2.5.1 asli + modul 1.9.2):
// kontrak bernilai Rp 0 yang itemnya berharga (hasil Perbaikan Register / DRAFT Master) memakai jumlah harga item di Dashboard.
//   HTML_DASAR=…/index.html KODE_GS=…/Code.gs node uji/ui2610.js           (PAKET=pembaruan-2.6.9.json → memperlihatkan galat lama)
const { chromium } = require('playwright'), fs = require('fs'), vm = require('vm'), assert = require('assert');
const { buatKonteks } = require('./harness.js');
const HTML = fs.readFileSync(process.env.HTML_DASAR, 'utf8');
const PKT = fs.readFileSync(__dirname + '/../' + (process.env.PAKET || 'pembaruan-2.6.10.json'), 'utf8'), VERSI = JSON.parse(PKT).versi;
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id, doGet = vm.runInContext('doGet', C);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
const ADM = (action, x) => post(Object.assign({ action, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
const modul = JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.9.2.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok);
{ const t = ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji nilai kontrak dari item' }); assert.ok(t.ok, t.error); }
C.__pkt = JSON.parse(PKT);
vm.runInContext("(function (p) { const f = folderPembaruan_().createFile(Utilities.newBlob(JSON.stringify(p), 'application/json', 'pembaruan-' + p.versi + '.json')); mp219SimpanMeta_(f.getId(), p); PropertiesService.getScriptProperties().setProperty('PEMB_AKTIF', f.getId()); })(__pkt)", C);

// Kasus 027/SPM: item kontrak DRAFT Master bernilai header 0 (No 70 Koperasi Karyawan PT Nindya, Hiab Crane 4 × Rp 51 jt)
// dipindahkan dengan Perbaikan Register (2.6.0) ke nomor 927/SPSA (nomor uji) → nilai tujuan 0; BK Rp 204 jt (100% di Input Progres)
const DRAF = '(DRAFT - BELUM ADA NO KONTRAK) No 70 baris 1329', KE = '927/SPSA/WK-NK.KSO/PDBJ/1726012/2026';
const sig = v => 'K:49000633|truck uni / mounted / hiab crane 10 ton|' + v + '#1';
K.tulisKoleksi_(P, 'koreksi', [
  { key: 'SISTEM-PERBAIKAN-REGISTER|' + DRAF, jenis: 'perbaikanRegister', aktif: true, sumber: DRAF, alasan: 'uji', pindah: [{ ke: KE, items: [sig(0), sig(4)], header: { namaVendor: 'Koperasi Karyawan PT Nindya' }, nilai: null, bagiTagihan: false }], versi: 1 },
  { key: KE, tglMulai: '2026-06-01', tglSelesai: '2026-06-19', versi: 1 }]);
K.tulisKoleksi_(P, 'progres', [{ id: 'T1', versi: 1, noKontrak: KE, tagihanKe: 1, periode: 'Oktober 2026', tanggal: '2026-10-23', items: {}, nilai: 204000000, baTerbit: true, nomorBA: '01/BAPSA/' + KE }]);
const login = ADM('login');

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: { width: 1366, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  pg.on('dialog', d => d.dismiss());
  await pg.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.host === 'app.test') return u.pathname === '/' ? r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }) : r.fulfill({ body: '', contentType: 'text/javascript' });
    if (u.host === 'srv.test') {
      const out = q.method() === 'POST' ? K.doPost({ postData: { contents: q.postData() } }) : doGet({ parameter: Object.fromEntries(u.searchParams) });
      return r.fulfill({ body: typeof out === 'string' ? out : JSON.stringify(out), contentType: 'application/json' });
    }
    return r.fulfill({ body: '', status: 204 });
  });
  await pg.addInitScript(([pkt, sesi]) => { try { if (!sessionStorage.getItem('uji')) { sessionStorage.setItem('uji', 1); localStorage.setItem('JICT_PEMBARUAN', pkt); localStorage.setItem('JICT_REG_URL', 'https://srv.test/exec'); localStorage.setItem('JICT_REG_SESI', JSON.stringify(sesi)); } } catch (e) { } },
    [PKT, { nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', proyek: P, admin: true, cfg: login.proyek || { id: P } }]);
  await pg.goto('https://app.test/', { timeout: 120000 });
  await pg.waitForFunction(v => typeof PEMB !== 'undefined' && PEMB.aktif && PEMB.aktif.versi === v && PROG.data.length === 1 && Object.keys(KOREKSI.data || {}).length === 2 && typeof window.semuaKontrak214 === 'function', VERSI, { timeout: 60000 });
  await pg.waitForTimeout(2500);
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  const d = await pg.evaluate(([KE, DRAF]) => {
    renderAllTables(); window.mp258Hitung();
    const K = window.semuaKontrak214(), x = K.find(k => k.key === KE), dr = K.find(k => k.key === '(DRAFT - BELUM ADA NO KONTRAK) No 67 baris 1315'), src = K.find(k => k.key === DRAF);
    const pc = x && x.nilai ? Math.min(x.realisasi / x.nilai, 1) : 0;
    return { ada: !!x, nilai: x && x.nilai, realisasi: x && x.realisasi, pct: pc, status: x && x.statusKey, masa: x && window.mp220Masa(x).k, dari: !!(window.mp2610NilaiDariItem && window.mp2610NilaiDariItem(x.g)),
      notif: window.MP258_NT.L.some(n => n.g === 'kontrak' && n.judul.startsWith('927/')), draf67: dr && dr.nilai, sumber: src ? src.nilai : null };
  }, [KE, DRAF]);
  console.log('paket ' + VERSI + ' · 927/SPSA: nilai Rp ' + Number(d.nilai).toLocaleString('id-ID') + ' · tagihan Rp ' + Number(d.realisasi).toLocaleString('id-ID') + ' · ' + Math.round(d.pct * 100) + '% · ' + d.status + ' · ' + d.masa);
  ok(d.ada && d.realisasi === 204000000, 'kontrak tujuan Perbaikan Register 927/SPSA terbaca dengan tagihan BK Rp 204.000.000');
  ok(d.nilai === 204000000 && d.dari, 'nilai kontrak = jumlah harga item (4 × Rp 51.000.000), bukan Rp 0');
  ok(d.pct === 1 && d.status === 'selesai' && d.masa === 'selesai', 'Dashboard: tagihan 100%, status Selesai (sama dengan Input Progres / BAPM)');
  ok(!d.notif, 'tidak muncul di Notifikasi prioritas (kontrak lewat)');
  ok(d.draf67 === 398053296, 'kontrak DRAFT Master lain bernilai header 0 (No 67 Fajar Mulia Utama) → nilai item Rp 398.053.296');
  await pg.evaluate(() => { showTab('dashboard-tagihan'); RK214.cari = '927'; RK214.filter = 'semua'; });
  await pg.evaluate(() => { const i = document.getElementById('rkCari'); if (i) { i.value = '927'; i.dispatchEvent(new Event('input')); } });
  await pg.waitForTimeout(600);
  const baris = await pg.evaluate(() => [...document.querySelectorAll('#mp214Rekap tbody tr')].map(t => t.textContent.replace(/\s+/g, ' ').trim()).filter(t => /927\/SPSA/.test(t)));
  ok(baris.length === 1 && /Rp 204 Juta/.test(baris[0]) && /100%/.test(baris[0]), 'Rekap Seluruh Kontrak: "' + (baris[0] || '').slice(0, 110) + '…"');
  ok(!gal.length, 'tanpa galat JavaScript' + (gal.length ? ': ' + gal.join(' | ') : ''));
  await br.close();
  console.log('\nLULUS ' + lulus + ' uji ' + VERSI + ' (nilai kontrak dari item)');
})().catch(e => { console.error(e.message || e); process.exit(1); });
