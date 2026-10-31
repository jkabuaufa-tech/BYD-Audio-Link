#!/usr/bin/env python3
"""Rakit Pembaruan 2.9.8 & Modul server 1.10.4 (Excel backup paket tagihan) dari paket dasar 2.9.7 / 1.10.3:

  python3 -I tagihan/alat/rakit-298.py            → asisten-ai-agen/pembaruan-2.9.8.json + server-modul-1.10.4.json

Modul  = server-modul-1.10.3.json utuh + tagihan/sumber/server-bx.js (disisipkan sebelum pembatas Petugas Gudang 1.10.1,
         agar aksi baru ikut dibatasi) + penanda versi.
Aplikasi = pembaruan-2.9.7.json + kait isian di MP293 (satu baris, teks lama wajib unik) + blok MP298 sebelum MP264 + CSS."""
import json, os, re, sys
from datetime import date

T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(os.path.dirname(T), 'asisten-ai-agen')
baca = lambda p: open(p, encoding='utf-8').read()
src = lambda n: baca(os.path.join(T, 'sumber', n))
VM, DM, VA, DA = '1.10.4', '1.10.3', '2.9.8', '2.9.7'

CAT_M = ('1.10.4 — BACKUP EXCEL PAKET TAGIHAN: aksi blExcelSelesai (unggah bertahap .xlsx ber-SHA-256 → Drive <No_Urut> <Jenis> <Vendor>/Kelengkapan/'
         'BAP_<Pekerjaan>_<Vendor>_Termin-<X>.xlsx; akar arsip = Script Property BX_AKAR atau folder proyek › Arsip Kontrak Vendor), blExcelDaftar, blExcelAmbil. '
         'Sheet aditif <ID>_BackupExcelTagihan (versi lama berstatus DIGANTI). blBaca/blDaftar/blKonteks membawa ringkasan backup; paket SPM/SPPM/SPK/SPPP/SPKP/SPKU '
         'wajib ber-backup Excel sebelum SIAP DIPERIKSA (BX_WAJIB=0 untuk mematikan). Pasangan aplikasi: Pembaruan 2.9.8.')
CAT_A = ('<b>Versi baru 2.9.8 tersedia.</b> Pembaruan 2.9.8 (kumulatif dari 2.9.7 … 2.2.7; butuh Modul server 1.10.4 untuk arsip backup Excel).\n'
         'BARU 2.9.8 — EXCEL BACKUP PAKET TAGIHAN: setiap Simpan BK, Terbitkan BA dan pembentukan paket otomatis menyusun Excel format baku (BAP format untuk SPK/SPPP/SPKP, '
         'Master SPM untuk SPM/SPPM) dari Register Kontrak, Master Data Vendor (rekanan) dan volume termin Input Progres — Nama Proyek, % Uang Muka & % Retensi ikut terisi, '
         'narasi BAP SPM memuat min. 3 material utama urut nilai progres — lalu menyimpannya ke arsip "<No> <Jenis> <Vendor>/Kelengkapan" sebagai lampiran wajib Paket Tagihan. '
         'Paket Tagihan & Pembentuk Tagihan: tombol "Unduh Excel Backup (.xlsx)", "Pratinjau & Cetak PDF" (A4 dari berkas Excel) dan "Susun ulang backup". '
         'Print Area, Page Setup, kop, merge cells & rumus sheet cetak tidak diubah.')

def modul():
    p = json.load(open(os.path.join(R, 'server-modul-%s.json' % DM), encoding='utf-8')); k = p['kode']
    j0 = '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.2) · ' % DM
    assert k.startswith(j0), 'judul modul dasar tidak dikenali'
    k = k.replace(j0, '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.3) · 1.10.4: backup Excel format baku paket tagihan (blExcel*) · ' % VM, 1)
    for kunci in ("versiAI: '%s'", "versiTim: '%s'"):
        assert k.count(kunci % DM) == 1, kunci
        k = k.replace(kunci % DM, kunci % VM)
    batas = '/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir'
    assert k.count(batas) == 1 and k.rstrip().endswith('return MODUL;')
    k = k.replace(batas, src('server-bx.js').rstrip('\n') + '\n\n' + batas)
    out = {'format': 'monitoring-sap-modul-server', 'versi': VM, 'untukKernel': '2.5', 'tanggal': date.today().isoformat(), 'catatan': CAT_M + '\n' + p['catatan'], 'kode': k}
    json.dump(out, open(os.path.join(R, 'server-modul-%s.json' % VM), 'w', encoding='utf-8'), ensure_ascii=False)
    print('modul %s: %d karakter (dasar %s %d)' % (VM, len(k), DM, len(p['kode'])))

GANTI = [{
    'lama': "return f === 'spm' ? isianSPM(K) : isianBAP(K); };",
    'baru': "const I = f === 'spm' ? isianSPM(K) : isianBAP(K); if (typeof window.mp298TambahIsian === 'function') window.mp298TambahIsian(K, I, f); return I; };   // [2.9.8] kait isian MP298"
}]

def pembaruan():
    p = json.load(open(os.path.join(R, 'pembaruan-%s.json' % DA), encoding='utf-8'))
    js, n = re.subn(r"(const (?:VERSI_PAKET|VERSI) = ')[\d.]+'", r"\g<1>" + VA + "'", p['js'])
    assert n >= 4, 'penanda versi %d' % n
    for g in GANTI:
        assert js.count(g['lama']) == 1, 'teks lama tidak unik: ' + g['lama']
        js = js.replace(g['lama'], g['baru'])
    batas = '/* MP264 — PEMBARUAN'
    assert js.count(batas) == 1
    js = js.replace(batas, src('mp298-excel-backup.js').rstrip('\n') + '\n\n' + batas)
    p.update(versi=VA, js=js, css=p['css'].rstrip('\n') + '\n' + src('mp298-excel-backup.css'), catatan=CAT_A + '\n' + p['catatan'], tanggal=date.today().isoformat())
    for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
    json.dump(p, open(os.path.join(R, 'pembaruan-%s.json' % VA), 'w', encoding='utf-8'), ensure_ascii=False)
    print('pembaruan %s → %s: js %d karakter, %d penanda versi' % (DA, VA, len(js), n))

if __name__ == '__main__':
    modul(); pembaruan()
