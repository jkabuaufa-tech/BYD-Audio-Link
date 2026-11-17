# Perbaikan: tanggal BAPM, GR, Harian Gudang dan Kartu Gudang tidak sinkron

**Rilis:** Pembaruan aplikasi **2.10.32** + Modul server **1.10.21** (dibangun di atas 2.10.31 / 1.10.20).

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

## 5. Pemasangan

1. Admin › Diagnostik sistem › Modul server › unggah `server-modul-1.10.21.json` › uji › terbitkan.
2. Unggah paket `pembaruan-2.10.32.json`.
3. Buka Penerimaan Material › **Audit tanggal BAPM** dan jalankan migrasi.

Rakit ulang:

```bash
python3 alat/rakit-modul-1.10.21.py server-modul-1.10.20.json sumber/modul-1.10.21-tanggal-bapm.js sumber/catatan-modul-1.10.21.txt server-modul-1.10.21.json
```

```bash
python3 alat/rakit-pembaruan.py pembaruan-2.10.31.json sumber/pembaruan-2.10.32-tanggal-bapm.js sumber/pembaruan-2.10.32-tanggal-bapm.css 2.10.32 sumber/catatan-2.10.32.txt pembaruan-2.10.32.json
```

Uji:

```bash
node uji/uji_tanggal_bapm.js
```

```bash
node uji/ui21032.js
```

## 6. Temuan lain di BAPM yang sama (perlu ditindaklanjuti di data)

- **Baris ganda:** *Environment Meter 5in1 pro Krisbow* muncul di baris 1 dan 13 (masing-masing 1 PC, Rp 5.800.000). Pastikan memang 2 unit, bukan entri ganda di kontrak.
- **Vol. Kontrak 0** untuk semua item, dan kolom % juga 0. Item BAPM tampaknya tidak terbaca dari volume kontrak/PO, sehingga persentase progres tidak terhitung. Periksa item kontrak 065/SPM di Register.
