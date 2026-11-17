# Panduan Pemasangan Mode Server (Login Staf + Data Bersama + Offline)

Hasil akhirnya:
- Hanya email yang terdaftar di sheet **Pengguna** yang bisa masuk. Login memakai kode 6 digit yang dikirim ke email.
- Semua staf melihat **satu data proyek yang sama**, tersimpan di Google Sheet milik Anda.
- **Harga hanya untuk MANAJEMEN.** Server tidak pernah mengirim harga ke PELAKSANA atau PENGAWAS.
- **Bisa input saat offline.** Perubahan disimpan dulu di HP/laptop dan terkirim otomatis saat sinyal kembali.

| Peran | Lihat harga | Input progres & isu | Ubah status SBD & pengadaan | Data proyek, impor, hapus isu |
|---|---|---|---|---|
| MANAJEMEN | ✅ | ✅ | ✅ | ✅ |
| PELAKSANA | ❌ | ✅ | ✅ | ❌ |
| PENGAWAS  | ❌ | ✅ | ❌ (hanya lihat) | ❌ |

---

## A. Siapkan server (sekali saja, ±15 menit)

1. Login ke Google dengan akun **pemilik** (akun Anda), lalu buat **Google Sheet baru**, misalnya bernama `DB Monitoring JIAT`.
2. Di Sheet: **Ekstensi → Apps Script**.
3. Hapus semua isi file `Code.gs`, lalu salin-tempel seluruh isi file **`Kode.gs`** dari folder ini. Klik 💾 Simpan.
4. (Disarankan) **Setelan proyek (⚙) → centang "Tampilkan file manifes appsscript.json"**. Buka `appsscript.json` dan ganti isinya dengan file **`appsscript.json`** dari folder ini.
5. Di toolbar editor, pilih fungsi **`siapkan`** lalu klik **▶ Jalankan**.
   - Akan muncul permintaan izin: **Tinjau izin → pilih akun Anda → Lanjutan → Buka … (tidak aman) → Izinkan**.
     Peringatan ini wajar untuk script buatan sendiri.
   - Hasilnya: sheet `Pengguna`, `Proyek`, `Divisi`, `Item`, `Progres`, `Isu`, `Pengadaan`, `SBD`, dan `Log` terbentuk. Email Anda otomatis terdaftar sebagai MANAJEMEN.
6. Isi sheet **Pengguna** dengan 10 staf Anda, satu baris per orang:

   | Email | Nama | Peran | Aktif |
   |---|---|---|---|
   | budi@gmail.com | Budi – SM | MANAJEMEN | YA |
   | andi@gmail.com | Andi – Pelaksana TIM 1 | PELAKSANA | YA |
   | sari@gmail.com | Sari – Pengawas | PENGAWAS | YA |

   Langkah ini **opsional**: staf bisa mendaftar sendiri lewat aplikasi (lihat bagian C).

7. **Terapkan → Deployment baru → ⚙ pilih "Aplikasi web"**:
   - Jalankan sebagai: **Saya (email Anda)**
   - Yang memiliki akses: **Siapa saja**
   - Klik **Terapkan**, lalu **salin URL Aplikasi web** (berakhiran `/exec`).

   > Pilihan "Siapa saja" aman. Tanpa kode login dari email terdaftar, server menolak semua permintaan data. Pilihan ini diperlukan agar aplikasi di Netlify bisa menghubungi server.

8. ⚠️ **Jangan bagikan Google Sheet ini ke staf PELAKSANA/PENGAWAS.** Sheet berisi harga. Staf cukup memakai aplikasinya.

## B. Hubungkan aplikasi

1. Buka file **`monitoring-progres/config.js`**, lalu isi:
   ```js
   window.JIAT_CONFIG = {
     API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   };
   ```
2. Deploy folder `monitoring-progres` ke Netlify: seret folder ke https://app.netlify.com/drop, atau pakai situs yang sudah ada.
3. Buka situsnya, masukkan email Anda, ketik kode dari email, lalu masuk sebagai MANAJEMEN.
4. Klik **⬆ Impor JSON**, pilih file `jiat-monitoring-….json`, lalu klik **Ganti seluruh data**. Data terunggah ke server dan langsung terlihat oleh semua staf.

