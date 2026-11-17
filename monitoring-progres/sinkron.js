/* =====================================================================
 * Modul SERVER & SINKRONISASI (aktif bila config.js berisi API_URL)
 *  - Login kode via email, sesi per perangkat (token di localStorage)
 *  - Offline-first: setiap perubahan diterapkan lokal + masuk ANTREAN,
 *    dikirim otomatis saat online (event 'online', tiap 60 dtk, & tombol sinkron)
 *  - Tarik inkremental dari server (sejak waktu sinkron terakhir)
 * Dimuat SEBELUM app.js; memakai global app.js (S, UI, Calc, View, normalisasi, toast) saat dipanggil.
 * ===================================================================== */
'use strict';

const Server = (() => {
  const CFG = window.JIAT_CONFIG || {};
  const API = String(CFG.API_URL || '').trim();
  const KEY_SRV = 'jiat-server-v1';
  const BATCH = 300;

  const st = {
    sesi: null,          // { token, user: { email, nama, peran } }
    antrean: [],         // [{ kol, op: 'upsert'|'hapus', id, data }]
    sejak: null, generasi: null,
    status: 'idle',      // idle | sinkron | ok | offline | galat
    terakhir: null, sedang: false, pesan: '',
  };
  let tJadwal = null;

  const simpan = () => {
    try { localStorage.setItem(KEY_SRV, JSON.stringify({ sesi: st.sesi, antrean: st.antrean, sejak: st.sejak, generasi: st.generasi, terakhir: st.terakhir })); }
    catch (e) { toast('Penyimpanan perangkat penuh: ' + e.message, true); }
  };

  async function panggil(aksi, isi = {}, batas = 45000) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), batas);
    try {
      const r = await fetch(API, {
        method: 'POST', redirect: 'follow', signal: ctl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ aksi, token: st.sesi?.token, ...isi }),
      });
      const teks = await r.text();
      let j; try { j = JSON.parse(teks); } catch (e) { throw new Error('Balasan server tidak valid (cek URL API / izin deploy "Siapa saja").'); }
      if (!j.ok && j.kode === 'SESI') sesiHabis(j.pesan);
      return j;
    } catch (e) {
      if (e.name === 'AbortError') { const x = new Error('Server tidak menjawab (timeout).'); x.jaringan = true; throw x; }
      if (e instanceof TypeError) { const x = new Error('Tidak ada koneksi ke server.'); x.jaringan = true; throw x; }
      throw e;
    } finally { clearTimeout(t); }
  }

  function sesiHabis(pesan) {
    if (!st.sesi) return;
    st.sesi = null; st.sejak = null; simpan();
    S = kosong(); Store.simpan(true); // data proyek tidak ditinggal di perangkat (antrean tetap disimpan)
    toast(pesan || 'Sesi berakhir, silakan masuk lagi', true);
    View.render();
  }

  /** Terapkan satu operasi ke state lokal S. */
  function terapkan(o) {
    if (o.kol === 'project') { if (o.op === 'upsert') Object.assign(S.project, o.data); return; }
    const arr = S[o.kol]; if (!arr) return;
    const i = arr.findIndex((x) => x.id === o.id);
    if (o.op === 'hapus') { if (i >= 0) arr.splice(i, 1); return; }
    const rec = normalisasi({ [o.kol]: [o.data] })[o.kol][0] || o.data;
    if (i >= 0) arr[i] = Object.assign(arr[i], rec); else arr.push(rec);
  }

  function tampilStatus() {
    const el = document.getElementById('statusSinkron'); if (!el) return;
    if (!api.aktif || !st.sesi) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const n = st.antrean.length;
    const jam = st.terakhir ? new Date(st.terakhir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    const peta = {
      sinkron: ['bg-sky-500 animate-pulse', 'Menyinkron…'],
      offline: ['bg-amber-400', `Offline${n ? ` · ${n} antre` : ''}`],
      galat: ['bg-red-500', `Gagal sinkron${n ? ` · ${n} antre` : ''}`],
      ok: ['bg-emerald-400', n ? `${n} menunggu` : `Tersinkron ${jam}`],
      idle: ['bg-slate-400', n ? `${n} menunggu` : 'Belum sinkron'],
    };
    const [warna, teks] = peta[st.status] || peta.idle;
    el.innerHTML = `<span class="inline-block h-2 w-2 rounded-full ${warna}"></span><span>${teks}</span>`;
    el.title = (st.pesan ? st.pesan + '\n' : '') + 'Klik untuk sinkron sekarang';
  }

  async function dorong() {
    while (st.antrean.length) {
      const kirim = st.antrean.slice(0, BATCH);
      const res = await panggil('sinkron', { ops: kirim });
      if (!res.ok) throw new Error(res.pesan || 'Sinkron ditolak');
      // buang hanya entri yang tadi dikirim (edit baru selama pengiriman tetap antre)
      st.antrean = st.antrean.filter((q) => !kirim.includes(q));
      simpan();
      if (res.ditolak?.length) {
        toast(`${res.ditolak.length} perubahan ditolak server: ${res.ditolak[0].alasan}`, true);
        console.warn('Ditolak server:', res.ditolak);
      }
    }
  }

  async function tarik(paksaPenuh = false) {
    const res = await panggil('muat', { sejak: paksaPenuh ? null : st.sejak, generasi: st.generasi, asal: location.origin + location.pathname });
    if (!res.ok) throw new Error(res.pesan || 'Gagal memuat data');
    if (res.user) st.sesi.user = res.user;
    let ada = (res.menunggu || 0) !== (st.menunggu || 0); // badge menu Pengguna ikut diperbarui
    st.menunggu = res.menunggu || 0;
    if (res.penuh) {
      S = normalisasi(res.data); ada = true;
    } else {
      const d = res.data || {};
      if (d.project) { Object.assign(S.project, d.project); ada = true; }
      ['divisions', 'items', 'progress', 'dailyNotes', 'procurement', 'wells'].forEach((kol) => {
        (d[kol] || []).forEach((rec) => { terapkan({ kol, op: 'upsert', id: rec.id, data: rec }); ada = true; });
        (res.hapus?.[kol] || []).forEach((id) => { terapkan({ kol, op: 'hapus', id }); ada = true; });
      });
    }
    delete S.project.id;
    st.antrean.forEach(terapkan); // perubahan lokal yang belum terkirim tetap terlihat
    st.sejak = res.waktu; st.generasi = res.generasi;
    simpan();
    return ada;
  }

  async function sinkron({ penuh = false, diam = false } = {}) {
    if (!api.aktif || !st.sesi || st.sedang) return;
    if (!navigator.onLine) { st.status = 'offline'; tampilStatus(); return; }
    st.sedang = true; st.status = 'sinkron'; tampilStatus();
    try {
      await dorong();
      if (!st.sesi) return;
      const ada = await tarik(penuh);
      st.status = 'ok'; st.terakhir = Date.now(); st.pesan = ''; simpan();
      Store.simpan(true);
      if (ada) {
        const fokus = document.activeElement;
        const sedangKetik = fokus && fokus.closest && fokus.closest('#app, #modal') && /INPUT|TEXTAREA|SELECT/.test(fokus.tagName);
        if (!sedangKetik) View.render(); else UI._perluRender = true;
      }
      if (!diam && penuh) toast('Data tersinkron dari server');
    } catch (e) {
      st.status = e.jaringan ? 'offline' : 'galat'; st.pesan = e.message;
      if (!diam && !e.jaringan && st.sesi) toast('Sinkron gagal: ' + e.message, true);
    } finally { st.sedang = false; tampilStatus(); }
  }

  const api = {
    aktif: !!API,
    get sesi() { return st.sesi; },
    get user() { return st.sesi?.user || null; },
    get antrean() { return st.antrean; },
    get menunggu() { return st.menunggu || 0; },
    peran() { return api.aktif ? (st.sesi?.user?.peran || '') : 'MANAJEMEN'; },
    boleh(kol) {
      const p = api.peran();
      const izin = { project: ['MANAJEMEN'], divisions: ['MANAJEMEN'], items: ['MANAJEMEN'], progress: ['MANAJEMEN', 'PELAKSANA', 'PENGAWAS'], dailyNotes: ['MANAJEMEN', 'PELAKSANA', 'PENGAWAS'], procurement: ['MANAJEMEN', 'PELAKSANA'], wells: ['MANAJEMEN', 'PELAKSANA'] };
      return (izin[kol] || []).includes(p);
    },
    init() {
      if (!api.aktif) return;
      try { Object.assign(st, JSON.parse(localStorage.getItem(KEY_SRV) || '{}')); } catch (e) { /* abaikan */ }
      st.antrean = Array.isArray(st.antrean) ? st.antrean : [];
      window.addEventListener('online', () => sinkron({ diam: true }));
      window.addEventListener('offline', () => { st.status = 'offline'; tampilStatus(); });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sinkron({ diam: true }); });
      setInterval(() => sinkron({ diam: true }), 60000);
      document.addEventListener('focusout', () => { if (UI._perluRender) setTimeout(() => { if (!document.activeElement?.closest?.('#app input, #app textarea, #app select')) { UI._perluRender = false; View.render(); } }, 50); });
      tampilStatus();
      if (st.sesi) sinkron({ diam: true });
    },
    /** Catat perubahan lokal → antrean (dipanggil setelah S diubah). */
    catat(kol, op, rec) {
      if (!api.aktif) return;
      const id = kol === 'project' ? 'PROJECT' : rec.id;
      st.antrean = st.antrean.filter((q) => !(q.kol === kol && q.id === id));
      st.antrean.push({ kol, op, id, data: op === 'upsert' ? JSON.parse(JSON.stringify(rec)) : null });
      simpan(); tampilStatus();
      clearTimeout(tJadwal); tJadwal = setTimeout(() => sinkron({ diam: true }), 1500);
    },
    sinkron,
    tampilStatus,
    async mintaKode(email) { return panggil('mintaKode', { email }, 30000); },
    async daftar(isi) { return panggil('daftar', isi, 30000); },
    async infoVersi() { return panggil('infoVersi', {}, 20000); },
    async pasangPembaruan(paket, paksa) { return panggil('pasangPembaruan', { paket, paksa: !!paksa }, 180000); },
    async verifikasiDaftar(email, kode) { return panggil('verifikasiDaftar', { email, kode }, 30000); },
    async daftarPengguna() { return panggil('pengguna', {}, 30000); },
    async putuskan(email, keputusan, peran, alasan) {
      const r = await panggil('putuskan', { email, keputusan, peran, alasan }, 30000);
      if (r.ok) st.menunggu = (r.pengguna || []).filter((p) => p.aktif === 'MENUNGGU').length;
      return r;
    },
    async masuk(email, kode) {
      const res = await panggil('verifikasi', { email, kode, perangkat: navigator.userAgent.slice(0, 120) }, 30000);
      if (!res.ok) return res;
      const ganti = st.sesi?.user?.email && st.sesi.user.email !== res.user.email;
      st.sesi = { token: res.token, user: res.user };
      if (ganti) { st.antrean = []; st.sejak = null; }
      simpan();
      await sinkron({ penuh: true });
      return res;
    },
    async keluar() {
      if (st.antrean.length && !confirm(`Ada ${st.antrean.length} perubahan yang BELUM terkirim ke server. Tetap keluar? (perubahan itu akan hilang)`)) return false;
      try { if (navigator.onLine) await panggil('keluar', {}, 8000); } catch (e) { /* abaikan */ }
      st.sesi = null; st.antrean = []; st.sejak = null; st.generasi = null; simpan();
      S = kosong(); Store.simpan(true);
      return true;
    },
    async impor(data, mode) {
      const res = await panggil('impor', { data, mode }, 120000);
      if (!res.ok) throw new Error(res.pesan || 'Impor ditolak');
      await sinkron({ penuh: true, diam: true });
      return res;
    },
  };
  return api;
})();
