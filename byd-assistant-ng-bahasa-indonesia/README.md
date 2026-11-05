# Dukungan Bahasa Indonesia untuk BYD Assistant NG

Kontribusi untuk proyek open-source [3freet/BYD-Assistant-NG](https://github.com/3freet/BYD-Assistant-NG):
menambahkan **Bahasa Indonesia** pada antarmuka aplikasi dan pada percakapan suara asisten.
Patch dibuat terhadap commit upstream `c4cbe88` (versi 1.1.0) dan sudah dicek bisa diterapkan tanpa konflik.

## Isi folder

| File | Fungsi |
| --- | --- |
| `0001-tambah-bahasa-indonesia.patch` | Patch lengkap (20 file) yang siap dikirim sebagai Pull Request ke upstream |
| `res/values-in/strings.xml` | Terjemahan seluruh teks aplikasi (±460 string), untuk ditinjau |

## 1. Bagian yang diterjemahkan / diubah

| Area | File di upstream | Perubahan |
| --- | --- | --- |
| Teks layar, pengaturan, notifikasi, banner | `app/src/main/res/values-in/strings.xml` (**baru**) | Semua string diterjemahkan, termasuk placeholder `%1$s`/`%1$d` |
| Nama bahasa di pemilih | `values/`, `values-ar/`, `values-ru/`, `values-pl/` `strings.xml` | Tambah `app_language_indonesian` dan `language_indonesian` |
| Pilihan **Bahasa aplikasi** | `util/AppLanguage.kt`, `ui/AppLanguageSelector.kt`, `ui/settings/SettingsPanesCar.kt` | Opsi `INDONESIAN` |
| Pilihan **Bahasa balasan** asisten | `data/Preferences.kt` (`AssistantLanguage`) | Opsi `INDONESIAN("id")` |
| **Instruksi sistem (system prompt)** Gemini | `gemini/ConversationShared.kt` | Lihat bagian 3 |
| Suara TTS | `audio/TextToSpeechEngine.kt` | Locale `id` |
| Nama perintah mobil di banner | `resources/vehicle_commands.json`, `vehicle/VehicleCommand*.kt` | Field `labelId` untuk 56 perintah (AC, jendela, jok, kulkas, dashcam, dll.) |
| Buka aplikasi lewat suara | `apps/AppMatcher.kt` | Kata pengisi diabaikan: "aplikasi", "buka", "jalankan", "nyalakan", "tolong" |
| Unit test & dokumentasi | `StringResourcesTest`, `AssistantSetupTest`, `VehicleCommandRegistryTest`, `CONTRIBUTING.md`, `docs/architecture.md` | Mencakup bahasa baru |

## 2. Kenapa folder `values-in`, bukan `values-id`

Android sampai sekarang masih memakai kode bahasa lama **`in`** untuk Bahasa Indonesia
(`Locale("id").language` menghasilkan `"in"`). Folder `values-in` terbaca di semua versi Android, termasuk
head unit BYD (DiLink). Karena itu kode juga menerima `"in"` maupun `"id"` saat memilih label dan nama bahasa.

## 3. Instruksi sistem untuk asisten

- **Mode Otomatis**: asisten menjawab dalam bahasa yang Anda ucapkan, dan kini Bahasa Indonesia termasuk di dalamnya.
- **Mode Indonesia**: aturan tegas "selalu jawab dalam Bahasa Indonesia", yang diulang di akhir prompt. Jika ucapan
  tidak terdengar jelas, asisten meminta Anda mengulang dalam Bahasa Indonesia.
- **Gaya bahasa natural**: bahasa sehari-hari yang sopan tapi tidak kaku, menyapa dengan "Anda", dan memakai istilah
  pengemudi Indonesia (AC, jok, kaca, setir, ban, bagasi). Asisten juga memahami bahasa informal seperti
  "nyalain AC", "matiin", "gedein volume", "kecilin dong".
- **Mengakhiri percakapan**: "sudah", "cukup", "itu saja", "terima kasih", "selesai", "batal".

## 4. Cara mengirim kontribusi ke upstream

```bash
git clone https://github.com/<akun-anda>/BYD-Assistant-NG.git   # setelah fork di GitHub
cd BYD-Assistant-NG
git checkout -b bahasa-indonesia
git am /path/ke/0001-tambah-bahasa-indonesia.patch
./gradlew testDebugUnitTest          # jalankan unit test
git push origin bahasa-indonesia     # lalu buka Pull Request ke 3freet/BYD-Assistant-NG
```

## 5. Kapan bisa dipakai di mobil

APK 1.1.0 yang sudah terpasang **tidak bisa diberi Bahasa Indonesia dengan menyisipkan file terjemahan saja**,
karena opsi bahasa di menu pengaturan ditentukan oleh kode program. Ada dua jalan:

1. **Disarankan:** kirim Pull Request ke pengembang. Setelah digabung dan dirilis, perbarui lewat
   *Pengaturan → Aplikasi → Pembaruan* di mobil. Pengaturan dan kunci API Anda tetap tersimpan.
2. **Build sendiri** dari kode yang sudah dipatch (perlu Android Studio). APK hasil build sendiri bertanda tangan
   berbeda, jadi aplikasi lama harus di-uninstall dulu. Akibatnya pengaturan dan kunci API hilang, dan pembaruan
   otomatis dari pengembang menolak memasang di atasnya.

Setelah terpasang: **Pengaturan → Aplikasi → Bahasa aplikasi → Bahasa Indonesia**, lalu
**Pengaturan → Asisten → Bahasa balasan → Indonesia** (atau *Otomatis*).
