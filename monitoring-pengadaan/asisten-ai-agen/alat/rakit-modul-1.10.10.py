import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def ganti(lama, baru):
    global s
    n = s.count(lama)
    if n != 1: sys.exit('teks lama ditemukan %d kali: %s' % (n, lama[:80]))
    s = s.replace(lama, baru)

ganti('/* MODUL SERVER 1.10.9 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.8) · ',
      '/* MODUL SERVER 1.10.10 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.10.9) · 1.10.10: identitas KSO memuat NPWP & alamat (koreksi otomatis NPWP WASKITA - NINDYA, KSO …5820 → …5824), rekening vendor bersama (_RekeningVendor) untuk auto-fill SPM/PO & BAP · ')

# I. identitas: NPWP & alamat KSO di DATA JSON (kolom sheet tetap); koreksi NPWP lama saat baca & simpan
ganti("""  try { return JSON.parse(s_(r[5])); } catch (e) { return null; }
}""", """  try { return ipKoreksi(JSON.parse(s_(r[5]))); } catch (e) { return null; }
}
/* 1.10.10: NPWP KSO WASKITA - NINDYA yang keliru di templat lama → nomor resmi; NPWP disimpan sebagai 15/16 digit */
const IP_NPWP_SALAH = '1000000007845820', IP_NPWP_BENAR = '1000000007845824';
function ipNpwp(v) { const d = s_(v).replace(/\\D/g, ''); return d === IP_NPWP_SALAH ? IP_NPWP_BENAR : d; }
function ipKoreksi(rec) { if (rec && rec.npwp) rec.npwp = ipNpwp(rec.npwp); return rec; }""")

ganti("""    perusahaan: t(x.perusahaan, 120), unit: t(x.unit, 120), anggota: anggota, kodeSurat: t(x.kodeSurat, 60), diubahOleh: u.nama, diubahPada: now };""",
      """    perusahaan: t(x.perusahaan, 120), unit: t(x.unit, 120), anggota: anggota, kodeSurat: t(x.kodeSurat, 60), diubahOleh: u.nama, diubahPada: now };
  const lamaIp = ipBaca(P) || {};   // 1.10.10: klien lama (tanpa isian NPWP/alamat) tidak menghapus nilai tersimpan
  rec.npwp = ipNpwp(x.npwp !== undefined ? x.npwp : lamaIp.npwp);
  if (rec.npwp && (rec.npwp.length < 15 || rec.npwp.length > 16)) throw new Error('NPWP pelaksana harus 15/16 digit.');
  rec.alamat = t(x.alamat !== undefined ? x.alamat : lamaIp.alamat, 300);""")

# rekening vendor: dipasang sebelum pembatas Petugas Gudang
ganti("""/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir""", r"""/* 1.10.10 — REKENING VENDOR BERSAMA (sheet baru _RekeningVendor, lintas proyek; struktur sheet inti tidak berubah)
 * Kunci = Kode SAP / BP vendor (bila ada) atau nama vendor. Dibaca semua pengguna (auto-fill SPM/PO & BAP), diubah Admin / Pengadaan. */
(function () {
  const RV_COL = ['Kunci', 'Kode SAP', 'Nama Vendor', 'Bank', 'Nomor Rekening', 'Atas Nama', 'Diubah Oleh', 'Diubah Pada', 'DATA'];
  const kunciNama = n => s_(n).toUpperCase().replace(/[.,]/g, ' ').replace(/\b(PT|CV|UD|TBK|PERSERO)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const kunci = (id, nama) => s_(id).trim() ? 'ID:' + s_(id).trim() : 'NM:' + kunciNama(nama);
  function rvBaca() {
    const sh = ss_().getSheetByName('_RekeningVendor'); if (!sh) return [];
    return baris_(sh).map(r => { try { return JSON.parse(s_(r[8])); } catch (e) { return null; } }).filter(Boolean);
  }
  MODUL.aksi.rekVendorBaca = () => ({ ok: true, data: rvBaca() });
  MODUL.aksi.rekVendorSimpan = function (req, u, P, now) {
    if (!(u.admin || s_(u.peran).toUpperCase() === 'PENGADAAN')) throw new Error('Rekening vendor hanya dapat diubah Admin / Pengadaan.');
    const x = req.data || {}, t = (v, n) => s_(v).replace(/\s+/g, ' ').trim().slice(0, n);
    const id = t(x.kodeSAP, 40), nama = t(x.nama, 200); if (!id && !nama) throw new Error('Kode SAP atau nama vendor wajib diisi.');
    const noRek = s_(x.noRek).replace(/[^\d-]/g, '').slice(0, 40), bank = t(x.bank, 80), atasNama = t(x.atasNama, 200);
    if (noRek && noRek.replace(/\D/g, '').length < 6) throw new Error('Nomor rekening minimal 6 digit.');
    if (noRek && !bank) throw new Error('Nama bank wajib diisi bila nomor rekening diisi.');
    const k = kunci(id, nama), rec = { kunci: k, kodeSAP: id, nama: nama, bank: bank, noRek: noRek, atasNama: atasNama, diubahOleh: u.nama, diubahPada: now };
    return gdKunciTulis(() => {
      const sh = sheet_('_RekeningVendor', RV_COL), L = baris_(sh), i = L.findIndex(r => s_(r[0]) === k);
      const vals = [k, id, nama, bank, noRek, atasNama, u.nama, now, JSON.stringify(rec)];
      if (i < 0) sh.appendRow(vals); else sh.getRange(i + 2, 1, 1, vals.length).setValues([vals]);
      catat_(P, { id: 'REKENING-VENDOR', noKontrak: id || nama }, u, i < 0 ? 'TAMBAH REKENING VENDOR' : 'UBAH REKENING VENDOR', (nama || id) + ' · ' + (bank || '-') + ' · ' + (noRek ? '…' + noRek.slice(-4) : '-'));
      return { ok: true, data: rec };
    });
  };
  MODUL.fitur.push('rekeningVendor', 'identitasNpwp');
  MODUL.baca.push('rekVendorBaca');
})();

/* 1.10.1 — Petugas Gudang: pembatas aksi dipasang terakhir""")
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s))
