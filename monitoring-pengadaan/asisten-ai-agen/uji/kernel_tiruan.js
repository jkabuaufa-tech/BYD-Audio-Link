// Tiruan kernel ringan untuk menjalankan Modul server LENGKAP di Node (Sheets/Lock/Cache di memori; fungsi kernel lain → tiruan kosong).
// Dipakai uji/uji_tanggal_bapm.js dan alat/audit-tanggal-bapm.js (audit offline dari ekspor Spreadsheet — tidak pernah menulis ke Google).
const fs = require('fs');
function buat(berkasModul, opsi) {
  opsi = opsi || {};
  const SH = {}, KOL = { progres: [], permintaan: [], data: [] }, LOG = [], P = opsi.proyek || 'P1';
  function lembar(nama) {
    const rows = [];
    return SH[nama] = { rows, getLastRow: () => rows.length + 1, appendRow: v => rows.push(v.slice()),
      getRange: (r, c, nr, nc) => ({ getValues: () => rows.slice(r - 2, r - 2 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1))),
        setValues: V => V.forEach((v, i) => { const t = rows[r - 2 + i] || (rows[r - 2 + i] = []); v.forEach((z, j) => { t[c - 1 + j] = z; }); }) }) };
  }
  let nId = 0;
  const K = {
    s_: v => String(v == null ? '' : v),
    ss_: () => ({ getSheetByName: n => SH[n] || null }),
    sheet_: n => SH[n] || lembar(n),
    baris_: sh => sh.rows,
    bacaKoleksi_: (p, j) => JSON.parse(JSON.stringify(KOL[j] || [])),
    tulisKoleksi_: (p, j, L) => { KOL[j] = JSON.parse(JSON.stringify(L)); },
    catat_: (p, r, u, aksi, det) => LOG.push({ aksi, det, oleh: u.nama }),
    tglValid_: t => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(t || '').trim()); return m && !isNaN(Date.parse(m[0])) ? m[0] : ''; },
    hariIniISO_: () => opsi.hariIni || new Date().toISOString().slice(0, 10),
    idBaru_: p => p + 'X' + (++nId),
    bulat4_: x => Math.round((Number(x) || 0) * 1e4) / 1e4,
    LockService: { getScriptLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock: () => { } }) },
    CacheService: { getScriptCache: () => ({ get: k => /^GDF\|/.test(k) ? JSON.stringify({ P, ref: { idServer: k.slice(4), nama: k.slice(4) + '.jpg', ukuran: 1000, tipe: 'image/jpeg', url: 'https://drive/' + k.slice(4) } }) : null, put: () => { }, getAll: () => ({}) }) },
    refBerkas_: x => x && (x.idServer ? x : { idServer: x.id || x }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => { }, getProperties: () => ({}) }) },
    KERNEL: { versi: '2.5.1', kaitTersedia: [] }, VERSI_SERVER: 'tiruan'
  };
  const kosong = new Proxy(function () { }, { get: (t, p) => p === Symbol.toPrimitive ? () => '' : kosong, apply: () => undefined });
  const lingkup = new Proxy(K, { has: (t, p) => typeof p === 'string' && !(p in globalThis), get: (t, p) => p === Symbol.unscopables ? undefined : p in t ? t[p] : kosong });
  const kode = JSON.parse(fs.readFileSync(berkasModul, 'utf8')).kode;
  const MODUL = new Function('__L', 'with (__L) { return (function () {\n' + kode + '\n})(); }')(lingkup);
  return { MODUL, SH, KOL, LOG, lembar, P };
}
module.exports = { buat };
