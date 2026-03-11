# Avoma Calls Dashboard

Simple static dashboard for visualizing Avoma meeting/call data.

## Features
- Date-range filter (`from_date` and `to_date`)
- Auto-pagination across all API pages
- KPI summary cards (total calls, average duration, completed calls)
- Line chart for call volume trend by day
- Pie charts for call type and outcome distributions
- Detailed call table with links to Avoma meeting URLs

## Run locally
```bash
python3 -m http.server 4173
```
Open: `http://localhost:4173`

## API configuration
The dashboard calls:
- `GET https://platform-api.avoma.com/v1/meetings/`
- Header `X-Avoma-API-Type: platform`
- Header `Authorization: Bearer <token>`

Paste your token into the UI field to load data.
