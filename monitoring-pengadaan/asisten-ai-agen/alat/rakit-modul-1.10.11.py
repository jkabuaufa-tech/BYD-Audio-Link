#!/usr/bin/env python3
"""Rakit Modul server 1.10.11 dari 1.10.10 + blok sumber/modul-1.10.11-integritas-gudang.js + perbaikan di tempat.

  python3 alat/rakit-modul-1.10.11.py server-modul-1.10.10.json sumber/modul-1.10.11-integritas-gudang.js server-modul-1.10.11.json
"""
import json, sys
from datetime import date
src, blok, out = sys.argv[1:4]
p = json.load(open(src, encoding='utf-8'))
s = p['kode']
def ganti(lama, baru):
    global s
    n = s.count(lama)
    if n != 1: sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    s = s.replace(lama, baru)

ganti('/* MODUL SERVER 1.10.10 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.9) · ',
      '/* MODUL SERVER 1.10.11 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.10) · 1.10.11: integritas data gudang — audit & pembersihan duplikat migrasi vs penerimaan BAPM/Bon (gudangAudit, gudangBersihkan, gudangBersihkanUrung), Ubah Foto penerimaan (gudangUbahFoto), validasi anti entri ganda · ')

# D1. surat jalan: pembanding tanpa spasi/tanda baca/kapital ("SJ-001" = "sj 001")
ganti("if (aktif.some(r => s_(r.noSJ).toLowerCase() === noSJ.toLowerCase())) throw new Error('Surat jalan ' + noSJ + ' sudah dicatat untuk item bon ini.');",
      "if (aktif.some(r => gaSJ(r.noSJ) === gaSJ(noSJ))) throw new Error('Surat jalan ' + noSJ + ' sudah dicatat untuk item bon ini.');")
ganti("if (aktif.some(r => s_(r.noSJ).toLowerCase() === noSJ.toLowerCase())) throw new Error('Surat jalan ' + noSJ + ' sudah dicatat untuk bon ini. Satu surat jalan = satu kiriman.');",
      "if (aktif.some(r => gaSJ(r.noSJ) === gaSJ(noSJ))) throw new Error('Surat jalan ' + noSJ + ' sudah dicatat untuk bon ini. Satu surat jalan = satu kiriman.');")

# D2. pengeluaran identik (material + tanggal + qty + penerima + untuk) ditolak
ganti("""    const K = gdBaca(P, 'keluar').filter(r => r.status === 'AKTIF' && r.kunci === kunci);
    const cek = gdTimeline(M, K.concat([{ tanggal: tgl, qty: qty, dibuatPada: now }]));""",
      """    const K = gdBaca(P, 'keluar').filter(r => r.status === 'AKTIF' && r.kunci === kunci);
    if (K.some(r => gaIsi('keluar', r) === gaIsi('keluar', { kunci: kunci, tanggal: tgl, qty: qty, untuk: untuk, penerima: penerima })))   // 1.10.11: anti entri ganda
      throw new Error('Pengeluaran yang sama sudah tercatat (' + M[0].uraian + ' · ' + tgl + ' · ' + qty + ' ' + M[0].sat + ' · ' + penerima + '). Bila ini pengambilan kedua, bedakan isian "Untuk / lokasi pemakaian".');
    const cek = gdTimeline(M, K.concat([{ tanggal: tgl, qty: qty, dibuatPada: now }]));""")

