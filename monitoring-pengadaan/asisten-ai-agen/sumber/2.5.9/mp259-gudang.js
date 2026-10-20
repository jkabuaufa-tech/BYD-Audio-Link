
/* MP259 — PEMBARUAN 2.5.9: data gudang dimuat BERTAHAP (aditif, baca saja).
 * Masalah: "Data gudang gagal dimuat: Server mengirim halaman HTML, bukan data (HTTP 404) … Halaman Tidak Ditemukan Drive".
 * gudangBaca mengirim seluruh transaksi gudang dalam satu respons; bila data gudang besar, Google menampilkan halaman Drive 404
 * walau deployment aktif & aksi lain berjalan. Kini (bila server punya modul 1.8.7 / fitur gudangHalaman) data dibaca per halaman
 * lewat gudangBacaHal, tiap halaman diulang otomatis & diperkecil bila gagal. Server lama → gudangBaca lama + diagnosis yang tepat.
 * Tidak ada aksi tulis; data gudang di Google Sheets tidak disentuh. */
(function () {
  'use strict';
  if (window.__MP259__) return;
  window.__MP259__ = true;
  const ra = window.regAksi;
  if (typeof ra !== 'function') return;
  const G = { url: '', dukung: null, batas: 250, info: null, terakhir: null };   // dukung: null = belum diketahui · true = gudangBacaHal ada · false = server lama
  window.MP259_GUDANG = G;
  const MIN = 25;
  const jeda = ms => new Promise(r => setTimeout(r, ms));
  const pesanDari = e => String(e && e.message || e || '');
  const rusak = e => /halaman HTML|unable to open|tidak dapat membuka|terputus|Failed to fetch|NetworkError|Load failed|Unexpected token|not valid JSON/i.test(pesanDari(e));
  const tanpaAksi = e => /tidak dikenal|modul server yang sedang tidak aktif/i.test(pesanDari(e));
  const ribu = n => Number(n || 0).toLocaleString('id-ID');
  async function ping() {   // server benar-benar aktif? (GET ringan, tanpa data)
    try {
      const r = await fetch(REG.url + (REG.url.includes('?') ? '&' : '?') + 'action=ping&t=' + Date.now(), { cache: 'no-store', redirect: 'follow' });
      const j = JSON.parse(await r.text()); return j && j.ok ? j : null;
    } catch (e) { return null; }
  }
  async function halaman(ctx, jenis, mulai) {
    let galat = null;
    for (let n = 0; n < 6; n++) {
      try { return await ra.call(ctx, 'gudangBacaHal', { jenis, mulai, batas: G.batas }); }
      catch (e) {
        galat = e; if (!rusak(e)) throw e;
        if (n >= 1 && G.batas > MIN) G.batas = Math.max(MIN, Math.floor(G.batas / 2));   // respons masih terlalu besar → halaman diperkecil
        await jeda(700 * (n + 1));
      }
    }
    const x = new Error(pesanDari(galat)); x.rusak = true; x.halaman = { jenis, mulai }; throw x;
  }
  async function semua(ctx, jenis) {
    const out = []; let m = 0, total = 0, r = null;
    for (let p = 0; p < 5000; p++) {
      r = await halaman(ctx, jenis, m);
      (r.data || []).forEach(x => out.push(x)); total = Number(r.total) || 0;
      if (r.selesai || !(Number(r.berikut) > m)) break;
      m = Number(r.berikut);
    }
    return { data: out, total, versiServer: r && r.versiServer };
  }
  async function jelaskan(e, bertahap) {
    const m = pesanDari(e); if (!rusak(e)) return e;
    const p = await ping(); G.info = p;
    if (!p) return new Error(m + ' (Tes ping server juga gagal → alamat /exec tidak valid atau deployment diarsipkan: Admin buka Koneksi server, tempel URL /exec terbaru dari Apps Script › Terapkan › Kelola deployment.)');
    const sv = 'Server AKTIF (v' + (p.versiServer || '?') + (p.modul && p.modul.versi ? ', modul ' + p.modul.versi : '') + ') dan aksi lain berjalan; ';
    if (!bertahap) return new Error(sv + 'yang gagal hanya pengiriman data gudang sekaligus (respons terlalu besar → Google menampilkan halaman Drive 404). Admin penerbit: buka menu akun › Diagnostik sistem › tab Modul, unggah server-modul-1.8.7.json › uji › terbitkan (tanpa deployment ulang), agar data gudang dimuat bertahap. Data gudang di Google Sheets AMAN dan tidak berubah.');
    const h = e.halaman || {};
    return new Error(sv + 'namun halaman data gudang ' + (h.jenis || '') + ' mulai baris ' + ribu((h.mulai || 0) + 1) + ' tetap gagal setelah diulang otomatis (ukuran halaman ' + G.batas + ' baris). Klik Coba lagi beberapa saat lagi. Data gudang AMAN dan tidak berubah. Detail: ' + m.slice(0, 220));
  }
  window.regAksi = async function (aksi, extra) {
    if (aksi !== 'gudangBaca' || !REG.url || (extra && (extra.jenis || extra.cari || extra.batas))) return ra.apply(this, arguments);
    if (G.url !== REG.url) { G.url = REG.url; G.dukung = null; G.batas = 250; }
    const ctx = this, args = arguments;
    const lama = async () => { try { return await ra.apply(ctx, args); } catch (e) { throw await jelaskan(e, false); } };
    if (G.dukung === false) return lama();
    let masuk;
    try { masuk = await semua(ctx, 'masuk'); }
    catch (e) {
      if (tanpaAksi(e)) { G.dukung = false; console.info('[2.5.9] server belum punya gudangBacaHal (modul < 1.8.7) → gudangBaca lama.'); return lama(); }
      throw await jelaskan(e, true);
    }
    G.dukung = true;
    let keluar; try { keluar = await semua(ctx, 'keluar'); } catch (e) { throw await jelaskan(e, true); }
    G.terakhir = { pada: new Date().toISOString(), masuk: masuk.total, keluar: keluar.total, batas: G.batas };
    return { ok: true, versiServer: keluar.versiServer || masuk.versiServer, masuk: masuk.data, keluar: keluar.data, bertahap: true };
  };
})();
