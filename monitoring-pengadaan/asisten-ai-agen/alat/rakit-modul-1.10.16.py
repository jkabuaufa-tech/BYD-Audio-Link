#!/usr/bin/env python3
"""Rakit Modul server 1.10.16 dari 1.10.15 + blok sumber/modul-1.10.16-notif-aktif.js.

  python3 alat/rakit-modul-1.10.16.py server-modul-1.10.15.json sumber/modul-1.10.16-notif-aktif.js server-modul-1.10.16.json
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
m = re.search(r"/\* MODUL SERVER 1\.10\.15 — untuk kernel Code\.gs v2\.5 \(kumulatif dari 1\.0\.0 … 1\.10\.14\) · ", s)
if not m: sys.exit('kepala modul 1.10.15 tidak ditemukan')
s = s.replace(m.group(0), '/* MODUL SERVER 1.10.16 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.15) · 1.10.16: notifikasi hanya kontrak aktif — ringkasan kontrak disaring di server (PO CANCEL / HOLD, sudah dihapus dari Register, sudah digantikan addendum) · ', 1)
# ringkasan dari aplikasi: simpan nomor kontrak lengkap & asal baris
ganti("urg: Math.max(0, Math.min(9, Number(x && x.urg) || 0)), umur: Number(x && x.umur) || 0 })).filter(x => x.judul);",
      "urg: Math.max(0, Math.min(9, Number(x && x.urg) || 0)), umur: Number(x && x.umur) || 0, no: s_(x && x.no).slice(0, 120), reg: x && x.reg ? 1 : 0 })).filter(x => x.judul);")
# susun notifikasi: hanya kontrak aktif
ganti("    const L = g('kontrak').item.map(x => { const s = x.tgl ? selisihHari(x.tgl) : null; return Object.assign({}, x, { sisa: s }); })\n",
      "    const L = g('kontrak').item.filter(naSaring(P)).map(x => { const s = x.tgl ? selisihHari(x.tgl) : null; return Object.assign({}, x, { sisa: s }); })   // 1.10.16: hanya kontrak aktif\n")
ganti("/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir", open(blok, encoding='utf-8').read().rstrip('\n') + "\n\n/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir")
catatan = ("1.10.16 — NOTIFIKASI HANYA KONTRAK AKTIF: saat menyusun notifikasi (email / Telegram terjadwal, kirim manual, pratinjau, konteks Asisten AI) server menyaring ulang ringkasan kontrak: "
  "keluarga kontrak berstatus PO CANCEL / HOLD, kontrak Register yang sudah dihapus / dibatalkan, dan kontrak yang sudah digantikan addendum terposting tidak lagi dimuat — tanpa menunggu aplikasi mengirim ringkasan baru. "
  "Butir ringkasan menyimpan nomor kontrak lengkap (no) & asal baris (reg); ringkasan lama disaring dari awalan judul. Tidak ada sheet / data yang diubah. Fitur: notifKontrakAktif. Pasangan: Pembaruan 2.10.16.\n")
p.update(versi='1.10.16', kode=s, catatan=catatan + p['catatan'], tanggal=date.today().isoformat())
for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('ok', out, len(s))
