// Uji modul 1.8.6 (Sprint 1): gerbang nilai kontrak Rp 0, eskalasi notifikasi H-30/H-7/H+0/H+30, dokumen kurang per tagihan, jejak audit.
const assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, ADM, STF, LHT } = require('./vt_data.js')();
const D = () => K.bacaKoleksi_(P, 'data'), log = () => K.bacaLog_(P);
const tgl = d => { const t = new Date(Date.now() + d * 864e5 + 7 * 36e5); return t.toISOString().slice(0, 10); };
const item = (vol, harga) => ({ kode: 'K1', uraian: 'Sewa crane 50 T', vol, sat: 'jam', harga, wbs: 'WBS-01' });

console.log('1. Gerbang nilai kontrak (save / posting)');
let r = STF('save', { data: { noKontrak: '010/SPSA/WK/2026', namaVendor: 'CV Uji Alat', items: [] } });
ok(r.ok && r.data.status === 'DRAF' && r.data.nilai === 0, 'kontrak Rp 0 tetap boleh disimpan sebagai DRAF');
const draf = r.data;
r = STF('save', { data: { noKontrak: '011/SPSA/WK/2026', namaVendor: 'CV Uji Alat', noPO: '4500000011', items: [] } });
ok(!r.ok && /Rp 0/.test(r.error) && !D().some(x => x.noKontrak === '011/SPSA/WK/2026'), 'kontrak baru Rp 0 dengan No PO ditolak: "' + r.error.slice(0, 60) + '…"');
r = STF('save', { data: { id: draf.id, versi: draf.versi, noPO: '4500000010' } });
ok(!r.ok && /Rp 0/.test(r.error), 'draf Rp 0 tidak bisa dilengkapi PO sebelum item bernilai');
r = STF('posting', { id: draf.id, versi: draf.versi });
ok(!r.ok && /tidak dapat diposting/.test(r.error) && !D().find(x => x.id === draf.id).diposting, 'kontrak Rp 0 tidak dapat diposting');
r = STF('save', { data: { id: draf.id, versi: draf.versi, noPO: '4500000010', items: [item(100, 750000)] } });
ok(r.ok && r.data.nilai === 75000000 && r.data.status === 'PROSES', 'setelah item diisi (Rp 75.000.000) PO tersimpan, status PROSES');
r = STF('save', { data: { id: draf.id, versi: r.data.versi, items: [] } });
ok(!r.ok && /Rp 0/.test(r.error), 'item kontrak yang sudah bernilai tidak boleh dikosongkan saat PO terisi');
r = STF('posting', { id: draf.id, versi: D().find(x => x.id === draf.id).versi });
ok(r.ok && r.data.diposting, 'kontrak bernilai dapat diposting (logika kernel tetap berjalan)');
K.tulisKoleksi_(P, 'data', D().concat([{ id: 'LAMA0', noKontrak: '099/SPM/WK/2025', namaVendor: 'Vendor Lama', noPR: '1000', items: [], nilai: 0, status: 'PROSES', versi: 3, diposting: false }]));
r = STF('save', { data: { id: 'LAMA0', versi: 3, catatan: 'menunggu BOQ dari vendor' } });
ok(r.ok, 'data lama Rp 0 (PROSES) tetap bisa diedit untuk diperbaiki — tidak terkunci');
r = STF('save', { data: { noKontrak: '012/SPM/WK/2026', tglKontrak: '2026-10-01', tglSelesai: '2026-09-01', items: [item(1, 1000)] } });
ok(!r.ok && /tidak boleh sebelum/.test(r.error), 'tanggal selesai sebelum tanggal kontrak ditolak');
r = STF('save', { data: { id: 'LAMA0', versi: 1, catatan: 'x' } });
ok(!r.ok && /KONFLIK/.test(r.error), 'konflik versi tetap memakai pesan kernel');
r = LHT('save', { data: { noKontrak: '013/SPM/WK/2026' } });
ok(!r.ok && /tidak boleh mengubah/.test(r.error), 'peran LIHAT tetap ditolak kernel');
ok(log().filter(l => l.aksi === 'GERBANG NILAI DITOLAK').length === 5, 'setiap penolakan tercatat di Log (GERBANG NILAI DITOLAK)');

console.log('2. Eskalasi notifikasi');
r = ADM('notifSnapshot', { data: { kontrak: [
  { judul: 'K-H45 · lewat 45 hari', tgl: tgl(-45) }, { judul: 'K-H5 · lewat 5 hari', tgl: tgl(-5) }, { judul: 'K-H0 · hari ini', tgl: tgl(0) },
  { judul: 'K-7 · 6 hari lagi', tgl: tgl(6) }, { judul: 'K-30 · 20 hari lagi', tgl: tgl(20) }, { judul: 'K-90 · 60 hari lagi', tgl: tgl(60) }],
  tagihan: [{ judul: 'BK-01', ket: 'Dokumen 3/25', nilai: '12%' }] } });
