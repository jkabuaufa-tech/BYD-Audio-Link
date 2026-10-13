import json, re, sys
D = sys.argv[1]
kode_gs = open(D + '/src/code.gs').read()
modul = json.load(open(D + '/keluaran/server-modul-1.5.2.json'))['kode']
js = open(D + '/src/p228.js').read(); mp227 = js[js.index('/* MP227 — PEMBARUAN'):]
mp227 = re.sub(r'  const LOGO = \{.*?\};\n', '  const LOGO = {};   // logo kop tidak dipakai di demo\n', mp227, count=1, flags=re.S)
css = open(D + '/src/p228.css').read().split('\n')
pola = re.compile(r'\.mp219-(lapis|dlg|dh|db|df|fr|btn-o)|\.mp220-(bd|sub|info)|@keyframes mp219|^:root \{ --m2|--f-bg: #fff|html\[data-tema="gelap"\] \{ --f-bg')
pilih = []
for i, l in enumerate(css):
    if pola.search(l) and 'mp224' not in l and '#mp219Pita' not in l:
        pilih.append(l)
        if l.startswith(':root { --w-navy: #0B2B54; --w-biru: #1763B3; --w-biru2: #1F78D1'):
            pilih.append(css[i + 1])
i0 = next(i for i, l in enumerate(css) if l.startswith('/* MP227 — Asisten AI (2.2.8'))
css_app = '\n'.join(pilih + css[i0:])
for t in (kode_gs, modul, mp227):
    assert '</script' not in t.lower()
skrip = ''.join('<script>\n' + t + '\n</script>\n' for t in [
    open(D + '/demo/mock.js').read(), open(D + '/demo/sim.js').read(),
    '/* Code_2.5.1_Monitoring_Pengadaan.gs (kernel asli) */\n' + kode_gs,
    '/* server-modul-1.5.2 (dimuat tanpa eval) */\nwindow.__MODUL = (function (KERNEL) {\n"use strict";\n' + modul + '\n})({ versi: KERNEL_VERSI, versiServer: VERSI_SERVER, fiturInti: FITUR_SERVER.slice(), kaitTersedia: MODUL_KAIT.slice(), luar: true });',
    open(D + '/demo/demo.js').read(),
    '/* pembaruan-2.2.10 — blok MP227 (Asisten AI) asli */\n' + mp227,
    'demoMulai();'])
h = open(D + '/demo/kerangka.html').read().replace('/*CSS_APLIKASI*/', css_app).replace('<!--SKRIP-->', skrip)
open(D + '/demo/demo-asisten-ai.html', 'w').write(h)
print('ukuran', len(h.encode()) // 1024, 'KB')
