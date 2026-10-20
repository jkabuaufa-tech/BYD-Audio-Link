#!/usr/bin/env python3
"""Rakit pembaruan-2.5.9.json dari pembaruan-2.5.8.json (+ patch terdokumentasi). Pasangan modul server 1.8.7.
2.5.9 — "Data gudang gagal dimuat: Server mengirim halaman HTML, bukan data (HTTP 404) … Halaman Tidak Ditemukan Drive":
  data gudang dimuat bertahap per halaman (gudangBacaHal), diulang & diperkecil otomatis bila gagal; server lama tetap memakai
  gudangBaca dengan diagnosis yang tepat (server aktif tetapi respons terlalu besar vs URL /exec tidak valid). Baca saja, tanpa ubah data.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-2.5.9.py"""
import json, hashlib, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
P = json.load(open(os.path.join(R, 'pembaruan-2.5.8.json'), encoding='utf-8')); assert P['versi'] == '2.5.8'
blok = open(os.path.join(R, 'sumber', '2.5.9', 'mp259-gudang.js'), encoding='utf-8').read()
OP = []
def ganti(cari, ganti_, ket, semua=None):
    o = {'berkas': 'js', 'jenis': 'ganti-semua' if semua else 'ganti-teks', 'cari': cari, 'ganti': ganti_, 'keterangan': ket}
    if semua: o['jumlah'] = semua
    OP.append(o)
ganti("= '2.5.8';", "= '2.5.9';", 'Nomor versi paket.', semua=4)
ganti("'gudangBaca', 'identitasBaca',", "'gudangBaca', 'gudangBacaHal', 'identitasBaca',", 'Pratinjau Admin (baca saja): gudangBacaHal termasuk aksi baca.')
OP.append({'berkas': 'js', 'jenis': 'tambah-akhir', 'isi': blok, 'keterangan': 'Blok MP259: data gudang dimuat bertahap + diagnosis galat HTML/404 (aditif, baca saja).'})
H = dict(P)
for o in OP:
    t = H[o['berkas']]
    if o['jenis'] == 'tambah-akhir': H[o['berkas']] = t + o['isi']; continue
    n = t.count(o['cari']); assert n == (o.get('jumlah') or 1), ('penanda', n, o['cari'][:90]); H[o['berkas']] = t.replace(o['cari'], o['ganti'])
assert H['js'].count('MP218_ADMIN_FIRST_MARKER') == P['js'].count('MP218_ADMIN_FIRST_MARKER')
CAT = ("Pembaruan 2.5.9 (kumulatif dari 2.5.8 … 2.2.7; pasangan Modul server 1.8.7).\n"
  "PERBAIKAN 2.5.9 — \"Data gudang gagal dimuat: Server mengirim halaman HTML, bukan data (HTTP 404) … Halaman Tidak Ditemukan Drive\": "
  "seluruh transaksi gudang dulu dikirim dalam satu respons; bila data gudang besar Google menampilkan halaman Drive 404 walau server aktif. "
  "Kini data gudang dimuat bertahap per halaman (perlu Modul server 1.8.7), tiap halaman diulang & diperkecil otomatis bila gagal. "
  "Bila server belum 1.8.7, aplikasi tetap memakai cara lama dan pesan galat menyebut sebab sebenarnya (server aktif tetapi respons terlalu besar → pasang modul 1.8.7; atau URL /exec memang tidak valid). "
  "Baca saja — tidak ada data gudang yang ditulis, diubah atau dihapus.\n"
  "Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.5.8.\n") + P['catatan']
H.update(versi='2.5.9', tanggal='2026-10-20', catatan=CAT)
json.dump(H, open(os.path.join(R, 'pembaruan-2.5.9.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
X = {'format': 'monitoring-sap-pembaruan-patch', 'dari': '2.5.8', 'ke': '2.5.9', 'tanggal': '2026-10-20', 'keterangan': 'Patch 2.5.8 → 2.5.9 (hanya JS aplikasi). Unggah pembaruan-2.5.9.json.',
     'sha256Sumber': {'css': sha(P['css']), 'js': sha(P['js'])}, 'sha256Hasil': {'css': sha(H['css']), 'js': sha(H['js'])}, 'catatan': CAT, 'operasi': OP}
json.dump(X, open(os.path.join(R, 'pembaruan-2.5.9.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK pembaruan-2.5.9.json', len(json.dumps(H, ensure_ascii=False).encode()) // 1024, 'KB ·', len(OP), 'operasi')
