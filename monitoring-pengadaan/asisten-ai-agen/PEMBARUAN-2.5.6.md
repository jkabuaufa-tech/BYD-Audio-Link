# Pembaruan aplikasi 2.5.6 — Kartu Gudang, Pengeluaran & Checklist tanpa AI

| | |
|---|---|
| Berkas pembaruan | `pembaruan-2.5.6.json` (format `monitoring-sap-pembaruan`, kumulatif, `untukDasar: 2.0`, 1,3 MB) |
| Basis | `pembaruan-2.5.5.json` (identik dengan berkas yang Anda kirim) |
| Modul server | **tetap 1.8.4** — tidak ada `server-modul-1.8.5` karena tidak ada perubahan server yang dibutuhkan |
| Kernel Code.gs | tidak disentuh (2.5.1) |
| Patch terdokumentasi | `pembaruan-2.5.6.patch.json` (27 operasi, SHA-256 sumber & hasil) · perakit `alat/rakit-2.5.6.py` · penerap `alat/terapkan-patch.py` |
| Kode terbaca | `sumber/2.5.6/mp223-kartu.js`, `sumber/2.5.6/mp219-unggah.js`, `sumber/2.5.6/mp256.css` |
| Demo | `demo/demo-pembaruan-2.5.6.html` (kernel + modul + blok asli 2.5.6, data fiktif) |

## 1. Audit singkat 2.5.5 / 1.8.4

| Area | Temuan pada 2.5.5 | Dampak |
|---|---|---|
| Kartu Gudang — pilih material (`mp223KMat`) | `<select>` berisi seluruh material; harus di-scroll | lambat bila material banyak |
| Kartu Gudang — keterangan (`dataKartu()`) | keterangan selalu disusun dari bon/SJ & lokasi/penerima; properti `ket` yang **sudah tersimpan** di transaksi (modul 1.8.4 menyimpan `ket` pada penerimaan & pengeluaran) **tidak pernah ditampilkan**; beberapa transaksi sehari digabung dengan `;` | keterangan petugas hilang dari kartu |
| Kartu Gudang — periode (`mp223KDari/Sd`, `mp241Tanggal25Prev/Now`, `siapkanK()`) | bawaan 25 bulan lalu – 25 bulan ini → **tanggal 25 masuk dua periode**; judul cetak "Bulan" diambil dari tanggal *Dari* (periode Jun 25–Jul 25 tercetak "Juni"); memakai tanggal perangkat, bukan WIB | transaksi tanggal 25 terhitung ganda antar-periode; judul cetak salah bulan |
| Kartu Gudang — kotak ringkasan | `Sisa akhir periode = saldo awal + (terusan masuk − terusan keluar)` padahal sejak 2.5.4 terusan sudah kumulatif → **saldo awal terhitung dua kali** bila ≠ 0 | angka sisa akhir di layar salah (tabel & cetak benar) |
| Stok & Pengeluaran — formulir GI (`mp223KItem`) | `<select>` biasa; setiap render ulang (ketik di *Cari material…*, muat data otomatis tiap 5 menit, simpan transaksi lain) **menghapus isian qty/lokasi/penerima/keterangan** | input hilang, pengguna mengulang |
| Stok & Pengeluaran — `ket` | `mp223KKet` sudah dikirim sebagai `ket` ke `gudangKeluarSimpan` dan disimpan modul | sudah benar — dipertahankan |
| Checklist — unggah (`mp219ClUploadSimpan`, jalur aktif) | unggah → simpan checklist langsung; tidak ada status tahap; galat mentah; dialog ditutup sebelum simpan; **Coba lagi setelah koneksi putus dapat membuat PDF ganda** di Drive; penggantian PDF tanpa jejak yang terlihat | pengguna tidak tahu apakah PDF sudah tersimpan |
| Checklist — fungsi `upload(k,file)` (blok cl217 2.1.7) | modalnya sudah digantikan MP219 (`cl217Buka` ditimpa); tidak lagi dipanggil UI | dibiarkan apa adanya demi kompatibilitas |
| Checklist ↔ AI | penyimpanan PDF **sudah** tidak memerlukan AI; namun verifikasi AI otomatis berjalan saat checklist lengkap, dan bila bundel gagal karena API key/kuota pengguna hanya melihat pesan galat (bagian bundel yang sudah tersimpan tidak terlihat) | kesan "unggah gagal karena AI" |
| Server 1.8.4 | `gudangKeluarSimpan`/`gudangTerimaBon` menyimpan `ket`; `manifestBaca` mengembalikan SHA-256 setiap unggahan (kait `setelahUnggah`); gerbang `checklistVerifikasi` tanpa hasil AI menuntut alasan ≥ 20 karakter | semua kebutuhan 2.5.6 sudah tersedia → **tanpa perubahan server** |

