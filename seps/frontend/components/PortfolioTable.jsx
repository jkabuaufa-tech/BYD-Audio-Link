import StatusBadge from './StatusBadge';
import { persen, rupiah, rupiahBertanda } from '../lib/format';

/** Ringkasan 9 pekerjaan swakelola (setara sheet DASHBOARD_EVALUASI). Klik baris = pilih item. */
export default function PortfolioTable({ items, terpilih, onPilih }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <h2 className="mb-3 text-sm font-semibold">Portofolio Pekerjaan Swakelola</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-xs">
          <thead className="text-left text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-2 font-medium">Item</th>
              <th className="py-2 pr-2 text-right font-medium">Progres</th>
              <th className="py-2 pr-2 text-right font-medium">HS AHSP</th>
              <th className="py-2 pr-2 text-right font-medium">HS Aktual</th>
              <th className="py-2 pr-2 text-right font-medium">Efisiensi</th>
              <th className="py-2 pr-2 text-right font-medium">Saving vs AHSP</th>
              <th className="py-2 pr-2 text-right font-medium">vs Beli Jadi</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr
                key={r.item_id}
                onClick={() => onPilih(r.item_id)}
                className={`cursor-pointer border-b border-line last:border-0 hover:bg-[var(--grid)] ${terpilih === r.item_id ? 'bg-[var(--grid)]' : ''}`}
              >
                <td className="py-2 pr-2">
                  <span className="font-medium">{r.nama}</span>
                  <span className="block text-muted">{r.unit} · {r.satuan}</span>
                </td>
                <td className="py-2 pr-2 text-right">{persen(r.progres_pct)}</td>
                <td className="py-2 pr-2 text-right">{rupiah(r.hs_ahsp)}</td>
                <td className="py-2 pr-2 text-right">{rupiah(r.hs_aktual)}</td>
                <td className="py-2 pr-2 text-right">{persen(r.efisiensi_kumulatif_pct)}</td>
                <td className="py-2 pr-2 text-right">{rupiahBertanda(r.cost_saving_vs_ahsp)}</td>
                <td className="py-2 pr-2 text-right">{rupiahBertanda(r.selisih_vs_beli_jadi)}</td>
                <td className="py-2"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
