/* =====================================================================
 * 1.8.5 — W. DATA VENDOR WAVE (wave.waskita.co.id › Rekanan Waskita › Master Data › Export)
 * Lapisan referensi TERPISAH (sheet WAVE_Vendor, lintas proyek): Master Data baku & master tambahan TIDAK diubah.
 * Admin mengimpor file ekspor WAVE (.xls); aplikasi memakainya untuk melengkapi kolom yang kosong
 * (alamat, NPWP, telepon, email, PIC, kota), menambah vendor yang belum ada ke pencarian, dan memperingatkan vendor Blacklist.
 * Impor ulang = perbarui snapshot WAVE per ID Vendor (vendor yang tidak ada di file baru tetap disimpan).
 * ===================================================================== */
const WV_SHEET = 'WAVE_Vendor';
const WV_COL = ['ID Vendor', 'BP Number', 'NPWP', 'Nama Vendor', 'Kunci Nama', 'Status Rekanan', 'Bidang Usaha', 'Kualifikasi', 'Kota', 'Status User', 'Diperbarui', 'DATA'];
const WV_MEDAN = { id: 20, bp: 20, npwp: 30, nama: 200, kual: 60, status: 80, bidang: 120, cqsms: 160, email: 160, telp: 60, alamat: 400, negara: 60, prov: 80, kota: 80, skn: 60, industri: 400, pb04: 200, pb06: 300, statusUser: 30, pic: 120, asal: 40 };
const wvKunci = n => s_(n).toLowerCase().replace(/&/g, ' dan ').replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\b(pt|cv|tbk|persero|ud|fa|firma|koperasi|kso|perum|perseroan|terbatas)\b/g, ' ').replace(/\s+/g, '').trim();
function wvBersih(x) {
  x = x || {}; const o = {};
  Object.keys(WV_MEDAN).forEach(k => { let v = s_(x[k]).replace(/\s+/g, ' ').trim(); if (k === 'telp') v = v.replace(/^'+/, '').trim(); if (v === 'null' || v === "'") v = ''; if (v) o[k] = v.slice(0, WV_MEDAN[k]); });
  if (!o.kota && o.alamat) { const p = o.alamat.split(',').map(t => t.trim()); if (p.length >= 3 && p[2] && !/^\d+$/.test(p[2])) o.kota = p[2].slice(0, 80); }
  if (o.bp && !/^\d{5,15}$/.test(o.bp)) delete o.bp;
  return o;
}
function wvBaris() { const sh = ss_().getSheetByName(WV_SHEET); return sh ? baris_(sh) : []; }
const wvMeta = () => jsonProp('WAVE_META', null);
function wvImpor(req, u, P, now) {
  if (!u.admin) throw new Error('Impor data vendor WAVE khusus Admin.');
  const x = req.data || {}, L = Array.isArray(x.baris) ? x.baris : [];
  if (L.length > 1500) throw new Error('Maksimal 1.500 baris per kiriman.');
  const sh = sheet_(WV_SHEET, WV_COL), R = baris_(sh).map(r => r.slice(0, WV_COL.length)), idx = {};
  R.forEach((r, i) => { idx[s_(r[0])] = i; });
  let baru = 0, ubah = 0, sama = 0, lewat = 0; const jadiBlacklist = [];
  L.forEach(z => {
    const o = wvBersih(z); if (!o.id || !o.nama) { lewat++; return; }
    const data = JSON.stringify(o), row = [o.id, o.bp || '', o.npwp || '', o.nama, wvKunci(o.nama), o.status || '', o.bidang || '', o.kual || '', o.kota || '', o.statusUser || '', now, data];
    const i = idx[o.id];
    if (i === undefined) { idx[o.id] = R.length; R.push(row); baru++; return; }
    if (s_(R[i][11]) === data) { sama++; return; }
    if (/blacklist/i.test(o.status || '') && !/blacklist/i.test(s_(R[i][5]))) jadiBlacklist.push(o.nama);
    R[i] = row; ubah++;
  });
  if (baru || ubah) sh.getRange(2, 1, R.length, WV_COL.length).setValues(R.map(r => r.map(v => typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v)));
  const hasil = { ok: true, baru: baru, diperbarui: ubah, sama: sama, dilewati: lewat, total: R.length, jadiBlacklist: jadiBlacklist.slice(0, 50) };
  if (x.akhir) {
    const m = { versi: now, pada: now, oleh: u.nama, berkas: s_(x.berkas).slice(0, 160), jumlah: R.length, ringkas: x.ringkas && typeof x.ringkas === 'object' ? x.ringkas : {} };
    PR_().setProperty('WAVE_META', JSON.stringify(m)); hasil.meta = m;
    catat_(P, { id: 'VENDOR-WAVE', noKontrak: 'impor' }, u, 'IMPOR VENDOR WAVE', s_(x.berkas).slice(0, 120) + ' · ' + R.length + ' vendor tersimpan' + (m.ringkas.baru !== undefined ? ' · baru ' + m.ringkas.baru + ' · diperbarui ' + m.ringkas.diperbarui : ''));
  }
  return hasil;
}
function wvInfo(P, u) {
  const m = wvMeta(), R = wvBaris(), st = {};
  R.forEach(r => { const k = s_(r[5]) || '(kosong)'; st[k] = (st[k] || 0) + 1; });
  return { ok: true, meta: m, jumlah: R.length, status: st, bolehImpor: !!u.admin };
}
function wvDaftar(P, u, x) {   // daftar ringkas untuk aplikasi (di-cache klien per versi impor)
  const m = wvMeta(); x = x || {};
  if (m && x.versi && x.versi === m.versi) return { ok: true, sama: true, versi: m.versi };
  const K = ['id', 'bp', 'npwp', 'nama', 'status', 'bidang', 'kual', 'kota', 'prov', 'alamat', 'telp', 'email', 'pic', 'statusUser', 'cqsms'], ST = [];
  const data = wvBaris().map(r => { let o = {}; try { o = JSON.parse(s_(r[11])); } catch (e) { } const s = o.status || ''; let i = ST.indexOf(s); if (i < 0) { ST.push(s); i = ST.length - 1; } return K.map(k => k === 'status' ? i : o[k] || ''); });
  return { ok: true, versi: m ? m.versi : '', kolom: K, status: ST, data: data };
}