## 2. Bagian kode yang diubah (hanya CSS/JS paket)

| No | Blok | Perubahan |
|---|---|---|
| 1 | MP223 §5 Kartu Gudang | diganti utuh: combobox material, `Bulan | Tahun | Tampilkan` (26–25 WIB), `ket` per transaksi dengan fallback bawaan, saldo akhir = awal + masuk − keluar, cetak & Excel ikut |
| 2 | MP223 §6 Stok & Pengeluaran | combobox material GI (select asli tetap tersembunyi sebagai sumber kunci), draf isian dipulihkan setiap render ulang, formulir dikosongkan setelah tersimpan |
| 3 | MP219 Checklist | `mp219ClUploadSimpan` diganti: tahap & status, sebab gagal, Coba lagi aman (sidik SHA-256 + `manifestBaca`), riwayat berkas, Mode Manual/AI, lencana "✓ Drive / belum disimpan", peringatan PDF belum disimpan |
| 4 | MP230 Verifikasi | `otomatis()` tidak berjalan di Mode Manual; banner "Penyimpanan berhasil — analisis AI belum berhasil" pada bundel; pesan gagal verifikasi AI menegaskan dokumen & status tidak berubah |
| 5 | MP241 | `siapkanK()` menghormati Bulan/Tahun; bawaan = periode berjalan WIB; logika 25–25 tetap sebagai cadangan; tombol bundel memberi petunjuk di Mode Manual; Ctrl+K "Kartu Gudang periode 26–25" |
| 6 | CSS | blok `MP256` ditambahkan di akhir (aturan lama tidak diubah) |
| 7 | Versi | konstanta `VERSI`/`VERSI_PAKET` 2.5.5 → 2.5.6 |

Setiap operasi tercantum di `pembaruan-2.5.6.patch.json` (teks dicari harus unik; gagal keras bila tidak cocok). `python3 -I alat/terapkan-patch.py pembaruan-2.5.5.json pembaruan-2.5.6.patch.json hasil.json` menghasilkan paket identik (SHA-256 diperiksa).

## 3. Mengapa data existing tidak tersentuh

- **Tidak ada aksi server baru** — semua aksi yang dipanggil 2.5.6 sudah dipanggil 2.5.5 (diuji otomatis). Tidak ada perubahan modul, sheet, kolom, Drive, properti, atau izin Google.
- Kartu Gudang membaca `GD.masuk/keluar` **baca saja**; keterangan lama tanpa `ket` ditampilkan dengan susunan bawaan — data tidak diisi/diubah. Tanggal transaksi tidak diubah; periode hanya filter tampilan.
- Unggah tetap lewat `unggahPdf` → `unggahBerkas` kernel (validasi PDF ≤ 10 MB, kompres > 10 MB, folder proyek). Pencarian berkas yang sudah sampai memakai `manifestBaca` (baca saja). Berkas lama **tidak pernah dihapus/ditimpa**; checklist hanya berganti referensi saat pengguna menyimpan.
- Mode Manual/AI disimpan di perangkat (localStorage), bukan di server. Syarat checklist, Verifikasi Admin, gerbang bayar, dan hak akses tidak berubah — unggahan **tidak** pernah menjadi LOLOS otomatis.
- Pemasangan tidak membuat transaksi, tidak menjalankan inisialisasi, tidak memigrasikan data.

