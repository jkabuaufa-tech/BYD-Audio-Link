'use strict';

const { SIFAT_BIAYA_DEFAULT } = require('./agregasi');

const PARAMETER_DEFAULT = {
  periode_berturut: 3, // N periode berturut-turut swakelola > beli jadi
  ambang_waspada_pct: 2, // efisiensi di bawah ini (tapi >= 0) = WASPADA
  granularitas: 'mingguan', // periode evaluasi default (harian terlalu "berisik")
};

const STATUS = {
  DATA_KURANG: 'DATA_KURANG',
  AMAN: 'AMAN',
  WASPADA: 'WASPADA',
  ALERT_BELI_JADI: 'ALERT_BELI_JADI',
};

const bulat = (n, d = 0) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
const aktif = (p) => p.volume > 0 || p.biaya_total > 0;

/**
 * Volume impas (BEP) per periode: volume minimum agar
 *   (Biaya Tetap + v × Q) × (1 + OH) ≤ Harga Beli Jadi × Q
 * Q* = F(1+OH) / (HBJ − v(1+OH)). Jika penyebut ≤ 0 → biaya variabel saja sudah
 * lebih mahal dari beli jadi, swakelola tidak akan pernah kompetitif.
 */
function volumeImpas(p, overhead, sifat = SIFAT_BIAYA_DEFAULT) {
  if (p.hs_beli_jadi == null || !(p.volume > 0)) return null;
  let tetap = 0;
  let variabel = 0;
  for (const [k, v] of Object.entries(p.biaya)) {
    if (sifat[k.toUpperCase()] === 'VARIABEL') variabel += v;
    else tetap += v;
  }
  const vPerSatuan = variabel / p.volume;
  const penyebut = p.hs_beli_jadi - vPerSatuan * (1 + overhead);
  if (penyebut <= 0) {
    return { volume: null, tidak_pernah_kompetitif: true, biaya_tetap: bulat(tetap), biaya_variabel_per_satuan: bulat(vPerSatuan, 2) };
  }
  const q = (tetap * (1 + overhead)) / penyebut;
  return {
    volume: bulat(q, 2),
    tidak_pernah_kompetitif: false,
    volume_aktual: p.volume,
    rasio_utilisasi_pct: bulat((p.volume / q) * 100, 1),
    biaya_tetap: bulat(tetap),
    biaya_variabel_per_satuan: bulat(vPerSatuan, 2),
  };
}

/**
 * Decision Engine "Swakelola vs Beli Jadi".
 *
 * ALERT (Pertimbangkan Beli Jadi) jika salah satu:
 *   R1. HS Aktual × (1 + Overhead) > Harga Beli Jadi selama N periode aktif
 *       berturut-turut (default N = 3, periode default = mingguan), atau
 *   R2. Efisiensi periode terakhir terhadap AHSP < 0 %.
 * WASPADA jika 1 ≤ streak < N, atau 0 % ≤ efisiensi < ambang_waspada_pct.
 *
 * @param {object} p
 * @param {object} p.item
 * @param {Array}  p.periode  output agregasi() terurut naik
 * @param {object} [p.parameter]
 */
