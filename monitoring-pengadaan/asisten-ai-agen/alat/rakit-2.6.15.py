# Rakit pembaruan-2.6.15.json (gabungan 2.6.13 + 2.6.14) = pembaruan-2.6.12.json + blok MP2613 (Agen AI) + MP2614 (Kantor Agen AI Live, tim pengadaan) — disisipkan sebelum blok MP264 (yang harus tetap terakhir).
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
p['versi'] = '2.6.15'; p['tanggal'] = '2026-10-25'
p['catatan'] = ('Pembaruan 2.6.15 (kumulatif dari 2.6.12 … 2.2.7; menggabungkan 2.6.13 & 2.6.14; Modul server tetap 1.9.2, tanpa perubahan server & data).\n'
  'BARU 2.6.15 — AGEN AI & KANTOR TIM PENGADAAN LIVE (0 token). (1) Dock Agen AI (pojok kiri bawah) & Meja Kerja Agen (menu akun › Agen AI, Ctrl+Shift+A): '
  'agen memeriksa sendiri setiap data berubah — masa kontrak & dokumen vendor, nilai/item/tagihan kontrak, draf Rp 0, tagihan BELUM bayar > 30 hari, bon gudang > 14 hari, '
  'dan WBS bon permintaan — hasilnya Temuan Kritis/Warning/Info dengan tombol Buka & Briefing; dihitung di perangkat, data sama = tidak diulang. '
  'Ringkasan AI hanya bila diminta (1 panggilan intisari ≤ 1.400 karakter, di-cache). '
  '(2) Kantor Agen (Live) — klik dock / menu akun: kantor isometrik beranimasi berisi tim pengadaan: Joko Supriyono (Manajer Pengadaan), '
  'Charles Van Anto (tagihan SPM/SPPM, kartu gudang, pengeluaran & administrasi gudang), M Yusuf Van Basten (tagihan service SPK/SPPP/SPKP/SPSA), '
  'Vicha Ramadhani (SAP: PR/PO/GR/GI/SES/MIRO), Salma (bon permintaan → PBJ → register kontrak), Rowin, Gede & Ilham (Adkon: WBS bon permintaan). '
  'Tiap orang duduk mengetik saat pemeriksaan bagiannya berjalan, balon berisi hasil nyata, berjalan ke papan temuan/kopi/jendela/sofa di sela kerja; '
  'klik orang → temuan bagiannya + Buka. Tanpa panggilan AI; animasi berhenti saat ditutup. Agen tidak mengubah data.\n'
  'Rollback: Pengguna & Proyek › Pembaruan › Rollback ke versi sebelumnya.\n') + p['catatan']
out = os.path.join(D, 'pembaruan-2.6.15.json')
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(out, os.path.getsize(out), 'byte')
