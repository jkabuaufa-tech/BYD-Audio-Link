#!/usr/bin/env python3
"""Rakit Modul server 1.10.21 dari 1.10.20 + blok sumber/modul-1.10.21-tanggal-bapm.js.

  python3 alat/rakit-modul-1.10.21.py server-modul-1.10.20.json sumber/modul-1.10.21-tanggal-bapm.js \
      sumber/catatan-modul-1.10.21.txt server-modul-1.10.21.json

- blok disisipkan tepat sebelum pembatas Petugas Gudang (selalu terakhir) → aksi baru ikut dibatasi gdpTolakLain,
- baris judul modul dinaikkan ke 1.10.21, catatan baru ditaruh di depan catatan lama.
"""
import json, sys
from datetime import date

dasar, blok, catatan, keluar = sys.argv[1:5]
m = json.load(open(dasar, encoding='utf-8'))
if m.get('versi') != '1.10.20':
    sys.exit('dasar harus Modul server 1.10.20 (dapat %s)' % m.get('versi'))
k = m['kode']
def ganti(lama, baru):
    global k
    n = k.count(lama)
    if n != 1:
        sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    k = k.replace(lama, baru)
ganti('/* MODUL SERVER 1.10.20 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.18) · ',
      '/* MODUL SERVER 1.10.21 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.20) · 1.10.21: tanggal BAPM = sumber kebenaran '
      'seluruh penerimaan (GR otomatis & manual tertaut refBA), guard anomali tanggal GR ≠ BAPM, gudangCekTanggalBA, gudangAuditTanggalBA, '
      'gudangMigrasiTanggalBA · ')
batas = '/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir'
ganti(batas, open(blok, encoding='utf-8').read().rstrip('\n') + '\n\n' + batas)
m.update(versi='1.10.21', kode=k, tanggal=date.today().isoformat(),
         catatan=open(catatan, encoding='utf-8').read().strip() + '\n' + m['catatan'])
for x in ('diunggahOleh', 'diunggahPada'):
    m.pop(x, None)
with open(keluar, 'w', encoding='utf-8') as f:
    json.dump(m, f, ensure_ascii=False)
print('1.10.20 → 1.10.21: kode %d karakter' % len(k))
