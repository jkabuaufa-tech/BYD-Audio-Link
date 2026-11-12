#!/usr/bin/env python3
"""Rakit Modul server 1.10.15 dari 1.10.14 + blok sumber/modul-1.10.12-kontrak-batal.js.

  python3 alat/rakit-modul-1.10.15.py server-modul-1.10.14.json sumber/modul-1.10.15-kontrak-batal.js server-modul-1.10.15.json
"""
import json, re, sys
from datetime import date
src, blok, out = sys.argv[1:4]
p = json.load(open(src, encoding='utf-8'))
s = p['kode']
def ganti(lama, baru):
    global s
    n = s.count(lama)
    if n != 1: sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    s = s.replace(lama, baru)
m = re.search(r"/\* MODUL SERVER 1\.10\.14 — untuk kernel Code\.gs v2\.5 \(kumulatif dari 1\.0\.0 … 1\.10\.13\) · ", s)
if not m: sys.exit('kepala modul 1.10.14 tidak ditemukan')
s = s.replace(m.group(0), '/* MODUL SERVER 1.10.15 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.14) · 1.10.15: PO CANCEL / HOLD — pembatalan kontrak soft-delete beraudit per keluarga kontrak (sheet <ID>_KontrakStatus; kontrakStatusBaca, kontrakBatal, kontrakPulih), kunci simpan/posting/tagihan, sisa Bon dilepas · ', 1)
# sisa bon di server (1.10.12 sbPakai): kontrak PO CANCEL tidak dihitung
ganti("const T0 = sbPakai(D, BON), T1 = sbPakai(lain.concat([baru]), BON),", "const T0 = sbPakai(ksAktif(P, D), BON), T1 = sbPakai(ksAktif(P, lain.concat([baru])), BON),")
ganti("const T = sbPakai(bacaKoleksi_(P, 'data'), L), G = sbTerima(P), nomor = s_(lama.nomor);", "const T = sbPakai(ksAktif(P, bacaKoleksi_(P, 'data')), L), G = sbTerima(P), nomor = s_(lama.nomor);")
ganti("const BON = bacaKoleksi_(P, 'permintaan'), T = sbPakai(bacaKoleksi_(P, 'data'), BON), G = sbTerima(P),", "const BON = bacaKoleksi_(P, 'permintaan'), T = sbPakai(ksAktif(P, bacaKoleksi_(P, 'data')), BON), G = sbTerima(P),")
ganti("/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir", open(blok, encoding='utf-8').read().rstrip('\n') + "\n\n/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir")
catatan = ("1.10.15 — PO CANCEL / HOLD (SOFT-DELETE BERAUDIT): sheet baru <ID>_KontrakStatus menyimpan status keluarga kontrak (kontrak awal + addendumnya): CANCELLED / HOLD / AKTIF, alasan, pengguna, waktu & riwayat — "
  "berbeda dari Batalkan 1.10.13 (arsip lalu hapus), kontrak TETAP ada di Register berlabel PO CANCEL / HOLD. Aksi kontrakStatusBaca, kontrakBatal (Pengadaan/Admin, alasan ≥ 12 karakter), kontrakPulih (HOLD: Pengadaan/Admin; PO CANCEL: Admin). "
  "PO CANCEL ditolak bila keluarga kontrak sudah punya tagihan/BK atau penerimaan gudang aktif (gunakan HOLD); saat PO CANCEL alokasi Bon dibatalkan dan volume kontrak itu tidak lagi dihitung pada sisa Bon di server. "
  "Selama CANCELLED/HOLD: ubah, addendum & posting kontrak serta tagihan baru ditolak. Fitur: kontrakBatal. Pasangan: Pembaruan 2.10.15.\n")
p.update(versi='1.10.15', kode=s, catatan=catatan + p['catatan'], tanggal=date.today().isoformat())
for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('ok', out, len(s))
