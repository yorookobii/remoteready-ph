"""Jobicy public API. Docs: https://github.com/Jobicy/remote-jobs-api

GET /api/v2/remote-jobs returns up to 200 of the latest jobs (count=1..200).
There is no paging, so we also pull once per industry to reach more jobs.
Terms: keep Jobicy as the source, link to the job URL, don't poll more than hourly.
"""
from __future__ import annotations

import time

from common import get_json, join, record, strip_html, to_iso, to_number

URL = "https://jobicy.com/api/v2/remote-jobs"
SOURCE = "jobicy"


def _industry_slugs() -> list[str]:
    """Ask the API for its industry list; tolerate a few response shapes."""
    try:
        data = get_json(URL, {"get": "industries"})
    except RuntimeError as exc:
        print(f"  jobicy: could not list industries ({exc})")
        return []
    items = data.get("industries") if isinstance(data, dict) else data
    if isinstance(items, dict):
        items = list(items.keys()) + [v for v in items.values() if isinstance(v, str)]
    slugs = []
    for it in items or []:
        if isinstance(it, str):
            slugs.append(it)
        elif isinstance(it, dict):
            s = it.get("industrySlug") or it.get("slug") or it.get("id")
            if s:
                slugs.append(str(s))
    return sorted(set(slugs))


def fetch(per_industry: bool = True, pause: float = 2.0) -> list[dict]:
    seen: dict[str, dict] = {}

    def pull(params: dict) -> int:
        data = get_json(URL, {"count": 200, **params})
        jobs = data.get("jobs") or []
        for j in jobs:
            seen[str(j.get("id"))] = j
        return len(jobs)

    print(f"  jobicy: latest -> {pull({})} jobs")
    if per_industry:
        for slug in _industry_slugs():
            time.sleep(pause)
            try:
                n = pull({"industry": slug})
                print(f"  jobicy: {slug} -> {n} jobs")
            except RuntimeError as exc:
                print(f"  jobicy: {slug} failed ({exc})")
    return [normalize(j) for j in seen.values()]


def normalize(j: dict) -> dict:
    smin = j.get("salaryMin", j.get("annualSalaryMin"))
    smax = j.get("salaryMax", j.get("annualSalaryMax"))
    currency = j.get("salaryCurrency") or ""
    period = j.get("salaryPeriod") or ("yearly" if "annualSalaryMin" in j else "")
    salary_bits = [str(x) for x in (smin, smax, currency, period) if x]
    return record(
        source=SOURCE,
        source_id=str(j.get("id") or ""),
        url=j.get("url") or "",
        title=(j.get("jobTitle") or "").strip(),
        company=j.get("companyName") or "",
        description=strip_html(j.get("jobDescription") or j.get("jobExcerpt")),
        category_raw=join(j.get("jobIndustry")),
        tags=join(j.get("jobIndustry")),
        job_type=join(j.get("jobType")),
        seniority_raw=j.get("jobLevel") or "",
        location_raw=j.get("jobGeo") or "",
        salary_raw=" ".join(salary_bits),
        salary_min=to_number(smin),
        salary_max=to_number(smax),
        salary_currency=currency,
        salary_period=period,
        posted_at=to_iso(j.get("pubDate")),
    )
