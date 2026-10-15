// Uji modul 1.8.0: (1) bundel = sumber utama verifikasi tanpa "Terapkan"; (2) pesan galat 502 HTML; (3) Tim AI Proyek (jalan manual, jatah PDF, saran, jadwal, email).
const assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, S, NO, ADM, STF, LHT } = require('./vt_data.js')();
const folderId = K.folderProyek_(P).getId();

// AI tiruan: PDF → transkripsi (vt_data); tanpa PDF → laporan Tim AI (JSON)
const bacaPdf = C.__jawabHTTP; S.nTim = 0; S.timSistem = '';
C.__jawabHTTP = (u, o) => {
  if (JSON.stringify(JSON.parse(o.payload).messages).indexOf('"document"') >= 0) return bacaPdf(u, o);
  S.nTim++; S.timSistem = JSON.parse(o.payload).system;
  return { kode: 200, teks: { content: [{ type: 'text', text: JSON.stringify({ ringkasan: 'Tim AI: 1 tagihan diverifikasi, 2 tertunda karena jatah baca PDF.',
    temuan: [{ judul: 'Faktur pajak SPPP ganda', detail: 'Dua nomor seri faktur untuk uang muka', tingkat: 'tinggi', anggota: 'verifikator' }],
    saran: [{ judul: 'Telusuri stok material', aksi: 'gudangBaca', arg: { cari: 'Semen' }, dampak: 'cek saldo', anggota: 'gudang', prioritas: 'sedang', pj: 'Gudang', tenggat: '2026-10-20' },
      { judul: 'Hapus semua data', aksi: 'hapusSemua', arg: {}, dampak: 'tidak sah', anggota: 'bukan-anggota', prioritas: 'kritis' }] }) }], usage: {} } };
};

