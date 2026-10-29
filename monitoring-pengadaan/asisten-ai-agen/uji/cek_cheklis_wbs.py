"""Cek berkas unduhan Cheklis WBS (2.9.1) terhadap berkas acuan CHEKLIS WBS TAGIHAN BULAN … (format, gaya, rumus).
   python3 -I uji/cek_cheklis_wbs.py <hasil.xlsx> <acuan.xlsx>"""
import sys, openpyxl
hasil, acuan = openpyxl.load_workbook(sys.argv[1]), openpyxl.load_workbook(sys.argv[2])
H, A = hasil.active, acuan.active
lulus = 0
def ok(c, m):
    global lulus
    assert c, m
    lulus += 1; print('  ✓ ' + m)
def gaya(c):
    b = c.border
    return (c.font.name, bool(c.font.b), c.number_format, tuple(getattr(b, s).style for s in ('left', 'right', 'top', 'bottom')), c.alignment.horizontal, c.alignment.vertical)
ok(H.title == A.title == 'Sheet1', 'satu lembar "Sheet1"')
ok([H.cell(4, c).value for c in range(2, 13)] == [A.cell(4, c).value for c in range(2, 13)], 'judul kolom B4:L4 sama persis')
ok(all(gaya(H.cell(4, c)) == gaya(A.cell(4, c)) for c in range(2, 13)), 'gaya judul (tebal, garis tipis, rata tengah) sama')
ok(all(abs((H.column_dimensions[k].width or 0) - A.column_dimensions[k].width) < 0.01 for k in 'CDEFGHIJKL'), 'lebar kolom C–L sama')
ok(H.sheet_view.zoomScale == A.sheet_view.zoomScale, 'zoom tampilan sama (%s%%)' % H.sheet_view.zoomScale)
ok(all(H.cell(r, 2).value is None for r in range(1, 4)), 'baris 1–3 kosong seperti acuan')
# baris pertama kontrak = acuan baris 5 (SPSA) — gaya per kolom
ok(all(gaya(H.cell(5, c)) == gaya(A.cell(5, c)) for c in range(2, 13)), 'gaya baris item pertama (No, WBS, vendor, kontrak, ID, uraian, volume, harsat, jumlah, total, keterangan) sama dengan acuan')
ok(H['J5'].value == '=I5*H5' and H['K5'].value == '=SUM(J5)', 'rumus JUMLAH = I×H, TOTAL KONTRAK = SUM(J…) seperti acuan')
ok(all(gaya(H.cell(6, c)) == gaya(A.cell(6, c)) for c in range(2, 13)) and all(H.cell(6, c).value is None for c in range(2, 13)), 'baris kosong bergaris antar-kontrak sama dengan acuan')
# blok kontrak & baris total
blok = [r for r in range(5, H.max_row + 1) if H.cell(r, 2).value is not None]
ok([H.cell(r, 2).value for r in blok] == list(range(1, len(blok) + 1)), 'No. kontrak berurutan 1…%d' % len(blok))
for r in blok:
    k = H.cell(r, 11).value; assert k and k.startswith('=SUM(J'), (r, k)
ok(True, 'setiap kontrak punya TOTAL KONTRAK =SUM(J awal:J akhir)')
tot = [r for r in range(1, H.max_row + 1) if H.cell(r, 10).value == 'TOTAL ']
ok(len(tot) == 1 and str(H.cell(tot[0], 11).value).startswith('=SUM(K5:K') and H.cell(tot[0] - 1, 2).border.left.style is None and H.cell(tot[0] - 2, 2).border.left.style == 'thin', 'baris TOTAL =SUM(K5:K…) satu baris di bawah tabel, seperti acuan')
ok(gaya(H.cell(tot[0], 10)) == gaya(A['J117']) and gaya(H.cell(tot[0], 11)) == gaya(A['K117']), 'gaya baris TOTAL sama dengan acuan')
# tingkat berkas: bagian Excel (gaya, tema, susunan lembar) sama dengan acuan
import zipfile, re
zh, za = zipfile.ZipFile(sys.argv[1]), zipfile.ZipFile(sys.argv[2])
ok(zh.read('xl/styles.xml') == za.read('xl/styles.xml') and zh.read('xl/theme/theme1.xml') == za.read('xl/theme/theme1.xml'), 'styles.xml & tema Office identik dengan acuan (byte demi byte)')
ok(set(zh.namelist()) == set(za.namelist()) - {'xl/calcChain.xml'}, 'susunan bagian berkas sama dengan acuan: ' + ', '.join(sorted(zh.namelist())))
sh, sa = zh.read('xl/worksheets/sheet1.xml').decode(), za.read('xl/worksheets/sheet1.xml').decode()
pola = lambda x, r: re.sub(r'<v>[^<]*</v>|<f>[^<]*</f>|<f [^>]*/>| t="s"', '', re.search(r'<row r="%d".*?</row>' % r, x).group(0))
ok(pola(sh, 4) == pola(sa, 4) and pola(sh, 5) == pola(sa, 5) and pola(sh, 6) == pola(sa, 6), 'XML baris judul, baris item & baris kosong sama dengan acuan (indeks gaya per sel)')
ok(sh[:sh.index('<sheetData>')].split('<dimension')[1].split('/>', 1)[1].replace('B5', 'X') .count('zoomScale="74"') == 1 and '<cols>' + sa.split('<cols>')[1].split('</cols>')[0] + '</cols>' in sh, 'kolom & tampilan lembar sama dengan acuan')
print('\nLULUS %d cek format Cheklis WBS' % lulus)
