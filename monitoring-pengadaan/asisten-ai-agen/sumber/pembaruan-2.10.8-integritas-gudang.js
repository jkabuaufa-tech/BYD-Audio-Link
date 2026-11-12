/* MP2105 — INTEGRITAS DATA GUDANG · UBAH FOTO PENERIMAAN (2.10.8; Modul server 1.10.11 · fitur "gudangAudit", "gudangUbahFoto")
 *  1. Audit data gudang (Pengadaan/Admin): pita di Penerimaan Material, Laporan Harian Gudang & Kartu Gudang menampilkan material yang
 *     tercatat ganda (migrasi gudang lama + penerimaan resmi BAPM/Bon), penerimaan melebihi volume bon, tanggal gudang ≠ tanggal BAPM,
 *     dan transaksi identik. Dialog "Periksa & bersihkan": sebelum → sesudah per material; Admin mengetik BERSIHKAN untuk menerapkan
 *     (baris tidak dihapus — status Batal + jejak batch; satu batch dapat diurungkan).
 *  2. Ubah foto penerimaan: tombol "Ubah foto" di Daftar kiriman diterima & Riwayat kiriman — ganti / tambah / hapus foto per material
 *     setelah transaksi tersimpan (alasan wajib, min. 1 foto tersisa, foto lama tetap tersimpan).
 *  3. Pengaman tampilan: transaksi ber-ID sama yang terbaca dua kali dari server hanya dihitung sekali. */
