/* ---------- BL. PAKET TAGIHAN (Billing Generator terintegrasi) — modul 1.10.0 ----------
 * Monitoring SAP tetap sumber kebenaran: kontrak (Register/koreksi; item Master dari aplikasi), progres BK (<P>_Progres),
 * checklist (<P>_ChecklistTagihan) dan status bayar (field "bayar" BK). Modul ini hanya MENAMBAH:
 *   <P>_PaketTagihan       : paket tagihan per BK (perhitungan dihitung ulang di server dengan BLI, dokumen, status penyusunan)
 *   <P>_PaketTagihanVersi  : jejak versi (sebelum → sesudah, alasan) — hanya ditambah, tidak pernah ditimpa
 *   <P>_KonfigTagihan      : konfigurasi tagihan per kontrak (kategori, retensi, uang muka, PPN, PPh, sewa alat)
 * Sheet/kolom/data lama tidak diubah. Status Terverifikasi/Diajukan/Proses/Dibayar DIBACA dari checklist & Keuangan & Bayar,
 * tidak pernah ditulis oleh modul ini. Tanpa izin Google baru. */
const BL_COL = ['ID', 'No Kontrak', 'ID Progres', 'Kategori', 'Jenis', 'Tagihan Ke', 'Status', 'Nilai Tagihan', 'Total + PPN', 'Versi', 'Diubah Oleh', 'Diubah Pada', 'DATA1', 'DATA2', 'DATA3', 'DATA4', 'DATA5', 'DATA6'];
const BL_VCOL = ['Waktu', 'ID Paket', 'Versi', 'Oleh', 'Aksi', 'Alasan', 'Ringkas', 'DATA'];
const BL_KCOL = ['No Kontrak', 'Kategori', 'Versi', 'Diubah Oleh', 'Diubah Pada', 'DATA'];
const BL_POT = 45000, BL_NDATA = 6, BL_MAKS_UNGGAH = 25 * 1024 * 1024, BL_POTONG_UNGGAH = 2900000;
const blSh = (P, j) => sheet_(P + ({ p: '_PaketTagihan', v: '_PaketTagihanVersi', k: '_KonfigTagihan' }[j]), { p: BL_COL, v: BL_VCOL, k: BL_KCOL }[j]);
const blShAda = (P, j) => ss_().getSheetByName(P + ({ p: '_PaketTagihan', v: '_PaketTagihanVersi', k: '_KonfigTagihan' }[j]));
function blBacaSemua(P) {
  const sh = blShAda(P, 'p'); if (!sh) return [];
  return baris_(sh).filter(r => s_(r[0]).trim() && r[12]).map((r, i) => { const o = JSON.parse(r.slice(12, 12 + BL_NDATA).map(s_).join('')); o._baris = i + 2; return o; });
}
function blTulis(P, rec) {
  const r = Object.assign({}, rec); delete r._baris;
  const t = JSON.stringify(r); if (t.length > BL_POT * BL_NDATA) throw new Error('Data paket tagihan terlalu besar (' + Math.round(t.length / 1024) + ' KB). Kurangi lampiran timesheet / surat jalan.');
  const pot = []; for (let i = 0; i < BL_NDATA; i++) { const c = t.slice(i * BL_POT, (i + 1) * BL_POT); pot.push(c ? "'" + c : ''); }
  const vals = [r.id, r.noKontrak, r.progresId, r.kategori, r.jenis, r.tagihanKe, r.status, (r.hasil || {}).dasarTagihan || 0, (r.hasil || {}).totalTagihan || 0, r.versi, r.diubahOleh, r.diubahPada].concat(pot);
  const sh = blSh(P, 'p');
  if (rec._baris) sh.getRange(rec._baris, 1, 1, vals.length).setValues([vals]);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, vals.length).setValues([vals]);
}
function blVersiCatat(P, rec, u, now, aksi, alasan, sebelum) {
  const ring = h => h ? { prestasi: h.prestasi && h.prestasi.ini, dasar: h.dasarTagihan, ppn: h.ppn, total: h.totalTagihan, pph: h.pph && h.pph.nilai, neto: h.neto } : null;
  const data = { status: rec.status, revisi: rec.revisi, sebelum: sebelum ? { status: sebelum.status, revisi: sebelum.revisi, hasil: ring(sebelum.hasil), sidik: sebelum.sidik } : null, sesudah: { hasil: ring(rec.hasil), sidik: rec.sidik }, dokumen: (rec.dokumen || []).length };
  blSh(P, 'v').appendRow([now, rec.id, rec.versi, u.nama, aksi, s_(alasan).slice(0, 500), (sebelum ? s_(sebelum.status) + ' → ' : '') + s_(rec.status) + ' · Rev. ' + rec.revisi + ' · ' + ((rec.hasil || {}).totalTagihan || 0), JSON.stringify(data).slice(0, 45000)]);
}
function blVersiBaca(P, id) {
  const sh = blShAda(P, 'v'); if (!sh) return [];
  return baris_(sh).filter(r => s_(r[1]) === id).map(r => ({ waktu: r[0] instanceof Date ? r[0].toISOString() : s_(r[0]), versi: Number(r[2]) || 0, oleh: s_(r[3]), aksi: s_(r[4]), alasan: s_(r[5]), ringkas: s_(r[6]), data: (() => { try { return JSON.parse(s_(r[7])); } catch (e) { return null; } })() })).reverse().slice(0, 100);
}

/* ---------- konfigurasi per kontrak ---------- */
function blKonfigSemua(P) { const sh = blShAda(P, 'k'); return sh ? baris_(sh).filter(r => s_(r[0]).trim() && r[5]).map((r, i) => Object.assign(JSON.parse(s_(r[5])), { _baris: i + 2 })) : []; }
function blKonfigDefault(P) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('BL_KONFIG_DEF_' + P) || 'null'); } catch (e) { return null; } }
function blKonfig(P, noK) {
  const k = blKonfigSemua(P).find(x => x.noKontrak === noK);
  if (k) return k;
  const d = blKonfigDefault(P) || {};
  return Object.assign({ noKontrak: noK, versi: 0, bawaan: true }, BLI.konfigBersih(Object.assign({}, d, { kategori: BLI.kategoriDariNomor(noK) || d.kategori })));
}

