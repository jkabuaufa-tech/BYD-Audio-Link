#!/usr/bin/env python3
"""Rakit pembaruan-2.5.6.json dari pembaruan-2.5.5.json (paket terpasang) + patch terdokumentasi pembaruan-2.5.6.patch.json.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-2.5.6.py
Setiap operasi mengganti teks yang UNIK (atau jumlah tepat untuk 'ganti-semua') — gagal keras bila penanda tidak ditemukan,
sehingga patch tidak pernah diterapkan pada paket yang berbeda. Tidak menyentuh data apa pun: hanya teks CSS/JS paket aplikasi.
Hasil dapat diverifikasi ulang: python3 -I alat/terapkan-patch.py pembaruan-2.5.5.json pembaruan-2.5.6.patch.json uji-hasil.json"""
import json, hashlib, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(R, 'sumber', '2.5.6')
baca = lambda n: open(os.path.join(S, n), encoding='utf-8').read()
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
P = json.load(open(os.path.join(R, 'pembaruan-2.5.5.json'), encoding='utf-8'))
assert P['versi'] == '2.5.5'
OP = []
def ganti(berkas, cari, ganti_, ket, semua=None):
    o = {'berkas': berkas, 'jenis': 'ganti-semua' if semua else 'ganti-teks', 'cari': cari, 'ganti': ganti_, 'keterangan': ket}
    if semua: o['jumlah'] = semua
    OP.append(o)
def blok(berkas, mulai, akhir, isi, ket):
    OP.append({'berkas': berkas, 'jenis': 'ganti-blok', 'mulai': mulai, 'akhir': akhir, 'sertakanAkhir': False, 'isi': isi, 'keterangan': ket})

# ---------- versi tampilan ----------
ganti('js', "= '2.5.5';", "= '2.5.6';", 'Nomor versi paket di 4 blok (VERSI_PAKET & VERSI).', semua=4)

# ---------- A. KARTU GUDANG (MP223 §5): combobox, periode Bulan/Tahun 26–25, keterangan per transaksi, saldo akhir ----------
blok('js', "  const K = { kunci: '', dari: '', sd: '', semua: false };\n",
     "\n  /* ======================= 6. STOK PERSEDIAAN & PENGELUARAN ======================= */",
     baca('mp223-kartu.js').rstrip('\n'),
     'MP223 §5 Kartu Gudang diganti utuh: combobox material, Bulan|Tahun|Tampilkan (26–25 WIB), keterangan "ket" per transaksi (fallback bawaan), saldo akhir = awal + masuk − keluar; cetak & Excel sama.')

# ---------- B. STOK & PENGELUARAN (MP223 §6): combobox material GI, draf formulir tidak hilang saat render ulang ----------
ganti('js', """        <div class="col-12"><label class="form-label small mb-0" for="mp223KItem">Material <span class="text-danger">*</span></label><select class="form-select" id="mp223KItem"><option value="">— pilih material (stok tersedia) —</option>""",
      """        <div class="col-12"><label class="form-label small mb-0" for="mp223KItemCari">Material <span class="text-danger">*</span> <span class="mp220-sub">(ketik kode / nama)</span></label>${cbHtml('mp223KItemCari', ada.length ? 'Ketik kode / nama material (stok tersedia)…' : 'Tidak ada material dengan stok')}<select class="form-select" id="mp223KItem" aria-hidden="true" tabindex="-1" hidden><option value="">— pilih material (stok tersedia) —</option>""",
      'GI: kotak cari material; <select id="mp223KItem"> asli tetap (tersembunyi) sebagai sumber kunci.')
ganti('js', """<div class="col-12"><label class="form-label small mb-0" for="mp223KKet">Keterangan</label><input class="form-control" id="mp223KKet" maxlength="500"></div></div>""",
      """<div class="col-12"><label class="form-label small mb-0" for="mp223KKet">Keterangan <span class="mp220-sub">(tampil di Kartu Gudang)</span></label><input class="form-control" id="mp223KKet" maxlength="500" placeholder="mis. Pengecoran pile cap P3"></div></div>""",
      'GI: petunjuk bahwa keterangan tampil di Kartu Gudang (tetap dikirim sebagai ket ke gudangKeluarSimpan).')