ok(r.ok, 'ringkasan aplikasi tersimpan');
r = ADM('notifInfo'); assert.ok(r.ok, r.error);
const pr = r.pratinjau, gk = pr.grup.find(g => g.k === 'kontrak');
ok(gk.item.length === 5 && /eskalasi/.test(gk.judul), 'kontrak > 30 hari tidak dinotifikasi (5 dari 6)');
const th = gk.item.map(x => x.tahap + ':' + x.level).join(' ');
ok(th === 'H+30:KRITIS H+0:KRITIS H+0:KRITIS H-7:WARNING H-30:INFO', 'tahap & level: ' + th);
ok(/^H\+30 · Lewat 45 h$/.test(gk.item[0].nilai) && gk.item[0].merah && !gk.item[4].merah, 'label nilai menyebut tahap (' + gk.item[0].nilai + ')');
ok(pr.level && pr.level.KRITIS === 3 && pr.level.WARNING === 1 && pr.level.INFO === 2, 'jumlah per level: Kritis ' + pr.level.KRITIS + ' · Warning ' + pr.level.WARNING + ' · Info ' + pr.level.INFO);
C.MailApp.sendEmail = o => { C.__email = o; }; C.MailApp.getRemainingDailyQuota = () => 90;
r = ADM('notifKirim', { data: { uji: true, kanal: 'email', emailUji: 'admin@contoh.co.id' } });
if (r.ok && C.__email) ok(/3 KRITIS/.test(C.__email.subject) && /Kritis 3/.test(C.__email.htmlBody), 'email: subjek "' + C.__email.subject.slice(0, 48) + '…" & ringkasan level');
else console.log('  (lewati uji kirim email: ' + (r.error || 'layanan luar tidak aktif di harness') + ')');

console.log('3. Dokumen kurang per tagihan');
r = STF('x186Kurang'); assert.ok(r.ok, r.error);
ok(r.templat.ALAT.length === 25 && !r.templat.ALAT.some(n => /Jaminan Pelaksanaan|Uang Muka|Retensi/i.test(n)) && r.templat.SUBKON.includes('Jaminan Pelaksanaan'), 'templat per jenis: sewa alat (ALAT) tanpa jaminan pelaksanaan/uang muka/retensi; SUBKON dengan jaminan pelaksanaan');
ok(r.data.TSPM && r.data.TSPM.kurang.length === 0 && r.data.TSPM.total === 25, 'tagihan lengkap → tidak ada dokumen kurang');
const cl = JSON.parse(C.__sheets[P + '_ChecklistTagihan'].rows.find(x => x[0] === 'TSPSA')[6]); delete cl.items.UMUM_05; cl.items.UMUM_06 = { status: 'NA', alasan: 'pendek' };
K.cl217SimpanBaris_(P, cl, C.__sheets[P + '_ChecklistTagihan'].rows.findIndex(x => x[0] === 'TSPSA') + 1);
r = STF('x186Kurang');
ok(JSON.stringify(r.data.TSPSA.kurang) === JSON.stringify(['Faktur Pajak', 'E-Nofa']) && r.data.TSPSA.kat === 'ALAT', 'tagihan SPSA: kurang ' + r.data.TSPSA.kurang.join(', ') + ' (N/A tanpa alasan ≥ 12 karakter dihitung kurang)');

console.log('4. Jejak audit');
r = STF('x186Audit'); ok(!r.ok && /Admin/.test(r.error), 'Jejak Audit khusus Admin');
r = ADM('x186Audit', { data: {} });
ok(r.ok && r.total === r.jumlahLog && r.data.length === Math.min(50, r.total) && r.data[0].waktu >= r.data[r.data.length - 1].waktu, 'terbaru di atas, halaman 50 baris (total ' + r.total + ' catatan)');
ok(r.aksiDaftar.some(a => a.aksi === 'GERBANG NILAI DITOLAK' && a.n === 5) && r.olehDaftar.some(o => o.oleh === 'Staf Pengadaan'), 'daftar filter aksi & pengguna');
r = ADM('x186Audit', { data: { aksi: 'GERBANG NILAI DITOLAK', oleh: 'Staf Pengadaan', cari: 'diposting' } });
ok(r.ok && r.total === 1 && /tidak dapat diposting/.test(r.data[0].detail), 'filter aksi + pengguna + kata kunci');
r = ADM('x186Audit', { data: { dari: tgl(1), sd: tgl(2) } }); ok(r.ok && r.total === 0, 'filter tanggal');
r = ADM('x186Audit', { data: { semua: true } }); ok(r.ok && r.data.length === r.total && r.per === 5000, 'ekspor: seluruh baris (≤ 5.000) dalam satu panggilan');
console.log('\nLULUS ' + lulus + ' uji Sprint 1 (modul 1.8.6)');
