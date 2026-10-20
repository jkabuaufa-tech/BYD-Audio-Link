#!/usr/bin/env python3
"""Rakit pembaruan-2.6.1.json dari pembaruan-2.6.0.json (+ patch terdokumentasi). Pasangan modul server 1.8.9.
2.6.1 — KINERJA & "Server sedang sibuk":
  (1) Simpanan yang ditolak "Server sedang sibuk" (kunci tulis server belum didapat → belum ada yang dijalankan) dicoba ulang otomatis 3×.
  (2) Antrean permintaan hanya untuk pembacaan latar; buka PDF/berkas, login & semua simpanan langsung dikirim (tidak menunggu antrean).
  (3) PDF/berkas yang sudah dibuka disimpan sementara di memori → buka ulang instan; permintaan ganda digabung.
  (4) Pengamat DOM seluruh halaman (MP220, MP241, MP260) ditunda/disaring → tidak terpanggil ribuan kali saat PDF/tabel besar ditampilkan.
  (5) Detak kehadiran tiap ±2 menit (bukan 1 menit) bila tidak ada perubahan.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-2.6.1.py"""
import json, hashlib, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
P = json.load(open(os.path.join(R, 'pembaruan-2.6.0.json'), encoding='utf-8')); assert P['versi'] == '2.6.0'
js = open(os.path.join(R, 'sumber', '2.6.1', 'mp261.js'), encoding='utf-8').read()
css = open(os.path.join(R, 'sumber', '2.6.1', 'mp261.css'), encoding='utf-8').read()
OP = []
def ganti(cari, ganti_, ket, semua=None):
    o = {'berkas': 'js', 'jenis': 'ganti-semua' if semua else 'ganti-teks', 'cari': cari, 'ganti': ganti_, 'keterangan': ket}
    if semua: o['jumlah'] = semua
    OP.append(o)
ganti("= '2.6.0';", "= '2.6.1';", 'Nomor versi paket.', semua=4)
# --- MP259 bagian B: antrean prioritas + ulang otomatis "Server sedang sibuk" ---
ganti("  const MAKS = 4, JEDA = [1500, 4000];",
      "  const MAKS = 4, JEDA = [1500, 4000];\n"
      "  // [2.6.1] dibuka langsung tanpa antre (interaksi pengguna); \"Server sedang sibuk\" = kunci tulis server belum didapat → belum ada yang dijalankan → aman diulang\n"
      "  const SEGERA = /^(ambilBerkas|login|checklistBaca|arsipBaca|manifestBaca|modulInfo|diagServer|bacaPembaruanAdmin|ambilKandidatPembaruan|hadirDaftar)$/, SIBUK = /^Server sedang sibuk/i, JEDA_SIBUK = [2000, 4000, 7000];",
      'Daftar aksi prioritas & pola "Server sedang sibuk".')
ganti("    const baca = BACA.test(a), antre = !LAMA.test(a) || baca;",
      "    const baca = BACA.test(a), antre = baca && !SEGERA.test(a);   // [2.6.1] hanya pembacaan latar yang diantrekan; buka berkas & simpanan langsung dikirim\n    let tanda = false;",
      'Antrean hanya untuk pembacaan latar.')
ganti("""        if (!baca || !rusak(s) || n >= JEDA.length) break;
        Q.ulang++; console.info('[2.5.9] ' + a + ': respons bukan data (' + s.slice(0, 60) + '…) → ulang ke-' + (n + 1));
        await jeda(JEDA[n]);""",
      """        const sibuk = SIBUK.test(s);
        if (sibuk ? n >= JEDA_SIBUK.length : (!baca || !rusak(s) || n >= JEDA.length)) break;
        Q.ulang++; console.info('[2.6.1] ' + a + ': ' + s.slice(0, 60) + '… → ulang ke-' + (n + 1));
        if (sibuk) { Q.sibuk = (Q.sibuk || 0) + 1; tanda = true; try { if (window.mp261Status) window.mp261Status('Server sedang memproses simpanan lain — mencoba lagi otomatis (' + (n + 1) + '/' + JEDA_SIBUK.length + ')…'); } catch (e) { } }
        await jeda(sibuk ? JEDA_SIBUK[n] : JEDA[n]);""",
      'Ulang otomatis 3× (2 s, 4 s, 7 s) untuk "Server sedang sibuk" — juga untuk simpanan, karena server belum menjalankan apa pun.')
