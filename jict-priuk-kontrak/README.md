# JICT Priuk – Kontrak & Tagihan Assistant

Aplikasi web lokal (tanpa server, tanpa login) untuk mengelola dokumen kontrak, tagihan, dan berita acara
(SPK, SPP, Addendum, BA Klarifikasi, BAPP, BAPM, BAPSA, PO, Invoice, SPJ) dengan **format cetak baku** dan
**riwayat update** per dokumen — proyek **JICT Priuk – Perkuatan Dermaga Barat T1**.

## Cara Pakai

1. Salin folder ini (`index.html`, `app.js`, `styles.css`) ke komputer.
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
| 📦 Master data | Vendor, Material, Service — tambah/edit lewat form, import Excel (kolom ditebak otomatis, nama sama = diperbarui), export Excel. Vendor baru dari dokumen otomatis masuk master |
| 💾 Backup / Restore | Menu → Backup (file `.json` berisi semua dokumen, lampiran, master, pengaturan) |

## Penyimpanan Data — PENTING

- Data tersimpan di **IndexedDB browser** pada komputer ini (per browser, per alamat). Membuka lewat `file://` dan
  lewat `http://localhost:8080` dianggap **dua tempat penyimpanan berbeda** — pilih satu cara dan konsisten.
- Jangan pakai mode Incognito. Jangan "Clear browsing data → Cookies and site data".
- Lakukan **⚙️ Menu → Backup** secara rutin (mis. tiap Jumat) dan simpan file JSON di OneDrive/Drive.
  Untuk pindah komputer: Backup di komputer lama → Restore di komputer baru.

## Catatan

- Import/Export Excel butuh internet saat halaman dibuka (library SheetJS dari CDN). Fitur lain berjalan offline.
- Daftar tipe dokumen & judul cetaknya ada di konstanta `DOC_TYPES` di awal `app.js` — silakan sesuaikan.
- Data dari versi sebelumnya (field harga satuan/qty tunggal) otomatis dikonversi menjadi 1 baris item.
