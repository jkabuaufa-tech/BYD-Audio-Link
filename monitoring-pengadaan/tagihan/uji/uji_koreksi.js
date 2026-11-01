// Uji modul server 1.10.5 — koreksiBK (kasus tiruan Farika: BAPM 02 hanya item Bottom Pile, seharusnya + SPP Ø702 & Cat Coating).
//   KODE_GS=/tmp/Code.gs node tagihan/uji/uji_koreksi.js
const assert = require('assert'), fs = require('fs');
const R = __dirname + '/../../asisten-ai-agen';
const { buatKonteks } = require(R + '/uji/harness.js');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const galat = (r, re, m) => { assert.ok(r && r.ok === false && re.test(r.error), m + ' — dapat: ' + JSON.stringify(r && (r.error || r)).slice(0, 220)); lulus++; console.log('  ✓ ' + m); };
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
require('./drive_biner.js')(C, K, P);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const kirim = (nama, pin) => (action, x) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek: P }, x || {})) } }));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111'), LHT = kirim('Kepala Proyek', '0000');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.5.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji koreksi tagihan 1.10.5' }).ok);
const sheet = s => C.__sheets[P + s];

console.log('Persiapan: SPPM Farika (8 item), BK1 & BK2 terbit, paket BK2');
const NO = '005/SPPM/WK-NK.KSO/PDBJ/1726012/2026';
const IT = [['Pipa Baja SPSP dia 1524 t=19mm Grd 3', 4696603, 'KG', 12900], ['Clutch/Interlock System SPSP dia 1524', 4440, 'M', 1900000], ['Cat Coating Pipa 300 Micron Jotun', 2125.78, 'M2', 370000],
  ['Pipa Baja SPSP dia 1524 t=14mm Grd 3', 159531.1, 'KG', 12900], ['Clutch/Interlock System SPSP dia 1524', 272, 'M', 1900000], ['Pipa Baja SPP dia 702 mm t = 19mm', 161936, 'KG', 12550], ['Cat Coating Pipa 300 Micron Jotun', 48.52, 'M2', 370000], ['Bottom Pile - Penebalan ASTM A 252 14mm', 12, 'PC', 4250000]]
  .map(x => ({ kode: '30000001', uraian: x[0], vol: x[1], sat: x[2], harga: x[3] }));
const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPPM', namaVendor: 'Farika Steel, PT', idVendor: '2100001234', tglKontrak: '2026-05-01', tglSelesai: '2026-12-31', noPO: '4100099000', items: IT } });
assert.ok(sv.ok, sv.error); assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
const id = i => NO + '#' + i;
const v1 = { [id(0)]: 469629.9, [id(1)]: 468.3, [id(2)]: 254.86, [id(3)]: 15952.09, [id(4)]: 27.4, [id(5)]: 20608.64, [id(6)]: 7.28, [id(7)]: 1.2 };
const nilaiDari = it => Object.keys(it).reduce((a, k) => a + it[k] * IT[Number(k.split('#')[1])].harga, 0);
let bk1 = STF('saveProgres', { data: { noKontrak: NO, periode: 'Juli 2026', periodeKey: 202607, tanggal: '2026-07-10', tagihanKe: 1, kodeBAPM: 'BAPM', kodeBA: 'BAPM', items: v1, nilai: nilaiDari(v1) } }).data;
let bk2 = STF('saveProgres', { data: { noKontrak: NO, periode: 'Juli 2026', periodeKey: 202607, tanggal: '2026-07-17', tagihanKe: 2, kodeBA: 'BAPM', items: { [id(7)]: 10.8 }, nilai: 45900000 } }).data;
bk1 = STF('saveProgres', { data: { id: bk1.id, versi: bk1.versi, terbit: true } }).data; bk2 = STF('saveProgres', { data: { id: bk2.id, versi: bk2.versi, terbit: true } }).data;
assert.ok(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: { kategori: 'BAHAN', uangMukaPersen: 0, retensiPersen: 0, ppn: { skema: 'NILAI_LAIN', tarif: 12 }, pph: { jenis: 'PPh 22', tarif: 1.5 } } } }).ok);
let pk2 = STF('blSimpan', { data: { noKontrak: NO, progresId: bk2.id, jenis: 'PROGRES', sumber: { items: [] }, vendor: { ttdNama: 'Kasim' } } }); assert.ok(pk2.ok, pk2.error); pk2 = pk2.data;
ok(pk2.hasil.prestasi.ini === 45900000, 'kondisi awal: paket BAPM 02 prestasi Rp 45.900.000 (salah input)');
galat(STF('saveProgres', { data: { id: bk2.id, versi: bk2.versi, items: { [id(7)]: 10.8, [id(5)]: 185477.8 }, alasan: 'x' } }), /sudah terbit/, 'kernel: revisi biasa BA terbit ditolak (alasan fitur koreksi)');

