#!/usr/bin/env python3
"""Rakit pembaruan-2.6.2.json dari pembaruan-2.6.1.json (+ patch terdokumentasi). Pasangan: Code.gs 2.5.2 + Modul server 1.8.10.
2.6.2 — galat acak "Server mengirim halaman HTML, bukan data (HTTP 200 / HTTP 404 Drive)":
  (1) Pesan galat tidak lagi menyesatkan ("deployment diarsipkan" / "jalankan setup") — menyebut sebab sebenarnya & langkahnya.
  (2) Setelah Google menolak (HTML/gangguan) pembacaan latar dijeda 30 dtk (KUOTA: 5 menit) agar tidak memperparah beban; jawaban
      JSON "Gangguan sementara layanan Google" (Code.gs 2.5.2) diulang otomatis seperti halaman HTML.
  (3) Permintaan rutin dikurangi: data gudang 1 halaman (1.000 baris) per jenis; detak kehadiran ±5 menit (min. 60 dtk antar detak);
      sinkron Register otomatis ±5 menit bila tidak ada simpanan.
  (4) Riwayat galat server (menu akun) untuk diagnosis — dapat disalin.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-2.6.2.py"""
import json, hashlib, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
P = json.load(open(os.path.join(R, 'pembaruan-2.6.1.json'), encoding='utf-8')); assert P['versi'] == '2.6.1'
js = open(os.path.join(R, 'sumber', '2.6.2', 'mp262.js'), encoding='utf-8').read()
OP = []
def ganti(cari, ganti_, ket, semua=None):
    o = {'berkas': 'js', 'jenis': 'ganti-semua' if semua else 'ganti-teks', 'cari': cari, 'ganti': ganti_, 'keterangan': ket}
    if semua: o['jumlah'] = semua
    OP.append(o)
ganti("= '2.6.1';", "= '2.6.2';", 'Nomor versi paket.', semua=4)
# --- 2.1.6 sebab(): pesan yang benar ---
ganti("""            if (/authorization|otorisasi|izin|permission/.test(s)) return 'Script belum diotorisasi ulang → buka editor Apps Script, jalankan fungsi setup lalu Izinkan.';""",
      """            if (/authorization is required|requires authorization|memerlukan otorisasi|perlu otorisasi/.test(s)) return 'Script perlu diotorisasi ulang → buka editor Apps Script, jalankan fungsi cekLayananGoogle lalu Izinkan bila diminta.';   // [2.6.2] dulu terlalu luas: setiap halaman galat Google yang memuat kata "izin" dianggap belum diotorisasi""",
      'sebab(): pesan otorisasi hanya untuk halaman "Authorization is required".')
ganti("""            if (/unable to open the file|tidak dapat membuka file/.test(s)) return 'Alamat server tidak valid atau deployment diarsipkan → pakai URL /exec terbaru.';""",
      """            if (/unable to open the file|tidak dapat membuka file/.test(s)) return 'Google menolak memproses permintaan ini (galat server tak tertangkap, kuota harian, atau gangguan sementara). Bila menu lain tetap berjalan, alamat /exec BENAR — pasang server Code.gs 2.5.2 agar sebabnya tampil jelas.';   // [2.6.2]""",
      'sebab(): Drive 404 tidak lagi disebut "deployment diarsipkan".')
ganti("""            return 'Server Google mengalami galat saat memproses (perbarui server ke Code.gs 2.4.2 agar galat tampil jelas).';""",
      """            return 'Server Google mengalami galat saat memproses (pasang server Code.gs 2.5.2 agar sebabnya tampil jelas).';""", 'sebab(): rujukan Code.gs terbaru.')
ganti("""    const inti = pesan.replace(/\\s*(Alamat server tidak valid atau deployment diarsipkan → pakai URL \\/exec terbaru\\.|Script belum diotorisasi ulang → buka editor Apps Script, jalankan fungsi setup lalu Izinkan\\.)/, '');""",
      """    const inti = pesan.replace(/\\s*(Alamat server tidak valid atau deployment diarsipkan → pakai URL \\/exec terbaru\\.|Script belum diotorisasi ulang → buka editor Apps Script, jalankan fungsi setup lalu Izinkan\\.|Google menolak memproses permintaan ini \\([^)]*\\)\\.[^—]*— pasang server Code\\.gs 2\\.5\\.2 agar sebabnya tampil jelas\\.)/, '');""",
      'perjelas(): kalimat 2.6.2 juga diganti ringkasan ping.')
# --- MP259 B: jeda latar setelah penolakan, ulang untuk kode GOOGLE ---
ganti("""  const rusak = s => /halaman HTML|unable to open|tidak dapat membuka|Koneksi ke server terputus|Failed to fetch|NetworkError|Load failed/i.test(s);""",
      """  const rusak = s => /halaman HTML|unable to open|tidak dapat membuka|Koneksi ke server terputus|Failed to fetch|NetworkError|Load failed|Gangguan sementara layanan Google/i.test(s);   // [2.6.2] + jawaban JSON Code.gs 2.5.2""",
      'Kode GOOGLE (Code.gs 2.5.2) diulang seperti halaman HTML.')
ganti("""  const masuk = () => new Promise(r => { if (Q.aktif < MAKS) { Q.aktif++; r(); } else Q.antre.push(r); });""",
      """  const masuk = async () => { const t = (Q.jedaSampai || 0) - Date.now(); if (t > 0) await jeda(Math.min(t, 300000)); return new Promise(r => { if (Q.aktif < MAKS) { Q.aktif++; r(); } else Q.antre.push(r); }); };   // [2.6.2] pembacaan latar dijeda sesaat setelah Google menolak""",
      'Antrean latar menunggu jeda pemulihan.')
