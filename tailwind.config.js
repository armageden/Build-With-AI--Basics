/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF8F5',
        ink: {
          DEFAULT: '#111315',
          muted: '#525866',
          subtle: '#868C98',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          border: '#E5E0D8',
          muted: '#F4EFEA',
        },
        alert: {
          border: '#D97706',
          header: '#FFFBEB',
          badge: '#B45309',
          badgeBg: '#FEF3C7',
          text: '#92400E',
        },
        verified: {
          border: '#15803D',
          header: '#F0FDF4',
          badge: '#166534',
          badgeBg: '#DCFCE7',
          text: '#166534',
        },
        diff: {
          delBg: '#FEF2F2',
          delText: '#991B1B',
          delLine: '#FEE2E2',
          addBg: '#F0FDF4',
          addText: '#166534',
          addLine: '#DCFCE7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        receipt: '0 4px 20px -2px rgba(17, 19, 21, 0.05), 0 2px 6px -1px rgba(17, 19, 21, 0.03)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
