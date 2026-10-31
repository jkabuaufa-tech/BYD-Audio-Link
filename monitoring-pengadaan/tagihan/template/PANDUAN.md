# Panduan Template Tagihan Baku 2.9.8

Berlaku untuk **BAP - format (2.9.8).xlsx** (SPK / SPPP / SPKP / SPKU) dan **Master SPM (2.9.8).xlsx** (SPM / SPPM).
Kedua template dibuat dari berkas asli proyek oleh `tagihan/alat/perbaiki-template.py`. Kop surat, logo, Print Area, Page Setup (A4 Portrait, Fit to Page), margin, merge cells, dan gaya cetak **tidak berubah**. Yang diperbaiki hanya rumus.

---

## A. Temuan pada format asli & perbaikannya

### A.1 BAP - format

| No | Lokasi | Temuan pada format asli | Akibat | Perbaikan 2.9.8 |
|---|---|---|---|---|
| 1 | `lamp1` K15–K39 | Isi tidak seragam: K23, K35, K36 berisi angka 0; K15, K16, K25, K39 kosong | Item yang diletakkan di baris tersebut tidak masuk Nilai Kontrak | Semua 25 baris memakai `=IF(COUNT(H,J)<2,"",H*J)` |
| 2 | `lamp1` K42 | PPN tertulis tetap `K41*0,11` | Tidak ikut perubahan tarif PPN | `=K41*DATA!B11` |
| 3 | `rincian` AL:AQ | Baris 21–22, 31–32, 35–36 tidak punya alokasi termin | Progres item di baris itu selalu 0 | Alokasi termin di 25 baris → `REKAP PROGRES` J:O |
| 4 | `rincian` AS/AT | Kolom kontrol merujuk volume baris +1/+2 | Status "DITOLAK/HABIS" salah | Merujuk baris sendiri |
| 5 | `rincian` C12 | `=lamp1!C14` | Tercetak "0" bila kosong | Kosong bila tidak diisi |
| 6 | `BAPP` 49–59 | Merujuk `rincian!S36…S46` (bergeser 10 baris) | Volume s/d lalu & periode ini salah untuk bagian kedua | Baris BAPP n ↔ lamp1 n−21 ↔ rincian n−23 |
| 7 | `BAPP` 44, 56, 57 | Berisi "-" dan Q = 0 | Item di baris itu tidak tertagih | Rumus seragam |
| 8 | `BAPP` K69 / N68 | Retensi tetap 5%, Uang Muka tetap 0 | Potongan salah untuk kontrak lain | Retensi `=DATA!B47`, UM `=ROUND(N66×DATA!B46;0)` |
| 9 | `BAP 1` J36/J37/J41/J42, M36/M41 | Retensi & UM "yang lalu" = 0, "saat ini" tetap 5% / 0 | Potongan s/d saat ini salah sejak termin 2 | Persen dari DATA, dasar "yang lalu" = prestasi lalu |
| 10 | `BAPP` T8, `BAP 1` T9, `rincian` AL5 | Termin diketik manual per sheet | Termin bisa tidak sama antar-sheet | `=DATA!B28` (Termin Aktif) |
| 11 | `BAPP` B10, `BAP 1` C11 | Nomor disusun dari termin | Nomor BA khusus harus menimpa rumus | `=DATA!B30` / `=DATA!B31` |
| 12 | `BAPR` G22 | `#REF!` | Nilai kontrak & uang muka BAPR galat | `=lamp1!K41` |
| 13 | `BAPR` J32:J37 | Merujuk `BAP 2–6!Q33` yang rusak | Rekap retensi per termin galat | `=SUMPRODUCT(alokasi termin × harga)` dari rincian |
| 14 | `BAPR` I42 | `=O42/K42` | `#DIV/0!` bila retensi 0% | Dilindungi |
| 15 | `BAPR` B29 | Narasi tertulis "Surat Perjanjian Konsultan Perencana (SPKP)" | Salah untuk SPPP/SPK | Mengikuti `DATA!B37` (jenis kontrak otomatis dari nomor) |
| 16 | Sheet tersembunyi `BAP 2–6`, `BAPP 2–6`, `rincian 2–6` | 531–841 sel `#REF!` per sheet | Tidak dapat dipakai | **Dihapus.** Satu set sheet cetak mengikuti Termin Aktif |
| 17 | Semua sheet | `TEXT(tanggal)` kosong tercetak "00 Januari 1900" | Tanggal salah di cetakan | Tercetak "-" |
| 18 | Kop `BAP 1` & `BAPP` | Nama proyek 14 pt dengan font "72 Condensed" (jarang terpasang) terpecah 2 baris; garis merah mencoret alamat kantor | Kop menimpa ke bawah, tidak rapi | Nama proyek satu baris (Arial tebal 11 pt, tanpa pindah baris); satu garis merah di antara nama proyek & alamat |

