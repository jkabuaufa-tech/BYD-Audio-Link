#!/usr/bin/env python3
"""Buat Excel uji 'dokumen benar' BAPM 02 bergaya berkas proyek (grup A/B/C, baris keterangan batang, baris nomor kolom, JUMLAH).
   python3 -I tagihan/uji/buat_bapm_farika.py /tmp/BAPM_02_Farika.xlsx"""
import sys
from openpyxl import Workbook
wb = Workbook(); ws = wb.active; ws.title = 'BAPM 2'
ws['A1'] = 'BERITA ACARA PENERIMAAN MATERIAL (BAPM)'
ws.append([]); r0 = 3
ws.cell(r0, 1, 'NO.'); ws.cell(r0, 2, 'JENIS ITEM'); ws.cell(r0, 3, 'VOLUME KONTRAK'); ws.cell(r0, 4, 'SAT'); ws.cell(r0, 5, 'PROGRES REAL VOLUME'); ws.cell(r0, 9, 'HARGA (Rp)'); ws.cell(r0, 10, 'JUMLAH HARGA (Rp)')
for c, t in zip(range(5, 9), ['YG LALU', 'SAAT INI', 'SD. SAAT INI', 'SISA']): ws.cell(r0 + 1, c, t)
for c, t in zip(range(1, 11), ['1', '2', '3', '4', '5', '6', '7=5+6', '8=3-7', '9', '10 = 6 x 9']): ws.cell(r0 + 2, c, t)
rows = [('A', 'Pengadaan Steel Pipe Sheet Pile Ø 1524 t= 19 mm, ASTM A252 Grade 3', '-', '-', '-', '-', '-', '-', '-', None),
 (1, 'Pengadaan SPSP  Ø 1524, t=19mm', 4696299, 'kg', 469629.9, '-', 469629.9, 4226669.1, 12900, '-'),
 (2, 'Pekerjaan Clutch Sistem', 4440, "m'", 444, '-', 444, 3996, 1900000, '-'),
 (3, 'Cat Coating Epoxy SPSP', 2548.56, 'm2', 254.86, '-', 254.86, 2293.7, 370000, '-'),
 (None, '- SPSP dia. 1524, GRADE 3 tb 19, L=30 = 222 btg', None, None, None, None, None, None, None, None),
 ('B', 'Pengadaan Steel Pipe Sheet Pile Ø 1524 t= 14 mm, ASTM A252 Grade 3', None, None, None, None, None, None, None, None),
 (1, 'Pengadaan SPSP  Ø 1524, t=14mm', 159520.86, 'kg', 15952.09, '-', 15952.09, 143568.77, 12900, '-'),
 (2, 'Pekerjaan Clutch Sistem', 274, "m'", 27.4, '-', 27.4, 246.6, 1900000, '-'),
 (None, '- SPSP dia. 1524, GRADE 3 tb 14, L=24 = 8 btg', None, None, None, None, None, None, None, None),
 ('C', 'Pengadaan Steel Pipe Pile, SPP Ø072 mm, t= 19 mm, ASTM A252 Grade 2', None, None, None, None, None, None, None, None),
 (1, 'Pekerjaan Steel Pipe Pile, SPP Ø702 mm, t = 19mm', 206086.44, 'kg', 20608.64, 185477.8, 206086.44, '-', 12550, 2327746390),
 (2, 'Cat Coating Epoxy SPSP', 72.82, 'm2', 7.28, 65.54, 72.82, '(0.00)', 370000, 24249800),
 (None, '- SPP dia. 702, GRADE 2 tb 19, L=25 = 5 btg', None, None, None, None, None, None, None, None),
 (3, 'Penebalan dalam t. 19mm P. 0,8 M (Panjang 32 M)', 12, 'Btg', 1.2, 10.8, 12, '-', 4250000, 45900000)]
for i, x in enumerate(rows):
    for c, v in enumerate(x, 1):
        if v is not None: ws.cell(r0 + 3 + i, c, v)
ws.cell(r0 + 3 + len(rows) + 1, 1, 'JUMLAH'); ws.cell(r0 + 3 + len(rows) + 1, 10, 2397896190)
wb.save(sys.argv[1]); print('ok', sys.argv[1])
