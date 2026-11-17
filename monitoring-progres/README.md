# Monitoring Progres Harian & Rapat Action Plan – JIAT

Aplikasi web satu halaman (HTML5 + Tailwind CSS + JavaScript murni + SheetJS/xlsx-js-style) untuk memantau progres harian proyek konstruksi per item pekerjaan dan per SBD (sumur bor dalam). Aplikasi berjalan sepenuhnya di browser: semua pustaka sudah disertakan di folder ini, jadi tetap jalan tanpa internet.

## Menjalankan
- Buka `index.html` langsung di browser, **atau**
- deploy folder ini ke Netlify (lihat `netlify.toml`, tanpa langkah build).

Pertama kali dibuka: klik **Impor JSON** (atau seret file `.json` ke halaman) → **Ganti seluruh data**.
Data tersimpan di localStorage browser. Lakukan **Ekspor JSON → Data lengkap** secara berkala sebagai cadangan.

## Menu
| Menu | Isi | Excel |
|---|---|---|
| Dashboard | KPI (Total Bobot Progres, Target vs Realisasi, Isu Kritis Aktif, SBD), Kurva S, Agenda Rapat, Rekap per Divisi, Target Harian per Item | Ringkasan, Target Harian, Agenda Rapat, Kurva S |
| Progres Harian | Input volume harian per item, bisa ditandai per SBD; kumulatif & % otomatis | Laporan Harian (format BOQ + progres, subtotal per divisi, tanda tangan) + Matriks Harian |
| Daftar Isu | Isu/permasalahan, prioritas, PIC, target, status, sorotan keterlambatan | Daftar Isu |
| SBD Wells | Status per sumur, kedalaman bor (dari entri Pilot Hole), tim, vendor | Status SBD + Progres per SBD |
| Pengadaan | Stok, Material on Site (MOS), sisa kebutuhan | Pengadaan |

## Mode Rapat Pelaksana
Tombol di header. Saat aktif, kolom **Harga Satuan** dan **Jumlah Harga** serta seluruh nilai Rupiah tidak dimuat ke tampilan, tidak dimasukkan ke Excel, dan tidak ikut dalam ekspor JSON (harga diganti field `bobot`).

## Rumus
- Bobot item = (volume × hargaNego) / Σ(volume × hargaNego). Jika file tidak memuat harga, dipakai field `bobot`.
- Progres kumulatif item = min(Σ volume harian s.d. tanggal / volume kontrak, 100%).
- Rencana s.d. tanggal = `targetVolDes` dibagi rata (linier) dari `mulai`→`selesai` item, atau dari `baselineMulai`→`baselineAkhir` proyek.
- Target harian = `targetVolDes` / jumlah hari jendela.
- Deviasi = realisasi − rencana (bobot).

## Struktur JSON (schemaVersion 3, kompatibel dengan versi 2)
```jsonc
{
  "aplikasi": "jiat-monitoring", "schemaVersion": 3,
  "project":   { "nama", "targetDes", "baselineMulai", "baselineAkhir", "pekerjaan?", "satker?", "lokasi?", "sumberDana?", "kontraktor?", "noKontrak?", "ttdJab1..3?", "ttdNama1..3?" },
  "divisions": [{ "id", "no", "kode", "nama", "pic", "kendala", "tindakLanjut", "dueDate", "statusAction" }],
  "items":     [{ "id", "divisionId", "subbagian", "uraian", "satuan", "volume", "hargaNego", "targetVolDes", "mulai", "selesai", "bobot?" }],
  "progress":  [{ "id": "itemId:tanggal[:sbd]", "itemId", "tanggal", "sbd": "", "volume", "diinputOleh", "updatedAt" }],
  "dailyNotes":[{ "id", "tanggal", "divisionId", "itemId", "sbd", "kategori", "uraian", "dampak", "tindakLanjut", "pic", "dueDate", "prioritas": "KRITIS|TINGGI|SEDANG|RENDAH", "status": "OPEN|PROGRESS|CLOSED" }],
  "procurement":[{ "id", "kelompok", "uraian", "itemId", "stock2026", "mos", "catatan" }],
  "wells":     [{ "id", "sbd", "kabupaten", "tanah", "rekomtek", "tim", "vendorPemboran", "status", "catatan" }]
}
```
**Impor** punya dua pilihan: *Ganti seluruh data*, atau *Gabungkan (pembaruan)*. Pilihan kedua memperbarui data yang id-nya sama dan menambahkan data baru. Field yang tidak ada di file tidak ikut berubah, jadi file tanpa harga tidak menghapus harga yang sudah tersimpan.
**Ekspor → Pembaruan harian** hanya berisi progres pada tanggal laporan, ditambah isu, SBD, dan pengadaan. Pengawas lapangan cukup mengirim file ini untuk digabungkan.

## Mengubah tampilan
Kelas Tailwind sudah dikompilasi ke `styles.css`. Setelah mengubah kelas di `index.html`/`app.js`:
```bash
npx tailwindcss@3 -c tailwind.config.js -i src/input.css -o styles.css --minify
```
