/* 1.10.15 — PO CANCEL / HOLD: pembatalan kontrak (SPM/SPK/PO) secara SOFT-DELETE beraudit (struktur sheet inti tidak berubah; tidak ada baris yang dihapus)
 * Berlaku per KELUARGA kontrak (kontrak awal + seluruh addendumnya, kunci = nomor kontrak awal lewat sbNomor): membatalkan kartu = membatalkan PO beserta addendumnya.
 * Melengkapi 1.10.13 (hapus + batal → arsip lalu hapus): di sini kontrak TIDAK dihapus dari Register; kartu tetap tampil berlabel PO CANCEL / HOLD.
 * Sheet BARU <ID>_KontrakStatus — 1 baris per kontrak awal (Master maupun Register):
 *   No Kontrak | Status (CANCELLED / HOLD / AKTIF) | Alasan | Diubah Oleh | Diubah Pada | DATA (JSON: + sumber, vendor, nilai, bonDilepas[], riwayat[] seluruh perubahan status)
 * Aksi: kontrakStatusBaca (semua peran, baca) · kontrakBatal {noKontrak, status, alasan} (Pengadaan/Admin) · kontrakPulih {noKontrak, alasan} (HOLD: Pengadaan/Admin; CANCELLED: Admin).
 * Aturan: alasan ≥ 12 karakter; CANCELLED ditolak bila kontrak sudah punya tagihan/BK atau penerimaan gudang aktif (gunakan HOLD);
 *   CANCELLED melepas item Bon Permintaan: alokasi Bon → kontrak dibatalkan (riwayat tetap), tautan No Bon item Register dicatat di bonDilepas
 *   (data kontrak tetap utuh; aplikasi tidak lagi menghitungnya sebagai "sudah dikontrakkan"). HOLD tidak melepas bon.
 * Kunci: selama CANCELLED/HOLD, simpan/ubah & posting kontrak Register serta tagihan (BK) baru untuk nomor itu ditolak server. */
