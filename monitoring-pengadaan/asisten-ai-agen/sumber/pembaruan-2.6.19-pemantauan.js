/* MP2619 — PEMBARUAN 2.6.19: KESEHATAN & BACKUP (Admin) — butuh Modul server 1.9.4 · fitur "pemantauan" (aditif; tanpa mengubah Code.gs & data)
 * Menu akun › Kesehatan & Backup: status database (sel, Properties), backup terakhir & 5 salinan terbaru, Backup sekarang,
 * Aktifkan jadwal harian (bila belum ada pemicu), email peringatan & jumlah salinan. */
(function () {
  if (window.MP2619) return; window.MP2619 = true;
  const $ = id => document.getElementById(id);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const adm = () => !!(sesi() && sesi().admin);
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const kini = () => (typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || (sesi() && sesi().proyek) || '';
  const tgl = s => { const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const KB = { data: null, galat: '', sibuk: '' };
  async function kirim(action, data) {
    const s = sesi(), f = window.regPost; if (typeof f !== 'function') throw new Error('Koneksi server belum siap.');
    const r = await f(Object.assign({ action, nama: s.nama, pin: s.pin, proyek: kini() }, data === undefined ? {} : { data }));
    if (!r || !r.ok) throw new Error((r && r.error) || 'Gagal menghubungi server.'); return r;
  }
  async function muat() { KB.galat = ''; KB.sibuk = 'muat'; gambar(); try { KB.data = (await kirim('pmStatus')).data; } catch (e) { KB.galat = e.message; } KB.sibuk = ''; gambar(); }
  const baris = (k, v, cls) => `<tr><th>${k}</th><td class="${cls || ''}">${v}</td></tr>`;
  function isi() {
    if (!srv('pemantauan')) return '<div class="mp2619-al">Pasang <b>Modul server 1.9.4</b> (Diagnostik sistem › Modul server) untuk backup &amp; pemantauan otomatis. Code.gs tidak perlu diubah.</div>';
    if (KB.galat) return `<div class="mp2619-al no">${E(KB.galat)}</div><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp2619Muat()">Coba lagi</button>`;
    const d = KB.data; if (!d) return '<p class="mp2619-m"><i class="fas fa-spinner fa-spin me-1"></i>Memuat status…</p>';
    const c = d.cek || {}, b = d.backup || {}, t = b.terakhir, st = d.setelan || {};
    const selCls = c.persenSel >= 85 ? 'no' : c.persenSel >= 70 ? 'warn' : 'ok';
    const bkCls = !t ? 'no' : c.backupJamLalu > 36 ? 'warn' : 'ok';
    return `${(c.masalah || []).length ? `<div class="mp2619-al warn"><b>Perlu perhatian:</b><ul>${c.masalah.map(m => `<li>${E(m)}</li>`).join('')}</ul></div>` : '<div class="mp2619-al ok">Semua pemeriksaan normal.</div>'}
      <table class="mp2619-tb"><tbody>
        ${baris('Pemakaian sel database', `${E(c.persenSel)}% dari 10 juta · ${E((c.sel || 0).toLocaleString('id-ID'))} sel · ${E(c.sheet)} sheet`, selCls)}
        ${baris('Sheet terbesar', E(c.sheetTerbesar || '-'))}
        ${baris('Backup terakhir', t ? `${E(tgl(t.t))} · oleh ${E(t.oleh)}` : 'belum ada', bkCls)}
        ${baris('Jadwal otomatis', c.pemicu > 0 ? `aktif (${E(c.pemicu)} pemicu harian)` : 'belum aktif', c.pemicu > 0 ? 'ok' : 'no')}
        ${baris('Script Properties', E(c.persenProps) + '% dari ±500 KB', c.persenProps >= 80 ? 'warn' : 'ok')}
        ${baris('Email peringatan', `${E(st.email || '-')} · simpan ${E(st.simpan)} salinan`)}
      </tbody></table>
      ${(b.daftar || []).length ? `<p class="mp2619-h">Salinan terbaru${b.folder ? ` · <a href="${E(b.folder)}" target="_blank" rel="noopener">buka folder Drive</a>` : ''}</p><ul class="mp2619-ls">${b.daftar.map(x => `<li><a href="${E(x.url)}" target="_blank" rel="noopener">${E(x.nama)}</a></li>`).join('')}</ul>` : ''}
      <div class="mp2619-ak">
        <button type="button" class="btn btn-primary btn-sm" onclick="mp2619Backup()" ${KB.sibuk ? 'disabled' : ''}>${KB.sibuk === 'backup' ? '<i class="fas fa-spinner fa-spin me-1"></i>Membuat backup…' : '<i class="fas fa-copy me-1"></i>Backup sekarang'}</button>
        ${c.pemicu > 0 ? '' : `<button type="button" class="btn btn-sm mp219-btn-o" onclick="mp2619Jadwal()" ${KB.sibuk ? 'disabled' : ''}><i class="fas fa-clock me-1"></i>Aktifkan jadwal harian (01.00)</button>`}
      </div>
      <details class="mp2619-set"><summary>Setelan peringatan</summary>
        <label>Email penerima <input type="email" id="mp2619Email" class="form-control form-control-sm" value="${E(st.email || '')}" placeholder="kosong = pemilik skrip"></label>
        <label>Jumlah salinan disimpan <input type="number" id="mp2619Simpan" class="form-control form-control-sm" min="3" max="60" value="${E(st.simpan || 14)}"></label>
        <button type="button" class="btn btn-sm mp219-btn-o" onclick="mp2619Setel()">Simpan setelan</button></details>
      <p class="mp2619-m">Backup = salinan seluruh spreadsheet ke folder Drive pribadi pemilik skrip (berisi data pengguna — jangan dibagikan). Berjalan otomatis sekali sehari bersama jadwal notifikasi.</p>`;
  }
  function gambar() {
    const w = $('mp2619Kb'); if (!w) return;
    w.innerHTML = `<div class="mp2619-dlg" role="dialog" aria-modal="true" aria-labelledby="mp2619J"><header><b id="mp2619J"><i class="fas fa-heart-pulse me-2"></i>Kesehatan &amp; Backup</b>
      <button type="button" class="btn-close" aria-label="Tutup" onclick="mp2619Tutup()"></button></header><div class="mp2619-isi">${isi()}</div></div>`;
  }
  window.mp2619Muat = muat;
  window.mp2619Buka = () => {
    if (!adm()) { pesan('Kesehatan & Backup khusus Admin.', 'err'); return; }
    let w = $('mp2619Kb'); if (!w) { w = document.createElement('div'); w.id = 'mp2619Kb'; w.className = 'mp2619-lapis'; w.addEventListener('click', e => { if (e.target === w) window.mp2619Tutup(); }); document.body.appendChild(w); }
    KB.data = null; gambar(); if (srv('pemantauan')) muat();
  };
  window.mp2619Tutup = () => { const w = $('mp2619Kb'); if (w) w.remove(); };
  window.mp2619Backup = async () => { KB.sibuk = 'backup'; gambar(); try { const r = await kirim('pmBackup'); pesan('Backup dibuat: ' + r.data.nama, 'ok'); } catch (e) { pesan('Backup gagal: ' + e.message, 'err'); } KB.sibuk = ''; await muat(); };
  window.mp2619Jadwal = async () => { KB.sibuk = 'jadwal'; gambar(); try { const r = await kirim('pmJadwal'); pesan(r.data.dibuat ? 'Jadwal harian 01.00 diaktifkan.' : 'Jadwal sudah aktif.', 'ok'); } catch (e) { pesan('Gagal: ' + e.message, 'err'); } KB.sibuk = ''; await muat(); };
  window.mp2619Setel = async () => { try { await kirim('pmSetel', { email: ($('mp2619Email') || {}).value || '', simpan: Number(($('mp2619Simpan') || {}).value) || 14 }); pesan('Setelan peringatan disimpan.', 'ok'); await muat(); } catch (e) { pesan('Gagal: ' + e.message, 'err'); } };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('mp2619Kb')) window.mp2619Tutup(); });
  function pasang() {
    if (!adm()) return;
    const dd = document.querySelector('.app-header .menu-akun .dropdown-menu') || document.querySelector('.menu-akun .dropdown-menu');
    if (dd && !$('mp2619Menu')) { const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp2619Menu" onclick="mp2619Buka();return false;"><i class="fas fa-heart-pulse me-2"></i>Kesehatan &amp; Backup</a>'; dd.appendChild(li); }
  }
  let _o = 0;
  const obs = () => { if (!document.body) return; new MutationObserver(() => { if (_o) return; _o = setTimeout(() => { _o = 0; pasang(); }, 500); }).observe(document.body, { childList: true, subtree: true }); pasang(); };
  if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
})();
