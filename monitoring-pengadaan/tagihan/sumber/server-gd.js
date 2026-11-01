/* =====================================================================
 * 1.10.6 — GT. FOTO PENERIMAAN PER MATERIAL · TANGGAL BAPM & BAP TERPISAH · SINKRON TANGGAL GUDANG (aplikasi 2.10.0, blok MP2100)
 *  a) Foto penerimaan per material: gudangTerimaBon / gudangLengkapiFoto menerima fotoItem { <idx bon | id GR>: [Depan, Belakang,
 *     Kanan, Kiri] }. Tiap item wajib ≥ 1 foto: foto sendiri, atau foto utama kiriman (foto[]) sebagai wakil (fotoWakil: true).
 *  b) Tanggal BA (BAPM/BAPP/BAPA) & tanggal BAP disimpan terpisah di BK (tanggalBA, tanggalBAP) lewat aksi bkTanggal;
 *     blSimpan (paket) membawa tanggalBA dan tanggalDok (= BAP) ke BK yang sama → satu sumber.
 *  c) Validasi: tanggal BA & BAP ≤ tanggal akhir kontrak (Register tglSelesai, termasuk addendum; kontrak Master: batas dari aplikasi)
 *     dan ≥ tanggal kontrak. Tagihan yang sudah diajukan/dibayar tidak dapat diubah tanggalnya.
 *  d) Sinkron gudang: GR otomatis dari BK (refProgres) bertanggal = tanggal BA (BAPM) — dulu tanggal opname/BK (sering tgl 1).
 *     Dijalankan saat tanggal BA disimpan & saat GR otomatis dibuat; saldo Kartu Gudang dicek (tidak boleh minus).
 * ===================================================================== */
