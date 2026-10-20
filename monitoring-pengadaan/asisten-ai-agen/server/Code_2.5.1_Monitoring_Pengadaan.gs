/**
 * =====================================================================
 *  SERVER MONITORING SAP — Google Apps Script (Code.gs)
 *  Waskita–Nindya KSO · dipakai oleh file Monitoring_SAP.html
 * ---------------------------------------------------------------------
 *  Data disimpan di Google Sheets (spreadsheet tempat script ini terpasang):
 *    Pengguna            : nama, peran, kata sandi, aktif, akses proyek, jabatan, kontak, foto
 *    Proyek              : daftar proyek & format penomoran       (bisa diedit langsung)
 *    Pendaftar           : pendaftaran akun baru menunggu persetujuan Admin
 *    Reset Sandi         : permintaan lupa kata sandi
 *    Berkas PDF (bukti PO & bukti tagihan bertanda tangan) disimpan PRIVAT di
 *    Google Drive pemilik script, folder "Monitoring SAP - Berkas/<ID proyek>",
 *    dan hanya dapat dibuka pengguna yang sudah masuk lewat aplikasi.
 *    <ID>_Register       : Register Kontrak
 *    <ID>_Progres        : Progres / BA / dokumen SAP per tagihan
 *    <ID>_Permintaan     : Form Permintaan (termasuk WBS)
 *    <ID>_Koreksi        : Koreksi data Master Kontrak
 *    <ID>_Log            : Riwayat semua perubahan
 *  Kolom "DATA" berisi JSON lengkap — JANGAN diedit manual.
 *
 *  PEMASANGAN SINGKAT
 *    1. Buat Google Sheet baru › Ekstensi › Apps Script › tempel file ini › Simpan.
 *    2. Di dropdown toolbar pilih fungsi  setup  (BUKAN fungsi lain) › Jalankan › izinkan akses.
 *    3. Terapkan › Deployment baru › Jenis: Aplikasi web
 *         Jalankan sebagai : Saya
 *         Yang memiliki akses : Siapa saja
 *       › Terapkan › salin URL (…/exec).
 *    4. Tempel URL di aplikasi: menu akun › Koneksi server › Simpan.
 *  Saat kode diperbarui: Terapkan › Kelola deployment › edit (ikon pensil)
 *  › Versi: Versi baru › Terapkan — URL TETAP SAMA.
 *
 *  PEMBARUAN v2 (Okt 2026) — WAJIB setelah menempel kode ini:
 *    a. Jalankan  setup  sekali lagi › izinkan akses Google Drive (untuk berkas PDF).
 *       Setup juga menambah kolom baru di sheet Pengguna & menghapus akun Tim SAP.
 *    b. Terapkan › Kelola deployment › edit › Versi baru › Terapkan.
 *  Isi v2: peran Admin / Pengadaan / Lihat (Tim SAP dihapus) · hapus data khusus Admin ·
 *  daftar akun + persetujuan Admin · foto profil · ganti & reset kata sandi ·
 *  unggah/lihat PDF bukti PO & bukti tagihan.
 *
 *  v2.1 — PEMBARUAN OTOMATIS: Admin mengunggah paket "pembaruan-x.y.z.json" dari
 *  aplikasi (Pengguna & Proyek › Pembaruan). Paket disimpan di Drive folder
 *  "Monitoring SAP - Berkas/Pembaruan" dan otomatis dimuat semua staf — file
 *  HTML tidak perlu dibagikan ulang. Riwayat paket tetap tersimpan di folder itu.
 *
 *  v2.2 (Okt 2026) — LOGIN CEPAT & DATA AWAL TERKUNCI
 *    · Masuk + seluruh data proyek dalam SATU panggilan (dulu 5–6 panggilan berurutan).
 *    · Penanda versi data: bila data tidak berubah, server cukup menjawab "tidak berubah"
 *      dan aplikasi memakai salinan di perangkat → buka aplikasi terasa instan.
 *    · Salinan data proyek disimpan di CacheService (dipotong per 30 rb karakter).
 *    · Data awal Excel: Admin menekan "Simpan & Kunci" → impor tidak berjalan lagi
 *      sampai Admin sengaja memilih "Impor ulang".
 *    · Aksi baru: awal (GET), bacaSemua, kunciMigrasi, bukaMigrasi.
 *  SETELAH MENEMPEL KODE INI: Terapkan › Kelola deployment › ikon pensil ›
 *  Versi: VERSI BARU › Terapkan. (Menyimpan kode saja TIDAK mengubah server yang aktif.)
 *  Cek: buka URL …/exec?action=ping → harus tampil "versiServer":"2.2".
 *
 *  v2.3 (Okt 2026) — MONITORING PENGADAAN (integrasi PBJ Studio) — AMAN / ADITIF
 *    · Sheet BARU  <ID>_PBJ : paket pengadaan (Bon → PBJ → PR/RFQ/PO → Kontrak).
 *      Isi paket disimpan sebagai JSON terpotong di kolom DATA1…DATA8.
 *    · Field BARU pada tagihan (sheet <ID>_Progres, di dalam kolom DATA):
 *      "keuangan" (kelengkapan dokumen keuangan) & "bayar" (status pembayaran).
 *      Kolom & data lama TIDAK diubah, tidak dihapus, tidak ditimpa.
 *    · Aksi baru: baca jenis=pbj, savePBJ, hapusPBJ (Admin), keuanganProgres.
 *    · Satu item Bon hanya boleh berada di satu paket PBJ aktif (anti duplikasi).
 *    · Aplikasi v2.0/v2.2 tanpa pembaruan 2.1.x tetap berjalan normal di server ini.
 *  Cek: …/exec?action=ping → "versiServer":"2.3".
 *  UJI DULU di salinan spreadsheet + deployment terpisah sebelum mengganti server produksi.
 *
 *  v2.4.1 (Okt 2026) — PENYEMPURNAAN MASTER TAMBAHAN & ALOKASI BON — AMAN / ADITIF
 *    · Master tambahan (Material / Service / Vendor) menyimpan "detail" (kode SAP, alamat,
 *      NPWP, pimpinan, kontak, grup/kategori, harga acuan) dan status aktif/nonaktif.
 *      Tidak ada penghapusan: data yang keliru cukup dinonaktifkan.
 *    · Alokasi Bon dapat DIBATALKAN (status batal + alasan, baris tetap tersimpan) sehingga
 *      volume Bon yang salah alokasi dapat dialokasikan ulang tanpa menghapus jejak.
 *    · Sheet, kolom, dan data lama TIDAK diubah. Aplikasi pembaruan 2.1.4 tetap berjalan
 *      dengan server v2.4 (fitur detail/batal otomatis dinonaktifkan).
 *  Cek: …/exec?action=ping → "versiServer":"2.4.1".
 *
 *  v2.4.2 (Okt 2026) — KEANDALAN SIMPAN PBJ
 *    · SpreadsheetApp.flush() dipindah ke dalam try: galat tulis Google Sheets kini dikirim
 *      sebagai JSON yang jelas, bukan halaman HTML ("Unexpected token '<' … not valid JSON").
 *    · Potongan DATA1…DATA8 paket PBJ ditulis dengan awalan ' sehingga selalu dibaca teks
 *      (tidak berubah menjadi rumus/angka). Data lama tetap terbaca tanpa migrasi.
 *  Cek: …/exec?action=ping → "versiServer":"2.4.2".
 *
 *  v2.4.5 (Okt 2026) — PERBAIKAN BOOTSTRAP ADMIN-FIRST, PEMBARUAN RINGAN, LOGIN DESKTOP
 *    · BOOTSTRAP AMAN: antarmuka lama (≤2.1.7) dapat mengunggah paket kumulatif yang memuat
 *      panel Admin-first (2.1.8/2.1.9+) sebagai KANDIDAT ADMIN saja. Tidak pernah mengubah versi
 *      terbit staf. Bersifat idempoten: unggah ulang paket yang sama tidak lagi ditolak, dan
 *      kandidat bootstrap lama boleh diganti versi bootstrap yang lebih baru (arsip tetap di Drive).
 *      Setelah versi terbit memuat Admin-first, jalur lama otomatis tertutup.
 *    · ?action=pembaruanInfo (GET): metadata versi terbit tanpa isi JS/CSS (± 300 byte) →
 *      staf tidak lagi mengunduh paket ± 600 KB setiap 15 menit.
 *    · Paket terbit disimpan di CacheService per potongan 90 rb karakter (sebelumnya paket > 95 KB
 *      selalu dibaca ulang dari Drive pada setiap pembukaan aplikasi).
 *    · bacaPembaruanAdmin memakai metadata tersimpan (tidak membaca 3 berkas Drive tiap kali) dan
 *      menyertakan riwayat rilis dari sheet Log.
 *    · Fungsi editor (opsional, Admin pemilik script): statusPembaruan() — diagnosis baca-saja;
 *      lepasKandidatMacet() — melepas kandidat yang macet TANPA mengubah versi terbit staf.
 *    · Tidak ada perubahan sheet/kolom/data baku. Tidak ada izin (scope) Google baru.
 *  Cek: …/exec?action=ping → "versiServer":"2.4.5".
 *
 *  v2.5.0 (Okt 2026) — KERNEL MODUL SERVER (deployment ulang TERAKHIR untuk pembaruan rutin)
 *    · Logika server baru dikirim sebagai paket "server-modul-x.y.z.json" dan diunggah dari aplikasi
 *      (menu akun › Diagnostik sistem › Modul server): Unggah → Uji (baca-saja) → Terbitkan → Rollback.
 *    · Hanya SATU Admin penerbit modul (Script Properties: PENERBIT_MODUL, bawaan "Joko Supriyono").
 *      Mengganti penerbit: Setelan proyek › Properti skrip › PENERBIT_MODUL (tanpa deployment ulang).
 *    · Modul dimuat dari Drive "Monitoring SAP - Berkas/Modul Server", dicatat sidik SHA-256 & riwayat di Log.
 *    · Modul tidak dapat mengganti aksi inti (login, pengguna, pembaruan, modul). Modul rusak → aksi modul saja
 *      yang mati. Darurat: jalankan nonaktifkanModul() dari editor.
 *    · Fitur 2.4.6 (arsip vendor, manifest SHA-256, pembatas login, diagnostik) = modul server 1.0.0.
 *    · Tidak ada perubahan sheet/kolom/data lama. Tidak ada izin (scope) Google baru.
 *  Cek: …/exec?action=ping → "versiServer":"2.5.0", "kernel":"2.5".
 *  v2.5.1 (Okt 2026) — JEMBATAN LAYANAN LUAR (deployment ulang sekali, KERNEL tetap 2.5)
 *    · Izin (scope) Google BARU: kirim email (MailApp), akses URL luar (UrlFetchApp → Telegram,
 *      Claude, Gemini) dan pemicu terjadwal (ScriptApp). Setelah menempel kode: jalankan
 *      izinkanLayananLuar() SEKALI dari editor › izinkan › lalu Kelola deployment › Versi baru.
 *    · Fungsi global jadwalNotifikasi() dipanggil pemicu waktu (07.00 & 16.00 WIB, diatur Admin
 *      dari aplikasi) → meneruskan ke kait modul "terjadwal". Tanpa modul → tidak melakukan apa pun.
 *    · Modul memakai luarAmbil_, luarEmail_, luarKuotaEmail_, luarPemicu_ (tidak memanggil layanan
 *      Google secara langsung). Kernel tetap "2.5" → modul 1.x lama tetap dapat diunggah.
 *    · Tidak ada perubahan sheet/kolom/data lama.
 *  Cek: …/exec?action=ping → "versiServer":"2.5.1", "kernel":"2.5".
 * =====================================================================
 */
const VERSI_SERVER = '2.5.1';
const FITUR_SERVER = ['pbj', 'keuangan', 'masterTambahan', 'alokasiBon', 'masterDetail', 'alokasiBatal', 'checklistTagihan', 'adminFirstPembaruan', 'pembaruanInfo', 'bootstrapAdminFirst'];

const TZ = 'Asia/Jakarta';
const SH_PENGGUNA = 'Pengguna', SH_PROYEK = 'Proyek';
const KOL_PENGGUNA = ['Nama', 'Peran', 'Kata Sandi', 'Aktif', 'Proyek', 'Jabatan', 'Email', 'HP', 'Foto', 'Sandi Diubah'];
const SH_PENDAFTAR = 'Pendaftar', SH_RESET = 'Reset Sandi';
const KOL_PENDAFTAR = ['ID', 'Nama', 'Jabatan', 'Email', 'HP', 'Proyek', 'Minta Peran', 'Waktu', 'DATA'];
const KOL_RESET = ['ID', 'Nama', 'Proyek', 'Kontak', 'Catatan', 'Waktu', 'Terdaftar'];
const PERAN_VALID = ['ADMIN', 'PENGADAAN', 'LIHAT'];
const BATAS_PDF = 10 * 1024 * 1024, BATAS_FOTO = 48000, FOLDER_BERKAS = 'Monitoring SAP - Berkas';
const KOL_PROYEK = ['id', 'nama', 'namaLengkap', 'kso', 'kodeKontrak', 'kodePermintaan', 'kapro', 'kasi', 'aktif'];
const KOL_LOG = ['Waktu', 'ID', 'No Kontrak', 'Oleh', 'Peran', 'Aksi', 'Detail'];
const KOLEKSI = {
  data:       { sheet: 'Register',   kunci: r => r.noKontrak, kol: ['ID', 'No Kontrak', 'Vendor', 'Status', 'Nilai', 'Diubah Oleh', 'Diubah Pada', 'DATA'],
                ringkas: r => [r.id, r.noKontrak, r.namaVendor || '', r.status || '', r.nilai || 0, r.diubahOleh || '', r.diubahPada || ''] },
  progres:    { sheet: 'Progres',    kol: ['ID', 'No Kontrak', 'Tagihan Ke', 'Nomor BA', 'Periode', 'Nilai', 'Diubah Oleh', 'Diubah Pada', 'DATA'],
                ringkas: r => [r.id, r.noKontrak, r.tagihanKe || '', r.nomorBA || '', r.periode || '', r.nilai || 0, r.diubahOleh || '', r.diubahPada || ''] },
  permintaan: { sheet: 'Permintaan', kol: ['ID', 'Nomor', 'Departemen', 'Peminta', 'WBS', 'Total', 'Diubah Oleh', 'Diubah Pada', 'DATA'],
                ringkas: r => [r.id, r.nomor, r.departemen || '', r.peminta || '', r.wbs || '', r.total || 0, r.diubahOleh || '', r.diubahPada || ''] },
  koreksi:    { sheet: 'Koreksi',    kol: ['Key', 'No Kontrak', 'Diubah Oleh', 'Diubah Pada', 'DATA'],
                ringkas: r => [r.key, r.noKontrak || '', r.diubahOleh || '', r.diubahPada || ''] }
};

const PROYEK_AWAL = { id: '1726012', nama: 'Perkuatan Dermaga Barat JICT', namaLengkap: 'Proyek Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok',
  kso: 'WASKITA - NINDYA KSO', kodeKontrak: 'WK-NK.KSO/PDBJ', kodePermintaan: 'WK-NK.KSO/DIV.II/INF1', kapro: 'DEDY HARIYANTO', kasi: 'JOKO SUPRIYONO', aktif: true };
const PENGGUNA_AWAL = [
  ['Joko Supriyono', 'ADMIN', '1234', true, '*'],
  ['Kepala Proyek', 'LIHAT', '0000', true, '*']
];

/* ---------- Aturan bersama (sama dengan aplikasi) ---------- */
const IZIN_REG = {
  PENGADAAN: ['noKontrak', 'jenisKontrak', 'noUrut', 'tahun', 'bulan', 'idVendor', 'namaVendor', 'kelompok', 'tglKontrak', 'tglSelesai', 'catatan', 'noPR', 'noRFQ', 'noPO', 'top', 'items', 'buktiPO'],
  LIHAT: []
};
const DOK_SAP = ['ses', 'gr', 'reservasi', 'gi', 'miro', 'keterangan', 'tagihan', 'faktur'];
const DOK_NO = ['ses', 'gr', 'reservasi', 'gi', 'miro', 'tagihan', 'faktur'];
const PMT_DEPT = ['Pengadaan', 'Logistik', 'Adkon', 'Kalap', 'Pelaksana', 'Operasional', 'HSE', 'QC', 'SDM'];

function s_(v) { return v === null || v === undefined ? '' : String(v); }
function sandiValid_(p) { return /^\S{4,32}$/.test(s_(p)); }
function fotoAman_(f) { f = s_(f); if (!f) return ''; if (!/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+\/=]+$/.test(f)) throw new Error('Format foto tidak valid.'); if (f.length > BATAS_FOTO) throw new Error('Foto terlalu besar. Gunakan foto yang lebih kecil.'); return f; }
function beda_(a, b) { return (a && typeof a === 'object') || (b && typeof b === 'object') ? JSON.stringify(a || null) !== JSON.stringify(b || null) : s_(a) !== s_(b); }
function teks_(v) { return v && typeof v === 'object' ? s_(v.nama || 'berkas') : s_(v); }
function refBerkas_(x) {   // simpan hanya metadata berkas yang wajar (tanpa isi)
  if (!x || typeof x !== 'object' || !x.id) return null;
  const o = {}; ['id', 'idServer', 'nama', 'ukuran', 'jenis', 'ket', 'oleh', 'pada', 'lokasi', 'url'].forEach(k => { if (x[k] !== undefined) o[k] = k === 'ukuran' ? Number(x[k]) || 0 : s_(x[k]).slice(0, 300); });
  return o;
}
function hariIniISO_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function idBaru_(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function bulat4_(x) { return Math.round((Number(x) || 0) * 10000) / 10000; }
function urutEntri_(a, b) { return (a.periodeKey - b.periodeKey) || ((a.tagihanKe || 0) - (b.tagihanKe || 0)) || String(a.dibuatPada).localeCompare(String(b.dibuatPada)); }
function itemBerisi_(i) { return !!(s_(i.uraian).trim() || s_(i.kode).trim() || Number(i.vol)); }
function kelengkapanReg_(r) {
  const items = (r.items || []).filter(itemBerisi_);
  const cek = [['WBS', items.length > 0 && items.every(i => s_(i.wbs).trim() !== '')], ['PR', !!s_(r.noPR).trim()], ['RFQ', !!s_(r.noRFQ).trim()], ['PO', !!s_(r.noPO).trim()], ['TOP', !!s_(r.top).trim()]];
  return { cek: cek, skor: cek.filter(c => c[1]).length, kurang: cek.filter(c => !c[1]).map(c => c[0]) };
}
function statusReg_(r) { if (r.diposting) return 'DIPOSTING'; const k = kelengkapanReg_(r).skor; return k === 5 ? 'LENGKAP' : k > 0 ? 'PROSES' : 'DRAF'; }
function nilaiReg_(items) { return (items || []).reduce((a, i) => a + (Number(i.vol) || 0) * (Number(i.harga) || 0), 0); }
function bersihItemReg_(i) { return { kode: s_(i.kode), uraian: s_(i.uraian), vol: Number(i.vol) || 0, sat: s_(i.sat), harga: Number(i.harga) || 0, wbs: s_(i.wbs).trim(), noPermintaan: s_(i.noPermintaan).trim() }; }
function tanggalDok_(r, x) {
  DOK_NO.forEach(k => {
    if (x && (k + 'Tgl') in x) r[k + 'Tgl'] = s_(x[k + 'Tgl']);
    if (r[k] && !r[k + 'Tgl']) r[k + 'Tgl'] = hariIniISO_();
    if (!r[k]) r[k + 'Tgl'] = '';
  });
}

/* =====================================================================
   PENYIMPANAN (Google Sheets)
   ===================================================================== */
function ss_() {
  // Terpasang di Google Sheet → pakai Sheet itu. Project mandiri → buat / pakai spreadsheet "DB Monitoring SAP".
  const aktif = SpreadsheetApp.getActiveSpreadsheet(); if (aktif) return aktif;
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('DB_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { } }
  const baru = SpreadsheetApp.create('DB Monitoring SAP'); props.setProperty('DB_ID', baru.getId()); return baru;
}
function sheet_(nama, kolom) {
  const ss = ss_(); let sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.getRange(1, 1, 1, kolom.length).setValues([kolom]).setFontWeight('bold').setBackground('#0B2A4A').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  else if (sh.getLastColumn() < kolom.length) sh.getRange(1, 1, 1, kolom.length).setValues([kolom]).setFontWeight('bold').setBackground('#0B2A4A').setFontColor('#FFFFFF');
  return sh;
}
function baris_(sh) { const n = sh.getLastRow(); if (n < 2) return []; return sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues(); }
function tulisBaris_(sh, kolom, rows) {
  const n = sh.getLastRow(); if (n > 1) sh.getRange(2, 1, n - 1, Math.max(sh.getLastColumn(), kolom.length)).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, kolom.length).setValues(rows);
}

function bacaKoleksi_(proyek, jenis) {
  const K = KOLEKSI[jenis], sh = sheet_(proyek + '_' + K.sheet, K.kol), iData = K.kol.length - 1;
  return baris_(sh).filter(r => r[iData]).map(r => JSON.parse(r[iData]));
}
function tulisKoleksi_(proyek, jenis, arr) {
  const K = KOLEKSI[jenis], sh = sheet_(proyek + '_' + K.sheet, K.kol);
  tulisBaris_(sh, K.kol, arr.map(r => K.ringkas(r).concat([JSON.stringify(r)])));
  naikVersi_(proyek);
}

/* ---------- v2.2: versi data, salinan cepat & kunci data awal ---------- */
function naikVersi_(P) { PropertiesService.getScriptProperties().setProperty('VER_' + P, Date.now().toString(36) + Math.random().toString(36).slice(2, 5)); }
function versiData_(P) {
  // penanda = nomor versi terakhir + jumlah baris tiap sheet (ikut berubah bila baris ditambah/dihapus manual di Sheet)
  const ss = ss_(), v = PropertiesService.getScriptProperties().getProperty('VER_' + P) || '0';
  return v + ':' + ['data', 'progres', 'permintaan', 'koreksi'].map(j => { const sh = ss.getSheetByName(P + '_' + KOLEKSI[j].sheet); return sh ? sh.getLastRow() : 0; }).join('.');
}
const POTONG_CACHE = 30000;
function snapshot_(P, ver) {
  const cache = CacheService.getScriptCache(), kunci = 'SNAP_' + P;
  try {
    const meta = JSON.parse(cache.get(kunci) || 'null');
    if (meta && meta.ver === ver) {
      const keys = []; for (let i = 0; i < meta.n; i++) keys.push(kunci + '_' + i);
      const got = cache.getAll(keys), teks = keys.map(k => got[k]);
      if (teks.every(t => typeof t === 'string')) return JSON.parse(teks.join(''));
    }
  } catch (e) { }
  const data = { list: bacaKoleksi_(P, 'data'), progres: bacaKoleksi_(P, 'progres'), permintaan: bacaKoleksi_(P, 'permintaan'), koreksi: bacaKoleksi_(P, 'koreksi') };
  try {
    const teks = JSON.stringify(data), obj = {}; let n = 0;
    for (let i = 0; i < teks.length; i += POTONG_CACHE) obj[kunci + '_' + (n++)] = teks.slice(i, i + POTONG_CACHE);
    if (n <= 300) { cache.putAll(obj, 21600); cache.put(kunci, JSON.stringify({ ver: ver, n: n }), 21600); }
  } catch (e) { }
  return data;
}
function bacaSemua_(P, versiKlien) {
  const ver = versiData_(P), mig = migrasi_(P);
  if (versiKlien && versiKlien === ver) return { ok: true, versiServer: VERSI_SERVER, tidakBerubah: true, versi: ver, migrasi: mig };
  return { ok: true, versiServer: VERSI_SERVER, versi: ver, migrasi: mig, data: snapshot_(P, ver) };
}
function migrasi_(P) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('MIGRASI_' + P) || 'null'); } catch (e) { return null; } }
function catat_(proyek, r, u, aksi, detail) {
  sheet_(proyek + '_Log', KOL_LOG).appendRow([new Date().toISOString(), s_(r.id), s_(r.noKontrak), u.nama, u.peran, aksi, s_(detail).slice(0, 45000)]);
}
function bacaLog_(proyek, id) {
  const L = baris_(sheet_(proyek + '_Log', KOL_LOG)).map(r => ({ waktu: r[0] instanceof Date ? r[0].toISOString() : s_(r[0]), id: s_(r[1]), noKontrak: s_(r[2]), oleh: s_(r[3]), peran: s_(r[4]), aksi: s_(r[5]), detail: s_(r[6]) }));
  return (id ? L.filter(l => l.id === id) : L.slice(-1000)).reverse();
}

