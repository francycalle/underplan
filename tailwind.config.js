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
        cad: {
          bg: '#0E0F12',
          surface: '#15161A',
          card: '#1D1E22',
          border: '#2A2D36',
          blue: '#3B82F6',
          red: '#C80E11',
          textMuted: '#929394',
        },
        graphite: {
          950: '#0E0F12',
          900: '#15161A',
          850: '#18191E',
          800: '#22242B',
          700: '#2A2D36',
          600: '#3E4250',
          500: '#5A5F73',
          400: '#8E95AB',
          300: '#B5BAC9',
          200: '#D8DBE2',
          100: '#F1F2F6',
        },
        brand: {
          primary: '#3B82F6', // Vibrant Royal Blue
          hover: '#2563EB',
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
        sans: ['Figtree', 'sans-serif'],
        figtree: ['Figtree', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
