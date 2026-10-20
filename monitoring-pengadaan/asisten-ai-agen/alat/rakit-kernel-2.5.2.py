#!/usr/bin/env python3
"""Rakit server/Code_2.5.2_Monitoring_Pengadaan.gs dari Code 2.5.1 (perubahan minimal & terdokumentasi).
2.5.2 — galat "Server mengirim halaman HTML, bukan data (HTTP 200 / HTTP 404 Drive)" yang muncul ACAK padahal server aktif:
  (1) Script Properties dibaca 2–5× per permintaan, dua di antaranya DI LUAR try doPost. Bila kuota harian Google (akun Gmail: 50.000
      baca/tulis Properties per hari) habis atau layanan Google sedang gangguan, galat tak tertangkap → Google mengirim halaman HTML
      (Drive 404 untuk pengguna anonim). Kini Properties dibaca lewat props_(): memori eksekusi → CacheService 60 detik → PropertiesService
      (tulis tetap langsung ke PropertiesService + memperbarui cache) ⇒ pembacaan Properties turun ±90%.
  (2) SELURUH doPost/doGet di dalam try → galat apa pun dibalas JSON {ok:false, error, kode:'KUOTA'|'GOOGLE'|''} dengan pesan jelas.
  (3) Fungsi editor cekLayananGoogle(): uji Properties, Cache, Spreadsheet, Drive, kunci tulis, modul — menunjukkan sebab langsung.
Tidak ada perubahan data, sheet, ID, atau izin Google (CacheService/PropertiesService tidak memerlukan izin baru).
Pakai (dari folder asisten-ai-agen):  python3 -I alat/rakit-kernel-2.5.2.py"""
import os, json, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
k = open(os.path.join(R, 'server', 'Code_2.5.1_Monitoring_Pengadaan.gs'), encoding='utf-8').read(); asal = k
OP = []
def g(cari, ganti, ket, n=1):
    global k
    assert k.count(cari) == n, ('penanda', k.count(cari), cari[:90]); k = k.replace(cari, ganti); OP.append({'cari': cari, 'ganti': ganti, 'jumlah': n, 'keterangan': ket})
g(" *  SERVER MONITORING SAP — Google Apps Script (Code.gs)\n",
  " *  SERVER MONITORING SAP — Google Apps Script (Code.gs) · v2.5.2: Properties ber-cache + semua galat dibalas JSON (bukan halaman HTML)\n", 'Judul.')
g("const VERSI_SERVER = '2.5.1';", "const VERSI_SERVER = '2.5.2';", 'Versi server.')
g("PropertiesService.getScriptProperties()", "props_()", 'Semua akses Script Properties lewat props_() (cache).', n=asal.count("PropertiesService.getScriptProperties()"))
g("""function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
""", """function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* v2.5.2 — Script Properties ber-cache. Kuota harian Google (akun Gmail: 50.000 baca/tulis Properties per hari) tidak lagi
 * habis oleh pembacaan rutin setiap permintaan. Baca: memori eksekusi → CacheService (60 dtk) → PropertiesService.
 * Tulis/hapus: langsung ke PropertiesService lalu cache diperbarui (eksekusi lain melihat nilai baru pada pembacaan berikutnya). */
let PROPS_MEM_ = {};
const PROPS_TTL_ = 60, PROPS_KOSONG_ = '\\u0000';
function props_() {
  const asli = () => PropertiesService.getScriptProperties(), kc = x => 'PRP|' + x;
  const cache = () => { try { return CacheService.getScriptCache(); } catch (e) { return null; } };
  const simpanCache = (key, v) => { const c = cache(); if (!c) return; try { const s = v === null || v === undefined ? PROPS_KOSONG_ : String(v); if (s.length < 90000) c.put(kc(key), s, PROPS_TTL_); else c.remove(kc(key)); } catch (e) { } };
  return {
    getProperty(key) {
      if (Object.prototype.hasOwnProperty.call(PROPS_MEM_, key)) return PROPS_MEM_[key];
      let v = null; const c = cache(); try { v = c ? c.get(kc(key)) : null; } catch (e) { v = null; }
      if (v === null) { v = asli().getProperty(key); simpanCache(key, v); } else if (v === PROPS_KOSONG_) v = null;
      PROPS_MEM_[key] = v; return v;
    },
    setProperty(key, val) { asli().setProperty(key, val); PROPS_MEM_[key] = String(val); simpanCache(key, val); return this; },
    deleteProperty(key) { asli().deleteProperty(key); PROPS_MEM_[key] = null; simpanCache(key, null); return this; },
    setProperties(o, hapusLain) { asli().setProperties(o, hapusLain); PROPS_MEM_ = {}; Object.keys(o || {}).forEach(key => simpanCache(key, o[key])); return this; },
    getProperties() { return asli().getProperties(); },
    getKeys() { return asli().getKeys(); }
  };
}
/* v2.5.2 — galat layanan Google dijelaskan (dulu tak tertangkap → aplikasi menerima halaman HTML / Drive 404) */
function galatGoogle_(err) {
  const m = s_(err && err.message || err);
  if (/invoked too many times|too many times for one day|terlalu sering|Service invoked|quota|kuota/i.test(m)) return { error: 'Kuota harian layanan Google untuk server ini sedang habis (' + m + '). Pulih otomatis oleh Google (paling lama 24 jam). Kurangi tab/perangkat yang terbuka bersamaan.', kode: 'KUOTA' };
  if (/simultaneous invocations|timed out|Service unavailable|server error occurred|Unexpected error while|Address unavailable|kesalahan server|tidak tersedia untuk sementara|Internal error/i.test(m)) return { error: 'Gangguan sementara layanan Google (' + m + '). Data aman; coba lagi beberapa saat.', kode: 'GOOGLE' };
  return { error: m, kode: '' };
}
""", 'props_() & galatGoogle_().')
g("""function doGet(e) {
  modulReset_();   // v2.5.0
  const p = (e && e.parameter) || {};
  try {""", """function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    modulReset_();   // v2.5.0 · v2.5.2: di dalam try""", 'doGet: seluruhnya di dalam try.')