function semuaPengguna_() {
  return baris_(sheet_(SH_PENGGUNA, KOL_PENGGUNA)).filter(r => s_(r[0]).trim()).map(r => ({
    nama: s_(r[0]).trim(), peran: s_(r[1]).trim().toUpperCase(), pin: s_(r[2]).trim(),
    aktif: !(r[3] === false || /^(false|tidak|0|nonaktif)$/i.test(s_(r[3]).trim())), proyek: s_(r[4]).trim() || '*',
    jabatan: s_(r[5]).trim(), email: s_(r[6]).trim(), hp: s_(r[7]).trim(), foto: s_(r[8]).trim(), sandiDiubah: s_(r[9])
  }));
}
function tulisPengguna_(L) {
  tulisBaris_(sheet_(SH_PENGGUNA, KOL_PENGGUNA), KOL_PENGGUNA, L.map(u => [u.nama, u.peran, "'" + u.pin, u.aktif !== false, u.proyek || '*',
    s_(u.jabatan), s_(u.email), "'" + s_(u.hp), s_(u.foto), s_(u.sandiDiubah)]));
}
function bacaPendaftar_() { return baris_(sheet_(SH_PENDAFTAR, KOL_PENDAFTAR)).filter(r => r[8]).map(r => JSON.parse(r[8])); }
function tulisPendaftar_(L) { tulisBaris_(sheet_(SH_PENDAFTAR, KOL_PENDAFTAR), KOL_PENDAFTAR, L.map(p => [p.id, p.nama, p.jabatan, p.email, "'" + s_(p.hp), "'" + p.proyek, p.mintaPeran, p.pada, JSON.stringify(p)])); }
function bacaReset_() { return baris_(sheet_(SH_RESET, KOL_RESET)).filter(r => s_(r[0])).map(r => ({ id: s_(r[0]), nama: s_(r[1]), proyek: s_(r[2]), kontak: s_(r[3]), catatan: s_(r[4]), pada: r[5] instanceof Date ? r[5].toISOString() : s_(r[5]), terdaftar: r[6] === true || s_(r[6]).toUpperCase() === 'TRUE' })); }
function tulisReset_(L) { tulisBaris_(sheet_(SH_RESET, KOL_RESET), KOL_RESET, L.map(r => [r.id, r.nama, "'" + r.proyek, "'" + s_(r.kontak), r.catatan, r.pada, r.terdaftar === true])); }
function semuaProyek_() {
  return baris_(sheet_(SH_PROYEK, KOL_PROYEK)).filter(r => s_(r[0]).trim()).map(r => {
    const o = {}; KOL_PROYEK.forEach((k, i) => o[k] = s_(r[i]).trim());
    o.aktif = !(r[8] === false || /^(false|tidak|0|nonaktif)$/i.test(s_(r[8]).trim())); return o;
  });
}
function tulisProyek_(L) { tulisBaris_(sheet_(SH_PROYEK, KOL_PROYEK), KOL_PROYEK, L.map(p => KOL_PROYEK.map(k => k === 'aktif' ? p.aktif !== false : (k === 'id' ? "'" + s_(p[k]) : s_(p[k]))))); }
function aksesProyek_(u, id) { const d = s_(u.proyek || '*').split(',').map(x => x.trim()).filter(Boolean); return !id || !d.length || d.indexOf('*') >= 0 || d.indexOf(String(id)) >= 0; }

/* =====================================================================
   SETUP — jalankan SEKALI dari editor
   ===================================================================== */
function setup() {
  const shU = sheet_(SH_PENGGUNA, KOL_PENGGUNA);
  if (shU.getLastRow() < 2) tulisPengguna_(PENGGUNA_AWAL.map(r => ({ nama: r[0], peran: r[1], pin: r[2], aktif: r[3], proyek: r[4] })));
  else {   // v2: tulis ulang agar kolom baru terbentuk & akun Tim SAP terhapus
    const L = semuaPengguna_(), tanpaSap = L.filter(u => u.peran !== 'SAP');
    if (tanpaSap.length !== L.length) Logger.log('Akun Tim SAP dihapus: ' + L.filter(u => u.peran === 'SAP').map(u => u.nama).join(', '));
    tulisPengguna_(tanpaSap);
  }
  sheet_(SH_PENDAFTAR, KOL_PENDAFTAR); sheet_(SH_RESET, KOL_RESET);
  Logger.log('Folder berkas PDF: ' + folderBerkas_().getUrl());
  const shP = sheet_(SH_PROYEK, KOL_PROYEK);
  if (shP.getLastRow() < 2) tulisProyek_([PROYEK_AWAL]);
  ['data', 'progres', 'permintaan', 'koreksi'].forEach(j => sheet_(PROYEK_AWAL.id + '_' + KOLEKSI[j].sheet, KOLEKSI[j].kol));
  sheet_(PROYEK_AWAL.id + '_Log', KOL_LOG);
  const def = ss_().getSheetByName('Sheet1') || ss_().getSheetByName('Lembar1');
  if (def && ss_().getSheets().length > 1 && def.getLastRow() === 0) ss_().deleteSheet(def);
  Logger.log('Setup selesai ✔  Database: ' + ss_().getUrl());
  Logger.log('Langkah berikut: ganti kata sandi bawaan di sheet "Pengguna", lalu Terapkan › Kelola deployment › Versi baru.');
}

/* =====================================================================
   WEB APP
   ===================================================================== */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  modulReset_();   // v2.5.0
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'ping') return json_({ ok: true, jumlah: p.proyek ? bacaKoleksi_(p.proyek, 'data').length : 0, server: 'Monitoring SAP', versiServer: VERSI_SERVER, fitur: fiturSemua_(), kernel: KERNEL_VERSI, modul: modulRingkas_(), waktu: new Date().toISOString() });
    if (p.action === 'awal') {   // v2.2: daftar proyek + pengguna untuk layar masuk dalam satu panggilan
      return json_({ ok: true, versiServer: VERSI_SERVER, proyek: semuaProyek_().filter(x => x.aktif).map(x => ({ id: x.id, nama: x.nama })),
        users: semuaPengguna_().filter(u => u.aktif && u.peran !== 'SAP').map(u => ({ nama: u.nama, peran: u.peran, jabatan: u.jabatan, foto: u.foto, proyek: u.proyek })) });
    }
    if (p.action === 'users') return json_({ ok: true, users: semuaPengguna_().filter(u => u.aktif && u.peran !== 'SAP' && aksesProyek_(u, p.proyek)).map(u => ({ nama: u.nama, peran: u.peran, jabatan: u.jabatan, foto: u.foto })) });
    if (p.action === 'pembaruan') return json_({ ok: true, data: paketAktif_() });
    if (p.action === 'pembaruanInfo') return json_({ ok: true, versiServer: VERSI_SERVER, data: infoAktif_() });   // v2.4.5: metadata saja
    if (p.action === 'proyek') return json_({ ok: true, data: semuaProyek_().filter(x => x.aktif).map(x => ({ id: x.id, nama: x.nama })) });
    if (!p.action) return HtmlService.createHtmlOutput('<h3>Server Monitoring SAP aktif ✔</h3><p>Tempel URL halaman ini di aplikasi: menu akun › Koneksi server.</p>');
    return json_({ ok: false, error: 'Data hanya bisa dibaca setelah masuk.' });
  } catch (err) { return json_({ ok: false, error: err.message }); }
}

function doPost(e) {
  let req;
  modulReset_();   // v2.5.0
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Permintaan tidak valid.' }); }
  const baca = aksiBaca_(req.action, !!req.modulUji);   // v2.5.0: daftar baca inti + modul
  const lock = LockService.getScriptLock();
  if (!baca) { try { lock.waitLock(25000); } catch (err) { return json_({ ok: false, error: 'Server sedang sibuk, coba lagi sebentar.' }); } }
  try { const out = proses_(req); if (!baca) SpreadsheetApp.flush(); return json_(out); }   // v2.4.2: flush di dalam try → galat tulis tetap dikirim sebagai JSON (bukan halaman HTML)
  catch (err) { return json_({ ok: false, error: err.message }); }
  finally { if (!baca) { try { lock.releaseLock(); } catch (e) { } } }
}

function auth_(nama, pin, proyek) {
  kait_('sebelumAuth', nama);   // v2.5.0: kait modul (mis. pembatas login)
  const u = semuaPengguna_().find(x => x.aktif && x.nama.toLowerCase() === s_(nama).toLowerCase());
  if (!u || s_(u.pin) !== s_(pin)) { kait_('authGagal', nama, proyek); throw new Error('Nama atau kata sandi salah.'); }
  kait_('authBerhasil', nama);
  if (u.peran === 'SAP') throw new Error('Peran Tim SAP sudah dihapus. Hubungi Admin untuk penugasan ulang.');
  const id = s_(proyek || PROYEK_AWAL.id), prj = semuaProyek_().find(p => p.id === id);
  if (!prj || !prj.aktif) throw new Error('Proyek ' + id + ' tidak terdaftar / tidak aktif.');
  if (!aksesProyek_(u, id)) throw new Error('Anda tidak memiliki akses ke proyek ' + id + '.');
  return { nama: u.nama, peran: u.peran === 'ADMIN' ? 'PENGADAAN' : u.peran, admin: u.peran === 'ADMIN', cfg: prj, foto: u.foto, jabatan: u.jabatan, email: u.email, hp: u.hp };
}

