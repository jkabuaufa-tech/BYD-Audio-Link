# Rakit pembaruan-2.6.13.json = pembaruan-2.6.12.json + blok MP2613 (Agen AI) — disisipkan sebelum blok MP264 (yang harus tetap terakhir).
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
p = json.load(open(os.path.join(D, 'pembaruan-2.6.12.json'), encoding='utf-8'))
js = open(os.path.join(D, 'sumber/pembaruan-2.6.13-agen-ai.js'), encoding='utf-8').read()
css = open(os.path.join(D, 'sumber/pembaruan-2.6.13-agen-ai.css'), encoding='utf-8').read()
assert 'MP2613' not in p['js'], 'paket dasar sudah berisi MP2613'
i = p['js'].index('/* MP264 — PEMBARUAN')
p['js'] = p['js'][:i] + js + p['js'][i:]
p['css'] = p['css'].rstrip() + '\n\n' + css
p['versi'] = '2.6.13'; p['tanggal'] = '2026-10-25'
p['catatan'] = ('Pembaruan 2.6.13 (kumulatif dari 2.6.12 … 2.2.7; Modul server tetap 1.9.2, tanpa perubahan server).\n'
  'BARU 2.6.13 — AGEN AI PROYEK yang bekerja nyata & hemat token: dock di pojok kiri bawah menampilkan status agen (Bekerja / Siaga / Perlu perhatian) '
  'dan langkah yang sedang dikerjakan; menu akun › Agen AI (Ctrl+Shift+A) membuka Meja Kerja Agen: Aktivitas langsung (log tiap langkah), Temuan prioritas '
  '(Kritis/Warning/Info, tanda BARU, tombol Buka ke form asli) dan Briefing. Agen memeriksa masa kontrak & dokumen vendor, nilai/item/tagihan kontrak (Periksa kontrak), '
  'draf Rp 0, tagihan BELUM bayar > 30 hari dan bon gudang > 14 hari — seluruhnya dihitung di perangkat (0 token) setiap kali data berubah; data sama = tidak diulang. '
  'AI hanya dipanggil bila menekan "Ringkas dengan AI": 1 panggilan berisi intisari ≤ 1.400 karakter, jawaban ±120 kata, disimpan per sidik data. Agen tidak mengubah data.\n'
  'Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.6.12.\n') + p['catatan']
out = os.path.join(D, 'pembaruan-2.6.13.json')
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(out, os.path.getsize(out), 'byte')
