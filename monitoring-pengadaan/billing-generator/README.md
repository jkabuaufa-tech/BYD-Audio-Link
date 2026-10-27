# JICT Priuk – Kontrak & Tagihan Assistant · Billing Generator 2.0.0

## Baru di 2.0.0 — Mode Terhubung Monitoring SAP
Panel **🔗 Mode Terhubung** di bagian atas: masuk dengan akun Monitoring SAP (URL aplikasi web Apps Script `…/exec`, nama, kata sandi,
ID proyek). Server harus sudah memasang **Modul server 1.10.0** (fitur `paketTagihan`).

| Fitur | Keterangan |
|---|---|
| Daftar paket tagihan | dari Monitoring SAP; status Terverifikasi / Diajukan / Proses / Dibayar dibaca dari Checklist & Keuangan & Bayar |
| Buka paket | perhitungan (DPP, PPN, PPh, UM, retensi, neto) dihitung server; temuan; dokumen; riwayat versi |
| Pratinjau & PDF | BAPM/BAPA/BAPP, BAP, rekap, draf invoice & kwitansi, checklist; **PDF terpisah + bundel** (pdf-lib lokal) diunggah bertahap ber-SHA-256 ke Drive proyek |
| Dokumen bertanda tangan / resmi vendor | unggah PDF ≤ 10 MB, pasang ke Checklist Tagihan (verifikasi tetap Admin di Monitoring SAP) |
| Paket baru | dari kontrak **Register** (item tersimpan di server). Kontrak Master (Excel tertanam) dibuatkan paket dari aplikasi Monitoring SAP. |
| Offline | daftar & paket terakhir dari salinan perangkat; perubahan ringan (status, tanggal, penandatangan) masuk antrean dan dikirim otomatis saat online (aman diulang) |
| Keamanan | hak akses mengikuti akun Monitoring SAP; kata sandi hanya di sessionStorage (hilang saat tab ditutup) |

Penyimpanan: IndexedDB `JICT_Priuk_Tagihan` (salinan & antrean) — terpisah dari data lokal `JICT_Priuk_DB`.
Pustaka `lib/inti.js, dokumen.js, render-html.js, render-pdf.js, klien.js` disalin dari `monitoring-pengadaan/tagihan/sumber`
oleh `python3 -I tagihan/alat/rakit.py billing` — ubah di sumber, bukan di sini. Detail lengkap: `../tagihan/README.md`.
Uji: `KODE_GS=…/Code.gs node uji/ui_bg.js` (15 cek).

---

Aplikasi web lokal (tanpa server, tanpa login) untuk mengelola dokumen kontrak, tagihan, dan berita acara
(SPK, SPP, Addendum, BA Klarifikasi, BAPP, BAPM, BAPSA, PO, Invoice, SPJ) dengan **format cetak baku** dan
**riwayat update** per dokumen — proyek **JICT Priuk – Perkuatan Dermaga Barat T1**.

## Cara Pakai

1. Salin **seluruh folder** (`index.html`, `app.js`, `styles.css`, `terhubung.js`, `xlsx.full.min.js`, `lib/`) ke satu folder di komputer.
2. Klik dua kali `index.html` (Chrome / Edge). Atau, lebih disarankan:
   ```powershell
   cd C:\Users\jkabu\procurement-assistant
   python -m http.server 8080
   # buka http://localhost:8080
   ```
3. Pertama kali: **⚙️ Menu → Pengaturan Proyek & TTD** — isi nama perusahaan, kode proyek (untuk penomoran), dan nama penandatangan.

## Fitur

