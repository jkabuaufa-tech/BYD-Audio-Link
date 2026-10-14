/* =====================================================================
 * 1.6.0 — N. VERIFIKASI TAGIHAN (AI Auditor) — menu Keuangan & Bayar
 * Alur: (1) AI membaca tiap PDF checklist → data terstruktur (di-cache per versi berkas)
 *       (2) mesin aturan server memeriksa silang secara deterministik (bukan dinilai AI)
 *       (3) laporan disimpan berversi di <ID>_VerifikasiTagihan + Log; kedaluwarsa bila PDF diganti.
 * AI bersifat alat bantu verifikator — keputusan pembayaran tetap pada Admin/pejabat berwenang.
 * 1.8.0: bundel = sumber utama verifikasi (tanpa harus Terapkan); unggahan per item hanya untuk jenis yang tidak ada di bundel.
 * 1.7.2: hanya dokumen yang dipakai aturan dibaca AI (KTP/NPWP/SIUP/foto dll. dilewati → lebih cepat & hemat kuota); Staf Pengadaan
 *        boleh unggah bundel & menjalankan pembacaan tanpa masuk daftar peran Asisten AI (Verifikasi Admin tetap Admin); penyedia cadangan untuk semua galat key.
 * 1.7.1: bundel > 10 MB dipecah klien per halaman menjadi bagian ≤ 10 MB (batas kernel) → vtBundel {berkas:[…]} membaca tiap bagian & menyatukan peta.
 * 1.7.0: (4) 1 PDF bundel scan → AI memisahkan & mengklasifikasi per halaman (vtBundel) → usulan pemetaan checklist;
 *        (5) gerbang 'kunci' (bawaan): temuan Kritis/Mayor mengunci Verifikasi Admin & pengajuan bayar (keuanganProgres).
 * ===================================================================== */
const VT_COL = ['ID Tagihan', 'Waktu', 'Keputusan', 'Kritis', 'Mayor', 'Minor', 'Oleh', 'Sidik', 'DATA'];
const VT_EKS_COL = ['Sidik Berkas', 'ID Berkas', 'Nama', 'Waktu', 'Penyedia', 'DATA', 'Bagian'];
const VT_BUN_COL = ['ID Tagihan', 'Waktu', 'ID Berkas', 'Nama', 'Segmen', 'Oleh', 'DATA'];
const VT_PDF = ['anthropic', 'google', 'openai', 'openrouter'];   // penyedia yang dapat membaca PDF
const VT_DEF = { provider: '', gerbang: 'kunci', otomatis: true, npwpPembeli: '0010016145093000', namaPembeli: 'WASKITA', batasMeterai: 5000000, toleransi: 1 };
const VT_JENIS = ['KWITANSI', 'INVOICE', 'FAKTUR_PAJAK', 'SURAT_JALAN', 'REKAP_SURAT_JALAN', 'BAP', 'BAPM', 'BAPA', 'BAPP', 'BAST', 'BAST_ALAT', 'SPKTV', 'JURNAL_HUTANG',
  'SURAT_PENYALURAN', 'JAMINAN_UANG_MUKA', 'JAMINAN_PELAKSANAAN', 'KONTRAK', 'LAINNYA'];
const VT_NAMA = { KWITANSI: 'Kwitansi', INVOICE: 'Invoice', FAKTUR_PAJAK: 'Faktur Pajak', SURAT_JALAN: 'Surat Jalan', REKAP_SURAT_JALAN: 'Rekap Surat Jalan', BAP: 'BAP', BAPM: 'BAPM',
  BAPA: 'BAPA', BAPP: 'BAPP', BAST: 'BAST', BAST_ALAT: 'BAST Alat', SPKTV: 'SPKTV', JURNAL_HUTANG: 'Jurnal Hutang', SURAT_PENYALURAN: 'Surat Penyaluran Pembayaran',
  JAMINAN_UANG_MUKA: 'Jaminan Uang Muka', JAMINAN_PELAKSANAAN: 'Jaminan Pelaksanaan', KONTRAK: 'Kontrak', LAINNYA: 'Lainnya' };
const VT_GERBANG = ['peringatan', 'wajib', 'kunci'];
// 1.7.2: item checklist yang isinya dipakai mesin aturan — selain ini (KTP, NPWP, SBUJK, SIUP, foto, izin, timesheet, dll.) tidak dibaca AI
const VT_ITEM_AI = ['UMUM_01', 'UMUM_02', 'UMUM_03', 'UMUM_04', 'UMUM_05', 'UMUM_07', 'UMUM_08', 'BAHAN_01', 'BAHAN_02', 'BAHAN_11', 'ALAT_09', 'SUBKON_02', 'SUBKON_03', 'SUBKON_10', 'SUBKON_11'];
const vtPerluAI = k => VT_ITEM_AI.indexOf(s_(k)) >= 0;
function vtCekPeran(u) { if (!(u.admin || u.peran === 'PENGADAAN')) throw new Error('Unggah bundel & pembacaan dokumen untuk Staf Pengadaan/Admin. Verifikasi Admin tetap oleh Admin.'); }   // kunci (1.7.0): Kritis/Mayor tidak dapat dikecualikan
const VT_TINGKAT = { KRITIS: 4, MAYOR: 3, MINOR: 2, CATATAN: 1 };

function vtSet() {
  const d = (jsonProp('AI_SET', {}) || {}).verifikasi || {};
  return { provider: s_(d.provider), gerbang: VT_GERBANG.indexOf(d.gerbang) >= 0 ? d.gerbang : VT_DEF.gerbang, otomatis: d.otomatis !== false,
    npwpPembeli: s_(d.npwpPembeli || VT_DEF.npwpPembeli).replace(/\D/g, ''), namaPembeli: s_(d.namaPembeli || VT_DEF.namaPembeli).toUpperCase(),
    batasMeterai: Math.max(0, Number(d.batasMeterai) || VT_DEF.batasMeterai), toleransi: Math.max(0, Math.min(1000, Number(d.toleransi === undefined ? VT_DEF.toleransi : d.toleransi) || 0)) };
}
function vtProvList(s) { return s.urut.filter(id => aiSiap(s, id) && (VT_PDF.indexOf(id) >= 0 || /openrouter\.ai/i.test(s.prov[id].url))); }
function vtProvPilih(s, v) {
  const L = vtProvList(s); if (!L.length) throw new Error('Belum ada penyedia AI yang dapat membaca PDF (Anthropic, Google, OpenAI, atau OpenRouter) dengan API key aktif. Atur di Setelan Asisten AI.');
  return L.indexOf(v.provider) >= 0 ? v.provider : L.indexOf(s.bawaanId) >= 0 ? s.bawaanId : L[0];
}

/* ---------- penyimpanan ---------- */
function vtBacaSemua(P) {
  const sh = ss_().getSheetByName(P + '_VerifikasiTagihan'); if (!sh) return [];
  return baris_(sh).filter(r => r[8]).map(r => { try { return JSON.parse(s_(r[8])); } catch (e) { return null; } }).filter(Boolean);
}
function vtTerakhir(P) { const m = {}; vtBacaSemua(P).forEach(r => { if (!m[r.id] || s_(r.pada) > s_(m[r.id].pada)) m[r.id] = r; }); return m; }
function vtEksBaca(P, sidik) {
  const sh = ss_().getSheetByName(P + '_VerifikasiEkstrak'); if (!sh) return null;
  const L = baris_(sh).filter(x => s_(x[0]) === sidik); if (!L.length) return null;
  const akhir = L[L.length - 1], waktu = s_(akhir[3]);   // 1.7.0: hasil besar disimpan beberapa baris (kolom Bagian "i/n")
  const grup = s_(akhir[6]) ? L.filter(x => s_(x[3]) === waktu && s_(x[6])).sort((a, b) => parseInt(s_(a[6]), 10) - parseInt(s_(b[6]), 10)) : [akhir];
  if (s_(akhir[6]) && grup.length !== Number(s_(akhir[6]).split('/')[1])) return null;
  try { return JSON.parse(grup.map(x => s_(x[5])).join('')); } catch (e) { return null; }
}
function vtEksSimpan(P, sidik, f, prov, hasil, now) {
  const t = JSON.stringify(hasil), N = 45000, n = Math.max(1, Math.ceil(t.length / N)), sh = sheet_(P + '_VerifikasiEkstrak', VT_EKS_COL);
  if (n > 6) throw new Error('Hasil baca PDF terlalu besar (' + Math.round(t.length / 1000) + ' rb karakter). Pisahkan bundel menjadi beberapa PDF.');
  for (let i = 0; i < n; i++) sh.appendRow([sidik, f.getId(), s_(f.getName()).slice(0, 200), now, prov, t.slice(i * N, (i + 1) * N), n > 1 ? (i + 1) + '/' + n : '']);
}
function vtSidikChecklist(rec, P) {   // berubah bila ada PDF yang diganti / status berubah / bundel baru diunggah (1.8.0)
  const B = P && rec && rec.id ? vtBundelBaca(P, rec.id) : null, bun = B ? vtBagianBundel(B).map(b => s_(b.file.idServer)).join(',') : '';
  return modulSidik_(Object.keys(rec.items || {}).sort().map(k => { const v = rec.items[k] || {}; return k + ':' + s_(v.status) + ':' + s_(v.file && v.file.idServer); }).join('|') + (bun ? '#B:' + bun : '')).slice(0, 24);
}
const vtBagianBundel = B => B && Array.isArray(B.berkas) && B.berkas.length ? B.berkas : B && B.file ? [{ file: B.file, mulai: 1 }] : [];
function vtDokumenChecklist(P, id) {
  const e = cl217Tagihan_(P, id), c = cl217Cari_(P, e.id), rec = c.rec || cl217Dasar_(e);
  if (!rec.kategori) throw new Error('Kategori checklist belum ditetapkan. Admin perlu menetapkan kategori lebih dahulu.');
  const tpl = cl217Template_(rec.kategori), items = rec.items || {};
  const dok = tpl.map(d => { const v = items[d.k] || {}; return { k: d.k, nama: d.nama, ketentuan: d.ketentuan, status: s_(v.status || 'TIDAK'), alasan: s_(v.alasan), file: v.status === 'ADA' && v.file && v.file.idServer ? v.file : null }; });
  return { e: e, rec: rec, dok: dok };
}
function vtSidikBerkas(f) { return s_(f.getId()) + ':' + f.getSize() + ':' + (f.getLastUpdated ? f.getLastUpdated().getTime() : ''); }

