/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f0ff',
          100: '#e4e4ff',
          200: '#cdcdff',
          300: '#a8a8ff',
          400: '#7c7cff',
          500: '#5353ff',
          600: '#3b3bf7',
          700: '#2e2de3',
          800: '#2525b8',
          900: '#232390',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle:  '#f8f8fc',
          muted:   '#f2f2f8',
        },
        wb:   { DEFAULT: '#CB11AB', light: '#fdf0fb', border: '#f0b3e8' },
        ozon: { DEFAULT: '#005BFF', light: '#eff4ff', border: '#b3cdff' },
        ym:   { DEFAULT: '#FC3F1D', light: '#fff2ef', border: '#ffb8ad' },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 4px 0 rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px 0 rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
        modal: '0 20px 60px 0 rgba(0,0,0,0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
