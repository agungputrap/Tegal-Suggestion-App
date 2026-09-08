# Decision Log

> **Append-only.** Every meaningful decision (contract change, schema change, new dependency, new endpoint, stack change) gets a new entry — no editing or deleting old entries.
> Rule in `AGENTS.md` requires the AI to append here after any decision that affects the other side.

## 2026-08-23 — Initial scaffolding

- **Decision:** Team will develop with AI assistance. Standardize via repo-root `AGENTS.md` (standing rules) + `.commandcode/skills/` (on-demand playbooks, per the Agent Skills open standard at agentskills.io).
- **Structure:** Docs live in `docs/` — `tech-spec.md` (canonical spec), `ownership.md` (who owns what), `decisions.md` (this log), `runbook.md` (commands).
- **Ownership model:** backend / frontend split, with `schemas.py` + docs as shared review points. See `docs/ownership.md`.
- **Why:** Keeps mutable info (ownership, decisions) out of AGENTS.md so the rules file stays stable; AI agents read the docs on demand so nobody is left behind on recent changes.

## 2026-08-23 — MVP scope locked

- **Decision:** Mirror the reference app ("Jajan Apa di Malang") mechanics: no in-app payments/chat/orders, WhatsApp is the interaction layer, owner "login" is a magic token in the URL, admin approval via WhatsApp code handoff, "open today" as the freshness signal.
- **Two verticals on one map:** `food` (snacks, meals, trending) and `service` (AC cleaning, washing machine repair, house repair) share one `businesses` + one `items` table.
- **Stack:** React + Vite + Tailwind + shadcn/ui + react-leaflet frontend; FastAPI + SQLAlchemy backend; SQLite dev / Postgres prod. Full detail in `docs/tech-spec.md`.
- **Why:** Minimal viable product for a 1-week hackathon; everything else cut explicitly.

## 2026-08-23 — Shared development standards & validation strategy

- **Decision:** Added `docs/dev-standards.md` as the shared coding contract for both sides — naming, structure, error handling, and model/AI usage agreement — so every member's AI produces consistent output regardless of model or tool.
- **Validation stack (Definition of Done):** Backend = Ruff (lint + format) + pytest with FastAPI TestClient on in-memory SQLite; Frontend = `tsc --noEmit` + ESLint + `npm run build` + Vitest with React Testing Library. Every task must pass its side's commands before it is considered done.
- **Why:** "It works" needs automated proof (compile/type/build + runtime tests); standardizing commands makes the checks identical for every member's AI.

## 2026-08-23 — PRD & README added

- **Decision:** Added `docs/prd.md` (product side: problem, personas, 3 core flows, acceptance criteria, demo-day success metrics, out-of-scope) complementing `docs/tech-spec.md`, and `README.md` as the repo front door (what/stack/quick-start, links to all docs).
- **Why:** A PRD prevents teammates building different apps from an unwritten "why"; README is the first thing judges and new teammates see. PRD kept to 2 pages — hackathon MVP, not a backlog.

## 2026-08-23 — Git flow & PR review standardized

- **Decision:** Added two team skills. `git-flow`: feature branches `feat/<issue>-<name>` from `development` (never `main`), commit format `<type> #<issue>: <summary>` (e.g. `feat #1: add business list`), Definition-of-Done validation before push, rebase onto `development`, PR into `development`. `pr-review`: standard summary template, severity levels (MAJOR / MINOR / NITPICK — any MAJOR = NEEDS CHANGES), verdicts (APPROVE / APPROVE WITH COMMENTS / NEEDS CHANGES), inline code suggestions preferred over general comments, owner `@`-tagged on every comment.
- **Base branch changed to `development`:** `main` only receives merged PRs.
- **Why:** Standardize branch/commit/PR output so all members' AIs produce identical, reviewable artifacts; keep `main` protected and make reviews comparable.

## 2026-08-23 — Multi-tool AI support (Claude Code, Copilot, Gemini)

