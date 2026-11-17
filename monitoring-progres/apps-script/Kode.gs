/**
 * =====================================================================
 *  SERVER – Monitoring Progres Harian & Rapat Action Plan (JIAT)
 *  Google Apps Script yang terikat (bound) pada satu Google Sheet.
 *
 *  - Login: kode 6 digit dikirim ke email staf yang terdaftar di sheet "Pengguna".
 *  - Peran: MANAJEMEN (lihat harga, kelola data) · PELAKSANA · PENGAWAS.
 *    Harga satuan TIDAK PERNAH dikirim ke peran selain MANAJEMEN.
 *  - Data: satu sheet per koleksi (Proyek, Divisi, Item, Progres, Isu, Pengadaan, SBD).
 *  - Sinkronisasi inkremental (kolom "diubah", epoch ms) + tombstone untuk hapus.
 *
 *  Pemasangan: lihat monitoring-progres/apps-script/PANDUAN.md
 * =====================================================================
 */
var VERSI = '1.0.0';
var SESI_HARI = 30;              // masa berlaku sesi login per perangkat
var OTP_MENIT = 10;              // masa berlaku kode login
var OTP_MAKS_PER_JAM = 5;        // batas permintaan kode per email per jam
var OTP_MAKS_COBA = 5;           // batas salah ketik kode

var KOLEKSI = {
  project: 'Proyek', divisions: 'Divisi', items: 'Item', progress: 'Progres',
  dailyNotes: 'Isu', procurement: 'Pengadaan', wells: 'SBD',
};
var HEADER = ['id', 'diubah', 'oleh', 'dihapus', 'ringkas', 'data'];
var PERAN = ['MANAJEMEN', 'PELAKSANA', 'PENGAWAS'];
var IZIN_TULIS = {
  project: ['MANAJEMEN'], divisions: ['MANAJEMEN'], items: ['MANAJEMEN'],
  progress: PERAN, dailyNotes: PERAN,
  procurement: ['MANAJEMEN', 'PELAKSANA'], wells: ['MANAJEMEN', 'PELAKSANA'],
};

