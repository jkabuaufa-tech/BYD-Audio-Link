# Otomasi n8n — Monitoring Pengadaan (SAP)

Alur n8n untuk Web App Monitoring Pengadaan (kernel Code.gs 2.5.x · **modul server 1.8.6** · **aplikasi 2.5.8**).
n8n **tidak menggantikan** pemicu Apps Script (Notifikasi & Tim AI tetap berjalan di server). n8n mengurus
orkestrasi, pelaporan lintas kanal, log audit, dan alert bila otomasi gagal.

| Berkas | Isi | Pemicu |
|---|---|---|
| `alur-1-laporan-harian.json` | Ping → gerbang login → Verifikasi Tagihan, Kantor AI, Notifikasi → skor prioritas → Telegram + Email + Google Sheets | Senin–Sabtu 07.30 WIB + manual |
| `alur-2-webhook-perintah.json` | Endpoint aman untuk perintah daftar putih (`ringkas`, `kantor`, `diagnostik`, `notifikasi`, `timjalan`, `verifikasi`) | POST webhook + header rahasia |
| `alur-3-penangan-galat.json` | Error workflow: alert Telegram berisi alur, node, pesan & tautan eksekusi | Saat alur 1/2 gagal |
| `sumber/*.js` | Kode Code node (terbaca & teruji) | — |
| `alat/rakit-alur.py` | Merakit ketiga JSON dari `sumber/` | `python3 alat/rakit-alur.py` |
| `uji/uji-code-node.js` | 10 cek logika Code node dengan jawaban tiruan modul 1.8.6 | `node uji/uji-code-node.js` |

## Diagram alur 1

```
Jadwal 07.30 / Manual
   └─ Konfigurasi ─ Ping Server ─ Server Hidup? ──tidak──► Stop: Server Tidak Menjawab
                                     └─ya─ Diagnostik Server ─ Gerbang Login ──ditolak──► Stop (cegah akun terkunci)
                                              └─ Ringkasan Verifikasi Tagihan ─ Ringkasan Kantor AI ─ Akun Admin? ─ (Pratinjau Notifikasi)
                                                     └─ Susun Laporan ─┬─ Pecah Pesan ─ Kirim Telegram
                                                                       ├─ Kirim Email
                                                                       └─ Siapkan Baris Log ─ Catat ke Google Sheets
```

Semua panggilan ke server adalah **aksi baca** (`diagServer`, `vtRingkas`, `timRingkas`, `notifInfo`): tidak mengubah
data dan tidak memakai kuota AI. Skor prioritas: Kritis ×3 + Butuh revisi + butir merah notifikasi + eskalasi Kantor AI ×2
→ 🟢 NORMAL / 🟡 PERHATIAN / 🔴 TINGGI (subjek email diberi awalan tingkat).

## Langkah pemasangan

### 0. Prasyarat di aplikasi Monitoring
1. Pasang paket terbaru lewat aplikasi (bukan lewat n8n): Diagnostik sistem › Modul server › `server-modul-1.8.6.json`;
   Pengguna & Proyek › Pembaruan › `pembaruan-2.5.8.json`.
2. Deployment Web App: *Execute as: Me*, *Who has access: Anyone* (sama seperti untuk aplikasi). URL `/exec` sudah diisi di node Konfigurasi.
3. Buat **akun khusus bot**, mis. `BOT N8N`, PIN panjang & acak, akses hanya ke proyek terkait.
   - Peran **Admin** diperlukan untuk `notifInfo` (kontrak ≤ 30 hari, dokumen vendor, tagihan, gudang). Bila tidak ingin
     memberi Admin, pakai peran Pengadaan dan set `akunAdmin = false` di Konfigurasi (bagian notifikasi dilewati).
   - Jangan pakai akun pribadi: semua aksi bot tercatat di Log server atas nama akun ini.

### 1. Kredensial n8n (Settings › Credentials)
| Nama kredensial (harus sama) | Tipe | Isi |
|---|---|---|
| `Monitoring SAP – Akun Bot` | **Custom Auth** | `{"body": {"nama": "BOT N8N", "pin": "PIN_BOT"}}` |
| `Telegram – Bot Laporan Monitoring` | Telegram API | token bot dari @BotFather |
| `SMTP – Email Laporan` | SMTP | server email kantor (atau ganti node dengan Gmail) |
| `Google Sheets – Log Otomasi` | Google Sheets OAuth2 | akun Google pemilik spreadsheet log |
| `Webhook Monitoring SAP – Header` | Header Auth | Name `X-Kunci-Monitoring`, Value = string acak ≥ 32 karakter |

Nama & PIN hanya ada di kredensial terenkripsi — tidak tersimpan di node atau di berkas JSON alur. Custom Auth
menggabungkan `nama` & `pin` ke body JSON setiap panggilan (`{action, proyek, data}` + `{nama, pin}`).

### 2. Impor & isi
1. Workflows › *Import from File* → impor ketiga berkas; pilih kredensial di setiap node yang bertanda merah.
2. Node **Konfigurasi** (alur 1 & 2): `proyek` (ID proyek di aplikasi), `namaProyek`, `telegramChatId`, `emailPengirim`,
   `emailTujuan` (pisah koma), `urlAplikasi` (opsional), `akunAdmin`.