const KS_COL = ['No Kontrak', 'Status', 'Alasan', 'Diubah Oleh', 'Diubah Pada', 'DATA'];
const KS_LABEL = { CANCELLED: 'PO CANCEL', HOLD: 'HOLD', AKTIF: 'AKTIF' };
function ksBaca(P) {
  const sh = ss_().getSheetByName(P + '_KontrakStatus'); if (!sh) return [];
  return baris_(sh).map(r => { try { return JSON.parse(s_(r[5])); } catch (e) { return null; } }).filter(Boolean);
}
const ksInduk = no => sbNomor(s_(no).trim()).induk;
const ksKunci = (P, no) => { const n = s_(no).trim(); if (!n) return null; const k = ksInduk(n), r = ksBaca(P).find(x => x.noKontrak === k); return r && (r.status === 'CANCELLED' || r.status === 'HOLD') ? r : null; };
function ksAktif(P, D) {   // kontrak PO CANCEL tidak lagi memakai volume Bon (dipakai sbPakai — sisa bon di server)
  let B = null; try { B = ksBaca(P).filter(x => x.status === 'CANCELLED').map(x => x.noKontrak); } catch (e) { }
  return B && B.length ? (D || []).filter(r => B.indexOf(ksInduk(r && r.noKontrak)) < 0) : D;
}
function ksTolak(P, no, apa) { const r = ksKunci(P, no); if (r) throw new Error('Kontrak ' + r.noKontrak + ' berstatus ' + KS_LABEL[r.status] + ' (' + s_(r.oleh) + ', ' + s_(r.pada).slice(0, 10) + '): ' + apa + ' dikunci. ' + (r.status === 'HOLD' ? 'Pulihkan kontrak lebih dahulu.' : 'Kontrak yang dibatalkan hanya dapat dipulihkan Admin.')); }
function ksTulis(P, rec) {
  const sh = sheet_(P + '_KontrakStatus', KS_COL), L = baris_(sh), i = L.findIndex(r => s_(r[0]) === rec.noKontrak);
  const vals = ["'" + rec.noKontrak, rec.status, rec.alasan, rec.oleh, rec.pada, JSON.stringify(rec)];
  if (i < 0) sh.appendRow(vals); else sh.getRange(i + 2, 1, 1, vals.length).setValues([vals]);
}
function ksUbah(P, x, u, now, pulih) {
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya Pengadaan atau Admin yang dapat membatalkan / menahan / memulihkan kontrak.');
  const diklik = s_(x.noKontrak).trim(); if (!diklik || diklik.length > 200) throw new Error('Nomor kontrak tidak valid.');
  const no = ksInduk(diklik);
  const status = pulih ? 'AKTIF' : s_(x.status).toUpperCase();
  if (['CANCELLED', 'HOLD', 'AKTIF'].indexOf(status) < 0) throw new Error('Status harus CANCELLED (PO Cancel) atau HOLD.');
  const alasan = s_(x.alasan).replace(/\s+/g, ' ').trim(); if (alasan.length < 12) throw new Error('Alasan / keterangan wajib diisi (min. 12 karakter) untuk jejak audit.');
  return gdKunciTulis(() => {
    const lama = ksBaca(P).find(r => r.noKontrak === no) || null, kini = lama ? lama.status : 'AKTIF';   // no = nomor kontrak awal (kunci keluarga)
    if (kini === status) throw new Error('Kontrak ' + no + ' sudah berstatus ' + KS_LABEL[status] + '. Muat ulang.');
    if (lama && x.versi !== undefined && Number(x.versi) !== Number(lama.versi)) throw new Error('KONFLIK: status kontrak sudah diubah oleh ' + s_(lama.oleh) + '. Muat ulang.');
    if (kini === 'CANCELLED' && !u.admin) throw new Error('Kontrak yang sudah PO CANCEL hanya dapat dipulihkan / diubah statusnya oleh Admin.');
    const kel = bacaKoleksi_(P, 'data').filter(r => ksInduk(r.noKontrak) === no).sort((a, b) => sbNomor(a.noKontrak).n - sbNomor(b.noKontrak).n), reg = kel[kel.length - 1] || null;   // rincian berlaku = addendum terakhir
    const rec = { noKontrak: no, status: status, alasan: alasan.slice(0, 500), oleh: u.nama, pada: now, versi: lama ? Number(lama.versi) + 1 : 1,
      nomorBerlaku: reg ? s_(reg.noKontrak) : diklik, keluarga: kel.map(r => s_(r.noKontrak)),
      sumber: reg ? 'REGISTER' : (s_(x.sumber).toUpperCase() === 'REGISTER' ? 'REGISTER' : 'MASTER'), idRegister: reg ? reg.id : '',
      namaVendor: s_(reg ? reg.namaVendor : x.namaVendor).slice(0, 200), nilai: Math.round(Number(reg ? reg.nilai : x.nilai) || 0),
      bonDilepas: lama && status !== 'CANCELLED' ? (lama.bonDilepas || []) : [],
      riwayat: (lama && Array.isArray(lama.riwayat) ? lama.riwayat : []).concat([{ dari: kini, ke: status, alasan: alasan.slice(0, 500), oleh: u.nama, pada: now }]).slice(-50) };
    let nAlok = 0;
    if (status === 'CANCELLED') {
      const tag = bacaKoleksi_(P, 'progres').filter(e => ksInduk(e.noKontrak) === no);
      if (tag.length) throw new Error('Kontrak ' + no + ' sudah memiliki ' + tag.length + ' tagihan/BK (' + tag.slice(0, 3).map(e => s_(e.nomorBA)).join(', ') + ') — tidak dapat PO CANCEL. Gunakan HOLD, atau selesaikan/batalkan tagihannya lebih dahulu.');
      const gr = gdBaca(P, 'masuk').filter(r => r.status === 'AKTIF' && s_(r.noKontrak) && ksInduk(r.noKontrak) === no);
      if (gr.length) throw new Error('Kontrak ' + no + ' sudah memiliki ' + gr.length + ' penerimaan gudang aktif — tidak dapat PO CANCEL. Gunakan HOLD atau batalkan penerimaannya lebih dahulu.');
      const lepas = [];   // item Bon yang dilepas kembali
      kel.forEach(rk => (rk.items || []).forEach((it, i) => { if (s_(it.noPermintaan).trim()) lepas.push({ cara: 'ITEM-REGISTER', noKontrak: s_(rk.noKontrak), bonNomor: s_(it.noPermintaan).trim(), baris: i + 1, kode: s_(it.kode), uraian: s_(it.uraian).slice(0, 120), vol: Number(it.vol) || 0, sat: s_(it.sat) }); }));
      if (typeof mp24Baca_ === 'function' && typeof mp24IsiAlokasi_ === 'function' && typeof mp24TulisBaris_ === 'function') {
        const AL = mp24Baca_(P, 'alokasi');
        AL.filter(a => !a.batal && ksInduk(a.noKontrak) === no).forEach(a => {
          const h = mp24IsiAlokasi_(AL, Object.assign({}, a, { batal: true, alasan: ('PO CANCEL ' + no + ': ' + alasan).slice(0, 300) }), u, now, P);
          mp24TulisBaris_(P, 'alokasi', h.rec, h.oldId); nAlok++;
          lepas.push({ cara: 'ALOKASI', idAlokasi: a.id, bonNomor: s_(a.bonNomor), baris: Number(a.bonIdx) + 1, vol: Number(a.volume) || 0, wbs: s_(a.wbs) });
        });
      }
      rec.bonDilepas = lepas;
    }
    ksTulis(P, rec);
    catat_(P, { id: reg ? reg.id : 'KONTRAK', noKontrak: no }, u, status === 'CANCELLED' ? 'PO CANCEL' : status === 'HOLD' ? 'PO HOLD' : 'PULIHKAN KONTRAK',
      KS_LABEL[kini] + ' → ' + KS_LABEL[status] + ' · ' + (rec.namaVendor || '-') + ' · nilai ' + rec.nilai + ' · alasan: ' + alasan.slice(0, 250)
      + (status === 'CANCELLED' ? ' · ' + rec.bonDilepas.length + ' item Bon dilepas (' + nAlok + ' alokasi dibatalkan) · data kontrak tetap tersimpan' : ''));
    return { ok: true, data: rec, alokasiDibatalkan: nAlok };
  });
}
(function () {
  const save0 = MODUL.aksi.save, posting0 = MODUL.aksi.posting;
  const noDari = (P, id) => { const r = id ? bacaKoleksi_(P, 'data').find(x => x.id === s_(id)) : null; return r ? r.noKontrak : ''; };
  MODUL.aksi.save = function (req, u, P) { const d = req.data || {}; ksTolak(P, d.id ? noDari(P, d.id) : d.noKontrak, d.id ? 'perubahan data kontrak' : 'pembuatan ulang nomor ini'); return save0.apply(this, arguments); };
  MODUL.aksi.posting = function (req, u, P) { ksTolak(P, noDari(P, req.id), 'posting'); return posting0.apply(this, arguments); };
  MODUL.aksi.saveProgres = function (req, u, P) { const d = req.data || {}; if (!d.id) ksTolak(P, d.noKontrak, 'tagihan / BK baru'); return undefined; };   // undefined → kernel berjalan utuh
  Object.assign(MODUL.aksi, {
    kontrakStatusBaca: (req, u, P) => ({ ok: true, versiServer: VERSI_SERVER, data: ksBaca(P) }),
    kontrakBatal: (req, u, P, now) => ksUbah(P, req.data || {}, u, now, false),
    kontrakPulih: (req, u, P, now) => ksUbah(P, req.data || {}, u, now, true)
  });
  MODUL.timpa.push('saveProgres');
  MODUL.fitur.push('kontrakBatal');
  MODUL.baca.push('kontrakStatusBaca');
})();
