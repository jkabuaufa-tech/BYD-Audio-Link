/* MP267 — PEMBARUAN 2.6.7: KOREKSI ITEM KONTRAK MASTER — volume / uraian / satuan / harga satuan, tambah item (aditif)
 *  Contoh: 010/SPSA Koperasi Karyawan PT Nindya — Hiab Crane 2 unit × 4 bulan, tetapi item #1 di Master bervolume kosong sehingga
 *  terbaca 4 bulan × 1 unit. Pintu masuk: tombol "Perbaiki item" di form Perbaiki & lengkapi data kontrak dan di form Isi WBS.
 *  Data Master (Excel) TIDAK diubah: koreksi disimpan sebagai catatan koreksi khusus (kunci "SISTEM-KOREKSI-ITEM|<no kontrak>",
 *  aksi server saveKoreksi yang sudah ada: berversi + tercatat di Log) lalu diterapkan setiap kali ringkasan kontrak dibangun —
 *  setelah perbaikan register 2.6.0. Item dicocokkan dengan tanda unik (kodeUnik, atau kode|uraian|volume asli + urutan); urutan item
 *  tidak berubah (item tambahan di akhir, ber-kodeUnik sendiri) sehingga WBS & progres per item tetap pada itemnya. Dapat dibatalkan. */
