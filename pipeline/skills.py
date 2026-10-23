"""Curated skill dictionary: display name -> regex (matched on lowercased title + tags + description).

Keep patterns specific: a loose pattern ("excel" matching "excellent") inflates every number downstream.
Entries marked CASE are matched case-sensitively on the original text.
"""
import re

CASE = "case"

SKILLS: dict[str, str | tuple[str, str]] = {
    # Office and admin
    "Excel": r"\b(?:ms |microsoft )?excel\b",
    "Google Workspace": r"\b(?:google workspace|g suite|gsuite|google sheets|google docs)\b",
    "Microsoft Office": r"\b(?:microsoft office|ms office|office 365|microsoft 365|powerpoint)\b",
    "Data Entry": r"\bdata entry\b",
    "Calendar Management": r"\b(?:calendar management|managing calendars?|manage calendars?|scheduling meetings)\b",
    "Notion": (r"\bNotion\b", CASE),
    "Asana": r"\basana\b",
    "Trello": r"\btrello\b",
    "ClickUp": r"\bclickup\b",
    "Monday.com": r"\bmonday\.com\b",
    "Jira": r"\bjira\b",
    "Slack": (r"\bSlack\b", CASE),
    "Zapier": r"\bzapier\b",
    "Make.com": r"\bmake\.com\b",
    "GoHighLevel": r"\b(?:gohighlevel|go high level|highlevel)\b",
    "Project Management": r"\bproject management\b",
    # Customer support
    "Customer Service": r"\bcustomer (?:service|support)\b",
    "Zendesk": r"\bzendesk\b",
    "Intercom": r"\bintercom\b",
    "Freshdesk": r"\bfreshdesk\b",
    "Gorgias": r"\bgorgias\b",
    "Ticketing Systems": r"\b(?:ticketing system|help ?desk software|support tickets?)\b",
    # Sales and CRM
    "Salesforce": r"\bsalesforce\b",
    "HubSpot": r"\bhubspot\b",
    "CRM": r"\bcrm\b",
    "Lead Generation": r"\blead generation\b",
    "Cold Calling": r"\bcold[ -]call(?:ing|s)?\b",
    "Cold Email": r"\bcold (?:email|outreach)\b",
    "Account Management": r"\baccount management\b",
    "Negotiation": r"\bnegotiat(?:ion|ing)\b",
    # Marketing and content
    "SEO": r"\bseo\b",
    "Google Ads": r"\b(?:google ads|adwords|ppc)\b",
    "Meta Ads": r"\b(?:meta ads|facebook ads|instagram ads)\b",
    "Google Analytics": r"\b(?:google analytics|ga4)\b",
    "Social Media Management": r"\bsocial media (?:management|manager|marketing|content)\b",
    "Content Writing": r"\b(?:content writing|content creation|blog posts?|copywriting)\b",
    "Email Marketing": r"\bemail marketing\b",
    "Mailchimp": r"\bmailchimp\b",
    "Klaviyo": r"\bklaviyo\b",
    "Shopify": r"\bshopify\b",
    "WordPress": r"\bwordpress\b",
    "Amazon Seller Central": r"\b(?:amazon seller central|amazon fba|seller central)\b",
    # Design and video
    "Canva": r"\bcanva\b",
    "Figma": r"\bfigma\b",
    "Photoshop": r"\bphotoshop\b",
    "Illustrator": r"\b(?:adobe )?illustrator\b",
    "Premiere Pro": r"\bpremiere(?: pro)?\b",
    "After Effects": r"\bafter effects\b",
    "Video Editing": r"\bvideo editing\b",
    "UX Research": r"\bux research\b",
    # Finance and HR
    "Bookkeeping": r"\bbookkeeping\b",
    "QuickBooks": r"\bquickbooks\b",
    "Xero": r"\bxero\b",
    "Payroll": r"\bpayroll\b",
    "Accounts Payable": r"\baccounts payable\b",
    # "Recruiter" and "talent acquisition" show up in hiring boilerplate ("Recruiter interview"),
    # so only recruiter-work phrases count here; recruiter titles are added in extract().
    "Recruiting": r"\b(?:full[- ]cycle recruiting|technical recruiting|sourcing candidates|candidate sourcing|"
                  r"applicant tracking systems?|ats experience|sourcing strategies)\b",
    "Workday": r"\bworkday\b",
    # Data and analytics
    "SQL": r"\bsql\b",
    "Python": r"\bpython\b",
    "R": (r"(?:\bR\b(?= programming| language|,| and|/)|\bRStudio\b)", CASE),
    "Tableau": r"\btableau\b",
    "Power BI": r"\bpower ?bi\b",
    "Looker": r"\blooker\b",
    "dbt": r"\bdbt\b",
    "Snowflake": r"\bsnowflake\b",
    "Spark": r"\b(?:apache spark|pyspark|spark)\b",
    "Statistics": r"\bstatistic(?:s|al)\b",
    "Machine Learning": r"\bmachine learning\b",
    "Generative AI": r"\b(?:generative ai|genai|llms?|large language models?|chatgpt|openai)\b",
    # Engineering
    "JavaScript": r"\bjavascript\b",
    "TypeScript": r"\btypescript\b",
    "React": r"\breact(?:\.js|js)?\b(?! native)",
    "Node.js": r"\bnode(?:\.js|js)\b",
    "Java": r"\bjava\b(?!script)",
    "Go": r"\b(?:golang|go language)\b",
    "C#": r"(?:\bc#|\.net\b)",
    "PHP": r"\bphp\b",
    "Ruby on Rails": r"\b(?:ruby on rails|ruby)\b",
    "AWS": r"\b(?:aws|amazon web services)\b",
    "Azure": r"\bazure\b",
    "Google Cloud": r"\b(?:gcp|google cloud)\b",
    "Docker": r"\bdocker\b",
    "Kubernetes": r"\b(?:kubernetes|k8s)\b",
    "Terraform": r"\bterraform\b",
    "Linux": r"\blinux\b",
    "Git": r"\bgit(?:hub|lab)?\b",
    "QA Testing": r"\b(?:qa testing|test automation|automated testing|selenium|cypress|playwright)\b",
    # Language
    "Spanish": r"\b(?:spanish|español)\b",
}

_COMPILED = []
for name, spec in SKILLS.items():
    if isinstance(spec, tuple):
        _COMPILED.append((name, re.compile(spec[0]), True))
    else:
        _COMPILED.append((name, re.compile(spec, re.I), False))


def extract(title: str, tags: str, description: str) -> list[str]:
    """Return the skills mentioned in a job, in dictionary order."""
    text = f"{title} | {tags} | {description}"
    found = [name for name, rx, _ in _COMPILED if rx.search(text)]
    if "Recruiting" not in found and _RECRUIT_TITLE.search(title or ""):
        found.append("Recruiting")
    return found


_RECRUIT_TITLE = re.compile(r"\b(?:recruit\w*|talent acquisition|sourcer)\b", re.I)
