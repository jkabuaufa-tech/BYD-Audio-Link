/* MP250 — PEMBARUAN 2.5.0 — TIM AI PROYEK (butuh Modul server 1.8.0 · fitur "timAI")
 *  Tim agen AI yang bekerja terus: Verifikator Tagihan, Analis Kontrak & Pengadaan, Analis Keuangan, Analis Gudang, Penyusun Laporan.
 *  Bekerja otomatis pada jam terjadwal (pemicu harian server) atau "Jalankan sekarang"; hasil: laporan, temuan, saran prioritas yang dapat
 *  langsung dijalankan (aksi baca → hasil; aksi tulis → usulan dengan pratinjau → Terapkan oleh Pengadaan/Admin), log kerja per anggota.
 *  Akses: menu akun › "Tim AI Proyek" · Ctrl+K "tim ai". Tanpa perubahan data oleh AI tanpa persetujuan manusia.
 */
(function () {
  'use strict';
  if (window.__MP250__) return; window.__MP250__ = true;
  const E = v => (typeof escHtml === 'function' ? escHtml(v == null ? '' : String(v)) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const rp = v => 'Rp ' + Math.round(N(v)).toLocaleString('id-ID');
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const adm = () => !!(sesi() && sesi().admin);
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const aktif = () => !!(sesi() && typeof REG !== 'undefined' && REG.url && srv('timAI'));
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const tglJam = s => { const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const tgl = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? Number(m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : ''; };
  const PRI = { tinggi: ['Tinggi', '#C0262D'], sedang: ['Sedang', '#B7791F'], rendah: ['Rendah', '#5B6B82'] };
  const TM = { info: null, tab: 'laporan', jalan: false, hasil: {}, filter: 'aktif' };
  window.MP250_TM = TM;
  const anggota = id => ((TM.info && TM.info.anggota) || []).find(a => a.id === id) || { nama: id, ikon: 'fa-user' };

  /* ---------- dialog ---------- */
  function lapis(html) {
    let w = document.getElementById('mp250Lapis');
    if (!w) {
      w = document.createElement('div'); w.id = 'mp250Lapis'; w.className = 'mp219-lapis mp250-lapis';
      w.addEventListener('mousedown', ev => { if (ev.target === w) tutup(); });
      w.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); tutup(); } });
      document.body.appendChild(w);
    }
    w.innerHTML = `<div class="mp219-dlg mp250-dlg" role="dialog" aria-modal="true" aria-labelledby="mp250Judul">${html}</div>`;
    return w;
  }
  function tutup() { const w = document.getElementById('mp250Lapis'); if (w) w.remove(); }
  window.mp250Tutup = tutup;

  async function muat() { TM.info = await regAksi('timInfo'); return TM.info; }
  window.mp250Buka = async tab => {
    if (!aktif()) { pesan('Tim AI Proyek membutuhkan Modul server 1.8.0. Minta Admin menerbitkan modul terbaru.', 'err'); return; }
    if (tab) TM.tab = tab;
    lapis(`<div class="mp219-dh"><h5 id="mp250Judul"><i class="fas fa-people-group me-2"></i>Tim AI Proyek</h5><button type="button" class="btn-close" aria-label="Tutup" onclick="mp250Tutup()"></button></div><div class="mp219-db"><div class="p-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Memuat laporan tim…</div></div>`);
    try { await muat(); gambar(); } catch (err) { lapis(`<div class="mp219-dh"><h5 id="mp250Judul">Tim AI Proyek</h5><button type="button" class="btn-close" aria-label="Tutup" onclick="mp250Tutup()"></button></div><div class="mp219-db"><div class="alert alert-danger m-3">${E(err.message)}</div></div>`); }
  };
  function gambar() {
    if (!document.getElementById('mp250Lapis')) return;
    const I = TM.info || {}, s = I.setelan || {}, L = I.laporan, tabs = [['laporan', 'Laporan & Saran', 'fa-clipboard-list'], ['tim', 'Anggota & Log Kerja', 'fa-people-group'], ['antrean', 'Antrean (' + (I.antrean || []).length + ')', 'fa-list-ol'], ['riwayat', 'Riwayat', 'fa-clock-rotate-left']].concat(I.admin ? [['setelan', 'Setelan', 'fa-sliders']] : []);
    if (!tabs.some(t => t[0] === TM.tab)) TM.tab = 'laporan';
    const status = `<div class="mp250-status"><span class="mp250-pill ${s.aktif ? 'on' : ''}"><i class="fas ${s.aktif ? 'fa-circle-play' : 'fa-circle-pause'} me-1"></i>${s.aktif ? 'Bekerja otomatis jam ' + (s.jam || []).map(h => String(h).padStart(2, '0') + '.00').join(', ') + ' WIB' : 'Jadwal otomatis nonaktif'}</span>
      <span>Terakhir: <b>${L ? E(tglJam(L.pada)) + ' (' + (L.pemicu === 'jadwal' ? 'jadwal' : E(L.oleh)) + ')' : 'belum pernah'}</b></span>
      <span>Kuota AI tim hari ini: <b>${N(I.kuota && I.kuota.pakai)}/${N(I.kuota && I.kuota.batas)}</b></span>
      ${I.bolehJalan ? `<button type="button" class="btn btn-primary btn-sm ms-auto" id="mp250Jalan" onclick="mp250Jalan()" ${TM.jalan ? 'disabled' : ''}><i class="fas ${TM.jalan ? 'fa-spinner fa-spin' : 'fa-play'} me-1"></i>${TM.jalan ? 'Tim sedang bekerja…' : 'Jalankan sekarang'}</button>` : ''}</div>`;
    const isi = TM.jalan ? `<div class="mp250-kerja"><i class="fas fa-gears fa-spin"></i><div><b>Tim AI sedang bekerja</b><span>Verifikator membaca bundel/PDF tagihan yang lengkap, analis memeriksa kontrak, keuangan & gudang, lalu Penyusun Laporan merangkum saran. Biasanya 1–5 menit — jendela ini boleh ditutup.</span></div></div>`
      : TM.tab === 'tim' ? viewTim(I) : TM.tab === 'antrean' ? viewAntrean(I) : TM.tab === 'riwayat' ? viewRiwayat(I) : TM.tab === 'setelan' ? viewSetelan(I) : viewLaporan(I);
    lapis(`<div class="mp219-dh"><h5 id="mp250Judul"><i class="fas fa-people-group me-2"></i>Tim AI Proyek</h5><button type="button" class="btn-close" aria-label="Tutup" onclick="mp250Tutup()"></button></div>
      <div class="mp219-db mp250-db">${status}
        <div class="mp250-tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" aria-selected="${TM.tab === t[0]}" class="${TM.tab === t[0] ? 'on' : ''}" onclick="mp250Tab('${t[0]}')"><i class="fas ${t[2]} me-1"></i>${E(t[1])}</button>`).join('')}</div>
        <div class="mp250-isi">${isi}</div></div>`);
  }
  window.mp250Tab = t => { TM.tab = t; gambar(); };

  function viewLaporan(I) {
    const L = I.laporan;
    if (!L) return `<div class="mp250-kosong"><i class="fas fa-people-group"></i><h6>Tim belum pernah bekerja</h6><p>Tekan <b>Jalankan sekarang</b> atau minta Admin mengaktifkan jadwal otomatis di tab Setelan. Tim akan memverifikasi tagihan yang lengkap, memeriksa kontrak, keuangan & gudang, lalu memberi laporan dan saran.</p></div>`;
    const m = L.metrik || {}, V = L.verifikasi || { diverifikasi: [], tertunda: [] };
    const kotak = [['Diverifikasi tim', V.diverifikasi.length, 'fa-file-shield', '#1763B3'], ['Tagihan tertahan', m.tagihanTertahan, 'fa-hourglass-half', '#B7791F'], ['Butuh revisi', m.butuhRevisi, 'fa-triangle-exclamation', '#C0262D'],
      ['Stok minus', m.stokMinus, 'fa-boxes-stacked', '#D9480F'], ['Bon belum penuh', m.bonBelumPenuh, 'fa-truck-ramp-box', '#5B6B82'], ['Kontrak belum lengkap', m.kontrakBelumLengkap, 'fa-file-contract', '#5B4BC4']];
    const sar = (L.saran || []).filter(z => TM.filter === 'semua' || ['selesai', 'abaikan'].indexOf(z.status) < 0);
    return `<p class="mp250-ring">${E(L.ringkasan)}</p>
      <div class="mp250-kotak">${kotak.map(k => `<div style="--p:${k[3]}"><i class="fas ${k[2]}"></i><b>${N(k[1])}</b><span>${k[0]}</span></div>`).join('')}</div>
      ${V.diverifikasi.length || V.tertunda.length ? `<h6 class="mp250-h"><i class="fas fa-file-shield me-1"></i>Hasil kerja Verifikator Tagihan</h6>
        <div class="mp219-tw"><table class="mp219-tb mp219-tb-s mp250-tb"><thead><tr><th>Tagihan</th><th>Hasil</th><th>Temuan utama</th><th></th></tr></thead><tbody>
        ${V.diverifikasi.map(r => `<tr><td><b>${E(r.nomorBA || r.id)}</b><div class="sub">${E(r.noKontrak)}${r.vendor ? ' · ' + E(r.vendor) : ''}</div></td>
          <td class="nw"><span class="mp250-kp ${r.keputusan === 'LOLOS' ? 'ok' : 'no'}">${E(r.keputusan)}</span><div class="sub">K${N(r.ringkas && r.ringkas.kritis)} · M${N(r.ringkas && r.ringkas.mayor)} · m${N(r.ringkas && r.ringkas.minor)}</div></td>
          <td class="sub">${(r.teratas || []).map(E).join('<br>') || '—'}</td><td><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp250BukaTagihan('${E(r.id)}')">Buka</button></td></tr>`).join('')}
        ${V.tertunda.map(r => `<tr class="tunda"><td><b>${E(r.nomorBA || r.id)}</b></td><td><span class="mp250-kp">TERTUNDA</span></td><td class="sub">${E(r.alasan)}</td><td><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp250BukaTagihan('${E(r.id)}')">Buka</button></td></tr>`).join('')}</tbody></table></div>
        ${V.berhenti ? `<div class="alert alert-warning py-2 small mt-2"><i class="fas fa-key me-1"></i>${E(V.berhenti)}</div>` : ''}` : ''}
      ${(L.temuan || []).length ? `<h6 class="mp250-h"><i class="fas fa-magnifying-glass me-1"></i>Temuan</h6><ul class="mp250-tm">${L.temuan.map(t => `<li style="--p:${(PRI[t.tingkat] || PRI.sedang)[1]}"><b>${E(t.judul)}</b><span>${E(t.detail)}</span><small>${E(anggota(t.anggota).nama)}</small></li>`).join('')}</ul>` : ''}
      <h6 class="mp250-h"><i class="fas fa-lightbulb me-1"></i>Saran prioritas <small>${sar.length} ditampilkan</small>
        <select class="form-select form-select-sm mp250-flt" aria-label="Saring saran" onchange="mp250Filter(this.value)"><option value="aktif" ${TM.filter === 'aktif' ? 'selected' : ''}>Belum ditindaklanjuti</option><option value="semua" ${TM.filter === 'semua' ? 'selected' : ''}>Semua</option></select></h6>
      ${sar.length ? `<div class="mp250-saran">${sar.map(kartuSaran).join('')}</div>` : '<p class="mp230-muted">Tidak ada saran yang perlu ditindaklanjuti.</p>'}
      <p class="mp250-cat">Laporan ${E(tglJam(L.pada))} · ${L.ai ? 'disusun ' + E(L.ai) : 'disusun tanpa AI (data server)'} · ${N(L.durasi)} detik${L.kirim && L.kirim.email ? ' · email ' + (L.kirim.email.ok ? 'terkirim ke ' + N(L.kirim.email.n) + ' penerima' : 'gagal: ' + E(L.kirim.email.galat)) : ''}. Tim AI tidak mengubah data tanpa persetujuan: aksi tulis selalu berupa usulan yang diterapkan Pengadaan/Admin.</p>`;
  }
  function kartuSaran(z) {
    const p = PRI[z.prioritas] || PRI.sedang, a = anggota(z.anggota), h = TM.hasil[z.sid], boleh = TM.info && TM.info.bolehJalan;
    const tombol = !boleh ? '' : z.jenis === 'buka' && z.id ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp250BukaTagihan('${E(z.id)}')"><i class="fas fa-up-right-from-square me-1"></i>Buka tagihan</button>`
      : z.jenis === 'aksi' && z.aksi ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp250Aksi('${E(z.sid)}')" ${h && h.proses ? 'disabled' : ''}><i class="fas ${h && h.proses ? 'fa-spinner fa-spin' : 'fa-bolt'} me-1"></i>Jalankan</button>` : '';
    const st = z.status === 'selesai' ? '<span class="mp250-st ok"><i class="fas fa-check me-1"></i>Selesai</span>' : z.status === 'abaikan' ? '<span class="mp250-st">Diabaikan</span>' : '';
    return `<article class="mp250-kartu ${z.status === 'selesai' || z.status === 'abaikan' ? 'redup' : ''}" style="--p:${p[1]}">
      <header><span class="mp250-pr">${p[0]}</span><span class="mp250-ag"><i class="fas ${E(a.ikon || 'fa-user')} me-1"></i>${E(a.nama)}</span>${st}</header>
      <b>${E(z.judul)}</b>${z.dampak ? `<p>${E(z.dampak)}</p>` : ''}
      ${z.pj || z.tenggat ? `<small>${z.pj ? 'PJ: ' + E(z.pj) : ''}${z.pj && z.tenggat ? ' · ' : ''}${z.tenggat ? 'Tenggat: ' + E(tgl(z.tenggat)) : ''}</small>` : ''}
      ${z.aksi ? `<code>${E(z.aksi)}</code>` : ''}
      ${h && h.teks ? `<div class="mp250-hasil">${h.teks}</div>` : ''}
      ${boleh ? `<footer>${tombol}${z.status === 'selesai' || z.status === 'abaikan' ? `<button type="button" class="btn btn-sm mp219-btn-o" onclick="mp250Tandai('${E(z.sid)}','baru')">Buka lagi</button>`
        : `<button type="button" class="btn btn-sm mp219-btn-o" onclick="mp250Tandai('${E(z.sid)}','selesai')"><i class="fas fa-check me-1"></i>Tandai selesai</button><button type="button" class="btn btn-sm btn-link text-muted" onclick="mp250Tandai('${E(z.sid)}','abaikan')">Abaikan</button>`}</footer>` : ''}
    </article>`;
  }
  window.mp250Filter = v => { TM.filter = v; gambar(); };
  const cariSaran = sid => ((TM.info && TM.info.laporan && TM.info.laporan.saran) || []).find(z => z.sid === sid);
  window.mp250Tandai = async (sid, status) => {
    const z = cariSaran(sid); if (!z) return;
    try { await regAksi('timSaran', { data: { sid, status, judul: z.judul } }); z.status = status; gambar(); pesan(status === 'selesai' ? 'Saran ditandai selesai.' : status === 'abaikan' ? 'Saran diabaikan — tidak akan diusulkan lagi.' : 'Saran dibuka kembali.', 'ok'); }
    catch (err) { pesan(err.message, 'err'); }
  };
  window.mp250Aksi = async sid => {
    const z = cariSaran(sid); if (!z || !z.aksi) return;
    TM.hasil[sid] = { proses: true }; gambar();
    try {
      const r = await regAksi('aiAksi', { data: { aksi: z.aksi, arg: z.arg || {}, alasan: 'Saran Tim AI: ' + z.judul } });
      if (r.jenis === 'baca') TM.hasil[sid] = { teks: `<b>${E(r.judul || z.aksi)}</b>${r.berhasil === false ? ' <span class="text-danger">(gagal)</span>' : ''}<pre>${E(String(r.ringkas || '').slice(0, 3000))}</pre>` };
      else { const u = r.usulan || {}, pr = u.pratinjau || {};
        TM.hasil[sid] = { teks: `<b>Usulan: ${E(u.judul || z.aksi)}</b><div class="small">${E(pr.ringkas || '')}${(pr.peringatan || []).length ? '<br><span class="text-warning">' + E(pr.peringatan.join('; ')) + '</span>' : ''}${pr.galat ? '<br><span class="text-danger">' + E(pr.galat) + '</span>' : ''}</div>
          ${u.token && u.boleh ? `<div class="d-flex gap-2 mt-1"><button type="button" class="btn btn-sm btn-success" onclick="mp250Terapkan('${E(sid)}','${E(u.token)}')"><i class="fas fa-check me-1"></i>Terapkan</button><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp250Terapkan('${E(sid)}','${E(u.token)}',true)">Batal</button></div>` : `<div class="small text-muted">${E(u.catatan || 'Pratinjau belum siap — lengkapi data lalu coba lagi.')}</div>`}` }; }
    } catch (err) { TM.hasil[sid] = { teks: `<span class="text-danger">${E(err.message)}</span>` }; }
    gambar();
  };
  window.mp250Terapkan = async (sid, token, batal) => {
    try { const r = await regAksi('aiTerapkan', { data: { token, batal: !!batal } }); TM.hasil[sid] = { teks: batal ? 'Usulan dibatalkan.' : '<span class="text-success"><i class="fas fa-check me-1"></i>Diterapkan.</span>' };
      if (!batal) { const z = cariSaran(sid); if (z) { await regAksi('timSaran', { data: { sid, status: 'selesai', judul: z.judul } }); z.status = 'selesai'; } } pesan(batal ? 'Usulan dibatalkan.' : 'Aksi diterapkan.', 'ok'); }
    catch (err) { TM.hasil[sid] = { teks: `<span class="text-danger">${E(err.message)}</span>` }; }
    gambar();
  };
  window.mp250BukaTagihan = id => {
    tutup();
    if (typeof window.bukaTab === 'function') window.bukaTab('keuangan'); else if (typeof window.showTab === 'function') window.showTab('keuangan');
    setTimeout(() => { if (typeof window.mp230Buka === 'function') window.mp230Buka(id); else if (typeof window.cl217Buka === 'function') window.cl217Buka(id); }, 350);
  };
  window.mp250Jalan = async () => {
    if (TM.jalan || !(TM.info && TM.info.bolehJalan)) return;
    TM.jalan = true; gambar();
    try {
      const r = await regAksi('timJalan'), L = r.data || {};
      pesan('Tim AI selesai: ' + ((L.verifikasi && L.verifikasi.diverifikasi) || []).length + ' tagihan diverifikasi · ' + (L.saran || []).length + ' saran.', 'ok');
      TM.tab = 'laporan'; TM.hasil = {};
    } catch (err) { pesan('Tim AI: ' + err.message, 'err'); }
    finally { TM.jalan = false; try { await muat(); } catch (e) { } gambar(); }
  };

  function viewTim(I) {
    const L = I.laporan, log = (L && L.log) || [];
    return `<div class="mp250-ang">${(I.anggota || []).map(a => { const lg = log.filter(x => x.anggota === a.id);
      return `<section><header><i class="fas ${E(a.ikon)}"></i><div><b>${E(a.nama)}</b><span>${E(a.tugas)}</span></div></header>
        ${lg.length ? `<ol>${lg.map(x => `<li><small>${N(x.detik)} dtk</small>${E(x.teks)}</li>`).join('')}</ol>` : '<p class="mp230-muted mb-0">Belum ada catatan kerja.</p>'}</section>`; }).join('')}</div>`;
  }
  function viewAntrean(I) {
    const A = I.antrean || [];
    return A.length ? `<p class="mp250-cat mt-0">Tagihan yang checklist-nya lengkap atau sudah punya bundel, tetapi belum memiliki hasil verifikasi yang berlaku. Diproses tim pada putaran berikutnya (bundel didahulukan, lalu nilai terbesar; maks. ${N(I.setelan && I.setelan.maksTagihan)} tagihan / ${N(I.setelan && I.setelan.maksPdf)} PDF per putaran).</p>
      <div class="mp219-tw"><table class="mp219-tb mp219-tb-s"><thead><tr><th>No.</th><th>Tagihan</th><th>Kontrak</th><th class="r">Nilai</th><th>Sumber</th><th></th></tr></thead><tbody>
      ${A.map((r, i) => `<tr><td>${i + 1}</td><td><b>${E(r.nomorBA || r.id)}</b></td><td class="mono">${E(r.noKontrak)}</td><td class="r nw">${rp(r.nilai)}</td><td>${r.bundel ? '<span class="mp250-kp ok">Bundel</span>' : 'Checklist'}</td><td><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp250BukaTagihan('${E(r.id)}')">Buka</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="mp250-kosong"><i class="fas fa-check-double"></i><h6>Antrean kosong</h6><p>Semua tagihan yang lengkap sudah memiliki hasil verifikasi yang berlaku.</p></div>';
  }
  function viewRiwayat(I) {
    const R = I.riwayat || [];
    return R.length ? `<div class="mp219-tw"><table class="mp219-tb mp219-tb-s"><thead><tr><th>Waktu</th><th>Pemicu</th><th class="c">Verifikasi</th><th class="c">Saran</th><th>Ringkasan</th></tr></thead><tbody>
      ${R.map(r => `<tr><td class="nw">${E(tglJam(r.pada))}</td><td>${r.pemicu === 'jadwal' ? 'Jadwal' : E(r.oleh)}</td><td class="c">${N(r.diverifikasi)}</td><td class="c">${N(r.saran)}</td><td class="sub">${E(r.ringkasan)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mp230-muted p-3">Belum ada riwayat.</p>';
  }
  function viewSetelan(I) {
    const s = I.setelan || {}, pm = I.pemicu || {};
    return `<div class="mp250-set">
      <label class="form-check"><input class="form-check-input" type="checkbox" id="mp250SAktif" ${s.aktif ? 'checked' : ''}> <b>Aktifkan kerja otomatis terjadwal</b> (pemicu harian server, memasang ulang jadwal Notifikasi + Tim AI)</label>
      <div class="row g-2 mt-1"><div class="col-sm-4 mp219-fr"><label for="mp250SJam">Jam kerja (WIB, pisahkan koma)</label><input class="form-control" id="mp250SJam" value="${E((s.jam || []).join(', '))}" inputmode="numeric"></div>
        <div class="col-sm-4 mp219-fr"><label for="mp250STag">Maks. tagihan diverifikasi / putaran</label><input class="form-control" id="mp250STag" type="number" min="0" max="20" value="${N(s.maksTagihan)}"></div>
        <div class="col-sm-4 mp219-fr"><label for="mp250SPdf">Maks. PDF dibaca AI / putaran</label><input class="form-control" id="mp250SPdf" type="number" min="0" max="40" value="${N(s.maksPdf)}"></div></div>
      <label class="form-check mt-2"><input class="form-check-input" type="checkbox" id="mp250SVer" ${s.verifikasi !== false ? 'checked' : ''}> Verifikator Tagihan menjalankan verifikasi otomatis (memakai kuota AI tim)</label>
      <label class="form-check"><input class="form-check-input" type="checkbox" id="mp250SEmail" ${s.email !== false ? 'checked' : ''}> Kirim laporan terjadwal ke penerima email Notifikasi</label>
      <label class="form-check"><input class="form-check-input" type="checkbox" id="mp250STg" ${s.telegram ? 'checked' : ''}> Kirim ringkasan ke Telegram (chat Notifikasi)</label>
      <p class="mp250-cat">Pemicu terpasang: ${pm.jumlah != null ? N(pm.jumlah) + ' pemicu harian' : pm.galat ? E(pm.galat) : '-'}${(I.jamNotif || []).length ? ' · jam Notifikasi ' + I.jamNotif.join(', ') : ''}. Gabungan jam Notifikasi + Tim AI maks. 6 per hari. Tim memakai identitas "TIM AI" dengan kuota harian Asisten AI tersendiri; setiap verifikasi & aksi tercatat di Log.</p>
      <div id="mp250SPesan" class="small"></div>
      <div class="d-flex justify-content-end gap-2 mt-2"><button type="button" class="btn btn-primary btn-sm" id="mp250SOk" onclick="mp250Simpan()"><i class="fas fa-floppy-disk me-1"></i>Simpan setelan</button></div></div>`;
  }
  window.mp250Simpan = async () => {
    const g = id => document.getElementById(id), ok = g('mp250SOk'), ps = g('mp250SPesan');
    const jam = g('mp250SJam').value.split(/[^\d]+/).filter(Boolean).map(Number);
    const data = { aktif: g('mp250SAktif').checked, jam, maksTagihan: N(g('mp250STag').value), maksPdf: N(g('mp250SPdf').value), verifikasi: g('mp250SVer').checked, email: g('mp250SEmail').checked, telegram: g('mp250STg').checked };
    ok.disabled = true;
    try { TM.info = await regAksi('timSetel', { data }); pesan('Setelan Tim AI disimpan.', 'ok'); gambar(); }
    catch (err) { ps.innerHTML = '<div class="alert alert-danger py-1 px-2 mb-0 mt-2">' + E(err.message) + '</div>'; ok.disabled = false; }
  };

  /* ---------- pintu masuk: menu akun & Ctrl+K ---------- */
  function menu() {
    const dd = document.querySelector('.app-header .menu-akun .dropdown-menu') || document.querySelector('.menu-akun .dropdown-menu'); if (!dd) return;
    let a = document.getElementById('mp250MenuTim');
    if (!a) { const li = document.createElement('li'); li.innerHTML = '<a class="dropdown-item" href="#" id="mp250MenuTim" onclick="mp250Buka();return false;"><i class="fas fa-people-group me-2"></i>Tim AI Proyek</a>'; dd.appendChild(li); a = li.firstChild; }
    a.parentElement.hidden = !aktif();
  }
  (function () {
    const cmd = window.itemCmdk;
    if (typeof cmd === 'function') window.itemCmdk = function (q) {
      const out = cmd.apply(this, arguments) || [], t = String(q || '').trim().toLowerCase();
      try { if (aktif() && t.length >= 2 && (/tim ai|tim proyek|laporan tim|saran ai|agen/.test(t) || 'tim ai proyek'.indexOf(t) >= 0))
        out.unshift({ grup: 'Asisten AI', ik: 'fa-people-group', l: 'Tim AI Proyek — laporan, saran & verifikasi otomatis', s: 'Verifikator · Analis Kontrak · Keuangan · Gudang · Penyusun Laporan', aksi: () => window.mp250Buka() }); } catch (e) { }
      return out;
    };
    const kl = window.keluarLogin;
    if (typeof kl === 'function') window.keluarLogin = function () { TM.info = null; TM.hasil = {}; tutup(); return kl.apply(this, arguments); };
  })();
  let _t = 0; const pasang = () => { clearTimeout(_t); _t = setTimeout(() => { try { menu(); } catch (e) { } }, 150); };
  const obs = () => { if (!document.body) return; new MutationObserver(pasang).observe(document.body, { childList: true, subtree: true }); pasang(); };
  if (document.body) obs(); else document.addEventListener('DOMContentLoaded', obs);
})();
