/* 1.10.11 — INTEGRITAS DATA GUDANG · UBAH FOTO PENERIMAAN (struktur sheet tidak berubah; baris tidak pernah dihapus)
 * Latar: riwayat gudang lama diimpor (GR-MIG-/GI-MIG-) lalu material yang sama dicatat lagi lewat penerimaan resmi Bon/BAPM
 *   → Kartu Gudang & Laporan Harian menghitung dua kali (mis. Peluit 1600000073: 12 migrasi 01-Sep + 12 BAPM 02-Nov = terusan 24).
 * A. gudangAudit (Pengadaan/Admin, baca saja) — memeriksa SEMUA material:
 *      DUPLIKAT_MIGRASI         penerimaan migrasi + penerimaan resmi melebihi volume Bon → baris migrasi dibatalkan, pengeluaran migrasi
 *                               penyeimbang ikut dibatalkan / digeser ke tanggal penerimaan resmi (saldo tidak pernah minus)
 *      DUPLIKAT_PENERIMAAN      total penerimaan satu item bon melebihi volume bon (GR otomatis / baris kembar)
 *      TANGGAL_BAPM             GR otomatis yang tanggalnya belum sama dengan tanggal BA (BAPM) pada BK
 *      DUPLIKAT_PENGELUARAN / DUPLIKAT_MIGRASI_KEMBAR   transaksi identik tercatat lebih dari sekali (selalu perlu ditinjau)
 *    Tingkat PASTI = aman dibersihkan otomatis; TINJAU = Admin memutuskan per material.
 * B. gudangBersihkan (Admin, ketik BERSIHKAN) — menerapkan temuan terpilih secara atomik: divalidasi ulang di dalam kunci tulis, saldo dicek,
 *    baru ditulis. Baris diberi status BATAL + jejak "pembersihan" (batch) dan tercatat di Log. gudangBersihkanUrung mengembalikan satu batch.
 * C. gudangUbahFoto — mengganti / menambah / menghapus foto penerimaan yang sudah tersimpan (min. 1 foto tersisa, alasan wajib,
 *    foto lama tetap di Drive & tercatat di fotoRiwayat + Log).
 * D. Pencegahan: surat jalan dibandingkan tanpa spasi/tanda baca; pengeluaran identik ditolak; impor migrasi melewati transaksi yang isinya
 *    sudah ada dan menolak material yang sudah diterima penuh lewat Bon/BAPM. */
