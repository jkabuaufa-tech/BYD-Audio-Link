#!/usr/bin/env python3
"""Rakit server-modul-1.8.8.json dari server-modul-1.8.7.json (kumulatif).
1.8.8: KEHADIRAN — Admin melihat siapa yang sedang online & sedang mengerjakan apa.
  · hadirDetak (semua pengguna): aplikasi mengirim menu/aktivitas yang sedang dibuka tiap ±60 detik. Disimpan di CacheService
    (kedaluwarsa 15 menit) — TIDAK menulis Google Sheets, tidak menambah baris Log, tidak memakai kunci tulis.
  · hadirDaftar (khusus Admin): daftar pengguna proyek + status online/diam/offline + 3 aktivitas tercatat terakhir dari Log (baca saja, 400 baris terakhir).
Tanpa izin Google baru. Pasangan aplikasi: Pembaruan 2.6.0.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-modul-1.8.8.py"""
import json, os, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = json.load(open(os.path.join(R, 'server-modul-1.8.7.json'), encoding='utf-8')); assert M['versi'] == '1.8.7'
k = M['kode']; OP = []
def g(cari, ganti, ket, n=1):
    global k
    assert k.count(cari) == n, ('penanda', k.count(cari), cari[:90]); k = k.replace(cari, ganti); OP.append({'cari': cari, 'ganti': ganti, 'jumlah': n, 'keterangan': ket})
g("/* MODUL SERVER 1.8.7 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.6)",
  "/* MODUL SERVER 1.8.8 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.7) · 1.8.8: kehadiran pengguna (siapa online & sedang apa)", 'Judul modul.')
g("versiAI: '1.8.7'", "versiAI: '1.8.8'", 'Versi AI.')
g("versiTim: '1.8.7'", "versiTim: '1.8.8'", 'Versi Tim.')
g("""// 1.8.7: baca transaksi gudang PER HALAMAN""",
  """// 1.8.8: KEHADIRAN — status online & aktivitas pengguna disimpan di CacheService saja (kedaluwarsa 15 menit); tidak menulis Sheets
const HADIR_TTL = 900, HADIR_ONLINE = 180;
function hadirKunci(P, nama) { return 'HADIR|' + P + '|' + s_(nama).trim().toLowerCase(); }
function hadirDetak(P, req, u) {
  const d = req.data || {}, t = (x, n) => s_(x).replace(/\\s+/g, ' ').trim().slice(0, n);
  const c = CacheService.getScriptCache(), k = hadirKunci(P, u.nama), now = new Date().toISOString();
  let lama = null; try { lama = JSON.parse(c.get(k) || 'null'); } catch (e) { }
  const segar = lama && Date.now() - Date.parse(lama.waktu) < HADIR_TTL * 1000;
  const r = { nama: u.nama, peran: u.admin ? 'ADMIN' : u.peran, jabatan: t(u.jabatan, 80), menu: t(d.menu, 80), tab: t(d.tab, 60), aktivitas: t(d.aktivitas, 200),
    aksi: t(d.aksi, 200) || (segar && lama.aksi) || '', aksiPada: d.aksi ? now : (segar && lama.aksiPada) || '', perangkat: t(d.perangkat, 60),
    status: d.status === 'diam' ? 'diam' : 'aktif', waktu: now, mulai: segar && lama.mulai ? lama.mulai : now };
  c.put(k, JSON.stringify(r), HADIR_TTL);
  return { ok: true, waktu: now };
}
function hadirDaftar(P, u) {
  if (!u.admin) throw new Error('Daftar pengguna online khusus Admin.');
  const U = semuaPengguna_().filter(x => x.aktif && x.peran !== 'SAP' && aksesProyek_(x, P)), c = CacheService.getScriptCache();
  const got = U.length ? c.getAll(U.map(x => hadirKunci(P, x.nama))) : {};
  const sh = ss_().getSheetByName(P + '_Log'), n = sh ? sh.getLastRow() : 0, m = Math.min(400, Math.max(0, n - 1));
  const log = m ? sh.getRange(n - m + 1, 1, m, 7).getValues() : [], akhir = {};
  for (let i = log.length - 1; i >= 0; i--) {
    const r = log[i], nm = s_(r[3]).trim().toLowerCase(); if (!nm) continue;
    const L = akhir[nm] = akhir[nm] || [];
    if (L.length < 3) L.push({ waktu: r[0] instanceof Date ? r[0].toISOString() : s_(r[0]), aksi: s_(r[5]), noKontrak: s_(r[2]), detail: s_(r[6]).slice(0, 160) });
  }
  const kini = Date.now();
  const data = U.map(x => {
    let h = null; try { h = JSON.parse(got[hadirKunci(P, x.nama)] || 'null'); } catch (e) { }
    const umur = h ? Math.max(0, Math.round((kini - Date.parse(h.waktu)) / 1000)) : null;
    return { nama: x.nama, peran: x.peran, jabatan: s_(x.jabatan), online: !!h && umur <= HADIR_ONLINE && h.status !== 'diam', diam: !!h && (umur > HADIR_ONLINE || h.status === 'diam'), umurDetik: umur, hadir: h, logTerakhir: akhir[s_(x.nama).trim().toLowerCase()] || [] };
  }).sort((a, b) => (b.online - a.online) || (b.diam - a.diam) || ((a.umurDetik === null) - (b.umurDetik === null)) || ((a.umurDetik || 0) - (b.umurDetik || 0)) || s_(a.nama).localeCompare(s_(b.nama)));
  return { ok: true, versiServer: VERSI_SERVER, waktu: new Date(kini).toISOString(), batasOnlineDetik: HADIR_ONLINE, ttlDetik: HADIR_TTL, data: data };
}
// 1.8.7: baca transaksi gudang PER HALAMAN""", 'Fungsi kehadiran (CacheService, baca Log saja).')
g("""  gudangBacaHal: (req, u, P) =>""",
  """  hadirDetak: (req, u, P) => hadirDetak(P, req, u),   // 1.8.8
  hadirDaftar: (req, u, P) => hadirDaftar(P, u),   // 1.8.8 (Admin)
  gudangBacaHal: (req, u, P) =>""", 'Aksi hadirDetak & hadirDaftar.')
