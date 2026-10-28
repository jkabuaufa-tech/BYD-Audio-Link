# JICT Integrated Procurement, Billing & SAP — Paket Tagihan

Komponen ini mengintegrasikan **Monitoring SAP** (Aplikasi A) dan **Dokumen Kontrak & Tagihan Assistant / Billing Generator** (Aplikasi B).

| Keluaran | Versi | Lokasi | Dipasang lewat |
|---|---|---|---|
| Modul server Paket Tagihan | **1.10.0** (kumulatif dari 1.9.6) | `asisten-ai-agen/server-modul-1.10.0.json` | Monitoring SAP › Diagnostik sistem › Modul server |
| Pembaruan aplikasi Monitoring SAP | **2.7.0** (kumulatif dari 2.6.24) | `asisten-ai-agen/pembaruan-2.7.0.json` | Pengguna & Proyek › Pembaruan (kandidat Admin → terbit) |
| Billing Generator terhubung | **2.0.0** | `billing-generator/` | salin folder, buka `index.html` |
| Sumber bersama | mesin 1.0.0 | `tagihan/sumber/` | dirakit `python3 -I tagihan/alat/rakit.py semua` |

Kernel `Code.gs` **tidak diubah** (tetap 2.5.1, kernel 2.5). Tidak ada deployment ulang Apps Script dan tidak ada izin Google baru.

---

## 1. Tahap 1 — Audit teknis

### 1.1 Berkas yang diterima & yang tidak
| Berkas rujukan | Status | Dampak & penanganan |
|---|---|---|
| `index.html` (HTML dasar dengan pemuat pembaruan) | diterima | dipakai untuk seluruh uji UI aplikasi asli |
| `Monitoring_SAP.html` | diterima | **tidak memiliki pemuat pembaruan** (tidak ada `JICT_PEMBARUAN` / `PEMB`). Paket JSON 2.6.24 & 2.7.0 hanya berjalan pada `index.html`. Pastikan staf memakai `index.html`. |
| `pembaruan-2.6.24.json`, `server-modul-1.9.2.json` | diterima | identik dengan berkas di repo |
| `Code.gs` | **tidak dilampirkan** | kernel asli 2.5.1 diambil dari `demo/demo-verifikasi-tagihan.html` (dirakit dari kernel asli) dan dipakai di seluruh uji |
| URL Google Apps Script | **tidak dilampirkan** | deployment aktif tidak dapat diaudit dari sini. Cek sendiri: `…/exec?action=ping` harus berisi `"versiServer":"2.5.1","kernel":"2.5"` dan `modul.versi` |
| PDF `5100012506_CV MIRSEL.pdf`, `PT. SURYA SALIM SEJAHTERA - 1900031188.pdf` | **tidak dilampirkan** | format BAPP/BAP mengikuti cetak BA baku yang sudah dipakai aplikasi (kop KSO, tabel realisasi 10 kolom, perhitungan pembayaran, 3 kolom TTD). Rekonsiliasi angka diuji dengan **3 berkas tagihan nyata** yang transkripsinya sudah ada di repo (`asisten-ai-agen/uji/vt_data.js`). Lihat §6. |
| `Form Checklist ALAT/BAHAN/SUBKON.docx` | **tidak dilampirkan** | baris checklist diambil dari `CL217_TEMPLATES` kernel (13 baris umum + 12/12/13 baris kategori), yang sudah dipakai Checklist Tagihan |
| `index(1).html`, `app.js`, `styles.css`, `README.md` (Aplikasi B 1.2.0) | diterima | menjadi dasar Billing Generator 2.0.0 |

### 1.2 Kompatibilitas versi
| Komponen | Di repo | Dilampirkan | Catatan |
|---|---|---|---|
| Kernel `Code.gs` | 2.5.1 (kernel 2.5) | — | menerima modul `untukKernel: "2.5"` dengan versi lebih tinggi dari modul aktif |
| Modul server | 1.9.6 | **1.9.2** | Paket 2.6.24 memeriksa 23 fitur server. Empat tidak ada di 1.9.2: `vtManual` (mode manual, 1.9.5), `pemantauan` (Kesehatan & Backup, 1.9.4), `bundelPetaTeks` & `bundelPenyediaLain` (bundel, 1.9.3). Bila 1.9.2 yang aktif, fitur itu mati diam-diam. |
| Pembaruan aplikasi | 2.6.24 | 2.6.24 | catatan rilis: pasangan modul 1.9.6 |

