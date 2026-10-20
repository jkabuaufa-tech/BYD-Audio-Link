#!/usr/bin/env python3
"""Rakit paket Aplikasi HP 2.2.1 dari folder paket 2.2 (Aplikasi_HP_Monitoring_SAP) milik pengguna.
index.html (berisi data Master proyek) TIDAK disimpan di repo ini: skrip hanya menyuntikkan 1 baris <script src="hp-awal.js"> di <head>.
Pakai:  python3 -I rakit-hp-2.2.1.py <folder paket 2.2> <folder keluaran> [URL /exec untuk config.json]"""
import sys, os, shutil, re, json
asal, keluar = sys.argv[1], sys.argv[2]; url = sys.argv[3] if len(sys.argv) > 3 else ''
SINI = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(keluar): shutil.rmtree(keluar)
shutil.copytree(asal, keluar)
p = os.path.join(keluar, 'index.html'); t = open(p, encoding='utf-8').read()
tanda = '<meta charset="UTF-8">'
assert t.count(tanda) == 1 and 'hp-awal.js' not in t
t = t.replace(tanda, tanda + '\n    <script src="hp-awal.js"></script>', 1)
open(p, 'w', encoding='utf-8').write(t)
for f in ('hp-awal.js', 'sw.js', 'PANDUAN-2.2.1.md'): shutil.copy(os.path.join(SINI, f), os.path.join(keluar, f))
if url:
    assert re.match(r'^https://script\.google(usercontent)?\.com/macros/s/[A-Za-z0-9_-]+/exec$', url), 'URL /exec tidak valid'
    json.dump({'server': url}, open(os.path.join(keluar, 'config.json'), 'w'), indent=1)
print('OK paket HP 2.2.1 →', keluar, '· config.json:', url or '(belum diisi — kartu "Hubungkan ke server" akan tampil)')