ganti('js', """    if (S.pilih && !ada.some(m => m.kunci === S.pilih)) S.pilih = '';
    el.innerHTML = b + kpi([""",
      """    if (S.pilih && !ada.some(m => m.kunci === S.pilih)) S.pilih = '';
    const draf = drafKeluar(), fk = cbFokus('mp223KItemCari');   // [2.5.6] isian formulir GI & teks cari tidak hilang saat data dimuat ulang
    el.innerHTML = b + kpi([""",
      'vStok: simpan isian formulir GI sebelum render ulang.')
ganti('js', """          : '<tr><td colspan="8" class="mp219-kosong">Belum ada pengeluaran pada bulan ini.</td></tr>'}</tbody></table></div></div>`;
    pasangKeluar();""",
      """          : '<tr><td colspan="8" class="mp219-kosong">Belum ada pengeluaran pada bulan ini.</td></tr>'}</tbody></table></div></div>`;
    pulihDraf(draf);
    cbPasang({ id: 'mp223KItemCari', sel: 'mp223KItem', kejadian: 'input', pulih: fk, padaPilih: x => { S.pilih = x.kunci; },
      items: ada.map(m => ({ kunci: m.kunci, kode: m.kode, uraian: m.uraian, sat: m.sat, info: 'stok ' + ang(m.sisa) })) });
    pasangKeluar();""",
      'vStok: pulihkan isian & pasang combobox sebelum validasi formulir (cekKeluar) berjalan.')
ganti('js', """  window.mp223PilihKeluar = k => {""",
      """  const DRAF_GI = ['mp223KTgl', 'mp223KQty', 'mp223KUntuk', 'mp223KPen', 'mp223KKet'];
  function drafKeluar() { if (!document.getElementById('mp223FK')) return null; const o = {}; DRAF_GI.forEach(id => { const x = document.getElementById(id); if (x) o[id] = x.value; }); return o; }
  function pulihDraf(o) { if (!o) return; DRAF_GI.forEach(id => { const x = document.getElementById(id); if (x && o[id] !== undefined && o[id] !== x.value) x.value = o[id]; }); }
  window.mp223PilihKeluar = k => {""",
      'Fungsi draf formulir GI (baca/isi kembali nilai input; tidak menyimpan apa pun ke server).')
ganti('js', """        GD.keluar.push(r.data); S.foto = null; S.pilih = '';""",
      """        GD.keluar.push(r.data); S.foto = null; S.pilih = '';
        ['mp223KQty', 'mp223KUntuk', 'mp223KPen', 'mp223KKet'].forEach(id => { const x = g(id); if (x) x.value = ''; }); const tx = g('mp223KTgl'); if (tx) tx.value = hariIni();   // [2.5.6] formulir kosong lagi setelah tersimpan""",
      'GI tersimpan → formulir dikosongkan (perilaku lama), draf tidak dibawa ke transaksi berikutnya.')

# ---------- C. CHECKLIST (MP219): unggah tanpa AI, status, Coba lagi tanpa duplikat, Mode Manual ----------
blok('js', "  window.mp219ClUploadSimpan = async k => {\n", "  async function simpan(pesanOk) {",
     baca('mp219-unggah.js'),
     'MP219: unggah PDF checklist dipisah dari AI — tahap & status, sebab gagal spesifik, Coba lagi aman (sidik SHA-256 + Manifest), riwayat berkas, Mode Manual/AI.')
