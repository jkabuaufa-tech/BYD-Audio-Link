// Uji modul server 1.10.6 — foto penerimaan per material · tanggal BAPM/BAP terpisah · sinkron tanggal GR otomatis & Kartu Gudang · validasi masa kontrak.
//   KODE_GS=/tmp/Code.gs node tagihan/uji/uji_gudang_2100.js
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const R = __dirname + '/../../asisten-ai-agen';
const { buatKonteks } = require(R + '/uji/harness.js');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const galat = (r, re, m) => { assert.ok(r && r.ok === false && re.test(r.error), m + ' — dapat: ' + JSON.stringify(r && (r.error || r)).slice(0, 240)); lulus++; console.log('  ✓ ' + m); };
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
require('./drive_biner.js')(C, K, P);
const gf = C.DriveApp.getFileById; C.DriveApp.getFileById = id => { const f = gf(id), b = C.__files[id]; if (b && /\.(jpg|png)$/i.test(b.nama || '')) f.getMimeType = () => 'image/jpeg'; return f; };   // harness: tipe foto
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const kirim = (nama, pin) => (action, x) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek: P }, x || {})) } }));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.6.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji gudang & tanggal 1.10.6' }).ok);
const JPG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xFF, 0xD9]).toString('base64');
const foto = (ket) => { const r = STF('gudangUnggahFoto', { berkas: { id: 'f' + Math.random(), data: JPG, nama: ket + '.jpg', jenis: 'FOTO-GR', ket } }); assert.ok(r.ok, r.error); return r.data; };

console.log('Persiapan: Bon, SPM (masa berlaku s.d. 30-11-2026), BK tanggal opname 01-10-2026');
K.tulisKoleksi_(P, 'permintaan', [{ id: 'B1', nomor: 'BON-01', tanggal: '2026-09-01', departemen: 'Gudang', items: [{ kode: 'M1', uraian: 'Besi D13', vol: 100, sat: 'btg', harga: 90000 }, { kode: 'M2', uraian: 'Semen', vol: 50, sat: 'zak', harga: 60000 }] }]);
const NO = '047/SPM/WK-NK.KSO/PDBJ/1726012/2026';
const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPM', namaVendor: 'PT Surya Salim', idVendor: '2100008888', tglKontrak: '2026-09-01', tglSelesai: '2026-11-30', noPO: '4100001111', items: [{ kode: 'M1', uraian: 'Besi D13', vol: 100, sat: 'btg', harga: 90000, noPermintaan: 'BON-01' }, { kode: 'M2', uraian: 'Semen', vol: 50, sat: 'zak', harga: 60000, noPermintaan: 'BON-01' }] } });
assert.ok(sv.ok, sv.error); assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
let bk = STF('saveProgres', { data: { noKontrak: NO, periode: 'Oktober 2026', periodeKey: 202610, tanggal: '2026-10-01', tagihanKe: 1, kodeBA: 'BAPM', items: { [NO + '#0']: 40, [NO + '#1']: 20 }, nilai: 40 * 90000 + 20 * 60000 } }).data;
const oto = STF('gudangOtomatisProgres', { data: { progresId: bk.id, baris: [{ bonNomor: 'BON-01', bonIdx: 0, kode: 'M1', sd: 40 }, { bonNomor: 'BON-01', bonIdx: 1, kode: 'M2', sd: 20 }] } });
ok(oto.ok && oto.data.length === 2 && oto.data.every(r => r.tanggal === '2026-10-01'), 'kondisi lama: GR otomatis bertanggal BK/opname 01-10-2026 (bug "tanggal 1")');

