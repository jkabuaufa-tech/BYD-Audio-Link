#!/usr/bin/env python3
"""Rakit Modul server 1.10.17 dari server-modul-1.10.16.json: jenis kontrak SPMB (Upah / Mandor Borong).

  python3 -I alat/rakit-modul-1.10.17.py server-modul-1.10.16.json server-modul-1.10.17.json
"""
import json, sys
from datetime import date
src, out = sys.argv[1], sys.argv[2]
p = json.load(open(src, encoding='utf-8'))
s = p['kode']
def ganti(lama, baru):
    global s
    n = s.count(lama)
    if n != 1: sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    s = s.replace(lama, baru)

ganti('/* MODUL SERVER 1.10.16 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.15) · ',
      '/* MODUL SERVER 1.10.17 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.16) · 1.10.17: jenis kontrak SPMB (Upah / Mandor Borong) — kategori Paket Tagihan SUBKON & backup Excel "BAP format" · ')
# kategori Paket Tagihan dari nomor kontrak
ganti("(SPSA|SPM|SPPM|SPKP|SPPP|SPKU|SPK)(?=\\/|$)", "(SPSA|SPMB|SPM|SPPM|SPKP|SPPP|SPKU|SPK)(?=\\/|$)")
ganti("SPKP: 'SUBKON', SPPP: 'SUBKON', SPKU: 'SUBKON', SPK: 'SUBKON' }[m[1]]", "SPKP: 'SUBKON', SPPP: 'SUBKON', SPMB: 'SUBKON', SPKU: 'SUBKON', SPK: 'SUBKON' }[m[1]]")
# backup Excel format baku
ganti("const BX_FORMAT = { SPM: 'spm', SPPM: 'spm', SPK: 'bap', SPPP: 'bap', SPKP: 'bap', SPKU: 'bap' };",
      "const BX_FORMAT = { SPM: 'spm', SPPM: 'spm', SPK: 'bap', SPPP: 'bap', SPKP: 'bap', SPMB: 'bap', SPKU: 'bap' };   // 1.10.17: SPMB (upah)")
ganti("dan SPK/SPPP/SPKP/SPKU (BAP format); kontrak ini '", "dan SPK/SPPP/SPKP/SPMB/SPKU (BAP format); kontrak ini '")
ganti("/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir", "MODUL.fitur.push('jenisSPMB');   // 1.10.17\n\n/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir")

catatan = ('1.10.17 — JENIS KONTRAK SPMB (UPAH / MANDOR BORONG): nomor kontrak ber-ruas /SPMB/ kini dikenali server — kategori Paket Tagihan SUBKON '
           '(BAPP, BAP, rekap retensi & uang muka) dan backup Excel "BAP format" diterima seperti SPPP / SPKP. Tidak ada sheet / data yang diubah. '
           'Fitur: jenisSPMB. Pasangan: Pembaruan 2.10.19.')
p.update(versi='1.10.17', kode=s, catatan=catatan + '\n' + p['catatan'], tanggal=date.today().isoformat())
for k in ('diunggahOleh', 'diunggahPada'):
    p.pop(k, None)
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('1.10.16 → 1.10.17: kode %d karakter' % len(s))
