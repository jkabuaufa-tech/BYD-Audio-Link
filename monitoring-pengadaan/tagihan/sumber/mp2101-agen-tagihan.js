/* MP2101 — AGEN TAGIHAN 1-KLIK (2.10.0) · "satu tim tagihan, isinya cuma satu agen"
 *  Satu agen berganti peran untuk satu BK: PERISET → PENULIS → PEMERIKSA → EDITOR → ADMIN.
 *  - Periset   (baca): kontrak, BK, vendor, gudang (tanggal & foto per material), paket, checklist, backup Excel.
 *  - Penulis   (setujui): tanggal BAPM & BAP (dari BK / Preview BA / tanggal opname), nomor BA, narasi BAP (material utama urut nilai).
 *  - Pemeriksa (baca): 12 aturan (nilai, volume ≤ kontrak, masa berlaku, tanggal gudang = BAPM, foto per material, NPWP/TTD vendor,
 *               GALAT paket, checklist, backup). Opsional: tinjauan Asisten AI (hanya akun ber-akses AI; AI hanya memberi saran).
 *  - Editor    (setujui): bentuk / perbarui Paket Tagihan, susun Excel backup format baku, pratinjau PDF.
 *  - Admin     (setujui): majukan status paket (Dalam Penyusunan → Menunggu Dokumen → Siap Diperiksa bila syarat terpenuhi),
 *               ringkasan siap kirim (WhatsApp/email).
 *  Setiap langkah yang menulis data menunggu tombol "Setujui"; "Jalankan semua" berhenti di setiap persetujuan.
 *  Tanpa aksi server baru (memakai aksi Paket Tagihan, bkTanggal, Excel backup yang sudah ada). */