console.log('Tanggal BAPM & BAP terpisah + validasi masa berlaku kontrak');
galat(STF('bkTanggal', { data: { id: bk.id, tanggalBA: '2026-12-04' } }), /melewati masa berlaku kontrak \(2026-11-30, Register Kontrak\)/, 'Tanggal BAPM > akhir kontrak ditolak');
galat(STF('bkTanggal', { data: { id: bk.id, tanggalBA: '2026-10-04', tanggalBAP: '2026-12-01' } }), /Tanggal BAP.*melewati masa berlaku/, 'Tanggal BAP > akhir kontrak ditolak');
galat(STF('bkTanggal', { data: { id: bk.id, tanggalBA: '2026-08-04' } }), /lebih awal dari tanggal kontrak/, 'Tanggal BAPM < tanggal kontrak ditolak');
let t = STF('bkTanggal', { data: { id: bk.id, tanggalBA: '2026-10-04', tanggalBAP: '2026-10-10' } });
ok(t.ok && t.data.tanggalBA === '2026-10-04' && t.data.tanggalBAP === '2026-10-10' && t.data.tanggal === '2026-10-01', 'BK: tanggal BAPM 04-10 & BAP 10-10 tersimpan terpisah (tanggal opname tetap)');
const masuk = () => C.__sheets[P + '_GudangMasuk'].rows.slice(1).map(r => JSON.parse(r[r.length - 1]));
ok(t.gudang.n === 2 && masuk().filter(r => r.refProgres === bk.id).every(r => r.tanggal === '2026-10-04' && r.tanggalAwal === '2026-10-01' && /BAPM/.test(r.tanggalSumber)), 'GR otomatis & Kartu Gudang disinkronkan ke tanggal BAPM 04-10-2026 (tanggal awal tercatat)');
ok(C.__sheets[P + '_GudangMasuk'].rows.slice(1).every(r => String(r[1]).replace(/^'/, '') === '2026-10-04'), 'kolom Tanggal sheet GudangMasuk ikut 04-10-2026');

console.log('Saldo Kartu Gudang dijaga');
bk = t.data;
K.tulisKoleksi_(P, 'progres', K.bacaKoleksi_(P, 'progres'));
const kel = STF('gudangKeluarSimpan', { data: { tanggal: '2026-10-05', kunci: 'M1', qty: 30, untuk: 'Pengecoran', penerima: 'Mandor', foto: foto('serah-terima') } });
assert.ok(kel.ok, kel.error);
galat(STF('bkTanggal', { data: { id: bk.id, tanggalBA: '2026-10-06' } }), /saldo Kartu Gudang .*minus/, 'tanggal BAPM yang membuat saldo minus (barang keluar 05-10 sebelum diterima 06-10) ditolak');
ok(K.bacaKoleksi_(P, 'progres').find(x => x.id === bk.id).tanggalBA === '2026-10-04', 'penolakan atomik: tanggal BAPM di BK tidak berubah');

console.log('Paket tagihan membawa tanggal BAPM & BAP');
assert.ok(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: { kategori: 'BAHAN', ppn: { skema: 'NILAI_LAIN', tarif: 12 } } } }).ok);
const kt = STF('blKonteks', { data: { noKontrak: NO } }); ok(kt.progres[0].tanggalBA === '2026-10-04' && kt.progres[0].tanggalBAP === '2026-10-10', 'blKonteks membawa tanggal BAPM & BAP ke Paket Tagihan');
galat(STF('blSimpan', { data: { noKontrak: NO, progresId: bk.id, jenis: 'PROGRES', sumber: { items: [] }, tanggalBA: '2026-12-02', tanggalDok: '2026-10-10' } }), /melewati masa berlaku/, 'paket: tanggal BAPM > akhir kontrak ditolak');
const pk = STF('blSimpan', { data: { noKontrak: NO, progresId: bk.id, jenis: 'PROGRES', sumber: { items: [] }, tanggalBA: '2026-10-03', tanggalDok: '2026-10-12' } });
const bk2 = K.bacaKoleksi_(P, 'progres').find(x => x.id === bk.id);
ok(pk.ok && pk.data.tanggalDok === '2026-10-12' && bk2.tanggalBA === '2026-10-03' && bk2.tanggalBAP === '2026-10-12' && pk.gudang.n === 2, 'paket: tanggal BAPM 03-10 & BAP 12-10 tersimpan ke BK, GR otomatis ikut 03-10');

