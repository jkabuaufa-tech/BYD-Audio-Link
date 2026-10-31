// Uji modul 1.10.3 (Rilis D): AI khusus akun Joko Supriyono · AI hanya memverifikasi isi dokumen (bundel tidak dipisah AI menurut judul).
//   KODE_GS=…/Code.gs node uji/uji_ai_joko.js
const assert = require('assert'), vm = require('vm');
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.10.3.json';
process.env.VT_MANUAL = '1';   // setelan bawaan pengguna: mode manual aktif
delete process.env.AI_AKUN;
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, ADM, STF, LHT } = require('./vt_data.js')();
const pdfKeluar = () => C.__http.filter(h => /"document"|application\/pdf|file_data|inlineData/.test(JSON.stringify(h.o.payload || ''))).length;
const KHUSUS = /hanya tersedia untuk akun Joko Supriyono/;

console.log('1. Info AI per akun');
let r = ADM('aiInfo'); ok(r.ok && r.aksesAI === true && r.akunAI.join() === 'Joko Supriyono', 'Joko Supriyono: aksesAI = true (daftar akun AI dari server)');
r = STF('aiInfo'); ok(r.ok && r.aksesAI === false && r.boleh === false, 'Staf Pengadaan: aksesAI = false, Asisten AI tidak boleh dipakai');
r = STF('vtInfo'); ok(r.ok && r.aksesAI === false && r.penyedia.length === 0 && r.bolehJalan === false, 'Staf: Verifikasi Dokumen AI tanpa penyedia & tidak dapat dijalankan');
ok(ADM('vtInfo').penyedia.length > 0 && ADM('vtInfo').aksesAI === true, 'Joko: penyedia AI pembaca PDF tetap tersedia');
r = STF('timInfo'); ok(r.ok && r.aksesAI === false && r.bolehJalan === false, 'Staf: Tim AI tidak dapat dijalankan');

console.log('2. Server menolak aksi AI dari akun lain');
const h0 = C.__http.length;
['aiTanya', 'aiAksi', 'aiTerapkan', 'vtEkstrak', 'vtBundel', 'timJalan', 'timSetel', 'timSaran', 'aiSetel', 'aiDiagKunci'].forEach(a => {
  const x = STF(a, { data: { id: 'TSPM', k: 'UMUM_03', pesan: 'halo', teks: 'halo' } }); assert.ok(!x.ok && KHUSUS.test(x.error), a + ': ' + x.error);
});
ok(C.__http.length === h0, '10 aksi AI (Asisten, Agen, baca PDF, bundel, Tim AI, setelan & diagnosa key) ditolak untuk Staf Pengadaan — 0 panggilan AI');
r = LHT('vtEkstrak', { data: { id: 'TSPM', k: 'UMUM_03' } }); ok(!r.ok && KHUSUS.test(r.error), 'akun Lihat juga ditolak');
ok(STF('checklistBaca', { id: 'TSPM' }).ok && STF('vtRingkas').ok, 'aksi non-AI (checklist, ringkasan) tetap berjalan untuk Staf');

console.log('3. Joko: AI memverifikasi dokumen walau mode manual aktif');
ok(ADM('vtInfo').setelan.tanpaAI === true, 'mode manual tetap aktif (berlaku untuk akun lain)');
r = ADM('vtEkstrak', { data: { id: 'TSPM', k: 'UMUM_03' } }); assert.ok(r.ok, r.error);
ok(!r.manual && r.hasil.dokumen.length >= 1 && pdfKeluar() === 1, 'Joko: PDF kwitansi dibaca AI untuk verifikasi (1 PDF terkirim)');
r = ADM('vtNilai', { data: { id: 'TSPM' } }); ok(r.ok || !/Mode manual/.test(r.error), 'Joko: mesin verifikasi berjalan (tidak ditolak mode manual)' + (r.ok ? '' : ' — ' + r.error));

console.log('4. AI tidak memisahkan bundel menurut judul');
const folderId = K.folderProyek_(P).getId();
C.__files['BUN-J'] = { nama: 'Bundel tagihan.pdf', data: 'FILE:BUN-J', induk: folderId, diubah: 5 }; C.__ekstrak['BUN-J'] = [{ jenis: 'KWITANSI', halamanMulai: 1, halamanAkhir: 1 }];
const h1 = C.__http.length;
r = ADM('vtBundel', { data: { id: 'TSPM', file: { id: 'BUN-J', idServer: 'BUN-J', nama: 'Bundel tagihan.pdf', lokasi: 'server' } } }); assert.ok(r.ok, r.error);
ok(r.provider === 'manual' && r.segmen.length === 0 && C.__http.length === h1, 'Joko unggah bundel: tersimpan untuk pemetaan manual, 0 panggilan AI');
r = ADM('vtEkstrak', { data: { id: 'TSPM', k: 'BUNDEL:0' } }); ok(r.ok && r.manual && C.__http.length === h1, 'bagian bundel tidak dikirim ke AI untuk dipisah');

console.log('5. Daftar akun AI dapat diganti lewat Script Property AI_AKUN');
vm.runInContext("PropertiesService.getScriptProperties().setProperty('AI_AKUN', JSON.stringify(['  staf   PENGADAAN ']))", C);
ok(STF('aiInfo').aksesAI === true && ADM('aiInfo').aksesAI === false, 'AI_AKUN = ["Staf Pengadaan"] (tidak peka huruf besar/spasi) → hanya Staf');
vm.runInContext("PropertiesService.getScriptProperties().deleteProperty('AI_AKUN')", C);
ok(ADM('aiInfo').aksesAI === true && STF('aiInfo').aksesAI === false, 'tanpa AI_AKUN → bawaan Joko Supriyono');
console.log('\nLULUS ' + lulus + ' cek AI khusus Joko (1.10.3)');
