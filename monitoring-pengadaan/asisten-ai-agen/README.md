# Asisten AI & Verifikasi Tagihan — Monitoring Pengadaan

Modul server **1.8.4** + Pembaruan aplikasi **2.5.6** (kernel Code.gs 2.5.1, tanpa deployment ulang & tanpa izin Google baru). Kumulatif: berisi seluruh isi 1.5.x–1.6.0 / 2.2.8–2.3.0.

| Berkas | Untuk | Unggah lewat |
|---|---|---|
| `server-modul-1.8.4.json` | logika server (format `monitoring-sap-modul-server`, `untukKernel: "2.5"`) | Diagnostik sistem › Modul server |
| `pembaruan-2.4.0.json` | aplikasi (CSS + JS, **kumulatif**) | Pengguna & Proyek › Pembaruan |
| `pembaruan-2.4.0.patch.json` | patch 2.2.7 → 2.4.0 (9 operasi, SHA-256 sumber & hasil) | dokumentasi / `alat/terapkan-patch.py` |
| `potongan-siap-tempel-2.4.0.json` | potongan `css` & `js` (Asisten AI, Verifikasi Tagihan) | rujukan tempel |
| `server-modul-1.8.8.json` + `pembaruan-2.6.0.json` | **terbaru**: perbaikan item kontrak Master (027/028 sesuai spreadsheet) + Pengguna online (1.8.8 memuat 1.8.7; 2.6.0 memuat 2.5.9) · patch: `*.patch.json`, `alat/rakit-modul-1.8.8.py`, `alat/rakit-2.6.0.py` | Diagnostik sistem › Modul server · Pengguna & Proyek › Pembaruan |
| `server-modul-1.8.7.json` + `pembaruan-2.5.9.json` | sebelumnya: data gudang dimuat bertahap — perbaikan "Data gudang gagal dimuat … HTTP 404 Drive" (1.8.7 memuat 1.8.6; 2.5.9 memuat 2.5.8) · patch: `*.patch.json`, `alat/rakit-modul-1.8.7.py`, `alat/rakit-2.5.9.py` | Diagnostik sistem › Modul server · Pengguna & Proyek › Pembaruan |
| `server-modul-1.8.6.json` + `pembaruan-2.5.8.json` | sebelumnya: alur dua tahap (1.8.6 memuat 1.8.5; 2.5.8 memuat 2.5.7): Verifikasi AI membaca PDF unggahan checklist | Diagnostik sistem › Modul server · Pengguna & Proyek › Pembaruan |
| `pembaruan-2.5.6.json` | aplikasi (kumulatif; modul server tetap 1.8.4) — rincian, uji, instalasi & rollback: `PEMBARUAN-2.5.6.md` | Pengguna & Proyek › Pembaruan |
| `pembaruan-2.5.6.patch.json` | patch 2.5.5 → 2.5.6 (27 operasi, SHA-256) · `alat/rakit-2.5.6.py` | dokumentasi / `alat/terapkan-patch.py` |
| `demo/demo-pembaruan-2.6.0.html` | demo mandiri (tanpa internet) perbaikan item kontrak 027/028 & Pengguna online — kode asli blok MP260, aplikasi & server disimulasikan · `demo/rakit_demo_260.py` | buka di browser / bagikan |
| `demo/demo-pembaruan-2.5.6.html` | demo Kartu Gudang, Stok & Pengeluaran, Checklist tanpa AI (kode asli 2.5.6, data fiktif) | buka di browser |
| `pembaruan-2.5.5.json` | versi sebelumnya (basis 2.5.6) | — |
| `sumber/` | kode terbaca: modul bagian L (Asisten AI), N (Verifikasi Tagihan) & T (Tim AI Proyek), blok UI MP227 bagian 5, MP230 & MP250 | — |
| `demo/demo-verifikasi-tagihan.html` | demo interaktif Verifikasi Tagihan (kernel + modul + UI asli, AI disimulasikan dengan isi 3 berkas tagihan) | buka di browser |
| `demo/demo-asisten-ai.html` | demo panel Asisten AI (2.2.10) | buka di browser |

> Kernel hanya menerima paket pembaruan **kumulatif** (cek `MP218_ADMIN_FIRST_MARKER`), jadi yang diunggah adalah `pembaruan-2.4.0.json`; berkas patch menunjukkan persis apa yang berubah.

