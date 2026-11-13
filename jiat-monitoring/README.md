# Monitoring Action Plan & Progres Harian – JIAT Lampung

Aplikasi web pengganti berkas `4. Monitoring Action Plan JIAT.xlsx`: input volume harian oleh staf,
rekap bobot per divisi, kurva target vs realisasi, notulen rapat action plan, pengadaan material
penting, dan daftar lokasi sumur. Seluruh rumus mengikuti Excel sumber dan diuji terhadap angkanya
(total nego **Rp 80.323.036.615,49**, target detail **30,05%**).

## Menjalankan

Tanpa instalasi: buka `index.html` di Chrome/Edge/Firefox (klik dua kali). Semua aset lokal, tidak butuh internet.

Untuk dipakai bersama di jaringan kantor, taruh folder ini di web server statis apa pun
(`npm start` menjalankan server uji di port 5173).

> Bila dibuka sebagai berkas, data tersimpan di LocalStorage *browser perangkat itu saja*. Untuk kerja
> bersama pakai **mode tersinkron** di bawah.

## Mode tersinkron otomatis (disarankan)

Aplikasi dipublikasikan sebagai artifact claude.ai dengan basis data bersama: setiap input langsung
terlihat oleh semua pengguna tanpa kirim-kiriman berkas. Berkasnya `dist/artifact/index.html`
(`js/core/sync.js` aktif otomatis bila `window.claude` tersedia; selain itu aplikasi jatuh ke mode lokal).

- **Akses** diatur pemilik lewat tombol *Share* pada halaman artifact. Pengguna harus masuk ke claude.ai.
- **Peran mengikuti tingkat Share** dan ditegakkan server: *Editor/Owner* = Admin (master BOQ, action plan
  divisi, stok, target/baseline); *Contributor* = Staf (input harian, catatan rapat, status sumur);
  *Viewer/Commenter* = hanya melihat.
- **Input harian** disimpan satu dokumen per (tanggal, pengguna), sehingga dua staf yang mengisi bersamaan
  tidak saling menimpa. Item dan tanggal yang sama diisi dua orang → entri paling baru yang dipakai.
- Deklarasi kapabilitas artifact: `db` dengan aturan `""` tulis `admin`; `progress`, `dailyNotes`, `wells`
  tulis `interact`; `user` (scope `profile`); `downloads`.
- Setelah mengubah kode: `npm run build`, lalu publikasikan ulang `dist/artifact/index.html` ke artifact yang sama.

## Membagikan sebagai berkas (mode lokal, tanpa sinkron)

Bagikan **satu berkas** `dist/JIAT-Monitoring.html` (WhatsApp, email, atau flashdisk). Staf cukup
membukanya di Chrome/Edge; tidak perlu instalasi maupun internet.

Karena data tersimpan di browser masing-masing, pakai alur berikut agar rekap tetap satu sumber:

1. **Staf** mengisi *Nama Anda*, membuka tab *Input Harian*, mengisi volume, lalu **Simpan**.
2. Di akhir hari, staf memilih **Data › Unduh data / kirim ke Admin (JSON)** dan mengirim berkasnya ke Admin.
3. **Admin** memilih **Data › Gabungkan input harian dari staf** dan memilih semua berkas kiriman sekaligus.
   Hanya volume harian dan catatan rapat yang digabung; master BOQ dan action plan Admin tidak berubah.
   Bila item dan tanggal yang sama berbeda volumenya, yang dipakai input paling baru.
4. Dashboard, ekspor Excel, dan bahan rapat diambil dari komputer Admin.

Aturan pakai: selalu buka berkas dari **lokasi dan browser yang sama** (memindah berkas ke folder lain
atau ganti browser membuat data tampak kosong — pulihkan dari cadangan JSON), jangan memakai mode
penyamaran, dan jangan menghapus data situs/riwayat browser tanpa mengunduh cadangan dulu.
Setelah mengubah kode, jalankan `npm run build` untuk memperbarui berkas `dist/`.

## Modul (tab)

| Tab | Isi | Sumber di Excel |
|---|---|---|
| Dashboard & Rekap Action Plan | KPI, kurva target vs realisasi, rekap 11 divisi + PIC/kendala/tindak lanjut/due date/status | `Rekap Action Plan` baris 1–25 |
| Input Harian & Rincian BOQ | Input volume per tanggal (validasi `CEK > BOQ`), master 189 item BOQ | `Rincian Harian` |
| Monitoring Harian & Notulen | Target/realisasi per hari, deviasi, kendala & catatan rapat | `Rekap Action Plan` baris 34–86 |
| Pengadaan & Lokasi Sumur | Stok material kritis vs target Des; SBD, tim, vendor pemboran | `Pengadaan Penting`, `Sheet1` |

