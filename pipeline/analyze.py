"""Clean the latest snapshot and write every JSON file the website reads.

Run from the pipeline folder:
    python analyze.py                       # uses the newest data/raw/snapshot_*.csv
    python analyze.py --snapshot path.csv   # a specific file

Writes:  ../web/public/data/{meta,overview,skills,rules,salary,access,model,recommender}.json
         ../data/clean/jobs_clean.csv   (the cleaned table, for the notebook and the paper)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

import clean as C
import skills as skill_dict

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
CLEAN_DIR = ROOT / "data" / "clean"
OUT_DIR = ROOT / "web" / "public" / "data"

LOW_SAMPLE = 20  # salary groups under this many postings get flagged


# ---------------------------------------------------------------- helpers

def _jsonable(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return None if (o is None or math.isnan(o)) else round(float(o), 4)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, (pd.Timestamp, datetime)):
        return o.isoformat()
    raise TypeError(type(o))


def write(name: str, data: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.json"
    path.write_text(json.dumps(data, default=_jsonable, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1024:.0f} KB)")


def pct(x) -> float:
    return round(float(x) * 100, 1)


def money(x) -> int | None:
    return None if x is None or pd.isna(x) else int(round(float(x), -2))


def fetch_rates() -> tuple[dict, float, str]:
    """Live rates from open.er-api.com (free, no key); fall back to the table in clean.py."""
    try:
        import requests
        data = requests.get("https://open.er-api.com/v6/latest/USD", timeout=15).json()
        per_usd = data["rates"]  # 1 USD = X currency
        to_usd = {cur: 1 / v for cur, v in per_usd.items() if v}
        return to_usd, float(per_usd["PHP"]), f"open.er-api.com, {data.get('time_last_update_utc', 'today')}"
    except Exception as exc:  # offline or API change: keep going with fallback rates
        print(f"  live exchange rates unavailable ({exc}); using approximate fallback rates")
        return C.FALLBACK_TO_USD, C.FALLBACK_USD_TO_PHP, "approximate fallback rates (offline)"


def latest_snapshot() -> Path:
    files = sorted(p for p in RAW_DIR.glob("snapshot_*.csv") if "_quick" not in p.name)
    if not files:
        sys.exit("No snapshot found in data/raw. Run `python pull.py` first.")
    return files[-1]


def box(s: pd.Series) -> dict:
    s = s.dropna()
    q = s.quantile([0.1, 0.25, 0.5, 0.75, 0.9])
    return {"n": int(len(s)), "p10": money(q[0.1]), "p25": money(q[0.25]), "median": money(q[0.5]),
            "p75": money(q[0.75]), "p90": money(q[0.9]), "low_sample": len(s) < LOW_SAMPLE}


def skill_onehot(df: pd.DataFrame) -> pd.DataFrame:
    names = list(skill_dict.SKILLS)
    return pd.DataFrame([[n in s for n in names] for s in df["skills"]], columns=names, index=df.index)


# ---------------------------------------------------------------- sections

def overview(df: pd.DataFrame, oh: pd.DataFrame) -> dict:
    roles = df["role"].value_counts()
    tiers = df["tier"].value_counts().reindex(C.TIERS, fill_value=0)
    pay = df["pay_mid_php"].dropna()
    ph = df[df["ph_accessible"]]
    ph_oh = oh.loc[ph.index]
    return {
        "kpis": {
            "jobs": len(df),
            "ph_accessible_pct": pct(df["ph_accessible"].mean()),
            "ph_accessible_count": int(df["ph_accessible"].sum()),
            "ph_based_count": int(df["ph_based"].sum()),
            "top_role": roles.index[0],
            "top_role_share": pct(roles.iloc[0] / len(df)),
            "median_monthly_php": money(pay.median()),
            "salary_n": int(len(pay)),
        },
        "roles": [{"role": r, "count": int(n), "share": pct(n / len(df))} for r, n in roles.items()],
        "tiers": [{"tier": t, "count": int(n), "share": pct(n / len(df)),
                   "ph_accessible": t in ("Worldwide", "Open to PH/APAC")} for t, n in tiers.items()],
        "top_skills": [{"skill": s, "count": int(n), "share": pct(n / len(df))}
                       for s, n in oh.sum().sort_values(ascending=False).head(10).items()],
        "top_skills_ph": [{"skill": s, "count": int(n), "share": pct(n / max(len(ph), 1))}
                          for s, n in ph_oh.sum().sort_values(ascending=False).head(10).items()],
        "job_types": [{"type": t, "count": int(n), "share": pct(n / len(df))}
                      for t, n in df["job_type_clean"].value_counts().items()],
        "seniority": [{"level": t, "count": int(n), "share": pct(n / len(df))}
                      for t, n in df["seniority"].value_counts().reindex(["Entry", "Mid", "Senior", "Lead"]).fillna(0).items()],
    }


def skills_section(df: pd.DataFrame, oh: pd.DataFrame) -> dict:
    def table(sub: pd.DataFrame) -> list[dict]:
        o = oh.loc[sub.index]
        counts = o.sum().sort_values(ascending=False)
        rows = []
        for skill, n in counts.head(30).items():
            if n == 0:
                break
            mask = o[skill]
            pay = sub.loc[mask, "pay_mid_php"].dropna()
            rows.append({
                "skill": skill, "jobs": int(n), "share": pct(n / len(sub)),
                "median_pay": money(pay.median()) if len(pay) >= 5 else None, "pay_n": int(len(pay)),
                "top_role": sub.loc[mask, "role"].mode().iat[0],
                "ph_accessible_jobs": int(sub.loc[mask, "ph_accessible"].sum()),
                "trend": None,  # needs 2+ snapshots a week apart
            })
        return rows

    by_role = {"All roles": table(df)}
    for role in C.ROLE_FAMILIES:
        sub = df[df["role"] == role]
        if len(sub) >= 30:
            by_role[role] = table(sub)
    return {"roles": list(by_role), "by_role": by_role, "trend_available": False}


def rules_section(oh: pd.DataFrame) -> dict:
    from mlxtend.frequent_patterns import apriori, association_rules
    min_support, min_conf = 0.01, 0.4
    use = oh.loc[:, oh.sum() >= 20]
    freq = apriori(use, min_support=min_support, use_colnames=True, max_len=2)
    rules = association_rules(freq, metric="confidence", min_threshold=min_conf)
    rules = rules[(rules["antecedents"].map(len) == 1) & (rules["consequents"].map(len) == 1) & (rules["lift"] > 1.2)]
    # A->B and B->A have the same lift: keep only the more confident direction of each pair.
    rules["pair"] = [frozenset(a | b) for a, b in zip(rules["antecedents"], rules["consequents"])]
    rules = rules.sort_values("confidence", ascending=False).drop_duplicates("pair")
    rules = rules.sort_values(["lift", "confidence"], ascending=False).head(40)
    return {
        "min_support": min_support, "min_confidence": min_conf, "jobs": len(oh),
        "rules": [{"a": next(iter(r.antecedents)), "b": next(iter(r.consequents)),
                   "support": pct(r.support), "confidence": pct(r.confidence), "lift": round(float(r.lift), 2),
                   "jobs_together": int(round(r.support * len(oh)))} for r in rules.itertuples()],
    }


def salary_section(df: pd.DataFrame) -> dict:
    paid = df[df["pay_mid_php"].notna()]
    by_role = [{"role": r, **box(g["pay_mid_php"])} for r, g in paid.groupby("role") if len(g) >= 10]
    by_role.sort(key=lambda x: x["median"] or 0, reverse=True)
    table = []
    for (r, s), g in paid.groupby(["role", "seniority"]):
        if len(g) >= 5:
            b = box(g["pay_mid_php"])
            table.append({"role": r, "seniority": s, "n": b["n"], "median": b["median"],
                          "p25": b["p25"], "p75": b["p75"], "low_sample": b["low_sample"]})
    order = {"Entry": 0, "Mid": 1, "Senior": 2, "Lead": 3}
    table.sort(key=lambda x: (x["role"], order.get(x["seniority"], 9)))
    return {
        "overall": box(paid["pay_mid_php"]),
        "ph_accessible": box(paid.loc[paid["ph_accessible"], "pay_mid_php"]),
        "not_ph_accessible": box(paid.loc[~paid["ph_accessible"], "pay_mid_php"]),
        "by_role": by_role,
        "by_seniority": [{"seniority": s, **box(paid.loc[paid["seniority"] == s, "pay_mid_php"])}
                         for s in ["Entry", "Mid", "Senior", "Lead"]],
        "by_job_type": [{"type": t, **box(g["pay_mid_php"])} for t, g in paid.groupby("job_type_clean") if len(g) >= 10],
        "table": table,
        "coverage_pct": pct(len(paid) / len(df)),
    }


def access_section(df: pd.DataFrame, oh: pd.DataFrame) -> dict:
    by_role = []
    for r, g in df.groupby("role"):
        tiers = g["tier"].value_counts()
        by_role.append({"role": r, "jobs": len(g), "ph_jobs": int(g["ph_accessible"].sum()),
                        "rate": pct(g["ph_accessible"].mean()),
                        "tiers": {t: pct(tiers.get(t, 0) / len(g)) for t in C.TIERS}})
    by_role.sort(key=lambda x: x["rate"], reverse=True)
    tz = df[df["day_shift_fit"].notna()]
    ph = df[df["ph_accessible"]].sort_values("posted_at", ascending=False)
    return {
        "overall": {"rate": pct(df["ph_accessible"].mean()), "count": int(df["ph_accessible"].sum()), "total": len(df),
                    "ph_based": int(df["ph_based"].sum())},
        "tiers": [{"tier": t, "count": int((df["tier"] == t).sum()), "share": pct((df["tier"] == t).mean())} for t in C.TIERS],
        "by_role": by_role,
        "day_shift": {"jobs_with_timezone": len(tz), "fit_pct": pct(tz["day_shift_fit"].mean()) if len(tz) else None,
                      "fit_count": int(tz["day_shift_fit"].sum())},
        "jobs": [{"title": r.title, "company": r.company, "role": r.role, "tier": r.tier, "source": r.source,
                  "url": r.url, "posted": r.posted_at, "pay_mid_php": money(r.pay_mid_php)}
                 for r in ph.head(30).itertuples()],
    }


def model_section(df: pd.DataFrame, oh: pd.DataFrame) -> dict:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from sklearn.model_selection import train_test_split

    paid = df[df["pay_mid_php"].notna()]
    top_skills = oh.loc[paid.index].sum().sort_values(ascending=False).head(40).index.tolist()
    X = pd.concat([
        pd.get_dummies(paid[["role", "seniority", "tier", "job_type_clean"]], prefix=["role", "level", "tier", "type"]),
        oh.loc[paid.index, top_skills].add_prefix("skill_"),
        paid[["n_skills"]],
    ], axis=1).astype(float)
    y = np.log(paid["pay_mid_php"])
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    rf = RandomForestRegressor(n_estimators=400, min_samples_leaf=3, random_state=42, n_jobs=-1)
    rf.fit(X_tr, y_tr)
    pred = np.exp(rf.predict(X_te))
    actual = np.exp(y_te)

    # Baseline: median pay of the same role and seniority in the training set.
    tr = paid.loc[X_tr.index]
    base_lookup = tr.groupby(["role", "seniority"])["pay_mid_php"].median()
    te = paid.loc[X_te.index]
    baseline = [base_lookup.get((r, s), tr["pay_mid_php"].median()) for r, s in zip(te.role, te.seniority)]

    imp = pd.Series(rf.feature_importances_, index=X.columns).sort_values(ascending=False).head(15)
    return {
        "algorithm": "RandomForestRegressor (400 trees, min_samples_leaf=3), target = log monthly pay",
        "n_train": len(X_tr), "n_test": len(X_te), "n_features": X.shape[1],
        "metrics": {
            "mae": money(mean_absolute_error(actual, pred)),
            "rmse": money(math.sqrt(mean_squared_error(actual, pred))),
            "r2": round(float(r2_score(actual, pred)), 3),
            "median_ape_pct": pct(np.median(np.abs(pred - actual) / actual)),
        },
        "baseline": {
            "name": "median pay of the same role and seniority",
            "mae": money(mean_absolute_error(actual, baseline)),
            "r2": round(float(r2_score(actual, baseline)), 3),
        },
        "beats_baseline": bool(mean_absolute_error(actual, pred) < mean_absolute_error(actual, baseline)),
        "importances": [{"feature": f.replace("_", ": ", 1), "importance": round(float(v), 4)} for f, v in imp.items()],
    }


def recommender_section(df: pd.DataFrame, oh: pd.DataFrame) -> dict:
    roles = {}
    for r, g in df.groupby("role"):
        if len(g) < 30 or r == "Other":
            continue
        o = oh.loc[g.index]
        counts = o.sum().sort_values(ascending=False)
        top = counts[counts > 0].head(15)
        skills_out = []
        for skill, n in top.items():
            has = g.loc[o[skill], "pay_mid_php"].dropna()
            lacks = g.loc[~o[skill], "pay_mid_php"].dropna()
            uplift = money(has.median() - lacks.median()) if len(has) >= 8 and len(lacks) >= 8 else None
            # Uplift is a raw comparison, not causal: a negative value usually means the skill is
            # common in lower-paid roles within the family. The site shows only positive uplifts.
            skills_out.append({"skill": skill, "jobs": int(n), "share": pct(n / len(g)),
                               "ph_jobs": int(g.loc[o[skill], "ph_accessible"].sum()),
                               "pay_uplift": uplift, "median_pay_with": money(has.median()) if len(has) >= 8 else None,
                               "pay_n": int(len(has))})
        pay = {}
        for s in ["Entry", "Mid", "Senior", "Lead"]:
            p = g.loc[g["seniority"] == s, "pay_mid_php"].dropna()
            src = p if len(p) >= 10 else g["pay_mid_php"].dropna()
            pay[s] = {"p25": money(src.quantile(0.25)), "median": money(src.median()), "p75": money(src.quantile(0.75)),
                      "n": int(len(src)), "level_specific": len(p) >= 10}
        roles[r] = {"jobs": len(g), "ph_jobs": int(g["ph_accessible"].sum()), "skills": skills_out, "pay": pay}
    return {"roles": roles, "all_skills": sorted(skill_dict.SKILLS)}


# ---------------------------------------------------------------- main

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--snapshot", type=Path)
    args = parser.parse_args()
    snap = args.snapshot or latest_snapshot()
    print(f"Snapshot: {snap.name}")

    raw = pd.read_csv(snap)
    to_usd, usd_php, rate_source = fetch_rates()
    print(f"USD to PHP: {usd_php:.2f} ({rate_source})")
    print("Cleaning (about a minute)...")
    df = C.clean(raw, to_usd, usd_php)
    oh = skill_onehot(df)

    CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    df.assign(skills=df["skills"].map("|".join)).drop(columns=["description"]).to_csv(CLEAN_DIR / "jobs_clean.csv", index=False)

    print("Writing JSON...")
    posted = df["posted_at"].dropna()
    write("meta", {
        "snapshot_file": snap.name,
        "snapshot_date": snap.stem.replace("snapshot_", ""),
        "generated_at": datetime.now(timezone.utc),
        "raw_rows": len(raw),
        "raw_by_source": raw["source"].value_counts().to_dict(),
        "jobs": len(df),
        "jobs_by_source": df["source"].value_counts().to_dict(),
        "duplicates_removed": df.attrs.get("duplicates_removed", 0),
        "salary_coverage_pct": pct(df["pay_mid_php"].notna().mean()),
        "skills_coverage_pct": pct((df["n_skills"] > 0).mean()),
        "usd_to_php": round(usd_php, 2), "rate_source": rate_source,
        "posted_from": posted.min(), "posted_to": posted.max(),
        "trend_available": False,
        "role_families": C.ROLE_FAMILIES, "tiers": C.TIERS,
        "sources": [
            {"name": "Himalayas", "url": "https://himalayas.app"}, {"name": "Jobicy", "url": "https://jobicy.com"},
            {"name": "Remotive", "url": "https://remotive.com"}, {"name": "Arbeitnow", "url": "https://www.arbeitnow.com"},
        ],
    })
    write("overview", overview(df, oh))
    write("skills", skills_section(df, oh))
    write("rules", rules_section(oh))
    write("salary", salary_section(df))
    write("access", access_section(df, oh))
    print("Training the salary model...")
    write("model", model_section(df, oh))
    write("recommender", recommender_section(df, oh))
    print(f"\nDone: {len(df)} jobs analyzed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
