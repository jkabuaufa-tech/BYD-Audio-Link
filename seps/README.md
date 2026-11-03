# SEPS — Sistem Evaluasi & Produksi Swakelola

Aplikasi (desktop Windows & web) untuk memonitor produksi harian unit swakelola proyek (Batching Plant, Stone Crusher, AMP, Galian, dll.) dan mengevaluasi otomatis apakah **Swakelola** masih efisien atau sebaiknya dialihkan ke **Beli Jadi**.

- **Aplikasi desktop** (pasang di komputer, server otomatis, pembaruan dengan unggah paket tanpa mengubah data): [`docs/PANDUAN-DESKTOP.md`](docs/PANDUAN-DESKTOP.md)
- Spesifikasi teknis lengkap: [`docs/SPESIFIKASI-TEKNIS.md`](docs/SPESIFIKASI-TEKNIS.md)
- Master data diambil dari spreadsheet monitoring Proyek Pengarah Rukoh Lanjutan.
- Harga Beli Jadi pada seed/demo adalah **contoh** — ganti dengan SPH vendor riil.

```
seps/
├── versi.json  versi kode (paket pembaruan) & versi installer minimum
├── database/   PostgreSQL: 001_schema.sql (DDL + view), 002_seed_master.sql
├── backend/    Express API + Decision Engine + sistem desktop (SQLite, migrasi, backup, pembaruan)
│   └── migrasi/sqlite/   migrasi desktop (hanya menambah)
├── frontend/   Next.js 14 (ekspor statis) + Tailwind + Recharts
├── desktop/    shell Electron + konfigurasi installer Windows
├── alat/       rakit-kode.js, buat-paket.js (paket pembaruan)
└── docs/       spesifikasi teknis, panduan desktop
```

## Menjalankan cepat (mode demo, tanpa database)

```bash
cd seps/backend && npm install && npm start
```

```bash
cd seps/frontend && npm install && npm run dev
```

Buka http://localhost:3000. Tanpa `DATABASE_URL`, API memakai data demo in-memory (13 minggu, Agt–Okt 2026).
Setelah `npm run build` di frontend, `npm start` di backend juga menyajikan tampilan di http://localhost:4000.

## Aplikasi desktop (pengembangan)

```bash
cd seps/frontend && npm install && npm run build
```

```bash
cd seps/desktop && npm install && npm start
```

Installer Windows & paket pembaruan dibangun otomatis oleh workflow `.github/workflows/seps-desktop.yml` (Artifacts **SEPS-windows**). Lihat [`docs/PANDUAN-DESKTOP.md`](docs/PANDUAN-DESKTOP.md).

## Dengan PostgreSQL

```bash
createdb seps
```

```bash
psql -d seps -f seps/database/001_schema.sql -f seps/database/002_seed_master.sql
```

```bash
cd seps/backend && DATABASE_URL=postgresql://user:pass@localhost:5432/seps npm run db:seed-demo
```

Langkah terakhir opsional (mengisi data demo). Lalu jalankan API dengan `DATABASE_URL` yang sama:

```bash
cd seps/backend && DATABASE_URL=postgresql://user:pass@localhost:5432/seps npm start
```

Frontend membaca alamat API dari `NEXT_PUBLIC_API_URL`: `frontend/.env.development` (`http://localhost:4000/api/v1` untuk `npm run dev`) dan `frontend/.env.production` (`/api/v1`, origin yang sama).

## Uji

```bash
cd seps/backend && npm test
```

```bash
cd seps/desktop && npm test
```
