// Bangun js/core/icons.js dari paket lucide-static (hanya ikon yang dipakai,
// supaya aplikasi tetap ringan dan berjalan offline). Tambah nama di ICONS lalu
// jalankan: npm run build:icons
const fs = require('fs');
const path = require('path');
const ICONS = ['layout-dashboard', 'clipboard-list', 'calendar-days', 'package', 'map-pin', 'pencil', 'plus', 'x',
  'search', 'download', 'upload', 'rotate-ccw', 'triangle-alert', 'circle-check', 'circle-alert', 'clock', 'save',
  'trending-up', 'trending-down', 'ellipsis-vertical', 'file-spreadsheet', 'user', 'shield-check', 'chevron-right',
  'history', 'trash-2', 'target', 'wallet', 'activity', 'info', 'calendar-check', 'octagon-alert', 'minus', 'printer',
  'settings', 'list-checks', 'circle-dashed', 'loader', 'droplets'];
const dir = path.join(__dirname, '..', 'node_modules', 'lucide-static', 'icons');
const out = {};
for (const name of ICONS) {
  const svg = fs.readFileSync(path.join(dir, name + '.svg'), 'utf8');
  out[name] = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '');
}
fs.writeFileSync(path.join(__dirname, '..', 'js', 'core', 'icons.js'),
  '/* DIBUAT OTOMATIS oleh tools/build-icons.js — ikon Lucide (lisensi ISC). */\n' +
  'window.JIAT = window.JIAT || {};\nJIAT.ICONS = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(ICONS.length + ' ikon ditulis');
