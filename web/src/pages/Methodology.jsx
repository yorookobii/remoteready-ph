import { ArrowRight } from 'lucide-react'
import { useData } from '../lib/data'
import { dateLabel, num, pct, peso } from '../lib/format'
import { PageState } from '../components/ui'

const SOURCE_NOTES = {
  Himalayas: 'Largest feed: seniority, salary with currency, allowed countries and timezones. Newest 3,000 jobs pulled.',
  Jobicy: 'Industry, region restriction, seniority and min/max salary. Latest jobs plus one pull per industry.',
  Remotive: 'Category, tags and required location; salary as free text. One call per run, as Remotive asks.',
  Arbeitnow: 'Tags, job type and a remote flag. Mostly European; only remote jobs kept.',
}

const STEPS = [
  ['Fetch', 'Pull jobs from 4 public APIs'],
  ['Clean', 'Salary, roles, skills, locations'],
  ['Deduplicate', 'Merge jobs posted on several boards'],
  ['Analyze', 'Stats, rules, salary model'],
  ['Dashboard', 'JSON files this site reads'],
]

function Metric({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-sunken p-3">
      <span className="label">{label}</span>
      <span className="font-mono text-[18px] leading-[26px]">{value}</span>
    </div>
  )
}

export default function Methodology() {
  const { data, loading, error } = useData('meta', 'model', 'rules')
  if (!data) return <PageState loading={loading} error={error} />
  const { meta, model, rules } = data

  return (
    <article className="flex max-w-[760px] flex-col gap-12">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[20px] leading-[30px]">
          RemoteReady PH takes one snapshot of four public job APIs, cleans it into one table, and turns it into the numbers
          on this site. This page explains how, and where the numbers fall short.
        </p>
        <nav aria-label="On this page" className="flex flex-wrap gap-4 text-[14px]">
          {['sources', 'pipeline', 'cleaning', 'models', 'limits'].map((id) => (
            <a key={id} href={`#${id}`} className="text-brand hover:text-brand-hover">
              {{ sources: 'Data sources', pipeline: 'Pipeline', cleaning: 'Cleaning', models: 'Models', limits: 'Limitations' }[id]}
            </a>
          ))}
        </nav>
      </div>

      <section id="sources" className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-semibold leading-[30px]">Data sources</h2>
        <p className="m-0 text-body text-muted">
          Snapshot of {dateLabel(meta.snapshot_date)}: {num(meta.raw_rows)} postings pulled, {num(meta.duplicates_removed)}{' '}
          duplicates removed, {num(meta.jobs)} jobs analyzed. Postings are dated {dateLabel(meta.posted_from)} to{' '}
          {dateLabel(meta.posted_to)}.
        </p>
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="bg-sunken">
                <th className="label px-5 py-2.5 text-left font-medium">Source</th>
                <th className="label px-2 py-2.5 text-left font-medium">What it gives us</th>
                <th className="label px-5 py-2.5 text-right font-medium">Jobs</th>
              </tr>
            </thead>
            <tbody>
              {meta.sources.map((s) => (
                <tr key={s.name} className="border-t border-line align-top">
                  <td className="px-5 py-3.5">
                    <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:text-brand-hover">
                      {s.name}
                    </a>
                  </td>
                  <td className="px-2 py-3.5 text-muted">{SOURCE_NOTES[s.name]}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-data">{num(meta.jobs_by_source[s.name.toLowerCase()] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="pipeline" className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-semibold leading-[30px]">Data pipeline</h2>
        <p className="m-0 text-body text-muted">Python scripts run each step; the website only reads their output.</p>
        <ol className="m-0 flex list-none flex-wrap items-stretch gap-2 p-0">
          {STEPS.map(([name, what], i) => (
            <li key={name} className="flex items-center gap-2">
              <div
                className={`flex w-[118px] flex-col gap-1 rounded-md border p-3.5 ${
                  i === STEPS.length - 1 ? 'border-[#b9e0db] bg-brand-soft text-brand-ink' : 'border-line bg-surface'
                }`}
              >
                <span className="font-mono text-caption opacity-70">0{i + 1}</span>
                <span className="font-semibold">{name}</span>
                <span className="text-caption opacity-80">{what}</span>
              </div>
              {i < STEPS.length - 1 && <ArrowRight size={18} className="text-subtle" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      <section id="cleaning" className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-semibold leading-[30px]">Cleaning steps</h2>
        <ol className="m-0 flex list-decimal flex-col gap-3 pl-6 text-body text-muted marker:text-subtle">
          <li>
            <strong className="font-semibold text-ink">Salary.</strong> Numeric fields first, free text ("$170k - $200k") as a
            fallback. Converted at ₱{meta.usd_to_php} per US dollar ({meta.rate_source}) and normalized to monthly: hourly × 160,
            annual ÷ 12. Values outside $200 to $60,000 a month are dropped as errors. {pct(meta.salary_coverage_pct)} of jobs
            end up with a salary.
          </li>
          <li>
            <strong className="font-semibold text-ink">Role families.</strong> Job titles are matched against keyword rules into{' '}
            {meta.role_families.length - 1} families plus Other, with the source's category as a fallback.
          </li>
          <li>
            <strong className="font-semibold text-ink">Skills.</strong> Titles, tags and descriptions are matched against a
            curated list of about 90 skills with synonyms. Patterns avoid hiring boilerplate (a "recruiter interview" step is not a
            recruiting skill). {pct(meta.skills_coverage_pct)} of jobs mention at least one.
          </li>
          <li>
            <strong className="font-semibold text-ink">Location tiers.</strong> Worldwide, Open to PH/APAC, US & Canada, Europe,
            Latin America or Other. The first two count as open to Filipino applicants. A bare "Remote" on Arbeitnow, a
            European board, counts as Europe only, and a country list counts as worldwide only if it covers 100+ countries.
          </li>
          <li>
            <strong className="font-semibold text-ink">Deduplication.</strong> Same company and a title at least 92% similar
            (fuzzy match) count as one job; the richest source is kept.
          </li>
        </ol>
      </section>

      <section id="models" className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-semibold leading-[30px]">Models used</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          <div className="card flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="label">Salary estimate</span>
              <span className="text-[18px] font-semibold leading-[26px]">Random Forest regression</span>
            </div>
            <p className="m-0 text-[14px] leading-[22px] text-muted">
              Predicts monthly pay from role family, seniority, job type, location tier and {model.n_features} features in
              total. Trained on {num(model.n_train)} postings, tested on {num(model.n_test)}.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="MAE" value={peso(model.metrics.mae)} />
              <Metric label="R²" value={model.metrics.r2.toFixed(2)} />
            </div>
            <p className="m-0 text-caption text-subtle">
              Baseline (median of the same role and level): MAE {peso(model.baseline.mae)}, R² {model.baseline.r2.toFixed(2)}.
              The model {model.beats_baseline ? 'beats' : 'does not beat'} it, modestly. Location tier matters most. Treat it as
              exploratory.
            </p>
          </div>
          <div className="card flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="label">Skills required together</span>
              <span className="text-[18px] font-semibold leading-[26px]">Apriori association rules</span>
            </div>
            <p className="m-0 text-[14px] leading-[22px] text-muted">
              Finds skill pairs that appear in the same postings more often than chance. Feeds "Often required together" and
              the recommender's reasons.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Min support" value={pct(rules.min_support * 100, 0)} />
              <Metric label="Min confidence" value={pct(rules.min_confidence * 100, 0)} />
            </div>
            <p className="m-0 text-caption text-subtle">
              {rules.rules.length} rules kept with lift above 1.2, one direction per skill pair.
            </p>
          </div>
        </div>
      </section>

      <section id="limits" className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-semibold leading-[30px]">Limitations</h2>
        <ul className="m-0 flex list-disc flex-col gap-2.5 pl-6 text-body text-muted marker:text-subtle">
          <li>One snapshot, mostly from the last week. Trends need a second snapshot at least a week later.</li>
          <li>Postings show demand, not hiring: we can't see who got hired, at what rate, or how many people applied.</li>
          <li>
            The boards lean toward US and European employers. PH-focused job sites (with local rates) have no public API, so
            they're not included.
          </li>
          <li>Only {pct(meta.salary_coverage_pct, 0)} of postings list a salary, and few of those are open to PH applicants.</li>
          <li>Role, skill and location rules are keyword-based and will misclassify some postings.</li>
        </ul>
      </section>
    </article>
  )
}
