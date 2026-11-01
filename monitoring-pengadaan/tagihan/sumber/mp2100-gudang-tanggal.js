/* MP2100 — FOTO PENERIMAAN PER MATERIAL · TANGGAL BAPM & BAP TERPISAH · SINKRON TANGGAL GUDANG (2.10.0; Modul server 1.10.6)
 *  1. Foto per material: Terima Bon (Penerimaan Material) & Lengkapi foto (GR otomatis) menyediakan slot 4 sisi (Depan, Belakang,
 *     Kanan, Kiri) untuk SETIAP item. Foto kiriman yang lama menjadi "Foto utama" yang mewakili item tanpa foto sendiri.
 *     Tiap item wajib ≥ 1 foto (sendiri atau wakil) — dicek di aplikasi & server.
 *  2. Tanggal BAPM/BAPP & Tanggal BAP terpisah: Input Progres (2 isian baru), Preview BA (tanggal BA saat terbit), Paket Tagihan
 *     ("Tanggal BAPM" + "Tanggal dokumen (BAP & Kwitansi)"). Disimpan di BK (aksi bkTanggal) → dokumen BA & lampiran memakai
 *     tanggal BA, BAP/invoice/kwitansi memakai tanggal BAP; Excel: Master SPM INPUT!B (BAPM) & G (BAP), BAP format DATA!B99 & C99.
 *  3. Kartu Gudang & Penerimaan: GR otomatis bertanggal = tanggal BAPM (server). Tombol "Sinkron tanggal BAPM" di Penerimaan Material.
 *  4. Validasi: tanggal BAPM & BAP ≤ tanggal akhir kontrak/SPM (Register, termasuk addendum) & ≥ tanggal kontrak. */
