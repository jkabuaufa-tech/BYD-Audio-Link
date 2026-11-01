/* MP299 — ASISTEN KOREKSI TAGIHAN & CEK TAGIHAN (2.9.9; Modul server 1.10.5 · fitur "koreksiBK")
 *  A. Koreksi BK (juga BA yang sudah terbit) dalam 3 langkah:
 *     1. Bandingkan & ubah  — tabel per item (vol. kontrak, yang lalu, saat ini tercatat → saat ini koreksi, s/d, sisa, jumlah, selisih);
 *        isi otomatis dari Excel dokumen yang benar (BAPM/BAPP/BAP/rincian: kolom dikenali dari judul, item dicocokkan dari harga
 *        satuan + kemiripan uraian, dapat diubah) atau tempel kolom "Saat ini" dari Excel/PDF.
 *     2. Dampak & alasan    — nilai lama → baru, paket tagihan (dihitung ulang, revisi), status bayar, BK sesudahnya, volume melebihi
 *        kontrak (wajib nomor addendum), alasan & dokumen acuan wajib, konfirmasi.
 *     3. Simpan             — aksi server koreksiBK (atomik, jejak audit <ID>_KoreksiTagihan), Excel backup disusun ulang otomatis.
 *  B. Cek Tagihan: memindai seluruh BK — nilai BK ≠ Σ volume × harga, volume s/d melebihi kontrak, harga 0, item tidak dikenal,
 *     nilai paket ≠ BK, backup Excel belum ada — dengan tombol Koreksi / Bandingkan Excel per baris & ekspor CSV.
 *  Pintu: Paket Tagihan (bar Excel backup) · Pembentuk Tagihan (tombol "Cek & Koreksi Tagihan" + tombol per BK). */
