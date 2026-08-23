# Ownership Map

> **This file changes as the team changes.** Update it when someone joins, leaves, or switches areas.
> It is the arbiter when two people's work touches the same files: the owner of the module resolves the conflict, the other adapts.

## Current owners

| Area | Owner | Contact |
| ---- | ----- | ------- |
| `backend/` | Arief | |
| `frontend/` | Budi | |
| `docs/`, `AGENTS.md`, `TASKS.md` | **Team** — any change = both review | |

## Shared files (no single owner)

These are the coordination points. Changes require the other person's review before merge:

- `backend/app/schemas.py` — the API contract (frontend depends on it)
- `docs/` — `tech-spec.md` (canonical spec), `prd.md` (product), `dev-standards.md` (conventions), `decisions.md` (log), `runbook.md`, `ownership.md`
- `README.md` — repo front door
- `AGENTS.md`, `TASKS.md` — team conventions and ledger

## Rules

1. Only touch files inside your owned area without asking.
2. Touching a shared file = PR + the other owner's review.
3. When 3rd/4th person joins: add them as a **feature pair** — one backend + one frontend feature each — and slot them into the table above. Give them one small area to own outright so the map stays unambiguous.
4. Conflict resolution: the module owner keeps their version and merges the other's intent; the other person adapts.

## Joining / leaving

- **Joining:** assign a small owned area first (e.g. `backend/app/routers/` or `frontend/src/pages/`), then expand.
- **Leaving:** hand off by pointing the successor at your branches + commits + a one-paragraph note in `TASKS.md`. Ownership transfers in this file.
