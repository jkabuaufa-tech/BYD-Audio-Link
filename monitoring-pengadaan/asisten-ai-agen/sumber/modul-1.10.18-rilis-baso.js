/* 1.10.18 — KONTROL RELEASE / UNRELEASE KONTRAK-PO (SOP SAP HANA) · BASO & BASTA PER ALAT (menu Gudang)
 * A. RELEASE BERJENJANG (struktur sheet inti tidak berubah; hanya field tambahan pada baris kontrak Register):
 *    - Staf Pengadaan membuat / melengkapi kontrak (Draf) lalu MENGAJUKAN: aksi kontrakAjukan {id, versi?, catatan?} → rilis.status = DIAJUKAN.
 *    - RELEASE = aksi kernel "posting", kini KHUSUS ADMIN (gerbang ditimpa; logika posting kernel berjalan utuh sesudah gerbang).
 *    - UNRELEASE: aksi kontrakUnrelease {id, alasan ≥ 12 karakter, versi?} khusus Admin → diposting = false, versi + 1, status dihitung ulang,
 *      unreleasedOleh / unreleasedPada / alasanUnrelease dicatat; staf dapat mengoreksi lalu mengajukan kembali.
 *      Ditolak bila: sudah ada BK / tagihan atas nomor itu, ada penerimaan gudang aktif, addendum di atasnya sudah direlease,
 *      (addendum) keluarga kontrak sudah punya BK sesudah addendum direlease, atau kontrak berstatus PO CANCEL / HOLD.
 *    - rilis.riwayat[] menyimpan 30 perubahan terakhir (DIAJUKAN / UNRELEASED); seluruhnya juga tercatat di Log.
 * B. BASO & BASTA (Berita Acara Alat Siap Operasi + Berita Acara Serah Terima Alat) — sheet BARU <ID>_BasoBasta, 1 baris per unit alat:
 *    ID | No SPSA | Urutan | Jenis Alat | Tanggal | Status | Diubah Oleh | Diubah Pada | DATA (JSON)
 *    - basoBaca: daftar SPSA Register (nomor ber-ruas /SPSA/, bukan PO CANCEL) + seluruh data BASO/BASTA (Pengadaan & Petugas Gudang).
 *    - basoSimpan {data}: isian lapangan per alat (merk/type, no. mesin, no. rangka, bahan bakar, tahun, no. polisi, perlengkapan,
 *      foto 3 sisi). TANGGAL DOKUMEN SELALU = tanggal SPSA Register (tidak dapat diisi lain); SPSA Register wajib sudah direlease.
 *      Pihak Pertama = Kepala Proyek, Pihak Kedua = Direktur / penyedia alat. Kunci unik: No SPSA + urutan alat (1 dokumen per alat).
 *    - basoBatal {id, alasan ≥ 12}: Pengadaan/Admin — status BATAL (baris tetap tersimpan).
 * Fitur: sapRelease, basoBasta. Pasangan: Pembaruan 2.10.20. */
