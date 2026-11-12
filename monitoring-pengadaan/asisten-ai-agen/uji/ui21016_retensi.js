// Uji 2.10.16 — POTONGAN RETENSI & RUMUS "YANG LALU / SAAT INI" antar-BAP (Excel format baku, blok MP293 asli + MP21016).   node uji/ui21016_retensi.js
// Aturan: retensi yang lalu = Σ potongan BAP-BAP terdahulu; saat ini = % × prestasi BAP ini; s/d saat ini = yang lalu + saat ini — untuk 2 BAP,
// 3 BAP, nilai berpecahan (pembulatan) dan addendum. Skenario "harga": addendum mengubah harga item yang sudah ditagih → wajib diperingatkan.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
const { blok, daftar } = require('./blok_paket.js'), D = require('./data_kane.js');
const klon = x => JSON.parse(JSON.stringify(x));
// S2: tiga BAP — BK2 dipecah dua (BK2 = 40% sisa, BK3 = 60% sisa)
function tiga() { const P = klon(D.PROG), a = {}, b = {}; Object.keys(P[1].items).forEach(k => { const v = P[1].items[k], x = Math.round(v * 0.4 * 1000) / 1000; a[k] = x; b[k] = Math.round((v - x) * 1000) / 1000; });
  P[1].nilai = 48184000;   // nilai BK mengikuti volume pecahannya (BK3 = 72.276.000)
  P[1].items = a; P[1].tanggal = P[1].tanggalBA = '2026-10-10'; P[1].periodeKey = 202610; P[1].dibuatPada = '2026-11-10T05:00:00.000Z';
  P.push(Object.assign(klon(P[1]), { id: 'BK3', tagihanKe: 3, items: b, tanggal: '2026-11-11', tanggalBA: '2026-11-11', periodeKey: 202611, nomorBA: '03/BAPP/' + D.NO, nilai: 72276000, dibuatPada: '2026-11-11T05:00:00.000Z' })); return { G: D.grup(), REG: klon(D.REG), PROG: P }; }
// S3: harga satuan Coring naik di addendum (300.000 → 320.000) padahal sudah ditagih 38,4 m di BAP 1
function harga() { const G = D.grup(), REG = klon(D.REG); G[1].items[11].hargaSatuan = 320000; G[1].nilai = 136800000 + 328.5 * 20000; REG[1].items[11].harga = 320000; REG[1].nilai = G[1].nilai; return { G, REG, PROG: klon(D.PROG) }; }
// S4: angka pecahan → uji pembulatan
function pecah() { const G = D.grup(), REG = klon(D.REG), P = klon(D.PROG); [G[0], G[1]].forEach(g => { g.items[12].hargaSatuan = 125333; }); REG.forEach(r => { r.items[12].harga = 125333; });
  P[0].items[D.NO + '#12'] = 4.777; P[1].items[D.NO + '#12'] = 77.223; P[0].items[D.NO + '#11'] = 38.433; P[1].items[D.NO + '#11'] = 290.067; P[0].nilai = 16348615.741; P[1].nilai = 120478690.259; return { G, REG, PROG: P }; }
