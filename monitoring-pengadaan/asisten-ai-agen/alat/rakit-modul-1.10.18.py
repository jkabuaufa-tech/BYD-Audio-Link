#!/usr/bin/env python3
"""Rakit Modul server 1.10.18 dari server-modul-1.10.17.json: kontrol Release / Unrelease (SOP SAP HANA) + BASO & BASTA per alat.

  python3 -I alat/rakit-modul-1.10.18.py server-modul-1.10.17.json sumber/modul-1.10.18-rilis-baso.js server-modul-1.10.18.json
"""
import json, sys
from datetime import date
src, blok, out = sys.argv[1], sys.argv[2], sys.argv[3]
p = json.load(open(src, encoding='utf-8'))
s = p['kode']
def ganti(lama, baru):
    global s
    n = s.count(lama)
    if n != 1: sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    s = s.replace(lama, baru)

ganti('/* MODUL SERVER 1.10.17 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.16) · ',
      '/* MODUL SERVER 1.10.18 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.17) · 1.10.18: kontrol Release / Unrelease kontrak-PO ala SAP (Release khusus Admin, kontrakAjukan, kontrakUnrelease) · BASO & BASTA per alat di Gudang (sheet <ID>_BasoBasta; basoBaca, basoSimpan, basoBatal) · ')
# Petugas Gudang boleh mengisi BASO / BASTA
ganti("'gudangPetugasBaca', 'gudangLengkapiFoto', 'ambilBerkas', 'hadirDetak', 'identitasBaca', 'notifInfo'];",
      "'gudangPetugasBaca', 'gudangLengkapiFoto', 'ambilBerkas', 'hadirDetak', 'identitasBaca', 'notifInfo', 'basoBaca', 'basoSimpan'];   // 1.10.18: + BASO / BASTA")
# blok baru dipasang sebelum pembatas Petugas Gudang (yang harus tetap terakhir)
ganti("/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir",
      open(blok, encoding='utf-8').read().rstrip('\n') + "\n\n/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir")

catatan = ('1.10.18 — KONTROL RELEASE / UNRELEASE (SOP SAP HANA) · BASO & BASTA PER ALAT: (1) Release kontrak / PO (posting) kini KHUSUS ADMIN; '
           'Staf Pengadaan mengajukan lewat aksi kontrakAjukan (status Diajukan). (2) Aksi kontrakUnrelease (Admin, alasan ≥ 12 karakter) membatalkan release '
           'agar staf dapat mengoreksi — ditolak bila sudah ada BK / tagihan, penerimaan gudang aktif, addendum di atasnya sudah direlease, atau kontrak PO CANCEL / HOLD; '
           'tercatat di Log (SAP AJUKAN RELEASE, SAP UNRELEASE KONTRAK). (3) Sheet baru <ID>_BasoBasta: Berita Acara Alat Siap Operasi & Serah Terima Alat, 1 dokumen per unit alat '
           'per SPSA; tanggal dokumen selalu = tanggal SPSA, SPSA wajib sudah direlease, foto 3 sisi (depan, belakang, samping) divalidasi milik proyek; '
           'aksi basoBaca, basoSimpan (Pengadaan & Petugas Gudang), basoBatal (Pengadaan/Admin, alasan ≥ 12 karakter). Sheet / kolom / data lama tidak diubah. '
           'Fitur: sapRelease, basoBasta. Pasangan: Pembaruan 2.10.20.')
p.update(versi='1.10.18', kode=s, catatan=catatan + '\n' + p['catatan'], tanggal=date.today().isoformat())
for k in ('diunggahOleh', 'diunggahPada'):
    p.pop(k, None)
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('1.10.17 → 1.10.18: kode %d karakter' % len(s))
