/**
 * calc.js — Mesin kalkulasi (murni, tanpa DOM, tanpa penyimpanan).
 *
 * Seluruh rumus meniru sheet Excel "Rekap Action Plan" & "Rincian Harian".
 * Karena murni, berkas ini bisa dipakai apa adanya di backend Node.js saat
 * data dipindah ke PostgreSQL/MySQL (lihat tests/calc.test.js).
 *
 * Konvensi: tanggal = string ISO "YYYY-MM-DD"; persen = pecahan (0.3005 = 30,05%).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.JIAT = root.JIAT || {}).calc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPS = 1e-7;
  const STATUS = Object.freeze({
    OVER: 'CEK > BOQ', DONE: 'SELESAI', LATE: 'TERLAMBAT', RUNNING: 'BERJALAN', IDLE: 'BELUM MULAI',
  });

  const toUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const fromUTC = (t) => new Date(t).toISOString().slice(0, 10);
  const addDays = (iso, n) => fromUTC(toUTC(iso) + n * 864e5);
  const diffDays = (a, b) => Math.round((toUTC(a) - toUTC(b)) / 864e5);
  /** Daftar tanggal inklusif dari `start` s.d. `end`. */
  function dateRange(start, end) {
    const out = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }

  /** Target kumulatif linier (Rekap!B35): 0 → targetDes sepanjang baseline. */
  function targetKumulatif(project, tanggal) {
    const span = diffDays(project.baselineAkhir, project.baselineMulai) + 1;
    const elapsed = diffDays(tanggal, project.baselineMulai) + 1;
    return Math.max(0, Math.min(project.targetDes, (elapsed / span) * project.targetDes));
  }

  /** Status item (Rincian!V10). `realisasi` = kumulatif s.d. tanggal monitoring. */
  function statusItem(item, realisasi, tanggalMonitoring) {
    if (realisasi > item.volume + EPS) return STATUS.OVER;
    if (item.volume > 0 && realisasi >= item.volume) return STATUS.DONE;
    if (item.selesai && item.selesai < tanggalMonitoring) return STATUS.LATE;
    return realisasi > 0 ? STATUS.RUNNING : STATUS.IDLE;
  }

  /**
   * Hitung seluruh tampilan turunan dari state mentah.
   * @param {object} state  data tersimpan (lihat README: Struktur Data)
   * @param {string} tanggalMonitoring  posisi progres yang disimulasikan
   */
  function compute(state, tanggalMonitoring) {
    const { project } = state;
    const totalNilai = state.items.reduce((s, it) => s + it.volume * it.hargaNego, 0);

    // Indeks progres: itemId -> { s.d. tanggal, seluruh tanggal }, dan tanggal -> nilai Rp.
    const realSd = new Map(), realAll = new Map(), nilaiPerTanggal = new Map();
    const harga = new Map(state.items.map((it) => [it.id, it.hargaNego]));
    for (const p of state.progress) {
      if (!harga.has(p.itemId)) continue;
      realAll.set(p.itemId, (realAll.get(p.itemId) || 0) + p.volume);
      if (p.tanggal <= tanggalMonitoring) realSd.set(p.itemId, (realSd.get(p.itemId) || 0) + p.volume);
      nilaiPerTanggal.set(p.tanggal, (nilaiPerTanggal.get(p.tanggal) || 0) + p.volume * harga.get(p.itemId));
    }

    const items = state.items.map((it) => {
      const nilai = it.volume * it.hargaNego;
      const bobot = totalNilai ? nilai / totalNilai : 0;
      const realisasi = realSd.get(it.id) || 0;
      const progres = it.volume ? realisasi / it.volume : 0;
      return {
        ...it, nilai, bobot,
        targetBobotDes: it.targetVolDes == null || !it.volume ? null : (it.targetVolDes / it.volume) * bobot,
        realisasi, realisasiTotal: realAll.get(it.id) || 0,
        sisa: Math.max(0, it.volume - realisasi),
        progres, kontribusi: bobot * progres,
        status: statusItem(it, realisasi, tanggalMonitoring),
      };
    });

    const divisions = state.divisions.map((d) => {
      const rows = items.filter((it) => it.divisionId === d.id);
      const sum = (f) => rows.reduce((s, r) => s + (f(r) || 0), 0);
      const targetDes = sum((r) => r.targetBobotDes), realisasi = sum((r) => r.kontribusi);
      return {
        ...d, jumlahItem: rows.length, nilai: sum((r) => r.nilai), bobot: sum((r) => r.bobot), targetDes, realisasi,
        deviasi: targetDes === 0 ? null : realisasi - targetDes,
        itemTerlambat: rows.filter((r) => r.status === STATUS.LATE).length,
      };
    });

    // Tabel monitoring harian (Rekap!A35:L86).
    const notes = new Map(state.dailyNotes.map((n) => [n.tanggal, n]));
    let kum = 0, targetPrev = 0;
    const daily = dateRange(project.baselineMulai, project.baselineAkhir).map((tanggal) => {
      const nilaiHari = nilaiPerTanggal.get(tanggal) || 0;
      const realHari = totalNilai ? nilaiHari / totalNilai : 0;
      const targetKum = targetKumulatif(project, tanggal);
      const row = {
        tanggal, targetKum, targetHari: targetKum - targetPrev, realHari, realKum: (kum += realHari),
        nilaiHari, note: notes.get(tanggal) || null,
      };
      row.deviasi = row.realKum - targetKum;
      targetPrev = targetKum;
      return row;
    });

    const sdTanggal = daily.filter((r) => r.tanggal <= tanggalMonitoring);
    const realisasiSd = sdTanggal.reduce((s, r) => s + r.realHari, 0);
    const targetLinier = sdTanggal.reduce((s, r) => s + r.targetHari, 0);
    const targetDetailDes = items.reduce((s, r) => s + (r.targetBobotDes || 0), 0);
    const summary = {
      tanggalMonitoring, totalNilai, targetDes: project.targetDes,
      realisasiHariIni: (daily.find((r) => r.tanggal === tanggalMonitoring) || {}).realHari || 0,
      realisasiSd, nilaiRealisasiSd: realisasiSd * totalNilai, targetLinier,
      deviasi: realisasiSd - targetLinier,
      sisaKeTarget: Math.max(0, project.targetDes - realisasiSd),
      itemTerisiTarget: items.filter((r) => r.targetVolDes != null).length,
      itemTerlambat: items.filter((r) => r.status === STATUS.LATE).length,
      itemCekBoq: items.filter((r) => r.realisasiTotal > r.volume + EPS).length,
      jumlahItem: items.length, targetDetailDes, selisihTargetDetail: targetDetailDes - project.targetDes,
    };
    return { summary, items, divisions, daily };
  }

  /** Validasi satu input harian. `kumulatifLain` = total item di tanggal lain. */
  function cekInputHarian(item, kumulatifLain, volumeHari) {
    const total = kumulatifLain + volumeHari;
    return {
      total, sisa: Math.max(0, item.volume - total),
      melebihiBoq: total > item.volume + EPS,
      kelebihan: Math.max(0, total - item.volume),
    };
  }

  return { EPS, STATUS, compute, cekInputHarian, statusItem, targetKumulatif, dateRange, addDays, diffDays };
});
