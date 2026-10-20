// Uji modul 1.8.5: Data Vendor WAVE — impor ekspor WAVE (file asli bila WAVE_XLS diberikan, selain itu contoh sintetis), idempoten, master lama tidak diubah.
const assert = require('assert'), fs = require('fs');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, ADM, STF } = require('./vt_data.js')();
const KOLOM = { 'ID VENDOR': 'id', 'BP NUMBER': 'bp', 'KUALIFIKASI PERUSAHAAN': 'kual', 'NAMA VENDOR': 'nama', 'STATUS REKANAN': 'status', 'BIDANG USAHA': 'bidang', 'CQSMS VENDOR': 'cqsms', 'EMAIL VENDOR': 'email', 'NOMOR TELEPON': 'telp', 'ALAMAT': 'alamat', 'NEGARA': 'negara', 'PROVINSI': 'prov', 'SKN VENDOR': 'skn', 'NPWP VENDOR': 'npwp', 'INDUSTRY KEY': 'industri', 'PB-04': 'pb04', 'NILAI RATA-RATA PB06': 'pb06', 'STATUS USER': 'statusUser', 'NAMA PIC': 'pic', 'ASAL VENDOR': 'asal' };
function baca(teks) {   // = parser klien (tanpa DOM)
  const tr = [...teks.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]), hdr = [...tr[0].matchAll(/<th>([\s\S]*?)<\/th>/g)].map(m => m[1].trim().toUpperCase()), map = hdr.map(h => KOLOM[h] || '');
  const un = s => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  return tr.slice(1).map(r => { const o = {}; [...r.matchAll(/<td>([\s\S]*?)<\/td>/g)].forEach((m, i) => { if (map[i]) o[map[i]] = un(m[1]); }); return o; }).filter(o => o.id && o.nama);
}
const contoh = '<meta charset="utf-8"><table border="1"><tr>' + Object.keys(KOLOM).map(k => '<th>' + k + '</th>').join('') + '</tr>' +
  [['01000', '2100003778', 'PT', 'Mitra Hijau Lestari', 'Rekanan Terseleksi Waskita', 'Supplier Menengah', '', 'mhl@contoh.co.id', "'0711 123", 'Indonesia, Sumatera Selatan, Palembang, Jl. Contoh 1, 01, 30111', 'Indonesia', 'Sumatera Selatan', '', '01.234.567.8-901.000', '', '', '', 'Active', 'Budi', ''],
   ['15087', '2100009806', 'PT', 'ERDA INDAH', 'Rekanan Terdaftar', 'Sub Kontraktor Besar', '', 'erda@contoh.co.id', "'0548 1", 'Indonesia, Kalimantan Timur, Bontang, Jl. Pupuk, 00, 75313', 'Indonesia', 'Kalimantan Timur', '', '03.035.877.4-724.000', '', '', '', 'Active', 'Yuni', ''],
   ['14058', '', 'PT', 'PT. HARMONY PILAR SENTOSA', 'Unverified', 'Supplier Besar', '', 'fina@contoh.co.id', "'0815", 'Indonesia, Jawa Timur, SURABAYA, Jl. Maspion, 02, 60195', 'Indonesia', 'Jawa Timur', '', '75.786.280.0-612.000', '', '', '', 'Active', '', '']]
    .map(r => '<tr>' + r.map(v => '<td>' + v + '</td>').join('') + '</tr>').join('') + '</table>';