/* ---------- bantu ---------- */
const blCkPeta = P => { const o = {}; cl217Baca_(P).forEach(c => { o[c.id] = c; }); return o; };
const blBoleh = u => { if (u.peran !== 'PENGADAAN') throw new Error('Akun Lihat hanya dapat membaca paket tagihan.'); if (typeof MODUL_UJI_ !== 'undefined' && MODUL_UJI_) throw new Error('UJI MODUL SERVER (baca saja): paket tagihan tidak dapat diubah / diunggah.'); };
const blIdem = k => { k = s_(k).trim(); if (k && !/^[A-Za-z0-9_.:-]{8,80}$/.test(k)) throw new Error('Kunci idempotensi tidak valid.'); return k; };
function blCari(L, id) { const r = L.find(x => x.id === id); if (!r) throw new Error('Paket tagihan tidak ditemukan.'); return r; }
function blCek(P, rec, prog, ckPeta) {   // keadaan terkini dari Monitoring SAP (ckPeta: checklist sudah dibaca sekali untuk banyak paket)
  const e = prog || bacaKoleksi_(P, 'progres').find(x => x.id === rec.progresId) || null;
  const c = ckPeta ? (ckPeta[rec.progresId] || null) : cl217Cari_(P, rec.progresId).rec; let hit = null; try { hit = c && c.kategori ? cl217Hitung_(c) : null; } catch (err) { hit = null; }
  const bayar = s_(e && e.bayar && e.bayar.status || 'BELUM').toUpperCase();
  return { progres: e, checklist: c, hitung: hit, bayar, checklistVerified: !!(c && c.verified && hit && hit.lengkap === hit.total), checklistLengkap: !!(hit && hit.lengkap === hit.total), galat: BLI.adaGalat((rec.hasil || {}).temuan) || BLI.adaGalat(rec.temuanServer) };
}
function blRingkas(rec, ck) {
  const h = rec.hasil || {};
  return { id: rec.id, noKontrak: rec.noKontrak, namaVendor: (rec.sumber && rec.sumber.kontrak && rec.sumber.kontrak.namaVendor) || '', progresId: rec.progresId, nomorBA: rec.nomorBA, kategori: rec.kategori, jenis: rec.jenis, tagihanKe: rec.tagihanKe, periode: rec.periode,
    status: rec.status, statusEfektif: BLI.statusEfektif(rec.status, ck), bayar: ck.bayar, checklist: ck.hitung ? { lengkap: ck.hitung.lengkap, total: ck.hitung.total, verified: ck.checklistVerified } : null, revisi: rec.revisi, versi: rec.versi,
    nilaiKontrak: h.nilaiKontrak || 0, prestasi: h.prestasi || null, persenSd: (h.persen || {}).sd || 0, dasarTagihan: h.dasarTagihan || 0, dpp: h.dpp || 0, ppn: h.ppn || 0, totalTagihan: h.totalTagihan || 0, pph: (h.pph || {}).nilai || 0, neto: h.neto || 0,
    galat: ((h.temuan || []).concat(rec.temuanServer || [])).filter(t => t.tingkat === 'GALAT').length, peringatan: ((h.temuan || []).concat(rec.temuanServer || [])).filter(t => t.tingkat === 'PERINGATAN').length,
    dokumen: (rec.dokumen || []).filter(d => !d.diganti).map(d => ({ kode: d.kode, status: d.status })), dibuatOleh: rec.dibuatOleh, dibuatPada: rec.dibuatPada, diubahOleh: rec.diubahOleh, diubahPada: rec.diubahPada, diajukanPada: rec.siapPada || '' };
}

