// Uji modul server 1.10.4 (backup Excel paket tagihan, aksi blExcel*) di kernel Code.gs 2.5.1 ASLI lewat harness.
//   KODE_GS=/tmp/Code.gs node tagihan/uji/uji_excel_backup.js
const assert = require('assert'), fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const R = __dirname + '/../../asisten-ai-agen';
const { buatKonteks } = require(R + '/uji/harness.js');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const galat = (r, re, m) => { assert.ok(r && r.ok === false && re.test(r.error), m + ' — dapat: ' + JSON.stringify(r && (r.error || r)).slice(0, 200)); lulus++; console.log('  ✓ ' + m); };

const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
require('./drive_biner.js')(C, K, P);
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const kirim = (nama, pin) => (action, x) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek: P }, x || {})) } }));
const ADM = kirim('Joko Supriyono', '1234'), STF = kirim('Staf Pengadaan', '1111'), LHT = kirim('Kepala Proyek', '0000');
const modul = JSON.parse(fs.readFileSync(R + '/server-modul-1.10.4.json', 'utf8'));
assert.ok(ADM('modulUnggah', { data: modul }).ok); const tb = ADM('modulTerbit', { versi: modul.versi, konfirmasi: 'LULUS UJI', catatanUji: 'uji backup excel 1.10.4' }); assert.ok(tb.ok, tb.error);
const sheet = s => C.__sheets[P + s];
const tpl = JSON.parse(/window\.__MP292_FORMAT = (\{.*\});?\n/.exec(JSON.parse(fs.readFileSync(R + '/pembaruan-2.9.8.json', 'utf8')).js)[1]);
const xlsx = Buffer.from(tpl.bap, 'base64');

function unggah(F, bytes, extra, potong) {
  const b64 = bytes.toString('base64'), n = potong || 1, uk = Math.ceil(b64.length / n), sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const m = F('blUnggahMulai', { data: { nama: 'x.xlsx', jenis: 'BACKUP_XLSX', ukuran: bytes.length, sha256: sha, bagian: n } }); if (!m.ok) return m;
  for (let i = 0; i < n; i++) assert.ok(F('blUnggahPotong', { data: { uploadId: m.uploadId, ke: i + 1, data: b64.slice(i * uk, (i + 1) * uk) } }).ok);
  return F('blExcelSelesai', { data: Object.assign({ uploadId: m.uploadId }, extra) });
}

console.log('Persiapan: kontrak SPPP + 2 BK + paket');
const NO = '134/SPPP/WK-NK.KSO/PDBJ/1726012/2026';
const IT = [['Galian Tanah (Exca Std)', 39302, 'M3', 16000], ['Mobilisasi dan Demobilisasi', 8, 'Unit', 67000000]].map(x => ({ kode: '39000001', uraian: x[0], vol: x[1], sat: x[2], harga: x[3], wbs: 'C-1726012-01' }));
const sv = STF('save', { data: { noKontrak: NO, jenisKontrak: 'SPPP', namaVendor: 'CV Rizki Kurnia', idVendor: '2100009999', namaPekerjaan: 'Pekerjaan Galian Tanah Dermaga', tglKontrak: '2026-06-30', tglSelesai: '2026-12-31', noPO: '4100077000', items: IT } });
assert.ok(sv.ok, sv.error); assert.ok(STF('posting', { id: sv.data.id, versi: sv.data.versi }).ok);
const bk = (ke, items, nilai) => { const r = STF('saveProgres', { data: { noKontrak: NO, periode: 'P' + ke, periodeKey: 202606 + ke, tanggal: '2026-0' + (6 + ke) + '-28', tagihanKe: ke, kodeBA: 'BAPP', items, nilai } }); assert.ok(r.ok, r.error); return r.data; };
const BK1 = bk(1, { [NO + '#0']: 10000, [NO + '#1']: 4 }, 428000000), BK2 = bk(2, { [NO + '#0']: 5000 }, 80000000);
assert.ok(STF('blKonfigSimpan', { data: { noKontrak: NO, versi: 0, konfig: { kategori: 'SUBKON', uangMukaPersen: 20, retensiPersen: 5, ppn: { skema: 'NILAI_LAIN', tarif: 12, dipungut: false }, pph: { jenis: 'PPh 4(2)', tarif: 1.75 } } } }).ok);
const pk1 = STF('blSimpan', { data: { noKontrak: NO, progresId: BK1.id, jenis: 'PROGRES', sumber: { items: [] }, vendor: { ttdNama: 'Rizki' } } }); assert.ok(pk1.ok, pk1.error);
const pk2 = STF('blSimpan', { data: { noKontrak: NO, progresId: BK2.id, jenis: 'PROGRES', sumber: { items: [] }, vendor: { ttdNama: 'Rizki' } } }); assert.ok(pk2.ok, pk2.error);

