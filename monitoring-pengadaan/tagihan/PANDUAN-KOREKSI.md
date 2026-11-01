# Panduan Koreksi Tagihan (Monitoring SAP 2.9.9 · Modul server 1.10.5)

Panduan ini untuk BK/BA yang **salah input** setelah BA diterbitkan, misalnya item terlewat, volume salah ketik, atau volume kontrak belum di-addendum. Koreksi bersifat **resmi dan tercatat**: nomor BA tetap, revisi bertambah, dan setiap perubahan disimpan sebelum → sesudah beserta alasan dan dokumen acuannya.

---

## 1. Contoh kasus: Farika Steel, PT — BAPM 02 (`02/BAPM/005/SPPM/WK-NK.KSO/PDBJ/1726012/2026`)

| Item | Di aplikasi (BK) | Dokumen BAPM 02 bertanda tangan | Selisih |
|---|---|---|---|
| Pekerjaan Steel Pipe Pile SPP Ø702 mm t=19 mm | 0 kg | **185.477,80 kg** × 12.550 | + Rp 2.327.746.390 |
| Cat Coating Epoxy (SPP Ø702) | 0 m² | **65,54 m²** × 370.000 | + Rp 24.249.800 |
| Penebalan / Bottom Pile | 10,80 × 4.250.000 | 10,80 | – |
| **Nilai BAPM 02** | **Rp 45.900.000** | **Rp 2.397.896.190** | **+ Rp 2.351.996.190** |

**Akar masalah yang terlihat dari dokumen:**
1. **Dua item terlewat di BK 02.** Kemungkinan karena volume s/d (206.086,44 kg) melebihi volume kontrak di aplikasi (161.936 kg), sehingga item tidak bisa diinput.
2. **Volume kontrak di aplikasi tidak sama dengan dokumen.** Dugaan kuat ada addendum yang belum dicatat:

   | Item | Aplikasi | Dokumen |
   |---|---|---|
   | SPP Ø702 | 161.936 | 206.086,44 |
   | Cat Coating SPP | 48,52 | 72,82 |
   | SPSP t=19 | 4.696.603 | 4.696.299 |
   | Cat Coating SPSP | 2.125,78 | 2.548,56 |
   | SPSP t=14 | 159.531,10 | 159.520,86 |
   | Clutch t=14 | 272 | 274 |

3. **"Yang lalu" Clutch System t=19** di aplikasi 468,30 m, di dokumen 444 m. BAPM 01 perlu dicek; koreksinya lewat Admin karena sudah ada BK sesudahnya.

**Langkah koreksi yang direkomendasikan:**
1. Siapkan nomor addendum yang mengubah volume kontrak. Bila belum ada addendum resmi, minta Adkon menerbitkannya. Tanpa nomor addendum, koreksi yang membuat volume s/d melebihi kontrak akan ditolak.
2. Paket Tagihan BAPM 02 › **Koreksi BK** › **Isi dari Excel dokumen benar** › pilih Excel BAPM 02 bertanda tangan. Periksa pencocokan, centang *ikut perbarui volume kontrak*, lalu **Terapkan**.
3. **Dampak & alasan:**
   - Alasan: "BAPM 02 fisik: SPP Ø702 185.477,80 kg & Cat Coating 65,54 m² belum diinput di BK"
   - Acuan: "BAPM 02 bertanda tangan 17/07/2026"
   - No. addendum
   - Centang konfirmasi
4. **Simpan koreksi.** Paket dihitung ulang, Register diperbarui, dan Excel backup disusun ulang. Setelah itu:
   1. Pratinjau & Cetak PDF.
   2. Tanda tangan ulang BAPM/BAP 02.
   3. Unggah ke Checklist.
5. **Admin:** koreksi BAPM 01 (Clutch 468,30 → 444) bila dokumen BAPM 01 memang mencatat 444. Setelah itu cetak ulang BA yang terdampak.

---

## 2. Cara memakai Asisten Koreksi (3 langkah)

**Pintu masuk**
- **Paket Tagihan** › bar Excel backup › tombol **Koreksi BK**.
- **Pembentuk Tagihan** › tombol **Cek & Koreksi Tagihan**, atau ikon ✎ di setiap baris BK.