function proses_(req) {
  if (req.action === 'daftar' || req.action === 'mintaReset') return publik_(req);
  const u = auth_(req.nama, req.pin, req.proyek), P = u.cfg.id, now = new Date().toISOString();
  modulUji_(req, u);   // v2.5.0: uji kandidat modul (penerbit saja, baca-saja)
  const PMT_TENGAH = (u.cfg.kodePermintaan || PROYEK_AWAL.kodePermintaan) + '/' + P;

  if (req.action === 'login') {
    const out = { ok: true, versiServer: VERSI_SERVER, fitur: fiturSemua_(), kernel: KERNEL_VERSI, user: { nama: u.nama, peran: u.peran, admin: u.admin, foto: u.foto, jabatan: u.jabatan, email: u.email, hp: u.hp }, proyek: u.cfg };
    if (req.sertakan) out.paket = bacaSemua_(P, s_(req.versi));   // v2.2: data ikut terkirim → tanpa panggilan tambahan
    return out;
  }
  if (req.action === 'bacaSemua') return bacaSemua_(P, s_(req.versi));
  if (MP218_ACTIONS.includes(req.action)) return mp218Aksi_(req,u,P,now);
  if (MODUL_AKSI_INTI.includes(req.action)) return modulAksi_(req, u, P, now);   // v2.5.0: kelola modul server
  { const t = modulAksiTimpa_(req, u, P, now); if (t !== undefined) return t; }   // v2.5.0: modul yang sengaja menimpa aksi non-inti


  if (['checklistBaca','checklistRingkas','checklistSimpan','checklistKategori','checklistVerifikasi'].includes(req.action)) return cl217Aksi_(req,u,P,now);

  /* v2.4: master tambahan & pembagian volume item Bon, keduanya tersimpan TERPISAH */
  if (req.action === 'bacaMasterTambahan') return {ok:true,versiServer:VERSI_SERVER,data:mp24Baca_(P,'master')};
  if (req.action === 'bacaAlokasiBon') return {ok:true,versiServer:VERSI_SERVER,data:mp24Baca_(P,'alokasi')};
  if (req.action === 'simpanMasterTambahan') {
    const L=mp24Baca_(P,'master'), h=mp24IsiMaster_(L,req.data||{},u,now);
    mp24TulisBaris_(P,'master',h.rec,h.oldId);
    catat_(P,{id:h.rec.id,noKontrak:h.rec.kode},u,h.oldId?(h.rec.aktif===false?'NONAKTIF MASTER TAMBAHAN':'UBAH MASTER TAMBAHAN'):'TAMBAH MASTER',h.rec.jenis+' · '+h.rec.kode+' · '+h.rec.nama);
    return {ok:true,data:h.rec};
  }
  if (req.action === 'simpanAlokasiBon') {
    const L=mp24Baca_(P,'alokasi'), h=mp24IsiAlokasi_(L,req.data||{},u,now,P);
    mp24TulisBaris_(P,'alokasi',h.rec,h.oldId);
    catat_(P,{id:h.rec.id,noKontrak:h.rec.noKontrak},u,h.rec.batal?'BATAL ALOKASI BON':(h.oldId?'UBAH ALOKASI BON':'TAMBAH ALOKASI BON'),h.rec.bonNomor+' #'+(h.rec.bonIdx+1)+' → '+h.rec.noKontrak+' · '+h.rec.wbs+' · '+h.rec.volume+(h.rec.batal?' · alasan: '+h.rec.alasanBatal:''));
    return {ok:true,data:h.rec};
  }


  /* ---------- v2.2: Simpan & kunci data awal (ADMIN) ---------- */
  if (req.action === 'kunciMigrasi' || req.action === 'bukaMigrasi') {
    if (!u.admin) throw new Error('Hanya ADMIN yang boleh mengatur data awal.');
    const props = PropertiesService.getScriptProperties(), d = req.data || {};
    if (req.action === 'bukaMigrasi') {
      props.deleteProperty('MIGRASI_' + P);
      catat_(P, { id: 'MIGRASI', noKontrak: '-' }, u, 'BUKA KUNCI DATA AWAL', s_(d.alasan) || 'Impor ulang data awal');
      return { ok: true, migrasi: null };
    }
    const nP = bacaKoleksi_(P, 'progres').length, nQ = bacaKoleksi_(P, 'permintaan').length;
    if (nP < (Number(d.bk) || 0) || nQ < (Number(d.pm) || 0)) throw new Error('Data awal di server belum lengkap (BK ' + nP + '/' + d.bk + ', permintaan ' + nQ + '/' + d.pm + '). Selesaikan impor dulu.');
    const m = { dikunci: true, oleh: u.nama, pada: now, bk: Number(d.bk) || nP, pm: Number(d.pm) || nQ, nilaiBK: Number(d.nilaiBK) || 0, sumber: s_(d.sumber).slice(0, 120) };
    props.setProperty('MIGRASI_' + P, JSON.stringify(m));
    catat_(P, { id: 'MIGRASI', noKontrak: '-' }, u, 'KUNCI DATA AWAL', 'BK ' + m.bk + ' · permintaan ' + m.pm + ' · ' + m.sumber);
    return { ok: true, migrasi: m };
  }

  /* ---------- Profil sendiri: ganti kata sandi, foto & kontak ---------- */
  if (req.action === 'gantiSandi' || req.action === 'ubahProfil') {
    const users = semuaPengguna_(), i = users.findIndex(x => x.nama.toLowerCase() === u.nama.toLowerCase()), d = req.data || {};
    if (i < 0) throw new Error('Pengguna tidak ditemukan.');
    if (req.action === 'gantiSandi') {
      if (!sandiValid_(d.sandiBaru)) throw new Error('Kata sandi baru minimal 4 karakter, tanpa spasi.');
      if (s_(d.sandiBaru) === users[i].pin) throw new Error('Kata sandi baru sama dengan yang lama.');
      users[i].pin = s_(d.sandiBaru); users[i].sandiDiubah = now;
      tulisPengguna_(users); catat_(P, { id: 'PENGGUNA', noKontrak: u.nama }, u, 'GANTI SANDI', 'Kata sandi diganti oleh pengguna');
    } else {
      ['jabatan', 'email', 'hp'].forEach(k => { if (k in d) users[i][k] = s_(d[k]).trim().slice(0, 120); });
      if ('foto' in d) users[i].foto = fotoAman_(d.foto);
      tulisPengguna_(users);
    }
    const x = users[i];
    return { ok: true, user: { nama: x.nama, foto: x.foto, jabatan: x.jabatan, email: x.email, hp: x.hp } };
  }

  /* ---------- Admin: persetujuan akun & reset kata sandi ---------- */
  if (['setujuiDaftar', 'tolakDaftar', 'selesaiReset'].indexOf(req.action) >= 0) {
    if (!u.admin) throw new Error('Hanya ADMIN yang boleh mengelola akun.');
    const d = req.data || {};
    if (req.action === 'setujuiDaftar' || req.action === 'tolakDaftar') {
      const L = bacaPendaftar_(), p = L.find(x => x.id === d.id); if (!p) throw new Error('Pendaftaran tidak ditemukan.');
      if (req.action === 'setujuiDaftar') {
        const peran = s_(d.peran).toUpperCase(); if (PERAN_VALID.indexOf(peran) < 0) throw new Error('Pilih peran yang valid.');
        const users = semuaPengguna_();
        if (users.some(x => x.nama.toLowerCase() === p.nama.toLowerCase())) throw new Error('Nama ' + p.nama + ' sudah dipakai pengguna lain.');
        const proyek = s_(d.proyek || p.proyek || '*').split(',').map(x => x.trim()).filter(Boolean).join(',') || '*';
        users.push({ nama: p.nama, peran: peran, pin: p.pin, aktif: true, proyek: proyek, jabatan: p.jabatan, email: p.email, hp: p.hp, foto: p.foto, sandiDiubah: now });
        tulisPengguna_(users);
        catat_(P, { id: 'PENGGUNA', noKontrak: p.nama }, u, 'SETUJUI AKUN', p.nama + ' · ' + peran + ' · proyek ' + proyek);
      } else catat_(P, { id: 'PENGGUNA', noKontrak: p.nama }, u, 'TOLAK AKUN', p.nama);
      tulisPendaftar_(L.filter(x => x.id !== p.id));
      return { ok: true };
    }
    const R = bacaReset_(), r = R.find(x => x.id === d.id); if (!r) throw new Error('Permintaan reset tidak ditemukan.');
    if (d.sandiBaru !== undefined) {
      if (!sandiValid_(d.sandiBaru)) throw new Error('Kata sandi minimal 4 karakter, tanpa spasi.');
      const users = semuaPengguna_(), x = users.find(v => v.nama.toLowerCase() === r.nama.toLowerCase());
      if (!x) throw new Error('Pengguna ' + r.nama + ' tidak terdaftar.');
      x.pin = s_(d.sandiBaru); x.sandiDiubah = now; tulisPengguna_(users);
      catat_(P, { id: 'PENGGUNA', noKontrak: r.nama }, u, 'RESET SANDI', 'Kata sandi sementara dibuat Admin');
    }
    tulisReset_(R.filter(x => x.id !== r.id));
    return { ok: true };
  }

  // v2.4.5: jembatan BOOTSTRAP dari antarmuka lama (≤2.1.7) ke Admin-first.
  // Paket hanya disimpan sebagai KANDIDAT ADMIN; versi terbit staf (PEMB_AKTIF) TIDAK diubah.
  if (req.action === 'cabutPembaruan')
    throw new Error('Cabut langsung dinonaktifkan. Gunakan menu Pembaruan Admin-first › Rollback.');
  if (req.action === 'pasangPembaruan') {
    if (!u.admin) throw new Error('Hanya Admin boleh mengunggah pembaruan.');
    const props = PropertiesService.getScriptProperties(), p = req.data || {};
    const aktifId = props.getProperty('PEMB_AKTIF'), aktif = aktifId ? mp218PaketFile_(aktifId) : null;
    if (aktif && s_(aktif.js).indexOf(MP218_MARKER) >= 0)
      throw new Error('Versi terbit sudah memiliki panel Admin-first. Gunakan Pengguna & Proyek › Pembaruan › Upload Kandidat (Admin).');
    if (s_(p.js).indexOf(MP218_MARKER) < 0)
      throw new Error('Pemasangan langsung ke seluruh staf dinonaktifkan. Unggah paket kumulatif yang memuat panel Admin-first (v2.1.8 atau lebih baru); paket akan disimpan sebagai KANDIDAT Admin.');
    mp218Validasi_(p, aktif, false);
    const sidik = mp219Sidik_(p);
    const kandidatId = props.getProperty('MP218_KANDIDAT');
    if (kandidatId) {
      const km = mp219Meta_(kandidatId);
      if (km && km.versi === s_(p.versi) && km.sidik === sidik)
        return { ok: true, kandidat: true, versi: s_(p.versi), sudahAda: true, pesan: 'Kandidat ' + p.versi + ' sudah tersimpan untuk Admin (tidak diubah). Staf tetap memakai ' + (aktif ? aktif.versi : 'versi dasar') + '.' };
      catat_(P, { id: 'PEMBARUAN', noKontrak: s_(p.versi) }, u, 'GANTI KANDIDAT BOOTSTRAP', 'Kandidat ' + (km ? km.versi : '?') + ' diganti ' + p.versi + ' (berkas lama tetap diarsipkan di Drive).');
    }
    const isi = Object.assign({}, p, { diunggahOleh: u.nama, diunggahPada: now, jalur: 'bootstrap' });
    const file = folderPembaruan_().createFile(Utilities.newBlob(JSON.stringify(isi), 'application/json', 'KANDIDAT-' + s_(p.versi) + '-bootstrap.json'));
    mp219SimpanMeta_(file.getId(), isi);
    props.setProperty('MP218_KANDIDAT', file.getId());
    props.setProperty('MP218_READY', '1');
    catat_(P, { id: 'PEMBARUAN', noKontrak: s_(p.versi) }, u, 'BOOTSTRAP KANDIDAT ADMIN', 'Staf tetap memakai ' + (aktif ? aktif.versi : 'versi dasar') + '. ' + s_(p.catatan).slice(0, 160));
    return { ok: true, kandidat: true, versi: s_(p.versi), pesan: 'Kandidat ' + p.versi + ' disimpan untuk Admin saja. Staf tidak menerima perubahan sampai Admin menyetujui & menerbitkan.' };
  }

  /* ---------- Pembaruan aplikasi (Admin) ---------- */
  if (req.action === 'pasangPembaruan' || req.action === 'cabutPembaruan') {
    if (!u.admin) throw new Error('Hanya ADMIN yang boleh memasang pembaruan aplikasi.');
    const props = PropertiesService.getScriptProperties();
    if (req.action === 'cabutPembaruan') {
      props.deleteProperty('PEMB_AKTIF'); CacheService.getScriptCache().remove('PEMB_AKTIF');
      catat_(P, { id: 'PEMBARUAN', noKontrak: '-' }, u, 'CABUT PEMBARUAN', 'Kembali ke versi dasar');
      return { ok: true };
    }
    const p = req.data || {};
    if (p.format !== 'monitoring-sap-pembaruan') throw new Error('Format file bukan paket pembaruan Monitoring SAP.');
    if (!/^[0-9][0-9A-Za-z.\-]{0,20}$/.test(s_(p.versi))) throw new Error('Nomor versi tidak valid.');
    const paket = { format: p.format, versi: s_(p.versi), untukDasar: s_(p.untukDasar), tanggal: s_(p.tanggal), catatan: s_(p.catatan).slice(0, 500),
      css: s_(p.css), js: s_(p.js), dipasangOleh: u.nama, dipasangPada: now };
    const isi = JSON.stringify(paket);
    if (isi.length > 5 * 1024 * 1024) throw new Error('Paket pembaruan terlalu besar (maks. 5 MB).');
    const f = folderPembaruan_().createFile(Utilities.newBlob(isi, 'application/json', 'pembaruan-' + paket.versi + '.json'));
    // one-time first rollout: save existing published package as rollback target.
    if (s_(paket.versi) === '2.1.8') {
      const oldId=props.getProperty('PEMB_AKTIF');
      if(oldId)props.setProperty('MP218_SEBELUM',oldId);
      props.setProperty('MP218_READY','1');
    }
    props.setProperty('PEMB_AKTIF', f.getId()); CacheService.getScriptCache().remove('PEMB_AKTIF');
    catat_(P, { id: 'PEMBARUAN', noKontrak: paket.versi }, u, 'PASANG PEMBARUAN', 'Versi ' + paket.versi + ' · ' + paket.catatan);
    return { ok: true };
  }

  /* ---------- Berkas PDF (bukti PO & bukti tagihan) ---------- */
  if (req.action === 'unggahBerkas') {
    if (u.peran !== 'PENGADAAN') throw new Error('Akun Lihat saja tidak dapat mengunggah berkas.');
    const b = req.berkas || {}, data = s_(b.data);
    if (!data) throw new Error('Isi berkas kosong.');
    const bytes = Utilities.base64Decode(data);
    if (bytes.length > BATAS_PDF) throw new Error('Ukuran PDF maksimal 10 MB.');
    if (String.fromCharCode.apply(null, bytes.slice(0, 5).map(x => x & 255)) !== '%PDF-') throw new Error('Isi berkas bukan PDF yang valid.');
    const aman = t => s_(t).replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 80);
    const namaFile = [aman(b.jenis || 'BERKAS'), aman(b.ket), aman(b.nama || 'dokumen.pdf')].filter(Boolean).join(' · ');
    const f = folderProyek_(P).createFile(Utilities.newBlob(bytes, 'application/pdf', namaFile));
    f.setDescription('Diunggah ' + u.nama + ' · ' + now + ' · id aplikasi ' + s_(b.id));
    let tambahan = {}; try { tambahan = kait_('setelahUnggah', { P: P, f: f, bytes: bytes, u: u, now: now, berkas: b }) || {}; } catch (e) { }   // v2.5.0
    catat_(P, { id: 'BERKAS', noKontrak: s_(b.ket) }, u, 'UNGGAH PDF', s_(b.jenis) + ' · ' + s_(b.nama) + ' · ' + Math.round(bytes.length / 1024) + ' KB' + (tambahan.sha256 ? ' · SHA-256 ' + String(tambahan.sha256).slice(0, 16) + '…' : ''));
    return Object.assign({}, tambahan, { ok: true, id: f.getId(), url: f.getUrl() });
  }
  if (req.action === 'ambilBerkas') {
    const id = s_(req.id); if (!id) throw new Error('Berkas tidak dikenal.');
    let f; try { f = DriveApp.getFileById(id); } catch (e) { throw new Error('Berkas tidak ditemukan di server.'); }
    const folder = folderProyek_(P), it = f.getParents(); let milikProyek = false;
    while (it.hasNext()) if (it.next().getId() === folder.getId()) milikProyek = true;
    if (!milikProyek) throw new Error('Berkas ini bukan milik proyek ' + P + '.');
    const blob = f.getBlob();
    return { ok: true, nama: f.getName(), tipe: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
  }

  if (req.action === 'baca') {
    if (req.jenis === 'list') return { ok: true, data: bacaKoleksi_(P, 'data') };
    if (req.jenis === 'progres') return { ok: true, data: bacaKoleksi_(P, 'progres') };
    if (req.jenis === 'permintaan') return { ok: true, data: bacaKoleksi_(P, 'permintaan') };
    if (req.jenis === 'koreksi') return { ok: true, data: bacaKoleksi_(P, 'koreksi') };
    if (req.jenis === 'log') return { ok: true, data: bacaLog_(P, req.id) };
    if (req.jenis === 'pbj') return { ok: true, versiServer: VERSI_SERVER, data: bacaPBJ_(P) };
    throw new Error('Jenis data tidak dikenal.');
  }

  /* ---------- Admin: pengguna & proyek ---------- */
  if (['adminData', 'simpanPengguna', 'simpanProyek'].indexOf(req.action) >= 0) {
    if (!u.admin) throw new Error('Hanya ADMIN yang boleh mengelola pengguna & proyek.');
    const users = semuaPengguna_(), prjs = semuaProyek_();
    if (req.action === 'adminData') return { ok: true, pengguna: users, proyek: prjs,
      pendaftar: bacaPendaftar_().map(p => { const o = Object.assign({}, p); delete o.pin; return o; }), reset: bacaReset_() };
    const d = req.data || {};
    if (req.action === 'simpanPengguna') {
      const nama = s_(d.nama).trim(), peran = s_(d.peran).toUpperCase(), pin = s_(d.pin).trim();
      if (!nama) throw new Error('Nama wajib diisi.');
      if (PERAN_VALID.indexOf(peran) < 0) throw new Error('Peran tidak valid.');
      if (!sandiValid_(pin)) throw new Error('Kata sandi minimal 4 karakter, tanpa spasi.');
      const proyek = s_(d.proyek || '*').split(',').map(x => x.trim()).filter(Boolean).join(',') || '*';
      const i = users.findIndex(x => x.nama.toLowerCase() === s_(d.namaLama !== undefined ? d.namaLama : nama).toLowerCase());
      if ((d.namaLama === undefined || s_(d.namaLama).toLowerCase() !== nama.toLowerCase()) && users.some((x, j) => j !== i && x.nama.toLowerCase() === nama.toLowerCase())) throw new Error('Nama ' + nama + ' sudah ada.');
      const lama0 = i >= 0 ? users[i] : {};
      const baru = Object.assign({}, lama0, { nama: nama, peran: peran, pin: pin, aktif: d.aktif !== false, proyek: proyek,
        jabatan: s_(d.jabatan !== undefined ? d.jabatan : lama0.jabatan).trim(), email: s_(d.email !== undefined ? d.email : lama0.email).trim(),
        hp: s_(d.hp !== undefined ? d.hp : lama0.hp).trim(), foto: 'foto' in d ? fotoAman_(d.foto) : s_(lama0.foto) });
      if (i >= 0 && lama0.pin !== pin) baru.sandiDiubah = now;
      if (i >= 0) {
        if (users[i].nama.toLowerCase() === u.nama.toLowerCase() && (peran !== 'ADMIN' || d.aktif === false)) throw new Error('Tidak dapat menurunkan peran / menonaktifkan akun Anda sendiri.');
        users[i] = baru;
      } else { if (d.namaLama) throw new Error('Pengguna tidak ditemukan.'); users.push(baru); }
      tulisPengguna_(users); catat_(P, { id: 'PENGGUNA', noKontrak: nama }, u, 'PENGGUNA', nama + ' · ' + peran + ' · proyek ' + proyek);
      return { ok: true };
    }
    if (req.action === 'simpanProyek') {
      const id = s_(d.id).trim();
      if (!/^\d{5,10}$/.test(id)) throw new Error('ID proyek harus angka (5–10 digit), mis. 1726012.');
      if (!s_(d.nama).trim()) throw new Error('Nama proyek wajib diisi.');
      const p = {}; KOL_PROYEK.forEach(k => p[k] = s_(d[k]).trim()); p.id = id; p.aktif = d.aktif !== false;
      const i = prjs.findIndex(x => x.id === id); if (i >= 0) prjs[i] = p; else prjs.push(p);
      tulisProyek_(prjs); return { ok: true };
    }
  }

  /* ---------- Impor data awal (ADMIN, idempoten) ---------- */
  if (req.action === 'impor') {
    if (!u.admin) throw new Error('Hanya ADMIN yang boleh mengimpor data.');
    const mg = migrasi_(P);
    if (mg && mg.dikunci) throw new Error('Data awal sudah disimpan & dikunci oleh ' + mg.oleh + '. Pilih "Impor ulang" di Migrasi Data bila memang ingin mengimpor lagi.');
    const prog = req.jenis === 'progres', jenis = prog ? 'progres' : 'permintaan', L = bacaKoleksi_(P, jenis);
    const ids = {}; L.forEach(x => ids[x.id] = 1);
    const hasil = { ok: true, baru: 0, ada: 0, konflik: [] };
    (req.rows || []).forEach(r => {
      if (ids[r.id]) { hasil.ada++; return; }
      const dup = prog ? L.find(x => x.noKontrak === r.noKontrak && Number(x.tagihanKe) === Number(r.tagihanKe)) : L.find(x => x.nomor === r.nomor);
      if (dup) { hasil.konflik.push((r.nomorBA || r.nomor) + ': sudah ada'); return; }
      L.push(r); ids[r.id] = 1; hasil.baru++;
    });
    if (hasil.baru) tulisKoleksi_(P, jenis, L);
    catat_(P, { id: 'IMPOR', noKontrak: req.jenis }, u, 'IMPOR DATA', req.jenis + ' · baru ' + hasil.baru + ' · sudah ada ' + hasil.ada);
    return hasil;
  }

  /* ---------- v2.3: Paket PBJ (Bon → PBJ → PR/RFQ/PO → Kontrak) ---------- */
  if (req.action === 'savePBJ' || req.action === 'hapusPBJ') {
    let L = bacaPBJ_(P);
    if (req.action === 'hapusPBJ') {
      if (!u.admin) throw new Error('Hanya ADMIN yang boleh menghapus paket PBJ.');
      const r = L.find(x => x.id === req.id); if (!r) throw new Error('Paket PBJ tidak ditemukan.');
      if (r.noKontrak) throw new Error('Paket ' + r.kode + ' sudah tertaut ke kontrak ' + r.noKontrak + '. Tidak dapat dihapus.');
      if (r.status !== 'BATAL') throw new Error('Batalkan paket terlebih dahulu (dengan alasan) sebelum dihapus.');
      L = L.filter(x => x.id !== r.id); tulisPBJ_(P, L); catat_(P, { id: r.id, noKontrak: r.kode }, u, 'HAPUS PBJ', r.kode + ' · ' + r.nama);
      return { ok: true };
    }
    const d = req.data || {};
    if (d.noKontrak && !bacaKoleksi_(P, 'data').some(k => k.noKontrak === s_(d.noKontrak).trim()) && !bacaKoleksi_(P, 'koreksi').some(k => k.noKontrak === s_(d.noKontrak).trim() || k.key === s_(d.noKontrak).trim()) && !d.kontrakMaster)
      throw new Error('Kontrak ' + d.noKontrak + ' tidak ditemukan di Register. Buat kontrak dulu.');
    const h = logikaPBJ_(L, u, d, now, idBaru_('B'));
    if (h.tidakBerubah) return { ok: true, data: h.data, tidakBerubah: true };
    const i = L.findIndex(e => e.id === h.data.id); if (i >= 0) L[i] = h.data; else L.push(h.data);
    tulisPBJ_(P, L); catat_(P, { id: h.data.id, noKontrak: h.data.noKontrak || h.data.kode }, u, h.aksi, h.detail);
    return { ok: true, data: h.data };
  }

  /* ---------- v2.3: Kelengkapan dokumen keuangan & status pembayaran per tagihan ---------- */
  if (req.action === 'keuanganProgres') {
    const L = bacaKoleksi_(P, 'progres'), x = req.data || {}, i = L.findIndex(e => e.id === x.id);
    if (i < 0) throw new Error('Data tagihan tidak ditemukan.');
    const asal=s_(L[i].bayar&&L[i].bayar.status||'BELUM').toUpperCase();
    const tujuan=s_(x.bayar&&x.bayar.status||asal).toUpperCase();
    if(x.bayar && tujuan!==asal && ['DIAJUKAN','DIVERIFIKASI','DIBAYAR'].indexOf(tujuan)>=0){
      const cek=cl217Cari_(P,L[i].id).rec;
      if(!cek||cek.noKontrak!==L[i].noKontrak||!cek.kategori||!cl217Hitung_(cek).siap)
        throw new Error('Checklist belum lengkap dan diverifikasi Admin. Lengkapi Checklist Tagihan sebelum mengajukan pembayaran.');
    }
    const h = logikaKeuangan_(L[i], u, x, now);
    if (h.tidakBerubah) return { ok: true, data: h.data, tidakBerubah: true };
    L[i] = h.data; tulisKoleksi_(P, 'progres', L); catat_(P, h.data, u, 'KEUANGAN', h.detail);
    return { ok: true, data: h.data };
  }

  /* ---------- Dokumen SAP per tagihan ---------- */
  if (req.action === 'dokProgres') {
    if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh mengisi dokumen SAP.');
    const L = bacaKoleksi_(P, 'progres'), x = req.data || {}, i = L.findIndex(e => e.id === x.id);
    if (i < 0) throw new Error('Data progres tidak ditemukan.');
    const r = L[i]; if (Number(x.versi) !== Number(r.versi)) throw new Error('KONFLIK: progres ini sudah diubah oleh ' + r.diubahOleh + '. Muat ulang dulu.');
    const ubah = [];
    ['noPO'].concat(DOK_SAP, DOK_NO.map(k => k + 'Tgl')).forEach(k => { if (k in x && s_(x[k]) !== s_(r[k])) { ubah.push(k + ': "' + s_(r[k]) + '" → "' + s_(x[k]) + '"'); r[k] = s_(x[k]); } });
    if ('buktiTagihan' in x && beda_(refBerkas_(x.buktiTagihan), r.buktiTagihan)) { ubah.push('Bukti tagihan TTD: ' + teks_(x.buktiTagihan || '-')); r.buktiTagihan = refBerkas_(x.buktiTagihan); }
    tanggalDok_(r, null);
    if (!ubah.length) return { ok: true, data: r, tidakBerubah: true };
    r.diubahOleh = u.nama; r.diubahPada = now; r.versi = Number(r.versi) + 1;
    tulisKoleksi_(P, 'progres', L); catat_(P, r, u, 'DOK SAP', 'Periode ' + r.periode + ' · ' + ubah.join('; '));
    return { ok: true, data: r };
  }

  /* ---------- Progres / BA ---------- */
  if (req.action === 'saveProgres' || req.action === 'hapusProgres') {
    if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh mengisi progres.');
    if (req.action === 'hapusProgres' && !u.admin) throw new Error('Hanya ADMIN yang boleh menghapus tagihan.');
    let L = bacaKoleksi_(P, 'progres');
    const akhirDari = no => L.filter(x => x.noKontrak === no).sort(urutEntri_).pop();
    const bersih = it => { const o = {}; Object.keys(it || {}).forEach(k => { const v = Number(it[k]); if (isNaN(v) || v < 0) throw new Error('Volume progres tidak boleh negatif (item ' + k + ').'); if (v > 0) o[k] = bulat4_(v); }); return o; };
    if (req.action === 'hapusProgres') {
      const r = L.find(x => x.id === req.id); if (!r) throw new Error('Data progres tidak ditemukan.');
      if (akhirDari(r.noKontrak).id !== r.id) throw new Error('Hanya progres periode terakhir yang boleh dihapus.');
      if (r.baTerbit) throw new Error('BA ' + r.nomorBA + ' sudah diterbitkan. Tagihan yang BA-nya terbit tidak dapat dihapus.');
      L = L.filter(x => x.id !== r.id); tulisKoleksi_(P, 'progres', L); catat_(P, r, u, 'HAPUS PROGRES', 'Periode ' + r.periode);
      return { ok: true };
    }
    const x = req.data || {};
    if (!x.id) {
      if (!x.noKontrak || !x.periode) throw new Error('No Kontrak dan Periode wajib diisi.');
      const ak = akhirDari(x.noKontrak); if (ak && Number(x.periodeKey) < ak.periodeKey) throw new Error('Periode lebih awal dari progres terakhir (' + ak.periode + ').');
      const items = bersih(x.items); if (!Object.keys(items).length) throw new Error('Isi minimal satu volume progres.');
      const r = { id: idBaru_('P'), noKontrak: x.noKontrak, periode: x.periode, periodeKey: Number(x.periodeKey) || 0, tanggal: x.tanggal || '', noPO: x.noPO || '',
        items: items, nilai: Number(x.nilai) || 0, revisi: 0, alasan: '', nomorBA: '', dibuatOleh: u.nama, dibuatPada: now, diubahOleh: u.nama, diubahPada: now, versi: 1 };
      DOK_SAP.forEach(k => r[k] = s_(x[k]));
      r.buktiTagihan = refBerkas_(x.buktiTagihan);
      r.tagihanKe = parseInt(x.tagihanKe, 10);
      if (!(r.tagihanKe >= 1)) throw new Error('Tagihan / BA ke- wajib diisi (angka ≥ 1).');
      if (L.some(e => e.noKontrak === x.noKontrak && Number(e.tagihanKe) === r.tagihanKe)) throw new Error('Tagihan ke-' + r.tagihanKe + ' untuk kontrak ini sudah ada. Gunakan nomor lain.');
      r.kodeBA = s_(x.kodeBA || 'BA'); r.nomorBA = String(r.tagihanKe).padStart(2, '0') + '/' + r.kodeBA + '/' + r.noKontrak; r.baTerbit = '';
      tanggalDok_(r, x);
      L.push(r); tulisKoleksi_(P, 'progres', L);
      catat_(P, r, u, 'PROGRES', 'Tagihan ke-' + r.tagihanKe + ' (' + r.nomorBA + ') · ' + r.periode + ' · ' + Object.keys(items).length + ' item · nilai ' + r.nilai);
      return { ok: true, data: r };
    }
    const i = L.findIndex(e => e.id === x.id); if (i < 0) throw new Error('Data progres tidak ditemukan.');
    const lama = L[i]; if (Number(x.versi) !== Number(lama.versi)) throw new Error('KONFLIK: progres ini sudah diubah oleh ' + lama.diubahOleh + '. Muat ulang dulu.');
    const r = JSON.parse(JSON.stringify(lama));
    if (x.terbit) r.baTerbit = now;
    else {
      if (akhirDari(lama.noKontrak).id !== lama.id) throw new Error('Hanya progres periode terakhir yang boleh direvisi.');
      if (lama.baTerbit) throw new Error('BA ' + lama.nomorBA + ' sudah terbit. Volume tidak dapat direvisi.');
      if (!s_(x.alasan).trim()) throw new Error('Alasan revisi wajib diisi.');
      const items = bersih(x.items); if (!Object.keys(items).length) throw new Error('Isi minimal satu volume progres.');
      Object.assign(r, { items: items, nilai: Number(x.nilai) || 0, tanggal: x.tanggal || r.tanggal, noPO: x.noPO || r.noPO, revisi: Number(lama.revisi) + 1, alasan: s_(x.alasan).trim() });
      if ('tagihanKe' in x) {
        const n = parseInt(x.tagihanKe, 10);
        if (!(n >= 1)) throw new Error('Tagihan / BA ke- wajib diisi (angka ≥ 1).');
        if (L.some(e => e.id !== lama.id && e.noKontrak === lama.noKontrak && Number(e.tagihanKe) === n)) throw new Error('Tagihan ke-' + n + ' untuk kontrak ini sudah ada. Gunakan nomor lain.');
        r.tagihanKe = n; r.nomorBA = String(n).padStart(2, '0') + '/' + (r.kodeBA || 'BA') + '/' + r.noKontrak;
      }
      DOK_SAP.forEach(k => { if (k in x) r[k] = s_(x[k]); });
      if ('buktiTagihan' in x) r.buktiTagihan = refBerkas_(x.buktiTagihan);
      tanggalDok_(r, x);
    }
    Object.assign(r, { diubahOleh: u.nama, diubahPada: now, versi: Number(lama.versi) + 1 });
    L[i] = r; tulisKoleksi_(P, 'progres', L);
    catat_(P, r, u, r.revisi > lama.revisi ? 'REVISI PROGRES' : 'BA TERBIT', r.revisi > lama.revisi ? 'Revisi ke-' + r.revisi + ' tagihan ke-' + r.tagihanKe + ' · alasan: ' + r.alasan : 'BA ' + r.nomorBA + ' diterbitkan');
    return { ok: true, data: r };
  }

  /* ---------- Koreksi data kontrak ---------- */
  if (req.action === 'saveKoreksi') {
    if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh memperbaiki data kontrak.');
    const L = bacaKoleksi_(P, 'koreksi'), x = req.data || {}, key = s_(x.key).trim();
    if (!key) throw new Error('Kontrak tidak dikenal.');
    const i = L.findIndex(k => k.key === key), lama = i >= 0 ? L[i] : null;
    if (lama && Number(x.versi) !== Number(lama.versi)) throw new Error('KONFLIK: data kontrak ini sudah diperbaiki oleh ' + lama.diubahOleh + '. Muat ulang dulu.');
    const v = x.data || {};
    if ('buktiPO' in v) v.buktiPO = refBerkas_(v.buktiPO);
    if (v.noKontrak && L.some(k => k.key !== key && k.noKontrak === v.noKontrak)) throw new Error('No kontrak ' + v.noKontrak + ' sudah dipakai pada perbaikan kontrak lain.');
    const r = Object.assign({}, v, { key: key, diubahOleh: u.nama, diubahPada: now, versi: (lama ? Number(lama.versi) : 0) + 1 });
    if (i >= 0) L[i] = r; else L.push(r);
    tulisKoleksi_(P, 'koreksi', L);
    catat_(P, { id: key, noKontrak: v.noKontrak || key }, u, 'KOREKSI KONTRAK', Object.keys(v).filter(k => v[k] !== '' && v[k] !== 0 && v[k] !== null).map(k => k + ': ' + teks_(v[k])).join('; '));
    return { ok: true, data: r };
  }

  /* ---------- Permintaan barang ---------- */
  if (req.action === 'savePermintaan' || req.action === 'hapusPermintaan') {
    let L = bacaKoleksi_(P, 'permintaan');
    const REGL = bacaKoleksi_(P, 'data');
    const dipakai = nomor => REGL.filter(r => (r.items || []).some(i => i.noPermintaan === nomor)).map(r => r.noKontrak);
    if (req.action === 'hapusPermintaan') {
      if (!u.admin) throw new Error('Hanya ADMIN yang boleh menghapus permintaan.');
      const r = L.find(x => x.id === req.id); if (!r) throw new Error('Permintaan tidak ditemukan.');
      const k = dipakai(r.nomor); if (k.length) throw new Error('Permintaan ' + r.nomor + ' sudah dipakai di kontrak ' + k.join(', ') + '. Tidak dapat dihapus.');
      L = L.filter(x => x.id !== r.id); tulisKoleksi_(P, 'permintaan', L); catat_(P, { id: r.id, noKontrak: r.nomor }, u, 'HAPUS PERMINTAAN', r.nomor);
      return { ok: true };
    }
    const h = logikaPermintaan_(L, u, req.data || {}, now, idBaru_('Q'), dipakai, PMT_TENGAH);
    const i = L.findIndex(e => e.id === h.data.id); if (i >= 0) L[i] = h.data; else L.push(h.data);
    tulisKoleksi_(P, 'permintaan', L); catat_(P, { id: h.data.id, noKontrak: h.data.nomor }, u, h.aksi, h.detail);
    return { ok: true, data: h.data };
  }

  /* ---------- Register Kontrak ---------- */
  const D = bacaKoleksi_(P, 'data'), izin = IZIN_REG[u.peran] || [];
  const cariId = req.id || (req.data && req.data.id), idx = cariId ? D.findIndex(x => x.id === cariId) : -1;
  if (req.action === 'save') {
    const data = req.data || {};
    if (!izin.length) throw new Error('Peran ' + u.peran + ' tidak boleh mengubah data.');
    if (!data.id) {
      if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh membuat kontrak baru.');
      if (!s_(data.noKontrak).trim()) throw new Error('No Kontrak wajib diisi.');
      if (D.some(x => x.noKontrak === data.noKontrak)) throw new Error('No Kontrak ' + data.noKontrak + ' sudah ada di register.');
      const r = { noPR: '', noRFQ: '', noPO: '', top: '', catatan: '' };
      izin.forEach(k => { if (k in data) r[k] = data[k]; });
      if ('buktiPO' in r) r.buktiPO = refBerkas_(r.buktiPO);
      r.items = (data.items || []).map(bersihItemReg_);
      Object.assign(r, { id: idBaru_('L'), nilai: nilaiReg_(r.items), dibuatOleh: u.nama, dibuatPada: now, diubahOleh: u.nama, diubahPada: now, versi: 1, diposting: false });
      r.status = statusReg_(r);
      D.push(r); tulisKoleksi_(P, 'data', D); catat_(P, r, u, 'BUAT', 'Kontrak dibuat · ' + r.items.length + ' item · nilai ' + r.nilai);
      return { ok: true, data: r };
    }
    if (idx < 0) throw new Error('Kontrak tidak ditemukan.');
    const lama = D[idx];
    if (Number(data.versi) !== Number(lama.versi)) throw new Error('KONFLIK: data ini sudah diubah oleh ' + lama.diubahOleh + '. Muat ulang lalu ulangi perubahan Anda.');
    const baru = JSON.parse(JSON.stringify(lama)), ubah = [];
    izin.forEach(k => {
      if (k === 'items') {
        if (!('items' in data)) return;
        const b = (data.items || []).map(bersihItemReg_);
        if (JSON.stringify(b) !== JSON.stringify(baru.items.map(bersihItemReg_))) { ubah.push('Item diubah (' + baru.items.length + ' → ' + b.length + ' baris)'); baru.items = b; }
      } else if (k === 'buktiPO') {
        if (k in data && beda_(refBerkas_(data[k]), baru[k])) { ubah.push('Bukti PO TTD: ' + teks_(data[k] || '-')); baru[k] = refBerkas_(data[k]); }
      } else if (k in data && beda_(data[k], baru[k])) { ubah.push(k + ': "' + teks_(baru[k]) + '" → "' + teks_(data[k]) + '"'); baru[k] = data[k]; }
    });
    if (!ubah.length) return { ok: true, data: lama, tidakBerubah: true };
    Object.assign(baru, { nilai: nilaiReg_(baru.items), diubahOleh: u.nama, diubahPada: now, versi: Number(lama.versi) + 1 });
    baru.status = statusReg_(baru);
    D[idx] = baru; tulisKoleksi_(P, 'data', D); catat_(P, baru, u, 'UBAH', ubah.join('; '));
    return { ok: true, data: baru };
  }
  if (req.action === 'posting' || req.action === 'kembalikan') {
    if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh ' + req.action + '.');
    if (idx < 0) throw new Error('Kontrak tidak ditemukan.');
    const r = D[idx];
    if (Number(req.versi) !== Number(r.versi)) throw new Error('KONFLIK: data ini sudah diubah oleh ' + r.diubahOleh + '. Muat ulang dulu.');
    if (req.action === 'posting') { if (r.diposting) throw new Error('Kontrak ini sudah diposting.'); Object.assign(r, { diposting: true, dipostingOleh: u.nama, dipostingPada: now, status: 'DIPOSTING' }); }
    else { if (r.diposting) throw new Error('Kontrak yang sudah diposting tidak bisa dikembalikan.'); if (!s_(req.catatan).trim()) throw new Error('Catatan pengembalian wajib diisi.'); r.status = 'DIKEMBALIKAN'; }
    if (req.catatan) r.catatan = req.catatan;
    Object.assign(r, { diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 });
    const k = kelengkapanReg_(r);
    tulisKoleksi_(P, 'data', D);
    catat_(P, r, u, req.action === 'posting' ? 'POSTING' : 'KEMBALIKAN', req.action === 'posting' ? 'Diposting ke Master Kontrak · kelengkapan ' + k.skor + '/5' + (k.kurang.length ? ' (menyusul: ' + k.kurang.join(', ') + ')' : '') : 'Catatan: ' + req.catatan);
    return { ok: true, data: r };
  }
  if (req.action === 'hapus') {
    if (!u.admin) throw new Error('Hanya ADMIN yang boleh menghapus draf kontrak.');
    if (idx < 0) throw new Error('Kontrak tidak ditemukan.');
    if (D[idx].diposting) throw new Error('Kontrak yang sudah diposting tidak bisa dihapus.');
    const r = D[idx]; D.splice(idx, 1); tulisKoleksi_(P, 'data', D); catat_(P, r, u, 'HAPUS', 'Draf dihapus');
    return { ok: true };
  }
  const mz = modulAksiAkhir_(req, u, P, now); if (mz !== undefined) return mz;   // v2.5.0: aksi dari modul server
  return { ok: false, error: 'Aksi tidak dikenal: ' + req.action };
}

