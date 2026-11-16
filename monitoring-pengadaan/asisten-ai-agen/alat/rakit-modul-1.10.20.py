#!/usr/bin/env python3
"""Rakit server-modul-1.10.20.json dari server-modul-1.10.18.json (perbaikan di tempat; kumulatif).

  python3 alat/rakit-modul-1.10.20.py server-modul-1.10.18.json server-modul-1.10.20.json

1.10.20 — BANK DATA VENDOR GLOBAL + KOP RESMI DI IDENTITAS PELAKSANA
- Master Data › Vendor dan Arsip Dokumen Vendor dibaca dari SEMUA proyek (bukan hanya grup berbagi); vendor yang sama (kode SAP / nama)
  dilebur menjadi satu, isian kosong dilengkapi dari catatan proyek lain. Sheet, kolom dan data lama tidak diubah (tanpa migrasi).
- Berkas arsip vendor milik proyek lain boleh dibuka / dipasang ke checklist dari proyek mana pun.
- Identitas Pelaksana menyimpan isian kop: kopNama, kopTagline, kopDivisi, kopAlamat, kopProyek.
"""
import json, sys
from datetime import date
src, out = sys.argv[1], sys.argv[2]
p = json.load(open(src, encoding='utf-8'))
s = p['kode']
def ganti(lama, baru):
    global s
    n = s.count(lama)
    if n != 1: sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    s = s.replace(lama, baru)

ganti('/* MODUL SERVER 1.10.18 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.17) · ',
      '/* MODUL SERVER 1.10.20 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.18) · 1.10.20: Bank Data Vendor Global (Master Data › Vendor & Arsip Dokumen Vendor satu untuk semua proyek) · isian kop resmi di Identitas Pelaksana · ')

# ---------- a) Master Data › Vendor: global, dilebur per vendor ----------
ganti("""function pyMaster(P) {
  const peta = {};
  pyGrup(P).forEach(Q => mp24Baca_(Q, 'master').forEach(r => {
    const k = s_(r.jenis) + '|' + s_(r.kode).toLowerCase(), a = peta[k];
    if (!a || pyTerbaru(a, r)) peta[k] = Q === P ? r : Object.assign({}, r, { _proyek: Q });
  }));
  return Object.keys(peta).map(k => peta[k]);
}""", """/* 1.10.20 — BANK DATA VENDOR GLOBAL: Master Data › Vendor & Arsip Dokumen Vendor berlaku untuk SEMUA proyek (satu bank data).
 * Data tetap di sheet tiap proyek (tanpa migrasi, tidak ada yang dihapus); saat DIBACA seluruh proyek digabung, saat DIUBAH catatan ditulis ke
 * proyek yang sedang dibuka (salin-saat-ubah) dan versi terbaru tampil di semua proyek. Vendor yang sama dikenali dari Kode SAP, lalu nama
 * (PT / CV / tanda baca diabaikan); isian yang kosong pada catatan terbaru dilengkapi dari catatan proyek lain → data tidak lagi "hilang"
 * ketika berpindah proyek. Material & Service tetap mengikuti grup berbagi (PROYEK_BERBAGI). */
function gvProyek(P) {   // proyek ini lebih dahulu, lalu grup berbagi, lalu semua proyek lain
  const L = [s_(P)], tambah = id => { id = s_(id); if (id && L.indexOf(id) < 0) L.push(id); };
  pyGrup(P).forEach(tambah);
  try { semuaProyek_().forEach(p => tambah(p && p.id)); } catch (e) { }
  return L;
}
const gvNama = n => s_(n).toLowerCase().replace(/&/g, ' dan ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\\b(pt|cv|tbk|persero|ud|fa|firma|koperasi|perum|perseroan|terbatas)\\b/g, ' ').replace(/\\s+/g, '');
function gvDetail(r) { if (r && r.detail && typeof r.detail === 'object') return r.detail; try { const o = JSON.parse(s_(r && r.keterangan) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
function gvKunci(r) { const d = gvDetail(r), sap = s_(d.kodeSAP).trim(), n = gvNama(r.nama); return 'VENDOR|' + (sap ? 'S:' + sap.toLowerCase() : n ? 'N:' + n : 'K:' + s_(r.kode).toLowerCase()); }
function gvLebur(baru, lama) {   // catatan terbaru menang; isian kosongnya diisi dari catatan lain vendor yang sama
  const a = gvDetail(baru), b = gvDetail(lama), d = Object.assign({}, a); let ubah = false;
  Object.keys(b).forEach(k => { if (s_(d[k]) === '' && s_(b[k]) !== '') { d[k] = b[k]; ubah = true; } });
  if (!ubah) return baru;
  const o = Object.assign({}, baru); if (baru.detail && typeof baru.detail === 'object') o.detail = d; else o.keterangan = JSON.stringify(d);
  return o;
}
function pyMaster(P) {
  const peta = {}, G = pyGrup(P), nama = {}, sap = {};
  gvProyek(P).forEach(Q => {
    const grup = G.indexOf(Q) >= 0; let L = []; try { L = mp24Baca_(Q, 'master'); } catch (e) { L = []; }
    L.forEach(r => {
      const vendor = s_(r.jenis) === 'VENDOR'; if (!vendor && !grup) return;
      let k = s_(r.jenis) + '|' + s_(r.kode).toLowerCase();
      if (vendor) {   // satu vendor = satu catatan: kode SAP ↔ nama saling menaut
        const d = gvDetail(r), s = s_(d.kodeSAP).trim().toLowerCase(), n = gvNama(r.nama);
        k = (s && sap[s]) || (n && nama[n]) || gvKunci(r);
        if (s && !sap[s]) sap[s] = k; if (n && !nama[n]) nama[n] = k;
      }
      const c = Q === P ? r : Object.assign({}, r, { _proyek: Q }), a = peta[k];
      if (!a) peta[k] = c; else if (!vendor) { if (pyTerbaru(a, r)) peta[k] = c; }
      else peta[k] = pyTerbaru(a, r) ? gvLebur(c, a) : gvLebur(a, c);
    });
  });
  return Object.keys(peta).map(k => peta[k]);
}""")

