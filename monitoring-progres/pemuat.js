/* =====================================================================
 * PEMUAT (loader) – bagian tetap di Netlify, jarang berubah.
 * Menjalankan versi aplikasi TERBARU:
 *   - versi bawaan  : file statis sinkron.js + app.js + styles.css di Netlify
 *   - versi pembaruan: paket dari file "jiat-pembaruan-x.y.z.json" yang dipasang
 *     MANAJEMEN; disimpan di server (Google Sheet) & di perangkat (localStorage)
 * Aturan:
 *   - Mode server: server adalah sumber kebenaran. Perangkat mengunduh paket bila
 *     versi server berbeda (lebih baru ATAU rollback), menghapusnya bila server
 *     kembali ke bawaan. Saat offline dipakai paket terakhir di perangkat.
 *   - Paket yang gagal dijalankan 2× berturut-turut otomatis dilewati
 *     (kembali ke versi bawaan) supaya aplikasi tidak pernah "mati".
 *   - Darurat: buka URL dengan ?bawaan untuk memaksa versi bawaan.
 * ===================================================================== */
(function () {
  'use strict';
  var KEY = 'jiat-bundel-v1', KEY_BOOT = 'jiat-boot-v1', KEY_GAGAL = 'jiat-gagal-v1';
  var meta = document.querySelector('meta[name="jiat-versi"]');
  var BAWAAN = meta ? meta.content : '0.0.0';
  var API = String((window.JIAT_CONFIG || {}).API_URL || '').trim();

  function banding(a, b) {
    var x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number);
    for (var i = 0; i < 3; i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; }
    return 0;
  }
  function baca(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function tulis(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  async function sha(teks) {
    if (!window.crypto || !crypto.subtle) return null; // file:// tanpa konteks aman → lewati
    var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
    return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }
  /** Validasi paket aplikasi {versi, html, css, js:{sinkron, app}, sha256} */
  async function cekPaket(p) {
    if (!p || !p.versi || typeof p.html !== 'string' || typeof p.css !== 'string' || !p.js || typeof p.js.app !== 'string' || typeof p.js.sinkron !== 'string') throw new Error('Isi paket aplikasi tidak lengkap');
    if (p.sha256) {
      var bag = { html: p.html, css: p.css, sinkron: p.js.sinkron, app: p.js.app };
      for (var k in bag) { var h = await sha(bag[k]); if (h && p.sha256[k] && h !== p.sha256[k]) throw new Error('Paket rusak: SHA-256 "' + k + '" tidak cocok'); }
    }
    return true;
  }

  function sisip(kode) { var s = document.createElement('script'); s.textContent = kode; document.body.appendChild(s); }
  function sisipSrc(src) { var s = document.createElement('script'); s.src = src; s.async = false; document.body.appendChild(s); }

  function bar(html, tombol) {
    var el = document.getElementById('jiatBarPembaruan');
    if (!el) {
      el = document.createElement('div'); el.id = 'jiatBarPembaruan';
      el.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:70;background:#0f172a;color:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:13px system-ui,sans-serif;display:flex;gap:10px;align-items:center;max-width:94vw';
      document.body.appendChild(el);
    }
    el.innerHTML = '<span>' + html + '</span>';
    if (tombol) { var b = document.createElement('button'); b.textContent = tombol[0]; b.style.cssText = 'background:#0284c7;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer'; b.onclick = tombol[1]; el.appendChild(b); }
  }

  /* ---------- Pilih versi yang dijalankan ---------- */
  var paksaBawaan = /[?&]bawaan\b/.test(location.search);
  var paket = paksaBawaan ? null : baca(KEY);
  var gagal = baca(KEY_GAGAL) || {};
  var boot = baca(KEY_BOOT);
  if (paket && boot && boot.versi === paket.versi) {
    boot.n = (boot.n || 0) + 1;
    if (boot.n >= 2) { gagal[paket.versi] = true; tulis(KEY_GAGAL, gagal); paket = null; tulis(KEY_BOOT, null); setTimeout(function () { bar('Pembaruan gagal dijalankan; aplikasi kembali ke versi bawaan ' + BAWAAN + '. Hubungi admin.'); }, 1500); }
  }
  var pakai = !!(paket && !gagal[paket.versi] && paket.html && paket.js);

  var api = {
    bawaan: BAWAAN,
    versi: pakai ? paket.versi : BAWAAN,
    sumber: pakai ? 'pembaruan' : 'bawaan',
    banding: banding,
    cekPaket: cekPaket,
    sha: sha,
    /** Simpan paket aplikasi di perangkat (dipanggil setelah pemasangan / unduhan). */
    simpan: async function (p) { await cekPaket(p); delete gagal[p.versi]; tulis(KEY_GAGAL, gagal); if (!tulis(KEY, p)) throw new Error('Penyimpanan perangkat penuh'); },
    hapus: function () { tulis(KEY, null); },
    /** Dipanggil app.js setelah berhasil dijalankan. */
    sukses: function () { tulis(KEY_BOOT, null); },
    periksa: periksaServer,
  };
  window.JIAT_PEMUAT = api;

  if (pakai) {
    tulis(KEY_BOOT, { versi: paket.versi, n: boot && boot.versi === paket.versi ? boot.n : 0 });
    var cssLama = document.getElementById('cssBawaan'); if (cssLama) cssLama.disabled = true;
    var st = document.createElement('style'); st.id = 'cssPaket'; st.textContent = paket.css; document.head.appendChild(st);
    document.body.innerHTML = paket.html;
    sisip(paket.js.sinkron);
    sisip(paket.js.app);
  } else {
    sisipSrc('sinkron.js');
    sisipSrc('app.js');
  }

  /* ---------- Cek versi di server (mode server) ---------- */
  async function panggil(aksi) {
    var r = await fetch(API, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ aksi: aksi }) });
    return JSON.parse(await r.text());
  }
  var sedang = false;
  async function periksaServer(diam) {
    if (!API || sedang || !navigator.onLine || paksaBawaan) return null;
    sedang = true;
    try {
      var info = await panggil('infoVersi');
      if (!info || !info.ok) return null;
      var target = info.aplikasi; // null = server memakai versi bawaan
      if (!target || banding(target, BAWAAN) <= 0) {
        if (api.sumber === 'pembaruan' || baca(KEY)) { tulis(KEY, null); if (!diam || api.sumber === 'pembaruan') bar('Versi aplikasi diperbarui ke ' + BAWAAN + '.', ['Muat ulang', function () { location.reload(); }]); }
        return info;
      }
      if (target === api.versi || gagal[target]) return info;
      var p = await panggil('ambilAplikasi');
      if (!p || !p.ok) return info;
      await api.simpan(p.paket);
      bar('Versi baru <b>' + target + '</b> siap dipakai.', ['Muat ulang sekarang', function () { location.reload(); }]);
      return info;
    } catch (e) { console.warn('Cek pembaruan gagal:', e); return null; }
    finally { sedang = false; }
  }
  if (API) {
    setTimeout(function () { periksaServer(true); }, 2500);
    setInterval(function () { periksaServer(true); }, 30 * 60 * 1000);
    window.addEventListener('online', function () { periksaServer(true); });
  }
})();
