# SEPS — Sistem Evaluasi & Produksi Swakelola

Aplikasi web untuk memonitor produksi harian unit swakelola proyek (Batching Plant, Stone Crusher, AMP, Galian, dll.) dan mengevaluasi otomatis apakah **Swakelola** masih efisien atau sebaiknya dialihkan ke **Beli Jadi**.

- Spesifikasi teknis lengkap: [`docs/SPESIFIKASI-TEKNIS.md`](docs/SPESIFIKASI-TEKNIS.md)
- Master data diambil dari spreadsheet monitoring Proyek Pengarah Rukoh Lanjutan.
- Harga Beli Jadi pada seed/demo adalah **contoh** — ganti dengan SPH vendor riil.

```
seps/
├── database/   001_schema.sql (DDL + view), 002_seed_master.sql (master dari spreadsheet)
├── backend/    Express API + Decision Engine (+ uji node:test)
├── frontend/   Next.js 14 + Tailwind + Recharts
└── docs/       spesifikasi teknis
```

## Menjalankan cepat (mode demo, tanpa database)

```bash
cd seps/backend && npm install && npm start
```

```bash
cd seps/frontend && npm install && npm run dev
```

Buka http://localhost:3000. Tanpa `DATABASE_URL`, API memakai data demo in-memory (13 minggu, Agt–Okt 2026).

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

Frontend membaca alamat API dari `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api/v1`, lihat `frontend/.env.example`).

## Uji

```bash
cd seps/backend && npm test
```