# D3. impor migrasi: transaksi yang ISINYA sudah ada dilewati; material yang sudah diterima penuh lewat Bon/BAPM ditolak
ganti("""  const ada = new Set(M0.map(r => r.id).concat(K0.map(r => r.id))), lihat = new Set();
  const pilah = (L, j) => { const baru = []; let lewat = 0;
    L.forEach((x, i) => { const r = migRek(j, x, i, u, now, P);
      if (lihat.has(r.id)) throw new Error('ID ganda di file: ' + r.id); lihat.add(r.id);
      if (ada.has(r.id)) lewat++; else baru.push(r); });
    return { baru: baru, lewat: lewat }; };""",
      """  const ada = new Set(M0.map(r => r.id).concat(K0.map(r => r.id))), lihat = new Set();
  const isiAda = new Set(M0.filter(r => r.status === 'AKTIF').map(r => gaIsi('masuk', r)).concat(K0.filter(r => r.status === 'AKTIF').map(r => gaIsi('keluar', r)))); let isiSama = 0;   // 1.10.11
  const pilah = (L, j) => { const baru = []; let lewat = 0;
    L.forEach((x, i) => { const r = migRek(j, x, i, u, now, P);
      if (lihat.has(r.id)) throw new Error('ID ganda di file: ' + r.id); lihat.add(r.id);
      if (ada.has(r.id)) lewat++; else if (isiAda.has(gaIsi(j, r))) { lewat++; isiSama++; } else baru.push(r); });
    return { baru: baru, lewat: lewat }; };""")
ganti("""  const sum = L => bulat4_(L.reduce((a, r) => a + r.qty, 0));
  return { masuk: m.baru, keluar: k.baru, ringkas: { masukBaru: m.baru.length,""",
      """  const VB = gaVolBon(P).mat;   // 1.10.11: migrasi tidak boleh menggandakan penerimaan resmi Bon/BAPM
  [...new Set(m.baru.map(r => r.kunci))].forEach(kc => {
    const Mr = M0.filter(r => r.status === 'AKTIF' && r.kunci === kc && !gaMig(r)); if (!Mr.length || !(VB[kc] > 0)) return;
    const sumM = gaSum(MA.filter(r => r.kunci === kc && gaMig(r))), sumR = gaSum(Mr);
    if (sumM + sumR > VB[kc] + 1e-9 && sumM <= sumR + 1e-9) salah.push(Mr[0].uraian + ': sudah diterima lewat Bon/BAPM ' + sumR + ' ' + Mr[0].sat + ' (volume bon ' + VB[kc] + ') — impor migrasi ' + sumM + ' akan menggandakan penerimaan');
  });
  const sum = L => bulat4_(L.reduce((a, r) => a + r.qty, 0));
  return { masuk: m.baru, keluar: k.baru, ringkas: { isiSama: isiSama, masukBaru: m.baru.length,""")

# blok baru: dipasang sebelum pembatas Petugas Gudang (agar ikut dibatasi & GDP_BOLEH sempat ditambah)
ganti("/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir", open(blok, encoding='utf-8').read().rstrip('\n') + "\n\n/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir")

catatan = ("1.10.11 — INTEGRITAS DATA GUDANG & UBAH FOTO: gudangAudit (Pengadaan/Admin, baca saja) memeriksa seluruh material: penerimaan migrasi yang sudah tercatat lewat penerimaan resmi Bon/BAPM "
  "(Kartu Gudang & Laporan Harian terhitung ganda), penerimaan melebihi volume bon, GR otomatis belum bertanggal BAPM, transaksi identik. gudangBersihkan (Admin, ketik BERSIHKAN) menerapkan temuan terpilih "
  "secara atomik (saldo tidak boleh minus; baris tidak dihapus — status BATAL + jejak batch + Log); gudangBersihkanUrung mengembalikan satu batch. gudangUbahFoto mengganti foto penerimaan yang sudah tersimpan "
  "(alasan wajib, foto lama tetap di Drive, fotoRiwayat + Log). Pencegahan: surat jalan dibandingkan tanpa spasi/tanda baca, pengeluaran identik ditolak, impor migrasi melewati transaksi berisi sama & menolak "
  "material yang sudah diterima penuh lewat Bon/BAPM. Fitur: gudangAudit, gudangUbahFoto, gudangAntiGanda. Pasangan: Pembaruan 2.10.8.\n")
p.update(versi='1.10.11', kode=s, catatan=catatan + p['catatan'], tanggal=date.today().isoformat())
for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('ok', out, len(s))
