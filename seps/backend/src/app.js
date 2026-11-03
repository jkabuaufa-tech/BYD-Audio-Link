'use strict';

const express = require('express');
const cors = require('cors');
const { buatLayananAnalitik } = require('./services/analitik');
const path = require('path');
const { validasiProduksi, validasiBenchmark, validasiUbahBenchmark, GalatValidasi } = require('./validasi');

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
 *  PATCH /benchmark/:id                      akhiri masa berlaku / ubah status lolos spek
 *  GET  /sistem/info · POST /sistem/pembaruan · POST /sistem/backup · GET /sistem/backup
 *  POST /sistem/kembalikan-versi · POST /sistem/mulai-ulang      (hanya aplikasi desktop)
 *
 * @param {object} o
 * @param {object} o.repo
 * @param {object} [o.sistem]    layanan sistem desktop (pembaruan, backup) — lihat desktop.js
 * @param {string} [o.webDir]    folder tampilan hasil `next build` (disajikan di origin yang sama)
 * @param {boolean} [o.modeLokal] true = hanya melayani localhost, tanpa CORS, wajib header klien
 */
function buatApp({ repo, sistem, webDir, modeLokal = false }) {
  const app = express();
  const analitik = buatLayananAnalitik(repo);

  if (modeLokal) {
    // Lindungi server lokal dari situs lain yang dibuka di browser yang sama:
    // tolak Host asing (DNS rebinding) dan wajibkan header khusus untuk perubahan data
    // (header khusus memicu preflight CORS, yang tidak kita izinkan).
    app.use((req, res, next) => {
      const host = String(req.headers.host || '').replace(/:\d+$/, '');
      if (!['localhost', '127.0.0.1'].includes(host)) return res.status(403).json({ error: 'Host tidak diizinkan' });
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-seps-klien'] !== '1') {
        return res.status(403).json({ error: 'Permintaan ditolak (bukan dari aplikasi SEPS)' });
      }
      return next();
    });
  } else {
    app.use(cors());
  }

  const r = express.Router();

  if (sistem) {
    // Didaftarkan sebelum parser JSON umum (batas 1 MB) karena paket bisa beberapa MB.
    r.post('/sistem/pembaruan', express.json({ limit: '100mb' }), bungkus(async (req, res) => {
      const hasil = await sistem.pasangPembaruan(req.body, { hanyaPeriksa: req.query.periksa === '1' });
      res.status(hasil.ok ? 200 : 422).json(hasil);
    }));
  }
  r.use(express.json({ limit: '1mb' }));

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

  r.patch('/benchmark/:id', bungkus(async (req, res) => {
    const ubah = validasiUbahBenchmark(req.body || {});
    const hasil = await repo.ubahBenchmark(req.params.id, ubah);
    if (!hasil) return res.status(404).json({ error: `Harga ${req.params.id} tidak ditemukan` });
    res.json({ data: hasil });
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

  if (sistem) {
    r.get('/sistem/info', bungkus(async (req, res) => res.json({ data: await sistem.info() })));
    r.get('/sistem/backup', bungkus(async (req, res) => res.json({ data: await sistem.daftarBackup() })));
    r.post('/sistem/backup', bungkus(async (req, res) => res.status(201).json({ data: await sistem.buatBackup() })));
    r.post('/sistem/kembalikan-versi', bungkus(async (req, res) => {
      if (!req.body || !req.body.versi) return res.status(400).json({ error: 'versi wajib' });
      res.json({ data: await sistem.kembalikanVersi(String(req.body.versi)) });
    }));
    r.post('/sistem/mulai-ulang', bungkus(async (req, res) => {
      res.json({ data: { dimulaiUlang: true } });
      setTimeout(() => sistem.mulaiUlang(), 300);
    }));
  }

  app.use('/api/v1', r);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));

  if (webDir) {
    app.use(express.static(webDir, { extensions: ['html'], index: 'index.html' }));
    app.use((req, res) => res.status(404).sendFile(path.join(webDir, '404.html'), (e) => e && res.end()));
  }

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
