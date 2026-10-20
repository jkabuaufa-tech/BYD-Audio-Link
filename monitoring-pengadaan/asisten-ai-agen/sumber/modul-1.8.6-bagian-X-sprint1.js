/* =====================================================================
 * 1.8.6 — X. SPRINT 1: eskalasi notifikasi · gerbang nilai kontrak · dokumen kurang · jejak audit
 * a) Eskalasi: setiap butir notifikasi diberi tahap & level — kontrak H-30 (Info) · H-7 (Warning) · H+0 (Kritis) · H+30 (Kritis eskalasi);
 *    dokumen vendor kedaluwarsa (Kritis) / ≤ 7 hari (Warning); tagihan (Info); bon > 14 hari (Warning). Email & pratinjau menyebut jumlah per level.
 * b) Gerbang nilai (menimpa save & posting, lalu kernel berjalan utuh): kontrak senilai Rp 0 boleh disimpan sebagai DRAF,
 *    tetapi tidak boleh dilengkapi PR/RFQ/PO/TOP atau diposting sebelum item (volume × harga) bernilai > 0. Tgl selesai ≥ tgl kontrak.
 * c) x186Kurang: daftar dokumen checklist yang belum lengkap per tagihan (templat per kategori ALAT/BAHAN/SUBKON — sewa alat
 *    tanpa retensi, uang muka & jaminan pelaksanaan), untuk tooltip di Keuangan & Bayar.
 * d) x186Audit (Admin): Jejak Audit dari sheet <ID>_Log — cari, filter aksi/pengguna/tanggal, halaman 50 baris, ekspor s.d. 5.000 baris.
 * ===================================================================== */
function x186Tahap(sisa) {
  if (sisa === null || sisa === undefined || !isFinite(sisa)) return null;
  if (sisa <= -30) return { tahap: 'H+30', level: 'KRITIS' };
  if (sisa <= 0) return { tahap: 'H+0', level: 'KRITIS' };
  if (sisa <= 7) return { tahap: 'H-7', level: 'WARNING' };
  if (sisa <= 30) return { tahap: 'H-30', level: 'INFO' };
  return null;
}
const X186_LV = { KRITIS: 0, WARNING: 1, INFO: 2 };
function x186Level(G) {   // dipanggil di akhir ntSusun: beri level tiap butir, urutkan Kritis dahulu
  (G || []).forEach(g => {
    (g.item || []).forEach(x => {
      let lv = 'INFO', th = '';
      if (g.k === 'kontrak') { const t = x186Tahap(x.sisa); if (t) { lv = t.level; th = t.tahap; } else lv = 'INFO'; }
      else if (g.k === 'dokumen') lv = /^Lewat|hari ini/i.test(s_(x.nilai)) ? 'KRITIS' : 'WARNING';
      else if (g.k === 'gudang') lv = x.merah ? 'WARNING' : 'INFO';
      x.level = lv; x.tahap = th; x.merah = lv === 'KRITIS' || (x.merah && lv !== 'INFO');
      if (th) x.nilai = th + ' · ' + s_(x.nilai);
    });
    g.item.sort((a, b) => (X186_LV[a.level] - X186_LV[b.level]) || ((a.sisa === undefined || a.sisa === null ? 99 : a.sisa) - (b.sisa === undefined || b.sisa === null ? 99 : b.sisa)));
  });
  return x186Hitung(G);
}
function x186Hitung(G) {
  const n = { KRITIS: 0, WARNING: 0, INFO: 0 };
  (G || []).forEach(g => (g.item || []).forEach(x => { n[x.level || 'INFO']++; }));
  return n;
}

