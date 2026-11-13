/** format.js — Format angka/tanggal gaya Indonesia + util kecil. */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const nf = (min, max) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: min, maximumFractionDigits: max });
  const NF = { rp: nf(2, 2), rp0: nf(0, 0), vol: nf(0, 2) };
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  JIAT.fmt = {
    /** Rupiah lengkap dua desimal: Rp 80.323.036.615,49 */
    rp: (n) => 'Rp ' + NF.rp.format(n || 0),
    rp0: (n) => NF.rp0.format(n || 0),
    /** Volume: maks. 2 desimal, tanpa nol di belakang. */
    vol: (n) => (n == null || n === '' ? '–' : NF.vol.format(n)),
    /** Pecahan → persen. `signed` menambah tanda +/− untuk deviasi. */
    pct(n, digits = 2, signed = false) {
      if (n == null || Number.isNaN(n)) return '–';
      const v = nf(digits, digits).format(Math.abs(n) * 100) + '%';
      if (!signed) return (n < 0 ? '−' : '') + v;
      return (n > 0 ? '+' : n < 0 ? '−' : '') + v;
    },
    tgl(iso, withDay = false) {
      if (!iso) return '–';
      const [y, m, d] = iso.split('-').map(Number);
      const day = withDay ? HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + ', ' : '';
      return `${day}${d} ${BULAN[m - 1]} ${y}`;
    },
    tglPendek(iso) { const [, m, d] = iso.split('-').map(Number); return `${d} ${BULAN[m - 1]}`; },
    /** Tanggal hari ini menurut zona waktu perangkat. */
    today() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]),
    /** "1.234,5" atau "1234.5" → number; kosong → null; tidak valid → NaN. */
    parseNum(s) {
      const t = String(s == null ? '' : s).trim();
      if (!t) return null;
      const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
      return /^-?\d*\.?\d+$/.test(norm) ? Number(norm) : NaN;
    },
  };
})();
