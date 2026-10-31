/* =====================================================================
 * 1.10.4 — BX. BACKUP EXCEL PAKET TAGIHAN (format baku BAP format / Master SPM terisi otomatis)
 *  - Aplikasi menyusun .xlsx dari template baku (blok MP292/MP293/MP298) saat BK disimpan / BA diterbitkan / paket dibentuk,
 *    lalu mengunggahnya bertahap (blUnggahMulai/Potong yang sudah ada) dan menutup dengan blExcelSelesai.
 *  - Server: validasi ZIP/XLSX + ukuran + SHA-256, simpan ke Drive
 *      <akar arsip>/<No_Urut> <Jenis_Kontrak> <Nama_Vendor>/Kelengkapan/BAP_<Nama_Pekerjaan>_<Vendor>_Termin-<X>.xlsx
 *    akar arsip = Script Property BX_AKAR (ID folder Drive arsip kontrak/vendor) atau folder proyek › "Arsip Kontrak Vendor".
 *  - Tautan ke Paket Tagihan lewat sheet aditif <ID>_BackupExcelTagihan (kunci: ID progres/BK) → tidak menaikkan versi paket
 *    (tidak memicu KONFLIK pada dialog yang sedang terbuka). blBaca/blDaftar/blKonteks ikut membawa ringkasan backup.
 *  - Lampiran wajib: paket kontrak SPM/SPPM/SPK/SPPP/SPKP/SPKU tidak dapat dinaikkan ke SIAP DIPERIKSA tanpa backup Excel
 *    termin tersebut (Script Property BX_WAJIB = "0" untuk mematikan).
 *  - Idempoten: SHA-256 sama untuk BK yang sama → berkas lama dipakai ulang (tanpa berkas ganda). Versi lama tetap tersimpan
 *    (status DIGANTI) sebagai jejak audit.
 * ===================================================================== */
