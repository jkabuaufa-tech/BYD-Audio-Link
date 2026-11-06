'use strict';

const { agregasi } = require('./agregasi');
const { evaluasi } = require('./decisionEngine');
const { GRANULARITAS } = require('./periode');

/** Menyatukan repository + agregasi + decision engine untuk satu item. */
function buatLayananAnalitik(repo) {
  async function deretItem(itemId, { granularitas, dari, sampai }) {
    if (!GRANULARITAS.includes(granularitas)) {
      const e = new Error(`granularitas harus salah satu: ${GRANULARITAS.join(', ')}`);
      e.status = 400;
      throw e;
    }
    const item = await repo.getItem(itemId);
    if (!item) {
      const e = new Error(`Item ${itemId} tidak ditemukan`);
      e.status = 404;
      throw e;
    }
    const [produksi, biaya, benchmarks, parameter] = await Promise.all([
      repo.listProduksi({ item_id: item.id, dari, sampai }),
      repo.listBiaya({ item_id: item.id, dari, sampai }),
      repo.listBenchmark({ item_id: item.id }),
      repo.getParameter(),
    ]);
    const periode = agregasi({ item, produksi, biaya, benchmarks, granularitas, parameter });
    return { item, periode, parameter };
  }

  async function keputusan(itemId, { granularitas, dari, sampai } = {}) {
    const parameter = await repo.getParameter();
    const g = granularitas || parameter.granularitas || 'mingguan';
    const { item, periode } = await deretItem(itemId, { granularitas: g, dari, sampai });
    return evaluasi({ item, periode, parameter: { ...parameter, granularitas: g } });
  }

  /** Ringkasan portofolio semua item (setara sheet DASHBOARD_EVALUASI). */
  async function ringkasan({ dari, sampai } = {}) {
    const items = await repo.listItems();
    const baris = [];
    for (const item of items) {
      const k = await keputusan(item.id, { dari, sampai });
      const { periode } = await deretItem(item.id, { granularitas: 'bulanan', dari, sampai });
      const kum = periode.length ? periode[periode.length - 1].kumulatif : null;
      baris.push({
        item_id: item.id,
        kode: item.kode,
        nama: item.nama,
        unit: item.unit_nama,
        satuan: item.satuan,
        volume_rencana: Number(item.volume_rencana),
        volume_realisasi: kum ? kum.volume : 0,
        progres_pct: kum && item.volume_rencana ? Math.round((kum.volume / item.volume_rencana) * 10000) / 100 : 0,
        hs_ahsp: Number(item.hs_ahsp),
        hs_aktual: kum && kum.volume > 0 ? Math.round((kum.biaya_swakelola / kum.volume) * 100) / 100 : null,
        biaya_realisasi: kum ? kum.biaya_swakelola : 0,
        efisiensi_kumulatif_pct: kum ? kum.efisiensi_pct : null,
        cost_saving_vs_ahsp: kum ? kum.cost_saving_vs_ahsp : 0,
        selisih_vs_beli_jadi: kum ? kum.selisih_vs_beli_jadi : null,
        status: k.status,
        rekomendasi: k.rekomendasi,
      });
    }
    const total = baris.reduce(
      (a, r) => ({
        biaya_realisasi: a.biaya_realisasi + r.biaya_realisasi,
        cost_saving_vs_ahsp: a.cost_saving_vs_ahsp + r.cost_saving_vs_ahsp,
        selisih_vs_beli_jadi: a.selisih_vs_beli_jadi + (r.selisih_vs_beli_jadi || 0),
      }),
      { biaya_realisasi: 0, cost_saving_vs_ahsp: 0, selisih_vs_beli_jadi: 0 },
    );
    const nilaiAhsp = total.biaya_realisasi + total.cost_saving_vs_ahsp;
    return {
      ringkasan: {
        ...total,
        efisiensi_portofolio_pct: nilaiAhsp > 0 ? Math.round((total.cost_saving_vs_ahsp / nilaiAhsp) * 10000) / 100 : null,
        jumlah_alert: baris.filter((r) => r.status === 'ALERT_BELI_JADI').length,
        jumlah_waspada: baris.filter((r) => r.status === 'WASPADA').length,
      },
      items: baris,
    };
  }

  return { deretItem, keputusan, ringkasan };
}

module.exports = { buatLayananAnalitik };
