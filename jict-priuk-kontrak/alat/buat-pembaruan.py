#!/usr/bin/env python3
"""Rakit paket pembaruan aplikasi JICT Kontrak dari file di folder ini.

Paket berisi markup <body> (antara penanda APP-BODY), styles.css, dan app.js,
lalu dipasang pengguna lewat Menu › Pembaruan Aplikasi — tanpa mengganti file.

Pemakaian:
    python alat/buat-pembaruan.py "Catatan rilis ..."
Hasil: pembaruan/pembaruan-<APP_VERSION>.json
"""
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    js = (ROOT / 'app.js').read_text(encoding='utf-8')

    m = re.search(r'<!--APP-BODY-START-->(.*)<!--APP-BODY-END-->', html, re.S)
    if not m:
        sys.exit('Penanda <!--APP-BODY-START--> / <!--APP-BODY-END--> tidak ditemukan di index.html')
    body = m.group(1).strip()
    if '<script' in body:
        sys.exit('Markup body tidak boleh berisi <script>; letakkan kode di app.js')

    v = re.search(r"const APP_VERSION = '([\d.]+)'", js)
    if not v:
        sys.exit('APP_VERSION tidak ditemukan di app.js')
    versi = v.group(1)

    catatan = ' '.join(sys.argv[1:]).strip() or f'Pembaruan {versi}'
    paket = {
        'format': 'jict-kontrak-pembaruan',
        'versi': versi,
        'tanggal': datetime.date.today().isoformat(),
        'catatan': catatan,
        'body': body,
        'css': css,
        'js': js,
    }
    out = ROOT / 'pembaruan' / f'pembaruan-{versi}.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(paket, ensure_ascii=False), encoding='utf-8')
    print(f'{out.relative_to(ROOT)}  ({out.stat().st_size / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