## 4. Laporan pengujian (PASS / FAIL / BELUM DIUJI)

Lingkungan: Node 22 + Chromium (Playwright), **Code.gs asli** (diambil dari demo repositori) + **modul 1.8.4 asli** dengan tiruan layanan Google di memori — bukan Google Apps Script sungguhan.

| Uji | Isi | Hasil |
|---|---|---|
| `uji/cek_paket.js` | kernel menerima 2.5.6 (kumulatif, > 2.5.5, < 5 MB); versi sama ditolak | **PASS** |
| `uji/uji_kartu_terusan.js pembaruan-2.5.6.json` | regresi 2.5.4: terusan kumulatif | **PASS** 6/6 |
| `uji/uji_kartu_256.js` | Juli = 26 Jun–25 Jul, Agustus = 26 Jul–25 Agt, tanggal 25/26 hanya satu periode, saldo awal Agustus = saldo akhir Juli, terusan kumulatif, `ket` diutamakan & fallback, beberapa transaksi sehari, BATAL tidak dihitung, Januari lintas tahun, rentang lama kompatibel, data tidak diubah, cetak & Excel | **PASS** 18/18 (paket 2.5.5 gagal pada cek pertama) |
| `uji/ui256_gudang.js` | combobox: kode, nama, sebagian, huruf besar/kecil, tanpa tanda baca, ↑/↓ Enter, klik, Esc, tanpa membuat master; render ulang saat mengetik (fokus & kursor tetap); Bulan/Tahun/Tampilkan; `siapkanK` tidak menimpa; zona WIB; cetak LOGINV-09 & Excel sama; GI: stok & satuan, Enter tidak mengirim formulir, isian tidak hilang saat cari/muat ulang, `ket` & kunci asli terkirim ke `gudangKeluarSimpan`, akses dari tabel stok; ponsel 390 px | **PASS** 32/32 |
| `uji/ui256_checklist.js` | Mode Manual bawaan tanpa AI; unggah tanpa API key (0 panggilan AI); Manifest SHA-256; koneksi putus sesudah/sebelum server menyimpan → Coba lagi tanpa berkas ganda; Simpan checklist gagal → tidak unggah ulang; sebab: terlalu besar, izin, penyimpanan, bukan PDF; ganti PDF: berkas lama tetap + riwayat dapat dibuka; data tagihan lain identik; gerbang tetap (tanpa AI butuh alasan ≥ 20, tercatat Log); API key ditolak: bundel tersimpan, banner, tidak ada LOLOS, beralih Manual | **PASS** 35/35 |
| `uji/uji_pasang_256.js` | pasang 2.5.5 → 2.5.6 lewat kandidat Admin (staf ditolak); semua sheet data & berkas Drive identik (Log hanya bertambah); transaksi setelah pembaruan tetap ada setelah rollback; transaksi historis, checklist terverifikasi, status bayar tetap | **PASS** 15/15 |
| `uji/cek_demo_256.js` | demo 2.5.6 berjalan tanpa galat | **PASS** 9/9 |
| Regresi server (modul tidak berubah): `uji_vt` 36, `uji_bundel` 40, `uji_tim` 36, `uji_kunci` 16, `uji_judul` 9, `uji_kantor` 18, `uji150` 72 | | **PASS** |
| Regresi UI dengan paket 2.5.6: `ui228` 26, `ui230` 19, `ui243` 8, `ui251` 23, `ui253` 7, `ui255` 20 | | **PASS** |
| `ui240`, `ui241`, `ui242`, `ui244`, `ui250` dengan paket 2.5.6 | uji lama untuk perilaku 2.4.x/2.5.0 | **FAIL — sama persis dengan paket 2.5.5** (bukan regresi 2.5.6; dengan paket aslinya masing-masing PASS) |
| `uji_rollback.js` (rollback modul 1.4.0) | butuh `server-modul-1.4.0.json` yang tidak ada di repositori | **BELUM DIUJI** (modul tidak berubah) |
| Google Apps Script/Drive/Sheets sungguhan, salinan produksi | | **BELUM DIUJI** — wajib dilakukan Anda (langkah 5) |
| `unggahPdf` HTML dasar v2.0 sungguhan | uji memakai tiruan yang memanggil `unggahBerkas` kernel asli | **BELUM DIUJI** |
| Mode AI dengan API key & kuota asli | AI ditiru di semua uji | **BELUM DIUJI** |
| Aplikasi Windows (Electron) | | **BELUM DIUJI** |

