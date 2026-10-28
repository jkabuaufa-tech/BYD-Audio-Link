# Asisten AI & Verifikasi Tagihan — Monitoring Pengadaan

Modul server **1.10.1** + Pembaruan aplikasi **2.7.2** (kernel Code.gs 2.5.1, tanpa deployment ulang & tanpa izin Google baru). Paket Tagihan & Billing Generator 2.0.0: lihat [`../tagihan/README.md`](../tagihan/README.md). Kumulatif: berisi seluruh isi 1.5.x–1.6.0 / 2.2.8–2.3.0.

| Berkas | Untuk | Unggah lewat |
|---|---|---|
| `server-modul-1.10.1.json` | logika server terbaru: Petugas Gudang & qty gudang 3 desimal (kumulatif dari 1.10.0) — sumber `sumber/modul-1.10.1-lengkap.js` | Diagnostik sistem › Modul server |
| `pembaruan-2.7.2.json` | aplikasi terbaru: Register Kontrak satu menu & ubah vendor baku (kumulatif dari 2.7.1; modul tetap 1.10.1) | Pengguna & Proyek › Pembaruan |
| `pembaruan-2.7.1.json` | rollback — Petugas Gudang, Kartu Gudang 25–24, desimal SAP HANA (kumulatif dari 2.7.0; butuh modul 1.10.1) | Pengguna & Proyek › Pembaruan |
| `server-modul-1.10.0.json` | rollback — Paket Tagihan (aksi bl*, kumulatif dari 1.9.6) — sumber `sumber/modul-1.10.0-lengkap.js`, dirakit `../tagihan/alat/rakit.py` | Diagnostik sistem › Modul server |
| `pembaruan-2.7.0.json` | rollback — Paket Tagihan & Dashboard (kumulatif dari 2.6.24; butuh modul 1.10.0) | Pengguna & Proyek › Pembaruan |
| `server-modul-1.9.6.json` | logika server (lokasi database di Kesehatan & Backup; kumulatif dari 1.9.5) (format `monitoring-sap-modul-server`, `untukKernel: "2.5"`) | Diagnostik sistem › Modul server |
| `pembaruan-2.4.0.json` | aplikasi (CSS + JS, **kumulatif**) | Pengguna & Proyek › Pembaruan |
| `pembaruan-2.4.0.patch.json` | patch 2.2.7 → 2.4.0 (9 operasi, SHA-256 sumber & hasil) | dokumentasi / `alat/terapkan-patch.py` |
| `potongan-siap-tempel-2.4.0.json` | potongan `css` & `js` (Asisten AI, Verifikasi Tagihan) | rujukan tempel |
| `pembaruan-2.6.24.json` | aplikasi terbaru (kumulatif dari 2.6.23; modul tetap 1.9.6) | Pengguna & Proyek › Pembaruan |
| `pembaruan-2.6.23.json` | PO dari Bon (dasar 2.6.24) | rollback |
| `pembaruan-2.6.22.json` | kontrak multi-item (dasar 2.6.23) | rollback |
| `pembaruan-2.6.21.json` | lokasi database (dasar 2.6.22) | rollback |
| `pembaruan-2.6.20.json` | mode manual verifikasi (dasar 2.6.21) | rollback |
| `pembaruan-2.6.19.json` | Kesehatan & Backup (dasar 2.6.20) | rollback |
| `pembaruan-2.6.18.json` | bundel tagihan andal (dasar 2.6.19) | rollback |
| `pembaruan-2.6.17.json` | versi terpasang pengguna: Agen AI & Kantor Tim Pengadaan Live 2.6.13–2.6.17 (dasar 2.6.18) | rollback |
| `pembaruan-2.6.12.json` | PBJ calon vendor dari Master Data | rollback |
| `pembaruan-2.6.11.json` | PO SAP dari kontrak di semua menu (dasar 2.6.12) | rollback |
| `pembaruan-2.6.10.json` | nilai/tagihan satu rumus + Periksa kontrak (dasar 2.6.11) | rollback |
| `pembaruan-2.6.9.json` | notifikasi kontrak hanya BK < 100% (dasar 2.6.10) | rollback |
| `pembaruan-2.6.8.json` | Bon Bahan · Alat · Sub (dasar 2.6.9) | rollback |
| `pembaruan-2.6.7.json` | dasar 2.6.8 (paket terpasang di proyek: koreksi item kontrak Master) | rollback |
| `sumber/` | kode terbaca: `modul-1.9.6-lengkap.js` (seluruh modul server), blok 2.6.8 Bon Bahan · Alat · Sub (`pembaruan-2.6.8-bon-jenis.*`, dirakit dengan `alat/rakit-pembaruan.py`), blok aplikasi 2.6.2 Vendor WAVE & Sprint 1, 2.6.3 koneksi, serta blok UI lama (MP227 bagian 5, MP230, MP241, MP250) | — |
| `demo/demo-verifikasi-tagihan.html` | demo interaktif Verifikasi Tagihan (kernel + modul + UI asli, AI disimulasikan dengan isi 3 berkas tagihan) | buka di browser |
| `demo/demo-asisten-ai.html` | demo panel Asisten AI (2.2.10) | buka di browser |

> Kernel hanya menerima paket pembaruan **kumulatif** (cek `MP218_ADMIN_FIRST_MARKER`), jadi yang diunggah adalah `pembaruan-2.4.0.json`; berkas patch menunjukkan persis apa yang berubah.

## Changelog
### 2.7.2 — Register Kontrak satu menu & ubah vendor baku (modul server tetap 1.10.1, tanpa perubahan data)
- **Form Input Kontrak digabung ke Register Kontrak**: menu sidebar "Form Input Kontrak" (dan tombolnya di navigasi bawah HP) disembunyikan; form dibuka dari Register Kontrak › **Input Kontrak** (di depan "+ Kontrak multi-item"), dengan bilah "← Register Kontrak". Form, simpan, dan "Checklist banyak item → 1 PO" tidak diubah; menu aktif tetap Register Kontrak.
- **Ubah vendor baku** (Master Data › Vendor): setiap baris *Baku* punya tombol **Ubah**. Form terisi nama, ID SAP (terkunci), kota; isian alamat, direktur/jabatan, NPWP, telepon, e-mail disimpan sebagai master tambahan dengan **ID SAP yang sama** (master baku Excel tidak diubah).
  - Baris tampil satu kali sebagai "Baku · dilengkapi"; daftar vendor di form tidak dobel; `profilVendor` (BA, kontrak, paket tagihan) memakai alamat & direktur baru; Ubah lagi membuka data pelengkap yang sama.
  - Aturan lama "kode sudah ada di master baku" & konfirmasi "nama sama" dikecualikan hanya untuk pelengkap vendor baku itu sendiri.
- Sumber: `sumber/pembaruan-2.7.2-kontrak-vendor.{js,css}` + `pembaruan-2.7.2.ganti.json` (7 perbaikan di tempat pada blok Master Data 2.1.4).
- Uji: `ui272` (15, Chromium + kernel asli + modul 1.10.1), `ui271` & `uji_periode_2524` pada 2.7.2, `cek_paket` (2.7.2 > 2.7.1), `banding_paket` 2.7.1 → 2.7.2 tanpa galat baru.

### 2.7.1 + Modul 1.10.1 — Petugas Gudang, Kartu Gudang 25–24, standar desimal SAP HANA (Code.gs tetap 2.5.1)
- **Kartu Gudang periode 25–24**: Bulan B = tanggal **25 bulan sebelumnya s.d. 24 bulan B** (tanggal potong 25), menggantikan 26–25; transaksi tanggal 25 masuk periode bulan berikutnya, tiap tanggal hanya satu periode. Berlaku untuk periode berjalan (WIB), pilihan bulan/tahun, judul cetak, label, dan pencarian cepat (9 perbaikan di tempat).
- **Petugas Gudang**: kernel hanya mengenal Admin / Pengadaan / Lihat saja, jadi Petugas Gudang = akun **Lihat saja** yang dicentang Admin di menu akun › *Petugas Gudang* (Script Property `GUDANG_PETUGAS`, semua proyek, tercatat di Log).
  - Server 1.10.1: petugas boleh `gudangTerimaBon`, `gudangMasukSimpan`, `gudangKeluarSimpan`, `gudangUnggahFoto`, `gudangUnggahSJ` (surat jalan PDF; `unggahBerkas` kernel khusus Pengadaan), membatalkan transaksi **yang dicatatnya sendiri**, dan `baca` Bon Permintaan. Aksi modul lain — termasuk Paket Tagihan `bl*` — dan `baca` Register/Progres ditolak. Pembatas dipasang setelah seluruh aksi terdaftar.
  - Aplikasi 2.7.1 (blok `MP271`): sidebar, navigasi bawah HP, dan tab selain Penerimaan · Stok & Pengeluaran · Kartu Gudang disembunyikan; tab lain dialihkan ke Penerimaan; pita "Mode Petugas Gudang"; form gudang aktif untuk petugas (`peng()` MP223 + `sesi.gudang`).
  - Batas: `login`/`bacaSemua` adalah aksi inti kernel yang tidak dapat ditimpa modul, sehingga data proyek tetap terkirim ke perangkat petugas seperti akun Lihat saja (baca saja, menu disembunyikan). Pembatasan penuh memerlukan perubahan Code.gs.
- **Standar desimal SAP HANA**: kuantitas maks. **3 desimal**, rupiah **bulat**. Aplikasi membulatkan sebelum mengirim Register (`save`), Bon (`savePermintaan`), Progres (`saveProgres`); server membulatkan qty & harga transaksi gudang. Data lama tidak diubah sampai disimpan ulang.
- `alat/rakit-pembaruan.py`: hanya penanda versi aplikasi `2.x` yang diseragamkan (penanda mesin tagihan `BLI` 1.0.0 sejak 2.7.0 tidak disentuh).
- Uji: `uji_petugas_gudang` (42, kernel asli), `ui271` (18, Chromium + kernel asli), `uji_periode_2524` (9; gagal di 2.6.21), `uji_kartu_terusan` (6); regresi server dengan modul 1.10.1: `uji150` (72), `uji_vt`, `uji_bundel`, `uji_bundel_kosong`, `uji_manual`, `uji_pemantauan`, `uji_multiproyek`, `uji_sprint1`, `uji_kunci`, `uji_tim`, `uji_wave`, `uji_judul`, `../tagihan/uji/uji_inti` (84) & `uji_server_bl` (62, modul 1.10.1); `cek_paket` (2.7.1 > 2.7.0, 1.10.1 > 1.10.0); `banding_paket` 2.7.0 → 2.7.1 tanpa galat baru. `uji_kantor` sudah gagal di 1.10.0 (daftar anggota Tim AI berubah), bukan karena 2.7.1.

