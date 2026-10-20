// Uji kernel Code.gs 2.5.2 (KODE_GS) dibanding 2.5.1 (KERNEL_LAMA=path Code 2.5.1): Properties ber-cache & galat Google selalu JSON.
// Pakai: KODE_GS=../server/Code_2.5.2_Monitoring_Pengadaan.gs KERNEL_LAMA=../server/Code_2.5.1_Monitoring_Pengadaan.gs node uji_kernel_252.js
const fs = require('fs'), assert = require('assert'), path = require('path');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const R = __dirname + '/..', baca = n => JSON.parse(fs.readFileSync(R + '/' + n, 'utf8'));
function siapkan(kodeGs, modul) {
  process.env.KODE_GS = kodeGs; delete require.cache[require.resolve('./harness.js')];
  const C = require('./harness.js').buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
  K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]); K.tulisProyek_([K.PROYEK_AWAL]);
  const post = (nama, pin, a, e) => { const o = K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, e || {})) } }); return JSON.parse(o); };
  const ADM = (a, e) => post('Joko Supriyono', '1234', a, e), STF = (a, e) => post('Staf Pengadaan', '1111', a, e);
  const MV = (modul || 'server-modul-1.8.10.json').match(/(\d+\.\d+\.\d+)/)[1]; assert.ok(ADM('modulUnggah', { data: baca(modul || 'server-modul-1.8.10.json') }).ok); assert.ok(ADM('modulTerbit', { versi: MV, konfirmasi: 'LULUS UJI', catatanUji: 'uji kernel 2.5.2 properties' }).ok);
  // hitung pembacaan Properties asli & bisa dibuat "kuota habis"
  const pr = C.PropertiesService.getScriptProperties(), st = { baca: 0, habis: false };
  const asli = pr.getProperty.bind(pr);
  pr.getProperty = k => { if (st.habis) throw new Error('Service invoked too many times for one day: properties get.'); st.baca++; return asli(k); };
  C.PropertiesService.getScriptProperties = () => pr;
  return { C, K, P, ADM, STF, st };
}
const beban = X => { for (let i = 0; i < 10; i++) { X.STF('login'); X.STF('bacaSemua', { versi: '' }); X.STF('checklistRingkas'); X.STF('gudangBaca'); X.STF('notifInfo'); X.STF('hadirDetak', { data: { menu: 'Dasbor' } }); } };
const lama = process.env.KERNEL_LAMA, BARU = path.resolve(process.env.KODE_GS);
console.log('1. Pembacaan Script Properties untuk 60 permintaan rutin (10 klien × login, bacaSemua, checklist, gudang, notif, kehadiran)');
let L = null; if (lama) { L = siapkan(path.resolve(lama), 'server-modul-1.8.9.json'); L.st.baca = 0; beban(L); }
const B = siapkan(BARU); B.st.baca = 0; beban(B);
ok(B.st.baca <= 12, '2.5.2: ' + B.st.baca + ' pembacaan Properties' + (L ? ' (2.5.1 + modul 1.8.9: ' + L.st.baca + ' → turun ' + Math.round((1 - B.st.baca / L.st.baca) * 100) + '%)' : ''));
console.log('2. Kuota harian Properties habis');
if (L) { L.st.habis = true; let lempar = null; try { L.K.doPost({ postData: { contents: JSON.stringify({ action: 'gudangBaca', nama: 'Staf Pengadaan', pin: '1111', proyek: L.P }) } }); } catch (e) { lempar = e.message; }
  ok(!!lempar && /too many times/.test(lempar), '2.5.1: doPost MELEMPAR galat (di Google = halaman HTML / Drive 404 — galat yang dilaporkan)'); }
B.st.habis = true;
let r = B.STF('gudangBaca'); ok(r.ok, '2.5.2: permintaan yang sama TETAP BERHASIL selama kuota habis (nilai Properties dari cache)');
const B2 = siapkan(BARU); B2.C.CacheService.getScriptCache = () => ({ get: () => null, put() { }, putAll() { }, getAll: () => ({}), remove() { } }); B2.st.habis = true;   // cache kedaluwarsa
r = B2.STF('gudangBaca'); ok(r && r.ok === false && r.kode === 'KUOTA' && /Kuota harian layanan Google/.test(r.error), '2.5.2 tanpa cache: dibalas JSON {ok:false, kode:"KUOTA"} dengan pesan jelas (bukan halaman HTML)');
r = JSON.parse(B2.C.doGet({ parameter: { action: 'ping' } })); ok(r.ok === false && r.kode === 'KUOTA', 'doGet ping juga JSON berkode KUOTA');
r = B2.STF('save', { data: { noKontrak: '040/SPM/X/1726012/2026', items: [] } }); ok(r.ok === false && r.kode === 'KUOTA', 'simpanan: JSON berkode KUOTA, data tidak tertulis sebagian');
console.log('3. Gangguan sementara layanan Google & galat biasa');
const B3 = siapkan(BARU);
const ssAsli = B3.C.SpreadsheetApp.getActiveSpreadsheet; B3.C.SpreadsheetApp.getActiveSpreadsheet = () => { throw new Error('Service Spreadsheets timed out while accessing document with id 1vgs.'); };
r = B3.STF('bacaSemua', { versi: '' }); ok(r.ok === false && r.kode === 'GOOGLE' && /Gangguan sementara layanan Google/.test(r.error), 'Spreadsheet timed out → JSON kode GOOGLE (aplikasi 2.6.2 mengulang otomatis)');
B3.C.SpreadsheetApp.getActiveSpreadsheet = ssAsli;
r = B3.STF('save', { data: { noKontrak: '', items: [] } }); ok(r.ok === false && r.error === 'No Kontrak wajib diisi.' && r.kode === '', 'galat validasi biasa tidak berubah (pesan sama, kode kosong)');
console.log('4. Tulis Properties langsung terlihat');
r = B3.ADM('modulInfo'); const v0 = r.aktif && r.aktif.versi;
B3.C.props_().setProperty('MODUL_NONAKTIF', '1'); r = B3.STF('aiInfo'); ok(!r.ok || !r.versiAI, 'nonaktifkan modul → permintaan berikutnya langsung melihat nilai baru (cache diperbarui saat tulis)');
B3.C.props_().deleteProperty('MODUL_NONAKTIF'); r = B3.STF('aiInfo'); ok(r.ok && r.versiAI === '1.8.10' && v0 === '1.8.10', 'aktifkan lagi → modul 1.8.10 aktif kembali');
console.log('5. cekLayananGoogle() (fungsi editor)');
const log = []; B3.C.Logger = { log: m => log.push(String(m)) }; B3.C.cekLayananGoogle();
ok(log.some(x => /^✔ Script Properties/.test(x)) && log.some(x => /^✔ Kunci tulis/.test(x)) && log.some(x => /^✔ Modul server .*aktif/.test(x)), 'melaporkan Properties, Cache, Spreadsheet, Drive, kunci tulis & modul');
console.log('\nLULUS ' + lulus + ' cek');
