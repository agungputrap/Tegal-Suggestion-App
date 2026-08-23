---
name: code-review
description: Checklist before merging to main. Use when reviewing a PR or diff for the Tegal Suggestion App team.
---

# Code Review Checklist

Both owners glance at every merge to `main` — this is the conflict-prevention system. Be brief but check all of this.

## Ownership & process

- [ ] Files changed are inside the author's owned area (`docs/ownership.md`). Shared files (`backend/app/schemas.py`, `docs/tech-spec.md`, `AGENTS.md`, `TASKS.md`) — did the other owner review?
- [ ] Commit messages say what changed and why.
- [ ] One feature per branch, branch named `feature/<name>`.

## API contract (if backend touched)

- [ ] Follows `/api-guidelines`: status codes, `{"detail": ...}` errors, Pydantic schemas.
- [ ] No `owner_token` leaked to public responses.
- [ ] `schemas.py` change flagged to frontend owner.

## Correctness & security

- [ ] No hardcoded credentials, secrets, or real API keys.
- [ ] All user input validated (WhatsApp number format, file type/size, text limits).
- [ ] No obvious SQL injection / path traversal in uploads or queries.
- [ ] Edge cases handled (empty list, closed business, null halal).

## Code quality

- [ ] Matches existing patterns in the codebase — no new one-off style.
- [ ] No dead code / commented-out blocks left behind.
- [ ] No over-engineering: only what the task required.

## Tests & run (Definition of Done — all must pass, show output)

- [ ] Backend: `cd backend && ruff check .` (lint) and `ruff format --check .` (format) pass.
- [ ] Backend: `cd backend && pytest` passes.
- [ ] Frontend: `cd frontend && npx tsc --noEmit` (typecheck) passes — catches compile errors.
- [ ] Frontend: `cd frontend && npm run lint` passes.
- [ ] Frontend: `cd frontend && npm run build` succeeds — catches build errors.
- [ ] Frontend: `cd frontend && npm test` passes.
- [ ] Ran it — feature works for the happy path and at least one edge case.

## Docs (the "nobody gets left behind" part)

- [ ] If the change affects the other side (schema, endpoint, dependency, stack): appended to `docs/decisions.md`.
- [ ] `docs/tech-spec.md` updated if behavior drifted from the spec.
- [ ] `TASKS.md` marks the task `[x]` with the commit hash.