'use strict';

/**
 * Titik mulai server untuk aplikasi DESKTOP. Dipanggil oleh shell Electron
 * (seps/desktop/main.js) dari folder kode aktif — bawaan installer atau hasil
 * paket pembaruan. Folder kode ini mandiri: versi.json, backend/, web/.
 *
 * Urutan start:
 *  1. buka data/seps.db (dibuat bila belum ada)
 *  2. backup "sebelum-pembaruan" bila ada migrasi baru, lalu terapkan migrasi (hanya menambah)
 *  3. backup harian otomatis
 *  4. jalankan server di 127.0.0.1 (hanya komputer ini)
 */
const fs = require('fs');
const path = require('path');
const { buatApp } = require('./app');
const { bukaDb } = require('./sistem/db');
const { bacaDirMigrasi, rencanaMigrasi, terapkan, sudahDiterapkan } = require('./sistem/migrasi');
const { buatBackup, daftarBackup, backupHarianBilaPerlu } = require('./sistem/backup');
const { validasiPaket, pasangPaket, aturVersiAktif, bacaAktif } = require('./sistem/pembaruan');
const { buatSqliteRepo } = require('./repositories/sqliteRepo');

const KODE_DIR = path.resolve(__dirname, '..', '..');

/** versi.json ada di akar folder kode (terpasang) atau di seps/ (mode pengembangan) — keduanya KODE_DIR. */
function bacaVersi(dir = KODE_DIR) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'versi.json'), 'utf8'));
}

function cariWebDir() {
  const kandidat = [path.join(KODE_DIR, 'web'), path.resolve(__dirname, '..', '..', 'frontend', 'out')];
  return kandidat.find((d) => fs.existsSync(path.join(d, 'index.html'))) || null;
}

function dengarkan(app, portAwal) {
  return new Promise((resolve, reject) => {
    let port = portAwal;
    const coba = () => {
      const srv = app.listen(port, '127.0.0.1');
      srv.once('listening', () => resolve({ srv, port }));
      srv.once('error', (e) => {
        if (e.code === 'EADDRINUSE' && port < portAwal + 20) { port++; coba(); } else reject(e);
      });
    };
    coba();
  });
}

/**
 * @param {object} o
 * @param {string} o.dataDir     folder data (berisi seps.db, backup/)
 * @param {string} [o.kodeRoot]  folder paket pembaruan terpasang (kode/)
 * @param {number} [o.port=4780]
 * @param {string} [o.versiShell]
 * @param {Function} [o.onMulaiUlang]  dipanggil untuk memulai ulang aplikasi
 * @param {Function} [o.log]
 */
