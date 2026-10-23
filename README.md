# RemoteReady PH

Remote job analytics for Filipino VAs and freelancers: which roles to target, which skills to learn next, and what the work pays.

## Repo layout

```
pipeline/   Python: fetch job APIs, clean, analyze, write JSON for the site
web/        React + Vite site (coming next)
data/raw/   Snapshot CSVs from the APIs (not committed if large)
```

## Step 1: pull a snapshot

Needs Python 3.11+.

```bash
cd pipeline
python -m venv .venv
# Windows: .venv\Scripts\activate    Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt

python pull.py --quick   # 1-minute test pull
python pull.py           # full pull, a few minutes
```

Output: `data/raw/snapshot_<date>.csv`, one row per job, plus a summary of rows per source, salary coverage and how many VA-like jobs came in.

## Step 2: clean and analyze

```bash
python analyze.py        # uses the newest data/raw/snapshot_*.csv, about 1 minute
```

Writes every file the website reads to `web/public/data/` (see `docs/data-contract.md` for their shapes) and the cleaned table to `data/clean/jobs_clean.csv`. It fetches today's exchange rates from open.er-api.com and falls back to approximate rates if offline.

Offline tests (no internet needed): `pip install pytest` then `python -m pytest -q`.

## Data sources and attribution

All four are free public APIs. Every job keeps its source and original link, and the site links back to it.

| Source | Endpoint | Rules we follow |
| --- | --- | --- |
| [Himalayas](https://himalayas.app) | `/jobs/api`, 20 per page, cursor paging | Credit Himalayas with a link; apply through `applicationLink`; data refreshes daily |
| [Jobicy](https://jobicy.com) | `/api/v2/remote-jobs`, up to 200 per call | Keep Jobicy as the source and its job URL; no polling more than hourly |
| [Remotive](https://remotive.com) | `/api/remote-jobs` | One call per run; link back to each job |
| [Arbeitnow](https://www.arbeitnow.com) | `/api/job-board-api`, paged | Remote jobs only |
