# Asisten AI — agen, multi-penyedia & perintah cepat

Modul server **1.5.0** + Pembaruan aplikasi **2.2.8** untuk *Monitoring Pengadaan* (kernel Code.gs 2.5.1, tanpa deployment ulang & tanpa izin Google baru).

| Berkas | Untuk | Unggah lewat |
|---|---|---|
| `server-modul-1.5.0.json` | logika server (format `monitoring-sap-modul-server`, `untukKernel: "2.5"`) | Diagnostik sistem › Modul server |
| `pembaruan-2.2.8.json` | aplikasi (CSS + JS, **kumulatif**) | Pengguna & Proyek › Pembaruan |
| `pembaruan-2.2.8.patch.json` | patch 2.2.7 → 2.2.8 (8 operasi, SHA-256 sumber & hasil) | dokumentasi / `alat/terapkan-patch.py` |
| `potongan-siap-tempel-2.2.8.json` | potongan `css` & `js` (string JSON-escaped) | rujukan tempel |
| `sumber/` | kode yang dapat dibaca (bagian L modul, bagian 5 & CSS Asisten AI) | — |

> Kernel hanya menerima paket pembaruan **kumulatif** (cek `MP218_ADMIN_FIRST_MARKER`), jadi yang diunggah adalah `pembaruan-2.2.8.json`; berkas patch menunjukkan persis apa yang berubah.

## Changelog
- **Kontras panel (CSS `/* MP227 — Asisten AI */`)** — akar masalah: `--f-kartu`/`--f-garis` tidak pernah didefinisikan, sehingga di tema gelap panel tetap putih dengan teks terang warisan. Sekarang token didefinisikan di `.mp227-ai` (terang & gelap), latar solid, isi `#0B1F3A` di `#F4F6FA` (16,5:1), tanpa `filter`/`opacity`/`mix-blend-mode`/`backdrop-filter`, `text-shadow: none`.
- **Agen** — `aiTanya` (`agen:true`) memakai protokol JSON `{aksi, arg, alasan}`. 8 aksi baca dijalankan otomatis (maks. 3/pertanyaan) lewat `proses_` dengan kredensial pengguna. 4 aksi tulis (`savePBJ`, `keuanganProgres`, `gudangTerimaBon`, `simpanMasterTambahan`) → dry-run + usulan bertoken (30 menit) → `aiTerapkan` (Pengadaan/Admin; Master khusus Admin). Semua tercatat `AI-AKSI` di sheet Log.
- **Multi-penyedia** — `anthropic`, `google` (adapter khusus), `openai`, `deepseek`, `groq`, `openrouter` + penyedia tambahan OpenAI-compatible; key `AI_KEY_<PENYEDIA>`; Base URL & model bebas; dropdown `<select>` di panel.
- **Perintah Cepat** — `mode:'analisis'` → `{ringkasan, temuan[], saran[{aksi,arg,dampak}]}`; data dihitung server; kartu saran *Jalankan* / *Tandai selesai*; batas 1×/60 detik (`AI_AN_<hari>_<user>`); *Ekspor ringkasan* (.md).
- **Kompatibel** — `aiInfo` tetap mengirim `siap.claude`/`siap.gemini`; form setelan 2.2.7 tetap diterima; field `AI_SET` lama & `AI_KEY_CLAUDE`/`AI_KEY_GEMINI` tetap ditulis. Aplikasi 2.2.8 tetap berjalan dengan modul 1.4.0 (chat biasa).

## Cara uji
1. **Modul server** — Diagnostik sistem › Modul server › Unggah `server-modul-1.5.0.json` → Uji (baca saja) → Terbitkan (`LULUS UJI`). Cek `ping`: fitur berisi `asistenAgen`, `aiMultiProvider`, `aiAnalisis`.
2. **Pembaruan** — Pengguna & Proyek › Pembaruan › Unggah `pembaruan-2.2.8.json` → pratinjau Admin → menu akun › Asisten AI › ⚙️: isi API key penyedia, model, aktifkan, *Simpan & uji* (✓ per penyedia). Cek tema terang & gelap: teks isi terbaca jelas.
3. **Fungsi** — (a) tanya "Berapa kontrak di register?" → muncul chip langkah *Baca data utama proyek* lalu jawaban; (b) "Buat paket PBJ untuk bon X" → kartu Usulan + pratinjau → Terapkan (setelah diterbitkan; saat pratinjau Admin, Terapkan sengaja diblokir) → cek sheet Log `AI-AKSI`; (c) klik Perintah Cepat → kartu temuan/saran; klik lagi < 60 detik → pesan tunggu; (d) Ekspor ringkasan → berkas `.md`.

Uji otomatis (Node 18+, Playwright untuk UI) memakai Code.gs asli + tiruan layanan Google:
```
export KODE_GS=…/Code_2.5.1_Monitoring_Pengadaan.gs MODUL_140=…/server-modul-1.4.0.json
node uji/cek_paket.js && node uji/uji150.js && node uji/uji_rollback.js && node uji/ui228.js
```
Hasil terakhir: paket diterima kernel · 54 cek server · rollback 4 cek · 20 cek UI (kontras terang ≥ 7,1:1, gelap ≥ 8,5:1).

## Rollback
- **Modul server**: Diagnostik sistem › Modul server › **Rollback** (ketik `KEMBALIKAN`) → aktif kembali 1.4.0; setelan & API key Claude/Gemini tetap berfungsi. *Mengunggah ulang* `server-modul-1.4.0.json` **ditolak kernel** (versi harus lebih baru), jadi pakai tombol Rollback. Darurat: jalankan `nonaktifkanModul()` dari editor Apps Script.
- **Aplikasi**: Pengguna & Proyek › Pembaruan › Rollback ke 2.2.7.
- Data tidak berubah oleh rollback; penyedia baru (OpenAI dll.) hanya diabaikan oleh 1.4.0.