async function mulai({ dataDir, kodeRoot, port = 4780, versiShell = '0.0.0', onMulaiUlang, log = console.log }) {
  const versi = bacaVersi();
  const berkasDb = path.join(dataDir, 'seps.db');
  const dirBackup = path.join(dataDir, 'backup');
  fs.mkdirSync(dataDir, { recursive: true });

  const d = await bukaDb(berkasDb);
  const daftar = bacaDirMigrasi(path.join(KODE_DIR, 'backend', 'migrasi', 'sqlite'));
  const rencana = rencanaMigrasi(d.db, daftar, { izinkanLebihBaru: true });
  if (rencana.galat.length) throw new Error(`Migrasi ditolak: ${rencana.galat.join(' ')}`);
  if (rencana.tertunda.length) {
    if (!d.baru) {
      const b = buatBackup(berkasDb, dirBackup, 'sebelum-pembaruan', versi.versi);
      log(`[SEPS] Backup sebelum migrasi: ${b}`);
    }
    const ids = terapkan(d.db, rencana.tertunda, versi.versi);
    d.simpan();
    log(`[SEPS] Migrasi diterapkan: ${ids.join(', ')}`);
  }
  backupHarianBilaPerlu(berkasDb, dirBackup);
  const timerBackup = setInterval(() => {
    try { backupHarianBilaPerlu(berkasDb, dirBackup); } catch (e) { log(`[SEPS] Backup harian gagal: ${e.message}`); }
  }, 6 * 3600 * 1000);
  timerBackup.unref();

  const repo = buatSqliteRepo(d);
  const mulaiPada = new Date().toISOString();

  const sistem = {
    async info() {
      const hitung = (t) => d.satu(`SELECT COUNT(*) AS n FROM ${t}`).n;
      const aktif = kodeRoot ? bacaAktif(kodeRoot) : null;
      const terpasang = kodeRoot && fs.existsSync(kodeRoot)
        ? fs.readdirSync(kodeRoot).filter((v) => fs.existsSync(path.join(kodeRoot, v, 'versi.json')))
        : [];
      return {
        versi: versi.versi,
        versi_shell: versiShell,
        catatan_versi: versi.catatan || '',
        kode_dari: KODE_DIR,
        kode_bawaan: !kodeRoot || !path.resolve(KODE_DIR).startsWith(path.resolve(kodeRoot) + path.sep),
        folder_data: dataDir,
        berkas_db: berkasDb,
        ukuran_db: fs.existsSync(berkasDb) ? fs.statSync(berkasDb).size : 0,
        jumlah_data: {
          produksi_harian: hitung('t_produksi_harian'),
          biaya_aktual: hitung('t_biaya_aktual'),
          harga_beli_jadi: hitung('t_benchmark_beli_jadi'),
          item: hitung('m_item'),
        },
        migrasi: sudahDiterapkan(d.db),
        versi_aktif_terpilih: aktif ? aktif.versi : null,
        riwayat_pembaruan: aktif ? aktif.riwayat || [] : [],
        pembaruan_gagal: aktif ? aktif.gagal || {} : {},
        versi_terpasang: terpasang,
        backup_terakhir: daftarBackup(dirBackup)[0] || null,
        mulai_pada: mulaiPada,
      };
    },
    async pasangPembaruan(paket, { hanyaPeriksa = false } = {}) {
      if (!kodeRoot) return { ok: false, galat: ['Pembaruan hanya tersedia di aplikasi desktop.'] };
      const salinan = await d.salinanMemori();
      let hasil;
      try {
        hasil = validasiPaket(paket, {
          versiAktif: versi.versi,
          versiShell,
          db: salinan,
          modulTersedia: (n) => { try { require.resolve(n); return true; } catch { return false; } },
        });
      } finally {
        salinan.close();
      }
      if (!hasil.ok || hanyaPeriksa) return hasil;
      const backup = buatBackup(berkasDb, dirBackup, 'sebelum-pembaruan', paket.versi);
      pasangPaket(paket, kodeRoot);
      log(`[SEPS] Paket ${paket.versi} dipasang; backup ${backup}`);
      return { ...hasil, dipasang: true, backup: backup && path.basename(backup), perlu_mulai_ulang: true };
    },
    async daftarBackup() {
      return { folder: dirBackup, berkas: daftarBackup(dirBackup) };
    },
    async buatBackup() {
      const b = buatBackup(berkasDb, dirBackup, 'manual');
      return { berkas: b && path.basename(b), folder: dirBackup };
    },
    async kembalikanVersi(v) {
      if (!kodeRoot) throw Object.assign(new Error('Hanya di aplikasi desktop'), { status: 400 });
      const a = aturVersiAktif(kodeRoot, v);
      return { versi_aktif_terpilih: a.versi, perlu_mulai_ulang: true };
    },
    mulaiUlang() {
      if (onMulaiUlang) onMulaiUlang();
      else log('[SEPS] Mulai ulang diminta — jalankan ulang aplikasi secara manual.');
    },
  };

  const app = buatApp({ repo, sistem, webDir: cariWebDir(), modeLokal: true });
  const { srv, port: portDipakai } = await dengarkan(app, port);
  log(`[SEPS] ${versi.versi} berjalan di http://127.0.0.1:${portDipakai} · data: ${berkasDb}`);

  return {
    versi: versi.versi,
    port: portDipakai,
    url: `http://localhost:${portDipakai}`,
    async tutup() {
      clearInterval(timerBackup);
      await new Promise((r) => srv.close(r));
      d.tutup();
    },
  };
}

module.exports = { mulai, bacaVersi };

if (require.main === module) {
  // Mode pengembangan: SEPS_DATA_DIR=./data-dev node src/desktop.js
  mulai({
    dataDir: process.env.SEPS_DATA_DIR || path.resolve('data-dev'),
    kodeRoot: process.env.SEPS_KODE_DIR || path.resolve('data-dev', 'kode'),
    port: Number(process.env.PORT || 4780),
    versiShell: '1.0.0',
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