## Changelog
### 1.8.8 + 2.6.0 — Perbaikan item kontrak Master & Pengguna online
- **Masalah**: migrasi menggabungkan spreadsheet No 23 (027 · Putra Paloh, CV · 2100010709, 12 item) dan No 24 (028 · anugerah, 5 item) menjadi satu kontrak **028** atas nama Putra Paloh (17 item, Rp 162.044.900).
- **Perbaiki item kontrak Master** (2.6.0, blok MP260): tombol cabang di setiap baris Master pada Register Kontrak → centang item yang salah kontrak, isi No kontrak tujuan + vendor tujuan, perbaiki vendor sumber, alasan wajib. Untuk 028 sudah tersedia **usulan sesuai spreadsheet** (12 item → 027 Putra Paloh, CV · 2100010709; 5 item tetap 028 · anugerah). Nilai dipecah per item (atau diisi manual bila nilai item tidak tersedia). Disimpan lewat aksi `saveKoreksi` yang sudah ada sebagai catatan berversi `SISTEM-PERBAIKAN-REGISTER|<no kontrak sumber>` (tercatat di Log) dan diterapkan saat ringkasan kontrak dibangun — data Master (Excel), tagihan/progres, WBS & riwayat **tidak diubah**; catatan tagihan tetap pada nomor kontrak aslinya, dan opsi *Bagi tagihan proporsional* (bawaan pada usulan) membagi realisasinya mengikuti nilai sehingga 027 & 028 masing-masing tetap 100%. *Batalkan perbaikan* = versi baru `aktif:false`. Tujuan berupa kontrak Register ditolak (item Register diedit lewat Edit kontrak).
- **Pengguna online** (modul 1.8.8 + 2.6.0): aplikasi mengirim menu/aktivitas yang dibuka (±60 detik, saat pindah menu & setelah menyimpan) lewat `hadirDetak`; Admin membuka menu akun › *Pengguna online*: Online/Diam/Offline, sedang membuka apa, aksi terakhir, 3 catatan Log terakhir, perangkat; muat ulang otomatis 30 detik. Disimpan di CacheService (hilang sendiri 15 menit) — tidak menulis Google Sheets. Server lama → detak berhenti sendiri, panel menampilkan panduan pasang modul.
- Uji: `uji_188.js` 17 cek (kernel asli: detak tidak menulis Sheets, daftar khusus Admin & per proyek, catatan Log), `ui260.js` 35 cek (usulan 027/028, validasi, nilai 027+028 = Rp 162.044.900, Master tidak berubah, bangun ulang idempoten, batalkan, peran LIHAT, kehadiran & panel); regresi ui259 12, ui259b 9, ui256_gudang 32, ui256_checklist 35, ui258 12, uji_187 13, uji_185 15, uji_186 9, uji_tim 36, uji_vt 36, uji_bundel 40, uji_kartu_256 18 lulus; pasang → rollback 2.5.9 ⇄ 2.6.0 dengan modul 1.8.8: seluruh sheet & berkas Drive identik.

### 1.8.7 + 2.5.9 — "Data gudang gagal dimuat: Server mengirim halaman HTML, bukan data (HTTP 404) … Halaman Tidak Ditemukan Drive"
- **Penyebab**: `gudangBaca` mengirim *seluruh* transaksi gudang (GR + GI, termasuk impor migrasi) dalam **satu** respons. Setelah data gudang besar (uji: 2.400 GR + 1.600 GI = ±2,5 MB), Google gagal menyajikan respons itu dan mengirim halaman Drive 404 "tidak dapat membuka file" — padahal deployment aktif dan menu lain berjalan. Pesan lama ("deployment diarsipkan") menyesatkan untuk kasus ini.
- **Modul server 1.8.7**: aksi BACA baru `gudangBacaHal {jenis, mulai, batas}` — per halaman (bawaan 250, maks. 1.000 baris), hanya kolom DATA pada rentang baris → tiap respons kecil (±180 KB @250). `gudangBaca` lama **tidak diubah**. Fitur `gudangHalaman`. Tanpa penulisan data, tanpa izin Google baru.
- **Pembaruan 2.5.9** (blok MP259, aditif): menu gudang memuat data bertahap; halaman yang gagal diulang otomatis lalu diperkecil (250 → 125 → … → 25). Server belum 1.8.7 → otomatis memakai `gudangBaca` lama; bila tetap 404, aplikasi melakukan ping: server aktif → pesan "respons gudang terlalu besar, unggah server-modul-1.8.7.json"; ping gagal → pesan URL `/exec` tidak valid + langkah Kelola deployment. Pratinjau Admin: `gudangBacaHal` termasuk aksi baca.
- **2.5.9 bagian B — galat HTML acak pada aksi apa pun** (mis. "Gagal membaca status modul: … HTTP 404 … Drive", "HTTP 200 … otorisasi") padahal server aktif: Google sesekali menolak permintaan, terutama saat banyak permintaan berjalan bersamaan. Kini maksimal 4 permintaan bersamaan (antrean; panggilan AI tidak diantrekan), aksi BACA diulang otomatis 2× (1,5 s & 4 s), aksi TULIS & AI berbiaya tidak pernah diulang otomatis (cegah data ganda/biaya). Bila tetap gagal, aplikasi melakukan ping: server aktif → pesan "alamat & deployment BENAR, gangguan sesaat" (bukan lagi saran URL yang menyesatkan); ping gagal → langkah memperbaiki URL /exec. Uji `ui259b.js` 9 cek.
- **Pasang** (urutan disarankan): (1) Pengguna & Proyek › Pembaruan › unggah `pembaruan-2.5.9.json` › pratinjau › terbitkan → panel Modul server ikut tahan galat sesaat. (2) Admin penerbit: menu akun › Diagnostik sistem › tab Modul › unggah `server-modul-1.8.7.json` › uji › terbitkan (`LULUS UJI`). **Rollback**: modul → 1.8.6, aplikasi → 2.5.8 (hanya penunjuk versi; data tidak tersentuh).
- Uji: `uji_187.js` 13 cek (gabungan halaman identik dengan gudangBaca, batas, baris kosong, seluruh sheet tidak berubah); `ui259.js` 12 cek (bertahap, ulang, perkecil, server lama, diagnosis ping, aksi tulis diteruskan); regresi ui256_gudang 32, ui256_checklist 35, ui258 12, uji_185 15, uji_186 9, uji_kartu_256 18, uji_tim 36, uji_vt 36, uji_bundel 40 lulus; pasang → rollback 2.5.8 ⇄ 2.5.9 dengan modul 1.8.7: seluruh sheet & berkas Drive identik.

