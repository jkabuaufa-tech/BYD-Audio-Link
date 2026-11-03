import StatusBadge from './StatusBadge';
import { angka, persen, rupiah, rupiahBertanda } from '../lib/format';

/** Panel Keputusan Strategis "Swakelola vs Beli Jadi" — output Decision Engine. */
export default function DecisionPanel({ keputusan, satuan }) {
  if (!keputusan) return null;
  const m = keputusan.metrik;
  const bep = m?.volume_impas;
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Keputusan Strategis · Swakelola vs Beli Jadi</h2>
        <StatusBadge status={keputusan.status} />
      </header>
      <p className="mb-3 text-base font-semibold">{keputusan.rekomendasi}</p>

      {m && (
        <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
          <Metrik label={`HS aktual /${satuan}`} nilai={rupiah(m.hs_aktual)} />
          <Metrik label={`HS + overhead ${m.overhead_pct}%`} nilai={rupiah(m.hs_efektif)} />
          <Metrik label="HS Beli Jadi (landed)" nilai={rupiah(m.hs_beli_jadi)} />
          <Metrik label="Periode berturut lebih mahal" nilai={`${m.streak_lebih_mahal} ${keputusan.granularitas === 'mingguan' ? 'minggu' : 'periode'}`} />
          <Metrik label="Efisiensi periode terakhir" nilai={persen(m.efisiensi_periode_terakhir_pct)} />
          <Metrik label="Efisiensi kumulatif" nilai={persen(m.efisiensi_kumulatif_pct)} />
          <Metrik label="Cost saving kumulatif vs AHSP" nilai={rupiahBertanda(m.cost_saving_kumulatif_vs_ahsp)} />
          <Metrik label="Selisih kumulatif vs Beli Jadi" nilai={rupiahBertanda(m.selisih_kumulatif_vs_beli_jadi)} />
          <Metrik
            label="Volume impas / periode"
            nilai={bep == null ? '—' : bep.tidak_pernah_kompetitif ? 'Tidak tercapai' : `${angka(bep.volume, 1)} ${satuan} (${angka(bep.rasio_utilisasi_pct, 1)}% tercapai)`}
          />
        </dl>
      )}

      {keputusan.alasan.length > 0 && (
        <>
          <h3 className="mb-1 text-xs font-semibold text-sub">Dasar penilaian</h3>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-xs">
            {keputusan.alasan.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </>
      )}
      <h3 className="mb-1 text-xs font-semibold text-sub">Tindak lanjut</h3>
      <ol className="list-decimal space-y-1 pl-5 text-xs">
        {keputusan.tindak_lanjut.map((t) => <li key={t}>{t}</li>)}
      </ol>
    </section>
  );
}

function Metrik({ label, nilai }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{nilai}</dd>
    </div>
  );
}
