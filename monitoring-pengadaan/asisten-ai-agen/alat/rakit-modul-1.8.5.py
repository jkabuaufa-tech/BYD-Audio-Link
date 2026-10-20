#!/usr/bin/env python3
"""Rakit server-modul-1.8.5.json dari server-modul-1.8.4.json (patch terdokumentasi; gagal keras bila penanda tidak unik).
1.8.5: Verifikasi Tagihan — PDF yang diunggah MANUAL per baris checklist (Invoice, Faktur Pajak, Surat Jalan, BAPM, …) diutamakan atas
bundel; sebelumnya, bila tagihan punya bundel, PDF manual tidak dibaca dan datanya ditimpa data bundel.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-modul-1.8.5.py"""
import json, os, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = json.load(open(os.path.join(R, 'server-modul-1.8.4.json'), encoding='utf-8')); assert M['versi'] == '1.8.4'
k = M['kode']; OP = []
def g(cari, ganti, ket, n=1):
    global k
    assert k.count(cari) == n, ('penanda', k.count(cari), cari[:90]); k = k.replace(cari, ganti); OP.append({'cari': cari, 'ganti': ganti, 'jumlah': n, 'keterangan': ket})

g("/* MODUL SERVER 1.8.4 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.3)",
  "/* MODUL SERVER 1.8.5 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.4) · 1.8.5: PDF unggahan manual checklist diutamakan atas bundel pada Verifikasi Tagihan", 'Judul modul.')
g("versiAI: '1.8.4'", "versiAI: '1.8.5'", 'Versi AI di aiInfo.')
g("versiTim: '1.8.4'", "versiTim: '1.8.5'", 'Versi Tim di timInfo.')
g("""  const dok = tpl.map(d => { const v = items[d.k] || {}; return { k: d.k, nama: d.nama, ketentuan: d.ketentuan, status: s_(v.status || 'TIDAK'), alasan: s_(v.alasan), file: v.status === 'ADA' && v.file && v.file.idServer ? v.file : null }; });""",
  """  const dok = tpl.map(d => { const v = items[d.k] || {}; return { k: d.k, nama: d.nama, ketentuan: d.ketentuan, status: s_(v.status || 'TIDAK'), alasan: s_(v.alasan), ket: s_(v.ket), file: v.status === 'ADA' && v.file && v.file.idServer ? v.file : null }; });""",
  'vtDokumenChecklist: sertakan keterangan baris (penanda baris hasil potong bundel).')
g("""function vtSidikBerkas(f) {""",
  """// 1.8.5: baris checklist yang PDF-nya berasal dari bundel (bagian bundel, "Terapkan", atau potongan otomatis 2.5.1) → data bundel dipakai tanpa baca ulang.
//        Baris lain = PDF yang diunggah manual oleh pengguna → SELALU dibaca dan DIUTAMAKAN atas data bundel untuk jenis dokumen yang sama.
function vtBarisBundel(d, Bd) {
  if (!Bd || !d || !d.file) return false;
  const id = s_(d.file.idServer);
  if (vtBagianBundel(Bd).some(b => s_(b.file && b.file.idServer) === id)) return true;
  if (/dipotong otomatis dari bundel|potongan bundel|^\\s*bundel hal\\./i.test(s_(d.ket))) return true;
  return /\\(potongan bundel\\)|· BUNDEL( \\d+[-\\/]\\d+)? ·/i.test(s_(d.file.nama));   // nama berkas kernel: "CHECKLIST · <ket> · <nama>" ("/" → "-")
}
function vtWaktuBerkas(id) { try { const f = DriveApp.getFileById(s_(id)); return f.getLastUpdated ? f.getLastUpdated().getTime() : 0; } catch (e) { return 0; } }
const vtWaktuBundel = Bd => vtBagianBundel(Bd).reduce((m, b) => Math.max(m, vtWaktuBerkas(b.file && b.file.idServer)), 0);
// PDF manual yang diunggah SESUDAH (atau bersamaan dengan) bundel → diutamakan; PDF manual yang lebih lama dari bundel → bundel tetap sumber (perilaku 1.8.0)
function vtBarisUtama(d, Bd, tB) { return !!(d && d.file) && !vtBarisBundel(d, Bd) && (!Bd || vtWaktuBerkas(d.file.idServer) >= tB); }
function vtSidikBerkas(f) {""", 'Penentu baris berasal dari bundel vs unggahan manual.')
g("""  const dok = bag.concat(ck.dok.filter(d => d.file && vtPerluAI(d.k) && !petaB[d.k] && !sudah[d.file.idServer] && (sudah[d.file.idServer] = 1)).map(d => {""",
  """  // 1.8.5: unggahan manual yang lebih baru dari bundel tetap dibaca walau jenisnya sudah ada di bundel
  const tB = Bd ? vtWaktuBundel(Bd) : 0;
  const dok = bag.concat(ck.dok.filter(d => d.file && vtPerluAI(d.k) && !(petaB[d.k] && !vtBarisUtama(d, Bd, tB)) && !sudah[d.file.idServer] && (sudah[d.file.idServer] = 1)).map(d => {""",
  'vtRencana: PDF unggahan manual dijadwalkan dibaca walaupun baris sudah dipetakan bundel.')
