'use strict';

const express = require('express');
const cors = require('cors');
const { buatLayananAnalitik } = require('./services/analitik');
const { validasiProduksi, validasiBenchmark, GalatValidasi } = require('./validasi');

const bungkus = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * REST API SEPS — prefix /api/v1
 *
 *  GET  /items                               master item swakelola
 *  POST /produksi-harian                     input produksi + biaya harian (upsert)
 *  GET  /produksi-harian?item_id&dari&sampai log produksi
 *  POST /benchmark                           input harga penawaran Beli Jadi
 *  GET  /benchmark?item_id
 *  GET  /analitik/:granularitas?item_id&dari&sampai   harian | mingguan | bulanan
 *  GET  /keputusan/:item_id?granularitas     Decision Engine
 *  GET  /dashboard/ringkasan                 portofolio semua item
 */
function buatApp({ repo }) {
  const app = express();
  const analitik = buatLayananAnalitik(repo);
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const r = express.Router();

  r.get('/kesehatan', (req, res) => res.json({ status: 'ok', penyimpanan: repo.jenis }));

  r.get('/items', bungkus(async (req, res) => res.json({ data: await repo.listItems() })));

  r.get('/produksi-harian', bungkus(async (req, res) => {
    const { item_id, dari, sampai } = req.query;
    res.json({ data: await repo.listProduksi({ item_id, dari, sampai }) });
  }));

  r.post('/produksi-harian', bungkus(async (req, res) => {
    const { produksi, biaya } = validasiProduksi(req.body);
    const item = await repo.getItem(produksi.item_id);
    if (!item) return res.status(404).json({ error: `Item ${produksi.item_id} tidak ditemukan` });
    const tersimpan = await repo.simpanProduksi(produksi);
    const biayaTersimpan = biaya.length ? await repo.simpanBiaya(biaya) : [];
    // Evaluasi ulang langsung → frontend bisa menampilkan alert real-time setelah simpan.
    const keputusan = await analitik.keputusan(produksi.item_id);
    res.status(tersimpan.dibuat ? 201 : 200).json({ data: { produksi: tersimpan, biaya: biayaTersimpan }, keputusan });
  }));

  r.get('/benchmark', bungkus(async (req, res) => res.json({ data: await repo.listBenchmark({ item_id: req.query.item_id }) })));

  r.post('/benchmark', bungkus(async (req, res) => {
    const row = validasiBenchmark(req.body);
    if (!(await repo.getItem(row.item_id))) return res.status(404).json({ error: `Item ${row.item_id} tidak ditemukan` });
    res.status(201).json({ data: await repo.simpanBenchmark(row) });
  }));

  r.get('/analitik/:granularitas', bungkus(async (req, res) => {
    const { item_id, dari, sampai } = req.query;
    if (!item_id) return res.status(400).json({ error: 'item_id wajib' });
    const { item, periode } = await analitik.deretItem(item_id, { granularitas: req.params.granularitas, dari, sampai });
    res.json({
      item: { id: item.id, kode: item.kode, nama: item.nama, satuan: item.satuan, hs_ahsp: Number(item.hs_ahsp) },
      granularitas: req.params.granularitas,
      data: periode,
    });
  }));

  r.get('/keputusan/:item_id', bungkus(async (req, res) => {
    const { granularitas, dari, sampai } = req.query;
    res.json({ data: await analitik.keputusan(req.params.item_id, { granularitas, dari, sampai }) });
  }));

  r.get('/dashboard/ringkasan', bungkus(async (req, res) => {
    const { dari, sampai } = req.query;
    res.json({ data: await analitik.ringkasan({ dari, sampai }), diperbarui: new Date().toISOString() });
  }));

  app.use('/api/v1', r);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof GalatValidasi) return res.status(422).json({ error: err.message, galat: err.galat });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    if (err.code === '23503') return res.status(404).json({ error: 'Referensi item tidak ditemukan' });
    console.error(err);
    return res.status(500).json({ error: 'Kesalahan server' });
  });

  return app;
}

module.exports = { buatApp };
