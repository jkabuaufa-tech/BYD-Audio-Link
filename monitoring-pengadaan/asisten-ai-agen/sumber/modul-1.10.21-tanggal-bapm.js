/* =====================================================================
 * 1.10.21 — GS. TANGGAL BAPM = SUMBER KEBENARAN SELURUH PENERIMAAN (GR) · GUARD ANOMALI · AUDIT & MIGRASI
 *           (aplikasi 2.10.32, blok MP21032)
 *  Akar masalah (≤ 1.10.20) — sinkron tanggal BAPM (gtSinkronGudang / gudangSinkronTanggal) hanya menyentuh GR OTOMATIS
 *  (otomatis + refProgres), sedangkan:
 *   a) GR manual (Terima Bon / gudangMasukSimpan) memakai tanggal ketik petugas dan tidak punya tautan ke BK → tidak pernah ikut BAPM.
 *   b) GR manual dicatat SESUDAH progres → GR otomatis berstatus DIGABUNG (non-AKTIF) → tanggal BAPM hilang, tersisa tanggal manual.
 *   c) GR manual dicatat SEBELUM progres → GR otomatis dilewati ("sudah diterima gudang") → BK tanpa GR tertaut sama sekali.
 *   d) Dua baris BAPM untuk item Bon yang sama diproses per baris → baris kedua dianggap "sudah diterima" (qty kurang).
 *   e) Tidak ada penolakan bila tanggal GR ≠ tanggal BAPM.
 *  Perbaikan (ADITIF; kolom sheet tidak berubah — tautan disimpan di kolom DATA JSON):
 *   1) Tautan GR manual → BK lewat field refBA (+ tautBA: GABUNG | PROGRES | MANUAL | MIGRASI). refProgres tetap khusus GR otomatis,
 *      sehingga Batal BK tetap hanya membatalkan GR otomatis (barang fisik GR manual tidak ikut batal).
 *   2) gtSinkronGudang (dipakai bkTanggal, blSimpan, GR otomatis) kini mencakup GR otomatis DAN GR manual tertaut:
 *      tanggal = tanggalBA (tanggal fisik disimpan di tanggalAwal, sumber di tanggalSumber).
 *   3) Guard: GR baru yang tertaut ke BK bertanggal BA wajib bertanggal sama → beda = DITOLAK. Admin dapat memaksa
 *      (izinBedaTanggal + alasanBedaTanggal ≥ 12 karakter) → baris ditandai anomaliTanggal & tercatat di Log.
 *   4) Aksi baru: gudangCekTanggalBA (uji sebelum BAPM terbit), gudangAuditTanggalBA (baca), gudangMigrasiTanggalBA (Admin, dryRun bawaan).
 *      gudangSinkronTanggal (massal) ikut mencakup GR manual tertaut + tautan GABUNG yang pasti.
 * ===================================================================== */