# ---------- b) Arsip Dokumen Vendor: global ----------
ganti("""  pyGrup(P).forEach(Q => avBacaSatu(Q).forEach(r => { const a = peta[r.id]; if (!a || pyTerbaru(a, r)) peta[r.id] = Q === P ? r : Object.assign({}, r, { _proyek: Q }); }));
  return Object.keys(peta).map(k => peta[k]);
}""", """  gvProyek(P).forEach(Q => { let L = []; try { L = avBacaSatu(Q); } catch (e) { L = []; }   // 1.10.20: semua proyek (bank data vendor global)
    L.forEach(r => { const a = peta[r.id]; if (!a || pyTerbaru(a, r)) peta[r.id] = Q === P ? r : Object.assign({}, r, { _proyek: Q }); }); });
  return Object.keys(peta).map(k => peta[k]);
}
function gvBerkasArsip(P, id) { id = s_(id); return !!id && avBaca(P).some(r => r && r.file && (s_(r.file.idServer) === id || s_(r.file.id) === id)); }   // berkas ini dokumen arsip vendor?""")

# berkas arsip proyek lain: boleh dibuka dari proyek mana pun (dokumen vendor = data global); berkas lain tetap menurut grup & akses proyek
ganti("""  const id = s_(req.id); if (!id || pyGrup(P).length < 2) return undefined;""",
      """  const id = s_(req.id); if (!id || gvProyek(P).length < 2) return undefined;""")
ganti("""  const Q = pyGrup(P).slice(1).find(q => { const fq = pyFolderAda(q); return fq && par[fq.getId()]; });
  if (!Q || !rec || !aksesProyek_(rec, Q)) return undefined;""",
      """  const Q = gvProyek(P).slice(1).find(q => { const fq = pyFolderAda(q); return fq && par[fq.getId()]; });
  if (!Q || !rec) return undefined;
  const grupQ = pyGrup(P).indexOf(Q) >= 0 && aksesProyek_(rec, Q);
  if (!grupQ && !gvBerkasArsip(P, id)) return undefined;   // 1.10.20: di luar grup hanya dokumen arsip vendor""")