/* ---------- 1. ekstraksi per PDF (AI membaca, tidak menilai) ---------- */
const VT_PROMPT = 'Anda adalah petugas entri data verifikasi tagihan proyek konstruksi (Indonesia). Baca PDF terlampir (dapat berupa hasil pindai) dan SALIN datanya apa adanya ke JSON. ' +
  'JANGAN menilai, JANGAN membetulkan, JANGAN mengarang: bila tidak terbaca/tidak ada isi null. Satu PDF bisa memuat beberapa dokumen (bundel scan) — pisahkan dan kembalikan SEMUANYA, satu entri per dokumen, berurutan sesuai halaman. ' +
  'halamanMulai/halamanAkhir = nomor halaman PDF (mulai 1) tempat dokumen itu berada; setiap surat jalan = entri tersendiri.\n' +
  'Balas HANYA JSON valid:\n{"dokumen":[{"jenis":"' + VT_JENIS.join('|') + '","halaman":"1-2","halamanMulai":1,"halamanAkhir":2,"nomor":null,"tanggal":"YYYY-MM-DD|null",' +
  '"penerbit":null,"penerima":null,"nomorKontrak":null,"tanggalKontrak":"YYYY-MM-DD|null","jenisPembayaran":"PROGRES|UANG_MUKA|FINAL|RETENSI|null","persenPrestasi":null,' +
  '"nilai":{"hargaJual":null,"dpp":null,"ppn":null,"tarifPpn":null,"pph":null,"total":null,"uangMuka":null,"potonganUangMuka":null,"retensi":null,"nilaiDiajukan":null,"nilaiKontrak":null},' +
  '"terbilang":null,"terbilangSesuaiAngka":null,"nomorSeriFaktur":null,"npwpPenjual":null,"namaPembeli":null,"npwpPembeli":null,' +
  '"rekening":[{"bank":null,"nomor":null,"atasNama":null}],"rujukan":[{"jenis":"' + VT_JENIS.join('|') + '","nomor":null,"tanggal":null}],' +
  '"tandaTangan":{"pihakPertama":null,"pihakKedua":null,"nama":[]},"meterai":null,"cap":null,"berlakuDari":null,"berlakuSampai":null,' +
  '"item":[{"uraian":null,"qty":null,"satuan":null,"hargaSatuan":null,"jumlah":null}],"catatan":null,"keyakinan":0.0}]}\n' +
  'Definisi nilai: hargaJual = nilai yang DITAGIHKAN SAAT INI sebelum PPN (untuk uang muka = nilai uang muka, BUKAN nilai kontrak); nilaiKontrak = nilai kontrak/SPK; total = nilai setelah PPN yang tertulis; nilaiDiajukan = nilai bersih yang diajukan (setelah PPh/potongan) bila tertulis. ' +
  'Aturan: angka rupiah = bilangan bulat tanpa titik/koma (Rp 1.234.567,00 → 1234567); qty boleh desimal. Tanggal "18 Juli 2025" → "2025-07-18". ' +
  'nomorSeriFaktur salin persis digitnya (tanpa spasi). rekening.nomor salin persis termasuk tanda hubung. tandaTangan.pihakPertama/pihakKedua = true bila tanda tangan basah/elektronik terlihat. ' +
  'meterai = true bila ada meterai tempel/elektronik. Untuk SURAT_JALAN isi item & tanggal; nomor null bila kolom nomor kosong. Jurnal hutang: isi rujukan nomor faktur/kwitansi/kontrak yang tertulis. ' +
  'keyakinan 0–1 = keyakinan pembacaan keseluruhan dokumen.';
function vtBacaAI(P, u, f, teks, now, label, ket) {   // AI membaca 1 PDF → data terstruktur (dipakai vtEkstrak & vtBundel)
  const s = aiSet(), pakai = aiPakai(u); if (pakai >= s.kuota) throw new Error('Kuota Asisten AI harian akun Anda (' + s.kuota + ') habis. Minta Admin menaikkan kuota.');
  const bytes = f.getBlob().getBytes(); if (bytes.length > 15 * 1024 * 1024) throw new Error('PDF ' + s_(f.getName()) + ' terlalu besar untuk dibaca AI (maks. 15 MB).');
  const v = vtSet(), prov = vtProvPilih(s, v), lain = vtProvList(s).filter(k => k !== prov).slice(0, 3);   // 1.7.2: semua penyedia pembaca PDF lain sebagai cadangan
  const pesan = [{ role: 'user', teks: teks, pdf: { data: Utilities.base64Encode(bytes), nama: s_(f.getName()).slice(0, 120) } }];
  let h = null, g0 = null;
  [prov].concat(lain).some(id => { try { h = aiPanggil(id, s, VT_PROMPT, pesan, { maksToken: 16000, json: true }); h.prov = id; return true; } catch (e) { g0 = g0 || e; return AI_KODE_CADANGAN.indexOf(e.kode) < 0; } });
  if (!h) {
    if ([401, 403].indexOf(g0 && g0.kode) >= 0) throw new Error('API key ' + s_(s.prov[prov] && s.prov[prov].nama) + ' ditolak penyedia (HTTP ' + g0.kode + ')' + (lain.length ? ' dan penyedia cadangan juga gagal' : '') +
      '. Admin: perbarui API key di menu akun › Asisten AI › ⚙️, atau pilih penyedia lain di Keuangan & Bayar › Verifikasi Dokumen › Setelan.');
    throw g0;
  }
  aiTambahPakai(u, pakai + 1);
  const j = ambilJSON(h.teks); if (!j || !Array.isArray(j.dokumen)) throw new Error('AI tidak mengembalikan data terstruktur untuk ' + label + '. Coba lagi atau gunakan penyedia lain.');
  const hasil = { dokumen: j.dokumen.slice(0, 40).map(z => vtBersihDok(z)), sumber: Object.assign({ file: s_(f.getName()).slice(0, 200), idServer: f.getId() }, ket || {}), provider: h.prov, model: h.model, pada: now };
  vtEksSimpan(P, vtSidikBerkas(f), f, h.prov + ' · ' + h.model, hasil, now);
  return hasil;
}
function vtEkstrak(req, u, P, now) {
  vtCekPeran(u);
  const x = req.data || {}, ck = vtDokumenChecklist(P, s_(x.id));
  if (/^BUNDEL:\d+$/.test(s_(x.k))) {   // 1.8.0: bagian bundel (sumber utama)
    const A = vtBagianBundel(vtBundelBaca(P, ck.e.id)), i = Number(s_(x.k).split(':')[1]), b = A[i]; if (!b) throw new Error('Bundel tagihan ini tidak ditemukan. Unggah ulang bundel.');
    const ref = cl217RefValid_(P, b.file), f = DriveApp.getFileById(ref.idServer), sid = vtSidikBerkas(f);
    if (!x.paksa) { const c = vtEksBaca(P, sid); if (c) return { ok: true, k: x.k, cache: true, hasil: c }; }
    const h = vtBacaAI(P, u, f, 'BUNDEL scan dokumen tagihan ' + s_(ck.e.nomorBA || ck.e.id) + ' (kontrak ' + s_(ck.e.noKontrak) + ', kategori ' + s_(ck.rec.kategori) + ')' + (A.length > 1 ? ' — BAGIAN ' + (i + 1) + ' dari ' + A.length : '') +
      '. Pisahkan per dokumen sesuai halaman, klasifikasikan jenisnya, dan ekstrak sesuai skema.', now, 'bundel ' + s_(f.getName()), { k: 'BUNDEL', nama: 'Bundel PDF' });
    catat_(P, { id: ck.e.id, noKontrak: ck.e.noKontrak }, u, 'AI-AKSI', 'BACA BAGIAN BUNDEL · ' + s_(f.getName()).slice(0, 120) + ' · ' + h.dokumen.length + ' dokumen · ' + h.provider);
    return { ok: true, k: x.k, cache: false, hasil: h };
  }
  const d = ck.dok.find(z => z.k === s_(x.k));
  if (!d || !d.file) throw new Error('Dokumen ' + s_(x.k) + ' tidak memiliki PDF di checklist.');
  const ref = cl217RefValid_(P, d.file), f = DriveApp.getFileById(ref.idServer), sidik = vtSidikBerkas(f);
  if (!x.paksa) { const c = vtEksBaca(P, sidik); if (c) return { ok: true, k: d.k, cache: true, hasil: c }; }
  const hasil = vtBacaAI(P, u, f, 'Dokumen checklist: "' + d.nama + '" (kode ' + d.k + '). Ekstrak sesuai skema.', now, d.nama, { k: d.k, nama: d.nama });
  catat_(P, { id: s_(x.id), noKontrak: ck.e.noKontrak }, u, 'AI-AKSI', 'BACA DOKUMEN · ' + d.nama + ' · ' + hasil.dokumen.map(z => z.jenis + (z.nomor ? ' ' + z.nomor : '')).join(', ').slice(0, 300) + ' · ' + hasil.provider);
  return { ok: true, k: d.k, cache: false, hasil: hasil };
}

/* ---------- 1b. bundel: 1 PDF scan utuh → dipisah & diklasifikasi per halaman (1.7.0) ---------- */
const VT_PETA = { SPKTV: ['UMUM_01'], JURNAL_HUTANG: ['UMUM_02'], KWITANSI: ['UMUM_03'], INVOICE: ['UMUM_04'], FAKTUR_PAJAK: ['UMUM_05'], BAP: ['UMUM_07'],
  BAPM: ['UMUM_08'], BAPA: ['UMUM_08'], BAPP: ['UMUM_08'], KONTRAK: ['UMUM_09'], REKAP_SURAT_JALAN: ['BAHAN_01'], SURAT_JALAN: ['BAHAN_02'],
  JAMINAN_UANG_MUKA: ['BAHAN_11'], JAMINAN_PELAKSANAAN: ['SUBKON_02'], BAST_ALAT: ['ALAT_09'], BAST: ['SUBKON_10'] };