(function () {
  const EPS = 1e-9;
  const hidup = r => !!r && r.status === 'AKTIF';
  const tBA = e => { try { return (e && tglValid_(s_(e.tanggalBA).slice(0, 10))) || ''; } catch (er) { return ''; } };
  const refBK = r => (gdOto(r) ? s_(r.refProgres) : '') || s_(r.refBA);   // BK yang menjadi acuan tanggal baris GR
  const itemBon = r => s_(r.bonNomor) + '|' + Number(r.bonIdx);
  const urutBuat = (a, b) => s_(a.dibuatPada).localeCompare(s_(b.dibuatPada)) || s_(a.id).localeCompare(s_(b.id));
  const jumlah = L => bulat3(L.reduce((a, r) => a + (Number(r.qty) || 0), 0));
  function petaBK(P) { const m = {}; bacaKoleksi_(P, 'progres').forEach(e => { m[s_(e.id)] = e; }); return m; }

  /* ---------- tautan pasti: GR manual yang menggabung GR otomatis (gdGabungOtomatis menulis keduanya pada waktu `now` yang sama) ---------- */
  function usulGabung(M) {
    const manual = M.filter(r => hidup(r) && !gdOto(r) && !s_(r.refBA)), dipakai = {}, out = [];
    M.filter(r => gdOto(r) && s_(r.refProgres) && (r.status === 'DIGABUNG' || (hidup(r) && Number(r.qtyAwal) > Number(r.qty) + EPS))).sort(urutBuat).forEach(a => {
      const waktu = s_(a.status === 'DIGABUNG' ? a.dibatalkanPada : a.diubahPada), m = /SJ (.+?) \(barang yang sama/.exec(s_(a.alasanBatal));
      manual.filter(r => !dipakai[r.id] && itemBon(r) === itemBon(a) && ((waktu && s_(r.dibuatPada) === waktu) || (m && gaSJ(r.noSJ) === gaSJ(m[1]))))
        .forEach(r => { dipakai[r.id] = 1; out.push({ grId: r.id, bkId: s_(a.refProgres), cara: 'GABUNG' }); });
    });
    return out;
  }

  /* ---------- volume BAPM per material (item Register "<noKontrak>#<i>"); null bila tidak terbaca (kontrak Master) ---------- */
  function qtyBAPM(e, REG) {
    const items = (e && e.items) || {}, out = {}; let terbaca = false;
    Object.keys(items).forEach(id => {
      const m = /^(.*)#(\d+)$/.exec(s_(id)); if (!m) return;
      const R = REG.find(r => s_(r.noKontrak) === m[1]), it = R && (R.items || [])[Number(m[2])]; if (!it) return;
      const v = items[id], q = v && typeof v === 'object' ? Number(v.qty !== undefined ? v.qty : v.vol) : Number(v);
      const k = gdKunci(it.kode, it.uraian, it.sat); out[k] = bulat3((out[k] || 0) + (Number(q) || 0)); terbaca = true;
    });
    return terbaca ? out : null;
  }

  /* ---------- usulan (TINJAU): GR manual belum tertaut, material sama dengan GR milik BK bertanggal BA ---------- */
  function usulMaterial(P, M, BK, taut) {
    const REG = bacaKoleksi_(P, 'data'), bkDari = r => (taut[r.id] && taut[r.id].bkId) || refBK(r);
    const perBK = {};   // bkId → {kunci: true}  (dari baris otomatis apa pun statusnya & baris manual tertaut)
    M.forEach(r => { const id = (gdOto(r) && s_(r.refProgres)) || bkDari(r); if (id && BK[id] && tBA(BK[id]) && r.status !== 'BATAL') (perBK[id] = perBK[id] || {})[r.kunci] = true; });
    const terpakai = {};   // bkId|kunci → qty GR AKTIF tertaut
    M.filter(hidup).forEach(r => { const id = bkDari(r); if (id) terpakai[id + '|' + r.kunci] = bulat3((terpakai[id + '|' + r.kunci] || 0) + (Number(r.qty) || 0)); });
    const out = [], cacheQ = {};
    M.filter(r => hidup(r) && !gdOto(r) && !s_(r.refBA) && !taut[r.id]).sort(urutBuat).forEach(r => {
      const calon = Object.keys(perBK).filter(id => perBK[id][r.kunci]).map(id => BK[id])
        .sort((a, b) => { const ta = tBA(a), tb = tBA(b), g = s_(r.tanggal); return ((ta < g) - (tb < g)) || ta.localeCompare(tb); });   // BAPM terdekat sesudah tanggal terima
      for (const e of calon) {
        const id = s_(e.id), q = cacheQ[id] !== undefined ? cacheQ[id] : (cacheQ[id] = qtyBAPM(e, REG));
        const vol = q ? Number(q[r.kunci] || 0) : null, pakai = terpakai[id + '|' + r.kunci] || 0;
        if (vol !== null && pakai + (Number(r.qty) || 0) > vol + EPS) continue;   // melebihi volume BAPM → BK berikutnya
        terpakai[id + '|' + r.kunci] = bulat3(pakai + (Number(r.qty) || 0));
        out.push({ grId: r.id, bkId: id, nomorBA: s_(e.nomorBA), tanggalBA: tBA(e), uraian: s_(r.uraian).slice(0, 80), qty: Number(r.qty) || 0, sat: s_(r.sat),
          tanggalGR: s_(r.tanggal), bonNomor: s_(r.bonNomor), noSJ: s_(r.noSJ), kapasitas: vol === null ? 'volume BAPM tidak terbaca (kontrak Master) — tinjau manual' : 'volume BAPM ' + vol + ', tertaut ' + bulat3(pakai + (Number(r.qty) || 0)) });
        return;
      }
    });
    return out;
  }

  /* ---------- rencana sinkron: tautan + tanggal target + validasi saldo (tanpa menulis) ---------- */
  function rencana(P, opsi) {
    opsi = opsi || {};
    const BK = petaBK(P), M = gdBaca(P, 'masuk'), K = gdBaca(P, 'keluar'), byId = {}; M.forEach(r => { byId[r.id] = r; });
    const taut = {}, galat = [];
    usulGabung(M).forEach(z => { if (BK[z.bkId]) taut[z.grId] = z; });
    (Array.isArray(opsi.tautan) ? opsi.tautan : []).slice(0, 500).forEach(z => {
      const r = byId[s_(z && z.grId)], e = BK[s_(z && z.bkId)];
      if (!r || !hidup(r)) { galat.push('GR ' + s_(z && z.grId) + ' tidak ditemukan / tidak aktif.'); return; }
      if (gdOto(r)) { galat.push('GR ' + r.id + ' adalah GR otomatis (tautan mengikuti BK asalnya).'); return; }
      if (!e) { galat.push('BK ' + s_(z && z.bkId) + ' tidak ditemukan.'); return; }
      taut[r.id] = { grId: r.id, bkId: s_(e.id), cara: 'MIGRASI' };
    });
    const usulan = usulMaterial(P, M, BK, taut);
    if (opsi.terapkanUsulan) usulan.forEach(z => { if (!taut[z.grId]) taut[z.grId] = { grId: z.grId, bkId: z.bkId, cara: 'MIGRASI-USULAN' }; });
    const bkDari = r => (taut[r.id] && taut[r.id].bkId) || refBK(r);
    // kelompok per BK → validasi per BK (BK yang gagal dilewati, BK lain tetap jalan)
    const grup = {}, bkTanpa = {};
    M.filter(hidup).forEach(r => {
      const id = bkDari(r); if (!id) return; const e = BK[id]; if (!e) return; const t = tBA(e);
      if (!t) { if (e.baTerbit || s_(e.nomorBA)) (bkTanpa[id] = bkTanpa[id] || { bkId: id, nomorBA: s_(e.nomorBA), noKontrak: s_(e.noKontrak), gr: 0 }).gr++; return; }
      if (s_(r.tanggal) !== t) (grup[id] = grup[id] || []).push(r);   // tautan tanpa beda tanggal ditulis oleh terapkan()
    });
    const baru = {}, perubahan = [], mK = {}, kK = {};
    M.filter(hidup).forEach(r => { (mK[r.kunci] = mK[r.kunci] || []).push(r); });
    K.filter(hidup).forEach(r => { (kK[r.kunci] = kK[r.kunci] || []).push(r); });
    Object.keys(grup).forEach(id => {
      const e = BK[id], t = tBA(e), L = grup[id];
      try {
        L.forEach(r => { if (s_(r.bonTanggal) && t < s_(r.bonTanggal).slice(0, 10)) throw new Error('Tanggal BA ' + t + ' lebih awal dari tanggal Bon ' + r.bonNomor + ' (' + s_(r.bonTanggal).slice(0, 10) + ') untuk ' + s_(r.uraian).slice(0, 40) + '.'); });
        const coba = Object.assign({}, baru); L.forEach(r => { coba[r.id] = t; });
        [...new Set(L.map(r => r.kunci))].forEach(k => {
          const x = gdTimeline((mK[k] || []).map(r => coba[r.id] ? Object.assign({}, r, { tanggal: coba[r.id] }) : r), kK[k] || []);
          if (x) throw new Error('Tanggal BA ' + t + ' membuat saldo Kartu Gudang ' + s_(L.find(r => r.kunci === k).uraian).slice(0, 40) + ' minus pada ' + x.tanggal + ' (pengeluaran tercatat sebelum tanggal BAPM). Periksa tanggal pengeluaran / BAPM.');
        });
        L.forEach(r => { baru[r.id] = t; perubahan.push({ grId: r.id, uraian: s_(r.uraian).slice(0, 80), kunci: r.kunci, qty: Number(r.qty) || 0, sat: s_(r.sat), otomatis: gdOto(r),
          tanggalLama: s_(r.tanggal), tanggalBaru: t, bkId: id, nomorBA: s_(e.nomorBA), cara: taut[r.id] ? taut[r.id].cara : (gdOto(r) ? 'OTOMATIS' : s_(r.tautBA) || 'TERTAUT') }); });
      } catch (er) { galat.push(s_(e.nomorBA || id) + ': ' + er.message); }
    });
    return { BK, M, taut, usulan, perubahan, galat, bkTanpaTanggal: Object.keys(bkTanpa).map(k => bkTanpa[k]), baru };
  }
  function terapkan(P, R, u, now, label) {
    const ubah = {}, ok = new Set(R.perubahan.map(p => p.grId));
    R.M.forEach(r => {
      const z = R.taut[r.id], tz = z ? tBA(R.BK[z.bkId]) : '';
      const bisaTaut = z && (ok.has(r.id) || !tz || s_(r.tanggal) === tz);   // tautan ditulis bila tanggalnya ikut tersinkron / memang sudah sama / BK belum bertanggal BA
      if (bisaTaut && s_(r.refBA) !== z.bkId) { Object.assign(r, { refBA: z.bkId, tautBA: z.cara, tautPada: now, tautOleh: u.nama }); ubah[r.id] = r; }
      if (R.baru[r.id] && ok.has(r.id)) {
        r.tanggalAwal = r.tanggalAwal || r.tanggal;
        Object.assign(r, { tanggal: R.baru[r.id], tanggalSumber: 'BAPM ' + s_((R.BK[refBK(r)] || {}).nomorBA) });
        if (r.anomaliTanggal) r.anomaliTanggal = Object.assign({}, r.anomaliTanggal, { diselaraskanPada: now });
        ubah[r.id] = r;
      }
    });
    const L = Object.keys(ubah).map(id => Object.assign(ubah[id], { diubahOleh: u.nama, diubahPada: now, versi: Number(ubah[id].versi) + 1 }));
    if (L.length) {
      gdTulisBanyak(P, 'masuk', L);
      catat_(P, { id: 'SINKRON-TGL-BAPM', noKontrak: '' }, u, label, L.length + ' baris GR · ' + R.perubahan.length + ' tanggal → tanggal BAPM · ' + Object.keys(R.taut).length + ' tautan · '
        + R.perubahan.slice(0, 12).map(p => s_(p.uraian).slice(0, 24) + ' ' + p.tanggalLama + '→' + p.tanggalBaru + ' (' + p.nomorBA + ')').join('; ').slice(0, 600));
    }
    return L.length;
  }
  const ringkas = R => ({ perubahan: R.perubahan, tautan: Object.keys(R.taut).map(k => R.taut[k]), usulan: R.usulan, galat: R.galat, bkTanpaTanggal: R.bkTanpaTanggal,
    jumlah: { tanggal: R.perubahan.length, tautan: Object.keys(R.taut).length, usulan: R.usulan.length, galat: R.galat.length, bkTanpaTanggal: R.bkTanpaTanggal.length } });

  /* ---------- 2) sinkron satu BK: GR otomatis + GR manual tertaut (menggantikan versi 1.10.6 yang hanya GR otomatis) ---------- */
  gtSinkronGudang = function (P, e, u, now, cekSaja) {
    const t = tBA(e); if (!t) return { n: 0 };
    return gdKunciTulis(() => {
      const M = gdBaca(P, 'masuk'), K = gdBaca(P, 'keluar'), id = s_(e.id);
      const gab = {}; usulGabung(M).filter(z => z.bkId === id).forEach(z => { gab[z.grId] = z; });
      const anggota = M.filter(r => hidup(r) && (refBK(r) === id || gab[r.id]));
      const kena = anggota.filter(r => s_(r.tanggal) !== t), tautSaja = anggota.filter(r => gab[r.id] && s_(r.tanggal) === t);
      if (!kena.length && !tautSaja.length) return { n: 0, tanggal: t };
      kena.forEach(r => { if (s_(r.bonTanggal) && t < s_(r.bonTanggal).slice(0, 10)) throw new Error('Tanggal BA ' + t + ' lebih awal dari tanggal Bon ' + r.bonNomor + ' (' + s_(r.bonTanggal).slice(0, 10) + ') untuk ' + s_(r.uraian).slice(0, 40) + '.'); });
      const ids = new Set(kena.map(r => r.id));
      [...new Set(kena.map(r => r.kunci))].forEach(k => {
        const x = gdTimeline(M.filter(r => hidup(r) && r.kunci === k).map(r => ids.has(r.id) ? Object.assign({}, r, { tanggal: t }) : r), K.filter(r => hidup(r) && r.kunci === k));
        if (x) throw new Error('Tanggal BA ' + t + ' membuat saldo Kartu Gudang ' + s_(kena.find(r => r.kunci === k).uraian).slice(0, 40) + ' minus pada ' + x.tanggal + ' (pengeluaran tercatat sebelum tanggal BAPM). Periksa tanggal pengeluaran / BAPM.');
      });
      if (cekSaja) return { n: kena.length, tanggal: t, cek: true, manual: kena.filter(r => !gdOto(r)).length };
      const tulis = kena.concat(tautSaja);
      tulis.forEach(r => {
        if (gab[r.id]) Object.assign(r, { refBA: id, tautBA: 'GABUNG', tautPada: now, tautOleh: u.nama });
        if (ids.has(r.id)) { r.tanggalAwal = r.tanggalAwal || r.tanggal; Object.assign(r, { tanggal: t, tanggalSumber: 'BAPM ' + s_(e.nomorBA) }); }
        Object.assign(r, { diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 });
      });
      gdTulisBanyak(P, 'masuk', tulis);
      catat_(P, { id: e.id, noKontrak: e.noKontrak }, u, 'SINKRON TANGGAL GUDANG', kena.length + ' penerimaan (' + kena.filter(r => gdOto(r)).length + ' otomatis, ' + kena.filter(r => !gdOto(r)).length + ' manual tertaut) ' + s_(e.nomorBA) + ' → tanggal BA ' + t);
      return { n: kena.length, tanggal: t, manual: kena.filter(r => !gdOto(r)).length };
    });
  };

  /* ---------- 3) guard GR baru: tanggal terima wajib = tanggal BAPM bila item tertaut ke BK bertanggal BA ---------- */
  function bkGabung(M, bonNomor, idx, qty) {   // GR otomatis menunggu foto yang akan digabung (urutan sama dengan gdGabungOtomatis)
    let sisa = bulat3(qty); const out = [];
    M.filter(r => s_(r.bonNomor) === bonNomor && Number(r.bonIdx) === idx && gdTunggu(r)).sort(urutBuat).forEach(r => {
      if (!(sisa > 0)) return; sisa = bulat3(sisa - Math.min(sisa, Number(r.qty) || 0)); if (out.indexOf(s_(r.refProgres)) < 0) out.push(s_(r.refProgres));
    });
    return out;
  }
  function jagaTanggal(P, x, u, daftar) {   // daftar: [{idx, qty, refBA?}] → {per:{idx: bkId}, anomali?}
    const tgl = (() => { try { return tglValid_(s_(x.tanggal)); } catch (e) { return ''; } })(); if (!tgl) return { per: {} };   // validasi wajib tetap oleh fungsi asli
    const M = gdBaca(P, 'masuk'), BK = petaBK(P), per = {}, beda = [], nomor = s_(x.bonNomor).trim();
    daftar.forEach(d => {
      const eks = s_(d.refBA || x.refBA);
      if (eks && !BK[eks]) throw new Error('BK / BAPM rujukan ' + eks + ' tidak ditemukan. Muat ulang.');
      const id = eks || bkGabung(M, nomor, Number(d.idx), d.qty)[0] || ''; if (!id) return;
      per[Number(d.idx)] = id; const t = tBA(BK[id]);
      if (t && t !== tgl) beda.push({ idx: Number(d.idx), bkId: id, nomorBA: s_(BK[id].nomorBA), tanggalBA: t });
    });
    if (!beda.length) return { per };
    const alasan = s_(x.alasanBedaTanggal).trim();
    const pesan = 'ANOMALI TANGGAL: tanggal terima ' + tgl + ' berbeda dengan tanggal BAPM (' + [...new Set(beda.map(b => b.nomorBA + ' = ' + b.tanggalBA))].join('; ') + '). Tanggal Penerimaan, Harian Gudang & Kartu Gudang wajib sama dengan tanggal BAPM.';
    if (!(u.admin && x.izinBedaTanggal === true && alasan.length >= 12)) throw new Error(pesan + (u.admin ? ' Bila memang harus berbeda, Admin dapat memaksa dengan alasan ≥ 12 karakter.' : ' Ubah Tanggal terima menjadi tanggal BAPM.'));
    return { per, anomali: { beda, alasan: alasan.slice(0, 300), oleh: u.nama } };
  }
  function tautkanBaru(P, res, J, u, now) {
    const L = (Array.isArray(res && res.data) ? res.data : res && res.data ? [res.data] : []).filter(r => r && r.id && J.per[Number(r.bonIdx)] !== undefined);
    if (!L.length) return 0;
    return gdKunciTulis(() => {
      const ids = new Set(L.map(r => r.id)), ubah = gdBaca(P, 'masuk').filter(r => ids.has(r.id));
      ubah.forEach(r => {
        const bk = J.per[Number(r.bonIdx)], an = J.anomali && J.anomali.beda.find(b => b.idx === Number(r.bonIdx));
        Object.assign(r, { refBA: bk, tautBA: 'MANUAL', tautPada: now, tautOleh: u.nama, diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 });
        if (an) r.anomaliTanggal = { tanggalBA: an.tanggalBA, nomorBA: an.nomorBA, alasan: J.anomali.alasan, oleh: J.anomali.oleh, pada: now };
      });
      gdTulisBanyak(P, 'masuk', ubah);
      ubah.forEach(z => { const r = L.find(q => q.id === z.id); if (r) Object.assign(r, z); });
      if (J.anomali) catat_(P, { id: ubah[0].id, noKontrak: s_(ubah[0].bonNomor) }, u, 'ANOMALI TANGGAL GR (DIPAKSA ADMIN)', J.anomali.beda.map(b => b.nomorBA + ' = ' + b.tanggalBA).join('; ') + ' · tanggal terima ' + s_(ubah[0].tanggal) + ' · alasan: ' + J.anomali.alasan);
      return ubah.length;
    });
  }
  const terima0 = MODUL.aksi.gudangTerimaBon, masuk0 = MODUL.aksi.gudangMasukSimpan, oto0 = MODUL.aksi.gudangOtomatisProgres;
  MODUL.aksi.gudangTerimaBon = function (req, u, P, now) {
    const x = req.data || {}, J = jagaTanggal(P, x, u, (Array.isArray(x.baris) ? x.baris : []).filter(b => Number(b && b.qty) > 0).map(b => ({ idx: parseInt(b.idx, 10), qty: Number(b.qty), refBA: b.refBA })));
    const res = terima0.apply(this, arguments);
    if (res && res.ok) { try { res.tautBA = tautkanBaru(P, res, J, u, now); } catch (er) { res.peringatanTanggal = 'Penerimaan tersimpan, tautan ke BAPM belum tersimpan: ' + er.message; } }
    return res;
  };
  MODUL.aksi.gudangMasukSimpan = function (req, u, P, now) {
    const x = req.data || {}, J = jagaTanggal(P, x, u, [{ idx: parseInt(x.bonIdx, 10), qty: Number(x.qty), refBA: x.refBA }]);
    const res = masuk0.apply(this, arguments);
    if (res && res.ok) { try { res.tautBA = tautkanBaru(P, res, J, u, now); } catch (er) { res.peringatanTanggal = 'Penerimaan tersimpan, tautan ke BAPM belum tersimpan: ' + er.message; } }
    return res;
  };

  /* ---------- GR otomatis: baris BAPM ganda per item Bon dijumlah · GR manual yang lebih dulu dicatat (terhitung "diterima") ditautkan ---------- */
  MODUL.aksi.gudangOtomatisProgres = function (req, u, P, now) {
    const d = Object.assign({}, req.data || {}), gab = {};
    (Array.isArray(d.baris) ? d.baris : []).forEach(b => {
      const k = s_(b.bonNomor).trim() + '|' + parseInt(b.bonIdx, 10);
      if (gab[k]) { gab[k].sd = bulat3(Number(gab[k].sd) + Number(b.sd)); gab[k].digabung = (gab[k].digabung || 1) + 1; } else gab[k] = Object.assign({}, b);
    });
    d.baris = Object.keys(gab).map(k => gab[k]);
    const res = oto0.call(this, Object.assign({}, req, { data: d }), u, P, now);
    if (!(res && res.ok)) return res;
    res.barisGanda = d.baris.filter(b => b.digabung > 1).map(b => ({ bonNomor: b.bonNomor, bonIdx: b.bonIdx, uraian: s_(b.uraian).slice(0, 60), baris: b.digabung, sd: b.sd }));
    const pid = s_(d.progresId).trim();
    try {
      res.tautan = gdKunciTulis(() => {
        const M = gdBaca(P, 'masuk'), ubah = [];
        // GR manual yang sudah ikut DIHITUNG server sebagai "diterima" untuk progres ini (qty GR otomatis = s.d. kini − diterima) ditautkan ke BK,
        // baik GR otomatisnya dibuat sebagian maupun dilewati ("sudah diterima gudang") — oldest first, hanya baris yang muat utuh
        Object.keys(gab).forEach(key => {
          const b = gab[key], L = M.filter(r => hidup(r) && itemBon(r) === s_(b.bonNomor).trim() + '|' + parseInt(b.bonIdx, 10));
          let perlu = bulat3(Number(b.sd) - jumlah(L.filter(r => refBK(r))));
          L.filter(r => !gdOto(r) && !s_(r.refBA)).sort(urutBuat).forEach(r => {
            const q = Number(r.qty) || 0; if (!(perlu > EPS) || q > perlu + EPS) return;
            Object.assign(r, { refBA: pid, tautBA: 'PROGRES', tautPada: now, tautOleh: u.nama, diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 }); ubah.push(r); perlu = bulat3(perlu - q);
          });
        });
        if (ubah.length) { gdTulisBanyak(P, 'masuk', ubah); catat_(P, { id: pid, noKontrak: s_(ubah[0].noKontrak || ubah[0].bonNomor) }, u, 'TAUTKAN GR KE BAPM', ubah.length + ' penerimaan manual yang lebih dulu dicatat ditautkan ke BK ' + pid); }
        return ubah.map(r => ({ id: r.id, uraian: r.uraian, qty: r.qty, tanggal: r.tanggal }));
      });
      const e = bacaKoleksi_(P, 'progres').find(z => s_(z.id) === pid);
      if (res.tautan.length && tBA(e)) res.sinkronManual = gtSinkronGudang(P, e, u, now);
    } catch (er) { res.peringatanTanggal = er.message; }
    return res;
  };

  /* ---------- 4) aksi baru ---------- */
  Object.assign(MODUL.aksi, {
    gudangCekTanggalBA: (req, u, P, now) => {   // dipanggil aplikasi SEBELUM BAPM terbit / tanggal BA diubah
      const d = req.data || {}, e = bacaKoleksi_(P, 'progres').find(z => s_(z.id) === s_(d.progresId));
      if (!e) return { ok: true, aman: true, n: 0, catatan: 'BK belum tersimpan' };
      const t = s_(d.tanggalBA || e.tanggalBA).slice(0, 10);
      try { const r = gtSinkronGudang(P, Object.assign({}, e, { tanggalBA: t }), u, now, true); return { ok: true, aman: true, n: r.n || 0, manual: r.manual || 0, tanggal: t }; }
      catch (er) { return { ok: true, aman: false, pesan: er.message, tanggal: t }; }
    },
    gudangAuditTanggalBA: (req, u, P) => { const R = rencana(P, {}); return Object.assign({ ok: true }, ringkas(R)); },
    gudangSinkronTanggal: (req, u, P, now) => {   // massal: GR otomatis + GR manual tertaut + tautan GABUNG pasti (dipakai tombol "Sinkron tanggal BAPM" & sinkron otomatis)
      if (u.peran !== 'PENGADAAN') throw new Error('Sinkron tanggal gudang khusus Pengadaan / Admin.');
      return gdKunciTulis(() => {
        const R = rencana(P, {}); terapkan(P, R, u, now, 'SINKRON TANGGAL GUDANG');
        const per = {}; R.perubahan.forEach(p => { const o = per[p.bkId] || (per[p.bkId] = { nomorBA: p.nomorBA, n: 0, tanggal: p.tanggalBaru }); o.n++; });
        return { ok: true, data: Object.keys(per).map(k => per[k]), galat: R.galat, usulan: R.usulan.length, bkTanpaTanggal: R.bkTanpaTanggal.length };
      });
    },
    gudangMigrasiTanggalBA: (req, u, P, now) => {   // Admin · {dryRun (bawaan true), tautan:[{grId,bkId}], terapkanUsulan, konfirmasi:"SINKRONKAN"}
      if (!u.admin) throw new Error('Migrasi tanggal BAPM khusus Admin.');
      const d = req.data || {}, uji = d.dryRun !== false;
      if (!uji && s_(d.konfirmasi) !== 'SINKRONKAN') throw new Error('Ketik konfirmasi "SINKRONKAN" untuk menerapkan migrasi.');
      return gdKunciTulis(() => {
        const R = rencana(P, { tautan: d.tautan, terapkanUsulan: d.terapkanUsulan === true });
        const n = uji ? 0 : terapkan(P, R, u, now, 'MIGRASI TANGGAL BAPM');
        return Object.assign({ ok: true, dryRun: uji, ditulis: n }, ringkas(R));
      });
    }
  });
  MODUL.fitur.push('tanggalBAPMSumber', 'gudangTautBA', 'auditTanggalBA', 'migrasiTanggalBA');
  MODUL.baca.push('gudangCekTanggalBA', 'gudangAuditTanggalBA');
})();
