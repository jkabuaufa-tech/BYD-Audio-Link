# Panduan Siap Upload — Laporan Harian Monitoring ke Telegram

**Satu file, upload, isi satu kotak, selesai.** Tidak perlu membuat kredensial dan tidak perlu mengerti AI atau pemrograman.

File yang dipakai: **`ALUR-SIAP-UPLOAD.json`**

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   ┌───────────────┐   ┌──────────┐
 │ 1. Siapkan   │ → │ 2. Upload    │ → │ 3. Isi 1 kotak   │ → │ 4. Uji coba   │ → │ 5. Aktif │
 │ 6 data       │   │ file ke n8n  │   │ "Konfigurasi"    │   │ (cek Telegram)│   │          │
 │ ± 20 menit   │   │ 1 menit      │   │ 3 menit          │   │ 1 menit       │   │ 10 detik │
 └──────────────┘   └──────────────┘   └──────────────────┘   └───────────────┘   └──────────┘
```

Hasilnya: setiap **Senin–Sabtu pukul 07.30 WIB** Telegram Anda menerima ringkasan tagihan yang butuh revisi,
kontrak yang mau habis, dokumen vendor yang kedaluwarsa, dan laporan Kantor AI.
Robot ini **hanya membaca** data. Ia tidak bisa mengubah, menghapus, atau menyetujui apa pun.

---

## TAHAP 1 — Siapkan 6 data (± 20 menit)

Buka **Notepad**, lalu salin tabel kosong ini dan isi satu per satu sambil mengikuti petunjuk di bawahnya:

```
1. ID Proyek      :
2. Nama Proyek    :
3. Nama akun bot  :
4. PIN akun bot   :
5. Token Telegram :
6. Chat ID        :
```

### Data 1 — ID Proyek
- **Cara A:** di aplikasi Monitoring, buka Checklist tagihan mana saja → **Preview & Cetak**. Di kop kanan atas tertulis
  **"ID Proyek …"**.
- **Cara B:** buka Google Spreadsheet database aplikasi. Lihat nama tab di bagian bawah, misalnya `P01_Register`.
  Tulisan **sebelum garis bawah** (`P01`) adalah ID Proyek.

Tulis persis, termasuk huruf besar/kecil.

### Data 2 — Nama Proyek
Bebas, untuk judul laporan. Contoh: `Tol Seksi 2`.

### Data 3 & 4 — Akun bot di aplikasi Monitoring
Robot perlu "login" seperti pengguna biasa. Buat akun khusus supaya tidak memakai akun pribadi Anda:
1. Masuk ke aplikasi Monitoring sebagai **Admin** → menu **Pengguna & Proyek** → tambah pengguna.
2. **Nama:** `BOT N8N` → ini **Data 3**.
3. **PIN:** buat 10 angka acak, misalnya `8371920465` → ini **Data 4**.
4. **Peran:** **Admin**. Dengan peran Admin, bagian kontrak dan dokumen vendor ikut terbaca.
5. **Proyek:** centang proyek yang akan dilaporkan → **Simpan**.

### Data 5 — Token Telegram
1. Di Telegram, cari **@BotFather** (yang bercentang biru) → **Start**.
2. Ketik `/newbot` → kirim.
3. Ketik nama bot, misalnya `Laporan Monitoring Proyek` → kirim.
4. Ketik username yang **diakhiri `bot`**, misalnya `monitoring_tolseksi2_bot` → kirim.
5. BotFather membalas dengan token seperti `7123456789:AAH4xYz…` (panjang). **Salin seluruhnya** → ini **Data 5**.

> Pakai bot **baru**, jangan bot yang sudah dipakai fitur Notifikasi di dalam aplikasi Monitoring.

### Data 6 — Chat ID (alamat tujuan pesan)
**Supaya laporan dikirim ke Anda sendiri:**
1. Buka bot Anda (klik tautan `t.me/...` dari pesan BotFather) → tekan **Start** → ketik `halo` → kirim.
   *Langkah ini wajib. Bot tidak bisa mengirim pesan ke orang yang belum pernah menyapanya.*
2. Di browser laptop, ketik alamat ini dengan `TOKEN` diganti **Data 5**:
   `https://api.telegram.org/botTOKEN/getUpdates`
