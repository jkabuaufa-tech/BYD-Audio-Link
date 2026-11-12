// Uji 2.10.16 — NOMOR BA MENGIKUTI ADDENDUM untuk semua jenis BA (BAPM, BAPA, BAPSA, BAPP → BAP) pada Master SPM, kontrak awal + Add.1 + Add.2.   node uji/ui21016_nomor.js
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..'), { blok, daftar } = require('./blok_paket.js');
const T = '/WK-NK.KSO/PDBJ/1726012/2026', NO = '031/SPM' + T, A1 = '031/ADD1/SPM' + T, A2 = '031/ADD2/SPM' + T;
const it = (u, v, h) => ({ itemPekerjaan: u, volume: v, satuan: 'm3', hargaSatuan: h });
const G = [{ key: NO, namaVendor: 'Adhimix', nilai: 100e6, realisasi: 0, tglMulai: '2026-03-01', tglSelesai: '2026-06-30', items: [it('Beton K-350', 100, 1e6)] },
  { key: A1, namaVendor: 'Adhimix', nilai: 150e6, tglMulai: '2026-06-15', tglSelesai: '2026-09-30', items: [it('Beton K-350', 150, 1e6)] },
  { key: A2, namaVendor: 'Adhimix', nilai: 200e6, tglMulai: '2026-09-15', tglSelesai: '2026-12-31', items: [it('Beton K-350', 180, 1e6), it('Beton K-400', 20, 1e6)] }];
const REG = G.map((g, i) => ({ id: 'R' + i, noKontrak: g.key, namaVendor: 'Adhimix', nilai: g.nilai, diposting: true, tglKontrak: g.tglMulai, tglSelesai: g.tglSelesai, dibuatPada: g.tglMulai + 'T01:00:00Z', items: [] }));
const bk = (KODE, n, tgl, v) => ({ id: 'BK' + n, noKontrak: NO, tagihanKe: n, periodeKey: Number(tgl.slice(0, 7).replace('-', '')), tanggal: tgl, tanggalBA: tgl, nomorBA: String(n).padStart(2, '0') + '/' + KODE + '/' + NO, items: { [NO + '#0']: v }, nilai: v * 1e6, dibuatPada: tgl + 'T03:00:00Z' });
const prog = K => [bk(K, 1, '2026-05-10', 40), bk(K, 2, '2026-07-10', 60), bk(K, 3, '2026-10-10', 50)];
(async () => {
  const js = JSON.parse(fs.readFileSync(R + '/pembaruan-2.10.16.json', 'utf8')).js, b = await chromium.launch(); let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
  for (const KODE of ['BAPM', 'BAPA', 'BAPSA']) {
    const PROG = prog(KODE), pg = await b.newPage(), galat = []; pg.on('pageerror', e => galat.push(e.message));
    await pg.setContent('<html><body></body></html>');
    await pg.evaluate(({ REG, PROG }) => { window.REG = { sesi: { nama: 'J', admin: true }, data: REG, url: '' }; window.PROG = { data: PROG }; window.RINGKASAN = []; window.PROYEK = { id: '1' }; window.notif = () => { }; window.idItem = (g, it, i) => it.kodeUnik || ((g.keyAsli || g.key) + '#' + i); }, { REG, PROG });
    for (const n of ['KEPALA', 'MP292', 'MP293', 'XLH', 'XLR', 'MP296', 'MP298', 'MP21016', 'MP21013']) await pg.addScriptTag({ content: n === 'KEPALA' ? js.slice(0, daftar(js)[1].awal) : blok(js, n) });
    await pg.waitForTimeout(1700);
    const o = await pg.evaluate(async G => { G[0].entriProgres = PROG.data; window.RINGKASAN = window.mp21013Lebur(G); const g = window.RINGKASAN[0], o = {};
      for (const e of PROG.data) { const ini = {}, lalu = {}; g.items.forEach((x, i) => { const k = x.kodeUnik || (g.key + '#' + i); ini[k] = 0; lalu[k] = 0; });
        PROG.data.forEach(x => Object.keys(x.items).forEach(q => { if (x.id === e.id) ini[q] = x.items[q]; else if (x.tagihanKe < e.tagihanKe) lalu[q] = (lalu[q] || 0) + x.items[q]; }));
        const K = { g, ke: e.tagihanKe, nomor: e.nomorBA, tanggal: e.tanggalBA, progresId: e.id, ini, lalu, vendor: { nama: 'Adhimix', direktur: 'X', jabatan: 'Direktur', alamat: '-', npwp: '' }, uangMuka: 0, retensi: 0 };
        const B = await window.mp293Bangun(K), IN = B.I.tulisan.INPUT; o[e.id] = { tahap: K.mp21016.tahap, nomor: K.nomor, C: [55, 56, 57].map(r => IN['C' + r]), D: [55, 56, 57].map(r => IN['D' + r]), simpan: e.nomorBA }; }
      return o; }, JSON.parse(JSON.stringify(G)));
    console.log(KODE + ' (Master SPM, kontrak awal + Add.1 + Add.2)');
    ok(o.BK1.tahap === 0 && o.BK1.nomor === '01/' + KODE + '/' + NO, 'BA ke-1 (sebelum addendum): 01/' + KODE + '/031/SPM/… tetap atas kontrak awal');
    ok(o.BK2.tahap === 1 && o.BK2.nomor === '02/' + KODE + '/' + A1, 'BA ke-2 (sesudah Add.1): 02/' + KODE + '/031/ADD1/SPM/…');
    ok(o.BK3.tahap === 2 && o.BK3.nomor === '03/' + KODE + '/' + A2, 'BA ke-3 (sesudah Add.2): 03/' + KODE + '/031/ADD2/SPM/…');
    ok(o.BK3.C.join('|') === ['01/' + KODE + '/' + NO, '02/' + KODE + '/' + A1, '03/' + KODE + '/' + A2].join('|'), 'daftar nomor ' + KODE + ' per termin: tiap termin memakai nomor tahapnya sendiri (awal · Add.1 · Add.2)');
    ok(o.BK3.D.join('|') === ['01/BAP/' + NO, '02/BAP/' + A1, '03/BAP/' + A2].join('|'), 'nomor BAP pasangannya ikut: 01/BAP/031/SPM · 02/BAP/031/ADD1 · 03/BAP/031/ADD2');
    ok(o.BK2.simpan === '02/' + KODE + '/' + NO && galat.length === 0, 'nomor tersimpan di BK tidak diubah; tanpa galat halaman');
    await pg.close();
  }
  await b.close(); console.log('\nUJI NOMOR BA 2.10.16: ' + lulus + ' cek LULUS');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
