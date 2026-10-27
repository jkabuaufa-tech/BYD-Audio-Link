#!/usr/bin/env python3
"""Rakit seluruh keluaran integrasi Paket Tagihan dari sumber/:

  python3 -I alat/rakit.py modul       → asisten-ai-agen/server-modul-1.10.0.json (+ sumber/modul-1.10.0-lengkap.js)
  python3 -I alat/rakit.py pembaruan   → asisten-ai-agen/pembaruan-2.7.0.json (blok MP270 di atas pembaruan-2.6.24.json)
  python3 -I alat/rakit.py billing     → billing-generator/ (pustaka bersama disalin)
  python3 -I alat/rakit.py semua

Modul = modul-1.9.6-lengkap.js utuh + inti.js + server-bl.js (disisipkan sebelum "return MODUL;"); kode lama tidak diubah
selain baris judul versi. Pembaruan = rakit-pembaruan.py (penanda versi, blok sebelum MP264, CSS di akhir, catatan di depan)."""
import json, os, subprocess, sys
from datetime import date

T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # monitoring-pengadaan/tagihan
R = os.path.join(os.path.dirname(T), 'asisten-ai-agen')
BG = os.path.join(os.path.dirname(T), 'billing-generator')
baca = lambda p: open(p, encoding='utf-8').read()
src = lambda n: baca(os.path.join(T, 'sumber', n))

VERSI_MODUL, DASAR_MODUL = '1.10.0', '1.9.6'
VERSI_APP, DASAR_APP = '2.7.0', '2.6.24'
CATATAN_MODUL = ('Modul server 1.10.0 (kumulatif dari 1.9.6 … 1.0.0; kernel Code.gs 2.5.1, tanpa mengubah Code.gs, tanpa izin Google baru, tanpa mengubah data lama). Pasangan aplikasi: Pembaruan 2.7.0 & Billing Generator 2.0.0.\n'
  'BARU 1.10.0 — PAKET TAGIHAN: aksi bl* (blInfo, blDaftar, blBaca, blKonteks, blKonfigBaca/Simpan, blSimpan, blStatus, blDokumen, blKeChecklist, blUnggahMulai/Potong/Selesai). '
  'Sheet baru <ID>_PaketTagihan, <ID>_PaketTagihanVersi, <ID>_KonfigTagihan (aditif). Perhitungan dihitung ulang di server (mesin tagihan 1.0.0: DPP nilai lain, PPN dikonfigurasi per kontrak, PPh, uang muka, retensi). '
  'Kontrol: 1 BK = 1 paket, surat jalan tidak boleh ganda, kumulatif ≤ volume kontrak kecuali addendum, kunci idempotensi & versi (optimistic concurrency), unggah PDF bertahap ber-SHA-256. '
  'Terverifikasi/Diajukan/Dibayar dibaca dari Checklist Tagihan & Keuangan & Bayar (tidak diubah modul).')
CATATAN_APP = ('<b>Versi baru 2.7.0 tersedia.</b> Pembaruan 2.7.0 (kumulatif dari 2.6.24 … 2.2.7; butuh Modul server 1.10.0 untuk menyimpan paket, tanpa perubahan data lama).\n'
  'BARU 2.7.0 — PAKET TAGIHAN: tombol "Buat Paket Tagihan" di Register Kontrak, Input Progres, Monitoring BK dan Keuangan & Bayar. Data kontrak, item BOQ, vendor, WBS, PR/PO & riwayat BK diambil otomatis; '
  'pilih BK/termin, pratinjau perhitungan & dokumen (BAPM/BAPA/BAPP, BAP Pembayaran, rekap, draf invoice & kwitansi, checklist), Simpan Draft, Validasi, Buat PDF (terpisah & bundel) → Drive, tautkan ke Checklist. '
  'Dashboard Tagihan: KPI, pipeline, aging, dokumen bermasalah, ekspor Excel. Menu akun › Paket Tagihan. Tanpa modul 1.10.0 menu tetap tampil dalam mode pratinjau (tidak menyimpan).')

