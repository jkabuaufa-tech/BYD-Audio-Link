#!/usr/bin/env python3
"""Pangkas catatan rilis kumulatif sebuah paket pembaruan agar pemberitahuan "Versi baru tersedia" tetap ringkas.

  python3 alat/pangkas-catatan.py pembaruan-2.10.31.json [maks_karakter=12000]

Catatan tiap versi diawali "<b>Versi baru x.y.z tersedia.</b>". Entri terbaru dipertahankan utuh sampai batas; sisanya diganti satu baris
penunjuk. Latar: blok MP264 (≤ 2.10.30) hanya mengganti kotak besar HTML dasar dengan kartu kecil bila teksnya ≤ 60.000 karakter — catatan
kumulatif 2.10.30 (60.095) melewatinya sehingga kotak besar tampil tanpa tombol "Muat ulang".
"""
import json, re, sys
f, maks = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 12000
p = json.load(open(f, encoding='utf-8'))
E = [e for e in re.split(r'\n(?=<b>Versi baru )', p['catatan'].strip()) if e.strip()]
simpan, n = [], 0
for e in E:
    if simpan and n + len(e) > maks: break
    simpan.append(e); n += len(e) + 1
if len(simpan) < len(E):
    simpan.append('Catatan %d versi sebelumnya tidak ditampilkan di sini (lihat Riwayat rilis).' % (len(E) - len(simpan)))
lama = len(p['catatan']); p['catatan'] = '\n'.join(simpan)
json.dump(p, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
print('catatan %d → %d karakter (%d dari %d entri)' % (lama, len(p['catatan']), min(len(simpan), len(E)), len(E)))
