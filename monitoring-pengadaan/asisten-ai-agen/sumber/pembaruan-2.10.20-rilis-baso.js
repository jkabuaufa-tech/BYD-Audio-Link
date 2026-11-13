/* MP21020 — KONTROL RELEASE / UNRELEASE (SOP SAP HANA) · PREVIEW PO & PROGRES · BASO & BASTA PER ALAT (2.10.20; Modul server 1.10.18 · fitur "sapRelease", "basoBasta")
 *  1. Register Kontrak — alur berjenjang: Staf Pengadaan membuat kontrak/PO (Draf) lalu "Ajukan"; Admin "Release" (= posting);
 *     koreksi sesudah release hanya lewat "Unrelease" Admin beralasan min. 12 karakter. Label status SAP per baris
 *     (Draf · Diajukan · Released · Unrelease-revisi). Tombol Posting bawaan dinonaktifkan untuk selain Admin.
 *  2. Preview PO: tombol di samping chip "PO TTD" (Register maupun Master) — pratinjau cetak PO/kontrak dari data yang tersimpan
 *     (identitas, vendor, item, WBS, nilai DPP, status release); kontrak yang belum direlease bertanda DRAF.
 *  3. Preview Progres: tombol di samping tautan BA (BAPM / BAPP / BAPA) di Form Input Progres — rincian volume s/d lalu, periode ini,
 *     s/d kini & nilai per item; dari jendela yang sama dapat membuka Preview BA dan format Excel baku.
 *  4. Gudang › BASO & BASTA Alat: Berita Acara Alat Siap Operasi + Berita Acara Serah Terima Alat, 1 dokumen per unit alat per SPSA
 *     (1 SPSA berisi 2 alat → 2 dokumen). Tanggal otomatis = tanggal SPSA; Pihak Pertama Kepala Proyek, Pihak Kedua Direktur penyedia alat;
 *     isian lapangan: merk/type, no. mesin, no. rangka, bahan bakar, tahun, no. polisi, perlengkapan, foto 3 sisi (depan, belakang, samping).
 *  Catatan menu: "Form Input Kontrak" & "Lacak Alur" sudah dilebur ke Register Kontrak sejak 2.7.2 / 2.8.1 (tidak ada perubahan). */