const GT_TERKUNCI = ['DIAJUKAN', 'PROSES', 'PROSES PEMBAYARAN', 'DIBAYAR'];
function gtBatasKontrak(P, noK, batasApp) {
  const reg = bacaKoleksi_(P, 'data').find(r => r.noKontrak === noK);
  const akhir = s_(reg ? reg.tglSelesai : batasApp).slice(0, 10), mulai = s_(reg ? reg.tglKontrak : '').slice(0, 10);
  return { akhir: tglValid_(akhir) || '', mulai: tglValid_(mulai) || '', sumber: reg ? 'Register Kontrak' : 'data kontrak aplikasi' };
}
function gtCekTanggal(t, label, B) {
  if (!t) return '';
  const v = tglValid_(t); if (!v) throw new Error(label + ' tidak valid.');
  if (B.akhir && v > B.akhir) throw new Error(label + ' (' + v + ') melewati masa berlaku kontrak (' + B.akhir + ', ' + B.sumber + '). Perpanjang lewat addendum (Tanggal Selesai di Register Kontrak) terlebih dahulu.');
  if (B.mulai && v < B.mulai) throw new Error(label + ' (' + v + ') lebih awal dari tanggal kontrak (' + B.mulai + ').');
  return v;
}
function gtSinkronGudang(P, e, u, now, cekSaja) {   // GR otomatis BK e → tanggal BA; kembalikan {n, tanggal}. cekSaja: validasi tanpa menulis
  const t = tglValid_(s_(e.tanggalBA)); if (!t) return { n: 0 };
  return gdKunciTulis(() => {
    const M = gdBaca(P, 'masuk'), K = gdBaca(P, 'keluar'), kena = M.filter(r => r.status === 'AKTIF' && gdOto(r) && s_(r.refProgres) === s_(e.id) && s_(r.tanggal) !== t);
    if (!kena.length) return { n: 0, tanggal: t };
    kena.forEach(r => { if (s_(r.bonTanggal) && t < s_(r.bonTanggal).slice(0, 10)) throw new Error('Tanggal BA ' + t + ' lebih awal dari tanggal Bon ' + r.bonNomor + ' (' + s_(r.bonTanggal).slice(0, 10) + ') untuk ' + s_(r.uraian).slice(0, 40) + '.'); });
    const baru = {}; kena.forEach(r => { baru[r.id] = t; });
    [...new Set(kena.map(r => r.kunci))].forEach(k => {
      const Mk = M.filter(r => r.status === 'AKTIF' && r.kunci === k).map(r => Object.assign({}, r, { tanggal: baru[r.id] || r.tanggal })), Kk = K.filter(r => r.status === 'AKTIF' && r.kunci === k);
      const x = gdTimeline(Mk, Kk); if (x) throw new Error('Tanggal BA ' + t + ' membuat saldo Kartu Gudang ' + s_(kena.find(r => r.kunci === k).uraian).slice(0, 40) + ' minus pada ' + x.tanggal + ' (pengeluaran tercatat sebelum tanggal penerimaan). Periksa tanggal pengeluaran / BAPM.');
    });
    if (cekSaja) return { n: kena.length, tanggal: t, cek: true };
    kena.forEach(r => { r.tanggalAwal = r.tanggalAwal || r.tanggal; Object.assign(r, { tanggal: t, tanggalSumber: 'BAPM ' + s_(e.nomorBA), diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 }); gdTulis(P, 'masuk', r, false); });
    catat_(P, { id: e.id, noKontrak: e.noKontrak }, u, 'SINKRON TANGGAL GUDANG', kena.length + ' penerimaan otomatis ' + s_(e.nomorBA) + ' → tanggal BA ' + t);
    return { n: kena.length, tanggal: t };
  });
}
function bkTanggal(P, req, u, now) {
  if (u.peran !== 'PENGADAAN') throw new Error('Tanggal BA/BAP hanya dapat diubah Pengadaan / Admin.');
  const d = req.data || {}, L = bacaKoleksi_(P, 'progres'), i = L.findIndex(x => x.id === s_(d.id)); if (i < 0) throw new Error('BK tidak ditemukan.');
  const e = L[i], bayar = s_(e.bayar && e.bayar.status || 'BELUM').toUpperCase();
  const B = gtBatasKontrak(P, e.noKontrak, d.batasKontrak);
  const tBA = 'tanggalBA' in d ? gtCekTanggal(s_(d.tanggalBA), 'Tanggal BA (BAPM/BAPP)', B) : s_(e.tanggalBA);
  const tBAP = 'tanggalBAP' in d ? gtCekTanggal(s_(d.tanggalBAP), 'Tanggal BAP', B) : s_(e.tanggalBAP);
  if (tBA === s_(e.tanggalBA) && tBAP === s_(e.tanggalBAP)) return Object.assign({ ok: true, data: e, tidakBerubah: true }, { gudang: gtSinkronGudang(P, e, u, now) });
  if (GT_TERKUNCI.indexOf(bayar) >= 0) throw new Error('Tagihan ' + e.nomorBA + ' sudah ' + bayar + ': tanggal BA/BAP tidak dapat diubah.');
  const r = Object.assign({}, e, { tanggalBA: tBA, tanggalBAP: tBAP, diubahOleh: u.nama, diubahPada: now, versi: Number(e.versi) + 1 });
  gtSinkronGudang(P, r, u, now, true);   // saldo Kartu Gudang & tanggal bon dicek dulu → gagal = BK tidak berubah
  L[i] = r; tulisKoleksi_(P, 'progres', L);
  catat_(P, r, u, 'TANGGAL BA/BAP', e.nomorBA + ' · BA ' + (s_(e.tanggalBA) || '-') + ' → ' + (tBA || '-') + ' · BAP ' + (s_(e.tanggalBAP) || '-') + ' → ' + (tBAP || '-'));
  return { ok: true, data: r, gudang: gtSinkronGudang(P, r, u, now) };
}
/* foto per material: siapkan foto[] tiap item dari fotoItem (sendiri) / foto (utama, wakil) */
function gtFotoItem(P, x, kunciList, label) {
  const sisi = arr => { const f = (Array.isArray(arr) ? arr : []).slice(0, 4).map((z, i) => z ? Object.assign(gdRef(P, z, 'Foto ' + GD_SISI[i] + (label ? ' ' + label : ''), false), { sisi: GD_SISI[i] }) : null); while (f.length < 4) f.push(null); return f; };
  const utama = sisi(x.foto), adaUtama = utama.some(Boolean), per = {}, kurang = [];
  const FI = x.fotoItem && typeof x.fotoItem === 'object' ? x.fotoItem : {};
  if (Object.keys(FI).length > 400) throw new Error('Terlalu banyak item foto.');
  kunciList.forEach(k => { const f = sisi(FI[k.kunci]); per[k.kunci] = f.some(Boolean) ? { foto: f, wakil: false } : adaUtama ? { foto: utama, wakil: true } : null; if (!per[k.kunci]) kurang.push(k.nama); });
  if (kurang.length) throw new Error('Foto penerimaan wajib per material (min. 1 foto) atau 1 foto utama yang mewakili. Belum ada foto: ' + kurang.slice(0, 5).join('; ') + (kurang.length > 5 ? ' …' : '') + '.');
  return { utama: adaUtama ? utama : null, per };
}
(function () {
  const konteks0 = MODUL.aksi.blKonteks;
  MODUL.aksi.blKonteks = function (req, u, P) {   // paket membaca tanggal BA & BAP dari BK
    const r = konteks0.apply(this, arguments); try { const m = {}; bacaKoleksi_(P, 'progres').forEach(e => { m[e.id] = e; }); (r.progres || []).forEach(x => { const e = m[x.id] || {}; x.tanggalBA = s_(e.tanggalBA); x.tanggalBAP = s_(e.tanggalBAP); }); } catch (e) { }
    return r;
  };
  const terima0 = MODUL.aksi.gudangTerimaBon, lengkapi0 = MODUL.aksi.gudangLengkapiFoto, oto0 = MODUL.aksi.gudangOtomatisProgres, simpanBL0 = MODUL.aksi.blSimpan;
  MODUL.aksi.gudangTerimaBon = function (req, u, P, now) {
    const x = req.data || {}; if (!x.fotoItem) return terima0.apply(this, arguments);
    const bon = bacaKoleksi_(P, 'permintaan').find(b => b.nomor === s_(x.bonNomor).trim());
    const baris = (Array.isArray(x.baris) ? x.baris : []).filter(b => Number(b && b.qty) > 0);
    const F = gtFotoItem(P, x, baris.map(b => ({ kunci: s_(parseInt(b.idx, 10)), nama: s_(bon && bon.items && (bon.items[parseInt(b.idx, 10)] || {}).uraian).slice(0, 40) || 'baris ' + (parseInt(b.idx, 10) + 1) })));
    const pertama = Object.values(F.per)[0].foto;   // kernel lama mewajibkan foto kiriman ≥ 1 → isi utama / foto item pertama, lalu ditimpa per item
    const res = terima0.call(this, Object.assign({}, req, { data: Object.assign({}, x, { foto: F.utama || pertama }) }), u, P, now);
    if (res && res.ok && Array.isArray(res.data)) gdKunciTulis(() => res.data.forEach(r => { const f = F.per[s_(r.bonIdx)]; if (!f) return; Object.assign(r, { foto: f.foto, fotoWakil: f.wakil, fotoUtama: F.utama }); gdTulis(P, 'masuk', r, false); }));
    return res;
  };
  MODUL.aksi.gudangLengkapiFoto = function (req, u, P, now) {
    const x = req.data || {}; if (!x.fotoItem) return lengkapi0.apply(this, arguments);
    const kena = gdBaca(P, 'masuk').filter(r => r.status === 'AKTIF' && gdOto(r) && s_(r.kiriman) === s_(x.kiriman).trim());
    if (!kena.length) throw new Error('Penerimaan otomatis tidak ditemukan atau sudah digabung/dibatalkan. Muat ulang.');
    const F = gtFotoItem(P, x, kena.map(r => ({ kunci: r.id, nama: s_(r.uraian).slice(0, 40) })));
    const res = lengkapi0.call(this, Object.assign({}, req, { data: Object.assign({}, x, { foto: F.utama || Object.values(F.per)[0].foto }) }), u, P, now);
    if (res && res.ok && Array.isArray(res.data)) gdKunciTulis(() => res.data.forEach(r => { const f = F.per[r.id]; if (!f) return; Object.assign(r, { foto: f.foto, fotoWakil: f.wakil, fotoUtama: F.utama }); gdTulis(P, 'masuk', r, false); }));
    return res;
  };
  MODUL.aksi.gudangOtomatisProgres = function (req, u, P, now) {   // GR otomatis langsung bertanggal BA bila BK sudah punya tanggal BA
    const res = oto0.apply(this, arguments), e = bacaKoleksi_(P, 'progres').find(x => x.id === s_((req.data || {}).progresId));
    if (res && res.ok && e && tglValid_(s_(e.tanggalBA))) { try { res.sinkron = gtSinkronGudang(P, e, u, now); } catch (er) { res.peringatanTanggal = er.message; } }
    return res;
  };
  MODUL.aksi.blSimpan = function (req, u, P, now) {   // paket membawa tanggal BA & BAP → validasi masa berlaku & simpan ke BK (satu sumber)
    const d = req.data || {}, pid = s_(d.progresId || (d.id && (blBacaSemua(P).find(x => x.id === s_(d.id)) || {}).progresId));
    const e = pid ? bacaKoleksi_(P, 'progres').find(x => x.id === pid) : null;
    if (e && (d.tanggalBA || d.tanggalDok)) { const B = gtBatasKontrak(P, e.noKontrak, d.batasKontrak); gtCekTanggal(s_(d.tanggalBA), 'Tanggal BA (BAPM/BAPP)', B); gtCekTanggal(s_(d.tanggalDok), 'Tanggal BAP', B);
      if (d.tanggalBA && s_(d.tanggalBA) !== s_(e.tanggalBA)) gtSinkronGudang(P, Object.assign({}, e, { tanggalBA: s_(d.tanggalBA) }), u, now, true); }   // saldo gudang dicek sebelum paket disimpan
    const res = simpanBL0.apply(this, arguments);
    if (res && res.ok && res.data && e && !res.sudahAda && (d.tanggalBA || d.tanggalDok) && (s_(d.tanggalBA) !== s_(e.tanggalBA) || s_(d.tanggalDok) !== s_(e.tanggalBAP))) {
      try { const t = bkTanggal(P, { data: Object.assign({ id: e.id, batasKontrak: d.batasKontrak }, d.tanggalBA ? { tanggalBA: d.tanggalBA } : {}, d.tanggalDok ? { tanggalBAP: d.tanggalDok } : {}) }, u, now); res.bk = t.data; res.gudang = t.gudang; }
      catch (er) { res.peringatanTanggal = er.message; }
    }
    if (res && res.data && e) { res.data.tanggalBA = s_((res.bk || e).tanggalBA); }
    return res;
  };
  Object.assign(MODUL.aksi, {
    bkTanggal: (req, u, P, now) => bkTanggal(P, req, u, now),
    gudangSinkronTanggal: (req, u, P, now) => {   // sinkron massal: semua BK bertanggal BA → GR otomatisnya
      if (u.peran !== 'PENGADAAN') throw new Error('Sinkron tanggal gudang khusus Pengadaan / Admin.');
      const hasil = [], galat = [];
      bacaKoleksi_(P, 'progres').filter(e => tglValid_(s_(e.tanggalBA))).forEach(e => { try { const r = gtSinkronGudang(P, e, u, now); if (r.n) hasil.push({ nomorBA: e.nomorBA, n: r.n, tanggal: r.tanggal }); } catch (er) { galat.push(e.nomorBA + ': ' + er.message); } });
      return { ok: true, data: hasil, galat };
    }
  });
  MODUL.fitur.push('fotoPerMaterial', 'tanggalBAPMBAP', 'sinkronTanggalGudang');
})();
