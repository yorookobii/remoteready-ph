/** Design tokens from the RemoteReady PH design system (tokens.json).
 *  Colors point at CSS variables in src/index.css so a dark theme can be added later
 *  by redefining the variables only. */
const v = (name) => `var(--${name})`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: v('bg-page'),
        surface: v('bg-surface'),
        sunken: v('bg-sunken'),
        line: v('border'),
        'line-strong': v('border-strong'),
        ink: v('ink'),
        muted: v('ink-muted'),
        subtle: v('ink-subtle'),
        brand: { DEFAULT: v('brand'), hover: v('brand-hover'), soft: v('brand-soft'), ink: v('brand-ink'), on: v('on-brand') },
        accent: { DEFAULT: v('accent'), soft: v('accent-soft'), ink: v('accent-ink'), on: v('on-accent') },
        up: { DEFAULT: v('trend-up'), soft: v('trend-up-soft') },
        down: { DEFAULT: v('trend-down'), soft: v('trend-down-soft') },
        chart: { 1: v('chart-1'), 2: v('chart-2'), 3: v('chart-3'), 4: v('chart-4'), 5: v('chart-5'), other: v('chart-other'), grid: v('chart-grid') },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        kpi: ['36px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '600' }],
        hero: ['56px', { lineHeight: '60px', letterSpacing: '-0.03em', fontWeight: '600' }],
        'page-title': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'section-title': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '24px' }],
        'body-sm': ['13px', { lineHeight: '20px' }],
        label: ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '16px' }],
        data: ['13px', { lineHeight: '20px', fontWeight: '500' }],
        'data-sm': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: { sm: '6px', md: '8px', lg: '12px' },
      boxShadow: { pop: '0 8px 24px rgba(15, 27, 34, 0.12)' },
    },
  },
  plugins: [],
}
