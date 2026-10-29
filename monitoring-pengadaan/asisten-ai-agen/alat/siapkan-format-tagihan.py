#!/usr/bin/env python3
"""Siapkan format Excel tagihan BAKU (Master SPM / BAP format) menjadi template ringan untuk unduhan "Format Excel Baku" (2.9.2).

  python3 -I alat/siapkan-format-tagihan.py spm <Master_SPM.xlsx> <keluar.xlsx>
  python3 -I alat/siapkan-format-tagihan.py bap <BAP - format.xlsx> <keluar.xlsx>

Yang TIDAK diubah: seluruh sheet cetak (tata letak, gaya, rumus, gabungan sel, logo/gambar, pengaturan cetak, sheet tersembunyi).
Yang dibuang / dikosongkan (agar ringan & tanpa data contoh):
- sheet tersembunyi "rekanan" (database ±16 ribu vendor, 28 MB) — sel rumus yang membacanya dikosongkan dan diisi aplikasi
  (alamat, NPWP, email, rekening vendor dari Master Data › Vendor);
- tautan ke berkas eksternal (ratusan, sisa salinan berkas lain) & nama terdefinisi rusak / tak terpakai, calcChain;
- nilai tersimpan rumus (Excel menghitung ulang saat dibuka: fullCalcOnLoad);
- isian contoh vendor / item / termin (diisi aplikasi per BK).
Rumus yang rusak di berkas asli (#REF! / tautan berkas lain) pada sheet yang dicetak diganti rujukan ke sheet DATA yang setara.
"""
import sys, re, zipfile, html, io

jenis, masuk, keluar = sys.argv[1:4]
z = zipfile.ZipFile(masuk)
F = {n: z.read(n) for n in z.namelist()}
T = lambda n: F[n].decode('utf-8')

# ---------- konfigurasi per format ----------
if jenis == 'spm':
    KOSONG = {   # sheet: daftar sel / rentang isian contoh yang dikosongkan (bukan rumus)
        'INPUT': ['B23', 'B24', 'B28', 'B29', 'D23:D30', 'B32', 'B36', 'B37', 'B55:B58'],
        'ITEM': ['B4:E103', 'G4:J103'],
    }
    PERBAIKI = {}
elif jenis == 'bap':
    KOSONG = {
        'DATA': ['B4', 'B5', 'B6', 'B8', 'B9', 'B22', 'B23', 'B24', 'B34', 'B35', 'B73', 'B80', 'B81', 'B84', 'B85', 'B99:B104'],
        'lamp1': ['B13:J39'],
        'REKAP PROGRES': ['J2:O29'],
    }
    PERBAIKI = {   # rumus rusak di berkas asli pada sheet yang dicetak → rujukan setara di DATA
        'lamp1': {'I56': 'UPPER(DATA!$B$24)', 'I64': 'DATA!$B$22', 'I65': 'DATA!$B$23',
                  'B56': 'UPPER(DATA!$B$17)', 'B57': 'UPPER(DATA!$B$19)', 'B64': 'DATA!$B$69', 'B65': 'DATA!$B$70'},
        'rincian ': {'B4': 'UPPER(""&DATA!$B$6)'},
    }
else:
    sys.exit('jenis: spm | bap')

# ---------- peta sheet ----------
wb = T('xl/workbook.xml')
rels = T('xl/_rels/workbook.xml.rels')
rid = {}
for m in re.finditer(r'<Relationship [^>]*?/>', rels):
    a = m.group(0); i = re.search(r'Id="([^"]+)"', a).group(1); t = re.search(r'Target="([^"]+)"', a).group(1); rid[i] = t
sheets = []   # (nama, rId, berkas)
for m in re.finditer(r'<sheet [^>]*?/>', wb):
    a = m.group(0)
    nama = html.unescape(re.search(r'name="([^"]*)"', a).group(1)); r = re.search(r'r:id="([^"]+)"', a).group(1)
    sheets.append((nama, r, 'xl/' + rid[r].lstrip('/').replace('xl/', '')))
