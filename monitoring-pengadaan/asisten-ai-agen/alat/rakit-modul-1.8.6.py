#!/usr/bin/env python3
"""Rakit server-modul-1.8.6.json dari server-modul-1.8.5.json (kumulatif).
1.8.6: "AI tidak mengembalikan data terstruktur untuk bundel …" — jawaban AI untuk bagian bundel padat (12 hal.) terpotong batas token
atau dibungkus teks, sehingga JSON tidak terbaca dan seluruh bagian gagal. Kini: (1) JSON terpotong diselamatkan per dokumen yang lengkap,
(2) bila tetap gagal → dicoba ulang otomatis dengan format ringkas, lalu penyedia pembaca PDF cadangan, (3) pesan galat menyebut sebab
(terpotong / bukan JSON / penyedia tidak membaca PDF) dan cuplikan jawaban, (4) hasil yang terpotong ditandai di laporan.
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-modul-1.8.6.py"""
import json, os, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = json.load(open(os.path.join(R, 'server-modul-1.8.5.json'), encoding='utf-8')); assert M['versi'] == '1.8.5'
k = M['kode']; OP = []
def g(cari, ganti, ket, n=1):
    global k
    assert k.count(cari) == n, ('penanda', k.count(cari), cari[:90]); k = k.replace(cari, ganti); OP.append({'cari': cari, 'ganti': ganti, 'jumlah': n, 'keterangan': ket})
g("/* MODUL SERVER 1.8.5 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.4)",
  "/* MODUL SERVER 1.8.6 — untuk kernel Code.gs v2.5 (kumulatif dari 1.0.0 … 1.8.5) · 1.8.6: pembacaan bundel tahan jawaban AI terpotong/bukan JSON", 'Judul modul.')
g("versiAI: '1.8.5'", "versiAI: '1.8.6'", 'Versi AI.')
g("versiTim: '1.8.5'", "versiTim: '1.8.6'", 'Versi Tim.')
g("""function aiCekPanggilan(t) {""",
  """// 1.8.6: JSON {"dokumen":[…]} yang terpotong (batas token) → ambil semua objek dokumen yang LENGKAP; null bila tidak ada sama sekali
function vtSelamatkanJSON(t) {
  let s = s_(t); const f = /```(?:json)?\\s*([\\s\\S]*)$/i.exec(s); if (f) s = f[1].replace(/```\\s*$/, '');
  const a = s.search(/"dokumen"\\s*:\\s*\\[/); if (a < 0) return null;
  let i = s.indexOf('[', a) + 1, d = 0, q = false, e = false, mulai = -1; const out = [];
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) { if (e) e = false; else if (c === '\\\\') e = true; else if (c === '"') q = false; continue; }
    if (c === '"') q = true;
    else if (c === '{') { if (d === 0) mulai = i; d++; }
    else if (c === '}') { d--; if (d === 0 && mulai >= 0) { try { out.push(JSON.parse(s.slice(mulai, i + 1))); } catch (x) { } mulai = -1; } }
    else if (c === ']' && d === 0) return { dokumen: out, terpotong: false };
  }
  return out.length ? { dokumen: out, terpotong: true } : null;
}
function aiCekPanggilan(t) {""", 'Penyelamat JSON terpotong (hanya dokumen yang lengkap dipakai).')
g("""  let h = null, g0 = null;
  [prov].concat(lain).some(id => { try { h = aiPanggil(id, s, VT_PROMPT, pesan, { maksToken: 16000, json: true }); h.prov = id; return true; } catch (e) { g0 = g0 || e; return AI_KODE_CADANGAN.indexOf(e.kode) < 0; } });""",
  """  let h = null, g0 = null;
  [prov].concat(lain).some(id => { try { h = aiPanggil(id, s, VT_PROMPT, pesan, { maksToken: 16000, json: true }); h.prov = id; h.urut = [prov].concat(lain).indexOf(id); return true; } catch (e) { g0 = g0 || e; return AI_KODE_CADANGAN.indexOf(e.kode) < 0; } });""",
  'Catat urutan penyedia yang menjawab (untuk mencoba cadangan bila jawabannya rusak).')
