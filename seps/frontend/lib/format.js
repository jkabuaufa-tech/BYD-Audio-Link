const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const rupiah = (n) => (n == null ? '—' : `Rp ${nf0.format(Math.round(n))}`);
export const angka = (n, d = 0) => (n == null ? '—' : d === 0 ? nf0.format(n) : nf1.format(n));
export const persen = (n) => (n == null ? '—' : `${nf2.format(n)}%`);

/** Rupiah ringkas untuk sumbu grafik: Rp 1,2 M / Rp 350 jt / Rp 90 rb. */
export function rupiahRingkas(n) {
  if (n == null) return '—';
  const a = Math.abs(n);
  const s = n < 0 ? '−' : '';
  if (a >= 1e12) return `${s}Rp ${nf1.format(a / 1e12)} T`;
  if (a >= 1e9) return `${s}Rp ${nf1.format(a / 1e9)} M`;
  if (a >= 1e6) return `${s}Rp ${nf1.format(a / 1e6)} jt`;
  if (a >= 1e3) return `${s}Rp ${nf0.format(a / 1e3)} rb`;
  return `${s}Rp ${nf0.format(a)}`;
}

/** Selisih bertanda: positif = hemat, negatif = overrun. */
export const rupiahBertanda = (n) => (n == null ? '—' : `${n >= 0 ? '+' : '−'}${rupiah(Math.abs(n))}`);
