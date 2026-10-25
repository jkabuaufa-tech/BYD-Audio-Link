# Merakit demo APLIKASI LENGKAP: HTML dasar asli + paket pembaruan asli + kernel Code.gs asli + modul server 1.9.2, satu berkas HTML.
# Pakai: python3 -I rakit_demo_app.py <index.html> <Code.gs> <pembaruan-x.y.z.json> <keluar.html>
# Hasil memuat data Master proyek dari HTML dasar — JANGAN di-commit / dibagikan di luar tim proyek.
import json, os, re, sys
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
html_p, gs_p, paket_p, keluar = sys.argv[1:5]
html, gs = open(html_p, encoding='utf-8').read(), open(gs_p, encoding='utf-8').read()
paket, modul = json.load(open(paket_p, encoding='utf-8')), json.load(open(R + '/server-modul-1.9.2.json', encoding='utf-8'))

# kunci penyimpanan browser aplikasi diberi awalan DEMO → tidak bercampur dengan aplikasi asli di browser yang sama
ganti_kunci = lambda t: re.sub(r"""(['"`])JICT_""", r'\1DEMOJICT_', t).replace("'MonitoringSAP_Berkas'", "'DEMO_MonitoringSAP_Berkas'")
html = ganti_kunci(html); paket['js'] = ganti_kunci(paket['js'])
# modul server dikompilasi di lingkup kernel (Apps Script: semua global; di demo kernel berada dalam satu fungsi)
lama = "(new Function('KERNEL', '\"use strict\";\\n' + p.kode))"
assert gs.count(lama) == 1, 'pola kompilasi modul tidak ditemukan'
gs = gs.replace(lama, "eval('(function (KERNEL) {\"use strict\";\\n' + p.kode + '\\n})')")
js_aman = lambda o: json.dumps(o, ensure_ascii=False).replace('</', '<\\/')
boot = open(D + '/demo-app-boot.js', encoding='utf-8').read()
for t in (gs,):
    assert '</script' not in t.lower()
for k in ('__MODUL__', '__PAKET__', '__KODE_GS__'):
    assert boot.count(k) == 1, k
boot = boot.replace('__MODUL__', js_aman(modul)).replace('__PAKET__', js_aman(paket)).replace('__KODE_GS__', gs)   # kernel terakhir: isinya tidak ikut diganti
assert html.count('<script src="hp-awal.js"></script>') == 1
html = html.replace('<script src="hp-awal.js"></script>', '<script>\n' + boot + '\n</script>', 1)
html = re.sub(r'<title>([^<]*)</title>', lambda m: '<title>DEMO ' + paket['versi'] + ' · ' + m.group(1) + '</title>', html, count=1)
open(keluar, 'w', encoding='utf-8').write(html)
print('demo', paket['versi'], '·', len(html.encode()) // 1024, 'KB →', keluar)
