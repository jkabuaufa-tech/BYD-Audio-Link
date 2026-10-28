// Boot APLIKASI ASLI Monitoring SAP untuk uji: HTML dasar (HTML_DASAR, mis. Monitoring_SAP.html tanpa pemuat) + isi paket disuntikkan
// setelah halaman dimuat (sama seperti pemuat hp-awal.js) + server = kernel Code.gs asli (KODE_GS) di Node dengan tiruan Google.
const fs = require('fs'), assert = require('assert'), vm = require('vm');
const { chromium } = require('playwright');
const { buatKonteks } = require('./harness.js');
// Boot aplikasi asli: HTML dasar + isi paket disuntikkan setelah halaman dimuat (sama seperti pemuat hp-awal.js), server = kernel asli di Node
async function boot(o) {
  o = o || {};
  const HTML = fs.readFileSync(process.env.HTML_DASAR, 'utf8'), PKT = JSON.parse(o.paket);
  const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id, doGet = vm.runInContext('doGet', C);
  K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Petugas Gudang', peran: 'LIHAT', pin: '2222', aktif: true, proyek: '*' }].concat(o.pengguna || []));
  K.tulisProyek_([K.PROYEK_AWAL]);
  const post = x => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(x) } }));
  const ADM = (a, x) => post(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  assert.ok(ADM('modulUnggah', { data: o.modul }).ok); { const t = ADM('modulTerbit', { versi: o.modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji ujung-ke-ujung 2.7.3' }); assert.ok(t.ok, t.error); }
  if (o.pasangDrive) o.pasangDrive(C, K, P);
  if (o.siapkan) o.siapkan(C, K, P);
  const login = ADM('login');
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: o.viewport || { width: 1366, height: 900 } }); const gal = []; pg.on('pageerror', e => gal.push(e.message));
  pg.on('dialog', d => d.dismiss());
  await pg.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.host === 'app.test') return r.fulfill({ body: u.pathname === '/' ? HTML : '', contentType: u.pathname === '/' ? 'text/html; charset=utf-8' : 'text/javascript' });
    if (u.host === 'srv.test') { const out = q.method() === 'POST' ? K.doPost({ postData: { contents: q.postData() } }) : doGet({ parameter: Object.fromEntries(u.searchParams) }); return r.fulfill({ body: typeof out === 'string' ? out : JSON.stringify(out), contentType: 'application/json' }); }
    return r.fulfill({ body: '', status: 204 });
  });
  const sb = o.sebagai || { nama: 'Joko Supriyono', peran: 'PENGADAAN', pin: '1234', admin: true };   // o.sebagai: masuk sebagai akun lain
  const sesi = { nama: sb.nama, peran: sb.peran, pin: sb.pin, proyek: P, admin: !!sb.admin, cfg: login.proyek || { id: P } };
  await pg.addInitScript(s => { try { localStorage.setItem('JICT_REG_URL', 'https://srv.test/exec'); localStorage.setItem('JICT_REG_SESI', JSON.stringify(s)); } catch (e) { } }, sesi);
  await pg.goto('https://app.test/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pg.waitForFunction(() => typeof REG !== 'undefined' && REG.sesi, null, { timeout: 60000 });
  await pg.addStyleTag({ content: PKT.css });
  if (o.sebelum) await pg.evaluate(o.sebelum);   // tiruan fungsi HTML dasar yang lebih baru (khusus uji)
  for (const b of PKT.js.split(/\n(?=\/\* MP[0-9A-Z]+ )/)) { try { await pg.addScriptTag({ content: b }); } catch (e) { gal.push('blok: ' + e.message); } }   // per blok: galat satu blok tidak menghentikan blok lain
  await pg.waitForTimeout(o.tunggu || 3000);
  return { br, pg, gal, C, K, P, post };
}
module.exports = boot;
