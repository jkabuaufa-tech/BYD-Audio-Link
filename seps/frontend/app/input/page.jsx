'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import DecisionPanel from '../../components/DecisionPanel';
import { rupiah } from '../../lib/format';

const KATEGORI = ['MATERIAL', 'ALAT', 'UPAH', 'BBM', 'OVERHEAD_LAIN'];
const barisKosong = () => ({ kategori: 'ALAT', keterangan: '', qty: '', harga_satuan: '', no_dokumen: '' });
const hariIni = () => new Date().toISOString().slice(0, 10);

/** Formulir Input Produksi Harian + Biaya Aktual → POST /api/v1/produksi-harian. */
export default function InputProduksi() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ item_id: '', tanggal: hariIni(), shift: 1, volume: '', jam_kerja: '', ritase: '', cuaca: 'CERAH', catatan: '' });
  const [biaya, setBiaya] = useState([barisKosong()]);
  const [hasil, setHasil] = useState(null);
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);

  useEffect(() => {
    api.items().then((d) => { setItems(d); setForm((f) => ({ ...f, item_id: d[0]?.id ?? '' })); }).catch((e) => setGalat({ pesan: e.message }));
  }, []);

  const item = items.find((i) => i.id === Number(form.item_id));
  const total = biaya.reduce((a, b) => a + (Number(b.qty) || 0) * (Number(b.harga_satuan) || 0), 0);
  const hs = Number(form.volume) > 0 ? total / Number(form.volume) : null;

  async function simpan(e) {
    e.preventDefault();
    setKirim(true);
    setGalat(null);
    try {
      const body = {
        ...form,
        item_id: Number(form.item_id),
        shift: Number(form.shift),
        volume: Number(form.volume),
        jam_kerja: form.jam_kerja === '' ? null : Number(form.jam_kerja),
        ritase: form.ritase === '' ? null : Number(form.ritase),
        biaya: biaya
          .filter((b) => b.qty !== '' && b.harga_satuan !== '')
          .map((b) => ({ ...b, qty: Number(b.qty), harga_satuan: Number(b.harga_satuan) })),
      };
      const r = await api.simpanProduksi(body);
      setHasil(r.keputusan);
      setBiaya([barisKosong()]);
    } catch (err) {
      setGalat({ pesan: err.message, rinci: err.galat });
    } finally {
      setKirim(false);
    }
  }

  const input = 'w-full rounded-md border border-line bg-panel px-2 py-1.5 text-sm';
  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <form onSubmit={simpan} className="space-y-4 rounded-lg border border-line bg-panel p-4 lg:col-span-3">
        <h1 className="text-sm font-semibold">Input Produksi Harian</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Item pekerjaan">
            <select className={input} value={form.item_id} onChange={ubah('item_id')} required>
              {items.map((i) => <option key={i.id} value={i.id}>{i.nama} ({i.satuan})</option>)}
            </select>
          </Field>
          <Field label="Tanggal"><input type="date" className={input} value={form.tanggal} max={hariIni()} onChange={ubah('tanggal')} required /></Field>
          <Field label="Shift">
            <select className={input} value={form.shift} onChange={ubah('shift')}>{[1, 2, 3].map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label={`Volume (${item?.satuan ?? ''})`}><input type="number" step="0.001" min="0" className={input} value={form.volume} onChange={ubah('volume')} required /></Field>
          <Field label="Jam kerja efektif"><input type="number" step="0.1" min="0" max="24" className={input} value={form.jam_kerja} onChange={ubah('jam_kerja')} /></Field>
          <Field label="Ritase"><input type="number" min="0" className={input} value={form.ritase} onChange={ubah('ritase')} /></Field>
          <Field label="Cuaca">
            <select className={input} value={form.cuaca} onChange={ubah('cuaca')}>{['CERAH', 'MENDUNG', 'HUJAN'].map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <div className="sm:col-span-2"><Field label="Catatan kendala"><input className={input} value={form.catatan} onChange={ubah('catatan')} /></Field></div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-semibold text-sub">Biaya aktual hari ini</h2>
          <div className="space-y-2">
            {biaya.map((b, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                <select className={input} value={b.kategori} onChange={(e) => setBiaya(biaya.map((x, j) => (j === i ? { ...x, kategori: e.target.value } : x)))}>
                  {KATEGORI.map((k) => <option key={k}>{k}</option>)}
                </select>
                <input placeholder="Uraian" className={`${input} sm:col-span-2`} value={b.keterangan} onChange={(e) => setBiaya(biaya.map((x, j) => (j === i ? { ...x, keterangan: e.target.value } : x)))} />
                <input placeholder="Qty" type="number" step="0.001" className={input} value={b.qty} onChange={(e) => setBiaya(biaya.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                <input placeholder="Harga satuan" type="number" className={input} value={b.harga_satuan} onChange={(e) => setBiaya(biaya.map((x, j) => (j === i ? { ...x, harga_satuan: e.target.value } : x)))} />
                <input placeholder="No. BPB/Timesheet" className={input} value={b.no_dokumen} onChange={(e) => setBiaya(biaya.map((x, j) => (j === i ? { ...x, no_dokumen: e.target.value } : x)))} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setBiaya([...biaya, barisKosong()])} className="mt-2 text-xs text-sub underline">+ Tambah baris biaya</button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
          <p>
            Total biaya: <b>{rupiah(total)}</b> · HS hari ini: <b>{rupiah(hs)}</b>
            {item && <span className="text-sub"> (AHSP {rupiah(item.hs_ahsp)})</span>}
          </p>
          <button disabled={kirim} className="rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {kirim ? 'Menyimpan…' : 'Simpan & Evaluasi'}
          </button>
        </div>
        {galat && (
          <div className="rounded-md border border-line p-3 text-xs">
            <p className="font-semibold">Gagal: {galat.pesan}</p>
            {galat.rinci && <ul className="list-disc pl-5">{galat.rinci.map((g) => <li key={g.field}>{g.field}: {g.pesan}</li>)}</ul>}
          </div>
        )}
      </form>
      <div className="lg:col-span-2">
        {hasil ? <DecisionPanel keputusan={hasil} satuan={item?.satuan} /> : (
          <p className="rounded-lg border border-line bg-panel p-4 text-xs text-sub">Setelah disimpan, Decision Engine langsung mengevaluasi ulang item ini dan hasilnya tampil di sini.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs text-sub">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
