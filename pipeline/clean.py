"""Turn a raw snapshot CSV into one clean table the analytics can trust.

Every rule here is a methodology decision: keep it readable and documented,
because the paper and the Methodology page describe exactly these steps.
"""
from __future__ import annotations

import re

import numpy as np
import pandas as pd
from rapidfuzz import fuzz

import skills as skill_dict

# ---------------------------------------------------------------- currency

# Fallback rates to USD (1 unit of currency = X USD). Approximate; the
# pipeline tries a live rate first (rates.py) and records which it used.
FALLBACK_TO_USD = {
    "USD": 1.0, "CAD": 0.72, "EUR": 1.08, "GBP": 1.27, "AUD": 0.65, "NZD": 0.59,
    "CHF": 1.12, "PLN": 0.25, "SEK": 0.095, "NOK": 0.092, "DKK": 0.145,
    "INR": 0.012, "MXN": 0.054, "BRL": 0.18, "SGD": 0.74, "JPY": 0.0066, "ZAR": 0.055,
    "COP": 0.00025, "ARS": 0.001, "CZK": 0.043, "HUF": 0.0027, "RON": 0.22, "TRY": 0.029,
}
FALLBACK_USD_TO_PHP = 58.0

HOURS_PER_MONTH = 160
PERIOD_TO_MONTHLY = {
    "hourly": HOURS_PER_MONTH, "hour": HOURS_PER_MONTH,
    "daily": 21.7, "day": 21.7,
    "weekly": 4.33, "week": 4.33,
    "fortnightly": 2.17,
    "monthly": 1.0, "month": 1.0,
    "annual": 1 / 12, "yearly": 1 / 12, "year": 1 / 12,
}
# Anything outside this monthly-USD band is a parsing error or a non-salary number.
MIN_MONTHLY_USD, MAX_MONTHLY_USD = 200, 60_000

_MONEY = re.compile(r"(\d[\d,]*(?:\.\d+)?)\s*(k)?", re.I)


def parse_salary_text(text: str) -> tuple[float | None, float | None, str, str]:
    """Free-text salary ("$170k - $200k", "$50-$75 /hour") -> (min, max, currency, period).

    Used only when a source gives no numeric salary (Remotive).
    """
    if not isinstance(text, str) or not text.strip():
        return None, None, "", ""
    t = text.lower().replace(",", "")
    if "per task" in t or "per project" in t:
        return None, None, "", ""
    nums = []
    for value, k in _MONEY.findall(t):
        n = float(value.replace(",", ""))
        nums.append(n * 1000 if k else n)
    nums = [n for n in nums if n > 0][:2]
    if not nums:
        return None, None, "", ""
    if "hour" in t or "/hr" in t:
        period = "hourly"
    elif "month" in t:
        period = "monthly"
    elif "week" in t:
        period = "weekly"
    else:
        period = "annual"
    currency = "EUR" if "€" in text else "GBP" if "£" in text else "USD"
    return min(nums), max(nums), currency, period


def to_monthly_php(amount, currency, period, to_usd: dict, usd_to_php: float) -> float | None:
    if amount is None or pd.isna(amount) or amount <= 0:
        return None
    factor = PERIOD_TO_MONTHLY.get(str(period).lower())
    rate = to_usd.get(str(currency).upper()) if currency else to_usd["USD"]
    if factor is None or rate is None:
        return None
    monthly_usd = amount * factor * rate
    if not (MIN_MONTHLY_USD <= monthly_usd <= MAX_MONTHLY_USD):
        return None
    return round(monthly_usd * usd_to_php, -2)


# ---------------------------------------------------------------- roles

# Order matters: the first family whose pattern matches the title wins.
ROLE_RULES: list[tuple[str, str]] = [
    ("Data & AI", r"\b(?:data|analytics|analyst|bi developer|business intelligence|machine learning|ml|"
                  r"ai engineer|ai developer|scientist|statistician|llm)\b"),
    ("Customer Support", r"\b(?:customer (?:support|service|success|care|experience)|support (?:specialist|agent|"
                         r"representative|associate|engineer|analyst|lead)|technical support|help ?desk|service desk|"
                         r"client success|client support|call center|chat support)\b"),
    # Core engineering titles beat "operations"/"design" words ("IT Operations Engineer", "Design Engineer").
    ("Engineering", r"\b(?:engineer\w*|developer|devops|sre|programmer|architect|qa|tester)\b"),
    ("Admin & Operations", r"\b(?:virtual assistant|executive assistant|administrative|admin|assistant|"
                           r"operations|ops|office manager|coordinator|scheduler|data entry|project manager|"
                           r"program manager|product manager|product owner|chief of staff|logistics|supply chain|"
                           r"procurement|dispatcher)\b"),
    ("Sales", r"\b(?:sales|account executive|account manager|business development|bdr|sdr|ae|"
              r"partnerships?|revenue|closer|appointment setter|inside sales|key account)\b"),
    ("Marketing", r"\b(?:marketing|seo|sem|ppc|content|copywriter|copy|writer|editor|social media|growth|brand|"
                  r"communications|pr|public relations|community|creator|influencer|email)\b"),
    ("Design & Creative", r"\b(?:designer|design|ux|ui|graphic|illustrator|animator|video|motion|creative|"
                          r"art director|photograph\w*)\b"),
    ("Finance & HR", r"\b(?:accountant|accounting|bookkeep\w*|finance|financial|controller|payroll|tax|audit\w*|"
                     r"treasury|billing|hr|human resources|people|recruit\w*|talent|benefits|compensation)\b"),
    ("Engineering", r"\b(?:software|full[- ]?stack|front[- ]?end|back[- ]?end|mobile|ios|android|security|it|"
                    r"cloud|infrastructure|platform|firmware|embedded|sap)\b"),
]
_ROLE_RX = [(name, re.compile(rx, re.I)) for name, rx in ROLE_RULES]
ROLE_FAMILIES = list(dict.fromkeys(name for name, _ in ROLE_RULES)) + ["Other"]