**Rekomendasi:** unggah `server-modul-1.10.0.json` langsung (kumulatif, berisi seluruh 1.9.3–1.9.6). Kernel hanya mensyaratkan versi lebih tinggi dari yang aktif, jadi 1.9.2 → 1.10.0 diterima. Uji kompatibilitas: `uji/cek_paket.js`.

### 1.3 Peta data & endpoint aktual (yang dipakai integrasi)
| Data | Penyimpanan | Kunci | Dipakai sebagai |
|---|---|---|---|
| Proyek | sheet `Proyek` | `id` (mis. 1726012) | **projectId** |
| Kontrak Register | `<P>_Register` | `noKontrak` (+ `id` baris) | **contractId** = no kontrak |
| Kontrak Master (Excel) | tertanam di HTML (`MASTER_KONTRAK`) + koreksi `<P>_Koreksi` | `kontrakInduk` | contractId; item dikirim dari aplikasi, asal ditandai `MASTER` |
| Item kontrak | Register `items[]` / Master baris | `kodeUnik` atau `<noKontrak>#<idx>` (`idItem()`) | **itemId** — kunci yang sama dengan volume BK |
| Vendor | Master Vendor + master tambahan + WAVE | `idVendor` | **vendorId** |
| Progres/BK | `<P>_Progres` | `id` | **progressId**; volume per itemId, `tagihanKe`, `nomorBA`, `bayar.status` |
| Checklist | `<P>_ChecklistTagihan` | id progres | kelengkapan & verifikasi Admin (tetap kernel) |
| Penerimaan gudang | `<P>_GudangMasuk` | `id` GR | surat jalan untuk Bahan |
| **Paket tagihan (baru)** | `<P>_PaketTagihan` | `BL…` | **billingId** |
| **Dokumen paket (baru)** | di dalam paket | `DOC…` | **documentId** (berkas di Drive, SHA-256 di `<P>_ManifestBerkas`) |
| **Jejak versi (baru)** | `<P>_PaketTagihanVersi` | (paket, versi) | sebelum → sesudah, alasan |
| **Konfigurasi tagihan (baru)** | `<P>_KonfigTagihan` | no kontrak | kategori, UM, retensi, PPN, PPh, sewa |

Hubungan Bon ↔ PO many-to-many (2.6.23/2.6.24) tidak diubah. Paket hanya **membaca** BK & Register.

### 1.4 Risiko yang ditemukan & penanganannya
| Risiko | Penanganan |
|---|---|
| Item kontrak Master hanya ada di HTML, tidak di server | server menerima item dari aplikasi dengan asal `MASTER` dan sidik sumber. Volume selalu dihitung server dari BK resmi. Kontrak Register memakai item server (data perangkat diabaikan, dicatat `ITEM_REGISTER`). |
| Jawaban Google terputus setelah skrip berjalan | semua tulisan `bl*` memakai **kunci idempotensi**: kirim ulang dengan kunci sama mengembalikan hasil tersimpan, tidak membuat duplikat |
| Dua pengguna mengubah paket bersamaan | `versi` (optimistic concurrency) → `KONFLIK … Muat ulang` |
| Tagihan ganda | 1 BK = 1 paket aktif; 1 tagihan-ke per kontrak; 1 penerimaan gudang (surat jalan) hanya di 1 paket |
| Tarif PPN berubah (11%/12%, DPP nilai lain) | tidak ada tarif bawaan. Skema & tarif wajib diatur per kontrak; tanpa itu perhitungan bergalat `PPN_BELUM` dan PDF tidak dapat terbit |
| Pemalsuan dokumen | draf generator tanpa TTD/cap/meterai; invoice & kwitansi berlabel **DRAF PEMBANDING**; draf tidak dapat dipasang ke checklist; verifikasi tetap Admin |
| Modul baru bermasalah | rollback modul ke 1.9.6 → aplikasi lama tetap berjalan; data paket ada di sheet tersendiri (teruji) |
| Tema gelap aplikasi | dialog memaksa palet terang agar angka terbaca |

---