/* ---------- inti simpan: susun sumber, hitung ulang di server, kontrol ---------- */
function blSusun(P, d, L, lama, u) {
  const progres = bacaKoleksi_(P, 'progres'), noK = s_(d.noKontrak || (lama && lama.noKontrak)).trim();
  if (!noK) throw new Error('Nomor kontrak wajib.');
  const terkait = [...new Set([noK].concat(Array.isArray(d.nomorTerkait) ? d.nomorTerkait.map(s_) : (lama && lama.nomorTerkait) || []).map(x => x.trim()).filter(Boolean))].slice(0, 20);
  const pid = s_(d.progresId || (lama && lama.progresId)), e = progres.find(x => x.id === pid);
  if (!e) throw new Error('Data progres (BK) tagihan tidak ditemukan. Simpan BK di Input Progres terlebih dahulu.');
  if (terkait.indexOf(s_(e.noKontrak)) < 0) throw new Error('BK ' + s_(e.nomorBA || pid) + ' bukan milik kontrak ' + noK + '.');
  const entri = progres.filter(x => terkait.indexOf(s_(x.noKontrak)) >= 0);
  const temuanServer = [];
  // item kontrak: Register (server) menang; Master tertanam dipakai dari aplikasi (dicatat asalnya)
  const sk = d.sumber || (lama && lama.sumber) || {}, kon = Object.assign({}, sk.kontrak || {}, { noKontrak: noK });
  let items = (sk.items || []).slice(0, 2000).map(i => ({ id: s_(i.id).slice(0, 200), kode: s_(i.kode).slice(0, 40), uraian: s_(i.uraian).slice(0, 400), sat: s_(i.sat).slice(0, 30), vol: Number(i.vol) || 0, harga: Number(i.harga) || 0, wbs: s_(i.wbs).slice(0, 80), judul: !!i.judul }));
  const reg = bacaKoleksi_(P, 'data').find(r => r.noKontrak === noK);
  if (reg) {
    const regItems = (reg.items || []).map((it, idx) => ({ id: noK + '#' + idx, kode: s_(it.kode), uraian: s_(it.uraian), sat: s_(it.sat), vol: Number(it.vol) || 0, harga: Number(it.harga) || 0, wbs: s_(it.wbs) }));
    const beda = regItems.length !== items.length || regItems.some((r, i) => !items[i] || items[i].id !== r.id || Math.abs(items[i].vol - r.vol) > 1e-6 || Math.abs(items[i].harga - r.harga) > 1e-6);
    if (beda && items.length) temuanServer.push({ tingkat: 'INFO', kode: 'ITEM_REGISTER', pesan: 'Item kontrak diambil dari Register Kontrak di server (berbeda dengan data di perangkat).' });
    items = regItems; kon.asal = 'REGISTER'; kon.nilai = Number(kon.nilai) > 0 ? Number(kon.nilai) : (reg.nilai || 0);
    ['namaVendor', 'idVendor', 'noPO', 'noPR', 'noRFQ', 'jenisKontrak', 'tglKontrak', 'tglSelesai'].forEach(k => { if (reg[k] && !kon[k]) kon[k] = reg[k]; });
  } else { kon.asal = 'MASTER'; if (!items.length) throw new Error('Item kontrak kosong.'); }
  const dasar = {}; Object.keys(sk.dasar || {}).slice(0, 2000).forEach(k => { const v = Number(sk.dasar[k]); if (v > 0) dasar[s_(k)] = v; });
  const vol = BLI.volumeDariProgres(entri, pid, dasar);
  if (vol.sesudah.length) temuanServer.push({ tingkat: 'PERINGATAN', kode: 'BK_BUKAN_TERAKHIR', pesan: 'Sudah ada ' + vol.sesudah.length + ' BK sesudah BK ini; pastikan urutan termin benar.' });
  const jenis = BLI.JENIS_TAGIHAN.indexOf(s_(d.jenis || (lama && lama.jenis)).toUpperCase()) >= 0 ? s_(d.jenis || lama.jenis).toUpperCase() : 'PROGRES';
  const kf = blKonfig(P, noK), konfig = BLI.konfigBersih(kf);
  const kategori = konfig.kategori || BLI.kategoriDariNomor(noK);
  if (!kategori) throw new Error('Kategori kontrak (Bahan/Alat/Subkon) belum dapat ditentukan. Atur di Konfigurasi Tagihan.');
  // riwayat termin sebelumnya (paket aktif kontrak yang sama)
  const lain = L.filter(x => x.noKontrak === noK && x.status !== 'BATAL' && (!lama || x.id !== lama.id));
  const sebelum = lain.filter(x => Number(x.tagihanKe) < Number(e.tagihanKe));
  const riwayat = { umKembaliSebelum: sebelum.reduce((a, x) => a + ((x.hasil && x.hasil.uangMuka && x.hasil.uangMuka.potong) || 0), 0),
    retensiSebelum: sebelum.reduce((a, x) => a + (x.hasil ? (x.jenis === 'RETENSI' ? -x.hasil.dasarTagihan : (x.hasil.retensi || {}).nilai || 0) : 0), 0) };
  // kontrol ganda
  const ganda = lain.find(x => x.progresId === pid);
  if (ganda) throw new Error('BK ' + s_(e.nomorBA || pid) + ' sudah memiliki paket tagihan ' + ganda.id + ' (' + ganda.status + '). Satu progres hanya boleh ditagih satu kali.');
  const gandaKe = lain.find(x => Number(x.tagihanKe) === Number(e.tagihanKe));
  if (gandaKe) throw new Error('Tagihan ke-' + e.tagihanKe + ' kontrak ini sudah ada di paket ' + gandaKe.id + '.');
  // lampiran: penerimaan gudang (surat jalan) — satu penerimaan hanya di satu paket
  const lp = d.lampiran || (lama && lama.lampiran) || {}, grIds = [...new Set((lp.grIds || []).map(s_))].slice(0, 500);
  let sj = [];
  if (grIds.length) {
    const pakai = {}; lain.forEach(x => ((x.lampiran || {}).grIds || []).forEach(g => { pakai[g] = x.id; }));
    const dobel = grIds.filter(g => pakai[g]); if (dobel.length) throw new Error('Penerimaan gudang ' + dobel.slice(0, 5).join(', ') + ' sudah dipakai di paket ' + pakai[dobel[0]] + ' (tagihan ganda atas surat jalan yang sama).');
    const gr = gdBaca(P, 'masuk').filter(g => g.status === 'AKTIF'), peta = {}; gr.forEach(g => { peta[g.id] = g; });
    const hilang = grIds.filter(g => !peta[g]); if (hilang.length) throw new Error('Penerimaan gudang tidak ditemukan / dibatalkan: ' + hilang.slice(0, 5).join(', ') + '.');
    sj = grIds.map(g => { const x = peta[g]; return { id: x.id, tanggal: x.tanggal, noSJ: x.noSJ, kode: x.kode, uraian: x.uraian, sat: x.sat, qty: x.qty, bonNomor: x.bonNomor }; });
  }
  const ts = (Array.isArray(lp.ts) ? lp.ts : []).slice(0, 60).map(x => ({ itemId: s_(x.itemId), unit: s_(x.unit).slice(0, 60), operator: s_(x.operator).slice(0, 60), baris: (x.baris || []).slice(0, 62).map(b => ({ tgl: s_(b.tgl).slice(0, 10), mulai: s_(b.mulai).slice(0, 5), selesai: s_(b.selesai).slice(0, 5), istirahat: Number(b.istirahat) || 0, jam: b.jam === '' || b.jam === undefined || b.jam === null ? '' : Number(b.jam) || 0, ket: s_(b.ket).slice(0, 80) })) }));
  const pb = Object.assign({}, (d.pembanding || (lama && lama.pembanding) || {}));
  ['invoice', 'faktur', 'kwitansi', 'spktv'].forEach(k => { if (pb[k] && typeof pb[k] !== 'object') delete pb[k]; });
  const hasil = BLI.hitung({ jenis, kontrak: kon, items, progres: vol, konfig, riwayat, faktur: pb.faktur || null, nilaiRetensiDilepas: d.nilaiRetensiDilepas !== undefined ? d.nilaiRetensiDilepas : lama && lama.nilaiRetensiDilepas });
  const banding = BLI.bandingkan(hasil, Object.assign({}, pb, { bk: jenis === 'PROGRES' ? { nilai: e.nilai } : null }));
  if (jenis !== 'PROGRES' && Math.abs((Number(e.nilai) || 0) - hasil.dasarTagihan) > 1) banding.push({ tingkat: 'PERINGATAN', kode: 'BEDA_BK_NILAI', pesan: 'Nilai BK ' + BLI.rupiah(e.nilai) + ' ≠ nilai tagihan ' + BLI.rupiah(hasil.dasarTagihan) + '.' });
  const tsR = ts.length ? BLI.rekapTimesheet(ts, items, konfig) : null;
  if (tsR) { const vp = {}; tsR.item.forEach(x => { if (x.volTerukur) vp[x.itemId] = x.vol; }); [].push.apply(temuanServer, tsR.temuan.concat(BLI.cocokkanVolume('TS', 'Timesheet', vp, vol.ini, items))); }
  let sjVol = null;
  if (sj.length) { const r = BLI.rekapSuratJalan(sj, items); sjVol = r.vol; [].push.apply(temuanServer, BLI.cocokkanVolume('SJ', 'Surat jalan', r.vol, vol.ini, items)); if (r.tidakCocok.length) temuanServer.push({ tingkat: 'PERINGATAN', kode: 'SJ_ITEM', pesan: r.tidakCocok.length + ' penerimaan gudang tidak cocok dengan item kontrak.' }); }
  const ck = cl217Cari_(P, pid).rec;
  if (ck && ck.kategori && ck.kategori !== kategori) temuanServer.push({ tingkat: 'PERINGATAN', kode: 'KATEGORI_BEDA', pesan: 'Kategori checklist BK (' + ck.kategori + ') berbeda dengan kategori tagihan (' + kategori + '). Admin dapat mengubah kategori checklist di Checklist Tagihan (dengan alasan).' });
  [].push.apply(temuanServer, banding);
  const vendor = d.vendor || (lama && lama.vendor) || {};
  return {
    noKontrak: noK, nomorTerkait: terkait, progresId: pid, nomorBA: s_(e.nomorBA), kodeBA: s_(e.kodeBA), tagihanKe: Number(e.tagihanKe) || 0, periode: s_(e.periode), tanggalBK: s_(e.tanggal),
    kategori, jenis, sumber: { kontrak: kon, items, dasar, sidik: BLI.sidik({ k: kon, i: items }) }, konfig, konfigVersi: kf.versi || 0, riwayatSebelum: riwayat,
    lampiran: { grIds, sj, sjVol, ts, tsRekap: tsR }, pembanding: pb, nilaiRetensiDilepas: d.nilaiRetensiDilepas !== undefined ? Number(d.nilaiRetensiDilepas) || 0 : (lama && lama.nilaiRetensiDilepas) || 0,
    vendor: { nama: s_(vendor.nama || kon.namaVendor).slice(0, 160), alamat: s_(vendor.alamat).slice(0, 300), npwp: s_(vendor.npwp).slice(0, 30), ttdNama: s_(vendor.ttdNama).slice(0, 120), ttdJabatan: s_(vendor.ttdJabatan).slice(0, 80) },
    tanggalDok: tglValid_(d.tanggalDok !== undefined ? d.tanggalDok : (lama && lama.tanggalDok) || s_(e.tanggal)) || '',
    hasil, temuanServer, sidik: BLI.sidikHitung(hasil)
  };
}
function blIdemCari(L, k) { return k ? L.find(x => (x.kunciIdem || []).indexOf(k) >= 0) : null; }
function blIdemTambah(rec, k) { if (k) rec.kunciIdem = (rec.kunciIdem || []).concat([k]).slice(-30); }