3. Cari tulisan `"chat":{"id":` lalu ambil angka sesudahnya, contoh `123456789` → ini **Data 6**.
4. Kalau yang tampil hanya `{"ok":true,"result":[]}`, kirim `halo` sekali lagi ke bot lalu tekan **F5**.
5. Kalau yang tampil `{"ok":false,"error_code":404,"description":"Not Found"}`, alamatnya salah ketik. Periksa:
   - kata `bot` menempel langsung dengan token, **tanpa spasi**, tanpa `<` `>` atau `:` tambahan
     → benar: `…/bot7123456789:AAH4xYz…/getUpdates`, salah: `…/bot 7123…`, `…/bot<7123…>`, `…/7123…`
   - token tersalin **utuh** (angka, titik dua, lalu ± 35 huruf/angka) dan tidak ada spasi di ujungnya
   - tulisan `TOKEN` sudah benar-benar diganti
   Cek token dengan `https://api.telegram.org/botTOKEN/getMe` — bila benar muncul `"ok":true` dan username bot Anda.

**Cara paling mudah tanpa mengetik alamat (untuk dikirim ke diri sendiri):** di Telegram cari **@userinfobot** →
**Start**. Ia membalas `Id: 123456789` — angka itu adalah Chat ID Anda. Tetap kirim `halo` ke bot laporan Anda sekali.
Bila @userinfobot tidak membalas (bot pihak ketiga kadang mati / banyak tiruan), pakai salah satu:
- **Telegram Web di laptop:** buka `https://web.telegram.org/a/` → klik **Saved Messages / Pesan Tersimpan** →
  lihat alamat di browser, mis. `web.telegram.org/a/#123456789` → angka sesudah `#` adalah Chat ID Anda.
- **Telegram Desktop:** Settings → Advanced → Experimental settings → aktifkan **Show Peer IDs in Profile** →
  buka profil Anda sendiri → ID tampil di profil.
- Bot lain: **@RawDataBot** atau **@getmyid_bot** → Start → cari angka `"id"` di bagian `"from"`.

**Supaya laporan dikirim ke grup (Kapro, Kasi Keuangan, Kasi Pengadaan, dll.):**
1. Tambahkan bot ke grup Telegram → kirim pesan `/start` di grup.
2. Buka alamat `getUpdates` yang sama. Chat ID grup **diawali tanda minus**, contoh `-1001234567890`.
   Salin lengkap bersama tanda minusnya.

✅ **Notepad Anda sekarang berisi 6 data.** Lanjut ke Tahap 2.

---

## TAHAP 2 — Upload file ke n8n (1 menit)

> Belum punya n8n? Buka **https://n8n.io** → **Get started** → daftar dengan email → verifikasi. Masa uji coba gratis.

1. Simpan file **`ALUR-SIAP-UPLOAD.json`** (dari percakapan ini) ke folder *Downloads*.
2. Di n8n klik **Create Workflow** (atau tombol **+** di kiri atas → *Workflow*).
3. Klik **⋯** (tiga titik) di kanan atas → **Import from File…** → pilih `ALUR-SIAP-UPLOAD.json`.
4. Kotak-kotak bersambung muncul di layar. **Tidak perlu memahami semuanya.** Yang perlu Anda sentuh hanya satu kotak:
   **Konfigurasi**.

---

## TAHAP 3 — Isi kotak "Konfigurasi" (3 menit)

1. **Klik dua kali** kotak **Konfigurasi**.
2. Ganti nilai setiap baris yang diawali **ISI_** dengan data di Notepad. Caranya: klik kolom nilainya, hapus, tempel.

| Baris | Ganti `ISI_…` dengan | Contoh |
|---|---|---|
| `proyek` | Data 1 | `P01` |
| `namaProyek` | Data 2 | `Tol Seksi 2` |
| `namaBot` | Data 3 | `BOT N8N` |
| `pinBot` | Data 4 | `8371920465` |
| `telegramToken` | Data 5 | `7123456789:AAH4xYz…` |
| `telegramChatId` | Data 6 | `123456789` atau `-1001234567890` |
| `akunAdmin` | biarkan **true** bila akun bot Admin; ubah ke **false** bila bukan | `true` |

3. **Jangan ubah** baris `urlServer` (alamat server Anda sudah terisi), `versiModulMinimal`, dan `maksButirPerGrup`.
   `urlAplikasi` boleh dikosongkan.
4. Tutup jendela → tekan **Ctrl + S** untuk menyimpan.

---

## TAHAP 4 — Uji coba (1 menit)

