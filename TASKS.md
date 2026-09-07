# TASKS.md — Live Task Ledger

> **Mutable, superseded daily.** One owner per task; shared files get a reviewer line. The AI reads this before starting work and updates it after finishing.
> When a task is done, mark it `[x]` and keep the commit hash — it's the handoff record for teammates.

> **2026-08-24:** Stack migrated to Cloudflare (see `docs/decisions.md`). Tasks below are re-scoped to the adopted codebase — several original FastAPI-era tasks were completed or superseded by the adoption (#11).

## Active

- [ ] #4b Backend: trending sort (views per day) on `/listings` — Arief
- [ ] #5 Frontend: provider detail view (from `ListingCard`) — Budi. _Filters + list done via adoption._
- [ ] #6 Registration: WhatsApp verify code + admin approval flow — Arief. _Plain registration exists; verify code pending._
- [ ] #7 Owner portal (`/kelola/{token}`): open/close today — Arief, **Budi reviews** (frontend page)
- [ ] #8 Test infra backend: Vitest + `@cloudflare/vitest-pool-workers` (local D1/KV/R2) — Arief
- [ ] #9 Test infra frontend: Vitest + React Testing Library + jsdom — Budi
- [ ] #10 Lint/format setup: ESLint + Prettier (both sides — TypeScript everywhere now) — Arief, **Budi reviews**
- [ ] #12 Backend: `items` table (menu / service price-list) + endpoints — Arief, **Budi reviews** (contract)
- [ ] #13 Frontend: items on provider detail (menu/price-list) — Budi
- [ ] #14 Filter by area (kecamatan) + halal flag for food — Arief + Budi (split backend/frontend)
- [ ] #15 Explorer polish: code-split the 628 kB bundle (chart.js/markercluster lazy-load), photo thumbnails retry — Budi

## Done

- [x] #16 Explorer page: port `ref/index.html` F&B dashboard to React + seed `places` from `tegal-fnb.csv` (schema + `GET /places` + `db:seed:places`) — **both review** (shared: `schema.sql`, `types.ts`, tech-spec) — validated: typecheck/build green both sides, e2e in browser
- [x] #11 Adopt `ref/` implementation as the codebase (`frontend/` + `backend/`), sync all docs — **both review** (shared files)
- [x] #1 Backend data model — superseded by adoption: `categories` + `providers` + `checkins` in `backend/schema.sql` (#11)
- [x] #2 Frontend: Vite skeleton + map with markers — done via adoption (#11)
- [x] #3 API contract v1 — superseded: contract now in `backend/src/types.ts` + `docs/tech-spec.md` (#11)
- [x] #4a Backend: list/detail endpoints (`/listings`, `/providers/:id`) — done via adoption; trending sort split to #4b (#11)

## Backlog (explicitly cut from MVP, post-hackathon)

- In-app payments, delivery, chat, reviews/ratings
- Photo contribution + moderation
- Story-card / OG image generation
- Real user accounts (provider WhatsApp OTP, multi-admin roles)
