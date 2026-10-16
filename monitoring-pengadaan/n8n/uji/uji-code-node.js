// Uji logika Code node n8n dengan data tiruan berbentuk jawaban modul server 1.8.6.
// Jalankan: node monitoring-pengadaan/n8n/uji/uji-code-node.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const SUMBER = path.join(__dirname, '..', 'sumber');
function jalankan(berkas, simpul, input) {
  const $ = nama => { if (!(nama in simpul)) throw new Error('Node belum dijalankan: ' + nama); return { first: () => ({ json: simpul[nama] }) }; };
  const $input = { first: () => ({ json: input }) };
  const fn = new Function('$', '$input', '$execution', fs.readFileSync(path.join(SUMBER, berkas), 'utf8'));
  return fn($, $input, { id: '42' });
}
let lulus = 0; const cek = (nama, f) => { f(); lulus++; console.log('✓', nama); };
const K = { proyek: 'P01', namaProyek: 'Tol Uji Seksi 2', akunAdmin: true, versiModulMinimal: '1.8.6', maksButirPerGrup: 2, urlAplikasi: 'https://contoh/app' };
const vtData = [
  { id: 'TG-001', keputusan: 'BUTUH REVISI', vendor: 'PT Beton <Jaya>', noKontrak: 'SPK/01', teratas: ['KRITIS: Rekening Kwitansi ≠ SPKTV', 'MAYOR: Bank SPKTV'], kedaluwarsa: false },
  { id: 'TG-002', keputusan: 'BUTUH REVISI', vendor: 'CV Alat', teratas: ['MINOR: DPP selisih Rp2'], kedaluwarsa: true },
  { id: 'TG-003', keputusan: 'LOLOS', vendor: 'PT Baja', teratas: [], kedaluwarsa: false },
  { id: 'TG-004', keputusan: 'BUTUH REVISI', vendor: 'PT X', teratas: ['MAYOR: SJ tanpa nomor'] }];
const lengkap = {
  'Konfigurasi': K, 'Ping Server': { ok: true, versiServer: '2.5.1' },
  'Diagnostik Server': { ok: true, modul: { versi: '1.8.6', status: 'AKTIF' } },
  'Ringkasan Verifikasi Tagihan': { ok: true, data: vtData },
  'Ringkasan Kantor AI': { ok: true, ada: true, pada: '2026-10-16T06:00:00.000Z', ringkasan: 'Dua tagihan perlu revisi.', saran: 3, input: 4, draf: 1, eskalasi: 2, aktif: true },
  'Pratinjau Notifikasi': { ok: true, pratinjau: { total: 3, grup: [
    { k: 'kontrak', judul: 'Kontrak berakhir ≤ 30 hari / lewat', item: [{ judul: 'SPK/09 PT A', nilai: 'H-3', ket: 'Berakhir 19 Okt 2026', merah: true }, { judul: 'SPK/10', nilai: 'H-20', ket: '', merah: false }, { judul: 'SPK/11', nilai: 'H-25', merah: false }] },
    { k: 'gudang', judul: 'Bon permintaan belum diterima penuh', item: [] }] } } };