ganti('js', """        <div id="mp219UpPesan" class="small"></div></div>
      <div class="mp219-df"><button type="button" class="btn btn-light border" onclick="mp219TutupLapis()">Batal</button><button type="button" class="btn btn-primary" id="mp219UpOk" onclick="mp219ClUploadSimpan('${k}')">Simpan</button></div>`, 520);""",
      """        ${v.file ? `<div class="mp256-ganti small"><i class="fas fa-clock-rotate-left me-1"></i>Mengganti PDF tidak menghapus berkas lama — berkas lama tetap tersimpan di Google Drive. <a href="#" onclick="mp256RiwayatBerkas('${k}');return false">Lihat riwayat berkas</a><div id="mp219UpRiwayat" hidden></div></div>` : ''}
        <div id="mp219UpStatus" class="mp256-up" role="status" aria-live="polite" hidden></div>
        <div id="mp219UpPesan" class="small"></div></div>
      <div class="mp219-df"><button type="button" class="btn btn-light border" onclick="mp219TutupLapis()">Batal</button><button type="button" class="btn btn-primary" id="mp219UpOk" onclick="mp219ClUploadSimpan('${k}')">Simpan</button></div>`, 520);""",
      'Dialog Upload: kotak status unggah + catatan berkas lama tetap ada + riwayat berkas.')
ganti('js', """    const can = bisaUbah();
    return (T[r.kategori] || []).map((sec, j) =>""",
      """    const can = bisaUbah();
    return stripMode() + (T[r.kategori] || []).map((sec, j) =>""",
      'Checklist Dokumen: strip Mode Manual/AI + peringatan PDF yang belum disimpan + banner AI gagal.')
ganti('js', """<i class="fas fa-file-pdf"></i>${E(String(v.file.nama || 'dokumen.pdf').replace(/^.* · /, '').slice(0, 26))}</a>""",
      """<i class="fas fa-file-pdf"></i>${E(String(v.file.nama || 'dokumen.pdf').replace(/^.* · /, '').slice(0, 26))}</a>${tersimpanDiServer(v) ? '<span class="mp256-bd ok" title="PDF tersimpan di Google Drive dan tercatat di checklist server">✓ Drive</span>' : '<span class="mp256-bd tunda" title="PDF sudah di Google Drive tetapi checklist belum disimpan — klik Simpan">belum disimpan</span>'}""",
      'Baris checklist: lencana keberadaan dokumen (tersimpan di Drive & checklist / belum disimpan).')
ganti('js', """    try { const r = await regAksi('checklistBaca', { id }); F.rec = JSON.parse(JSON.stringify(r.data)); F.rec.items = F.rec.items || {}; gambar(); }""",
      """    try { const r = await regAksi('checklistBaca', { id }); F.rec = JSON.parse(JSON.stringify(r.data)); F.rec.items = F.rec.items || {}; tandaiTersimpan(); gambar(); }""",
      'Catat idServer berkas yang sudah tersimpan di server saat checklist dibuka.')
ganti('js', """      F.rec = JSON.parse(JSON.stringify(r.data)); F.rec.items = F.rec.items || {}; F.dirty = false; F.log = null;""",
      """      F.rec = JSON.parse(JSON.stringify(r.data)); F.rec.items = F.rec.items || {}; F.dirty = false; F.log = null; tandaiTersimpan(); F.galatSimpan = '';""",
      'Setelah Simpan berhasil: perbarui daftar berkas tersimpan.')
ganti('js', """    } catch (err) { notif('Checklist belum tersimpan: ' + err.message, 'err'); return false; }""",
      """    } catch (err) { F.galatSimpan = err.message; notif('Checklist belum tersimpan: ' + err.message, 'err'); return false; }""",
      'Simpan gagal: pesan disimpan untuk status dialog unggah.')
ganti('js', """      F.rec = JSON.parse(JSON.stringify(r.data)); F.rec.items = F.rec.items || {}; F.log = null;""",
      """      F.rec = JSON.parse(JSON.stringify(r.data)); F.rec.items = F.rec.items || {}; F.log = null; tandaiTersimpan();""",
      'Setelah Verifikasi Admin / ubah kategori: perbarui daftar berkas tersimpan.', semua=2)