const GA_EPS = 1e-9;
const gaMig = r => !!(r && (r.migrasi || /^G[RI]-MIG-/.test(s_(r.id))));
const gaSemu = r => /data lama|tidak tercatat|migrasi/i.test(s_(r.penerima) + ' ' + s_(r.untuk)) ? 1 : 0;
const gaSJ = v => s_(v).toLowerCase().replace(/[^a-z0-9]/g, '');
const gaKecil = v => s_(v).replace(/\s+/g, ' ').trim().toLowerCase();
const gaSum = L => bulat4_(L.reduce((a, r) => a + (Number(r.qty) || 0), 0));
const gaSidik = t => { let h = 5381; const s = JSON.stringify(t); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const gaIsi = (j, r) => j === 'masuk'
  ? ['M', r.kunci, s_(r.tanggal), bulat4_(Number(r.qty)), s_(r.bonNomor).replace(/^MIGRASI\//, ''), gaSJ(r.noSJ)].join('|')
  : ['K', r.kunci, s_(r.tanggal), bulat4_(Number(r.qty)), gaKecil(r.untuk), gaKecil(r.penerima)].join('|');
const gaFp = r => (r.foto || []).map(f => f ? s_(f.idServer || f.id) : '').join('|');
function gaVolBon(P) {   // volume Bon Permintaan per material (kunci) dan per item bon
  const mat = {}, item = {};
  bacaKoleksi_(P, 'permintaan').forEach(b => (b.items || []).forEach((it, i) => {
    const v = Number(it.vol) || 0; if (!(v > 0)) return;
    const k = gdKunci(it.kode, it.uraian, it.sat); mat[k] = bulat4_((mat[k] || 0) + v); item[s_(b.nomor) + '|' + i] = v;
  }));
  return { mat: mat, item: item };
}
function gaAnalisa(M, K, V, BK) {   // murni: tidak menulis. Simulasi dijalankan pada salinan sehingga temuan berikutnya melihat hasil temuan sebelumnya
  const SM = M.map(r => Object.assign({}, r)), SK = K.map(r => Object.assign({}, r)), iM = {}, iK = {};
  SM.forEach(r => { iM[r.id] = r; }); SK.forEach(r => { iK[r.id] = r; });
  const hidup = r => r.status === 'AKTIF';
  const grK = k => SM.filter(r => hidup(r) && r.kunci === k), giK = k => SK.filter(r => hidup(r) && r.kunci === k);
  const baruDulu = (a, b) => s_(b.tanggal).localeCompare(s_(a.tanggal)) || s_(b.dibuatPada).localeCompare(s_(a.dibuatPada)) || s_(b.id).localeCompare(s_(a.id));
  const potret = k => { const g = grK(k), a = gaSum(g), b = gaSum(giK(k)); return { terima: a, keluar: b, saldo: bulat4_(a - b), tanggalAwal: g.map(r => s_(r.tanggal)).sort()[0] || '' }; };
  const rek = t => (t.jenis === 'masuk' ? iM : iK)[t.id];
  const pakai = t => { const r = rek(t); t._l = [r.status, r.tanggal]; if (t.aksi === 'BATAL') r.status = 'BATAL'; else r.tanggal = t.tanggalBaru; };
  const lepas = t => { const r = rek(t); r.status = t._l[0]; r.tanggal = t._l[1]; delete t._l; };
  const tind = (jenis, r, aksi, alasan, lain) => Object.assign({ jenis: jenis, id: r.id, aksi: aksi, qty: Number(r.qty) || 0, tanggal: s_(r.tanggal), alasan: alasan,
    ket: jenis === 'masuk' ? (gaMig(r) ? 'Migrasi' : gdOto(r) ? 'Otomatis dari progres' : 'Penerimaan') + ' · ' + s_(r.bonNomor) + ' · SJ ' + s_(r.noSJ)
      : (gaMig(r) ? 'Migrasi' : 'Pengeluaran') + ' · ' + s_(r.penerima) + ' · ' + s_(r.untuk) }, lain || {});
  const temuan = [];
  function catat(jenis, k, sub, tingkat, T, sebelum, catatan, lain) {
    T.forEach(pakai);
    const c = T.length ? gdTimeline(grK(k), giK(k)) : null;
    if (c) {   // pembersihan tidak boleh membuat saldo minus → tidak ada tindakan, Admin meninjau manual
      T.slice().reverse().forEach(lepas); T = []; tingkat = 'TINJAU';
      catatan = (catatan ? catatan + ' ' : '') + 'Tidak dapat dibersihkan otomatis: saldo menjadi minus (' + c.saldo + ') pada ' + c.tanggal + '. Periksa pengeluaran material ini.';
    }
    const r0 = M.find(r => r.kunci === k) || K.find(r => r.kunci === k) || {};
    const bersih = T.map(t => { const o = Object.assign({}, t); delete o._l; return o; });
    temuan.push(Object.assign({ id: jenis + '|' + k + (sub ? '|' + sub : ''), jenis: jenis, tingkat: tingkat, kunci: k, kode: s_(r0.kode), uraian: s_(r0.uraian), sat: s_(r0.sat),
      volBon: V.mat[k] || 0, sebelum: sebelum, sesudah: potret(k), tindakan: bersih, catatan: catatan || '',
      sidik: gaSidik(bersih.map(t => [t.jenis, t.id, t.aksi, t.tanggalBaru || ''])) }, lain || {}));
  }

  /* 1) penerimaan migrasi yang sudah tercatat lewat penerimaan resmi Bon/BAPM */
  [...new Set(SM.filter(hidup).map(r => r.kunci))].forEach(k => {
    const Mm = grK(k).filter(gaMig), Mr = grK(k).filter(r => !gaMig(r)); if (!Mm.length || !Mr.length) return;
    const sumM = gaSum(Mm), sumR = gaSum(Mr), Vk = V.mat[k] || 0, lebih = Vk > 0 ? bulat4_(sumM + sumR - Vk) : 0, sat = s_(Mr[0].sat);
    const cermin = Mm.filter(a => Mr.some(b => Math.abs(Number(a.qty) - Number(b.qty)) < GA_EPS));
    if (!(lebih > GA_EPS) && !(!Vk && cermin.length)) return;
    const sebelum = potret(k), T = [];
    let tingkat = Vk > 0 && sumM <= sumR + GA_EPS ? 'PASTI' : 'TINJAU', cat = '';
    const alasan = 'Pembersihan data: penerimaan migrasi ganda — material sudah tercatat lewat penerimaan resmi Bon/BAPM ' + sumR + ' ' + sat + (Vk ? ' (volume bon ' + Vk + ')' : '');
    let sisa = Vk > 0 ? Math.min(lebih, sumM) : gaSum(cermin);
    (Vk > 0 ? Mm : cermin).slice().sort(baruDulu).forEach(r => { const q = Number(r.qty) || 0; if (q <= sisa + GA_EPS) { T.push(tind('masuk', r, 'BATAL', alasan)); sisa = bulat4_(sisa - q); } });
    if (sisa > GA_EPS) { tingkat = 'TINJAU'; cat = 'Kelebihan ' + sisa + ' ' + sat + ' terhadap volume bon tidak sama persis dengan baris migrasi.'; }
    if (!Vk) cat = 'Volume Bon material ini tidak ditemukan; kecocokan hanya berdasarkan qty yang sama.';
    else if (tingkat === 'TINJAU' && !cat) cat = 'Penerimaan migrasi (' + sumM + ') lebih besar dari penerimaan resmi (' + sumR + ') — sebagian mungkin stok lama yang sah.';
    T.forEach(pakai);
    let lebihK = bulat4_(gaSum(giK(k)) - gaSum(grK(k)));   // pengeluaran migrasi penyeimbang ("data lama - tidak tercatat")
    if (lebihK > GA_EPS) giK(k).filter(gaMig).sort((a, b) => (gaSemu(b) - gaSemu(a)) || s_(a.tanggal).localeCompare(s_(b.tanggal))).forEach(r => {
      const q = Number(r.qty) || 0; if (!(q <= lebihK + GA_EPS)) return;
      const t = tind('keluar', r, 'BATAL', 'Pembersihan data: pengeluaran migrasi penyeimbang dari penerimaan migrasi ganda'); T.push(t); pakai(t); lebihK = bulat4_(lebihK - q);
    });
    for (let n = 0; n < 60; n++) {   // pengeluaran migrasi yang kini mendahului penerimaan resmi → digeser ke tanggal penerimaan resmi
      const c = gdTimeline(grK(k), giK(k)); if (!c) break;
      const g = giK(k).filter(r => gaMig(r) && s_(r.tanggal) <= c.tanggal).sort((a, b) => s_(a.tanggal).localeCompare(s_(b.tanggal)))[0]; if (!g) break;
      const kini = g.tanggal; let jadi = '';
      for (const d of [...new Set(grK(k).map(r => s_(r.tanggal)).filter(d => d > s_(kini)))].sort()) { g.tanggal = d; const c2 = gdTimeline(grK(k), giK(k)); if (!c2 || c2.tanggal > c.tanggal) { jadi = d; break; } }
      g.tanggal = kini; if (!jadi) break;
      let t = T.find(z => z.jenis === 'keluar' && z.id === g.id && z.aksi === 'TANGGAL');
      if (t) { lepas(t); t.tanggalBaru = jadi; } else { t = tind('keluar', g, 'TANGGAL', 'Pembersihan data: pengeluaran migrasi disesuaikan ke tanggal penerimaan resmi (BAPM)', { tanggalBaru: jadi, sumber: 'Pembersihan data gudang' }); T.push(t); }
      pakai(t);
    }
    T.slice().reverse().forEach(lepas);
    catat('DUPLIKAT_MIGRASI', k, '', tingkat, T, sebelum, cat, { terimaResmi: sumR, terimaMigrasi: sumM, tanggalResmi: Mr.map(r => s_(r.tanggal)).sort()[0] });
  });

  /* 2) total penerimaan satu item bon melebihi volume bon */
  const perItem = {};
  SM.filter(r => hidup(r) && !gaMig(r)).forEach(r => { const key = s_(r.bonNomor) + '|' + Number(r.bonIdx); (perItem[key] = perItem[key] || []).push(r); });
  Object.keys(perItem).forEach(key => {
    const L = perItem[key], vol = V.item[key]; if (!(vol > 0)) return;
    let lebih = bulat4_(gaSum(L) - vol); if (!(lebih > GA_EPS)) return;
    const k = L[0].kunci, sebelum = potret(k), T = [], sig = r => s_(r.tanggal) + '|' + bulat4_(Number(r.qty)) + '|' + gaSJ(r.noSJ), tua = {};
    L.slice().sort(baruDulu).reverse().forEach(r => { if (!tua[sig(r)]) tua[sig(r)] = r.id; });
    const calon = L.filter(gdTunggu).sort(baruDulu).concat(L.filter(r => gdOto(r) && !gdTunggu(r)).sort(baruDulu), L.filter(r => !gdOto(r) && tua[sig(r)] !== r.id).sort(baruDulu));
    calon.forEach(r => { const q = Number(r.qty) || 0; if (q <= lebih + GA_EPS) { T.push(tind('masuk', r, 'BATAL', 'Pembersihan data: penerimaan ganda — total diterima melebihi volume bon ' + s_(r.bonNomor) + ' baris ' + (Number(r.bonIdx) + 1))); lebih = bulat4_(lebih - q); } });
    catat('DUPLIKAT_PENERIMAAN', k, key, lebih > GA_EPS ? 'TINJAU' : 'PASTI', T, sebelum, lebih > GA_EPS ? 'Kelebihan ' + lebih + ' terhadap volume bon belum terjelaskan oleh baris kembar / otomatis.' : '', { bon: key, volItem: vol });
  });

  /* 3) GR otomatis belum bertanggal BA (BAPM) */
  const bk = {}; (BK || []).forEach(e => { let t = ''; try { t = tglValid_(s_(e.tanggalBA)); } catch (er) { } if (t) bk[s_(e.id)] = { t: t, no: s_(e.nomorBA) }; });
  const perT = {};
  SM.filter(r => hidup(r) && gdOto(r) && bk[s_(r.refProgres)] && bk[s_(r.refProgres)].t !== s_(r.tanggal)).forEach(r => { (perT[r.kunci] = perT[r.kunci] || []).push(r); });
  Object.keys(perT).forEach(k => {
    const sebelum = potret(k), T = []; let cat = '';
    perT[k].forEach(r => { const b = bk[s_(r.refProgres)];
      if (s_(r.bonTanggal) && b.t < s_(r.bonTanggal).slice(0, 10)) { cat = 'Tanggal BA ' + b.t + ' lebih awal dari tanggal Bon ' + s_(r.bonNomor) + ' (' + s_(r.bonTanggal).slice(0, 10) + ').'; return; }
      T.push(tind('masuk', r, 'TANGGAL', 'Sinkron tanggal BAPM ' + b.no, { tanggalBaru: b.t, sumber: 'BAPM ' + b.no })); });
    catat('TANGGAL_BAPM', k, '', T.length && !cat ? 'PASTI' : 'TINJAU', T, sebelum, cat);
  });

  /* 4) transaksi identik tercatat lebih dari sekali (selalu ditinjau Admin) */
  const kembar = (L, sig, jenis, nama, alasan) => {
    const g = {}, perK = {}; L.forEach(r => { const s = r.kunci + '§' + sig(r); (g[s] = g[s] || []).push(r); });
    Object.keys(g).forEach(s => { if (g[s].length < 2) return; g[s].slice().sort(baruDulu).reverse().slice(1).forEach(r => { (perK[r.kunci] = perK[r.kunci] || []).push(r); }); });
    Object.keys(perK).forEach(k => { const sebelum = potret(k); catat(nama, k, '', 'TINJAU', perK[k].map(r => tind(jenis, r, 'BATAL', alasan)), sebelum, 'Transaksi identik tercatat lebih dari sekali — pastikan bukan transaksi kedua yang sah.'); });
  };
  kembar(SK.filter(hidup), r => gaIsi('keluar', r), 'keluar', 'DUPLIKAT_PENGELUARAN', 'Pembersihan data: pengeluaran identik tercatat ganda');
  kembar(SM.filter(r => hidup(r) && gaMig(r)), r => gaIsi('masuk', r), 'masuk', 'DUPLIKAT_MIGRASI_KEMBAR', 'Pembersihan data: penerimaan migrasi identik tercatat ganda');
  return temuan;
}
function gaRingkas(T) {
  const A = [].concat.apply([], T.map(t => t.tindakan)), n = f => A.filter(f).length, q = f => bulat4_(A.filter(f).reduce((a, t) => a + t.qty, 0));
  return { temuan: T.length, material: new Set(T.map(t => t.kunci)).size, pasti: T.filter(t => t.tingkat === 'PASTI' && t.tindakan.length).length, tinjau: T.filter(t => t.tingkat !== 'PASTI' || !t.tindakan.length).length,
    batalGR: n(t => t.jenis === 'masuk' && t.aksi === 'BATAL'), qtyGR: q(t => t.jenis === 'masuk' && t.aksi === 'BATAL'),
    batalGI: n(t => t.jenis === 'keluar' && t.aksi === 'BATAL'), qtyGI: q(t => t.jenis === 'keluar' && t.aksi === 'BATAL'), ubahTanggal: n(t => t.aksi === 'TANGGAL') };
}
function gaAudit(P, u) {
  if (u.peran !== 'PENGADAAN') throw new Error('Audit data gudang hanya untuk Pengadaan / Admin.');
  const M = gdBaca(P, 'masuk'), K = gdBaca(P, 'keluar'), T = gaAnalisa(M, K, gaVolBon(P), bacaKoleksi_(P, 'progres'));
  const B = {}; M.concat(K).forEach(r => { const p = r.pembersihan; if (p && p.batch && !p.diurungkan) { const b = B[p.batch] = B[p.batch] || { batch: p.batch, oleh: s_(p.oleh), pada: s_(p.pada), baris: 0 }; b.baris++; } });
  return { ok: true, versiServer: VERSI_SERVER, data: T, ringkas: gaRingkas(T), diperiksa: { masuk: M.filter(r => r.status === 'AKTIF').length, keluar: K.filter(r => r.status === 'AKTIF').length, material: new Set(M.filter(r => r.status === 'AKTIF').map(r => r.kunci)).size },
    batch: Object.keys(B).map(k => B[k]).sort((a, b) => b.pada.localeCompare(a.pada)).slice(0, 5) };
}
function gaBersihkan(P, x, u, now) {
  if (!u.admin) throw new Error('Pembersihan data gudang khusus Admin.');
  if (s_(x.konfirmasi).trim().toUpperCase() !== 'BERSIHKAN') throw new Error('Ketik BERSIHKAN untuk mengonfirmasi pembersihan data gudang.');
  const pilih = (Array.isArray(x.pilih) ? x.pilih : []).slice(0, 2000); if (!pilih.length) throw new Error('Pilih minimal 1 temuan untuk dibersihkan.');
  return gdKunciTulis(() => {
    const M = gdBaca(P, 'masuk'), K = gdBaca(P, 'keluar'), V = gaVolBon(P), BK = bacaKoleksi_(P, 'progres'), T = gaAnalisa(M, K, V, BK);
    const iM = {}, iK = {}; M.forEach(r => { iM[r.id] = r; }); K.forEach(r => { iK[r.id] = r; });
    const batch = 'BRS-' + s_(now).replace(/\D/g, '').slice(0, 14), ubahM = new Set(), ubahK = new Set(), kena = [], kunci = new Set();
    pilih.forEach(p => {
      const t = T.find(z => z.id === s_(p && p.id));
      if (!t || t.sidik !== s_(p && p.sidik)) throw new Error('Data gudang berubah sejak audit ditampilkan. Jalankan audit ulang, tidak ada data yang diubah.');
      if (!t.tindakan.length) return;
      kena.push(t); kunci.add(t.kunci);
      t.tindakan.forEach(a => {
        const r = (a.jenis === 'masuk' ? iM : iK)[a.id]; if (!r) throw new Error('Transaksi ' + a.id + ' tidak ditemukan. Jalankan audit ulang.');
        if (r.status !== 'AKTIF') { if (r.pembersihan && r.pembersihan.batch === batch) return; throw new Error('Transaksi ' + a.id + ' sudah tidak aktif. Jalankan audit ulang.'); }
        if (a.aksi === 'BATAL') Object.assign(r, { status: 'BATAL', alasanBatal: s_(a.alasan).slice(0, 300), dibatalkanOleh: u.nama, dibatalkanPada: now, pembersihan: { batch: batch, temuan: t.jenis, aksi: 'BATAL', oleh: u.nama, pada: now } });
        else Object.assign(r, { tanggalAwal: r.tanggalAwal || r.tanggal, pembersihan: { batch: batch, temuan: t.jenis, aksi: 'TANGGAL', tanggalLama: r.tanggal, sumberLama: s_(r.tanggalSumber), oleh: u.nama, pada: now }, tanggal: a.tanggalBaru, tanggalSumber: s_(a.sumber) || 'Pembersihan data gudang' });
        Object.assign(r, { diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 });
        (a.jenis === 'masuk' ? ubahM : ubahK).add(r);
      });
    });
    if (!kena.length) throw new Error('Temuan terpilih tidak memiliki tindakan otomatis — tinjau manual lewat Batal beralasan.');
    kunci.forEach(k => {   // temuan dipilih sebagian → saldo tetap wajib aman
      const c = gdTimeline(M.filter(r => r.status === 'AKTIF' && r.kunci === k), K.filter(r => r.status === 'AKTIF' && r.kunci === k));
      if (c) throw new Error('Pembersihan dibatalkan, tidak ada data yang diubah: saldo ' + s_((kena.find(t => t.kunci === k) || {}).uraian).slice(0, 40) + ' menjadi minus pada ' + c.tanggal + '. Pilih seluruh temuan material ini atau tinjau manual.');
    });
    gdTulisBanyak(P, 'masuk', [...ubahM]); gdTulisBanyak(P, 'keluar', [...ubahK]);
    const R = gaRingkas(kena);
    kena.slice(0, 300).forEach(t => catat_(P, { id: batch, noKontrak: t.kode || t.uraian }, u, 'PEMBERSIHAN DATA GUDANG', t.jenis + ' · ' + t.uraian.slice(0, 60) + ' · terima ' + t.sebelum.terima + ' → ' + t.sesudah.terima + ' ' + t.sat + ' · keluar ' + t.sebelum.keluar + ' → ' + t.sesudah.keluar
      + ' · catatan awal ' + (t.sebelum.tanggalAwal || '-') + ' → ' + (t.sesudah.tanggalAwal || '-') + ' · ' + t.tindakan.map(a => a.id + ' ' + a.aksi + (a.tanggalBaru ? ' ' + a.tanggalBaru : '')).join(', ').slice(0, 300) + ' (baris tetap tersimpan)'));
    catat_(P, { id: batch, noKontrak: 'AUDIT-GUDANG' }, u, 'PEMBERSIHAN DATA GUDANG', 'Batch ' + batch + ' · ' + R.temuan + ' temuan / ' + R.material + ' material · ' + R.batalGR + ' GR batal (' + R.qtyGR + ') · ' + R.batalGI + ' GI batal (' + R.qtyGI + ') · ' + R.ubahTanggal + ' tanggal disesuaikan');
    return { ok: true, batch: batch, ringkas: R, data: kena, sisa: gaRingkas(gaAnalisa(M, K, V, BK)) };
  });
}
function gaUrung(P, x, u, now) {
  if (!u.admin) throw new Error('Mengurungkan pembersihan data gudang khusus Admin.');
  const batch = s_(x.batch).trim(); if (!/^BRS-\d{8,14}$/.test(batch)) throw new Error('Batch pembersihan tidak dikenal.');
  const alasan = s_(x.alasan).trim(); if (alasan.length < 12) throw new Error('Alasan mengurungkan minimal 12 karakter.');
  return gdKunciTulis(() => {
    const D = { masuk: gdBaca(P, 'masuk'), keluar: gdBaca(P, 'keluar') }, kunci = new Set(), n = { masuk: 0, keluar: 0 }, ubah = { masuk: [], keluar: [] };
    ['masuk', 'keluar'].forEach(j => D[j].forEach(r => {
      const p = r.pembersihan; if (!p || p.batch !== batch || p.diurungkan) return;
      if (p.aksi === 'BATAL') { if (r.status !== 'BATAL') return; r.status = 'AKTIF'; delete r.alasanBatal; delete r.dibatalkanOleh; delete r.dibatalkanPada; }
      else { r.tanggal = p.tanggalLama; r.tanggalSumber = s_(p.sumberLama); }
      p.diurungkan = { oleh: u.nama, pada: now, alasan: alasan.slice(0, 200) };
      Object.assign(r, { diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 }); kunci.add(r.kunci); ubah[j].push(r); n[j]++;
    }));
    if (!n.masuk && !n.keluar) throw new Error('Batch ' + batch + ' tidak ditemukan atau sudah diurungkan.');
    kunci.forEach(k => { const c = gdTimeline(D.masuk.filter(r => r.status === 'AKTIF' && r.kunci === k), D.keluar.filter(r => r.status === 'AKTIF' && r.kunci === k));
      if (c) throw new Error('Tidak dapat diurungkan: saldo menjadi minus pada ' + c.tanggal + ' karena ada transaksi baru setelah pembersihan. Tidak ada data yang diubah.'); });
    gdTulisBanyak(P, 'masuk', ubah.masuk); gdTulisBanyak(P, 'keluar', ubah.keluar);
    catat_(P, { id: batch, noKontrak: 'AUDIT-GUDANG' }, u, 'URUNGKAN PEMBERSIHAN GUDANG', 'Batch ' + batch + ' · ' + n.masuk + ' GR + ' + n.keluar + ' GI dikembalikan · alasan: ' + alasan.slice(0, 200));
    return { ok: true, batch: batch, kembali: n };
  });
}
function gaUbahFoto(P, x, u, now) {
  if (!gdBoleh(u)) throw new Error('Hanya Petugas Gudang, Pengadaan, atau Admin yang dapat mengubah foto penerimaan.');
  const id = s_(x.id).trim(); if (!id) throw new Error('Penerimaan tidak dikenal.');
  const alasan = s_(x.alasan).replace(/\s+/g, ' ').trim(); if (alasan.length < 8) throw new Error('Alasan penggantian foto minimal 8 karakter (mis. "foto buram, difoto ulang").');
  const minta = (Array.isArray(x.foto) ? x.foto : []).slice(0, 4); while (minta.length < 4) minta.push(null);
  if (!minta.some(Boolean)) throw new Error('Minimal 1 foto penerimaan harus tetap ada.');
  const sid = f => s_(f && (f.idServer || f.id));
  const awal = gdBaca(P, 'masuk').find(r => r.id === id); if (!awal) throw new Error('Penerimaan tidak ditemukan. Muat ulang.');
  const punya = new Set((awal.foto || []).filter(Boolean).map(sid)), baruRef = {};
  minta.forEach((f, i) => { if (f && !punya.has(sid(f)) && !baruRef[sid(f)]) baruRef[sid(f)] = gdRef(P, f, 'Foto ' + GD_SISI[i], false); });   // foto baru divalidasi (proyek, jenis, ukuran) sebelum kunci tulis
  return gdKunciTulis(() => {
    const L = gdBaca(P, 'masuk'), rec = L.find(r => r.id === id);
    if (!rec) throw new Error('Penerimaan tidak ditemukan. Muat ulang.');
    if (rec.status !== 'AKTIF') throw new Error('Penerimaan ini sudah dibatalkan — fotonya tidak dapat diubah.');
    if (gdTunggu(rec)) throw new Error('Penerimaan otomatis ini belum memiliki foto — gunakan tombol Lengkapi foto.');
    if (Number(x.versi) !== Number(rec.versi)) throw new Error('KONFLIK: penerimaan sudah diubah oleh ' + s_(rec.diubahOleh) + '. Muat ulang.');
    if (gdPetugas(u) && ![rec.dibuatOleh, rec.dilengkapiOleh].some(n => gaKecil(n) === gaKecil(u.nama))) throw new Error('Petugas Gudang hanya dapat mengubah foto penerimaan yang dicatatnya sendiri. Minta Pengadaan/Admin untuk penerimaan lain.');
    const lama = (rec.foto || []).slice(0, 4), fpLama = gaFp(rec);
    const baru = minta.map((f, i) => { if (!f) return null; const ada = lama.find(z => z && sid(z) === sid(f)) || baruRef[sid(f)]; if (!ada) throw new Error('KONFLIK: foto penerimaan berubah. Muat ulang.'); return Object.assign({}, ada, { sisi: GD_SISI[i] }); });
    if (gaFp({ foto: baru }) === fpLama) throw new Error('Tidak ada perubahan foto.');
    const kena = x.seKiriman ? L.filter(r => r.status === 'AKTIF' && gdKeyKirim(r) === gdKeyKirim(rec) && gaFp(r) === fpLama) : [rec];
    const ringkas = F => (F || []).map(f => f ? { idServer: sid(f), nama: s_(f.nama).slice(0, 120), sisi: s_(f.sisi), url: s_(f.url) } : null);
    kena.forEach(r => {
      r.fotoRiwayat = (Array.isArray(r.fotoRiwayat) ? r.fotoRiwayat : []).concat([{ foto: ringkas(r.foto), digantiOleh: u.nama, digantiPada: now, alasan: alasan.slice(0, 200) }]).slice(-5);
      r.foto = baru.map(f => f ? Object.assign({}, f) : null);
      if (kena.length === 1) r.fotoWakil = false; else if (r.fotoUtama) r.fotoUtama = baru.map(f => f ? Object.assign({}, f) : null);
      Object.assign(r, { fotoDiubahOleh: u.nama, fotoDiubahPada: now, diubahOleh: u.nama, diubahPada: now, versi: Number(r.versi) + 1 });
    });
    gdTulisBanyak(P, 'masuk', kena);
    const nBaru = baru.filter(f => f && !punya.has(sid(f))).length;
    catat_(P, { id: rec.id, noKontrak: s_(rec.noKontrak || rec.bonNomor) }, u, 'UBAH FOTO PENERIMAAN', s_(rec.uraian).slice(0, 60) + ' · SJ ' + s_(rec.noSJ) + ' · ' + lama.filter(Boolean).length + ' foto → ' + baru.filter(Boolean).length + ' foto (' + nBaru + ' baru)'
      + (kena.length > 1 ? ' · ' + kena.length + ' item sekiriman' : '') + ' · alasan: ' + alasan.slice(0, 200) + ' (foto lama tetap tersimpan di Drive)');
    return { ok: true, data: kena };
  });
}
Object.assign(MODUL.aksi, {
  gudangAudit: (req, u, P) => gaAudit(P, u),
  gudangBersihkan: (req, u, P, now) => gaBersihkan(P, req.data || {}, u, now),
  gudangBersihkanUrung: (req, u, P, now) => gaUrung(P, req.data || {}, u, now),
  gudangUbahFoto: (req, u, P, now) => gaUbahFoto(P, req.data || {}, u, now)
});
GDP_BOLEH.push('gudangUbahFoto');
MODUL.fitur.push('gudangAudit', 'gudangUbahFoto', 'gudangAntiGanda');
MODUL.baca.push('gudangAudit');
