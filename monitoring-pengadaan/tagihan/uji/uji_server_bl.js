// Uji modul server 1.10.0 (Paket Tagihan) di kernel Code.gs 2.5.1 ASLI + modul lengkap lewat harness (tiruan Google Sheets/Drive di memori).
//   KODE_GS=…/Code.gs NODE_PATH=<pdf-lib> node uji/uji_server_bl.js
const assert = require('assert'), fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const R = __dirname + '/../../asisten-ai-agen';
const { buatKonteks } = require(R + '/uji/harness.js');
global.BLI = require('../sumber/inti.js'); const BLD = require('../sumber/dokumen.js'), BLRP = require('../sumber/render-pdf.js'), PDFLib = require('pdf-lib');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const galat = (r, re, m) => { assert.ok(r && r.ok === false && re.test(r.error), m + ' — dapat: ' + JSON.stringify(r && (r.error || r)).slice(0, 200)); lulus++; console.log('  ✓ ' + m); };

const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
require('./drive_biner.js')(C, K, P);   // tiruan Drive biner (PDF hasil gabung) — sama dengan demo aplikasi

K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const kirim = (nama, pin) => (action, x) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek: P }, x || {})) } }));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111'), LHT = kirim('Kepala Proyek', '0000');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.0.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); assert.ok(ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji paket tagihan 1.10.0' }).ok);
const nama = s => C.__sheets[P + s];

