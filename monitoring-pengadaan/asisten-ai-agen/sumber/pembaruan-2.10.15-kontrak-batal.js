/* MP21015 — PO CANCEL / HOLD: PEMBATALAN KONTRAK SOFT-DELETE BERAUDIT (2.10.15; Modul server 1.10.15 · fitur "kontrakBatal")
 *  1. Register Kontrak: tombol batal (fa-ban) seragam di SETIAP baris kontrak — Master maupun Register (Pengadaan/Admin).
 *     Tombol "Batalkan kontrak / PO" Admin dari 2.10.11 (arsip lalu hapus dari Register) pada baris yang sama dialihkan ke dialog ini,
 *     sehingga kartu kontrak tidak lagi hilang dari daftar. Status berlaku per keluarga kontrak (kontrak awal + addendumnya).
 *  2. Dialog "Batalkan / tahan PO": pilih PO CANCEL (batal, item Bon dilepas) atau HOLD (ditahan sementara) + alasan wajib.
 *     Data kontrak tidak dihapus: status, pengguna, waktu & alasan tersimpan di sheet <ID>_KontrakStatus beserta riwayatnya.
 *  3. Baris kontrak yang dibatalkan / ditahan tetap tampil dengan badge "PO CANCEL" / "HOLD", alasan & pelaku; tombol aksi dikunci.
 *     Klik baris → riwayat status; pemulihan: HOLD oleh Pengadaan/Admin, PO CANCEL oleh Admin.
 *  4. Item Bon Permintaan kontrak PO CANCEL dilepas: alokasi dibatalkan server; tautan No Bon item kontrak tidak lagi dihitung
 *     sebagai "sudah dikontrakkan" di aplikasi (data kontrak di server tetap utuh, tautan asal disimpan di noPermintaanAsal). */