function rsCatatRilis(lama, status, u, now, ket) {
  const rl = lama && typeof lama === 'object' ? lama : {};
  return Object.assign({}, rl, { status: status, oleh: u.nama, pada: now, keterangan: s_(ket).slice(0, 500),
    riwayat: (Array.isArray(rl.riwayat) ? rl.riwayat : []).concat([{ status: status, oleh: u.nama, pada: now, keterangan: s_(ket).slice(0, 500) }]).slice(-30) });
}
function rsAjukan(P, req, u, now) {
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya Staf Pengadaan atau Admin yang dapat mengajukan Kontrak/PO untuk direlease.');
  const id = s_(req.id).trim(); if (!id) throw new Error('ID kontrak wajib diisi.');
  return gdKunciTulis(() => {
    const D = bacaKoleksi_(P, 'data'), i = D.findIndex(z => z.id === id); if (i < 0) throw new Error('Kontrak / PO tidak ditemukan. Muat ulang.');
    const r = D[i], no = s_(r.noKontrak).trim();
    if (r.diposting) throw new Error('Kontrak ' + no + ' sudah direlease (diposting).');
    if (req.versi !== undefined && req.versi !== null && req.versi !== '' && Number(req.versi) !== Number(r.versi)) throw new Error('KONFLIK: kontrak sudah diubah oleh ' + s_(r.diubahOleh) + '. Muat ulang.');
    ksTolak(P, no, 'pengajuan release');
    if (!no) throw new Error('Nomor kontrak belum diisi — lengkapi dahulu sebelum diajukan.');
    if (nilaiReg_(r.items) <= 0) throw new Error('Kontrak ' + no + ' bernilai Rp 0 belum dapat diajukan. Lengkapi item kontrak (volume × harga) lebih dahulu.');
    if (r.rilis && r.rilis.status === 'DIAJUKAN') throw new Error('Kontrak ' + no + ' sudah diajukan oleh ' + s_(r.rilis.oleh) + ' (' + s_(r.rilis.pada).slice(0, 10) + ') dan menunggu Release Admin.');
    D[i] = Object.assign({}, r, { rilis: rsCatatRilis(r.rilis, 'DIAJUKAN', u, now, req.catatan) });
    tulisKoleksi_(P, 'data', D);
    catat_(P, { id: r.id, noKontrak: no }, u, 'SAP AJUKAN RELEASE', 'Diajukan untuk Release Admin · ' + s_(r.namaVendor) + ' · nilai ' + (Number(r.nilai) || 0) + (s_(req.catatan).trim() ? ' · catatan: ' + s_(req.catatan).slice(0, 250) : ''));
    return { ok: true, data: D[i] };
  });
}
function rsUnrelease(P, req, u, now) {
  if (!u.admin) throw new Error('Hanya Admin yang dapat menjalankan Unrelease (pembatalan release) Kontrak/PO.');
  const alasan = s_(req.alasan).replace(/\s+/g, ' ').trim();
  if (alasan.length < 12) throw new Error('Alasan unrelease wajib diisi (min. 12 karakter) untuk jejak audit.');
  const id = s_(req.id).trim(); if (!id) throw new Error('ID kontrak wajib diisi.');
  return gdKunciTulis(() => {
    const D = bacaKoleksi_(P, 'data'), i = D.findIndex(z => z.id === id); if (i < 0) throw new Error('Kontrak / PO tidak ditemukan. Muat ulang.');
    const r = D[i], no = s_(r.noKontrak).trim(), p = sbNomor(no);
    if (!r.diposting) throw new Error('Kontrak ' + no + ' belum pernah direlease (masih draf).');
    if (req.versi !== undefined && req.versi !== null && req.versi !== '' && Number(req.versi) !== Number(r.versi)) throw new Error('KONFLIK: kontrak sudah diubah oleh ' + s_(r.diubahOleh) + '. Muat ulang.');
    ksTolak(P, no, 'unrelease');
    const atas = D.filter(x => x.id !== r.id && x.diposting && sbNomor(x.noKontrak).induk === p.induk && sbNomor(x.noKontrak).n > p.n).map(x => s_(x.noKontrak));
    if (atas.length) throw new Error('Tidak dapat unrelease: addendum di atasnya sudah direlease (' + atas.join(', ') + '). Unrelease addendum terakhir lebih dahulu.');
    const BK = bacaKoleksi_(P, 'progres'), bk = BK.filter(e => s_(e.noKontrak).trim() === no);
    if (bk.length) throw new Error('Tidak dapat unrelease: kontrak ' + no + ' sudah memiliki ' + bk.length + ' Berkas Kerja (BK) / tagihan (' + bk.slice(0, 3).map(e => s_(e.nomorBA) || s_(e.periode)).join(', ') + '). Batalkan BK lebih dahulu.');
    if (p.n > 0) {   // addendum: BK keluarga yang terbit sesudah addendum direlease memakai volume addendum
      const sejak = s_(r.dipostingPada), kel = BK.filter(e => sbNomor(e.noKontrak).induk === p.induk && (!sejak || s_(e.dibuatPada) >= sejak));
      if (kel.length) throw new Error('Tidak dapat unrelease: sudah ada ' + kel.length + ' BK / tagihan keluarga kontrak ' + p.induk + ' sesudah addendum ini direlease. Batalkan BK tersebut lebih dahulu.');
    }
    const gr = gdBaca(P, 'masuk').filter(g => g.status === 'AKTIF' && s_(g.noKontrak).trim() === no).length;
    if (gr) throw new Error('Tidak dapat unrelease: kontrak ' + no + ' masih memiliki ' + gr + ' penerimaan gudang aktif. Batalkan penerimaan tersebut lebih dahulu.');
    const baru = Object.assign({}, r, { diposting: false, versi: (Number(r.versi) || 0) + 1, diubahOleh: u.nama, diubahPada: now,
      unreleasedOleh: u.nama, unreleasedPada: now, alasanUnrelease: alasan.slice(0, 500),
      rilis: rsCatatRilis(r.rilis, 'UNRELEASED', u, now, alasan) });
    let st = 'DRAF'; try { st = statusReg_(baru) || 'DRAF'; } catch (e) { st = 'DRAF'; }
    baru.status = st === 'DIPOSTING' ? 'DRAF' : st;
    D[i] = baru; tulisKoleksi_(P, 'data', D);
    catat_(P, { id: r.id, noKontrak: no }, u, 'SAP UNRELEASE KONTRAK', 'Release dibatalkan Admin · ' + s_(r.namaVendor) + ' · nilai ' + (Number(r.nilai) || 0) + ' · alasan: ' + alasan.slice(0, 300));
    return { ok: true, data: baru };
  });
}