## 2. Matriks fungsi lama & baru
| Proses | Sebelum | Sesudah (2.7.0 / 1.10.0 / BG 2.0.0) |
|---|---|---|
| Bon → PBJ → Register → PR/RFQ/PO | Monitoring SAP | tidak berubah |
| Input Progres / BK, terbit BA | Monitoring SAP (preview BAPM/BAPP/BAPSA per kontrak) | tidak berubah; BK menjadi dasar paket tagihan |
| Hitung tagihan | manual / preview BA (UM & retensi % saja) | **mesin terpusat**: DPP kontraktual, UM proporsional + pelunasan, retensi, potongan lain, DPP nilai lain, PPN per kontrak, PPh, neto (PPN dipungut/tidak), pembulatan teraudit |
| Dokumen tagihan | BA tunggal, dokumen lain disusun di luar | paket per kategori: **Bahan** (BAPM, rekap penerimaan, rekap surat jalan, BAP, rekap bayar, draf invoice/kwitansi, checklist) · **Alat** (rekap timesheet, perhitungan sewa jam/hari/bulan & multi-unit, rekap penggunaan, BAPA/BAPSA, BAP, draf invoice/kwitansi, checklist) · **Subkon** (BAPP, rekap kuantitas & harga, BAP, rekap retensi & UM, draf invoice/kwitansi, checklist) |
| PDF | cetak browser | PDF vektor terpisah + **bundel ber-daftar isi**, diunggah bertahap (SHA-256) ke Drive proyek, tertaut ke paket |
| Checklist Tagihan | unggah manual per baris | + pasang dokumen bertanda tangan dari paket, saran "Tidak berlaku" kondisional (pengguna mengonfirmasi) |
| Verifikasi & bayar | Admin (checklist) + Keuangan & Bayar | **tetap**; paket membaca status Terverifikasi/Diajukan/Proses/Dibayar |
| Dashboard | Dashboard Tagihan (kontrak) | + **Dashboard Paket Tagihan**: 10 KPI, pipeline, aging, prioritas, dokumen bermasalah, aktivitas, ekspor Excel/PDF |
| Aplikasi B | lokal (IndexedDB), input ulang data | **mode terhubung**: login akun Monitoring SAP, paket dari server, PDF → Drive, unggah TTD, antrean offline; mode lokal lama tetap ada |
| AI | Asisten AI, Verifikasi Tagihan (mode manual) | validasi deterministik + draf surat permintaan perbaikan tanpa AI; "Minta saran Asisten AI" opsional (ringkasan angka saja, tanpa PDF, dengan konfirmasi) |

---

## 3. Arsitektur

```
 Monitoring SAP (index.html + pembaruan 2.7.0)             Billing Generator 2.0.0 (folder billing-generator)
   RINGKASAN (Master+Register+koreksi) · PROG · REG          terhubung.js ─ IndexedDB JICT_Priuk_Tagihan (salinan & antrean)
   └─ MP270: dialog paket, dashboard ─┐                      └─ lib/ (pustaka bersama yang sama)
                    tagihan/sumber: inti.js (BLI) · dokumen.js (BLD) · render-html (BLRH) · render-pdf (BLRP) · klien (BLK)
                                      │  POST teks /exec (sama dengan aplikasi), kunci idempotensi, versi
 Apps Script: kernel Code.gs 2.5.1 ── modul 1.10.0 (BL) ── hitung ulang BLI ── <P>_PaketTagihan / _Versi / _KonfigTagihan
                                      └─ membaca: <P>_Register, _Progres, _ChecklistTagihan, _GudangMasuk, ArsipVendor; Drive proyek
```

- **Satu sumber kebenaran:** paket tidak menyalin status verifikasi/bayar. Status efektif dihitung saat dibaca: `DIBAYAR`/`DIVERIFIKASI`/`DIAJUKAN` dari `bayar.status` BK, `TERVERIFIKASI` dari checklist kernel yang diverifikasi Admin.
- **Satu mesin hitung:** kode `inti.js` yang sama berjalan di server (otoritatif) dan di peramban (pratinjau). PDF hanya diterima bila sidik perhitungannya sama dengan paket di server.
- **Aditif:** sheet baru saja. Tidak ada kolom lama yang diubah atau dihapus.

