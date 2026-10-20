#!/usr/bin/env python3
"""Rakit server-modul-1.8.10.json dari server-modul-1.8.9.json (kumulatif).
1.8.10: Script Properties modul (setelan AI, notifikasi, Tim AI — 32 titik) dibaca lewat props_() kernel 2.5.2 (cache) bila tersedia;
pada kernel 2.5.1 tetap memakai PropertiesService seperti sebelumnya. Kehadiran: batas Online 7 menit (aplikasi 2.6.2 mengirim detak tiap
±5 menit) → jauh lebih sedikit permintaan. Tidak ada perubahan data, tidak ada izin Google baru.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-modul-1.8.10.py"""
import json, os, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = json.load(open(os.path.join(R, 'server-modul-1.8.9.json'), encoding='utf-8')); assert M['versi'] == '1.8.9'
k = M['kode']; OP = []
def g(cari, ganti, ket, n=1):
    global k
    assert k.count(cari) == n, ('penanda', k.count(cari), cari[:90]); k = k.replace(cari, ganti); OP.append({'cari': cari, 'ganti': ganti, 'jumlah': n, 'keterangan': ket})
g("/* MODUL SERVER 1.8.9 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.8)",
  "/* MODUL SERVER 1.8.10 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.9) · 1.8.10: Properties ber-cache (kernel 2.5.2) & kehadiran lebih hemat", 'Judul modul.')
g("versiAI: '1.8.9'", "versiAI: '1.8.10'", 'Versi AI.')
g("versiTim: '1.8.9'", "versiTim: '1.8.10'", 'Versi Tim.')
g("const PR_ = () => PropertiesService.getScriptProperties();",
  "const PR_ = () => (typeof props_ === 'function' ? props_() : PropertiesService.getScriptProperties());   // 1.8.10: cache kernel 2.5.2 (hemat kuota harian Properties)",
  'Properties modul lewat cache kernel bila tersedia.')
g("const HADIR_TTL = 900, HADIR_ONLINE = 180;", "const HADIR_TTL = 1200, HADIR_ONLINE = 420;   // 1.8.10: detak aplikasi tiap ±5 menit", 'Kehadiran: Online bila detak ≤ 7 menit.')
g("""  fitur: ['unggahTanpaKunci',""", """  fitur: ['propsCache', 'unggahTanpaKunci',""", 'Fitur baru diumumkan.')
CAT = ('Modul server 1.8.10 (kumulatif dari 1.8.9 … 1.0.0; kernel Code.gs 2.5.1/2.5.2, tanpa izin Google baru, tanpa perubahan data).\n'
  'PERBAIKAN 1.8.10 — galat acak "halaman HTML (HTTP 200/404)": pembacaan Script Properties modul (setelan AI, notifikasi, Tim AI) memakai cache kernel 2.5.2 '
  'sehingga kuota harian Google tidak habis; kehadiran memakai detak ±5 menit (Online ≤ 7 menit). Pasangan: Code.gs 2.5.2 + Pembaruan 2.6.2.\n') + M['catatan']
H = dict(M, versi='1.8.10', tanggal='2026-10-20', catatan=CAT, kode=k)
json.dump(H, open(os.path.join(R, 'server-modul-1.8.10.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
json.dump({'format': 'monitoring-sap-modul-patch', 'dari': '1.8.9', 'ke': '1.8.10', 'sha256Sumber': sha(M['kode']), 'sha256Hasil': sha(k), 'operasi': OP}, open(os.path.join(R, 'server-modul-1.8.10.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK server-modul-1.8.10.json ·', len(OP), 'operasi')
