# Tegal Suggestion App

Peta rekomendasi untuk warga dan pendatang di Tegal — **kuliner** (jajanan, makanan, lagi trending) dan **jasa rumah tangga** (service AC, service mesin cuci, perbaikan rumah) dalam satu aplikasi berbasis peta.

Suggestion map for Tegal residents & newcomers — **food** (snacks, meals, trending) and **household services** (AC cleaning, washing machine repair, house repair) on one map.

**Core mechanic:** a business only appears on the map when its owner opens it *today*. Buyers tap "Chat WhatsApp" — the order/booking happens entirely in WhatsApp. No in-app transactions.

## Features (MVP)

- Interactive map with clustered markers + list view
- Filter by category (food / service) and area (kecamatan)
- Business detail: items (menu / price-list), halal flag, WhatsApp CTA
- "Open today" status — owners open/close from a phone portal
- Trending sort by views/likes for the day
- Registration with WhatsApp verification

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Frontend | React + Vite + TypeScript, Tailwind + shadcn/ui, react-leaflet |
| Backend | FastAPI + SQLAlchemy |
| DB | SQLite (dev) / PostgreSQL (prod) |
| Deploy | Vercel/Netlify (FE), Render/Railway (API + DB) |

## Quick start

```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload     # API + Swagger at http://localhost:8000/docs

# frontend
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

Full run / seed / test / deploy instructions: [`docs/runbook.md`](docs/runbook.md)

## Docs

| Doc | What it is |
| --- | ---------- |
| [`docs/prd.md`](docs/prd.md) | Product requirements: problem, users, flows, acceptance criteria |
| [`docs/tech-spec.md`](docs/tech-spec.md) | Canonical spec: stack, data model, API contract |
| [`docs/dev-standards.md`](docs/dev-standards.md) | Coding conventions + validation (Definition of Done) |
| [`docs/ownership.md`](docs/ownership.md) | Who owns what (team) |
| [`docs/decisions.md`](docs/decisions.md) | Decision log |
| [`docs/runbook.md`](docs/runbook.md) | Run / seed / test / deploy commands |
| [`TASKS.md`](TASKS.md) | Live task ledger |