# Category text from the source is a fallback when the title says nothing.
CATEGORY_HINTS = [
    ("Sales", r"sales|account-exec|business-dev"), ("Engineering", r"develop|engineer|devops|qa|software|cyber"),
    ("Data & AI", r"data|analytics|machine-learning"), ("Customer Support", r"customer|support"),
    ("Marketing", r"marketing|seo|content|copywrit"), ("Design & Creative", r"design|creative|multimedia"),
    ("Finance & HR", r"finance|accounting|human resources|\bhr\b"), ("Admin & Operations", r"admin|operations|project"),
]


def role_family(title: str, category: str) -> str:
    t = title or ""
    # "Data Entry" is admin work, not data science.
    if re.search(r"\bdata entry\b", t, re.I):
        return "Admin & Operations"
    for name, rx in _ROLE_RX:
        if rx.search(t):
            return name
    c = (category or "").lower()
    for name, rx in CATEGORY_HINTS:
        if re.search(rx, c):
            return name
    return "Other"


# ---------------------------------------------------------------- seniority

def seniority(raw: str, title: str) -> str:
    t = (title or "").lower()
    if re.search(r"\b(?:intern|internship|junior|jr\.?|entry|graduate|trainee|associate)\b", t):
        return "Entry"
    if re.search(r"\b(?:director|head of|vp|vice president|chief|cto|ceo|cfo|principal|staff|lead)\b", t):
        return "Lead"
    # "Account Manager", "Project Manager" are usually individual roles, not leadership.
    if re.search(r"\b(?:senior|sr\.?|manager)\b", t):
        return "Senior"
    first = (raw or "").split("|")[0].lower()
    if "entry" in first or "junior" in first or "intern" in first:
        return "Entry"
    if any(w in first for w in ("director", "executive", "manager", "lead", "head")):
        return "Lead"
    if "senior" in first:
        return "Senior"
    return "Mid"


# ---------------------------------------------------------------- location

WORLDWIDE = re.compile(r"^(?:|worldwide|anywhere|remote|remote job|global|globally|world ?wide|any location)$", re.I)
APAC = re.compile(r"\b(?:philippines|apac|asia|asia[- ]pacific|southeast asia|sea)\b", re.I)
US_CA = re.compile(r"\b(?:usa|us|u\.s\.|united states|america|canada|north america|us timezones?)\b", re.I)
EUROPE = re.compile(
    r"\b(?:europe|eu|emea|uk|united kingdom|england|ireland|germany|berlin|munich|hamburg|france|paris|spain|"
    r"portugal|italy|netherlands|belgium|poland|switzerland|austria|sweden|norway|denmark|finland|greece|"
    r"hungary|romania|czech|croatia|estonia|latvia|lithuania|bulgaria|serbia|ukraine|türkiye|turkey|cyprus|malta)\b",
    re.I,
)
LATAM = re.compile(r"\b(?:latam|latin america|brazil|mexico|colombia|argentina|peru|chile|uruguay|costa rica)\b", re.I)

TIERS = ["Worldwide", "Open to PH/APAC", "US & Canada only", "Europe only", "Latin America only", "Other regions"]


def location_tier(raw: str) -> str:
    text = (raw or "").strip()
    if WORLDWIDE.match(text):
        return "Worldwide"
    countries = [c for c in re.split(r"[|,]", text) if c.strip()]
    if len(countries) >= 40:  # Himalayas lists every allowed country; 40+ is effectively global
        return "Worldwide"
    if APAC.search(text):
        return "Open to PH/APAC"
    if US_CA.search(text):
        return "US & Canada only"
    if EUROPE.search(text):
        return "Europe only"
    if LATAM.search(text):
        return "Latin America only"
    return "Other regions"


