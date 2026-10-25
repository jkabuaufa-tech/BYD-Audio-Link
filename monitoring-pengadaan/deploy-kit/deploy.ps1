# Deploy 1 perintah untuk app-modular di Windows (PowerShell 5.1 / 7). Perilaku sama dengan deploy.sh.
#
#   $env:API_URL = "https://script.google.com/macros/s/<ID>/exec"
#   .\deploy-kit\deploy.ps1            # pratinjau
#   .\deploy-kit\deploy.ps1 -Prod      # produksi
#   .\deploy-kit\deploy.ps1 -Cek       # hanya periksa
#   .\deploy-kit\deploy.ps1 -Prod -Backend   # + clasp push ke deployment yang sama ($env:GAS_DEPLOYMENT_ID)
#
# Jika muncul "running scripts is disabled": jalankan sekali  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
param([switch]$Prod, [switch]$Cek, [switch]$Backend, [switch]$TanpaPing)
$ErrorActionPreference = 'Stop'

$Skrip = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = if ($env:APP_DIR) { $env:APP_DIR } else { Split-Path -Parent $Skrip }
$Dist = Join-Path $AppDir 'dist'
$Log = Join-Path $AppDir 'deploy-log.txt'
function Langkah($t) { Write-Host "`n> $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "OK $t" -ForegroundColor Green }
function Gagal($t) { Write-Host "GAGAL $t" -ForegroundColor Red; Add-Content $Log "$(Get-Date -Format s) GAGAL $t"; exit 1 }
function Ganti($file, $lama, $baru) { if (Test-Path $file) { $isi = [IO.File]::ReadAllText($file); [IO.File]::WriteAllText($file, $isi.Replace($lama, $baru), (New-Object Text.UTF8Encoding $false)) } }

Langkah '1/6 Memeriksa alat'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Gagal 'Node.js belum terpasang (https://nodejs.org, versi LTS).' }
$major = [int](node -p "process.versions.node.split('.')[0]"); if ($major -lt 18) { Gagal "Node.js minimal 18 (sekarang $(node -v))." }
if (-not (Test-Path (Join-Path $AppDir 'index.html'))) { Gagal "index.html tidak ditemukan di $AppDir. Taruh deploy-kit di dalam app-modular\ atau set `$env:APP_DIR." }
Ok "node $(node -v) - aplikasi: $AppDir"

