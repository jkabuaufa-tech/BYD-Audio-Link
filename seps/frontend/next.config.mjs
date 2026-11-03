/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ekspor statis (frontend/out) — disajikan oleh server SEPS sendiri, termasuk di aplikasi desktop.
  output: 'export',
  images: { unoptimized: true },
};
export default nextConfig;
