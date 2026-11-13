/** Modul B — Input Harian (Staf) & Rincian/Master BOQ (Admin). */
(function () {
  'use strict';
  const { fmt, ui, store, calc } = JIAT;
  const { esc } = fmt;

  // State lokal modul (bertahan selama sesi; tidak ikut tersimpan).
  const local = { mode: 'input', q: '', divisionId: '', status: '', tanggal: null, hanyaTerisi: false, draft: new Map() };
  let ctx = null, root = null;

  const clampTanggal = (t, p) => (t < p.baselineMulai ? p.baselineMulai : t > p.baselineAkhir ? p.baselineAkhir : t);
  const divLabel = (d) => `${d.kode} – ${d.nama}`;
  const dash = '<span class="text-slate-400">–</span>';

  function filtered() {
    const q = local.q.trim().toLowerCase();
    return ctx.view.items.filter((i) =>
      (!local.divisionId || i.divisionId === local.divisionId) &&
      (!local.status || (local.status === 'CEK > BOQ' ? i.realisasiTotal > i.volume + calc.EPS : i.status === local.status)) &&
      (!q || (i.id + ' ' + i.uraian + ' ' + i.subbagian + ' ' + i.pic).toLowerCase().includes(q)));
  }
  /** Volume tersimpan per item pada tanggal input. */
  const tersimpan = () => new Map(ctx.state.progress.filter((p) => p.tanggal === local.tanggal).map((p) => [p.itemId, p.volume]));

  /** Hitung satu baris input dari draft (atau nilai tersimpan). */
  function hitungBaris(item, saved) {
    const ada = saved.get(item.id) || 0;
    const raw = local.draft.has(item.id) ? local.draft.get(item.id) : null;
    const parsed = raw == null ? ada : fmt.parseNum(raw);
    const invalid = raw != null && (Number.isNaN(parsed) || parsed < 0);
    const volume = invalid ? ada : parsed || 0;
    const cek = calc.cekInputHarian(item, item.realisasiTotal - ada, volume);
    return { ada, volume, invalid, berubah: raw != null && !invalid && Math.abs(volume - ada) > calc.EPS, lain: item.realisasiTotal - ada, ...cek };
  }

  // ------------------------------------------------------------------ render
  function render(c) {
    ctx = c;
    if (c.params) {
      if (c.params.divisionId) { local.divisionId = c.params.divisionId; local.q = ''; local.status = ''; }
      if (c.params.mode) local.mode = c.params.mode;
    }
    if (!local.tanggal) local.tanggal = clampTanggal(c.ui.tanggalMonitoring, c.state.project);
    local.tanggal = clampTanggal(local.tanggal, c.state.project);
    const seg = (id, label, ic) => `<button type="button" data-mode="${id}" aria-pressed="${local.mode === id}">${ui.icon(ic)}${label}</button>`;
    return `
    <div class="card">
      <div class="no-print flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3">
        <div><span class="label">Tampilan</span><div class="seg">${seg('input', 'Input Harian', 'pencil')}${seg('master', 'Rincian BOQ', 'clipboard-list')}</div></div>
        ${local.mode === 'input' ? `<label class="block"><span class="label">Tanggal input</span>
          <input id="f-tanggal" type="date" class="input w-40" value="${local.tanggal}" min="${c.state.project.baselineMulai}" max="${c.state.project.baselineAkhir}"></label>` : ''}
        <label class="block min-w-48 flex-1"><span class="label">Cari</span>
          <span class="relative block"><span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-slate-400">${ui.icon('search')}</span>
          <input id="f-q" type="search" class="input pl-8" placeholder="Kode, uraian, subbagian, PIC…" value="${esc(local.q)}"></span></label>
        <label class="block"><span class="label">Divisi</span><select id="f-div" class="input w-56">${ui.options([['', 'Semua divisi'], ...c.state.divisions.map((d) => [d.id, divLabel(d)])], local.divisionId)}</select></label>
        <label class="block"><span class="label">Status</span><select id="f-status" class="input w-40">${ui.options([['', 'Semua status'], ...Object.values(calc.STATUS)], local.status)}</select></label>
        ${local.mode === 'input' ? `<label class="flex items-center gap-2 pb-1.5 text-sm text-slate-700"><input id="f-terisi" type="checkbox" class="size-4 accent-blue-700" ${local.hanyaTerisi ? 'checked' : ''}>Hanya yang terisi</label>` : ''}
        ${local.mode === 'master' && c.isAdmin ? `<button type="button" id="btn-tambah" class="btn-primary ml-auto">${ui.icon('plus')}Tambah item</button>` : ''}
      </div>
      <div id="tbl-host"></div>
    </div>
    ${local.mode === 'input' ? `<p class="mt-2 text-xs text-slate-500">Isi volume realisasi untuk <b>${fmt.tgl(local.tanggal, true)}</b> sesuai satuan BOQ. Desimal boleh memakai koma atau titik (contoh 12,5); jangan memakai pemisah ribuan. Kosongkan atau isi 0 untuk menghapus entri. Total melebihi volume BOQ ditandai <b>CEK &gt; BOQ</b>.</p>` : ''}
    <div id="save-bar"></div>`;
  }

  function tableHTML() {
    const rows = local.mode === 'input' ? inputRows() : filtered();
    if (!rows.length) return `<div class="px-4 py-12 text-center text-sm text-slate-500">Tidak ada item yang cocok dengan filter. <button type="button" id="btn-clear" class="font-medium text-blue-700 hover:underline">Hapus filter</button></div>`;
    return local.mode === 'input' ? inputTable(rows) : masterTable(rows);
  }
  function inputRows() {
    const saved = tersimpan();
    return filtered().filter((i) => !local.hanyaTerisi || saved.has(i.id) || local.draft.has(i.id));
  }
  /** Sisipkan baris judul divisi di antara baris item. */
  function grouped(rows, cols, rowHTML) {
    let last = null, html = '';
    for (const r of rows) {
      if (r.divisionId !== last) {
        last = r.divisionId;
        const d = ctx.view.divisions.find((x) => x.id === last);
        html += `<tr class="group-row"><td colspan="${cols}">${esc(divLabel(d))} <span class="font-normal normal-case text-slate-500">· bobot ${fmt.pct(d.bobot)} · realisasi ${fmt.pct(d.realisasi, 3)}</span></td></tr>`;
      }
      html += rowHTML(r);
    }
    return html;
  }

  function inputTable(rows) {
    const saved = tersimpan();
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Kode</th><th>Uraian BOQ</th><th>Sat</th><th class="num">Vol BOQ</th><th class="num">Kumulatif<br>tgl lain</th>
        <th class="num">Volume<br>${fmt.tglPendek(local.tanggal)}</th><th class="num">Kumulatif</th><th class="num">Sisa Vol</th><th class="num">Progres</th><th class="num">Bobot<br>tercapai</th><th>Keterangan</th></tr></thead>
      <tbody>${grouped(rows, 11, (i) => {
        const b = hitungBaris(i, saved);
        const val = local.draft.has(i.id) ? local.draft.get(i.id) : b.ada ? String(b.ada).replace('.', ',') : '';
        return `<tr data-row="${esc(i.id)}">
          <td class="font-mono text-xs">${esc(i.id)}</td>
          <td class="min-w-64">${esc(i.uraian)}${i.subbagian ? `<div class="text-xs text-slate-500">${esc(i.subbagian)}</div>` : ''}</td>
          <td>${esc(i.satuan)}</td><td class="num">${fmt.vol(i.volume)}</td><td class="num">${fmt.vol(b.lain)}</td>
          <td class="num"><input data-input="${esc(i.id)}" inputmode="decimal" autocomplete="off" aria-label="Volume ${esc(i.id)} tanggal ${local.tanggal}"
            class="input ml-auto w-28 text-right tabular-nums" value="${esc(val)}" placeholder="0"></td>
          ${computedCells(i, b)}</tr>`;
      })}</tbody></table></div>`;
  }
  function computedCells(i, b) {
    const ket = b.invalid ? ui.badge('Angka tidak valid', 'bad', 'octagon-alert')
      : b.melebihiBoq ? ui.badge('CEK > BOQ', 'bad', 'octagon-alert') + `<div class="mt-1 text-xs text-red-700">Lebih ${fmt.vol(b.kelebihan)} ${esc(i.satuan)} dari BOQ</div>`
      : b.berubah ? ui.badge('Belum disimpan', 'warn', 'pencil') : b.ada ? ui.badge('Tersimpan', 'good', 'circle-check') : '';
    const progres = i.volume ? b.total / i.volume : 0;
    return `<td class="num" data-c>${fmt.vol(b.total)}</td><td class="num" data-c>${fmt.vol(b.sisa)}</td>
      <td class="num min-w-20" data-c>${fmt.pct(progres, 1)}${ui.meter(progres, b.melebihiBoq ? 'bg-red-600' : 'bg-blue-600')}</td>
      <td class="num" data-c>${fmt.pct(i.bobot * progres, 3)}</td><td data-c class="min-w-36">${ket}</td>`;
  }

  function masterTable(rows) {
    const sum = (f) => rows.reduce((s, r) => s + (f(r) || 0), 0);
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Kode</th><th>Uraian BOQ</th><th>Sat</th><th class="num">Vol BOQ</th><th class="num">Harga Nego (Rp)</th><th class="num">Nilai BOQ (Rp)</th><th class="num">Bobot BOQ</th>
        <th class="num">Target Vol Des</th><th class="num">Target Bobot Des</th><th>PIC</th><th>Jadwal</th><th class="num">Realisasi s.d. tgl</th><th class="num">Sisa Vol</th><th class="num">Progres</th><th class="num">Kontribusi</th><th>Status</th><th class="no-print"></th></tr></thead>
      <tbody>${grouped(rows, 17, (i) => `<tr>
        <td class="font-mono text-xs">${esc(i.id)}</td>
        <td class="min-w-64">${esc(i.uraian)}${i.subbagian ? `<div class="text-xs text-slate-500">${esc(i.subbagian)}</div>` : ''}
          ${i.kendala ? `<div class="mt-1 text-xs text-orange-800"><b>Kendala:</b> ${esc(i.kendala)}</div>` : ''}${i.actionPlan ? `<div class="text-xs text-slate-600"><b>Tindak lanjut:</b> ${esc(i.actionPlan)}${i.dueDate ? ' · due ' + fmt.tgl(i.dueDate) : ''}</div>` : ''}</td>
        <td>${esc(i.satuan)}</td><td class="num">${fmt.vol(i.volume)}</td><td class="num">${fmt.rp0(i.hargaNego)}</td><td class="num">${fmt.rp0(i.nilai)}</td><td class="num">${fmt.pct(i.bobot, 3)}</td>
        <td class="num">${i.targetVolDes == null ? dash : fmt.vol(i.targetVolDes)}</td><td class="num">${i.targetBobotDes == null ? dash : fmt.pct(i.targetBobotDes, 3)}</td>
        <td>${esc(i.pic) || dash}</td>
        <td class="whitespace-nowrap text-xs">${i.mulai || i.selesai ? `${i.mulai ? fmt.tglPendek(i.mulai) : '?'} – ${i.selesai ? fmt.tglPendek(i.selesai) : '?'}` : dash}</td>
        <td class="num">${fmt.vol(i.realisasi)}</td><td class="num">${fmt.vol(i.sisa)}</td>
        <td class="num min-w-20">${fmt.pct(i.progres, 1)}${ui.meter(i.progres, i.status === calc.STATUS.OVER ? 'bg-red-600' : 'bg-blue-600')}</td>
        <td class="num">${fmt.pct(i.kontribusi, 3)}</td><td>${ui.statusBadge(i.status)}</td>
        <td class="no-print"><button type="button" class="btn-icon" data-item="${esc(i.id)}" aria-label="${ctx.isAdmin ? 'Ubah' : 'Lihat detail'} item ${esc(i.id)}">${ui.icon(ctx.isAdmin ? 'pencil' : 'history')}</button></td></tr>`)}</tbody>
      <tfoot><tr><td colspan="5">TOTAL (${rows.length} item${rows.length < ctx.view.items.length ? ' terfilter' : ''})</td><td class="num">${fmt.rp0(sum((r) => r.nilai))}</td><td class="num">${fmt.pct(sum((r) => r.bobot))}</td>
        <td></td><td class="num">${fmt.pct(sum((r) => r.targetBobotDes))}</td><td colspan="5"></td><td class="num">${fmt.pct(sum((r) => r.kontribusi), 3)}</td><td colspan="2"></td></tr></tfoot>
    </table></div>`;
  }

  // ---------------------------------------------------------------- simpan
  function perubahan() {
    const saved = tersimpan(), out = [];
    for (const id of local.draft.keys()) {
      const item = ctx.view.items.find((i) => i.id === id);
      if (!item) continue;
      const b = hitungBaris(item, saved);
      if (b.invalid || b.berubah) out.push({ item, ...b });
    }
    return out;
  }
  function refreshSaveBar() {
    const host = root.querySelector('#save-bar');
    if (!host) return;
    const ch = local.mode === 'input' ? perubahan() : [];
    if (!ch.length) { host.innerHTML = ''; return; }
    const invalid = ch.filter((c) => c.invalid).length, over = ch.filter((c) => !c.invalid && c.melebihiBoq).length;
    const nilai = ch.reduce((s, c) => s + (c.invalid ? 0 : (c.volume - c.ada) * c.item.hargaNego), 0);
    host.innerHTML = `<div class="no-print sticky bottom-3 z-20 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
      <div><b>${ch.length} perubahan</b> belum disimpan untuk ${fmt.tgl(local.tanggal)} · selisih nilai progres ${nilai < 0 ? '−' : '+'}${fmt.rp(Math.abs(nilai))} (${fmt.pct(nilai / ctx.view.summary.totalNilai, 3, true)})
        ${over ? `<span class="ml-2 inline-flex items-center gap-1 font-semibold text-amber-300">${ui.icon('triangle-alert')}${over} item CEK &gt; BOQ</span>` : ''}
        ${invalid ? `<span class="ml-2 inline-flex items-center gap-1 font-semibold text-red-300">${ui.icon('octagon-alert')}${invalid} angka tidak valid</span>` : ''}</div>
      <div class="flex gap-2"><button type="button" id="btn-batal" class="btn">Batalkan</button>
      <button type="button" id="btn-simpan" class="btn-primary" ${invalid ? 'disabled title="Perbaiki angka yang tidak valid dulu"' : ''}>${ui.icon('save')}Simpan input harian</button></div></div>`;
    host.querySelector('#btn-batal').addEventListener('click', () => { local.draft.clear(); refreshTable(); });
    host.querySelector('#btn-simpan').addEventListener('click', simpan);
  }
  async function simpan() {
    const ch = perubahan();
    if (!ch.length || ch.some((c) => c.invalid)) return;
    const over = ch.filter((c) => c.melebihiBoq);
    if (over.length) {
      const ok = await ui.confirm({
        title: `CEK > BOQ pada ${over.length} item`, confirmLabel: 'Tetap simpan',
        message: `Total realisasi berikut melebihi volume BOQ:<ul class="mt-2 list-disc space-y-1 pl-5">${over.slice(0, 6).map((c) =>
          `<li><b>${esc(c.item.id)}</b> — ${fmt.vol(c.total)} dari ${fmt.vol(c.item.volume)} ${esc(c.item.satuan)} (lebih ${fmt.vol(c.kelebihan)})</li>`).join('')}${over.length > 6 ? `<li>…dan ${over.length - 6} item lain</li>` : ''}</ul>
          <p class="mt-2">Periksa satuan dan angka. Bila memang pekerjaan tambah, simpan lalu tindak lanjuti lewat addendum.</p>`,
      });
      if (!ok) return;
    }
    const tanggal = local.tanggal, n = ch.length;
    local.draft.clear();
    store.saveProgress(ch.map((c) => ({ itemId: c.item.id, tanggal, volume: c.volume })), ctx.isAdmin ? 'Admin' : 'Staf');
    ui.toast(`${n} input harian ${fmt.tgl(tanggal)} tersimpan`);
  }

  // ------------------------------------------------------------ modal item
  function itemModal(id) {
    const baru = !id, admin = ctx.isAdmin;
    const i = baru ? { id: '', divisionId: local.divisionId || ctx.state.divisions[0].id, subbagian: '', uraian: '', satuan: '', volume: '', hargaNego: '', targetVolDes: null, pic: '', mulai: '', selesai: '', kendala: '', actionPlan: '', dueDate: '' }
      : ctx.view.items.find((x) => x.id === id);
    const ro = admin ? '' : 'disabled';
    const num = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
    const riwayat = baru ? [] : ctx.state.progress.filter((p) => p.itemId === id).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    ui.modal({
      title: baru ? 'Tambah item BOQ' : `${admin ? 'Ubah' : 'Detail'} item ${i.id}`, size: 'max-w-3xl',
      subtitle: baru ? 'Item baru ikut menghitung ulang bobot seluruh BOQ.' : `Nilai ${fmt.rp(i.nilai)} · bobot ${fmt.pct(i.bobot, 3)} · realisasi ${fmt.vol(i.realisasi)} ${i.satuan}`,
      onSubmit: admin ? submit : null,
      extraFooter: admin && !baru ? `<button type="button" data-hapus class="btn text-red-700">${ui.icon('trash-2')}Hapus item</button>` : '',
      body: `<div class="grid gap-4 sm:grid-cols-6">
        ${ui.field('Kode', `<input name="id" class="input font-mono" maxlength="12" value="${esc(i.id)}" ${baru ? 'required' : 'disabled'}>`, '', 'sm:col-span-2')}
        ${ui.field('Divisi', `<select name="divisionId" class="input" ${ro}>${ui.options(ctx.state.divisions.map((d) => [d.id, divLabel(d)]), i.divisionId)}</select>`, '', 'sm:col-span-4')}
        ${ui.field('Uraian BOQ', `<textarea name="uraian" rows="2" class="input" maxlength="300" ${ro}>${esc(i.uraian)}</textarea>`, '', 'sm:col-span-6')}
        ${ui.field('Subbagian', `<input name="subbagian" class="input" maxlength="80" value="${esc(i.subbagian)}" ${ro}>`, '', 'sm:col-span-4')}
        ${ui.field('Satuan', `<input name="satuan" class="input" maxlength="12" value="${esc(i.satuan)}" ${ro}>`, '', 'sm:col-span-2')}
        ${ui.field('Volume BOQ', `<input name="volume" class="input text-right" inputmode="decimal" value="${num(i.volume)}" ${ro}>`, '', 'sm:col-span-2')}
        ${ui.field('Harga nego (Rp)', `<input name="hargaNego" class="input text-right" inputmode="decimal" value="${num(i.hargaNego)}" ${ro}>`, '', 'sm:col-span-2')}
        ${ui.field('Target vol Des', `<input name="targetVolDes" class="input text-right" inputmode="decimal" value="${num(i.targetVolDes)}" ${ro}>`, 'Kosongkan bila belum ada target', 'sm:col-span-2')}
        ${ui.field('PIC', `<input name="pic" class="input" maxlength="80" value="${esc(i.pic)}" ${ro}>`, '', 'sm:col-span-2')}
        ${ui.field('Jadwal mulai', `<input name="mulai" type="date" class="input" value="${i.mulai || ''}" ${ro}>`, '', 'sm:col-span-2')}
        ${ui.field('Jadwal selesai', `<input name="selesai" type="date" class="input" value="${i.selesai || ''}" ${ro}>`, '', 'sm:col-span-2')}
        ${ui.field('Kendala', `<textarea name="kendala" rows="2" class="input" maxlength="500" ${ro}>${esc(i.kendala)}</textarea>`, '', 'sm:col-span-3')}
        ${ui.field('Action plan / tindak lanjut', `<textarea name="actionPlan" rows="2" class="input" maxlength="500" ${ro}>${esc(i.actionPlan)}</textarea>`, '', 'sm:col-span-3')}
        ${ui.field('Due date action', `<input name="dueDate" type="date" class="input" value="${i.dueDate || ''}" ${ro}>`, '', 'sm:col-span-2')}
      </div>
      ${baru ? '' : `<h3 class="label mt-5">Riwayat input harian (${riwayat.length})</h3>
      ${riwayat.length ? `<div class="max-h-48 overflow-auto rounded-lg ring-1 ring-slate-200"><table class="tbl"><thead><tr><th>Tanggal</th><th class="num">Volume</th><th class="num">Nilai (Rp)</th><th>Diinput oleh</th></tr></thead>
        <tbody>${riwayat.map((p) => `<tr><td>${fmt.tgl(p.tanggal, true)}</td><td class="num">${fmt.vol(p.volume)} ${esc(i.satuan)}</td><td class="num">${fmt.rp0(p.volume * i.hargaNego)}</td><td>${esc(p.diinputOleh || '–')}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="text-sm text-slate-500">Belum ada realisasi untuk item ini.</p>'}`}`,
      onMount(el, close) {
        const del = el.querySelector('[data-hapus]');
        if (del) del.addEventListener('click', async () => {
          const ok = await ui.confirm({ title: `Hapus item ${i.id}?`, danger: true, confirmLabel: 'Hapus',
            message: `Item beserta <b>${riwayat.length} entri realisasi harian</b> akan dihapus dan bobot seluruh BOQ dihitung ulang. Tindakan ini tidak bisa dibatalkan.` });
          if (ok) { close(); local.draft.delete(i.id); store.deleteItem(i.id); ui.toast(`Item ${i.id} dihapus`); }
        });
      },
    });
    function submit(v) {
      const kode = baru ? v.id.trim().toUpperCase() : i.id;
      if (baru && !/^[A-Z0-9][A-Z0-9._-]{1,11}$/.test(kode)) return 'Kode wajib diisi (2–12 karakter: huruf, angka, titik, strip).';
      if (baru && ctx.state.items.some((x) => x.id === kode)) return `Kode ${kode} sudah dipakai.`;
      if (!v.uraian.trim()) return 'Uraian BOQ wajib diisi.';
      if (!v.satuan.trim()) return 'Satuan wajib diisi.';
      const volume = fmt.parseNum(v.volume), harga = fmt.parseNum(v.hargaNego), target = fmt.parseNum(v.targetVolDes);
      if (!(volume > 0)) return 'Volume BOQ harus angka lebih dari 0.';
      if (!(harga >= 0) || harga == null) return 'Harga nego harus angka 0 atau lebih.';
      if (Number.isNaN(target) || target < 0) return 'Target vol Des harus angka 0 atau lebih (atau dikosongkan).';
      if (target != null && target > volume + calc.EPS) return 'Target vol Des tidak boleh melebihi volume BOQ.';
      if (v.mulai && v.selesai && v.selesai < v.mulai) return 'Jadwal selesai tidak boleh sebelum jadwal mulai.';
      store.upsertItem({ id: kode, divisionId: v.divisionId, subbagian: v.subbagian.trim(), uraian: v.uraian.trim(), satuan: v.satuan.trim(), volume, hargaNego: harga, targetVolDes: target,
        pic: v.pic.trim(), mulai: v.mulai || null, selesai: v.selesai || null, kendala: v.kendala.trim(), actionPlan: v.actionPlan.trim(), dueDate: v.dueDate || null });
      ui.toast(baru ? `Item ${kode} ditambahkan` : `Item ${kode} disimpan`);
    }
  }

  // ------------------------------------------------------------------ mount
  function refreshTable() {
    const host = root.querySelector('#tbl-host');
    host.innerHTML = tableHTML();
    const clear = host.querySelector('#btn-clear');
    if (clear) clear.addEventListener('click', () => { Object.assign(local, { q: '', divisionId: '', status: '', hanyaTerisi: false }); ctx.setUI({}); });
    refreshSaveBar();
  }
  const adaDraft = () => local.mode === 'input' && perubahan().length > 0;
  async function bolehBuang() {
    if (!adaDraft()) return true;
    const ok = await ui.confirm({ title: 'Buang perubahan yang belum disimpan?', confirmLabel: 'Buang perubahan',
      message: `Ada ${perubahan().length} input harian untuk ${fmt.tgl(local.tanggal)} yang belum disimpan.` });
    if (ok) local.draft.clear();
    return ok;
  }

  function mount(el, c) {
    ctx = c; root = el;
    refreshTable();
    const on = (sel, ev, fn) => { const n = el.querySelector(sel); if (n) n.addEventListener(ev, fn); };
    el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', async () => {
      if (b.dataset.mode === local.mode || !(await bolehBuang())) return;
      local.mode = b.dataset.mode; ctx.setUI({});
    }));
    on('#f-q', 'input', (e) => { local.q = e.target.value; refreshTable(); });
    on('#f-div', 'change', (e) => { local.divisionId = e.target.value; refreshTable(); });
    on('#f-status', 'change', (e) => { local.status = e.target.value; refreshTable(); });
    on('#f-terisi', 'change', (e) => { local.hanyaTerisi = e.target.checked; refreshTable(); });
    on('#f-tanggal', 'change', async (e) => {
      const t = e.target.value;
      if (!t || t === local.tanggal) return;
      if (!(await bolehBuang())) { e.target.value = local.tanggal; return; }
      local.tanggal = t; ctx.setUI({});
    });
    on('#btn-tambah', 'click', () => itemModal(null));

    const host = el.querySelector('#tbl-host');
    host.addEventListener('click', (e) => { const b = e.target.closest('[data-item]'); if (b) itemModal(b.dataset.item); });
    host.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-input]');
      if (!inp) return;
      const id = inp.dataset.input, item = ctx.view.items.find((i) => i.id === id), saved = tersimpan();
      local.draft.set(id, inp.value);
      const b = hitungBaris(item, saved);
      if (!b.invalid && !b.berubah) local.draft.delete(id);       // kembali ke nilai tersimpan
      const tr = inp.closest('tr');
      tr.querySelectorAll('[data-c]').forEach((n) => n.remove());
      tr.insertAdjacentHTML('beforeend', computedCells(item, b));
      inp.classList.toggle('border-red-600', b.invalid || b.melebihiBoq);
      inp.setAttribute('aria-invalid', String(b.invalid || b.melebihiBoq));
      refreshSaveBar();
    });
    // Enter / panah bawah-atas berpindah antar baris seperti di Excel.
    host.addEventListener('keydown', (e) => {
      if (!e.target.matches('[data-input]') || !['Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const all = [...host.querySelectorAll('[data-input]')], next = all[all.indexOf(e.target) + (e.key === 'ArrowUp' ? -1 : 1)];
      if (next) { next.focus(); next.select(); }
    });
  }

  window.addEventListener('beforeunload', (e) => { if (ctx && root && root.isConnected && adaDraft()) { e.preventDefault(); e.returnValue = ''; } });

  JIAT.registerModule({ id: 'input', label: 'Input Harian & Rincian BOQ', icon: 'clipboard-list', order: 20, render, mount, beforeLeave: bolehBuang });
})();
