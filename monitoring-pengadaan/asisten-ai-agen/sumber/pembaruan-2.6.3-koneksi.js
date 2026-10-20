/* MP263 — PEMBARUAN 2.6.3: KONEKSI TAHAN GANGGUAN (aditif; konfirmasi simpanan butuh Modul server 1.9.1 · fitur "jejakSimpan")
 * Gejala: "Server mengirim halaman HTML, bukan data (HTTP 200). Script belum diotorisasi ulang … (Tes ping server juga gagal …)" muncul acak,
 * berhasil setelah dicoba berulang, dan simpanan "terlihat gagal" padahal tersimpan.
 * Sebab: bukan otorisasi — server selalu membalas JSON; halaman HTML datang dari Google saat jawaban terputus/tersendat sesaat.
 * Pada aksi SIMPAN script biasanya SUDAH berjalan sebelum jawabannya terputus.
 * 1. SIMPAN yang jawabannya terputus → aplikasi menanyakan Log server (x191Jejak): bila sudah tercatat → "SUDAH TERSIMPAN" + data dimuat ulang
 *    (tidak perlu & tidak boleh disimpan lagi); bila belum tercatat → dikirim ulang otomatis SEKALI (aman, belum dijalankan).
 * 2. BACA yang gagal → dicoba lagi 2× tambahan (5 & 10 detik) dengan penanda kecil, setelah 2× ulang bawaan 2.5.9.
 * 3. Pesan galat jujur: bila server baru saja berhasil menjawab, pesan tidak lagi menyuruh otorisasi ulang / ganti URL.
 * 4. Pembacaan latar saat masuk aplikasi dijarangkan (Data Vendor WAVE dimuat per halaman & ditunda) agar tidak berebut dengan data utama. */
