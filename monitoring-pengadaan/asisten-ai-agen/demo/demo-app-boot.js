/* DEMO APLIKASI LENGKAP — HTML dasar asli + paket pembaruan asli + kernel Code.gs asli + modul server asli, seluruhnya di browser.
 * "Server" = kernel Code.gs yang dijalankan di halaman ini dengan tiruan layanan Google (Spreadsheet, Properti, Cache, Drive) di memori;
 * permintaan aplikasi ke URL_DEMO dijawab kernel tersebut. Data contoh dibuat ulang setiap kali halaman dibuka (tidak ada yang
 * tersimpan di server asli). Kunci penyimpanan browser aplikasi diberi awalan DEMO agar tidak bercampur dengan aplikasi asli.
 * Dirakit oleh demo/rakit_demo_app.py — penanda kode kernel, modul & paket diganti saat perakitan. */
(function () {
  const URL_DEMO = 'https://demo.monitoring-pengadaan.local/exec', P = '1726012';
  const MODUL = __MODUL__, PAKET = __PAKET__;

  /* ---------- SHA-256 (sinkron, untuk sidik paket/modul kernel) ---------- */
  const KK = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(bytes) {
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(bytes); m[l] = 0x80;
    const bits = l * 8; for (let i = 0; i < 8; i++) m[n - 1 - i] = Math.floor(bits / Math.pow(2, 8 * i)) & 255;
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + KK[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    const out = []; H.forEach(x => { for (let i = 3; i >= 0; i--) { const b = (x >>> (8 * i)) & 255; out.push(b > 127 ? b - 256 : b); } }); return out;
  }
  const utf8 = s => new TextEncoder().encode(String(s));

  /* ---------- tiruan layanan Google (sama dengan uji/harness.js) ---------- */
  const sheets = {}, props = {}, cache = {}, drive = {}, files = {};
  const strip = v => (typeof v === 'string' && v[0] === "'") ? v.slice(1) : v;
  function Sheet(nama) { this.nama = nama; this.rows = []; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows.reduce((m, r) => Math.max(m, r.length), 0); };
  Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(strip)); return this; };
  Sheet.prototype.setFrozenRows = function () { };
  Sheet.prototype.getName = function () { return this.nama; };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    const sh = this; nr = nr || 1; nc = nc || 1;
    const rg = {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || [], o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
      setValues(v) { for (let i = 0; i < nr; i++) { while (sh.rows.length < r + i) sh.rows.push([]); const row = sh.rows[r - 1 + i]; for (let j = 0; j < nc; j++) row[c - 1 + j] = strip(v[i][j]); } return rg; },
      clearContent() { for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; } while (sh.rows.length > 1 && sh.rows[sh.rows.length - 1].every(x => x === '')) sh.rows.pop(); return rg; },
      setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; }
    };
    return rg;
  };
  const SS = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)), getSheets: () => Object.values(sheets), getUrl: () => 'demo://sheets', getId: () => 'DEMO', deleteSheet() { } };
  let nId = 0; const folders = {};
  const berkas = id => { const b = files[id]; return { getId: () => id, getName: () => b.nama, getSize: () => b.data.length, getMimeType: () => b.mime || 'application/pdf', getLastUpdated: () => new Date(b.diubah || 0),
    getParents: () => { let i = 0; return { hasNext: () => i < 1, next: () => (i++, folder(b.induk)) }; }, getBlob: () => ({ getBytes: () => Array.from(utf8(b.data)), getDataAsString: () => b.data, getContentType: () => b.mime || 'application/pdf' }),
    isTrashed: () => false, setTrashed() { }, getUrl: () => 'demo://drive/' + id };
  };
  const folder = (id, nama) => { if (folders[id]) return folders[id]; const f = { id, nama, anak: {}, getId: () => id, getUrl: () => 'demo://drive/' + id, getName: () => nama,
    getFoldersByName: nm => { const x = f.anak[nm]; return { hasNext: () => !!x, next: () => x }; }, createFolder: nm => (f.anak[nm] = folder('F' + (++nId), nm)),
    getFiles: () => { const L = Object.keys(files).filter(k => files[k].induk === id).map(berkas); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; },
    getFilesByName: nm => { const L = Object.keys(files).filter(k => files[k].induk === id && files[k].nama === nm).map(berkas); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; },
    createFile: blob => { const fid = 'D' + (++nId); drive[fid] = blob.teks; if (blob.biner) files[fid] = { nama: blob.nama || 'berkas', data: blob.teks, induk: id, mime: blob.tipe, diubah: Date.now() }; return { getId: () => fid, getUrl: () => 'demo://drive/' + fid, getName: () => blob.nama || '' }; } };
    return (folders[id] = f); };
  const L = {
    SpreadsheetApp: { getActiveSpreadsheet: () => SS, openById: () => SS, create: () => SS, flush() { } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.hasOwnProperty(k) ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; }, getProperties: () => Object.assign({}, props), getKeys: () => Object.keys(props) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.hasOwnProperty(k) ? cache[k] : null, put: (k, v) => { cache[k] = String(v); }, putAll: o => Object.assign(cache, o), getAll: ks => { const o = {}; ks.forEach(k => { if (cache.hasOwnProperty(k)) o[k] = cache[k]; }); return o; }, remove: k => { delete cache[k]; }, removeAll: ks => ks.forEach(k => delete cache[k]) }) },
    LockService: { getScriptLock: () => ({ waitLock() { }, tryLock: () => true, hasLock: () => true, releaseLock() { } }) },
    Utilities: {
      formatDate: (d, tz, f) => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
        return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute).replace('ss', p.second); },
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (a, v) => sha256(typeof v === 'string' ? utf8(v) : Uint8Array.from(v || [], b => b & 255)),
      sleep: () => { }, getUuid: () => { try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(16) + Math.random().toString(16).slice(2); } },
      base64Encode: b => { let s = ''; Array.from(b || [], x => x & 255).forEach(x => { s += String.fromCharCode(x); }); return btoa(s); },
      base64Decode: s => Array.from(atob(String(s || '')), ch => { const c = ch.charCodeAt(0); return c > 127 ? c - 256 : c; }),
      newBlob: (s, tipe, nama) => typeof s === 'string' ? { teks: s, tipe, nama, getBytes: () => Array.from(utf8(s)), getDataAsString: () => s, setName(n) { this.nama = n; return this; } }
        : { teks: Array.from(s || [], x => String.fromCharCode(x & 255)).join(''), biner: true, tipe, nama, getBytes: () => Array.from(s || []), setName(n) { this.nama = n; return this; } }
    },
    DriveApp: { getFileById: id => { if (files[id]) return berkas(id); if (!drive.hasOwnProperty(id)) throw new Error('Berkas tidak ditemukan (demo).'); return { getId: () => id, getName: () => '', getBlob: () => ({ getDataAsString: () => drive[id] }), setTrashed() { } }; },
      getFolderById: id => folder(id), createFolder: nm => folder('F' + (++nId), nm), getRootFolder: () => folder('ROOT', 'Drive') },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 503, getContentText: () => JSON.stringify({ error: { message: 'Demo: layanan luar (AI / Telegram) tidak tersambung.' } }) }) },
    ContentService: { createTextOutput: t => ({ setMimeType() { return t; } }), MimeType: { JSON: 1 } },
    HtmlService: { createHtmlOutput: t => t },
    Logger: { log() { } },
    MailApp: { getRemainingDailyQuota: () => 0, sendEmail() { throw new Error('Demo: email tidak dikirim.'); } },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() { }, newTrigger: () => { const c = { timeBased: () => c, atHour: () => c, nearMinute: () => c, everyDays: () => c, inTimezone: () => c, create: () => ({}) }; return c; } }
  };

  /* ---------- kernel Code.gs asli (dalam lingkup sendiri; modul server dikompilasi di lingkup yang sama) ---------- */
  const K = (function (SpreadsheetApp, PropertiesService, CacheService, LockService, Utilities, DriveApp, UrlFetchApp, ContentService, HtmlService, Logger, MailApp, ScriptApp) {
__KODE_GS__
    return { doGet, doPost, tulisPengguna_, tulisProyek_, tulisKoleksi_, folderPembaruan_, mp219SimpanMeta_, PROYEK_AWAL };
  })(L.SpreadsheetApp, L.PropertiesService, L.CacheService, L.LockService, L.Utilities, L.DriveApp, L.UrlFetchApp, L.ContentService, L.HtmlService, L.Logger, L.MailApp, L.ScriptApp);
  const kirim = o => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(o) } }));
  const ADM = (action, x) => kirim(Object.assign({ action, nama: 'Joko Supriyono', pin: '1234', proyek: P }, x || {}));
  const STF = (action, x) => kirim(Object.assign({ action, nama: 'Staf Pengadaan', pin: '1111', proyek: P }, x || {}));
  const harus = (r, apa) => { if (!r || r.ok === false) throw new Error(apa + ': ' + ((r && r.error) || 'gagal')); return r; };

  /* ---------- data contoh ---------- */
  const NO = (n, j) => n + '/' + (j || 'SPM') + '/WK-NK.KSO/PDBJ/1726012/2026';
  function isi() {
    K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*', jabatan: 'Kasi Danloglat' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*', jabatan: 'Staf Pengadaan' }]);
    K.tulisProyek_([K.PROYEK_AWAL]);
    harus(ADM('modulUnggah', { data: MODUL }), 'unggah modul'); harus(ADM('modulTerbit', { versi: MODUL.versi, konfirmasi: 'LULUS UJI', catatanUji: 'demo aplikasi lengkap' }), 'terbit modul');
    const f = K.folderPembaruan_().createFile(L.Utilities.newBlob(JSON.stringify(PAKET), 'application/json', 'pembaruan-' + PAKET.versi + '.json'));
    K.mp219SimpanMeta_(f.getId(), PAKET); props.PEMB_AKTIF = f.getId();
    // (1) kasus 027/SPM: item DRAFT Master bernilai header 0 dipindah lewat Perbaikan Register → 090/SPSA, BK 100% diisi nilai saja
    const DRAF = '(DRAFT - BELUM ADA NO KONTRAK) No 70 baris 1329', sig = v => 'K:49000633|truck uni / mounted / hiab crane 10 ton|' + v + '#1';
    K.tulisKoleksi_(P, 'koreksi', [
      { key: 'SISTEM-PERBAIKAN-REGISTER|' + DRAF, jenis: 'perbaikanRegister', aktif: true, sumber: DRAF, alasan: 'Demo: item DRAFT dipindah ke nomor kontrak resmi', pindah: [{ ke: NO('090', 'SPSA'), items: [sig(0), sig(4)], header: { namaVendor: 'Koperasi Karyawan PT Nindya' }, nilai: null, bagiTagihan: false }], versi: 1, diubahOleh: 'Joko Supriyono', diubahPada: '2026-10-01T08:00:00.000Z' },
      { key: NO('090', 'SPSA'), tglMulai: '2026-06-01', tglSelesai: '2026-06-19', versi: 1, diubahOleh: 'Joko Supriyono', diubahPada: '2026-10-01T08:00:00.000Z' }]);
    // (2) Register: 091 BK 100% (BK ke-2 diisi nilai saja) · 092 BK 62,5% (tetap di notifikasi)
    const kontrak = (id, no, vendor) => ({ id, noKontrak: no, namaVendor: vendor, idVendor: '2100010709', jenisKontrak: 'SPM', kelompok: 'BAHAN', tahun: 2026, bulan: 'Mei', tglKontrak: '2026-05-20', tglSelesai: '2026-06-19', top: '30', noPR: '1000170001', noRFQ: '2100190001', noPO: '4100070001',
      items: [{ kode: '1300002547', uraian: 'Pipa PVC AW dia 1 1/2" L=4m VINILON', vol: 10, sat: 'BTG', harga: 100000, wbs: '1726012-99-02-02' }, { kode: '1100000554', uraian: 'Cat Minyak', vol: 10, sat: 'KLG', harga: 100000, wbs: '1726012-99-02-02' }],
      nilai: 2000000, diposting: true, versi: 1, dibuatOleh: 'Staf Pengadaan', dibuatPada: '2026-05-20T01:00:00.000Z', diubahOleh: 'Staf Pengadaan', diubahPada: '2026-05-20T01:00:00.000Z' });
    K.tulisKoleksi_(P, 'data', [kontrak('RD1', NO('091'), 'Putra Paloh, CV'), kontrak('RD2', NO('092'), 'Sinar Bangun Jaya, CV')]);
    const bk = (id, no, ke, items, nilai) => ({ id, versi: 1, noKontrak: no, tagihanKe: ke, periode: ke === 1 ? 'Juni 2026' : 'Juli 2026', tanggal: '2026-07-0' + ke, items, nilai, baTerbit: true, nomorBA: '0' + ke + '/BAPM/' + no, dibuatOleh: 'Staf Pengadaan', dibuatPada: '2026-07-0' + ke + 'T01:00:00.000Z', diubahOleh: 'Staf Pengadaan', diubahPada: '2026-07-0' + ke + 'T01:00:00.000Z' });
    K.tulisKoleksi_(P, 'progres', [
      Object.assign(bk('TD0', NO('090', 'SPSA'), 1, {}, 204000000), { nomorBA: '01/BAPSA/' + NO('090', 'SPSA') }),
      bk('TD1', NO('091'), 1, { [NO('091') + '#0']: 10 }, 1000000), bk('TD2', NO('091'), 2, {}, 1000000),
      bk('TD3', NO('092'), 1, { [NO('092') + '#0']: 10, [NO('092') + '#1']: 2.5 }, 1250000),
      bk('TD4', '093/SPM/WK-NK.KSO/PDBJ/1726012/2O26', 1, {}, 5000000)]);   // (3) nomor salah ketik (huruf O) → BK tidak terhubung ke kontrak
    // (4) Bon Permintaan: bahan & alat
    harus(STF('savePermintaan', { data: { noUrut: 901, tahun: 2026, tanggal: '2026-10-01', departemen: 'Logistik', peminta: 'Budi', keperluan: 'Pekerjaan fender dermaga zona 2', wbs: '1726012-99-02-02',
      items: [{ kode: '1000000001', uraian: 'Timbunan / Urug Tanah / Batu Kapur', sat: 'M3', vol: 10, harga: 150000, wbs: '1726012-99-02-02' }] } }), 'bon bahan');
    harus(STF('savePermintaan', { data: { noUrut: 902, tahun: 2026, tanggal: '2026-10-02', departemen: 'Pelaksana', peminta: 'Andi', keperluan: 'Galian pondasi', wbs: '1726012-99-02-02',
      items: [{ kode: '49000000', uraian: 'Excavator', sat: 'DAY', vol: 6, harga: 3500000, wbs: '1726012-99-02-02' }] } }), 'bon alat');
  }
  let siap = false, galat = '';
  try { isi(); siap = true; } catch (e) { galat = e.message || String(e); console.error('[demo] gagal menyiapkan server', e); }
  // data awal Excel (BK & Bon) diimpor ke server demo seperti Admin menjalankan Migrasi Data → Simpan & Kunci; DATA_AWAL ada di HTML dasar
  let awalSelesai = false;
  function awal() {
    if (awalSelesai || !siap) return; awalSelesai = true;
    try {
      if (typeof DATA_AWAL === 'undefined' || !DATA_AWAL) return;
      [['progres', DATA_AWAL.progres || []], ['permintaan', DATA_AWAL.permintaan || []]].forEach(([jenis, rows]) => { for (let i = 0; i < rows.length; i += 25) harus(ADM('impor', { jenis, rows: rows.slice(i, i + 25) }), 'impor ' + jenis); });
      const R = DATA_AWAL.rekonsiliasi || {};
      harus(ADM('kunciMigrasi', { data: { bk: (DATA_AWAL.progres || []).length, pm: (DATA_AWAL.permintaan || []).length, nilaiBK: R.nilaiBK || 0, sumber: R.sumber || 'Excel (demo)' } }), 'kunci data awal');
    } catch (e) { galat = e.message || String(e); console.error('[demo] impor data awal', e); }
  }
  window.DEMO_SERVER = { kirim, props, sheets, galat: () => galat, awal: () => { awal(); return awalSelesai; } };

  /* ---------- jembatan: aplikasi → kernel ---------- */
  const fetchAsli = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(URL_DEMO) !== 0) return fetchAsli ? fetchAsli(input, init) : Promise.reject(new Error('fetch tidak tersedia'));
    return new Promise(res => setTimeout(() => {
      let out;
      try {
        if (!siap) throw new Error('server demo gagal disiapkan: ' + galat);
        awal();
        const u = new URL(url), post = String((init && init.method) || 'GET').toUpperCase() === 'POST';
        out = post ? K.doPost({ postData: { contents: String((init && init.body) || '') } }) : K.doGet({ parameter: Object.fromEntries(u.searchParams) });
      } catch (e) { out = JSON.stringify({ ok: false, error: 'Demo: ' + (e.message || e) }); }
      res(new Response(typeof out === 'string' ? out : JSON.stringify(out), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }, 90 + Math.random() * 120));
  };

  /* ---------- perangkat: alamat server demo, paket terbit & sesi Admin ---------- */
  try {
    localStorage.setItem('DEMOJICT_REG_URL', URL_DEMO);
    localStorage.setItem('DEMOJICT_PEMBARUAN', JSON.stringify(PAKET));
    const s = (() => { try { return JSON.parse(localStorage.getItem('DEMOJICT_REG_SESI') || 'null'); } catch (e) { return null; } })();
    if (siap && !(s && s.nama)) {
      const r = ADM('login');
      if (r.ok) localStorage.setItem('DEMOJICT_REG_SESI', JSON.stringify({ nama: r.user.nama, peran: r.user.peran, pin: '1234', proyek: P, admin: !!r.user.admin, cfg: r.proyek || { id: P }, jabatan: 'Kasi Danloglat' }));
    }
  } catch (e) { }

  /* ---------- panel demo ---------- */
  window.demoReset = function () { try { Object.keys(localStorage).filter(k => /^DEMOJICT_|^mp2\d\d/.test(k)).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); } catch (e) { } location.reload(); };
  window.demoMasuk = function (nama, pin) {
    const r = kirim({ action: 'login', nama, pin, proyek: P }); if (!r.ok) { alert(r.error); return; }
    localStorage.setItem('DEMOJICT_REG_SESI', JSON.stringify({ nama: r.user.nama, peran: r.user.peran, pin, proyek: P, admin: !!r.user.admin, cfg: r.proyek || { id: P } })); location.reload();
  };
  const PANDUAN = [
    ['Bon Permintaan · Bahan / Alat / Sub', "showTab('form-bon')", 'Pilih jenis di atas Rincian, lalu ketik mis. "excavator" (Alat 49xxx) atau "bekisting" (Sub 29/39xxx). Daftar: filter jenis.'],
    ['Kasus 027/SPM — nilai Rp 0', "showTab('dashboard-tagihan'); setTimeout(function(){var i=document.getElementById('rkCari'); if(i){i.value='090'; i.dispatchEvent(new Event('input'));}},300)", 'Rekap Seluruh Kontrak, cari 090: kontrak hasil Perbaikan Register — Nilai Rp 204 Juta · Tagihan 100% · Selesai (dulu Rp 0 · 0%).'],
    ['Notifikasi prioritas', "window.mp258Buka && mp258Buka('KRITIS')", 'Lonceng: 091 (BK 100%, BK ke-2 diisi nilai saja) tidak muncul; 092 tetap muncul dengan "BK 62,5%".'],
    ['Periksa kontrak', 'window.mp2610Buka && mp2610Buka()', 'Menu akun › Periksa kontrak: memeriksa seluruh 74 kontrak Master + Register + BK — termasuk BK 093 yang nomornya salah ketik (huruf O).']
  ];
  function panel() {
    if (document.getElementById('demoPanel')) return;
    const st = document.createElement('style'); st.textContent = `#demoPanel{position:fixed;left:12px;bottom:12px;z-index:2147483000;font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#0B1F3A;max-width:min(380px,calc(100vw - 24px))}
      #demoPanel .dp-btn{display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:7px 14px;background:#E3343F;color:#fff;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.3);cursor:pointer}
      #demoPanel .dp-isi{margin-top:8px;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:12px 14px;display:grid;gap:8px;max-height:70vh;overflow:auto}
      #demoPanel .dp-isi[hidden]{display:none}#demoPanel h4{margin:0;font-size:14px;color:#0B1F3A;font-weight:700;opacity:1}#demoPanel p{margin:0;color:#4A5A70;font-size:12px;opacity:1}
      #demoPanel .dp-l{display:grid;gap:2px;text-align:left;border:1px solid #D3DBE6;border-radius:10px;padding:8px 10px;background:#F4F7FB;cursor:pointer;color:#0B1F3A}
      #demoPanel .dp-l:hover{border-color:#1763B3}#demoPanel .dp-l b{font-size:12.5px}#demoPanel .dp-l span{font-size:11.5px;color:#4A5A70}
      #demoPanel .dp-a{display:flex;flex-wrap:wrap;gap:6px}#demoPanel .dp-a button{border:1px solid #D3DBE6;background:#fff;border-radius:8px;padding:4px 9px;font-size:12px;cursor:pointer;color:#0B1F3A}
      @media (max-width:767px){#demoPanel{bottom:78px}}`;
    document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'demoPanel';
    d.innerHTML = `<button type="button" class="dp-btn" aria-expanded="false" onclick="var i=this.nextElementSibling; i.hidden=!i.hidden; this.setAttribute('aria-expanded', String(!i.hidden))">▶ DEMO ${PAKET.versi}</button>
      <div class="dp-isi" hidden><h4>Demo pembaruan ${PAKET.versi} · modul ${MODUL.versi}</h4>
      <p>Aplikasi asli + kernel Code.gs asli berjalan di browser dengan data contoh. Tidak tersambung ke server proyek; data dibuat ulang setiap halaman dibuka.${siap ? '' : ' <b style="color:#C00">Server demo gagal: ' + galat + '</b>'}</p>
      ${PANDUAN.map((x, i) => `<button type="button" class="dp-l" onclick="${x[1].replace(/"/g, '&quot;')}"><b>${i + 1}. ${x[0]}</b><span>${x[2]}</span></button>`).join('')}
      <p>Akun: <b>Joko Supriyono</b> (Admin, sandi 1234) · <b>Staf Pengadaan</b> (sandi 1111)</p>
      <div class="dp-a"><button type="button" onclick="demoMasuk('Joko Supriyono','1234')">Masuk sebagai Admin</button><button type="button" onclick="demoMasuk('Staf Pengadaan','1111')">Masuk sebagai Staf</button><button type="button" onclick="demoReset()">Reset demo</button></div></div>`;
    document.body.appendChild(d);
  }
  if (document.body) panel(); else document.addEventListener('DOMContentLoaded', panel);
})();
