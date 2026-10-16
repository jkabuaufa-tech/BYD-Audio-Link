# Panduan Pemula: Laporan Harian Otomatis ke Telegram

Panduan ini untuk Anda yang **belum pernah memakai n8n**. Ikuti langkahnya satu per satu, jangan dilompati.
Waktu yang dibutuhkan: **± 45 menit**, cukup satu kali.

---

## Apa hasilnya nanti?

Setiap **Senin–Sabtu pukul 07.30 WIB**, HP Anda menerima pesan Telegram seperti ini:

```
🔴 Laporan Harian Monitoring SAP
Proyek Tol Seksi 2 · P01
Jumat, 16 Oktober 2026 07.30 WIB
Status: TINGGI

💳 Verifikasi Tagihan
• Butuh revisi: 3 (🔴 1 kritis)
• Kedaluwarsa (perlu verifikasi ulang): 1
• Lolos: 5
  – TG-001 PT Beton Jaya · SPK/01
     KRITIS: Rekening Kwitansi ≠ SPKTV

📄 Kontrak berakhir ≤ 30 hari (2)
• 🔴 SPK/09 PT A — H-3
...
```

Artinya: Anda tidak perlu membuka aplikasi tiap pagi untuk tahu tagihan mana yang bermasalah,
kontrak mana yang mau habis, dan apa saja yang ditandai Kantor AI.

**Aman:** robot ini **hanya membaca**. Ia tidak bisa mengubah, menghapus, atau menyetujui apa pun di aplikasi.

---

## Istilah singkat (cukup tahu ini saja)

| Istilah | Artinya |
|---|---|
| **n8n** | Aplikasi "robot" di internet yang menjalankan pekerjaan otomatis sesuai jadwal |
| **Workflow / alur** | Satu rangkaian pekerjaan robot (file `.json` yang akan Anda impor) |
| **Node** | Satu kotak di dalam alur. Tiap kotak mengerjakan satu langkah |
| **Credential / kredensial** | Tempat menyimpan password/kunci dengan aman di n8n |
| **Bot Telegram** | Akun Telegram "robot" yang mengirim pesan ke Anda |

---

## Siapkan dulu (centang semua sebelum mulai)

- [ ] Laptop/komputer dengan browser Chrome
- [ ] Telegram terpasang di HP **dan** dapat dibuka di laptop (web.telegram.org) — memudahkan salin-tempel
- [ ] Anda bisa masuk ke aplikasi Monitoring sebagai **Admin**
- [ ] File **`alur-0-sederhana-telegram.json`** (sudah saya kirim di percakapan; simpan di folder *Downloads*)
- [ ] Buka Notepad untuk mencatat 4 hal: **Nama bot**, **PIN bot**, **ID Proyek**, **Token Telegram**, **Chat ID**

---

## LANGKAH 1 — Buat akun n8n (5 menit)

1. Buka **https://n8n.io** → klik **Get started** / **Start free trial**.
2. Daftar dengan email kantor, buat password, verifikasi email.
3. Isi nama workspace, misalnya `monitoring-proyek`.
4. Setelah masuk, Anda melihat halaman **Overview**. Biarkan terbuka.

> Catatan: n8n Cloud gratis selama masa uji coba, setelah itu berbayar bulanan. Bila kantor punya tim IT,
> n8n juga bisa dipasang di server sendiri — langkah selanjutnya tetap sama.

---

## LANGKAH 2 — Buat akun bot di aplikasi Monitoring (5 menit)

Robot perlu "login" ke aplikasi seperti pengguna biasa. Buat akun khusus supaya tidak memakai akun pribadi Anda.

1. Masuk ke aplikasi Monitoring sebagai Admin.
2. Buka menu **Pengguna & Proyek** → tambah pengguna baru.
3. Isi:
   - **Nama:** `BOT N8N` (tulis persis, termasuk huruf besar dan spasi)
   - **PIN:** buat yang panjang, misalnya 10 angka acak. **Catat di Notepad.**
   - **Peran:** **Admin** (agar bagian kontrak & dokumen vendor ikut terbaca)
   - **Proyek:** centang proyek yang ingin dilaporkan
4. Simpan.

> Tidak mau memberi peran Admin? Boleh pakai peran Pengadaan. Nanti di Langkah 8 isi `akunAdmin` = **false**
> (bagian kontrak & dokumen vendor tidak ikut dilaporkan).

---

## LANGKAH 3 — Cari ID Proyek (2 menit)

Pilih **salah satu** cara:

- **Cara A:** Di aplikasi, buka Checklist tagihan mana saja → **Preview & Cetak**. Di kop kanan atas tertulis
  **"ID Proyek …"**.
- **Cara B:** Buka Google Spreadsheet database aplikasi. Lihat nama tab di bawah, misalnya `P01_Register`,
  `P01_Progres`. Tulisan **sebelum garis bawah** (`P01`) adalah ID Proyek.

