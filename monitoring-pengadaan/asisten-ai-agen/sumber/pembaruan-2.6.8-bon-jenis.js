/* MP268 — PEMBARUAN 2.6.8: BON PERMINTAAN BAHAN · ALAT · SUB (aditif; tanpa perubahan server, sheet maupun data Bon lama)
 *  Form Bon dulu hanya mencari di Master Material. Kini ada pilihan jenis permintaan di atas Rincian barang:
 *    Bahan — Master Material, kode berawalan 1 dan 21   (mis. 1000000001, 2100000004)
 *    Alat  — Master Service,  kode berawalan 49          (Sewa Alat, mis. 49000000 Excavator)
 *    Sub   — Master Service,  kode berawalan 29 dan 39   (Upah Mandor 29xxx, Subkon 39xxx)
 *  Master tambahan (menu Master Data) ikut: Material → Bahan; Service → menurut kode SAP-nya, atau kategori "alat" → Alat, lainnya → Sub.
 *  Jenis Bon dibaca dari kode itemnya (server 2.5.1 hanya menyimpan kode/uraian/sat/vol/harga/wbs) → Bon lama tetap terbaca sebagai
 *  Bahan, tanpa migrasi. Daftar Bon diberi lencana & filter jenis; cetak formulir mencentang Material / Alat / Tenaga (Sub). */
