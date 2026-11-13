/** Modul E — Pengguna & Pembaruan (khusus Admin, mode berkas). */
(function () {
  'use strict';
  const { fmt, ui, auth, sync } = JIAT;
  const { esc } = fmt;
  const stamp = () => fmt.today().replace(/-/g, '');

  function render(ctx) {
    const users = auth.list(), me = auth.current(), pb = JIAT.pembaruan, aktif = pb.aktif(), gagal = pb.status() === 'gagal';
    return `
    <div class="grid gap-4 xl:grid-cols-5">
      <section class="card xl:col-span-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div><h2 class="font-semibold text-slate-900">Akun pengguna (${users.length})</h2>
            <p class="text-xs text-slate-500">Staf mengisi volume harian, catatan rapat, dan status sumur. Admin juga mengubah master, action plan, stok, akun, dan pembaruan.</p></div>
          <button type="button" id="btn-user-baru" class="btn-primary">${ui.icon('plus')}Tambah akun</button>
        </div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th><th class="no-print"></th></tr></thead>
          <tbody>${users.map((u) => `<tr>
            <td class="font-medium">${esc(u.nama)}${u.id === me.id ? ' <span class="text-xs font-normal text-slate-500">(Anda)</span>' : ''}</td>
            <td class="font-mono text-xs">${esc(u.username)}</td>
            <td>${ui.badge(u.peran === 'admin' ? 'Admin' : 'Staf', u.peran === 'admin' ? 'info' : 'muted', u.peran === 'admin' ? 'shield-check' : 'user')}</td>
            <td>${u.aktif ? ui.badge('Aktif', 'good', 'circle-check') : ui.badge('Nonaktif', 'serious', 'circle-alert')}</td>
            <td class="no-print"><button type="button" class="btn-icon" data-user="${esc(u.id)}" aria-label="Ubah akun ${esc(u.username)}">${ui.icon('pencil')}</button></td></tr>`).join('')}</tbody>
        </table></div>
        <div class="border-t border-slate-200 px-4 py-3">
          <h3 class="label">Bagikan ke staf</h3>
          <p class="text-sm text-slate-600">Setelah menambah atau mengubah akun, kirim ulang salah satu berkas ini agar perangkat staf mengenalinya. Berkas memuat daftar akun (kata sandi tersimpan sebagai hash) dan paket pembaruan yang terpasang — <b>tidak</b> memuat data progres.</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button type="button" id="btn-html-staf" class="btn-primary" ${JIAT.SUMBER_HTML ? '' : 'disabled title="Hanya tersedia pada berkas tunggal dist/JIAT-Monitoring.html"'}>${ui.icon('download')}Unduh HTML untuk staf</button>
            <button type="button" id="btn-paket-staf" class="btn">${ui.icon('download')}Unduh paket akun (JSON)</button>
          </div>
          <p class="mt-2 text-xs text-slate-500"><b>HTML untuk staf</b>: untuk staf baru atau saat mengganti berkas aplikasi — buka, lalu masuk. <b>Paket akun</b>: untuk staf yang sudah memakai aplikasi — dimuat lewat tautan "Muat berkas paket dari Admin" di layar masuk, tanpa mengganti berkas.</p>
        </div>
      </section>

      <section class="card xl:col-span-2">
        <div class="border-b border-slate-200 px-4 py-3"><h2 class="font-semibold text-slate-900">Pembaruan aplikasi</h2>
          <p class="text-xs text-slate-500">Pasang fitur baru dari berkas paket tanpa mengganti berkas HTML.</p></div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
          <dt class="text-slate-500">Aplikasi dasar</dt><dd class="font-medium tabular-nums">${esc(JIAT.VERSI_DASAR)}</dd>
          <dt class="text-slate-500">Paket terpasang</dt><dd class="font-medium tabular-nums">${aktif ? esc(aktif.versi) + (aktif.tanggal ? ` <span class="font-normal text-slate-500">· ${fmt.tgl(aktif.tanggal)}</span>` : '') : '<span class="font-normal text-slate-500">belum ada</span>'}</dd>
          <dt class="text-slate-500">Status</dt><dd>${gagal ? ui.badge('Mode aman — paket dilewati', 'bad', 'octagon-alert') : aktif && pb.status() === 'aktif' ? ui.badge('Berjalan', 'good', 'circle-check') : aktif ? ui.badge('Berlaku setelah muat ulang', 'warn', 'rotate-ccw') : ui.badge('Aplikasi dasar', 'muted')}</dd>
        </dl>
        ${aktif && aktif.catatan ? `<div class="mx-4 mb-3 max-h-40 overflow-auto whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">${esc(aktif.catatan)}</div>` : ''}
        ${gagal ? `<p class="mx-4 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Aplikasi tidak selesai terbuka dengan paket ${esc(aktif.versi)}, sehingga paket dilewati. Kembalikan ke versi sebelumnya, atau coba jalankan lagi.</p>` : ''}
        <div class="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
          <button type="button" id="btn-unggah-pb" class="btn-primary">${ui.icon('upload')}Unggah pembaruan</button>
          ${gagal ? `<button type="button" id="btn-coba-pb" class="btn">${ui.icon('rotate-ccw')}Coba jalankan lagi</button>` : ''}
          ${aktif ? `<button type="button" id="btn-kembali-pb" class="btn">${ui.icon('history')}${pb.sebelumnya() ? 'Kembali ke ' + esc(pb.sebelumnya().versi) : 'Lepas paket (ke aplikasi dasar)'}</button>` : ''}
          <input type="file" id="file-pb" accept="application/json,.json" class="hidden">
        </div>
        <p class="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">Paket pembaruan menjalankan kode di aplikasi ini. Unggah hanya berkas dari pengembang yang Anda percaya. Data proyek tidak berubah oleh pembaruan.</p>
      </section>
    </div>`;
  }

  function userModal(id) {
    const u = id ? auth.list().find((x) => x.id === id) : { nama: '', username: '', peran: 'staf', aktif: true };
    ui.modal({
      title: id ? 'Ubah akun · ' + u.username : 'Tambah akun', size: 'max-w-lg',
      extraFooter: id && id !== auth.current().id ? `<button type="button" data-hapus class="btn text-red-700">${ui.icon('trash-2')}Hapus akun</button>` : '',
      body: `<div class="grid gap-4 sm:grid-cols-2">
        ${ui.field('Nama lengkap', `<input name="nama" class="input" maxlength="60" value="${esc(u.nama)}">`, 'Tercatat pada setiap input harian', 'sm:col-span-2')}
        ${ui.field('Username', `<input name="username" class="input" maxlength="30" autocapitalize="none" spellcheck="false" value="${esc(u.username)}">`)}
        ${ui.field('Peran', `<select name="peran" class="input">${ui.options([['staf', 'Staf'], ['admin', 'Admin']], u.peran)}</select>`)}
        ${ui.field(id ? 'Kata sandi baru' : 'Kata sandi', '<input name="sandi" type="text" class="input" autocomplete="off" spellcheck="false">', id ? 'Kosongkan bila tidak diganti' : 'Minimal 6 karakter; sampaikan ke staf secara pribadi')}
        ${ui.field('Status', `<select name="aktif" class="input">${ui.options([['ya', 'Aktif'], ['tidak', 'Nonaktif (tidak bisa masuk)']], u.aktif ? 'ya' : 'tidak')}</select>`)}</div>`,
      onSubmit(v) {
        const err = auth.upsertUser({ id, nama: v.nama, username: v.username, peran: v.peran, aktif: v.aktif === 'ya', sandi: v.sandi });
        if (err) return err;
        ui.toast(id ? 'Akun disimpan' : `Akun ${v.username.trim().toLowerCase()} dibuat — bagikan berkas ke staf`);
        JIAT.rerender();
      },
      onMount(el, close) {
        const del = el.querySelector('[data-hapus]');
        if (del) del.addEventListener('click', async () => {
          if (!(await ui.confirm({ title: `Hapus akun ${u.username}?`, danger: true, confirmLabel: 'Hapus', message: 'Riwayat input harian atas nama akun ini tetap tersimpan. Perangkat staf baru menolak akun ini setelah menerima berkas terbaru dari Anda.' }))) return;
          const err = auth.removeUser(id);
          close();
          ui.toast(err || 'Akun dihapus', err ? 'bad' : 'good');
          JIAT.rerender();
        });
      },
    });
  }

  async function unggahPembaruan(file) {
    let p;
    try { p = JSON.parse(await file.text()); } catch (_) { return ui.toast('Berkas tidak dapat dibaca sebagai JSON', 'bad'); }
    if (p && p.format === 'jiat-monitoring-paket') p = p.pembaruan;      // paket Admin juga boleh
    const tolak = JIAT.pembaruan.pasang(p, { hanyaPeriksa: true });
    if (tolak) return ui.toast(tolak, 'bad');
    const ok = await ui.confirm({
      title: `Pasang pembaruan ${p.versi}?`, confirmLabel: 'Pasang & muat ulang',
      message: `<div class="max-h-40 overflow-auto whitespace-pre-line rounded-md bg-slate-50 p-2">${esc(String(p.catatan || 'Tanpa catatan.').slice(0, 1500))}</div><p class="mt-2">Aplikasi akan dimuat ulang. Bila gagal terbuka, paket dilewati otomatis dan bisa dikembalikan dari halaman ini.</p>` });
    if (!ok) return;
    const err = JIAT.pembaruan.pasang(p);
    if (err) return ui.toast(err, 'bad');
    location.reload();
  }

  JIAT.registerModule({
    id: 'pengguna', label: 'Pengguna & Pembaruan', icon: 'settings', order: 90, render,
    visible: (ctx) => auth.enabled && !sync.cloud && ctx.isAdmin && !!auth.current(),
    mount(el) {
      const on = (sel, fn) => { const n = el.querySelector(sel); if (n) n.addEventListener('click', fn); };
      on('#btn-user-baru', () => userModal(null));
      el.querySelectorAll('[data-user]').forEach((b) => b.addEventListener('click', () => userModal(b.dataset.user)));
      on('#btn-html-staf', async () => { if (await sync.save(`JIAT-Monitoring-staf-${stamp()}.html`, JIAT.gerbang.htmlUntukStaf(), 'text/html')) ui.toast('HTML untuk staf diunduh'); });
      on('#btn-paket-staf', async () => { if (await sync.save(`jiat-paket-akun-${stamp()}.json`, JSON.stringify(JIAT.gerbang.buatPaket()), 'application/json')) ui.toast('Paket akun diunduh'); });
      on('#btn-unggah-pb', () => el.querySelector('#file-pb').click());
      el.querySelector('#file-pb').addEventListener('change', (e) => { if (e.target.files[0]) unggahPembaruan(e.target.files[0]); });
      on('#btn-coba-pb', () => { JIAT.pembaruan.cobaLagi(); location.reload(); });
      on('#btn-kembali-pb', async () => {
        if (await ui.confirm({ title: 'Kembalikan versi aplikasi?', confirmLabel: 'Kembalikan & muat ulang', message: 'Paket yang sekarang dilepas. Data proyek tidak berubah.' })) { JIAT.pembaruan.kembalikan(); location.reload(); }
      });
    },
  });
})();
