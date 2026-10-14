// Uji modul 1.7.0: 1 PDF bundel (seluruh dokumen tagihan SPSA dalam satu scan) → pisah & klasifikasi → checklist → verifikasi → gerbang kunci (verifikasi & bayar).
const assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, S, NO, ADM, STF } = require('./vt_data.js')();
const folderId = K.folderProyek_(P).getId();

// bundel: dokumen SPSA berurutan, halaman diberi nomor seperti hasil pindai
let hal = 1; const isi = [];
['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_07', 'UMUM_08', 'ALAT_09'].forEach(k => C.__ekstrak['TSPSA-' + k].forEach(d => {
  const n = d.jenis === 'BAP' || d.jenis === 'SURAT_JALAN' ? 2 : 1; isi.push(Object.assign({}, d, { halamanMulai: hal, halamanAkhir: hal + n - 1 })); hal += n; }));
C.__files['BUN-SPSA'] = { nama: 'Bundel SPSA 001.pdf', data: 'FILE:BUN-SPSA', induk: folderId, diubah: 5 }; C.__ekstrak['BUN-SPSA'] = isi;
const ref = { id: 'BUN-SPSA', idServer: 'BUN-SPSA', nama: 'Bundel SPSA 001.pdf', lokasi: 'server' };
// tagihan ke-2 kontrak SPSA dengan checklist kosong (belum ada PDF)
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TB1', versi: 1, noKontrak: NO.spsa, tagihanKe: 2, nomorBA: '02/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
const items = {}; K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []).forEach(d => { items[d.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'TB1', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);

console.log('1. Pisah & klasifikasi bundel');
S.nPanggil = 0;
let r = STF('vtBundel', { data: { id: 'TB1', file: ref } }); assert.ok(r.ok, r.error);
ok(S.nPanggil === 1 && !r.cache && r.segmen.length === isi.length, 'satu panggilan AI untuk seluruh bundel → ' + r.segmen.length + ' dokumen');
ok(/BUNDEL scan dokumen tagihan/.test(S.sistem + JSON.stringify(C.__http[C.__http.length - 1].o.payload)) && /halamanMulai/.test(S.sistem), 'prompt meminta pemisahan per halaman (halamanMulai/halamanAkhir)');
const U = {}; r.usulan.forEach(x => { U[x.k] = x; });
ok(['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_07', 'UMUM_08'].every(k => U[k]) && U.UMUM_08.nama === 'BAPA', 'usulan pemetaan ke item checklist (BAPA → UMUM_08 kategori Alat)');
ok(U.UMUM_07.halaman === '7–8' && /Bundel hal\. 7–8/.test(U.UMUM_07.ket), 'halaman BAP 7–8 tercatat di keterangan item');
ok(r.tanpaPeta.some(t => /Surat Jalan hal\. 10–11/.test(t)) && r.tanpaPeta.some(t => /Surat Penyaluran/.test(t)), 'dokumen tanpa item checklist kategori ini dilaporkan (Surat Jalan, Surat Penyaluran)');
const seg = r.segmen.find(z => z.jenis === 'FAKTUR_PAJAK');
ok(seg.nilai.dpp === 108625002 && seg.nilai.ppn === 13035000 && seg.nomorSeriFaktur, 'segmen faktur memuat DPP, PPN & nomor seri');
ok(r.segmen.find(z => z.jenis === 'INVOICE').rekening.length > 0, 'segmen invoice memuat rekening');
r = STF('vtBundel', { data: { id: 'TB1', file: ref } }); ok(r.ok && r.cache && S.nPanggil === 1, 'proses ulang bundel: dari cache (tanpa biaya AI)');
r = STF('vtBundelBaca', { data: { id: 'TB1' } }); ok(r.ok && r.data && r.data.segmen.length === isi.length && r.data.file.idServer === 'BUN-SPSA', 'vtBundelBaca: hasil pemisahan tersimpan untuk pratinjau');
r = ADM('vtBundel', { data: { id: 'TB1', file: { id: 'X', idServer: 'BUKAN-PROYEK', lokasi: 'server' } } }); ok(!r.ok, 'berkas di luar folder proyek ditolak');

console.log('2. Terapkan ke checklist → verifikasi');
const ck = STF('checklistBaca', { id: 'TB1' }).data, it2 = Object.assign({}, ck.items);
Object.keys(U).forEach(k => { it2[k] = { status: 'ADA', file: ref, tgl: U[k].tgl, ket: U[k].ket }; });
r = STF('checklistSimpan', { data: { id: 'TB1', versi: ck.versi, items: it2, pengajuan: '', divisi: 'Infrastruktur' } }); ok(r.ok, 'checklist disimpan kernel: satu PDF bundel untuk ' + Object.keys(U).length + ' item');
r = STF('vtRencana', { data: { id: 'TB1' } }); ok(r.ok && r.dokumen.length === 1 && r.dokumen[0].cache, 'rencana: bundel dibaca sekali & sudah di cache');
r = STF('vtEkstrak', { data: { id: 'TB1', k: r.dokumen[0].k } }); ok(r.ok && r.cache && S.nPanggil === 1, 'ekstraksi memakai hasil pemisahan bundel');
const lap = STF('vtNilai', { data: { id: 'TB1' } }).data;
const kode = k => lap.temuan.some(t => t.kode === k);
ok(lap.keputusan === 'BUTUH REVISI' && kode('B03') && kode('I05') && kode('N05'), 'temuan sama dengan PDF terpisah: B03 kritis, I05 mayor, N05 minor');
ok(!lap.temuan.some(t => t.kode === 'L04') && lap.rekapNilai.filter(x => x.dokumen === 'Invoice').length === 1, 'dokumen bundel tidak terhitung ganda');

console.log('3. Gerbang kunci (bawaan) — Verifikasi Admin & bayar');
r = ADM('vtInfo'); ok(r.setelan.gerbang === 'kunci', 'gerbang bawaan 1.7.0 = kunci');
r = ADM('checklistVerifikasi', { data: { id: 'TB1', versi: STF('checklistBaca', { id: 'TB1' }).data.versi, konfirmasiAsli: true, vtAlasan: 'Alasan pengecualian yang panjang sekali untuk uji' } });
ok(!r.ok && /TERKUNCI/.test(r.error), 'Kritis/Mayor: Verifikasi Admin terkunci walau ada alasan');
ADM('vtSetel', { data: { gerbang: 'peringatan' } });
r = ADM('checklistVerifikasi', { data: { id: 'TB1', versi: STF('checklistBaca', { id: 'TB1' }).data.versi, konfirmasiAsli: true } }); ok(r.ok, 'mode peringatan: Admin dapat memverifikasi (tercatat)');
ADM('vtSetel', { data: { gerbang: 'kunci' } });
const bayar = { id: 'TB1', versi: 1, bayar: { status: 'DIAJUKAN', tglAju: '2026-10-14', noAju: 'AJU-01' } };
r = STF('keuanganProgres', { data: bayar }); ok(!r.ok && /Pembayaran TERKUNCI/.test(r.error), 'pengajuan bayar ditolak selama temuan Kritis/Mayor belum selesai');
ADM('vtSetel', { data: { gerbang: 'peringatan' } });
r = STF('keuanganProgres', { data: bayar }); ok(r.ok && r.data.bayar.status === 'DIAJUKAN', 'mode peringatan: logika bayar kernel berjalan seperti semula (DIAJUKAN)' + (r.ok ? '' : ' — ' + r.error));
r = STF('keuanganProgres', { data: { id: 'TSPM', catatan: 'uji' } }); ok(r.ok || !/TERKUNCI/.test(r.error), 'perubahan keuangan tanpa ubah status bayar tidak tersentuh gerbang');
ADM('vtSetel', { data: { gerbang: 'kunci' } });

console.log('4. Hasil baca besar disimpan beberapa baris');
const besar = []; for (let i = 0; i < 8; i++) besar.push({ jenis: 'SURAT_JALAN', nomor: 'SJ-' + i, tanggal: '2025-07-0' + (i + 1), halamanMulai: i + 1, halamanAkhir: i + 1,
  item: Array.from({ length: 100 }, (_, j) => ({ uraian: 'Material uji nomor ' + j + ' dengan uraian panjang untuk mengisi sel '.repeat(3), qty: j + 1, satuan: 'Pcs' })), keyakinan: 0.9 });
C.__files['BUN-BESAR'] = { nama: 'Bundel besar.pdf', data: 'FILE:BUN-BESAR', induk: folderId, diubah: 7 }; C.__ekstrak['BUN-BESAR'] = besar;
const refB = { id: 'BUN-BESAR', idServer: 'BUN-BESAR', nama: 'Bundel besar.pdf', lokasi: 'server' };
r = STF('vtBundel', { data: { id: 'TB1', file: refB } }); assert.ok(r.ok, r.error);
const baris = C.__sheets[P + '_VerifikasiEkstrak'].rows.filter(x => x[0] && String(x[0]).indexOf('BUN-BESAR') === 0);
ok(baris.length > 1 && baris.every(x => /^\d+\/\d+$/.test(x[6])), 'hasil ' + baris.length + ' bagian (kolom Bagian i/n)');
r = STF('vtBundel', { data: { id: 'TB1', file: refB } }); ok(r.ok && r.cache && r.segmen.length === 8, 'bagian digabung kembali saat dibaca (cache utuh)');
const log = K.bacaLog_(P);
ok(log.some(l => l.aksi === 'AI-AKSI' && /PISAH BUNDEL/.test(l.detail)) && log.some(l => l.aksi === 'GERBANG VERIFIKASI TERKUNCI') && log.some(l => l.aksi === 'GERBANG BAYAR TERKUNCI'), 'jejak audit: PISAH BUNDEL, gerbang verifikasi & bayar terkunci');

console.log('5. 1.7.1 — bundel > 10 MB dipecah menjadi 3 bagian PDF ≤ 10 MB');
const bagian = [[1, 6], [7, 9], [10, 11]].map(([m, a], i) => { const id = 'BAG-' + (i + 1); C.__files[id] = { nama: 'Bundel SPSA 003 (bagian ' + (i + 1) + ' dari 3).pdf', data: 'FILE:' + id, induk: folderId, diubah: 11 };
  C.__ekstrak[id] = isi.filter(d => d.halamanMulai >= m && d.halamanMulai <= a).map(d => Object.assign({}, d, { halamanMulai: d.halamanMulai - m + 1, halamanAkhir: d.halamanAkhir - m + 1 }));
  return { file: { id, idServer: id, nama: C.__files[id].nama, lokasi: 'server' }, mulai: m, akhir: a }; });
const L3 = K.bacaKoleksi_(P, 'progres'); L3.push({ id: 'TB2', versi: 1, noKontrak: NO.spsa, tagihanKe: 3, nomorBA: '03/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L3);
K.cl217SimpanBaris_(P, { id: 'TB2', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items: JSON.parse(JSON.stringify(items)), verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
S.nPanggil = 0;
bagian.forEach(b => { const x = STF('vtBundel', { data: { id: 'TB2', berkas: [b], bacaSaja: true } }); assert.ok(x.ok, x.error); });
ok(S.nPanggil === 3, 'tiap bagian dibaca AI dalam panggilan terpisah (3 panggilan, menghindari batas waktu)');
r = STF('vtBundel', { data: { id: 'TB2', berkas: bagian } }); assert.ok(r.ok, r.error);
ok(S.nPanggil === 3 && r.cache && r.berkas.length === 3, 'penyusunan peta memakai cache ketiga bagian (tanpa biaya AI tambahan)');
const U2 = {}; r.usulan.forEach(x => { U2[x.k] = x; });
ok(U2.UMUM_07.halaman === '7–8' && U2.UMUM_07.file.idServer === 'BAG-2' && /bagian 2\/3/.test(U2.UMUM_07.ket) && U2.UMUM_03.file.idServer === 'BAG-1', 'halaman global bundel (BAP 7–8) & item menunjuk bagian yang memuat dokumennya');
ok(r.segmen.find(z => z.jenis === 'SURAT_JALAN').halamanMulai === 10 && r.segmen.find(z => z.jenis === 'SURAT_JALAN').b === 2, 'surat jalan di bagian 3 → hal. 10');
const ck2 = STF('checklistBaca', { id: 'TB2' }).data, it3 = Object.assign({}, ck2.items);
Object.keys(U2).forEach(k => { it3[k] = { status: 'ADA', file: U2[k].file, tgl: U2[k].tgl, ket: U2[k].ket }; });
r = STF('checklistSimpan', { data: { id: 'TB2', versi: ck2.versi, items: it3, pengajuan: '', divisi: 'Infrastruktur' } }); ok(r.ok, 'checklist disimpan kernel (setiap bagian ≤ 10 MB lolos validasi lampiran)');
const lap2 = STF('vtNilai', { data: { id: 'TB2' } }).data, kd = k => lap2.temuan.some(t => t.kode === k);
ok(kd('B03') && kd('I05') && kd('N05') && lap2.dokumenDiperiksa.some(d => /bagian 3\/3/.test(d.nama)), 'verifikasi memeriksa seluruh bagian (I05 dari surat jalan di bagian 3 yang tidak dipetakan)');
ok(!kd('L04') && lap2.rekapNilai.filter(x => x.dokumen === 'Invoice').length === 1, 'tanpa temuan ganda antar-bagian');
r = STF('vtBundelBaca', { data: { id: 'TB2' } }); ok(r.data.berkas.length === 3 && r.data.berkas[2].mulai === 10, 'vtBundelBaca menyimpan daftar bagian & halaman awalnya');
// dokumen terpotong di batas bagian: BAP hal. 7–8 dipecah 7 | 8
const pot = [[1, 7], [8, 11]].map(([m, a], i) => { const id = 'POT-' + (i + 1); C.__files[id] = { nama: 'Bundel potong ' + (i + 1) + '.pdf', data: 'FILE:' + id, induk: folderId, diubah: 12 };
  C.__ekstrak[id] = isi.filter(d => d.halamanAkhir >= m && d.halamanMulai <= a).map(d => Object.assign({}, d, { halamanMulai: Math.max(d.halamanMulai, m) - m + 1, halamanAkhir: Math.min(d.halamanAkhir, a) - m + 1, nilai: d.jenis === 'BAP' && i === 1 ? {} : d.nilai }));
  return { file: { id, idServer: id, nama: C.__files[id].nama, lokasi: 'server' }, mulai: m, akhir: a }; });
pot.forEach(b => STF('vtBundel', { data: { id: 'TB2', berkas: [b], bacaSaja: true } }));
r = STF('vtBundel', { data: { id: 'TB2', berkas: pot } }); assert.ok(r.ok, r.error);
const baps = r.segmen.filter(z => z.jenis === 'BAP');
ok(baps.length === 1 && baps[0].halamanMulai === 7 && baps[0].halamanAkhir === 8 && baps[0].nilai.total, 'BAP terpotong di batas bagian digabung menjadi satu dokumen hal. 7–8');
console.log('\nLULUS ' + lulus + ' cek');