(function () {
  'use strict';
  if (window.__MP2101__) return; window.__MP2101__ = true;
  const $ = id => document.getElementById(id);
  const N = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = v => 'Rp ' + Math.round(N(v)).toLocaleString('id-ID');
  const tglK = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[3] + '/' + m[2] + '/' + m[1] : '-'; };
  const pesan = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || ''); } catch (e) { } };
  const g$ = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined ? fb : v; } catch (e) { return fb; } };
  const sesi = () => { try { return (typeof REG !== 'undefined' && REG && REG.sesi) || null; } catch (e) { return null; } };
  const pid = () => { const s = sesi(); return (s && s.proyek) || (g$('PROYEK', {}) || {}).id || ''; };
  const boleh = () => { const s = sesi(); return !!(s && (s.admin || s.peran === 'PENGADAAN' || s.peran === 'ADMIN')); };
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  const progres = () => { try { return (typeof PROG !== 'undefined' && PROG && PROG.data) || []; } catch (e) { return []; } };
  const kontrakDari = key => { try { return ((typeof RINGKASAN !== 'undefined' && RINGKASAN) || []).find(g => g.key === key || (g.terkait || []).indexOf(key) >= 0) || null; } catch (e) { return null; } };
  const regDari = key => { try { return ((typeof REG !== 'undefined' && REG.data) || []).find(r => r.noKontrak === key) || null; } catch (e) { return null; } };
  const idItem = (g, it, i) => { const f = g$('idItem'); return typeof f === 'function' ? f(g, it, i) : (it.kodeUnik || g.key + '#' + i); };
  const volItem = it => { const f = g$('volItem'); return typeof f === 'function' ? N(f(it)) : N(it.volumeEfektif ?? it.volume ?? it.volumeKontrak); };
  const hargaItem = it => { const f = g$('hargaItem'); return typeof f === 'function' ? N(f(it)) : N(it.hargaSatuanEfektif ?? it.hargaSatuan); };
  async function kirim(action, data) {
    const s = sesi(), f = window.regPost; if (!s || typeof f !== 'function') throw new Error('Belum terhubung ke server Monitoring SAP.');
    const r = await f(Object.assign({ action, nama: s.nama, pin: s.pin, proyek: pid() }, data === undefined ? {} : { data }));
    if (!r || !r.ok) throw new Error((r && r.error) || 'Gagal menghubungi server.'); return r;
  }
  const PERAN = [
    { k: 'periset', n: 'Periset', i: 'fa-globe', tulis: false, d: 'Mengumpulkan data kontrak, BK, vendor, gudang, paket & checklist' },
    { k: 'penulis', n: 'Penulis', i: 'fa-pen', tulis: true, d: 'Menyusun tanggal BAPM & BAP, nomor BA dan narasi BAP' },
    { k: 'pemeriksa', n: 'Pemeriksa', i: 'fa-scale-balanced', tulis: false, d: 'Memeriksa angka, tanggal, foto per material & kelengkapan' },
    { k: 'editor', n: 'Editor', i: 'fa-scissors', tulis: true, d: 'Membentuk Paket Tagihan & menyusun Excel / PDF siap cetak' },
    { k: 'admin', n: 'Admin', i: 'fa-paper-plane', tulis: true, d: 'Memajukan status paket & menyiapkan ringkasan kirim' }];
  let A = null;   // { e, g, langkah, st{k: 'tunggu'|'jalan'|'setuju'|'selesai'|'lewat'|'galat'}, out{k: html}, data{}, otomatis }

  /* ======================= langkah ======================= */
  const L = {
    async periset() {
      const e = A.e, g = A.g, reg = regDari(e.noKontrak), d = A.data;
      const T = new Set([g.key, g.keyAsli].concat(g.terkait || []).filter(Boolean)), semua = progres().filter(x => T.has(x.noKontrak));
      const sblm = semua.filter(x => N(x.tagihanKe) < N(e.tagihanKe));
      d.items = (g.items || []).map((it, i) => { const id = idItem(g, it, i), v = volItem(it), h = hargaItem(it); return { id, ur: S(it.itemPekerjaanEfektif || it.itemPekerjaan || it.uraian), vol: v, harga: h, judul: !v && !h,
        lalu: N(it.volumeProgresKumulatif) + sblm.reduce((a, x) => a + N((x.items || {})[id]), 0), ini: N((e.items || {})[id]) }; });
      d.batas = (window.MP2100 && window.MP2100.batasKontrak(e.noKontrak)) || { akhir: S(g.tglSelesai), mulai: S(g.tglMulai) };
      let pv = {}; try { pv = (window.profilVendor && window.profilVendor(g.idVendor, g.namaVendor)) || {}; } catch (er) { }
      d.vendor = { nama: g.namaVendor, ttd: S(pv.nama), npwp: S(pv.npwp), alamat: S(pv.alamat) };
      d.paket = null; d.paketBaca = null;
      if (srv('paketTagihan')) { try { const P = (await kirim('blDaftar', { noKontrak: e.noKontrak, per: 200 })).data || []; d.paket = P.find(x => x.progresId === e.id && x.status !== 'BATAL') || null; } catch (er) { d.galatPaket = er.message; }
        if (d.paket) { try { d.paketBaca = await kirim('blBaca', { id: d.paket.id }); } catch (er) { } } }
      d.gr = [];
      try { if (typeof window.mp223Muat === 'function') await window.mp223Muat(false); const G = window.MP223; d.gr = (G && G.masuk || []).filter(r => r.status === 'AKTIF' && (r.refProgres === e.id || (d.paket && ((d.paket.lampiran || {}).grIds || []).indexOf(r.id) >= 0))); } catch (er) { }
      const nilai = d.items.reduce((a, x) => a + x.ini * x.harga, 0);
      return `<ul class="mp2101-l">
        <li><b>Kontrak</b> ${E(e.noKontrak)} · ${E(g.namaVendor || '')} · nilai ${rp(g.nilai || (reg && reg.nilai))} · berlaku ${tglK(d.batas.mulai)} s.d. <b>${tglK(d.batas.akhir)}</b></li>
        <li><b>BK</b> ${E(e.nomorBA || '-')} · tagihan ke-${E(e.tagihanKe)} · ${E(e.periode || '')} · nilai ${rp(e.nilai)} (Σ volume × harga ${rp(nilai)}) · ${e.baTerbit ? 'BA terbit' : 'BA belum terbit'}</li>
        <li><b>Tanggal</b> opname ${tglK(e.tanggal)} · BAPM/BAPP ${tglK(e.tanggalBA)} · BAP ${tglK(e.tanggalBAP)}</li>
        <li><b>Item</b> ${d.items.filter(x => x.ini > 0).length} item ditagih dari ${d.items.filter(x => !x.judul).length} item kontrak</li>
        <li><b>Vendor</b> TTD ${E(d.vendor.ttd || '—')} · NPWP ${E(d.vendor.npwp || '—')}</li>
        <li><b>Gudang</b> ${d.gr.length ? d.gr.length + ' penerimaan terkait (' + d.gr.filter(r => r.otomatis).length + ' otomatis)' : 'tidak ada penerimaan terkait'}</li>
        <li><b>Paket</b> ${d.paket ? E(d.paket.id) + ' · ' + E(d.paket.statusEfektif || d.paket.status) + (d.paket.backupExcel ? ' · backup Excel ada' : ' · backup Excel belum') : d.galatPaket ? 'tidak terbaca: ' + E(d.galatPaket) : 'belum dibentuk'}</li></ul>`;
    },
    async penulis(setuju) {
      const e = A.e, d = A.data, nm = /\/(SPM|SPPM)\//i.test(e.noKontrak) ? 'BAPM' : 'BAPP';
      let lokal = null; try { const k = g$('KUNCI_REGISTER'), f = g$('bacaSimpan'); const reg = k && typeof f === 'function' ? f(k) || {} : {}; lokal = (reg[e.noKontrak] || []).find(b => N(b.urut) === N(e.tagihanKe)) || null; } catch (er) { }
      d.tBA = S(e.tanggalBA) || S(lokal && lokal.tanggal).slice(0, 10) || S(e.tanggal);
      d.tBAP = S(e.tanggalBAP) || d.tBA;
      const utama = d.items.filter(x => x.ini > 0).sort((a, b) => b.ini * b.harga - a.ini * a.harga), nmU = utama.slice(0, 3).map(x => x.ur);
      d.narasi = (nm === 'BAPM' ? 'pengadaan material ' : 'pekerjaan ') + (nmU.join(', ') || '-') + (utama.length > 3 ? ', dll.' : '');
      const perlu = d.tBA !== S(e.tanggalBA) || d.tBAP !== S(e.tanggalBAP);
      const err = window.MP2100 ? (window.MP2100.cekTgl(e.noKontrak, d.tBA, 'Tanggal ' + nm) || window.MP2100.cekTgl(e.noKontrak, d.tBAP, 'Tanggal BAP')) : '';
      if (setuju && perlu && !err) { await window.MP2100.simpanTanggal(e.id, d.tBA, d.tBAP); A.e = progres().find(x => x.id === e.id) || A.e; }
      A.perlu.penulis = perlu && !setuju && !err;
      return `<ul class="mp2101-l"><li><b>Nomor ${nm}</b> ${E(e.nomorBA || '-')} · BAP ${E(String(e.nomorBA || '').replace(/\/(BAPM|BAPA|BAPP)\//, '/BAP/'))}</li>
        <li><b>Tanggal ${nm}</b> ${tglK(d.tBA)} ${S(e.tanggalBA) ? '' : '<span class="mp2101-b warn">usulan' + (lokal ? ' dari Preview BA' : ' dari tanggal opname') + '</span>'}</li>
        <li><b>Tanggal BAP</b> ${tglK(d.tBAP)} ${S(e.tanggalBAP) ? '' : '<span class="mp2101-b warn">usulan = tanggal ' + nm + '</span>'}</li>
        <li><b>Narasi BAP</b> "…telah melakukan pemeriksaan atas ${E(d.narasi)}…"</li>
        ${err ? `<li class="err"><b>Tidak dapat disimpan:</b> ${E(err)}</li>` : perlu ? (setuju ? '<li class="ok">Tanggal BAPM & BAP disimpan ke BK; penerimaan gudang otomatis ikut tanggal BAPM.</li>' : '<li class="warn">Menunggu persetujuan: simpan tanggal ' + nm + ' & BAP ke BK.</li>') : '<li class="ok">Tanggal sudah tersimpan di BK.</li>'}</ul>`;
    },
    async pemeriksa() {
      const e = A.e, d = A.data, C = [], cek = (ok, teks, tingkat) => C.push([ok ? 'ok' : (tingkat || 'err'), teks]);
      const nilai = d.items.reduce((a, x) => a + x.ini * x.harga, 0);
      cek(Math.abs(nilai - N(e.nilai)) <= 1, 'Nilai BK ' + rp(e.nilai) + (Math.abs(nilai - N(e.nilai)) <= 1 ? ' = Σ volume × harga' : ' ≠ Σ volume × harga ' + rp(nilai) + ' → gunakan Koreksi BK'));
      const lb = d.items.filter(x => !x.judul && x.vol > 0 && x.lalu + x.ini > x.vol + 1e-6); cek(!lb.length, lb.length ? 'Melebihi volume kontrak: ' + lb.map(x => x.ur.slice(0, 30)).join('; ') + ' → addendum' : 'Volume s/d ≤ volume kontrak');
      const hz = d.items.filter(x => x.ini > 0 && !(x.harga > 0)); cek(!hz.length, hz.length ? 'Harga 0: ' + hz.map(x => x.ur.slice(0, 30)).join('; ') : 'Harga semua item terisi');
      const t1 = S(A.e.tanggalBA) || d.tBA, t2 = S(A.e.tanggalBAP) || d.tBAP, er = window.MP2100 ? window.MP2100.cekTgl(e.noKontrak, t1, 'Tanggal BAPM') || window.MP2100.cekTgl(e.noKontrak, t2, 'Tanggal BAP') : '';
      cek(!er, er || 'Tanggal BAPM ' + tglK(t1) + ' & BAP ' + tglK(t2) + ' dalam masa berlaku kontrak (s.d. ' + tglK(d.batas.akhir) + ')');
      cek(!!S(A.e.tanggalBA), S(A.e.tanggalBA) ? 'Tanggal BAPM tersimpan di BK' : 'Tanggal BAPM belum tersimpan (setujui langkah Penulis)', 'warn');
      const oto = d.gr.filter(r => r.otomatis), beda = oto.filter(r => S(A.e.tanggalBA) && r.tanggal !== S(A.e.tanggalBA));
      if (d.gr.length) cek(!beda.length, beda.length ? beda.length + ' penerimaan otomatis belum bertanggal BAPM (klik Sinkron tanggal BAPM)' : 'Tanggal penerimaan gudang sesuai BAPM', 'warn');
      const tanpaFoto = d.gr.filter(r => !(r.foto || []).some(Boolean) || r.fotoKurang); if (d.gr.length) cek(!tanpaFoto.length, tanpaFoto.length ? 'Foto penerimaan belum lengkap: ' + tanpaFoto.map(r => S(r.uraian).slice(0, 25)).join('; ') : 'Foto penerimaan per material lengkap (' + d.gr.filter(r => !r.fotoWakil).length + ' foto sendiri, ' + d.gr.filter(r => r.fotoWakil).length + ' memakai foto utama)', 'warn');
      cek(!!d.vendor.ttd, d.vendor.ttd ? 'Penandatangan vendor: ' + d.vendor.ttd : 'Nama penandatangan vendor kosong', 'warn');
      cek(!!d.vendor.npwp, d.vendor.npwp ? 'NPWP vendor ' + d.vendor.npwp : 'NPWP vendor kosong (isi dari rekanan)', 'warn');
      cek(!!e.baTerbit, e.baTerbit ? 'BA sudah terbit' : 'BA belum terbit (terbitkan di Preview BA)', 'warn');
      if (d.paket) {
        cek(!N(d.paket.galat), N(d.paket.galat) ? 'Paket memiliki ' + d.paket.galat + ' GALAT perhitungan' : 'Perhitungan paket tanpa GALAT');
        const ck = d.paket.checklist; cek(!!(ck && ck.lengkap === ck.total), ck ? 'Checklist ' + ck.lengkap + '/' + ck.total + (ck.verified ? ' (terverifikasi)' : '') : 'Checklist belum diisi', 'warn');
        cek(!!d.paket.backupExcel, d.paket.backupExcel ? 'Backup Excel tersimpan' : 'Backup Excel belum ada (langkah Editor)', 'warn');
      } else cek(false, 'Paket tagihan belum dibentuk (langkah Editor)', 'warn');
      d.cek = C; d.lulus = !C.some(c => c[0] === 'err');
      let ai = ''; try { if (srv('aiAkunKhusus') && window.__aiAkses !== false) ai = `<button type="button" class="btn btn-sm btn-outline-light mt-2" onclick="mp2101AI(this)"><i class="fas fa-wand-magic-sparkles me-1"></i>Minta tinjauan Asisten AI (opsional)</button><div id="mp2101AIJ" class="mp2101-ai"></div>`; } catch (er) { }
      return `<ul class="mp2101-l">${C.map(c => `<li class="${c[0]}"><i class="fas ${c[0] === 'ok' ? 'fa-circle-check' : c[0] === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'} me-1"></i>${E(c[1])}</li>`).join('')}</ul>
        <div class="mp2101-skor">${C.filter(c => c[0] === 'ok').length}/${C.length} lulus · ${C.filter(c => c[0] === 'err').length} galat · ${C.filter(c => c[0] === 'warn').length} perhatian</div>${ai}`;
    },
    async editor(setuju) {
      const e = A.e, d = A.data;
      if (!d.lulus) { A.perlu.editor = false; return '<ul class="mp2101-l"><li class="err">Masih ada GALAT di langkah Pemeriksa. Perbaiki dahulu (mis. Koreksi BK), lalu jalankan ulang agen.</li></ul>'; }
      A.perlu.editor = !setuju;
      if (!setuju) return `<ul class="mp2101-l"><li>${d.paket ? 'Perbarui paket ' + E(d.paket.id) : 'Bentuk draf Paket Tagihan'} dari BK ${E(e.nomorBA)}</li><li>Susun Excel backup format baku (BAPM/BAPP · BAP · rincian) & simpan ke arsip Kelengkapan</li><li class="warn">Menunggu persetujuan.</li></ul>`;
      const log = [];
      if (!d.paket) { const h = await window.mp270BuatOtomatis(e.noKontrak, e.id); d.paket = h.paket; log.push(h.baru ? 'Paket ' + E(h.paket.id) + ' dibentuk' : 'Paket sudah ada: ' + E(h.paket.id)); }
      else log.push('Paket ' + E(d.paket.id) + ' dipakai');
      if (window.MP298 && window.MP298.backup) { const b = await window.MP298.backup(e.id, { sumber: 'AGEN', diam: true }); log.push(b.data ? 'Excel backup ' + E(b.data.nama) + ' → ' + E(b.data.folder) : 'Excel backup tersusun di perangkat'); }
      try { const P = (await kirim('blDaftar', { noKontrak: e.noKontrak, per: 200 })).data || []; d.paket = P.find(x => x.progresId === e.id && x.status !== 'BATAL') || d.paket; } catch (er) { }
      return `<ul class="mp2101-l">${log.map(x => `<li class="ok">${x}</li>`).join('')}</ul><div class="d-flex gap-2 flex-wrap mt-1">
        <button type="button" class="btn btn-sm btn-success" onclick="mp298Unduh(${E(JSON.stringify(e.id))}, this)"><i class="fas fa-file-excel me-1"></i>Unduh Excel</button>
        <button type="button" class="btn btn-sm btn-outline-light" onclick="mp298Pratinjau(${E(JSON.stringify(e.id))})"><i class="fas fa-file-pdf me-1"></i>Pratinjau & Cetak PDF</button></div>`;
    },
    async admin(setuju) {
      const e = A.e, d = A.data, p = d.paket;
      if (!p) { A.perlu.admin = false; return '<ul class="mp2101-l"><li class="warn">Belum ada paket — setujui langkah Editor terlebih dahulu.</li></ul>'; }
      const st = S(p.statusEfektif || p.status), ck = p.checklist, lengkap = !!(ck && ck.lengkap === ck.total);
      const ke = st === 'DRAFT' ? 'DALAM PENYUSUNAN' : st === 'DALAM PENYUSUNAN' ? 'MENUNGGU DOKUMEN' : st === 'MENUNGGU DOKUMEN' && lengkap && p.backupExcel ? 'SIAP DIPERIKSA' : '';
      const ringkas = 'Tagihan ' + (e.nomorBA || '') + ' · ' + (A.g.namaVendor || '') + '\nKontrak ' + e.noKontrak + '\nNilai BK ' + rp(e.nilai) + ' · ' + (p.totalTagihan ? 'total tagihan ' + rp(p.totalTagihan) : '') +
        '\nTanggal BAPM ' + tglK(A.e.tanggalBA) + ' · BAP ' + tglK(A.e.tanggalBAP) + '\nPaket ' + p.id + ' · status ' + st + (ck ? ' · checklist ' + ck.lengkap + '/' + ck.total : '') + '\nPemeriksaan: ' + (d.cek || []).filter(c => c[0] !== 'ok').map(c => '- ' + c[1]).join('\n');
      d.ringkas = ringkas;
      if (setuju && ke) { const r = await kirim('blStatus', { id: p.id, versi: p.versi, ke }); d.paket = Object.assign({}, p, { status: r.data.status, statusEfektif: r.data.status, versi: r.data.versi }); A.perlu.admin = false;
        return `<ul class="mp2101-l"><li class="ok">Status paket ${E(st)} → <b>${E(ke)}</b></li></ul>${ringkasHTML(ringkas)}`; }
      A.perlu.admin = !!ke && !setuju;
      return `<ul class="mp2101-l"><li>Status paket saat ini <b>${E(st)}</b></li>${ke ? `<li class="warn">Menunggu persetujuan: majukan status ke <b>${E(ke)}</b>.</li>` : `<li>${st === 'MENUNGGU DOKUMEN' ? 'Siap Diperiksa menunggu checklist lengkap & backup Excel.' : 'Tidak ada perubahan status otomatis pada status ini.'}</li>`}</ul>${ringkasHTML(ringkas)}`;
    }
  };
  const ringkasHTML = t => `<div class="mp2101-ring"><div class="d-flex justify-content-between align-items-center"><b>Ringkasan siap kirim</b><button type="button" class="btn btn-sm btn-outline-light py-0" onclick="mp2101Salin()"><i class="fas fa-copy me-1"></i>Salin</button></div><pre>${E(t)}</pre></div>`;

  /* ======================= jalankan ======================= */
  async function jalankan(k, setuju) {
    const i = PERAN.findIndex(p => p.k === k); A.aktif = k; A.st[k] = 'jalan'; gambar();
    try { A.out[k] = await L[k](setuju); A.st[k] = A.perlu[k] ? 'setuju' : 'selesai'; }
    catch (e) { A.out[k] = `<ul class="mp2101-l"><li class="err">${E(e.message)}</li></ul>`; A.st[k] = 'galat'; }
    gambar(); return A.st[k] === 'selesai' && i < PERAN.length - 1 ? PERAN[i + 1].k : null;
  }
  async function semua(dari) {
    if (A.berjalan) return; A.berjalan = true;
    let k = dari || 'periset';
    while (k) { const lanjut = await jalankan(k, false); if (A.st[k] !== 'selesai') break; k = lanjut; }
    A.berjalan = false; gambar();
  }
  Object.assign(window, {
    mp2101Buka: progresId => {
      if (!boleh()) { pesan('Agen Tagihan untuk Pengadaan / Admin.', 'err'); return; }
      const e = progres().find(x => x.id === progresId); if (!e) { pesan('BK tidak ditemukan.', 'err'); return; }
      const g = kontrakDari(e.noKontrak); if (!g) { pesan('Kontrak ' + e.noKontrak + ' tidak ditemukan.', 'err'); return; }
      A = { e, g, st: {}, out: {}, data: {}, perlu: {}, aktif: '' }; PERAN.forEach(p => { A.st[p.k] = 'tunggu'; });
      gambar(); semua();
    },
    mp2101Tutup: () => { const w = $('mp2101Lapis'); if (w) w.remove(); A = null; },
    mp2101Setujui: async k => { if (!A || A.berjalan) return; A.berjalan = true; await jalankan(k, true); A.berjalan = false; const i = PERAN.findIndex(p => p.k === k); if (A.st[k] === 'selesai' && i < PERAN.length - 1) semua(PERAN[i + 1].k); else gambar(); },
    mp2101Lewati: k => { if (!A) return; A.st[k] = 'lewat'; A.perlu[k] = false; const i = PERAN.findIndex(p => p.k === k); gambar(); if (i < PERAN.length - 1) semua(PERAN[i + 1].k); },
    mp2101Ulang: () => { if (!A || A.berjalan) return; PERAN.forEach(p => { A.st[p.k] = 'tunggu'; A.out[p.k] = ''; }); A.e = progres().find(x => x.id === A.e.id) || A.e; semua(); },
    mp2101Salin: async () => { try { await navigator.clipboard.writeText(A.data.ringkas || ''); pesan('Ringkasan disalin — tempel ke WhatsApp/email.', 'ok'); } catch (e) { pesan('Salin manual dari kotak ringkasan.', 'warning'); } },
    mp2101AI: async btn => {
      const el = $('mp2101AIJ'); if (!el || !A) return;
      if (!confirm('Ringkasan pemeriksaan (tanpa NPWP/rekening/dokumen) dikirim ke Asisten AI untuk saran. Lanjutkan?')) return;
      btn.disabled = true; el.textContent = 'Menunggu Asisten AI…';
      const teks = 'Tinjau hasil pemeriksaan tagihan konstruksi berikut. Beri (1) risiko utama, (2) dokumen yang mungkin kurang, (3) langkah perbaikan. Jangan menyetujui pembayaran.\nBK ' + A.e.nomorBA + ', kontrak ' + A.e.noKontrak + ', nilai ' + rp(A.e.nilai) + '.\n' + (A.data.cek || []).map(c => '[' + c[0] + '] ' + c[1]).join('\n');
      try { const r = await kirim('aiTanya', { pesan: [{ role: 'user', teks }], konteks: 'Agen Tagihan ' + A.e.nomorBA }); el.innerHTML = '<b>Saran Asisten AI (bukan keputusan):</b><div style="white-space:pre-wrap">' + E(r.teks || '') + '</div>'; }
      catch (e) { el.textContent = /khusus|hanya tersedia/i.test(e.message) ? 'Tinjauan AI hanya untuk akun ber-akses AI.' : e.message; }
      btn.disabled = false;
    }
  });

  /* ======================= tampilan ======================= */
  function gambar() {
    if (!A) return;
    let w = $('mp2101Lapis');
    if (!w) { w = document.createElement('div'); w.id = 'mp2101Lapis'; w.className = 'mp270-latar atas mp2101-latar'; w.addEventListener('keydown', ev => { if (ev.key === 'Escape') window.mp2101Tutup(); }); document.body.appendChild(w); }
    const sel = PERAN.filter(p => A.st[p.k] === 'selesai' || A.st[p.k] === 'lewat').length, aktif = PERAN.find(p => p.k === A.aktif) || PERAN[0];
    const ikon = st => st === 'selesai' ? '<i class="fas fa-check st"></i>' : st === 'jalan' ? '<i class="fas fa-spinner fa-spin st"></i>' : st === 'setuju' ? '<i class="fas fa-hand st"></i>' : st === 'galat' ? '<i class="fas fa-xmark st"></i>' : st === 'lewat' ? '<i class="fas fa-forward st"></i>' : '';
    w.innerHTML = `<section class="mp2101-dlg" role="dialog" aria-modal="true" aria-label="Agen Tagihan">
      <header><div class="mp2101-merek"><span class="lg">A</span><div><b>Agen Tagihan</b><small>${E(A.e.nomorBA || '')} · ${E(A.g.namaVendor || '')}</small></div></div>
        <span class="mp2101-part">BK KE-${E(A.e.tagihanKe)} · AGENTIC</span><button class="btn-close btn-close-white" aria-label="Tutup" onclick="mp2101Tutup()"></button></header>
      <div class="mp2101-prog"><i style="width:${Math.round(sel / PERAN.length * 100)}%"></i></div>
      <div class="mp2101-judul">satu tim tagihan, <span>isinya cuma satu agen.</span><div class="sub">${E(aktif.n)}: ${E(aktif.d)}</div></div>
      <div class="mp2101-kartu">${PERAN.map(p => `<button type="button" class="mp2101-k ${A.st[p.k]} ${A.aktif === p.k ? 'aktif' : ''}" onclick="mp2101Fokus('${p.k}')"><span class="ik"><i class="fas ${p.i}"></i></span><b>${p.n}</b>${ikon(A.st[p.k])}</button>`).join('')}</div>
      <div class="mp2101-isi">${PERAN.filter(p => A.out[p.k]).map(p => `<article id="mp2101O-${p.k}" class="mp2101-o ${A.st[p.k]}"><h6><i class="fas ${p.i} me-2"></i>${p.n}${p.tulis ? ' <span class="mp2101-b">menulis data · perlu persetujuan</span>' : ''}</h6>${A.out[p.k]}
        ${A.st[p.k] === 'setuju' ? `<div class="mp2101-akt"><button type="button" class="btn btn-sm btn-primary" ${A.berjalan ? 'disabled' : ''} onclick="mp2101Setujui('${p.k}')"><i class="fas fa-check me-1"></i>Setujui & jalankan</button><button type="button" class="btn btn-sm btn-outline-light" onclick="mp2101Lewati('${p.k}')">Lewati</button></div>` : ''}</article>`).join('') || '<div class="mp2101-tunggu">Agen mulai bekerja…</div>'}</div>
      <footer><span>${sel}/${PERAN.length} peran selesai · setiap langkah yang menulis data menunggu persetujuan Anda</span><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-light" ${A.berjalan ? 'disabled' : ''} onclick="mp2101Ulang()"><i class="fas fa-rotate me-1"></i>Jalankan ulang</button><button class="btn btn-sm btn-light" onclick="mp2101Tutup()">Tutup</button></div></footer></section>`;
    const o = $('mp2101O-' + A.aktif); if (o && o.scrollIntoView) o.scrollIntoView({ block: 'nearest' });
  }
  window.mp2101Fokus = k => { const o = $('mp2101O-' + k); if (o) o.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };

  /* ======================= pintu masuk ======================= */
  function pasang() {
    if (!boleh()) return;
    const bar = $('mp298Aksi');
    if (bar && !bar.querySelector('.mp2101-btn')) { let T = null; try { T = window.mp270Aktif && window.mp270Aktif(); } catch (e) { } const id = T && T.l && T.l.progresId;
      if (id) bar.insertAdjacentHTML('afterbegin', `<button type="button" class="btn btn-sm mp2101-btn" title="Agen Tagihan 1-klik: periset → penulis → pemeriksa → editor → admin" onclick="mp2101Buka(${E(JSON.stringify(id))})"><i class="fas fa-robot me-1"></i>Agen Tagihan</button>`); }
    const isi = $('mp280Isi');
    if (isi) isi.querySelectorAll('tr[data-id]').forEach(tr => { const td = tr.lastElementChild; if (!td || td.querySelector('.mp2101-mini')) return;
      td.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-sm py-0 ms-1 mp2101-btn mp2101-mini" title="Agen Tagihan 1-klik" onclick="mp2101Buka(${E(JSON.stringify(tr.dataset.id))})"><i class="fas fa-robot"></i></button>`); });
  }
  let _t = 0; const jadwal = () => { if (_t) return; _t = setTimeout(() => { _t = 0; try { pasang(); } catch (e) { } }, 300); };
  const awasi = () => { if (!document.body) return; new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length && ![...x.addedNodes].every(n => n.nodeType === 1 && n.closest && n.closest('#mp2101Lapis')))) jadwal(); }).observe(document.body, { childList: true, subtree: true }); jadwal(); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
  window.MP2101 = { PERAN, langkah: L, keadaan: () => A };
})();
