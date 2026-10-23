"""Remotive public API: GET https://remotive.com/api/remote-jobs

One call returns every listed job. Remotive asks for only a few calls a day
and a link back to each job, so this makes exactly ONE request.
Salary is free text ("$50k - $70k"); the cleaning step parses it.
"""
from __future__ import annotations

from common import get_json, join, record, strip_html, to_iso

URL = "https://remotive.com/api/remote-jobs"
SOURCE = "remotive"


def fetch() -> list[dict]:
    data = get_json(URL)
    jobs = data.get("jobs") or []
    print(f"  remotive: {len(jobs)} jobs")
    return [normalize(j) for j in jobs]


def normalize(j: dict) -> dict:
    return record(
        source=SOURCE,
        source_id=str(j.get("id") or ""),
        url=j.get("url") or "",
        title=(j.get("title") or "").strip(),
        company=j.get("company_name") or "",
        description=strip_html(j.get("description")),
        category_raw=j.get("category") or "",
        tags=join(j.get("tags")),
        job_type=j.get("job_type") or "",
        location_raw=j.get("candidate_required_location") or "",
        salary_raw=(j.get("salary") or "").strip(),
        posted_at=to_iso(j.get("publication_date")),
    )
