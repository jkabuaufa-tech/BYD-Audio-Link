# Monitoring SAP — satu link web via Cloudflare Pages + Access

Hasil: **https://NAMA-PROYEK.pages.dev** — hanya email yang diizinkan bisa membuka (kode OTP ke email), bisa dipasang di HP/laptop
(PWA), dan **selalu terbaru**: pembaruan yang diterbitkan Admin (menu Pengguna & Proyek › Pembaruan) diambil otomatis setiap
perangkat saat dibuka & tiap 15 menit. Link tidak pernah berubah.

## 0. Sekali saja: isi alamat server
Buka `monitoring-sap-web/config.json` dengan Notepad, ganti teks contoh dengan alamat server Anda:
```json
{ "server": "https://script.google.com/macros/s/AKfy..../exec" }
```
(Bila dilewati, setiap perangkat diminta menempel alamat sekali lewat kartu "Hubungkan ke server".)

## 1. Unggah ke Cloudflare Pages (±5 menit)
1. Daftar/masuk **dash.cloudflare.com** (gratis).
2. **Workers & Pages › Create › Pages › Upload assets** (*Direct Upload*).
3. Nama proyek, mis. `monitoring-sap-jict` → **Create project**.
4. Seret **isi folder `monitoring-sap-web`** (bukan foldernya) → **Deploy site**.
5. Alamat aplikasi: `https://monitoring-sap-jict.pages.dev`.

## 2. Kunci dengan Cloudflare Access (wajib — index.html berisi data Master)
1. **Zero Trust** (menu kiri) › pilih nama tim, paket **Free** (s.d. 50 pengguna).
2. **Settings › Authentication › Login methods**: pastikan **One-time PIN** aktif.
3. **Access › Applications › Add an application › Self-hosted**:
   - Application name: `Monitoring SAP`; Session duration: `1 month` (staf tidak sering diminta OTP).
   - Application domain: `monitoring-sap-jict.pages.dev` **dan** tambahkan `*.monitoring-sap-jict.pages.dev` (versi pratinjau).
4. Policy 1 — **Allow** "Staf proyek" (staf **tidak wajib** punya email kantor — OTP dikirim ke email apa pun, termasuk Gmail):
   - Buat dulu daftar: **Access › Rule groups** (atau *Reusable lists*) › **Add** › nama `Staf Monitoring SAP` ›
     *Include* › **Emails** › isi email setiap staf, mis. `budi.gudang@gmail.com`, `rina.p@yahoo.co.id` (satu per baris).
   - Policy Allow › *Include* (cukup salah satu terpenuhi):
     · **Emails ending in** `@waskita.co.id` (staf yang punya email kantor), **dan/atau**
     · **Rule group** `Staf Monitoring SAP` (staf dengan Gmail/email pribadi).
   - Staf baru: Admin cukup menambah emailnya ke rule group — link & aplikasi tidak berubah. Staf keluar: hapus emailnya → akses tertutup
     pada sesi berikutnya (sesi aktif bisa dicabut di Zero Trust › My Team › Users › Revoke).
   - Jangan gunakan "Everyone" atau "Emails ending in @gmail.com" — itu membuka akses ke semua pemilik Gmail.
5. Policy 2 — **Bypass** "Ikon & manifest" untuk path `manifest.webmanifest`, `icon-*`, `apple-touch-icon.png`
   (tanpa data; diperlukan agar tombol *Instal aplikasi* muncul).
6. Simpan. Uji di jendela samaran: link harus meminta email → kode OTP → aplikasi terbuka.
   Email yang tidak terdaftar tetap bisa mengetik alamatnya, tetapi kode OTP tidak akan pernah dikirim.

### Cara masuk bagi staf (sekali per bulan, sesuai Session duration)
Buka link › ketik email yang didaftarkan Admin (Gmail pun boleh) › buka Gmail › salin 6 angka kode › tempel → aplikasi terbuka,
lalu masuk seperti biasa dengan nama & kata sandi Monitoring SAP. Dua lapis: Access (siapa boleh membuka) + login aplikasi (peran & data).

## 3. Bagikan ke staf
- Kirim link `https://monitoring-sap-jict.pages.dev`.
- **Android:** Chrome › buka link › ⋮ › **Instal aplikasi**. **iPhone:** Safari › Bagikan › **Tambah ke Layar Utama**.
  **Laptop:** Chrome/Edge › ikon pasang di kolom alamat.
- Ganti APK & file HTML lama dengan aplikasi dari link ini (APK/HTML lama tidak ikut terbarui).
  File **Monitoring_SAP.html awal** adalah versi sebelum 2.0 — tidak punya mekanisme pembaruan, jangan dipakai lagi.

## 4. Pembaruan berikutnya
- **Biasa (paling sering):** Admin unggah `pembaruan-x.y.z.json` › pratinjau › terbitkan → semua perangkat menerima otomatis. Cloudflare tidak disentuh.
- **Jarang (ganti index.html dasar):** Cloudflare › proyek › **Create deployment** › unggah folder baru → link tetap; HP menampilkan
  "Versi baru tersedia — Muat ulang".
- Rollback Cloudflare: proyek › Deployments › deployment lama › **Rollback**.