**Peran** (tombol di header): *Staf* mengisi volume harian, catatan rapat harian, dan status sumur;
*Admin* juga mengubah master BOQ, action plan divisi, stok, target/baseline, serta restore/reset.
Peran ini hanya pengatur tampilan — **bukan pengaman**; otorisasi sungguhan harus di backend.

## Rumus (identik dengan Excel)

| Besaran | Rumus |
|---|---|
| Nilai BOQ, Bobot | `volume × hargaNego`; `nilai / Σ nilai` |
| Target Bobot Des | `targetVolDes / volume × bobot` |
| Realisasi s.d. tanggal | `Σ volume harian` dengan tanggal ≤ tanggal monitoring |
| Progres item, Kontribusi | `realisasi / volume`; `bobot × progres` |
| Status | `CEK > BOQ` → `SELESAI` → `TERLAMBAT` (lewat jadwal selesai) → `BERJALAN` → `BELUM MULAI` |
| Target kumulatif harian | linier: `(hari ke-n / jumlah hari baseline) × targetDes` (simulasi, sama seperti Excel) |
| Realisasi hari | `Σ (hargaNego × volume hari itu) / total nilai` |

Tanggal monitoring bawaan = hari ini (Excel memakai `TODAY()+1`); bisa diubah di header untuk simulasi.

## Struktur kode

```
index.html              urutan <script>; tambah modul = tambah satu baris
css/input.css           sumber Tailwind  →  css/app.css (hasil build, ikut di-commit)
js/data/seed.js         data awal dari Excel (dibuat tools/build-seed.py)
js/core/calc.js         SEMUA rumus; murni, tanpa DOM (dipakai juga oleh tes & bisa oleh backend)
js/core/store.js        state = seed + overlay perubahan; aksi tulis; salinan LocalStorage
js/core/sync.js         sinkron otomatis ke basis data bersama (artifact claude.ai)
js/core/ui.js           ikon, badge, modal, konfirmasi, toast
js/core/app.js          header, tab, registri modul, aksi global
js/core/export.js       ekspor Excel (SheetJS)
js/modules/*.js         satu berkas per tab
tests/calc.test.js      verifikasi rumus terhadap angka Excel
tools/                  build-seed.py (Excel → seed), build-icons.js (ikon Lucide)
```

### Menambah modul/tab baru

```js
// js/modules/k3.js  — lalu tambahkan <script src="js/modules/k3.js"> di index.html
JIAT.registerModule({
  id: 'k3', label: 'Laporan K3', icon: 'shield-check', order: 50,
  render(ctx) { return `<div class="card p-4">${ctx.state.wells.length} sumur</div>`; },
  mount(el, ctx) { /* pasang event listener */ },
});
```

`ctx` berisi `state` (data mentah), `view` (hasil `calc.compute`), `ui`, `isAdmin`, `store`, `setUI()`, `navigate()`.

### Menambah tabel/field baru

1. Tambah koleksi/field di `store.js` + aksi tulisnya.
2. Tambahkan koleksinya ke `COLS`, penggabungannya ke `rebuild()`, dan (mode tersinkron) aturan tulisnya di deklarasi `db.rules`.
3. Jika class Tailwind baru dipakai: `npm install` lalu `npm run build:css`.

Perintah pengembang: `npm test` (rumus), `npm run build` (CSS + ikon),
`python3 tools/build-seed.py "<file.xlsx>"` (bangun ulang data awal bila BOQ sumber berubah; butuh `openpyxl`).

## Struktur data

Modul membaca **state** berbentuk di bawah ini (juga format berkas cadangan JSON):

```jsonc
{
  "schemaVersion": 2,
  "project":   { "nama": "...", "targetDes": 0.3005, "baselineMulai": "2026-11-10", "baselineAkhir": "2026-12-31" },
  "divisions": [{ "id": "DIV-03", "no": 3, "kode": "III", "nama": "PEMBORAN SUMUR PRODUKSI",
                  "pic": "", "kendala": "", "tindakLanjut": "", "dueDate": null, "statusAction": "OPEN" }],
  "items":     [{ "id": "N055", "divisionId": "DIV-03", "subbagian": "PENGEBORAN", "uraian": "...", "satuan": "m",
                  "volume": 1739.92, "hargaNego": 650000, "targetVolDes": 501.9, "pic": "",
                  "mulai": "2026-11-12", "selesai": "2026-11-22", "kendala": "", "actionPlan": "", "dueDate": null }],
  "progress":  [{ "id": "N055:2026-11-11", "itemId": "N055", "tanggal": "2026-11-11", "volume": 80,
                  "diinputOleh": "Excel", "updatedAt": null }],
  "dailyNotes":[{ "tanggal": "2026-11-13", "kendala": "", "action": "", "dueDate": null, "status": "OPEN", "catatan": "" }],
  "procurement":[{ "id": "PGD-01", "kelompok": "A. Pemboran", "uraian": "...", "itemId": "N065",
                   "stock2026": 468, "mos": null, "catatan": "" }],
  "wells":     [{ "id": "SBD-31", "sbd": "SBD 31", "kabupaten": "Lampung Tengah", "tanah": "Sedang padat",
                  "rekomtek": "Rekomendasi", "tim": "TIM 1", "vendorPemboran": "Kamila", "status": "BELUM MULAI", "catatan": "" }]
}
```

