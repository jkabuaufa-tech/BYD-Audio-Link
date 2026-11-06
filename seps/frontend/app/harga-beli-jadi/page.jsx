'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { rupiah } from '../../lib/format';

const hariIni = () => new Date().toISOString().slice(0, 10);
const kemarin = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

/**
 * Harga Beli Jadi (SPH vendor). Decision Engine memakai harga landed TERENDAH yang
 * masih berlaku & lolos spesifikasi — jadi saat memasukkan SPH riil yang lebih mahal
 * dari harga contoh, akhiri masa berlaku harga contoh.
 */
export default function HargaBeliJadi() {
  const [items, setItems] = useState([]);
  const [daftar, setDaftar] = useState([]);
  const [form, setForm] = useState({ item_id: '', vendor: '', no_penawaran: '', harga_satuan: '', biaya_angkut_per_satuan: '0', berlaku_mulai: hariIni(), akhiriLama: true });
  const [pesan, setPesan] = useState(null);

  const muat = useCallback(async () => {
    const [i, b] = await Promise.all([api.items(), api.benchmark()]);
    setItems(i);
    setDaftar(b);
    setForm((f) => ({ ...f, item_id: f.item_id || i[0]?.id || '' }));
  }, []);
  useEffect(() => { muat().catch((e) => setPesan({ galat: true, teks: e.message })); }, [muat]);

  const berlaku = (b) => b.memenuhi_spesifikasi !== false && (!b.berlaku_sampai || b.berlaku_sampai >= hariIni());

  async function simpan(e) {
    e.preventDefault();
    setPesan(null);
    try {
      const itemId = Number(form.item_id);
      const lama = daftar.filter((b) => b.item_id === itemId && berlaku(b));
      await api.tambahBenchmark({
        item_id: itemId,
        vendor: form.vendor,
        no_penawaran: form.no_penawaran || null,
        harga_satuan: Number(form.harga_satuan),
        biaya_angkut_per_satuan: Number(form.biaya_angkut_per_satuan || 0),
        berlaku_mulai: form.berlaku_mulai,
      });
      if (form.akhiriLama) {
        const akhir = form.berlaku_mulai > hariIni() ? form.berlaku_mulai : kemarin();
        for (const b of lama) await api.ubahBenchmark(b.id, { berlaku_sampai: akhir < b.berlaku_mulai ? b.berlaku_mulai : akhir });
      }
      setPesan({ teks: `Harga ${form.vendor} tersimpan${form.akhiriLama && lama.length ? `; ${lama.length} harga lama item ini diakhiri` : ''}.` });
      setForm((f) => ({ ...f, vendor: '', no_penawaran: '', harga_satuan: '', biaya_angkut_per_satuan: '0' }));
      await muat();
    } catch (err) {
      setPesan({ galat: true, teks: `${err.message}${err.galat ? `: ${err.galat.map((g) => `${g.field} ${g.pesan}`).join(', ')}` : ''}` });
    }
  }

  async function ubah(b, isi) {
    setPesan(null);
    try {
      await api.ubahBenchmark(b.id, isi);
      await muat();
    } catch (err) {
      setPesan({ galat: true, teks: err.message });
    }
  }

  const input = 'w-full rounded-md border border-line bg-panel px-2 py-1.5 text-sm';
  const ubahForm = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="space-y-4">
      <form onSubmit={simpan} className="rounded-lg border border-line bg-panel p-4">
        <h1 className="mb-1 text-sm font-semibold">Tambah harga Beli Jadi (SPH vendor)</h1>
        <p className="mb-3 text-xs text-sub">Harga franco lokasi proyek, <b>belum termasuk PPN</b>. Bila belum franco, isi biaya angkut per satuan.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="text-xs text-sub sm:col-span-2">Item
            <select className={input} value={form.item_id} onChange={ubahForm('item_id')} required>
              {items.map((i) => <option key={i.id} value={i.id}>{i.nama} ({i.satuan})</option>)}
            </select>
          </label>
          <label className="text-xs text-sub">Vendor<input className={input} value={form.vendor} onChange={ubahForm('vendor')} required /></label>
          <label className="text-xs text-sub">No. SPH<input className={input} value={form.no_penawaran} onChange={ubahForm('no_penawaran')} /></label>
          <label className="text-xs text-sub">Harga satuan (Rp)<input type="number" min="1" className={input} value={form.harga_satuan} onChange={ubahForm('harga_satuan')} required /></label>
          <label className="text-xs text-sub">Angkut /satuan (Rp)<input type="number" min="0" className={input} value={form.biaya_angkut_per_satuan} onChange={ubahForm('biaya_angkut_per_satuan')} /></label>
          <label className="text-xs text-sub">Berlaku mulai<input type="date" className={input} value={form.berlaku_mulai} onChange={ubahForm('berlaku_mulai')} required /></label>
          <label className="flex items-center gap-2 text-xs text-sub sm:col-span-3 lg:col-span-4">
            <input type="checkbox" checked={form.akhiriLama} onChange={ubahForm('akhiriLama')} />
            Akhiri harga lama item ini yang masih berlaku (disarankan saat mengganti harga contoh)
          </label>
          <button className="rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white">Simpan harga</button>
        </div>
        {pesan && <p className={`mt-3 text-xs ${pesan.galat ? 'text-[var(--status-critical)]' : 'text-sub'}`}>{pesan.teks}</p>}
      </form>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold">Daftar harga Beli Jadi</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-2 font-medium">Item</th>
                <th className="py-2 pr-2 font-medium">Vendor / SPH</th>
                <th className="py-2 pr-2 text-right font-medium">Harga landed</th>
                <th className="py-2 pr-2 font-medium">Berlaku</th>
                <th className="py-2 pr-2 font-medium">Status</th>
                <th className="py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((b) => {
                const it = items.find((i) => i.id === b.item_id);
                const aktif = berlaku(b);
                return (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-2">{it ? it.nama : b.item_id}</td>
                    <td className="py-2 pr-2">{b.vendor}{b.no_penawaran ? ` · ${b.no_penawaran}` : ''}</td>
                    <td className="py-2 pr-2 text-right">{rupiah(Number(b.harga_satuan) + Number(b.biaya_angkut_per_satuan || 0))}{it ? ` /${it.satuan}` : ''}</td>
                    <td className="py-2 pr-2">{b.berlaku_mulai} s.d. {b.berlaku_sampai || 'sekarang'}</td>
                    <td className="py-2 pr-2">{aktif ? 'Dipakai' : b.memenuhi_spesifikasi === false ? 'Tidak lolos spek' : 'Berakhir'}</td>
                    <td className="space-x-3 py-2">
                      {aktif && <button type="button" className="underline" onClick={() => ubah(b, { berlaku_sampai: kemarin() < b.berlaku_mulai ? b.berlaku_mulai : kemarin() })}>Akhiri</button>}
                      {!aktif && b.berlaku_sampai && <button type="button" className="underline" onClick={() => ubah(b, { berlaku_sampai: null })}>Aktifkan lagi</button>}
                      <button type="button" className="underline" onClick={() => ubah(b, { memenuhi_spesifikasi: b.memenuhi_spesifikasi === false })}>
                        {b.memenuhi_spesifikasi === false ? 'Tandai lolos spek' : 'Tandai tidak lolos spek'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