/* ---------- b) gerbang nilai kontrak (Register) ---------- */
function x186BaruReg(lama, data, izin) {
  const b = Object.assign({ noPR: '', noRFQ: '', noPO: '', top: '', items: [] }, lama ? JSON.parse(JSON.stringify(lama)) : {});
  izin.forEach(k => { if (k in data) b[k] = k === 'items' ? (data.items || []).map(bersihItemReg_) : data[k]; });
  b.items = (b.items || []).map(bersihItemReg_);
  return b;
}
function x186Tolak(P, r, u, pesan) {
  try { catat_(P, { id: s_(r && r.id) || 'BARU', noKontrak: s_(r && r.noKontrak) }, u, 'GERBANG NILAI DITOLAK', pesan); } catch (e) { }
  throw new Error(pesan);
}
function x186GerbangSimpan(req, u, P) {   // menimpa 'save': hanya menolak; selain itu kembali undefined → kernel berjalan utuh
  const data = req.data || {}, izin = IZIN_REG[u.peran] || [];
  if (!izin.length) return undefined;
  const D = bacaKoleksi_(P, 'data'), id = s_(data.id), lama = id ? D.find(x => x.id === id) : null;
  if (id && !lama) return undefined;
  if (lama && Number(data.versi) !== Number(lama.versi)) return undefined;   // konflik versi → pesan kernel
  const baru = x186BaruReg(lama, data, izin), nilai = nilaiReg_(baru.items);
  const st = statusReg_(Object.assign({}, baru, { diposting: false }));
  const skB = kelengkapanReg_(baru).skor, skL = lama ? kelengkapanReg_(lama).skor : 0, nilaiL = lama ? nilaiReg_(lama.items) : 0;
  if (nilai <= 0 && ((lama && lama.diposting) || st !== 'DRAF') && (!lama || skB > skL || nilaiL > 0))
    x186Tolak(P, baru, u, 'Nilai kontrak Rp 0: isi item kontrak (volume × harga) terlebih dahulu. Kontrak Rp 0 hanya boleh disimpan sebagai DRAF — belum boleh dilengkapi PR/RFQ/PO/TOP' + (lama && lama.diposting ? ' dan item kontrak yang sudah diposting tidak boleh dikosongkan.' : '.'));
  const tk = s_(baru.tglKontrak).slice(0, 10), ts = s_(baru.tglSelesai).slice(0, 10);
  const ubahTgl = !lama || s_(lama.tglKontrak) !== s_(baru.tglKontrak) || s_(lama.tglSelesai) !== s_(baru.tglSelesai);
  if (ubahTgl && /^\d{4}-\d{2}-\d{2}$/.test(tk) && /^\d{4}-\d{2}-\d{2}$/.test(ts) && ts < tk)
    x186Tolak(P, baru, u, 'Tanggal selesai kontrak (' + ts + ') tidak boleh sebelum tanggal kontrak (' + tk + ').');
  return undefined;
}
function x186GerbangPosting(req, u, P) {   // menimpa 'posting': kontrak Rp 0 tidak dapat diposting
  const D = bacaKoleksi_(P, 'data'), r = D.find(x => x.id === s_(req.id));
  if (r && !r.diposting && Number(req.versi) === Number(r.versi) && nilaiReg_(r.items) <= 0)
    x186Tolak(P, r, u, 'Kontrak ' + s_(r.noKontrak) + ' bernilai Rp 0 tidak dapat diposting. Lengkapi item kontrak (volume × harga) lebih dahulu.');
  return undefined;
}

/* ---------- c) dokumen checklist yang belum lengkap ---------- */
function x186Kurang(P) {
  const templat = {}, data = {};
  Object.keys(CL217_TEMPLATES).forEach(k => { templat[k] = cl217Template_(k).map(d => d.nama); });
  cl217Baca_(P).forEach(r => {
    if (!r || !r.id || !CL217_TEMPLATES[r.kategori]) return;
    const it = r.items || {}, t = cl217Template_(r.kategori);
    const kurang = t.filter(d => { const v = it[d.k] || {}; return !((v.status === 'ADA' && v.file && v.file.idServer) || (v.status === 'NA' && s_(v.alasan).trim().length >= 12)); }).map(d => d.nama);
    data[r.id] = { kat: r.kategori, kurang: kurang, total: t.length, verified: !!r.verified };
  });
  return { ok: true, templat: templat, data: data };
}

/* ---------- d) jejak audit (Admin) ---------- */
function x186Audit(P, u, x) {
  if (!u.admin) throw new Error('Jejak Audit khusus Admin.');
  x = x || {};
  const sh = ss_().getSheetByName(P + '_Log'), R = sh ? baris_(sh) : [];
  const tglW = w => { const d = w instanceof Date ? w : new Date(s_(w)); return isNaN(d) ? '' : Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };
  let L = R.map(r => ({ waktu: r[0] instanceof Date ? r[0].toISOString() : s_(r[0]), id: s_(r[1]), noKontrak: s_(r[2]), oleh: s_(r[3]), peran: s_(r[4]), aksi: s_(r[5]), detail: s_(r[6]) }));
  const fAksi = {}, fOleh = {};
  L.forEach(l => { fAksi[l.aksi] = (fAksi[l.aksi] || 0) + 1; fOleh[l.oleh] = (fOleh[l.oleh] || 0) + 1; });
  const q = s_(x.cari).trim().toLowerCase(), aksi = s_(x.aksi), oleh = s_(x.oleh), dari = s_(x.dari).slice(0, 10), sd = s_(x.sd).slice(0, 10);
  L = L.filter(l => (!aksi || l.aksi === aksi) && (!oleh || l.oleh === oleh)
    && (!q || (l.noKontrak + ' ' + l.id + ' ' + l.aksi + ' ' + l.oleh + ' ' + l.detail).toLowerCase().indexOf(q) >= 0)
    && (!dari && !sd || ((t => (!dari || t >= dari) && (!sd || t <= sd))(tglW(l.waktu)))));
  L.sort((a, b) => s_(b.waktu).localeCompare(s_(a.waktu)));
  const semua = x.semua === true, per = semua ? 5000 : Math.max(10, Math.min(100, Number(x.per) || 50)), hal = semua ? 0 : Math.max(0, Number(x.hal) || 0);
  const pot = semua ? 2000 : 600;
  return { ok: true, total: L.length, hal: hal, per: per, jumlahLog: R.length,
    aksiDaftar: Object.keys(fAksi).sort((a, b) => fAksi[b] - fAksi[a]).slice(0, 60).map(k => ({ aksi: k, n: fAksi[k] })),
    olehDaftar: Object.keys(fOleh).sort().map(k => ({ oleh: k, n: fOleh[k] })),
    data: L.slice(hal * per, hal * per + per).map(l => Object.assign({}, l, { detail: l.detail.slice(0, pot) })) };
}