console.log('Validasi & hak akses koreksiBK');
const benar = { [id(5)]: 185477.8, [id(6)]: 65.54, [id(7)]: 10.8 };
const dasar = { id: bk2.id, versi: bk2.versi, items: benar, nilai: 1, alasan: 'BAPM 02 fisik: SPP Ø702 185.477,80 kg & cat coating 65,54 m2 belum diinput', acuan: 'BAPM 02 TTD 17/07/2026' };
galat(LHT('koreksiBK', { data: dasar }), /Pengadaan/, 'akun Lihat ditolak');
galat(STF('koreksiBK', { data: Object.assign({}, dasar, { alasan: 'salah' }) }), /min\. 15/, 'alasan < 15 karakter ditolak');
galat(STF('koreksiBK', { data: Object.assign({}, dasar, { acuan: '' }) }), /acuan wajib/, 'dokumen acuan wajib');
galat(STF('koreksiBK', { data: Object.assign({}, dasar, { versi: 1 }) }), /KONFLIK/, 'versi lama → KONFLIK');
galat(STF('koreksiBK', { data: Object.assign({}, dasar, { items: { [id(5)]: -1 } }) }), /tidak valid/, 'volume negatif ditolak');
galat(STF('koreksiBK', { data: Object.assign({}, dasar, { items: { 'X#9': 1 } }) }), /tidak ada di Register/, 'item di luar kontrak ditolak');
galat(STF('koreksiBK', { data: dasar }), /melebihi volume kontrak.*addendum/i, 's/d SPP Ø702 (206.086,44) > kontrak (161.936) → wajib addendum');
galat(STF('koreksiBK', { data: { id: bk1.id, versi: bk1.versi, items: v1, nilai: 1, alasan: 'koreksi BK pertama untuk uji hak akses', acuan: 'BAPM 01' } }), /BK sesudahnya.*Admin/, 'BK lama (ada BK sesudahnya) hanya Admin');

console.log('Koreksi BAPM 02 + addendum volume kontrak di Register (satu transaksi)');
galat(STF('koreksiBK', { data: Object.assign({}, dasar, { volKontrak: { [id(5)]: 206086.44 } }) }), /wajib nomor addendum/, 'ubah volume kontrak tanpa nomor addendum ditolak');
const k1 = 'kr-uji-0001';
const r = STF('koreksiBK', { data: Object.assign({}, dasar, { noAddendum: 'ADD-01/SPPM/005/2026', kunciIdem: k1, volKontrak: { [id(5)]: 206086.44, [id(6)]: 72.82 } }) });
const regB = K.bacaKoleksi_(P, 'data').find(x => x.noKontrak === NO);
ok(r.ok && regB.items[5].vol === 206086.44 && regB.items[6].vol === 72.82 && regB.versi === sv.data.versi + 2 && r.koreksi.addendum.length === 2, 'Register: volume SPP Ø702 → 206.086,44 kg & cat coating → 72,82 m² (addendum ADD-01), nilai kontrak dihitung ulang');
ok(r.ok && r.data.nilai === 2397896190, 'nilai BK dihitung server dari harga Register: Rp ' + (r.data && r.data.nilai).toLocaleString('id-ID') + ' (nilai dari perangkat diabaikan)');
ok(r.data.nomorBA === bk2.nomorBA && r.data.baTerbit === bk2.baTerbit && r.data.revisi === 1 && /^KOREKSI 1:/.test(r.data.alasan), 'nomor BA tetap, BA tetap terbit, revisi 1, alasan tercatat');
ok(r.data.koreksi.length === 1 && r.data.koreksi[0].ubah.length === 2 && r.data.koreksi[0].nilaiSebelum === 45900000, 'riwayat koreksi di BK: 2 item berubah, nilai sebelum 45.900.000');
ok(r.paket && r.paket.hasil.prestasi.ini === 2397896190 && r.paket.versi === pk2.versi + 1 && !r.paket.hasil.temuan.some(t => t.tingkat === 'GALAT'), 'paket BAPM 02 dihitung ulang: prestasi Rp 2.397.896.190, tanpa GALAT (volume kontrak sudah addendum)');
const sh = sheet('_KoreksiTagihan'); ok(sh && sh.rows.length === 2 && sh.rows[1][4] === bk2.nomorBA && sh.rows[1][8] === 2397896190 - 45900000 && /ADD-01/.test(sh.rows[1][12]), 'jejak audit _KoreksiTagihan: selisih Rp 2.351.996.190, addendum tercatat');
const ul = STF('koreksiBK', { data: Object.assign({}, dasar, { versi: bk2.versi, noAddendum: 'ADD-01/SPPM/005/2026', kunciIdem: k1, volKontrak: { [id(5)]: 206086.44, [id(6)]: 72.82 } }) });
ok(ul.ok && ul.sudahAda && sheet('_KoreksiTagihan').rows.length === 2, 'kirim ulang (kunci idempotensi sama) → tidak tercatat dua kali');
const baca = LHT('koreksiBaca', { data: { progresId: bk2.id } }); ok(baca.ok && baca.data.length === 1 && baca.data[0].ubah.length === 2, 'koreksiBaca: riwayat dapat dibaca akun Lihat');