### 2.7.0 + Modul 1.10.0 — Paket Tagihan (Billing Generator terintegrasi)
- Tombol **Buat Paket Tagihan** di Register Kontrak, Input Progres, Monitoring BK & Keuangan & Bayar; dialog paket (termin/BK, konfigurasi per kontrak, perhitungan, lampiran surat jalan/timesheet/angka vendor, dokumen & checklist, riwayat); PDF terpisah + bundel → Drive; **Dashboard Paket Tagihan**.
- Modul 1.10.0: aksi `bl*`, sheet baru `<ID>_PaketTagihan`, `_PaketTagihanVersi`, `_KonfigTagihan`; status Terverifikasi/Diajukan/Dibayar dibaca dari Checklist & Keuangan & Bayar.
- Detail, audit versi, rumus, instalasi, rollback & laporan uji: [`../tagihan/README.md`](../tagihan/README.md). Uji: `../tagihan/uji/*` (185 cek baru) + regresi server & UI lama, `cek_paket` (2.7.0 > 2.6.24, 1.10.0 > 1.9.6), `banding_paket` 2.6.24 → 2.7.0.

### 2.6.24 — Checklist banyak item di Form Input Kontrak (modul server tetap 1.9.6)
- Form Input Kontrak lama › di bawah "Item dari Permintaan": tombol **Checklist banyak item → 1 PO**. Membuka dialog multi-item dengan jenis, tahun, bulan, no urut, vendor (+ID) dan bon dari form; centang item, volume boleh sebagian.
- Form dikenali dari teks label (XPath), HTML dasar tidak diubah; tombol juga muncul saat tab form dibuka (klik).
- Sumber: `sumber/pembaruan-2.6.24-form-lama.{js,css,ganti.json}`. Uji: `ui2624` (9), `ui2623` (`PAKET=pembaruan-2.6.24.json`, 22), `cek_paket`, `banding_paket` 2.6.23 → 2.6.24.

### 2.6.23 — PO dari Bon: sebagian & gabungan (modul server tetap 1.9.6, tanpa perubahan data)
- Register Kontrak › **PO dari Bon** (juga "Ambil dari Bon Permintaan" di form multi-item): centang item dari satu atau beberapa bon; volume bawaan = sisa bon, dapat dikurangi. Sisa tetap menunggu di bon → 1 bon jadi beberapa PO, beberapa bon jadi 1 PO.
- Sisa per item = volume bon − volume item kontrak Register ber-No Bon sama (cocok kode, atau uraian); alokasi & status bawaan (Master/PBJ) tetap dihormati. Ditampilkan: volume bon, sudah PO (no kontrak), sisa. Cari bon, "pilih semua sisa", tampilkan bon habis.
- Simpan ditolak bila total PO melebihi volume bon. Status menu Bon Permintaan tetap "sebagian" sampai seluruh volume ter-PO (`sisaPO` per item).
- Sumber: `sumber/pembaruan-2.6.23-po-bon.{js,css,ganti.json}` (mengganti blok MP2622). Uji: `ui2623` (22), `ui2622`, `cek_paket` (2.6.23 > 2.6.22), `banding_paket` 2.6.22 → 2.6.23.

### 2.6.22 — Input kontrak multi-item (modul server tetap 1.9.6, tanpa perubahan data)
- Register Kontrak › "+ Kontrak multi-item": banyak item per PO (baris baru otomatis, +5 baris, duplikat, hapus, Enter ke baris berikutnya), Tempel dari Excel (angka format Indonesia), Ambil dari Bon Permintaan (item yang sudah dikontrakkan dari bon itu dikunci), kode/satuan/harga terisi dari kontrak sebelumnya, total langsung, draf isian tersimpan di perangkat.
- Draf kontrak (belum diposting): tombol "Item (n)" untuk menambah/mengubah rincian item; kontrak diposting tidak dapat diubah dari sini.
- Disimpan lewat aksi kernel `save` dengan skema item yang sama dengan Form Input Kontrak & paket PBJ; form lama tetap ada.
- Uji: `ui2622` (20, kernel & modul asli), regresi UI, `cek_paket` (2.6.22 > 2.6.21), `banding_paket` 2.6.21 → 2.6.22.

### 2.6.21 + Modul 1.9.6 — Lokasi database di Kesehatan & Backup
- Menampilkan spreadsheet yang benar-benar ditulis server (Sheet terikat atau "DB Monitoring SAP" mandiri) + tautan, sheet proyek aktif & jumlah barisnya, simpan terakhir dari Log; peringatan bila aplikasi berjalan dalam Mode lokal.
- Uji: `ui2621` (12), regresi server, `cek_paket` (2.6.21 > 2.6.20, 1.9.6 > 1.9.5), `banding_paket` 2.6.20 → 2.6.21.

### 2.6.20 + Modul 1.9.5 — Mode manual Verifikasi Tagihan (PDF tidak dikirim ke AI, aktif bawaan)
- Satu titik blokir di server (`vtBacaAI`): bundel, dokumen checklist, verifikasi, Tim AI — tidak ada PDF (NPWP, KTP, rekening, faktur) yang keluar ke penyedia AI.
- Bundel tetap tersimpan, dipetakan manual (hal. a–b → item) dan dipotong ke checklist; gerbang verifikasi & bayar berbasis AI dilepas, keputusan lewat Verifikasi Admin.
- Admin mengubah mode di panel Bundel PDF (tercatat di Log).
- Perbaikan: menyimpan Setelan Asisten AI tidak lagi menghapus Setelan Verifikasi Tagihan.
- Uji: `uji_manual` (14), `ui2620` (11), regresi server & UI, `cek_paket` (2.6.20 > 2.6.19, 1.9.5 > 1.9.4), `banding_paket` 2.6.19 → 2.6.20. `vt_data.js` mematikan mode manual untuk uji AI lama (`VT_MANUAL=1` untuk uji mode manual).

### 2.6.19 + Modul 1.9.4 — Kesehatan & Backup tanpa mengubah Code.gs
- Backup harian spreadsheet database ke Drive "Backup Monitoring SAP" (14 salinan) + cek kesehatan (sel 70/85%, umur backup > 36 jam, Script Properties > 80%, pemicu) + email peringatan (maks. 1× per 6 jam per jenis).
- Berjalan di pemicu kernel yang sudah ada (`jadwalNotifikasi` → kait `terjadwal`), setelah notifikasi dan sebelum Tim AI. Tanpa izin Google baru.
- Menu akun › Kesehatan & Backup (Admin): status, Backup sekarang, Aktifkan jadwal harian 01.00 (bila belum ada pemicu), setelan email & jumlah salinan.
- Uji: `uji_pemantauan` (18), `ui2619` (9), regresi server & UI, `cek_paket` (2.6.19 > 2.6.18, 1.9.4 > 1.9.3), `banding_paket` 2.6.18 → 2.6.19.

### 2.6.18 + Modul 1.9.3 — Bundel tagihan dipisah andal & hemat token (Keuangan & Bayar › Bundel PDF)
- **Dasar**: `pembaruan-2.6.17.json` (versi terpasang pengguna: Agen AI Proyek 2.6.13/2.6.15, Kantor Agen AI Live 2.6.14, Ruang Perintah Live 2.6.16, koreksi 2.6.17). Paket bundel yang sempat bernomor 2.6.13 di cabang ini ditarik — nomor itu sudah dipakai paket Agen AI; bloknya kini `MP2618` (kelas `mp2618-*`, karena `mp2613-*` dipakai Agen AI).
- **Penanda versi**: 2.6.17 masih membawa `VERSI_PAKET = '2.6.12'` (dipakai mode pratinjau/kandidat Admin); 2.6.18 menyeragamkan keempat penanda. `alat/rakit-pembaruan.py` kini menyeragamkan penanda berapa pun nilai lamanya.
- **Laporan**: bundel tagihan diunggah, tetapi AI "tidak mengenali" dan checklist dianggap tidak ada dokumen.
- **Sebab** (dibuktikan dengan bundel contoh 38 halaman, seluruhnya hasil pindai tanpa lapisan teks):
  1. Modul 1.9.2 menerima jawaban AI `{"dokumen":[]}` sebagai "bagian tanpa dokumen" — tanpa galat, tanpa coba ulang.
  2. Hasil kosong itu disimpan ke cache, sehingga unggah ulang memakai hasil kosong yang sama.
  3. Penyedia/model yang hanya membaca lapisan teks PDF (mis. model OpenRouter tanpa dukungan PDF) melihat bundel hasil pindai sebagai kosong.
- **Server 1.9.3** (`vtBacaAI` baru, `sumber/modul-1.9.3-lengkap.js`):
  - Bagian pertama bundel & PDF per baris checklist wajib berisi dokumen: jawaban 0 dokumen → penyedia lain dahulu, lalu perintah baca-gambar (maks. 2 ulang). Gagal → galat dengan penyebab & langkah (penyedia pembaca gambar, scan 150–200 dpi, PDF terkunci).
  - Bagian lanjutan yang kosong diulang 1× lalu diterima (halaman lanjutan dokumen sebelumnya). Cache kosong dibaca ulang bila penyedia/model berganti.
  - Hasil kosong tidak disimpan; cache kosong lama (≤ 1.9.2) diabaikan.
  - Petunjuk lapisan teks per halaman dari aplikasi; bila AI tetap 0 dokumen dan PDF berteks → dipisah menurut judul (keyakinan rendah, ditandai).
  - Hemat token: AI menghilangkan field null (jawaban jauh lebih pendek, jarang terpotong → jarang diulang), item maks. 40 baris; pemakaian token dicatat di Log & panel.
  - `provider:"lain"` untuk baca ulang; judul baru: BA Penerimaan/Pemeriksaan Material → BAPM, Pemakaian Alat → BAPA, Prestasi/Kemajuan → BAPP, Serah Terima Alat → BAST Alat, Tax Invoice, Surat Pengiriman Barang/Delivery Note; "Berita Acara" ↔ "BA" pada nama item.