const asli = process.env.WAVE_XLS && fs.existsSync(process.env.WAVE_XLS);
const L = baca(asli ? fs.readFileSync(process.env.WAVE_XLS, 'utf8') : contoh);
console.log('1. Impor (' + (asli ? 'file ekspor WAVE asli' : 'contoh sintetis') + ': ' + L.length + ' vendor)');
ok(L.length >= 3 && L.every(o => o.id && o.nama), 'parser membaca ' + L.length + ' baris');
const masterAwal = JSON.stringify(K.bacaKoleksi_ ? (C.__sheets[P + '_MasterCustom'] || { rows: [] }).rows : []);
let r = STF('wvImpor', { data: { baris: L.slice(0, 5) } }); ok(!r.ok && /Admin/.test(r.error), 'impor khusus Admin');
const t0 = Date.now(), PART = 700, n = Math.ceil(L.length / PART), tot = { baru: 0, diperbarui: 0, sama: 0, dilewati: 0 };
for (let i = 0; i < n; i++) { r = ADM('wvImpor', { data: { baris: L.slice(i * PART, (i + 1) * PART), bagian: i + 1, dari: n, berkas: 'list_Master_Data_perusahaan.xls', akhir: i === n - 1, ringkas: i === n - 1 ? tot : undefined } }); assert.ok(r.ok, r.error); ['baru', 'diperbarui', 'sama', 'dilewati'].forEach(k => { tot[k] += r[k]; }); }
ok(tot.baru === L.length && r.total === L.length && r.meta && r.meta.jumlah === L.length, 'tersimpan ' + r.total + ' vendor (' + n + ' kiriman, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' dtk)');
const sh = C.__sheets['WAVE_Vendor']; ok(sh && sh.rows.length === L.length + 1 && sh.rows[0][0] === 'ID Vendor', 'sheet terpisah WAVE_Vendor (lintas proyek)');
const satu = JSON.parse(sh.rows.find(x => x[0] === L[0].id)[11]);
ok(!/^'/.test(satu.telp || '') && (satu.kota || '').length > 0, 'telepon dibersihkan dari tanda kutip, kota diambil dari alamat (' + satu.kota + ')');
console.log('2. Impor ulang file yang sama → idempoten');
let t2 = { baru: 0, diperbarui: 0, sama: 0 }; for (let i = 0; i < n; i++) { r = ADM('wvImpor', { data: { baris: L.slice(i * PART, (i + 1) * PART), akhir: i === n - 1 } }); ['baru', 'diperbarui', 'sama'].forEach(k => { t2[k] += r[k]; }); }
ok(t2.baru === 0 && t2.diperbarui === 0 && t2.sama === L.length && sh.rows.length === L.length + 1, 'tanpa duplikat: ' + t2.sama + ' sama');
console.log('3. Perubahan status di WAVE (mis. menjadi Blacklist) & vendor lama dipertahankan');
const ub = Object.assign({}, L[1], { status: 'Blacklist' }); r = ADM('wvImpor', { data: { baris: [ub], akhir: true } });
ok(r.diperbarui === 1 && r.jadiBlacklist[0] === ub.nama && sh.rows.length === L.length + 1, 'status berubah → diperbarui & dilaporkan "kini Blacklist"; vendor yang tidak ada di file tetap tersimpan');
console.log('4. Daftar untuk aplikasi (ber-versi, di-cache klien)');
r = STF('wvInfo'); ok(r.ok && r.jumlah === L.length && r.meta && !r.bolehImpor && r.status.Blacklist >= 1, 'wvInfo: jumlah, status, waktu impor (Staf tidak boleh impor)');
r = STF('wvDaftar', { data: {} }); const v = r.versi; ok(r.ok && r.data.length === L.length && r.kolom.indexOf('alamat') >= 0 && r.status.length >= 1, 'wvDaftar: ' + r.data.length + ' baris ringkas · ' + (JSON.stringify(r).length / 1024).toFixed(0) + ' KB');
r = STF('wvDaftar', { data: { versi: v } }); ok(r.sama === true && !r.data, 'versi sama → tidak dikirim ulang (hemat kuota)');
console.log('5. Data lama tidak diubah');
ok(JSON.stringify((C.__sheets[P + '_MasterCustom'] || { rows: [] }).rows) === masterAwal, 'master tambahan proyek tidak tersentuh');
ok(K.bacaLog_(P).some(l => l.aksi === 'IMPOR VENDOR WAVE'), 'impor tercatat di Log');
console.log('\nLULUS ' + lulus + ' cek');
