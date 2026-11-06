'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import KpiCards from '../components/KpiCards';
import PortfolioTable from '../components/PortfolioTable';
import DecisionPanel from '../components/DecisionPanel';
import DailyOutputCostChart from '../components/charts/DailyOutputCostChart';
import WeeklyEfficiencyChart from '../components/charts/WeeklyEfficiencyChart';
import MonthlyComparisonChart from '../components/charts/MonthlyComparisonChart';

const INTERVAL_SEGAR_MS = 60_000; // "real-time": muat ulang tiap 1 menit

export default function Dashboard() {
  const [ringkasan, setRingkasan] = useState(null);
  const [itemId, setItemId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [galat, setGalat] = useState(null);

  const muatRingkasan = useCallback(async () => {
    try {
      const r = await api.ringkasan();
      setRingkasan(r);
      setItemId((id) => id ?? (r.items.find((i) => i.status === 'ALERT_BELI_JADI') || r.items[0])?.item_id);
      setGalat(null);
    } catch (e) {
      setGalat(e.message);
    }
  }, []);

  useEffect(() => {
    muatRingkasan();
    const t = setInterval(muatRingkasan, INTERVAL_SEGAR_MS);
    return () => clearInterval(t);
  }, [muatRingkasan]);

  useEffect(() => {
    if (!itemId) return;
    let batal = false;
    Promise.all([
      api.analitik('harian', itemId),
      api.analitik('mingguan', itemId),
      api.analitik('bulanan', itemId),
      api.keputusan(itemId),
    ])
      .then(([harian, mingguan, bulanan, keputusan]) => {
        if (!batal) setDetail({ harian: harian.slice(-30), mingguan, bulanan, keputusan });
      })
      .catch((e) => setGalat(e.message));
    return () => { batal = true; };
  }, [itemId, ringkasan]);

  if (galat) {
    return <p className="rounded-lg border border-line bg-panel p-4 text-sm">Gagal memuat data API: {galat}. Pastikan backend berjalan di NEXT_PUBLIC_API_URL.</p>;
  }
  if (!ringkasan) return <p className="text-sm text-sub">Memuat…</p>;

  const item = ringkasan.items.find((i) => i.item_id === itemId);

  return (
    <div className="space-y-4">
      <KpiCards ringkasan={ringkasan.ringkasan} />
      <PortfolioTable items={ringkasan.items} terpilih={itemId} onPilih={setItemId} />

      {item && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="pilih-item" className="text-sm text-sub">Item dianalisis</label>
          <select
            id="pilih-item"
            value={itemId}
            onChange={(e) => setItemId(Number(e.target.value))}
            className="rounded-md border border-line bg-panel px-2 py-1 text-sm"
          >
            {ringkasan.items.map((i) => <option key={i.item_id} value={i.item_id}>{i.nama}</option>)}
          </select>
        </div>
      )}

      {detail && item && (
        <>
          <DecisionPanel keputusan={detail.keputusan} satuan={item.satuan} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DailyOutputCostChart data={detail.harian} item={item} />
            <WeeklyEfficiencyChart data={detail.mingguan} />
          </div>
          <MonthlyComparisonChart data={detail.bulanan} item={item} />
        </>
      )}
    </div>
  );
}