(async () => {
  console.log('Persiapan: kontrak Register SPPP (4 item, Rp 2.195.707.500) + BK termin 1');
  const NO = '134/SPPP/WK-NK.KSO/PDBJ/1726012/2026';
  const IT = [['Galian Tanah termasuk perapihan (Exca Std+Miting)', 39302, 'M3', 16000], ['Galian Tanah termasuk perapihan (Exca Long Arm+Miting)', 49088, 'M3', 21000], ['Galian Tanah termasuk perapihan (Exca Long Arm+Ponton)', 1, 'M3', 27500], ['Mobilisasi dan Demobilisasi', 8, 'Unit', 67000000]]
    .map(x => ({ kode: '39000001', uraian: x[0], vol: x[1], sat: x[2], harga: x[3], wbs: 'C-1726012-01' }));
  const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPPP', namaVendor: 'CV Rizki Kurnia', idVendor: '2100009999', tglKontrak: '2026-06-30', tglSelesai: '2026-12-31', noPR: '1000178000', noRFQ: '2100201000', noPO: '4100077000', top: '30 hari', items: IT } });
  assert.ok(sv.ok, sv.error); assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
  const id = i => NO + '#' + i;
  const bk = (ke, items, nilai, pk) => { const r = STF('saveProgres', { data: { noKontrak: NO, periode: 'Periode ' + ke, periodeKey: pk, tanggal: '2026-0' + (6 + ke) + '-28', tagihanKe: ke, kodeBA: 'BAPP', items, nilai } }); assert.ok(r.ok, r.error); return r.data; };
  const BK1 = bk(1, { [id(0)]: 10000, [id(3)]: 4 }, 428000000, 202607);
  const reg0 = JSON.stringify(nama('_Register').rows), prog0 = JSON.stringify(nama('_Progres').rows);

  console.log('Konfigurasi tagihan per kontrak');
  galat(LHT('blKonfigSimpan', { data: { noKontrak: NO, konfig: {} } }), /Lihat/, 'akun Lihat tidak dapat mengubah konfigurasi');
  const KF = { kategori: 'SUBKON', uangMukaPersen: 20, retensiPersen: 5, ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: true }, pph: { jenis: 'PPh 4(2)', tarif: 1.75 } };
  const kf = STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: KF } }); ok(kf.ok && kf.data.versi === 1 && kf.data.ppn.tarif === 12, 'konfigurasi SUBKON · UM 20% · retensi 5% · PPN nilai lain 12% (dipungut) · PPh 4(2) 1,75% tersimpan');
  galat(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: KF } }), /KONFLIK/, 'simpan konfigurasi dengan versi lama → KONFLIK');
  galat(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 1, konfig: KF } }), /Alasan/, 'perubahan konfigurasi wajib beralasan');

  console.log('Buat paket dari BK (server menghitung ulang; item Register menang)');
  const salah = IT.map((x, i) => ({ id: id(i), uraian: x.uraian, sat: x.sat, vol: x.vol, harga: x.harga * 2 }));
  const k1 = 'idem-' + crypto.randomUUID();
  const b1 = STF('blSimpan', { data: { kunciIdem: k1, noKontrak: NO, progresId: BK1.id, jenis: 'PROGRES', sumber: { kontrak: { namaVendor: 'CV Rizki Kurnia' }, items: salah }, vendor: { ttdNama: 'Rizki', ttdJabatan: 'Direktur' } } });
  ok(b1.ok && b1.data.status === 'DRAFT' && b1.data.hasil.prestasi.ini === 428000000, 'paket dibuat: prestasi Rp 428.000.000 (harga dari Register, bukan dari perangkat)');
  ok(b1.data.temuanServer.some(t => t.kode === 'ITEM_REGISTER') && b1.data.sumber.kontrak.asal === 'REGISTER' && b1.data.sumber.kontrak.noPO === '4100077000', 'item & PO diambil dari Register server, perbedaan dicatat');
  ok(b1.data.hasil.uangMuka.potong === 85600000 && b1.data.hasil.retensi.nilai === 21400000 && b1.data.hasil.dasarTagihan === 321000000 && b1.data.nomorBA === '01/BAPP/' + NO, 'UM Rp 85,6 jt, retensi Rp 21,4 jt, tagihan Rp 321 jt; nomor BA dari Input Progres');
  const ul = STF('blSimpan', { data: { kunciIdem: k1, noKontrak: NO, progresId: BK1.id, sumber: { items: salah } } });
  ok(ul.ok && ul.sudahAda && ul.data.id === b1.data.id && nama('_PaketTagihan').rows.length === 2, 'kirim ulang (respons terputus) dengan kunci idempotensi sama → tidak membuat paket ganda');
  galat(STF('blSimpan', { data: { kunciIdem: 'idem-' + crypto.randomUUID(), noKontrak: NO, progresId: BK1.id, sumber: { items: salah } } }), /sudah memiliki paket/, 'BK yang sama tidak dapat ditagih dua kali');
  galat(LHT('blSimpan', { data: { noKontrak: NO, progresId: BK1.id, sumber: { items: salah } } }), /Lihat/, 'akun Lihat tidak dapat membuat paket');
  galat(STF('blSimpan', { data: { noKontrak: NO, progresId: 'P-tidak-ada', sumber: { items: salah } } }), /tidak ditemukan/, 'BK tidak dikenal ditolak');
  galat(STF('blSimpan', { data: { id: b1.data.id, versi: 0, vendor: { ttdNama: 'X' } } }), /KONFLIK/, 'ubah dengan versi lama → KONFLIK (optimistic concurrency)');
  const lihat = LHT('blBaca', { id: b1.data.id }); ok(lihat.ok && lihat.efektif === 'DRAFT' && lihat.riwayat.length === 1 && lihat.syarat.SUBKON_01.berlaku === false, 'akun Lihat dapat membaca paket, riwayat versi & saran syarat (Final Account tidak berlaku < 85%)');

  console.log('Status & dokumen');
  let r = STF('blStatus', { data: { id: b1.data.id, versi: b1.data.versi, ke: 'DALAM PENYUSUNAN' } }); ok(r.ok && r.data.status === 'DALAM PENYUSUNAN', 'DRAFT → DALAM PENYUSUNAN');
  galat(STF('blStatus', { data: { id: b1.data.id, versi: r.data.versi, ke: 'TERVERIFIKASI' } }), /Checklist Tagihan/, 'status Terverifikasi tidak dapat ditulis lewat modul tagihan');
  galat(STF('blStatus', { data: { id: b1.data.id, versi: r.data.versi, ke: 'SIAP DIPERIKSA' } }), /tidak diizinkan/, 'tidak boleh melompati Menunggu Dokumen');
  r = STF('blStatus', { data: { id: b1.data.id, versi: r.data.versi, ke: 'MENUNGGU DOKUMEN' } }); ok(r.ok, 'DALAM PENYUSUNAN → MENUNGGU DOKUMEN (tanpa galat)');
  // PDF nyata dari generator → unggah bertahap
  const paket = r.data, p = { kategori: paket.kategori, kontrak: paket.sumber.kontrak, vendor: paket.vendor, identitas: { namaKop: 'WASKITA - NINDYA KSO' }, progres: { tagihanKe: paket.tagihanKe, nomorBA: paket.nomorBA, kodeBA: paket.kodeBA }, hasil: paket.hasil, revisi: paket.revisi };
  const bapp = await BLRP.satu(PDFLib, BLD.buat(p, 'BAPP'), {}), bytes = Buffer.from(bapp.bytes), sha = crypto.createHash('sha256').update(bytes).digest('hex'), b64 = bytes.toString('base64');
  const pot = [b64.slice(0, Math.ceil(b64.length / 3)), b64.slice(Math.ceil(b64.length / 3), Math.ceil(b64.length * 2 / 3)), b64.slice(Math.ceil(b64.length * 2 / 3))];
  galat(STF('blUnggahMulai', { data: { nama: 'x.pdf', ukuran: 30 * 1024 * 1024, sha256: sha, bagian: 1 } }), /25 MB/, 'unggah > 25 MB ditolak');
  const up = STF('blUnggahMulai', { data: { nama: 'BAPP-01.pdf', ukuran: bytes.length, sha256: sha, bagian: 3, jenis: 'BAPP', ket: NO } }); ok(up.ok && up.uploadId, 'sesi unggah bertahap dibuat (3 bagian)');
  ok(STF('blUnggahPotong', { data: { uploadId: up.uploadId, ke: 1, data: pot[0] } }).ok && STF('blUnggahPotong', { data: { uploadId: up.uploadId, ke: 3, data: pot[2] } }).ok, 'bagian 1 & 3 diterima (urutan bebas)');
  galat(STF('blUnggahSelesai', { data: { uploadId: up.uploadId } }), /Bagian belum diterima: 2/, 'selesai ditolak bila bagian 2 belum ada');
  galat(ADM('blUnggahPotong', { data: { uploadId: up.uploadId, ke: 2, data: pot[1] } }), /pengguna\/proyek lain/, 'sesi unggah tidak dapat dipakai pengguna lain');
  ok(STF('blUnggahPotong', { data: { uploadId: up.uploadId, ke: 2, data: pot[1].replace(/^./, 'A') } }).ok && STF('blUnggahPotong', { data: { uploadId: up.uploadId, ke: 2, data: pot[1] } }).ok, 'bagian 2 dikirim ulang (yang rusak diganti)');
  const fin = STF('blUnggahSelesai', { data: { uploadId: up.uploadId } });
  ok(fin.ok && fin.file.sha256 === sha && fin.file.ukuran === bytes.length && C.__files[fin.file.idServer] && C.__files[fin.file.idServer].induk === K.folderProyek_(P).getId(), 'PDF digabung di folder proyek, ukuran & SHA-256 cocok');
  const fin2 = STF('blUnggahSelesai', { data: { uploadId: up.uploadId } }); ok(fin2.ok && fin2.sudahAda && fin2.file.idServer === fin.file.idServer, 'selesai dipanggil ulang → berkas yang sama (tidak dobel)');
  ok(nama('_ManifestBerkas').rows.some(x => x[1] === fin.file.idServer && x[4] === sha), 'manifest SHA-256 tercatat');
  const up2 = STF('blUnggahMulai', { data: { nama: 'r.pdf', ukuran: bytes.length, sha256: 'a'.repeat(64), bagian: 1 } }); STF('blUnggahPotong', { data: { uploadId: up2.uploadId, ke: 1, data: b64 } });
  galat(STF('blUnggahSelesai', { data: { uploadId: up2.uploadId } }), /SHA-256 tidak cocok/, 'berkas rusak (sidik beda) ditolak');
  galat(STF('blDokumen', { data: { id: paket.id, versi: paket.versi, dok: { aksi: 'TERBIT', kode: 'BAPP', file: fin.file, sidikHitung: 'lama' } } }), /perhitungan lama/, 'PDF dari perhitungan lama ditolak');
  r = STF('blDokumen', { data: { id: paket.id, versi: paket.versi, kunciIdem: 'idem-dok-1', dok: { aksi: 'TERBIT', kode: 'BAPP', nomor: paket.nomorBA, file: fin.file, sidikHitung: paket.sidik, halaman: bapp.halaman } } });
  ok(r.ok && r.data.dokumen.length === 1 && r.data.dokumen[0].status === 'MENUNGGU_TTD' && r.data.dokumen[0].checklistK === 'UMUM_08', 'BAPP hasil generator tercatat: Menunggu tanda tangan → baris checklist UMUM_08');
  galat(STF('blKeChecklist', { data: { id: paket.id, pasang: [{ documentId: r.data.dokumen[0].documentId }] } }), /tidak boleh dipasang/, 'draf hasil generator tidak dapat dipasang ke checklist (tidak memalsukan dokumen bertanda tangan)');
  // scan bertanda tangan (PDF lain) diunggah
  const up3 = STF('blUnggahMulai', { data: { nama: 'BAPP-01-ttd.pdf', ukuran: bytes.length, sha256: sha, bagian: 1, jenis: 'BAPP-TTD', ket: NO } }); STF('blUnggahPotong', { data: { uploadId: up3.uploadId, ke: 1, data: b64 } });
  const f3 = STF('blUnggahSelesai', { data: { uploadId: up3.uploadId } });
  r = STF('blDokumen', { data: { id: paket.id, versi: r.data.versi, dok: { aksi: 'UNGGAH_TTD', kode: 'BAPP', file: f3.file } } });
  ok(r.ok && r.data.dokumen[1].status === 'DIUNGGAH' && r.data.dokumen[1].jenisFile === 'SIGNED', 'BAPP bertanda tangan diunggah → Sudah diunggah');
  const tpl = K.CL217_TEMPLATES.SUBKON.reduce((a, s) => a.concat(s.items), []);
  const na = tpl.filter(t => t.k !== 'UMUM_08').map(t => ({ k: t.k, alasan: 'Tidak berlaku untuk uji paket tagihan' }));
  const kc = STF('blKeChecklist', { data: { id: paket.id, pasang: [{ documentId: r.data.dokumen[1].documentId }], na } });
  const ckl = vm.runInContext('cl217Cari_', C)(P, BK1.id).rec;
  ok(kc.ok && ckl.items.UMUM_08.status === 'ADA' && ckl.items.UMUM_08.file.idServer === f3.file.idServer && ckl.verified === false, 'dokumen bertanda tangan dipasang ke Checklist Tagihan (status Ada, belum diverifikasi)');
  r = STF('blStatus', { data: { id: paket.id, versi: r.data.versi, ke: 'SIAP DIPERIKSA' } }); ok(r.ok && r.data.status === 'SIAP DIPERIKSA', 'checklist lengkap → SIAP DIPERIKSA');
  galat(STF('blStatus', { data: { id: paket.id, versi: r.data.versi, ke: 'REVISI', alasan: 'BAPP salah tanggal, mohon perbaiki' } }), /Hanya Admin/, 'staf tidak dapat mengembalikan ke Revisi');
  ok(JSON.stringify(nama('_Register').rows) === reg0 && JSON.stringify(nama('_Progres').rows) === prog0, 'sheet Register & Progres tidak diubah oleh modul tagihan');

  console.log('Verifikasi & pembayaran tetap lewat aturan Monitoring SAP');
  const ckv = ADM('checklistVerifikasi', { data: { id: BK1.id, versi: ckl.versi, konfirmasiAsli: true, keterangan: 'cek fisik' } });
  assert.ok(ckv.ok, ckv.error);
  let d = STF('blDaftar', {}); ok(d.ok && d.total === 1 && d.data[0].statusEfektif === 'TERVERIFIKASI' && d.data[0].checklist.verified, 'Admin memverifikasi checklist → paket tampil TERVERIFIKASI (dibaca, bukan ditulis)');
  galat(STF('blSimpan', { data: { id: paket.id, versi: r.data.versi, vendor: { ttdNama: 'Ubah' } } }), /TERVERIFIKASI/, 'paket terverifikasi terkunci');
  { const t = STF('saveProgres', { data: { id: BK1.id, versi: BK1.versi, terbit: true } }); assert.ok(t.ok, t.error); }   // BA diterbitkan lewat Input Progres (aturan lama)
  const pr = vm.runInContext('bacaKoleksi_', C)(P, 'progres').find(x => x.id === BK1.id);
  { const kq = STF('keuanganProgres', { data: { id: BK1.id, versi: pr.versi, bayar: { status: 'DIAJUKAN', tglAju: '2026-08-10' } } }); assert.ok(kq.ok, kq.error); }
  ok(STF('blDaftar', {}).data[0].statusEfektif === 'DIAJUKAN', 'Keuangan & Bayar: DIAJUKAN → paket DIAJUKAN');
  galat(ADM('blStatus', { data: { id: paket.id, versi: r.data.versi, ke: 'BATAL', alasan: 'pembatalan uji setelah diajukan' } }), /DIAJUKAN/, 'tagihan yang sudah diajukan tidak dapat dibatalkan');
  { const v = vm.runInContext('bacaKoleksi_', C)(P, 'progres').find(x => x.id === BK1.id).versi, kq = STF('keuanganProgres', { data: { id: BK1.id, versi: v, bayar: { status: 'DIBAYAR', tglAju: '2026-08-10', tglBayar: '2026-08-15', nilaiBayar: 299382500 } } }); assert.ok(kq.ok, kq.error); }
  ok(STF('blDaftar', {}).data[0].statusEfektif === 'DIBAYAR', 'status DIBAYAR terbaca dari Keuangan & Bayar');

  console.log('Termin 2: riwayat UM dari paket sebelumnya, revisi setelah dokumen terbit');
  const BK2 = bk(2, { [id(0)]: 20000, [id(1)]: 30000, [id(3)]: 4 }, 1218000000, 202608);
  const b2 = STF('blSimpan', { data: { kunciIdem: 'idem-' + crypto.randomUUID(), noKontrak: NO, progresId: BK2.id, sumber: { items: salah } } });
  ok(b2.ok && b2.data.hasil.prestasi.lalu === 428000000 && b2.data.riwayatSebelum.umKembaliSebelum === 85600000 && b2.data.hasil.uangMuka.potong === 243600000, 'termin 2: prestasi lalu Rp 428 jt, UM dikembalikan sebelumnya Rp 85,6 jt, potong UM 20% × 1,218 M');
  r = STF('blStatus', { data: { id: b2.data.id, versi: b2.data.versi, ke: 'DALAM PENYUSUNAN' } });
  r = STF('blDokumen', { data: { id: b2.data.id, versi: r.data.versi, dok: { aksi: 'TERBIT', kode: 'BAP', file: fin.file, sidikHitung: b2.data.sidik } } }); assert.ok(r.ok, r.error);
  galat(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 1, konfig: Object.assign({}, KF, { retensiPersen: 2.5 }), alasan: 'addendum retensi 2,5%' } }), /hanya oleh Admin/, 'termin 1 sudah dibayar → konfigurasi hanya dapat diubah Admin');
  const kf2 = ADM('blKonfigSimpan', { data: { noKontrak: NO, versi: 1, konfig: Object.assign({}, KF, { retensiPersen: 2.5 }), alasan: 'addendum retensi 2,5%' } }); ok(kf2.ok && kf2.data.riwayat.length === 2, 'Admin mengubah konfigurasi (riwayat konfigurasi tersimpan)');
  galat(STF('blSimpan', { data: { id: b2.data.id, versi: r.data.versi } }), /alasan revisi/, 'perhitungan berubah setelah PDF terbit → alasan revisi wajib');
  const rv = STF('blSimpan', { data: { id: b2.data.id, versi: r.data.versi, alasan: 'Retensi menjadi 2,5% sesuai addendum' } });
  ok(rv.ok && rv.data.revisi === 1 && rv.data.hasil.retensi.nilai === 30450000 && rv.data.dokumen[0].diganti && rv.data.dokumen[0].status === 'PERLU_REVISI', 'revisi ke-1: retensi Rp 30,45 jt; PDF lama ditandai diganti / perlu revisi');
  const rw = STF('blBaca', { id: b2.data.id }).riwayat;
  ok(rw.length >= 4 && rw[0].aksi === 'UBAH PERHITUNGAN' && rw[0].alasan === 'Retensi menjadi 2,5% sesuai addendum' && rw[0].data.sebelum.hasil.dasar !== rw[0].data.sesudah.hasil.dasar, 'jejak versi menyimpan sebelum → sesudah, alasan, oleh & waktu');
  ok(STF('blBaca', { id: paket.id }).data.hasil.retensi.nilai === 21400000, 'riwayat termin 1 (sudah dibayar) tidak berubah oleh revisi konfigurasi');

  console.log('Kontrol volume & galat');
  const BK3 = bk(3, { [id(3)]: 5 }, 335000000, 202609);
  const b3 = STF('blSimpan', { data: { noKontrak: NO, progresId: BK3.id, sumber: { items: salah } } });
  ok(b3.ok && b3.data.hasil.temuan.some(t => t.kode === 'VOLUME_LEBIH'), 'kumulatif Mobilisasi 13 > 8 → GALAT tercatat');
  r = STF('blStatus', { data: { id: b3.data.id, versi: b3.data.versi, ke: 'DALAM PENYUSUNAN' } });
  galat(STF('blStatus', { data: { id: b3.data.id, versi: r.data.versi, ke: 'MENUNGGU DOKUMEN' } }), /GALAT/, 'paket bergalat tidak dapat menerbitkan dokumen');
  galat(STF('blDokumen', { data: { id: b3.data.id, versi: r.data.versi, dok: { aksi: 'TERBIT', kode: 'BAPP', file: fin.file, sidikHitung: b3.data.sidik } } }), /GALAT/, 'PDF tidak dapat diterbitkan untuk paket bergalat');
  r = ADM('blStatus', { data: { id: b3.data.id, versi: r.data.versi, ke: 'BATAL', alasan: 'BK termin 3 salah input volume' } }); ok(r.ok && r.data.status === 'BATAL' && r.data.batal.oleh === 'Joko Supriyono', 'paket dibatalkan dengan alasan (baris tetap tersimpan)');
  ok(STF('blSimpan', { data: { noKontrak: NO, progresId: BK3.id, sumber: { items: salah } } }).ok, 'setelah dibatalkan, BK dapat dibuatkan paket baru');

  console.log('Bahan: surat jalan gudang tidak boleh ditagih dua kali');
  const NB = '055/SPM/WK-NK.KSO/PDBJ/1726012/2026', BON = '007/WK-NK.KSO/DIV.II/INF1/1726012/2026';
  const s2 = STF('save', { data: { noKontrak: NB, jenisKontrak: 'SPM', namaVendor: 'Cahaya Utama', tglKontrak: '2026-09-01', tglSelesai: '2026-12-31', items: [{ kode: '1000000001', uraian: 'Semen PCC 50 kg', vol: 100, sat: 'Sak', harga: 80000, wbs: 'W1', noPermintaan: BON }] } });
  STF('posting', { id: s2.data.id, versi: s2.data.versi });
  STF('blKonfigSimpan', { data: { noKontrak: NB, versi: 0, konfig: { kategori: 'BAHAN', ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: true }, pph: { jenis: 'PPh 22', tarif: 1.5 } } } });
  const gm = vm.runInContext("sheet_(__P + '_GudangMasuk', ['ID','Tanggal','No Bon','Baris Bon','Kode Material','Uraian','Satuan','Qty','Harga','No Surat Jalan','Diterima Oleh','Status','Diubah Oleh','Diubah Pada','DATA'])", Object.assign(C, { __P: P }));
  [['GR1', 'SJ-001', 30], ['GR2', 'SJ-002', 20], ['GR3', 'SJ-003', 10]].forEach(([g, sj, q]) => gm.appendRow([g, '2026-09-1' + q / 10, BON, 1, '1000000001', 'Semen PCC 50 kg', 'Sak', q, 80000, sj, 'Gudang', 'AKTIF', 'uji', '', JSON.stringify({ id: g, tanggal: '2026-09-1' + q / 10, bonNomor: BON, bonIdx: 0, kode: '1000000001', uraian: 'Semen PCC 50 kg', sat: 'Sak', qty: q, noSJ: sj, status: 'AKTIF' })]));
  const bm = (ke, v) => STF('saveProgres', { data: { noKontrak: NB, periode: 'P' + ke, periodeKey: 202609 + ke, tanggal: '2026-09-30', tagihanKe: ke, kodeBA: 'BAPM', items: { [NB + '#0']: v }, nilai: v * 80000 } }).data;
  const M1 = bm(1, 50), M2 = bm(2, 10);
  const kt = STF('blKonteks', { data: { noKontrak: NB, bon: [BON] } }); ok(kt.ok && kt.gudang.length === 3 && kt.progres.length === 2 && kt.kategori === 'BAHAN', 'konteks kontrak: 2 BK, 3 penerimaan gudang dari bon kontrak');
  const pm1 = STF('blSimpan', { data: { noKontrak: NB, progresId: M1.id, lampiran: { grIds: ['GR1', 'GR2'] } } });
  ok(pm1.ok && pm1.data.lampiran.sj.length === 2 && pm1.data.lampiran.sjVol[NB + '#0'] === 50 && !pm1.data.temuanServer.some(t => /^SJ_/.test(t.kode)), 'paket BAPM: 2 surat jalan (50 sak) cocok dengan BK');
  galat(STF('blSimpan', { data: { noKontrak: NB, progresId: M2.id, lampiran: { grIds: ['GR2', 'GR3'] } } }), /sudah dipakai di paket/, 'surat jalan SJ-002 yang sudah ditagih tidak dapat dipakai lagi');
  const pm2 = STF('blSimpan', { data: { noKontrak: NB, progresId: M2.id, lampiran: { grIds: ['GR3'] } } }); ok(pm2.ok && STF('blKonteks', { data: { noKontrak: NB, bon: [BON] } }).gudang.find(g => g.id === 'GR2').dipakai === pm1.data.id, 'konteks menandai penerimaan yang sudah dipakai paket lain');

  console.log('Daftar, versi lama & ketahanan');
  d = STF('blDaftar', { data: { per: 2, hal: 1 } }); ok(d.ok && d.total === 6 && d.data.length === 2, 'daftar paket per halaman (2 dari 6)');
  ok(STF('blDaftar', { data: { kategori: 'BAHAN' } }).total === 2 && STF('blDaftar', { data: { cari: 'cahaya' } }).total === 2, 'saring kategori & cari vendor');
  const lg = vm.runInContext('bacaLog_', C)(P).filter(l => /PAKET TAGIHAN|UNGGAH PDF TAGIHAN|KONFIG TAGIHAN|PAKET → CHECKLIST/.test(l.aksi));
  ok(lg.length >= 15 && lg.every(l => l.oleh), 'seluruh perubahan tercatat di Log (audit trail): ' + lg.length + ' baris');
  const lama = JSON.parse(fs.readFileSync(R + '/server-modul-1.9.6.json', 'utf8'));
  ok(vm.runInContext('modulKompilasi_', C)(lama).aksi.blSimpan === undefined && vm.runInContext('modulKompilasi_', C)(modul).aksi.blSimpan, 'rollback ke modul 1.9.6 tetap dapat dimuat (aksi bl* hilang, data paket tetap di sheet tersendiri)');
  ok(ADM('modulRollback', { konfirmasi: 'KEMBALIKAN', versiSekarang: '1.10.0' }).ok && /dari modul server yang sedang tidak aktif|tidak dikenal/.test(STF('blDaftar', {}).error || '') && STF('baca', { jenis: 'progres' }).ok, 'setelah rollback: aplikasi lama tetap berjalan, aksi tagihan menolak dengan pesan jelas');
  ok(nama('_PaketTagihan').rows.length === 7, 'data paket tagihan tetap utuh setelah rollback (6 paket + judul)');
  console.log('\nLULUS ' + lulus + ' uji server Paket Tagihan (modul 1.10.0)');
})().catch(e => { console.error(e); process.exit(1); });
