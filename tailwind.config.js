/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#6571ff',
        'secondary': '#ff3366',
        'dark-bg': '#0c1427',
        'dark-bg-active': '#0f1932',
        'body-bg': '#070d19',
        'gray-text': '#7d7f8a',
        'body': '#7987a1'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
