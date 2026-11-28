/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Words on navy: the app's ink (BBTheme.swift, Navy & Warm Gold).
        cream: {
          DEFAULT: '#F8F3E8',
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
        // App surfaces, from the app's default Navy & Warm Gold palette
        // (bgDeep, bgRaised, bgDeepest) so the site reads as the same product.
        night: {
          DEFAULT: '#0B1F36',
          raised: '#102A46',
          deep: '#071426',
        },
        // The app's cream Scripture card, with navy words.
        parchment: {
          DEFAULT: '#F3E7D3',
          dim: '#E4D4BA',
          ink: '#071426',
        },
        gold: {
          DEFAULT: '#D7A84A',
          light: '#E4C36F',
          deep: '#A97825',
          glow: '#F0D88E',
        },
        // Gold words on cream.
        bronze: '#7A4F16',
      },
      fontFamily: {
        // Each web font is followed by a local font sized to match it
        // (global.css), so text does not move when the web font arrives.
        serif: ['"Cormorant Garamond"', '"Cormorant Fallback"', 'Georgia', 'serif'],
        sans: ['Inter', '"Inter Fallback"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        page: '1180px',
      },
    },
  },
  plugins: [],
};