## C. Pendaftaran akun staf (mandiri + persetujuan admin)

Staf tidak perlu Anda ketik satu per satu di Sheet. Mereka bisa mendaftar sendiri:

1. Di aplikasi, buka menu **👥 Pengguna** (hanya terlihat oleh MANAJEMEN), lalu klik **📋 Salin link**. Linknya berbentuk `https://…netlify.app/#daftar`.
2. Kirim link itu ke grup WhatsApp tim.
3. Staf membuka link dan mengisi **email, nama, jabatan/tim, dan peran yang diminta**. Mereka lalu mengetik **kode verifikasi** dari email, supaya terbukti email itu benar miliknya.
4. Anda (semua MANAJEMEN) menerima **email notifikasi**, dan menu **👥 Pengguna** menampilkan badge merah berisi jumlah permintaan.
5. Di menu Pengguna, untuk setiap permintaan:
   - pilih peran di **"Setujui sebagai"** (bisa berbeda dari yang diminta), lalu klik **✓ Setujui**. Staf menerima email "Akun disetujui" berisi link aplikasi, lalu bisa langsung masuk.
   - atau klik **✕ Tolak** dan isi alasan (opsional). Staf menerima email penolakan.
6. Dari menu yang sama Anda juga bisa **mengubah peran**, **menonaktifkan** staf (ia langsung keluar dari semua perangkat), dan **mengaktifkan kembali** akun.

Catatan:
- Selama belum disetujui, staf tidak bisa masuk. Aplikasi menampilkan "masih menunggu persetujuan admin".
- Pengaman: Anda tidak bisa menonaktifkan atau menurunkan peran akun Anda sendiri, dan minimal harus ada satu MANAJEMEN aktif.
- Semua keputusan tercatat di sheet `Pengguna` (kolom *Diputuskan oleh* dan *Tanggal keputusan*) dan di sheet `Log`.
- Cara manual tetap bisa dipakai: menambah baris langsung di sheet `Pengguna` dengan Aktif = `YA`.

## D. Untuk staf (bagikan ke tim)

1. Buka link aplikasi, masukkan email, lalu ketik kode 6 digit yang masuk ke email (cek juga folder Spam).
2. **Di HP: menu browser → "Tambahkan ke Layar Utama".** Aplikasi bisa dibuka seperti aplikasi biasa, termasuk saat offline.
3. Login berlaku **30 hari** per perangkat.
4. **Saat offline**: tetap input seperti biasa. Indikator di kanan atas menunjukkan, misalnya, `Offline · 3 antre`. Saat sinyal kembali, data terkirim otomatis dan indikator berubah menjadi `Tersinkron hh:mm`. Klik indikator untuk sinkron manual.
5. ⚠️ Selama masih ada antrean, **jangan** hapus data browser dan **jangan** klik Keluar.
6. Login pertama kali di perangkat baru harus dalam keadaan online.

## E. Operasional harian

| Kebutuhan | Caranya |
|---|---|
| Tambah staf | Kirim link pendaftaran (menu 👥 Pengguna → Salin link), lalu setujui; atau tambah baris di sheet `Pengguna` |
| Cabut akses (staf keluar / pindah) | Menu 👥 Pengguna → **Nonaktifkan**, atau ubah kolom Aktif menjadi `TIDAK`. Staf itu otomatis keluar saat sinkron berikutnya (paling lama ±1 menit bila sedang online), dan data proyek dihapus dari perangkatnya. |
| Ganti peran | Ubah kolom Peran; berlaku saat sinkron berikutnya |
| HP staf hilang | Di Sheet: menu **JIAT Monitoring → Paksa semua perangkat keluar** (semua staf perlu login ulang) |
| Siapa input apa | Sheet `Log` (login, sinkron) dan kolom `oleh`/`diubah` di setiap sheet data |
| Cadangan | Riwayat versi Google Sheet, plus **Ekspor JSON → Data lengkap** dari aplikasi secara berkala |
| Perbarui kode server | Tempel `Kode.gs` versi baru → **Terapkan → Kelola deployment → ✏️ → Versi: Versi baru → Terapkan**. URL tidak berubah. |

