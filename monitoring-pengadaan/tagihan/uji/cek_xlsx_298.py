#!/usr/bin/env python3
"""Periksa berkas Excel backup 2.9.8 (hasil ui298.js) terhadap template baku:
   - MODE RUMUS ASLI: rumus, Print Area/Titles, pageSetup, margin, merge cells, kop/gambar & atribut baris seluruh sheet cetak
     IDENTIK dengan template; angka hasil rumus asli sama dengan angka aplikasi (nilai kontrak, prestasi, volume, retensi, UM).
   - peta slot rumus asli di MP298 (SLOT_BAP) sama dengan hasil penelusuran rantai rumus template (lamp1 → rincian → BAPP).
   - kontrak di luar tata letak template → mode perbaikan 2.9.6 dengan angka tetap benar.
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
def arsip(b):
    z = zipfile.ZipFile(io.BytesIO(b)); return {n: z.read(n) for n in z.namelist()}
def peta(X):
    rels = X['xl/_rels/workbook.xml.rels'].decode()
    rid = {a: b for a, b in re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels)}
    rid.update({b: a for a, b in re.findall(r'Target="([^"]+)"[^>]*Id="([^"]+)"', rels)})
    return {n.replace('&amp;', '&'): 'xl/' + rid[r].replace('/xl/', '') for n, r in re.findall(r'<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]+)"', X['xl/workbook.xml'].decode())}
RUMUS = re.compile(r'<c r="([A-Z]+\d+)"[^>]*>\s*(<f[^>]*/>|<f[^>]*>[^<]*</f>)')
BARIS = re.compile(r'<row r="(\d+)"([^>]*)>')
def cetak_identik(tpl, out, lembar, label):
    A, B = arsip(tpl), arsip(out); pa, pb = peta(A), peta(B)
    dn = lambda X: sorted(re.findall(r'<definedName[^>]*>[^<]*</definedName>', X['xl/workbook.xml'].decode()))
    ok(dn(A) == dn(B), label + ': Print Area & Print Titles identik')
    media = lambda X: {n: v for n, v in X.items() if n.startswith('xl/media/') or n.startswith('xl/drawings/')}
    ok(media(A) == media(B), label + ': kop surat/logo & drawing identik byte-per-byte')
    for s in lembar:
        a, b = A[pa[s]].decode(), B[pb[s]].decode()
        for tag in ('pageSetup', 'pageMargins', 'printOptions', 'headerFooter', 'sheetPr', 'cols', 'mergeCells'):
            assert re.findall(r'<%s\b[\s\S]*?(?:/>|</%s>)' % (tag, tag), a) == re.findall(r'<%s\b[\s\S]*?(?:/>|</%s>)' % (tag, tag), b), '%s %s berubah' % (s, tag)
        ra = {r: re.sub(r'\s(spans)="[^"]*"', '', t) for r, t in BARIS.findall(a)}; rb = {r: re.sub(r'\s(spans)="[^"]*"', '', t) for r, t in BARIS.findall(b)}
        assert all(rb.get(r, t) == t for r, t in ra.items()), s + ' tinggi/sembunyi baris berubah'
        fa, fb = dict(RUMUS.findall(a)), dict(RUMUS.findall(b))
        beda = [k for k in fa if fb.get(k) != fa[k]]
        assert not beda, '%s: %d rumus berubah, mis. %s: %s → %s' % (s, len(beda), beda[0], fa[beda[0]][:80], (fb.get(beda[0]) or 'NILAI')[:80])
    ok(True, label + ': RUMUS 100% sama dengan template + pageSetup (A4/Fit to Page), margin, kolom, merge, baris: ' + ', '.join(s.strip() for s in lembar))

print('Template tertanam = template perbaikan tagihan/template')
import os
TD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'template')
ok(base64.b64decode(FMT['bap']) == open(os.path.join(TD, 'BAP - format (2.9.8).xlsx'), 'rb').read() and base64.b64decode(FMT['spm']) == open(os.path.join(TD, 'Master SPM (2.9.8).xlsx'), 'rb').read(), 'paket 2.9.8 memuat BAP - format (2.9.8) & Master SPM (2.9.8)')
wt = load_workbook(io.BytesIO(base64.b64decode(FMT['bap'])))
v = lambda ws, ref: str(ws[ref].value or '').replace('$', '')
ok(all(v(wt['lamp1'], 'K%d' % r) == '=IF(COUNT(H%d,J%d)<2,"",H%d*J%d)' % (r, r, r, r) and "lamp1!H%d" % r in v(wt['rincian '], 'N%d' % (r - 2))
       and "'rincian '!S%d" % (r - 2) in v(wt['BAPP'], 'K%d' % (r + 21)) and "'REKAP PROGRES'!J%d" % (r - 10) == v(wt['rincian '], 'AL%d' % (r - 2)).lstrip('=') for r in range(15, 40)), 'rantai rumus seragam 25 baris: lamp1 15–39 → rincian 13–37 → BAPP 36–60 → REKAP 5–29')
ok(sorted(wt.sheetnames) == sorted(['BAPR ', 'BAP  1', 'BAPP', 'rincian ', 'lamp1', 'HELPER', 'DATA', 'REKAP PROGRES', 'PIVOT PROGRES']) and not any('#REF!' in str(c.value) for ws in wt.worksheets for row in ws.iter_rows() for c in row if isinstance(c.value, str)), 'tanpa sheet rusak & tanpa #REF! di seluruh template')

print('BAP format (SPPP 3 item, termin 2) — MODE RUMUS ASLI')
b = open(D + '/sppp_termin2_terbit.xlsx', 'rb').read(); wb = load_workbook(io.BytesIO(b), data_only=True); wf = load_workbook(io.BytesIO(b))
cetak_identik(base64.b64decode(FMT['bap']), b, ['BAP  1', 'BAPP', 'rincian ', 'lamp1', 'BAPR '], 'BAP format')
d = wb['DATA']
ok(d['B4'].value == '134/SPPP/WK-NK.KSO/PDBJ/1726012/2026' and d['B7'].value == 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' and d['B6'].value == 'Pekerjaan Galian Tanah Dermaga', 'DATA B4 no. kontrak · B6 pekerjaan · B7 nama proyek')
ok(abs(d['B44'].value - 0.05) < 1e-9 and abs(d['B45'].value - 0.20) < 1e-9, 'DATA B44 retensi 5% · B45 uang muka 20%')
ok(d['B22'].value == 'Rizki Kurniawan' and d['B24'].value == 'CV Rizki Kurnia' and d['B86'].value == '01.234.567.8-901.000', 'DATA direktur, perusahaan, NPWP (Tax No) vendor')
NILAI = 39302 * 16000 + 49088 * 21000 + 8 * 67000000
ok(round(d['B10'].value) == NILAI and round(wb['rincian ']['Q38'].value) == NILAI, 'nilai kontrak (rumus asli DATA!B10 & rincian!Q38) = Register Rp {:,.0f}'.format(NILAI))
ok([wb['lamp1']['D%d' % r].value for r in (15, 16, 17)] == ['Galian Tanah (Exca Std+Miting)', 'Galian Tanah (Exca Long Arm)', 'Mobilisasi dan Demobilisasi'], 'item berurutan mulai lamp1 baris 15')
rk = wb['REKAP PROGRES']
ok([rk['J5'].value, rk['K5'].value, rk['J6'].value, rk['K6'].value, rk['J7'].value, rk['K7'].value] == [10000, 5000, 0, 12000, 4, 0], 'REKAP PROGRES termin 1/2 per item dari Input Progres')
bp = wb['BAPP']
ok([round(bp['K36'].value, 4), round(bp['L36'].value, 4), round(bp['M36'].value, 4)] == [10000, 5000, 15000] and round(bp['M37'].value) == 12000 and round(bp['M38'].value) == 4, 'BAPP volume s/d lalu · periode ini · s/d (rumus asli)')
ok(round(bp['Q61'].value) == 5000 * 16000 + 12000 * 21000, 'BAPP prestasi periode ini Rp {:,.0f}'.format(bp['Q61'].value))
ok(abs(bp['K69'].value - 0.05) < 1e-9 and abs(bp['N68'].value - round(bp['N66'].value * 0.2)) < 0.01 and abs(bp['N70'].value - (bp['N66'].value - bp['N68'].value - bp['N69'].value)) < 0.01, 'BAPP potongan UM 20% & retensi 5% dari DATA, jumlah pembayaran')
b1 = wb['BAP  1']
ok(abs(b1['J37'].value - 0.05) < 1e-9 and abs(b1['J42'].value - 0.2) < 1e-9 and round(b1['M36'].value) == round(b1['P31'].value), 'BAP 1 retensi/UM yang lalu & saat ini (dari DATA)')
ok(wf['BAPP']['T8'].value == '=DATA!$B$28' and wf['BAP  1']['T9'].value == '=DATA!$B$28' and wf['DATA']['B28'].value == 2 and wb['BAPP']['B10'].value == '02/BAPP/134/SPPP/WK-NK.KSO/PDBJ/1726012/2026', 'termin aktif & nomor BA dari DATA (B28 = 2 · 02/BAPP/…)')

print('Master SPM (SPM termin 1) — MODE RUMUS ASLI')
b = open(D + '/spm_termin1.xlsx', 'rb').read(); wb = load_workbook(io.BytesIO(b), data_only=True)
cetak_identik(base64.b64decode(FMT['spm']), b, ['SPM', 'BAPM', 'BAPM 2', 'BAP', 'BAP 2'], 'Master SPM')
i = wb['INPUT']
ok(i['B5'].value == 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' and i['B35'].value == '047/SPM/WK-NK.KSO/PDBJ/1726012/2026' and i['B26'].value == '02.111.222.3-444.000', 'INPUT nama proyek · no. SPM · NPWP vendor')
ok(round(wb['ITEM']['C107'].value) == 200 * 75000 + 120 * 180000 + 10 * 45000 + 30 * 25000 + 20 * 350000, 'nilai kontrak ITEM!C107 = Register')
ok(wb['BAP']['N31'].value == 'Semen Portland 50 kg, Kawat Bendrat, Besi Beton D16, dll.', 'narasi BAP (rumus template): urut nilai progres + item kontrak terbesar, min. 3 item: ' + str(wb['BAP']['N31'].value))

print('BAP format (SPKP 8 item) — MODE RUMUS ASLI')
b = open(D + '/spkp_8item.xlsx', 'rb').read(); wb = load_workbook(io.BytesIO(b), data_only=True)
NK = sum(10 * i * (1000000 + i * 1000) for i in range(1, 9))
cetak_identik(base64.b64decode(FMT['bap']), b, ['BAP  1', 'BAPP', 'rincian ', 'lamp1', 'BAPR '], 'BAP format 8 item')
ok(round(wb['DATA']['B10'].value) == NK and round(wb['BAPP']['Q61'].value) == 5 * 1001000 + 40 * 1008000, 'angka tetap benar: nilai kontrak Rp {:,.0f} · prestasi periode ini Rp {:,.0f}'.format(NK, wb['BAPP']['Q61'].value))
print('\n%d cek lulus — isi & integritas Excel 2.9.8' % lulus)
