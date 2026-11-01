#!/usr/bin/env python3
"""Rakit Pembaruan 2.10.0 & Modul server 1.10.6 (foto per material, tanggal BAPM/BAP terpisah, sinkron tanggal gudang)
dari paket 2.9.9 / 1.10.5:   python3 -I tagihan/alat/perbaiki-template.py && python3 -I tagihan/alat/rakit-2100.py"""
import base64, json, os, re
from datetime import date

T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(os.path.dirname(T), 'asisten-ai-agen')
src = lambda n: open(os.path.join(T, 'sumber', n), encoding='utf-8').read()
VM, DM, VA, DA = '1.10.6', '1.10.5', '2.10.0', '2.9.9'
CAT_M = ('1.10.6 — FOTO PER MATERIAL & TANGGAL BAPM/BAP: gudangTerimaBon/gudangLengkapiFoto menerima fotoItem (4 sisi per item; tiap item ≥ 1 foto sendiri atau foto utama sebagai wakil). '
         'Aksi bkTanggal: tanggal BA (BAPM/BAPP) & tanggal BAP terpisah di BK, divalidasi ≤ akhir kontrak (Register/addendum) & ≥ tanggal kontrak; blSimpan membawa keduanya ke BK. '
         'GR otomatis dari progres bertanggal = tanggal BAPM (bukan tanggal opname/tgl 1) & disinkronkan saat tanggal BA berubah (saldo Kartu Gudang dicek); gudangSinkronTanggal massal. Pasangan: Pembaruan 2.10.0.')
CAT_A = ('<b>Versi baru 2.10.0 tersedia.</b> Pembaruan 2.10.0 (kumulatif dari 2.9.9 … 2.2.7; butuh Modul server 1.10.6).\n'
         'BARU 2.10.0 — PENERIMAAN & TANGGAL BA: foto penerimaan kini PER MATERIAL (slot Depan/Belakang/Kanan/Kiri tiap item; foto kiriman menjadi foto utama yang mewakili item tanpa foto sendiri) di Penerimaan Material & Lengkapi foto. '
         'Tanggal BAPM/BAPP dan Tanggal BAP diisi terpisah (Input Progres, Preview BA, Paket Tagihan) dan tidak boleh melewati masa berlaku kontrak/SPM. '
         'Penerimaan gudang otomatis & Kartu Gudang mengikuti tanggal BAPM (tombol "Sinkron tanggal BAPM" untuk data lama). Dokumen BA & lampiran memakai tanggal BA, BAP/invoice/kwitansi memakai tanggal BAP; Excel baku punya kolom Tanggal BAP.')
GANTI = [
  ("""!nf ? 'Unggah minimal 1 foto barang.' : '');""", """!nf && !(window.mp2100FotoCukup && window.mp2100FotoCukup()) ? 'Unggah minimal 1 foto utama, atau foto per material untuk setiap item.' : '');""", 1),
  ("""if (!F.some(Boolean)) { msg('Pilih minimal 1 foto barang di lapangan.'); return; }""", """if (!F.some(Boolean) && !(window.mp2100FotoCukupOto && window.mp2100FotoCukupOto(kiriman))) { msg('Pilih minimal 1 foto utama, atau foto per material untuk setiap item.'); return; }""", 1),
  ("tanggal: T.l.tanggalDok || e.tanggal,", "tanggal: T.l.tanggalDok || e.tanggalBAP || e.tanggal, tanggalBA: T.l.tanggalBA || e.tanggalBA || T.l.tanggalDok || e.tanggal,", 1),
  ("  function buat(p, kode) {\n    const c = ctx(p);", "  function buat(p, kode) {\n    if (p.tanggalBA && /^(BAP[MAP]|BAPSA|REKAP_TERIMA|REKAP_SJ|REKAP_QTY|REKAP_TS|SEWA|PAKAI)$/.test(kode)) p = Object.assign({}, p, { tanggal: p.tanggalBA });   // [2.10.0] BA & lampiran: tanggal BA\n    const c = ctx(p);", 1),
  ("(e0.baTerbit || e0.tanggal)", "(e0.tanggalBA || e0.baTerbit || e0.tanggal)", 3),
  ("tanggal: (T.l && T.l.tanggalDok) || e.tanggal,", "tanggal: (T.l && (T.l.tanggalBA || T.l.tanggalDok)) || e.tanggalBA || e.tanggal, tanggalBAP: (T.l && T.l.tanggalDok) || e.tanggalBAP || '',", 1),
  ("return { g, ke: N(BA.urut) || 1, nomor, tanggal: BA.tanggal, progresId: BA.sumberProgres || null,", "return { g, ke: N(BA.urut) || 1, nomor, tanggal: BA.tanggal, tanggalBAP: ((((typeof PROG !== 'undefined' && PROG.data) || []).find(x => x.id === BA.sumberProgres)) || {}).tanggalBAP || '', progresId: BA.sumberProgres || null,", 1),
  ("tanggal: e.tanggal || e.baTerbit || ''", "tanggal: e.tanggalBA || e.tanggal || e.baTerbit || '', tanggalBAP: e.tanggalBAP || ''", 1),
]

