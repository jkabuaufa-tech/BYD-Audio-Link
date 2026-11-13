/**
 * store.js — Lapisan data.
 *
 * MODEL: state = DATA AWAL (seed dari Excel) + OVERLAY (perubahan pengguna).
 * Overlay adalah kumpulan dokumen kecil per koleksi; inilah yang disimpan dan
 * disinkronkan, sehingga dua orang yang mengubah hal berbeda tidak saling
 * menimpa. `rebuild()` menggabungkan keduanya menjadi state yang dibaca modul.
 *
 *   overlay = {
 *     meta:        { project: {targetDes, baselineMulai, baselineAkhir} },
 *     divisions:   { "DIV-03": {pic, kendala, tindakLanjut, dueDate, statusAction} },
 *     items:       { "N055": {…seluruh field item…} | {dihapus: true} },
 *     progress:    { "2026-11-13~<pengguna>": {tanggal, oleh, entries: {"N055": {v, t, n}}} },
 *     dailyNotes:  { "2026-11-13": {kendala, action, dueDate, status, catatan} },
 *     procurement: { "PGD-01": {stock2026, mos, catatan} },
 *     wells:       { "SBD-31": {tim, vendorPemboran, status, catatan, rekomtek} },
 *   }
 *
 * Progres harian disimpan satu dokumen per (tanggal, pengguna): tiap orang
 * hanya menulis dokumennya sendiri. Bila dua orang mengisi item & tanggal yang
 * sama, entri dengan waktu `t` terbaru yang dipakai; v = 0 berarti dihapus.
 *
 * PENYIMPANAN: LocalStorage (selalu, sebagai salinan lokal) + "remote" opsional
 * yang dipasang sync.js (basis data bersama). Untuk pindah ke PostgreSQL/MySQL
 * cukup buat adaptor remote baru — modul tampilan tidak perlu diubah.
 */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const KEY = 'jiat-monitoring:overlay';
  const KEY_V1 = 'jiat-monitoring:data';           // format lama (state penuh)
  const SCHEMA_VERSION = 2;
  const COLS = ['meta', 'divisions', 'items', 'progress', 'dailyNotes', 'procurement', 'wells'];
  const F = {
    project: ['targetDes', 'baselineMulai', 'baselineAkhir'],
    divisions: ['pic', 'kendala', 'tindakLanjut', 'dueDate', 'statusAction'],
    items: ['divisionId', 'subbagian', 'uraian', 'satuan', 'volume', 'hargaNego', 'targetVolDes', 'pic', 'mulai', 'selesai', 'kendala', 'actionPlan', 'dueDate'],
    dailyNotes: ['kendala', 'action', 'dueDate', 'status', 'catatan'],
    procurement: ['stock2026', 'mos', 'catatan'],
    wells: ['tim', 'vendorPemboran', 'status', 'catatan', 'rekomtek'],
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const now = () => new Date().toISOString();
  const pick = (src, keys) => Object.fromEntries(keys.filter((k) => src && k in src).map((k) => [k, src[k]]));
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const emptyOverlay = () => Object.fromEntries(COLS.map((c) => [c, {}]));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /** Data dari luar (remote/berkas) tidak dipercaya: rapikan tipe tiap field. */
  const text = (v, max = 2000) => (v == null ? '' : String(v).slice(0, max));
  const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const dateOrNull = (v) => (isDate(v) ? v : null);
  const CLEAN = {
    pic: text, kendala: text, tindakLanjut: text, statusAction: (v) => text(v, 16) || 'OPEN', dueDate: dateOrNull,
    subbagian: text, uraian: text, satuan: (v) => text(v, 12), mulai: dateOrNull, selesai: dateOrNull, actionPlan: text,
    targetVolDes: numOrNull, action: text, status: (v) => text(v, 16), catatan: text, stock2026: numOrNull, mos: numOrNull,
    tim: text, vendorPemboran: text, rekomtek: text,
  };
  const cleanFields = (doc, keys) => Object.fromEntries(keys.filter((k) => isObj(doc) && k in doc && CLEAN[k]).map((k) => [k, CLEAN[k](doc[k])]));

  let overlay = emptyOverlay();
  let state = null;
  let storageOk = true;
  let remote = null;                 // { write(changes): void }
  let uid = 'lokal';                 // identitas penulis dokumen progres
  let notifyTimer = null;
  const listeners = new Set();

  // ------------------------------------------------------------- rebuild
  function rebuild() {
    const s = clone(JIAT.SEED);
    s.schemaVersion = SCHEMA_VERSION;

    const p = overlay.meta.project;
    if (isObj(p)) {
      if (typeof p.targetDes === 'number' && p.targetDes > 0 && p.targetDes <= 1) s.project.targetDes = p.targetDes;
      if (isDate(p.baselineMulai) && isDate(p.baselineAkhir) && p.baselineAkhir > p.baselineMulai) {
        s.project.baselineMulai = p.baselineMulai; s.project.baselineAkhir = p.baselineAkhir;
      }
    }
    s.divisions.forEach((d) => Object.assign(d, cleanFields(overlay.divisions[d.id], F.divisions)));
    const divIds = new Set(s.divisions.map((d) => d.id));

    // Item: seed ditimpa/dihapus oleh overlay; item baru disisipkan di akhir divisinya.
    const validItem = (d) => isObj(d) && !d.dihapus && typeof d.volume === 'number' && d.volume > 0 &&
      typeof d.hargaNego === 'number' && d.hargaNego >= 0 && divIds.has(d.divisionId) && text(d.uraian);
    const toItem = (id, d) => ({ id, divisionId: d.divisionId, volume: d.volume, hargaNego: d.hargaNego, ...cleanFields(d, F.items.filter((k) => !['divisionId', 'volume', 'hargaNego'].includes(k))) });
    const seedIds = new Set(s.items.map((i) => i.id));
    s.items = s.items.filter((i) => !(isObj(overlay.items[i.id]) && overlay.items[i.id].dihapus))
      .map((i) => (validItem(overlay.items[i.id]) ? { ...i, ...toItem(i.id, overlay.items[i.id]) } : i));
    for (const id of Object.keys(overlay.items).sort()) {
      if (seedIds.has(id) || !validItem(overlay.items[id])) continue;
      const it = { subbagian: '', pic: '', mulai: null, selesai: null, kendala: '', actionPlan: '', dueDate: null, targetVolDes: null, ...toItem(id, overlay.items[id]) };
      let at = s.items.length;
      for (let j = s.items.length - 1; j >= 0; j--) if (s.items[j].divisionId === it.divisionId) { at = j + 1; break; }
      s.items.splice(at, 0, it);
    }
    const itemIds = new Set(s.items.map((i) => i.id));

    // Progres: per (item, tanggal) ambil entri dengan t terbaru; v = 0 → dihapus.
    const best = new Map(s.progress.map((r) => [r.itemId + ':' + r.tanggal, { v: r.volume, t: '', n: 'Excel', itemId: r.itemId, tanggal: r.tanggal }]));
    for (const doc of Object.values(overlay.progress)) {
      if (!isObj(doc) || !isDate(doc.tanggal) || !isObj(doc.entries)) continue;
      for (const [itemId, e] of Object.entries(doc.entries)) {
        if (!isObj(e) || typeof e.v !== 'number' || !Number.isFinite(e.v) || e.v < 0) continue;
        const k = itemId + ':' + doc.tanggal, cur = best.get(k), t = text(e.t, 40);
        if (!cur || t >= cur.t) best.set(k, { v: e.v, t, n: text(e.n, 80) || text(doc.oleh, 80) || 'Staf', itemId, tanggal: doc.tanggal });
      }
    }
    s.progress = [...best.entries()].filter(([, e]) => e.v > 0 && itemIds.has(e.itemId))
      .map(([id, e]) => ({ id, itemId: e.itemId, tanggal: e.tanggal, volume: e.v, diinputOleh: e.n, updatedAt: e.t || null }));

    const notes = new Map(s.dailyNotes.map((n) => [n.tanggal, n]));
    for (const [tanggal, d] of Object.entries(overlay.dailyNotes)) if (isDate(tanggal) && isObj(d)) notes.set(tanggal, { tanggal, kendala: '', action: '', dueDate: null, status: '', catatan: '', ...cleanFields(d, F.dailyNotes) });
    s.dailyNotes = [...notes.values()].filter((n) => n.kendala || n.action || n.dueDate || n.status || n.catatan);

    s.procurement.forEach((r) => { Object.assign(r, cleanFields(overlay.procurement[r.id], F.procurement)); if (!itemIds.has(r.itemId)) r.itemId = null; });
    s.wells.forEach((w) => Object.assign(w, cleanFields(overlay.wells[w.id], F.wells)));
    state = s;
  }

  // ------------------------------------------------------- simpan / siarkan
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, overlay })); storageOk = true; }
    catch (e) { storageOk = false; }
  }
  function notify() { listeners.forEach((fn) => fn(state)); }

  /** Terapkan perubahan [{col, id, doc|null}] ke overlay, simpan, dan kirim ke remote. */
  function apply(changes) {
    if (!changes.length) return;
    for (const c of changes) { if (c.doc == null) delete overlay[c.col][c.id]; else overlay[c.col][c.id] = c.doc; }
    rebuild(); persist(); notify();
    if (remote) remote.write(changes);
  }

  /** Periksa bentuk minimal sebuah state penuh (berkas cadangan). */
  function validate(s) {
    if (!isObj(s) || !isObj(s.project)) throw new Error('Berkas bukan data JIAT Monitoring');
    for (const k of ['divisions', 'items', 'progress', 'dailyNotes', 'procurement', 'wells']) if (!Array.isArray(s[k])) throw new Error('Koleksi "' + k + '" tidak ditemukan');
    if (s.schemaVersion > SCHEMA_VERSION) throw new Error('Data berasal dari versi aplikasi yang lebih baru');
    for (const it of s.items) if (!isObj(it) || !it.id || typeof it.volume !== 'number' || typeof it.hargaNego !== 'number') throw new Error('Item BOQ tidak valid');
    return s;
  }

  const progDocId = (tanggal) => tanggal + '~' + uid;
  /** Salin dokumen progres milik pengguna ini untuk `tanggal`, siap diubah. */
  function myProgDoc(target, tanggal) {
    const id = progDocId(tanggal);
    if (!target[id]) target[id] = overlay.progress[id] ? clone(overlay.progress[id]) : { tanggal, oleh: uid, entries: {} };
    return target[id];
  }

  /** Ubah state penuh (cadangan) menjadi overlay = selisihnya terhadap seed. */
  function diffToOverlay(s) {
    const seed = JIAT.SEED, o = emptyOverlay(), byId = (list) => new Map(list.map((r) => [r.id, r]));
    const proj = pick(s.project, F.project);
    if (!same(proj, pick(seed.project, F.project))) o.meta.project = proj;
    for (const [col, keys] of [['divisions', F.divisions], ['procurement', F.procurement], ['wells', F.wells]]) {
      const base = byId(seed[col]);
      for (const r of s[col]) if (isObj(r) && base.has(r.id) && !same(pick(r, keys), pick(base.get(r.id), keys))) o[col][r.id] = pick(r, keys);
    }
    const seedItems = byId(seed.items), got = new Set();
    for (const it of s.items) {
      got.add(it.id);
      if (!seedItems.has(it.id) || !same(pick(it, F.items), pick(seedItems.get(it.id), F.items))) o.items[String(it.id).slice(0, 12)] = pick(it, F.items);
    }
    for (const id of seedItems.keys()) if (!got.has(id)) o.items[id] = { dihapus: true };
    const seedProg = new Map(seed.progress.map((r) => [r.itemId + ':' + r.tanggal, r.volume])), seen = new Set(), stamp = now();
    for (const r of s.progress) {
      if (!isObj(r) || !isDate(r.tanggal) || typeof r.volume !== 'number' || !(r.volume > 0)) continue;
      const k = r.itemId + ':' + r.tanggal; seen.add(k);
      if (seedProg.get(k) === r.volume) continue;
      myProgDoc(o.progress, r.tanggal).entries[r.itemId] = { v: r.volume, t: text(r.updatedAt, 40) || stamp, n: text(r.diinputOleh, 80) };
    }
    for (const k of seedProg.keys()) if (!seen.has(k)) { const [itemId, tanggal] = k.split(':'); myProgDoc(o.progress, tanggal).entries[itemId] = { v: 0, t: stamp, n: '' }; }
    // myProgDoc menyalin dokumen overlay lama; untuk pemulihan penuh hanya entri baru yang berlaku.
    for (const n of s.dailyNotes) if (isObj(n) && isDate(n.tanggal)) o.dailyNotes[n.tanggal] = pick(n, F.dailyNotes);
    return o;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (isObj(d.overlay)) { COLS.forEach((c) => { if (isObj(d.overlay[c])) overlay[c] = d.overlay[c]; }); return; } }
      const v1 = localStorage.getItem(KEY_V1);          // migrasi dari versi 1 (state penuh)
      if (v1) { overlay = diffToOverlay(validate(JSON.parse(v1))); persist(); }
    } catch (e) { console.error('Data tersimpan tidak terbaca, memakai data awal.', e); overlay = emptyOverlay(); }
  }

  JIAT.store = {
    SCHEMA_VERSION, COLS,
    init() { load(); rebuild(); return state; },
    get: () => state,
    isPersistent: () => storageOk || !!remote,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // --- sinkronisasi (dipakai sync.js) ----------------------------------------
    /** Pasang adaptor basis data bersama dan identitas pengguna. */
    attachRemote(adapter, userId) { remote = adapter; if (userId) uid = userId; },
    /** Ganti isi satu koleksi overlay dengan data terbaru dari remote. */
    applyRemote(col, docs) {
      if (!COLS.includes(col) || same(overlay[col], docs)) return;
      overlay[col] = docs;
      clearTimeout(notifyTimer);
      notifyTimer = setTimeout(() => { rebuild(); persist(); notify(); }, 40);   // gabungkan beberapa koleksi → satu render
    },

    // --- progress (realisasi harian) -------------------------------------------
    /** Simpan banyak input harian sekaligus. volume 0/null = hapus entri. */
    saveProgress(entries, nama) {
      const docs = {}, t = now();
      for (const e of entries) myProgDoc(docs, e.tanggal).entries[e.itemId] = { v: e.volume || 0, t, n: text(nama, 80) };
      apply(Object.entries(docs).map(([id, doc]) => ({ col: 'progress', id, doc })));
    },
    /**
     * Gabungkan input harian dari berkas JSON kiriman staf (mode tanpa sinkron).
     * Entri baru ditambahkan; volume berbeda → yang `updatedAt`-nya lebih baru.
     */
    mergeProgress(textJSON) {
      const data = validate(JSON.parse(textJSON));
      const itemIds = new Set(state.items.map((i) => i.id)), cur = new Map(state.progress.map((p) => [p.id, p]));
      const hasil = { baru: 0, diperbarui: 0, sama: 0, dilewati: 0, catatan: 0 }, docs = {}, changes = [];
      for (const p of data.progress) {
        if (!isObj(p) || !itemIds.has(p.itemId) || !isDate(p.tanggal) || typeof p.volume !== 'number' || !(p.volume > 0)) { hasil.dilewati++; continue; }
        const lama = cur.get(p.itemId + ':' + p.tanggal), t = text(p.updatedAt, 40);
        if (lama && Math.abs(lama.volume - p.volume) < 1e-7) { hasil.sama++; continue; }
        if (lama && !(t > (lama.updatedAt || ''))) { hasil.dilewati++; continue; }
        myProgDoc(docs, p.tanggal).entries[p.itemId] = { v: p.volume, t: t || now(), n: text(p.diinputOleh, 80) || 'Staf' };
        hasil[lama ? 'diperbarui' : 'baru']++;
      }
      Object.entries(docs).forEach(([id, doc]) => changes.push({ col: 'progress', id, doc }));
      const ada = new Set(state.dailyNotes.map((n) => n.tanggal));   // catatan rapat: hanya mengisi tanggal kosong
      for (const n of data.dailyNotes) {
        if (!isObj(n) || !isDate(n.tanggal) || ada.has(n.tanggal)) continue;
        changes.push({ col: 'dailyNotes', id: n.tanggal, doc: pick(n, F.dailyNotes) }); ada.add(n.tanggal); hasil.catatan++;
      }
      apply(changes);
      return hasil;
    },

    // --- master & koleksi lain -------------------------------------------------
    upsertItem(data) { apply([{ col: 'items', id: data.id, doc: pick(data, F.items) }]); },
    deleteItem(id) { apply([{ col: 'items', id, doc: { dihapus: true } }]); },
    updateDivision(id, data) { apply([{ col: 'divisions', id, doc: { ...overlay.divisions[id], ...pick(data, F.divisions) } }]); },
    upsertDailyNote(tanggal, data) { apply([{ col: 'dailyNotes', id: tanggal, doc: pick(data, F.dailyNotes) }]); },
    updateProcurement(id, data) { apply([{ col: 'procurement', id, doc: { ...overlay.procurement[id], ...pick(data, F.procurement) } }]); },
    updateWell(id, data) { apply([{ col: 'wells', id, doc: { ...overlay.wells[id], ...pick(data, F.wells) } }]); },
    updateProject(data) { apply([{ col: 'meta', id: 'project', doc: { ...overlay.meta.project, ...pick(data, F.project) } }]); },

    // --- cadangan / pemulihan ---------------------------------------------------
    exportJSON: () => JSON.stringify({ aplikasi: 'jiat-monitoring', diekspor: now(), ...state }, null, 2),
    /** Ganti SELURUH data dengan isi berkas cadangan. */
    importJSON(textJSON) {
      const data = validate(JSON.parse(textJSON));
      const lama = overlay;
      overlay = emptyOverlay();                       // agar diffToOverlay tidak menyalin dokumen progres lama
      const baru = diffToOverlay(data);
      overlay = lama;
      const changes = [];
      for (const col of COLS) {
        for (const id of Object.keys(overlay[col])) if (!(id in baru[col])) changes.push({ col, id, doc: null });
        for (const [id, doc] of Object.entries(baru[col])) if (!same(overlay[col][id], doc)) changes.push({ col, id, doc });
      }
      apply(changes);
    },
    reset() { apply(COLS.flatMap((col) => Object.keys(overlay[col]).map((id) => ({ col, id, doc: null })))); },
  };
})();
