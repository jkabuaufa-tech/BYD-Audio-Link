'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { angka } from '../../lib/format';

const ukuran = (b) => (b == null ? '—' : b > 1048576 ? `${angka(b / 1048576, 1)} MB` : `${angka(b / 1024, 1)} KB`);
const waktu = (s) => (s ? new Date(s).toLocaleString('id-ID') : '—');

/** Pengaturan › Pembaruan, Versi & Backup (aplikasi desktop). */
export default function Pengaturan() {
  const [info, setInfo] = useState(null);
  const [backup, setBackup] = useState(null);
  const [tidakTersedia, setTidakTersedia] = useState(false);
  const [paket, setPaket] = useState(null); // { nama, teks, periksa }
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState(null);
  const [perluMulaiUlang, setPerluMulaiUlang] = useState(false);

  const muat = useCallback(async () => {
    try {
      const [i, b] = await Promise.all([api.sistemInfo(), api.daftarBackup()]);
      setInfo(i);
      setBackup(b);
    } catch {
      setTidakTersedia(true);
    }
  }, []);
  useEffect(() => { muat(); }, [muat]);

  async function pilihBerkas(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setPesan(null);
    setProses(true);
    try {
      const teks = await f.text();
      const periksa = await api.periksaPaket(teks).catch((err) => err.body || { ok: false, galat: [err.message] });
      setPaket({ nama: f.name, teks, periksa });
    } finally {
      setProses(false);
    }
  }

  async function pasang() {
    setProses(true);
    setPesan(null);
    try {
      const r = await api.pasangPaket(paket.teks);
      setPesan({ teks: `Versi ${r.ringkasan.versi} terpasang. Backup database dibuat (${r.backup}). Mulai ulang aplikasi untuk memakai versi baru.` });
      setPaket(null);
      setPerluMulaiUlang(true);
      await muat();
    } catch (err) {
      setPesan({ galat: true, teks: [err.message, ...(err.galat || [])].join(' · ') });
    } finally {
      setProses(false);
    }
  }

  async function mulaiUlang() {
    setProses(true);
    setPesan({ teks: 'Memulai ulang aplikasi…' });
    await api.mulaiUlang().catch(() => {});
    // Tunggu server hidup kembali, lalu muat ulang halaman.
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try { await api.sistemInfo(); window.location.reload(); return; } catch { /* belum siap */ }
    }
    setProses(false);
  }

  async function kembalikan(versi) {
    if (!window.confirm(`Kembalikan aplikasi ke versi ${versi}? Data tidak berubah.`)) return;
    try {
      await api.kembalikanVersi(versi);
      setPerluMulaiUlang(true);
      setPesan({ teks: `Versi ${versi} dipilih. Mulai ulang aplikasi untuk menerapkan.` });
      await muat();
    } catch (err) {
      setPesan({ galat: true, teks: err.message });
    }
  }

  async function backupSekarang() {
    try {
      const b = await api.buatBackup();
      setPesan({ teks: `Backup dibuat: ${b.berkas}` });
      await muat();
    } catch (err) {
      setPesan({ galat: true, teks: err.message });
    }
  }

  if (tidakTersedia) {
    return <p className="rounded-lg border border-line bg-panel p-4 text-sm">Pembaruan & backup hanya tersedia di aplikasi desktop SEPS.</p>;
  }
  if (!info) return <p className="text-sm text-sub">Memuat…</p>;

  const kartu = 'rounded-lg border border-line bg-panel p-4';
  const tombol = 'rounded-md border border-line px-3 py-1.5 text-sm hover:bg-[var(--grid)] disabled:opacity-60';
  const tombolUtama = 'rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60';
  const cek = paket?.periksa;

  return (
    <div className="space-y-4">
      {pesan && (
        <div className={`${kartu} text-sm ${pesan.galat ? 'text-[var(--status-critical)]' : ''}`}>
          {pesan.teks}
          {perluMulaiUlang && !proses && <button type="button" onClick={mulaiUlang} className={`${tombolUtama} ml-3`}>Mulai ulang sekarang</button>}
        </div>
      )}

      <section className={kartu}>
        <h1 className="mb-3 text-sm font-semibold">Versi aplikasi</h1>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
          <div><dt className="text-muted">Versi berjalan</dt><dd className="text-base font-semibold">{info.versi}</dd></div>
          <div><dt className="text-muted">Versi installer</dt><dd className="font-medium">{info.versi_shell}</dd></div>
          <div><dt className="text-muted">Berjalan sejak</dt><dd className="font-medium">{waktu(info.mulai_pada)}</dd></div>
          <div className="sm:col-span-3"><dt className="text-muted">Folder data</dt><dd className="break-all font-medium">{info.folder_data}</dd></div>
          <div><dt className="text-muted">Ukuran database</dt><dd className="font-medium">{ukuran(info.ukuran_db)}</dd></div>
          <div><dt className="text-muted">Produksi harian · biaya</dt><dd className="font-medium">{angka(info.jumlah_data.produksi_harian)} · {angka(info.jumlah_data.biaya_aktual)} baris</dd></div>
          <div><dt className="text-muted">Harga Beli Jadi</dt><dd className="font-medium">{angka(info.jumlah_data.harga_beli_jadi)} baris</dd></div>
        </dl>
      </section>

      <section className={kartu}>
        <h2 className="mb-1 text-sm font-semibold">Pembaruan aplikasi</h2>
        <p className="mb-3 text-xs text-sub">
          Unggah berkas <code>seps-pembaruan-x.y.z.json</code>. Paket diperiksa dahulu (keutuhan, versi, dan migrasi database hanya boleh
          <b> menambah</b>), database di-backup, lalu versi baru aktif setelah mulai ulang. Data yang sudah ada tidak diubah.
        </p>
        <label className={`${tombol} inline-block cursor-pointer`}>
          {proses ? 'Memproses…' : 'Pilih berkas paket (.json)'}
          <input type="file" accept=".json,application/json" className="hidden" onChange={pilihBerkas} disabled={proses} />
        </label>

        {paket && (
          <div className="mt-4 rounded-md border border-line p-3 text-xs">
            <p className="mb-2 font-semibold">{paket.nama}</p>
            {cek?.ringkasan && (
              <ul className="mb-2 space-y-0.5">
                <li>Versi: <b>{info.versi} → {cek.ringkasan.versi}</b>{cek.ringkasan.tanggal ? ` (${cek.ringkasan.tanggal})` : ''}</li>
                <li>Isi: {cek.ringkasan.jumlah_berkas} berkas, {ukuran(cek.ringkasan.ukuran)}</li>
                <li>Perubahan database: {cek.ringkasan.migrasi_baru.length ? `${cek.ringkasan.migrasi_baru.join(', ')} (hanya menambah tabel/kolom/data baru)` : 'tidak ada'}</li>
                {cek.ringkasan.catatan && <li className="whitespace-pre-line">Catatan: {cek.ringkasan.catatan}</li>}
              </ul>
            )}
            {cek?.ok ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>✓ Paket lolos pemeriksaan.</span>
                <button type="button" onClick={pasang} disabled={proses} className={tombolUtama}>Pasang versi {cek.ringkasan.versi}</button>
                <button type="button" onClick={() => setPaket(null)} className={tombol}>Batal</button>
              </div>
            ) : (
              <div className="text-[var(--status-critical)]">
                <p className="font-semibold">▲ Paket ditolak — tidak ada yang diubah:</p>
                <ul className="list-disc pl-5">{(cek?.galat || []).map((g) => <li key={g}>{String(g)}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <h3 className="mb-1 mt-5 text-xs font-semibold text-sub">Riwayat pembaruan</h3>
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-line">
              <td className="py-1.5 pr-2">Bawaan installer</td>
              <td className="py-1.5 pr-2 text-muted">versi installer {info.versi_shell}</td>
              <td className="py-1.5 text-right">
                {info.kode_bawaan
                  ? <span className="font-medium">✓ berjalan</span>
                  : <button type="button" className="underline" onClick={() => kembalikan('bawaan')}>Kembalikan ke bawaan</button>}
              </td>
            </tr>
            {[...info.riwayat_pembaruan].reverse().map((r) => {
              const berjalan = !info.kode_bawaan && info.versi === r.versi;
              const gagal = info.pembaruan_gagal[r.versi];
              return (
                <tr key={r.versi} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-2 font-medium">{r.versi}</td>
                  <td className="py-1.5 pr-2 text-muted">
                    dipasang {waktu(r.dipasang)}
                    {gagal && <span className="block text-[var(--status-critical)]">▲ gagal dijalankan ({waktu(gagal.waktu)}): {gagal.pesan}</span>}
                  </td>
                  <td className="py-1.5 text-right">
                    {berjalan && <span className="font-medium">✓ berjalan</span>}
                    {!berjalan && !gagal && info.versi_terpasang.includes(r.versi) && (
                      <button type="button" className="underline" onClick={() => kembalikan(r.versi)}>Pakai versi ini</button>
                    )}
                    {!berjalan && gagal && <span className="text-muted">unggah ulang paket untuk mencoba lagi</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className={kartu}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Backup database</h2>
          <button type="button" onClick={backupSekarang} className={tombol}>Backup sekarang</button>
        </div>
        <p className="mb-2 text-xs text-sub">Otomatis: harian (30 terakhir) dan sebelum setiap pembaruan. Folder: <span className="break-all">{backup?.folder}</span></p>
        <ul className="max-h-56 space-y-0.5 overflow-y-auto text-xs">
          {(backup?.berkas || []).map((b) => (
            <li key={b.nama} className="flex justify-between gap-2 border-b border-line py-1 last:border-0">
              <span className="break-all">{b.nama}</span>
              <span className="whitespace-nowrap text-muted">{ukuran(b.ukuran)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