def modul():
    p = json.load(open(os.path.join(R, 'server-modul-%s.json' % DM), encoding='utf-8')); k = p['kode']
    j0 = '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.4) · ' % DM
    assert k.startswith(j0)
    k = k.replace(j0, '/* MODUL SERVER %s — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.5) · 1.10.6: foto per material, tanggal BAPM/BAP terpisah, sinkron tanggal gudang · ' % VM, 1)
    for kunci in ("versiAI: '%s'", "versiTim: '%s'"):
        assert k.count(kunci % DM) == 1; k = k.replace(kunci % DM, kunci % VM)
    batas = '/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir'; assert k.count(batas) == 1
    k = k.replace(batas, src('server-gd.js').rstrip('\n') + '\n\n' + batas)
    json.dump({'format': 'monitoring-sap-modul-server', 'versi': VM, 'untukKernel': '2.5', 'tanggal': date.today().isoformat(), 'catatan': CAT_M + '\n' + p['catatan'], 'kode': k},
              open(os.path.join(R, 'server-modul-%s.json' % VM), 'w', encoding='utf-8'), ensure_ascii=False)
    print('modul %s: %d karakter' % (VM, len(k)))

def pembaruan():
    p = json.load(open(os.path.join(R, 'pembaruan-%s.json' % DA), encoding='utf-8'))
    js, n = re.subn(r"(const (?:VERSI_PAKET|VERSI) = ')[\d.]+'", r"\g<1>" + VA + "'", p['js']); assert n >= 4
    for lama, baru, c in GANTI:
        assert js.count(lama) == c, (js.count(lama), lama[:60]); js = js.replace(lama, baru)
    i = js.index('window.__MP292_FORMAT = '); j = js.index('\n', i); assert js[j - 2:j] == '};'
    tpl = {k: base64.b64encode(open(os.path.join(T, 'template', n), 'rb').read()).decode() for k, n in (('spm', 'Master SPM (2.10.0).xlsx'), ('bap', 'BAP - format (2.10.0).xlsx'))}
    js = js[:i] + 'window.__MP292_FORMAT = ' + json.dumps(tpl) + ';' + js[j:]
    batas = '/* MP264 — PEMBARUAN'; assert js.count(batas) == 1
    js = js.replace(batas, src('mp2100-gudang-tanggal.js').rstrip('\n') + '\n\n' + batas)
    p.update(versi=VA, js=js, css=p['css'].rstrip('\n') + '\n' + src('mp2100-gudang-tanggal.css'), catatan=CAT_A + '\n' + p['catatan'], tanggal=date.today().isoformat())
    for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
    json.dump(p, open(os.path.join(R, 'pembaruan-%s.json' % VA), 'w', encoding='utf-8'), ensure_ascii=False)
    print('pembaruan %s → %s: js %d karakter, %d perbaikan di tempat' % (DA, VA, len(js), len(GANTI)))

if __name__ == '__main__':
    modul(); pembaruan()
