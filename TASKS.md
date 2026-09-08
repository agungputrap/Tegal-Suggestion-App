# TASKS.md — Live Task Ledger

> **Mutable, superseded daily.** One owner per task; shared files get a reviewer line. The AI reads this before starting work and updates it after finishing.
> When a task is done, mark it `[x]` and keep the commit hash — it's the handoff record for teammates.

> **2026-09-08:** Batch implementasi to-do MVP selesai (fase 0–6, PR #9–#16). Rincian keputusan di `docs/decisions.md`.

## Active

- [ ] #4a-lanjutan Provider detail sebagai halaman penuh (saat ini modal dari ListingCard) — Budi

## Done

- [x] #15 Frontend polish: code-split bundle (entry 628KB → 210KB), styles.css dipangkas, retry foto — Budi
- [x] #14 Filter by area (kecamatan, dropdown statis) + halal flag (food-only) — Arief + Budi
- [x] #13 Frontend: items di detail penyedia (modal) — Budi
- [x] #12 Backend: tabel `items` + endpoint publik/portal — Arief, **Budi reviews** (contract)
- [x] #10 Lint/format: ESLint flat config + Prettier (kedua sisi) — Arief, **Budi reviews**
- [x] #9 Test infra frontend: Vitest + RTL + jsdom (8 test) — Budi
- [x] #8 Test infra backend: Vitest + `@cloudflare/vitest-pool-workers` (13 test, D1 migrasi otomatis) — Arief
- [x] #7 Owner portal `/kelola/{token}`: buka/tutup hari ini + pilih item + catatan + edit usaha — Arief, **Budi reviews** (frontend)
- [x] #6 Registrasi: verify code 6 digit + approval admin (alur WhatsApp manual sesuai PRD Flow B) — Arief, **Budi reviews** (frontend)
- [x] #5 Frontend: provider detail view (modal dari ListingCard) — Budi
- [x] #4b Backend: trending sort (`/listings?sort=trending`, views per hari via `provider_views`) — Arief
- [x] #16 Explorer page: port `ref/index.html` F&B dashboard ke React + seed `places` dari `tegal-fnb.csv` (schema + `GET /places` + `db:seed:places`) — **both review** (shared: `schema.sql`→migrations, `types.ts`, tech-spec)
- [x] #11 Adopt `ref/` implementation as the codebase (`frontend/` + `backend/`), sync all docs — **both review** (shared files)
- [x] #1 Backend data model — superseded by adoption: `categories` + `providers` + `checkins` in `backend/migrations/` (#11)
- [x] #2 Frontend: Vite skeleton + map with markers — done via adoption (#11)
- [x] #3 API contract v1 — superseded: contract now in `backend/src/types.ts` + `docs/tech-spec.md` (#11)
- [x] #4a Backend: list/detail endpoints (`/listings`, `/providers/:id`) — done via adoption; trending sort split to #4b (#11)

## Backlog (explicitly cut from MVP, post-hackathon)

- In-app payments, delivery, chat, reviews/ratings
- Photo contribution + moderation
- Story-card / OG image generation
- Real user accounts (provider WhatsApp OTP, multi-admin roles)