1. Klik tombol **Execute workflow** (di versi lama: **Test workflow**) di bagian bawah tengah layar.
2. Tunggu 10–60 detik. Kotak-kotak berubah **hijau ✓** satu per satu.
3. **Buka Telegram.** Pesan laporan seharusnya sudah masuk.

Jika ada kotak yang berubah **merah**, klik dua kali kotak itu untuk membaca pesannya, lalu cocokkan dengan tabel
*Kalau ada masalah* di bawah.

---

## TAHAP 5 — Aktifkan (10 detik)

Di kanan atas, geser **Inactive → Active**. Di n8n versi baru, klik **Publish**.

**Selesai.** Mulai besok laporan datang sendiri setiap pukul 07.30 WIB, Senin–Sabtu.

> Ingin jam lain? Klik dua kali kotak **Jadwal 07.30 WIB (Sen–Sab)** lalu ubah `30 7 * * 1-6`.
> Angka pertama adalah menit, angka kedua adalah jam. Contoh: `0 8 * * 1-6` = pukul 08.00.

---

## Kalau ada masalah

| Kotak merah / pesan | Artinya | Yang dilakukan |
|---|---|---|
| **Cek Isian** — *Kotak "Konfigurasi" belum lengkap* | Masih ada `ISI_…` atau format salah. Robot **sengaja berhenti** sebelum menghubungi server | Baca daftar baris yang disebut di pesan → perbaiki di kotak Konfigurasi → uji lagi |
| **Server Tidak Menjawab** | Server aplikasi tidak bisa dihubungi | Coba buka aplikasi Monitoring seperti biasa. Bila aplikasi normal, kirim pesan merah itu ke saya |
| **Gerbang Login** — *[LOGIN DITOLAK]* | Nama/PIN bot salah, atau bot belum punya akses ke proyek | ⚠️ **Jangan menekan uji berulang kali** — 5× salah membuat akun bot terkunci 5 menit. Cocokkan ejaan `namaBot` & `pinBot` dengan akun di aplikasi, cek akses proyeknya, lalu uji lagi |
| **Kirim Telegram** — *chat not found* | Belum menyapa bot, atau Chat ID salah | Kirim `halo` ke bot (atau `/start` di grup), lalu ambil ulang Chat ID |
| **Kirim Telegram** — *Unauthorized* / *Not Found* | Token salah salin | Salin ulang token dari @BotFather, lengkap |
| Pesan masuk dengan **⚠️ Modul server … lebih lama** | Server belum dipasang modul 1.8.6 | Unggah `server-modul-1.8.6.json` lewat Diagnostik sistem › Modul server |
| Pukul 07.35 belum ada pesan | Alur belum aktif, atau gagal | Pastikan sudah **Active/Publish**. Lihat menu **Executions** di kiri → klik baris merah terbaru |

---

## Arti status di pesan

| Status | Arti | Tindakan |
|---|---|---|
| 🟢 **NORMAL** | Tidak ada tagihan bermasalah, kontrak & dokumen aman | Tidak perlu tindakan |
| 🟡 **PERHATIAN** | Ada tagihan butuh revisi atau butir yang perlu dicek | Teruskan ke Staf Pengadaan untuk ditindaklanjuti minggu ini |
| 🔴 **TINGGI** | Ada temuan **Kritis** (mis. rekening berbeda), eskalasi ≥ 3 hari, atau banyak butir merah | Tindak lanjut hari ini; **tahan pembayaran** tagihan bertanda Kritis sampai vendor memperbaiki |

---

## Keamanan (wajib dibaca)

Versi ini menyimpan **PIN bot dan token Telegram di dalam kotak Konfigurasi** supaya Anda tidak perlu membuat kredensial.
Akibatnya, siapa pun yang dapat membuka alur ini di n8n Anda dapat melihat PIN dan token tersebut. Karena itu:

- **Jangan bagikan** akun n8n Anda, dan jangan mengirim file JSON yang **sudah diisi** ke siapa pun (termasuk ke grup WA).
- Akun bot hanya dipakai robot ini. Jika suatu saat curiga bocor, ganti PIN bot di aplikasi lalu ubah juga `pinBot` di kotak Konfigurasi.
- Ganti PIN bot setiap 3 bulan.
- Bila nanti dikelola tim IT, pakai versi `alur-0`/`alur-1` yang menyimpan PIN & token di kredensial terenkripsi
  (lihat `PANDUAN-PEMULA.md` & `README.md`).
