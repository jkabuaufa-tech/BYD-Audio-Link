import { persen, rupiahBertanda, rupiahRingkas } from '../lib/format';

export default function KpiCards({ ringkasan }) {
  const kartu = [
    { label: 'Biaya realisasi swakelola', nilai: rupiahRingkas(ringkasan.biaya_realisasi) },
    { label: 'Efisiensi portofolio vs AHSP', nilai: persen(ringkasan.efisiensi_portofolio_pct) },
    { label: 'Cost saving vs AHSP', nilai: rupiahBertanda(ringkasan.cost_saving_vs_ahsp), kecil: true },
    { label: 'Selisih vs Beli Jadi (+ = swakelola hemat)', nilai: rupiahBertanda(ringkasan.selisih_vs_beli_jadi), kecil: true },
    { label: 'Item perlu tindakan', nilai: `${ringkasan.jumlah_alert} alert · ${ringkasan.jumlah_waspada} waspada` },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {kartu.map((k) => (
        <div key={k.label} className="rounded-lg border border-line bg-panel p-3">
          <p className="text-xs text-sub">{k.label}</p>
          <p className={`mt-1 font-semibold ${k.kecil ? 'text-base' : 'text-xl'}`}>{k.nilai}</p>
        </div>
      ))}
    </div>
  );
}