ganti("""      if (g) { const x = new Error(await perjelas(teks(g), baca, n));""",
      """      { const s2 = g ? teks(g) : (r && r.ok === false ? teks(r.error) : ''); if (/^Kuota harian layanan Google/.test(s2)) Q.jedaSampai = Date.now() + 300000; else if (rusak(s2)) Q.jedaSampai = Date.now() + 30000; }   // [2.6.2]
      if (g) { const x = new Error(await perjelas(teks(g), baca, n));""", 'Setelah penolakan: pembacaan latar dijeda 30 dtk (kuota: 5 menit).')
# --- beban rutin ---
ganti("""  const G = { url: '', dukung: null, batas: 250, info: null, terakhir: null };""", """  const G = { url: '', dukung: null, batas: 1000, info: null, terakhir: null };   // [2.6.2] 1 halaman 1.000 baris per jenis""", 'Gudang: halaman 1.000 baris.')
ganti("""    if (G.url !== REG.url) { G.url = REG.url; G.dukung = null; G.batas = 250; }""", """    if (G.url !== REG.url) { G.url = REG.url; G.dukung = null; G.batas = 1000; }""", 'Gudang: halaman 1.000 baris (ganti server).')
ganti("""    for (let n = 0; n < 4; n++) {   // tiap percobaan sudah diulang di lapisan regPost (bagian B)""",
      """    for (let n = 0; n < 7; n++) {   // tiap percobaan sudah diulang di lapisan regPost (bagian B) · [2.6.2] cukup untuk 1000 → 25 baris""", 'Gudang: jatah percobaan cukup untuk memperkecil halaman sampai 25 baris.')
ganti("""        if (n >= 1 && G.batas > MIN) G.batas = Math.max(MIN, Math.floor(G.batas / 2));""",
      """        if (G.batas > MIN) G.batas = Math.max(MIN, Math.floor(G.batas / 2));   // [2.6.2] langsung diperkecil (galat sesaat sudah diulang lapisan B)""", 'Gudang: halaman diperkecil pada setiap kegagalan.')
ganti("""  const segera = () => { clearTimeout(HD.t); HD.t = setTimeout(() => detak(), 2500); };""",
      """  const segera = () => { clearTimeout(HD.t); HD.t = setTimeout(() => detak(), Math.max(2500, 60000 - (Date.now() - HD.kirim))); };   // [2.6.2] min. 60 dtk antar detak""", 'Kehadiran: minimal 60 dtk antar detak.')
ganti("""  setInterval(() => { if (!document.hidden && Date.now() - HD.kirim > 115000) detak(); }, 60000);   // [2.6.1] ±2 menit bila tidak ada perubahan (status Online berlaku 3 menit)""",
      """  setInterval(() => { if (!document.hidden && Date.now() - HD.kirim > 295000) detak(); }, 60000);   // [2.6.2] ±5 menit bila tidak ada perubahan (modul 1.8.10: Online ≤ 7 menit)""", 'Kehadiran: detak rutin ±5 menit.')
OP.append({'berkas': 'js', 'jenis': 'tambah-akhir', 'isi': js, 'keterangan': 'Blok MP262: riwayat galat server, sinkron Register hemat, pemberitahuan kuota.'})
H = dict(P)
for o in OP:
    t = H[o['berkas']]
    if o['jenis'] == 'tambah-akhir': H[o['berkas']] = t + o['isi']; continue
    n = t.count(o['cari']); assert n == (o.get('jumlah') or 1), ('penanda', n, o['cari'][:90]); H[o['berkas']] = t.replace(o['cari'], o['ganti'])
assert H['js'].count('MP218_ADMIN_FIRST_MARKER') == P['js'].count('MP218_ADMIN_FIRST_MARKER')
CAT = ("Pembaruan 2.6.2 (kumulatif dari 2.6.1 … 2.2.7; pasangan Code.gs 2.5.2 + Modul server 1.8.10).\n"
  "PERBAIKAN 2.6.2 — galat acak \"Server mengirim halaman HTML (HTTP 200 / 404 Drive)\": pesan menyebut sebab sebenarnya (bukan lagi \"deployment diarsipkan\"/\"jalankan setup\"); "
  "setelah Google menolak, pembacaan latar dijeda 30 detik (kuota habis: 5 menit) agar tidak memperparah; jawaban gangguan sementara diulang otomatis; "
  "permintaan rutin dikurangi (gudang 1 halaman, kehadiran ±5 menit, sinkron Register ±5 menit bila tidak ada simpanan); menu akun › Riwayat galat server (dapat disalin). "
  "Tanpa perubahan data.\nRollback: Pengguna & Proyek › Pembaruan › Rollback ke 2.6.1.\n") + P['catatan']
H.update(versi='2.6.2', tanggal='2026-10-20', catatan=CAT)
json.dump(H, open(os.path.join(R, 'pembaruan-2.6.2.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
X = {'format': 'monitoring-sap-pembaruan-patch', 'dari': '2.6.1', 'ke': '2.6.2', 'tanggal': '2026-10-20', 'keterangan': 'Patch 2.6.1 → 2.6.2. Unggah pembaruan-2.6.2.json.',
     'sha256Sumber': {'css': sha(P['css']), 'js': sha(P['js'])}, 'sha256Hasil': {'css': sha(H['css']), 'js': sha(H['js'])}, 'catatan': CAT, 'operasi': OP}
json.dump(X, open(os.path.join(R, 'pembaruan-2.6.2.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK pembaruan-2.6.2.json', len(json.dumps(H, ensure_ascii=False).encode()) // 1024, 'KB ·', len(OP), 'operasi')