- **Aplikasi 2.6.18** (blok `MP2618`, `sumber/pembaruan-2.6.18-bundel.*`, 11 perbaikan di tempat pada blok MP240 — identik di 2.6.12 dan 2.6.17):
  - Lapisan teks PDF dibaca di perangkat dengan pdf.js (tanpa AI, tanpa token) dan dikirim sebagai petunjuk.
  - Dokumen "tidak dikenali" di peta dokumen dapat dipetakan ke item checklist; halaman dapat dipetakan manual (hal. a–b → item). Baris manual dipotong dari bundel dan dibaca AI saat verifikasi (jenis dokumen pasti benar).
  - Tombol **Baca ulang dengan penyedia AI lain**; ringkasan lapisan teks & token AI di panel.
  - Pembacaan bagian berhenti pada galat pertama (kuota tidak terbuang); bagian yang terbaca 0 dokumen pada percobaan gagal dibaca ulang saat unggah ulang.
- **Uji**: `uji_bundel_kosong` (18), `ui2618` (14, pdf.js & pdf-lib asli), regresi `uji_bundel`, `uji_vt`, `uji_judul`, `uji150`, `uji_multiproyek`, `ui250`, `ui251`, `ui255`, `ui2612`, `ui264`, `ui266`, `cek_paket` (2.6.18 > 2.6.17, 1.9.3 > 1.9.2), `banding_paket` 2.6.17 → 2.6.18 tanpa galat baru (blok Agen AI 2.6.13–2.6.17 tetap utuh). Uji coba bundel contoh asli (38 hlm pindai) dijalankan di luar repo (data vendor tidak disimpan): penyedia pembaca teks → galat jelas & tanpa cache; penyedia pembaca gambar → 23 dokumen, 8 baris checklist terisi otomatis, potongan halaman tepat.

### 2.6.12 — Paket PBJ: calon vendor hanya dari Master Data › Vendor (`pembaruan-2.6.12.json`, modul server tetap 1.9.2, tanpa perubahan data)
- **Permintaan**: calon vendor tender dipilih manual dari Master Data › Vendor, bukan dari database kontrak berjalan atau 15 vendor contoh PBJ Studio.
- **Perubahan** (di dalam PBJ Studio, `sumber` blok PBJ_PASCA):
  - Paket baru dimulai dengan database vendor **kosong**.
  - Tahap 2 menampilkan panel "Pilih calon vendor dari Master Data › Vendor": cari nama / ID / NPWP / kota, centang, "+ Tambahkan yang dicentang" (opsional langsung jadi peserta, maks. 15).
  - Tombol "+ Vendor" bebas dan "Impor CSV" dinonaktifkan; vendor Blacklist WAVE tidak dapat dipilih.
  - Paket lama: vendor contoh yang belum dipakai dapat dihapus dengan satu tombol; vendor yang sudah berharga/peserta/pemenang tidak disentuh.
- Dibangun di atas 2.6.11 (PBJ_HTML / PBJ_PASCA / cariVendor identik dengan 2.6.6). Paket 2.6.7 dari cabang PBJ ditarik — nomor itu sudah dipakai paket terpasang.
- **Uji**: `ui2612` (14), `ui262_sprint1`, `ui262_wave`, `ui264`, `ui265`, `ui266`, `ui263_koneksi`, `uji_multiproyek`, `uji_bundel`, `uji_vt`, `cek_paket` (2.6.12 > 2.6.11), `banding_paket` 2.6.11 → 2.6.12 tanpa galat baru.

### 2.6.11 — No PR / RFQ / PO SAP dari kontrak di semua menu (`pembaruan-2.6.11.json`, modul server tetap 1.9.2, tanpa perubahan data)
- **Laporan**: 055/SPM Cahaya Utama sudah ber-PO 4100076091 di Register Kontrak, tetapi PO itu tidak muncul di Monitoring BK Bulanan. Hal yang sama terjadi pada beberapa kontrak lain.
- **Sebab**: `barisBK()` (dipakai Monitoring BK Bulanan, Keuangan & Bayar, ekspor & cetak BK) memakai urutan PO berikut:
  1. PO di catatan BK saat tagihan dibuat (kosong / "IDC" bila PO belum terbit),
  2. PO Master Excel ("IDC" dianggap PO aktif),
  3. baru kemudian PO Register.

  Register Kontrak justru mendahulukan isian Register, sehingga kedua menu bisa berbeda.
- **Perbaikan** (blok `MP2611`, `sumber/pembaruan-2.6.11-po-kontrak.js`): satu aturan untuk semua menu.
  - Nomor SAP kontrak diambil berurutan dari Register → Perbaiki data kontrak (koreksi) → Master → item.
  - Hanya **nomor SAP** (angka ≥ 6 digit, bukan PO/RFQ yang dibatalkan) yang menang. Penanda seperti "IDC" dipakai hanya bila tidak ada nomor SAP.
  - PO kontrak menggantikan PO catatan BK yang berbeda, sehingga koreksi PO di Register berlaku juga ke BK lama.
  - Form *Lengkapi dokumen SAP* BK terisi PO kontrak.
  - Catatan BK di server tidak diubah.
- **Periksa kontrak** (kait `MP2610_CEK`, `sumber/pembaruan-2.6.11-po-kontrak.ganti.json`): mencantumkan BK yang menyimpan PO berbeda dari PO kontrak (`PO_BK_BEDA`) dan kontrak ber-BK yang PO SAP-nya belum diisi (`PO_KOSONG`, termasuk yang tercatat "IDC").
- Uji:
  - `ui2611.js` 8 cek di demo aplikasi lengkap (kernel asli): koreksi PO 055 + BK ber-PO kosong / "IDC" / PO lain → ketiganya tampil 4100076091 di Monitoring BK (tabel & form dokumen). PR/RFQ ikut. **Seluruh 74 BK** menampilkan PO yang sama dengan PO SAP kontrak.
  - Dengan `pembaruan-2.6.10.json` galat lama terlihat ("IDC" / 4100070000).
  - `ui2610`, `ui269`, `ui268` lulus di 2.6.11, `uji_demo` 2.6.9 → 2.6.11 (nilai/tagihan/status kontrak tetap hanya 027 & 091 yang berubah), `cek_paket` (2.6.11 > 2.6.10), `banding_paket` 2.6.10 → 2.6.11 tanpa galat baru.

### 2.6.10 — Nilai & tagihan kontrak satu rumus + Periksa kontrak (`pembaruan-2.6.10.json`, modul server tetap 1.9.2, tanpa perubahan data)
- **Laporan**: 027/SPM Putra Paloh di BAPM dan Input Progres sudah 100% (Rp 40.877.000), tetapi Rekap Seluruh Kontrak menampilkan "Nilai Rp 0 · Tagihan Rp 40,9 Juta · 0%" dan notifikasi masih "Lewat".
- **Sebab**: 027/SPM adalah kontrak tujuan **Perbaikan Register (2.6.0)**. Nilainya hanya diisi bila jumlah harga item kontrak sumber cocok (±0,5%) dengan nilai header Excel. Bila tidak cocok, misalnya sumbernya kontrak DRAFT dengan header 0, nilainya dibiarkan 0, sehingga persen tagihan = realisasi ÷ 0 = 0%.
- **Perbaikan A** (blok `MP2610`, `sumber/pembaruan-2.6.10-nilai-item.js`, berjalan setelah lapisan 2.6.0 & 2.6.7):
  - Kontrak **bernomor** yang nilainya ≤ 0 tetapi itemnya berharga memakai **jumlah harga item** (volume × harga satuan, sama dengan kolom Jumlah Harga di BAPM).
  - Tagihan ringkasan tidak pernah lebih kecil dari **jumlah BK Input Progres** kontrak itu, sehingga BK yang diisi sebagai nilai saja kini ikut terhitung di Dashboard. Pengecualian: kontrak sumber Perbaikan Register, karena tagihannya sengaja dibagi.
  - Progres dan status dihitung ulang.
  - Nilai > 0 tidak diubah. Kontrak **DRAFT belum bernomor tetap Rp 0**: memakai nilai item pada DRAFT No 69 Mirsel akan menambah Rp 8,19 miliar ke nilai kontrak terbit.
- **Perbaikan B — Periksa kontrak** (menu akun › *Periksa kontrak*, atau tombol *Periksa* di Rekap Seluruh Kontrak): memeriksa seluruh kontrak Master + Register + BK dan mencantumkan:
  - Galat: notifikasi padahal BK 100%, nilai Rp 0 tanpa harga item, BK tidak terhubung ke kontrak mana pun (mis. nomor salah ketik).
  - Peringatan: nilai diambil dari jumlah item, jumlah item ≠ nilai kontrak, tagihan > 100%.
  - Info: BK diisi nilai saja, DRAFT bernilai 0, tanggal selesai kosong.

  Setiap temuan punya tombol *Buka* ke form kontraknya, dan hasilnya dapat diunduh CSV.
- **Pemeriksaan seluruh kontrak Master** (HTML dasar, 73 kontrak + data awal Excel 66 BK & 7 Bon diimpor): 2.6.9 → 2.6.10 **tidak mengubah satu pun** nilai, tagihan, status, maupun notifikasi kontrak Master. Tidak ada kontrak Selesai dengan BK < 100%, tidak ada tagihan > 100%, dan tidak ada selisih jumlah item vs nilai. Temuan: 2 DRAFT bernilai header 0 (No 67, No 69) dan 2 kontrak tanpa tanggal selesai (024/SPK, 040/SPPM). Kasus 027/SPM berasal dari data koreksi di server, jadi periksa data server lewat *Periksa kontrak* setelah memasang.
- **Demo aplikasi lengkap** (`demo/rakit_demo_app.py` + `demo/demo-app-boot.js`): satu berkas HTML berisi HTML dasar asli + paket + kernel Code.gs asli + modul 1.9.2, semuanya berjalan di browser.
  - Data awal Excel diimpor dan dikunci, ditambah kasus contoh: Perbaikan Register 090/SPSA bernilai 0, Register 091 BK nilai saja, 092 BK 62,5%, BK 093 salah ketik, Bon bahan & alat.
  - Kunci penyimpanan browser diberi awalan `DEMOJICT_` supaya tidak bercampur dengan aplikasi asli.
  - Hasil rakitan memuat data proyek dan **tidak di-commit**.
