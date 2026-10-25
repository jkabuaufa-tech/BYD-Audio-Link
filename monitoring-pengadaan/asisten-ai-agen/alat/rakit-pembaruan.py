#!/usr/bin/env python3
"""Rakit paket pembaruan kumulatif berikutnya dari paket sebelumnya + satu blok aditif (JS & CSS) dan/atau perbaikan di tempat.

  python3 alat/rakit-pembaruan.py pembaruan-2.6.7.json sumber/pembaruan-2.6.8-bon-jenis.js \
      sumber/pembaruan-2.6.8-bon-jenis.css 2.6.8 catatan-2.6.8.txt pembaruan-2.6.8.json
  python3 alat/rakit-pembaruan.py pembaruan-2.6.8.json - - 2.6.9 catatan-2.6.9.txt pembaruan-2.6.9.json \
      sumber/pembaruan-2.6.9-kontrak-lunas.ganti.json

- penanda versi paket (VERSI_PAKET / VERSI = 'x.y.z') dinaikkan ke versi baru,
- blok JS disisipkan tepat sebelum blok MP264 (pemberitahuan versi baru selalu terakhir); "-" = tanpa blok,
- CSS ditambahkan di akhir ("-" = tanpa CSS), catatan baru ditaruh di depan catatan lama,
- berkas ganti (opsional): [{"lama": …, "baru": …}] — tiap teks lama harus muncul tepat sekali di JS.
"""
import json, re, sys
from datetime import date

dasar, blok_js, blok_css, versi, catatan, keluar = sys.argv[1:7]
ganti = json.load(open(sys.argv[7], encoding='utf-8')) if len(sys.argv) > 7 else []
p = json.load(open(dasar, encoding='utf-8'))
lama, panjang = p['versi'], len(p['js'])
# penanda di kode bisa tertinggal dari nomor paket (mis. 2.6.17 masih '2.6.12') → semua penanda diseragamkan ke versi baru
js, n = re.subn(r"(const (?:VERSI_PAKET|VERSI) = ')[\d.]+'", r"\g<1>" + versi + "'", p['js'])
if n != 4:
    sys.exit('penanda versi ditemukan %d kali (harus 4)' % n)
for i, g in enumerate(ganti):
    if js.count(g['lama']) != 1:
        sys.exit('ganti #%d: teks lama ditemukan %d kali (harus 1)' % (i + 1, js.count(g['lama'])))
    js = js.replace(g['lama'], g['baru'])
if blok_js != '-':
    batas = '/* MP264 — PEMBARUAN'
    if js.count(batas) != 1:
        sys.exit('batas blok MP264 tidak unik')
    js = js.replace(batas, open(blok_js, encoding='utf-8').read().rstrip('\n') + '\n\n' + batas)
css = p['css'] if blok_css == '-' else p['css'].rstrip('\n') + '\n' + open(blok_css, encoding='utf-8').read()
p.update(versi=versi, js=js, css=css, catatan=open(catatan, encoding='utf-8').read().strip() + '\n' + p['catatan'], tanggal=date.today().isoformat())
for k in ('diunggahOleh', 'diunggahPada'):
    p.pop(k, None)
with open(keluar, 'w', encoding='utf-8') as f:
    json.dump(p, f, ensure_ascii=False)
print('%s → %s: js %d → %d karakter, css %d karakter, %d perbaikan di tempat' % (lama, versi, panjang, len(js), len(css), len(ganti)))
