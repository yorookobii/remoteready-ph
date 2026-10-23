import { ArrowDownRight, ArrowRight, ArrowUpRight, ExternalLink, TriangleAlert } from 'lucide-react'
import { num } from '../lib/format'

export function KpiCard({ label, value, caption, valueClass = '' }) {
  return (
    <div className="card flex flex-col gap-2">
      <span className="label">{label}</span>
      <span className={`num text-kpi ${valueClass}`}>{value}</span>
      {caption && <span className="text-caption text-subtle">{caption}</span>}
    </div>
  )
}

export function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`card flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-section-title">{title}</h2>
          {subtitle && <span className="text-caption text-subtle">{subtitle}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function TextButton({ children, onClick, pressed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="text-body-sm font-medium text-brand hover:text-brand-hover"
    >
      {children}
    </button>
  )
}

const TREND = {
  rising: { cls: 'bg-up-soft text-up', Icon: ArrowUpRight, word: 'Rising' },
  stable: { cls: 'bg-sunken text-muted', Icon: ArrowRight, word: 'Stable' },
  declining: { cls: 'bg-down-soft text-down', Icon: ArrowDownRight, word: 'Declining' },
}

export function TrendBadge({ trend }) {
  const t = TREND[trend]
  if (!t) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-2 text-caption font-medium leading-5 ${t.cls}`}>
      <t.Icon size={14} aria-hidden="true" />
      {t.word}
    </span>
  )
}

export function LowSampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-2 text-caption font-medium leading-5 text-accent-ink">
      <TriangleAlert size={12} aria-hidden="true" />
      Low sample
    </span>
  )
}

export function SourceChip({ name, url, count }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-body-sm text-ink no-underline hover:bg-sunken"
    >
      {name}
      {count != null && <span className="font-mono text-caption text-subtle">{num(count)}</span>}
      <ExternalLink size={14} className="text-subtle" aria-hidden="true" />
    </a>
  )
}

/** Horizontal bar list in plain HTML: label, bar, value. One series, one color. */
export function BarList({ items, max, color = 'var(--chart-1)', format = (v) => v, labelWidth = 176 }) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((it) => (
        <li
          key={it.label}
          className="grid items-center gap-3"
          style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr) 56px` }}
          title={it.title}
        >
          <span className="truncate text-body-sm">{it.label}</span>
          <span className="h-4 rounded-r bg-sunken">
            <span className="block h-4 rounded-r" style={{ width: `${(it.value / top) * 100}%`, background: color }} />
          </span>
          <span className="text-right font-mono text-data text-muted">{format(it.value)}</span>
        </li>
      ))}
    </ul>
  )
}

export function PageState({ loading, error }) {
  if (error)
    return (
      <div className="card text-body-sm text-muted">
        Couldn't load the data. Run <code className="font-mono">python analyze.py</code> in the pipeline folder, then refresh.
        <div className="mt-2 font-mono text-caption text-subtle">{String(error.message || error)}</div>
      </div>
    )
  if (loading) return <div className="card animate-pulse text-body-sm text-subtle">Loading data…</div>
  return null
}

export function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="bg-sunken">
            {columns.map((c) => (
              <th key={c.key} className={`label px-3 py-2 font-medium ${c.right ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.right ? 'text-right font-mono text-data' : ''}`}>
                  {c.format ? c.format(r[c.key]) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** One row of filter chips. options: [{value, label}] or strings. */
export function FilterChips({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3.5 py-1.5 text-body-sm font-medium ${
              on ? 'border-[#b9e0db] bg-brand-soft text-brand-ink' : 'border-transparent bg-sunken text-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Note({ children }) {
  return <p className="m-0 rounded-md bg-sunken px-4 py-3 text-body-sm text-muted">{children}</p>
}
