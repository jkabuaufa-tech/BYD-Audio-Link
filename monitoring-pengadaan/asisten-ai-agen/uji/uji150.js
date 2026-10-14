const { buatKonteks } = require('./harness.js');
const fs = require('fs'), assert = require('assert');
const C = buatKonteks(), K = C.__k;
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
// --- data awal
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }, { nama: 'Staf Pengadaan', peran: 'PENGADAAN', pin: '1111', aktif: true, proyek: '*' }, { nama: 'Kepala Proyek', peran: 'LIHAT', pin: '0000', aktif: true, proyek: '*' }]);
K.tulisProyek_([K.PROYEK_AWAL]);
const P = K.PROYEK_AWAL.id;
K.tulisKoleksi_(P, 'data', [{ id: 'R1', noKontrak: 'WK-NK.KSO/PDBJ/SPM/001/2026', namaVendor: 'PT Baja Jaya', nilai: 500000000, items: [{ kode: 'M1', uraian: 'Besi', vol: 10, harga: 1000, wbs: '' }], noPR: '1001' },
  { id: 'R2', noKontrak: 'WK-NK.KSO/PDBJ/SPK/002/2026', namaVendor: 'CV Beton', nilai: 90000000, items: [], noPR: '1', noRFQ: '2', noPO: '3', top: '30 hari' }]);
