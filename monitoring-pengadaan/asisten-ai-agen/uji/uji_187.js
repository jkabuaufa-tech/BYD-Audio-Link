// Uji modul 1.8.7: gudangBacaHal — data gudang dibaca per halaman (respons kecil), hasil gabungan identik dengan gudangBaca, baca saja.
// Kernel Code.gs ASLI (KODE_GS) + modul 1.8.6 → 1.8.7 lewat jalur unggah/terbit resmi. Data gudang besar diisi lewat impor migrasi resmi.
const { buatKonteks } = require('./harness.js'); const fs = require('fs'), assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const R = __dirname + '/..', baca = n => JSON.parse(fs.readFileSync(R + '/' + n, 'utf8'));
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Gudang', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]); K.tulisProyek_([K.PROYEK_AWAL]);
const post = (nama, pin, a, e) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, e || {})) } }));
const ADM = (a, e) => post('Joko Supriyono', '1234', a, e), STF = (a, e) => post('Staf Gudang', '1111', a, e);
assert.ok(ADM('modulUnggah', { data: baca('server-modul-1.8.6.json') }).ok); assert.ok(ADM('modulTerbit', { versi: '1.8.6', konfirmasi: 'LULUS UJI', catatanUji: 'uji gudang bertahap' }).ok);
// data gudang besar: 2.400 GR + 1.600 GI (impor migrasi resmi, 2 kali)
const mats = Array.from({ length: 40 }, (_, i) => ['10' + String(i).padStart(8, '0'), 'Material uji ' + i + ' — keterangan panjang agar respons besar', 'BH']);
let nM = 0, nK = 0;
for (let b = 0; b < 2; b++) {
  const masuk = [], keluar = [];
  for (let i = 0; i < 1200; i++) { const m = mats[i % 40]; masuk.push({ id: 'GR-MIG-' + (++nM), tanggal: '2026-0' + (1 + (i % 6)) + '-0' + (1 + (i % 9)), kode: m[0], uraian: m[1], sat: m[2], qty: 100, harga: 1500, ket: 'saldo awal gudang lama baris ' + nM }); }
  for (let i = 0; i < 800; i++) { const m = mats[i % 40]; keluar.push({ id: 'GI-MIG-' + (++nK), tanggal: '2026-07-1' + (i % 9), kode: m[0], uraian: m[1], sat: m[2], qty: 5, untuk: 'Pekerjaan uji ' + i, penerima: 'Mandor ' + (i % 7) }); }
  const r = ADM('gudangImporMigrasi', { data: { format: 'monitoring-pengadaan-migrasi-gudang', proyek: P, sumber: 'uji 1.8.7', masuk, keluar } }); assert.ok(r.ok, r.error);
}
const potret = () => JSON.stringify(Object.keys(C.__sheets).sort().map(n => [n, C.__sheets[n].rows]));
const semua = (fn, jenis, batas) => { let m = 0, out = [], r, n = 0; do { r = fn('gudangBacaHal', { jenis, mulai: m, batas }); assert.ok(r.ok, r.error); out = out.concat(r.data); m = r.berikut; n++; } while (!r.selesai); return { out, n, total: r.total }; };

console.log('1. Modul 1.8.6 (sebelum): gudangBaca utuh = satu respons besar; gudangBacaHal belum ada');
const utuh = ADM('gudangBaca'); assert.ok(utuh.ok);
ok(utuh.masuk.length === 2400 && utuh.keluar.length === 1600, 'gudangBaca 1.8.6: 2.400 GR + 1.600 GI dalam SATU respons (' + Math.round(JSON.stringify(utuh).length / 1024) + ' KB)');
let r = ADM('gudangBacaHal', { jenis: 'masuk', mulai: 0, batas: 250 });
ok(!r.ok && /tidak dikenal/.test(r.error), '1.8.6: gudangBacaHal → "Aksi tidak dikenal" (aplikasi 2.5.9 lalu memakai gudangBaca lama)');

