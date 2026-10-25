# Deploy kit — app-modular (Monitoring SAP)

Salin folder `deploy-kit/` ke dalam `app-modular/` Anda, lalu:

| File | Fungsi |
|---|---|
| `deploy.sh` / `deploy.ps1` | 1 perintah: bangun `dist/` → periksa keamanan & URL API → (opsional) clasp → Netlify → uji asap |
| `scripts/cek-konfigurasi.js` | gagal bila URL API placeholder/`/dev`, ada pola API key di frontend, file wajib hilang, atau `?action=ping` gagal |
| `netlify.toml` | header keamanan (CSP mode lapor-saja), cache `index.html`/`sw.js`/`config.js` selalu dicek ulang |
| `github-actions-deploy.yml` | CI/CD: PR → pratinjau, push `main` → produksi (salin ke `.github/workflows/deploy.yml`) |
| `apps-script/Pemantauan.gs` | backup harian (14 salinan), cek kesehatan tiap jam, email peringatan — tambahkan sebagai file baru di project Apps Script |
| `contoh/api.js` | pemanggil API yang benar dari Netlify (POST `text/plain`, batas waktu, coba ulang) |

## Sekali saja
1. Di `assets/js/libs/config.js` tulis `API_URL: '__API_URL__'` (dan `VERSI: '__VERSI_BUILD__'` bila perlu) — URL asli diisi saat deploy, tidak disimpan di Git.
2. `npx netlify-cli@17 login` lalu `npx netlify-cli@17 link` (atau set `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID`).

## Setiap deploy
```bash
export API_URL="https://script.google.com/macros/s/<ID>/exec"
./deploy-kit/deploy.sh --cek      # periksa saja
./deploy-kit/deploy.sh            # pratinjau
./deploy-kit/deploy.sh --prod     # produksi
```
Windows: `$env:API_URL="…"; .\deploy-kit\deploy.ps1 -Prod`

Diuji pada aplikasi tiruan: tanpa `API_URL`, URL `/dev`, API key di `ai-agent.js`, dan server tak terjangkau → deploy dibatalkan dengan pesan jelas; konfigurasi benar → `dist/` hanya berisi file publik (`scripts/`, `docs/`, `*.sh` tidak ikut). `Pemantauan.gs` diuji dengan tiruan Apps Script (pemicu, rotasi 14 backup, peringatan 85 % sel, jeda email 6 jam, backup macet).
