const { buatKonteks } = require('./harness.js'); const fs = require('fs'), assert = require('assert');
const U = process.env.MODUL_140;   // path server-modul-1.4.0.json
const C = buatKonteks(), K = C.__k, P = K.PROYEK_AWAL.id;
K.tulisPengguna_([{ nama: 'Joko Supriyono', peran: 'ADMIN', pin: '1234', aktif: true, proyek: '*' }]); K.tulisProyek_([K.PROYEK_AWAL]);
const A = (a, e) => JSON.parse(K.doPost({ postData: { contents: JSON.stringify(Object.assign({ action: a, nama: 'Joko Supriyono', pin: '1234', proyek: P }, e || {})) } }));
const terbit = v => assert.ok(A('modulTerbit', { versi: v, konfirmasi: 'LULUS UJI', catatanUji: 'uji rollback otomatis' }).ok);
const m140 = JSON.parse(fs.readFileSync(U, 'utf8')), m150 = JSON.parse(fs.readFileSync(__dirname + '/../server-modul-1.5.0.json', 'utf8'));
assert.ok(A('modulUnggah', { data: m140 }).ok); terbit('1.4.0');
assert.ok(A('aiSetel', { data: { kunciClaude: 'sk-ant-lama-0123456789abc', modelClaude: 'claude-sonnet-5-5', bawaan: 'claude', kuota: 30, maksToken: 1024, peran: ['ADMIN'] } }).ok);
assert.ok(A('modulUnggah', { data: m150 }).ok); terbit('1.5.0');
let r = A('aiInfo'); assert.ok(r.siap.claude && r.siap.anthropic && r.kuota === 30 && r.bawaanId === 'anthropic'); console.log('  ✓ 1.5.0 membaca setelan & key dari 1.4.0 (kuota 30, key Claude)');
assert.ok(A('aiSetel', { data: { bawaanId: 'openai', providers: [{ id: 'openai', model: 'gpt-5-mini', aktif: true, kunci: 'sk-openai-0123456789ab' }, { id: 'anthropic', model: 'claude-opus-5-5', aktif: true }] } }).ok);
r = A('modulRollback', { konfirmasi: 'KEMBALIKAN', versiSekarang: '1.5.0' }); assert.ok(r.ok && r.aktif.versi === '1.4.0'); console.log('  ✓ Rollback kernel 1.5.0 → 1.4.0');
r = A('aiInfo'); assert.ok(r.ok && r.siap.claude && r.model.claude === 'claude-opus-5-5' && r.kuota === 30 && r.bawaan === 'claude'); console.log('  ✓ 1.4.0 tetap jalan: key Claude, model ' + r.model.claude + ', bawaan ' + r.bawaan);
C.__jawabHTTP = (u, o) => { assert.ok(u === 'https://api.anthropic.com/v1/messages'); return { kode: 200, teks: { content: [{ type: 'text', text: 'OK 1.4.0' }], usage: {} } }; };
r = A('aiTanya', { data: { pesan: [{ role: 'user', teks: 'hai' }] } }); assert.ok(r.ok && r.teks === 'OK 1.4.0'); console.log('  ✓ aiTanya 1.4.0 setelah rollback (bawaan openai 1.5.0 → claude di 1.4.0)');
r = A('modulUnggah', { data: m140 }); assert.ok(!r.ok); console.log('  ✓ catatan: unggah ulang 1.4.0 ditolak kernel ("' + r.error.slice(0, 60) + '…") → rollback pakai tombol Rollback');
