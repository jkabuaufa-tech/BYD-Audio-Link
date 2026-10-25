#!/usr/bin/env bash
# Deploy 1 perintah untuk app-modular (frontend → Netlify, opsional backend Apps Script lewat clasp).
#
#   API_URL="https://script.google.com/macros/s/<ID>/exec" ./deploy.sh            # pratinjau (URL sementara)
#   API_URL="https://script.google.com/macros/s/<ID>/exec" ./deploy.sh --prod     # produksi
#   ./deploy.sh --cek                                                             # hanya periksa, tanpa deploy
#   ./deploy.sh --prod --backend                                                  # + clasp push & perbarui deployment yang sama
#
# Variabel lingkungan:
#   API_URL               URL Web App Apps Script (berakhiran /exec) → ditulis ke dist/…/config.js menggantikan __API_URL__
#   NETLIFY_AUTH_TOKEN    token pribadi Netlify (User settings › Applications) — jangan ditulis di file
#   NETLIFY_SITE_ID       Site ID (Site configuration › General) — atau jalankan sekali: npx netlify-cli link
#   GAS_DEPLOYMENT_ID     ID deployment Apps Script yang SUDAH ada (agar URL /exec tidak berubah) — untuk --backend
#   APP_DIR               folder aplikasi (bawaan: folder induk skrip ini = app-modular/)
set -euo pipefail

PROD=0; CEK=0; BACKEND=0; LEWATI_PING=0
for a in "$@"; do case "$a" in
  --prod) PROD=1 ;; --cek) CEK=1 ;; --backend) BACKEND=1 ;; --tanpa-ping) LEWATI_PING=1 ;;
  -h|--help) sed -n 2,17p "$0"; exit 0 ;;
  *) echo "Opsi tidak dikenal: $a (lihat --help)"; exit 2 ;;
esac; done

SKRIP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SKRIP/.." && pwd)}"
DIST="$APP_DIR/dist"
LOG="$APP_DIR/deploy-log.txt"
merah() { printf '\033[31m%s\033[0m\n' "$*"; }; hijau() { printf '\033[32m%s\033[0m\n' "$*"; }; langkah() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
gagal() { merah "✗ $*"; echo "$(date -Iseconds) GAGAL $*" >> "$LOG"; exit 1; }

langkah "1/6 Memeriksa alat"
command -v node >/dev/null || gagal "Node.js belum terpasang (https://nodejs.org, versi LTS)."
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]'); [ "$NODE_MAJOR" -ge 18 ] || gagal "Node.js minimal 18 (sekarang $(node -v))."
[ -f "$APP_DIR/index.html" ] || gagal "index.html tidak ditemukan di $APP_DIR. Taruh folder deploy-kit di dalam app-modular/ atau set APP_DIR."
hijau "✓ node $(node -v) · aplikasi: $APP_DIR"

langkah "2/6 Membangun dist/ (sumber tidak diubah)"
rm -rf "$DIST"; mkdir -p "$DIST"
# salin file yang boleh publik saja: skrip internal, dokumen, rahasia & git TIDAK ikut ke Netlify
( cd "$APP_DIR" && find . -type f \
    ! -path './dist/*' ! -path './.git/*' ! -path './node_modules/*' ! -path './scripts/*' ! -path './docs/*' ! -path './deploy-kit/*' \
    ! -name '*.sh' ! -name '*.ps1' ! -name '.env*' ! -name 'deploy-log.txt' ! -name '.clasprc.json' -print0 \
  | while IFS= read -r -d '' f; do mkdir -p "$DIST/$(dirname "$f")"; cp "$f" "$DIST/$f"; done )
[ -f "$SKRIP/netlify.toml" ] && [ ! -f "$DIST/netlify.toml" ] && cp "$SKRIP/netlify.toml" "$DIST/netlify.toml"
VERSI="$(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
CFG="$DIST/assets/js/libs/config.js"
if [ -n "${API_URL:-}" ]; then
  [[ "$API_URL" =~ ^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$ ]] || gagal "API_URL harus berbentuk https://script.google.com/macros/s/<ID>/exec (bukan /dev, tanpa spasi/garis miring di akhir)."
  [ -f "$CFG" ] && node -e 'const f=process.argv[1],fs=require("fs");fs.writeFileSync(f,fs.readFileSync(f,"utf8").split("__API_URL__").join(process.argv[2]))' "$CFG" "$API_URL"