ganti("""  const items = (req.data || {}).items; if (!items || typeof items !== 'object' || pyGrup(P).length < 2) return undefined;
  const fP = folderProyek_(P), idP = fP.getId(), lain = pyGrup(P).slice(1).map(q => ({ q, f: pyFolderAda(q) })).filter(z => z.f);""",
      """  const items = (req.data || {}).items; if (!items || typeof items !== 'object' || gvProyek(P).length < 2) return undefined;
  const fP = folderProyek_(P), idP = fP.getId(), GR = pyGrup(P), lain = gvProyek(P).slice(1).map(q => ({ q, f: pyFolderAda(q), grup: GR.indexOf(q) >= 0 })).filter(z => z.f);""")
ganti("""    const z = lain.find(z => par.indexOf(z.f.getId()) >= 0); if (!z) return;
    const c = f.makeCopy(f.getName(), fP);""",
      """    const z = lain.find(z => par.indexOf(z.f.getId()) >= 0); if (!z) return;
    if (!z.grup && !gvBerkasArsip(P, f.getId())) return;   // 1.10.20: di luar grup hanya dokumen arsip vendor
    const c = f.makeCopy(f.getName(), fP);""")

# ---------- c) Identitas Pelaksana: isian kop resmi ----------
ganti("""  rec.alamat = t(x.alamat !== undefined ? x.alamat : lamaIp.alamat, 300);""",
      """  rec.alamat = t(x.alamat !== undefined ? x.alamat : lamaIp.alamat, 300);
  [['kopNama', 120], ['kopTagline', 80], ['kopDivisi', 80], ['kopAlamat', 300], ['kopProyek', 200]].forEach(k => { rec[k[0]] = t(x[k[0]] !== undefined ? x[k[0]] : lamaIp[k[0]], k[1]); });   // 1.10.20: kop resmi (klien lama tidak menghapus)""")

# ---------- d) fitur & ringkasan bank data ----------
ganti("""/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir""",
      """/* 1.10.20 — ringkasan Bank Data Vendor Global (baca saja): jumlah vendor & dokumen arsip per proyek asal */
(function () {
  MODUL.aksi.vendorGlobalInfo = function (req, u, P) {
    const per = {}, hit = (q, k) => { const o = per[q] || (per[q] = { proyek: q, vendor: 0, arsip: 0 }); o[k]++; };
    const M = pyMaster(P).filter(r => s_(r.jenis) === 'VENDOR'), A = avBaca(P);
    M.forEach(r => hit(r._proyek || P, 'vendor')); A.forEach(r => hit(r._proyek || P, 'arsip'));
    return { ok: true, versiServer: VERSI_SERVER, proyek: gvProyek(P), vendor: M.length, arsip: A.length, arsipAktif: A.filter(r => r.status === 'AKTIF').length, per: Object.keys(per).map(k => per[k]) };
  };
  MODUL.fitur.push('vendorGlobal', 'identitasKop');
  MODUL.baca.push('vendorGlobalInfo');
})();

/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir""")

catatan = ('1.10.20 — BANK DATA VENDOR GLOBAL · KOP RESMI DI IDENTITAS PELAKSANA: (1) Master Data › Vendor dan Arsip Dokumen Vendor kini SATU bank data untuk semua proyek: '
  'dibaca dari seluruh proyek (bukan hanya grup berbagi PROYEK_BERBAGI), vendor yang sama (Kode SAP / nama tanpa PT-CV-tanda baca) dilebur menjadi satu dan isian yang kosong dilengkapi dari catatan proyek lain. '
  'Perubahan ditulis ke proyek yang sedang dibuka (salin-saat-ubah) dan versi terbaru tampil di semua proyek. Berkas arsip vendor milik proyek lain dapat dibuka / dipasang ke checklist dari proyek mana pun. '
  'Material & Service tetap mengikuti grup berbagi. (2) Identitas Pelaksana menyimpan isian kop: kopNama, kopTagline, kopDivisi, kopAlamat, kopProyek. (3) Aksi baca vendorGlobalInfo. '
  'Sheet / kolom / data lama tidak diubah, tanpa migrasi. Fitur: vendorGlobal, identitasKop. Pasangan: Pembaruan 2.10.29. CATATAN: dirakit di atas 1.10.18.')
p.update(versi='1.10.20', kode=s, tanggal=date.today().isoformat(), catatan=catatan + '\n' + p['catatan'])
for k in ('diunggahOleh', 'diunggahPada'): p.pop(k, None)
json.dump(p, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('modul 1.10.18 → 1.10.20: %d karakter' % len(s))
