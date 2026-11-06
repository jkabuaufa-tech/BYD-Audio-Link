'use strict';

/**
 * Memilih folder kode yang dijalankan (logika murni, diuji tanpa Electron).
 * Urutan kandidat:
 *   1. versi yang dipilih di kode/aktif.json (hasil unggah paket / "Pakai versi ini")
 *   2. versi terpasang lain, terbaru dahulu (cadangan bila versi pilihan gagal start)
 *   3. "bawaan" — kode di dalam installer, selalu ada
 * Versi yang tidak lebih baru dari bawaan dilewati (installer baru sudah membawa versi lebih baru),
 * dan versi yang tercatat gagal dilewati sampai dipasang ulang.
 */
const fs = require('fs');
const path = require('path');

function bandingVersi(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function daftarKandidat({ aktif, versiBawaan, adaVersi }) {
  if (aktif && aktif.versi === 'bawaan') return ['bawaan'];
  const gagal = (aktif && aktif.gagal) || {};
  const k = [];
  const tambah = (v) => {
    if (!v || v === 'bawaan' || k.includes(v) || gagal[v]) return;
    if (bandingVersi(v, versiBawaan) <= 0 || !adaVersi(v)) return;
    k.push(v);
  };
  if (aktif) {
    tambah(aktif.versi);
    [...(aktif.riwayat || [])]
      .map((r) => r.versi)
      .sort((a, b) => bandingVersi(b, a))
      .forEach(tambah);
  }
  k.push('bawaan');
  return k;
}

function bacaAktif(kodeRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(kodeRoot, 'aktif.json'), 'utf8'));
  } catch {
    return null;
  }
}

function tandaiGagal(kodeRoot, versi, pesan) {
  const aktif = bacaAktif(kodeRoot) || { versi: null, riwayat: [], gagal: {} };
  aktif.gagal = aktif.gagal || {};
  aktif.gagal[versi] = { waktu: new Date().toISOString(), pesan: String(pesan).slice(0, 500) };
  fs.mkdirSync(kodeRoot, { recursive: true });
  const f = path.join(kodeRoot, 'aktif.json');
  fs.writeFileSync(`${f}.tmp`, JSON.stringify(aktif, null, 2));
  fs.renameSync(`${f}.tmp`, f);
}

module.exports = { daftarKandidat, bacaAktif, tandaiGagal, bandingVersi };
