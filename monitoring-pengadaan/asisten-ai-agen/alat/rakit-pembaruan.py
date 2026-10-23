#!/usr/bin/env python3
"""Rakit paket pembaruan kumulatif berikutnya dari paket sebelumnya + satu blok aditif (JS & CSS).

  python3 alat/rakit-pembaruan.py pembaruan-2.6.7.json sumber/pembaruan-2.6.8-bon-jenis.js \
      sumber/pembaruan-2.6.8-bon-jenis.css 2.6.8 catatan-2.6.8.txt pembaruan-2.6.8.json

- penanda versi paket (VERSI_PAKET / VERSI = 'x.y.z') dinaikkan ke versi baru,
- blok JS disisipkan tepat sebelum blok MP264 (pemberitahuan versi baru selalu terakhir),
- CSS ditambahkan di akhir, catatan baru ditaruh di depan catatan lama.
"""
import json, re, sys

dasar, blok_js, blok_css, versi, catatan, keluar = sys.argv[1:7]
p = json.load(open(dasar, encoding='utf-8'))
lama = p['versi']
js, n = re.subn(r"(const (?:VERSI_PAKET|VERSI) = ')" + re.escape(lama) + "'", r"\g<1>" + versi + "'", p['js'])
if n != 4:
    sys.exit('penanda versi %s ditemukan %d kali (harus 4)' % (lama, n))
batas = '/* MP264 — PEMBARUAN'
if js.count(batas) != 1:
    sys.exit('batas blok MP264 tidak unik')
js = js.replace(batas, open(blok_js, encoding='utf-8').read().rstrip('\n') + '\n\n' + batas)
p.update(versi=versi, js=js, css=p['css'].rstrip('\n') + '\n' + open(blok_css, encoding='utf-8').read(),
         catatan=open(catatan, encoding='utf-8').read().strip() + '\n' + p['catatan'])
for k in ('diunggahOleh', 'diunggahPada'):
    p.pop(k, None)
from datetime import date
p['tanggal'] = date.today().isoformat()
with open(keluar, 'w', encoding='utf-8') as f:
    json.dump(p, f, ensure_ascii=False)
print('%s → %s: js %d → %d karakter, css %d karakter' % (lama, versi, len(json.load(open(dasar, encoding='utf-8'))['js']), len(js), len(p['css'])))
