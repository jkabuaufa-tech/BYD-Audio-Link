#!/usr/bin/env python3
"""Terapkan patch pembaruan (mis. pembaruan-2.5.6.patch.json) — contoh lama: pembaruan-2.2.8.patch.json ke pembaruan-2.2.7.json → pembaruan-2.2.8.json (cek SHA-256 sumber & hasil).
Pakai: python3 terapkan-patch.py pembaruan-2.2.7.json pembaruan-2.2.8.patch.json pembaruan-2.2.8.json"""
import json, sys, hashlib
src, pt, out = sys.argv[1:4]
P, X = json.load(open(src, encoding='utf-8')), json.load(open(pt, encoding='utf-8'))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
for b in ('css', 'js'):
    if sha(P[b]) != X['sha256Sumber'][b]: sys.exit('Sumber %s bukan paket %s yang diharapkan.' % (b, X['dari']))
for o in X['operasi']:
    t = P[o['berkas']]
    if o['jenis'] == 'ganti-teks':
        if t.count(o['cari']) != 1: sys.exit('Penanda tidak unik: ' + o['cari'][:60])
        t = t.replace(o['cari'], o['ganti'])
    elif o['jenis'] == 'ganti-semua':   # 2.5.6: penanda muncul tepat o['jumlah'] kali
        if t.count(o['cari']) != o['jumlah']: sys.exit('Jumlah penanda tidak sesuai: ' + o['cari'][:60])
        t = t.replace(o['cari'], o['ganti'])
    elif o['jenis'] == 'tambah-akhir':   # 2.5.6: blok baru di akhir berkas
        t = t + o['isi']
    else:
        a = t.find(o['mulai'])
        if a < 0 or t.count(o['mulai']) != 1: sys.exit('Penanda mulai tidak ditemukan: ' + o['mulai'][:60])
        e = len(t) if o['akhir'] is None else t.find(o['akhir'], a) + (len(o['akhir']) if o.get('sertakanAkhir') else 0)
        t = t[:a] + o['isi'] + t[e:]
    P[o['berkas']] = t
for b in ('css', 'js'):
    if sha(P[b]) != X['sha256Hasil'][b]: sys.exit('Hasil %s tidak cocok dengan SHA-256 patch.' % b)
P.update(versi=X['ke'], tanggal=X['tanggal'], catatan=X['catatan'])
json.dump(P, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('OK → %s (versi %s)' % (out, X['ke']))