ganti("""      if (r && r.ok === false && r.error) r = Object.assign({}, r, { error: await perjelas(teks(r.error), baca, n) });
      return r;
    } finally { if (antre) keluar(); }""",
      """      if (r && r.ok === false && r.error) r = Object.assign({}, r, { error: SIBUK.test(teks(r.error)) ? 'Server masih memproses simpanan staf lain — sudah dicoba ulang otomatis ' + n + '× (±13 detik). Data ini BELUM tersimpan; isian Anda tetap di layar, klik Simpan lagi sebentar lagi.' : await perjelas(teks(r.error), baca, n) });
      return r;
    } finally { if (antre) keluar(); if (tanda) { try { if (window.mp261Status) window.mp261Status(null); } catch (e) { } } }""",
      'Pesan akhir yang jelas bila tetap sibuk; penanda dihapus.')
# --- pengamat DOM seluruh halaman: tunda / saring ---
ganti("""    new MutationObserver(() => {
      document.querySelectorAll('.mp219-pick small').forEach(s => { if (/10 MB/.test(s.textContent) && !s.dataset.mp222) { s.dataset.mp222 = '1'; s.textContent = s.textContent.replace(/\\(?\\s*Maks\\.?\\s*10 MB\\s*\\)?/i, '(maks. 30 MB · > 10 MB dikompres otomatis)').replace(/maks\\. 10 MB/i, 'maks. 30 MB · > 10 MB dikompres otomatis'); } });
    }).observe(document.body, { childList: true, subtree: true });""",
      """    let _t222 = 0;   // [2.6.1] ditunda: tidak dipanggil untuk setiap perubahan DOM (PDF/tabel besar)
    new MutationObserver(() => { if (_t222) return; _t222 = setTimeout(() => { _t222 = 0;
      document.querySelectorAll('.mp219-pick small').forEach(s => { if (/10 MB/.test(s.textContent) && !s.dataset.mp222) { s.dataset.mp222 = '1'; s.textContent = s.textContent.replace(/\\(?\\s*Maks\\.?\\s*10 MB\\s*\\)?/i, '(maks. 30 MB · > 10 MB dikompres otomatis)').replace(/maks\\. 10 MB/i, 'maks. 30 MB · > 10 MB dikompres otomatis'); } });
    }, 200); }).observe(document.body, { childList: true, subtree: true });""",
      'MP220: pengamat teks petunjuk unggah ditunda 200 ms.')
ganti("""    const pasangObs = () => { if (!document.body) return; new MutationObserver(() => { tBtn(); tMig(); }).observe(document.body, { childList: true, subtree: true }); tBtn(); tMig(); };""",
      """    const pasangObs = () => { if (!document.body) return; let _t241 = 0; new MutationObserver(() => { if (_t241) return; _t241 = setTimeout(() => { _t241 = 0; tBtn(); tMig(); }, 150); }).observe(document.body, { childList: true, subtree: true }); tBtn(); tMig(); };   // [2.6.1] ditunda 150 ms""",
      'MP241: pengamat tombol Bundel & penanda Migrasi ditunda 150 ms.')
ganti("""new MutationObserver(m => { if (m.some(x => x.addedNodes.length)) jadwal(); })""",
      """new MutationObserver(m => { if (m.some(x => x.target.nodeName === 'TBODY' || x.target.nodeName === 'TABLE' || [...x.addedNodes].some(n => n.nodeName === 'TR' || n.nodeName === 'TABLE' || n.nodeName === 'TBODY'))) jadwal(); })""",
      'MP260: hanya bereaksi bila baris tabel berubah (bukan isi PDF/dialog).')
