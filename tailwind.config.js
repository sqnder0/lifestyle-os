/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',   // Controlled by html.dark — NOT media query
  theme: {
    extend: {
      colors: {
        // Expose CSS variable tokens to Tailwind's JIT engine
        // Usage: text-token-primary, bg-token-surface, etc.
        token: {
          surface:      'var(--surface)',
          'surface-inset': 'var(--surface-inset)',
          'surface-page':  'var(--surface-page)',
          border:       'var(--border)',
          primary:      'var(--text-primary)',
          secondary:    'var(--text-secondary)',
          muted:        'var(--text-muted)',
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'page-in': 'pageIn 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 200ms ease both',
      },
      keyframes: {
        pageIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  // Safelist ensures generated classes aren't purged even if only used in JS strings
  safelist: [
    // Token classes
    'bg-surface', 'bg-surface-raised', 'bg-surface-inset', 'bg-page',
    'border-token', 'border-token-strong',
    'text-primary', 'text-secondary', 'text-muted',
    'bg-fill-indigo', 'bg-fill-emerald', 'bg-fill-amber',
    'bg-fill-red', 'bg-fill-sky', 'bg-fill-rose',
    'card', 'card-sm', 'card-inset',
    'input-base', 'textarea-base',
    'shadow-token', 'shadow-token-md',
    'tab-bar', 'tab-btn', 'section-label', 'badge',
    'page-enter', 'fade-in', 'flash-confirm', 'sidebar-active',
    // Status badge combinations used dynamically
    { pattern: /^(bg|text|border)-(indigo|emerald|amber|red|sky|rose|violet|zinc|purple)-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^(bg|text)-(indigo|emerald|amber|red|sky|rose|violet)-(50|100|600|700)$/ },
  ],
};