(function () {
  'use strict';
  if (window.__MP267__) return;
  window.__MP267__ = true;
  const PREFIX = 'SISTEM-KOREKSI-ITEM|';
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const rp = v => Math.round(N(v)).toLocaleString('id-ID');
  const ang = v => N(v).toLocaleString('id-ID', { maximumFractionDigits: 3 });
  const baca = s => { const t = String(s == null ? '' : s).trim(); if (t === '') return null; const x = Number(/,/.test(t) ? t.replace(/\./g, '').replace(',', '.') : (/^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t)); return isFinite(x) ? x : NaN; };
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const peng = () => !!(sesi() && sesi().peran === 'PENGADAAN');
  const kabar = (m, t) => { try { notif(m, t); } catch (e) { } };
  const pesanGalat = e => (typeof pesanServerLama === 'function' ? pesanServerLama(e) : String(e && e.message || e));

  const kodeIt = it => String(it.kodeItem || it.itemService || it.kode || '').trim();
  const uraianIt = it => String(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || '').trim();
  const volIt = it => N(it.volume || it.volumeKontrak || it.vol);
  const satIt = it => String(it.satuan || it.sat || '');
  const hargaIt = it => N(it.hargaSatuan || it.harga || it.hargaKontrak);
  const nilaiIt = it => N(it.nilai || it.jumlah || it.total || it.nilaiKontrak) || volIt(it) * hargaIt(it);
  function tanda(items) {   // sama dengan 2.6.0: kodeUnik bila ada; selain itu kode|uraian|volume + urutan kemunculan
    const n = {};
    return (items || []).map(it => { const b = it.kodeUnik ? 'U:' + it.kodeUnik : 'K:' + kodeIt(it) + '|' + uraianIt(it).toLowerCase() + '|' + volIt(it); n[b] = (n[b] || 0) + 1; return b + '#' + n[b]; });
  }
  // tulis nilai baru ke kolom yang dipakai item itu (Master memakai nama kolom berbeda-beda)
  function ubahItem(it, u) {
    const x = Object.assign({}, it);
    if ('uraian' in u) { let ada = false; ['itemPekerjaanEfektif', 'itemPekerjaan', 'uraian'].forEach(k => { if (k in it) { x[k] = u.uraian; ada = true; } }); if (!ada) x.itemPekerjaan = u.uraian; }
    if ('volume' in u) { let ada = false; ['volume', 'volumeKontrak', 'vol'].forEach(k => { if (k in it) { x[k] = u.volume; ada = true; } }); if (!ada) x.volume = u.volume; }
    if ('satuan' in u) { let ada = false; ['satuan', 'sat'].forEach(k => { if (k in it) { x[k] = u.satuan; ada = true; } }); if (!ada) x.satuan = u.satuan; }
    if ('hargaSatuan' in u) { let ada = false; ['hargaSatuan', 'harga', 'hargaKontrak'].forEach(k => { if (k in it) { x[k] = u.hargaSatuan; ada = true; } }); if (!ada) x.hargaSatuan = u.hargaSatuan; }
    if ('volume' in u || 'hargaSatuan' in u) { const j = volIt(x) * hargaIt(x); ['nilai', 'jumlah', 'total', 'nilaiKontrak'].forEach(k => { if (k in it) x[k] = j; }); }
    return x;
  }
  function itemBaru(t) { return { kodeUnik: t.id, kodeItem: t.kodeItem || '', itemPekerjaan: t.uraian || '', volume: N(t.volume), satuan: t.satuan || '', hargaSatuan: N(t.hargaSatuan), wbs: t.wbs || '', _mp267baru: true }; }
  function aturan() {
    const K = (typeof KOREKSI !== 'undefined' && KOREKSI.data) || {};
    return Object.keys(K).filter(k => k.indexOf(PREFIX) === 0).map(k => K[k]).filter(a => a && a.jenis === 'koreksiItem' && a.aktif !== false && a.kontrak);
  }
  const ST = { galat: [] };
  window.MP267_ITEM = ST;
  function terapkan(hasil) {
    if (!Array.isArray(hasil)) return hasil;
    ST.galat = [];
    for (let i = hasil.length - 1; i >= 0; i--) if (String(hasil[i] && hasil[i].key || '').indexOf(PREFIX) === 0) hasil.splice(i, 1);
    // objek ringkasan dapat dipakai ulang: kembalikan dulu item yang pernah diganti overlay ini (selama tidak diganti lapisan lain)
    hasil.forEach(g => { if (g && g._mp267) { if (g.items === g._mp267.hasil) g.items = g._mp267.asli; delete g._mp267; delete g.mp267; } });
    aturan().forEach(a => {
      const g = hasil.find(x => x && (x.key === a.kontrak || x.keyAsli === a.kontrak));
      if (!g) { ST.galat.push('Kontrak ' + a.kontrak + ' tidak ditemukan — koreksi item tidak diterapkan.'); return; }
      const asli = g.items || [];
      if (asli.some(it => it && it._register)) { ST.galat.push(a.kontrak + ' adalah kontrak Register — koreksi item Master tidak diterapkan.'); return; }
      const sig = tanda(asli), ubah = a.ubah || {}, ko = typeof koreksiDari === 'function' ? koreksiDari(g.keyAsli || g.key) : g.koreksi, peta = (ko && ko.wbsItem) || {};
      let kena = 0;
      const items = asli.map((it, i) => { const u = ubah[sig[i]]; if (!u) return it; kena++; return ubahItem(it, u); });
      const hilang = Object.keys(ubah).length - kena;
      if (hilang > 0) ST.galat.push(hilang + ' item koreksi ' + a.kontrak + ' tidak ditemukan lagi di Master (Master mungkin sudah diperbaiki).');
      (a.tambah || []).forEach(t => { const x = itemBaru(t); if (peta[x.kodeUnik]) x.wbs = peta[x.kodeUnik]; items.push(x); });
      g._mp267 = { asli, hasil: items };
      g.items = items;
      g.mp267 = { aturan: a, diubah: kena, ditambah: (a.tambah || []).length };
    });
    return hasil;
  }
  window.mp267Terapkan = terapkan;
  const _ring = window.getRingkasanKontrak;
  if (typeof _ring === 'function') window.getRingkasanKontrak = function () { const h = _ring.apply(this, arguments); try { return terapkan(h); } catch (e) { console.warn('[2.6.7] koreksi item', e); return h; } };

  /* ---------- form koreksi item ---------- */
  const F = { g: null, key: '', asli: [], sig: [], baris: [], tambah: [], lama: null };
  function ringkasan() { return (typeof RINGKASAN !== 'undefined' && RINGKASAN) || []; }
  function regDari(key) { return ((typeof REG !== 'undefined' && REG.data) || []).find(r => r && r.noKontrak === key) || null; }
  function modal() {
    let m = document.getElementById('mp267Item');
    if (!m) {
      m = document.createElement('div'); m.id = 'mp267Item'; m.className = 'mp260-latar mp267-latar';
      m.innerHTML = `<div class="mp260-kotak" role="dialog" aria-modal="true" aria-labelledby="mp267Judul"><div class="mp260-kepala"><div class="min-w-0"><div class="mp260-judul" id="mp267Judul"></div><div class="mp260-sub"></div></div><button type="button" class="mp260-x" aria-label="Tutup">&times;</button></div><div class="mp260-isi"></div><div class="mp260-kaki"></div></div>`;
      document.body.appendChild(m); m.querySelector('.mp260-x').onclick = tutup; m.addEventListener('mousedown', ev => { if (ev.target === m) tutup(); });
      m.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); tutup(); } });
    }
    return m;
  }
  function tutup() { const m = document.getElementById('mp267Item'); if (m) m.classList.remove('tampil'); }
  window.mp267Tutup = tutup;
  // usulan otomatis: item kembar (kode & harga sama) yang volumenya kosong → samakan dengan kembarannya (contoh Hiab Crane 2 unit)
  function usulan(baris) {
    const out = [];
    baris.forEach((b, i) => {
      if (b.vol > 0 || !(b.harga > 0)) return;
      const k = baris.find((c, j) => j !== i && c.vol > 0 && c.kode === b.kode && Math.abs(c.harga - b.harga) < 1 && c.sat === b.sat);
      if (k) out.push({ i, vol: k.vol, dari: baris.indexOf(k) });
    });
    return out;
  }

  window.mp267Buka = function (key) {
    key = String(key || '').trim();
    const reg = regDari(key);
    if (reg) {   // kontrak Register: item disunting langsung di Register
      kabar('Kontrak Register — item diperbaiki di Edit kontrak › Item.', 'info');
      try { if (typeof bukaEditReg === 'function') { bukaEditReg(reg.id); setTimeout(() => { try { pilihTabReg('item'); } catch (e) { } }, 120); } } catch (e) { }
      return;
    }
    const g = ringkasan().find(x => x && (x.key === key || x.keyAsli === key));
    if (!g) { kabar('Kontrak ' + key + ' tidak ditemukan.', 'err'); return; }
    if (g._mp260baru && g.mp260) { kabar('Item kontrak ini hasil pemindahan dari ' + g.mp260.dari + ' — koreksi volume/harga dilakukan pada kontrak tersebut.', 'err'); window.mp267Buka(g.mp260.dari); return; }
    const kontrak = g.keyAsli || g.key, K = (typeof KOREKSI !== 'undefined' && KOREKSI.data) || {}, lama = K[PREFIX + kontrak] || null, aktif = lama && lama.aktif !== false;
    const asli = (g._mp267 ? g._mp267.asli : g.items) || [], sig = tanda(asli), ubah = (aktif && lama.ubah) || {};
    Object.assign(F, { g, key: kontrak, asli, sig, lama });
    F.baris = asli.map((it, i) => { const u = ubah[sig[i]] || {}, x = Object.keys(u).length ? ubahItem(it, u) : it;
      return { kode: kodeIt(it), uraian0: uraianIt(it), vol0: volIt(it), sat0: satIt(it), harga0: hargaIt(it), uraian: uraianIt(x), vol: volIt(x), sat: satIt(x), harga: hargaIt(x), wbs: it.wbs || '' }; });
    F.tambah = ((aktif && lama.tambah) || []).map(t => Object.assign({}, t));
    F.usul = aktif ? [] : usulan(F.baris);
    gambar(aktif ? lama.alasan || '' : '');
  };
  function gambar(alasan) {
    const g = F.g, bisa = peng(), m = modal();
    m.querySelector('#mp267Judul').innerHTML = '<i class="fas fa-list-ol me-2"></i>Perbaiki item kontrak';
    m.querySelector('.mp260-sub').textContent = F.key + ' · ' + (g.namaVendor || '-') + ' · ' + F.asli.length + ' item Master · nilai kontrak Rp ' + rp(g.nilai);
    const sel = (i, f, v, cls, extra) => `<input class="form-control form-control-sm ${cls || ''}" data-i="${i}" data-f="${f}" value="${E(v)}" ${bisa ? '' : 'disabled'} ${extra || ''}>`;
    m.querySelector('.mp260-isi').innerHTML = `
      ${F.lama && F.lama.aktif !== false ? `<div class="mp260-info"><i class="fas fa-circle-info me-1"></i>Koreksi aktif · ${E(F.lama.diubahOleh || '-')} · ${E(String(F.lama.diubahPada || '').slice(0, 16).replace('T', ' '))} · versi ${E(F.lama.versi)}</div>` : ''}
      ${F.usul.length ? `<div class="mp260-info warn" id="mp267Usul"><i class="fas fa-wand-magic-sparkles me-1"></i><b>Item kembar bervolume kosong:</b> ${F.usul.map(u => '#' + (u.i + 1) + ' ' + E(F.baris[u.i].uraian0) + ' (sama dengan #' + (u.dari + 1) + ' = ' + ang(u.vol) + ' ' + E(F.baris[u.i].sat0) + ')').join('; ')}.
        ${bisa ? '<button type="button" class="btn btn-sm btn-warning py-0 ms-1" onclick="mp267Usul()">Samakan volume</button>' : ''}</div>` : ''}
      ${(ST.galat || []).filter(t => t.indexOf(F.key) >= 0).map(t => `<div class="mp260-info warn"><i class="fas fa-triangle-exclamation me-1"></i>${E(t)}</div>`).join('')}
      <div class="mp260-tabel mp267-tabel"><table class="table table-sm align-middle mb-0"><thead><tr><th>#</th><th>Kode</th><th style="min-width:220px">Uraian item</th><th class="text-end" style="width:110px">Volume</th><th style="width:90px">Satuan</th><th class="text-end" style="width:150px">Harga satuan (Rp)</th><th class="text-end">Jumlah (Rp)</th><th></th></tr></thead><tbody>
        ${F.baris.map((b, i) => `<tr data-r="${i}"><td class="text-muted">${i + 1}</td><td class="font-monospace small">${E(b.kode || '-')}</td>
          <td>${sel(i, 'uraian', b.uraian)}</td><td>${sel(i, 'vol', b.vol || '', 'text-end', 'inputmode="decimal" placeholder="0"')}</td><td>${sel(i, 'sat', b.sat)}</td>
          <td>${sel(i, 'harga', b.harga || '', 'text-end', 'inputmode="decimal" placeholder="0"')}</td><td class="text-end small text-nowrap" data-j="${i}"></td><td class="small text-muted" data-asli="${i}"></td></tr>`).join('')}
        ${F.tambah.map((t, j) => `<tr data-t="${j}" class="mp267-baru"><td class="text-muted">+${j + 1}</td><td>${sel('t' + j, 'kodeItem', t.kodeItem || '', 'font-monospace', 'placeholder="kode"')}</td>
          <td>${sel('t' + j, 'uraian', t.uraian || '')}</td><td>${sel('t' + j, 'volume', t.volume || '', 'text-end', 'inputmode="decimal" placeholder="0"')}</td><td>${sel('t' + j, 'satuan', t.satuan || '')}</td>
          <td>${sel('t' + j, 'hargaSatuan', t.hargaSatuan || '', 'text-end', 'inputmode="decimal" placeholder="0"')}</td><td class="text-end small text-nowrap" data-tj="${j}"></td>
          <td>${bisa ? `<button type="button" class="btn btn-sm btn-link text-danger p-0" title="Hapus item tambahan" onclick="mp267HapusTambah(${j})"><i class="fas fa-trash"></i></button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      ${bisa ? '<button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="mp267Tambah()"><i class="fas fa-plus me-1"></i>Tambah item</button> <span class="small text-muted">mis. unit alat ke-2 yang belum tercatat — atau cukup ubah volume item yang ada.</span>' : ''}
      <div class="mp260-rekap" id="mp267Rekap"></div>
      <label class="d-block mt-2">Alasan koreksi (wajib, tercatat di Log)<textarea class="form-control form-control-sm" id="mp267Alasan" rows="2" ${bisa ? '' : 'disabled'} placeholder="mis. Sesuai kontrak: Hiab Crane 2 unit × 4 bulan (15 Mei – 12 Sep 2026); item #1 di Master volumenya kosong.">${E(alasan)}</textarea></label>
      <div class="small text-muted mt-1"><i class="fas fa-shield-halved me-1"></i>Data Master (Excel), tagihan & riwayat tidak diubah; urutan item & WBS tetap. Koreksi disimpan sebagai catatan koreksi berversi dan dapat dibatalkan. Nilai kontrak (header) diubah lewat form Perbaiki data kontrak.</div>
      <div id="mp267Pesan" class="mt-2"></div>`;
    m.querySelector('.mp260-kaki').innerHTML = `<div>${F.lama && F.lama.aktif !== false && bisa ? '<button type="button" class="btn btn-sm btn-outline-danger" onclick="mp267Batalkan()"><i class="fas fa-rotate-left me-1"></i>Batalkan koreksi</button>' : ''}</div>
      <div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-outline-secondary" onclick="mp267Tutup()">Tutup</button>${bisa ? '<button type="button" class="btn btn-sm btn-primary" id="mp267Simpan" onclick="mp267Simpan()"><i class="fas fa-save me-1"></i>Simpan koreksi item</button>' : '<span class="small text-muted align-self-center">Masuk sebagai peran Pengadaan untuk memperbaiki.</span>'}</div>`;
    m.querySelectorAll('.mp260-isi input[data-f]').forEach(el => el.addEventListener('input', () => isi(el)));
    m.classList.add('tampil');
    rekap();
  }
  function isi(el) {
    const i = el.dataset.i, f = el.dataset.f;
    const x = i[0] === 't' ? F.tambah[+i.slice(1)] : F.baris[+i];
    if (x) x[f] = el.value;
    rekap();
  }
  const angkaDari = v => { if (typeof v === 'number') return v; const x = baca(v); return x === null ? 0 : x; };
  function hitung() {
    const brs = F.baris.map(b => { const vol = angkaDari(b.vol), harga = angkaDari(b.harga); return { vol, harga, jml: (isFinite(vol) ? vol : 0) * (isFinite(harga) ? harga : 0), salah: !isFinite(vol) || !isFinite(harga) || vol < 0 || harga < 0 }; });
    const tb = F.tambah.map(t => { const vol = angkaDari(t.volume), harga = angkaDari(t.hargaSatuan); return { vol, harga, jml: (isFinite(vol) ? vol : 0) * (isFinite(harga) ? harga : 0), salah: !isFinite(vol) || !isFinite(harga) || vol < 0 || harga < 0 }; });
    const total = brs.concat(tb).reduce((s, x) => s + x.jml, 0), asli = F.asli.reduce((s, it) => s + nilaiIt(it), 0);
    const ubah = {}; F.baris.forEach((b, i) => { const u = {}, x = brs[i];
      if (String(b.uraian).trim() !== b.uraian0) u.uraian = String(b.uraian).trim();
      if (x.vol !== b.vol0) u.volume = x.vol;
      if (String(b.sat).trim() !== b.sat0) u.satuan = String(b.sat).trim();
      if (x.harga !== b.harga0) u.hargaSatuan = x.harga;
      if (Object.keys(u).length) ubah[F.sig[i]] = Object.assign(u, { _i: i }); });
    return { brs, tb, total, asli, ubah, nUbah: Object.keys(ubah).length };
  }
  function rekap() {
    const h = hitung(), m = document.getElementById('mp267Item'); if (!m) return;
    h.brs.forEach((x, i) => { const td = m.querySelector(`[data-j="${i}"]`); if (td) td.textContent = x.salah ? '—' : rp(x.jml);
      const b = F.baris[i], a = m.querySelector(`[data-asli="${i}"]`), beda = !!h.ubah[F.sig[i]];
      if (a) a.innerHTML = beda ? `<span class="badge mp267-tanda" title="Master: ${E(b.uraian0)} · ${ang(b.vol0)} ${E(b.sat0)} × Rp ${rp(b.harga0)}">diubah</span>` : '';
      const tr = m.querySelector(`tr[data-r="${i}"]`); if (tr) tr.classList.toggle('mp267-ubah', beda);
      m.querySelectorAll(`tr[data-r="${i}"] input[data-f="vol"], tr[data-r="${i}"] input[data-f="harga"]`).forEach(el => el.classList.toggle('is-invalid', x.salah)); });
    h.tb.forEach((x, j) => { const td = m.querySelector(`[data-tj="${j}"]`); if (td) td.textContent = x.salah ? '—' : rp(x.jml); });
    const nk = N(F.g.nilai), sama = Math.abs(h.total - nk) < 1, el = document.getElementById('mp267Rekap');
    if (el) el.innerHTML = `<span>Jumlah item <b>Rp ${rp(h.total)}</b> (Master Rp ${rp(h.asli)})</span><span>Nilai kontrak Rp ${rp(nk)} ${sama ? '<span class="text-success"><i class="fas fa-check"></i> sesuai</span>' : `<span class="text-danger"><i class="fas fa-triangle-exclamation"></i> selisih Rp ${rp(h.total - nk)}</span>`}</span><span class="text-muted">${h.nUbah} item diubah · ${F.tambah.length} item tambahan</span>`;
  }
  window.mp267Usul = function () {
    F.usul.forEach(u => { F.baris[u.i].vol = u.vol; const el = document.querySelector(`#mp267Item tr[data-r="${u.i}"] input[data-f="vol"]`); if (el) el.value = u.vol; });
    const t = document.getElementById('mp267Alasan');
    if (t && !t.value.trim()) t.value = 'Volume item kembar disamakan: ' + F.usul.map(u => '#' + (u.i + 1) + ' ' + F.baris[u.i].uraian0 + ' = ' + ang(u.vol) + ' ' + F.baris[u.i].sat0).join('; ') + ' (sesuai kontrak).';
    const b = document.getElementById('mp267Usul'); if (b) b.classList.replace('warn', 'ok');
    rekap();
  };
  function simpanIsian() { const t = document.getElementById('mp267Alasan'); return t ? t.value : ''; }
  window.mp267Tambah = function () {
    const a = simpanIsian(), contoh = F.baris.find(b => b.harga0 > 0) || {};
    F.tambah.push({ id: 'MP267-' + Date.now().toString(36) + '-' + F.tambah.length, kodeItem: contoh.kode || '', uraian: contoh.uraian || '', volume: '', satuan: contoh.sat || '', hargaSatuan: contoh.harga || '' });
    gambar(a);
    const el = document.querySelector(`#mp267Item tr[data-t="${F.tambah.length - 1}"] input[data-f="volume"]`); if (el) el.focus();
  };
  window.mp267HapusTambah = function (j) { const a = simpanIsian(); F.tambah.splice(j, 1); gambar(a); };
  window.mp267Simpan = async function () {
    const ps = document.getElementById('mp267Pesan'), salah = t => { if (ps) ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0 small">' + E(t) + '</div>'; };
    if (!peng()) return salah('Hanya peran Pengadaan yang boleh memperbaiki item kontrak.');
    const h = hitung(), alasan = String(simpanIsian()).trim();
    const bad = h.brs.findIndex(x => x.salah); if (bad >= 0) return salah('Item #' + (bad + 1) + ': volume / harga satuan tidak valid.');
    const badT = h.tb.findIndex(x => x.salah); if (badT >= 0) return salah('Item tambahan +' + (badT + 1) + ': volume / harga satuan tidak valid.');
    const kosongT = F.tambah.findIndex((t, j) => !String(t.uraian || '').trim() || !(h.tb[j].vol > 0)); if (kosongT >= 0) return salah('Item tambahan +' + (kosongT + 1) + ': isi uraian dan volume.');
    if (F.baris.some(b => !String(b.uraian).trim() && b.uraian0)) return salah('Uraian item tidak boleh dikosongkan.');
    const adaLama = F.lama && F.lama.aktif !== false;
    if (!h.nUbah && !F.tambah.length && !adaLama) return salah('Belum ada perubahan item.');
    if (!h.nUbah && !F.tambah.length && adaLama) return window.mp267Batalkan();
    if (alasan.length < 10) return salah('Isi alasan koreksi minimal 10 karakter.');
    const ubah = {}, uraian = [];
    Object.keys(h.ubah).forEach(s => { const u = Object.assign({}, h.ubah[s]), i = u._i; delete u._i; ubah[s] = u; const b = F.baris[i];
      uraian.push('#' + (i + 1) + ' ' + b.kode + ' ' + b.uraian0 + ': ' + Object.keys(u).map(k => k === 'volume' ? 'vol ' + ang(b.vol0) + '→' + ang(u.volume) : k === 'hargaSatuan' ? 'harga ' + rp(b.harga0) + '→' + rp(u.hargaSatuan) : k + ' → ' + u[k]).join(', ')); });
    const tambah = F.tambah.map((t, j) => ({ id: t.id, kodeItem: String(t.kodeItem || '').trim(), uraian: String(t.uraian).trim(), volume: h.tb[j].vol, satuan: String(t.satuan || '').trim(), hargaSatuan: h.tb[j].harga }));
    tambah.forEach(t => uraian.push('+ ' + t.kodeItem + ' ' + t.uraian + ': ' + ang(t.volume) + ' ' + t.satuan + ' × ' + rp(t.hargaSatuan)));
    const key = PREFIX + F.key, K = KOREKSI.data || (KOREKSI.data = {}), lama = K[key] || null;
    const data = { jenis: 'koreksiItem', versiFormat: 1, kontrak: F.key, aktif: true, alasan, ubah, tambah, uraian: uraian.slice(0, 60), nilaiItem: h.total, nilaiKontrak: N(F.g.nilai) };
    const b = document.getElementById('mp267Simpan'); if (b) { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Menyimpan…'; }
    try {
      const r = await regAksi('saveKoreksi', { data: { key, versi: lama ? lama.versi : 0, data } });
      K[key] = r.data;
      selesai('Koreksi item tersimpan: ' + h.nUbah + ' item diubah' + (tambah.length ? ', ' + tambah.length + ' item ditambah' : '') + ' · jumlah item Rp ' + rp(h.total) + '.');
    } catch (e) { salah(pesanGalat(e)); if (/KONFLIK/.test(String(e && e.message))) { try { await muatRegister(true); } catch (_) { } } }
    finally { if (b) { b.disabled = false; b.innerHTML = '<i class="fas fa-save me-1"></i>Simpan koreksi item'; } }
  };
  function selesai(pesan) {
    const key = F.key;
    if (typeof renderAllTables === 'function') { try { renderAllTables(); } catch (e) { console.warn('[2.6.7]', e); } }
    tutup(); kabar(pesan, 'ok');
    const w = document.getElementById('modalWbs');   // form Isi WBS yang masih terbuka ikut memuat item terbaru
    if (w && w.classList.contains('show') && typeof window.bukaWbs === 'function') { try { window.bukaWbs(key); } catch (e) { } }
  }
  window.mp267Batalkan = async function () {
    const key = PREFIX + F.key, lama = KOREKSI.data && KOREKSI.data[key]; if (!lama) return;
    let ok = true; try { if (typeof tanya === 'function') ok = await tanya('Batalkan koreksi item ' + F.key + '? Item kembali ke data Master asli (koreksi tetap tercatat di Log).', { judul: 'Batalkan koreksi item', ok: 'Batalkan koreksi', bahaya: true }); } catch (e) { }
    if (!ok) return;
    const data = {}; Object.keys(lama).forEach(k => { if (['key', 'versi', 'diubahOleh', 'diubahPada'].indexOf(k) < 0) data[k] = lama[k]; }); data.aktif = false;
    try { const r = await regAksi('saveKoreksi', { data: { key, versi: lama.versi, data } }); KOREKSI.data[key] = r.data; selesai('Koreksi item ' + F.key + ' dibatalkan.'); }
    catch (e) { kabar(pesanGalat(e), 'err'); }
  };

  /* ---------- pintu masuk ---------- */
  // form "Perbaiki & lengkapi data kontrak" (HTML dasar): ingat nomor kontrak yang dibuka, tombol dipasang di sebelah tombol simpan
  let terakhir = '';
  const _kor = window.bukaKoreksi;
  if (typeof _kor === 'function') window.bukaKoreksi = function (key) { terakhir = String(key || ''); const h = _kor.apply(this, arguments); [60, 350, 900].forEach(t => setTimeout(jadwal, t)); return h; };
  const tampak = el => !!(el && el.offsetParent !== null);
  const masalah = g => (g && (g.items || []).filter(it => !it._register && hargaIt(it) > 0 && !(volIt(it) > 0)).length) || 0;
  function tombol(key, kecil) {
    const g = ringkasan().find(x => x && (x.key === key || x.keyAsli === key)), n = masalah(g);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (kecil ? 'btn-sm ' : '') + 'btn-outline-warning mp267-btn'; b.dataset.key = key;
    b.title = 'Perbaiki volume / uraian / satuan / harga item kontrak' + (n ? ' — ' + n + ' item bervolume kosong' : '');
    b.innerHTML = '<i class="fas fa-list-ol me-1"></i>Perbaiki item' + (n ? ' <span class="badge text-bg-danger">' + n + '</span>' : '') + (g && g.mp267 ? ' <span class="badge mp267-tanda">dikoreksi</span>' : '');
    b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); window.mp267Buka(b.dataset.key); };
    return b;
  }
  function pasang() {
    // 1) form Perbaiki & lengkapi data kontrak: tombol "Simpan Perbaikan" yang tampak
    const simpan = [...document.querySelectorAll('button')].find(b => tampak(b) && /Simpan\s+Perbaikan/i.test(b.textContent || '') && !b.closest('#mp267Item, #mp260Reg'));
    if (simpan) {
      const kotak = simpan.closest('.modal, .offcanvas, [role=dialog]') || simpan.parentElement.parentElement || simpan.parentElement, ada = kotak.querySelector('.mp267-btn');
      // nomor kontrak: yang terakhir dibuka lewat bukaKoreksi, atau yang tertulis di kepala form
      const key = terakhir || ((kotak.textContent || '').match(/\b\d{1,4}\/[A-Z]{2,5}\/[^\s]+\/\d{4}\b/) || [])[0] || '';
      if (!key || regDari(key)) { if (ada) ada.remove(); }   // kontrak Register: item disunting di Edit kontrak Register
      else if (!ada || ada.dataset.key !== key) {
        if (ada) ada.remove();
        const prog = [...kotak.querySelectorAll('button')].find(b => /Input\s+Progres/i.test(b.textContent || '')), t = tombol(key);
        if (prog) { prog.after(t); t.classList.add('ms-2'); } else simpan.before(t);
      }
    }
    // 2) form Isi WBS
    const aw = document.getElementById('aksiWbs'), jw = document.querySelector('#judulWbs .font-monospace');
    if (aw && jw && tampak(aw)) {
      const key = jw.textContent.trim(), ada = aw.querySelector('.mp267-btn');
      if (!ada || ada.dataset.key !== key) { if (ada) ada.remove(); const grp = aw.firstElementChild; if (grp) grp.appendChild(tombol(key, true)); }
    }
    // 3) penanda di daftar Register Kontrak
    const peta = new Map(); ringkasan().forEach(x => { if (x && x.mp267) { peta.set(x.key, x); if (x.keyAsli) peta.set(x.keyAsli, x); } });
    document.querySelectorAll('tr.baris-kontrak[data-key]').forEach(tr => {
      const g = peta.get(tr.dataset.key), td = tr.firstElementChild, s = td && td.querySelector('.mp267-tanda');
      if (g && td && !s) { const b = document.createElement('span'); b.className = 'badge mp267-tanda ms-1'; b.innerHTML = '<i class="fas fa-list-ol me-1"></i>item dikoreksi'; b.title = 'Koreksi item: ' + (g.mp267.aturan.alasan || ''); const c = td.querySelector('code'); if (c) c.after(b); else td.appendChild(b); }
      else if (!g && s) s.remove();
    });
  }
  let _tm = 0; const jadwal = () => { clearTimeout(_tm); _tm = setTimeout(() => { try { pasang(); } catch (e) { } }, 150); };
  const pasangObs = () => { if (!document.body) return; new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest('#mp267Item')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); jadwal(); };
  if (document.body) pasangObs(); else document.addEventListener('DOMContentLoaded', pasangObs);
})();
