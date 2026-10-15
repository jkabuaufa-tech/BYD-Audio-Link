#!/usr/bin/env python3
"""Rakit pembaruan-2.5.8.json dari pembaruan-2.5.7.json (+ patch terdokumentasi). Pasangan modul server 1.8.6 (tanpa perubahan server).
2.5.8 — ALUR BARU VERIFIKASI TAGIHAN:
  Tahap 1: unggah bundel → AI memisahkan dokumen menurut judul tercetak (BAP, BAPP, Kwitansi, Invoice, Faktur Pajak, Kontrak, …) → dipotong & mengisi baris checklist. TANPA verifikasi.
  Tahap akhir: verifikasi AI berjalan otomatis saat Admin menekan "Verifikasi Admin" (sebelum bayar) bila belum ada hasil / hasil kedaluwarsa.
  Gerbang Verifikasi Admin & bayar di server tidak berubah.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-2.5.8.py"""
import json, hashlib, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
P = json.load(open(os.path.join(R, 'pembaruan-2.5.7.json'), encoding='utf-8')); assert P['versi'] == '2.5.7'
OP = []
def ganti(cari, ganti_, ket, semua=None):
    o = {'berkas': 'js', 'jenis': 'ganti-semua' if semua else 'ganti-teks', 'cari': cari, 'ganti': ganti_, 'keterangan': ket}
    if semua: o['jumlah'] = semua
    OP.append(o)
ganti("= '2.5.7';", "= '2.5.8';", 'Nomor versi paket.', semua=4)
ganti("""        VT.sub[id] = 'laporan'; delete VT.lap[id];
        pesan('Bundel' + (n > 1 ? ' (' + n + ' bagian)' : '') + ' dipisahkan menjadi ' + r.segmen.length + ' dokumen' + (nPot ? ', ' + nPot + ' dipotong otomatis ke checklist' : '') + ' — verifikasi berjalan.', 'ok');
        setTimeout(() => window.mp230Jalan(id), 0);""",
      """        VT.sub[id] = 'bundel';   // [2.5.8] TAHAP 1 selesai — verifikasi TIDAK dijalankan di sini; dijalankan pada tahap akhir (Verifikasi Admin, sebelum bayar)
        pesan('Tahap 1 selesai: bundel dipisahkan menurut judul menjadi ' + r.segmen.length + ' dokumen' + (nPot ? ', ' + nPot + ' dokumen mengisi baris checklist' : '') + '. Periksa & lengkapi checklist. Verifikasi AI dijalankan pada tahap akhir (saat Verifikasi Admin, sebelum bayar).', 'ok');""",
      'Tahap 1: setelah bundel dipisah & mengisi checklist, verifikasi tidak lagi dijalankan otomatis.')
ganti("""  function otomatis(rec) {
""", """  function otomatis(rec) {
    return;   // [2.5.8] verifikasi tidak lagi berjalan saat checklist lengkap — dipindah ke tahap akhir (Verifikasi Admin, sebelum bayar). Kode lama di bawah dipertahankan untuk rollback/audit.
""", 'Verifikasi otomatis saat checklist lengkap dinonaktifkan (dipindah ke tahap akhir).')
ganti("""    if (typeof vf === 'function') window.mp219ClVerifikasi = function () { const r = vf.apply(this, arguments); try { if (aktif()) kotakGerbang(); } catch (e) { console.warn('[2.4.0] gerbang', e); } return r; };""",
      """    if (typeof vf === 'function') window.mp219ClVerifikasi = async function () {
      // [2.5.8] TAHAP AKHIR: sebelum dialog Verifikasi Admin, jalankan verifikasi AI bila belum ada hasil / hasil kedaluwarsa (Setelan "otomatis tahap akhir")
      const f = F(), id = f.rec && f.rec.id, set = (VT.info && VT.info.setelan) || {}, v = id ? VT.ringkas[id] : null;
      let h = null; try { h = window.MP219_HITUNG(f.rec); } catch (e) { }
      const manual = typeof window.mp256ModeManual === 'function' && window.mp256ModeManual();
      if (id && adm() && aktif() && !manual && set.otomatis !== false && bolehJalan() && ((VT.info && VT.info.penyedia) || []).length && h && !h.kurang.length && !f.dirty && !f.rec.verified && (!v || v.kedaluwarsa) && VT.tahapAkhir !== id) {
        VT.tahapAkhir = id;
        try { pesan('Tahap akhir: Verifikasi Dokumen (AI) dijalankan sebelum Verifikasi Admin…', ''); VT.sub[id] = 'laporan'; delete VT.lap[id]; if (typeof window.mp230ClTab === 'function') window.mp230ClTab();
          const L = await jalankan(id); if (L) pesan('Verifikasi Dokumen (AI) tahap akhir: ' + L.keputusan + (L.keputusan === 'LOLOS' ? '' : ' (' + L.ringkas.kritis + ' kritis, ' + L.ringkas.mayor + ' mayor)') + '.', L.keputusan === 'LOLOS' ? 'ok' : 'err'); }
        catch (err) { pesan('Verifikasi AI tahap akhir belum berhasil: ' + err.message + ' — Verifikasi Admin tetap dapat dilanjutkan sesuai gerbang (alasan pengecualian).', 'err'); kunciGagal(err.message); }
        finally { VT.tahapAkhir = ''; }
      }
      const r = vf.apply(this, arguments); try { if (aktif()) kotakGerbang(); } catch (e) { console.warn('[2.4.0] gerbang', e); } return r;
    };""", 'Tahap akhir: verifikasi AI dijalankan otomatis tepat sebelum dialog Verifikasi Admin.')