- **Demo dengan koreksi 027/028 dari server proyek**: Excel mencatat 028/SPM 17 item Rp 162.044.900 atas nama Putra Paloh. Item 1–12 (Rp 40.877.000, DPP resmi) dipindah lewat Perbaikan Register ke 027/SPM Putra Paloh, dan 028/SPM dikoreksi menjadi Anugerah Rhadika Pratama, PT Rp 121.167.900.
  - Karena 028 sudah dikoreksi (Rp 121 jt ≠ jumlah 17 item Rp 162 jt), Perbaikan Register memberi nilai tujuan 027 Rp 0. 2.6.10 memakai jumlah 12 item, Rp 40.877.000.
  - `uji/uji_demo.js` (10 cek) merakit demo 2.6.9 & 2.6.10 dan memastikan hanya 027 (serta kontrak CONTOH 091) yang berubah. 028 Anugerah dan seluruh kontrak lain identik.
  - Temuan data lama, tidak diubah otomatis: BK Excel 01/BAPM/028 Rp 162.044.900 adalah nilai sebelum dipisah, jadi 028 tertagih 133,7% dari Rp 121.167.900. *Periksa kontrak* menandainya "tagihan > 100%". Total tagihan Dashboard tetap dibatasi nilai kontrak, sehingga tidak terhitung ganda.
- Uji:
  - `ui2610.js` 12 cek (aplikasi asli + kernel 2.5.1 + item Master asli, termasuk Periksa kontrak & unduh CSV). Dengan `PAKET=pembaruan-2.6.9.json` gejala lama terlihat (Rp 0 · 0% · lewat).
  - `ui268` & `ui269` lulus di 2.6.10.
  - `cek_paket` (2.6.10 > 2.6.9), `banding_paket` 2.6.9 → 2.6.10 tanpa galat baru.
  - Demo dijalankan langkah demi langkah di Chromium (8 cek, tanpa galat JS). Tangkapan: `tangkapan/periksa-kontrak.png`.
- Catatan: kontrak sumber dengan nilai header Excel tetap memakai nilai header-nya. Bila item yang dipindah termasuk dalam header itu, total nilai portofolio bisa terhitung ganda sebesar nilai item tersebut. *Periksa kontrak* menandai kontrak tujuannya ("nilai dari jumlah item"). Isi "Nilai kontrak tujuan" di form Perbaikan Register bila perlu angka pasti.

### 2.6.9 — Notifikasi kontrak hanya untuk tagihan (BK) < 100% (`pembaruan-2.6.9.json`, modul server tetap 1.9.2, tanpa perubahan data)
- **Laporan**: 027/SPM Putra Paloh sudah tertagih 100%, tetapi masih muncul "Lewat 126 h" (Kritis H+30) di Notifikasi prioritas.
- **Sebab**: `lunas264` (2.6.4) hanya membaca **satu** ukuran tagihan, yaitu realisasi baris kontrak. Pada kontrak Register, realisasi itu hanya menghitung BK yang diisi **per volume item**. BK yang diisi sebagai nilai saja tidak ikut terhitung, dan jumlah BK progres baru dipakai bila realisasinya 0. Contoh: BK 1 per item Rp 1 jt + BK 2 nilai Rp 1 jt dari kontrak Rp 2 jt dibaca 50%, sehingga kontrak tetap dianggap "lewat".
- **Perbaikan** (di tempat, `sumber/pembaruan-2.6.9-kontrak-lunas.ganti.json`): kontrak dianggap selesai bila **salah satu** ukuran tagihan sudah 100% (toleransi 0,01%, min. Rp 1.000):
  - realisasi baris Register/Master,
  - ringkasan kontrak (Dashboard/Rekap Tagihan, termasuk nilai hasil koreksi),
  - jumlah BK seluruh nomor terkait (nomor asli, nomor koreksi, kontrak terkait).

  Berlaku untuk lonceng, Prioritas Hari Ini, email/Telegram (snapshot dari aplikasi) dan ringkasan Kantor AI. Butir yang tersisa menampilkan persen BK, mis. "BK 62,5%" (dibulatkan ke bawah, jadi 99,96% tampil 99,9%, bukan 100%).
- Uji: `ui269.js` 6 cek di aplikasi asli + kernel 2.5.1. Dengan `PAKET=pembaruan-2.6.8.json` galat lama terlihat (927 = kasus 027 masih "lewat"); dengan 2.6.9 kontrak BK 100% hilang, BK 62,5% dan 0% tetap muncul, dan pelunasan susulan otomatis menghapus butirnya. `cek_paket` (2.6.9 > 2.6.8) dan `banding_paket` 2.6.8 → 2.6.9 tanpa galat baru.

### 2.6.8 — Bon Permintaan: Bahan · Alat · Sub (`pembaruan-2.6.8.json`, modul server tetap 1.9.2, tanpa perubahan server & data)
- Form Bon Permintaan kini punya pilihan **Jenis permintaan** di atas Rincian:

  | Jenis | Master | Awalan kode | Contoh |
  |---|---|---|---|
  | **Bahan** | Master Material | `1…`, `21…` | 1000000001 Timbunan, 2100000004 Container Office 20 Feet |
  | **Alat** | Master Service | `49…` (Sewa Alat) | 49000000 Excavator |
  | **Sub** | Master Service | `29…` (Upah Mandor), `39…` (Subkon) | 29000000 Bekisting, 39000001 Perancah Finishing |

  Pencarian nama/kode di tiap baris hanya menawarkan master jenis yang dipilih. Kolom tabel, petunjuk & placeholder ikut menyesuaikan. Kode Material 20xxx/22xxx (mis. Lift Penumpang) tidak lagi ditawarkan sebagai Bahan, sesuai aturan 1xxx/21xxx.
- **Master tambahan** (menu Master Data): Material → Bahan; Service → menurut kode SAP-nya (49 / 29 / 39), atau tanpa kode SAP: kategori berisi "alat" → Alat, lainnya → Sub.
- **Jenis Bon dibaca dari kode item**. Server 2.5.1 hanya menyimpan `kode · uraian · sat · vol · harga · wbs`, jadi tidak ada kolom/sheet baru. Bon lama otomatis terbaca sebagai Bahan. Saat membuka *Ubah* pada Bon, jenisnya dipilih otomatis. Bon boleh berisi campuran jenis, dan aplikasi memberi tahu bila ada baris berjenis lain.
- **Daftar Permintaan**: filter *Semua jenis · Bahan · Alat · Sub* (jumlah per jenis) di samping filter status, plus lencana jenis per Bon. Tombol alokasi WBS (2.1.4) tetap ada.
- **Ringkasan** form: "x bahan · y alat · z sub". **Cetak formulir**: kolom *Jenis* mencentang Material / Alat / Tenaga (Sub).
- Uji: `ui268.js` — **21 cek di aplikasi ASLI** (HTML dasar + paket 2.6.8 utuh + kernel Code.gs 2.5.1 + modul 1.9.2): pencarian per jenis pada 31.223 material & 35.182 service, simpan ke server, filter daftar, ubah Bon lama, cetak, HP 390 px, tanpa galat JS. `cek_paket` (2.6.8 > 2.6.7), `banding_paket` 2.6.7 → 2.6.8 tanpa galat baru. Tangkapan: `tangkapan/bon-jenis.png`, `tangkapan/bon-jenis-hp.png`.

### 1.9.2 / 2.6.6 — Multi-proyek: Ganti Proyek, proyek baru mulai bersih, Master Data & Arsip Vendor bersama (`server-modul-1.9.2.json`, `pembaruan-2.6.6.json`)
- **Dasar**: data transaksi sudah terpisah per proyek sejak kernel (sheet `<ID>_Register`, `_Progres`, `_Permintaan`, `_PBJ`, `_Gudang*`, `_ChecklistTagihan`, `_Verifikasi*`, `_Log`, `_TimAI`, setelan `NOTIF_*_<ID>`, `TIM_*_<ID>`) → proyek baru otomatis kosong. Yang ditambahkan:
- **Ganti proyek** tanpa keluar-masuk: chip ID/nama proyek di atas, menu akun › *Ganti proyek*, Ctrl+K "proyek". Hanya proyek yang boleh dibuka akun; server memeriksa akses (`login` ke proyek tujuan), sesi tersimpan diperbarui lalu aplikasi dimuat ulang (tidak ada cache proyek lama yang terbawa). Mengingatkan bila ada isian belum disimpan.
- **Siapkan proyek baru** (Admin, `pySiapkan`/`pyAkses`): salin setelan Notifikasi & Kantor AI dari proyek sumber (tidak menimpa yang sudah ada), atur **grup berbagi**, beri akses pengguna (akun "*" tidak diubah; akses terakhir tidak dapat dicabut). Dicatat di Log proyek tujuan saja. Setelan Asisten AI & Verifikasi Tagihan memang global.
- **Master Data & Arsip Dokumen Vendor bersama** dalam grup (property `PROYEK_BERBAGI`): proyek lain hanya dibaca; ubah/cabut atas data bersama disimpan di proyek yang sedang dibuka (salin-saat-ubah) dan versi terbaru tampil di semua proyek grup; kode master tidak boleh dobel antar proyek grup; PDF arsip proyek grup dapat dibuka (`ambilBerkas`) dan otomatis disalin ke folder proyek ini saat dipasang ke checklist (`checklistSimpan`). Proyek di luar grup (mis. uji coba) tidak ikut.
- Uji: `uji_multiproyek.js` 29 cek — potret seluruh sheet, setelan & berkas 1726012 **identik** sebelum dan sesudah persiapan, berbagi, ubah, cabut & akses; `ui266.js` 14 cek UI; regresi seluruh uji lulus.

### 2.6.5 — Dialog "Versi baru … tersedia" selalu dapat ditutup, juga untuk Admin (`pembaruan-2.6.5.json`, modul server tetap 1.9.1)
- Laporan Admin setelah memasang 2.6.4: dialog besar berisi seluruh catatan rilis masih muncul tanpa tombol tutup (tombolnya terdorong keluar layar). Dialog itu dibuat kode yang sedang berjalan (2.6.2, sebelum 2.6.4 termuat), dan jalurnya — dialog `tanya()` HTML dasar — belum ditangkap MP264 (hanya `notif()` & elemen baru).
- 2.6.5 menangkap semua jalur: `tanya()` (dijawab "nanti", tanpa dialog), `notif()`, kotak yang dibuat atau diisi ulang langsung oleh HTML dasar, dan dialog Bootstrap (ditutup lewat Bootstrap beserta latarnya). Semua diganti kartu kecil *Muat ulang · Catatan · Nanti · ×*. Esc menutup kotak versi baru yang tersisa.
- Pengaman: hanya kotak yang isinya ≥ 60% pesan versi baru yang diganti — panel Admin (juga melayang) dan baris riwayat pembaruan tidak pernah disembunyikan; dialog `tanya()` lain tetap normal.
- Uji: `ui265.js` 11 cek; `ui264.js`, `ui262_*`, `ui263_koneksi`, `cek_paket` (2.6.5 > 2.6.4), `banding_paket` 2.6.4 → 2.6.5 lulus.

