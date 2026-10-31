#!/usr/bin/env python3
"""Ubah gambar EMF di template format baku menjadi PNG seukuran bingkai EMF (untuk pratinjau HTML; berkas Excel tetap memakai EMF asli).
  python3 alat/emf-pratinjau.py <template.xlsx> <folder-keluar>     (butuh LibreOffice: soffice)
Keluaran: <folder>/<nama-media>.png — bingkai (rclFrame) utuh agar srcRect (potongan) di gambar Excel berlaku sama."""
import sys, os, zipfile, struct, subprocess, tempfile, shutil
from PIL import Image, ImageChops
tpl, keluar = sys.argv[1:3]; os.makedirs(keluar, exist_ok=True)
z = zipfile.ZipFile(tpl)
for n in z.namelist():
    if not n.lower().endswith('.emf'): continue
    b = z.read(n)
    bl, bt, br, bb = struct.unpack('<iiii', b[8:24]); fl, ft, fr, fb = struct.unpack('<iiii', b[24:40])
    devx, devy = struct.unpack('<ii', b[72:80]); mmx, mmy = struct.unpack('<ii', b[80:88])
    pxmm = devx / mmx
    tmp = tempfile.mkdtemp(); p = os.path.join(tmp, 'x.emf'); open(p, 'wb').write(b)
    subprocess.run(['soffice', '--headless', '--convert-to', 'png', '--outdir', tmp, p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    im = Image.open(os.path.join(tmp, 'x.png')).convert('RGBA')
    bb2 = ImageChops.difference(im.convert('RGB'), Image.new('RGB', im.size, (255, 255, 255))).getbbox()
    isi = im.crop(bb2)
    s = isi.width / max(1, (br - bl))                     # px gambar per piksel perangkat EMF
    fw, fh = (fr - fl) / 100 * pxmm * s, (fb - ft) / 100 * pxmm * s
    kanvas = Image.new('RGBA', (max(1, round(fw)), max(1, round(fh))), (255, 255, 255, 0))
    ox, oy = (bl - fl / 100 * pxmm) * s, (bt - ft / 100 * pxmm) * s
    kanvas.paste(isi, (round(ox), round(oy)), isi)
    nama = os.path.join(keluar, os.path.basename(n).replace('.emf', '.png')); kanvas.save(nama, optimize=True)
    print(n, '→', nama, kanvas.size); shutil.rmtree(tmp)
