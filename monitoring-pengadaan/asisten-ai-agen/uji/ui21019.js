// Uji Pembaruan 2.10.19 — jenis kontrak dinamis (SPPP · SPKP · SPMB), nomor dokumen, BAP kontrak awal vs addendum, validasi keuangan kumulatif.
// Mesin Excel paket dijalankan di Chromium TANPA HTML dasar: JS paket dipecah per blok tingkat-atas (blok yang butuh HTML dasar gagal sendiri).
// Skenario = berkas rujukan BAP_Add.xlsx: kontrak awal Rp 81.700.000 → Addendum 1 Rp 136.800.000, retensi 5%, PPN 11%;
// BAP 1 (20% kontrak awal) terbit sebelum addendum, BAP 2 sesudahnya (kumulatif 100% addendum).
//   node uji/ui21019.js [pembaruan-2.10.19.json]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const PAKET = process.argv[2] || path.join(__dirname, '..', 'pembaruan-2.10.19.json');
const boot = async (berkasPaket, opsi) => {
  opsi = opsi || {};
  const pk = JSON.parse(fs.readFileSync(berkasPaket, 'utf8')), js = pk.js;
  const baris = js.split('\n'), blok = []; let buf = [];
  baris.forEach(l => { buf.push(l); if (/^\}\)\(.*\);?\s*$/.test(l)) { blok.push(buf.join('\n')); buf = []; } });
  if (buf.length) blok.push(buf.join('\n'));
  const b = await chromium.launch(); const p = await b.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message).slice(0, 160)));
  await p.setContent('<!doctype html><html><body></body></html>');
  await p.addScriptTag({ content: 'var RINGKASAN=[],PROG={data:[]},REG={data:[],sesi:null},PROYEK={id:"1726012",namaLengkap:"Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok"},KSO={};window.__notif=[];function notif(m,t){window.__notif.push([t||"",String(m)]);}function idItem(g,it,i){return it.kodeUnik||(g.key+"#"+i);}function nomorBA(u,k,key){return String(u).padStart(2,"0")+"/"+k+"/"+key;}' + (opsi.awal || '') });
  for (const k of blok) if (k.trim()) await p.addScriptTag({ content: k });
  await p.waitForTimeout(opsi.tunggu || 3500);
  return { b, p, err, versi: pk.versi, nBlok: blok.length };
};
const pasang = (o) => {
  const J = o.jenis, ekor = '/' + J + '/WSKT-NK KSO/1726012/2026', NO = '15' + ekor, NOA = '15/ADD-1' + ekor;
  const X = o.skala || 1, it = (ur, vol, sat, harga, kode) => ({ itemPekerjaan: ur, volume: vol, satuan: sat, hargaSatuan: harga * X, kodeItem: kode || '' });
  const awal = [it('Mobilisasi dan Akomodasi', 0, '', 0), it('Mob-Demob Mesin+Alat(untuk 2 unit alat)', 2, 'trip/unit', 2250000, 'A1'), it('Mob-Demob Tim (estimasi 10 orang)', 2, 'trip/unit', 800000, 'A2'), it('Transportasi Lokal', 1, 'ls', 2500000, 'A3'), it('Mess (Kontrakan)', 1, 'ls', 1800000, 'A4'),
    it('Field Investigation', 0, '', 0), it('Coring (Drilling Sampai Lapisan Armor)', 192, 'titik/meter', 300000, 'B1'), it('Corebox Sampling', 24, 'titik/bor', 125000, 'B2'), it('Coring Beton (40 cm sd 100 cm)', 6, 'titik/titik', 950000, 'B3'),
    it('Report', 0, '', 0), it('Factual Report Drilling Investigation', 1, 'ls', 5000000, 'C1')];
  const add = JSON.parse(JSON.stringify(awal)); add[1].volume = 4; add[2].volume = 4; add[6].volume = 352; add[7].volume = 32;
  const jml = L => L.reduce((s, x) => s + x.volume * x.hargaSatuan, 0);
  const id = i => NO + '#' + i, idA = i => NOA + '#' + i;
  const bk1 = { id: 'BK1', noKontrak: NO, tagihanKe: 1, periodeKey: 202608, periode: 'Agustus 2026', tanggal: '2026-08-12', tanggalBA: '2026-08-12', dibuatPada: '2026-08-12T03:00:00Z', kodeBA: 'BAPP', nomorBA: '01/BAPP/' + NO,
    items: { [id(1)]: 2, [id(2)]: 2, [id(3)]: 1, [id(4)]: 1, [id(6)]: 19.8 }, nilai: 16340000 * X };
  // BAP 2 dicatat atas nomor ADDENDUM dengan id item addendum (kasus yang memunculkan 0% bila alias tidak dipakai)
  const bk2 = { id: 'BK2', noKontrak: o.bk2DiAwal ? NO : NOA, tagihanKe: 2, periodeKey: 202611, periode: 'November 2026', tanggal: '2026-11-11', tanggalBA: '2026-11-11', dibuatPada: '2026-11-11T03:00:00Z', kodeBA: 'BAPP', nomorBA: '02/BAPP/' + (o.bk2DiAwal ? NO : NOA),
    items: {}, nilai: 120460000 * X };
  const k2 = o.bk2DiAwal ? id : idA;
  Object.assign(bk2.items, { [k2(1)]: 2, [k2(2)]: 2, [k2(6)]: 332.2, [k2(7)]: 32, [k2(8)]: 6, [k2(10)]: 1 });
  const G = { key: NO, keyAsli: NO, terkait: [], namaVendor: 'PT Kane Perkasa Indonesia', idVendor: 'V1', namaPekerjaan: 'Pekerjaan Penyelidikan Tanah', tglMulai: '2026-08-07', tglSelesai: '2026-08-27', nilai: jml(awal), items: awal, entriProgres: [bk1], realisasi: 16340000 };
  const A = { key: NOA, terkait: [], namaVendor: G.namaVendor, idVendor: 'V1', namaPekerjaan: G.namaPekerjaan, tglMulai: '2026-08-27', tglSelesai: '2026-11-30', nilai: jml(add), items: add, entriProgres: o.bk2DiAwal ? [] : [bk2], realisasi: 120460000 };
  if (o.bk2DiAwal) G.entriProgres.push(bk2);
  REG.data = [{ noKontrak: NO, tglKontrak: '2026-08-07', tglSelesai: '2026-08-27', nilai: G.nilai, diposting: true, dibuatPada: '2026-08-07T01:00:00Z', namaPekerjaan: G.namaPekerjaan },
    { noKontrak: NOA, tglKontrak: '2026-08-27', tglSelesai: '2026-11-30', nilai: A.nilai, diposting: true, dibuatPada: '2026-08-27T01:00:00Z', dipostingPada: '2026-08-27T02:00:00Z', namaPekerjaan: G.namaPekerjaan }];
  PROG.data = [bk1, bk2];
  RINGKASAN = o.tanpaAdd ? [G] : window.mp21013Lebur([G, A]);
  if (o.tanpaAdd) { PROG.data = [bk1]; REG.data = [REG.data[0]]; }
  return { NO, NOA };
};
const bangun = async (bkId, persen) => {
  const K = await window.MP298.kasusBK(bkId); K.retensi = persen.retensi; K.uangMuka = persen.uangMuka || 0;
  K.vendor = Object.assign(K.vendor || {}, { direktur: 'Wiwit Kurniawan', jabatan: 'Direktur', alamat: 'Jl. Pengayoman I no 70, Jakarta Timur', npwp: '12.988.444.1-001.000' });
  const B = await window.mp293Bangun(K), H = B.hasil, v = (sh, r) => { const m = H.get(sh); return m ? m.get(r) : undefined; };
  const sel = {}; ['C11', 'K20', 'D21', 'K21', 'K22', 'K23', 'N23', 'D24', 'K24', 'D25', 'K25', 'P24', 'P25', 'K26', 'K27', 'J30', 'M30', 'P30', 'J31', 'P31', 'J32', 'P32', 'J35', 'P35', 'J36', 'M36', 'P36', 'J37', 'P37', 'J40', 'P40', 'J41', 'P41', 'J42', 'P42', 'Q48', 'Q49', 'Q50', 'D15', 'J15', 'P67', 'P68'].forEach(r => { sel[r] = v('BAP  1', r); });
  return { nomor: K.nomor, tahap: K.mp21016 || null, mode: B.I.modeRumus, alasan: B.I.alasanMode || '', validasi: B.I.validasi || K.validasi || null, BAP: sel,
    BAPP: { B10: v('BAPP', 'B10'), C21: v('BAPP', 'C21'), H23: v('BAPP', 'H23'), K66: v('BAPP', 'K66') }, lamp1: { B3: v('lamp1', 'B3'), F6: v('lamp1', 'F6'), K41: v('lamp1', 'K41') },
    DATA: { B4: v('DATA', 'B4'), B10: v('DATA', 'B10'), B30: v('DATA', 'B30'), B31: v('DATA', 'B31'), B32: v('DATA', 'B32'), B37: v('DATA', 'B37'), A4: v('DATA', 'A4') }, BAPR: { B29: v('BAPR ', 'B29'), G25: v('BAPR ', 'G25') }, notif: window.__notif.splice(0) };
};
let lulus = 0, gagal = 0;
const cek = (nama, ok, info) => { if (ok) lulus++; else gagal++; console.log((ok ? '  ok   ' : '  GAGAL ') + nama + (ok ? '' : ' → ' + JSON.stringify(info))); };
const dekat = (a, b, t) => Math.abs(Number(a) - Number(b)) <= (t === undefined ? 0.5 : t);
(async () => {
  const x = await boot(PAKET), ev = (f, ...a) => x.p.evaluate(`(${f.toString()})(${a.map(v => JSON.stringify(v)).join(',')})`);
  try {
    console.log('Paket ' + x.versi + ' · ' + x.nBlok + ' blok');
    // ---------- A. nomor dokumen & ganti jenis ----------
    const N = await x.p.evaluate(() => { const M = window.MP21019, K = '15/SPPP/WSKT-NK KSO/1726012/2026', A = '15/ADD-1/SPPP/WSKT-NK KSO/1726012/2026'; return {
      bap1: M.nomor({ urut: 1, dok: 'BAP', noKontrak: K }), bap2: M.nomor({ urut: 2, dok: 'BAP', noKontrak: A }), bapp2: M.nomor({ urut: 2, dok: 'BAPP', noKontrak: K, add: 1 }),
      bapr: M.nomor({ urut: 1, dok: 'BAPR', noKontrak: K }), bapm: M.nomor({ urut: 3, dok: 'BAPM', noKontrak: K, jenis: 'SPKP' }), spmb: M.nomor({ urut: 2, dok: 'BAP', noKontrak: A, jenis: 'SPMB' }),
      awalDariAdd: M.nomor({ urut: 1, dok: 'BAP', noKontrak: A, add: 0 }), ganti: M.gantiJenis('02/BAP/015/ADD1/SPPP/WK-NK.KSO/PDBJ/1726012/2026', 'SPKP'), lama: M.gantiJenis('ADD1/015/SPPP/WK-NK.KSO/PDBJ/1726012/2026', 'SPMB'),
      jenis: [M.jenis(K), M.jenis(A), M.jenis('ADD2/015/SPMB/X/2026'), M.jenis('02/BAPR/015/ADD1/SPKP/X/2026')], set: M.nomorSet(2, A), dok: M.gantiDok('02/BAPP/15/ADD-1/SPPP/X', 'BAPR'),
      fmt: ['15/SPMB/X/2026', '15/ADD1/SPMB/X/2026', '15/SPKP/X/2026', '15/SPPP/X/2026', '15/SPSA/X/2026'].map(n => window.mp293Format(n)) }; });
    cek('BAP 1 kontrak awal', N.bap1 === '01/BAP/15/SPPP/WSKT-NK KSO/1726012/2026', N.bap1);
    cek('BAP 2 addendum', N.bap2 === '02/BAP/15/ADD-1/SPPP/WSKT-NK KSO/1726012/2026', N.bap2);
    cek('BAPP addendum dari nomor awal (ADDn baku)', N.bapp2 === '02/BAPP/15/ADD1/SPPP/WSKT-NK KSO/1726012/2026', N.bapp2);
    cek('BAPR', N.bapr === '01/BAPR/15/SPPP/WSKT-NK KSO/1726012/2026', N.bapr);
    cek('BAPM ganti ruas → SPKP', N.bapm === '03/BAPM/15/SPKP/WSKT-NK KSO/1726012/2026', N.bapm);
    cek('BAP addendum ganti ruas → SPMB', N.spmb === '02/BAP/15/ADD-1/SPMB/WSKT-NK KSO/1726012/2026', N.spmb);
    cek('nomor kontrak awal dari nomor addendum', N.awalDariAdd === '01/BAP/15/SPPP/WSKT-NK KSO/1726012/2026', N.awalDariAdd);
    cek('gantiJenis pada nomor dokumen', N.ganti === '02/BAP/015/ADD1/SPKP/WK-NK.KSO/PDBJ/1726012/2026', N.ganti);
    cek('gantiJenis nomor addendum format lama', N.lama === 'ADD1/015/SPMB/WK-NK.KSO/PDBJ/1726012/2026', N.lama);
    cek('jenis() dari kontrak / addendum / dokumen', N.jenis.join() === 'SPPP,SPPP,SPMB,SPKP', N.jenis);
    cek('nomorSet & gantiDok', N.set.BAPR === '02/BAPR/15/ADD-1/SPPP/WSKT-NK KSO/1726012/2026' && N.set.BAST.indexOf('02/BAST/') === 0 && N.dok === '02/BAPR/15/ADD-1/SPPP/X', [N.set, N.dok]);
    cek('format Excel: SPMB/SPKP/SPPP = bap, SPSA = -', N.fmt.join() === 'bap,bap,bap,bap,', N.fmt);

    // ---------- B. BAP kontrak awal vs BAP addendum, per jenis kontrak ----------
    for (const jenis of ['SPPP', 'SPKP', 'SPMB']) for (const bk2DiAwal of [true, false]) {
      const t = jenis + (bk2DiAwal ? ' (kode item kontrak)' : ' (BK atas nomor addendum, kode item addendum)');
      await ev(pasang, { jenis, bk2DiAwal });
      const a = await ev(bangun, 'BK1', { retensi: 5 }), b = await ev(bangun, 'BK2', { retensi: 5 }), ekor = '/' + jenis + '/WSKT-NK KSO/1726012/2026';
      console.log(' ' + t);
      cek('BAP 1 nomor & dasar kontrak awal', a.BAP.C11 === '01/BAP/15' + ekor && a.tahap.tahap === 0 && dekat(a.BAP.M30, 81700000), [a.BAP.C11, a.BAP.M30]);
      cek('BAP 1 prestasi 20% · retensi 817.000 · total 17.230.530', dekat(a.BAP.J32, 0.2, 1e-9) && dekat(a.BAP.P31, 0) && dekat(a.BAP.P37, 817000) && dekat(a.BAP.Q48, 15523000) && dekat(a.BAP.Q50, 17230530), a.BAP);
      cek('BAP 1 teks jenis kontrak', a.BAPP.C21.indexOf('lampiran ' + jenis + ' Nomor 15' + ekor) > 0 && a.lamp1.B3 === 'LAMPIRAN ' + jenis + ' NO. 15' + ekor && a.BAPR.B29.indexOf('(' + jenis + ')') > 0, [a.BAPP.C21, a.lamp1.B3, a.BAPR.B29]);
      cek('BAP 2 nomor addendum', b.BAP.C11 === '02/BAP/15/ADD-1' + ekor && b.BAPP.B10 === '02/BAPP/15/ADD-1' + ekor && b.tahap.tahap === 1, [b.BAP.C11, b.BAPP.B10]);
      cek('BAP 2 dasar = Nilai Addendum 136.800.000, Nilai Kontrak awal 81.700.000', dekat(b.BAP.M30, 136800000) && dekat(b.BAP.K25, 136800000) && b.tahap.nilaiAwal === 81700000, [b.BAP.M30, b.BAP.K25]);
      cek('BAP 2 prestasi lalu 11,94% · saat ini 88,06% · s/d 100%', dekat(b.BAP.J31, 16340000 / 136800000, 1e-9) && dekat(b.BAP.P31, 16340000) && dekat(b.BAP.P32, 120460000) && dekat(b.BAP.J30, 1, 1e-9), b.BAP);
      cek('BAP 2 retensi lalu 817.000 · saat ini 6.023.000 · s/d 6.840.000', dekat(b.BAP.P36, 817000) && dekat(b.BAP.P37, 6023000) && dekat(b.BAP.P35, 6840000) && dekat(b.BAP.J36, 0.05, 1e-9), b.BAP);
      cek('BAP 2 a-b-c 114.437.000 · PPN 12.588.070 · total 127.025.070', dekat(b.BAP.Q48, 114437000) && dekat(b.BAP.Q49, 12588070) && dekat(b.BAP.Q50, 127025070), b.BAP);
      cek('BAP 2 narasi BAPP memuat addendum & jenis', b.BAPP.C21.indexOf('Addendum I Nomor 15/ADD-1' + ekor) > 0 && b.BAPP.C21.indexOf('atas ' + jenis + ' Nomor 15' + ekor) > 0, b.BAPP.C21);
      const V = b.validasi || {}, A = V.angka || {};
      cek('validasi BAP 2 lulus & cocok Excel', V.ok === true && V.excel && V.excel.cocok && A.retensi.lalu === 817000 && A.retensi.sd === 6840000 && A.nilaiAwal === 81700000 && A.nilaiAddendum === 136800000 && A.setelahPotongan === 114437000 && V.aliasDipakai === (bk2DiAwal ? 0 : 6), V);
      cek('tanpa notifikasi galat', !a.notif.concat(b.notif).some(n => /VALIDASI BAP/.test(n[1])), a.notif.concat(b.notif));
    }

    // ---------- C. uang muka kumulatif & kontrak tanpa addendum ----------
    await ev(pasang, { jenis: 'SPMB', bk2DiAwal: false });
    const u = await ev(bangun, 'BK2', { retensi: 5, uangMuka: 10 });
    cek('uang muka 10%: lalu 1.634.000 · saat ini 12.046.000 · s/d 13.680.000', dekat(u.BAP.P41, 1634000) && dekat(u.BAP.P42, 12046000) && dekat(u.BAP.P40, 13680000) && dekat(u.BAP.Q48, 120460000 - 6023000 - 12046000) && u.validasi.ok && u.validasi.excel.cocok, [u.BAP, u.validasi]);
    await ev(pasang, { jenis: 'SPMB', tanpaAdd: true });
    const n = await ev(bangun, 'BK1', { retensi: 5 });
    cek('tanpa addendum: linier atas kontrak awal', n.tahap === null && n.BAP.C11 === '01/BAP/15/SPMB/WSKT-NK KSO/1726012/2026' && dekat(n.BAP.M30, 81700000) && dekat(n.BAP.Q50, 17230530) && n.validasi.ok && n.validasi.tahap === 0, [n.BAP, n.validasi]);

    // ---------- E. penanda tangan BAP: nilai DPP > Rp 3 M → Kuasa KSO ----------
    await ev(pasang, { jenis: 'SPPP', bk2DiAwal: true, skala: 25 });   // kontrak awal Rp 2.042.500.000 (DPP) → Add.1 Rp 3.420.000.000 (DPP)
    const t1 = await ev(bangun, 'BK1', { retensi: 5 }), t2 = await ev(bangun, 'BK2', { retensi: 5 });
    cek('DPP 2,04 M (≤ 3 M) → Kepala Proyek', dekat(t1.BAP.M30, 2042500000) && /dedy hariyanto/i.test(t1.BAP.P67) && t1.BAP.P68 === 'Kepala Proyek' && /dedy hariyanto/i.test(t1.BAP.D15) && t1.BAP.J15.indexOf('Selaku Kepala Proyek') === 0 && t1.validasi.penanda.kuasa === false && t1.validasi.excel.cocok, [t1.BAP.P67, t1.BAP.P68, t1.BAP.J15, t1.validasi.penanda, t1.validasi.excel]);
    cek('DPP 3,42 M (> 3 M) → Stefanus Gunawan, Kuasa KSO', dekat(t2.BAP.M30, 3420000000) && t2.BAP.P67 === 'Stefanus Gunawan' && t2.BAP.P68 === 'Kuasa KSO' && t2.BAP.D15 === 'Stefanus Gunawan' && t2.BAP.J15.indexOf('Selaku Kuasa KSO') === 0 && t2.validasi.penanda.kuasa === true && t2.validasi.excel.cocok && t2.validasi.ok, [t2.BAP.P67, t2.BAP.P68, t2.BAP.J15, t2.validasi.penanda, t2.validasi.excel]);
    const pn = await x.p.evaluate(() => { const M = window.MP21019, kp = { nama: 'Dedy Hariyanto', jabatan: 'Kepala Proyek' }, c = n => ({ h: { nilaiKontrak: 2000000000, batasNilai: n }, kapro: kp, Kt: {} });
      return { pas: M.penanda(3000000000, kp), lebih: M.penanda(3000000001, kp), ppn: M.penanda(2800000000, kp), pdfKecil: window.mp21019PenandaBAP(c(2999999999)).kapro, pdfBesar: window.mp21019PenandaBAP(c(3100000000)).kapro, asli: kp.nama,
        blok: /function docBAP\(c\) \{\s+if \(typeof window !== 'undefined' && typeof window\.mp21019PenandaBAP === 'function'\) c = window\.mp21019PenandaBAP\(c\);/.test(String(window.BLD && window.BLD.semua ? '' : '') + document.documentElement.innerHTML) }; });
    cek('batas: tepat Rp 3 M → Kepala Proyek, Rp 3 M + 1 → Kuasa KSO', pn.pas.kuasa === false && pn.pas.nama === 'Dedy Hariyanto' && pn.lebih.kuasa === true && pn.lebih.nama === 'Stefanus Gunawan', pn);
    cek('DPP 2,8 M (3,108 M termasuk PPN 11%) tetap Kepala Proyek', pn.ppn.kuasa === false, pn.ppn);
    cek('BAP PDF Paket Tagihan: pihak pertama mengikuti batas, data identitas tidak berubah', pn.pdfKecil.nama === 'Dedy Hariyanto' && pn.pdfBesar.nama === 'Stefanus Gunawan' && pn.pdfBesar.jabatan === 'Kuasa KSO' && pn.asli === 'Dedy Hariyanto' && pn.blok, pn);

    // ---------- D. galat validasi ----------
    await ev(pasang, { jenis: 'SPPP', bk2DiAwal: false });
    const g = await x.p.evaluate(async () => { PROG.data.find(e => e.id === 'BK2').items = { 'kode-tak-dikenal': 5 }; window.__notif.length = 0;
      const K = await window.MP298.kasusBK('BK2'); K.retensi = 0; await window.mp293Bangun(K); return { V: K.mp21019, notif: window.__notif.slice() }; });
    cek('prestasi 0% padahal BK bervolume → galat INI_NOL + notifikasi', !g.V.ok && g.V.butir.some(b => b.kode === 'INI_NOL') && g.notif.some(q => /VALIDASI BAP — Prestasi saat ini 0%/.test(q[1])), g);
    cek('retensi 0% → peringatan RETENSI_NOL', g.V.butir.some(b => b.kode === 'RETENSI_NOL' && b.tingkat === 'peringatan'), g.V.butir);
    const k = await x.p.evaluate(() => typeof window.kodeBA === 'function' ? window.kodeBA({ key: '15/SPMB/X/2026' }) : 'tanpa HTML dasar');
    cek('kodeBA SPMB', k === 'BAPP' || k === 'tanpa HTML dasar', k);
  } finally { await x.b.close(); }
  console.log('\n' + lulus + ' lulus, ' + gagal + ' gagal'); process.exit(gagal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