(function () {
  'use strict';
  if (window.__MP2100__) return; window.__MP2100__ = true;
  const $ = id => document.getElementById(id);
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pesan = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || ''); } catch (e) { } };
  const g$ = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined ? fb : v; } catch (e) { return fb; } };
  const SISI = ['Tampak Depan', 'Tampak Belakang', 'Samping Kanan', 'Samping Kiri'], SINGKAT = ['D', 'B', 'Ka', 'Ki'];
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const progres = () => { try { return (typeof PROG !== 'undefined' && PROG && PROG.data) || []; } catch (e) { return []; } };
  const tglK = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[3] + '/' + m[2] + '/' + m[1] : '-'; };

  /* ======================= masa berlaku kontrak ======================= */
  function batasKontrak(key) {
    let reg = null; try { reg = ((typeof REG !== 'undefined' && REG.data) || []).find(r => r.noKontrak === key) || null; } catch (e) { }
    let g = null; try { g = ((typeof RINGKASAN !== 'undefined' && RINGKASAN) || []).find(x => x.key === key || (x.terkait || []).indexOf(key) >= 0) || null; } catch (e) { }
    const akhir = S((reg && reg.tglSelesai) || (g && ((g.koreksi && g.koreksi.tglSelesai) || g.tglSelesai))).slice(0, 10), mulai = S((reg && reg.tglKontrak) || (g && g.tglMulai)).slice(0, 10);
    return { akhir: /^\d{4}-\d{2}-\d{2}$/.test(akhir) ? akhir : '', mulai: /^\d{4}-\d{2}-\d{2}$/.test(mulai) ? mulai : '' };
  }
  function cekTgl(key, t, label) {
    if (!t) return ''; const B = batasKontrak(key);
    if (B.akhir && t > B.akhir) return label + ' (' + tglK(t) + ') melewati masa berlaku kontrak/SPM (' + tglK(B.akhir) + '). Perpanjang lewat addendum (Tanggal Selesai di Register Kontrak).';
    if (B.mulai && t < B.mulai) return label + ' (' + tglK(t) + ') lebih awal dari tanggal kontrak (' + tglK(B.mulai) + ').';
    return '';
  }
  window.mp2100CekTanggal = cekTgl;
  const namaBA = key => { const j = (S(key).split('/')[1] || '').toUpperCase(); return /^(SPM|SPPM)$/.test(j) ? 'BAPM' : /^SPKA|SEWA|SPSA/.test(j) ? 'BAPA' : 'BAPP'; };
  async function simpanTanggal(id, tBA, tBAP) {
    if (!srv('tanggalBAPMBAP')) return null;
    const e = progres().find(x => x.id === id), d = { id, batasKontrak: e ? batasKontrak(e.noKontrak).akhir : '' };
    if (tBA !== undefined) d.tanggalBA = tBA; if (tBAP !== undefined) d.tanggalBAP = tBAP;
    const r = await window.regAksi('bkTanggal', { data: d });
    try { const L = progres(), i = L.findIndex(x => x.id === id); if (i >= 0 && r && r.data) L[i] = r.data; } catch (er) { }
    if (r && r.gudang && r.gudang.n) pesan(r.gudang.n + ' penerimaan gudang otomatis disinkronkan ke tanggal BA ' + tglK(r.gudang.tanggal) + ' (Kartu Gudang ikut).', 'ok');
    return r;
  }

  /* ======================= 2a. Input Progres: Tanggal BAPM & Tanggal BAP ======================= */
  const FPX = { edit: null };
  function pasangFP() {
    const t = $('fp_tanggal'); if (!t || $('mp2100TglBA')) return;
    const kol = t.closest('[class*="col-"]') || t.parentElement;
    let g = null; try { g = typeof FP !== 'undefined' && FP ? FP.g : null; } catch (e) { }
    const nm = namaBA(g && g.key);
    kol.insertAdjacentHTML('afterend', `<div class="${E(kol.className)} mp2100-tgl"><label class="form-label" for="mp2100TglBA">Tanggal <span id="mp2100NmBA">${nm}</span></label><input type="date" class="form-control" id="mp2100TglBA" title="Tanggal pada ${nm} (dipakai Kartu Gudang & penerimaan otomatis)"></div>
      <div class="${E(kol.className)} mp2100-tgl"><label class="form-label" for="mp2100TglBAP">Tanggal BAP</label><input type="date" class="form-control" id="mp2100TglBAP" title="Tanggal Berita Acara Pembayaran (boleh berbeda dengan ${nm})"></div>
      <div class="col-12 mp2100-pesan" id="mp2100FpPesan" role="alert" hidden></div>`);
    ['mp2100TglBA', 'mp2100TglBAP'].forEach(id => $(id).addEventListener('change', cekFP));
  }
  function cekFP() {
    const el = $('mp2100FpPesan'); if (!el) return '';
    let g = null; try { g = typeof FP !== 'undefined' && FP ? FP.g : null; } catch (e) { }
    const nm = namaBA(g && g.key); if ($('mp2100NmBA')) $('mp2100NmBA').textContent = nm;
    const tBA = ($('mp2100TglBA') || {}).value, tBAP = ($('mp2100TglBAP') || {}).value;
    const err = g ? (cekTgl(g.key, tBA, 'Tanggal ' + nm) || cekTgl(g.key, tBAP, 'Tanggal BAP')) : '';
    const warn = !err && tBA && tBAP && tBAP < tBA ? 'Tanggal BAP lebih awal dari tanggal ' + nm + ' — periksa kembali.' : '';
    el.hidden = !(err || warn); el.className = 'col-12 mp2100-pesan ' + (err ? 'err' : 'warn'); el.textContent = err || warn;
    return err;
  }
  function isiFP() {   // BK diedit → isian tanggal dari BK
    let ed = null; try { ed = typeof FP !== 'undefined' && FP ? FP.edit : null; } catch (e) { }
    const k = ed ? ed.id + '|' + ed.versi : ''; if (k === FPX.edit) return; FPX.edit = k;
    if ($('mp2100TglBA')) $('mp2100TglBA').value = ed ? S(ed.tanggalBA) : '';
    if ($('mp2100TglBAP')) $('mp2100TglBAP').value = ed ? S(ed.tanggalBAP) : '';
    cekFP();
  }
  function jaga(nama, cekFn) {   // pola MP297: tolak sebelum fungsi aplikasi berjalan
    const f = window[nama]; if (typeof f !== 'function' || f.__mp2100) return;
    const g = function () { const m = cekFn.apply(this, arguments); if (m) { pesan(m, 'err'); return false; } return f.apply(this, arguments); };
    Object.keys(f).filter(k => /^__mp\d+/.test(k)).forEach(k => { g[k] = f[k]; }); g.__mp2100 = true; window[nama] = g;
  }

  /* ======================= 2b. Preview BA & regAksi ======================= */
  const TUNDA = {};   // progresId → { tBA, tBAP } menunggu saveProgres selesai (hindari KONFLIK versi)
  (function bungkus() {
    const ra = window.regAksi; if (typeof ra !== 'function') { setTimeout(bungkus, 1200); return; } if (ra.__mp2100) return;
    const g = async function (a, x) {
      let ctxFP = null, ctxBA = null;
      if (a === 'saveProgres' && x && x.data) {
        if (x.data.terbit) { try { if (typeof BA !== 'undefined' && BA && BA.sumberProgres === x.data.id && BA.tanggal) ctxBA = { id: x.data.id, tBA: S(BA.tanggal).slice(0, 10) }; } catch (e) { } }
        else if ($('mp2100TglBA')) ctxFP = { tBA: $('mp2100TglBA').value, tBAP: $('mp2100TglBAP').value };
      }
      let ctxOto = null;
      if (a === 'gudangLengkapiFoto' && x && x.data && $('mp2100OtoTgl')) {
        const G = window.MP223, r0 = ((G && G.masuk) || []).find(r => r.kiriman === x.data.kiriman) || {}, e = progres().find(z => z.id === r0.refProgres), t = $('mp2100OtoTgl').value;
        if (e && t) { const m = cekTgl(e.noKontrak, t, 'Tanggal ' + namaBA(e.noKontrak)); if (m) throw new Error(m); if (t !== S(e.tanggalBA)) ctxOto = { id: e.id, t }; }
      }
      if ((a === 'gudangTerimaBon' || a === 'gudangLengkapiFoto') && x && x.data && FI.punya(a, x.data)) x = Object.assign({}, x, { data: Object.assign({}, x.data, { fotoItem: await FI.unggah(a, x.data) }) });
      const r = await ra.call(this, a, x);
      try {
        if (ctxOto) await simpanTanggal(ctxOto.id, ctxOto.t);   // lengkapi foto → tanggal BAPM ke BK & Kartu Gudang
        if (ctxBA) await simpanTanggal(ctxBA.id, ctxBA.tBA);   // BAPM terbit → tanggal BA BK = tanggal pada BAPM
        else if (ctxFP && r && r.data && r.data.id && (ctxFP.tBA || ctxFP.tBAP)) await simpanTanggal(r.data.id, ctxFP.tBA || '', ctxFP.tBAP || '');
      } catch (e) { pesan('BK tersimpan, tetapi tanggal BA/BAP belum tersimpan: ' + e.message, 'warning'); }
      if (a === 'gudangTerimaBon' || a === 'gudangLengkapiFoto') FI.kosongkan(a);
      return r;
    };
    Object.keys(ra).forEach(k => { g[k] = ra[k]; }); g.__mp2100 = true; window.regAksi = g;
  })();
  const cekBA = () => { try { if (typeof BA === 'undefined' || !BA || !BA.g) return ''; return cekTgl(BA.g.key, S(BA.tanggal).slice(0, 10), 'Tanggal ' + namaBA(BA.g.key)); } catch (e) { return ''; } };

  /* ======================= 2c. Paket Tagihan: Tanggal BAPM terpisah ======================= */
  const aktif = () => { try { return window.mp270Aktif && window.mp270Aktif(); } catch (e) { return null; } };
  function bkAktif(T) { return T && T.l ? progres().find(x => x.id === T.l.progresId) || T.entri || {} : {}; }
  function pasangPaket() {
    const T = aktif(); if (!T || !T.g || !$('mp270Dlg')) return;
    const lab = [...document.querySelectorAll('#mp270Dlg label')].find(x => /^\s*Tanggal dokumen/.test(x.textContent)); if (!lab) return;
    const e = bkAktif(T); if (T.l.tanggalBA === undefined) T.l.tanggalBA = S(e.tanggalBA) || '';
    if (!S(T.l.tanggalDok) && S(e.tanggalBAP)) T.l.tanggalDok = S(e.tanggalBAP);
    const tn = lab.firstChild; if (tn && tn.nodeType === 3 && !/BAP & Kwitansi/.test(tn.textContent)) tn.textContent = 'Tanggal dokumen (BAP & Kwitansi)';
    let x = $('mp2100PkBA');
    if (!x) { lab.insertAdjacentHTML('beforebegin', `<label id="mp2100PkBA">Tanggal ${namaBA(T.g.key)}<input type="date" class="form-control form-control-sm" id="mp2100PkBAIn" onchange="mp2100PaketBA(this.value)"></label>`); x = $('mp2100PkBA'); }
    const inp = $('mp2100PkBAIn'); if (inp && document.activeElement !== inp) inp.value = S(T.l.tanggalBA) || S(T.l.tanggalDok) || S(e.tanggal);
    let b = $('mp2100PkPesan'); const err = cekPaket();
    if (err) { if (!b) { lab.insertAdjacentHTML('afterend', '<div id="mp2100PkPesan" class="mp2100-pesan err"></div>'); b = $('mp2100PkPesan'); } b.textContent = err; } else if (b) b.remove();
  }
  function cekPaket() { const T = aktif(); if (!T || !T.g) return ''; return cekTgl(T.g.key, S(T.l.tanggalBA), 'Tanggal ' + namaBA(T.g.key)) || cekTgl(T.g.key, S(T.l.tanggalDok), 'Tanggal BAP'); }
  window.mp2100PaketBA = v => { const T = aktif(); if (!T) return; if (typeof window.mp270L === 'function') window.mp270L('tanggalBA', v); else { T.l.tanggalBA = v; T.ubah = true; } pasangPaket(); };
  (function bungkusPost() {   // blSimpan membawa tanggal BA & batas kontrak (server memvalidasi & menyimpan ke BK)
    const f = window.regPost; if (typeof f !== 'function') { setTimeout(bungkusPost, 1200); return; } if (f.__mp2100) return;
    const g = function (o) {
      try { if (o && o.action === 'blSimpan' && o.data) { const T = aktif(); if (T && T.l && (T.l.progresId === o.data.progresId || (T.paket && T.paket.id === o.data.id))) o = Object.assign({}, o, { data: Object.assign({}, o.data, { tanggalBA: S(T.l.tanggalBA), batasKontrak: batasKontrak(T.g.key).akhir }) }); } } catch (e) { }
      return f.apply(this, [o].concat([].slice.call(arguments, 1)));
    };
    Object.keys(f).forEach(k => { g[k] = f[k]; }); g.__mp2100 = true; window.regPost = g;
  })();

  /* ======================= 1. Foto per material ======================= */
  function kecilkan(file, maks, mutu) {
    return new Promise((ok, gagal) => { const fr = new FileReader(); fr.onerror = () => gagal(new Error('Foto tidak dapat dibaca.')); fr.onload = () => { const im = new Image(); im.onerror = () => gagal(new Error('Berkas bukan foto JPG/PNG.'));
      im.onload = () => { const s = Math.min(1, (maks || 1600) / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', mutu || 0.85)); }; im.src = fr.result; }; fr.readAsDataURL(file); });
  }
  const FI = {
    bon: {}, oto: {},   // bon: { idx: [4 dataURL] } (Terima Bon) · oto: { grId: [4] } (Lengkapi foto)
    peta: a => a === 'gudangTerimaBon' ? FI.bon : FI.oto,
    punya: (a, d) => Object.values(FI.peta(a)).some(f => f.some(Boolean)),
    kosongkan: a => { if (a === 'gudangTerimaBon') FI.bon = {}; else FI.oto = {}; },
    async unggah(a, d) {
      const P = FI.peta(a), out = {}, ket = S(d.noSJ || d.kiriman);
      for (const k of Object.keys(P)) { const f = P[k]; if (!f.some(Boolean)) continue; out[k] = [];
        for (let i = 0; i < 4; i++) { if (!f[i]) { out[k].push(null); continue; }
          const r = await window.regAksi('gudangUnggahFoto', { berkas: { id: 'fi' + Date.now().toString(36) + i, data: f[i].split(',')[1], nama: SISI[i].replace(/\s+/g, '-') + '.jpg', jenis: 'FOTO-GR-ITEM', ket: ket + ' · item ' + k + ' · ' + SISI[i] } });
          out[k].push(r.data); } }
      return out;
    }
  };
  const adaFoto = f => !!(f && f.some(Boolean));
  window.mp2100FotoCukup = () => {   // Terima Bon tanpa foto utama: setiap item ber-qty wajib punya foto sendiri
    const F = window.MP223F; if (!F) return false; const idx = Object.keys(F.qty || {}).filter(i => Number(F.qty[i]) > 0);
    return idx.length > 0 && idx.every(i => adaFoto(FI.bon[i]));
  };
  window.mp2100FotoCukupOto = kiriman => { const G = window.MP223; const rows = G && G.masuk ? G.masuk.filter(r => r.kiriman === kiriman && r.status === 'AKTIF') : []; return rows.length > 0 && rows.every(r => adaFoto(FI.oto[r.id])); };
  function slotHTML(key, i, d, jenis) {
    return `<label class="mp2100-sl ${d ? 'isi' : ''}" title="${SISI[i]}">${d ? `<img src="${d}" alt="${SISI[i]}">` : `<i class="fas fa-camera"></i>`}<span>${SINGKAT[i]}</span>
      <input type="file" accept="image/jpeg,image/png" capture="environment" hidden data-k="${E(key)}" data-i="${i}" data-j="${jenis}" onchange="mp2100Foto(this)">${d ? `<button type="button" class="x" title="Hapus" onclick="event.preventDefault();event.stopPropagation();mp2100Hapus('${jenis}','${E(key)}',${i})">×</button>` : ''}</label>`;
  }
  window.mp2100Foto = async inp => {
    const f = (inp.files || [])[0]; if (!f) return; const P = inp.dataset.j === 'bon' ? FI.bon : FI.oto, k = inp.dataset.k, i = Number(inp.dataset.i);
    try { (P[k] = P[k] || [null, null, null, null])[i] = await kecilkan(f, 1600, 0.85); } catch (e) { pesan(e.message, 'err'); }
    gambarFI(true);
  };
  window.mp2100Hapus = (j, k, i) => { const P = j === 'bon' ? FI.bon : FI.oto; if (P[k]) P[k][i] = null; gambarFI(true); };
  function bagian(judul, rows, jenis) {
    const P = jenis === 'bon' ? FI.bon : FI.oto;
    return `<div class="mp2100-fi"><div class="mp2100-fi-h"><i class="fas fa-images me-1"></i><b>${judul}</b><span>Slot 4 sisi per material (D = depan, B = belakang, Ka/Ki = samping kanan/kiri). Item tanpa foto sendiri memakai <b>foto utama</b>.</span></div>
      ${rows.length ? `<table class="mp2100-fi-t"><tbody>${rows.map(x => `<tr class="${adaFoto(P[x.k]) ? 'ok' : ''}"><td class="u">${E(x.ur)}<div class="sub">${E(x.qty)} ${E(x.sat)}</div></td><td class="s">${[0, 1, 2, 3].map(i => slotHTML(x.k, i, (P[x.k] || [])[i], jenis)).join('')}</td>
        <td class="st">${adaFoto(P[x.k]) ? '<span class="mp2100-b ok">foto sendiri</span>' : '<span class="mp2100-b">pakai foto utama</span>'}</td></tr>`).join('')}</tbody></table>` : '<div class="sub">Isi qty diterima untuk menampilkan slot foto per material.</div>'}</div>`;
  }
  let _sigFI = '';
  function gambarFI(paksa) {
    // a) Terima Bon
    const fm = $('mp223FM'), F = window.MP223F;
    if (fm && F) {
      let bon = null; try { bon = ((typeof PMT !== 'undefined' && PMT.data) || []).find(b => b.nomor === F.bon) || null; } catch (e) { }
      const rows = bon ? Object.keys(F.qty || {}).filter(i => Number(F.qty[i]) > 0 && bon.items[i]).sort((a, b) => a - b).map(i => ({ k: String(i), ur: bon.items[i].uraian, qty: F.qty[i], sat: bon.items[i].sat || '' })) : [];
      Object.keys(FI.bon).forEach(k => { if (!rows.some(r => r.k === k)) delete FI.bon[k]; });
      const sig = 'b' + (F.bon || '') + JSON.stringify(rows.map(r => r.k + ':' + r.qty)) + Object.keys(FI.bon).map(k => k + FI.bon[k].map(Boolean).join()).join();
      let el = $('mp2100FIbon');
      if (!el) { const s0 = $('mp223Slot0'); const wadah = s0 && (s0.closest('.mp223-slot, .mp223-foto, [class*="slot"]') || s0.parentElement); if (!wadah) return;
        const cap = wadah.previousElementSibling; if (cap && !/Foto utama/.test(cap.textContent) && cap.textContent.length < 120) cap.insertAdjacentHTML('beforeend', ' <span class="mp2100-b">Foto utama — mewakili item tanpa foto sendiri</span>');
        wadah.insertAdjacentHTML('afterend', '<div id="mp2100FIbon"></div>'); el = $('mp2100FIbon'); _sigFI = ''; }
      if (paksa || sig !== _sigFI) { _sigFI = sig; el.innerHTML = bagian('Foto per material', rows, 'bon'); try { (document.getElementById('mp223FM') || {}).dispatchEvent && document.getElementById('mp223MTgl').dispatchEvent(new Event('input')); } catch (e) { } }
    }
    // b) Lengkapi foto (GR otomatis, MP273)
    const md = $('mp273Modal');
    if (md) {
      const kir = md.dataset.kiriman || (() => { const G = window.MP223; const t = md.querySelector('.mp273-isi .small'); if (!G || !t) return ''; const r = G.masuk.find(x => x.otomatis && x.fotoKurang && x.status === 'AKTIF' && t.textContent.indexOf(x.noSJ) >= 0); return r ? r.kiriman : ''; })();
      if (!kir) return; md.dataset.kiriman = kir;
      const G = window.MP223, rows = (G.masuk || []).filter(r => r.kiriman === kir && r.status === 'AKTIF').map(r => ({ k: r.id, ur: r.uraian, qty: r.qty, sat: r.sat }));
      let el = $('mp2100FIoto');
      if (!el) { const sl = md.querySelector('.mp273-slot'); if (!sl) return; if (!md.dataset.mp2100) sl.insertAdjacentHTML('beforebegin', '<div class="small fw-semibold mt-1">Foto utama (mewakili item tanpa foto sendiri)</div>'); sl.insertAdjacentHTML('afterend', '<div id="mp2100FIoto"></div>'); el = $('mp2100FIoto'); }
      const sigO = kir + JSON.stringify(rows.map(r => r.k)) + Object.keys(FI.oto).map(k => k + FI.oto[k].map(Boolean).join()).join();
      if (el.dataset.sig !== sigO) { el.dataset.sig = sigO; el.innerHTML = bagian('Foto per material', rows, 'oto'); }
    }
  }

  /* ======================= 1b. Lengkapi foto (GR otomatis): kiriman pasti, tanggal = BAPM, peringatan server ======================= */
  function tanggalBALokal(e) {   // tanggal BA dari register Preview BA di perangkat (BA terbit sebelum 2.10)
    try { const k = g$('KUNCI_REGISTER'), f = g$('bacaSimpan'); const reg = k && typeof f === 'function' ? f(k) || {} : {}; const b = (reg[e.noKontrak] || []).find(x => Number(x.urut) === Number(e.tagihanKe)); return b ? S(b.tanggal).slice(0, 10) : ''; } catch (er) { return ''; }
  }
  function bungkusLengkapi() {
    const f = window.mp273Lengkapi; if (typeof f !== 'function' || f.__mp2100) return;
    const g = function (kiriman) {
      const r = f.apply(this, arguments);
      try { const md = $('mp273Modal'); if (md) { md.dataset.kiriman = kiriman; isiLengkapi(md, kiriman); } } catch (e) { console.warn('[MP2100] lengkapi', e); }
      return r;
    };
    g.__mp2100 = true; window.mp273Lengkapi = g;
  }
  function pasangModal() {   // 2.10.2: dialog Lengkapi foto dilengkapi langsung saat muncul (tidak bergantung pembungkus fungsi)
    const md = $('mp273Modal'); if (!md || md.dataset.mp2100) return;
    const G = window.MP223, t = md.querySelector('.mp273-isi .small'), m = (G && G.masuk) || [];
    const r = md.dataset.kiriman ? { kiriman: md.dataset.kiriman } : t ? m.find(x => x.fotoKurang && x.status === 'AKTIF' && x.noSJ && t.textContent.indexOf(x.noSJ) >= 0) : null;
    if (r && r.kiriman) { md.dataset.kiriman = r.kiriman; isiLengkapi(md, r.kiriman); }
  }
  function isiLengkapi(md, kir) {
    if (md.dataset.mp2100) return; md.dataset.mp2100 = '1';
    const G = window.MP223, rows = ((G && G.masuk) || []).filter(r => r.kiriman === kir && r.status === 'AKTIF'), r0 = rows[0] || {};
    const e = progres().find(x => x.id === r0.refProgres) || null, nm = e ? namaBA(e.noKontrak) : 'BAPM';
    const usul = e ? (S(e.tanggalBA) || tanggalBALokal(e)) : '';
    const sl = md.querySelector('.mp273-slot');
    const tgl = `<div class="mp2100-otoTgl"><label class="small fw-semibold" for="mp2100OtoTgl">Tanggal penerimaan = Tanggal ${nm}</label>
      <input type="date" class="form-control form-control-sm" id="mp2100OtoTgl" value="${E(usul || S(r0.tanggal))}">
      <div class="small text-muted">Tercatat sekarang ${tglK(r0.tanggal)}${e && S(e.tanggalBA) ? ' · BK ' + nm + ' ' + tglK(e.tanggalBA) : usul ? ' · usulan dari Preview BA' : ' · isi sesuai tanggal di ' + nm}. Disimpan ke BK & Kartu Gudang saat foto disimpan.</div></div>`;
    const warn = !srv('fotoPerMaterial') || !srv('tanggalBAPMBAP') ? '<div class="mp2100-pesan err">Modul server 1.10.6 belum aktif — foto per material & tanggal BAPM belum dapat disimpan. Admin: Diagnostik sistem › Modul server › unggah server-modul-1.10.6.json › uji › terbitkan.</div>' : '';
    if (sl) sl.insertAdjacentHTML('beforebegin', warn + tgl + '<div class="small fw-semibold mt-2">Foto utama (mewakili item tanpa foto sendiri)</div>');
    gambarFI();
  }

  /* ======================= 3b. Sinkron otomatis saat aplikasi dibuka (sekali per sesi) ======================= */
  let _sinkJalan = false;
  async function sinkronOtomatis() {
    const s = sesi(); if (_sinkJalan || !s || !(s.admin || s.peran === 'PENGADAAN') || !srv('sinkronTanggalGudang') || !progres().length) return;
    const kunci = 'MP2100_SINK_' + (s.proyek || '') + '_' + new Date().toISOString().slice(0, 10);
    try { if (sessionStorage.getItem(kunci)) return; sessionStorage.setItem(kunci, '1'); } catch (e) { }
    _sinkJalan = true;
    try {
      let n0 = 0;
      for (const e of progres().filter(x => x.baTerbit && !S(x.tanggalBA))) { const t = tanggalBALokal(e); if (t && !cekTgl(e.noKontrak, t, 'BA')) { try { await simpanTanggal(e.id, t); n0++; } catch (er) { } } }
      const r = await window.regAksi('gudangSinkronTanggal', { data: {} }), n = (r.data || []).reduce((a, x) => a + x.n, 0);
      if (n0 || n) { pesan('Sinkron otomatis: ' + n0 + ' BK diberi tanggal BAPM dari Preview BA · ' + n + ' penerimaan gudang disesuaikan ke tanggal BAPM.', 'ok'); if (typeof window.mp223Muat === 'function') { await window.mp223Muat(true); if (typeof window.mp223Render === 'function') window.mp223Render(); } }
    } catch (e) { console.warn('[MP2100] sinkron otomatis', e); }
  }

  /* ======================= 3. Sinkron tanggal gudang (massal) ======================= */
  window.mp2100Sinkron = async btn => {
    if (!srv('sinkronTanggalGudang')) { pesan('Modul server 1.10.6 belum aktif.', 'err'); return; }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Menyinkronkan…'; }
    try {
      // tanggal BA dari register BA lokal (Preview BA) untuk BK terbit yang belum bertanggal BA
      let lokal = {}; try { const k = g$('KUNCI_REGISTER'), f = g$('bacaSimpan'); if (k && typeof f === 'function') lokal = f(k) || {}; } catch (e) { }
      let n0 = 0;
      for (const e of progres().filter(x => x.baTerbit && !S(x.tanggalBA))) {
        const ba = (lokal[e.noKontrak] || []).find(b => Number(b.urut) === Number(e.tagihanKe)); const t = ba && S(ba.tanggal).slice(0, 10);
        if (t && !cekTgl(e.noKontrak, t, 'BA')) { try { await simpanTanggal(e.id, t); n0++; } catch (er) { } }
      }
      const r = await window.regAksi('gudangSinkronTanggal', { data: {} });
      const n = (r.data || []).reduce((a, x) => a + x.n, 0);
      pesan('Sinkron tanggal: ' + n0 + ' BK diberi tanggal BA dari Preview BA · ' + n + ' penerimaan otomatis disesuaikan ke tanggal BAPM' + ((r.galat || []).length ? ' · ' + r.galat.length + ' gagal: ' + r.galat.slice(0, 2).join(' | ') : '') + '.', (r.galat || []).length ? 'warning' : 'ok');
      if (typeof window.mp223Muat === 'function') { await window.mp223Muat(true); if (typeof window.mp223Render === 'function') window.mp223Render(); }
    } catch (e) { pesan(e.message, 'err'); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-calendar-check me-1"></i>Sinkron tanggal BAPM'; }
  };
  function pasangSinkron() {
    const tab = $('tab-gdmasuk'); const s = sesi(); if (!tab || $('mp2100SinkBtn') || !(s && (s.admin || s.peran === 'PENGADAAN'))) return;
    const h = tab.querySelector('h3, h4, .mp219-fl, .mp219-card'); if (!h) return;
    h.insertAdjacentHTML('afterend', '<div class="mp2100-sink"><button type="button" id="mp2100SinkBtn" class="btn btn-sm btn-outline-primary" title="Samakan tanggal penerimaan otomatis & Kartu Gudang dengan tanggal BAPM" onclick="mp2100Sinkron(this)"><i class="fas fa-calendar-check me-1"></i>Sinkron tanggal BAPM</button></div>');
  }

  /* ======================= 2d. Excel format baku: tanggal BAP per termin ======================= */
  const D0 = Date.UTC(1899, 11, 30), serial = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - D0) / 864e5) : null; };
  (function kaitExcel() {
    const f = window.mp298TambahIsian; if (typeof f !== 'function') { setTimeout(kaitExcel, 1500); return; } if (f.__mp2100) return;
    const g = function (K, I, fmt) {
      f.apply(this, arguments);
      try {
        const T = new Set([K.g.key, K.g.keyAsli].concat(K.g.terkait || []).filter(Boolean)), L = progres().filter(e => T.has(e.noKontrak)).sort((a, b) => (+a.tagihanKe || 0) - (+b.tagihanKe || 0));
        const aktifK = Number(I.ringkas && I.ringkas.termin) || 1, gab = !!(I.ringkas && I.ringkas.gabung), eK = L.find(e => e.id === K.progresId) || {};
        const sebelum = L.filter(e => e.id !== K.progresId && (+e.tagihanKe || 0) < (+K.ke || 0));
        for (let k = 1; k <= aktifK; k++) {
          const e = k === aktifK ? eK : gab ? sebelum[sebelum.length - 1] : sebelum.find(x => +x.tagihanKe === k);
          const t = k === aktifK ? (K.tanggalBAP || eK.tanggalBAP) : e && e.tanggalBAP;
          if (fmt === 'spm') { (I.tulisan.INPUT = I.tulisan.INPUT || {})['G' + (54 + k)] = serial(t); }
          else { (I.tulisan.DATA = I.tulisan.DATA || {})['C' + (98 + k)] = serial(t); }
        }
      } catch (e) { console.warn('[MP2100] tanggal BAP Excel', e); }
    };
    g.__mp2100 = true; window.mp298TambahIsian = g;
  })();

  /* ======================= pemasangan ======================= */
  function pasangJaga() {
    jaga('simpanProgres', () => cekFP());
    jaga('terbitkanBA', cekBA); jaga('cetakBA', cekBA);
    ['mp270Simpan', 'mp270BuatPdf'].forEach(n => jaga(n, cekPaket));
  }
  let _t = 0;
  const jadwal = () => { if (_t) return; _t = setTimeout(() => { _t = 0; [pasangFP, isiFP, pasangPaket, gambarFI, pasangSinkron, pasangJaga, bungkusLengkapi, pasangModal, sinkronOtomatis].forEach(f => { try { f(); } catch (e) { console.warn('[MP2100]', f.name, e); } }); }, 250); };
  const awasi = () => { if (!document.body) return; new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length && ![...x.addedNodes].every(n => n.nodeType === 1 && n.closest && n.closest('#mp2100FIbon, #mp2100FIoto, #mp2100PkPesan')))) jadwal(); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('input', ev => { if (ev.target && /^mp223/.test(ev.target.id || '') || (ev.target && ev.target.closest && ev.target.closest('#mp223FM'))) jadwal(); }, true); jadwal(); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
  window.MP2100 = { FI, batasKontrak, cekTgl, simpanTanggal };
})();
