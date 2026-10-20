/* Demo 2.6.0 — tiruan aplikasi dasar (Register Kontrak, menu akun) + tiruan server (saveKoreksi berversi, hadirDetak/hadirDaftar, Log).
 * Blok MP260 yang dimuat sesudah skrip ini adalah kode ASLI dari pembaruan-2.6.0.json. Semua data hanya di memori browser. */
(function () {
  'use strict';
  const K28 = '028/SPM/WK-NK.KSO/PDBJ/1726012/2026';
  const W = '1726012-99-02-02';
  // 17 item kontrak 028 hasil migrasi (kode & uraian dari spreadsheet; volume item 1–8 & harga per item = ilustrasi, total = Rp 162.044.900)
  const it = (kodeItem, itemPekerjaan, volume, satuan, harga) => ({ kodeItem, itemPekerjaan, volume, satuan, harga, wbs: W });
  const ITEM = [it('—', 'Item No 23 · spreadsheet baris 497', 1, 'LS', 1250000), it('1800000619', 'HT Alinco DJ-A10', 4, 'UN', 2150000), it('1800000034', 'Terpal 4x3', 20, 'LBR', 95000),
    it('2100000176', 'LCD Proyektor Epson Eb-X450', 1, 'UN', 8900000), it('2100000100', 'Meja Kantor 120x75x75cm', 6, 'UN', 1850000), it('1400000628', 'Kabel Twisted 2x16mm2 Martindo', 300, 'M', 18500),
    it('1400000491', 'Box Panel Listrik 50x60', 2, 'UN', 1250000), it('1400000045', 'Kabel NYM 2x1,5mm2 ETERNA', 10, 'ROL', 525000), it('1000003678', 'Semen PC Tiga Roda @40 Kg', 25, 'Zak', 62000),
    it('1100003068', 'Cat Tembok Q Luc Putih @18kg', 3, 'PL', 1150000), it('1000000892', 'Besi Hollow 30x30mm t=1,2mm L=6m', 15, 'BTG', 78000), it('1800003249', 'Mesin Bor Tangan 10mm GBM 350 Bosch', 1, 'UN', 865000),
    it('1800000052', 'Converter 1 Phase', 1, 'UN', 24500000), it('1800001651', 'Shaft Vibrator Mikasa Fx 50 Mikasa', 2, 'UN', 9750000), it('1800001652', 'Shaft Vibrator Mikasa Fx 60 Mikasa', 2, 'UN', 10850000),
    it('1800002258', 'Portable Vibrator Mtr Assy MGX-28 Mikasa', 1, 'UN', 21500000), it('1800002259', 'Portable Vibrator MGX 28x1680mm Mikasa', 1, 'UN', 0)];
  ITEM[16].harga = 162044900 - ITEM.slice(0, 16).reduce((s, x) => s + x.volume * x.harga, 0);
  const MASTER = [
    { key: K28, namaVendor: 'Putra Paloh, CV', idVendor: '2100010709', jenisKontrak: 'SPM', kelompok: 'BAHAN', noPO: 'PO IDC', noPR: 'PR', noRFQ: 'RFQ', statusKey: 'selesai', realisasi: 162044900, updateTerakhir: 'April 2026', items: ITEM },
    { key: '026/SPM/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'CV Contoh Bangun', idVendor: '2100010655', jenisKontrak: 'SPM', kelompok: 'BAHAN', noPO: '4500000026', noPR: 'PR', noRFQ: 'RFQ', statusKey: 'berjalan', realisasi: 12000000, updateTerakhir: 'Mei 2026',
      items: [it('1000000101', 'Pasir Beton', 40, 'M3', 310000), it('1000000102', 'Split 1/2', 30, 'M3', 365000)] },
    { key: '029/SPSA/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'CV Contoh Alat', idVendor: '2100010777', jenisKontrak: 'SPSA', kelompok: 'ALAT', noPO: '', noPR: 'PR', noRFQ: '', statusKey: 'lengkapi', realisasi: 0, updateTerakhir: '',
      items: [it('3000000001', 'Sewa Excavator PC200', 2, 'BLN', 48500000)] }];
  const MASTER_ASLI = JSON.stringify(MASTER);
  const SRV = { koreksi: {}, log: [], hadir: {}, mulai: Date.now() };
  window.__DEMO = { MASTER, MASTER_ASLI, SRV, K28 };

  /* ---------- tiruan global aplikasi dasar ---------- */
  window.escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const E = escHtml;
  window.PROYEK = { id: '1726012', nama: 'Rehabilitasi Irigasi (demo)' };
  window.REG = { url: 'https://script.google.com/macros/s/DEMO/exec', sesi: null, data: [{ id: 'L1', noKontrak: '030/SPM/WK-NK.KSO/PDBJ/1726012/2026', namaVendor: 'CV Register Demo' }] };
  window.KOREKSI = { data: {} }; window.koreksiDari = k => KOREKSI.data[k] || null;
  window.PROG = { data: [{ id: 'P1', noKontrak: K28, tagihanKe: 1, nilai: 162044900, periode: 'April 2026' }, { id: 'P2', noKontrak: MASTER[1].key, tagihanKe: 1, nilai: 12000000 }] };
  window.RINGKASAN = [];
  window.MENU_CEPAT = [['kontrak', 'Register Kontrak', '', '', ''], ['dash', 'Dasbor', '', '', ''], ['gdkartu', 'Kartu Gudang', '', '', '']];
  window.kontrakValid = k => /^\d+\/[A-Z]+\//.test(String(k || ''));
  window.pesanServerLama = e => String(e && e.message || e);
  window.muatRegister = async () => renderAllTables();
  window.notif = (m, t) => {
    const w = document.getElementById('dToast'); if (!w) return;
    const d = document.createElement('div'); d.className = 'd-toast ' + (t === 'err' ? 'err' : 'ok'); d.textContent = m; w.appendChild(d); setTimeout(() => d.remove(), 5200);
  };
  window.tanya = (pesan, o) => new Promise(res => {
    const w = document.getElementById('dTanya'); w.querySelector('.t-judul').textContent = (o && o.judul) || 'Konfirmasi'; w.querySelector('.t-isi').textContent = pesan;
    const ya = w.querySelector('.t-ya'); ya.textContent = (o && o.ok) || 'Ya'; w.hidden = false;
    const selesai = v => { w.hidden = true; ya.onclick = null; w.querySelector('.t-tidak').onclick = null; res(v); };
    ya.onclick = () => selesai(true); w.querySelector('.t-tidak').onclick = () => selesai(false);
  });
  window.showTab = function (t) {
    document.querySelectorAll('main .content-tab').forEach(d => { d.style.display = d.id === 'tab-' + t ? '' : 'none'; });
    document.querySelectorAll('#sidebar .nav-link').forEach(a => a.classList.toggle('active', a.dataset.tab === t));
  };
  window.bukaKoneksi = () => notif('Di aplikasi asli: Koneksi server.', 'ok');
  window.mp220Diagnostik = () => notif('Di aplikasi asli: Diagnostik sistem (pasang Modul server 1.8.8 di tab Modul).', 'ok');
  window.bukaKoreksi = k => notif('Di aplikasi asli: dialog koreksi data PO/PR/RFQ untuk ' + k + '.', 'ok');
  window.bukaWbs = k => notif('Di aplikasi asli: Isi WBS per item untuk ' + k + '.', 'ok');

  // ringkasan kontrak dasar: dibangun ulang dari Master + koreksi setiap kali (seperti aplikasi dasar)
  window.getRingkasanKontrak = function () {
    return MASTER.map(m => Object.assign(JSON.parse(JSON.stringify(m)), { keyAsli: m.key, nilai: m.items.reduce((s, x) => s + x.volume * x.harga, 0), koreksi: koreksiDari(m.key), entriProgres: PROG.data.filter(e => e.noKontrak === m.key) }));
  };
  const rp = v => Math.round(Number(v) || 0).toLocaleString('id-ID');
  const STATUS = { selesai: ['Selesai', 'ok'], berjalan: ['Berjalan', 'info'], lengkapi: ['Lengkapi', 'warn'], proses: ['Proses', 'info'] };
  window.renderAllTables = function () {
    RINGKASAN = getRingkasanKontrak();
    const bisa = !!(REG.sesi && REG.sesi.peran === 'PENGADAAN');
    const cari = String((document.getElementById('dCari') || {}).value || '').trim().toLowerCase();
    const L = RINGKASAN.filter(g => !cari || (g.key + ' ' + g.namaVendor + ' ' + g.idVendor).toLowerCase().includes(cari)).sort((a, b) => a.key.localeCompare(b.key));
    document.getElementById('regBody').innerHTML = L.map(g => {
      const items = g.items || [], wIsi = items.filter(i => i.wbs).length, cek = [['WBS', items.length && wIsi === items.length], ['PR', !!g.noPR], ['RFQ', !!g.noRFQ], ['PO', !!g.noPO], ['Vendor', !!String(g.namaVendor || '').trim()]];
      const s = STATUS[g.statusKey] || [g.statusKey || '-', 'info'], pr = g.nilai ? Math.min(1, (Number(g.realisasi) || 0) / g.nilai) : 0;
      return `<tr data-key="${E(g.key)}" class="baris-kontrak" onclick="bukaKoreksi(this.dataset.key)">
        <td><code class="fw-semibold">${E(g.key)}</code> <span class="badge mp214-src-master">Master</span><div class="small text-muted">${E(g.jenisKontrak || '-')} · ${E(g.kelompok || '-')} · ${items.length} item${g.noPO ? ' · ' + E(g.noPO) : ''}</div></td>
        <td>${E(g.namaVendor || '-')}<div class="small text-muted">${E(g.idVendor || '')}</div></td>
        <td class="text-end fw-semibold text-nowrap">${rp(g.nilai)}</td>
        <td><div class="d-flex flex-wrap gap-1">${cek.map(c => `<span class="pill-cek ${c[1] ? 'ok' : ''}"><i class="fas ${c[1] ? 'fa-check' : 'fa-minus'}"></i>${c[0]}</span>`).join('')}<span class="small fw-semibold ms-1">${cek.filter(c => c[1]).length}/5</span></div></td>
        <td><span class="d-st ${s[1]}">${E(s[0])}</span><div class="small text-muted mt-1">${g.nilai ? 'Tagihan ' + Math.round(pr * 100) + '%' : 'Belum ada nilai'}${g.updateTerakhir ? ' · ' + E(g.updateTerakhir) : ''}</div></td>
        <td class="text-center text-nowrap"><button type="button" class="btn btn-sm ${bisa ? 'btn-outline-primary' : 'btn-outline-secondary'}" onclick="event.stopPropagation(); bukaKoreksi(this.closest('tr').dataset.key)"><i class="fas ${bisa ? 'fa-pen' : 'fa-eye'}"></i></button><button type="button" class="btn btn-sm btn-light border ms-1" title="WBS per item" onclick="event.stopPropagation(); bukaWbs(this.closest('tr').dataset.key)"><i class="fas fa-sitemap"></i></button></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="text-center text-muted py-4">Tidak ada kontrak pada pencarian ini.</td></tr>';
    const n = document.getElementById('dJml'); if (n) n.textContent = L.length + ' dari ' + RINGKASAN.length + ' kontrak';
    renderServer();
  };

  /* ---------- tiruan server (kernel 2.5.1 + modul 1.8.8) ---------- */
  const catat = (aksi, no, detail) => { SRV.log.push({ waktu: new Date().toISOString(), oleh: REG.sesi.nama, peran: REG.sesi.peran, aksi, noKontrak: no, detail }); };
  const jeda = ms => new Promise(r => setTimeout(r, ms));
  window.regAksi = async function (aksi, extra) {
    await jeda(aksi === 'hadirDetak' ? 60 : 280);
    const x = extra || {}, u = REG.sesi;
    if (!u) throw new Error('Belum masuk.');
    if (aksi === 'saveKoreksi') {
      if (u.peran !== 'PENGADAAN') throw new Error('Hanya peran PENGADAAN yang boleh memperbaiki data kontrak.');
      const d = x.data || {}, lama = SRV.koreksi[d.key] || null;
      if (lama && Number(d.versi) !== Number(lama.versi)) throw new Error('KONFLIK: data kontrak ini sudah diperbaiki oleh ' + lama.diubahOleh + '. Muat ulang dulu.');
      const r = Object.assign({}, d.data, { key: d.key, diubahOleh: u.nama, diubahPada: new Date().toISOString(), versi: (lama ? lama.versi : 0) + 1 });
      SRV.koreksi[d.key] = r;
      catat('KOREKSI KONTRAK', (d.data && d.data.sumber) || d.key, d.data && d.data.aktif === false ? 'aktif: false (dibatalkan)' : 'pindah ' + ((d.data.pindah || [])[0] || {}).items.length + ' item → ' + ((d.data.pindah || [])[0] || {}).ke + '; alasan: ' + (d.data.alasan || ''));
      return { ok: true, data: r };
    }
    if (aksi === 'hadirDetak') {
      const d = x.data || {}, k = u.nama.toLowerCase(), lama = SRV.hadir[k];
      SRV.hadir[k] = Object.assign({ nama: u.nama, mulai: (lama && lama.mulai) || new Date().toISOString() }, { menu: d.menu, tab: d.tab, aktivitas: d.aktivitas, aksi: d.aksi || (lama && lama.aksi) || '', aksiPada: d.aksi ? new Date().toISOString() : (lama && lama.aksiPada) || '', perangkat: d.perangkat, status: d.status, waktu: new Date().toISOString() });
      renderServer(); return { ok: true };
    }
    if (aksi === 'hadirDaftar') {
      if (!u.admin) throw new Error('Daftar pengguna online khusus Admin.');
      const kini = Date.now(), dtk = s => new Date(kini - s * 1000).toISOString();
      const lain = [
        { nama: 'Rina Pengadaan', peran: 'PENGADAAN', jabatan: 'Staf Pengadaan', umur: 35, hadir: { menu: 'Keuangan & Bayar', aktivitas: 'Checklist Tagihan · 026/SPM/WK-NK.KSO/PDBJ/1726012/2026 · tagihan ke-2', aksi: 'Simpan checklist tagihan · TB2', aksiPada: dtk(240), perangkat: 'Komputer · browser', mulai: dtk(7200), status: 'aktif' },
          log: [{ waktu: dtk(240), aksi: 'CHECKLIST SIMPAN', noKontrak: '026/SPM/WK-NK.KSO/PDBJ/1726012/2026' }, { waktu: dtk(1900), aksi: 'UNGGAH BERKAS', noKontrak: '026/SPM/WK-NK.KSO/PDBJ/1726012/2026' }] },
        { nama: 'Budi Gudang', peran: 'PENGADAAN', jabatan: 'Petugas Gudang', umur: 70, hadir: { menu: 'Penerimaan Material', aktivitas: 'Terima kiriman Bon · BON/045/2026', aksi: 'Penerimaan material (GR) · 1000003678', aksiPada: dtk(600), perangkat: 'HP/Tablet · browser', mulai: dtk(5400), status: 'aktif' },
          log: [{ waktu: dtk(600), aksi: 'GUDANG MASUK', noKontrak: '-' }] },
        { nama: 'Sari Keuangan', peran: 'PENGADAAN', jabatan: 'Staf Keuangan', umur: 420, hadir: { menu: 'Dasbor', aktivitas: '', aksi: '', perangkat: 'Komputer · aplikasi Windows', mulai: dtk(9000), status: 'diam' }, log: [] },
        { nama: 'Kepala Proyek', peran: 'LIHAT', jabatan: 'Kepala Proyek', umur: null, hadir: null, log: [{ waktu: dtk(86400), aksi: 'LOGIN', noKontrak: '-' }] }];
      const saya = SRV.hadir[u.nama.toLowerCase()], umurSaya = saya ? Math.round((kini - Date.parse(saya.waktu)) / 1000) : null;
      const logSaya = SRV.log.filter(l => l.oleh === u.nama).slice(-3).reverse();
      const data = [{ nama: u.nama, peran: u.admin ? 'ADMIN' : u.peran, jabatan: u.jabatan, online: !!saya && umurSaya <= 180 && saya.status !== 'diam', diam: !!saya && (umurSaya > 180 || saya.status === 'diam'), umurDetik: umurSaya, hadir: saya || null, logTerakhir: logSaya }]
        .concat(lain.map(o => ({ nama: o.nama, peran: o.peran, jabatan: o.jabatan, online: !!o.hadir && o.umur <= 180 && o.hadir.status !== 'diam', diam: !!o.hadir && (o.umur > 180 || o.hadir.status === 'diam'), umurDetik: o.umur, hadir: o.hadir ? Object.assign({ waktu: dtk(o.umur) }, o.hadir) : null, logTerakhir: o.log })));
      data.sort((a, b) => (b.online - a.online) || (b.diam - a.diam) || ((a.umurDetik === null) - (b.umurDetik === null)) || ((a.umurDetik || 0) - (b.umurDetik || 0)));
      return { ok: true, versiServer: '2.5.1', waktu: new Date().toISOString(), data };
    }
    if (aksi === 'save') { catat('UBAH', (x.data || {}).noKontrak || '-', 'simulasi'); return { ok: true, data: x.data }; }
    throw new Error('Aksi tidak dikenal: ' + aksi);
  };
  // KOREKSI.data di aplikasi = salinan dari server saat muat; demo: selaraskan setelah tiap simpan
  function renderServer() {
    const k = document.getElementById('dKoreksi'), l = document.getElementById('dLog'); if (!k || !l) return;
    const rec = Object.values(SRV.koreksi);
    k.innerHTML = rec.length ? rec.map(r => `<div class="d-rec"><code>${E(r.key)}</code><div>versi <b>${r.versi}</b> · ${r.aktif === false ? '<span class="d-st warn">dibatalkan</span>' : '<span class="d-st ok">aktif</span>'} · ${E(r.diubahOleh)}</div>${r.aktif !== false ? `<div class="text-muted">${(r.pindah || []).map(p => E(p.items.length + ' item → ' + p.ke + ' (' + ((p.header || {}).namaVendor || '-') + ')')).join('<br>')}<br>sumber → vendor: ${E((r.header || {}).namaVendor || '-')}</div>` : ''}</div>`).join('') : '<div class="text-muted">Belum ada catatan perbaikan.</div>';
    l.innerHTML = SRV.log.length ? SRV.log.slice(-8).reverse().map(x => `<div class="d-rec"><span class="text-muted">${new Date(x.waktu).toLocaleTimeString('id-ID')}</span> · <b>${E(x.aksi)}</b> · ${E(x.oleh)}<div class="text-muted">${E(x.detail).slice(0, 180)}</div></div>`).join('') : '<div class="text-muted">Log masih kosong.</div>';
    const m = document.getElementById('dMaster'); if (m) m.innerHTML = JSON.stringify(MASTER) === MASTER_ASLI ? '<span class="d-st ok"><i class="fas fa-lock me-1"></i>Data Master (Excel) tidak berubah</span>' : '<span class="d-st warn">Master berubah!</span>';
  }

  /* ---------- peran & kendali demo ---------- */
  const PERAN = { admin: { nama: 'Joko Supriyono', peran: 'PENGADAAN', admin: true, jabatan: 'Admin Pengadaan' }, staf: { nama: 'Rina Pengadaan', peran: 'PENGADAAN', admin: false, jabatan: 'Staf Pengadaan' }, lihat: { nama: 'Kepala Proyek', peran: 'LIHAT', admin: false, jabatan: 'Kepala Proyek' } };
  window.demoPeran = function (p) {
    REG.sesi = Object.assign({ proyek: PROYEK.id }, PERAN[p]);
    document.getElementById('dUser').textContent = REG.sesi.nama; document.getElementById('dUserPeran').textContent = REG.sesi.admin ? 'Admin' : REG.sesi.peran === 'LIHAT' ? 'Lihat saja' : 'Pengadaan';
    const mo = document.getElementById('mp260MenuOnline'); if (mo) mo.closest('li').hidden = !REG.sesi.admin;
    document.querySelectorAll('#dPeran input').forEach(i => { i.checked = i.value === p; });
    renderAllTables(); notif('Masuk sebagai ' + REG.sesi.nama + ' (' + document.getElementById('dUserPeran').textContent + ').', 'ok');
  };
  window.demoLangkah = function (n) {
    if (n === 1) { if (!REG.sesi.admin && REG.sesi.peran !== 'PENGADAAN') demoPeran('admin'); showTab('kontrak'); mp260Buka(K28); }
    if (n === 2) { if (!REG.sesi.admin) demoPeran('admin'); mp260Online(); }
    if (n === 3) { showTab('kontrak'); const g = RINGKASAN.find(x => x.key === K28); if (g && g.mp260) mp260Buka(K28); else notif('Simpan perbaikan 028 dulu (langkah 1).', 'err'); }
  };
  window.demoReset = function () {
    SRV.koreksi = {}; SRV.log = []; KOREKSI.data = {}; ['mp260Reg', 'mp260Online'].forEach(id => { try { mp260Tutup(id); } catch (e) { } });
    renderAllTables(); notif('Demo diatur ulang ke keadaan migrasi (028 = 17 item).', 'ok');
  };
  // aplikasi asli menyalin catatan koreksi dari server; demo: setiap simpan langsung tersalin
  const ra = window.regAksi;
  window.regAksi = async function (a, x) { const r = await ra.apply(this, arguments); if (a === 'saveKoreksi' && r && r.data) KOREKSI.data[r.data.key] = r.data; renderServer(); return r; };
  window.demoMenu = function (ev) {
    ev.stopPropagation(); const m = ev.currentTarget.parentElement.querySelector('.dropdown-menu'), buka = !m.classList.contains('show');
    m.classList.toggle('show', buka); ev.currentTarget.setAttribute('aria-expanded', buka ? 'true' : 'false');
  };
  document.addEventListener('click', () => document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show')));
  window.demoMulai = function () {
    demoPeran('admin'); showTab('kontrak');
    document.getElementById('dCari').addEventListener('input', () => renderAllTables());
    const t = document.documentElement, b = document.getElementById('dTema');
    const set = v => { t.setAttribute('data-theme', v); t.setAttribute('data-bs-theme', v); b.innerHTML = v === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>'; try { localStorage.setItem('demo260Tema', v); } catch (e) { } };
    let awal = null; try { awal = localStorage.getItem('demo260Tema'); } catch (e) { }
    set(awal || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    b.onclick = () => set(t.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };
})();
