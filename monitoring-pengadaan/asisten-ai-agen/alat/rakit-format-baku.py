#!/usr/bin/env python3
"""Sisipkan template format baku (hasil alat/siapkan-format-tagihan.py) ke blok MP292 sebagai base64.
  python3 -I alat/rakit-format-baku.py <blok-keluar.js>
Membaca sumber/format-baku/master-spm-baku.xlsx, sumber/format-baku/bap-format-baku.xlsx dan sumber/pembaruan-2.9.2-format-baku.js."""
import sys, base64, json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sumber')
b = lambda n: base64.b64encode(open(os.path.join(R, 'format-baku', n), 'rb').read()).decode()
data = {'spm': b('master-spm-baku.xlsx'), 'bap': b('bap-format-baku.xlsx')}
logika = open(os.path.join(R, 'pembaruan-2.9.2-format-baku.js'), encoding='utf-8').read()
kepala, sisa = logika.split('*/', 1)
out = kepala + '*/\nwindow.__MP292_FORMAT = ' + json.dumps(data) + ';' + sisa
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('blok MP292:', len(out), 'karakter (format baku', sum(len(v) for v in data.values()), 'base64)')
