import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/data'
import { num, pct, peso } from '../lib/format'
import { BarList, ChartCard, KpiCard, PageState, SourceChip, TextButton } from '../components/ui'

// Tiers open to Filipino applicants get the brand teal; region-locked tiers stay grey.
const TIER_COLORS = {
  Worldwide: '#0f766e',
  'Open to PH/APAC': '#4fa89d',
  'US & Canada only': '#8b98a3',
  'Europe only': '#aab4bc',
  'Latin America only': '#c4ccd2',
  'Other regions': '#dbe1e5',
}

function ChartTooltip({ active, payload, format }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-body-sm shadow-pop">
      <div className="font-semibold">{p.role ?? p.tier}</div>
      <div className="font-mono text-data text-muted">{format(p)}</div>
    </div>
  )
}

function DataTable({ columns, rows }) {
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

export default function Overview() {
  const { data, loading, error } = useData('overview', 'salary', 'meta')
  const [rolesAsTable, setRolesAsTable] = useState(false)
  if (!data) return <PageState loading={loading} error={error} />

  const { overview: o, salary: s, meta } = data
  const k = o.kpis
  const ratio = s.ph_accessible.median && s.overall.median ? s.ph_accessible.median / s.overall.median : null
  const roles = o.roles.filter((r) => r.role !== 'Other')

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-3xl text-body text-muted">
        Only <strong className="font-semibold text-ink">{pct(k.ph_accessible_pct)}</strong> of the {num(k.jobs)} remote
        jobs we analyzed accept applicants in the Philippines
        {ratio && (
          <>
            , and those pay about <strong className="font-semibold text-ink">{Math.round(ratio * 100)}%</strong> of the
            market median
          </>
        )}
        . Here's where the openings are and what they ask for.
      </p>

      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
        <KpiCard label="Jobs analyzed" value={num(k.jobs)} caption={`From 4 job boards · ${num(meta.duplicates_removed)} duplicates removed`} />
        <KpiCard
          label="Open to PH applicants"
          value={pct(k.ph_accessible_pct)}
          valueClass="text-brand"
          caption={`${num(k.ph_accessible_count)} jobs · ${num(k.ph_based_count)} list the Philippines`}
        />
        <KpiCard label="Most common role" value={k.top_role} valueClass="!text-[28px]" caption={`${pct(k.top_role_share)} of all postings`} />
        <KpiCard
          label="Median monthly pay"
          value={peso(s.overall.median)}
          caption={`PH-accessible jobs: ${peso(s.ph_accessible.median)} (n=${num(s.ph_accessible.n)})`}
        />
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        <ChartCard
          className="lg:col-span-2"
          title="Jobs by role family"
          subtitle={`Number of postings · ${num(o.roles.find((r) => r.role === 'Other')?.count ?? 0)} in other fields (legal, health, education) not shown`}
          action={
            <TextButton onClick={() => setRolesAsTable((v) => !v)} pressed={rolesAsTable}>
              {rolesAsTable ? 'View as chart' : 'View as table'}
            </TextButton>
          }
        >
          {rolesAsTable ? (
            <DataTable
              columns={[
                { key: 'role', label: 'Role family' },
                { key: 'count', label: 'Jobs', right: true, format: num },
                { key: 'share', label: 'Share', right: true, format: pct },
              ]}
              rows={o.roles}
            />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roles} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 8 }} barCategoryGap={6}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="role"
                    width={150}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 13, fill: 'var(--ink)' }}
                  />
                  <Tooltip cursor={{ fill: 'var(--bg-sunken)' }} content={<ChartTooltip format={(p) => `${num(p.count)} jobs · ${pct(p.share)}`} />} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    <LabelList dataKey="count" position="right" formatter={num} style={{ fontSize: 12, fill: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Who the jobs are open to" subtitle="Location restriction on each posting">
          <div className="relative mx-auto h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={o.tiers}
                  dataKey="count"
                  nameKey="tier"
                  innerRadius={62}
                  outerRadius={92}
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--bg-surface)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {o.tiers.map((t) => (
                    <Cell key={t.tier} fill={TIER_COLORS[t.tier]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip format={(p) => `${num(p.count)} jobs · ${pct(p.share)}`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num text-[28px] font-semibold leading-8 text-brand">{pct(k.ph_accessible_pct)}</span>
              <span className="text-caption text-subtle">open to PH</span>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-body-sm">
            {o.tiers.map((t) => (
              <li key={t.tier} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: TIER_COLORS[t.tier] }} aria-hidden="true" />
                  {t.tier}
                </span>
                <span className="font-mono text-data">{pct(t.share)}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-6">
        <ChartCard
          title="Top 10 skills, all jobs"
          subtitle="Share of postings that mention the skill"
          action={<Link to="/skills" className="text-body-sm font-medium text-brand hover:text-brand-hover">Open Skills Explorer</Link>}
        >
          <BarList items={o.top_skills.map((x) => ({ label: x.skill, value: x.share, title: `${num(x.count)} jobs` }))} format={pct} labelWidth={150} />
        </ChartCard>
        <ChartCard
          title="Top 10 skills in PH-accessible jobs"
          subtitle={`Share of the ${num(k.ph_accessible_count)} jobs open to Filipino applicants`}
          action={<Link to="/recommender" className="text-body-sm font-medium text-brand hover:text-brand-hover">Check my skill gaps</Link>}
        >
          <BarList
            items={o.top_skills_ph.map((x) => ({ label: x.skill, value: x.share, title: `${num(x.count)} jobs` }))}
            format={pct}
            color="#0f766e"
            labelWidth={150}
          />
        </ChartCard>
      </section>

      <section aria-label="Data sources" className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-6 py-4">
        <span className="label mr-2">Data sources</span>
        {meta.sources.map((src) => (
          <SourceChip key={src.name} name={src.name} url={src.url} count={meta.jobs_by_source[src.name.toLowerCase()]} />
        ))}
        <span className="ml-auto text-caption text-subtle">Every posting links back to the board it came from.</span>
      </section>
    </div>
  )
}