g("""'gudangBaca', 'gudangBacaHal', 'identitasBaca',""", """'gudangBaca', 'gudangBacaHal', 'hadirDetak', 'hadirDaftar', 'identitasBaca',""", 'Kedua aksi = BACA (tanpa kunci tulis Sheets; boleh di pratinjau).')
g("""  fitur: ['gudangHalaman',""", """  fitur: ['kehadiran', 'gudangHalaman',""", 'Fitur baru diumumkan.')
CAT = ('Modul server 1.8.8 (kumulatif dari 1.8.7 … 1.0.0; kernel Code.gs 2.5.1, tanpa izin Google baru, tanpa perubahan data).\n'
  'BARU 1.8.8 — Kehadiran: Admin melihat siapa yang sedang online dan sedang mengerjakan apa (menu yang dibuka, aktivitas, aksi simpan terakhir, '
  '3 catatan Log terakhir). Status disimpan di CacheService (hilang sendiri setelah 15 menit) — tidak menulis Google Sheets. Pasangan aplikasi: Pembaruan 2.6.0.\n') + M['catatan']
H = dict(M, versi='1.8.8', tanggal='2026-10-20', catatan=CAT, kode=k)
json.dump(H, open(os.path.join(R, 'server-modul-1.8.8.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
json.dump({'format': 'monitoring-sap-modul-patch', 'dari': '1.8.7', 'ke': '1.8.8', 'sha256Sumber': sha(M['kode']), 'sha256Hasil': sha(k), 'operasi': OP}, open(os.path.join(R, 'server-modul-1.8.8.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK server-modul-1.8.8.json ·', len(OP), 'operasi')