buang = [s for s in sheets if s[0] == 'rekanan']
simpan = [s for s in sheets if s[0] != 'rekanan']
idx_lama = {s[0]: i for i, s in enumerate(sheets)}
print('sheet dibuang:', [s[0] for s in buang], '· disimpan:', len(simpan))

# ---------- shared strings ----------
sst = T('xl/sharedStrings.xml')
SI = re.findall(r'<si>.*?</si>|<si/>', sst, re.S)
pakai, peta = [], {}

def kol(ref):
    m = re.match(r'([A-Z]+)(\d+)', ref); c = 0
    for ch in m.group(1): c = c * 26 + ord(ch) - 64
    return c, int(m.group(2))

def dalam(ref, rentang):
    c, r = kol(ref)
    for x in rentang:
        a, b = (x.split(':') + [x])[:2]
        (c1, r1), (c2, r2) = kol(a), kol(b)
        if c1 <= c <= c2 and r1 <= r <= r2: return True
    return False

laporan = []
def olah_sheet(nama, xml):
    kos, per = KOSONG.get(nama, []), PERBAIKI.get(nama, {})
    def sel(m):
        utuh, ref, attr, isi = m.group(0), m.group(1), m.group(2), m.group(3)
        s = re.search(r'\ss="\d+"', attr); s = s.group(0) if s else ''
        if ref in per:
            laporan.append(nama + '!' + ref + ' = ' + per[ref]); return '<c r="%s"%s><f>%s</f></c>' % (ref, s, html.escape(per[ref], quote=False))
        if isi is None: return utuh
        f = re.search(r'<f[^>]*>.*?</f>|<f[^>]*/>', isi, re.S)
        if f:
            ft = html.unescape(f.group(0))
            if 'rekanan!' in ft or re.search(r'\[\d+\]', ft):
                laporan.append(nama + '!' + ref + ' dikosongkan (rujukan rekanan / berkas eksternal)')
                return '<c r="%s"%s/>' % (ref, s)
            a2 = re.sub(r'\st="[^"]*"', '', attr)
            return '<c r="%s"%s>%s</c>' % (ref, a2, f.group(0))   # tanpa nilai tersimpan
        if jenis == 'spm' and nama == 'ITEM' and re.match(r'F(\d+)$', ref) and 4 <= kol(ref)[1] <= 103:   # JUMLAH HARGA yang tertimpa angka di berkas contoh → rumus baku kolom F
            r_ = kol(ref)[1]; laporan.append('ITEM!' + ref + ' dikembalikan ke rumus JUMLAH HARGA'); return '<c r="%s"%s><f>IF($B%d="","",$D%d*$E%d)</f></c>' % (ref, s, r_, r_, r_)
        if kos and dalam(ref, kos): return '<c r="%s"%s/>' % (ref, s)
        if re.search(r'\st="s"', attr):
            v = re.search(r'<v>(\d+)</v>', isi)
            if v:
                i = int(v.group(1))
                if i not in peta: peta[i] = len(pakai); pakai.append(SI[i])
                return '<c r="%s"%s><v>%d</v></c>' % (ref, attr, peta[i])
        return utuh
    xml = re.sub(r'<c r="([A-Z]+\d+)"([^>]*?)(?:/>|>(.*?)</c>)', sel, xml, flags=re.S)
    # sel PERBAIKI yang belum ada di baris → tidak terjadi pada berkas acuan
    return xml

for nama, r, f in simpan:
    F[f] = olah_sheet(nama, T(f)).encode('utf-8')