cek('laporan lengkap: tingkat TINGGI, hitungan benar, HTML aman', () => {
  const [{ json: r }] = jalankan('susun-laporan.js', lengkap);
  assert.strictEqual(r.tingkat, 'TINGGI');
  assert.deepStrictEqual([r.log.butuhRevisi, r.log.kritis, r.log.kedaluwarsa, r.log.lolos, r.log.notifMerah, r.log.eskalasiAI], [3, 1, 1, 1, 1, 2]);
  const t = r.pesanTelegram.join('\n');
  assert(t.includes('PT Beton &lt;Jaya&gt;') && !t.includes('<Jaya>'), 'nama vendor di-escape');
  assert(t.includes('+1 lainnya'), 'butir dibatasi maksButirPerGrup');
  assert(t.includes('Eskalasi') && t.includes('Buka aplikasi'));
  assert.strictEqual(r.log.peringatan, ''); assert.strictEqual(r.log.eksekusi, '42');
  assert(r.subjekEmail.startsWith('[TINGGI]'));
});
cek('semua bersih → NORMAL', () => {
  const s = Object.assign({}, lengkap, { 'Ringkasan Verifikasi Tagihan': { ok: true, data: [vtData[2]] }, 'Ringkasan Kantor AI': { ok: true, ada: false, aktif: true }, 'Pratinjau Notifikasi': { ok: true, pratinjau: { total: 0, grup: [] } } });
  const [{ json: r }] = jalankan('susun-laporan.js', s);
  assert.strictEqual(r.tingkat, 'NORMAL'); assert(r.pesanTelegram[0].includes('🟢'));
});
cek('modul lama & aksi gagal → peringatan, laporan tetap jadi', () => {
  const s = Object.assign({}, lengkap, { 'Diagnostik Server': { ok: true, modul: { versi: '1.8.4' } }, 'Ringkasan Kantor AI': { ok: false, error: 'Aksi tidak dikenal: timRingkas' } });
  const [{ json: r }] = jalankan('susun-laporan.js', s);
  assert(/1\.8\.4 lebih lama/.test(r.log.peringatan) && /Kantor AI: Aksi tidak dikenal/.test(r.log.peringatan));
});
cek('akun bukan Admin: node Notifikasi tidak dijalankan, tanpa peringatan', () => {
  const s = Object.assign({}, lengkap, { 'Konfigurasi': Object.assign({}, K, { akunAdmin: false }) }); delete s['Pratinjau Notifikasi'];
  const [{ json: r }] = jalankan('susun-laporan.js', s);
  assert.strictEqual(r.log.peringatan, ''); assert.strictEqual(r.log.notifTotal, 0);
});
cek('pesan panjang dipecah ≤ 3900 karakter', () => {
  const banyak = Array.from({ length: 300 }, (_, i) => ({ id: 'TG-' + i, keputusan: 'BUTUH REVISI', vendor: 'Vendor ' + 'x'.repeat(40), teratas: ['MAYOR: ' + 'y'.repeat(60)] }));
  const s = Object.assign({}, lengkap, { 'Konfigurasi': Object.assign({}, K, { maksButirPerGrup: 200 }), 'Ringkasan Verifikasi Tagihan': { ok: true, data: banyak } });
  const [{ json: r }] = jalankan('susun-laporan.js', s);
  assert(r.pesanTelegram.length >= 1 && r.pesanTelegram.every(p => p.length <= 3900));
});
cek('gerbang login: ok diteruskan', () => { assert.strictEqual(jalankan('cek-login.js', {}, { ok: true, x: 1 })[0].json.x, 1); });
cek('gerbang login: PIN salah → [LOGIN DITOLAK]', () => { assert.throws(() => jalankan('cek-login.js', {}, { ok: false, error: 'Nama atau kata sandi salah.' }), /LOGIN DITOLAK/); });
cek('gerbang login: galat HTTP → [SERVER]', () => { assert.throws(() => jalankan('cek-login.js', {}, { error: { message: 'timeout' } }), /\[SERVER\]/); });
cek('validasi perintah: daftar putih & id', () => {
  assert.strictEqual(jalankan('validasi-perintah.js', {}, { body: { perintah: 'Ringkas' } })[0].json.action, 'vtRingkas');
  assert.strictEqual(jalankan('validasi-perintah.js', {}, { body: { perintah: 'savePBJ' } })[0].json.sah, false);
  assert.strictEqual(jalankan('validasi-perintah.js', {}, { body: { perintah: 'verifikasi', id: 'a"; drop' } })[0].json.kode, 400);
  assert.deepStrictEqual(jalankan('validasi-perintah.js', {}, { body: { perintah: 'verifikasi', id: 'TG-001' } })[0].json.data, { id: 'TG-001' });
});
cek('format galat: login ditandai & di-escape', () => {
  const [{ json: r }] = jalankan('format-galat.js', {}, { workflow: { name: 'Monitoring SAP · 1' }, execution: { lastNodeExecuted: 'Gerbang Login', url: 'https://n8n/x', error: { message: '[LOGIN DITOLAK] <b>PIN</b> salah' } } });
  assert(r.login && r.teks.includes('&lt;b&gt;PIN') && r.teks.includes('Jangan jalankan ulang'));
});
console.log(lulus + ' cek lulus');
