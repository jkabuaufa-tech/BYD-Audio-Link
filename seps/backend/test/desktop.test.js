'use strict';

/**
 * Uji alur aplikasi desktop end-to-end (tanpa Electron):
 * start → input data → unggah paket pembaruan (dengan migrasi) → mulai ulang dari
 * kode paket → DATA LAMA IDENTIK; paket berbahaya ditolak; kembali ke versi bawaan.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const request = require('supertest');
const { paketDariFolder } = require('../../alat/buat-paket');
const { sidikPaket } = require('../src/sistem/pembaruan');
const { periksaMigrasiAman } = require('../src/sistem/sqlAman');

const SEPS = path.resolve(__dirname, '..', '..');

// Sama seperti shell Electron (desktop/main.js): kode paket berada di luar folder aplikasi,
// modul npm diambil dari node_modules bawaan.
process.env.NODE_PATH = path.join(__dirname, '..', 'node_modules');
require('module')._initPaths();
const H = { 'X-SEPS-Klien': '1' };

function salin(dari, ke) {
  fs.mkdirSync(ke, { recursive: true });
  for (const n of fs.readdirSync(dari)) {
    const a = path.join(dari, n);
    const b = path.join(ke, n);
    if (fs.statSync(a).isDirectory()) salin(a, b);
    else fs.copyFileSync(a, b);
  }
}

/** Folder kode tiruan (seperti hasil rakit-kode) dengan versi & migrasi tambahan opsional. */
function folderKode(akar, versi, migrasiTambahan = {}) {
  const dir = path.join(akar, `src-${versi}`);
  salin(path.join(SEPS, 'backend', 'src'), path.join(dir, 'backend', 'src'));
  salin(path.join(SEPS, 'backend', 'migrasi', 'sqlite'), path.join(dir, 'backend', 'migrasi', 'sqlite'));
  for (const [nama, sql] of Object.entries(migrasiTambahan)) fs.writeFileSync(path.join(dir, 'backend', 'migrasi', 'sqlite', nama), sql);
  fs.mkdirSync(path.join(dir, 'web'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'web', 'index.html'), `<!doctype html><title>SEPS ${versi}</title>`);
  fs.writeFileSync(path.join(dir, 'versi.json'), JSON.stringify({ versi, untukShell: '1.0.0', catatan: `uji ${versi}` }));
  return dir;
}

function potretData(d, tabel) {
  return Object.fromEntries(tabel.map((t) => [t, d.semua(`SELECT * FROM ${t} ORDER BY rowid`)]));
}

const MIGRASI_003 = `
-- contoh migrasi versi 1.1.0: kolom & tabel baru, parameter baru (hanya menambah)
ALTER TABLE t_produksi_harian ADD COLUMN pengawas TEXT;
CREATE TABLE IF NOT EXISTS t_catatan_harian (id INTEGER PRIMARY KEY, tanggal TEXT NOT NULL, isi TEXT);
INSERT OR IGNORE INTO m_parameter_evaluasi (kunci, nilai, keterangan) VALUES ('notifikasi_alert', '1', 'baru di 1.1.0');
INSERT OR IGNORE INTO m_parameter_evaluasi (kunci, nilai, keterangan) VALUES ('granularitas', 'harian', 'tidak boleh menimpa');
`;

test('pemeriksa migrasi: hanya pernyataan yang menambah yang lolos', () => {
  assert.equal(periksaMigrasiAman(MIGRASI_003).aman, true);
  assert.equal(periksaMigrasiAman(fs.readFileSync(path.join(SEPS, 'backend/migrasi/sqlite/001_skema_awal.sql'), 'utf8')).aman, true);
  assert.equal(periksaMigrasiAman(fs.readFileSync(path.join(SEPS, 'backend/migrasi/sqlite/002_data_awal.sql'), 'utf8')).aman, true);
  for (const buruk of [
    'DELETE FROM t_biaya_aktual',
    'UPDATE m_item SET hs_ahsp = 1',
    'DROP TABLE t_produksi_harian',
    'INSERT INTO m_item (id) VALUES (1)',
    'REPLACE INTO m_item (id) VALUES (1)',
    'INSERT OR REPLACE INTO m_item (id) VALUES (1)',
    "INSERT OR IGNORE INTO m_parameter_evaluasi VALUES ('a','b','c') ON CONFLICT(kunci) DO UPDATE SET nilai='x'",
    'ALTER TABLE m_item RENAME TO lama',
    'ALTER TABLE m_item DROP COLUMN nama',
    'CREATE TABLE x AS SELECT 1; DELETE FROM m_item',
    'CREATE TRIGGER t AFTER INSERT ON m_item BEGIN DELETE FROM t_biaya_aktual; END',
    'PRAGMA foreign_keys = OFF',
  ]) {
    assert.equal(periksaMigrasiAman(buruk).aman, false, buruk);
  }
  // Kata terlarang di dalam string tidak dianggap perintah.
  assert.equal(periksaMigrasiAman("INSERT OR IGNORE INTO m_parameter_evaluasi VALUES ('x','DELETE FROM a; DROP TABLE b','c')").aman, true);
});

