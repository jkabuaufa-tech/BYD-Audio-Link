/* MP2611 — PEMBARUAN 2.6.11: NO PR / RFQ / PO SAP DARI KONTRAK DI SEMUA MENU (aditif; tanpa perubahan server & data)
 *  Gejala: 055/SPM Cahaya Utama — PO 4100076091 sudah diisi di Register Kontrak, tetapi Monitoring BK Bulanan (dan Keuangan & Bayar,
 *  Laporan BK, ekspor/cetak BK yang memakai rumus yang sama) tidak menampilkannya. Sebab: barisBK() mendahulukan PO yang tersimpan
 *  di catatan BK saat tagihan dibuat (kosong / "IDC" bila PO belum terbit) dan PO Master Excel ("IDC"), baru kemudian PO Register.
 *  Kini satu aturan untuk semua menu: nomor SAP kontrak = Register → Perbaiki data kontrak (koreksi) → Master → item, dan hanya
 *  NOMOR SAP (angka, ≥ 6 digit, bukan PO/RFQ yang dibatalkan) yang menang; penanda seperti "IDC" dipakai hanya bila tidak ada nomor SAP.
 *  Nomor PO kontrak menggantikan PO catatan BK bila keduanya berbeda (koreksi PO di Register berlaku ke BK lama); Periksa kontrak
 *  mencantumkan BK yang menyimpan PO berbeda dan kontrak ber-BK yang PO SAP-nya belum diisi. Form "Lengkapi dokumen SAP" BK terisi
 *  PO kontrak bila PO BK masih kosong / bukan nomor SAP. Catatan BK di server tidak diubah. */
