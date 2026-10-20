
/* MP260 — PEMBARUAN 2.6.0 (aditif)
 * A. PERBAIKAN REGISTER KONTRAK MASTER — pindahkan item yang salah kontrak (hasil migrasi) ke nomor kontrak yang benar,
 *    perbaiki vendor kontrak sumber & tujuan. Data Master (Excel) TIDAK diubah: perbaikan disimpan sebagai catatan koreksi
 *    khusus (kunci "SISTEM-PERBAIKAN-REGISTER|<no kontrak sumber>", aksi server saveKoreksi yang sudah ada: berversi + tercatat di Log)
 *    lalu diterapkan setiap kali ringkasan kontrak dibangun. Dapat dibatalkan kapan saja (kembali ke tampilan Master asli).
 *    Tagihan/progres yang sudah tercatat TIDAK dipindah (riwayat tetap pada nomor kontrak aslinya).
 * B. PENGGUNA ONLINE (Admin) — aplikasi mengirim menu/aktivitas yang sedang dibuka (±60 detik, modul server 1.8.8 hadirDetak,
 *    CacheService saja); Admin membuka menu akun › Pengguna online. */
(function () {
  'use strict';
  if (window.__MP260__) return;
  window.__MP260__ = true;
  const PREFIX = 'SISTEM-PERBAIKAN-REGISTER|';
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const N = v => { const x = Number(v); return isFinite(x) ? x : 0; };
  const rp = v => Math.round(N(v)).toLocaleString('id-ID');
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const peng = () => !!(sesi() && sesi().peran === 'PENGADAAN');
  const adm = () => !!(sesi() && sesi().admin);
  const kabar = (m, t) => { try { notif(m, t); } catch (e) { } };
  const pesanGalat = e => (typeof pesanServerLama === 'function' ? pesanServerLama(e) : String(e && e.message || e));

  /* ======================= A. PERBAIKAN REGISTER ======================= */
  const kodeIt = it => String(it.kodeItem || it.itemService || it.kode || '').trim();
  const uraianIt = it => String(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian || '').trim();
  const volIt = it => N(it.volume || it.volumeKontrak || it.vol);
  const satIt = it => String(it.satuan || it.sat || '');
  const nilaiIt = it => N(it.nilai || it.jumlah || it.total || it.nilaiKontrak) || volIt(it) * N(it.harga || it.hargaSatuan || it.hargaKontrak);
  function tanda(items) {   // tanda unik per item (kodeUnik bila ada; selain itu kode|uraian|volume + urutan kemunculan)
    const n = {};
    return (items || []).map(it => { const b = it.kodeUnik ? 'U:' + it.kodeUnik : 'K:' + kodeIt(it) + '|' + uraianIt(it).toLowerCase() + '|' + volIt(it); n[b] = (n[b] || 0) + 1; return b + '#' + n[b]; });
  }
  function aturan() {
    const K = (typeof KOREKSI !== 'undefined' && KOREKSI.data) || {};
    return Object.keys(K).filter(k => k.indexOf(PREFIX) === 0).map(k => K[k]).filter(a => a && a.jenis === 'perbaikanRegister' && a.aktif !== false && a.sumber && Array.isArray(a.pindah));
  }
  const ST = { build: 0, galat: [], sumber: {}, tujuan: {} };
  window.MP260_REGISTER = ST;
  function terapkan(hasil) {
    if (!Array.isArray(hasil)) return hasil;
    const B = ++ST.build; ST.galat = []; ST.sumber = {}; ST.tujuan = {};
    for (let i = hasil.length - 1; i >= 0; i--) if (String(hasil[i] && hasil[i].key || '').indexOf(PREFIX) === 0) hasil.splice(i, 1);
    // kembalikan kontrak yang pernah diubah overlay ke keadaan dasar build ini (aman bila objek ringkasan dipakai ulang)
    for (let i = hasil.length - 1; i >= 0; i--) { const g = hasil[i]; if (g && g._mp260baru) { hasil.splice(i, 1); continue; } if (g && g._mp260 && g._mp260.b !== B) { Object.assign(g, g._mp260.asli); g._mp260.b = B; delete g.mp260; } }
    aturan().forEach(a => {
      const src = hasil.find(g => g && !g._mp260baru && (g.key === a.sumber || g.keyAsli === a.sumber));
      if (!src) { ST.galat.push('Kontrak sumber ' + a.sumber + ' tidak ditemukan di Master — perbaikan tidak diterapkan.'); return; }
      if (!src._mp260) src._mp260 = { b: B, asli: { items: (src.items || []).slice(), nilai: src.nilai, namaVendor: src.namaVendor, idVendor: src.idVendor, statusKey: src.statusKey } };
      const O = src._mp260.asli, sig = tanda(O.items), pakai = new Set();
      const totalAsli = O.items.reduce((s, it) => s + nilaiIt(it), 0), cocok = O.items.length > 0 && Math.abs(totalAsli - N(O.nilai)) <= Math.max(1, N(O.nilai) * 0.005);
      let nilaiPindah = 0;
      a.pindah.forEach(p => {
        const ke = String(p.ke || '').trim(); if (!ke) return;
        const ambil = O.items.filter((it, i) => !pakai.has(i) && (p.items || []).indexOf(sig[i]) >= 0 && (pakai.add(i), true));
        const hilang = (p.items || []).length - ambil.length;
        if (hilang > 0) ST.galat.push(hilang + ' item untuk ' + ke + ' tidak ditemukan lagi di Master ' + a.sumber + '.');
        const nilai = p.nilai !== null && p.nilai !== undefined && p.nilai !== '' ? N(p.nilai) : (cocok ? ambil.reduce((s, it) => s + nilaiIt(it), 0) : 0);
        nilaiPindah += nilai;
        const ada = hasil.find(g => g && g !== src && (g.key === ke || g.keyAsli === ke));
        const h = p.header || {};
        if (ada) {
          if (!ada._mp260) ada._mp260 = { b: B, asli: { items: (ada.items || []).slice(), nilai: ada.nilai, namaVendor: ada.namaVendor, idVendor: ada.idVendor, statusKey: ada.statusKey } };
          ada.items = (ada.items || []).concat(ambil); ada.nilai = N(ada.nilai) + nilai;
          ada.mp260 = { peran: 'tujuan', dari: src.key, aturan: a };
        } else {
          const kor = typeof koreksiDari === 'function' ? koreksiDari(ke) : null;
          const g = Object.assign({}, src, { key: ke, keyAsli: ke, terkait: [], koreksi: kor || null, items: ambil, nilai, realisasi: 0, entriProgres: [], updateTerakhir: '',
            namaVendor: 'namaVendor' in h ? h.namaVendor : src.namaVendor, idVendor: 'idVendor' in h ? h.idVendor : src.idVendor,
            jenisKontrak: h.jenisKontrak || src.jenisKontrak, kelompok: h.kelompok || src.kelompok, baru: false, _mp260baru: true });
          delete g._mp260;
          if (kor) {
            Object.keys(kor).forEach(k => { if (['key', 'versi', 'diubahOleh', 'diubahPada', 'wbsItem', 'items', 'nilai', 'realisasi'].indexOf(k) < 0 && kor[k] !== '' && kor[k] !== null && kor[k] !== undefined) g[k] = kor[k]; });
            const peta = kor.wbsItem || null; if (peta) g.items = g.items.map((it, j) => { const w = peta[it.kodeUnik || ('#' + j)]; return w ? Object.assign({}, it, { wbs: w }) : it; });
          }
          const ent = ((typeof PROG !== 'undefined' && PROG.data) || []).filter(e => e && e.noKontrak === ke && !e.batal);
          g.entriProgres = ent; g.realisasi = ent.reduce((s, e) => s + N(e.nilai), 0);
          g.statusKey = g.realisasi > 0 && g.nilai > 0 && g.realisasi >= g.nilai ? 'selesai' : 'berjalan';
          g.mp260 = { peran: 'tujuan', dari: src.key, aturan: a };
          hasil.push(g);
        }
        ST.tujuan[ke] = a;
      });
      src.items = O.items.filter((_, i) => !pakai.has(i));
      src.nilai = cocok ? src.items.reduce((s, it) => s + nilaiIt(it), 0) : Math.max(0, N(O.nilai) - nilaiPindah);
      const hs = a.header || {};
      if ('namaVendor' in hs) src.namaVendor = hs.namaVendor;
      if ('idVendor' in hs) src.idVendor = hs.idVendor;
      src.mp260 = { peran: 'sumber', aturan: a };
      ST.sumber[a.sumber] = a;
    });
    return hasil;
  }
  window.mp260Terapkan = terapkan;
  const _ring = window.getRingkasanKontrak;
  if (typeof _ring === 'function') window.getRingkasanKontrak = function () { const h = _ring.apply(this, arguments); try { return terapkan(h); } catch (e) { console.warn('[2.6.0] perbaikan register', e); return h; } };

  // Usulan siap pakai: migrasi menggabungkan No 23 (027 Putra Paloh, CV) & No 24 (028 anugerah) — spreadsheet baris 497–514
  const USULAN = [{ sumber: '028/SPM/WK-NK.KSO/PDBJ/1726012/2026', ke: '027/SPM/WK-NK.KSO/PDBJ/1726012/2026',
    vendorTujuan: 'Putra Paloh, CV', kodeTujuan: '2100010709', vendorSumber: 'anugerah', kodeSumber: '',
    tetap: ['1800000052', '1800001651', '1800001652', '1800002258', '1800002259'],
    alasan: 'Koreksi migrasi sesuai spreadsheet Master baris 497–514: No 23 · 027 Putra Paloh, CV (12 item, kode vendor 2100010709) dan No 24 · 028 anugerah (5 item: Converter 1 Phase, Shaft Vibrator Fx 50/60, Portable Vibrator MGX-28 & MGX 28x1680) tergabung menjadi 028 saat migrasi.' }];
  const F = { g: null, sumber: '', items: [], sig: [], pilih: [], lama: null, usulan: null };
  function ringkasan() { return (typeof RINGKASAN !== 'undefined' && RINGKASAN) || []; }
  function semuaNo() {
    const s = new Set(); ringkasan().forEach(g => { if (g && g.key) s.add(g.key); }); ((typeof REG !== 'undefined' && REG.data) || []).forEach(r => { if (r.noKontrak) s.add(r.noKontrak); });
    return [...s].filter(x => x.indexOf(PREFIX) !== 0).sort();
  }
  function modal(id, judul, sub) {
    let m = document.getElementById(id);
    if (!m) { m = document.createElement('div'); m.id = id; m.className = 'mp260-latar'; m.innerHTML = `<div class="mp260-kotak" role="dialog" aria-modal="true"><div class="mp260-kepala"><div class="min-w-0"><div class="mp260-judul"></div><div class="mp260-sub"></div></div><button type="button" class="mp260-x" aria-label="Tutup">&times;</button></div><div class="mp260-isi"></div><div class="mp260-kaki"></div></div>`;
      document.body.appendChild(m); m.querySelector('.mp260-x').onclick = () => tutup(id); m.addEventListener('mousedown', ev => { if (ev.target === m) tutup(id); }); }
    m.querySelector('.mp260-judul').innerHTML = judul; m.querySelector('.mp260-sub').textContent = sub || ''; m.classList.add('tampil'); return m;
  }
  function tutup(id) { const m = document.getElementById(id); if (m) m.classList.remove('tampil'); if (id === 'mp260Online') clearInterval(ON.t); }
  window.mp260Tutup = tutup;

  window.mp260Buka = function (key) {
    const g = ringkasan().find(x => x && (x.key === key || x.keyAsli === key));
    if (!g) { kabar('Kontrak ' + key + ' tidak ditemukan.', 'err'); return; }
    if (g._mp260baru) { kabar('Kontrak ini hasil perbaikan dari ' + g.mp260.dari + ' — buka perbaikan pada kontrak sumbernya.', 'err'); window.mp260Buka(g.mp260.dari); return; }
    const sumber = g.keyAsli || g.key, O = g._mp260 ? g._mp260.asli : { items: g.items || [], nilai: g.nilai, namaVendor: g.namaVendor, idVendor: g.idVendor };
    const K = (typeof KOREKSI !== 'undefined' && KOREKSI.data) || {}, lama = K[PREFIX + sumber] || null;
    Object.assign(F, { g, sumber, O, items: O.items, sig: tanda(O.items), lama, usulan: null });
    const p0 = lama && lama.aktif !== false && lama.pindah && lama.pindah[0];
    F.pilih = F.sig.map(s => !!(p0 && (p0.items || []).indexOf(s) >= 0));
    let f = { ke: p0 ? p0.ke : '', vT: p0 && p0.header ? p0.header.namaVendor || '' : '', kT: p0 && p0.header ? p0.header.idVendor || '' : '',
      vS: lama && lama.aktif !== false && lama.header && 'namaVendor' in lama.header ? lama.header.namaVendor : (O.namaVendor || ''), kS: lama && lama.aktif !== false && lama.header && 'idVendor' in lama.header ? lama.header.idVendor : (O.idVendor || ''),
      nilai: p0 && p0.nilai !== null && p0.nilai !== undefined ? p0.nilai : '', alasan: lama && lama.aktif !== false ? lama.alasan || '' : '' };
    const u = !p0 && USULAN.find(x => x.sumber === sumber);
    if (u) {
      F.usulan = u; F.pilih = O.items.map(it => u.tetap.indexOf(kodeIt(it)) < 0);
      f = { ke: u.ke, vT: u.vendorTujuan, kT: u.kodeTujuan, vS: u.vendorSumber, kS: u.kodeSumber, nilai: '', alasan: u.alasan };
    }
    gambar(f);
  };
  function gambar(f) {
    const g = F.g, O = F.O, bisa = peng(), totalItem = O.items.reduce((s, it) => s + nilaiIt(it), 0), cocok = O.items.length > 0 && Math.abs(totalItem - N(O.nilai)) <= Math.max(1, N(O.nilai) * 0.005);
    const ent = (g.entriProgres || []).length || N(g.realisasi) > 0;
    const m = modal('mp260Reg', '<i class="fas fa-code-branch me-2"></i>Perbaiki item kontrak Master', F.sumber + ' · ' + (O.namaVendor || '-') + ' · ' + O.items.length + ' item · Rp ' + rp(O.nilai));
    m.querySelector('.mp260-isi').innerHTML = `
      ${F.usulan ? `<div class="mp260-info ok"><i class="fas fa-wand-magic-sparkles me-1"></i><b>Usulan sesuai spreadsheet</b> sudah diisi: ${F.pilih.filter(Boolean).length} item dicentang pindah ke <b>${E(F.usulan.ke)}</b> (${E(F.usulan.vendorTujuan)}), ${F.pilih.filter(x => !x).length} item tetap di ${E(F.sumber)} (${E(F.usulan.vendorSumber)}). Periksa lalu klik <b>Simpan perbaikan</b>.</div>` : ''}
      ${F.lama && F.lama.aktif !== false ? `<div class="mp260-info"><i class="fas fa-circle-info me-1"></i>Perbaikan aktif · ${E(F.lama.diubahOleh || '-')} · ${E(String(F.lama.diubahPada || '').slice(0, 16).replace('T', ' '))} · versi ${E(F.lama.versi)}</div>` : ''}
      ${ent ? `<div class="mp260-info warn"><i class="fas fa-triangle-exclamation me-1"></i>Kontrak ini sudah memiliki tagihan/progres (realisasi Rp ${rp(g.realisasi)}). Riwayat tagihan <b>tidak dipindah</b> dan tetap tercatat pada ${E(F.sumber)}. Bila tagihan tersebut sebenarnya untuk kontrak tujuan, perbaiki lewat Revisi Progres setelah perbaikan ini.</div>` : ''}
      ${cocok ? '' : `<div class="mp260-info warn"><i class="fas fa-calculator me-1"></i>Nilai per item tidak tersedia/selisih dengan nilai kontrak (jumlah item Rp ${rp(totalItem)} vs kontrak Rp ${rp(O.nilai)}). Isi <b>Nilai kontrak tujuan</b> secara manual.</div>`}
      <div class="mp260-grid">
        <fieldset><legend>Kontrak sumber (tetap)</legend>
          <label>No kontrak<input class="form-control form-control-sm font-monospace" value="${E(F.sumber)}" disabled></label>
          <label>Nama vendor<input class="form-control form-control-sm" id="mp260VS" value="${E(f.vS)}" ${bisa ? '' : 'disabled'}></label>
          <label>Kode vendor SAP<input class="form-control form-control-sm font-monospace" id="mp260KS" value="${E(f.kS)}" ${bisa ? '' : 'disabled'}></label></fieldset>
        <fieldset><legend>Kontrak tujuan (item yang dicentang)</legend>
          <label>No kontrak tujuan<input class="form-control form-control-sm font-monospace" id="mp260Ke" list="mp260DlNo" value="${E(f.ke)}" placeholder="mis. 027/SPM/WK-NK.KSO/PDBJ/1726012/2026" ${bisa ? '' : 'disabled'}></label>
          <label>Nama vendor<input class="form-control form-control-sm" id="mp260VT" value="${E(f.vT)}" ${bisa ? '' : 'disabled'}></label>
          <label>Kode vendor SAP<input class="form-control form-control-sm font-monospace" id="mp260KT" value="${E(f.kT)}" ${bisa ? '' : 'disabled'}></label>
          <label>Nilai kontrak tujuan (Rp)${cocok ? ' <span class="text-muted small">— otomatis dari item bila kosong</span>' : ''}<input class="form-control form-control-sm text-end" id="mp260Nilai" inputmode="decimal" value="${E(f.nilai)}" ${bisa ? '' : 'disabled'}></label></fieldset>
      </div>
      <datalist id="mp260DlNo">${semuaNo().map(x => `<option value="${E(x)}">`).join('')}</datalist>
      <div class="mp260-tabel"><table class="table table-sm align-middle mb-0"><thead><tr><th class="text-center">Pindah</th><th>#</th><th>Kode</th><th>Uraian item</th><th class="text-end">Volume</th><th class="text-end">Nilai (Rp)</th><th>WBS</th></tr></thead><tbody>
        ${O.items.map((it, i) => `<tr class="${F.pilih[i] ? 'pindah' : ''}"><td class="text-center"><input type="checkbox" class="form-check-input" data-i="${i}" ${F.pilih[i] ? 'checked' : ''} ${bisa ? '' : 'disabled'} onchange="mp260Centang(${i}, this.checked)"></td><td class="text-muted">${i + 1}</td><td class="font-monospace small">${E(kodeIt(it) || '-')}</td><td class="small">${E(uraianIt(it) || '-')}</td><td class="text-end small text-nowrap">${volIt(it).toLocaleString('id-ID', { maximumFractionDigits: 3 })} ${E(satIt(it))}</td><td class="text-end small">${nilaiIt(it) ? rp(nilaiIt(it)) : '-'}</td><td class="small font-monospace">${E(it.wbs || '')}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="mp260-rekap" id="mp260Rekap"></div>
      <label class="d-block mt-2">Alasan perbaikan (wajib, tercatat di Log)<textarea class="form-control form-control-sm" id="mp260Alasan" rows="2" ${bisa ? '' : 'disabled'}>${E(f.alasan)}</textarea></label>
      <div class="small text-muted mt-1"><i class="fas fa-shield-halved me-1"></i>Data Master (Excel), tagihan, WBS & riwayat tidak diubah. Perbaikan disimpan sebagai catatan koreksi berversi dan dapat dibatalkan.</div>
      <div id="mp260Pesan" class="mt-2"></div>`;
    m.querySelector('.mp260-kaki').innerHTML = `<div>${F.lama && F.lama.aktif !== false && bisa ? '<button type="button" class="btn btn-sm btn-outline-danger" onclick="mp260Batalkan()"><i class="fas fa-rotate-left me-1"></i>Batalkan perbaikan</button>' : ''}</div>
      <div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-outline-secondary" onclick="mp260Tutup('mp260Reg')">Tutup</button>${bisa ? '<button type="button" class="btn btn-sm btn-primary" id="mp260Simpan" onclick="mp260Simpan()"><i class="fas fa-save me-1"></i>Simpan perbaikan</button>' : '<span class="small text-muted align-self-center">Masuk sebagai peran Pengadaan untuk memperbaiki.</span>'}</div>`;
    ['mp260Nilai', 'mp260Ke'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', rekap); });
    rekap();
  }
  window.mp260Centang = function (i, v) { F.pilih[i] = !!v; const tr = document.querySelector(`#mp260Reg input[data-i="${i}"]`); if (tr) tr.closest('tr').classList.toggle('pindah', !!v); rekap(); };
  function hitung() {
    const O = F.O, total = O.items.reduce((s, it) => s + nilaiIt(it), 0), cocok = O.items.length > 0 && Math.abs(total - N(O.nilai)) <= Math.max(1, N(O.nilai) * 0.005);
    const pindah = O.items.filter((_, i) => F.pilih[i]), raw = String((document.getElementById('mp260Nilai') || {}).value || '').replace(/\./g, '').replace(',', '.').trim();
    const nT = raw !== '' ? N(raw) : (cocok ? pindah.reduce((s, it) => s + nilaiIt(it), 0) : 0);
    const nS = cocok ? O.items.filter((_, i) => !F.pilih[i]).reduce((s, it) => s + nilaiIt(it), 0) : Math.max(0, N(O.nilai) - nT);
    return { pindah: pindah.length, tetap: O.items.length - pindah.length, nT, nS, manual: raw !== '' ? nT : null, cocok };
  }
  function rekap() {
    const h = hitung(), el = document.getElementById('mp260Rekap'); if (!el) return;
    const ke = String((document.getElementById('mp260Ke') || {}).value || '').trim();
    el.innerHTML = `<span><b>${E(F.sumber.split('/')[0])}</b> tetap: ${h.tetap} item · Rp ${rp(h.nS)}</span><span><b>${E(ke ? ke.split('/')[0] : 'tujuan')}</b>: ${h.pindah} item · Rp ${rp(h.nT)}</span><span class="text-muted">Jumlah Rp ${rp(h.nS + h.nT)} (Master Rp ${rp(F.O.nilai)})</span>`;
  }
  window.mp260Simpan = async function () {
    const ps = document.getElementById('mp260Pesan'), salah = t => { if (ps) ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0 small">' + E(t) + '</div>'; };
    if (!peng()) { salah('Hanya peran Pengadaan yang boleh memperbaiki kontrak.'); return; }
    const v = id => String((document.getElementById(id) || {}).value || '').trim();
    const ke = v('mp260Ke'), alasan = v('mp260Alasan'), h = hitung();
    if (!ke) return salah('Isi No kontrak tujuan.');
    if (ke === F.sumber || ke === F.g.key) return salah('No kontrak tujuan harus berbeda dari kontrak sumber.');
    if (typeof kontrakValid === 'function' && !kontrakValid(ke)) return salah('Format No kontrak tujuan tidak valid: ' + ke);
    if (((typeof REG !== 'undefined' && REG.data) || []).some(r => r.noKontrak === ke)) return salah(ke + ' adalah kontrak Register (input aplikasi) — tambahkan itemnya lewat Edit kontrak Register, bukan dari sini.');
    const lain = aturan().find(a => a.sumber !== F.sumber && (a.sumber === ke || a.pindah.some(p => p.ke === ke)));
    if (lain) return salah(ke + ' sudah dipakai pada perbaikan kontrak ' + lain.sumber + '.');
    if (!h.pindah) return salah('Centang minimal 1 item yang dipindah ke ' + ke + '.');
    if (!h.tetap) return salah('Semua item dicentang. Bila nomor kontraknya yang salah, gunakan tombol Perbaiki (koreksi No kontrak), bukan pemindahan item.');
    if (!h.cocok && h.manual === null) return salah('Nilai per item tidak tersedia — isi Nilai kontrak tujuan (Rp).');
    if (h.manual !== null && (h.manual < 0 || h.manual > N(F.O.nilai))) return salah('Nilai kontrak tujuan harus antara 0 dan nilai kontrak Master (Rp ' + rp(F.O.nilai) + ').');
    if (alasan.length < 10) return salah('Isi alasan perbaikan minimal 10 karakter.');
    const key = PREFIX + F.sumber, K = KOREKSI.data || (KOREKSI.data = {}), lama = K[key] || null;
    const data = { jenis: 'perbaikanRegister', versiFormat: 1, sumber: F.sumber, aktif: true, alasan,
      header: { namaVendor: v('mp260VS'), idVendor: v('mp260KS') },
      pindah: [{ ke, items: F.sig.filter((_, i) => F.pilih[i]), uraian: F.O.items.filter((_, i) => F.pilih[i]).map(it => kodeIt(it) + ' ' + uraianIt(it)).slice(0, 60),
        header: { namaVendor: v('mp260VT'), idVendor: v('mp260KT') }, nilai: h.manual }] };
    const b = document.getElementById('mp260Simpan'); if (b) { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Menyimpan…'; }
    try {
      const r = await regAksi('saveKoreksi', { data: { key, versi: lama ? lama.versi : 0, data } });
      K[key] = r.data;
      if (typeof renderAllTables === 'function') renderAllTables();
      tutup('mp260Reg');
      kabar('Perbaikan tersimpan: ' + h.pindah + ' item → ' + ke + ' · ' + h.tetap + ' item tetap di ' + F.sumber + '.', 'ok');
    } catch (e) { salah(pesanGalat(e)); if (/KONFLIK/.test(String(e && e.message))) { try { await muatRegister(true); } catch (_) { } } }
    finally { if (b) { b.disabled = false; b.innerHTML = '<i class="fas fa-save me-1"></i>Simpan perbaikan'; } }
  };
  window.mp260Batalkan = async function () {
    const key = PREFIX + F.sumber, lama = KOREKSI.data && KOREKSI.data[key]; if (!lama) return;
    let ok = true; try { if (typeof tanya === 'function') ok = await tanya('Batalkan perbaikan ' + F.sumber + '? Tampilan kembali ke data Master asli (perbaikan tetap tercatat di Log).', { judul: 'Batalkan perbaikan', ok: 'Batalkan perbaikan', bahaya: true }); } catch (e) { }
    if (!ok) return;
    const data = {}; Object.keys(lama).forEach(k => { if (['key', 'versi', 'diubahOleh', 'diubahPada'].indexOf(k) < 0) data[k] = lama[k]; }); data.aktif = false;
    try { const r = await regAksi('saveKoreksi', { data: { key, versi: lama.versi, data } }); KOREKSI.data[key] = r.data; if (typeof renderAllTables === 'function') renderAllTables(); tutup('mp260Reg'); kabar('Perbaikan ' + F.sumber + ' dibatalkan.', 'ok'); }
    catch (e) { kabar(pesanGalat(e), 'err'); }
  };
  // tombol & penanda pada daftar Register Kontrak (baris Master)
  function pasangTombol() {
    document.querySelectorAll('tr.baris-kontrak[data-key]').forEach(tr => {
      const key = tr.dataset.key, g = ringkasan().find(x => x && (x.key === key || x.keyAsli === key)); if (!g) return;
      const sel = tr.lastElementChild;
      if (sel && !sel.querySelector('.mp260-btn') && !g._mp260baru) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-light border ms-1 mp260-btn'; b.title = 'Perbaiki item kontrak (pindahkan item yang salah kontrak)';
        b.innerHTML = '<i class="fas fa-code-branch"></i>'; b.onclick = ev => { ev.stopPropagation(); window.mp260Buka(key); }; sel.appendChild(b);
      }
      const td = tr.firstElementChild;
      if (td && g.mp260 && !td.querySelector('.mp260-tanda')) {
        const s = document.createElement('span'); s.className = 'badge mp260-tanda ms-1';
        s.innerHTML = g.mp260.peran === 'sumber' ? '<i class="fas fa-code-branch me-1"></i>item diperbaiki' : '<i class="fas fa-code-branch me-1"></i>dipisah dari ' + E(String(g.mp260.dari).split('/')[0]);
        s.title = 'Perbaikan register: ' + (g.mp260.aturan.alasan || ''); const c = td.querySelector('code'); if (c) c.after(s); else td.appendChild(s);
      }
    });
  }
  let _tm = 0; const jadwal = () => { clearTimeout(_tm); _tm = setTimeout(() => { try { pasangTombol(); } catch (e) { } }, 120); };
  const pasangObs = () => { if (!document.body) return; new MutationObserver(m => { if (m.some(x => x.addedNodes.length)) jadwal(); }).observe(document.body, { childList: true, subtree: true }); jadwal(); };
  if (document.body) pasangObs(); else document.addEventListener('DOMContentLoaded', pasangObs);

  /* ======================= B. PENGGUNA ONLINE ======================= */
  const HD = { dukung: null, aksi: '', t: 0, kirim: 0, galat: '' };
  window.MP260_HADIR = HD;
  const BACA_AKSI = /^(login|baca|bacaSemua|adminData|bacaMasterTambahan|bacaAlokasiBon|bacaPembaruanAdmin|ambilKandidatPembaruan|checklistBaca|checklistRingkas|ambilBerkas|arsipBaca|manifestBaca|diagServer|modulInfo|gudangBaca|gudangBacaHal|identitasBaca|gudangImporCek|notifInfo|aiInfo|vtInfo|vtRingkas|vtBaca|vtBundelBaca|vtRencana|timInfo|timRingkas|hadirDetak|hadirDaftar|notifTgCari)$/;
  function konteks() {
    const tabs = [...document.querySelectorAll('main .content-tab')].filter(d => d.style.display !== 'none' && d.offsetParent !== null);
    const tab = tabs.length ? tabs[0].id.replace(/^tab-/, '') : '';
    const link = document.querySelector('#sidebar .nav-link.active'), mc = (typeof MENU_CEPAT !== 'undefined' && MENU_CEPAT || []).find(m => m[0] === tab);
    const menu = (mc && mc[1]) || (link && link.textContent.trim()) || tab;
    const md = [...document.querySelectorAll('.mp260-latar.tampil .mp260-judul, .modal.show .modal-title, .offcanvas.show .offcanvas-title')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const sub = [...document.querySelectorAll('.modal.show .modal-header .small, .mp260-latar.tampil .mp260-sub')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)[0] || '';
    return { tab, menu, aktivitas: md.length ? md[0] + (sub ? ' · ' + sub : '') : '' };
  }
  const perangkat = () => (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'HP/Tablet' : 'Komputer') + (document.documentElement.classList.contains('mp219-desktop') ? ' · aplikasi Windows' : ' · browser');
  async function detak(status) {
    if (typeof REG === 'undefined' || !REG.url || !REG.sesi || HD.dukung === false) return;
    const k = konteks(), d = { menu: k.menu, tab: k.tab, aktivitas: k.aktivitas, perangkat: perangkat(), status: status || (document.hidden ? 'diam' : 'aktif') };
    if (HD.aksi) { d.aksi = HD.aksi; HD.aksi = ''; }
    HD.kirim = Date.now();
    try { await regAksi('hadirDetak', { data: d }); HD.dukung = true; HD.galat = ''; }
    catch (e) { const m = String(e && e.message || e); HD.galat = m; if (/tidak dikenal|modul server yang sedang tidak aktif/i.test(m)) HD.dukung = false; if (d.aksi && !HD.aksi) HD.aksi = d.aksi; }
  }
  window.mp260Detak = detak;
  const segera = () => { clearTimeout(HD.t); HD.t = setTimeout(() => detak(), 2500); };
  setInterval(() => { if (!document.hidden && Date.now() - HD.kirim > 55000) detak(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) detak('diam'); else segera(); });
  setTimeout(() => detak(), 6000);
  const st = window.showTab;
  if (typeof st === 'function') window.showTab = function () { const r = st.apply(this, arguments); try { segera(); } catch (e) { } return r; };
  const LABEL = { save: 'Simpan kontrak Register', posting: 'Posting kontrak', kembalikan: 'Kembalikan kontrak', saveKoreksi: 'Koreksi kontrak', savePBJ: 'Simpan paket PBJ', hapusPBJ: 'Hapus paket PBJ',
    savePermintaan: 'Simpan permintaan / Bon', hapusPermintaan: 'Hapus permintaan', checklistSimpan: 'Simpan checklist tagihan', checklistVerifikasi: 'Verifikasi Admin checklist', checklistKategori: 'Ubah kategori checklist',
    unggahBerkas: 'Unggah berkas', gudangMasukSimpan: 'Penerimaan material (GR)', gudangKeluarSimpan: 'Pengeluaran material (GI)', gudangTerimaBon: 'Terima kiriman Bon', gudangBatal: 'Batalkan transaksi gudang',
    gudangUnggahFoto: 'Unggah foto gudang', simpanMasterTambahan: 'Simpan Master Data', simpanAlokasiBon: 'Simpan alokasi Bon/WBS', vtBundel: 'Baca bundel tagihan (AI)', vtEkstrak: 'Baca dokumen tagihan (AI)',
    vtNilai: 'Verifikasi tagihan (AI)', aiTanya: 'Bertanya ke Asisten AI', aiAksi: 'Perintah Asisten AI', timJalan: 'Menjalankan Tim AI', arsipSimpan: 'Simpan arsip vendor', identitasSimpan: 'Simpan identitas pelaksana', ubahProfil: 'Ubah profil' };
  const ra = window.regAksi;
  if (typeof ra === 'function') window.regAksi = async function (aksi, extra) {
    const r = await ra.apply(this, arguments);
    try {
      if (aksi && !BACA_AKSI.test(aksi)) {
        const x = (extra && extra.data) || extra || {}, id = x.noKontrak || x.nomor || x.key || x.kode || x.id || '';
        HD.aksi = (LABEL[aksi] || aksi) + (id ? ' · ' + String(id).replace(PREFIX, 'perbaikan ').slice(0, 80) : ''); segera();
      }
    } catch (e) { }
    return r;
  };

  const ON = { t: 0, data: null, galat: '', muat: false };
  const umur = s => s === null || s === undefined ? '-' : s < 60 ? s + ' dtk lalu' : s < 3600 ? Math.round(s / 60) + ' mnt lalu' : Math.round(s / 3600) + ' jam lalu';
  const jam = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  async function muatOnline() {
    if (ON.muat) return; ON.muat = true;
    try { const r = await regAksi('hadirDaftar', {}); ON.data = r; ON.galat = ''; }
    catch (e) { const m = String(e && e.message || e); ON.galat = /tidak dikenal|modul server yang sedang tidak aktif/i.test(m) ? 'Server belum memuat fitur kehadiran. Admin penerbit: menu akun › Diagnostik sistem › tab Modul › unggah server-modul-1.8.8.json › uji › terbitkan.' : m; }
    finally { ON.muat = false; gambarOnline(); }
  }
  function gambarOnline() {
    const m = document.getElementById('mp260Online'); if (!m || !m.classList.contains('tampil')) return;
    const L = (ON.data && ON.data.data) || [], on = L.filter(x => x.online).length, dm = L.filter(x => x.diam && !x.online).length;
    m.querySelector('.mp260-sub').textContent = ON.data ? `${on} online · ${dm} diam/tidak aktif · ${L.length - on - dm} offline · diperbarui ${jam(ON.data.waktu)}` : (ON.muat ? 'Memuat…' : '');
    m.querySelector('.mp260-isi').innerHTML = ON.galat ? `<div class="mp260-info warn">${E(ON.galat)}</div>` : !ON.data ? '<div class="text-muted py-4 text-center">Memuat…</div>' : `
      <div class="mp260-tabel"><table class="table table-sm align-middle mb-0"><thead><tr><th>Pengguna</th><th>Status</th><th>Sedang membuka</th><th>Aksi terakhir</th><th>Catatan Log terakhir</th><th>Perangkat</th></tr></thead><tbody>
      ${L.map(x => { const h = x.hadir || {}, s = x.online ? 'on' : x.diam ? 'diam' : 'off';
        return `<tr class="mp260-${s}"><td><b>${E(x.nama)}</b><div class="small text-muted">${E(x.peran)}${x.jabatan ? ' · ' + E(x.jabatan) : ''}</div></td>
        <td class="text-nowrap"><span class="mp260-titik ${s}"></span>${s === 'on' ? 'Online' : s === 'diam' ? 'Diam' : 'Offline'}<div class="small text-muted">${x.hadir ? umur(x.umurDetik) : 'tidak aktif 15+ mnt'}</div>${h.mulai && s !== 'off' ? `<div class="small text-muted">sejak ${E(jam(h.mulai))}</div>` : ''}</td>
        <td class="small">${s === 'off' ? '<span class="text-muted">-</span>' : `<b>${E(h.menu || h.tab || '-')}</b>${h.aktivitas ? `<div>${E(h.aktivitas)}</div>` : ''}`}</td>
        <td class="small">${h.aksi ? `${E(h.aksi)}<div class="text-muted">${E(jam(h.aksiPada))}</div>` : '<span class="text-muted">-</span>'}</td>
        <td class="small">${(x.logTerakhir || []).map(l => `<div><span class="text-muted">${E(jam(l.waktu))}</span> · <b>${E(l.aksi)}</b>${l.noKontrak && l.noKontrak !== '-' ? ' · ' + E(String(l.noKontrak).split('/').slice(0, 2).join('/')) : ''}</div>`).join('') || '<span class="text-muted">-</span>'}</td>
        <td class="small text-muted">${E(h.perangkat || '-')}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="small text-muted mt-2"><i class="fas fa-circle-info me-1"></i>Online = aplikasi terbuka & aktif dalam 3 menit terakhir. Aktivitas dikirim aplikasi tiap ±1 menit (disimpan sementara di server, hilang sendiri setelah 15 menit; tidak menulis Google Sheets). Catatan Log = perubahan data yang sudah tersimpan.</div>`;
  }
  window.mp260Online = function () {
    if (!adm()) { kabar('Khusus Admin.', 'err'); return; }
    const m = modal('mp260Online', '<i class="fas fa-users me-2"></i>Pengguna online', 'Memuat…');
    m.querySelector('.mp260-kaki').innerHTML = '<div></div><div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-outline-primary" onclick="mp260OnlineMuat()"><i class="fas fa-rotate me-1"></i>Muat ulang</button><button type="button" class="btn btn-sm btn-outline-secondary" onclick="mp260Tutup(\'mp260Online\')">Tutup</button></div>';
    gambarOnline(); muatOnline(); detak();
    clearInterval(ON.t); ON.t = setInterval(() => { if (!document.hidden) muatOnline(); }, 30000);
  };
  window.mp260OnlineMuat = muatOnline;
  function pasangMenu() {
    if (!adm() || document.getElementById('mp260MenuOnline')) return;
    const a = document.getElementById('mp220MenuDiag') || document.querySelector('.menu-akun .dropdown-menu a[onclick*="bukaKoneksi"]'); if (!a) return;
    const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp260MenuOnline" onclick="mp260Online(); return false;"><i class="fas fa-users me-2"></i>Pengguna online</a>';
    a.closest('li').after(li);
  }
  setInterval(() => { try { pasangMenu(); } catch (e) { } }, 3000); setTimeout(() => { try { pasangMenu(); } catch (e) { } }, 800);
})();