(function () {
  'use strict';
  if (window.__MP299__) return; window.__MP299__ = true;
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = v => 'Rp ' + Math.round(N(v)).toLocaleString('id-ID');
  const ang = (v, d) => (Math.abs(N(v)) < 5e-5 ? 0 : N(v)).toLocaleString('id-ID', { minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 4 : d });
  const pesan = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || ''); else console.info('[MP299]', m); } catch (e) { } };
  const g$ = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined ? fb : v; } catch (e) { return fb; } };
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const pid = () => { const s = sesi(); return (s && s.proyek) || (g$('PROYEK', {}) || {}).id || ''; };
  const boleh = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN' || s.peran === 'ADMIN')); };
  const admin = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'ADMIN')); };
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  async function kirim(action, data) {
    const s = sesi(), f = window.regPost; if (!s || typeof f !== 'function') throw new Error('Belum terhubung ke server Monitoring SAP.');
    const r = await f(Object.assign({ action, nama: s.nama, pin: s.pin, proyek: pid() }, data === undefined ? {} : { data }));
    if (!r || !r.ok) throw new Error((r && r.error) || 'Gagal menghubungi server.'); return r;
  }
  const ringkasan = () => { try { return (typeof RINGKASAN !== 'undefined' && RINGKASAN) || []; } catch (e) { return []; } };
  const progres = () => { try { return (typeof PROG !== 'undefined' && PROG && PROG.data) || []; } catch (e) { return []; } };
  const kontrakDari = key => ringkasan().find(g => g.key === key || g.keyAsli === key || (g.terkait || []).indexOf(key) >= 0) || null;
  const idItem = (g, it, i) => { const f = g$('idItem'); return typeof f === 'function' ? f(g, it, i) : (it.kodeUnik || g.key + '#' + i); };
  const volItem = it => { const f = g$('volItem'); return typeof f === 'function' ? N(f(it)) : N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak); };
  const hargaItem = it => { const f = g$('hargaItem'); return typeof f === 'function' ? N(f(it)) : N(it.hargaSatuanEfektif ?? it.hargaSatuan); };
  const namaItem = it => S(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian);
  const bulat4 = v => Math.round(N(v) * 10000) / 10000;
  const kunciIdem = () => 'kr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  /* angka dari Excel/PDF: "185,477.80" · "185.477,80" · "1.20" · "-" · "(0.00)" */
  function angka(t) {
    if (typeof t === 'number') return t;
    let s = S(t).replace(/\s|Rp/gi, ''); if (!s || /^[-–—]+$/.test(s)) return 0;
    const neg = /^\(.*\)$/.test(s); s = s.replace(/[()]/g, '');
    const k = s.lastIndexOf(','), t2 = s.lastIndexOf('.');
    if (k >= 0 && t2 >= 0) s = k > t2 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (k >= 0) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    else if (t2 >= 0 && /^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, '');
    const v = Number(s); return isFinite(v) ? (neg ? -v : v) : NaN;
  }
  window.mp299Angka = angka;

  /* ======================= model koreksi ======================= */
  function model(progresId) {
    const L = progres(), e = L.find(x => x.id === progresId); if (!e) throw new Error('BK tidak ditemukan. Muat ulang data.');
    const g = kontrakDari(e.noKontrak); if (!g) throw new Error('Kontrak ' + e.noKontrak + ' tidak ditemukan di Monitoring SAP.');
    const T = new Set([g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean)), ke = N(e.tagihanKe);
    const sblm = L.filter(x => T.has(x.noKontrak) && x.id !== e.id && N(x.tagihanKe) < ke), sesudah = L.filter(x => T.has(x.noKontrak) && x.id !== e.id && N(x.tagihanKe) > ke);
    const baris = (g.items || []).map((it, i) => {
      const id = idItem(g, it, i), vol = volItem(it), harga = hargaItem(it), judul = !vol && !harga;
      const lalu = judul ? 0 : N(it.volumeProgresKumulatif) + sblm.reduce((a, x) => a + N((x.items || {})[id]), 0), ini = N((e.items || {})[id]);
      return { id, i, ur: namaItem(it), sat: S(it.satuan || it.sat), vol, volBaru: vol, harga, judul, lalu, ini, baru: ini };
    });
    const kenal = new Set(baris.map(b => b.id)), asing = Object.keys(e.items || {}).filter(k => !kenal.has(k));
    let reg = null; try { reg = ((typeof REG !== 'undefined' && REG.data) || []).find(r => r.noKontrak === g.key) || null; } catch (er) { }
    return { e, g, reg, baris, asing, sesudah, alasan: '', acuan: '', noAdd: '', yakin: false, langkah: 1, impor: null, sibuk: false, ubahVol: false, ikutVol: !!reg };
  }
  const nilaiDari = (M, k) => M.baris.reduce((a, b) => a + (b.judul ? 0 : N(b[k]) * b.harga), 0);
  const lebih = M => M.baris.filter(b => !b.judul && b.volBaru > 0 && b.lalu + N(b.baru) > b.volBaru + 1e-6);
  const ubahVolKontrak = M => M.baris.filter(b => !b.judul && Math.abs(N(b.volBaru) - b.vol) > 1e-9);
  const adaUbah = M => berubah(M).length + ubahVolKontrak(M).length;
  const berubah = M => M.baris.filter(b => !b.judul && Math.abs(N(b.baru) - b.ini) > 1e-9);

  /* ======================= impor Excel dokumen yang benar ======================= */
  const norm = t => S(t).toLowerCase().replace(/ø|⌀/g, 'dia ').replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const token = t => new Set(norm(t).split(' ').filter(w => w.length > 1 || /\d/.test(w)));
  const mirip = (a, b) => { const A = token(a), B = token(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / (A.size + B.size - n); };
  async function bacaTabelExcel(bytes) {
    const XLH = window.XLH; if (!XLH) throw new Error('Pembaca Excel (XLH, 2.9.3+) belum terpasang.');
    const W = await XLH.muat(bytes); let H = null;
    const nilai = (s, ref) => { const o = s.sel.get(ref); if (!o) return ''; if (o.v !== undefined && o.v !== null && !(o.v && o.v.err)) return o.v;
      if (o.f !== undefined) { if (!H) H = XLH.hitungSemua(W).hasil; const x = (H.get(s.nama) || new Map()).get(ref); return x && x.err ? '' : x; } return ''; };
    const kol = c => XLH.kolHuruf(c), tabel = [];
    const urut = W.sheets.slice().sort((a, b) => (/BAP|RINCIAN|LAMP/i.test(b.nama) ? 1 : 0) - (/BAP|RINCIAN|LAMP/i.test(a.nama) ? 1 : 0));
    urut.forEach(s => {
      let maxR = 0, maxC = 0; s.sel.forEach(o => { if (o.r > maxR) maxR = o.r; if (o.c > maxC) maxC = o.c; });
      maxR = Math.min(maxR, 400); maxC = Math.min(maxC, 40);
      for (let r = 1; r <= Math.min(maxR, 120); r++) {
        const sel = c => S(nilai(s, kol(c) + r)).toUpperCase();
        let cU = 0; for (let c = 1; c <= maxC; c++) if (/JENIS ITEM|MACAM PEKERJAAN|^URAIAN|URAIAN PEKERJAAN/.test(sel(c))) { cU = c; break; }
        if (!cU) continue;
        const teksKol = c => [0, 1, 2, 3].map(d => S(nilai(s, kol(c) + (r + d))).toUpperCase()).join(' ');
        const K = {}; for (let c = cU + 1; c <= maxC; c++) {
          const t = teksKol(c);
          if (!K.vol && /VOLUME/.test(t) && /(KONTRAK|SPK|SESUAI)/.test(t)) K.vol = c;
          else if (!K.lalu && /LALU/.test(t)) K.lalu = c;
          else if (!K.ini && /(SAAT INI|PERIODE INI)/.test(t) && !/S\s*[/.]?\s*D/.test(t)) K.ini = c;
          else if (!K.harga && /HARGA/.test(t) && !/JUMLAH/.test(t)) K.harga = c;
          else if (!K.sat && /^\s*(SAT|SATUAN)\b/.test(t)) K.sat = c;
        }
        if (!K.ini || !K.harga) continue;
        const data = [];
        for (let q = r + 2; q <= maxR; q++) {
          const urJ = S(nilai(s, kol(cU) + q)), h = angka(nilai(s, kol(K.harga) + q));
          if (/^JUMLAH|^TOTAL/i.test(urJ) || /^JUMLAH/i.test(S(nilai(s, 'B' + q)))) break;
          if (!urJ || /^\d{1,2}$/.test(urJ) || !(h > 0)) continue;   // baris nomor kolom (1, 2, 3 …) & judul tanpa harga dilewati
          data.push({ baris: q, ur: urJ, sat: K.sat ? S(nilai(s, kol(K.sat) + q)) : '', vol: K.vol ? angka(nilai(s, kol(K.vol) + q)) : NaN, lalu: K.lalu ? angka(nilai(s, kol(K.lalu) + q)) : NaN, ini: angka(nilai(s, kol(K.ini) + q)) || 0, harga: h });
        }
        if (data.length) tabel.push({ sheet: s.nama, judul: r, kolom: K, data });
        break;
      }
    });
    if (!tabel.length) throw new Error('Tabel item tidak ditemukan. Excel harus memuat kolom Jenis Item/Uraian, Harga, dan Saat Ini/Periode Ini (format BAPM/BAPP/BAP).');
    return tabel.sort((a, b) => b.data.length - a.data.length);
  }
  function cocokkan(M, data) {   // baris Excel → item kontrak: harga sama (±0,5) lalu kemiripan uraian, urutan sebagai pemecah seri
    const calon = M.baris.filter(b => !b.judul), pakai = new Set(); let akhir = -1;
    return data.map(x => {
      const pool = calon.filter(b => !pakai.has(b.id) && Math.abs(b.harga - x.harga) <= Math.max(0.5, b.harga * 1e-6));
      let best = null, skor = -1;
      pool.forEach(b => { const s = mirip(x.ur, b.ur) + (b.i > akhir ? 0.05 : 0) - Math.abs(b.i - akhir - 1) * 0.001; if (s > skor) { skor = s; best = b; } });
      if (best) { pakai.add(best.id); akhir = best.i; }
      return { x, id: best ? best.id : '', yakin: best ? (pool.length === 1 ? 'tinggi' : skor >= 0.3 ? 'sedang' : 'rendah') : 'tidak' };
    });
  }

  /* ======================= dialog ======================= */
  let M = null;
  function tutup() { const w = $('mp299Lapis'); if (w) w.remove(); M = null; }
  window.mp299Tutup = tutup;
  window.mp299Koreksi = (progresId, langsungImpor) => {
    if (!boleh()) { pesan('Koreksi tagihan hanya untuk Pengadaan / Admin.', 'err'); return; }
    try { M = model(progresId); } catch (e) { pesan(e.message, 'err'); return; }
    if (!srv('koreksiBK')) pesan('Modul server 1.10.5 (koreksiBK) belum aktif — koreksi dapat disusun & diperiksa, tetapi belum dapat disimpan.', 'warning');
    gambar();
    if (langsungImpor) setTimeout(() => { const f = $('mp299File'); if (f) f.click(); }, 50);
  };
  function chip(n, l, cls) { return `<button type="button" class="mp299-step ${M.langkah === n ? 'on' : ''} ${cls || ''}" onclick="mp299Langkah(${n})"><span>${n}</span>${l}</button>`; }
  function gambar() {
    if (!M) return;
    let w = $('mp299Lapis');
    if (!w) { w = document.createElement('div'); w.id = 'mp299Lapis'; w.className = 'mp270-latar atas mp299-latar'; w.addEventListener('keydown', ev => { if (ev.key === 'Escape') tutup(); }); document.body.appendChild(w); }
    const e = M.e, nL = nilaiDari(M, 'ini'), nB = nilaiDari(M, 'baru'), ub = berubah(M), lb = lebih(M);
    w.innerHTML = `<section class="mp270-dlg mp299-dlg" role="dialog" aria-modal="true" aria-labelledby="mp299Jdl">
      <header><div><b id="mp299Jdl"><i class="fas fa-pen-to-square me-2"></i>Koreksi Tagihan · ${E(e.nomorBA || '-')}</b>
        <div class="mp299-sub">${E(M.g.namaVendor || '')} · ${E(e.noKontrak)} · tagihan ke-${E(e.tagihanKe)} · ${E(e.periode || '')} ${e.baTerbit ? '<span class="mp299-b ok">BA terbit</span>' : '<span class="mp299-b">BA belum terbit</span>'} ${(e.koreksi || []).length ? `<span class="mp299-b warn">${e.koreksi.length}× dikoreksi</span>` : ''}</div></div>
        <button class="btn-close" aria-label="Tutup" onclick="mp299Tutup()"></button></header>
      <nav class="mp299-steps">${chip(1, 'Bandingkan & ubah')}${chip(2, 'Dampak & alasan')}${chip(3, 'Simpan')}</nav>
      <div class="mp299-ringkas"><div><small>Nilai BK tercatat</small><b>${rp(nL)}</b></div><i class="fas fa-arrow-right"></i><div><small>Nilai BK koreksi</small><b class="${Math.abs(nB - nL) > 0.5 ? 'beda' : ''}">${rp(nB)}</b></div>
        <div><small>Selisih</small><b class="${nB - nL > 0.5 ? 'naik' : nB - nL < -0.5 ? 'turun' : ''}">${(nB - nL >= 0 ? '+' : '−') + rp(Math.abs(nB - nL)).replace('Rp ', 'Rp ')}</b></div><div><small>Item diubah</small><b>${ub.length}</b></div>${lb.length ? `<div class="err"><small>Melebihi kontrak</small><b>${lb.length} item</b></div>` : ''}</div>
      <div class="mp299-isi">${M.langkah === 1 ? langkah1() : M.langkah === 2 ? langkah2() : langkah3()}</div>
      <footer>${M.hasil ? '<span></span><button class="btn btn-sm btn-primary" onclick="mp299Tutup()">Selesai</button>' : `${M.langkah > 1 ? `<button class="btn btn-sm btn-light border" onclick="mp299Langkah(${M.langkah - 1})"><i class="fas fa-arrow-left me-1"></i>Kembali</button>` : '<span></span>'}
        <div class="d-flex gap-2">${M.langkah === 1 ? `<button class="btn btn-sm btn-primary" ${adaUbah(M) ? '' : 'disabled'} onclick="mp299Langkah(2)">Lanjut: dampak & alasan <i class="fas fa-arrow-right ms-1"></i></button>`
          : M.langkah === 2 ? `<button class="btn btn-sm btn-primary" onclick="mp299Langkah(3)">Lanjut: tinjau & simpan <i class="fas fa-arrow-right ms-1"></i></button>`
          : M.langkah === 3 ? `<button class="btn btn-sm btn-success" id="mp299Simpan" ${cekSimpan().length || M.sibuk ? 'disabled' : ''} onclick="mp299Simpan()"><i class="fas fa-floppy-disk me-1"></i>Simpan koreksi</button>`
          : ''}</div>`}</footer></section>`;
  }
  function langkah1() {
    const rows = M.baris.map((b, k) => {
      if (b.judul) return `<tr class="judul"><td></td><td colspan="11">${E(b.ur)}</td></tr>`;
      const sd = b.lalu + N(b.baru), sisa = b.volBaru - sd, ubah = Math.abs(N(b.baru) - b.ini) > 1e-9 || Math.abs(b.volBaru - b.vol) > 1e-9, lb = b.volBaru > 0 && sd > b.volBaru + 1e-6;
      const imp = M.impor && M.impor.peta[b.id];
      return `<tr class="${ubah ? 'ubah' : ''} ${lb ? 'lebih' : ''}"><td>${k + 1}</td><td class="ur">${E(b.ur)}${imp && imp.vol !== undefined && isFinite(imp.vol) && Math.abs(imp.vol - b.vol) > 1e-6 ? `<div class="mp299-cat">Vol. kontrak di dokumen ${ang(imp.vol)} ≠ aplikasi ${ang(b.vol)} — periksa addendum / Register Kontrak</div>` : ''}${imp && isFinite(imp.lalu) && Math.abs(imp.lalu - b.lalu) > 1e-4 ? `<div class="mp299-cat">"Yang lalu" di dokumen ${ang(imp.lalu)} ≠ aplikasi ${ang(b.lalu)} — periksa BK sebelumnya</div>` : ''}</td>
        <td>${E(b.sat)}</td><td class="n">${M.ubahVol ? `<input type="text" inputmode="decimal" class="form-control form-control-sm mp299-in" data-id="${E(b.id)}" data-k="volBaru" value="${E(String(b.volBaru).replace('.', ','))}" aria-label="Volume kontrak ${E(b.ur)}" onchange="mp299Isi(this)">` : Math.abs(b.volBaru - b.vol) > 1e-9 ? `<s class="text-muted">${ang(b.vol)}</s><br><b>${ang(b.volBaru)}</b>` : ang(b.vol)}</td><td class="n">${ang(b.lalu)}</td><td class="n">${ang(b.ini)}</td>
        <td class="n"><input type="text" inputmode="decimal" class="form-control form-control-sm mp299-in" data-id="${E(b.id)}" value="${E(String(b.baru).replace('.', ','))}" aria-label="Saat ini koreksi ${E(b.ur)}" onchange="mp299Isi(this)"></td>
        <td class="n">${ang(sd)}</td><td class="n ${sisa < -1e-6 ? 'neg' : ''}">${ang(sisa)}</td><td class="n">${ang(b.harga, 0)}</td><td class="n">${ang(N(b.baru) * b.harga, 0)}</td><td class="n ${ubah ? (N(b.baru) > b.ini ? 'naik' : 'turun') : ''}">${ubah ? ang((N(b.baru) - b.ini) * b.harga, 0) : ''}</td></tr>`;
    }).join('');
    return `<div class="mp299-alat">
        <label class="btn btn-sm btn-success mb-0"><i class="fas fa-file-excel me-1"></i>Isi dari Excel dokumen benar…<input type="file" id="mp299File" accept=".xlsx,.xlsm" hidden onchange="mp299Impor(this)"></label>
        <button class="btn btn-sm btn-outline-secondary" onclick="mp299TempelBuka()"><i class="fas fa-paste me-1"></i>Tempel kolom "Saat ini"</button>
        ${M.reg ? `<button class="btn btn-sm ${M.ubahVol ? 'btn-secondary' : 'btn-outline-secondary'}" title="Perbarui volume item di Register Kontrak (addendum, nomor wajib)" onclick="mp299Set('ubahVol', ${!M.ubahVol})"><i class="fas fa-file-signature me-1"></i>Ubah volume kontrak (addendum)</button>` : ''}
        <button class="btn btn-sm btn-light border" onclick="mp299Reset()"><i class="fas fa-rotate-left me-1"></i>Kembalikan</button>
        <span class="mp299-pt">Ubah kolom <b>Saat ini (koreksi)</b>. Baris kuning = berubah, merah = melebihi volume kontrak.</span></div>
      ${M.asing.length ? `<div class="alert alert-warning py-1 px-2 small">BK memuat ${M.asing.length} item yang tidak ada di kontrak (${M.asing.map(E).join(', ')}). Item tersebut akan dihapus dari BK saat koreksi disimpan.</div>` : ''}
      ${M.impor ? panelImpor() : ''}
      <div id="mp299Tempel" hidden class="mp299-tempel"><textarea class="form-control form-control-sm" rows="4" placeholder="Tempel satu angka per baris sesuai urutan item (judul dilewati). Contoh: 0  0  0  0  0  185477,80  65,54  10,80"></textarea>
        <button class="btn btn-sm btn-primary mt-1" onclick="mp299Tempel()">Terapkan</button></div>
      <div class="mp299-gulir"><table class="table table-sm mp299-t"><thead><tr><th>No</th><th>Jenis item</th><th>Sat</th><th class="n">Vol. kontrak</th><th class="n">Yang lalu</th><th class="n">Saat ini tercatat</th><th class="n">Saat ini (koreksi)</th><th class="n">S/d saat ini</th><th class="n">Sisa</th><th class="n">Harga</th><th class="n">Jumlah (koreksi)</th><th class="n">Selisih Rp</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${(M.e.koreksi || []).length ? `<details class="mp299-riw"><summary>Riwayat koreksi BK ini (${M.e.koreksi.length})</summary><ul>${M.e.koreksi.map(k => `<li>${E(String(k.pada).replace('T', ' ').slice(0, 16))} · ${E(k.oleh)} · ${rp(k.nilaiSebelum)} → ${rp(k.nilaiSesudah)} · ${E(k.alasan)} (acuan: ${E(k.acuan)})</li>`).join('')}</ul></details>` : ''}`;
  }
  function panelImpor() {
    const I = M.impor, opsi = id => `<option value="">(abaikan)</option>` + M.baris.filter(b => !b.judul).map(b => `<option value="${E(b.id)}" ${b.id === id ? 'selected' : ''}>${E(b.ur.slice(0, 60))} · ${ang(b.harga, 0)}</option>`).join('');
    return `<div class="mp299-impor"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><b><i class="fas fa-file-excel me-1"></i>${E(I.nama)} · sheet "${E(I.tabel.sheet)}" · ${I.cocok.length} baris</b>
        <span>${I.semua.length > 1 ? `<select class="form-select form-select-sm d-inline-block w-auto" onchange="mp299ImporSheet(this.value)">${I.semua.map((t, i) => `<option value="${i}" ${t === I.tabel ? 'selected' : ''}>${E(t.sheet)} (${t.data.length} baris)</option>`).join('')}</select>` : ''}
        ${M.reg ? `<label class="form-check form-check-inline small mb-0"><input type="checkbox" class="form-check-input" ${M.ikutVol ? 'checked' : ''} onchange="mp299Set('ikutVol', this.checked)"> ikut perbarui volume kontrak yang berbeda (addendum)</label>` : ''}
        <button class="btn btn-sm btn-primary" onclick="mp299ImporTerap()"><i class="fas fa-check me-1"></i>Terapkan ke kolom koreksi</button> <button class="btn btn-sm btn-light border" onclick="mp299ImporBatal()">Tutup</button></span></div>
      <div class="mp299-gulir kecil"><table class="table table-sm mp299-t"><thead><tr><th>Baris Excel</th><th>Uraian di dokumen</th><th class="n">Harga</th><th class="n">Saat ini</th><th>Item kontrak di aplikasi</th><th>Kecocokan</th></tr></thead><tbody>
      ${I.cocok.map((c, k) => `<tr class="${c.yakin === 'tidak' || c.yakin === 'rendah' ? 'lebih' : ''}"><td>${c.x.baris}</td><td>${E(c.x.ur)}</td><td class="n">${ang(c.x.harga, 0)}</td><td class="n">${ang(c.x.ini)}</td>
        <td><select class="form-select form-select-sm" onchange="mp299ImporPeta(${k}, this.value)">${opsi(c.id)}</select></td><td><span class="mp299-b ${c.yakin === 'tinggi' ? 'ok' : c.yakin === 'sedang' ? '' : 'warn'}">${c.yakin}</span></td></tr>`).join('')}</tbody></table></div>
      ${(() => { const ada = new Set(I.cocok.map(c => c.id).filter(Boolean)), kurang = M.baris.filter(b => !b.judul && !ada.has(b.id)); return kurang.length ? `<div class="small text-muted mt-1">${kurang.length} item kontrak tidak ada di dokumen (nilai koreksinya tidak diubah): ${kurang.map(b => E(b.ur.slice(0, 40))).join('; ')}</div>` : ''; })()}</div>`;
  }
  function dampak() {
    const e = M.e, out = [], lb = lebih(M), bayar = S(e.bayar && e.bayar.status || 'BELUM').toUpperCase(), pk = M.paket;
    out.push(['info', 'Nomor BA tetap <b>' + E(e.nomorBA) + '</b>; BK menjadi revisi ke-' + (N(e.revisi) + 1) + ' dan tercatat di jejak audit (sebelum → sesudah per item).']);
    if (e.baTerbit) out.push(['warn', 'BA sudah terbit: cetak ulang BAPM/BAPP & BAP dari Paket Tagihan setelah koreksi, lalu minta tanda tangan ulang bila dokumen lama sudah ditandatangani.']);
    if (['DIBAYAR', 'PROSES', 'PROSES PEMBAYARAN'].indexOf(bayar) >= 0) out.push(['err', 'Tagihan sudah ' + bayar + ': koreksi ditolak. Buat penyesuaian pada BA termin berikutnya.']);
    else if (bayar === 'DIAJUKAN') out.push(['err', 'Tagihan sudah DIAJUKAN di Keuangan & Bayar: kembalikan status bayar ke Belum/Ditunda terlebih dahulu.']);
    if (M.sesudah.length) out.push([admin() ? 'warn' : 'err', 'Ada BK sesudahnya (' + M.sesudah.map(x => E(x.nomorBA)).join(', ') + '): "yang lalu" pada BK tersebut ikut berubah. ' + (admin() ? 'Cetak ulang BA terkait.' : 'Hanya Admin yang dapat mengoreksi BK lama.')]);
    if (pk) out.push([['SIAP DIPERIKSA', 'TERVERIFIKASI'].indexOf(pk.statusEfektif) >= 0 ? (admin() ? 'warn' : 'err') : ['DIAJUKAN', 'PROSES PEMBAYARAN', 'DIBAYAR'].indexOf(pk.statusEfektif) >= 0 ? 'err' : 'info',
      'Paket ' + E(pk.id) + ' (' + E(pk.statusEfektif) + ') dihitung ulang otomatis' + (['SIAP DIPERIKSA', 'TERVERIFIKASI'].indexOf(pk.statusEfektif) >= 0 ? (admin() ? ' dan dikembalikan ke REVISI (Admin)' : ' — hanya Admin (paket dikembalikan ke Revisi)') : '') + '; PDF lama ditandai Perlu Revisi. Excel backup disusun ulang.']);
    else if (M.paket === null) out.push(['info', 'BK belum memiliki paket tagihan: hanya BK yang dikoreksi.']);
    const uv = ubahVolKontrak(M); if (uv.length) { const nk0 = M.baris.reduce((a, b) => a + b.vol * b.harga, 0), nk1 = M.baris.reduce((a, b) => a + b.volBaru * b.harga, 0);
      out.push(['warn', 'Volume kontrak di Register Kontrak diperbarui (addendum, nomor wajib): ' + uv.map(b => E(b.ur.slice(0, 40)) + ' ' + ang(b.vol) + ' → ' + ang(b.volBaru)).join('; ') + '. Nilai kontrak ' + rp(nk0) + ' → ' + rp(nk1) + '.']); }
    if (lb.length) out.push(['err', lb.length + ' item melebihi volume kontrak: ' + lb.map(b => E(b.ur.slice(0, 40)) + ' (s/d ' + ang(b.lalu + N(b.baru)) + ' > ' + ang(b.vol) + ')').join('; ') + '. Wajib nomor addendum; perbarui juga volume item di Register Kontrak agar sisa volume & Excel benar.']);
    return out;
  }
  function langkah2() {
    const D = dampak();
    return `<div class="mp299-dampak">${D.map(([t, m]) => `<div class="mp299-d ${t}"><i class="fas ${t === 'err' ? 'fa-circle-xmark' : t === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-info'} me-2"></i>${m}</div>`).join('')}</div>
      <div class="row g-2 mt-1">
        <div class="col-12"><label class="form-label small fw-bold" for="mp299Alasan">Alasan koreksi <span class="text-danger">*</span></label>
          <textarea id="mp299Alasan" class="form-control form-control-sm" rows="2" placeholder="mis. Volume SPP Ø702 (185.477,80 kg) & Cat Coating (65,54 m²) pada BAPM 02 belum diinput di BK" oninput="mp299Set('alasan', this.value)">${E(M.alasan)}</textarea><div class="form-text">Minimal 15 karakter. Tercatat di jejak audit.</div></div>
        <div class="col-md-7"><label class="form-label small fw-bold" for="mp299Acuan">Dokumen acuan <span class="text-danger">*</span></label>
          <input id="mp299Acuan" class="form-control form-control-sm" value="${E(M.acuan)}" placeholder="mis. BAPM 02 bertanda tangan 17/07/2026" oninput="mp299Set('acuan', this.value)"></div>
        <div class="col-md-5"><label class="form-label small fw-bold" for="mp299Add">No. addendum ${lebih(M).length || ubahVolKontrak(M).length ? '<span class="text-danger">*</span>' : '(bila ada)'}</label>
          <input id="mp299Add" class="form-control form-control-sm" value="${E(M.noAdd)}" placeholder="mis. ADD-01/SPPM/2026" oninput="mp299Set('noAdd', this.value)"></div>
        <div class="col-12"><label class="form-check small"><input type="checkbox" class="form-check-input" ${M.yakin ? 'checked' : ''} onchange="mp299Set('yakin', this.checked)"> Saya sudah mencocokkan volume koreksi dengan dokumen fisik / dokumen bertanda tangan.</label></div></div>`;
  }
  function cekSimpan() {
    const g = [], D = dampak();
    if (!adaUbah(M)) g.push('Belum ada volume yang diubah.');
    if (ubahVolKontrak(M).length && S(M.noAdd).length < 3) g.push('Nomor addendum wajib karena volume kontrak diubah.');
    if (S(M.alasan).length < 15) g.push('Alasan koreksi minimal 15 karakter.');
    if (S(M.acuan).length < 3) g.push('Dokumen acuan wajib.');
    if (lebih(M).length && S(M.noAdd).length < 3) g.push('Nomor addendum wajib karena volume melebihi kontrak.');
    if (!M.yakin) g.push('Centang konfirmasi pencocokan dokumen.');
    if (nilaiDari(M, 'baru') <= 0) g.push('Nilai BK koreksi Rp 0.');
    if (M.baris.some(b => !b.judul && (!isFinite(N(b.baru)) || N(b.baru) < 0))) g.push('Ada volume tidak valid / negatif.');
    D.filter(d => d[0] === 'err' && !/melebihi volume kontrak/.test(d[1])).forEach(d => g.push(d[1].replace(/<[^>]+>/g, '')));
    if (!srv('koreksiBK')) g.push('Modul server 1.10.5 belum aktif (fitur koreksiBK).');
    return g;
  }
  function langkah3() {
    const ub = berubah(M), g = cekSimpan();
    if (M.hasil) {
      const h = M.hasil;
      return `<div class="mp299-sukses"><i class="fas fa-circle-check"></i><div><b>Koreksi tersimpan.</b> ${E(M.e.nomorBA)} · ${rp(h.koreksi.nilaiSebelum)} → <b>${rp(h.koreksi.nilaiSesudah)}</b>${h.paket ? ` · paket ${E(h.paket.id)} Rev. ${E(h.paket.revisi)} · total tagihan ${rp(h.paket.hasil.totalTagihan)}` : ''}.
        ${h.register ? '<div class="small mt-1">Register Kontrak diperbarui (addendum ' + E(M.noAdd) + ').</div>' : ''}<div class="small mt-1">Excel backup sedang disusun ulang. Langkah berikutnya: buka Paket Tagihan → Pratinjau & Cetak PDF → tanda tangan ulang dokumen yang berubah.</div>
        <div class="d-flex gap-2 mt-2">${h.paket ? `<button class="btn btn-sm btn-primary" onclick="mp299Tutup(); mp270Buka(${E(JSON.stringify(M.e.noKontrak))}, ${E(JSON.stringify(M.e.id))})">Buka Paket Tagihan</button>` : ''}<button class="btn btn-sm btn-outline-success" onclick="mp298Unduh(${E(JSON.stringify(M.e.id))}, this)"><i class="fas fa-file-excel me-1"></i>Unduh Excel baru</button></div></div></div>`;
    }
    return `<table class="table table-sm mp299-t"><thead><tr><th>Item</th><th class="n">Saat ini tercatat</th><th class="n">Koreksi</th><th class="n">Selisih Rp</th></tr></thead><tbody>
      ${ub.map(b => `<tr><td>${E(b.ur)}</td><td class="n">${ang(b.ini)}</td><td class="n"><b>${ang(N(b.baru))}</b></td><td class="n">${ang((N(b.baru) - b.ini) * b.harga, 0)}</td></tr>`).join('')}</tbody></table>
      ${ubahVolKontrak(M).length ? `<div class="small mb-1"><b>Addendum volume kontrak:</b> ${ubahVolKontrak(M).map(b => E(b.ur.slice(0, 50)) + ' ' + ang(b.vol) + ' → <b>' + ang(b.volBaru) + '</b>').join('; ')}</div>` : ''}
      <div class="small"><b>Alasan:</b> ${E(M.alasan) || '-'} · <b>Acuan:</b> ${E(M.acuan) || '-'}${M.noAdd ? ' · <b>Addendum:</b> ' + E(M.noAdd) : ''}</div>
      ${g.length ? `<div class="alert alert-warning py-1 px-2 small mt-2 mb-0"><b>Belum dapat disimpan:</b><ul class="mb-0">${g.map(x => `<li>${E(x)}</li>`).join('')}</ul></div>` : '<div class="alert alert-success py-1 px-2 small mt-2 mb-0">Siap disimpan.</div>'}`;
  }
  async function muatPaket() {
    if (M.paket !== undefined || !srv('paketTagihan')) return;
    try { const L = (await kirim('blDaftar', { noKontrak: M.e.noKontrak, per: 200 })).data || []; M.paket = L.find(x => x.progresId === M.e.id && x.status !== 'BATAL') || null; } catch (e) { M.paket = undefined; }
  }
  Object.assign(window, {
    mp299Langkah: async n => { if (!M) return; if (n > 1 && !adaUbah(M)) { pesan('Ubah minimal satu volume terlebih dahulu.', 'warning'); return; } M.langkah = n; if (n >= 2) await muatPaket(); gambar(); },
    mp299Set: (k, v) => { if (!M) return; M[k] = v; if (k === 'yakin' || k === 'ubahVol') gambar(); },
    mp299Isi: el => { const b = M.baris.find(x => x.id === el.dataset.id); const v = angka(el.value), k = el.dataset.k || 'baru'; if (!b) return; if (!isFinite(v) || v < 0 || (k === 'volBaru' && v <= 0)) { el.classList.add('is-invalid'); pesan('Volume tidak valid: ' + el.value, 'err'); return; } b[k] = bulat4(v); gambar(); },
    mp299Reset: () => { M.baris.forEach(b => { b.baru = b.ini; b.volBaru = b.vol; }); M.impor = null; gambar(); },
    mp299TempelBuka: () => { const t = $('mp299Tempel'); if (t) t.hidden = !t.hidden; },
    mp299Tempel: () => {
      const t = $('mp299Tempel'); const nilai = S(t.querySelector('textarea').value).split(/[\r\n\t;]+/).map(S).filter(x => x !== '').map(angka), it = M.baris.filter(b => !b.judul);
      if (nilai.some(v => !isFinite(v) || v < 0)) { pesan('Ada nilai yang tidak dapat dibaca sebagai angka.', 'err'); return; }
      if (nilai.length !== it.length && !confirm('Jumlah angka (' + nilai.length + ') berbeda dengan jumlah item (' + it.length + '). Terapkan berurutan sebanyak yang ada?')) return;
      it.forEach((b, k) => { if (k < nilai.length) b.baru = bulat4(nilai[k]); }); gambar();
    },
    mp299Impor: async inp => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try { const tabel = await bacaTabelExcel(new Uint8Array(await f.arrayBuffer())); M.impor = { nama: f.name, semua: tabel, tabel: tabel[0], cocok: cocokkan(M, tabel[0].data) }; petaImpor(); gambar(); }
      catch (e) { pesan('Excel tidak dapat dibaca: ' + e.message, 'err'); }
    },
    mp299ImporSheet: i => { const t = M.impor.semua[Number(i)]; M.impor.tabel = t; M.impor.cocok = cocokkan(M, t.data); petaImpor(); gambar(); },
    mp299ImporPeta: (k, id) => { const c = M.impor.cocok[k]; M.impor.cocok.forEach((x, j) => { if (j !== k && id && x.id === id) x.id = ''; }); c.id = id; c.yakin = id ? 'manual' : 'tidak'; petaImpor(); gambar(); },
    mp299ImporTerap: () => {
      const n = M.impor.cocok.filter(c => c.id).length;
      let nv = 0; M.impor.cocok.forEach(c => { if (!c.id) return; const b = M.baris.find(x => x.id === c.id); if (!b) return; b.baru = bulat4(c.x.ini);
        if (M.reg && M.ikutVol && isFinite(c.x.vol) && c.x.vol > 0 && Math.abs(c.x.vol - b.vol) > 1e-6) { b.volBaru = bulat4(c.x.vol); nv++; } });
      if (nv) pesan(nv + ' volume kontrak berbeda dari dokumen → diisi sebagai addendum (nomor addendum wajib di langkah 2).', 'warning');
      pesan(n + ' item diisi dari ' + M.impor.nama + '. Periksa baris kuning/merah sebelum lanjut.', 'ok'); M.impor.terap = true; gambar();
    },
    mp299ImporBatal: () => { M.impor = null; gambar(); },
    mp299Simpan: async () => {
      const g = cekSimpan(); if (g.length) { pesan(g[0], 'err'); return; }
      M.sibuk = true; gambar();
      const items = {}; M.baris.forEach(b => { if (!b.judul && N(b.baru) > 0) items[b.id] = bulat4(b.baru); });
      try {
        const volKontrak = {}; ubahVolKontrak(M).forEach(b => { volKontrak[b.id] = bulat4(b.volBaru); });
        const r = await kirim('koreksiBK', { id: M.e.id, versi: M.e.versi, items, volKontrak, nilai: Math.round(nilaiDari(M, 'baru') * 100) / 100, alasan: S(M.alasan), acuan: S(M.acuan), noAddendum: S(M.noAdd), kunciIdem: M.kunci || (M.kunci = kunciIdem()) });
        M.hasil = r; M.sibuk = false;
        try { const L = progres(), i = L.findIndex(x => x.id === r.data.id); if (i >= 0) L[i] = r.data; } catch (e) { }
        try { if (typeof window.muatRegister === 'function') await window.muatRegister(); } catch (e) { }   // Register (addendum) & BK terbaru sebelum Excel disusun ulang
        try { if (window.MP298 && window.MP298.jadwalkan) window.MP298.jadwalkan(r.data.id, { entri: r.data, sumber: 'KOREKSI', jeda: 300 }); } catch (e) { }
        try { if (window.MP280) window.MP280.daftar = null; } catch (e) { }
        pesan('Koreksi ' + r.data.nomorBA + ' tersimpan: ' + rp(r.koreksi.nilaiSebelum) + ' → ' + rp(r.koreksi.nilaiSesudah) + '.', 'ok');
        M.e = r.data; M.langkah = 3; gambar(); cekGambar();
      } catch (e) { M.sibuk = false; pesan(e.message, 'err'); gambar(); }
    }
  });
  function petaImpor() {   // ringkasan per item untuk catatan beda volume kontrak / yang lalu
    const P = {}; M.impor.cocok.forEach(c => { if (c.id) P[c.id] = c.x; }); M.impor.peta = P;
  }

  /* ======================= B. Cek Tagihan ======================= */
  const C = { data: null, saring: 'temuan', cari: '' };
  async function periksaSemua() {
    let paket = []; try { if (srv('paketTagihan')) paket = (await kirim('blDaftar', { per: 1000 })).data || []; } catch (e) { }
    const pk = {}; paket.filter(x => x.status !== 'BATAL').forEach(x => { pk[x.progresId] = x; });
    const L = progres();
    return L.slice().sort((a, b) => String(a.noKontrak).localeCompare(String(b.noKontrak)) || N(a.tagihanKe) - N(b.tagihanKe)).map(e => {
      const g = kontrakDari(e.noKontrak), t = [];
      if (!g) return { e, g: null, t: [['err', 'Kontrak tidak ditemukan']], nilaiHitung: 0, pk: pk[e.id] || null };
      let M2; try { M2 = model(e.id); } catch (er) { return { e, g, t: [['err', er.message]], nilaiHitung: 0, pk: pk[e.id] || null }; }
      const nh = nilaiDari(M2, 'ini');
      if (Math.abs(nh - N(e.nilai)) > 1) t.push(['err', 'Nilai BK ' + rp(e.nilai) + ' ≠ Σ volume × harga ' + rp(nh)]);
      lebih(M2).forEach(b => t.push(['err', 'Melebihi kontrak: ' + b.ur.slice(0, 40) + ' (s/d ' + ang(b.lalu + b.ini) + ' > ' + ang(b.vol) + ')']));
      M2.baris.filter(b => !b.judul && b.ini > 0 && !(b.harga > 0)).forEach(b => t.push(['warn', 'Harga 0: ' + b.ur.slice(0, 40)]));
      if (M2.asing.length) t.push(['warn', M2.asing.length + ' item BK tidak ada di kontrak']);
      const p = pk[e.id];
      if (p && p.prestasi && Math.abs(N(p.prestasi.ini) - N(e.nilai)) > 1) t.push(['warn', 'Paket ' + p.id + ': prestasi ' + rp(p.prestasi.ini) + ' ≠ BK ' + rp(e.nilai) + ' (buka paket → Simpan untuk hitung ulang)']);
      if (p && p.backupWajib && !p.backupExcel) t.push(['info', 'Excel backup belum ada']);
      if (!e.baTerbit) t.push(['info', 'BA belum terbit']);
      if ((e.koreksi || []).length) t.push(['ok', e.koreksi.length + '× dikoreksi']);
      return { e, g, t, nilaiHitung: nh, pk: p || null };
    });
  }
  function cekTutup() { const w = $('mp299Cek'); if (w) w.remove(); }
  window.mp299CekTutup = cekTutup;
  window.mp299Cek = async () => {
    cekTutup();
    const w = document.createElement('div'); w.id = 'mp299Cek'; w.className = 'mp270-latar atas mp299-latar';
    w.innerHTML = `<section class="mp270-dlg mp299-dlg lebar" role="dialog" aria-modal="true" aria-label="Cek tagihan"><header><div><b><i class="fas fa-magnifying-glass-chart me-2"></i>Cek & Koreksi Tagihan</b><div class="mp299-sub">Pemeriksaan otomatis seluruh BK. Untuk kesalahan input yang tidak tampak dari angka (mis. item terlewat), gunakan <b>Bandingkan Excel</b> dengan dokumen bertanda tangan.</div></div><button class="btn-close" aria-label="Tutup" onclick="mp299CekTutup()"></button></header>
      <div class="mp299-isi" id="mp299CekIsi"><div class="text-muted p-3"><i class="fas fa-spinner fa-spin me-2"></i>Memeriksa…</div></div></section>`;
    w.addEventListener('keydown', ev => { if (ev.key === 'Escape') cekTutup(); });
    document.body.appendChild(w);
    try { C.data = await periksaSemua(); } catch (e) { C.data = []; pesan(e.message, 'err'); }
    cekGambar();
  };
  function cekGambar() {
    const el = $('mp299CekIsi'); if (!el || !C.data) return;
    try { C.data = C.data.map(x => { const e = progres().find(y => y.id === x.e.id); return e && e !== x.e ? Object.assign({}, x, { e }) : x; }); } catch (e) { }
    const q = C.cari.toLowerCase(), L = C.data.filter(x => (C.saring === 'semua' || (C.saring === 'temuan' ? x.t.some(t => t[0] === 'err' || t[0] === 'warn') : x.t.some(t => t[0] === 'ok'))) &&
      (!q || [x.e.nomorBA, x.e.noKontrak, x.g && x.g.namaVendor, x.e.periode].join(' ').toLowerCase().includes(q)));
    const nT = C.data.filter(x => x.t.some(t => t[0] === 'err' || t[0] === 'warn')).length, nK = C.data.filter(x => x.t.some(t => t[0] === 'ok')).length;
    const tombol = (k, l, n) => `<button type="button" class="reg-chip ${C.saring === k ? 'aktif' : ''}" onclick="mp299CekSaring('${k}')">${l}<span class="n">${n}</span></button>`;
    el.innerHTML = `<div class="d-flex flex-wrap gap-2 align-items-center mb-2">${tombol('temuan', 'Perlu dicek', nT)}${tombol('koreksi', 'Sudah dikoreksi', nK)}${tombol('semua', 'Semua BK', C.data.length)}
      <input type="search" class="form-control form-control-sm ms-auto" style="max-width:260px" placeholder="Cari BA, kontrak, vendor…" value="${E(C.cari)}" oninput="mp299CekCari(this.value)">
      <button class="btn btn-sm btn-outline-secondary" onclick="mp299CekCsv()"><i class="fas fa-download me-1"></i>CSV</button><button class="btn btn-sm btn-light border" title="Periksa ulang" onclick="mp299Cek()"><i class="fas fa-rotate"></i></button></div>
      <div class="mp299-gulir besar"><table class="table table-sm mp299-t"><thead><tr><th>BK / No BA</th><th>Kontrak · vendor</th><th>Periode</th><th class="n">Nilai BK</th><th>Temuan</th><th></th></tr></thead><tbody>
      ${L.length ? L.map(x => `<tr><td><code>${E(x.e.nomorBA || '-')}</code><div class="small text-muted">ke-${E(x.e.tagihanKe)} ${x.e.baTerbit ? '· BA terbit' : ''}</div></td><td class="small"><span class="font-monospace">${E(x.e.noKontrak)}</span><div class="text-muted">${E(x.g ? x.g.namaVendor : '')}</div></td>
        <td>${E(x.e.periode || '')}</td><td class="n">${rp(x.e.nilai)}</td><td>${x.t.length ? x.t.map(t => `<span class="mp299-b ${t[0]}">${E(t[1])}</span>`).join(' ') : '<span class="mp299-b ok">tidak ada temuan</span>'}</td>
        <td class="text-nowrap">${boleh() && x.g ? `<button class="btn btn-sm btn-outline-primary py-0" onclick="mp299Koreksi(${E(JSON.stringify(x.e.id))})"><i class="fas fa-pen me-1"></i>Koreksi</button> <button class="btn btn-sm btn-outline-success py-0" title="Bandingkan dengan Excel dokumen bertanda tangan" onclick="mp299Koreksi(${E(JSON.stringify(x.e.id))}, true)"><i class="fas fa-file-excel me-1"></i>Bandingkan Excel</button>` : ''}</td></tr>`).join('')
        : '<tr><td colspan="6" class="text-center text-muted py-4">Tidak ada BK pada saringan ini.</td></tr>'}</tbody></table></div>`;
  }
  Object.assign(window, {
    mp299CekSaring: k => { C.saring = k; cekGambar(); },
    mp299CekCari: v => { C.cari = v; clearTimeout(C._t); C._t = setTimeout(cekGambar, 200); },
    mp299CekCsv: () => {
      const sel = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const rows = [['No BA', 'Tagihan ke', 'No Kontrak', 'Vendor', 'Periode', 'Nilai BK', 'Σ volume × harga', 'BA terbit', 'Temuan']].concat((C.data || []).map(x => [x.e.nomorBA, x.e.tagihanKe, x.e.noKontrak, x.g ? x.g.namaVendor : '', x.e.periode, Math.round(N(x.e.nilai)), Math.round(x.nilaiHitung), x.e.baTerbit ? 'ya' : 'tidak', x.t.map(t => t[1]).join(' | ')]));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿sep=;\n' + rows.map(r => r.map(sel).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'cek-tagihan-' + pid() + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
  });

  /* ======================= pintu masuk ======================= */
  function pasang() {
    // Paket Tagihan: bar Excel backup (MP298)
    const bar = $('mp298Aksi');
    if (bar && boleh() && !bar.querySelector('.mp299-btn')) {
      let T = null; try { T = window.mp270Aktif && window.mp270Aktif(); } catch (e) { }
      const id = T && T.l && T.l.progresId;
      if (id) bar.insertAdjacentHTML('afterbegin', `<button type="button" class="btn btn-sm btn-warning mp299-btn" title="Koreksi volume BK (juga BA yang sudah terbit) dengan jejak audit" onclick="mp299Koreksi(${E(JSON.stringify(id))})"><i class="fas fa-pen-to-square me-1"></i>Koreksi BK</button>`);
    }
    // Pembentuk Tagihan: tombol Cek & Koreksi + per baris
    const isi = $('mp280Isi');
    if (isi && boleh()) {
      const kepala = isi.querySelector('.card .d-flex');
      if (kepala && !kepala.querySelector('.mp299-cek')) kepala.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm btn-warning mp299-cek" onclick="mp299Cek()"><i class="fas fa-magnifying-glass-chart me-1"></i>Cek & Koreksi Tagihan</button>');
      isi.querySelectorAll('tr[data-id]').forEach(tr => {
        const td = tr.lastElementChild; if (!td || td.querySelector('.mp299-kr')) return;
        td.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-sm btn-outline-warning py-0 ms-1 mp299-kr" title="Koreksi BK" onclick="mp299Koreksi(${E(JSON.stringify(tr.dataset.id))})"><i class="fas fa-pen-to-square"></i></button>`);
      });
    }
  }
  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(() => { try { pasang(); } catch (e) { } }, 300); };
  const awasi = () => { if (!document.body) return; new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length && ![...x.addedNodes].every(n => n.nodeType === 1 && n.closest && n.closest('#mp299Lapis, #mp299Cek')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); jadwal(); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
  window.MP299 = { model, bacaTabelExcel, cocokkan, angka, periksaSemua };
})();
