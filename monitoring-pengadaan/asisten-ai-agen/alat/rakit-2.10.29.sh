#!/bin/sh
# Rakit ulang pembaruan-2.10.29.json (dasar 2.10.28 + perbaikan di tempat; blok MP21028 diganti utuh) dan server-modul-1.10.20.json (dasar 1.10.18)
cd "$(dirname "$0")/.." && python3 alat/rakit-pembaruan.py pembaruan-2.10.28.json - - 2.10.29 sumber/catatan-2.10.29.txt pembaruan-2.10.29.json sumber/pembaruan-2.10.29-kop-resmi-vendor-global.ganti.json && python3 alat/rakit-modul-1.10.20.py server-modul-1.10.18.json server-modul-1.10.20.json
