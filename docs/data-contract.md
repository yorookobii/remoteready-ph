# Data contract: what the website reads

`pipeline/analyze.py` writes these files to `web/public/data/`. The React app fetches them with `fetch('/data/<name>.json')`. Never edit them by hand; rerun `python analyze.py`.

Conventions:
- Money is **monthly PHP**, rounded to the nearest 100. `null` means not enough data.
- Shares (`share`, `rate`, `*_pct`) are **percentages 0 to 100**, one decimal.
- `low_sample: true` means fewer than 20 postings: show the Low sample badge.
- `trend` is `null` and `trend_available` is `false` until there are 2+ snapshots a week apart. Hide trend badges when it's false.
- `pay_uplift` can be negative (the skill is common in lower-paid roles). Show it only when it's positive.

The shapes below show the first item of each list.

## meta.json

```
snapshot_file: "snapshot_2026-10-23.csv"
snapshot_date: "2026-10-23"
generated_at: "2026-10-23T04:38:23.682665+00:00"
raw_rows: 4475
raw_by_source:
  himalayas: 3000
  jobicy: 1112
  arbeitnow: 353
  remotive: 10
jobs: 4207
jobs_by_source:
  himalayas: 2812
  jobicy: 1060
  arbeitnow: 325
  remotive: 10
duplicates_removed: 268
salary_coverage_pct: 42.0
skills_coverage_pct: 79.7
usd_to_php: 58.0
rate_source: "approximate fallback rates (offline)"
posted_from: "2026-09-21T04:55:11+00:00"
posted_to: "2026-10-23T02:31:11+00:00"
trend_available: false
role_families:
  ["Data & AI", "Customer Support", "Engineering", "Admin & Operations", "Sales", 
tiers:
  ["Worldwide", "Open to PH/APAC", "US & Canada only", "Europe only", "Latin Ameri
sources:
  [ 4 items, each: ]
    name: "Himalayas"
    url: "https://himalayas.app"
```

## overview.json

```
kpis:
  jobs: 4207
  ph_accessible_pct: 7.7
  ph_accessible_count: 325
  ph_based_count: 109
  top_role: "Engineering"
  top_role_share: 28.1
  median_monthly_php: 592100
  salary_n: 1767
roles:
  [ 9 items, each: ]
    role: "Engineering"
    count: 1184
    share: 28.1
tiers:
  [ 6 items, each: ]
    tier: "Worldwide"
    count: 205
    share: 4.9
    ph_accessible: true
top_skills:
  [ 10 items, each: ]
    skill: "CRM"
    count: 532
    share: 12.6
top_skills_ph:
  [ 10 items, each: ]
    skill: "Python"
    count: 49
    share: 15.1
job_types:
  [ 4 items, each: ]
    type: "Full-time"
    count: 3665
    share: 87.1
seniority:
  [ 4 items, each: ]
    level: "Entry"
    count: 341
    share: 8.1
```

## skills.json

```
roles:
  ["All roles", "Data & AI", "Customer Support", "Engineering", "Admin & Operation
by_role:
  <10 keys like "All roles">:
    [ 30 items, each: ]
      skill: "CRM"
      jobs: 532
      share: 12.6
      median_pay: 502700
      pay_n: 226
      top_role: "Sales"
      ph_accessible_jobs: 47
      trend: null
trend_available: false
```

## rules.json

```
min_support: 0.01
min_confidence: 0.4
jobs: 4207
rules:
  [ 40 items, each: ]
    a: "Tableau"
    b: "Power BI"
    support: 1.1
    confidence: 54.5
    lift: 22.72
    jobs_together: 48
```

## salary.json

```
overall:
  n: 1767
  p10: 208800
  p25: 362500
  median: 592100
  p75: 821600
  p90: 1048900
  low_sample: false
ph_accessible:
  n: 54
  p10: 51400
  p25: 66400
  median: 136100
  p75: 578600
  p90: 1299200
  low_sample: false
not_ph_accessible:
  n: 1713
  p10: 232000
  p25: 371200
  median: 603200
  p75: 821700
  p90: 1045000
  low_sample: false
by_role:
  [ 9 items, each: ]
    role: "Engineering"
    n: 448
    p10: 259000
    p25: 461100
    median: 664600
    p75: 857900
    p90: 1090800
    low_sample: false
by_seniority:
  [ 4 items, each: ]
    seniority: "Entry"
    n: 151
    p10: 107300
    p25: 174000
    median: 278000
    p75: 442600
    p90: 770900
    low_sample: false
by_job_type:
  [ 4 items, each: ]
    type: "Contract"
    n: 108
    p10: 74200
    p25: 134200
    median: 277000
    p75: 649600
    p90: 1085300
    low_sample: false
table:
  [ 35 items, each: ]
    role: "Admin & Operations"
    seniority: "Entry"
    n: 23
    median: 242000
    p25: 194800
    p75: 430400
    low_sample: false
coverage_pct: 42.0
```

## access.json

```
overall:
  rate: 7.7
  count: 325
  total: 4207
  ph_based: 109
tiers:
  [ 6 items, each: ]
    tier: "Worldwide"
    count: 205
    share: 4.9
by_role:
  [ 9 items, each: ]
    role: "Design & Creative"
    jobs: 88
    ph_jobs: 15
    rate: 17.0
    tiers:
      Worldwide: 12.5
      Open to PH/APAC: 4.5
      US & Canada only: 42.0
      Europe only: 23.9
      Latin America only: 8.0
      Other regions: 9.1
day_shift:
  jobs_with_timezone: 2812
  fit_pct: 10.6
  fit_count: 299
jobs:
  [ 30 items, each: ]
    title: "Cyber Security Consultant (UK) - Dionach by Nomios"
    company: "Nomios"
    role: "Engineering"
    tier: "Worldwide"
    source: "arbeitnow"
    url: "https://www.arbeitnow.co.uk/jobs/companies/nomios/remote-cy
    posted: "2026-10-23T02:31:11+00:00"
    pay_mid_php: null
```

## model.json

```
algorithm: "RandomForestRegressor (400 trees, min_samples_leaf=3), targ
n_train: 1413
n_test: 354
n_features: 64
metrics:
  mae: 209300
  rmse: 313300
  r2: 0.3
  median_ape_pct: 27.7
baseline:
  name: "median pay of the same role and seniority"
  mae: 224800
  r2: 0.268
beats_baseline: true
importances:
  [ 15 items, each: ]
    feature: "tier: US & Canada only"
    importance: 0.1537
```

## recommender.json

```
roles:
  <8 keys like "Admin & Operations">:
    jobs: 475
    ph_jobs: 35
    skills:
      [ 15 items, each: ]
        skill: "Project Management"
        jobs: 112
        share: 23.6
        ph_jobs: 6
        pay_uplift: -77400
        median_pay_with: 514600
        pay_n: 47
    pay:
      Entry:
        p25: 194800
        median: 242000
        p75: 430400
        n: 23
        level_specific: true
      Mid:
        p25: 179100
        median: 258100
        p75: 327900
        n: 44
        level_specific: true
      Senior:
        p25: 507600
        median: 627000
        p75: 821600
        n: 102
        level_specific: true
      Lead:
        p25: 622300
        median: 823300
        p75: 973800
        n: 48
        level_specific: true
all_skills:
  ["AWS", "Account Management", "Accounts Payable", "After Effects", "Amazon Selle
```
