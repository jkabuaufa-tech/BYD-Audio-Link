# Rakit pembaruan-2.6.16.json (gabungan 2.6.13 … 2.6.17) = pembaruan-2.6.12.json + blok MP2613 (Agen AI) + MP2614 (Kantor Agen AI Live, tim pengadaan) — disisipkan sebelum blok MP264 (yang harus tetap terakhir).
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
p = json.load(open(os.path.join(D, 'pembaruan-2.6.12.json'), encoding='utf-8'))
baca = lambda n: open(os.path.join(D, 'sumber', n), encoding='utf-8').read()
js = baca('pembaruan-2.6.13-agen-ai.js') + baca('pembaruan-2.6.14-kantor-live.js') + baca('pembaruan-2.6.16-perintah-live.js')
css = baca('pembaruan-2.6.13-agen-ai.css') + '\n' + baca('pembaruan-2.6.14-kantor-live.css') + '\n' + baca('pembaruan-2.6.16-perintah-live.css')
assert 'MP2613' not in p['js'], 'paket dasar sudah berisi MP2613'
i = p['js'].index('/* MP264 — PEMBARUAN')
p['js'] = p['js'][:i] + js + p['js'][i:]
p['css'] = p['css'].rstrip() + '\n\n' + css
p['versi'] = '2.6.17'; p['tanggal'] = '2026-10-25'
p['catatan'] = ('Pembaruan 2.6.17 (kumulatif dari 2.6.12 … 2.2.7; menggabungkan 2.6.13 … 2.6.17; Modul server tetap 1.9.2, tanpa perubahan server & data).\n'
  'KOREKSI 2.6.17 — Ilham kini BOSS Pengadaan (tim divisi yang memastikan pekerjaan berjalan sesuai prosedur): memegang langkah baru Agen AI "Reviu kepatuhan prosedur" '
  '(seluruh temuan Kritis dikelompokkan per alur bon → PBJ → kontrak → tagihan, 0 token), dapat diperintah untuk reviu prosedur (tanpa mengubah data). Adkon WBS: Rowin & Gede.\n'
  'BARU 2.6.16 — RUANG PERINTAH LIVE: di Kantor Tim Pengadaan, Manajer memilih staf (atau klik karakternya) lalu memberi perintah; staf berjalan ke meja, mengetik, '
  'menjawab di utas & balon, dan bertanya balik bila data kurang. Laporan/temuan/tugas/berapa/buka form/periksa ulang dijawab lokal (0 token); pekerjaan & pertanyaan baru = 1 panggilan AI '
  '(persona & aksi sesuai tugas: Salma/Vicha paket PBJ, Charles penerimaan bon & status tagihan, Yusuf status tagihan service, Adkon diarahkan ke Form Bon). '
  'AI tidak menyimpan apa pun sendiri: perubahan data selalu berupa usulan dengan pratinjau → Setujui & Terapkan oleh Manajer (hak Pengadaan/Admin, tercatat di Log).\n'
  'AGEN AI & KANTOR TIM PENGADAAN LIVE (0 token). (1) Dock Agen AI (pojok kiri bawah) & Meja Kerja Agen (menu akun › Agen AI, Ctrl+Shift+A): '
  'agen memeriksa sendiri setiap data berubah — masa kontrak & dokumen vendor, nilai/item/tagihan kontrak, draf Rp 0, tagihan BELUM bayar > 30 hari, bon gudang > 14 hari, '
  'dan WBS bon permintaan — hasilnya Temuan Kritis/Warning/Info dengan tombol Buka & Briefing; dihitung di perangkat, data sama = tidak diulang. '
  'Ringkasan AI hanya bila diminta (1 panggilan intisari ≤ 1.400 karakter, di-cache). '
  '(2) Kantor Agen (Live) — klik dock / menu akun: kantor isometrik beranimasi berisi tim pengadaan: Joko Supriyono (Manajer Pengadaan), '
  'Charles Van Anto (tagihan SPM/SPPM, kartu gudang, pengeluaran & administrasi gudang), M Yusuf Van Basten (tagihan service SPK/SPPP/SPKP/SPSA), '
  'Vicha Ramadhani (SAP: PR/PO/GR/GI/SES/MIRO), Salma (bon permintaan → PBJ → register kontrak), Rowin & Gede (Adkon: WBS bon permintaan), Ilham (BOSS Pengadaan: kepatuhan prosedur). '
  'Tiap orang duduk mengetik saat pemeriksaan bagiannya berjalan, balon berisi hasil nyata, berjalan ke papan temuan/kopi/jendela/sofa di sela kerja; '
  'klik orang → temuan bagiannya + Buka. Tanpa panggilan AI; animasi berhenti saat ditutup. Agen tidak mengubah data.\n'
  'Rollback: Pengguna & Proyek › Pembaruan › Rollback ke versi sebelumnya.\n') + p['catatan']
out = os.path.join(D, 'pembaruan-2.6.17.json')
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(out, os.path.getsize(out), 'byte')
