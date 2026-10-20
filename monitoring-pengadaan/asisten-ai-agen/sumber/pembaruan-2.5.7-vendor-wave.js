/* MP256 — PEMBARUAN 2.5.6 / 2.5.7 — DATA VENDOR WAVE (pelengkap vendor yang sudah ada) (butuh Modul server 1.8.5 · fitur "vendorWave")
 *  Sumber: wave.waskita.co.id › Rekanan Waskita › Master Data › EXPORT ALL DATA TO EXCEL (.xls).
 *  Prinsip: Master Data baku & master tambahan TIDAK diganti. Data WAVE disimpan terpisah di server dan dipakai untuk
 *   (1) melengkapi kolom yang KOSONG (alamat, NPWP, telepon, email, PIC, kota) di Master Data › Vendor, profil BA & pencarian vendor PBJ;
 *   (2) memperingatkan vendor berstatus Blacklist.
 *  [2.5.7] TIDAK menambah data baru: vendor WAVE yang belum ada di master TIDAK dimasukkan ke daftar/pencarian dan tidak dapat ditambahkan;
 *          WAVE hanya melengkapi kolom kosong vendor yang SUDAH ADA (tampilan & Simpan pelengkap ke master tambahan).
 *  Master Data › Vendor: panel "Data Vendor WAVE" — Impor (Admin), Analisis kekurangan, Cari di WAVE, Simpan pelengkap ke master tambahan (Admin, hanya kolom kosong).
 */
