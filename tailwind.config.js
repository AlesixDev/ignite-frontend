/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#f2613f',
        'secondary': '#9b3922',
        'body': '#0c0c0c',
        'dark-bg': '#0c1427',
        'dark-bg-active': '#0f1932',
        gray: {
          900: '#202225',
          800: '#2f3136',
          700: '#36393f',
          600: '#4f545c',
          400: '#d4d7dc',
          300: '#e3e5e8',
          200: '#ebedef',
          100: '#f2f3f5',
        },
        green: {
          500: '#3ba55d',
        },
        purple: {
          500: '#5865f2',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
