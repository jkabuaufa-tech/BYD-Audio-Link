// Uji modul 1.8.5: Verifikasi Tagihan memakai PDF yang diunggah MANUAL per baris checklist walaupun tagihan punya bundel.
// Skenario nyata: bundel lama berisi Invoice & Faktur versi A; pengguna lalu mengunggah Invoice.pdf & Faktur Pajak.pdf (versi B) di baris checklist.
// 1.8.4: PDF manual tidak dibaca, laporan tetap memakai data bundel (bug). 1.8.5: PDF manual dibaca & diutamakan; potongan otomatis bundel tetap tanpa baca ulang.
const assert = require('assert'), fs = require('fs');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, S, NO, ADM, STF } = require('./vt_data.js')();
const folderId = K.folderProyek_(P).getId(), salin = o => JSON.parse(JSON.stringify(o));
// bundel SPSA (versi A) — sama dengan uji_bundel
let hal = 1; const isi = [];
['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_07', 'UMUM_08', 'ALAT_09'].forEach(k => C.__ekstrak['TSPSA-' + k].forEach(d => {
  const n = d.jenis === 'BAP' || d.jenis === 'SURAT_JALAN' ? 2 : 1; isi.push(Object.assign(salin(d), { halamanMulai: hal, halamanAkhir: hal + n - 1 })); hal += n; }));
