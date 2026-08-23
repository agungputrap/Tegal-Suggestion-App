# Runbook

> How to run, seed, test, and deploy this project. Keep this current — it's the first place a teammate (or their AI) looks.

## Prerequisites

- Node.js 20+ (frontend)
- Python 3.11+ (backend)
- Git

## Frontend (Vite React)

```bash
cd frontend
npm install
npm run dev        # dev server with HMR, default http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the production build locally

# validation (must all pass before claiming done)
npx tsc --noEmit   # typecheck — catches compile errors
npm run lint       # eslint
npm test           # vitest unit tests
```

## Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload    # dev server, Swagger docs at http://localhost:8000/docs

# validation (must all pass before claiming done)
ruff check .             # lint + style
ruff format --check .    # formatting
pytest                   # unit tests (FastAPI TestClient + in-memory SQLite)
```

Env vars (copy `.env.example` to `.env`):

| Var | Dev default | Prod |
| --- | ----------- | ---- |
| `DATABASE_URL` | `sqlite:///./app.db` | Postgres URL |
| `UPLOAD_DIR` | `./uploads` | Cloudinary/Supabase storage |

## Testing setup (do once when the repos are scaffolded)

- **Backend:** `pytest` + FastAPI `TestClient`, tests in `backend/tests/` with an in-memory SQLite fixture. Add `pytest` and `httpx` (TestClient dep) to `requirements.txt` / a `requirements-dev.txt`.
- **Frontend:** Vitest + React Testing Library + jsdom (`npm i -D vitest @testing-library/react jsdom`), `"test": "vitest run"` script in `package.json`.

## Seed data

```bash
cd backend
# loads demo businesses (food + service) so the map is alive on demo day
python -m app.seed        # or: psql $DATABASE_URL -f seed.sql
```

## Tests

```bash
# backend — pytest + FastAPI TestClient (in-memory SQLite)
cd backend && pytest

# frontend — Vitest + React Testing Library
cd frontend && npm test
```

See `docs/dev-standards.md` Part D for what tests must cover and the full Definition of Done.

## Deploy

| Piece | Target | Notes |
| ----- | ------ | ----- |
| API + DB | Render / Railway | set `DATABASE_URL` to Postgres |
| Frontend | Vercel / Netlify | build `npm run build`, serve `dist/` |

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
