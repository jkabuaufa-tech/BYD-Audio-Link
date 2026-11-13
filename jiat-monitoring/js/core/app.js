/**
 * app.js — Kerangka aplikasi: registri modul, header, navigasi tab, aksi global.
 *
 * MENAMBAH MODUL/TAB BARU: buat js/modules/<nama>.js yang memanggil
 *   JIAT.registerModule({ id, label, icon, order, render(ctx), mount(el, ctx), beforeLeave?() })
 * lalu tambahkan <script> di index.html. Tidak ada berkas lain yang perlu diubah.
 *
 * ctx = { state, view, ui{tab,role,tanggalMonitoring}, isAdmin, setUI(), navigate(), store }
 */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const { fmt, ui, store, calc } = JIAT;
  const { esc } = fmt;
  const UI_KEY = 'jiat-monitoring:ui';

  const modules = [];
  JIAT.registerModule = (def) => { modules.push(def); modules.sort((a, b) => a.order - b.order); };

  const uiState = { tab: null, role: 'staff', tanggalMonitoring: fmt.today() };
  let navParams = null;

  function saveUI() {
    try { localStorage.setItem(UI_KEY, JSON.stringify({ tab: uiState.tab, role: uiState.role })); } catch (_) { /* abaikan */ }
  }
  function buildCtx() {
    const state = store.get();
    return {
      state, store, ui: uiState, isAdmin: uiState.role === 'admin', params: navParams,
      view: calc.compute(state, uiState.tanggalMonitoring),
      setUI(patch) { Object.assign(uiState, patch); saveUI(); render(); },
      navigate,
    };
  }
  async function navigate(tab, params = null) {
    const current = modules.find((m) => m.id === uiState.tab);
    if (tab !== uiState.tab && current && current.beforeLeave && !(await current.beforeLeave())) return;
    navParams = params;
    uiState.tab = tab;
    saveUI();
    render();
    navParams = null;
  }

  // ---------------------------------------------------------------- tampilan
  function headerHTML(ctx) {
    const s = ctx.view.summary;
    const roleBtn = (id, label, ic) =>
      `<button type="button" data-role="${id}" aria-pressed="${uiState.role === id}">${ui.icon(ic)}${label}</button>`;
    return `
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">${ui.icon('droplets', 'size-6')}</span>
          <div class="min-w-0">
            <h1 class="text-sm font-bold tracking-wide text-slate-900 sm:text-base">${esc(ctx.state.project.nama)}</h1>
            <p class="text-xs text-slate-500">Jaringan Irigasi Air Tanah · Nilai Nego BOQ <span class="font-semibold text-slate-700">${fmt.rp(s.totalNilai)}</span></p>
          </div>
        </div>
        <div class="no-print flex flex-wrap items-end gap-3">
          <label class="block"><span class="label">Tanggal monitoring</span>
            <span class="flex gap-1"><input id="tgl-monitoring" type="date" class="input w-40" value="${uiState.tanggalMonitoring}">
            <button type="button" id="tgl-hari-ini" class="btn" title="Kembali ke tanggal hari ini">Hari ini</button></span></label>
          <div><span class="label">Peran</span>
            <div class="seg" role="group" aria-label="Peran pengguna">${roleBtn('staff', 'Staf', 'user')}${roleBtn('admin', 'Admin', 'shield-check')}</div></div>
          <details class="relative" id="menu-data">
            <summary class="btn list-none">${ui.icon('ellipsis-vertical')}Data</summary>
            <div class="absolute right-0 z-30 mt-1 w-60 rounded-lg bg-white p-1 text-sm shadow-xl ring-1 ring-slate-200">
              ${menuItem('export-xlsx', 'file-spreadsheet', 'Ekspor ke Excel')}
              ${menuItem('print', 'printer', 'Cetak halaman ini')}
              ${menuItem('backup', 'download', 'Unduh cadangan (JSON)')}
              ${ctx.isAdmin ? menuItem('restore', 'upload', 'Pulihkan dari cadangan') + menuItem('settings', 'settings', 'Pengaturan target & baseline')
                + '<hr class="my-1 border-slate-200">' + menuItem('reset', 'rotate-ccw', 'Reset ke data awal Excel', 'text-red-700') : ''}
            </div>
          </details>
          <input type="file" id="file-restore" accept="application/json,.json" class="hidden">
        </div>
      </div>
      <nav class="no-print mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Modul">
        ${modules.map((m) => `
          <button type="button" data-tab="${m.id}" aria-current="${m.id === uiState.tab ? 'page' : 'false'}"
            class="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${m.id === uiState.tab
              ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'}">
            ${ui.icon(m.icon)}${esc(m.label)}</button>`).join('')}
      </nav>
    </header>`;
  }
  const menuItem = (action, ic, label, cls = 'text-slate-700') =>
    `<button type="button" data-action="${action}" class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-slate-100 ${cls}">${ui.icon(ic)}${label}</button>`;

  function render() {
    const ctx = buildCtx();
    const mod = modules.find((m) => m.id === uiState.tab) || modules[0];
    uiState.tab = mod.id;
    const app = document.getElementById('app');
    const scrollY = window.scrollY;
    app.innerHTML = headerHTML(ctx) +
      (store.isPersistent() ? '' : `<div role="alert" class="bg-red-700 px-4 py-2 text-center text-sm font-medium text-white">Penyimpanan browser penuh atau diblokir — perubahan TIDAK tersimpan. Unduh cadangan JSON sekarang.</div>`) +
      `<main id="module-root" class="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">${mod.render(ctx)}</main>`;
    bindHeader(ctx);
    if (mod.mount) mod.mount(document.getElementById('module-root'), ctx);
    window.scrollTo(0, scrollY);
  }

  function bindHeader(ctx) {
    const $ = (sel) => document.querySelector(sel);
    $('#tgl-monitoring').addEventListener('change', (e) => { if (e.target.value) ctx.setUI({ tanggalMonitoring: e.target.value }); });
    $('#tgl-hari-ini').addEventListener('click', () => ctx.setUI({ tanggalMonitoring: fmt.today() }));
    document.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => ctx.setUI({ role: b.dataset.role })));
    document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.tab)));
    document.querySelectorAll('#menu-data [data-action]').forEach((b) => b.addEventListener('click', () => {
      $('#menu-data').removeAttribute('open');
      actions[b.dataset.action](ctx);
    }));
    $('#file-restore').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { store.importJSON(await file.text()); ui.toast('Data dipulihkan dari ' + file.name); }
      catch (err) { ui.toast('Gagal memulihkan: ' + err.message, 'bad'); }
    });
  }

  // ------------------------------------------------------------ aksi global
  const stamp = () => fmt.today().replace(/-/g, '');
  const actions = {
    'export-xlsx': (ctx) => JIAT.exportExcel(ctx),
    print: () => window.print(),
    backup: () => { ui.download(`jiat-monitoring-cadangan-${stamp()}.json`, store.exportJSON()); ui.toast('Cadangan diunduh'); },
    async restore() {
      const ok = await ui.confirm({ title: 'Pulihkan dari cadangan?', danger: true, confirmLabel: 'Pilih berkas',
        message: 'Seluruh data di browser ini akan <b>diganti</b> dengan isi berkas cadangan.' });
      if (ok) document.getElementById('file-restore').click();
    },
    async reset() {
      const ok = await ui.confirm({ title: 'Reset ke data awal?', danger: true, confirmLabel: 'Ya, reset',
        message: 'Semua input harian, catatan rapat, dan perubahan master akan <b>dihapus</b> dan kembali ke isi Excel awal. Unduh cadangan dulu bila perlu.' });
      if (ok) { store.reset(); ui.toast('Data dikembalikan ke kondisi awal'); }
    },
    settings(ctx) {
      const p = ctx.state.project;
      ui.modal({
        title: 'Pengaturan target & baseline', subtitle: 'Dipakai untuk kurva target linier (simulasi) dan deviasi.', size: 'max-w-lg',
        body: `<div class="grid gap-4 sm:grid-cols-3">
          ${ui.field('Target Des 2026 (%)', `<input name="targetDes" class="input" inputmode="decimal" value="${String(+(p.targetDes * 100).toFixed(4)).replace('.', ',')}">`)}
          ${ui.field('Mulai baseline', `<input name="baselineMulai" type="date" class="input" value="${p.baselineMulai}">`)}
          ${ui.field('Akhir baseline', `<input name="baselineAkhir" type="date" class="input" value="${p.baselineAkhir}">`)}</div>`,
        onSubmit(v) {
          const t = fmt.parseNum(v.targetDes);
          if (t == null || Number.isNaN(t) || t <= 0 || t > 100) return 'Target harus angka antara 0 dan 100.';
          if (!v.baselineMulai || !v.baselineAkhir || v.baselineAkhir <= v.baselineMulai) return 'Akhir baseline harus setelah tanggal mulai.';
          if (calc.diffDays(v.baselineAkhir, v.baselineMulai) > 1100) return 'Rentang baseline maksimal 3 tahun.';
          store.updateProject({ targetDes: t / 100, baselineMulai: v.baselineMulai, baselineAkhir: v.baselineAkhir });
          ui.toast('Pengaturan disimpan');
        },
      });
    },
  };

  JIAT.start = function () {
    store.init();
    try { Object.assign(uiState, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (_) { /* abaikan */ }
    if (uiState.role !== 'admin') uiState.role = 'staff';
    store.subscribe(render);
    document.addEventListener('click', (e) => {   // tutup menu Data saat klik di luar
      const menu = document.getElementById('menu-data');
      if (menu && menu.open && !menu.contains(e.target)) menu.removeAttribute('open');
    });
    render();
  };
})();
