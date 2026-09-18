/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#f7eddc',
          50: '#fdf8ee',
          100: '#fbf2e0',
          200: '#f7eddc',
          300: '#f1e2c5',
        },
        navy: {
          DEFAULT: '#06142a',
          deep: '#04101f',
          ink: '#03090e',
        },
        // App surfaces, from bible-bedtime-ios BBTheme.swift (premiumNavy /
        // premiumNavyLight) so the site reads as the same product as the app.
        night: {
          DEFAULT: '#101a2a',
          raised: '#1a2a42',
          deep: '#0a111d',
        },
        parchment: {
          DEFAULT: '#f4e8d8',
          dim: '#eadbc8',
          ink: '#1f140a',
        },
        gold: {
          DEFAULT: '#d4a14a',
          light: '#e2b66a',
          deep: '#b88431',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        page: '1280px',
      },
    },
  },
  plugins: [],
};