### 3.1 API modul (aksi `bl*`)
| Aksi | Jenis | Peran | Isi |
|---|---|---|---|
| `blInfo` | baca | semua | versi mesin, status, dokumen per kategori, hak |
| `blDaftar` | baca | semua | daftar paket per halaman (`hal`, `per` ≤ 1000), saring kontrak/kategori/status/cari, status efektif & checklist |
| `blBaca` | baca | semua | paket lengkap + BK + checklist + template + saran syarat + riwayat versi |
| `blKonteks` | baca | semua | BK kontrak (+checklist, bayar, paket), Register, konfigurasi, penerimaan gudang, arsip vendor |
| `blKonfigBaca` / `blKonfigSimpan` | baca / tulis | Pengadaan; Admin bila sudah ada paket lanjut | konfigurasi per kontrak (versi + riwayat, alasan wajib saat ubah); `proyek:true` = bawaan proyek (Admin) |
| `blSimpan` | tulis | Pengadaan | buat/ubah paket; server menyusun ulang sumber, menghitung ulang, mengontrol ganda; perubahan perhitungan setelah PDF → revisi + alasan |
| `blStatus` | tulis | Pengadaan; Revisi = Admin | transisi status (lihat §5) |
| `blDokumen` | tulis | Pengadaan; status Terverifikasi/Perlu revisi = Admin | `TERBIT` (PDF generator, sidik wajib cocok), `UNGGAH_TTD`, `VENDOR` (+ angka untuk kontrol silang), `STATUS` |
| `blKeChecklist` | tulis | Pengadaan | pasang dokumen bertanda tangan/vendor ke baris checklist; terapkan "Tidak berlaku" (alasan ≥ 12) — lewat aturan checklist kernel/modul |
| `blUnggahMulai` / `Potong` / `Selesai` | tulis tanpa kunci global | Pengadaan | unggah ≤ 25 MB per ≤ 2,9 MB base64, SHA-256 & ukuran diverifikasi, idempoten; PDF untuk checklist ≤ 10 MB (aturan kernel) |

Mode uji modul (Admin penerbit) bersifat baca saja; unggah & tulis paket ditolak.

---

## 4. Mesin perhitungan (`inti.js`)
- Uang dihitung dengan **BigInt mikro-rupiah**: tidak ada galat pecahan biner (0,1 + 0,2 = 0,3 teruji). Volume 4 desimal, harga 2 desimal.
- `prestasi ini = Σ volume BK periode ini × harga`; `lalu` = kumulatif awal Excel + BK sebelumnya (urut periode & tagihan ke-); `s/d = lalu + ini`.
- **Uang muka**: tagihan UM = % × nilai kontrak (atau nilai). Pengembalian = prestasi ini × (UM ÷ nilai kontrak), dibatasi sisa UM, dan dilunasi di termin yang mencapai 100%.
- **Retensi** = % × prestasi ini. Tagihan pelepasan retensi ≤ retensi tertahan.
- **Nilai tagihan (sebelum PPN)** = prestasi ini − UM − retensi − potongan lain.
- **PPN** per kontrak: `NORMAL` (DPP = tagihan), `NILAI_LAIN` (DPP = tagihan × p/q, mis. 11/12; opsi **per baris barang** seperti e-Faktur), `TIDAK_DIPUNGUT`, `DIBEBASKAN` (+ dasar hukum). Tarif wajib diisi.
- **Ikuti Faktur Pajak** (opsi per kontrak, bawaan mati): bila DPP/PPN di Faktur Pajak vendor (diisi di tab Pembanding) berbeda dari hitungan **dalam toleransi** (bawaan Rp 10), DPP & PPN dokumen memakai angka faktur. Selisihnya dicatat di log pembulatan dan diberi temuan INFO `PPN_IKUT_FAKTUR`. Bila selisih melebihi toleransi, muncul GALAT `FAKTUR_DI_LUAR_TOLERANSI`. Angka faktur tetap harus diperiksa manual; opsi ini tidak menyatakan faktur sah.
- **PPh**: jenis & tarif per kontrak, dasar tagihan (atau DPP).
- **Neto** = tagihan + PPN − PPh. Bila "PPN dipungut pemungut" dicentang: tagihan − PPh.
- **Pembulatan** `KOMPONEN` (bawaan: setiap baris BAP dibulatkan lalu dijumlah, sehingga dokumen selalu bertambah tepat) atau `AKHIR` (neto dari nilai eksak). Setiap pembulatan dicatat (`pembulatan[]`).
- **Kontrol**: volume s/d > kontrak → GALAT, kecuali addendum (nomor wajib); prestasi > nilai kontrak/addendum → GALAT; tidak ada volume ini → GALAT; PPN belum diatur → GALAT; harga 0, nilai item ≠ nilai kontrak, BK ≠ perhitungan, timesheet/surat jalan ≠ BK, angka invoice/faktur/kwitansi/SPKTV ≠ perhitungan (selisih ≤ Rp 2 ditandai "kemungkinan pembulatan").

## 5. Status & kewenangan
`DRAFT → DALAM PENYUSUNAN → MENUNGGU DOKUMEN → SIAP DIPERIKSA → (REVISI | TERVERIFIKASI) → DIAJUKAN → PROSES PEMBAYARAN → DIBAYAR`, serta `BATAL`.