**Catat ID Proyek di Notepad** (huruf besar/kecil harus sama persis).

---

## LANGKAH 4 — Buat bot Telegram & ambil 2 kode (10 menit)

### 4a. Buat bot, ambil **Token**
1. Di Telegram, cari **@BotFather** (yang ada centang biru) → klik **Start**.
2. Ketik `/newbot` → kirim.
3. Ditanya nama → ketik misalnya `Laporan Monitoring Proyek` → kirim.
4. Ditanya username → harus diakhiri kata `bot`, misalnya `monitoring_tolseksi2_bot` → kirim.
5. BotFather membalas dengan pesan berisi **token**, bentuknya seperti
   `7123456789:AAH4xYz...` → **salin seluruhnya ke Notepad**. Jangan dibagikan ke orang lain.

> Pakai bot **baru** ini, jangan bot yang sudah dipakai untuk Notifikasi di dalam aplikasi Monitoring.

### 4b. Ambil **Chat ID** (alamat tujuan pesan)

**Untuk dikirim ke diri sendiri:**
1. Klik tautan bot Anda dari pesan BotFather (`t.me/monitoring_tolseksi2_bot`) → klik **Start** → ketik `halo` → kirim.
   *(Langkah ini wajib. Bot tidak boleh mengirim pesan ke orang yang belum pernah menyapanya.)*
2. Di browser laptop, buka alamat ini — ganti `TOKEN` dengan token Anda:
   `https://api.telegram.org/botTOKEN/getUpdates`
   Contoh: `https://api.telegram.org/bot7123456789:AAH4xYz.../getUpdates`
3. Muncul tulisan panjang. Cari bagian `"chat":{"id":` lalu angka sesudahnya, contoh `"chat":{"id":123456789`.
   Angka **123456789** itulah Chat ID → **catat di Notepad**.
4. Kalau yang muncul hanya `{"ok":true,"result":[]}`, kirim `halo` sekali lagi ke bot lalu muat ulang halaman (F5).

**Untuk dikirim ke grup Telegram (Kapro, Kasi, dll.):**
1. Masukkan bot ke grup (Info grup → Tambah anggota → cari username bot).
2. Kirim pesan apa saja di grup, misalnya `/start`.
3. Buka alamat `getUpdates` seperti di atas. Chat ID grup diawali tanda minus, contoh **`-1001234567890`**.
   Salin **lengkap dengan tanda minusnya**.

---

## LANGKAH 5 — Impor alur ke n8n (3 menit)

1. Di n8n, klik **Create Workflow** (atau tombol **+** di kiri atas → *Workflow*).
2. Klik tombol **⋯** (tiga titik) di kanan atas → **Import from File…**
3. Pilih file **`alur-0-sederhana-telegram.json`** dari folder *Downloads*.
4. Di layar muncul kotak-kotak tersambung garis. Itu alurnya. Kotak yang bertanda ⚠️ **merah** artinya belum
   diberi kredensial — akan kita isi di langkah 6 dan 7.

---

## LANGKAH 6 — Isi kredensial Akun Bot (5 menit)

1. **Klik dua kali** kotak **Diagnostik Server**.
2. Di bagian **Credential for Custom Auth**, klik daftar pilihannya → **+ Create new credential**.
3. Di judul atas jendela, ganti namanya menjadi: `Monitoring SAP – Akun Bot`
4. Di kolom **JSON**, hapus isinya lalu tempel teks di bawah ini, **ganti PIN-nya**:
   ```json
   {"body": {"nama": "BOT N8N", "pin": "1234567890"}}
   ```
   - Tanda kutip `"` dan kurung kurawal `{ }` harus ikut, persis seperti contoh.
   - `nama` harus sama persis dengan nama akun di Langkah 2.
5. Klik **Save** → tutup jendela kredensial → tutup jendela kotak (klik di luar / **Back to canvas**).
6. Ulangi untuk 3 kotak lain — **klik dua kali**, lalu di *Credential for Custom Auth* **pilih**
   `Monitoring SAP – Akun Bot` (tidak perlu membuat baru):
   - **Ringkasan Verifikasi Tagihan**
   - **Ringkasan Kantor AI**
   - **Pratinjau Notifikasi**

---

## LANGKAH 7 — Isi kredensial Telegram (2 menit)

1. Klik dua kali kotak **Kirim Telegram**.
2. **Credential to connect with** → **+ Create new credential**.
3. Di kolom **Access Token**, tempel **token** dari Langkah 4a → **Save** → tutup.

---

## LANGKAH 8 — Isi Konfigurasi (3 menit)

1. Klik dua kali kotak **Konfigurasi**.
2. Ganti isian berikut (klik di kolom nilainya, hapus, ketik yang baru):

