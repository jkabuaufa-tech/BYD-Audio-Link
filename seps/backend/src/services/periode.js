'use strict';

/**
 * Utilitas periode: semua tanggal diperlakukan sebagai tanggal kalender
 * (YYYY-MM-DD) tanpa zona waktu, supaya laporan harian proyek (WIB/WITA/WIT)
 * tidak bergeser satu hari karena konversi UTC.
 */

const GRANULARITAS = ['harian', 'mingguan', 'bulanan'];

function keTanggal(str) {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function keStr(date) {
  return date.toISOString().slice(0, 10);
}

function tambahHari(str, n) {
  const d = keTanggal(str);
  d.setUTCDate(d.getUTCDate() + n);
  return keStr(d);
}

/** Minggu ISO-8601 (Senin s.d. Minggu), sesuai format laporan mingguan proyek. */
function mingguIso(str) {
  const d = keTanggal(str);
  const hari = d.getUTCDay() || 7; // Minggu = 7
  const senin = new Date(d);
  senin.setUTCDate(d.getUTCDate() - hari + 1);
  const kamis = new Date(senin);
  kamis.setUTCDate(senin.getUTCDate() + 3);
  const tahun = kamis.getUTCFullYear();
  const awalTahun = new Date(Date.UTC(tahun, 0, 1));
  const nomor = Math.ceil(((kamis - awalTahun) / 86400000 + 1) / 7);
  const mulai = keStr(senin);
  return {
    kunci: `${tahun}-W${String(nomor).padStart(2, '0')}`,
    mulai,
    selesai: tambahHari(mulai, 6),
  };
}

function bulan(str) {
  const [y, m] = String(str).slice(0, 10).split('-').map(Number);
  const akhir = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { kunci: `${y}-${mm}`, mulai: `${y}-${mm}-01`, selesai: `${y}-${mm}-${String(akhir).padStart(2, '0')}` };
}

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function periodeDari(str, granularitas) {
  const tgl = String(str).slice(0, 10);
  if (granularitas === 'harian') {
    const [, m, d] = tgl.split('-');
    return { kunci: tgl, mulai: tgl, selesai: tgl, label: `${Number(d)} ${NAMA_BULAN[Number(m) - 1]}` };
  }
  if (granularitas === 'mingguan') {
    const w = mingguIso(tgl);
    return { ...w, label: w.kunci.split('-')[1] };
  }
  if (granularitas === 'bulanan') {
    const b = bulan(tgl);
    const [y, m] = b.kunci.split('-');
    return { ...b, label: `${NAMA_BULAN[Number(m) - 1]} ${y}` };
  }
  throw new Error(`Granularitas tidak dikenal: ${granularitas}`);
}

module.exports = { GRANULARITAS, periodeDari, mingguIso, bulan, tambahHari, keTanggal, keStr };