(function () {
  'use strict';
  if (window.__MP21020__) return; window.__MP21020__ = true;
  const VERSI = '2.10.20';
  const $ = id => document.getElementById(id);
  const S = v => String(v == null ? '' : v).trim();
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const J = v => E(JSON.stringify(v));
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const admin = () => { const s = sesi(); return !!(s && s.admin); };
  const pengadaan = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN')); };
  const bolehGudang = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN' || s.gudang)); };
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  const aksi = (a, x) => (typeof window.regAksi === 'function' ? window.regAksi(a, x || {}) : Promise.reject(new Error('Koneksi server belum siap. Muat ulang halaman.')));
  const regData = () => { try { return (typeof REG !== 'undefined' && REG && REG.data) || []; } catch (e) { return []; } };
  const progData = () => { try { return (typeof PROG !== 'undefined' && PROG && PROG.data) || []; } catch (e) { return []; } };
  const ringkasan = () => { try { return (typeof RINGKASAN !== 'undefined' && RINGKASAN) || []; } catch (e) { return []; } };
  const proyek = () => { try { return (typeof PROYEK !== 'undefined' && PROYEK) || {}; } catch (e) { return {}; } };
  const rp = v => Math.round(N(v)).toLocaleString('id-ID');
  const ang = v => (Math.round(N(v) * 1000) / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 });
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const iso = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; };
  const tglPanjang = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? Number(m[3]) + ' ' + BULAN[+m[2] - 1] + ' ' + m[1] : '-'; };
  const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function terbilang(n) {
    n = Math.floor(N(n)); if (n <= 0) return 'nol';
    if (n < 12) return SATUAN[n]; if (n < 20) return terbilang(n - 10) + ' belas';
    if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
    if (n < 200) return 'seratus' + (n - 100 ? ' ' + terbilang(n - 100) : '');
    if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
    if (n < 2000) return 'seribu' + (n - 1000 ? ' ' + terbilang(n - 1000) : '');
    return terbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
  }
  const judulKata = t => S(t).replace(/(^|\s)([a-z])/g, (s, a, b) => a + b.toUpperCase());
  function tanggalNarasi(t) {   // { hari, tanggal, bulan, tahun, angka } — "Minggu", "Tiga Puluh", "Agustus", "Dua Ribu Dua Puluh Enam", "(30/08/2026)"
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return { hari: HARI[d.getUTCDay()], tanggal: judulKata(terbilang(+m[3])), bulan: BULAN[+m[2] - 1], tahun: judulKata(terbilang(+m[1])), angka: '(' + m[3] + '/' + m[2] + '/' + m[1] + ')' };
  }
  window.mp21020Terbilang = terbilang; window.mp21020TanggalNarasi = tanggalNarasi;

  function kabar(teks, jenis) {
    try { if (typeof notif === 'function') notif(teks, jenis === 'ok' ? 'ok' : jenis || ''); } catch (e) { }
    try {
      let p = $('mp21020Pita'); if (!p) { p = document.createElement('div'); p.id = 'mp21020Pita'; document.body.appendChild(p); }
      p.className = 'mp21020-pita ' + (jenis === 'ok' ? 'ok' : 'err'); p.textContent = teks;
      clearTimeout(kabar._t); kabar._t = setTimeout(() => { try { p.remove(); } catch (e) { } }, jenis === 'ok' ? 5000 : 12000);
    } catch (e) { }
  }
  function dialog(judul, rinci, o) {   // o.alasan → teks alasan (≥ 12 karakter) atau ''; tanpa o.alasan → true / false
    o = o || {};
    return new Promise(selesai => {
      const lama = $('mp21020Dlg'); if (lama) lama.remove();
      const w = document.createElement('div'); w.id = 'mp21020Dlg'; w.className = 'mp273-modal mp21020-dlg';
      w.innerHTML = `<div class="mp273-kotak" role="dialog" aria-modal="true" aria-label="${E(judul)}"><div class="mp273-kepala"><b>${E(judul)}</b><button type="button" class="btn-close" data-tidak aria-label="Tutup"></button></div>
        <div class="mp273-isi"><div class="mp21020-rinci">${E(rinci)}</div>
        ${o.alasan ? `<label class="small fw-semibold mt-2" for="mp21020Als">${E(o.labelAlasan || 'Alasan (min. 12 karakter)')}</label><textarea id="mp21020Als" class="form-control form-control-sm" rows="3" maxlength="500"></textarea><div class="small text-muted" id="mp21020Hit">0 / 12</div>` : ''}
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tidak>Tutup</button><button type="button" class="btn btn-sm ${o.bahaya ? 'btn-danger' : 'btn-primary'}" id="mp21020Ya">${E(o.ya || 'Ya')}</button></div></div></div>`;
      document.body.appendChild(w);
      const ta = w.querySelector('#mp21020Als'), ya = w.querySelector('#mp21020Ya'), hit = w.querySelector('#mp21020Hit');
      const tutup = v => { w.remove(); selesai(v); };
      const segar = () => { if (!ta) return; const n = ta.value.replace(/\s+/g, ' ').trim().length; hit.textContent = n + ' / 12'; ya.disabled = n < 12; };
      if (ta) { ta.addEventListener('input', segar); segar(); setTimeout(() => { try { ta.focus(); } catch (e) { } }, 30); }
      w.addEventListener('click', ev => { if (ev.target === w || ev.target.closest('[data-tidak]')) tutup(o.alasan ? '' : false); });
      ya.addEventListener('click', () => { if (ta && ta.value.replace(/\s+/g, ' ').trim().length < 12) return; tutup(o.alasan ? ta.value.replace(/\s+/g, ' ').trim() : true); });
    });
  }
  const segarRegister = async () => { try { if (typeof muatRegister === 'function') await muatRegister(); } catch (e) { } try { pasangRegister(); } catch (e) { } };   // label & tombol langsung mengikuti status baru
  function cetak(html, judul) {
    if (typeof window.mp224Cetak === 'function') return window.mp224Cetak(html, { judul: judul });
    const w = window.open('', '_blank'); if (!w) { kabar('Izinkan pop-up untuk menampilkan pratinjau.', 'err'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }
  function kso() {
    let k = {}; try { k = (window.mp2104KSO && window.mp2104KSO()) || {}; } catch (e) { }
    const K = (window.MP296 && window.MP296.kop) || {};
    return { nama: S(k.nama) || S(K.nama) || S(proyek().kso) || 'WASKITA - NINDYA, KSO', alamat: S(k.alamat), npwp: S(k.npwp), proyek: S(proyek().namaLengkap) || S(K.proyek), logo: (K.logo && K.logo[0]) || '' };
  }
  function vendor(id, nama) {
    let v = {}; try { v = (window.mp2104Vendor && window.mp2104Vendor(id, nama)) || {}; } catch (e) { }
    return { nama: S(nama) || S(v.nama), direktur: S(v.direktur), jabatan: S(v.jabatan) || 'Direktur', alamat: S(v.alamat), npwp: S(v.npwp) };
  }
  const CSS_DOK = `@page{size:A4 portrait;margin:15mm 16mm}*{box-sizing:border-box}body{margin:0;font:10.5pt/1.45 Arial,Helvetica,sans-serif;color:#111}
.hal{page-break-after:always;break-after:page;position:relative}.hal:last-child{page-break-after:auto;break-after:auto}
.kop{display:flex;align-items:center;gap:12px;border-bottom:2.5px solid #0b2a6b;padding-bottom:8px;margin-bottom:14px}.kop img{height:46px}
.kop .mp296-kt .nm{font-size:15pt;font-weight:800;color:#0b2a6b}.kop .mp296-kt .pr{font-size:8.5pt;font-weight:700}
h1{font-size:13pt;text-align:center;margin:0;text-decoration:underline}h2{font-size:11pt;text-align:center;margin:2px 0 14px;font-weight:700}
p{margin:0 0 8px;text-align:justify}table{border-collapse:collapse;width:100%}
.dt td{padding:2px 4px;vertical-align:top}.dt td.n{width:26px}.dt td.l{width:190px}.dt td.s{width:12px}
.tb th,.tb td{border:1px solid #333;padding:3px 5px;font-size:9pt;vertical-align:top}.tb th{background:#e8edf5;text-align:center}.r{text-align:right}.c{text-align:center}.b{font-weight:700}
.ttd{margin-top:26px;width:100%}.ttd td{width:50%;text-align:center;vertical-align:top;padding:0 10px}.ttd .ruang{height:74px}.ttd .nm{font-weight:700;text-decoration:underline}
.cap{position:absolute;top:38%;left:0;right:0;text-align:center;font-size:54pt;font-weight:800;color:rgba(180,35,24,.13);transform:rotate(-24deg);pointer-events:none;letter-spacing:4px}
.foto{display:grid;grid-template-columns:1fr 1fr;gap:10px}.foto figure{margin:0;border:1px solid #999;padding:6px;text-align:center}.foto img{max-width:100%;max-height:92mm;object-fit:contain}.foto figcaption{font-size:9pt;font-weight:700;margin-top:4px}.foto .kosong{height:60mm;display:flex;align-items:center;justify-content:center;color:#888;font-size:9pt}
.kecil{font-size:8.5pt;color:#444}`;
  const kopHtml = K => `<div class="kop">${K.logo ? `<img src="${E(K.logo)}" alt="">` : ''}<div class="mp296-kt"><div class="nm">${E(K.nama)}</div><div class="pr">${E(K.proyek)}</div></div></div>`;
  const bungkus = (judul, isi) => '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + E(judul) + '</title><style>' + CSS_DOK + '</style></head><body>' + isi + '</body></html>';

  /* ======================= 1. RELEASE / UNRELEASE ======================= */
  function statusRilis(r) {
    const rl = (r && r.rilis) || {};
    if (r && r.diposting) return { k: 'RELEASED', t: 'Released', ket: 'Direlease' + (S(r.dipostingOleh) ? ' ' + S(r.dipostingOleh) : '') + (iso(r.dipostingPada) ? ' · ' + tglPanjang(r.dipostingPada) : '') };
    if (rl.status === 'DIAJUKAN') return { k: 'DIAJUKAN', t: 'Diajukan', ket: 'Diajukan ' + S(rl.oleh) + ' · ' + tglPanjang(rl.pada) + ' — menunggu Release Admin' };
    if (rl.status === 'UNRELEASED') return { k: 'UNRELEASED', t: 'Unrelease · revisi', ket: 'Unrelease ' + S(rl.oleh) + ' · ' + tglPanjang(rl.pada) + ' — ' + S(rl.keterangan || r.alasanUnrelease) };
    return { k: 'DRAF', t: 'Draf', ket: 'Belum diajukan' };
  }
  window.mp21020StatusRilis = statusRilis;
  const cariReg = id => regData().find(x => x.id === id);
  async function jalankanRilis(fn, sukses) {
    try { kabar('Memproses…', 'ok'); await fn(); kabar(sukses, 'ok'); await segarRegister(); }
    catch (e) { kabar(String(e && e.message ? e.message : e), 'err'); if (/KONFLIK/.test(String(e && e.message))) await segarRegister(); }
  }
  window.mp21020Ajukan = async id => {
    const r = cariReg(id); if (!r) return kabar('Kontrak tidak ditemukan di Register. Muat ulang halaman.', 'err');
    if (!srv('sapRelease')) return kabar('Server belum melaporkan fitur "sapRelease". Pasang Modul server 1.10.18 (Admin › Modul server), lalu muat ulang.', 'err');
    const ya = await dialog('Ajukan kontrak / PO untuk Release?', r.noKontrak + '\n' + S(r.namaVendor) + ' · Rp ' + rp(r.nilai) + '\n\nSesudah diajukan, Admin memeriksa lalu melakukan Release. Koreksi sesudah Release hanya lewat Unrelease Admin.', { ya: 'Ajukan' });
    if (!ya) return;
    return jalankanRilis(() => aksi('kontrakAjukan', { id: id, versi: r.versi }), 'Kontrak ' + r.noKontrak + ' diajukan — menunggu Release Admin.');
  };
  window.mp21020Release = async id => {
    const r = cariReg(id); if (!r) return kabar('Kontrak tidak ditemukan di Register. Muat ulang halaman.', 'err');
    if (!admin()) return kabar('Hanya Admin yang berwenang melakukan Release (persetujuan) Kontrak/PO.', 'err');
    const st = statusRilis(r);
    const ya = await dialog('Release (setujui) kontrak / PO?', r.noKontrak + '\n' + S(r.namaVendor) + ' · Rp ' + rp(r.nilai) + ' · ' + (r.items || []).length + ' item\nStatus: ' + st.t + (st.k === 'DRAF' ? ' (belum diajukan staf)' : '') + '\n\nSesudah Release, data kontrak terkunci; koreksi hanya lewat Unrelease beralasan.', { ya: 'Release' });
    if (!ya) return;
    return jalankanRilis(() => aksi('posting', { id: id, versi: r.versi }), 'Kontrak ' + r.noKontrak + ' direlease.');
  };
  window.mp21020Unrelease = async id => {
    const r = cariReg(id); if (!r) return kabar('Kontrak tidak ditemukan di Register. Muat ulang halaman.', 'err');
    if (!admin()) return kabar('Hanya Admin yang dapat menjalankan Unrelease.', 'err');
    if (!srv('sapRelease')) return kabar('Server belum melaporkan fitur "sapRelease". Pasang Modul server 1.10.18 (Admin › Modul server), lalu muat ulang.', 'err');
    const alasan = await dialog('Unrelease (batalkan release) kontrak / PO?', r.noKontrak + '\n' + S(r.namaVendor) + ' · Rp ' + rp(r.nilai) + '\n\nKontrak kembali menjadi draf agar staf dapat mengoreksi, lalu diajukan & direlease ulang.\nDitolak bila sudah ada BK / tagihan, penerimaan gudang aktif, atau addendum di atasnya sudah direlease.', { alasan: true, labelAlasan: 'Alasan unrelease (min. 12 karakter)', ya: 'Unrelease', bahaya: true });
    if (!alasan) return;
    return jalankanRilis(() => aksi('kontrakUnrelease', { id: id, alasan: alasan, versi: r.versi }), 'Release kontrak ' + r.noKontrak + ' dibatalkan — staf dapat mengoreksi.');
  };
  function tombolRilis(r) {
    const st = statusRilis(r), id = J(r.id); let h = '';
    if (!srv('sapRelease')) return { st, h: '' };
    if (r.diposting) { if (admin()) h = `<button type="button" class="btn btn-sm btn-outline-warning mp21020-b" title="Unrelease: batalkan release agar staf dapat mengoreksi (Admin, alasan wajib)" onclick="event.stopPropagation(); mp21020Unrelease(${id})"><i class="fas fa-lock-open me-1"></i>Unrelease</button>`; }
    else if (admin()) h = `<button type="button" class="btn btn-sm btn-success mp21020-b" title="Release: setujui kontrak / PO (Admin)" onclick="event.stopPropagation(); mp21020Release(${id})"><i class="fas fa-circle-check me-1"></i>Release</button>`;
    else if (pengadaan() && st.k !== 'DIAJUKAN') h = `<button type="button" class="btn btn-sm btn-outline-success mp21020-b" title="Ajukan kontrak / PO ini untuk direlease Admin" onclick="event.stopPropagation(); mp21020Ajukan(${id})"><i class="fas fa-paper-plane me-1"></i>Ajukan</button>`;
    return { st, h };
  }
  function pasangRegister() {
    const tab = $('tab-register'); if (!tab || !sesi()) return;
    tab.querySelectorAll('tr.baris-kontrak').forEach(tr => {
      const td0 = tr.querySelector('td'), tdA = tr.lastElementChild; if (!td0 || !tdA) return;
      const r = tr.dataset.id ? cariReg(tr.dataset.id) : null, kunci = tr.dataset.id ? 'R:' + tr.dataset.id : 'M:' + S(tr.dataset.key);
      const x = r ? tombolRilis(r) : null;
      const sidik = kunci + '|' + (r ? x.st.k + '|' + x.st.ket + '|' + x.h.length : '');
      if (tr.dataset.mp21020 === sidik && td0.querySelector('.mp21020-pv')) return;
      tr.querySelectorAll('.mp21020-x').forEach(e => e.remove());
      const chip = td0.querySelector(':scope > div.mt-1') || td0;
      const arg = r ? `'reg', ${J(r.id)}` : `'master', ${J(S(tr.dataset.key))}`;
      chip.insertAdjacentHTML('beforeend', ` <button type="button" class="mp21020-pv mp21020-x" title="Preview PO / kontrak dari data yang tersimpan" onclick="event.stopPropagation(); mp21020PreviewPO(${arg})"><i class="fas fa-eye me-1"></i>Preview PO</button>`);
      if (r) {
        chip.insertAdjacentHTML('beforeend', ` <span class="mp21020-st mp21020-x ${x.st.k.toLowerCase()}" title="${E(x.st.ket)}"><i class="fas ${x.st.k === 'RELEASED' ? 'fa-lock' : x.st.k === 'DIAJUKAN' ? 'fa-paper-plane' : x.st.k === 'UNRELEASED' ? 'fa-rotate-left' : 'fa-pen'} me-1"></i>SAP: ${E(x.st.t)}</span>`);
        if (x.st.k === 'UNRELEASED') td0.insertAdjacentHTML('beforeend', `<div class="mp21020-als mp21020-x"><i class="fas fa-comment-dots me-1"></i>${E(x.st.ket)}</div>`);
        if (x.h) tdA.insertAdjacentHTML('beforeend', `<span class="mp21020-x mp21020-ak">${x.h}</span>`);
      }
      tr.dataset.mp21020 = sidik;
    });
    // tombol Posting bawaan (form edit kontrak): hanya Admin — server menolak selain Admin
    if (srv('sapRelease') && !admin()) document.querySelectorAll('button[onclick]').forEach(b => {
      if (b.dataset.mp21020 || b.classList.contains('mp21020-b')) return; const oc = b.getAttribute('onclick') || '';
      if (!/posting/i.test(oc) || /mp21020|mp218|mp220/i.test(oc)) return;
      b.dataset.mp21020 = '1'; b.disabled = true; b.title = 'Release (posting) hanya oleh Admin. Gunakan tombol "Ajukan" di Register Kontrak.';
    });
  }

  /* ======================= 2. PREVIEW PO ======================= */
  const jenisDari = no => { const m = /(?:^|\/)(SPSA|SPMB|SPPM|SPM|SPKP|SPPP|SPKU|SPK)(?=\/|$)/i.exec(S(no)); return m ? m[1].toUpperCase() : ''; };
  function dataPO(sumber, kunci) {
    if (sumber === 'reg') {
      const r = cariReg(kunci); if (!r) return null;
      return { no: S(r.noKontrak), jenis: S(r.jenisKontrak) || jenisDari(r.noKontrak), tgl: iso(r.tglKontrak), selesai: iso(r.tglSelesai), vendor: S(r.namaVendor), idVendor: S(r.idVendor), pekerjaan: S(r.namaPekerjaan),
        pr: S(r.noPR), rfq: S(r.noRFQ), po: S(r.noPO), top: S(r.top), sumber: 'Register Kontrak', rilis: statusRilis(r), draf: !r.diposting, ttd: !!r.buktiPO,
        items: (r.items || []).map(it => ({ kode: S(it.kode), uraian: S(it.uraian), vol: N(it.vol), sat: S(it.sat), harga: N(it.harga), wbs: S(it.wbs), bon: S(it.noPermintaan) })) };
    }
    const g = ringkasan().find(x => x.key === kunci); if (!g) return null;
    return { no: S(g.key), jenis: S(g.jenisKontrak) || jenisDari(g.key), tgl: iso(g.tglMulai), selesai: iso(g.tglSelesai), vendor: S(g.namaVendor), idVendor: S(g.idVendor), pekerjaan: S(g.namaPekerjaan),
      pr: S(g.noPR), rfq: S(g.noRFQ), po: S(g.noPO), top: S(g.top), sumber: 'Master Kontrak', rilis: null, draf: false, ttd: false,
      items: (g.items || []).map(it => ({ kode: S(it.kodeItem || it.kode), uraian: S(it.itemPekerjaan || it.uraian), vol: N(it.volume), sat: S(it.satuan), harga: N(it.hargaSatuan), wbs: S(it.wbs), bon: '' })) };
  }
  function htmlPO(d) {
    const K = kso(), V = vendor(d.idVendor, d.vendor); let no = 0, total = 0;
    const baris = d.items.map(it => { const jml = it.vol * it.harga; total += jml; const kepala = !it.vol && !it.harga;
      return kepala ? `<tr><td></td><td colspan="7" class="b">${E(it.uraian)}</td></tr>`
        : `<tr><td class="c">${++no}</td><td>${E(it.kode)}</td><td>${E(it.uraian)}</td><td class="r">${ang(it.vol)}</td><td class="c">${E(it.sat)}</td><td class="r">${rp(it.harga)}</td><td class="r">${rp(jml)}</td><td>${E(it.wbs)}</td></tr>`; }).join('');
    const brs = (l, v) => `<tr><td class="l">${l}</td><td class="s">:</td><td>${v}</td></tr>`;
    return bungkus('Preview PO ' + d.no, `<div class="hal">${d.draf ? '<div class="cap">DRAF</div>' : ''}${kopHtml(K)}
      <h1>PRATINJAU PO / KONTRAK${d.jenis ? ' ' + E(d.jenis) : ''}</h1><h2>Nomor : ${E(d.no)}</h2>
      <table class="dt">${brs('Tanggal kontrak', E(tglPanjang(d.tgl)))}${brs('Masa berlaku s.d.', E(tglPanjang(d.selesai)))}${d.pekerjaan ? brs('Pekerjaan / pengadaan', E(d.pekerjaan)) : ''}
        ${brs('Pihak Pertama', '<b>' + E(K.nama) + '</b>' + (K.alamat ? '<br>' + E(K.alamat) : '') + (K.npwp ? '<br>NPWP ' + E(K.npwp) : ''))}
        ${brs('Pihak Kedua', '<b>' + E(d.vendor || '-') + '</b>' + (d.idVendor ? ' (' + E(d.idVendor) + ')' : '') + (V.alamat ? '<br>' + E(V.alamat) : '') + (V.npwp ? '<br>NPWP ' + E(V.npwp) : ''))}
        ${brs('No. PR / RFQ / PO SAP', E([d.pr || '-', d.rfq || '-', d.po || '-'].join(' / ')))}${d.top ? brs('Cara pembayaran (TOP)', E(d.top)) : ''}
        ${brs('Status SAP', d.rilis ? '<b>' + E(d.rilis.t) + '</b> — ' + E(d.rilis.ket) : 'Kontrak Master (sudah berjalan)')}</table>
      <table class="tb" style="margin-top:10px"><thead><tr><th style="width:28px">No</th><th style="width:70px">Kode</th><th>Uraian</th><th style="width:62px">Volume</th><th style="width:44px">Sat</th><th style="width:92px">Harga Satuan (Rp)</th><th style="width:104px">Jumlah (Rp)</th><th style="width:92px">WBS</th></tr></thead>
        <tbody>${baris || '<tr><td colspan="8" class="c">Belum ada item kontrak.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="6" class="r b">Jumlah (DPP, belum termasuk PPN)</td><td class="r b">${rp(total)}</td><td></td></tr></tfoot></table>
      <table class="ttd"><tr><td>Pihak Pertama<br><b>${E(K.nama)}</b><div class="ruang"></div><span class="nm">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td>
        <td>Pihak Kedua<br><b>${E(d.vendor || '-')}</b><div class="ruang"></div><span class="nm">${E(V.direktur) || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span><br>${E(V.jabatan)}</td></tr></table>
      <p class="kecil" style="margin-top:14px">Pratinjau dari data ${E(d.sumber)} pada aplikasi (bukan dokumen bertanda tangan)${d.ttd ? ' — PDF PO bertanda tangan tersedia pada chip "PO TTD"' : ''}. ${d.draf ? 'Kontrak BELUM direlease Admin: isi masih dapat berubah.' : ''}</p></div>`);
  }
  window.mp21020DataPO = dataPO; window.mp21020HtmlPO = htmlPO;
  window.mp21020PreviewPO = (sumber, kunci) => {
    const d = dataPO(sumber, kunci); if (!d) return kabar('Data kontrak tidak ditemukan. Muat ulang halaman.', 'err');
    cetak(htmlPO(d), 'Preview PO · ' + d.no);
  };

  /* ======================= 3. PREVIEW PROGRES ======================= */
  const idItemAman = (g, it, i) => { try { if (typeof idItem === 'function') return idItem(g, it, i); } catch (e) { } return it.kodeUnik || (g.key + '#' + i); };
  function grupDari(e) {
    const L = ringkasan();
    return L.find(g => (g.entriProgres || []).some(x => x.id === e.id)) || L.find(g => g.key === e.noKontrak || g.keyAsli === e.noKontrak) || null;
  }
  function rincianProgres(id) {
    const e = progData().find(x => x.id === id) || ringkasan().reduce((a, g) => a || (g.entriProgres || []).find(x => x.id === id), null); if (!e) return null;
    const g = grupDari(e); if (!g) return { e, g: null, baris: [] };
    const semua = (g.entriProgres && g.entriProgres.length ? g.entriProgres : progData().filter(x => x.noKontrak === e.noKontrak));
    const kunciUrut = x => [N(x.tagihanKe), N(x.periodeKey), S(x.dibuatPada)];
    const dulu = (a, b) => { const p = kunciUrut(a), q = kunciUrut(b); for (let i = 0; i < 3; i++) { if (p[i] < q[i]) return true; if (p[i] > q[i]) return false; } return false; };
    const items = g.items || [], ids = items.map((it, i) => idItemAman(g, it, i));
    const volDari = x => { const m = x.items || {}, langsung = ids.some(k => k in m);   // BK atas nomor lain di keluarga (addendum): cocokkan lewat akhiran "#baris"
      return items.map((it, i) => { if (ids[i] in m) return N(m[ids[i]]); if (langsung) return 0; const k = Object.keys(m).find(z => z.endsWith('#' + i)); return k ? N(m[k]) : 0; }); };
    const vIni = volDari(e), vLalu = items.map(() => 0);
    semua.filter(x => x.id !== e.id && dulu(x, e)).forEach(x => volDari(x).forEach((v, i) => { vLalu[i] += v; }));
    let nIni = 0, nKini = 0, nKontrak = 0;
    const baris = items.map((it, i) => { const harga = N(it.hargaSatuan), vol = N(it.volume), kepala = !vol && !harga, kini = vLalu[i] + vIni[i];
      nIni += vIni[i] * harga; nKini += kini * harga; nKontrak += vol * harga;
      return { kepala, uraian: S(it.itemPekerjaan || it.uraian), sat: S(it.satuan), vol, harga, lalu: vLalu[i], ini: vIni[i], kini, persen: vol ? kini / vol * 100 : 0, nilai: vIni[i] * harga, lebih: vol > 0 && kini - vol > 1e-6 }; });
    return { e, g, baris, nIni: Math.round(nIni), nKini: Math.round(nKini), nKontrak: Math.round(nKontrak), ke: N(e.tagihanKe), n: semua.length };
  }
  window.mp21020Rincian = rincianProgres;
  function tabelProgres(R) {
    let no = 0;
    return `<table class="tb"><thead><tr><th style="width:26px">No</th><th>Uraian</th><th style="width:40px">Sat</th><th style="width:60px">Vol. Kontrak</th><th style="width:84px">Harga Satuan</th><th style="width:60px">s/d Lalu</th><th style="width:60px">Periode Ini</th><th style="width:60px">s/d Kini</th><th style="width:44px">%</th><th style="width:96px">Nilai Periode Ini (Rp)</th></tr></thead><tbody>
      ${R.baris.map(b => b.kepala ? `<tr><td></td><td colspan="9" class="b">${E(b.uraian)}</td></tr>` : `<tr${b.lebih ? ' style="background:#fde8e6"' : ''}><td class="c">${++no}</td><td>${E(b.uraian)}</td><td class="c">${E(b.sat)}</td><td class="r">${ang(b.vol)}</td><td class="r">${rp(b.harga)}</td><td class="r">${ang(b.lalu)}</td><td class="r b">${ang(b.ini)}</td><td class="r">${ang(b.kini)}</td><td class="r">${b.persen.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td><td class="r">${rp(b.nilai)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="9" class="r b">Nilai progres periode ini (DPP)</td><td class="r b">${rp(R.nIni)}</td></tr><tr><td colspan="9" class="r">Kumulatif s/d kini · ${R.nKontrak ? (R.nKini / R.nKontrak * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '% dari nilai kontrak Rp ' + rp(R.nKontrak) : '-'}</td><td class="r">${rp(R.nKini)}</td></tr></tfoot></table>`;
  }
  const kepalaProgres = R => { const e = R.e; return [['Nomor BA', S(e.nomorBA) || '(BA belum bernomor)'], ['Jenis BA', S(e.kodeBA) || '-'], ['Kontrak', S(e.noKontrak)], ['Vendor', S(R.g && R.g.namaVendor)], ['Tagihan ke / periode', (R.ke || '-') + ' · ' + S(e.periode)], ['Tanggal BA', tglPanjang(e.tanggalBA || e.tanggal)]]; };
  window.mp21020PreviewProgres = id => {
    const R = rincianProgres(id); if (!R) return kabar('BK / progres tidak ditemukan. Muat ulang halaman.', 'err');
    const lama = $('mp21020Pp'); if (lama) lama.remove();
    const selisih = R.g && Math.abs(R.nIni - Math.round(N(R.e.nilai))) > 1;
    const w = document.createElement('div'); w.id = 'mp21020Pp'; w.className = 'mp273-modal mp21020-pp';
    w.innerHTML = `<div class="mp273-kotak" role="dialog" aria-modal="true" aria-label="Preview progres"><div class="mp273-kepala"><b><i class="fas fa-eye me-1"></i>Preview Progres${S(R.e.kodeBA) ? ' · ' + E(R.e.kodeBA) : ''}</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi"><div class="mp21020-kv">${kepalaProgres(R).map(k => `<div><span>${E(k[0])}</span><b>${E(k[1])}</b></div>`).join('')}</div>
      ${R.g ? `<div class="mp21020-tbl">${tabelProgres(R)}</div>` : '<div class="alert alert-warning small">Item kontrak untuk BK ini tidak ditemukan di ringkasan kontrak.</div>'}
      ${selisih ? `<div class="alert alert-warning small py-2 mt-2"><i class="fas fa-triangle-exclamation me-1"></i>Nilai hitung ulang Rp ${rp(R.nIni)} ≠ nilai BK tercatat Rp ${rp(R.e.nilai)} — periksa volume / harga satuan sebelum BA dicetak.</div>` : ''}
      ${R.baris.some(b => b.lebih) ? '<div class="alert alert-danger small py-2 mt-2"><i class="fas fa-triangle-exclamation me-1"></i>Ada item dengan volume kumulatif melebihi volume kontrak (baris merah).</div>' : ''}
      <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Tutup</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-cetak><i class="fas fa-print me-1"></i>Cetak rincian</button>
        ${typeof window.mp298Pratinjau === 'function' ? '<button type="button" class="btn btn-sm btn-outline-success" data-excel><i class="fas fa-file-excel me-1"></i>Format Excel baku</button>' : ''}
        ${typeof previewBAEntri === 'function' ? `<button type="button" class="btn btn-sm btn-primary" data-ba><i class="fas fa-file-signature me-1"></i>Preview ${E(S(R.e.kodeBA) || 'BA')}</button>` : ''}</div></div></div>`;
    w.addEventListener('click', ev => {
      if (ev.target === w || ev.target.closest('[data-tutup]')) return w.remove();
      if (ev.target.closest('[data-cetak]')) { const K = kso(); cetak(bungkus('Rincian Progres ' + S(R.e.nomorBA), `<div class="hal">${kopHtml(K)}<h1>RINCIAN PROGRES</h1><h2>${E(S(R.e.nomorBA) || S(R.e.noKontrak))}</h2><table class="dt">${kepalaProgres(R).map(k => `<tr><td class="l">${E(k[0])}</td><td class="s">:</td><td>${E(k[1])}</td></tr>`).join('')}</table><div style="margin-top:10px">${R.g ? tabelProgres(R) : ''}</div></div>`), 'Rincian Progres · ' + (S(R.e.nomorBA) || S(R.e.noKontrak))); return; }
      if (ev.target.closest('[data-excel]')) { w.remove(); window.mp298Pratinjau(id); return; }
      if (ev.target.closest('[data-ba]')) { w.remove(); try { previewBAEntri(id); } catch (e) { kabar(e.message, 'err'); } }
    });
    document.body.appendChild(w);
  };
  function pasangProgres() {
    const tab = $('tab-form-progres'); if (!tab) return;
    const tombol = id => ` <button type="button" class="mp21020-pv mp21020-pvp" title="Preview progres: volume s/d lalu, periode ini, s/d kini & nilai per item" onclick="event.stopPropagation(); mp21020PreviewProgres(${J(id)}); return false;"><i class="fas fa-eye me-1"></i>Preview</button>`;
    tab.querySelectorAll('a[onclick^="previewBAEntri("], button[onclick^="previewBAEntri("]').forEach(a => {
      const m = (a.getAttribute('onclick') || '').match(/previewBAEntri\('([^']+)'/); if (!m) return;
      const tr = a.closest('tr') || a.parentNode; if (tr.querySelector('.mp21020-pvp')) return;
      a.insertAdjacentHTML('afterend', tombol(m[1]));
    });
    tab.querySelectorAll('tbody tr td:first-child > code').forEach(c => {
      const tr = c.closest('tr'); if (!tr || tr.querySelector('.mp21020-pvp')) return;
      const e = progData().find(x => S(x.nomorBA) && x.nomorBA === c.textContent.trim()); if (!e) return;
      c.insertAdjacentHTML('afterend', tombol(e.id));
    });
  }

  /* ======================= 4. BASO & BASTA PER ALAT ======================= */
  const SISI = ['Tampak Depan', 'Tampak Belakang', 'Tampak Samping'];
  const LENGKAP = [['manualPabrik', 'Manual Pabrik'], ['stnk', 'STNK'], ['kotakP3K', 'Kotak P3K'], ['kacaSpion', 'Kaca Spion']];
  const BB = { spsa: [], data: [], siap: false, muat: false, galat: '', pilih: '', kunci: '', dok: {} };
  window.MP21020 = BB;
  const pendek = no => { const p = S(no).split('/'); return p.length >= 3 ? p[0] + '/' + p[1] + '/' + p[p.length - 1] : S(no); };
  async function muatBaso(paksa) {
    const s = sesi(); if (!s || BB.muat) return;
    const k = S(s.nama) + '|' + S(s.proyek || proyek().id);
    if (!paksa && BB.siap && BB.kunci === k) return;
    if (!srv('basoBasta')) { BB.galat = 'Server belum melaporkan fitur "basoBasta". Pasang Modul server 1.10.18 (Admin › Modul server), lalu muat ulang halaman.'; BB.siap = false; gambarBaso(); return; }
    BB.muat = true; gambarBaso();
    try { const r = await aksi('basoBaca', {}); BB.spsa = r.spsa || []; BB.data = r.data || []; BB.siap = true; BB.kunci = k; BB.galat = ''; }
    catch (e) { BB.galat = String(e && e.message ? e.message : e); }
    finally { BB.muat = false; gambarBaso(); }
  }
  function daftarSPSA() {   // Register (server) + Master Kontrak (ringkasan perangkat) yang nomornya ber-ruas /SPSA/
    const L = BB.spsa.map(x => Object.assign({ sumber: 'REGISTER' }, x)), ada = {}; L.forEach(x => { ada[x.noKontrak] = 1; });
    ringkasan().forEach(g => { const no = S(g.key); if (!no || ada[no] || jenisDari(no) !== 'SPSA') return; ada[no] = 1;
      L.push({ sumber: 'MASTER', noKontrak: no, tglKontrak: iso(g.tglMulai), tglSelesai: iso(g.tglSelesai), namaVendor: S(g.namaVendor), idVendor: S(g.idVendor), diposting: true,
        items: (g.items || []).filter(it => N(it.volume) || N(it.hargaSatuan)).map(it => ({ kode: S(it.kodeItem), uraian: S(it.itemPekerjaan), vol: N(it.volume), sat: S(it.satuan) })) }); });
    return L.sort((a, b) => S(a.noKontrak).localeCompare(S(b.noKontrak), 'id', { numeric: true }));
  }
  function alatSPSA(sp) {   // 1 baris per unit alat: item SPSA (urutan = nomor baris) + unit tambahan yang sudah tersimpan
    const rec = BB.data.filter(r => r.noSPSA === sp.noKontrak && r.status !== 'BATAL');
    const n = Math.max((sp.items || []).length, rec.reduce((a, r) => Math.max(a, N(r.urutan)), 0)), L = [];
    for (let u = 1; u <= n; u++) { const it = (sp.items || [])[u - 1] || null, r = rec.find(x => N(x.urutan) === u) || null; L.push({ urutan: u, item: it, rec: r, jenisAlat: r ? S(r.jenisAlat) : S(it && it.uraian) }); }
    return L;
  }
  window.mp21020AlatSPSA = no => { const sp = daftarSPSA().find(x => x.noKontrak === no); return sp ? alatSPSA(sp) : []; };
  async function gambarFoto(ref) {
    const id = ref && (ref.idServer || ref.id); if (!id) return '';
    if (!BB.dok[id]) { const r = await aksi('ambilBerkas', { id: id }); BB.dok[id] = 'data:' + (r.tipe || 'image/jpeg') + ';base64,' + r.data; }
    return BB.dok[id];
  }
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
  /* ---------- dokumen: BASO (hal. 1) · BASTA (hal. 2) · lampiran foto (hal. 3) ---------- */
  function htmlBaso(d, foto) {   // d: { noSPSA, tanggal, namaVendor, urutan, totalAlat, jenisAlat, merk, … }, foto: [dataURL × 3]
    const K = kso(), T = tanggalNarasi(d.tanggal) || { hari: '-', tanggal: '-', bulan: '-', tahun: '-', angka: '' }, pl = d.perlengkapan || {}, lembar = N(d.lembarSurat);
    const v = x => E(S(x) || '-'), brs = (n, l, x) => `<tr><td class="n">${n}</td><td class="l">${l}</td><td class="s">:</td><td>${x}</td></tr>`;
    const data = `<table class="dt">${brs('1.', 'Jenis Alat', '<b>' + v(d.jenisAlat) + '</b>')}${brs('2.', 'Merk/Type', v(d.merk))}${brs('3.', 'No. Mesin', v(d.noMesin))}${brs('4.', 'No. Rangka', v(d.noRangka))}${brs('5.', 'Bahan Bakar', v(d.bahanBakar))}${brs('6.', 'Tahun Pembuatan', v(d.tahun))}${brs('7.', 'No. Polisi', v(d.noPolisi))}
      <tr><td class="n">8.</td><td class="l">Perlengkapan yang ada</td><td class="s">:</td><td></td></tr>
      ${LENGKAP.map((k, i) => `<tr><td></td><td class="l">${'abcd'[i]}. ${k[1]}</td><td class="s">:</td><td>${pl[k[0]] ? 'Ada' : 'Tidak'}</td></tr>`).join('')}
      <tr><td class="n">9.</td><td colspan="3">Keterangan / surat-surat terlampir sebanyak ${lembar} (${judulKata(terbilang(lembar))}) lembar.${S(d.keterangan) ? ' ' + E(d.keterangan) : ''}</td></tr></table>`;
    const penutup = `<p style="margin-top:10px">Alat tersebut diatas dalam kondisi (${E(S(d.kondisi) || 'Baik')}), perlengkapan serta surat-surat lengkap.</p><p>Demikian Berita Acara ini dibuat sesuai dengan kondisi yang sesungguhnya.</p>`;
    const nama = x => S(x) ? E(x) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    const ttd = (ki, ka) => `<table class="ttd"><tr><td>${ki}<br><b>${E(K.nama)}</b><div class="ruang"></div><span class="nm">${nama(d.pihak1Nama)}</span><br>(${E(S(d.pihak1Jabatan) || 'Kepala Proyek')})</td>
      <td>${ka}<br><b>${E(S(d.namaVendor).toUpperCase())}</b><div class="ruang"></div><span class="nm">${nama(d.pihak2Nama)}</span><br>(${E(S(d.pihak2Jabatan) || 'Direktur')})</td></tr></table>`;
    const rujuk = `<p class="kecil" style="text-align:center;margin-bottom:12px">SPSA No. ${E(d.noSPSA)} · alat ${N(d.urutan)} dari ${Math.max(N(d.totalAlat), N(d.urutan))}</p>`;
    const kapan = `${E(T.hari)}, tanggal ${E(T.tanggal)} bulan ${E(T.bulan)} tahun ${E(T.tahun)} ${E(T.angka)}`;
    const h1 = `<div class="hal">${kopHtml(K)}<h1>BERITA ACARA ALAT SIAP OPERASI</h1><h2>ALAT SEWA / SUB KONTRAKTOR</h2>${rujuk}
      <p>Pada hari ini ${kapan}, yang bertanda tangan dibawah ini, Wakil dari perusahaan ${E(d.namaVendor)} sebagai penyedia alat, dan Kepala Proyek ${E(K.nama)} sebagai pengguna alat, secara bersama-sama telah memeriksa, serta telah melaksanakan uji coba alat dan sepakat membuat pernyataan bahwa alat beserta perlengkapan dan lampiran yang tersebut dibawah dalam keadaan lengkap dan SIAP OPERASI.</p>
      <p>dengan data seperti dibawah:</p>${data}${penutup}${ttd('Pihak Pertama — Pengguna Alat', 'Pihak Kedua — Penyedia Alat')}</div>`;
    const h2 = `<div class="hal">${kopHtml(K)}<h1>BERITA ACARA SERAH TERIMA ALAT</h1><h2>&nbsp;</h2>${rujuk}
      <p>Pada hari ini ${kapan} telah dilaksanakan serah terima alat :</p>
      <table class="dt"><tr><td class="l">D a r i</td><td class="s">:</td><td><b>${E(d.namaVendor)}</b><br>Sebagai Penyedia Alat</td></tr>
        <tr><td class="l">Kepada</td><td class="s">:</td><td><b>${E(K.nama)}</b>${K.proyek ? '<br>' + E(K.proyek) : ''}<br>Sebagai Pengguna Alat</td></tr></table>
      <p style="margin-top:8px">dengan data seperti dibawah:</p>${data}${penutup}${ttd('Yang menerima', 'Yang menyerahkan')}</div>`;
    const h3 = `<div class="hal">${kopHtml(K)}<h1>LAMPIRAN FOTO KONDISI ALAT</h1><h2>${v(d.jenisAlat)} · ${v(d.merk)}</h2>${rujuk}
      <div class="foto">${SISI.map((s, i) => `<figure>${(foto || [])[i] ? `<img src="${foto[i]}" alt="${s}">` : '<div class="kosong">Foto belum diunggah</div>'}<figcaption>${s}</figcaption></figure>`).join('')}</div>
      <p class="kecil" style="margin-top:10px">Foto kondisi lapangan saat serah terima, ${E(tglPanjang(d.tanggal))}.</p></div>`;
    return bungkus('BASO-BASTA ' + pendek(d.noSPSA) + ' alat ' + N(d.urutan), h1 + h2 + h3);
  }
  window.mp21020HtmlBaso = htmlBaso;
  window.mp21020PreviewBaso = async (no, urutan) => {
    const sp = daftarSPSA().find(x => x.noKontrak === no); if (!sp) return kabar('SPSA tidak ditemukan. Muat ulang.', 'err');
    const L = alatSPSA(sp), a = L.find(x => x.urutan === Number(urutan)); if (!a) return kabar('Alat tidak ditemukan.', 'err');
    const d = Object.assign({ noSPSA: sp.noKontrak, tanggal: sp.tglKontrak, namaVendor: sp.namaVendor, urutan: a.urutan, jenisAlat: a.jenisAlat, perlengkapan: {}, lembarSurat: 1, kondisi: 'Baik', pihak1Jabatan: 'Kepala Proyek', pihak2Jabatan: 'Direktur' }, a.rec || {}, { totalAlat: L.length });
    if (!a.rec) kabar('Isian lapangan alat ini belum disimpan — pratinjau menampilkan data SPSA saja.', 'err');
    let foto = [null, null, null];
    try { foto = await Promise.all(SISI.map((s, i) => { const f = a.rec && (a.rec.foto || [])[i]; return f ? gambarFoto(f).catch(() => '') : ''; })); } catch (e) { }
    cetak(htmlBaso(d, foto), 'BASO-BASTA · ' + pendek(sp.noKontrak) + ' · alat ' + a.urutan + '-' + L.length + ' · ' + a.jenisAlat);
  };
  /* ---------- form isian lapangan ---------- */
  const F = { sp: null, a: null, slot: [null, null, null], sibuk: false };
  function gambarSlot() {
    const w = $('mp21020Slot'); if (!w) return;
    w.innerHTML = SISI.map((s, i) => { const z = F.slot[i];
      return `<div class="mp21020-s ${z ? 'isi' : ''}"><div class="t">${s} *</div><div class="g" id="mp21020G${i}">${z ? (z.data ? `<img src="${z.data}" alt="${s}">` : '<i class="fas fa-spinner fa-spin"></i>') : '<span><i class="fas fa-camera"></i><br>belum ada</span>'}</div>
        <div class="a"><label class="btn btn-sm btn-light border py-0 mb-0">${z ? 'Ganti' : 'Unggah'}<input type="file" accept="image/jpeg,image/png" capture="environment" hidden data-i="${i}"></label>${z ? `<button type="button" class="btn btn-sm btn-light border py-0" data-hapus="${i}">Hapus</button>` : ''}</div></div>`; }).join('');
    F.slot.forEach((z, i) => { if (z && z.ref && !z.data) gambarFoto(z.ref).then(src => { const el = $('mp21020G' + i); if (el && F.slot[i] === z) el.innerHTML = src ? `<img src="${src}" alt="${SISI[i]}">` : '<span>foto tidak dapat dimuat</span>'; }).catch(() => { const el = $('mp21020G' + i); if (el && F.slot[i] === z) el.innerHTML = '<span>foto tidak dapat dimuat</span>'; }); });
  }
  const ingat = (k, v) => { try { if (v === undefined) return localStorage.getItem('JICT_BASO_' + k) || ''; localStorage.setItem('JICT_BASO_' + k, v); } catch (e) { } return ''; };
  window.mp21020IsiBaso = (no, urutan) => {
    if (!bolehGudang()) return kabar('Akun Lihat saja tidak dapat mengisi BASO / BASTA.', 'err');
    const sp = daftarSPSA().find(x => x.noKontrak === no); if (!sp) return kabar('SPSA tidak ditemukan. Muat ulang.', 'err');
    if (sp.sumber === 'REGISTER' && !sp.diposting) return kabar('SPSA ' + sp.noKontrak + ' belum direlease Admin — BASO / BASTA dibuat setelah PO Sewa Alat direlease.', 'err');
    const L = alatSPSA(sp), baru = !urutan, a = baru ? { urutan: L.length + 1, item: null, rec: null, jenisAlat: '' } : L.find(x => x.urutan === Number(urutan));
    if (!a) return kabar('Alat tidak ditemukan.', 'err');
    const r = a.rec || {}, pl = r.perlengkapan || {}, V = vendor(sp.idVendor, sp.namaVendor);
    const seVendor = BB.data.slice().reverse().find(x => x.namaVendor === sp.namaVendor && S(x.pihak2Nama)) || {}, terakhir = BB.data.slice().reverse().find(x => S(x.pihak1Nama)) || {};
    F.sp = sp; F.a = a; F.sibuk = false; F.slot = SISI.map((s, i) => (r.foto || [])[i] ? { ref: r.foto[i] } : null);
    const lama = $('mp21020Form'); if (lama) lama.remove();
    const isian = (id, label, nilai, attr) => `<div><label class="small" for="${id}">${label}</label><input class="form-control form-control-sm" id="${id}" value="${E(nilai)}" ${attr || 'maxlength="120"'}></div>`;
    const w = document.createElement('div'); w.id = 'mp21020Form'; w.className = 'mp273-modal mp21020-form';
    w.innerHTML = `<div class="mp273-kotak" role="dialog" aria-modal="true" aria-label="Isian BASO dan BASTA"><div class="mp273-kepala"><b><i class="fas fa-clipboard-check me-1"></i>BASO &amp; BASTA · alat ${a.urutan}</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi"><div class="mp21020-kv"><div><span>SPSA</span><b>${E(sp.noKontrak)}</b></div><div><span>Tanggal dokumen (otomatis = tanggal SPSA)</span><b>${E(tglPanjang(sp.tglKontrak))}</b></div><div><span>Penyedia alat</span><b>${E(sp.namaVendor)}</b></div></div>
        <div class="mp21020-grid">${isian('mp21020fJenis', 'Jenis Alat *', a.jenisAlat, 'maxlength="200"')}${isian('mp21020fMerk', 'Merk / Type *', r.merk)}${isian('mp21020fMesin', 'No. Mesin *', r.noMesin, 'maxlength="80"')}${isian('mp21020fRangka', 'No. Rangka', r.noRangka, 'maxlength="80"')}
          ${isian('mp21020fBbm', 'Bahan Bakar *', r.bahanBakar || 'Solar', 'maxlength="40" list="mp21020Bbm"')}${isian('mp21020fTahun', 'Tahun Pembuatan *', r.tahun, 'type="number" min="1950" max="2100" step="1"')}${isian('mp21020fNopol', 'No. Polisi', r.noPolisi, 'maxlength="40"')}${isian('mp21020fKondisi', 'Kondisi', r.kondisi || 'Baik', 'maxlength="60"')}</div>
        <datalist id="mp21020Bbm"><option value="Solar"><option value="Bensin"><option value="Listrik"></datalist>
        <div class="small fw-semibold mt-2">Perlengkapan yang ada</div>
        <div class="mp21020-cek">${LENGKAP.map(k => `<label class="form-check"><input type="checkbox" class="form-check-input" id="mp21020c_${k[0]}" ${pl[k[0]] ? 'checked' : ''}> ${k[1]}</label>`).join('')}
          <label class="small ms-auto">Surat terlampir <input type="number" class="form-control form-control-sm d-inline-block" style="width:70px" id="mp21020fLembar" min="0" max="99" value="${E(r.lembarSurat === undefined ? 1 : r.lembarSurat)}"> lembar</label></div>
        <div class="mp21020-grid mt-2">${isian('mp21020fP1', 'Pihak Pertama — nama Kepala Proyek *', r.pihak1Nama || terakhir.pihak1Nama || ingat('KAPRO'))}${isian('mp21020fP2', 'Pihak Kedua — nama Direktur / penyedia alat *', r.pihak2Nama || seVendor.pihak2Nama || V.direktur)}${isian('mp21020fP2J', 'Jabatan Pihak Kedua', r.pihak2Jabatan || seVendor.pihak2Jabatan || V.jabatan || 'Direktur', 'maxlength="60"')}${isian('mp21020fKet', 'Keterangan', r.keterangan, 'maxlength="300"')}</div>
        <div class="small fw-semibold mt-2">Foto kondisi lapangan (3 sisi)</div><div class="mp21020-slot" id="mp21020Slot"></div>
        <div class="small text-muted mt-1"><i class="fas fa-circle-info me-1"></i>Isian dapat disimpan bertahap (status Draf); status Lengkap bila seluruh isian bertanda * dan 3 foto terisi.</div>
        <div id="mp21020FPesan" class="mp273-pesan" role="status"></div>
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Batal</button><button type="button" class="btn btn-sm btn-primary" id="mp21020FOk"><i class="fas fa-floppy-disk me-1"></i>Simpan</button></div></div></div>`;
    const msg = t => { const p = $('mp21020FPesan'); if (p) p.textContent = t; };
    w.addEventListener('click', ev => { if (F.sibuk) return; if (ev.target === w || ev.target.closest('[data-tutup]')) return w.remove(); const h = ev.target.closest('[data-hapus]'); if (h) { F.slot[Number(h.dataset.hapus)] = null; gambarSlot(); } });
    w.addEventListener('change', async ev => { const t = ev.target; if (t.type === 'file' && t.dataset.i !== undefined && t.files && t.files[0]) { try { F.slot[Number(t.dataset.i)] = { data: await kecilkan(t.files[0]) }; gambarSlot(); msg(''); } catch (er) { msg(er.message); } } });
    document.body.appendChild(w); gambarSlot();
    $('mp21020FOk').onclick = async () => {
      const g = id => S($(id).value), b = $('mp21020FOk');
      if (!g('mp21020fJenis')) { msg('Jenis alat wajib diisi.'); $('mp21020fJenis').focus(); return; }
      b.disabled = true; F.sibuk = true;
      try {
        const foto = [];
        for (let i = 0; i < 3; i++) {
          const z = F.slot[i]; if (!z) { foto.push(null); continue; } if (!z.data || z.ref) { foto.push(z.ref); continue; }
          msg('Mengunggah foto ' + SISI[i] + '…');
          const u = await aksi('gudangUnggahFoto', { berkas: { id: 'bb' + Date.now().toString(36) + i, data: z.data.split(',')[1], nama: SISI[i].replace(/\s+/g, '-') + '.jpg', jenis: 'FOTO-BASO', ket: pendek(sp.noKontrak) + ' · alat ' + a.urutan + ' · ' + SISI[i] } });
          if (!u || !u.data || !u.data.idServer) throw new Error('Foto ' + SISI[i] + ' belum tersimpan di server.');
          BB.dok[u.data.idServer] = z.data; z.ref = u.data; foto.push(u.data);
        }
        msg('Menyimpan…');
        const perlengkapan = {}; LENGKAP.forEach(k => { perlengkapan[k[0]] = !!$('mp21020c_' + k[0]).checked; });
        const res = await aksi('basoSimpan', { data: { id: r.id || '', versi: r.versi, noSPSA: sp.noKontrak, urutan: a.urutan, totalAlat: Math.max(L.length, a.urutan), tanggalSPSA: sp.tglKontrak, namaVendor: sp.namaVendor, idVendor: sp.idVendor,
          jenisAlat: g('mp21020fJenis'), merk: g('mp21020fMerk'), noMesin: g('mp21020fMesin'), noRangka: g('mp21020fRangka'), bahanBakar: g('mp21020fBbm'), tahun: g('mp21020fTahun'), noPolisi: g('mp21020fNopol'), kondisi: g('mp21020fKondisi'),
          perlengkapan: perlengkapan, lembarSurat: g('mp21020fLembar'), keterangan: g('mp21020fKet'), pihak1Nama: g('mp21020fP1'), pihak2Nama: g('mp21020fP2'), pihak2Jabatan: g('mp21020fP2J'), foto: foto } });
        ingat('KAPRO', g('mp21020fP1'));
        const rec = res.data, i = BB.data.findIndex(x => x.id === rec.id); if (i >= 0) BB.data[i] = rec; else BB.data.push(rec);
        F.sibuk = false; w.remove(); gambarBaso();
        kabar('BASO / BASTA alat ' + a.urutan + ' (' + rec.jenisAlat + ') tersimpan — ' + (rec.status === 'LENGKAP' ? 'lengkap, siap dicetak.' : 'draf, kurang: ' + (rec.kurang || []).join(', ') + '.'), 'ok');
      } catch (er) { F.sibuk = false; b.disabled = false; msg(/KONFLIK/.test(er.message) ? er.message + ' Tutup dialog, muat ulang, lalu buka lagi.' : er.message); }
    };
  };
  window.mp21020BatalBaso = async id => {
    const r = BB.data.find(x => x.id === id); if (!r) return;
    const alasan = await dialog('Batalkan BASO / BASTA alat ini?', r.noSPSA + '\nAlat ' + r.urutan + ' · ' + r.jenisAlat + '\n\nData tetap tersimpan berstatus Batal; alat dapat diisi ulang.', { alasan: true, labelAlasan: 'Alasan pembatalan (min. 12 karakter)', ya: 'Batalkan', bahaya: true });
    if (!alasan) return;
    try { const res = await aksi('basoBatal', { data: { id: id, alasan: alasan } }); const i = BB.data.findIndex(x => x.id === id); if (i >= 0) BB.data[i] = res.data; gambarBaso(); kabar('BASO / BASTA alat ' + r.urutan + ' dibatalkan.', 'ok'); }
    catch (e) { kabar(String(e && e.message ? e.message : e), 'err'); }
  };
  window.mp21020PilihSPSA = no => { BB.pilih = no; gambarBaso(); };
  window.mp21020MuatBaso = () => muatBaso(true);
  /* ---------- tab Gudang › BASO & BASTA Alat ---------- */
  function gambarBaso() {
    const el = $('mp21020BasoIsi'); if (!el) return;
    if (BB.galat && !BB.siap) { el.innerHTML = `<div class="alert alert-warning"><i class="fas fa-triangle-exclamation me-1"></i>${E(BB.galat)}</div>`; return; }
    if (!BB.siap) { el.innerHTML = '<div class="text-muted p-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat data SPSA &amp; BASO / BASTA…</div>'; return; }
    const L = daftarSPSA(); if (!L.some(x => x.noKontrak === BB.pilih)) BB.pilih = (L.find(x => BB.data.some(r => r.noSPSA === x.noKontrak)) || L[0] || {}).noKontrak || '';
    if (!L.length) { el.innerHTML = '<div class="alert alert-info">Belum ada PO Sewa Alat (nomor kontrak ber-ruas /SPSA/) di Register maupun Master Kontrak.</div>'; return; }
    const sp = L.find(x => x.noKontrak === BB.pilih), A = alatSPSA(sp), terkunci = sp.sumber === 'REGISTER' && !sp.diposting, bisa = bolehGudang() && !terkunci;
    const nL = A.filter(a => a.rec && a.rec.status === 'LENGKAP').length;
    el.innerHTML = `<div class="mp21020-bar"><label class="small fw-semibold" for="mp21020Spsa">PO Sewa Alat (SPSA)</label>
        <select class="form-select form-select-sm" id="mp21020Spsa" onchange="mp21020PilihSPSA(this.value)">${L.map(x => { const n = BB.data.filter(r => r.noSPSA === x.noKontrak && r.status !== 'BATAL').length; return `<option value="${E(x.noKontrak)}" ${x.noKontrak === BB.pilih ? 'selected' : ''}>${E(x.noKontrak)} · ${E(x.namaVendor)}${n ? ' · ' + n + ' BA' : ''}${x.sumber === 'REGISTER' && !x.diposting ? ' · belum release' : ''}</option>`; }).join('')}</select>
        <button type="button" class="btn btn-sm btn-light border" onclick="mp21020MuatBaso()" title="Muat ulang dari server"><i class="fas fa-rotate"></i></button></div>
      <div class="mp21020-kv mt-2"><div><span>Tanggal BASO &amp; BASTA (otomatis = tanggal SPSA)</span><b>${E(tglPanjang(sp.tglKontrak))}</b></div><div><span>Pihak Pertama</span><b>Kepala Proyek · ${E(kso().nama)}</b></div><div><span>Pihak Kedua</span><b>Direktur · ${E(sp.namaVendor)}</b></div><div><span>Dokumen</span><b>${A.length} alat → ${A.length} berkas · ${nL} lengkap</b></div></div>
      ${terkunci ? '<div class="alert alert-warning small py-2 mt-2"><i class="fas fa-lock me-1"></i>SPSA ini belum direlease Admin — BASO / BASTA dapat diisi setelah PO Sewa Alat direlease.</div>' : ''}
      ${!sp.tglKontrak ? '<div class="alert alert-danger small py-2 mt-2"><i class="fas fa-triangle-exclamation me-1"></i>Tanggal kontrak SPSA belum diisi di Register Kontrak — tanggal BASO / BASTA belum dapat ditentukan.</div>' : ''}
      <div class="mp219-tw mt-2"><table class="mp219-tb mp219-tb-s mp21020-tb"><thead><tr><th class="c" style="width:44px">Alat</th><th>Jenis Alat</th><th>Merk / Type</th><th>No. Mesin</th><th>No. Rangka</th><th class="c">Tahun</th><th class="c">Foto</th><th>Status</th><th class="c">Aksi</th></tr></thead><tbody>
        ${A.map(a => { const r = a.rec, nf = r ? (r.foto || []).filter(Boolean).length : 0, st = r ? r.status : 'BELUM';
          return `<tr><td class="c b">${a.urutan}/${A.length}</td><td>${E(a.jenisAlat || '-')}${a.item && N(a.item.vol) ? `<div class="small text-muted">${ang(a.item.vol)} ${E(a.item.sat)}</div>` : ''}${!a.item ? '<div class="small text-muted">unit tambahan</div>' : ''}</td><td>${E(r ? r.merk : '') || '-'}</td><td class="mono">${E(r ? r.noMesin : '') || '-'}</td><td class="mono">${E(r ? r.noRangka : '') || '-'}</td><td class="c">${E(r ? r.tahun : '') || '-'}</td><td class="c">${nf}/3</td>
            <td><span class="mp21020-st ${st === 'LENGKAP' ? 'released' : st === 'DRAF' ? 'diajukan' : 'draf'}" title="${E(r && (r.kurang || []).length ? 'Kurang: ' + r.kurang.join(', ') : '')}">${st === 'LENGKAP' ? 'Lengkap' : st === 'DRAF' ? 'Draf' : 'Belum diisi'}</span>${r ? `<div class="small text-muted">${E(r.diubahOleh)} · ${E(tglPanjang(r.diubahPada))}</div>` : ''}</td>
            <td class="c nw">${bisa ? `<button type="button" class="btn btn-sm btn-outline-primary py-0" onclick="mp21020IsiBaso(${J(sp.noKontrak)}, ${a.urutan})"><i class="fas fa-pen me-1"></i>${r ? 'Ubah' : 'Isi'}</button> ` : ''}<button type="button" class="btn btn-sm btn-outline-secondary py-0" title="Preview / cetak BASO & BASTA alat ini (1 berkas)" onclick="mp21020PreviewBaso(${J(sp.noKontrak)}, ${a.urutan})"><i class="fas fa-print me-1"></i>BASO &amp; BASTA</button>${r && pengadaan() ? ` <button type="button" class="btn btn-sm btn-outline-danger py-0" title="Batalkan BASO / BASTA alat ini" onclick="mp21020BatalBaso(${J(r.id)})"><i class="fas fa-ban"></i></button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="9" class="c text-muted">SPSA ini belum memiliki item alat.</td></tr>'}</tbody></table></div>
      ${bisa ? `<button type="button" class="btn btn-sm btn-light border mt-2" onclick="mp21020IsiBaso(${J(sp.noKontrak)}, 0)" title="Satu baris SPSA berisi lebih dari satu unit fisik"><i class="fas fa-plus me-1"></i>Tambah unit alat</button>` : ''}`;
  }
  const TAB = 'gdbaso', JUDUL = 'BASO & BASTA Alat', IKON = 'fa-truck-monster', SUB = 'Berita Acara Alat Siap Operasi & Serah Terima Alat · 1 dokumen per unit alat · tanggal mengikuti SPSA.';
  function pasangTab() {
    if ($('tab-' + TAB)) return true;
    const main = document.querySelector('main'), tabs = main ? main.querySelectorAll('.content-tab') : []; if (!main || !tabs.length) return false;
    const d = document.createElement('div'); d.id = 'tab-' + TAB; d.className = 'content-tab'; d.style.display = 'none';
    d.innerHTML = `<div class="mp219-kh mb-3"><div class="mp219-kh-t"><span class="mp219-ik"><i class="fas ${IKON}"></i></span><div><h2>${E(JUDUL)}</h2><p>${E(SUB)}</p></div></div><div class="mp219-kh-a"></div></div><div id="mp21020BasoIsi"></div>`;
    tabs[tabs.length - 1].after(d);
    const ul = document.querySelector('#sidebar ul.nav');
    if (ul && !ul.querySelector('.mp21020-nav')) {
      const cari = t => [...ul.querySelectorAll('.nav-link')].find(a => (a.getAttribute('onclick') || '').includes("'" + t + "'"));
      const acuan = (cari('gdstok') || cari('gdkartu') || cari('gdmasuk') || { closest: () => null }).closest('li');
      const li = document.createElement('li'); li.className = 'nav-item mb-2 mp21020-nav'; li.innerHTML = `<a class="nav-link d-flex align-items-center" onclick="showTab('${TAB}', event)"><i class="fas ${IKON} me-2"></i>${E(JUDUL)}</a>`;
      if (acuan) acuan.after(li); else ul.appendChild(li);
    }
    try { if (typeof MENU_CEPAT !== 'undefined' && !MENU_CEPAT.some(m => m[0] === TAB)) MENU_CEPAT.push([TAB, JUDUL, SUB, IKON, '']); } catch (e) { }
    return true;
  }
  function kaitTab() {
    const asli = window.showTab; if (typeof asli !== 'function' || asli.__mp21020) return;
    const g = function (nama) {
      const r = asli.apply(this, arguments);
      try { if (nama === TAB && $('tab-' + TAB)) { const j = $('judulHalaman'); if (j) j.textContent = JUDUL; gambarBaso(); muatBaso(false); } } catch (e) { }
      return r;
    };
    g.__mp21020 = true; window.showTab = g;
  }

  /* ======================= pemasangan ======================= */
  let _sesi = '';
  function jalan() {
    try { if (pasangTab()) kaitTab(); } catch (e) { }
    try { const s = sesi(), k = s ? S(s.nama) + '|' + S(s.proyek) : ''; if (k !== _sesi) { _sesi = k; BB.siap = false; BB.spsa = []; BB.data = []; BB.dok = {}; BB.kunci = ''; BB.galat = ''; const t = $('tab-' + TAB); if (s && t && t.style.display !== 'none') muatBaso(true); } } catch (e) { }
    try { pasangRegister(); } catch (e) { }
    try { pasangProgres(); } catch (e) { }
  }
  window.mp21020Pasang = jalan;
  setInterval(jalan, 1500);
  if (document.body) setTimeout(jalan, 300); else document.addEventListener('DOMContentLoaded', () => setTimeout(jalan, 300));
})();
