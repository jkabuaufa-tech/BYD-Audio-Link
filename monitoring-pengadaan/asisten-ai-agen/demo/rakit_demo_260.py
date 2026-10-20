# Merakit demo-pembaruan-2.6.0.html: blok MP260 ASLI + CSS paket 2.6.0 di atas tiruan aplikasi & server (demo260.js).
# Pakai (dari folder demo):  python3 -I rakit_demo_260.py
import json, os
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
pk = json.load(open(R + '/pembaruan-2.6.0.json', encoding='utf-8')); js, css = pk['js'], pk['css']
mp260 = js[js.index('/* MP260 — PEMBARUAN 2.6.0'):]
css260 = css[css.index('/* MP260 — 2.6.0'):]
sim = open(D + '/demo260.js', encoding='utf-8').read()
for t in (mp260, sim): assert '</script' not in t.lower()
skrip = ''.join('<script>\n' + t + '\n</script>\n' for t in [sim, '/* pembaruan-2.6.0 — blok MP260 asli */\n' + mp260, 'demoMulai();'])
h = open(D + '/kerangka-260.html', encoding='utf-8').read().replace('/*CSS_APLIKASI*/', css260).replace('<!--SKRIP-->', skrip)
open(D + '/demo-pembaruan-2.6.0.html', 'w', encoding='utf-8').write(h)
print('ukuran', len(h.encode()) // 1024, 'KB')
