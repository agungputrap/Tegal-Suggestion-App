# Tegal Suggestion App

Peta rekomendasi untuk warga dan pendatang di Tegal — **kuliner** (jajanan, makanan, lagi trending) dan **jasa rumah tangga** (service AC, service mesin cuci, perbaikan rumah) dalam satu aplikasi berbasis peta.

Suggestion map for Tegal residents & newcomers — **food** (snacks, meals, trending) and **household services** (AC cleaning, washing machine repair, house repair) on one map.

**Core mechanic:** a business only appears on the map when its owner opens it *today*. Buyers tap "Chat WhatsApp" — the order/booking happens entirely in WhatsApp. No in-app transactions.

## Features (MVP)

- Interactive map with clustered markers (to do — emoji markers per category done, clustering pending) + list view
- Filter by category (food / service) and area (kecamatan) (to do — category filter done, area filter pending)
- Business detail: items (menu / price-list) (to do), halal flag (to do), WhatsApp CTA
- "Open today" status — owners open/close from a phone portal (to do — daily check-in ("open") done, close + `/kelola/{token}` portal pending)
- Trending sort by views/likes for the day (to do)
- Registration with WhatsApp verification (to do — registration form done, WA verify code + approval pending)

Beyond the original list, the adopted codebase also ships: provider photo upload (R2), search-radius filtering, and an admin panel (stats, moderation, category management).

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Frontend | React + Vite + TypeScript, custom CSS design tokens, Leaflet |
| Backend | Hono on Cloudflare Workers (TypeScript) |
| DB / cache / storage | Cloudflare D1 (SQLite) / KV / R2 |
| Deploy | Cloudflare Pages (frontend) + Workers (API) |

## Quick start

```bash
# backend
cd backend
npm install
npm run db:migrate:local          # schema + seeded categories (local D1)
cp .dev.vars.example .dev.vars    # set ADMIN_TOKEN for local admin login
npm run dev                       # API at http://localhost:8787

# frontend
cd frontend
npm install
cp .env.example .env              # VITE_API_URL=http://localhost:8787
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
