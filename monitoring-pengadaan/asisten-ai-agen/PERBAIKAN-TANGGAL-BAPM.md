# Perbaikan: tanggal BAPM, GR, Harian Gudang dan Kartu Gudang tidak sinkron

**Rilis:** Pembaruan aplikasi **2.10.34** + Modul server **1.10.23** (kumulatif di atas 2.10.31 / 1.10.20; menggantikan 2.10.32–2.10.33 / 1.10.21–1.10.22).

> **2.10.34 / 1.10.23:** panel di bawah Kartu Gudang kini memuat **semua transaksi material** (Terima Bon, otomatis BAPM, migrasi, pengeluaran) dengan tombol **Koreksi** dan **Tautkan BAPM**, plus status versi aplikasi & Modul server. Di 2.10.33 panel hanya muncul untuk baris migrasi, padahal penerimaan 30-Sep "Masuk - -" ternyata penerimaan **Terima Bon** (aplikasi memberi lencana "📦 Migrasi" pada baris migrasi; baris ini tidak punya lencana itu). Tampilan diperbaiki untuk tema gelap. Diuji di aplikasi asli (`uji/ui_aplikasi_asli.js`).
>
> **2.10.33 / 1.10.22:** fitur **Koreksi data migrasi** di Kartu Gudang (bagian 3c). Selain itu, baris *Impor Migrasi gudang lama* ("Masuk - -", No Bon `MIGRASI/…`) kini ikut diusulkan ditautkan ke BAPM — di 1.10.21 baris ini dilewati sehingga tetap di tanggal lama (mis. 30-Sep di periode Oktober). GR yang belum tertaut kini diberi tanda ⚠ + usulan BAPM di Kartu/Harian Gudang & Penerimaan.

**Kasus nyata:** Preview BAPM `01/BAPM/065/SPM/WK-NK.KSO/PDBJ/1726012/2026` (Cahaya Utama Safety Indonesia, PT) bertanggal **5 November 2026**. Di Kartu Gudang, material *Environment Meter 5in1 pro Krisbow* (1800007128) tercatat masuk pada **30-Sep-2026** dengan keterangan "Masuk - -", lalu masuk lagi pada **05-Nov-2026** dengan keterangan "Masuk - Cahaya Utama Safety Indonesia, PT".

## 1. Alur data (sebelum perbaikan)

| Tahap | Aksi / fungsi | Field tanggal |
|---|---|---|
| Input Progres (BK) | `saveProgres` → koleksi `progres` | `tanggal` (tanggal opname/BK) |
| Tanggal BAPM / BAP | `bkTanggal` (MP2100 → server GT 1.10.6) | **`tanggalBA`**, `tanggalBAP` di BK |
| Preview BA terbit | `saveProgres{terbit}`, lalu `bkTanggal(BA.tanggal)` | `BA.tanggal` → `tanggalBA` |
| GR otomatis dari progres | `gudangOtomatisProgres` (MP273 → `gdOtomatisProgres`) | `tanggal` = `pr.tanggal` (bukan tanggal BA), ditandai `otomatis`, `refProgres` |
| GR manual (Terima Bon) | `gudangTerimaBon` / `gudangMasukSimpan` | `tanggal` = isian **`#mp223MTgl`** yang diketik petugas; **tanpa tautan ke BK** |
| Sinkron tanggal | `gtSinkronGudang`, `gudangSinkronTanggal` | hanya baris `otomatis && refProgres` |
| Kartu Gudang / Harian | `dataKartu()` (MP223) | `r.tanggal` dari sheet `<ID>_GudangMasuk` |

## 2. Akar masalah

1. **Sinkron tanggal BAPM hanya menjangkau GR otomatis.** `gtSinkronGudang` menyaring `gdOto(r) && r.refProgres === BK.id`. GR yang dicatat lewat Terima Bon tidak punya tautan ke BK, sehingga tanggalnya tetap tanggal ketik petugas (30-Sep).
2. **GR manual yang dicatat lebih dulu "menelan" GR otomatis.** `gdOtomatisProgres` menghitung `qty = s.d. kini − sudah diterima`. GR manual 30-Sep sudah dihitung sebagai "diterima", sehingga GR otomatis **dilewati** ("sudah diterima gudang"). Akibatnya BK tidak punya satu pun GR tertaut, dan tanggal BAPM tidak pernah sampai ke Kartu Gudang.
3. **GR manual yang dicatat belakangan menggabungkan GR otomatis.** `gdGabungOtomatis` membuat GR otomatis berstatus `DIGABUNG` (non-AKTIF), jadi yang tersisa di Kartu Gudang adalah baris manual dengan tanggal manual.
4. **Baris BAPM ganda.** BAPM memuat *Environment Meter* dua kali (baris 1 dan 13). Server memproses per baris, jadi baris kedua dianggap "sudah diterima" dan qty tidak lengkap.
5. **Tidak ada guard.** Tanggal GR ≠ tanggal BAPM tidak pernah ditolak. Gagal sinkron saat BAPM terbit hanya memunculkan peringatan, dan BAPM tetap terbit.

