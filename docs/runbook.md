# Runbook

> How to run, seed, test, and deploy this project. Keep this current — it's the first place a teammate (or their AI) looks.

## Prerequisites

- Node.js 20+ (frontend and backend are both TypeScript)
- A Cloudflare account (free tier is enough) — only needed for `wrangler` resource creation and deploy, not for local dev
- Git

## Backend (Hono on Cloudflare Workers)

```bash
cd backend
npm install

# Local resources: none needed — wrangler dev simulates D1/KV/R2 locally.
# Apply schema + seed categories to the local D1:
npm run db:migrate:local

# Seed the Explorer dataset (76 F&B places from Google Maps) into local D1:
npm run db:seed:places

# Admin token for local dev (copy, then edit):
cp .dev.vars.example .dev.vars

npm run dev          # http://localhost:8787
```

Production resources (once, before first deploy):

```bash
npm run db:create        # -> paste database_id into wrangler.toml
npm run kv:create        # -> paste id into wrangler.toml
npx wrangler r2 bucket create jajan-jasa-photos
npx wrangler secret put ADMIN_TOKEN
npm run db:migrate:remote
npm run deploy
```

Smoke test:

```bash
curl http://localhost:8787/categories
curl -X POST http://localhost:8787/providers -H "Content-Type: application/json" \
  -d '{"name":"Tukang AC Pak Bud","phone":"08123456789","category_type":"jasa","category_id":"servis-ac","base_lat":-6.9219,"base_lng":109.1401}'
curl -X POST http://localhost:8787/checkins -H "Content-Type: application/json" \
  -d '{"provider_id":"<id_from_above>","lat":-6.9219,"lng":109.1401}'
curl "http://localhost:8787/listings?type=jasa&lat=-6.922&lng=109.14&radius=5"
```

Validation (must pass before claiming done):

```bash
cd backend
npm run typecheck    # tsc --noEmit
```

## Frontend (Vite + React SPA)

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8787 for local dev
npm run dev            # http://localhost:5173
npm run build          # production build to dist/
npm run preview        # serve the production build locally
```

Validation (must pass before claiming done):

```bash
cd frontend
npm run typecheck    # tsc --noEmit
npm run build        # production build must succeed
```

> Validasi tiap perubahan: `npm run lint` + `npm test` + `npm run typecheck`
> (dan `npm run build` untuk frontend) di sisi terkait.

Env vars:

| Var | Where | Dev default | Prod |
| --- | ----- | ----------- | ---- |
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8787` | Worker production URL (baked at build time — rebuild after changing) |
| `ADMIN_TOKEN` | `backend/.dev.vars` (local) / `wrangler secret` (prod) | any string | strong random token |

## Seed data

Skema dikelola lewat **d1 migrations** (`backend/migrations/`) — migrasi baseline menyemai tabel `categories` (gorengan, kue basah, servis AC, tukang, …), diterapkan oleh `db:migrate:local` / `db:migrate:remote`. Migrasi baru: `wrangler d1 migrations create <nama>` di `backend/`, tulis SQL, lalu apply sama seperti di atas. For demo-day provider data, register a few providers + checkins via the API (see smoke test above) or the Provider page in the frontend.

The Explorer page reads from the `places` table — seed it with `npm run db:seed:places` (local) or `npm run db:seed:places:remote` (production D1). Source: `backend/seeds/tegal-fnb.csv` (Google Maps export); the generated `backend/seed-places.sql` is gitignored — regenerate any time with the same command.

## Deploy

| Piece | Target | Notes |
| ----- | ------ | ----- |
| API | Cloudflare Workers | `cd backend && npm run deploy` |
| Frontend | Cloudflare Pages | deploy dari checkout `development`: `VITE_API_URL=<url worker produksi> npm run build`, lalu `npx wrangler pages deploy dist --project-name=jajan-jasa-web`. Production branch project Pages = **`development`** (diubah 2026-09-08, sebelumnya `feat/11-cloudflare-stack`); deploy dari branch lain hanya jadi Preview. `VITE_API_URL` dibake saat build — build dengan env dev jangan dipakai untuk produksi. |

Domain: connect a custom `.id` domain via Cloudflare DNS / Pages **Custom Domains** (a `.workers.dev` subdomain is not acceptable for the competition submission).

## Testing

- **Backend:** `npm test` — Vitest + `@cloudflare/vitest-pool-workers` (runtime Workers asli, migrasi D1 diterapkan otomatis ke DB test).
- **Frontend:** Vitest + React Testing Library + jsdom, `"test": "vitest run"` in `package.json`.

## AI tool setup (team conventions are multi-tool)

The team rules live once in `AGENTS.md` + `docs/` and are mirrored per tool so every member's AI follows them. **When you edit a skill or rule, update all mirrors** (they must stay identical):

| Tool | Reads rules from | Skills location |
| ---- | ---------------- | --------------- |
| Command Code | `AGENTS.md` | `.commandcode/skills/` |
| Claude Code | `AGENTS.md` / `CLAUDE.md` | `.claude/skills/` (also discovers `.agents/skills/`) |
| GitHub Copilot | `AGENTS.md` (repo instructions) | `.github/skills/` (also `.claude/skills/`, `.agents/skills/`) |
| Gemini CLI | `GEMINI.md` (self-contained copy) | n/a — rules in `GEMINI.md` |

Skills are the same content in each folder — copy on change, or symlink if your OS/team prefers. `GEMINI.md` is a self-contained copy of the AGENTS.md rules because Gemini doesn't read `AGENTS.md` by default.

## Git workflow (see `.commandcode/skills/git-flow`)

1. Branch from **`development`** (never `main`), name `feat/<issue>-<short-name>`
2. Commit format `<type> #<issue>: <summary>` (e.g. `feat #1: add business list`) — the AI writes these; make them say what changed and why
3. Validate (Definition of Done) before pushing; fix + recommit until all pass
4. `git fetch origin && git rebase origin/development` before pushing
5. Push, open a PR into `development`, other owner reviews (`/pr-review`), author merges after addressing feedback

### Updating `master` (release branch)

- `master` is a release snapshot; the daily loop is `development` only.
- To update `master`: open a PR **`development` → `master`** (same as a GitLab MR) and merge. GitHub does not delete `development` on merge.
- If the PR says "No commits between master and development", the branches are in sync — nothing to release.
