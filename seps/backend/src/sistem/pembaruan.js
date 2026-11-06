'use strict';

/**
 * Paket pembaruan SEPS (format "seps-pembaruan", sama gaya dengan paket
 * pembaruan Monitoring Pengadaan): satu berkas JSON berisi seluruh kode
 * server + tampilan + migrasi, diunggah lewat menu Pengaturan › Pembaruan.
 *
 * Struktur folder kode di komputer pengguna (folder data aplikasi):
 *   kode/aktif.json        { versi, riwayat:[{versi,dipasang,catatan}], gagal:{versi:{waktu,pesan}} }
 *   kode/<versi>/          versi.json, backend/src/**, backend/migrasi/sqlite/*.sql, web/**
 * Data (data/seps.db) TERPISAH dari kode dan tidak pernah ditimpa paket.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { rencanaMigrasi, terapkan, sha256 } = require('./migrasi');

const FORMAT = 'seps-pembaruan';
const AWALAN_IZIN = ['backend/src/', 'backend/migrasi/sqlite/', 'web/'];
const BERKAS_WAJIB = ['versi.json', 'backend/src/desktop.js', 'web/index.html'];
const BATAS_UKURAN = 80 * 1024 * 1024;

function bandingVersi(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Sidik paket: SHA-256 dari daftar (path, sha256) terurut — mendeteksi berkas hilang/tambahan/rusak. */
function sidikPaket(berkas) {
  const daftar = Object.keys(berkas).sort().map((p) => `${p}:${berkas[p].sha256}`).join('\n');
  return crypto.createHash('sha256').update(daftar).digest('hex');
}

function pathAman(p) {
  if (typeof p !== 'string' || !p || p.includes('\\') || p.includes('\0')) return false;
  if (path.posix.isAbsolute(p) || /^[a-zA-Z]:/.test(p)) return false;
  const norm = path.posix.normalize(p);
  if (norm !== p || norm.startsWith('..') || norm.split('/').includes('..')) return false;
  return p === 'versi.json' || AWALAN_IZIN.some((a) => p.startsWith(a));
}

/**
 * Validasi menyeluruh paket. Tidak menulis apa pun.
 * @param {object} paket
 * @param {object} ctx { versiAktif, versiShell, db (sql.js Database salinan, opsional), modulTersedia(nama)→bool }
 */
function validasiPaket(paket, ctx) {
  const galat = [];
  const tambah = (g) => galat.push(g);
  if (!paket || typeof paket !== 'object') return { ok: false, galat: ['Berkas bukan paket JSON.'] };
  if (paket.format !== FORMAT) tambah(`Format paket harus "${FORMAT}" (ditemukan "${paket.format}").`);
  if (!/^\d+\.\d+\.\d+$/.test(paket.versi || '')) tambah('Versi paket tidak valid (contoh: 1.1.0).');
  if (!paket.berkas || typeof paket.berkas !== 'object') tambah('Paket tidak berisi berkas.');
  if (galat.length) return { ok: false, galat };

  if (bandingVersi(paket.versi, ctx.versiAktif) <= 0) {
    tambah(`Versi paket ${paket.versi} tidak lebih baru dari versi terpasang ${ctx.versiAktif}. Untuk kembali ke versi lama gunakan "Kembalikan versi".`);
  }
  if (paket.untukShell && bandingVersi(paket.untukShell, ctx.versiShell) > 0) {
    tambah(`Paket butuh aplikasi (installer) minimal ${paket.untukShell}; terpasang ${ctx.versiShell}. Pasang installer terbaru dahulu.`);
  }
  for (const dep of paket.dependensi || []) {
    if (ctx.modulTersedia && !ctx.modulTersedia(dep)) tambah(`Modul "${dep}" tidak tersedia di aplikasi terpasang — butuh installer baru.`);
  }

  let ukuran = 0;
  for (const [p, b] of Object.entries(paket.berkas)) {
    if (!pathAman(p)) { tambah(`Lokasi berkas tidak diizinkan: ${p}`); continue; }
    if (!b || typeof b.isi !== 'string' || !/^[0-9a-f]{64}$/.test(b.sha256 || '')) { tambah(`Berkas rusak: ${p}`); continue; }
    const buf = Buffer.from(b.isi, 'base64');
    ukuran += buf.length;
    if (crypto.createHash('sha256').update(buf).digest('hex') !== b.sha256) tambah(`Checksum tidak cocok (berkas rusak/diubah): ${p}`);
  }
  if (ukuran > BATAS_UKURAN) tambah('Paket terlalu besar.');
  for (const w of BERKAS_WAJIB) if (!paket.berkas[w]) tambah(`Berkas wajib tidak ada: ${w}`);
  if (paket.sidik && paket.sidik !== sidikPaket(paket.berkas)) tambah('Sidik paket tidak cocok — paket tidak utuh.');

  if (paket.berkas['versi.json']) {
    try {
      const v = JSON.parse(Buffer.from(paket.berkas['versi.json'].isi, 'base64').toString('utf8'));
      if (v.versi !== paket.versi) tambah(`versi.json (${v.versi}) tidak sama dengan versi paket (${paket.versi}).`);
    } catch {
      tambah('versi.json tidak dapat dibaca.');
    }
  }

  // Migrasi: hanya menambah, tidak mengubah migrasi lama, dan dicoba pada SALINAN database.
  const daftarMigrasi = Object.keys(paket.berkas)
    .filter((p) => p.startsWith('backend/migrasi/sqlite/') && /\/\d{3}_[\w-]+\.sql$/.test(p))
    .sort()
    .map((p) => {
      const sql = Buffer.from(paket.berkas[p].isi, 'base64').toString('utf8');
      return { id: path.posix.basename(p, '.sql'), sql, sha256: sha256(sql) };
    });
  let migrasiBaru = [];
  if (ctx.db) {
    const r = rencanaMigrasi(ctx.db, daftarMigrasi);
    galat.push(...r.galat);
    migrasiBaru = r.tertunda.map((m) => m.id);
    if (!r.galat.length && r.tertunda.length) {
      try {
        terapkan(ctx.db, r.tertunda, paket.versi);
      } catch (e) {
        tambah(`Uji coba migrasi pada salinan database gagal: ${e.message}`);
      }
    }
  }

  return {
    ok: galat.length === 0,
    galat,
    ringkasan: {
      versi: paket.versi,
      tanggal: paket.tanggal || null,
      catatan: paket.catatan || '',
      jumlah_berkas: Object.keys(paket.berkas).length,
      ukuran,
      migrasi_baru: migrasiBaru,
    },
  };
}