console.log('Foto penerimaan per material');
K.tulisKoleksi_(P, 'permintaan', K.bacaKoleksi_(P, 'permintaan').concat([{ id: 'B2', nomor: 'BON-02', tanggal: '2026-09-01', departemen: 'Gudang', items: [{ kode: 'M3', uraian: 'Pasir', vol: 10, sat: 'm3', harga: 300000 }, { kode: 'M4', uraian: 'Kerikil', vol: 10, sat: 'm3', harga: 350000 }, { kode: 'M5', uraian: 'Kawat', vol: 5, sat: 'kg', harga: 25000 }] }]));
const sj = foto('SJ-1');
const dasar = { bonNomor: 'BON-02', tanggal: '2026-10-20', noSJ: 'SJ-77', sjFile: sj, baris: [{ idx: 0, kode: 'M3', qty: 4 }, { idx: 1, kode: 'M4', qty: 3 }, { idx: 2, kode: 'M5', qty: 2 }] };
const fPasir = [foto('pasir-depan'), foto('pasir-belakang'), foto('pasir-kanan'), foto('pasir-kiri')], fKerikil = [foto('kerikil-depan'), null, null, null];
galat(STF('gudangTerimaBon', { data: Object.assign({}, dasar, { foto: [null, null, null, null], fotoItem: { 0: fPasir, 1: fKerikil } }) }), /wajib per material.*Kawat/, 'tanpa foto utama, item tanpa foto sendiri (Kawat) ditolak');
const fUtama = [foto('utama-depan'), null, null, null];
const tb = STF('gudangTerimaBon', { data: Object.assign({}, dasar, { foto: fUtama, fotoItem: { 0: fPasir, 1: fKerikil } }) });
ok(tb.ok && tb.data.length === 3, 'kiriman 3 item tersimpan');
const M2 = masuk().filter(r => r.kiriman === tb.kiriman), by = k => M2.find(r => r.kode === k);
ok(by('M3').foto.filter(Boolean).length === 4 && by('M3').foto.map(f => f.sisi).join() === 'Tampak Depan,Tampak Belakang,Samping Kanan,Samping Kiri' && by('M3').fotoWakil === false, 'Pasir: 4 foto sendiri (Depan/Belakang/Kanan/Kiri)');
ok(by('M4').foto[0].idServer === fKerikil[0].idServer && by('M4').fotoWakil === false && by('M5').fotoWakil === true && by('M5').foto[0].idServer === fUtama[0].idServer, 'Kerikil: 1 foto sendiri · Kawat: memakai foto utama (fotoWakil)');
const lama = STF('gudangTerimaBon', { data: { bonNomor: 'BON-02', tanggal: '2026-10-21', noSJ: 'SJ-78', sjFile: sj, foto: fUtama, baris: [{ idx: 0, kode: 'M3', qty: 1 }] } });
ok(lama.ok && lama.data[0].foto[0].idServer === fUtama[0].idServer, 'cara lama (foto per surat jalan) tetap berjalan');

console.log('Lengkapi foto GR otomatis per material');
let bkB = STF('saveProgres', { data: { noKontrak: NO, periode: 'Oktober 2026', periodeKey: 202610, tanggal: '2026-10-01', tagihanKe: 2, kodeBA: 'BAPM', items: { [NO + '#0']: 10 }, nilai: 900000 } }).data;
STF('bkTanggal', { data: { id: bkB.id, tanggalBA: '2026-10-25' } });
const oto2 = STF('gudangOtomatisProgres', { data: { progresId: bkB.id, baris: [{ bonNomor: 'BON-01', bonIdx: 0, kode: 'M1', sd: 50 }] } });
ok(oto2.ok && oto2.data.length === 1 && masuk().find(r => r.id === oto2.data[0].id).tanggal === '2026-10-25', 'GR otomatis baru langsung bertanggal BAPM 25-10 (bukan 01-10)');
const lf = STF('gudangLengkapiFoto', { data: { kiriman: oto2.kiriman, foto: [null, null, null, null], fotoItem: { [oto2.data[0].id]: [foto('besi-depan'), null, foto('besi-kanan'), null] } } });
ok(lf.ok && masuk().find(r => r.id === oto2.data[0].id).foto.filter(Boolean).length === 2 && !masuk().find(r => r.id === oto2.data[0].id).fotoKurang, 'lengkapi foto GR otomatis dengan foto per material (tanpa foto utama)');

console.log('Status bayar & sinkron massal');
let L = K.bacaKoleksi_(P, 'progres'); L.find(x => x.id === bk.id).bayar = { status: 'DIAJUKAN' }; K.tulisKoleksi_(P, 'progres', L);
galat(STF('bkTanggal', { data: { id: bk.id, tanggalBA: '2026-10-04' } }), /DIAJUKAN.*tidak dapat diubah/, 'tagihan diajukan: tanggal BA/BAP terkunci');
const sk = STF('gudangSinkronTanggal', { data: {} }); ok(sk.ok && Array.isArray(sk.data) && !sk.galat.length, 'gudangSinkronTanggal massal berjalan (' + sk.data.length + ' BK disesuaikan)');
console.log('\n' + lulus + ' cek lulus — gudang & tanggal BA 1.10.6');
