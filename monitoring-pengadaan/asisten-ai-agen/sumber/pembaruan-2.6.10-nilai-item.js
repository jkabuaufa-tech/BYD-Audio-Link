/* MP2610 — PEMBARUAN 2.6.10: NILAI & TAGIHAN KONTRAK SATU RUMUS + PERIKSA KONTRAK (aditif; tanpa perubahan server & data)
 *  A. Gejala: 027/SPM Putra Paloh — BAPM & Input Progres sudah 100% (Rp 40.877.000), tetapi Dashboard / Rekap Seluruh Kontrak
 *     menampilkan "Nilai Rp 0 · Tagihan Rp 40,9 Juta · 0%" dan notifikasi masih "Lewat". Sebab: kontrak tujuan Perbaikan Register
 *     (2.6.0) hanya diberi nilai bila jumlah item kontrak sumber cocok dengan nilai header Excel; bila tidak cocok (mis. kontrak
 *     sumber DRAFT bernilai header 0) nilainya 0 → persen tagihan = realisasi / 0 = 0%. Kontrak DRAFT Master bernilai header 0
 *     (mis. No 70 Koperasi Karyawan PT Nindya, item Rp 204 jt) — bila itemnya dipindah ke nomor resmi — mengalami hal yang sama.
 *     Kontrak DRAFT yang belum bernomor tetap bernilai 0 (belum kontrak terbit; dilaporkan di Periksa kontrak).
 *     Kini setiap kontrak BERNOMOR di ringkasan yang nilainya ≤ 0 tetapi itemnya berharga memakai JUMLAH HARGA ITEM (volume × harga satuan —
 *     rumus kolom Jumlah Harga BAPM). Tagihan ringkasan juga tidak pernah lebih kecil dari jumlah BK Input Progres kontrak itu
 *     (BK yang diisi sebagai nilai saja dulu tidak terhitung di Dashboard). Progres & status dihitung ulang. Nilai yang sudah > 0
 *     (Excel, koreksi, isian manual Perbaikan Register) tidak diubah. Berjalan setelah lapisan 2.6.0 & 2.6.7.
 *  B. PERIKSA KONTRAK (menu akun › Periksa kontrak, atau tombol di Rekap Seluruh Kontrak): memeriksa seluruh kontrak Master +
 *     Register + BK dan mencantumkan setiap kejanggalan yang membuat Dashboard, BA, dan notifikasi bisa berbeda; dapat diunduh CSV. */
