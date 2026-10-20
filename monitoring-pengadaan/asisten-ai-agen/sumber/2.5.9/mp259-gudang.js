
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
    for (let n = 0; n < 4; n++) {   // tiap percobaan sudah diulang di lapisan regPost (bagian B)
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
      (Array.isArray(r.data) ? r.data : []).forEach(x => out.push(x)); total = Number(r.total) || 0;
      if (r.selesai || !(Number(r.berikut) > m)) break;
      m = Number(r.berikut);
    }
    return { data: out, total, versiServer: r && r.versiServer };
  }
  async function jelaskan(e, bertahap) {
    const m = pesanDari(e); if (!rusak(e)) return e;
    if (/Server AKTIF|Tes ping server/.test(m)) return bertahap ? e : new Error(m + ' Bila galat hanya muncul di menu gudang: unggah server-modul-1.8.7.json (menu akun › Diagnostik sistem › tab Modul) agar data gudang dimuat bertahap.');   // sudah diperjelas bagian B
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

/* MP259 bagian B — PEMBARUAN 2.5.9: permintaan server tahan gangguan sesaat Google (aditif).
 * Gejala: "Server mengirim halaman HTML, bukan data (HTTP 404 … Halaman Tidak Ditemukan Drive)" atau "(HTTP 200) … otorisasi" muncul
 * acak pada aksi apa pun (status modul, gudang, …) padahal server aktif & aksi lain berhasil. Google kadang menolak permintaan saat
 * banyak permintaan berjalan bersamaan. Kini: (1) maksimal 4 permintaan bersamaan (antrean), (2) aksi BACA diulang otomatis 2× (jeda 1,5 s & 4 s),
 * (3) aksi TULIS tidak pernah diulang otomatis (cegah data ganda), (4) bila tetap gagal → ping server: pesan menyebut sebab sebenarnya.
 * Aksi AI berbiaya (aiTanya, vtBundel, vtEkstrak, timJalan, …) tidak diantrekan & tidak diulang. */
(function () {
  'use strict';
  if (window.__MP259B__) return;
  window.__MP259B__ = true;
  const rp = window.regPost;
  if (typeof rp !== 'function') return;
  const MAKS = 4, JEDA = [1500, 4000];
  const BACA = /^(login|baca|bacaSemua|adminData|bacaMasterTambahan|bacaAlokasiBon|bacaPembaruanAdmin|ambilKandidatPembaruan|checklistBaca|checklistRingkas|ambilBerkas|arsipBaca|manifestBaca|diagServer|modulInfo|gudangBaca|gudangBacaHal|identitasBaca|gudangImporCek|notifInfo|aiInfo|vtInfo|vtRingkas|vtBaca|vtBundelBaca|timInfo|timRingkas)$/;
  const LAMA = /^(ai|vt|tim)/;   // panggilan AI dapat berjalan lama → tidak menempati antrean
  const Q = { aktif: 0, antre: [], ulang: 0, ping: null, pingPada: 0 };
  window.MP259_ANTREAN = Q;
  const jeda = ms => new Promise(r => setTimeout(r, ms));
  const teks = x => String(x && x.message || x || '');
  const rusak = s => /halaman HTML|unable to open|tidak dapat membuka|Koneksi ke server terputus|Failed to fetch|NetworkError|Load failed/i.test(s);
  const masuk = () => new Promise(r => { if (Q.aktif < MAKS) { Q.aktif++; r(); } else Q.antre.push(r); });
  const keluar = () => { const n = Q.antre.shift(); if (n) n(); else Q.aktif--; };
  async function ping() {
    if (Date.now() - Q.pingPada < 30000) return Q.ping;
    let h = null;
    try { const r = await fetch(REG.url + (REG.url.includes('?') ? '&' : '?') + 'action=ping&t=' + Date.now(), { cache: 'no-store', redirect: 'follow' }); const j = JSON.parse(await r.text()); h = j && j.ok ? j : null; } catch (e) { h = null; }
    Q.ping = h; Q.pingPada = Date.now(); return h;
  }
  async function perjelas(pesan, baca, n) {
    if (!rusak(pesan) || /Server AKTIF|Tes ping server/.test(pesan)) return pesan;
    const p = await ping();
    if (!p) return pesan + ' (Tes ping server juga gagal → periksa internet, lalu Admin: Koneksi server › tempel URL /exec terbaru dari Apps Script › Terapkan › Kelola deployment.)';
    const inti = pesan.replace(/\s*(Alamat server tidak valid atau deployment diarsipkan → pakai URL \/exec terbaru\.|Script belum diotorisasi ulang → buka editor Apps Script, jalankan fungsi setup lalu Izinkan\.)/, '');
    return inti + ' — Server AKTIF (ping v' + (p.versiServer || '?') + (p.modul && p.modul.versi ? ' · modul ' + p.modul.versi : '') + ' berhasil), jadi alamat /exec & deployment BENAR; ini gangguan sesaat di Google. ' +
      (baca ? 'Sudah dicoba ulang otomatis ' + n + '×. Klik Coba lagi / Ping ulang beberapa saat lagi.' : 'Aksi simpan tidak diulang otomatis: muat ulang data dahulu untuk memastikan apakah sudah tersimpan sebelum menyimpan lagi.') +
      ' Bila berulang terus: Apps Script › Eksekusi (Executions) menampilkan sebab di server.';
  }
  window.regPost = async function (body) {
    const a = body && body.action;
    if (!REG.url || !a) return rp.apply(this, arguments);
    const baca = BACA.test(a), antre = !LAMA.test(a) || baca;
    if (antre) await masuk();
    try {
      let r = null, g = null, n = 0;
      for (; ; n++) {
        r = null; g = null;
        try { r = await rp.apply(this, arguments); } catch (e) { g = e; }
        const s = g ? teks(g) : (r && r.ok === false ? teks(r.error) : '');
        if (!baca || !rusak(s) || n >= JEDA.length) break;
        Q.ulang++; console.info('[2.5.9] ' + a + ': respons bukan data (' + s.slice(0, 60) + '…) → ulang ke-' + (n + 1));
        await jeda(JEDA[n]);
      }
      if (g) { const x = new Error(await perjelas(teks(g), baca, n)); x.html = g.html; x.jaringan = g.jaringan; throw x; }
      if (r && r.ok === false && r.error) r = Object.assign({}, r, { error: await perjelas(teks(r.error), baca, n) });
      return r;
    } finally { if (antre) keluar(); }
  };
})();