function blSimpan(P, req, u, now) {
  blBoleh(u); const d = req.data || {}, k = blIdem(d.kunciIdem), L = blBacaSemua(P);
  const ada = blIdemCari(L, k); if (ada) return { ok: true, data: ada, sudahAda: true };
  if (!d.id) {
    const isi = blSusun(P, d, L, null, u);
    const rec = Object.assign({ id: idBaru_('BL'), status: 'DRAFT', revisi: 0, versi: 1, dokumen: [], dibuatOleh: u.nama, dibuatPada: now, diubahOleh: u.nama, diubahPada: now }, isi);
    blIdemTambah(rec, k); blTulis(P, rec); blVersiCatat(P, rec, u, now, 'BUAT PAKET', '', null);
    catat_(P, { id: rec.id, noKontrak: rec.noKontrak }, u, 'BUAT PAKET TAGIHAN', rec.kategori + ' · ' + rec.jenis + ' · tagihan ke-' + rec.tagihanKe + ' · BK ' + rec.nomorBA + ' · total ' + rec.hasil.totalTagihan);
    return { ok: true, data: rec };
  }
  const lama = blCari(L, s_(d.id));
  if (Number(d.versi) !== Number(lama.versi)) throw new Error('KONFLIK: paket ini sudah diubah oleh ' + lama.diubahOleh + ' (versi ' + lama.versi + '). Muat ulang dulu.');
  const ck = blCek(P, lama), ef = BLI.statusEfektif(lama.status, ck);
  if (BLI.TERKUNCI.indexOf(ef) >= 0) throw new Error('Paket berstatus ' + ef + ' — tidak dapat diubah.' + (ef === 'TERVERIFIKASI' ? ' Admin dapat mengembalikannya ke Revisi terlebih dahulu.' : ''));
  const isi = blSusun(P, d, L, lama, u), rec = Object.assign({}, lama, isi);
  let alasan = '';
  if (isi.sidik !== lama.sidik) {
    if (['MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', 'REVISI'].indexOf(lama.status) >= 0 || (lama.dokumen || []).some(x => !x.diganti)) {
      rec.revisi = (Number(lama.revisi) || 0) + 1; alasan = s_(d.alasan).trim();
      if (alasan.length < 8) throw new Error('Perhitungan berubah setelah dokumen diterbitkan: alasan revisi wajib (min. 8 karakter).');
      rec.dokumen = (lama.dokumen || []).map(x => x.diganti || x.sidikHitung === isi.sidik ? x : Object.assign({}, x, { diganti: true, status: x.jenisFile === 'GENERATED' ? 'PERLU_REVISI' : x.status, catatan: 'Perhitungan berubah (Rev. ' + rec.revisi + '): ' + alasan }));
      if (lama.status !== 'DRAFT') rec.status = 'DALAM PENYUSUNAN';
    }
  }
  Object.assign(rec, { versi: Number(lama.versi) + 1, diubahOleh: u.nama, diubahPada: now }); blIdemTambah(rec, k);
  blTulis(P, rec); blVersiCatat(P, rec, u, now, isi.sidik !== lama.sidik ? 'UBAH PERHITUNGAN' : 'UBAH DATA', alasan, lama);
  catat_(P, { id: rec.id, noKontrak: rec.noKontrak }, u, 'UBAH PAKET TAGIHAN', 'v' + rec.versi + ' · Rev. ' + rec.revisi + (alasan ? ' · alasan: ' + alasan : '') + ' · total ' + lama.hasil.totalTagihan + ' → ' + rec.hasil.totalTagihan);
  return { ok: true, data: rec };
}

function blStatus(P, req, u, now) {
  const d = req.data || {}, k = blIdem(d.kunciIdem), L = blBacaSemua(P), rec = blCari(L, s_(d.id));
  if (k && (rec.kunciIdem || []).indexOf(k) >= 0) return { ok: true, data: rec, sudahAda: true };
  if (Number(d.versi) !== Number(rec.versi)) throw new Error('KONFLIK: paket ini sudah diubah oleh ' + rec.diubahOleh + '. Muat ulang dulu.');
  const ke = s_(d.ke).toUpperCase(), alasan = s_(d.alasan).trim();
  if (BLI.STATUS_SIMPAN.indexOf(ke) < 0) throw new Error('Status tujuan tidak dikenal. Terverifikasi, Diajukan, Proses Pembayaran & Dibayar mengikuti Checklist Tagihan dan Keuangan & Bayar di Monitoring SAP.');
  const ck = blCek(P, rec), g = BLI.transisiBoleh(rec.status, ke, u, ck);
  if (g) throw new Error(g);
  if ((ke === 'REVISI' || ke === 'BATAL') && alasan.length < 12) throw new Error('Alasan ' + (ke === 'REVISI' ? 'revisi' : 'pembatalan') + ' minimal 12 karakter.');
  const lama = JSON.parse(JSON.stringify(rec)); delete lama._baris;
  rec.status = ke; if (ke === 'SIAP DIPERIKSA') { rec.siapPada = now; rec.siapOleh = u.nama; }
  if (ke === 'REVISI') rec.catatanRevisi = { oleh: u.nama, pada: now, alasan };
  if (ke === 'BATAL') rec.batal = { oleh: u.nama, pada: now, alasan };
  Object.assign(rec, { versi: Number(rec.versi) + 1, diubahOleh: u.nama, diubahPada: now }); blIdemTambah(rec, k);
  blTulis(P, rec); blVersiCatat(P, rec, u, now, 'STATUS ' + ke, alasan, lama);
  catat_(P, { id: rec.id, noKontrak: rec.noKontrak }, u, 'STATUS PAKET TAGIHAN', lama.status + ' → ' + ke + (alasan ? ' · ' + alasan : ''));
  return { ok: true, data: rec };
}

