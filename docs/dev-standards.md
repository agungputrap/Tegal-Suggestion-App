# Development Standards — Frontend & Backend

> **The shared coding contract.** Every member's AI (whatever model/tool they use) reads this so output style is consistent across the team. Mutable conventions go here — update freely, but flag changes to the team.
> Test/validation commands must be run before *any* work is claimed done (see Definition of Done below).

---

## Part A — Common (both sides)

### Language & formatting

- **TypeScript everywhere** — frontend (React + Vite) and backend (Hono on Cloudflare Workers). No plain JS.
- **Formatting is enforced by tools, not by taste** — Prettier + ESLint (flat config di root). Jalankan `npm run lint` / `npm run format` sebelum commit.
- When in doubt, match the surrounding code — but the formatter is the source of truth.

### Naming

| Thing | Convention | Example |
| ----- | ---------- | ------- |
| Files | kebab-case | `listing-card.tsx`, `expire-checkins.ts` |
| TS functions/vars | camelCase | `getActiveListings()` |
| TS components/types | PascalCase | `ListingCard`, `type ActiveListing` |
| DB columns | snake_case | `provider_id`, `is_active` |
| API JSON keys | snake_case | `{"category_id": ...}` |
| Endpoints | kebab-case, plural | `/providers`, `/checkins` |

### Commits & branches

- Branch: `feat/<issue>-<name>` from `development` (one feature per branch)
- Commit: `<type> #<issue>: <summary>` — e.g. `feat #1: add business list`. Add a body only when the *why* isn't obvious.
- Merge to `development` via PR, never alone — other owner reviews (see `/pr-review`)

### Error handling

- Validate at the boundary (API input, form input, file uploads). Trust internal code.
- Never swallow errors silently. Log it or show the user a message.
- Backend errors → `{"error": "..."}` with an appropriate HTTP status. Frontend shows a toast/message.

---

## Part B — Backend (Hono on Cloudflare Workers)

### Structure

```
backend/
├── src/
│   ├── index.ts       # routes + scheduled (cron) handler
│   ├── types.ts       # Env bindings + entity types (THE API CONTRACT shapes — shared)
│   └── geo.ts         # bounding box, haversine, todayJakarta()
├── migrations/        # D1 migrations (baseline + perubahan skema, wrangler d1 migrations)
├── wrangler.toml      # D1/KV/R2 bindings, cron trigger (NO secrets in here)
└── .dev.vars          # local secrets (gitignored; see .dev.vars.example)
```

### Rules

- **D1 is the source of truth.** KV (`ACTIVE_CACHE`) is cache only — writes delete cache keys, never write to KV directly.
- Parametrize **all** SQL with `.bind()` — no string interpolation into queries.
- Secrets (`ADMIN_TOKEN`) go in `.dev.vars` locally and `wrangler secret` in prod. Never in `wrangler.toml`.
- CPU time is limited on the Workers free tier (10ms/request): prefilter with cheap SQL (bounding box) before expensive math (haversine).
- Route files: routes currently live in `index.ts`; when it grows past ~500 lines, split one file per resource (`src/routes/admin.ts`, …) and register in `index.ts`.
- "Today" always means Jakarta time — use `todayJakarta()` from `geo.ts`, never `new Date()` directly.
- Follow `/api-guidelines` skill for endpoints and status codes.

### Validation commands (run before claiming done)

```bash
cd backend
npm run typecheck       # tsc --noEmit — must pass
npm run dev             # boots clean (smoke test)
# unit tests wajib: vitest + @cloudflare/vitest-pool-workers (test/)
```

---

## Part C — Frontend (React + Vite + TypeScript)

### Structure

```
frontend/src/
├── main.tsx            # entry
├── App.tsx             # top-level page switching (Consumer / Provider / Admin)
├── api.ts, adminApi.ts # typed API calls — public vs admin
├── pages/              # ConsumerPage.tsx, ProviderPage.tsx, AdminPage.tsx
├── components/         # MapView.tsx, ListingCard.tsx, CategoryFilter.tsx, PhotoUpload.tsx
├── storage.ts          # localStorage helpers (provider identity, admin token)
└── styles.css          # design tokens + custom CSS (no Tailwind — see decisions.md)
```

### Rules

- **TypeScript strict mode on.** No `any` unless truly unavoidable (then comment why).
- **All API calls go through `api.ts` / `adminApi.ts`** — typed functions, never raw `fetch` in components.
- Components are function components + hooks. No class components.
- Styling: custom CSS with design tokens in `styles.css` (market-morning palette, tiered radii, distinct button classes). Don't add Tailwind/component libraries without a team decision (see `docs/decisions.md`).
- Map markers use emoji icons from the `categories` table via `L.divIcon` — adding a category must not require frontend changes.
- Pages fetch data with a small custom hook or plain `useEffect` — no state library for MVP.

### Validation commands (run before claiming done)

```bash
cd frontend
npm run typecheck    # tsc --noEmit — must pass
npm run build        # production build — must succeed
# lint + unit tests wajib: eslint + vitest (RTL + jsdom, test/)
```

---

## Part D — Unit Testing & Validation Strategy

### Why

"Does it work?" has two answers: **the compiler** (syntax/type/build errors) and **the tests** (runtime behavior). Both are automated so any member's AI can verify before merging — no manual "trust me, it runs."

### Backend: Vitest + `@cloudflare/vitest-pool-workers`

- Tests run inside the real Workers runtime with local D1/KV/R2 bindings.
- Cover at minimum: register validation, checkin idempotency (same day upsert), listings radius filter, suspended provider hidden, admin auth (bad token → 401), photo upload validation (bad type → 400, oversize → 413).

### Frontend: Vitest + React Testing Library + jsdom

- Vitest (Vite-native, fast) + @testing-library/react + jsdom.
- `*.test.tsx` next to the component or in `src/**/__tests__/`.
- Cover at minimum: filter behavior, listing card rendering (active vs inactive), WhatsApp link builder (number format).

### Definition of Done (every task, every member)

A task is **done** only when all of the following pass, verified by running the commands:

- [ ] Backend: `npm run typecheck` green, dev server boots, happy path smoke-tested via curl
- [ ] Frontend: `npm run typecheck` green, `npm run build` succeeds
- [ ] App runs end-to-end: both dev servers up, one happy path clicked through
- [ ] `docs/decisions.md` appended if the change affects the other side
- [ ] `TASKS.md` marked `[x]` with commit hash
- [ ] `npm test` + `npm run lint` hijau di kedua sisi

---

## Part E — Model/AI usage agreement (team)

1. **Let the repo rules drive the AI.** Every member uses the same `AGENTS.md` + `docs/` + `.commandcode/skills/` — the model's "personal style" stays out of shared code. The formatters are the final arbiter, not the model.
2. **Same validation commands for everyone.** The Definition of Done above is what every member's AI runs before merging. If your tool can't run a command, say so — don't skip it.
3. **Skills are the SOPs.** `/api-guidelines` and `/code-review` are the playbooks; extend them when the team agrees, not per-person.
4. **No per-person rules.** Personal preferences belong in your own `~/.commandcode/AGENTS.md`, never in the shared repo files.
