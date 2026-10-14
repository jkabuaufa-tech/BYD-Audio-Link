# Merakit demo-verifikasi-tagihan.html: kernel Code.gs asli + modul 1.7.0 + blok MP219 (Keuangan & Bayar) & MP230 (Verifikasi Tagihan) dari pembaruan 2.4.0.
# Pakai: python3 -I rakit_demo_vt.py <Code.gs> <snapshot.json>   (snapshot dari: node vt-snapshot.js snapshot.json)
import json, sys, os
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
kode_gs = open(sys.argv[1]).read(); snap = open(sys.argv[2]).read()
modul = json.load(open(R + '/server-modul-1.7.2.json'))['kode']
pk = json.load(open(R + '/pembaruan-2.4.4.json')); js, css = pk['js'], pk['css']
potong = lambda a, b=None: js[js.index(a): js.index(b, js.index(a)) if b else len(js)]
keu = potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'); vt = potong('/* MP230 — PEMBARUAN', '/* MP241 — PEMBARUAN'); mp241 = potong('/* MP241 — PEMBARUAN')
for t in (kode_gs, modul, keu, vt, mp241, snap):
    assert '</script' not in t.lower()
skrip = ''.join('<script>\n' + t + '\n</script>\n' for t in [
    open(D + '/mock.js').read(),
    '/* Code_2.5.1_Monitoring_Pengadaan.gs (kernel asli) */\n' + kode_gs,
    '/* server-modul-1.7.2 (dimuat tanpa eval) */\nwindow.__MODUL = (function (KERNEL) {\n"use strict";\n' + modul + '\n})({ versi: KERNEL_VERSI, versiServer: VERSI_SERVER, fiturInti: FITUR_SERVER.slice(), kaitTersedia: MODUL_KAIT.slice(), luar: true });',
    '/* keadaan server awal: 3 tagihan (SPM, SPSA, SPPP) + transkripsi PDF untuk AI tiruan */\nwindow.__SNAP = ' + snap + ';',
    open(D + '/vt-demo.js').read(),
    open(D + '/vt-gudang-demo.js').read(),
    '/* pembaruan-2.4.0 — blok MP219 Keuangan & Bayar asli */\n' + keu,
    '/* pembaruan-2.4.4 — blok MP230 Verifikasi Tagihan asli */\n' + vt,
    '/* pembaruan-2.4.4 — blok MP241 asli (tombol bundel, kartu gudang 25-25) */\n' + mp241,
    'demoMulai();'])
h = open(D + '/vt-kerangka.html').read().replace('/*CSS_APLIKASI*/', css).replace('<!--SKRIP-->', skrip)
open(D + '/demo-verifikasi-tagihan.html', 'w').write(h)
print('ukuran', len(h.encode()) // 1024, 'KB')