console.log('Fitur & hak akses');
const ping = STF('diagServer'); ok(ping.ok && ping.modul && ping.modul.versi === '1.10.4' && (ping.fitur || []).indexOf('paketTagihanExcel') >= 0, 'ping: modul 1.10.4 · fitur paketTagihanExcel');
ok(K.doPost && STF('blInfo').ok, 'blInfo tetap berjalan');
galat(unggah(LHT, xlsx, { progresId: BK1.id }), /Lihat/, 'akun Lihat tidak dapat menyimpan backup');
galat(unggah(STF, Buffer.from('%PDF-1.4 bukan excel'), { progresId: BK1.id }), /bukan Excel/, 'isi bukan .xlsx (ZIP) ditolak');
galat(unggah(STF, xlsx, { progresId: 'P-tidak-ada' }), /tidak ditemukan/, 'BK tidak dikenal ditolak');

console.log('Simpan backup → folder arsip <No_Urut> <Jenis> <Vendor>/Kelengkapan');
const s1 = unggah(STF, xlsx, { progresId: BK1.id, termin: 1, namaPekerjaan: 'Pekerjaan Galian Tanah Dermaga', namaVendor: 'CV Rizki Kurnia', sumber: 'SIMPAN_BK' }, 3);
ok(s1.ok && s1.data.nama === 'BAP_Pekerjaan_Galian_Tanah_Dermaga_CV_Rizki_Kurnia_Termin-1.xlsx', 'nama berkas standar: ' + (s1.data && s1.data.nama));
ok(s1.data.folder === '134 SPPP CV Rizki Kurnia/Kelengkapan', 'folder arsip: ' + s1.data.folder);
const fp = vm.runInContext('folderProyek_(' + JSON.stringify(P) + ')', C), fk = fp.anak['Arsip Kontrak Vendor'].anak['134 SPPP CV Rizki Kurnia'].anak['Kelengkapan'];
ok(!!fk && C.__files[s1.data.idBerkas] && C.__files[s1.data.idBerkas].induk === fk.id, 'berkas .xlsx tersimpan di folder Kelengkapan');
ok(Buffer.from(C.__files[s1.data.idBerkas].data, 'latin1').equals(xlsx), 'isi berkas identik byte-per-byte (unggah 3 bagian)');
ok(sheet('_BackupExcelTagihan').rows.length === 2 && sheet('_ManifestBerkas').rows.some(r => r[6] === 'BACKUP_XLSX'), 'sheet _BackupExcelTagihan + manifest SHA-256 tercatat');
const s1b = unggah(STF, xlsx, { progresId: BK1.id, termin: 1 });
ok(s1b.ok && s1b.sudahAda && s1b.data.id === s1.data.id && sheet('_BackupExcelTagihan').rows.length === 2, 'isi sama (SHA-256 sama) → tidak membuat berkas ganda');

