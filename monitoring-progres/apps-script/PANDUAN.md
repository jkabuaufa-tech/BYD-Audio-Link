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

## G. Memperbarui ke versi baru (contoh: v1.1.0 – pendaftaran mandiri)
1. **Server**: buka Apps Script, ganti seluruh isi `Code.gs`/`Kode.gs` dengan `Kode.gs` terbaru, lalu Simpan. Kemudian **Terapkan → Kelola deployment → ✏️ (Edit) → Versi: "Versi baru" → Terapkan**. **URL `/exec` tetap sama**, jadi `config.js` tidak perlu diubah.
   ⚠️ Jangan memilih "Deployment baru", karena itu membuat URL baru.
2. **Aplikasi**: deploy ulang folder `monitoring-progres` ke Netlify (tab Deploys → seret folder).
3. Sheet `Pengguna` otomatis mendapat kolom tambahan (Keterangan, Tanggal daftar, Diputuskan oleh, Tanggal keputusan). Data lama tidak berubah.