| Kolom | Isi dengan | Contoh |
|---|---|---|
| `proyek` | ID Proyek dari Langkah 3 | `P01` |
| `namaProyek` | Nama proyek yang mudah dibaca | `Tol Seksi 2` |
| `akunAdmin` | `true` bila akun bot Admin, `false` bila bukan | `true` |
| `telegramChatId` | Chat ID dari Langkah 4b | `123456789` atau `-1001234567890` |
| `urlAplikasi` | (boleh dikosongkan) alamat aplikasi Monitoring | |

3. **Jangan diubah:** `urlServer`, `versiModulMinimal`, `maksButirPerGrup`.
4. Tutup jendela, lalu tekan **Ctrl + S** untuk menyimpan alur.

---

## LANGKAH 9 — Uji coba (2 menit)

1. Klik tombol **Execute workflow** / **Test workflow** di bagian bawah tengah layar.
2. Tunggu 10–60 detik. Kotak-kotak akan berubah **hijau ✓** satu per satu.
3. Cek Telegram — pesan laporan harus masuk.

**Berhasil?** Lanjut ke Langkah 10. **Ada kotak merah?** Lihat tabel *Kalau ada masalah* di bawah.

---

## LANGKAH 10 — Aktifkan jadwal (1 menit)

1. Di kanan atas, geser tombol **Inactive → Active** (pada n8n versi baru tombolnya bernama **Publish**).
2. Selesai. Mulai besok pagi pukul 07.30 WIB laporan datang sendiri.

Ingin jam lain? Klik dua kali kotak **Jadwal 07.30 WIB (Sen–Sab)** dan ubah angka `30 7` (menit 30, jam 7).
Contoh `0 8 * * 1-6` = jam 08.00, Senin–Sabtu.

---

## Kalau ada masalah

| Yang terlihat | Penyebab | Yang harus dilakukan |
|---|---|---|
| Kotak **Server Tidak Menjawab** merah | Alamat server salah, atau aplikasi sedang bermasalah | Coba buka aplikasi Monitoring seperti biasa. Kalau aplikasi normal, hubungi saya dengan menyalin pesan merahnya |
| Kotak **Gerbang Login** merah, tertulis **[LOGIN DITOLAK]** | Nama/PIN di kredensial tidak cocok, atau bot belum punya akses ke proyek | **Jangan klik uji berkali-kali** (5× salah = akun bot terkunci 5 menit). Periksa ejaan nama & PIN di Langkah 6 dan akses proyek di Langkah 2, lalu uji lagi |
| Kotak **Kirim Telegram** merah: *chat not found* | Belum mengirim `halo` ke bot, atau Chat ID salah | Ulangi Langkah 4b |
| Kotak **Kirim Telegram** merah: *Unauthorized* | Token salah salin | Ulangi Langkah 7 dengan token lengkap |
| Pesan masuk tapi ada **⚠️ Peringatan sistem: Modul server 1.8.x lebih lama** | Modul di server belum versi 1.8.6 | Pasang `server-modul-1.8.6.json` lewat Diagnostik sistem › Modul server |
| Pesan ada, tapi bagian kontrak/dokumen vendor tidak muncul | `akunAdmin` = false, atau bot bukan Admin | Normal. Ubah peran bot ke Admin bila ingin bagian itu |
| Jam 07.35 belum ada pesan | Alur belum Active, atau gagal | Pastikan tombol **Active**. Klik menu **Executions** (kiri) → lihat baris terbaru yang merah → klik untuk melihat kotak mana yang gagal |

---

## Arti warna status di pesan

| Status | Arti | Tindakan yang disarankan |
|---|---|---|
| 🟢 **NORMAL** | Tidak ada tagihan bermasalah, kontrak/dokumen aman | Tidak perlu tindakan |
| 🟡 **PERHATIAN** | Ada tagihan butuh revisi minor/mayor atau butir yang perlu dicek | Teruskan ke Staf Pengadaan untuk ditindaklanjuti minggu ini |
| 🔴 **TINGGI** | Ada temuan **Kritis** (mis. rekening berbeda), eskalasi ≥ 3 hari, atau banyak butir merah | Tindak lanjut hari ini; **tahan pembayaran** tagihan yang bertanda Kritis sampai diperbaiki vendor |

---

## Setelah lancar (opsional, tidak wajib)

Bila versi sederhana sudah berjalan beberapa hari tanpa masalah, Anda bisa naik ke versi lengkap
(`alur-1`, `alur-2`, `alur-3` — lihat `README.md`) yang menambahkan email, catatan ke Google Sheets,
dan peringatan otomatis bila robot gagal. Untuk itu sebaiknya minta bantuan tim IT.

**Kebiasaan baik:**
- Ganti PIN akun bot setiap 3 bulan (ubah juga di kredensial Langkah 6).
- Jangan pernah membagikan **token Telegram** dan **PIN bot** lewat chat/email.
- Jika ada staf yang keluar dari grup proyek, keluarkan juga dari grup Telegram laporan.