**Langkah 1 — Bandingkan & ubah**
- Tabel per item menampilkan: volume kontrak, yang lalu, saat ini tercatat, **saat ini (koreksi)**, s/d, sisa, jumlah, dan selisih Rp.
- Ada tiga cara mengisi kolom koreksi:
  - **Isi dari Excel dokumen benar** (disarankan). Format BAPM/BAPP/BAP/rincian dikenali dari judul kolom (Jenis Item/Uraian, Harga, Saat Ini/Periode Ini). Item dicocokkan dari harga satuan dan kemiripan uraian; tingkat kecocokan tinggi/sedang/rendah dapat diubah manual.
  - **Tempel kolom "Saat ini"** dari Excel/PDF: satu angka per baris. Format 185.477,80 maupun 185,477.80 dibaca dengan benar.
  - Ketik langsung di tabel.
- **Ubah volume kontrak (addendum):** khusus kontrak Register; nomor addendum wajib.
- Arti warna baris:
  - kuning = berubah;
  - merah = melebihi volume kontrak.
- Catatan oranye muncul bila volume kontrak atau "yang lalu" di dokumen berbeda dengan aplikasi.

**Langkah 2 — Dampak & alasan**
- Dampak yang ditampilkan:
  - BA terbit perlu dicetak ulang;
  - paket dihitung ulang dan PDF lama ditandai Perlu Revisi;
  - status bayar;
  - BK sesudahnya yang ikut berubah;
  - addendum.
- Isian wajib: alasan (min. 15 karakter), dokumen acuan, nomor addendum (bila volume melebihi kontrak atau volume kontrak diubah), dan centang konfirmasi pencocokan dengan dokumen fisik.

**Langkah 3 — Simpan**
- Ringkasan perubahan ditinjau dulu, lalu **Simpan koreksi**.
- Setelah tersimpan, tersedia tombol **Buka Paket Tagihan** dan **Unduh Excel baru**.

---

## 3. Aturan & kewenangan (dijaga server)

| Kondisi | Pengadaan | Admin |
|---|---|---|
| BK periode terakhir, belum diajukan bayar | ✔ | ✔ |
| Ada BK sesudahnya (mengubah "yang lalu" BK berikutnya) | ✖ | ✔ |
| Paket Siap Diperiksa / Terverifikasi | ✖ | ✔ (paket otomatis dikembalikan ke Revisi) |
| Status bayar DIAJUKAN | ✖ — kembalikan dulu ke Belum/Ditunda di Keuangan & Bayar | ✖ (sama) |
| Status bayar PROSES / DIBAYAR | ✖ — buat penyesuaian di BA termin berikutnya | ✖ |
| Volume s/d > volume kontrak | hanya dengan nomor addendum | sama |

Ketentuan lain:
- Kontrak Register: nilai BK selalu dihitung server dari harga Register.
- Koreksi bersifat **atomik**: bila paket gagal dihitung ulang, BK dan Register dikembalikan seperti semula.
- Jejak audit:
  - riwayat koreksi di BK;
  - sheet `<ID>_KoreksiTagihan` (sebelum → sesudah per item, addendum, alasan, acuan, oleh, waktu, paket & revisi);
  - log aktivitas.

## 4. Memeriksa tagihan lain — Cek & Koreksi Tagihan
Menu ini memindai seluruh BK dan menampilkan temuan berikut:
- nilai BK ≠ Σ volume × harga;
- volume s/d melebihi kontrak;
- harga 0;
- item BK tidak ada di kontrak;
- prestasi paket ≠ nilai BK;
- Excel backup belum ada;
- BA belum terbit;
- BK yang pernah dikoreksi.

Saringan yang tersedia: *Perlu dicek* · *Sudah dikoreksi* · *Semua BK*. Hasilnya dapat diekspor ke **CSV**.

> Kesalahan seperti **item terlewat** tidak selalu tampak dari angka, karena nilai BK tetap cocok dengan volume yang diinput. Untuk itu gunakan tombol **Bandingkan Excel** pada setiap BK, dengan Excel BA bertanda tangan sebagai pembanding.

**Rekomendasi pemeriksaan rutin (SOP)**
1. Setiap BA terbit: bandingkan BK dengan Excel/PDF BA bertanda tangan sebelum paket diajukan.
2. Setiap ada addendum: perbarui volume kontrak di Register **sebelum** input BK termin berikutnya.
3. Bulanan: jalankan **Cek & Koreksi Tagihan**, ekspor CSV, lalu arsipkan bersama rekap tagihan.
4. Koreksi BK lama dan paket yang sudah diperiksa hanya oleh Admin, dengan dokumen acuan yang jelas.
