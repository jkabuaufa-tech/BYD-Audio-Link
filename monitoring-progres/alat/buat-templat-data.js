#!/usr/bin/env node
/* Membuat templat-data.js dari templat/*.xlsx (template resmi diembed sebagai base64). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const b64 = fs.readFileSync(path.join(ROOT, 'templat/FORM_PW-PROD-30_Risalah_Rapat.xlsx')).toString('base64');
const isi = '/* DIBUAT OTOMATIS oleh alat/buat-templat-data.js – jangan diedit manual.\n' +
  ' * Template resmi: templat/FORM_PW-PROD-30_Risalah_Rapat.xlsx (Form. PW-PROD-30 Rev. 03). */\n' +
  "window.JIAT_TEMPLAT_RISALAH = '" + b64 + "';\n";
fs.writeFileSync(path.join(ROOT, 'templat-data.js'), isi);
console.log('✓ templat-data.js (' + (isi.length / 1024).toFixed(0) + ' KB)');
