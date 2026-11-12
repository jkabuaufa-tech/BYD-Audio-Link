#!/bin/sh
# Rakit ulang Pembaruan 2.10.16 & Modul server 1.10.16 dari paket 2.10.15 / 1.10.15 (jalankan dari folder asisten-ai-agen)
set -e
python3 alat/rakit-pembaruan.py pembaruan-2.10.15.json sumber/pembaruan-2.10.16-adendum-notif.js sumber/pembaruan-2.10.16-adendum-notif.css 2.10.16 sumber/catatan-2.10.16.txt pembaruan-2.10.16.json sumber/pembaruan-2.10.16-adendum-notif.ganti.json
python3 alat/rakit-modul-1.10.16.py server-modul-1.10.15.json sumber/modul-1.10.16-notif-aktif.js server-modul-1.10.16.json
