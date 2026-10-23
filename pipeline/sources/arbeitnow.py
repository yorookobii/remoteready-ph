"""Arbeitnow public job board API: GET https://www.arbeitnow.com/api/job-board-api?page=N

Paged (Laravel style: `data`, `links.next`). Mostly European, many on-site jobs,
so we keep only rows where `remote` is true.
"""
from __future__ import annotations

import os
import time

from common import get_json, join, record, strip_html, to_iso

URL = "https://www.arbeitnow.com/api/job-board-api"
SOURCE = "arbeitnow"


def fetch(max_pages: int | None = None, pause: float = 1.5) -> list[dict]:
    max_pages = max_pages or int(os.getenv("ARBEITNOW_MAX_PAGES", "15"))
    rows: list[dict] = []
    total = 0
    for page in range(1, max_pages + 1):
        data = get_json(URL, {"page": page})
        jobs = data.get("data") or []
        total += len(jobs)
        rows.extend(normalize(j) for j in jobs if j.get("remote"))
        next_link = (data.get("links") or {}).get("next")
        if not jobs or (isinstance(data.get("links"), dict) and not next_link):
            break
        time.sleep(pause)
    print(f"  arbeitnow: {total} jobs seen, {len(rows)} remote kept")
    return rows


def normalize(j: dict) -> dict:
    return record(
        source=SOURCE,
        source_id=j.get("slug") or "",
        url=j.get("url") or "",
        title=(j.get("title") or "").strip(),
        company=j.get("company_name") or "",
        description=strip_html(j.get("description")),
        tags=join(j.get("tags")),
        job_type=join(j.get("job_types")),
        location_raw=j.get("location") or "",
        posted_at=to_iso(j.get("created_at")),
    )
