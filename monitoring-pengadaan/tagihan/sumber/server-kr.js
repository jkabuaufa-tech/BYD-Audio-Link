/* =====================================================================
 * 1.10.5 — KR. KOREKSI BK / TAGIHAN (BA sudah terbit) — Asisten Koreksi Tagihan (aplikasi 2.9.9, blok MP299)
 *  Kernel menolak revisi volume BK yang BA-nya sudah terbit. Aksi koreksiBK membuka koreksi RESMI & TERCATAT:
 *  - BK diperbarui (items, nilai), revisi +1, nomor BA TETAP, BA tetap terbit; riwayat sebelum → sesudah disimpan di BK (koreksi[])
 *    dan di sheet aditif <ID>_KoreksiTagihan (jejak audit per item).
 *  - Paket tagihan BK ikut dihitung ulang (blSimpan: revisi paket + dokumen lama ditandai Perlu Revisi). Gagal → BK dikembalikan.
 *  - Hak: Pengadaan untuk BK periode terakhir yang belum diajukan bayar; Admin untuk BK lama (ada BK sesudahnya) / paket
 *    Siap Diperiksa–Terverifikasi (Admin otomatis mengembalikan paket ke Revisi). Diajukan/Proses/Dibayar ditolak.
 *  - Kontrak Register: nilai BK dihitung ulang server dari harga Register (nilai dari perangkat diabaikan).
 *  - Volume s/d melebihi volume kontrak hanya dengan nomor addendum (dicatat). Opsional volKontrak {item: vol}: volume item Register
 *    diperbarui (addendum, nomor wajib) dalam transaksi yang sama — paket membaca volume baru; gagal → Register & BK dikembalikan.
 *  - Idempoten (kunciIdem) & versi (KONFLIK bila BK berubah sejak dibuka).
 * ===================================================================== */
