
/* MP230 — PEMBARUAN 2.3.0 / 2.4.0 — VERIFIKASI TAGIHAN (AI Auditor) di menu Keuangan & Bayar (2.4.0 butuh Modul server 1.7.0)
 *  [2.4.0] Tab Verifikasi AI › Bundel PDF & Pratinjau: dropzone 1 PDF scan utuh → AI memisahkan & mengklasifikasi per halaman → pratinjau dua panel
 *          (kiri PDF melompat ke halaman dokumen; kanan peta dokumen, pemetaan checklist, kelengkapan 6 dokumen wajib, rekonsiliasi nilai/PPN/rekening,
 *          meterai & tanda tangan) → Terapkan ke checklist & verifikasi → Lembar rekonsiliasi (A4). Gerbang 'kunci': Kritis/Mayor mengunci Verifikasi Admin & bayar.
 *  [2.4.2] Bundel s.d. 60 MB: > 10 MB dipecah per halaman (pdf-lib, tanpa kompres) menjadi bagian ≤ 9,5 MB; tiap bagian dibaca AI terpisah; pratinjau lintas bagian. Butuh Modul server 1.7.1.
 *  1. Tab "Verifikasi Dokumen": KPI belum/lolos/butuh revisi/kedaluwarsa, tabel hasil, verifikasi massal tagihan yang lengkap.
 *  2. Daftar Tagihan: lencana hasil verifikasi + tombol "Verifikasi" per baris.
 *  3. Modal Checklist: tab "Verifikasi AI" — langkah baca PDF per dokumen (cache), mesin aturan server, laporan 3 bagian
 *     (Tabel Status · Daftar Ketidaksesuaian · Keputusan), rekap nilai & rekening, riwayat.
 *  4. Keluaran: salin, unduh .md, cetak BA Hasil Verifikasi, cetak Surat Permintaan Perbaikan Dokumen ke vendor, kirim ke Asisten AI.
 *  5. Verifikasi Admin: kotak gerbang hasil AI (peringatan / wajib + alasan pengecualian ≥ 20 karakter, tercatat di Log).
 *  6. Otomatis: checklist menjadi lengkap → verifikasi berjalan di latar (Setelan Admin).
 *  Prinsip: AI hanya membaca dokumen; keputusan LOLOS/BUTUH REVISI dari aturan deterministik server; pembayaran tetap diputuskan Admin. */