console.log('1. Bundel = sumber utama verifikasi (tanpa Terapkan ke checklist)');
// TB3: checklist diisi PDF per item (unggahan manual lama) — rekening invoice BEDA; bundel benar diunggah kemudian
let hal = 1; const isi = [];
['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_07', 'UMUM_08', 'ALAT_09'].forEach(k => C.__ekstrak['TSPSA-' + k].forEach(d => {
  const n = d.jenis === 'BAP' ? 2 : 1; isi.push(Object.assign({}, d, { halamanMulai: hal, halamanAkhir: hal + n - 1 })); hal += n; }));
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TB3', versi: 1, noKontrak: NO.spsa, tagihanKe: 4, nomorBA: '04/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
const items = {}; K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []).forEach(d => { items[d.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
const inv = JSON.parse(JSON.stringify(C.__ekstrak['TSPSA-UMUM_04'])); inv[0].nilai.total = 999; inv[0].nomor = 'INV-MANUAL-LAMA';
C.__files['MAN-INV'] = { nama: 'Invoice manual.pdf', data: 'FILE:MAN-INV', induk: folderId, diubah: 1 }; C.__ekstrak['MAN-INV'] = inv;
items.UMUM_04 = { status: 'ADA', file: { id: 'MAN-INV', idServer: 'MAN-INV', nama: 'Invoice manual.pdf', lokasi: 'server' } };
K.cl217SimpanBaris_(P, { id: 'TB3', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
C.__files['BUN-TB3'] = { nama: 'Bundel TB3.pdf', data: 'FILE:BUN-TB3', induk: folderId, diubah: 2 }; C.__ekstrak['BUN-TB3'] = isi;
let r = STF('vtBundel', { data: { id: 'TB3', file: { id: 'BUN-TB3', idServer: 'BUN-TB3', nama: 'Bundel TB3.pdf', lokasi: 'server' } } }); assert.ok(r.ok, r.error);
r = STF('vtRencana', { data: { id: 'TB3' } });
ok(r.dokumen[0].k === 'BUNDEL:0' && r.dokumen[0].cache && !r.dokumen.some(d => d.k === 'UMUM_04'), 'rencana: bundel dibaca pertama; invoice manual tidak dibaca ulang (sudah ada di bundel)');
S.nPanggil = 0; let lap = STF('vtNilai', { data: { id: 'TB3' } }).data;
ok(S.nPanggil === 0 && lap.dokumenDiperiksa[0].k === 'BUNDEL', 'verifikasi langsung memakai bundel tanpa Terapkan & tanpa biaya AI tambahan');
ok(lap.rekapNilai.find(x => x.dokumen === 'Invoice').nomor === '001/GMK-WK/ALT/VII/2025', 'nilai invoice diambil dari bundel, bukan unggahan manual lama');
// item manual dibaca lebih dahulu (cache) → tetap tidak menggandakan jenis yang ada di bundel
STF('vtEkstrak', { data: { id: 'TB3', k: 'UMUM_04' } }); lap = STF('vtNilai', { data: { id: 'TB3' } }).data;
ok(lap.rekapNilai.filter(x => x.dokumen === 'Invoice').length === 1 && lap.dokumenDiperiksa.some(d => d.k === 'UMUM_04' && /bundel dipakai/.test(d.diganti)), 'invoice manual yang sudah terbaca diganti dokumen bundel (tidak ganda)');
ok(!STF('vtRingkas').data.find(x => x.id === 'TB3').kedaluwarsa, 'hasil segar setelah verifikasi');
C.__files['BUN-TB3b'] = { nama: 'Bundel TB3 revisi.pdf', data: 'FILE:BUN-TB3b', induk: folderId, diubah: 3 }; C.__ekstrak['BUN-TB3b'] = isi;
STF('vtBundel', { data: { id: 'TB3', file: { id: 'BUN-TB3b', idServer: 'BUN-TB3b', nama: 'Bundel TB3 revisi.pdf', lokasi: 'server' } } });
ok(STF('vtRingkas').data.find(x => x.id === 'TB3').kedaluwarsa && /kedaluwarsa/.test(STF('vtBaca', { data: { id: 'TB3' } }).kedaluwarsa ? 'kedaluwarsa' : ''), 'bundel baru diunggah → hasil lama otomatis kedaluwarsa (gerbang menuntut verifikasi ulang)');

console.log('2. Galat 502 Bad Gateway');
const j0 = C.__jawabHTTP; C.__jawabHTTP = () => ({ kode: 502, teks: '<html><head><title>502 Bad Gateway</title></head><body>cloudflare</body></html>' });
C.__files['BUN-502'] = { nama: 'Bundel 502.pdf', data: 'FILE:BUN-502', induk: folderId, diubah: 4 };
r = STF('vtBundel', { data: { id: 'TB3', berkas: [{ file: { id: 'BUN-502', idServer: 'BUN-502', nama: 'Bundel 502.pdf', lokasi: 'server' }, mulai: 1, akhir: 4 }], bacaSaja: true } });
ok(!r.ok && /HTTP 502/.test(r.error) && /gangguan/.test(r.error) && !/endpoint\/model kemungkinan salah/.test(r.error), '502 HTML: dijelaskan sebagai gangguan server penyedia (bukan salah endpoint): ' + r.error.slice(0, 120));
C.__jawabHTTP = () => ({ kode: 404, teks: '<html><title>404 Not Found</title></html>' });
r = STF('vtBundel', { data: { id: 'TB3', berkas: [{ file: { id: 'BUN-502', idServer: 'BUN-502', nama: 'Bundel 502.pdf', lokasi: 'server' }, mulai: 1, akhir: 4 }], bacaSaja: true } });
ok(!r.ok && /endpoint\/model kemungkinan salah/.test(r.error), '404 HTML tetap menunjuk endpoint/model');
C.__jawabHTTP = j0;

console.log('3. Tim AI Proyek — jalan manual');
r = LHT('timInfo'); ok(r.ok && r.anggota.length >= 5 && !r.bolehJalan && !r.laporan, 'timInfo: 5 anggota tim, peran Lihat hanya melihat');
r = STF('timInfo'); ok(r.antrean.length >= 3 && r.antrean[0].bundel, 'antrean verifikasi: tagihan lengkap/berbundel tanpa hasil segar (bundel didahulukan)');
r = LHT('timJalan'); ok(!r.ok && /Pengadaan\/Admin/.test(r.error), 'peran Lihat tidak dapat menjalankan tim');
S.nPanggil = 0; S.nTim = 0;
r = STF('timJalan'); assert.ok(r.ok, r.error); const T = r.data;
const vTB3 = T.verifikasi.diverifikasi.find(x => x.id === 'TB3');
ok(vTB3 && vTB3.dibaca === 0 && T.log.some(l => /hasil baca tersimpan · sumber bundel/.test(l.teks)), 'Verifikator memverifikasi ulang TB3 (bundel revisi) memakai hasil baca bundel tersimpan — tanpa baca ulang');
ok(T.verifikasi.diverifikasi.length >= 2 && T.verifikasi.tertunda.some(x => /jatah baca/.test(x.alasan)), 'jatah 12 PDF per jalan dihormati: ' + T.verifikasi.diverifikasi.length + ' diverifikasi, ' + T.verifikasi.tertunda.length + ' tertunda');
ok(S.nTim === 1 && /MODE TIM AI PROYEK/.test(S.timSistem) && T.ai, 'Penyusun Laporan memakai 1 panggilan AI (' + T.ai + ')');
ok(T.saran.some(z => z.jenis === 'buka' && z.anggota === 'verifikator' && /perbaikan dokumen/.test(z.judul)), 'saran pasti: surat permintaan perbaikan untuk tagihan BUTUH REVISI');
const zG = T.saran.find(z => z.aksi === 'gudangBaca'), zH = T.saran.find(z => /Hapus semua/.test(z.judul));
ok(zG && zG.jenis === 'aksi' && zG.pj === 'Gudang' && zG.tenggat === '2026-10-20', 'saran AI dengan aksi dari daftar resmi (PJ & tenggat)');
ok(zH && zH.jenis === 'manual' && !zH.aksi && zH.anggota === 'pelapor' && zH.prioritas === 'sedang', 'aksi di luar daftar dibuang; anggota/prioritas tak dikenal dinormalkan');
ok(T.log.some(l => l.anggota === 'gudang') && T.log.some(l => l.anggota === 'kontrak') && T.metrik.tagihanTertahan >= 0, 'log kerja per anggota & metrik proyek');
ok(K.bacaLog_(P).some(l => l.aksi === 'VERIFIKASI TAGIHAN' && l.oleh === 'TIM AI') && K.bacaLog_(P).some(l => l.aksi === 'TIM AI'), 'jejak audit: verifikasi oleh "TIM AI" & putaran tim tercatat');
r = STF('timJalan'); ok(!r.ok && /baru saja bekerja/.test(r.error), 'jeda 5 menit antar-jalan manual');
r = STF('timInfo'); ok(r.laporan && r.laporan.saran.every(z => z.status === 'baru') && r.riwayat.length === 1, 'timInfo menampilkan laporan terakhir & riwayat');

console.log('4. Saran: tandai selesai / abaikan');
r = LHT('timSaran', { data: { sid: zH.sid, status: 'abaikan' } }); ok(!r.ok, 'peran Lihat tidak dapat menandai saran');
r = STF('timSaran', { data: { sid: zH.sid, status: 'abaikan', judul: zH.judul } }); ok(r.ok, 'Staf menandai saran "abaikan"');
STF('timSaran', { data: { sid: zG.sid, status: 'selesai', judul: zG.judul } });
r = STF('timInfo'); ok(r.laporan.saran.find(z => z.sid === zG.sid).status === 'selesai' && r.laporan.saran.find(z => z.sid === zH.sid).status === 'abaikan', 'status saran tersimpan');
C.__cache['TIM_JALAN_' + P] = '0';
r = STF('timJalan'); assert.ok(r.ok, r.error);
ok(!r.data.saran.some(z => z.sid === zH.sid) && r.data.saran.some(z => z.sid === zG.sid), 'saran yang diabaikan tidak muncul lagi pada putaran berikutnya');
ok(r.data.verifikasi.diverifikasi.length >= 1, 'putaran ke-2 melanjutkan tagihan yang tertunda (' + r.data.verifikasi.diverifikasi.map(x => x.nomorBA).join(', ') + ')');

console.log('5. Galat API key → verifikator berhenti, laporan tetap jadi');
const L5 = K.bacaKoleksi_(P, 'progres'); L5.push({ id: 'TB5', versi: 1, noKontrak: NO.spsa, tagihanKe: 5, nomorBA: '05/BAP/001/SPSA', nilai: 9e9, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L5);
K.cl217SimpanBaris_(P, { id: 'TB5', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items: JSON.parse(JSON.stringify(items)), verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
C.__files['BUN-TB5'] = { nama: 'Bundel TB5.pdf', data: 'FILE:BUN-TB5', induk: folderId, diubah: 5 }; C.__ekstrak['BUN-TB5'] = isi;
STF('vtBundel', { data: { id: 'TB5', file: { id: 'BUN-TB5', idServer: 'BUN-TB5', nama: 'Bundel TB5.pdf', lokasi: 'server' } } });
C.__files['BUN-TB5'].diubah = 6;   // berkas diganti → harus dibaca ulang
const j1 = C.__jawabHTTP; C.__jawabHTTP = (u, o) => JSON.stringify(JSON.parse(o.payload).messages).indexOf('"document"') >= 0 ? { kode: 401, teks: { error: { message: 'invalid x-api-key' } } } : j1(u, o);
C.__cache['TIM_JALAN_' + P] = '0';
r = STF('timJalan'); assert.ok(r.ok, r.error);
ok(r.data.verifikasi.berhenti && /API key/.test(r.data.verifikasi.berhenti) && r.data.log.some(l => /Berhenti membaca/.test(l.teks)), 'API key ditolak → verifikator berhenti & melapor');
ok(r.data.ringkasan && r.data.saran.length, 'laporan & saran tetap disusun');
C.__jawabHTTP = j1;

console.log('6. Jadwal otomatis (pemicu kernel) + email laporan');
const pemicu = []; C.ScriptApp = { getProjectTriggers: () => pemicu.slice(), deleteTrigger: t => pemicu.splice(pemicu.indexOf(t), 1),
  newTrigger: f => { const t = { f, getHandlerFunction: () => f, getUniqueId: () => 'T' + pemicu.length }; const c = { timeBased: () => c, everyDays: () => c, atHour: h => { t.jam = h; return c; }, nearMinute: () => c, inTimezone: () => c, create: () => { pemicu.push(t); return t; } }; return c; } };
const surat = []; C.MailApp = { sendEmail: o => surat.push(o), getRemainingDailyQuota: () => 90 };
const log = []; C.Logger = { log: t => log.push(String(t)) };
r = STF('timSetel', { data: { aktif: true } }); ok(!r.ok && /Admin/.test(r.error), 'setelan tim khusus Admin');
assert.ok(ADM('notifSimpan', { data: { aktif: true, jam: [7, 16], email: { aktif: true, tambahan: ['pm@contoh.co.id'] } } }).ok);
const jamKini = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date())) % 24;
r = ADM('timSetel', { data: { aktif: true, jam: [jamKini], maksPdf: 20, maksTagihan: 6, email: true } }); assert.ok(r.ok, r.error);
ok(r.setelan.aktif && pemicu.length === [...new Set([7, 16, jamKini])].length && pemicu.some(t => t.jam === jamKini), 'pemicu harian dipasang untuk gabungan jam Notifikasi + Tim AI: ' + pemicu.map(t => t.jam).join(', '));
r = ADM('notifJadwal', {}); ok(r.ok && r.jam.indexOf(jamKini) >= 0, 'pasang ulang jadwal Notifikasi tidak menghapus jam Tim AI');
const nBaris = C.__sheets[P + '_TimAI'].rows.length; C.jadwalNotifikasi();
const H = JSON.parse(log.find(t => /^jadwalNotifikasi: /.test(t)).replace('jadwalNotifikasi: ', ''));
ok(H.tim && H.tim.hasil.some(t => t.indexOf(P + ':') === 0) && C.__sheets[P + '_TimAI'].rows.length === nBaris + 1, 'kait terjadwal: notifikasi lalu Tim AI bekerja otomatis (' + H.tim.hasil[0] + ')');
const em = surat.find(s => /Laporan Tim AI/.test(s.subject));
ok(em && em.to === 'pm@contoh.co.id' && /Saran prioritas/.test(em.htmlBody) && /Verifikator Tagihan|Hasil kerja Verifikator/.test(em.htmlBody), 'laporan tim dikirim ke penerima email Notifikasi');
ok(JSON.parse(C.__sheets[P + '_TimAI'].rows.slice(-1)[0][4]).kirim.email.ok, 'status kirim email tercatat di laporan');
log.length = 0; C.jadwalNotifikasi();
ok(/sudah dikerjakan/.test(log.join(' ')), 'slot jam yang sama tidak dikerjakan dua kali');
ADM('timSetel', { data: { aktif: false } }); r = ADM('timInfo'); ok(!r.setelan.aktif && r.riwayat.length >= 4, 'tim dapat dinonaktifkan; riwayat ' + r.riwayat.length + ' putaran');

console.log('\nLULUS ' + lulus + ' cek');
