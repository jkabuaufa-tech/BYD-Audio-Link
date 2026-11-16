#!/bin/sh
# Rakit ulang pembaruan-2.10.28.json dari dasar 2.10.27 + blok MP21028 (identitas Non-KSO menyeluruh) + perbaikan di tempat
cd "$(dirname "$0")/.." && python3 alat/rakit-pembaruan.py pembaruan-2.10.27.json sumber/pembaruan-2.10.28-identitas-non-kso.js - 2.10.28 sumber/catatan-2.10.28.txt pembaruan-2.10.28.json sumber/pembaruan-2.10.28-identitas-non-kso.ganti.json