const KR_COL = ['Waktu', 'ID', 'ID Progres', 'No Kontrak', 'Nomor BA', 'Tagihan Ke', 'Nilai Lama', 'Nilai Baru', 'Selisih', 'Item Berubah', 'Alasan', 'Dokumen Acuan', 'No Addendum', 'Oleh', 'Paket', 'DATA'];
function krBaca(P, progresId) {
  const sh = ss_().getSheetByName(P + '_KoreksiTagihan'); if (!sh) return [];
  return baris_(sh).filter(r => s_(r[1]) && (!progresId || s_(r[2]) === progresId)).map(r => { try { return JSON.parse(s_(r[15])); } catch (e) { return null; } }).filter(Boolean);
}
function koreksiBK(P, req, u, now) {
  if (u.peran !== 'PENGADAAN') throw new Error('Koreksi tagihan hanya untuk Pengadaan / Admin.');
  if (typeof MODUL_UJI_ !== 'undefined' && MODUL_UJI_) throw new Error('UJI MODUL SERVER (baca saja): koreksi tagihan tidak dapat disimpan.');
  const d = req.data || {}, kunci = blIdem(d.kunciIdem), L = bacaKoleksi_(P, 'progres'), i = L.findIndex(e => e.id === s_(d.id));
  if (i < 0) throw new Error('BK tidak ditemukan.');
  const lama = L[i];
  if (kunci && (lama.koreksi || []).some(k => k.kunciIdem === kunci)) return { ok: true, data: lama, sudahAda: true };
  if (Number(d.versi) !== Number(lama.versi)) throw new Error('KONFLIK: BK ' + lama.nomorBA + ' sudah diubah oleh ' + lama.diubahOleh + '. Muat ulang lalu ulangi koreksi.');
  const alasan = s_(d.alasan).trim(), acuan = s_(d.acuan).trim(), noAdd = s_(d.noAddendum).trim();
  if (alasan.length < 15) throw new Error('Alasan koreksi wajib (min. 15 karakter), mis. "BAPM 02 fisik: SPP Ø702 185.477,80 kg belum diinput".');
  if (acuan.length < 3) throw new Error('Dokumen acuan wajib diisi (mis. "BAPM 02 bertanda tangan 17/07/2026").');
  // status bayar & urutan BK
  const bayar = s_(lama.bayar && lama.bayar.status || 'BELUM').toUpperCase();
  if (['DIBAYAR', 'PROSES', 'PROSES PEMBAYARAN'].indexOf(bayar) >= 0) throw new Error('Tagihan ' + lama.nomorBA + ' sudah ' + bayar + '. Koreksi dilakukan lewat BA koreksi / penyesuaian pada termin berikutnya, bukan mengubah BA yang sudah dibayar.');
  if (bayar === 'DIAJUKAN') throw new Error('Tagihan ' + lama.nomorBA + ' sudah DIAJUKAN di Keuangan & Bayar. Kembalikan status bayar ke Belum/Ditunda terlebih dahulu (Keuangan & Bayar), lalu ulangi koreksi.');
  const kontrakSama = L.filter(e => e.noKontrak === lama.noKontrak), sesudah = kontrakSama.filter(e => e.id !== lama.id && Number(e.tagihanKe) > Number(lama.tagihanKe));
  if (sesudah.length && !u.admin) throw new Error('Sudah ada BK sesudahnya (' + sesudah.map(e => e.nomorBA).join(', ') + '). Koreksi BK lama mengubah "yang lalu" BK berikutnya — hanya Admin.');
  // volume baru
  const items = {}; Object.keys(d.items || {}).slice(0, 2000).forEach(k => {
    const v = Number(d.items[k]); if (!isFinite(v) || v < 0) throw new Error('Volume tidak valid untuk item ' + k + '.');
    if (v > 0) items[s_(k).slice(0, 200)] = Math.round(v * 10000) / 10000;
  });
  if (!Object.keys(items).length) throw new Error('Isi minimal satu volume.');
  let nilai = Math.round(Number(d.nilai) * 100) / 100;
  const D0 = bacaKoleksi_(P, 'data'), iReg = D0.findIndex(r => r.noKontrak === lama.noKontrak), regLama = iReg >= 0 ? D0[iReg] : null;
  let reg = regLama, addendum = [];
  // volume kontrak baru (addendum) — hanya kontrak Register; nomor addendum wajib
  const vk = d.volKontrak && typeof d.volKontrak === 'object' ? d.volKontrak : {};
  if (Object.keys(vk).length) {
    if (!regLama) throw new Error('Volume kontrak hanya dapat diubah untuk kontrak Register. Kontrak Master diperbaiki lewat Koreksi Data Kontrak.');
    if (noAdd.length < 3) throw new Error('Perubahan volume kontrak wajib nomor addendum.');
    reg = JSON.parse(JSON.stringify(regLama));
    Object.keys(vk).slice(0, 500).forEach(k => { const m = /#(\d+)$/.exec(k), it = m && k.indexOf(reg.noKontrak + '#') === 0 ? reg.items[Number(m[1])] : null, v = Number(vk[k]);
      if (!it) throw new Error('Item ' + k + ' tidak ada di Register kontrak ' + reg.noKontrak + '.');
      if (!isFinite(v) || v <= 0) throw new Error('Volume kontrak tidak valid untuk ' + s_(it.uraian).slice(0, 40) + '.');
      if (Math.abs(v - (Number(it.vol) || 0)) > 1e-9) { addendum.push({ item: k, uraian: s_(it.uraian).slice(0, 80), sebelum: Number(it.vol) || 0, sesudah: Math.round(v * 10000) / 10000 }); it.vol = Math.round(v * 10000) / 10000; } });
  }
  if (reg) {   // harga Register menang
    nilai = 0; Object.keys(items).forEach(k => { const m = /#(\d+)$/.exec(k), it = m && (reg.items || [])[Number(m[1])];
      if (!it || k.indexOf(reg.noKontrak + '#') !== 0) throw new Error('Item ' + k + ' tidak ada di Register kontrak ' + reg.noKontrak + '.');
      nilai += items[k] * (Number(it.harga) || 0); });
    nilai = Math.round(nilai * 100) / 100;
    // s/d ≤ volume kontrak, kecuali addendum
    const lebih = [];
    Object.keys(items).forEach(k => { const idx = Number(/#(\d+)$/.exec(k)[1]), vk = Number(reg.items[idx].vol) || 0;
      const sd = kontrakSama.filter(e => Number(e.tagihanKe) <= Number(lama.tagihanKe) && e.id !== lama.id).reduce((a, e) => a + (Number((e.items || {})[k]) || 0), 0) + items[k];
      if (vk > 0 && sd > vk + 1e-6) lebih.push(s_(reg.items[idx].uraian).slice(0, 40) + ' (s/d ' + sd + ' > ' + vk + ')'); });
    if (lebih.length && noAdd.length < 3) throw new Error('Volume s/d melebihi volume kontrak: ' + lebih.join('; ') + '. Isi nomor addendum, atau perbarui volume item di Register Kontrak terlebih dahulu.');
  }
  if (!(nilai > 0)) throw new Error('Nilai BK hasil koreksi Rp 0.');
  // paket tagihan BK
  const P2 = blBacaSemua(P), pk = P2.find(x => x.progresId === lama.id && x.status !== 'BATAL') || null;
  let ef = '';
  if (pk) {
    ef = BLI.statusEfektif(pk.status, blCek(P, pk));
    if (['DIAJUKAN', 'PROSES PEMBAYARAN', 'DIBAYAR'].indexOf(ef) >= 0) throw new Error('Paket ' + pk.id + ' berstatus ' + ef + '.');
    if (['SIAP DIPERIKSA', 'TERVERIFIKASI'].indexOf(ef) >= 0 && !u.admin) throw new Error('Paket ' + pk.id + ' berstatus ' + ef + '. Koreksi hanya oleh Admin (paket akan dikembalikan ke Revisi).');
  }
  // tulis BK
  const r = JSON.parse(JSON.stringify(lama)), ubah = [];
  const kunciSemua = [...new Set(Object.keys(lama.items || {}).concat(Object.keys(items)))];
  kunciSemua.forEach(k => { const a = Number((lama.items || {})[k]) || 0, b = items[k] || 0; if (Math.abs(a - b) > 1e-9) ubah.push({ item: k, sebelum: a, sesudah: b }); });
  if (!ubah.length && !addendum.length && Math.abs((Number(lama.nilai) || 0) - nilai) < 0.005) return { ok: true, data: lama, tidakBerubah: true };
  if (addendum.length) {   // Register diperbarui lebih dahulu (paket membaca item Register)
    Object.assign(reg, { nilai: nilaiReg_(reg.items), diubahOleh: u.nama, diubahPada: now, versi: Number(regLama.versi) + 1 });
    D0[iReg] = reg; tulisKoleksi_(P, 'data', D0);
    catat_(P, reg, u, 'ADDENDUM VOLUME', noAdd + ' · ' + addendum.map(a => a.uraian + ': ' + a.sebelum + ' → ' + a.sesudah).join('; ') + ' · nilai kontrak ' + regLama.nilai + ' → ' + reg.nilai + ' · koreksi BK ' + lama.nomorBA);
  }
  const no = (lama.koreksi || []).length + 1;
  Object.assign(r, { items, nilai, revisi: Number(lama.revisi || 0) + 1, alasan: 'KOREKSI ' + no + ': ' + alasan, diubahOleh: u.nama, diubahPada: now, versi: Number(lama.versi) + 1 });
  r.koreksi = (lama.koreksi || []).concat([{ no, oleh: u.nama, pada: now, alasan, acuan, noAddendum: noAdd, kunciIdem: kunci || '', nilaiSebelum: Number(lama.nilai) || 0, nilaiSesudah: nilai, ubah, addendum }]).slice(-30);
  L[i] = r; tulisKoleksi_(P, 'progres', L);
  // hitung ulang paket (gagal → BK dikembalikan)
  let paketBaru = null;
  if (pk) {
    try {
      let versi = pk.versi;
      if (['SIAP DIPERIKSA', 'TERVERIFIKASI'].indexOf(ef) >= 0) versi = blStatus(P, { data: { id: pk.id, versi, ke: 'REVISI', alasan: 'Koreksi BK ' + lama.nomorBA + ': ' + alasan } }, u, now).data.versi;
      const kirimSumber = d.sumber && Array.isArray(d.sumber.items) && d.sumber.items.length ? { sumber: d.sumber } : {};
      paketBaru = blSimpan(P, { data: Object.assign({ id: pk.id, versi, alasan: 'Koreksi BK ' + lama.nomorBA + ' (' + acuan + '): ' + alasan }, kirimSumber) }, u, now).data;
    } catch (e) {
      const L2 = bacaKoleksi_(P, 'progres'), j = L2.findIndex(x => x.id === lama.id); if (j >= 0) { L2[j] = lama; tulisKoleksi_(P, 'progres', L2); }
      if (addendum.length) { const D2 = bacaKoleksi_(P, 'data'), q = D2.findIndex(x => x.id === regLama.id); if (q >= 0) { D2[q] = regLama; tulisKoleksi_(P, 'data', D2); } }
      throw new Error('Koreksi dibatalkan (BK tidak diubah): paket tagihan ' + pk.id + ' gagal dihitung ulang — ' + e.message);
    }
  }
  const rec = { id: idBaru_('KR'), progresId: lama.id, noKontrak: lama.noKontrak, nomorBA: lama.nomorBA, tagihanKe: lama.tagihanKe, nilaiSebelum: Number(lama.nilai) || 0, nilaiSesudah: nilai,
    ubah, addendum, alasan, acuan, noAddendum: noAdd, oleh: u.nama, pada: now, paket: paketBaru ? { id: paketBaru.id, revisi: paketBaru.revisi, total: paketBaru.hasil.totalTagihan } : null, bkSesudah: sesudah.map(e => e.nomorBA) };
  sheet_(P + '_KoreksiTagihan', KR_COL).appendRow([now, rec.id, rec.progresId, rec.noKontrak, rec.nomorBA, rec.tagihanKe, rec.nilaiSebelum, rec.nilaiSesudah, rec.nilaiSesudah - rec.nilaiSebelum,
    (ubah.map(x => x.item + ': ' + x.sebelum + ' → ' + x.sesudah).join('; ') + (addendum.length ? ' | ADDENDUM vol. kontrak: ' + addendum.map(a => a.item + ': ' + a.sebelum + ' → ' + a.sesudah).join('; ') : '')).slice(0, 4000), alasan, acuan, noAdd, u.nama, rec.paket ? rec.paket.id + ' Rev.' + rec.paket.revisi : '-', JSON.stringify(rec).slice(0, 45000)]);
  catat_(P, r, u, 'KOREKSI BK', lama.nomorBA + ' · nilai ' + rec.nilaiSebelum + ' → ' + nilai + ' · ' + ubah.length + ' item · acuan: ' + acuan + ' · alasan: ' + alasan + (noAdd ? ' · addendum ' + noAdd : '') + (rec.paket ? ' · paket ' + rec.paket.id + ' Rev.' + rec.paket.revisi : ''));
  return { ok: true, data: r, paket: paketBaru, koreksi: rec, register: addendum.length ? reg : null };
}
(function () {
  Object.assign(MODUL.aksi, {
    koreksiBK: (req, u, P, now) => koreksiBK(P, req, u, now),
    koreksiBaca: (req, u, P) => ({ ok: true, data: krBaca(P, s_((req.data || {}).progresId)) })
  });
  MODUL.fitur.push('koreksiBK');
  MODUL.baca.push('koreksiBaca');
})();