/* ------------------------------------------------------------------ */
/*  Titik masuk HTTP                                                    */
/* ------------------------------------------------------------------ */
function doGet() {
  return json_({ ok: true, aplikasi: 'jiat-monitoring-api', versi: VERSI });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, kode: 'FORMAT', pesan: 'Permintaan tidak valid' }); }
  try {
    if (req.aksi === 'mintaKode') return json_(mintaKode_(req));
    if (req.aksi === 'verifikasi') return json_(verifikasi_(req));
    var u = cekSesi_(req.token);
    if (!u) return json_({ ok: false, kode: 'SESI', pesan: 'Sesi berakhir atau akses dicabut. Silakan masuk lagi.' });
    switch (req.aksi) {
      case 'muat': return json_(muat_(u, req.sejak, req.generasi));
      case 'sinkron': return json_(sinkron_(u, req.ops || []));
      case 'impor': return json_(impor_(u, req));
      case 'keluar': hapusSesi_(req.token); log_(u.email, 'KELUAR', ''); return json_({ ok: true });
      case 'saya': return json_({ ok: true, user: u });
    }
    return json_({ ok: false, kode: 'AKSI', pesan: 'Aksi tidak dikenal' });
  } catch (err) {
    log_('SISTEM', 'ERROR', String(err && err.stack || err));
    return json_({ ok: false, kode: 'SERVER', pesan: String(err && err.message || err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/*  Pengguna & autentikasi (kode via email)                             */
/* ------------------------------------------------------------------ */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }

function hash_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return b.map(function (x) { return ((x + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function pengguna_(email) {
  var sh = ss_().getSheetByName('Pengguna');
  if (!sh || sh.getLastRow() < 2) return null;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (normEmail_(rows[i][0]) !== email) continue;
    var aktif = String(rows[i][3] || 'YA').trim().toUpperCase();
    var peran = String(rows[i][2] || '').trim().toUpperCase();
    if (aktif === 'TIDAK' || PERAN.indexOf(peran) < 0) return null;
    return { email: email, nama: String(rows[i][1] || email), peran: peran };
  }
  return null;
}

function mintaKode_(req) {
  var email = normEmail_(req.email);
  var umum = { ok: true, pesan: 'Jika email terdaftar, kode masuk telah dikirim. Periksa Inbox / Spam.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, kode: 'EMAIL', pesan: 'Format email tidak valid' };
  var cache = CacheService.getScriptCache();
  var rl = Number(cache.get('rl_' + email) || 0);
  if (rl >= OTP_MAKS_PER_JAM) return { ok: false, kode: 'BATAS', pesan: 'Terlalu banyak permintaan kode. Coba lagi 1 jam lagi.' };
  cache.put('rl_' + email, String(rl + 1), 3600);
  var u = pengguna_(email);
  if (!u) { log_(email, 'KODE_DITOLAK', 'email tidak terdaftar/aktif'); return umum; }
  var acak = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16);
  var kode = String(acak % 1000000).padStart(6, '0');
  cache.put('otp_' + email, JSON.stringify({ h: hash_(email + ':' + kode), n: 0 }), OTP_MENIT * 60);
  var nama = (ss_().getSheetByName('Item') && proyek_().nama) || 'Monitoring Progres JIAT';
  MailApp.sendEmail({
    to: email,
    subject: 'Kode masuk Monitoring Progres: ' + kode,
    body: 'Halo ' + u.nama + ',\n\nKode masuk aplikasi ' + nama + ':\n\n    ' + kode + '\n\n' +
      'Berlaku ' + OTP_MENIT + ' menit. Jangan bagikan kode ini kepada siapa pun.\n' +
      'Abaikan email ini jika Anda tidak meminta kode.',
  });
  log_(email, 'KODE_DIKIRIM', '');
  return umum;
}

function verifikasi_(req) {
  var email = normEmail_(req.email), kode = String(req.kode || '').replace(/\D/g, '');
  var cache = CacheService.getScriptCache();
  var raw = cache.get('otp_' + email);
  if (!raw) return { ok: false, kode: 'KODE', pesan: 'Kode kedaluwarsa atau belum diminta. Minta kode baru.' };
  var o = JSON.parse(raw);
  if (o.h !== hash_(email + ':' + kode)) {
    o.n++;
    if (o.n >= OTP_MAKS_COBA) { cache.remove('otp_' + email); log_(email, 'KODE_GAGAL', 'terlalu banyak salah'); return { ok: false, kode: 'KODE', pesan: 'Terlalu banyak salah. Minta kode baru.' }; }
    cache.put('otp_' + email, JSON.stringify(o), OTP_MENIT * 60);
    return { ok: false, kode: 'KODE', pesan: 'Kode salah. Sisa percobaan: ' + (OTP_MAKS_COBA - o.n) };
  }
  cache.remove('otp_' + email);
  var u = pengguna_(email);
  if (!u) return { ok: false, kode: 'AKSES', pesan: 'Akun tidak aktif.' };
  bersihkanSesi_();
  var token = Utilities.getUuid() + Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('S_' + hash_(token), JSON.stringify({
    e: email, x: Date.now() + SESI_HARI * 86400000, p: String(req.perangkat || '').slice(0, 120), t: Date.now(),
  }));
  log_(email, 'MASUK', String(req.perangkat || '').slice(0, 120));
  return { ok: true, token: token, user: u };
}

function cekSesi_(token) {
  if (!token) return null;
  var props = PropertiesService.getScriptProperties();
  var k = 'S_' + hash_(token), raw = props.getProperty(k);
  if (!raw) return null;
  var s = JSON.parse(raw);
  if (s.x < Date.now()) { props.deleteProperty(k); return null; }
  return pengguna_(s.e); // peran & status aktif selalu dibaca ulang dari sheet Pengguna
}

function hapusSesi_(token) { if (token) PropertiesService.getScriptProperties().deleteProperty('S_' + hash_(token)); }

function bersihkanSesi_() {
  var props = PropertiesService.getScriptProperties(), semua = props.getProperties(), now = Date.now();
  Object.keys(semua).forEach(function (k) {
    if (k.indexOf('S_') !== 0) return;
    try { if (JSON.parse(semua[k]).x < now) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}

/** Menu Sheet: paksa semua perangkat keluar (mis. HP staf hilang). */
function hapusSemuaSesi() {
  var props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).forEach(function (k) { if (k.indexOf('S_') === 0) props.deleteProperty(k); });
  log_(Session.getEffectiveUser().getEmail(), 'HAPUS_SEMUA_SESI', '');
}

/* ------------------------------------------------------------------ */
/*  Penyimpanan per koleksi                                             */
/* ------------------------------------------------------------------ */
function sheet_(kol) {
  var nama = KOLEKSI[kol], sh = ss_().getSheetByName(nama);
  if (!sh) {
    sh = ss_().insertSheet(nama);
    sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function baca_(kol) {
  var sh = sheet_(kol), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, HEADER.length).getValues().map(function (r, i) {
    return { baris: i + 2, id: String(r[0]), diubah: Number(r[1]) || 0, oleh: r[2], dihapus: r[3] === true || String(r[3]).toUpperCase() === 'TRUE', data: r[5] };
  });
}

function parse_(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function teks_(s) { s = String(s == null ? '' : s).slice(0, 200); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function ringkas_(kol, d) {
  switch (kol) {
    case 'progress': return d.itemId + ' · ' + d.tanggal + (d.sbd ? ' · ' + d.sbd : '') + ' · vol ' + d.volume;
    case 'dailyNotes': return '[' + d.prioritas + '/' + d.status + '] ' + (d.uraian || '');
    case 'items': return d.uraian || '';
    case 'wells': return (d.sbd || '') + ' · ' + (d.status || '');
    case 'project': return d.nama || '';
    default: return d.nama || d.uraian || '';
  }
}

/**
 * Upsert / hapus (tombstone) sekumpulan record pada satu koleksi.
 * Data lama digabung field-per-field dengan data baru (field yang tidak dikirim tetap).
 */
function tulis_(kol, ops, email) {
  if (!ops.length) return;
  var sh = sheet_(kol), rows = baca_(kol), peta = {};
  rows.forEach(function (r) { peta[r.id] = r; });
  var akhir = {};
  ops.forEach(function (o) { akhir[o.id] = o; }); // dedup: operasi terakhir menang
  var now = Date.now(), baru = [];
  Object.keys(akhir).forEach(function (id) {
    var o = akhir[id], lama = peta[id];
    var data = o.op === 'hapus' ? (lama ? parse_(lama.data) || { id: id } : { id: id })
      : Object.assign({}, lama && !lama.dihapus ? parse_(lama.data) || {} : {}, o.data, { id: id });
    var baris = [id, now, email, o.op === 'hapus', teks_(ringkas_(kol, data)), JSON.stringify(data)];
    if (lama) sh.getRange(lama.baris, 1, 1, HEADER.length).setValues([baris]);
    else baru.push(baris);
  });
  if (baru.length) sh.getRange(sh.getLastRow() + 1, 1, baru.length, HEADER.length).setValues(baru);
}

function proyek_() {
  var r = baca_('project').filter(function (x) { return !x.dihapus; })[0];
  return r ? parse_(r.data) || {} : {};
}

/* ------------------------------------------------------------------ */
/*  Aksi data                                                           */
/* ------------------------------------------------------------------ */
function generasi_() { return PropertiesService.getScriptProperties().getProperty('GENERASI') || '1'; }

/** Item untuk peran non-MANAJEMEN: harga dihapus, diganti bobot (fraksi nilai kontrak). */
function itemTanpaHarga_(items) {
  var total = items.reduce(function (s, it) { return s + (Number(it.volume) || 0) * (Number(it.hargaNego) || 0); }, 0);
  return items.map(function (it) {
    var c = Object.assign({}, it);
    c.bobot = total > 0 ? (Number(it.volume) || 0) * (Number(it.hargaNego) || 0) / total : (items.length ? 1 / items.length : 0);
    delete c.hargaNego;
    return c;
  });
}

function muat_(u, sejak, generasiKlien) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var gen = generasi_();
    if (sejak && generasiKlien && String(generasiKlien) !== gen) sejak = null; // data diganti total → muat penuh
    var waktu = Date.now(), data = {}, hapus = {}, penuh = !sejak;
    Object.keys(KOLEKSI).forEach(function (kol) {
      var rows = baca_(kol), berubah = sejak ? rows.filter(function (r) { return r.diubah >= sejak; }) : rows;
      if (kol === 'items' && u.peran !== 'MANAJEMEN' && berubah.length) berubah = rows; // bobot bergantung semua item
      var hidup = berubah.filter(function (r) { return !r.dihapus; }).map(function (r) { return parse_(r.data); }).filter(Boolean);
      if (!penuh) hapus[kol] = berubah.filter(function (r) { return r.dihapus; }).map(function (r) { return r.id; });
      if (kol === 'items' && u.peran !== 'MANAJEMEN') hidup = itemTanpaHarga_(hidup);
      if (kol === 'project') { if (hidup.length || penuh) data.project = hidup[0] || {}; }
      else data[kol] = hidup;
    });
    return { ok: true, waktu: waktu, generasi: gen, penuh: penuh, user: u, data: data, hapus: hapus };
  } finally { lock.releaseLock(); }
}

function sinkron_(u, ops) {
  if (!Array.isArray(ops) || ops.length > 1000) return { ok: false, kode: 'FORMAT', pesan: 'Daftar perubahan tidak valid (maks 1000).' };
  var ditolak = [], grup = {}, itemIds = null;
  var tolak = function (o, alasan) { ditolak.push({ kol: o.kol, id: o.id, alasan: alasan }); };
  var now = new Date().toISOString();
  ops.forEach(function (o) {
    if (!o || !KOLEKSI[o.kol] || !o.id || (o.op !== 'upsert' && o.op !== 'hapus')) return tolak(o || {}, 'format');
    if (IZIN_TULIS[o.kol].indexOf(u.peran) < 0) return tolak(o, 'peran ' + u.peran + ' tidak boleh mengubah ' + KOLEKSI[o.kol]);
    var d = o.op === 'upsert' ? Object.assign({}, o.data || {}) : null;
    if (o.kol === 'progress' && d) {
      if (!itemIds) { itemIds = {}; baca_('items').forEach(function (r) { if (!r.dihapus) itemIds[r.id] = 1; }); }
      if (!itemIds[d.itemId]) return tolak(o, 'item tidak dikenal');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggal))) return tolak(o, 'tanggal tidak valid');
      d.volume = Number(d.volume);
      if (!isFinite(d.volume) || d.volume < 0) return tolak(o, 'volume tidak valid');
      d.sbd = d.sbd || '';
      d.id = d.sbd ? d.itemId + ':' + d.tanggal + ':' + d.sbd : d.itemId + ':' + d.tanggal;
      if (d.id !== o.id) return tolak(o, 'id progres tidak sesuai');
      d.diinputOleh = u.email; d.updatedAt = now;
    }
    if (o.kol === 'dailyNotes') {
      if (o.op === 'hapus' && u.peran !== 'MANAJEMEN') return tolak(o, 'hanya MANAJEMEN yang boleh menghapus isu');
      if (d) { if (!String(d.uraian || '').trim()) return tolak(o, 'uraian isu wajib diisi'); d.updatedAt = now; d.diubahOleh = u.email; if (!d.dicatatOleh) d.dicatatOleh = u.email; }
    }
    if (o.kol === 'items' && d && d.hargaNego == null) delete d.hargaNego;
    if (o.kol === 'project') o.id = 'PROJECT';
    (grup[o.kol] = grup[o.kol] || []).push({ id: String(o.id), op: o.op, data: d });
  });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var n = 0;
  try {
    Object.keys(grup).forEach(function (kol) { tulis_(kol, grup[kol], u.email); n += grup[kol].length; });
  } finally { lock.releaseLock(); }
  if (n || ditolak.length) log_(u.email, 'SINKRON', n + ' perubahan' + (ditolak.length ? ', ' + ditolak.length + ' ditolak' : ''));
  return { ok: true, diterima: n, ditolak: ditolak };
}

function impor_(u, req) {
  if (u.peran !== 'MANAJEMEN') return { ok: false, kode: 'AKSES', pesan: 'Hanya MANAJEMEN yang boleh impor data.' };
  var d = req.data || {}, ganti = req.mode === 'ganti';
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    if (ganti) {
      Object.keys(KOLEKSI).forEach(function (kol) { var sh = sheet_(kol), n = sh.getLastRow() - 1; if (n > 0) sh.deleteRows(2, n); });
      PropertiesService.getScriptProperties().setProperty('GENERASI', String(Number(generasi_()) + 1));
    }
    var jml = {};
    if (d.project) tulis_('project', [{ id: 'PROJECT', op: 'upsert', data: d.project }], u.email);
    ['divisions', 'items', 'progress', 'dailyNotes', 'procurement', 'wells'].forEach(function (kol) {
      var arr = (d[kol] || []).filter(function (x) { return x && x.id; });
      if (kol === 'progress') arr = arr.map(function (p) { var s = p.sbd || ''; return Object.assign({}, p, { sbd: s, id: s ? p.itemId + ':' + p.tanggal + ':' + s : p.itemId + ':' + p.tanggal }); });
      tulis_(kol, arr.map(function (x) { return { id: String(x.id), op: 'upsert', data: x }; }), u.email);
      jml[kol] = arr.length;
    });
    log_(u.email, ganti ? 'IMPOR_GANTI' : 'IMPOR_GABUNG', JSON.stringify(jml));
    return { ok: true, jumlah: jml };
  } finally { lock.releaseLock(); }
}

/* ------------------------------------------------------------------ */
/*  Log & penyiapan                                                     */
/* ------------------------------------------------------------------ */
function log_(email, aksi, detail) {
  try {
    var sh = ss_().getSheetByName('Log');
    if (!sh) { sh = ss_().insertSheet('Log'); sh.getRange(1, 1, 1, 4).setValues([['Waktu', 'Email', 'Aksi', 'Detail']]).setFontWeight('bold'); sh.setFrozenRows(1); }
    sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setValues([[new Date(), email, aksi, teks_(detail)]]);
  } catch (e) { /* log tidak boleh menggagalkan aksi utama */ }
}

/** Jalankan SEKALI dari editor Apps Script: membuat semua sheet + mendaftarkan Anda sebagai MANAJEMEN. */
function siapkan() {
  var ss = ss_(), sh = ss.getSheetByName('Pengguna');
  if (!sh) {
    sh = ss.insertSheet('Pengguna', 0);
    sh.getRange(1, 1, 1, 4).setValues([['Email', 'Nama', 'Peran (MANAJEMEN/PELAKSANA/PENGAWAS)', 'Aktif (YA/TIDAK)']]).setFontWeight('bold').setBackground('#1F3864').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, 1, 4).setValues([[Session.getEffectiveUser().getEmail(), 'Pemilik', 'MANAJEMEN', 'YA']]);
    sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 180); sh.setColumnWidth(3, 260);
  }
  Object.keys(KOLEKSI).forEach(sheet_);
  log_(Session.getEffectiveUser().getEmail(), 'SIAPKAN', 'versi ' + VERSI);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('JIAT Monitoring')
    .addItem('Siapkan sheet (sekali saja)', 'siapkan')
    .addItem('Paksa semua perangkat keluar', 'hapusSemuaSesi')
    .addToUi();
}