(function () {
  'use strict';
  if (window.__MP268__) return;
  if (typeof renderItemPermintaan !== 'function' || typeof setupAutocomplete !== 'function' || typeof PMT === 'undefined') return;
  window.__MP268__ = true;
  const $ = id => document.getElementById(id);
  const JENIS = {
    BAHAN: { label: 'Bahan', ikon: 'fa-boxes-stacked', master: 'Master Material', kode: '1xxx · 21xxx', warna: '#C2610C', nama: 'Nama Bahan', kolomKode: 'Kode Material',
      ph: 'Ketik nama / kode bahan dari Master Material (1xxx / 21xxx)' },
    ALAT: { label: 'Alat', ikon: 'fa-truck-front', master: 'Master Service', kode: '49xxx', warna: '#3F86C9', nama: 'Nama Alat (sewa)', kolomKode: 'Kode Service',
      ph: 'Ketik nama / kode alat dari Master Service (49xxx · Sewa Alat)' },
    SUB: { label: 'Sub', ikon: 'fa-person-digging', master: 'Master Service', kode: '29xxx · 39xxx', warna: '#6F42C1', nama: 'Uraian Pekerjaan Sub', kolomKode: 'Kode Service',
      ph: 'Ketik nama / kode pekerjaan dari Master Service (29xxx Upah · 39xxx Subkon)' }
  };
  const URUT = ['BAHAN', 'ALAT', 'SUB'];
  const S = { jenis: 'BAHAN', daftar: '' };   // jenis form & filter jenis di Daftar Permintaan ('' = semua)
  window.MP268 = S;

  const mat = () => (typeof MASTER_MATERIALS !== 'undefined' ? MASTER_MATERIALS : []);
  const svc = () => (typeof MASTER_SERVICES !== 'undefined' ? MASTER_SERVICES : []);
  // kode baku → jenis; null = bukan kode SAP (mis. CUST-… master tambahan tanpa kode SAP)
  function jenisAwalan(kode) {
    const k = String(kode || '').trim();
    if (!/^\d/.test(k)) return null;
    if (/^(1|21)/.test(k)) return 'BAHAN';
    if (/^49/.test(k)) return 'ALAT';
    if (/^(29|39)/.test(k)) return 'SUB';
    return '';
  }
  function jenisMaster(m, dariService) {
    const j = jenisAwalan(m.code);
    if (j !== null) return j;
    if (!dariService) return 'BAHAN';
    return /alat/i.test([m.category, m.group, m.package].join(' ')) ? 'ALAT' : 'SUB';
  }
  // indeks kode (Material + Service, termasuk master tambahan) — dibangun ulang bila isi master berubah
  let _idx = null, _idxKunci = '';
  const ekor = a => { let s = a.length + ''; for (let i = a.length - 1; i >= 0 && a[i] && a[i]._mp214; i--) s += '|' + a[i].code + '~' + a[i].desc + '~' + (a[i].category || ''); return s; };   // master tambahan selalu di ujung larik
  const kunciMaster = () => ekor(mat()) + ':' + ekor(svc());
  function indeks() {
    const k = kunciMaster(); if (_idx && _idxKunci === k) return _idx;
    _idx = new Map(); _idxKunci = k; _data = {};
    mat().forEach(m => _idx.set(String(m.code), { m, j: jenisMaster(m, false) }));
    svc().forEach(m => { const c = String(m.code); if (!_idx.has(c)) _idx.set(c, { m, j: jenisMaster(m, true) }); });
    return _idx;
  }
  let _data = {};
  function dataJenis(j) {
    indeks();
    if (!_data[j]) _data[j] = (j === 'BAHAN' ? mat() : svc()).filter(m => jenisMaster(m, j !== 'BAHAN') === j);
    return _data[j];
  }
  function jenisDariKode(kode) {
    const k = String(kode || '').trim(); if (!k) return '';
    const x = indeks().get(k); if (x) return x.j;
    return jenisAwalan(k) || '';
  }
  window.mp268JenisKode = jenisDariKode;
  // jenis sebuah Bon: dari kode item; Bon tanpa item berkode jenis apa pun = Bahan (seperti sebelum 2.6.8)
  function jenisBon(p) {
    const s = new Set((p.items || []).map(i => jenisDariKode(i.kode)).filter(Boolean));
    return s.size ? URUT.filter(j => s.has(j)) : ['BAHAN'];
  }
  window.mp268JenisBon = jenisBon;
  const lencana = (j, kecil) => { const J = JENIS[j]; return `<span class="badge rounded-pill mp268-bdg" style="background:${J.warna}"><i class="fas ${J.ikon} me-1"></i>${J.label}${kecil ? '' : ' · ' + J.kode}</span>`; };

  /* ---------- fungsi HTML dasar yang membaca jenis dari kode ---------- */
  window.jenisKode = function (kode) { const j = jenisDariKode(kode); return j === 'BAHAN' ? 'Material' : j === 'ALAT' ? 'Alat' : j === 'SUB' ? 'Sub' : ''; };
  window.badgeJenisKode = function (kode) {
    if (!kode) return '<span class="badge rounded-pill text-bg-warning" title="Tidak ada di master">di luar master</span>';
    const j = jenisDariKode(kode);
    return j ? lencana(j) : '<span class="badge text-bg-secondary">Lainnya</span>';
  };
  window.materialDariKode = function (kode) { const x = indeks().get(String(kode || '').trim()); return x ? x.m : null; };
  window.materialDariNama = function (desc) {   // cocokkan nama ketikan hanya di master jenis yang sedang dipilih
    const q = String(desc || '').trim().toLowerCase(); if (!q) return null;
    return dataJenis(S.jenis).find(m => String(m.desc || '').trim().toLowerCase() === q || String(m.code) === q) || null;
  };

  /* ---------- autocomplete baris Bon: sumber data mengikuti jenis ---------- */
  const acAsli = window.setupAutocomplete;
  window.setupAutocomplete = function (input, opts) {
    if (input && /^pmNama\d+$/.test(input.id || '') && opts) {
      opts = Object.assign({}, opts, { getData: () => dataJenis(S.jenis) });
    }
    return acAsli.call(this, input, opts);
  };

  /* ---------- pilihan jenis di form ---------- */
  function pasangPilihan() {
    const body = $('pmBody'); if (!body || $('mp268Pilih')) return;
    const kartu = body.closest('.card'); if (!kartu) return;
    const d = document.createElement('div'); d.id = 'mp268Pilih'; d.className = 'mp268-pilih mb-3';
    kartu.insertBefore(d, kartu.firstChild);
    const p = document.querySelector('#tab-form-bon > p.petunjuk');
    if (p) p.innerHTML = 'Permintaan <b>Bahan</b> (Master Material, kode 1xxx / 21xxx), <b>Alat</b> (Master Service, kode 49xxx · sewa alat) atau <b>Sub</b> (Master Service, kode 29xxx upah / 39xxx subkon) dari departemen. Estimasi biaya dihitung otomatis, dan WBS di sini terbawa ke Register Kontrak saat kontrak dibuat dari nomor permintaan ini.';
    const h = document.querySelector('#tab-form-bon > h3'); if (h && /Permintaan Barang/.test(h.textContent)) h.textContent = 'Form Bon Permintaan';
  }
  function renderPilihan() {
    pasangPilihan();
    const d = $('mp268Pilih'); if (!d) return;
    const kunci = typeof hanyaWbsPmt === 'function' && hanyaWbsPmt();
    const isi = (PMT.items || []).filter(i => String(i.kode || '').trim());
    const lain = isi.filter(i => { const j = jenisDariKode(i.kode); return j && j !== S.jenis; });
    d.innerHTML = `<div class="small fw-semibold text-muted mb-1">Jenis permintaan</div>
      <div class="mp268-seg" role="radiogroup" aria-label="Jenis permintaan">${URUT.map(j => { const J = JENIS[j], on = S.jenis === j;
        return `<button type="button" role="radio" aria-checked="${on}" class="mp268-opsi ${on ? 'aktif' : ''}" data-j="${j}" style="--mp268-w:${J.warna}" ${kunci ? 'disabled' : ''} onclick="mp268Pilih('${j}')">
          <i class="fas ${J.ikon}"></i><span><b>${J.label}</b><small>${J.master} · ${J.kode}</small></span></button>`; }).join('')}</div>
      ${lain.length ? `<div class="small mt-2 mp268-campur"><i class="fas fa-circle-info me-1"></i>${lain.length} baris berjenis lain (${[...new Set(lain.map(i => JENIS[jenisDariKode(i.kode)].label))].join(', ')}) tetap tersimpan. Pencarian baris baru memakai ${JENIS[S.jenis].master} ${JENIS[S.jenis].kode}.</div>` : ''}`;
    const J = JENIS[S.jenis];
    const th = document.querySelectorAll('#tab-form-bon thead tr th');
    if (th.length > 2 && $('pmBody') && th[1].closest('table') === $('pmBody').closest('table')) { th[1].textContent = J.nama; th[2].textContent = J.kolomKode; }
    document.querySelectorAll('#pmBody input[id^="pmNama"]').forEach(i => { i.placeholder = J.ph; });
    const h6 = $('pmBody') && $('pmBody').closest('.card').querySelector('h6'); if (h6) h6.textContent = 'Rincian ' + J.label.toLowerCase();
  }
  window.mp268Pilih = function (j) {
    if (!JENIS[j] || S.jenis === j) return;
    S.jenis = j; renderPilihan();
    const kosong = (PMT.items || []).findIndex(i => !String(i.uraian || '').trim() && !String(i.kode || '').trim());
    const el = kosong >= 0 && $('pmNama' + kosong); if (el && !el.disabled) el.focus();
  };

  const bungkus = (nama, sesudah) => { const asli = window[nama]; if (typeof asli !== 'function') return;
    window[nama] = function () { const r = asli.apply(this, arguments); try { sesudah.apply(this, arguments); } catch (err) { console.warn('MP268 ' + nama, err); } return r; }; };
  bungkus('renderItemPermintaan', renderPilihan);
  bungkus('editPermintaan', function (id) { const p = PMT.data.find(x => x.id === id); if (p) { S.jenis = jenisBon(p)[0]; renderPilihan(); } });
  bungkus('perbaruiPermintaan', function () {   // KPI "Jumlah barang": rincian per jenis
    const k = document.querySelector('#pmRingkas .reg-kpi .small'); if (!k) return;
    const isi = (PMT.items || []).filter(itemPmtBerisi), n = j => isi.filter(i => jenisDariKode(i.kode) === j).length;
    k.textContent = n('BAHAN') + ' bahan · ' + n('ALAT') + ' alat · ' + n('SUB') + ' sub';
    const ln = document.querySelector('.mp268-campur'), beda = isi.some(i => { const j = jenisDariKode(i.kode); return j && j !== S.jenis; });
    if (!!ln !== beda) renderPilihan();
  });

  /* ---------- Daftar Permintaan: lencana & filter jenis ---------- */
  const daftarAsli = window.renderDaftarPermintaan;
  if (typeof daftarAsli === 'function') window.renderDaftarPermintaan = function () {
    const semua = PMT.data, f = S.daftar;
    if (f) PMT.data = semua.filter(p => jenisBon(p).includes(f));
    let r;
    try { r = daftarAsli.apply(this, arguments); } finally { if (f) PMT.data = semua; }
    try {
      const ch = $('pmChips');
      if (ch) {
        let w = $('mp268Daftar');
        if (!w) { w = document.createElement('div'); w.id = 'mp268Daftar'; w.className = 'd-flex flex-wrap gap-1'; ch.before(w); }
        const n = j => semua.filter(p => jenisBon(p).includes(j)).length;
        w.innerHTML = `<button type="button" class="reg-chip ${!f ? 'aktif' : ''}" onclick="MP268.daftar=''; renderDaftarPermintaan()">Semua jenis<span class="n">${semua.length}</span></button>`
          + URUT.map(j => `<button type="button" class="reg-chip ${f === j ? 'aktif' : ''}" onclick="MP268.daftar='${j}'; renderDaftarPermintaan()"><i class="fas ${JENIS[j].ikon} me-1"></i>${JENIS[j].label}<span class="n">${n(j)}</span></button>`).join('');
      }
      document.querySelectorAll('#pmDaftar tr').forEach(tr => {
        const b = tr.querySelector('button[onclick^="cetakPermintaan"]'); if (!b || tr.querySelector('.mp268-bdg')) return;
        const id = (b.getAttribute('onclick').match(/cetakPermintaan\('([^']+)'\)/) || [])[1], p = semua.find(x => x.id === id), td = tr.children[2];
        if (p && td) td.insertAdjacentHTML('afterbegin', '<div class="mb-1">' + jenisBon(p).map(j => lencana(j, true)).join(' ') + '</div>');
      });
      if (f) { const inf = $('pmInfoDaftar'); if (inf) inf.textContent += ' · jenis ' + JENIS[f].label; }
    } catch (err) { console.warn('MP268 daftar', err); }
    return r;
  };

  /* ---------- cetak formulir: Sub dicentang pada "Tenaga" ---------- */
  const dokAsli = window.dokumenPermintaan;
  if (typeof dokAsli === 'function') window.dokumenPermintaan = function (p) {
    const html = dokAsli.apply(this, arguments);
    try {
      const j = new Set((p && p.items || []).map(i => jenisDariKode(i.kode)).filter(Boolean));
      if (j.has('SUB')) return html.replace('<span class="off">Tenaga</span>', '<span class="on">Tenaga (Sub)</span>');
    } catch (err) { }
    return html;
  };

  // form yang sudah tergambar sebelum paket dimuat: pasang ulang autocomplete dengan sumber per jenis
  try { if ($('pmBody')) { renderItemPermintaan(); perbaruiPermintaan(); } if ($('pmDaftar')) renderDaftarPermintaan(); } catch (err) { console.warn('MP268 awal', err); }
})();
