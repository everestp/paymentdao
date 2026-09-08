/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        bgdark: '#0a0b0f',
        bgpanel: '#12141b',
        bgpanel2: '#1a1d27',
        bgcard: '#161922',
        bdlight: '#252836',
        bdbright: '#3a3f55',
        txprim: '#f0f1f5',
        txsec: '#9ca3b8',
        txdim: '#6b7180',
        cyan: '#00d4e6',
        green: '#00e676',
        yellow: '#ffd600',
        pink: '#ff2e9a',
        orange: '#ff8c00',
        red: '#ff3860',
        blue: '#4d7cff',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
