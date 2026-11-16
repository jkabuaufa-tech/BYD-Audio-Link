#!/bin/sh
# Rakit ulang pembaruan-2.10.26.json dari dasar 2.10.25 + blok MP21026 (menu radial & dashboard ringkas)
cd "$(dirname "$0")/.." && python3 alat/rakit-pembaruan.py pembaruan-2.10.25.json sumber/pembaruan-2.10.26-radial-dashboard.js sumber/pembaruan-2.10.26-radial-dashboard.css 2.10.26 sumber/catatan-2.10.26.txt pembaruan-2.10.26.json
