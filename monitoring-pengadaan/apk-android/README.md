# APK Android — Monitoring SAP / Monitoring Pengadaan

Pembungkus Android (WebView, satu layar) untuk aplikasi web Monitoring SAP: ikon sendiri di layar utama, **tanpa bilah alamat** (layar penuh ala aplikasi), bilah status navy. APK dibangun otomatis oleh GitHub Actions — tidak perlu Android Studio.

| Yang ditangani pembungkus | Cara |
|---|---|
| Layar penuh / standalone | tema tanpa bilah judul, WebView selebar layar, rotasi tanpa muat ulang |
| Unggah berkas & foto (PDF tagihan, foto penerimaan) | pemilih berkas Android + pilihan **Kamera** untuk isian gambar |
| Unduhan (Unduh Excel / Word / PDF, backup) | disimpan ke `Download/MonitoringSAP/` lalu ditawarkan untuk dibuka |
| Cetak (BA, PO/SPM, Bon, kartu gudang) | layanan cetak Android → printer atau **Simpan sebagai PDF** |
| Tautan ke luar (Drive, WhatsApp, e-mail) | dibuka di aplikasi masing-masing |
| Data & login | tersimpan di HP (localStorage) seperti di Chrome; service worker tetap jalan |

## A. Cara tercepat (tanpa komputer)

1. **Ambil APK** — buka repo ini di GitHub › tab **Actions** › *APK Android (Monitoring SAP)* › run terbaru yang hijau › bagian **Artifacts** › `MonitoringSAP-apk` (zip berisi `MonitoringSAP.apk`).
   Untuk tautan `.apk` langsung (tanpa zip): **Run workflow** › centang **rilis** › hasilnya muncul di halaman **Releases**.
2. **Pasang di HP** — buka berkas `MonitoringSAP.apk` › izinkan *Instal aplikasi tidak dikenal* untuk Chrome / Files (sekali saja) › **Instal**. Bila Play Protect bertanya, pilih *Tetap instal* (aplikasi tidak dari Play Store).
3. **Hubungkan sekali** — saat pertama dibuka muncul layar *Hubungkan Monitoring SAP*:
   - **Tanpa hosting (paling umum):** tempel **alamat server** dari Admin (`https://script.google.com/macros/s/…/exec`) › *Lanjut* › **Pilih berkas aplikasi…** › pilih `Monitoring_SAP.html` (atau `index.html` di folder Drive *Aplikasi_HP_Monitoring_SAP*). Berkas disalin ke dalam aplikasi; alamat server otomatis dipakai (disajikan sebagai `config.json`). Setelah itu langsung tampil layar masuk.
   - **Sudah di-hosting:** tempel alamat web aplikasinya (mis. `https://monitoring-sap.pages.dev/`).

   Tautan Google Sheet / Drive ditolak — itu database, bukan aplikasinya. Alamat `/exec` bila dibuka sendiri hanya menampilkan "Server Monitoring SAP aktif ✔"; karena itu aplikasinya diambil dari berkas HTML.

## B. Pilihan build

| Kebutuhan | Caranya |
|---|---|
| Alamat sudah tertanam (staf tidak perlu mengetik) | Repo › Settings › *Secrets and variables* › Actions › **Variables** › `APK_APP_URL` = alamat web aplikasi. Atau isi `app_url` saat *Run workflow*. |
| APK baru menimpa APK lama tanpa copot-pasang | Tanda tangan harus sama. Buat keystore sekali (di bawah) dan simpan sebagai **Secrets**: `APK_KEYSTORE_BASE64`, `APK_KEYSTORE_PASSWORD`, `APK_KEY_ALIAS`, `APK_KEY_PASSWORD`. Tanpa secrets, APK memakai kunci debug yang di-cache GitHub; bila cache hilang, HP menolak pembaruan ("Aplikasi tidak terpasang") → copot aplikasi lama lalu pasang lagi (data ada di server; cukup isi alamat & masuk ulang). |
| Aplikasi ikut di dalam APK (tanpa memilih berkas) | Salin isi paket web ke `app/src/main/assets/www/` (harus ada `www/index.html`) lalu build **di komputer sendiri**. Folder itu masuk `.gitignore` karena `index.html` memuat data Master proyek — jangan di-commit. Kekurangannya: setiap ganti HTML dasar harus build APK ulang (paket *pembaruan-x.y.z.json* tetap datang dari server seperti biasa). |

Membuat keystore (sekali, simpan baik-baik — kehilangan keystore = tidak bisa memperbarui APK terpasang):

```bash
keytool -genkeypair -v -keystore monitoring-sap.jks -alias monitoringsap -keyalg RSA -keysize 2048 -validity 10000
```

```bash
base64 -w0 monitoring-sap.jks
```

Build di komputer (JDK 17 + Android SDK + Gradle 8.7):

```bash
gradle assembleDebug -PappUrl=https://alamat-web-anda/
```

Hasil: `app/build/outputs/apk/debug/app-debug.apk`.

## C. Yang perlu diketahui

- **Ganti alamat**: bila halaman gagal dibuka (alamat salah / tanpa sinyal saat pertama kali), layar *Alamat aplikasi* muncul lagi dengan pesan galatnya. Cara lain: Setelan Android › Aplikasi › Monitoring SAP › *Hapus data*.
- **Ikon**: `app/src/main/res/mipmap-*/ic_launcher*.png` (dibuat dari `icon-512.png` paket HP). Ganti berkas itu untuk ikon lain; warna latar ikon adaptif di `res/values/teks.xml` (`ikon_latar`).
- **Nama & ID aplikasi**: `nama_aplikasi` di `res/values/teks.xml`; `applicationId` di `app/build.gradle` (`id.kso.monitoringsap`).
- **Layar benar-benar penuh (tanpa bilah status)**: sengaja tidak dipakai — jam/sinyal tetap terlihat seperti aplikasi kantor umumnya.
- **Alternatif tanpa kode — TWA**: karena aplikasi sudah PWA (manifest + service worker), <https://www.pwabuilder.com> dapat membuat APK yang berjalan di mesin Chrome. Syaratnya berkas `/.well-known/assetlinks.json` di akar domain hosting; tanpa itu bilah alamat tetap tampil. Di GitHub Pages bentuk `akun.github.io/nama-repo/` syarat itu tidak dapat dipenuhi, karena itu repo ini memakai pembungkus WebView.

## D. Status uji

- `node uji-jembatan.js` — 7 cek jembatan unduh / cetak / jendela baru di Chromium (antarmuka Android ditirukan).
- Kompilasi & pemeriksaan APK (tanda tangan, paket, berkas aset) dijalankan workflow `.github/workflows/apk-android.yml` pada setiap PR.
- **Belum diuji di perangkat fisik oleh pembuatnya.** Saat pertama memasang, mohon coba: masuk, unggah foto dari kamera, *Unduh Excel*, dan cetak satu BA.
