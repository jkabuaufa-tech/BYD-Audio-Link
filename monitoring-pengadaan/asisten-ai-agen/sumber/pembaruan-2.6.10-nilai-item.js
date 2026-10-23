/* MP2610 — PEMBARUAN 2.6.10: NILAI KONTRAK Rp 0 → JUMLAH HARGA ITEM (aditif; tanpa perubahan server & data)
 *  Gejala: 027/SPM Putra Paloh — BAPM & Input Progres sudah 100% (Rp 40.877.000), tetapi Dashboard / Rekap Seluruh Kontrak
 *  menampilkan "Nilai Rp 0 · Tagihan Rp 40,9 Juta · 0%" dan notifikasi masih "Lewat". Sebab: kontrak tujuan Perbaikan Register
 *  (2.6.0) hanya diberi nilai bila jumlah item kontrak sumber cocok dengan nilai header Excel; bila tidak cocok (mis. kontrak
 *  sumber DRAFT bernilai header 0) nilainya 0 → persen tagihan = realisasi / 0 = 0%. Kontrak DRAFT Master bernilai header 0
 *  (mis. No 70 Koperasi Karyawan PT Nindya, item Rp 204 jt) mengalami hal yang sama.
 *  Kini setiap kontrak di ringkasan yang nilainya ≤ 0 tetapi itemnya berharga memakai JUMLAH HARGA ITEM (volume × harga satuan —
 *  rumus yang sama dengan kolom Jumlah Harga BAPM), lalu progres & status dihitung ulang dari nilai itu. Nilai yang sudah > 0
 *  (Excel, koreksi, isian manual Perbaikan Register) tidak diubah. Berjalan setelah lapisan 2.6.0 & 2.6.7. */
(function () {
  'use strict';
  if (window.__MP2610__) return;
  window.__MP2610__ = true;
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const volIt = it => N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak ?? it.vol);
  const hargaIt = it => N(it.hargaSatuanEfektif ?? it.hargaSatuan ?? it.harga ?? it.hargaKontrak);
  const nilaiIt = it => volIt(it) * hargaIt(it) || N(it.jumlahHarga || it.nilaiKontrakEfektif || it.nilai || it.jumlah);
  function terapkan(hasil) {
    if (!Array.isArray(hasil)) return hasil;
    hasil.forEach(g => {
      if (!g) return;
      if (g._mp2610 && N(g.nilai) === g._mp2610.nilai) g.nilai = 0;   // objek ringkasan dipakai ulang: hitung ulang dari item terkini
      delete g._mp2610;
      if (N(g.nilai) > 0) return;
      const n = (g.items || []).reduce((s, it) => s + (it ? nilaiIt(it) : 0), 0);
      if (!(n > 0)) return;
      g.nilai = n; g._mp2610 = { nilai: n };
      const r = N(g.realisasi);
      g.progres = Math.min(r / n, 1);
      if (r >= n - Math.max(1000, n * 0.0001)) { if (['berjalan', 'proses', 'draf', ''].indexOf(String(g.statusKey || '')) >= 0) g.statusKey = 'selesai'; }
      else if (r > 0 && ['proses', 'draf', ''].indexOf(String(g.statusKey || '')) >= 0) g.statusKey = 'berjalan';
    });
    return hasil;
  }
  window.mp2610Terapkan = terapkan;
  window.mp2610NilaiDariItem = g => !!(g && g._mp2610);
  const _ring = window.getRingkasanKontrak;
  if (typeof _ring === 'function') window.getRingkasanKontrak = function () { const h = _ring.apply(this, arguments); try { return terapkan(h); } catch (e) { console.warn('[2.6.10] nilai dari item', e); return h; } };
  try { if (typeof RINGKASAN !== 'undefined' && Array.isArray(RINGKASAN) && RINGKASAN.length) terapkan(RINGKASAN); } catch (e) { }
})();
