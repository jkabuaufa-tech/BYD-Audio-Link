/* Monitoring SAP — penghubung server untuk versi web / HP / APK (paket web 2.3)
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

/* ===== 2.3 — PAKET PEMBARUAN TAHAN KUOTA + MUAT ULANG OTOMATIS =====
 * Aplikasi dasar menyimpan paket pembaruan (JICT_PEMBARUAN, kini ±4 MB) di localStorage dan menawarkan "Muat ulang"
 * lewat banner berisi SELURUH catatan rilis — pada versi lama (< 2.6.5) tombolnya terdorong keluar layar, dan bila kuota
 * localStorage penuh paket diam-diam tidak tersimpan. Akibatnya staf tertahan di versi lama.
 *  1. Bila penyimpanan biasa ditolak (kuota), paket disimpan terkompresi (lz-string, ±27 %) di JICT_PEMBARUAN_LZ.
 *  2. Saat paket pertama / pengganti versi < 2.6.5 diterima, halaman dimuat ulang sendiri (kecuali pengguna sedang mengetik).
 *  3. Banner pembaruan dibatasi tingginya sehingga tombol "Muat ulang" selalu terlihat.
 * Di dalam APK mode impor, apk-awal.js yang menangani (paket disimpan sebagai berkas). */
/*! lz-string 1.5.0 — MIT License — Copyright (c) 2013 pieroxy */
var LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module?module.exports=LZString:"undefined"!=typeof angular&&null!=angular&&angular.module("LZString",[]).factory("LZString",function(){return LZString});
(function () {
  'use strict';
  if (window.__hpPaket || (window.AndroidApp && window.AndroidApp.bacaPaket)) return; window.__hpPaket = 1;
  var K = 'JICT_PEMBARUAN', KZ = 'JICT_PEMBARUAN_LZ', P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem, cache = null;
  var versi = function (t) { try { return String(JSON.parse(t).versi || ''); } catch (e) { return ''; } };
  var banding = function (a, b) { a = String(a).split('.'); b = String(b).split('.'); for (var i = 0; i < Math.max(a.length, b.length); i++) { var d = (parseInt(a[i], 10) || 0) - (parseInt(b[i], 10) || 0); if (d) return d; } return 0; };
  function baca() {
    var v = g.call(localStorage, K); if (v) return v;
    if (cache !== null) return cache;
    var z = g.call(localStorage, KZ); if (!z) return null;
    try { cache = LZString.decompressFromUTF16(z) || null; } catch (e) { cache = null; }
    return cache;
  }
  P.getItem = function (k) { if (this === localStorage && k === K) return baca(); return g.apply(this, arguments); };
  P.removeItem = function (k) { if (this === localStorage && k === K) { cache = null; r.call(localStorage, KZ); } return r.apply(this, arguments); };
  P.setItem = function (k, v) {
    if (!(this === localStorage && k === K)) return s.apply(this, arguments);
    var lama = versi(baca() || ''), baru; v = String(v); baru = versi(v);
    try { r.call(localStorage, KZ); s.call(localStorage, K, v); cache = null; }
    catch (e) { r.call(localStorage, K); s.call(localStorage, KZ, LZString.compressToUTF16(v)); cache = v; }   // gagal lagi → galat diteruskan ke pemanggil
    try {
      var tanda = 'HP_MUAT_' + baru, el = document.activeElement, mengetik = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.id !== 'loginPin' && String(el.value || '').length > 0 && !document.body.classList.contains('terkunci-masuk');
      if (baru && baru !== lama && (!lama || banding(lama, '2.6.5') < 0) && !mengetik && !sessionStorage.getItem(tanda)) { sessionStorage.setItem(tanda, '1'); setTimeout(function () { location.reload(); }, 500); }
    } catch (e) { }
  };
  var st = document.createElement('style');
  st.textContent = '.banner-pembaruan{align-items:flex-start!important;max-width:min(560px,calc(100vw - 24px))}.banner-pembaruan>.flex-grow-1{max-height:4.4em;overflow:hidden;font-size:.86rem}';
  (document.head || document.documentElement).appendChild(st);
})();
