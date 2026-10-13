/* Tiruan layanan Google Apps Script (Spreadsheet, Properti, Cache, Kunci, Utilitas, Drive, UrlFetch) — semuanya di memori browser */
var DEMO = { sheets: {}, props: {}, cache: {}, drive: {}, http: [], skenario: 'normal' };
(function () {
  var strip = function (v) { return (typeof v === 'string' && v[0] === "'") ? v.slice(1) : v; };
  function Sheet(nama) { this.nama = nama; this.rows = []; }
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0); };
  Sheet.prototype.appendRow = function (v) { this.rows.push(v.map(strip)); return this; };
  Sheet.prototype.setFrozenRows = function () { };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    var sh = this; nr = nr || 1; nc = nc || 1;
    var rg = {
      getValues: function () { var out = []; for (var i = 0; i < nr; i++) { var row = sh.rows[r - 1 + i] || [], o = []; for (var j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
      setValues: function (v) { for (var i = 0; i < nr; i++) { while (sh.rows.length < r + i) sh.rows.push([]); var row = sh.rows[r - 1 + i]; for (var j = 0; j < nc; j++) row[c - 1 + j] = strip(v[i][j]); } return rg; },
      clearContent: function () { for (var i = 0; i < nr; i++) { var row = sh.rows[r - 1 + i]; if (row) for (var j = 0; j < nc; j++) row[c - 1 + j] = ''; } while (sh.rows.length > 1 && sh.rows[sh.rows.length - 1].every(function (x) { return x === ''; })) sh.rows.pop(); return rg; },
      setFontWeight: function () { return rg; }, setBackground: function () { return rg; }, setFontColor: function () { return rg; }
    };
    return rg;
  };
  var SS = { getSheetByName: function (n) { return DEMO.sheets[n] || null; }, insertSheet: function (n) { return (DEMO.sheets[n] = new Sheet(n)); }, getSheets: function () { return Object.values(DEMO.sheets); }, getUrl: function () { return 'demo://'; }, deleteSheet: function () { } };
  window.SpreadsheetApp = { getActiveSpreadsheet: function () { return SS; }, flush: function () { } };
  var P = { getProperty: function (k) { return DEMO.props.hasOwnProperty(k) ? DEMO.props[k] : null; }, setProperty: function (k, v) { DEMO.props[k] = String(v); }, deleteProperty: function (k) { delete DEMO.props[k]; }, getProperties: function () { return Object.assign({}, DEMO.props); } };
  window.PropertiesService = { getScriptProperties: function () { return P; } };
  var C = { get: function (k) { return DEMO.cache.hasOwnProperty(k) ? DEMO.cache[k] : null; }, put: function (k, v) { DEMO.cache[k] = String(v); }, putAll: function (o) { Object.assign(DEMO.cache, o); },
    getAll: function (ks) { var o = {}; ks.forEach(function (k) { if (DEMO.cache.hasOwnProperty(k)) o[k] = DEMO.cache[k]; }); return o; }, remove: function (k) { delete DEMO.cache[k]; } };
  window.CacheService = { getScriptCache: function () { return C; } };
  window.LockService = { getScriptLock: function () { return { waitLock: function () { }, tryLock: function () { return true; }, hasLock: function () { return true; }, releaseLock: function () { } }; } };
  var fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  window.Utilities = {
    formatDate: function (d, tz, f) { var p = {}; fmt.formatToParts(d).forEach(function (x) { p[x.type] = x.value; }); return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute); },
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: function () { return new Array(32).fill(0); },
    getUuid: function () { try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(16) + Math.random().toString(16).slice(2); } },
    newBlob: function (s) { return { teks: String(s), getBytes: function () { return []; } }; }, sleep: function () { }, base64Encode: function () { return ''; }
  };
  window.DriveApp = { getFileById: function (id) { if (!DEMO.drive[id]) throw new Error('Berkas tidak ada (demo).'); return { getBlob: function () { return { getDataAsString: function () { return DEMO.drive[id]; } }; } }; } };
  window.UrlFetchApp = { fetch: function (url, o) { var r = window.demoLLM(url, o); DEMO.http.push({ url: url, kode: r.kode }); return { getResponseCode: function () { return r.kode; }, getContentText: function () { return typeof r.teks === 'string' ? r.teks : JSON.stringify(r.teks); } }; } };
  window.ContentService = { createTextOutput: function (t) { return { setMimeType: function () { return t; } }; }, MimeType: { JSON: 1 } };
  window.Logger = { log: function () { } }; window.MailApp = {}; window.ScriptApp = {};
})();
