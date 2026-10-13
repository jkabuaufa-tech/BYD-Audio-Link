# Ringkasan Asisten AI

- Proyek: 1726012 · Perkuatan Dermaga Barat JICT
- Pengguna: Joko Supriyono
- Diekspor: 13 Okt 2026, 03.06

## Pertanyaan

Berapa kontrak di register?

### Jawaban (OpenAI · gpt-5-mini)

Register berisi **1 kontrak**: WK-NK.KSO/PDBJ/SPM/001/2026 (PT Baja Jaya), nilai Rp 500.000.000.

| No | Vendor |
|---|---|
| 001 | PT Baja Jaya |

## Pertanyaan

Tolong buat paket PBJ semen

### Jawaban (OpenAI · gpt-5-mini)

Bon semen belum dipaketkan.

Saya menyiapkan **usulan aksi: Buat/ubah paket PBJ** (`savePBJ`). Periksa pratinjau di bawah, lalu tekan **Terapkan** untuk menjalankan atau **Batal**.
[Usulan aksi savePBJ: diterapkan — PBJ BARU · PBJ-2026-001 · Paket Semen Uji · nama: "" → "Paket Semen Uji"; noPR: "" → "7001"]

## Pertanyaan

⚡ Audit 20 kontrak dengan kelengkapan terendah

### Analisis (OpenAI · gpt-5-mini)

**Audit 20 kontrak dengan kelengkapan terendah**
Satu kontrak **belum lengkap** dan satu tagihan tertahan.

Temuan:
- [tinggi] Register WK-NK.KSO/PDBJ/SPM/001/2026 kurang RFQ, PO, TOP: Nilai Rp 500.000.000
- [sedang] Tagihan BA-001 checklist 0/25: Faktur Pajak, Invoice belum diunggah

Saran:
- Lihat ringkasan checklist (aksi checklistRingkas) — Mengetahui dokumen yang kurang [dijalankan]
- Buat paket PBJ untuk bon besi (aksi savePBJ) — Bon segera diproses [dijalankan]
- Hubungi vendor untuk faktur pajak — Dokumen lengkap [selesai]

### Hasil aksi (OpenAI · gpt-5-mini)

```json
{
 "total": 0,
 "cocok": 0,
 "baris": []
}
```

### Jawaban (OpenAI · gpt-5-mini)

Usulan dari saran **Buat paket PBJ untuk bon besi**. Periksa pratinjau, lalu tekan Terapkan atau Batal.
[Usulan aksi savePBJ: dibatalkan — PBJ BARU · PBJ-2026-002 · Paket Besi D13 · nama: "" → "Paket Besi D13"]
