/** gerbang.js — Layar masuk / pemasangan pertama (mode berkas) + paket dari Admin. */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const { fmt, ui, auth } = JIAT;
  const { esc } = fmt;
  const FORMAT_PAKET = 'jiat-monitoring-paket';

  /**
   * Paket dari Admin = akun + (opsional) pembaruan aplikasi. Bentuk yang sama
   * dipakai untuk berkas JSON maupun blok tertanam di "HTML untuk staf".
   * @returns {{akun: string, pembaruan: string|null}} hasil tiap bagian
   */
  function terimaPaket(paket) {
    if (!paket || paket.format !== FORMAT_PAKET) throw new Error('Berkas bukan paket dari Admin JIAT Monitoring');
    const akun = auth.importAkun(paket.akun);
    let pembaruan = null;
    // Kode pembaruan hanya diterima dari instalasi yang sama (paket akun tidak ditolak).
    if (paket.pembaruan && akun !== 'ditolak') pembaruan = JIAT.pembaruan.pasang(paket.pembaruan) == null ? 'dipasang' : 'lama';
    return { akun, pembaruan };
  }
  const buatPaket = () => ({ format: FORMAT_PAKET, dibuat: new Date().toISOString(), akun: auth.exportAkun(), pembaruan: JIAT.pembaruan.aktif() });

  // Penanda dirangkai agar teksnya tidak muncul utuh di sumber berkas ini
  // (sumber ikut tersalin ke HTML staf dan tidak boleh ikut terpotong/terganti).
  const BUKA = '<scr' + 'ipt id="jiat-' + 'bawaan" type="application/json">', TUTUP = '</scr' + 'ipt>';
  const WADAH = '<div id=' + '"app">';
  /** Salinan HTML aplikasi ini dengan paket Admin tertanam → staf tinggal buka & masuk. */
  function htmlUntukStaf() {
    let html = JIAT.SUMBER_HTML;
    if (!html) return null;
    const a = html.indexOf(BUKA);
    if (a >= 0) html = html.slice(0, a) + html.slice(html.indexOf(TUTUP, a) + TUTUP.length);   // buang paket lama
    const at = html.indexOf(WADAH);
    return html.slice(0, at) + BUKA + JSON.stringify(buatPaket()).replace(/</g, '\\u003c') + TUTUP + html.slice(at);
  }
  /** Baca paket tertanam (bila berkas ini dibuat Admin). Dipanggil saat boot. */
  function muatBawaan() {
    const el = document.getElementById('jiat-bawaan');
    if (!el) return null;
    try { return terimaPaket(JSON.parse(el.textContent)); } catch (e) { console.error('Paket tertanam tidak terbaca', e); return null; }
  }

  function render(app, onMasuk) {
    const baru = !auth.hasUsers();
    const p = JIAT.SEED.project;
    app.innerHTML = `
      <div class="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div class="w-full max-w-md">
          <div class="mb-5 flex items-center gap-3">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">${ui.icon('droplets', 'size-6')}</span>
            <div><h1 class="text-sm font-bold tracking-wide text-slate-900">${esc(p.nama)}</h1><p class="text-xs text-slate-500">Jaringan Irigasi Air Tanah · versi ${esc(JIAT.pembaruan.versi())}</p></div>
          </div>
          <form id="form-gerbang" class="card p-5" novalidate>
            <h2 class="text-base font-semibold text-slate-900">${baru ? 'Pemasangan pertama' : 'Masuk'}</h2>
            <p class="mt-1 text-sm text-slate-600">${baru ? 'Belum ada akun di perangkat ini. Buat akun <b>Admin</b> untuk memulai — Admin kemudian membuat akun staf.' : 'Gunakan akun yang diberikan Admin.'}</p>
            <div class="mt-4 grid gap-3">
              ${baru ? ui.field('Nama lengkap', '<input name="nama" class="input" maxlength="60" autocomplete="name">') : ''}
              ${ui.field('Username', '<input name="username" class="input" maxlength="30" autocapitalize="none" autocomplete="username" spellcheck="false">', baru ? 'Huruf kecil, angka, titik, atau strip' : '')}
              ${ui.field('Kata sandi', `<input name="sandi" type="password" class="input" autocomplete="${baru ? 'new-password' : 'current-password'}">`, baru ? 'Minimal 6 karakter. Catat baik-baik: tidak ada fitur lupa kata sandi.' : '')}
              ${baru ? ui.field('Ulangi kata sandi', '<input name="sandi2" type="password" class="input" autocomplete="new-password">') : ''}
            </div>
            <p id="gerbang-error" role="alert" class="mt-3 hidden rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"></p>
            <button type="submit" class="btn-primary mt-4 w-full">${ui.icon(baru ? 'shield-check' : 'user')}${baru ? 'Buat akun Admin' : 'Masuk'}</button>
          </form>
          <div class="mt-3 text-center text-sm text-slate-600">
            ${baru ? 'Anda staf?' : 'Akun belum dikenali?'} <button type="button" id="btn-paket" class="cursor-pointer font-medium text-blue-700 hover:underline">Muat berkas paket dari Admin</button>
            <input type="file" id="file-paket" accept="application/json,.json" class="hidden">
          </div>
        </div>
      </div>`;
    const form = app.querySelector('#form-gerbang'), box = app.querySelector('#gerbang-error');
    const galat = (m) => { box.textContent = m; box.classList.remove('hidden'); };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form).entries());
      const err = baru ? (v.sandi !== v.sandi2 ? 'Kedua kata sandi tidak sama.' : auth.setupAdmin(v.nama, v.username, v.sandi)) : auth.login(v.username, v.sandi);
      if (err) return galat(err);
      onMasuk();
    });
    app.querySelector('#btn-paket').addEventListener('click', () => app.querySelector('#file-paket').click());
    app.querySelector('#file-paket').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const h = terimaPaket(JSON.parse(await file.text()));
        if (h.akun === 'ditolak') return galat('Paket ditolak: bukan dari Admin instalasi ini, atau tidak memuat akun Admin aktif.');
        if (h.pembaruan === 'dipasang') return location.reload();
        ui.toast(h.akun === 'dipasang' ? 'Daftar akun dimuat. Silakan masuk.' : 'Daftar akun di perangkat ini sudah yang terbaru.');
        render(app, onMasuk);
      } catch (err) { galat('Berkas tidak dapat dibaca: ' + err.message); }
    });
    form.querySelector('input').focus();
  }

  JIAT.gerbang = { render, terimaPaket, buatPaket, htmlUntukStaf, muatBawaan };
})();
