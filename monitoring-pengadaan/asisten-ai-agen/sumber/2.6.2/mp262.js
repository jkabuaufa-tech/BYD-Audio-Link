
/* MP262 — PEMBARUAN 2.6.2: koneksi server lebih hemat & galat terlacak (aditif, tanpa perubahan data)
 * 1. Riwayat galat server (20 terakhir, di perangkat ini): waktu, aksi, pesan & cuplikan halaman Google — menu akun › Riwayat galat server › Salin.
 * 2. Sinkron Register otomatis (dasar: tiap 2 menit) dibatasi tiap ±5 menit bila tidak ada simpanan baru — muat ulang manual & setelah simpan tetap segera.
 * 3. Kuota harian Google habis (server Code.gs 2.5.2 mengirim kode KUOTA) → satu pemberitahuan jelas, pembacaan latar dijeda 5 menit. */
(function () {
  'use strict';
  if (window.__MP262__) return;
  window.__MP262__ = true;
  const KUNCI = 'MP262_GALAT', E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const versiApp = () => { try { return (window.PEMB && PEMB.aktif && PEMB.aktif.versi) || ''; } catch (e) { return ''; } };
  const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || '[]'); } catch (e) { return []; } };
  const tulis = L => { try { localStorage.setItem(KUNCI, JSON.stringify(L.slice(-20))); } catch (e) { } };
  const penting = s => /halaman HTML|Kuota harian layanan Google|Gangguan sementara layanan Google|Server sedang sibuk|Server masih memproses|Koneksi ke server terputus|Failed to fetch/i.test(s);
  function catat(aksi, pesan, kode, mulai) {
    const L = baca(); L.push({ waktu: new Date().toISOString(), aksi: String(aksi || '-'), kode: kode || '', pesan: String(pesan || '').slice(0, 600), durasi: Date.now() - mulai, app: versiApp(), server: (typeof REG !== 'undefined' && REG.versiServer) || '' });
    tulis(L);
  }
  const ST = { kuotaPada: 0, tulisPada: 0, muatPada: 0 };
  window.MP262 = ST;
  const rp = window.regPost;
  if (typeof rp === 'function') window.regPost = async function (body) {
    const a = body && body.action, t0 = Date.now();
    if (a && !/^(login|baca|bacaSemua|adminData|bacaMasterTambahan|bacaAlokasiBon|checklistBaca|checklistRingkas|ambilBerkas|arsipBaca|manifestBaca|diagServer|modulInfo|gudangBaca|gudangBacaHal|identitasBaca|notifInfo|aiInfo|vtInfo|vtRingkas|vtBaca|vtBundelBaca|vtRencana|timInfo|timRingkas|hadirDetak|hadirDaftar|bacaPembaruanAdmin|ambilKandidatPembaruan)$/.test(a)) ST.tulisPada = Date.now();
    let r;
    try { r = await rp.apply(this, arguments); }
    catch (e) { const m = String(e && e.message || e); if (penting(m)) catat(a, m, '', t0); throw e; }
    try {
      if (r && r.ok === false && (r.kode || penting(r.error))) {
        catat(a, r.error, r.kode, t0);
        if (r.kode === 'KUOTA' && Date.now() - ST.kuotaPada > 10 * 60000) { ST.kuotaPada = Date.now(); try { notif('Kuota harian layanan Google untuk server sedang habis — pembacaan otomatis dijeda; data aman. Pulih otomatis oleh Google. Detail: menu akun › Riwayat galat server.', 'err'); } catch (e) { } }
      }
    } catch (e) { }
    return r;
  };
  // sinkron Register otomatis lebih hemat: panggilan tanpa argumen (pewaktu 2 menit aplikasi dasar) dilewati bila < 5 menit & tidak ada simpanan baru
  const mr = window.muatRegister;
  const kunciSesi = () => (REG.url || '') + '|' + ((REG.sesi && REG.sesi.proyek) || '') + '|' + ((REG.sesi && REG.sesi.nama) || '');
  if (typeof mr === 'function') window.muatRegister = function (paksa) {
    const k = kunciSesi();
    if (!arguments.length && REG.sesi && REG.dataSiap && ST.muatKunci === k && Date.now() - ST.muatPada < 5 * 60000 && ST.tulisPada < ST.muatPada) return Promise.resolve();
    if (REG.sesi) { ST.muatKunci = k; ST.muatPada = Date.now(); }
    return mr.apply(this, arguments);
  };
  // panel riwayat galat
  function panel() {
    let m = document.getElementById('mp262Galat');
    if (!m) { m = document.createElement('div'); m.id = 'mp262Galat'; m.className = 'mp260-latar'; m.innerHTML = '<div class="mp260-kotak" role="dialog" aria-modal="true"><div class="mp260-kepala"><div class="min-w-0"><div class="mp260-judul"><i class="fas fa-triangle-exclamation me-2"></i>Riwayat galat server</div><div class="mp260-sub"></div></div><button type="button" class="mp260-x" aria-label="Tutup">&times;</button></div><div class="mp260-isi"></div><div class="mp260-kaki"></div></div>';
      document.body.appendChild(m); m.querySelector('.mp260-x').onclick = () => m.classList.remove('tampil'); m.addEventListener('mousedown', ev => { if (ev.target === m) m.classList.remove('tampil'); }); }
    const L = baca().slice().reverse();
    m.querySelector('.mp260-sub').textContent = L.length + ' galat terakhir di perangkat ini · aplikasi ' + (versiApp() || '-') + ' · server ' + ((typeof REG !== 'undefined' && REG.versiServer) || '-');
    m.querySelector('.mp260-isi').innerHTML = L.length ? `<div class="mp260-tabel"><table class="table table-sm align-middle mb-0"><thead><tr><th>Waktu</th><th>Aksi</th><th>Kode</th><th>Pesan</th><th class="text-end">Durasi</th></tr></thead><tbody>${L.map(x => `<tr><td class="small text-nowrap">${E(new Date(x.waktu).toLocaleString('id-ID'))}</td><td class="small font-monospace">${E(x.aksi)}</td><td class="small">${E(x.kode || '-')}</td><td class="small">${E(x.pesan)}</td><td class="small text-end text-nowrap">${(x.durasi / 1000).toFixed(1)} dtk</td></tr>`).join('')}</tbody></table></div>
      <div class="small text-muted mt-2">Kirim isi ini (tombol Salin) bila meminta bantuan. Kode KUOTA = kuota harian Google habis; GOOGLE = gangguan sementara layanan Google; durasi ± 360 dtk = batas waktu eksekusi.</div>` : '<div class="text-muted text-center py-4">Belum ada galat server tercatat di perangkat ini.</div>';
    m.querySelector('.mp260-kaki').innerHTML = '<div><button type="button" class="btn btn-sm btn-outline-secondary" id="mp262Hapus">Kosongkan riwayat</button></div><div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-primary" id="mp262Salin"><i class="fas fa-copy me-1"></i>Salin</button><button type="button" class="btn btn-sm btn-outline-secondary" id="mp262Tutup">Tutup</button></div>';
    m.querySelector('#mp262Tutup').onclick = () => m.classList.remove('tampil');
    m.querySelector('#mp262Hapus').onclick = () => { tulis([]); panel(); };
    m.querySelector('#mp262Salin').onclick = async () => { const t = L.map(x => [x.waktu, x.aksi, x.kode || '-', (x.durasi / 1000).toFixed(1) + 's', 'app ' + x.app, 'server ' + x.server, x.pesan].join(' | ')).join('\n') || '(kosong)'; try { await navigator.clipboard.writeText(t); notif('Riwayat galat disalin.', 'ok'); } catch (e) { prompt('Salin teks berikut:', t); } };
    m.classList.add('tampil');
  }
  window.mp262Galat = panel;
  function pasangMenu() {
    if (document.getElementById('mp262MenuGalat')) return true;
    const a = document.getElementById('mp220MenuDiag') || document.querySelector('.menu-akun .dropdown-menu a[onclick*="bukaKoneksi"]'); if (!a) return false;
    const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp262MenuGalat" onclick="mp262Galat(); return false;"><i class="fas fa-triangle-exclamation me-2"></i>Riwayat galat server</a>';
    a.closest('li').after(li); return true;
  }
  const tm = setInterval(() => { try { if (pasangMenu()) clearInterval(tm); } catch (e) { } }, 3000); setTimeout(() => { try { pasangMenu(); } catch (e) { } }, 900);
})();
