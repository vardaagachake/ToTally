/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0C2451',
          50: '#E8EDF5',
          100: '#C5D0E8',
          200: '#8FA1D0',
          300: '#5972B9',
          400: '#2F4D8A',
          500: '#0C2451',
          600: '#0A1E44',
          700: '#081837',
          800: '#06122A',
          900: '#040C1D',
        },
        rzp: {
          blue: '#3395FF',
          'blue-hover': '#1A7FE8',
        },
        success: '#00C566',
        warning: '#FFAA00',
        error: '#FF5B5B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
