
/* ===== [2.6.7] Calon vendor HANYA dari Master Data › Vendor (dipilih manual) — bukan vendor contoh / database lain ===== */
(function () {
  var H = (function () { try { return parent.__PBJ_HOST || null; } catch (e) { return null; } })();
  var BACA = !!(H && H.hanyaBaca && H.hanyaBaca()), MAKS_P = 15;
  var CONTOH = {}; try { demoState().vendors.forEach(function (v) { CONTOH[String(v.nama).trim().toLowerCase()] = 1; }); } catch (e) { }
  var kn = function (x) { return String(x == null ? '' : x).trim().toLowerCase(); };
  /* 1. paket baru: database vendor paket mulai KOSONG (blankState bawaan menyalin 15 vendor contoh PBJ Studio) */
  if (window.__PBJ_BARU) { S.vendors = []; S.nilai = {}; S.klar = {}; S.pemb = ['', '', '']; S.pemenang = ''; S.items.forEach(function (it) { it.awal = {}; it.final = {}; }); }
  function contohTakTerpakai() {   // vendor contoh bawaan yang belum dipakai (bukan peserta, tanpa harga, bukan pemenang)
    var pes = {}; S.pemb.forEach(function (x) { pes[kn(x)] = 1; });
    return S.vendors.filter(function (v) { var k = kn(v.nama); return CONTOH[k] && !v.kodeMaster && !pes[k] && k !== kn(S.pemenang) &&
      !S.items.some(function (it) { return Number((it.awal || {})[v.id]) > 0 || Number((it.final || {})[v.id]) > 0; }); });
  }
  function buang(L) { var id = {}; L.forEach(function (v) { id[v.id] = 1; delete S.nilai[v.id]; if (S.klar) delete S.klar[v.id]; S.items.forEach(function (it) { if (it.awal) delete it.awal[v.id]; if (it.final) delete it.final[v.id]; }); }); S.vendors = S.vendors.filter(function (v) { return !id[v.id]; }); }
  /* 2. daftar Master Data › Vendor dari aplikasi (baku + tambahan, dilengkapi WAVE) */
  var M = { semua: null, q: '', pilih: {} };
  function master() { if (!M.semua) { try { M.semua = (H && H.cariVendor ? H.cariVendor('*') : []) || []; } catch (e) { M.semua = []; } } return M.semua; }
  var hitam = function (v) { return /BLACKLIST/i.test(v.sumber || ''); };
  var diPaket = function (v) { return S.vendors.some(function (x) { return kn(x.nama) === kn(v.nama) || (v.id && x.kodeMaster === v.id); }); };
  function saring() { var q = kn(M.q); return master().filter(function (v) { return !q || kn(v.nama + ' ' + v.id + ' ' + (v.alamat || '') + ' ' + (v.npwp || '')).indexOf(q) >= 0; }); }
  function daftarHtml() {
    var L = saring(), T = L.slice(0, 200), n = Object.keys(M.pilih).length;
    if (!master().length) return '<p class="note">Master Data › Vendor belum termuat. Tutup lalu buka kembali paket ini, atau periksa koneksi server.</p>';
    return '<div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="t"><tr><th></th><th>Vendor</th><th>ID / Kode SAP</th><th>Alamat / Kota</th><th>Sumber</th></tr>' +
      (T.length ? T.map(function (v, i) { var ada = diPaket(v), ht = hitam(v), k = v.id || v.nama;
        return '<tr' + (ht ? ' style="opacity:.7"' : '') + '><td><input type="checkbox" class="mpv-cb" data-k="' + esc(k) + '" aria-label="Pilih ' + esc(v.nama) + '" ' + (ada ? 'checked disabled' : ht ? 'disabled' : M.pilih[k] ? 'checked' : '') + '></td><td>' + esc(v.nama) +
          (ada ? ' <span class="pill ok">sudah dipilih</span>' : '') + (ht ? ' <span class="pill bad">Blacklist WAVE</span>' : '') + '</td><td class="num">' + esc(v.id || '') + '</td><td>' + esc(v.alamat || '') + '</td><td>' + esc(v.sumber || '') + '</td></tr>'; }).join('')
        : '<tr><td colspan="5" class="note">Tidak ada vendor Master yang cocok dengan "' + esc(M.q) + '".</td></tr>') + '</table></div>' +
      '<p class="note" style="margin:6px 0 0">' + L.length + ' dari ' + master().length + ' vendor Master' + (L.length > 200 ? ' — 200 pertama ditampilkan, persempit pencarian' : '') + ' · ' + n + ' dipilih.</p>';
  }
  function panelPilih() {
    if (BACA) return '';
    var sisa = contohTakTerpakai();
    return '<div class="panel mpv-panel"><h3>Pilih calon vendor dari Master Data › Vendor</h3>' +
      (sisa.length ? '<div class="alert warn" style="margin-bottom:8px">Database vendor paket ini masih berisi <b>' + sisa.length + ' vendor contoh bawaan PBJ Studio</b> (bukan dari Master Data, belum dipakai). <button class="btn sm danger" type="button" data-act="mpvBuangContoh">Hapus vendor contoh</button></div>' : '') +
      '<div class="row" style="gap:6px;align-items:flex-end"><label class="f" style="flex:1;min-width:220px">Cari nama / ID / NPWP / kota<input id="mpvCari" type="search" value="' + esc(M.q) + '" placeholder="ketik untuk menyaring, kosong = semua vendor Master" autocomplete="off"></label>' +
      '<label class="f" style="flex:0 0 auto;flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="mpvJadiPeserta" checked> langsung jadi peserta</label>' +
      '<button class="btn sm pri" type="button" data-act="mpvTambah">+ Tambahkan yang dicentang</button></div>' +
      '<div id="mpvDaftar" style="margin-top:8px">' + daftarHtml() + '</div>' +
      '<p class="note">Calon vendor dipilih manual dari Master Data › Vendor (baku + tambahan). Vendor belum ada? Admin menambahkannya di menu <b>Master Data › Vendor</b>, lalu buka ulang paket. Vendor Blacklist WAVE tidak dapat dipilih.</p></div>';
  }
  /* 3. Tahap 2: pemilih Master di atas; "+ Vendor" bebas & Impor CSV disembunyikan; panel cari lama diganti */
  var _f2 = FORMS[2];
  FORMS[2] = function () {
    var h = _f2();
    var a = h.indexOf('<div class="panel"><h3>Tambah vendor dari Master'); if (a >= 0) { var b = h.indexOf('</div></div>', h.indexOf('id="mpHasilV"', a)); if (b > a) h = h.slice(0, a) + h.slice(b + 12); }
    h = h.replace('<h3>Database vendor <span class="row"><button class="btn sm" type="button" data-act="addVendor">+ Vendor</button><button class="btn sm" type="button" data-act="impCsv">Impor CSV</button>', '<h3>Calon vendor paket <span class="note" style="font-weight:400">(dari Master Data)</span> <span class="row">');
    return panelPilih() + h;
  };
  try { HINT[2] = ['Centang calon vendor dari <b>Master Data › Vendor</b> lalu <b>+ Tambahkan yang dicentang</b> (otomatis menjadi peserta).'].concat((HINT[2] || []).slice(1)); TAHAP[1].d = 'Calon vendor dipilih manual dari Master Data › Vendor; peserta pembanding min. 3.'; } catch (e) { }
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'mpvCari') { M.q = e.target.value; var d = document.getElementById('mpvDaftar'); if (d) d.innerHTML = daftarHtml(); } });
  document.addEventListener('change', function (e) { var c = e.target; if (!c || !c.classList || !c.classList.contains('mpv-cb')) return; if (c.checked) M.pilih[c.dataset.k] = 1; else delete M.pilih[c.dataset.k];
    var d = document.getElementById('mpvDaftar'); if (d) { var p = d.querySelector('p.note'); if (p) p.innerHTML = daftarHtml().match(/<p class="note"[^>]*>([\s\S]*)<\/p>$/)[1]; } });
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-act]') : null; if (!b) return; var a = b.dataset.act;
    if ((a === 'addVendor' || a === 'impCsv') && !BACA) { e.stopImmediatePropagation(); e.preventDefault(); toast('Calon vendor diambil dari Master Data › Vendor — pakai panel "Pilih calon vendor".'); return; }
    if (a.indexOf('mpv') !== 0) return;
    if (BACA) { toast('Mode lihat saja.'); return; }
    if (a === 'mpvBuangContoh') { var L = contohTakTerpakai(); buang(L); render(); saveDraft(); if (H && H.berubah) H.berubah(); toast(L.length + ' vendor contoh dihapus dari paket ini.'); return; }
    if (a === 'mpvTambah') {
      var jadi = (document.getElementById('mpvJadiPeserta') || {}).checked !== false, n = 0, np = 0, penuh = false;
      master().forEach(function (v) { var k = v.id || v.nama; if (!M.pilih[k] || diPaket(v) || hitam(v)) return;
        var id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        S.vendors.push({ id: id, nama: v.nama, alamat: v.alamat || '', pimpinan: v.pimpinan || '', jabatan: v.jabatan || 'Direktur', email: v.email || '', telp: v.telp || '', npwp: v.npwp || '', kualifikasi: '',
          wave: /WAVE\s+(.+)$/.test(v.sumber || '') ? String(v.sumber).replace(/^.*WAVE\s+/, '') : '', plant: '', schedul: '', kirim: '', approval: '', kodeMaster: v.id || '', sumberMaster: v.sumber || 'Master' });
        S.nilai[id] = KRIT.map(function (kk) { return kk.auto ? null : 0; }); n++;
        if (jadi && !S.pemb.some(function (x) { return kn(x) === kn(v.nama); })) { var i = S.pemb.findIndex(function (x) { return !kn(x); }); if (i >= 0) { S.pemb[i] = v.nama; np++; } else if (S.pemb.length < MAKS_P) { S.pemb.push(v.nama); np++; } else penuh = true; }
      });
      M.pilih = {}; render(); saveDraft(); if (H && H.berubah) H.berubah();
      toast(n ? n + ' calon vendor dari Master ditambahkan' + (jadi ? ' · ' + np + ' menjadi peserta' + (penuh ? ' (peserta penuh, maks. ' + MAKS_P + ')' : '') : '') + '. Isi harga di Tahap 3.' : 'Centang vendor Master terlebih dahulu.');
    }
  }, true);
  if (window.__PBJ_BARU) { try { render(); saveDraft(); } catch (e) { } }
})();
