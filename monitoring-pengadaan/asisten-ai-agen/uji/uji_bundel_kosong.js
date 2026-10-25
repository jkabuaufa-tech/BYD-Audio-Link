// Uji modul 1.9.3: bundel yang "dianggap tidak ada dokumen" — jawaban AI 0 dokumen dicoba ulang (penyedia lain / perintah baca-gambar),
// tidak di-cache, cache kosong lama diabaikan, cadangan lapisan teks PDF, setiap bagian bundel wajib berisi dokumen, baca ulang dengan penyedia lain, prompt hemat token.
const assert = require('assert');
process.env.MODUL_JSON = process.env.MODUL_JSON || __dirname + '/../server-modul-1.9.3.json';
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const { C, K, P, S, NO, ADM, STF } = require('./vt_data.js')();
const folderId = K.folderProyek_(P).getId();

// AI tiruan: Anthropic asli dari vt_data (bisa dipaksa membalas 0 dokumen) + OpenAI (format chat completions)
const asli = C.__jawabHTTP, J = { kosong: { anthropic: 0, openai: 0 }, n: { anthropic: 0, openai: 0 }, teks: [] };
C.__jawabHTTP = (u, o) => {
  const b = JSON.parse(o.payload), oa = /openai/.test(u);
  const pv = oa ? 'openai' : 'anthropic'; J.n[pv]++;
  const isiTeks = oa ? b.messages.map(m => Array.isArray(m.content) ? m.content.map(c => c.text || '').join('') : m.content).join('\n') : b.system + '\n' + b.messages[0].content.map(c => c.text || '').join('');
  J.teks.push(isiTeks);
  if (J.kosong[pv] > 0) { J.kosong[pv]--; S.nPanggil++; const t = JSON.stringify({ dokumen: [] });
    return { kode: 200, teks: oa ? { choices: [{ message: { content: t } }], usage: { prompt_tokens: 900, completion_tokens: 12 } } : { content: [{ type: 'text', text: t }], usage: { input_tokens: 900, output_tokens: 12 } } }; }
  if (!oa) { const r = asli(u, o); r.teks.usage = { input_tokens: 1200, output_tokens: 300 }; return r; }
  S.nPanggil++;
  const f = b.messages[1].content.find(c => c.type === 'file'), isiPdf = Buffer.from(f.file.file_data.split(',')[1], 'base64').toString('latin1'), fid = (/FILE:([\w.-]+)/.exec(isiPdf) || [])[1];
  return { kode: 200, teks: { choices: [{ message: { content: JSON.stringify({ dokumen: C.__ekstrak[fid] || [] }) } }], usage: { prompt_tokens: 1000, completion_tokens: 250 } } };
};

const isi = [{ jenis: 'KWITANSI', judul: 'KWITANSI', halamanMulai: 1, halamanAkhir: 1, nomor: 'KW-01', nilai: { total: 118500000 } },
  { jenis: 'INVOICE', judul: 'INVOICE', halamanMulai: 2, halamanAkhir: 2, nomor: 'INV-01', nilai: { total: 118500000 } },
  { jenis: 'LAINNYA', judul: 'BERITA ACARA PEMAKAIAN ALAT', halamanMulai: 3, halamanAkhir: 4 }];
const berkas = (id, nama, data) => { C.__files[id] = { nama, data: data || 'FILE:' + id, induk: folderId, diubah: 5 }; C.__ekstrak[id] = isi; return { id, idServer: id, nama, lokasi: 'server' }; };
const L = K.bacaKoleksi_(P, 'progres'); L.push({ id: 'TK1', versi: 1, noKontrak: NO.spsa, tagihanKe: 3, nomorBA: '03/BAP/001/SPSA', nilai: 118500000, baTerbit: true }); K.tulisKoleksi_(P, 'progres', L);
const items = {}; K.CL217_TEMPLATES.ALAT.reduce((a, s) => a.concat(s.items), []).forEach(d => { items[d.k] = { status: 'NA', alasan: 'Tidak berlaku untuk paket ini (uji)' }; });
K.cl217SimpanBaris_(P, { id: 'TK1', noKontrak: NO.spsa, kategori: 'ALAT', versi: 1, items, verified: false, diubahOleh: 'uji', diubahPada: '' }, 0);
const eks = () => (C.__sheets[P + '_VerifikasiEkstrak'] || { rows: [] }).rows;

console.log('1. Prompt hemat token');
let r = STF('vtBundel', { data: { id: 'TK1', file: berkas('BK-0', 'Bundel normal.pdf') } }); assert.ok(r.ok, r.error);
ok(/HILANGKAN field bernilai null/.test(J.teks[0]) && /item maksimal 40 baris/.test(J.teks[0]), 'AI diminta menghilangkan field null & membatasi item (jawaban lebih pendek, jarang terpotong)');
ok(r.segmen.length === 3 && r.token && r.token.masuk === 1200 && r.token.keluar === 300, 'pemakaian token dicatat per baca (' + r.token.masuk + ' masuk / ' + r.token.keluar + ' keluar)');
ok(r.segmen[2].jenis === 'BAPA', 'judul "BERITA ACARA PEMAKAIAN ALAT" → BAPA (judul baru 1.9.3)');

