// Harness uji: Code.gs asli + modul 1.5.x di Node dengan tiruan layanan Google
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const KODE_GS = process.env.KODE_GS;   // path Code_2.5.1_Monitoring_Pengadaan.gs
function buatKonteks() {
  const sheets = {};
  const strip = v => (typeof v === 'string' && v[0] === "'") ? v.slice(1) : v;
  function Sheet(nama) { this.nama = nama; this.rows = []; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows.reduce((m, r) => Math.max(m, r.length), 0); };
  Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(strip)); return this; };
  Sheet.prototype.setFrozenRows = function () { };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    const sh = this; nr = nr || 1; nc = nc || 1;
    const rg = {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
      setValues(v) { for (let i = 0; i < nr; i++) { while (sh.rows.length < r + i) sh.rows.push([]); const row = sh.rows[r - 1 + i]; for (let j = 0; j < nc; j++) row[c - 1 + j] = strip(v[i][j]); } return rg; },
      clearContent() { for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; } while (sh.rows.length > 1 && sh.rows[sh.rows.length - 1].every(x => x === '')) sh.rows.pop(); return rg; },
      setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }
    };
    return rg;
  };
  const SS = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)), getSheets: () => Object.values(sheets), getUrl: () => 'mem://', deleteSheet() { } };
  const props = {}, cache = {}, drive = {}, http = [];
  const ctx = {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error, encodeURIComponent, isFinite, parseInt,
    SpreadsheetApp: { getActiveSpreadsheet: () => SS, flush() { } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.hasOwnProperty(k) ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.hasOwnProperty(k) ? cache[k] : null, put: (k, v) => { cache[k] = String(v); }, putAll: o => Object.assign(cache, o), getAll: ks => { const o = {}; ks.forEach(k => { if (cache.hasOwnProperty(k)) o[k] = cache[k]; }); return o; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() { }, tryLock: () => true, hasLock: () => true, releaseLock() { } }) },
    Utilities: {
      formatDate: (d, tz, f) => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
        return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute); },
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (a, v) => [...crypto.createHash('sha256').update(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v)).digest()].map(b => b > 127 ? b - 256 : b),
      sleep: () => { }, getUuid: () => crypto.randomUUID(), base64Encode: b => Buffer.from(b).toString('base64'), newBlob: (s) => ({ teks: String(s), getBytes: () => [...Buffer.from(String(s))] })
    },
    DriveApp: (() => { let n = 0; const folders = {};
      const folder = (id, nama) => { if (folders[id]) return folders[id]; const f = { id, nama, anak: {}, getId: () => id, getUrl: () => 'drive://' + id,
        getFoldersByName: nm => { const x = f.anak[nm]; return { hasNext: () => !!x, next: () => x }; }, createFolder: nm => (f.anak[nm] = folder('F' + (++n), nm)),
        getFiles: () => { const L = Object.keys(ctx.__files).filter(k => ctx.__files[k].induk === id).map(k => berkas(k)); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; },
        createFile: blob => { const fid = 'D' + (++n); drive[fid] = blob.teks; return { getId: () => fid }; } }; return (folders[id] = f); };
      const berkas = id => { const b = ctx.__files[id]; return { getId: () => id, getName: () => b.nama, getSize: () => b.data.length, getMimeType: () => 'application/pdf', getLastUpdated: () => new Date(b.diubah || 0),
        getParents: () => { let i = 0; return { hasNext: () => i < 1, next: () => (i++, folder(b.induk)) }; }, getBlob: () => ({ getBytes: () => [...Buffer.from(b.data, b.biner ? 'latin1' : 'utf8')], getDataAsString: () => b.data, getContentType: () => 'application/pdf' }), isTrashed: () => false, getUrl: () => 'drive://' + id }; };
      return { getFileById: id => { if (ctx.__files[id]) return berkas(id); if (!drive[id]) throw new Error('tidak ada'); return { getBlob: () => ({ getDataAsString: () => drive[id] }) }; },
        getFolderById: id => folder(id), createFolder: nm => folder('F' + (++n), nm) }; })(),
    UrlFetchApp: { fetch: (url, o) => { const r = ctx.__jawabHTTP(url, o); http.push({ url, o }); return { getResponseCode: () => r.kode, getContentText: () => typeof r.teks === 'string' ? r.teks : JSON.stringify(r.teks) }; } },
    ContentService: { createTextOutput: t => ({ setMimeType() { return t; } }), MimeType: { JSON: 1 } },
    Logger: { log() { } }, MailApp: {}, ScriptApp: {},
    __files: {}, __sheets: sheets, __props: props, __cache: cache, __drive: drive, __http: http, __jawabHTTP: () => ({ kode: 500, teks: '{}' })
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(KODE_GS, 'utf8') + '\n;this.__k={proses_,folderProyek_,cl217SimpanBaris_,CL217_TEMPLATES,tulisPengguna_,tulisProyek_,tulisKoleksi_,tulisPBJ_,bacaPBJ_,bacaKoleksi_,PROYEK_AWAL,bacaLog_,doPost,modulReset_};', ctx, { filename: 'code.gs' });
  return ctx;
}
module.exports = { buatKonteks };
