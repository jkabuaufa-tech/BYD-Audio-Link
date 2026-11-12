// Uji Pembaruan 2.10.16 (blok MP21016 + 7 perbaikan di tempat) di Chromium, memakai BLOK ASLI paket (MP220, MP227, MP258, MP292, MP293, XLH,
// XLR, MP296, MP298, MP2622, MP21015, MP21013) dan Modul server 1.10.16 asli lewat kernel tiruan. HTML dasar & Code.gs tidak ada di repo,
// jadi daftar kontrak gabungan (semuaKontrak214) dan idItem ditiru sesuai perilaku aslinya.
//   node uji/ui21016.js [folder-tangkapan]
// Data: kasus nyata PT Kane Perkasa Indonesia (uji/data_kane.js) — angka dibandingkan dengan dokumen BAP 1 kontrak awal & BAP Add.1 bertanda tangan.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const { buatModul } = require('./kernel_tiruan.js'), { blok, daftar } = require('./blok_paket.js'), D = require('./data_kane.js');
const R = path.join(__dirname, '..'), paket = JSON.parse(fs.readFileSync(path.join(R, 'pembaruan-2.10.16.json'), 'utf8')), js = paket.js, out = process.argv[2];
const sumber = fs.readFileSync(path.join(R, 'sumber', 'pembaruan-2.10.16-adendum-notif.js'), 'utf8');
assert.ok(js.includes(sumber.trim()) && ['__MP21011__', '__MP21013__', '__MP21015__', '__MP2105__'].every(k => js.includes(k)), 'paket 2.10.16 = 2.10.15 utuh + blok MP21016');
const K = buatModul(path.join(R, 'server-modul-1.10.16.json'), { hariIni: '2026-11-12' }), A = K.MODUL.aksi, P = 'JICT';
K.ctx.IZIN_REG = {}; K.ctx.mp24Baca_ = () => []; K.ctx.mp24IsiAlokasi_ = () => ({}); K.ctx.mp24TulisBaris_ = () => { };
const U = { 'Joko Supriyono': { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' } };
const T = D.T, FAJAR = '024/SPK' + T, ADHI = '031/SPM' + T, FARIK = '005/SPPM' + T;
const MASTER = [
  { key: FAJAR, namaVendor: 'Fajar Mulia Utama, CV', nilai: 1774117561, realisasi: 0, tglMulai: '2026-03-03', tglSelesai: '2026-07-03', items: [], statusKey: 'berjalan' },
  { key: ADHI, namaVendor: 'Adhimix RMC Indonesia, PT', nilai: 1538735000, realisasi: 877078950, tglMulai: '2026-03-08', tglSelesai: '2026-07-08', items: [], statusKey: 'berjalan' },
  { key: FARIK, namaVendor: 'Farika Steel, PT', nilai: 500000000, realisasi: 51000000, tglMulai: '2026-06-03', tglSelesai: '2026-10-03', items: [], statusKey: 'berjalan' }];
K.koleksi[P + '|data'] = JSON.parse(JSON.stringify(D.REG)); K.koleksi[P + '|progres'] = [];
let nS = 0; const now = () => new Date(Date.UTC(2026, 10, 12, 3, 0, nS++)).toISOString();
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const dekat = (a, b, m) => ok(Math.abs(Number(a) - b) < 0.6, m + ' = ' + b.toLocaleString('id-ID'));

(async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: out ? 2 : 1 }); const galat = [];
  pg.on('pageerror', e => galat.push(e.message));
  await pg.exposeFunction('__srv', (a, x, nama) => { try { if (!A[a]) throw new Error('Aksi tidak dikenal: ' + a); const r = A[a](x || {}, U[nama], P, now()); return JSON.parse(JSON.stringify(r === undefined ? { ok: true } : r)); } catch (e) { return { ok: false, error: e.message }; } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px system-ui,Arial,sans-serif;margin:16px;background:#0e1f3d;color:#dbe6f5}table.r{width:100%;border-collapse:collapse}table.r td{padding:10px;border-bottom:1px solid #1e3a66;vertical-align:top}code{color:#7db6f2;font-weight:700}
    .btn{border:1px solid #2a78d6;border-radius:6px;padding:4px 9px;font-size:13px;cursor:pointer;background:#12305a;color:#dbe6f5}.btn-link{border:0;background:none;color:#7db6f2;text-decoration:underline}.btn-primary{background:#1763B3;color:#fff}.btn-light{background:#fff;color:#1f2937}.border{border:1px solid #cbd5e1}.btn-outline-secondary{background:#fff;color:#334155;border-color:#94a3b8}
    .btn-close{border:0;background:none;font-size:18px;cursor:pointer}.btn-close:before{content:"×"}.form-control,.form-select{border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font:inherit}.font-monospace{font-family:monospace}.me-1{margin-right:4px}.ms-2{margin-left:8px}.p-0{padding:0}.py-0{padding-top:0;padding-bottom:0}
    .fas{font-style:normal}.fa-code-compare:before{content:"⇄"}.fa-print:before{content:"🖶"}.fa-triangle-exclamation:before{content:"⚠"}.fa-bell:before{content:"🔔"}.fa-file-contract:before{content:"📄"}.fa-check:before{content:"✓"}.fa-rotate:before{content:"↻"}
    #top{position:relative;display:flex;justify-content:flex-end;margin-bottom:8px}${paket.css}</style></head>
    <body><div id="top"><button id="mp220Bell" class="btn" onclick="mp220Lonceng()"><i class="fas fa-bell"></i><span id="mp220BellN"></span></button></div><h3>Register Kontrak</h3><table class="r"><tbody id="regBody"></tbody></table></body></html>`);
  // jam tetap 12 Nov 2026 10.00 WIB → hasil uji tidak bergantung tanggal menjalankan
  await pg.evaluate(() => { const T0 = Date.parse('2026-11-12T03:00:00Z'), RD = Date; class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(T0); } static now() { return T0; } } window.Date = FD; });
  await pg.evaluate(({ REG, PROG, MASTER }) => {
    window.REG = { sesi: { nama: 'Joko Supriyono', admin: true, peran: 'PENGADAAN' }, data: REG, url: 'https://srv.test/exec', filter: '' }; window.PROG = { data: [PROG[0]] }; window.__MASTER = MASTER; window.RINGKASAN = [];
    window.PROYEK = { id: '1726012', namaLengkap: 'Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' }; window.KSO = { nama: 'WASKITA - NINDYA, KSO' };
    window.__n = []; window.notif = (m, t) => window.__n.push([m, t]); window.__s = []; window.__klik = [];
    window.regAksi = async (a, x) => { window.__s.push([a, JSON.parse(JSON.stringify(x || {}))]); const r = await window.__srv(a, x || {}, window.REG.sesi.nama); if (!r || r.ok === false) throw new Error((r && r.error) || 'gagal'); return r; };
    window.regPost = window.regAksi; window.bukaEditReg = id => window.__klik.push('edit:' + id); window.bukaKoreksi = k => window.__klik.push('koreksi:' + k);
    window.idItem = (g, it, i) => it.kodeUnik || ((g.keyAsli || g.key) + '#' + i);
    // tiruan daftar kontrak gabungan (aslinya di HTML dasar / blok v2.1.x): baris Register + baris Master yang belum terwakili
    window.semuaKontrak214 = () => { const rows = [], pakai = new Set(), ring = window.RINGKASAN || [];
      (window.REG.data || []).forEach(r => { const g = ring.find(z => z.key === r.noKontrak || z.keyAsli === r.noKontrak || (z.terkait || []).includes(r.noKontrak)) || null; if (g) pakai.add(g);
        rows.push({ t: 'reg', r, g, key: r.noKontrak, nomor: [r.noKontrak], vendor: r.namaVendor, nilai: r.nilai, realisasi: g ? g.realisasi : 0, statusKey: r.diposting ? 'berjalan' : 'draf' }); });
      ring.forEach(g => { if (!pakai.has(g)) rows.push({ t: 'master', g, key: g.key, nomor: [g.key], vendor: g.namaVendor, nilai: g.nilai, realisasi: g.realisasi, statusKey: g.statusKey }); });
      return rows; };
    window.renderRegister = () => { document.getElementById('regBody').innerHTML = window.semuaKontrak214().filter(x => !(x.t === 'reg' && window.mpNoAdd(x.key).n === 0 && window.REG.data.some(r => window.mpNoAdd(r.noKontrak).induk === x.key && window.mpNoAdd(r.noKontrak).n > 0)))
      .map(x => `<tr class="baris-kontrak" data-t="${x.t}" data-id="${x.t === 'reg' ? x.r.id : x.g.key}" data-key="${x.g ? x.g.key : x.key}"><td>1</td><td><code>${x.key}</code><div>${x.t === 'reg' ? 'Register' : 'Master'}</div></td><td>${x.vendor}</td><td>${Math.round(x.nilai).toLocaleString('id-ID')}</td><td><button type="button" class="btn">✎</button></td></tr>`).join(''); };
  }, { REG: D.REG, PROG: D.PROG, MASTER });
  const muat = async nama => { for (const n of nama) { const g0 = galat.length; await pg.addScriptTag({ content: n === 'KEPALA' ? js.slice(0, daftar(js)[1].awal) : blok(js, n) }); assert.ok(galat.length === g0, 'blok ' + n + ' dimuat tanpa galat: ' + galat.slice(g0).join(' | ')); } };
  await muat(['KEPALA', 'MP220', 'MP227', 'MP258', 'MP292', 'MP293', 'XLH', 'XLR', 'MP296', 'MP298', 'MP2622', 'MP21015', 'MP21016', 'MP21013']);
  await pg.evaluate(G => { window.mp220Srv = () => true; window.RINGKASAN = window.mp21013Lebur(G).concat(window.__MASTER); window.renderRegister(); }, D.grup().map(g => g.key === D.NO ? Object.assign(g, { realisasi: 16340000, entriProgres: [D.PROG[0]] }) : g));
  const tunggu = ms => pg.waitForTimeout(ms || 800), tangkap = async (nm, sel) => { if (!out) return; if (sel) await pg.locator(sel).first().screenshot({ path: path.join(out, nm) }); else await pg.screenshot({ path: path.join(out, nm), fullPage: true }); };
  await tunggu(3200);
  const lonceng = () => pg.evaluate(() => { window.mp258Hitung(); return window.MP258_NT.L.filter(x => x.g === 'kontrak').map(x => ({ j: x.judul, t: x.tahap, l: x.level, nilai: x.nilai })); });
  const lama = () => pg.evaluate(() => { window.mp220HitungNotif(); return window.mp220NotifDaftar().filter(x => x.g === 'kontrak').map(x => x.judul); });
  const ada = (L, awal) => L.some(x => (x.j || x).indexOf(awal) === 0);

  console.log('A. Lonceng — hanya kontrak aktif');
  let L = await lonceng();
  ok(ada(L, '024/SPK') && ada(L, '031/SPM') && ada(L, '005/SPPM'), 'sebelum dibatalkan: Fajar Mulia, Adhimix, Farika tampil (masa berlaku lewat)');
  ok(!ada(L, '015/SPPP') && L.filter(x => x.j.indexOf('015/ADD1') === 0).length === 1, 'keluarga kontrak ber-addendum dipantau SEKALI dari addendum terakhir — kontrak awal 015/SPPP (lewat 27 Agu) tidak lagi "Lewat"');
  ok(L.find(x => x.j.indexOf('015/ADD1') === 0).t === 'H-30', 'addendum 015/ADD1 berakhir 30 Nov 2026 → tahap H-30 (Info), bukan Kritis');
  const tanpa = await pg.evaluate(() => { const f = window.mp21016Lewati; window.mp21016Lewati = null; window.mp258Hitung(); const n = window.MP258_NT.L.filter(x => x.g === 'kontrak').map(x => x.judul); window.mp21016Lewati = f; window.mp258Hitung(); return n; });
  ok(tanpa.some(j => j.indexOf('015/SPPP') === 0) && tanpa.length === L.length + 1, 'pembanding (perilaku 2.10.15, saringan dimatikan): kontrak awal ikut muncul sebagai "Lewat"');
  // PO CANCEL Fajar Mulia lewat server asli → status dimuat ulang → lonceng dihitung ulang otomatis
  await pg.evaluate(async no => { await window.regAksi('kontrakBatal', { data: { noKontrak: no, status: 'CANCELLED', alasan: 'Kontrak dibatalkan, vendor tidak melanjutkan pekerjaan', sumber: 'MASTER', namaVendor: 'Fajar Mulia Utama, CV', nilai: 1774117561 } }); await window.mp21015Muat(true); }, FAJAR);
  await tunggu(2600);
  const otomatis = await pg.evaluate(() => window.MP258_NT.L.filter(x => x.g === 'kontrak').map(x => x.judul));
  ok(!otomatis.some(j => /Fajar Mulia/.test(j)), 'sesudah PO CANCEL: Fajar Mulia hilang dari Notifikasi prioritas tanpa memuat ulang halaman');
  L = await lonceng();
  ok(ada(L, '031/SPM') && ada(L, '005/SPPM') && ada(L, '015/ADD1') && L.length === 3, 'kontrak aktif lain tetap tampil (Adhimix, Farika, Kane Add.1)');
  ok(!(await lama()).some(j => /Fajar Mulia/.test(j)), 'lonceng lama 2.2.x (mp220NotifDaftar) juga tidak memuat kontrak PO CANCEL');
  ok(await pg.evaluate(() => window.MP258_NT.n.KRITIS) === 2, 'angka lonceng (Kritis) turun menjadi 2');
  const snap = await pg.evaluate(async () => { await window.mp227KirimSnapshot(true); const s = window.__s.filter(x => x[0] === 'notifSnapshot').pop(); return s ? s[1].data.kontrak : null; });
  ok(snap && !snap.some(x => /Fajar Mulia/.test(x.judul)) && snap.every(x => x.no && (x.reg === 0 || x.reg === 1)) && !snap.some(x => x.no === D.NO), 'ringkasan ke server: tanpa kontrak PO CANCEL & tanpa kontrak awal ber-addendum; tiap butir membawa nomor kontrak');
  const email = A.notifInfo({}, U['Joko Supriyono'], P).pratinjau.grup.find(g => g.k === 'kontrak').item.map(x => x.judul);
  ok(email.length === 3 && !email.some(j => /Fajar Mulia/.test(j)), 'isi email / Telegram terjadwal (server 1.10.16): 3 kontrak aktif, tanpa Fajar Mulia');
  await pg.evaluate(() => window.mp220Lonceng()); await tunggu(300); await tangkap('notif-kontrak-aktif.png', '#mp258Panel');
  await pg.evaluate(() => window.mp258Tutup());
  await pg.evaluate(async no => { await window.regAksi('kontrakBatal', { data: { noKontrak: no, status: 'HOLD', alasan: 'Ditahan menunggu klarifikasi mutu beton' } }); await window.mp21015Muat(true); }, ADHI);
  L = await lonceng(); ok(!ada(L, '031/SPM') && L.length === 2, 'kontrak HOLD tidak dipindai notifikasi');
  await pg.evaluate(async no => { const st = window.mp21015Status(no); await window.regAksi('kontrakPulih', { data: { noKontrak: no, alasan: 'Klarifikasi selesai, kontrak dilanjutkan', versi: st.versi } }); await window.mp21015Muat(true); }, ADHI);
  L = await lonceng(); ok(ada(L, '031/SPM') && L.length === 3, 'kontrak yang dipulihkan kembali dipantau');
  // lunas 100% → selesai (aturan 2.6.4 / 2.6.9 tetap berlaku)
  await pg.evaluate(({ G, PROG }) => { window.PROG.data = PROG; window.RINGKASAN = window.mp21013Lebur(G).concat(window.__MASTER); }, { G: D.grup(), PROG: D.PROG });
  L = await lonceng(); ok(!ada(L, '015/'), 'kontrak lunas 100% (BAP 1 + BAP 2 = nilai addendum) tidak dinotifikasikan');

  console.log('B. BAP kontrak awal vs BAP addendum (Excel format baku, blok MP293 asli)');
  const dok = await pg.evaluate(async () => {
    const g = window.RINGKASAN[0], al = g._idAlias || {}, vendor = { nama: g.namaVendor, direktur: 'Wiwit Kurniawan', jabatan: 'Direktur', alamat: 'Jl. Pengayoman I no 70 RT. 10 RW. 08, Utan Kayu, Mataram, Jakarta Timur', npwp: '' };
    const kasus = id => { const e = PROG.data.find(x => x.id === id), ini = {}, lalu = {};   // = kasusDariPaket: volume dihitung atas rincian yang sudah melebur
      g.items.forEach((it, i) => { const k = it.kodeUnik || (g.key + '#' + i); ini[k] = 0; lalu[k] = 0; });
      PROG.data.forEach(x => Object.keys(x.items).forEach(q => { const k = al[q] || q; if (x.id === id) ini[k] = (ini[k] || 0) + x.items[q]; else if (x.tagihanKe < e.tagihanKe) lalu[k] = (lalu[k] || 0) + x.items[q]; }));
      return { g, ke: e.tagihanKe, nomor: e.nomorBA, tanggal: e.tanggalBA, tanggalBAP: '', progresId: e.id, ini, lalu, vendor, uangMuka: 0, retensi: 5 }; };
    const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }, o = {};
    for (const id of ['BK1', 'BK2']) {
      const Kx = kasus(id), B = await window.mp293Bangun(Kx), H = B.hasil, v = (sh, ref) => { const m = H.get(sh); return m ? m.get(ref) : undefined; }, sel = (sh, L2) => Object.fromEntries(L2.map(x => [x, v(sh, x)]));
      const dec = new TextDecoder(), xml = nm => dec.decode(B.F.get(B.W.byNama[nm.toUpperCase()].path));
      o[id] = { mode: B.I.modeRumus, tahap: Kx.mp21016.tahap, key: Kx.g.key, item: B.I.ringkas.item, tampil: (B.I.tampil || {})['BAP  1'] || [], bap: sel('BAP  1', ['C11', 'K20', 'K23', 'N23', 'K24', 'K25', 'J30', 'M30', 'P30', 'J31', 'P31', 'P32', 'P35', 'P36', 'P37', 'Q48', 'Q49', 'Q50']),
        bapp: sel('BAPP', ['C21', 'H23', 'I24', 'K25', 'Q61']), lamp: sel('lamp1', ['B3', 'K41', 'K42', 'K43']), data: sel('DATA', ['B10']), xBap: xml('BAP  1'), xBapp: xml('BAPP'), xBapr: xml('BAPR '), xLamp: xml('lamp1'), xlsx: b64(await window.XLH.tutupZip([...B.F.entries()])) };
    }
    o.asli = window.RINGKASAN[0].items.length; return o;
  });
  const b1 = dok.BK1, b2 = dok.BK2;
  ok(b1.tahap === 0 && b1.mode === 'ASLI' && b1.item === 11, 'BAP 1 (12 Agu 2026, sebelum addendum 27 Agu 2026) → basis KONTRAK AWAL: 11 item, mode rumus asli template tidak berubah');
  dekat(b1.bap.K24, 81700000, 'BAP 1 · Nilai Kontrak'); ok(Math.abs(b1.bap.J30 - 0.2) < 1e-9 && b1.bap.N23 === '27 Agustus 2026', 'BAP 1 · prestasi 20,00% · masa pelaksanaan s/d 27 Agustus 2026 (kontrak awal)');
  dekat(b1.bap.P30, 16340000, 'BAP 1 · prestasi s/d saat ini'); dekat(b1.bap.P37, 817000, 'BAP 1 · retensi 5%'); dekat(b1.bap.Q48, 15523000, 'BAP 1 · setelah retensi'); dekat(b1.bap.Q49, 1707530, 'BAP 1 · PPN'); dekat(b1.bap.Q50, 17230530, 'BAP 1 · total pembayaran');
  ok(!/Addendum I /.test(b1.xBap) && b1.tampil.indexOf(25) < 0, 'BAP 1 tidak memuat baris addendum');
  ok(b2.tahap === 1 && b2.item === 12 && b2.key === D.NO, 'BAP 2 (11 Nov 2026) → basis ADDENDUM I: 12 item termasuk Uji Kuat Tekan Beton');
  ok(/Addendum I No\. dan Tanggal/.test(b2.xBap) && b2.xBap.includes(D.ADD + '   Tanggal : 27 Agustus 2026') && /Nilai Addendum I/.test(b2.xBap) && b2.tampil.indexOf(21) >= 0 && b2.tampil.indexOf(25) >= 0, 'BAP 2 · kepala: nomor & tanggal addendum + baris Nilai Addendum I ditampilkan');
  ok(/<c r="K24"[^>]*><v>81700000<\/v>/.test(b2.xBap) && b2.xBap.includes('s/d. 27 Agustus 2026') && b2.xBap.includes('s/d. 30 November 2026') && b2.bap.N23 === '30 November 2026', 'BAP 2 · Nilai Kontrak awal Rp 81.700.000 (s/d 27 Agu) → Nilai Addendum (s/d 30 Nov 2026)');
  dekat(b2.bap.K25, 136800000, 'BAP 2 · Nilai Addendum I'); dekat(b2.bap.M30, 136800000, 'BAP 2 · dasar prestasi = nilai addendum');
  ok(Math.abs(b2.bap.J31 - 16340000 / 136800000) < 1e-9 && Math.abs(b2.bap.J30 - 1) < 1e-9, 'BAP 2 · prestasi yang lalu 11,94% (BAP 1 terbawa) · s/d saat ini 100,00%');
  dekat(b2.bap.P31, 16340000, 'BAP 2 · prestasi yang lalu'); dekat(b2.bap.P32, 120460000, 'BAP 2 · prestasi saat ini'); dekat(b2.bap.P35, 6840000, 'BAP 2 · retensi s/d saat ini'); dekat(b2.bap.P36, 817000, 'BAP 2 · retensi yang lalu'); dekat(b2.bap.P37, 6023000, 'BAP 2 · retensi saat ini');
  dekat(b2.bap.Q48, 114437000, 'BAP 2 · setelah retensi'); dekat(b2.bap.Q49, 12588070, 'BAP 2 · PPN'); dekat(b2.bap.Q50, 127025070, 'BAP 2 · total pembayaran');
  dekat(b2.lamp.K41, 136800000, 'Lampiran addendum · jumlah (exclude PPN)'); dekat(b2.lamp.K42, 15048000, 'Lampiran addendum · PPN'); dekat(b2.lamp.K43, 151848000, 'Lampiran addendum · total (include PPN)');
  ok(b2.xLamp.includes('LAMPIRAN SPPP NO. ' + D.ADD) && b2.xBapr.includes('Addendum I') && b2.xBapr.includes(D.ADD + '   Tanggal : 27 Agustus 2026'), 'Lampiran & BAPR merujuk nomor addendum');
  ok(/lampiran Addendum I Nomor/.test(b2.bapp.C21) && b2.xBapp.includes('semula Rp 81.700.000') && b2.xBapp.includes('semula s.d. 27 Agustus 2026') && Math.abs(b2.bapp.Q61 - 120460000) < 0.6, 'BAPP 2 · narasi, nilai & waktu semula tercantum; jumlah periode ini Rp 120.460.000');
  ok(dok.asli === 12 + 5, 'grup kontrak di aplikasi tidak diubah oleh pembentukan dokumen (rincian berlaku tetap rincian addendum)');
  if (out) { fs.writeFileSync(path.join(out, 'BAP-1-kontrak-awal.xlsx'), Buffer.from(b1.xlsx, 'base64')); fs.writeFileSync(path.join(out, 'BAP-2-addendum-1.xlsx'), Buffer.from(b2.xlsx, 'base64')); }
  // penentuan tahap: cadangan urutan pencatatan & pengaman volume
  const th = await pg.evaluate(() => { const g = window.RINGKASAN[0], f = window.mp21016TahapBK, e1 = PROG.data[0], e2 = PROG.data[1], r = REG.data.find(x => /ADD1/.test(x.noKontrak)), tgl = r.tglKontrak; const o = {};
    o.baru = f(g, null); r.tglKontrak = '2026-08-07';   // tanggal addendum = tanggal kontrak (tidak bermakna) → pakai urutan pencatatan
    o.catat1 = f(g, e1); o.catat2 = f(g, e2); o.aman = f(g, Object.assign({}, e1, { items: Object.assign({}, e1.items, { [g.addendum.no + '#14']: 1 }) })); r.tglKontrak = tgl; return o; });
  ok(th.baru === 1 && th.catat1 === 0 && th.catat2 === 1, 'tahap BK: BK baru → addendum; bila tanggal addendum tidak bermakna, urutan pencatatan dipakai (BK1 → awal, BK2 → addendum)');
  ok(th.aman === 1, 'pengaman: BK yang memuat item baru addendum tidak pernah dicetak atas kontrak awal');

  console.log('C. Perbandingan kontrak awal ↔ addendum');
  const S = await pg.evaluate(no => { const d = window.mp21016Susun(no); return { t: d.total, ppnAwal: d.ppnAwal, ppnAdd: d.ppnAdd, w: d.waktu, tarif: d.tarif, per: d.peringatan, st: d.baris.filter(r => !r.judul).map(r => [r.ur, r.status, r.volAwal, r.volAdd, r.dJml]) }; }, D.NO);
  dekat(S.t.awal, 81700000, 'jumlah kontrak awal (exclude PPN)'); dekat(S.t.add, 136800000, 'jumlah addendum (exclude PPN)'); dekat(S.t.selisih, 55100000, 'tambah / kurang neto');
  dekat(S.t.tambah, 56050000, 'pekerjaan tambah'); dekat(S.t.kurang, -950000, 'pekerjaan kurang');
  ok(Math.abs(S.t.persen - 55100000 / 81700000) < 1e-9 && S.tarif === 11, 'perubahan nilai +67,44% · tarif PPN bawaan 11%');
  dekat(S.t.awal + S.ppnAwal, 90687000, 'total kontrak awal (include PPN)'); dekat(S.t.add + S.ppnAdd, 151848000, 'total addendum (include PPN)');
  const st = n => S.st.find(r => r[0].indexOf(n) === 0);
  ok(st('Uji Kuat Tekan')[1] === 'BARU' && st('Uji Kuat Tekan')[3] === 5 && st('Uji Kuat Tekan')[4] === 1750000, 'item baru terdeteksi: Uji Kuat Tekan Beton 5 sampel × Rp 350.000 = Rp 1.750.000');
  ok(st('Mob-Demob Mesin')[1] === 'VOLUME' && st('Mob-Demob Mesin')[2] === 2 && st('Mob-Demob Mesin')[3] === 4 && st('Mob-Demob Tim')[3] === 4, 'mobilisasi: volume 2 → 4 (mesin+alat & tim)');
  ok(st('Coring (Drilling')[2] === 192 && st('Coring (Drilling')[3] === 328.5 && st('Coring (Drilling')[4] === 40950000 && st('Corebox')[3] === 82, 'coring 192 → 328,5 m (+Rp 40.950.000) · corebox 24 → 82');
  ok(st('Coring Beton')[1] === 'VOLUME' && st('Coring Beton')[3] === 5 && st('Coring Beton')[4] === -950000, 'pekerjaan kurang terdeteksi: Coring Beton 6 → 5 (−Rp 950.000)');
  ok(S.t.n.baru === 1 && S.t.n.volume === 5 && S.t.n.tetap === 6 && S.t.n.hapus === 0 && S.t.n.item === 12, '12 item: 1 baru · 5 volume berubah · 6 tetap · 0 dihapus');
  ok(S.w.selesaiAwal === '2026-08-27' && S.w.selesaiAdd === '2026-11-30' && S.w.tambahHari === 95, 'masa pelaksanaan: s.d. 27 Agu → 30 Nov 2026 (+95 hari kalender)');
  ok(S.per.length === 0, 'tanpa peringatan: nilai Register = Σ volume × harga, tidak ada volume di bawah realisasi');
  await pg.evaluate(() => window.renderRegister()); await tunggu(900);
  ok(await pg.locator('#regBody .mp21016-btn').count() === 1 && await pg.locator('#regBody tr', { hasText: '024/SPK' }).locator('.mp21016-btn').count() === 0, 'Register Kontrak: tombol "Bandingkan awal ↔ addendum" hanya pada kartu kontrak ber-addendum');
  await pg.click('#regBody .mp21016-btn'); await tunggu(400);
  const tm = await pg.evaluate(() => document.querySelector('#mp21016Modal').textContent.replace(/\s+/g, ' '));
  ok(/Item baru/.test(tm) && /136\.800\.000/.test(tm) && /151\.848\.000/.test(tm) && /\+67,44%/.test(tm) && /\+95 hari/.test(tm) && !(await pg.evaluate(() => window.__klik.length)), 'dialog perbandingan: status per item, total exclude / include PPN, % perubahan & tambahan waktu; klik tidak membuka form kontrak');
  await tangkap('banding-addendum.png', '#mp21016Modal .mp273-kotak');
  await pg.check('#mp21016Rk'); await tunggu(200);
  ok(await pg.locator('#mp21016Modal tbody tr:not(.jdl)').count() === 6, '"Hanya yang berubah" → 6 baris (5 volume berubah + 1 item baru)');
  await pg.fill('#mp21016Ppn', '12'); await pg.dispatchEvent('#mp21016Ppn', 'change'); await tunggu(200);
  ok(/153\.216\.000/.test(await pg.evaluate(() => document.querySelector('#mp21016Modal').textContent)), 'tarif PPN dapat diubah (12% → total Rp 153.216.000) dan diingat di perangkat');
  await pg.fill('#mp21016Ppn', '11'); await pg.dispatchEvent('#mp21016Ppn', 'change');
  const ctk = await pg.evaluate(no => window.mp21016HtmlCetak(window.mp21016Susun(no), 'Kane Perkasa Indonesia, PT'), D.NO);
  ok(/Perbandingan Kuantitas dan Harga/.test(ctk) && ctk.includes(D.NO) && ctk.includes(D.ADD) && /TOTAL \(Include PPN\)/.test(ctk) && /PIHAK KEDUA/.test(ctk), 'lampiran cetak memuat nomor kontrak & addendum, total include PPN dan kolom tanda tangan');
  await pg.click('#mp21016Modal [data-tutup]');
  // dialog Kontrak multi-item: draf Addendum II — panel langsung, addendum kurang di bawah volume tertagih & uraian beda penulisan
  ok(js.includes('window.mp2622Keadaan = () => KD;') && await pg.evaluate(() => typeof window.mp2622Keadaan === 'function' && !!window.mp2622Keadaan()), 'blok MP2622 asli membuka keadaan dialog untuk panel perbandingan');
  await pg.evaluate(({ ADD1, NO2 }) => {
    const items = ADD1.filter(i => i.volume || i.hargaSatuan || i.itemPekerjaan).map(i => ({ kode: '', uraian: i.itemPekerjaan, vol: i.volume || '', sat: i.satuan || '', harga: i.hargaSatuan || '' }));
    items.find(i => /^Coring \(Drilling/.test(i.uraian)).vol = 300; items.find(i => /^Transportasi/.test(i.uraian)).uraian = 'Transportasi  lokal'; items.find(i => /^Mess/.test(i.uraian)).uraian = 'Mess(Kontrakan)';
    items.find(i => /^Factual/.test(i.uraian)).harga = 6000000; items.push({ kode: '', uraian: 'Sondir ringan', vol: 2, sat: 'titik', harga: 1500000 });
    const KD = { mode: 'baru', h: { add: '2', tgl: '2026-12-01', selesai: '2026-12-31', vendor: 'Kane Perkasa Indonesia, PT' }, items }; window.mp2622Keadaan = () => KD; window.__KD = KD;
    const w = document.createElement('div'); w.id = 'mp2622Kd'; w.className = 'mp2622-lapis'; w.innerHTML = '<div class="mp2622-dlg" role="dialog"><header><b>Input kontrak multi-item</b></header><div style="padding:12px 16px"><label>No kontrak <input id="m22No" class="form-control font-monospace" style="width:420px" readonly value="' + NO2 + '"></label></div><footer><button class="btn btn-primary">Simpan draf</button></footer></div>';
    document.body.appendChild(w);
  }, { ADD1: D.ADD1, NO2: '015/ADD2/SPPP' + T }); await tunggu(900);
  const pn = await pg.evaluate(() => { const p = document.getElementById('mp21016Pan'); return p ? { teks: p.textContent.replace(/\s+/g, ' '), sebelumFooter: !!(p.nextElementSibling && p.nextElementSibling.tagName === 'FOOTER'), baris: p.querySelectorAll('tbody tr:not(.jdl)').length } : null; });
  ok(pn && pn.sebelumFooter && /Perbandingan Addendum I ↔ Addendum II/.test(pn.teks), 'saat Add. ke-2 diisi: panel perbandingan Addendum I ↔ Addendum II tampil di dialog (di atas tombol simpan)');
  if (process.env.LACAK) console.log(pn.teks);
  ok(/volume addendum 300,00 di bawah volume yang sudah ditagihkan 328,50/.test(pn.teks) && /item dihapus padahal sudah ditagihkan 1,00/.test(pn.teks) && /2 item: volume addendum lebih kecil dari volume yang sudah ditagihkan/.test(pn.teks), 'addendum kurang di bawah volume tertagih diperingatkan (Coring 300 < 328,5; item dihapus yang sudah ditagih)');
  ok(/mulai 07 Agustus 2026/.test(pn.teks) && /\+31 hari/.test(pn.teks), 'masa pelaksanaan dihitung dari tanggal kontrak awal; s.d. 30 Nov → 31 Des 2026 (+31 hari)');
  ok(/Sondir ringan/.test(pn.teks) && /Item baru/.test(pn.teks) && /harga satuan Rp 5\.000\.000 → Rp 6\.000\.000/.test(pn.teks), 'item baru & perubahan harga satuan terdeteksi');
  ok(/uraian mirip item rincian sebelumnya "Mess \(Kontrakan\)"/.test(pn.teks) && !/Transportasi/.test(pn.teks), 'uraian beda penulisan ("Mess(Kontrakan)") ditandai sebagai item baru + petunjuk; beda kapital / spasi ganda tetap dianggap item yang sama');
  await tangkap('banding-addendum-dialog.png', '#mp2622Kd .mp2622-dlg');
  await pg.evaluate(() => { window.__KD.items.find(i => /^Coring \(Drilling/.test(i.uraian)).vol = 400; document.getElementById('m22No').dispatchEvent(new Event('input', { bubbles: true })); }); await tunggu(900);
  ok(!/di bawah volume yang sudah ditagihkan/.test(await pg.evaluate(() => document.getElementById('mp21016Pan').textContent)), 'panel mengikuti isian secara langsung (volume dinaikkan → peringatan hilang)');
  await pg.evaluate(() => { window.__KD.h.add = ''; document.getElementById('m22No').value = '016/SPPP/x'; document.getElementById('m22No').dispatchEvent(new Event('input', { bubbles: true })); }); await tunggu(900);
  ok(await pg.locator('#mp21016Pan').count() === 0, 'kontrak baru (Add. kosong) → panel tidak tampil');
  ok(galat.length === 0, 'tanpa galat halaman' + (galat.length ? ': ' + galat.join(' | ') : ''));
  await br.close();
  console.log('\nUJI UI 2.10.16: ' + lulus + ' cek LULUS');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
