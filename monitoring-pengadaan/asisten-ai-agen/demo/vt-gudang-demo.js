/* Demo 2.4.1 — tiruan halaman Kartu Gudang (LOGINV-09) & navigasi tab, agar blok MP241 asli (periode 25–25, penanda Migrasi,
 * cetak A4 portrait + ringkasan migrasi) dapat dicoba. Struktur tabel & HTML cetak mengikuti blok MP223 aplikasi; data contoh. */
(function () {
  'use strict';
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLNP = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dua = n => String(n).padStart(2, '0'), iso = d => d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate());
  const hariIni = () => iso(new Date());
  const tglK = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? m[3] + '-' + BLN[+m[2] - 1] + '-' + m[1] : '-'; };
  const tambahHari = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const E = s => window.escHtml(s == null ? '' : String(s));
  const ang = v => Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  const n = new Date(), bl = (m, d) => iso(new Date(n.getFullYear(), n.getMonth() + m, d));
  const MAT = [{ kunci: 'M-SM50', kode: '1000234561', uraian: 'Semen PCC 50 kg', sat: 'ZAK' }, { kunci: 'M-BJ13', kode: '1000187730', uraian: 'Besi beton D13', sat: 'BTG' }];
  // transaksi contoh di sekitar periode 25–25: migrasi (dari sistem gudang lama) & transaksi biasa, termasuk 1 migrasi BATAL
  window.MP223 = {
    masuk: [
      { kunci: 'M-SM50', tanggal: bl(-1, 20), qty: 400, status: 'AKTIF', migrasi: true, bonNomor: 'MIG-001', noSJ: '-' },
      { kunci: 'M-SM50', tanggal: bl(-1, 27), qty: 300, status: 'AKTIF', migrasi: true, bonNomor: 'MIG-014', noSJ: '-' },
      { kunci: 'M-SM50', tanggal: bl(0, 3), qty: 250, status: 'AKTIF', bonNomor: 'BON-SMS/031', noSJ: 'SJ-SAJ-1180' },
      { kunci: 'M-SM50', tanggal: bl(0, 8), qty: 100, status: 'BATAL', migrasi: true, bonNomor: 'MIG-019', noSJ: '-' },
      { kunci: 'M-BJ13', tanggal: bl(0, 6), qty: 500, status: 'AKTIF', migrasi: true, bonNomor: 'MIG-022', noSJ: '-' }],
    keluar: [
      { kunci: 'M-SM50', tanggal: bl(-1, 29), qty: 120, status: 'AKTIF', migrasi: true, untuk: 'Saluran sekunder BS-3', penerima: 'Mandor Saluran' },
      { kunci: 'M-SM50', tanggal: bl(0, 10), qty: 180, status: 'AKTIF', untuk: 'Bangunan bagi BB-2', penerima: 'Mandor Struktur' },
      { kunci: 'M-BJ13', tanggal: bl(0, 12), qty: 90, status: 'AKTIF', untuk: 'Pintu air PA-1', penerima: 'Mandor Struktur' }]
  };
  const K = window.mp223K = { kunci: 'M-SM50', dari: '', sd: '', semua: false };
  const aktif = L => L.filter(r => r.status === 'AKTIF');
  function data() {
    const m = MAT.find(x => x.kunci === K.kunci) || MAT[0], dari = K.dari || hariIni().slice(0, 8) + '01', sd = K.sd || hariIni();
    const M = aktif(window.MP223.masuk).filter(r => r.kunci === m.kunci), Kl = aktif(window.MP223.keluar).filter(r => r.kunci === m.kunci);
    const awal = M.filter(r => r.tanggal < dari).reduce((a, r) => a + r.qty, 0) - Kl.filter(r => r.tanggal < dari).reduce((a, r) => a + r.qty, 0);
    const rows = []; let tm = 0, tk = 0;
    for (let d = dari, i = 0; d <= sd && i < 400; d = tambahHari(d, 1), i++) {
      const mm = M.filter(r => r.tanggal === d), kk = Kl.filter(r => r.tanggal === d), qm = mm.reduce((a, r) => a + r.qty, 0), qk = kk.reduce((a, r) => a + r.qty, 0); tm += qm; tk += qk;
      if (K.semua || qm || qk) rows.push({ d, qm, qk, tm, tk, sisa: awal + tm - tk, ket: mm.map(r => 'GR ' + r.bonNomor + ' · SJ ' + r.noSJ).concat(kk.map(r => 'GI ' + r.untuk + ' · ' + r.penerima)).join('; ') });
    }
    return { m, dari, sd, rows, awal };
  }
  function vKartu() {
    const el = document.getElementById('mp223KartuIsi'); if (!el) return; const D = data();
    el.innerHTML = `<div class="mp219-card"><div class="mp219-fl"><div class="mp219-fl2">
        <select class="form-select form-select-sm" id="mp223KMat" aria-label="Material" style="width:auto" onchange="mp223K.kunci=this.value;mp223Render()">${MAT.map(x => `<option value="${x.kunci}" ${x.kunci === D.m.kunci ? 'selected' : ''}>${E(x.kode + ' · ' + x.uraian)}</option>`).join('')}</select>
        <label class="small" for="mp223KDari">Dari</label><input type="date" class="form-control form-control-sm" id="mp223KDari" style="width:auto" value="${D.dari}" onchange="mp223K.dari=this.value;mp223Render()">
        <label class="small" for="mp223KSd">s.d.</label><input type="date" class="form-control form-control-sm" id="mp223KSd" style="width:auto" value="${D.sd}" onchange="mp223K.sd=this.value;mp223Render()">
        <label class="form-check small mb-0"><input type="checkbox" class="form-check-input" id="mp223KAll" ${K.semua ? 'checked' : ''} onchange="mp223K.semua=this.checked;mp223Render()"> Semua hari</label></div>
      <div class="mp219-fl2"><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp223KartuCetak()">Cetak</button></div></div>
      <div class="mp223-kg-h"><div><span>No. Material</span><b class="mono">${E(D.m.kode)}</b></div><div><span>Nama Material</span><b>${E(D.m.uraian)}</b></div><div><span>Satuan</span><b>${E(D.m.sat)}</b></div><div><span>Saldo awal</span><b>${ang(D.awal)}</b></div></div>
      <div class="mp219-tw"><table class="mp219-tb mp223-tb"><thead><tr><th rowspan="2">Tanggal</th><th colspan="2" class="c">Penerimaan (GR)</th><th colspan="2" class="c">Pengeluaran (GI)</th><th rowspan="2" class="r">Sisa</th><th rowspan="2">Keterangan</th></tr><tr><th class="r">Jumlah</th><th class="r">Jumlah terusan</th><th class="r">Jumlah</th><th class="r">Jumlah terusan</th></tr></thead><tbody>
      ${D.rows.length ? D.rows.map(r => `<tr><td class="nw">${tglK(r.d)}</td><td class="r">${r.qm ? ang(r.qm) : '-'}</td><td class="r">${r.tm ? ang(r.tm) : '-'}</td><td class="r">${r.qk ? ang(r.qk) : '-'}</td><td class="r">${r.tk ? ang(r.tk) : '-'}</td><td class="r b">${ang(r.sisa)}</td><td class="sub">${E(r.ket)}</td></tr>`).join('')
        : '<tr><td colspan="7" class="mp219-kosong">Tidak ada pergerakan pada periode ini.</td></tr>'}</tbody></table></div>
      <div class="mp219-ket"><span>Sisa = saldo awal + terusan masuk − terusan keluar. Data contoh.</span></div></div>`;
  }
  window.mp223Render = vKartu;
  // HTML cetak mengikuti fungsi cetak() MP223: Kartu Gudang aslinya dikirim lanskap — MP241 memaksa A4 portrait
  window.mp223KartuCetak = () => {
    const D = data(), P = window.PROYEK || {};
    const tabel = `<table class="t"><thead><tr><th rowspan="2">Tanggal</th><th colspan="2">PENERIMAAN (GR)</th><th colspan="2">PENGELUARAN (GI)</th><th rowspan="2">Sisa</th><th rowspan="2">Keterangan</th></tr><tr><th>Jumlah</th><th>Jumlah Terusan</th><th>Jumlah</th><th>Jumlah Terusan</th></tr></thead><tbody>
      ${D.rows.map(r => `<tr><td class="c">${tglK(r.d)}</td><td class="r">${r.qm ? ang(r.qm) : '-'}</td><td class="r">${r.tm ? ang(r.tm) : '-'}</td><td class="r">${r.qk ? ang(r.qk) : '-'}</td><td class="r">${r.tk ? ang(r.tk) : '-'}</td><td class="r">${ang(r.sisa)}</td><td>${E(r.ket) || '-'}</td></tr>`).join('')}</tbody></table>`;
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>KARTU GUDANG</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:9pt Arial,Helvetica,sans-serif;color:#111;margin:12px}
      h1{border:1px solid #111;text-align:center;font-size:11pt;margin:6px 0 8px;padding:6px}.meta{width:100%;border-collapse:collapse;margin:4px 0 8px}.meta td{padding:1px 4px}.k{width:110px;font-weight:700}
      table.t{width:100%;border-collapse:collapse}.t th,.t td{border:1px solid #333;padding:3px 5px}.t th{background:#E9EEF5}.t td.r{text-align:right}.t td.c{text-align:center;white-space:nowrap}
      .ttd{display:flex;justify-content:flex-end;gap:60px;margin-top:14px;text-align:center}.ttd .sp{height:58px}.cat{margin-top:10px;font-size:8pt}.ft{margin-top:8px;font-size:7.5pt;color:#555}</style></head><body>
      <b>${E(P.kso || 'WASKITA - NINDYA KSO')}</b> · ${E(P.namaLengkap || P.nama || '')} · ID Proyek ${E(P.id || '')}
      <h1>KARTU GUDANG / STOCK CARD</h1><table class="meta"><tr><td class="k">Periode</td><td>: ${tglK(D.dari)} s.d. ${tglK(D.sd)}</td><td class="k">No. Material</td><td>: ${E(D.m.kode)}</td></tr><tr><td class="k">Bulan</td><td>: ${BLNP[+D.sd.slice(5, 7) - 1]} ${D.sd.slice(0, 4)}</td><td class="k">Nama Material</td><td>: ${E(D.m.uraian)} (${E(D.m.sat)})</td></tr></table>
      ${tabel}<div class="ttd"><div>Mengetahui,<br>Kasi DanLoglat<div class="sp"></div><b>${E(P.kasi || '(..........)')}</b></div><div>Diisi oleh,<br>Petugas Gudang<div class="sp"></div><b>(.........................)</b></div></div>
      <div class="cat">Catatan: Dibuat rangkap 2 (dua), 1. Untuk Gudang, 2. Untuk SPLEM</div><div class="ft">Dicetak dari Monitoring Pengadaan · ${E(new Date().toLocaleString('id-ID'))} · demo</div></body></html>`;
    return window.mp224Cetak(html, { judul: 'KARTU GUDANG / STOCK CARD · ' + (P.id || ''), lanskap: true });
  };
  window.mp224Cetak = (html, opt) => {   // pratinjau cetak demo (aplikasi asli: dialog cetak MP224)
    const w = document.getElementById('dCetak'); if (!w) return;
    document.getElementById('dCetakInfo').textContent = 'Orientasi: A4 ' + (opt && opt.lanskap ? 'lanskap' : 'portrait') + (/Ringkasan \(Migrasi\)/.test(html) ? ' · ringkasan migrasi disertakan' : '');
    document.getElementById('dCetakFrame').srcdoc = html; w.hidden = false;
  };
  window.demoTutupCetak = () => { document.getElementById('dCetak').hidden = true; };
  window.itemCmdk = () => [];
  // navigasi tab demo (aplikasi asli: showTab / bukaTab)
  window.showTab = nama => {
    document.querySelectorAll('.d-tabapp').forEach(s => { s.hidden = s.id !== 'tab-' + nama; });
    document.querySelectorAll('.d-nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === nama));
    if (nama === 'gdkartu') vKartu(); else if (typeof window.renderKeuangan === 'function') window.renderKeuangan();
  };
  window.bukaTab = t => window.showTab(t);
})();
