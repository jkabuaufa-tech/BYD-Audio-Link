#!/usr/bin/env python3
"""Sertakan template surat perjanjian Word (.docx) ke kontrak-template.js.

Aplikasi mengisi bagian [isian] dan titik-titik (……) pada template ini lalu
menghasilkan file Word yang formatnya sama persis dengan master.

Pemakaian:
    python alat/buat-template-surat.py <folder-master>
Folder berisi: SPPM.docx, SPSA.docx, SPKU.docx (= SPMB), dan bila ada SPPP.docx, SPK.docx.
"""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
JENIS = {
    'SPPM': 'Surat Perjanjian Pemesanan Material',
    'SPSA': 'Surat Perjanjian Sewa Alat',
    'SPKU': 'Surat Perjanjian Mandor Borong (SPMB)',
    'SPPP': 'Surat Perjanjian Pemborongan Pekerjaan',
    'SPK': 'Surat Perintah Kerja',
}


def main():
    src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    out = {}
    for kode, nama in JENIS.items():
        f = src / f'{kode}.docx'
        if not f.exists():
            print(f'  {kode}: tidak ada, dilewati')
            continue
        data = f.read_bytes()
        if not data.startswith(b'PK'):
            print(f'  {kode}: bukan .docx biasa (terkunci/terenkripsi?), dilewati')
            continue
        out[kode] = {'nama': nama, 'b64': base64.b64encode(data).decode()}
        print(f'  {kode}: {len(data) / 1024:.0f} KB')
    js = ('/* Dibuat otomatis oleh alat/buat-template-surat.py dari master Word — jangan diedit manual */\n'
          'window.SURAT_TPL = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    (ROOT / 'kontrak-template.js').write_text(js, encoding='utf-8')
    print(f'kontrak-template.js: {len(js) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