(function () {
  'use strict';
  if (window.__MP2610__) return;
  window.__MP2610__ = true;
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const volIt = it => N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak ?? it.vol);
  const hargaIt = it => N(it.hargaSatuanEfektif ?? it.hargaSatuan ?? it.harga ?? it.hargaKontrak);
  const nilaiIt = it => volIt(it) * hargaIt(it) || N(it.jumlahHarga || it.nilaiKontrakEfektif || it.nilai || it.jumlah);
  const jumlahItem = items => (items || []).reduce((s, it) => s + (it ? nilaiIt(it) : 0), 0);
  const tol = n => Math.max(1000, n * 0.0001);   // toleransi pembulatan 2.6.4: 0,01% (min. Rp 1.000)
  const prog = () => ((typeof PROG !== 'undefined' && PROG.data) || []).filter(e => e && !e.batal);
  const nomorG = g => [g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean);
  const valid = k => (typeof kontrakValid === 'function' ? kontrakValid(k) : /^\d/.test(String(k || '')));   // DRAFT (belum bernomor) = bukan kontrak terbit
  const bkDari = (L, nomor) => { const s = new Set(nomor); return L.filter(e => s.has(e.noKontrak)).reduce((a, e) => a + N(e.nilai), 0); };

  /* ======================= A. NILAI & TAGIHAN RINGKASAN ======================= */
  function terapkan(hasil) {
    if (!Array.isArray(hasil)) return hasil;
    const L = prog();
    hasil.forEach(g => {
      if (!g) return;
      // objek ringkasan dapat dipakai ulang: kembalikan dulu angka yang pernah diganti lapisan ini
      if (g._mp2610) { if (N(g.nilai) === g._mp2610.nilai) g.nilai = g._mp2610.nilaiAsli; if (N(g.realisasi) === g._mp2610.realisasi) g.realisasi = g._mp2610.realisasiAsli; delete g._mp2610; }
      const asli = { nilai: N(g.nilai), realisasi: N(g.realisasi) };
      let n = asli.nilai, r = asli.realisasi, dariItem = false, dariBK = false;
      if (!(n > 0) && valid(g.key)) { const j = jumlahItem(g.items); if (j > 0) { n = j; dariItem = true; } }   // DRAFT tetap 0: belum masuk nilai kontrak terbit
      // tagihan: BK Input Progres yang diisi nilai saja ikut terhitung (bukan kontrak sumber Perbaikan Register — tagihannya sengaja dibagi)
      if (!(g.mp260 && g.mp260.peran === 'sumber')) { const bk = bkDari(L, nomorG(g)); if (bk > r + 1000) { r = bk; dariBK = true; } }
      if (!dariItem && !dariBK) return;
      g.nilai = n; g.realisasi = r;
      g._mp2610 = { nilai: n, realisasi: r, nilaiAsli: asli.nilai, realisasiAsli: asli.realisasi, dariItem, dariBK };
      if (n > 0) {
        g.progres = Math.min(r / n, 1);
        const st = String(g.statusKey || '');
        if (r >= n - tol(n)) { if (['berjalan', 'proses', 'draf', ''].indexOf(st) >= 0) g.statusKey = 'selesai'; }
        else if (r > 0 && ['proses', 'draf', ''].indexOf(st) >= 0) g.statusKey = 'berjalan';
      }
    });
    return hasil;
  }
  window.mp2610Terapkan = terapkan;
  window.mp2610NilaiDariItem = g => !!(g && g._mp2610 && g._mp2610.dariItem);
  const _ring = window.getRingkasanKontrak;
  if (typeof _ring === 'function') window.getRingkasanKontrak = function () { const h = _ring.apply(this, arguments); try { return terapkan(h); } catch (e) { console.warn('[2.6.10] nilai dari item', e); return h; } };
  try { if (typeof RINGKASAN !== 'undefined' && Array.isArray(RINGKASAN) && RINGKASAN.length) terapkan(RINGKASAN); } catch (e) { }

  /* ======================= B. PERIKSA KONTRAK ======================= */
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const rp = v => 'Rp ' + Math.round(N(v)).toLocaleString('id-ID');
  const pct = v => (Math.floor(N(v) * 1000) / 10).toLocaleString('id-ID') + '%';
  const TK = { galat: ['Galat', 'fa-circle-xmark', 0], peringatan: ['Peringatan', 'fa-triangle-exclamation', 1], info: ['Info', 'fa-circle-info', 2] };
  function periksa() {
    const K = typeof window.semuaKontrak214 === 'function' ? window.semuaKontrak214() : [], L = prog(), T = [], semuaNo = new Set();
    const masa = window.mp220Masa, persenBK = window.mp269PersenBK;
    K.forEach(x => {
      const g = x.g || null, nomor = [...new Set((x.nomor || [x.key]).concat(g ? nomorG(g) : []))];
      nomor.forEach(n => semuaNo.add(n));
      const n = N(x.nilai), items = x.t === 'reg' ? (x.r.items || []) : ((g && g.items) || []), jml = jumlahItem(items), bk = bkDari(L, nomor), tag = Math.max(bk, N(x.realisasi));
      const persen = typeof persenBK === 'function' ? persenBK(x) : (n > 0 ? tag / n : 0);
      const m = typeof masa === 'function' ? masa(x) : { k: '' };
      const buka = x.t === 'reg' ? 'bukaEditReg(' + JSON.stringify(x.r.id) + ')' : 'bukaKoreksi(' + JSON.stringify((g && g.key) || x.key) + ')';
      const t = (tingkat, kode, pesan) => T.push({ tingkat, kode, key: x.key, vendor: x.vendor || '', sumber: x.t === 'reg' ? 'Register' : (g && g.mp260 && g.mp260.peran === 'tujuan' ? 'Perbaikan Register' : 'Master'), nilai: n, tagihan: tag, persen, pesan, buka });
      if (['lewat', 'h30'].indexOf(m.k) >= 0 && persen >= 1 - 1e-9) t('galat', 'NOTIF_100', 'Muncul di notifikasi kontrak padahal tagihan sudah ' + pct(persen) + '.');
      if (!(n > 0) && (valid(x.key) || bk > 0)) t('galat', 'NILAI_0', 'Nilai kontrak Rp 0 dan item tidak berharga — persen tagihan tidak dapat dihitung' + (bk > 0 ? ' (BK ' + rp(bk) + ' sudah tercatat)' : '') + '. Lengkapi item/harga atau nilai kontrak.');
      if (g && g._mp2610 && g._mp2610.dariItem) t('peringatan', 'NILAI_ITEM', 'Nilai kontrak di ' + (g.mp260 ? 'Perbaikan Register' : 'Master') + ' Rp 0 — dipakai jumlah harga item ' + rp(n) + '. Isi nilai resmi agar semua laporan memakai angka yang disepakati.');
      else if (!(n > 0) && jml > 0 && !valid(x.key)) t('info', 'DRAF_NILAI0', 'Kontrak DRAFT belum bernomor: nilai header Rp 0, item ' + rp(jml) + ' — belum dihitung di nilai kontrak Dashboard sampai diberi nomor & nilai (Perbaiki data kontrak / Perbaikan Register).');
      else if (n > 0 && jml > 0 && Math.abs(jml - n) > Math.max(1000, n * 0.005)) t('peringatan', 'SELISIH_ITEM', 'Jumlah harga item ' + rp(jml) + ' ≠ nilai kontrak ' + rp(n) + ' (selisih ' + rp(jml - n) + '). BA memakai harga item, Dashboard memakai nilai kontrak.');
      if (n > 0 && tag > n + tol(n)) t('peringatan', 'LEBIH_100', 'Tagihan ' + rp(tag) + ' melebihi nilai kontrak (' + pct(tag / n) + '). Periksa addendum atau BK ganda.');
      if (g && g._mp2610 && g._mp2610.dariBK) t('info', 'BK_NILAI', 'BK Input Progres ' + rp(bk) + ' lebih besar dari realisasi per volume item ' + rp(g._mp2610.realisasiAsli) + ' (BK diisi nilai saja / item tidak cocok) — Dashboard kini memakai jumlah BK.');
      if (m.k === 'kosong' && valid(x.key) && persen < 1 - 1e-9 && x.statusKey !== 'selesai') t('info', 'TGL_KOSONG', 'Tanggal selesai kontrak belum diisi — masa berlaku tidak dipantau notifikasi.');
    });
    L.forEach(e => { if (N(e.nilai) > 0 && !semuaNo.has(e.noKontrak)) T.push({ tingkat: 'galat', kode: 'BK_YATIM', key: e.noKontrak || '(tanpa nomor)', vendor: '', sumber: 'Input Progres', nilai: 0, tagihan: N(e.nilai), persen: 0,
      pesan: 'BK ' + (e.nomorBA || 'tagihan ke-' + (e.tagihanKe || '?')) + ' ' + rp(e.nilai) + ' tidak terhubung ke kontrak mana pun — tidak terhitung di Dashboard.', buka: '' }); });
    T.sort((a, b) => TK[a.tingkat][2] - TK[b.tingkat][2] || String(a.key).localeCompare(String(b.key)));
    return { T, kontrak: K.length, bk: L.length, pada: new Date() };
  }
  window.mp2610Periksa = periksa;

  const D = { hasil: null, saring: '' };
  function gambar() {
    const w = document.getElementById('mp2610Py'); if (!w) return;
    const h = D.hasil = periksa(), n = k => h.T.filter(x => x.tingkat === k).length, tampil = h.T.filter(x => !D.saring || x.tingkat === D.saring);
    const chip = (k, l) => `<button type="button" class="reg-chip ${D.saring === k ? 'aktif' : ''}" onclick="mp2610Saring('${k}')">${l}<span class="n">${k ? n(k) : h.T.length}</span></button>`;
    w.querySelector('.mp266-isi').innerHTML = `<div class="mp2610-ring">${h.kontrak} kontrak · ${h.bk} BK diperiksa · ${h.pada.toLocaleString('id-ID')}${h.T.length ? '' : ' — <b class="text-success">tidak ada temuan</b>'}</div>
      <div class="d-flex flex-wrap gap-1">${chip('', 'Semua')}${Object.keys(TK).map(k => chip(k, TK[k][0])).join('')}
        <button type="button" class="btn btn-sm btn-light border ms-auto" onclick="mp2610Csv()"><i class="fas fa-file-csv me-1"></i>Unduh CSV</button>
        <button type="button" class="btn btn-sm btn-light border" onclick="mp2610Buka()"><i class="fas fa-rotate me-1"></i>Periksa ulang</button></div>
      ${tampil.length ? tampil.map(x => `<div class="mp2610-t ${x.tingkat}"><i class="fas ${TK[x.tingkat][1]}"></i><div class="mp2610-ti"><b>${E(x.key)}</b><small>${E([x.vendor, x.sumber, x.nilai ? 'nilai ' + rp(x.nilai) : '', x.tagihan ? 'tagihan ' + rp(x.tagihan) + (x.nilai ? ' (' + pct(x.persen) + ')' : '') : ''].filter(Boolean).join(' · '))}</small><span>${E(x.pesan)}</span></div>
        ${x.buka ? `<button type="button" class="btn btn-sm btn-outline-primary" onclick="mp2610Tutup(); ${E(x.buka)}">Buka</button>` : ''}</div>`).join('')
        : '<div class="text-center text-muted py-4"><i class="fas fa-circle-check text-success me-1"></i>Tidak ada temuan' + (D.saring ? ' pada tingkat ini' : '') + '.</div>'}`;
  }
  window.mp2610Saring = k => { D.saring = k; gambar(); };
  window.mp2610Tutup = () => { const w = document.getElementById('mp2610Py'); if (w) w.remove(); };
  window.mp2610Buka = () => {
    let w = document.getElementById('mp2610Py');
    if (!w) {
      w = document.createElement('div'); w.id = 'mp2610Py'; w.className = 'mp266-lapis'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'mp2610Jdl');
      w.innerHTML = `<div class="mp266-dlg mp2610-dlg"><header><b id="mp2610Jdl"><i class="fas fa-stethoscope me-2"></i>Periksa kontrak</b><small>Nilai kontrak, jumlah item, tagihan (BK), notifikasi & BK tanpa kontrak — agar Dashboard, BA dan notifikasi memakai angka yang sama.</small><button type="button" class="btn-close" aria-label="Tutup" onclick="mp2610Tutup()"></button></header><div class="mp266-isi"></div></div>`;
      w.addEventListener('click', ev => { if (ev.target === w) window.mp2610Tutup(); });
      w.addEventListener('keydown', ev => { if (ev.key === 'Escape') window.mp2610Tutup(); });
      document.body.appendChild(w);
    }
    gambar(); const b = w.querySelector('.btn-close'); if (b) b.focus();
  };
  window.mp2610Csv = () => {
    const h = D.hasil || periksa(), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const baris = [['Tingkat', 'Kode', 'Kontrak', 'Vendor', 'Sumber', 'Nilai', 'Tagihan', 'Persen', 'Temuan']].concat(h.T.map(x => [TK[x.tingkat][0], x.kode, x.key, x.vendor, x.sumber, Math.round(x.nilai), Math.round(x.tagihan), (x.persen * 100).toFixed(2), x.pesan]));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + baris.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'periksa-kontrak-' + ((typeof PROYEK !== 'undefined' && PROYEK.id) || '') + '-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  // pintu masuk: menu akun & tombol di Rekap Seluruh Kontrak
  function pasang() {
    const dd = document.querySelector('.app-header .menu-akun .dropdown-menu') || document.querySelector('.menu-akun .dropdown-menu');
    if (dd && !document.getElementById('mp2610Menu')) { const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp2610Menu" onclick="mp2610Buka();return false;"><i class="fas fa-stethoscope me-2"></i>Periksa kontrak</a>'; dd.insertBefore(li, dd.firstChild); }
    const rk = document.querySelector('#mp214Rekap button[onclick^="bukaRegister"]');
    if (rk && !rk.parentNode.querySelector('.mp2610-btn')) rk.insertAdjacentHTML('afterend', '<button type="button" class="btn btn-sm btn-outline-secondary mp2610-btn" onclick="mp2610Buka()" title="Periksa nilai, tagihan & notifikasi seluruh kontrak"><i class="fas fa-stethoscope me-1"></i>Periksa</button>');
  }
  let _tm = 0; const jadwal = () => { clearTimeout(_tm); _tm = setTimeout(() => { try { pasang(); } catch (e) { } }, 200); };
  const awasi = () => { if (!document.body) return; pasang(); new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('#mp2610Py')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();
