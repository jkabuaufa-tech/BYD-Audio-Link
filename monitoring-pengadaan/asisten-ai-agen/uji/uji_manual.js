// Uji modul 1.9.5: Mode manual Verifikasi Tagihan (aktif bawaan) — tidak ada PDF yang keluar ke penyedia AI.
const assert = require('assert');
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.5.json';
process.env.VT_MANUAL = '1';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, NO, ADM, STF } = require('./vt_data.js')();
const pdfKeluar = () => C.__http.filter(h => /"document"|application\/pdf|file_data|inlineData/.test(JSON.stringify(h.o.payload || ''))).length;
const folderId = K.folderProyek_(P).getId();
C.__files['BUN-M'] = { nama: 'Bundel NPWP KTP.pdf', data: 'FILE:BUN-M', induk: folderId, diubah: 5 }; C.__ekstrak['BUN-M'] = [{ jenis: 'KWITANSI', halamanMulai: 1, halamanAkhir: 1 }];
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TM', versi: 1, noKontrak: NO.spsa, tagihanKe: 5, nomorBA: '05/BAP/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
const items = {}; K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []).forEach(d => { items[d.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'TM', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
const ref = { id: 'BUN-M', idServer: 'BUN-M', nama: 'Bundel NPWP KTP.pdf', lokasi: 'server' };

console.log('1. Bawaan: mode manual aktif, PDF tidak dikirim ke AI');
let r = ADM('vtInfo'); ok(r.ok && r.setelan.tanpaAI === true, 'setelan bawaan: tanpaAI = true');
const h0 = C.__http.length;
r = STF('vtBundel', { data: { id: 'TM', file: ref } }); assert.ok(r.ok, r.error);
ok(r.segmen.length === 0 && r.provider === 'manual' && C.__http.length === h0, 'unggah bundel: tersimpan untuk pemetaan manual, 0 panggilan ke penyedia AI');
r = STF('vtBundel', { data: { id: 'TM', berkas: [{ file: ref, mulai: 1, akhir: 3 }], bacaSaja: true } }); ok(r.ok && C.__http.length === h0, 'jalur per bagian (bacaSaja): 0 panggilan AI');
const ck = STF('checklistBaca', { id: 'TM' }).data, it2 = Object.assign({}, ck.items); it2.UMUM_03 = { status: 'ADA', file: ref, tgl: '', ket: 'unggah manual' };
assert.ok(STF('checklistSimpan', { data: { id: 'TM', versi: ck.versi, items: it2, pengajuan: '', divisi: 'Infrastruktur' } }).ok);
r = STF('vtEkstrak', { data: { id: 'TM', k: 'UMUM_03' } }); ok(r.ok && r.manual && C.__http.length === h0, 'baca dokumen checklist: tidak dikirim ke AI, tanpa galat');
r = STF('vtNilai', { data: { id: 'TM' } }); ok(!r.ok && /Mode manual aktif/.test(r.error), 'verifikasi AI: ditolak dengan pesan mode manual');

console.log('2. Pembayaran tidak terkunci oleh AI; keputusan lewat Verifikasi Admin');
r = ADM('checklistVerifikasi', { data: { id: 'TM', versi: STF('checklistBaca', { id: 'TM' }).data.versi, konfirmasiAsli: true } });
ok(r.ok || !/Gerbang verifikasi/.test(r.error), 'Verifikasi Admin berjalan tanpa hasil AI' + (r.ok ? '' : ' (kernel: ' + r.error + ')'));
r = STF('keuanganProgres', { data: { id: 'TM', versi: 1, bayar: { status: 'DIAJUKAN', tglAju: '2026-10-25', noAju: 'AJU-M' } } });
ok(r.ok || !/TERKUNCI oleh Verifikasi Tagihan/.test(r.error), 'pengajuan bayar tidak dikunci gerbang AI' + (r.ok ? '' : ' (kernel: ' + r.error + ')'));

console.log('3. Tim AI tidak membaca PDF tagihan');
r = ADM('timJalan', { data: {} });
ok(pdfKeluar() === 0, 'Tim AI dijalankan: 0 PDF terkirim ke AI' + (r.ok ? '' : ' (' + String(r.error).slice(0, 80) + ')'));

console.log('4. Hanya Admin yang dapat mematikan mode manual; UI lama tidak mengubahnya');
r = STF('vtSetel', { data: { tanpaAI: false } }); ok(!r.ok, 'staf tidak dapat mengubah');
r = ADM('vtSetel', { data: { gerbang: 'kunci' } }); ok(r.ok && r.setelan.tanpaAI === true, 'simpan setelan dari layar lama (tanpa field tanpaAI) → tetap manual');
r = ADM('vtSetel', { data: { tanpaAI: false } }); ok(r.ok && r.setelan.tanpaAI === false, 'Admin mematikan mode manual');
r = STF('vtBundel', { data: { id: 'TM', file: ref, paksa: true } }); ok(r.ok && pdfKeluar() === 1, 'setelah dimatikan, AI membaca bundel lagi (1 PDF terkirim)');
ADM('vtSetel', { data: { tanpaAI: true } });
const log = JSON.stringify(K.bacaLog_ ? K.bacaLog_(P) : []);
ok(/UBAH SETELAN VERIFIKASI TAGIHAN/.test(log) && /tanpaAI/.test(log), 'setiap perubahan tercatat di Log');
ADM('vtSetel', { data: { tanpaAI: true, gerbang: 'wajib', npwpPembeli: '0010016145093000' } });
ADM('aiSetel', { data: { bawaanId: 'anthropic', kuota: 150, peran: ['ADMIN', 'PENGADAAN'] } });
r = ADM('vtInfo'); ok(r.setelan.tanpaAI === true && r.setelan.gerbang === 'wajib', 'simpan Setelan Asisten AI tidak menghapus Setelan Verifikasi (mode manual & gerbang tetap)');
console.log('\nLULUS ' + lulus + ' cek mode manual (1.9.5)');