| Transisi | Siapa | Syarat |
|---|---|---|
| Draft ↔ Dalam penyusunan, → Menunggu dokumen | Pengadaan | tanpa GALAT perhitungan |
| → Siap diperiksa | Pengadaan | checklist BK lengkap (Ada berkas / Tidak berlaku beralasan) |
| → Revisi | **Admin** | dari Menunggu dokumen / Siap diperiksa / Terverifikasi; alasan ≥ 12; belum diajukan bayar |
| Terverifikasi | — (dibaca) | Admin memverifikasi Checklist Tagihan (konfirmasi dokumen asli) |
| Diajukan / Proses / Dibayar | — (dibaca) | Keuangan & Bayar (aturan kernel: BA terbit, checklist siap, tanggal) |
| Batal | Pengadaan | alasan ≥ 12; hanya bila bayar Belum/Ditunda; baris tetap tersimpan |

Peran mengikuti kernel: **Admin** (= Pengadaan + admin), **Pengadaan**, **Lihat**. Kernel tidak punya peran "Keuangan" atau "SAP" (peran SAP dihapus sejak v2). Pemisahan yang ada adalah Admin memverifikasi, Pengadaan menyusun & mengajukan, Lihat membaca. Bila diperlukan peran Keuangan terpisah, itu perubahan kernel (`PERAN_VALID`) dan belum dikerjakan.

---

## 6. Rekonsiliasi angka dengan tagihan nyata
Diuji di `uji/uji_inti.js` dengan transkripsi berkas tagihan proyek 1425011 yang sudah ada di repo:

| Tagihan | Dokumen asli | Hasil mesin |
|---|---|---|
| **SPM** Bahan, 24 item | BAP Rp 45.031.500 · Faktur DPP 41.278.875 · PPN 4.953.465 · total 49.984.965 · PPh 22 675.473 · SPKTV diajukan **44.356.028** | semua cocok. Neto per komponen 44.356.027 (selisih **Rp 1** ditandai). Mode `AKHIR` mereproduksi 44.356.028 (dari PPh eksak 675.472,5). |
| **SPSA** Alat, 6 unit | BAP 78,32% · Faktur DPP **108.625.002** · PPN 13.035.000 · total 131.535.000 · PPh 23 2.370.000 · diajukan 116.130.000 | semua cocok dengan **DPP per baris barang**. Dari total hasilnya 108.625.000; selisih Rp 2 terdeteksi. |
| **SPPP** Subkon, uang muka 20% | UM 439.141.500 · DPP 402.546.375 · PPN 48.305.565 · total 487.447.065 · PPh 4(2) 7.684.976 · diajukan 431.456.524 | semua cocok |
| **CV Mirsel** `02/SPPP/WSKT-NK KSO/1726012/2026`, tagihan ke-1 (berkas 5100012506) | Prestasi 418.106.640 (15,33%) · retensi 5% 20.905.332 · setelah retensi 397.201.308 · Faktur DPP **364.101.195** · PPN 43.692.143 · total **440.893.451** | prestasi, %, retensi, dan jumlah setelah retensi cocok. DPP 11/12 hasil hitung **364.101.199**; selisih **Rp 4** dari faktur tidak dapat diturunkan dari angka mana pun di berkas, sehingga ditandai. Dengan opsi *Ikuti Faktur Pajak* total 440.893.451 cocok dengan BAP/Invoice/Kwitansi. |

**Catatan berkas CV Mirsel:**
- Tabel BAPP asli mencetak PPN 11% × prestasi bruto (45.991.730). Angka ini tidak konsisten dengan BAP, Faktur, dan Kwitansi (PPN 12% × DPP 11/12 atas nilai setelah retensi = 43.692.143). Generator **tidak mencetak PPN di BAPP**; PPN hanya di BAP. Perlu dikonfirmasi ke Adkon.
- PPN Non-WAPU (dibayarkan ke vendor), tanpa potongan PPh pada BAP.
- Format BAPP (Dari/Kepada, 11 kolom volume, penomoran ulang per bagian A/B), BAP (rincian a–b–c dan kotak paraf 8 kolom), dan Rincian Progres Pekerjaan (bobot per item) mengikuti berkas ini (§10).