def modul():
    k = baca(os.path.join(R, 'sumber', 'modul-%s-lengkap.js' % DASAR_MODUL))
    akhir = 'return MODUL;\n'
    assert k.endswith(akhir) and k.count(akhir) == 1, 'akhir modul dasar tidak dikenali'
    judul = '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.9.5)' % DASAR_MODUL
    assert k.startswith(judul)
    k = k.replace(judul, '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.9.6) · 1.10.0: paket tagihan (BL) — Billing Generator terintegrasi' % VERSI_MODUL, 1)
    for kunci in ("versiAI: '%s'", "versiTim: '%s'"):   # penanda versi modul seperti rilis sebelumnya
        assert k.count(kunci % DASAR_MODUL) == 1, kunci
        k = k.replace(kunci % DASAR_MODUL, kunci % VERSI_MODUL)
    sisip = '\n/* ===== 1.10.0 — tagihan/sumber/inti.js ===== */\n' + src('inti.js') + '\n' + src('server-bl.js') + '\n'
    k = k[:-len(akhir)] + sisip + akhir
    for t in (k,):
        assert 'module.exports = BLI' in t   # baris ekspor Node aman di Apps Script (module tidak didefinisikan)
    open(os.path.join(R, 'sumber', 'modul-%s-lengkap.js' % VERSI_MODUL), 'w', encoding='utf-8').write(k)
    lama = json.load(open(os.path.join(R, 'server-modul-%s.json' % DASAR_MODUL), encoding='utf-8'))
    p = {'format': 'monitoring-sap-modul-server', 'versi': VERSI_MODUL, 'untukKernel': '2.5', 'tanggal': date.today().isoformat(),
         'catatan': (CATATAN_MODUL + '\n' + lama['catatan'])[:1990], 'kode': k}
    json.dump(p, open(os.path.join(R, 'server-modul-%s.json' % VERSI_MODUL), 'w', encoding='utf-8'), ensure_ascii=False)
    print('modul %s: %d karakter (dasar %s %d)' % (VERSI_MODUL, len(k), DASAR_MODUL, len(lama['kode'])))

def blok_ui():
    # pustaka bersama dijalankan di dalam satu IIFE; BLI/BLD/BLRH/BLRP diekspor ke window untuk Billing Generator & uji
    isi = '\n'.join(src(n) for n in ('inti.js', 'dokumen.js', 'render-html.js', 'render-pdf.js'))
    isi = isi.replace("if (typeof module !== 'undefined' && module.exports) module.exports = BLI;", 'window.BLI = BLI;') \
             .replace("if (typeof module !== 'undefined' && module.exports) module.exports = BLD;", 'window.BLD = BLD;') \
             .replace("if (typeof module !== 'undefined' && module.exports) module.exports = BLRH;", 'window.BLRH = BLRH;') \
             .replace("if (typeof module !== 'undefined' && module.exports) module.exports = BLRP;", 'window.BLRP = BLRP;')
    assert isi.count('window.BL') == 4
    ui = src('ui-msap.js')
    return ('/* MP270 — PEMBARUAN 2.7.0: PAKET TAGIHAN (Billing Generator terintegrasi) — butuh Modul server 1.10.0 · fitur "paketTagihan".\n'
            ' * Pustaka bersama tagihan/sumber (inti, dokumen, render-html, render-pdf) + antarmuka. Aditif: tidak mengubah fungsi lama. */\n'
            '(function () {\n  if (window.MP270_PUSTAKA) return; window.MP270_PUSTAKA = true;\n' + isi + '\n})();\n' + ui)

def pembaruan():
    tmp = os.path.join(T, 'alat', '.rakit'); os.makedirs(tmp, exist_ok=True)
    open(os.path.join(tmp, 'blok.js'), 'w', encoding='utf-8').write(blok_ui())
    open(os.path.join(tmp, 'blok.css'), 'w', encoding='utf-8').write(src('ui-msap.css'))
    open(os.path.join(tmp, 'catatan.txt'), 'w', encoding='utf-8').write(CATATAN_APP)
    subprocess.check_call([sys.executable, '-I', os.path.join(R, 'alat', 'rakit-pembaruan.py'), os.path.join(R, 'pembaruan-%s.json' % DASAR_APP),
                           os.path.join(tmp, 'blok.js'), os.path.join(tmp, 'blok.css'), VERSI_APP, os.path.join(tmp, 'catatan.txt'), os.path.join(R, 'pembaruan-%s.json' % VERSI_APP)])
    for n in ('blok.js', 'blok.css', 'catatan.txt'): os.remove(os.path.join(tmp, n))
    os.rmdir(tmp)

def billing():
    lib = os.path.join(BG, 'lib'); os.makedirs(lib, exist_ok=True)
    for n in ('inti.js', 'dokumen.js', 'render-html.js', 'render-pdf.js'):
        open(os.path.join(lib, n), 'w', encoding='utf-8').write('/* disalin dari monitoring-pengadaan/tagihan/sumber/%s oleh alat/rakit.py — jangan diubah di sini */\n' % n + src(n))
    print('billing-generator/lib: 4 pustaka bersama disalin')

if __name__ == '__main__':
    a = sys.argv[1] if len(sys.argv) > 1 else 'semua'
    if a in ('modul', 'semua'): modul()
    if a in ('pembaruan', 'semua'): pembaruan()
    if a in ('billing', 'semua'): billing()