Keterangan "Masuk - -" pada baris 30-Sep membuktikan baris itu GR manual yang tidak tertaut ke kontrak/BAPM mana pun.

Reproduksi dengan modul asli, alurnya sama dengan screenshot (`uji/uji_tanggal_bapm.js`):

```
1.10.20 · GR otomatis dibuat: 0 · dilewati: ["sudah diterima gudang 1 PC","sudah diterima gudang 1 PC"]
   Kartu Gudang: GRM1 2026-09-30 AKTIF (manual)
1.10.21 · GR otomatis dibuat: 1 · dilewati: []
   Kartu Gudang: GRM1 2026-11-05 AKTIF (manual) | GRX1-1 2026-11-05 AKTIF (otomatis)
```

## 3. Perbaikan

### Server: Modul 1.10.21 (`sumber/modul-1.10.21-tanggal-bapm.js`)

- **Tautan GR manual → BK** lewat field `refBA` di kolom DATA (tanpa kolom sheet baru), dengan `tautBA` = `GABUNG` · `PROGRES` · `MANUAL` · `MIGRASI`. `refProgres` tetap khusus GR otomatis, sehingga *Batal BK* tidak membatalkan barang fisik yang diterima manual.
- **`gtSinkronGudang` diganti** dan sekarang menjangkau GR otomatis **dan** GR manual tertaut. Tanggal mengikuti `tanggalBA`; tanggal fisik lama disimpan di `tanggalAwal`, dan `tanggalSumber` berisi "BAPM <nomor>". Validasi lama tetap berlaku (tidak lebih awal dari Bon, saldo Kartu Gudang tidak boleh minus). Fungsi ini dipakai oleh `bkTanggal`, `blSimpan`, GR otomatis dan sinkron massal.
- **`gudangOtomatisProgres`**:
  - baris BAPM ganda untuk item Bon yang sama dijumlah;
  - GR manual yang sudah terhitung "diterima" ditautkan ke BK (oldest-first, hanya baris yang muat utuh), lalu disinkronkan.
- **Guard `gudangTerimaBon` / `gudangMasukSimpan`**: jika item tertaut ke BK yang sudah punya tanggal BA dan `tanggal ≠ tanggalBA`, aksi **DITOLAK** dengan pesan `ANOMALI TANGGAL`. Admin dapat memaksa dengan `izinBedaTanggal` dan alasan minimal 12 karakter. Baris tersebut ditandai `anomaliTanggal` dan dicatat di Log.
- **Aksi baru:**
  - `gudangCekTanggalBA` (baca) — uji konsistensi gudang sebelum BAPM terbit.
  - `gudangAuditTanggalBA` (baca).
  - `gudangMigrasiTanggalBA` (khusus Admin; `dryRun` bawaan, konfirmasi `SINKRONKAN`).

### Aplikasi: Pembaruan 2.10.32 (`sumber/pembaruan-2.10.32-tanggal-bapm.js`, blok MP21032)

- **Terbit BAPM dan simpan tanggal BA dari Input Progres** diuji dulu ke `gudangCekTanggalBA`. Jika tidak konsisten, BAPM **ditolak terbit** (bukan sekadar peringatan).
- **Terima Bon** menampilkan "Tanggal 01/BAPM…: 05/11/2026 — tanggal terima wajib sama" beserta tombol **Pakai tanggal BAPM**. Jika ada anomali dan penggunanya Admin, aplikasi meminta alasan.
- **Kartu Gudang dan Laporan Harian Gudang**: tanggal tampil diambil dari `tanggalBA` BK yang tertaut. Selama data di server masih berbeda, baris diberi tanda ⚠ dan muncul pita peringatan. Keterangan GR manual tertaut kini memuat nama vendor, bukan "-".
- **Audit tanggal BAPM** (menu Penerimaan Material): daftar perubahan tanggal, usulan tautan GR manual lama, penolakan, dan BAPM tanpa tanggal BA.