| **PT Surya Salim Sejahtera** `047/SPM/WK-NK.KSO/PDBJ/1726012/2026` (Bahan, 15 item; berkas `20260827_0010`) | Harga jual 10.720.000 (100%) · Faktur DPP **9.826.667** · PPN 1.179.200 · total **11.899.200** (BAP, Invoice & Kwitansi 685/SSS/VIII/2026, kondisi harga SPM) | **semua cocok tanpa selisih** (DPP 9.826.666,67 dibulatkan). 3 surat jalan (965, 1004, 1011) = volume BAPM. |

**Temuan berkas PT Surya Salim** (diuji di `uji_inti.js`; perlu ditindaklanjuti Pengadaan/Gudang):
- Kartu gudang **Stop Kontak Panasonic** mencatat penerimaan **2 pcs** (30 Juli). SPM, surat jalan 1004, BAPM, dan Invoice mencatat **4 pcs**.
- Tidak ada kartu gudang untuk Steker Broco, Mata Bor Besi 6 mm, Klem Kabel, dan Lampu LED. Lampu LED tiba 3 Agustus, sedangkan kartu gudang yang dilampirkan hanya bulan Juli.
- Syarat pembayaran SPM: **tempo 60 hari kerja**. Invoice: **Net 30 Days**. Kolom *P.O. No.* di invoice kosong/bergeser.
- Alamat vendor: SPM *Jl Krekot Jaya Blok D No. 1 & 2*; Faktur/SKF *Jl Krekot Jaya Molek D No. 15*.
- Kartu gudang Cat Pilox Putih (bulan Jul-26) bertanggal *30 Juni 2026*.
- Satuan Paku Beton: SPM/BAPM *dus*, surat jalan *pak*, Faktur *Boks*.
- BAPM asli berbunyi "telah diterima **alat**" untuk material. Generator memakai kalimat baku.
- PPh tidak tercantum. SPM menyatakan harga sudah termasuk PPh, dan SPKTV/Jurnal Hutang belum ada di berkas, sehingga PPh tidak dihitung dan harus diisi dari SPKTV.

Angka yang tidak terbaca jelas harus ditandai, bukan diisi.

---

## 7. Instalasi & konfigurasi
1. **Backup**: Monitoring SAP › Kesehatan & Backup › *Backup sekarang*, atau salin spreadsheet database. Unduh juga `server-modul-1.9.6.json` & `pembaruan-2.6.24.json` sebagai titik rollback.
2. **Uji di staging dahulu**: salin spreadsheet → proyek Apps Script terpisah → deployment uji. Jangan langsung di produksi.
3. **Modul server**: Diagnostik sistem › Modul server › *Unggah kandidat* `server-modul-1.10.0.json` → *Mode uji* (baca saja: buka Paket Tagihan, Dashboard) → *Terbitkan* (konfirmasi `LULUS UJI`). `…/exec?action=ping` harus menampilkan `modul.versi = 1.10.0` dan fitur `paketTagihan`.
4. **Aplikasi**: Pengguna & Proyek › Pembaruan › unggah `pembaruan-2.7.0.json` (kandidat Admin) → periksa → terbitkan ke staf.
5. **Konfigurasi tagihan per kontrak** (Paket Tagihan › tab Konfigurasi): kategori, UM, retensi, **skema & tarif PPN**, pemungut PPN, PPh, pembulatan, addendum. Untuk Alat: dasar sewa per item (jam minimum/hari, hari/bulan, jam/bulan).
6. **Billing Generator 2.0.0**: salin folder `billing-generator/` (index.html, app.js, styles.css, terhubung.js, xlsx.full.min.js, lib/). Buka `index.html` → panel *Mode Terhubung* → URL `…/exec`, nama, kata sandi, ID proyek. Kata sandi hanya disimpan selama tab terbuka.
7. Identitas cetak (kop, Kepala Proyek, Kasi) mengikuti data proyek di server (`Proyek`: kso, namaLengkap, kapro, kasi) dan Identitas Pelaksana.

## 8. Backup & rollback
| Masalah | Langkah |
|---|---|
| Modul 1.10.0 bermasalah | Modul server › *Rollback* (ketik `KEMBALIKAN`) → kembali ke modul sebelumnya. Darurat: jalankan `nonaktifkanModul()` dari editor. Data paket tetap di sheet `_PaketTagihan*`. |
| Pembaruan 2.7.0 bermasalah | Pengguna & Proyek › Pembaruan › *Rollback* ke 2.6.24 (Admin-first) |
| Billing Generator | buka `index.html?aman` (versi bawaan) atau pakai folder 1.2.0. Data lokal (JICT_Priuk_DB) tidak tersentuh. |
| Salah input paket | *Batalkan paket* (alasan) → BK dapat dibuatkan paket baru. Riwayat versi tetap ada. |
| Pemulihan data | backup harian spreadsheet (modul 1.9.4+) di Drive "Backup Monitoring SAP" |

