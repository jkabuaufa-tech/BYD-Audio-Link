// Validasi mesin rumus XLH: hitung ulang SEMUA sel rumus sebuah .xlsx lalu bandingkan dengan nilai tersimpan Excel di berkas itu.
//   node uji/cek_hitung_xlsx.js <berkas.xlsx> [sheet1|sheet2 …]   → ringkasan cocok/beda per sheet, contoh perbedaan
const fs = require('fs'); const XLH = require('../sumber/xlsx-hitung.js');
(async () => {
  const W = await XLH.muat(new Uint8Array(fs.readFileSync(process.argv[2])));
  const pilih = process.argv[3] ? process.argv[3].split('|') : null;
  const asli = new Map(); W.sheets.forEach(s => { const m = new Map(); s.sel.forEach((o, k) => { if (o.f !== undefined) m.set(k, o.v === undefined ? null : o.v); }); asli.set(s.nama, m); });
  const t0 = Date.now(), { hasil } = XLH.hitungSemua(W, s => !pilih || pilih.includes(s.nama));
  let tot = 0, beda = 0; const contoh = [];
  const sama = (a, b) => { if (a === null || a === undefined) a = ''; if (b === null || b === undefined) b = ''; if (XLH.isErr(a) || XLH.isErr(b)) return XLH.isErr(a) && XLH.isErr(b) && a.err === b.err; if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)); if (typeof b === 'boolean') return a === b; if (a === 0 && b === '') return true; return String(a) === String(b); };
  hasil.forEach((H, sh) => { let n = 0, b = 0; H.forEach((v, k) => { n++; const e = asli.get(sh).get(k); if (!sama(v, e)) { b++; if (contoh.length < 60) contoh.push(sh + '!' + k + '  hitung=' + JSON.stringify(v) + '  excel=' + JSON.stringify(e) + '  f=' + (W.byNama[sh.toUpperCase()].sel.get(k).f || '(bersama)').slice(0, 90)); } }); tot += n; beda += b; console.log((b ? '✗ ' : '✓ ') + sh + ': ' + (n - b) + '/' + n + ' cocok'); });
  console.log('\n' + contoh.join('\n'));
  console.log('\nTOTAL ' + (tot - beda) + '/' + tot + ' sel rumus cocok dengan nilai Excel (' + (Date.now() - t0) + ' ms)');
  process.exit(beda ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
