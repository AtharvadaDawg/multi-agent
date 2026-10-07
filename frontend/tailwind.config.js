/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        datadog: {
          purple: '#7C3AED',
          'purple-dark': '#632CA6',
          'purple-deep': '#4D1979',
          'purple-light': '#9353E6',
          'purple-subtle': 'rgba(124, 58, 237, 0.12)',
          bg: '#0E1017',
          canvas: '#11131C',
          card: '#161823',
          'card-header': '#1A1D2B',
          surface: '#1F2232',
          border: '#262A3D',
          'border-light': '#32374E',
          hover: '#222638',
          text: '#F3F4F6',
          'text-secondary': '#9CA3AF',
          'text-muted': '#646C82',
          ok: '#00D084',
          warn: '#FF9900',
          alert: '#FF4D4D',
          info: '#2085EC',
          apm: '#00C4DF',
        },
        background: '#0E1017',
        card: '#161823',
        'card-border': '#262A3D',
        primary: {
          50: '#F5F3FF',
          500: '#7C3AED',
          600: '#632CA6',
          700: '#4D1979',
        },
        danger: {
          500: '#FF4D4D',
          600: '#DC2626',
        },
        warning: {
          500: '#FF9900',
          600: '#D97706',
        },
        success: {
          500: '#00D084',
          600: '#059669',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        header: ['"NationalWeb"', '"Noto Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
