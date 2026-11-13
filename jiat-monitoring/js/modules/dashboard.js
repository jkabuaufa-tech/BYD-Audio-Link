/** Modul A — Dashboard & Rekap Action Plan (ringkasan eksekutif). */
(function () {
  'use strict';
  const { fmt, ui, store, calc } = JIAT;
  const { esc } = fmt;
  const STATUS_ACTION = ['OPEN', 'ON PROGRESS', 'CLOSED', 'ESKALASI'];
  let resizeTimer = null;

  const tile = (label, value, sub = '', ic = '', accent = '') => `
    <div class="card p-4">
      <div class="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><span>${label}</span>${ic ? `<span class="text-slate-400">${ui.icon(ic)}</span>` : ''}</div>
      <div class="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900 ${accent}">${value}</div>
      ${sub ? `<div class="mt-0.5 text-xs text-slate-500">${sub}</div>` : ''}
    </div>`;

  /** Deviasi: ikon + tanda + teks (tidak mengandalkan warna saja). */
  function deviasiHTML(v, digits = 2) {
    if (v == null) return '<span class="text-slate-400">–</span>';
    const zero = Math.abs(v) < 5e-7;
    const cls = zero ? 'text-slate-600' : v > 0 ? 'text-emerald-700' : 'text-red-700';
    return `<span class="inline-flex items-center gap-1 ${cls}">${ui.icon(zero ? 'minus' : v > 0 ? 'trending-up' : 'trending-down', 'size-3.5')}${fmt.pct(zero ? 0 : v, digits, !zero)}</span>`;
  }

  function render(ctx) {
    const { view } = ctx, s = view.summary;
    const dev = s.deviasi, zero = Math.abs(dev) < 5e-7;
    const devLabel = zero ? 'Sesuai target' : dev > 0 ? 'Lebih cepat dari target' : 'Tertinggal dari target';
    const perhatian = view.items.filter((i) => i.status === calc.STATUS.LATE || i.status === calc.STATUS.OVER);

    return `
    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan progres">
      ${tile('Realisasi s.d. tanggal', fmt.pct(s.realisasiSd, 3), `${fmt.rp(s.nilaiRealisasiSd)} · posisi ${fmt.tgl(s.tanggalMonitoring)}`, 'activity')}
      ${tile('Target linier s.d. tanggal', fmt.pct(s.targetLinier, 3), `Target Desember 2026: <b>${fmt.pct(s.targetDes)}</b>`, 'target')}
      ${tile('Deviasi target', deviasiHTML(dev, 3), devLabel, '', '')}
      ${tile('Sisa ke target Des', fmt.pct(s.sisaKeTarget, 3), `Realisasi hari ini: <b>${fmt.pct(s.realisasiHariIni, 3)}</b>`, 'calendar-check')}
      ${tile('Nilai Nego BOQ', `<span class="text-lg">${fmt.rp(s.totalNilai)}</span>`, `${s.jumlahItem} item · ${view.divisions.length} divisi`, 'wallet')}
      ${tile('Item terlambat', s.itemTerlambat, s.itemTerlambat ? 'Lewat jadwal selesai, belum 100%' : 'Tidak ada item lewat jadwal', 'clock', s.itemTerlambat ? 'text-orange-700' : '')}
      ${tile('Item CEK &gt; BOQ', s.itemCekBoq, s.itemCekBoq ? 'Volume melebihi BOQ — perlu verifikasi' : 'Tidak ada input melebihi BOQ', 'octagon-alert', s.itemCekBoq ? 'text-red-700' : '')}
      ${tile('Target detail per item', fmt.pct(s.targetDetailDes), `${s.itemTerisiTarget} item bertarget · selisih ke target Des ${fmt.pct(s.selisihTargetDetail, 3, true)}`, 'list-checks')}
    </section>

    <section class="viz-root card mt-4 p-4" style="--series-1:#2a78d6;--series-2:#eb6834">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div><h2 class="font-semibold text-slate-900">Target vs realisasi kumulatif</h2>
          <p class="text-xs text-slate-500">Berbobot nilai nego · ${fmt.tgl(ctx.state.project.baselineMulai)} – ${fmt.tgl(ctx.state.project.baselineAkhir)} · target harian linier (simulasi)</p></div>
        <div class="flex items-center gap-4 text-xs text-slate-600">
          <span class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-5 rounded" style="background:var(--series-1)"></span>Realisasi kumulatif</span>
          <span class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-5 rounded" style="background:var(--series-2)"></span>Target kumulatif</span>
          <button type="button" data-goto="monitoring" class="no-print font-medium text-blue-700 hover:underline">Lihat tabel harian</button>
        </div>
      </div>
      <div id="chart-kurva" class="relative mt-2"></div>
    </section>

    <section class="card mt-4">
      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div><h2 class="font-semibold text-slate-900">Rekap divisi · bahan rapat action plan</h2>
          <p class="text-xs text-slate-500">Klik nama divisi untuk melihat rincian item.${ctx.isAdmin ? ' Klik ikon pensil untuk mengisi PIC, kendala, dan keputusan rapat.' : ' Pengisian action plan dilakukan oleh Admin.'}</p></div>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>No</th><th>Divisi Pekerjaan</th><th class="num">Nilai BOQ (Rp)</th><th class="num">Bobot BOQ</th><th class="num">Target Des</th><th class="num">Realisasi</th><th class="num">Deviasi</th>
          <th>PIC</th><th>Kendala Utama</th><th>Tindak Lanjut / Keputusan</th><th>Due Date</th><th>Status Action</th>${ctx.isAdmin ? '<th class="no-print"></th>' : ''}</tr></thead>
        <tbody>${view.divisions.map((d) => `
          <tr>
            <td class="num">${d.no}</td>
            <td class="min-w-56"><button type="button" data-div="${d.id}" class="cursor-pointer text-left font-medium text-blue-800 hover:underline">${esc(d.kode)} – ${esc(d.nama)}</button>
              <div class="text-xs text-slate-500">${d.jumlahItem} item${d.itemTerlambat ? ` · <span class="font-medium text-orange-700">${d.itemTerlambat} terlambat</span>` : ''}</div></td>
            <td class="num">${fmt.rp(d.nilai).slice(3)}</td>
            <td class="num">${fmt.pct(d.bobot)}</td>
            <td class="num">${fmt.pct(d.targetDes)}</td>
            <td class="num min-w-24">${fmt.pct(d.realisasi, 3)}${ui.meter(d.targetDes ? d.realisasi / d.targetDes : 0)}</td>
            <td class="num">${deviasiHTML(d.deviasi)}</td>
            <td class="min-w-24">${esc(d.pic) || '<span class="text-slate-400">–</span>'}</td>
            <td class="min-w-48 whitespace-pre-line">${esc(d.kendala) || '<span class="text-slate-400">–</span>'}</td>
            <td class="min-w-48 whitespace-pre-line">${esc(d.tindakLanjut) || '<span class="text-slate-400">–</span>'}</td>
            <td class="whitespace-nowrap ${d.dueDate && d.dueDate < s.tanggalMonitoring && d.statusAction !== 'CLOSED' ? 'font-medium text-red-700' : ''}">${fmt.tgl(d.dueDate)}</td>
            <td>${ui.statusBadge(d.statusAction)}</td>
            ${ctx.isAdmin ? `<td class="no-print"><button type="button" class="btn-icon" data-edit-div="${d.id}" aria-label="Ubah action plan divisi ${esc(d.kode)}">${ui.icon('pencil')}</button></td>` : ''}
          </tr>`).join('')}</tbody>
        <tfoot><tr><td></td><td>TOTAL SELURUH DIVISI</td><td class="num">${fmt.rp(s.totalNilai).slice(3)}</td><td class="num">100,00%</td>
          <td class="num">${fmt.pct(s.targetDetailDes)}</td><td class="num">${fmt.pct(view.divisions.reduce((a, d) => a + d.realisasi, 0), 3)}</td>
          <td class="num">${deviasiHTML(view.divisions.reduce((a, d) => a + d.realisasi, 0) - s.targetDetailDes)}</td><td colspan="${ctx.isAdmin ? 6 : 5}" class="text-xs font-normal text-slate-500">Deviasi di tabel ini = realisasi − target Des per item (bukan target linier harian).</td></tr></tfoot>
      </table></div>
    </section>

    ${perhatian.length ? `
    <section class="card mt-4">
      <h2 class="px-4 py-3 font-semibold text-slate-900">Item perlu perhatian (${perhatian.length})</h2>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Uraian</th><th class="num">Vol BOQ</th><th class="num">Realisasi</th><th>Jadwal selesai</th><th>PIC</th><th>Status</th></tr></thead>
      <tbody>${perhatian.slice(0, 15).map((i) => `<tr><td class="font-mono text-xs">${esc(i.id)}</td><td class="min-w-64">${esc(i.uraian)}</td>
        <td class="num">${fmt.vol(i.volume)} ${esc(i.satuan)}</td><td class="num">${fmt.vol(i.realisasi)} (${fmt.pct(i.progres, 1)})</td><td class="whitespace-nowrap">${fmt.tgl(i.selesai)}</td><td>${esc(i.pic) || '–'}</td><td>${ui.statusBadge(i.status)}</td></tr>`).join('')}</tbody></table></div>
      ${perhatian.length > 15 ? `<p class="px-4 py-2 text-xs text-slate-500">Menampilkan 15 dari ${perhatian.length}. Lihat semuanya di tab Input Harian &amp; BOQ dengan filter status.</p>` : ''}
    </section>` : ''}`;
  }

  // ------------------------------------------------------------- grafik SVG
  function drawChart(host, ctx) {
    const rows = ctx.view.daily, mon = ctx.ui.tanggalMonitoring;
    if (!rows.length) { host.innerHTML = ''; return; }
    const W = Math.max(320, host.clientWidth), H = 280, m = { l: 46, r: 112, t: 14, b: 30 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b, n = rows.length;
    const real = rows.filter((r) => r.tanggal <= mon);
    const maxV = Math.max(ctx.state.project.targetDes, ...real.map((r) => r.realKum), 0.001);
    const step = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5].find((st) => maxV / st <= 7) || 1;
    const top = Math.ceil((maxV * 1.0001) / step) * step;
    const x = (i) => m.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw), y = (v) => m.t + ih - (v / top) * ih;
    const path = (list, key) => list.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join('');
    const digits = step < 0.01 ? (step < 0.001 ? 2 : 1) : 0;
    let grid = '';
    for (let v = 0; v <= top + 1e-9; v += step) {
      grid += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8f0"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#64748b">${fmt.pct(v, digits)}</text>`;
    }
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
    let xt = '';
    rows.forEach((r, i) => { if (i % every === 0) xt += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#64748b">${fmt.tglPendek(r.tanggal)}</text>`; });
    const last = rows[n - 1], rl = real[real.length - 1];
    const monIdx = rows.findIndex((r) => r.tanggal === mon);
    // Label ujung garis; geser bila kedua label berimpit.
    const ty = y(last.targetKum);
    let ry = rl ? y(rl.realKum) : 0;
    if (rl && real.length > n - 10 && Math.abs(ry - ty) < 24) ry = ty + 30;
    host.innerHTML = `
      <svg width="${W}" height="${H}" role="img" aria-label="Grafik target dan realisasi kumulatif. Realisasi s.d. ${fmt.tgl(mon)}: ${fmt.pct(ctx.view.summary.realisasiSd, 3)}; target linier: ${fmt.pct(ctx.view.summary.targetLinier, 3)}.">
        ${grid}${xt}
        ${monIdx >= 0 ? `<line x1="${x(monIdx)}" x2="${x(monIdx)}" y1="${m.t}" y2="${m.t + ih}" stroke="#94a3b8" stroke-dasharray="3 3"/>
          <text x="${x(monIdx) + (monIdx > n * 0.8 ? -6 : 6)}" y="${m.t + 10}" text-anchor="${monIdx > n * 0.8 ? 'end' : 'start'}" font-size="11" fill="#475569">Tgl monitoring</text>` : ''}
        <path d="${path(rows, 'targetKum')}" fill="none" stroke="var(--series-2)" stroke-width="2" stroke-linejoin="round"/>
        ${real.length ? `<path d="${path(real, 'realKum')}" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="${x(real.length - 1)}" cy="${y(rl.realKum)}" r="4" fill="var(--series-1)" stroke="#fff" stroke-width="2"/>` : ''}
        <text x="${W - m.r + 8}" y="${ty - 2}" font-size="11" fill="#475569">Target</text>
        <text x="${W - m.r + 8}" y="${ty + 12}" font-size="12" font-weight="600" fill="#0f172a">${fmt.pct(last.targetKum)}</text>
        ${rl ? `<text x="${x(real.length - 1) + 9}" y="${ry + 4}" font-size="12" fill="#475569" stroke="#fff" stroke-width="3" paint-order="stroke">Realisasi <tspan font-weight="600" fill="#0f172a">${fmt.pct(rl.realKum, 3)}</tspan></text>` : ''}
        <g data-cross style="display:none"><line y1="${m.t}" y2="${m.t + ih}" stroke="#475569"/>
          <circle data-dot="t" r="4" fill="var(--series-2)" stroke="#fff" stroke-width="2"/><circle data-dot="r" r="4" fill="var(--series-1)" stroke="#fff" stroke-width="2"/></g>
        <rect data-hit x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>
      </svg>
      <div data-tip class="pointer-events-none absolute z-10 hidden rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"></div>`;

    const cross = host.querySelector('[data-cross]'), tip = host.querySelector('[data-tip]'), hit = host.querySelector('[data-hit]');
    hit.addEventListener('mousemove', (e) => {
      const box = host.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left - m.l) / iw) * (n - 1))));
      const r = rows[i], hasReal = r.tanggal <= mon;
      cross.style.display = '';
      cross.querySelector('line').setAttribute('x1', x(i)); cross.querySelector('line').setAttribute('x2', x(i));
      const dt = cross.querySelector('[data-dot=t]'), dr = cross.querySelector('[data-dot=r]');
      dt.setAttribute('cx', x(i)); dt.setAttribute('cy', y(r.targetKum));
      dr.style.display = hasReal ? '' : 'none';
      dr.setAttribute('cx', x(i)); dr.setAttribute('cy', y(r.realKum));
      tip.innerHTML = `<div class="mb-1 font-semibold">${fmt.tgl(r.tanggal, true)}</div>
        <div class="flex justify-between gap-4"><span>Target kum.</span><span class="tabular-nums">${fmt.pct(r.targetKum, 3)}</span></div>
        ${hasReal ? `<div class="flex justify-between gap-4"><span>Realisasi kum.</span><span class="tabular-nums">${fmt.pct(r.realKum, 3)}</span></div>
        <div class="flex justify-between gap-4"><span>Deviasi</span><span class="tabular-nums">${fmt.pct(r.deviasi, 3, true)}</span></div>` : '<div class="text-slate-300">Belum ada realisasi (setelah tgl monitoring)</div>'}`;
      tip.classList.remove('hidden');
      const tx = x(i) + 12, flip = tx + tip.offsetWidth > W - 4;
      tip.style.left = (flip ? x(i) - 12 - tip.offsetWidth : tx) + 'px';
      tip.style.top = m.t + 8 + 'px';
    });
    hit.addEventListener('mouseleave', () => { cross.style.display = 'none'; tip.classList.add('hidden'); });
  }

  function editDivision(ctx, id) {
    const d = ctx.view.divisions.find((x) => x.id === id);
    ui.modal({
      title: `Action plan · ${d.kode} – ${d.nama}`,
      subtitle: `Realisasi ${fmt.pct(d.realisasi, 3)} dari target Des ${fmt.pct(d.targetDes)}`,
      body: `<div class="grid gap-4 sm:grid-cols-3">
        ${ui.field('PIC', `<input name="pic" class="input" maxlength="80" value="${esc(d.pic)}">`)}
        ${ui.field('Due date', `<input name="dueDate" type="date" class="input" value="${d.dueDate || ''}">`)}
        ${ui.field('Status action', `<select name="statusAction" class="input">${ui.options(STATUS_ACTION, d.statusAction)}</select>`)}
        ${ui.field('Kendala utama', `<textarea name="kendala" rows="3" class="input" maxlength="1000">${esc(d.kendala)}</textarea>`, '', 'sm:col-span-3')}
        ${ui.field('Tindak lanjut / keputusan rapat', `<textarea name="tindakLanjut" rows="3" class="input" maxlength="1000">${esc(d.tindakLanjut)}</textarea>`, '', 'sm:col-span-3')}</div>`,
      onSubmit(v) {
        store.updateDivision(id, { pic: v.pic.trim(), kendala: v.kendala.trim(), tindakLanjut: v.tindakLanjut.trim(), dueDate: v.dueDate || null, statusAction: v.statusAction });
        ui.toast('Action plan divisi disimpan');
      },
    });
  }

  JIAT.registerModule({
    id: 'dashboard', label: 'Dashboard & Rekap Action Plan', icon: 'layout-dashboard', order: 10, render,
    mount(el, ctx) {
      const host = el.querySelector('#chart-kurva');
      drawChart(host, ctx);
      window.onresize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (host.isConnected) drawChart(host, ctx); }, 150); };
      el.querySelectorAll('[data-div]').forEach((b) => b.addEventListener('click', () => ctx.navigate('input', { divisionId: b.dataset.div, mode: 'master' })));
      el.querySelectorAll('[data-edit-div]').forEach((b) => b.addEventListener('click', () => editDivision(ctx, b.dataset.editDiv)));
      el.querySelector('[data-goto]').addEventListener('click', () => ctx.navigate('monitoring'));
    },
  });
})();