function logikaPermintaan_(L, u, x, now, idB, dipakai, PMT_TENGAH) {
  const bersih = it => ({ kode: s_(it.kode).trim(), uraian: s_(it.uraian).trim(), sat: s_(it.sat).trim(), vol: Number(it.vol) || 0, harga: Number(it.harga) || 0, wbs: s_(it.wbs).trim() });
  const total = items => items.reduce((a, i) => a + i.vol * i.harga, 0);
  if (x.id) {
    const lama = L.find(e => e.id === x.id); if (!lama) throw new Error('Permintaan tidak ditemukan.');
    if (Number(x.versi) !== Number(lama.versi)) throw new Error('KONFLIK: permintaan ini sudah diubah oleh ' + lama.diubahOleh + '. Muat ulang dulu.');
  }
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh membuat / mengubah permintaan.');
  const urut = parseInt(x.noUrut, 10), tahun = parseInt(x.tahun, 10) || Number(s_(x.tanggal).slice(0, 4));
  if (!(urut >= 1)) throw new Error('No urut permintaan wajib diisi (angka ≥ 1).');
  if (!(tahun >= 2000)) throw new Error('Tahun permintaan tidak valid.');
  const nomor = String(urut).padStart(3, '0') + '/' + PMT_TENGAH + '/' + tahun;
  if (L.some(e => e.nomor === nomor && e.id !== x.id)) throw new Error('Nomor permintaan ' + nomor + ' sudah dipakai. Gunakan nomor lain.');
  const lamaN = x.id && L.find(e => e.id === x.id);
  if (lamaN && nomor !== lamaN.nomor && dipakai(lamaN.nomor).length) throw new Error('Nomor ' + lamaN.nomor + ' sudah dipakai di kontrak ' + dipakai(lamaN.nomor).join(', ') + '. Nomor tidak dapat diubah.');
  if (!x.tanggal) throw new Error('Tanggal permintaan wajib diisi.');
  if (PMT_DEPT.indexOf(x.departemen) < 0) throw new Error('Departemen tidak valid.');
  if (!s_(x.peminta).trim()) throw new Error('Nama peminta wajib diisi.');
  const items = (x.items || []).map(bersih).filter(i => i.uraian || i.kode);
  if (!items.length) throw new Error('Isi minimal satu barang.');
  items.forEach((i, n) => { if (!(i.vol > 0)) throw new Error('Barang ke-' + (n + 1) + ': volume harus lebih dari 0.'); if (i.harga < 0) throw new Error('Barang ke-' + (n + 1) + ': estimasi harga tidak boleh negatif.'); });
  const isi = { nomor: nomor, noUrut: urut, tahun: tahun, tanggal: s_(x.tanggal), tglButuh: s_(x.tglButuh), departemen: x.departemen, peminta: s_(x.peminta).trim(), wbs: s_(x.wbs).trim(), keperluan: s_(x.keperluan).trim(),
    jenisPekerjaan: s_(x.jenisPekerjaan).trim(), volPekerjaan: s_(x.volPekerjaan).trim(), durasi: s_(x.durasi).trim(), items: items, total: total(items) };
  if (!x.id) return { data: Object.assign({ id: idB }, isi, { dibuatOleh: u.nama, dibuatPada: now, diubahOleh: u.nama, diubahPada: now, versi: 1 }), aksi: 'PERMINTAAN', detail: nomor + ' · ' + isi.departemen + ' · ' + items.length + ' item · rencana ' + isi.total };
  return { data: Object.assign({}, lamaN, isi, { diubahOleh: u.nama, diubahPada: now, versi: Number(lamaN.versi) + 1 }), aksi: 'UBAH PERMINTAAN', detail: nomor + ' · ' + items.length + ' item · rencana ' + isi.total };
}

/* =====================================================================
   v2.3 — PENYIMPANAN PAKET PBJ (sheet <ID>_PBJ, JSON terpotong DATA1…DATA8)
   ===================================================================== */
const KOL_PBJ = ['ID', 'Kode', 'Nama Paket', 'No Bon', 'Status', 'Tahap', 'Pemenang', 'HPS', 'Harga Final', 'No PR', 'No RFQ', 'No PO', 'No Kontrak', 'Diubah Oleh', 'Diubah Pada', 'Versi',
  'DATA1', 'DATA2', 'DATA3', 'DATA4', 'DATA5', 'DATA6', 'DATA7', 'DATA8'];
const PBJ_KOL_DATA = 16, PBJ_POTONG = 45000;
function bacaPBJ_(P) {
  const sh = sheet_(P + '_PBJ', KOL_PBJ);
  return baris_(sh).filter(r => s_(r[0]).trim() && r[PBJ_KOL_DATA]).map(r => JSON.parse(r.slice(PBJ_KOL_DATA, PBJ_KOL_DATA + 8).map(s_).join('')));
}
function tulisPBJ_(P, L) {
  const sh = sheet_(P + '_PBJ', KOL_PBJ);
  tulisBaris_(sh, KOL_PBJ, L.map(r => {
    const t = JSON.stringify(r); if (t.length > PBJ_POTONG * 8) throw new Error('Paket ' + r.kode + ' terlalu besar untuk disimpan.');
    const pot = []; for (let i = 0; i < 8; i++) { const c = t.slice(i * PBJ_POTONG, (i + 1) * PBJ_POTONG); pot.push(c ? "'" + c : ''); }   // v2.4.2: awalan ' → potongan selalu teks (tidak terbaca rumus/angka, tanda ' di awal tidak hilang)
    return [r.id, r.kode || '', r.nama || '', [...new Set((r.bon || []).map(b => b.nomor))].join(', '), r.status || '', r.tahap || 0, r.pemenang || '', r.hps || 0, r.final || 0,
      "'" + s_(r.noPR), "'" + s_(r.noRFQ), "'" + s_(r.noPO), r.noKontrak || '', r.diubahOleh || '', r.diubahPada || '', r.versi || 0].concat(pot);
  }));
}

/* =====================================================================
   v2.3 — LOGIKA BERSAMA PBJ & KEUANGAN (dipakai Code.gs DAN emulasi lokal aplikasi)
   Fungsi murni: tidak memakai API Google; input → validasi → objek hasil.
   ===================================================================== */