(function () {
  'use strict';
  if (window.__MP263__) return; window.__MP263__ = true;
  const rp = window.regPost; if (typeof rp !== 'function') return;
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const jeda = ms => new Promise(r => setTimeout(r, ms));
  const teks = x => String(x && x.message || x || '');
  const rusak = s => /halaman HTML|unable to open|tidak dapat membuka|Koneksi ke server terputus|Failed to fetch|NetworkError|Load failed|network error/i.test(s);
  const BACA = /^(login|baca|bacaSemua|adminData|bacaMasterTambahan|bacaAlokasiBon|bacaPembaruanAdmin|ambilKandidatPembaruan|checklistBaca|checklistRingkas|ambilBerkas|arsipBaca|manifestBaca|diagServer|modulInfo|gudangBaca|gudangBacaHal|identitasBaca|gudangImporCek|notifInfo|aiInfo|vtInfo|vtRingkas|vtBaca|vtBundelBaca|timInfo|timRingkas|hadirDetak|hadirDaftar|wvInfo|wvDaftar|x186Kurang|x186Audit|x191Jejak)$/;
  const LAMA = /^(ai|vt|tim)/, TOLAK = /DITOLAK|TERKUNCI|GAGAL|TOLAK/i, BOROS = /maximum execution time|waktu eksekusi/i;
  const K = { okPada: 0, selisih: null, dipulihkan: 0, diulang: 0, dibaca: 0 };
  window.MP263_KONEKSI = K;
  const status = t => { try { if (window.mp261Status) window.mp261Status(t); } catch (e) { } };
  const menit = ms => { const m = Math.round(ms / 60000); return m < 1 ? 'kurang dari 1 menit' : m + ' menit'; };
  function jujur(pesan) {   // pesan galat tanpa saran yang menyesatkan bila server baru saja berhasil menjawab
    if (!rusak(pesan) || !K.okPada || Date.now() - K.okPada > 6 * 3600e3) return pesan;
    return pesan.replace(/\s*Script belum diotorisasi ulang → buka editor Apps Script, jalankan fungsi setup lalu Izinkan\./, ' Google mengirim halaman galat sesaat, bukan jawaban server.')
      .replace(/\s*Server Google mengalami galat saat memproses \(perbarui server ke Code\.gs 2\.4\.2 agar galat tampil jelas\)\./, ' Google mengirim halaman galat sesaat, bukan jawaban server.')
      .replace(/\s*\(Tes ping server juga gagal → [^)]*\)/, '')
      + ' — Server & otorisasi BAIK (jawaban berhasil terakhir ' + menit(Date.now() - K.okPada) + ' lalu); koneksi ke Google tersendat sesaat' + (navigator.onLine === false ? ' (perangkat sedang offline)' : '') + '.';
  }
  async function kirim(ctx, args) {   // satu panggilan: kembalikan {r} atau {g}
    try { const r = await rp.apply(ctx, args); if (!(r && r.ok === false && rusak(teks(r.error)))) K.okPada = Date.now(); return { r }; }
    catch (g) { return { g }; }
  }
  const gagalRusak = h => h.g ? rusak(teks(h.g)) : !!(h.r && h.r.ok === false && rusak(teks(h.r.error)));
  const pesanDari = h => h.g ? teks(h.g) : teks(h.r && h.r.error);
  async function jejak(sesi, sejak) {
    const r = await rp.call(window, { action: 'x191Jejak', nama: sesi.nama, pin: sesi.pin, proyek: (typeof PROYEK !== 'undefined' && PROYEK.id) || sesi.proyek, data: { sejak } });
    if (!r || !r.ok) throw new Error(teks(r && r.error) || 'x191Jejak gagal');
    if (r.server) K.selisih = Date.parse(r.server) - Date.now();
    return r.data || [];
  }
  function cocok(L, body) {
    const d = (body && body.data) || {}, id = String(d.id || body.id || ''), no = String(d.noKontrak || d.nomor || d.kode || body.noKontrak || '');
    return L.find(l => (id && l.id === id) || (no && (l.noKontrak === no || l.id === no))) || (!id && !no ? L[0] : null);
  }
  async function pastikan(body, t0) {   // sudah tercatat di Log server sejak t0?
    if (!srv('jejakSimpan') || !REG.sesi) return null;
    const sejak = new Date(t0 + (K.selisih || 0) - 15000).toISOString();
    for (const tunggu of [1500, 3500]) {
      await jeda(tunggu);
      try { const c = cocok(await jejak(REG.sesi, sejak), body); if (c) return c; } catch (e) { return null; }   // Log tak terbaca → jangan menebak
    }
    return false;
  }
  function tersimpan(body, c) {
    K.dipulihkan++;
    try { if (typeof window.muatRegister === 'function') window.muatRegister(true); } catch (e) { }
    const w = new Date(c.waktu); const jam = isNaN(w) ? '' : w.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { ok: false, tersimpan: true, error: '✓ SUDAH TERSIMPAN di server (tercatat di Log' + (jam ? ' pukul ' + jam : '') + ': ' + c.aksi + (c.noKontrak ? ' · ' + c.noKontrak : '') + '). Jawaban Google terputus sesaat sehingga tampak gagal — data dimuat ulang otomatis, JANGAN simpan lagi.' };
  }
  window.regPost = async function (body) {
    const a = body && body.action;
    if (!a || typeof REG === 'undefined' || !REG.url || LAMA.test(a) || a === 'x191Jejak') {
      const h = await kirim(this, arguments); if (h.g) throw h.g; return h.r;
    }
    const baca = BACA.test(a), t0 = Date.now();
    let h = await kirim(this, arguments);
    if (!gagalRusak(h)) { if (h.g) throw h.g; return h.r; }
    if (baca) {   // 2.5.9 sudah mengulang 2×; tambah 2× dengan jeda lebih panjang
      for (const [i, ms] of [[1, 5000], [2, 10000]]) {
        if (navigator.onLine === false) break;
        status('Koneksi ke Google tersendat — memuat ulang otomatis (' + i + '/2)…'); K.dibaca++;
        await jeda(ms); h = await kirim(this, arguments);
        if (!gagalRusak(h)) { status(null); if (h.g) throw h.g; return h.r; }
      }
      status(null);
    } else if (!BOROS.test(pesanDari(h))) {   // SIMPAN: pastikan lewat Log, baru putuskan
      status('Jawaban server terputus — memastikan apakah sudah tersimpan…');
      const c = await pastikan(body, t0);
      if (c && TOLAK.test(c.aksi)) { status(null); return { ok: false, error: 'Ditolak server (' + c.aksi + '): ' + (c.detail || '-') + ' — data BELUM tersimpan.' }; }
      if (c) { status(null); return tersimpan(body, c); }
      if (c === false && navigator.onLine !== false) {   // belum tercatat → belum dijalankan → aman dikirim ulang sekali
        K.diulang++; status('Belum tercatat di server — mengirim ulang sekali…');
        const t1 = Date.now(); h = await kirim(this, arguments);
        if (gagalRusak(h)) { const c2 = await pastikan(body, t1); if (c2 && TOLAK.test(c2.aksi)) { status(null); return { ok: false, error: 'Ditolak server (' + c2.aksi + '): ' + (c2.detail || '-') + ' — data BELUM tersimpan.' }; } if (c2) { status(null); return tersimpan(body, c2); } }
        status(null);
        if (!gagalRusak(h)) { if (h.g) throw h.g; return h.r; }
        return { ok: false, error: jujur(pesanDari(h)) + ' Data ini BELUM tersimpan (tidak ada catatan di Log server) — isian tetap di layar, klik Simpan lagi.' };
      }
      status(null);
    }
    const p = jujur(pesanDari(h));
    if (h.g) { const x = new Error(p); x.html = h.g.html; x.jaringan = h.g.jaringan; throw x; }
    return Object.assign({}, h.r, { error: p });
  };
  setTimeout(() => { try { if (REG.url && REG.sesi && srv('jejakSimpan')) jejak(REG.sesi, new Date().toISOString()).catch(() => { }); } catch (e) { } }, 12000);   // ukur selisih jam perangkat ↔ server sekali
})();
