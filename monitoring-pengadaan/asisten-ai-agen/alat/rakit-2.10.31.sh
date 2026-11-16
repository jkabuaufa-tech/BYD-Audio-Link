#!/bin/sh
# Rakit ulang pembaruan-2.10.31.json dari dasar 2.10.30 (1 perbaikan di tempat) lalu pangkas catatan rilis kumulatif
cd "$(dirname "$0")/.." && python3 alat/rakit-pembaruan.py pembaruan-2.10.30.json - - 2.10.31 sumber/catatan-2.10.31.txt pembaruan-2.10.31.json sumber/pembaruan-2.10.31-notif-versi.ganti.json && python3 alat/pangkas-catatan.py pembaruan-2.10.31.json 12000
