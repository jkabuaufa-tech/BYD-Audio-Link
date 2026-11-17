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
    window.mp220Srv = f => ['tanggalBAPMSumber', 'koreksiMigrasiGudang', 'tautkanBAKartu'].includes(f);
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
      if (a === 'gudangKoreksiMigrasi') { const d = x.data; if (d.ubah && d.ubah.tanggal === '2026-08-01') throw new Error('Ditolak: koreksi membuat saldo Kartu Gudang minus'); const r = window.MP223.keluar.concat(window.MP223.masuk).find(z => z.id === d.id); return { ok: true, jenis: d.jenis, aksi: 'UBAH tanggal', data: Object.assign({}, r, d.ubah || {}, { versi: r.versi + 1, riwayatKoreksi: [{ pada: '2026-11-17T06:00', oleh: 'Joko', aksi: 'UBAH tanggal', alasan: d.alasan }], asliImpor: { tanggal: r.tanggal, qty: r.qty, sat: r.sat, uraian: r.uraian } }) }; }
      if (a === 'gudangAuditTanggalBA') return { ok: true, usulan: [{ grId: 'GRM9', bkId: 'BK1', nomorBA: '01/BAPM/065/SPM/X', tanggalBA: '2026-11-05', migrasi: true }], perubahan: [], galat: [], bkTanpaTanggal: [], jumlah: {} };
      if (a === 'gudangTerimaBon' && !x.data.izinBedaTanggal && x.data.tanggal !== '2026-11-05') throw new Error('ANOMALI TANGGAL: tanggal terima 2026-09-30 berbeda dengan tanggal BAPM (01/BAPM = 2026-11-05).');
      return { ok: true, data: { id: 'BK1' } };
    };
  });
  await pg.addScriptTag({ content: blok });
  await pg.waitForTimeout(2200);

  let r2;
  console.log('Kartu Gudang / Harian: tanggal tampil = tanggal BAPM');
  let r = await pg.evaluate(() => { const M = window.MP223.masuk; return { m1: M[0].tanggal, srv: M[0]._tglServer, o1: M[1].tanggal, o2: M[2].tanggal, x: M[3].tanggal, f: !!M[1]._bapm, ket: window.mp2102KetGR(M[0]), ketO: window.mp2102KetGR(M[1]), render: window.__render, pita: !!document.getElementById('mp21032Pita-gdkartu'), pitaT: (document.getElementById('mp21032Pita-gdkartu') || {}).textContent || '' }; });
  ok(r.m1 === '2026-11-05' && r.srv === '2026-09-30', 'GR manual tertaut (refBA) bertanggal server 30/09 ditampilkan 05/11 (tanggal BAPM), data server disimpan di _tglServer');
  ok(r.o1 === '2026-11-05' && !r.f && r.o2 === '2026-11-05', 'GR otomatis ikut tanggal BAPM; yang sudah sama tidak ditandai');
  ok(r.x === '2026-10-02', 'GR tanpa tautan BAPM tidak diubah');
  ok(/Cahaya Utama/.test(r.ket) && /⚠ tercatat 30\/09\/2026/.test(r.ket) && !/⚠/.test(r.ketO), 'keterangan GR manual tertaut kini memuat vendor (bukan "Masuk - -") + tanda ⚠ selama server belum sinkron');
  r2 = await pg.evaluate(() => { const g = window.MP223.masuk[3]; return { t: g.tanggal, ket: window.mp2102KetGR(g), pita: (document.getElementById('mp21032Pita-gdkartu') || {}).textContent || '' }; });
  ok(r2.t === '2026-10-02' && /⚠ belum tertaut ke BAPM — usulan 01\/BAPM.*05\/11\/2026 \(perlu persetujuan Admin\)/.test(r2.ket), 'GR belum tertaut (mis. migrasi lama "Masuk - -") kini diberi tanda ⚠ + usulan BAPM; tanggal tidak diubah sebelum Admin setuju');
  ok(/1 penerimaan BELUM tertaut ke BAPM/.test(r2.pita), 'pita peringatan menyebut GR yang belum tertaut');
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

  console.log('Celah lain: Lengkapi foto, Cetak BA, audit seluruh material');
  r = await pg.evaluate(async () => {
    window.MP223.masuk[2].kiriman = 'KR1';
    document.body.insertAdjacentHTML('beforeend', '<div id="mp273Modal" data-kiriman="KR1"><input type="date" id="mp2100OtoTgl" value="2026-11-20"></div>');
    await new Promise(z => setTimeout(z, 700)); const i = document.getElementById('mp2100OtoTgl'); return { v: i.value, ro: i.readOnly };
  });
  ok(r.v === '2026-11-05' && r.ro, 'Lengkapi foto: isian tanggal terkunci = tanggal BAPM (gudang tidak bisa menimpa tanggal BAPM)');
  r = await pg.evaluate(async () => {
    window.__cetak = 0; window.cetakBA = function () { window.__cetak++; return true; }; document.body.appendChild(document.createElement('i')); await new Promise(z => setTimeout(z, 700));
    window.BA.tanggal = '2026-11-07'; const a = window.cetakBA(); window.BA.tanggal = '2026-11-05'; const b = window.cetakBA();
    return { a, b, n: window.__cetak, m: (window.__notif || []).some(x => /Preview .*07\/11\/2026.*berbeda.*05\/11\/2026/.test(x[0])) };
  });
  ok(r.a === false && r.b === true && r.n === 1 && r.m, 'Cetak BA ditolak bila tanggal pratinjau (07/11) ≠ tanggal BAPM tersimpan (05/11); tanggal sama → tercetak');
  r = await pg.evaluate(async () => {
    window.regAksi0 = window.regAksi;
    const hasil = { ok: true, jumlah: { tanggal: 0, tautan: 0, usulan: 0, galat: 0, bkTanpaTanggal: 0 }, perubahan: [], usulan: [], galat: [], bkTanpaTanggal: [],
      ringkasMaterial: { total: 2, ok: 1, anomali: 1, perKode: { GR_KURANG_DARI_BAPM: 1 } },
      material: [{ status: 'ANOMALI', kunci: 'R', kode: '1800007400', uraian: 'Regulator Oksigen YAMATO', sat: 'PC', gr: 0, qtyGR: 0, tertaut: 0, takTertaut: 0, migrasi: 0, qtyBAPM: 1, bapm: [{ nomorBA: '01/BAPM', tanggalBA: '2026-11-05', qtyBAPM: 1, qtyGR: 0 }], masalah: [{ kode: 'GR_KURANG_DARI_BAPM', ket: '01/BAPM: BAPM 1, GR tertaut 0' }] },
        { status: 'OK', kunci: 'B', kode: '1800007300', uraian: 'Balok Kayu Kelas 1', sat: 'M3', gr: 1, qtyGR: 1, tertaut: 1, takTertaut: 0, migrasi: 0, qtyBAPM: 1, bapm: [], masalah: [] }] };
    const lama = window.regAksi; window.regAksi = async (a, x) => a === 'gudangAuditTanggalBA' ? hasil : lama(a, x);
    window.mp21032Audit(); await new Promise(z => setTimeout(z, 300));
    const t = document.querySelector('#mp21032Modal .mp21032-isi').textContent; window.mp21032Semua(true);
    const t2 = document.querySelector('#mp21032Modal .mp21032-isi').textContent; window.regAksi = lama; return { t, t2 };
  });
  ok(/Audit seluruh material — 1 anomali · 1 OK dari 2 material/.test(r.t) && /Regulator Oksigen/.test(r.t) && /GR kurang dari volume BAPM/.test(r.t) && !/Balok Kayu/.test(r.t), 'panel: tabel audit seluruh material (bawaan hanya yang beranomali)');
  ok(/Balok Kayu/.test(r.t2), 'centang "tampilkan juga material OK" → semua material tampil');
  console.log('Koreksi manual transaksi migrasi di Kartu Gudang');
  r = await pg.evaluate(async () => {
    window.MP223.masuk.push({ id: 'GR-MIG-0007', status: 'AKTIF', tanggal: '2026-09-30', kunci: 'K7', kode: 'K7', uraian: 'Helm Proyek', sat: 'PC', qty: 5, harga: 50000, noSJ: 'MIGRASI', migrasi: true, versi: 1 });
    window.MP223.keluar.push({ id: 'GI-MIG-0002', status: 'BATAL', tanggal: '2026-10-03', kunci: 'K7', kode: 'K7', uraian: 'Helm Proyek', sat: 'PC', qty: 1, penerima: '(data lama)', migrasi: true, versi: 2 });
    window.mp223K = { kunci: 'K7' }; document.getElementById('mp223KartuIsi').insertAdjacentHTML('beforeend', '<table></table>');
    await new Promise(z => setTimeout(z, 700));
    const el = document.getElementById('mp21032MigKartu');
    return { ada: !!el, t: el ? el.textContent : '', btn: el ? el.querySelectorAll('button[onclick^="mp21032Koreksi"]').length : 0, taut: el ? el.querySelectorAll('button[onclick^="mp21032Tautkan"]').length : 0, ket: window.mp2102KetGR(window.MP223.masuk[4]) };
  });
  ok(r.ada && /Transaksi material ini — koreksi & tautan BAPM \(2\)/.test(r.t) && r.btn === 2 && r.taut === 1 && /Masuk · migrasi/.test(r.t) && /Keluar · migrasi/.test(r.t) && /30\/09\/2026/.test(r.t), 'Kartu Gudang: semua transaksi material (GR & GI, termasuk yang batal) + Koreksi & Tautkan BAPM');
  ok(/\[migrasi lama\]/.test(r.ket), 'keterangan Kartu Gudang diberi penanda [migrasi lama]');
  r = await pg.evaluate(async () => {
    window.mp21032Koreksi('masuk', 'GR-MIG-0007'); const $ = id => document.getElementById(id);
    const isian = { tgl: $('kmTgl').value, qty: $('kmQty').value };
    $('kmTgl').value = '2026-10-05'; $('kmAlasan').value = 'pendek'; document.querySelector('[data-km="ubah"]').click(); await new Promise(z => setTimeout(z, 100));
    const p1 = $('kmPesan').textContent;
    $('kmTgl').value = '2026-08-01'; $('kmAlasan').value = 'salah ketik tanggal dari kartu lama'; window.__aksi = []; document.querySelector('[data-km="ubah"]').click(); await new Promise(z => setTimeout(z, 200));
    const p2 = $('kmPesan').textContent;
    $('kmTgl').value = '2026-10-05'; document.querySelector('[data-km="ubah"]').click(); await new Promise(z => setTimeout(z, 300));
    const kirim = window.__aksi.filter(a => a[0] === 'gudangKoreksiMigrasi').pop();
    return { isian, p1, p2, kirim: kirim && kirim[1].data, tutup: !$('mp21032KM'), baru: window.MP223.masuk.find(z => z.id === 'GR-MIG-0007') };
  });
  ok(r.isian.tgl === '2026-09-30' && r.isian.qty === '5', 'form koreksi terisi data transaksi');
  ok(/min\. 12/.test(r.p1), 'alasan < 12 karakter ditolak di form');
  ok(/saldo Kartu Gudang minus/.test(r.p2), 'penolakan server (saldo minus) ditampilkan di form, form tetap terbuka');
  ok(r.kirim && r.kirim.ubah.tanggal === '2026-10-05' && Object.keys(r.kirim.ubah).length === 1 && r.kirim.versi === 1 && r.kirim.jenis === 'masuk', 'hanya isian yang berubah dikirim (tanggal) beserta versi');
  ok(r.tutup && r.baru.tanggal === '2026-10-05' && r.baru.versi === 2 && r.baru.riwayatKoreksi.length === 1, 'tersimpan: data Kartu Gudang langsung diperbarui, form tertutup');
  r = await pg.evaluate(async () => { window.mp21032Koreksi('keluar', 'GI-MIG-0002'); await new Promise(z => setTimeout(z, 50)); const t = !!document.querySelector('[data-km="pulihkan"]') && !document.querySelector('[data-km="ubah"]'); document.getElementById('mp21032KM').remove(); return t; });
  ok(r, 'transaksi migrasi yang dibatalkan: tersedia tombol Pulihkan (isian dikunci)');
  r = await pg.evaluate(async () => { window.REG.sesi.admin = false; window.mp223K.kunci = 'K7'; document.getElementById('mp223KartuIsi').insertAdjacentHTML('beforeend', '<i></i>'); await new Promise(z => setTimeout(z, 700));
    const n = document.querySelectorAll('#mp21032MigKartu button').length; window.REG.sesi.admin = true; return n; });
  ok(r === 0, 'non-Admin hanya melihat daftar migrasi (tanpa tombol Koreksi)');
  r = await pg.evaluate(() => !!document.getElementById('mp21032AuditBtn'));
  ok(r, 'tombol "Audit tanggal BAPM" terpasang di samping Sinkron tanggal BAPM');
  ok(!galat.length, 'tanpa galat halaman' + (galat.length ? ': ' + galat.join(' | ') : ''));
  await b.close();
  console.log('\nLULUS ' + lulus + ' uji');
})().catch(e => { console.error(e); process.exit(1); });
