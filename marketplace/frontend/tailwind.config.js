/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        swabhiman: {
          bg: '#FBF8F2',
          surface: '#FFFFFF',
          border: '#E8E2D6',
          text: '#1B1A17',
          muted: '#5A5448',
          chip: '#F4EEE0',
          accent: '#F2A900',
          emergency: '#C2331F',
          onlineBg: '#E3F4EA',
          onlineText: '#0B6B3A',
          offlineBg: '#EFEBE2',
          offlineText: '#5A5448',
          darkBg: '#0B1220',
          darkSurface: '#131C2E',
          darkBorder: '#24304A',
          darkText: '#F3F5F9',
          darkMuted: '#A7B1C4',
          darkOnlineBg: '#12351F',
          darkOnlineText: '#6EE7A0',
          darkOfflineBg: '#1F2A44',
          darkOfflineText: '#A7B1C4',
        },
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          yellow: '#F2A900',
          navy: '#0B1220',
          navyDark: '#070C15',
          navyCard: '#131C2E',
          navyBorder: '#24304A',
        }
      },
      borderRadius: {
        'card': '22px',
        'button': '13px',
        'pill': '999px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
};