console.log('2. Pasang modul 1.8.7');
r = ADM('modulUnggah', { data: baca('server-modul-1.8.7.json') }); assert.ok(r.ok, r.error);
r = ADM('modulTerbit', { versi: '1.8.7', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis modul 1.8.7' }); ok(r.ok && ADM('aiInfo').versiAI === '1.8.7', 'kernel menerima & menerbitkan modul 1.8.7');
const ping = JSON.parse(C.doGet({ parameter: { action: 'ping' } }));
ok(ping.fitur.indexOf('gudangHalaman') >= 0 && ping.fitur.indexOf('bacaTahanPotong') >= 0, 'ping mengumumkan fitur gudangHalaman (fitur lama tetap)');
ok(C.aksiBaca_('gudangBacaHal') && C.aksiBaca_('gudangBaca'), 'gudangBacaHal = aksi BACA (tanpa kunci tulis); gudangBaca tetap ada');

console.log('3. Per halaman: kecil, lengkap, urutan sama');
const sebelum = potret();
const hm = semua(STF, 'masuk', 250), hk = semua(STF, 'keluar', 250);
const satu = STF('gudangBacaHal', { jenis: 'masuk', mulai: 0, batas: 250 });
ok(hm.n === 10 && hk.n === 7 && satu.data.length === 250 && satu.total === 2400 && satu.berikut === 250 && !satu.selesai, 'GR 2.400 → 10 halaman, GI 1.600 → 7 halaman @250 (halaman ' + Math.round(JSON.stringify(satu).length / 1024) + ' KB vs utuh ' + Math.round(JSON.stringify(utuh).length / 1024) + ' KB)');
const utuh2 = STF('gudangBaca');
ok(JSON.stringify(hm.out) === JSON.stringify(utuh2.masuk) && JSON.stringify(hk.out) === JSON.stringify(utuh2.keluar), 'gabungan semua halaman IDENTIK dengan gudangBaca (isi & urutan GR dan GI)');
ok(semua(STF, 'masuk', 25).out.length === 2400 && semua(STF, 'masuk', 999).out.length === 2400, 'ukuran halaman diperkecil (25) / diperbesar (999) → tetap 2.400 GR, tanpa ganda/hilang');
r = STF('gudangBacaHal', { jenis: 'masuk', mulai: 0, batas: 50000 }); ok(r.data.length === 1000 && r.berikut === 1000, 'batas maksimum 1.000 baris per halaman (permintaan 50.000 dibatasi)');
r = STF('gudangBacaHal', { jenis: 'keluar', mulai: 9999 }); ok(r.ok && !r.data.length && r.selesai && r.total === 1600, 'mulai melewati akhir → halaman kosong, selesai');
r = STF('gudangBacaHal', { jenis: 'semua' }); ok(!r.ok && /Jenis transaksi gudang/.test(r.error), 'jenis tidak sah ditolak dengan pesan jelas');
ok(potret() === sebelum, 'seluruh sheet (gudang, log, register, …) TIDAK berubah oleh pembacaan per halaman');

console.log('4. Baris kosong / rusak dilewati sama seperti gudangBaca');
const sh = C.__sheets[P + '_GudangMasuk'] || Object.values(C.__sheets).find(s => /GudangMasuk|Gudang_Masuk|GR/.test(s.nama));
assert.ok(sh, 'sheet gudang masuk'); const simpan = sh.rows[5].slice(); sh.rows[5][sh.rows[5].length - 1] = '';
const z = semua(STF, 'masuk', 300).out, zu = STF('gudangBaca').masuk; sh.rows[5] = simpan;
ok(z.length === 2399 && JSON.stringify(z) === JSON.stringify(zu), 'baris tanpa DATA dilewati — hasil tetap identik dengan gudangBaca');
console.log('\nLULUS ' + lulus + ' cek');
