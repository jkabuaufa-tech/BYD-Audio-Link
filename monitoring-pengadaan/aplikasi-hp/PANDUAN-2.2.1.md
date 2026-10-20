# Aplikasi HP / Web Monitoring SAP 2.2.1 — satu link, selalu terbaru

## Kenapa di HP hanya tampil dashboard kosong (2.2)
`config.json` di paket masih berisi teks contoh, dan bila aplikasi dibuka sebagai **file lokal** (umumnya APK pembungkus) `config.json`
bahkan tidak dibaca. Akibatnya aplikasi diam-diam masuk **"Mode lokal · data tersimpan di perangkat ini"**: login berhasil
(daftar pengguna bawaan), tetapi tidak tersambung ke server → dashboard kosong dan pembaruan Admin tidak pernah sampai.

## Perbaikan 2.2.1 (`hp-awal.js`, dimuat sebelum aplikasi; data tidak diubah)
1. Bila alamat server belum ada → kartu **"Hubungkan ke server"** tampil sebelum login. Tempel alamat `/exec` sekali,
   diuji (ping), disimpan permanen di perangkat. Sesi mode lokal lama dilepas → masuk ulang ke server. Data lokal tidak dihapus.
2. **Link sekali-atur**: `https://ALAMAT-APLIKASI/?server=https://script.google.com/macros/s/…/exec` — dibuka sekali, alamat server
   tersimpan, parameter hilang dari alamat. Cocok untuk dibagikan ke staf bila `config.json` belum diisi.
3. `sw.js` cache v2 → HP yang sudah memasang versi 2.2 otomatis mengambil file baru.

## Satu link yang selalu terbaru
- Isi `config.json`: `{ "server": "https://script.google.com/macros/s/…/exec" }`, lalu unggah seluruh isi folder ke hosting statis.
- **Pembaruan dari Admin** (Pengguna & Proyek › Pembaruan, mis. 2.6.2) diambil otomatis dari server oleh setiap perangkat
  (saat dibuka & tiap 15 menit) → **link tidak berubah, staf tidak perlu memasang ulang.**
- Bila suatu saat `index.html` dasar diganti, cukup timpa file di hosting yang sama → HP menampilkan "Versi baru tersedia — Muat ulang".

### Pilihan hosting (pilih salah satu)
| | Cloudflare Pages + Access (disarankan) | GitHub Pages |
|---|---|---|
| Biaya | gratis s.d. 50 pengguna | gratis |
| Siapa bisa membuka | hanya email yang diizinkan (OTP email) | **siapa saja** yang tahu alamatnya |
| Data Master di `index.html` (kontrak, vendor, nilai) | terlindungi | **terbaca lewat view source** |

Langkah Cloudflare & GitHub Pages: lihat `PANDUAN.md` bagian 3.

## APK
APK yang membungkus file lokal tidak ikut diperbarui. Ganti dengan aplikasi dari link: buka link di **Chrome Android ›
⋮ › Instal aplikasi** (ikon Monitoring SAP di layar utama, layar penuh, selalu terbaru). Bila tetap memakai APK,
APK harus membuka **link** tersebut (WebView ke URL), bukan file di dalam APK.