(function () {
  'use strict';
  if (window.__MP21015__) return; window.__MP21015__ = true;
  const $ = id => document.getElementById(id);
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ambil = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined || v === null ? fb : v; } catch (e) { return fb; } };
  const sesi = () => ambil('REG', {}).sesi || null;
  const srv = () => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv('kontrakBatal'); } catch (e) { return false; } };
  const kabar = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || 'ok'); } catch (e) { } };
  const pengadaan = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN')); };
  const admin = () => { const s = sesi(); return !!(s && s.admin); };
  const LABEL = { CANCELLED: 'PO CANCEL', HOLD: 'HOLD', AKTIF: 'AKTIF' };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const waktu = t => { const d = new Date(S(t)); if (isNaN(d)) return '-'; const w = new Date(d.getTime() + 7 * 3600000), dua = n => String(n).padStart(2, '0');   // WIB
    return w.getUTCDate() + ' ' + BLN[w.getUTCMonth()] + ' ' + w.getUTCFullYear() + ' ' + dua(w.getUTCHours()) + '.' + dua(w.getUTCMinutes()) + ' WIB'; };
  const rp = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  /* ---------- data status ---------- */
  const KS = { peta: {}, siap: false, muat: false, kunci: '', gagal: 0 };
  window.MP21015 = KS;
  const kunciMati = r => !!r && (r.status === 'CANCELLED' || r.status === 'HOLD');
  const induk = no => { const t = S(no); let m = /^ADD-?\d+\/(.+)$/i.exec(t); if (m) return m[1]; m = /^([^\/]+)\/ADD-?\d+\/(.+)$/i.exec(t); return m ? m[1] + '/' + m[2] : t; };   // = sbNomor(no).induk di server
  window.mp21015Status = no => { const r = KS.peta[induk(no)]; return kunciMati(r) ? r : null; };
  async function muat(paksa) {
    const s = sesi(); if (!s || !srv() || KS.muat) return;
    const kunci = S(ambil('PROYEK', {}).id) + '|' + s.nama;
    if (KS.kunci !== kunci) { KS.kunci = kunci; KS.peta = {}; KS.siap = false; KS.gagal = 0; }
    if (!paksa && (KS.siap || (KS.gagal && Date.now() - KS.gagal < 60000))) return;
    KS.muat = true;
    try { const r = await window.regAksi('kontrakStatusBaca', {}); if (KS.kunci !== kunci) return; const p = {}; (r.data || []).forEach(x => { p[x.noKontrak] = x; }); KS.peta = p; KS.siap = true; KS.gagal = 0; }
    catch (e) { KS.gagal = Date.now(); }
    finally { KS.muat = false; tunda(); }
  }
  window.mp21015Muat = muat;

  /* ---------- 4. lepas tautan Bon kontrak PO CANCEL (di memori; data server tidak diubah) ---------- */
  function lepasBon() {
    let ubah = 0;
    const olah = (no, items, kol) => { const batal = (KS.peta[induk(no)] || {}).status === 'CANCELLED';
      (items || []).forEach(it => kol.forEach(k => {
        if (batal && S(it[k])) { it[k + 'Asal'] = it[k]; it[k] = ''; ubah++; }
        else if (!batal && S(it[k + 'Asal']) && !S(it[k])) { it[k] = it[k + 'Asal']; delete it[k + 'Asal']; ubah++; }
      })); };
    (ambil('REG', {}).data || []).forEach(r => olah(r.noKontrak, r.items, ['noPermintaan']));
    (ambil('RINGKASAN', []) || []).forEach(g => olah(g.key, g.items, ['noPermintaan', 'noBonPermintaan']));
    return ubah;
  }

  /* ---------- 1 & 3. baris Register Kontrak ---------- */
  function infoBaris(tr) {
    if (tr.dataset.id) { const r = (ambil('REG', {}).data || []).find(x => x.id === tr.dataset.id); return r ? { no: r.noKontrak, sumber: 'REGISTER', vendor: r.namaVendor, nilai: r.nilai } : null; }
    if (tr.dataset.key) { const g = (ambil('RINGKASAN', []) || []).find(x => x.key === tr.dataset.key); return { no: tr.dataset.key, sumber: 'MASTER', vendor: g ? g.namaVendor : '', nilai: g ? g.nilai : 0 }; }
    return null;
  }
  function hias() {
    const body = $('regBody'); if (!body || !sesi() || !srv()) return;
    body.querySelectorAll('tr.baris-kontrak').forEach(tr => {
      const x = infoBaris(tr); if (!x || !S(x.no)) return;
      const st = window.mp21015Status(x.no), tanda = (st ? st.status + st.versi : 'A') + '|' + (pengadaan() ? 1 : 0);
      if (tr.dataset.mp21015 === tanda) return;
      tr.dataset.mp21015 = tanda; tr.dataset.mp21015No = x.no;
      tr.querySelectorAll('.mp21015-bd, .mp21015-btn').forEach(e => e.remove());
      tr.classList.toggle('mp21015-batal', !!st && st.status === 'CANCELLED'); tr.classList.toggle('mp21015-hold', !!st && st.status === 'HOLD');
      tr.querySelectorAll('button, a.btn').forEach(b => { if (b.dataset.mp21015Kunci) { b.disabled = false; b.classList.remove('disabled'); delete b.dataset.mp21015Kunci; } });
      const td0 = tr.children[0], tdA = tr.lastElementChild;
      if (st) {
        const d = document.createElement('div'); d.className = 'mp21015-bd ' + (st.status === 'CANCELLED' ? 'batal' : 'hold');
        d.innerHTML = `<span class="mp21015-pil"><i class="fas ${st.status === 'CANCELLED' ? 'fa-ban' : 'fa-circle-pause'} me-1"></i>${st.status === 'CANCELLED' ? 'PO CANCEL · Dibatalkan' : 'HOLD · Ditahan'}</span><span class="mp21015-ket">${E(st.oleh)} · ${E(waktu(st.pada))} — ${E(S(st.alasan).slice(0, 90))}${S(st.alasan).length > 90 ? '…' : ''}</span>`;
        if (td0) td0.appendChild(d);
        tr.querySelectorAll('button, a.btn').forEach(b => { if (!b.disabled) { b.disabled = true; b.classList.add('disabled'); b.dataset.mp21015Kunci = '1'; } });
        if (tdA) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-light border mp21015-btn'; b.title = 'Riwayat status kontrak'; b.innerHTML = '<i class="fas fa-clock-rotate-left"></i>'; tdA.appendChild(b); }
      } else if (pengadaan() && tdA) {
        tr.querySelectorAll('button').forEach(b => { if (b.querySelector('.fa-ban, .fa-trash, .fa-trash-can') && !b.classList.contains('mp21015-btn')) { b.dataset.mp21015Alih = '1'; b.title = 'Batalkan / tahan PO (data tidak dihapus)'; } });
        if (!tr.querySelector('[data-mp21015-alih]')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-outline-danger ms-1 mp21015-btn'; b.title = 'Batalkan / tahan PO (data tidak dihapus)'; b.setAttribute('aria-label', 'Batalkan atau tahan PO ' + x.no); b.innerHTML = '<i class="fas fa-ban"></i>'; tdA.appendChild(b); }
      }
    });
  }
  // klik di baris: tombol batal (termasuk tombol hapus bawaan) → dialog soft-delete; baris terkunci → riwayat status
  document.addEventListener('click', ev => {
    const tr = ev.target && ev.target.closest ? ev.target.closest('#regBody tr.baris-kontrak') : null; if (!tr || !tr.dataset.mp21015No || !srv()) return;
    const st = window.mp21015Status(tr.dataset.mp21015No), tb = ev.target.closest('button');
    if (st) { ev.preventDefault(); ev.stopImmediatePropagation(); window.mp21015Riwayat(tr.dataset.mp21015No); return; }
    if (tb && (tb.classList.contains('mp21015-btn') || tb.dataset.mp21015Alih)) { ev.preventDefault(); ev.stopImmediatePropagation(); window.mp21015Batal(tr.dataset.mp21015No); }
  }, true);

  /* ---------- 2. dialog ---------- */
  const tutup = () => { const w = $('mp21015Modal'); if (w) w.remove(); };
  function lapis(html) {
    tutup(); const w = document.createElement('div'); w.id = 'mp21015Modal'; w.className = 'mp273-modal';
    w.innerHTML = '<div class="mp273-kotak" role="dialog" aria-modal="true">' + html + '</div>';
    w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-tutup]')) w.remove(); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape') w.remove(); });
    document.body.appendChild(w); return w;
  }
  const cari = no => { const tr = [...document.querySelectorAll('#regBody tr.baris-kontrak')].find(t => t.dataset.mp21015No === no); return (tr && infoBaris(tr)) || { no, sumber: '', vendor: '', nilai: 0 }; };
  const setelah = async () => { await muat(true); lepasBon(); try { if (window.MP214 && typeof window.mp214Muat === 'function') await window.mp214Muat(true); } catch (e) { } try { if (typeof window.renderRegister === 'function') window.renderRegister(); } catch (e) { } tunda(); };
  window.mp21015Batal = no => {
    if (!pengadaan()) { kabar('Pembatalan PO hanya untuk Pengadaan / Admin.', 'err'); return; }
    const x = cari(no);
    lapis(`<div class="mp273-kepala"><b><i class="fas fa-ban me-1"></i>Batalkan / tahan PO</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi"><div class="mp21015-ktr"><b class="font-monospace">${E(no)}</b><span>${E(x.vendor || '-')} · ${rp(x.nilai)}</span></div>
        <div class="mp21015-opsi"><label><input type="radio" name="mp21015St" value="CANCELLED" checked> <b>PO CANCEL</b> — kontrak dibatalkan. Item Bon Permintaan yang terikat dilepas kembali. Ditolak bila sudah ada tagihan / penerimaan gudang.</label>
          <label><input type="radio" name="mp21015St" value="HOLD"> <b>HOLD</b> — kontrak ditahan sementara. Item Bon tetap terikat; dapat dipulihkan Pengadaan.</label></div>
        <label class="small mt-2" for="mp21015Alasan">Alasan / keterangan * <span class="mp21015-sub">(min. 12 karakter — tercatat untuk audit)</span></label>
        <textarea class="form-control form-control-sm" id="mp21015Alasan" rows="3" maxlength="500" placeholder="mis. Vendor mengundurkan diri sesuai surat no. … tanggal …"></textarea>
        <div class="mp21015-sub mt-2"><i class="fas fa-shield-halved"></i> Data kontrak <b>tidak dihapus</b>: baris tetap tampil berlabel PO CANCEL / HOLD, terkunci, dan tercatat di Log (pengguna, waktu, alasan).</div>
        <div id="mp21015Pesan" class="mp273-pesan" role="status"></div>
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Kembali</button><button type="button" class="btn btn-sm btn-danger" id="mp21015Ok"><i class="fas fa-ban me-1"></i>Terapkan</button></div></div>`);
    $('mp21015Ok').onclick = async () => {
      const b = $('mp21015Ok'), msg = t => { $('mp21015Pesan').textContent = t; }, alasan = S($('mp21015Alasan').value), status = (document.querySelector('input[name="mp21015St"]:checked') || {}).value;
      if (alasan.length < 12) { msg('Isi alasan / keterangan minimal 12 karakter.'); $('mp21015Alasan').focus(); return; }
      b.disabled = true; msg('Menyimpan…');
      try {
        const r = await window.regAksi('kontrakBatal', { data: { noKontrak: no, status, alasan, sumber: x.sumber, namaVendor: x.vendor, nilai: x.nilai } });
        tutup(); kabar('Kontrak ' + no + ' → ' + LABEL[status] + (status === 'CANCELLED' ? ' · ' + ((r.data.bonDilepas || []).length) + ' item Bon dilepas' : '') + '. Data tetap tersimpan untuk audit.', 'ok');
        await setelah();
      } catch (e) { msg(e.message); b.disabled = false; }
    };
    setTimeout(() => { const a = $('mp21015Alasan'); if (a) a.focus(); }, 30);
  };
  window.mp21015Riwayat = no => {
    const st = KS.peta[induk(no)]; if (!st) return;
    const bolehPulih = kunciMati(st) && (st.status === 'HOLD' ? pengadaan() : admin());
    lapis(`<div class="mp273-kepala"><b><i class="fas fa-clock-rotate-left me-1"></i>Status kontrak · ${E(LABEL[st.status])}</b><button type="button" class="btn-close" data-tutup aria-label="Tutup"></button></div>
      <div class="mp273-isi"><div class="mp21015-ktr"><b class="font-monospace">${E(st.nomorBerlaku || no)}</b><span>${E(st.namaVendor || '-')} · ${rp(st.nilai)} · sumber ${E(st.sumber || '-')}${(st.keluarga || []).length > 1 ? ' · mencakup ' + st.keluarga.map(E).join(', ') : ''}</span></div>
        <div class="mp21015-sub mb-2">Kontrak ini terkunci: tidak dapat diubah, diposting, atau ditagihkan selama berstatus ${E(LABEL[st.status])}.</div>
        <table class="mp21015-tb"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Perubahan</th><th>Alasan / keterangan</th></tr></thead><tbody>
        ${(st.riwayat || []).slice().reverse().map(h => `<tr><td class="nw">${E(waktu(h.pada))}</td><td>${E(h.oleh)}</td><td class="nw">${E(LABEL[h.dari] || h.dari)} → <b>${E(LABEL[h.ke] || h.ke)}</b></td><td>${E(h.alasan)}</td></tr>`).join('')}</tbody></table>
        ${(st.bonDilepas || []).length ? `<div class="mp21015-sub mt-2"><b>Item Bon dilepas (${st.bonDilepas.length}):</b> ${st.bonDilepas.slice(0, 12).map(b => E(b.bonNomor + ' #' + b.baris + (b.vol ? ' · ' + b.vol + (b.sat ? ' ' + b.sat : '') : ''))).join('; ')}${st.bonDilepas.length > 12 ? '; …' : ''}</div>` : ''}
        ${bolehPulih ? `<label class="small mt-2" for="mp21015Alasan">Pulihkan kontrak — alasan * <span class="mp21015-sub">(min. 12 karakter)</span></label><textarea class="form-control form-control-sm" id="mp21015Alasan" rows="2" maxlength="500"></textarea>${st.status === 'CANCELLED' ? '<div class="mp21015-sub mt-1">Alokasi Bon yang sudah dibatalkan tidak hidup kembali otomatis — alokasikan ulang bila perlu.</div>' : ''}` : kunciMati(st) ? `<div class="mp21015-sub mt-2">Pemulihan ${st.status === 'CANCELLED' ? 'PO CANCEL hanya oleh Admin' : 'HOLD oleh Pengadaan / Admin'}.</div>` : ''}
        <div id="mp21015Pesan" class="mp273-pesan" role="status"></div>
        <div class="mp273-aksi"><button type="button" class="btn btn-sm btn-light border" data-tutup>Tutup</button>${bolehPulih ? '<button type="button" class="btn btn-sm btn-primary" id="mp21015Pulih"><i class="fas fa-rotate-left me-1"></i>Pulihkan kontrak</button>' : ''}</div></div>`);
    const p = $('mp21015Pulih'); if (p) p.onclick = async () => {
      const msg = t => { $('mp21015Pesan').textContent = t; }, alasan = S($('mp21015Alasan').value);
      if (alasan.length < 12) { msg('Isi alasan pemulihan minimal 12 karakter.'); $('mp21015Alasan').focus(); return; }
      p.disabled = true; msg('Menyimpan…');
      try { await window.regAksi('kontrakPulih', { data: { noKontrak: no, alasan, versi: st.versi } }); tutup(); kabar('Kontrak ' + no + ' dipulihkan (AKTIF).', 'ok'); await setelah(); }
      catch (e) { msg(e.message); p.disabled = false; }
    };
  };

  /* ---------- pemasangan ---------- */
  let _t = 0;
  const jalan = () => { _t = 0; try { if (sesi() && srv() && !KS.siap) muat(false); } catch (e) { } try { lepasBon(); } catch (e) { } try { hias(); } catch (e) { } };
  function tunda() { if (!_t) _t = setTimeout(jalan, 300); }
  if (document.body) new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true }));
  setInterval(() => { if (!document.hidden && sesi() && srv() && $('regBody') && $('regBody').offsetParent !== null) muat(true); }, 5 * 60000);
  tunda();
})();