K.tulisKoleksi_(P, 'progres', [{ id: 'T1', versi: 1, noKontrak: 'WK-NK.KSO/PDBJ/SPM/001/2026', tagihanKe: 1, nomorBA: 'BA-001', periode: 'Sep 2026', periodeKey: 202609, nilai: 100000000, baTerbit: true, diubahOleh: 'x' }]);
K.tulisKoleksi_(P, 'permintaan', [{ id: 'B1', nomor: 'BON-01', tanggal: '2026-09-01', departemen: 'Gudang', items: [{ kode: 'M1', uraian: 'Besi D13', vol: 100, sat: 'btg', harga: 90000 }, { kode: 'M2', uraian: 'Semen', vol: 50, sat: 'zak', harga: 60000 }] }]);
// pasang modul 1.7.2 lewat kernel
const paket = JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.8.2.json', 'utf8'));
const kirim = (nama, pin, action, extra) => { const r = K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, nama, pin, proyek: P }, extra || {})) } }); return JSON.parse(r); };
const ADM = (a, e) => kirim('Joko Supriyono', '1234', a, e), STF = (a, e) => kirim('Staf Pengadaan', '1111', a, e), LHT = (a, e) => kirim('Kepala Proyek', '0000', a, e);
const jawabOpenAI = isi => ({ kode: 200, teks: { model: 'gpt-5-mini', choices: [{ message: { content: isi }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5 } } });

console.log('0. unggah & terbitkan modul lewat kernel (validasi aksi inti)');
let r0 = ADM('modulUnggah', { data: paket }); ok(r0.ok && r0.kandidat.versi === '1.8.2', 'modulUnggah 1.8.2 diterima kernel 2.5');
r0 = STF('modulTerbit', { versi: '1.8.2', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis node harness' }); ok(!r0.ok, 'non-penerbit tidak bisa menerbitkan');
r0 = ADM('modulTerbit', { versi: '1.8.2', konfirmasi: 'LULUS UJI', catatanUji: 'uji otomatis node harness' }); ok(r0.ok, 'modulTerbit 1.5.0');
const jahat = JSON.parse(JSON.stringify(paket)); jahat.versi = '1.8.3'; jahat.kode = jahat.kode.replace('const aksi = {', 'const aksi = {\n  simpanPengguna: () => ({ ok: true }),');
r0 = ADM('modulUnggah', { data: jahat }); ok(!r0.ok && /aksi inti/.test(r0.error), 'kernel tetap menolak modul yang mengganti aksi inti');
console.log('1. ping & info');
let r = ADM('aiInfo'); ok(r.ok && r.versiAI === '1.8.2', 'aiInfo 1.8.2 ok');
ok(r.siap.claude === false && r.siap.gemini === false && 'claude' in r.siap, 'siap.claude/siap.gemini tetap ada');
ok(r.admin.providers.length === 6 && r.admin.providers.map(p => p.id).join() === 'anthropic,google,openai,deepseek,groq,openrouter', '6 penyedia bawaan');
ok(r.perintah.length === 5 && r.perintah.some(p => p.id === 'verifikasi-tagihan') && r.agen.aksiTulis.includes('savePBJ'), 'perintah cepat (5, termasuk verifikasi tagihan) & daftar aksi');

console.log('2. setelan multi-penyedia');
r = ADM('aiSetel', { data: { bawaanId: 'openai', kuota: 50, maksToken: 2048, peran: ['ADMIN', 'PENGADAAN', 'LIHAT'], providers: [
  { id: 'openai', model: 'gpt-5-mini', aktif: true, kunci: 'sk-test-0123456789abcdef' },
  { id: 'anthropic', model: 'claude-sonnet-5-5', aktif: true, kunci: 'sk-ant-0123456789abcdefgh' },
  { id: 'groq', model: 'llama-3.3-70b-versatile', aktif: true, kunci: 'gsk_0123456789abcdefghij' },
  { id: 'lokal', nama: 'LLM Lokal', baseURL: 'https://llm.contoh.id/v1/chat/completions', model: 'qwen3:32b', aktif: true, kunci: 'kunci-lokal-0123456789' }] } });
ok(r.ok && r.bawaanId === 'openai' && r.siap.openai && r.siap.claude && r.siap.lokal, 'penyedia tersimpan & siap');
ok(C.__props.AI_KEY_OPENAI && C.__props.AI_KEY_ANTHROPIC === C.__props.AI_KEY_CLAUDE, 'kunci AI_KEY_<PROVIDER> + alias lama (rollback aman)');
const set = JSON.parse(C.__props.AI_SET); ok(set.claude.model === 'claude-sonnet-5-5' && set.gemini.model && set.providers.openai.aktif, 'field lama AI_SET tetap ada');
ok(!JSON.stringify(r).includes('0123456789abcdef'), 'API key tidak bocor ke respons');
r = ADM('aiSetel', { data: { providers: [{ id: 'jahat', model: 'x1', baseURL: 'http://evil' }] } }); ok(!r.ok && /https/.test(r.error), 'baseURL non-https ditolak');
r = ADM('aiSetel', { data: { providers: [{ id: 'Bad Id!', model: 'x1' }] } }); ok(!r.ok, 'ID penyedia tidak valid ditolak');
r = STF('aiSetel', { data: { bawaan: 'gemini' } }); ok(!r.ok && /Admin/.test(r.error), 'non-Admin tidak bisa ubah setelan');
r = ADM('aiSetel', { data: { modelClaude: 'claude-haiku-5-5', bawaan: 'claude', kuota: 50, maksToken: 2048, peran: ['ADMIN', 'PENGADAAN', 'LIHAT'] } });
ok(r.ok && r.model.anthropic === 'claude-haiku-5-5' && r.bawaan === 'claude' && r.bawaanId === 'anthropic', 'form lama 2.2.7 tetap berfungsi');
ADM('aiSetel', { data: { bawaanId: 'openai' } });

console.log('3. agen — aksi baca otomatis');
let n = 0; C.__jawabHTTP = (url, o) => { n++; const b = JSON.parse(o.payload);
  assert.ok(url === 'https://api.openai.com/v1/chat/completions' && o.headers.Authorization.startsWith('Bearer ') && b.max_completion_tokens && b.messages[0].role === 'system');
  return n === 1 ? jawabOpenAI('{"aksi":"bacaSemua","arg":{"koleksi":"list"},"alasan":"cek register"}') : jawabOpenAI('Ada 2 kontrak di register.'); };
r = STF('aiTanya', { data: { agen: true, pesan: [{ role: 'user', teks: 'Berapa kontrak?' }] } });
ok(r.ok && r.teks === 'Ada 2 kontrak di register.' && r.langkah.length === 1 && r.langkah[0].ok && r.providerId === 'openai', 'aksi baca dijalankan lalu jawaban akhir');
const hasilKe2 = JSON.parse(C.__http[C.__http.length - 1].o.payload).messages.slice(-1)[0].content;
ok(/HASIL AKSI bacaSemua/.test(hasilKe2) && /PT Baja Jaya/.test(hasilKe2), 'hasil aksi dikirim ke model');
let log = K.bacaLog_(P).filter(l => l.aksi === 'AI-AKSI'); ok(log.length === 1 && /BACA · bacaSemua/.test(log[0].detail), 'log AI-AKSI tercatat');

console.log('4. agen — aksi tulis menjadi usulan (tanpa eksekusi)');
C.__jawabHTTP = () => jawabOpenAI('```json\n{"aksi":"savePBJ","arg":{"nama":"Paket Besi Uji","noPR":"5001","state":{"besar":1}},"alasan":"Bon besi belum dipaketkan"}\n```');
r = STF('aiTanya', { data: { agen: true, pesan: [{ role: 'user', teks: 'Buat paket PBJ besi' }] } });
ok(r.ok && r.usulan && r.usulan.aksi === 'savePBJ' && r.usulan.pratinjau.siap && /PBJ BARU/.test(r.usulan.pratinjau.ringkas) && r.usulan.token, 'usulan + pratinjau dry-run');
ok(!('state' in r.usulan.arg), 'arg savePBJ dibersihkan (tanpa state)');
ok(K.bacaPBJ_(P).length === 0, 'belum ada data tertulis sebelum Terapkan');
const tok = r.usulan.token;
r = LHT('aiTerapkan', { data: { token: tok } }); ok(!r.ok, 'pengguna lain/LIHAT tidak bisa menerapkan token');
r = STF('aiTerapkan', { data: { token: tok, dryRun: true } }); ok(r.ok && r.pratinjau.siap, 'dry-run ulang');
r = STF('aiTerapkan', { data: { token: tok } }); ok(r.ok && r.status === 'diterapkan' && K.bacaPBJ_(P).length === 1 && K.bacaPBJ_(P)[0].nama === 'Paket Besi Uji', 'Terapkan → PBJ tertulis via kernel');
r = STF('aiTerapkan', { data: { token: tok } }); ok(!r.ok && /kedaluwarsa|diproses/.test(r.error), 'token sekali pakai');
log = K.bacaLog_(P); ok(log.some(l => l.aksi === 'AI-AKSI' && /TERAPKAN · savePBJ/.test(l.detail)) && log.some(l => l.aksi === 'PBJ BARU'), 'log AI-AKSI TERAPKAN + log kernel PBJ BARU');

console.log('5. peran LIHAT: usulan tanpa tombol Terapkan');
C.__jawabHTTP = () => jawabOpenAI('{"aksi":"keuanganProgres","arg":{"id":"T1","versi":1,"bayar":{"status":"DIAJUKAN","tglAju":"2026-10-01"}},"alasan":"ajukan"}');
r = LHT('aiTanya', { data: { agen: true, pesan: [{ role: 'user', teks: 'ajukan bayar' }] } });
ok(r.ok && r.usulan && r.usulan.boleh === false && !r.usulan.token, 'LIHAT → usulan tanpa token');
r = STF('aiTanya', { data: { agen: true, pesan: [{ role: 'user', teks: 'ajukan bayar' }] } });
ok(r.usulan && r.usulan.pratinjau.siap === false && /Checklist/.test(r.usulan.pratinjau.galat), 'dry-run keuangan menolak (checklist belum lengkap) tanpa menulis');

console.log('6. aksi terlarang & mode pasif');
C.__jawabHTTP = (() => { let i = 0; return () => ++i === 1 ? jawabOpenAI('{"aksi":"simpanPengguna","arg":{"nama":"x","peran":"ADMIN"}}') : jawabOpenAI('Maaf, tidak diizinkan.'); })();
r = STF('aiTanya', { data: { agen: true, pesan: [{ role: 'user', teks: 'jadikan saya admin' }] } });
ok(r.ok && r.langkah[0].ok === false && r.teks === 'Maaf, tidak diizinkan.', 'aksi di luar whitelist ditolak');
r = STF('aiAksi', { data: { aksi: 'login', arg: {} } }); ok(!r.ok, 'aiAksi menolak aksi inti');
r = STF('aiAksi', { data: { aksi: 'simpanMasterTambahan', arg: {} } }); ok(!r.ok, 'aksi khusus Admin ditolak untuk Pengadaan');
C.__jawabHTTP = () => jawabOpenAI('{"aksi":"bacaSemua","arg":{}}');
r = STF('aiTanya', { data: { pesan: [{ role: 'user', teks: 'tanpa agen' }] } });
ok(r.ok && !r.langkah.length && /bacaSemua/.test(r.teks), 'tanpa agen:true → chat pasif (kompatibel 2.2.7)');

console.log('7. analisis proaktif + jeda 60 detik');
const AN = '{"ringkasan":"Ada 1 kontrak kurang lengkap.","temuan":[{"judul":"Register kurang","detail":"WK-NK.KSO/PDBJ/SPM/001/2026 kurang RFQ/PO/TOP/WBS","tingkat":"tinggi"}],"saran":[{"judul":"Cek checklist","aksi":"checklistRingkas","arg":{},"dampak":"tahu status"},{"judul":"Ubah pengguna","aksi":"simpanPengguna","arg":{},"dampak":"x"}]}';
for (const id of ['audit-kontrak', 'tagihan-dokumen', 'stok-bon', 'followup']) {
  Object.keys(C.__cache).filter(k => /^AI_AN_/.test(k)).forEach(k => delete C.__cache[k]);
  let dataKirim = ''; C.__jawabHTTP = (u, o) => { dataKirim = JSON.parse(o.payload).messages.slice(-1)[0].content; return jawabOpenAI(AN); };
  r = STF('aiTanya', { data: { mode: 'analisis', perintah: id } });
  ok(r.ok && r.mode === 'analisis' && r.temuan.length === 1 && r.saran.length === 2 && r.saran[0].aksi === 'checklistRingkas' && r.saran[1].aksi === '', 'analisis ' + id + ' (saran non-whitelist dikosongkan)');
  if (id === 'audit-kontrak') ok(/PT Baja Jaya/.test(dataKirim) && /"kurang"/.test(dataKirim), '  data audit kontrak dihitung server');
  if (id === 'stok-bon') ok(/BON-01/.test(dataKirim), '  data bon belum diterima penuh');
  if (id === "tagihan-dokumen") ok(/BA-001/.test(dataKirim) && /Faktur Pajak/.test(dataKirim), '  data checklist tagihan kurang');
}
r = STF('aiTanya', { data: { mode: 'analisis', perintah: 'followup' } }); ok(!r.ok && /JEDA:\d+/.test(r.error), 'batas 1 analisis / 60 detik');
ok(Object.keys(C.__cache).some(k => /^AI_AN_\d{4}-\d{2}-\d{2}_staf_pengadaan$/.test(k)), 'kunci cache AI_AN_<hari>_<user>');
r = STF('aiAksi', { data: { aksi: 'checklistRingkas', arg: {}, alasan: 'saran' } }); ok(r.ok && r.jenis === 'baca' && r.berhasil, 'Jalankan saran baca');
r = STF('aiAksi', { data: { aksi: 'gudangTerimaBon', arg: { bonNomor: 'BON-01', tanggal: '2026-10-01', noSJ: 'SJ-9', baris: [{ idx: 0, qty: 20 }] } } });
ok(r.ok && r.jenis === 'tulis' && r.usulan.pratinjau.siap === false && /foto/i.test(r.usulan.pratinjau.peringatan.join()) && /Besi D13 20 btg/.test(r.usulan.pratinjau.ringkas), 'dry-run penerimaan: qty valid, lampiran wajib');
r = STF('aiAksi', { data: { aksi: 'gudangTerimaBon', arg: { bonNomor: 'BON-01', tanggal: '2026-10-01', noSJ: 'SJ-9', baris: [{ idx: 0, qty: 999 }] } } });
ok(/melebihi sisa/.test(r.usulan.pratinjau.galat), 'dry-run menolak qty > sisa bon');

console.log('8. adapter Anthropic / Google / retry OpenAI-compatible');
C.__jawabHTTP = (u, o) => { const b = JSON.parse(o.payload); assert.ok(u === 'https://api.anthropic.com/v1/messages' && o.headers['x-api-key'] && b.system && b.model === 'claude-haiku-5-5'); return { kode: 200, teks: { content: [{ type: 'text', text: 'Halo dari Claude' }], usage: { input_tokens: 3, output_tokens: 2 } } }; };
r = STF('aiTanya', { data: { provider: 'claude', pesan: [{ role: 'user', teks: 'hai' }] } }); ok(r.ok && r.teks === 'Halo dari Claude' && r.provider === 'claude' && r.providerId === 'anthropic', 'alias claude → anthropic');
r = STF('aiTanya', { data: { provider: 'gemini', pesan: [{ role: 'user', teks: 'hai' }] } }); ok(!r.ok && /belum aktif|API key/.test(r.error), 'penyedia tanpa key ditolak');
r = STF('aiTanya', { data: { provider: 'tidakada', pesan: [{ role: 'user', teks: 'hai' }] } }); ok(!r.ok && /tidak dikenal/.test(r.error), 'penyedia asing ditolak');
ADM('aiSetel', { data: { providers: [{ id: 'google', model: 'gemini-3.8-flash', aktif: true, kunci: 'AIzaTEST0123456789abcdef' }] } });
C.__jawabHTTP = (u, o) => { assert.ok(/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:generateContent$/.test(u) && o.headers['x-goog-api-key']); return { kode: 200, teks: { candidates: [{ content: { parts: [{ text: 'Halo Gemini' }] } }], usageMetadata: {} } }; };
r = STF('aiTanya', { data: { provider: 'gemini', pesan: [{ role: 'user', teks: 'hai' }] } }); ok(r.ok && r.teks === 'Halo Gemini' && r.provider === 'gemini', 'adapter Google');
let k2 = 0; C.__jawabHTTP = (u, o) => { k2++; const b = JSON.parse(o.payload); assert.ok(u === 'https://api.groq.com/openai/v1/chat/completions');
  if (k2 === 1) { assert.ok(b.max_tokens); return { kode: 400, teks: { error: { message: "Unsupported parameter: 'max_tokens'" } } }; } assert.ok(b.max_completion_tokens && !b.max_tokens); return jawabOpenAI('ok groq'); };
r = STF('aiTanya', { data: { provider: 'groq', pesan: [{ role: 'user', teks: 'hai' }] } }); ok(r.ok && r.teks === 'ok groq' && k2 === 2, 'retry parameter max_tokens → max_completion_tokens');
C.__jawabHTTP = (u, o) => { assert.ok(u === 'https://llm.contoh.id/v1/chat/completions'); return { kode: 401, teks: { error: { message: 'bad key kunci-lokal-0123456789' } } }; };
r = STF('aiTanya', { data: { provider: 'lokal', pesan: [{ role: 'user', teks: 'hai' }] } }); ok(!r.ok && /HTTP 401/.test(r.error) && !/kunci-lokal-0123456789/.test(r.error), 'galat penyedia tambahan, key disamarkan');

console.log('9. kuota & inti terlindungi');
const kq = Object.keys(C.__cache).find(k => /^AIQ_/.test(k) && /staf/.test(k)); ok(Number(C.__cache[kq]) > 5, 'kuota harian bertambah');
r = ADM('aiInfo'); ok(r.agen && r.agen.judul.savePBJ, 'aiInfo.agen.judul');
r = ADM('modulInfo'); ok(r.ok && r.aktif.versi === '1.8.2' && r.aktif.aksi.includes('aiTerapkan') && r.aktif.baca.includes('aiAksi') && !r.aktif.baca.includes('aiTerapkan'), 'modul 1.5.2 aktif; aiTerapkan BUKAN aksi baca');
console.log('10. [1.5.2] cadangan penyedia, URL rapi, galat HTML, jeda analisis');
const HTML404 = { kode: 404, teks: '<html lang="en" dir=ltr><meta charset=utf-8><title>Error 404 (Not Found)!!1</title><style>*{margin:0}</style>' };
ADM('aiSetel', { data: { bawaanId: 'openai', providers: [{ id: 'google', model: 'gemini-2.5-flash', aktif: true, baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash' },
  { id: 'groq', model: 'llama-3.3-70b-versatile', aktif: true, baseURL: 'https://api.groq.com/openai/v1' }] } });
let urls = []; C.__jawabHTTP = (u, o) => { urls.push(u); return /googleapis/.test(u) ? HTML404 : jawabOpenAI('dijawab cadangan'); };
r = STF('aiTanya', { data: { provider: 'google', agen: true, pesan: [{ role: 'user', teks: 'Tagihan mana yang dokumennya belum lengkap?' }] } });
ok(urls[0] === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', 'Base URL Google yang salah tempel dirapikan');
ok(r.ok && r.teks === 'dijawab cadangan' && r.providerId === 'openai' && r.cadangan && r.cadangan.dari === 'Google Gemini' && !/<html/.test(r.cadangan.alasan), 'Gemini 404 → otomatis dijawab OpenAI (cadangan)');
urls = []; C.__jawabHTTP = (u, o) => { urls.push(u); return jawabOpenAI('ok'); };
r = STF('aiTanya', { data: { provider: 'groq', pesan: [{ role: 'user', teks: 'x' }] } }); ok(urls[0] === 'https://api.groq.com/openai/v1/chat/completions', 'Base URL OpenAI-compatible dilengkapi /chat/completions');
C.__jawabHTTP = () => HTML404;
r = STF('aiTanya', { data: { provider: 'google', cadangan: false, pesan: [{ role: 'user', teks: 'x' }] } });
ok(!r.ok && /HTTP 404/.test(r.error) && /halaman HTML/.test(r.error) && !/<html|<meta|<style/i.test(r.error), 'galat 404 tanpa HTML mentah: ' + r.error.slice(0, 110));
r = STF('aiTanya', { data: { provider: 'google', pesan: [{ role: 'user', teks: 'x' }] } }); ok(!r.ok && /cadangan .* juga gagal/.test(r.error), 'semua penyedia gagal → pesan jelas');
let n503 = 0; C.__jawabHTTP = (u) => /googleapis/.test(u) && ++n503 === 1 ? { kode: 503, teks: { error: { message: 'This model is currently experiencing high demand.' } } } : { kode: 200, teks: { candidates: [{ content: { parts: [{ text: 'pulih' }] } }] } };
r = STF('aiTanya', { data: { provider: 'google', pesan: [{ role: 'user', teks: 'x' }] } }); ok(r.ok && r.teks === 'pulih' && n503 === 2 && !r.cadangan, '503 sekali → coba ulang otomatis ke penyedia yang sama');
C.__jawabHTTP = () => ({ kode: 400, teks: { error: { message: 'invalid request' } } });
r = STF('aiTanya', { data: { provider: 'groq', pesan: [{ role: 'user', teks: 'x' }] } }); ok(!r.ok && /Groq \(HTTP 400\)/.test(r.error), 'HTTP 400 tidak dialihkan (bukan galat sementara)');
Object.keys(C.__cache).filter(k => /^AI_AN_/.test(k)).forEach(k => delete C.__cache[k]);
C.__jawabHTTP = () => ({ kode: 503, teks: { error: { message: 'busy' } } });
r = STF('aiTanya', { data: { mode: 'analisis', perintah: 'audit-kontrak', provider: 'google' } }); ok(!r.ok && /penuh \(sementara\)/.test(r.error), 'analisis gagal (semua penuh/sibuk) → pesan berpanduan');
ok(!Object.keys(C.__cache).some(k => /^AI_AN_/.test(k)), 'jeda 60 detik dibatalkan setelah gagal');
C.__jawabHTTP = () => jawabOpenAI(AN);
r = STF('aiTanya', { data: { mode: 'analisis', perintah: 'audit-kontrak', provider: 'openai' } }); ok(r.ok && r.mode === 'analisis', 'langsung bisa coba lagi tanpa menunggu');
console.log('11. [1.5.2] validasi API key & galat berpanduan');
r = ADM('aiSetel', { data: { providers: [{ id: 'openai', model: 'gpt-5-mini', aktif: true, kunci: 'https://api.openai.com/v1/abcdef6812' }] } }); ok(!r.ok && /berisi alamat URL/.test(r.error), 'key berupa URL ditolak');
r = ADM('aiSetel', { data: { providers: [{ id: 'openai', model: 'gpt-5-mini', aktif: true, kunci: 'sk-ant-api03-0123456789abcdef' }] } }); ok(!r.ok && /milik Anthropic Claude/.test(r.error), 'key penyedia lain (tertukar) ditolak');
r = ADM('aiSetel', { data: { providers: [{ id: 'groq', model: 'llama-3.3-70b-versatile', aktif: true, kunci: 'Bearer gsk_abcdefghij0123456789' }] } }); ok(r.ok && C.__props.AI_KEY_GROQ === 'gsk_abcdefghij0123456789' && !r.peringatanKunci.length, 'awalan "Bearer " dibuang');
r = ADM('aiSetel', { data: { providers: [{ id: 'deepseek', model: 'deepseek-chat', aktif: true, kunci: 'abcdefghijklmnopqrstu' }] } }); ok(r.ok && /tidak lazim/.test(r.peringatanKunci[0]), 'format tidak lazim → disimpan + peringatan');
C.__props.AI_KEY_OPENAI = 'https://lama.contoh/kunci-6812'; r = ADM('aiInfo'); ok(/URL/.test(r.admin.providers.find(p => p.id === 'openai').kunciCurigai), 'key tersimpan yang berupa URL ditandai di setelan');
C.__props.AI_KEY_OPENAI = 'sk-test-0123456789abcdef';
C.__jawabHTTP = (u) => /deepseek/.test(u) ? { kode: 402, teks: { error: { message: 'Insufficient Balance' } } } : /anthropic/.test(u) ? { kode: 401, teks: { error: { message: 'invalid x-api-key' } } } : jawabOpenAI('dari cadangan');
r = STF('aiTanya', { data: { provider: 'deepseek', cadangan: false, pesan: [{ role: 'user', teks: 'x' }] } }); ok(!r.ok && /Saldo\/kredit akun habis — isi saldo di platform\.deepseek\.com\/top_up/.test(r.error), '402 → arahan isi saldo');
r = STF('aiTanya', { data: { provider: 'claude', cadangan: false, pesan: [{ role: 'user', teks: 'x' }] } }); ok(!r.ok && /console\.anthropic\.com\/settings\/keys/.test(r.error), '401 → arahan buat/salin ulang key');
r = STF('aiTanya', { data: { provider: 'deepseek', pesan: [{ role: 'user', teks: 'x' }] } }); ok(r.ok && r.teks === 'dari cadangan' && /Saldo/.test(r.cadangan.alasan), '402 dialihkan ke penyedia cadangan');
console.log('\nLULUS ' + lulus + ' cek');