(function () {
  'use strict';
  if (window.__MP230__) return; window.__MP230__ = true;
  const VERSI = '2.4.2';
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const rp = v => v === null || v === undefined || v === '' ? '—' : 'Rp ' + Math.round(N(v)).toLocaleString('id-ID');
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const adm = () => !!(sesi() && sesi().admin);
  const pid = () => (typeof PROYEK !== 'undefined' && PROYEK.id) || '';
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const aktif = () => !!(sesi() && typeof REG !== 'undefined' && REG.url && srv('verifikasiTagihan'));
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tgl = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? Number(m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : '-'; };
  const tglJam = s => { const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const tglPanjang = d => d.getDate() + ' ' + BLN_P[d.getMonth()] + ' ' + d.getFullYear();
  const F = () => window.MP219_KEU || {};
  const prog = id => ((typeof PROG !== 'undefined' && PROG.data) || []).find(x => x.id === id) || {};
  const vendorDari = p => { try { return barisBK(p).vendor || ''; } catch (e) { return ''; } };
  const TK = { KRITIS: ['Kritis', '#C0262D', 'fa-circle-exclamation'], MAYOR: ['Mayor', '#D9480F', 'fa-triangle-exclamation'], MINOR: ['Minor', '#9A6B00', 'fa-circle-info'], CATATAN: ['Catatan', '#5B6B82', 'fa-note-sticky'] };
  const STD = { 'Lolos': '#2E9E5B', 'Tidak Sesuai': '#C0262D', 'Kurang': '#D9480F', 'N/A': '#6B7A90' };
  const VT = { info: null, ringkas: {}, siap: false, muat: false, kunci: '', lap: {}, riwayat: {}, jalan: {}, antri: [], massal: false, clMinta: '', clAktif: false, filter: '', obsKeu: null, obsCl: null };
  window.MP230_VT = VT;
  const gerbangKini = () => (VT.info && VT.info.setelan && VT.info.setelan.gerbang) || 'kunci';
  const NAMA_GB = { kunci: 'Kunci', wajib: 'Wajib', peringatan: 'Peringatan' };
  const berat = id => { const v = VT.ringkas[id]; return !!(v && v.ringkas && (N(v.ringkas.kritis) + N(v.ringkas.mayor)) > 0); };
  const terkunci = id => gerbangKini() === 'kunci' && berat(id);   // server menolak Verifikasi Admin & pengajuan bayar (modul 1.7.0)
  const chipKunci = id => terkunci(id) ? '<span class="mp230-n mp240-kc" style="--p:#C0262D" title="Gerbang kunci: temuan Kritis/Mayor harus diselesaikan"><i class="fas fa-lock me-1"></i>bayar terkunci</span>' : '';

  /* ---------- data server ---------- */
  function cekKunci() { const k = pid() + '|' + ((sesi() || {}).nama || '') + '|' + ((typeof REG !== 'undefined' && REG.url) || ''); if (VT.kunci !== k) { VT.kunci = k; VT.info = null; VT.ringkas = {}; VT.siap = false; VT.lap = {}; VT.riwayat = {}; } }
  async function muat(paksa) {
    cekKunci(); if (!aktif() || VT.muat || (VT.siap && !paksa)) return;
    VT.muat = true;
    try {
      const [i, r] = await Promise.all([regAksi('vtInfo'), regAksi('vtRingkas')]);
      VT.info = i; VT.ringkas = {}; (r.data || []).forEach(x => { VT.ringkas[x.id] = x; }); VT.siap = true; VT.galat = '';
    } catch (err) { VT.galat = err.message; console.warn('[2.4.0] verifikasi tagihan', err); }
    finally { VT.muat = false; segarKeu(); segarCl(); }
  }
  async function muatLap(id, paksa) {
    if (!paksa && VT.lap[id] !== undefined) return VT.lap[id];
    const r = await regAksi('vtBaca', { data: { id } });
    VT.lap[id] = r.data || null; VT.riwayat[id] = r.riwayat || [];
    if (r.data) VT.ringkas[id] = Object.assign({}, VT.ringkas[id] || {}, { id, keputusan: r.data.keputusan, ringkas: r.data.ringkas, pada: r.data.pada, oleh: r.data.oleh, kedaluwarsa: !!r.kedaluwarsa, teratas: (r.data.temuan || []).filter(t => t.tingkat !== 'CATATAN').slice(0, 3).map(t => t.tingkat + ': ' + t.judul) });
    return VT.lap[id];
  }
  const bolehLihat = () => aktif() && (adm() || !!(VT.info && VT.info.boleh));
  const bolehJalan = () => aktif() && !!(VT.info && VT.info.bolehJalan);

  /* ---------- status ringkas per tagihan ---------- */
  function statusVt(id, row) {
    const j = VT.jalan[id]; if (j && j.fase !== 'selesai' && j.fase !== 'gagal') return 'PROSES';
    const r = VT.ringkas[id]; if (r) return r.kedaluwarsa ? 'KEDALUWARSA' : r.keputusan === 'LOLOS' ? 'LOLOS' : 'REVISI';
    if (row && row.cl && row.cl.total && row.cl.lengkap >= row.cl.total) return 'BELUM';
    return 'TIDAK_LENGKAP';
  }
  const SV = { LOLOS: ['Lolos', '#2E9E5B', 'fa-circle-check'], REVISI: ['Butuh Revisi', '#C0262D', 'fa-circle-xmark'], KEDALUWARSA: ['Kedaluwarsa', '#9A6B00', 'fa-clock-rotate-left'], BELUM: ['Belum diverifikasi', '#1763B3', 'fa-hourglass-start'], PROSES: ['Memproses…', '#5B4BC4', 'fa-spinner fa-spin'], TIDAK_LENGKAP: ['Dokumen belum lengkap', '#6B7A90', 'fa-folder-open'] };
  const lencana = (s, kecil) => `<span class="mp230-bd${kecil ? ' k' : ''}" style="--p:${SV[s][1]}"><i class="fas ${SV[s][2]}"></i>${SV[s][0]}</span>`;
  const hitungTemuan = r => r && r.ringkas ? ['kritis', 'mayor', 'minor'].filter(k => r.ringkas[k]).map(k => `<span class="mp230-n" style="--p:${TK[k.toUpperCase()][1]}" title="${TK[k.toUpperCase()][0]}">${r.ringkas[k]} ${TK[k.toUpperCase()][0].toLowerCase()}</span>`).join('') : '';

  /* ======================= 1. MENU KEUANGAN & BAYAR ======================= */
  function segarKeu() { const el = document.getElementById('keuIsi'); if (el && el.querySelector('.mp219-keu')) { pasangKeu(); segarDash(); } }
  function pasangKeu() {
    const el = document.getElementById('keuIsi'); if (!el) return;
    const akar = el.querySelector('.mp219-keu'); if (!akar) return;
    cekKunci();
    if (!aktif()) { if (F().tab === 'verifikasi') window.mp219Keu({ tab: 'daftar' }); return; }
    if (!VT.siap && !VT.muat && !VT.galat) setTimeout(() => muat(), 0);
    if (!bolehLihat()) return;
    const nav = akar.querySelector(':scope > .mp219-tabs');
    if (nav) {
      const rows = F()._rows || [], perlu = rows.filter(r => ['BELUM', 'REVISI', 'KEDALUWARSA'].includes(statusVt(r.e.id, r))).length, b = nav.querySelector('[data-vt]');
      const html = `<i class="fas fa-file-shield me-1"></i>Verifikasi Dokumen${perlu ? `<span class="mp230-tn" title="perlu tindakan">${perlu}</span>` : ''}`;
      if (b) b.innerHTML = html;
      else nav.insertAdjacentHTML('beforeend', `<button type="button" role="tab" data-vt="1" aria-selected="${F().tab === 'verifikasi'}" class="${F().tab === 'verifikasi' ? 'on' : ''}" onclick="mp219Keu({tab:'verifikasi',status:''})">${html}</button>`);
    }
    if (F().tab === 'verifikasi') {
      const isi = akar.lastElementChild; if (isi && !isi.classList.contains('mp230-dash')) { const d = document.createElement('div'); d.className = 'mp230-dash'; d.innerHTML = dasbor(); isi.replaceWith(d); }
    } else if (F().tab === 'daftar') {
      const rows = F()._rows || [];
      akar.querySelectorAll('.mp219-tb tbody tr').forEach((tr, i) => {
        const r = rows[i]; if (!r || tr.querySelector('.mp230-bd')) return;
        const s = statusVt(r.e.id, r), st = tr.querySelector('td[data-l="Status"]'), ak = tr.querySelector('.mp219-aksi');
        if (st && s !== 'TIDAK_LENGKAP') st.insertAdjacentHTML('beforeend', `<div class="mp230-sel" title="Hasil Verifikasi Dokumen (AI)">${lencana(s, true)}${chipKunci(r.e.id)}</div>`);
        if (ak && s !== 'TIDAK_LENGKAP') ak.insertAdjacentHTML('beforeend', `<button type="button" class="v" onclick="mp230Buka('${E(r.e.id)}')" title="Verifikasi dokumen tagihan (AI auditor)"><i class="fas fa-file-shield"></i><span>Verifikasi</span></button>`);
      });
    }
  }
  function dasbor() {
    const rows = F()._rows || [], ada = rows.map(r => ({ r, s: statusVt(r.e.id, r) }));
    const n = s => ada.filter(x => x.s === s).length, info = VT.info || {}, set = info.setelan || {};
    const prov = (info.penyedia || []).find(p => p.id === set.provider) || (info.penyedia || [])[0];
    const daftar = ada.filter(x => x.s !== 'TIDAK_LENGKAP').filter(x => !VT.filter || x.s === VT.filter || (VT.filter === 'BELUM' && x.s === 'PROSES'));
    const antre = ada.filter(x => x.s === 'BELUM' || x.s === 'KEDALUWARSA').map(x => x.r.e.id);
    const chip = (v, l, k) => `<button type="button" class="mp219-chip ${VT.filter === v ? 'on' : ''}" onclick="mp230Filter('${v}')">${l}<span>${k}</span></button>`;
    return `<div class="mp219-card mp230-kepala"><div class="mp230-kp-t"><span class="mp230-ik"><i class="fas fa-file-shield"></i></span><div><h5>Verifikasi Dokumen Tagihan <small>AI Auditor</small></h5>
        <p>AI membaca setiap PDF checklist; mesin aturan server memeriksa silang kelengkapan, nilai (Invoice = Kwitansi = BAP, PPN = Faktur), perpajakan, legalitas, rekening, dan rincian barang/surat jalan. Hasil bersifat <b>alat bantu verifikator</b> — keputusan Siap Bayar tetap melalui Verifikasi Admin dan pemeriksaan dokumen Asli.</p>
        <div class="mp230-meta"><span><i class="fas fa-microchip"></i>${prov ? E(prov.nama) + ' · ' + E(prov.model) : '<b class="text-danger">Belum ada penyedia AI pembaca PDF</b>'}</span><span><i class="fas fa-shield-halved"></i>Gerbang: <b>${NAMA_GB[set.gerbang] || 'Kunci'}</b></span><span><i class="fas fa-bolt"></i>Otomatis: <b>${set.otomatis === false ? 'Mati' : 'Aktif'}</b></span></div></div></div>
      <div class="mp230-kp-a">${bolehJalan() ? `<button type="button" class="btn mp219-btn-p" onclick="mp230Massal()" ${antre.length && !VT.massal && prov ? '' : 'disabled'}><i class="fas fa-list-check"></i><span>${VT.massal ? 'Memproses ' + (VT.massalKe || 0) + '/' + VT.massalN + '…' : 'Verifikasi semua yang lengkap (' + antre.length + ')'}</span></button>` : ''}
        <button type="button" class="btn mp219-btn-o" onclick="mp230Muat()"><i class="fas fa-rotate${VT.muat ? ' fa-spin' : ''}"></i><span>Muat ulang</span></button>
        ${adm() ? `<button type="button" class="btn mp219-btn-o" onclick="mp230Setelan()"><i class="fas fa-sliders"></i><span>Setelan</span></button>` : ''}</div></div>
      ${VT.galat ? `<div class="alert alert-danger mt-3 mb-0"><b>Gagal memuat hasil verifikasi:</b> ${E(VT.galat)}</div>` : ''}
      <div class="mp230-kpi">${[['BELUM', 'Belum diverifikasi', 'checklist lengkap, belum diperiksa'], ['LOLOS', 'Lolos', 'siap diteruskan ke Verifikasi Admin'], ['REVISI', 'Butuh Revisi', 'kembalikan ke vendor'], ['KEDALUWARSA', 'Kedaluwarsa', 'PDF diganti setelah diperiksa']]
        .map(k => `<button type="button" class="mp230-k ${VT.filter === k[0] ? 'on' : ''}" style="--w:${SV[k[0]][1]}" onclick="mp230Filter('${VT.filter === k[0] ? '' : k[0]}')"><span><i class="fas ${SV[k[0]][2].replace(' fa-spin', '')}"></i>${k[1]}</span><b>${n(k[0]) + (k[0] === 'BELUM' ? n('PROSES') : 0)}</b><small>${k[2]}</small></button>`).join('')}</div>
      <div class="mp219-card"><div class="mp219-fl"><div class="mp219-chips">${chip('', 'Semua', ada.filter(x => x.s !== 'TIDAK_LENGKAP').length)}${['BELUM', 'LOLOS', 'REVISI', 'KEDALUWARSA'].map(s => chip(s, SV[s][0], n(s))).join('')}</div>
        <span class="mp230-muted">${n('TIDAK_LENGKAP')} tagihan belum lengkap dokumennya tidak ditampilkan</span></div>
      <div class="mp219-tw"><table class="mp219-tb mp230-tb"><colgroup><col style="width:44px"><col style="width:17%"><col style="width:13%"><col style="width:6%"><col style="width:11%"><col style="width:13%"><col style="width:21%"><col style="width:11%"><col style="width:9%"></colgroup><thead><tr><th>No.</th><th>No. BK / Tagihan</th><th>Vendor</th><th>Jenis</th><th class="r">Nilai Tagihan</th><th>Hasil Verifikasi</th><th>Temuan utama</th><th>Diperiksa</th><th class="c">Aksi</th></tr></thead><tbody>
      ${daftar.length ? daftar.map((x, i) => { const r = x.r, v = VT.ringkas[r.e.id], j = VT.jalan[r.e.id];
        return `<tr><td data-l="No." class="c-no">${i + 1}</td>
          <td data-l="No. BK" class="mono" title="${E(r.e.nomorBA || '')}"><div class="b">${E(String(r.e.nomorBA || '-').split('/').slice(0, 4).join('/'))}</div><div class="sub">${E(r.e.noKontrak || '')}</div></td>
          <td data-l="Vendor">${E(r.b.vendor || '-')}</td><td data-l="Jenis" class="nw">${E(r.kode || '-')}</td><td data-l="Nilai" class="r nw">${rp(r.e.nilai)}</td>
          <td data-l="Hasil">${lencana(x.s)}<div class="mp230-ns">${x.s === 'PROSES' && j ? E(j.ket || '') : hitungTemuan(v) + chipKunci(r.e.id)}</div></td>
          <td data-l="Temuan utama" class="mp230-tu">${x.s === 'PROSES' ? '' : v ? (v.teratas || []).map(t => `<div>${E(t)}</div>`).join('') || '<span class="mp230-muted">Tidak ada ketidaksesuaian</span>' : j && j.fase === 'gagal' ? `<span class="text-danger">${E(j.galat || 'Gagal')}</span>` : '<span class="mp230-muted">—</span>'}</td>
          <td data-l="Diperiksa" class="nw">${v ? tglJam(v.pada) + `<div class="sub">${E(v.oleh || '')}</div>` : '-'}</td>
          <td data-l="Aksi" class="c nw"><div class="mp219-aksi"><button type="button" class="v" onclick="mp230Buka('${E(r.e.id)}')"><i class="fas ${v ? 'fa-file-lines' : 'fa-file-shield'}"></i><span>${v ? 'Laporan' : 'Verifikasi'}</span></button></div></td></tr>`; }).join('')
        : `<tr><td colspan="9" class="mp219-kosong">${VT.muat ? '<i class="fas fa-spinner fa-spin me-1"></i>Memuat…' : 'Tidak ada tagihan pada filter ini. Verifikasi tersedia setelah checklist dokumen lengkap.'}</td></tr>`}</tbody></table></div>
      <div class="mp219-ket"><span><i class="fas fa-circle-info"></i> Hasil baca PDF disimpan per versi berkas — verifikasi ulang tanpa biaya AI selama PDF tidak diganti. Mengganti PDF membuat hasil <b>kedaluwarsa</b>.</span><span>${daftar.length} tagihan</span></div></div>`;
  }
  window.mp230Filter = v => { VT.filter = v; segarDash(); };
  window.mp230Muat = () => { VT.siap = false; VT.galat = ''; VT.lap = {}; muat(true); };
  function segarDash() { const d = document.querySelector('#keuIsi .mp230-dash'); if (d) d.innerHTML = dasbor(); }

  /* ======================= 2. MODAL CHECKLIST — TAB "VERIFIKASI AI" ======================= */
  window.mp230Buka = id => { VT.clMinta = id; window.cl217Buka(id); };
  function pasangCl() {
    const f = F(), isi = document.getElementById('mp219ClIsi'); if (!isi || !f.rec || !f.rec.kategori) return;
    const nav = isi.querySelector('.mp219-tabs-s'); if (!nav) return;
    if (!aktif()) return; if (!VT.siap && !VT.muat && !VT.galat) muat();
    if (!bolehLihat()) return;
    let b = nav.querySelector('[data-vt]');
    if (!b) { nav.insertAdjacentHTML('beforeend', `<button type="button" data-vt="1" onclick="mp230ClTab()"><i class="fas fa-file-shield me-1"></i>Verifikasi AI</button>`); b = nav.querySelector('[data-vt]'); }
    const s = statusVt(f.rec.id, { cl: (() => { try { const h = window.MP219_HITUNG(f.rec); return { total: h.total, lengkap: h.lengkap }; } catch (e) { return {}; } })() });
    const ik = b.querySelector('.mp230-dot'); if (ik) ik.remove(); if (s !== 'TIDAK_LENGKAP') b.insertAdjacentHTML('beforeend', `<span class="mp230-dot" style="--p:${SV[s][1]}" title="${SV[s][0]}"></span>`);
    if (VT.clMinta && VT.clMinta === f.rec.id) { VT.clMinta = ''; VT.clAktif = true; }
    if (VT.clAktif) { nav.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); gambarCl(); }
  }
  window.mp230ClTab = () => { VT.clAktif = true; const isi = document.getElementById('mp219ClIsi'); if (isi) isi.querySelectorAll('.mp219-tabs-s button').forEach(x => x.classList.toggle('on', !!x.dataset.vt)); gambarCl(); };
  function segarCl() { if (VT.clAktif) gambarCl(); else { const isi = document.getElementById('mp219ClIsi'); if (isi && isi.querySelector('.mp219-tabs-s')) pasangCl(); } }
  function gambarCl() {
    const f = F(), el = document.getElementById('mp219ClPanel'); if (!el || !f.rec || !VT.clAktif) return;
    const id = f.rec.id, sub = subVt(id);
    if (srv('verifikasiBundel') && VT.bundel[id] === undefined) { el.innerHTML = '<div class="p-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Memuat…</div>'; muatBundel(id).then(() => gambarCl()); return; }
    if (sub === 'laporan' && VT.lap[id] === undefined && VT.ringkas[id] && !VT.jalan[id]) {
      el.innerHTML = '<div class="p-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Memuat laporan verifikasi…</div>';
      muatLap(id).then(() => gambarCl(), err => { el.innerHTML = `<div class="alert alert-danger m-3">Laporan tidak dapat dimuat: ${E(err.message)}</div>`; });
      return;
    }
    el.innerHTML = `<div class="mp230-pn">${panelVt(id)}</div>`;
    if (sub === 'bundel') pasangBundel(id);
  }
  const subVt = id => !srv('verifikasiBundel') ? 'laporan' : VT.sub[id] || (VT.ringkas[id] || VT.jalan[id] ? 'laporan' : 'bundel');
  function panelVt(id) {
    const f = F(), j = VT.jalan[id], lap = VT.lap[id], v = VT.ringkas[id];
    let h = { total: 0, lengkap: 0, kurang: [] }; try { h = window.MP219_HITUNG(f.rec); } catch (e) { }
    const tombolJalan = (teks, ikon) => bolehJalan() ? `<button type="button" class="btn btn-primary btn-sm" onclick="mp230Jalan('${E(id)}')" ${j && j.fase !== 'selesai' && j.fase !== 'gagal' ? 'disabled' : ''}><i class="fas ${ikon || 'fa-play'} me-1"></i>${teks}</button>` : '';
    const sub = subVt(id), nav = srv('verifikasiBundel') ? `<div class="mp240-sub" role="tablist">${[['bundel', 'Bundel PDF & Pratinjau'], ['laporan', 'Laporan Verifikasi']].map(t => `<button type="button" role="tab" aria-selected="${sub === t[0]}" class="${sub === t[0] ? 'on' : ''}" onclick="mp240Sub('${E(id)}','${t[0]}')">${t[1]}</button>`).join('')}</div>` : '';
    if (sub === 'bundel') return nav + viewBundel(id);
    if (f.dirty) return nav + `<div class="alert alert-warning m-3"><i class="fas fa-floppy-disk me-1"></i>Simpan perubahan checklist dahulu — verifikasi membaca PDF yang sudah tersimpan di server.</div>`;
    let atas = '';
    if (j && j.fase !== 'selesai') atas = progres(id, j);
    if (!lap) {
      return nav + atas + (j && j.fase !== 'gagal' && j.fase !== 'selesai' ? '' : `<div class="mp230-mulai"><i class="fas fa-file-shield"></i><h6>Verifikasi Dokumen Tagihan</h6>
        <p>Memeriksa ${h.total} dokumen checklist: kelengkapan 6 dokumen wajib (Kwitansi, Invoice, Faktur Pajak, Surat Jalan, BAP, BAPM — atau penggantinya BAPP/BAPA/BAST), kesesuaian nilai &amp; PPN, legalitas (meterai, tanda tangan, nomor seri faktur), rekening, dan rincian barang.</p>
        ${h.kurang && h.kurang.length ? `<div class="alert alert-warning py-2 small text-start">${h.kurang.length} dokumen belum lengkap — akan dilaporkan sebagai <b>Kurang</b>.</div>` : ''}
        ${tombolJalan('Mulai verifikasi')}${bolehJalan() ? '' : '<p class="small text-muted mt-2 mb-0">Verifikasi dijalankan oleh Pengadaan/Admin.</p>'}</div>`);
    }
    return nav + atas + laporan(lap, v, id);
  }
  function progres(id, j) {
    const ik = { antre: 'fa-circle text-muted', proses: 'fa-spinner fa-spin text-primary', ok: 'fa-circle-check text-success', cache: 'fa-database text-success', gagal: 'fa-circle-xmark text-danger' };
    const sel = j.dok.filter(d => d.st === 'ok' || d.st === 'cache').length;
    return `<div class="mp230-prog ${j.fase === 'gagal' ? 'gagal' : ''}"><div class="mp230-prog-h"><b>${j.fase === 'gagal' ? '<i class="fas fa-circle-xmark me-1"></i>Verifikasi berhenti' : '<i class="fas fa-spinner fa-spin me-1"></i>' + E(j.ket || 'Memproses…')}</b><span>${sel}/${j.dok.length} dokumen</span></div>
      <div class="bar"><span style="width:${j.dok.length ? Math.round((sel + (j.fase === 'nilai' ? 1 : 0)) / (j.dok.length + 1) * 100) : 5}%"></span></div>
      <ol>${j.dok.map(d => `<li><i class="fas ${ik[d.st]}"></i><span>${E(d.nama)}</span><small>${E(d.file)}${d.st === 'cache' ? ' · dari cache' : d.st === 'ok' ? ' · dibaca' : ''}${d.galat ? ' · ' + E(d.galat) : ''}</small></li>`).join('')}
        <li><i class="fas ${j.fase === 'nilai' ? ik.proses : j.fase === 'selesai' ? ik.ok : ik.antre}"></i><span>Pemeriksaan silang (mesin aturan server)</span></li></ol>
      ${j.fase === 'gagal' ? `<div class="alert alert-danger py-2 mb-2 small">${E(j.galat || '')}</div><button type="button" class="btn btn-sm btn-primary" onclick="mp230Jalan('${E(id)}')"><i class="fas fa-rotate-right me-1"></i>Coba lagi (dokumen yang sudah terbaca tidak dibaca ulang)</button>` : ''}</div>`;
  }
  function laporan(L, v, id) {
    const kd = !!(v && v.kedaluwarsa), lolos = L.keputusan === 'LOLOS', R = L.ringkas || {};
    const grup = ['KRITIS', 'MAYOR', 'MINOR', 'CATATAN'].map(t => ({ t, L: (L.temuan || []).filter(x => x.tingkat === t) })).filter(g => g.L.length);
    const riw = VT.riwayat[id] || [];
    return `${kd ? `<div class="alert alert-warning m-3 mb-0 py-2"><i class="fas fa-clock-rotate-left me-1"></i><b>Kedaluwarsa:</b> PDF/status checklist berubah setelah verifikasi ${E(tglJam(L.pada))}. Jalankan ulang sebelum Verifikasi Admin.</div>` : ''}
      <div class="mp230-kep ${lolos ? 'ok' : 'no'}"><div class="mp230-kep-k"><small>Keputusan</small><b><i class="fas ${lolos ? 'fa-circle-check' : 'fa-circle-xmark'} me-1"></i>${E(L.keputusan)}</b><span>${L.mode === 'UANG_MUKA' ? 'Tagihan uang muka' : 'Tagihan progres'} · ${E(L.kategori || '')}</span></div>
        <div class="mp230-kep-n">${['KRITIS', 'MAYOR', 'MINOR', 'CATATAN'].map(t => `<span style="--p:${TK[t][1]}"><b>${N(R[t.toLowerCase()])}</b>${TK[t][0]}</span>`).join('')}<span style="--p:#D9480F"><b>${N(R.kurang)}</b>Kurang</span></div>
        <div class="mp230-kep-m">Diperiksa ${E(tglJam(L.pada))}<br>oleh ${E(L.oleh || '-')}</div></div>
      ${terkunci(id) ? `<div class="mp240-kunci-b"><i class="fas fa-lock me-1"></i><b>Gerbang terkunci.</b> ${N(R.kritis)} temuan kritis dan ${N(R.mayor)} temuan mayor: Verifikasi Admin dan pengajuan pembayaran ditolak server sampai dokumen diperbaiki dan verifikasi ulang tidak lagi menemukan Kritis/Mayor.</div>` : ''}
      <div class="mp230-akt">${bolehJalan() ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp230Jalan('${E(id)}')"><i class="fas fa-rotate-right me-1"></i>Verifikasi ulang</button>` : ''}
        <button type="button" class="btn btn-sm mp219-btn-o" onclick="mp230Cetak('${E(id)}','ba')"><i class="fas fa-print me-1"></i>BA Hasil Verifikasi</button>
        ${lolos ? '' : `<button type="button" class="btn btn-sm mp219-btn-o" onclick="mp230Cetak('${E(id)}','surat')"><i class="fas fa-envelope-open-text me-1"></i>Surat Permintaan Perbaikan</button>`}
        <button type="button" class="btn btn-sm mp219-btn-o" onclick="mp230Unduh('${E(id)}')"><i class="fas fa-file-arrow-down me-1"></i>.md</button>
        <button type="button" class="btn btn-sm mp219-btn-o" onclick="mp230Salin('${E(id)}')"><i class="fas fa-copy me-1"></i>Salin</button>
        ${typeof window.mp227AiKirim === 'function' && !lolos ? `<button type="button" class="btn btn-sm mp219-btn-o" onclick="mp230KeAi('${E(id)}')" title="Minta Asisten AI menyusun poin klarifikasi ke vendor"><i class="fas fa-wand-magic-sparkles me-1"></i>Klarifikasi vendor (AI)</button>` : ''}</div>
      <section class="mp230-sek"><h6><span>1</span>Tabel Status Dokumen Wajib</h6><div class="mp219-tw"><table class="mp219-tb mp219-tb-s"><thead><tr><th>No.</th><th>Dokumen Wajib</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>
        ${(L.tabel || []).map((r, i) => `<tr><td class="c-no">${i + 1}</td><td><b>${E(r.dokumen)}</b>${(r.ditemukan || []).length && r.ditemukan[0] !== r.dokumen ? `<div class="sub">dipenuhi: ${E(r.ditemukan.join(', '))}</div>` : ''}</td><td><span class="mp219-st" style="--p:${STD[r.status] || '#6B7A90'}">${E(r.status)}</span></td><td class="mp230-ket">${E(r.alasan)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="mp230-sek"><h6><span>2</span>Daftar Ketidaksesuaian ${grup.length ? '' : '<em>— tidak ada</em>'}</h6>
        ${grup.map(g => `<div class="mp230-grp" style="--p:${TK[g.t][1]}"><div class="mp230-grp-h"><i class="fas ${TK[g.t][2]}"></i>${TK[g.t][0]} <span>${g.L.length}</span></div>
          ${g.L.map(t => `<div class="mp230-tm"><code>${E(t.kode)}</code><div><b>${E(t.judul)}</b><p>${E(t.detail)}</p>${(t.dokumen || []).length ? `<small><i class="fas fa-paperclip me-1"></i>${E(t.dokumen.join(', '))}</small>` : ''}${halLink(id, t.dokumen)}</div></div>`).join('')}</div>`).join('')}</section>
      <section class="mp230-sek"><h6><span>3</span>Keputusan Akhir</h6><div class="mp230-kes ${lolos ? 'ok' : 'no'}"><b>${E(L.keputusan)}</b> — ${E(L.kesimpulan)}</div>
        ${(L.poinRevisi || []).length ? `<ol class="mp230-poin">${L.poinRevisi.map(p => `<li>${E(p)}</li>`).join('')}</ol>` : ''}</section>
      ${(L.rekapNilai || []).length ? `<section class="mp230-sek"><h6><span><i class="fas fa-calculator"></i></span>Rekap Nilai Terbaca</h6><div class="mp219-tw"><table class="mp219-tb mp219-tb-s"><thead><tr><th>Dokumen</th><th>Nomor</th><th>Tanggal</th><th class="r">Harga Jual</th><th class="r">DPP</th><th class="r">PPN</th><th class="r">Total</th></tr></thead><tbody>
        ${L.rekapNilai.map(x => `<tr><td><b>${E(x.dokumen)}</b></td><td class="mono">${E(x.nomor || '-')}</td><td class="nw">${tgl(x.tanggal)}</td><td class="r nw">${rp(x.hargaJual)}</td><td class="r nw">${rp(x.dpp)}</td><td class="r nw">${rp(x.ppn)}</td><td class="r nw">${rp(x.total)}</td></tr>`).join('')}</tbody></table></div>
        ${(L.rekening || []).length ? `<div class="mp230-rek">${L.rekening.map(r => `<span><b>${E(r.dokumen)}</b> ${E(r.bank || '')} <code>${E(r.nomor)}</code> ${E(r.atasNama || '')}</span>`).join('')}</div>` : ''}</section>` : ''}
      <details class="mp230-sek mp230-det"><summary><i class="fas fa-folder-tree me-1"></i>Dokumen yang dibaca (${(L.dokumenDiperiksa || []).length})${riw.length > 1 ? ' · riwayat ' + riw.length + ' verifikasi' : ''}</summary>
        <ul>${(L.dokumenDiperiksa || []).map(d => `<li><i class="fas ${d.dibaca ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i><b>${E(d.nama)}</b> · ${E(d.file)}${d.provider ? ' · <small>' + E(d.provider) + '</small>' : ''}</li>`).join('')}</ul>
        ${riw.length > 1 ? `<table class="mp219-tb mp219-tb-s"><thead><tr><th>Waktu</th><th>Oleh</th><th>Keputusan</th><th>Kritis/Mayor/Minor</th></tr></thead><tbody>${riw.map(r => `<tr><td class="nw">${tglJam(r.pada)}</td><td>${E(r.oleh)}</td><td>${E(r.keputusan)}</td><td>${N(r.ringkas && r.ringkas.kritis)}/${N(r.ringkas && r.ringkas.mayor)}/${N(r.ringkas && r.ringkas.minor)}</td></tr>`).join('')}</tbody></table>` : ''}</details>
      <p class="mp230-disc"><i class="fas fa-scale-balanced me-1"></i>Hasil pembacaan AI dapat keliru pada pindaian buram. Keaslian meterai elektronik, QR faktur (e-Faktur/Coretax), dan dokumen fisik Asli tetap diperiksa verifikator.</p>`;
  }

  /* ======================= 2b. BUNDEL PDF · PRATINJAU DUA PANEL · REKONSILIASI (2.4.0) ======================= */
  const WAJIB = { // 6 dokumen wajib per kategori; null = tidak berlaku (pemeriksaan resmi tetap oleh mesin aturan server)
    ALAT: [['Surat Jalan / BAST Alat', ['SURAT_JALAN', 'BAST_ALAT']], ['BAPM / pengganti (BAPA, BAST Alat)', ['BAPA', 'BAST_ALAT', 'BAST', 'BAPM']]],
    BAHAN: [['Surat Jalan', ['SURAT_JALAN', 'REKAP_SURAT_JALAN']], ['BAPM', ['BAPM']]],
    SUBKON: [['Surat Jalan', null], ['BAPM / pengganti (BAPP, BAST)', ['BAPP', 'BAST', 'BAPM']]] };
  const wajibKat = k => [['Kwitansi', ['KWITANSI']], ['Invoice', ['INVOICE']], ['Faktur Pajak', ['FAKTUR_PAJAK']], (WAJIB[k] || WAJIB.BAHAN)[0], ['BAP', ['BAP']], (WAJIB[k] || WAJIB.BAHAN)[1]];
  const halTeks = z => !z || !z.halamanMulai ? '' : z.halamanAkhir && z.halamanAkhir !== z.halamanMulai ? z.halamanMulai + '–' + z.halamanAkhir : String(z.halamanMulai);
  const digit = s => String(s || '').replace(/\D/g, '');
  /* [2.4.2] bundel > 10 MB: batas lampiran kernel 10 MB/berkas → dipecah per halaman (pdf-lib, tanpa kompres) menjadi bagian ≤ 9,5 MB */
  const MB = 1048576, BAGIAN_MAKS = Math.floor(9.5 * MB), BUNDEL_MAKS = 60 * MB, BAGIAN_N = 12;
  const PDFLIB = ['https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'];
  let _pl = null;
  function muatPdfLib() {
    if (window.PDFLib && window.PDFLib.PDFDocument) return Promise.resolve(window.PDFLib);
    if (_pl) return _pl;
    const coba = i => new Promise((ok, no) => {
      if (i >= PDFLIB.length) return no(new Error('Pustaka pemecah PDF tidak dapat dimuat (perlu internet ke cdnjs.cloudflare.com / cdn.jsdelivr.net).'));
      const s = document.createElement('script'); s.src = PDFLIB[i]; s.async = true;
      s.onload = () => window.PDFLib ? ok(window.PDFLib) : (s.remove(), coba(i + 1).then(ok, no));
      s.onerror = () => { s.remove(); coba(i + 1).then(ok, no); };
      document.head.appendChild(s);
    });
    return (_pl = coba(0).catch(e => { _pl = null; throw e; }));
  }
  async function pecahPdf(file, kabar) {   // → [{file, mulai, akhir}] berurutan; halaman bundel tetap utuh di tiap bagian
    const PL = await muatPdfLib(), src = await PL.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true }), n = src.getPageCount(), out = [];
    const dasar = file.name.replace(/\.pdf$/i, ''), buat = async (a, b) => { const d = await PL.PDFDocument.create(); (await d.copyPages(src, Array.from({ length: b - a }, (_, i) => a + i))).forEach(p => d.addPage(p)); return d.save(); };
    let a = 0, per = Math.max(1, Math.floor(n * BAGIAN_MAKS / file.size * 0.9));
    while (a < n) {
      let b = Math.min(n, a + per), isi = await buat(a, b);
      while (isi.length > BAGIAN_MAKS && b - a > 1) { b = a + Math.max(1, Math.floor((b - a) * BAGIAN_MAKS / isi.length * 0.9)); isi = await buat(a, b); }
      out.push({ isi, mulai: a + 1, akhir: b }); if (kabar) kabar('Memecah PDF: halaman ' + (a + 1) + '–' + b + ' dari ' + n + '…');
      if (out.length > BAGIAN_N) throw new Error('Bundel terlalu besar: lebih dari ' + BAGIAN_N + ' bagian. Pisahkan menjadi 2 unggahan atau kurangi resolusi scan (disarankan 150–200 dpi).');
      a = b;
    }
    return out.map((x, i) => ({ file: new File([x.isi], dasar + ' (bagian ' + (i + 1) + ' dari ' + out.length + ', hal. ' + x.mulai + '-' + x.akhir + ').pdf', { type: 'application/pdf' }), mulai: x.mulai, akhir: x.akhir, halaman: n }));
  }
  const bagianDari = (B, n) => { const L = (B && B.berkas) || []; const b = L.find(x => n >= x.mulai && (!x.akhir || n <= x.akhir)) || L[L.length - 1]; return b ? { file: b.file, lokal: Math.max(1, n - b.mulai + 1) } : { file: B && B.file, lokal: n }; };
  const idBundel = B => new Set(((B && B.berkas) || []).map(b => b.file.idServer).concat(B && B.file ? [B.file.idServer] : []));
  VT.bundel = {}; VT.sub = {}; VT.hal = {}; VT.pdf = {}; VT.unggah = {};
  async function muatBundel(id) {
    if (VT.bundel[id] !== undefined) return VT.bundel[id];
    try { VT.bundel[id] = (await regAksi('vtBundelBaca', { data: { id } })).data || null; } catch (e) { VT.bundel[id] = null; }
    return VT.bundel[id];
  }
  async function pdfUrl(idServer) {
    if (VT.pdf[idServer]) return VT.pdf[idServer];
    const r = await regAksi('ambilBerkas', { id: idServer }), bin = atob(r.data || ''), b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return (VT.pdf[idServer] = URL.createObjectURL(new Blob([b], { type: 'application/pdf' })));
  }
  function rekon(seg) {   // rekonsiliasi nilai antar-dokumen (acuan: Invoice) + uji PPN 12% × DPP 11/12 atau 11% × harga jual
    const ambil = j => seg.find(z => z.jenis === j), DOK = ['INVOICE', 'KWITANSI', 'BAP', 'FAKTUR_PAJAK', 'SPKTV'].map(ambil).filter(Boolean), acuan = ambil('INVOICE') || DOK[0];
    const kol = ['hargaJual', 'dpp', 'ppn', 'total'], beda = (a, b) => a != null && b != null && Math.abs(a - b) > 1;
    const baris = DOK.map(z => ({ z, sel: kol.map(k => ({ v: z.nilai[k], beda: !!acuan && z !== acuan && beda(z.nilai[k], acuan.nilai[k]) })) }));
    const fp = ambil('FAKTUR_PAJAK'), hj = (acuan && acuan.nilai.hargaJual) || (fp && fp.nilai.hargaJual), cek = [];
    if (fp && hj != null && fp.nilai.ppn != null) {
      const dppNL = Math.round(hj * 11 / 12), ppn12 = Math.round(dppNL * 0.12), ppn11 = Math.round(hj * 0.11), okPpn = Math.abs(fp.nilai.ppn - ppn12) <= 1 || Math.abs(fp.nilai.ppn - ppn11) <= 1;
      cek.push({ ok: okPpn, t: 'PPN faktur ' + rp(fp.nilai.ppn) + (okPpn ? ' sesuai' : ' tidak sesuai') + ' — 12% × DPP nilai lain ' + rp(dppNL) + ' = ' + rp(ppn12) + ' · atau 11% × ' + rp(hj) + ' = ' + rp(ppn11) });
      if (fp.nilai.dpp != null) { const okD = Math.abs(fp.nilai.dpp - dppNL) <= 1 || Math.abs(fp.nilai.dpp - hj) <= 1; cek.push({ ok: okD, t: 'DPP faktur ' + rp(fp.nilai.dpp) + (okD ? ' sesuai' : ' tidak sesuai') + ' (11/12 × harga jual = ' + rp(dppNL) + ')' }); }
    }
    if (fp) { const n = digit(fp.nomorSeriFaktur || fp.nomor).length; cek.push({ ok: n === 16 || n === 17, t: 'Nomor seri faktur ' + (fp.nomorSeriFaktur || fp.nomor || '—') + ' (' + n + ' digit; wajib 16/17)' }); }
    const rek = []; seg.forEach(z => (z.rekening || []).forEach(r => { if (digit(r.nomor)) rek.push({ z, r, d: digit(r.nomor) }); }));
    const unik = [...new Set(rek.filter(x => x.z.jenis !== 'SPKTV').map(x => x.d))];
    if (rek.length) cek.push({ ok: unik.length <= 1 && rek.filter(x => x.z.jenis === 'SPKTV').every(x => unik.indexOf(x.d) >= 0 || !unik.length), t: 'Rekening: ' + [...new Set(rek.map(x => (x.r.bank ? x.r.bank + ' ' : '') + x.r.nomor + ' (' + x.z.nama + ')'))].join(' · ') });
    const kw = ambil('KWITANSI'); if (kw) { const perlu = ((kw.nilai.total || 0) > ((VT.info && VT.info.setelan && VT.info.setelan.batasMeterai) || 5000000)); cek.push({ ok: !perlu || kw.meterai === true, t: 'Meterai kwitansi: ' + (kw.meterai === true ? 'ada' : kw.meterai === false ? 'tidak ada' : 'tidak terbaca') + (perlu ? ' (wajib, nilai > batas meterai)' : '') }); }
    seg.filter(z => ['KWITANSI', 'BAP', 'BAPM', 'BAPA', 'BAPP'].indexOf(z.jenis) >= 0).forEach(z => { const t = z.tandaTangan || {}, okT = z.jenis === 'KWITANSI' ? t.pihakKedua !== false : t.pihakPertama !== false && t.pihakKedua !== false;
      cek.push({ ok: okT, t: 'Tanda tangan ' + z.nama + ': pihak pertama ' + (t.pihakPertama === true ? '✓' : t.pihakPertama === false ? '✗' : '?') + ', pihak kedua ' + (t.pihakKedua === true ? '✓' : t.pihakKedua === false ? '✗' : '?') }); });
    return { kol, baris, cek };
  }
  function viewBundel(id) {
    const f = F(), B = VT.bundel[id], up = VT.unggah[id], boleh = bolehJalan();
    const drop = `<div class="mp240-drop${B ? ' kecil' : ''}" id="mp240Drop" tabindex="0" role="button" aria-label="Unggah 1 PDF bundel" onclick="mp240Pilih()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();mp240Pilih()}">
      <input type="file" id="mp240File" accept="application/pdf,.pdf" hidden onchange="mp240Unggah(this.files[0])">
      <i class="fas fa-file-arrow-up"></i><div><b>${B ? 'Ganti bundel PDF' : 'Unggah 1 PDF bundel (scan utuh seluruh dokumen tagihan)'}</b>
      <span>Seret &amp; lepas atau klik · maks. 60 MB (di atas 10 MB dipecah otomatis per halaman, tanpa kompres — kualitas scan tetap) · AI memisahkan per halaman: Kwitansi, Invoice, Faktur Pajak, Surat Jalan, BAP, BAPM/pengganti, SPKTV, dll.</span></div></div>`;
    if (up) return `<div class="mp240-proses"><i class="fas fa-spinner fa-spin"></i><div><b>${E(up.ket)}</b><span>${E(up.file || '')}</span></div></div>`;
    if (!B) return (boleh ? drop : '<div class="alert alert-warning m-3">Belum ada bundel PDF untuk tagihan ini. Unggah dilakukan oleh Pengadaan/Admin.</div>') +
      '<p class="mp240-cat">Alternatif: unggah PDF per dokumen di tab <b>Checklist Dokumen</b>. Bundel dan PDF per dokumen dapat dipakai bersamaan; dokumen yang sama tidak dihitung dua kali.</p>';
    const seg = B.segmen || [], aktifI = VT.hal[id] ? VT.hal[id].i : -1, R = rekon(seg), kat = (f.rec && f.rec.kategori) || 'BAHAN';
    const ikon = v => v === true ? '<span class="mp240-ya">✓</span>' : v === false ? '<span class="mp240-tdk">✗</span>' : '<span class="mp240-na">?</span>';
    const status = k => { const v = (f.rec && f.rec.items && f.rec.items[k]) || {}; return v.status === 'ADA' ? (v.file && idBundel(B).has(v.file.idServer) ? 'bundel' : 'PDF lain') : v.status === 'NA' ? 'N/A' : 'kosong'; };
    const usul = (B.usulan || []).map(u => ({ u, st: status(u.k) }));
    const wajib = wajibKat(kat).map(w => { if (!w[1]) return { n: w[0], na: true }; const L = seg.filter(z => w[1].indexOf(z.jenis) >= 0); return { n: w[0], L }; });
    return `${boleh ? drop : ''}
    <div class="mp240-dua">
      <section class="mp240-kiri" aria-label="Pratinjau PDF"><div class="mp240-pvh"><b title="${E(B.file && B.file.nama)}">${E((B.file && B.file.nama) || 'Bundel')}</b><span id="mp240HalTeks">${VT.hal[id] ? 'hal. ' + VT.hal[id].n : 'hal. 1'}</span>
        <button type="button" class="btn btn-sm mp219-btn-o" onclick="mp240Geser('${E(id)}',-1)" aria-label="Halaman sebelumnya">‹</button><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp240Geser('${E(id)}',1)" aria-label="Halaman berikutnya">›</button></div>
        <div class="mp240-pv" id="mp240Pv"><div class="mp240-pv-m"><i class="fas fa-spinner fa-spin me-1"></i>Memuat PDF…</div></div></section>
      <section class="mp240-kanan">
        <h6>Peta dokumen <small>${seg.length} dokumen · dipisahkan ${E(B.provider || 'AI')} ${E(tglJam(B.pada))}${B.cache ? ' · cache' : ''}</small></h6>
        <div class="mp219-tw"><table class="mp219-tb mp219-tb-s mp240-peta"><thead><tr><th>Hal.</th><th>Dokumen</th><th>Nomor / tanggal</th><th class="r">Total</th><th class="c">Meterai</th><th class="c">TTD</th></tr></thead><tbody>
          ${seg.map((z, i) => `<tr class="${i === aktifI ? 'on' : ''}" data-i="${i}" tabindex="0" onclick="mp240Hal('${E(id)}',${Number(z.halamanMulai) || 1},${i})" onkeydown="if(event.key==='Enter')mp240Hal('${E(id)}',${Number(z.halamanMulai) || 1},${i})">
            <td class="nw mono">${E(halTeks(z) || '?')}</td><td><b>${E(z.nama)}</b>${z.k ? '' : '<div class="sub">tidak ada item checklist</div>'}${z.keyakinan && z.keyakinan < 0.6 ? '<div class="sub text-warning">keyakinan baca rendah</div>' : ''}</td>
            <td class="mono"><div>${E(z.nomor || '—')}</div><div class="sub">${tgl(z.tanggal)}</div></td><td class="r nw">${rp(z.nilai && z.nilai.total)}</td>
            <td class="c">${ikon(z.meterai)}</td><td class="c">${ikon(z.tandaTangan ? (z.tandaTangan.pihakPertama !== false && z.tandaTangan.pihakKedua !== false && (z.tandaTangan.pihakPertama || z.tandaTangan.pihakKedua) ? true : z.tandaTangan.pihakPertama === false || z.tandaTangan.pihakKedua === false ? false : null) : null)}</td></tr>`).join('')}</tbody></table></div>
        ${usul.length ? `<div class="mp240-usul"><b>Pemetaan ke checklist</b>${usul.map(x => `<label><input type="checkbox" class="form-check-input" id="mp240U_${E(x.u.k)}" data-k="${E(x.u.k)}" ${x.st === 'bundel' ? 'checked disabled' : x.st === 'kosong' || x.st === 'N/A' ? 'checked' : ''} ${boleh ? '' : 'disabled'}>
            <span>${E(x.u.nama)} <small>hal. ${E(x.u.halaman || '?')}</small></span><em class="st-${x.st === 'bundel' ? 'ok' : x.st === 'PDF lain' ? 'lain' : 'baru'}">${x.st === 'bundel' ? 'sudah dari bundel' : x.st === 'kosong' ? 'akan diisi' : x.st === 'PDF lain' ? 'sudah ada PDF lain (centang untuk mengganti)' : 'N/A → akan diisi'}</em></label>`).join('')}
          ${(B.tanpaPeta || []).length ? `<p class="mp240-cat">Tidak dipetakan (tidak ada item di kategori ${E(kat)}): ${E(B.tanpaPeta.join(', '))} — tetap ikut diperiksa saat verifikasi.</p>` : ''}
          ${boleh ? `<div class="d-flex gap-2 mt-2"><button type="button" class="btn btn-primary btn-sm" onclick="mp240Terapkan('${E(id)}')" ${usul.some(x => x.st !== 'bundel') ? '' : 'disabled'}><i class="fas fa-check me-1"></i>Terapkan ke checklist &amp; verifikasi</button>
            <button type="button" class="btn btn-sm mp219-btn-o" onclick="mp230Cetak('${E(id)}','rekon')"><i class="fas fa-print me-1"></i>Lembar rekonsiliasi</button></div>` : ''}</div>` : ''}
        <h6>Kelengkapan dokumen wajib</h6>
        <ul class="mp240-wajib">${wajib.map(w => `<li class="${w.na ? 'na' : w.L.length ? 'ok' : 'no'}"><span>${w.na ? '—' : w.L.length ? '✓' : '✗'}</span><b>${E(w.n)}</b>${w.na ? '<em>tidak berlaku</em>' : w.L.length ? w.L.map(z => `<button type="button" class="mp240-hal" onclick="mp240Hal('${E(id)}',${Number(z.halamanMulai) || 1},${seg.indexOf(z)})">${E(z.nama)} hal. ${E(halTeks(z) || '?')}</button>`).join('') : '<em>tidak ditemukan di bundel</em>'}</li>`).join('')}</ul>
        <h6>Rekonsiliasi nilai <small>acuan: Invoice</small></h6>
        ${R.baris.length ? `<div class="mp219-tw"><table class="mp219-tb mp219-tb-s mp240-rek"><thead><tr><th>Dokumen</th><th class="r">Harga Jual</th><th class="r">DPP</th><th class="r">PPN</th><th class="r">Total</th></tr></thead><tbody>
          ${R.baris.map(b => `<tr><td><button type="button" class="mp240-hal" onclick="mp240Hal('${E(id)}',${Number(b.z.halamanMulai) || 1},${seg.indexOf(b.z)})">${E(b.z.nama)}</button></td>${b.sel.map(c => `<td class="r nw ${c.beda ? 'beda' : ''}">${rp(c.v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="mp240-cat">Nilai belum terbaca.</p>'}
        <ul class="mp240-cek">${R.cek.map(c => `<li class="${c.ok ? 'ok' : 'no'}"><span>${c.ok ? '✓' : '✗'}</span>${E(c.t)}</li>`).join('')}</ul>
        <p class="mp240-cat">Panel ini membantu membaca cepat. Keputusan LOLOS / BUTUH REVISI dan gerbang bayar ditetapkan oleh mesin aturan server pada tab <b>Laporan Verifikasi</b>.</p>
      </section></div>`;
  }
  async function pasangBundel(id) {
    const d = document.getElementById('mp240Drop');
    if (d && !d.dataset.ikat) {
      d.dataset.ikat = '1';
      ['dragenter', 'dragover'].forEach(n => d.addEventListener(n, ev => { ev.preventDefault(); d.classList.add('seret'); }));
      ['dragleave', 'drop'].forEach(n => d.addEventListener(n, ev => { ev.preventDefault(); d.classList.remove('seret'); }));
      d.addEventListener('drop', ev => { const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if (f) window.mp240Unggah(f); });
    }
    const B = VT.bundel[id], pv = document.getElementById('mp240Pv'); if (!B || !pv || !B.file) return;
    await lihatHal(id, (VT.hal[id] && VT.hal[id].n) || 1);
  }
  async function lihatHal(id, n) {   // halaman bundel → bagian PDF yang memuatnya + halaman lokal
    const B = VT.bundel[id], pv = document.getElementById('mp240Pv'); if (!B || !pv) return;
    const x = bagianDari(B, n); if (!x.file) return;
    if (!VT.pdf[x.file.idServer]) pv.innerHTML = '<div class="mp240-pv-m">Memuat PDF…</div>';
    try { const url = await pdfUrl(x.file.idServer); tampilHal(id, url, x.lokal, n); }
    catch (err) { pv.innerHTML = `<div class="mp240-pv-m text-danger">PDF tidak dapat dimuat: ${E(err.message)}</div>`; }
  }
  function tampilHal(id, url, n, global) {   // iframe dibuat ulang agar penampil PDF peramban pasti melompat ke #page=n
    const pv = document.getElementById('mp240Pv'); if (!pv) return;
    const B = VT.bundel[id], nb = (B && B.berkas && B.berkas.length) || 1, g = global || n, x = nb > 1 ? B.berkas.findIndex(b => g >= b.mulai && (!b.akhir || g <= b.akhir)) : 0;
    pv.innerHTML = `<iframe title="Pratinjau bundel PDF halaman ${g}" src="${url}#page=${n}&view=FitH"></iframe>`;
    const t = document.getElementById('mp240HalTeks'); if (t) t.textContent = 'hal. ' + g + (nb > 1 ? ' · bagian ' + (x + 1) + '/' + nb : '');
  }
  window.mp240Sub = (id, v) => { VT.sub[id] = v; gambarCl(); };
  window.mp240Pilih = () => { const i = document.getElementById('mp240File'); if (i) i.click(); };
  window.mp240Hal = (id, n, i) => {
    VT.hal[id] = { n: Math.max(1, Number(n) || 1), i: i == null ? -1 : i };
    document.querySelectorAll('.mp240-peta tbody tr').forEach(tr => tr.classList.toggle('on', Number(tr.dataset.i) === VT.hal[id].i));
    lihatHal(id, VT.hal[id].n);
  };
  window.mp240Geser = (id, d) => window.mp240Hal(id, ((VT.hal[id] && VT.hal[id].n) || 1) + d, -1);
  window.mp240Lompat = (id, nama) => {   // dari temuan laporan → halaman dokumen terkait di bundel
    const B = VT.bundel[id], z = B && (B.segmen || []).find(s => nama.indexOf(s.nama) >= 0 || (nama.indexOf('BAPM') >= 0 && /BAP[AP]|BAST/.test(s.jenis)));
    if (!z) return; VT.sub[id] = 'bundel'; VT.hal[id] = { n: Number(z.halamanMulai) || 1, i: B.segmen.indexOf(z) }; gambarCl();
  };
  const halLink = (id, dok) => { const B = VT.bundel[id]; if (!B || !dok || !dok.length) return ''; const z = (B.segmen || []).find(s => dok.some(n => n.indexOf(s.nama) >= 0));
    return z && z.halamanMulai ? `<button type="button" class="mp240-hal" onclick="mp240Lompat('${E(id)}','${E(dok.join(' | ').replace(/'/g, ''))}')">lihat hal. ${E(halTeks(z))}</button>` : ''; };
  window.mp240Unggah = async file => {
    const f = F(), id = f.rec && f.rec.id; if (!id || !file || !bolehJalan()) return;
    if (f.dirty) { pesan('Simpan perubahan checklist dahulu sebelum mengunggah bundel.', 'err'); return; }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { pesan('Berkas harus PDF.', 'err'); return; }
    if (file.size > BUNDEL_MAKS) { pesan('Bundel ' + (file.size / MB).toFixed(1) + ' MB melebihi 60 MB. Pisahkan menjadi 2 unggahan atau scan ulang 150–200 dpi.', 'err'); return; }
    const besar = file.size > BAGIAN_MAKS;
    if (besar && !srv('bundelBertingkat')) { pesan('Bundel di atas 10 MB butuh Modul server 1.7.1. Terbitkan modul terbaru lalu muat ulang aplikasi.', 'err'); return; }
    const kabar = t => { if (VT.unggah[id]) { VT.unggah[id].ket = t; gambarCl(); } };
    VT.unggah[id] = { ket: 'Memeriksa PDF…', file: file.name + ' · ' + (file.size / MB).toFixed(1) + ' MB' }; gambarCl();
    try {
      const head = new Uint8Array(await file.slice(0, 5).arrayBuffer()); if (String.fromCharCode.apply(null, head) !== '%PDF-') throw new Error('Isi berkas bukan PDF yang valid.');
      const L = besar ? await pecahPdf(file, kabar) : [{ file, mulai: 1, akhir: null }], n = L.length, berkas = [];
      for (let i = 0; i < n; i++) {
        kabar('Mengunggah ke Google Drive' + (n > 1 ? ': bagian ' + (i + 1) + '/' + n + ' (hal. ' + L[i].mulai + '–' + L[i].akhir + ')' : '') + '…');
        const ref = await window.unggahPdf(L[i].file, { jenis: 'CHECKLIST', ket: f.rec.noKontrak + ' · BUNDEL' + (n > 1 ? ' ' + (i + 1) + '/' + n : '') });
        if (!ref || !ref.idServer) throw new Error('PDF' + (n > 1 ? ' bagian ' + (i + 1) : '') + ' belum tersimpan di server (Google Drive).');
        berkas.push({ file: ref, mulai: L[i].mulai, akhir: L[i].akhir });
      }
      let r;
      if (n > 1) {   // satu bagian per panggilan agar tiap permintaan tetap di bawah batas waktu Apps Script
        for (let i = 0; i < n; i++) { kabar('AI membaca bagian ' + (i + 1) + '/' + n + ' (hal. ' + berkas[i].mulai + '–' + berkas[i].akhir + ')… (30–90 detik per bagian)'); await regAksi('vtBundel', { data: { id, berkas: [berkas[i]], bacaSaja: true } }); }
        kabar('Menyusun peta dokumen ' + n + ' bagian…'); r = await regAksi('vtBundel', { data: { id, berkas } });
      } else { kabar('AI memisahkan & mengklasifikasi halaman… (dapat 30–90 detik)'); r = await regAksi('vtBundel', { data: { id, file: berkas[0].file } }); }
      VT.bundel[id] = r; VT.hal[id] = { n: 1, i: -1 }; VT.sub[id] = 'bundel';
      pesan('Bundel' + (n > 1 ? ' (' + n + ' bagian ≤ 10 MB)' : '') + ' dipisahkan menjadi ' + r.segmen.length + ' dokumen. Periksa pemetaan, lalu Terapkan ke checklist.', 'ok');
    } catch (err) { pesan('Bundel gagal diproses: ' + err.message, 'err'); }
    finally { delete VT.unggah[id]; gambarCl(); }
  };
  window.mp240Terapkan = async id => {
    const f = F(), B = VT.bundel[id]; if (!f.rec || f.rec.id !== id || !B || !bolehJalan()) return;
    const pilih = [...document.querySelectorAll('.mp240-usul input[data-k]:checked:not(:disabled)')].map(x => x.dataset.k); if (!pilih.length) return;
    pilih.forEach(k => { const u = (B.usulan || []).find(x => x.k === k); if (!u) return;
      f.rec.items[k] = Object.assign({}, f.rec.items[k] || {}, { status: 'ADA', file: Object.assign({}, u.file || B.file), tgl: /^\d{4}-\d{2}-\d{2}$/.test(u.tgl || '') ? u.tgl : '', ket: u.ket, alasan: '' }); });
    f.dirty = true;
    if (typeof window.mp219ClSimpan !== 'function') return;
    await window.mp219ClSimpan();
    if (F().dirty) return;   // simpan gagal: pesan galat sudah ditampilkan aplikasi
    VT.sub[id] = 'laporan'; delete VT.lap[id];
    await window.mp230Jalan(id);   // hasil baca bundel sudah di cache → tanpa biaya AI tambahan
  };

  /* ======================= 3. MENJALANKAN VERIFIKASI ======================= */
  async function jalankan(id, opsi) {
    opsi = opsi || {};
    if (!bolehJalan()) throw new Error('Verifikasi tagihan dijalankan oleh Pengadaan/Admin.');
    const sedang = VT.jalan[id]; if (sedang && sedang.fase !== 'selesai' && sedang.fase !== 'gagal') return null;
    const j = VT.jalan[id] = { fase: 'rencana', dok: [], ket: 'Menyiapkan…' }; segar(id);
    try {
      const R = await regAksi('vtRencana', { data: { id } });
      if (!R.provider) throw new Error('Belum ada penyedia AI yang dapat membaca PDF. Admin: atur di Setelan Asisten AI (Anthropic/Google/OpenAI/OpenRouter).');
      j.dok = R.dokumen.map(d => ({ k: d.k, nama: d.nama, file: d.file, st: d.cache && !opsi.paksa ? 'cache' : 'antre' })); j.fase = 'baca';
      const baru = j.dok.filter(d => d.st === 'antre').length;
      if (baru > N(R.sisaKuota)) throw new Error('Kuota Asisten AI harian tersisa ' + N(R.sisaKuota) + ', dibutuhkan ' + baru + ' pembacaan PDF. Minta Admin menaikkan kuota atau lanjutkan besok.');
      for (const d of j.dok) {
        if (d.st === 'cache') continue;
        d.st = 'proses'; j.ket = 'Membaca ' + d.nama + '…'; segar(id);
        try { const r = await regAksi('vtEkstrak', { data: { id, k: d.k, paksa: !!opsi.paksa } }); d.st = r.cache ? 'cache' : 'ok'; }
        catch (err) { d.st = 'gagal'; d.galat = err.message; throw new Error(d.nama + ': ' + err.message); }
      }
      j.fase = 'nilai'; j.ket = 'Pemeriksaan silang…'; segar(id);
      const r = await regAksi('vtNilai', { data: { id } }), L = r.data;
      VT.lap[id] = L; VT.riwayat[id] = [{ pada: L.pada, oleh: L.oleh, keputusan: L.keputusan, ringkas: L.ringkas }].concat(VT.riwayat[id] || []);
      VT.ringkas[id] = { id, keputusan: L.keputusan, ringkas: L.ringkas, pada: L.pada, oleh: L.oleh, kedaluwarsa: false, teratas: (L.temuan || []).filter(t => t.tingkat !== 'CATATAN').slice(0, 3).map(t => t.tingkat + ': ' + t.judul) };
      j.fase = 'selesai'; delete VT.jalan[id]; segar(id);
      if (F().tab === 'daftar' && !VT.massal && document.querySelector('#keuIsi .mp219-tb')) window.mp219Keu({});   // perbarui lencana di Daftar Tagihan
      return L;
    } catch (err) { j.fase = 'gagal'; j.galat = err.message; segar(id); throw err; }
  }
  function segar(id) { const f = F(); if (VT.clAktif && f.rec && f.rec.id === id) gambarCl(); segarDash(); try { kunciKaki(); } catch (e) { } }
  window.mp230Jalan = async id => {
    const ada = VT.lap[id];
    try { const L = await jalankan(id); if (L) pesan('Verifikasi selesai: ' + L.keputusan + (L.keputusan === 'LOLOS' ? '' : ' (' + L.ringkas.kritis + ' kritis, ' + L.ringkas.mayor + ' mayor, ' + L.ringkas.minor + ' minor)'), L.keputusan === 'LOLOS' ? 'ok' : 'err'); }
    catch (err) { pesan('Verifikasi tagihan gagal: ' + err.message, 'err'); }
    if (ada === undefined) segarKeu();
  };
  window.mp230Massal = async () => {
    if (VT.massal || !bolehJalan()) return;
    const rows = F()._rows || [], ids = rows.filter(r => ['BELUM', 'KEDALUWARSA'].includes(statusVt(r.e.id, r))).map(r => r.e.id);
    if (!ids.length) return;
    if (!confirm('Verifikasi ' + ids.length + ' tagihan secara berurutan?\nSetiap PDF baru memakai 1 kuota Asisten AI; PDF yang pernah dibaca diambil dari cache.')) return;
    VT.massal = true; VT.massalN = ids.length; VT.massalKe = 0; let ok = 0, gagal = 0;
    for (const id of ids) {
      VT.massalKe++; segarDash();
      try { await jalankan(id); ok++; } catch (err) { gagal++; if (/kuota|penyedia AI/i.test(err.message)) { pesan('Verifikasi massal dihentikan: ' + err.message, 'err'); break; } }
    }
    VT.massal = false; segarDash(); if (F().tab === 'daftar') window.mp219Keu({}); pesan('Verifikasi massal selesai: ' + ok + ' berhasil' + (gagal ? ', ' + gagal + ' gagal' : '') + '.', gagal ? 'err' : 'ok');
  };

  /* ======================= 4. KELUARAN: MARKDOWN, CETAK, ASISTEN AI ======================= */
  function teksMd(L) {
    const p = prog(L.id), b = [];
    b.push('# Hasil Verifikasi Dokumen Tagihan', '', '| | |', '|---|---|', '| Proyek | ' + pid() + ' ' + ((typeof PROYEK !== 'undefined' && PROYEK.nama) || '') + ' |', '| No. BK / Tagihan | ' + (L.nomorBA || p.nomorBA || '-') + ' |',
      '| No. Kontrak | ' + (L.noKontrak || '-') + ' |', '| Vendor | ' + (L.vendor || vendorDari(p) || '-') + ' |', '| Nilai Tagihan | ' + rp(L.nilaiTagihan) + ' |', '| Jenis | ' + (L.mode === 'UANG_MUKA' ? 'Uang muka' : 'Progres') + ' · ' + (L.kategori || '') + ' |',
      '| Diperiksa | ' + tglJam(L.pada) + ' oleh ' + (L.oleh || '-') + ' |', '', '## 1. Tabel Status Dokumen', '', '| No | Dokumen Wajib | Status | Keterangan |', '|---|---|---|---|');
    (L.tabel || []).forEach((r, i) => b.push('| ' + (i + 1) + ' | ' + r.dokumen + ' | ' + r.status + ' | ' + String(r.alasan || '').replace(/\|/g, '/') + ' |'));
    b.push('', '## 2. Daftar Ketidaksesuaian', '');
    const T = (L.temuan || []); if (!T.length) b.push('Tidak ada.');
    T.forEach(t => b.push('- **[' + TK[t.tingkat][0] + '] ' + t.kode + ' — ' + t.judul + '** — ' + t.detail + (t.dokumen && t.dokumen.length ? ' _(' + t.dokumen.join(', ') + ')_' : '')));
    b.push('', '## 3. Keputusan Akhir', '', '**' + L.keputusan + '** — ' + L.kesimpulan, '');
    if ((L.rekapNilai || []).length) { b.push('### Rekap nilai terbaca', '', '| Dokumen | Nomor | Harga Jual | DPP | PPN | Total |', '|---|---|---|---|---|---|'); L.rekapNilai.forEach(x => b.push('| ' + x.dokumen + ' | ' + (x.nomor || '-') + ' | ' + rp(x.hargaJual) + ' | ' + rp(x.dpp) + ' | ' + rp(x.ppn) + ' | ' + rp(x.total) + ' |')); b.push(''); }
    b.push('_Verifikasi berbantuan AI (Monitoring Pengadaan ' + VERSI + '). Keaslian dokumen fisik, meterai elektronik, dan QR faktur tetap diperiksa verifikator._');
    return b.join('\n');
  }
  const ambil = async id => VT.lap[id] || await muatLap(id);
  window.mp230Salin = async id => { const L = await ambil(id); if (!L) return; const t = teksMd(L); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject(new Error('clipboard'))).then(() => pesan('Ringkasan verifikasi disalin.', 'ok'), () => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); pesan('Ringkasan verifikasi disalin.', 'ok'); } catch (e) { } a.remove(); }); };
  window.mp230Unduh = async id => {
    const L = await ambil(id); if (!L) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([teksMd(L)], { type: 'text/markdown;charset=utf-8' }));
    a.download = 'Verifikasi-' + String(L.nomorBA || L.id).replace(/[^\w.-]+/g, '_').slice(0, 60) + '.md'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  window.mp230KeAi = async id => {
    const L = await ambil(id); if (!L || typeof window.mp227AiKirim !== 'function') return;
    const poin = (L.temuan || []).filter(t => t.tingkat !== 'CATATAN').map(t => '- [' + t.tingkat + '] ' + t.judul + ': ' + t.detail).join('\n');
    const teks = 'Sebagai Contract Manager, susun poin klarifikasi tertulis kepada vendor ' + (L.vendor || '') + ' atas tagihan ' + (L.nomorBA || '') + ' (kontrak ' + (L.noKontrak || '') + ', nilai ' + rp(L.nilaiTagihan) + '). ' +
      'Hasil verifikasi dokumen: ' + L.keputusan + '. Temuan:\n' + poin + '\nUntuk tiap temuan: dokumen yang harus diperbaiki, bentuk perbaikan yang diterima, dan batas waktu. Urutkan dari temuan kritis. Gunakan bahasa tegas namun menjaga kemitraan. Jangan menambah temuan di luar daftar.';
    if (typeof window.mp227AiBuka === 'function') window.mp227AiBuka();
    setTimeout(() => window.mp227AiKirim(teks), 250);
  };
  function htmlCetak(L, jenis) {
    const p = prog(L.id), P = typeof PROYEK !== 'undefined' ? PROYEK : {}, vendor = L.vendor || vendorDari(p) || '-';
    const kini = new Date(), lolos = L.keputusan === 'LOLOS';
    const meta = [['Nama Proyek', P.namaLengkap || P.nama || '-'], ['ID Proyek', P.id || pid()], ['No. BK / Tagihan', L.nomorBA || p.nomorBA || '-'], ['Nomor Kontrak', L.noKontrak || '-'], ['Nama Mitra', vendor],
      ['Jenis Tagihan', (L.mode === 'UANG_MUKA' ? 'Uang Muka' : 'Progres') + ' · ' + (L.kategori || '')], ['Nilai Tagihan', rp(L.nilaiTagihan)], ['Waktu Pemeriksaan', tglJam(L.pada) + ' oleh ' + (L.oleh || '-')]];
    const gaya = `@page{size:A4 portrait;margin:14mm 14mm 16mm}*{box-sizing:border-box}body{font:9.5pt Arial,Helvetica,sans-serif;color:#111;margin:0;line-height:1.4}
      h1{text-align:center;font-size:12.5pt;margin:4px 0 2px;letter-spacing:.02em}.no{text-align:center;font-size:9pt;margin-bottom:12px}.kop{display:flex;justify-content:space-between;border-bottom:2px solid #0B2B54;padding-bottom:6px;margin-bottom:10px;font-size:8.5pt}.kop b{font-size:10pt;color:#0B2B54}
      table{width:100%;border-collapse:collapse}.meta td{padding:1.5px 4px;vertical-align:top}.meta td:first-child{width:130px}.meta td:nth-child(2){width:10px}
      .t th,.t td{border:1px solid #333;padding:3px 5px;vertical-align:top;font-size:8.5pt}.t th{background:#DCE9F7}.r{text-align:right;white-space:nowrap}h2{font-size:10pt;margin:12px 0 5px}
      .kep{border:2px solid ${lolos ? '#127a3b' : '#c0262d'};padding:6px 8px;margin-top:6px}.kep b{color:${lolos ? '#127a3b' : '#c0262d'}}ol{margin:4px 0 0 18px;padding:0}li{margin:2px 0}
      .ttd{display:flex;justify-content:space-between;margin-top:20px;gap:12px;page-break-inside:avoid}.ttd div{flex:1;text-align:center}.ttd .sp{height:60px}.ttd b{display:block;text-decoration:underline}
      .kaki{margin-top:14px;font-size:7.5pt;color:#555;border-top:1px solid #bbb;padding-top:4px}tr{page-break-inside:avoid}p{margin:6px 0;text-align:justify}`;
    const kop = `<div class="kop"><div><b>${E(P.kso || 'WASKITA - NINDYA KSO')}</b><br>${E(P.namaLengkap || P.nama || '')}</div><div style="text-align:right">ID Proyek ${E(P.id || pid())}<br>Divisi Infrastruktur II</div></div>`;
    const temuan = (L.temuan || []).filter(t => t.tingkat !== 'CATATAN');
    if (jenis === 'surat') {
      return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Permintaan Perbaikan ${E(L.nomorBA || '')}</title><style>${gaya}</style></head><body>${kop}
        <table class="meta" style="width:auto"><tr><td>Nomor</td><td>:</td><td>......../WK-NK.KSO/${E(P.id || pid())}/${kini.getFullYear()}</td></tr><tr><td>Lampiran</td><td>:</td><td>1 (satu) berkas Hasil Verifikasi Dokumen Tagihan</td></tr><tr><td>Perihal</td><td>:</td><td><b>Permintaan Perbaikan Dokumen Tagihan</b></td></tr></table>
        <p style="margin-top:12px">Kepada Yth.<br><b>Pimpinan ${E(vendor)}</b><br>di Tempat</p>
        <p>Dengan hormat,</p>
        <p>Menindaklanjuti pengajuan tagihan Saudara Nomor BK <b>${E(L.nomorBA || '-')}</b> atas Kontrak Nomor <b>${E(L.noKontrak || '-')}</b> dengan nilai ${E(rp(L.nilaiTagihan))}, bersama ini kami sampaikan bahwa berdasarkan hasil verifikasi kelengkapan dan kesesuaian dokumen tagihan, terdapat hal-hal yang perlu diperbaiki sebagai berikut:</p>
        <table class="t"><thead><tr><th style="width:8mm">No.</th><th style="width:20mm">Tingkat</th><th>Uraian Ketidaksesuaian</th><th style="width:38mm">Dokumen</th></tr></thead><tbody>${temuan.map((t, i) => `<tr><td>${i + 1}</td><td>${E(TK[t.tingkat][0])}</td><td><b>${E(t.judul)}</b><br>${E(t.detail)}</td><td>${E((t.dokumen || []).join(', '))}</td></tr>`).join('')}</tbody></table>
        <p>Sehubungan dengan hal tersebut, mohon Saudara menyampaikan dokumen perbaikan (asli bertanda tangan dan bermeterai sesuai ketentuan) paling lambat <b>3 (tiga) hari kerja</b> sejak surat ini diterima. Untuk temuan terkait <b>rekening bank</b> dan <b>Faktur Pajak</b>, mohon disertai surat pernyataan/ pembetulan resmi (penggantian faktur melalui e-Faktur/Coretax bila diperlukan).</p>
        <p>Proses pembayaran akan dilanjutkan setelah dokumen perbaikan diterima dan dinyatakan sesuai pada verifikasi ulang, dengan tetap mengacu pada ketentuan pembayaran dalam Kontrak. Keterlambatan penyampaian perbaikan menjadi tanggung jawab Saudara dan tidak dapat dijadikan dasar klaim keterlambatan pembayaran.</p>
        <p>Demikian kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>
        <div class="ttd"><div></div><div></div><div>Palembang, ${E(tglPanjang(kini))}<br>${E(P.kso || 'WASKITA - NINDYA KSO')}<div class="sp"></div><b>${E(P.kapro || '(........................................)')}</b>Kepala Proyek</div></div>
        <p style="font-size:8.5pt;margin-top:14px">Tembusan: Kasi Pengadaan, Logistik &amp; Peralatan; Kasi Keuangan; Arsip.</p>
        <div class="kaki">Dibuat ${E(kini.toLocaleString('id-ID'))} oleh ${E((sesi() || {}).nama || '-')} · Monitoring Pengadaan ${VERSI} · berdasarkan Verifikasi Dokumen ${E(tglJam(L.pada))}</div></body></html>`;
    }
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>BA Verifikasi ${E(L.nomorBA || '')}</title><style>${gaya}</style></head><body>${kop}
      <h1>BERITA ACARA HASIL VERIFIKASI DOKUMEN TAGIHAN</h1><div class="no">Nomor: ......../BA-VT/${E(P.id || pid())}/${kini.getFullYear()}</div>
      <p>Pada hari ini, ${E(kini.toLocaleDateString('id-ID', { weekday: 'long' }))} tanggal ${E(tglPanjang(kini))}, telah dilakukan verifikasi kelengkapan dan kesesuaian dokumen tagihan dengan data sebagai berikut:</p>
      <table class="meta">${meta.map(m => `<tr><td>${E(m[0])}</td><td>:</td><td>${E(m[1])}</td></tr>`).join('')}</table>
      <h2>A. Status Dokumen Wajib</h2><table class="t"><thead><tr><th style="width:8mm">No.</th><th style="width:38mm">Dokumen</th><th style="width:22mm">Status</th><th>Keterangan</th></tr></thead><tbody>${(L.tabel || []).map((r, i) => `<tr><td>${i + 1}</td><td>${E(r.dokumen)}</td><td><b>${E(r.status)}</b></td><td>${E(r.alasan)}</td></tr>`).join('')}</tbody></table>
      ${(L.rekapNilai || []).length ? `<h2>B. Rekap Nilai</h2><table class="t"><thead><tr><th>Dokumen</th><th>Nomor</th><th>Harga Jual</th><th>DPP</th><th>PPN</th><th>Total</th></tr></thead><tbody>${L.rekapNilai.map(x => `<tr><td>${E(x.dokumen)}</td><td>${E(x.nomor || '-')}</td><td class="r">${rp(x.hargaJual)}</td><td class="r">${rp(x.dpp)}</td><td class="r">${rp(x.ppn)}</td><td class="r">${rp(x.total)}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2>C. Ketidaksesuaian</h2>${temuan.length ? `<table class="t"><thead><tr><th style="width:8mm">No.</th><th style="width:16mm">Kode</th><th style="width:18mm">Tingkat</th><th>Uraian</th></tr></thead><tbody>${temuan.map((t, i) => `<tr><td>${i + 1}</td><td>${E(t.kode)}</td><td>${E(TK[t.tingkat][0])}</td><td><b>${E(t.judul)}</b><br>${E(t.detail)}</td></tr>`).join('')}</tbody></table>` : '<p>Tidak ditemukan ketidaksesuaian.</p>'}
      <h2>D. Keputusan</h2><div class="kep"><b>${E(L.keputusan)}</b> — ${E(L.kesimpulan)}</div>
      <p style="font-size:8.5pt">Catatan: pemeriksaan dilakukan atas PDF yang diunggah pada checklist kelengkapan tagihan dengan bantuan pembacaan otomatis (AI) dan aturan pemeriksaan silang sistem. Keaslian dokumen fisik, meterai elektronik, dan QR Faktur Pajak tetap diperiksa oleh verifikator sebelum Verifikasi Admin.</p>
      <div class="ttd">${[['Diperiksa oleh', 'Staf Pengadaan', L.oleh || ''], ['Diketahui oleh', 'Kasi Pengadaan, Logistik & Peralatan', P.kasi || ''], ['Disetujui oleh', 'Kepala Proyek', P.kapro || '']].map(t => `<div>${E(t[0])},<div class="sp"></div><b>${E(t[2] || '(........................................)')}</b>${E(t[1])}</div>`).join('')}</div>
      <div class="kaki">Dicetak ${E(kini.toLocaleString('id-ID'))} oleh ${E((sesi() || {}).nama || '-')} · Monitoring Pengadaan ${VERSI} · ${(L.dokumenDiperiksa || []).length} dokumen diperiksa</div></body></html>`;
  }
  function htmlRekon(id) {   // 2.4.0: lembar rekonsiliasi bundel (A4)
    const f = F(), B = VT.bundel[id] || { segmen: [] }, seg = B.segmen || [], R = rekon(seg), p = prog(id), P = typeof PROYEK !== 'undefined' ? PROYEK : {}, v = VT.ringkas[id], kini = new Date();
    const kat = (f.rec && f.rec.id === id && f.rec.kategori) || 'BAHAN', T = window.MP219_T || {}, items = (f.rec && f.rec.id === id && f.rec.items) || {};
    const ck = (T[kat] || []).reduce((a, s) => a.concat(s.items), []);
    const gaya = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font:9pt Arial,Helvetica,sans-serif;color:#111;margin:0}h1{text-align:center;font-size:12pt;margin:4px 0 10px}h2{font-size:9.5pt;margin:10px 0 4px}
      table{width:100%;border-collapse:collapse}.t th,.t td{border:1px solid #333;padding:2px 4px;font-size:8.3pt;vertical-align:top}.t th{background:#DCE9F7}.r{text-align:right;white-space:nowrap}.c{text-align:center}.b{color:#c0262d;font-weight:700}
      .meta td{padding:1px 4px}.ok{color:#127a3b;font-weight:700}.no{color:#c0262d;font-weight:700}.ttd{display:flex;justify-content:space-between;margin-top:16px;gap:12px;page-break-inside:avoid}.ttd div{flex:1;text-align:center}.ttd .sp{height:52px}.ttd b{display:block;text-decoration:underline}.kaki{margin-top:10px;font-size:7.5pt;color:#555;border-top:1px solid #bbb;padding-top:4px}tr{page-break-inside:avoid}`;
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Rekonsiliasi ${E(p.nomorBA || id)}</title><style>${gaya}</style></head><body>
      <h1>LEMBAR REKONSILIASI DOKUMEN TAGIHAN (BUNDEL PDF)</h1>
      <table class="meta">${[['Proyek', (P.id || '') + ' ' + (P.namaLengkap || P.nama || '')], ['No. BK / Tagihan', p.nomorBA || '-'], ['Nomor Kontrak', p.noKontrak || (f.rec && f.rec.noKontrak) || '-'], ['Nama Mitra', vendorDari(p) || '-'], ['Nilai Tagihan', rp(p.nilai)],
        ['Berkas bundel', (B.file && B.file.nama || '-') + ' · ' + seg.length + ' dokumen · dipisahkan ' + (B.provider || 'AI') + ' ' + tglJam(B.pada)], ['Hasil verifikasi', v ? v.keputusan + ' (' + N(v.ringkas && v.ringkas.kritis) + ' kritis, ' + N(v.ringkas && v.ringkas.mayor) + ' mayor, ' + N(v.ringkas && v.ringkas.minor) + ' minor)' + (v.kedaluwarsa ? ' — KEDALUWARSA' : '') + (terkunci(id) ? ' — PEMBAYARAN TERKUNCI' : '') : 'belum diverifikasi']]
        .map(m => `<tr><td style="width:120px">${E(m[0])}</td><td>:</td><td>${E(m[1])}</td></tr>`).join('')}</table>
      <h2>A. Peta dokumen dalam bundel</h2><table class="t"><thead><tr><th>Hal.</th><th>Dokumen</th><th>Nomor</th><th>Tanggal</th><th>DPP</th><th>PPN</th><th>Total</th><th>Meterai</th><th>TTD 1/2</th></tr></thead><tbody>
      ${seg.map(z => `<tr><td class="c">${E(halTeks(z) || '?')}</td><td>${E(z.nama)}</td><td>${E(z.nomor || '-')}</td><td>${tgl(z.tanggal)}</td><td class="r">${rp(z.nilai.dpp)}</td><td class="r">${rp(z.nilai.ppn)}</td><td class="r">${rp(z.nilai.total)}</td><td class="c">${z.meterai === true ? 'Ada' : z.meterai === false ? 'Tidak' : '-'}</td><td class="c">${z.tandaTangan ? (z.tandaTangan.pihakPertama ? '✓' : '·') + '/' + (z.tandaTangan.pihakKedua ? '✓' : '·') : '-'}</td></tr>`).join('')}</tbody></table>
      <h2>B. Rekonsiliasi nilai (acuan Invoice)</h2><table class="t"><thead><tr><th>Dokumen</th><th>Harga Jual</th><th>DPP</th><th>PPN</th><th>Total</th></tr></thead><tbody>${R.baris.map(b => `<tr><td>${E(b.z.nama)}</td>${b.sel.map(c => `<td class="r ${c.beda ? 'b' : ''}">${rp(c.v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <table class="t" style="margin-top:4px"><tbody>${R.cek.map(c => `<tr><td class="c ${c.ok ? 'ok' : 'no'}" style="width:8mm">${c.ok ? '✓' : '✗'}</td><td>${E(c.t)}</td></tr>`).join('')}</tbody></table>
      <h2>C. Checklist kelengkapan (kategori ${E(kat)})</h2><table class="t"><thead><tr><th>No.</th><th>Dokumen</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${ck.map((d, i) => { const x = items[d.k] || {}; return `<tr><td class="c">${i + 1}</td><td>${E(d.nama)}</td><td class="c">${x.status === 'ADA' ? 'Ada' : x.status === 'NA' ? 'N/A' : '<span class="b">Belum</span>'}</td><td>${E(x.status === 'NA' ? x.alasan || '' : x.ket || '')}</td></tr>`; }).join('')}</tbody></table>
      <div class="ttd">${[['Dibuat oleh', 'Staf Pengadaan', ''], ['Diperiksa oleh', 'Kasi Pengadaan, Logistik & Peralatan', P.kasi || ''], ['Disetujui oleh', 'Kepala Proyek', P.kapro || '']].map(t => `<div>${E(t[0])},<div class="sp"></div><b>${E(t[2] || '(........................................)')}</b>${E(t[1])}</div>`).join('')}</div>
      <div class="kaki">Dicetak ${E(kini.toLocaleString('id-ID'))} oleh ${E((sesi() || {}).nama || '-')} · Monitoring Pengadaan ${VERSI} · Nilai dibaca otomatis dari pindaian; keputusan resmi mengikuti Verifikasi Tagihan server dan pemeriksaan dokumen Asli.</div></body></html>`;
  }
  window.mp230Cetak = async (id, jenis) => {
    if (jenis === 'rekon') {
      const w = lapis(`<div class="mp219-dh"><h5><i class="fas fa-print me-2"></i>Lembar Rekonsiliasi Bundel (A4)</h5><div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-primary" onclick="mp230CetakSekarang()"><i class="fas fa-print me-1"></i>Cetak / Simpan PDF</button><button type="button" class="btn-close" aria-label="Tutup" onclick="mp230Tutup()"></button></div></div>
        <div class="mp219-pv"><iframe id="mp230PvFrame" title="Preview cetak"></iframe></div>`, 980);
      w.querySelector('#mp230PvFrame').srcdoc = htmlRekon(id); return;
    }
    const L = await ambil(id); if (!L) return;
    const w = lapis(`<div class="mp219-dh"><h5><i class="fas fa-print me-2"></i>${jenis === 'surat' ? 'Surat Permintaan Perbaikan Dokumen' : 'BA Hasil Verifikasi Dokumen'} (A4)</h5><div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-primary" onclick="mp230CetakSekarang()"><i class="fas fa-print me-1"></i>Cetak / Simpan PDF</button><button type="button" class="btn-close" aria-label="Tutup" onclick="mp230Tutup()"></button></div></div>
      <div class="mp219-pv"><iframe id="mp230PvFrame" title="Preview cetak"></iframe></div>`, 980);
    w.querySelector('#mp230PvFrame').srcdoc = htmlCetak(L, jenis);
  };
  window.mp230CetakSekarang = () => { const f = document.getElementById('mp230PvFrame'); if (f && f.contentWindow) { f.contentWindow.focus(); f.contentWindow.print(); } };

  /* ---------- lapisan dialog ---------- */
  function lapis(html, lebar) {
    tutup();
    const w = document.createElement('div'); w.id = 'mp230Lapis'; w.className = 'mp219-lapis mp230-lapis';
    w.innerHTML = `<div class="mp219-dlg" role="dialog" aria-modal="true" style="max-width:${lebar || 560}px">${html}</div>`;
    w.addEventListener('mousedown', ev => { if (ev.target === w) tutup(); });
    w.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); tutup(); } });
    document.body.appendChild(w); return w;
  }
  function tutup() { const w = document.getElementById('mp230Lapis'); if (w) w.remove(); }
  window.mp230Tutup = tutup;

  /* ======================= 5. SETELAN (ADMIN) ======================= */
  window.mp230Setelan = async () => {
    if (!adm()) return;
    try { VT.info = await regAksi('vtInfo'); } catch (err) { pesan(err.message, 'err'); return; }
    const s = VT.info.setelan || {}, P = VT.info.penyedia || [];
    lapis(`<div class="mp219-dh"><h5><i class="fas fa-sliders me-2"></i>Setelan Verifikasi Tagihan</h5><button type="button" class="btn-close" aria-label="Tutup" onclick="mp230Tutup()"></button></div>
      <div class="mp219-db mp230-set">
        <div class="mp219-fr"><label for="mp230SProv">Penyedia AI pembaca PDF</label><select class="form-select" id="mp230SProv"><option value="">Otomatis (penyedia bawaan)</option>${P.map(p => `<option value="${E(p.id)}" ${p.id === s.provider ? 'selected' : ''}>${E(p.nama)} · ${E(p.model)}</option>`).join('')}</select>
          ${P.length ? '' : '<div class="small text-danger mt-1">Belum ada penyedia aktif yang dapat membaca PDF. Isi API key Anthropic, Google, OpenAI, atau OpenRouter di Setelan Asisten AI.</div>'}</div>
        <fieldset class="mp219-fr"><legend>Gerbang Verifikasi Admin</legend>
          <label class="form-check"><input class="form-check-input" type="radio" name="mp230SG" value="kunci" ${!s.gerbang || s.gerbang === 'kunci' ? 'checked' : ''}> <b>Kunci (disarankan)</b> — temuan Kritis/Mayor mengunci Verifikasi Admin <u>dan</u> pengajuan pembayaran tanpa pengecualian; selain itu perlu alasan (≥ 20 karakter).</label>
          <label class="form-check"><input class="form-check-input" type="radio" name="mp230SG" value="peringatan" ${s.gerbang === 'peringatan' ? 'checked' : ''}> <b>Peringatan</b> — hasil AI ditampilkan; Admin tetap dapat memverifikasi (dicatat di Log).</label>
          <label class="form-check"><input class="form-check-input" type="radio" name="mp230SG" value="wajib" ${s.gerbang === 'wajib' ? 'checked' : ''}> <b>Wajib</b> — Verifikasi Admin ditahan bila hasil belum LOLOS/kedaluwarsa, kecuali dengan alasan pengecualian (≥ 20 karakter).</label></fieldset>
        <label class="form-check mb-2"><input class="form-check-input" type="checkbox" id="mp230SOto" ${s.otomatis !== false ? 'checked' : ''}> Jalankan verifikasi otomatis saat checklist menjadi lengkap</label>
        <div class="row g-2"><div class="col-sm-6 mp219-fr"><label for="mp230SNpwp">NPWP pembeli (faktur)</label><input class="form-control" id="mp230SNpwp" value="${E(s.npwpPembeli || '')}" inputmode="numeric"></div>
          <div class="col-sm-6 mp219-fr"><label for="mp230SNama">Nama pembeli memuat</label><input class="form-control" id="mp230SNama" value="${E(s.namaPembeli || '')}"></div>
          <div class="col-sm-6 mp219-fr"><label for="mp230SMet">Batas wajib meterai kwitansi (Rp)</label><input class="form-control" id="mp230SMet" type="number" min="0" value="${N(s.batasMeterai)}"></div>
          <div class="col-sm-6 mp219-fr"><label for="mp230STol">Toleransi selisih pembulatan (Rp)</label><input class="form-control" id="mp230STol" type="number" min="0" max="1000" value="${N(s.toleransi)}"></div></div>
        <div id="mp230SPesan" class="small"></div></div>
      <div class="mp219-df"><button type="button" class="btn btn-light border" onclick="mp230Tutup()">Batal</button><button type="button" class="btn btn-primary" id="mp230SOk" onclick="mp230SetelanSimpan()">Simpan</button></div>`, 620);
  };
  window.mp230SetelanSimpan = async () => {
    const g = id => document.getElementById(id), ps = g('mp230SPesan'), ok = g('mp230SOk');
    const data = { provider: g('mp230SProv').value, gerbang: (document.querySelector('input[name="mp230SG"]:checked') || {}).value || 'kunci', otomatis: g('mp230SOto').checked,
      npwpPembeli: g('mp230SNpwp').value.replace(/\D/g, ''), namaPembeli: g('mp230SNama').value.trim(), batasMeterai: Number(g('mp230SMet').value) || 0, toleransi: Number(g('mp230STol').value) || 0 };
    ok.disabled = true;
    try { VT.info = await regAksi('vtSetel', { data }); tutup(); segarDash(); pesan('Setelan verifikasi tagihan disimpan.', 'ok'); }
    catch (err) { ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0">' + E(err.message) + '</div>'; ok.disabled = false; }
  };

  /* ======================= 6. GERBANG VERIFIKASI ADMIN ======================= */
  function kotakGerbang() {
    const f = F(), w = document.getElementById('mp219Lapis'), db = w && w.querySelector('.mp219-db'); if (!db || !f.rec || db.querySelector('.mp230-gb')) return;
    const id = f.rec.id, v = VT.ringkas[id], wajib = gerbangKini() !== 'peringatan', kunci = terkunci(id);
    const lolos = !!(v && !v.kedaluwarsa && v.keputusan === 'LOLOS');
    const judul = kunci ? 'TERKUNCI — temuan Kritis/Mayor belum diselesaikan' : lolos ? 'Hasil Verifikasi Dokumen (AI): LOLOS' : !v ? 'Belum ada hasil Verifikasi Dokumen (AI)' : v.kedaluwarsa ? 'Hasil Verifikasi Dokumen (AI) kedaluwarsa' : 'Hasil Verifikasi Dokumen (AI): BUTUH REVISI';
    db.insertAdjacentHTML('afterbegin', `<div class="mp230-gb ${lolos ? 'ok' : wajib || kunci ? 'no' : 'warn'}"><div class="mp230-gb-h"><i class="fas ${lolos ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i><b>${judul}</b>${v ? `<small>${E(tglJam(v.pada))}</small>` : ''}</div>
      ${kunci ? '<p class="mb-1">Gerbang <b>Kunci</b>: Verifikasi Admin dan pengajuan pembayaran ditolak server. Kembalikan dokumen ke vendor (Surat Permintaan Perbaikan), ganti PDF, lalu jalankan verifikasi ulang.</p>' : ''}
      ${!lolos && v && !v.kedaluwarsa ? `<ul>${(v.teratas || []).map(t => `<li>${E(t)}</li>`).join('')}</ul>` : ''}
      ${lolos || kunci ? (kunci && bolehJalan() ? `<div class="mp230-gb-a"><button type="button" class="btn btn-sm btn-outline-primary" onclick="mp219TutupLapis();mp230ClTab()"><i class="fas fa-file-shield me-1"></i>Lihat laporan</button></div>` : '') : `<div class="mp230-gb-a">${bolehJalan() ? `<button type="button" class="btn btn-sm btn-outline-primary" onclick="mp219TutupLapis();mp230ClTab()"><i class="fas fa-file-shield me-1"></i>${v ? 'Lihat / jalankan ulang' : 'Jalankan verifikasi'}</button>` : ''}</div>
        <label for="mp230VfAlasan" class="form-label small mb-1 mt-2">Alasan pengecualian ${wajib ? '<b>(wajib, min. 20 karakter)</b>' : '(opsional, dicatat di Log)'}</label>
        <textarea class="form-control form-control-sm" id="mp230VfAlasan" rows="2" maxlength="300" placeholder="mis. Rekening telah dikonfirmasi via surat pernyataan vendor No. …"></textarea>`}</div>`);
    if (kunci) { const b = document.getElementById('mp219VfOk'); if (b) { b.disabled = true; b.title = 'Terkunci oleh Verifikasi Tagihan'; } }
  }
  (function () {
    const vf = window.mp219ClVerifikasi;
    if (typeof vf === 'function') window.mp219ClVerifikasi = function () { const r = vf.apply(this, arguments); try { if (aktif()) kotakGerbang(); } catch (e) { console.warn('[2.4.0] gerbang', e); } return r; };
    const ok = window.mp219ClVerifikasiOk;
    if (typeof ok === 'function') window.mp219ClVerifikasiOk = function () {
      const a = document.getElementById('mp230VfAlasan'), set = (VT.info && VT.info.setelan) || {}, ps = document.getElementById('mp219VfPesan');
      if (F().rec && terkunci(F().rec.id)) { if (ps) ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0">Terkunci: temuan Kritis/Mayor harus diselesaikan dan diverifikasi ulang.</div>'; return; }
      if (a && (set.gerbang || 'kunci') !== 'peringatan' && a.value.trim().length < 20) { if (ps) ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0">Gerbang verifikasi: isi alasan pengecualian minimal 20 karakter, atau jalankan Verifikasi Dokumen hingga LOLOS.</div>'; a.focus(); return; }
      return ok.apply(this, arguments);
    };
    const ra = window.regAksi;
    if (typeof ra === 'function') window.regAksi = async function (aksi, extra) {
      if (aksi === 'checklistVerifikasi' && extra && extra.data) { const a = document.getElementById('mp230VfAlasan'); if (a && a.value.trim()) extra.data.vtAlasan = a.value.trim(); }
      const r = await ra.apply(this, arguments);
      try { if (aksi === 'checklistSimpan' && r && r.data && r.data.id) otomatis(r.data); } catch (e) { }
      return r;
    };
  })();

  /* ======================= 7. OTOMATIS SAAT CHECKLIST LENGKAP ======================= */
  function otomatis(rec) {
    if (!bolehJalan() || !VT.info || !VT.info.setelan || VT.info.setelan.otomatis === false || !(VT.info.penyedia || []).length) return;
    let h; try { h = window.MP219_HITUNG(rec); } catch (e) { return; } if (!h.total || h.kurang.length) return;
    const id = rec.id;
    setTimeout(async () => {
      try {
        const r = await regAksi('vtRingkas'); (r.data || []).forEach(x => { VT.ringkas[x.id] = x; });
        const v = VT.ringkas[id]; if (v && !v.kedaluwarsa) return;
        delete VT.lap[id]; pesan('Checklist lengkap — Verifikasi Dokumen (AI) berjalan di latar…', '');
        const L = await jalankan(id);
        if (L) pesan('Verifikasi Dokumen selesai: ' + L.keputusan + '. Lihat tab "Verifikasi AI" pada checklist.', L.keputusan === 'LOLOS' ? 'ok' : 'err');
      } catch (err) { console.warn('[2.4.0] verifikasi otomatis', err); }
    }, 1500);
  }

  /* ======================= PEMASANGAN ======================= */
  function kunciKaki() {   // 2.4.0: tombol Verifikasi Admin di kaki modal dikunci bila gerbang kunci + temuan Kritis/Mayor
    const f = F(), k = document.getElementById('mp219ClKaki'); if (!k || !f.rec || !aktif()) return;
    const b = [...k.querySelectorAll('button')].find(x => /mp219ClVerifikasi\(\)/.test(x.getAttribute('onclick') || '')); if (!b) return;
    const kunci = terkunci(f.rec.id), ada = k.querySelector('.mp240-kunci');
    if (kunci) { b.disabled = true; b.title = 'Terkunci: temuan Kritis/Mayor (Verifikasi Tagihan)'; if (!ada) b.insertAdjacentHTML('beforebegin', '<span class="mp240-kunci"><i class="fas fa-lock me-1"></i>Verifikasi &amp; bayar terkunci</span>'); }
    else if (ada) ada.remove();
  }
  function ikat() {
    const k = document.getElementById('keuIsi');
    if (k && !VT.obsKeu) { VT.obsKeu = new MutationObserver(() => { try { pasangKeu(); } catch (e) { console.warn('[2.4.0] keu', e); } VT.obsKeu.takeRecords(); }); VT.obsKeu.observe(k, { childList: true }); pasangKeu(); }
    const c = document.getElementById('mp219ClIsi');
    const kk = document.getElementById('mp219ClKaki');
    if (kk && !VT.obsKaki) { VT.obsKaki = new MutationObserver(() => { try { kunciKaki(); } catch (e) { } VT.obsKaki.takeRecords(); }); VT.obsKaki.observe(kk, { childList: true }); kunciKaki(); }
    if (c && !VT.obsCl) { VT.obsCl = new MutationObserver(() => { try { pasangCl(); } catch (e) { console.warn('[2.4.0] checklist', e); } VT.obsCl.takeRecords(); }); VT.obsCl.observe(c, { childList: true }); pasangCl(); }
  }
  (function () {
    const tab = window.mp219ClTab;
    if (typeof tab === 'function') window.mp219ClTab = function () { VT.clAktif = false; const isi = document.getElementById('mp219ClIsi'); const b = isi && isi.querySelector('.mp219-tabs-s [data-vt]'); if (b) b.classList.remove('on'); return tab.apply(this, arguments); };
    const buka = window.cl217Buka;
    if (typeof buka === 'function') window.cl217Buka = async function (id) { if (VT.clMinta !== id) VT.clMinta = ''; VT.clAktif = false; if (VT.lap[id] !== undefined && VT.ringkas[id] && VT.ringkas[id].kedaluwarsa) delete VT.lap[id]; const r = await buka.apply(this, arguments); try { ikat(); pasangCl(); } catch (e) { } return r; };
    const keu = window.mp219Keu;
    if (typeof keu === 'function') window.mp219Keu = function () { ikat(); return keu.apply(this, arguments); };
    const rk = window.renderKeuangan;
    if (typeof rk === 'function') window.renderKeuangan = function () { ikat(); return rk.apply(this, arguments); };
    const kl = window.keluarLogin;
    if (typeof kl === 'function') window.keluarLogin = function () { VT.kunci = ''; cekKunci(); VT.jalan = {}; return kl.apply(this, arguments); };
    const bt = window.bukaTab;
    if (typeof bt === 'function') window.bukaTab = function (tab) { const r = bt.apply(this, arguments); if (tab === 'keuangan') setTimeout(ikat, 0); return r; };
  })();
  ikat();
  window.addEventListener('load', () => setTimeout(ikat, 500));
  setInterval(() => { if (!document.hidden) ikat(); }, 5000);
})();
