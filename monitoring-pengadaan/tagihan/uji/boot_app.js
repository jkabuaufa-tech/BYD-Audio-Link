// Boot APLIKASI ASLI Monitoring SAP di Chromium: HTML dasar (HTML_DASAR) + paket pembaruan + kernel Code.gs asli (KODE_GS) + modul server,
// server = kernel di Node dengan tiruan Google (harness). Dipakai uji UI paket tagihan.
const { chromium } = require('playwright'), fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../../asisten-ai-agen';
const { buatKonteks } = require(R + '/uji/harness.js');
module.exports = async function boot(opsi) {
  opsi = opsi || {};
  const HTML = fs.readFileSync(process.env.HTML_DASAR, 'utf8');
  const PKT = opsi.paket || fs.readFileSync(R + '/pembaruan-2.7.0.json', 'utf8'), VERSI = JSON.parse(PKT).versi;
  const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id, doGet = vm.runInContext('doGet', C);
  K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
  K.tulisProyek_([K.PROYEK_AWAL]);
  const post = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
  const ADM = (action, x) => post(Object.assign({ action, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  const modul = opsi.modul || JSON.parse(fs.readFileSync(R + '/server-modul-1.10.0.json', 'utf8'));
  assert.ok(ADM('modulUnggah', { data: modul }).ok);
  { const t = ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji antarmuka paket tagihan' }); assert.ok(t.ok, t.error); }
  if (opsi.pasangDrive) opsi.pasangDrive(C, K, P);
  C.__pkt = JSON.parse(PKT);
  vm.runInContext("(function (p) { const f = folderPembaruan_().createFile(Utilities.newBlob(JSON.stringify(p), 'application/json', 'pembaruan-' + p.versi + '.json')); mp219SimpanMeta_(f.getId(), p); PropertiesService.getScriptProperties().setProperty('PEMB_AKTIF', f.getId()); })(__pkt)", C);
  if (opsi.siapkan) opsi.siapkan(C, K, P, ADM, post);
  const login = ADM('login');
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await br.newPage({ viewport: opsi.viewport || { width: 1366, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  pg.on('dialog', d => d.dismiss());
  const LIB = opsi.lib || {};
  await pg.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    for (const k of Object.keys(LIB)) if (q.url().startsWith(k)) return r.fulfill({ body: fs.readFileSync(LIB[k]), contentType: 'text/javascript' });
    if (u.host === 'app.test') return u.pathname === '/' ? r.fulfill({ body: HTML, contentType: 'text/html; charset=utf-8' }) : r.fulfill({ body: '', contentType: 'text/javascript' });
    if (u.host === 'srv.test') {
      const out = q.method() === 'POST' ? K.doPost({ postData: { contents: q.postData() } }) : doGet({ parameter: Object.fromEntries(u.searchParams) });
      return r.fulfill({ body: typeof out === 'string' ? out : JSON.stringify(out), contentType: 'application/json' });
    }
    return r.fulfill({ body: '', status: 204 });
  });
  const sesi = opsi.sesi || { nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', proyek: P, admin: true, cfg: login.proyek || { id: P } };
  await pg.addInitScript(([pkt, sesi]) => { try { if (!sessionStorage.getItem('uji')) { sessionStorage.setItem('uji', 1); localStorage.setItem('JICT_PEMBARUAN', pkt); localStorage.setItem('JICT_REG_URL', 'https://srv.test/exec'); localStorage.setItem('JICT_REG_SESI', JSON.stringify(sesi)); } } catch (e) { } }, [PKT, sesi]);
  await pg.goto('https://app.test/', { timeout: 120000 });
  await pg.waitForFunction(v => typeof PEMB !== 'undefined' && PEMB.aktif && PEMB.aktif.versi === v && typeof REG !== 'undefined' && REG.sesi, VERSI, { timeout: 90000 });
  await pg.waitForTimeout(opsi.tunggu || 2500);
  return { br, pg, gal, C, K, P, ADM, post, VERSI };
};