g("""  const dibaca = {}, Bd = vtBundelBaca(P, id), dariBundel = {}, petaBundel = {};
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
  ck.dok.filter(d => d.file && vtPerluAI(d.k)).forEach(d => {   // 1.7.2: hanya dokumen yang dipakai aturan""",
  """  const dibaca = {}, Bd = vtBundelBaca(P, id), dariBundel = {}, petaBundel = {}, jenisManual = {}, bunDok = [], bunSumber = [];
  if (Bd) {
    (Bd.usulan || []).forEach(x => { petaBundel[x.k] = 1; });
    const A = vtBagianBundel(Bd);
    A.forEach((b, i) => {
      let f = null; try { f = DriveApp.getFileById(b.file.idServer); } catch (x) { }
      const sid = f ? vtSidikBerkas(f) : '', c = f ? vtEksBaca(P, sid) : null; if (sid) dibaca[sid] = c || 1;
      const sb = { k: 'BUNDEL', nama: 'Bundel' + (A.length > 1 ? ' bagian ' + (i + 1) + '/' + A.length : ''), file: s_(b.file.nama).slice(0, 120), dibaca: !!c, provider: c ? c.provider + ' · ' + c.model : '' };
      sumber.push(sb); bunSumber.push(sb);
      if (c) c.dokumen.forEach(z => { z._k = 'BUNDEL'; z._nama = 'Bundel'; bunDok.push(z); });
    });
  }
  // 1.8.5: PDF yang diunggah MANUAL per baris checklist diutamakan — dibaca lebih dahulu, jenisnya menggantikan data bundel yang sama
  const tB = Bd ? vtWaktuBundel(Bd) : 0;
  ck.dok.filter(d => d.file && vtPerluAI(d.k) && vtBarisUtama(d, Bd, tB)).forEach(d => {
    let f = null; try { f = DriveApp.getFileById(d.file.idServer); } catch (x) { }
    const sid = f ? vtSidikBerkas(f) : ''; if (sid && dibaca[sid]) return;
    const c = f ? vtEksBaca(P, sid) : null; if (sid) dibaca[sid] = c || 1;
    sumber.push({ k: d.k, nama: d.nama, file: s_(d.file.nama).slice(0, 120), dibaca: !!c, provider: c ? c.provider + ' · ' + c.model : '', manual: true });
    if (c) c.dokumen.forEach(z => { z._k = d.k; z._nama = d.nama; jenisManual[z.jenis] = 1; (D[z.jenis] = D[z.jenis] || []).push(z); });
  });
  const diganti = {};
  bunDok.forEach(z => { if (jenisManual[z.jenis]) { diganti[VT_NAMA[z.jenis] || z.jenis] = 1; return; } dariBundel[z.jenis] = 1; (D[z.jenis] = D[z.jenis] || []).push(z); });
  if (Object.keys(diganti).length) bunSumber.forEach(sb => { sb.diganti = 'memakai unggahan checklist untuk: ' + Object.keys(diganti).join(', '); });
  ck.dok.filter(d => d.file && vtPerluAI(d.k) && !vtBarisUtama(d, Bd, tB)).forEach(d => {   // 1.7.2: hanya dokumen yang dipakai aturan · baris hasil bundel / PDF manual lebih lama dari bundel""",
  'vtNilai: urutan sumber — unggahan manual dahulu, bundel melengkapi jenis lain, baris hasil bundel terakhir.')
g("""    const pakai = c ? c.dokumen.filter(z => !dariBundel[z.jenis]) : [];""",
  """    const pakai = c ? c.dokumen.filter(z => !dariBundel[z.jenis] && !jenisManual[z.jenis]) : [];""",
  'vtNilai: baris hasil bundel tidak menggandakan jenis yang sudah ada.')
g("""  fitur: ['arsipVendor',""", """  fitur: ['checklistUtama', 'arsipVendor',""", 'Fitur baru diumumkan ke aplikasi (2.5.7 memakai teks yang sesuai).')

CAT = ('Modul server 1.8.5 (kumulatif dari 1.8.4 … 1.0.0; kernel Code.gs 2.5.1, tanpa izin Google baru).\n'
  'PERBAIKAN 1.8.5 — Verifikasi Tagihan membaca PDF yang diunggah per baris checklist: bila tagihan punya bundel, sebelumnya data bundel selalu dipakai untuk jenis dokumen yang sama '
  '(Invoice, Faktur Pajak, Surat Jalan, BAPM, …) dan PDF yang diunggah manual TIDAK dibaca. Kini PDF yang diunggah manual SESUDAH bundel dibaca dan diutamakan (PDF manual yang lebih lama dari bundel tetap digantikan bundel seperti 1.8.0); bundel melengkapi jenis yang tidak diunggah; '
  'baris hasil potong otomatis/Terapkan bundel tetap memakai data bundel tanpa biaya AI tambahan. Laporan "Dokumen diperiksa" menandai sumber yang dipakai. '
  'Hasil verifikasi lama, gerbang Verifikasi Admin & bayar tidak diubah — jalankan "Verifikasi ulang" pada tagihan yang berbundel.\n') + M['catatan']
H = dict(M, versi='1.8.5', tanggal='2026-10-15', catatan=CAT, kode=k)
json.dump(H, open(os.path.join(R, 'server-modul-1.8.5.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
json.dump({'format': 'monitoring-sap-modul-patch', 'dari': '1.8.4', 'ke': '1.8.5', 'sha256Sumber': sha(M['kode']), 'sha256Hasil': sha(k), 'operasi': OP}, open(os.path.join(R, 'server-modul-1.8.5.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK server-modul-1.8.5.json ·', len(OP), 'operasi · kode', sha(k)[:12])
