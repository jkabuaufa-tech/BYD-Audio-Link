#!/bin/sh
# Rakit ulang pembaruan-2.10.27.json dari dasar 2.10.26 + perbaikan di tempat (PO sendiri bukan "PO lain" · SPM Non-KSO)
cd "$(dirname "$0")/.." && python3 alat/rakit-pembaruan.py pembaruan-2.10.26.json - - 2.10.27 sumber/catatan-2.10.27.txt pembaruan-2.10.27.json sumber/pembaruan-2.10.27-bon-po-sendiri-spm-nonkso.ganti.json