function bacaAktif(kodeRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(kodeRoot, 'aktif.json'), 'utf8'));
  } catch {
    return { versi: null, riwayat: [], gagal: {} };
  }
}

function tulisAktif(kodeRoot, data) {
  fs.mkdirSync(kodeRoot, { recursive: true });
  const tujuan = path.join(kodeRoot, 'aktif.json');
  fs.writeFileSync(`${tujuan}.tmp`, JSON.stringify(data, null, 2));
  fs.renameSync(`${tujuan}.tmp`, tujuan);
}

/** Tulis berkas paket ke kode/<versi>/ lalu jadikan aktif (berlaku setelah mulai ulang). */
function pasangPaket(paket, kodeRoot) {
  const tujuan = path.join(kodeRoot, paket.versi);
  const sementara = path.join(kodeRoot, `.${paket.versi}.${process.pid}.${Date.now()}`);
  fs.mkdirSync(sementara, { recursive: true });
  try {
    for (const [p, b] of Object.entries(paket.berkas)) {
      const f = path.join(sementara, ...p.split('/'));
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, Buffer.from(b.isi, 'base64'));
    }
    if (fs.existsSync(tujuan)) fs.rmSync(tujuan, { recursive: true, force: true });
    fs.renameSync(sementara, tujuan);
  } catch (e) {
    fs.rmSync(sementara, { recursive: true, force: true });
    throw e;
  }
  const aktif = bacaAktif(kodeRoot);
  aktif.riwayat = (aktif.riwayat || []).filter((r) => r.versi !== paket.versi);
  aktif.riwayat.push({ versi: paket.versi, dipasang: new Date().toISOString(), catatan: paket.catatan || '' });
  aktif.versi = paket.versi;
  if (aktif.gagal) delete aktif.gagal[paket.versi];
  tulisAktif(kodeRoot, aktif);
  return tujuan;
}

/** Kembalikan kode ke versi terpasang sebelumnya atau "bawaan" (data tidak disentuh). */
function aturVersiAktif(kodeRoot, versi) {
  const aktif = bacaAktif(kodeRoot);
  if (versi !== 'bawaan' && !fs.existsSync(path.join(kodeRoot, versi, 'versi.json'))) {
    throw Object.assign(new Error(`Versi ${versi} tidak terpasang.`), { status: 404 });
  }
  aktif.versi = versi;
  if (aktif.gagal) delete aktif.gagal[versi];
  tulisAktif(kodeRoot, aktif);
  return aktif;
}

module.exports = { FORMAT, validasiPaket, pasangPaket, aturVersiAktif, bacaAktif, tulisAktif, bandingVersi, sidikPaket, pathAman };
