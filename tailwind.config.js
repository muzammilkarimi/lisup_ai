/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Hanken Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        saffron:      '#E07B39',
        'saffron-d':  '#C0631F',
        'saffron-bg': '#FBF1E9',
        'saffron-br': '#F4DEC9',
        'error-bg':   '#FBECE8',
        'error-red':  '#CB4F37',
        ink:          '#23201C',
        'soft':       '#F5F4F1',
        'border-l':   '#ECE8E1',
        'border-c':   '#ECE7DF',
        'border-b':   '#E2DDD5',
        'tx-p':       '#26231F',
        'tx-b':       '#33302B',
        'tx-m':       '#7A746B',
        'tx-l':       '#9A938A',
        'tx-f':       '#A9A299',
        'tx-ap':      '#A29B91',
        'tx-cb':      '#8C857B',
        'tx-ou':      '#524E47',
        'cl-x':       '#BDB6AC',
      },
      borderRadius: {
        widget: '16px',
        inner:  '12px',
        btn:    '11px',
        chip:   '99px',
      },
      boxShadow: {
        widget:  '0 24px 60px -22px rgba(58,48,33,.45), 0 1px 2px rgba(0,0,0,.04)',
        mic:     '0 8px 20px -8px rgba(35,32,28,.55)',
        'mic-s': '0 8px 22px -8px rgba(224,123,57,.6)',
        tray:    '0 14px 36px -16px rgba(58,48,33,.4)',
      },
      keyframes: {
        pulseRingA: {
          '0%':   { transform: 'scale(1)',   opacity: '0.5' },
          '100%': { transform: 'scale(1.9)', opacity: '0'   },
        },
        pulseRingB: {
          '0%':   { transform: 'scale(1)',   opacity: '0.35' },
          '100%': { transform: 'scale(2.4)', opacity: '0'    },
        },
        dotBounce: {
          '0%, 100%': { transform: 'translateY(0)',    opacity: '0.35' },
          '50%':      { transform: 'translateY(-6px)', opacity: '1'    },
        },
      },
      animation: {
        'ring-a': 'pulseRingA 1.8s ease-out infinite',
        'ring-b': 'pulseRingB 1.8s ease-out infinite 0.5s',
        'dot-1':  'dotBounce 1.2s ease-in-out infinite 0s',
        'dot-2':  'dotBounce 1.2s ease-in-out infinite 0.18s',
        'dot-3':  'dotBounce 1.2s ease-in-out infinite 0.36s',
      },
    },
  },
  plugins: [],
}
