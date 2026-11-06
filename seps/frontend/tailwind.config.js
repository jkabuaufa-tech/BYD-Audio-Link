/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Token peran (lihat app/globals.css) — dipakai juga oleh grafik.
        surface: 'var(--surface-1)',
        panel: 'var(--surface-2)',
        ink: 'var(--text-primary)',
        sub: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        line: 'var(--border)',
      },
    },
  },
  plugins: [],
};