# string yang dipakai di bagian lain (tabel, pivot) tidak lewat sst — aman
F['xl/sharedStrings.xml'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">' % (len(pakai), len(pakai)) + ''.join(pakai) + '</sst>').encode('utf-8')

# ---------- buang sheet rekanan, tautan eksternal, calcChain ----------
hapus = set()
for nama, r, f in buang:
    hapus.add(f); rl = f.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    if rl in F: hapus.add(rl)
    wb = re.sub(r'<sheet [^>]*r:id="%s"[^>]*/>' % r, '', wb)
    rels = re.sub(r'<Relationship [^>]*Id="%s"[^>]*/>' % r, '', rels)
for n in list(F):
    if n.startswith('xl/externalLinks/') or n == 'xl/calcChain.xml': hapus.add(n)
rels = re.sub(r'<Relationship [^>]*Type="[^"]*/(?:externalLink|calcChain)"[^>]*/>', '', rels)
wb = re.sub(r'<externalReferences>.*?</externalReferences>', '', wb, flags=re.S)
wb = re.sub(r'<calcPr ([^>]*?)/>', lambda m: '<calcPr ' + re.sub(r'\s*fullCalcOnLoad="\d"', '', m.group(1)) + ' fullCalcOnLoad="1"/>', wb)

# ---------- nama terdefinisi: simpan yang sah & dipakai ----------
semua_rumus = ' '.join(html.unescape(x) for nama, r, f in simpan for x in re.findall(r'<f[^>]*>(.*?)</f>', F[f].decode('utf-8'), re.S))
token = set(re.findall(r"[A-Za-z_\\][\w.\\]*", semua_rumus))
baru_idx = {s[0]: i for i, s in enumerate(simpan)}
def nama_def(m):
    a, v = m.group(1), html.unescape(m.group(2))
    n = re.search(r'name="([^"]+)"', a).group(1)
    if re.search(r'\[\d+\]|#REF!|rekanan!|#NAME\?|#N/A', v): return ''
    ls = re.search(r'localSheetId="(\d+)"', a)
    if ls:
        lama = [k for k, i in idx_lama.items() if i == int(ls.group(1))][0]
        if lama not in baru_idx: return ''
        a = a.replace(ls.group(0), 'localSheetId="%d"' % baru_idx[lama])
    if not n.startswith('_xlnm.') and n not in token: return ''
    return '<definedName %s>%s</definedName>' % (a, m.group(2))
wb = re.sub(r'<definedName ([^>]*)>(.*?)</definedName>', nama_def, wb, flags=re.S)
wb = re.sub(r'<definedNames>\s*</definedNames>', '', wb)
# activeTab / firstSheet bergeser karena sheet rekanan (indeks 0) dibuang
wb = re.sub(r'(activeTab|firstSheet)="(\d+)"', lambda m: '%s="%d"' % (m.group(1), max(0, int(m.group(2)) - len(buang))), wb)
wb = re.sub(r'<mc:AlternateContent.*?</mc:AlternateContent>', '', wb, flags=re.S)   # jalur berkas pembuat
F['xl/workbook.xml'] = wb.encode('utf-8'); F['xl/_rels/workbook.xml.rels'] = rels.encode('utf-8')

ct = T('[Content_Types].xml')
for n in hapus: ct = ct.replace('<Override PartName="/%s" ' % n, '<Override PartName="/__hapus__" ')
ct = re.sub(r'<Override PartName="/__hapus__"[^>]*/>', '', ct)
F['[Content_Types].xml'] = ct.encode('utf-8')
for n in hapus: F.pop(n, None)

# pivot: segarkan saat dibuka (data contoh di cache tidak dipakai)
for n in list(F):
    if n.startswith('xl/pivotCache/pivotCacheDefinition') and n.endswith('.xml'):
        F[n] = re.sub(r'<pivotCacheDefinition ', '<pivotCacheDefinition refreshOnLoad="1" ', T(n).replace(' refreshOnLoad="1"', ''), count=1).encode('utf-8')
# identitas pembuat
if 'docProps/core.xml' in F:
    F['docProps/core.xml'] = re.sub(r'<dc:creator>.*?</dc:creator>|<cp:lastModifiedBy>.*?</cp:lastModifiedBy>', '', T('docProps/core.xml')).encode('utf-8')

out = io.BytesIO()
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as w:
    for n in [x for x in z.namelist() if x in F]:
        zi = zipfile.ZipInfo(n, (1980, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
        w.writestr(zi, F[n])
open(keluar, 'wb').write(out.getvalue())
print('\n'.join(sorted(set(laporan))))
print('nama terdefinisi tersisa:', wb.count('<definedName '), '· string:', len(pakai), '· ukuran:', len(out.getvalue()), 'byte')
