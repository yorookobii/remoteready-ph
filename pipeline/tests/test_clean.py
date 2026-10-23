"""Unit tests for the cleaning rules (no internet, no snapshot needed)."""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import clean as C  # noqa: E402
import skills  # noqa: E402

RATES, PHP = C.FALLBACK_TO_USD, C.FALLBACK_USD_TO_PHP


def test_salary_text():
    assert C.parse_salary_text("$170k - $200k") == (170000, 200000, "USD", "annual")
    assert C.parse_salary_text("$50-$75 /hour") == (50, 75, "USD", "hourly")
    assert C.parse_salary_text("$1,200 - $1,800/month") == (1200, 1800, "USD", "monthly")
    assert C.parse_salary_text("$1000 per task") == (None, None, "", "")
    assert C.parse_salary_text("") == (None, None, "", "")


def test_monthly_php():
    assert C.to_monthly_php(120000, "USD", "annual", RATES, PHP) == 580000.0
    assert C.to_monthly_php(10, "USD", "hourly", RATES, PHP) == 92800.0
    assert C.to_monthly_php(5, "USD", "annual", RATES, PHP) is None  # below the sanity band
    assert C.to_monthly_php(100, "XYZ", "monthly", RATES, PHP) is None  # unknown currency


def test_roles():
    assert C.role_family("Executive Assistant to the CEO", "") == "Admin & Operations"
    assert C.role_family("Data Entry Specialist", "") == "Admin & Operations"
    assert C.role_family("Senior Data Engineer", "") == "Data & AI"
    assert C.role_family("Technical Support Engineer", "") == "Customer Support"
    assert C.role_family("Senior IT Operations Engineer", "") == "Engineering"
    assert C.role_family("Account Executive", "") == "Sales"
    assert C.role_family("SEO Specialist", "") == "Marketing"
    assert C.role_family("Graphic Designer", "") == "Design & Creative"
    assert C.role_family("Staff Accountant", "") == "Finance & HR"
    assert C.role_family("Triage Nurse", "Healthcare") == "Other"


def test_seniority():
    assert C.seniority("", "Junior Video Editor") == "Entry"
    assert C.seniority("Mid-level", "Account Manager") == "Senior"
    assert C.seniority("", "Director of Sales") == "Lead"
    assert C.seniority("Mid-level", "Web Developer") == "Mid"


def test_location_tiers():
    assert C.location_tier("") == "Worldwide"
    assert C.location_tier("Anywhere") == "Worldwide"
    assert C.location_tier("Philippines") == "Open to PH/APAC"
    assert C.location_tier("Greece|Hungary|Philippines|Spain") == "Open to PH/APAC"
    assert C.location_tier("Europe, USA, Canada, APAC") == "Open to PH/APAC"
    assert C.location_tier("USA") == "US & Canada only"
    assert C.location_tier("Canada,  USA") == "US & Canada only"
    assert C.location_tier("Berlin") == "Europe only"
    assert C.location_tier("Brazil") == "Latin America only"
    assert C.location_tier("|".join(["Country"] * 45)) == "Worldwide"


def test_day_shift_fit():
    assert C.ph_day_shift_fit("8") == 1.0
    assert C.ph_day_shift_fit("-10|-9|-8|-7|-6|-5|14") == 0.0
    assert C.ph_day_shift_fit("") is None


def test_skills_avoid_boilerplate():
    assert "Excel" not in skills.extract("Analyst", "", "We want excellent communicators")
    assert "Recruiting" not in skills.extract("Sales Rep", "", "Steps: Recruiter interview, then offer")
    assert "Recruiting" in skills.extract("Technical Recruiter", "", "")
    assert set(skills.extract("VA", "", "Use Canva, Zapier and Google Sheets daily")) == {"Canva", "Zapier", "Google Workspace"}


def test_dedupe_keeps_priority_source():
    df = pd.DataFrame({
        "source": ["arbeitnow", "himalayas", "jobicy"],
        "company": ["Acme Inc", "Acme Inc.", "Other"],
        "title": ["Customer Support Specialist (Remote)", "Customer Support Specialist", "Customer Support Specialist"],
    })
    out = C.dedupe(df)
    assert sorted(out["source"]) == ["himalayas", "jobicy"]