# ---------- D. VERIFIKASI AI (MP230) tetap — hanya pemisahan dari unggah ----------
ganti('js', """  function otomatis(rec) {
    if (!bolehJalan() ||""",
      """  function otomatis(rec) {
    if (typeof window.mp256ModeManual === 'function' && window.mp256ModeManual()) return;   // [2.5.6] Mode Manual: tanpa verifikasi AI otomatis (tanpa biaya AI)
    if (!bolehJalan() ||""",
      'Mode Manual: verifikasi AI otomatis setelah checklist lengkap tidak dijalankan (tombol Verifikasi AI tetap ada).')
ganti('js', """    el.innerHTML = `<div class="mp230-pn">${panelVt(id)}</div>`;""",
      """    el.innerHTML = `<div class="mp230-pn">${typeof window.mp256BannerAI === 'function' ? window.mp256BannerAI(id) : ''}${panelVt(id)}</div>`;""",
      'Tab Verifikasi AI: banner "penyimpanan berhasil, analisis AI belum berhasil".')
ganti('js', """    catch (err) { pesan('Verifikasi tagihan gagal: ' + err.message, 'err'); kunciGagal(err.message); }""",
      """    catch (err) { pesan('Verifikasi tagihan (AI) belum berhasil: ' + err.message + ' — PDF & checklist yang tersimpan tidak berubah dan status verifikasi tidak diubah. Ulangi nanti atau lanjutkan dengan Mode Manual.', 'err'); kunciGagal(err.message); }""",
      'Pesan gagal verifikasi AI: tegaskan dokumen tersimpan & status tidak berubah.')
ganti('js', """    VT.unggah[id] = { ket: 'Memeriksa PDF…', file: file.name + ' · ' + (file.size / MB).toFixed(1) + ' MB' }; gambarCl();
    try {""",
      """    VT.unggah[id] = { ket: 'Memeriksa PDF…', file: file.name + ' · ' + (file.size / MB).toFixed(1) + ' MB' }; gambarCl();
    let T256 = null;   // [2.5.6] jejak bagian yang sudah tersimpan untuk pesan "penyimpanan berhasil, AI gagal"
    try {""",
      'Bundel: siapkan jejak bagian tersimpan.')
ganti('js', """T = VT.tunda[kunci] = VT.tunda[kunci] || { berkas: [], dibaca: {} };""",
      """T = VT.tunda[kunci] = VT.tunda[kunci] || { berkas: [], dibaca: {} }; T256 = T;""",
      'Bundel: rujuk antrean lanjut-otomatis yang sama (tanpa perubahan perilaku).')
ganti('js', """      delete VT.tunda[kunci];
""",
      """      delete VT.tunda[kunci]; if (VT.gagalAI) delete VT.gagalAI[id];
""",
      'Bundel berhasil: hapus banner gagal AI.')
ganti('js', """    } catch (err) {
      if (kunciGagal(err.message)) { pesan('Bundel tertunda:""",
      """    } catch (err) {
      try { VT.gagalAI = VT.gagalAI || {}; VT.gagalAI[id] = { pesan: String(err && err.message || err).slice(0, 300), file, n: T256 && T256.L ? T256.L.length : 0, tersimpan: T256 ? (T256.berkas || []).filter(Boolean).length : 0, pada: Date.now() }; } catch (e) { }   // [2.5.6]
      if (kunciGagal(err.message)) { pesan('Bundel tertunda:""",
      'Bundel gagal: catat sebab & jumlah bagian yang sudah tersimpan (tidak ada yang dihapus/dibatalkan).')

