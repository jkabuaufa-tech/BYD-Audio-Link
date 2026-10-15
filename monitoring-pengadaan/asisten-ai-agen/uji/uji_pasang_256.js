// Uji 2.5.6: pemasangan & rollback lewat mekanisme pembaruan kernel ASLI (Code.gs) + modul 1.8.4 ASLI — membuktikan data tidak tersentuh.
// Data contoh: register, tagihan + checklist ber-PDF, gudang (impor migrasi resmi), log. Snapshot seluruh sheet & berkas Drive sebelum/sesudah.
const { buatKonteks } = require('./harness.js'); const fs = require('fs'), assert = require('assert'), crypto = require('crypto');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const R = __dirname + '/..', baca = n => JSON.parse(fs.readFileSync(R + '/' + n, 'utf8'));
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]); K.tulisProyek_([K.PROYEK_AWAL]);
const post = (nama, pin, a, e) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action: a, nama, pin, proyek: P }, e || {})) } }));
const ADM = (a, e) => post('Joko Supriyono', '1234', a, e), STF = (a, e) => post('Staf Pengadaan', '1111', a, e);
assert.ok(ADM('modulUnggah', { data: baca('server-modul-1.8.4.json') }).ok); assert.ok(ADM('modulTerbit', { versi: '1.8.4', konfirmasi: 'LULUS UJI', catatanUji: 'uji pemasangan 2.5.6' }).ok);
// Drive tiruan menyimpan isi biner & jenis berkas (dipakai aksi unggah foto/PDF asli kernel & modul)
C.Utilities.base64Decode = x => [...Buffer.from(String(x), 'base64')].map(v => v > 127 ? v - 256 : v);
const nb = C.Utilities.newBlob; C.Utilities.newBlob = (v, tipe, nama) => Array.isArray(v) ? { bytes: v, tipe, nama, getBytes: () => v } : nb(v);
const fo = C.DriveApp.getFolderById(K.folderProyek_(P).getId()); let nD = 0;
fo.createFile = blob => { const id = 'DRV' + (++nD); C.__files[id] = { nama: blob.nama, data: Buffer.from(blob.bytes.map(v => v & 255)).toString('latin1'), biner: true, induk: fo.getId(), tipe: blob.tipe, diubah: Date.now() };
  return { getId: () => id, getName: () => blob.nama, getUrl: () => 'drive://' + id, setDescription() { } }; };
const gf = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { const f = gf(id), t = C.__files[id] && C.__files[id].tipe; if (t) f.getMimeType = () => t; return f; };
// ---------- data operasional contoh ----------
const NO = '001/SPSA/WK/DIV.II/INF1/1425011/2025', fid = K.folderProyek_(P).getId();
K.tulisKoleksi_(P, 'data', [{ id: 'R1', noKontrak: NO, namaVendor: 'CV Gema Multi Kencana', tglKontrak: '2025-06-23', nilai: 151300000 }]);
K.tulisKoleksi_(P, 'progres', [{ id: 'TB1', versi: 4, noKontrak: NO, tagihanKe: 1, nomorBA: '01/BAP/001/SPSA', nilai: 118500000, baTerbit: true, bayar: { status: 'DIAJUKAN', noAju: 'AJU-7' } }]);
C.__files['PDF-KWT'] = { nama: 'CHECKLIST · Kwitansi.pdf', data: '%PDF-1.4 kwitansi', induk: fid, diubah: 1 };
K.cl217SimpanBaris_(P, { id: 'TB1', noKontrak: NO, kategori: 'ALAT', versi: 7, items: { UMUM_03: { status: 'ADA', file: { id: 'PDF-KWT', idServer: 'PDF-KWT', nama: 'Kwitansi.pdf', lokasi: 'server' }, tgl: '2025-07-02', ket: 'asli diperiksa' } }, verified: true, diubahOleh: 'Staf', diubahPada: '2025-07-03' }, 0);
const mig = { format: 'monitoring-pengadaan-migrasi-gudang', proyek: P, sumber: 'uji 2.5.6', masuk: [{ id: 'GR-MIG-1', tanggal: '2026-06-10', kode: '1000234561', uraian: 'Semen PCC 50 kg', sat: 'ZAK', qty: 100, ket: 'saldo awal gudang lama' }, { id: 'GR-MIG-2', tanggal: '2026-07-03', kode: '1000234561', uraian: 'Semen PCC 50 kg', sat: 'ZAK', qty: 50 }],
  keluar: [{ id: 'GI-MIG-1', tanggal: '2026-06-20', kode: '1000234561', uraian: 'Semen PCC 50 kg', sat: 'ZAK', qty: 40, untuk: 'Direksi Keet', penerima: 'Mandor A' }] };
