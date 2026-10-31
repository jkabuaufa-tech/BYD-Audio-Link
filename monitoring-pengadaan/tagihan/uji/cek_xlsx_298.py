#!/usr/bin/env python3
"""Periksa berkas Excel backup 2.9.8 (hasil ui298.js) terhadap template baku:
   - sel isian DATA/INPUT/rincian/REKAP terisi dari Register, Master Vendor, Konfigurasi & Input Progres;
   - Print Area, Page Setup, Print Titles, merge cells sheet cetak SAMA dengan template;
   - rumus sheet cetak: dibandingkan dengan template (perbedaan dilaporkan per sheet).
   python3 -I tagihan/uji/cek_xlsx_298.py /tmp/ui298 asisten-ai-agen/pembaruan-2.9.8.json"""
import base64, io, json, re, sys, warnings, zipfile
warnings.filterwarnings('ignore')
from openpyxl import load_workbook
D, PAKET = sys.argv[1], sys.argv[2]
js = json.load(open(PAKET, encoding='utf-8'))['js']
FMT = json.loads(re.search(r'window\.__MP292_FORMAT = (\{.*\});?\n', js).group(1))
lulus = 0
def ok(c, m):
    global lulus
    assert c, m
    lulus += 1; print('  ✓ ' + m)
def xml(zbytes):
    z = zipfile.ZipFile(io.BytesIO(zbytes)); return {n: z.read(n).decode('utf-8', 'replace') for n in z.namelist() if n.endswith('.xml') or n.endswith('.rels')}
def peta(X):
    rid = dict(re.findall(r'<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', X['xl/_rels/workbook.xml.rels']))
    rid.update({a: b for b, a in re.findall(r'<Relationship [^>]*Target="([^"]+)"[^>]*Id="([^"]+)"', X['xl/_rels/workbook.xml.rels'])})
    return {n.replace('&amp;', '&'): 'xl/' + rid[r].lstrip('/').replace('xl/', '') for n, r in re.findall(r'<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]+)"', X['xl/workbook.xml'])}
def cetak_sama(tpl, out, lembar):
    A, B = xml(tpl), xml(out); pa, pb = peta(A), peta(B)
    dn = lambda X: sorted(re.findall(r'<definedName[^>]*>[^<]*</definedName>', X['xl/workbook.xml']))
    ok(dn(A) == dn(B), 'Print Area & Print Titles (definedName) identik dengan template')
    for s in lembar:
        a, b = A[pa[s]], B[pb[s]]
        for tag in ('pageSetup', 'pageMargins', 'printOptions', 'headerFooter', 'sheetPr'):
            ta, tb = re.findall(r'<%s\b[^>]*/?>' % tag, a), re.findall(r'<%s\b[^>]*/?>' % tag, b)
            assert ta == tb, '%s %s berubah' % (s, tag)
        ma, mb = sorted(re.findall(r'<mergeCell ref="([^"]+)"', a)), sorted(re.findall(r'<mergeCell ref="([^"]+)"', b))
        assert ma == mb, s + ' merge berubah'
        assert re.findall(r'<drawing [^>]*/>', a) == re.findall(r'<drawing [^>]*/>', b), s + ' kop/gambar berubah'
    ok(True, 'Page Setup (A4/Fit to Page), margin, header/footer, merge cells & kop sheet cetak identik: ' + ', '.join(s.strip() for s in lembar))
    beda = {}
    for s in lembar:
        fa = dict(re.findall(r'<c r="([A-Z]+\d+)"[^>]*>\s*<f>([^<]*)</f>', A[pa[s]])); fb = dict(re.findall(r'<c r="([A-Z]+\d+)"[^>]*>\s*<f>([^<]*)</f>', B[pb[s]]))
        n = [k for k in fa if fb.get(k) != fa[k]]; 
        if n: beda[s.strip()] = len(n)
    return beda