const PBJ_STATUS = ['DRAF', 'PROSES', 'SIAP', 'KONTRAK', 'BATAL'];
const PBJ_MAKS_DATA = 8 * 45000;          // batas ukuran isi paket (8 kolom × 45 rb karakter)
const KEU_DOK = [                          // dokumen keuangan yang dicentang manual (selain dok SAP yang sudah ada)
  ['kwitansi', 'Kwitansi bermeterai', ''],
  ['sj', 'Surat jalan / DO / packing list', 'BAPM'],
  ['lap', 'Laporan & foto progres / opname', 'JASA'],
  ['rek', 'Referensi rekening bank vendor', '']
];
const BAYAR_STATUS = ['BELUM', 'DIAJUKAN', 'DIVERIFIKASI', 'DIBAYAR', 'DITUNDA'];

function tks_(v) { return v === null || v === undefined ? '' : String(v); }
function angka_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function tglValid_(t) { t = tks_(t).trim(); if (!t) return ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error('Format tanggal harus YYYY-MM-DD: ' + t); return t; }

/* Bersihkan daftar item Bon yang ditarik ke paket PBJ */
function bersihBonPBJ_(arr) {
  const out = [], kunci = {};
  (arr || []).forEach(b => {
    const nomor = tks_(b && b.nomor).trim(), idx = parseInt(b && b.idx, 10);
    if (!nomor || !(idx >= 0)) return;
    const k = nomor + '#' + idx; if (kunci[k]) throw new Error('Item bon ' + nomor + ' baris ' + (idx + 1) + ' tercantum dua kali di paket ini.');
    kunci[k] = 1;
    out.push({ nomor: nomor, idx: idx, kode: tks_(b.kode).trim().slice(0, 40), uraian: tks_(b.uraian).trim().slice(0, 300), vol: angka_(b.vol), sat: tks_(b.sat).trim().slice(0, 20), wbs: tks_(b.wbs).trim().slice(0, 60), harga: angka_(b.harga) });
  });
  return out;
}

/* Simpan / ubah paket PBJ.  L = daftar paket proyek (dimutasi oleh pemanggil), u = pengguna, x = data kiriman */
function logikaPBJ_(L, u, x, now, idB) {
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh membuat / mengubah paket PBJ.');
  x = x || {};
  const lama = x.id ? L.find(e => e.id === x.id) : null;
  if (x.id && !lama) throw new Error('Paket PBJ tidak ditemukan.');
  if (lama && Number(x.versi) !== Number(lama.versi)) throw new Error('KONFLIK: paket PBJ ini sudah diubah oleh ' + lama.diubahOleh + '. Muat ulang dulu.');
  if (lama && lama.status === 'BATAL' && !u.admin) throw new Error('Paket PBJ ini sudah dibatalkan. Hanya Admin yang dapat memulihkan.');

  const r = lama ? JSON.parse(JSON.stringify(lama)) : { id: idB, dibuatOleh: u.nama, dibuatPada: now, versi: 0, noKontrak: '' };
  const ubah = [];
  const set = (k, v) => { if (tks_(r[k]) !== tks_(v)) { ubah.push(k + ': "' + tks_(r[k]).slice(0, 60) + '" → "' + tks_(v).slice(0, 60) + '"'); r[k] = v; } };

  if (!lama) {   // kode paket otomatis PBJ-<tahun>-<urut>
    const th = String(now).slice(0, 4), maks = L.filter(e => String(e.kode || '').indexOf('PBJ-' + th + '-') === 0).reduce((m, e) => Math.max(m, parseInt(String(e.kode).split('-')[2], 10) || 0), 0);
    r.kode = 'PBJ-' + th + '-' + String(maks + 1).padStart(3, '0');
  }
  if ('nama' in x) set('nama', tks_(x.nama).trim().slice(0, 200));
  if (!tks_(r.nama).trim()) throw new Error('Nama paket wajib diisi.');
  ['noPR', 'noRFQ', 'noPO'].forEach(k => { if (k in x) set(k, tks_(x[k]).trim().slice(0, 30)); });
  ['tglPR', 'tglRFQ', 'tglPO'].forEach(k => { if (k in x) set(k, tglValid_(x[k])); });
  if ('catatan' in x) set('catatan', tks_(x.catatan).trim().slice(0, 500));
  ['tahap', 'hps', 'final', 'finalPpn', 'efisiensi'].forEach(k => { if (k in x) { const n = angka_(x[k]); if (n < 0) throw new Error(k + ' tidak boleh negatif.'); set(k, k === 'tahap' ? Math.min(12, Math.round(n)) : n); } });
  if ('pemenang' in x) set('pemenang', tks_(x.pemenang).trim().slice(0, 200));
  if ('siap' in x) set('siap', !!x.siap);

  // Bon → PBJ: satu item bon hanya boleh berada di satu paket aktif (tanpa duplikasi)
  if ('bon' in x) {
    const b = bersihBonPBJ_(x.bon);
    b.forEach(it => {
      const lain = L.find(e => e.id !== r.id && e.status !== 'BATAL' && (e.bon || []).some(z => z.nomor === it.nomor && Number(z.idx) === it.idx));
      if (lain) throw new Error('Item bon ' + it.nomor + ' baris ' + (it.idx + 1) + ' (' + it.uraian + ') sudah dipakai paket ' + lain.kode + ' — ' + lain.nama + '.');
    });
    if (JSON.stringify(b) !== JSON.stringify(r.bon || [])) { ubah.push('Item bon: ' + (r.bon || []).length + ' → ' + b.length); r.bon = b; }
  }
  if (!r.bon) r.bon = [];

  if ('state' in x) {
    const s = x.state === null ? null : JSON.stringify(x.state);
    if (s && s.length > PBJ_MAKS_DATA) throw new Error('Isi paket PBJ terlalu besar (' + Math.round(s.length / 1024) + ' KB, maks. ' + Math.round(PBJ_MAKS_DATA / 1024) + ' KB). Kurangi jumlah vendor/item.');
    if (s !== JSON.stringify(r.state === undefined ? null : r.state)) { ubah.push('Isi dokumen PBJ diperbarui'); r.state = s ? JSON.parse(s) : null; }
  }

  // Tautan kontrak (PBJ → Kontrak)
  if ('noKontrak' in x) {
    const no = tks_(x.noKontrak).trim();
    if (lama && lama.noKontrak && no !== lama.noKontrak && !u.admin) throw new Error('Paket ini sudah tertaut ke kontrak ' + lama.noKontrak + '. Hanya Admin yang dapat mengubah tautan.');
    if (no && L.some(e => e.id !== r.id && e.status !== 'BATAL' && e.noKontrak === no)) throw new Error('Kontrak ' + no + ' sudah tertaut ke paket PBJ lain.');
    set('noKontrak', no);
  }

  // Status
  if ('status' in x) {
    const st = tks_(x.status).toUpperCase();
    if (PBJ_STATUS.indexOf(st) < 0) throw new Error('Status PBJ tidak valid.');
    if (st === 'BATAL') {
      if (r.noKontrak) throw new Error('Paket yang sudah tertaut ke kontrak tidak dapat dibatalkan.');
      if (!tks_(x.alasan).trim()) throw new Error('Alasan pembatalan wajib diisi.');
      r.alasanBatal = tks_(x.alasan).trim().slice(0, 300);
    }
    set('status', st);
  }
  if (lama && lama.status === 'BATAL' && r.status !== 'BATAL') (r.bon || []).forEach(it => {   // pulihkan: cek ulang alokasi bon
    const lain = L.find(e => e.id !== r.id && e.status !== 'BATAL' && (e.bon || []).some(z => z.nomor === it.nomor && Number(z.idx) === Number(it.idx)));
    if (lain) throw new Error('Tidak dapat dipulihkan: item bon ' + it.nomor + ' baris ' + (Number(it.idx) + 1) + ' sudah dipakai paket ' + lain.kode + '.');
  });
  if (r.status !== 'BATAL') r.status = r.noKontrak ? 'KONTRAK' : (r.siap ? 'SIAP' : ((r.tahap || 0) > 0 || r.state ? 'PROSES' : 'DRAF'));

  if (lama && !ubah.length) return { data: lama, tidakBerubah: true, aksi: '', detail: '' };
  Object.assign(r, { diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi || 0) + 1 });
  return { data: r, aksi: lama ? (x.status === 'BATAL' ? 'BATAL PBJ' : 'UBAH PBJ') : 'PBJ BARU', detail: r.kode + ' · ' + r.nama + (ubah.length ? ' · ' + ubah.join('; ').slice(0, 1500) : '') };
}

/* Kelengkapan dokumen keuangan & status pembayaran per tagihan (BK) */
function logikaKeuangan_(r, u, x, now) {
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh mengisi data keuangan & pembayaran.');
  if (Number(x.versi) !== Number(r.versi)) throw new Error('KONFLIK: tagihan ini sudah diubah oleh ' + r.diubahOleh + '. Muat ulang dulu.');
  const ubah = [], b = JSON.parse(JSON.stringify(r));
  if (x.keuangan) {
    const k = {};
    KEU_DOK.forEach(d => {
      const v = x.keuangan[d[0]]; if (!v) return;
      k[d[0]] = { ok: !!v.ok, no: tks_(v.no).trim().slice(0, 60), tgl: tglValid_(v.tgl) };
    });
    if (JSON.stringify(k) !== JSON.stringify(b.keuangan || {})) { ubah.push('Kelengkapan dok keuangan: ' + KEU_DOK.filter(d => k[d[0]] && k[d[0]].ok).map(d => d[0]).join(', ')); b.keuangan = k; }
  }
  if (x.bayar) {
    const v = x.bayar, st = tks_(v.status || 'BELUM').toUpperCase();
    if (BAYAR_STATUS.indexOf(st) < 0) throw new Error('Status pembayaran tidak valid.');
    const p = { status: st, tglAju: tglValid_(v.tglAju), noAju: tks_(v.noAju).trim().slice(0, 60), tglBayar: tglValid_(v.tglBayar), nilaiBayar: angka_(v.nilaiBayar), noBayar: tks_(v.noBayar).trim().slice(0, 60), catatan: tks_(v.catatan).trim().slice(0, 300) };
    if (p.nilaiBayar < 0) throw new Error('Nilai bayar tidak boleh negatif.');
    if (st !== 'BELUM' && !r.baTerbit) throw new Error('BA ' + (r.nomorBA || '') + ' belum terbit. Tagihan belum dapat diajukan pembayaran.');
    if (['DIAJUKAN', 'DIVERIFIKASI', 'DIBAYAR'].indexOf(st) >= 0 && !p.tglAju) throw new Error('Tanggal pengajuan pembayaran wajib diisi.');
    if (st === 'DIBAYAR' && (!p.tglBayar || !(p.nilaiBayar > 0))) throw new Error('Status DIBAYAR wajib mengisi tanggal bayar dan nilai dibayar.');
    if (st === 'DITUNDA' && !p.catatan) throw new Error('Alasan penundaan wajib diisi pada catatan.');
    if (JSON.stringify(p) !== JSON.stringify(b.bayar || null)) { ubah.push('Pembayaran: ' + ((b.bayar && b.bayar.status) || 'BELUM') + ' → ' + st + (p.nilaiBayar ? ' · ' + p.nilaiBayar : '')); b.bayar = p; }
  }
  if (!ubah.length) return { data: r, tidakBerubah: true };
  Object.assign(b, { diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 });
  return { data: b, detail: 'Tagihan ke-' + r.tagihanKe + ' (' + r.nomorBA + ') · ' + ubah.join('; ') };
}

/* =====================================================================
   v2 — PENDAFTARAN & LUPA KATA SANDI (tanpa login)
   ===================================================================== */
function publik_(req) {
  const d = req.data || {}, now = new Date().toISOString(), nama = s_(d.nama).trim().replace(/\s+/g, ' ');
  if (req.action === 'daftar') {
    if (nama.length < 3 || nama.length > 80) throw new Error('Nama lengkap 3–80 huruf.');
    if (!sandiValid_(d.sandi)) throw new Error('Kata sandi minimal 4 karakter, tanpa spasi.');
    const prj = semuaProyek_().find(p => p.id === s_(d.proyek) && p.aktif);
    if (!prj) throw new Error('Pilih proyek yang aktif.');
    const L = bacaPendaftar_();
    if (L.length >= 50) throw new Error('Antrean pendaftaran penuh. Hubungi Admin.');
    if (semuaPengguna_().some(u => u.nama.toLowerCase() === nama.toLowerCase())) throw new Error('Nama ' + nama + ' sudah terdaftar. Gunakan menu Lupa kata sandi bila tidak bisa masuk.');
    if (L.some(p => p.nama.toLowerCase() === nama.toLowerCase())) throw new Error('Pendaftaran atas nama ' + nama + ' sudah ada dan menunggu persetujuan Admin.');
    L.push({ id: idBaru_('D'), nama: nama, jabatan: s_(d.jabatan).trim().slice(0, 120), email: s_(d.email).trim().slice(0, 120), hp: s_(d.hp).trim().slice(0, 40),
      proyek: prj.id, pin: s_(d.sandi), foto: fotoAman_(d.foto), mintaPeran: d.mintaPeran === 'LIHAT' ? 'LIHAT' : 'PENGADAAN', catatan: s_(d.catatan).trim().slice(0, 300), pada: now });
    tulisPendaftar_(L);
    return { ok: true };
  }
  if (nama.length < 3) throw new Error('Isi nama pengguna Anda.');
  const R = bacaReset_();
  if (R.length >= 50) throw new Error('Antrean permintaan penuh. Hubungi Admin.');
  if (!R.some(r => r.nama.toLowerCase() === nama.toLowerCase())) {
    R.push({ id: idBaru_('R'), nama: nama, proyek: s_(d.proyek), kontak: s_(d.kontak).trim().slice(0, 120), catatan: s_(d.catatan).trim().slice(0, 300), pada: now,
      terdaftar: semuaPengguna_().some(u => u.nama.toLowerCase() === nama.toLowerCase()) });
    tulisReset_(R);
  }
  return { ok: true };
}

/* =====================================================================
   v2 — FOLDER BERKAS PDF (privat, di Drive pemilik script)
   ===================================================================== */
