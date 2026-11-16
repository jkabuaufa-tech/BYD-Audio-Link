# Web siap bagi — satu tautan untuk semua staf

Tujuan: staf **tidak lagi menerima berkas `.html`**. Admin mengunggah aplikasi sekali ke hosting statis gratis; semua orang (laptop, Android, iPhone) cukup membuka **satu tautan**. Pembaruan berikutnya tetap lewat *Pengguna & Proyek › Pembaruan* — tautan tidak pernah berubah.

| Berkas | Isi |
|---|---|
| `rakit-web.py` | merakit folder siap unggah dari berkas aplikasi (`index.html` / `Monitoring_SAP.html`) + alamat server `/exec` |
| `statis/hp-awal.js` | penghubung server (dari paket HP 2.2.1) + **2.3**: paket pembaruan tahan kuota (cadangan terkompresi lz-string), muat ulang otomatis saat paket pertama / pengganti versi < 2.6.5 datang, banner pembaruan tidak lagi menutupi layar |
| `statis/sw.js`, `manifest.webmanifest`, ikon | aplikasi dapat dipasang (PWA) dan terbuka walau sinyal putus |
| `statis/_headers` | aturan cache Cloudflare Pages / Netlify |
| `uji-web.js` | uji folder hasil rakit di Chromium (server ditirukan): perangkat baru, dari paket lama, kuota penuh |

## Merakit

```bash
python3 rakit-web.py /jalur/index.html "https://script.google.com/macros/s/…/exec" /jalur/keluar/monitoring-sap-web
```

Folder keluar berisi `index.html` (memuat data Master proyek) dan `config.json` (alamat server) — **jangan di-commit**.

## Mengunggah (sekali, ±10 menit)

**Cloudflare Pages** (gratis, tautan `https://<nama>.pages.dev`):
1. Daftar / masuk di <https://dash.cloudflare.com> › **Workers & Pages** › **Create** › tab **Pages** › **Upload assets**.
2. Beri nama proyek (menjadi alamatnya, mis. `monitoring-pengadaan-jict`) › seret **folder** `monitoring-sap-web` (atau zip-nya) › **Deploy**.
3. Buka tautannya — harus tampil layar masuk dengan daftar nama pengguna (tanda server terhubung).

Alternatif tanpa menu apa pun: <https://app.netlify.com/drop> — seret folder, selesai (buat akun agar situs tidak kedaluwarsa).

Mengganti HTML dasar di kemudian hari: rakit ulang › di proyek Pages yang sama **Create new deployment** › unggah folder baru. Tautan tetap.

## Membagikan ke staf

| Perangkat | Yang dilakukan staf |
|---|---|
| Laptop | buka tautan di Chrome / Edge; boleh klik ikon *Instal* di kolom alamat |
| Android | buka tautan di Chrome › menu ⋮ › **Instal aplikasi** (ikon muncul di layar utama, layar penuh) — atau pasang APK (`../apk-android`) yang alamatnya sudah ditanam |
| iPhone | Safari › Bagikan › **Tambah ke Layar Utama** |

Staf baru: Admin membuat akunnya di *Pengguna & Proyek* (atau staf memakai *Daftar akun*), lalu kirim tautannya. Proyek lain pada server yang sama: tambah proyek di *Pengguna & Proyek*, tautan sama. Server lain (KSO berbeda): rakit folder kedua dengan alamat `/exec` server itu dan unggah sebagai proyek Pages terpisah.

## Catatan keamanan

Tautan dapat dibuka siapa pun yang mengetahuinya. Data transaksi (Register, progres, tagihan) hanya keluar dari server setelah login, tetapi `index.html` sendiri memuat **data Master** (kontrak, material, service, vendor). Pakai nama proyek yang tidak mudah ditebak dan bagikan tautan hanya ke staf; bila perlu pembatasan e-mail, aktifkan Cloudflare Access (Zero Trust) untuk proyek Pages tersebut.
