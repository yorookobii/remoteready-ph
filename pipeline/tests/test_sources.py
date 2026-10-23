"""Offline tests: feed each fetcher a sample payload shaped like the real API.

Run from the pipeline folder:  python -m pytest -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import common  # noqa: E402
from sources import arbeitnow, himalayas, jobicy, remotive  # noqa: E402

HIMALAYAS_PAGE_1 = {
    "totalCount": 2, "nextCursor": "abc", "jobs": [{
        "title": "Executive Assistant", "excerpt": "Support our CEO", "companyName": "Acme", "companySlug": "acme",
        "employmentType": "Full Time", "minSalary": 1500, "maxSalary": 2000, "salaryPeriod": "monthly",
        "seniority": ["Mid-level"], "currency": "USD", "locationRestrictions": [],
        "timezoneRestrictions": ["UTC+8"], "categories": ["Executive Assistant"], "parentCategories": ["Admin"],
        "description": "<p>Manage <b>calendars</b> &amp; email.</p>", "pubDate": 1792700000, "expiryDate": 1795300000,
        "applicationLink": "https://himalayas.app/companies/acme/jobs/ea", "guid": "hm-1"}]}
HIMALAYAS_PAGE_2 = {"jobs": [{
    "title": "Data Analyst", "companyName": "Beta", "employmentType": "Contractor", "minSalary": None, "maxSalary": None,
    "seniority": "Senior", "currency": None, "locationRestrictions": [{"alpha2": "US", "name": "United States", "slug": "us"}],
    "categories": ["Data"], "description": "SQL", "pubDate": 1792600000, "applicationLink": "https://himalayas.app/x", "guid": "hm-2"}]}

JOBICY = {"jobs": [{
    "id": 156454, "url": "https://jobicy.com/jobs/156454", "jobTitle": "Customer Support Specialist", "companyName": "GiveDirectly",
    "jobIndustry": ["Customer Success"], "jobType": ["Full-Time"], "jobGeo": "Anywhere", "jobLevel": "Any",
    "jobExcerpt": "Help users", "jobDescription": "<p>Zendesk</p>", "pubDate": "2026-10-22T18:57:18+00:00",
    "salaryMin": 30000, "salaryMax": 36000, "salaryCurrency": "USD", "salaryPeriod": "yearly"}]}

REMOTIVE = {"jobs": [{
    "id": 99, "url": "https://remotive.com/remote-jobs/x-99", "title": "Social Media Manager", "company_name": "Gamma",
    "category": "Marketing", "tags": ["canva", "social media"], "job_type": "full_time",
    "publication_date": "2026-10-21T10:00:00", "candidate_required_location": "Worldwide",
    "salary": "$1,200 - $1,800/month", "description": "<ul><li>Canva</li></ul>"}]}

ARBEITNOW = {"data": [
    {"slug": "a-1", "company_name": "Flix", "title": "Netzwerkingenieur", "description": "<p>x</p>", "remote": False,
     "url": "https://www.arbeitnow.com/jobs/a-1", "tags": [], "job_types": [], "location": "Berlin", "created_at": 1792701928},
    {"slug": "a-2", "company_name": "Delta", "title": "Remote Bookkeeper", "description": "<p>Xero</p>", "remote": True,
     "url": "https://www.arbeitnow.com/jobs/a-2", "tags": ["Finance"], "job_types": ["Part-time"], "location": "Remote", "created_at": 1792701928}],
    "links": {"next": None}}


def fake_get(responses):
    calls = []

    def _get(url, params=None, retries=4):
        calls.append((url, params or {}))
        return responses(url, params or {})

    return _get, calls


def test_himalayas_pages_with_cursor(monkeypatch):
    get, calls = fake_get(lambda url, p: HIMALAYAS_PAGE_2 if p.get("cursor") == "abc" else HIMALAYAS_PAGE_1)
    monkeypatch.setattr(himalayas, "get_json", get)
    monkeypatch.setattr(himalayas.time, "sleep", lambda s: None)
    rows = himalayas.fetch(max_pages=5)
    assert len(rows) == 2 and len(calls) == 2
    ea, da = rows
    assert ea["location_raw"] == "Worldwide" and ea["salary_period"] == "monthly" and ea["salary_min"] == 1500
    assert ea["description"] == "Manage calendars & email."
    assert ea["category_raw"] == "Admin|Executive Assistant" and ea["timezones_raw"] == "UTC+8"
    assert da["location_raw"] == "United States" and da["seniority_raw"] == "Senior" and da["salary_min"] is None
    assert list(ea) == common.COLUMNS


def test_jobicy_dedupes_across_industries(monkeypatch):
    def respond(url, p):
        if p.get("get") == "industries":
            return {"industries": [{"industrySlug": "supporting"}, {"industrySlug": "marketing"}]}
        return JOBICY
    get, calls = fake_get(respond)
    monkeypatch.setattr(jobicy, "get_json", get)
    monkeypatch.setattr(jobicy.time, "sleep", lambda s: None)
    rows = jobicy.fetch()
    assert len(rows) == 1  # same job returned by 3 calls
    r = rows[0]
    assert r["salary_min"] == 30000 and r["salary_period"] == "yearly" and r["location_raw"] == "Anywhere"
    assert r["posted_at"].startswith("2026-10-22T18:57:18")
    assert {c[1].get("industry") for c in calls} >= {"supporting", "marketing"}


def test_remotive_single_call(monkeypatch):
    get, calls = fake_get(lambda url, p: REMOTIVE)
    monkeypatch.setattr(remotive, "get_json", get)
    rows = remotive.fetch()
    assert len(calls) == 1
    assert rows[0]["salary_raw"] == "$1,200 - $1,800/month" and rows[0]["tags"] == "canva|social media"


def test_arbeitnow_keeps_remote_only(monkeypatch):
    get, calls = fake_get(lambda url, p: ARBEITNOW)
    monkeypatch.setattr(arbeitnow, "get_json", get)
    monkeypatch.setattr(arbeitnow.time, "sleep", lambda s: None)
    rows = arbeitnow.fetch(max_pages=3)
    assert [r["source_id"] for r in rows] == ["a-2"] and len(calls) == 1


def test_pull_writes_csv(monkeypatch, tmp_path):
    import pull
    monkeypatch.setattr(pull, "RAW_DIR", tmp_path / "data" / "raw")
    monkeypatch.setattr(pull, "ROOT", tmp_path)
    monkeypatch.setattr(pull.himalayas, "fetch", lambda max_pages=None: [himalayas.normalize(HIMALAYAS_PAGE_1["jobs"][0])])
    monkeypatch.setattr(pull.jobicy, "fetch", lambda per_industry=True: [jobicy.normalize(JOBICY["jobs"][0])])
    monkeypatch.setattr(pull.remotive, "fetch", lambda: (_ for _ in ()).throw(RuntimeError("down")))
    monkeypatch.setattr(pull.arbeitnow, "fetch", lambda max_pages=None: [arbeitnow.normalize(ARBEITNOW["data"][1])])
    monkeypatch.setattr(sys, "argv", ["pull.py"])
    assert pull.main() == 0
    files = list((tmp_path / "data" / "raw").glob("snapshot_*.csv"))
    assert len(files) == 1
    import pandas as pd
    df = pd.read_csv(files[0])
    assert len(df) == 3 and list(df.columns) == common.COLUMNS
