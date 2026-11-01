#!/usr/bin/env python3
"""Rakit Pembaruan 2.9.9 & Modul server 1.10.5 (Asisten Koreksi Tagihan) dari paket 2.9.8 / 1.10.4:

  python3 -I tagihan/alat/rakit-298.py && python3 -I tagihan/alat/rakit-299.py

Modul 1.10.5 = server-modul-1.10.4.json + tagihan/sumber/server-kr.js (sebelum pembatas Petugas Gudang 1.10.1).
Aplikasi 2.9.9 = pembaruan-2.9.8.json + blok MP299 (sebelum MP264) + CSS."""
import json, os, re
from datetime import date

T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(os.path.dirname(T), 'asisten-ai-agen')
src = lambda n: open(os.path.join(T, 'sumber', n), encoding='utf-8').read()
VM, DM, VA, DA = '1.10.5', '1.10.4', '2.9.9', '2.9.8'
CAT_M = ('1.10.5 — KOREKSI TAGIHAN: aksi koreksiBK (koreksi volume BK termasuk BA yang sudah terbit; nomor BA tetap, revisi +1; paket tagihan '
         'dihitung ulang atomik — gagal → BK dikembalikan; Register: nilai dari harga Register; s/d > kontrak wajib nomor addendum; Diajukan/Proses/Dibayar ditolak; '
         'BK lama & paket Siap Diperiksa/Terverifikasi khusus Admin) dan koreksiBaca. Jejak audit sheet aditif <ID>_KoreksiTagihan. Pasangan aplikasi: Pembaruan 2.9.9.')
CAT_A = ('<b>Versi baru 2.9.9 tersedia.</b> Pembaruan 2.9.9 (kumulatif dari 2.9.8 … 2.2.7; butuh Modul server 1.10.5 untuk menyimpan koreksi).\n'
         'BARU 2.9.9 — ASISTEN KOREKSI TAGIHAN: tombol "Koreksi BK" di Paket Tagihan & Pembentuk Tagihan membuka koreksi 3 langkah (Bandingkan & ubah → Dampak & alasan → Simpan) '
         'untuk BK yang salah input, juga yang BA-nya sudah terbit. Volume koreksi dapat diisi otomatis dari Excel dokumen yang benar (BAPM/BAPP/BAP: item dicocokkan dari harga & uraian) '
         'atau tempel kolom "Saat ini". Paket tagihan dihitung ulang, Excel backup disusun ulang, semua perubahan tercatat (sebelum → sesudah, alasan, dokumen acuan). '
         '"Cek & Koreksi Tagihan" memeriksa seluruh BK (nilai ≠ volume × harga, melebihi kontrak, harga 0, paket ≠ BK, backup belum ada) dengan ekspor CSV.')

def modul():
    p = json.load(open(os.path.join(R, 'server-modul-%s.json' % DM), encoding='utf-8')); k = p['kode']
    j0 = '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.3) · ' % DM
    assert k.startswith(j0)
    k = k.replace(j0, '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.4) · 1.10.5: koreksi BK/tagihan beraudit (koreksiBK) · ' % VM, 1)
    for kunci in ("versiAI: '%s'", "versiTim: '%s'"):
        assert k.count(kunci % DM) == 1; k = k.replace(kunci % DM, kunci % VM)
    batas = '/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir'
    assert k.count(batas) == 1
    k = k.replace(batas, src('server-kr.js').rstrip('\n') + '\n\n' + batas)
    out = {'format': 'monitoring-sap-modul-server', 'versi': VM, 'untukKernel': '2.5', 'tanggal': date.today().isoformat(), 'catatan': CAT_M + '\n' + p['catatan'], 'kode': k}
    json.dump(out, open(os.path.join(R, 'server-modul-%s.json' % VM), 'w', encoding='utf-8'), ensure_ascii=False)
    print('modul %s: %d karakter' % (VM, len(k)))

def pembaruan():
    p = json.load(open(os.path.join(R, 'pembaruan-%s.json' % DA), encoding='utf-8'))
    js, n = re.subn(r"(const (?:VERSI_PAKET|VERSI) = ')[\d.]+'", r"\g<1>" + VA + "'", p['js']); assert n >= 4
    batas = '/* MP264 — PEMBARUAN'; assert js.count(batas) == 1
    js = js.replace(batas, src('mp299-koreksi.js').rstrip('\n') + '\n\n' + batas)
    p.update(versi=VA, js=js, css=p['css'].rstrip('\n') + '\n' + src('mp299-koreksi.css'), catatan=CAT_A + '\n' + p['catatan'], tanggal=date.today().isoformat())
    for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
    json.dump(p, open(os.path.join(R, 'pembaruan-%s.json' % VA), 'w', encoding='utf-8'), ensure_ascii=False)
    print('pembaruan %s → %s: js %d karakter' % (DA, VA, len(js)))

if __name__ == '__main__':
    modul(); pembaruan()