C.__files['BUN-A'] = { nama: 'CHECKLIST · 001-SPSA · BUNDEL · Bundel SPSA.pdf', data: 'FILE:BUN-A', induk: folderId, diubah: 5 }; C.__ekstrak['BUN-A'] = isi;
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TB1', versi: 1, noKontrak: NO.spsa, tagihanKe: 2, nomorBA: '02/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
const tpl = K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []), items = {};
tpl.forEach(d => { items[d.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'TB1', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
let r = STF('vtBundel', { data: { id: 'TB1', file: { id: 'BUN-A', idServer: 'BUN-A', nama: 'Bundel SPSA.pdf', lokasi: 'server' } } }); assert.ok(r.ok, r.error);
// baris checklist: Kwitansi = potongan otomatis bundel (2.5.1), Invoice & Faktur = unggahan MANUAL versi B, lainnya = bagian bundel (Terapkan)
const invB = salin(C.__ekstrak['TSPSA-UMUM_04']); invB[0].nomor = 'INV-B/2026/007'; invB[0].nilai = { hargaJual: 120000000, ppn: 13200000, total: 133200000 };
const fpB = salin(C.__ekstrak['TSPSA-UMUM_05']); fpB[0].nomorSeriFaktur = '04002600000777'; fpB[0].npwpPembeli = '0010016145093000';
C.__files['MAN-INV'] = { nama: 'CHECKLIST · 001-SPSA-WK · UMUM_04 · Invoice.pdf', data: 'FILE:MAN-INV', induk: folderId, diubah: 9 }; C.__ekstrak['MAN-INV'] = invB;
C.__files['MAN-FP'] = { nama: 'CHECKLIST · 001-SPSA-WK · UMUM_05 · Faktur Pajak.pdf', data: 'FILE:MAN-FP', induk: folderId, diubah: 9 }; C.__ekstrak['MAN-FP'] = fpB;
C.__files['CUT-KW'] = { nama: 'CHECKLIST · 001-SPSA-WK · Kwitansi (potongan bundel) · Kwitansi - 02 (hal. 3).pdf', data: 'FILE:CUT-KW', induk: folderId, diubah: 9 }; C.__ekstrak['CUT-KW'] = [{ jenis: 'KWITANSI', nomor: 'TIDAK-BOLEH-DIBACA' }];
const ref = (id, nama) => ({ id, idServer: id, nama, lokasi: 'server' });
const cl = ADM('checklistBaca', { id: 'TB1' }).data;
Object.assign(cl.items, { UMUM_03: { status: 'ADA', file: ref('CUT-KW', C.__files['CUT-KW'].nama), ket: 'Dipotong otomatis dari bundel hal. 3 (1 hlm, AI)' },
  UMUM_04: { status: 'ADA', file: ref('MAN-INV', C.__files['MAN-INV'].nama), ket: '' }, UMUM_05: { status: 'ADA', file: ref('MAN-FP', C.__files['MAN-FP'].nama), ket: '' } });
['UMUM_01', 'UMUM_02', 'UMUM_07', 'UMUM_08', 'ALAT_09'].forEach(k => { cl.items[k] = { status: 'ADA', file: ref('BUN-A', 'Bundel SPSA.pdf'), ket: 'Bundel hal. x' }; });
r = STF('checklistSimpan', { data: { id: 'TB1', versi: cl.versi, items: cl.items } }); assert.ok(r.ok, r.error);
function jalankan(paksaTanpaCache) {   // = alur aplikasi (mp230): vtRencana → vtEkstrak per dokumen → vtNilai
  const rn = STF('vtRencana', { data: { id: 'TB1' } }); assert.ok(rn.ok, rn.error);
  rn.dokumen.forEach(d => { const x = STF('vtEkstrak', { data: { id: 'TB1', k: d.k } }); assert.ok(x.ok, x.error); });
  const n = STF('vtNilai', { data: { id: 'TB1' } }); assert.ok(n.ok, n.error); return { rn, lap: n.data };
}
const baris = (lap, dok) => lap.tabel.find(t => t.dokumen === dok) || {};
console.log('1. Modul 1.8.4 (sebelum perbaikan) — reproduksi masalah');
let A = jalankan();
ok(!A.rn.dokumen.some(d => d.k === 'UMUM_04' || d.k === 'UMUM_05'), '1.8.4: Invoice.pdf & Faktur Pajak.pdf unggahan manual TIDAK dijadwalkan dibaca');
ok(!/INV-B\/2026\/007/.test(JSON.stringify(A.lap.tabel)) && !A.lap.dokumenDiperiksa.some(s => s.k === 'UMUM_04'), '1.8.4: laporan memakai Invoice dari bundel lama (masalah yang dilaporkan)');
const lap184TSPM = STF('vtNilai', { data: { id: 'TSPM' } }).data;
console.log('2. Pasang modul 1.8.5');
r = ADM('modulUnggah', { data: JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.8.5.json', 'utf8')) }); assert.ok(r.ok, r.error);
r = ADM('modulTerbit', { versi: '1.8.5', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis modul 1.8.5' }); ok(r.ok, 'kernel menerima & menerbitkan modul 1.8.5 di atas 1.8.4');
ok((ADM('aiInfo').versiAI === '1.8.5'), 'aiInfo melaporkan versi 1.8.5');
console.log('3. Modul 1.8.5 — unggahan manual dibaca & diutamakan');
const ai0 = S.nPanggil || 0; S.nPanggil = 0;
A = jalankan();
ok(A.rn.dokumen.some(d => d.k === 'UMUM_04') && A.rn.dokumen.some(d => d.k === 'UMUM_05'), 'Invoice.pdf & Faktur Pajak.pdf manual dijadwalkan dibaca');
ok(!A.rn.dokumen.some(d => d.k === 'UMUM_03' || d.k === 'UMUM_01'), 'potongan otomatis (Kwitansi) & baris "Bundel hal." TIDAK dibaca ulang (tanpa biaya AI tambahan)');
ok(/INV-B\/2026\/007/.test(baris(A.lap, 'Invoice').alasan) || A.lap.dokumenDiperiksa.some(s => s.k === 'UMUM_04' && s.dibaca && s.manual), 'laporan memakai Invoice unggahan manual (No. INV-B/2026/007)');
ok(A.lap.dokumenDiperiksa.filter(s => s.manual && s.dibaca).map(s => s.k).sort().join(',') === 'UMUM_04,UMUM_05', 'Dokumen diperiksa: Invoice & Faktur dari unggahan checklist (ditandai manual)');
ok(A.lap.dokumenDiperiksa.filter(s => s.k === 'BUNDEL').every(s => /Invoice/.test(s.diganti || '') && /Faktur Pajak/.test(s.diganti || '')), 'bundel ditandai: "memakai unggahan checklist untuk: Invoice, Faktur Pajak"');
ok(/Kwitansi/.test(JSON.stringify(baris(A.lap, 'Kwitansi'))) && !/TIDAK-BOLEH-DIBACA/.test(JSON.stringify(A.lap)), 'Kwitansi tetap dari bundel (potongan tidak dibaca ulang)');
ok(A.lap.temuan.some(t => /Invoice/.test(t.judul) && /133\.200\.000|133200000/.test(t.detail)) || A.lap.rekapNilai && /133200000|133\.200\.000/.test(JSON.stringify(A.lap.rekapNilai)), 'nilai Invoice manual (Rp133.200.000) dipakai dalam pemeriksaan silang');
ok(!A.lap.temuan.some(t => t.kode === 'K00'), 'semua dokumen terbaca (tanpa temuan "belum dibaca AI")');
console.log('4. Tanpa bundel: hasil tidak berubah; data tidak diubah');
const lap185TSPM = STF('vtNilai', { data: { id: 'TSPM' } }).data, inti = l => JSON.stringify({ k: l.keputusan, r: l.ringkas, t: l.tabel, m: l.temuan.map(t => t.kode + t.judul) });
ok(inti(lap185TSPM) === inti(lap184TSPM), 'tagihan tanpa bundel (SPM): keputusan, tabel & temuan identik 1.8.4 vs 1.8.5');
const c2 = ADM('checklistBaca', { id: 'TB1' }).data;
ok(c2.items.UMUM_04.file.idServer === 'MAN-INV' && c2.items.UMUM_03.file.idServer === 'CUT-KW' && !c2.verified, 'checklist & status verifikasi tidak diubah oleh verifikasi');
console.log('5. PDF manual yang LEBIH LAMA dari bundel → bundel tetap sumber (perilaku 1.8.0 dipertahankan)');
C.__files['MAN-INV'].diubah = 1; C.__files['MAN-FP'].diubah = 1;   // diunggah sebelum bundel (bundel diubah = 5)
A = jalankan();
ok(!A.rn.dokumen.some(d => d.k === 'UMUM_04' || d.k === 'UMUM_05') && !A.lap.dokumenDiperiksa.some(s => s.manual), 'Invoice/Faktur manual lama tidak dipakai — bundel yang lebih baru menjadi sumber');
console.log('\nLULUS ' + lulus + ' cek');
