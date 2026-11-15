/* Dimuat paling awal di <head> berkas aplikasi hasil impor (disisipkan pembungkus APK).
   Paket pembaruan (JICT_PEMBARUAN, ±4 MB) disimpan di berkas aplikasi, bukan localStorage — kuota localStorage WebView
   dapat menolaknya sehingga HP tetap menampilkan versi dasar. Saat paket PERTAMA kali diterima dari server, halaman
   dimuat ulang sekali agar tampilan terbaru langsung dipakai. */
(function () {
  var A = window.AndroidApp; if (!A || !A.bacaPaket || window.__apkAwal) return; window.__apkAwal = 1;
  var K = 'JICT_PEMBARUAN', P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem, cache;
  try { var lama = g.call(localStorage, K); if (lama) { A.simpanPaket(lama); r.call(localStorage, K); } } catch (e) { }
  function baca() { if (cache === undefined) { try { cache = A.bacaPaket() || null; } catch (e) { cache = null; } } return cache; }
  var versi = function (t) { try { return JSON.parse(t).versi || ''; } catch (e) { return ''; } };
  P.getItem = function (k) { if (this === localStorage && k === K) return baca(); return g.apply(this, arguments); };
  P.setItem = function (k, v) {
    if (this === localStorage && k === K) {
      var sebelum = baca(); v = String(v); A.simpanPaket(v); cache = v;
      var tanda = 'APK_MUAT_' + versi(v);
      try { if (!sebelum && !sessionStorage.getItem(tanda)) { sessionStorage.setItem(tanda, '1'); setTimeout(function () { location.reload(); }, 400); } } catch (e) { }
      return;
    }
    return s.apply(this, arguments);
  };
  P.removeItem = function (k) { if (this === localStorage && k === K) { A.hapusPaket(); cache = null; return; } return r.apply(this, arguments); };

  /* ---- diagnosa: bila paket pembaruan tidak aktif, tampilkan sebabnya + tombol coba lagi ---- */
  var D = { galat: [], tanda: '' };
  window.addEventListener('error', function (e) { if (e.message && D.galat.length < 4) D.galat.push(String(e.message) + ' @' + String(e.filename || '').split('/').pop().slice(0, 40) + ':' + (e.lineno || 0)); }, true);
  // APK baru = kesempatan baru: tanda "versi ini pernah gagal di perangkat ini" dihapus sekali per build
  try { var build = A.versi() + '#' + (A.kode ? A.kode() : ''); if (g.call(localStorage, 'APK_BUILD') !== build) { s.call(localStorage, 'APK_BUILD', build); r.call(localStorage, 'JICT_PEMB_GAGAL'); } } catch (e) { }
  var E = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function keadaan() {
    var o = { aktif: '', gagal: '', url: '', tanda: '', wv: (navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] || '?' };
    try { o.aktif = (PEMB.aktif && PEMB.aktif.versi) || ''; o.gagal = PEMB.gagal || ''; } catch (e) { o.gagal = 'pemuat pembaruan tidak ditemukan di berkas aplikasi'; }
    try { o.url = (REG && REG.url) || ''; } catch (e) { }
    try { o.tanda = g.call(localStorage, 'JICT_PEMB_GAGAL') || ''; } catch (e) { }
    return o;
  }
  function papan(isi, tombol) {
    var el = document.getElementById('apkDiag');
    if (!el) { el = document.createElement('div'); el.id = 'apkDiag'; el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483000;background:#0B2B54;color:#fff;border:1px solid #4C9BEA;border-left:4px solid #E3343F;border-radius:12px;padding:12px 14px;font:13px/1.45 system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.5);max-height:60vh;overflow:auto';
      document.body.appendChild(el); }
    el.innerHTML = isi + '<div style="display:flex;gap:8px;margin-top:10px">' + (tombol ? '<button type="button" id="apkDiagCoba" style="flex:1;padding:9px;border:0;border-radius:8px;background:#E3343F;color:#fff;font-weight:700">Coba lagi</button>' : '') + '<button type="button" id="apkDiagTutup" style="flex:1;padding:9px;border:1px solid rgba(255,255,255,.4);border-radius:8px;background:none;color:#fff">Tutup</button></div>';
    document.getElementById('apkDiagTutup').onclick = function () { el.remove(); };
    var c = document.getElementById('apkDiagCoba'); if (c) c.onclick = coba;
  }
  function rinci(o, tambahan) {
    var L = ['WebView ' + o.wv + ' · APK ' + (function () { try { return A.versi() + ' (' + A.kode() + ')'; } catch (e) { return '?'; } })(), 'Server: ' + (o.url && o.url !== '-' ? 'terhubung' : 'BELUM diatur')];
    if (o.gagal) L.push(o.gagal); if (o.tanda) L.push('Tanda gagal tersimpan: v' + o.tanda);
    if (D.galat.length) L.push('Galat: ' + D.galat.join(' | ')); if (tambahan) L.push(tambahan);
    return '<div style="font-size:11px;opacity:.85;margin-top:6px;word-break:break-word">' + L.map(E).join('<br>') + '</div>';
  }
  function periksa() {
    var o = keadaan(); if (o.aktif) return;
    if (!o.url || o.url === '-') return;   // tanpa server memang tidak ada pembaruan
    var lama = +o.wv < 80;
    papan('<b>Tampilan terbaru belum aktif di HP ini</b> — aplikasi berjalan dengan versi dasar.' + (lama ? '<br>Mesin browser HP (Android System WebView ' + E(o.wv) + ') terlalu lama; perbarui "Android System WebView" / Chrome lewat Play Store atau AppGallery, lalu buka lagi.' : '') + rinci(o), true);
  }
  function coba() {
    var o = keadaan(); try { r.call(localStorage, 'JICT_PEMB_GAGAL'); } catch (e) { }
    papan('Mengambil paket pembaruan dari server…' + rinci(o), false);
    fetch(o.url + (o.url.indexOf('?') >= 0 ? '&' : '?') + 'action=pembaruan&t=' + Date.now(), { redirect: 'follow', cache: 'no-store' }).then(function (x) { return x.text().then(function (t) { return { st: x.status, t: t }; }); }).then(function (x) {
      var j = null; try { j = JSON.parse(x.t); } catch (e) { }
      if (!j) return papan('<b>Server tidak menjawab dengan data</b> (HTTP ' + x.st + ', ' + x.t.length + ' karakter).' + rinci(keadaan(), x.t.slice(0, 120)), true);
      if (!j.ok || !j.data || !j.data.versi) return papan('<b>Server belum punya paket pembaruan aktif.</b> Admin mengunggahnya di Pengguna &amp; Proyek › Pembaruan.' + rinci(keadaan(), j.error || ''), true);
      papan('Paket ' + E(j.data.versi) + ' diterima (' + Math.round(x.t.length / 1024) + ' KB). Memasang…', false);
      cache = null; try { A.hapusPaket(); } catch (e) { }
      try { sessionStorage.removeItem('APK_MUAT_' + j.data.versi); } catch (e) { }
      localStorage.setItem(K, JSON.stringify(j.data));   // → disimpan ke berkas + muat ulang sekali
    }).catch(function (e) { papan('<b>Gagal menghubungi server:</b> ' + E(e && e.message || e) + rinci(keadaan()), true); });
  }
  window.addEventListener('load', function () { setTimeout(periksa, 9000); });
  window.__apkDiag = { periksa: periksa, coba: coba, keadaan: keadaan };
})();
