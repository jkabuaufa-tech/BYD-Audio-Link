
/* MP230 — PEMBARUAN 2.3.0 — VERIFIKASI TAGIHAN (AI Auditor) di menu Keuangan & Bayar (butuh Modul server 1.6.0)
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
  const VERSI = '2.3.0';
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

  /* ---------- data server ---------- */
  function cekKunci() { const k = pid() + '|' + ((sesi() || {}).nama || '') + '|' + ((typeof REG !== 'undefined' && REG.url) || ''); if (VT.kunci !== k) { VT.kunci = k; VT.info = null; VT.ringkas = {}; VT.siap = false; VT.lap = {}; VT.riwayat = {}; } }
  async function muat(paksa) {
    cekKunci(); if (!aktif() || VT.muat || (VT.siap && !paksa)) return;
    VT.muat = true;
    try {
      const [i, r] = await Promise.all([regAksi('vtInfo'), regAksi('vtRingkas')]);
      VT.info = i; VT.ringkas = {}; (r.data || []).forEach(x => { VT.ringkas[x.id] = x; }); VT.siap = true; VT.galat = '';
    } catch (err) { VT.galat = err.message; console.warn('[2.3.0] verifikasi tagihan', err); }
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
        if (st && s !== 'TIDAK_LENGKAP') st.insertAdjacentHTML('beforeend', `<div class="mp230-sel" title="Hasil Verifikasi Dokumen (AI)">${lencana(s, true)}</div>`);
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
        <div class="mp230-meta"><span><i class="fas fa-microchip"></i>${prov ? E(prov.nama) + ' · ' + E(prov.model) : '<b class="text-danger">Belum ada penyedia AI pembaca PDF</b>'}</span><span><i class="fas fa-shield-halved"></i>Gerbang: <b>${set.gerbang === 'wajib' ? 'Wajib' : 'Peringatan'}</b></span><span><i class="fas fa-bolt"></i>Otomatis: <b>${set.otomatis === false ? 'Mati' : 'Aktif'}</b></span></div></div></div>
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
          <td data-l="Hasil">${lencana(x.s)}<div class="mp230-ns">${x.s === 'PROSES' && j ? E(j.ket || '') : hitungTemuan(v)}</div></td>
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
    const id = f.rec.id;
    if (VT.lap[id] === undefined && VT.ringkas[id] && !VT.jalan[id]) {
      el.innerHTML = '<div class="p-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Memuat laporan verifikasi…</div>';
      muatLap(id).then(() => gambarCl(), err => { el.innerHTML = `<div class="alert alert-danger m-3">Laporan tidak dapat dimuat: ${E(err.message)}</div>`; });
      return;
    }
    el.innerHTML = `<div class="mp230-pn">${panelVt(id)}</div>`;
  }
  function panelVt(id) {
    const f = F(), j = VT.jalan[id], lap = VT.lap[id], v = VT.ringkas[id];
    let h = { total: 0, lengkap: 0, kurang: [] }; try { h = window.MP219_HITUNG(f.rec); } catch (e) { }
    const tombolJalan = (teks, ikon) => bolehJalan() ? `<button type="button" class="btn btn-primary btn-sm" onclick="mp230Jalan('${E(id)}')" ${j && j.fase !== 'selesai' && j.fase !== 'gagal' ? 'disabled' : ''}><i class="fas ${ikon || 'fa-play'} me-1"></i>${teks}</button>` : '';
    if (f.dirty) return `<div class="alert alert-warning m-3"><i class="fas fa-floppy-disk me-1"></i>Simpan perubahan checklist dahulu — verifikasi membaca PDF yang sudah tersimpan di server.</div>`;
    let atas = '';
    if (j && j.fase !== 'selesai') atas = progres(id, j);
    if (!lap) {
      return atas + (j && j.fase !== 'gagal' && j.fase !== 'selesai' ? '' : `<div class="mp230-mulai"><i class="fas fa-file-shield"></i><h6>Verifikasi Dokumen Tagihan</h6>
        <p>Memeriksa ${h.total} dokumen checklist: kelengkapan 6 dokumen wajib (Kwitansi, Invoice, Faktur Pajak, Surat Jalan, BAP, BAPM — atau penggantinya BAPP/BAPA/BAST), kesesuaian nilai &amp; PPN, legalitas (meterai, tanda tangan, nomor seri faktur), rekening, dan rincian barang.</p>
        ${h.kurang && h.kurang.length ? `<div class="alert alert-warning py-2 small text-start">${h.kurang.length} dokumen belum lengkap — akan dilaporkan sebagai <b>Kurang</b>.</div>` : ''}
        ${tombolJalan('Mulai verifikasi')}${bolehJalan() ? '' : '<p class="small text-muted mt-2 mb-0">Verifikasi dijalankan oleh Pengadaan/Admin.</p>'}</div>`);
    }
    return atas + laporan(lap, v, id);
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
          ${g.L.map(t => `<div class="mp230-tm"><code>${E(t.kode)}</code><div><b>${E(t.judul)}</b><p>${E(t.detail)}</p>${(t.dokumen || []).length ? `<small><i class="fas fa-paperclip me-1"></i>${E(t.dokumen.join(', '))}</small>` : ''}</div></div>`).join('')}</div>`).join('')}</section>
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
  function segar(id) { const f = F(); if (VT.clAktif && f.rec && f.rec.id === id) gambarCl(); segarDash(); }
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
  window.mp230Cetak = async (id, jenis) => {
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
          <label class="form-check"><input class="form-check-input" type="radio" name="mp230SG" value="peringatan" ${s.gerbang !== 'wajib' ? 'checked' : ''}> <b>Peringatan</b> — hasil AI ditampilkan; Admin tetap dapat memverifikasi (dicatat di Log).</label>
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
    const data = { provider: g('mp230SProv').value, gerbang: (document.querySelector('input[name="mp230SG"]:checked') || {}).value || 'peringatan', otomatis: g('mp230SOto').checked,
      npwpPembeli: g('mp230SNpwp').value.replace(/\D/g, ''), namaPembeli: g('mp230SNama').value.trim(), batasMeterai: Number(g('mp230SMet').value) || 0, toleransi: Number(g('mp230STol').value) || 0 };
    ok.disabled = true;
    try { VT.info = await regAksi('vtSetel', { data }); tutup(); segarDash(); pesan('Setelan verifikasi tagihan disimpan.', 'ok'); }
    catch (err) { ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0">' + E(err.message) + '</div>'; ok.disabled = false; }
  };

  /* ======================= 6. GERBANG VERIFIKASI ADMIN ======================= */
  function kotakGerbang() {
    const f = F(), w = document.getElementById('mp219Lapis'), db = w && w.querySelector('.mp219-db'); if (!db || !f.rec || db.querySelector('.mp230-gb')) return;
    const id = f.rec.id, v = VT.ringkas[id], set = (VT.info && VT.info.setelan) || {}, wajib = set.gerbang === 'wajib';
    const lolos = !!(v && !v.kedaluwarsa && v.keputusan === 'LOLOS');
    const judul = lolos ? 'Hasil Verifikasi Dokumen (AI): LOLOS' : !v ? 'Belum ada hasil Verifikasi Dokumen (AI)' : v.kedaluwarsa ? 'Hasil Verifikasi Dokumen (AI) kedaluwarsa' : 'Hasil Verifikasi Dokumen (AI): BUTUH REVISI';
    db.insertAdjacentHTML('afterbegin', `<div class="mp230-gb ${lolos ? 'ok' : wajib ? 'no' : 'warn'}"><div class="mp230-gb-h"><i class="fas ${lolos ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i><b>${judul}</b>${v ? `<small>${E(tglJam(v.pada))}</small>` : ''}</div>
      ${!lolos && v && !v.kedaluwarsa ? `<ul>${(v.teratas || []).map(t => `<li>${E(t)}</li>`).join('')}</ul>` : ''}
      ${lolos ? '' : `<div class="mp230-gb-a">${bolehJalan() ? `<button type="button" class="btn btn-sm btn-outline-primary" onclick="mp219TutupLapis();mp230ClTab()"><i class="fas fa-file-shield me-1"></i>${v ? 'Lihat / jalankan ulang' : 'Jalankan verifikasi'}</button>` : ''}</div>
        <label for="mp230VfAlasan" class="form-label small mb-1 mt-2">Alasan pengecualian ${wajib ? '<b>(wajib, min. 20 karakter)</b>' : '(opsional, dicatat di Log)'}</label>
        <textarea class="form-control form-control-sm" id="mp230VfAlasan" rows="2" maxlength="300" placeholder="mis. Rekening telah dikonfirmasi via surat pernyataan vendor No. …"></textarea>`}</div>`);
  }
  (function () {
    const vf = window.mp219ClVerifikasi;
    if (typeof vf === 'function') window.mp219ClVerifikasi = function () { const r = vf.apply(this, arguments); try { if (aktif()) kotakGerbang(); } catch (e) { console.warn('[2.3.0] gerbang', e); } return r; };
    const ok = window.mp219ClVerifikasiOk;
    if (typeof ok === 'function') window.mp219ClVerifikasiOk = function () {
      const a = document.getElementById('mp230VfAlasan'), set = (VT.info && VT.info.setelan) || {}, ps = document.getElementById('mp219VfPesan');
      if (a && set.gerbang === 'wajib' && a.value.trim().length < 20) { if (ps) ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0">Gerbang verifikasi wajib: isi alasan pengecualian minimal 20 karakter, atau jalankan Verifikasi Dokumen hingga LOLOS.</div>'; a.focus(); return; }
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
      } catch (err) { console.warn('[2.3.0] verifikasi otomatis', err); }
    }, 1500);
  }

  /* ======================= PEMASANGAN ======================= */
  function ikat() {
    const k = document.getElementById('keuIsi');
    if (k && !VT.obsKeu) { VT.obsKeu = new MutationObserver(() => { try { pasangKeu(); } catch (e) { console.warn('[2.3.0] keu', e); } VT.obsKeu.takeRecords(); }); VT.obsKeu.observe(k, { childList: true }); pasangKeu(); }
    const c = document.getElementById('mp219ClIsi');
    if (c && !VT.obsCl) { VT.obsCl = new MutationObserver(() => { try { pasangCl(); } catch (e) { console.warn('[2.3.0] checklist', e); } VT.obsCl.takeRecords(); }); VT.obsCl.observe(c, { childList: true }); pasangCl(); }
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