function folderBerkas_() {
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('FOLDER_BERKAS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { } }
  const f = DriveApp.createFolder(FOLDER_BERKAS); props.setProperty('FOLDER_BERKAS', f.getId()); return f;
}
function folderProyek_(P) {
  const akar = folderBerkas_(), it = akar.getFoldersByName(String(P));
  return it.hasNext() ? it.next() : akar.createFolder(String(P));
}

/* =====================================================================
   v2.1 — PAKET PEMBARUAN APLIKASI
   ===================================================================== */
function folderPembaruan_() {
  const akar = folderBerkas_(), it = akar.getFoldersByName('Pembaruan');
  return it.hasNext() ? it.next() : akar.createFolder('Pembaruan');
}
function paketAktif_() {
  const id = PropertiesService.getScriptProperties().getProperty('PEMB_AKTIF'); if (!id) return null;
  const cache = CacheService.getScriptCache();
  // v2.4.5: paket besar disimpan per potongan agar tidak dibaca dari Drive pada setiap permintaan
  try {
    const m = JSON.parse(cache.get('PEMB_AKTIF_M') || 'null');
    if (m && m.id === id) {
      const keys = []; for (let i = 0; i < m.n; i++) keys.push('PEMB_AKTIF_' + i);
      const got = cache.getAll(keys);
      if (keys.every(k => typeof got[k] === 'string')) return JSON.parse(keys.map(k => got[k]).join(''));
    }
  } catch (e) { }
  let teks; try { teks = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'); } catch (e) { return null; }
  const paket = JSON.parse(teks);
  try {
    const obj = {}; let n = 0;
    for (let i = 0; i < teks.length; i += 90000) obj['PEMB_AKTIF_' + (n++)] = teks.slice(i, i + 90000);
    if (n <= 80) { cache.putAll(obj, 21600); cache.put('PEMB_AKTIF_M', JSON.stringify({ id: id, n: n }), 21600); }
  } catch (e) { }
  mp219SimpanMeta_(id, paket);
  return paket;
}
function infoAktif_() {
  const id = PropertiesService.getScriptProperties().getProperty('PEMB_AKTIF'); if (!id) return null;
  const m = mp219Meta_(id); return m ? Object.assign({}, m, { id: undefined }) : null;
}

/* =======================================================================
   v2.4 — Tambahan aman: MASTER_CUSTOM & ALOKASI_BON (sheet terpisah).
   Tidak mengubah kolom/sheet master, Bon, kontrak, PBJ atau progres lama.
   Semua API di bawah memerlukan autentikasi dan akses proyek.
   ======================================================================= */
const MP24_COL_MASTER = ['ID','Jenis','Kode','Nama','Satuan','Oleh','Tanggal','Versi','DATA'];
const MP24_COL_ALOK = ['ID','Bon','Baris Bon','Kontrak','WBS','Volume','Oleh','Tanggal','Versi','DATA'];
function mp24Baca_(P, jenis) {
  const master = jenis === 'master';
  const sh = ss_().getSheetByName(P + (master ? '_MasterCustom' : '_AlokasiBon'));
  if (!sh) return [];
  const dataIndex = (master ? MP24_COL_MASTER : MP24_COL_ALOK).length - 1;
  return baris_(sh).filter(r => r[dataIndex]).map(r => JSON.parse(s_(r[dataIndex])));
}
function mp24TulisBaris_(P, jenis, rec, oldId) {
  const master = jenis === 'master', head = master ? MP24_COL_MASTER : MP24_COL_ALOK;
  const sh = sheet_(P + (master ? '_MasterCustom' : '_AlokasiBon'), head);
  const row = master
    ? [rec.id,rec.jenis,rec.kode,rec.nama,rec.satuan,rec.diubahOleh,rec.diubahPada,rec.versi,JSON.stringify(rec)]
    : [rec.id,rec.bonNomor,rec.bonIdx,(rec.batal?'BATAL · ':'')+rec.noKontrak,rec.wbs,rec.batal?0:rec.volume,rec.diubahOleh,rec.diubahPada,rec.versi,JSON.stringify(rec)];
  if (oldId) {
    const rows = baris_(sh), idx = rows.findIndex(r => s_(r[0]) === oldId);
    if (idx < 0) throw new Error('Entri tambahan tidak ditemukan. Muat ulang sebelum mengubah.');
    sh.getRange(idx + 2, 1, 1, head.length).setValues([row]);
  } else sh.appendRow(row);
}
const MP24_DETAIL = { kodeSAP: 40, alamat: 300, kota: 80, npwp: 40, pimpinan: 120, jabatan: 80, telp: 60, email: 120, grup: 40, kategori: 80, harga: 20, catatan: 500 };
function mp24Detail_(d) {
  const o = {}; if (!d || typeof d !== 'object') return o;
  Object.keys(MP24_DETAIL).forEach(k => { if (d[k] !== undefined && d[k] !== null && s_(d[k]).trim() !== '') o[k] = s_(d[k]).trim().slice(0, MP24_DETAIL[k]); });
  if (o.kodeSAP && /[^\w.\-/]/.test(o.kodeSAP)) throw new Error('Kode SAP hanya boleh huruf, angka, titik, garis miring, dan tanda hubung.');
  if (o.harga && !isFinite(Number(o.harga))) throw new Error('Harga acuan harus angka.');
  return o;
}
function mp24DetailRec_(z) {
  if (z && z.detail && typeof z.detail === 'object' && Object.keys(z.detail).length) return z.detail;
  const k = s_(z && z.keterangan).trim(); if (k.charAt(0) === '{') { try { return JSON.parse(k) || {}; } catch (e) { } }
  return {};
}
function mp24AktifRec_(z) { if (z.aktif === false) return false; if (z.aktif === true) return true; return mp24DetailRec_(z).aktif !== false; }
function mp24IsiMaster_(L, x, u, now) {
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya Pengadaan/Admin yang boleh menambah master.');
  const jenis=s_(x.jenis).toUpperCase().trim(), kode=s_(x.kode).trim().slice(0,60), nama=s_(x.nama).trim().slice(0,200), satuan=s_(x.satuan).trim().slice(0,35);
  if (!['MATERIAL','SERVICE','VENDOR'].includes(jenis)) throw new Error('Jenis master tidak dikenal.');
  if (!kode || !nama) throw new Error('Kode dan nama master harus diisi.');
  if (!/^CUST-/i.test(kode)) throw new Error('Kode master tambahan harus diawali CUST- agar tidak bertabrakan dengan master baku.');
  if (/[^\w.\-/]/.test(kode)) throw new Error('Kode hanya boleh huruf, angka, titik, garis miring, dan tanda hubung.');
  const lama = x.id ? L.find(z => z.id === x.id) : null;
  if (x.id && !lama) throw new Error('Master tambahan tidak ditemukan.');
  if (lama && Number(x.versi) !== Number(lama.versi)) throw new Error('KONFLIK master: data telah berubah. Muat ulang.');
  if (L.some(z => z.id !== x.id && z.jenis === jenis && z.kode.toLowerCase() === kode.toLowerCase())) throw new Error('Kode ' + kode + ' untuk ' + jenis + ' sudah tercatat.');
  const meta = x.keterangan ? s_(x.keterangan).trim().slice(0,500) : '';
  const detail = x.detail !== undefined ? mp24Detail_(x.detail) : ((lama && lama.detail) || {});
  const aktif = x.aktif === false ? false : (x.aktif === true ? true : !(lama && lama.aktif === false));
  if (detail.kodeSAP && aktif && L.some(z => z.id !== x.id && z.jenis === jenis && mp24AktifRec_(z) && s_(mp24DetailRec_(z).kodeSAP).toLowerCase() === detail.kodeSAP.toLowerCase()))
    throw new Error('Kode SAP ' + detail.kodeSAP + ' untuk ' + jenis + ' sudah tercatat di master tambahan.');
  const rec = Object.assign({}, lama || { id: idBaru_('MC'), dibuatOleh:u.nama, dibuatPada:now },
    { jenis,kode,nama,satuan,keterangan:meta,detail:detail,aktif:aktif,diubahOleh:u.nama,diubahPada:now,versi:lama?Number(lama.versi)+1:1,sumber:'TAMBAHAN' });
  return { rec, oldId:lama&&lama.id };
}
function mp24IsiAlokasi_(L, x, u, now, P) {
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya Pengadaan/Admin yang boleh mengalokasikan item Bon.');
  if (x.batal === true) {   // v2.4.1: batal = baris tetap tersimpan (riwayat), volume dilepas. Tidak bergantung pada isi Bon/kontrak saat ini.
    const lamaB = x.id ? L.find(z => z.id === x.id) : null;
    if (!lamaB) throw new Error('Pilih alokasi yang akan dibatalkan.');
    if (Number(x.versi) !== Number(lamaB.versi)) throw new Error('KONFLIK alokasi: data sudah diubah. Muat ulang.');
    if (lamaB.batal) throw new Error('Alokasi ini sudah dibatalkan.');
    const alasan = s_(x.alasan).trim().slice(0, 300); if (!alasan) throw new Error('Alasan pembatalan alokasi wajib diisi.');
    return { rec: Object.assign({}, lamaB, { batal: true, alasanBatal: alasan, dibatalkanOleh: u.nama, dibatalkanPada: now, diubahOleh: u.nama, diubahPada: now, versi: Number(lamaB.versi) + 1 }), oldId: lamaB.id, kapasitas: 0, teralokasi: 0 };
  }
  const bonNomor=s_(x.bonNomor).trim(), bonIdx=Number(x.bonIdx), noKontrak=s_(x.noKontrak).trim(), wbs=s_(x.wbs).trim(), volume=Number(x.volume);
  if (!bonNomor || !Number.isInteger(bonIdx) || bonIdx < 0) throw new Error('Nomor dan baris Bon tidak valid.');
  if (!noKontrak || noKontrak.length>150 || !wbs || wbs.length>100) throw new Error('Kontrak dan WBS wajib diisi.');
  if (!isFinite(volume) || volume<=0) throw new Error('Volume alokasi harus lebih dari nol.');
  const bon = bacaKoleksi_(P, 'permintaan').find(b=>b.nomor===bonNomor);
  if (!bon || !(bon.items||[])[bonIdx]) throw new Error('Item Bon tidak ditemukan di proyek ini.');
  const it=bon.items[bonIdx], kapasitas=Number(it.vol);
  if (!(kapasitas>0)) throw new Error('Item Bon ini tidak memiliki volume positif.');
  const kodeAsli=s_(it.kode).trim(), uraianAsli=s_(it.uraian).trim();
  if ((x.bonKode && s_(x.bonKode)!==kodeAsli) || (x.bonUraian && s_(x.bonUraian)!==uraianAsli)) throw new Error('Isi item Bon berubah. Muat ulang dan periksa pasangan item.');
  const REGL=bacaKoleksi_(P, 'data'), PBJL=bacaPBJ_(P);
  const kontrakRegister=REGL.some(r=>r.noKontrak===noKontrak);
  const kontrakPBJ=PBJL.some(p=>p.status!=='BATAL' && p.noKontrak===noKontrak);
  // v2.4.1: item Bon yang sudah dikontrakkan (Register ber-No Permintaan / paket PBJ) hanya boleh dibagi WBS pada kontrak yang sama → volume & nilai tidak ganda
  const norm_ = t => s_(t).trim().toLowerCase(), tertaut = [];
  REGL.forEach(r => (r.items || []).forEach(i => { if (s_(i.noPermintaan).trim() === bonNomor && ((kodeAsli && s_(i.kode).trim() === kodeAsli) || norm_(i.uraian) === norm_(uraianAsli)) && tertaut.indexOf(r.noKontrak) < 0) tertaut.push(r.noKontrak); }));
  PBJL.forEach(p => { if (p.status !== 'BATAL' && p.noKontrak && (p.bon || []).some(b => b.nomor === bonNomor && Number(b.idx) === bonIdx) && tertaut.indexOf(p.noKontrak) < 0) tertaut.push(p.noKontrak); });
  if (tertaut.length && tertaut.indexOf(noKontrak) < 0) throw new Error('Item Bon ini sudah dikontrakkan di ' + tertaut.join(', ') + '. Alokasi hanya untuk membagi WBS pada kontrak tersebut agar volume/nilai tidak ganda.');
  if (!kontrakRegister && !kontrakPBJ && !(x.kontrakMaster===true && noKontrak.includes('/'+P+'/')))
    throw new Error('Nomor kontrak tidak ada di Register/PBJ. Referensi Master harus diverifikasi dan berada pada proyek ini.');
  const lama=x.id?L.find(z=>z.id===x.id):null;
  if (x.id && !lama) throw new Error('Alokasi tidak ditemukan.');
  if (lama && Number(x.versi)!==Number(lama.versi)) throw new Error('KONFLIK alokasi: data sudah diubah. Muat ulang.');
  if (lama && (lama.bonNomor!==bonNomor || Number(lama.bonIdx)!==bonIdx)) throw new Error('Identitas sumber Bon tidak boleh dipindahkan. Tambahkan alokasi baru.');
  if (lama && lama.batal) throw new Error('Alokasi ini sudah dibatalkan. Tambahkan alokasi baru.');
  if (L.some(z=>z.id!==x.id && !z.batal && z.bonNomor===bonNomor && Number(z.bonIdx)===bonIdx && z.noKontrak===noKontrak && z.wbs===wbs))
    throw new Error('Kombinasi item Bon, nomor kontrak, dan WBS sudah ada. Edit alokasi tersebut.');
  const teralokasi=L.filter(z=>z.id!==x.id && !z.batal && z.bonNomor===bonNomor && Number(z.bonIdx)===bonIdx).reduce((a,z)=>a+Number(z.volume),0);
  if (teralokasi+volume>kapasitas+0.000001) throw new Error('Volume melebihi Bon: sudah '+teralokasi+', tambahan '+volume+', tersedia '+kapasitas+'.');
  const rec=Object.assign({},lama||{id:idBaru_('AB'),dibuatOleh:u.nama,dibuatPada:now},
   {bonNomor,bonIdx,bonKode:kodeAsli,bonUraian:uraianAsli,noKontrak,wbs,volume,
    kontrakMaster:!kontrakRegister&&!kontrakPBJ,verifikasiKontrak:(kontrakRegister||kontrakPBJ)?'SERVER_TERVERIFIKASI':'REFERENSI_MASTER_BELUM_DIVERIFIKASI_SERVER',catatan:s_(x.catatan).trim().slice(0,500),
    diubahOleh:u.nama,diubahPada:now,versi:lama?Number(lama.versi)+1:1});
  return {rec,oldId:lama&&lama.id,kapasitas,teralokasi};
}

/* ===================================================================
   v2.4.3 / Checklist Tagihan v2.1.7 — data ADITIF
   Sheet proyek: <P>_ChecklistTagihan. Tidak menyentuh tabel lama.
   =================================================================== */
const CL217_TEMPLATES = {"ALAT":[{"nama":"UMUM","items":[{"k":"UMUM_01","nama":"SPKTV","ketentuan":"Asli"},{"k":"UMUM_02","nama":"Jurnal Hutang","ketentuan":"Asli"},{"k":"UMUM_03","nama":"Kwitansi","ketentuan":"Asli"},{"k":"UMUM_04","nama":"Invoice","ketentuan":"Asli"},{"k":"UMUM_05","nama":"Faktur Pajak","ketentuan":"Asli"},{"k":"UMUM_06","nama":"E-Nofa","ketentuan":"Asli"},{"k":"UMUM_07","nama":"BAP","ketentuan":"Asli"},{"k":"UMUM_08","nama":"BAPA","ketentuan":"Asli"},{"k":"UMUM_09","nama":"Kontrak","ketentuan":"Copy"},{"k":"UMUM_10","nama":"KTP","ketentuan":"Copy"},{"k":"UMUM_11","nama":"NPWP","ketentuan":"Copy"},{"k":"UMUM_12","nama":"SBUJK","ketentuan":"Copy"},{"k":"UMUM_13","nama":"SIUP","ketentuan":"Copy"}]},{"nama":"ALAT","items":[{"k":"ALAT_01","nama":"SILO / KIR / STNK (Max. 5 Tahun)","ketentuan":"Copy"},{"k":"ALAT_02","nama":"SIO / SIM (Max. 5 Tahun)","ketentuan":"Copy"},{"k":"ALAT_03","nama":"Assuransi Alat / Kendaraan Sewa","ketentuan":"Copy"},{"k":"ALAT_04","nama":"Rekap Timesheet Alat","ketentuan":"Copy"},{"k":"ALAT_05","nama":"Timesheet Alat","ketentuan":"Copy"},{"k":"ALAT_06","nama":"Laporan Cuaca (Prod 06)","ketentuan":"Copy"},{"k":"ALAT_07","nama":"Laporan Alat Proyek (Prod 07) - stabilo alat","ketentuan":"Copy"},{"k":"ALAT_08","nama":"Laporan Pegawai Proyek (Prod 05) - Stabilo Operator","ketentuan":"Copy"},{"k":"ALAT_09","nama":"BASTA","ketentuan":"Copy"},{"k":"ALAT_10","nama":"BAASO","ketentuan":"Copy"},{"k":"ALAT_11","nama":"Surat Pernyataan (Untuk alat yang beda kepemilikan)","ketentuan":"Copy"},{"k":"ALAT_12","nama":"Dokumentasi Alat","ketentuan":"Copy"}]}],"BAHAN":[{"nama":"UMUM","items":[{"k":"UMUM_01","nama":"SPKTV","ketentuan":"Asli"},{"k":"UMUM_02","nama":"Jurnal Hutang","ketentuan":"Asli"},{"k":"UMUM_03","nama":"Kwitansi","ketentuan":"Asli"},{"k":"UMUM_04","nama":"Invoice","ketentuan":"Asli"},{"k":"UMUM_05","nama":"Faktur Pajak","ketentuan":"Asli"},{"k":"UMUM_06","nama":"E-Nofa","ketentuan":"Asli"},{"k":"UMUM_07","nama":"BAP","ketentuan":"Asli"},{"k":"UMUM_08","nama":"BAPM","ketentuan":"Asli"},{"k":"UMUM_09","nama":"Kontrak","ketentuan":"Copy"},{"k":"UMUM_10","nama":"KTP","ketentuan":"Copy"},{"k":"UMUM_11","nama":"NPWP","ketentuan":"Copy"},{"k":"UMUM_12","nama":"SBUJK","ketentuan":"Copy"},{"k":"UMUM_13","nama":"SIUP","ketentuan":"Copy"}]},{"nama":"BAHAN","items":[{"k":"BAHAN_01","nama":"Rekap Surat Jalan","ketentuan":"Asli"},{"k":"BAHAN_02","nama":"Surat Jalan","ketentuan":"Asli"},{"k":"BAHAN_03","nama":"Hasil test Material (Baja, Beton, Aspal, dll)","ketentuan":"Copy"},{"k":"BAHAN_04","nama":"Approval Material (Item Mayor dan ME)","ketentuan":"Copy"},{"k":"BAHAN_05","nama":"KPB (Prod 17)","ketentuan":"Copy"},{"k":"BAHAN_06","nama":"Kartu Gudang","ketentuan":"Copy"},{"k":"BAHAN_07","nama":"Bon Permintaan","ketentuan":"Copy"},{"k":"BAHAN_08","nama":"Izin Quary (material alam)","ketentuan":"Copy"},{"k":"BAHAN_09","nama":"Prod-07 (khusus material Solar)","ketentuan":"Copy"},{"k":"BAHAN_10","nama":"Evaluasi Penggunaan Solar (khusus material Solar)","ketentuan":"Asli"},{"k":"BAHAN_11","nama":"Jaminan Uang Muka","ketentuan":"Copy"},{"k":"BAHAN_12","nama":"Foto Dokumentasi (Terlihat nopol dan saat datang)","ketentuan":"Copy"}]}],"SUBKON":[{"nama":"UMUM","items":[{"k":"UMUM_01","nama":"SPKTV","ketentuan":"Asli"},{"k":"UMUM_02","nama":"Jurnal Hutang","ketentuan":"Asli"},{"k":"UMUM_03","nama":"Kwitansi","ketentuan":"Asli"},{"k":"UMUM_04","nama":"Invoice","ketentuan":"Asli"},{"k":"UMUM_05","nama":"Faktur Pajak","ketentuan":"Asli"},{"k":"UMUM_06","nama":"E-Nofa","ketentuan":"Asli"},{"k":"UMUM_07","nama":"BAP","ketentuan":"Asli"},{"k":"UMUM_08","nama":"BAPP","ketentuan":"Asli"},{"k":"UMUM_09","nama":"Kontrak","ketentuan":"Copy"},{"k":"UMUM_10","nama":"KTP","ketentuan":"Copy"},{"k":"UMUM_11","nama":"NPWP","ketentuan":"Copy"},{"k":"UMUM_12","nama":"SBUJK","ketentuan":"Copy"},{"k":"UMUM_13","nama":"SIUP","ketentuan":"Copy"}]},{"nama":"SUBKON","items":[{"k":"SUBKON_01","nama":"BA Final Account / Cutt off Proggress > 85%","ketentuan":"Copy"},{"k":"SUBKON_02","nama":"Jaminan Pelaksanaan","ketentuan":"Copy"},{"k":"SUBKON_03","nama":"Bank Garansi","ketentuan":"Copy"},{"k":"SUBKON_04","nama":"Lisensi Spesialisasi","ketentuan":"Copy"},{"k":"SUBKON_05","nama":"BA Rekap Detail Opname","ketentuan":"Copy"},{"k":"SUBKON_06","nama":"Gambar & Mapping Opname","ketentuan":"Copy"},{"k":"SUBKON_07","nama":"BA Test Commisioning (Pek. ME)","ketentuan":"Copy"},{"k":"SUBKON_08","nama":"BA Site Visit (Pek Material Alam)","ketentuan":"Copy"},{"k":"SUBKON_09","nama":"Izin Quary (Pek Material Alam)","ketentuan":"Copy"},{"k":"SUBKON_10","nama":"BAST - 1 (Prod 38)","ketentuan":"Copy"},{"k":"SUBKON_11","nama":"BAST - 2 (Prod 41)","ketentuan":"Copy"},{"k":"SUBKON_12","nama":"BA Defect List Pemeliharaan","ketentuan":"Copy"},{"k":"SUBKON_13","nama":"Surat Konfirmasi hutang","ketentuan":"Copy"}]}]};
const CL217_COL = ['ID Progres','Nomor Kontrak','Kategori','Versi','Diubah Oleh','Diubah Pada','DATA'];
function cl217Kategori_(no) {
  const m = s_(no).toUpperCase().match(/(?:^|\/)(SPSA|SPM|SPPM|SPKP|SPPP|SPK)(?=\/|$)/);
  return m ? ({ SPSA:'ALAT',SPM:'BAHAN',SPPM:'BAHAN',SPKP:'SUBKON',SPPP:'SUBKON',SPK:'SUBKON' }[m[1]] || '') : '';
}
function cl217Template_(kategori) {
  if (!CL217_TEMPLATES[kategori]) throw new Error('Jenis kontrak belum dapat dikategorikan. Hubungi Admin untuk menetapkan kategori.');
  return CL217_TEMPLATES[kategori].reduce((a, s) => a.concat(s.items), []);
}
function cl217Cari_(P,id) {
  const sh=ss_().getSheetByName(P+'_ChecklistTagihan');
  if (!sh) return {rec:null,row:0};
  const data=baris_(sh), i=data.findIndex(r=>s_(r[0])===s_(id));
  return {rec:i<0?null:JSON.parse(s_(data[i][6])),row:i<0?0:i+2};
}
function cl217Baca_(P) {
  const sh=ss_().getSheetByName(P+'_ChecklistTagihan');
  return sh?baris_(sh).filter(r=>r[6]).map(r=>JSON.parse(s_(r[6]))):[];
}
function cl217Tagihan_(P,id) {
  const e=bacaKoleksi_(P,'progres').find(x=>x.id===id);
  if(!e) throw new Error('Tagihan/BK tidak ditemukan di proyek ini.');
  return e;
}
function cl217Dasar_(e) {
  const k=cl217Kategori_(e.noKontrak);
  return {id:e.id,noKontrak:e.noKontrak,kategori:k,versi:0,items:{},divisi:'Infrastruktur',pengajuan:'',verified:false,diubahOleh:'',diubahPada:'',riwayatKategori:[]};
}
function cl217RefValid_(P,raw) {
  const b=refBerkas_(raw);
  if(!b||!b.idServer||b.lokasi!=='server') throw new Error('Dokumen wajib diunggah ke Google Drive, bukan hanya tersimpan di browser.');
  let f;try{f=DriveApp.getFileById(b.idServer);}catch(err){throw new Error('Dokumen Google Drive tidak ditemukan.');}
  const parents=f.getParents(), pid=folderProyek_(P).getId();let milik=false;
  while(parents.hasNext())if(parents.next().getId()===pid)milik=true;
  if(!milik)throw new Error('Berkas bukan milik proyek '+P+'.');
  if(f.getMimeType()!=='application/pdf'||f.getSize()>BATAS_PDF)throw new Error('Lampiran wajib PDF yang sah dan maksimal 10 MB.');
  return Object.assign({},b,{idServer:f.getId(),nama:f.getName().slice(0,300),url:f.getUrl(),ukuran:f.getSize(),lokasi:'server'});
}
function cl217Hitung_(rec) {
  const t=cl217Template_(rec.kategori),items=rec.items||{};
  let lengkap=0,ada=0,na=0;
  t.forEach(d=>{const v=items[d.k]||{};if(v.status==='ADA'&&v.file&&v.file.idServer){lengkap++;ada++;}else if(v.status==='NA'&&s_(v.alasan).trim().length>=12){lengkap++;na++;}});
  return {lengkap:lengkap,total:t.length,ada:ada,na:na,siap:!!rec.verified&&lengkap===t.length};
}
function cl217SimpanBaris_(P,r,row) {
  const sh=sheet_(P+'_ChecklistTagihan',CL217_COL);
  const vals=[r.id,r.noKontrak,r.kategori,r.versi,r.diubahOleh,r.diubahPada,JSON.stringify(r)];
  if(row)sh.getRange(row,1,1,vals.length).setValues([vals]);else sh.appendRow(vals);
}
function cl217Aksi_(req,u,P,now) {
  const A=req.action, x=req.data||{};
  if(A==='checklistRingkas')return {ok:true,data:cl217Baca_(P).map(r=>Object.assign({id:r.id,kategori:r.kategori},cl217Hitung_(r)))};
  if(A==='checklistBaca') {
    const e=cl217Tagihan_(P,s_(req.id)),c=cl217Cari_(P,e.id);
    return {ok:true,data:c.rec||cl217Dasar_(e),hitung:c.rec&&c.rec.kategori?cl217Hitung_(c.rec):null};
  }
  if(u.peran!=='PENGADAAN')throw new Error('Hanya Pengadaan atau Admin yang dapat mengubah checklist.');
  const e=cl217Tagihan_(P,s_(x.id)),c=cl217Cari_(P,e.id),r=c.rec||cl217Dasar_(e);
  if(c.rec&&s_(r.noKontrak)!==s_(e.noKontrak))throw new Error('Nomor kontrak tagihan telah berubah. Hubungi Admin untuk rekonsiliasi checklist sebelum digunakan.');
  if(Number(x.versi)!==Number(r.versi))throw new Error('KONFLIK: checklist sudah diperbarui pengguna lain. Muat ulang.');
  if(A==='checklistKategori') {
    if(!u.admin)throw new Error('Hanya Admin yang dapat mengubah kategori kontrak.');
    const kat=s_(x.kategori).toUpperCase(),alasan=s_(x.alasan).trim();
    cl217Template_(kat);
    if(alasan.length<12)throw new Error('Alasan perubahan kategori minimal 12 karakter.');
    if(r.kategori!==kat) {
      r.riwayatKategori=r.riwayatKategori||[];
      r.riwayatKategori.push({dari:r.kategori,ke:kat,alasan:alasan,oleh:u.nama,pada:now,itemsLama:r.items||{}});
      r.items={};r.kategori=kat;r.verified=false;r.verifikasi=null;
    }
  } else if(A==='checklistSimpan') {
    cl217Template_(r.kategori);
    const draft={},ds=cl217Template_(r.kategori),obj=x.items||{};
    ds.forEach(d=>{
      const v=obj[d.k]||{},status=s_(v.status||'TIDAK').toUpperCase();
      if(!['ADA','TIDAK','NA'].includes(status))throw new Error('Status tidak dikenal: '+d.nama);
      let file=null;
      if(status==='ADA') {
        const sebelum=(r.items||{})[d.k],oldFile=sebelum&&sebelum.file;
        // Metadata yang SUDAH divalidasi oleh server tak perlu diambil ulang dari Drive pada setiap edit.
        // File baru/berbeda tetap divalidasi, dan seluruh berkas dicek ulang saat Verifikasi Admin.
        file=(oldFile&&oldFile.idServer&&v.file&&oldFile.idServer===v.file.idServer)
          ? oldFile : cl217RefValid_(P,v.file);
      }
      const alasan=s_(v.alasan).trim().slice(0,350);
      if(status==='NA'&&alasan.length<12)throw new Error('Alasan Tidak Berlaku minimal 12 karakter: '+d.nama);
      const tgl=s_(v.tgl).trim();
      if(tgl&&!/^\d{4}-\d{2}-\d{2}$/.test(tgl))throw new Error('Tanggal tidak valid: '+d.nama);
      draft[d.k]={status:status,tgl:tgl,ket:s_(v.ket).trim().slice(0,350),alasan:status==='NA'?alasan:'',file:file};
    });
    r.pengajuan=s_(x.pengajuan).trim().slice(0,80);r.divisi=s_(x.divisi||'Infrastruktur').trim().slice(0,80);
    if(JSON.stringify(r.items)!==JSON.stringify(draft)){r.items=draft;r.verified=false;r.verifikasi=null;}
  } else if(A==='checklistVerifikasi') {
    if(!u.admin)throw new Error('Hanya Admin yang dapat memverifikasi checklist.');
    cl217Template_(r.kategori);const hitung=cl217Hitung_(r);
    if(hitung.lengkap!==hitung.total)throw new Error('Checklist masih kurang: '+hitung.lengkap+'/'+hitung.total+' dokumen.');
    cl217Template_(r.kategori).forEach(d=>{
      const v=(r.items||{})[d.k]||{};
      if(v.status==='ADA')cl217RefValid_(P,v.file);
    });
    if(!x.konfirmasiAsli)throw new Error('Admin harus mengonfirmasi pemeriksaan dokumen fisik Asli dan kesesuaian lampiran.');
    r.verified=true;r.verifikasi={oleh:u.nama,pada:now,keterangan:s_(x.keterangan).trim().slice(0,300),asliDiperiksa:true};
  } else throw new Error('Aksi checklist tidak dikenal.');
  if(JSON.stringify(r).length>45000)throw new Error('Data checklist terlalu besar untuk satu baris Google Sheets. Hubungi Admin untuk mengarsipkan riwayat kategori.');
  r.versi=Number(r.versi)+1;r.diubahOleh=u.nama;r.diubahPada=now;
  cl217SimpanBaris_(P,r,c.row);
  catat_(P,{id:r.id,noKontrak:r.noKontrak},u,A+' CHECKLIST',r.kategori+' · '+cl217Hitung_(r).lengkap+'/'+cl217Hitung_(r).total);
  return {ok:true,data:r,hitung:cl217Hitung_(r)};
}

/* ========================================================================
 * v2.4.4 — ADMIN-FIRST RELEASE MANAGEMENT (additive, no business-data migration)
 * MP218: only authenticated Admin may stage, inspect, approve or roll back.
 * The anonymous GET ?action=pembaruan returns PUBLISHED ONLY.
 * ======================================================================== */
const MP218_BASIS = '2.0';
const MP218_MARKER = 'MP218_ADMIN_FIRST_MARKER';
const MP218_ACTIONS = ['bacaPembaruanAdmin','ambilKandidatPembaruan','unggahKandidatPembaruan','tolakKandidatPembaruan','terbitkanKandidatPembaruan','rollbackPembaruan'];
function mp218Metadata_(x) {
  if (!x) return null;
  return {versi:s_(x.versi),untukDasar:s_(x.untukDasar),tanggal:s_(x.tanggal),catatan:s_(x.catatan),
    dipasangOleh:s_(x.dipasangOleh),dipasangPada:s_(x.dipasangPada),diunggahOleh:s_(x.diunggahOleh),diunggahPada:s_(x.diunggahPada)};
}
function mp218PaketFile_(id) {
  if (!id) return null;
  try {
    const src=DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
    const d=JSON.parse(src);
    if (d.format!=='monitoring-sap-pembaruan') throw new Error('format paket tidak dikenal');
    return d;
  } catch(e) {throw new Error('Berkas pembaruan di Drive tidak dapat dibaca: '+(e.message||e));}
}
function mp218VersiBanding_(a,b) {
  const ar=String(a||'0').split('.').map(x=>Number(x)||0),br=String(b||'0').split('.').map(x=>Number(x)||0);
  for(let i=0;i<Math.max(ar.length,br.length);i++) if((ar[i]||0)!==(br[i]||0))return (ar[i]||0)>(br[i]||0)?1:-1;
  return 0;
}
function mp218Validasi_(p,aktif,bootstrap) {
  if (!p || p.format!=='monitoring-sap-pembaruan') throw new Error('Format paket JSON tidak cocok.');
  if(!/^\d+\.\d+\.\d+$/.test(s_(p.versi)))throw new Error('Nomor versi harus seperti 2.1.9.');
  if(s_(p.untukDasar)!==MP218_BASIS)throw new Error('Paket harus ditujukan untuk HTML dasar v2.0.');
  if(typeof p.js!=='string'||typeof p.css!=='string')throw new Error('JS/CSS paket harus berupa teks.');
  if(!bootstrap && !p.js.includes(MP218_MARKER))throw new Error('Paket tidak kumulatif: komponen Admin-first v2.1.8 tidak ditemukan.');
  if(aktif && mp218VersiBanding_(p.versi,aktif.versi)<=0)throw new Error('Versi kandidat harus lebih baru daripada versi terbit ('+aktif.versi+').');
  const isi=JSON.stringify(p);
  if(Utilities.newBlob(isi).getBytes().length>5*1024*1024)throw new Error('Paket > 5 MB.');
  return isi;
}
/* v2.4.5 — metadata paket (tanpa isi JS/CSS) agar panel Admin & cek versi staf ringan */
function mp219Sidik_(p) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s_(p.versi) + '|' + s_(p.css) + '|' + s_(p.js), Utilities.Charset.UTF_8);
  return d.slice(0, 12).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}