## 5. Petunjuk instalasi (risiko minimum)

1. **Cadangan yang dapat diverifikasi**
   - Google Sheets produksi › *File › Buat salinan* → nama `BACKUP Monitoring SAP 2026-10-15`. Jangan diubah.
   - Aplikasi › menu akun › *Diagnostik sistem* → catat **jumlah baris tiap sheet** (aksi `diagServer`) atau ambil tangkapan layar.
   - Simpan `pembaruan-2.5.5.json` & `server-modul-1.8.4.json` di komputer (sudah Anda miliki).
2. **Uji di lingkungan terpisah**
   - Buat salinan kedua `UJI Monitoring SAP` › *Ekstensi › Apps Script* › periksa *Setelan Project › Properti skrip*. Bila ada `FOLDER_BERKAS`, **hapus properti itu di salinan UJI saja** agar unggahan uji membuat folder Drive sendiri (bukan folder produksi).
   - *Terapkan › Deployment baru › Aplikasi web* pada salinan UJI → arahkan satu peramban/aplikasi uji ke URL salinan.
   - Di salinan UJI: unggah `server-modul-1.8.4.json` (Diagnostik › Modul server › Uji › Terbitkan), lalu `pembaruan-2.5.5.json` dan `pembaruan-2.5.6.json` (Pengguna & Proyek › Pembaruan).
   - Jalankan daftar cek di bagian 4 secara manual: Kartu Gudang Juli/Agustus, cari material, GI dengan keterangan, unggah PDF checklist tanpa AI (matikan penyedia AI di salinan), putuskan Wi-Fi saat mengunggah lalu *Coba lagi*.
3. **Pasang di produksi** (setelah UJI lulus): Pengguna & Proyek › Pembaruan › unggah `pembaruan-2.5.6.json` → pratinjau Admin (staf belum melihat) → ketik `LULUS UJI` → Terbitkan. Modul server **tidak perlu** diunggah.
4. **Verifikasi setelah pasang**: bandingkan jumlah baris tiap sheet dengan catatan langkah 1 (harus sama, kecuali Log bertambah); buka satu PDF checklist lama; buka Kartu Gudang periode lama.

## 6. Rollback aman

- Pengguna & Proyek › Pembaruan › **Rollback** (ketik `KEMBALIKAN`) → aplikasi kembali ke 2.5.5. Kernel hanya memindahkan penunjuk versi tampilan ("database tidak diubah") — **tidak** memulihkan snapshot data. Transaksi, PDF, dan checklist yang dicatat selama 2.5.6 tetap ada dan tetap terbaca oleh 2.5.5 (format data sama; diuji `uji_pasang_256.js`).
- Modul server tidak berubah, jadi tidak ada rollback modul.
- Pilihan Mode Manual/AI tersimpan di perangkat; 2.5.5 mengabaikannya. Periode Kartu Gudang di 2.5.5 kembali ke rentang Dari/s.d.
- **Jangan** memulihkan data dari salinan cadangan untuk keperluan rollback — itu menimpa transaksi terbaru. Salinan cadangan hanya untuk keadaan darurat yang diputuskan Admin.