test('alur desktop: pasang pembaruan tanpa mengubah data lama, tolak paket berbahaya, kembali ke bawaan', async () => {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'seps-uji-'));
  const dataDir = path.join(akar, 'data');
  const kodeRoot = path.join(akar, 'kode');
  const bawaan = folderKode(akar, '1.0.0');
  const log = () => {};

  // 1) Start pertama dari kode bawaan → skema + data awal.
  let s = await require(path.join(bawaan, 'backend/src/desktop.js')).mulai({ dataDir, kodeRoot, port: 47900, versiShell: '1.0.0', log });
  const url = `http://127.0.0.1:${s.port}`;
  const items = (await request(url).get('/api/v1/items').expect(200)).body.data;
  assert.equal(items.length, 9);
  assert.equal(items[0].overhead_pct, 0.03);

  // Pengaman lokal: tanpa header klien / Host asing → ditolak.
  await request(url).post('/api/v1/benchmark').send({}).expect(403);
  await request(url).get('/api/v1/items').set('Host', 'evil.example:4780').expect(403);

  // 2) Input data harian + harga SPH + akhiri harga contoh.
  for (const tgl of ['2026-10-26', '2026-10-27', '2026-10-28']) {
    await request(url).post('/api/v1/produksi-harian').set(H).send({
      item_id: 9, tanggal: tgl, volume: 250, jam_kerja: 8,
      biaya: [{ kategori: 'BBM', qty: 128, harga_satuan: 18000 }, { kategori: 'ALAT', jumlah: 1116667 }],
    }).expect(201);
  }
  await request(url).post('/api/v1/benchmark').set(H).send({ item_id: 9, vendor: 'PT Uji', harga_satuan: 18500, berlaku_mulai: '2026-11-01' }).expect(201);
  await request(url).patch('/api/v1/benchmark/10').set(H).send({ berlaku_sampai: '2026-10-31' }).expect(200);
  const kepSebelum = (await request(url).get('/api/v1/keputusan/9').expect(200)).body.data;

  const { bukaDb } = require(path.join(bawaan, 'backend/src/sistem/db.js'));
  const TABEL = ['m_unit_produksi', 'm_item', 'm_sumber_daya', 'm_koefisien_ahsp', 'm_parameter_evaluasi', 't_produksi_harian', 't_biaya_aktual', 't_benchmark_beli_jadi'];
  let d = await bukaDb(path.join(dataDir, 'seps.db'));
  const potretAwal = potretData(d, TABEL);
  d.tutup();
  assert.equal(potretAwal.t_produksi_harian.length, 3);

  // 3) Paket-paket yang harus DITOLAK (tidak ada yang berubah).
  const paket110 = paketDariFolder(folderKode(akar, '1.1.0', { '003_kolom_pengawas.sql': MIGRASI_003 }));
  const tolak = async (p, pola) => {
    const r = await request(url).post('/api/v1/sistem/pembaruan').set(H).send(p).expect(422);
    assert.equal(r.body.ok, false);
    assert.ok(r.body.galat.some((g) => pola.test(g)), `${pola} tidak ada di: ${r.body.galat.join(' | ')}`);
  };
  await tolak(paketDariFolder(folderKode(akar, '1.0.0')), /tidak lebih baru/);
  await tolak({ ...paket110, untukShell: '9.0.0' }, /installer/);

  const rusak = structuredClone(paket110);
  rusak.berkas['backend/src/app.js'].isi = Buffer.from('/* diubah */').toString('base64');
  await tolak(rusak, /Checksum/);

  const traversal = structuredClone(paket110);
  const isi = Buffer.from('x');
  traversal.berkas['../../luar.txt'] = { sha256: crypto.createHash('sha256').update(isi).digest('hex'), isi: isi.toString('base64') };
  traversal.sidik = sidikPaket(traversal.berkas);
  await tolak(traversal, /tidak diizinkan/);

  // Paket 1.2.0 berisi migrasi DELETE (dirakit manual karena buat-paket sudah menolaknya).
  const paketHapus = paketDariFolder(path.join(akar, 'src-1.1.0'));
  const isiHapus = Buffer.from('DELETE FROM t_biaya_aktual;');
  paketHapus.versi = '1.2.0';
  paketHapus.berkas['versi.json'] = (() => { const b = Buffer.from(JSON.stringify({ versi: '1.2.0' })); return { sha256: crypto.createHash('sha256').update(b).digest('hex'), isi: b.toString('base64') }; })();
  paketHapus.berkas['backend/migrasi/sqlite/004_hapus.sql'] = { sha256: crypto.createHash('sha256').update(isiHapus).digest('hex'), isi: isiHapus.toString('base64') };
  paketHapus.sidik = sidikPaket(paketHapus.berkas);
  await tolak(paketHapus, /mengubah\/menghapus data/);

  const ubahLama = structuredClone(paket110);
  const sqlLama = Buffer.from(`${fs.readFileSync(path.join(SEPS, 'backend/migrasi/sqlite/002_data_awal.sql'), 'utf8')}\n-- diubah`);
  ubahLama.berkas['backend/migrasi/sqlite/002_data_awal.sql'] = { sha256: crypto.createHash('sha256').update(sqlLama).digest('hex'), isi: sqlLama.toString('base64') };
  ubahLama.sidik = sidikPaket(ubahLama.berkas);
  await tolak(ubahLama, /tidak boleh diubah/);
  assert.equal(fs.existsSync(path.join(kodeRoot, '1.1.0')), false, 'paket ditolak tidak boleh terpasang');

  // 4) Periksa lalu pasang paket 1.1.0 yang valid.
  const periksa = await request(url).post('/api/v1/sistem/pembaruan?periksa=1').set(H).send(paket110).expect(200);
  assert.deepEqual(periksa.body.ringkasan.migrasi_baru, ['003_kolom_pengawas']);
  assert.equal(fs.existsSync(path.join(kodeRoot, '1.1.0')), false, 'periksa saja tidak memasang');
  const pasang = await request(url).post('/api/v1/sistem/pembaruan').set(H).send(paket110).expect(200);
  assert.equal(pasang.body.perlu_mulai_ulang, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(kodeRoot, 'aktif.json'), 'utf8')).versi, '1.1.0');
  await s.tutup();

  // 5) "Mulai ulang" dengan kode 1.1.0 → migrasi 003 diterapkan, data lama identik.
  s = await require(path.join(kodeRoot, '1.1.0', 'backend/src/desktop.js')).mulai({ dataDir, kodeRoot, port: 47900, versiShell: '1.0.0', log });
  const url2 = `http://127.0.0.1:${s.port}`;
  const info = (await request(url2).get('/api/v1/sistem/info').expect(200)).body.data;
  assert.equal(info.versi, '1.1.0');
  assert.ok(info.migrasi.some((m) => m.id === '003_kolom_pengawas'));
  const backups = (await request(url2).get('/api/v1/sistem/backup').expect(200)).body.data.berkas;
  assert.ok(backups.some((b) => b.jenis === 'sebelum-pembaruan'));
  const kepSesudah = (await request(url2).get('/api/v1/keputusan/9').expect(200)).body.data;
  assert.deepEqual(kepSesudah.metrik, kepSebelum.metrik);
  await s.tutup();

  d = await bukaDb(path.join(dataDir, 'seps.db'));
  const potretBaru = potretData(d, TABEL);
  // Kolom baru 'pengawas' ditambahkan (null) — selain itu setiap baris lama identik.
  for (const r of potretBaru.t_produksi_harian) { assert.equal(r.pengawas, null); delete r.pengawas; }
  const paramBaru = potretBaru.m_parameter_evaluasi.find((r) => r.kunci === 'notifikasi_alert');
  assert.ok(paramBaru);
  potretBaru.m_parameter_evaluasi = potretBaru.m_parameter_evaluasi.filter((r) => r.kunci !== 'notifikasi_alert');
  assert.deepEqual(potretBaru, potretAwal);
  assert.equal(d.satu("SELECT nilai FROM m_parameter_evaluasi WHERE kunci='granularitas'").nilai, 'mingguan');
  d.tutup();

  // 6) Kembali ke bawaan 1.0.0 → kode lama tetap jalan di database yang sudah bermigrasi 003.
  s = await require(path.join(kodeRoot, '1.1.0', 'backend/src/desktop.js')).mulai({ dataDir, kodeRoot, port: 47900, versiShell: '1.0.0', log });
  await request(`http://127.0.0.1:${s.port}`).post('/api/v1/sistem/kembalikan-versi').set(H).send({ versi: 'bawaan' }).expect(200);
  await s.tutup();
  s = await require(path.join(bawaan, 'backend/src/desktop.js')).mulai({ dataDir, kodeRoot, port: 47900, versiShell: '1.0.0', log });
  const r = await request(`http://127.0.0.1:${s.port}`).get('/api/v1/produksi-harian?item_id=9').expect(200);
  assert.equal(r.body.data.length, 3);
  await s.tutup();

  fs.rmSync(akar, { recursive: true, force: true });
});