## F. Catatan teknis
- **Bentrok input**: data progres disimpan per *item + tanggal + SBD*. Jika dua orang mengisi kombinasi yang sama, **isian terakhir yang terkirim yang berlaku**. Sebaiknya setiap pengawas mengisi untuk SBD masing-masing.
- **Kuota Google** (akun gratis): ±100 email kode per hari. Untuk 10 staf dengan sesi 30 hari, ini jauh dari batas.
- **Batasan keamanan login**: maksimal 5 permintaan kode per email per jam, 5 kali salah ketik per kode, dan kode berlaku 10 menit.
- Tanpa `API_URL`, aplikasi kembali ke **mode lokal**: tanpa login, data hanya di browser itu, persis seperti versi sebelumnya.

## G. Pembaruan lewat file JSON (mulai versi 1.2.0)

Sejak 1.2.0, semua pembaruan, baik aplikasi maupun server, dikirim sebagai **satu file** `jiat-pembaruan-x.y.z.json`. Anda tidak perlu lagi menempel kode di Apps Script atau deploy ulang Netlify.

### G1. Pemasangan pertama 1.2.0 (sekali saja, manual)
1. **Server**: buka Apps Script, ganti seluruh isi file kode dengan `Kode.gs` versi 1.2.0, lalu 💾 Simpan. Kemudian **Terapkan → Kelola deployment → ✏️ → Versi: "Versi baru" → Terapkan**. URL `/exec` tetap sama.
   ⚠️ Jangan memilih "Deployment baru", karena itu membuat URL baru.
2. **Aplikasi**: deploy ulang folder `monitoring-progres` ke Netlify (tab Deploys → seret folder). Folder ini sekarang berisi `pemuat.js`, yaitu bagian tetap yang menjalankan versi terbaru.

### G2. Setiap pembaruan berikutnya (± 1 menit)
1. Terima file `jiat-pembaruan-x.y.z.json`.
2. Buka aplikasi sebagai **MANAJEMEN**, lalu **⚙ (Pengaturan) → 🔄 Pembaruan sistem → 📦 Unggah file pembaruan (.json)**.
3. Periksa ringkasannya (versi baru, versi sekarang, catatan perubahan), lalu klik **Pasang pembaruan**, lalu **Muat ulang sekarang**.
4. Selesai. Perangkat staf otomatis mengunduh versi baru saat online, lalu muncul tombol **"Muat ulang sekarang"** di bawah layar (paling lambat 30 menit, atau saat aplikasi dibuka ulang).

### Pengaman
| Risiko | Penanganan |
|---|---|
| File rusak / terpotong saat dikirim | Setiap bagian diperiksa SHA-256. Bila tidak cocok, pembaruan ditolak. |
| Kode bersintaks salah | Diperiksa sebelum disimpan. Bila salah, ditolak. |
| Satu bagian lolos, bagian lain gagal | Pemasangan **atomik**: semua bagian diperiksa dulu, baru ditulis. |
| Memasang versi lama tanpa sengaja | Ditolak, kecuali Anda mencentang **"izinkan versi sama/lebih lama"** (untuk pasang ulang / rollback). |
| Versi baru error saat dijalankan di perangkat | Setelah 2× gagal, perangkat otomatis kembali ke versi bawaan dan menampilkan pemberitahuan. |
| Server bermasalah setelah pembaruan | Di Google Sheet: menu **JIAT Monitoring → Darurat: kembali ke versi bawaan**. Semua pembaruan JSON dihapus; server & aplikasi kembali ke kode yang ditempel. |
| Aplikasi tidak mau terbuka | Buka link dengan tambahan `?bawaan` (contoh `https://…netlify.app/?bawaan`) untuk memaksa versi bawaan. |

Yang boleh memasang pembaruan hanya **MANAJEMEN**. Riwayat pemasangan tercatat di sheet `Log` (aksi `PEMBARUAN`). Paket tersimpan di sheet tersembunyi `_Sistem`; jangan diubah manual.

### Untuk pengembang: membuat file pembaruan
```bash
cd monitoring-progres
node alat/rakit-pembaruan.js 1.2.1 "Catatan perubahan…"      # → rilis/jiat-pembaruan-1.2.1.json
```
Perintah ini membangun ulang `styles.css`, menyamakan `VERSI` di `Kode.gs`, memeriksa sintaks, dan menghitung SHA-256. Tambahkan `--bawaan` hanya bila folder juga di-deploy ulang ke Netlify.

