/**
 * sync.js — Sinkronisasi otomatis antar pengguna.
 *
 * Aktif bila halaman dibuka sebagai artifact di claude.ai (tersedia
 * `window.claude`): data overlay disimpan di basis data bersama milik artifact
 * dan setiap perubahan orang lain langsung muncul tanpa muat ulang.
 * Bila tidak tersedia (berkas dibuka langsung dari komputer), aplikasi tetap
 * berjalan dalam mode lokal seperti biasa.
 *
 * Hak akses mengikuti menu Share claude.ai:
 *   Editor/Owner  → Admin  (master BOQ, action plan, stok, pengaturan)
 *   Contributor   → Staf   (input harian, catatan rapat, status sumur)
 *   Viewer        → hanya melihat
 * Aturan ini ditegakkan server lewat deklarasi `db.rules` saat publish.
 */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const { store } = JIAT;

  const S = (JIAT.sync = {
    /** 'lokal' | 'menghubungkan' | 'tersinkron' | 'menyimpan' | 'tertunda' | 'gagal' */
    status: 'lokal',
    cloud: false, isAdmin: false, canWrite: null, me: null, pending: 0,
    names: {}, downloads: null, onChange: () => {},

    /** Nama tampilan untuk kolom "diinput oleh". */
    nama(v) {
      if (!S.cloud || v === 'Excel') return v || '–';
      if (S.names[v]) return S.names[v];
      return S.me && v === S.me.id ? 'Anda' : /^u_/.test(v || '') ? 'Staf' : v || 'Staf';
    },

    async start(onChange) {
      S.onChange = onChange;
      const use = (name) => { try { return Promise.resolve(window.claude.use(name)).catch(() => null); } catch (_) { return Promise.resolve(null); } };
      if (!window.claude || typeof window.claude.use !== 'function') return;
      setStatus('menghubungkan');
      const [db, user, downloads] = await Promise.all([use('db'), use('user'), use('downloads')]);
      S.downloads = downloads;
      if (!db) return setStatus('lokal');
      if (user) {
        S.me = await user.me();
        S.isAdmin = await user.canEdit();
        S.canWrite = await user.can('data.write');
      }
      S.cloud = true;
      store.attachRemote({ write: (changes) => enqueue(db, changes) }, S.me && S.me.id ? S.me.id : 'tamu');

      // Batas waktu memuat: bila 10 detik belum ada jawaban pasti, beri tahu pengguna.
      const live = new Set();
      const timer = setTimeout(() => { if (live.size < store.COLS.length && S.status === 'menghubungkan') setStatus('tertunda'); }, 10000);
      for (const col of store.COLS) {
        db.collection(col).onSnapshot((snap) => {
          const docs = {};
          snap.docs.forEach((d) => { docs[d.id] = JSON.parse(JSON.stringify(d.data())); });   // salin: snapshot dibekukan
          store.applyRemote(col, docs);
          if (!snap.metadata.fromCache) live.add(col);
          if (live.size === store.COLS.length) { clearTimeout(timer); if (!S.pending && S.status !== 'gagal') setStatus('tersinkron'); }
          if (col === 'progress' && user) resolveNames(user, docs);
        }, (err) => { clearTimeout(timer); console.error('Sinkronisasi berhenti', err); setStatus('gagal'); });
      }
    },

    /** Simpan berkas: lewat kapabilitas `downloads` di artifact, atau tautan unduh biasa. */
    async save(filename, data, mime) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
      if (S.downloads) {
        try { await S.downloads.save({ filename, data: blob }); return true; }
        catch (e) { if (e && e.code !== 'declined') JIAT.ui.toast('Berkas tidak dapat disimpan dari tampilan ini', 'bad'); return false; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return true;
    },
  });

  function setStatus(s) { if (S.status !== s) { S.status = s; S.onChange(); } }

  // Antrean tulis: satu per satu, agar tidak ada dua tulisan bersamaan ke dokumen yang sama.
  let chain = Promise.resolve();
  let ditolak = false;
  function enqueue(db, changes) {
    S.pending += changes.length;
    setStatus('menyimpan');
    for (const c of changes) {
      chain = chain.then(async () => {
        const ref = db.collection(c.col).doc(c.id);
        const run = () => (c.doc == null ? ref.delete() : ref.set(c.doc));
        try {
          try { await run(); }
          catch (e) { if (e && e.code === 'unavailable') { await new Promise((r) => setTimeout(r, 400 + Math.random() * 800)); await run(); } else throw e; }
        } catch (e) {
          console.error('Gagal menyimpan', c.col, c.id, e);
          if (!ditolak) {
            ditolak = true; setTimeout(() => { ditolak = false; }, 5000);      // satu pesan per rentetan
            const code = e && e.code;
            JIAT.ui.toast(code === 'invalid_argument' ? 'Perubahan ditolak: akses Anda tidak mengizinkan mengubah data ini'
              : code === 'quota_exceeded' ? 'Basis data penuh — hubungi Admin' : 'Perubahan belum tersimpan ke server; periksa koneksi lalu ulangi', 'bad');
          }
        } finally {
          S.pending--;
          if (!S.pending && S.status === 'menyimpan') setStatus('tersinkron');
        }
      });
    }
  }

  let lastIds = '';
  async function resolveNames(user, docs) {
    const ids = [...new Set(Object.values(docs).map((d) => d && d.oleh).filter((v) => typeof v === 'string' && v))].sort();
    if (!ids.length || ids.join() === lastIds) return;
    lastIds = ids.join();
    const ps = await user.profiles(ids);
    let changed = false;
    for (const id of ids) { const n = ps[id] && ps[id].name; if (n && S.names[id] !== n) { S.names[id] = n; changed = true; } }
    if (changed) S.onChange();
  }
})();