/* ---------- dokumen paket ---------- */
const BL_DOK_ST = ['DRAFT', 'MENUNGGU_TTD', 'DIUNGGAH', 'PERLU_REVISI', 'TERVERIFIKASI'];
function blFileValid(P, f) {
  const ref = cl217RefValid_(P, f);   // file PDF di folder proyek, ≤ 10 MB (sama dengan aturan checklist)
  const m = mfBaca(P).filter(x => x.id === ref.idServer).pop();
  return Object.assign(ref, { sha256: m ? m.sha256 : s_(f.sha256).slice(0, 64) });
}
function blDokumen(P, req, u, now) {
  blBoleh(u); const d = req.data || {}, k = blIdem(d.kunciIdem), L = blBacaSemua(P), rec = blCari(L, s_(d.id));
  if (k && (rec.kunciIdem || []).indexOf(k) >= 0) return { ok: true, data: rec, sudahAda: true };
  if (Number(d.versi) !== Number(rec.versi)) throw new Error('KONFLIK: paket ini sudah diubah oleh ' + rec.diubahOleh + '. Muat ulang dulu.');
  const ck = blCek(P, rec), ef = BLI.statusEfektif(rec.status, ck), x = d.dok || {}, aksiD = s_(x.aksi).toUpperCase();
  const kodeOk = BLI.DOKUMEN[rec.kategori].map(z => z[0]).concat(['BUNDEL', 'BAPSA', 'LAIN']);
  const kode = s_(x.kode).toUpperCase(); if (kodeOk.indexOf(kode) < 0) throw new Error('Jenis dokumen tidak dikenal untuk kategori ' + rec.kategori + ': ' + kode);
  const dok = (rec.dokumen = rec.dokumen || []);
  let catatan = '';
  if (aksiD === 'TERBIT' || aksiD === 'UNGGAH_TTD' || aksiD === 'VENDOR') {
    if (['DIBAYAR', 'BATAL'].indexOf(ef) >= 0) throw new Error('Paket ' + ef + ': dokumen tidak dapat ditambahkan.');
    if (aksiD === 'TERBIT') {
      if (BLI.adaGalat(rec.hasil.temuan)) throw new Error('Perhitungan masih memiliki GALAT; PDF tidak dapat diterbitkan.');
      if (s_(x.sidikHitung) !== rec.sidik) throw new Error('PDF dibuat dari perhitungan lama (sidik ' + s_(x.sidikHitung) + ' ≠ ' + rec.sidik + '). Muat ulang paket lalu buat ulang PDF.');
    }
    const f = kode === 'BUNDEL' ? Object.assign(refBerkas_(x.file) || {}, { sha256: s_(x.file && x.file.sha256).slice(0, 64) }) : blFileValid(P, x.file);
    if (!f || !f.idServer) throw new Error('Berkas PDF tidak valid.');
    dok.forEach(z => { if (!z.diganti && z.kode === kode && z.jenisFile === ({ TERBIT: 'GENERATED', UNGGAH_TTD: 'SIGNED', VENDOR: 'VENDOR' }[aksiD])) z.diganti = true; });
    const item = { documentId: idBaru_('DOC'), kode, nomor: s_(x.nomor).slice(0, 160), revisi: rec.revisi, jenisFile: { TERBIT: 'GENERATED', UNGGAH_TTD: 'SIGNED', VENDOR: 'VENDOR' }[aksiD],
      status: aksiD === 'TERBIT' ? (['INVOICE', 'KWITANSI', 'CHECKLIST', 'BUNDEL'].indexOf(kode) >= 0 || /^REKAP|SEWA|PAKAI/.test(kode) ? 'DRAFT' : 'MENUNGGU_TTD') : 'DIUNGGAH',
      file: f, halaman: Number(x.halaman) || 0, sidikHitung: aksiD === 'TERBIT' ? rec.sidik : '', checklistK: (BLI.DOKUMEN[rec.kategori].find(z => z[0] === kode) || [])[2] || '', oleh: u.nama, pada: now, catatan: s_(x.catatan).slice(0, 300) };
    if (aksiD === 'VENDOR') {   // nilai pada dokumen resmi vendor → kontrol silang
      const nl = x.nilai || {}, pb = rec.pembanding = rec.pembanding || {}, map = { INVOICE: 'invoice', KWITANSI: 'kwitansi' }[kode];
      if (map) pb[map] = { hargaJual: nl.hargaJual, ppn: nl.ppn, total: nl.total, nomor: s_(x.nomor) };
      if (nl.fakturDpp !== undefined) pb.faktur = { dpp: nl.fakturDpp, ppn: nl.fakturPpn, nomor: s_(nl.fakturNomor) };
      const b = BLI.bandingkan(rec.hasil, pb); item.temuan = b; rec.temuanServer = (rec.temuanServer || []).filter(t => !/^BEDA_(INVOICE|KWITANSI|FAKTUR)/.test(t.kode)).concat(b);
    }
    dok.push(item); catatan = item.kode + ' ' + item.jenisFile + ' · ' + f.nama + (f.sha256 ? ' · SHA-256 ' + f.sha256.slice(0, 16) + '…' : '');
    if (rec.status === 'DRAFT' && aksiD === 'TERBIT') rec.status = 'DALAM PENYUSUNAN';
  } else if (aksiD === 'STATUS') {
    const z = dok.find(q => q.documentId === s_(x.documentId)); if (!z) throw new Error('Dokumen tidak ditemukan.');
    const st = s_(x.status).toUpperCase(); if (BL_DOK_ST.indexOf(st) < 0) throw new Error('Status dokumen tidak dikenal.');
    if ((st === 'TERVERIFIKASI' || st === 'PERLU_REVISI') && !u.admin) throw new Error('Hanya Admin yang dapat menandai dokumen Terverifikasi / Perlu revisi.');
    if (st === 'TERVERIFIKASI' && z.jenisFile === 'GENERATED' && z.status !== 'DIUNGGAH') throw new Error('Draf hasil generator tidak dapat diverifikasi; unggah dokumen bertanda tangan.');
    if (st === 'PERLU_REVISI' && s_(x.alasan).trim().length < 8) throw new Error('Alasan perlu revisi minimal 8 karakter.');
    catatan = z.kode + ': ' + z.status + ' → ' + st + (x.alasan ? ' · ' + s_(x.alasan).slice(0, 200) : ''); z.status = st; z.catatan = s_(x.alasan).slice(0, 300) || z.catatan; z.statusOleh = u.nama; z.statusPada = now;
  } else throw new Error('Aksi dokumen tidak dikenal.');
  Object.assign(rec, { versi: Number(rec.versi) + 1, diubahOleh: u.nama, diubahPada: now }); blIdemTambah(rec, k);
  blTulis(P, rec); blVersiCatat(P, rec, u, now, 'DOKUMEN ' + aksiD, catatan, null);
  catat_(P, { id: rec.id, noKontrak: rec.noKontrak }, u, 'DOKUMEN PAKET TAGIHAN', catatan);
  return { ok: true, data: rec };
}