# ---------- E. MP241: tombol bundel & periode Kartu Gudang ----------
ganti('js', """    if (F.dirty !== false) return 'Simpan perubahan checklist dahulu, lalu unggah bundel.';""",
      """    if (F.dirty !== false) return 'Simpan perubahan checklist dahulu, lalu unggah bundel.';
    if (typeof window.mp256ModeManual === 'function' && window.mp256ModeManual()) return 'Mode Manual (Tanpa AI) aktif: bundel PDF memerlukan pembacaan AI. Unggah PDF per baris checklist, atau pilih Mode AI di atas daftar checklist.';   // [2.5.6]""",
      'Mode Manual: tombol Unggah Bundel memberi petunjuk (bundel butuh AI) — fitur bundel tetap ada di Mode AI.')
ganti('js', """    if (K._mp241User === true) return ubah;
    if (!K.dari || /-01$/.test(K.dari))""",
      """    if (K.bulan && K.tahun && typeof window.mp256Periode === 'function') { const p = window.mp256Periode(K.bulan, K.tahun); if (K.dari !== p.dari || K.sd !== p.sd) { K.dari = p.dari; K.sd = p.sd; ubah = true; } return ubah; }   // [2.5.6] Bulan/Tahun pilihan pengguna tidak pernah ditimpa
    if (K._mp241User === true) return ubah;
    if (typeof window.mp256PeriodeKini === 'function') { Object.assign(K, window.mp256PeriodeKini()); const p = window.mp256Periode(K.bulan, K.tahun); K.dari = p.dari; K.sd = p.sd; return true; }   // [2.5.6] bawaan 26–25
    if (!K.dari || /-01$/.test(K.dari))""",
      'siapkanK: periode Bulan/Tahun (26–25) dihormati; bawaan = periode berjalan WIB; logika 25–25 lama tetap sebagai cadangan.')
ganti('js', """          out.unshift({ grup: 'Gudang', ik: 'fa-id-card', l: 'Kartu Gudang periode 25–25', s: window.mp241Tanggal25Prev() + ' s.d. ' + window.mp241Tanggal25Now(),
            aksi: () => { const K = window.mp223K; if (K) { delete K._mp241User; delete K._mp241SemuaUser; K.dari = ''; K.sd = ''; } if""",
      """          out.unshift({ grup: 'Gudang', ik: 'fa-id-card', l: 'Kartu Gudang periode 26–25 (bulan berjalan)', s: (() => { try { const p = window.mp256PeriodeKini(), r = window.mp256Periode(p.bulan, p.tahun); return r.dari + ' s.d. ' + r.sd; } catch (e) { return window.mp241Tanggal25Prev() + ' s.d. ' + window.mp241Tanggal25Now(); } })(),
            aksi: () => { const K = window.mp223K; if (K) { delete K._mp241User; delete K._mp241SemuaUser; K.dari = ''; K.sd = ''; K.bulan = 0; K.tahun = 0; } if""",
      'Ctrl+K: Kartu Gudang periode 26–25 bulan berjalan.')

# ---------- CSS ----------
css_baru = baca('mp256.css')
OP.append({'berkas': 'css', 'jenis': 'tambah-akhir', 'isi': '\n' + css_baru, 'keterangan': 'CSS MP256 (combobox, periode, status unggah, mode checklist) ditambahkan di akhir; aturan lama tidak diubah.'})