print('BAP format (SPPP termin 2)')
b = open(D + '/sppp_termin2_terbit.xlsx', 'rb').read(); wb = load_workbook(io.BytesIO(b), data_only=True); wf = load_workbook(io.BytesIO(b))
d = wb['DATA']
ok(d['B4'].value == '134/SPPP/WK-NK.KSO/PDBJ/1726012/2026' and d['B7'].value == 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok', 'DATA B4 no. kontrak · B7 nama proyek')
ok(d['B6'].value == 'Pekerjaan Galian Tanah Dermaga', 'DATA B6 nama pekerjaan dari Register: ' + str(d['B6'].value))
ok(abs(d['B44'].value - 0.05) < 1e-9 and abs(d['B45'].value - 0.20) < 1e-9, 'DATA B44 retensi 5% · B45 uang muka 20% (Konfigurasi Tagihan)')
ok(d['B22'].value == 'Rizki Kurniawan' and d['B23'].value == 'Direktur' and d['B24'].value == 'CV Rizki Kurnia', 'DATA B22–B24 direktur, jabatan, perusahaan vendor')
ok(d['B76'].value == 'Jl. Melati No. 5, Jakarta Utara' and d['B77'].value == '01.234.567.8-901.000' and d['B86'].value == '01.234.567.8-901.000', 'DATA alamat & NPWP (Tax No) vendor → B86 NPWP dipakai')
ok(round(d['B10'].value) == 39302 * 16000 + 49088 * 21000 + 8 * 67000000, 'DATA B10 nilai kontrak (rumus baku =lamp1!K41) = nilai Register Rp {:,.0f}'.format(d['B10'].value))
ok(d['B28'].value == 2 and wf['rincian ']['AL5'].value == 2, 'termin aktif 2 (DATA B28 · rincian AL5)')
rk = wb['REKAP PROGRES']
ok([rk['J5'].value, rk['K5'].value] == [10000, 5000] and [rk['J6'].value, rk['K6'].value] == [0, 12000] and [rk['J7'].value, rk['K7'].value] == [4, 0], 'REKAP PROGRES volume termin 1/2 per item dari Input Progres')
ri = wb['rincian ']
ok(abs(ri['S13'].value - 10000) < 1e-6 and abs(ri['U13'].value - 5000) < 1e-6 and abs(ri['W13'].value - 15000) < 1e-6, 'rincian: s/d lalu 10.000 · periode ini 5.000 · s/d 15.000 (item 1)')
bp = wb['BAPP']
ok(any('Rizki' in str(c.value or '') or 'Galian' in str(c.value or '') for r in bp.iter_rows(min_row=1, max_row=40) for c in r), 'BAPP terisi lewat rumus bawaan (vendor/pekerjaan tampil)')
beda = cetak_sama(base64.b64decode(FMT['bap']), b, ['BAP  1', 'BAPP', 'rincian ', 'lamp1', 'BAPR '])
print('    (rumus sheet cetak yang berbeda dari template — bawaan 2.9.3/2.9.6: tabel BAPP/rincian dipetakan per baris lamp1, baris K20–K22 BAP):', beda)

print('Master SPM (SPM termin 1)')
b = open(D + '/spm_termin1.xlsx', 'rb').read(); wb = load_workbook(io.BytesIO(b), data_only=True)
i = wb['INPUT']
ok(i['B5'].value == 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' and i['B35'].value == '047/SPM/WK-NK.KSO/PDBJ/1726012/2026', 'INPUT B5 nama proyek · B35 no. SPM')
ok(i['B24'].value == 'PT Surya Salim Sejahtera' and i['B23'].value == 'Salim' and i['B26'].value == '02.111.222.3-444.000', 'INPUT vendor, direktur, NPWP')
n31 = wb['BAP']['N31'].value
ok(n31 == 'Semen Portland 50 kg, Kawat Bendrat, Besi Beton D16, dll.', 'narasi BAP: realisasi termahal → termurah (Semen 7,5 jt > Kawat 0,75 jt) + 1 item kontrak terbesar = 3 item: ' + str(n31))
it = wb['ITEM']; ok(it['G4'].value == 100 and it['G7'].value == 30 and (it['G5'].value in (0, None)), 'ITEM termin 1: volume per item dari Input Progres')
beda = cetak_sama(base64.b64decode(FMT['spm']), b, ['SPM', 'BAPM', 'BAP'])
print('    (rumus sheet cetak yang berbeda dari template):', beda)
print('\n%d cek lulus — isi Excel 2.9.8' % lulus)
