'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KartuGrafik, TooltipKustom, grid, sumbu } from './common';
import { angka, rupiah, rupiahRingkas } from '../../lib/format';

/**
 * Grafik Harian — Volume Produksi vs Biaya Aktual per Satuan.
 * Dua panel bertumpuk dengan sumbu-X yang sama (syncId), BUKAN dual-axis:
 * volume (m3/Ton) dan Rp/satuan beda besaran sehingga masing-masing punya sumbu Y sendiri.
 * Hari tanpa produksi (hujan/breakdown) tampil sebagai celah di garis HS + label di tooltip.
 */
export default function DailyOutputCostChart({ data, item }) {
  const hsBeliJadi = data.find((d) => d.hs_beli_jadi != null)?.hs_beli_jadi;
  const isi = (d) => ({
    judul: `${d.label} ${d.periode.slice(0, 4)}`,
    baris: [
      { label: `Volume (${item.satuan})`, nilai: angka(d.volume, 1), warna: 'var(--series-1)' },
      { label: 'Biaya aktual', nilai: rupiah(d.biaya_total) },
      { label: `HS aktual /${item.satuan}`, nilai: d.hs_aktual == null ? 'tidak produksi' : rupiah(d.hs_aktual) },
      { label: 'Target AHSP', nilai: rupiah(d.hs_ahsp) },
      { label: 'Harga Beli Jadi', nilai: rupiah(d.hs_beli_jadi) },
    ],
  });

  return (
    <KartuGrafik
      judul="Harian · Volume Produksi & Biaya Aktual per Satuan"
      subjudul={`${item.nama} — ${data.length} hari terakhir`}
      legenda={[
        { label: 'HS aktual swakelola', warna: 'var(--series-1)', jenis: 'garis' },
        { label: 'Target AHSP', warna: 'var(--text-secondary)', jenis: 'putus' },
        { label: 'Harga Beli Jadi', warna: 'var(--series-2)', jenis: 'putus' },
      ]}
      catatan="Lonjakan HS pada hari bervolume rendah = biaya tetap (sewa alat, upah) tidak tertutup volume."
    >
      <p className="mb-1 text-xs text-muted">Volume ({item.satuan})</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} syncId="harian" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="label" {...sumbu} hide />
          <YAxis {...sumbu} width={64} tickFormatter={(v) => angka(v)} />
          <Tooltip content={<TooltipKustom isi={isi} />} cursor={{ fill: 'var(--grid)' }} />
          <Bar dataKey="volume" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>

      <p className="mb-1 mt-3 text-xs text-muted">Harga satuan (Rp/{item.satuan})</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} syncId="harian" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="label" {...sumbu} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...sumbu} width={64} domain={['auto', 'auto']} tickFormatter={rupiahRingkas} />
          <Tooltip content={<TooltipKustom isi={isi} />} cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }} />
          <ReferenceLine y={item.hs_ahsp} stroke="var(--text-secondary)" strokeDasharray="4 3" />
          {hsBeliJadi && <ReferenceLine y={hsBeliJadi} stroke="var(--series-2)" strokeDasharray="4 3" />}
          <Line type="linear" dataKey="hs_aktual" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </KartuGrafik>
  );
}