g("""  } catch (err) { return json_({ ok: false, error: err.message }); }
}

function doPost(e) {
  let req;
  modulReset_();   // v2.5.0
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Permintaan tidak valid.' }); }
  const baca = aksiBaca_(req.action, !!req.modulUji);   // v2.5.0: daftar baca inti + modul
  const lock = LockService.getScriptLock();
  if (!baca) { try { lock.waitLock(25000); } catch (err) { return json_({ ok: false, error: 'Server sedang sibuk, coba lagi sebentar.' }); } }
  try { const out = proses_(req); if (!baca) SpreadsheetApp.flush(); return json_(out); }   // v2.4.2: flush di dalam try → galat tulis tetap dikirim sebagai JSON (bukan halaman HTML)
  catch (err) { return json_({ ok: false, error: err.message }); }
  finally { if (!baca) { try { lock.releaseLock(); } catch (e) { } } }
}""", """  } catch (err) { return json_(Object.assign({ ok: false }, galatGoogle_(err))); }
}

function doPost(e) {
  let lock = null, kunci = false;
  try {   // v2.5.2: SELURUH proses di dalam try → galat layanan Google (kuota / gangguan sementara) selalu dibalas JSON, bukan halaman HTML
    modulReset_();   // v2.5.0
    let req;
    try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Permintaan tidak valid.' }); }
    const baca = aksiBaca_(req.action, !!req.modulUji);   // v2.5.0: daftar baca inti + modul
    if (!baca) { lock = LockService.getScriptLock(); try { lock.waitLock(25000); kunci = true; } catch (err) { return json_({ ok: false, error: 'Server sedang sibuk, coba lagi sebentar.' }); } }
    const out = proses_(req); if (!baca) SpreadsheetApp.flush(); return json_(out);   // v2.4.2: flush di dalam try
  } catch (err) { return json_(Object.assign({ ok: false }, galatGoogle_(err))); }
  finally { if (kunci) { try { lock.releaseLock(); } catch (e2) { } } }
}""", 'doPost: seluruhnya di dalam try; kunci dilepas hanya bila didapat.')
g("function modulReset_() { MODUL_CACHE_ = {}; MODUL_GALAT_ = {}; MODUL_UJI_ = false; }", "function modulReset_() { MODUL_CACHE_ = {}; MODUL_GALAT_ = {}; MODUL_UJI_ = false; PROPS_MEM_ = {}; }   // v2.5.2: memori Properties per permintaan", 'Memori Properties dikosongkan di awal setiap permintaan.')
g("""function nonaktifkanModul() {""", """/* v2.5.2 — jalankan dari editor bila aplikasi menampilkan galat HTML / kuota: menunjukkan layanan Google mana yang bermasalah */
function cekLayananGoogle() {
  const uji = (n, f) => { const t = Date.now(); try { const h = f(); Logger.log('✔ ' + n + ' (' + (Date.now() - t) + ' ms)' + (h ? ' · ' + h : '')); } catch (e) { Logger.log('✖ ' + n + ': ' + (e && e.message || e)); } };
  uji('Script Properties (baca langsung)', () => 'MODUL_AKTIF ' + (PropertiesService.getScriptProperties().getProperty('MODUL_AKTIF') ? 'ada' : 'kosong'));
  uji('Cache', () => { const c = CacheService.getScriptCache(); c.put('UJI_LAYANAN', '1', 10); return c.get('UJI_LAYANAN') === '1' ? 'ok' : 'tidak terbaca'; });
  uji('Spreadsheet', () => ss_().getSheets().length + ' sheet');
  uji('Drive (folder berkas)', () => folderBerkas_().getName());
  uji('Kunci tulis', () => { const l = LockService.getScriptLock(), ok = l.tryLock(5000); if (ok) l.releaseLock(); return ok ? 'bebas' : 'sedang dipegang proses lain'; });
  uji('Modul server', () => { modulReset_(); const m = modulMuat_('aktif'); return m ? 'aktif · ' + (m.fitur || []).length + ' fitur' : 'tidak aktif: ' + (MODUL_GALAT_.aktif || '-'); });
  Logger.log('Kernel v' + VERSI_SERVER + '. "Script Properties ✖ … too many times" = kuota harian Google habis (pulih ≤ 24 jam); ✖ lain = gangguan layanan Google.');
}
function nonaktifkanModul() {""", 'Fungsi editor cekLayananGoogle().')
os.makedirs(os.path.join(R, 'server'), exist_ok=True)
open(os.path.join(R, 'server', 'Code_2.5.2_Monitoring_Pengadaan.gs'), 'w', encoding='utf-8').write(k)
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
json.dump({'format': 'monitoring-sap-kernel-patch', 'dari': '2.5.1', 'ke': '2.5.2', 'sha256Sumber': sha(asal), 'sha256Hasil': sha(k), 'operasi': OP}, open(os.path.join(R, 'server', 'kernel-2.5.2.patch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK server/Code_2.5.2_Monitoring_Pengadaan.gs ·', len(OP), 'operasi ·', asal.count("PropertiesService.getScriptProperties()"), 'akses Properties dialihkan')