def ph_day_shift_fit(timezones_raw) -> float | None:
    """1 if the job allows a timezone within ±3h of PH (UTC+8), 0 if not, None if unknown."""
    if not isinstance(timezones_raw, str) or not timezones_raw.strip():
        return None
    try:
        offsets = [float(x) for x in str(timezones_raw).split("|") if x.strip()]
    except ValueError:
        return None
    if not offsets:
        return None
    return 1.0 if any(5 <= o <= 11 for o in offsets) else 0.0


# ---------------------------------------------------------------- job type

def job_type(raw: str) -> str:
    t = (raw or "").lower()
    if "part" in t:
        return "Part-time"
    if any(w in t for w in ("contract", "freelance", "temporary")):
        return "Contract"
    if "intern" in t:
        return "Internship"
    return "Full-time"


# ---------------------------------------------------------------- dedup

SOURCE_PRIORITY = {"himalayas": 0, "jobicy": 1, "remotive": 2, "arbeitnow": 3}
_NORM = re.compile(r"[^a-z0-9 ]+")


def _norm(s: str) -> str:
    s = re.sub(r"\(.*?\)", " ", (s or "").lower())
    return re.sub(r"\s+", " ", _NORM.sub(" ", s)).strip()


def dedupe(df: pd.DataFrame, threshold: int = 92) -> pd.DataFrame:
    """Same company + near-identical title = one job. Keeps the highest-priority source."""
    df = df.copy()
    df["_company"] = df["company"].map(_norm)
    df["_title"] = df["title"].map(_norm)
    df["_prio"] = df["source"].map(SOURCE_PRIORITY).fillna(9)
    df = df.sort_values("_prio")
    keep = np.ones(len(df), dtype=bool)
    for _, idx in df.groupby("_company").indices.items():
        if len(idx) < 2:
            continue
        titles = df["_title"].to_numpy()[idx]
        for a in range(len(idx)):
            if not keep[idx[a]]:
                continue
            for b in range(a + 1, len(idx)):
                if keep[idx[b]] and fuzz.ratio(titles[a], titles[b]) >= threshold:
                    keep[idx[b]] = False
    return df[keep].drop(columns=["_company", "_title", "_prio"])


# ---------------------------------------------------------------- main

def clean(raw: pd.DataFrame, to_usd: dict | None = None, usd_to_php: float | None = None) -> pd.DataFrame:
    to_usd = to_usd or FALLBACK_TO_USD
    usd_to_php = usd_to_php or FALLBACK_USD_TO_PHP
    df = raw.copy()
    for col in ("title", "company", "description", "category_raw", "tags", "job_type",
                "seniority_raw", "location_raw", "timezones_raw", "salary_raw", "salary_currency", "salary_period"):
        df[col] = df[col].fillna("").astype(str)
    df = df[df["title"].str.strip() != ""]

    # Salary: numeric fields first, free text as a fallback.
    parsed = df.apply(
        lambda r: (r.salary_min, r.salary_max, r.salary_currency, r.salary_period)
        if pd.notna(r.salary_min) and r.salary_min > 0
        else parse_salary_text(r.salary_raw),
        axis=1, result_type="expand",
    )
    parsed.columns = ["smin", "smax", "scur", "sper"]
    parsed["smax"] = parsed["smax"].where(parsed["smax"].notna() & (parsed["smax"] > 0), parsed["smin"])
    df["pay_min_php"] = [to_monthly_php(a, c, p, to_usd, usd_to_php) for a, c, p in zip(parsed.smin, parsed.scur, parsed.sper)]
    df["pay_max_php"] = [to_monthly_php(a, c, p, to_usd, usd_to_php) for a, c, p in zip(parsed.smax, parsed.scur, parsed.sper)]
    df.loc[df["pay_min_php"].isna(), "pay_max_php"] = np.nan
    df["pay_mid_php"] = df[["pay_min_php", "pay_max_php"]].mean(axis=1)

    df["role"] = [role_family(t, c) for t, c in zip(df.title, df.category_raw)]
    df["seniority"] = [seniority(s, t) for s, t in zip(df.seniority_raw, df.title)]
    df["tier"] = df["location_raw"].map(location_tier)
    df["ph_accessible"] = df["tier"].isin(["Worldwide", "Open to PH/APAC"])
    df["ph_based"] = df["location_raw"].str.contains("philippines", case=False)
    df["day_shift_fit"] = df["timezones_raw"].map(ph_day_shift_fit)
    df["job_type_clean"] = df["job_type"].map(job_type)
    df["skills"] = [skill_dict.extract(t, g, d) for t, g, d in zip(df.title, df.tags, df.description)]
    df["n_skills"] = df["skills"].map(len)
    df["posted_at"] = pd.to_datetime(df["posted_at"], utc=True, errors="coerce")

    before = len(df)
    df = dedupe(df)
    df.attrs["duplicates_removed"] = before - len(df)
    return df.reset_index(drop=True)
