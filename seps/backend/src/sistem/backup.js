'use strict';

/**
 * Backup berkas database: harian otomatis (disimpan 30 terakhir) dan
 * "sebelum-pembaruan" setiap kali migrasi diterapkan (disimpan 20 terakhir).
 */
const fs = require('fs');
const path = require('path');

const SIMPAN = { harian: 30, manual: 30, 'sebelum-pembaruan': 20 };

function cap() {
  return new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}

function buatBackup(berkasDb, dirBackup, jenis = 'manual', label = '') {
  if (!fs.existsSync(berkasDb)) return null;
  fs.mkdirSync(dirBackup, { recursive: true });
  const nama = `seps-${cap()}-${jenis}${label ? `-${label.replace(/[^\w.-]/g, '')}` : ''}.db`;
  const tujuan = path.join(dirBackup, nama);
  fs.copyFileSync(berkasDb, tujuan);
  pangkas(dirBackup, jenis);
  return tujuan;
}

function daftarBackup(dirBackup) {
  if (!fs.existsSync(dirBackup)) return [];
  return fs
    .readdirSync(dirBackup)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const st = fs.statSync(path.join(dirBackup, f));
      const jenis = (f.match(/-(harian|manual|sebelum-pembaruan)/) || [])[1] || 'lain';
      return { nama: f, jenis, ukuran: st.size, waktu: st.mtime.toISOString() };
    })
    .sort((a, b) => (a.waktu < b.waktu ? 1 : -1));
}

function pangkas(dirBackup, jenis) {
  const batas = SIMPAN[jenis];
  if (!batas) return;
  daftarBackup(dirBackup)
    .filter((b) => b.jenis === jenis)
    .slice(batas)
    .forEach((b) => fs.unlinkSync(path.join(dirBackup, b.nama)));
}

/** Backup harian bila backup harian terakhir lebih dari `jam` jam yang lalu. */
function backupHarianBilaPerlu(berkasDb, dirBackup, jam = 20) {
  const terakhir = daftarBackup(dirBackup).find((b) => b.jenis === 'harian');
  if (terakhir && Date.now() - Date.parse(terakhir.waktu) < jam * 3600 * 1000) return null;
  return buatBackup(berkasDb, dirBackup, 'harian');
}

module.exports = { buatBackup, daftarBackup, backupHarianBilaPerlu };