function evaluasi({ item, periode, parameter = {} }) {
  const prm = { ...PARAMETER_DEFAULT, ...parameter };
  const overhead = Number(prm.overhead_pct ?? item.overhead_pct ?? 0);
  const daftarAktif = (periode || []).filter(aktif);

  if (!daftarAktif.length) {
    return {
      item_id: item.id,
      status: STATUS.DATA_KURANG,
      rekomendasi: 'Belum ada data produksi/biaya pada rentang ini.',
      alasan: [],
      tindak_lanjut: [],
      metrik: null,
    };
  }

  const terakhir = daftarAktif[daftarAktif.length - 1];

  // R1 — hitung streak dari periode terakhir ke belakang.
  let streak = 0;
  for (let i = daftarAktif.length - 1; i >= 0; i--) {
    if (daftarAktif[i].swakelola_lebih_mahal === true) streak++;
    else break;
  }
  const r1 = streak >= prm.periode_berturut;
  const r2 = terakhir.efisiensi_pct != null && terakhir.efisiensi_pct < 0;
  const adaBenchmark = daftarAktif.some((p) => p.hs_beli_jadi != null);

  const alasan = [];
  if (r1) {
    alasan.push(
      `R1: HS Swakelola + overhead ${(overhead * 100).toFixed(1)}% lebih mahal dari harga Beli Jadi selama ${streak} periode ${prm.granularitas} berturut-turut (batas ${prm.periode_berturut}).`,
    );
  } else if (streak > 0) {
    alasan.push(`HS Swakelola + overhead melampaui harga Beli Jadi ${streak} periode terakhir (batas alert ${prm.periode_berturut}).`);
  }
  if (r2) alasan.push(`R2: Efisiensi periode ${terakhir.label} = ${terakhir.efisiensi_pct.toFixed(2)}% (< 0%, overrun terhadap AHSP).`);
  if (!adaBenchmark) alasan.push('Harga pembanding Beli Jadi belum diinput — R1 tidak dapat dievaluasi.');
  if (daftarAktif.length < prm.periode_berturut) {
    alasan.push(`Data baru ${daftarAktif.length} periode aktif; R1 butuh minimal ${prm.periode_berturut} periode.`);
  }

  let status = STATUS.AMAN;
  if (r1 || r2) status = STATUS.ALERT_BELI_JADI;
  else if (streak > 0 || (terakhir.efisiensi_pct != null && terakhir.efisiensi_pct < prm.ambang_waspada_pct)) {
    status = STATUS.WASPADA;
    if (terakhir.efisiensi_pct != null && terakhir.efisiensi_pct < prm.ambang_waspada_pct && terakhir.efisiensi_pct >= 0) {
      alasan.push(`Efisiensi ${terakhir.efisiensi_pct.toFixed(2)}% di bawah ambang waspada ${prm.ambang_waspada_pct}%.`);
    }
  }

  const bep = volumeImpas(terakhir, overhead, prm.sifat_biaya);
  if (bep && bep.tidak_pernah_kompetitif) {
    alasan.push('Biaya variabel (material + BBM) per satuan sudah melebihi harga Beli Jadi — swakelola tidak kompetitif pada volume berapa pun.');
  } else if (bep && bep.rasio_utilisasi_pct != null && bep.rasio_utilisasi_pct < 100) {
    alasan.push(
      `Volume periode terakhir ${bep.volume_aktual} baru ${bep.rasio_utilisasi_pct}% dari volume impas ${bep.volume} — biaya tetap alat/upah belum tertutup.`,
    );
  }

  const kum = terakhir.kumulatif;
  const potensiHemat = terakhir.selisih_vs_beli_jadi != null && terakhir.selisih_vs_beli_jadi < 0 ? -terakhir.selisih_vs_beli_jadi : 0;

  const rekomendasi = {
    ALERT_BELI_JADI: 'Rekomendasi Alert: Pertimbangkan Beli Jadi',
    WASPADA: 'Waspada: pantau produktivitas & biaya, siapkan opsi Beli Jadi',
    AMAN: 'Swakelola masih efisien — lanjutkan',
  }[status];

  const tindakLanjut = {
    ALERT_BELI_JADI: [
      'Minta minimal 3 Surat Penawaran Harga (SPH) Beli Jadi yang memenuhi spesifikasi teknis & jadwal.',
      'Bandingkan harga landed (franco lokasi) excl. PPN terhadap HS Swakelola + overhead.',
      'Audit produktivitas alat (jam efektif, ritase, BBM/jam) sebelum memutuskan demobilisasi.',
      'Kaji konsekuensi kontrak sewa alat (minimum charge, biaya demob) dan klausul penghentian.',
      'Ajukan memo keputusan ke Kepala Proyek / Manajer Divisi beserta BA Klarifikasi vendor.',
    ],
    WASPADA: [
      'Cek penyebab kenaikan biaya: idle alat, cuaca, material reject, BBM di atas standar.',
      'Perbarui benchmark harga Beli Jadi (validitas SPH maks. 30 hari).',
      'Naikkan utilisasi alat mendekati volume impas atau negosiasi sewa ke basis jam/volume.',
    ],
    AMAN: ['Pertahankan; evaluasi ulang otomatis setiap tutup periode.'],
  }[status];

  return {
    item_id: item.id,
    item_nama: item.nama,
    granularitas: prm.granularitas,
    status,
    rekomendasi,
    alasan,
    tindak_lanjut: tindakLanjut,
    aturan: { r1_beli_jadi_lebih_murah_berturut: r1, r2_efisiensi_negatif: r2 },
    metrik: {
      periode_terakhir: terakhir.periode,
      streak_lebih_mahal: streak,
      overhead_pct: bulat(overhead * 100, 2),
      hs_ahsp: terakhir.hs_ahsp,
      hs_aktual: terakhir.hs_aktual,
      hs_efektif: terakhir.hs_efektif,
      hs_beli_jadi: terakhir.hs_beli_jadi,
      efisiensi_periode_terakhir_pct: terakhir.efisiensi_pct,
      efisiensi_kumulatif_pct: kum.efisiensi_pct,
      cost_saving_kumulatif_vs_ahsp: kum.cost_saving_vs_ahsp,
      selisih_kumulatif_vs_beli_jadi: kum.selisih_vs_beli_jadi,
      potensi_hemat_beli_jadi_periode_terakhir: bulat(potensiHemat),
      volume_impas: bep,
    },
  };
}

module.exports = { evaluasi, volumeImpas, PARAMETER_DEFAULT, STATUS };