console.log('Status paket & bayar');
let s1 = STF('blStatus', { data: { id: pk2.id, versi: r.paket.versi, ke: 'DALAM PENYUSUNAN' } }); s1 = STF('blStatus', { data: { id: pk2.id, versi: s1.data.versi, ke: 'MENUNGGU DOKUMEN' } });
assert.ok(s1.ok, s1.error);
let cur = K.bacaKoleksi_(P, 'progres').find(x => x.id === bk2.id);
const r2 = STF('koreksiBK', { data: { id: bk2.id, versi: cur.versi, items: Object.assign({}, benar, { [id(6)]: 65.5 }), nilai: 1, alasan: 'koreksi kedua: cat coating 65,50 m2 sesuai berita acara', acuan: 'BAPM 02 rev', noAddendum: 'ADD-01/SPPM/005/2026' } });
ok(r2.ok && r2.data.revisi === 2 && r2.paket && r2.paket.status === 'DALAM PENYUSUNAN', 'koreksi kedua saat paket MENUNGGU DOKUMEN: paket kembali ke Dalam Penyusunan, revisi BK 2');
// bayar diajukan → ditolak
cur = K.bacaKoleksi_(P, 'progres'); cur.find(x => x.id === bk2.id).bayar = { status: 'DIAJUKAN' }; K.tulisKoleksi_(P, 'progres', cur); cur = cur.find(x => x.id === bk2.id);
galat(STF('koreksiBK', { data: { id: bk2.id, versi: cur.versi, items: benar, nilai: 1, alasan: 'uji status bayar diajukan harus ditolak', acuan: 'uji', noAddendum: 'ADD-01' } }), /DIAJUKAN/, 'tagihan DIAJUKAN di Keuangan & Bayar → ditolak');
cur = K.bacaKoleksi_(P, 'progres'); cur.find(x => x.id === bk2.id).bayar = { status: 'DIBAYAR' }; K.tulisKoleksi_(P, 'progres', cur);
galat(STF('koreksiBK', { data: { id: bk2.id, versi: cur.find(x => x.id === bk2.id).versi, items: benar, nilai: 1, alasan: 'uji status bayar dibayar harus ditolak', acuan: 'uji', noAddendum: 'ADD-01' } }), /DIBAYAR.*BA koreksi/, 'tagihan DIBAYAR → ditolak, diarahkan ke BA koreksi termin berikutnya');
cur = K.bacaKoleksi_(P, 'progres'); cur.find(x => x.id === bk2.id).bayar = { status: 'BELUM' }; K.tulisKoleksi_(P, 'progres', cur);

console.log('Admin: koreksi BK lama (BAPM 01)');
cur = K.bacaKoleksi_(P, 'progres').find(x => x.id === bk1.id);
const r3 = ADM('koreksiBK', { data: { id: bk1.id, versi: cur.versi, items: Object.assign({}, v1, { [id(1)]: 444 }), nilai: 1, alasan: 'clutch sistem BAPM 01 sesuai dokumen 444 m (bukan 468,30)', acuan: 'BAPM 01 TTD' } });
ok(r3.ok && r3.koreksi.bkSesudah.indexOf(bk2.nomorBA) >= 0 && r3.paket === null, 'Admin dapat mengoreksi BAPM 01; BK sesudahnya dicatat terdampak (' + r3.koreksi.bkSesudah.join(', ') + ')');
ok(JSON.stringify(K.bacaKoleksi_(P, 'progres').find(x => x.id === bk2.id).items) !== '{}' && sheet('_KoreksiTagihan').rows.length === 4, 'jejak audit 3 koreksi');
console.log('\n' + lulus + ' cek lulus — koreksi tagihan 1.10.5');
