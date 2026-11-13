/**
 * store.js — Lapisan data (state + LocalStorage).
 *
 * Satu-satunya berkas yang tahu DI MANA data disimpan. Untuk pindah ke
 * PostgreSQL/MySQL: ganti isi `persist()`/`load()` dan badan tiap aksi dengan
 * panggilan REST API — modul tampilan tidak perlu diubah. Setiap koleksi di
 * bawah setara satu tabel (DDL contoh ada di README).
 *
 * state = {
 *   schemaVersion, project{nama,targetDes,baselineMulai,baselineAkhir},
 *   divisions[], items[], progress[], dailyNotes[], procurement[], wells[]
 * }
 */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const KEY = 'jiat-monitoring:data';
  const SCHEMA_VERSION = 1;

  /**
   * Migrasi skema: MIGRATIONS[n] mengubah data versi n menjadi n+1.
   * Saat menambah field/tabel baru: naikkan SCHEMA_VERSION dan tambahkan
   * fungsi di sini supaya data lama pengguna tidak hilang.
   */
  const MIGRATIONS = {
    // 1: (s) => { s.tabelBaru = []; return s; },
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const now = () => new Date().toISOString();
  let state = null;
  let storageOk = true;
  const listeners = new Set();

  function fromSeed() {
    const s = clone(JIAT.SEED);
    s.schemaVersion = SCHEMA_VERSION;
    s.progress = s.progress.map((p) => ({ ...p, id: p.itemId + '|' + p.tanggal, diinputOleh: 'Excel', updatedAt: null }));
    return s;
  }

  function migrate(s) {
    while ((s.schemaVersion || 1) < SCHEMA_VERSION) {
      const step = MIGRATIONS[s.schemaVersion || 1];
      if (!step) throw new Error('Migrasi skema v' + s.schemaVersion + ' tidak tersedia');
      s = step(s);
      s.schemaVersion = (s.schemaVersion || 1) + 1;
    }
    return s;
  }

  /** Periksa bentuk minimal data (dipakai saat memuat & saat restore). */
  function validate(s) {
    const arr = ['divisions', 'items', 'progress', 'dailyNotes', 'procurement', 'wells'];
    if (!s || typeof s !== 'object' || !s.project) throw new Error('Berkas bukan data JIAT Monitoring');
    for (const k of arr) if (!Array.isArray(s[k])) throw new Error('Koleksi "' + k + '" tidak ditemukan');
    if (s.schemaVersion > SCHEMA_VERSION) throw new Error('Data berasal dari versi aplikasi yang lebih baru');
    for (const it of s.items) {
      if (!it.id || typeof it.volume !== 'number' || typeof it.hargaNego !== 'number') throw new Error('Item BOQ tidak valid: ' + it.id);
    }
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(validate(JSON.parse(raw)));
    } catch (e) {
      console.error('Data tersimpan tidak terbaca, memakai data awal.', e);
      try { localStorage.setItem(KEY + ':rusak', localStorage.getItem(KEY) || ''); } catch (_) { /* abaikan */ }
    }
    return fromSeed();
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; }
    catch (e) { storageOk = false; console.error('Gagal menyimpan ke LocalStorage', e); }
  }

  function commit() { persist(); listeners.forEach((fn) => fn(state)); }
  const find = (list, id, label) => {
    const row = list.find((r) => r.id === id);
    if (!row) throw new Error(label + ' tidak ditemukan: ' + id);
    return row;
  };
  const pick = (src, keys) => Object.fromEntries(keys.filter((k) => k in src).map((k) => [k, src[k]]));

  JIAT.store = {
    SCHEMA_VERSION,
    init() { state = load(); return state; },
    get: () => state,
    isPersistent: () => storageOk,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // --- progress (realisasi harian) : unik per (itemId, tanggal) -------------
    /** Simpan banyak input harian sekaligus. volume 0/null = hapus entri. */
    saveProgress(entries, oleh) {
      for (const e of entries) {
        const id = e.itemId + '|' + e.tanggal;
        const i = state.progress.findIndex((p) => p.id === id);
        if (!e.volume) { if (i >= 0) state.progress.splice(i, 1); continue; }
        const row = { id, itemId: e.itemId, tanggal: e.tanggal, volume: e.volume, diinputOleh: oleh, updatedAt: now() };
        if (i >= 0) state.progress[i] = row; else state.progress.push(row);
      }
      commit();
    },

    // --- items (master BOQ) ----------------------------------------------------
    upsertItem(data) {
      const keys = ['divisionId', 'subbagian', 'uraian', 'satuan', 'volume', 'hargaNego', 'targetVolDes', 'pic', 'mulai', 'selesai', 'kendala', 'actionPlan', 'dueDate'];
      const i = state.items.findIndex((r) => r.id === data.id);
      if (i >= 0) Object.assign(state.items[i], pick(data, keys));
      else {
        // Sisipkan setelah item terakhir pada divisi yang sama agar urutan BOQ terjaga.
        let at = state.items.length;
        for (let j = state.items.length - 1; j >= 0; j--) if (state.items[j].divisionId === data.divisionId) { at = j + 1; break; }
        state.items.splice(at, 0, { id: data.id, ...pick(data, keys) });
      }
      commit();
    },
    deleteItem(id) {
      state.items = state.items.filter((r) => r.id !== id);
      state.progress = state.progress.filter((p) => p.itemId !== id);
      state.procurement.forEach((p) => { if (p.itemId === id) p.itemId = null; });
      commit();
    },

    // --- koleksi lain ----------------------------------------------------------
    updateDivision(id, data) {
      Object.assign(find(state.divisions, id, 'Divisi'), pick(data, ['pic', 'kendala', 'tindakLanjut', 'dueDate', 'statusAction']));
      commit();
    },
    upsertDailyNote(tanggal, data) {
      const note = { tanggal, ...pick(data, ['kendala', 'action', 'dueDate', 'status', 'catatan']) };
      const kosong = !note.kendala && !note.action && !note.dueDate && !note.status && !note.catatan;
      state.dailyNotes = state.dailyNotes.filter((n) => n.tanggal !== tanggal);
      if (!kosong) state.dailyNotes.push(note);
      commit();
    },
    updateProcurement(id, data) {
      Object.assign(find(state.procurement, id, 'Pengadaan'), pick(data, ['stock2026', 'mos', 'catatan']));
      commit();
    },
    updateWell(id, data) {
      Object.assign(find(state.wells, id, 'Sumur'), pick(data, ['tim', 'vendorPemboran', 'status', 'catatan', 'rekomtek']));
      commit();
    },
    updateProject(data) {
      Object.assign(state.project, pick(data, ['targetDes', 'baselineMulai', 'baselineAkhir']));
      commit();
    },

    // --- backup / restore ------------------------------------------------------
    exportJSON: () => JSON.stringify({ aplikasi: 'jiat-monitoring', diekspor: now(), ...state }, null, 2),
    importJSON(text) {
      const data = JSON.parse(text);
      delete data.aplikasi; delete data.diekspor;
      state = migrate(validate(data));
      commit();
    },
/**
     * Gabungkan input harian dari berkas cadangan staf lain (tanpa menimpa master).
     * Aturan: entri (item, tanggal) yang belum ada → ditambahkan; yang sudah ada
     * dengan volume berbeda → dipakai yang `updatedAt`-nya lebih baru.
     * @returns {{baru:number, diperbarui:number, sama:number, dilewati:number, catatan:number}}
     */
    mergeProgress(text) {
      const data = validate(JSON.parse(text));
      const itemIds = new Set(state.items.map((i) => i.id));
      const byId = new Map(state.progress.map((p) => [p.id, p]));
      const hasil = { baru: 0, diperbarui: 0, sama: 0, dilewati: 0, catatan: 0 };
      for (const p of data.progress) {
        const ok = itemIds.has(p.itemId) && /^\d{4}-\d{2}-\d{2}$/.test(p.tanggal) && typeof p.volume === 'number' && p.volume > 0;
        if (!ok) { hasil.dilewati++; continue; }
        const id = p.itemId + '|' + p.tanggal, lama = byId.get(id);
        const row = { id, itemId: p.itemId, tanggal: p.tanggal, volume: p.volume, diinputOleh: String(p.diinputOleh || 'Staf').slice(0, 80), updatedAt: p.updatedAt || null };
        if (!lama) { byId.set(id, row); hasil.baru++; }
        else if (Math.abs(lama.volume - p.volume) < 1e-7) hasil.sama++;
        else if ((p.updatedAt || '') > (lama.updatedAt || '')) { byId.set(id, row); hasil.diperbarui++; }
        else hasil.dilewati++;
      }
      state.progress = [...byId.values()];
      // Catatan rapat harian: hanya mengisi tanggal yang masih kosong.
      const adaCatatan = new Set(state.dailyNotes.map((n) => n.tanggal));
      for (const n of data.dailyNotes) {
        if (!n || adaCatatan.has(n.tanggal) || !/^\d{4}-\d{2}-\d{2}$/.test(n.tanggal || '')) continue;
        state.dailyNotes.push(pick(n, ['tanggal', 'kendala', 'action', 'dueDate', 'status', 'catatan']));
        hasil.catatan++;
      }
      commit();
      return hasil;
    },
    reset() { state = fromSeed(); commit(); },
  };
})();