## 3a. Audit kode: semua jalur yang membuat atau mengubah tanggal GR

| Jalur | Fungsi | Status |
|---|---|---|
| GR otomatis dari progres | `gdOtomatisProgres` | Disinkronkan ke tanggal BA. Baris ganda dijumlah. GR manual yang terhitung ikut ditautkan. |
| Terima Bon / Penerimaan per item | `gdTerimaBon`, `gdMasukSimpan` | Guard `ANOMALI TANGGAL` dan tautan `refBA`. |
| Lengkapi foto (GR otomatis) | MP2100 `#mp2100OtoTgl` → `bkTanggal` | **Celah ditutup.** Isian tanggal dulu bisa *menimpa* tanggal BAPM dari sisi gudang. Sekarang terkunci sama dengan tanggal BAPM. |
| Simpan tanggal BA (Input Progres / Paket Tagihan) | `bkTanggal`, `blSimpan` | Divalidasi (saldo dan Bon). Bila gagal, BK tidak berubah. |
| Terbit BAPM | `saveProgres{terbit}` | Diuji dulu ke `gudangCekTanggalBA`. **Celah ditutup:** terbit ulang dengan tanggal lain saat tagihan sudah DIAJUKAN/DIBAYAR kini ditolak (dulu hanya peringatan). |
| Cetak BA tanpa terbit | `cetakBA` | **Celah ditutup.** Pencetakan ditolak bila tanggal pratinjau berbeda dari tanggal BAPM tersimpan. |
| Pembersihan / urungkan pembersihan gudang | `gaBersihkan`, `gaUrung` | Urungkan kini menegakkan kembali tanggal BAPM. |
| Impor migrasi gudang lama | `migImpor` | Bukan transaksi BAPM. Dilaporkan sebagai "migrasi" di audit material; duplikat ditangani audit 1.10.11. |
| Batal BK | `sbBatalProgres` | Hanya membatalkan GR otomatis (`refProgres`); GR manual tidak ikut batal. |

## 3b. Audit seluruh material

`gudangAuditTanggalBA` memeriksa **setiap material** yang punya GR atau tercantum di BAPM (dari item Register). Kode masalah yang dilaporkan:

| Kode | Arti |
|---|---|
| `BEDA_TANGGAL` | Tanggal GR berbeda dari tanggal BAPM |
| `GR_BELUM_TERTAUT` | GR manual belum tertaut ke BAPM (ada usulan BAPM) |
| `GR_KURANG_DARI_BAPM` / `GR_MELEBIHI_BAPM` | Qty GR tertaut tidak sama dengan volume BAPM |
| `BAPM_BARIS_GANDA` | Satu BAPM memuat lebih dari satu baris untuk material yang sama |
| `BAPM_TANPA_TANGGAL` | BAPM sudah terbit/bernomor tetapi belum bertanggal BA |
| `SINKRON_DITOLAK` | Penyamaan tanggal ditolak (saldo minus / sebelum tanggal Bon) |
| `ANOMALI_DIPAKSA` | Beda tanggal yang dipaksa Admin |
| `TANGGAL_MASA_DEPAN` | Tanggal GR di masa depan |
| `SEBELUM_BON` | Tanggal GR sebelum tanggal Bon |
| `BK_HILANG` | GR tertaut ke BK yang sudah tidak ada |

Hasilnya tampil di panel Audit tanggal BAPM dan dapat diunduh sebagai CSV.

### Audit offline SEBELUM modul diterbitkan

Alat ini menjalankan logika server 1.10.21 yang sama persis pada **ekspor Spreadsheet proyek**. Tidak ada yang ditulis ke Google.

1. Buka Google Spreadsheet proyek, lalu pilih File › Download › Microsoft Excel (.xlsx).
2. Jalankan:

```bash
node alat/audit-tanggal-bapm.js Monitoring-SAP.xlsx --proyek 1726012
```

