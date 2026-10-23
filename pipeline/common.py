"""Shared helpers: HTTP with retries, HTML stripping, the unified job record."""
from __future__ import annotations

import html
import re
import time
from datetime import datetime, timezone
from typing import Any

import requests

USER_AGENT = "RemoteReadyPH/0.1 (student analytics project; BSU)"
TIMEOUT = 30

# Every source is normalized into exactly these columns, in this order.
COLUMNS = [
    "source",
    "source_id",
    "url",
    "title",
    "company",
    "description",
    "category_raw",
    "tags",
    "job_type",
    "seniority_raw",
    "location_raw",
    "timezones_raw",
    "salary_raw",
    "salary_min",
    "salary_max",
    "salary_currency",
    "salary_period",
    "posted_at",
    "expires_at",
    "fetched_at",
]

_session = requests.Session()
_session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})


def get_json(url: str, params: dict | None = None, retries: int = 4) -> Any:
    """GET a JSON endpoint. Retries on 429/5xx and network errors with backoff."""
    delay = 2.0
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = _session.get(url, params=params, timeout=TIMEOUT)
            if resp.status_code == 429 or resp.status_code >= 500:
                wait = float(resp.headers.get("Retry-After", delay))
                print(f"  {resp.status_code} from {url}, waiting {wait:.0f}s (try {attempt}/{retries})")
                time.sleep(wait)
                delay *= 2
                continue
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            print(f"  error on {url}: {exc} (try {attempt}/{retries})")
            time.sleep(delay)
            delay *= 2
    raise RuntimeError(f"giving up on {url}: {last_error}")


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def strip_html(text: str | None) -> str:
    """HTML description to plain text (good enough for keyword matching)."""
    if not text:
        return ""
    text = re.sub(r"<(br|/p|/li|/h\d)\s*/?>", "\n", text, flags=re.I)
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    return _WS_RE.sub(" ", text).strip()


def join(values: Any, sep: str = "|") -> str:
    """Lists to a pipe-separated string so they survive CSV."""
    if values is None:
        return ""
    if isinstance(values, str):
        return values.strip()
    out = []
    for v in values:
        if isinstance(v, dict):
            v = v.get("name") or v.get("slug") or ""
        v = str(v).strip()
        if v:
            out.append(v)
    return sep.join(out)


def to_iso(value: Any) -> str:
    """Unix seconds, ISO strings, or None to an ISO-8601 UTC string ('' if unknown)."""
    if value in (None, ""):
        return ""
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
    except ValueError:
        return str(value)


def to_number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def record(**fields: Any) -> dict:
    """Build one unified row; unknown columns are rejected, missing ones are blank."""
    unknown = set(fields) - set(COLUMNS)
    if unknown:
        raise KeyError(f"unknown columns: {unknown}")
    row = {c: fields.get(c) for c in COLUMNS}
    for c in COLUMNS:
        if row[c] is None and c not in ("salary_min", "salary_max"):
            row[c] = ""
    row["fetched_at"] = row["fetched_at"] or now_iso()
    return row
