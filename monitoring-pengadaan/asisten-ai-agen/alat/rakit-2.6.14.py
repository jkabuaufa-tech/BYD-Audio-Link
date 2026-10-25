# Rakit pembaruan-2.6.14.json = pembaruan-2.6.12.json + blok MP2613 (Agen AI) + MP2614 (Kantor Agen AI Live) — disisipkan sebelum blok MP264 (yang harus tetap terakhir).
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
p = json.load(open(os.path.join(D, 'pembaruan-2.6.12.json'), encoding='utf-8'))
baca = lambda n: open(os.path.join(D, 'sumber', n), encoding='utf-8').read()
js = baca('pembaruan-2.6.13-agen-ai.js') + baca('pembaruan-2.6.14-kantor-live.js')
css = baca('pembaruan-2.6.13-agen-ai.css') + '\n' + baca('pembaruan-2.6.14-kantor-live.css')
assert 'MP2613' not in p['js'], 'paket dasar sudah berisi MP2613'
i = p['js'].index('/* MP264 — PEMBARUAN')
p['js'] = p['js'][:i] + js + p['js'][i:]
p['css'] = p['css'].rstrip() + '\n\n' + css
p['versi'] = '2.6.14'; p['tanggal'] = '2026-10-25'
p['catatan'] = ('Pembaruan 2.6.14 (kumulatif dari 2.6.13 … 2.2.7; Modul server tetap 1.9.2, tanpa perubahan server).\n'
  'BARU 2.6.14 — KANTOR AGEN AI LIVE (0 token): klik dock Agen AI atau menu akun › Kantor Agen (Live). Tujuh agen tampil sebagai karakter di kantor isometrik beranimasi '
  '(Pendata, Pemantau Kontrak, Auditor Nilai, Admin Draf, Analis Keuangan, Petugas Gudang, Manajer): duduk mengetik saat langkahnya berjalan, balon tugas berisi hasil pemeriksaan nyata, '
  'berjalan ke papan temuan / kopi / jendela / sofa di sela kerja, papan berisi catatan tempel temuan, langit jendela mengikuti jam. Klik karakter → temuan bagiannya + Buka. '
  'Semua dihitung di perangkat, tanpa panggilan AI; animasi berhenti saat ditutup.\n'
  'Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.6.13.\n'
  'Pembaruan 2.6.13 (kumulatif dari 2.6.12 … 2.2.7; Modul server tetap 1.9.2, tanpa perubahan server).\n'
  'BARU 2.6.13 — AGEN AI PROYEK yang bekerja nyata & hemat token: dock di pojok kiri bawah menampilkan status agen (Bekerja / Siaga / Perlu perhatian) '
  'dan langkah yang sedang dikerjakan; menu akun › Agen AI (Ctrl+Shift+A) membuka Meja Kerja Agen: Aktivitas langsung (log tiap langkah), Temuan prioritas '
  '(Kritis/Warning/Info, tanda BARU, tombol Buka ke form asli) dan Briefing. Agen memeriksa masa kontrak & dokumen vendor, nilai/item/tagihan kontrak (Periksa kontrak), '
  'draf Rp 0, tagihan BELUM bayar > 30 hari dan bon gudang > 14 hari — seluruhnya dihitung di perangkat (0 token) setiap kali data berubah; data sama = tidak diulang. '
  'AI hanya dipanggil bila menekan "Ringkas dengan AI": 1 panggilan berisi intisari ≤ 1.400 karakter, jawaban ±120 kata, disimpan per sidik data. Agen tidak mengubah data.\n'
  'Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.6.12.\n') + p['catatan']
out = os.path.join(D, 'pembaruan-2.6.14.json')
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(out, os.path.getsize(out), 'byte')