Keluaran:
- Ringkasan di konsol: material OK / ANOMALI per kode masalah, serta **simulasi kondisi sesudah migrasi** dengan semua usulan disetujui (dijalankan pada salinan di memori).
- Laporan Excel `…-AUDIT-TANGGAL-BAPM.xlsx` berisi sheet Ringkasan, Material (sekarang), Material (sesudah migrasi), Perubahan tanggal, Usulan tautan, Ditolak, dan BAPM tanpa tanggal.
- Kode keluar `1` berarti masih ada anomali sesudah simulasi migrasi, yang perlu tindakan data seperti koreksi BAPM, barang belum diterima, atau baris ganda.

Kriteria "selesai": material ANOMALI sesudah migrasi = 0, atau yang tersisa hanya kode yang memang bukan masalah tanggal dan sudah dikonfirmasi:
- `GR_KURANG_DARI_BAPM` karena barang memang belum datang;
- `BAPM_BARIS_GANDA` yang memang disengaja.

## 3c. Koreksi transaksi gudang dari Kartu Gudang (Admin) — 1.10.23 / 2.10.34

Di bawah tabel Kartu Gudang tampil **"Transaksi material ini — koreksi & tautan BAPM"**. Isinya semua transaksi material yang dibuka, beserta jenis, status tautan BAPM, dan status (termasuk yang batal).

| Jenis transaksi | Koreksi | Tautkan BAPM |
|---|---|---|
| Masuk · migrasi | Penuh: tanggal, qty, kode/nama/satuan, harga, No SJ, keterangan; batalkan / pulihkan / kembalikan data impor asli | Ya |
| Masuk · Terima Bon | Tanggal (tidak sebelum tanggal Bon) & keterangan. Untuk qty/material: batalkan lalu catat ulang, karena volume Bon dijaga | Ya |
| Masuk · otomatis BAPM | Tidak (mengikuti tanggal BAPM; ubah lewat Preview BA / Input Progres) | — |
| Keluar (GI) | Migrasi: penuh. Biasa: tanggal, untuk, penerima, keterangan | — |

**Tautkan BAPM** membuka dialog pilihan BAPM; usulan audit sudah terpilih otomatis. Isi alasan, lalu tanggal penerimaan disamakan dengan tanggal BAPM (tanggal lama disimpan, saldo dicek, dan tercatat di Log).

Baris status panel menampilkan versi aplikasi dan apakah Modul server sudah aktif. Bila tertulis "Modul server belum aktif", unggah dan terbitkan modul server terlebih dahulu.

### Koreksi data migrasi — rincian pengaman (sejak 1.10.22)

Untuk kesalahan yang terjadi saat **Impor Migrasi gudang lama** (salah tanggal, qty, material, harga, dsb.):

1. Buka **Kartu Gudang**, lalu pilih material dan periodenya.
2. Di bawah tabel tampil **"Transaksi migrasi gudang lama — material ini"**, yaitu semua GR/GI migrasi material tersebut, termasuk yang sudah dibatalkan.
3. Klik **Koreksi** pada baris yang salah, ubah isiannya, isi **alasan** (min. 12 karakter), lalu klik **Simpan koreksi**.

Tombol lain di form koreksi:
- **Batalkan transaksi** dan **Pulihkan transaksi**.
- **Kembalikan data impor asli** — muncul bila transaksi sudah pernah dikoreksi.

| Pengaman | Perilaku |
|---|---|
| Hak akses | Khusus Admin; peran lain hanya melihat daftar |
| Hanya baris migrasi | Transaksi biasa (Terima Bon / GR otomatis) tidak bisa diubah lewat fitur ini |
| Saldo | Koreksi ditolak bila saldo Kartu Gudang material lama **atau** material baru menjadi minus; tidak ada data yang berubah |
| Tanggal BAPM | GR migrasi yang tertaut BAPM tanggalnya terkunci. Centang **Lepas tautan BAPM** (beralasan) bila tautannya salah |
| Tabrakan | Versi dicek; jika Admin lain baru saja mengubah baris yang sama, muncul pesan KONFLIK dan Anda diminta memuat ulang |
| Jejak | `asliImpor` (data impor asli) dan `riwayatKoreksi` (maks. 30) disimpan di kolom DATA; Log mencatat `KOREKSI MIGRASI GUDANG` beserta alasan |

## 4. Migrasi data lama (contoh 30-Sep → 05-Nov)

Data tersimpan di Google Sheets (`<ID>_GudangMasuk`, kolom DATA berisi JSON), bukan database SQL. Karena itu migrasi berupa aksi server yang memakai validasi yang sama, bukan query SQL.