### A.2 Master SPM

| No | Lokasi | Temuan | Perbaikan 2.9.8 |
|---|---|---|---|
| 1 | `ITEM` O:R → narasi `BAP!N31` | Narasi diurutkan menurut **harga satuan** dan hanya memuat item termin itu (bisa kurang dari 3) | Diurutkan menurut **nilai progres** (volume × harga) terbesar, lalu dilengkapi item kontrak bernilai terbesar. Narasi selalu memuat min. 3 item, ditambah "dll." |
| 2 | Semua sheet | Tanggal kosong tercetak "00 Januari 1900" | Tercetak "-" |

---

## B. Cara pakai (manual di Excel)

**BAP - format**
1. **DATA**: isi hanya sel biru, yaitu nomor & tanggal kontrak, nama pekerjaan, pihak kedua, **B28 Termin Aktif**, **B44 % Retensi**, **B45 % Uang Muka**, B99–B104 tanggal BA per termin. B46/B47 otomatis mengikuti B45/B44 dan boleh ditimpa bila potongan termin berbeda. Nomor BA (B30–B33) otomatis dan boleh ditimpa.
2. **lamp1** baris 15–39 (maks. 25 baris):
   - judul bagian: **B** huruf (A, B, …), **C** nama bagian;
   - item: **B** nomor, **D** uraian, **H** volume, **I** satuan, **J** harga satuan.
   - Kolom K dihitung sendiri.
3. **REKAP PROGRES** J:O (Termin 1–6): volume realisasi per termin, pada baris yang sama dengan item (baris lamp1 − 10).
4. Cetak **BAPP**, **BAP 1**, **rincian**, dan **lamp1** untuk termin aktif. Untuk termin berikutnya, ubah **DATA!B28**. Satu progres bulanan = satu cetakan.
5. **BAPR** (pelepasan retensi): otomatis dari seluruh termin.

**Master SPM**: isi **INPUT** (vendor, nomor, tanggal, termin) dan **ITEM** (uraian, satuan, volume, harga, volume BAP-1…4). Sheet SPM, BAPM, BAP, dan REKAP terisi otomatis.

**Jangan** mengetik di sheet cetak. Seluruh isinya rumus.

## C. Cara pakai (dari aplikasi Monitoring SAP 2.9.8)

Aplikasi mengisi sel isian di atas secara otomatis setiap Simpan BK, Terbitkan BA, dan saat paket dibentuk. Sumber datanya Register Kontrak, Master Data Vendor (rekanan), Konfigurasi Tagihan (% UM & retensi), dan Input Progres. Berkas disimpan ke arsip `<No> <Jenis> <Vendor>/Kelengkapan/BAP_<Pekerjaan>_<Vendor>_Termin-<X>.xlsx`.

- Tidak ada rumus sheet cetak yang ditimpa (**mode rumus asli**).
- Setiap berkas diverifikasi terhadap angka aplikasi: nilai kontrak, prestasi periode ini, dan volume per item. Bila ada beda, berkas disusun dengan mode cadangan 2.9.6 dan alasannya tampil di Paket Tagihan.

## D. Batas template
- BAP format: 25 baris (item + judul).
- Termin 1–6. BK ke-7 dst. digabung oleh aplikasi: termin sebelumnya menjadi satu baris "s/d lalu".
- Master SPM: 100 item, termin BAP 1–4.
- Kontrak yang melebihi batas ini perlu template berbaris lebih banyak. Tambah baris di `perbaiki-template.py` dengan pola yang sama.

## E. Pengujian
Template diuji dengan dua mesin hitung, yaitu **LibreOffice** (`tagihan/uji/lo_template_298.py`) dan mesin aplikasi **XLH** (`ui298.js`, `cek_xlsx_298.py`).
- Data uji BAP format: 12 item dan 2 judul, 3 termin, UM 20%, retensi 5%.
- Data uji Master SPM: 5 item.
- Area cetak semua sheet cetak bebas sel galat.
- Angka sama dengan hitungan manual.
