# Asisten AI & Verifikasi Tagihan — Monitoring Pengadaan

Modul server **1.7.0** + Pembaruan aplikasi **2.4.0** (kernel Code.gs 2.5.1, tanpa deployment ulang & tanpa izin Google baru). Kumulatif: berisi seluruh isi 1.5.x–1.6.0 / 2.2.8–2.3.0.

| Berkas | Untuk | Unggah lewat |
|---|---|---|
| `server-modul-1.7.2.json` | logika server (format `monitoring-sap-modul-server`, `untukKernel: "2.5"`) | Diagnostik sistem › Modul server |
| `pembaruan-2.4.0.json` | aplikasi (CSS + JS, **kumulatif**) | Pengguna & Proyek › Pembaruan |
| `pembaruan-2.4.0.patch.json` | patch 2.2.7 → 2.4.0 (9 operasi, SHA-256 sumber & hasil) | dokumentasi / `alat/terapkan-patch.py` |
| `potongan-siap-tempel-2.4.0.json` | potongan `css` & `js` (Asisten AI, Verifikasi Tagihan) | rujukan tempel |
| `sumber/` | kode terbaca: modul bagian L (Asisten AI) & N (Verifikasi Tagihan), blok UI MP227 bagian 5 & MP230 | — |
| `demo/demo-verifikasi-tagihan.html` | demo interaktif Verifikasi Tagihan (kernel + modul + UI asli, AI disimulasikan dengan isi 3 berkas tagihan) | buka di browser |
| `demo/demo-asisten-ai.html` | demo panel Asisten AI (2.2.10) | buka di browser |

> Kernel hanya menerima paket pembaruan **kumulatif** (cek `MP218_ADMIN_FIRST_MARKER`), jadi yang diunggah adalah `pembaruan-2.4.0.json`; berkas patch menunjukkan persis apa yang berubah.

## Changelog
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
