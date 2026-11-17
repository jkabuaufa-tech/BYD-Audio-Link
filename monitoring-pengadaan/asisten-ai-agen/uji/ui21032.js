// Uji blok klien MP21032 (2.10.32) di Chromium dengan tiruan aplikasi: tampilan tanggal BAPM, guard terbit, Terima Bon, baris ganda, paksa Admin.
//   node uji/ui21032.js [sumber/pembaruan-2.10.32-tanggal-bapm.js]
const { chromium } = require('playwright'), fs = require('fs'), assert = require('assert'), path = require('path');
(async () => {
  const blok = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'sumber', 'pembaruan-2.10.32-tanggal-bapm.js'), 'utf8');
  const b = await chromium.launch(), pg = await b.newPage(), galat = [];
  pg.on('pageerror', e => galat.push(e.message));
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  await pg.setContent(`<body><div id="tab-gdkartu"><h4>Kartu Gudang</h4><div id="mp223KartuIsi"></div></div>
    <div id="tab-gdmasuk"><h4>Penerimaan</h4><div class="mp2100-sink"><button id="mp2100SinkBtn">Sinkron tanggal BAPM</button></div>
    <div id="mp223FM"><div class="col"><input type="date" id="mp223MTgl" value="2026-09-30" max="2026-11-17"></div></div></div></body>`);
  await pg.evaluate(() => {
    window.REG = { sesi: { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' } };
    window.PROG = { data: [{ id: 'BK1', noKontrak: '065/SPM/X', nomorBA: '01/BAPM/065/SPM/X', tanggalBA: '2026-11-05', versi: 3 }] };
    window.mp220Srv = f => f === 'tanggalBAPMSumber';
    window.notif = (m, t) => { (window.__notif = window.__notif || []).push([m, t]); };
    window.MP223 = { masuk: [
      { id: 'GRM1', status: 'AKTIF', tanggal: '2026-09-30', kunci: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', qty: 1, refBA: 'BK1', versi: 2 },
      { id: 'GRO1', status: 'AKTIF', tanggal: '2026-11-05', kunci: '1800007128', uraian: 'Environment Meter 5in1 pro Krisbow', qty: 1, otomatis: true, refProgres: 'BK1', versi: 1 },
      { id: 'GRO2', status: 'AKTIF', tanggal: '2026-11-01', kunci: '1800007200', uraian: 'Lampu Sorot', qty: 1, otomatis: true, fotoKurang: true, refProgres: 'BK1', bonNomor: 'BON-01', bonIdx: 1, versi: 1 },
      { id: 'GRM9', status: 'AKTIF', tanggal: '2026-10-02', kunci: 'X', uraian: 'Tidak tertaut', qty: 1, versi: 1 }], keluar: [] };
    window.MP223F = { bon: 'BON-01', qty: { 1: 1 } };
    window.__render = 0; window.mp223Render = () => { window.__render++; };
    window.mp2102RujukanBA = () => r => ({ ba: r.refProgres === 'BK1' ? '01/BAPM/065/SPM/X' : '', spm: r.refProgres === 'BK1' ? '065/SPM/X' : '' });
    window.mp2102KetGR = r => 'Masuk - ' + (window.mp2102RujukanBA()(r).spm ? 'Cahaya Utama Safety Indonesia, PT' : '-');
    window.BA = { sumberProgres: 'BK1', tanggal: '2026-11-05' };
    window.__aksi = []; window.__cek = { aman: true };
    window.regAksi = async (a, x) => {
      window.__aksi.push([a, JSON.parse(JSON.stringify(x || {}))]);
      if (a === 'gudangCekTanggalBA') return Object.assign({ ok: true }, window.__cek);
      if (a === 'gudangTerimaBon' && !x.data.izinBedaTanggal && x.data.tanggal !== '2026-11-05') throw new Error('ANOMALI TANGGAL: tanggal terima 2026-09-30 berbeda dengan tanggal BAPM (01/BAPM = 2026-11-05).');
      return { ok: true, data: { id: 'BK1' } };
    };
  });
  await pg.addScriptTag({ content: blok });
  await pg.waitForTimeout(2200);

  console.log('Kartu Gudang / Harian: tanggal tampil = tanggal BAPM');
  let r = await pg.evaluate(() => { const M = window.MP223.masuk; return { m1: M[0].tanggal, srv: M[0]._tglServer, o1: M[1].tanggal, o2: M[2].tanggal, x: M[3].tanggal, f: !!M[1]._bapm, ket: window.mp2102KetGR(M[0]), ketO: window.mp2102KetGR(M[1]), render: window.__render, pita: !!document.getElementById('mp21032Pita-gdkartu'), pitaT: (document.getElementById('mp21032Pita-gdkartu') || {}).textContent || '' }; });
  ok(r.m1 === '2026-11-05' && r.srv === '2026-09-30', 'GR manual tertaut (refBA) bertanggal server 30/09 ditampilkan 05/11 (tanggal BAPM), data server disimpan di _tglServer');
  ok(r.o1 === '2026-11-05' && !r.f && r.o2 === '2026-11-05', 'GR otomatis ikut tanggal BAPM; yang sudah sama tidak ditandai');
  ok(r.x === '2026-10-02', 'GR tanpa tautan BAPM tidak diubah');
  ok(/Cahaya Utama/.test(r.ket) && /⚠ tercatat 30\/09\/2026/.test(r.ket) && !/⚠/.test(r.ketO), 'keterangan GR manual tertaut kini memuat vendor (bukan "Masuk - -") + tanda ⚠ selama server belum sinkron');
  ok(r.render > 0 && r.pita && /2 penerimaan \(GR\) di server bertanggal berbeda/.test(r.pitaT), 'Kartu Gudang dirender ulang & pita peringatan tampil');

  console.log('Terima Bon: tanggal terima = tanggal BAPM');
  r = await pg.evaluate(() => ({ t: (document.getElementById('mp21032Tgl') || {}).textContent || '', inv: document.getElementById('mp223MTgl').classList.contains('is-invalid') }));
  ok(/01\/BAPM.*05\/11\/2026.*wajib sama/.test(r.t) && r.inv, 'item yang sudah ditagih: petunjuk tanggal BAPM 05/11/2026 & isian ditandai salah');
  r = await pg.evaluate(async () => { window.mp21032PakaiTgl(); await new Promise(z => setTimeout(z, 500)); return { v: document.getElementById('mp223MTgl').value, inv: document.getElementById('mp223MTgl').classList.contains('is-invalid') }; });
  ok(r.v === '2026-11-05' && !r.inv, 'tombol "Pakai tanggal BAPM" mengisi 05/11/2026');

  console.log('Guard terbit BAPM & paksa Admin');
  r = await pg.evaluate(async () => { window.__aksi = []; window.__cek = { aman: false, pesan: 'Tanggal BA 2026-11-05 membuat saldo Kartu Gudang Environment Meter minus pada 2026-10-10.' };
    try { await window.regAksi('saveProgres', { data: { id: 'BK1', terbit: true } }); return 'lolos'; } catch (e) { return { m: e.message, a: window.__aksi.map(x => x[0]) }; } });
  ok(/ditolak: .*minus/.test(r.m) && r.a.join() === 'gudangCekTanggalBA', 'BAPM terbit DITOLAK bila tanggal BA membuat Kartu Gudang tidak konsisten; saveProgres tidak dikirim');
  r = await pg.evaluate(async () => { window.__aksi = []; window.__cek = { aman: true, n: 2 }; await window.regAksi('saveProgres', { data: { id: 'BK1', terbit: true } }); return window.__aksi.map(x => x[0]).join(); });
  ok(r === 'gudangCekTanggalBA,saveProgres', 'tanggal BA aman → BAPM terbit diteruskan');
  r = await pg.evaluate(async () => { window.__aksi = []; window.prompt = () => 'barang tiba lebih dulu, BAPM menyusul'; await window.regAksi('gudangTerimaBon', { data: { bonNomor: 'BON-01', tanggal: '2026-09-30', baris: [] } }); return window.__aksi.map(x => x[0] + ':' + !!x[1].data.izinBedaTanggal).join(); });
  ok(r === 'gudangTerimaBon:false,gudangTerimaBon:true', 'Admin: anomali tanggal → diminta alasan → dikirim ulang dengan izinBedaTanggal');
  r = await pg.evaluate(async () => { window.prompt = () => null; try { await window.regAksi('gudangTerimaBon', { data: { bonNomor: 'BON-01', tanggal: '2026-09-30', baris: [] } }); return 'lolos'; } catch (e) { return e.message; } });
  ok(/ANOMALI TANGGAL/.test(r), 'Admin membatalkan → penerimaan tetap ditolak');

  console.log('BAPM baris ganda');
  r = await pg.evaluate(async () => { window.__aksi = []; await window.regAksi('gudangOtomatisProgres', { data: { progresId: 'BK1', baris: [{ bonNomor: 'BON-01', bonIdx: 0, uraian: 'Environment Meter', sd: 1 }, { bonNomor: 'BON-01', bonIdx: 0, uraian: 'Environment Meter', sd: 1 }] } });
    return { b: window.__aksi[0][1].data.baris, n: (window.__notif || []).some(x => /lebih dari satu baris/.test(x[0])) }; });
  ok(r.b.length === 1 && r.b[0].sd === 2 && r.n, '2 baris Environment Meter dijumlah (s.d. 2) + peringatan baris ganda');

  r = await pg.evaluate(() => !!document.getElementById('mp21032AuditBtn'));
  ok(r, 'tombol "Audit tanggal BAPM" terpasang di samping Sinkron tanggal BAPM');
  ok(!galat.length, 'tanpa galat halaman' + (galat.length ? ': ' + galat.join(' | ') : ''));
  await b.close();
  console.log('\nLULUS ' + lulus + ' uji');
})().catch(e => { console.error(e); process.exit(1); });
