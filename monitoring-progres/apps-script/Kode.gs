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
 *  - Pendaftaran mandiri: staf daftar via aplikasi (verifikasi email) → status MENUNGGU,
 *    MANAJEMEN menyetujui / menolak dari menu "Pengguna" di aplikasi.
 *
 *  Pemasangan: lihat monitoring-progres/apps-script/PANDUAN.md
 * =====================================================================
 */
var VERSI = '1.1.0';
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
    if (req.aksi === 'daftar') return json_(daftar_(req));
    if (req.aksi === 'verifikasiDaftar') return json_(verifikasiDaftar_(req));
    var u = cekSesi_(req.token);
    if (!u) return json_({ ok: false, kode: 'SESI', pesan: 'Sesi berakhir atau akses dicabut. Silakan masuk lagi.' });
    switch (req.aksi) {
      case 'muat': return json_(muat_(u, req.sejak, req.generasi, req.asal));
      case 'pengguna': return json_(penggunaList_(u));
      case 'putuskan': return json_(putuskan_(u, req));
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

var KOLOM_PENGGUNA = ['Email', 'Nama', 'Peran (MANAJEMEN/PELAKSANA/PENGAWAS)', 'Aktif (YA/TIDAK/MENUNGGU/DITOLAK)', 'Keterangan / Jabatan', 'Tanggal daftar', 'Diputuskan oleh', 'Tanggal keputusan'];

/** Sheet Pengguna (dibuat / dilengkapi kolomnya otomatis). */
function shPengguna_() {
  var sh = ss_().getSheetByName('Pengguna');
  if (!sh) {
    sh = ss_().insertSheet('Pengguna', 0);
    sh.getRange(1, 1, 1, KOLOM_PENGGUNA.length).setValues([KOLOM_PENGGUNA]).setFontWeight('bold').setBackground('#1F3864').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < KOLOM_PENGGUNA.length || !String(sh.getRange(1, 8, 1, 1).getValues()[0][0])) {
    sh.getRange(1, 5, 1, 4).setValues([KOLOM_PENGGUNA.slice(4)]).setFontWeight('bold').setBackground('#1F3864').setFontColor('#FFFFFF');
  }
  return sh;
}

function bacaPengguna_() {
  var sh = shPengguna_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 8).getValues().map(function (r, i) {
    return {
      baris: i + 2, email: normEmail_(r[0]), nama: String(r[1] || ''), peran: String(r[2] || '').trim().toUpperCase(),
      aktif: String(r[3] || 'YA').trim().toUpperCase(), keterangan: String(r[4] || ''),
      tglDaftar: r[5] || '', diputuskanOleh: String(r[6] || ''), tglKeputusan: r[7] || '',
    };
  }).filter(function (p) { return p.email; });
}

function pengguna_(email) {
  var p = bacaPengguna_().filter(function (x) { return x.email === email; })[0];
  if (!p || p.aktif !== 'YA' || PERAN.indexOf(p.peran) < 0) return null;
  return { email: email, nama: p.nama || email, peran: p.peran };
}

function buatKode_() {
  var acak = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16);
  return String(acak % 1000000).padStart(6, '0');
}

function namaAplikasi_() { return (ss_().getSheetByName('Item') && proyek_().nama) || 'Monitoring Progres JIAT'; }
function linkAplikasi_() { return PropertiesService.getScriptProperties().getProperty('APP_URL') || ''; }

/** Batas permintaan kode per email per jam. Mengembalikan pesan galat atau null. */
function batasKode_(email) {
  var cache = CacheService.getScriptCache(), rl = Number(cache.get('rl_' + email) || 0);
  if (rl >= OTP_MAKS_PER_JAM) return 'Terlalu banyak permintaan kode. Coba lagi 1 jam lagi.';
  cache.put('rl_' + email, String(rl + 1), 3600);
  return null;
}

