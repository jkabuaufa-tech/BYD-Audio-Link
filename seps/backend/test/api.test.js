'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buatApp } = require('../src/app');
const { buatMemoryRepo } = require('../src/repositories/memoryRepo');

const app = () => buatApp({ repo: buatMemoryRepo() });

test('GET /items mengembalikan 9 item swakelola', async () => {
  const res = await request(app()).get('/api/v1/items').expect(200);
  assert.equal(res.body.data.length, 9);
});

test('GET /analitik/mingguan mengembalikan 13 minggu data demo', async () => {
  const res = await request(app()).get('/api/v1/analitik/mingguan?item_id=1').expect(200);
  assert.equal(res.body.data.length, 13);
  assert.ok(res.body.data[0].periode.startsWith('2026-W'));
});

test('GET /analitik/tahunan → 400', async () => {
  await request(app()).get('/api/v1/analitik/tahunan?item_id=1').expect(400);
});

test('GET /keputusan/4 (AMP data demo) → ALERT_BELI_JADI', async () => {
  const res = await request(app()).get('/api/v1/keputusan/4').expect(200);
  assert.equal(res.body.data.status, 'ALERT_BELI_JADI');
});

test('POST /produksi-harian validasi & upsert', async () => {
  const a = app();
  const bad = await request(a).post('/api/v1/produksi-harian').send({ item_id: 1, tanggal: '2026-13-01', volume: -1 }).expect(422);
  assert.ok(bad.body.galat.length >= 2);

  const body = {
    item_id: 9,
    tanggal: '2026-11-02',
    volume: 250,
    jam_kerja: 8,
    biaya: [
      { kategori: 'BBM', qty: 128, harga_satuan: 18000 },
      { kategori: 'ALAT', jumlah: 1116667 },
      { kategori: 'UPAH', jumlah: 1080000 },
    ],
  };
  const r1 = await request(a).post('/api/v1/produksi-harian').send(body).expect(201);
  assert.equal(r1.body.data.biaya[0].jumlah, 2304000);
  assert.ok(r1.body.keputusan.status);
  await request(a).post('/api/v1/produksi-harian').send({ ...body, biaya: [], volume: 260 }).expect(200);
});

test('GET /dashboard/ringkasan', async () => {
  const res = await request(app()).get('/api/v1/dashboard/ringkasan').expect(200);
  assert.equal(res.body.data.items.length, 9);
  assert.ok(res.body.data.ringkasan.jumlah_alert >= 1);
});
