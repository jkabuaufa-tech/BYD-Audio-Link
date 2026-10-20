#!/usr/bin/env python3
"""Siapkan folder siap-unggah Cloudflare Pages dari paket HP 2.2.1 (hasil rakit-hp-2.2.1.py).
Pakai:  python3 -I rakit-web-cloudflare.py <folder paket HP 2.2.1> <folder keluaran> [URL /exec]"""
import sys, os, shutil, json, re
asal, keluar = sys.argv[1], sys.argv[2]; url = sys.argv[3] if len(sys.argv) > 3 else ''
SINI = os.path.dirname(os.path.abspath(__file__)); web = os.path.join(keluar, 'monitoring-sap-web')
if os.path.exists(keluar): shutil.rmtree(keluar)
os.makedirs(web)
for f in ('index.html', 'hp-awal.js', 'sw.js', 'manifest.webmanifest', 'config.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'):
    shutil.copy(os.path.join(asal, f), os.path.join(web, f))
assert 'hp-awal.js' in open(os.path.join(web, 'index.html'), encoding='utf-8').read()[:5000]
for f in ('_headers', 'robots.txt'): shutil.copy(os.path.join(SINI, f), os.path.join(web, f))
if url:
    assert re.match(r'^https://script\.google(usercontent)?\.com/macros/s/[A-Za-z0-9_-]+/exec$', url), 'URL /exec tidak valid'
    json.dump({'server': url}, open(os.path.join(web, 'config.json'), 'w'), indent=1)
shutil.copy(os.path.join(SINI, 'PANDUAN-CLOUDFLARE.md'), os.path.join(keluar, 'PANDUAN-CLOUDFLARE.md'))
besar = max(os.path.getsize(os.path.join(web, f)) for f in os.listdir(web))
assert besar < 25 * 1024 * 1024, 'Cloudflare Pages: maks. 25 MiB per berkas'
print('OK', web, '·', len(os.listdir(web)), 'berkas · terbesar', besar // 1024, 'KB')
