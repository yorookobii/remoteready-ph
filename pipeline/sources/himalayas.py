"""Himalayas public jobs API. Docs: https://himalayas.app/docs/remote-jobs-api

Browse feed, 20 jobs per page, paged with `cursor` / `nextCursor`.
Data refreshes once a day, so one pull a day is plenty.
Terms: credit Himalayas with a link, and use the job's applicationLink.
"""
from __future__ import annotations

import os
import time

from common import get_json, join, record, strip_html, to_iso, to_number

URL = "https://himalayas.app/jobs/api"
SOURCE = "himalayas"


def fetch(max_pages: int | None = None, pause: float = 1.2) -> list[dict]:
    max_pages = max_pages or int(os.getenv("HIMALAYAS_MAX_PAGES", "150"))  # 150 pages = 3,000 jobs
    rows: list[dict] = []
    cursor = None
    for page in range(1, max_pages + 1):
        params = {"limit": 20}
        if cursor:
            params["cursor"] = cursor
        data = get_json(URL, params)
        jobs = data.get("jobs") or []
        rows.extend(normalize(j) for j in jobs)
        if page == 1:
            print(f"  himalayas: {data.get('totalCount', '?')} jobs available, pulling up to {max_pages * 20}")
        cursor = data.get("nextCursor")
        if not jobs or not cursor:
            break
        time.sleep(pause)
    return rows


def normalize(j: dict) -> dict:
    seniority = j.get("seniority")
    locations = j.get("locationRestrictions") or []
    salary_bits = [str(j.get(k)) for k in ("minSalary", "maxSalary", "currency", "salaryPeriod") if j.get(k)]
    return record(
        source=SOURCE,
        source_id=j.get("guid") or j.get("applicationLink") or "",
        url=j.get("applicationLink") or "",
        title=(j.get("title") or "").strip(),
        company=j.get("companyName") or "",
        description=strip_html(j.get("description") or j.get("excerpt")),
        category_raw=join((j.get("parentCategories") or []) + (j.get("categories") or [])),
        tags=join(j.get("categories")),
        job_type=j.get("employmentType") or "",
        seniority_raw=join(seniority) if isinstance(seniority, list) else (seniority or ""),
        # Empty list means the job is open worldwide.
        location_raw=join(locations) if locations else "Worldwide",
        timezones_raw=join(j.get("timezoneRestrictions")),
        salary_raw=" ".join(salary_bits),
        salary_min=to_number(j.get("minSalary")),
        salary_max=to_number(j.get("maxSalary")),
        salary_currency=j.get("currency") or "",
        salary_period=j.get("salaryPeriod") or "",
        posted_at=to_iso(j.get("pubDate")),
        expires_at=to_iso(j.get("expiryDate")),
    )