### 2.5.8 — Alur dua tahap Verifikasi Tagihan (`pembaruan-2.5.8.json`, modul server tetap 1.8.6)
- **Tahap 1**: unggah bundel → AI memisahkan dokumen menurut judul tercetak (BAP, BAPP/BAPM, Kwitansi, Invoice, Faktur Pajak, Surat Jalan, Kontrak, …) → dipotong ke baris checklist. Tidak ada verifikasi otomatis (dulu langsung berjalan setelah bundel & saat checklist lengkap).
- **Tahap akhir**: saat Admin menekan *Verifikasi Admin* (sebelum bayar), verifikasi AI berjalan otomatis bila belum ada hasil / hasil kedaluwarsa, lalu dialog Verifikasi Admin tampil dengan hasilnya. Mode Manual tetap tanpa AI. Gerbang Verifikasi Admin & bayar di server tidak berubah. Tombol di tab Bundel menjadi "Cek verifikasi sekarang (opsional)".
- Uji: `ui258.js` 12 cek (Tahap 1 tanpa vtRencana/vtNilai, tahap akhir sebelum dialog, hasil segar tidak diulang, Mode Manual); regresi ui256_checklist 35, ui256_gudang 32, ui255 20, uji_kartu_256 18 lulus. `ui251`/`ui253` menunggu verifikasi otomatis setelah bundel (perilaku lama yang sengaja dihapus) sehingga tidak berlaku lagi.

### 1.8.6 — Bundel: "AI tidak mengembalikan data terstruktur" (`server-modul-1.8.6.json`, aplikasi tetap 2.5.7)
- Penyebab: jawaban AI untuk bagian bundel yang padat (12 hal.) terpotong batas token atau dibungkus teks → JSON tidak terbaca → seluruh bagian gagal.
- Perbaikan: dokumen yang lengkap pada jawaban terpotong tetap dipakai (ditandai CATATAN K03 di laporan); bila gagal dicoba ulang otomatis dengan format ringkas lalu penyedia pembaca PDF cadangan; pesan galat menyebut sebab (terpotong / bukan JSON / penyedia tidak menerima PDF) + cuplikan jawaban; tidak ada hasil palsu yang disimpan. Termasuk seluruh isi 1.8.5.
- Uji: `uji_186.js` 9 cek; `uji_185` 15; regresi server (vt 36, bundel 40, tim 36, kunci 16, judul 9, kantor 18, uji150 72) & UI (ui256_checklist 35, ui251 23, ui253 7, ui255 20) lulus.

### 1.8.5 / 2.5.7 — Verifikasi AI membaca PDF unggahan checklist (`server-modul-1.8.5.json`, `pembaruan-2.5.7.json`)
- Masalah: tagihan yang sudah punya bundel — data bundel selalu dipakai untuk Invoice/Faktur/Surat Jalan/BAPM, sehingga PDF yang diunggah per baris checklist (mis. pembetulan) tidak dibaca AI dan laporan tetap memakai isi bundel lama.
- Modul 1.8.5: PDF yang diunggah manual **sesudah** bundel dibaca dan diutamakan; bundel melengkapi jenis lain; potongan otomatis / baris "Bundel hal." tetap memakai data bundel tanpa biaya AI; PDF manual yang lebih lama dari bundel tetap digantikan bundel (perilaku 1.8.0). Laporan "Dokumen yang dibaca" menandai sumbernya. Gerbang & hasil lama tidak diubah.
- Aplikasi 2.5.7: teks tab Bundel & penanda sumber di laporan. Patch: `server-modul-1.8.5.patch.json` (9 operasi), `pembaruan-2.5.7.patch.json` (3 operasi).
- Uji: `uji_185.js` 15 cek (1.8.4 mereproduksi masalah, 1.8.5 lulus; tagihan tanpa bundel identik); regresi server (vt 36, bundel 40, tim 36, kunci 16, judul 9, kantor 18, uji150 72) & UI (ui256_checklist 35, ui256_gudang 32, ui251 23, ui253 7, ui255 20) lulus dengan 1.8.5 + 2.5.7.

