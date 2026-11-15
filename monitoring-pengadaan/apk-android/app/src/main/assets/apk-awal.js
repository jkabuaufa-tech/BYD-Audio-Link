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
})();
