import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useData } from '../lib/data'
import { num, pct, peso } from '../lib/format'
import { FilterChips, Note, PageState } from '../components/ui'

export default function Skills() {
  const { data, loading, error } = useData('skills', 'rules')
  const [role, setRole] = useState('All roles')

  const view = useMemo(() => {
    if (!data) return null
    const rows = data.skills.by_role[role] ?? []
    const max = Math.max(...rows.map((r) => r.share), 1)
    const names = new Set(rows.map((r) => r.skill))
    const rules = data.rules.rules.filter((r) => role === 'All roles' || (names.has(r.a) && names.has(r.b))).slice(0, 8)
    return { rows, max, rules }
  }, [data, role])

  if (!data) return <PageState loading={loading} error={error} />
  const { rows, max, rules } = view

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body text-muted">
          Which skills employers ask for, how many of those jobs are open to Filipino applicants, and what they pay.
        </p>
        <FilterChips label="Role family" options={data.skills.roles} value={role} onChange={setRole} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-6">
        <section className="card overflow-hidden p-0 lg:col-span-2">
          <div className="flex flex-col gap-0.5 px-6 pb-4 pt-5">
            <h2 className="m-0 text-section-title">Skill demand ranking</h2>
            <span className="text-caption text-subtle">
              {role} · top {rows.length} skills by number of postings
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-body-sm">
              <thead>
                <tr className="border-y border-line bg-sunken">
                  <th className="label w-10 px-4 py-2.5 text-left font-medium">#</th>
                  <th className="label px-2 py-2.5 text-left font-medium">Skill</th>
                  <th className="label px-2 py-2.5 text-right font-medium">Jobs</th>
                  <th className="label w-40 px-2 py-2.5 text-left font-medium">Share</th>
                  <th className="label px-2 py-2.5 text-right font-medium">Open to PH</th>
                  <th className="label px-2 py-2.5 text-right font-medium">Median pay</th>
                  <th className="label px-4 py-2.5 text-left font-medium">Most common in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.skill} className="border-b border-line hover:bg-sunken">
                    <td className="px-4 py-3 font-mono text-data text-subtle">{i + 1}</td>
                    <td className="px-2 py-3 font-medium">{r.skill}</td>
                    <td className="px-2 py-3 text-right font-mono text-data">{num(r.jobs)}</td>
                    <td className="px-2 py-3">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 rounded-full bg-sunken">
                          <span className="block h-1.5 rounded-full bg-chart-1" style={{ width: `${(r.share / max) * 100}%` }} />
                        </span>
                        <span className="w-12 text-right font-mono text-data text-muted">{pct(r.share)}</span>
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-data">{num(r.ph_accessible_jobs)}</td>
                    <td className="px-2 py-3 text-right font-mono text-data" title={`${r.pay_n} postings with salary`}>
                      {r.median_pay ? peso(r.median_pay) : <span className="text-subtle">too few</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{r.top_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4">
            <Note>
              Trend badges (rising, declining) appear once there are two snapshots a week apart. Median pay is the
              global remote market rate per month, shown only when at least 5 postings list a salary.
            </Note>
          </div>
        </section>

        <aside className="card flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-section-title">Often required together</h2>
            <span className="text-caption text-subtle">Association rules mined from each posting's skill list</span>
          </div>
          {rules.length === 0 && <span className="text-body-sm text-muted">No strong pairs in this role family.</span>}
          {rules.map((r) => (
            <div key={`${r.a}-${r.b}`} className="flex flex-col gap-2.5 rounded-md border border-line p-4">
              <div className="flex flex-wrap items-center gap-1.5 text-body-sm font-medium">
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-brand-ink">{r.a}</span>
                <ArrowRight size={16} className="text-subtle" aria-label="also requires" />
                <span className="rounded-full border border-line px-2.5 py-0.5">{r.b}</span>
              </div>
              <p className="m-0 text-body-sm text-muted">
                Jobs asking for {r.a} also ask for {r.b} {pct(r.confidence, 0)} of the time ({num(r.jobs_together)} jobs).
              </p>
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 flex-1 rounded-full bg-sunken">
                  <span className="block h-1.5 rounded-full bg-brand" style={{ width: `${r.confidence}%` }} />
                </span>
                <span className="font-mono text-caption text-muted">lift {r.lift.toFixed(1)}</span>
              </div>
            </div>
          ))}
          <p className="m-0 text-caption text-subtle">
            Lift above 1 means the two skills appear together more often than chance. Minimum support{' '}
            {pct(data.rules.min_support * 100, 0)}, minimum confidence {pct(data.rules.min_confidence * 100, 0)}.
          </p>
        </aside>
      </div>
    </div>
  )
}
