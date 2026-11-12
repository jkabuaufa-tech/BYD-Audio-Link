/* 1.10.16 — NOTIFIKASI HANYA KONTRAK AKTIF: ringkasan kontrak yang dikirim aplikasi (sheet <ID>_Notifikasi, kunci SNAP) disaring ulang di server
 * setiap kali notifikasi disusun (email / Telegram terjadwal, kirim manual, pratinjau, konteks Asisten AI), sehingga kontrak yang sudah
 * dibatalkan TIDAK menunggu aplikasi mengirim ringkasan baru:
 *   (a) keluarga kontrak berstatus PO CANCEL / HOLD (1.10.15, sheet <ID>_KontrakStatus);
 *   (b) kontrak Register yang sudah dihapus / dibatalkan dari Register (1.10.13: arsip lalu hapus);
 *   (c) kontrak yang sudah digantikan addendum terposting yang lebih baru (masa berlaku keluarga = addendum terakhir).
 * Butir ringkasan kini membawa nomor kontrak lengkap (no) & asal baris (reg) — Pembaruan 2.10.16; ringkasan lama (tanpa no) disaring dari
 * awalan judul "<no urut>/<jenis>/<tahun> · ". Tidak ada sheet, kolom, maupun data yang diubah; hanya penyaringan saat baca. */
const naPendek = no => { const p = s_(no).split('/'); return p.length >= 3 ? p[0] + '/' + p[1] + '/' + (p[p.length - 1].match(/^\d{4}/) || [p[p.length - 1]])[0] : s_(no); };   // = pendek() aplikasi
function naSaring(P) {
  let mati = [], reg = null;
  try { mati = ksBaca(P).filter(r => r.status === 'CANCELLED' || r.status === 'HOLD'); } catch (e) { mati = []; }
  try { reg = bacaKoleksi_(P, 'data'); } catch (e) { reg = null; }
  const indukMati = {}, awalan = [], adaReg = {}, maxAdd = {};
  mati.forEach(r => { indukMati[s_(r.noKontrak)] = 1;
    [r.noKontrak, r.nomorBerlaku].concat(r.keluarga || []).forEach(n => { const a = s_(n).trim() ? naPendek(s_(n).trim()) + ' · ' : ''; if (a && awalan.indexOf(a) < 0) awalan.push(a); }); });
  (reg || []).forEach(r => { const no = s_(r && r.noKontrak).trim(); if (!no) return; adaReg[no] = 1; const p = sbNomor(no); if (p.n === 0 || r.diposting) maxAdd[p.induk] = Math.max(maxAdd[p.induk] || 0, p.n); });
  return x => {
    const no = s_(x && x.no).trim();
    if (!no) return !awalan.some(a => s_(x && x.judul).indexOf(a) === 0);     // ringkasan lama (≤ 2.10.15)
    if (indukMati[ksInduk(no)]) return false;                                   // (a) PO CANCEL / HOLD
    if (x.reg && reg && !adaReg[no]) return false;                              // (b) sudah tidak ada di Register
    const p = sbNomor(no); return !((maxAdd[p.induk] || 0) > p.n);              // (c) digantikan addendum
  };
}
MODUL.fitur.push('notifKontrakAktif');