fi
# cap versi build: service worker & cache browser memakai versi baru (tanpa ini pengguna bisa tertahan di versi lama)
for f in "$CFG" "$DIST/assets/js/libs/sw.js" "$DIST/sw.js"; do
  [ -f "$f" ] && node -e 'const f=process.argv[1],fs=require("fs");fs.writeFileSync(f,fs.readFileSync(f,"utf8").split("__VERSI_BUILD__").join(process.argv[2]))' "$f" "$VERSI"
done
hijau "✓ dist/ siap · versi build $VERSI"

langkah "3/6 Pemeriksaan keamanan & konfigurasi"
PING_ARG="--ping"; [ "$LEWATI_PING" = 1 ] && PING_ARG=""
node "$SKRIP/scripts/cek-konfigurasi.js" "$DIST" $PING_ARG || gagal "Pemeriksaan konfigurasi gagal (lihat pesan di atas)."
if [ "$CEK" = 1 ]; then hijau "Selesai (--cek): tidak ada yang di-deploy."; exit 0; fi

if [ "$BACKEND" = 1 ]; then
  langkah "4/6 Backend Apps Script (clasp)"
  [ -f "$APP_DIR/backend/.clasp.json" ] || gagal "backend/.clasp.json tidak ada. Jalankan sekali: cd backend && npx @google/clasp@2.4.2 clone <scriptId>"
  [ -n "${GAS_DEPLOYMENT_ID:-}" ] || gagal "GAS_DEPLOYMENT_ID kosong. Tanpa ID ini clasp membuat deployment BARU = URL /exec BARU dan aplikasi putus."
  ( cd "$APP_DIR/backend" && npx --yes @google/clasp@2.4.2 push -f && npx --yes @google/clasp@2.4.2 deploy -i "$GAS_DEPLOYMENT_ID" -d "deploy $VERSI" ) || gagal "clasp push/deploy gagal."
  hijau "✓ backend diperbarui pada deployment yang sama (URL tetap)"
else langkah "4/6 Backend dilewati (pakai --backend untuk clasp)"; fi

langkah "5/6 Deploy ke Netlify ($([ "$PROD" = 1 ] && echo PRODUKSI || echo pratinjau))"
[ -n "${NETLIFY_AUTH_TOKEN:-}" ] || [ -f "$HOME/.config/netlify/config.json" ] || gagal "Belum masuk Netlify. Set NETLIFY_AUTH_TOKEN atau jalankan sekali: npx netlify-cli@17 login"
ARGS=(deploy --dir "$DIST" --message "build $VERSI" --json); [ "$PROD" = 1 ] && ARGS+=(--prod)
[ -n "${NETLIFY_SITE_ID:-}" ] && ARGS+=(--site "$NETLIFY_SITE_ID")
OUT="$(cd "$APP_DIR" && npx --yes netlify-cli@17 "${ARGS[@]}")" || gagal "netlify deploy gagal."
URL="$(printf '%s' "$OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.url&&'"$PROD"'?j.url:j.deploy_url||j.url)})')"
hijau "✓ terbit: $URL"

langkah "6/6 Uji asap (smoke test)"
KODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL/") || true
[ "$KODE" = 200 ] || gagal "Situs menjawab HTTP $KODE (seharusnya 200): $URL"
curl -s "$URL/assets/js/libs/config.js" | grep -q "script.google.com/macros/s/" || gagal "config.js di situs tidak memuat URL API."
hijau "✓ situs 200 & config.js memuat URL API"
echo "$(date -Iseconds) OK $([ "$PROD" = 1 ] && echo prod || echo preview) $VERSI $URL" >> "$LOG"
hijau "SELESAI → $URL"
