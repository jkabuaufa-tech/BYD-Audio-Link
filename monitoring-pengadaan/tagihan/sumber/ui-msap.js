/* MP270 UI — Paket Tagihan di Monitoring SAP: "Buat Paket Tagihan" (Register Kontrak, Input Progres, Monitoring BK, Keuangan & Bayar),
 * dialog paket (termin, konfigurasi, perhitungan, lampiran, dokumen & checklist, riwayat) dan Dashboard Tagihan.
 * Data diambil dari Monitoring SAP di perangkat (RINGKASAN, PROG, REG) — tidak ada isian ulang; server modul 1.10.0 menghitung
 * ulang & menyimpan. Tanpa modul 1.10.0: mode pratinjau (hitung & cetak saja, tidak menyimpan). */
(function () {
  if (window.MP270) return; window.MP270 = true;
  const $ = id => document.getElementById(id);
  const E = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const rp = x => BLI.rupiah(x), ang = x => BLI.angka(x), pc = x => BLI.persen(x);
  const pesan = (m, t) => { try { if (typeof notif === 'function') notif(m, t || ''); else console.info(m); } catch (e) { } };
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const pid = () => (sesi() && sesi().proyek) || (typeof PROYEK !== 'undefined' && PROYEK.id) || '';
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? !!window.mp220Srv(f) : false; } catch (e) { return false; } };
  const terhubung = () => !!(typeof REG !== 'undefined' && REG.url && sesi()) && srv('paketTagihan');
  const bolehUbah = () => { const s = sesi(); return !!(s && (s.peran === 'PENGADAAN' || s.peran === 'ADMIN' || s.admin)); };   // server: Admin = Pengadaan + admin
  const admin = () => !!(sesi() && (sesi().admin || sesi().peran === 'ADMIN'));
  async function kirim(action, data) {
    const s = sesi(), f = window.regPost; if (!s || typeof f !== 'function') throw new Error('Belum terhubung ke server Monitoring SAP.');
    const r = await f(Object.assign({ action, nama: s.nama, pin: s.pin, proyek: pid() }, data === undefined ? {} : { data }));
    if (!r || !r.ok) throw new Error((r && r.error) || 'Gagal menghubungi server.'); return r;
  }
  const tulis = (a, d) => BLK.tulisAman(kirim, a, d);
  const ringkasan = () => { try { return (typeof RINGKASAN !== 'undefined' && RINGKASAN) || []; } catch (e) { return []; } };
  const progresSemua = () => { try { return (typeof PROG !== 'undefined' && PROG.data) || []; } catch (e) { return []; } };
  const fn = (nm, ...a) => { try { return typeof window[nm] === 'function' ? window[nm](...a) : undefined; } catch (e) { return undefined; } };
  const g$ = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined ? fb : v; } catch (e) { return fb; } };   // fungsi global aplikasi (deklarasi function/let)

  /* ---------- data kontrak dari Monitoring SAP ---------- */
  function cariKontrak(key) {
    const L = ringkasan(); let g = L.find(x => x.key === key);
    if (!g) g = L.find(x => (x.terkait || []).indexOf(key) >= 0 || (x.koreksi && x.koreksi.noKontrak === key));
    return g || null;
  }
  const idItem = (g, it, i) => { const f = g$('idItem'); return typeof f === 'function' ? f(g, it, i) : (it.kodeUnik || g.key + '#' + i); };
  const volItem = it => { const f = g$('volItem'); return typeof f === 'function' ? f(it) : N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak); };
  const hargaItem = it => { const f = g$('hargaItem'); return typeof f === 'function' ? f(it) : N(it.hargaSatuanEfektif ?? it.hargaSatuan); };
  const kumDasar = it => N(it.volumeProgresKumulatif);
  function nomorSAP(g, jenis) { try { const r = window.mp2611NomorKontrak && window.mp2611NomorKontrak(g.key, g, jenis); if (r && (r.sap || r.apa)) return r.sap || r.apa; } catch (e) { } return (g.koreksi && g.koreksi[jenis]) || g[jenis] || ''; }
  function sumberDari(g) {
    const items = g.items.map((it, i) => { const v = volItem(it), h = hargaItem(it);
      return { id: idItem(g, it, i), kode: String(it.kodeItem || it.itemService || it.kode || ''), uraian: String(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || ''), sat: String(it.satuan || it.sat || ''), vol: v, harga: h, wbs: String(it.wbs || ''), judul: !v && !h }; });
    const dasar = {}; g.items.forEach((it, i) => { const k = kumDasar(it); if (k > 0) dasar[idItem(g, it, i)] = k; });
    const pv = fn('profilVendor', g.idVendor, g.namaVendor) || {}, mv = fn('cariMasterVendor', g.idVendor, g.namaVendor) || {};
    return {
      kontrak: { noKontrak: g.key, namaVendor: g.namaVendor || '', idVendor: g.idVendor || '', nilai: N(g.nilai), tglKontrak: g.tglMulai || '', tglSelesai: g.tglSelesai || '', noPO: nomorSAP(g, 'noPO'), noPR: nomorSAP(g, 'noPR'),
        jenisKontrak: g.jenisKontrak || (String(g.key).split('/')[1] || ''), kelompok: g.kelompok || '', uraian: ((g.items || []).find(i => !(volItem(i)) && i.itemPekerjaan) || {}).itemPekerjaan || '' },
      items, dasar, vendor: { nama: g.namaVendor || '', alamat: pv.alamat || pv.kota || '', npwp: mv.npwp || mv.NPWP || mv.taxNumber || '', ttdNama: pv.nama || '', ttdJabatan: pv.jabatan || 'Direktur' },
      terkait: [...new Set([g.key].concat(g.terkait || [], g.koreksi && g.koreksi.noKontrak ? [g.koreksi.noKontrak] : []))]
    };
  }
  function entriKontrak(g) { const T = new Set(sumberDari(g).terkait); return progresSemua().filter(e => T.has(e.noKontrak)).slice().sort(BLI.urutEntri); }
  function identitas() {
    const K = g$('KSO', {}) || {}, P = g$('PROYEK', {}) || {}, idn = fn('mp224Identitas') || {};
    return { namaKop: (window.mp224Pelaksana && window.mp224Pelaksana('judul')) || K.namaKop || idn.nama || '', nama: idn.nama || K.nama || '', alamatKop: K.alamatKop || '', alamat: K.alamat || '', proyek: P.namaLengkap || K.proyek || P.nama || '',
      kapro: { nama: P.kapro || (K.kapro && K.kapro.nama) || '', jabatan: (K.kapro && K.kapro.jabatan) || 'Kepala Proyek' }, kasi: { nama: P.kasi || (K.kasi && K.kasi.nama) || '', jabatan: (K.kasi && K.kasi.jabatan) || 'Kasi Pengadaan, Logistik & Peralatan' }, kota: 'Jakarta', logo: g$('LOGO_KSO', '') };
  }
  const kategoriBawaan = g => BLI.kategoriDariNomor(g.key) || (/ALAT/i.test(g.kelompok || '') ? 'ALAT' : /BAHAN|MATERIAL/i.test(g.kelompok || '') ? 'BAHAN' : 'SUBKON');

  /* ---------- keadaan dialog ---------- */
  const T = { g: null, S: null, kon: null, paket: null, baca: null, l: {}, konfig: null, hasil: null, tab: 'termin', sibuk: '', galat: '', unggah: '', ubah: false };
  const KUNCI = () => 'MP270_DRAF_' + pid() + '_' + (T.g ? T.g.key : '') + '_' + (T.l.progresId || '');
  const simpanLokal = () => { try { localStorage.setItem(KUNCI(), JSON.stringify({ l: T.l, konfig: T.konfig, t: Date.now() })); } catch (e) { } };
  const bacaLokal = () => { try { return JSON.parse(localStorage.getItem(KUNCI()) || 'null'); } catch (e) { return null; } };
  const hapusLokal = () => { try { localStorage.removeItem(KUNCI()); } catch (e) { } };

  function hitungLokal() {
    if (!T.g || !T.l.progresId) { T.hasil = null; return; }
    const E2 = entriKontrak(T.g);
    let vol; try { vol = BLI.volumeDariProgres(E2, T.l.progresId, T.S.dasar); } catch (e) { T.hasil = null; T.galat = e.message; return; }
    const lain = ((T.kon && T.kon.paket) || []).filter(x => x.status !== 'BATAL' && x.id !== (T.paket && T.paket.id)), e = vol.entri;
    const sblm = lain.filter(x => N(x.tagihanKe) < N(e.tagihanKe));
    const riw = (T.baca && T.baca.data && T.baca.data.riwayatSebelum) || { umKembaliSebelum: 0, retensiSebelum: 0 };
    const riwayat = T.paket ? riw : { umKembaliSebelum: 0, retensiSebelum: 0 };
    if (!T.paket && sblm.length) riwayat.catatan = 'dihitung server saat disimpan';
    T.hasil = BLI.hitung({ jenis: T.l.jenis, kontrak: T.S.kontrak, items: T.S.items, progres: vol, konfig: Object.assign({}, T.konfig, { kategori: T.l.kategori }), riwayat, nilaiRetensiDilepas: T.l.nilaiRetensiDilepas });
    T.entri = e;
    const pb = BLI.bandingkan(T.hasil, Object.assign({}, T.l.pembanding || {}, { bk: T.l.jenis === 'PROGRES' ? { nilai: e.nilai } : null }));
    T.temuanLokal = pb.concat(T.l.jenis === 'PROGRES' && !e.baTerbit ? [{ tingkat: 'INFO', kode: 'BA_BELUM_TERBIT', pesan: 'BA ' + (e.nomorBA || '') + ' belum diterbitkan di Input Progres (wajib sebelum pengajuan bayar).' }] : [])
      .concat(!T.l.vendor.ttdNama ? [{ tingkat: 'PERINGATAN', kode: 'TTD_VENDOR', pesan: 'Nama penandatangan vendor kosong — lengkapi agar kolom TTD tercetak.' }] : []);
    if (T.l.kategori === 'ALAT' && (T.l.lampiran.ts || []).length) { const r = BLI.rekapTimesheet(T.l.lampiran.ts, T.S.items, T.konfig), vp = {}; r.item.forEach(x => { if (x.volTerukur) vp[x.itemId] = x.vol; }); T.tsRekap = r; [].push.apply(T.temuanLokal, r.temuan.concat(BLI.cocokkanVolume('TS', 'Timesheet', vp, vol.ini, T.S.items))); } else T.tsRekap = null;
    if (T.l.kategori === 'BAHAN') { const sj = sjTerpilih(); if (sj.length) { const r = BLI.rekapSuratJalan(sj, T.S.items); T.sjVol = r.vol; [].push.apply(T.temuanLokal, BLI.cocokkanVolume('SJ', 'Surat jalan', r.vol, vol.ini, T.S.items)); } else T.sjVol = null; }
  }
  const sjTerpilih = () => ((T.kon && T.kon.gudang) || []).filter(g => (T.l.lampiran.grIds || []).indexOf(g.id) >= 0);
  function paketCetak(final) {   // data untuk model dokumen — dari paket server bila sudah tersimpan & tidak diubah, selain itu hitung lokal
    const srvOk = T.paket && !T.ubah, P = srvOk ? T.paket : null, h = srvOk ? P.hasil : T.hasil, e = T.entri || {};
    const ck = T.baca && T.baca.checklist, st = {}; ((T.baca && T.baca.template) || []).forEach(s => s.items.forEach(d => { const v = ck && ck.items && ck.items[d.k]; st[d.k] = v ? { status: v.status === 'ADA' ? (ck.verified ? 'TERVERIFIKASI' : 'DIUNGGAH') : v.status === 'NA' ? 'NA' : 'BELUM', ket: v.ket, alasan: v.alasan } : { status: 'BELUM' }; }));
    (P ? P.dokumen || [] : []).filter(d => !d.diganti && d.checklistK).forEach(d => { if (!st[d.checklistK] || st[d.checklistK].status === 'BELUM') st[d.checklistK] = { status: d.status, ket: d.nomor }; });
    return { kategori: T.l.kategori, billingId: P ? P.id : '', kontrak: (P ? P.sumber.kontrak : T.S.kontrak), vendor: T.l.vendor, identitas: identitas(), progres: { id: e.id, tagihanKe: e.tagihanKe, periode: e.periode, tanggal: e.tanggal, nomorBA: e.nomorBA, kodeBA: e.kodeBA }, tanggal: T.l.tanggalDok || e.tanggal,
      revisi: P ? P.revisi : 0, hasil: h, final: !!final, pembuat: { nama: (sesi() || {}).nama, jabatan: (sesi() || {}).jabatan || 'Pengadaan' },
      lampiran: { sj: P ? P.lampiran.sj : sjTerpilih(), sjVol: P ? P.lampiran.sjVol : T.sjVol, ts: T.l.lampiran.ts || [], tsRekap: P ? P.lampiran.tsRekap : T.tsRekap },
      riwayatTermin: ((T.kon && T.kon.paket) || []).filter(x => x.status !== 'BATAL' && x.id !== (P && P.id)).map(x => ({ tagihanKe: x.tagihanKe, nomor: BLI.nomorDok('BAP', x.tagihanKe, x.noKontrak), jenis: x.jenis, prestasi: (x.prestasi || {}).ini || 0, um: 0, ret: 0, dasar: x.dasarTagihan, ppn: x.ppn, total: x.totalTagihan, pph: x.pph, neto: x.neto, status: x.statusEfektif })),
      checklist: { template: (T.baca && T.baca.template) || (T.kon && T.kon.template) || [], status: st, divisi: ck && ck.divisi, pengajuan: ck && ck.pengajuan } };
  }

  /* ---------- buka ---------- */
  async function buka(key, progresId) {
    const g = cariKontrak(key); if (!g) { pesan('Kontrak ' + key + ' tidak ditemukan di Monitoring SAP.', 'error'); return; }
    Object.assign(T, { g, S: sumberDari(g), kon: null, paket: null, baca: null, hasil: null, tab: 'termin', sibuk: 'muat', galat: '', ubah: false, entri: null });
    T.l = { progresId: progresId || '', jenis: 'PROGRES', kategori: kategoriBawaan(g), vendor: Object.assign({}, T.S.vendor), tanggalDok: '', lampiran: { grIds: [], ts: [] }, pembanding: {}, nilaiRetensiDilepas: 0 };
    T.konfig = BLI.konfigBersih({ kategori: T.l.kategori });
    gambar();
    if (terhubung()) {
      try {
        const bon = [...new Set(g.items.map(i => i.noPermintaan || i.noBonPermintaan).filter(Boolean))], kode = [...new Set(T.S.items.map(i => i.kode).filter(Boolean))];
        T.kon = await kirim('blKonteks', { noKontrak: g.key, nomorTerkait: T.S.terkait, bon, kode, idVendor: g.idVendor, namaVendor: g.namaVendor });
        T.konfig = BLI.konfigBersih(T.kon.konfig); T.konfigVersi = T.kon.konfig.versi || 0; T.l.kategori = T.kon.kategori || T.l.kategori;
        if (!T.konfig.ppn.skema && T.kon.konfig.bawaan) T.konfigBawaan = true;
      } catch (e) { T.galat = 'Konteks server: ' + e.message; }
    }
    const E2 = entriKontrak(g);
    if (!T.l.progresId) { const tanpa = E2.filter(e => !((T.kon && T.kon.progres) || []).some(p => p.id === e.id && p.paket)); T.l.progresId = (tanpa[tanpa.length - 1] || E2[E2.length - 1] || {}).id || ''; }
    await pilihBK(T.l.progresId, true);
    T.sibuk = ''; gambar();
  }
  async function pilihBK(id, awal) {
    T.l.progresId = id; T.paket = null; T.baca = null; T.ubah = false;
    const p = ((T.kon && T.kon.progres) || []).find(x => x.id === id);
    if (p && p.paket && terhubung()) {
      try { T.baca = await kirim('blBaca', { id: p.paket.id }); T.paket = T.baca.data; terapkanPaket(); } catch (e) { T.galat = e.message; }
    } else {
      const d = bacaLokal(); if (d && d.l && d.l.progresId === id) { Object.assign(T.l, d.l); if (d.konfig && !T.konfigVersi) T.konfig = BLI.konfigBersih(d.konfig); T.ubah = true; }
    }
    hitungLokal(); if (!awal) gambar();
  }
  function terapkanPaket() {
    const P = T.paket; if (!P) return;
    Object.assign(T.l, { jenis: P.jenis, kategori: P.kategori, vendor: Object.assign({}, T.l.vendor, P.vendor), tanggalDok: P.tanggalDok || '', lampiran: { grIds: (P.lampiran && P.lampiran.grIds) || [], ts: (P.lampiran && P.lampiran.ts) || [] }, pembanding: P.pembanding || {}, nilaiRetensiDilepas: P.nilaiRetensiDilepas || 0 });
  }
  const tandaiUbah = () => { T.ubah = true; simpanLokal(); hitungLokal(); gambar(); };

  /* ---------- tampilan ---------- */
  const TAB = [['termin', 'Termin & BK'], ['konfig', 'Konfigurasi'], ['hitung', 'Perhitungan'], ['lampiran', 'Lampiran'], ['dokumen', 'Dokumen & Checklist'], ['riwayat', 'Riwayat']];
  const lencana = s => `<span class="mp270-st st-${String(s || 'DRAFT').replace(/\s+/g, '-').toLowerCase()}">${E(s || 'DRAFT')}</span>`;
  const temuanHTML = L => (L || []).length ? `<ul class="mp270-tm">${L.map(t => `<li class="${t.tingkat.toLowerCase()}"><b>${E(t.tingkat)}</b> ${E(t.pesan)}</li>`).join('')}</ul>` : '<div class="mp270-ok"><i class="fas fa-circle-check"></i> Tidak ada temuan.</div>';
  function gambar() {
    let w = $('mp270Dlg');
    if (!T.g) { if (w) w.remove(); return; }
    if (!w) { w = document.createElement('div'); w.id = 'mp270Dlg'; w.className = 'mp270-latar'; w.addEventListener('click', e => { if (e.target === w) tutup(); }); document.body.appendChild(w); }
    const g = T.g, S = T.S, P = T.paket, ef = T.baca ? T.baca.efektif : (P ? P.status : '');
    const mode = terhubung() ? (bolehUbah() ? '' : '<div class="mp270-ban">Akun Lihat: hanya dapat membaca paket tagihan.</div>') : '<div class="mp270-ban warn"><i class="fas fa-plug-circle-xmark"></i> Mode pratinjau — Modul server 1.10.0 belum terbit / belum tersambung. Perhitungan & cetak tetap dapat dipakai; paket tidak disimpan.</div>';
    w.innerHTML = `<div class="mp270-dlg" role="dialog" aria-label="Paket tagihan">
      <header><div><div class="mp270-k">PAKET TAGIHAN ${P ? '· <span class="font-monospace">' + E(P.id) + '</span> · Rev. ' + E(P.revisi) : '· baru'}</div>
        <b class="font-monospace">${E(g.key)}</b> ${ef ? lencana(ef) : ''}<div class="mp270-sub">${E(g.namaVendor || '-')} · ${E(S.kontrak.jenisKontrak)} · nilai ${rp(S.kontrak.nilai)} (sebelum PPN) · PO ${E(S.kontrak.noPO || '-')} · ${S.items.filter(i => !i.judul).length} item</div></div>
        <button class="btn-close" onclick="mp270Tutup()" aria-label="Tutup"></button></header>
      ${mode}${T.galat ? `<div class="mp270-ban err">${E(T.galat)}</div>` : ''}
      <nav>${TAB.map(([k, l]) => `<button class="${T.tab === k ? 'on' : ''}" onclick="mp270Tab('${k}')">${l}</button>`).join('')}</nav>
      <section class="mp270-isi">${T.sibuk === 'muat' ? '<div class="mp270-muat"><i class="fas fa-spinner fa-spin"></i> Memuat data kontrak, BK & paket…</div>' : isiTab()}</section>
      <footer>${kaki()}</footer></div>`;
  }
  function kaki() {
    const P = T.paket, h = T.hasil, galat = h && BLI.adaGalat(h.temuan), ok = terhubung() && bolehUbah(), ef = T.baca ? T.baca.efektif : P ? P.status : 'DRAFT', kunci = BLI.TERKUNCI.indexOf(ef) >= 0;
    const st = s => `<button class="btn btn-sm btn-outline-primary" ${T.sibuk ? 'disabled' : ''} onclick="mp270Status('${s}')">${E(s === 'MENUNGGU DOKUMEN' ? 'Terbitkan → Menunggu Dokumen' : s === 'SIAP DIPERIKSA' ? 'Siap Diperiksa' : s === 'DALAM PENYUSUNAN' ? 'Dalam Penyusunan' : s)}</button>`;
    const tr = []; if (P && ok && !kunci) { if (['DRAFT', 'REVISI', 'MENUNGGU DOKUMEN', 'SIAP DIPERIKSA'].indexOf(P.status) >= 0) tr.push(st('DALAM PENYUSUNAN')); if (P.status === 'DALAM PENYUSUNAN') tr.push(st('MENUNGGU DOKUMEN')); if (P.status === 'MENUNGGU DOKUMEN') tr.push(st('SIAP DIPERIKSA')); }
    if (P && ok && admin() && ['MENUNGGU DOKUMEN', 'SIAP DIPERIKSA', 'TERVERIFIKASI'].indexOf(ef) >= 0) tr.push('<button class="btn btn-sm btn-outline-warning" onclick="mp270Status(\'REVISI\')">Kembalikan untuk revisi</button>');
    if (P && ok && ['DIAJUKAN', 'PROSES PEMBAYARAN', 'DIBAYAR', 'BATAL'].indexOf(ef) < 0) tr.push('<button class="btn btn-sm btn-outline-danger" onclick="mp270Status(\'BATAL\')">Batalkan paket</button>');
    return `<div class="mp270-ring">${h ? `Tagihan <b>${rp(h.dasarTagihan)}</b> · PPN ${rp(h.ppn)} · total <b>${rp(h.totalTagihan)}</b> · dibayarkan ${rp(h.neto)}${T.ubah && P ? ' · <span class="text-warning">belum disimpan</span>' : ''}` : 'Pilih BK / termin'}</div>
      <div class="mp270-tb">${tr.join('')}
      <button class="btn btn-sm btn-outline-secondary" onclick="mp270Validasi()" ${h ? '' : 'disabled'}>Validasi</button>
      <button class="btn btn-sm btn-outline-secondary" onclick="mp270Pratinjau()" ${h ? '' : 'disabled'}>Pratinjau</button>
      <button class="btn btn-sm btn-primary" onclick="mp270Simpan()" ${ok && h && !kunci && !T.sibuk ? '' : 'disabled'}>${T.sibuk === 'simpan' ? 'Menyimpan…' : 'Simpan Draft'}</button>
      <button class="btn btn-sm btn-success" onclick="mp270BuatPdf()" ${ok && P && !T.ubah && !galat && !kunci && !T.sibuk ? '' : 'disabled'} title="${!P ? 'Simpan draft dahulu' : T.ubah ? 'Simpan perubahan dahulu' : galat ? 'Perbaiki galat dahulu' : ''}">${T.sibuk === 'pdf' ? E(T.unggah || 'Membuat PDF…') : 'Buat PDF & Kirim ke Monitoring SAP'}</button></div>`;
  }
  function isiTab() {
    const h = T.hasil;
    if (T.tab === 'termin') {
      const E2 = entriKontrak(T.g), sp = (T.kon && T.kon.progres) || [];
      return `<p class="mp270-p">Pilih BK (Input Progres) yang akan ditagihkan. Satu BK = satu paket tagihan. Volume periode ini, sebelumnya & kumulatif dibaca dari seluruh BK kontrak ini.</p>
        ${E2.length ? `<table class="table table-sm mp270-t"><thead><tr><th></th><th>Ke</th><th>No. BA</th><th>Periode</th><th class="text-end">Nilai BK</th><th>BA</th><th>Checklist</th><th>Bayar</th><th>Paket</th></tr></thead><tbody>${E2.map(e => { const s = sp.find(x => x.id === e.id) || {};
          return `<tr class="${T.l.progresId === e.id ? 'pilih' : ''}" onclick="mp270BK('${E(e.id)}')"><td><input type="radio" name="mp270bk" ${T.l.progresId === e.id ? 'checked' : ''}></td><td>${E(e.tagihanKe)}</td><td class="font-monospace small">${E(e.nomorBA || '-')}</td><td>${E(e.periode || '')}</td><td class="text-end">${rp(e.nilai)}</td><td>${e.baTerbit ? '<span class="badge text-bg-success">terbit</span>' : '<span class="badge text-bg-secondary">draf</span>'}</td>
            <td>${s.checklist ? s.checklist.lengkap + '/' + s.checklist.total + (s.checklist.verified ? ' ✓' : '') : '-'}</td><td>${E((e.bayar && e.bayar.status) || s.bayar || 'BELUM')}</td><td>${s.paket ? lencana(s.paket.status) : '-'}</td></tr>`; }).join('')}</tbody></table>`
          : `<div class="mp270-ban warn">Belum ada BK untuk kontrak ini. <a href="#" onclick="mp270Tutup(); bukaTab('form-progres'); return false;">Input Progres dahulu</a> — paket tagihan selalu berdasarkan BK resmi.</div>`}
        <div class="mp270-g">
          <label>Jenis tagihan<select class="form-select form-select-sm" onchange="mp270L('jenis', this.value)" ${T.paket ? 'disabled' : ''}>${BLI.JENIS_TAGIHAN.map(j => `<option ${T.l.jenis === j ? 'selected' : ''} value="${j}">${{ PROGRES: 'Progres / prestasi', UANG_MUKA: 'Uang muka', RETENSI: 'Pelepasan retensi' }[j]}</option>`).join('')}</select></label>
          <label>Kategori<select class="form-select form-select-sm" onchange="mp270L('kategori', this.value)">${BLI.KATEGORI.map(k => `<option ${T.l.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select><small>Bawaan dari jenis kontrak; tetapkan di Konfigurasi bila berbeda.</small></label>
          <label>Tanggal dokumen<input type="date" class="form-control form-control-sm" value="${E(T.l.tanggalDok || (T.entri && T.entri.tanggal) || '')}" onchange="mp270L('tanggalDok', this.value)"></label>
          ${T.l.jenis === 'RETENSI' ? `<label>Retensi dilepas (Rp)<input type="number" class="form-control form-control-sm" value="${E(T.l.nilaiRetensiDilepas)}" onchange="mp270L('nilaiRetensiDilepas', +this.value)"></label>` : ''}
          <label>Penandatangan vendor<input class="form-control form-control-sm" value="${E(T.l.vendor.ttdNama)}" onchange="mp270V('ttdNama', this.value)"></label>
          <label>Jabatan<input class="form-control form-control-sm" value="${E(T.l.vendor.ttdJabatan)}" onchange="mp270V('ttdJabatan', this.value)"></label>
          <label class="lebar">Alamat vendor<input class="form-control form-control-sm" value="${E(T.l.vendor.alamat)}" onchange="mp270V('alamat', this.value)"></label>
          <label>NPWP vendor<input class="form-control form-control-sm" value="${E(T.l.vendor.npwp)}" onchange="mp270V('npwp', this.value)"></label></div>`;
    }
    if (T.tab === 'konfig') {
      const k = T.konfig, ppn = k.ppn, dis = terhubung() && bolehUbah() ? '' : 'disabled';
      const sewa = T.l.kategori === 'ALAT' ? `<h6>Dasar sewa per item (sesuai kontrak)</h6><table class="table table-sm mp270-t"><thead><tr><th>Item</th><th>Sat</th><th>Basis</th><th>Min. jam/hari</th><th>Hari/bulan</th><th>Jam/bulan</th></tr></thead><tbody>${T.S.items.filter(i => !i.judul).map(i => { const c = k.sewa[i.id] || {};
        return `<tr><td>${E(i.uraian)}</td><td>${E(i.sat)}</td><td><select class="form-select form-select-sm" onchange="mp270Sewa('${E(i.id)}','basis',this.value)"><option value="">otomatis (${BLI.basisDariSatuan(i.sat)})</option>${['JAM', 'HARI', 'BULAN', 'TETAP'].map(b => `<option ${c.basis === b ? 'selected' : ''}>${b}</option>`).join('')}</select></td>
          ${['jamMinHari', 'hariPerBulan', 'jamPerBulan'].map(f => `<td><input type="number" class="form-control form-control-sm" value="${E(c[f] || '')}" onchange="mp270Sewa('${E(i.id)}','${f}',+this.value)"></td>`).join('')}</tr>`; }).join('')}</tbody></table>` : '';
      return `<p class="mp270-p">Konfigurasi berlaku per kontrak dan dipakai seluruh termin. <b>Tarif PPN tidak pernah diisi otomatis</b>; pilih skema sesuai perlakuan pajak yang berlaku untuk kontrak ini.${T.konfigBawaan ? ' Kontrak ini belum punya konfigurasi — nilai di bawah dari bawaan proyek.' : ''}</p>
        <div class="mp270-g">
          <label>Kategori<select class="form-select form-select-sm" onchange="mp270K('kategori',this.value)">${BLI.KATEGORI.map(x => `<option ${T.l.kategori === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label>Uang muka (%)<input type="number" step="any" class="form-control form-control-sm" value="${E(k.uangMukaPersen)}" onchange="mp270K('uangMukaPersen',+this.value)"></label>
          <label>atau nilai UM (Rp)<input type="number" class="form-control form-control-sm" value="${E(k.uangMukaNilai || '')}" onchange="mp270K('uangMukaNilai',+this.value)"></label>
          <label>Retensi (%)<input type="number" step="any" class="form-control form-control-sm" value="${E(k.retensiPersen)}" onchange="mp270K('retensiPersen',+this.value)"></label>
          <label>Skema PPN<select class="form-select form-select-sm" onchange="mp270P('skema',this.value)"><option value="">— pilih —</option>${BLI.SKEMA_PPN.map(s => `<option ${ppn.skema === s ? 'selected' : ''} value="${s}">${{ NORMAL: 'Normal (DPP = tagihan)', NILAI_LAIN: 'DPP nilai lain (mis. 11/12)', TIDAK_DIPUNGUT: 'Tidak dipungut', DIBEBASKAN: 'Dibebaskan' }[s]}</option>`).join('')}</select></label>
          <label>Tarif PPN (%)<input type="number" step="any" class="form-control form-control-sm" value="${ppn.tarif === null ? '' : E(ppn.tarif)}" placeholder="wajib diisi" onchange="mp270P('tarif',this.value===''?null:+this.value)"></label>
          ${ppn.skema === 'NILAI_LAIN' ? `<label>Faktor DPP<span class="d-flex gap-1"><input type="number" class="form-control form-control-sm" value="${ppn.pembilang}" onchange="mp270P('pembilang',+this.value)"> / <input type="number" class="form-control form-control-sm" value="${ppn.penyebut}" onchange="mp270P('penyebut',+this.value)"></span></label>
            <label class="cek"><input type="checkbox" ${ppn.perItem ? 'checked' : ''} onchange="mp270P('perItem',this.checked)"> DPP per baris barang (seperti e-Faktur)</label>` : ''}
          <label class="cek"><input type="checkbox" ${ppn.dipungut ? 'checked' : ''} onchange="mp270P('dipungut',this.checked)"> PPN dipungut & disetor Pihak Pertama (pemungut PPN)</label>
          ${['TIDAK_DIPUNGUT', 'DIBEBASKAN'].indexOf(ppn.skema) >= 0 ? `<label class="lebar">Dasar hukum / keterangan<input class="form-control form-control-sm" value="${E(ppn.keterangan)}" onchange="mp270P('keterangan',this.value)"></label>` : ''}
          <label>Jenis PPh<input class="form-control form-control-sm" value="${E(k.pph.jenis)}" placeholder="mis. PPh 4(2) / PPh 22 / PPh 23" onchange="mp270H('jenis',this.value)"></label>
          <label>Tarif PPh (%)<input type="number" step="any" class="form-control form-control-sm" value="${E(k.pph.tarif)}" onchange="mp270H('tarif',+this.value)"></label>
          <label>Pembulatan<select class="form-select form-select-sm" onchange="mp270K('pembulatan',this.value)"><option value="KOMPONEN" ${k.pembulatan !== 'AKHIR' ? 'selected' : ''}>Per komponen (baris BAP selalu bertambah tepat)</option><option value="AKHIR" ${k.pembulatan === 'AKHIR' ? 'selected' : ''}>Di akhir (neto dari nilai eksak)</option></select></label>
          <label>Nilai kontrak setelah addendum (Rp)<input type="number" class="form-control form-control-sm" value="${E(k.nilaiAddendum || '')}" onchange="mp270K('nilaiAddendum',+this.value)"></label>
          <label>No. addendum<input class="form-control form-control-sm" value="${E(k.noAddendum)}" onchange="mp270K('noAddendum',this.value)"></label>
          <label class="cek"><input type="checkbox" ${k.izinLebihVolume ? 'checked' : ''} onchange="mp270K('izinLebihVolume',this.checked)"> Volume boleh melebihi kontrak (berdasarkan addendum di atas)</label></div>
        <div class="mp270-g"><label class="lebar">Potongan lain (nama = nilai Rp atau persen%, satu per baris)<textarea class="form-control form-control-sm" rows="2" onchange="mp270Lain(this.value)">${E(k.potonganLain.map(p => p.nama + ' = ' + (p.nilai || p.persen + '%')).join('\n'))}</textarea></label></div>
        ${sewa}
        <div class="mp270-tb"><button class="btn btn-sm btn-primary" ${dis} onclick="mp270SimpanKonfig()">Simpan konfigurasi kontrak</button>${T.konfigVersi ? `<span class="small text-muted">versi ${T.konfigVersi}</span>` : ''}</div>`;
    }
    if (T.tab === 'hitung') {
      if (!h) return '<div class="mp270-ban warn">Pilih BK terlebih dahulu.</div>';
      const tm = h.temuan.concat(T.temuanLokal || [], (T.paket && !T.ubah && T.paket.temuanServer) || []);
      return `<div class="mp270-kpi">${[['Nilai kontrak (sebelum PPN)', h.nilaiKontrak], ['Prestasi s/d lalu', h.prestasi.lalu, pc(h.persen.lalu)], ['Prestasi periode ini', h.prestasi.ini, pc(h.persen.ini)], ['Prestasi s/d saat ini', h.prestasi.sd, pc(h.persen.sd)], ['Sisa nilai kontrak', Math.max(0, h.batasNilai - h.prestasi.sd)]].map(x => `<div><span>${x[0]}</span><b>${rp(x[1])}</b>${x[2] ? `<i>${x[2]}</i>` : ''}</div>`).join('')}</div>
        <div class="mp270-dua"><div><h6>Rincian volume (BK)</h6><div class="mp270-gulir"><table class="table table-sm mp270-t"><thead><tr><th>No</th><th>Uraian</th><th>Sat</th><th class="text-end">Kontrak</th><th class="text-end">Lalu</th><th class="text-end">Ini</th><th class="text-end">S/d</th><th class="text-end">Sisa</th><th class="text-end">Harga</th><th class="text-end">Jumlah ini</th></tr></thead>
          <tbody>${h.items.map(r => r.judul ? `<tr class="judul"><td></td><td colspan="9">${E(r.uraian)}</td></tr>` : `<tr class="${r.sisa < 0 ? 'lebih' : ''}"><td>${r.no}</td><td>${E(r.uraian)}</td><td>${E(r.sat)}</td><td class="text-end">${ang(r.vol)}</td><td class="text-end">${ang(r.lalu)}</td><td class="text-end">${ang(r.ini)}</td><td class="text-end">${ang(r.sd)}</td><td class="text-end">${ang(r.sisa)}</td><td class="text-end">${rp(r.harga)}</td><td class="text-end">${rp(r.jmlIni)}</td></tr>`).join('')}</tbody></table></div></div>
        <div><h6>Perhitungan pembayaran</h6><table class="table table-sm mp270-t bayar">${BLD.barisBayar(h).map(b => `<tr class="${b.tebal ? 'fw-bold' : ''}"><td>${E(b.no)}</td><td>${E(b.label)}</td><td class="text-end">${E(b.pct)}</td><td>${E(b.tanda === '=' ? '' : b.tanda)}</td><td class="text-end">${E(b.nilai)}</td></tr>`).join('')}</table>
          <div class="small text-muted">Terbilang: ${E(BLI.terbilangRp(h.totalTagihan))}</div>
          ${h.pembulatan.length ? `<details class="small mt-2"><summary>Jejak pembulatan (${h.pembulatan.length})</summary>${h.pembulatan.map(l => `<div>${E(l.komponen)}: ${E(l.eksak)} → ${E(l.bulat)}</div>`).join('')}</details>` : ''}
          <h6 class="mt-3">Temuan & kontrol</h6>${temuanHTML(tm)}</div></div>`;
    }
    if (T.tab === 'lampiran') {
      let isi = '';
      if (T.l.kategori === 'BAHAN') {
        const G = (T.kon && T.kon.gudang) || [];
        isi = `<h6>Penerimaan gudang (surat jalan) untuk tagihan ini</h6><p class="mp270-p">Dari menu Penerimaan Material; satu surat jalan hanya dapat ditagihkan di satu paket.</p>
          ${G.length ? `<table class="table table-sm mp270-t"><thead><tr><th></th><th>Tanggal</th><th>No. SJ</th><th>Material</th><th class="text-end">Qty</th><th>Bon</th><th>Status</th></tr></thead><tbody>${G.map(x => { const dipakai = x.dipakai && (!T.paket || x.dipakai !== T.paket.id);
            return `<tr class="${dipakai ? 'mati' : ''}"><td><input type="checkbox" ${dipakai ? 'disabled' : ''} ${(T.l.lampiran.grIds || []).indexOf(x.id) >= 0 ? 'checked' : ''} onchange="mp270GR('${E(x.id)}',this.checked)"></td><td>${E(x.tanggal)}</td><td>${E(x.noSJ)}</td><td>${E(x.uraian)}</td><td class="text-end">${ang(x.qty)} ${E(x.sat)}</td><td class="small">${E(x.bonNomor)}</td><td>${dipakai ? 'dipakai ' + E(x.dipakai) : ''}</td></tr>`; }).join('')}</tbody></table>` : '<div class="mp270-ban">Tidak ada penerimaan gudang yang cocok dengan bon / kode material kontrak ini.</div>'}`;
      }
      if (T.l.kategori === 'ALAT') {
        const ts = T.l.lampiran.ts || [];
        isi = `<h6>Timesheet alat</h6><p class="mp270-p">Satu blok per unit. Tempel dari Excel: kolom <i>tanggal (YYYY-MM-DD) · mulai (07:00) · selesai (17:00) · istirahat (jam) · jam kerja (opsional) · keterangan</i>.</p>
          ${ts.map((u, i) => `<div class="mp270-ts"><div class="mp270-g"><label>Item kontrak<select class="form-select form-select-sm" onchange="mp270TS(${i},'itemId',this.value)">${T.S.items.filter(x => !x.judul).map(x => `<option value="${E(x.id)}" ${u.itemId === x.id ? 'selected' : ''}>${E(x.uraian)} (${E(x.sat)})</option>`).join('')}</select></label>
            <label>Unit / No. Pol / SN<input class="form-control form-control-sm" value="${E(u.unit)}" onchange="mp270TS(${i},'unit',this.value)"></label><label>Operator<input class="form-control form-control-sm" value="${E(u.operator)}" onchange="mp270TS(${i},'operator',this.value)"></label>
            <label class="lebar">Baris (${(u.baris || []).length} hari)<textarea class="form-control form-control-sm font-monospace" rows="4" onchange="mp270TSBaris(${i},this.value)">${E((u.baris || []).map(b => [b.tgl, b.mulai, b.selesai, b.istirahat, b.jam, b.ket].join('\t')).join('\n'))}</textarea></label></div>
            <button class="btn btn-sm btn-link text-danger" onclick="mp270TSHapus(${i})">hapus unit</button></div>`).join('')}
          <button class="btn btn-sm btn-outline-primary" onclick="mp270TSTambah()">+ Unit alat</button>
          ${T.tsRekap ? `<h6 class="mt-3">Rekap</h6><table class="table table-sm mp270-t"><thead><tr><th>Item</th><th>Basis</th><th class="text-end">Hari</th><th class="text-end">Jam</th><th class="text-end">Jam ditagih</th><th class="text-end">Volume timesheet</th></tr></thead><tbody>${T.tsRekap.item.map(x => `<tr><td>${E(x.uraian)}</td><td>${E(x.basis)}</td><td class="text-end">${x.hari}</td><td class="text-end">${ang(x.jam)}</td><td class="text-end">${ang(x.jamTagih)}</td><td class="text-end">${x.volTerukur ? ang(x.vol) : '-'}</td></tr>`).join('')}</tbody></table>` : ''}`;
      }
      const pb = T.l.pembanding || {}, f = (k, j, l) => `<label>${l}<input type="number" class="form-control form-control-sm" value="${E((pb[k] || {})[j] ?? '')}" onchange="mp270PB('${k}','${j}',this.value)"></label>`;
      return isi + `<h6 class="mt-3">Angka dokumen resmi vendor (kontrol silang)</h6><p class="mp270-p">Isi dari invoice / faktur / kwitansi yang diterbitkan vendor. Perbedaan terhadap perhitungan ditandai pada tab Perhitungan & Validasi.</p>
        <div class="mp270-g">${f('invoice', 'hargaJual', 'Invoice: harga jual')}${f('invoice', 'ppn', 'Invoice: PPN')}${f('invoice', 'total', 'Invoice: total')}${f('faktur', 'dpp', 'Faktur: DPP')}${f('faktur', 'ppn', 'Faktur: PPN')}${f('kwitansi', 'total', 'Kwitansi: total')}</div>`;
    }
    if (T.tab === 'dokumen') return tabDokumen();
    if (T.tab === 'riwayat') {
      const R = (T.baca && T.baca.riwayat) || [];
      return R.length ? `<table class="table table-sm mp270-t"><thead><tr><th>Waktu</th><th>Oleh</th><th>Aksi</th><th>Ringkas</th><th>Alasan</th><th>Sebelum → sesudah</th></tr></thead><tbody>${R.map(r => { const d = r.data || {}, s = d.sebelum && d.sebelum.hasil, t = d.sesudah && d.sesudah.hasil;
        return `<tr><td class="small">${E(String(r.waktu).replace('T', ' ').slice(0, 16))}</td><td>${E(r.oleh)}</td><td>${E(r.aksi)}</td><td class="small">${E(r.ringkas)}</td><td class="small">${E(r.alasan)}</td><td class="small">${s && t ? 'total ' + rp(s.total) + ' → ' + rp(t.total) : ''}</td></tr>`; }).join('')}</tbody></table>` : '<div class="mp270-ban">Belum ada riwayat (paket belum disimpan).</div>';
    }
    return '';
  }
  function tabDokumen() {
    const P = T.paket, daftar = BLD.daftar(T.l.kategori), D = (P && P.dokumen) || [], ck = T.baca && T.baca.checklist, syarat = (T.baca && T.baca.syarat) || BLI.syaratKondisional(T.l.kategori, { items: T.S.items, uangMuka: T.hasil && T.hasil.uangMuka.total, persenSd: T.hasil && T.hasil.persen.sd, jenis: T.l.jenis });
    const ok = terhubung() && bolehUbah() && P;
    const baris = daftar.map(d => { const L = D.filter(x => x.kode === d.kode && !x.diganti), gen = L.find(x => x.jenisFile === 'GENERATED'), ttd = L.find(x => x.jenisFile !== 'GENERATED');
      const st = ttd ? ttd.status : gen ? gen.status : 'BELUM', cki = d.checklist && ck && ck.items && ck.items[d.checklist];
      return `<tr><td><label class="cek"><input type="checkbox" class="mp270-pilih" value="${d.kode}" checked> ${E(d.nama)}</label>${d.checklist ? `<div class="small text-muted">checklist ${E(d.checklist)}${cki ? ' · ' + E(cki.status) : ''}</div>` : ''}</td>
        <td>${E(BLI.DOK_LABEL[st] || st)}${gen ? `<div class="small"><a href="#" onclick="mp270Berkas('${E(gen.file.idServer)}');return false">PDF Rev.${E(gen.revisi)}</a></div>` : ''}${ttd ? `<div class="small"><a href="#" onclick="mp270Berkas('${E(ttd.file.idServer)}');return false">${ttd.jenisFile === 'VENDOR' ? 'dok. vendor' : 'bertanda tangan'}</a></div>` : ''}</td>
        <td class="text-nowrap"><button class="btn btn-sm btn-link" onclick="mp270Pratinjau('${d.kode}')">pratinjau</button>
          ${ok ? `<label class="btn btn-sm btn-link mb-0">unggah ${['INVOICE', 'KWITANSI'].indexOf(d.kode) >= 0 ? 'resmi vendor' : 'TTD'}<input type="file" accept="application/pdf" hidden onchange="mp270UnggahTTD('${d.kode}', this)"></label>` : ''}
          ${ok && ttd && d.checklist ? `<button class="btn btn-sm btn-link" onclick="mp270KeCK('${E(ttd.documentId)}')">pasang ke checklist</button>` : ''}
          ${ok && admin() && ttd ? `<button class="btn btn-sm btn-link text-warning" onclick="mp270DokSt('${E(ttd.documentId)}','PERLU_REVISI')">perlu revisi</button>` : ''}</td></tr>`; }).join('');
    const na = Object.keys(syarat).filter(k => syarat[k].berlaku === false && !(ck && ck.items && ck.items[k] && ck.items[k].status === 'ADA'));
    return `<p class="mp270-p">Dokumen disusun dari satu perhitungan. Draf hasil generator <b>tidak</b> memuat tanda tangan, cap, meterai, invoice resmi, faktur pajak atau jurnal — unggah dokumen yang sudah ditandatangani / diterbitkan vendor, lalu pasang ke Checklist Tagihan. Verifikasi tetap oleh Admin di Monitoring SAP.</p>
      <table class="table table-sm mp270-t"><thead><tr><th>Dokumen</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${baris}</tbody></table>
      ${ck ? `<div class="small">Checklist BK: <b>${E(ck.kategori)}</b> · ${T.baca.checklistHitung ? T.baca.checklistHitung.lengkap + '/' + T.baca.checklistHitung.total + ' lengkap' : '-'} · ${ck.verified ? '<span class="text-success">diverifikasi Admin</span>' : 'belum diverifikasi'}</div>` : ''}
      ${na.length && ok ? `<h6 class="mt-3">Saran "Tidak berlaku"</h6><div class="small">${na.map(k => `<label class="cek d-block"><input type="checkbox" class="mp270-na" value="${k}" data-alasan="${E(syarat[k].alasan)}"> ${E(k)} — ${E(syarat[k].alasan)}</label>`).join('')}</div>
        <button class="btn btn-sm btn-outline-primary mt-1" onclick="mp270TerapkanNA()">Terapkan pilihan sebagai Tidak berlaku di checklist</button>` : ''}
      ${Object.keys(syarat).filter(k => syarat[k].berlaku === 'cek').map(k => `<div class="small text-muted">Periksa: ${E(k)} — ${E(syarat[k].alasan)}</div>`).join('')}
      ${ok && T.unggah ? `<div class="mp270-ban">${E(T.unggah)}</div>` : ''}`;
  }

  /* ---------- aksi ---------- */
  async function simpan() {
    if (!terhubung()) return pesan('Modul server 1.10.0 belum aktif: paket tidak dapat disimpan.', 'error');
    const P = T.paket; let alasan = '';
    if (P && (P.dokumen || []).some(d => !d.diganti) && T.ubah) { alasan = prompt('Perhitungan/isi paket berubah setelah dokumen terbit. Alasan revisi (min. 8 karakter):', ''); if (alasan === null) return; }
    T.sibuk = 'simpan'; T.galat = ''; gambar();
    try {
      const d = { noKontrak: T.g.key, nomorTerkait: T.S.terkait, progresId: T.l.progresId, jenis: T.l.jenis, sumber: { kontrak: T.S.kontrak, items: T.S.items, dasar: T.S.dasar }, vendor: T.l.vendor, tanggalDok: T.l.tanggalDok, lampiran: { grIds: T.l.lampiran.grIds, ts: T.l.lampiran.ts }, pembanding: T.l.pembanding, nilaiRetensiDilepas: T.l.nilaiRetensiDilepas, alasan };
      if (P) Object.assign(d, { id: P.id, versi: P.versi });
      const r = await tulis('blSimpan', d);
      T.paket = r.data; T.ubah = false; hapusLokal();
      await muatUlang();
      pesan('Paket tagihan ' + T.paket.id + ' tersimpan (v' + T.paket.versi + ', Rev. ' + T.paket.revisi + ').', 'ok');
    } catch (e) { T.galat = e.message; }
    T.sibuk = ''; gambar();
  }
  async function muatUlang() {
    if (!terhubung()) return;
    T.kon = await kirim('blKonteks', { noKontrak: T.g.key, nomorTerkait: T.S.terkait, bon: [...new Set(T.g.items.map(i => i.noPermintaan || i.noBonPermintaan).filter(Boolean))], kode: [...new Set(T.S.items.map(i => i.kode).filter(Boolean))], idVendor: T.g.idVendor, namaVendor: T.g.namaVendor });
    if (T.paket) { T.baca = await kirim('blBaca', { id: T.paket.id }); T.paket = T.baca.data; terapkanPaket(); }
    hitungLokal();
  }
  async function simpanKonfig() {
    let alasan = ''; if (T.konfigVersi) { alasan = prompt('Alasan perubahan konfigurasi tagihan kontrak (min. 8 karakter):', ''); if (alasan === null) return; }
    T.sibuk = 'konfig'; gambar();
    try { const r = await kirim('blKonfigSimpan', { noKontrak: T.g.key, versi: T.konfigVersi || 0, konfig: Object.assign({}, T.konfig, { kategori: T.l.kategori }), alasan }); T.konfig = BLI.konfigBersih(r.data); T.konfigVersi = r.data.versi; T.konfigBawaan = false; pesan('Konfigurasi tagihan kontrak tersimpan (versi ' + r.data.versi + ').', 'ok'); if (T.paket) T.ubah = true; hitungLokal(); }
    catch (e) { T.galat = e.message; }
    T.sibuk = ''; gambar();
  }
  async function ubahStatus(ke) {
    const P = T.paket; if (!P) return; let alasan = '';
    if (ke === 'REVISI' || ke === 'BATAL') { alasan = prompt(ke === 'REVISI' ? 'Alasan dikembalikan untuk revisi (min. 12 karakter):' : 'Alasan pembatalan paket (min. 12 karakter):', ''); if (alasan === null) return; }
    T.sibuk = 'status'; gambar();
    try { const r = await tulis('blStatus', { id: P.id, versi: P.versi, ke, alasan }); T.paket = r.data; await muatUlang(); pesan('Status paket: ' + ke, 'ok'); } catch (e) { T.galat = e.message; }
    T.sibuk = ''; gambar();
  }
  function opsiCetak() { const I = identitas(); return { logo: I.logo, namaKop: I.namaKop, alamatKop: I.alamatKop, judul: T.g.key }; }
  function pratinjau(kode) {
    const p = paketCetak(false), M = kode ? [BLD.buat(p, kode)].filter(Boolean) : BLD.semua(p);
    if (!M.length) return pesan('Dokumen tidak tersedia untuk jenis tagihan ini.', '');
    let w = $('mp270Pv'); if (!w) { w = document.createElement('div'); w.id = 'mp270Pv'; w.className = 'mp270-latar atas'; document.body.appendChild(w); }
    w.innerHTML = `<div class="mp270-dlg pv"><header><b>Pratinjau ${E(kode ? (BLD.JUDUL[kode] || kode) : 'paket (' + M.length + ' dokumen)')}</b><div class="d-flex gap-2"><button class="btn btn-sm btn-primary" onclick="document.getElementById('mp270Frame').contentWindow.print()">Cetak / Simpan PDF (browser)</button><button class="btn-close" onclick="document.getElementById('mp270Pv').remove()"></button></div></header><iframe id="mp270Frame" title="Pratinjau dokumen"></iframe></div>`;
    $('mp270Frame').srcdoc = BLRH.dokumen(M, opsiCetak());
  }
  async function buatPdf() {
    const P = T.paket; if (!P) return;
    const pilih = [...document.querySelectorAll('.mp270-pilih:checked')].map(x => x.value), kode = pilih.length ? pilih : BLD.daftar(P.kategori).map(d => d.kode);
    T.sibuk = 'pdf'; T.unggah = 'Memuat pustaka PDF…'; T.galat = ''; gambar();
    try {
      const PDFLib = await BLK.muatPdfLib(), p = paketCetak(false), M = BLD.semua(p, kode), o = opsiCetak();
      let paket = T.paket;
      for (let i = 0; i < M.length; i++) {
        const m = M[i]; T.unggah = 'PDF ' + (i + 1) + '/' + M.length + ': ' + m.judul; gambar();
        const r = await BLRP.satu(PDFLib, m, Object.assign({ kataKunci: [paket.id, m.kode, paket.noKontrak], versiMesin: BLI.VERSI }, o));
        const f = await BLK.unggah(kirim, r.bytes, { nama: m.kode + ' ' + paket.tagihanKe + ' Rev' + paket.revisi + '.pdf', jenis: m.kode, ket: paket.noKontrak }, x => { T.unggah = 'Mengunggah ' + m.judul + ' ' + Math.round(x * 100) + '%'; gambar(); });
        paket = (await tulis('blDokumen', { id: paket.id, versi: paket.versi, dok: { aksi: 'TERBIT', kode: m.kode, nomor: m.nomor, file: f, sidikHitung: paket.sidik, halaman: r.halaman } })).data;
      }
      T.unggah = 'Menyusun bundel PDF…'; gambar();
      const b = await BLRP.bundel(PDFLib, M, Object.assign({ judul: paket.id, sampul: ['Paket tagihan : ' + paket.id + ' (Rev. ' + paket.revisi + ')', 'Kontrak : ' + paket.noKontrak, 'Vendor : ' + (T.l.vendor.nama || ''), 'BK : ' + (paket.nomorBA || '-') + ' · ' + (paket.periode || ''), 'Total tagihan (+PPN) : ' + rp(paket.hasil.totalTagihan)],
        catatanSampul: 'Bundel draf dari generator. Dokumen bertanda tangan & dokumen resmi vendor diunggah terpisah dan diverifikasi di Checklist Tagihan.' }, o));
      const fb = await BLK.unggah(kirim, b.bytes, { nama: 'BUNDEL ' + paket.id + ' Rev' + paket.revisi + '.pdf', jenis: 'BUNDEL', ket: paket.noKontrak, potong: 2500000 }, x => { T.unggah = 'Mengunggah bundel ' + Math.round(x * 100) + '%'; gambar(); });
      paket = (await tulis('blDokumen', { id: paket.id, versi: paket.versi, dok: { aksi: 'TERBIT', kode: 'BUNDEL', nomor: paket.id, file: fb, sidikHitung: paket.sidik, halaman: b.halaman } })).data;
      T.paket = paket; await muatUlang(); T.tab = 'dokumen';
      pesan(M.length + ' PDF + bundel (' + b.halaman + ' hal) tersimpan di Drive proyek & tertaut ke paket ' + paket.id + '.', 'ok');
    } catch (e) { T.galat = 'Buat PDF: ' + e.message; }
    T.unggah = ''; T.sibuk = ''; gambar();
  }
  async function unggahTTD(kode, input) {
    const f = input.files && input.files[0]; if (!f) return;
    if (f.size > 10 * 1024 * 1024) return pesan('PDF untuk checklist maksimal 10 MB.', 'error');
    const P = T.paket, vendor = ['INVOICE', 'KWITANSI'].indexOf(kode) >= 0;
    let nilai = null;
    if (vendor) { const t = prompt('Total pada ' + kode.toLowerCase() + ' resmi vendor (Rp, untuk kontrol silang; kosongkan bila tidak ada):', ''); if (t === null) return; nilai = { total: N(String(t).replace(/[^\d]/g, '')) || undefined }; }
    T.sibuk = 'unggah'; T.unggah = 'Mengunggah ' + f.name + '…'; gambar();
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const ref = await BLK.unggah(kirim, bytes, { nama: f.name, jenis: kode + (vendor ? '-VENDOR' : '-TTD'), ket: P.noKontrak }, x => { T.unggah = 'Mengunggah ' + Math.round(x * 100) + '%'; gambar(); });
      T.paket = (await tulis('blDokumen', { id: P.id, versi: P.versi, dok: { aksi: vendor ? 'VENDOR' : 'UNGGAH_TTD', kode, file: ref, nilai } })).data; await muatUlang();
      pesan(f.name + ' diunggah ke paket ' + P.id + '.', 'ok');
    } catch (e) { T.galat = e.message; }
    T.unggah = ''; T.sibuk = ''; gambar();
  }
  async function keChecklist(documentId) { try { await kirim('blKeChecklist', { id: T.paket.id, pasang: [{ documentId }] }); await muatUlang(); pesan('Dokumen dipasang ke Checklist Tagihan (menunggu verifikasi Admin).', 'ok'); } catch (e) { T.galat = e.message; } gambar(); }
  async function terapkanNA() { const L = [...document.querySelectorAll('.mp270-na:checked')].map(x => ({ k: x.value, alasan: x.dataset.alasan })); if (!L.length) return; try { await kirim('blKeChecklist', { id: T.paket.id, na: L }); await muatUlang(); pesan(L.length + ' baris checklist ditandai Tidak berlaku.', 'ok'); } catch (e) { T.galat = e.message; } gambar(); }
  async function dokStatus(documentId, st) { const alasan = prompt('Alasan dokumen perlu revisi (min. 8 karakter):', ''); if (alasan === null) return; try { T.paket = (await tulis('blDokumen', { id: T.paket.id, versi: T.paket.versi, dok: { aksi: 'STATUS', kode: (T.paket.dokumen.find(d => d.documentId === documentId) || {}).kode, documentId, status: st, alasan } })).data; await muatUlang(); } catch (e) { T.galat = e.message; } gambar(); }
  async function bukaBerkas(id) {
    try { const s = sesi(), r = await window.regPost({ action: 'ambilBerkas', nama: s.nama, pin: s.pin, proyek: pid(), id }); if (!r || !r.ok) throw new Error((r && r.error) || 'Berkas tidak dapat dibuka.');
      const raw = Uint8Array.from(atob(r.data), c => c.charCodeAt(0)), u = URL.createObjectURL(new Blob([raw], { type: 'application/pdf' })); window.open(u, '_blank'); } catch (e) { pesan(e.message, 'error'); }
  }
  function validasi() {
    hitungLokal();
    const h = T.hasil, tm = h.temuan.concat(T.temuanLokal || [], (T.paket && !T.ubah && T.paket.temuanServer) || []);
    let w = $('mp270Pv'); if (!w) { w = document.createElement('div'); w.id = 'mp270Pv'; w.className = 'mp270-latar atas'; document.body.appendChild(w); }
    const masalah = tm.filter(t => t.tingkat !== 'INFO');
    w.innerHTML = `<div class="mp270-dlg kecil"><header><b>Validasi paket tagihan</b><button class="btn-close" onclick="document.getElementById('mp270Pv').remove()"></button></header><section class="mp270-isi">
      <p class="mp270-p">Validasi deterministik (mesin tagihan ${BLI.VERSI}): volume ≤ kontrak, nilai ≤ batas kontrak/addendum, PPN dikonfigurasi, kecocokan BK, timesheet, surat jalan & dokumen vendor.</p>${temuanHTML(tm)}
      ${masalah.length ? `<button class="btn btn-sm btn-outline-primary" onclick="mp270SuratRevisi()">Buat draf surat permintaan perbaikan ke vendor</button>` : ''}
      ${srv('asistenAI') ? `<button class="btn btn-sm btn-outline-secondary ms-1" onclick="mp270AI()" title="Mengirim ringkasan angka & temuan (tanpa PDF) ke Asisten AI">Minta saran Asisten AI</button><div id="mp270AIJ" class="small mt-2"></div>` : ''}</section></div>`;
  }
  function suratRevisi() {
    const h = T.hasil, tm = h.temuan.concat(T.temuanLokal || [], (T.paket && T.paket.temuanServer) || []).filter(t => t.tingkat !== 'INFO'), I = identitas(), e = T.entri || {};
    const m = { kode: 'SURAT', judul: 'PERMINTAAN PERBAIKAN DOKUMEN TAGIHAN', nomor: '...../WK-NK.KSO/PDBJ/' + new Date().getFullYear(), orientasi: 'P', tandaAir: 'DRAF', kaki: T.g.key,
      blok: [{ t: 'kop' }, { t: 'judul', teks: 'PERMINTAAN PERBAIKAN DOKUMEN TAGIHAN', nomor: 'Nomor : ...../WK-NK.KSO/PDBJ/' + new Date().getFullYear() },
        { t: 'info', lebar: 90, baris: [['', 'Kepada', ': **' + (T.l.vendor.nama || '') + '**'], ['', 'Perihal', ': Perbaikan dokumen tagihan ke-' + (e.tagihanKe || '') + ' ' + T.g.key], ['', 'Referensi', ': BK ' + (e.nomorBA || '-') + (T.paket ? ' · paket ' + T.paket.id : '')]] },
        { t: 'p', teks: 'Dengan hormat, berdasarkan pemeriksaan dokumen tagihan yang kami terima, terdapat hal-hal yang perlu diperbaiki/dilengkapi sebagai berikut :' },
        { t: 'tabel', ukuran: 7.6, kolom: [{ l: 5, r: 'c' }, { l: 95 }], kepala: [[{ teks: 'NO' }, { teks: 'URAIAN' }]], isi: tm.map((t, i) => ({ sel: [String(i + 1), t.pesan] })) },
        { t: 'p', teks: 'Mohon dokumen perbaikan disampaikan kembali agar proses pembayaran dapat dilanjutkan. Nilai tagihan menurut perhitungan kami: **' + rp(h.dasarTagihan) + '** sebelum PPN, PPN **' + rp(h.ppn) + '**, total **' + rp(h.totalTagihan) + '**. Atas perhatian dan kerja samanya kami ucapkan terima kasih.' },
        { t: 'ttd', tempat: 'Jakarta, ' + BLD.tglPanjang(new Date().toISOString().slice(0, 10)), kolom: [{ kosong: true }, { kosong: true }, { atas: 'Hormat kami,', instansi: I.nama, nama: I.kasi.nama, jabatan: I.kasi.jabatan }] }] };
    let w = $('mp270Pv'); w.innerHTML = `<div class="mp270-dlg pv"><header><b>Draf surat permintaan perbaikan</b><div class="d-flex gap-2"><button class="btn btn-sm btn-primary" onclick="document.getElementById('mp270Frame').contentWindow.print()">Cetak</button><button class="btn-close" onclick="document.getElementById('mp270Pv').remove()"></button></div></header><iframe id="mp270Frame"></iframe></div>`;
    $('mp270Frame').srcdoc = BLRH.dokumen([m], opsiCetak());
  }
  async function mintaAI() {
    const el = $('mp270AIJ'); if (!el) return;
    if (!confirm('Ringkasan angka & temuan paket ini (tanpa PDF, tanpa NPWP/rekening) akan dikirim ke penyedia Asisten AI yang diatur Admin. Lanjutkan?')) return;
    const h = T.hasil, tm = h.temuan.concat(T.temuanLokal || []), teks = 'Periksa paket tagihan konstruksi berikut dan berikan: (1) ringkasan masalah, (2) dokumen/persyaratan yang mungkin belum dipenuhi, (3) rekomendasi tindak lanjut. Jangan menyetujui atau mengubah status apa pun.\n' +
      'Kontrak ' + T.g.key + ' (' + T.l.kategori + ', ' + T.l.jenis + '), nilai ' + h.nilaiKontrak + ', prestasi s/d ' + h.prestasi.sd + ' (' + h.persen.sd + '%), ini ' + h.prestasi.ini + ', UM ' + h.uangMuka.potong + ', retensi ' + h.retensi.nilai + ', tagihan ' + h.dasarTagihan + ', PPN ' + h.ppn + ', total ' + h.totalTagihan + ', neto ' + h.neto + '.\nTemuan mesin: ' + tm.map(t => t.tingkat + ': ' + t.pesan).join(' | ');
    el.textContent = 'Menunggu jawaban Asisten AI…';
    try { const r = await kirim('aiTanya', { pesan: [{ role: 'user', teks }], konteks: 'Paket tagihan ' + T.g.key }); el.innerHTML = '<b>Saran Asisten AI (bukan keputusan):</b><div style="white-space:pre-wrap">' + E(r.teks || '') + '</div>'; } catch (e) { el.textContent = 'Asisten AI: ' + e.message; }
  }
  function tutup() { if (T.ubah && T.paket && !confirm('Perubahan paket belum disimpan ke server (draf tersimpan di perangkat ini). Tutup?')) return; T.g = null; gambar(); const p = $('mp270Pv'); if (p) p.remove(); }

  /* ---------- pengikat global (dipanggil dari HTML) ---------- */
  Object.assign(window, {
    mp270Buka: buka, mp270Tutup: tutup, mp270Tab: t => { T.tab = t; gambar(); }, mp270BK: id => pilihBK(id).then(gambar),
    mp270L: (k, v) => { T.l[k] = v; if (k === 'kategori') T.konfig.kategori = v; tandaiUbah(); }, mp270V: (k, v) => { T.l.vendor[k] = v; tandaiUbah(); },
    mp270K: (k, v) => { T.konfig[k] = v; if (k === 'kategori') T.l.kategori = v; T.konfig = BLI.konfigBersih(T.konfig); tandaiUbah(); }, mp270P: (k, v) => { T.konfig.ppn[k] = v; T.konfig = BLI.konfigBersih(T.konfig); tandaiUbah(); },
    mp270H: (k, v) => { T.konfig.pph[k] = v; T.konfig = BLI.konfigBersih(T.konfig); tandaiUbah(); },
    mp270Sewa: (id, k, v) => { T.konfig.sewa[id] = Object.assign({}, T.konfig.sewa[id], { [k]: v }); T.konfig = BLI.konfigBersih(T.konfig); tandaiUbah(); },
    mp270Lain: t => { T.konfig.potonganLain = String(t).split('\n').map(x => { const m = x.split('='); if (m.length < 2) return null; const v = m[1].trim(); return /%$/.test(v) ? { nama: m[0].trim(), persen: N(v.replace(/[%\s]/g, '').replace(',', '.')) } : { nama: m[0].trim(), nilai: N(v.replace(/[^\d]/g, '')) }; }).filter(Boolean); T.konfig = BLI.konfigBersih(T.konfig); tandaiUbah(); },
    mp270GR: (id, on) => { const L = new Set(T.l.lampiran.grIds || []); if (on) L.add(id); else L.delete(id); T.l.lampiran.grIds = [...L]; tandaiUbah(); },
    mp270TSTambah: () => { (T.l.lampiran.ts = T.l.lampiran.ts || []).push({ itemId: (T.S.items.find(i => !i.judul) || {}).id || '', unit: '', operator: '', baris: [] }); tandaiUbah(); },
    mp270TSHapus: i => { T.l.lampiran.ts.splice(i, 1); tandaiUbah(); }, mp270TS: (i, k, v) => { T.l.lampiran.ts[i][k] = v; tandaiUbah(); },
    mp270TSBaris: (i, t) => { T.l.lampiran.ts[i].baris = String(t).split('\n').map(r => r.split(/\t|;/)).filter(c => /^\d{4}-\d{2}-\d{2}$/.test((c[0] || '').trim())).map(c => ({ tgl: c[0].trim(), mulai: (c[1] || '').trim(), selesai: (c[2] || '').trim(), istirahat: N(String(c[3] || '').replace(',', '.')), jam: c[4] === undefined || String(c[4]).trim() === '' ? '' : N(String(c[4]).replace(',', '.')), ket: (c[5] || '').trim() })); tandaiUbah(); },
    mp270PB: (k, j, v) => { const pb = T.l.pembanding; pb[k] = Object.assign({}, pb[k]); if (v === '') delete pb[k][j]; else pb[k][j] = N(v); if (!Object.keys(pb[k]).length) delete pb[k]; tandaiUbah(); },
    mp270Simpan: simpan, mp270SimpanKonfig: simpanKonfig, mp270Status: ubahStatus, mp270Pratinjau: pratinjau, mp270BuatPdf: buatPdf, mp270UnggahTTD: unggahTTD, mp270KeCK: keChecklist, mp270TerapkanNA: terapkanNA, mp270DokSt: dokStatus,
    mp270Berkas: bukaBerkas, mp270Validasi: validasi, mp270SuratRevisi: suratRevisi, mp270AI: mintaAI, mp270Keadaan: () => T
  });

  /* =====================================================================
   * DASHBOARD TAGIHAN
   * ===================================================================== */
  const D = { data: [], muat: false, galat: '', f: { vendor: '', kontrak: '', kategori: '', status: '', periode: '' }, waktu: '' };
  async function muatDashboard() {
    D.muat = true; D.galat = ''; gambarDash();
    if (terhubung()) { try { const r = await kirim('blDaftar', { per: 1000 }); D.data = r.data; D.waktu = r.waktu; } catch (e) { D.galat = e.message; } }
    else D.galat = 'Modul server 1.10.0 belum aktif — daftar paket tidak tersedia; KPI kontrak & BK tetap dihitung dari Monitoring SAP.';
    D.muat = false; gambarDash();
  }
  const UMUR = x => { const t = Date.parse(x.diajukanPada || x.diubahPada || x.dibuatPada || 0); return t ? Math.floor((Date.now() - t) / 864e5) : 0; };
  function hitungDash() {
    const f = D.f, kon = ringkasan().filter(g => N(g.nilai) > 0 && (!f.vendor || g.namaVendor === f.vendor) && (!f.kontrak || g.key === f.kontrak) && (!f.kategori || kategoriBawaan(g) === f.kategori));
    const kunciKon = new Set(kon.map(g => g.key)), terkait = new Map(); kon.forEach(g => [g.key].concat(g.terkait || []).forEach(k => terkait.set(k, g.key)));
    const bk = progresSemua().filter(e => terkait.has(e.noKontrak) && (!f.periode || e.periode === f.periode));
    const L = D.data.filter(x => (!f.status || x.statusEfektif === f.status) && (!f.kategori || x.kategori === f.kategori) && (!f.vendor || x.namaVendor === f.vendor) && (!f.kontrak || x.noKontrak === f.kontrak) && (!f.periode || x.periode === f.periode) && x.statusEfektif !== 'BATAL');
    const jml = (A, k) => A.reduce((a, x) => a + N(x[k]), 0), st = s => L.filter(x => [].concat(s).indexOf(x.statusEfektif) >= 0);
    const nilaiKon = kon.reduce((a, g) => a + N(g.nilai), 0), prestasi = bk.reduce((a, e) => a + N(e.nilai), 0);
    const aktif = kon.filter(g => { const real = N(g.realisasi); return !g.nilai || real < N(g.nilai) - 1000; });
    const ber = new Set(D.data.filter(x => x.statusEfektif !== 'BATAL').map(x => x.progresId));
    return { kon, aktif, nilaiKon, prestasi, sisa: Math.max(0, nilaiKon - prestasi), L, st, jml, bk, tanpaPaket: bk.filter(e => e.baTerbit && !ber.has(e.id)) };
  }
  function gambarDash() {
    let w = $('mp270Dash'); if (!w) { w = document.createElement('div'); w.id = 'mp270Dash'; w.className = 'mp270-latar'; document.body.appendChild(w); }
    const H = hitungDash(), L = H.L, st = H.st, jml = H.jml, f = D.f;
    const kartu = (j, n, sub, cls) => `<div class="mp270-kpi-k ${cls || ''}"><span>${j}</span><b>${n}</b>${sub ? `<i>${sub}</i>` : ''}</div>`;
    const diaj = st(['DIAJUKAN', 'PROSES PEMBAYARAN', 'DIBAYAR']), tunggu = st(['DIAJUKAN', 'PROSES PEMBAYARAN']), bayar = st('DIBAYAR');
    const pipa = BLI.STATUS.filter(s => s !== 'BATAL').map(s => { const A = st(s); return { s, n: A.length, v: jml(A, 'totalTagihan') }; }), maks = Math.max(1, ...pipa.map(p => p.n));
    const aging = [['0–7 hari', 0, 7], ['8–14 hari', 8, 14], ['15–30 hari', 15, 30], ['> 30 hari', 31, 1e9]].map(([l, a, b]) => { const A = st(['SIAP DIPERIKSA', 'TERVERIFIKASI', 'DIAJUKAN', 'PROSES PEMBAYARAN']).filter(x => UMUR(x) >= a && UMUR(x) <= b); return { l, n: A.length, v: jml(A, 'totalTagihan') }; });
    const masalah = L.filter(x => x.galat || x.peringatan || x.statusEfektif === 'REVISI' || (x.dokumen || []).some(d => d.status === 'PERLU_REVISI'));
    const prioritas = [].concat(st('REVISI').map(x => ({ t: 'Revisi diminta Admin', x })), st('MENUNGGU DOKUMEN').filter(x => UMUR(x) > 7).map(x => ({ t: 'Menunggu dokumen > 7 hari', x })),
      st('SIAP DIPERIKSA').map(x => ({ t: 'Siap diperiksa Admin', x })), H.tanpaPaket.slice(0, 15).map(e => ({ t: 'BA terbit, belum ada paket tagihan', e })));
    const opsi = (A, v) => ['<option value="">Semua</option>'].concat([...new Set(A.filter(Boolean))].sort().map(x => `<option ${v === x ? 'selected' : ''}>${E(x)}</option>`)).join('');
    const terbaru = D.data.slice().sort((a, b) => String(b.diubahPada).localeCompare(String(a.diubahPada))).slice(0, 8);
    w.innerHTML = `<div class="mp270-dlg dash"><header><div><div class="mp270-k">DASHBOARD TAGIHAN · ${E(identitas().namaKop)} · proyek ${E(pid())}</div><b>Procurement, Billing & SAP — pemantauan tagihan</b><div class="mp270-sub">${D.waktu ? 'data server ' + E(D.waktu.replace('T', ' ').slice(0, 16)) : ''} · nilai kontrak & prestasi sebelum PPN; PPN, total & neto ditampilkan terpisah</div></div>
      <div class="d-flex gap-2"><button class="btn btn-sm btn-outline-secondary" onclick="mp270DashMuat()">Muat ulang</button><button class="btn btn-sm btn-outline-secondary" onclick="mp270DashEkspor()">Ekspor Excel</button><button class="btn btn-sm btn-outline-secondary" onclick="mp270DashCetak()">PDF / Cetak</button><button class="btn-close" onclick="document.getElementById('mp270Dash').remove()"></button></div></header>
      ${D.galat ? `<div class="mp270-ban warn">${E(D.galat)}</div>` : ''}${D.muat ? '<div class="mp270-ban">Memuat…</div>' : ''}
      <div class="mp270-g filter">
        <label>Vendor<select class="form-select form-select-sm" onchange="mp270DashF('vendor',this.value)">${opsi(ringkasan().map(g => g.namaVendor), f.vendor)}</select></label>
        <label>Kontrak<select class="form-select form-select-sm" onchange="mp270DashF('kontrak',this.value)">${opsi(ringkasan().filter(g => !f.vendor || g.namaVendor === f.vendor).map(g => g.key), f.kontrak)}</select></label>
        <label>Kategori<select class="form-select form-select-sm" onchange="mp270DashF('kategori',this.value)">${opsi(BLI.KATEGORI, f.kategori)}</select></label>
        <label>Periode BK<select class="form-select form-select-sm" onchange="mp270DashF('periode',this.value)">${opsi(progresSemua().map(e => e.periode), f.periode)}</select></label>
        <label>Status<select class="form-select form-select-sm" onchange="mp270DashF('status',this.value)">${opsi(BLI.STATUS, f.status)}</select></label></div>
      <div class="mp270-kpi-g">
        ${kartu('Kontrak aktif', H.aktif.length, H.kon.length + ' kontrak bernilai')}
        ${kartu('Nilai kontrak (sebelum PPN)', rp(H.nilaiKon))}
        ${kartu('Progres diakui (BK)', rp(H.prestasi), H.nilaiKon ? pc(H.prestasi / H.nilaiKon * 100) : '')}
        ${kartu('Sisa nilai kontrak', rp(H.sisa))}
        ${kartu('Tagihan diajukan (sebelum PPN)', rp(jml(diaj, 'dasarTagihan')), diaj.length + ' paket · PPN ' + rp(jml(diaj, 'ppn')))}
        ${kartu('Menunggu dokumen', st('MENUNGGU DOKUMEN').length, rp(jml(st('MENUNGGU DOKUMEN'), 'totalTagihan')) + ' +PPN', 'kuning')}
        ${kartu('Perlu revisi', st('REVISI').length, rp(jml(st('REVISI'), 'totalTagihan')) + ' +PPN', 'merah')}
        ${kartu('Terverifikasi', st('TERVERIFIKASI').length, rp(jml(st('TERVERIFIKASI'), 'totalTagihan')) + ' +PPN', 'biru')}
        ${kartu('Menunggu pembayaran', tunggu.length, 'neto ' + rp(jml(tunggu, 'neto')), 'ungu')}
        ${kartu('Telah dibayar', bayar.length, 'neto ' + rp(jml(bayar, 'neto')), 'hijau')}</div>
      <div class="mp270-dash3">
        <div><h6>Pipeline tagihan</h6>${pipa.map(p => `<div class="mp270-bar" onclick="mp270DashF('status','${p.s}')"><span>${E(p.s)}</span><i style="width:${p.n / maks * 100}%"></i><b>${p.n}</b><small>${rp(p.v)}</small></div>`).join('')}</div>
        <div><h6>Aging tagihan (sejak siap diperiksa)</h6>${aging.map(a => `<div class="mp270-bar"><span>${a.l}</span><i style="width:${a.n / Math.max(1, ...aging.map(z => z.n)) * 100}%"></i><b>${a.n}</b><small>${rp(a.v)}</small></div>`).join('')}
          <h6 class="mt-3">Prioritas hari ini</h6>${prioritas.length ? `<ul class="mp270-pr">${prioritas.slice(0, 12).map(p => p.x ? `<li><a href="#" onclick="mp270Buka('${E(p.x.noKontrak)}','${E(p.x.progresId)}');return false">${E(p.t)}: ${E(p.x.noKontrak)} ke-${E(p.x.tagihanKe)}</a></li>` : `<li><a href="#" onclick="mp270Buka('${E(p.e.noKontrak)}','${E(p.e.id)}');return false">${E(p.t)}: ${E(p.e.nomorBA || p.e.noKontrak)}</a></li>`).join('')}</ul>` : '<div class="small text-muted">Tidak ada.</div>'}</div>
        <div><h6>Dokumen / paket bermasalah</h6>${masalah.length ? `<ul class="mp270-pr">${masalah.slice(0, 12).map(x => `<li><a href="#" onclick="mp270Buka('${E(x.noKontrak)}','${E(x.progresId)}');return false">${E(x.noKontrak)} ke-${E(x.tagihanKe)}</a> · ${x.galat ? x.galat + ' galat · ' : ''}${x.peringatan ? x.peringatan + ' peringatan · ' : ''}${E(x.statusEfektif)}</li>`).join('')}</ul>` : '<div class="small text-muted">Tidak ada.</div>'}
          <h6 class="mt-3">Aktivitas terakhir</h6><ul class="mp270-pr">${terbaru.map(x => `<li>${E(String(x.diubahPada).replace('T', ' ').slice(0, 16))} · ${E(x.diubahOleh)} · ${E(x.noKontrak)} ke-${E(x.tagihanKe)} → ${E(x.statusEfektif)}</li>`).join('') || '<li class="text-muted">-</li>'}</ul></div></div>
      <h6 class="mt-2">Paket tagihan (${L.length})</h6>
      <div class="mp270-gulir besar"><table class="table table-sm mp270-t"><thead><tr><th>Paket</th><th>Kontrak / Vendor</th><th>Kat.</th><th>Ke</th><th>Periode</th><th class="text-end">Tagihan (DPP)</th><th class="text-end">PPN</th><th class="text-end">Total</th><th class="text-end">Neto</th><th>Checklist</th><th>Status</th><th>Umur</th><th></th></tr></thead>
        <tbody>${L.map(x => `<tr><td class="font-monospace small">${E(x.id)}</td><td><span class="font-monospace small">${E(x.noKontrak)}</span><div class="small text-muted">${E(x.namaVendor)}</div></td><td>${E(x.kategori)}</td><td>${E(x.tagihanKe)}</td><td>${E(x.periode)}</td><td class="text-end">${rp(x.dasarTagihan)}</td><td class="text-end">${rp(x.ppn)}</td><td class="text-end">${rp(x.totalTagihan)}</td><td class="text-end">${rp(x.neto)}</td>
          <td>${x.checklist ? x.checklist.lengkap + '/' + x.checklist.total + (x.checklist.verified ? ' ✓' : '') : '-'}</td><td>${lencana(x.statusEfektif)}</td><td>${UMUR(x)} h</td>
          <td class="text-nowrap"><a href="#" onclick="mp270Buka('${E(x.noKontrak)}','${E(x.progresId)}');return false">buka</a> · <a href="#" onclick="document.getElementById('mp270Dash').remove(); bukaTab('monitoring-bulanan'); return false">BK</a> · <a href="#" onclick="document.getElementById('mp270Dash').remove(); bukaTab('register'); if (typeof muatRegister==='function') muatRegister(); return false">kontrak</a></td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function eksporDash() {
    const H = hitungDash(), kol = ['Paket', 'No Kontrak', 'Vendor', 'Kategori', 'Jenis', 'Tagihan ke', 'Periode', 'No BA', 'Nilai kontrak (sebelum PPN)', 'Prestasi periode ini', 'Persen s/d', 'Tagihan sebelum PPN (DPP kontraktual)', 'DPP PPN', 'PPN', 'Total termasuk PPN', 'PPh', 'Neto dibayarkan', 'Status', 'Checklist', 'Revisi', 'Diubah oleh', 'Diubah pada'];
    const baris = H.L.map(x => [x.id, x.noKontrak, x.namaVendor, x.kategori, x.jenis, x.tagihanKe, x.periode, x.nomorBA, x.nilaiKontrak, (x.prestasi || {}).ini || 0, x.persenSd, x.dasarTagihan, x.dpp, x.ppn, x.totalTagihan, x.pph, x.neto, x.statusEfektif, x.checklist ? x.checklist.lengkap + '/' + x.checklist.total : '', x.revisi, x.diubahOleh, x.diubahPada]);
    const nama = 'paket-tagihan-' + pid() + '-' + new Date().toISOString().slice(0, 10);
    if (window.XLSX && window.XLSX.utils) { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([kol].concat(baris)), 'Paket Tagihan'); XLSX.writeFile(wb, nama + '.xlsx'); return; }
    const sel = v => { const s = String(v === null || v === undefined ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    BLK.unduh(new TextEncoder().encode('﻿sep=;\n' + [kol].concat(baris).map(r => r.map(sel).join(';')).join('\n')), nama + '.csv', 'text/csv;charset=utf-8');
  }
  function cetakDash() {
    const H = hitungDash(), m = { kode: 'DASH', judul: 'REKAP PAKET TAGIHAN', nomor: 'Proyek ' + pid() + ' · ' + new Date().toISOString().slice(0, 10), orientasi: 'L', tandaAir: '', kaki: 'Dashboard Tagihan',
      blok: [{ t: 'kop' }, { t: 'judul', teks: 'REKAP PAKET TAGIHAN', nomor: 'Proyek ' + pid() + ' · dicetak ' + BLD.tglPanjang(new Date().toISOString().slice(0, 10)) },
        { t: 'info', lebar: 200, baris: [['', 'Nilai kontrak (sebelum PPN)', ': ' + rp(H.nilaiKon)], ['', 'Progres diakui (BK)', ': ' + rp(H.prestasi)], ['', 'Sisa nilai kontrak', ': ' + rp(H.sisa)]] },
        { t: 'tabel', ukuran: 6.6, kolom: [{ l: 10 }, { l: 20 }, { l: 6 }, { l: 4, r: 'c' }, { l: 9 }, { l: 10, r: 'r' }, { l: 8, r: 'r' }, { l: 10, r: 'r' }, { l: 10, r: 'r' }, { l: 13 }],
          kepala: [[{ teks: 'PAKET' }, { teks: 'KONTRAK / VENDOR' }, { teks: 'KAT' }, { teks: 'KE' }, { teks: 'PERIODE' }, { teks: 'TAGIHAN (DPP)' }, { teks: 'PPN' }, { teks: 'TOTAL' }, { teks: 'NETO' }, { teks: 'STATUS' }]],
          isi: H.L.map(x => ({ sel: [x.id, x.noKontrak + ' — ' + x.namaVendor, x.kategori, String(x.tagihanKe), x.periode || '', BLI.rupiah(x.dasarTagihan, { tanpaRp: true }), BLI.rupiah(x.ppn, { tanpaRp: true }), BLI.rupiah(x.totalTagihan, { tanpaRp: true }), BLI.rupiah(x.neto, { tanpaRp: true }), x.statusEfektif] })) }] };
    let w = $('mp270Pv'); if (!w) { w = document.createElement('div'); w.id = 'mp270Pv'; w.className = 'mp270-latar atas'; document.body.appendChild(w); }
    w.innerHTML = `<div class="mp270-dlg pv"><header><b>Rekap paket tagihan</b><div class="d-flex gap-2"><button class="btn btn-sm btn-primary" onclick="document.getElementById('mp270Frame').contentWindow.print()">Cetak / Simpan PDF</button><button class="btn-close" onclick="document.getElementById('mp270Pv').remove()"></button></div></header><iframe id="mp270Frame"></iframe></div>`;
    $('mp270Frame').srcdoc = BLRH.dokumen([m], opsiCetak());
  }
  Object.assign(window, { mp270Dashboard: () => { gambarDash(); muatDashboard(); }, mp270DashMuat: muatDashboard, mp270DashF: (k, v) => { D.f[k] = v; gambarDash(); }, mp270DashEkspor: eksporDash, mp270DashCetak: cetakDash, mp270DashHitung: hitungDash });

  /* =====================================================================
   * PINTU MASUK — tombol di Register, Input Progres, Monitoring BK, Keuangan & Bayar, menu akun & navigasi
   * ===================================================================== */
  const TOMBOL = (k, p, kecil) => `<button type="button" class="mp270-btn${kecil ? ' kecil' : ''}" title="Buat Paket Tagihan" onclick="event.stopPropagation(); mp270Buka(${JSON.stringify(k).replace(/"/g, '&quot;')}${p ? ',' + JSON.stringify(p).replace(/"/g, '&quot;') : ''})"><i class="fas fa-file-invoice-dollar"></i>${kecil ? '' : ' Buat Paket Tagihan'}</button>`;
  const cariBKdariNomor = no => progresSemua().find(e => e.nomorBA === no);
  function pasang() {
    // Register Kontrak: baris kontrak
    document.querySelectorAll('#tab-register tr.baris-kontrak[data-key]').forEach(tr => { const td = tr.querySelector('td'); if (td && !td.querySelector('.mp270-btn')) td.insertAdjacentHTML('beforeend', '<div class="mt-1">' + TOMBOL(tr.dataset.key, '', false) + '</div>'); });
    // Monitoring BK, Input Progres (riwayat tagihan): tautan preview BA → id progres
    document.querySelectorAll('#tab-monitoring-bulanan a[onclick^="previewBAEntri("], #tab-form-progres a[onclick^="previewBAEntri("]').forEach(a => {
      if (a.parentNode.querySelector('.mp270-btn')) return; const m = a.getAttribute('onclick').match(/previewBAEntri\('([^']+)'/); if (!m) return;
      const e = progresSemua().find(x => x.id === m[1]); if (!e) return; const g = cariKontrak(e.noKontrak); if (!g) return;
      a.insertAdjacentHTML('afterend', ' ' + TOMBOL(g.key, e.id, true));
    });
    // Input Progres: daftar tagihan (kolom pertama memuat nomor BA)
    document.querySelectorAll('#tab-form-progres tbody tr td:first-child > code').forEach(c => {
      const td = c.parentNode; if (td.querySelector('.mp270-btn')) return; const e = cariBKdariNomor(c.textContent.trim()); if (!e) return; const g = cariKontrak(e.noKontrak); if (!g) return;
      td.insertAdjacentHTML('beforeend', '<div class="mt-1">' + TOMBOL(g.key, e.id, false) + '</div>');
    });
    // Keuangan & Bayar: kolom No. BK
    document.querySelectorAll('#tab-keuangan td[data-l="No. BK / Tagihan"][title]').forEach(td => {
      if (td.querySelector('.mp270-btn')) return; const e = cariBKdariNomor(td.getAttribute('title')); if (!e) return; const g = cariKontrak(e.noKontrak); if (!g) return;
      td.insertAdjacentHTML('beforeend', '<div>' + TOMBOL(g.key, e.id, false) + '</div>');
    });
    // Input Progres: tombol di samping isian No Kontrak
    const fp = $('fp_noKontrak'); if (fp && !$('mp270FP')) { fp.parentNode.insertAdjacentHTML('beforeend', '<button type="button" id="mp270FP" class="mp270-btn mt-1" onclick="(function(){var v=document.getElementById(\'fp_noKontrak\').value.trim(); if(!v){alert(\'Pilih No Kontrak dahulu.\');return;} mp270Buka(v);})()"><i class="fas fa-file-invoice-dollar"></i> Buat Paket Tagihan</button>'); }
    // menu akun & navigasi samping
    const dd = document.querySelector('.menu-akun .dropdown-menu');
    if (dd && !$('mp270Menu')) dd.insertAdjacentHTML('afterbegin', '<li id="mp270Menu"><a class="dropdown-item" href="#" onclick="mp270Dashboard(); return false;"><i class="fas fa-file-invoice-dollar me-2"></i>Paket Tagihan · Dashboard</a></li>');
    const nk = document.querySelector('[onclick^="showTab(\'keuangan\'"]');
    if (nk && !$('mp270Nav')) { const c = nk.cloneNode(true); c.id = 'mp270Nav'; c.removeAttribute('onclick'); c.classList.remove('active'); c.setAttribute('onclick', 'mp270Dashboard(); return false;'); c.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> <span>Paket Tagihan</span>'; nk.insertAdjacentElement('afterend', c); }
  }
  let jadwal = 0;
  const amati = new MutationObserver(() => { if (jadwal) return; jadwal = setTimeout(() => { jadwal = 0; try { pasang(); } catch (e) { console.warn('MP270', e); } }, 250); });
  const mulai = () => { try { pasang(); } catch (e) { } amati.observe(document.body, { childList: true, subtree: true }); };
  if (document.body) mulai(); else document.addEventListener('DOMContentLoaded', mulai);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('mp270Pv')) $('mp270Pv').remove(); });
})();
