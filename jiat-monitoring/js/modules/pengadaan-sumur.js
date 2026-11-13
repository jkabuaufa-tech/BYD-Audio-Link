/** Modul D — Pengadaan Penting (material kritis) & Lokasi Sumur (SBD / tim / vendor). */
(function () {
  'use strict';
  const { fmt, ui, store } = JIAT;
  const { esc } = fmt;
  const STATUS_SUMUR = ['BELUM MULAI', 'PROSES', 'SELESAI'];
  const local = { sub: 'pengadaan', tim: '', kab: '' };
  const dash = '<span class="text-slate-400">–</span>';
  const num = (v) => (v == null ? '' : String(v).replace('.', ','));

  /** Status stok terhadap kebutuhan target Des. */
  function statusStok(p, item) {
    if (p.stock2026 == null || !item || item.targetVolDes == null) return null;
    return p.stock2026 + 1e-7 >= item.targetVolDes ? 'AMAN' : 'KURANG';
  }

  function pengadaanHTML(ctx) {
    const items = new Map(ctx.view.items.map((i) => [i.id, i]));
    let last = null, body = '', no = 0;
    for (const p of ctx.state.procurement) {
      if (p.kelompok !== last) { last = p.kelompok; no = 0; body += `<tr class="group-row"><td colspan="${ctx.isAdmin ? 11 : 10}">${esc(p.kelompok)}</td></tr>`; }
      const i = items.get(p.itemId), st = statusStok(p, i);
      const kurang = st === 'KURANG' ? i.targetVolDes - p.stock2026 : 0;
      body += `<tr><td class="num">${++no}</td>
        <td class="min-w-56">${esc(p.uraian)}<div class="font-mono text-xs text-slate-500">${esc(p.itemId || 'tanpa tautan BOQ')}</div></td>
        <td>${i ? esc(i.satuan) : dash}</td><td class="num">${i ? fmt.vol(i.volume) : dash}</td>
        <td class="num">${p.stock2026 == null ? dash : fmt.vol(p.stock2026)}</td>
        <td class="num">${i && i.targetVolDes != null ? fmt.vol(i.targetVolDes) : dash}</td>
        <td class="num">${p.mos == null ? dash : fmt.vol(p.mos)}</td>
        <td class="num">${i ? fmt.vol(i.realisasi) : dash}</td>
        <td>${st ? ui.statusBadge(st) + (kurang ? `<div class="mt-1 text-xs text-orange-800">kurang ${fmt.vol(kurang)} ${esc(i.satuan)}</div>` : '') : ui.badge('Stock belum diisi', 'muted')}</td>
        <td class="min-w-40 whitespace-pre-line">${esc(p.catatan) || dash}</td>
        ${ctx.isAdmin ? `<td class="no-print"><button type="button" class="btn-icon" data-pgd="${p.id}" aria-label="Ubah stok ${esc(p.uraian)}">${ui.icon('pencil')}</button></td>` : ''}</tr>`;
    }
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>No</th><th>Uraian</th><th>Sat</th><th class="num">Total (BOQ)</th><th class="num">Stock 2026</th><th class="num">Kebutuhan<br>Target Des</th><th class="num">MOS</th><th class="num">Terpasang<br>s.d. tgl</th><th>Stock vs Target</th><th>Catatan</th>${ctx.isAdmin ? '<th class="no-print"></th>' : ''}</tr></thead>
      <tbody>${body}</tbody></table></div>
      <p class="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">Total, target Des, dan terpasang otomatis mengikuti item BOQ tertaut. Stock 2026 awal = 50% total BOQ (sesuai Excel); kelompok C belum diisi di Excel. MOS = material on site.${ctx.isAdmin ? '' : ' Perubahan stok dilakukan oleh Admin.'}</p>`;
  }

  function sumurHTML(ctx) {
    const wells = ctx.state.wells.filter((w) => (!local.tim || w.tim === local.tim) && (!local.kab || w.kabupaten === local.kab));
    const uniq = (k) => [...new Set(ctx.state.wells.map((w) => w[k]))].sort();
    const count = (list, k) => Object.entries(list.reduce((m, w) => ((m[w[k]] = (m[w[k]] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
    const chips = (title, pairs) => `<div><span class="label">${title}</span><div class="flex flex-wrap gap-1.5">${pairs.map(([k, v]) => `<span class="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">${esc(k)} <b class="tabular-nums text-slate-900">${v}</b></span>`).join('')}</div></div>`;
    return `
      <div class="flex flex-wrap items-end gap-4 border-b border-slate-200 px-4 py-3">
        <label class="no-print block"><span class="label">Tim</span><select id="f-tim" class="input w-36">${ui.options([['', 'Semua tim'], ...uniq('tim')], local.tim)}</select></label>
        <label class="no-print block"><span class="label">Kabupaten</span><select id="f-kab" class="input w-48">${ui.options([['', 'Semua kabupaten'], ...uniq('kabupaten')], local.kab)}</select></label>
        ${chips('Sumur per vendor pemboran', count(wells, 'vendorPemboran'))}
        ${chips('Status', count(wells, 'status'))}
      </div>
      ${wells.length ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>No</th><th>SBD</th><th>Kabupaten</th><th>Dominasi Tanah</th><th>Rekomtek</th><th>Tim</th><th>Vendor Pemboran</th><th>Status</th><th>Catatan</th><th class="no-print"></th></tr></thead>
        <tbody>${wells.map((w, i) => `<tr><td class="num">${i + 1}</td><td class="font-medium whitespace-nowrap">${esc(w.sbd)}</td><td>${esc(w.kabupaten)}</td><td>${esc(w.tanah)}</td><td>${esc(w.rekomtek)}</td>
          <td class="whitespace-nowrap">${esc(w.tim)}</td><td>${esc(w.vendorPemboran)}</td><td>${ui.statusBadge(w.status)}</td><td class="min-w-40 whitespace-pre-line">${esc(w.catatan) || dash}</td>
          <td class="no-print"><button type="button" class="btn-icon" data-well="${esc(w.id)}" aria-label="Ubah ${esc(w.sbd)}">${ui.icon('pencil')}</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="px-4 py-12 text-center text-sm text-slate-500">Tidak ada sumur pada kombinasi tim dan kabupaten ini.</div>'}`;
  }

  function render(ctx) {
    const seg = (id, label, ic) => `<button type="button" data-sub="${id}" aria-pressed="${local.sub === id}">${ui.icon(ic)}${label}</button>`;
    return `<div class="card">
      <div class="no-print border-b border-slate-200 px-4 py-3"><div class="seg">${seg('pengadaan', `Pengadaan Penting (${ctx.state.procurement.length})`, 'package')}${seg('sumur', `Lokasi Sumur (${ctx.state.wells.length})`, 'map-pin')}</div></div>
      ${local.sub === 'pengadaan' ? pengadaanHTML(ctx) : sumurHTML(ctx)}</div>`;
  }

  function editPengadaan(ctx, id) {
    const p = ctx.state.procurement.find((x) => x.id === id), i = ctx.view.items.find((x) => x.id === p.itemId);
    ui.modal({
      title: 'Stok material · ' + p.uraian, size: 'max-w-lg',
      subtitle: i ? `Total BOQ ${fmt.vol(i.volume)} ${i.satuan} · target Des ${i.targetVolDes == null ? '–' : fmt.vol(i.targetVolDes)} · terpasang ${fmt.vol(i.realisasi)}` : '',
      body: `<div class="grid gap-4 sm:grid-cols-2">
        ${ui.field('Stock 2026', `<input name="stock2026" class="input text-right" inputmode="decimal" value="${num(p.stock2026)}">`, 'Rencana/ketersediaan stok tahun 2026')}
        ${ui.field('MOS (material on site)', `<input name="mos" class="input text-right" inputmode="decimal" value="${num(p.mos)}">`, 'Sudah tiba di lapangan')}
        ${ui.field('Catatan', `<textarea name="catatan" rows="3" class="input" maxlength="500">${esc(p.catatan)}</textarea>`, 'Mis. nomor PO, jadwal kirim, vendor', 'sm:col-span-2')}</div>`,
      onSubmit(v) {
        const stock = fmt.parseNum(v.stock2026), mos = fmt.parseNum(v.mos);
        if (Number.isNaN(stock) || stock < 0 || Number.isNaN(mos) || mos < 0) return 'Stock dan MOS harus angka 0 atau lebih (atau dikosongkan).';
        store.updateProcurement(id, { stock2026: stock, mos, catatan: v.catatan.trim() });
        ui.toast('Data pengadaan disimpan');
      },
    });
  }

  function editSumur(ctx, id) {
    const w = ctx.state.wells.find((x) => x.id === id);
    const ro = ctx.isAdmin ? '' : 'disabled';
    ui.modal({
      title: `${w.sbd} · ${w.kabupaten}`, subtitle: `Dominasi tanah: ${w.tanah}`, size: 'max-w-lg',
      body: `<div class="grid gap-4 sm:grid-cols-2">
        ${ui.field('Tim', `<input name="tim" class="input" maxlength="30" value="${esc(w.tim)}" ${ro}>`)}
        ${ui.field('Vendor pemboran', `<input name="vendorPemboran" class="input" maxlength="60" value="${esc(w.vendorPemboran)}" ${ro}>`, ctx.isAdmin ? '' : 'Hanya Admin yang dapat mengganti tim/vendor')}
        ${ui.field('Status pemboran', `<select name="status" class="input">${ui.options(STATUS_SUMUR, w.status)}</select>`)}
        ${ui.field('Rekomtek', `<input name="rekomtek" class="input" maxlength="60" value="${esc(w.rekomtek)}" ${ro}>`)}
        ${ui.field('Catatan lapangan', `<textarea name="catatan" rows="3" class="input" maxlength="500">${esc(w.catatan)}</textarea>`, '', 'sm:col-span-2')}</div>`,
      onSubmit(v) {
        const data = { status: v.status, catatan: v.catatan.trim() };
        if (ctx.isAdmin) {
          if (!v.tim.trim() || !v.vendorPemboran.trim()) return 'Tim dan vendor pemboran wajib diisi.';
          Object.assign(data, { tim: v.tim.trim(), vendorPemboran: v.vendorPemboran.trim(), rekomtek: v.rekomtek.trim() });
        }
        store.updateWell(id, data);
        ui.toast(`${w.sbd} disimpan`);
      },
    });
  }

  JIAT.registerModule({
    id: 'pengadaan', label: 'Pengadaan & Lokasi Sumur', icon: 'package', order: 40, render,
    mount(el, ctx) {
      el.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => { local.sub = b.dataset.sub; ctx.setUI({}); }));
      el.querySelectorAll('[data-pgd]').forEach((b) => b.addEventListener('click', () => editPengadaan(ctx, b.dataset.pgd)));
      el.querySelectorAll('[data-well]').forEach((b) => b.addEventListener('click', () => editSumur(ctx, b.dataset.well)));
      const on = (sel, key) => { const n = el.querySelector(sel); if (n) n.addEventListener('change', (e) => { local[key] = e.target.value; ctx.setUI({}); }); };
      on('#f-tim', 'tim'); on('#f-kab', 'kab');
    },
  });
})();