### 2.5.6 — Kartu Gudang, Pengeluaran & Checklist tanpa AI (`pembaruan-2.5.6.json`, modul server tetap 1.8.4)
- Dibangun di atas `pembaruan-2.5.5.json` (identik dengan berkas pengguna); hanya CSS/JS paket — tanpa perubahan modul, kernel, sheet, Drive, atau izin. Patch 27 operasi terdokumentasi.
- **Kartu Gudang**: kotak cari material (kode/nama, sebagian, tanpa peduli huruf besar, ↑/↓ Enter; `<select>` asli tetap sebagai sumber kunci); periode **Bulan | Tahun | Tampilkan** = 26 bulan sebelumnya s.d. 25 bulan terpilih (WIB) — tanggal 25 tidak lagi masuk dua periode; Keterangan memakai `ket` yang tersimpan per transaksi (fallback bon/SJ & lokasi/penerima); kotak **Saldo akhir** diperbaiki (saldo awal sebelumnya terhitung dua kali); cetak LOGINV-09 (Bulan/Tahun/Periode benar) & Excel sama dengan layar.
- **Stok & Pengeluaran**: kotak cari material GI dengan stok & satuan; isian formulir tidak hilang saat mencari di tabel stok / muat data otomatis; keterangan GI tampil di Kartu Gudang.
- **Checklist**: unggah PDF terpisah dari AI — status tahap, sebab gagal (terlalu besar, koneksi, izin, penyimpanan, bukan PDF), Coba lagi tanpa berkas ganda (sidik SHA-256 + Manifest server), lencana tersimpan/belum disimpan, riwayat berkas lama; **Mode Manual (Tanpa AI) / Mode AI**; bila AI gagal, bundel tersimpan tetap ada + "Penyimpanan berhasil — analisis AI belum berhasil". Gerbang Verifikasi Admin & bayar tidak berubah.
- Uji: `uji_kartu_256` 18, `ui256_gudang` 32, `ui256_checklist` 35, `uji_pasang_256` 15 (pasang/rollback, data identik), `cek_demo_256` 9; regresi server & UI lulus (lihat `PEMBARUAN-2.5.6.md`).

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
```
Hasil terakhir: paket 2.4.0 diterima kernel · **24 cek bundel & gerbang bayar** · **17 cek UI bundel** (unggah, pisah, lompat halaman, rekonsiliasi, terapkan, kunci) · 72 cek server Asisten AI · rollback 5 cek · **36 cek Verifikasi Tagihan** (3 paket nyata) · 26 cek UI Asisten AI · **19 cek UI Keuangan & Bayar** (termasuk gerbang, cetak, ponsel 390 px, tema gelap) · patch menghasilkan paket identik. Demo dirakit dengan `demo/vt-snapshot.js` + `demo/rakit_demo_vt.py`.

## Rollback
- **Modul server**: Diagnostik sistem › Modul server › **Rollback** (ketik `KEMBALIKAN`) → aktif kembali versi sebelumnya (1.6.0 / 1.5.2). Dari 1.7.0 ke 1.6.0: gerbang bayar lepas, sheet `_VerifikasiBundel` dibiarkan, item checklist yang menunjuk PDF bundel tetap sah. Gerbang Verifikasi Admin otomatis kembali ke logika kernel asli; sheet `_VerifikasiTagihan`/`_VerifikasiEkstrak` dibiarkan (tidak dibaca 1.5.x). *Mengunggah ulang* versi lama **ditolak kernel** (versi harus lebih baru), jadi pakai tombol Rollback. Darurat: jalankan `nonaktifkanModul()` dari editor Apps Script.
- **Aplikasi**: Pengguna & Proyek › Pembaruan › Rollback ke versi sebelumnya (2.3.0 / 2.2.10). Aplikasi 2.3.0 dengan modul < 1.6.0 menyembunyikan tab Verifikasi Dokumen (fitur `verifikasiTagihan` tidak ada).
- Data tagihan, checklist, dan pembayaran tidak diubah oleh fitur ini maupun rollback.
