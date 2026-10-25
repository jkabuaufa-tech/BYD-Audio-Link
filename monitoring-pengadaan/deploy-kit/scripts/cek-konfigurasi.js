#!/usr/bin/env node
// Pemeriksaan sebelum deploy (tanpa dependensi npm). Dipakai deploy.sh, deploy.ps1 dan GitHub Actions.
//   node scripts/cek-konfigurasi.js <folder-dist> [--ping]
// Gagal (exit 1) bila: URL API masih placeholder / bukan URL Web App Apps Script, ada pola API key di file frontend,
// file wajib hilang, atau (dengan --ping) server tidak menjawab ?action=ping dengan ok:true.
const fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2] || 'dist'), PING = process.argv.includes('--ping');
const galat = [], peringatan = [];
const WAJIB = ['index.html', 'assets/js/libs/config.js'];
const KUNCI = [   // pola API key yang TIDAK boleh ada di frontend (siapa pun bisa membaca file di Netlify)
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic'], [/AIza[0-9A-Za-z_-]{35}/, 'Google'], [/sk-(?!ant-|or-)(proj-)?[A-Za-z0-9_-]{32,}/, 'OpenAI'],
  [/sk-or-v1-[a-f0-9]{40,}/, 'OpenRouter'], [/gsk_[A-Za-z0-9]{40,}/, 'Groq'], [/nfp_[A-Za-z0-9]{30,}/, 'Netlify token']];
const PLACEHOLDER = /__API_URL__|PLACEHOLDER|YOUR[_-]?(API|URL|SCRIPT)|GANTI[_-]?(URL|INI)|xxxxx|example\.com\/exec/i;
const URL_GAS = /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec/;

function semuaFile(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? semuaFile(path.join(d, e.name)) : [path.join(d, e.name)]); }

if (!fs.existsSync(dir)) { console.error('✗ Folder tidak ditemukan: ' + dir); process.exit(1); }
WAJIB.forEach(f => { if (!fs.existsSync(path.join(dir, f))) galat.push('File wajib tidak ada: ' + f); });

const teks = semuaFile(dir).filter(f => /\.(html|js|css|json|txt|md)$/i.test(f));
let ukuran = 0;
teks.forEach(f => {
  const isi = fs.readFileSync(f, 'utf8'), rel = path.relative(dir, f); ukuran += isi.length;
  KUNCI.forEach(([re, nama]) => { if (re.test(isi)) galat.push('Kemungkinan API key ' + nama + ' di ' + rel + ' — pindahkan ke Script Properties di server, jangan di frontend.'); });
  if (isi.length > 2 * 1048576) peringatan.push(rel + ' berukuran ' + (isi.length / 1048576).toFixed(1) + ' MB — pecah / kompres agar cepat dimuat.');
});

const cfgPath = path.join(dir, 'assets/js/libs/config.js');
let apiUrl = '';
if (fs.existsSync(cfgPath)) {
  const cfg = fs.readFileSync(cfgPath, 'utf8');
  if (PLACEHOLDER.test(cfg)) galat.push('config.js masih berisi placeholder (mis. __API_URL__). Isi API_URL saat deploy: API_URL=https://script.google.com/macros/s/…/exec');
  const m = URL_GAS.exec(cfg); apiUrl = m ? m[0] : '';
  if (!apiUrl) galat.push('config.js tidak memuat URL Web App Apps Script yang sah (https://script.google.com/macros/s/<ID>/exec).');
  if (/\/dev(["'`\s]|$)/.test(cfg)) galat.push('config.js memakai URL /dev (hanya untuk pemilik skrip). Pakai URL deployment yang berakhiran /exec.');
}

(async () => {
  if (PING && apiUrl) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
      const r = await fetch(apiUrl + '?action=ping', { redirect: 'follow', signal: ctl.signal }); clearTimeout(t);
      const isi = await r.text(); let j = null; try { j = JSON.parse(isi); } catch (e) { }
      if (!j) galat.push('Server tidak menjawab JSON (HTTP ' + r.status + '). Biasanya: deployment belum "Anyone"/"Siapa saja", URL salah, atau akses ditolak. Awal jawaban: ' + isi.slice(0, 120).replace(/\s+/g, ' '));
      else if (!j.ok) galat.push('ping ditolak server: ' + (j.error || JSON.stringify(j).slice(0, 120)));
      else console.log('✓ Server menjawab: ' + (j.server || '') + ' · server ' + (j.versiServer || '?') + ' · kernel ' + (j.kernel || '?') + (j.modul && j.modul.versi ? ' · modul ' + j.modul.versi : ''));
    } catch (e) { galat.push('Server tidak dapat dihubungi (' + e.message + '). Periksa koneksi & URL API.'); }
  }
  console.log('Folder: ' + dir + ' · ' + teks.length + ' file teks · ' + (ukuran / 1048576).toFixed(2) + ' MB');
  peringatan.forEach(p => console.log('⚠ ' + p));
  if (galat.length) { galat.forEach(g => console.error('✗ ' + g)); console.error('\nDEPLOY DIBATALKAN — perbaiki ' + galat.length + ' masalah di atas.'); process.exit(1); }
  console.log('✓ Konfigurasi aman untuk deploy.');
})();
