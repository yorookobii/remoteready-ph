import { ExternalLink } from 'lucide-react'
import { useData } from '../lib/data'
import { dateLabel, num, pct, peso } from '../lib/format'
import { ChartCard, PageState } from '../components/ui'

const TIERS = [
  ['Worldwide', '#0f766e', '#ffffff'],
  ['Open to PH/APAC', '#4fa89d', '#0f1b22'],
  ['US & Canada only', '#8b98a3', '#0f1b22'],
  ['Europe only', '#aab4bc', '#0f1b22'],
  ['Latin America only', '#c4ccd2', '#0f1b22'],
  ['Other regions', '#dbe1e5', '#0f1b22'],
]

// PH time (UTC+8). US East business hours 9am-5pm ET land at 9pm-5am PH; UK 9-5 lands at 4pm-12am.
const BANDS = [
  { name: 'PH day shift (8am – 6pm)', from: 8, to: 18, color: '#0f766e' },
  { name: 'UK business hours (4pm – 12am PH)', from: 16, to: 24, color: '#4fa89d' },
  { name: 'US East business hours (9pm – 5am PH)', from: 21, to: 5, color: '#8b98a3' },
]
const on = (h, b) => (b.from < b.to ? h >= b.from && h < b.to : h >= b.from || h < b.to)

export default function Access() {
  const { data, loading, error } = useData('access')
  if (!data) return <PageState loading={loading} error={error} />
  const a = data.access
  const roles = a.by_role.filter((r) => r.role !== 'Other')

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-wrap items-center gap-8 p-8">
        <div className="flex min-w-[320px] flex-1 flex-col gap-2">
          <span className="label">Open to applicants in the Philippines</span>
          <span className="num text-hero text-brand">{pct(a.overall.rate)}</span>
          <p className="m-0 max-w-[460px] text-body text-muted">
            of the {num(a.overall.total)} remote jobs we analyzed. Most are locked to the US, Canada or Europe, even when the
            work itself is fully remote.
          </p>
        </div>
        <div className="grid min-w-[300px] flex-1 grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 rounded-md bg-brand-soft p-4">
            <span className="num text-[28px] font-semibold leading-8 text-brand-ink">{num(a.overall.count)}</span>
            <span className="text-body-sm text-brand-ink">jobs you can apply to</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md bg-sunken p-4">
            <span className="num text-[28px] font-semibold leading-8 text-muted">{num(a.overall.total - a.overall.count)}</span>
            <span className="text-body-sm text-muted">region-locked elsewhere</span>
          </div>
          <div className="col-span-2 text-body-sm text-muted">
            {num(a.overall.ph_based)} postings name the Philippines directly.
          </div>
        </div>
      </section>

      <ChartCard title="Who each role family is open to" subtitle="Share of postings by location restriction · right column = share open to PH">
        <div className="flex flex-wrap gap-4 text-body-sm text-muted">
          {TIERS.map(([t, c]) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} aria-hidden="true" />
              {t}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3.5">
          {roles.map((r) => (
            <div key={r.role} className="grid grid-cols-[156px_minmax(0,1fr)_56px] items-center gap-4">
              <span className="text-body-sm font-medium">{r.role}</span>
              <div
                className="flex h-7 gap-0.5 overflow-hidden rounded"
                role="img"
                aria-label={`${r.role}: ${TIERS.map(([t]) => `${t} ${r.tiers[t]}%`).join(', ')}`}
              >
                {TIERS.map(([t, c, ink]) =>
                  r.tiers[t] > 0 ? (
                    <div
                      key={t}
                      title={`${t}: ${pct(r.tiers[t])}`}
                      className="flex items-center overflow-hidden whitespace-nowrap pl-2 font-mono text-data-sm"
                      style={{ width: `${r.tiers[t]}%`, background: c, color: ink }}
                    >
                      {r.tiers[t] >= 9 ? pct(r.tiers[t], 0) : ''}
                    </div>
                  ) : null,
                )}
              </div>
              <span className="text-right font-mono text-data font-medium text-brand-ink">{pct(r.rate)}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-6">
        <section className="card overflow-hidden p-0 lg:col-span-2">
          <div className="flex flex-col gap-0.5 px-6 pb-4 pt-5">
            <h2 className="m-0 text-section-title">Role families ranked by PH accessibility</h2>
            <span className="text-caption text-subtle">Where Filipino applicants have the most openings, relatively</span>
          </div>
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-y border-line bg-sunken">
                <th className="label w-10 px-6 py-2.5 text-left font-medium">#</th>
                <th className="label px-2 py-2.5 text-left font-medium">Role family</th>
                <th className="label w-1/3 px-2 py-2.5 text-left font-medium">Open to PH</th>
                <th className="label px-2 py-2.5 text-right font-medium">Rate</th>
                <th className="label px-6 py-2.5 text-right font-medium">PH jobs</th>
              </tr>
            </thead>
            <tbody>
              {a.by_role.map((r, i) => (
                <tr key={r.role} className="border-b border-line hover:bg-sunken">
                  <td className="px-6 py-3 font-mono text-data text-subtle">{i + 1}</td>
                  <td className="px-2 py-3 font-medium">{r.role}</td>
                  <td className="px-2 py-3">
                    <span className="block h-1.5 rounded-full bg-sunken">
                      <span className="block h-1.5 rounded-full bg-brand" style={{ width: `${(r.rate / a.by_role[0].rate) * 100}%` }} />
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-data">{pct(r.rate)}</td>
                  <td className="px-6 py-3 text-right font-mono text-data text-muted">
                    {num(r.ph_jobs)} of {num(r.jobs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <ChartCard title="Working-hours fit" subtitle="PH time (UTC+8), 24 hours">
          <div className="flex flex-col gap-1">
            <span className="num text-kpi">{pct(a.day_shift.fit_pct)}</span>
            <span className="text-body-sm text-muted">
              of the {num(a.day_shift.jobs_with_timezone)} jobs that state a timezone allow one within 3 hours of PH time.
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {BANDS.map((b) => (
              <div key={b.name} className="flex flex-col gap-1">
                <span className="text-caption text-muted">{b.name}</span>
                <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, h) => (
                    <span key={h} className="h-4 rounded-[2px]" style={{ background: on(h, b) ? b.color : 'var(--bg-sunken)' }} />
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between font-mono text-data-sm text-muted">
              <span>12am</span>
              <span>6am</span>
              <span>12pm</span>
              <span>6pm</span>
              <span>12am</span>
            </div>
          </div>
          <p className="m-0 text-body-sm text-muted">
            US East business hours fall on the PH night shift. Look for "async" or "flexible hours" if you want a day schedule.
          </p>
        </ChartCard>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="flex flex-col gap-0.5 px-6 pb-4 pt-5">
          <h2 className="m-0 text-section-title">Latest jobs open to Filipino applicants</h2>
          <span className="text-caption text-subtle">Newest {a.jobs.length} · each links to the original posting on its job board</span>
        </div>
        <ul className="m-0 list-none p-0">
          {a.jobs.slice(0, 12).map((j) => (
            <li key={j.url} className="border-t border-line">
              <a
                href={j.url}
                target="_blank"
                rel="noreferrer"
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 text-ink no-underline hover:bg-sunken"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{j.title}</span>
                  <span className="truncate text-caption text-subtle">
                    {j.company} · {j.role} · {j.tier} · {dateLabel(j.posted)}
                    {j.pay_mid_php ? ` · ${peso(j.pay_mid_php)}/mo` : ''}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-caption text-muted">
                  {j.source}
                  <ExternalLink size={14} aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