// pasang dokumen bertanda tangan / dokumen vendor ke Checklist Tagihan (aksi pengguna; verifikasi tetap oleh Admin di Monitoring SAP)
function blKeChecklist(P, req, u, now) {
  blBoleh(u); const d = req.data || {}, L = blBacaSemua(P), rec = blCari(L, s_(d.id));
  const c = cl217Cari_(P, rec.progresId).rec || cl217Dasar_(cl217Tagihan_(P, rec.progresId));
  if (!c.kategori) throw new Error('Kategori checklist BK belum ditetapkan.');
  const tpl = cl217Template_(c.kategori), items = JSON.parse(JSON.stringify(c.items || {})), ubah = [];
  (d.pasang || []).slice(0, 40).forEach(p => {
    const z = (rec.dokumen || []).find(q => q.documentId === s_(p.documentId) && !q.diganti); if (!z) throw new Error('Dokumen paket tidak ditemukan / sudah diganti.');
    if (z.jenisFile === 'GENERATED') throw new Error(z.kode + ': draf hasil generator tidak boleh dipasang ke checklist. Unggah dokumen yang sudah ditandatangani / dokumen resmi vendor.');
    const kk = s_(p.k || z.checklistK); if (!tpl.some(t => t.k === kk)) throw new Error('Baris checklist ' + kk + ' tidak ada pada kategori ' + c.kategori + '.');
    items[kk] = { status: 'ADA', tgl: s_(p.tgl || now.slice(0, 10)), ket: s_('Paket ' + rec.id + ' · ' + z.kode + ' ' + (z.nomor || '')).slice(0, 350), file: Object.assign({ id: z.file.id || z.file.idServer }, z.file, { lokasi: 'server' }) };
    ubah.push(kk + '=' + z.kode);
  });
  (d.na || []).slice(0, 40).forEach(n => {
    const kk = s_(n.k), al = s_(n.alasan).trim(); if (!tpl.some(t => t.k === kk)) throw new Error('Baris checklist ' + kk + ' tidak dikenal.');
    if (al.length < 12) throw new Error('Alasan Tidak Berlaku minimal 12 karakter (' + kk + ').');
    if (items[kk] && items[kk].status === 'ADA') return;   // dokumen yang sudah ada tidak ditimpa saran N/A
    items[kk] = { status: 'NA', tgl: '', ket: 'Konfirmasi pengguna dari paket ' + rec.id, alasan: al.slice(0, 350), file: null }; ubah.push(kk + '=NA');
  });
  if (!ubah.length) return { ok: true, tidakBerubah: true };
  const req2 = { action: 'checklistSimpan', data: { id: rec.progresId, versi: c.versi, items, pengajuan: c.pengajuan, divisi: c.divisi } };
  let r = aksi.checklistSimpan(req2, u, P, now); if (r === undefined) r = cl217Aksi_(req2, u, P, now);
  catat_(P, { id: rec.id, noKontrak: rec.noKontrak }, u, 'PAKET → CHECKLIST', ubah.join('; '));
  return Object.assign({ ok: true }, r && typeof r === 'object' ? { checklist: r.data || r } : {});
}

