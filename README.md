# Student Visa Decision Helper

A free, private, browser-only tool for students deciding between **Australia**, **New Zealand** and the **United Kingdom**.

1. **Pick your nationality.**
2. **See real approval rates** for people of your nationality in each country, 2022–2025, year by year, compared with the average for all nationalities.
3. **Check whether you're ready to apply**, using a checklist of each country's main student visa requirements (essentials are marked).
4. **Compare the three countries side by side.**

Nothing you type is uploaded. Checklist ticks are saved only in your own browser.

## What it is not

- **Not a prediction of your personal chance.** The rates are past averages for whole groups. Your result depends on your documents, your course and how clearly you explain your plans.
- **Not legal advice.** The requirement summaries can go out of date. Each checklist links to the official government page; always confirm amounts and rules there, or talk to a registered migration adviser.

## Data

All counts are public, aggregate government statistics from the
[Country-to-Visa dataset](https://doi.org/10.5281/zenodo.21446641) on Zenodo.

| Country | Source | Group counted |
|---|---|---|
| Australia | Department of Home Affairs grant rates | Primary applicants outside Australia, Higher Education Sector |
| New Zealand | Immigration New Zealand annual decisions | Offshore student visa applicants |
| United Kingdom | Home Office entry clearance visa outcomes | Student route main applicants, Issued vs Refused |

Approval rate = approved ÷ (approved + refused). The three groups aren't identical (for example, the UK figures cover all course levels, Australia only university level), so compare with care.

The Australia and New Zealand tables were prepared with [vitalii-kaplan/au-nz-comparison](https://github.com/vitalii-kaplan/au-nz-comparison).

## Run it

Open `index.html` in a browser; no install or server needed.

## Rebuild the data

```sh
# 1. Run vitalii-kaplan/au-nz-comparison so its data/prepared/ tables exist.
# 2. Extract the UK table from the same Zenodo archive:
unzip -j data/original/zenodo/data.zip \
  'data/csv/united-kingdom/entry_clearance_visa_outcomes_2005_2026q1.csv' \
  -d data/original/united-kingdom
# 3. From this repo:
python3 scripts/build_data.py /path/to/au-nz-comparison
```

This writes `data/rates.js`. The requirement checklists live in `data/requirements.js`.

## Files

| File | What it does |
|---|---|
| `index.html`, `style.css`, `app.js` | The page |
| `data/rates.js` | Approvals and refusals by nationality, country and year (generated) |
| `data/requirements.js` | Requirement checklists and official links |
| `scripts/build_data.py` | Builds `data/rates.js` from the source tables |

## License

Code: MIT. Data: see the licences of the original Zenodo records.
