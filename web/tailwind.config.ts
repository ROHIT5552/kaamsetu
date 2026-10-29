import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        mute: 'var(--mute)',
        line: 'var(--line)',
        blue: 'var(--blue)',
        yel: 'var(--yel)',
        yelink: 'var(--yelink)',
        ok: 'var(--ok)',
        bad: 'var(--bad)',
      },
      fontFamily: {
        sans: ['var(--font-hind)', 'Hind', 'system-ui', 'sans-serif'],
        baloo: ['var(--font-baloo)', 'Baloo 2', 'sans-serif'],
      },
      backgroundImage: {
        'tape-stripes': 'repeating-linear-gradient(-45deg, var(--yel) 0 14px, #14232b 14px 28px)',
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
