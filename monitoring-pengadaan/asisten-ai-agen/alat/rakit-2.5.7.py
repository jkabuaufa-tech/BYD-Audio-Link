#!/usr/bin/env python3
"""Rakit pembaruan-2.5.7.json dari pembaruan-2.5.6.json (+ patch terdokumentasi). Pasangan modul server 1.8.5.
2.5.7: teks tab Bundel & daftar "Dokumen yang dibaca" sesuai aturan 1.8.5 (PDF unggahan checklist yang lebih baru diutamakan atas bundel).
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-2.5.7.py"""
import json, hashlib, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
P = json.load(open(os.path.join(R, 'pembaruan-2.5.6.json'), encoding='utf-8')); assert P['versi'] == '2.5.6'
OP = []
def ganti(cari, ganti_, ket, semua=None):
    o = {'berkas': 'js', 'jenis': 'ganti-semua' if semua else 'ganti-teks', 'cari': cari, 'ganti': ganti_, 'keterangan': ket}
    if semua: o['jumlah'] = semua
    OP.append(o)
ganti("= '2.5.6';", "= '2.5.7';", 'Nomor versi paket.', semua=4)
ganti("""(srv('bundelUtama') ? '<p class="mp240-cat">Bundel menjadi <b>sumber utama</b> verifikasi dan langsung diperiksa setelah diunggah. PDF per dokumen di tab <b>Checklist Dokumen</b> hanya dipakai untuk jenis dokumen yang tidak ada di bundel.</p>'""",
      """(srv('checklistUtama') ? '<p class="mp240-cat">Bundel langsung diperiksa setelah diunggah. PDF yang Anda unggah per baris di tab <b>Checklist Dokumen</b> <b>sesudah</b> bundel (mis. Invoice/Faktur pembetulan) <b>diutamakan</b> dan dibaca AI; bundel melengkapi jenis dokumen lainnya. Jalankan <b>Verifikasi ulang</b> setelah mengganti PDF.</p>'
        : srv('bundelUtama') ? '<p class="mp240-cat">Bundel menjadi <b>sumber utama</b> verifikasi dan langsung diperiksa setelah diunggah. PDF per dokumen di tab <b>Checklist Dokumen</b> hanya dipakai untuk jenis dokumen yang tidak ada di bundel.</p>'""",
      'Teks tab Bundel mengikuti aturan modul (1.8.5: checklistUtama).')
ganti("""<b>${E(d.nama)}</b> · ${E(d.file)}${d.provider ? ' · <small>' + E(d.provider) + '</small>' : ''}</li>`).join('')}</ul>""",
      """<b>${E(d.nama)}</b> · ${E(d.file)}${d.manual ? ' · <span class="mp256-bd ok">unggahan checklist (diutamakan)</span>' : ''}${d.diganti ? ' · <small class="text-muted">' + E(d.diganti) + '</small>' : ''}${d.provider ? ' · <small>' + E(d.provider) + '</small>' : ''}</li>`).join('')}</ul>""",
      'Laporan: tandai sumber dokumen (unggahan checklist / bagian bundel yang digantikan).')
H = dict(P)
for o in OP:
    t = H['js']; n = t.count(o['cari'])
    assert n == (o.get('jumlah') or 1), ('penanda', n, o['cari'][:80]); H['js'] = t.replace(o['cari'], o['ganti'])
CAT = ("Pembaruan 2.5.7 (kumulatif dari 2.5.6 … 2.2.7; pasangan Modul server 1.8.5).\n"
  "PERBAIKAN 2.5.7 / 1.8.5 — Verifikasi AI membaca PDF yang diunggah per baris checklist (Invoice, Faktur Pajak, Surat Jalan, BAPM, …) walaupun tagihan sudah punya bundel: "
  "PDF yang diunggah sesudah bundel diutamakan; bundel melengkapi jenis lain; potongan otomatis bundel tidak dibaca ulang. Laporan menandai sumber dokumen. "
  "Setelah memasang, buka checklist tagihan berbundel → Verifikasi AI → Verifikasi ulang.\n"
  "Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.5.6 (data tidak berubah).\n") + P['catatan']
H.update(versi='2.5.7', tanggal='2026-10-15', catatan=CAT)
json.dump(H, open(os.path.join(R, 'pembaruan-2.5.7.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
X = {'format': 'monitoring-sap-pembaruan-patch', 'dari': '2.5.6', 'ke': '2.5.7', 'tanggal': '2026-10-15', 'keterangan': 'Patch 2.5.6 → 2.5.7 (hanya JS aplikasi). Unggah pembaruan-2.5.7.json.',
     'sha256Sumber': {'css': sha(P['css']), 'js': sha(P['js'])}, 'sha256Hasil': {'css': sha(H['css']), 'js': sha(H['js'])}, 'catatan': CAT, 'operasi': OP}
json.dump(X, open(os.path.join(R, 'pembaruan-2.5.7.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK pembaruan-2.5.7.json ·', len(OP), 'operasi')