function mp219SimpanMeta_(id, p) {
  if (!id || !p) return null;
  const m = { id: id, versi: s_(p.versi), untukDasar: s_(p.untukDasar), tanggal: s_(p.tanggal), catatan: s_(p.catatan).slice(0, 600),
    adminFirst: s_(p.js).indexOf(MP218_MARKER) >= 0, ukuran: s_(p.js).length + s_(p.css).length, sidik: mp219Sidik_(p),
    dipasangOleh: s_(p.dipasangOleh), dipasangPada: s_(p.dipasangPada), diunggahOleh: s_(p.diunggahOleh), diunggahPada: s_(p.diunggahPada) };
  try { PropertiesService.getScriptProperties().setProperty('META_' + id, JSON.stringify(m)); } catch (e) { }
  return m;
}
function mp219Meta_(id) {
  if (!id) return null;
  try { const t = PropertiesService.getScriptProperties().getProperty('META_' + id); if (t) return JSON.parse(t); } catch (e) { }
  return mp219SimpanMeta_(id, mp218PaketFile_(id));
}
function mp219Riwayat_(P) {
  try { return bacaLog_(P, 'PEMBARUAN').slice(0, 12).map(l => ({ waktu: l.waktu, versi: l.noKontrak, oleh: l.oleh, aksi: l.aksi, detail: s_(l.detail).slice(0, 220) })); }
  catch (e) { return []; }
}

function mp218Aksi_(req,u,P,now) {
  if(!u.admin)throw new Error('Khusus Admin: tindakan pembaruan tidak diizinkan.');
  const props=PropertiesService.getScriptProperties(),get=k=>props.getProperty(k)||'';
  const aktifId=get('PEMB_AKTIF'),kandidatId=get('MP218_KANDIDAT'),sebelumId=get('MP218_SEBELUM');
  const action=req.action;
  if(action==='bacaPembaruanAdmin'){   // v2.4.5: metadata tersimpan, tanpa membaca isi paket dari Drive
    const ma=mp219Meta_(aktifId),mk=mp219Meta_(kandidatId),ms=mp219Meta_(sebelumId);
    return {ok:true,versiServer:VERSI_SERVER,aktif:ma,kandidat:mk,sebelumnya:ms,
      adminFirst:get('MP218_READY')==='1'||!!(ma&&ma.adminFirst)||!!mk,bootstrap:!(ma&&ma.adminFirst),riwayat:mp219Riwayat_(P)};
  }
  const aktif=aktifId?mp218PaketFile_(aktifId):null;
  if(action==='ambilKandidatPembaruan'){
    if(!kandidatId)throw new Error('Belum ada kandidat pembaruan.');
    if(s_(req.versi) && s_(req.versi)!==mp218PaketFile_(kandidatId).versi)throw new Error('Kandidat sudah berubah. Muat ulang daftar.');
    return {ok:true,data:mp218PaketFile_(kandidatId)};
  }
  if(action==='unggahKandidatPembaruan'){
    const x=req.data||{};const isi=mp218Validasi_(x,aktif,false);
    if(kandidatId)throw new Error('Masih ada kandidat pembaruan. Tolak kandidat lama sebelum mengganti.');
    const r=Object.assign({},x,{diunggahOleh:u.nama,diunggahPada:now});
    const f=folderPembaruan_().createFile(Utilities.newBlob(JSON.stringify(r),'application/json','KANDIDAT-'+x.versi+'.json'));
    mp219SimpanMeta_(f.getId(),r);
    props.setProperty('MP218_KANDIDAT',f.getId());
    catat_(P,{id:'PEMBARUAN',noKontrak:x.versi},u,'UPLOAD KANDIDAT','Belum ditayangkan ke staf. '+s_(x.catatan).slice(0,180));
    return {ok:true,kandidat:mp219Meta_(f.getId())};
  }
  if(action==='tolakKandidatPembaruan'){
    if(!kandidatId)throw new Error('Tidak ada kandidat untuk ditolak.');
    const k=mp218PaketFile_(kandidatId);
    if(s_(req.versi)!==s_(k.versi))throw new Error('Kandidat berubah; muat ulang sebelum menolak.');
    props.deleteProperty('MP218_KANDIDAT');
    // If the first Admin-only bootstrap is rejected, restore the legacy
    // ability to submit v2.1.8 as a candidate again. Published staff unchanged.
    if (s_(k.versi)==='2.1.8' && (!aktif || mp218VersiBanding_(aktif.versi,'2.1.8')<0))
      props.deleteProperty('MP218_READY');
    catat_(P,{id:'PEMBARUAN',noKontrak:k.versi},u,'TOLAK KANDIDAT',s_(req.alasan).slice(0,200)||'Tidak disetujui Admin');
    return {ok:true};
  }
  if(action==='terbitkanKandidatPembaruan'){
    if(!kandidatId)throw new Error('Belum ada kandidat.');
    const k=mp218PaketFile_(kandidatId);
    if(s_(req.versi)!==s_(k.versi))throw new Error('Kandidat telah berubah. Periksa ulang.');
    if(s_(req.konfirmasi)!=='LULUS UJI')throw new Error('Konfirmasi hasil uji wajib diisi: LULUS UJI.');
    mp218Validasi_(k,aktif,false);
    if(aktifId)props.setProperty('MP218_SEBELUM',aktifId);
    props.setProperty('PEMB_AKTIF',kandidatId); // switch published pointer atomically as late as possible
    props.deleteProperty('MP218_KANDIDAT');
    props.setProperty('MP218_READY','1');
    CacheService.getScriptCache().remove('PEMB_AKTIF');CacheService.getScriptCache().remove('PEMB_AKTIF_M');
    catat_(P,{id:'PEMBARUAN',noKontrak:k.versi},u,'TERBITKAN PEMBARUAN','Dari '+(aktif?aktif.versi:'dasar')+' setelah persetujuan Admin. '+s_(req.catatanUji).slice(0,180));
    return {ok:true,aktif:mp219Meta_(kandidatId)};
  }
  if(action==='rollbackPembaruan'){
    if(!sebelumId)throw new Error('Belum ada versi terbit sebelumnya. Tidak kembali otomatis ke HTML v2.0.');
    const s=mp218PaketFile_(sebelumId);
    if(s_(req.versiSekarang)!==s_(aktif&&aktif.versi))throw new Error('Versi aktif berubah. Muat ulang sebelum rollback.');
    if(s_(req.konfirmasi)!=='KEMBALIKAN')throw new Error('Konfirmasi rollback salah.');
    // Emergency rollback to a legacy published package is allowed, with an explicit
    // visible suspension of Admin-first until the administrator reinstalls v2.1.8.
    const legacy = !s.js.includes(MP218_MARKER);
    if (legacy) props.setProperty('MP218_READY','0');
    if(aktifId)props.setProperty('MP218_SEBELUM',aktifId);
    props.setProperty('PEMB_AKTIF',sebelumId);
    CacheService.getScriptCache().remove('PEMB_AKTIF');CacheService.getScriptCache().remove('PEMB_AKTIF_M');
    catat_(P,{id:'PEMBARUAN',noKontrak:s.versi},u,'ROLLBACK PEMBARUAN','Frontend '+(aktif?aktif.versi:'?')+' → '+s.versi+'; database tidak diubah.');
    return {ok:true,aktif:mp218Metadata_(s),adminFirst:!legacy,peringatan:legacy?'Admin-first ditangguhkan sementara; pasang kembali v2.1.8 setelah pemulihan.':''};
  }
  throw new Error('Aksi pembaruan tidak dikenal.');
}

/* =====================================================================
   v2.4.5 — FUNGSI EDITOR (jalankan manual dari Apps Script oleh pemilik script)
   Tidak mengubah data baku. Tidak menerbitkan apa pun ke staf.
   ===================================================================== */
function statusPembaruan() {   // diagnosis baca-saja
  const g = k => PropertiesService.getScriptProperties().getProperty(k) || '';
  const info = id => { if (!id) return '-'; try { const m = mp219Meta_(id); return m.versi + (m.adminFirst ? ' [Admin-first]' : ' [antarmuka lama]') + ' · ' + m.tanggal + ' · ' + Math.round(m.ukuran / 1024) + ' KB'; } catch (e) { return 'GALAT: ' + e.message; } };
  Logger.log('Server         : v' + VERSI_SERVER);
  Logger.log('Terbit (staf)  : ' + info(g('PEMB_AKTIF')));
  Logger.log('Kandidat Admin : ' + info(g('MP218_KANDIDAT')));
  Logger.log('Sebelumnya     : ' + info(g('MP218_SEBELUM')));
  Logger.log('MP218_READY    : ' + (g('MP218_READY') || '(kosong)'));
}
function lepasKandidatMacet() {   // melepas kandidat yang macet; versi terbit staf TIDAK berubah, berkas tetap di Drive
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('MP218_KANDIDAT');
  if (!id) { Logger.log('Tidak ada kandidat.'); return; }
  const m = mp219Meta_(id); props.deleteProperty('MP218_KANDIDAT');
  const aktif = mp219Meta_(props.getProperty('PEMB_AKTIF'));
  if (!(aktif && aktif.adminFirst)) props.deleteProperty('MP218_READY');
  catat_(PROYEK_AWAL.id, { id: 'PEMBARUAN', noKontrak: m ? m.versi : '?' }, { nama: 'Editor Apps Script', peran: 'ADMIN' }, 'LEPAS KANDIDAT (EDITOR)', 'Versi terbit staf tidak berubah.');
  Logger.log('Kandidat ' + (m ? m.versi : id) + ' dilepas. Versi terbit staf tetap. Berkas tetap tersimpan di Drive.');
}

/* =======================================================================
 * v2.5.0 — KERNEL MODUL SERVER
 * Setelah kode ini terpasang, logika server baru dikirim sebagai paket
 * "server-modul-x.y.z.json" yang diunggah dari aplikasi (Diagnostik › Modul server):
 *   Unggah kandidat → Uji (baca-saja) → Terbitkan → Rollback — TANPA deployment ulang.
 * Pengaman:
 *   · Hanya SATU Admin penerbit (Script Properties: PENERBIT_MODUL; bawaan di bawah) yang boleh
 *     mengunggah / menerbitkan / rollback modul. Admin lain hanya dapat melihat status.
 *   · Setiap modul dicatat sidik SHA-256 & riwayatnya di sheet Log; berkas lama tetap di Drive.
 *   · Modul tidak dapat mengganti aksi inti (login, pengguna, pembaruan, modul).
 *   · Modul rusak → hanya aksi modul yang mati; aplikasi inti tetap berjalan.
 *   · Darurat: jalankan nonaktifkanModul() dari editor (tanpa deployment ulang).
 * Deployment ulang hanya diperlukan bila kernel ini berubah atau butuh layanan/izin Google baru.
 * ======================================================================= */
const KERNEL_VERSI = '2.5';
const MODUL_FORMAT = 'monitoring-sap-modul-server';
const PENERBIT_MODUL_AWAL = 'Joko Supriyono';
const MODUL_AKSI_INTI = ['modulInfo', 'modulUnggah', 'modulTolak', 'modulTerbit', 'modulRollback'];
const MODUL_TERLINDUNG = ['login', 'daftar', 'mintaReset', 'gantiSandi', 'ubahProfil', 'adminData', 'simpanPengguna', 'simpanProyek', 'setujuiDaftar', 'tolakDaftar',
  'selesaiReset', 'pasangPembaruan', 'cabutPembaruan', 'kunciMigrasi', 'bukaMigrasi'].concat(MODUL_AKSI_INTI, MP218_ACTIONS);
const MODUL_KAIT = ['sebelumAuth', 'authGagal', 'authBerhasil', 'setelahUnggah', 'terjadwal'];   // v2.5.1: + terjadwal
const BACA_INTI = ['baca', 'login', 'ambilBerkas', 'bacaSemua', 'bacaMasterTambahan', 'bacaAlokasiBon', 'checklistBaca', 'checklistRingkas', 'bacaPembaruanAdmin', 'ambilKandidatPembaruan', 'modulInfo'];
let MODUL_CACHE_ = {}, MODUL_GALAT_ = {}, MODUL_UJI_ = false;

function modulReset_() { MODUL_CACHE_ = {}; MODUL_GALAT_ = {}; MODUL_UJI_ = false; }
function modulProps_() { return PropertiesService.getScriptProperties(); }
function penerbitModul_() { return s_(modulProps_().getProperty('PENERBIT_MODUL') || PENERBIT_MODUL_AWAL).trim(); }
function bolehTerbitModul_(u) { return !!(u && u.admin && s_(u.nama).trim().toLowerCase() === penerbitModul_().toLowerCase()); }
function folderModul_() { const akar = folderBerkas_(), it = akar.getFoldersByName('Modul Server'); return it.hasNext() ? it.next() : akar.createFolder('Modul Server'); }
function modulSidik_(teks) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s_(teks), Utilities.Charset.UTF_8).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }
function modulBanding_(a, b) { return mp218VersiBanding_(a, b); }