const BB_COL = ['ID', 'No SPSA', 'Urutan', 'Jenis Alat', 'Tanggal', 'Status', 'Diubah Oleh', 'Diubah Pada', 'DATA'];
const BB_SISI = ['Tampak Depan', 'Tampak Belakang', 'Tampak Samping'];
const BB_LENGKAP = ['manualPabrik', 'stnk', 'kotakP3K', 'kacaSpion'];
const bbSPSA = no => /(^|\/)SPSA(\/|$)/i.test(s_(no));
const bbTgl = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s_(t)); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; };
function bbBaca(P) {
  const sh = ss_().getSheetByName(P + '_BasoBasta'); if (!sh) return [];
  return baris_(sh).map(r => { try { return JSON.parse(s_(r[8])); } catch (e) { return null; } }).filter(Boolean);
}
function bbDaftarSPSA(P) {
  let mati = {}; try { ksBaca(P).filter(x => x.status === 'CANCELLED').forEach(x => { mati[s_(x.noKontrak)] = 1; }); } catch (e) { mati = {}; }
  return bacaKoleksi_(P, 'data').filter(r => r && bbSPSA(r.noKontrak) && !mati[ksInduk(r.noKontrak)]).map(r => ({
    id: s_(r.id), noKontrak: s_(r.noKontrak), tglKontrak: bbTgl(r.tglKontrak), tglSelesai: bbTgl(r.tglSelesai), namaVendor: s_(r.namaVendor), idVendor: s_(r.idVendor),
    diposting: !!r.diposting, namaPekerjaan: s_(r.namaPekerjaan),
    items: (r.items || []).map(it => ({ kode: s_(it && it.kode), uraian: s_(it && it.uraian), vol: Number(it && it.vol) || 0, sat: s_(it && it.sat) })) }));
}
function bbKurang(d) {
  const k = [];
  if (!d.merk) k.push('Merk / Type');
  if (!d.noMesin && !d.noRangka) k.push('No. Mesin / No. Rangka');
  if (!d.bahanBakar) k.push('Bahan Bakar');
  if (!d.tahun) k.push('Tahun Pembuatan');
  if (!d.pihak1Nama) k.push('Nama Kepala Proyek');
  if (!d.pihak2Nama) k.push('Nama Direktur / penyedia alat');
  BB_SISI.forEach((s, i) => { if (!(d.foto || [])[i]) k.push('Foto ' + s); });
  return k;
}
function bbSimpan(P, x, u, now) {
  if (!gdBoleh(u)) throw new Error('Akun Lihat saja tidak dapat mengisi BASO / BASTA.');
  const t = (v, n) => s_(v).replace(/\s+/g, ' ').trim().slice(0, n || 120);
  const noSPSA = t(x.noSPSA, 200); if (!noSPSA) throw new Error('Nomor SPSA wajib diisi.');
  if (!bbSPSA(noSPSA)) throw new Error('BASO / BASTA hanya untuk PO Sewa Alat: nomor kontrak harus ber-ruas /SPSA/.');
  const urutan = Math.floor(Number(x.urutan) || 0); if (urutan < 1 || urutan > 99) throw new Error('Urutan alat tidak valid (1–99).');
  const jenisAlat = t(x.jenisAlat, 200); if (!jenisAlat) throw new Error('Jenis alat wajib diisi.');
  let tahun = ''; if (s_(x.tahun).trim()) { tahun = Math.floor(Number(x.tahun)); if (!(tahun >= 1950 && tahun <= Number(s_(now).slice(0, 4)) + 1)) throw new Error('Tahun pembuatan tidak valid.'); }
  return gdKunciTulis(() => {
    const reg = bacaKoleksi_(P, 'data').find(r => s_(r.noKontrak).trim() === noSPSA) || null;
    ksTolak(P, noSPSA, 'BASO / BASTA');
    if (reg && !reg.diposting) throw new Error('SPSA ' + noSPSA + ' belum direlease Admin — BASO / BASTA dibuat setelah PO Sewa Alat direlease.');
    const tanggal = reg ? bbTgl(reg.tglKontrak) : bbTgl(x.tanggalSPSA);   // tanggal dokumen SELALU mengikuti SPSA
    if (!tanggal) throw new Error(reg ? 'Tanggal kontrak SPSA ' + noSPSA + ' belum diisi di Register Kontrak.' : 'Tanggal SPSA wajib diisi (SPSA ini tidak ada di Register Kontrak).');
    const vendor = reg ? s_(reg.namaVendor) : t(x.namaVendor, 200); if (!vendor) throw new Error('Nama penyedia alat (vendor) wajib diisi.');
    const sh = sheet_(P + '_BasoBasta', BB_COL), L = baris_(sh), semua = L.map(r => { try { return JSON.parse(s_(r[8])); } catch (e) { return null; } });
    const id = s_(x.id).trim(); let i = id ? semua.findIndex(r => r && r.id === id) : -1;
    if (id && i < 0) throw new Error('Data BASO / BASTA tidak ditemukan. Muat ulang.');
    const lama = i >= 0 ? semua[i] : null;
    if (lama && Number(x.versi) !== Number(lama.versi)) throw new Error('KONFLIK: data alat ini sudah diubah oleh ' + s_(lama.diubahOleh) + '. Muat ulang.');
    if (lama && lama.status === 'BATAL') throw new Error('Data BASO / BASTA ini sudah dibatalkan.');
    if (lama && (lama.noSPSA !== noSPSA || Number(lama.urutan) !== urutan)) throw new Error('Nomor SPSA & urutan alat tidak dapat diubah. Batalkan lalu buat ulang.');
    if (!lama && semua.some(r => r && r.status !== 'BATAL' && r.noSPSA === noSPSA && Number(r.urutan) === urutan)) throw new Error('Alat ke-' + urutan + ' pada SPSA ' + noSPSA + ' sudah punya BASO / BASTA. Muat ulang.');
    const fotoMasuk = Array.isArray(x.foto) ? x.foto : [], foto = BB_SISI.map((s, k) => {
      const f = fotoMasuk[k]; if (!f) return null;
      const lm = lama && (lama.foto || [])[k]; if (lm && s_(f.idServer || f.id) === s_(lm.idServer)) return lm;   // foto lama tidak divalidasi ulang ke Drive
      return Object.assign(gdRef(P, f, 'Foto ' + s, false), { sisi: s, oleh: u.nama, pada: now });
    });
    const pl = x.perlengkapan || {}, perlengkapan = {}; BB_LENGKAP.forEach(k => { perlengkapan[k] = pl[k] === true; });
    const rec = { id: lama ? lama.id : idBaru_('BB'), versi: lama ? Number(lama.versi) + 1 : 1, noSPSA: noSPSA, idRegister: reg ? s_(reg.id) : '', sumber: reg ? 'REGISTER' : 'MASTER',
      urutan: urutan, totalAlat: Math.max(urutan, Math.min(99, Math.floor(Number(x.totalAlat) || 0))), tanggal: tanggal, namaVendor: vendor, idVendor: reg ? s_(reg.idVendor) : t(x.idVendor, 40),
      jenisAlat: jenisAlat, merk: t(x.merk), noMesin: t(x.noMesin, 80), noRangka: t(x.noRangka, 80), bahanBakar: t(x.bahanBakar, 40), tahun: tahun, noPolisi: t(x.noPolisi, 40),
      perlengkapan: perlengkapan, kondisi: t(x.kondisi, 60) || 'Baik', lembarSurat: Math.max(0, Math.min(99, Math.floor(Number(x.lembarSurat) || 0))), keterangan: t(x.keterangan, 300),
      pihak1Nama: t(x.pihak1Nama), pihak1Jabatan: 'Kepala Proyek', pihak2Nama: t(x.pihak2Nama), pihak2Jabatan: t(x.pihak2Jabatan, 60) || 'Direktur',
      foto: foto, status: 'DRAF', dibuatOleh: lama ? lama.dibuatOleh : u.nama, dibuatPada: lama ? lama.dibuatPada : now, diubahOleh: u.nama, diubahPada: now };
    rec.kurang = bbKurang(rec); rec.status = rec.kurang.length ? 'DRAF' : 'LENGKAP';
    const vals = [rec.id, "'" + noSPSA, urutan, jenisAlat, tanggal, rec.status, u.nama, now, JSON.stringify(rec)];
    if (i < 0) sh.appendRow(vals); else sh.getRange(i + 2, 1, 1, vals.length).setValues([vals]);
    catat_(P, { id: rec.id, noKontrak: noSPSA }, u, lama ? 'UBAH BASO BASTA' : 'BUAT BASO BASTA', 'Alat ' + urutan + ' · ' + jenisAlat + ' · ' + (rec.merk || '-') + ' · ' + rec.status + (rec.kurang.length ? ' (kurang: ' + rec.kurang.join(', ') + ')' : '') + ' · tanggal ' + tanggal);
    return { ok: true, data: rec };
  });
}
function bbBatal(P, x, u, now) {
  if (u.peran !== 'PENGADAAN') throw new Error('Hanya Pengadaan atau Admin yang dapat membatalkan BASO / BASTA.');
  const alasan = s_(x.alasan).replace(/\s+/g, ' ').trim(); if (alasan.length < 12) throw new Error('Alasan pembatalan wajib diisi (min. 12 karakter).');
  return gdKunciTulis(() => {
    const sh = sheet_(P + '_BasoBasta', BB_COL), L = baris_(sh), i = L.findIndex(r => s_(r[0]) === s_(x.id).trim());
    if (i < 0) throw new Error('Data BASO / BASTA tidak ditemukan. Muat ulang.');
    let lama; try { lama = JSON.parse(s_(L[i][8])); } catch (e) { throw new Error('Data BASO / BASTA rusak.'); }
    if (lama.status === 'BATAL') throw new Error('Data BASO / BASTA ini sudah dibatalkan.');
    const rec = Object.assign({}, lama, { status: 'BATAL', versi: Number(lama.versi) + 1, alasanBatal: alasan.slice(0, 300), dibatalkanOleh: u.nama, dibatalkanPada: now, diubahOleh: u.nama, diubahPada: now });
    const vals = [rec.id, "'" + rec.noSPSA, rec.urutan, rec.jenisAlat, rec.tanggal, 'BATAL', u.nama, now, JSON.stringify(rec)];
    sh.getRange(i + 2, 1, 1, vals.length).setValues([vals]);
    catat_(P, { id: rec.id, noKontrak: rec.noSPSA }, u, 'BATAL BASO BASTA', 'Alat ' + rec.urutan + ' · ' + s_(rec.jenisAlat) + ' · alasan: ' + alasan.slice(0, 250));
    return { ok: true, data: rec };
  });
}
(function () {
  const posting0 = MODUL.aksi.posting;
  MODUL.aksi.posting = function (req, u, P) {   // Release = posting kernel, khusus Admin
    if (!u || !u.admin) throw new Error('Hanya Admin yang berwenang melakukan Release (persetujuan) Kontrak/PO. Ajukan kontrak ini agar direlease Admin.');
    return posting0 ? posting0.apply(this, arguments) : undefined;
  };
  Object.assign(MODUL.aksi, {
    kontrakAjukan: (req, u, P, now) => rsAjukan(P, req, u, now || new Date().toISOString()),
    kontrakUnrelease: (req, u, P, now) => rsUnrelease(P, req, u, now || new Date().toISOString()),
    basoBaca: (req, u, P) => { if (!gdBoleh(u) && u.peran !== 'LIHAT') throw new Error('Tidak berwenang.'); return { ok: true, versiServer: VERSI_SERVER, spsa: bbDaftarSPSA(P), data: bbBaca(P) }; },
    basoSimpan: (req, u, P, now) => bbSimpan(P, req.data || {}, u, now || new Date().toISOString()),
    basoBatal: (req, u, P, now) => bbBatal(P, req.data || {}, u, now || new Date().toISOString())
  });
  if (MODUL.timpa.indexOf('posting') < 0) MODUL.timpa.push('posting');
  MODUL.fitur.push('sapRelease', 'basoBasta');
  MODUL.baca.push('basoBaca');
})();
