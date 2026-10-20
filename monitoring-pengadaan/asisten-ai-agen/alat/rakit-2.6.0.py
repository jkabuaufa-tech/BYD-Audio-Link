#!/usr/bin/env python3
"""Rakit pembaruan-2.6.0.json dari pembaruan-2.5.9.json (+ patch terdokumentasi). Pasangan modul server 1.8.8.
2.6.0 — (A) Perbaiki item kontrak Master: pindahkan item yang salah kontrak hasil migrasi (mis. 027 Putra Paloh, CV tergabung ke 028 anugerah)
        ke nomor kontrak yang benar + perbaiki vendor; disimpan sebagai catatan koreksi berversi (aksi saveKoreksi yang sudah ada), Master Excel tidak diubah, dapat dibatalkan.
        (B) Pengguna online (Admin): siapa yang sedang online & sedang membuka/mengerjakan apa (modul server 1.8.8, CacheService saja).
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-2.6.0.py"""
import json, hashlib, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
P = json.load(open(os.path.join(R, 'pembaruan-2.5.9.json'), encoding='utf-8')); assert P['versi'] == '2.5.9'
js = open(os.path.join(R, 'sumber', '2.6.0', 'mp260.js'), encoding='utf-8').read()
css = open(os.path.join(R, 'sumber', '2.6.0', 'mp260.css'), encoding='utf-8').read()
OP = []
def ganti(cari, ganti_, ket, semua=None):
    o = {'berkas': 'js', 'jenis': 'ganti-semua' if semua else 'ganti-teks', 'cari': cari, 'ganti': ganti_, 'keterangan': ket}
    if semua: o['jumlah'] = semua
    OP.append(o)
ganti("= '2.5.9';", "= '2.6.0';", 'Nomor versi paket.', semua=4)
ganti("'gudangBaca', 'gudangBacaHal', 'identitasBaca',", "'gudangBaca', 'gudangBacaHal', 'hadirDetak', 'hadirDaftar', 'identitasBaca',", 'Pratinjau Admin (baca saja): aksi kehadiran termasuk aksi baca.')
OP.append({'berkas': 'js', 'jenis': 'tambah-akhir', 'isi': js, 'keterangan': 'Blok MP260: perbaikan item kontrak Master + pengguna online (aditif).'})
OP.append({'berkas': 'css', 'jenis': 'tambah-akhir', 'isi': '\n' + css, 'keterangan': 'CSS MP260 ditambahkan di akhir; aturan lama tidak diubah.'})
H = dict(P)
for o in OP:
    t = H[o['berkas']]
    if o['jenis'] == 'tambah-akhir': H[o['berkas']] = t + o['isi']; continue
    n = t.count(o['cari']); assert n == (o.get('jumlah') or 1), ('penanda', n, o['cari'][:90]); H[o['berkas']] = t.replace(o['cari'], o['ganti'])
assert H['js'].count('MP218_ADMIN_FIRST_MARKER') == P['js'].count('MP218_ADMIN_FIRST_MARKER')
CAT = ("Pembaruan 2.6.0 (kumulatif dari 2.5.9 … 2.2.7; pasangan Modul server 1.8.8).\n"
  "BARU 2.6.0 — (1) Register Kontrak › tombol cabang (Perbaiki item kontrak) pada kontrak Master: pindahkan item yang salah kontrak hasil migrasi ke nomor kontrak yang benar "
  "dan perbaiki vendor sumber/tujuan. Usulan siap pakai: 028/SPM/WK-NK.KSO/PDBJ/1726012/2026 → 12 item Putra Paloh, CV (2100010709) dipindah ke 027/SPM/WK-NK.KSO/PDBJ/1726012/2026, "
  "5 item tetap di 028 (anugerah) — sesuai spreadsheet baris 497–514. Disimpan sebagai catatan koreksi berversi (tercatat di Log), Master Excel, tagihan, WBS & riwayat tidak diubah; dapat dibatalkan. "
  "(2) Menu akun › Pengguna online (Admin): siapa yang online/diam/offline, menu & aktivitas yang sedang dibuka, aksi simpan terakhir, 3 catatan Log terakhir, perangkat — perlu Modul server 1.8.8.\n"
  "Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.5.9 (catatan perbaikan tetap tersimpan, hanya tidak diterapkan).\n") + P['catatan']
H.update(versi='2.6.0', tanggal='2026-10-20', catatan=CAT)
json.dump(H, open(os.path.join(R, 'pembaruan-2.6.0.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
X = {'format': 'monitoring-sap-pembaruan-patch', 'dari': '2.5.9', 'ke': '2.6.0', 'tanggal': '2026-10-20', 'keterangan': 'Patch 2.5.9 → 2.6.0. Unggah pembaruan-2.6.0.json.',
     'sha256Sumber': {'css': sha(P['css']), 'js': sha(P['js'])}, 'sha256Hasil': {'css': sha(H['css']), 'js': sha(H['js'])}, 'catatan': CAT, 'operasi': OP}
json.dump(X, open(os.path.join(R, 'pembaruan-2.6.0.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK pembaruan-2.6.0.json', len(json.dumps(H, ensure_ascii=False).encode()) // 1024, 'KB ·', len(OP), 'operasi')
