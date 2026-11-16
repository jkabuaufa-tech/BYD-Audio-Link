/* Jembatan APK ↔ aplikasi web Monitoring SAP. Disuntikkan setelah halaman aplikasi selesai dimuat (idempoten).
   WebView tidak menangani sendiri: unduhan blob:/data: (Unduh Excel/Word/PDF), window.print(), dan jendela baru. */
(function () {
  if (window.__apkJembatan || !window.AndroidApp) return; window.__apkJembatan = 1;
  var A = window.AndroidApp;
  document.documentElement.classList.add('apk-android');

  /* ---- unduhan ---- */
  function kirim(url, nama) {
    fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
      var fr = new FileReader();
      fr.onload = function () { var s = String(fr.result); A.simpan(s.slice(s.indexOf(',') + 1), b.type || '', nama || 'unduhan'); };
      fr.onerror = function () { A.pesan('Unduhan gagal dibaca.'); };
      fr.readAsDataURL(b);
    }).catch(function (e) { A.pesan('Unduhan gagal: ' + (e && e.message || e)); });
  }
  window.__apkUnduh = kirim;
  function tangkap(a) {
    if (!a || !a.hasAttribute || !a.hasAttribute('download')) return false;
    var h = a.href || ''; if (!/^(blob:|data:)/.test(h)) return false;
    kirim(h, a.getAttribute('download')); return true;
  }
  var klikAsli = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (tangkap(this)) return; return klikAsli.apply(this, arguments); };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[download]');
    if (a && tangkap(a)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---- cetak ---- */
  function htmlDari(doc) { try { return '<!DOCTYPE html>' + doc.documentElement.outerHTML; } catch (e) { return ''; } }
  window.print = function () { A.cetak(); };
  function kaitBingkai(f) {
    try {
      var w = f.contentWindow; if (!w || w.__apkCetak) return; w.__apkCetak = 1;
      w.print = function () { var h = htmlDari(w.document); if (h) A.cetakHtml(h, w.document.title || document.title || ''); else A.cetak(); };
    } catch (e) { /* bingkai lintas-asal: biarkan */ }
  }
  function kaitSemua() { var L = document.getElementsByTagName('iframe'); for (var i = 0; i < L.length; i++) kaitBingkai(L[i]); }
  document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'IFRAME') kaitBingkai(e.target); }, true);
  setInterval(kaitSemua, 1200); kaitSemua();

  /* ---- jendela baru ----
     window.open('', '_blank') + document.write(...) + print()  → dokumen dicetak lewat layanan cetak Android;
     window.open(url) → dibuka di aplikasi lain (browser / Drive). */
  var bukaAsli = window.open;
  window.open = function (url) {
    if (url && !/^about:blank$/i.test(url)) {
      var u = String(url);
      if (/^(blob:|data:)/.test(u)) { kirim(u, 'unduhan'); return null; }
      try { u = new URL(u, location.href).href; } catch (e) { }
      if (u.indexOf(location.origin + '/') === 0) return bukaAsli.apply(window, arguments);
      A.bukaLuar(u); return null;
    }
    var buf = '', judul = '', muat = null, tutup = false;
    var cetak = function () { if (buf) A.cetakHtml(buf, judul || document.title || ''); };
    var doc = {
      open: function () { buf = ''; return doc; }, write: function () { for (var i = 0; i < arguments.length; i++) buf += arguments[i]; },
      writeln: function () { for (var i = 0; i < arguments.length; i++) buf += arguments[i] + '\n'; },
      close: function () { var m = buf.match(/<title[^>]*>([^<]*)<\/title>/i); if (m) judul = m[1]; if (typeof muat === 'function') setTimeout(muat, 60); },
      get title() { return judul; }, set title(v) { judul = v; }, readyState: 'complete',
      addEventListener: function () { }, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, getElementById: function () { return null; },
      fonts: { ready: Promise.resolve() }
    };
    var w = { document: doc, focus: function () { }, blur: function () { }, close: function () { tutup = true; }, print: cetak, opener: window, location: { href: 'about:blank' },
      addEventListener: function (n, f) { if (n === 'load' && typeof f === 'function') setTimeout(f, 80); }, removeEventListener: function () { }, setTimeout: function (f, t) { return setTimeout(f, t); },
      get closed() { return tutup; }, get onload() { return muat; }, set onload(f) { muat = f; if (buf && typeof f === 'function') setTimeout(f, 80); }, set onafterprint(f) { } };
    return w;
  };
})();
