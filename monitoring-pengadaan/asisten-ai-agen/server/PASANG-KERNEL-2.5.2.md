# Pasang server Code.gs 2.5.2 (URL /exec tetap sama, data tidak berubah)

**Untuk apa:** menghentikan galat acak *"Server mengirim halaman HTML, bukan data (HTTP 200 / HTTP 404 … Drive)"*.
Kernel 2.5.1 membaca Script Properties 2–5× per permintaan, dua di antaranya di luar `try`. Bila kuota harian Google
(akun Gmail: 50.000 baca/tulis Properties per hari) habis atau layanan Google sedang gangguan, galatnya tidak tertangkap dan Google
mengirim halaman HTML — aplikasi tidak bisa tahu sebabnya. 2.5.2 menyimpan Properties di cache (±99% lebih sedikit pembacaan) dan
membalas **semua** galat sebagai JSON yang jelas (`kode: KUOTA` / `GOOGLE`).

## Langkah (±5 menit, oleh pemilik script)
1. Buka spreadsheet **MONITORING SAP JICT** › **Ekstensi › Apps Script**.
2. Buka berkas **Code.gs** › pilih semua (Ctrl+A) › hapus › tempel seluruh isi `Code_2.5.2_Monitoring_Pengadaan.gs` › **Simpan** (Ctrl+S).
3. Pilih fungsi **`cekLayananGoogle`** › **Jalankan** › lihat *Log eksekusi*: semua baris harus ✔.
   (Bila diminta izin: Tinjau izin › pilih akun › Izinkan. Tidak ada izin baru dibanding 2.5.1.)
4. **Terapkan › Kelola deployment** › deployment yang sedang dipakai › ikon **pensil** › Versi: **Versi baru** › **Terapkan**.
   **Jangan** memilih "Deployment baru" — itu membuat URL /exec baru.
5. Di aplikasi: menu akun › Koneksi server › **Tes koneksi** → *Versi server: v2.5.2*.

## Sesudahnya
- Pasang **Modul server 1.8.10** (Diagnostik sistem › tab Modul) & **Pembaruan 2.6.2** (Pengguna & Proyek › Pembaruan).
- Bila galat masih muncul: menu akun › **Riwayat galat server** › **Salin** — pesannya kini menyebut sebab sebenarnya.

## Rollback
Tempel kembali `Code_2.5.1_Monitoring_Pengadaan.gs` › Simpan › Kelola deployment › pensil › Versi baru › Terapkan.
Tidak ada sheet, data, ID, atau berkas Drive yang diubah oleh 2.5.2.
