/** ui.js — Komponen antarmuka bersama: ikon, badge, modal, konfirmasi, toast. */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const { esc } = JIAT.fmt;

  const icon = (name, cls = 'size-4') =>
    `<svg class="${cls} shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${JIAT.ICONS[name] || ''}</svg>`;

  const TONES = {
    good: 'bg-emerald-50 text-emerald-800 ring-emerald-600/25',
    warn: 'bg-amber-50 text-amber-900 ring-amber-600/30',
    serious: 'bg-orange-50 text-orange-900 ring-orange-600/30',
    bad: 'bg-red-50 text-red-800 ring-red-600/25',
    info: 'bg-sky-50 text-sky-800 ring-sky-600/25',
    muted: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  };
  /** Status selalu tampil sebagai ikon + teks, tidak hanya warna. */
  const STATUS_STYLE = {
    'CEK > BOQ': ['bad', 'octagon-alert'], SELESAI: ['good', 'circle-check'], TERLAMBAT: ['serious', 'clock'],
    BERJALAN: ['info', 'activity'], 'BELUM MULAI': ['muted', 'circle-dashed'],
    OPEN: ['warn', 'circle-alert'], 'ON PROGRESS': ['info', 'loader'], CLOSED: ['good', 'circle-check'], ESKALASI: ['bad', 'triangle-alert'],
    PROSES: ['info', 'loader'], AMAN: ['good', 'circle-check'], KURANG: ['serious', 'triangle-alert'],
  };
  const badge = (text, tone = 'muted', ic = '') =>
    `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}">${ic ? icon(ic, 'size-3') : ''}${esc(text)}</span>`;
  const statusBadge = (status) => {
    if (!status) return '<span class="text-slate-400">–</span>';
    const [tone, ic] = STATUS_STYLE[status] || ['muted', ''];
    return badge(status, tone, ic);
  };

  /** Satu baris form: label + kontrol (+ petunjuk). */
  const field = (label, control, hint = '', span = '') =>
    `<label class="block ${span}"><span class="label">${esc(label)}</span>${control}${hint ? `<span class="mt-1 block text-xs text-slate-500">${esc(hint)}</span>` : ''}</label>`;
  const options = (list, selected) =>
    list.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(t)}</option>`; }).join('');

  let modalRoot, toastRoot;
  const roots = () => {
    modalRoot = modalRoot || document.getElementById('modal-root');
    toastRoot = toastRoot || document.getElementById('toast-root');
  };

  /**
   * Buka modal. `onSubmit(values, form)` dipanggil bila ada <form>; kembalikan
   * string untuk menampilkan pesan galat dan menahan modal tetap terbuka.
   */
  function modal({ title, subtitle = '', body, submitLabel = 'Simpan', onSubmit, onMount, size = 'max-w-2xl', extraFooter = '' }) {
    roots();
    const prevFocus = document.activeElement;
    const el = document.createElement('div');
    el.className = 'fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8';
    el.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="${esc(title)}" class="w-full ${size} rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        <form novalidate>
          <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div><h2 class="text-base font-semibold text-slate-900">${esc(title)}</h2>${subtitle ? `<p class="mt-0.5 text-sm text-slate-500">${esc(subtitle)}</p>` : ''}</div>
            <button type="button" data-close class="btn-icon" aria-label="Tutup">${icon('x', 'size-5')}</button>
          </header>
          <div class="px-5 py-4">${body}<p data-error role="alert" class="mt-3 hidden rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"></p></div>
          <footer class="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-3">
            <div>${extraFooter}</div>
            <div class="flex gap-2"><button type="button" data-close class="btn">${onSubmit ? 'Batal' : 'Tutup'}</button>
            ${onSubmit ? `<button type="submit" class="btn-primary">${icon('save')}${esc(submitLabel)}</button>` : ''}</div>
          </footer>
        </form>
      </div>`;
    const close = () => { document.removeEventListener('keydown', onKey); el.remove(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    const onKey = (e) => { if (e.key === 'Escape' && modalRoot.lastElementChild === el) close(); };
    document.addEventListener('keydown', onKey);
    el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
    el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    const form = el.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!onSubmit) return close();
      const err = onSubmit(Object.fromEntries(new FormData(form).entries()), form);
      const box = el.querySelector('[data-error]');
      if (typeof err === 'string') { box.textContent = err; box.classList.remove('hidden'); } else close();
    });
    form.addEventListener('input', () => el.querySelector('[data-error]').classList.add('hidden'));
    modalRoot.appendChild(el);
    if (onMount) onMount(el, close);
    const first = el.querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])') || el.querySelector('[data-close]');
    first.focus();
    return close;
  }

  /** Dialog konfirmasi → Promise<boolean>. */
  function confirm({ title, message, confirmLabel = 'Lanjutkan', danger = false }) {
    roots();
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4';
      el.innerHTML = `
        <div role="alertdialog" aria-modal="true" aria-label="${esc(title)}" class="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
          <div class="flex gap-3"><span class="${danger ? 'text-red-600' : 'text-amber-600'}">${icon('triangle-alert', 'size-6')}</span>
          <div><h2 class="font-semibold text-slate-900">${esc(title)}</h2><div class="mt-1 text-sm text-slate-600">${message}</div></div></div>
          <div class="mt-5 flex justify-end gap-2"><button data-no class="btn">Batal</button>
          <button data-yes class="${danger ? 'btn-danger' : 'btn-primary'}">${esc(confirmLabel)}</button></div>
        </div>`;
      const done = (v) => { document.removeEventListener('keydown', onKey, true); el.remove(); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
      document.addEventListener('keydown', onKey, true);
      el.querySelector('[data-no]').addEventListener('click', () => done(false));
      el.querySelector('[data-yes]').addEventListener('click', () => done(true));
      modalRoot.appendChild(el);
      el.querySelector('[data-no]').focus();
    });
  }

  function toast(message, tone = 'good') {
    roots();
    const el = document.createElement('div');
    const style = { good: ['bg-emerald-700', 'circle-check'], bad: ['bg-red-700', 'octagon-alert'], warn: ['bg-amber-700', 'triangle-alert'] }[tone];
    el.className = `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${style[0]}`;
    el.setAttribute('role', 'status');
    el.innerHTML = icon(style[1]) + esc(message);
    toastRoot.appendChild(el);
    while (toastRoot.children.length > 3) toastRoot.firstElementChild.remove();
    setTimeout(() => el.remove(), tone === 'good' ? 3000 : 6000);
  }

  function download(filename, content, mime = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** Bar tipis 0–100% (mis. progres item). */
  const meter = (frac, tone = 'bg-blue-600') =>
    `<span class="mt-1 block h-1 w-full overflow-hidden rounded-full bg-slate-200"><span class="block h-full rounded-full ${tone}" style="width:${Math.max(0, Math.min(1, frac || 0)) * 100}%"></span></span>`;

  JIAT.ui = { icon, badge, statusBadge, field, options, modal, confirm, toast, download, meter };
})();