(function () {
  'use strict';
  if (window.__MP256__) return; window.__MP256__ = true;
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const adm = () => !!(sesi() && sesi().admin);
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const aktif = () => !!(sesi() && typeof REG !== 'undefined' && REG.url && srv('vendorWave'));
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const tglJam = s => { const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const angka = n => N(n).toLocaleString('id-ID');
  const WV = { rows: null, versi: '', info: null, map: null, muat: null, analisis: null, cari: '', hasil: [] };
  window.MP256_WV = WV;
  const KOLOM = { 'ID VENDOR': 'id', 'BP NUMBER': 'bp', 'KUALIFIKASI PERUSAHAAN': 'kual', 'NAMA VENDOR': 'nama', 'STATUS REKANAN': 'status', 'BIDANG USAHA': 'bidang', 'CQSMS VENDOR': 'cqsms',
    'EMAIL VENDOR': 'email', 'NOMOR TELEPON': 'telp', 'ALAMAT': 'alamat', 'NEGARA': 'negara', 'PROVINSI': 'prov', 'SKN VENDOR': 'skn', 'NPWP VENDOR': 'npwp', 'INDUSTRY KEY': 'industri',
    'PB-04': 'pb04', 'NILAI RATA-RATA PB06': 'pb06', 'STATUS USER': 'statusUser', 'NAMA PIC': 'pic', 'ASAL VENDOR': 'asal' };
  const kunci = n => String(n || '').toLowerCase().replace(/&/g, ' dan ').replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(pt|cv|tbk|persero|ud|fa|firma|koperasi|kso|perum|perseroan|terbatas)\b/g, ' ').replace(/\s+/g, '').trim();
  const digit = v => String(v || '').replace(/\D/g, '');
  const hitam = r => /blacklist/i.test(r.status || '');
  const LS = 'mp256Wave_v1';

  /* ---------- muat daftar WAVE (di-cache per versi impor) ---------- */
  function pasangRows(d) {
    const K = d.kolom || [], ST = d.status || [];
    WV.rows = (d.data || []).map(a => { const o = {}; K.forEach((k, i) => { o[k] = k === 'status' ? (ST[a[i]] || '') : a[i] || ''; }); return o; });
    WV.versi = d.versi || ''; WV.map = null;
  }
  async function muat(paksa) {
    if (!aktif()) return null;
    if (WV.muat) return WV.muat;
    WV.muat = (async () => {
      let c = null; if (!paksa) { try { c = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { c = null; } }
      try {
        const r = await regAksi('wvDaftar', { data: { versi: c && c.versi || '' } });
        if (r.sama && c) pasangRows(c); else { pasangRows(r); try { localStorage.setItem(LS, JSON.stringify({ versi: r.versi, kolom: r.kolom, status: r.status, data: r.data })); } catch (e) { } }
      } catch (e) { if (c) pasangRows(c); else WV.rows = WV.rows || []; }
      sisip(); return WV.rows;
    })();
    try { return await WV.muat; } finally { WV.muat = null; }
  }
  function indeks() {
    if (WV.map || !WV.rows) return WV.map;
    const bp = {}, np = {}, nm = {}, id = {};
    WV.rows.forEach(r => { if (r.bp) bp[r.bp] = bp[r.bp] || r; const d = digit(r.npwp); if (d.length >= 15 && !/^0+$/.test(d)) np[d] = np[d] || r; const k = kunci(r.nama); if (k) (nm[k] = nm[k] || []).push(r); id[r.id] = r; });
    return (WV.map = { bp, np, nm, id });
  }
  /* cocokkan satu vendor aplikasi → baris WAVE: BP (= kode SAP) › NPWP › nama (unik) */
  function cocok(v) {
    const M = indeks(); if (!M) return null; v = v || {};
    const kode = String(v.id || v.kodeSAP || '').trim(); if (kode && M.bp[kode]) return { r: M.bp[kode], cara: 'BP Number' };
    if (/^WV-/.test(kode) && M.id[kode.slice(3)]) return { r: M.id[kode.slice(3)], cara: 'ID Vendor' };
    const d = digit(v.npwp); if (d.length >= 15 && M.np[d]) return { r: M.np[d], cara: 'NPWP' };
    const L = M.nm[kunci(v.name || v.nama)]; if (L && L.length === 1) return { r: L[0], cara: 'Nama' };
    if (L && L.length > 1) { const a = L.filter(x => !hitam(x) && x.statusUser !== 'Inactive'); if (a.length === 1) return { r: a[0], cara: 'Nama' }; }
    return null;
  }
  window.mp256Cocok = cocok;

  /* ---------- vendor WAVE yang belum ada → ikut di daftar vendor aplikasi (sumber WAVE) ---------- */
  function vendorAplikasi() { const ven = typeof MASTER_VENDORS !== 'undefined' ? MASTER_VENDORS : []; return ven.filter(x => x && !x._mp256); }
  function sisip() { buangSisip(); }   // [2.5.7] tidak menambah vendor baru
  function sisipLama() {
    const ven = typeof MASTER_VENDORS !== 'undefined' ? MASTER_VENDORS : null; if (!ven || !WV.rows || !WV.rows.length) return;
    if (ven.some(x => x && x._mp256)) return;
    const ada = new Set(); vendorAplikasi().forEach(v => { const c = cocok({ id: v.id, name: v.name }); if (c) ada.add(c.r.id); });
    let n = 0; WV.rows.forEach(r => { if (ada.has(r.id) || hitam(r) || r.statusUser === 'Inactive') return; ven.push({ id: r.bp || ('WV-' + r.id), name: r.nama, city: r.kota || r.prov || '', _mp214: true, _mp256: true, _wave: r.id }); n++; });
    WV.disisip = n;
    try { _idxVendor = null; } catch (e) { }
  }

  /* ---------- pelengkap: profil BA & pencarian vendor PBJ (hanya kolom kosong) ---------- */
  (function () {
    const asli = window.profilVendor;
    if (typeof asli === 'function') window.profilVendor = function (id, nama) {
      const p = asli.apply(this, arguments);
      try { const c = cocok({ id, name: nama || (p && p.namaVendor) }); if (c && p) { if (!p.alamat && c.r.alamat) p.alamat = c.r.alamat; p.wave = { status: c.r.status, id: c.r.id, pic: c.r.pic, npwp: c.r.npwp, telp: c.r.telp, email: c.r.email }; p.lengkap = !!(p.nama && p.alamat); } } catch (e) { }
      return p;
    };
    const pasangPbj = () => {
      const H = window.__PBJ_HOST; if (!H || typeof H.cariVendor !== 'function' || H.cariVendor._mp256) return;
      const asliC = H.cariVendor;
      H.cariVendor = function (q) {
        let out = asliC.apply(this, arguments) || [];
        try {
          if (!WV.rows) return out;
          out = out.map(o => { const c = cocok({ id: o.id, name: o.nama, npwp: o.npwp }); if (!c) return o; const r = c.r;
            return Object.assign({}, o, { alamat: o.alamat || r.alamat, email: o.email || r.email, telp: o.telp || r.telp, npwp: o.npwp || r.npwp, sumber: o.sumber + (hitam(r) ? ' · ⚠ BLACKLIST WAVE' : ' · WAVE ' + r.status) }); });
          const t = String(q || '').toLowerCase().trim(); if (false && t.length >= 2 && out.length < 25) {   // [2.5.7] tidak menambah vendor baru
            const sudah = new Set(out.map(o => kunci(o.nama)));
            for (let i = 0; i < WV.rows.length && out.length < 25; i++) { const r = WV.rows[i]; if (sudah.has(kunci(r.nama))) continue;
              if ((r.nama + ' ' + r.bp + ' ' + r.npwp + ' ' + r.kota).toLowerCase().includes(t)) { sudah.add(kunci(r.nama));
                out.push({ nama: r.nama, id: r.bp || ('WV-' + r.id), alamat: r.alamat, pimpinan: '', jabatan: 'Direktur', email: r.email, telp: r.telp, npwp: r.npwp, sumber: hitam(r) ? 'WAVE · ⚠ BLACKLIST' : 'WAVE · ' + r.status }); } }
          }
        } catch (e) { }
        return out;
      };
      H.cariVendor._mp256 = true;
    };
    pasangPbj(); setInterval(pasangPbj, 3000);
  })();

  /* ---------- impor file ekspor WAVE ---------- */
  function bacaXls(teks) {
    const doc = new DOMParser().parseFromString(teks, 'text/html'), T = doc.querySelector('table'); if (!T) throw new Error('Tabel tidak ditemukan. Gunakan file dari tombol "EXPORT ALL DATA TO EXCEL" di WAVE.');
    const tr = [...T.querySelectorAll('tr')], hdr = [...tr[0].children].map(c => c.textContent.trim().toUpperCase()), map = hdr.map(h => KOLOM[h] || '');
    if (map.indexOf('id') < 0 || map.indexOf('nama') < 0) throw new Error('Kolom "ID VENDOR" / "NAMA VENDOR" tidak ditemukan — bukan file Master Data WAVE.');
    return tr.slice(1).map(r => { const o = {}; [...r.children].forEach((c, i) => { if (map[i]) o[map[i]] = c.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim(); }); return o; })
      .filter(o => o.id && o.nama);
  }
  window.mp256Impor = async file => {
    if (!file || !adm()) return;
    const el = document.getElementById('mp256Isi'); const kabar = t => { if (el) el.innerHTML = `<div class="mp256-proses"><i class="fas fa-spinner fa-spin me-2"></i>${E(t)}</div>`; };
    try {
      kabar('Membaca ' + file.name + '…');
      const L = bacaXls(await file.text()); if (!L.length) throw new Error('Tidak ada baris vendor di file.');
      const P = 700, n = Math.ceil(L.length / P), tot = { baru: 0, diperbarui: 0, sama: 0, dilewati: 0 }, hitamBaru = [];
      for (let i = 0; i < n; i++) {
        kabar('Mengirim ke server: ' + Math.min((i + 1) * P, L.length) + ' / ' + L.length + ' vendor…');
        const akhir = i === n - 1, r = await regAksi('wvImpor', { data: { baris: L.slice(i * P, (i + 1) * P), bagian: i + 1, dari: n, berkas: file.name, akhir, ringkas: akhir ? Object.assign({}, tot) : undefined } });
        ['baru', 'diperbarui', 'sama', 'dilewati'].forEach(k => { tot[k] += N(r[k]); }); hitamBaru.push(...(r.jadiBlacklist || []));
      }
      pesan('Data vendor WAVE diimpor: ' + angka(L.length) + ' baris · baru ' + angka(tot.baru) + ' · diperbarui ' + angka(tot.diperbarui) + ' · sama ' + angka(tot.sama) + (hitamBaru.length ? ' · ⚠ ' + hitamBaru.length + ' vendor kini Blacklist' : '') + '. Master Data lama tidak diubah.', hitamBaru.length ? 'err' : 'ok');
      buangSisip(); WV.info = null; await muat(true); WV.analisis = null; await window.mp256Analisis();
    } catch (err) { pesan('Impor WAVE gagal: ' + err.message, 'err'); gambar(); }
  };
  function buangSisip() { const ven = typeof MASTER_VENDORS !== 'undefined' ? MASTER_VENDORS : null; if (!ven || !ven.some(x => x && x._mp256)) return; for (let i = ven.length - 1; i >= 0; i--) if (ven[i] && ven[i]._mp256) ven.splice(i, 1); try { _idxVendor = null; } catch (e) { } }

  /* ---------- analisis kekurangan master vendor ---------- */
  const DETAIL = [['alamat', 'alamat', 'Alamat'], ['npwp', 'npwp', 'NPWP'], ['telp', 'telp', 'Telepon'], ['email', 'email', 'Email'], ['kota', 'kota', 'Kota'], ['pic', 'pimpinan', 'PIC'], ['bp', 'kodeSAP', 'BP Number']];
  async function masterTambahan() { try { const r = await regAksi('bacaMasterTambahan', {}); return (r.data || []).filter(m => m.jenis === 'VENDOR'); } catch (e) { return []; } }
  const detailM = m => (m && m.detail && typeof m.detail === 'object') ? m.detail : {};
  window.mp256Analisis = async () => {
    await muat(); if (!WV.rows) return;
    const el = document.getElementById('mp256Isi'); if (el) el.innerHTML = '<div class="mp256-proses"><i class="fas fa-spinner fa-spin me-2"></i>Mencocokkan master vendor aplikasi dengan data WAVE…</div>';
    const tamb = await masterTambahan(), baku = vendorAplikasi().filter(v => !v._mp214), hasil = [], pakaiWave = new Set();
    const cek = (v, jenis, d, m) => { const c = cocok(v); if (!c) { hasil.push({ jenis, nama: v.name || v.nama, kode: v.id, c: null, isi: [] }); return; }
      pakaiWave.add(c.r.id); const isi = DETAIL.filter(f => c.r[f[0]] && !(d && d[f[1]]) && !(f[0] === 'kota' && v.city)).map(f => f[2]);
      hasil.push({ jenis, nama: v.name || v.nama, kode: v.id, c, isi, m, hitam: hitam(c.r) }); };
    baku.forEach(v => cek(v, 'Baku', { kota: v.city }, null));
    tamb.forEach(m => { const d = detailM(m); cek({ id: d.kodeSAP || m.kode, name: m.nama, npwp: d.npwp, city: d.kota }, 'Tambahan', d, m); });
    WV.analisis = { hasil, total: hasil.length, cocok: hasil.filter(h => h.c).length, hitam: hasil.filter(h => h.hitam), bisa: hasil.filter(h => h.isi.length).length,
      bisaTamb: hasil.filter(h => h.jenis === 'Tambahan' && h.isi.length && !h.hitam).length, baruWave: WV.rows.filter(r => !pakaiWave.has(r.id) && !hitam(r) && r.statusUser !== 'Inactive').length };
    gambar();
  };
  window.mp256SimpanPelengkap = async () => {
    const A = WV.analisis; if (!A || !adm()) return;
    const L = A.hasil.filter(h => h.jenis === 'Tambahan' && h.isi.length && !h.hitam && h.m); if (!L.length) return;
    if (!confirm('Lengkapi ' + L.length + ' vendor master tambahan dari WAVE?\nHanya kolom yang KOSONG yang diisi; data yang sudah ada tidak diubah.')) return;
    let ok = 0, gagal = 0;
    for (const h of L) {
      const m = h.m, d = Object.assign({}, detailM(m)), r = h.c.r;
      const bakuId = new Set(vendorAplikasi().filter(v => !v._mp214).map(v => String(v.id)));
      DETAIL.forEach(f => { if (r[f[0]] && !d[f[1]] && !(f[1] === 'kodeSAP' && bakuId.has(String(r[f[0]])))) d[f[1]] = r[f[0]]; });
      if (!d.catatan) d.catatan = 'Dilengkapi dari WAVE (ID Vendor ' + r.id + ' · ' + r.status + ')';
      try { await regAksi('simpanMasterTambahan', { data: { id: m.id, versi: m.versi, jenis: 'VENDOR', kode: m.kode, nama: m.nama, satuan: m.satuan || '', keterangan: m.keterangan || '', detail: d, aktif: m.aktif !== false } }); ok++; }
      catch (e) { gagal++; console.warn('[2.5.6] pelengkap', m.kode, e); }
    }
    pesan('Master tambahan dilengkapi dari WAVE: ' + ok + ' vendor' + (gagal ? ', ' + gagal + ' gagal (muat ulang lalu coba lagi)' : '') + '.', gagal ? 'err' : 'ok');
    if (typeof window.muatTambahan214 === 'function') try { window.muatTambahan214(true); } catch (e) { }
    WV.analisis = null; await window.mp256Analisis();
  };
  window.mp256TambahMaster = async idw => {
    pesan('Menambah vendor baru dari WAVE dinonaktifkan — WAVE hanya melengkapi vendor yang sudah ada.', 'err'); return;   // [2.5.7]
    const r = WV.rows && WV.rows.find(x => x.id === idw); if (!r || !adm()) return;
    if (cocok({ id: r.bp, name: r.nama, npwp: r.npwp }) && vendorAplikasi().some(v => { const c = cocok({ id: v.id, name: v.name }); return c && c.r.id === r.id; })) { pesan('Vendor ini sudah ada di master aplikasi.', 'err'); return; }
    const d = { kodeSAP: r.bp || '', npwp: r.npwp, alamat: r.alamat, kota: r.kota, telp: r.telp, email: r.email, pimpinan: r.pic, grup: r.kual, kategori: r.bidang, catatan: 'Dari WAVE (ID Vendor ' + r.id + ' · ' + r.status + ')' };
    Object.keys(d).forEach(k => { if (!d[k]) delete d[k]; });
    try { await regAksi('simpanMasterTambahan', { data: { jenis: 'VENDOR', kode: 'CUST-WV-' + r.id, nama: r.nama.slice(0, 200), satuan: '', detail: d } }); pesan(r.nama + ' ditambahkan ke Master Data (tambahan).', 'ok');
      if (typeof window.muatTambahan214 === 'function') try { window.muatTambahan214(true); } catch (e) { } }
    catch (e) { pesan('Gagal menambah: ' + e.message, 'err'); }
  };

  /* ---------- panel di Master Data › Vendor ---------- */
  const lencana = s => `<span class="mp256-st ${/blacklist/i.test(s) ? 'hitam' : /terseleksi|terdaftar/i.test(s) ? 'ok' : ''}">${E(s || '-')}</span>`;
  function gambar() {
    const el = document.getElementById('mp256Isi'); if (!el) return;
    const I = WV.info, A = WV.analisis;
    let h = '';
    if (A) {
      h += `<div class="mp256-kotak">${[['Vendor aplikasi', A.total], ['Cocok dengan WAVE', A.cocok], ['Dapat dilengkapi', A.bisa], ['⚠ Blacklist di WAVE', A.hitam.length]].map(k => `<div><b>${angka(k[1])}</b><span>${E(k[0])}</span></div>`).join('')}</div>`;
      if (A.hitam.length) h += `<div class="alert alert-danger py-2 small"><b>⚠ ${A.hitam.length} vendor di master aplikasi berstatus BLACKLIST di WAVE:</b> ${A.hitam.slice(0, 15).map(x => E(x.nama)).join(', ')}${A.hitam.length > 15 ? ', …' : ''}. Hindari pemakaian untuk kontrak/PBJ baru.</div>`;
      if (adm() && A.bisaTamb) h += `<div class="d-flex gap-2 align-items-center mb-2"><button type="button" class="btn btn-sm btn-primary" onclick="mp256SimpanPelengkap()"><i class="fas fa-floppy-disk me-1"></i>Simpan pelengkap ke Master Tambahan (${A.bisaTamb})</button><small class="text-muted">Hanya kolom yang kosong; vendor baku dilengkapi otomatis saat dipakai (tanpa mengubah master baku).</small></div>`;
      const L = A.hasil.filter(x => x.isi.length || x.hitam).slice(0, 60);
      h += L.length ? `<div class="mp219-tw"><table class="mp219-tb mp219-tb-s mp256-tb"><thead><tr><th>Vendor aplikasi</th><th>Cocok WAVE</th><th>Status WAVE</th><th>Kolom kosong yang dilengkapi</th></tr></thead><tbody>${L.map(x => `<tr><td><b>${E(x.nama)}</b><div class="sub">${E(x.jenis)} · ${E(x.kode || '-')}</div></td>
          <td>${E(x.c.r.nama)}<div class="sub">via ${E(x.c.cara)} · BP ${E(x.c.r.bp || '-')}</div></td><td>${lencana(x.c.r.status)}</td><td class="small">${E(x.isi.join(', ') || '—')}</td></tr>`).join('')}</tbody></table></div>
          <p class="mp256-cat">${A.hasil.filter(x => x.isi.length || x.hitam).length > 60 ? 'Menampilkan 60 dari ' + A.hasil.filter(x => x.isi.length || x.hitam).length + '. ' : ''}${A.total - A.cocok} vendor aplikasi tidak ditemukan di WAVE (kode/nama berbeda) — tetap seperti semula.</p>` : '<p class="mp256-cat">Tidak ada kolom kosong yang perlu dilengkapi.</p>';
    }
    h += `<div class="d-flex gap-2 align-items-center mt-2"><input type="search" class="form-control form-control-sm" id="mp256Q" placeholder="Cek di WAVE (referensi): nama, BP, NPWP, kota…" value="${E(WV.cari)}" oninput="mp256Cari(this.value)" style="max-width:340px"><small class="text-muted">${WV.rows ? angka(WV.rows.length) + ' vendor WAVE' : ''}</small></div><div id="mp256Hasil">${hasilCari()}</div>`;
    el.innerHTML = h;
    try { kayakan(); } catch (e) { }
  }
  function hasilCari() {
    const t = WV.cari.toLowerCase().trim(); if (t.length < 2 || !WV.rows) return '';
    const L = WV.rows.filter(r => (r.nama + ' ' + r.bp + ' ' + r.npwp + ' ' + r.kota + ' ' + r.id).toLowerCase().includes(t)).slice(0, 40);
    return L.length ? `<div class="mp219-tw mt-2"><table class="mp219-tb mp219-tb-s mp256-tb"><thead><tr><th>Vendor WAVE</th><th>Status</th><th>NPWP / Kontak</th><th>Alamat</th><th></th></tr></thead><tbody>${L.map(r => {
      const ada = vendorAplikasi().some(v => { const c = cocok({ id: v.id, name: v.name }); return c && c.r.id === r.id; });
      return `<tr><td><b>${E(r.nama)}</b><div class="sub">ID ${E(r.id)} · BP ${E(r.bp || '-')} · ${E(r.kual)}</div><div class="sub">${E(r.bidang)}</div></td><td>${lencana(r.status)}${r.statusUser === 'Inactive' ? '<div class="sub">user Inactive</div>' : ''}</td>
        <td class="small">${E(r.npwp || '-')}<div class="sub">${E([r.telp, r.email].filter(Boolean).join(' · '))}</div>${r.pic ? `<div class="sub">PIC: ${E(r.pic)}</div>` : ''}</td><td class="small">${E(r.alamat || r.kota || '-')}</td>
        <td class="text-nowrap">${ada ? '<span class="sub">sudah di master</span>' : '<span class="sub">tidak ada di master</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="mp256-cat">Tidak ditemukan.</p>';
  }
  window.mp256Cari = v => { WV.cari = v; const h = document.getElementById('mp256Hasil'); if (h) h.innerHTML = hasilCari(); };
  async function panel() {
    const md = document.getElementById('mdIsi'); if (!md || !aktif() || !window.MD214 || window.MD214.jenis !== 'VENDOR') return;
    if (!md.querySelector('#mp256Panel')) {
      md.insertAdjacentHTML('afterbegin', `<section id="mp256Panel" class="mp256-panel"><header><div><b><i class="fas fa-cloud-arrow-down me-1"></i>Data Vendor WAVE</b><span id="mp256Info">memuat…</span></div>
        <div class="d-flex gap-2 flex-wrap">${adm() ? `<input type="file" id="mp256File" accept=".xls,.html,.htm" hidden onchange="mp256Impor(this.files[0]);this.value=''"><button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('mp256File').click()"><i class="fas fa-file-import me-1"></i>Impor file WAVE (.xls)</button>` : ''}
        <button type="button" class="btn btn-sm mp219-btn-o" onclick="mp256Analisis()"><i class="fas fa-magnifying-glass-chart me-1"></i>Analisis kekurangan</button></div></header><div id="mp256Isi"></div></section>`);
      gambar();
      if (!WV.info) { try { WV.info = await regAksi('wvInfo'); } catch (e) { WV.info = { galat: e.message }; } }
      await muat();
      const i = document.getElementById('mp256Info'), I = WV.info || {};
      if (i) i.innerHTML = I.galat ? E(I.galat) : I.meta ? `${angka(I.jumlah)} vendor · impor ${E(tglJam(I.meta.pada))} oleh ${E(I.meta.oleh)}${I.status && I.status.Blacklist ? ' · <b class="text-danger">' + angka(I.status.Blacklist) + ' Blacklist</b>' : ''}` : 'Belum ada data. ' + (adm() ? 'Unduh dari WAVE › Rekanan Waskita › Master Data › EXPORT ALL DATA TO EXCEL, lalu impor di sini.' : 'Minta Admin mengimpor file ekspor WAVE.');
      gambar(); kayakan();
    }
  }
  /* baris vendor baku di tabel Master Data: tampilkan kontak/kota/status dari WAVE bila kosong (tampilan saja) */
  function kayakan() {
    const md = document.getElementById('mdIsi'); if (!md || !WV.rows || !window.MD214 || window.MD214.jenis !== 'VENDOR') return;
    md.querySelectorAll('table tbody tr').forEach(tr => {
      if (tr.closest('#mp256Panel') || tr.cells.length < 5 || tr.dataset.mp256 === (WV.versi || '-')) return; tr.dataset.mp256 = WV.versi || '-';
      const kode = (tr.cells[0].querySelector('code') || {}).textContent || '', nama = (tr.cells[1].childNodes[0] || {}).textContent || '';
      const c = cocok({ id: kode.trim(), name: nama.trim() }); if (!c) return; const r = c.r;
      if (tr.cells[2].textContent.trim() === '-' && (r.telp || r.email)) tr.cells[2].innerHTML = `<span class="mp256-w">${E(r.telp || r.email)}</span>`;
      if (!tr.cells[3].textContent.trim() && (r.kota || r.alamat)) tr.cells[3].innerHTML = `<span class="mp256-w">${E([r.kota, r.alamat].filter(Boolean).join(' · ').slice(0, 160))}</span>`;
      const lama = tr.cells[4].querySelector('.mp256-lc'); if (lama) lama.remove(); tr.cells[4].insertAdjacentHTML('beforeend', `<div class="mp256-lc">${lencana('WAVE · ' + r.status)}</div>`);
    });
  }
  let _t = 0; const jalan = () => { clearTimeout(_t); _t = setTimeout(() => { try { panel(); kayakan(); sisip(); } catch (e) { console.warn('[2.5.6] WAVE', e); } }, 200); };
  const obs = () => { if (!document.body) return; new MutationObserver(jalan).observe(document.body, { childList: true, subtree: true }); jalan(); };
  if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
  setTimeout(() => { if (aktif()) muat(); }, 3000);
  (function () {
    const kl = window.keluarLogin;
    if (typeof kl === 'function') window.keluarLogin = function () { WV.info = null; WV.analisis = null; return kl.apply(this, arguments); };
    const cmd = window.itemCmdk;
    if (typeof cmd === 'function') window.itemCmdk = function (q) {
      const out = cmd.apply(this, arguments) || [], t = String(q || '').trim().toLowerCase();
      try { if (aktif() && t.length >= 2 && (/wave|vendor waskita|rekanan/.test(t) || 'data vendor wave'.indexOf(t) >= 0))
        out.unshift({ grup: 'Master Data', ik: 'fa-cloud-arrow-down', l: 'Data Vendor WAVE — impor, analisis kekurangan, cari', s: 'Master Data › Vendor', aksi: () => { if (window.MD214) window.MD214.jenis = 'VENDOR'; if (typeof window.bukaTab === 'function') window.bukaTab('masterdata'); else if (typeof window.showTab === 'function') window.showTab('masterdata'); } }); } catch (e) { }
      return out;
    };
  })();
})();
