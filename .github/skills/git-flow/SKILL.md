---
name: git-flow
description: Use when developing a feature, making commits, or preparing to push work on a branch. Establishes the team's branch naming, conventional commit format with GitHub issue numbers, validation before commit, and push workflow.
---

# Git Flow — Feature Development

Team standard for turning a task into a merged-ready branch. Every member's AI follows this so branches, commits, and PRs look identical across the team.

## Branch naming

- Always branch from **`development`** (never `main`). `main` only receives merged PRs.
- Name: `feat/<github-issue-number>-<short-kebab-name>`

```
feat/12-add-business-list-endpoint
feat/7-owner-portal-open-close
```

- For a hotfix on `main`: `fix/<issue-number>-<short-kebab-name>`

## Commit format

Subject line format — `<type> #<issue>: <summary>`. One logical change per commit.

```
feat #1: add list businesses endpoint with trending sort
chore #4: bump seed data for demo day
```

| Type | Use |
| ---- | --- |
| `feat` | new feature |
| `fix` | bug fix |
| `refactor` | code change that doesn't fix a bug or add a feature |
| `test` | adding/updating tests |
| `docs` | documentation only |
| `chore` | tooling, dependencies, config |

Optional: add a body below the subject line explaining *why* when the change isn't obvious.

```
feat #1: add list businesses endpoint with trending sort

Map and list view need businesses sorted by daily views so
"trending" is surfaced on the home page without extra queries.
```

## The flow

1. **Sync** — `git checkout development && git pull --rebase`
2. **Branch** — `git checkout -b feat/<issue>-<short-name>`
3. **Implement** — make the change in small commits using the format above
4. **Validate** — run the Definition of Done for your side (see `docs/dev-standards.md`):
   - Backend: `ruff check .`, `ruff format --check .`, `pytest`
   - Frontend: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`
   - **If any command fails: fix the error, commit again (`fix #<issue>: ...`), and re-run until all pass.** Never push failing work.
5. **Update docs** if the change affects the other side — append to `docs/decisions.md` (AGENTS.md rule).
6. **Rebase** onto latest `development` before pushing: `git fetch origin && git rebase origin/development`
7. **Push** — `git push -u origin <branch>`
8. **PR** — open a PR into `development` (see `pr-review` skill for what the reviewer expects). Title: `feat #<issue>: <short summary>`. Body: what changed, why, validation output, any decisions logged.

## Common mistakes

| Mistake | Fix |
| ------- | --- |
| Branching from `main` | Always branch from `development` |
| Vague commit messages ("fix stuff") | Use `<type> #<issue>: <summary>` |
| Forgetting the issue number | Include `#<issue>` in the subject line |
| Pushing before validation | Definition of Done must pass first |
| Burying docs changes | Decision that affects the other side → `docs/decisions.md` |

## Rules

- One feature per branch. Never mix unrelated changes.
- Never merge your own PR. The other owner reviews (see `docs/ownership.md`).
- Never push directly to `development` or `main` — feature branches and PRs only.
