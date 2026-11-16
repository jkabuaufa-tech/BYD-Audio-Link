#!/usr/bin/env python3
"""Merakit folder web siap unggah (satu tautan untuk semua staf) dari berkas aplikasi + alamat server.

  python3 rakit-web.py <index.html | Monitoring_SAP.html> <https://script.google.com/macros/s/…/exec> <folder-keluar>

Isi folder keluar diunggah apa adanya ke Cloudflare Pages / Netlify / GitHub Pages.
index.html memuat data Master proyek — folder keluar JANGAN di-commit ke repo ini.
"""
import json, os, re, shutil, sys
if len(sys.argv) != 4: sys.exit(__doc__)
sumber, server, keluar = sys.argv[1:4]
if not re.fullmatch(r'https://script\.google(usercontent)?\.com/macros/s/[A-Za-z0-9_-]+/exec', server): sys.exit('Alamat server harus berbentuk https://script.google.com/macros/s/…/exec')
sini = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'statis')
html = open(sumber, encoding='utf-8').read()
if 'KUNCI_PEMB' not in html or 'id="sidebar"' not in html: sys.exit('Ini bukan berkas aplikasi Monitoring SAP / Monitoring Pengadaan.')
if '<script src="hp-awal.js"></script>' not in html:   # Monitoring_SAP.html polos → pasang penghubung paling awal di <head>
    html, n = re.subn(r'(<head[^>]*>)', r'\1\n    <script src="hp-awal.js"></script>', html, count=1, flags=re.I)
    if n != 1: sys.exit('<head> tidak ditemukan')
os.makedirs(keluar, exist_ok=True)
for nama in os.listdir(sini): shutil.copy2(os.path.join(sini, nama), os.path.join(keluar, nama))
open(os.path.join(keluar, 'index.html'), 'w', encoding='utf-8').write(html)
json.dump({'server': server}, open(os.path.join(keluar, 'config.json'), 'w'), indent=2)
print('Folder web siap unggah:', keluar, '·', ', '.join(sorted(os.listdir(keluar))))
