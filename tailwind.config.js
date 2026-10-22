/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: { 50: '#f7f9fc', 100: '#eef2f6', 200: '#e3e9f0', 300: '#c3cdd9', 400: '#8a9bb0', 500: '#63758d', 600: '#465b73', 700: '#283b4c', 800: '#1b2a36', 900: '#101d27', 950: '#09141d' },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#7661ff',
          600: '#6046ff',
          700: '#5139dc',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
