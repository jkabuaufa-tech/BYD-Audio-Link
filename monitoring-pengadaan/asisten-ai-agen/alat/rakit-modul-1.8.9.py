#!/usr/bin/env python3
"""Rakit server-modul-1.8.9.json dari server-modul-1.8.8.json (kumulatif).
1.8.9: "Server sedang sibuk, coba lagi sebentar" — kernel memegang KUNCI TULIS global selama unggah PDF (decode s.d. 10 MB, simpan ke
Drive, sidik SHA-256 manifest). Selama itu simpanan staf lain menunggu ≤25 detik lalu gagal. Unggah hanya MEMBUAT berkas baru dan
MENAMBAH baris (manifest & Log, appendRow) — tidak menimpa data — sehingga aman tanpa kunci global. Modul kini menandai unggahBerkas
sebagai aksi tanpa kunci (daftar "baca" kernel = tanpa LockService). Tidak ada perubahan data, tidak ada izin Google baru.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-modul-1.8.9.py"""
import json, os, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = json.load(open(os.path.join(R, 'server-modul-1.8.8.json'), encoding='utf-8')); assert M['versi'] == '1.8.8'
k = M['kode']; OP = []
def g(cari, ganti, ket, n=1):
    global k
    assert k.count(cari) == n, ('penanda', k.count(cari), cari[:90]); k = k.replace(cari, ganti); OP.append({'cari': cari, 'ganti': ganti, 'jumlah': n, 'keterangan': ket})
g("/* MODUL SERVER 1.8.8 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.7)",
  "/* MODUL SERVER 1.8.9 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.8) · 1.8.9: unggah PDF tanpa kunci tulis global", 'Judul modul.')
g("versiAI: '1.8.8'", "versiAI: '1.8.9'", 'Versi AI.')
g("versiTim: '1.8.8'", "versiTim: '1.8.9'", 'Versi Tim.')
g("""'gudangBaca', 'gudangBacaHal', 'hadirDetak', 'hadirDaftar', 'identitasBaca',""",
  """'gudangBaca', 'gudangBacaHal', 'hadirDetak', 'hadirDaftar', 'unggahBerkas', 'identitasBaca',""",
  'unggahBerkas tanpa kunci tulis global (hanya membuat berkas baru + appendRow manifest/Log) → simpanan lain tidak lagi "Server sedang sibuk".')
g("""  fitur: ['kehadiran',""", """  fitur: ['unggahTanpaKunci', 'kehadiran',""", 'Fitur baru diumumkan.')
CAT = ('Modul server 1.8.9 (kumulatif dari 1.8.8 … 1.0.0; kernel Code.gs 2.5.1, tanpa izin Google baru, tanpa perubahan data).\n'
  'PERBAIKAN 1.8.9 — "Server sedang sibuk, coba lagi sebentar": unggah PDF (s.d. 10 MB + sidik SHA-256) tidak lagi memegang kunci tulis global, '
  'karena unggah hanya membuat berkas baru dan menambah baris manifest/Log. Simpanan staf lain tidak lagi tertahan saat ada yang mengunggah. Pasangan aplikasi: Pembaruan 2.6.1.\n') + M['catatan']
H = dict(M, versi='1.8.9', tanggal='2026-10-20', catatan=CAT, kode=k)
json.dump(H, open(os.path.join(R, 'server-modul-1.8.9.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
json.dump({'format': 'monitoring-sap-modul-patch', 'dari': '1.8.8', 'ke': '1.8.9', 'sha256Sumber': sha(M['kode']), 'sha256Hasil': sha(k), 'operasi': OP}, open(os.path.join(R, 'server-modul-1.8.9.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK server-modul-1.8.9.json ·', len(OP), 'operasi')
