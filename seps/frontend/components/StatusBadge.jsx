/** Status selalu tampil sebagai ikon + label (tidak mengandalkan warna saja). */
const PETA = {
  AMAN: { label: 'Aman', ikon: '✓', warna: 'var(--status-good)' },
  WASPADA: { label: 'Waspada', ikon: '!', warna: 'var(--status-warning)' },
  ALERT_BELI_JADI: { label: 'Pertimbangkan Beli Jadi', ikon: '▲', warna: 'var(--status-critical)' },
  DATA_KURANG: { label: 'Data kurang', ikon: '…', warna: 'var(--text-muted)' },
};

export default function StatusBadge({ status }) {
  const s = PETA[status] || PETA.DATA_KURANG;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink">
      <span
        aria-hidden
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: s.warna }}
      >
        {s.ikon}
      </span>
      {s.label}
    </span>
  );
}
