'use client';

/** Bagian bersama grafik: kartu, legenda HTML, tooltip, dan gaya sumbu yang resesif. */

export const sumbu = {
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  axisLine: { stroke: 'var(--border)' },
  tickLine: false,
};
export const grid = { stroke: 'var(--grid)', vertical: false };

export function KartuGrafik({ judul, subjudul, legenda, children, catatan }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{judul}</h2>
          {subjudul && <p className="text-xs text-sub">{subjudul}</p>}
        </div>
        {legenda && <Legenda entri={legenda} />}
      </header>
      {children}
      {catatan && <p className="mt-2 text-xs text-muted">{catatan}</p>}
    </section>
  );
}

/** entri: [{ label, warna, jenis: 'kotak' | 'garis' | 'putus' }] */
export function Legenda({ entri }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub">
      {entri.map((e) => (
        <li key={e.label} className="flex items-center gap-1.5">
          {e.jenis === 'kotak' ? (
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: e.warna }} />
          ) : (
            <svg width="16" height="4" aria-hidden>
              <line x1="0" y1="2" x2="16" y2="2" stroke={e.warna} strokeWidth="2" strokeDasharray={e.jenis === 'putus' ? '4 3' : undefined} />
            </svg>
          )}
          {e.label}
        </li>
      ))}
    </ul>
  );
}

/** Tooltip generik: baris = [{ label, nilai, warna? }] dari fungsi `isi(payloadRow)`. */
export function TooltipKustom({ active, payload, isi }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  const { judul, baris } = isi(row);
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-ink">{judul}</p>
      <table>
        <tbody>
          {baris.map((b) => (
            <tr key={b.label}>
              <td className="pr-3 text-sub">
                {b.warna && <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: b.warna }} />}
                {b.label}
              </td>
              <td className="text-right font-medium text-ink">{b.nilai}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