(function () {
  'use strict';
  if (window.__MP2105__) return; window.__MP2105__ = true;
  const $ = id => document.getElementById(id);
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  const kabar = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || 'ok'); } catch (e) { } };
  const G = () => window.MP223 || { masuk: [], keluar: [] };
  const admin = () => { const s = sesi(); return !!(s && s.admin); };
  const pengadaan = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN')); };
  const bolehFoto = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN' || s.gudang)); };
  const ang = v => (Math.round((Number(v) || 0) * 1e4) / 1e4).toLocaleString('id-ID', { maximumFractionDigits: 3 });
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const tgl = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[3] + '-' + BLN[+m[2] - 1] + '-' + m[1] : '-'; };
  const SISI = ['Tampak Depan', 'Tampak Belakang', 'Samping Kanan', 'Samping Kiri'];
  const muatUlang = async () => { try { if (typeof window.mp223Muat === 'function') await window.mp223Muat(true); if (typeof window.mp223Render === 'function') window.mp223Render(); } catch (e) { } };

  /* ---------- 3. transaksi ber-ID sama dihitung sekali ---------- */
  const _lihat = {};
  function tanpaGanda() {
    const D = window.MP223; if (!D) return false; let ubah = false;
    ['masuk', 'keluar'].forEach(j => {
      const L = D[j]; if (!Array.isArray(L) || _lihat[j] === L) return;
      const m = new Map(); let ganda = 0;
      L.forEach(r => { const a = m.get(r.id); if (!a) m.set(r.id, r); else { ganda++; if (Number(r.versi) >= Number(a.versi)) m.set(r.id, r); } });
      if (ganda) { D[j] = [...m.values()]; ubah = true; console.warn('[MP2105] ' + ganda + ' transaksi gudang ber-ID sama diabaikan (' + j + ')'); }
      _lihat[j] = D[j];
    });
    return ubah;
  }

  /* ---------- 1. audit & pembersihan ---------- */
  const NAMA = { DUPLIKAT_MIGRASI: 'Penerimaan migrasi ganda — sudah ada penerimaan resmi Bon/BAPM', DUPLIKAT_PENERIMAAN: 'Penerimaan melebihi volume bon',
    TANGGAL_BAPM: 'Tanggal gudang belum sama dengan tanggal BAPM', DUPLIKAT_PENGELUARAN: 'Pengeluaran identik tercatat ganda', DUPLIKAT_MIGRASI_KEMBAR: 'Penerimaan migrasi identik tercatat ganda' };
  const AU = { hasil: null, sidik: '', muat: false, gagal: 0, galat: '', pilih: {} };
  window.MP2105 = AU;
  const sidikData = () => { const D = G(), f = L => (L || []).length + ':' + (L || []).reduce((a, r) => a + (Number(r.versi) || 0) + (r.status === 'AKTIF' ? 1 : 0), 0); return (sesi() ? sesi().nama : '') + '|' + f(D.masuk) + '|' + f(D.keluar); };
  async function audit(paksa) {
    if (!pengadaan() || !srv('gudangAudit') || AU.muat) return AU.hasil;
    const sd = sidikData();
    if (!paksa && ((AU.hasil && AU.sidik === sd) || (AU.gagal && Date.now() - AU.gagal < 60000))) return AU.hasil;
    AU.muat = true;
    try { AU.hasil = await window.regAksi('gudangAudit', {}); AU.sidik = sd; AU.galat = ''; AU.gagal = 0; }
    catch (e) { AU.galat = S(e && e.message || e); AU.gagal = Date.now(); if (paksa) throw e; }
    finally { AU.muat = false; pita(); }
    return AU.hasil;
  }
  window.mp2105Audit = audit;
  const bisaBersih = t => t.tindakan && t.tindakan.length > 0;
  function pita() {
    ['gdmasuk', 'gdharian', 'gdkartu'].forEach(nm => {
      const tab = $('tab-' + nm); if (!tab) return; let el = $('mp2105Pita-' + nm);
      const R = AU.hasil && AU.hasil.ringkas;
      if (!pengadaan() || !srv('gudangAudit') || !R) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'mp2105Pita-' + nm; tab.insertBefore(el, tab.firstElementChild ? tab.firstElementChild.nextSibling : null); }
      const n = R.temuan, D = AU.hasil.diperiksa || {};
      const isi = n ? `<i class="fas fa-triangle-exclamation"></i><div><b>Audit data gudang: ${R.material} material ${R.pasti ? 'perlu dibersihkan' : 'perlu ditinjau'}</b> — ${R.pasti} temuan pasti${R.tinjau ? ' · ' + R.tinjau + ' perlu ditinjau' : ''}.
          <div class="sub">Selama belum dibersihkan, Kartu Gudang & Laporan Harian Gudang menghitung transaksi ganda (mis. migrasi gudang lama + penerimaan BAPM untuk barang yang sama).</div></div>
          <button type="button" class="btn btn-sm btn-warning" onclick="mp2105Buka()"><i class="fas fa-broom me-1"></i>${R.pasti ? 'Periksa &amp; bersihkan' : 'Periksa'}</button>`
        : `<i class="fas fa-circle-check"></i><div><b>Audit data gudang: tidak ada entri ganda.</b> <span class="sub">${ang(D.masuk)} penerimaan · ${ang(D.keluar)} pengeluaran · ${ang(D.material)} material diperiksa.</span></div>
          <button type="button" class="btn btn-sm btn-light border" onclick="mp2105Buka()">Rincian</button>`;
      el.className = 'mp2105-pita ' + (n ? 'awas' : 'aman');
      if (el.dataset.isi !== isi) { el.dataset.isi = isi; el.innerHTML = isi; }
    });
  }
  const tutup = id => { const w = $(id); if (w) w.remove(); };
  function barisTemuan(t) {
    const bisa = bisaBersih(t), cek = AU.pilih[t.id] === undefined ? (bisa && t.tingkat === 'PASTI') : AU.pilih[t.id];
    const beda = (a, b, f) => a === b ? f(a) : `<s>${f(a)}</s> → <b>${f(b)}</b>`;
    return `<tr class="${bisa ? '' : 'mati'}"><td class="c"><input type="checkbox" class="form-check-input mp2105-cek" data-id="${E(t.id)}" ${cek && bisa ? 'checked' : ''} ${bisa && admin() ? '' : 'disabled'} aria-label="Pilih ${E(t.uraian)}"></td>
      <td><b>${E(t.uraian)}</b><div class="sub mono">${E(t.kode || '-')} · ${E(t.sat)}${t.volBon ? ' · volume bon ' + ang(t.volBon) : ''}</div></td>
      <td><span class="mp2105-bd ${t.tingkat === 'PASTI' && bisa ? 'pasti' : 'tinjau'}">${t.tingkat === 'PASTI' && bisa ? 'Pasti' : 'Perlu ditinjau'}</span> ${E(NAMA[t.jenis] || t.jenis)}${t.catatan ? `<div class="sub">${E(t.catatan)}</div>` : ''}</td>
      <td class="r nw">${beda(t.sebelum.terima, t.sesudah.terima, ang)}</td><td class="r nw">${beda(t.sebelum.keluar, t.sesudah.keluar, ang)}</td><td class="r nw">${beda(t.sebelum.saldo, t.sesudah.saldo, ang)}</td>
      <td class="nw">${beda(t.sebelum.tanggalAwal, t.sesudah.tanggalAwal, tgl)}</td>
      <td class="sub">${bisa ? t.tindakan.map(a => `<div>${a.aksi === 'BATAL' ? 'Batalkan' : 'Tanggal → ' + tgl(a.tanggalBaru)}: ${E(a.jenis === 'masuk' ? 'GR' : 'GI')} ${tgl(a.tanggal)} · ${ang(a.qty)} ${E(t.sat)} · ${E(a.ket)}</div>`).join('') : '<i>tanpa tindakan otomatis</i>'}</td></tr>`;
  }
  function isiDialog() {
    const H = AU.hasil, T = (H && H.data) || [], R = (H && H.ringkas) || {}, B = (H && H.batch) || [];
    const dipilih = T.filter(t => bisaBersih(t) && (AU.pilih[t.id] === undefined ? t.tingkat === 'PASTI' : AU.pilih[t.id]));
    return `<div class="mp273-kepala"><b><i class="fas fa-broom me-1"></i>Audit &amp; pembersihan data gudang</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi">
        <div class="small mb-2">Diperiksa: <b>${ang((H && H.diperiksa || {}).masuk)}</b> penerimaan aktif · <b>${ang((H && H.diperiksa || {}).keluar)}</b> pengeluaran aktif · <b>${ang((H && H.diperiksa || {}).material)}</b> material.
          ${T.length ? `Ditemukan <b>${T.length}</b> temuan pada <b>${R.material}</b> material.` : '<b class="text-success">Tidak ada entri ganda atau tanggal yang tidak sinkron.</b>'}</div>
        ${T.length ? `<div class="mp2105-tw"><table class="mp2105-tb"><thead><tr><th></th><th>Material</th><th>Temuan</th><th class="r">Penerimaan</th><th class="r">Pengeluaran</th><th class="r">Saldo</th><th>Catatan pertama</th><th>Tindakan</th></tr></thead><tbody>${T.map(barisTemuan).join('')}</tbody></table></div>
        <div class="sub mt-2"><i class="fas fa-circle-info"></i> Baris tidak dihapus: transaksi ganda diberi status <b>Batal</b> dengan alasan &amp; jejak batch, tercatat di Log, dan satu batch dapat diurungkan. Temuan <b>Perlu ditinjau</b> tidak dicentang otomatis — centang hanya bila Anda yakin transaksi tersebut memang ganda.</div>` : ''}
        ${T.length && admin() ? `<div class="mp2105-ok"><label class="small" for="mp2105Konf">Ketik <b>BERSIHKAN</b> untuk menerapkan <b id="mp2105N">${dipilih.length}</b> temuan terpilih</label>
          <input class="form-control form-control-sm" id="mp2105Konf" maxlength="12" autocomplete="off" placeholder="BERSIHKAN">
          <button type="button" class="btn btn-sm btn-danger" id="mp2105Jalan"><i class="fas fa-broom me-1"></i>Bersihkan</button></div>` : T.length ? '<div class="alert alert-light border small py-2 mt-2 mb-0">Pembersihan hanya dapat dijalankan <b>Admin</b>. Teruskan daftar ini kepada Admin proyek.</div>' : ''}
        ${B.length && admin() ? `<div class="mp2105-batch"><b class="small">Pembersihan terakhir:</b> ${B.map(b => `<div class="small"><span class="mono">${E(b.batch)}</span> · ${E(b.oleh)} · ${E(S(b.pada).slice(0, 16).replace('T', ' '))} · ${b.baris} baris <a href="#" onclick="mp2105Urung(${E(JSON.stringify(b.batch))});return false">Urungkan</a></div>`).join('')}</div>` : ''}
        <div id="mp2105Pesan" class="mp273-pesan" role="status"></div>
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" id="mp2105Ulang"><i class="fas fa-rotate me-1"></i>Audit ulang</button><button type="button" class="btn btn-sm btn-light border" data-tutup>Tutup</button></div></div>`;
  }
  function pasangDialog() {
    const w = $('mp2105Modal'); if (!w) return;
    w.querySelector('.mp273-kotak').innerHTML = isiDialog();
    const msg = t => { const p = $('mp2105Pesan'); if (p) p.textContent = t; };
    w.querySelectorAll('.mp2105-cek').forEach(c => c.addEventListener('change', () => { AU.pilih[c.dataset.id] = c.checked; const n = $('mp2105N'); if (n) n.textContent = w.querySelectorAll('.mp2105-cek:checked').length; }));
    const u = $('mp2105Ulang'); if (u) u.onclick = async () => { u.disabled = true; msg('Mengaudit seluruh material…'); try { AU.pilih = {}; await audit(true); pasangDialog(); } catch (e) { msg(e.message); u.disabled = false; } };
    const j = $('mp2105Jalan'); if (j) j.onclick = async () => {
      const ids = [...w.querySelectorAll('.mp2105-cek:checked')].map(c => c.dataset.id), T = AU.hasil.data.filter(t => ids.indexOf(t.id) >= 0);
      if (!T.length) { msg('Centang minimal 1 temuan.'); return; }
      if (S($('mp2105Konf').value).toUpperCase() !== 'BERSIHKAN') { msg('Ketik BERSIHKAN pada kotak konfirmasi.'); $('mp2105Konf').focus(); return; }
      j.disabled = true; msg('Membersihkan ' + T.length + ' temuan…');
      try {
        const r = await window.regAksi('gudangBersihkan', { data: { konfirmasi: 'BERSIHKAN', pilih: T.map(t => ({ id: t.id, sidik: t.sidik })) } });
        const R = r.ringkas || {};
        kabar('Data gudang dibersihkan: ' + (R.material || 0) + ' material · ' + (R.batalGR || 0) + ' penerimaan ganda & ' + (R.batalGI || 0) + ' pengeluaran ganda dibatalkan · ' + (R.ubahTanggal || 0) + ' tanggal disesuaikan. Batch ' + r.batch + '.', 'ok');
        AU.pilih = {}; await muatUlang(); await audit(true); pasangDialog();
      } catch (e) { msg(e.message); j.disabled = false; }
    };
  }
  window.mp2105Buka = async () => {
    tutup('mp2105Modal');
    const w = document.createElement('div'); w.id = 'mp2105Modal'; w.className = 'mp273-modal';
    w.innerHTML = '<div class="mp273-kotak mp2105-kotak" role="dialog" aria-modal="true" aria-label="Audit dan pembersihan data gudang"></div>';
    w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-tutup]')) w.remove(); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape') w.remove(); });
    document.body.appendChild(w);
    if (!AU.hasil) { w.firstChild.innerHTML = '<div class="mp273-isi small"><i class="fas fa-spinner fa-spin me-1"></i>Mengaudit seluruh material…</div>'; try { await audit(true); } catch (e) { w.firstChild.innerHTML = '<div class="mp273-isi"><div class="alert alert-danger small mb-2">' + E(e.message) + '</div><button type="button" class="btn btn-sm btn-light border" data-tutup>Tutup</button></div>'; return; } }
    pasangDialog();
  };
  window.mp2105Urung = async batch => {
    const alasan = window.prompt('Urungkan pembersihan ' + batch + '?\nTransaksi yang dibatalkan batch ini akan aktif kembali.\n\nTulis alasan (min. 12 karakter):', '');
    if (alasan === null) return;
    try { const r = await window.regAksi('gudangBersihkanUrung', { data: { batch, alasan } }); kabar('Pembersihan ' + batch + ' diurungkan: ' + r.kembali.masuk + ' penerimaan + ' + r.kembali.keluar + ' pengeluaran dikembalikan.', 'ok'); await muatUlang(); await audit(true); pasangDialog(); }
    catch (e) { const p = $('mp2105Pesan'); if (p) p.textContent = e.message; else kabar(e.message, 'err'); }
  };

  /* ---------- 2. ubah foto penerimaan ---------- */
  const kunciKirim = r => r.kiriman || ('SJ:' + String(r.noSJ || '').toLowerCase() + '|' + r.tanggal);
  const sidikFoto = r => (r.foto || []).map(f => f ? (f.idServer || f.id || '') : '').join('|');
  const bisaUbah = r => r.status === 'AKTIF' && !(r.otomatis && r.fotoKurang);
  window.mp2105TombolFoto = k => {
    try { if (!bolehFoto() || !srv('gudangUbahFoto') || !k || !k.aktif || !(k.rows || []).some(bisaUbah)) return ''; } catch (e) { return ''; }
    return `<div><button type="button" class="mp2103-dok mp2105-uf" title="Ganti / tambah / hapus foto penerimaan yang sudah tersimpan" onclick="mp2105UbahFoto(${E(JSON.stringify(k.key))})"><i class="fas fa-camera-rotate"></i>Ubah foto</button></div>`;
  };
  function kecilkan(file) {
    return new Promise((ok, gagal) => {
      if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return gagal(new Error('Pilih berkas foto (JPG / PNG).'));
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const s = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.85)); };
      im.onerror = () => { URL.revokeObjectURL(u); gagal(new Error('Format foto tidak bisa dibaca. Gunakan JPG atau PNG.')); };
      im.src = u;
    });
  }
  async function gambar(ref) {
    const id = ref && (ref.idServer || ref.id); if (!id) return '';
    const D = G(); D.dok = D.dok || {};
    if (!D.dok[id]) { const r = await window.regAksi('ambilBerkas', { id }); D.dok[id] = 'data:' + (r.tipe || 'image/jpeg') + ';base64,' + r.data; }
    return D.dok[id];
  }
  const UF = { rows: [], id: '', slot: [null, null, null, null], sibuk: false };
  function pilihBaris(id) { const r = UF.rows.find(x => x.id === id) || UF.rows[0]; UF.id = r.id; UF.slot = [0, 1, 2, 3].map(i => (r.foto || [])[i] ? { ref: r.foto[i] } : null); }
  function gambarSlot() {
    const r = UF.rows.find(x => x.id === UF.id), w = $('mp2105Slot'); if (!w || !r) return;
    w.innerHTML = SISI.map((s, i) => { const z = UF.slot[i];
      return `<div class="mp2105-s ${z ? 'isi' : ''} ${z && z.data ? 'baru' : ''}"><div class="t">${s}${z && z.data ? ' <span class="mp2105-bd pasti">baru</span>' : ''}</div>
        <div class="g" id="mp2105G${i}">${z ? (z.data ? `<img src="${z.data}" alt="${s}">` : '<i class="fas fa-spinner fa-spin"></i>') : '<span><i class="fas fa-camera"></i><br>kosong</span>'}</div>
        <div class="a"><label class="btn btn-sm btn-light border py-0 mb-0">${z ? 'Ganti' : 'Tambah'}<input type="file" accept="image/jpeg,image/png" hidden data-i="${i}"></label>${z ? `<button type="button" class="btn btn-sm btn-light border py-0" data-hapus="${i}">Hapus</button>` : ''}</div></div>`; }).join('');
    UF.slot.forEach((z, i) => { if (z && z.ref && !z.data) gambar(z.ref).then(src => { const el = $('mp2105G' + i); if (el && UF.slot[i] === z) el.innerHTML = src ? `<img src="${src}" alt="${SISI[i]}">` : '<span>foto tidak dapat dimuat</span>'; }).catch(() => { const el = $('mp2105G' + i); if (el && UF.slot[i] === z) el.innerHTML = '<span>foto tidak dapat dimuat</span>'; }); });
    const lain = UF.rows.filter(x => x.id !== r.id && sidikFoto(x) === sidikFoto(r)).length, sk = $('mp2105SekWrap');
    if (sk) { sk.hidden = !lain; const n = $('mp2105SekN'); if (n) n.textContent = lain; if (!lain) $('mp2105Sek').checked = false; }
  }
  window.mp2105UbahFoto = kunci => {
    const rows = (G().masuk || []).filter(r => kunciKirim(r) === kunci && bisaUbah(r)).sort((a, b) => (Number(a.bonIdx) - Number(b.bonIdx)) || S(a.id).localeCompare(S(b.id)));
    if (!rows.length) { kabar('Penerimaan ini tidak ditemukan atau sudah dibatalkan. Muat ulang.', 'warning'); return; }
    UF.rows = rows; UF.sibuk = false; pilihBaris(rows[0].id);
    tutup('mp2105Foto');
    const r0 = rows[0], w = document.createElement('div'); w.id = 'mp2105Foto'; w.className = 'mp273-modal';
    w.innerHTML = `<div class="mp273-kotak" role="dialog" aria-modal="true" aria-label="Ubah foto penerimaan">
      <div class="mp273-kepala"><b><i class="fas fa-camera-rotate me-1"></i>Ubah foto penerimaan</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi"><div class="small mb-2">${E(r0.noSJ)} · Bon ${E(r0.bonNomor)} · diterima ${tgl(r0.tanggal)}</div>
        <label class="small" for="mp2105Mat">Material</label>
        <select class="form-select form-select-sm mb-2" id="mp2105Mat" ${rows.length > 1 ? '' : 'disabled'}>${rows.map(r => `<option value="${E(r.id)}">${E(r.uraian)} · ${ang(r.qty)} ${E(r.sat)}${r.fotoWakil ? ' (foto utama kiriman)' : ''}</option>`).join('')}</select>
        <div class="mp2105-slot" id="mp2105Slot"></div>
        <label class="form-check small mt-2" id="mp2105SekWrap" hidden><input type="checkbox" class="form-check-input" id="mp2105Sek"> Terapkan juga ke <b id="mp2105SekN">0</b> item lain di kiriman ini yang memakai foto yang sama</label>
        <label class="small mt-2" for="mp2105Alasan">Alasan perubahan foto *</label>
        <input class="form-control form-control-sm" id="mp2105Alasan" maxlength="200" placeholder="mis. foto buram, difoto ulang di gudang">
        <div class="sub mt-1"><i class="fas fa-circle-info"></i> Minimal 1 foto harus tetap ada. Foto lama tidak dihapus dari Drive; penggantian tercatat di Log beserta nama &amp; waktu.</div>
        <div id="mp2105FPesan" class="mp273-pesan" role="status"></div>
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Batal</button><button type="button" class="btn btn-sm btn-primary" id="mp2105FOk"><i class="fas fa-cloud-arrow-up me-1"></i>Simpan foto</button></div></div></div>`;
    const msg = t => { const p = $('mp2105FPesan'); if (p) p.textContent = t; };
    w.addEventListener('click', e => {
      if (UF.sibuk) return;
      if (e.target === w || e.target.closest('[data-tutup]')) { w.remove(); return; }
      const h = e.target.closest('[data-hapus]'); if (h) { UF.slot[Number(h.dataset.hapus)] = null; gambarSlot(); msg(''); }
    });
    w.addEventListener('change', async e => {
      const t = e.target;
      if (t.id === 'mp2105Mat') { pilihBaris(t.value); gambarSlot(); msg(''); return; }
      if (t.type === 'file' && t.dataset.i !== undefined && t.files && t.files[0]) { try { UF.slot[Number(t.dataset.i)] = { data: await kecilkan(t.files[0]) }; gambarSlot(); msg(''); } catch (er) { msg(er.message); } }
    });
    document.body.appendChild(w); gambarSlot();
    $('mp2105FOk').onclick = async () => {
      const r = UF.rows.find(x => x.id === UF.id), b = $('mp2105FOk'), alasan = S($('mp2105Alasan').value);
      if (!UF.slot.some(Boolean)) { msg('Minimal 1 foto harus tetap ada.'); return; }
      if (!UF.slot.some(z => z && z.data) && UF.slot.map(z => z ? (z.ref.idServer || z.ref.id) : '').join('|') === sidikFoto(r)) { msg('Belum ada foto yang diubah.'); return; }
      if (alasan.length < 8) { msg('Isi alasan perubahan foto (min. 8 karakter).'); $('mp2105Alasan').focus(); return; }
      b.disabled = true; UF.sibuk = true;
      try {
        const foto = [];
        for (let i = 0; i < 4; i++) {
          const z = UF.slot[i]; if (!z) { foto.push(null); continue; }
          if (!z.data) { foto.push(z.ref); continue; }
          msg('Mengunggah foto ' + SISI[i] + '…');
          const u = await window.regAksi('gudangUnggahFoto', { berkas: { id: 'uf' + Date.now().toString(36) + i, data: z.data.split(',')[1], nama: SISI[i].replace(/\s+/g, '-') + '.jpg', jenis: 'FOTO-GR', ket: S(r.noSJ) + ' · item ' + (Number(r.bonIdx) + 1) + ' · ' + SISI[i] + ' · ubah foto', __tgl: S(r.tanggal) } });
          if (!u || !u.data || !u.data.idServer) throw new Error('Foto ' + SISI[i] + ' belum tersimpan di server.');
          foto.push(u.data);
        }
        msg('Menyimpan…');
        const res = await window.regAksi('gudangUbahFoto', { data: { id: r.id, versi: r.versi, foto, alasan, seKiriman: !!($('mp2105Sek') && $('mp2105Sek').checked) } });
        UF.sibuk = false; w.remove();
        kabar('Foto penerimaan ' + r.uraian + ' diperbarui' + (res && res.data && res.data.length > 1 ? ' (' + res.data.length + ' item)' : '') + '.', 'ok');
        await muatUlang();
      } catch (er) { UF.sibuk = false; b.disabled = false; msg(/KONFLIK/.test(er.message) ? er.message + ' Tutup dialog, lalu buka lagi.' : er.message); }
    };
  };

  /* ---------- pemasangan ---------- */
  let _t = 0;
  const jalan = () => {
    _t = 0;
    try { if (tanpaGanda() && typeof window.mp223Render === 'function') window.mp223Render(); } catch (e) { }
    try {
      pita();
      const D = window.MP223, buka = ['gdmasuk', 'gdharian', 'gdkartu'].some(n => { const el = $('tab-' + n); return el && el.offsetParent !== null; });
      if (buka && D && D.siap && !D.muat) audit(false);
    } catch (e) { }
  };
  const tunda = () => { if (!_t) _t = setTimeout(jalan, 350); };
  if (document.body) new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }));
  tunda();
})();
