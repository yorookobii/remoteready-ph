import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { useData } from '../lib/data'
import { num, peso, pesoShort } from '../lib/format'
import { ChartCard, FilterChips, KpiCard, LowSampleBadge, PageState } from '../components/ui'

const LEVELS = ['All', 'Entry', 'Mid', 'Senior', 'Lead']

/** Box plot: whiskers p10–p90, box p25–p75, line at the median. One row per group. */
function BoxPlot({ rows, labelKey }) {
  const [hover, setHover] = useState(null)
  const W = 720, L = 168, R = 24, rowH = 52, top = 16
  const H = top + rows.length * rowH + 28
  const max = Math.ceil(Math.max(...rows.map((r) => r.p90)) / 200000) * 200000
  const X = (v) => L + (v / max) * (W - L - R)
  const ticks = Array.from({ length: max / 200000 + 1 }, (_, i) => i * 200000)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Monthly pay ranges by group" className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={top - 6} y2={H - 26} stroke="var(--chart-grid)" />
            <text x={X(t)} y={H - 8} textAnchor="middle" className="fill-muted font-mono" fontSize="11">
              {pesoShort(t)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cy = top + i * rowH + rowH / 2
          const on = hover === i
          return (
            <g key={r[labelKey]} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill={on ? 'var(--bg-sunken)' : 'transparent'} />
              <text x={0} y={cy + 4} fontSize="13" className="fill-ink">
                {r[labelKey]}
              </text>
              <line x1={X(r.p10)} x2={X(r.p90)} y1={cy} y2={cy} stroke="var(--chart-1)" strokeWidth="2" />
              <line x1={X(r.p10)} x2={X(r.p10)} y1={cy - 7} y2={cy + 7} stroke="var(--chart-1)" strokeWidth="2" />
              <line x1={X(r.p90)} x2={X(r.p90)} y1={cy - 7} y2={cy + 7} stroke="var(--chart-1)" strokeWidth="2" />
              <rect
                x={X(r.p25)}
                y={cy - 12}
                width={Math.max(X(r.p75) - X(r.p25), 2)}
                height="24"
                rx="4"
                fill="#0d94882e"
                stroke="var(--chart-1)"
                strokeWidth="2"
              />
              <line x1={X(r.median)} x2={X(r.median)} y1={cy - 12} y2={cy + 12} stroke="var(--ink)" strokeWidth="3" />
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute right-0 top-0 rounded-md border border-line bg-surface px-3 py-2 text-body-sm shadow-pop">
          <div className="font-semibold">{rows[hover][labelKey]}</div>
          <div className="font-mono text-data text-muted">
            median {peso(rows[hover].median)} · middle half {pesoShort(rows[hover].p25)}–{pesoShort(rows[hover].p75)} · n={num(rows[hover].n)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Salary() {
  const { data, loading, error } = useData('salary', 'meta')
  const [level, setLevel] = useState('All')
  const [role, setRole] = useState('All role families')

  const table = useMemo(() => {
    if (!data) return []
    return data.salary.table.filter(
      (r) => (level === 'All' || r.seniority === level) && (role === 'All role families' || r.role === role),
    )
  }, [data, level, role])

  if (!data) return <PageState loading={loading} error={error} />
  const { salary: s, meta } = data
  const roles = ['All role families', ...s.by_role.map((r) => r.role)]

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-3xl text-body text-muted">
        What remote jobs pay per month in pesos, from the {num(s.overall.n)} postings that list a salary ({s.coverage_pct}% of
        all jobs). These are global market rates, mostly from US and European employers.
      </p>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
        <KpiCard label="Median, all jobs" value={peso(s.overall.median)} caption={`n=${num(s.overall.n)} postings with salary`} />
        <KpiCard
          label="Median, open to PH"
          value={peso(s.ph_accessible.median)}
          valueClass="text-brand"
          caption={`n=${num(s.ph_accessible.n)} · ${Math.round((s.ph_accessible.median / s.overall.median) * 100)}% of the overall median`}
        />
        <KpiCard
          label="Entry-level median"
          value={peso(s.by_seniority[0].median)}
          caption={`Lead roles: ${peso(s.by_seniority[3].median)}`}
        />
        <KpiCard
          label="Part-time median"
          value={peso(s.by_job_type.find((t) => t.type === 'Part-time')?.median)}
          caption={`Full-time: ${peso(s.by_job_type.find((t) => t.type === 'Full-time')?.median)}`}
        />
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-6">
        <ChartCard
          className="lg:col-span-2"
          title="Monthly pay range by role family"
          subtitle="Box = middle half of postings · dark line = median · whiskers = 10th to 90th percentile"
        >
          <BoxPlot rows={s.by_role} labelKey="role" />
        </ChartCard>

        <aside className="flex flex-col gap-6">
          <ChartCard title="By experience level" subtitle="Median and middle half, all role families">
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {s.by_seniority.map((r) => {
                const top = s.by_seniority[s.by_seniority.length - 1].p75
                return (
                  <li key={r.seniority} className="flex flex-col gap-1">
                    <span className="flex justify-between text-body-sm">
                      <span className="font-medium">{r.seniority}</span>
                      <span className="font-mono text-data">{peso(r.median)}</span>
                    </span>
                    <span className="relative block h-2 rounded-full bg-sunken" title={`${pesoShort(r.p25)} – ${pesoShort(r.p75)}, n=${r.n}`}>
                      <span
                        className="absolute h-2 rounded-full bg-[#0d94884d]"
                        style={{ left: `${(r.p25 / top) * 100}%`, width: `${((r.p75 - r.p25) / top) * 100}%` }}
                      />
                      <span className="absolute -top-0.5 h-3 w-[3px] rounded bg-ink" style={{ left: `${(r.median / top) * 100}%` }} />
                    </span>
                  </li>
                )
              })}
            </ul>
          </ChartCard>
          <div className="card flex flex-col gap-3 border-sunken bg-sunken">
            <span className="flex items-center gap-2 text-[14px] font-semibold">
              <Info size={16} className="text-muted" aria-hidden="true" />
              How these numbers are made
            </span>
            <p className="m-0 text-body-sm text-muted">
              Salaries are converted to pesos at ₱{meta.usd_to_php} per US dollar ({meta.rate_source}), then normalized to
              monthly: hourly pay × 160 hours, annual pay ÷ 12. The midpoint of each posted range is used.
            </p>
            <p className="m-0 text-body-sm text-muted">Groups with fewer than 20 postings are flagged as low sample.</p>
          </div>
        </aside>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-section-title">Benchmarks by role and level</h2>
            <span className="text-caption text-subtle">Monthly pay in PHP · range = middle half of postings</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-body-sm text-muted">
              Role family
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 rounded-md border border-line-strong bg-surface px-3 text-body-sm text-ink"
              >
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <FilterChips label="Experience level" options={LEVELS} value={level} onChange={setLevel} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-body-sm">
            <thead>
              <tr className="border-y border-line bg-sunken">
                <th className="label px-6 py-2.5 text-left font-medium">Role family</th>
                <th className="label px-2 py-2.5 text-left font-medium">Level</th>
                <th className="label px-2 py-2.5 text-right font-medium">Median</th>
                <th className="label px-2 py-2.5 text-left font-medium">Range</th>
                <th className="label px-2 py-2.5 text-right font-medium">Sample</th>
                <th className="px-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={`${r.role}-${r.seniority}`} className="border-b border-line hover:bg-sunken">
                  <td className="px-6 py-3 font-medium">{r.role}</td>
                  <td className="px-2 py-3 text-muted">{r.seniority}</td>
                  <td className="px-2 py-3 text-right font-mono text-data">{peso(r.median)}</td>
                  <td className="px-2 py-3 font-mono text-data text-muted">
                    {pesoShort(r.p25)} – {pesoShort(r.p75)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-data text-muted">n={r.n}</td>
                  <td className="px-6 py-3">{r.low_sample && <LowSampleBadge />}</td>
                </tr>
              ))}
              {table.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-muted">
                    Not enough salary data for this combination.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