## 9. Panduan pengujian
```bash
# siapkan: kernel asli → Code.gs; pustaka uji (pdf-lib, pdfjs-dist) di NPM; Chromium/Playwright terpasang
python3 -I - <<'X'
h=open('asisten-ai-agen/demo/demo-verifikasi-tagihan.html',encoding='utf-8').read(); a=h.index('/* Code_2.5.1_Monitoring_Pengadaan.gs (kernel asli) */')
open('/tmp/Code.gs','w',encoding='utf-8').write(h[a:h.index('</script>',a)])
X
python3 -I tagihan/alat/rakit.py semua                    # rakit modul, pembaruan, pustaka Billing Generator
node tagihan/uji/uji_inti.js                              # 84 · mesin & rekonsiliasi (termasuk CV Mirsel & PT Surya Salim)
NODE_PATH=$NPM node tagihan/uji/uji_dokumen.js            # 32 · dokumen, PDF berhalaman banyak, bundel, format CV Mirsel, PT Surya Salim & form checklist
KODE_GS=/tmp/Code.gs NODE_PATH=$NPM node tagihan/uji/uji_server_bl.js        # 62 · server
HTML_DASAR=index.html KODE_GS=/tmp/Code.gs NPM=$NPM node tagihan/uji/ui270.js   # 24 · UI aplikasi asli
KODE_GS=/tmp/Code.gs node billing-generator/uji/ui_bg.js  # 15 · Billing Generator terhubung
MODUL=server-modul-1.10.0.json KODE_GS=/tmp/Code.gs node asisten-ai-agen/uji/cek_paket.js
```
Uji manual yang tetap perlu dilakukan di Google sungguhan: §11.

## 10. Changelog
### 1.10.0 / 2.7.0 / Billing Generator 2.0.0 — Paket Tagihan
- Mesin tagihan 1.0.0, model dokumen 15 jenis, render HTML & PDF (pdf-lib), klien unggah bertahap.
- Modul server 1.10.0: 13 aksi `bl*`, 3 sheet baru, idempotensi, versi, jejak versi, kontrol ganda (BK, tagihan-ke, surat jalan), unggah SHA-256, tautan checklist, status efektif dari Monitoring SAP.
- Pembaruan 2.7.0 (blok MP270): tombol di 4 menu, dialog paket 6 tab, Dashboard Paket Tagihan, ekspor Excel/PDF, mode pratinjau bila modul belum terbit.
- Billing Generator 2.0.0: mode terhubung, salinan offline & antrean, pdf-lib & SheetJS lokal; mode lokal 1.2.0 utuh.
- Penyelarasan dengan tagihan CV Mirsel:
  - **BAPP/BAPM/BAPA**: pembuka Dari/Kepada; tabel 11 kolom (sesuai SPK, s/d saat ini, BA s/d lalu, periode ini, BA ditagihkan, sisa); penomoran ulang per bagian; item kontrak bervolume 0 tetap bernomor; perhitungan pembayaran; terbilang; TTD Mengetahui/Yang Menerima/Yang Menyerahkan.
  - **BAP**: rincian a Perhitungan Pembayaran, b Potongan Retensi, c Pengembalian Uang Muka (s/d saat ini, yang lalu, saat ini); jumlah (a−b−c); PPN dengan DPP; TOTAL; terbilang; kotak paraf verifikasi 8 kolom (Staf KSDM … Kapro; dapat diubah lewat `identitas.paraf`).
  - **Rincian Progres Pekerjaan** (dulu Rekap Kuantitas): bobot per item dan progres s/d lalu, periode ini, dan s/d periode ini.
  - Opsi PPN **Ikuti Faktur Pajak** dengan toleransi.
  - Renderer HTML & PDF: tabel tanpa kepala, sel gabung (`span`), tabel polos bergaris, lebar sebagian, dan tabel utuh.