- **Decision:** Mirrored the team skills into `.claude/skills/` (Claude Code discovery) and `.github/skills/` (Copilot discovery), and added `GEMINI.md` (self-contained project rules for Gemini CLI, which doesn't read `AGENTS.md` by default). All mirrors must stay identical to `.commandcode/skills/`.
- **Why:** Members use different AI tools; the skills + rules need to be recognized by each tool's native discovery so output stays consistent across the team.

## 2026-08-24 — Stack migrated to Cloudflare (FastAPI → Hono Workers)

- **Decision:** Adopted the working implementation from `ref/` (built by Claude) as the actual codebase: `ref/jajan-jasa-web` → `frontend/`, `ref/jajan-jasa-worker` → `backend/`. Backend is now **Hono on Cloudflare Workers** (D1 + KV + R2 + Cron); frontend stays React + Vite + TS but uses custom CSS design tokens instead of Tailwind/shadcn and plain Leaflet instead of react-leaflet. Deploy target is Cloudflare Pages + Workers (free tier) instead of Render/Railway + Vercel/Netlify.
- **API contract changed:** error shape is now `{"error": ...}` (was FastAPI `{"detail": ...}`); no `/api` prefix; data model is `categories` / `providers` / `checkins` (was `businesses` / `items` / `open_sessions` / `approvals`). The API contract shapes now live in `backend/src/types.ts` + `docs/tech-spec.md` (was `backend/app/schemas.py`).
- **Not yet ported from the old spec:** items (menu/price-list), WhatsApp verify code, owner portal `/kelola/{token}`, trending sort, area filter, halal flag — tracked as gaps in `docs/tech-spec.md` and `TASKS.md`.
- **Why:** the `ref/` implementation already ran end-to-end (register → checkin → map listings) and hosts free on Cloudflare; rewriting it in FastAPI would cost the hackathon week for zero user-visible gain. FastAPI on Cloudflare Python Workers was evaluated and rejected (Pyodide package limits, no SQLAlchemy/psycopg, rewrite of the DB layer anyway).
- **Review note:** this touches shared files (`docs/tech-spec.md`, `AGENTS.md`, `TASKS.md`, ownership map) — both owners must review before merge.

## 2026-09-07 — Explorer page: port ref F&B dashboard + seed 76 GMaps places

- **Decision:** The app's landing page is now the "Tegal F&B Explorer" — a React port of the `ref/index.html` dashboard (banner, glass header + 4 tabs, KPI cards, Direktori grid/list/table/split views, full map, analytics dashboard, favorites + comparison, place modal). The old app (Cari / Jualan-Jasa Saya / Admin, mobile shell) stays reachable from the Explorer header ("Buka Hari Ini" + admin buttons) and keeps its own bottom nav.
- **Schema change (shared file):** new `places` table in `backend/schema.sql` — read-only reference dataset of 76 F&B places scraped from Google Maps (`tegal-fnb.csv`). Seeded via `npm run db:seed:places` (parses `backend/seeds/tegal-fnb.csv` with papaparse → `seed-places.sql` → D1). Columns `open_hours`/`popular_times`/`images`/`about`/`user_reviews`/`reviews_per_rating` are stored as JSON **strings** on purpose: `GET /places` returns ~1.6 MB, and parsing it in the Worker would risk the 10 ms free-tier CPU limit — the frontend parses once on load.
- **New endpoint:** `GET /places` (public, no params) → `{ count, places: [...] }`. Frontend does all filtering/sorting client-side, same as the ref.
- **New frontend dependencies:** `tailwindcss` + `@tailwindcss/vite` (v4 — supersedes the "no Tailwind" rule from 2026-08-24; utilities are imported **without preflight** so legacy pages keep their custom-CSS look), `chart.js`, `leaflet.markercluster` (+types), papaparse (backend devDep, seed only). FontAwesome + Plus Jakarta Sans load from CDN (network is required anyway for OSM tiles & GMaps photos).
- **Why:** demo-day visual impact — the Explorer shows real Tegal F&B data with analytics out of the box; the check-in MVP flow stays one click away for the live demo.
- **Review note:** touches shared files (`backend/schema.sql`, `backend/src/types.ts`, `docs/tech-spec.md`) — backend owner please review the places contract; frontend owner review the App.tsx restructure.

## 2026-09-08 — Fase 0 fondasi: adopsi d1 migrations + split route backend

- **Decision (migration):** skema D1 kini dikelola lewat **`wrangler d1 migrations`** (`backend/migrations/`, baseline = `0001_baseline.sql`), bukan lagi `schema.sql` tunggal. Alasan: SQLite tidak punya `ADD COLUMN IF NOT EXISTS`; fitur baru (items, approval, portal, trending) butuh kolom baru yang harus terlacak & idempotent per environment. Script `db:migrate:local|remote` sekarang menjalankan `d1 migrations apply`. `backend/schema.sql` dihapus (isi pindah utuh ke baseline). File bersama `backend/schema.sql` di AGENTS.md/ownership diganti `backend/migrations/`.
- **Decision (route split):** `backend/src/index.ts` (542 baris) sudah melampaui ambang ~500 baris di dev-standards → dipecah satu file per resource (`src/routes/{places,categories,providers,checkins,listings,photos,admin}.ts`) + `src/middleware.ts` (adminAuth), `src/constants.ts`, `src/cache.ts` (`invalidateListingsCache`), `src/expire-checkins.ts` (cron). `index.ts` jadi komposisi tipis (~33 baris). Tanpa perubahan perilaku.
- **Skill update:** `api-guidelines` (3 mirror) disinkronkan ke kontrak aktual (Hono, tanpa prefix `/api`, error `{"error": ...}`, upload raw-bytes 5MB, owner token tak pernah expose).
- **Why:** fondasi bersih sebelum implementasi to-do (#4b/#5/#6/#7/#12–#15) supaya tiap fitur masuk ke module kecil yang testable, bukan nambah file yang sudah terlalu besar.
- **Review note:** menyentuh AGENTS.md, ownership.md, dev-standards, tech-spec, runbook — kedua owner mohon review.