### 2.6.4 — Pemberitahuan versi baru dapat ditutup & notifikasi kontrak hanya untuk tagihan < 100% (`pembaruan-2.6.4.json`, modul server tetap 1.9.1)
- **Versi baru**: kotak besar berisi seluruh catatan rilis (tanpa tombol tutup, muncul saat staf sedang entri) diganti kartu kecil di pojok kanan bawah — *Muat ulang · Catatan · Nanti · ×*. Saat pengguna sedang mengetik hanya tampil tombol kecil "Versi baru" (kursor tidak berpindah). *Muat ulang* mengingatkan bila ada isian belum disimpan. Ditutup = tidak muncul lagi untuk versi itu sampai aplikasi dibuka ulang. Menangkap jalur `notif()` maupun kotak yang dibuat langsung oleh HTML dasar.
- **Kontrak lewat / H-30**: kontrak dengan tagihan (BK) ≥ nilai kontrak (toleransi pembulatan 0,01%, min. Rp 1.000) dianggap selesai walaupun statusnya "perlu dilengkapi" (contoh 015/SPM Limas Jaya) — tidak muncul di lonceng, Prioritas Hari Ini, email/Telegram, maupun ringkasan untuk Kantor AI. Kontrak Register dihitung dari jumlah BK progres. Kontrak bernilai 0 tetap dipantau.
- Tanpa perubahan data. Uji: `ui264.js` 17 cek (blok MP220, MP258, MP264 asli); `banding_paket.js` 2.6.3 → 2.6.4 tanpa galat baru; uji 2.6.2/2.6.3 diulang pada 2.6.4 & lulus.

### 1.9.1 / 2.6.3 — "Server mengirim halaman HTML, bukan data (HTTP 200)…" diselesaikan (`server-modul-1.9.1.json`, `pembaruan-2.6.3.json`)
- **Sebab sebenarnya**: bukan otorisasi atau URL. Kernel selalu membalas JSON (galat script pun dibungkus JSON), jadi halaman HTML berasal dari Google saat jawaban web app terputus/tersendat sesaat. Pada aksi SIMPAN script biasanya **sudah berjalan** sebelum jawabannya terputus → "terlihat gagal padahal tersimpan"; mengulang manual berisiko menyimpan dua kali.
- **Simpan**: bila jawaban terputus, aplikasi menanyakan Log server (`x191Jejak`, baca): sudah tercatat → "✓ SUDAH TERSIMPAN" + data dimuat ulang; belum tercatat → dikirim ulang otomatis sekali; tercatat sebagai penolakan (mis. GERBANG NILAI DITOLAK) → alasan ditampilkan. Jam perangkat dicocokkan dengan jam server.
- **Baca**: 2× ulang tambahan (5 & 10 dtk) setelah 2× ulang 2.5.9, dengan penanda kecil. Pembacaan WAVE/Sprint 1 masuk antrean & ulang otomatis 2.5.9.
- **Pesan jujur**: bila server baru saja menjawab, pesan tidak lagi menyuruh otorisasi ulang / ganti URL.
- **Lebih ringan saat masuk**: `wvDaftar` per halaman 1.500 vendor (±150 KB, bukan sekaligus); WAVE dimuat 20 dtk setelah masuk, ringkasan dokumen kurang 9 dtk.
- Uji: `ui263_koneksi.js` 14 cek — rantai `regPost` asli dari paket (MP259B → MP261 → MP263) di Chromium, Google ditiru mengirim HTML **sebelum** dan **sesudah** script berjalan: tersimpan tepat sekali, kirim ulang aman, penolakan tidak dianggap tersimpan, pesan jujur. `banding_paket.js` kini memuat paket per blok (15 blok berjalan; sebelumnya galat blok awal di halaman tiruan menghentikan blok berikutnya): tanpa galat baru, beban setara 2.6.1.

### 1.9.0 / 2.6.2 — WAVE & Sprint 1 dipasang di atas 2.6.1 / 1.8.9 (`server-modul-1.9.0.json`, `pembaruan-2.6.2.json`)
- **Dasar**: berkas yang sedang terpasang di proyek — `pembaruan-2.6.1.json` + `server-modul-1.8.9.json` (jalur pengembangan lain yang bercabang dari 2.5.5 / 1.8.4: Kartu Gudang combobox, PDF manual diutamakan, alur bundel → verifikasi, gudang per halaman, perbaikan item kontrak, pengguna online, coba ulang "server sibuk"). Seluruh isinya tetap utuh: selain baris yang sengaja diubah (notifikasi K, daftar aksi/fitur/baca/timpa, nomor versi), kode 1.9.0 identik dengan 1.8.9.
- **Ditambahkan**: Data Vendor WAVE (bagian W; blok aplikasi berawalan baru `mpwv` agar tidak bersinggungan dengan fungsi `mp256*` milik 2.5.6 proyek) dan Sprint 1 (bagian X & blok MP258) — isi sama dengan rilis 1.8.5–1.8.6 / 2.5.6–2.5.8 di bawah.
- **Kinerja**: pengamat halaman blok WAVE & Sprint 1 dibatasi (paling sering sekali per 200–250 ms, tanpa memindai node) mengikuti pola 2.6.1. Uji banding paket utuh 2.6.1 vs 2.6.2 (`uji/banding_paket.js`): tidak ada galat baru; 20.000 elemen tampil bertahap ±1,4 dtk di keduanya. *Koreksi (2.6.3): pada uji ini galat blok awal di halaman tiruan menghentikan blok-blok akhir di kedua versi, jadi blok baru belum benar-benar teruji di sana — uji banding diperkuat di 2.6.3.*
- **Ditarik**: `pembaruan-2.5.8.json` & `server-modul-1.8.6.json` dari jalur ini (nomor versinya bentrok dengan 2.5.8 / 1.8.6 milik proyek dan lebih rendah dari 2.6.1 / 1.8.9 sehingga ditolak kernel). `pembaruan-2.5.6/2.5.7.json` di folder ini juga berasal dari jalur lama — jangan dipasang.
- Uji (dijalankan pada 1.8.9 sebagai pembanding lalu 1.9.0, hasil identik): uji150 72 · uji_vt 36 · uji_tim 36 · uji_kantor 18 · uji_kunci 16 · uji_bundel 40 · uji_judul 9 · rollback; baru: uji_sprint1 27 · uji_wave 12 (juga file WAVE asli) · ui262_sprint1 27 · ui262_wave 14 · cek_paket (kernel menerima 2.6.2 > 2.6.1 dan 1.9.0 > 1.8.9).

### 1.8.6 / 2.5.8 (ditarik, digantikan 1.9.0 / 2.6.2) — Sprint 1: notifikasi berjenjang, gerbang nilai kontrak, dokumen kurang, Jejak Audit (`server-modul-1.8.6.json`, `pembaruan-2.5.8.json`)
- **Notifikasi berjenjang** (lonceng): kontrak H-30 *Info* · H-7 *Warning* · H+0 *Kritis* · H+30 *Kritis (eskalasi)*; dokumen vendor kedaluwarsa *Kritis*; draf kontrak Rp 0 *Warning* (*Kritis* bila > 30 hari); tagihan dokumen < 100% *Info*. Angka lonceng = jumlah Kritis saja; tab Kritis/Warning/Info/Ditangani; *Tandai ditangani* menyembunyikan butir sampai tahapnya naik. Email/Telegram menyebut jumlah per level, subjek memuat "N KRITIS".
- **Gerbang nilai kontrak** (server, menimpa `save` & `posting` lalu kernel berjalan utuh): kontrak Rp 0 boleh disimpan sebagai DRAF, tetapi ditolak bila dilengkapi PR/RFQ/PO/TOP atau diposting sebelum item (volume × harga) bernilai; item bernilai tidak boleh dikosongkan; tanggal selesai ≥ tanggal kontrak; data lama tetap bisa diedit; penolakan tercatat di Log (`GERBANG NILAI DITOLAK`).
- **Prioritas Hari Ini** (Dashboard): Kritis, kontrak lewat jatuh tempo, draf Rp 0 (tombol *Lanjutkan*), tagihan belum diproses bayar, kelengkapan dokumen — dihitung sekali per versi data.
- **Register Kontrak per halaman** (25 / 50 / Semua). **Dokumen kurang**: arahkan kursor / ketuk kolom Kelengkapan di Keuangan & Bayar → daftar dokumen yang masih kurang menurut templat jenis kontrak (Sewa Alat tanpa retensi, uang muka & jaminan pelaksanaan) — `x186Kurang`.
- **Jejak Audit** (Admin; Dashboard atau Ctrl+K "audit"): seluruh catatan Log — cari, filter aksi/pengguna/tanggal, ekspor Excel — `x186Audit`.
- Tidak termasuk: integrasi SAP/ERP pusat (diputuskan tidak dikerjakan).
- Uji: `uji_sprint1.js` 27 cek (server) & `ui258.js` (kini `ui262_sprint1.js`) 27 cek UI (Chromium, server 1.8.6 asli lewat harness); regresi seluruh uji server & UI lama lulus. Tangkapan: `tangkapan/sprint1-*.png`.

### 2.5.7 — WAVE hanya melengkapi vendor yang sudah ada (`pembaruan-2.5.7.json`, modul server tetap 1.8.5)
- Sesuai permintaan: **tidak menambah data baru**. Vendor WAVE yang belum ada di master tidak lagi dimasukkan ke daftar vendor, pencarian PBJ, maupun master (tombol *+ Master* dihapus); *Cek di WAVE* hanya referensi. WAVE melengkapi kolom kosong (alamat, NPWP, telepon, email, PIC, kota) vendor yang sudah ada & memberi peringatan Blacklist.
- Uji: `ui257.js` 14 cek (daftar vendor & master tambahan tidak bertambah); diuji juga dengan file WAVE asli.