(function () {
  'use strict';
  if (window.__MP2611__) return;
  if (typeof window.barisBK !== 'function') return;
  window.__MP2611__ = true;
  const t = v => String(v == null ? '' : v).trim();
  const batalPO = () => (typeof PO_DIBATALKAN !== 'undefined' ? PO_DIBATALKAN : []), batalRFQ = () => (typeof RFQ_DIBATALKAN !== 'undefined' ? RFQ_DIBATALKAN : []);
  const sap = (v, batal) => /^\d{6,}$/.test(t(v)) && batal.indexOf(t(v)) < 0;   // nomor dokumen SAP asli
  // urutan sumber: Register (isian staf) → ringkasan kontrak (sudah memuat koreksi "Perbaiki data kontrak") → item kontrak
  function nomorKontrak(noKontrak, g, jenis) {
    const reg = ((typeof REG !== 'undefined' && REG.data) || []).find(r => r.noKontrak === noKontrak) || null;
    const batal = jenis === 'noRFQ' ? batalRFQ() : jenis === 'noPO' ? batalPO() : [];
    const items = (g && g.items) || [], dariItem = it => jenis === 'noPO' ? [it.noPOEfektif, it.noPO] : [it[jenis]];
    const daftar = [reg && reg[jenis], g && g.koreksi && g.koreksi[jenis], g && g[jenis]].concat(...items.map(dariItem)).map(t).filter(Boolean);
    return { sap: daftar.find(v => sap(v, batal)) || '', apa: daftar.find(v => batal.indexOf(v) < 0) || '' };
  }
  window.mp2611NomorKontrak = nomorKontrak;
  window.mp2611NomorSAP = sap;
  const LANGKAH = { tagihan: 'tagihan', faktur: 'faktur pajak', pr: 'PR', rfq: 'RFQ', po: 'PO', gr: 'GR', ses: 'SES', miro: 'MIRO' };
  const asli = window.barisBK;
  window.barisBK = function (e) {
    const b = asli.apply(this, arguments);
    try {
      if (!b || !b.nilai || !e) return b;
      let ubah = false;
      [['po', 'noPO', batalPO()], ['pr', 'noPR', []], ['rfq', 'noRFQ', batalRFQ()]].forEach(([k, f, batal]) => {
        const kn = nomorKontrak(e.noKontrak, b.g, f), kini = t(b.nilai[k]);
        // nomor SAP kontrak menang; PO catatan BK dipakai hanya bila kontrak belum punya nomor SAP
        const pakai = kn.sap || (k === 'po' && sap(e.noPO, batal) ? t(e.noPO) : '') || kini;
        if (pakai !== kini) { b.nilai[k] = pakai; ubah = true; }
      });
      if (ubah && Array.isArray(b.wajib)) {
        const selesai = b.wajib.filter(k => b.nilai[k]).length, berikut = b.wajib.find(k => !b.nilai[k]);
        b.progres = b.wajib.length ? selesai / b.wajib.length : 0;
        b.ket = b.nilai.miro ? b.nilai.miro : (berikut ? 'Menunggu ' + (LANGKAH[berikut] || berikut) : '');
      }
    } catch (err) { console.warn('[2.6.11] nomor SAP kontrak', err); }
    return b;
  };
  // form "Lengkapi dokumen SAP" satu BK: PO kosong / bukan nomor SAP → isi PO kontrak (tersimpan bila staf menekan Simpan)
  const _dok = window.bukaDokSAP;
  if (typeof _dok === 'function') window.bukaDokSAP = function (id) {
    const r = _dok.apply(this, arguments);
    try {
      const e = ((typeof PROG !== 'undefined' && PROG.data) || []).find(x => x.id === id), el = document.getElementById('dok_noPO');
      if (e && el && !sap(el.value, batalPO())) {
        const g = typeof kontrakBK === 'function' ? kontrakBK(e) : null, kn = nomorKontrak(e.noKontrak, g, 'noPO');
        if (kn.sap) { el.value = kn.sap; el.title = 'Diisi dari PO kontrak (Register / Perbaiki data kontrak)'; el.classList.add('mp2611-isi'); }
      }
    } catch (err) { }
    return r;
  };
  // Periksa kontrak (2.6.10): PO catatan BK berbeda dari PO kontrak · kontrak ber-BK tanpa PO SAP
  (window.MP2610_CEK = window.MP2610_CEK || []).push(function (T, K, L) {
    const kontrak = new Map(); K.forEach(x => (x.nomor || [x.key]).concat(x.g ? [x.g.key, x.g.keyAsli].concat(x.g.terkait || []) : []).forEach(n => { if (n && !kontrak.has(n)) kontrak.set(n, x); }));
    const sudah = new Set();
    L.forEach(e => {
      const x = kontrak.get(e.noKontrak); if (!x) return;
      const kn = nomorKontrak(e.noKontrak, x.g, 'noPO');
      if (kn.sap && sap(e.noPO, batalPO()) && t(e.noPO) !== kn.sap) T.push({ tingkat: 'info', kode: 'PO_BK_BEDA', key: x.key, vendor: x.vendor || '', sumber: 'Input Progres', nilai: x.nilai || 0, tagihan: Number(e.nilai) || 0, persen: 0,
        pesan: 'BK ' + (e.nomorBA || 'tagihan ke-' + (e.tagihanKe || '?')) + ' menyimpan PO ' + t(e.noPO) + ', PO kontrak ' + kn.sap + ' — semua menu memakai PO kontrak.', buka: '' });
      if (!kn.sap && !sudah.has(x.key)) { sudah.add(x.key); T.push({ tingkat: 'info', kode: 'PO_KOSONG', key: x.key, vendor: x.vendor || '', sumber: x.t === 'reg' ? 'Register' : 'Master', nilai: x.nilai || 0, tagihan: 0, persen: 0,
        pesan: 'Sudah ada BK tetapi No PO SAP kontrak belum diisi' + (kn.apa ? ' (tercatat "' + kn.apa + '", bukan nomor SAP)' : '') + ' — isi di Register Kontrak / Perbaiki data kontrak.', buka: x.t === 'reg' ? 'bukaEditReg(' + JSON.stringify(x.r.id) + ')' : 'bukaKoreksi(' + JSON.stringify((x.g && x.g.key) || x.key) + ')' }); }
    });
  });
  try { if (typeof renderMonitoringBulanan === 'function' && document.getElementById('bkBody')) renderMonitoringBulanan(); } catch (e) { }
})();
