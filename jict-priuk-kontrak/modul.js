/**
 * Modul menu BAHAN · ALAT · SUBKON
 * - Kontrak induk (SPM/SPPM, SPSA, SPK/SPKU/SPPP) + berita acara per termin (BAPM, BAPA, BAPP, BAP, Opname) + BAPR
 * - Cetak identik master Excel (template dari alat/konversi-cetak.py → cetak-template.js)
 * - Surat perjanjian Word diisi dari template master (kontrak-template.js)
 * - Peran lokal + PIN: admin, user proyek, viewer
 */

// ===== Definisi menu & dokumen =====
const MENU = [
  {
    id: 'bahan', label: 'Bahan', ikon: '🧱',
    sub: [
      { id: 'spm', label: 'SPM & SPPM', tipe: 'kontrak', jenis: ['SPM', 'SPPM'], ket: 'Surat Pemesanan Material & Surat Perjanjian Pemesanan Material' },
      { id: 'bapm', label: 'BAPM', tipe: 'termin', kode: 'BAPM', cetak: 'bahan_bapm', ket: 'Berita Acara Penerimaan Material (per termin pengiriman)' },
      { id: 'bap', label: 'BAP', tipe: 'termin', kode: 'BAP', cetak: 'bahan_bap', ket: 'Berita Acara Pembayaran (termin yang sama dengan BAPM)' },
    ],
  },
  {
    id: 'alat', label: 'Alat', ikon: '🚜',
    sub: [
      { id: 'spsa', label: 'SPSA', tipe: 'kontrak', jenis: ['SPSA'], ket: 'Surat Perjanjian Sewa Alat' },
      { id: 'baso', label: 'BASO', tipe: 'tunda', ket: 'Berita Acara Serah Terima Operasional' },
      { id: 'basta', label: 'BASTA', tipe: 'tunda', ket: 'Berita Acara Serah Terima Alat' },
      { id: 'bapa', label: 'BAPA', tipe: 'termin', kode: 'BAPA', cetak: 'alat_bapa', ket: 'Berita Acara Penerimaan Alat (per periode sewa)' },
      { id: 'bap', label: 'BAP', tipe: 'termin', kode: 'BAP', cetak: 'alat_bap', ket: 'Berita Acara Pembayaran (periode yang sama dengan BAPA)' },
      { id: 'opname', label: 'Rincian Opname', tipe: 'termin', kode: null, cetak: 'alat_opname', ket: 'Rincian progres per periode', tambahan: true },
      { id: 'lampiran', label: 'Lampiran', tipe: 'lampiran', cetak: 'alat_lampiran', ket: 'Rekapitulasi kuantitas dan harga kontrak', tambahan: true },
      { id: 'bapr', label: 'BAPR', tipe: 'bapr', kode: 'BAP-R', cetak: 'alat_bapr', ket: 'Berita Acara Pembayaran Retensi', tambahan: true },
    ],
  },
  {
    id: 'subkon', label: 'Subkon', ikon: '👷',
    sub: [
      { id: 'spk', label: 'SPK, SPKU, SPPP', tipe: 'kontrak', jenis: ['SPK', 'SPKU', 'SPPP'], ket: 'Surat Perintah Kerja / Surat Perjanjian Mandor Borong / Surat Perjanjian Pemborongan Pekerjaan' },
      { id: 'opname', label: 'Rincian Opname', tipe: 'termin', kode: null, cetak: 'subkon_opname', ket: 'Rincian progres pekerjaan per termin (bobot)' },
      { id: 'lampiran', label: 'Lampiran', tipe: 'lampiran', cetak: 'subkon_lampiran', ket: 'Lampiran kontrak: rekapitulasi kuantitas dan harga' },
      { id: 'bapp', label: 'BAPP', tipe: 'termin', kode: 'BAPP', cetak: 'subkon_bapp', ket: 'Berita Acara Prestasi Pekerjaan' },
      { id: 'bap', label: 'BAP', tipe: 'termin', kode: 'BAP', cetak: 'subkon_bap', ket: 'Berita Acara Pembayaran (termin yang sama dengan BAPP)' },
      { id: 'bapr', label: 'BAPR', tipe: 'bapr', kode: 'BAPR', cetak: 'subkon_bapr', ket: 'Berita Acara Pembayaran Retensi', tambahan: true },
    ],
  },
];

const JENIS_KONTRAK = {
  SPM: { menu: 'bahan', nama: 'Surat Pemesanan Material', cetak: 'bahan_spm' },
  SPPM: { menu: 'bahan', nama: 'Surat Perjanjian Pemesanan Material', surat: 'SPPM', cetak: 'bahan_spm' },
  SPSA: { menu: 'alat', nama: 'Surat Perjanjian Sewa Alat', surat: 'SPSA' },
  SPK: { menu: 'subkon', nama: 'Surat Perintah Kerja', surat: 'SPK' },
  SPKU: { menu: 'subkon', nama: 'Surat Perjanjian Mandor Borong (SPMB)', surat: 'SPKU' },
  SPPP: { menu: 'subkon', nama: 'Surat Perjanjian Pemborongan Pekerjaan', surat: 'SPPP' },
};

const TIPE_BARIS = [
  ['item', 'Item'], ['judul', 'Judul (A, B, …)'], ['subjudul', 'Sub-judul'], ['kelompok', 'Kelompok pekerjaan'], ['kosong', 'Baris kosong'],
];
const STATUS_DOK = ['Draft', 'Diproses', 'Final'];

const PROYEK_DEFAULT = {
  proyek: 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok',
  namaKso: 'WASKITA - NINDYA, KSO',
  divisi: 'DIVISI OPERASI II INFRASTRUKTUR I',
  alamatKso: 'Gedung Waskita IDSurvey Tower Jl. M.T. Haryono Kavling No.10, Jatinegara, Jakarta Timur',
  npwpKso: '',
  kodeProyek: '1726012',
  kodeKsoBahan: 'WK-NK.KSO/PDBJ',
  kodeKsoLain: 'WSKT-NK KSO',
  kota: 'Jakarta',
  pp1Nama: '', pp1Jabatan: 'Kepala Proyek',
  penerimaNama: '', penerimaJabatan: 'Kasi Pengadaan, Logistik, & Peralatan',
  kontak: '',
  kuasaNama: '', kuasaJabatan: 'Kuasa KSO', batasKuasa: 3000000000,
  pemeriksaNama: '', pemeriksaJabatan: 'Kasi Teknik & Administrasi Kontrak',
  ttdPerusahaan: 'PT. WASKITA KARYA (Persero) Tbk.', ttdDivisi: 'Divisi Infrastruktur',
  mengetahuiNama: '', mengetahuiJabatan: 'Project Manager',
  sepRibu: '.',
  logo: '',
  pin: { admin: '', user: '', viewer: '' },
};

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// ===== Format =====
const S = () => settings;

function angka(n, dec = 0) {
  const v = Number(n) || 0;
  const neg = v < 0;
  const fixed = Math.abs(v).toFixed(dec);
  const [int, frac] = fixed.split('.');
  const ribu = S().sepRibu === ',' ? ',' : '.';
  const desimal = ribu === '.' ? ',' : '.';
  const grup = int.replace(/\B(?=(\d{3})+(?!\d))/g, ribu);
  return (neg ? '-' : '') + grup + (frac ? desimal + frac : '');
}

function persen(v, dec = 2) {
  return angka((Number(v) || 0) * 100, dec) + '%';
}

function tglObj(s) {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? null : d;
}

