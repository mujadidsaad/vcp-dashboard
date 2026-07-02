 /** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0d0a',
          soft:    '#101410',
          card:    '#141814',
          rail:    '#0d100d',
        },
        line: 'rgba(255,255,255,0.06)',
        accent: {
          DEFAULT: '#ff6b7a',   // light red / coral
          soft:    '#ff96a1',
          dim:     '#c94b58',
        },
        good:  '#3ddc84',
        warn:  '#ffb84a',
        bad:   '#ff5a6a',
        info:  '#7aa8ff',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(255,107,122,0.25)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(1200px 500px at 20% -10%, rgba(255,107,122,0.10), transparent 60%), radial-gradient(900px 400px at 100% 10%, rgba(122,168,255,0.06), transparent 60%)',
      },
    },
  },
  plugins: [],
};