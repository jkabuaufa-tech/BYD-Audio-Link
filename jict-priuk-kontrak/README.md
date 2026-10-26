# JICT Priuk – Kontrak & Tagihan Assistant

Aplikasi web lokal (tanpa server, tanpa login) untuk mengelola dokumen kontrak, tagihan, dan berita acara
(SPK, SPP, Addendum, BA Klarifikasi, BAPP, BAPM, BAPSA, PO, Invoice, SPJ) dengan **format cetak baku** dan
**riwayat update** per dokumen — proyek **JICT Priuk – Perkuatan Dermaga Barat T1**.

## Cara Pakai

1. Salin semua file (`index.html`, `app.js`, `modul.js`, `cetak-template.js`, `kontrak-template.js`, `styles.css`, `xlsx.full.min.js`) ke satu folder. Bila sudah memakai v1.2, cukup pasang `pembaruan-1.3.0.json` lewat menu Pembaruan Aplikasi.
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

## Menu Bahan · Alat · Subkon (v1.3)

| Menu | Sub-menu (rute) | Cetak / dokumen |
|---|---|---|
| 🧱 Bahan | SPM & SPPM (`#/bahan/spm`), BAPM (`#/bahan/bapm`), BAP (`#/bahan/bap`) | SPM, BAPM, BAP **identik master SPM**; SPPM → surat Word dari master SPPM |
| 🚜 Alat | SPSA (`#/alat/spsa`), BASO, BASTA *(menunggu format)*, BAPA, BAP | BAPA, BAP **identik master BAP_SPSA**; SPSA → surat Word |
| 👷 Subkon | SPK/SPKP/SPKU/SPPP (`#/subkon/spk`), Rincian Opname, Lampiran, BAPP, BAP, + BAPR | BAPP, BAP, Rincian, Lampiran, BAPR **identik master BAP format**; SPKU (= SPMB) → surat Word |

- **Alur**: buat kontrak induk (SPM/SPPM, SPSA, SPK/SPKU/SPPP) berisi pihak kedua & rincian item (BOQ, bisa dengan judul A/B, sub-judul, kelompok) →
  **+ Termin** untuk tiap pengiriman/periode/progres. Satu termin menghasilkan BAPM+BAP (Bahan), BAPA+BAP (Alat), atau Opname+BAPP+BAP (Subkon).
  Volume "lalu / s.d. / sisa", prestasi %, retensi, pengembalian uang muka, PPN, dan terbilang dihitung otomatis seperti rumus master.
- **Penomoran otomatis** sesuai master: `02/SPM/WK-NK.KSO/PDBJ/1726012/2026`, `09/SPSA/WK-NK.KSO/PDBJ/1726012/2026`, `05/SPKP/WK-NK.KSO/PDBJ/1726012/2026`,
  `01/BAPM/02/SPM/…`, `01/BAPP/02/SPPP/…`, `01/BAPR/…` (kode KSO & proyek di Pengaturan).
- **Nomor kontrak**: cukup isi No. Urut → otomatis `{no}/{SPM|SPPM|SPSA|SPK|SPKP|SPPP|SPKU}/WK-NK.KSO/PDBJ/1726012/{tahun tanggal kontrak}`.
- **👁️ Preview sebelum simpan** di form SPM/SPPM, SPSA, SPK/SPKP/SPKU/SPPP; **Syarat-syarat SPM** dapat diedit per kontrak (↺ kembali ke teks baku).
- **Penanda tangan**: BAP/Lampiran/BAPR otomatis memakai **Kuasa KSO** bila nilai kontrak ≥ batas (default Rp 3 M).
- **Cetak**: tata letak dibentuk dari master Excel (lebar kolom, sel gabungan, garis, huruf, format angka, skala halaman),
  footer kode dokumen + "Hal X dari Y", **placeholder logo 38 × 14 mm** di kiri atas semua dokumen (unggah di Pengaturan).
  Simpan PDF lewat dialog cetak → "Save as PDF".
- **Surat perjanjian Word** (SPPM, SPSA, SPKU): diisi dari template master (.docx) — nomor, tanggal (hari & huruf), pihak kedua,
  proyek, nilai, terbilang, rekening, dll. otomatis; isian lain diisi di panel "Isian Surat Perjanjian". Hasil .docx format persis master.
- **Peran & PIN** (Pengaturan): Admin (semua), User Proyek (tambah/edit/cetak), Viewer (lihat & cetak). PIN membatasi tombol di perangkat ini.
- **Data contoh**: Pengaturan › Tambahkan data contoh (SPM, SPSA, SPPP lengkap dengan termin & BAPR).
- Dokumen versi lama tetap di menu **📁 Arsip Dokumen Lama**.
- Pengembang: `alat/konversi-cetak.py <folder-master>` membuat `cetak-template.js` dari master Excel;
  `alat/buat-template-surat.py <folder-master>` membuat `kontrak-template.js` dari master Word.

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