/** Cocokkan kode di cache (prefix otp_/reg_). Mengembalikan {ok, data} atau {ok:false, pesan}. */
function cocokKode_(prefix, email, kode) {
  var cache = CacheService.getScriptCache(), raw = cache.get(prefix + email);
  if (!raw) return { ok: false, kode: 'KODE', pesan: 'Kode kedaluwarsa atau belum diminta. Minta kode baru.' };
  var o = JSON.parse(raw);
  if (o.h !== hash_(email + ':' + kode)) {
    o.n++;
    if (o.n >= OTP_MAKS_COBA) { cache.remove(prefix + email); log_(email, 'KODE_GAGAL', prefix + ' terlalu banyak salah'); return { ok: false, kode: 'KODE', pesan: 'Terlalu banyak salah. Minta kode baru.' }; }
    cache.put(prefix + email, JSON.stringify(o), OTP_MENIT * 60);
    return { ok: false, kode: 'KODE', pesan: 'Kode salah. Sisa percobaan: ' + (OTP_MAKS_COBA - o.n) };
  }
  cache.remove(prefix + email);
  return { ok: true, data: o };
}

function mintaKode_(req) {
  var email = normEmail_(req.email);
  var umum = { ok: true, pesan: 'Jika email terdaftar, kode masuk telah dikirim. Periksa Inbox / Spam.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, kode: 'EMAIL', pesan: 'Format email tidak valid' };
  var batas = batasKode_(email);
  if (batas) return { ok: false, kode: 'BATAS', pesan: batas };
  var u = pengguna_(email);
  if (!u) {
    var p = bacaPengguna_().filter(function (x) { return x.email === email; })[0];
    if (p && p.aktif === 'MENUNGGU') return { ok: false, kode: 'MENUNGGU', pesan: 'Pendaftaran Anda masih menunggu persetujuan admin. Anda akan menerima email setelah disetujui.' };
    log_(email, 'KODE_DITOLAK', 'email tidak terdaftar/aktif'); return umum;
  }
  var kode = buatKode_();
  CacheService.getScriptCache().put('otp_' + email, JSON.stringify({ h: hash_(email + ':' + kode), n: 0 }), OTP_MENIT * 60);
  var nama = namaAplikasi_();
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
  var cek = cocokKode_('otp_', email, kode);
  if (!cek.ok) return cek;
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

function muat_(u, sejak, generasiKlien, asal) {
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
    var res = { ok: true, waktu: waktu, generasi: gen, penuh: penuh, user: u, data: data, hapus: hapus };
    if (u.peran === 'MANAJEMEN') {
      res.menunggu = bacaPengguna_().filter(function (p) { return p.aktif === 'MENUNGGU'; }).length;
      // link aplikasi untuk email notifikasi: hanya dicatat dari sesi MANAJEMEN (sumber tepercaya)
      if (asal && /^https:\/\/[^\s"'<>]{4,200}$/.test(asal) && asal !== linkAplikasi_()) PropertiesService.getScriptProperties().setProperty('APP_URL', asal);
    }
    return res;
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
/*  Pendaftaran mandiri & persetujuan admin                             */
/* ------------------------------------------------------------------ */
function daftar_(req) {
  var email = normEmail_(req.email), nama = String(req.nama || '').trim().slice(0, 80);
  var ket = String(req.keterangan || '').trim().slice(0, 120);
  var peran = PERAN.indexOf(String(req.peran || '').toUpperCase()) >= 0 ? String(req.peran).toUpperCase() : 'PELAKSANA';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, kode: 'EMAIL', pesan: 'Format email tidak valid' };
  if (nama.length < 3) return { ok: false, kode: 'NAMA', pesan: 'Nama lengkap wajib diisi' };
  var ada = bacaPengguna_().filter(function (x) { return x.email === email; })[0];
  if (ada && ada.aktif === 'YA') return { ok: false, kode: 'ADA', pesan: 'Email ini sudah terdaftar dan aktif. Silakan langsung masuk.' };
  if (ada && ada.aktif === 'MENUNGGU') return { ok: false, kode: 'MENUNGGU', pesan: 'Pendaftaran email ini sudah diterima dan sedang menunggu persetujuan admin.' };
  if (ada && ada.aktif === 'TIDAK') return { ok: false, kode: 'NONAKTIF', pesan: 'Akun ini dinonaktifkan. Hubungi admin proyek.' };
  var batas = batasKode_(email);
  if (batas) return { ok: false, kode: 'BATAS', pesan: batas };
  var kode = buatKode_();
  CacheService.getScriptCache().put('reg_' + email, JSON.stringify({ h: hash_(email + ':' + kode), n: 0, nama: nama, ket: ket, peran: peran }), OTP_MENIT * 60);
  MailApp.sendEmail({
    to: email,
    subject: 'Kode verifikasi pendaftaran: ' + kode,
    body: 'Halo ' + nama + ',\n\nKode verifikasi pendaftaran akun aplikasi ' + namaAplikasi_() + ':\n\n    ' + kode + '\n\n' +
      'Berlaku ' + OTP_MENIT + ' menit. Setelah verifikasi, akun Anda akan ditinjau oleh admin proyek.\n' +
      'Abaikan email ini jika Anda tidak mendaftar.',
  });
  log_(email, 'DAFTAR_KODE', nama);
  return { ok: true, pesan: 'Kode verifikasi telah dikirim ke ' + email + '. Periksa Inbox / Spam.' };
}

function verifikasiDaftar_(req) {
  var email = normEmail_(req.email), kode = String(req.kode || '').replace(/\D/g, '');
  var cek = cocokKode_('reg_', email, kode);
  if (!cek.ok) return cek;
  var d = cek.data, lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = shPengguna_(), ada = bacaPengguna_().filter(function (x) { return x.email === email; })[0];
    if (ada && ada.aktif !== 'DITOLAK') return { ok: false, kode: 'ADA', pesan: 'Email ini sudah terdaftar (' + ada.aktif + ').' };
    var baris = [email, d.nama, d.peran, 'MENUNGGU', d.ket, new Date(), '', ''];
    if (ada) sh.getRange(ada.baris, 1, 1, 8).setValues([baris]);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, 8).setValues([baris]);
  } finally { lock.releaseLock(); }
  log_(email, 'DAFTAR', d.nama + ' minta ' + d.peran);
  var admin = bacaPengguna_().filter(function (p) { return p.aktif === 'YA' && p.peran === 'MANAJEMEN'; }).map(function (p) { return p.email; });
  if (admin.length) {
    var link = linkAplikasi_();
    try {
      MailApp.sendEmail({
        to: admin.join(','),
        subject: 'Permintaan akun baru: ' + d.nama + ' (' + d.peran + ')',
        body: 'Ada pendaftaran akun baru di ' + namaAplikasi_() + ':\n\n' +
          '  Nama       : ' + d.nama + '\n  Email      : ' + email + '\n  Jabatan    : ' + (d.ket || '-') + '\n  Peran diminta: ' + d.peran + '\n\n' +
          'Setujui atau tolak di aplikasi → menu "Pengguna"' + (link ? ':\n' + link : '.') + '\n',
      });
    } catch (e) { log_('SISTEM', 'EMAIL_ADMIN_GAGAL', String(e)); }
  }
  return { ok: true, pesan: 'Pendaftaran terkirim. Admin akan meninjau akun Anda; Anda akan menerima email setelah disetujui.' };
}

function penggunaList_(u) {
  if (u.peran !== 'MANAJEMEN') return { ok: false, kode: 'AKSES', pesan: 'Hanya MANAJEMEN.' };
  var fmt = function (v) { return v instanceof Date ? v.toISOString() : String(v || ''); };
  return {
    ok: true, saya: u.email,
    pengguna: bacaPengguna_().map(function (p) {
      return { email: p.email, nama: p.nama, peran: p.peran, aktif: p.aktif, keterangan: p.keterangan, tglDaftar: fmt(p.tglDaftar), diputuskanOleh: p.diputuskanOleh, tglKeputusan: fmt(p.tglKeputusan) };
    }),
  };
}

function putuskan_(u, req) {
  if (u.peran !== 'MANAJEMEN') return { ok: false, kode: 'AKSES', pesan: 'Hanya MANAJEMEN.' };
  var email = normEmail_(req.email), kep = String(req.keputusan || '').toUpperCase();
  var peranBaru = String(req.peran || '').toUpperCase();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var p, aktifBaru, peranAkhir;
  try {
    var semua = bacaPengguna_();
    p = semua.filter(function (x) { return x.email === email; })[0];
    if (!p) return { ok: false, kode: 'TIDAK_ADA', pesan: 'Pengguna tidak ditemukan.' };
    peranAkhir = p.peran;
    if (kep === 'SETUJU' || kep === 'AKTIFKAN' || kep === 'PERAN') {
      if (peranBaru) { if (PERAN.indexOf(peranBaru) < 0) return { ok: false, kode: 'PERAN', pesan: 'Peran tidak valid.' }; peranAkhir = peranBaru; }
      if (PERAN.indexOf(peranAkhir) < 0) peranAkhir = 'PELAKSANA';
      aktifBaru = kep === 'PERAN' ? p.aktif : 'YA';
    } else if (kep === 'TOLAK') { aktifBaru = 'DITOLAK'; }
    else if (kep === 'NONAKTIF') { aktifBaru = 'TIDAK'; }
    else return { ok: false, kode: 'AKSI', pesan: 'Keputusan tidak dikenal.' };
    // jangan sampai tidak ada MANAJEMEN aktif / admin mengunci dirinya sendiri
    var sisaAdmin = semua.filter(function (x) {
      var aktif = x.email === email ? aktifBaru : x.aktif, peran = x.email === email ? peranAkhir : x.peran;
      return aktif === 'YA' && peran === 'MANAJEMEN';
    }).length;
    if (email === u.email && (aktifBaru !== 'YA' || peranAkhir !== 'MANAJEMEN')) return { ok: false, kode: 'DIRI', pesan: 'Anda tidak bisa menonaktifkan / menurunkan peran akun Anda sendiri.' };
    if (!sisaAdmin) return { ok: false, kode: 'ADMIN', pesan: 'Harus tersisa minimal satu MANAJEMEN aktif.' };
    var sh = shPengguna_();
    sh.getRange(p.baris, 3, 1, 2).setValues([[peranAkhir, aktifBaru]]);
    sh.getRange(p.baris, 7, 1, 2).setValues([[u.email, new Date()]]);
  } finally { lock.releaseLock(); }
  log_(u.email, 'PENGGUNA_' + kep, email + ' → ' + peranAkhir + '/' + aktifBaru);
  var link = linkAplikasi_();
  try {
    if (kep === 'SETUJU') {
      MailApp.sendEmail({ to: email, subject: 'Akun Anda disetujui – ' + namaAplikasi_(),
        body: 'Halo ' + p.nama + ',\n\nAkun Anda telah DISETUJUI dengan peran ' + peranAkhir + '.\n' +
          'Silakan masuk dengan email ini' + (link ? ':\n' + link : '.') + '\n\nKode masuk akan dikirim ke email Anda setiap kali login di perangkat baru.' });
    } else if (kep === 'TOLAK') {
      MailApp.sendEmail({ to: email, subject: 'Pendaftaran akun tidak disetujui – ' + namaAplikasi_(),
        body: 'Halo ' + p.nama + ',\n\nMohon maaf, pendaftaran akun Anda tidak disetujui' + (req.alasan ? ' dengan catatan:\n  ' + String(req.alasan).slice(0, 300) : '.') + '\n\nHubungi admin proyek bila ada pertanyaan.' });
    }
  } catch (e) { log_('SISTEM', 'EMAIL_GAGAL', String(e)); }
  return penggunaList_(u);
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
  var sh = shPengguna_();
  if (sh.getLastRow() < 2) {
    sh.getRange(2, 1, 1, 8).setValues([[Session.getEffectiveUser().getEmail(), 'Pemilik', 'MANAJEMEN', 'YA', 'Pemilik Sheet', new Date(), 'siapkan()', new Date()]]);
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