const S = { kane: { G: D.grup(), REG: klon(D.REG), PROG: klon(D.PROG) }, tiga: tiga(), harga: harga(), pecah: pecah() };
(async () => {
  const js = JSON.parse(fs.readFileSync(R + '/pembaruan-2.10.16.json', 'utf8')).js, b = await chromium.launch(), out = {};
  for (const nm of Object.keys(S)) {
    const pg = await b.newPage(); pg.on('pageerror', e => console.log('GALAT', nm, e.message));
    await pg.setContent('<!doctype html><html><body></body></html>');
    await pg.evaluate(({ REG, PROG }) => { window.REG = { sesi: { nama: 'J', admin: true, peran: 'PENGADAAN' }, data: REG, url: '' }; window.PROG = { data: PROG }; window.RINGKASAN = []; window.PROYEK = { id: '1' }; window.__n = []; window.notif = (m, t) => window.__n.push(String(m)); window.idItem = (g, it, i) => it.kodeUnik || ((g.keyAsli || g.key) + '#' + i); }, S[nm]);
    for (const n of ['KEPALA', 'MP292', 'MP293', 'XLH', 'XLR', 'MP296', 'MP298', 'MP21016', 'MP21013']) await pg.addScriptTag({ content: n === 'KEPALA' ? js.slice(0, daftar(js)[1].awal) : blok(js, n) });
    await pg.waitForTimeout(1700);
    out[nm] = await pg.evaluate(async G => {
      G[0].entriProgres = PROG.data; window.RINGKASAN = window.mp21013Lebur(G); const g = window.RINGKASAN[0], al = g._idAlias || {}, o = {};
      const harga = it => Number(it.hargaSatuanEfektif != null ? it.hargaSatuanEfektif : it.hargaSatuan) || 0;
      for (const e of PROG.data) {
        const ini = {}, lalu = {}; g.items.forEach((it, i) => { const k = it.kodeUnik || (g.key + '#' + i); ini[k] = 0; lalu[k] = 0; });
        PROG.data.forEach(x => Object.keys(x.items).forEach(q => { const k = al[q] || q; if (x.id === e.id) ini[k] = (ini[k] || 0) + x.items[q]; else if (x.tagihanKe < e.tagihanKe) lalu[k] = (lalu[k] || 0) + x.items[q]; }));
        const K = { g, ke: e.tagihanKe, nomor: e.nomorBA, tanggal: e.tanggalBA, tanggalBAP: '', progresId: e.id, ini, lalu, vendor: { nama: g.namaVendor, direktur: 'W', jabatan: 'Direktur', alamat: '-', npwp: '' }, uangMuka: 0, retensi: 5 };
        const B = await window.mp293Bangun(K), H = B.hasil, v = (sh, r) => { const m = H.get(sh); return m ? m.get(r) : undefined; }, dec = new TextDecoder(), xml = n2 => dec.decode(B.F.get(B.W.byNama[n2.toUpperCase()].path));
        const rumus = (sh, refs) => { const x = xml(sh), z = {}; refs.forEach(r => { const m = new RegExp('<c r="' + r + '"[^>]*>(?:<f[^>]*>([^<]*)</f>)?(?:<v>([^<]*)</v>)?').exec(x); z[r] = m ? (m[1] !== undefined ? '=' + m[1] : m[2]) : null; }); return z; };
        const bapr = {}; const hb = H.get('BAPR '); if (hb) hb.forEach((val, k) => { const r = Number(k.replace(/\D/g, '')); if (r >= 31 && r <= 48 && val !== '' && val !== 0 && val != null) bapr[k] = val; });
        // nilai BK sebenarnya atas rincian tahap dokumen (Σ volume periode ini × harga)
        const gv = K.g, nyata = gv.items.reduce((s, it, i) => s + (K.ini[it.kodeUnik || ((gv.keyAsli || gv.key) + '#' + i)] || 0) * harga(it), 0);
        o[e.id] = { tahap: K.mp21016.tahap, mode: B.I.modeRumus, nilaiBK: e.nilai, iniNyata: Math.round(nyata * 100) / 100,
          bap: Object.fromEntries(['J30', 'M30', 'P30', 'J31', 'P31', 'J32', 'P32', 'Q33', 'J35', 'M35', 'P35', 'J36', 'M36', 'P36', 'J37', 'M37', 'P37', 'Q38', 'P40', 'P41', 'P42', 'Q43', 'Q47', 'Q48', 'Q49', 'Q50'].map(r => [r, v('BAP  1', r)])),
          fBap: e.id === 'BK2' ? rumus('BAP  1', ['J30', 'J31', 'J32', 'M30', 'P30', 'P31', 'P32', 'M35', 'P35', 'M36', 'P36', 'M37', 'P37', 'Q38', 'M40', 'M41', 'M42', 'Q47', 'Q48', 'Q49', 'Q50']) : undefined,
          bapp: Object.fromEntries(['Q61', 'K64', 'N64', 'K65', 'N65', 'K66', 'N66', 'K68', 'N68', 'K69', 'N69', 'N70'].map(r => [r, v('BAPP', r)])),
          fBapp: e.id === 'BK2' ? rumus('BAPP', ['K64', 'N64', 'K65', 'N65', 'K66', 'N66', 'N68', 'N69', 'N70']) : undefined, bapr,
          fBapr: e.id === 'BK2' ? rumus('BAPR ', ['G32', 'H32', 'J32', 'L32', 'N32', 'O32', 'J33', 'L33', 'N33', 'O33', 'O38', 'G26', 'L27']) : undefined };
      }
      o.__notif = window.__n; o.__banding = window.mp21016Susun(PROG.data[0].noKontrak).peringatan;
      return o;
    }, S[nm].G);
    await pg.close();
  }
  await b.close();
  let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); }, sama = (a, c) => Math.abs(a - c) < 0.5;
  const NM = { kane: 'Kane: BAP 1 + BAP Add.1', tiga: 'tiga BAP (20% · 40% sisa · 60% sisa)', pecah: 'nilai berpecahan (uji pembulatan)', harga: 'harga satuan naik di addendum' };
  for (const nm of ['kane', 'tiga', 'pecah', 'harga']) {
    console.log(NM[nm]); const X = out[nm], ids = Object.keys(X).filter(k => k[0] !== '_'); let kumRet = 0, kumPrestasi = 0;
    ids.forEach((id, n) => { const a = X[id].bap, p = X[id].bapp, r = X[id].bapr;
      ok(sama(a.P35, a.P36 + a.P37) && sama(a.P37, Math.round(a.J37 * a.M37)) && sama(a.Q38, a.P37), id + ' · retensi s/d saat ini = yang lalu + saat ini (' + Math.round(a.P36).toLocaleString('id-ID') + ' + ' + Math.round(a.P37).toLocaleString('id-ID') + ' = ' + Math.round(a.P35).toLocaleString('id-ID') + ')');
      if (nm !== 'harga') { ok(sama(a.P36, kumRet), id + ' · retensi yang lalu = Σ retensi yang dipotong pada ' + n + ' BAP terdahulu (' + Math.round(kumRet).toLocaleString('id-ID') + ')');
        ok(Math.abs(a.P31 - kumPrestasi) < 0.01 && Math.abs(a.P32 - X[id].iniNyata) < 0.01 && Math.abs(a.P30 - a.P31 - a.P32) < 0.01, id + ' · prestasi yang lalu = Σ prestasi BAP terdahulu; saat ini = Σ volume periode ini × harga; s/d = lalu + ini'); }
      ok(sama(p.N69, a.P37) && sama(a.Q48, Math.round(a.Q33 - a.Q38)) && sama(a.Q50, a.Q48 + a.Q49), id + ' · BAPP retensi = BAP retensi saat ini; jumlah dibayar = prestasi saat ini − retensi (+ PPN)');
      ok(sama(r.O38, a.P35) && sama(r['O' + (32 + n)], a.P37), id + ' · BAPR: retensi BAP ke-' + (n + 1) + ' = potongan di BAP itu; JUMLAH RETENSI = retensi s/d saat ini');
      kumRet += a.Q38; kumPrestasi += a.P32; });
    if (nm === 'pecah') ok(Number.isInteger(X.BK2.bap.P36) && X.BK2.bap.P36 === X.BK1.bap.Q38 && X.BK2.bap.P35 === X.BK1.bap.Q38 + X.BK2.bap.Q38, 'pembulatan: "yang lalu" di BAP 2 persis sama dengan potongan BAP 1 (tanpa selisih Rp 1)');
    if (nm === 'harga') { ok(X.__notif.some(t => /PERIKSA: prestasi yang lalu di dokumen Rp 17\.108\.000 ≠ nilai BAP yang sudah terbit Rp 16\.340\.000 \(selisih Rp 768\.000\)/.test(t)), 'dokumen BAP addendum memberi peringatan: prestasi yang lalu ≠ nilai BAP terbit (selisih Rp 768.000)');
      ok(X.__banding.some(t => /Harga satuan berubah pada item yang sudah ditagihkan: selisih Rp 768\.000/.test(t)), 'perbandingan addendum memperingatkan harga berubah atas volume tertagih (38,4 m × Rp 20.000)'); }
    else ok(X.__notif.length === 0 && !X.__banding.some(t => /Harga satuan berubah/.test(t)), 'tanpa peringatan harga (harga satuan tidak berubah)');
  }
  console.log('\nUJI RETENSI 2.10.16: ' + lulus + ' cek LULUS');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