- **Checklist Kelengkapan Tagihan** mengikuti `Form_Checklist_BAHAN/ALAT/SUBKON.docx`:
  - kepala 1–6: Divisi, Nama Proyek, Id Proyek, Nomor Pengajuan, Nama Mitra, Pekerjaan. Id Proyek diambil dari data proyek; bila kosong, dari nomor kontrak (`…/1726012/2026`);
  - bagian A. UMUM dan B. BAHAN/ALAT/SUBKON;
  - kolom No · Jenis Dokumen · Tanggal · Ketentuan · Checklist Ada/Tidak · Keterangan;
  - "Lampiran V" pada form Bahan.

  Isi template (13 + 12/13 item) sudah sama persis dengan `CL217_TEMPLATES` Monitoring SAP, jadi tidak diubah. Tanda **V Ada** hanya untuk berkas yang tercatat di Checklist Tagihan, dengan tanggal berkas; berkas yang belum diverifikasi Admin diberi catatan. **V Tidak** untuk "tidak berlaku" beserta alasannya. Draft atau dokumen yang belum diperiksa dibiarkan kosong.
- Billing Generator: alamat kop dan nama proyek sebelumnya tidak tercetak karena tertutup komentar; diperbaiki.
- **BAPM/BAPA** mengikuti BAPM PT Surya Salim: tabel 10 kolom (No, Jenis Item, Volume Kontrak, Sat, Progres Real Volume yg lalu / saat ini / sd. saat ini / sisa, Harga, Jumlah Harga), volume 2 desimal. BAPP Subkon tetap memakai format 11 kolom CV Mirsel. Dasar 0 di BAP dicetak "-".

## 11. Laporan hasil uji & keterbatasan
**Lulus (otomatis):** mesin 84 · dokumen/PDF 32 · server 62 · UI aplikasi asli 24 · Billing Generator 15 = **217 cek baru**.
**Regresi lama dengan 1.10.0 / 2.7.0:** uji150 72 · uji_vt 36 · uji_bundel 40 · uji_bundel_kosong 18 · uji_judul 9 · uji_tim 36 · uji_kantor 18 · uji_kunci 16 · uji_multiproyek 29 · uji_manual 14 · uji_sprint1 27 · uji_wave 12 · uji_pemantauan 18 · ui2610 12 · ui2611 8 · ui269 6 · ui2622 20 · ui2623 22 · ui268 21 · ui266 14 · ui264 17 · ui265 11 · banding paket 2.6.24 → 2.7.0: tanpa galat baru, beban pengamat 1.482 → 1.495 ms/20.000 elemen.
`uji_rollback.js` tidak dijalankan karena butuh `server-modul-1.4.0.json` yang tidak ada di repo (sama seperti sebelumnya).

Yang diuji: login & hak akses (Admin/Pengadaan/Lihat), pembacaan kontrak Master & Register, BK multi-termin (UM & retensi berlanjut), tagihan UM & pelepasan retensi, PDF 130 item (7 halaman, kepala tabel berulang, tidak ada teks keluar batas, TTD utuh), bundel, konflik versi, jawaban terputus setelah simpan (tercatat tepat 1 kali), offline → antrean → kirim ulang, rollback modul, data lama tidak berubah, tampilan HP 390 px, akses lintas origin tanpa preflight.

**Keterbatasan & yang belum dikerjakan:**
1. Diuji pada tiruan Google Apps Script (harness/kernel asli), **belum di deployment Google sungguhan**. Perlu uji manual di staging: unggah modul, unggah PDF 10–25 MB (batas waktu 6 menit/permintaan), akses dari komputer lain & HP, CORS dari `file://` dan dari alamat web.
2. Format BAPP/BAP/Rincian sudah dicocokkan dengan berkas CV Mirsel. Invoice & Kwitansi tetap **draf pembanding** (dokumen resmi dari vendor). Checklist sudah mengikuti 3 form DOCX proyek. BAPM/BAP Bahan sudah dicocokkan dengan berkas PT Surya Salim Sejahtera.
3. Kontrak **Master** (Excel tertanam) hanya dapat dibuatkan paket dari Monitoring SAP. Billing Generator dapat membuat paket dari kontrak Register dan membuka/menerbitkan semua paket yang sudah ada.
4. Tidak ada peran Keuangan/SAP terpisah di kernel (§5).
5. Notifikasi dokumen kurang/kedaluwarsa/revisi/siap diperiksa tampil di dashboard & dialog. Notifikasi email/Telegram terjadwal (modul notifikasi) belum diperluas ke paket tagihan.
6. Pratinjau HTML dan PDF memakai model yang sama tetapi dua penggambar, sehingga tata letak bisa berbeda sedikit. PDF berkas (pdf-lib) adalah acuan resmi.
7. Arsip dokumen vendor dibaca di konteks (`arsip`). Pemasangan dokumen arsip ke checklist masih lewat menu Checklist yang sudah ada.
8. `Monitoring_SAP.html` tidak memuat paket pembaruan (lihat §1.1).
