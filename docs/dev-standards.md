# Development Standards — Frontend & Backend

> **The shared coding contract.** Every member's AI (whatever model/tool they use) reads this so output style is consistent across the team. Mutable conventions go here — update freely, but flag changes to the team.
> Test/validation commands must be run before *any* work is claimed done (see Definition of Done below).

---

## Part A — Common (both sides)

### Language & formatting

- **Python** backend, **TypeScript** frontend. No plain JS in frontend code.
- **Formatting is enforced by tools, not by taste:**
  - Backend: **Ruff** (format + lint)
  - Frontend: **Prettier** + **ESLint**
- When in doubt, match the surrounding code — but the formatter is the source of truth.

### Naming

| Thing | Convention | Example |
| ----- | ---------- | ------- |
| Files | kebab-case | `business-detail.tsx`, `open-session.py` |
| Python functions/vars | snake_case | `get_open_businesses()` |
| TS functions/vars | camelCase | `getOpenBusinesses()` |
| Python classes | PascalCase | `Business` |
| TS components/types | PascalCase | `BusinessCard`, `type BusinessDto` |
| DB columns | snake_case | `owner_token`, `is_open` |
| API JSON keys | snake_case | `{"owner_token": ...}` |
| Endpoints | kebab-case, plural | `/api/businesses` |

### Commits & branches

- Branch: `feat/<issue>-<name>` from `development` (one feature per branch)
- Commit: `<type> #<issue>: <summary>` — e.g. `feat #1: add business list`. Add a body only when the *why* isn't obvious.
- Merge to `development` via PR, never alone — other owner reviews (see `/pr-review`)

### Error handling

- Validate at the boundary (API input, form input, file uploads). Trust internal code.
- Never swallow errors silently. Log it or show the user a message.
- Backend errors → `{"detail": "..."}` (FastAPI shape). Frontend shows a toast/message.

---

## Part B — Backend (FastAPI + SQLAlchemy)

### Structure

```
backend/app/
├── main.py          # app factory, router registration
├── models.py        # SQLAlchemy models (Business, Item, OpenSession, Approval)
├── schemas.py       # Pydantic schemas — THE API CONTRACT (shared file)
├── seed.py          # demo data loader
└── routers/         # one file per resource: businesses.py, kelola.py, register.py
```

### Rules

- **Pydantic for all input/output** in `schemas.py`. No raw dict access.
- One router file per resource; register routers in `main.py`.
- DB access only inside the router handlers (no business logic in models).
- Public responses **never** include `owner_token` — serialize to a DTO in `schemas.py`.
- Use SQLAlchemy ORM, not raw SQL (except in seed.sql). Parametrize everything.
- Follow `/api-guidelines` skill for endpoints and status codes.

### Validation commands (run before claiming done)

```bash
cd backend
ruff check .        # lint + style — must pass
ruff format --check .   # formatting — must pass
pytest              # unit tests — must pass
python -m app.seed  # seed must run clean (smoke test)
```

---

## Part C — Frontend (React + Vite + TypeScript)

### Structure

```
frontend/src/
├── main.tsx            # entry
├── App.tsx             # routes
├── api/                # axios instance + typed API calls (one file per resource)
├── pages/              # one file per route: HomeMap.tsx, BusinessDetail.tsx, ...
├── components/         # reusable UI: BusinessCard.tsx, FilterBar.tsx, ...
├── lib/                # utils, formatters (currency, wa link builder)
└── types/              # TS types mirroring backend schemas
```

### Rules

- **TypeScript strict mode on.** No `any` unless truly unavoidable (then comment why).
- **All API calls go through `src/api/`** — typed functions, never raw axios in components.
- TS types in `src/types/` mirror the backend Pydantic schemas; keep them in sync when the contract changes.
- Components are function components + hooks. No class components.
- Use shadcn/ui primitives + Tailwind; don't hand-roll new UI primitives.
- Tailwind utility classes in the markup; keep custom CSS minimal.
- Pages fetch data with a small custom hook or plain `useEffect` — no state library for MVP.

### Validation commands (run before claiming done)

```bash
cd frontend
npx tsc --noEmit    # typecheck — must pass (catches compile errors)
npm run lint        # eslint — must pass
npm run build       # production build — must succeed (catches build errors)
npm test            # unit tests — must pass
```

---

## Part D — Unit Testing & Validation Strategy

### Why

"Does it work?" has two answers: **the compiler** (syntax/type/build errors) and **the tests** (runtime behavior). Both are automated so any member's AI can verify before merging — no manual "trust me, it runs."

### Backend: pytest + FastAPI TestClient

- Test **routers end-to-end** with FastAPI's `TestClient` against an in-memory SQLite DB (same code path as prod, no extra deps).
- `tests/` mirrors `app/`:

```
backend/tests/
├── conftest.py       # in-memory DB fixture + TestClient fixture
├── test_businesses.py
├── test_register.py
└── test_kelola.py    # owner portal: open/close/token auth
```

- Cover at minimum: list (open-today filter), detail, register + verify code, open/close flow, token auth (invalid token → 401), upload validation (bad type/size → 400).

### Frontend: Vitest + React Testing Library

- Vitest (Vite-native, fast) + @testing-library/react + jsdom.
- `*.test.tsx` next to the component or in `src/**/__tests__/`.
- Cover at minimum: filter behavior, business card rendering (open vs closed), detail page data rendering, WhatsApp link builder (number format).

### Definition of Done (every task, every member)

A task is **done** only when all of the following pass, verified by running the commands:

- [ ] Backend: `ruff check .`, `ruff format --check .`, `pytest` all green
- [ ] Frontend: `tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` all green
- [ ] App runs end-to-end: dev servers up, seed loaded, one happy path clicked through
- [ ] `docs/decisions.md` appended if the change affects the other side
- [ ] `TASKS.md` marked `[x]` with commit hash

---

## Part E — Model/AI usage agreement (team)

1. **Let the repo rules drive the AI.** Every member uses the same `AGENTS.md` + `docs/` + `.commandcode/skills/` — the model's "personal style" stays out of shared code. The formatters (Ruff/Prettier) are the final arbiter, not the model.
2. **Same validation commands for everyone.** The Definition of Done above is what every member's AI runs before merging. If your tool can't run a command, say so — don't skip it.
3. **Skills are the SOPs.** `/api-guidelines` and `/code-review` are the playbooks; extend them when the team agrees, not per-person.
4. **No per-person rules.** Personal preferences belong in your own `~/.commandcode/AGENTS.md`, never in the shared repo files.