console.log('Tautan ke Paket Tagihan & Dashboard');
let b = LHT('blBaca', { id: pk1.data.id }); ok(b.ok && b.backupExcel && b.backupExcel.id === s1.data.id && b.backupWajib === true, 'blBaca membawa backupExcel (akun Lihat dapat membaca)');
let dft = STF('blDaftar', {}); ok(dft.data.find(x => x.id === pk1.data.id).backupExcel.nama === s1.data.nama && dft.data.find(x => x.id === pk2.data.id).backupExcel === null, 'blDaftar (Dashboard) menandai paket ber-backup / belum');
const kt = STF('blKonteks', { data: { noKontrak: NO } }); ok(kt.progres.find(x => x.id === BK1.id).backupExcel.sha256 === s1.data.sha256, 'blKonteks (Pembentuk Tagihan) membawa backup per BK');
const am = LHT('blExcelAmbil', { data: { progresId: BK1.id } }); ok(am.ok && Buffer.from(am.base64, 'base64').equals(xlsx), 'blExcelAmbil mengembalikan berkas utuh (unduh/pratinjau)');
galat(STF('blExcelAmbil', { data: { progresId: BK2.id } }), /belum ada/, 'BK tanpa backup → pesan jelas');

console.log('Versi baru menggantikan, versi lama tetap sebagai jejak audit');
const xl2 = Buffer.concat([xlsx, Buffer.from([0])]);
const s2 = unggah(STF, xl2, { progresId: BK1.id, termin: 1, namaPekerjaan: 'Pekerjaan Galian Tanah Dermaga', namaVendor: 'CV Rizki Kurnia' });
const L = STF('blExcelDaftar', { data: { progresId: BK1.id, riwayat: true } }).data;
ok(s2.ok && s2.diganti === s1.data.id && L.length === 2 && L.find(x => x.id === s1.data.id).status === 'DIGANTI' && L.find(x => x.id === s2.data.id).status === 'AKTIF', 'backup lama berstatus DIGANTI, baru AKTIF');
ok(STF('blBaca', { id: pk1.data.id }).backupExcel.id === s2.data.id, 'paket menunjuk backup terbaru');
ok(STF('blBaca', { id: pk1.data.id }).data.versi === pk1.data.versi, 'backup tidak menaikkan versi paket (dialog terbuka tidak terkena KONFLIK)');

console.log('Lampiran wajib sebelum SIAP DIPERIKSA');
let r = STF('blStatus', { data: { id: pk2.data.id, versi: pk2.data.versi, ke: 'DALAM PENYUSUNAN' } }); assert.ok(r.ok, r.error);
r = STF('blStatus', { data: { id: pk2.data.id, versi: r.data.versi, ke: 'MENUNGGU DOKUMEN' } }); assert.ok(r.ok, r.error);
galat(STF('blStatus', { data: { id: pk2.data.id, versi: r.data.versi, ke: 'SIAP DIPERIKSA' } }), /Lampiran wajib: Backup Excel/, 'paket tanpa backup Excel tidak dapat Siap Diperiksa');
let r1 = STF('blStatus', { data: { id: pk1.data.id, versi: pk1.data.versi, ke: 'DALAM PENYUSUNAN' } }); r1 = STF('blStatus', { data: { id: pk1.data.id, versi: r1.data.versi, ke: 'MENUNGGU DOKUMEN' } });
const r1b = STF('blStatus', { data: { id: pk1.data.id, versi: r1.data.versi, ke: 'SIAP DIPERIKSA' } });
ok(!r1b.ok ? !/Lampiran wajib/.test(r1b.error) : true, 'paket ber-backup lolos syarat backup (syarat checklist kernel tetap berlaku: ' + (r1b.error || 'ok').slice(0, 60) + ')');
C.PropertiesService.getScriptProperties().setProperty('BX_WAJIB', '0');
const r2b = STF('blStatus', { data: { id: pk2.data.id, versi: r.data.versi, ke: 'SIAP DIPERIKSA' } });
ok(!r2b.ok ? !/Lampiran wajib/.test(r2b.error) : true, 'BX_WAJIB=0 mematikan syarat backup');

console.log('\n' + lulus + ' cek lulus — backup Excel 1.10.4');