### 1.8.5 / 2.5.6 — Data Vendor WAVE melengkapi Master Data vendor tanpa mengganti data lama (`server-modul-1.8.5.json`, `pembaruan-2.5.6.json`)
- Sumber: wave.waskita.co.id › Rekanan Waskita › Master Data › **EXPORT ALL DATA TO EXCEL** (.xls berisi tabel HTML: ID Vendor, BP Number, NPWP, status rekanan, bidang usaha, CQSMS, email, telepon, alamat, PIC, …).
- Server: Admin mengimpor file lewat Master Data › Vendor › *Impor file WAVE*; disimpan ke lapisan terpisah `WAVE_Vendor` (lintas proyek, per ID Vendor; impor ulang memperbarui snapshot, vendor lama tetap). Master Data baku & master tambahan **tidak diubah**. `wvImpor` (Admin), `wvInfo`, `wvDaftar` (ber-versi, di-cache klien).
- Aplikasi (panel *Data Vendor WAVE*): **Analisis kekurangan** (cocok via BP Number = kode SAP › NPWP › nama), kolom **kosong** dilengkapi — tabel Master Data (tampilan), profil vendor BA (alamat), pencarian vendor PBJ (alamat, email, telepon, NPWP); **Simpan pelengkap ke Master Tambahan** (Admin, hanya kolom kosong); vendor WAVE yang belum ada ikut di pencarian (sumber WAVE, Blacklist dikecualikan); **peringatan Blacklist**; *Cari di WAVE* + **+ Master** (CUST-WV-<ID Vendor>).
- Uji: `uji_wave.js` 12 cek & `ui256.js` 13 cek (contoh sintetis); dijalankan juga dengan file ekspor WAVE asli 6.276 baris (6.269 tersimpan, 7 baris tanpa nama vendor dilewati; impor lewat aplikasi ±4,5 dtk) — file asli tidak disimpan di repo.

### 1.8.4 / 2.5.5 — KANTOR AI: Manajer, Staf Administrasi & Petugas Input yang bekerja tanpa diminta (`server-modul-1.8.4.json`, `pembaruan-2.5.5.json`)
- Dibangun di atas versi yang dipakai pengguna (`pembaruan-2.5.3.json`, `server-modul-1.8.2.json` — identik dengan repo) dan memuat semua perbaikan sesudahnya: 1.8.3 (Claude tanpa temperature, validasi key) & 2.5.4 (Jumlah terusan Kartu Gudang kumulatif).
- **Manajer AI**: instruksi kerja harian per fungsi (Pengadaan/Keuangan/Gudang/Admin) dengan tenggat; eskalasi saran/tugas yang belum selesai ≥ 3 hari (prioritas tinggi); tren metrik dibanding laporan sebelumnya.
- **Staf Administrasi AI**: draf surat permintaan perbaikan dokumen ke vendor, pengingat dokumen, memo — tab *Draf Surat* (sunting, Salin, Cetak); templat cadangan bila AI tidak tersedia. Tidak ada yang dikirim otomatis ke vendor.
- **Petugas Input AI** (tanpa biaya AI): antrean data yang harus diinput — register kontrak kurang, kategori checklist, dokumen checklist kurang, bundel yang belum dipotong, penerimaan bon > 14 hari, stok minus, dokumen vendor ≤ 14 hari; *Tandai selesai / Abaikan*.
- **Mode terus-menerus** (Setelan Admin): bekerja tiap 1–4 jam pada jam kerja lewat satu pemicu per jam (notifikasi tetap pada jamnya); putaran tanpa perubahan data dilewati tanpa biaya AI & tanpa laporan ganda. **Pemberitahuan**: laporan baru muncul otomatis saat aplikasi dibuka & tiap 10 menit; jumlah tugas tampil sebagai lencana di menu akun.
- Uji: `uji_kantor.js` 18 cek, `ui255.js` 20 cek; regresi server (uji_tim, uji_kunci, uji_vt, uji_bundel, uji_judul, uji150, rollback, kartu terusan) & UI lulus.

### 2.5.4 — Kartu Gudang: Jumlah terusan kumulatif sejak awal proyek (`pembaruan-2.5.4.json`, modul server tetap 1.8.3)
- Sebelumnya Jumlah terusan GR/GI dihitung mulai 0 pada tanggal "Dari" setiap periode 25–25, sehingga di periode berikutnya tampil 0 (mis. Beton Readymix Fc-10 14 M3). Kini terusan dibawa dari seluruh transaksi sebelum periode; Sisa = terusan masuk − terusan keluar (= saldo awal + mutasi periode). Berlaku di layar, cetak & Excel.
- Uji: `uji/uji_kartu_terusan.js` 6 cek pada fungsi asli paket (versi 2.5.3 gagal pada cek yang sama).
- Demo: Kartu Gudang demo kini memakai fungsi `dataKartu` ASLI dari paket (sebelumnya salinan tiruan yang tertinggal sehingga demo masih menampilkan terusan 0); teks versi demo diambil otomatis dari paket. Uji `uji/cek_demo_kartu.js` 4 cek.

### 1.8.3 — Claude HTTP 400 "temperature is deprecated" & validasi key (`server-modul-1.8.3.json`, aplikasi tetap 2.5.3)
- Model Claude terbaru menolak parameter `temperature` → Claude kini dipanggil tanpa temperature; penyedia lain yang menolak parameter sampling dikirim ulang otomatis tanpa parameter itu.
- Key Anthropic berawalan selain `sk-ant-api03-` (mis. `sk-ant-usr-`, `sk-ant-oat-`, `sk-ant-admin-`) ditolak saat disimpan — itu bukan API key Messages API. Diagnosa menandai key yang tersimpan berupa URL / berformat tak lazim.
- Uji: `uji_kunci.js` 16 cek; data uji memakai format `sk-ant-api03-`; regresi lulus.

### 1.8.2 / 2.5.3 — "API key ditolak (HTTP 401)" diselesaikan dari akarnya (`server-modul-1.8.2.json`, `pembaruan-2.5.3.json`)
- Penyebab: Anthropic menolak **key yang tersimpan di server** (salah salin, key sudah dihapus/dinonaktifkan di konsol, atau ada karakter tak terlihat). Pembaruan aplikasi tidak pernah mengganti key, sehingga galat yang sama muncul setiap kali.
- Server: spasi/enter/karakter tak terlihat (zero-width, NBSP) dibuang saat key disimpan & dipakai; bila tersimpan dua key berbeda (nama baru `AI_KEY_ANTHROPIC` & lama `AI_KEY_CLAUDE`), saat 401 key lainnya dicoba otomatis lalu dipakai permanen; pesan galat menyebut sidik key (mis. `sk-ant-api03-…AbCd`) untuk dicocokkan dengan konsol; aksi `aiDiagKunci` menguji langsung setiap penyedia (GET daftar model, tanpa biaya token), tercatat di Log.
- Aplikasi: saat 401, Admin otomatis mendapat dialog **Diagnosa & ganti API key** (hasil uji per penyedia, sidik key, kolom tempel key Anthropic/Gemini baru, *Simpan & uji ulang*); tombol *Diagnosa API key* di tab Bundel PDF. Setelah DITERIMA, unggah file yang sama lagi — bagian yang sudah selesai tidak diulang.
- Uji: `uji_kunci.js` 12 cek, `ui253.js` 7 cek; regresi lulus.

### 1.8.1 — Pemisahan & pemetaan bundel menurut judul (`server-modul-1.8.1.json`, aplikasi tetap 2.5.2)
- AI menyalin **judul tercetak** tiap dokumen di bundel; batas dokumen = judul baru (halaman tanpa judul = lanjutan). Judul yang jelas mengoreksi jenis: "JURNAL HUTANG SUPPLIER" → Jurnal, "KWITANSI", "INVOICE", "FAKTUR PAJAK", "SURAT JALAN", "SPKTV", "JAMINAN …"; BAP/BAPM/BAPA/BAPP/BAST menurut judul bila AI ragu.
- **Dokumen pendukung kini ikut dipetakan & dipotong otomatis**: judul dicocokkan dengan nama baris checklist kategori tagihan (KTP, NPWP, SIUP, SBUJK, Timesheet, Rekap Timesheet, Laporan Cuaca, Dokumentasi, Surat Pernyataan, Bank Garansi, SILO/KIR/STNK, …) dengan sinonim (Kartu Tanda Penduduk → KTP, Nomor Pokok Wajib Pajak → NPWP, Time Sheet → Timesheet). Semua kata salah satu varian nama baris harus ada di judul — judul tanpa baris yang cocok tidak dipaksakan dan dilaporkan.
- Uji: `uji_judul.js` 9 cek; regresi server & UI lulus.

### 2.5.2 — Tanda tangan Kartu Gudang selebar kertas (`pembaruan-2.5.2.json`, modul server tetap 1.8.0)
- Cetak Kartu Gudang (LOGINV-09): *Mengetahui, Kasi DanLoglat* di sisi kiri dan *kota, tanggal · Diisi oleh, Petugas Gudang* di sisi kanan (sebelumnya keduanya berdampingan di kanan). Cetakan lain tidak berubah. Uji render: `uji/cetak_kartu_ttd.js`.

### 2.5.1 — Potong otomatis bundel ke checklist (`pembaruan-2.5.1.json`, modul server tetap 1.8.0)
- Setelah bundel diunggah, setiap dokumen yang dipetakan AI (SPKTV, Jurnal, Kwitansi, Invoice, Faktur Pajak, BAP, BAPM/BAPA/BAPP, Surat Jalan, jaminan, BAST) **dipotong per halaman** (pdf-lib, tanpa kompres) menjadi PDF sendiri — nama `Kwitansi - <No. BK> (hal. 3).pdf` — diunggah ke Drive dan langsung mengisi baris unggahan manual checklist (status Ada, tanggal dokumen, keterangan "Dipotong otomatis dari bundel hal. …"), checklist disimpan lewat kernel, lalu verifikasi berjalan. Tanpa biaya AI tambahan (potongan tidak dibaca ulang).
- Dokumen lintas bagian bundel digabung dari beberapa bagian; potongan > 9,5 MB tetap menunjuk bagian bundel. Tombol tab Bundel: *Potong & isi checklist dari bundel* (ulang/pilih item).
- Uji: `ui251.js` 23 cek (7 baris terisi potongan berbeda, Kwitansi tepat hal. 3, tanpa panggilan AI tambahan, Tim AI regresi).

