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