/* ---------- baca berkas modul (dengan cache per potongan) ---------- */
function modulBacaFile_(id) {
  const cache = CacheService.getScriptCache(), k = 'MODUL_F_' + id;
  try {
    const m = JSON.parse(cache.get(k) || 'null');
    if (m && m.n) { const keys = []; for (let i = 0; i < m.n; i++) keys.push(k + '_' + i); const got = cache.getAll(keys);
      if (keys.every(x => typeof got[x] === 'string')) return JSON.parse(keys.map(x => got[x]).join('')); }
  } catch (e) { }
  const teks = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
  try { const o = {}; let n = 0; for (let i = 0; i < teks.length; i += 90000) o[k + '_' + (n++)] = teks.slice(i, i + 90000);
    if (n <= 40) { cache.putAll(o, 21600); cache.put(k, JSON.stringify({ n: n }), 21600); } } catch (e) { }
  return JSON.parse(teks);
}
/* ---------- kompilasi & validasi bentuk modul ---------- */
function modulKompilasi_(p) {
  if (!p || p.format !== MODUL_FORMAT) throw new Error('Format modul server tidak dikenal.');
  if (typeof p.kode !== 'string' || !p.kode.trim()) throw new Error('Isi kode modul kosong.');
  let m;
  try { m = (new Function('KERNEL', '"use strict";\n' + p.kode))({ versi: KERNEL_VERSI, versiServer: VERSI_SERVER, fiturInti: FITUR_SERVER.slice(), kaitTersedia: MODUL_KAIT.slice(), luar: true }); }
  catch (e) { throw new Error('Modul gagal dimuat: ' + (e && e.message || e)); }
  if (!m || typeof m !== 'object') throw new Error('Modul harus mengembalikan objek {aksi, fitur, baca, kait}.');
  const aksi = m.aksi || {}, kait = m.kait || {}, fitur = m.fitur || [], baca = m.baca || [], timpa = m.timpa || [];
  if (typeof aksi !== 'object' || typeof kait !== 'object' || !Array.isArray(fitur) || !Array.isArray(baca) || !Array.isArray(timpa)) throw new Error('Bentuk modul tidak valid.');
  Object.keys(aksi).forEach(a => {
    if (typeof aksi[a] !== 'function') throw new Error('Aksi modul "' + a + '" bukan fungsi.');
    if (MODUL_TERLINDUNG.indexOf(a) >= 0) throw new Error('Modul tidak boleh mengganti aksi inti "' + a + '".');
  });
  timpa.forEach(a => { if (MODUL_TERLINDUNG.indexOf(a) >= 0 || typeof aksi[a] !== 'function') throw new Error('Daftar timpa tidak valid: ' + a); });
  Object.keys(kait).forEach(k => { if (MODUL_KAIT.indexOf(k) < 0 || typeof kait[k] !== 'function') throw new Error('Kait modul tidak dikenal: ' + k); });
  return { versi: s_(p.versi), aksi: aksi, kait: kait, fitur: fitur.map(s_), baca: baca.map(s_), timpa: timpa.map(s_) };
}
function modulMuat_(jenis) {   // 'aktif' | 'kandidat'
  if (MODUL_CACHE_.hasOwnProperty(jenis)) return MODUL_CACHE_[jenis];
  MODUL_CACHE_[jenis] = null;
  const props = modulProps_();
  if (props.getProperty('MODUL_NONAKTIF') === '1') { MODUL_GALAT_[jenis] = 'Modul dinonaktifkan dari editor (MODUL_NONAKTIF = 1).'; return null; }
  const id = props.getProperty(jenis === 'kandidat' ? 'MODUL_KANDIDAT' : 'MODUL_AKTIF'); if (!id) return null;
  try { MODUL_CACHE_[jenis] = modulKompilasi_(modulBacaFile_(id)); }
  catch (e) { MODUL_GALAT_[jenis] = e.message || String(e); }
  return MODUL_CACHE_[jenis];
}
function modulKini_() { return modulMuat_(MODUL_UJI_ ? 'kandidat' : 'aktif'); }
function kait_(nama) {
  const m = modulKini_(); if (!m || typeof m.kait[nama] !== 'function') return undefined;
  return m.kait[nama].apply(null, Array.prototype.slice.call(arguments, 1));
}
function fiturSemua_(m) {
  m = m === undefined ? modulKini_() : m;
  const f = FITUR_SERVER.concat(['modulServer']);
  (m ? m.fitur : []).forEach(x => { if (f.indexOf(x) < 0) f.push(x); });
  return f;
}
function aksiBaca_(a, uji) {
  if (BACA_INTI.indexOf(a) >= 0) return true;
  const m = modulMuat_(uji ? 'kandidat' : 'aktif');
  return !!(m && m.baca.indexOf(a) >= 0);
}
function modulAksiTimpa_(req, u, P, now) {
  const m = modulKini_();
  if (m && m.timpa.indexOf(req.action) >= 0) return m.aksi[req.action](req, u, P, now);
  return undefined;
}
function modulAksiAkhir_(req, u, P, now) {
  const m = modulKini_();
  if (m && typeof m.aksi[req.action] === 'function') return m.aksi[req.action](req, u, P, now);
  if (!m && (MODUL_GALAT_.aktif || MODUL_GALAT_.kandidat)) return { ok: false, error: 'Aksi "' + req.action + '" berasal dari modul server yang sedang tidak aktif: ' + (MODUL_GALAT_[MODUL_UJI_ ? 'kandidat' : 'aktif'] || 'modul belum diterbitkan') };
  return undefined;
}
function modulUji_(req, u) {   // mode uji kandidat: hanya penerbit, hanya aksi baca
  if (!req.modulUji) return;
  if (!bolehTerbitModul_(u)) throw new Error('Mode uji modul server khusus Admin penerbit modul (' + penerbitModul_() + ').');
  if (!modulProps_().getProperty('MODUL_KANDIDAT')) throw new Error('Tidak ada kandidat modul server untuk diuji. Keluar dari mode uji.');
  MODUL_UJI_ = true;
  if (!aksiBaca_(req.action, true) && MODUL_AKSI_INTI.indexOf(req.action) < 0) throw new Error('UJI MODUL SERVER (baca saja): perubahan data produksi dinonaktifkan. Uji penulisan dilakukan di server staging.');
}

/* ---------- metadata & riwayat ---------- */
function modulMeta_(id) {
  if (!id) return null;
  try { const t = modulProps_().getProperty('META_MODUL_' + id); if (t) return JSON.parse(t); } catch (e) { }
  try { const p = modulBacaFile_(id); return modulSimpanMeta_(id, p, null); } catch (e) { return { id: id, versi: '?', galat: e.message }; }
}
function modulSimpanMeta_(id, p, m) {
  const meta = { id: id, versi: s_(p.versi), tanggal: s_(p.tanggal), catatan: s_(p.catatan).slice(0, 600), untukKernel: s_(p.untukKernel), sidik: modulSidik_(p.kode), ukuran: s_(p.kode).length,
    fitur: m ? m.fitur : [], aksi: m ? Object.keys(m.aksi) : [], baca: m ? m.baca : [], timpa: m ? m.timpa : [], kait: m ? Object.keys(m.kait) : [],
    diunggahOleh: s_(p.diunggahOleh), diunggahPada: s_(p.diunggahPada) };
  try { modulProps_().setProperty('META_MODUL_' + id, JSON.stringify(meta)); } catch (e) { }
  return meta;
}
function modulInfo_(P, u) {
  const g = k => modulProps_().getProperty(k) || '';
  modulMuat_('aktif'); if (g('MODUL_KANDIDAT')) modulMuat_('kandidat');
  let riwayat = []; try { riwayat = bacaLog_(P, 'MODUL').slice(0, 15).map(l => ({ waktu: l.waktu, versi: l.noKontrak, oleh: l.oleh, aksi: l.aksi, detail: s_(l.detail).slice(0, 240) })); } catch (e) { }
  return { ok: true, kernel: KERNEL_VERSI, versiServer: VERSI_SERVER, penerbit: penerbitModul_(), bolehTerbit: bolehTerbitModul_(u), nonaktif: g('MODUL_NONAKTIF') === '1',
    aktif: modulMeta_(g('MODUL_AKTIF')), kandidat: modulMeta_(g('MODUL_KANDIDAT')), sebelumnya: modulMeta_(g('MODUL_SEBELUM')),
    galat: { aktif: MODUL_GALAT_.aktif || '', kandidat: MODUL_GALAT_.kandidat || '' }, riwayat: riwayat };
}
function modulRingkas_() {
  const id = modulProps_().getProperty('MODUL_AKTIF'), m = modulMuat_('aktif');
  return { versi: m ? m.versi : (id ? (modulMeta_(id) || {}).versi || '?' : ''), status: m ? 'aktif' : (MODUL_GALAT_.aktif ? 'galat' : 'kosong'), galat: MODUL_GALAT_.aktif || '' };
}
function modulAksi_(req, u, P, now) {
  const A = req.action, props = modulProps_(), g = k => props.getProperty(k) || '';
  if (A === 'modulInfo') { if (!u.admin) throw new Error('Khusus Admin.'); return modulInfo_(P, u); }
  if (!bolehTerbitModul_(u)) throw new Error('Hanya Admin penerbit modul (' + penerbitModul_() + ') yang dapat ' + ({ modulUnggah: 'mengunggah', modulTolak: 'menolak', modulTerbit: 'menerbitkan', modulRollback: 'mengembalikan' }[A] || 'mengubah') + ' modul server.');
  const catatM = (versi, aksi, det) => catat_(P, { id: 'MODUL', noKontrak: versi }, u, aksi, s_(det).slice(0, 1500));
  const aktifMeta = modulMeta_(g('MODUL_AKTIF'));
  if (A === 'modulUnggah') {
    const p = req.data || {};
    if (p.format !== MODUL_FORMAT) throw new Error('File bukan paket modul server (format harus "' + MODUL_FORMAT + '").');
    if (!/^\d+\.\d+\.\d+$/.test(s_(p.versi))) throw new Error('Nomor versi modul harus seperti 1.0.0.');
    if (s_(p.untukKernel) !== KERNEL_VERSI) throw new Error('Modul ditujukan untuk kernel v' + s_(p.untukKernel) + ', server ini kernel v' + KERNEL_VERSI + '.');
    if (s_(p.kode).length > 900000) throw new Error('Kode modul terlalu besar (maks. ± 900 KB).');
    if (g('MODUL_KANDIDAT')) throw new Error('Masih ada kandidat modul. Tolak / terbitkan kandidat lama terlebih dahulu.');
    if (aktifMeta && modulBanding_(p.versi, aktifMeta.versi) <= 0) throw new Error('Versi kandidat harus lebih baru daripada modul terbit (' + aktifMeta.versi + ').');
    const m = modulKompilasi_(p);
    const r = { format: MODUL_FORMAT, versi: s_(p.versi), untukKernel: s_(p.untukKernel), tanggal: s_(p.tanggal), catatan: s_(p.catatan).slice(0, 2000), kode: p.kode, diunggahOleh: u.nama, diunggahPada: now };
    const f = folderModul_().createFile(Utilities.newBlob(JSON.stringify(r), 'application/json', 'KANDIDAT-modul-' + r.versi + '.json'));
    const meta = modulSimpanMeta_(f.getId(), r, m);
    props.setProperty('MODUL_KANDIDAT', f.getId());
    catatM(r.versi, 'UNGGAH KANDIDAT MODUL', 'SHA-256 ' + meta.sidik + ' · aksi: ' + meta.aksi.join(', ') + ' · ' + r.catatan.slice(0, 300));
    return { ok: true, kandidat: meta };
  }
  const kid = g('MODUL_KANDIDAT');
  if (A === 'modulTolak') {
    if (!kid) throw new Error('Tidak ada kandidat modul.');
    const km = modulMeta_(kid); if (s_(req.versi) !== s_(km.versi)) throw new Error('Kandidat berubah. Muat ulang.');
    props.deleteProperty('MODUL_KANDIDAT');
    catatM(km.versi, 'TOLAK KANDIDAT MODUL', s_(req.alasan) || 'Tidak disetujui');
    return { ok: true };
  }
  if (A === 'modulTerbit') {
    if (!kid) throw new Error('Tidak ada kandidat modul.');
    const km = modulMeta_(kid); if (s_(req.versi) !== s_(km.versi)) throw new Error('Kandidat berubah. Periksa ulang.');
    if (s_(req.konfirmasi) !== 'LULUS UJI') throw new Error('Konfirmasi hasil uji wajib diisi: LULUS UJI.');
    if (s_(req.catatanUji).trim().length < 12) throw new Error('Catatan hasil uji minimal 12 karakter.');
    modulKompilasi_(modulBacaFile_(kid));   // pastikan masih dapat dimuat
    if (g('MODUL_AKTIF')) props.setProperty('MODUL_SEBELUM', g('MODUL_AKTIF'));
    props.setProperty('MODUL_AKTIF', kid); props.deleteProperty('MODUL_KANDIDAT');
    modulReset_();
    catatM(km.versi, 'TERBITKAN MODUL', 'Dari ' + (aktifMeta ? aktifMeta.versi : 'tanpa modul') + ' · SHA-256 ' + km.sidik + ' · ' + s_(req.catatanUji).slice(0, 300));
    return { ok: true, aktif: km };
  }
  if (A === 'modulRollback') {
    if (s_(req.konfirmasi) !== 'KEMBALIKAN') throw new Error('Konfirmasi rollback salah (ketik KEMBALIKAN).');
    if (s_(req.versiSekarang) !== s_(aktifMeta ? aktifMeta.versi : '')) throw new Error('Versi modul aktif berubah. Muat ulang.');
    const sid = g('MODUL_SEBELUM');
    if (req.kosongkan || !sid) {   // tanpa versi sebelumnya → matikan seluruh modul (inti tetap berjalan)
      if (!g('MODUL_AKTIF')) throw new Error('Tidak ada modul aktif.');
      props.setProperty('MODUL_SEBELUM', g('MODUL_AKTIF')); props.deleteProperty('MODUL_AKTIF'); modulReset_();
      catatM(aktifMeta.versi, 'NONAKTIFKAN MODUL', 'Server kembali ke fungsi inti kernel saja.');
      return { ok: true, aktif: null };
    }
    const sm = modulMeta_(sid);
    if (g('MODUL_AKTIF')) props.setProperty('MODUL_SEBELUM', g('MODUL_AKTIF')); else props.deleteProperty('MODUL_SEBELUM');
    props.setProperty('MODUL_AKTIF', sid); modulReset_();
    catatM(sm.versi, 'ROLLBACK MODUL', 'Dari ' + (aktifMeta ? aktifMeta.versi : '-') + ' ke ' + sm.versi + '; data tidak diubah.');
    return { ok: true, aktif: sm };
  }
  throw new Error('Aksi modul tidak dikenal.');
}

/* ---------- fungsi editor darurat (jalankan dari Apps Script, tanpa deployment ulang) ---------- */
function statusModul() {
  const g = k => modulProps_().getProperty(k) || '';
  const info = id => { if (!id) return '-'; const m = modulMeta_(id); return m.versi + ' · SHA ' + s_(m.sidik).slice(0, 16) + ' · ' + (m.aksi || []).length + ' aksi'; };
  Logger.log('Kernel         : v' + KERNEL_VERSI + ' (Code.gs ' + VERSI_SERVER + ')');
  Logger.log('Penerbit modul : ' + penerbitModul_());
  Logger.log('Modul aktif    : ' + info(g('MODUL_AKTIF')));
  Logger.log('Kandidat       : ' + info(g('MODUL_KANDIDAT')));
  Logger.log('Sebelumnya     : ' + info(g('MODUL_SEBELUM')));
  Logger.log('Nonaktif darurat: ' + (g('MODUL_NONAKTIF') === '1' ? 'YA' : 'tidak'));
}
function nonaktifkanModul() { modulProps_().setProperty('MODUL_NONAKTIF', '1'); Logger.log('Seluruh modul server DINONAKTIFKAN. Fungsi inti tetap berjalan. Aktifkan lagi: aktifkanModul().'); }
function aktifkanModul() { modulProps_().deleteProperty('MODUL_NONAKTIF'); Logger.log('Modul server diaktifkan kembali.'); }


/* =====================================================================
 * v2.5.1 — JEMBATAN LAYANAN LUAR untuk modul server (email, URL luar, pemicu terjadwal)
 * Modul server dimuat dinamis sehingga Google tidak dapat mendeteksi izinnya; karena itu
 * pemanggilan layanan Google yang memerlukan izin baru dilakukan DI SINI (kernel) saja.
 * ===================================================================== */
const PEMICU_NOTIF = 'jadwalNotifikasi';
function luarAmbil_(url, opsi) {   // UrlFetchApp dengan muteHttpExceptions; kembalikan {kode, teks}
  const o = Object.assign({ muteHttpExceptions: true, followRedirects: true, validateHttpsCertificates: true }, opsi || {});
  const r = UrlFetchApp.fetch(s_(url), o);
  return { kode: r.getResponseCode(), teks: r.getContentText('UTF-8') };
}
function luarEmail_(o) {   // o: {to, subject, htmlBody, body, name, replyTo, cc, bcc}
  if (!o || !s_(o.to).trim()) throw new Error('Penerima email kosong.');
  MailApp.sendEmail({ to: s_(o.to), subject: s_(o.subject).slice(0, 240), htmlBody: s_(o.htmlBody), body: s_(o.body || 'Buka email ini dengan tampilan HTML.'), name: s_(o.name || 'Monitoring Pengadaan').slice(0, 80),
    replyTo: o.replyTo ? s_(o.replyTo) : undefined, cc: o.cc ? s_(o.cc) : undefined, bcc: o.bcc ? s_(o.bcc) : undefined, noReply: false });
  return true;
}
function luarKuotaEmail_() { try { return MailApp.getRemainingDailyQuota(); } catch (e) { return -1; } }
function luarPemicu_(aksi, jam) {   // aksi: 'baca' | 'pasang' (jam = [7,16]) | 'hapus'
  const L = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === PEMICU_NOTIF);
  if (aksi === 'hapus' || aksi === 'pasang') L.forEach(t => ScriptApp.deleteTrigger(t));
  if (aksi === 'pasang') {
    const J = [...new Set((jam || []).map(Number).filter(h => h >= 0 && h <= 23))].sort((a, b) => a - b).slice(0, 6);
    J.forEach(h => ScriptApp.newTrigger(PEMICU_NOTIF).timeBased().everyDays(1).atHour(h).nearMinute(0).inTimezone(TZ).create());
    return { jumlah: J.length, jam: J };
  }
  const T = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === PEMICU_NOTIF);
  return { jumlah: T.length, id: T.map(t => t.getUniqueId()) };
}
/* Dipanggil pemicu waktu (bukan dari aplikasi). Meneruskan ke kait modul "terjadwal". */
function jadwalNotifikasi(e) {
  modulReset_();
  const lock = LockService.getScriptLock();
  try { lock.waitLock(60000); } catch (err) { Logger.log('jadwalNotifikasi: server sibuk, dilewati.'); return; }
  try {
    const m = modulMuat_('aktif');
    if (!m || typeof m.kait.terjadwal !== 'function') { Logger.log('jadwalNotifikasi: modul aktif tidak memiliki kait terjadwal.'); return; }
    const h = m.kait.terjadwal({ e: e || null, waktu: new Date().toISOString() });
    Logger.log('jadwalNotifikasi: ' + JSON.stringify(h || {}).slice(0, 1500));
    SpreadsheetApp.flush();
  } catch (err) { Logger.log('jadwalNotifikasi GALAT: ' + (err && err.message || err)); }
  finally { try { lock.releaseLock(); } catch (e2) { } }
}
/* Jalankan SEKALI dari editor setelah menempel kode 2.5.1 → memunculkan layar izin Google. */
function izinkanLayananLuar() {
  Logger.log('Sisa kuota email hari ini: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Pemicu notifikasi terpasang: ' + ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === PEMICU_NOTIF).length);
  try { Logger.log('Uji koneksi luar: HTTP ' + UrlFetchApp.fetch('https://api.telegram.org', { muteHttpExceptions: true }).getResponseCode()); } catch (e) { Logger.log('Uji koneksi luar gagal: ' + e.message); }
  Logger.log('Izin layanan luar aktif ✔  Langkah berikut: Terapkan › Kelola deployment › ikon pensil › Versi baru › Terapkan.');
}
