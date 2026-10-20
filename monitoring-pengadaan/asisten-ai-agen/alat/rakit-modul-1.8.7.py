#!/usr/bin/env python3
"""Rakit server-modul-1.8.7.json dari server-modul-1.8.6.json (kumulatif).
1.8.7: "Data gudang gagal dimuat: Server mengirim halaman HTML, bukan data (HTTP 404) … Halaman Tidak Ditemukan Drive".
Sebab: aksi gudangBaca mengirim SELURUH transaksi gudang (masuk + keluar, termasuk data migrasi) dalam SATU respons. Setelah data
gudang besar, Google gagal menyajikan respons sebesar itu dan mengirim halaman Drive "Tidak dapat membuka file" (404) — padahal
deployment aktif dan aksi lain berjalan. Kini ada aksi BACA baru gudangBacaHal (per halaman, hanya kolom DATA pada rentang baris)
sehingga tiap respons kecil. gudangBaca lama TIDAK diubah (aplikasi lama tetap jalan). Tidak ada penulisan data, tidak ada izin Google baru.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-modul-1.8.7.py"""
import json, os, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = json.load(open(os.path.join(R, 'server-modul-1.8.6.json'), encoding='utf-8')); assert M['versi'] == '1.8.6'
k = M['kode']; OP = []
def g(cari, ganti, ket, n=1):
    global k
    assert k.count(cari) == n, ('penanda', k.count(cari), cari[:90]); k = k.replace(cari, ganti); OP.append({'cari': cari, 'ganti': ganti, 'jumlah': n, 'keterangan': ket})
g("/* MODUL SERVER 1.8.6 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.5)",
  "/* MODUL SERVER 1.8.7 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.6) · 1.8.7: data gudang dibaca per halaman (gudangBacaHal)", 'Judul modul.')
g("versiAI: '1.8.6'", "versiAI: '1.8.7'", 'Versi AI.')
g("versiTim: '1.8.6'", "versiTim: '1.8.7'", 'Versi Tim.')
g("""function gdTulis(P, j, rec, baru) {""",
  """// 1.8.7: baca transaksi gudang PER HALAMAN — hanya kolom DATA pada rentang baris, respons kecil walau data gudang besar (gudangBaca utuh tetap ada)
function gdBacaHal(P, j, mulai, batas) {
  if (['masuk', 'keluar'].indexOf(j) < 0) throw new Error('Jenis transaksi gudang tidak dikenal.');
  const sh = ss_().getSheetByName(gdNamaSheet(P, j)), total = sh ? Math.max(0, sh.getLastRow() - 1) : 0;
  mulai = Math.max(0, Math.floor(Number(mulai) || 0)); batas = Math.min(1000, Math.max(1, Math.floor(Number(batas) || 250)));
  const n = Math.max(0, Math.min(batas, total - mulai)), kol = (j === 'masuk' ? GD_MASUK_COL : GD_KELUAR_COL).length;
  const data = n ? sh.getRange(2 + mulai, kol, n, 1).getValues().map(r => { if (!r[0]) return null; try { return JSON.parse(s_(r[0])); } catch (e) { return null; } }).filter(Boolean) : [];
  return { ok: true, versiServer: VERSI_SERVER, jenis: j, mulai: mulai, berikut: mulai + n, total: total, selesai: mulai + n >= total, data: data };
}
function gdTulis(P, j, rec, baru) {""", 'Fungsi baca gudang per halaman (baca saja).')
g("""  gudangBaca: (req, u, P) =>""",
  """  gudangBacaHal: (req, u, P) => gdBacaHal(P, s_(req.jenis), req.mulai, req.batas),   // 1.8.7
  gudangBaca: (req, u, P) =>""", 'Aksi gudangBacaHal.')
g("""'gudangBaca', 'identitasBaca',""", """'gudangBaca', 'gudangBacaHal', 'identitasBaca',""", 'gudangBacaHal = aksi BACA (tanpa kunci tulis, boleh di pratinjau).')
g("""  fitur: ['bacaTahanPotong',""", """  fitur: ['gudangHalaman', 'bacaTahanPotong',""", 'Fitur baru diumumkan.')
CAT = ('Modul server 1.8.7 (kumulatif dari 1.8.6 … 1.0.0; kernel Code.gs 2.5.1, tanpa izin Google baru, tanpa perubahan data).\n'
  'PERBAIKAN 1.8.7 — "Data gudang gagal dimuat: Server mengirim halaman HTML, bukan data (HTTP 404) … Halaman Tidak Ditemukan Drive": '
  'gudangBaca mengirim seluruh transaksi gudang dalam satu respons; bila data gudang besar Google menampilkan halaman Drive 404 walau deployment aktif. '
  'Aksi baca baru gudangBacaHal mengirim transaksi per halaman (maks. 1.000 baris, hanya kolom DATA) sehingga respons selalu kecil. '
  'gudangBaca lama tetap ada & tidak diubah. Pasangan aplikasi: Pembaruan 2.5.9.\n') + M['catatan']
H = dict(M, versi='1.8.7', tanggal='2026-10-20', catatan=CAT, kode=k)
json.dump(H, open(os.path.join(R, 'server-modul-1.8.7.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
json.dump({'format': 'monitoring-sap-modul-patch', 'dari': '1.8.6', 'ke': '1.8.7', 'sha256Sumber': sha(M['kode']), 'sha256Hasil': sha(k), 'operasi': OP}, open(os.path.join(R, 'server-modul-1.8.7.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK server-modul-1.8.7.json ·', len(OP), 'operasi')