const BX_COL = ['Waktu', 'ID', 'ID Progres', 'No Kontrak', 'Termin', 'ID Paket', 'Format', 'Nama Berkas', 'ID Berkas', 'URL', 'Ukuran', 'SHA-256', 'Folder', 'Oleh', 'Sumber', 'Status', 'DATA'];
const BX_MAKS = 15 * 1024 * 1024;
const BX_FORMAT = { SPM: 'spm', SPPM: 'spm', SPK: 'bap', SPPP: 'bap', SPKP: 'bap', SPKU: 'bap' };
const bxJenis = no => s_(no).split('/')[1] ? s_(no).split('/')[1].trim().toUpperCase() : '';
const bxFormat = no => BX_FORMAT[bxJenis(no)] || '';
const bxAman = (t, n) => s_(t).replace(/[\\/:*?"<>|\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 80);
const bxRuas = (t, n) => bxAman(t, n).replace(/[.,;]+/g, '').replace(/\s+/g, '_');
function bxNamaBerkas(o) {   // BAP_<Nama_Pekerjaan>_<Vendor>_Termin-<X>.xlsx
  const pek = bxRuas(o.namaPekerjaan || bxJenis(o.noKontrak) || 'Pekerjaan', 70), ven = bxRuas(o.namaVendor || 'Vendor', 40);
  return 'BAP_' + pek + (ven && pek.toLowerCase().indexOf(ven.toLowerCase()) < 0 ? '_' + ven : '') + '_Termin-' + (parseInt(o.termin, 10) || 1) + '.xlsx';
}
function bxNamaFolder(noK, vendor) {   // "<No_Urut> <Jenis_Kontrak> <Nama_Vendor>"
  const r = s_(noK).split('/'), urut = bxAman(r[0] || '', 12) || '000', jenis = bxAman(r[1] || '', 12).toUpperCase() || 'KONTRAK';
  return (urut + ' ' + jenis + ' ' + bxAman(vendor || 'Vendor', 80)).trim();
}
function bxSubFolder(induk, nama) { const it = induk.getFoldersByName(nama); return it.hasNext() ? it.next() : induk.createFolder(nama); }
function bxAkar(P) {
  const id = s_(PropertiesService.getScriptProperties().getProperty('BX_AKAR')).trim();
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { throw new Error('Folder arsip kontrak (Script Property BX_AKAR) tidak dapat dibuka: ' + e.message); } }
  return bxSubFolder(folderProyek_(P), 'Arsip Kontrak Vendor');
}
function bxSemua(P) {
  const sh = ss_().getSheetByName(P + '_BackupExcelTagihan'); if (!sh) return [];
  return baris_(sh).filter(r => s_(r[1]) && r[16]).map((r, i) => { try { return Object.assign(JSON.parse(s_(r[16])), { _baris: i + 2 }); } catch (e) { return null; } }).filter(Boolean);
}
function bxAktif(P, progresId, L) { return (L || bxSemua(P)).filter(x => x.progresId === progresId && x.status === 'AKTIF').pop() || null; }
function bxPeta(P) { const o = {}; bxSemua(P).forEach(x => { if (x.status === 'AKTIF') o[x.progresId] = x; }); return o; }
const bxRingkas = x => x ? { id: x.id, termin: x.termin, nama: x.nama, url: x.url, idBerkas: x.idBerkas, ukuran: x.ukuran, sha256: x.sha256, folder: x.folder, pada: x.pada, oleh: x.oleh, sumber: x.sumber, format: x.format } : null;
function bxTulisStatus(P, rec, st) {
  const sh = sheet_(P + '_BackupExcelTagihan', BX_COL); rec.status = st; const r = Object.assign({}, rec); delete r._baris;
  sh.getRange(rec._baris, 16, 1, 2).setValues([[st, JSON.stringify(r)]]);
}
function bxWajib() { return s_(PropertiesService.getScriptProperties().getProperty('BX_WAJIB')).trim() !== '0'; }

function blExcelSelesai(P, req, u, now) {
  blBoleh(u); const d = req.data || {}, m = blUpMeta(s_(d.uploadId));
  if (m.P !== P || m.oleh !== u.nama) throw new Error('Sesi unggah milik pengguna/proyek lain.');
  const progresId = s_(d.progresId).trim(); if (!progresId) throw new Error('ID BK (progres) wajib.');
  const e = bacaKoleksi_(P, 'progres').find(x => x.id === progresId); if (!e) throw new Error('BK ' + progresId + ' tidak ditemukan.');
  const noK = s_(e.noKontrak).trim(), fmt = bxFormat(noK);   // nomor kontrak selalu dari BK (bukan dari perangkat)
  if (!fmt) throw new Error('Backup Excel format baku hanya untuk SPM/SPPM (Master SPM) dan SPK/SPPP/SPKP/SPKU (BAP format); kontrak ini ' + (bxJenis(noK) || '-') + '.');
  const termin = parseInt(d.termin, 10) || parseInt(e.tagihanKe, 10) || 1;
  if (termin < 1 || termin > 99) throw new Error('Termin tidak valid.');
  const L = bxSemua(P), lama = bxAktif(P, progresId, L);
  if (m.selesai && m.selesai.bx) return Object.assign({ ok: true, sudahAda: true }, m.selesai.bx);
  if (lama && lama.sha256 === m.sha256) { m.selesai = { bx: { data: bxRingkas(lama) } }; blUpTulis(m); return { ok: true, sudahAda: true, data: bxRingkas(lama) }; }
  if (m.ukuran > BX_MAKS) throw new Error('Berkas Excel maks. 15 MB.');
  const kurang = []; for (let i = 1; i <= m.bagian; i++) if (!m.potong[i]) kurang.push(i);
  if (kurang.length) throw new Error('Bagian belum diterima: ' + kurang.join(', ') + '. Kirim ulang bagian tersebut.');
  const b64 = []; for (let i = 1; i <= m.bagian; i++) b64.push(DriveApp.getFileById(m.potong[i]).getBlob().getDataAsString());
  const bytes = Utilities.base64Decode(b64.join(''));
  if (bytes.length !== m.ukuran) throw new Error('Ukuran hasil gabung ' + bytes.length + ' ≠ ' + m.ukuran + ' byte. Ulangi unggah.');
  if (!((bytes[0] & 255) === 0x50 && (bytes[1] & 255) === 0x4B && (bytes[2] & 255) === 3 && (bytes[3] & 255) === 4)) throw new Error('Isi berkas bukan Excel .xlsx yang valid (ZIP).');
  const h = hex(bytes); if (h !== m.sha256) throw new Error('Sidik SHA-256 tidak cocok (berkas rusak saat dikirim). Ulangi unggah.');
  const reg = bacaKoleksi_(P, 'data').find(r => r.noKontrak === noK) || {};
  const vendor = s_(d.namaVendor || reg.namaVendor).trim(), pek = s_(d.namaPekerjaan || reg.namaPekerjaan || reg.uraian).trim();
  const nmFolder = bxNamaFolder(noK, vendor), fKontrak = bxSubFolder(bxAkar(P), nmFolder), fKel = bxSubFolder(fKontrak, 'Kelengkapan');
  const nama = bxNamaBerkas({ noKontrak: noK, namaPekerjaan: pek, namaVendor: vendor, termin });
  const f = fKel.createFile(Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nama));
  try { f.setDescription('Backup Excel paket tagihan · ' + noK + ' · termin ' + termin + ' · BK ' + progresId + ' · ' + u.nama + ' · ' + now + ' · SHA-256 ' + h); } catch (er) { }
  mfCatat(P, f, bytes, u, now, 'BACKUP_XLSX', noK + ' termin ' + termin, 'paket-tagihan-excel');
  const paket = blBacaSemua(P).find(x => x.progresId === progresId && x.status !== 'BATAL') || null;
  const rec = { id: idBaru_('BX'), progresId, noKontrak: noK, termin, paketId: paket ? paket.id : '', format: fmt, nama, idBerkas: f.getId(), url: f.getUrl(), ukuran: bytes.length, sha256: h,
    folder: nmFolder + '/Kelengkapan', oleh: u.nama, pada: now, sumber: bxAman(d.sumber || 'APLIKASI', 30).toUpperCase(), status: 'AKTIF', nomorBA: s_(e.nomorBA), ringkas: d.ringkas && typeof d.ringkas === 'object' ? JSON.parse(JSON.stringify(d.ringkas).slice(0, 2000)) : null };
  sheet_(P + '_BackupExcelTagihan', BX_COL).appendRow([now, rec.id, rec.progresId, rec.noKontrak, rec.termin, rec.paketId, rec.format, rec.nama, rec.idBerkas, rec.url, rec.ukuran, rec.sha256, rec.folder, rec.oleh, rec.sumber, rec.status, JSON.stringify(rec)]);
  if (lama) {   // versi lama: status DIGANTI, berkas Drive diberi akhiran agar nama standar hanya milik versi aktif (jejak audit tetap)
    bxTulisStatus(P, lama, 'DIGANTI');
    try { const fl = DriveApp.getFileById(lama.idBerkas); fl.setName(s_(lama.nama).replace(/\.xlsx$/i, '') + ' (diganti ' + s_(now).slice(0, 10) + ').xlsx'); } catch (er) { }
  }
  catat_(P, { id: rec.id, noKontrak: noK }, u, 'BACKUP EXCEL TAGIHAN', nama + ' · ' + rec.folder + ' · ' + Math.round(bytes.length / 1024) + ' KB · SHA-256 ' + h.slice(0, 16) + '…' + (paket ? ' · paket ' + paket.id : ''));
  Object.keys(m.potong).forEach(k => { try { DriveApp.getFileById(m.potong[k]).setTrashed(true); } catch (er) { } });
  m.selesai = { bx: { data: bxRingkas(rec) } }; m.potong = {}; blUpTulis(m);
  return { ok: true, data: bxRingkas(rec), diganti: lama ? lama.id : '' };
}
function blExcelDaftar(P, req) {
  const d = req.data || {}, pid = s_(d.progresId), noK = s_(d.noKontrak), semua = !!d.riwayat;
  const L = bxSemua(P).filter(x => (!pid || x.progresId === pid) && (!noK || x.noKontrak === noK) && (semua || x.status === 'AKTIF'));
  return { ok: true, data: L.map(x => Object.assign(bxRingkas(x), { progresId: x.progresId, noKontrak: x.noKontrak, status: x.status, nomorBA: x.nomorBA, paketId: x.paketId })) };
}
function blExcelAmbil(P, req) {   // isi berkas (base64) untuk tombol "Unduh Excel Backup" & "Pratinjau & Cetak PDF"
  const d = req.data || {}, L = bxSemua(P);
  const x = d.id ? L.find(z => z.id === s_(d.id)) : bxAktif(P, s_(d.progresId), L);
  if (!x) throw new Error('Backup Excel belum ada untuk BK ini. Simpan BK / terbitkan BA atau klik "Susun ulang backup".');
  const f = DriveApp.getFileById(x.idBerkas), bytes = f.getBlob().getBytes();
  const h = hex(bytes); if (h !== x.sha256) throw new Error('Berkas backup di Drive berubah sejak disimpan (SHA-256 berbeda). Susun ulang backup.');
  return { ok: true, data: bxRingkas(x), base64: Utilities.base64Encode(bytes) };
}