3. Alur 3, node *Alert Telegram*: isi `chatId` Admin.
4. Alur 1 & 2 › Settings › **Error Workflow** = `Monitoring SAP · 3 · Penangan Galat`.
5. Log Google Sheets (opsional): buat spreadsheet, tab `Log n8n`, baris 1:
   `waktu | proyek | tingkat | skor | butuhRevisi | kritis | kedaluwarsa | lolos | notifMerah | notifTotal | eskalasiAI | versiServer | versiModul | peringatan | eksekusi`
   → tempel URL di node *Catat ke Google Sheets* → aktifkan node (bawaan nonaktif).

### 3. Uji lalu aktifkan
1. Alur 1 › *Test workflow* (Jalankan Manual). Periksa: Ping `ok: true`, Gerbang Login lolos, pesan Telegram & email tiba.
2. Alur 2: `curl -X POST https://<n8n>/webhook-test/monitoring-sap/perintah -H "X-Kunci-Monitoring: <rahasia>" -H "Content-Type: application/json" -d '{"perintah":"ringkas"}'`
3. Uji alur 3: ubah PIN di kredensial menjadi salah, jalankan alur 1 sekali → alert `[LOGIN DITOLAK]` tiba. Kembalikan PIN.
4. Aktifkan (toggle *Active*) alur 1, 2, 3.

## Perintah webhook (alur 2)

| `perintah` | Aksi server | Catatan |
|---|---|---|
| `ringkas` | `vtRingkas` | status semua hasil Verifikasi Tagihan |
| `kantor` | `timRingkas` | ringkasan Kantor AI (saran, antrean input, eskalasi) |
| `diagnostik` | `diagServer` | versi, modul, jumlah baris per sheet |
| `notifikasi` | `notifInfo` | khusus akun Admin |
| `timjalan` | `timJalan` | menjalankan Tim AI sekarang → **memakai kuota AI**, jeda 5 menit di server |
| `verifikasi` + `id` | `vtNilai` | menilai ulang tagihan dari hasil baca tersimpan (tanpa biaya AI) |

Aksi tulis (`savePBJ`, `keuanganProgres`, `checklistVerifikasi`, `aiTerapkan`, …) **sengaja tidak dibuka**: keputusan bayar
dan perubahan data tetap lewat aplikasi dengan persetujuan manusia, sesuai prinsip gerbang Verifikasi Admin.

## Rekomendasi agar lebih profesional

**Keamanan & tata kelola**
1. **Akun bot terpisah, hak minimum, PIN dirotasi** tiap 90 hari; catat pemilik akun bot di SOP (siapa PIC, siapa penyetuju).
2. **Gerbang Login sudah dipasang**: kernel mengunci akun 5 menit setelah 5× gagal; alur berhenti pada penolakan pertama
   dan *retry* hanya untuk galat jaringan, bukan PIN salah.
3. **Tidak ada aksi tulis dari n8n.** Bila kelak perlu (mis. update status bayar dari sistem keuangan), lewatkan via
   `aiAksi` → usulan bertoken → `aiTerapkan` oleh manusia, bukan memanggil `keuanganProgres` langsung.
4. Simpan cadangan `N8N_ENCRYPTION_KEY`; tanpa itu kredensial tidak bisa dipulihkan setelah migrasi server.
5. Webhook hanya lewat HTTPS + header rahasia; batasi IP di reverse proxy bila n8n di-*self-host*.

**Keandalan**
6. **Jangan gandakan jadwal AI.** Tim AI & Notifikasi sudah punya pemicu di Apps Script (maks. 6 jam/hari). n8n cukup
   membaca hasilnya; `timjalan` hanya on-demand. Ini menjaga kuota AI, kuota `UrlFetchApp` dan kuota email MailApp.
7. Batas Apps Script 6 menit per panggilan → timeout HTTP 120 detik (baca) dan 330 detik (`timJalan`).
8. Pantau **kecocokan versi**: laporan memberi ⚠️ bila modul di server lebih lama dari `versiModulMinimal` (1.8.6).
   Naikkan nilai ini setiap kali memasang modul baru.
9. Error workflow wajib aktif; tinjau *Executions* yang gagal setiap Senin.

**Operasional & pelaporan**
10. Gunakan **bot Telegram terpisah** dari bot Notifikasi aplikasi (fitur *Cari chat* aplikasi memakai `getUpdates`, yang
    bentrok bila bot yang sama dipasang webhook n8n).
11. Kirim laporan ke **grup** (Kapro, Kasi Keuangan, Kasi Pengadaan, Kasi DanLoglat), bukan ke pribadi, agar ada jejak bersama.
12. Log Google Sheets menjadi **jejak audit KPI**: tren jumlah tagihan butuh revisi, waktu tunggu verifikasi, eskalasi
    — bahan rapat koordinasi mingguan & evaluasi kinerja vendor.
13. Kelola alur di git: ubah `sumber/*.js` → `python3 alat/rakit-alur.py` → `node uji/uji-code-node.js` → impor ulang.
    Beri nama versi alur mengikuti modul (mis. "1.8.6") pada deskripsi commit.
14. Multi-proyek: duplikasi alur 1 per proyek (ubah `proyek` & penerima) atau ganti node Konfigurasi dengan daftar
    proyek + *Loop Over Items*; jalankan berurutan agar tidak membebani kuota Apps Script.

## Batasan yang diketahui
- Diuji pada logika Code node (10 cek) dan validasi nama parameter/versi node terhadap `n8n-nodes-base` 1.95. Panggilan
  nyata ke Web App belum diuji dari lingkungan pembuatan (jaringan ke `script.google.com` diblokir) — lakukan langkah Uji di atas.
- `notifInfo` dan `aiDiagKunci` khusus Admin; `timJalan` & `vtNilai` khusus Pengadaan/Admin.
