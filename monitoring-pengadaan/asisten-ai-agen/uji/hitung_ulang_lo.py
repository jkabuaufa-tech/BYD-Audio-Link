"""Buka .xlsx di LibreOffice (headless, UNO), hitung ulang semua rumus, cetak nilai sel & ekspor PDF per sheet.
   python3 uji/hitung_ulang_lo.py <berkas.xlsx> <keluar.pdf|-> <Sheet!A1> [Sheet!B2 ...]   (keluar: JSON nilai sel di stdout)
   Ekspor PDF hanya sheet yang namanya diberikan lewat env SHEET_PDF (dipisah |)."""
import sys, os, json, time, subprocess, uno
from com.sun.star.beans import PropertyValue
def pv(n, v): p = PropertyValue(); p.Name = n; p.Value = v; return p
berkas, pdf, sel = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3:]
prof = '/tmp/lo_uji_profil'
proc = subprocess.Popen(['soffice', '--headless', '--invisible', '--norestore', '-env:UserInstallation=file://' + prof, '--accept=socket,host=localhost,port=2299;urp;'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ctx = None
for _ in range(60):
    try:
        lc = uno.getComponentContext(); res = lc.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver', lc)
        ctx = res.resolve('uno:socket,host=localhost,port=2299;urp;StarOffice.ComponentContext'); break
    except Exception: time.sleep(0.5)
desk = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
doc = desk.loadComponentFromURL(uno.systemPathToFileUrl(berkas), '_blank', 0, (pv('Hidden', True),))
doc.calculateAll()
out = {}
for s in sel:
    sh, a = s.split('!'); c = doc.Sheets.getByName(sh).getCellRangeByName(a)
    out[s] = c.String
print(json.dumps(out, ensure_ascii=False))
if pdf != '-':
    nama = [x for x in os.environ.get('SHEET_PDF', '').split('|') if x]
    for i in range(doc.Sheets.Count):
        s = doc.Sheets.getByIndex(i); s.IsVisible = s.Name in nama if nama else s.IsVisible
    doc.storeToURL(uno.systemPathToFileUrl(os.path.abspath(pdf)), (pv('FilterName', 'calc_pdf_Export'),))
doc.close(True)
try: desk.terminate()
except Exception: pass
proc.wait(timeout=30)
