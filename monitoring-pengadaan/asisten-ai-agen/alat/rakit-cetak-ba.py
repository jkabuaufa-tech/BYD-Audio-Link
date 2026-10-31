#!/usr/bin/env python3
"""Rakit blok MP296 (2.9.6): sisipkan logo kop (WASKITA + NINDYA, dari template BAP format baku) sebagai data URL.
  python3 -I alat/rakit-cetak-ba.py <blok-keluar.js>"""
import sys, os, base64, zipfile
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sumber')
logo = zipfile.ZipFile(os.path.join(R, 'format-baku', 'bap-format-baku.xlsx')).read('xl/media/image1.png')
blok = open(os.path.join(R, 'pembaruan-2.9.6-cetak-ba.js'), encoding='utf-8').read()
assert blok.count('__LOGO_KOP__') == 1
out = blok.replace('__LOGO_KOP__', 'data:image/png;base64,' + base64.b64encode(logo).decode())
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('blok MP296:', len(out), 'karakter')
