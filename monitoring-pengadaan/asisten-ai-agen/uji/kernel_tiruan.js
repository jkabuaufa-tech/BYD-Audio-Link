// Kernel tiruan minimal (tanpa Code.gs): memuat SELURUH kode modul server di Node dengan tiruan Sheets / Drive / Cache di memori.
// Dipakai uji yang hanya menyentuh aksi modul (gudang). Untuk uji bersama kernel asli gunakan harness.js (butuh KODE_GS).
const fs = require('fs'), vm = require('vm');
function buatModul(berkas, opsi) {
  opsi = opsi || {};
  const kode = /\.json$/.test(berkas) ? JSON.parse(fs.readFileSync(berkas, 'utf8')).kode : fs.readFileSync(berkas, 'utf8');
  const sheets = {}, log = [], koleksi = {}, props = {}, cache = {}, files = {};
  const strip = v => (typeof v === 'string' && v[0] === "'") ? v.slice(1) : v;
  function Sheet(nama, kol) { this.nama = nama; this.rows = [kol.slice()]; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(strip)); return this; };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    const sh = this; nr = nr || 1; nc = nc || 1;
    return {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || [], o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
      setValues(v) { if (v.length !== nr || v.some(x => x.length !== nc)) throw new Error('ukuran setValues tidak cocok'); for (let i = 0; i < nr; i++) { while (sh.rows.length < r + i) sh.rows.push([]); const row = sh.rows[r - 1 + i]; for (let j = 0; j < nc; j++) row[c - 1 + j] = strip(v[i][j]); } }
    };
  };
  let seq = 0, nFile = 0;
  const folder = P => ({ getId: () => 'FOLDER-' + P, createFile: blob => { const id = 'F' + (++nFile); files[id] = { nama: blob.nama, tipe: blob.tipe, bytes: blob.bytes, induk: 'FOLDER-' + P }; return berkasDrive(id); } });
  const berkasDrive = id => { const f = files[id]; if (!f) throw new Error('tidak ada'); return { getId: () => id, getName: () => f.nama, getUrl: () => 'drive://' + id, getSize: () => f.bytes.length, getMimeType: () => f.tipe, setDescription() { },
    getParents: () => { let i = 0; return { hasNext: () => i < 1, next: () => (i++, { getId: () => f.induk }) }; } }; };
  const ctx = {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error, isFinite, parseInt, parseFloat, encodeURIComponent,
    VERSI_SERVER: 'tiruan', KERNEL_VERSI: '2.5.1', KERNEL: null, module: undefined, TZ: 'Asia/Jakarta', BATAS_PDF: 10 * 1024 * 1024,
    s_: v => v == null ? '' : String(v),
    ss_: () => ({ getSheetByName: n => sheets[n] || null }),
    sheet_: (n, kol) => sheets[n] || (sheets[n] = new Sheet(n, kol)),
    baris_: sh => sh.rows.slice(1),
    catat_: (P, o, u, jenis, ket) => { log.push({ P, id: o && o.id, noKontrak: o && o.noKontrak, oleh: u && u.nama, jenis, ket }); },
    tglValid_: x => { const t = String(x == null ? '' : x).trim().slice(0, 10); if (!t) return ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || isNaN(Date.parse(t + 'T00:00:00Z'))) throw new Error('Tanggal tidak valid: ' + t); return t; },
    hariIniISO_: () => opsi.hariIni || '2026-11-11',
    idBaru_: p => p + '-' + String(++seq).padStart(6, '0'),
    bulat4_: x => Math.round((Number(x) || 0) * 1e4) / 1e4,
    bacaKoleksi_: (P, j) => (koleksi[P + '|' + j] || []),
    tulisKoleksi_: (P, j, L) => { koleksi[P + '|' + j] = L; },
    refBerkas_: raw => raw && typeof raw === 'object' && (raw.idServer || raw.id) ? { id: String(raw.id || raw.idServer), idServer: String(raw.idServer || ''), jenis: String(raw.jenis || '') } : null,
    folderProyek_: P => folder(P),
    semuaPengguna_: () => opsi.pengguna || [],
    aksesProyek_: () => true,
    DriveApp: { getFileById: id => berkasDrive(id) },
    Utilities: { base64Decode: s => [...Buffer.from(String(s), 'base64')].map(b => b > 127 ? b - 256 : b), newBlob: (bytes, tipe, nama) => ({ bytes, tipe, nama }), base64Encode: b => Buffer.from(b).toString('base64'),
      DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: () => [0], formatDate: () => opsi.hariIni || '2026-11-11', sleep() { } },
    CacheService: { getScriptCache: () => ({ get: k => Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null, put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; }, getAll: () => ({}) }) },
    LockService: { getScriptLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock() { } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) }
  };
  vm.createContext(ctx);
  const MODUL = vm.runInContext('(function(){' + kode + '\n})()', ctx, { filename: 'modul.js' });
  return { MODUL, sheets, log, koleksi, props, cache, files, ctx };
}
module.exports = { buatModul };
