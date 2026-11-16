#!/bin/sh
# Rakit ulang pembaruan-2.10.30.json dari dasar 2.10.29 (blok MP21028 diganti utuh + 3 perbaikan di tempat)
cd "$(dirname "$0")/.." && python3 alat/rakit-pembaruan.py pembaruan-2.10.29.json - - 2.10.30 sumber/catatan-2.10.30.txt pembaruan-2.10.30.json sumber/pembaruan-2.10.30-kop-acuan-tanpa-stempel.ganti.json
