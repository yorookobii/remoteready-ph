"""Pull one snapshot from all 4 job APIs and save it as a CSV.

Run from the pipeline folder:
    python pull.py              # full pull (Himalayas up to 3,000 jobs; takes a few minutes)
    python pull.py --quick      # small test pull (about 1 minute)
    python pull.py --only himalayas jobicy

Output: ../data/raw/snapshot_<YYYY-MM-DD>.csv  (one row per job, unified columns)
"""
from __future__ import annotations

import argparse
import re
import sys
import time
from datetime import date
from pathlib import Path

import pandas as pd

from common import COLUMNS
from sources import arbeitnow, himalayas, jobicy, remotive

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"

# Rough "is this VA-ish work?" check, only for the summary printout.
VA_WORDS = re.compile(
    r"virtual assistant|executive assistant|admin|customer (?:support|service|success)|"
    r"support (?:specialist|agent|representative)|data entry|operations assistant|"
    r"social media|bookkeep|appointment setter|recruit(?:ing|ment) coordinator",
    re.I,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--quick", action="store_true", help="small pull for testing")
    parser.add_argument("--only", nargs="+", choices=["himalayas", "jobicy", "remotive", "arbeitnow"])
    args = parser.parse_args()

    plan = {
        "himalayas": lambda: himalayas.fetch(max_pages=5 if args.quick else None),
        "jobicy": lambda: jobicy.fetch(per_industry=not args.quick),
        "remotive": remotive.fetch,
        "arbeitnow": lambda: arbeitnow.fetch(max_pages=2 if args.quick else None),
    }
    if args.only:
        plan = {k: v for k, v in plan.items() if k in args.only}

    rows: list[dict] = []
    failed: list[str] = []
    for name, fetch in plan.items():
        print(f"\n[{name}] fetching...")
        started = time.time()
        try:
            got = fetch()
            rows.extend(got)
            print(f"[{name}] {len(got)} rows in {time.time() - started:.0f}s")
        except Exception as exc:  # one source failing must not stop the others
            failed.append(name)
            print(f"[{name}] FAILED: {exc}")

    if not rows:
        print("\nNo rows fetched. Check your internet connection and try --quick.")
        return 1

    df = pd.DataFrame(rows, columns=COLUMNS)
    before = len(df)
    df = df.drop_duplicates(subset=["source", "source_id"])

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    suffix = "_quick" if args.quick else ""
    out = RAW_DIR / f"snapshot_{date.today().isoformat()}{suffix}.csv"
    df.to_csv(out, index=False, encoding="utf-8")

    # A number must be present: Himalayas fills in a currency even when there's no amount.
    has_salary = (pd.to_numeric(df["salary_min"], errors="coerce") > 0) | df["salary_raw"].fillna("").str.contains(r"\d")
    has_salary &= df["source"].ne("himalayas") | (pd.to_numeric(df["salary_min"], errors="coerce") > 0)
    va_like = df["title"].str.contains(VA_WORDS, na=False)
    print("\n" + "=" * 52)
    print(f"Saved {len(df)} jobs to {out.relative_to(ROOT)}  ({before - len(df)} duplicates dropped)")
    print("\nRows per source:")
    print(df["source"].value_counts().to_string())
    print(f"\nWith a salary amount: {has_salary.mean():.0%}")
    print(f"VA / admin / support-like titles: {va_like.sum()} ({va_like.mean():.0%})")
    if failed:
        print(f"\nFailed sources: {', '.join(failed)} (the snapshot is still usable)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