### 1.8.0 / 2.5.0 — Bundel sumber utama, anti-502, Tim AI Proyek (`server-modul-1.8.0.json`, `pembaruan-2.5.0.json`)
- **Bundel = sumber utama verifikasi**: setelah bundel diunggah, verifikasi langsung berjalan dari bundel (semua bagian) tanpa harus *Terapkan*; PDF per item di Checklist hanya dipakai untuk jenis dokumen yang tidak ada di bundel (tidak ganda). Bundel baru → hasil lama otomatis kedaluwarsa (gerbang menuntut verifikasi ulang). Tab Bundel: tombol **Verifikasi dengan bundel**; *Terapkan* menjadi opsional ("Lengkapi checklist dari bundel").
- **502 Bad Gateway / 504**: penyebabnya gateway penyedia AI yang kehabisan waktu saat membaca PDF besar. Bundel kini dipecah kecil (≤ 4,5 MB / ≤ 12 halaman per bagian, s.d. 24 bagian), tiap bagian & dokumen **dicoba ulang otomatis 2×** (jeda 8 & 20 detik) sebelum menyerah, server tetap beralih ke penyedia cadangan; pesan galat tidak lagi menyebut "endpoint/model salah" untuk 5xx.
- **Tim AI Proyek** (menu akun › *Tim AI Proyek*, Ctrl+K "tim ai"): Verifikator Tagihan, Analis Kontrak & Pengadaan, Analis Keuangan, Analis Gudang, Penyusun Laporan. Bekerja otomatis pada jam terjadwal (pemicu harian yang sama dengan Notifikasi, maks. 6 jam/hari gabungan) atau *Jalankan sekarang*: memverifikasi tagihan lengkap/berbundel (jatah PDF & tagihan per putaran, berhenti & melapor bila API key/kuota bermasalah), menganalisis kontrak/keuangan/gudang, menyusun laporan + temuan + saran prioritas (PJ & tenggat) → *Jalankan* (aksi baca → hasil; aksi tulis → usulan + Terapkan), *Buka tagihan*, *Tandai selesai*, *Abaikan* (tidak diusulkan lagi). Laporan terjadwal dikirim ke penerima email/Telegram Notifikasi. Identitas kerja "TIM AI" dengan kuota AI terpisah; semua tercatat di Log; AI tidak mengubah data tanpa persetujuan manusia.
- Uji: `uji_tim.js` 36 cek (bundel utama, 502, Tim AI manual/jadwal/email, saran, galat API key), `ui250.js` 21 cek (bundel 27,5 MB → 11 bagian ≤ 4,5 MB, 502 dicoba ulang otomatis, verifikasi tanpa Terapkan, dialog Tim AI & tampilan ponsel); regresi `uji_vt` 36, `uji_bundel` 40, `uji150` 72, rollback, UI 2.2.8–2.4.4 lulus.

### 1.7.2 / 2.4.4 — Bundel lebih cepat, akses Staf, galat API key (`server-modul-1.7.2.json`, `pembaruan-2.4.4.json`)
- Lebih cepat: bagian bundel diunggah & dibaca AI 2 sekaligus; verifikasi hanya membaca dokumen yang dipakai aturan (SPKTV, Jurnal, Kwitansi, Invoice, Faktur, BAP, BAPM/BAPA/BAPP, surat jalan, jaminan, BAST) — KTP/NPWP/SBUJK/SIUP/foto dll. dilewati.
- Lanjut otomatis: bila gagal di tengah, unggah file yang sama lagi — bagian yang sudah terunggah/terbaca tidak diulang.
- Akses: Staf Pengadaan boleh unggah bundel & menjalankan pembacaan tanpa masuk daftar peran Asisten AI; Verifikasi Admin & persetujuan bayar tetap Admin; peran Lihat tetap hanya membaca.
- API key ditolak (401/403): semua penyedia pembaca PDF lain dicoba; pesan menunjuk menu Setelan yang perlu diperbaiki.
- Uji: `uji_bundel.js` 40 cek, `ui244.js` 13 cek (gagal di tengah → lanjut tanpa unggah ulang), regresi lulus.

### 2.4.3 — Kartu Gudang 25–25 utuh (`pembaruan-2.4.3.json`, modul server tetap 1.7.1)
- Setiap tanggal periode 25 bulan lalu s.d. 25 bulan berjalan tetap tampil di layar & cetakan ("Semua hari" aktif bawaan, pilihan pengguna dihormati); hari tanpa transaksi berisi 0, jumlah terusan & sisa tetap berjalan. Uji `uji/ui243.js` 8 cek.

### 1.7.1 / 2.4.2 — Bundel di atas 10 MB (`server-modul-1.7.2.json`, `pembaruan-2.4.2.json`)
- Masalah: bundel scan ±30 MB ditolak "Lampiran wajib PDF yang sah dan maksimal 10 MB" (batas lampiran kernel `BATAS_PDF`, berlaku juga saat checklist disimpan).
- Solusi tanpa mengubah kernel: aplikasi memecah bundel s.d. **60 MB** per halaman dengan pdf-lib (tanpa kompres — kualitas scan untuk AI tetap) menjadi bagian ≤ 9,5 MB, mengunggah tiap bagian, lalu modul membaca **satu bagian per panggilan** (`vtBundel {berkas:[…], bacaSaja}`; aman dari batas waktu Apps Script) dan menyatukan peta dengan nomor halaman bundel. Dokumen yang terpotong di batas bagian digabung.
- Item checklist menunjuk bagian yang memuat dokumennya ("Bundel hal. 7–8 (bagian 3/4)"); pratinjau berpindah bagian otomatis; verifikasi memeriksa seluruh bagian termasuk yang tidak dipetakan.
- Uji: `uji_bundel.js` 33 cek, `ui242.js` 9 cek dengan PDF 27,5 MB nyata (4 bagian 7,5/7,5/7,5/5,0 MB).

### 2.4.1 — Tombol Unggah Bundel & Kartu Gudang 25–25 (`pembaruan-2.4.1.json`, tanpa perubahan modul server)
- Header modal Checklist: tombol hijau **Unggah Bundel Tagihan** tepat sebelum *Preview & Cetak PDF* → `mp240Unggah` (2.4.0); dicek checklist terbuka, Modul 1.7.0, peran Pengadaan/Admin, tidak ada perubahan belum disimpan. Layar < 768 px: label "Bundel".
- Kartu Gudang (LOGINV-09): periode bawaan 25 bulan lalu – 25 bulan berjalan (pilihan pengguna tidak ditimpa; `mp241Tanggal25Prev/Now`), penanda **📦 Migrasi** di kolom Keterangan, cetak A4 portrait + kotak *Ringkasan (Migrasi)*. Ctrl+K: bundel / unggah tagihan / kartu gudang / 25.
- Uji: `uji/ui241.js` 18 cek; kernel menerima 2.4.1 di atas 2.4.0.

### 1.7.0 / 2.4.0 — Bundel PDF, pratinjau dua panel & gerbang bayar
- **Upload 1 PDF bundel**: checklist › tab *Verifikasi AI* › *Bundel PDF & Pratinjau* — satu dropzone (seret/klik, maks. 30 MB, > 10 MB dikompres otomatis) untuk scan utuh seluruh dokumen tagihan. Disimpan ke Drive lewat `unggahBerkas` kernel (validasi PDF & folder proyek tetap).
- **AI Document Splitter** (`vtBundel`, modul): satu panggilan AI membaca bundel, memisahkan per dokumen dengan `halamanMulai/halamanAkhir`, mengklasifikasi (Kwitansi, Invoice, Faktur Pajak, Surat Jalan, BAP, BAPM/BAPA/BAPP/BAST, SPKTV, Jurnal, jaminan, dll.) dan mengekstrak nomor, tanggal, harga jual/DPP/PPN/total, nomor seri faktur, rekening, meterai, tanda tangan. Hasil di-cache (sheet `_VerifikasiEkstrak`, hasil besar dipecah kolom *Bagian*) dan dicatat di `_VerifikasiBundel` + Log `AI-AKSI PISAH BUNDEL`.
- **Pratinjau dua panel**: kiri PDF (melompat ke halaman saat baris/dokumen/temuan diklik); kanan peta dokumen, usulan pemetaan ke item checklist (centang), kelengkapan 6 dokumen wajib per kategori, rekonsiliasi nilai (acuan Invoice), uji PPN 12% × DPP 11/12 atau 11%, nomor seri faktur 16/17 digit, rekening, meterai & tanda tangan. *Terapkan ke checklist & verifikasi* menyimpan lewat `checklistSimpan` kernel (item → PDF bundel + keterangan "Bundel hal. x–y") lalu menjalankan `vtNilai` tanpa biaya AI tambahan. *Lembar rekonsiliasi* A4. *Preview & Cetak* checklist bawaan otomatis memuat halaman bundel di kolom Keterangan.
- **Audit Gatekeeper**: gerbang **Kunci** (bawaan baru) — temuan Kritis/Mayor menolak `checklistVerifikasi` tanpa pengecualian **dan** `keuanganProgres` ke DIAJUKAN/DIVERIFIKASI/DIBAYAR (modul menimpa lalu mengembalikan ke logika kernel bila lolos). Tombol *Verifikasi Admin* terkunci di klien, banner di laporan, lencana *bayar terkunci* di daftar. Mode Wajib/Peringatan tetap tersedia.
- Bundel yang dipakai banyak item dibaca & dihitung sekali (tanpa temuan ganda). Arsitektur data lama tidak berubah: item checklist tetap `{status, file, tgl, ket}`.

### 1.6.0 / 2.3.0 — Verifikasi Tagihan (AI Auditor) di menu Keuangan & Bayar
- **Prinsip**: AI hanya *membaca* PDF checklist menjadi data terstruktur; keputusan **LOLOS / BUTUH REVISI** diambil **mesin aturan server yang deterministik** (dapat diaudit, hasil sama untuk data sama). Keputusan Siap Bayar tetap melalui Verifikasi Admin + pemeriksaan dokumen Asli.
- **Pemeriksaan**: 6 dokumen wajib (Kwitansi, Invoice, Faktur Pajak, Surat Jalan, BAP, BAPM) dengan pengganti sah (BAPA/BAST alat untuk sewa alat; BAPP/BAST untuk subkon; jaminan uang muka untuk uang muka); Invoice = Kwitansi = BAP; PPN Invoice = Faktur; DPP 11/12 × harga jual & PPN 12% (atau skema lama 11%); terbilang; meterai kwitansi > Rp5 jt; tanda tangan kedua pihak; nomor seri faktur 16/17 digit, NPWP & nama pembeli; rekening antar-dokumen & SPKTV; rujukan nomor/tanggal kontrak & BAP; rincian barang vs surat jalan (substitusi merek, item tidak ditagih, SJ tanpa nomor/tanda tangan); jaminan uang muka; hitungan SPKTV. Tingkat **Kritis / Mayor / Minor / Catatan**.
- **Menu Keuangan & Bayar**: tab baru **Verifikasi Dokumen** (KPI belum/lolos/butuh revisi/kedaluwarsa, tabel temuan utama, *Verifikasi semua yang lengkap*); lencana hasil + tombol *Verifikasi* di Daftar Tagihan; tab **Verifikasi AI** di modal Checklist (progres baca per dokumen, laporan 3 bagian, rekap nilai & rekening, riwayat).
- **Keluaran**: **BA Hasil Verifikasi Dokumen Tagihan** (A4, tanda tangan Staf/Kasi/Kapro), **Surat Permintaan Perbaikan Dokumen** ke vendor (batas 3 hari kerja, klausul pembayaran setelah verifikasi ulang), unduh `.md`, salin, *Klarifikasi vendor (AI)* lewat Asisten AI.
- **Kendali**: gerbang Verifikasi Admin *Peringatan* (dicatat) atau *Wajib* (alasan pengecualian ≥ 20 karakter, tercatat `VERIFIKASI ADMIN DENGAN CATATAN AI`); verifikasi otomatis saat checklist menjadi lengkap; Setelan Admin (penyedia pembaca PDF, NPWP/nama pembeli, batas meterai, toleransi).
- **Biaya & jejak**: hasil baca di-cache per versi berkas (`<ID>_VerifikasiEkstrak`) — verifikasi ulang hanya membaca PDF yang diganti; laporan berversi di `<ID>_VerifikasiTagihan`; hasil **kedaluwarsa** otomatis bila PDF/status checklist berubah; Log `AI-AKSI BACA DOKUMEN` & `VERIFIKASI TAGIHAN`.
- Penyedia: Anthropic, Google, OpenAI, OpenRouter (yang dapat membaca PDF); DeepSeek/Groq ditolak untuk fitur ini. Perintah Cepat Asisten AI ke-5: *Ringkasan verifikasi tagihan & prioritas revisi*.
- Uji dengan 3 berkas tagihan nyata: SPM → B01 rekening BRI beda (Kritis), bank SPKTV "Mandiri" (Mayor), nomor faktur di Jurnal, uraian faktur, 5 SJ tanpa nomor; SPSA → rekening SPKTV 11889088986 (Kritis), GPS Hi-Target di SJ vs GPS efix ditagih (Mayor), DPP +Rp2 (Minor); SPPP uang muka → dua nomor seri faktur (Kritis), jaminan uang muka berakhir, rujukan BAPP, "001134" di jurnal, tanggal kontrak 21 Juli di jaminan.

