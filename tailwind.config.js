/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#0C0D0E',
          900: '#121316',
          850: '#18191E',
          800: '#22242B',
          700: '#2E313B',
          600: '#3E4250',
          500: '#5A5F73',
          400: '#8E95AB',
          300: '#B5BAC9',
          200: '#D8DBE2',
          100: '#F1F2F6',
        },
        brand: {
          primary: '#6366F1', // Indigo
          hover: '#4F46E5',
          accent: '#38BDF8', // Cyan/Sky
        },
        category: {
          power: '#F59E0B',
          data: '#06B6D4',
          video: '#8B5CF6',
          network: '#10B981',
          neutral: '#94A3B8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
