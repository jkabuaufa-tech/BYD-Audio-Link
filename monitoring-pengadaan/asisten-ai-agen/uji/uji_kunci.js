// Uji modul 1.8.2: API key ditolak (401) — pembersihan karakter tak terlihat, key lama cadangan, sidik di pesan, diagnosa langsung.
const assert = require('assert');
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, S, NO, ADM, STF } = require('./vt_data.js')();
const folderId = K.folderProyek_(P).getId(), props = C.__props;
const BENAR = 'sk-ant-api03-BENARbenar0123456789xyzAbCd', bacaPdf = C.__jawabHTTP;
let kunciDipakai = [];
C.__jawabHTTP = (u, o) => {   // Anthropic tiruan: hanya BENAR yang diterima; GET /models untuk diagnosa
  const h = o.headers || {}, k = h['x-api-key'];
  if (/api\.anthropic\.com/.test(u)) { kunciDipakai.push(k);
    if (k !== BENAR) return { kode: 401, teks: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } };
    if (/\/models/.test(u)) return { kode: 200, teks: { data: [{ id: 'claude-sonnet-5-5' }] } };
    return bacaPdf(u, o); }
  if (/groq/.test(u)) return { kode: 401, teks: { error: { message: 'Invalid API Key' } } };
  return { kode: 404, teks: '{}' };
};
C.__files['BUN-K'] = { nama: 'Bundel K.pdf', data: 'FILE:BUN-K', induk: folderId, diubah: 1 }; C.__ekstrak['BUN-K'] = C.__ekstrak['TSPSA-UMUM_03'].map(d => Object.assign({}, d, { halamanMulai: 1, halamanAkhir: 1 }));
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TK', versi: 1, noKontrak: NO.spsa, tagihanKe: 7, nomorBA: '07/BAP/SPSA', nilai: 1, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
const items = {}; K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []).forEach(x => { items[x.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'TK', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
let n = 0; const bundel = () => { const id = 'BUN-K' + (++n); C.__files[id] = Object.assign({}, C.__files['BUN-K'], { data: 'FILE:BUN-K', diubah: n + 10 }); return STF('vtBundel', { data: { id: 'TK', file: { id, idServer: id, nama: 'Bundel K.pdf', lokasi: 'server' } } }); };

console.log('1. Key dengan karakter tak terlihat hasil salin');
props.AI_KEY_ANTHROPIC = '​' + BENAR + ' \n'; props.AI_KEY_CLAUDE = props.AI_KEY_ANTHROPIC;
let r = bundel(); ok(r.ok && kunciDipakai.slice(-1)[0] === BENAR, 'zero-width/NBSP/enter dibuang saat dipakai → key diterima, bundel berhasil');
r = ADM('aiSetel', { data: { kunciClaude: ' ' + BENAR + '​ ' } });
ok(r.ok && props.AI_KEY_ANTHROPIC === BENAR && props.AI_KEY_CLAUDE === BENAR, 'disimpan bersih di kedua nama properti');

console.log('2. Key baru salah, key lama benar → dipulihkan otomatis');
props.AI_KEY_ANTHROPIC = 'sk-ant-api03-LAMAsalah0000000000000Wxyz'; props.AI_KEY_CLAUDE = BENAR; kunciDipakai = [];
r = bundel(); ok(r.ok && kunciDipakai[0] !== BENAR && kunciDipakai.indexOf(BENAR) > 0, '401 → key nama lama yang berbeda dicoba otomatis → berhasil');
ok(props.AI_KEY_ANTHROPIC === BENAR, 'key yang berhasil dipakai permanen');

console.log('3. Semua key ditolak → pesan jelas + sidik key');
props.AI_KEY_ANTHROPIC = props.AI_KEY_CLAUDE = 'sk-ant-api03-DIHAPUSkonsol99999999999QrSt';
r = bundel(); ok(!r.ok && /sk-ant-api03-…QrSt/.test(r.error) && /bukan galat bundel/.test(r.error) && /Diagnosa & ganti API key/.test(r.error), 'pesan menyebut sidik key tersimpan & langkah Diagnosa: ' + r.error.slice(0, 120));
ok(JSON.parse(props.AI_KEY_TOLAK_ANTHROPIC).sidik === 'sk-ant-api03-…QrSt', 'sidik key yang ditolak dicatat');

console.log('4. Diagnosa langsung (Admin) & ganti key');
r = STF('aiDiagKunci'); ok(!r.ok && /Admin/.test(r.error), 'diagnosa khusus Admin');
const h0 = C.__http.length; r = ADM('aiDiagKunci'); const A = r.data.find(x => x.id === 'anthropic'), G = r.data.find(x => x.id === 'groq');
ok(r.ok && !r.pdfOk && A.kode === 401 && /DITOLAK/.test(A.sebab) && A.kunci.sidik === 'sk-ant-api03-…QrSt' && G && !G.ok, 'uji GET /models: Anthropic 401 DITOLAK + sidik key, Groq gagal');
ok(C.__http.length - h0 === 2 && !C.__http.slice(h0).some(h => /messages|chat\/completions/.test(h.url)), 'diagnosa tanpa panggilan pesan (tanpa biaya token)');
r = ADM('aiSetel', { data: { kunciClaude: BENAR } }); assert.ok(r.ok, r.error);
r = ADM('aiDiagKunci'); ok(r.pdfOk && r.data.find(x => x.id === 'anthropic').ok && !props.AI_KEY_TOLAK_ANTHROPIC, 'setelah key baru: DITERIMA, catatan tolak dihapus');
r = bundel(); ok(r.ok, 'unggah ulang bundel berhasil');
ok(K.bacaLog_(P).some(l => l.aksi === 'DIAGNOSA API KEY'), 'diagnosa tercatat di Log');
console.log('\nLULUS ' + lulus + ' cek');
