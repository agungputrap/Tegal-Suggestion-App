# GEMINI.md — Project Context (Gemini CLI)

> Gemini CLI reads this file as project context on every prompt (it does not read `AGENTS.md` by default). This is a self-contained copy of the team rules so Gemini-based members follow the same conventions as Command Code / Claude Code / Copilot members. If a rule here and a `docs/` file disagree, the `docs/` file is canonical.

## Project

Suggestion app for Tegal: food (snacks, meals, trending) + household services (AC cleaning, washing machine repair, house repair) on one map. Hackathon MVP.

- Product requirements: `docs/prd.md` — read before starting new feature work.
- Canonical spec (stack, data model, API contract): `docs/tech-spec.md`.
- Development standards (naming, structure, validation): `docs/dev-standards.md`.

## Before you edit anything

1. `docs/ownership.md` — only touch files in your owned area; shared files need the other owner's review.
2. If the task touches the API or data model, read `docs/tech-spec.md` first.
3. If writing code, read `docs/dev-standards.md` (Definition of Done).
4. Check `TASKS.md` so you don't collide with someone else's work.

## Commands

- Frontend: `cd frontend && npm run dev` — tests: `npm test`
- Backend: `cd backend && uvicorn app.main:app --reload` (docs at `/docs`) — tests: `pytest`
- Validation: see Definition of Done in `docs/dev-standards.md` (backend: `ruff check .`, `ruff format --check .`, `pytest`; frontend: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`)

## Git workflow

- Branch `feat/<issue>-<name>` from **`development`** (never `main`), one feature per branch.
- Commit format: `<type> #<issue>: <summary>` (e.g. `feat #1: add business list`).
- Validate before pushing (Definition of Done); fix and recommit if tests error.
- Never push directly to `development`/`main`. PRs into `development` merge via review.
- After any decision that affects the other side, append to `docs/decisions.md` — one dated entry with a one-line "why".

## Ownership

- `backend/` — Arief
- `frontend/` — Budi
- Shared (both review): `backend/app/schemas.py`, `docs/`, `AGENTS.md`/`GEMINI.md`, `TASKS.md`
