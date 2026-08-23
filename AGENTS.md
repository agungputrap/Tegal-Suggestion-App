# AGENTS.md — Team Rules for AI Agents

This file is read by the AI on every turn. It must stay **lean and stable** — mutable info lives in `docs/` and is read on demand. Keep it to standing rules only.

## Project

Suggestion app for Tegal: food (snacks, meals, trending) + household services (AC cleaning, washing machine repair, house repair) on one map. Hackathon MVP.

Product requirements live in `docs/prd.md` — read it before starting new feature work.

## Before you edit anything

1. Read `docs/ownership.md` — only touch files inside your owned area. Shared files (see below) require the other owner's review.
2. If the task touches the API, data model, or a dependency: read `docs/tech-spec.md` first — it is the canonical spec.
3. If writing/editing code: read `docs/dev-standards.md` — naming, structure, and validation commands (the Definition of Done).
4. Check `TASKS.md` for what's in progress so you don't collide with someone else's work.

## Commands

See `docs/runbook.md` for run / seed / test / deploy commands. Quick reference:

- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && uvicorn app.main:app --reload` (docs at `/docs`)
- Tests: `pytest` (backend), `npm test` (frontend)

## Ownership & shared files

- `backend/` — Arief
- `frontend/` — Budi
- Shared, both review: `backend/app/schemas.py`, `docs/tech-spec.md`, `AGENTS.md`, `TASKS.md`
- Never edit files outside your owned area without flagging it in the PR description.

## After any decision that affects the other side

Append to `docs/decisions.md` — contract change, schema change, new dependency, new endpoint, stack change. One entry, dated, with a one-line "why". This is how nobody gets left behind.

## Code style

- Follow existing patterns in the codebase. When in doubt, match the surrounding code.
- API responses use the envelope and error shape in `docs/tech-spec.md` (FastAPI `{"detail": ...}`).
- Git workflow (see `.commandcode/skills/git-flow`): branch `feat/<issue>-<name>` from **`development`**, commit format `<type> #<issue>: <summary>`, never push to `development`/`main` directly, PRs merge via review.

## Validation (before claiming anything done)

- A task is not done until its validation commands pass — see the Definition of Done in `docs/dev-standards.md`.
- Backend: `ruff check .`, `ruff format --check .`, `pytest`
- Frontend: `tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`
- Never claim "it works" without running the commands and showing the output.

## Skills

Team playbooks live in `.commandcode/skills/` (Agent Skills open standard), mirrored to `.claude/skills/` (Claude Code) and `.github/skills/` (Copilot) — **keep mirrors identical when editing**. Use them when the task matches:

- `/git-flow` — feature development: branch from `development`, commits `<type> #<issue>: <summary>`, validate, push
- `/api-guidelines` — API endpoint conventions and response format
- `/code-review` — checklist before merging
- `/pr-review` — review a PR: standard template, severity levels, verdict, inline suggestions
