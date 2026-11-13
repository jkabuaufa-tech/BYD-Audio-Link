/** Modul C — Monitoring Harian: target vs realisasi per tanggal + notulen rapat. */
(function () {
  'use strict';
  const { fmt, ui, store } = JIAT;
  const { esc } = fmt;
  const STATUS = ['', 'OPEN', 'ON PROGRESS', 'CLOSED', 'ESKALASI'];
  const local = { rentang: 'sd' };
  const dash = '<span class="text-slate-400">–</span>';

  function render(ctx) {
    const mon = ctx.ui.tanggalMonitoring;
    const rows = ctx.view.daily.filter((r) =>
      local.rentang === 'semua' || (local.rentang === 'catatan' ? r.note : r.tanggal <= mon));
    const dev = (v) => `<span class="${Math.abs(v) < 5e-7 ? 'text-slate-600' : v > 0 ? 'text-emerald-700' : 'text-red-700'}">${fmt.pct(v, 3, true)}</span>`;
    return `
    <div class="card">
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div><h2 class="font-semibold text-slate-900">Monitoring harian · target vs realisasi (berbobot nilai nego)</h2>
          <p class="text-xs text-slate-500">Target kumulatif linier menuju ${fmt.pct(ctx.state.project.targetDes)} (simulasi; ubah di menu Data › Pengaturan). Kolom kendala s.d. catatan = bahan notulen rapat.</p></div>
        <label class="no-print block"><span class="label">Tampilkan</span><select id="f-rentang" class="input w-56">${ui.options([['sd', 'S.d. tanggal monitoring'], ['semua', 'Seluruh baseline'], ['catatan', 'Hanya yang ada catatan']], local.rentang)}</select></label>
      </div>
      ${rows.length ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Tanggal</th><th class="num">Target Hari</th><th class="num">Target Kum</th><th class="num">Real Hari</th><th class="num">Real Kum</th><th class="num">Deviasi</th><th class="num">Nilai Progres Hari (Rp)</th>
          <th>Kendala Harian</th><th>Action / PIC</th><th>Due Date</th><th>Status</th><th>Catatan Rapat</th><th class="no-print"></th></tr></thead>
        <tbody>${rows.map((r) => {
          const n = r.note || {}, future = r.tanggal > mon, now = r.tanggal === mon;
          return `<tr class="${now ? 'bg-blue-50/60' : ''}">
            <td class="whitespace-nowrap ${now ? 'font-semibold text-blue-900' : ''}">${fmt.tgl(r.tanggal, true)}${now ? '<div class="text-xs font-normal">tgl monitoring</div>' : ''}</td>
            <td class="num">${fmt.pct(r.targetHari, 3)}</td><td class="num">${fmt.pct(r.targetKum, 3)}</td>
            <td class="num">${future ? dash : fmt.pct(r.realHari, 3)}</td><td class="num">${future ? dash : fmt.pct(r.realKum, 3)}</td>
            <td class="num">${future ? dash : dev(r.deviasi)}</td><td class="num">${future ? dash : fmt.rp0(r.nilaiHari)}</td>
            <td class="min-w-44 whitespace-pre-line">${esc(n.kendala) || dash}</td><td class="min-w-44 whitespace-pre-line">${esc(n.action) || dash}</td>
            <td class="whitespace-nowrap">${n.dueDate ? fmt.tgl(n.dueDate) : dash}</td><td>${ui.statusBadge(n.status)}</td>
            <td class="min-w-44 whitespace-pre-line">${esc(n.catatan) || dash}</td>
            <td class="no-print"><button type="button" class="btn-icon" data-note="${r.tanggal}" aria-label="Isi catatan rapat ${fmt.tgl(r.tanggal)}">${ui.icon('pencil')}</button></td></tr>`;
        }).join('')}</tbody></table></div>`
      : `<div class="px-4 py-12 text-center text-sm text-slate-500">${local.rentang === 'catatan' ? 'Belum ada catatan rapat harian.' : 'Tanggal monitoring berada sebelum mulai baseline (' + fmt.tgl(ctx.state.project.baselineMulai) + ').'}</div>`}
    </div>`;
  }

  function editNote(ctx, tanggal) {
    const r = ctx.view.daily.find((x) => x.tanggal === tanggal), n = r.note || {};
    ui.modal({
      title: 'Catatan rapat · ' + fmt.tgl(tanggal, true),
      subtitle: `Target kum ${fmt.pct(r.targetKum, 3)} · realisasi kum ${fmt.pct(r.realKum, 3)} · deviasi ${fmt.pct(r.deviasi, 3, true)}`,
      body: `<div class="grid gap-4 sm:grid-cols-2">
        ${ui.field('Kendala harian', `<textarea name="kendala" rows="3" class="input" maxlength="1000">${esc(n.kendala)}</textarea>`, '', 'sm:col-span-2')}
        ${ui.field('Action / PIC', `<textarea name="action" rows="2" class="input" maxlength="1000">${esc(n.action)}</textarea>`, '', 'sm:col-span-2')}
        ${ui.field('Due date', `<input name="dueDate" type="date" class="input" value="${n.dueDate || ''}">`)}
        ${ui.field('Status', `<select name="status" class="input">${ui.options(STATUS.map((s) => [s, s || '— belum diisi —']), n.status || '')}</select>`)}
        ${ui.field('Catatan rapat', `<textarea name="catatan" rows="3" class="input" maxlength="2000">${esc(n.catatan)}</textarea>`, 'Kosongkan semua kolom untuk menghapus catatan tanggal ini.', 'sm:col-span-2')}</div>`,
      onSubmit(v) {
        store.upsertDailyNote(tanggal, { kendala: v.kendala.trim(), action: v.action.trim(), dueDate: v.dueDate || null, status: v.status, catatan: v.catatan.trim() });
        ui.toast('Catatan rapat disimpan');
      },
    });
  }

  JIAT.registerModule({
    id: 'monitoring', label: 'Monitoring Harian & Notulen', icon: 'calendar-days', order: 30, render,
    mount(el, ctx) {
      el.querySelector('#f-rentang').addEventListener('change', (e) => { local.rentang = e.target.value; ctx.setUI({}); });
      el.querySelectorAll('[data-note]').forEach((b) => b.addEventListener('click', () => editNote(ctx, b.dataset.note)));
    },
  });
})();
