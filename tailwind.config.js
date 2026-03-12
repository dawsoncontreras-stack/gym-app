/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bbdaff',
          300: '#8cc3ff',
          400: '#56a2ff',
          500: '#2f7fff',
          600: '#1860f5',
          700: '#104ae1',
          800: '#143db6',
          900: '#17388f',
          950: '#122357',
        },
        accent: {
          DEFAULT: '#2f7fff',
          dark: '#1860f5',
        },
        muted: '#8888a0',
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8f9fb',
          tertiary: '#f1f3f5',
        },
        ink: {
          DEFAULT: '#1a1a2e',
          secondary: '#4a4a68',
          muted: '#8888a0',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '28px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
      },
      spacing: {
        18: '72px',
        22: '88px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        sticky: '0 -2px 10px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