g("""  aiTambahPakai(u, pakai + 1);
  const j = ambilJSON(h.teks); if (!j || !Array.isArray(j.dokumen)) throw new Error('AI tidak mengembalikan data terstruktur untuk ' + label + '. Coba lagi atau gunakan penyedia lain.');
  const hasil = { dokumen: j.dokumen.slice(0, 40).map(z => vtBersihDok(z)), sumber: Object.assign({ file: s_(f.getName()).slice(0, 200), idServer: f.getId() }, ket || {}), provider: h.prov, model: h.model, pada: now };""",
  """  aiTambahPakai(u, pakai + 1);
  // 1.8.6: jawaban rusak/terpotong → selamatkan dokumen lengkap; bila kosong → ulang 1× format ringkas (penyedia sama), lalu penyedia cadangan
  const urai = t => { const j0 = ambilJSON(t); if (j0 && Array.isArray(j0.dokumen)) return { dokumen: j0.dokumen, terpotong: false }; return vtSelamatkanJSON(t); };
  const RINGKAS = '\\nPENTING: jawaban sebelumnya terlalu panjang/terpotong. Balas JSON RINGKAS: hilangkan field bernilai null, item maksimal 12 baris per dokumen (selebihnya tulis ringkasan di "catatan"), rujukan maksimal 3, tanpa teks lain di luar JSON.';
  let j = urai(h.teks), cuplik = s_(h.teks).replace(/\\s+/g, ' ').trim().slice(0, 160), ulang = [];
  if (!j || j.terpotong) {   // JSON sah dengan dokumen kosong = bagian tanpa dokumen (bukan galat)
    const coba = [h.prov].concat([prov].concat(lain).filter(id => id !== h.prov));
    for (let n = 0; n < coba.length && n < 3; n++) {
      if (aiPakai(u) >= s.kuota) break;
      let h2 = null; try { h2 = aiPanggil(coba[n], s, VT_PROMPT + RINGKAS, pesan, { maksToken: 16000, json: true }); h2.prov = coba[n]; } catch (e) { ulang.push(coba[n] + ': ' + s_(e.message).slice(0, 80)); continue; }
      aiTambahPakai(u, aiPakai(u) + 1);
      const j2 = urai(h2.teks); ulang.push(coba[n] + (j2 ? ': ' + j2.dokumen.length + ' dokumen' + (j2.terpotong ? ' (terpotong)' : '') : ': bukan JSON'));
      if (j2 && (!j || (!j2.terpotong && j2.dokumen.length >= j.dokumen.length) || (j2.terpotong && j2.dokumen.length > j.dokumen.length))) { j = j2; h = h2; cuplik = s_(h2.teks).replace(/\\s+/g, ' ').trim().slice(0, 160); }
      if (j && !j.terpotong) break;
    }
  }
  if (!j) {
    const tanpaPdf = /tidak (dapat|bisa) (membaca|melihat|mengakses)|cannot (read|see|access|open)|can't (read|see|access|open)|unable to (read|access|process)|no (pdf|file|document|attachment)|tidak ada (lampiran|dokumen|file)/i.test(cuplik);
    throw new Error('AI tidak mengembalikan data terstruktur untuk ' + label + (tanpaPdf ? ' — penyedia/model tampaknya TIDAK menerima lampiran PDF (pilih Anthropic Claude, Google Gemini, OpenAI, atau OpenRouter di Setelan Verifikasi)' : ' — jawaban terpotong atau bukan JSON') +
      '. Sudah dicoba ulang otomatis (' + (ulang.join('; ') || 'tidak ada penyedia lain') + '). Cuplikan jawaban: "' + cuplik + '". Coba lagi beberapa saat atau pilih penyedia lain; bagian bundel yang sudah selesai tidak diulang.');
  }
  const hasil = { dokumen: j.dokumen.slice(0, 40).map(z => vtBersihDok(z)), sumber: Object.assign({ file: s_(f.getName()).slice(0, 200), idServer: f.getId() }, ket || {}), provider: h.prov, model: h.model, pada: now, terpotong: !!j.terpotong };""",
  'vtBacaAI: selamatkan JSON terpotong, ulang ringkas & penyedia cadangan, pesan galat dengan sebab & cuplikan.')
g("""  const belumDibaca = sumber.filter(x => !x.dibaca);""",
  """  const belumDibaca = sumber.filter(x => !x.dibaca);
  Object.keys(dibaca).forEach(sid => { const c = dibaca[sid]; if (c && c !== 1 && c.terpotong) temu('K03', 'CATATAN', 'Hasil baca AI terpotong', s_(c.sumber && c.sumber.file).slice(0, 120) + ': jawaban AI terpotong — hanya dokumen yang terbaca lengkap yang dipakai. Periksa manual dokumen di halaman akhir berkas ini atau unggah per dokumen di checklist.', []); });   // 1.8.6""",
  'vtNilai: catatan bila hasil baca berasal dari jawaban terpotong.')
g("""  fitur: ['checklistUtama',""", """  fitur: ['bacaTahanPotong', 'checklistUtama',""", 'Fitur baru diumumkan.')
CAT = ('Modul server 1.8.6 (kumulatif dari 1.8.5 … 1.0.0; kernel Code.gs 2.5.1, tanpa izin Google baru).\n'
  'PERBAIKAN 1.8.6 — "AI tidak mengembalikan data terstruktur untuk bundel …": jawaban AI untuk bagian bundel yang padat terpotong atau tidak berupa JSON sehingga seluruh bagian gagal. '
  'Kini dokumen yang lengkap pada jawaban terpotong tetap dipakai (ditandai CATATAN di laporan), bila tetap gagal dicoba ulang otomatis dengan format ringkas lalu dengan penyedia pembaca PDF cadangan, '
  'dan pesan galat menyebut sebab (terpotong / bukan JSON / penyedia tidak menerima PDF) beserta cuplikan jawaban. Bagian bundel yang sudah selesai tetap tidak diulang.\n') + M['catatan']
H = dict(M, versi='1.8.6', tanggal='2026-10-15', catatan=CAT, kode=k)
json.dump(H, open(os.path.join(R, 'server-modul-1.8.6.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
json.dump({'format': 'monitoring-sap-modul-patch', 'dari': '1.8.5', 'ke': '1.8.6', 'sha256Sumber': sha(M['kode']), 'sha256Hasil': sha(k), 'operasi': OP}, open(os.path.join(R, 'server-modul-1.8.6.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK server-modul-1.8.6.json ·', len(OP), 'operasi')
