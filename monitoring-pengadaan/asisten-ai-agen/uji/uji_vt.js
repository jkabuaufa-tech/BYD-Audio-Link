// Uji Verifikasi Tagihan (modul 1.7.0) memakai transkripsi 3 berkas tagihan nyata (SPM, SPSA, SPPP).
// AI ditiru: mengembalikan data hasil baca dokumen apa adanya; mesin aturan server harus menemukan ketidaksesuaian yang sama dengan audit manual.
const fs = require('fs'), assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, S, NO, kirim, ADM, STF, LHT } = require('./vt_data.js')();
function verifikasi(id, siapa) {
  const R = siapa('vtRencana', { data: { id } }); assert.ok(R.ok, R.error);
  R.dokumen.forEach(d => { const r = siapa('vtEkstrak', { data: { id, k: d.k } }); assert.ok(r.ok, r.error); });
  const n = siapa('vtNilai', { data: { id } }); assert.ok(n.ok, n.error); LAP[id] = n.data; return n.data;
}
const LAP = {};
const kode = (L, k, t) => L.temuan.filter(x => x.kode === k && (!t || x.tingkat === t));
const cetak = L => console.log('    → ' + L.keputusan + ' · ' + JSON.stringify(L.ringkas) + '\n' + L.temuan.map(t => '      [' + t.tingkat + '] ' + t.kode + ' ' + t.judul + ' — ' + t.detail.slice(0, 110)).join('\n'));

console.log('1. Paket SPM (bahan) — CV Berkah Bintang Harapan');
let r = LHT('vtRencana', { data: { id: 'TSPM' } }); ok(r.ok && r.dokumen.length === 8 && r.dokumen.every(d => !d.cache), 'rencana: 8 PDF siap dibaca');
r = LHT('vtEkstrak', { data: { id: 'TSPM', k: 'UMUM_03' } }); ok(!r.ok && /Pengadaan/.test(r.error), 'peran LIHAT tidak dapat menjalankan pembacaan AI');
let L = verifikasi('TSPM', STF); cetak(L);
ok(/JANGAN mengarang/.test(S.sistem) && /hargaJual = nilai yang DITAGIHKAN SAAT INI/.test(S.sistem), 'prompt ekstraksi: salin apa adanya, tanpa menilai');
ok(L.keputusan === 'BUTUH REVISI', 'keputusan BUTUH REVISI');
ok(L.rekapNilai.some(x => x.dokumen === 'Invoice') && L.rekapNilai.some(x => x.dokumen === 'Faktur Pajak' && x.ppn !== null) && L.rekening.length >= 2, 'laporan memuat rekap nilai & rekening untuk BA');
ok(kode(L, 'B01', 'KRITIS').some(t => /BRI/.test(t.judul) && /30-8/.test(t.detail) && /390-8/.test(t.detail)), 'KRITIS: rekening BRI invoice ≠ surat penyaluran');
ok(kode(L, 'B02', 'MAYOR').some(t => /217401000163308/.test(t.detail) && /MANDIRI/.test(t.detail)), 'MAYOR: nomor sama, bank SPKTV "Mandiri" vs BRI');
ok(kode(L, 'L05', 'MINOR').length === 1 && /18 digit/.test(kode(L, 'L05')[0].detail), 'MINOR: nomor faktur di jurnal 18 digit');
ok(kode(L, 'I02', 'MINOR').some(t => /Baterai Segitiga Merah/.test(t.detail)) && !kode(L, 'I02').some(t => /Bintik Hitam/.test(t.detail)), 'MINOR: uraian faktur "Baterai" vs "Bendera"; tambahan kata "Hitam" tidak dianggap salah');
ok(kode(L, 'I04', 'MINOR').length === 5, 'MINOR: 5 surat jalan tanpa nomor');
ok(!kode(L, 'I01').length && !kode(L, 'I03').length && !kode(L, 'I05').length && !kode(L, 'I06').length, 'tanpa positif palsu item: nama kembar "Sepatu Boat" 26 & 38 dan surat jalan tulisan tangan cocok');
ok(!L.temuan.some(t => /^N0/.test(t.kode)), 'nilai Invoice = Kwitansi = BAP, PPN = faktur, DPP 11/12 — tidak ada temuan nilai');
ok(L.tabel.find(t => t.dokumen === 'BAP').status === 'Lolos' && L.tabel.find(t => t.dokumen === 'Kwitansi').status === 'Lolos' && L.tabel.find(t => t.dokumen === 'Surat Jalan').status === 'Tidak Sesuai' && L.tabel.find(t => t.dokumen === 'Faktur Pajak').status === 'Tidak Sesuai', 'tabel status: Kwitansi & BAP Lolos; Faktur & Surat Jalan Tidak Sesuai');

console.log('2. Paket SPSA (sewa alat) — CV Gema Multi Kencana');
L = verifikasi('TSPSA', STF); cetak(L);
ok(kode(L, 'B03', 'KRITIS').some(t => /11889088986/.test(t.detail)), 'KRITIS: rekening SPKTV 11889088986 tidak ada di dokumen vendor');
ok(kode(L, 'N05', 'MINOR').some(t => /108\.625\.002/.test(t.detail) && /108\.625\.000/.test(t.detail)), 'MINOR: DPP faktur Rp2 di atas 11/12 × harga jual');
ok(kode(L, 'I05', 'MAYOR').some(t => /Hi- Target/.test(t.detail)) && kode(L, 'I05').length === 1, 'MAYOR: GPS Hi-Target di surat jalan ≠ GPS efix yang ditagih (EFIX C5 & Total Station cocok)');
ok(!kode(L, 'I02').length && !kode(L, 'I03').length, 'uraian faktur panjang ("… Sesuai No SPSA …") tetap cocok dengan invoice');
ok(L.tabel.find(t => /BAPM/.test(t.dokumen)).status === 'Lolos' && /BAPA/.test(L.tabel.find(t => /BAPM/.test(t.dokumen)).alasan), 'BAPM digantikan BAPA (sewa alat)');