**Cara A — di aplikasi (disarankan):** buka Penerimaan Material › **Audit tanggal BAPM** › centang usulan (misalnya *Environment Meter 30/09/2026 → 01/BAPM… 05/11/2026*) › **Terapkan migrasi** › ketik `SINKRONKAN`.

**Cara B — konsol peramban (Admin, setelah login):**

```js
// 1) uji (tidak menulis apa pun)
const uji = await regAksi('gudangMigrasiTanggalBA', { data: { dryRun: true } });
console.table(uji.perubahan); console.table(uji.usulan); console.log(uji.galat);
// 2) terapkan: tautan pasti + usulan yang sudah diperiksa
const tautan = uji.usulan.map(z => ({ grId: z.grId, bkId: z.bkId }));   // saring dulu bila perlu
const hasil = await regAksi('gudangMigrasiTanggalBA', { data: { dryRun: false, konfirmasi: 'SINKRONKAN', tautan } });
console.log(hasil.ditulis, 'baris GR diperbarui', hasil.galat);
```

Aturan migrasi:

- **Tautan pasti** (GR manual yang menggabungkan GR otomatis) selalu diterapkan, termasuk lewat tombol *Sinkron tanggal BAPM* biasa.
- **Usulan** (GR manual dengan material sama dengan GR milik BAPM bertanggal BA) hanya diterapkan bila dipilih Admin. Kapasitas dicek terhadap volume BAPM dari item Register.
- Satu BAPM yang gagal validasi (saldo minus, lebih awal dari Bon) dilewati tanpa menghentikan BAPM lain dan dilaporkan di `galat`.
- Tidak ada data yang dihapus: `tanggalAwal` menyimpan tanggal lama, dan setiap perubahan tercatat di Log (`MIGRASI TANGGAL BAPM`).

## 5. Pemasangan (urutan aman)

1. **Sebelum terbit:** ekspor Spreadsheet, jalankan `node alat/audit-tanggal-bapm.js <ekspor.xlsx>`, lalu tinjau laporan Excel (lihat bagian 3b).
2. Admin › Diagnostik sistem › Modul server › unggah `server-modul-1.10.23.json` › uji › terbitkan.
3. Unggah paket `pembaruan-2.10.34.json`.
4. Buka Penerimaan Material › **Audit tanggal BAPM** dan jalankan migrasi (usulan sesuai hasil tinjauan langkah 1).
5. Jalankan audit lagi. Hasilnya harus sama dengan simulasi "sesudah migrasi" pada laporan offline.

Rakit ulang:

```bash
python3 alat/rakit-modul-1.10.21.py server-modul-1.10.20.json sumber/modul-1.10.21-tanggal-bapm.js sumber/catatan-modul-1.10.21.txt server-modul-1.10.23.json 1.10.22
```

```bash
python3 alat/rakit-pembaruan.py pembaruan-2.10.31.json sumber/pembaruan-2.10.32-tanggal-bapm.js sumber/pembaruan-2.10.32-tanggal-bapm.css 2.10.33 sumber/catatan-2.10.33.txt pembaruan-2.10.34.json
```

Uji:

```bash
node uji/uji_tanggal_bapm.js
```

```bash
node uji/ui21032.js
```

```bash
node uji/uji_audit_offline.js
```

Uji di **aplikasi asli** (HTML dasar dari pengguna; tidak di-commit karena berisi data proyek):

```bash
node uji/ui_aplikasi_asli.js /path/index.html pembaruan-2.10.34.json server-modul-1.10.23.json /folder/tangkapan
```

Catatan: galat *Maximum call stack size exceeded* pada `fab`/`aiTutup` (tombol Asisten AI) sudah ada di 2.10.31, bukan dari blok ini.

## 6. Temuan lain di BAPM yang sama (perlu ditindaklanjuti di data)

- **Baris ganda:** *Environment Meter 5in1 pro Krisbow* muncul di baris 1 dan 13 (masing-masing 1 PC, Rp 5.800.000). Pastikan memang 2 unit, bukan entri ganda di kontrak.
- **Vol. Kontrak 0** untuk semua item, dan kolom % juga 0. Item BAPM tampaknya tidak terbaca dari volume kontrak/PO, sehingga persentase progres tidak terhitung. Periksa item kontrak 065/SPM di Register.
