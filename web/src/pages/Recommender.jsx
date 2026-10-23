import { useMemo, useState } from 'react'
import { ArrowRight, Target, X } from 'lucide-react'
import { useData } from '../lib/data'
import { num, pct, peso } from '../lib/format'
import { PageState } from '../components/ui'

const LEVELS = ['Entry', 'Mid', 'Senior', 'Lead']
const STARTER = ['Excel', 'Google Workspace', 'Customer Service', 'Canva', 'Data Entry']

/** Score every role by how much of its demand the user's skills cover (skills weighted by share). */
export function analyze(skills, level, rec, rules) {
  const have = new Set(skills)
  const scored = Object.entries(rec.roles).map(([role, r]) => {
    const total = r.skills.reduce((s, x) => s + x.share, 0) || 1
    const covered = r.skills.filter((x) => have.has(x.skill)).reduce((s, x) => s + x.share, 0)
    return { role, r, match: Math.round((covered / total) * 100), hits: r.skills.filter((x) => have.has(x.skill)).length }
  })
  scored.sort((a, b) => b.match - a.match || b.r.jobs - a.r.jobs)
  const best = scored[0]
  const runnerUp = scored[1]

  const learn = best.r.skills
    .filter((x) => !have.has(x.skill))
    .sort((a, b) => b.jobs - a.jobs || (b.pay_uplift ?? 0) - (a.pay_uplift ?? 0))
    .slice(0, 3)
    .map((x) => {
      const rule = rules
        .filter((rl) => rl.b === x.skill && have.has(rl.a))
        .sort((p, q) => q.confidence - p.confidence)[0]
      const why = rule
        ? `Jobs asking for ${rule.a} also ask for ${x.skill} ${Math.round(rule.confidence)}% of the time.`
        : `Asked for in ${pct(x.share, 0)} of ${best.role} postings.`
      return { ...x, why }
    })

  return { best, runnerUp, learn, pay: best.r.pay[level] }
}