function tglID(s) {
  const d = tglObj(s);
  return d ? `${pad(d.getDate())} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : '';
}

function judulKata(s) {
  return String(s).replace(/\b\w/g, c => c.toUpperCase());
}

function bilang(n, milyar) {
  let t = judulKata(terbilang(Math.round(Math.abs(Number(n) || 0))));
  if (milyar) t = t.replace(/Miliar/g, 'Milyar');
  return (Number(n) < 0 ? 'Minus ' : '') + t + ' Rupiah';
}

function hariIni(s) {
  const d = tglObj(s);
  if (!d) return { hari: '', tgl: '', bulan: '', tahun: '' };
  return {
    hari: HARI[d.getDay()],
    tgl: judulKata(terbilang(d.getDate())),
    bulan: BULAN[d.getMonth()],
    tahun: judulKata(terbilang(d.getFullYear())),
    dd: pad(d.getDate()), mm: pad(d.getMonth() + 1), yyyy: d.getFullYear(),
  };
}

// Kalimat pembuka persis seperti master masing-masing
function kalimatBahan(s) {
  const h = hariIni(s);
  return `Pada hari ini ${h.hari}, tanggal ${h.tgl} bulan ${h.bulan} tahun ${h.tahun} (${h.dd}/${h.mm}/${h.yyyy})`;
}
function kalimatSubkon(s) {
  const h = hariIni(s);
  return `Pada hari ini ${h.hari} tanggal ${h.tgl} bulan ${h.bulan} tahun ${h.tahun} (${tglID(s)}), kami yang bertandatangan di bawah ini:`;
}
function kalimatAlat(s) {
  const h = hariIni(s);
  return `Pada hari ini ${h.hari} tanggal ${h.tgl} bulan ${h.bulan} tahun ${h.tahun} (${h.dd} - ${h.mm} - ${h.yyyy}), kami yang bertandatangan di bawah ini:`;
}

const UP = (s) => String(s || '').toUpperCase();

// ===== Data =====
let daftarKontrak = [];
let daftarTermin = [];

const dbAll = (store) => dbRequest(store, 'readonly', s => s.getAll());
const dbSimpan = (store, obj) => dbRequest(store, 'readwrite', s => s.put(obj));
const dbHapus = (store, id) => dbRequest(store, 'readwrite', s => s.delete(id));

async function muatModul() {
  [daftarKontrak, daftarTermin] = await Promise.all([dbAll('kontrak'), dbAll('termin')]);
}

const kontrakById = (id) => daftarKontrak.find(k => k.id === id);
const terminKontrak = (kid, jenis = 'termin') => daftarTermin
  .filter(t => t.kontrakId === kid && (t.jenis || 'termin') === jenis)
  .sort((a, b) => a.ke - b.ke);

// ===== Peran & PIN =====
let peran = 'admin';

function aturPeran(p) {
  peran = p;
  document.body.dataset.role = p;
  try { sessionStorage.setItem('jict_peran', p); } catch { /* opsional */ }
  const label = { admin: '👑 Admin', user: '👷 User Proyek', viewer: '👁️ Viewer' }[p];
  const badge = $('#roleBadge');
  if (badge) badge.textContent = label;
}

const bisa = (aksi) => aksi === 'lihat' || (aksi === 'ubah' ? peran !== 'viewer' : peran === 'admin');

function cekBisa(aksi) {
  if (bisa(aksi)) return true;
  showToast(aksi === 'hapus' || aksi === 'admin' ? 'Hanya Admin yang dapat melakukan ini.' : 'Peran Viewer hanya dapat melihat & mencetak.', 'error');
  return false;
}

function adaPin() {
  const p = S().pin || {};
  return !!(p.admin || p.user || p.viewer);
}

function openLogin() {
  if (!adaPin()) { showToast('PIN belum diatur — semua akses terbuka. Atur di Pengaturan › Peran & PIN.'); return; }
  $('#loginPin').value = '';
  $('#loginErr').textContent = '';
  openOverlay('#loginOverlay');
  setTimeout(() => $('#loginPin').focus(), 50);
}

function masuk(e) {
  e.preventDefault();
  const role = $('#loginRole').value;
  const pin = (S().pin || {})[role] || '';
  if (pin && $('#loginPin').value !== pin) { $('#loginErr').textContent = 'PIN salah.'; return; }
  aturPeran(role);
  closeOverlay('#loginOverlay');
  rute();
}

// ===== Router & sidebar =====
function bukaRute(hash) {
  if (location.hash === hash) rute(); else location.hash = hash;
}

function toggleSidebar(paksa) {
  document.body.classList.toggle('sidebar-buka', paksa === undefined ? !document.body.classList.contains('sidebar-buka') : paksa);
}

function renderSidebar() {
  const h = location.hash || '#/dashboard';
  const link = (href, label, extra = '') =>
    `<a href="${href}" class="nav-link ${h === href || h.startsWith(href + '/') ? 'aktif' : ''} ${extra}">${label}</a>`;
  $('#sidebar').innerHTML = `
    <div class="side-brand">📋 Kontrak &amp; Tagihan</div>
    ${link('#/dashboard', '📊 Dashboard')}
    ${MENU.map(m => `
      <div class="nav-grup">${m.ikon} ${m.label.toUpperCase()}</div>
      ${m.sub.map(s => link(`#/${m.id}/${s.id}`, s.label + (s.tipe === 'tunda' ? ' <span class="nav-tag">format</span>' : ''), s.tambahan ? 'nav-tambahan' : '')).join('')}
    `).join('')}
    <div class="nav-grup">LAINNYA</div>
    ${link('#/master', '📦 Master Data')}
    ${link('#/arsip', '📁 Arsip Dokumen Lama')}
    ${bisa('admin') ? link('#/pengaturan', '⚙️ Pengaturan') : ''}
    <div class="side-ver">v${APP_VERSION}</div>`;
}

function tampilkanView(id) {
  $$('.view').forEach(v => { v.style.display = v.id === id ? 'block' : 'none'; });
}

function rute() {
  const h = location.hash || '#/dashboard';
  const [, a, b] = h.split('/');
  renderSidebar();
  toggleSidebar(false);
  closePrint();
  if (a === 'arsip') { tampilkanView('view-arsip'); return; }
  if (a === 'master') { tampilkanView('view-master'); return; }
  if (a === 'pengaturan') {
    if (!bisa('admin')) { bukaRute('#/dashboard'); return; }
    tampilkanView('view-pengaturan'); renderPengaturan(); return;
  }
  tampilkanView('view-modul');
  const menu = MENU.find(m => m.id === a);
  const sub = menu?.sub.find(s => s.id === b);
  if (!menu || !sub) { renderDashboard(); return; }
  renderHalaman(menu, sub);
}

// ===== Dashboard =====
function ringkasKontrak(k) {
  const tr = terminKontrak(k.id);
  const N = nilaiKontrak(k);
  const akhir = tr[tr.length - 1];
  const h = akhir ? hitung(k, akhir) : null;
  return { N, terminN: tr.length, prestasi: h ? h.pSd : 0, dibayar: h ? h.bap.sd : 0 };
}

function renderDashboard() {
  const kartu = MENU.map(m => {
    const ks = daftarKontrak.filter(k => k.menu === m.id);
    const r = ks.map(ringkasKontrak);
    const nilai = r.reduce((s, x) => s + x.N, 0);
    const prestasi = r.reduce((s, x) => s + x.dibayar, 0);
    return `<div class="stat-card dash-card" onclick="bukaRute('#/${m.id}/${m.sub[0].id}')">
      <div class="stat-icon">${m.ikon}</div>
      <div class="stat-info">
        <span class="stat-label">${m.label.toUpperCase()}</span>
        <span class="stat-value">${ks.length} kontrak</span>
        <span class="stat-label">Nilai ${formatIdp(nilai)} · Prestasi ${formatIdp(prestasi)}</span>
      </div></div>`;
  }).join('');
  const terbaru = daftarTermin.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);
  const habis = daftarKontrak.filter(k => k.tglAkhir && k.status !== 'Final')
    .map(k => ({ k, sisa: Math.round((tglObj(k.tglAkhir) - tglObj(todayStr())) / 864e5) }))
    .filter(x => x.sisa <= 30).sort((a, b) => a.sisa - b.sisa).slice(0, 8);
  $('#view-modul').innerHTML = `
    <div class="page-head"><div>
      <h1 class="page-title">📊 Dashboard</h1>
      <p class="page-desc">${escapeHtml(S().proyek)} · ${escapeHtml(S().namaKso)}</p>
    </div></div>
    <section class="stats-grid">${kartu}</section>
    <div class="dash-grid">
      <section class="panel"><h3 class="panel-title">🕑 Berita acara terakhir diubah</h3>
        ${terbaru.length ? `<table class="tbl"><tbody>${terbaru.map(t => {
          const k = kontrakById(t.kontrakId); if (!k) return '';
          return `<tr><td>${escapeHtml(t.jenis === 'bapr' ? 'BAPR' : 'Termin ' + t.ke)}</td><td>${escapeHtml(k.nomor)}</td><td>${escapeHtml(k.vendor?.nama)}</td><td>${tglID(t.tanggal)}</td></tr>`;
        }).join('')}</tbody></table>` : '<p class="muted">Belum ada berita acara.</p>'}
      </section>
      <section class="panel"><h3 class="panel-title">⏰ Kontrak berakhir ≤ 30 hari</h3>
        ${habis.length ? `<table class="tbl"><tbody>${habis.map(({ k, sisa }) => `<tr><td>${escapeHtml(k.nomor)}</td><td>${escapeHtml(k.vendor?.nama)}</td><td class="${sisa < 0 ? 'text-danger' : ''}">${tglID(k.tglAkhir)} (${sisa < 0 ? 'lewat ' + -sisa : sisa} hari)</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Tidak ada.</p>'}
      </section>
    </div>
    ${!adaPin() ? '<p class="info-bar">🔓 PIN peran belum diatur — semua pengguna perangkat ini memiliki akses Admin. Atur di <a href="#/pengaturan">Pengaturan › Peran &amp; PIN</a>.</p>' : ''}`;
}

// ===== Halaman list =====
const filterState = {};

function renderHalaman(menu, sub) {
  const key = menu.id + '/' + sub.id;
  const f = filterState[key] || (filterState[key] = { q: '', jenis: 'all', status: 'all', tahun: 'all' });
  const head = (tombol) => `
    <div class="page-head">
      <div>
        <div class="crumb">${menu.ikon} ${menu.label} › ${escapeHtml(sub.label)}</div>
        <h1 class="page-title">${escapeHtml(sub.label)}</h1>
        <p class="page-desc">${escapeHtml(sub.ket)}</p>
      </div>
      <div class="page-actions">${tombol || ''}</div>
    </div>`;

  if (sub.tipe === 'tunda') {
    $('#view-modul').innerHTML = head() + `
      <div class="empty-state"><div class="empty-icon">🗂️</div>
        <h3 class="empty-title">Format ${escapeHtml(sub.label)} belum tersedia</h3>
        <p class="empty-desc">Master format ${escapeHtml(sub.label)} (${escapeHtml(sub.ket)}) belum ada di file master Alat yang dikirim.<br>
        Kirim file master ${escapeHtml(sub.label)} agar halaman, form, dan cetaknya dibuat sama persis.</p></div>`;
    return;
  }

  const tahunList = [...new Set(daftarKontrak.filter(k => k.menu === menu.id).map(k => (k.tanggal || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const filterBar = `
    <section class="filter-bar">
      <div class="filter-group"><input type="text" placeholder="Cari nomor, vendor, pekerjaan…" value="${escapeHtml(f.q)}" oninput="ubahFilter('${key}','q',this.value)"></div>
      ${sub.tipe === 'kontrak' && sub.jenis.length > 1 ? `<div class="filter-group"><select onchange="ubahFilter('${key}','jenis',this.value)">
        <option value="all">Semua jenis</option>${sub.jenis.map(j => `<option ${f.jenis === j ? 'selected' : ''}>${j}</option>`).join('')}</select></div>` : ''}
      <div class="filter-group"><select onchange="ubahFilter('${key}','status',this.value)">
        <option value="all">Semua status</option>${STATUS_DOK.map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="filter-group"><select onchange="ubahFilter('${key}','tahun',this.value)">
        <option value="all">Semua tahun</option>${tahunList.map(t => `<option ${f.tahun === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    </section>`;

  const cocokKontrak = (k) => {
    if (k.menu !== menu.id) return false;
    if (f.tahun !== 'all' && !(k.tanggal || '').startsWith(f.tahun)) return false;
    if (f.jenis !== 'all' && k.jenis !== f.jenis) return false;
    if (f.q) {
      const hay = [k.nomor, k.jenis, k.pekerjaan, k.vendor?.nama, k.vendor?.npwp].join(' ').toLowerCase();
      if (!f.q.toLowerCase().split(/\s+/).every(t => hay.includes(t))) return false;
    }
    return true;
  };

  let isi = '';
  if (sub.tipe === 'kontrak' || sub.tipe === 'lampiran') {
    const ks = daftarKontrak.filter(k => cocokKontrak(k) && (f.status === 'all' || k.status === f.status) &&
      (sub.tipe === 'lampiran' || sub.jenis.includes(k.jenis)))
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.nomor || '').localeCompare(a.nomor || ''));
    isi = ks.length ? `<div class="table-scroll"><table class="tbl tbl-data">
      <thead><tr><th>Nomor</th><th>Jenis</th><th>Tanggal</th><th>Vendor / Subkon</th><th>Pekerjaan / Pengadaan</th>
      <th class="num">Nilai (excl. PPN)</th><th class="num">Prestasi</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${ks.map(k => {
        const r = ringkasKontrak(k);
        const aksi = sub.tipe === 'lampiran'
          ? `<button class="btn btn-sm btn-primary" onclick="cetakDok('${sub.cetak}','${k.id}')">🖨️ Cetak Lampiran</button>`
          : aksiKontrak(k);
        return `<tr>
          <td class="mono">${escapeHtml(k.nomor)}</td><td>${escapeHtml(k.jenis)}</td><td>${tglID(k.tanggal)}</td>
          <td>${escapeHtml(k.vendor?.nama)}</td><td>${escapeHtml(k.pekerjaan)}</td>
          <td class="num">${formatIdp(r.N)}</td><td class="num">${persen(r.prestasi)} <small class="muted">(${r.terminN} termin)</small></td>
          <td><span class="doc-card-badge ${badgeStatus(k.status)}">${escapeHtml(k.status || 'Draft')}</span></td>
          <td class="aksi">${aksi}</td></tr>`;
      }).join('')}</tbody></table></div>` : kosong(sub.tipe === 'lampiran' ? 'Belum ada kontrak.' : `Belum ada ${sub.label}.`);
    const tombol = sub.tipe === 'kontrak'
      ? sub.jenis.map(j => `<button class="btn btn-primary need-user" onclick="formKontrak(null,'${j}')">+ ${j}</button>`).join('')
      : '';
    $('#view-modul').innerHTML = head(tombol) + filterBar + isi;
    return;
  }

  // termin / bapr
  const jenisT = sub.tipe === 'bapr' ? 'bapr' : 'termin';
  const rows = daftarTermin.filter(t => (t.jenis || 'termin') === jenisT && (f.status === 'all' || t.status === f.status))
    .map(t => ({ t, k: kontrakById(t.kontrakId) }))
    .filter(x => x.k && cocokKontrak(x.k))
    .sort((a, b) => (b.t.tanggal || '').localeCompare(a.t.tanggal || '') || b.t.ke - a.t.ke);
  isi = rows.length ? `<div class="table-scroll"><table class="tbl tbl-data">
    <thead><tr><th>Nomor ${escapeHtml(sub.kode || 'Dokumen')}</th><th>${jenisT === 'bapr' ? 'Ke' : 'Termin'}</th><th>Tanggal</th><th>Kontrak</th><th>Vendor / Subkon</th>
    <th class="num">${jenisT === 'bapr' ? 'Retensi dibayar' : 'Prestasi saat ini'}</th><th class="num">${jenisT === 'bapr' ? '' : 'Prestasi s.d.'}</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${rows.map(({ t, k }) => {
      const h = jenisT === 'bapr' ? hitungBapr(k, t) : hitung(k, t);
      return `<tr>
        <td class="mono">${escapeHtml(nomorDok(sub, k, t))}</td><td>${t.ke}</td><td>${tglID(t.tanggal)}</td>
        <td class="mono">${escapeHtml(k.nomor)}</td><td>${escapeHtml(k.vendor?.nama)}</td>
        <td class="num">${formatIdp(jenisT === 'bapr' ? h.total : h.bap.saat)}</td>
        <td class="num">${jenisT === 'bapr' ? '' : persen(h.pSd)}</td>
        <td><span class="doc-card-badge ${badgeStatus(t.status)}">${escapeHtml(t.status || 'Draft')}</span></td>
        <td class="aksi">
          <button class="btn btn-sm btn-primary" onclick="cetakDok('${sub.cetak}','${k.id}','${t.id}')">🖨️ Cetak</button>
          <button class="btn btn-sm need-user" onclick="${jenisT === 'bapr' ? `formBapr('${k.id}','${t.id}')` : `formTermin('${menu.id}','${k.id}','${t.id}')`}">✏️ Edit</button>
          <button class="btn btn-sm btn-danger-ghost need-admin" onclick="hapusTermin('${t.id}')">🗑️</button>
        </td></tr>`;
    }).join('')}</tbody></table></div>` : kosong(`Belum ada ${sub.label}.`);
  const tombol = `<button class="btn btn-primary need-user" onclick="${jenisT === 'bapr' ? `formBapr()` : `formTermin('${menu.id}')`}">+ Buat ${escapeHtml(sub.label)}</button>`;
  $('#view-modul').innerHTML = head(tombol) + filterBar + isi;
}

function aksiKontrak(k) {
  const j = JENIS_KONTRAK[k.jenis];
  const cetak = [];
  if (j.cetak) cetak.push(`<button class="btn btn-sm btn-primary" onclick="cetakDok('${j.cetak}','${k.id}')">🖨️ ${k.jenis === 'SPM' ? 'Cetak SPM' : 'Cetak Format SPM'}</button>`);
  if (j.surat) cetak.push(`<button class="btn btn-sm btn-primary" onclick="unduhSurat('${k.id}')">📄 Surat Word</button>`);
  if (k.menu !== 'bahan') cetak.push(`<button class="btn btn-sm" onclick="cetakDok('${k.menu}_lampiran','${k.id}')">🖨️ Lampiran</button>`);
  return cetak.join('') +
    `<button class="btn btn-sm need-user" onclick="formKontrak('${k.id}')">✏️ Edit</button>
     <button class="btn btn-sm need-user" onclick="formTermin('${k.menu}','${k.id}')" title="Buat berita acara termin berikutnya">+ Termin</button>
     <button class="btn btn-sm btn-danger-ghost need-admin" onclick="hapusKontrak('${k.id}')">🗑️</button>`;
}

function badgeStatus(s) {
  return { Draft: 'badge-draft', Diproses: 'badge-dibuat', Final: 'badge-selesai' }[s] || 'badge-draft';
}

function kosong(teks) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><h3 class="empty-title">${escapeHtml(teks)}</h3>
    <p class="empty-desc">Gunakan tombol di kanan atas untuk menambah.</p></div>`;
}

function ubahFilter(key, field, val) {
  filterState[key][field] = val;
  clearTimeout(ubahFilter.t);
  ubahFilter.t = setTimeout(() => {
    const pos = document.activeElement?.selectionStart;
    rute();
    if (field === 'q') {
      const inp = $('#view-modul .filter-bar input');
      if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch { /* */ } }
    }
  }, field === 'q' ? 250 : 0);
}

// ===== Penomoran =====
function nomorKontrak(k) {
  const tahun = (k.tanggal || todayStr()).slice(0, 4);
  const kso = k.menu === 'bahan' ? S().kodeKsoBahan : S().kodeKsoLain;
  return `${k.noUrut}/${k.jenis}/${kso}/${S().kodeProyek}/${tahun}`;
}

function urutBerikut(jenis, tahun, kecualiId) {
  const pakai = daftarKontrak.filter(k => k.jenis === jenis && k.id !== kecualiId && (k.tanggal || '').startsWith(tahun))
    .map(k => parseInt(k.noUrut, 10) || 0);
  return pad((pakai.length ? Math.max(...pakai) : 0) + 1);
}

function nomorDok(sub, k, t) {
  if (t.nomor) return t.nomor;
  const kode = sub.kode || (k.menu === 'subkon' ? 'BAPP' : 'BAPA');
  return `${pad(t.ke)}/${kode}/${k.nomor}`;
}

function nomorTermin(kode, k, t) {
  return (t.nomorKhusus && t.nomorKhusus[kode]) || `${pad(t.ke)}/${kode}/${k.nomor}`;
}

// ===== Perhitungan (mengikuti rumus master) =====
const barisItem = (k) => (k.items || []).filter(it => (it.tipe || 'item') === 'item');

function nilaiKontrak(k) {
  return barisItem(k).reduce((s, it) => s + (Number(it.volume) || 0) * (Number(it.harga) || 0), 0);
}

function penandatangan(k) {
  // Master: penanda tangan BAP / Lampiran / BAPR = Kuasa KSO bila nilai kontrak ≥ batas
  const s = S();
  if (s.kuasaNama && nilaiKontrak(k) >= (Number(s.batasKuasa) || Infinity)) return { nama: s.kuasaNama, jabatan: s.kuasaJabatan };
  return { nama: s.pp1Nama, jabatan: s.pp1Jabatan };
}

function hitung(k, t) {
  const N = nilaiKontrak(k);
  const sebelum = terminKontrak(k.id).filter(x => x.ke < t.ke);
  const rows = (k.items || []).map(it => {
    if ((it.tipe || 'item') !== 'item') return { ...it };
    const vol = Number(it.volume) || 0, harga = Number(it.harga) || 0;
    const lalu = sebelum.reduce((s, x) => s + (Number(x.vol?.[it.uid]) || 0), 0);
    const saat = Number(t.vol?.[it.uid]) || 0;
    const sd = lalu + saat;
    const bobot = N ? vol * harga / N : 0;
    return {
      ...it, vol, harga, lalu, saat, sd, sisa: vol - sd, jml: vol * harga,
      jmlSaat: saat * harga, jmlSd: sd * harga, bobot,
      bLalu: vol ? lalu / vol * bobot : 0, bSaat: vol ? saat / vol * bobot : 0, bSd: vol ? sd / vol * bobot : 0,
    };
  });
  const items = rows.filter(r => (r.tipe || 'item') === 'item');
  const sum = (f) => items.reduce((s, r) => s + r[f], 0);
  const pSd = N ? sum('jmlSd') / N : 0;
  const pLalu = N ? items.reduce((s, r) => s + r.lalu * r.harga, 0) / N : 0;
  const pSaat = pSd - pLalu;
  const bap = { sd: Math.round(pSd * N), lalu: Math.round(pLalu * N) };
  bap.saat = bap.sd - bap.lalu;
  const ret = Number(t.retPct) || 0, um = Number(t.umPct) || 0;
  const pot = (p) => { const sd = Math.round(p * bap.sd), lalu = Math.round(p * bap.lalu); return { sd, lalu, saat: sd - lalu }; };
  const retensi = pot(ret), uangMuka = pot(um);
  const potLain = Number(t.potLain) || 0;
  const jumlah = Math.round(bap.saat - retensi.saat - uangMuka.saat - potLain);
  const ppn = Math.round(jumlah * (Number(k.ppn) || 0));
  return {
    N, rows, items, pSd, pLalu, pSaat, bap, ret, um, retensi, uangMuka, potLain, jumlah, ppn, total: jumlah + ppn,
    jmlSaat: sum('jmlSaat'), bobotLalu: sum('bLalu'), bobotSaat: sum('bSaat'), bobotSd: sum('bSd'),
  };
}

function hitungBapr(k, b) {
  const N = nilaiKontrak(k);
  const ret = Number(k.retensi) || 0;
  let kum = 0;
  const baris = terminKontrak(k.id).map(t => {
    const h = hitung(k, t);
    kum += h.bap.saat;
    return { t, saat: h.bap.saat, kum, prog: N ? kum / N : 0, retensi: Math.round(h.bap.saat * ret) };
  });
  const hutang = baris.reduce((s, x) => s + x.retensi, 0);
  const lalu = Number(b.dibayarLalu) || 0;
  const saatIni = hutang - lalu;
  const ppn = Math.floor(saatIni * (Number(k.ppn) || 0));
  return { N, ret, baris, hutang, lalu, saatIni, ppn, total: saatIni + ppn, pLalu: hutang ? lalu / hutang : 0 };
}

// ===== Mesin cetak (template dari master Excel) =====
function fmtSel(v, fmt) {
  if (v === undefined || v === null || v === '') return { t: '' };
  if (typeof v !== 'number') return { t: String(v) };
  if (!fmt || fmt === 'General' || fmt === '@') return { t: angka(v, Number.isInteger(v) ? 0 : 2), n: true };
  const sec = [];
  let cur = '', q = false;
  for (const ch of fmt) {
    if (ch === '"') q = !q;
    if (ch === ';' && !q) { sec.push(cur); cur = ''; } else cur += ch;
  }
  sec.push(cur);
  let s = v > 0 ? sec[0] : v < 0 ? (sec[1] ?? sec[0]) : (sec[2] ?? sec[0]);
  const isNegSec = v < 0 && sec[1] !== undefined;
  const bersih = s.replace(/\[[^\]]*\]/g, m => (/Rp/.test(m) ? '"Rp"' : ''));
  const rp = /"Rp"/.test(bersih);
  if (v === 0 && /"\s*-\s*"/.test(bersih)) return { t: '-', n: true, rp };
  const pct = bersih.includes('%');
  const dm = bersih.match(/0\.(0+)/);
  const dec = dm ? dm[1].length : 0;
  let x = pct ? v * 100 : v;
  let t = angka(isNegSec ? Math.abs(x) : x, dec) + (pct ? '%' : '');
  if (isNegSec && /\(/.test(bersih.replace(/_\(/g, ''))) t = '(' + t + ')';
  else if (isNegSec) t = '-' + t;
  return { t, n: true, rp };
}

const SKALA_HURUF = 0.95;
let cssTerpasang = false;
function pasangCssCetak() {
  if (cssTerpasang || !window.CETAK_TPL) return;
  const st = document.createElement('style');
  st.id = 'cssCetak';
  // Excel (GDI) merender huruf sedikit lebih sempit daripada browser; koreksi agar baris tidak terlipat lebih banyak dari master
  const skala = (css) => css.replace(/font-size:([\d.]+)pt/, (m, pt) => `font-size:${(pt * SKALA_HURUF).toFixed(2)}pt`);
  st.textContent = CETAK_TPL.css.map((c, i) => `table.xl td.x${i}{${skala(c)}}`).join('\n');
  document.head.appendChild(st);
  cssTerpasang = true;
}

function renderLembar(tplId, isi) {
  const T = CETAK_TPL.tpl[tplId];
  pasangCssCetak();
  const sel = isi.sel || {};
  const sisaSel = new Set(Object.keys(sel));
  const td = (c, nilai, fmt, extra = '') => {
    const f = fmtSel(nilai, c.n || fmt);
    let html = escapeHtml(f.t);
    if (f.rp) html = `<span class="acc"><span>Rp</span><span>${escapeHtml(f.t)}</span></span>`;
    const rata = f.n && !/text-align/.test(CETAK_TPL.css[c.s]) ? ' style="text-align:right"' : '';
    return `<td class="x${c.s}"${c.cs ? ` colspan="${c.cs}"` : ''}${c.rs ? ` rowspan="${c.rs}"` : ''}${rata}${extra}>${html}</td>`;
  };
  const baris = (row, nilaiDari) => `<tr style="height:${row.h}px">${row.c.map(c => {
    const huruf = T.L[c.i];
    const addr = huruf + row.r;
    const [ada, val] = nilaiDari(huruf, addr, c);
    return td(c, ada ? val : (c.a ? '' : c.v), c.n);
  }).join('')}</tr>`;
  const dariSel = (h, addr, c) => {
    if (addr in sel) { sisaSel.delete(addr); return [true, sel[addr]]; }
    return [false];
  };
  let html = T.head.map(r => baris(r, dariSel)).join('');
  if (Object.keys(T.proto).length) {
    for (const b of (isi.baris || [])) {
      const proto = T.proto[b.jenis] || T.proto.item;
      html += baris(proto, (h) => [true, b.sel[h] ?? '']);
    }
    const pad0 = T.proto.kosong || T.proto.item;
    for (let i = 0; i < (isi.pad ?? T.isi); i++) html += baris(pad0, () => [true, '']);
  }
  // baris kosong di ujung area cetak tidak ikut dicetak (mencegah halaman kosong)
  const tail = T.tail.slice();
  while (tail.length && tail[tail.length - 1].c.every(c => !c.a && (c.v === undefined || c.v === '') && !(T.L[c.i] + tail[tail.length - 1].r in sel))) tail.pop();
  html += tail.map(r => baris(r, dariSel)).join('');
  if (sisaSel.size && isi.cekSel !== false) console.warn(tplId, 'sel tidak ditemukan di template:', [...sisaSel]);

  const lebar = T.cols.reduce((a, b) => a + b, 0);
  const [mt, mr, mb, ml] = T.margin.map(m => (Number(m) || 0) * 25.4);
  const kertas = T.orient === 'landscape' ? 297 : 210;
  const tinggi = T.orient === 'landscape' ? 210 : 297;
  const isiMm = kertas - ml - mr;
  // Skala sama dengan pengaturan halaman master: "Fit to page" (lebar, lalu tinggi) atau skala tetap (%),
  // tidak pernah melebihi lebar kertas
  const fit = T.fit || { page: true, w: 1, h: 0, scale: 100 };
  const pasLebar = (isiMm * 96 / 25.4) / lebar;
  const zoom = fit.page ? pasLebar : Math.min(pasLebar, (fit.scale || 100) / 100);
  const tinggiPx = (tinggi - mt - Math.max(mb, 10)) * 96 / 25.4;
  const logo = S().logo
    ? `<img src="${S().logo}" alt="logo">`
    : '<span class="no-print">Logo<br><small>(opsional — unggah di Pengaturan)</small></span>';
  return {
    html: `<div class="lembar" style="width:${isiMm}mm">
      <div class="logo-slot">${logo}</div>
      <div class="lembar-skala" data-zoom="${zoom.toFixed(4)}" data-fit-h="${fit.page ? fit.h : 0}" data-tinggi="${tinggiPx.toFixed(1)}" style="zoom:${zoom.toFixed(4)}"><table class="xl" style="width:${lebar}px"><colgroup>${T.cols.map(w => `<col style="width:${w}px">`).join('')}</colgroup><tbody>${html}</tbody></table></div>
    </div>`,
    page: { orient: T.orient, margin: [mt, mr, Math.max(mb, 10), ml] },
  };
}

// ===== Isi template: sel (alamat → nilai) & baris rincian =====
function barisRincian(rows, peta, opsi = {}) {
  // peta: fungsi (jenis, row, nomor) → objek {Huruf: nilai}
  const out = [];
  let no = 0;
  for (const r of rows) {
    const jenis = r.tipe || 'item';
    if (jenis === 'judul' || jenis === 'kelompok') no = opsi.nomorLanjut ? no : 0;
    if (jenis === 'item') no++;
    out.push({ jenis, sel: peta(jenis, r, no) });
  }
  return out;
}

const hargaTeks = (r) => (r.hargaKet ? r.hargaKet : r.harga);
const volTeks = (r, v) => (r.hargaKet ? '-' : v);

function konteks(k, t) {
  const s = S();
  return {
    s, k, t, v: k.vendor || {},
    pp1: { nama: s.pp1Nama, jabatan: s.pp1Jabatan },
    ttd: penandatangan(k),
    kso: s.namaKso, proyek: s.proyek,
  };
}

const ISI = {
  bahan_spm(k) {
    const c = konteks(k), v = c.v, N = nilaiKontrak(k);
    const ppn = Math.round(N * (Number(k.ppn) || 0)), total = N + ppn;
    return {
      sel: {
        A4: k.jenis === 'SPPM' ? 'SURAT PERJANJIAN PEMESANAN MATERIAL' : 'SURAT PEMESANAN MATERIAL',
        A5: 'Nomor : ' + k.nomor,
        C8: ': ' + (v.nama || ''), C9: ': ' + (v.alamat || ''), C10: ': ' + (v.npwp || ''),
        G113: N, G114: ppn, G115: total,
        C116: ': == ' + bilang(total) + ' ==',
        D119: 'Rp ' + angka(total),
        B124: 'Waktu pengadaan material / alat terhitung sejak tanggal dikeluarkannya sampai dengan Tanggal. ' + tglID(k.tglAkhir),
        B125: 'Lokasi Serah Terima Material / Franco : ' + (k.franco || ''),
        B130: `Pembayaran dilakukan dengan Reguler Tempo ${k.tempo || 0} (${judulKata(terbilang(Number(k.tempo) || 0))}) hari Kerja, setelah invoice diterima dengan benar dan lengkap,`,
        B131: `sesuai administrasi ${c.kso} dan dilampiri Berita Acara Pembayaran yang ditandatangani oleh kedua belah pihak.`,
        B133: 'Ac. Name : ' + (v.namaRek || v.nama || ''), B134: 'Ac. Number : ' + (v.rekening || ''), B135: 'Bank : ' + (v.bank || ''),
        B136: 'Nomor NPWP : ' + (c.s.npwpKso || '') + ' atas nama ' + UP(c.kso),
        B137: 'Korespondensi atau informasi pengiriman ditujukan ke Sdr. ' + (c.s.kontak || ''),
        B138: 'Keberterimaan : ' + (k.keberterimaan || ''),
        E141: c.s.kota + ', ' + tglID(k.tanggal),
        B142: UP(v.nama), F142: UP(c.kso),
        B146: v.direktur || '', B147: v.jabatan || 'Direktur',
        F146: c.ttd.nama, F147: c.ttd.jabatan,
        A150: (k.jenis === 'SPPM' ? 'SPPM' : 'SPM') + ' ini harus dilampirkan pada permintaan pembayaran.',
      },
      baris: barisRincian(k.items.filter(r => (r.tipe || 'item') === 'item'), (j, r, no) => ({
        A: no, B: r.uraian, D: r.satuan, E: Number(r.volume) || 0, F: Number(r.harga) || 0, G: (Number(r.volume) || 0) * (Number(r.harga) || 0),
      }), { nomorLanjut: true }),
    };
  },

  bahan_bapm(k, t) {
    const c = konteks(k, t), v = c.v, h = hitung(k, t);
    return {
      sel: {
        A6: 'Nomor : ' + nomorTermin('BAPM', k, t),
        A8: kalimatBahan(t.tanggal) + ', telah diterima alat :',
        C10: ': ' + UP(v.nama), C12: ': ' + UP(c.kso) + ' Proyek Pekerjaan ' + c.proyek,
        C17: ': ' + k.nomor + '     Tanggal : ' + tglID(k.tanggal),
        C18: ': Rp ' + angka(h.N, 2) + ' (Exclude PPN)',
        C19: ': ' + tglID(k.tglMulai || k.tanggal) + ' s/d ' + tglID(k.tglAkhir),
        K126: h.jmlSaat,
        H129: h.pSd, K129: h.bap.sd, H130: h.pLalu, K130: h.bap.lalu, H131: h.pSaat, K131: h.bap.saat,
        H133: h.um, K133: -h.uangMuka.saat, H134: h.ret, K134: -h.retensi.saat,
        K135: h.bap.saat - h.uangMuka.saat - h.retensi.saat,
        C137: ': == ' + bilang(h.bap.saat - h.uangMuka.saat - h.retensi.saat) + ' ==',
        B142: UP(c.kso), F142: UP(c.kso), I142: UP(v.nama),
        B146: c.pp1.nama, B147: c.pp1.jabatan, F146: c.s.penerimaNama, F147: c.s.penerimaJabatan,
        I146: v.direktur || '', I147: v.jabatan || 'Direktur',
      },
      baris: barisRincian(h.items, (j, r, no) => ({
        A: no, B: r.uraian, D: r.vol, E: r.satuan, F: r.lalu, G: r.saat, H: r.sd, I: r.sisa, J: r.harga, K: r.jmlSaat,
      }), { nomorLanjut: true }),
    };
  },

  bahan_bap(k, t) {
    const c = konteks(k, t), v = c.v, h = hitung(k, t);
    const diterima = h.items.filter(r => r.saat > 0).sort((a, b) => b.harga - a.harga);
    const daftar = diterima.slice(0, 3).map(r => r.uraian).join(', ') + (diterima.length > 3 ? ', dll.' : '');
    const b = h.bap, rt = h.retensi, um = h.uangMuka;
    return {
      sel: {
        A5: 'Nomor : ' + nomorTermin('BAP', k, t),
        A7: kalimatBahan(t.tanggal) + ', kami yang bertanda tangan dibawah ini :',
        B9: c.ttd.nama,
        G9: `Selaku ${c.ttd.jabatan}, Proyek Pekerjaan ${c.proyek} - ${c.s.kota}, dalam hal ini bertindak untuk dan atas nama ${c.kso} ${c.s.divisi} yang berkedudukan di ${c.s.alamatKso}, (untuk selanjutnya disebut “Pihak Pertama”).`,
        B13: v.direktur || '',
        G13: `Selaku ${v.jabatan || 'Direktur'} ${UP(v.nama)}, dalam hal ini bertindak untuk dan atas nama ${UP(v.nama)} yang berkedudukan di ${v.alamat || ''}, (untuk selanjutnya disebut “Pihak Kedua”).`,
        A17: `Menerangkan bahwa kedua belah pihak telah melakukan pemeriksaan atas pengadaan material ${daftar} sesuai lampiran pada Proyek Pekerjaan ${c.proyek} berdasarkan :`,
        D20: ': ' + k.nomor + ' Tanggal, ' + tglID(k.tanggal),
        D21: ': ' + tglID(k.tglMulai || k.tanggal) + ' s/d ' + tglID(k.tglAkhir),
        D22: ': Rp ' + angka(h.N) + ' (Exclude PPN)',
        A24: `Menyatakan bahwa prestasi Pihak Kedua s/d tanggal ${tglID(t.tanggal)} telah mencapai ${persen(h.pSd)} sesuai dengan Berita Acara Penerimaan Material Nomor : ${nomorTermin('BAPM', k, t)} pada tanggal ${tglID(t.tanggal)}. Maka Pihak Kedua berhak menerima pembayaran dengan perincian sebagai berikut :`,
        F28: h.pSd, I28: h.N, K28: b.sd, F29: h.pLalu, I29: h.N, K29: b.lalu, F30: h.pSaat, I30: h.N, K30: b.saat, L31: b.saat,
        F33: h.ret, I33: b.sd, K33: rt.sd, F34: h.ret, I34: b.lalu, K34: rt.lalu, F35: h.ret, I35: b.saat, K35: rt.saat, L36: rt.saat,
        F38: h.um, I38: b.sd, K38: um.sd, F39: h.um, I39: b.lalu, K39: um.lalu, F40: h.um, I40: b.saat, K40: um.saat, L41: um.saat,
        L43: h.jumlah, L45: h.ppn, L47: h.total,
        C49: ': == ' + bilang(h.total) + ' ==',
        C54: UP(v.nama), I54: UP(c.kso), C58: v.direktur || '', C59: v.jabatan || 'Direktur', I58: c.ttd.nama, I59: c.ttd.jabatan,
      },
    };
  },

  subkon_bapp(k, t) {
    const c = konteks(k, t), v = c.v, h = hitung(k, t);
    const pot = h.uangMuka.saat, ret = h.retensi.saat;
    return {
      sel: {
        B10: nomorTermin('BAPP', k, t),
        C12: kalimatSubkon(t.tanggal),
        D14: c.pp1.nama,
        F14: `Selaku ${c.pp1.jabatan}, Proyek ${c.proyek}, dalam hal ini bertindak untuk dan atas nama ${c.kso}, yang berkedudukan di ${c.s.alamatKso}`,
        D18: v.direktur || '',
        F18: `Selaku ${v.jabatan || 'Direktur'} ${v.nama || ''}, dalam hal ini bertindak untuk dan atas nama ${v.nama || ''} yang berkedudukan di ${v.alamat || ''}`,
        C21: `Menerangkan bahwa kedua belah pihak telah setuju dan sepakat melakukan pemeriksaan pekerjaan sesuai dengan lampiran ${k.jenis} Nomor ${k.nomor}, dan menyetujui prestasi pekerjaan berdasakan :`,
        H23: k.nomor, M23: tglID(k.tanggal), I24: h.N, H25: tglID(k.tglMulai || k.tanggal), K25: tglID(k.tglAkhir),
        Q61: h.jmlSaat,
        K64: h.pSd, N64: h.bap.sd, K65: h.pLalu, N65: h.bap.lalu, K66: h.pSaat, N66: h.bap.saat, K67: '',
        K68: h.um, N68: pot, K69: h.ret, N69: ret, N70: h.bap.saat - pot - ret,
        D75: UP(v.nama), N75: UP(c.kso), D82: v.direktur || '', D83: v.jabatan || 'Direktur', N82: c.pp1.nama, N83: c.pp1.jabatan,
      },
      baris: barisRincian(h.rows, (j, r, no) => j === 'item'
        ? { B: no, D: r.uraian, J: volTeks(r, r.vol), K: volTeks(r, r.lalu), L: volTeks(r, r.saat), M: volTeks(r, r.sd), N: volTeks(r, r.saat), O: volTeks(r, r.sisa), P: hargaTeks(r), Q: r.jmlSaat }
        : j === 'judul' ? { B: r.kode || '', C: r.uraian } : { C: r.uraian }),
    };
  },

  subkon_bap(k, t) { return isiBapSubkon(k, t, 'subkon'); },
  alat_bap(k, t) { return isiBapSubkon(k, t, 'alat'); },

  subkon_opname(k, t) { return isiOpname(k, t, 'subkon'); },
  alat_opname(k, t) { return isiOpname(k, t, 'alat'); },

  subkon_lampiran(k) {
    const c = konteks(k), v = c.v, N = nilaiKontrak(k);
    const ppn = Math.round(N * (Number(k.ppn) || 0));
    return {
      sel: {
        B3: 'LAMPIRAN SPKP NO. ' + k.nomor, F6: k.nomor, F7: tglID(k.tanggal), F8: k.pekerjaan || '', F9: c.proyek,
        K41: N, K42: ppn, K43: N + ppn, D46: bilang(N + ppn, true),
        B56: UP(c.kso), B57: '', B64: c.ttd.nama, B65: c.ttd.jabatan,
        I56: UP(v.nama), I64: v.direktur || '', I65: v.jabatan || 'Direktur',
      },
      baris: barisRincian(k.items, (j, r, no) => j === 'item'
        ? { B: no, D: r.uraian, H: r.hargaKet ? 0 : Number(r.volume) || 0, I: r.satuan, J: hargaTeks(r), K: (Number(r.volume) || 0) * (Number(r.harga) || 0) }
        : j === 'judul' ? { B: r.kode || '', C: r.uraian } : { C: r.uraian }),
    };
  },

  alat_lampiran(k) {
    const c = konteks(k), v = c.v, N = nilaiKontrak(k);
    const ppn = Math.round(N * (Number(k.ppn) || 0));
    return {
      sel: {
        B3: 'LAMPIRAN SPKP NO. ' + k.nomor, F6: k.nomor, F7: tglID(k.tanggal), F8: k.pekerjaan || '', F9: 'Proyek ' + c.proyek,
        K18: N, K19: ppn, K20: N + ppn, D23: bilang(N + ppn, true),
        B33: c.kso, I33: UP(v.nama), B41: c.ttd.nama, B42: c.ttd.jabatan, I41: v.direktur || '', I42: v.jabatan || 'Direktur',
      },
      baris: barisRincian(k.items.filter(r => (r.tipe || 'item') !== 'kosong'), (j, r) => j === 'item'
        ? { C: '-', D: r.uraian, H: Number(r.volume) || 0, I: r.satuan, J: hargaTeks(r), K: (Number(r.volume) || 0) * (Number(r.harga) || 0) }
        : { B: r.kode || '', C: r.uraian }),
    };
  },

  alat_bapa(k, t) {
    const c = konteks(k, t), v = c.v, h = hitung(k, t);
    const rows = h.rows.filter(r => (r.tipe || 'item') !== 'kosong');
    const baris = barisRincian(rows, (j, r) => j === 'item'
      ? { C: r.uraian, F: r.vol, G: r.satuan, H: r.lalu, I: r.saat, J: r.sd, K: r.sisa, L: hargaTeks(r), M: r.jmlSaat }
      : j === 'judul' ? { B: r.kode || '', C: r.uraian } : { C: r.uraian });
    if (t.periode) baris.push({ jenis: 'subjudul', sel: { C: t.periode } });
    return {
      sel: {
        B8: nomorTermin('BAPA', k, t), B10: kalimatAlat(t.tanggal),
        E12: v.nama || '', E15: UP(c.kso) + ' Proyek Pekerjaan ' + c.proyek,
        B17: `Menerangkan bahwa kedua belah pihak telah setuju dan sepakat melakukan pemeriksaan ${k.pekerjaan || ''} dan serah terima berdasarkan :`,
        E19: k.nomor, J19: tglID(k.tanggal),
        E21: h.N, E22: tglID(k.tglMulai || k.tanggal), G22: tglID(k.tglAkhir),
        M35: h.jmlSaat,
        J40: h.pSd, M40: h.bap.sd, J41: h.pLalu, M41: h.bap.lalu, J42: h.pSaat, M42: h.bap.saat,
        J44: h.um, M44: h.uangMuka.saat, J45: h.ret, M45: h.retensi.saat,
        M46: h.bap.saat - h.uangMuka.saat - h.retensi.saat,
        D48: ' ==  ' + bilang(h.bap.saat - h.uangMuka.saat - h.retensi.saat) + ' ==',
        B52: UP(c.kso), F52: UP(c.kso), L52: UP(v.nama),
        B59: UP(c.pp1.nama), B60: c.pp1.jabatan, F59: UP(c.s.penerimaNama), F60: c.s.penerimaJabatan,
        L59: UP(v.direktur), L60: v.jabatan || 'Direktur',
        B68: 'BAPA ini harus dilampirkan pada saat permintaan pembayaran.',
      },
      baris,
    };
  },

  subkon_bapr(k, b) { return isiBapr(k, b, 'subkon'); },
  alat_bapr(k, b) { return isiBapr(k, b, 'alat'); },
};

function isiBapSubkon(k, t, menu) {
  const c = konteks(k, t), v = c.v, h = hitung(k, t);
  const b = h.bap, rt = h.retensi, um = h.uangMuka;
  const add = k.addendum || {};
  const kodeBa = menu === 'alat' ? 'BAPA' : 'BAPP';
  return {
    sel: {
      C11: nomorTermin('BAP', k, t),
      C13: menu === 'alat' ? kalimatAlat(t.tanggal) : kalimatSubkon(t.tanggal),
      D15: c.ttd.nama,
      J15: menu === 'alat'
        ? `Selaku ${c.ttd.jabatan}, Proyek ${c.proyek}, dalam hal ini bertindak untuk dan atas nama ${c.kso} yang berkedudukan di ${c.s.alamatKso} (selanjutnya disebut sebagai PIHAK PERTAMA).`
        : `Selaku ${c.ttd.jabatan}, ${c.proyek}, dalam hal ini bertindak untuk dan atas nama ${c.kso} yang berkedudukan di ${c.s.alamatKso} (selanjutnya disebut sebagai PIHAK PERTAMA).`,
      D16: v.direktur || '',
      J16: `Selaku ${v.jabatan || 'Direktur'} ${v.nama || ''}, dalam hal ini bertindak untuk dan atas nama ${v.nama || ''} yang berkedudukan di ${v.alamat || ''} (selanjutnya disebut sebagai PIHAK KEDUA).`,
      C18: `Menerangkan bahwa kedua belah pihak, telah melakukan pemeriksaan atas ${k.pekerjaan || ''} pada ${menu === 'alat' ? 'Proyek ' : ''}${c.proyek}, dan berdasarkan :`,
      K20: k.nomor, P20: tglID(k.tanggal), K21: add.nomor ? `${add.nomor}${add.tanggal ? ' tanggal ' + tglID(add.tanggal) : ''}` : '-',
      K22: k.pekerjaan || '', K23: tglID(k.tglMulai || k.tanggal), N23: tglID(k.tglAkhir),
      K24: h.N, K25: Number(add.nilai) || 0,
      K26: Math.round((Number(k.uangMuka) || 0) * h.N), K27: Math.round((Number(k.retensi) || 0) * h.N),
      C28: menu === 'alat'
        ? `Menyatakan bahwa prestasi pekerjaan yang dicapai oleh PIHAK KEDUA telah ${persen(h.pSd)} sampai dengan tanggal ${tglID(t.tanggal)} adalah sesuai dengan Berita Acara Pemeriksaan Pekerjaan No. ${nomorTermin(kodeBa, k, t)}, dengan rincian sebagai berikut :`
        : `Menyatakan bahwa prestasi pekerjaan yang dicapai oleh PIHAK KEDUA sampai dengan tanggal ${tglID(t.tanggal)} adalah ${persen(h.pSd)} sesuai dengan Berita Acara Pemeriksaan Pekerjaan No. ${nomorTermin(kodeBa, k, t)}, dengan rincian sebagai berikut :`,
      J30: h.pSd, M30: h.N, P30: b.sd, J31: h.pLalu, M31: h.N, P31: b.lalu, J32: h.pSaat, M32: h.N, P32: b.saat, Q33: b.saat,
      J35: h.ret, M35: b.sd, P35: rt.sd, J36: h.ret, M36: b.lalu, P36: rt.lalu, J37: h.ret, M37: b.saat, P37: rt.saat, Q38: rt.saat,
      J40: h.um, M40: b.sd, P40: um.sd, J41: h.um, M41: b.lalu, P41: um.lalu, J42: h.um, M42: b.saat, P42: um.saat, Q43: um.saat,
      D46: t.potLainKet || '', P46: h.potLain || '', Q47: h.potLain,
      Q48: h.jumlah, Q49: h.ppn, Q50: h.total, Q51: h.total,
      F53: ' ==  ' + bilang(h.total) + ' ==',
      C58: UP(v.nama), P58: UP(c.kso), C67: v.direktur || '', C68: v.jabatan || 'Direktur', P67: c.ttd.nama, P68: c.ttd.jabatan,
    },
    cekSel: false,
  };
}

function isiOpname(k, t, menu) {
  const c = konteks(k, t), v = c.v, h = hitung(k, t);
  const s = c.s;
  const rows = menu === 'alat' ? h.rows.filter(r => (r.tipe || 'item') !== 'kosong') : h.rows;
  const baris = barisRincian(rows, (j, r, no) => j === 'item'
    ? { B: menu === 'alat' ? '' : no, D: r.uraian, N: volTeks(r, r.vol), O: r.satuan, P: hargaTeks(r), Q: r.jml, R: r.bobot, S: r.lalu, T: r.bLalu, U: r.saat, V: r.bSaat, W: r.sd, X: r.bSd }
    : j === 'judul' ? { B: r.kode || '', C: r.uraian } : (menu === 'alat' && j === 'subjudul' ? { D: r.uraian } : { C: r.uraian }));
  if (menu === 'alat' && t.periode) baris.push({ jenis: 'subjudul', sel: { D: t.periode } });
  const tot = menu === 'alat' ? 16 : 38, tgl = menu === 'alat' ? 18 : 40;
  const sel = {
    B4: UP(k.pekerjaan), B5: ' PROYEK ' + UP(c.proyek),
    ['Q' + tot]: h.N, ['R' + tot]: h.N ? 1 : 0, ['T' + tot]: h.bobotLalu, ['V' + tot]: h.bobotSaat, ['X' + tot]: h.bobotSd,
    ['W' + tgl]: s.kota + ', ' + tglID(t.tanggal),
  };
  if (menu === 'subkon') Object.assign(sel, {
    B42: s.ttdPerusahaan, N42: s.ttdPerusahaan, R42: s.ttdPerusahaan, B43: s.ttdDivisi, N43: s.ttdDivisi, R43: s.ttdDivisi,
    B50: s.pp1Nama, B51: s.pp1Jabatan, N50: s.pemeriksaNama, N51: s.pemeriksaJabatan,
    R50: s.penerimaNama, R51: s.penerimaJabatan, V50: v.direktur || '', V51: v.jabatan || 'Direktur',
    J56: s.mengetahuiNama || '', J57: s.mengetahuiNama ? s.ttdDivisi : '',
  });
  else Object.assign(sel, {
    B20: s.ttdPerusahaan, N20: s.ttdPerusahaan, R20: s.ttdPerusahaan, B21: s.ttdDivisi, N21: s.ttdDivisi, R21: s.ttdDivisi,
    V28: v.direktur || '', V29: v.jabatan || 'Direktur',
    J34: s.mengetahuiNama || '', J35: s.mengetahuiNama ? s.ttdDivisi : '',
  });
  return { sel, baris, cekSel: false };
}

function isiBapr(k, b, menu) {
  const c = konteks(k, b), v = c.v, h = hitungBapr(k, b);
  const nomor = b.nomor || `${pad(b.ke)}/${menu === 'alat' ? 'BAP-R' : 'BAPR'}/${k.nomor}`;
  const bast = b.nomorBast || `01/BAST/${k.nomor}`;
  const kal = menu === 'alat' ? kalimatAlat(b.tanggal) : kalimatSubkon(b.tanggal);
  const ttdKalimat = `Selaku ${c.ttd.jabatan}, ${menu === 'alat' ? 'Proyek ' : ''}${c.proyek}, dalam hal ini bertindak untuk dan atas nama ${c.kso}, yang berkedudukan di ${c.s.alamatKso}, (selanjutnya disebut sebagai PIHAK PERTAMA).`;
  const sel = {
    B11: nomor, B13: kal,
    C15: c.ttd.nama, G15: ttdKalimat,
    C17: v.direktur || '',
    G17: `Selaku ${v.jabatan || 'Direktur'} ${v.nama || ''}, dalam hal ini bertindak untuk dan atas nama ${v.nama || ''} yang berkedudukan di ${v.alamat || ''}, (selanjutnya disebut sebagai PIHAK KEDUA).`,
    B19: `Menerangkan bahwa kedua belah pihak telah melakukan pemeriksaan atas ${k.pekerjaan || ''} untuk ${menu === 'alat' ? 'Proyek ' : ''}${c.proyek}, dan berdasarkan :`,
    G21: k.nomor, L21: tglID(k.tanggal), G22: h.N, G23: tglID(k.tglMulai || k.tanggal), J23: tglID(k.tglAkhir),
    G24: bast, L24: tglID(b.tanggalBast),
    G26: Number(k.uangMuka) || 0, I26: h.N, L26: Math.round((Number(k.uangMuka) || 0) * h.N),
    G27: h.ret, I27: h.N, L27: Math.round(h.ret * h.N),
    B29: `Menyatakan bahwa masa pemeliharaan atas ${JENIS_KONTRAK[k.jenis]?.nama || 'Surat Perjanjian'} (${k.jenis}) tersebut diatas telah selesai sesuai BAST, maka Pihak Kedua berhak menerima pembayaran Retensi ${angka(h.ret * 100)} % dengan perincian sebagai berikut :`,
    O31: h.ret,
  };
  const baris = h.baris.map((x, i) => ({
    jenis: i === 0 ? 'pertama' : 'item',
    sel: Object.assign(i === 0 ? { C: menu === 'alat' ? '' : 'Atas Potongan Retensi pada : ' } : {},
      { G: 'BAP ' + x.t.ke, H: tglID(x.t.tanggal), J: x.saat, L: x.kum, N: x.prog, O: x.retensi }),
  }));
  if (menu === 'subkon') Object.assign(sel, {
    O38: h.hutang, K41: h.hutang, I41: 1, O41: h.hutang, I42: h.pLalu, K42: h.hutang, O42: h.lalu,
    I43: 1 - h.pLalu, K43: h.hutang, O43: h.saatIni, O44: h.ppn, O46: h.total,
    E49: ' ==  ' + bilang(h.total) + ' ==',
    B56: UP(v.nama), M56: UP(c.kso), B67: v.direktur || '', B68: v.jabatan || 'Direktur', M67: c.ttd.nama, M68: c.ttd.jabatan,
  });
  else Object.assign(sel, {
    O34: h.hutang, K37: h.hutang, I37: 1, O37: h.hutang, I38: h.pLalu, K38: h.hutang, O38: h.lalu,
    I39: 1 - h.pLalu, K39: h.hutang, O39: h.saatIni, O40: h.ppn, O42: h.total,
    E45: ' ==  ' + bilang(h.total) + ' ==',
    B52: v.nama || '', M52: c.kso, B63: v.direktur || '', B64: v.jabatan || 'Direktur', M63: c.ttd.nama, M64: c.ttd.jabatan,
  });
  return { sel, baris, pad: 0, cekSel: false };
}

// ===== Cetak =====
let pageStyleEl = null;

function cetakDok(tplId, kid, tid) {
  const k = kontrakById(kid);
  if (!k) return;
  const t = tid ? daftarTermin.find(x => x.id === tid) : null;
  if (!window.CETAK_TPL?.tpl[tplId]) { showToast('Template cetak tidak ditemukan.', 'error'); return; }
  if (tid && !t) return;
  const isi = ISI[tplId](k, t);
  const { html, page } = renderLembar(tplId, isi);
  const kode = (t ? (tplId.split('_')[1] || '').toUpperCase() + ' ' + (t.jenis === 'bapr' ? '' : 'T' + t.ke + ' ') : '') + k.nomor;
  if (!pageStyleEl) { pageStyleEl = document.createElement('style'); pageStyleEl.id = 'pageStyle'; document.head.appendChild(pageStyleEl); }
  const [mt, mr, mb, ml] = page.margin.map(x => x.toFixed(1) + 'mm');
  pageStyleEl.textContent = `@page { size: A4 ${page.orient}; margin: ${mt} ${mr} ${mb} ${ml};
    @bottom-left { content: ${JSON.stringify(kode)}; font: 7pt Arial, sans-serif; color: #444; }
    @bottom-right { content: "Hal " counter(page) " dari " counter(pages); font: 7pt Arial, sans-serif; color: #444; } }`;
  $('#printContent').innerHTML = `<div class="cetak-wrap ${page.orient}">${html}</div>`;
  $('#printTitle').textContent = (t ? (CETAK_TPL.tpl[tplId].sheet) : JENIS_KONTRAK[k.jenis]?.nama || tplId) + ' – ' + (k.vendor?.nama || '');
  const btn = $('#btnPreviewEdit');
  btn.style.display = bisa('ubah') ? '' : 'none';
  btn.onclick = () => { closePrint(); t ? (t.jenis === 'bapr' ? formBapr(k.id, t.id) : formTermin(k.menu, k.id, t.id)) : formKontrak(k.id); };
  openOverlay('#printOverlay');
  sesuaikanTinggi();
}

// Fit to page tinggi (Excel "Fit to N page(s) tall"): perkecil skala bila isi melebihi tinggi halaman
function sesuaikanTinggi() {
  $$('#printContent .lembar-skala').forEach(el => {
    const n = Number(el.dataset.fitH);
    if (!n) return;
    const z = Number(el.dataset.zoom);
    el.style.zoom = 1;
    const h = el.getBoundingClientRect().height;
    if (!h) { el.style.zoom = z; return; }
    const maks = Number(el.dataset.tinggi) * n - 2;
    el.style.zoom = Math.min(z, maks / h).toFixed(4);
  });
}

// ===== Surat perjanjian Word (isi template master) =====
// isian: [Nomor Kontrak …[..]…] (kop), [teks isian], dan titik-titik (… atau ....)
const POLA_ISIAN = /\[Perjanjian[^\[\]]*?Nomor:\s*[.…]+[^\s\]\[]*\[PGr\]\/\[Tahun\]\]?|\[Nomor Kontrak(?:[^\[\]]|\[[^\]]*\])*\]|\(\.{2,}-\.{2,}-20\.\.\)|\(?DD-MM-YYYY\)|\[[^\[\]\n]{1,160}\]|[.…]{4,}/g;

function bacaZip(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return XLSX.CFB.read(arr, { type: 'array' });
}

function bagianXml(zip) {
  return zip.FullPaths.map((p, i) => [p, i]).filter(([p]) => /word\/(document|header\d*|footer\d*)\.xml$/.test(p));
}

const dekode = (u8) => new TextDecoder('utf-8').decode(u8 instanceof Uint8Array ? u8 : new Uint8Array(u8));

// Ambil daftar isian (placeholder) per paragraf, tahan terhadap teks yang terpecah di beberapa run
function pindaiParagraf(xmlDoc, cb) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  // hanya teks milik paragraf ini (bukan paragraf bersarang di kotak teks) agar urutan isian konsisten
  const milik = (t, p) => { let n = t.parentNode; while (n && !(n.localName === 'p' && n.namespaceURI === W)) n = n.parentNode; return n === p; };
  for (const p of [...xmlDoc.getElementsByTagNameNS(W, 'p')]) {
    const ts = [...p.getElementsByTagNameNS(W, 't')].filter(t => milik(t, p));
    if (!ts.length) continue;
    const teks = ts.map(t => t.textContent).join('');
    if (!POLA_ISIAN.test(teks)) { POLA_ISIAN.lastIndex = 0; continue; }
    POLA_ISIAN.lastIndex = 0;
    cb(p, ts, teks);
  }
}

const cacheIsian = {};

function daftarIsian(jenis) {
  if (cacheIsian[jenis]) return cacheIsian[jenis];
  const tpl = window.SURAT_TPL?.[jenis];
  if (!tpl) return null;
  const zip = bacaZip(tpl.b64);
  const hasil = [];
  let n = 0;
  for (const [path, i] of bagianXml(zip)) {
    const doc = new DOMParser().parseFromString(dekode(zip.FileIndex[i].content), 'application/xml');
    pindaiParagraf(doc, (p, ts, teks) => {
      let m;
      while ((m = POLA_ISIAN.exec(teks))) {
        const key = `${path.split('/').pop()}:${n}`;
        n++;
        const sebelum = teks.slice(Math.max(0, m.index - 70), m.index);
        const sesudah = teks.slice(m.index + m[0].length, m.index + m[0].length + 30);
        if (!hasil.some(h => h.key === key)) hasil.push({ key, ph: m[0], sebelum, sesudah, bagian: path.includes('header') ? 'kop' : 'isi', i: hasil.length });
      }
    });
  }
  cacheIsian[jenis] = hasil;
  return hasil;
}

// Nilai otomatis dari data kontrak untuk isian yang dikenali
function isianOtomatis(k, it) {
  const nilai = isianOtomatisDasar(k, it);
  if (typeof nilai !== 'string' || !nilai) return nilai;
  // hindari kata ganda, mis. "Pengadaan …" + "Pengadaan Material …"
  const akhir = it.sebelum.trim().split(/\s+/).pop() || '';
  let hasil = nilai;
  if (akhir.length > 2 && hasil.toLowerCase().startsWith(akhir.toLowerCase() + ' ')) hasil = hasil.slice(akhir.length + 1);
  if (!it.ph.startsWith('[') && /[A-Za-z]$/.test(it.sebelum)) hasil = ' ' + hasil;   // "Pengadaan……" tanpa spasi
  return hasil;
}

function isianOtomatisDasar(k, it) {
  const v = k.vendor || {}, s = S(), N = nilaiKontrak(k), ppn = Math.round(N * (Number(k.ppn) || 0));
  const h = hariIni(k.tanggal);
  const ph = it.ph.toLowerCase(), seb = it.sebelum.toLowerCase().trim();
  const daftar = cacheIsian[JENIS_KONTRAK[k.jenis]?.surat] || [];
  const prev = daftar[it.i - 1], next = daftar[it.i + 1];
  if (/^\[nomor kontrak/.test(ph)) return k.nomor;
  const kop = it.ph.match(/^\[(Perjanjian[^\[\]]*?Nomor:)/);
  if (kop) return kop[1] + ' ' + k.nomor;
  if (/^\(\.+-\.+-20\.\.\)$|^\(?dd-mm-yyyy\)$/.test(ph)) return `(${h.dd}-${h.mm}-${h.yyyy})`;
  if (it.ph.startsWith('[')) {
    if (/^\[isi dengan nama|^\[diisi atas nama perorangan\]$/.test(ph)) return '';
    if (/^\[diisi nama kepala proyek\]$/.test(ph)) return s.pp1Nama || undefined;
    if (/^\[diisi jabatan penandatangan\]$/.test(ph) && prev && /kepala proyek/i.test(prev.ph)) return s.pp1Jabatan;
    if (/^\[alamat perusahaan\]$/.test(ph)) return v.alamat;
    if (/^\[nama hari\]$/.test(ph)) return h.hari;
    if (/^\[tanggal\]$/.test(ph)) return h.tgl;
    if (/^\[nama bulan\]$/.test(ph)) return h.bulan;
    if (/^\[tahun\]$/.test(ph)) return h.tahun;
    if (/nama perusahaan|diisi nama vendor|nama subkon|nama mandor/.test(ph)) return /diisi nama vendor/.test(ph) ? UP(v.nama) : v.nama;
    if (/nama proyek/.test(ph)) return s.proyek;
    if (/nama material|nama pengadaan|nama pekerjaan|nama alat/.test(ph)) return k.pekerjaan;
    if (/tempat ditandatangani/.test(ph)) return s.kota;
  } else {
    if (/nomor\s*:?$/.test(seb) && it.bagian === 'isi' && !/surat|no\.\s*$/.test(seb.slice(-25))) return k.nomor;
    if (/^tanggal\s*:?$/.test(seb.slice(-9).trim()) && seb.length < 12) return tglID(k.tanggal);
    if (/no\. po sap\s*:?$/.test(seb)) return k.noPO || undefined;
    if (/rp\.?\s*$/.test(seb) && /terbilang/.test(it.sesudah.toLowerCase())) return angka(N + ppn);
    if (/terbilang\s*:?$/.test(seb)) return bilang(N + ppn);
    if (/dari tanggal\s*$/.test(seb)) return tglID(k.tglMulai || k.tanggal);
    if (/sampai dengan tanggal\s*$/.test(seb)) return tglID(k.tglAkhir);
    if (/kantor bank\s*:?$/.test(seb)) return v.bank;
    if (/no\. rekening\s*:?$/.test(seb)) return v.rekening;
    if (/atas nama\s*:?$/.test(seb)) return v.namaRek || v.nama;
    if (/^pt\.?$/.test(seb) || /\bpt\.?\s*$/.test(seb) && seb.length < 6) return v.nama?.replace(/^PT\.?\s*/i, '');
    if (/^proyek$/.test(seb)) return s.proyek;
    if (/id proyek\s*:?$/.test(seb)) return s.kodeProyek;
    if (/(pengadaan|borongan pekerjaan)$/.test(seb) && seb.length < 32) return k.pekerjaan;
    if (/pada hari ini$/.test(seb)) return h.hari;
    if (/pada hari ini .* tanggal$/.test(seb)) return h.tgl;
    if (/pada hari ini .* bulan$/.test(seb)) return h.bulan;
    if (/pada hari ini .* tahun$/.test(seb)) return h.tahun;
    if (!seb && !it.sesudah.trim() && next && /atas nama perorangan/i.test(next.ph)) return v.nama;
    // baris titik-titik tunggal tepat di bawah nama pengadaan pada sampul → dikosongkan
    if (!seb && !it.sesudah.trim() && prev && /(pengadaan|borongan pekerjaan)\s*$/i.test(prev.sebelum)) return '';
  }
  return undefined;
}

function nilaiIsian(k, it) {
  const isian = k.isian?.[it.key];
  if (isian && isian.hapus) return '';
  if (isian && isian.v !== undefined && isian.v !== '') return isian.v;
  return isianOtomatis(k, it);
}

function isiDokumenWord(k) {
  const jenis = JENIS_KONTRAK[k.jenis].surat;
  const tpl = window.SURAT_TPL?.[jenis];
  const zip = bacaZip(tpl.b64);
  const daftar = daftarIsian(jenis);
  let n = 0;
  for (const [path, i] of bagianXml(zip)) {
    const entry = zip.FileIndex[i];
    const doc = new DOMParser().parseFromString(dekode(entry.content), 'application/xml');
    let ubah = false;
    pindaiParagraf(doc, (p, ts, teks) => {
      const ganti = [];
      let m;
      while ((m = POLA_ISIAN.exec(teks))) {
        const key = `${path.split('/').pop()}:${n}`;
        n++;
        const it = daftar.find(x => x.key === key);
        const val = it ? nilaiIsian(k, it) : undefined;
        if (val !== undefined) ganti.push({ a: m.index, b: m.index + m[0].length, val: String(val) });
      }
      // terapkan dari belakang agar posisi tetap valid
      for (const g of ganti.reverse()) {
        let pos = 0;
        let mulai = null;
        for (const t of ts) {
          const len = t.textContent.length, awal = pos, akhir = pos + len;
          if (akhir > g.a && awal < g.b) {
            const s0 = Math.max(g.a - awal, 0), s1 = Math.min(g.b - awal, len);
            const tx = t.textContent;
            if (mulai === null) { t.textContent = tx.slice(0, s0) + g.val + tx.slice(s1); mulai = t; }
            else t.textContent = tx.slice(0, s0) + tx.slice(s1);
            t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
          }
          pos = akhir;
        }
        ubah = true;
      }
    });
    if (ubah) entry.content = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
  }
  return XLSX.CFB.write(zip, { fileType: 'zip', type: 'array', compression: true });
}

function unduhSurat(kid) {
  const k = kontrakById(kid);
  const jenis = JENIS_KONTRAK[k.jenis]?.surat;
  if (!window.SURAT_TPL?.[jenis]) {
    showToast(`Template Word ${k.jenis} belum tersedia${k.jenis === 'SPPP' ? ' (file master SPPP terkunci/terenkripsi)' : ''}. Kirim master ${k.jenis} yang tidak terkunci.`, 'error');
    return;
  }
  if (!window.XLSX?.CFB) { showToast('Library pengolah file belum termuat.', 'error'); return; }
  try {
    const data = isiDokumenWord(k);
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${k.jenis}_${k.nomor.replace(/[\\/:*?"<>|]+/g, '-')}.docx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    showToast(`Surat ${k.jenis} diunduh — buka di Word untuk dicetak / simpan PDF.`);
  } catch (err) {
    console.error(err);
    showToast('Gagal membuat surat: ' + err.message, 'error');
  }
}

// ===== Form kontrak =====
let formK = null;

function tutupForm() {
  closeOverlay('#formOverlay');
  formK = null;
}

function inp(id, label, val, opsi = {}) {
  const tipe = opsi.type || 'text';
  return `<div class="form-group ${opsi.cls || ''}">
    <label for="${id}">${escapeHtml(label)}${opsi.wajib ? ' *' : ''}</label>
    ${opsi.area
      ? `<textarea id="${id}" rows="${opsi.rows || 2}" ${opsi.wajib ? 'required' : ''}>${escapeHtml(val ?? '')}</textarea>`
      : `<input id="${id}" type="${tipe}" value="${escapeHtml(val ?? '')}" ${opsi.wajib ? 'required' : ''} ${opsi.attr || ''}>`}
    ${opsi.help ? `<small>${opsi.help}</small>` : ''}
  </div>`;
}

function formKontrak(id, jenisBaru) {
  if (!cekBisa('ubah')) return;
  const ada = id ? kontrakById(id) : null;
  const jenis = ada ? ada.jenis : jenisBaru;
  const def = JENIS_KONTRAK[jenis];
  const tgl = todayStr();
  const k = ada ? JSON.parse(JSON.stringify(ada)) : {
    id: genId('k'), menu: def.menu, jenis, tanggal: tgl, tglMulai: tgl, tglAkhir: '',
    noUrut: urutBerikut(jenis, tgl.slice(0, 4)), vendor: { jabatan: 'Direktur' }, items: [],
    ppn: 0.11, tempo: 60, uangMuka: 0, retensi: def.menu === 'subkon' ? 0.05 : 0,
    franco: def.menu === 'bahan' ? 'Proyek Pekerjaan ' + S().proyek : '',
    keberterimaan: def.menu === 'bahan' ? 'Material On Site Lokasi Proyek, kondisi baik, sesuai spesifikasi proyek dan disetujui konsultan/pengawas serta pemilik proyek.' : '',
    status: 'Draft', isian: {}, addendum: {},
  };
  k.items.forEach(it => { if (!it.uid) it.uid = genId('i'); });
  formK = k;
  const v = k.vendor || {};
  $('#formTitle').textContent = (ada ? 'Edit ' : 'Buat ') + jenis + ' — ' + def.nama;
  $('#formBody').innerHTML = `
    <form id="fKontrak" onsubmit="simpanKontrak(event)" novalidate>
      <div class="panel">
        <h3 class="panel-title">📋 Data Kontrak</h3>
        <div class="form-row">
          ${inp('kNoUrut', 'No. Urut', k.noUrut, { wajib: true, attr: 'inputmode="numeric" maxlength="4" oninput="pratinjauNomor()"', help: 'Otomatis, bisa diubah' })}
          ${inp('kTanggal', 'Tanggal Kontrak', k.tanggal, { type: 'date', wajib: true, attr: 'onchange="pratinjauNomor()"' })}
          <div class="form-group"><label for="kStatusSel">Status</label><select id="kStatusSel">${STATUS_DOK.map(s => `<option ${k.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label>Nomor ${jenis}</label><div class="nomor-preview" id="kNomorPrev"></div></div>
        ${inp('kPekerjaan', def.menu === 'bahan' ? 'Nama Pengadaan / Material' : def.menu === 'alat' ? 'Nama Pekerjaan / Sewa Alat' : 'Nama Pekerjaan', k.pekerjaan, { wajib: true })}
        <div class="form-row">
          ${inp('kMulai', 'Mulai Pelaksanaan', k.tglMulai, { type: 'date', wajib: true })}
          ${inp('kAkhir', 'Akhir Pelaksanaan / Pengadaan', k.tglAkhir, { type: 'date', wajib: true })}
          ${inp('kPO', 'No. PO SAP', k.noPO)}
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">🏢 Pihak Kedua (${def.menu === 'bahan' ? 'Vendor' : def.menu === 'alat' ? 'Vendor Alat' : 'Subkontraktor / Mandor'})</h3>
        <div class="form-row">
          ${inp('vNama', 'Nama Perusahaan', v.nama, { wajib: true, attr: 'data-ac="vendor" autocomplete="off" placeholder="Ketik nama / ID vendor untuk cari di master"' })}
          ${inp('vNpwp', 'NPWP', v.npwp)}
        </div>
        ${inp('vAlamat', 'Alamat', v.alamat, { wajib: true })}
        <div class="form-row">
          ${inp('vDirektur', 'Nama Penanda Tangan (Direktur)', v.direktur, { wajib: true })}
          ${inp('vJabatan', 'Jabatan', v.jabatan || 'Direktur', { wajib: true })}
        </div>
        <div class="form-row">
          ${inp('vBank', 'Bank', v.bank)}
          ${inp('vRek', 'No. Rekening', v.rekening)}
          ${inp('vNamaRek', 'Nama Rekening', v.namaRek)}
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">🧾 Rincian Item <span class="panel-subtitle">volume × harga satuan, sesuai BOQ/RAB</span></h3>
        <div class="table-scroll"><table class="item-table k-items">
          <thead><tr><th style="width:110px">Jenis baris</th><th style="width:60px">No/Kode</th><th style="width:100px">Kode SAP</th><th>Uraian</th>
          <th style="width:70px">Satuan</th><th style="width:90px">Volume</th><th style="width:120px">Harga Satuan</th><th style="width:80px">Ket. harga</th><th style="width:120px">Jumlah</th><th style="width:60px"></th></tr></thead>
          <tbody id="kItems"></tbody>
        </table></div>
        <div class="btn-row">
          <button type="button" class="btn btn-sm" onclick="tambahBarisK('item')">+ Item</button>
          ${def.menu !== 'bahan' ? `<button type="button" class="btn btn-sm" onclick="tambahBarisK('judul')">+ Judul</button>
          <button type="button" class="btn btn-sm" onclick="tambahBarisK('subjudul')">+ Sub-judul</button>
          <button type="button" class="btn btn-sm" onclick="tambahBarisK('kelompok')">+ Kelompok</button>
          <button type="button" class="btn btn-sm" onclick="tambahBarisK('kosong')">+ Baris kosong</button>` : ''}
        </div>
        <div class="totals" id="kTotals"></div>
      </div>

      <div class="panel">
        <h3 class="panel-title">💳 Syarat Pembayaran</h3>
        <div class="form-row">
          ${inp('kPpn', 'Tarif PPN (%)', (Number(k.ppn) || 0) * 100, { type: 'number', attr: 'min="0" max="100" step="0.01" oninput="hitungTotalK()"' })}
          ${inp('kTempo', 'Tempo Pembayaran (hari kerja)', k.tempo, { type: 'number', attr: 'min="0"' })}
          ${inp('kUm', 'Uang Muka (%)', (Number(k.uangMuka) || 0) * 100, { type: 'number', attr: 'min="0" max="100" step="0.01"' })}
          ${inp('kRet', 'Retensi (%)', (Number(k.retensi) || 0) * 100, { type: 'number', attr: 'min="0" max="100" step="0.01"' })}
        </div>
        ${def.menu === 'bahan' ? `
          ${inp('kFranco', 'Lokasi Serah Terima / Franco', k.franco)}
          ${inp('kTerima', 'Syarat Keberterimaan', k.keberterimaan, { area: true })}` : ''}
        <div class="form-row">
          ${inp('aNomor', 'Addendum — Nomor (bila ada)', k.addendum?.nomor)}
          ${inp('aTanggal', 'Tanggal Addendum', k.addendum?.tanggal, { type: 'date' })}
          ${inp('aNilai', 'Nilai Addendum (Rp)', k.addendum?.nilai, { type: 'number', attr: 'min="0"' })}
        </div>
      </div>

      ${def.surat ? `<div class="panel">
        <h3 class="panel-title">📄 Isian Surat Perjanjian (Word) <span class="panel-subtitle">${window.SURAT_TPL?.[def.surat] ? 'kosongkan = otomatis / sesuai template' : 'template belum tersedia'}</span></h3>
        <div id="kIsian"><button type="button" class="btn btn-sm" onclick="tampilIsian()">Tampilkan isian surat</button></div>
      </div>` : ''}

      <p class="text-danger" id="kErr"></p>
      <div class="modal-actions">
        <button type="button" class="btn" onclick="tutupForm()">Batal</button>
        <button type="submit" class="btn btn-primary">💾 Simpan</button>
      </div>
    </form>`;
  renderBarisK();
  pratinjauNomor();
  if (!k.items.length) tambahBarisK('item');
  openOverlay('#formOverlay');
}

function pratinjauNomor() {
  if (!formK) return;
  const tmp = { ...formK, noUrut: pad(parseInt($('#kNoUrut').value, 10) || 0), tanggal: $('#kTanggal').value || todayStr() };
  $('#kNomorPrev').textContent = nomorKontrak(tmp);
}

function renderBarisK() {
  const k = formK;
  $('#kItems').innerHTML = k.items.map((it, i) => {
    const t = it.tipe || 'item';
    const isItem = t === 'item';
    return `<tr class="item-row k-row tipe-${t}" data-i="${i}">
      <td><select onchange="ubahBarisK(${i},'tipe',this.value)">${TIPE_BARIS.map(([v, l]) => `<option value="${v}" ${t === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><input value="${escapeHtml(it.kode || '')}" oninput="ubahBarisK(${i},'kode',this.value)" ${t === 'judul' ? '' : 'disabled'} placeholder="${t === 'judul' ? 'A' : ''}"></td>
      <td><input class="it-code" value="${escapeHtml(it.kodeItem || '')}" oninput="ubahBarisK(${i},'kodeItem',this.value)" ${isItem ? '' : 'disabled'}></td>
      <td><input class="it-desc" value="${escapeHtml(it.uraian || '')}" oninput="ubahBarisK(${i},'uraian',this.value)" ${isItem ? 'data-ac="item" autocomplete="off"' : ''} ${t === 'kosong' ? 'disabled' : ''}></td>
      <td><input class="it-unit" value="${escapeHtml(it.satuan || '')}" oninput="ubahBarisK(${i},'satuan',this.value)" ${isItem ? '' : 'disabled'}></td>
      <td><input class="it-qty" type="number" step="any" min="0" value="${it.volume ?? ''}" oninput="ubahBarisK(${i},'volume',this.value)" ${isItem ? '' : 'disabled'}></td>
      <td><input class="it-price" type="number" step="any" min="0" value="${it.harga ?? ''}" oninput="ubahBarisK(${i},'harga',this.value)" ${isItem ? '' : 'disabled'}></td>
      <td><input value="${escapeHtml(it.hargaKet || '')}" oninput="ubahBarisK(${i},'hargaKet',this.value)" ${isItem ? '' : 'disabled'} placeholder="include" title="Isi mis. 'include' bila harga sudah termasuk item lain"></td>
      <td class="num it-amount">${isItem ? angka((Number(it.volume) || 0) * (Number(it.harga) || 0)) : ''}</td>
      <td class="row-actions"><button type="button" class="btn-remove" title="Naik" onclick="geserBarisK(${i},-1)">↑</button><button type="button" class="btn-remove" title="Hapus" onclick="hapusBarisK(${i})">✕</button></td>
    </tr>`;
  }).join('');
  hitungTotalK();
}

function ubahBarisK(i, f, val) {
  const it = formK.items[i];
  it[f] = ['volume', 'harga'].includes(f) ? (val === '' ? '' : Number(val)) : val;
  if (f === 'tipe') { renderBarisK(); return; }
  if (f === 'volume' || f === 'harga') {
    const tr = $(`#kItems tr[data-i="${i}"] .it-amount`);
    if (tr) tr.textContent = angka((Number(it.volume) || 0) * (Number(it.harga) || 0));
    hitungTotalK();
  }
}

function tambahBarisK(tipe) {
  formK.items.push({ uid: genId('i'), tipe, uraian: '', satuan: '', volume: '', harga: '' });
  renderBarisK();
  const rows = $$('#kItems tr');
  rows[rows.length - 1]?.querySelector('.it-desc')?.focus();
}

function hapusBarisK(i) {
  const it = formK.items[i];
  const dipakai = daftarTermin.some(t => t.kontrakId === formK.id && Number(t.vol?.[it.uid]));
  if (dipakai && !confirm('Item ini sudah memiliki progres di berita acara. Tetap hapus?')) return;
  formK.items.splice(i, 1);
  renderBarisK();
}

function geserBarisK(i, d) {
  const j = i + d;
  if (j < 0 || j >= formK.items.length) return;
  [formK.items[i], formK.items[j]] = [formK.items[j], formK.items[i]];
  renderBarisK();
}

function hitungTotalK() {
  if (!formK) return;
  const N = nilaiKontrak(formK);
  const ppn = Math.round(N * (Number($('#kPpn')?.value) || 0) / 100);
  $('#kTotals').innerHTML = `<div><span>Nilai Kontrak (excl. PPN)</span><strong>${formatIdp(N)}</strong></div>
    <div><span>PPN</span><strong>${formatIdp(ppn)}</strong></div>
    <div class="grand"><span>Total</span><strong>${formatIdp(N + ppn)}</strong></div>
    ${S().kuasaNama && N >= S().batasKuasa ? `<div class="muted">Nilai ≥ ${formatIdp(S().batasKuasa)} → BAP/Lampiran/BAPR ditandatangani ${escapeHtml(S().kuasaJabatan)}</div>` : ''}`;
}

function tampilIsian() {
  const k = formK, jenis = JENIS_KONTRAK[k.jenis].surat;
  const daftar = daftarIsian(jenis);
  if (!daftar) { $('#kIsian').innerHTML = '<p class="muted">Template Word belum tersedia.</p>'; return; }
  bacaFormKontrak(true);
  $('#kIsian').innerHTML = `<p class="muted">${daftar.length} isian ditemukan di template ${jenis}. Kolom kosong memakai nilai otomatis (abu-abu) atau tetap seperti template. Centang "hapus" untuk menghilangkan teks petunjuk dari surat.</p>
    <div class="isian-list">${daftar.map((it, i) => {
      const cur = k.isian?.[it.key] || {};
      const oto = isianOtomatis(k, it);
      return `<div class="isian-row">
        <div class="isian-ctx"><span class="muted">…${escapeHtml(it.sebelum.slice(-50))}</span><b>${escapeHtml(it.ph.length > 60 ? it.ph.slice(0, 60) + '…' : it.ph)}</b><span class="muted">${escapeHtml(it.sesudah)}…</span>${it.bagian === 'kop' ? ' <span class="nav-tag">kop</span>' : ''}</div>
        <div class="isian-in"><input data-k="${escapeHtml(it.key)}" value="${escapeHtml(cur.v || '')}" placeholder="${escapeHtml(oto ?? '(tetap seperti template)')}">
        <label class="inline-check"><input type="checkbox" data-hapus="${escapeHtml(it.key)}" ${cur.hapus ? 'checked' : ''}> hapus</label></div>
      </div>`;
    }).join('')}</div>`;
}

function bacaFormKontrak(diam) {
  const k = formK;
  const val = (id) => ($('#' + id)?.value ?? '').trim();
  k.noUrut = pad(parseInt(val('kNoUrut'), 10) || 0);
  k.tanggal = val('kTanggal');
  k.status = $('#kStatusSel').value;
  k.pekerjaan = val('kPekerjaan');
  k.tglMulai = val('kMulai');
  k.tglAkhir = val('kAkhir');
  k.noPO = val('kPO');
  k.vendor = {
    nama: val('vNama'), npwp: val('vNpwp'), alamat: val('vAlamat'), direktur: val('vDirektur'), jabatan: val('vJabatan'),
    bank: val('vBank'), rekening: val('vRek'), namaRek: val('vNamaRek'),
  };
  k.ppn = (Number(val('kPpn')) || 0) / 100;
  k.tempo = Number(val('kTempo')) || 0;
  k.uangMuka = (Number(val('kUm')) || 0) / 100;
  k.retensi = (Number(val('kRet')) || 0) / 100;
  if ($('#kFranco')) { k.franco = val('kFranco'); k.keberterimaan = val('kTerima'); }
  k.addendum = { nomor: val('aNomor'), tanggal: val('aTanggal'), nilai: Number(val('aNilai')) || 0 };
  $$('#kIsian [data-k]').forEach(el => {
    const key = el.dataset.k;
    const hapus = $(`#kIsian [data-hapus="${CSS.escape(key)}"]`)?.checked;
    if (el.value.trim() || hapus) (k.isian ||= {})[key] = { v: el.value.trim(), hapus: !!hapus };
    else if (k.isian) delete k.isian[key];
  });
  k.nomor = nomorKontrak(k);
  if (diam) return [];
  const err = [];
  if (!k.noUrut || k.noUrut === '00') err.push('No. urut wajib diisi.');
  if (!k.tanggal) err.push('Tanggal kontrak wajib diisi.');
  if (!k.pekerjaan) err.push('Nama pekerjaan / pengadaan wajib diisi.');
  if (!k.tglMulai || !k.tglAkhir) err.push('Tanggal mulai dan akhir pelaksanaan wajib diisi.');
  else if (k.tglAkhir < k.tglMulai) err.push('Tanggal akhir tidak boleh sebelum tanggal mulai.');
  if (!k.vendor.nama || !k.vendor.alamat || !k.vendor.direktur) err.push('Nama, alamat, dan penanda tangan Pihak Kedua wajib diisi.');
  if (k.vendor.npwp && !/^[\d.\-\s]{15,22}$/.test(k.vendor.npwp)) err.push('Format NPWP tidak valid (15–16 digit).');
  const items = barisItem(k);
  if (!items.length) err.push('Minimal 1 baris item.');
  items.forEach((it, i) => {
    if (!it.uraian) err.push(`Item ke-${i + 1}: uraian wajib diisi.`);
    if (!(Number(it.volume) > 0) && !it.hargaKet) err.push(`Item "${it.uraian || i + 1}": volume harus > 0.`);
    if (Number(it.harga) < 0) err.push(`Item "${it.uraian || i + 1}": harga tidak boleh negatif.`);
  });
  if (k.ppn < 0 || k.ppn > 1 || k.uangMuka > 1 || k.retensi > 1) err.push('Persentase harus 0–100.');
  if (daftarKontrak.some(x => x.id !== k.id && x.nomor === k.nomor)) err.push(`Nomor ${k.nomor} sudah dipakai kontrak lain.`);
  return err;
}

async function simpanKontrak(e) {
  e.preventDefault();
  const err = bacaFormKontrak();
  if (err.length) { $('#kErr').innerHTML = err.map(escapeHtml).join('<br>'); $('#kErr').scrollIntoView({ block: 'center' }); return; }
  const k = formK;
  k.items = k.items.map(it => ({ ...it, volume: Number(it.volume) || 0, harga: Number(it.harga) || 0 }));
  const lama = kontrakById(k.id);
  k.createdAt = lama?.createdAt || Date.now();
  k.updatedAt = Date.now();
  await dbSimpan('kontrak', k);
  // vendor baru otomatis masuk master
  if (k.vendor.nama && !masterData.vendors.some(v => (v.name || '').trim().toLowerCase() === k.vendor.nama.toLowerCase())) {
    const v = makeMasterItem('vendors', { name: k.vendor.nama, address: k.vendor.alamat, npwp: k.vendor.npwp });
    masterData.vendors.push(v);
    await dbPutMasterItems([v]);
  }
  await muatModul();
  tutupForm();
  rute();
  showToast(`${k.jenis} ${k.nomor} tersimpan.`);
}

async function hapusKontrak(id) {
  if (!cekBisa('hapus')) return;
  const k = kontrakById(id);
  const tr = daftarTermin.filter(t => t.kontrakId === id);
  if (!confirm(`Hapus ${k.jenis} ${k.nomor}${tr.length ? ` beserta ${tr.length} berita acara` : ''}? Permanen.`)) return;
  for (const t of tr) await dbHapus('termin', t.id);
  await dbHapus('kontrak', id);
  await muatModul();
  rute();
  showToast('Kontrak dihapus.');
}

// ===== Form termin (BAPM/BAP, BAPA/BAP, Opname/BAPP/BAP) =====
let formT = null;

function opsiKontrak(menu, pilih) {
  return daftarKontrak.filter(k => k.menu === menu).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
    .map(k => `<option value="${k.id}" ${k.id === pilih ? 'selected' : ''}>${escapeHtml(k.nomor)} — ${escapeHtml(k.vendor?.nama || '')}</option>`).join('');
}

function formTermin(menu, kid, tid) {
  if (!cekBisa('ubah')) return;
  const ks = daftarKontrak.filter(k => k.menu === menu);
  if (!ks.length) { showToast('Buat kontrak terlebih dahulu.', 'error'); return; }
  const ada = tid ? daftarTermin.find(t => t.id === tid) : null;
  const kId = ada?.kontrakId || kid || ks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0].id;
  const k = kontrakById(kId);
  const tr = terminKontrak(kId);
  formT = ada ? JSON.parse(JSON.stringify(ada)) : {
    id: genId('t'), jenis: 'termin', kontrakId: kId, ke: (tr.length ? tr[tr.length - 1].ke : 0) + 1,
    tanggal: todayStr(), vol: {}, retPct: Number(k.retensi) || 0, umPct: Number(k.uangMuka) || 0, potLain: 0, status: 'Draft',
  };
  const label = { bahan: 'BAPM & BAP', alat: 'BAPA & BAP', subkon: 'Opname, BAPP & BAP' }[menu];
  $('#formTitle').textContent = (ada ? 'Edit ' : 'Buat ') + label + ' — Termin ' + formT.ke;
  $('#formBody').innerHTML = `
    <form onsubmit="simpanTermin(event)" novalidate>
      <div class="panel">
        <h3 class="panel-title">📋 Berita Acara Termin <span class="panel-subtitle">satu termin = ${label}</span></h3>
        <div class="form-group"><label for="tKontrak">Kontrak *</label>
          <select id="tKontrak" onchange="gantiKontrakTermin('${menu}', this.value)" ${ada ? 'disabled' : ''}>${opsiKontrak(menu, kId)}</select></div>
        <div class="form-row">
          ${inp('tKe', 'Termin ke-', formT.ke, { type: 'number', wajib: true, attr: 'min="1" oninput="pratinjauNomorT()"' })}
          ${inp('tTanggal', 'Tanggal Berita Acara', formT.tanggal, { type: 'date', wajib: true })}
          <div class="form-group"><label for="tStatus">Status</label><select id="tStatus">${STATUS_DOK.map(s => `<option ${formT.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="nomor-preview" id="tNomorPrev"></div>
        ${menu === 'alat' ? inp('tPeriode', 'Keterangan Periode (tampil di BAPA & Rincian)', formT.periode, { help: 'mis. Periode (20 Agustus - 20 September)' }) : ''}
      </div>
      <div class="panel">
        <h3 class="panel-title">📦 Volume ${menu === 'bahan' ? 'Material Diterima' : menu === 'alat' ? 'Pemakaian Alat' : 'Prestasi Pekerjaan'} Termin Ini</h3>
        <div class="table-scroll"><table class="item-table"><thead><tr>
          <th>Uraian</th><th>Sat</th><th class="num">Vol. Kontrak</th><th class="num">s.d. Lalu</th><th style="width:110px">Saat Ini</th><th class="num">s.d. Saat Ini</th><th class="num">Sisa</th><th class="num">Harga</th><th class="num">Jumlah Saat Ini</th>
        </tr></thead><tbody id="tItems"></tbody></table></div>
        <div class="btn-row"><button type="button" class="btn btn-sm" onclick="isiSisaT()">Isi semua dengan sisa volume</button></div>
      </div>
      <div class="panel">
        <h3 class="panel-title">💳 Potongan di BAP</h3>
        <div class="form-row">
          ${inp('tRet', 'Potongan Retensi (%)', (Number(formT.retPct) || 0) * 100, { type: 'number', attr: 'min="0" max="100" step="0.01" oninput="hitungT()"' })}
          ${inp('tUm', 'Pengembalian Uang Muka (%)', (Number(formT.umPct) || 0) * 100, { type: 'number', attr: 'min="0" max="100" step="0.01" oninput="hitungT()"' })}
          ${menu !== 'bahan' ? inp('tPot', 'Potongan Lain (Rp)', formT.potLain || '', { type: 'number', attr: 'min="0" oninput="hitungT()"' }) : ''}
        </div>
        ${menu !== 'bahan' ? inp('tPotKet', 'Keterangan Potongan Lain', formT.potLainKet) : ''}
        <div class="totals" id="tTotals"></div>
      </div>
      <p class="text-danger" id="tErr"></p>
      <div class="modal-actions">
        <button type="button" class="btn" onclick="tutupForm()">Batal</button>
        <button type="submit" class="btn btn-primary">💾 Simpan</button>
      </div>
    </form>`;
  renderItemT();
  openOverlay('#formOverlay');
}

function gantiKontrakTermin(menu, kid) {
  const tr = terminKontrak(kid);
  const k = kontrakById(kid);
  formT.kontrakId = kid;
  formT.ke = (tr.length ? tr[tr.length - 1].ke : 0) + 1;
  formT.vol = {};
  formT.retPct = Number(k.retensi) || 0;
  formT.umPct = Number(k.uangMuka) || 0;
  $('#tKe').value = formT.ke;
  $('#tRet').value = formT.retPct * 100;
  $('#tUm').value = formT.umPct * 100;
  renderItemT();
}

function pratinjauNomorT() {
  const k = kontrakById(formT.kontrakId);
  const ke = parseInt($('#tKe').value, 10) || formT.ke;
  const kode = { bahan: ['BAPM', 'BAP'], alat: ['BAPA', 'BAP'], subkon: ['BAPP', 'BAP'] }[k.menu];
  $('#tNomorPrev').innerHTML = kode.map(c => `${c}: <b>${pad(ke)}/${c}/${escapeHtml(k.nomor)}</b>`).join(' &nbsp;·&nbsp; ');
}

function renderItemT() {
  const k = kontrakById(formT.kontrakId);
  const h = hitung(k, { ...formT, ke: parseInt($('#tKe')?.value, 10) || formT.ke });
  $('#tItems').innerHTML = h.rows.map(r => {
    const t = r.tipe || 'item';
    if (t !== 'item') return t === 'kosong' ? '' : `<tr class="tipe-${t}"><td colspan="9"><b>${escapeHtml((r.kode ? r.kode + '. ' : '') + (r.uraian || ''))}</b></td></tr>`;
    return `<tr data-uid="${r.uid}">
      <td>${escapeHtml(r.uraian)}</td><td>${escapeHtml(r.satuan)}</td>
      <td class="num">${angka(r.vol, 2)}</td><td class="num">${angka(r.lalu, 2)}</td>
      <td><input type="number" step="any" min="0" class="t-vol" value="${formT.vol[r.uid] ?? ''}" oninput="ubahVolT('${r.uid}', this.value)"></td>
      <td class="num t-sd">${angka(r.sd, 2)}</td><td class="num t-sisa ${r.sisa < 0 ? 'text-danger' : ''}">${angka(r.sisa, 2)}</td>
      <td class="num">${angka(r.harga)}</td><td class="num t-jml">${angka(r.jmlSaat)}</td></tr>`;
  }).join('');
  pratinjauNomorT();
  hitungT();
}

function ubahVolT(uid, val) {
  if (val === '') delete formT.vol[uid]; else formT.vol[uid] = Number(val);
  const k = kontrakById(formT.kontrakId);
  const h = hitung(k, { ...formT, ke: parseInt($('#tKe').value, 10) || formT.ke });
  const r = h.rows.find(x => x.uid === uid);
  const tr = $(`#tItems tr[data-uid="${uid}"]`);
  tr.querySelector('.t-sd').textContent = angka(r.sd, 2);
  const sisa = tr.querySelector('.t-sisa');
  sisa.textContent = angka(r.sisa, 2);
  sisa.classList.toggle('text-danger', r.sisa < 0);
  tr.querySelector('.t-jml').textContent = angka(r.jmlSaat);
  hitungT();
}

function isiSisaT() {
  const k = kontrakById(formT.kontrakId);
  const h = hitung(k, { ...formT, vol: {}, ke: parseInt($('#tKe').value, 10) || formT.ke });
  h.items.forEach(r => { if (r.sisa > 0) formT.vol[r.uid] = Math.round(r.sisa * 1000) / 1000; });
  renderItemT();
}

function hitungT() {
  const k = kontrakById(formT.kontrakId);
  formT.retPct = (Number($('#tRet')?.value) || 0) / 100;
  formT.umPct = (Number($('#tUm')?.value) || 0) / 100;
  formT.potLain = Number($('#tPot')?.value) || 0;
  const h = hitung(k, { ...formT, ke: parseInt($('#tKe').value, 10) || formT.ke });
  $('#tTotals').innerHTML = `
    <div><span>Prestasi s.d. saat ini</span><strong>${persen(h.pSd)} · ${formatIdp(h.bap.sd)}</strong></div>
    <div><span>Prestasi saat ini</span><strong>${persen(h.pSaat)} · ${formatIdp(h.bap.saat)}</strong></div>
    <div><span>Potongan retensi + uang muka${h.potLain ? ' + lain' : ''}</span><strong>${formatIdp(h.retensi.saat + h.uangMuka.saat + h.potLain)}</strong></div>
    <div><span>PPN</span><strong>${formatIdp(h.ppn)}</strong></div>
    <div class="grand"><span>Total dibayar (BAP)</span><strong>${formatIdp(h.total)}</strong></div>`;
}

async function simpanTermin(e) {
  e.preventDefault();
  const k = kontrakById(formT.kontrakId);
  formT.ke = parseInt($('#tKe').value, 10) || 0;
  formT.tanggal = $('#tTanggal').value;
  formT.status = $('#tStatus').value;
  formT.periode = $('#tPeriode')?.value.trim() || '';
  formT.potLainKet = $('#tPotKet')?.value.trim() || '';
  hitungT();
  const err = [];
  if (formT.ke < 1) err.push('Termin ke- minimal 1.');
  if (terminKontrak(k.id).some(t => t.id !== formT.id && t.ke === formT.ke)) err.push(`Termin ${formT.ke} untuk kontrak ini sudah ada.`);
  if (!formT.tanggal) err.push('Tanggal berita acara wajib diisi.');
  else if (k.tanggal && formT.tanggal < k.tanggal) err.push('Tanggal berita acara tidak boleh sebelum tanggal kontrak.');
  const h = hitung(k, formT);
  if (!h.items.some(r => r.saat > 0)) err.push('Isi minimal 1 volume saat ini.');
  h.items.forEach(r => {
    if (r.saat < 0) err.push(`"${r.uraian}": volume tidak boleh negatif.`);
    if (r.sisa < -1e-9) err.push(`"${r.uraian}": volume s.d. saat ini (${angka(r.sd, 2)}) melebihi volume kontrak (${angka(r.vol, 2)}).`);
  });
  if (err.length) { $('#tErr').innerHTML = err.map(escapeHtml).join('<br>'); return; }
  Object.keys(formT.vol).forEach(u => { if (!formT.vol[u]) delete formT.vol[u]; });
  formT.updatedAt = Date.now();
  formT.createdAt ||= Date.now();
  await dbSimpan('termin', formT);
  await muatModul();
  tutupForm();
  rute();
  showToast(`Termin ${formT.ke} tersimpan.`);
}

async function hapusTermin(id) {
  if (!cekBisa('hapus')) return;
  const t = daftarTermin.find(x => x.id === id);
  const k = kontrakById(t.kontrakId);
  const berikut = terminKontrak(k.id, t.jenis || 'termin').filter(x => x.ke > t.ke);
  if (!confirm(`Hapus ${t.jenis === 'bapr' ? 'BAPR' : 'termin ' + t.ke} kontrak ${k.nomor}?${berikut.length ? `\nPerhatian: ${berikut.length} termin sesudahnya akan menghitung ulang progres "lalu".` : ''}`)) return;
  await dbHapus('termin', id);
  await muatModul();
  rute();
}

// ===== Form BAPR =====
function formBapr(kid, bid) {
  if (!cekBisa('ubah')) return;
  const ada = bid ? daftarTermin.find(t => t.id === bid) : null;
  const sub = location.hash.split('/')[1];
  const menu = ada ? kontrakById(ada.kontrakId).menu : (sub === 'alat' ? 'alat' : 'subkon');
  const ks = daftarKontrak.filter(k => k.menu === menu);
  if (!ks.length) { showToast('Belum ada kontrak.', 'error'); return; }
  const kId = ada?.kontrakId || kid || ks[0].id;
  const b = ada ? { ...ada } : { id: genId('r'), jenis: 'bapr', kontrakId: kId, ke: terminKontrak(kId, 'bapr').length + 1, tanggal: todayStr(), dibayarLalu: 0, status: 'Draft' };
  formT = b;
  $('#formTitle').textContent = (ada ? 'Edit' : 'Buat') + ' BAPR — Berita Acara Pembayaran Retensi';
  $('#formBody').innerHTML = `
    <form onsubmit="simpanBapr(event)" novalidate>
      <div class="panel">
        <div class="form-group"><label for="rKontrak">Kontrak *</label><select id="rKontrak" ${ada ? 'disabled' : ''}>${opsiKontrak(menu, kId)}</select></div>
        <div class="form-row">
          ${inp('rKe', 'BAPR ke-', b.ke, { type: 'number', wajib: true, attr: 'min="1"' })}
          ${inp('rTanggal', 'Tanggal BAPR', b.tanggal, { type: 'date', wajib: true })}
          <div class="form-group"><label for="rStatus">Status</label><select id="rStatus">${STATUS_DOK.map(s => `<option ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          ${inp('rBast', 'Nomor BAST Pertama', b.nomorBast, { help: 'Kosong = 01/BAST/{nomor kontrak}' })}
          ${inp('rTglBast', 'Tanggal BAST Pertama', b.tanggalBast, { type: 'date', wajib: true })}
          ${inp('rLalu', 'Retensi sudah dibayar sebelumnya (Rp)', b.dibayarLalu || '', { type: 'number', attr: 'min="0"' })}
        </div>
        <p class="muted">Rincian retensi diambil otomatis dari seluruh termin (BAP) kontrak ini × retensi kontrak.</p>
      </div>
      <p class="text-danger" id="rErr"></p>
      <div class="modal-actions">
        <button type="button" class="btn" onclick="tutupForm()">Batal</button>
        <button type="submit" class="btn btn-primary">💾 Simpan</button>
      </div>
    </form>`;
  openOverlay('#formOverlay');
}

async function simpanBapr(e) {
  e.preventDefault();
  const b = formT;
  b.kontrakId = $('#rKontrak').value;
  b.ke = parseInt($('#rKe').value, 10) || 0;
  b.tanggal = $('#rTanggal').value;
  b.status = $('#rStatus').value;
  b.nomorBast = $('#rBast').value.trim();
  b.tanggalBast = $('#rTglBast').value;
  b.dibayarLalu = Number($('#rLalu').value) || 0;
  const k = kontrakById(b.kontrakId);
  const err = [];
  if (b.ke < 1) err.push('BAPR ke- minimal 1.');
  if (!b.tanggal || !b.tanggalBast) err.push('Tanggal BAPR dan tanggal BAST wajib diisi.');
  else if (b.tanggal < b.tanggalBast) err.push('Tanggal BAPR tidak boleh sebelum BAST.');
  if (!terminKontrak(k.id).length) err.push('Kontrak ini belum memiliki BAP/termin.');
  if (!(Number(k.retensi) > 0)) err.push('Retensi kontrak 0% — tidak ada retensi untuk dibayarkan.');
  if (b.dibayarLalu > hitungBapr(k, b).hutang) err.push('Retensi dibayar sebelumnya melebihi total retensi.');
  if (err.length) { $('#rErr').innerHTML = err.map(escapeHtml).join('<br>'); return; }
  b.updatedAt = Date.now();
  b.createdAt ||= Date.now();
  await dbSimpan('termin', b);
  await muatModul();
  tutupForm();
  rute();
  showToast('BAPR tersimpan.');
}

// ===== Pengaturan =====
function renderPengaturan() {
  const s = S();
  const f = (id, label, opsi = {}) => inp('set_' + id, label, s[id], opsi);
  $('#view-pengaturan').innerHTML = `
    <div class="page-head"><div><h1 class="page-title">⚙️ Pengaturan</h1>
      <p class="page-desc">Data proyek, penanda tangan, logo, penomoran, dan peran. Dipakai di semua cetakan.</p></div></div>
    <form onsubmit="simpanPengaturan(event)">
      <div class="panel"><h3 class="panel-title">🏗️ Proyek & KSO</h3>
        ${f('proyek', 'Nama Proyek / Pekerjaan', { wajib: true })}
        <div class="form-row">${f('namaKso', 'Nama KSO', { wajib: true })}${f('divisi', 'Divisi')}</div>
        ${f('alamatKso', 'Alamat KSO')}
        <div class="form-row">${f('npwpKso', 'NPWP KSO')}${f('kota', 'Kota Tanda Tangan')}${f('kontak', 'Kontak Korespondensi (SPM)')}</div>
      </div>
      <div class="panel"><h3 class="panel-title">🔢 Penomoran</h3>
        <div class="form-row">${f('kodeProyek', 'Kode Proyek', { wajib: true })}${f('kodeKsoBahan', 'Kode KSO (Bahan)', { help: 'mis. WK-NK.KSO/PDBJ' })}${f('kodeKsoLain', 'Kode KSO (Alat & Subkon)', { help: 'mis. WSKT-NK KSO' })}</div>
        <p class="muted">Contoh: 02/SPM/${escapeHtml(s.kodeKsoBahan)}/${escapeHtml(s.kodeProyek)}/2026 · 09/SPSA/${escapeHtml(s.kodeKsoLain)}/${escapeHtml(s.kodeProyek)}/2026 · 01/BAPM/{nomor kontrak}</p>
        <div class="form-group"><label for="set_sepRibu">Format angka di cetakan</label>
          <select id="set_sepRibu"><option value="." ${s.sepRibu !== ',' ? 'selected' : ''}>1.234.567,89 (Indonesia)</option><option value="," ${s.sepRibu === ',' ? 'selected' : ''}>1,234,567.89 (Inggris)</option></select></div>
      </div>
      <div class="panel"><h3 class="panel-title">✍️ Penanda Tangan</h3>
        <div class="form-row">${f('pp1Nama', 'Pihak Pertama — Nama')}${f('pp1Jabatan', 'Jabatan')}</div>
        <div class="form-row">${f('kuasaNama', 'Kuasa KSO — Nama')}${f('kuasaJabatan', 'Jabatan')}${f('batasKuasa', 'Batas Nilai Wajib Kuasa KSO (Rp)', { type: 'number' })}</div>
        <div class="form-row">${f('penerimaNama', 'Penerima Material / Pengaju — Nama')}${f('penerimaJabatan', 'Jabatan')}</div>
        <div class="form-row">${f('pemeriksaNama', 'Pemeriksa (Rincian) — Nama')}${f('pemeriksaJabatan', 'Jabatan')}</div>
        <div class="form-row">${f('ttdPerusahaan', 'Perusahaan pada TTD Rincian')}${f('ttdDivisi', 'Divisi pada TTD Rincian')}</div>
        <div class="form-row">${f('mengetahuiNama', 'Disetujui / Mengetahui (Divisi) — Nama')}${f('mengetahuiJabatan', 'Jabatan')}</div>
      </div>
      <div class="panel"><h3 class="panel-title">🖼️ Logo Kop (opsional)</h3>
        <div class="logo-setting">
          <div class="logo-slot logo-demo">${s.logo ? `<img src="${s.logo}" alt="logo">` : '<span>Logo<br><small>38 × 14 mm</small></span>'}</div>
          <div>
            <input type="file" id="setLogo" accept="image/png,image/jpeg,image/svg+xml" onchange="pilihLogo(this)">
            <p class="muted">Tampil di kiri atas semua cetakan dengan ukuran & posisi sama (38 × 14 mm). Kosong = tidak tercetak.</p>
            ${s.logo ? '<button type="button" class="btn btn-sm btn-danger-ghost" onclick="hapusLogo()">Hapus logo</button>' : ''}
          </div>
        </div>
      </div>
      <div class="panel"><h3 class="panel-title">🔐 Peran & PIN</h3>
        <p class="muted">Kosongkan semua PIN = semua akses terbuka. Bila diisi, pengguna memilih peran & PIN saat membuka aplikasi.
        Admin: semua akses · User Proyek: tambah, edit, cetak · Viewer: lihat & cetak.<br>Catatan: PIN membatasi tombol di perangkat ini, bukan pengamanan server.</p>
        <div class="form-row">
          ${inp('pinAdmin', 'PIN Admin', s.pin?.admin, { type: 'password', attr: 'autocomplete="new-password" minlength="4"' })}
          ${inp('pinUser', 'PIN User Proyek', s.pin?.user, { type: 'password', attr: 'autocomplete="new-password"' })}
          ${inp('pinViewer', 'PIN Viewer (boleh kosong)', s.pin?.viewer, { type: 'password', attr: 'autocomplete="new-password"' })}
        </div>
      </div>
      <div class="panel"><h3 class="panel-title">🧪 Data Contoh</h3>
        <p class="muted">Tambahkan 1 kontrak contoh per menu (SPM, SPSA, SPPP) beserta termin & BAPR untuk mencoba cetakan. Bisa dihapus kapan saja.</p>
        <button type="button" class="btn" onclick="isiContoh()">Tambahkan data contoh</button>
      </div>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">💾 Simpan Pengaturan</button></div>
    </form>`;
}

async function pilihLogo(input) {
  const f = input.files[0];
  if (!f) return;
  if (f.size > 1024 * 1024) { showToast('Ukuran logo maks. 1 MB.', 'error'); return; }
  settings.logo = await readFileAsDataURL(f);
  await dbPutSettings(settings);
  renderPengaturan();
  showToast('Logo tersimpan.');
}

async function hapusLogo() {
  settings.logo = '';
  await dbPutSettings(settings);
  renderPengaturan();
}

async function simpanPengaturan(e) {
  e.preventDefault();
  const s = settings;
  Object.keys(PROYEK_DEFAULT).forEach(key => {
    const el = $('#set_' + key);
    if (!el || key === 'logo' || key === 'pin') return;
    s[key] = key === 'batasKuasa' ? Number(el.value) || 0 : el.value.trim();
  });
  const pin = { admin: $('#pinAdmin').value, user: $('#pinUser').value, viewer: $('#pinViewer').value };
  if ((pin.user || pin.viewer) && !pin.admin) { showToast('Isi PIN Admin terlebih dahulu.', 'error'); return; }
  if (pin.admin && pin.admin.length < 4) { showToast('PIN Admin minimal 4 karakter.', 'error'); return; }
  s.pin = pin;
  s.project = s.proyek;
  await dbPutSettings(s);
  applySettingsUI();
  showToast('Pengaturan tersimpan.');
  rute();
}

// ===== Data contoh =====
async function isiContoh() {
  const thn = todayStr().slice(0, 4);
  const tgl = (m, d) => `${thn}-${pad(m)}-${pad(d)}`;
  const vendor = (nama, dir) => ({ nama, direktur: dir, jabatan: 'Direktur', alamat: 'Jl. Contoh Raya No. 1, Jakarta', npwp: '01.234.567.8-901.000', bank: 'Bank Contoh', rekening: '123-456-789', namaRek: nama });
  const uid = () => genId('i');
  const spm = {
    id: genId('k'), menu: 'bahan', jenis: 'SPM', noUrut: urutBerikut('SPM', thn), tanggal: tgl(1, 6), tglMulai: tgl(1, 6), tglAkhir: tgl(3, 31),
    pekerjaan: 'Pengadaan Material Besi & Beton', vendor: vendor('PT Contoh Material Jaya', 'BUDI CONTOH'), ppn: 0.11, tempo: 60, uangMuka: 0, retensi: 0,
    franco: 'Proyek Pekerjaan ' + S().proyek, keberterimaan: 'Material On Site Lokasi Proyek, kondisi baik, sesuai spesifikasi proyek dan disetujui konsultan/pengawas serta pemilik proyek.',
    items: [
      { uid: uid(), tipe: 'item', uraian: 'Besi Beton Ulir D16', satuan: 'KG', volume: 12000, harga: 14500 },
      { uid: uid(), tipe: 'item', uraian: 'Beton Ready Mix K-350', satuan: 'M3', volume: 250, harga: 1150000 },
      { uid: uid(), tipe: 'item', uraian: 'Kawat Bendrat', satuan: 'KG', volume: 300, harga: 25000 },
    ], status: 'Diproses', isian: {}, addendum: {},
  };
  const spsa = {
    id: genId('k'), menu: 'alat', jenis: 'SPSA', noUrut: urutBerikut('SPSA', thn), tanggal: tgl(1, 10), tglMulai: tgl(1, 10), tglAkhir: tgl(7, 10),
    pekerjaan: 'Sewa Crawler Crane 80 Ton', vendor: vendor('PT Contoh Alat Berat', 'SITI CONTOH'), ppn: 0.11, tempo: 30, uangMuka: 0, retensi: 0.05,
    items: [
      { uid: uid(), tipe: 'judul', kode: 'I', uraian: 'Sewa Alat Berat' },
      { uid: uid(), tipe: 'item', uraian: 'Crawler Crane 80 Ton (incl. operator)', satuan: 'Bulan', volume: 6, harga: 185000000 },
      { uid: uid(), tipe: 'item', uraian: 'Mobilisasi & Demobilisasi', satuan: 'Ls', volume: 1, harga: 45000000 },
    ], status: 'Diproses', isian: {}, addendum: {},
  };
  const sppp = {
    id: genId('k'), menu: 'subkon', jenis: 'SPPP', noUrut: urutBerikut('SPPP', thn), tanggal: tgl(1, 15), tglMulai: tgl(1, 15), tglAkhir: tgl(12, 15),
    pekerjaan: 'Pekerjaan Pembongkaran Dermaga', vendor: vendor('CV Contoh Konstruksi', 'ANDI CONTOH'), ppn: 0.11, tempo: 60, uangMuka: 0.1, retensi: 0.05,
    items: [
      { uid: uid(), tipe: 'kelompok', uraian: 'Pekerjaan Pembongkaran Dermaga' },
      { uid: uid(), tipe: 'judul', kode: 'A', uraian: 'PEKERJAAN MILESTONE PHASE 2' },
      { uid: uid(), tipe: 'subjudul', uraian: 'Pekerjaan Bongkaran Dermaga Existing Phase 2' },
      { uid: uid(), tipe: 'item', uraian: 'Pembongkaran Pile Cap Existing (Include pembuangan keluar lokasi)', satuan: 'm3', volume: 780, harga: 280000 },
      { uid: uid(), tipe: 'item', uraian: 'Pembongkaran Balok Existing (Include pembuangan keluar lokasi)', satuan: 'm3', volume: 2600, harga: 280000 },
      { uid: uid(), tipe: 'item', uraian: 'Pembongkaran Batuan (Include pembuangan keluar lokasi)', satuan: "m'", volume: 0, harga: 0, hargaKet: 'include' },
      { uid: uid(), tipe: 'kosong' },
      { uid: uid(), tipe: 'judul', kode: 'B', uraian: 'PEKERJAAN MILESTONE PHASE 3' },
      { uid: uid(), tipe: 'item', uraian: 'Pembongkaran Fender Existing (Include pembuangan keluar lokasi)', satuan: 'unit', volume: 50, harga: 925000 },
    ], status: 'Diproses', isian: {}, addendum: {},
  };
  [spm, spsa, sppp].forEach(k => { k.nomor = nomorKontrak(k); k.createdAt = k.updatedAt = Date.now(); });
  const it = (k, i) => k.items.filter(x => x.tipe === 'item')[i].uid;
  const termin = (k, ke, tanggal, vol, extra = {}) => ({
    id: genId('t'), jenis: 'termin', kontrakId: k.id, ke, tanggal, vol, retPct: k.retensi, umPct: k.uangMuka, potLain: 0, status: 'Draft',
    createdAt: Date.now(), updatedAt: Date.now(), ...extra,
  });
  const tr = [
    termin(spm, 1, tgl(2, 2), { [it(spm, 0)]: 5000, [it(spm, 1)]: 100 }),
    termin(spm, 2, tgl(3, 2), { [it(spm, 0)]: 4000, [it(spm, 1)]: 80, [it(spm, 2)]: 300 }),
    termin(spsa, 1, tgl(2, 10), { [it(spsa, 0)]: 1, [it(spsa, 1)]: 1 }, { periode: 'Periode (10 Januari - 10 Februari)' }),
    termin(spsa, 2, tgl(3, 10), { [it(spsa, 0)]: 1 }, { periode: 'Periode (10 Februari - 10 Maret)' }),
    termin(sppp, 1, tgl(3, 8), { [it(sppp, 0)]: 200, [it(sppp, 1)]: 500 }),
    termin(sppp, 2, tgl(4, 8), { [it(sppp, 0)]: 300, [it(sppp, 1)]: 900, [it(sppp, 3)]: 20 }),
  ];
  const bapr = { id: genId('r'), jenis: 'bapr', kontrakId: sppp.id, ke: 1, tanggal: tgl(12, 20), tanggalBast: tgl(12, 16), dibayarLalu: 0, status: 'Draft', createdAt: Date.now(), updatedAt: Date.now() };
  for (const k of [spm, spsa, sppp]) await dbSimpan('kontrak', k);
  for (const t of [...tr, bapr]) await dbSimpan('termin', t);
  await muatModul();
  showToast('Data contoh ditambahkan (SPM, SPSA, SPPP).');
  bukaRute('#/dashboard');
}

// Pratinjau dokumen arsip memakai pengaturan halaman bawaan
const _openPreviewAsli = openPreview;
openPreview = function (id) {
  if (pageStyleEl) pageStyleEl.textContent = '';
  return _openPreviewAsli(id);
};

// ===== Integrasi dengan auto-saran vendor di form kontrak =====
const _acPickAsli = typeof acPick === 'function' ? acPick : null;
acPick = function (it) {
  const input = ac.input;
  if (input && input.id === 'vNama') {
    acClose();
    input.value = it.name;
    $('#vAlamat').value = vendorAddress(it);
    $('#vNpwp').value = it.npwp || '';
    if (it.block === 'X') showToast('Perhatian: vendor ini berstatus DIBLOKIR (Block MM) di master.', 'error');
    return;
  }
  if (input && input.closest('.k-items')) {
    const tr = input.closest('tr');
    const i = Number(tr.dataset.i);
    acClose();
    Object.assign(formK.items[i], { uraian: it.name, kodeItem: it.code || '', satuan: it.unit || formK.items[i].satuan });
    if (!Number(formK.items[i].harga) && it.price) formK.items[i].harga = Number(it.price);
    renderBarisK();
    $(`#kItems tr[data-i="${i}"] .it-qty`)?.focus();
    return;
  }
  return _acPickAsli(it);
};

const _acSourcesAsli = acSources;
acSources = function (kind) {
  if (kind === 'item' && formK && $('#formOverlay').style.display === 'flex') {
    return formK.menu === 'subkon' ? [masterData.services, masterData.materials] : [masterData.materials, masterData.services];
  }
  return _acSourcesAsli(kind);
};

// ===== Inisialisasi =====
(window.__appBoot || Promise.resolve()).then(async () => {
  settings = { ...PROYEK_DEFAULT, ...settings, pin: { ...PROYEK_DEFAULT.pin, ...(settings.pin || {}) } };
  if (!settings.proyek && settings.project) settings.proyek = settings.project;
  try { await muatModul(); } catch (err) { console.error(err); }
  let simpan = null;
  try { simpan = sessionStorage.getItem('jict_peran'); } catch { /* */ }
  if (!adaPin()) aturPeran('admin');
  else if (simpan) aturPeran(simpan);
  else { aturPeran('viewer'); openLogin(); }
  window.addEventListener('hashchange', rute);
  rute();
});