const vtHal = L => L.filter(z => z.halamanMulai).map(z => z.halamanMulai === z.halamanAkhir || !z.halamanAkhir ? String(z.halamanMulai) : z.halamanMulai + '–' + z.halamanAkhir).join(', ');
function vtBundelPeta(ck, dokumen) {   // dokumen: [{z (hasil baca), b (indeks bagian), off (halaman awal bagian − 1)}] → segmen + usulan item checklist
  const tpl = {}; ck.dok.forEach(d => { tpl[d.k] = d; });
  const segmen = dokumen.map((x, i) => {
    const z = x.z, k = (VT_PETA[z.jenis] || []).find(y => tpl[y] && (y !== 'UMUM_08' || VT_NAMA[z.jenis] === tpl[y].nama)) || '';
    return { i: i, b: x.b, jenis: z.jenis, nama: VT_NAMA[z.jenis] || z.jenis, halamanMulai: z.halamanMulai ? z.halamanMulai + x.off : null, halamanAkhir: z.halamanAkhir ? z.halamanAkhir + x.off : null,
      nomor: z.nomor || z.nomorSeriFaktur, tanggal: z.tanggal, nilai: { hargaJual: z.nilai.hargaJual, dpp: z.nilai.dpp, ppn: z.nilai.ppn, total: z.nilai.total }, nomorSeriFaktur: z.nomorSeriFaktur,
      rekening: z.rekening, meterai: z.meterai, tandaTangan: z.tandaTangan, keyakinan: z.keyakinan, k: k };
  });
  const usulan = {};
  segmen.filter(z => z.k).forEach(z => { const u = usulan[z.k] = usulan[z.k] || { k: z.k, nama: tpl[z.k].nama, status: tpl[z.k].status, segmen: [], tgl: z.tanggal || '', b: z.b }; u.segmen.push(z.i); });
  Object.keys(usulan).forEach(k => { const u = usulan[k]; u.halaman = vtHal(u.segmen.map(i => segmen[i])); });
  return { segmen: segmen, usulan: Object.keys(usulan).map(k => usulan[k]), tanpaPeta: segmen.filter(z => !z.k).map(z => z.nama + (z.halamanMulai ? ' hal. ' + vtHal([z]) : '')) };
}
function vtBundel(req, u, P, now) {   // 1.7.1: bundel boleh dipecah klien menjadi beberapa bagian PDF ≤ 10 MB (batas kernel) — x.berkas [{file, mulai, akhir}]
  vtCekPeran(u);
  const x = req.data || {}, ck = vtDokumenChecklist(P, s_(x.id));
  const L = (Array.isArray(x.berkas) && x.berkas.length ? x.berkas : [{ file: x.file, mulai: 1 }]).slice(0, 24), n = L.length;   // 1.8.0: s.d. 24 bagian kecil (lebih tahan galat 502/504)
  if (Array.isArray(x.berkas) && x.berkas.length > 24) throw new Error('Bundel maksimal 24 bagian.');
  let mulai = 1, adaBaru = false;
  const bag = L.map((b, i) => {
    const ref = cl217RefValid_(P, b.file), f = DriveApp.getFileById(ref.idServer), sidik = vtSidikBerkas(f);
    const m = Math.max(1, Math.round(Number(b.mulai)) || mulai);
    let hasil = x.paksa ? null : vtEksBaca(P, sidik); const cache = !!hasil;
    if (!hasil) { adaBaru = true; hasil = vtBacaAI(P, u, f, 'BUNDEL scan dokumen tagihan ' + s_(ck.e.nomorBA || ck.e.id) + ' (kontrak ' + s_(ck.e.noKontrak) + ', kategori ' + s_(ck.rec.kategori) + ')' +
      (n > 1 ? ' — BAGIAN ' + (i + 1) + ' dari ' + n + ' (halaman 1 PDF ini = halaman ' + m + ' bundel; isi halamanMulai/halamanAkhir menurut halaman PDF terlampir)' : '') +
      '. Pisahkan per dokumen sesuai halaman, klasifikasikan jenisnya, dan ekstrak sesuai skema. Dokumen yang terpotong di awal/akhir bagian tetap dicatat.', now, 'bundel ' + s_(f.getName()), { k: 'BUNDEL', nama: 'Bundel PDF' + (n > 1 ? ' bagian ' + (i + 1) : '') }); }
    const akhir = Math.max(m, Math.round(Number(b.akhir)) || 0);
    mulai = (akhir || m) + 1;
    return { file: { id: s_(ref.id || ref.idServer), idServer: f.getId(), nama: s_(f.getName()).slice(0, 200), lokasi: 'server', ukuran: f.getSize() }, mulai: m, akhir: akhir || null, sidik: sidik, cache: cache, hasil: hasil };
  });
  if (x.bacaSaja) {   // klien membaca bagian satu per satu (menghindari batas waktu Apps Script), lalu memanggil sekali lagi untuk menyusun peta
    const h = bag[0].hasil;
    catat_(P, { id: ck.e.id, noKontrak: ck.e.noKontrak }, u, 'AI-AKSI', 'BACA BAGIAN BUNDEL · ' + bag[0].file.nama + ' · ' + h.dokumen.length + ' dokumen' + (bag[0].cache ? ' (cache)' : '') + ' · ' + h.provider);
    return { ok: true, cache: bag[0].cache, dokumen: h.dokumen.length };
  }
  const daftar = [];   // dokumen terpotong di batas bagian (jenis sama, nomor sama/kosong, halaman bersambung) digabung menjadi satu
  bag.forEach((b, i) => b.hasil.dokumen.forEach((z, j) => {
    const p = daftar[daftar.length - 1];
    if (j === 0 && i > 0 && p && p.b === i - 1 && p.z.jenis === z.jenis && (!p.z.nomor || !z.nomor || vtNo(p.z.nomor) === vtNo(z.nomor)) && (z.halamanMulai || 1) === 1 && p.z.halamanAkhir && p.z.halamanAkhir + p.off === b.mulai - 1) {
      const g = JSON.parse(JSON.stringify(p.z)); g.nomor = g.nomor || z.nomor; g.tanggal = g.tanggal || z.tanggal; g.nomorSeriFaktur = g.nomorSeriFaktur || z.nomorSeriFaktur;
      Object.keys(z.nilai).forEach(k => { if (g.nilai[k] === null) g.nilai[k] = z.nilai[k]; });
      g.rekening = (g.rekening || []).concat(z.rekening || []); g.meterai = g.meterai === true || z.meterai === true ? true : g.meterai;
      g.tandaTangan = { pihakPertama: g.tandaTangan.pihakPertama || z.tandaTangan.pihakPertama, pihakKedua: g.tandaTangan.pihakKedua || z.tandaTangan.pihakKedua, nama: [] };
      g.halamanAkhir = (z.halamanAkhir || 1) + (b.mulai - 1) - p.off; p.z = g; return;
    }
    daftar.push({ z: z, b: i, off: b.mulai - 1 });
  }));
  const peta = vtBundelPeta(ck, daftar);
  peta.usulan.forEach(x2 => { x2.file = bag[x2.b].file; x2.ket = ('Bundel hal. ' + (x2.halaman || '?') + (n > 1 ? ' (bagian ' + (x2.b + 1) + '/' + n + ')' : '') + ' (dipetakan AI)').slice(0, 350); });
  const h0 = bag[0].hasil;
  const rek = { id: ck.e.id, file: bag[0].file, berkas: bag.map(b => ({ file: b.file, mulai: b.mulai, akhir: b.akhir, sidik: b.sidik })), segmen: peta.segmen, usulan: peta.usulan, tanpaPeta: peta.tanpaPeta,
    provider: h0.provider, model: h0.model, pada: now, oleh: u.nama };
  let t = JSON.stringify(rek); if (t.length > 45000) { rek.segmen.forEach(z => { z.rekening = (z.rekening || []).slice(0, 2); z.tandaTangan = null; }); t = JSON.stringify(rek); }
  if (t.length > 45000) throw new Error('Bundel memuat terlalu banyak dokumen (' + rek.segmen.length + '). Pisahkan menjadi beberapa unggahan.');
  delete _vtBun[P];
  sheet_(P + '_VerifikasiBundel', VT_BUN_COL).appendRow([ck.e.id, now, bag[0].file.idServer, bag[0].file.nama + (n > 1 ? ' (+' + (n - 1) + ' bagian)' : ''), peta.segmen.length, u.nama, t]);
  catat_(P, { id: ck.e.id, noKontrak: ck.e.noKontrak }, u, 'AI-AKSI', 'PISAH BUNDEL · ' + bag[0].file.nama + (n > 1 ? ' · ' + n + ' bagian' : '') + ' · ' + peta.segmen.length + ' dokumen' + (adaBaru ? '' : ' (cache)') + ': ' +
    peta.segmen.map(z => z.nama + (z.halamanMulai ? ' hal.' + vtHal([z]) : '')).join(', ').slice(0, 300) + ' · ' + h0.provider);
  return Object.assign({ ok: true, cache: !adaBaru }, rek);
}
const _vtBun = {};   // memo per eksekusi: P → {idTagihan: rekaman bundel terbaru}
function vtBundelBaca(P, id) {
  if (!_vtBun[P]) { const m = {}, sh = ss_().getSheetByName(P + '_VerifikasiBundel');
    if (sh) baris_(sh).forEach(x => { if (s_(x[0]) && s_(x[6])) m[s_(x[0])] = s_(x[6]); }); _vtBun[P] = m; }
  const t = _vtBun[P][s_(id)]; if (!t) return null;
  try { return JSON.parse(t); } catch (e) { return null; }
}
const vtAngka = v => { if (v === null || v === undefined || v === '') return null; if (typeof v === 'number') return isFinite(v) ? v : null; const t = s_(v).replace(/[^\d,.\-]/g, ''); if (!t) return null; const n = Number(t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const vtTgl = v => /^\d{4}-\d{2}-\d{2}$/.test(s_(v)) ? s_(v) : null;
const vtBool = v => v === true ? true : v === false ? false : null;
function vtBersihDok(z) {
  z = z || {}; const n = z.nilai || {}, tt = z.tandaTangan || {};
  const hm = Math.round(Number(z.halamanMulai)) || Number((/^\s*(\d+)/.exec(s_(z.halaman)) || [])[1]) || null, ha = Math.round(Number(z.halamanAkhir)) || Number((/(\d+)\s*$/.exec(s_(z.halaman)) || [])[1]) || hm;
  return { jenis: VT_JENIS.indexOf(s_(z.jenis).toUpperCase()) >= 0 ? s_(z.jenis).toUpperCase() : 'LAINNYA', halaman: s_(z.halaman).slice(0, 20),
    halamanMulai: hm && hm > 0 && hm < 2000 ? hm : null, halamanAkhir: ha && hm && ha >= hm && ha < 2000 ? ha : (hm || null), nomor: z.nomor ? s_(z.nomor).trim().slice(0, 120) : null,
    tanggal: vtTgl(z.tanggal), penerbit: z.penerbit ? s_(z.penerbit).slice(0, 120) : null, penerima: z.penerima ? s_(z.penerima).slice(0, 120) : null,
    nomorKontrak: z.nomorKontrak ? s_(z.nomorKontrak).trim().slice(0, 120) : null, tanggalKontrak: vtTgl(z.tanggalKontrak),
    jenisPembayaran: ['PROGRES', 'UANG_MUKA', 'FINAL', 'RETENSI'].indexOf(s_(z.jenisPembayaran).toUpperCase()) >= 0 ? s_(z.jenisPembayaran).toUpperCase() : null, persenPrestasi: vtAngka(z.persenPrestasi),
    nilai: ['hargaJual', 'dpp', 'ppn', 'tarifPpn', 'pph', 'total', 'uangMuka', 'potonganUangMuka', 'retensi', 'nilaiDiajukan', 'nilaiKontrak'].reduce((o, k) => { o[k] = vtAngka(n[k]); return o; }, {}),
    terbilang: z.terbilang ? s_(z.terbilang).slice(0, 300) : null, terbilangSesuaiAngka: vtBool(z.terbilangSesuaiAngka),
    nomorSeriFaktur: z.nomorSeriFaktur ? s_(z.nomorSeriFaktur).replace(/\s/g, '').slice(0, 40) : null, npwpPenjual: z.npwpPenjual ? s_(z.npwpPenjual).slice(0, 40) : null,
    namaPembeli: z.namaPembeli ? s_(z.namaPembeli).slice(0, 120) : null, npwpPembeli: z.npwpPembeli ? s_(z.npwpPembeli).slice(0, 40) : null,
    rekening: (Array.isArray(z.rekening) ? z.rekening : []).filter(r => r && r.nomor).slice(0, 6).map(r => ({ bank: s_(r.bank).slice(0, 40), nomor: s_(r.nomor).slice(0, 40), atasNama: s_(r.atasNama).slice(0, 80) })),
    rujukan: (Array.isArray(z.rujukan) ? z.rujukan : []).filter(r => r && r.nomor).slice(0, 12).map(r => ({ jenis: VT_JENIS.indexOf(s_(r.jenis).toUpperCase()) >= 0 ? s_(r.jenis).toUpperCase() : 'LAINNYA', nomor: s_(r.nomor).trim().slice(0, 120), tanggal: vtTgl(r.tanggal) })),
    tandaTangan: { pihakPertama: vtBool(tt.pihakPertama), pihakKedua: vtBool(tt.pihakKedua), nama: (Array.isArray(tt.nama) ? tt.nama : []).slice(0, 6).map(t => s_(t).slice(0, 60)) },
    meterai: vtBool(z.meterai), cap: vtBool(z.cap), berlakuDari: vtTgl(z.berlakuDari), berlakuSampai: vtTgl(z.berlakuSampai),
    item: (Array.isArray(z.item) ? z.item : []).filter(i => i && (i.uraian || i.jumlah)).slice(0, 150).map(i => ({ uraian: s_(i.uraian).slice(0, 160), qty: vtAngka(i.qty), satuan: s_(i.satuan).slice(0, 20), hargaSatuan: vtAngka(i.hargaSatuan), jumlah: vtAngka(i.jumlah) })),
    catatan: z.catatan ? s_(z.catatan).slice(0, 400) : null, keyakinan: Math.max(0, Math.min(1, Number(z.keyakinan) || 0)) };
}

/* ---------- 2. mesin aturan (deterministik) ---------- */
const vtRp = n => n === null || n === undefined ? 'tidak terbaca' : 'Rp' + Math.round(n).toLocaleString('id-ID');
const vtNo = v => s_(v).toUpperCase().replace(/\s+/g, '').replace(/[–—]/g, '-');
const vtDigit = v => s_(v).replace(/\D/g, '');
const vtTok = t => s_(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w.length > 1);
function vtMirip(a, b) { const A = new Set(vtTok(a)), B = new Set(vtTok(b)); if (!A.size || !B.size) return 0; let i = 0; A.forEach(w => { if (B.has(w)) i++; }); return i / Math.min(A.size, B.size); }   // koefisien tumpang-tindih
function vtCocok(list, it, tol) {   // pasangan terbaik: kemiripan nama, lalu nilai & volume yang sama (nama kembar, mis. dua baris "Sepatu Boat")
  let best = null;
  (list || []).forEach((a, i) => { const m = vtMirip(a.uraian, it.uraian), skor = m + (a.jumlah !== null && it.jumlah !== null && Math.abs(a.jumlah - it.jumlah) <= tol ? 0.5 : 0) + (a.qty !== null && a.qty === it.qty ? 0.25 : 0);
    if (!best || skor > best.skor) best = { a: a, i: i, m: m, skor: skor }; });
  return best;
}
const vtSubstitusi = (x, y) => { const A = vtTok(x), B = vtTok(y); return A.some(w => B.indexOf(w) < 0) && B.some(w => A.indexOf(w) < 0); };
function vtNilai(P, id, u, now) {
  const v = vtSet(), ck = vtDokumenChecklist(P, id), e = ck.e, T = [], D = {}, sumber = [];
  const reg = bacaKoleksi_(P, 'data').find(k => k.noKontrak === e.noKontrak) || bacaKoleksi_(P, 'koreksi').find(k => k.noKontrak === e.noKontrak || k.key === e.noKontrak) || {};
  // 1.8.0: bundel terbaru tagihan ini = sumber utama (tanpa harus "Terapkan"); unggahan per item hanya untuk jenis yang tidak ada di bundel
  const dibaca = {}, Bd = vtBundelBaca(P, id), dariBundel = {}, petaBundel = {};
  if (Bd) {
    (Bd.usulan || []).forEach(x => { petaBundel[x.k] = 1; });
    const A = vtBagianBundel(Bd);
    A.forEach((b, i) => {
      let f = null; try { f = DriveApp.getFileById(b.file.idServer); } catch (x) { }
      const sid = f ? vtSidikBerkas(f) : '', c = f ? vtEksBaca(P, sid) : null; if (sid) dibaca[sid] = c || 1;
      sumber.push({ k: 'BUNDEL', nama: 'Bundel' + (A.length > 1 ? ' bagian ' + (i + 1) + '/' + A.length : ''), file: s_(b.file.nama).slice(0, 120), dibaca: !!c, provider: c ? c.provider + ' · ' + c.model : '' });
      if (c) c.dokumen.forEach(z => { z._k = 'BUNDEL'; z._nama = 'Bundel'; dariBundel[z.jenis] = 1; (D[z.jenis] = D[z.jenis] || []).push(z); });
    });
  }
  ck.dok.filter(d => d.file && vtPerluAI(d.k)).forEach(d => {   // 1.7.2: hanya dokumen yang dipakai aturan
    let f = null; try { f = DriveApp.getFileById(d.file.idServer); } catch (x) { }
    const sid = f ? vtSidikBerkas(f) : ''; if (sid && dibaca[sid]) return;   // berkas bundel / berkas sama untuk banyak item
    const c = f ? vtEksBaca(P, sid) : null; if (sid) dibaca[sid] = c || 1;
    if (!c && petaBundel[d.k]) return;   // belum dibaca, tetapi dokumennya sudah ada di bundel
    const pakai = c ? c.dokumen.filter(z => !dariBundel[z.jenis]) : [];
    sumber.push({ k: d.k, nama: d.nama, file: s_(d.file.nama).slice(0, 120), dibaca: !!c, provider: c ? c.provider + ' · ' + c.model : '', diganti: c && pakai.length < c.dokumen.length ? 'dokumen yang sama dari bundel dipakai' : '' });
    pakai.forEach(z => { z._k = d.k; z._nama = d.nama; (D[z.jenis] = D[z.jenis] || []).push(z); });
  });
  const satu = j => (D[j] || [])[0] || null, ada = j => !!(D[j] && D[j].length);
  const temu = (kode, tingkat, judul, detail, dok) => T.push({ kode: kode, tingkat: tingkat, judul: judul, detail: s_(detail).slice(0, 600), dokumen: dok || [] });
  const tol = v.toleransi, beda = (a, b) => a !== null && b !== null && Math.abs(a - b) > tol;
  const tingkatSelisih = (a, b) => Math.abs(a - b) <= 1000 ? 'MINOR' : 'KRITIS';
  const belumDibaca = sumber.filter(x => !x.dibaca);
  if (belumDibaca.length) temu('K00', 'MAYOR', 'Dokumen belum dibaca AI', belumDibaca.map(x => x.nama).join(', ') + ' — jalankan ulang verifikasi agar semua dokumen terbaca.', belumDibaca.map(x => x.nama));
  // mode tagihan & dokumen wajib
  const bap = satu('BAP'), inv = satu('INVOICE'), kw = satu('KWITANSI'), fp = satu('FAKTUR_PAJAK');
  const um = [bap, inv, kw, fp].some(z => z && (z.jenisPembayaran === 'UANG_MUKA' || /uang\s*muka/i.test(s_(z.catatan) + ' ' + (z.item || []).map(i => i.uraian).join(' '))));
  const kat = ck.rec.kategori, naCk = k => (ck.dok.find(d => d.k === k) || {}).status === 'NA';
  const penggantiBapm = um ? ['JAMINAN_UANG_MUKA', 'BAPP'] : kat === 'ALAT' ? ['BAPA', 'BAST_ALAT', 'BAST'] : kat === 'SUBKON' ? ['BAPP', 'BAST'] : [];
  const sjPengganti = kat === 'ALAT' ? ['BAST_ALAT', 'BAPA'] : [];
  const sjNA = um || kat === 'SUBKON';
  const tabel = [];
  const baris = (dokumen, jenis, opsi) => {
    opsi = opsi || {}; const hasJ = jenis.filter(ada), z = hasJ.length ? satu(hasJ[0]) : null;
    tabel.push({ dokumen: dokumen, jenis: jenis, ditemukan: hasJ.map(j => VT_NAMA[j]), na: !!opsi.na && !hasJ.length, pengganti: hasJ.length && opsi.utama && hasJ[0] !== opsi.utama ? VT_NAMA[hasJ[0]] : '',
      nomor: z ? z.nomor : null, tanggal: z ? z.tanggal : null, alasanNA: opsi.alasanNA || '' });
    if (!hasJ.length && !opsi.na) temu('K01', 'MAYOR', dokumen + ' tidak ditemukan', 'Tidak ada ' + jenis.map(j => VT_NAMA[j]).join(' / ') + ' di berkas checklist yang terbaca.', [dokumen]);
  };
  baris('Kwitansi', ['KWITANSI']); baris('Invoice', ['INVOICE']); baris('Faktur Pajak', ['FAKTUR_PAJAK']);
  baris('Surat Jalan', ['SURAT_JALAN', 'REKAP_SURAT_JALAN'].concat(sjPengganti), { na: sjNA || naCk('BAHAN_02'), utama: 'SURAT_JALAN', alasanNA: um ? 'Tagihan uang muka — belum ada pengiriman.' : kat === 'SUBKON' ? 'Pekerjaan subkontraktor — digantikan BAPP/BAST.' : 'Ditandai Tidak Berlaku di checklist.' });
  baris('BAP', ['BAP']);
  baris(um ? 'BAPM / pengganti (Jaminan Uang Muka)' : kat === 'ALAT' ? 'BAPM / pengganti (BAPA / BAST alat)' : kat === 'SUBKON' ? 'BAPM / pengganti (BAPP / BAST)' : 'BAPM', ['BAPM'].concat(penggantiBapm), { utama: 'BAPM' });
  // keterbacaan
  Object.keys(D).forEach(j => D[j].forEach(z => { if (z.keyakinan && z.keyakinan < 0.6) temu('K02', 'CATATAN', 'Keterbacaan rendah: ' + VT_NAMA[j], z._nama + ' dibaca dengan keyakinan ' + Math.round(z.keyakinan * 100) + '% — periksa manual angka & nomornya.', [VT_NAMA[j]]); }));
  // N. nilai
  const hj = inv && inv.nilai.hargaJual !== null ? inv.nilai.hargaJual : inv && inv.nilai.dpp;
  const tInv = inv ? inv.nilai.total : null, tKw = kw ? (kw.nilai.total !== null ? kw.nilai.total : kw.nilai.nilaiDiajukan) : null, tBap = bap ? bap.nilai.total : null;
  if (inv && kw && beda(tInv, tKw)) temu('N01', tingkatSelisih(tInv, tKw), 'Total Invoice ≠ Kwitansi', 'Invoice ' + vtRp(tInv) + ' vs Kwitansi ' + vtRp(tKw) + '.', ['Invoice', 'Kwitansi']);
  if (inv && bap && beda(tInv, tBap)) temu('N02', tingkatSelisih(tInv, tBap), 'Total Invoice ≠ BAP', 'Invoice ' + vtRp(tInv) + ' vs BAP ' + vtRp(tBap) + '.', ['Invoice', 'BAP']);
  if (kw && kw.terbilangSesuaiAngka === false) temu('N08', 'MAYOR', 'Terbilang kwitansi tidak sesuai angka', 'Terbilang: "' + s_(kw.terbilang).slice(0, 160) + '" vs ' + vtRp(tKw) + '.', ['Kwitansi']);
  const fpList = D.FAKTUR_PAJAK || [];
  const seri = [...new Set(fpList.map(z => vtDigit(z.nomorSeriFaktur)).filter(Boolean))];
  if (seri.length > 1) temu('L04', 'KRITIS', 'Lebih dari satu Faktur Pajak dengan nomor seri berbeda', 'Nomor seri: ' + seri.join(', ') + '. Pastikan hanya satu yang berlaku dan faktur lain dibatalkan di DJP agar PPN tidak terlapor ganda.', ['Faktur Pajak']);
  if (fp) {
    const n = fp.nilai, dppLain = hj !== null ? Math.round(hj * 11 / 12) : null;
    if (inv && n.hargaJual !== null && beda(hj, n.hargaJual)) temu('N03', tingkatSelisih(hj, n.hargaJual), 'Harga jual Faktur ≠ Invoice', 'Faktur ' + vtRp(n.hargaJual) + ' vs Invoice ' + vtRp(hj) + '.', ['Faktur Pajak', 'Invoice']);
    if (inv && beda(inv.nilai.ppn, n.ppn)) temu('N04', tingkatSelisih(inv.nilai.ppn, n.ppn), 'PPN Invoice ≠ PPN Faktur', 'Invoice ' + vtRp(inv.nilai.ppn) + ' vs Faktur ' + vtRp(n.ppn) + '.', ['Invoice', 'Faktur Pajak']);
    if (n.dpp !== null && hj !== null) {
      const okLain = Math.abs(n.dpp - dppLain) <= tol && (n.ppn === null || Math.abs(n.ppn - Math.round(n.dpp * 0.12)) <= Math.max(tol, 1));
      const okLama = Math.abs(n.dpp - hj) <= tol && (n.ppn === null || Math.abs(n.ppn - Math.round(n.dpp * 0.11)) <= Math.max(tol, 1));
      if (!okLain && !okLama) temu('N05', Math.abs(n.dpp - dppLain) <= 1000 ? 'MINOR' : 'MAYOR', 'DPP / PPN faktur tidak sesuai ketentuan', 'DPP ' + vtRp(n.dpp) + ', seharusnya ' + vtRp(dppLain) + ' (11/12 × harga jual ' + vtRp(hj) + ') dengan PPN 12% = ' + vtRp(Math.round(dppLain * 0.12)) + '.', ['Faktur Pajak']);
    }
    const sr = vtDigit(fp.nomorSeriFaktur);
    if (!sr) temu('L03', 'MAYOR', 'Nomor seri faktur tidak terbaca', 'Periksa kode & nomor seri faktur secara manual.', ['Faktur Pajak']);
    else if (!(sr.length === 17 || sr.length === 16)) temu('L03', 'MAYOR', 'Format nomor seri faktur tidak lazim', s_(fp.nomorSeriFaktur) + ' (' + sr.length + ' digit). Format Coretax 17 digit.', ['Faktur Pajak']);
    if (v.npwpPembeli && fp.npwpPembeli && vtDigit(fp.npwpPembeli).indexOf(v.npwpPembeli.replace(/^0+/, '')) < 0) temu('L03', 'MAYOR', 'NPWP pembeli pada faktur tidak sesuai', 'Faktur: ' + fp.npwpPembeli + ', seharusnya ' + v.npwpPembeli + '.', ['Faktur Pajak']);
    if (v.namaPembeli && fp.namaPembeli && s_(fp.namaPembeli).toUpperCase().indexOf(v.namaPembeli) < 0) temu('L03', 'MAYOR', 'Nama pembeli pada faktur tidak sesuai', 'Faktur: ' + fp.namaPembeli + '.', ['Faktur Pajak']);
    if (inv && fp.tanggal && inv.tanggal && fp.tanggal.slice(0, 7) !== inv.tanggal.slice(0, 7)) temu('T01', 'MAYOR', 'Masa pajak faktur berbeda dengan invoice', 'Faktur ' + tglID(fp.tanggal) + ' vs Invoice ' + tglID(inv.tanggal) + '.', ['Faktur Pajak', 'Invoice']);
    // seri di dokumen lain (jurnal / SPKTV)
    ['JURNAL_HUTANG', 'SPKTV'].forEach(j => (D[j] || []).forEach(z => (z.rujukan || []).filter(r => r.jenis === 'FAKTUR_PAJAK').forEach(r => {
      if (sr && vtDigit(r.nomor) && vtDigit(r.nomor) !== sr && seri.indexOf(vtDigit(r.nomor)) < 0) temu('L05', 'MINOR', 'Nomor faktur di ' + VT_NAMA[j] + ' berbeda', VT_NAMA[j] + ': ' + r.nomor + ' (' + vtDigit(r.nomor).length + ' digit) vs Faktur: ' + fp.nomorSeriFaktur + ' (' + sr.length + ' digit).', [VT_NAMA[j], 'Faktur Pajak']);
    })));
  }
  // nilai prestasi vs berita acara pemeriksaan & aplikasi
  const ba = satu('BAPM') || satu('BAPA') || satu('BAPP') || satu('BAST_ALAT');
  if (!um && ba && hj !== null) { const nb = ba.nilai.hargaJual !== null ? ba.nilai.hargaJual : (ba.item || []).reduce((a, i) => a + (i.jumlah || 0), 0) || null; if (beda(nb, hj)) temu('N06', tingkatSelisih(nb, hj), 'Nilai ' + VT_NAMA[ba.jenis] + ' ≠ harga jual Invoice', VT_NAMA[ba.jenis] + ' ' + vtRp(nb) + ' vs Invoice ' + vtRp(hj) + '.', [VT_NAMA[ba.jenis], 'Invoice']); }
  if (!um && Number(e.nilai) > 0 && hj !== null && beda(Number(e.nilai), hj)) temu('N07', 'MAYOR', 'Nilai tagihan di aplikasi ≠ Invoice', 'Aplikasi (' + s_(e.nomorBA) + ') ' + vtRp(Number(e.nilai)) + ' vs Invoice ' + vtRp(hj) + '.', ['Invoice']);
  // R. rujukan nomor
  const cocokNo = (a, b) => vtNo(a) === vtNo(b);
  const cekRujuk = (z, jenisTujuan, target, kode, tingkat) => { if (!z || !target || !target.nomor) return; (z.rujukan || []).filter(r => r.jenis === jenisTujuan).forEach(r => {
    if (!cocokNo(r.nomor, target.nomor)) temu(kode, tingkat, VT_NAMA[z.jenis] + ' merujuk nomor ' + VT_NAMA[jenisTujuan] + ' yang berbeda', VT_NAMA[z.jenis] + ' menulis "' + r.nomor + '", sedangkan ' + VT_NAMA[jenisTujuan] + ' bernomor "' + target.nomor + '".', [VT_NAMA[z.jenis], VT_NAMA[jenisTujuan]]); }); };
  [kw, fp, satu('SPKTV'), satu('JURNAL_HUTANG')].forEach(z => cekRujuk(z, 'INVOICE', inv, 'R01', 'MINOR'));
  [kw, inv, fp].forEach(z => cekRujuk(z, 'BAP', bap, 'R02', 'MINOR'));
  if (bap && ba) cekRujuk(bap, ba.jenis, ba, 'R04', 'MINOR');
  const noK = s_(e.noKontrak);
  Object.keys(D).forEach(j => D[j].forEach(z => {
    const ks = [z.nomorKontrak].concat((z.rujukan || []).filter(r => r.jenis === 'KONTRAK').map(r => r.nomor)).filter(Boolean);
    ks.forEach(n => { if (noK && !cocokNo(n, noK) && vtDigit(n) !== vtDigit(noK)) temu('R03', vtMirip(n, noK) > 0.7 ? 'MINOR' : 'MAYOR', 'Nomor kontrak berbeda di ' + VT_NAMA[j], VT_NAMA[j] + ' menulis "' + n + '", tagihan: "' + noK + '".', [VT_NAMA[j]]); });
    if (z.tanggalKontrak && reg.tglKontrak && z.tanggalKontrak !== s_(reg.tglKontrak).slice(0, 10)) temu('R05', 'MINOR', 'Tanggal kontrak berbeda di ' + VT_NAMA[j], VT_NAMA[j] + ': ' + tglID(z.tanggalKontrak) + ', register: ' + tglID(reg.tglKontrak) + '.', [VT_NAMA[j]]);
  }));
  // T. urutan tanggal
  if (bap && ba && bap.tanggal && ba.tanggal && bap.tanggal < ba.tanggal) temu('T02', 'MINOR', 'BAP bertanggal sebelum ' + VT_NAMA[ba.jenis], 'BAP ' + tglID(bap.tanggal) + ' < ' + VT_NAMA[ba.jenis] + ' ' + tglID(ba.tanggal) + '.', ['BAP', VT_NAMA[ba.jenis]]);
  (D.SURAT_JALAN || []).forEach(z => { if (ba && ba.tanggal && z.tanggal && z.tanggal > ba.tanggal) temu('T03', 'MAYOR', 'Surat jalan bertanggal setelah ' + VT_NAMA[ba.jenis], 'Surat jalan ' + tglID(z.tanggal) + ' > ' + tglID(ba.tanggal) + '.', ['Surat Jalan']); });
  // L. legalitas
  if (kw) {
    if ((tKw || 0) > v.batasMeterai && kw.meterai !== true) temu('L01', 'MAYOR', 'Kwitansi tanpa meterai', 'Nilai ' + vtRp(tKw) + ' > ' + vtRp(v.batasMeterai) + ' wajib bermeterai.', ['Kwitansi']);
    if (kw.tandaTangan.pihakKedua === false && kw.tandaTangan.pihakPertama === false) temu('L01', 'MAYOR', 'Kwitansi tidak ditandatangani', 'Tanda tangan penerima uang tidak terlihat.', ['Kwitansi']);
  }
  [bap, ba].filter(Boolean).forEach(z => { if (z.tandaTangan.pihakPertama === false || z.tandaTangan.pihakKedua === false) temu('L02', 'MAYOR', VT_NAMA[z.jenis] + ' belum ditandatangani kedua pihak', 'Pihak pertama: ' + (z.tandaTangan.pihakPertama ? 'ada' : 'tidak') + ', pihak kedua: ' + (z.tandaTangan.pihakKedua ? 'ada' : 'tidak') + '.', [VT_NAMA[z.jenis]]); });
  // B. rekening
  const rek = []; ['INVOICE', 'KWITANSI', 'SURAT_PENYALURAN', 'SPKTV'].forEach(j => (D[j] || []).forEach(z => (z.rekening || []).forEach(r => rek.push({ j: j, bank: s_(r.bank).toUpperCase().replace(/^BANK\s+/, '').trim(), no: vtDigit(r.nomor), asli: r.nomor }))));
  if (rek.length) {
    const perBank = {}; rek.filter(r => r.j !== 'SPKTV').forEach(r => { const b = r.bank.split(/\s+/)[0] || '?'; (perBank[b] = perBank[b] || []).push(r); });
    const semuaNo = [...new Set(rek.map(r => r.no))];
    Object.keys(perBank).forEach(b => { const ns = [...new Set(perBank[b].map(r => r.no))]; if (ns.length > 1) temu('B01', 'KRITIS', 'Nomor rekening ' + b + ' berbeda antar-dokumen', perBank[b].map(r => VT_NAMA[r.j] + ': ' + r.asli).join(' · ') + '. Minta konfirmasi tertulis vendor atas satu rekening tujuan.', [...new Set(perBank[b].map(r => VT_NAMA[r.j]))]); });
    semuaNo.forEach(n => { const bs = [...new Set(rek.filter(r => r.no === n).map(r => r.bank.split(/\s+/)[0]))]; if (bs.length > 1) temu('B02', 'MAYOR', 'Nama bank berbeda untuk nomor rekening yang sama', n + ': ' + bs.join(' / ') + ' (' + [...new Set(rek.filter(r => r.no === n).map(r => VT_NAMA[r.j]))].join(', ') + ').', []); });
    const spktv = (D.SPKTV || []).flatMap(z => z.rekening || []).map(r => vtDigit(r.nomor)), luar = rek.filter(r => r.j !== 'SPKTV').map(r => r.no);
    spktv.forEach(n => { if (luar.length && luar.indexOf(n) < 0) temu('B03', 'KRITIS', 'Rekening di SPKTV tidak ada di dokumen vendor', 'SPKTV: ' + n + ' tidak cocok dengan rekening di invoice/kwitansi/surat penyaluran (' + [...new Set(luar)].join(', ') + ').', ['SPKTV']); });
  }
  // I. item
  const pembanding = um ? [] : [inv, ba, fp].filter(z => z && (z.item || []).length);   // uang muka: item = baris kontrak, bukan barang yang ditagih
  if (pembanding.length > 1) {
    const acuan = pembanding[0];
    pembanding.slice(1).forEach(z => (z.item || []).forEach(it => {
      const c = vtCocok(acuan.item, it, tol), samaNilai = c && c.a.jumlah !== null && it.jumlah !== null && Math.abs(c.a.jumlah - it.jumlah) <= tol;
      if (c && c.m >= 0.6) {
        if (c.a.qty !== null && it.qty !== null && Math.abs(c.a.qty - it.qty) > 1e-6) temu('I01', 'MAYOR', 'Volume item berbeda: ' + it.uraian, VT_NAMA[z.jenis] + ' ' + it.qty + ' vs ' + VT_NAMA[acuan.jenis] + ' ' + c.a.qty + '.', [VT_NAMA[z.jenis], VT_NAMA[acuan.jenis]]);
        else if (c.a.hargaSatuan !== null && it.hargaSatuan !== null && beda(c.a.hargaSatuan, it.hargaSatuan)) temu('I01', 'MAYOR', 'Harga satuan berbeda: ' + it.uraian, VT_NAMA[z.jenis] + ' ' + vtRp(it.hargaSatuan) + ' vs ' + vtRp(c.a.hargaSatuan) + '.', [VT_NAMA[z.jenis], VT_NAMA[acuan.jenis]]);
        else if (vtSubstitusi(it.uraian, c.a.uraian) && c.m < 1) temu('I02', 'MINOR', 'Uraian item berbeda di ' + VT_NAMA[z.jenis], '"' + it.uraian + '" vs ' + VT_NAMA[acuan.jenis] + ' "' + c.a.uraian + '"' + (samaNilai ? ' (volume & nilai sama).' : '.'), [VT_NAMA[z.jenis]]);
      } else if (samaNilai && c.a.qty === it.qty) temu('I02', 'MINOR', 'Uraian item berbeda di ' + VT_NAMA[z.jenis], '"' + it.uraian + '" vs ' + VT_NAMA[acuan.jenis] + ' "' + c.a.uraian + '" (volume & nilai sama).', [VT_NAMA[z.jenis]]);
      else temu('I03', 'MAYOR', 'Item tidak ditemukan pada ' + VT_NAMA[acuan.jenis], VT_NAMA[z.jenis] + ': "' + it.uraian + '" ' + (it.qty !== null ? it.qty + ' ' + s_(it.satuan) : '') + '.', [VT_NAMA[z.jenis], VT_NAMA[acuan.jenis]]);
    }));
  }
  // surat jalan vs berita acara / tagihan
  const sj = D.SURAT_JALAN || [];
  sj.forEach(z => { if (!z.nomor) temu('I04', 'MINOR', 'Surat jalan tanpa nomor', z._nama + (z.tanggal ? ' tanggal ' + tglID(z.tanggal) : '') + ' — kolom nomor kosong.', ['Surat Jalan']); if (z.tandaTangan.pihakPertama === false && z.tandaTangan.pihakKedua === false) temu('I04', 'MAYOR', 'Surat jalan tanpa tanda tangan penerima', z._nama + '.', ['Surat Jalan']); });
  const acuanBrg = ba || inv;
  if (sj.length && acuanBrg && (acuanBrg.item || []).length) {
    const tot = {}; sj.forEach(z => (z.item || []).forEach(it => {
      const c = vtCocok(acuanBrg.item, { uraian: it.uraian, qty: it.qty, jumlah: null }, tol);
      if (!c || c.m < 0.5) temu('I05', 'MAYOR', 'Barang/alat di surat jalan tidak cocok dengan yang ditagih', 'Surat jalan' + (z.nomor ? ' ' + z.nomor : '') + ': "' + it.uraian + '". Klarifikasi substitusi merek/spesifikasi dan sesuaikan uraian tagihan.', ['Surat Jalan']);
      else tot[c.i] = (tot[c.i] || 0) + (it.qty || 0);
    }));
    if (kat === 'BAHAN') acuanBrg.item.forEach((a, i) => { if (a.qty !== null && tot[i] !== undefined && Math.abs(tot[i] - a.qty) > 1e-6) temu('I06', 'MAYOR', 'Jumlah surat jalan ≠ volume diterima: ' + a.uraian, 'Total surat jalan ' + tot[i] + ' vs ' + VT_NAMA[acuanBrg.jenis] + ' ' + a.qty + ' ' + s_(a.satuan) + '.', ['Surat Jalan']); });
  }
  // J. jaminan uang muka
  if (um) {
    const ju = satu('JAMINAN_UANG_MUKA'), umNilai = bap && (bap.nilai.uangMuka || bap.nilai.hargaJual) || hj;
    if (!ju) temu('J00', 'MAYOR', 'Jaminan uang muka tidak ditemukan', 'Pembayaran uang muka wajib dilindungi jaminan uang muka.', ['Jaminan Uang Muka']);
    else {
      const jn = ju.nilai.total !== null ? ju.nilai.total : ju.nilai.nilaiKontrak;
      if (jn !== null && umNilai && jn + tol < umNilai) temu('J01', 'KRITIS', 'Nilai jaminan uang muka kurang', 'Jaminan ' + vtRp(jn) + ' < uang muka ' + vtRp(umNilai) + '.', ['Jaminan Uang Muka']);
      if (ju.berlakuSampai && ju.berlakuSampai < hariWIB()) temu('J02', 'MAYOR', 'Jaminan uang muka sudah berakhir', 'Berlaku s.d. ' + tglID(ju.berlakuSampai) + '.', ['Jaminan Uang Muka']);
      else if (ju.berlakuSampai) temu('J03', 'CATATAN', 'Masa berlaku jaminan uang muka', 'Berlaku s.d. ' + tglID(ju.berlakuSampai) + ' — pastikan diperpanjang bila uang muka belum lunas dipotong.', ['Jaminan Uang Muka']);
    }
  }
  // P. SPKTV
  (D.SPKTV || []).forEach(z => { const n = z.nilai; if (n.hargaJual !== null && n.pph !== null && n.nilaiDiajukan !== null && Math.abs(n.hargaJual - (n.potonganUangMuka || 0) - (n.retensi || 0) - n.pph - n.nilaiDiajukan) > tol) temu('P01', 'MINOR', 'Hitungan SPKTV tidak konsisten', 'Harga jual ' + vtRp(n.hargaJual) + ' − PPh ' + vtRp(n.pph) + ' ≠ nilai diajukan ' + vtRp(n.nilaiDiajukan) + '.', ['SPKTV']);
    if (n.dpp !== null && fp && fp.nilai.dpp !== null && beda(n.dpp, fp.nilai.dpp)) temu('P02', 'MINOR', 'DPP di SPKTV ≠ faktur', 'SPKTV ' + vtRp(n.dpp) + ' vs faktur ' + vtRp(fp.nilai.dpp) + '.', ['SPKTV', 'Faktur Pajak']); });
  // dedup + status tabel
  const seen = {}, temuan = T.filter(t => { const k = t.kode + '|' + t.judul + '|' + t.detail; if (seen[k]) return false; seen[k] = 1; return true; })
    .sort((a, b) => VT_TINGKAT[b.tingkat] - VT_TINGKAT[a.tingkat]);
  tabel.forEach(r => {
    const t = temuan.filter(x => x.tingkat !== 'CATATAN' && x.dokumen.some(d => d === r.dokumen || r.ditemukan.indexOf(d) >= 0));
    r.status = r.na ? 'N/A' : !r.ditemukan.length ? 'Kurang' : t.length ? 'Tidak Sesuai' : 'Lolos';
    r.alasan = r.na ? r.alasanNA : !r.ditemukan.length ? 'Dokumen tidak ditemukan pada berkas yang terbaca.' : t.length ? t.map(x => x.judul).filter((j, i, A) => A.indexOf(j) === i).map(j => { const n = t.filter(x => x.judul === j).length; return n > 1 ? j + ' (' + n + '×)' : j; }).join('; ') : 'Sesuai' + (r.nomor ? ' · No. ' + r.nomor : '') + (r.tanggal ? ' · ' + tglID(r.tanggal) : '') + (r.pengganti ? ' · digantikan ' + r.pengganti : '');
  });
  const hit = k => temuan.filter(t => t.tingkat === k).length, ringkas = { kritis: hit('KRITIS'), mayor: hit('MAYOR'), minor: hit('MINOR'), catatan: hit('CATATAN'), kurang: tabel.filter(r => r.status === 'Kurang').length };
  const keputusan = ringkas.kritis + ringkas.mayor + ringkas.minor + ringkas.kurang ? 'BUTUH REVISI' : 'LOLOS';
  const vendor = s_(reg.namaVendor || reg.vendor || (inv && inv.penerbit) || '');
  const poin = temuan.filter(t => t.tingkat !== 'CATATAN').map(t => '[' + t.tingkat + '] ' + t.judul + ' — ' + t.detail);
  const kesimpulan = keputusan === 'LOLOS'
    ? 'Dokumen wajib lengkap, nilai Invoice = Kwitansi = BAP, PPN Invoice = Faktur Pajak, dan legalitas terpenuhi berdasarkan pembacaan dokumen. Tagihan dapat diteruskan ke Verifikasi Admin (pemeriksaan dokumen fisik Asli tetap wajib).'
    : 'Ditemukan ' + [ringkas.kritis ? ringkas.kritis + ' temuan kritis' : '', ringkas.mayor ? ringkas.mayor + ' mayor' : '', ringkas.minor ? ringkas.minor + ' minor' : '', ringkas.kurang ? ringkas.kurang + ' dokumen kurang' : ''].filter(Boolean).join(', ') +
      '. Tagihan perlu direvisi sebelum diverifikasi Admin' + (ringkas.kritis ? '; temuan kritis (rekening/faktur/jaminan) berisiko salah bayar atau salah lapor pajak dan harus diselesaikan lebih dahulu.' : '.');
  const rekapNilai = ['INVOICE', 'KWITANSI', 'BAP', 'BAPM', 'BAPA', 'BAPP', 'FAKTUR_PAJAK', 'SPKTV'].filter(ada).map(j => { const z = satu(j), n = z.nilai;   // ringkasan angka untuk BA/laporan
    return { dokumen: VT_NAMA[j], nomor: s_(j === 'FAKTUR_PAJAK' ? z.nomorSeriFaktur || z.nomor : z.nomor), tanggal: z.tanggal, hargaJual: n.hargaJual, dpp: n.dpp, ppn: n.ppn, pph: n.pph, total: n.total, diajukan: n.nilaiDiajukan }; });
  const rekening = []; Object.keys(D).forEach(j => D[j].forEach(z => (z.rekening || []).forEach(r => { const k = vtDigit(r.nomor); if (k && !rekening.some(x => x.k === k && x.dokumen === VT_NAMA[j])) rekening.push({ k: k, dokumen: VT_NAMA[j], bank: r.bank, nomor: r.nomor, atasNama: r.atasNama }); })));
  const lap = { versi: 'VT-1', id: e.id, nomorBA: s_(e.nomorBA), noKontrak: noK, vendor: vendor, kategori: kat, mode: um ? 'UANG_MUKA' : 'PROGRES', nilaiTagihan: Number(e.nilai) || 0,
    keputusan: keputusan, ringkas: ringkas, tabel: tabel.map(r => ({ dokumen: r.dokumen, status: r.status, alasan: s_(r.alasan).slice(0, 500), ditemukan: r.ditemukan })), temuan: temuan.slice(0, 60), poinRevisi: poin.slice(0, 30), kesimpulan: kesimpulan,
    rekapNilai: rekapNilai, rekening: rekening.slice(0, 12).map(r => ({ dokumen: r.dokumen, bank: r.bank, nomor: r.nomor, atasNama: r.atasNama })), dokumenDiperiksa: sumber, sidik: vtSidikChecklist(ck.rec, P), oleh: u.nama, pada: now, aturan: { npwpPembeli: v.npwpPembeli, batasMeterai: v.batasMeterai, toleransi: v.toleransi } };
  let t = JSON.stringify(lap); while (t.length > 45000 && lap.temuan.length > 5) { lap.temuan.pop(); lap.poinRevisi.pop(); t = JSON.stringify(lap); }
  sheet_(P + '_VerifikasiTagihan', VT_COL).appendRow([e.id, now, keputusan, ringkas.kritis, ringkas.mayor, ringkas.minor, u.nama, lap.sidik, t]);
  catat_(P, { id: e.id, noKontrak: noK }, u, 'VERIFIKASI TAGIHAN', keputusan + ' · kritis ' + ringkas.kritis + ' · mayor ' + ringkas.mayor + ' · minor ' + ringkas.minor + ' · kurang ' + ringkas.kurang + ' · ' + sumber.length + ' dokumen');
  return lap;
}

/* ---------- 3. aksi ---------- */
function vtRencana(req, u, P) {
  const x = req.data || {}, ck = vtDokumenChecklist(P, s_(x.id)), s = aiSet(), v = vtSet();
  // 1.8.0: bagian bundel dibaca lebih dahulu (k = BUNDEL:i); item yang dokumennya sudah dipetakan bundel tidak dibaca ulang
  const sudah = {}, Bd = vtBundelBaca(P, ck.e.id), petaB = {}; if (Bd) (Bd.usulan || []).forEach(x => { petaB[x.k] = 1; });
  const bag = vtBagianBundel(Bd).map((b, i, A) => { sudah[b.file.idServer] = 1; let ada = false, uk = 0; try { const f = DriveApp.getFileById(b.file.idServer); uk = f.getSize(); ada = !!vtEksBaca(P, vtSidikBerkas(f)); } catch (e) { }
    return { k: 'BUNDEL:' + i, nama: 'Bundel' + (A.length > 1 ? ' bagian ' + (i + 1) + '/' + A.length : ''), file: s_(b.file.nama).slice(0, 120), ukuran: uk, cache: ada }; });
  const dok = bag.concat(ck.dok.filter(d => d.file && vtPerluAI(d.k) && !petaB[d.k] && !sudah[d.file.idServer] && (sudah[d.file.idServer] = 1)).map(d => { let sid = '', ada = false, uk = 0; try { const f = DriveApp.getFileById(d.file.idServer); sid = vtSidikBerkas(f); uk = f.getSize(); ada = !!vtEksBaca(P, sid); } catch (e) { }
    return { k: d.k, nama: d.nama, file: s_(d.file.nama).slice(0, 120), ukuran: uk, cache: ada }; }));
  let prov = ''; try { prov = vtProvPilih(s, v); } catch (e) { }
  return { ok: true, id: ck.e.id, kategori: ck.rec.kategori, dokumen: dok, dilewati: ck.dok.filter(d => d.file && !vtPerluAI(d.k)).map(d => d.nama), kurang: ck.dok.filter(d => !d.file && d.status !== 'NA').map(d => d.nama), provider: prov, providerNama: prov ? s.prov[prov].nama + ' · ' + s.prov[prov].model : '', sisaKuota: s.kuota - aiPakai(u) };
}
function vtRingkas(P) {
  const L = vtTerakhir(P), C = {}; cl217Baca_(P).forEach(r => { C[r.id] = r; });
  return Object.keys(L).map(id => { const r = L[id]; return { id: id, keputusan: r.keputusan, ringkas: r.ringkas, pada: r.pada, oleh: r.oleh, kedaluwarsa: !!(C[id] && vtSidikChecklist(C[id], P) !== r.sidik), nomorBA: r.nomorBA, vendor: r.vendor, noKontrak: r.noKontrak,
    teratas: (r.temuan || []).filter(t => t.tingkat !== 'CATATAN').slice(0, 3).map(t => t.tingkat + ': ' + t.judul) }; });
}
function vtSetel(P, x, u) {
  if (!u.admin) throw new Error('Setelan verifikasi tagihan khusus Admin.');
  const d = jsonProp('AI_SET', {}) || {}, s = aiSet(), lama = vtSet();
  const prov = s_(x.provider); if (prov && VT_PDF.indexOf(prov) < 0 && !(s.prov[prov] && /openrouter\.ai/i.test(s.prov[prov].url))) throw new Error('Penyedia ' + prov + ' tidak dapat membaca PDF.');
  const npwp = vtDigit(x.npwpPembeli !== undefined ? x.npwpPembeli : lama.npwpPembeli); if (npwp && (npwp.length < 15 || npwp.length > 16)) throw new Error('NPWP pembeli harus 15/16 digit.');
  d.verifikasi = { provider: prov, gerbang: VT_GERBANG.indexOf(x.gerbang) >= 0 ? x.gerbang : VT_DEF.gerbang, otomatis: x.otomatis !== false, npwpPembeli: npwp, namaPembeli: s_(x.namaPembeli || lama.namaPembeli).trim().slice(0, 60),
    batasMeterai: Math.max(0, Number(x.batasMeterai) || lama.batasMeterai), toleransi: Math.max(0, Math.min(1000, Number(x.toleransi === undefined ? lama.toleransi : x.toleransi) || 0)) };
  PR_().setProperty('AI_SET', JSON.stringify(d));
  catat_(P, { id: 'VERIFIKASI-TAGIHAN', noKontrak: 'setelan' }, u, 'UBAH SETELAN VERIFIKASI TAGIHAN', JSON.stringify(d.verifikasi));
  return vtInfo(P, u);
}
function vtInfo(P, u) {
  const s = aiSet(), v = vtSet();
  return { ok: true, setelan: v, penyedia: vtProvList(s).map(id => ({ id: id, nama: s.prov[id].nama, model: s.prov[id].model })), boleh: true, bolehJalan: !!(u.admin || u.peran === 'PENGADAAN'), admin: !!u.admin };
}
function vtStatusGerbang(P, id) {   // hasil terakhir + kesegaran terhadap checklist saat ini
  const r = vtTerakhir(P)[s_(id)], c = cl217Cari_(P, s_(id)).rec, segar = !!(r && c && vtSidikChecklist(c, P) === r.sidik);
  return { r: r, c: c, segar: segar, berat: !!(r && (Number(r.ringkas.kritis) + Number(r.ringkas.mayor)) > 0) };
}
function vtGerbang(req, u, P, now) {   // dipanggil sebelum Verifikasi Admin (checklistVerifikasi) — kernel tetap menjalankan logikanya
  const x = req.data || {}, v = vtSet(), g = vtStatusGerbang(P, x.id), r = g.r, c = g.c, segar = g.segar, alasan = s_(x.vtAlasan).trim();
  const butuh = !segar ? (r ? 'hasil verifikasi kedaluwarsa (PDF/checklist berubah)' : 'belum ada hasil verifikasi untuk versi berkas terakhir') : r.keputusan !== 'LOLOS' ? 'hasil verifikasi: BUTUH REVISI (' + r.ringkas.kritis + ' kritis, ' + r.ringkas.mayor + ' mayor, ' + r.ringkas.minor + ' minor)' : '';
  if (butuh && v.gerbang === 'kunci' && g.berat) {   // 1.7.0: Kritis/Mayor tidak dapat dikecualikan
    catat_(P, { id: s_(x.id), noKontrak: s_(c && c.noKontrak) }, u, 'GERBANG VERIFIKASI TERKUNCI', butuh);
    throw new Error('Gerbang verifikasi TERKUNCI: ' + butuh + '. Temuan Kritis/Mayor harus diperbaiki vendor, PDF diganti, lalu Verifikasi Tagihan dijalankan ulang hingga tidak ada temuan Kritis/Mayor.');
  }
  if (butuh) {
    if (v.gerbang !== 'peringatan' && alasan.length < 20) throw new Error('Gerbang verifikasi tagihan: ' + butuh + '. Jalankan Verifikasi Tagihan atau isi alasan pengecualian (min. 20 karakter).');
    req.data = Object.assign({}, x, { keterangan: (s_(x.keterangan) + ' | Verifikasi AI: ' + butuh + (alasan ? ' · alasan pengecualian: ' + alasan : '')).replace(/^ \| /, '').slice(0, 300) });
    catat_(P, { id: s_(x.id), noKontrak: s_(c && c.noKontrak) }, u, 'VERIFIKASI ADMIN DENGAN CATATAN AI', butuh + (alasan ? ' · alasan: ' + alasan.slice(0, 300) : ' · tanpa alasan (gerbang peringatan)'));
  }
  return cl217Aksi_(req, u, P, now);
}
function vtGerbangBayar(req, u, P) {   // 1.7.0 (menimpa keuanganProgres): kembali undefined → logika kernel berjalan utuh
  const x = req.data || {}, tujuan = s_(x.bayar && x.bayar.status).toUpperCase();
  if (['DIAJUKAN', 'DIVERIFIKASI', 'DIBAYAR'].indexOf(tujuan) < 0 || vtSet().gerbang !== 'kunci') return undefined;
  const e = bacaKoleksi_(P, 'progres').find(z => z.id === s_(x.id)); if (!e || s_(e.bayar && e.bayar.status).toUpperCase() === tujuan) return undefined;
  const g = vtStatusGerbang(P, x.id);
  if (g.segar && g.berat) {
    catat_(P, { id: e.id, noKontrak: e.noKontrak }, u, 'GERBANG BAYAR TERKUNCI', tujuan + ' ditolak: ' + g.r.ringkas.kritis + ' kritis, ' + g.r.ringkas.mayor + ' mayor');
    throw new Error('Pembayaran TERKUNCI oleh Verifikasi Tagihan: ' + g.r.ringkas.kritis + ' temuan kritis dan ' + g.r.ringkas.mayor + ' temuan mayor belum diselesaikan. Perbaiki dokumen dan jalankan verifikasi ulang.');
  }
  return undefined;
}
function anVerifikasi(P) {
  const R = vtRingkas(P), T = bacaKoleksi_(P, 'progres'), C = {}; cl217Baca_(P).forEach(r => { C[r.id] = r; });
  return { totalTagihan: T.length, sudahDiverifikasi: R.length, butuhRevisi: R.filter(r => r.keputusan !== 'LOLOS').length, kedaluwarsa: R.filter(r => r.kedaluwarsa).length,
    belumDiverifikasiPadahalLengkap: T.filter(e => { const c = C[e.id]; if (!c || !c.kategori) return false; let h; try { h = cl217Hitung_(c); } catch (x) { return false; } return h.lengkap === h.total && !R.some(r => r.id === e.id); }).map(e => ({ id: e.id, nomorBA: e.nomorBA, noKontrak: e.noKontrak, nilai: e.nilai })).slice(0, 20),
    hasil: R.sort((a, b) => (b.ringkas.kritis - a.ringkas.kritis) || (b.ringkas.mayor - a.ringkas.mayor)).slice(0, 25) };
}
AI_PERINTAH.push({ id: 'verifikasi-tagihan', ikon: 'fa-file-shield', judul: 'Ringkasan verifikasi tagihan & prioritas revisi', data: anVerifikasi,
  tugas: 'Ringkas hasil Verifikasi Tagihan (AI auditor) seluruh tagihan: urutkan prioritas revisi (temuan kritis rekening/faktur/jaminan lebih dahulu), sebut nomor BA & vendor, tagihan lengkap yang belum diverifikasi, dan hasil kedaluwarsa (PDF diganti). Beri langkah tindak lanjut per fungsi (Pengadaan/Keuangan/Vendor).' });
