import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'SEPS — Evaluasi Swakelola',
  description: 'Sistem Evaluasi & Produksi Swakelola: monitoring produksi harian dan keputusan Swakelola vs Beli Jadi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-panel">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <p className="text-base font-semibold">SEPS · Sistem Evaluasi &amp; Produksi Swakelola</p>
              <p className="text-xs text-sub">Proyek Pengarah Rukoh Lanjutan</p>
            </div>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-sub hover:text-ink">Dashboard</Link>
              <Link href="/input" className="text-sub hover:text-ink">Input Produksi Harian</Link>
              <Link href="/harga-beli-jadi" className="text-sub hover:text-ink">Harga Beli Jadi</Link>
              <Link href="/pengaturan" className="text-sub hover:text-ink">Pengaturan</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
