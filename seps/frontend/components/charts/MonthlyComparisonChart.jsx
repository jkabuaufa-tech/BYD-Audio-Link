'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KartuGrafik, TooltipKustom, grid, sumbu } from './common';
import { angka, rupiah, rupiahBertanda, rupiahRingkas } from '../../lib/format';

/**
 * Grafik Bulanan — Perbandingan biaya Swakelola (+ overhead) vs estimasi biaya
 * jika Beli Jadi untuk volume yang SAMA, ditambah Decision Matrix per bulan.
 */
export default function MonthlyComparisonChart({ data, item }) {
  const isi = (d) => ({
    judul: d.label,
    baris: [
      { label: 'Swakelola + overhead', nilai: rupiah(d.biaya_total_dengan_overhead), warna: 'var(--series-1)' },
      { label: 'Jika Beli Jadi', nilai: rupiah(d.biaya_jika_beli_jadi), warna: 'var(--series-2)' },
      { label: 'Selisih (+ = swakelola hemat)', nilai: rupiahBertanda(d.selisih_vs_beli_jadi) },
    ],
  });
  const akhir = data[data.length - 1];

  return (
    <KartuGrafik
      judul="Bulanan · Swakelola vs Beli Jadi"
      subjudul={`Volume sama, harga Beli Jadi landed excl. PPN — ${item.nama}`}
      legenda={[
        { label: 'Swakelola + overhead', warna: 'var(--series-1)', jenis: 'kotak' },
        { label: 'Estimasi Beli Jadi', warna: 'var(--series-2)', jenis: 'kotak' },
      ]}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barGap={2} barCategoryGap="40%" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="label" {...sumbu} />
          <YAxis {...sumbu} width={72} tickFormatter={rupiahRingkas} />
          <Tooltip content={<TooltipKustom isi={isi} />} cursor={{ fill: 'var(--grid)' }} />
          <Bar dataKey="biaya_total_dengan_overhead" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="biaya_jika_beli_jadi" fill="var(--series-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <h3 className="mb-2 mt-4 text-xs font-semibold text-sub">Decision Matrix bulanan</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead className="text-left text-muted">
            <tr className="border-b border-line">
              <th className="py-1.5 pr-2 font-medium">Bulan</th>
              <th className="py-1.5 pr-2 text-right font-medium">Volume ({item.satuan})</th>
              <th className="py-1.5 pr-2 text-right font-medium">HS Swakelola+OH</th>
              <th className="py-1.5 pr-2 text-right font-medium">HS Beli Jadi</th>
              <th className="py-1.5 pr-2 text-right font-medium">Selisih</th>
              <th className="py-1.5 font-medium">Lebih ekonomis</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.periode} className="border-b border-line last:border-0">
                <td className="py-1.5 pr-2">{d.label}</td>
                <td className="py-1.5 pr-2 text-right">{angka(d.volume, 1)}</td>
                <td className="py-1.5 pr-2 text-right">{rupiah(d.hs_efektif)}</td>
                <td className="py-1.5 pr-2 text-right">{rupiah(d.hs_beli_jadi)}</td>
                <td className="py-1.5 pr-2 text-right font-medium">{rupiahBertanda(d.selisih_vs_beli_jadi)}</td>
                <td className="py-1.5">{d.swakelola_lebih_mahal == null ? '—' : d.swakelola_lebih_mahal ? 'Beli Jadi' : 'Swakelola'}</td>
              </tr>
            ))}
          </tbody>
          {akhir && (
            <tfoot>
              <tr className="font-semibold">
                <td className="pt-2" colSpan={4}>Kumulatif selisih vs Beli Jadi</td>
                <td className="pt-2 text-right">{rupiahBertanda(akhir.kumulatif.selisih_vs_beli_jadi)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </KartuGrafik>
  );
}