Langkah '2/6 Membangun dist\ (sumber tidak diubah)'
if (Test-Path $Dist) { Remove-Item $Dist -Recurse -Force }
New-Item -ItemType Directory $Dist | Out-Null
$kecuali = '\\(dist|\.git|node_modules|scripts|docs|deploy-kit)\\'
Get-ChildItem $AppDir -Recurse -File | Where-Object {
  $rel = $_.FullName.Substring($AppDir.Length)
  ($rel + '\') -notmatch $kecuali -and $_.Name -notmatch '\.(sh|ps1)$|^\.env|^deploy-log\.txt$|^\.clasprc\.json$'
} | ForEach-Object {
  $tujuan = Join-Path $Dist $_.FullName.Substring($AppDir.Length)
  New-Item -ItemType Directory (Split-Path $tujuan) -Force | Out-Null; Copy-Item $_.FullName $tujuan
}
$toml = Join-Path $Skrip 'netlify.toml'; if ((Test-Path $toml) -and -not (Test-Path (Join-Path $Dist 'netlify.toml'))) { Copy-Item $toml $Dist }
$Versi = (& git -C $AppDir rev-parse --short HEAD 2>$null); if (-not $Versi) { $Versi = Get-Date -Format 'yyyyMMddHHmm' }
$Cfg = Join-Path $Dist 'assets\js\libs\config.js'
if ($env:API_URL) {
  if ($env:API_URL -notmatch '^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$') { Gagal 'API_URL harus berbentuk https://script.google.com/macros/s/<ID>/exec (bukan /dev, tanpa spasi/garis miring di akhir).' }
  Ganti $Cfg '__API_URL__' $env:API_URL
}
foreach ($f in @($Cfg, (Join-Path $Dist 'assets\js\libs\sw.js'), (Join-Path $Dist 'sw.js'))) { Ganti $f '__VERSI_BUILD__' $Versi }
Ok "dist\ siap - versi build $Versi"

Langkah '3/6 Pemeriksaan keamanan & konfigurasi'
$pingArg = if ($TanpaPing) { @() } else { @('--ping') }
node (Join-Path $Skrip 'scripts\cek-konfigurasi.js') $Dist @pingArg; if ($LASTEXITCODE -ne 0) { Gagal 'Pemeriksaan konfigurasi gagal (lihat pesan di atas).' }
if ($Cek) { Ok 'Selesai (-Cek): tidak ada yang di-deploy.'; exit 0 }

if ($Backend) {
  Langkah '4/6 Backend Apps Script (clasp)'
  $be = Join-Path $AppDir 'backend'
  if (-not (Test-Path (Join-Path $be '.clasp.json'))) { Gagal 'backend\.clasp.json tidak ada. Jalankan sekali: cd backend; npx @google/clasp@2.4.2 clone <scriptId>' }
  if (-not $env:GAS_DEPLOYMENT_ID) { Gagal 'GAS_DEPLOYMENT_ID kosong. Tanpa ID ini clasp membuat deployment BARU = URL /exec BARU dan aplikasi putus.' }
  Push-Location $be
  try { npx --yes @google/clasp@2.4.2 push -f; if ($LASTEXITCODE) { throw 'push' }; npx --yes @google/clasp@2.4.2 deploy -i $env:GAS_DEPLOYMENT_ID -d "deploy $Versi"; if ($LASTEXITCODE) { throw 'deploy' } }
  catch { Pop-Location; Gagal 'clasp push/deploy gagal.' }
  Pop-Location; Ok 'backend diperbarui pada deployment yang sama (URL tetap)'
} else { Langkah '4/6 Backend dilewati (pakai -Backend untuk clasp)' }

Langkah ("5/6 Deploy ke Netlify (" + $(if ($Prod) { 'PRODUKSI' } else { 'pratinjau' }) + ")")
$cfgNetlify = Join-Path $env:APPDATA 'netlify\Config\config.json'
if (-not $env:NETLIFY_AUTH_TOKEN -and -not (Test-Path $cfgNetlify)) { Gagal 'Belum masuk Netlify. Set $env:NETLIFY_AUTH_TOKEN atau jalankan sekali: npx netlify-cli@17 login' }
$args2 = @('--yes', 'netlify-cli@17', 'deploy', '--dir', $Dist, '--message', "build $Versi", '--json')
if ($Prod) { $args2 += '--prod' }; if ($env:NETLIFY_SITE_ID) { $args2 += @('--site', $env:NETLIFY_SITE_ID) }
Push-Location $AppDir; $out = (& npx @args2) -join "`n"; $kode = $LASTEXITCODE; Pop-Location
if ($kode -ne 0) { Gagal 'netlify deploy gagal.' }
$j = $out.Substring($out.IndexOf('{')) | ConvertFrom-Json
$Url = if ($Prod -and $j.url) { $j.url } elseif ($j.deploy_url) { $j.deploy_url } else { $j.url }
Ok "terbit: $Url"

Langkah '6/6 Uji asap (smoke test)'
try { $r = Invoke-WebRequest "$Url/" -UseBasicParsing; if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" } } catch { Gagal "Situs tidak menjawab 200: $Url ($_)" }
$c = (Invoke-WebRequest "$Url/assets/js/libs/config.js" -UseBasicParsing).Content
if ($c -notmatch 'script\.google\.com/macros/s/') { Gagal 'config.js di situs tidak memuat URL API.' }
Ok 'situs 200 & config.js memuat URL API'
Add-Content $Log ("$(Get-Date -Format s) OK " + $(if ($Prod) { 'prod' } else { 'preview' }) + " $Versi $Url")
Ok "SELESAI -> $Url"