/* gabungkan ringkasan backup ke baca paket (tanpa mengubah rekaman paket) */
(function () {
  const baca0 = BL_AKSI.blBaca, daftar0 = BL_AKSI.blDaftar, konteks0 = BL_AKSI.blKonteks, status0 = BL_AKSI.blStatus;
  BL_AKSI.blBaca = function (req, u, P) {
    const r = baca0.apply(this, arguments);
    try { if (r && r.data) { const x = bxAktif(P, r.data.progresId); r.backupExcel = bxRingkas(x); r.backupWajib = bxWajib() && !!bxFormat(r.data.noKontrak); } } catch (e) { }
    return r;
  };
  BL_AKSI.blDaftar = function (req, u, P) {
    const r = daftar0.apply(this, arguments);
    try { const pk = bxPeta(P); (r.data || []).forEach(x => { const b = pk[x.progresId]; x.backupExcel = b ? { nama: b.nama, url: b.url, termin: b.termin, pada: b.pada } : null; x.backupWajib = !!bxFormat(x.noKontrak); }); } catch (e) { }
    return r;
  };
  BL_AKSI.blKonteks = function (req, u, P) {
    const r = konteks0.apply(this, arguments);
    try { const pk = bxPeta(P); (r.progres || []).forEach(x => { const b = pk[x.id]; x.backupExcel = b ? { nama: b.nama, url: b.url, termin: b.termin, pada: b.pada, sha256: b.sha256 } : null; }); } catch (e) { }
    return r;
  };
  BL_AKSI.blStatus = function (req, u, P) {
    const d = req.data || {};
    if (s_(d.ke).toUpperCase() === 'SIAP DIPERIKSA' && bxWajib()) {
      const rec = blBacaSemua(P).find(x => x.id === s_(d.id));
      // diperiksa hanya bila transisi itu sendiri sah (versi cocok, jalur status benar) — pesan bawaan (KONFLIK, jalur) tetap didahulukan;
      // kelengkapan checklist tetap diperiksa blStatus asli sesudahnya
      const sah = rec && Number(d.versi) === Number(rec.versi) && !BLI.transisiBoleh(rec.status, 'SIAP DIPERIKSA', u, Object.assign({}, blCek(P, rec), { checklistLengkap: true }));
      if (sah && bxFormat(rec.noKontrak) && !bxAktif(P, rec.progresId)) throw new Error('Lampiran wajib: Backup Excel format baku (BAP/BAPP/BAPM) termin ' + (rec.tagihanKe || '') + ' belum tersimpan. Buka Paket Tagihan › "Susun ulang backup" atau simpan ulang BK.');
    }
    return status0.apply(this, arguments);
  };
  Object.assign(BL_AKSI, {
    blExcelSelesai: (req, u, P, now) => blExcelSelesai(P, req, u, now),
    blExcelDaftar: (req, u, P) => blExcelDaftar(P, req),
    blExcelAmbil: (req, u, P) => blExcelAmbil(P, req)
  });
  Object.assign(MODUL.aksi, BL_AKSI);
  MODUL.fitur.push('paketTagihanExcel');
  MODUL.baca.push('blExcelSelesai', 'blExcelDaftar', 'blExcelAmbil');
})();
