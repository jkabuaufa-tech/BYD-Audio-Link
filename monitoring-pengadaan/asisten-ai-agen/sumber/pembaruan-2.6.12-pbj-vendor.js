/* MP2612 — PEMBARUAN 2.6.12: CALON VENDOR PAKET PBJ DIISI MANUAL DARI MASTER DATA › VENDOR (aditif; tanpa perubahan server & data)
 *  Gejala: paket PBJ baru langsung berisi 8 calon vendor (Cahaya Utama, Surya Salim, Membangun Indonesia Maju, Pulau Indah Dirgantara,
 *  Farika Steel, Inti Teknik Solusi Cemerlang, Karsa Buana Lestari, Putra Paloh) — vendor kontrak berjalan dengan alamat, NPWP,
 *  harga penawaran & nilai evaluasi REKAAN. Sebab: formulir kosong PBJ Studio (blankState) dibuat dari data demo dan daftar vendornya
 *  tidak ikut dikosongkan. Kini:
 *   - paket baru mulai TANPA calon vendor (juga tanpa pembanding, pemenang & nilai evaluasi bawaan);
 *   - paket yang sudah tersimpan dengan vendor contoh mendapat pemberitahuan + tombol "Hapus vendor contoh" (vendor isian staf,
 *     harga & nilai vendor lain tidak tersentuh; perubahan baru tersimpan setelah "Simpan ke server");
 *   - calon vendor tender ditambahkan manual lewat Tahap 2 › "Tambah vendor dari Master" (Master Data › Vendor: baku + tambahan).
 *  Perbaikan di tempat (sumber/pembaruan-2.6.12-pbj-vendor.ganti.json): blankState paket baru dikosongkan & skrip bingkai ini dipasang. */
(function () {
  'use strict';
  if (window.__MP2612__) return;
  window.__MP2612__ = true;
  // dijalankan DI DALAM bingkai PBJ Studio (setelah jembatan PBJ_PASCA), lewat srcdoc
  function bingkai() {
    var H = (function () { try { return parent.__PBJ_HOST || null; } catch (e) { return null; } })();
    var BACA = !!(H && H.hanyaBaca && H.hanyaBaca());
    var contoh = function (v) { return !!v && /^vendor[a-z]@email\.com$/.test(String(v.email || '')) && String(v.telp || '') === '[No. Telepon]'; };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    function hapusContoh() {
      var cth = S.vendors.filter(contoh), ids = cth.map(function (v) { return v.id; }), nama = cth.map(function (v) { return v.nama; });
      if (!cth.length) return;
      S.vendors = S.vendors.filter(function (v) { return !contoh(v); });
      ids.forEach(function (id) { if (S.nilai) delete S.nilai[id]; (S.items || []).forEach(function (it) { if (it.awal) delete it.awal[id]; if (it.final) delete it.final[id]; }); });
      S.pemb = (S.pemb || []).map(function (n) { return nama.indexOf(n) >= 0 ? '' : n; }); while (S.pemb.length < 3) S.pemb.push('');
      if (nama.indexOf(S.pemenang) >= 0) S.pemenang = '';
      if (S.sel && ids.indexOf(S.sel.rfq) >= 0) S.sel.rfq = '';
      if (S.aan && ids.indexOf(S.aan.untuk) >= 0) S.aan.untuk = 'all';
      render(); saveDraft(); if (H && H.berubah) H.berubah();
      toast(cth.length + ' vendor contoh dihapus. Tambahkan calon vendor dari Master Data › Vendor (Tahap 2), lalu Simpan ke server.');
    }
    function tempel() {
      var m = document.getElementById('main'); if (!m || document.getElementById('mp2612Info')) return;
      var n = (S.vendors || []).filter(contoh).length, d;
      if (n) {
        d = document.createElement('div'); d.id = 'mp2612Info'; d.className = 'panel mp2612';
        d.innerHTML = '<b>' + n + ' vendor contoh bawaan PBJ Studio</b> masih ada di database vendor paket ini — bukan dari Master Data (nama sama dengan vendor kontrak berjalan; alamat, NPWP, harga &amp; nilai rekaan). ' +
          (BACA ? '' : '<button class="btn sm danger" type="button" data-act="mp2612Hapus">Hapus vendor contoh</button> ') +
          '<span class="note">Calon vendor tender diisi manual: Tahap 2 › <b>Tambah vendor dari Master</b> (Master Data › Vendor).</span>';
      } else if (!(S.vendors || []).length && /^s[2-9]$|^s1[0-2]$/.test(String(VIEW))) {
        d = document.createElement('div'); d.id = 'mp2612Info'; d.className = 'panel mp2612 kosong';
        d.innerHTML = '<b>Belum ada calon vendor.</b> <span class="note">Pilih manual vendor yang diundang tender lewat Tahap 2 › <b>Tambah vendor dari Master</b> (Master Data › Vendor: baku + tambahan). Vendor dari kontrak berjalan tidak ditambahkan otomatis.</span>' +
          (BACA || VIEW === 's2' ? '' : ' <button class="btn sm" type="button" data-go="s2">Buka Tahap 2</button>');
      }
      if (d) m.insertBefore(d, m.firstChild);
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act="mp2612Hapus"]'); if (!b) return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (BACA) return;
      var nama = S.vendors.filter(contoh).map(function (v) { return '• ' + v.nama; }).join('\n');
      if (window.confirm('Hapus vendor contoh berikut dari paket ini?\n' + nama + '\n\nVendor yang Anda tambahkan sendiri tidak dihapus.')) hapusContoh();
    }, true);
    var _render = render;
    render = function () { _render.apply(this, arguments); try { tempel(); } catch (e) { } };
    window.__mp2612 = { contoh: function () { return (S.vendors || []).filter(contoh).map(function (v) { return v.nama; }); }, hapus: hapusContoh, esc: esc };
    try { render(); } catch (e) { }
  }
  window.MP2612_PBJ = '(' + bingkai.toString() + ')();';
})();