## H. Fitur versi 1.3.0
| Fitur | Cara pakai | Hak akses |
|---|---|---|
| **Isi Manual item** | Progres Harian → **＋ Isi Manual** untuk pekerjaan tambah/kurang (CCO) atau item baru; **✎** di kolom Aksi untuk mengoreksi data kontrak awal. Setiap koreksi tercatat (siapa, kapan, apa yang berubah). Item tanpa progres bisa dihapus. | MANAJEMEN (menyangkut harga) |
| **Risalah Rapat PROD-30** | Daftar Isu (atau Dashboard → Agenda Rapat) → **📄 Risalah Rapat (PROD-30)**. Isi tanggal, kota, pimpinan rapat, dan notulis. Hasilnya file Form PW-PROD-30 resmi yang sudah terisi: setiap isu menjadi baris *Rencana yang lalu – Realisasi – Rencana yang akan datang – Target*, dan ringkasan progres per divisi bisa disertakan. | Semua |
| **Pengadaan: Isi Manual & Terpasang otomatis** | Pengadaan → **＋ Isi Manual** / **✎**. Hubungkan material ke item pekerjaan dan isi faktor konversi (mis. 0,05 mata bor per m). Kolom Terpasang = progres kumulatif × faktor, ikut berubah begitu progres diinput. Material tanpa tautan diisi manual. | MANAJEMEN, PELAKSANA |
| **Sinkron hampir real-time** | Otomatis: setiap ±15 detik aplikasi mengecek apakah ada perubahan di server. Bila ada, hanya data yang berubah yang ditarik, lalu muncul notifikasi "↻ n pembaruan dari …". Input yang belum terkirim tidak pernah tertimpa. | Semua |
| **⟳ Refresh Pembaruan** | Tombol di header. Menampilkan pratinjau pembaruan dari server dan perubahan Anda yang belum terkirim. Bila data yang sama diubah dua pihak, Anda memilih: *milik saya* atau *versi server*. | Semua |
| **📁 Master** | MANAJEMEN mengunggah file Master (.xlsx) **sekali**. Semua staf melihat BOQ (bisa per SBD), Rencana Waktu (koordinat & Google Maps), dan Kurva S (rencana Master vs realisasi aplikasi). Unduhan memakai file asli: *File Master lengkap* (byte-identik), *BOQ* / *Kurva S* (lembar itu saja, format identik), *Rencana Waktu*. | Lihat: semua (harga hanya MANAJEMEN). Unduh BOQ / Kurva S / lengkap: MANAJEMEN. Unduh Rencana Waktu: semua |

| **Tambah pengguna manual** (1.3.1) | 👥 Pengguna → **＋ Tambah pengguna** (satu orang) atau **＋ Tambah banyak sekaligus**. Untuk banyak sekaligus, tempel baris `email, nama, peran, jabatan`, bisa langsung disalin dari Excel. Akun **langsung aktif** tanpa pendaftaran, dan email pemberitahuan berisi link aplikasi bisa dikirim. **✎** untuk mengubah nama, jabatan, atau peran. | MANAJEMEN |

### Pemasangan 1.3.1 (tanpa Netlify)
Netlify yang sudah memakai pemuat (versi 1.2.0 ke atas) **tidak perlu di-deploy ulang**.
1. Masuk sebagai MANAJEMEN, lalu ⚙ → **🔄 Pembaruan sistem → 📦 Unggah file pembaruan** → pilih `jiat-pembaruan-1.3.1.json` → **Pasang** → **Muat ulang**.
2. Aplikasi dan server naik ke 1.3.1. Perangkat staf mengikuti otomatis saat online.
3. Menu 📁 Master → **📤 Unggah file Master (.xlsx)**.

### Kapan Netlify perlu di-deploy lagi?
Hampir tidak pernah. Folder Netlify hanya berisi bagian tetap (`index.html`, `pemuat.js`, pustaka Excel, `config.js`). Semua tampilan, fitur, dan logika server dikirim lewat file `.json`. Deploy ulang Netlify hanya diperlukan bila **URL server Apps Script berubah** (`config.js`) atau bagian pemuatnya sendiri diganti; Claude akan menyebutkannya secara eksplisit bila itu terjadi.
