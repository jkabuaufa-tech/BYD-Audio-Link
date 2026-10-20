/* Monitoring SAP — penghubung server untuk versi web / HP / APK (paket HP 2.2.1)
 * Dimuat di <head> SEBELUM aplikasi. Tidak mengubah data apa pun.
 * Masalah 2.2: bila config.json belum berisi alamat /exec (atau aplikasi dibuka sebagai file lokal di APK), aplikasi diam-diam
 * berjalan dalam "Mode lokal" — login berhasil dengan daftar pengguna bawaan tetapi dashboard kosong & pembaruan tidak pernah datang.
 * Perbaikan:
 *  1. Link sekali-atur: ...?server=https://script.google.com/macros/s/…/exec → alamat disimpan permanen di perangkat, parameter dihapus dari alamat.
 *  2. Bila alamat server belum ada (config.json kosong / file lokal), kartu "Hubungkan ke server" tampil sebelum login:
 *     alamat diuji (ping) lalu disimpan; sesi mode lokal lama dilepas agar masuk ulang ke server. Data lokal di perangkat tidak dihapus. */
(function () {
  'use strict';
  var K_URL = 'JICT_REG_URL', K_SESI = 'JICT_REG_SESI', MODE_LOKAL = '-';
  var POLA = /^https:\/\/script\.google(usercontent)?\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
  var simpan = function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } };
  var baca = function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  function pasangServer(url) { if (baca(K_URL) !== url) { simpan(K_URL, url); simpan(K_SESI, null); } }

  // 1. link sekali-atur
  try {
    var q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#/, ''));
    var s = (q.get('server') || h.get('server') || '').trim();
    if (POLA.test(s)) {
      pasangServer(s); q.delete('server'); h.delete('server');
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + (h.toString() ? '#' + h : ''));
    }
  } catch (e) { }

  async function adaServer() {
    var u = baca(K_URL);
    if (u === MODE_LOKAL) return true;            // pengguna sengaja memilih mode lokal
    if (POLA.test(u)) return true;
    if (/^https?:$/.test(location.protocol)) {   // versi web: alamat dari config.json di samping index.html
      try { var r = await fetch('config.json', { cache: 'no-store' }); if (r.ok) { var c = await r.json(); if (POLA.test(String(c && c.server || '').trim())) return true; } } catch (e) { }
    }
    return false;
  }
  async function ping(url) {
    var r = await fetch(url + '?action=ping&t=' + Date.now(), { cache: 'no-store', redirect: 'follow' });
    var t = await r.text(), j = null; try { j = JSON.parse(t); } catch (e) { }
    if (!j) throw new Error('Alamat menjawab halaman HTML (HTTP ' + r.status + '), bukan server Monitoring SAP. Periksa alamat /exec & deployment "Siapa saja".');
    if (!j.ok && !j.kode) throw new Error('Server menjawab: ' + (j.error || 'tidak dikenal'));
    return j;
  }
  function kartu() {
    var d = document.createElement('div'); d.id = 'hpServer';
    d.innerHTML = '<style>#hpServer{position:fixed;inset:0;z-index:99999;background:rgba(6,16,28,.92);display:grid;place-items:center;padding:16px;font-family:system-ui,Segoe UI,sans-serif}' +
      '#hpServer .k{background:#fff;color:#0b1f3a;border-radius:16px;max-width:440px;width:100%;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.4)}' +
      '#hpServer h2{margin:0 0 6px;font-size:1.15rem;color:#0b1f3a!important;opacity:1}#hpServer p{margin:0 0 12px;font-size:.88rem;color:#4a5a70;line-height:1.45}' +
      '#hpServer input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #c9d3df;border-radius:10px;font-size:.85rem;font-family:ui-monospace,Consolas,monospace;background:#fff!important;color:#0b1f3a!important}#hpServer input:focus{outline:2px solid #1763b3;outline-offset:1px}' +
      '#hpServer button{margin-top:10px;width:100%;padding:11px;border:0;border-radius:10px;background:#1763b3;color:#fff;font-weight:700;font-size:.95rem}' +
      '#hpServer button:disabled{opacity:.6}#hpServer .s{font-size:.8rem;margin-top:8px;min-height:1.2em}#hpServer .s.err{color:#b02a37}#hpServer .s.ok{color:#17673a}' +
      '#hpServer a{display:block;text-align:center;margin-top:12px;font-size:.78rem;color:#4a5a70}</style>' +
      '<div class="k" role="dialog" aria-modal="true" aria-labelledby="hpServerJ"><h2 id="hpServerJ">Hubungkan ke server</h2>' +
      '<p>Aplikasi ini belum tahu alamat server Monitoring SAP, sehingga data tidak bisa ditampilkan. Tempel alamat server dari Admin (berakhiran <b>/exec</b>). Cukup sekali di perangkat ini.</p>' +
      '<input id="hpServerUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec">' +
      '<button type="button" id="hpServerOk">Hubungkan</button><div class="s" id="hpServerS" role="status" aria-live="polite"></div>' +
      '<a href="#" id="hpServerLokal">Lanjut tanpa server (mode lokal — data hanya di perangkat ini)</a></div>';
    document.body.appendChild(d);
    var inp = d.querySelector('#hpServerUrl'), btn = d.querySelector('#hpServerOk'), st = d.querySelector('#hpServerS');
    inp.focus();
    btn.onclick = async function () {
      var u = inp.value.trim().replace(/\s+/g, '');
      st.className = 's'; if (!POLA.test(u)) { st.className = 's err'; st.textContent = 'Alamat harus berbentuk https://script.google.com/macros/s/…/exec'; return; }
      btn.disabled = true; st.textContent = 'Menguji koneksi…';
      try { var j = await ping(u); pasangServer(u); st.className = 's ok'; st.textContent = 'Terhubung ke server v' + (j.versiServer || '?') + '. Memuat ulang…'; setTimeout(function () { location.reload(); }, 600); }
      catch (e) { st.className = 's err'; st.textContent = e.message; btn.disabled = false; }
    };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
    d.querySelector('#hpServerLokal').onclick = function (e) { e.preventDefault(); simpan(K_URL, MODE_LOKAL); d.remove(); location.reload(); };
  }
  window.hpGantiServer = function () { simpan(K_URL, null); simpan(K_SESI, null); location.reload(); };
  var mulai = function () { adaServer().then(function (ada) { if (!ada) kartu(); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