export default function Recommender() {
  const { data, loading, error } = useData('recommender', 'rules', 'salary')
  const [skills, setSkills] = useState(STARTER)
  const [draft, setDraft] = useState('')
  const [level, setLevel] = useState('Entry')
  const [result, setResult] = useState(null)

  const quick = useMemo(() => {
    if (!data) return []
    const all = Object.values(data.recommender.roles).flatMap((r) => r.skills)
    const byJobs = new Map()
    all.forEach((x) => byJobs.set(x.skill, (byJobs.get(x.skill) ?? 0) + x.jobs))
    return [...byJobs.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s).filter((s) => !skills.includes(s)).slice(0, 6)
  }, [data, skills])

  if (!data) return <PageState loading={loading} error={error} />
  const known = data.recommender.all_skills

  const add = (name) => {
    const match = known.find((k) => k.toLowerCase() === name.trim().toLowerCase())
    if (match && !skills.includes(match)) setSkills([...skills, match])
    setDraft('')
  }
  const run = () => setResult(analyze(skills, level, data.recommender, data.rules.rules))
  const phMedian = data.salary.ph_accessible.median

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-6">
      <section className="card flex flex-col gap-5" aria-labelledby="step1">
        <div className="flex flex-col gap-1">
          <span className="label">Step 1</span>
          <h2 id="step1" className="m-0 text-[18px] font-semibold leading-[26px]">
            What skills do you have?
          </h2>
          <span className="text-body-sm text-muted">Add the tools and skills you could use at work tomorrow.</span>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="skill-input" className="label">
            Your skills
          </label>
          <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-md border border-line-strong bg-surface p-2">
            {skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-body-sm font-medium text-brand-ink">
                {s}
                <button
                  type="button"
                  aria-label={`Remove ${s}`}
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#c9e8e3]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              id="skill-input"
              list="skill-options"
              value={draft}
              onChange={(e) => {
                const v = e.target.value
                if (v.endsWith(',')) add(v.slice(0, -1))
                else setDraft(v)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add(draft)
                }
              }}
              placeholder="Type a skill, press Enter"
              className="h-8 min-w-[140px] flex-1 border-0 bg-transparent px-1 text-[14px] outline-none"
            />
            <datalist id="skill-options">
              {known.filter((k) => !skills.includes(k)).map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>
          <span className="text-caption text-subtle">Pick from the suggestions; we match against {known.length} tracked skills.</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="label">Popular to add</span>
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => add(q)}
                className="rounded-full border border-dashed border-line-strong bg-surface px-3 py-1 text-body-sm font-medium text-muted hover:bg-sunken"
              >
                + {q}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="label">Experience level</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="h-11 rounded-md border border-line-strong bg-surface px-3 text-[14px]"
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={run}
          disabled={skills.length < 3}
          className="h-11 rounded-md bg-brand text-[14px] font-semibold text-brand-on hover:bg-brand-hover disabled:opacity-40"
        >
          Analyze my skills
        </button>
        {skills.length < 3 && <span className="-mt-3 text-caption text-subtle">Add at least 3 skills.</span>}
      </section>

      <section aria-live="polite" className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        {!result ? (
          <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 rounded-lg bg-sunken p-12 text-center">
            <Target size={40} strokeWidth={1.5} className="text-subtle" aria-hidden="true" />
            <span className="text-[18px] font-semibold">Your results will show here</span>
            <span className="max-w-[400px] text-[14px] leading-[22px] text-muted">
              Add at least 3 skills and click Analyze. You'll get your best-fit role, the skills worth learning next, and a
              pay range.
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
              <div className="card flex flex-col gap-3">
                <span className="label">Best-fit role</span>
                <span className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">{result.best.role}</span>
                <div className="flex items-center gap-3">
                  <span className="h-2 flex-1 rounded bg-sunken">
                    <span className="block h-2 rounded bg-brand" style={{ width: `${result.best.match}%` }} />
                  </span>
                  <span className="font-mono text-[14px] font-medium">{result.best.match}% match</span>
                </div>
                <span className="text-body-sm text-muted">
                  You have {result.best.hits} of the {result.best.r.skills.length} skills most asked for in{' '}
                  {num(result.best.r.jobs)} {result.best.role} postings. Runner-up: {result.runnerUp.role} ({result.runnerUp.match}%).
                </span>
              </div>
              <div className="card flex flex-col gap-3">
                <span className="label">Typical monthly pay, {level.toLowerCase()} level</span>
                <span className="num text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">
                  {peso(result.pay.p25)} – {peso(result.pay.p75)}
                </span>
                <span className="text-body-sm text-muted">
                  Middle half of {result.best.role} postings
                  {result.pay.level_specific ? ` at this level (n=${result.pay.n})` : ` (all levels, n=${result.pay.n}; too few at this level)`}.
                  These are global rates; jobs open to PH pay a median of {peso(phMedian)}.
                </span>
              </div>
            </div>

            <div className="card flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="m-0 text-[18px] font-semibold leading-[26px]">Top 3 skills to learn next</h2>
                <span className="text-caption text-subtle">Ranked by how many {result.best.role} jobs ask for them</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                {result.learn.map((x, i) => (
                  <div
                    key={x.skill}
                    className={`flex flex-col gap-3 rounded-md border p-5 ${i === 0 ? 'border-[#f5d9a0] bg-accent-soft' : 'border-line bg-surface'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-caption text-subtle">0{i + 1}</span>
                      {i === 0 && (
                        <span className="rounded-sm bg-accent px-2 py-0.5 text-caption font-semibold text-accent-on">Best next step</span>
                      )}
                    </div>
                    <span className="text-[20px] font-semibold leading-7">{x.skill}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="font-mono text-[16px] font-medium leading-6">{num(x.jobs)}</span>
                        <span className="text-caption text-subtle">jobs ask for it</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[16px] font-medium leading-6 text-brand-ink">{num(x.ph_jobs)}</span>
                        <span className="text-caption text-subtle">open to PH</span>
                      </div>
                    </div>
                    {x.pay_uplift > 0 && (
                      <span className="text-body-sm text-accent-ink">Those jobs pay {peso(x.pay_uplift)}/mo more at the median</span>
                    )}
                    <p className="m-0 flex gap-1.5 text-body-sm text-muted">
                      <ArrowRight size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {x.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="m-0 max-w-[620px] text-caption text-subtle">
                Estimates come from public remote job postings and are not guarantees of pay or hiring. A pay difference
                compares postings that ask for a skill with those that don't, in the same role family; it isn't proof the
                skill causes higher pay.
              </p>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="h-10 rounded-md border border-line-strong bg-surface px-5 text-[14px] font-semibold hover:bg-sunken"
              >
                Start over
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