/* ---------- unggah PDF bertahap (potongan ≤ ~2,9 MB base64, SHA-256 diverifikasi, idempoten) ---------- */
const blUpKunci = id => 'BLUP_' + id;
function blUpMeta(id) { const t = PropertiesService.getScriptProperties().getProperty(blUpKunci(id)); if (!t) throw new Error('Sesi unggah tidak ditemukan atau kedaluwarsa. Ulangi unggah.'); return JSON.parse(t); }
function blUpTulis(m) { PropertiesService.getScriptProperties().setProperty(blUpKunci(m.id), JSON.stringify(m)); }
function blFolderSementara() { const akar = folderBerkas_(), it = akar.getFoldersByName('_Unggah Sementara Tagihan'); return it.hasNext() ? it.next() : akar.createFolder('_Unggah Sementara Tagihan'); }
function blUnggahMulai(P, req, u, now) {
  blBoleh(u); const d = req.data || {}, uk = Number(d.ukuran) || 0, sha = s_(d.sha256).toLowerCase(), n = parseInt(d.bagian, 10);
  if (!(uk > 0) || uk > BL_MAKS_UNGGAH) throw new Error('Ukuran PDF harus 1 byte – 25 MB (PDF untuk checklist maks. 10 MB).');
  if (!/^[0-9a-f]{64}$/.test(sha)) throw new Error('Sidik SHA-256 berkas tidak valid.');
  if (!(n >= 1 && n <= 40)) throw new Error('Jumlah bagian unggah tidak valid.');
  const id = idBaru_('UP'), m = { id, P, oleh: u.nama, pada: now, nama: s_(d.nama).replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'dokumen.pdf', jenis: s_(d.jenis).slice(0, 60), ket: s_(d.ket).slice(0, 200), ukuran: uk, sha256: sha, bagian: n, potong: {} };
  blUpTulis(m); return { ok: true, uploadId: id, potongMaks: BL_POTONG_UNGGAH };
}
function blUnggahPotong(P, req, u) {
  blBoleh(u); const d = req.data || {}, m = blUpMeta(s_(d.uploadId)), ke = parseInt(d.ke, 10), data = s_(d.data);
  if (m.P !== P || m.oleh !== u.nama) throw new Error('Sesi unggah milik pengguna/proyek lain.');
  if (m.selesai) return { ok: true, selesai: true };
  if (!(ke >= 1 && ke <= m.bagian)) throw new Error('Nomor bagian tidak valid.');
  if (!data || data.length > BL_POTONG_UNGGAH || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error('Isi potongan tidak valid (base64, maks. ' + BL_POTONG_UNGGAH + ' karakter).');
  const f = blFolderSementara().createFile(Utilities.newBlob(data, 'text/plain', m.id + '-' + ke + '.b64'));
  const lama = m.potong[ke]; m.potong[ke] = f.getId(); blUpTulis(m);
  if (lama) { try { DriveApp.getFileById(lama).setTrashed(true); } catch (e) { } }
  return { ok: true, ke, diterima: Object.keys(m.potong).length };
}
function blUnggahSelesai(P, req, u, now) {
  blBoleh(u); const d = req.data || {}, m = blUpMeta(s_(d.uploadId));
  if (m.P !== P || m.oleh !== u.nama) throw new Error('Sesi unggah milik pengguna/proyek lain.');
  if (m.selesai) return Object.assign({ ok: true, sudahAda: true }, m.selesai);
  const kurang = []; for (let i = 1; i <= m.bagian; i++) if (!m.potong[i]) kurang.push(i);
  if (kurang.length) throw new Error('Bagian belum diterima: ' + kurang.join(', ') + '. Kirim ulang bagian tersebut.');
  const b64 = []; for (let i = 1; i <= m.bagian; i++) b64.push(DriveApp.getFileById(m.potong[i]).getBlob().getDataAsString());
  const bytes = Utilities.base64Decode(b64.join(''));
  if (bytes.length !== m.ukuran) throw new Error('Ukuran hasil gabung ' + bytes.length + ' ≠ ' + m.ukuran + ' byte. Ulangi unggah.');
  if (String.fromCharCode.apply(null, bytes.slice(0, 5).map(x => x & 255)) !== '%PDF-') throw new Error('Isi berkas bukan PDF yang valid.');
  const h = hex(bytes); if (h !== m.sha256) throw new Error('Sidik SHA-256 tidak cocok (berkas rusak saat dikirim). Ulangi unggah.');
  const f = folderProyek_(P).createFile(Utilities.newBlob(bytes, 'application/pdf', [m.jenis, m.ket, m.nama].filter(Boolean).join(' · ').slice(0, 200)));
  try { f.setDescription('Diunggah ' + u.nama + ' · ' + now + ' · paket tagihan · SHA-256 ' + h); } catch (e) { }
  mfCatat(P, f, bytes, u, now, m.jenis || 'TAGIHAN', m.ket, 'paket-tagihan');
  catat_(P, { id: 'BERKAS', noKontrak: m.ket }, u, 'UNGGAH PDF TAGIHAN', m.jenis + ' · ' + m.nama + ' · ' + Math.round(bytes.length / 1024) + ' KB · ' + m.bagian + ' bagian · SHA-256 ' + h.slice(0, 16) + '…');
  const hasil = { file: { id: f.getId(), idServer: f.getId(), nama: m.nama, ukuran: bytes.length, jenis: m.jenis, ket: m.ket, lokasi: 'server', url: f.getUrl(), sha256: h, oleh: u.nama, pada: now } };
  Object.keys(m.potong).forEach(k => { try { DriveApp.getFileById(m.potong[k]).setTrashed(true); } catch (e) { } });
  m.selesai = hasil; m.potong = {}; blUpTulis(m);
  return Object.assign({ ok: true }, hasil);
}

/* ---------- baca ---------- */
function blKonteks(P, req, u) {
  const d = req.data || {}, noK = s_(d.noKontrak).trim(); if (!noK) throw new Error('Nomor kontrak wajib.');
  const terkait = [...new Set([noK].concat((d.nomorTerkait || []).map(s_)))];
  const progres = bacaKoleksi_(P, 'progres').filter(x => terkait.indexOf(s_(x.noKontrak)) >= 0).sort(BLI.urutEntri);
  const L = blBacaSemua(P).filter(x => terkait.indexOf(x.noKontrak) >= 0);
  const reg = bacaKoleksi_(P, 'data').find(r => r.noKontrak === noK) || null, kf = blKonfig(P, noK), kat = kf.kategori || BLI.kategoriDariNomor(noK);
  const bon = new Set((d.bon || []).map(s_)), kode = new Set((d.kode || []).map(x => s_(x).trim()).filter(Boolean)), pakai = {};
  L.filter(x => x.status !== 'BATAL').forEach(x => ((x.lampiran || {}).grIds || []).forEach(g => { pakai[g] = x.id; }));
  const gr = (kat === 'BAHAN' && (bon.size || kode.size)) ? gdBaca(P, 'masuk').filter(g => g.status === 'AKTIF' && (bon.has(s_(g.bonNomor)) || kode.has(s_(g.kode).trim()))).map(g => ({ id: g.id, tanggal: g.tanggal, noSJ: g.noSJ, kode: g.kode, uraian: g.uraian, sat: g.sat, qty: g.qty, bonNomor: g.bonNomor, dipakai: pakai[g.id] || '' })) : [];
  let arsip = []; try { const idV = s_(d.idVendor || (reg && reg.idVendor)), nmV = s_(d.namaVendor || (reg && reg.namaVendor)).toLowerCase(); arsip = avBaca(P).filter(a => a.status !== 'CABUT' && ((idV && s_(a.kodeVendor) === idV) || (nmV && s_(a.namaVendor).toLowerCase() === nmV))).map(a => ({ id: a.id, jenis: a.jenis, noDok: a.noDok, berlakuSd: a.berlakuSd, status: a.status, file: a.file || null })); } catch (e) { }
  const ckp = blCkPeta(P), semuaProg = {}; bacaKoleksi_(P, 'progres').forEach(e => { semuaProg[e.id] = e; });
  const prog = progres.map(e => { const c = ckp[e.id] || null; let h = null; try { h = c && c.kategori ? cl217Hitung_(c) : null; } catch (er) { } const pk = L.find(x => x.progresId === e.id && x.status !== 'BATAL');
    return { id: e.id, noKontrak: e.noKontrak, tagihanKe: e.tagihanKe, nomorBA: e.nomorBA, kodeBA: e.kodeBA, periode: e.periode, periodeKey: e.periodeKey, tanggal: e.tanggal, nilai: e.nilai, items: e.items, baTerbit: e.baTerbit, revisi: e.revisi, dibuatPada: e.dibuatPada,
      bayar: s_(e.bayar && e.bayar.status || 'BELUM'), checklist: h ? { kategori: c.kategori, lengkap: h.lengkap, total: h.total, verified: !!c.verified } : null, paket: pk ? { id: pk.id, status: pk.status } : null }; });
  return { ok: true, kontrak: noK, kategori: kat, konfig: kf, register: reg ? { noKontrak: reg.noKontrak, namaVendor: reg.namaVendor, idVendor: reg.idVendor, nilai: reg.nilai, items: reg.items, diposting: reg.diposting, noPO: reg.noPO, noPR: reg.noPR, tglKontrak: reg.tglKontrak, tglSelesai: reg.tglSelesai, jenisKontrak: reg.jenisKontrak } : null,
    progres: prog, paket: L.map(x => blRingkas(x, blCek(P, x, semuaProg[x.progresId] || null, ckp))), gudang: gr, arsip, template: CL217_TEMPLATES[kat] || [], syarat: null };
}
function blDaftar(P, req, u) {
  const d = req.data || {}, cari = s_(d.cari).toLowerCase().trim(), progres = bacaKoleksi_(P, 'progres'), pk = {}; progres.forEach(e => { pk[e.id] = e; });
  const ckp = blCkPeta(P);
  let L = blBacaSemua(P).map(r => blRingkas(r, blCek(P, r, pk[r.progresId] || null, ckp)));
  if (d.noKontrak) L = L.filter(x => x.noKontrak === s_(d.noKontrak));
  if (d.kategori) L = L.filter(x => x.kategori === s_(d.kategori).toUpperCase());
  if (d.status) L = L.filter(x => x.statusEfektif === s_(d.status).toUpperCase());
  if (cari) L = L.filter(x => (x.id + ' ' + x.noKontrak + ' ' + x.namaVendor + ' ' + x.nomorBA).toLowerCase().indexOf(cari) >= 0);
  L.sort((a, b) => s_(b.diubahPada).localeCompare(s_(a.diubahPada)));
  const per = Math.min(Math.max(parseInt(d.per, 10) || 50, 1), 1000), hal = Math.max(parseInt(d.hal, 10) || 1, 1);
  return { ok: true, total: L.length, hal, per, data: L.slice((hal - 1) * per, hal * per), waktu: new Date().toISOString() };
}
function blBaca(P, req) {
  const L = blBacaSemua(P), rec = blCari(L, s_(req.id || (req.data || {}).id)), ck = blCek(P, rec); delete rec._baris;
  const syarat = BLI.syaratKondisional(rec.kategori, { items: rec.sumber.items, uangMuka: rec.hasil.uangMuka.total, persenSd: rec.hasil.persen.sd, jenis: rec.jenis });
  return { ok: true, data: rec, efektif: BLI.statusEfektif(rec.status, ck), bayar: ck.bayar, progres: ck.progres, checklist: ck.checklist, checklistHitung: ck.hitung, template: CL217_TEMPLATES[(ck.checklist && ck.checklist.kategori) || rec.kategori] || [], syarat, riwayat: blVersiBaca(P, rec.id) };
}
function blKonfigSimpan(P, req, u, now) {
  blBoleh(u); const d = req.data || {};
  if (d.proyek) {   // bawaan proyek (Admin)
    if (!u.admin) throw new Error('Konfigurasi bawaan proyek khusus Admin.');
    const k = BLI.konfigBersih(d.konfig); delete k.sewa; k.kategori = '';
    PropertiesService.getScriptProperties().setProperty('BL_KONFIG_DEF_' + P, JSON.stringify(k));
    catat_(P, { id: 'KONFIG-TAGIHAN', noKontrak: '-' }, u, 'KONFIG TAGIHAN BAWAAN', 'PPN ' + k.ppn.skema + ' ' + k.ppn.tarif + '% · dipungut ' + k.ppn.dipungut + ' · PPh ' + k.pph.jenis + ' ' + k.pph.tarif + '%');
    return { ok: true, data: k };
  }
  const noK = s_(d.noKontrak).trim(); if (!noK) throw new Error('Nomor kontrak wajib.');
  const L = blKonfigSemua(P), lama = L.find(x => x.noKontrak === noK);
  if (Number(d.versi || 0) !== Number(lama ? lama.versi : 0)) throw new Error('KONFLIK: konfigurasi tagihan kontrak ini sudah diubah oleh ' + (lama && lama.diubahOleh) + '. Muat ulang dulu.');
  const lanjut = blBacaSemua(P).filter(x => x.noKontrak === noK && x.status !== 'BATAL' && BLI.statusEfektif(x.status, blCek(P, x)) !== 'DRAFT' && x.status !== 'DALAM PENYUSUNAN' && x.status !== 'REVISI');
  if (lanjut.length && !u.admin) throw new Error('Sudah ada paket tagihan yang diterbitkan/diperiksa untuk kontrak ini (' + lanjut.map(x => x.id).join(', ') + '). Perubahan konfigurasi hanya oleh Admin.');
  const k = BLI.konfigBersih(d.konfig), alasan = s_(d.alasan).trim();
  if (lama && alasan.length < 8) throw new Error('Alasan perubahan konfigurasi minimal 8 karakter.');
  const rec = Object.assign({}, k, { noKontrak: noK, versi: (lama ? Number(lama.versi) : 0) + 1, diubahOleh: u.nama, diubahPada: now, riwayat: ((lama && lama.riwayat) || []).concat([{ oleh: u.nama, pada: now, alasan, sebelum: lama ? { kategori: lama.kategori, retensiPersen: lama.retensiPersen, uangMukaPersen: lama.uangMukaPersen, uangMukaNilai: lama.uangMukaNilai, ppn: lama.ppn, pph: lama.pph } : null }]).slice(-20) });
  const vals = [noK, rec.kategori, rec.versi, u.nama, now, JSON.stringify(rec)];
  const sh = blSh(P, 'k'); if (lama) sh.getRange(lama._baris, 1, 1, vals.length).setValues([vals]); else sh.appendRow(vals);
  catat_(P, { id: 'KONFIG-TAGIHAN', noKontrak: noK }, u, 'KONFIG TAGIHAN', rec.kategori + ' · retensi ' + rec.retensiPersen + '% · UM ' + (rec.uangMukaNilai || rec.uangMukaPersen + '%') + ' · PPN ' + rec.ppn.skema + ' ' + rec.ppn.tarif + '% · PPh ' + rec.pph.tarif + '%' + (alasan ? ' · ' + alasan : ''));
  return { ok: true, data: rec };
}

const BL_AKSI = {
  blInfo: (req, u, P) => ({ ok: true, versiMesin: BLI.VERSI, kategori: BLI.KATEGORI, status: BLI.STATUS, dokumen: BLI.DOKUMEN, dokStatus: BLI.DOK_LABEL, bawaanProyek: blKonfigDefault(P), boleh: { ubah: u.peran === 'PENGADAAN', admin: !!u.admin }, batasUnggah: BL_MAKS_UNGGAH, potongUnggah: BL_POTONG_UNGGAH }),
  blDaftar: (req, u, P) => blDaftar(P, req, u),
  blBaca: (req, u, P) => blBaca(P, req),
  blKonteks: (req, u, P) => blKonteks(P, req, u),
  blKonfigBaca: (req, u, P) => ({ ok: true, data: blKonfig(P, s_((req.data || {}).noKontrak)), bawaanProyek: blKonfigDefault(P) }),
  blKonfigSimpan: (req, u, P, now) => blKonfigSimpan(P, req, u, now),
  blSimpan: (req, u, P, now) => blSimpan(P, req, u, now),
  blStatus: (req, u, P, now) => blStatus(P, req, u, now),
  blDokumen: (req, u, P, now) => blDokumen(P, req, u, now),
  blKeChecklist: (req, u, P, now) => blKeChecklist(P, req, u, now),
  blUnggahMulai: (req, u, P, now) => blUnggahMulai(P, req, u, now),
  blUnggahPotong: (req, u, P, now) => blUnggahPotong(P, req, u, now),
  blUnggahSelesai: (req, u, P, now) => blUnggahSelesai(P, req, u, now)
};
Object.assign(MODUL.aksi, BL_AKSI);
MODUL.fitur.push('paketTagihan', 'paketTagihanUnggah');
MODUL.baca.push('blInfo', 'blDaftar', 'blBaca', 'blKonteks', 'blKonfigBaca', 'blUnggahMulai', 'blUnggahPotong', 'blUnggahSelesai');
