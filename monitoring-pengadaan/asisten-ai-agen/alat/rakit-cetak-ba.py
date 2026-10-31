#!/usr/bin/env python3
"""Rakit blok MP296 (2.9.6): sisipkan logo kop (WASKITA + NINDYA tanpa 'Member of Danareksa', sumber/format-baku/kop-logo.png) sebagai data URL.
  python3 -I alat/rakit-cetak-ba.py <blok-keluar.js>"""
import sys, os, base64
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sumber')
logo = open(os.path.join(R, 'format-baku', 'kop-logo.png'), 'rb').read()   # tanpa tulisan 'Member of Danareksa'
blok = open(os.path.join(R, 'pembaruan-2.9.6-cetak-ba.js'), encoding='utf-8').read()
assert blok.count('__LOGO_KOP__') == 1
out = blok.replace('__LOGO_KOP__', 'data:image/png;base64,' + base64.b64encode(logo).decode())
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('blok MP296:', len(out), 'karakter')