ganti("""> Jalankan verifikasi otomatis saat checklist menjadi lengkap""",
      """> Jalankan verifikasi AI otomatis pada <b>tahap akhir</b> — saat Verifikasi Admin, sebelum bayar (bila belum ada hasil / hasil kedaluwarsa)""",
      'Setelan: arti opsi "otomatis" = tahap akhir.')
ganti(""">Verifikasi dengan bundel</button><span>Bundel adalah <b>sumber utama</b> verifikasi. Setiap dokumen sudah <b>dipotong otomatis</b> ke baris checklist saat bundel diunggah; tombol ini menjalankan ulang verifikasi.</span></div>""",
      """>Cek verifikasi sekarang (opsional)</button><span><b>Tahap 1</b> selesai saat bundel diunggah: setiap dokumen dipisah menurut judulnya dan <b>dipotong otomatis</b> ke baris checklist. Verifikasi AI resmi berjalan pada <b>tahap akhir</b> (Verifikasi Admin, sebelum bayar); tombol ini hanya untuk cek lebih awal.</span></div>""",
      'Tab Bundel: tombol verifikasi menjadi opsional (cek awal).')
ganti("""'<p class="mp240-cat">Bundel langsung diperiksa setelah diunggah. PDF yang Anda unggah per baris di tab <b>Checklist Dokumen</b> <b>sesudah</b> bundel (mis. Invoice/Faktur pembetulan) <b>diutamakan</b> dan dibaca AI; bundel melengkapi jenis dokumen lainnya. Jalankan <b>Verifikasi ulang</b> setelah mengganti PDF.</p>'""",
      """'<p class="mp240-cat"><b>Tahap 1:</b> unggah 1 PDF bundel → AI memisahkan dokumen menurut <b>judul tercetak</b> (BAP, BAPP/BAPM, Kwitansi, Invoice, Faktur Pajak, Surat Jalan, Kontrak, Jurnal, jaminan, KTP/NPWP, …) dan mengisi baris checklist. <b>Tahap akhir:</b> verifikasi AI berjalan saat <b>Verifikasi Admin</b> (sebelum bayar). PDF yang diunggah per baris <b>sesudah</b> bundel diutamakan.</p>'""",
      'Teks tab Bundel: alur Tahap 1 → Tahap akhir.')
ganti("""'<b>Mode AI:</b> saat checklist lengkap, Verifikasi Dokumen (AI) berjalan otomatis'""",
      """'<b>Mode AI:</b> Tahap 1 — unggah bundel, AI memisahkan dokumen menurut judul & mengisi checklist. Tahap akhir — Verifikasi Dokumen (AI) berjalan saat Verifikasi Admin, sebelum bayar'""",
      'Strip Mode: penjelasan alur dua tahap.')
H = dict(P)
for o in OP:
    t = H['js']; n = t.count(o['cari'])
    assert n == (o.get('jumlah') or 1), ('penanda', n, o['cari'][:90]); H['js'] = t.replace(o['cari'], o['ganti'])
CAT = ("Pembaruan 2.5.8 (kumulatif dari 2.5.7 … 2.2.7; pasangan Modul server 1.8.6).\n"
  "ALUR BARU 2.5.8 — Tahap 1: unggah bundel → AI memisahkan dokumen menurut judul tercetak (BAP, BAPP/BAPM, Kwitansi, Invoice, Faktur Pajak, Surat Jalan, Kontrak, …) dan memotongnya ke baris checklist — tanpa verifikasi. "
  "Tahap akhir: Verifikasi Dokumen (AI) berjalan otomatis saat Admin menekan Verifikasi Admin (sebelum bayar) bila belum ada hasil atau hasil kedaluwarsa; Mode Manual tetap tanpa AI. "
  "Verifikasi tidak lagi berjalan sendiri setelah bundel diunggah atau saat checklist lengkap. Gerbang Verifikasi Admin & bayar di server tidak berubah.\n"
  "Rollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.5.7.\n") + P['catatan']
H.update(versi='2.5.8', tanggal='2026-10-15', catatan=CAT)
json.dump(H, open(os.path.join(R, 'pembaruan-2.5.8.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
X = {'format': 'monitoring-sap-pembaruan-patch', 'dari': '2.5.7', 'ke': '2.5.8', 'tanggal': '2026-10-15', 'keterangan': 'Patch 2.5.7 → 2.5.8 (hanya JS aplikasi). Unggah pembaruan-2.5.8.json.',
     'sha256Sumber': {'css': sha(P['css']), 'js': sha(P['js'])}, 'sha256Hasil': {'css': sha(H['css']), 'js': sha(H['js'])}, 'catatan': CAT, 'operasi': OP}
json.dump(X, open(os.path.join(R, 'pembaruan-2.5.8.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK pembaruan-2.5.8.json ·', len(OP), 'operasi')
