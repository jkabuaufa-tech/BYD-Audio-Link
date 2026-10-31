#!/usr/bin/env python3
"""Rakit blok MP293 (2.9.3): mesin rumus XLH + penampil XLR + gambar pratinjau (EMF → PNG) + logika MP293.
  python3 -I alat/rakit-excel-terkini.py <blok-keluar.js>"""
import sys, os, base64, json, glob
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sumber')
baca = lambda n: open(os.path.join(R, n), encoding='utf-8').read()
gambar = {}
for jenis in ('spm', 'bap'):
    for f in sorted(glob.glob(os.path.join(R, 'format-baku', 'pratinjau-' + jenis, '*.png'))):
        gambar.setdefault(jenis, {})['xl/media/' + os.path.basename(f).replace('.png', '.emf')] = 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
logika = baca('pembaruan-2.9.3-excel-terkini.js')
kepala, sisa = logika.split('*/', 1)
out = kepala + '*/\n' + baca('xlsx-hitung.js') + '\n' + baca('xlsx-html.js') + '\nwindow.__MP293_GAMBAR = ' + json.dumps(gambar) + ';' + sisa
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('blok MP293:', len(out), 'karakter')
