/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'serif'],
        serif: ['Playfair Display', 'serif'],
        body: ['EB Garamond', 'serif'],
      },
      colors: {
        espresso: {
          950: '#0f0a07',
          900: '#1a110b',
          800: '#281b12',
          700: '#3a271a',
        },
        gold: {
          300: '#f3d999',
          400: '#e2bd6b',
          500: '#c99b42',
          600: '#9e7528',
        },
        parchment: {
          50: '#fbf6e8',
          100: '#f4e9cf',
          200: '#e8d5ae',
          300: '#d7bc8a',
        },
      },
    },
  },
  plugins: [],
};
