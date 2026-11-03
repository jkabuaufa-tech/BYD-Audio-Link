'use client';

import { Bar, Cell, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KartuGrafik, TooltipKustom, grid, sumbu } from './common';
import { persen, rupiah, rupiahBertanda } from '../../lib/format';

/**
 * Grafik Mingguan — Efisiensi biaya (%) terhadap AHSP.
 * Batang = efisiensi minggu tsb (biru hemat / merah overrun, skema diverging),
 * garis = efisiensi kumulatif s.d. minggu tsb. Satu sumbu (%) untuk keduanya.
 * Efisiensi = (HS AHSP × Volume − Biaya Aktual) / (HS AHSP × Volume).
 */
export default function WeeklyEfficiencyChart({ data, ambangWaspada = 2 }) {
  const rows = data.map((d) => ({ ...d, efisiensi_kumulatif: d.kumulatif.efisiensi_pct }));
  const isi = (d) => ({
    judul: `${d.periode} (${d.mulai} s.d. ${d.selesai})`,
    baris: [
      { label: 'Efisiensi minggu ini', nilai: persen(d.efisiensi_pct), warna: d.efisiensi_pct >= 0 ? 'var(--pos)' : 'var(--neg)' },
      { label: 'Efisiensi kumulatif', nilai: persen(d.efisiensi_kumulatif), warna: 'var(--text-primary)' },
      { label: 'HS aktual', nilai: rupiah(d.hs_aktual) },
      { label: 'Cost saving vs AHSP', nilai: rupiahBertanda(d.cost_saving_vs_ahsp) },
    ],
  });

  return (
    <KartuGrafik
      judul="Mingguan · Tren Efisiensi Biaya terhadap AHSP"
      subjudul="Positif = di bawah target AHSP (hemat); negatif = overrun"
      legenda={[
        { label: 'Hemat', warna: 'var(--pos)', jenis: 'kotak' },
        { label: 'Overrun', warna: 'var(--neg)', jenis: 'kotak' },
        { label: 'Kumulatif', warna: 'var(--text-primary)', jenis: 'garis' },
        { label: `Ambang waspada ${ambangWaspada}%`, warna: 'var(--text-muted)', jenis: 'putus' },
      ]}
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="label" {...sumbu} />
          <YAxis {...sumbu} width={48} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<TooltipKustom isi={isi} />} cursor={{ fill: 'var(--grid)' }} />
          <ReferenceLine y={0} stroke="var(--text-secondary)" />
          <ReferenceLine y={ambangWaspada} stroke="var(--text-muted)" strokeDasharray="4 3" />
          <Bar dataKey="efisiensi_pct" maxBarSize={28}>
            {rows.map((d) => (
              <Cell key={d.periode} fill={d.efisiensi_pct >= 0 ? 'var(--pos)' : 'var(--neg)'} radius={d.efisiensi_pct >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]} />
            ))}
          </Bar>
          <Line type="linear" dataKey="efisiensi_kumulatif" stroke="var(--text-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </KartuGrafik>
  );
}