### 1.5.2 / 2.2.10 — validasi API key & hasil uji berpanduan
- API key divalidasi saat disimpan: **URL ditolak**, key milik penyedia lain (kolom tertukar) ditolak, awalan `Bearer ` / tanda kutip dibuang, format tak lazim → peringatan.
- Key tersimpan yang mencurigakan ditandai merah di setelan, lengkap dengan alamat konsol key.
- Galat berpanduan: 401 → buat/salin ulang key di konsol; 402 → isi saldo (alamat billing); 403 → akses model/wilayah; 503 → server penyedia penuh, coba lagi / pilih model lain. 402 ikut dialihkan ke cadangan.
- *Simpan & uji* menampilkan daftar per penyedia (✓/✗, kode HTTP, sebab, rincian) + tombol **Nonaktifkan penyedia yang gagal**.

### 1.5.1 / 2.2.9 — perbaikan dari uji lapangan
- Dropdown penyedia kini selalu sama dengan penyedia yang dikirim (sebelumnya bisa tampil *Anthropic Claude* tetapi permintaan terkirim ke *Gemini*).
- Galat HTTP 404 tidak lagi menampilkan halaman HTML mentah; pesan menyebut nama model yang dicari.
- Base URL dirapikan otomatis (Google `…/v1beta/models/<model>:generateContent`, Anthropic `…/v1/messages`, OpenAI-compatible `…/chat/completions`).
- 429/5xx (mis. Gemini "high demand") → coba ulang otomatis 1×, lalu dialihkan ke penyedia aktif lain (maks. 2); jawaban diberi catatan "X gagal, dijawab Y".
- Pesan galat punya tombol **Coba lagi** dan **Coba dengan <penyedia lain>**.
- Analisis gagal → jeda 60 detik dibatalkan; jeda tampil sebagai hitung mundur di Perintah Cepat, bukan galat merah.
- Perintah Cepat 2 kolom tanpa scroll horizontal.

### 1.5.0 / 2.2.8
- **Kontras panel (CSS `/* MP227 — Asisten AI */`)** — akar masalah: `--f-kartu`/`--f-garis` tidak pernah didefinisikan, sehingga di tema gelap panel tetap putih dengan teks terang warisan. Sekarang token didefinisikan di `.mp227-ai` (terang & gelap), latar solid, isi `#0B1F3A` di `#F4F6FA` (16,5:1), tanpa `filter`/`opacity`/`mix-blend-mode`/`backdrop-filter`, `text-shadow: none`.
- **Agen** — `aiTanya` (`agen:true`) memakai protokol JSON `{aksi, arg, alasan}`. 8 aksi baca dijalankan otomatis (maks. 3/pertanyaan) lewat `proses_` dengan kredensial pengguna. 4 aksi tulis (`savePBJ`, `keuanganProgres`, `gudangTerimaBon`, `simpanMasterTambahan`) → dry-run + usulan bertoken (30 menit) → `aiTerapkan` (Pengadaan/Admin; Master khusus Admin). Semua tercatat `AI-AKSI` di sheet Log.
- **Multi-penyedia** — `anthropic`, `google` (adapter khusus), `openai`, `deepseek`, `groq`, `openrouter` + penyedia tambahan OpenAI-compatible; key `AI_KEY_<PENYEDIA>`; Base URL & model bebas; dropdown `<select>` di panel.
- **Perintah Cepat** — `mode:'analisis'` → `{ringkasan, temuan[], saran[{aksi,arg,dampak}]}`; data dihitung server; kartu saran *Jalankan* / *Tandai selesai*; batas 1×/60 detik (`AI_AN_<hari>_<user>`); *Ekspor ringkasan* (.md).
- **Kompatibel** — `aiInfo` tetap mengirim `siap.claude`/`siap.gemini`; form setelan 2.2.7 tetap diterima; field `AI_SET` lama & `AI_KEY_CLAUDE`/`AI_KEY_GEMINI` tetap ditulis. Aplikasi 2.2.8 tetap berjalan dengan modul 1.4.0 (chat biasa).

## Cara uji
1. **Modul server** — Diagnostik sistem › Modul server › Unggah `server-modul-1.7.2.json` → Uji (baca saja) → Terbitkan (`LULUS UJI`). Cek `ping`: fitur berisi `verifikasiTagihan`, `asistenAgen`, `aiMultiProvider`, `aiAnalisis`.
2. **Pembaruan** — Pengguna & Proyek › Pembaruan › Unggah `pembaruan-2.4.0.json` → pratinjau Admin (hasil verifikasi dapat dibaca; pembacaan PDF/penilaian sengaja diblokir saat pratinjau) → Terbitkan.
3. **Verifikasi Tagihan** — pastikan API key Anthropic/Google/OpenAI/OpenRouter aktif (menu akun › Asisten AI › ⚙️) dan kuota harian cukup (1 kuota per PDF baru). Keuangan & Bayar › **Verifikasi Dokumen** › *Setelan* (Admin) → pilih penyedia & gerbang → *Verifikasi semua yang lengkap* atau tombol *Verifikasi* per tagihan → buka *Laporan* → cetak BA / Surat Permintaan Perbaikan. Ganti satu PDF di checklist → hasil menjadi *Kedaluwarsa* → *Verifikasi ulang* (hanya PDF itu dibaca ulang). Cek sheet `<ID>_VerifikasiTagihan`, `<ID>_VerifikasiEkstrak`, dan Log.
4. **Asisten AI** — tanya "Berapa kontrak di register?"; Perintah Cepat (5 tombol); Ekspor ringkasan (.md).

Uji otomatis (Node 18+, Playwright untuk UI) memakai Code.gs asli + tiruan layanan Google:
```
export KODE_GS=…/Code_2.5.1_Monitoring_Pengadaan.gs MODUL_140=…/server-modul-1.4.0.json
node uji/cek_paket.js && node uji/uji150.js && node uji/uji_rollback.js && node uji/uji_vt.js && node uji/uji_bundel.js && node uji/ui228.js && node uji/ui230.js && node uji/ui240.js
export HTML_DASAR=…/index.html   # HTML dasar aplikasi, untuk uji di aplikasi asli
node uji/ui268.js               # 2.6.8 Bon Bahan · Alat · Sub
node uji/ui269.js               # 2.6.9 notifikasi kontrak hanya BK < 100%
node uji/ui2610.js              # 2.6.10 nilai kontrak Rp 0 → jumlah harga item, Periksa kontrak
node uji/uji_demo.js            # demo 2.6.9 vs 2.6.10 dengan koreksi 027/028: hanya kontrak yang diperbaiki berubah
node uji/ui2611.js              # 2.6.11 PO SAP kontrak di semua menu
python3 -I demo/rakit_demo_app.py $HTML_DASAR $KODE_GS pembaruan-2.6.10.json demo-2.6.10.html   # demo lengkap (jangan di-commit)
```
Hasil terakhir: paket 2.4.0 diterima kernel · **24 cek bundel & gerbang bayar** · **17 cek UI bundel** (unggah, pisah, lompat halaman, rekonsiliasi, terapkan, kunci) · 72 cek server Asisten AI · rollback 5 cek · **36 cek Verifikasi Tagihan** (3 paket nyata) · 26 cek UI Asisten AI · **19 cek UI Keuangan & Bayar** (termasuk gerbang, cetak, ponsel 390 px, tema gelap) · patch menghasilkan paket identik. Demo dirakit dengan `demo/vt-snapshot.js` + `demo/rakit_demo_vt.py`.

## Rollback
- **Modul server**: Diagnostik sistem › Modul server › **Rollback** (ketik `KEMBALIKAN`) → aktif kembali versi sebelumnya (1.6.0 / 1.5.2). Dari 1.7.0 ke 1.6.0: gerbang bayar lepas, sheet `_VerifikasiBundel` dibiarkan, item checklist yang menunjuk PDF bundel tetap sah. Gerbang Verifikasi Admin otomatis kembali ke logika kernel asli; sheet `_VerifikasiTagihan`/`_VerifikasiEkstrak` dibiarkan (tidak dibaca 1.5.x). *Mengunggah ulang* versi lama **ditolak kernel** (versi harus lebih baru), jadi pakai tombol Rollback. Darurat: jalankan `nonaktifkanModul()` dari editor Apps Script.
- **Aplikasi**: Pengguna & Proyek › Pembaruan › Rollback ke versi sebelumnya (2.3.0 / 2.2.10). Aplikasi 2.3.0 dengan modul < 1.6.0 menyembunyikan tab Verifikasi Dokumen (fitur `verifikasiTagihan` tidak ada).
- Data tagihan, checklist, dan pembayaran tidak diubah oleh fitur ini maupun rollback.