console.log('2. AI membalas 0 dokumen → dicoba ulang otomatis, bukan "tidak ada dokumen"');
S.nPanggil = 0; J.kosong.anthropic = 1; J.teks = [];
r = STF('vtBundel', { data: { id: 'TK1', file: berkas('BK-1', 'Bundel scan.pdf') } }); assert.ok(r.ok, r.error);
ok(S.nPanggil === 2 && r.segmen.length === 3, 'jawaban kosong pertama tidak diterima; percobaan kedua → ' + r.segmen.length + ' dokumen');
ok(/TIDAK memuat dokumen apa pun/.test(J.teks[1]) && /hasil pindai/.test(J.teks[1]), 'percobaan ulang memakai perintah baca-gambar hasil pindai');

console.log('3. Semua percobaan 0 dokumen, tanpa lapisan teks → galat jelas, tidak di-cache');
S.nPanggil = 0; J.kosong.anthropic = 9; const nEks = eks().length;
r = STF('vtBundel', { data: { id: 'TK1', file: berkas('BK-2', 'Bundel buram.pdf') } });
ok(!r.ok && /tidak menemukan dokumen apa pun/.test(r.error) && /Admin memilih Google Gemini \(pembaca gambar/.test(r.error) && /150–200 dpi/.test(r.error), 'galat menyebut penyebab & langkah: ' + r.error.slice(0, 110) + '…');
ok(eks().length === nEks && S.nPanggil === 2, 'hasil kosong tidak disimpan ke cache (2 panggilan, lalu berhenti — kuota terjaga)');
J.kosong.anthropic = 0; S.nPanggil = 0;
r = STF('vtBundel', { data: { id: 'TK1', file: { id: 'BK-2', idServer: 'BK-2', nama: 'Bundel buram.pdf', lokasi: 'server' } } }); assert.ok(r.ok, r.error);
ok(!r.cache && S.nPanggil === 1 && r.segmen.length === 3, 'unggah ulang berkas yang sama benar-benar dibaca ulang (bukan cache kosong)');

console.log('4. Cache kosong lama (modul 1.9.2) diabaikan');
const fL = berkas('BK-3', 'Bundel lama.pdf'); assert.ok(STF('vtBundel', { data: { id: 'TK1', file: fL } }).ok);
eks().filter(x => /^BK-3:/.test(x[0])).forEach(x => { x[5] = JSON.stringify({ dokumen: [], provider: 'anthropic' }); });   // seperti tersimpan modul 1.9.2: "0 dokumen"
S.nPanggil = 0; r = STF('vtBundel', { data: { id: 'TK1', file: fL } }); assert.ok(r.ok, r.error);
ok(!r.cache && S.nPanggil === 1 && r.segmen.length === 3, 'hasil "0 dokumen" yang tersimpan modul lama tidak dipakai — dibaca ulang');

console.log('5. Cadangan lapisan teks PDF (pdf.js di aplikasi)');
S.nPanggil = 0; J.kosong.anthropic = 9; J.teks = [];
const PT = [{ h: 1, t: 'KWITANSI No. 07/GMK/2025 Sudah terima dari PT Waskita Karya' }, { h: 2, t: 'Terbilang seratus delapan belas juta' }, { h: 3, t: 'FAKTUR PAJAK Kode dan Nomor Seri 010.000-25.12345678' }, { h: 5, t: 'BERITA ACARA PEMBAYARAN Nomor 03/BAP' }];
r = STF('vtBundel', { data: { id: 'TK1', file: berkas('BK-4', 'Bundel teks.pdf'), petaTeks: [PT] } }); assert.ok(r.ok, r.error);
ok(/PETUNJUK lapisan teks PDF/.test(J.teks[0]) && /hal 3: "FAKTUR PAJAK/.test(J.teks[0]), 'judul per halaman dari lapisan teks dikirim sebagai petunjuk (bukan PDF kedua)');
ok(r.dariTeks && r.segmen.map(z => z.jenis + ' ' + z.halamanMulai + '-' + z.halamanAkhir).join(', ') === 'KWITANSI 1-2, FAKTUR_PAJAK 3-3, BAP 5-5', 'AI tetap 0 dokumen → dipisah menurut judul lapisan teks: ' + r.segmen.map(z => z.nama + ' hal.' + z.halamanMulai).join(', '));
ok(r.segmen.every(z => z.keyakinan <= 0.3) && r.usulan.some(u => u.k === 'UMUM_03'), 'hasil cadangan ditandai keyakinan rendah & tetap mengisi usulan checklist (Kwitansi)');
J.kosong.anthropic = 0;

console.log('6. Bagian lanjutan bundel (hal. > 1) yang kosong: diulang 1×, lalu diterima');
S.nPanggil = 0; J.kosong.anthropic = 9; J.teks = []; const fB = berkas('BK-5', 'Bundel (bagian 2 dari 2, hal. 9-12).pdf');
r = STF('vtBundel', { data: { id: 'TK1', berkas: [{ file: fB, mulai: 9, akhir: 12 }], bacaSaja: true } }); assert.ok(r.ok, r.error);
ok(r.dokumen === 0 && S.nPanggil === 2 && /TIDAK memuat dokumen apa pun/.test(J.teks[1]), 'bagian lanjutan 0 dokumen → diulang 1× dengan perintah baca-gambar, lalu diterima (halaman lanjutan dokumen sebelumnya)');
r = STF('vtBundel', { data: { id: 'TK1', berkas: [{ file: fB, mulai: 9, akhir: 12 }], bacaSaja: true } });
ok(r.ok && r.cache && S.nPanggil === 2, 'disimpan di cache (tidak dibaca ulang saat menyusun peta)');
J.kosong.anthropic = 0;

console.log('7. Penyedia lain sebagai cadangan & baca ulang');
ADM('aiSetel', { data: { bawaanId: 'anthropic', kuota: 200, peran: ['ADMIN', 'PENGADAAN', 'LIHAT'], providers: [{ id: 'anthropic', model: 'claude-sonnet-5-5', aktif: true, kunci: 'sk-ant-api03-uji-0123456789abcdef' }, { id: 'openai', model: 'gpt-uji', aktif: true, kunci: 'sk-proj-uji0123456789abcdefghij' }] } });
S.nPanggil = 0; J.kosong.anthropic = 9; J.n = { anthropic: 0, openai: 0 };
r = STF('vtBundel', { data: { id: 'TK1', file: berkas('BK-6', 'Bundel scan 2.pdf') } }); assert.ok(r.ok, r.error);
ok(J.n.anthropic === 1 && J.n.openai === 1 && r.provider === 'openai' && r.segmen.length === 3, 'Anthropic 0 dokumen → OpenAI dicoba lebih dahulu → 3 dokumen');
J.kosong.anthropic = 0; J.n = { anthropic: 0, openai: 0 };
r = STF('vtBundel', { data: { id: 'TK1', file: { id: 'BK-0', idServer: 'BK-0', nama: 'Bundel normal.pdf', lokasi: 'server' }, paksa: true, provider: 'lain' } }); assert.ok(r.ok, r.error);
ok(J.n.openai === 1 && J.n.anthropic === 0 && r.provider === 'openai', 'Baca ulang "penyedia lain": hasil sebelumnya Anthropic → dibaca OpenAI');

ADM('aiSetel', { data: { bawaanId: 'openai', kuota: 200, peran: ['ADMIN', 'PENGADAAN', 'LIHAT'], providers: [{ id: 'anthropic', model: 'claude-sonnet-5-5', aktif: true, kunci: 'sk-ant-api03-uji-0123456789abcdef' }, { id: 'openai', model: 'gpt-uji', aktif: true, kunci: 'sk-proj-uji0123456789abcdefghij' }] } });
J.n = { anthropic: 0, openai: 0 };
r = STF('vtBundel', { data: { id: 'TK1', berkas: [{ file: fB, mulai: 9, akhir: 12 }], bacaSaja: true } }); assert.ok(r.ok, r.error);
ok(!r.cache && J.n.openai === 1 && r.provider === 'openai' && r.dokumen === 3, 'Admin mengganti penyedia → bagian yang dulu "kosong" (penyedia lama) dibaca ulang otomatis → ' + r.dokumen + ' dokumen');
ADM('aiSetel', { data: { bawaanId: 'anthropic', kuota: 200, peran: ['ADMIN', 'PENGADAAN', 'LIHAT'], providers: [{ id: 'anthropic', model: 'claude-sonnet-5-5', aktif: true, kunci: 'sk-ant-api03-uji-0123456789abcdef' }, { id: 'openai', model: 'gpt-uji', aktif: true, kunci: 'sk-proj-uji0123456789abcdefghij' }] } });

console.log('8. PDF per baris checklist yang dibaca 0 dokumen juga dicoba ulang');
const ck = STF('checklistBaca', { id: 'TK1' }).data, it2 = Object.assign({}, ck.items), fK = berkas('KW-1', 'Kwitansi.pdf'); C.__ekstrak['KW-1'] = [isi[0]];
it2.UMUM_03 = { status: 'ADA', file: fK, tgl: '', ket: 'unggah manual' };
assert.ok(STF('checklistSimpan', { data: { id: 'TK1', versi: ck.versi, items: it2, pengajuan: '', divisi: 'Infrastruktur' } }).ok);
J.kosong.anthropic = 1; J.n = { anthropic: 0, openai: 0 };
r = STF('vtEkstrak', { data: { id: 'TK1', k: 'UMUM_03' } }); assert.ok(r.ok, r.error);
ok(r.hasil.dokumen.length === 1 && r.hasil.dokumen[0].jenis === 'KWITANSI' && J.n.openai === 1, 'Kwitansi terbaca setelah coba ulang otomatis (tidak dianggap kosong)');

console.log('\nLULUS ' + lulus + ' cek bundel 0 dokumen (1.9.3)');