let r = ADM('gudangImporMigrasi', { data: mig }); assert.ok(r.ok, r.error);
const potret = () => { const o = {}; Object.keys(C.__sheets).sort().forEach(n => { o[n] = JSON.stringify(C.__sheets[n].rows); }); return o; };
const berkas = () => JSON.stringify(Object.keys(C.__files).sort().map(k => [k, crypto.createHash('sha256').update(C.__files[k].data).digest('hex')]));
const gudangSebelum = ADM('gudangBaca').masuk.concat(ADM('gudangBaca').keluar);
// ---------- 1. paket ----------
console.log('1. Paket 2.5.6 diterima kernel & tidak menambah aksi server baru');
const p255 = baca('pembaruan-2.5.5.json'), p256 = baca('pembaruan-2.5.6.json');
const aksi = js => new Set([...js.matchAll(/regAksi\(\s*'([A-Za-z]+)'/g)].map(m => m[1]));
const a5 = aksi(p255.js), a6 = aksi(p256.js), baru = [...a6].filter(x => !a5.has(x));
ok(baru.length === 0 && a6.has('gudangKeluarSimpan') && a6.has('manifestBaca'), 'aksi server yang dipakai 2.5.6 ⊆ 2.5.5 (tidak ada aksi baru; manifestBaca & gudangKeluarSimpan sudah ada) — modul server tetap 1.8.4');
ok(p256.js.indexOf('MP218_ADMIN_FIRST_MARKER') >= 0 && p256.untukDasar === p255.untukDasar && p256.format === p255.format, 'format JSON, untukDasar & penanda kumulatif Admin-first sama');
ok(p256.js.length > p255.js.length && ['MP219_FINANCE', 'MP223 — PEMBARUAN', 'MP230 — PEMBARUAN', 'MP241 — PEMBARUAN', 'MP250 — PEMBARUAN', 'MP227 — PEMBARUAN', 'MP224 — PEMBARUAN', 'MP220 — PEMBARUAN'].every(b => p256.js.indexOf(b) >= 0), 'seluruh blok kumulatif tetap ada (MP219/220/223/224/227/230/241/250)');
const awal = potret(), awalBerkas = berkas();
// ---------- 2. pasang 2.5.5 (versi terpasang pengguna) lalu 2.5.6 ----------
console.log('2. Pasang 2.5.5 → 2.5.6 lewat kandidat Admin → terbitkan');
assert.ok(ADM('unggahKandidatPembaruan', { data: p255 }).ok); assert.ok(ADM('terbitkanKandidatPembaruan', { versi: '2.5.5', konfirmasi: 'LULUS UJI', catatanUji: 'versi terpasang' }).ok);
r = STF('unggahKandidatPembaruan', { data: p256 }); ok(!r.ok && /Khusus Admin/.test(r.error), 'staf non-Admin tidak dapat mengunggah pembaruan (hak akses tetap)');
r = ADM('unggahKandidatPembaruan', { data: p256 }); ok(r.ok && r.kandidat.versi === '2.5.6', 'kandidat 2.5.6 tersimpan (belum tayang ke staf)');
r = ADM('terbitkanKandidatPembaruan', { versi: '2.5.6', konfirmasi: 'LULUS UJI', catatanUji: 'uji kompatibilitas 2.5.6' }); ok(r.ok && r.aktif.versi === '2.5.6', 'terbit: versi aktif 2.5.6');
const ubah = (a, b) => Object.keys(Object.assign({}, a, b)).filter(n => a[n] !== b[n]);
let beda = ubah(awal, potret());
ok(beda.every(n => /_?Log$|^Log/.test(n)) && berkas() === awalBerkas, 'pemasangan: semua sheet data identik (hanya Log bertambah: ' + (beda.join(', ') || '-') + '); berkas Drive data identik');
const logA = JSON.parse(awal[beda[0]] || '[]'), logB = C.__sheets[beda[0]] ? C.__sheets[beda[0]].rows : [];
ok(!beda.length || JSON.stringify(logB.slice(0, logA.length)) === JSON.stringify(logA), 'Log hanya ditambah di akhir (baris lama tidak berubah)');
// ---------- 3. transaksi setelah pembaruan ----------
console.log('3. Transaksi baru setelah 2.5.6 (ket GI tersimpan) lalu rollback');
const foto = STF('gudangUnggahFoto', { berkas: { id: 'f1', data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64'), nama: 'serah.jpg', jenis: 'FOTO-GI', ket: 'uji' } });
r = foto.ok ? STF('gudangKeluarSimpan', { data: { kunci: '1000234561', tanggal: '2026-07-04', qty: 12, untuk: 'Pile Cap P3', penerima: 'Mandor B', ket: 'Pengecoran pile cap P3', foto: foto.data } }) : foto;
ok(r.ok && r.data.ket === 'Pengecoran pile cap P3' && ADM('gudangBaca').keluar.some(x => x.id === r.data.id && x.ket === 'Pengecoran pile cap P3'), 'gudangKeluarSimpan menyimpan ket (server 1.8.4 tanpa perubahan)');
const idBaru = r.data.id, sesudahTransaksi = potret();
r = ADM('rollbackPembaruan', { versiSekarang: '2.5.6', konfirmasi: 'KEMBALIKAN' }); ok(r.ok && r.aktif.versi === '2.5.5', 'rollback kode: versi aktif kembali 2.5.5');
beda = ubah(sesudahTransaksi, potret());
ok(beda.every(n => /Log$/.test(n)) && ADM('gudangBaca').keluar.some(x => x.id === idBaru && x.ket === 'Pengecoran pile cap P3'), 'rollback TIDAK memulihkan snapshot data: transaksi setelah pembaruan tetap ada (ket utuh)');
ok(JSON.stringify(ADM('gudangBaca').masuk.concat(ADM('gudangBaca').keluar).filter(x => x.id !== idBaru)) === JSON.stringify(gudangSebelum), 'transaksi gudang historis (ID, tanggal, qty, ket) identik');
const cl = ADM('checklistBaca', { id: 'TB1' }).data;
ok(cl.verified === true && cl.items.UMUM_03.file.idServer === 'PDF-KWT' && cl.versi === 7 && ADM('ambilBerkas', { id: 'PDF-KWT' }).ok, 'checklist lama: status verifikasi, versi, referensi PDF tetap & PDF dapat dibuka');
ok(K.bacaKoleksi_(P, 'progres')[0].bayar.status === 'DIAJUKAN', 'status pembayaran tidak berubah');
r = ADM('unggahKandidatPembaruan', { data: p256 }); ok(r.ok, 'setelah rollback, 2.5.6 dapat diunggah ulang sebagai kandidat (pasang ulang)');
console.log('\nLULUS ' + lulus + ' cek');