CATATAN = ("Pembaruan 2.5.6 (kumulatif dari 2.5.5 … 2.2.7; modul server tetap 1.8.4 — tidak ada perubahan server, database, atau izin Google).\n"
  "PERBAIKAN 2.5.6 — (1) Kartu Gudang: pilih material dengan mengetik kode/nama (pencarian sebagian, tanpa peduli huruf besar, klik atau ↑/↓ Enter); "
  "periode Pilih Bulan | Pilih Tahun | Tampilkan = 26 bulan sebelumnya s.d. 25 bulan terpilih (WIB) — sama di layar, cetak LOGINV-09 & Excel; "
  "Keterangan menampilkan keterangan yang dicatat pada transaksi (data lama tanpa keterangan: bon/SJ, lokasi/penerima), satu baris per transaksi; "
  "kotak Saldo akhir = saldo awal + penerimaan − pengeluaran periode (sebelumnya saldo awal terhitung dua kali bila ≠ 0). Jumlah terusan tetap kumulatif sejak awal proyek. "
  "(2) Stok & Pengeluaran: material GI dipilih dengan kotak cari (stok & satuan tampil); isian formulir tidak hilang saat data dimuat ulang; keterangan GI tampil di Kartu Gudang. "
  "(3) Checklist tagihan: unggah PDF tanpa AI — status Sedang mengunggah/Berhasil/Gagal per tahap, sebab gagal (file terlalu besar, koneksi terputus, izin ditolak, penyimpanan gagal), "
  "Coba lagi tanpa berkas ganda, lencana dokumen tersimpan / belum disimpan, riwayat berkas lama (tidak dihapus). Pilihan Mode Manual (Tanpa AI) / Mode AI per perangkat; "
  "unggahan ≠ LOLOS — Verifikasi Admin & gerbang bayar tidak berubah. Bila AI gagal (key/kuota/server), bundel yang tersimpan tidak dibatalkan: tampil 'penyimpanan berhasil, analisis AI belum berhasil' + Ulangi AI / Mode Manual.\n"
  "Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.5.5 (hanya tampilan; data yang dicatat setelah pembaruan tetap ada).\n") + P['catatan']

H = dict(P)
for o in OP:
    t = H[o['berkas']]
    if o['jenis'] == 'ganti-teks':
        n = t.count(o['cari']); assert n == 1, ('penanda tidak unik', n, o['cari'][:80]); t = t.replace(o['cari'], o['ganti'])
    elif o['jenis'] == 'ganti-semua':
        n = t.count(o['cari']); assert n == o['jumlah'], ('jumlah penanda', n, o['cari'][:80]); t = t.replace(o['cari'], o['ganti'])
    elif o['jenis'] == 'ganti-blok':
        a = t.find(o['mulai']); assert a >= 0 and t.count(o['mulai']) == 1, ('mulai', o['mulai'][:80])
        e = t.find(o['akhir'], a); assert e > a, ('akhir', o['akhir'][:80]); t = t[:a] + o['isi'] + t[e:]
    elif o['jenis'] == 'tambah-akhir':
        t = t + o['isi']
    H[o['berkas']] = t
assert H['js'].count('MP218_ADMIN_FIRST_MARKER') == P['js'].count('MP218_ADMIN_FIRST_MARKER')
H.update(versi='2.5.6', tanggal='2026-10-15', catatan=CATATAN)
json.dump(H, open(os.path.join(R, 'pembaruan-2.5.6.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
X = {'format': 'monitoring-sap-pembaruan-patch', 'dari': '2.5.5', 'ke': '2.5.6', 'tanggal': '2026-10-15',
     'keterangan': 'Patch dari pembaruan-2.5.5.json → 2.5.6 (hanya CSS/JS aplikasi; tanpa perubahan modul server, sheet, Drive, atau data). Kernel hanya menerima paket kumulatif: unggah pembaruan-2.5.6.json. '
                   'Operasi berurutan: "ganti-teks" (penanda unik), "ganti-semua" (jumlah tepat), "ganti-blok" (dari "mulai" s.d. sebelum "akhir"), "tambah-akhir".',
     'sha256Sumber': {'css': sha(P['css']), 'js': sha(P['js'])}, 'sha256Hasil': {'css': sha(H['css']), 'js': sha(H['js'])}, 'catatan': CATATAN, 'operasi': OP}
json.dump(X, open(os.path.join(R, 'pembaruan-2.5.6.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK pembaruan-2.5.6.json', len(json.dumps(H, ensure_ascii=False).encode()) // 1024, 'KB ·', len(OP), 'operasi · js', sha(H['js'])[:12], '· css', sha(H['css'])[:12])