Yang **disimpan dan disinkronkan** hanya *overlay* — selisih terhadap data awal Excel (`js/data/seed.js`) —
berupa dokumen kecil per koleksi (LocalStorage `jiat-monitoring:overlay`, atau basis data artifact):

| Koleksi | Id dokumen | Isi |
|---|---|---|
| `meta` | `project` | `targetDes`, `baselineMulai`, `baselineAkhir` |
| `divisions`, `procurement`, `wells` | id baris | hanya field yang boleh diubah |
| `items` | kode item | seluruh field item, atau `{ "dihapus": true }` |
| `progress` | `<tanggal>~<pengguna>` | `{ tanggal, oleh, entries: { "<kode>": { v, t, n } } }` — `v` volume (0 = dihapus), `t` waktu |
| `dailyNotes` | tanggal | kendala, action, dueDate, status, catatan |

Tanggal = `YYYY-MM-DD`; persen = pecahan (0,3005 = 30,05%). Nilai turunan (bobot, progres, status,
deviasi) **tidak disimpan** — selalu dihitung ulang oleh `calc.js`. Data dari basis data bersama
diperlakukan tidak tepercaya: tipe tiap field dirapikan di `rebuild()` sebelum dipakai.

## Migrasi ke PostgreSQL/MySQL

Setiap koleksi state = satu tabel. Buat adaptor remote baru (lihat `store.attachRemote` dan `sync.js`) yang
memanggil REST API Anda; modul tampilan dan `calc.js` tidak perlu diubah.

```sql
CREATE TABLE divisions (
  id VARCHAR(8) PRIMARY KEY, no INT NOT NULL, kode VARCHAR(8) NOT NULL, nama VARCHAR(120) NOT NULL,
  pic VARCHAR(80), kendala TEXT, tindak_lanjut TEXT, due_date DATE, status_action VARCHAR(16) NOT NULL DEFAULT 'OPEN');

CREATE TABLE boq_items (
  id VARCHAR(12) PRIMARY KEY, division_id VARCHAR(8) NOT NULL REFERENCES divisions(id),
  subbagian VARCHAR(80), uraian VARCHAR(300) NOT NULL, satuan VARCHAR(12) NOT NULL,
  volume NUMERIC(18,4) NOT NULL CHECK (volume > 0), harga_nego NUMERIC(18,2) NOT NULL CHECK (harga_nego >= 0),
  target_vol_des NUMERIC(18,4), pic VARCHAR(80), mulai DATE, selesai DATE,
  kendala TEXT, action_plan TEXT, due_date DATE, urutan INT);

CREATE TABLE daily_progress (
  item_id VARCHAR(12) NOT NULL REFERENCES boq_items(id) ON DELETE CASCADE, tanggal DATE NOT NULL,
  volume NUMERIC(18,4) NOT NULL CHECK (volume > 0), diinput_oleh VARCHAR(80), updated_at TIMESTAMP NOT NULL,
  PRIMARY KEY (item_id, tanggal));

CREATE TABLE daily_notes (
  tanggal DATE PRIMARY KEY, kendala TEXT, action TEXT, due_date DATE, status VARCHAR(16), catatan TEXT);

CREATE TABLE procurement (
  id VARCHAR(8) PRIMARY KEY, kelompok VARCHAR(60) NOT NULL, uraian VARCHAR(200) NOT NULL,
  item_id VARCHAR(12) REFERENCES boq_items(id) ON DELETE SET NULL,
  stock_2026 NUMERIC(18,4), mos NUMERIC(18,4), catatan TEXT);

CREATE TABLE wells (
  id VARCHAR(12) PRIMARY KEY, sbd VARCHAR(12) NOT NULL, kabupaten VARCHAR(60), tanah VARCHAR(40),
  rekomtek VARCHAR(60), tim VARCHAR(30), vendor_pemboran VARCHAR(60),
  status VARCHAR(16) NOT NULL DEFAULT 'BELUM MULAI', catatan TEXT);
```

## Catatan data awal

- Target Vol Des dihitung dari rumus Excel (`Vol/52×15`, dst.) lalu disimpan sebagai angka yang bisa diubah.
- Kelompok **C. Pipa Jaringan** pada *Pengadaan Penting* belum bertaut ke BOQ di Excel; di sini ditautkan ke
  N170–N178 berdasarkan kesamaan uraian, dengan stock dikosongkan.
- Kolom status sumur dan MOS adalah tambahan aplikasi (tidak ada di Excel).

Pustaka pihak ketiga: Tailwind CSS (MIT), ikon Lucide (ISC), SheetJS Community (Apache-2.0).