ganti("""      const key = tr.dataset.key, g = ringkasan().find(x => x && (x.key === key || x.keyAsli === key)); if (!g) return;""",
      """      const key = tr.dataset.key, g = peta.get(key); if (!g) return;""", 'MP260: pencarian kontrak lewat peta (tanpa pencarian berulang per baris).')
ganti("""    document.querySelectorAll('tr.baris-kontrak[data-key]').forEach(tr => {""",
      """    const peta = new Map(); ringkasan().forEach(x => { if (x) { if (!peta.has(x.key)) peta.set(x.key, x); if (x.keyAsli && !peta.has(x.keyAsli)) peta.set(x.keyAsli, x); } });
    document.querySelectorAll('tr.baris-kontrak[data-key]').forEach(tr => {""", 'MP260: peta kontrak dibuat sekali per pemasangan.')
ganti("""  setInterval(() => { if (!document.hidden && Date.now() - HD.kirim > 55000) detak(); }, 60000);""",
      """  setInterval(() => { if (!document.hidden && Date.now() - HD.kirim > 115000) detak(); }, 60000);   // [2.6.1] ±2 menit bila tidak ada perubahan (status Online berlaku 3 menit)""",
      'Kehadiran: detak rutin tiap ±2 menit.')
OP.append({'berkas': 'js', 'jenis': 'tambah-akhir', 'isi': js, 'keterangan': 'Blok MP261: cache berkas/PDF di memori + penanda percobaan ulang.'})
OP.append({'berkas': 'css', 'jenis': 'tambah-akhir', 'isi': '\n' + css, 'keterangan': 'CSS MP261 ditambahkan di akhir.'})
H = dict(P)
for o in OP:
    t = H[o['berkas']]
    if o['jenis'] == 'tambah-akhir': H[o['berkas']] = t + o['isi']; continue
    n = t.count(o['cari']); assert n == (o.get('jumlah') or 1), ('penanda', n, o['cari'][:90]); H[o['berkas']] = t.replace(o['cari'], o['ganti'])
assert H['js'].count('MP218_ADMIN_FIRST_MARKER') == P['js'].count('MP218_ADMIN_FIRST_MARKER')
CAT = ("Pembaruan 2.6.1 (kumulatif dari 2.6.0 … 2.2.7; pasangan Modul server 1.8.9).\n"
  "PERBAIKAN 2.6.1 — (1) \"Server sedang sibuk, coba lagi sebentar\": simpanan dicoba ulang otomatis 3× (server belum menjalankan apa pun), dengan penanda kecil di layar; "
  "Modul 1.8.9 membuat unggah PDF tidak lagi menahan simpanan staf lain. (2) Lebih ringan: buka PDF/berkas & simpanan tidak lagi menunggu antrean pembacaan latar; "
  "PDF yang sudah dibuka tampil instan saat dibuka ulang (memori sementara 30 menit); pengamat halaman tidak lagi berjalan ribuan kali saat PDF/tabel besar tampil; detak kehadiran lebih hemat. "
  "Tanpa perubahan data.\nRollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.6.0.\n") + P['catatan']
H.update(versi='2.6.1', tanggal='2026-10-20', catatan=CAT)
json.dump(H, open(os.path.join(R, 'pembaruan-2.6.1.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
X = {'format': 'monitoring-sap-pembaruan-patch', 'dari': '2.6.0', 'ke': '2.6.1', 'tanggal': '2026-10-20', 'keterangan': 'Patch 2.6.0 → 2.6.1. Unggah pembaruan-2.6.1.json.',
     'sha256Sumber': {'css': sha(P['css']), 'js': sha(P['js'])}, 'sha256Hasil': {'css': sha(H['css']), 'js': sha(H['js'])}, 'catatan': CAT, 'operasi': OP}
json.dump(X, open(os.path.join(R, 'pembaruan-2.6.1.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK pembaruan-2.6.1.json', len(json.dumps(H, ensure_ascii=False).encode()) // 1024, 'KB ·', len(OP), 'operasi')
