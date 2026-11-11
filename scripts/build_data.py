"""Build data/rates.json: student visa approvals and refusals by nationality.

Sources (all public, aggregate counts, calendar years 2022-2025):
- Australia: Home Affairs grant-rate table, primary applicants outside Australia,
  Higher Education Sector (prepared by vitalii-kaplan/au-nz-comparison).
- New Zealand: INZ annual student visa decisions, offshore applicants
  (prepared by vitalii-kaplan/au-nz-comparison).
- United Kingdom: Home Office entry clearance visa outcomes, "Sponsored study",
  Student / Tier 4 General Student main applicants, Issued vs Refused
  (withdrawn and lapsed applications are not decisions and are excluded).

Usage:
    python3 scripts/build_data.py /path/to/au-nz-comparison
The UK CSV must first be extracted from the Zenodo archive (record 21446641) to
<au-nz-comparison>/data/original/united-kingdom/.
"""

import csv
import json
import sys
from pathlib import Path

YEARS = ("2022", "2023", "2024", "2025")

# Home Office nationality label -> UN M49 name used by the AU/NZ tables.
UK_TO_M49 = {
    "Bahamas, The": "Bahamas",
    "Bermuda (British)": "Bermuda",
    "Bolivia": "Bolivia (Plurinational State of)",
    "Brunei": "Brunei Darussalam",
    "Cape Verde": "Cabo Verde",
    "Cayman Islands (British)": "Cayman Islands",
    "Congo (Democratic Republic)": "Democratic Republic of the Congo",
    "East Timor": "Timor-Leste",
    "Gambia, The": "Gambia",
    "Hong Kong": "China, Hong Kong Special Administrative Region",
    "Iran": "Iran (Islamic Republic of)",
    "Ivory Coast": "Côte d’Ivoire",
    "Laos": "Lao People's Democratic Republic",
    "Macau": "China, Macao Special Administrative Region",
    "Moldova": "Republic of Moldova",
    "Myanmar (Burma)": "Myanmar",
    "Netherlands": "Netherlands (Kingdom of the)",
    "North Korea": "Democratic People's Republic of Korea",
    "Palestine": "State of Palestine",
    "Russia": "Russian Federation",
    "South Korea": "Republic of Korea",
    "St Kitts and Nevis": "Saint Kitts and Nevis",
    "St Lucia": "Saint Lucia",
    "St Vincent and the Grenadines": "Saint Vincent and the Grenadines",
    "Syria": "Syrian Arab Republic",
    "Tanzania": "United Republic of Tanzania",
    "Turkey": "Türkiye",
    "United States": "United States of America",
    "Venezuela": "Venezuela (Bolivarian Republic of)",
    "Vietnam": "Viet Nam",
}
UK_EXCLUDE = {"British overseas citizens", "Other and unknown", "Refugee", "Stateless", "Cyprus (Northern part of)"}

# Extra search words so people can type the everyday name.
EXTRA_ALIASES = {
    "United Kingdom of Great Britain and Northern Ireland": ["UK", "Britain"],
    "United States of America": ["USA", "US", "America"],
    "China, Hong Kong Special Administrative Region": ["Hong Kong"],
    "Republic of Korea": ["South Korea", "Korea"],
    "Viet Nam": ["Vietnam"],
}


def add(out, country, dest, year, approved, refused):
    cell = out.setdefault(country, {}).setdefault(dest, {}).setdefault(year, [0, 0])
    cell[0] += approved
    cell[1] += refused


def main(src: Path) -> None:
    out: dict = {}
    for dest, folder in (("au", "australia"), ("nz", "new-zealand")):
        for year in YEARS:
            path = src / "data/prepared" / folder / f"student_visa_decisions_{year}-m49.csv"
            for row in csv.DictReader(path.open(encoding="utf-8")):
                add(out, row["Country"], dest, year, int(row["Number approved"]), int(row["Number declined"]))

    uk_path = src / "data/original/united-kingdom/entry_clearance_visa_outcomes_2005_2026q1.csv"
    for row in csv.DictReader(uk_path.open(encoding="utf-8-sig")):
        if (
            row["visa_type"] == "Sponsored study"
            and row["visa_type_subgroup"] in ("Student", "Tier 4 - General Student")
            and row["applicant_type"] == "Main Applicant"
            and row["year"] in YEARS
            and row["case_outcome"] in ("Issued", "Refused")
            and row["nationality"] not in UK_EXCLUDE
        ):
            n = int(row["decisions"])
            country = UK_TO_M49.get(row["nationality"], row["nationality"])
            add(out, country, "uk", row["year"],
                n if row["case_outcome"] == "Issued" else 0,
                n if row["case_outcome"] == "Refused" else 0)

    aliases: dict = {}
    for uk, m49 in UK_TO_M49.items():
        aliases.setdefault(m49, []).append(uk)
    for m49, words in EXTRA_ALIASES.items():
        aliases.setdefault(m49, []).extend(words)

    data = {
        "years": list(YEARS),
        "countries": dict(sorted(out.items())),
        "aliases": {k: sorted(set(v)) for k, v in aliases.items() if k in out},
    }
    # Written as a JS file so index.html also works when opened straight from disk.
    dest_file = Path(__file__).resolve().parent.parent / "data/rates.js"
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    dest_file.write_text(f"window.VISA_RATES={payload};\n", encoding="utf-8")

    totals = {d: [0, 0] for d in ("au", "nz", "uk")}
    for c in out.values():
        for d, years in c.items():
            for a, r in years.values():
                totals[d][0] += a
                totals[d][1] += r
    print(f"{len(out)} nationalities -> {dest_file}")
    for d, (a, r) in totals.items():
        print(f"  {d}: {a:,} approved, {r:,} refused, rate {a / (a + r):.1%}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
