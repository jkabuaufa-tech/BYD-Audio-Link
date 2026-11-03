'use strict';

const { KATEGORI_BIAYA } = require('./services/agregasi');

class GalatValidasi extends Error {
  constructor(galat) {
    super('Validasi gagal');
    this.status = 422;
    this.galat = galat;
  }
}

const RE_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const tanggalValid = (s) => typeof s === 'string' && RE_TANGGAL.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const angka = (v) => v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v));

/** Validasi body POST /produksi-harian. Mengembalikan objek yang sudah dinormalisasi. */
function validasiProduksi(b, { hariIni = new Date().toISOString().slice(0, 10) } = {}) {
  const g = [];
  if (!angka(b.item_id)) g.push({ field: 'item_id', pesan: 'wajib diisi (angka)' });
  if (!tanggalValid(b.tanggal)) g.push({ field: 'tanggal', pesan: 'format YYYY-MM-DD' });
  else if (b.tanggal > hariIni) g.push({ field: 'tanggal', pesan: 'tidak boleh tanggal mendatang' });
  if (!angka(b.volume) || Number(b.volume) < 0) g.push({ field: 'volume', pesan: 'wajib, angka ≥ 0' });
  if (b.jam_kerja != null && (!angka(b.jam_kerja) || b.jam_kerja < 0 || b.jam_kerja > 24)) g.push({ field: 'jam_kerja', pesan: '0–24 jam' });
  if (b.shift != null && ![1, 2, 3].includes(Number(b.shift))) g.push({ field: 'shift', pesan: '1, 2, atau 3' });
  if (b.biaya != null && !Array.isArray(b.biaya)) g.push({ field: 'biaya', pesan: 'harus array' });
  const biaya = (b.biaya || []).map((x, i) => {
    const kat = String(x.kategori || '').toUpperCase();
    if (!KATEGORI_BIAYA.includes(kat)) g.push({ field: `biaya[${i}].kategori`, pesan: `salah satu: ${KATEGORI_BIAYA.join(', ')}` });
    let jumlah = x.jumlah;
    if (!angka(jumlah) && angka(x.qty) && angka(x.harga_satuan)) jumlah = Number(x.qty) * Number(x.harga_satuan);
    if (!angka(jumlah) || Number(jumlah) < 0) g.push({ field: `biaya[${i}].jumlah`, pesan: 'wajib (atau qty × harga_satuan), ≥ 0' });
    return { ...x, kategori: kat, jumlah: Number(jumlah) };
  });
  if (g.length) throw new GalatValidasi(g);
  return {
    produksi: {
      item_id: Number(b.item_id),
      tanggal: b.tanggal,
      shift: b.shift ? Number(b.shift) : 1,
      volume: Number(b.volume),
      jam_kerja: b.jam_kerja != null ? Number(b.jam_kerja) : null,
      ritase: b.ritase != null ? Number(b.ritase) : null,
      bbm_liter: b.bbm_liter != null ? Number(b.bbm_liter) : null,
      cuaca: b.cuaca || null,
      catatan: b.catatan || null,
    },
    biaya: biaya.map((x) => ({ ...x, item_id: Number(b.item_id), tanggal: b.tanggal })),
  };
}

function validasiBenchmark(b) {
  const g = [];
  if (!angka(b.item_id)) g.push({ field: 'item_id', pesan: 'wajib' });
  if (!b.vendor) g.push({ field: 'vendor', pesan: 'wajib' });
  if (!angka(b.harga_satuan) || b.harga_satuan <= 0) g.push({ field: 'harga_satuan', pesan: 'wajib, > 0 (excl. PPN)' });
  if (!tanggalValid(b.berlaku_mulai)) g.push({ field: 'berlaku_mulai', pesan: 'format YYYY-MM-DD' });
  if (b.berlaku_sampai && !tanggalValid(b.berlaku_sampai)) g.push({ field: 'berlaku_sampai', pesan: 'format YYYY-MM-DD' });
  if (g.length) throw new GalatValidasi(g);
  return { ...b, item_id: Number(b.item_id), harga_satuan: Number(b.harga_satuan), biaya_angkut_per_satuan: Number(b.biaya_angkut_per_satuan || 0) };
}

function validasiUbahBenchmark(b) {
  const g = [];
  const hasil = {};
  if (b.berlaku_sampai !== undefined) {
    if (b.berlaku_sampai !== null && !tanggalValid(b.berlaku_sampai)) g.push({ field: 'berlaku_sampai', pesan: 'format YYYY-MM-DD atau null' });
    hasil.berlaku_sampai = b.berlaku_sampai;
  }
  if (b.memenuhi_spesifikasi !== undefined) {
    if (typeof b.memenuhi_spesifikasi !== 'boolean') g.push({ field: 'memenuhi_spesifikasi', pesan: 'true / false' });
    hasil.memenuhi_spesifikasi = b.memenuhi_spesifikasi;
  }
  if (!Object.keys(hasil).length && !g.length) g.push({ field: '-', pesan: 'isi berlaku_sampai dan/atau memenuhi_spesifikasi' });
  if (g.length) throw new GalatValidasi(g);
  return hasil;
}

module.exports = { validasiProduksi, validasiBenchmark, validasiUbahBenchmark, GalatValidasi, tanggalValid };