| Fitur | Keterangan |
|---|---|
| ➕ Buat / Edit / Duplikat dokumen | Info dasar, vendor (auto-isi alamat & NPWP dari master), no. referensi SPK/PO, jatuh tempo |
| 🧾 Rincian item format BOQ | Banyak baris: uraian, satuan, volume, harga satuan, jumlah; Sub Total + PPN (default 11%, bisa diubah/dimatikan) |
| 🔢 Penomoran otomatis | `001/BAPP/JICT-DB/X/2026` — urut per tipe per tahun, bisa diubah manual |
| 🔄 Riwayat update | BAPM/BAPP/BAPSA/BA Klarifikasi/Addendum/Tagihan/Pembayaran; perubahan status & nilai **tercatat otomatis** |
| 🖨️ Cetak / Simpan PDF | Kop perusahaan, tabel item, terbilang, riwayat update, blok tanda tangan (Vendor, Dibuat, Diperiksa, Disetujui). Pilih "Save as PDF" di dialog cetak |
| 📎 Lampiran | PDF/DOC/XLS/JPG/PNG maks 10 MB, bisa dibuka dari preview |
| 🔍 Filter & urutkan | Proyek, kategori, tipe, status, rentang tanggal, kata kunci, cari di riwayat update; urut tanggal/nilai/terakhir diubah |
| 📊 Export rekap Excel | 3 sheet: Rekap, Rincian Item, Riwayat Update (sesuai filter aktif) |
| 📦 Master data | Service, Material, Vendor — **struktur sama** mengikuti master SAP (Kode, Deskripsi, Satuan, Material Group, Kategori, Paket Pengadaan). Tabel per halaman (50 baris), cari cepat, **✏️ Edit / ✕ Hapus per baris** (atau klik dua kali baris). Vendor baru dari dokumen otomatis masuk master |
| 📥 Import master SAP | Langsung pakai file export SAP: `master_service.xlsx` (sheet *Ref_Item Service*), `master_material.xlsx` (sheet *Material*, walau bukan sheet pertama), `master_vendor.xlsx` (sheet *rekanan*). Jenis data, sheet, baris judul & kolom terdeteksi otomatis + contoh 3 baris untuk dicek. Opsi "Ganti seluruh data lama" |
| 🔎 Auto-saran | Ketik nama/kode vendor atau item di form dokumen → pilih dari master (↑ ↓ Enter). Vendor mengisi alamat & NPWP; item mengisi kode, satuan, harga. Kategori Subkon mendahulukan Service, Bahan/Alat mendahulukan Material |
| 💾 Backup / Restore | Menu → Backup (file `.json` berisi semua dokumen, lampiran, master, pengaturan) |

## Pembaruan Aplikasi — tanpa mengganti file

Mulai versi **1.2.0**, file di folder adalah *versi bawaan*. Versi berikutnya dikirim sebagai **satu file paket**
`pembaruan-x.y.z.json` dan dipasang dari dalam aplikasi:

1. **⚙️ Menu → ⬆️ Pembaruan Aplikasi → 📦 Pilih Paket Pembaruan**, pilih file `.json`.
2. Konfirmasi → aplikasi dimuat ulang dengan versi baru (nomor versi tampil di menu).

- Data dokumen, master, dan pengaturan **tidak berubah**. Paket disimpan di browser (IndexedDB `JICT_Priuk_Pembaruan`).
- **↩️ Kembali ke versi sebelumnya** tersedia di jendela yang sama (menyimpan 1 versi cadangan, lalu versi bawaan).
- Bila paket gagal dijalankan, aplikasi menawarkan **mode aman** (versi bawaan). Mode aman juga bisa dibuka manual: `index.html?aman`.
- Paket dipasang per browser: bila memakai Chrome dan Edge, pasang di masing-masing.
- Untuk pengembang: naikkan `APP_VERSION` di `app.js`, lalu `python alat/buat-pembaruan.py "catatan rilis"` →
  `pembaruan/pembaruan-<versi>.json` (berisi markup body, `styles.css`, `app.js`).

## Penyimpanan Data — PENTING

- Data tersimpan di **IndexedDB browser** pada komputer ini (per browser, per alamat). Membuka lewat `file://` dan
  lewat `http://localhost:8080` dianggap **dua tempat penyimpanan berbeda** — pilih satu cara dan konsisten.
- Jangan pakai mode Incognito. Jangan "Clear browsing data → Cookies and site data".
- Lakukan **⚙️ Menu → Backup** secara rutin (mis. tiap Jumat) dan simpan file JSON di OneDrive/Drive.
  Untuk pindah komputer: Backup di komputer lama → Restore di komputer baru.

## Catatan

- Library Excel (`xlsx.full.min.js`, SheetJS 0.18.5, lisensi Apache-2.0) disertakan sehingga import/export Excel berjalan **tanpa internet**.
- Daftar tipe dokumen & judul cetaknya ada di konstanta `DOC_TYPES` di awal `app.js` — silakan sesuaikan.
- Data dari versi sebelumnya (field harga satuan/qty tunggal) otomatis dikonversi menjadi 1 baris item.
