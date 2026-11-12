#!/usr/bin/env python3
"""Rakit Modul server 1.10.12 dari 1.10.11 + blok sumber/modul-1.10.12-kontrak-batal.js.

  python3 alat/rakit-modul-1.10.12.py server-modul-1.10.11.json sumber/modul-1.10.12-kontrak-batal.js server-modul-1.10.12.json
"""
import json, sys
from datetime import date
src, blok, out = sys.argv[1:4]
p = json.load(open(src, encoding='utf-8'))
s = p['kode']
def ganti(lama, baru):
    global s
    n = s.count(lama)
    if n != 1: sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    s = s.replace(lama, baru)
ganti('/* MODUL SERVER 1.10.11 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.10) · ',
      '/* MODUL SERVER 1.10.12 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.11) · 1.10.12: PO CANCEL / HOLD — pembatalan kontrak soft-delete beraudit (sheet <ID>_KontrakStatus; kontrakStatusBaca, kontrakBatal, kontrakPulih), kunci simpan/posting/tagihan, item Bon dilepas otomatis · ')
ganti("/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir", open(blok, encoding='utf-8').read().rstrip('\n') + "\n\n/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir")
catatan = ("1.10.12 — PO CANCEL / HOLD (SOFT-DELETE BERAUDIT): sheet baru <ID>_KontrakStatus menyimpan status kontrak (CANCELLED / HOLD / AKTIF), alasan, pengguna, waktu & riwayat lengkap untuk kontrak Master maupun Register — "
  "data kontrak tidak pernah dihapus. Aksi kontrakStatusBaca, kontrakBatal (Pengadaan/Admin, alasan ≥ 12 karakter), kontrakPulih (HOLD: Pengadaan/Admin; PO CANCEL: Admin). PO CANCEL ditolak bila sudah ada tagihan/BK atau penerimaan gudang aktif (gunakan HOLD); "
  "saat PO CANCEL alokasi Bon → kontrak dibatalkan otomatis dan tautan No Bon dicatat (bonDilepas). Selama CANCELLED/HOLD: ubah & posting kontrak serta tagihan baru ditolak server. Fitur: kontrakBatal. Pasangan: Pembaruan 2.10.10.\n")
p.update(versi='1.10.12', kode=s, catatan=catatan + p['catatan'], tanggal=date.today().isoformat())
for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('ok', out, len(s))
