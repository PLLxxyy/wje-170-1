/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#dc2626',
        info: '#0891b2'
      }
    }
  },
  plugins: []
}
