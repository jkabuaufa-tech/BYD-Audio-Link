#!/usr/bin/python3
"""Validasi template perbaikan 2.9.8 dengan LibreOffice (mesin hitung kedua, independen dari XLH aplikasi).
   /usr/bin/python3 tagihan/uji/lo_template_298.py tagihan/template [/tmp/ui298]
 Argumen kedua (opsional): folder berkas hasil aplikasi (ui298.js) → nilai tersimpan dibandingkan hitung ulang LibreOffice.
 Mengisi sel isian seperti aplikasi (12 item + 2 judul, termin 3 aktif; Master SPM 5 item), menghitung ulang (calculateAll),
 memeriksa angka terhadap hitungan manual dan memastikan TIDAK ADA sel galat (#REF!, #VALUE!, …) di area cetak sheet cetak."""
import os, subprocess, sys, time, uno
from com.sun.star.beans import PropertyValue
from com.sun.star.table.CellContentType import FORMULA

D = os.path.abspath(sys.argv[1])
lulus = 0
def ok(c, m):
    global lulus
    if not c: raise AssertionError(m)
    lulus += 1; print('  ✓ ' + m)
def pv(n, v): p = PropertyValue(); p.Name, p.Value = n, v; return p

prof = '/tmp/lo298prof'
proc = subprocess.Popen(['soffice', '--headless', '--invisible', '--norestore', '-env:UserInstallation=file://' + prof,
                         '--accept=socket,host=127.0.0.1,port=2083;urp;'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ctx = None
for _ in range(60):
    try:
        lc = uno.getComponentContext(); res = lc.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver', lc)
        ctx = res.resolve('uno:socket,host=127.0.0.1,port=2083;urp;StarOffice.ComponentContext'); break
    except Exception: time.sleep(1)
desk = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)

def buka(nama):
    return desk.loadComponentFromURL(uno.systemPathToFileUrl(os.path.join(D, nama)), '_blank', 0, (pv('Hidden', True),))
def sel(doc, sh, ref): return doc.Sheets.getByName(sh).getCellRangeByName(ref)
def tulis(doc, sh, ref, v):
    c = sel(doc, sh, ref)
    if isinstance(v, str): c.setString(v)
    elif v is None: c.setString('')
    else: c.setValue(v)
def nil(doc, sh, ref): return sel(doc, sh, ref).getValue()
def teks(doc, sh, ref): return sel(doc, sh, ref).getString()
def galat_cetak(doc, sh):
    s = doc.Sheets.getByName(sh); ar = s.getPrintAreas(); out = []
    for a in ar:
        for r in range(a.StartRow, a.EndRow + 1):
            for c in range(a.StartColumn, a.EndColumn + 1):
                cl = s.getCellByPosition(c, r)
                if cl.getType() == FORMULA and cl.getError() != 0: out.append(cl.AbsoluteName)
    return out

try:
    print('BAP - format (2.9.8) di LibreOffice — 12 item + 2 judul, termin 3 aktif')
    doc = buka('BAP - format (2.9.8).xlsx')
    NO = '134/SPPP/WK-NK.KSO/PDBJ/1726012/2026'
    for ref, v in (('B4', NO), ('B5', 46203), ('B6', 'Pekerjaan Galian Tanah Dermaga'), ('B8', 46203), ('B9', 46387), ('B22', 'Rizki Kurniawan'), ('B23', 'Direktur'),
                   ('B24', 'CV Rizki Kurnia'), ('B28', 3), ('B44', 0.05), ('B45', 0.2), ('B99', 46231), ('B100', 46262), ('B101', 46293)):
        tulis(doc, 'DATA', ref, v)
    baris = [('A', 'PEKERJAAN TANAH', None, None, None)] + [(None, None, 'Galian %d' % i, 1000.0 * i, 15000 + i) for i in range(1, 7)] + \
            [('B', 'PEKERJAAN STRUKTUR', None, None, None)] + [(None, None, 'Beton K-%d' % (300 + i), 50.0 * i, 1250000 + i * 1000) for i in range(1, 7)]
    vol = {}; n = 0
    for k, b in enumerate(baris):
        r = 15 + k
        if b[1]:
            tulis(doc, 'lamp1', 'B%d' % r, b[0]); tulis(doc, 'lamp1', 'C%d' % r, b[1]); continue
        n += 1; tulis(doc, 'lamp1', 'B%d' % r, n); tulis(doc, 'lamp1', 'D%d' % r, b[2]); tulis(doc, 'lamp1', 'H%d' % r, b[3]); tulis(doc, 'lamp1', 'I%d' % r, 'M3'); tulis(doc, 'lamp1', 'J%d' % r, b[4])
        t = [round(b[3] * 0.1, 3), round(b[3] * 0.15, 3), round(b[3] * 0.2, 3)]
        for j, v in zip('JKL', t): tulis(doc, 'REKAP PROGRES', '%s%d' % (j, r - 10), v)
        vol[r] = (b[3], b[4], t)
    doc.calculateAll()
    NK = sum(v * h for v, h, t in vol.values()); ini = sum(t[2] * h for v, h, t in vol.values()); lalu = sum((t[0] + t[1]) * h for v, h, t in vol.values())
    ok(round(nil(doc, 'DATA', 'B10')) == round(NK) and round(nil(doc, 'rincian ', 'Q38')) == round(NK) and round(nil(doc, 'BAP  1', 'K24')) == round(NK), 'nilai kontrak DATA!B10 = rincian!Q38 = BAP!K24 = Rp {:,.0f} (12 item, baris 15–28)'.format(NK))
    ok(abs(nil(doc, 'lamp1', 'K42') - NK * nil(doc, 'DATA', 'B11')) < 1, 'PPN lampiran = nilai × DATA!B11')
    ok(round(nil(doc, 'BAPP', 'Q61')) == round(ini), 'BAPP prestasi periode ini (termin 3) Rp {:,.0f}'.format(ini))
    ok(all(abs(nil(doc, 'BAPP', 'K%d' % (r + 21)) - (t[0] + t[1])) < 1e-6 and abs(nil(doc, 'BAPP', 'L%d' % (r + 21)) - t[2]) < 1e-6 and abs(nil(doc, 'BAPP', 'O%d' % (r + 21)) - (v - sum(t))) < 1e-6 for r, (v, h, t) in vol.items()),
       'BAPP per item: s/d lalu · periode ini · sisa benar di 12 baris (termasuk baris yang dulu rusak 44, 49–59)')
    ok(teks(doc, 'BAPP', 'C36') == 'PEKERJAAN TANAH' and teks(doc, 'BAPP', 'C43') == 'PEKERJAAN STRUKTUR' and teks(doc, 'BAPP', 'Q36').strip() == '' and teks(doc, 'BAPP', 'J60').strip() == '', 'baris judul & baris kosong tercetak kosong (tanpa "0")')
    ok(abs(nil(doc, 'rincian ', 'T38') * NK - lalu) < 1 and abs(nil(doc, 'rincian ', 'X38') * NK - (lalu + ini)) < 1, 'rincian bobot s/d lalu & s/d periode ini')
    n66 = nil(doc, 'BAPP', 'N66')
    ok(abs(n66 - ini) < 1 and nil(doc, 'BAPP', 'N68') == round(ini * 0.2) and nil(doc, 'BAPP', 'N69') == round(ini * 0.05) and abs(nil(doc, 'BAPP', 'N70') - (n66 - round(ini * .2) - round(ini * .05))) < 0.01,
       'BAPP potongan UM 20% & retensi 5% dari DATA (dulu 0 / 5% tetap)')
    q33, q38, q43, q48 = (nil(doc, 'BAP  1', x) for x in ('Q33', 'Q38', 'Q43', 'Q48'))
    ok(abs(q33 - ini) < 1 and q38 == round(ini * 0.05) and q43 == round(ini * 0.2) and q48 == round(q33 - q38 - q43), 'BAP: prestasi saat ini, retensi 5%, pengembalian UM 20%, jumlah (a−b−c)')
    ok(abs(nil(doc, 'BAP  1', 'P36') - lalu * 0.05) < 1 and abs(nil(doc, 'BAP  1', 'P41') - lalu * 0.2) < 1, 'BAP: retensi & UM "yang lalu" dari prestasi lalu (dulu 0)')
    ok(teks(doc, 'BAPP', 'B10') == '03/BAPP/' + NO and teks(doc, 'BAP  1', 'C11') == '03/BAP/' + NO, 'nomor BAPP/BAP mengikuti Termin Aktif DATA!B28 = 3')
    per = [sum(t[k] * h for v, h, t in vol.values()) for k in range(3)]
    ok(all(abs(nil(doc, 'BAPR ', 'J%d' % (32 + k)) - per[k]) < 1 for k in range(3)) and nil(doc, 'BAPR ', 'J35') == 0 and round(nil(doc, 'BAPR ', 'G22')) == round(NK), 'BAPR: prestasi per termin 1–3 & nilai kontrak (dulu #REF! / BAP 2–6 rusak)')
    ok('Surat Perjanjian Pemborongan Pekerjaan (SPPP)' in teks(doc, 'BAPR ', 'B29'), 'BAPR narasi mengikuti jenis kontrak (SPPP)')
    ok(teks(doc, 'BAPR ', 'L24') == '-' and teks(doc, 'BAPR ', 'H35') == '', 'tanggal kosong → "-" / kosong (bukan 00 Januari 1900)')
    for sh in ('BAP  1', 'BAPP', 'rincian ', 'lamp1', 'BAPR '):
        g = galat_cetak(doc, sh); ok(not g, 'tanpa sel galat di area cetak %s' % sh.strip() + ('' if not g else ': ' + str(g[:5])))
    ok([s for s in doc.Sheets.ElementNames] == ['BAPR ', 'BAP  1', 'BAPP', 'rincian ', 'lamp1', 'HELPER', 'DATA', 'REKAP PROGRES', 'PIVOT PROGRES'], 'sheet: ' + ', '.join(doc.Sheets.ElementNames))
    doc.close(True)

    print('Master SPM (2.9.8) di LibreOffice — 5 item, 2 terealisasi termin 1')
    doc = buka('Master SPM (2.9.8).xlsx')
    for ref, v in (('B23', 'Salim'), ('B24', 'PT Surya Salim Sejahtera'), ('B32', '047'), ('B36', 46220), ('B37', 46387), ('B49', 1), ('B55', 46261)):
        tulis(doc, 'INPUT', ref, v)
    IT = [('Semen Portland 50 kg', 200, 75000, 100), ('Besi Beton D16', 120, 180000, 0), ('Paku Beton 3"', 10, 45000, 0), ('Kawat Bendrat', 30, 25000, 30), ('Pasir Beton', 20, 350000, 0)]
    for k, (u, v, h, g) in enumerate(IT):
        r = 4 + k; tulis(doc, 'ITEM', 'B%d' % r, u); tulis(doc, 'ITEM', 'C%d' % r, 'Sak'); tulis(doc, 'ITEM', 'D%d' % r, v); tulis(doc, 'ITEM', 'E%d' % r, h)
        if g: tulis(doc, 'ITEM', 'G%d' % r, g)
    doc.calculateAll()
    ok(teks(doc, 'BAP', 'N31') == 'Semen Portland 50 kg, Kawat Bendrat, Besi Beton D16, dll.', 'narasi BAP: nilai progres terbesar (Semen 7,5 jt › Kawat 0,75 jt) + item kontrak terbesar = min. 3 item: ' + teks(doc, 'BAP', 'N31'))
    for sh in ('SPM', 'BAPM', 'BAP'):
        g = galat_cetak(doc, sh); ok(not g, 'tanpa sel galat di area cetak %s' % sh + ('' if not g else ': ' + str(g[:5])))
    doc.close(True)
    if len(sys.argv) > 2:
        print('Berkas hasil aplikasi (' + sys.argv[2] + ') — nilai tersimpan XLH vs hitung ulang LibreOffice')
        D = os.path.abspath(sys.argv[2])
        for nm, sh in (('spkp_8item.xlsx', ['BAP  1', 'BAPP', 'rincian ', 'lamp1', 'BAPR ']), ('sppp_termin2_terbit.xlsx', ['BAP  1', 'BAPP', 'rincian ', 'lamp1', 'BAPR ']), ('spm_termin1.xlsx', ['SPM', 'BAPM', 'BAP'])):
            doc = buka(nm)
            if 'spm' in nm:
                n0 = teks(doc, 'BAP', 'N31'); doc.calculateAll(); ok(teks(doc, 'BAP', 'N31') == n0, nm + ': narasi sama setelah hitung ulang: ' + n0)
            else:
                ref = [('BAPP', 'Q61'), ('BAPP', 'N70'), ('BAP  1', 'Q48'), ('DATA', 'B10'), ('rincian ', 'X38')]; v0 = [nil(doc, a, b) for a, b in ref]; doc.calculateAll()
                ok(all(abs(a - nil(doc, x, y)) < 0.01 for a, (x, y) in zip(v0, ref)), nm + ': nilai tersimpan aplikasi = hitung ulang LibreOffice (BAPP!Q61 Rp {:,.0f})'.format(nil(doc, 'BAPP', 'Q61')))
            for s2 in sh:
                g = galat_cetak(doc, s2); ok(not g, nm + ' tanpa sel galat ' + s2.strip() + ('' if not g else ': ' + str(g[:4])))
            doc.close(True)
    print('\n%d cek lulus — template 2.9.8 di LibreOffice' % lulus)
finally:
    try: desk.terminate()
    except Exception: pass
    proc.wait(timeout=30) if proc.poll() is None else None
