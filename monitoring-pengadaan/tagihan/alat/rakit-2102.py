#!/usr/bin/env python3
"""Rakit Pembaruan 2.10.2 & Modul server 1.10.7 dari 2.10.1 / 1.10.6 (versi baru agar dapat diunggah di atas yang terpasang;
2.10.2: dialog Lengkapi foto dilengkapi langsung saat muncul).   python3 -I tagihan/alat/rakit-2102.py"""
import json, os, re
from datetime import date
T = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); R = os.path.join(os.path.dirname(T), 'asisten-ai-agen')
src = lambda n: open(os.path.join(T, 'sumber', n), encoding='utf-8').read()
VM, DM, VA, DA = '1.10.7', '1.10.6', '2.10.2', '2.10.1'

p = json.load(open(os.path.join(R, 'server-modul-%s.json' % DM), encoding='utf-8')); k = p['kode']
j0 = '/* MODUL SERVER %s ' % DM; assert k.startswith(j0); k = '/* MODUL SERVER %s ' % VM + k[len(j0):]
for kunci in ("versiAI: '%s'", "versiTim: '%s'"):
    assert k.count(kunci % DM) == 1; k = k.replace(kunci % DM, kunci % VM)
json.dump({'format': 'monitoring-sap-modul-server', 'versi': VM, 'untukKernel': '2.5', 'tanggal': date.today().isoformat(),
           'catatan': VM + ' — rilis ulang 1.10.6 (isi sama) agar dapat diterbitkan di atas 1.10.6. Pasangan: Pembaruan 2.10.2.\n' + p['catatan'], 'kode': k},
          open(os.path.join(R, 'server-modul-%s.json' % VM), 'w', encoding='utf-8'), ensure_ascii=False)

p = json.load(open(os.path.join(R, 'pembaruan-%s.json' % DA), encoding='utf-8'))
js, n = re.subn(r"(const (?:VERSI_PAKET|VERSI) = ')%s'" % re.escape(DA), r"\g<1>" + VA + "'", p['js']); assert n >= 4, n
a, b = js.index('/* MP2100 — '), js.index('/* MP2101 — ')
js = js[:a] + src('mp2100-gudang-tanggal.js').rstrip('\n') + '\n\n' + js[b:]
assert js.count('pasangModal, sinkronOtomatis]') == 1
p.update(versi=VA, js=js, tanggal=date.today().isoformat(),
         catatan='<b>Versi baru %s tersedia.</b> Pembaruan %s (kumulatif; butuh Modul server %s).\nBARU %s — Dialog "Lengkapi foto penerimaan" langsung menampilkan isian Tanggal penerimaan = Tanggal BAPM dan Foto per material.\n' % (VA, VA, VM, VA) + p['catatan'])
json.dump(p, open(os.path.join(R, 'pembaruan-%s.json' % VA), 'w', encoding='utf-8'), ensure_ascii=False)
print('modul', VM, '· pembaruan', VA, 'js', len(js))
