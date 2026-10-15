# Merakit demo-pembaruan-2.5.6.html: kernel Code.gs asli + modul 1.8.4 + blok ASLI paket 2.5.6 (MP219 Keuangan, MP223 Gudang, MP230 Verifikasi, MP241).
# Pakai: python3 -I rakit_demo_256.py <Code.gs> <snapshot.json>   (snapshot dari: node vt-snapshot.js snapshot.json)
import json, sys, os
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
kode_gs = open(sys.argv[1], encoding='utf-8').read(); snap = open(sys.argv[2], encoding='utf-8').read()
modul = json.load(open(R + '/server-modul-1.8.4.json', encoding='utf-8'))['kode']
pk = json.load(open(R + '/pembaruan-2.5.6.json', encoding='utf-8')); js, css = pk['js'], pk['css']
potong = lambda a, b: js[js.index(a): js.index(b, js.index(a))]
keu = potong('/* MP219_FINANCE', '/* MP220 — PEMBARUAN 2.2.1'); gd = potong('/* MP223 — PEMBARUAN 2.2.5', '/* MP224 — PEMBARUAN 2.2.5')
vt = potong('/* MP230 — PEMBARUAN', '/* MP241 — PEMBARUAN'); mp241 = potong('/* MP241 — PEMBARUAN', '/* MP250 — PEMBARUAN')
for t in (kode_gs, modul, keu, gd, vt, mp241, snap):
    assert '</script' not in t.lower()
skrip = ''.join('<script>\n' + t + '\n</script>\n' for t in [
    open(D + '/mock.js', encoding='utf-8').read(),
    '/* Code_2.5.1_Monitoring_Pengadaan.gs (kernel asli) */\n' + kode_gs,
    '/* server-modul-1.8.4 (dimuat tanpa eval) */\nwindow.__MODUL = (function (KERNEL) {\n"use strict";\n' + modul + '\n})({ versi: KERNEL_VERSI, versiServer: VERSI_SERVER, fiturInti: FITUR_SERVER.slice(), kaitTersedia: MODUL_KAIT.slice(), luar: true });',
    '/* keadaan server awal (tagihan contoh) */\nwindow.__SNAP = ' + snap + ';',
    open(D + '/vt-demo.js', encoding='utf-8').read(),
    open(D + '/demo256.js', encoding='utf-8').read(),
    '/* pembaruan-2.5.6 — blok MP219 Keuangan & Bayar asli */\n' + keu,
    '/* pembaruan-2.5.6 — blok MP223 Gudang asli */\n' + gd,
    '/* pembaruan-2.5.6 — blok MP230 Verifikasi Tagihan asli */\n' + vt,
    '/* pembaruan-2.5.6 — blok MP241 asli */\n' + mp241,
    'demoMulai();'])
h = open(D + '/kerangka-256.html', encoding='utf-8').read().replace('/*CSS_APLIKASI*/', css).replace('<!--SKRIP-->', skrip)
open(D + '/demo-pembaruan-2.5.6.html', 'w', encoding='utf-8').write(h)
print('ukuran', len(h.encode()) // 1024, 'KB')
