  /* ======================= [2.5.6] PENCARIAN MATERIAL (COMBOBOX) =======================
   * Pengganti dropdown panjang: ketik kode / nama material (sebagian, tanpa peduli huruf besar), pilih dengan klik atau ↑/↓ + Enter.
   * <select> asli TETAP ada (tersembunyi) dan menjadi sumber nilai kunci material → onchange/oninput, validasi & penyimpanan lama tidak berubah.
   * Mengetik hanya memperbarui daftar pilihan (tanpa mp223Render) sehingga kursor & teks tidak hilang. Teks ketikan tidak pernah membuat master baru. */
  const cbNorm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cbRapat = s => cbNorm(s).replace(/[^a-z0-9]+/g, '');
  function cbCocok(it, q) {
    const t = cbNorm(q).split(/\s+/).filter(Boolean); if (!t.length) return true;
    const a = cbNorm([it.kode, it.uraian, it.sat].join(' ')), b = cbRapat([it.kode, it.uraian].join(' '));
    return t.every(x => a.indexOf(x) >= 0 || (cbRapat(x) !== '' && b.indexOf(cbRapat(x)) >= 0));
  }
  function cbTanda(teks, q) {   // sorot bagian yang cocok (aman: setiap potongan di-escape)
    const s = String(teks == null ? '' : teks), t = cbNorm(q).split(/\s+/).filter(Boolean); if (!t.length) return E(s);
    let n = cbNorm(s); if (n.length !== s.length) n = s.toLowerCase();   // huruf beraksen: indeks harus sejajar
    const tanda = new Array(s.length).fill(false);
    t.forEach(x => { let i = n.indexOf(x); while (x && i >= 0) { for (let j = i; j < i + x.length && j < s.length; j++) tanda[j] = true; i = n.indexOf(x, i + x.length); } });
    let out = '', buka = false;
    for (let i = 0; i < s.length; i++) { if (tanda[i] !== buka) { out += tanda[i] ? '<mark>' : '</mark>'; buka = tanda[i]; } out += E(s[i]); }
    return out + (buka ? '</mark>' : '');
  }
  const cbLabel = it => it ? (it.kode ? it.kode + ' · ' : '') + it.uraian + (it.sat ? ' (' + it.sat + ')' : '') : '';
  function cbHtml(id, ph) {
    return `<div class="mp256-cb" data-cb="${id}"><input type="search" class="form-control form-control-sm mp256-cb-in" id="${id}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}Lb" autocomplete="off" spellcheck="false" placeholder="${E(ph)}">
      <ul class="mp256-cb-lb" id="${id}Lb" role="listbox" hidden></ul></div>`;
  }
  function cbFokus(id) {   // simpan keadaan ketik sebelum render ulang (data dimuat ulang tiap 5 menit / setelah simpan)
    const a = document.activeElement; if (!a || a.id !== id) return null;
    return { v: a.value, s: a.selectionStart, e: a.selectionEnd, ketik: a.dataset.ketik === '1', buka: a.getAttribute('aria-expanded') === 'true' };
  }
  function cbPasang(o) {   // o: { id, sel, items:[{kunci,kode,uraian,sat,info}], nilai, kejadian:'change'|'input', pulih, padaPilih }
    const inp = document.getElementById(o.id), lb = document.getElementById(o.id + 'Lb'), sel = document.getElementById(o.sel); if (!inp || !lb || !sel) return;
    const MAKS = 60, items = o.items || [];
    let aktifI = -1, L = [];
    const terpilih = () => items.find(x => x.kunci === sel.value) || null;
    const tutup = () => { lb.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); aktifI = -1; };
    const pulihkanLabel = () => { inp.value = cbLabel(terpilih()); inp.dataset.ketik = ''; };
    const tandaiAktif = () => {
      [...lb.querySelectorAll('[role=option]')].forEach((li, i) => { const on = i === aktifI; li.classList.toggle('on', on); li.setAttribute('aria-selected', on ? 'true' : 'false'); if (on) { inp.setAttribute('aria-activedescendant', li.id); try { li.scrollIntoView({ block: 'nearest' }); } catch (e) { } } });
    };
    const isi = () => {
      const q = inp.dataset.ketik === '1' ? inp.value : '';
      L = items.filter(x => cbCocok(x, q));
      const pilihK = sel.value;
      lb.innerHTML = L.length ? L.slice(0, MAKS).map((x, i) => `<li role="option" id="${o.id}O${i}" data-i="${i}" aria-selected="false" class="${x.kunci === pilihK ? 'pilih' : ''}"><span class="kd">${cbTanda(x.kode || '-', q)}</span><span class="ur">${cbTanda(x.uraian, q)}</span><span class="st">${E(x.sat || '')}${x.info ? ' · ' + E(x.info) : ''}</span></li>`).join('')
        + (L.length > MAKS ? `<li class="lagi" role="presentation">+${L.length - MAKS} material lain — ketik lebih spesifik</li>` : '')
        : `<li class="kosong" role="presentation">Tidak ada material yang cocok dengan "${E(q)}". Material baru hanya dari penerimaan (Bon Permintaan).</li>`;
      lb.hidden = false; inp.setAttribute('aria-expanded', 'true');
      aktifI = !L.length ? -1 : q ? 0 : Math.max(0, L.slice(0, MAKS).findIndex(x => x.kunci === pilihK));
      tandaiAktif();
    };
    const pilih = x => {
      if (!x) return; tutup(); inp.value = cbLabel(x); inp.dataset.ketik = '';
      if (sel.value !== x.kunci) { sel.value = x.kunci; if (typeof o.padaPilih === 'function') o.padaPilih(x); sel.dispatchEvent(new Event(o.kejadian || 'change', { bubbles: true })); }
    };
    inp.value = cbLabel(terpilih());
    inp.addEventListener('focus', () => { if (inp.dataset.ketik !== '1') { try { inp.select(); } catch (e) { } } isi(); });
    inp.addEventListener('click', () => { if (inp.dataset.ketik !== '1') { try { inp.select(); } catch (e) { } } if (lb.hidden) isi(); });   // klik lagi: ketikan mengganti label
    inp.addEventListener('input', () => { inp.dataset.ketik = '1'; isi(); });
    inp.addEventListener('keydown', ev => {
      const n = Math.min(L.length, MAKS);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); if (lb.hidden) { isi(); return; } if (!n) return; aktifI = ev.key === 'ArrowDown' ? (aktifI + 1) % n : (aktifI - 1 + n) % n; tandaiAktif(); }
      else if (ev.key === 'Enter') { if (!lb.hidden) { ev.preventDefault(); if (aktifI >= 0 && L[aktifI]) pilih(L[aktifI]); } }   // Enter tidak mengirim formulir saat daftar terbuka
      else if (ev.key === 'Escape') { if (!lb.hidden) { ev.preventDefault(); ev.stopPropagation(); tutup(); pulihkanLabel(); } }
      else if (ev.key === 'Tab') { tutup(); pulihkanLabel(); }
    });
    inp.addEventListener('search', () => { if (!inp.value) { inp.dataset.ketik = '1'; isi(); } });
    inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) { tutup(); pulihkanLabel(); } }, 120));
    lb.addEventListener('mousedown', ev => ev.preventDefault());   // fokus tetap di kotak cari
    lb.addEventListener('click', ev => { const li = ev.target.closest('[role=option]'); if (li) pilih(L[Number(li.dataset.i)]); });
    if (o.pulih) {   // kembalikan teks, kursor & daftar terbuka setelah render ulang
      inp.value = o.pulih.v; inp.dataset.ketik = o.pulih.ketik ? '1' : ''; inp.focus();
      try { inp.setSelectionRange(o.pulih.s, o.pulih.e); } catch (e) { }
      if (o.pulih.buka) isi(); else tutup();
    }
  }
  window.mp256Combo = { cocok: cbCocok, label: cbLabel };

  /* ======================= 5. KARTU GUDANG (LOGINV-09) ======================= */
  const K = { kunci: '', dari: '', sd: '', semua: false, bulan: 0, tahun: 0 };   // [2.5.6] bulan/tahun = periode operasional 26–25
  function dataKartu() {
    const mats = materi(); if (!K.kunci || !mats.some(m => m.kunci === K.kunci)) K.kunci = (mats[0] || {}).kunci || '';
    const m = mats.find(x => x.kunci === K.kunci);
    // [2.5.6] periode operasional: Bulan B tahun T = tanggal 26 bulan B−1 s.d. 25 bulan B (setiap tanggal hanya masuk satu periode).
    //         Tanpa bulan/tahun → rentang dari/sd seperti versi sebelumnya (dipakai rentang khusus & kompatibilitas).
    if (K.bulan >= 1 && K.bulan <= 12 && K.tahun >= 2000) {
      const b = Number(K.bulan), t = Number(K.tahun), dua = n => String(n).padStart(2, '0');
      K.dari = (b === 1 ? (t - 1) + '-12' : t + '-' + dua(b - 1)) + '-26'; K.sd = t + '-' + dua(b) + '-25';
    }
    const dari = K.dari || hariIni().slice(0, 8) + '01', sd = K.sd || hariIni();
    if (!m) return { mats, m: null, dari, sd, rows: [], awal: 0, akhir: 0, masuk: 0, keluar: 0 };
    const M = aktif(GD.masuk).filter(r => r.kunci === m.kunci), Kl = aktif(GD.keluar).filter(r => r.kunci === m.kunci);
    // [2.5.4] Jumlah terusan = kumulatif sejak awal proyek (dibawa dari periode sebelumnya), bukan mulai 0 setiap periode
    const tm0 = M.filter(r => r.tanggal < dari).reduce((a, r) => a + N(r.qty), 0), tk0 = Kl.filter(r => r.tanggal < dari).reduce((a, r) => a + N(r.qty), 0);
    const awal = tm0 - tk0; let tm = tm0, tk = tk0, qmT = 0, qkT = 0; const rows = [];
    // [2.5.6] Keterangan per transaksi: utamakan "ket" yang tersimpan pada transaksi; data lama tanpa ket → keterangan bawaan (dibaca saja, data tidak diubah).
    //         Rujukan GR (bon & surat jalan) dan GI (lokasi & penerima) tetap disertakan.
    const ketM = r => { const k = String(r.ket || '').trim(), ref = bonPendek(r.bonNomor) + ' · SJ ' + r.noSJ; return 'GR ' + (k ? k + ' (' + ref + ')' : ref); };
    const ketK = r => { const k = String(r.ket || '').trim(), ref = r.untuk + ' · ' + r.penerima; return 'GI ' + (k ? k + ' (' + ref + ')' : ref); };
    const urut = (a, b) => String(a.dibuatPada || '').localeCompare(String(b.dibuatPada || '')) || String(a.id || '').localeCompare(String(b.id || ''));
    for (let d = dari, n = 0; d <= sd && n < 800; d = tambahHari(d, 1), n++) {
      const mm = M.filter(r => r.tanggal === d).sort(urut), kk = Kl.filter(r => r.tanggal === d).sort(urut), qm = mm.reduce((a, r) => a + N(r.qty), 0), qk = kk.reduce((a, r) => a + N(r.qty), 0);
      tm += qm; tk += qk; qmT += qm; qkT += qk;
      const kets = mm.map(ketM).concat(kk.map(ketK));
      if (K.semua || qm || qk) rows.push({ d, qm, qk, tm, tk, sisa: tm - tk, kets, ket: kets.length > 1 ? kets.map((x, i) => (i + 1) + ') ' + x).join('; ') : (kets[0] || '') });
    }
    // [2.5.6] saldo akhir = saldo awal + penerimaan periode − pengeluaran periode (sebelumnya kotak ringkasan menjumlah saldo awal dua kali bila saldo awal ≠ 0)
    return { mats, m, dari, sd, rows, awal, tm0, tk0, masuk: qmT, keluar: qkT, akhir: Math.round((awal + qmT - qkT) * 1e4) / 1e4 };
  }
  function vKartu() {
    const el = document.getElementById('mp223KartuIsi'); if (!el) return;
    const b = bannerDukung(); if (b && !GD.siap) { el.innerHTML = b; if (sesi() && GD.dukung === null && !GD.muat && !GD.galat) muat(); return; }
    siapPeriode();
    const D = dataKartu(), fk = cbFokus('mp223KMatCari');
    const kini = periodeKini(), thnAda = GD.masuk.concat(GD.keluar).map(r => Number(String(r.tanggal || '').slice(0, 4))).filter(x => x >= 2000);
    const t0 = Math.min.apply(null, thnAda.concat([kini.tahun - 1, K.tahun || kini.tahun])), t1 = Math.max(kini.tahun + 1, K.tahun || 0);
    const pB = K._pB || K.bulan || kini.bulan, pT = K._pT || K.tahun || kini.tahun, khusus = !(K.bulan && K.tahun);
    const judulPer = khusus ? 'Rentang khusus' : BLNP[K.bulan - 1] + ' ' + K.tahun;
    el.innerHTML = b + `<div class="mp219-card"><div class="mp219-fl"><div class="mp219-fl2 mp256-kg-f">
        <label class="small" for="mp223KMatCari">Material</label>${cbHtml('mp223KMatCari', D.mats.length ? 'Ketik kode / nama material…' : 'Belum ada material diterima')}
        <select class="form-select form-select-sm" id="mp223KMat" aria-hidden="true" tabindex="-1" hidden onchange="mp223K.kunci=this.value;mp223Render()">${D.mats.length ? D.mats.map(x => `<option value="${E(x.kunci)}" ${x.kunci === K.kunci ? 'selected' : ''}>${E((x.kode ? x.kode + ' · ' : '') + x.uraian)}</option>`).join('') : '<option value="">Belum ada material diterima</option>'}</select>
        <label class="small" for="mp223KBulan">Bulan</label><select class="form-select form-select-sm" id="mp223KBulan" style="width:auto" onchange="mp223K._pB=Number(this.value)">${BLNP.map((n, i) => `<option value="${i + 1}" ${i + 1 === pB ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label class="small" for="mp223KTahun">Tahun</label><select class="form-select form-select-sm" id="mp223KTahun" style="width:auto" onchange="mp223K._pT=Number(this.value)">${Array.from({ length: Math.max(1, t1 - t0 + 1) }, (x, i) => t0 + i).map(y => `<option value="${y}" ${y === pT ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <button type="button" class="btn btn-sm mp219-btn-p" id="mp223KTampil" onclick="mp256KartuTampil()"><i class="fas fa-eye"></i><span>Tampilkan</span></button>
        <label class="form-check small mb-0"><input type="checkbox" class="form-check-input" id="mp223KAll" ${K.semua ? 'checked' : ''} onchange="mp223K.semua=this.checked;mp223Render()"> Semua hari</label></div>
      <div class="mp219-fl2"><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp223Ttd()"><i class="fas fa-signature"></i><span>Penandatangan</span></button><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp223KartuExcel()" ${D.m ? '' : 'disabled'}><i class="fas fa-file-excel"></i><span>Excel</span></button><button type="button" class="btn btn-sm mp219-btn-p" onclick="mp223KartuCetak()" ${D.m ? '' : 'disabled'}><i class="fas fa-print"></i><span>Cetak LOGINV-09</span></button></div></div>
      <div class="mp256-kg-per" id="mp223KPeriode"><i class="fas fa-calendar-days"></i><span>Periode <b>${E(judulPer)}</b>: ${tglP(D.dari)} s.d. ${tglP(D.sd)} <span class="mp220-sub">(WIB · 26–25)</span></span></div>
      ${D.m ? `<div class="mp223-kg-h"><div><span>No. Material</span><b class="mono">${E(D.m.kode || '-')}</b></div><div><span>Nama Material</span><b>${E(D.m.uraian)}</b></div><div><span>Satuan</span><b>${E(D.m.sat)}</b></div><div><span>Saldo awal</span><b>${ang(D.awal, 2)}</b></div><div><span>Penerimaan periode</span><b>${ang(D.masuk, 2)}</b></div><div><span>Pengeluaran periode</span><b>${ang(D.keluar, 2)}</b></div><div><span>Saldo akhir</span><b>${ang(D.akhir, 2)}</b></div></div>` : ''}
      <div class="mp219-tw"><table class="mp219-tb mp223-tb"><thead><tr><th rowspan="2">Tanggal</th><th colspan="2" class="c">Penerimaan (GR)</th><th colspan="2" class="c">Pengeluaran (GI)</th><th rowspan="2" class="r">Sisa</th><th rowspan="2">Keterangan</th></tr><tr><th class="r">Jumlah</th><th class="r">Jumlah terusan</th><th class="r">Jumlah</th><th class="r">Jumlah terusan</th></tr></thead><tbody>
      ${D.rows.length ? D.rows.map(r => `<tr><td class="nw">${tglK(r.d)}</td><td class="r">${r.qm ? ang(r.qm, 2) : '-'}</td><td class="r">${r.tm ? ang(r.tm, 2) : '-'}</td><td class="r">${r.qk ? ang(r.qk, 2) : '-'}</td><td class="r">${r.tk ? ang(r.tk, 2) : '-'}</td><td class="r b">${ang(r.sisa, 2)}</td><td class="sub mp256-ket">${r.kets && r.kets.length ? r.kets.map(x => `<div>${E(x)}</div>`).join('') : '-'}</td></tr>`).join('')
        : `<tr><td colspan="7" class="mp219-kosong">${D.m ? 'Tidak ada pergerakan pada periode ini. Centang "Semua hari" untuk format lengkap.' : 'Kartu gudang terbentuk setelah ada penerimaan material.'}</td></tr>`}</tbody></table></div>
      <div class="mp219-ket"><span><i class="fas fa-circle-info"></i> Jumlah terusan = kumulatif sejak awal proyek (dibawa dari periode sebelumnya). Sisa = terusan masuk − terusan keluar = saldo awal + mutasi periode. Keterangan = keterangan tercatat pada transaksi (bawaan: bon/SJ, lokasi/penerima).</span></div></div>`;
    cbPasang({ id: 'mp223KMatCari', sel: 'mp223KMat', kejadian: 'change', pulih: fk,
      items: D.mats.map(x => ({ kunci: x.kunci, kode: x.kode, uraian: x.uraian, sat: x.sat, info: 'stok ' + ang(x.sisa) })) });
  }
  window.mp223K = K;
  // [2.5.6] periode operasional bawaan = periode yang memuat hari ini menurut Asia/Jakarta (tanggal ≥ 26 → periode bulan berikutnya)
  function periodeKini() {
    let t = ''; try { t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) t = hariIni();
    let y = Number(t.slice(0, 4)), b = Number(t.slice(5, 7)); if (Number(t.slice(8, 10)) >= 26) { b++; if (b > 12) { b = 1; y++; } }
    return { bulan: b, tahun: y };
  }
  const periodeRentang = (b, t) => { const dua = n => String(n).padStart(2, '0'); b = Number(b); t = Number(t); return { dari: (b === 1 ? (t - 1) + '-12' : t + '-' + dua(b - 1)) + '-26', sd: t + '-' + dua(b) + '-25' }; };
  window.mp256PeriodeKini = periodeKini;
  window.mp256Periode = periodeRentang;
  function siapPeriode() {   // tidak menimpa pilihan pengguna; rentang khusus lama (dari/sd diisi kode lain) tetap dihormati
    if (K.bulan && K.tahun) return;
    if (K._mp241User === true && K.dari && K.sd) return;
    Object.assign(K, periodeKini());
  }
  window.mp256KartuTampil = () => {
    const b = Number((document.getElementById('mp223KBulan') || {}).value) || K._pB || K.bulan, t = Number((document.getElementById('mp223KTahun') || {}).value) || K._pT || K.tahun;
    if (!(b >= 1 && b <= 12) || !(t >= 2000)) return;
    K.bulan = b; K.tahun = t; delete K._pB; delete K._pT; K._mp241User = false; render();
  };
  window.mp223KartuCetak = () => {
    const D = dataKartu(); if (!D.m) return; const t = ttd();
    // [2.5.6] judul bulan/tahun = bulan periode yang dipilih (periode 26–25 dinamai menurut bulan tanggal 25-nya)
    const bP = K.bulan >= 1 && K.bulan <= 12 && K.tahun ? Number(K.bulan) : Number(D.sd.slice(5, 7)), tP = K.bulan && K.tahun ? String(K.tahun) : D.sd.slice(0, 4);
    const tp = s => Number(s.slice(8, 10)) + ' ' + BLNP[Number(s.slice(5, 7)) - 1] + ' ' + s.slice(0, 4);
    const rows = K.semua ? D.rows : (() => { const all = []; let tm = D.tm0 || 0, tk = D.tk0 || 0; for (let d = D.dari, n = 0; d <= D.sd && n < 800; d = tambahHari(d, 1), n++) { const r = D.rows.find(x => x.d === d); if (r) { tm = r.tm; tk = r.tk; all.push(r); } else all.push({ d, qm: 0, qk: 0, tm, tk, sisa: tm - tk, ket: '', kets: [] }); } return all; })();
    const tabel = `<table class="t"><thead><tr><th rowspan="2">Tanggal</th><th colspan="2">PENERIMAAN (GR)</th><th colspan="2">PENGELUARAN (GI)</th><th rowspan="2">Sisa</th><th rowspan="2">Keterangan</th></tr><tr><th>Jumlah</th><th>Jumlah Terusan</th><th>Jumlah</th><th>Jumlah Terusan</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td class="c">${tglK(r.d)}</td><td class="r">${r.qm ? ang(r.qm, 2) : '-'}</td><td class="r">${r.tm ? ang(r.tm, 2) : '-'}</td><td class="r">${r.qk ? ang(r.qk, 2) : '-'}</td><td class="r">${r.tk ? ang(r.tk, 2) : '-'}</td><td class="r">${r.sisa ? ang(r.sisa, 2) : '-'}</td><td>${r.kets && r.kets.length > 1 ? r.kets.map(x => E(x)).join('<br>') : E(r.ket) || '-'}</td></tr>`).join('')}</tbody></table>`;
    cetak('KARTU GUDANG / STOCK CARD', 'LOGINV-09', `<table class="meta"><tr><td class="k">Bulan</td><td>: ${BLNP[bP - 1]}</td><td style="width:110px"><b>No. Material</b></td><td>: ${E(D.m.kode || '-')}</td></tr><tr><td class="k">Tahun</td><td>: ${tP}</td><td><b>Nama Material</b></td><td>: ${E(D.m.uraian)}${D.awal ? ' · saldo awal ' + ang(D.awal, 2) + ' ' + E(D.m.sat) : ''}</td></tr><tr><td class="k">Periode</td><td>: ${tp(D.dari)} s.d. ${tp(D.sd)}</td><td><b>Saldo akhir</b></td><td>: ${ang(D.akhir, 2)} ${E(D.m.sat)}</td></tr></table>`,
      tabel, [['Mengetahui,', 'Kasi DanLoglat', t.kasi], ['Diisi oleh,', 'Petugas Gudang', t.petugas]], 'Catatan: Dibuat rangkap 2 (dua), 1. Untuk Gudang, 2. Untuk SPLEM', D.sd, true);
  };
  window.mp223KartuExcel = () => { const D = dataKartu(); if (!D.m) return; const per = K.bulan && K.tahun ? BLNP[K.bulan - 1] + ' ' + K.tahun + ' ' : '';
    excel('Kartu-Gudang-' + (D.m.kode || 'material'), 'Kartu Gudang (LOGINV-09) ' + D.m.uraian + ' · periode ' + per + D.dari + ' s.d. ' + D.sd + ' · saldo awal ' + D.awal + ' · penerimaan ' + D.masuk + ' · pengeluaran ' + D.keluar + ' · saldo akhir ' + D.akhir,
    ['Tanggal', 'GR Jumlah', 'GR Jumlah Terusan', 'GI Jumlah', 'GI Jumlah Terusan', 'Sisa', 'Keterangan'], D.rows.map(r => [r.d, r.qm || '', r.tm || '', r.qk || '', r.tk || '', r.sisa, r.ket]), [1, 2, 3, 4, 5]); };