console.log('3. Paket SPPP (subkon, uang muka 20%) — CV Rizki Kurnia');
L = verifikasi('TSPPP', STF); cetak(L);
ok(L.mode === 'UANG_MUKA', 'mode uang muka terdeteksi');
ok(kode(L, 'L04', 'KRITIS').length === 1 && /03032500215605954/.test(kode(L, 'L04')[0].detail), 'KRITIS: dua faktur pajak dengan nomor seri berbeda');
ok(kode(L, 'R02', 'MINOR').some(t => /01\/BAPP/.test(t.detail)), 'MINOR: kwitansi merujuk nomor BAPP sebagai BAP');
ok(kode(L, 'R03', 'MINOR').some(t => /001134/.test(t.detail)), 'MINOR: nomor SPPP di jurnal "001134"');
ok(kode(L, 'R05', 'MINOR').some(t => /Jaminan Uang Muka/.test(t.judul) && /21 Jul 2025/.test(t.detail)), 'MINOR: jaminan uang muka menyebut tanggal kontrak 21 Juli (register 30 Juni)');
ok(L.tabel.find(t => t.dokumen === 'Surat Jalan').status === 'N/A' && /uang muka/i.test(L.tabel.find(t => t.dokumen === 'Surat Jalan').alasan), 'Surat Jalan N/A untuk uang muka');
ok(!kode(L, 'I03').length && !kode(L, 'N05').length && !kode(L, 'P01').length, 'tanpa positif palsu: item kontrak, DPP 11/12, PPh 1,75%');

console.log('4. Cache, kedaluwarsa, ringkasan & gerbang Verifikasi Admin');
S.nPanggil = 0; L = verifikasi('TSPM', STF); ok(S.nPanggil === 0, 'jalankan ulang: semua PDF dari cache (tanpa biaya AI)');
r = STF('vtRingkas'); ok(r.ok && r.data.length === 3 && r.data.every(x => x.keputusan === 'BUTUH REVISI' && !x.kedaluwarsa), 'ringkasan 3 tagihan');
let rb = LHT('vtBaca', { data: { id: 'TSPSA' } }); ok(rb.ok && rb.data.keputusan === 'BUTUH REVISI' && rb.riwayat.length === 1, 'laporan dapat dibaca peran LIHAT');
// gerbang: mode wajib
ok(ADM('vtSetel', { data: { gerbang: 'wajib', otomatis: true } }).ok, 'Admin set gerbang = wajib');
const cl = () => JSON.parse(K.bacaLog_ ? '{}' : '{}');
r = ADM('checklistVerifikasi', { data: { id: 'TSPSA', versi: 1, konfirmasiAsli: true } }); ok(!r.ok && /BUTUH REVISI/.test(r.error), 'gerbang wajib menahan Verifikasi Admin');
r = ADM('checklistVerifikasi', { data: { id: 'TSPSA', versi: 1, konfirmasiAsli: true, vtAlasan: 'Rekening sudah dikonfirmasi tertulis oleh vendor via surat 20/8' } });
ok(r.ok && r.data.verified && /Verifikasi AI: hasil verifikasi: BUTUH REVISI/.test(r.data.verifikasi.keterangan), 'dengan alasan pengecualian → terverifikasi & tercatat di keterangan');
rb = STF('vtBaca', { data: { id: 'TSPSA' } }); ok(rb.kedaluwarsa === false, 'hasil tetap berlaku (berkas tidak berubah)');
// ganti PDF → kedaluwarsa
const rec = JSON.parse(K.bacaLog_ ? '{}' : '{}');
const sh = C.__sheets[P + '_ChecklistTagihan'], baris = sh.rows.findIndex(x => x[0] === 'TSPM'), obj = JSON.parse(sh.rows[baris][6]);
obj.items.UMUM_04.file = Object.assign({}, obj.items.UMUM_04.file, { idServer: 'TSPM-UMUM_04-v2' }); sh.rows[baris][6] = JSON.stringify(obj);
r = STF('vtRingkas'); ok(r.data.find(x => x.id === 'TSPM').kedaluwarsa === true, 'PDF diganti → hasil verifikasi kedaluwarsa');
r = ADM('vtSetel', { data: { provider: 'groq' } }); ok(!r.ok && /PDF/.test(r.error), 'penyedia tanpa dukungan PDF (Groq) ditolak untuk verifikasi');
r = ADM('vtInfo'); ok(r.ok && r.penyedia.map(p => p.id).join() === 'anthropic' && r.setelan.gerbang === 'wajib', 'vtInfo: hanya penyedia pembaca PDF');
const log = K.bacaLog_(P); ok(log.some(l => l.aksi === 'VERIFIKASI TAGIHAN') && log.some(l => l.aksi === 'VERIFIKASI ADMIN DENGAN CATATAN AI') && log.some(l => l.aksi === 'AI-AKSI' && /BACA DOKUMEN/.test(l.detail)), 'jejak audit di sheet Log');
r = STF('aiTanya', { data: { mode: 'analisis', perintah: 'verifikasi-tagihan' } });
if (process.env.DUMP_VT) fs.writeFileSync(process.env.DUMP_VT, JSON.stringify(LAP));   // contoh laporan untuk uji UI
console.log('\nLULUS ' + lulus + ' cek');
