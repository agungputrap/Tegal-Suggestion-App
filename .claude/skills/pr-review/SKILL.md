---
name: pr-review
description: Use when reviewing a pull request or a diff before merge, or when asked to review a teammate's PR. Standardizes the review format, finding severity levels, verdicts, and inline-code suggestions so every member produces consistent reviews.
---

# PR Review

Team-standard way to review a pull request. Every member's AI produces the same structure, severity labels, and verdict so reviews are comparable.

## How to review

1. Read the PR description (what + why + issue refs).
2. Check it follows `git-flow`: branch from `development`, commit format `<type> #<issue>: <summary>`, one feature per branch.
3. Review the diff against the relevant checklist:
   - Backend changed → `code-review` skill (ownership, api-guidelines, security, tests)
   - Frontend changed → `code-review` skill (typecheck, lint, build, tests)
4. **Prefer inline comments over a wall of text.** Where an issue occurs, comment on that exact line/code block. When that's not possible, leave a general comment.
5. **Always tag the PR owner** (`@<owner>`) in every comment so they get notified.
6. Post the summary comment using the template below.

## Finding severity levels

| Level | Meaning | When to use |
| ----- | ------- | ----------- |
| **MAJOR** | Blocks merge. Bug, security issue, broken contract, missing validation, deviation from spec (`docs/tech-spec.md`, `docs/prd.md`) | Must be fixed before merge |
| **MINOR** | Should fix. Edge case, style inconsistency, missing test, small performance concern | Recommended to fix; doesn't block alone |
| **NITPICK** | Optional polish. Naming, tiny refactor, formatting nit | Nice-to-have, author's discretion |

## Verdicts

| Verdict | Meaning |
| ------- | ------- |
| **APPROVE** | No MAJOR findings; merge when ready |
| **APPROVE WITH COMMENTS** | No MAJOR findings, but MINOR/NITPICK items to consider; author may merge after addressing or acknowledging |
| **NEEDS CHANGES** | One or more MAJOR findings; must be fixed before merge |

Rule: any MAJOR finding → verdict is **NEEDS CHANGES**. Otherwise, minor/nitpick count → **APPROVE WITH COMMENTS** (or **APPROVE** if truly nothing).

## Review comment format

```
[LEVEL] [area] — short subject

Details (why, impact, what to change). Include a concrete suggestion.

```suggestion
// inline code suggestion when possible
```

@<owner> please address.
```

## Summary template (post as the PR's final comment)

```
## Review — <verdict>

**Verdict:** APPROVE | APPROVE WITH COMMENTS | NEEDS CHANGES

### Findings

| Severity | Area | Finding |
| -------- | ---- | ------- |
| MAJOR | api | `owner_token` leaked in public response |
| MINOR | map | cluster markers not tested |
| NITPICK | styles | class name `cardItem` vs kebab convention |

### Checklist
- [ ] Follows `git-flow` (branch, commit format `#<issue>`, one feature per branch)
- [ ] Definition of Done validation passed (see `docs/dev-standards.md`)
- [ ] Docs updated where needed (`docs/decisions.md`, `docs/tech-spec.md`)

### Notes
- Anything the author should know (risks, follow-ups, merge order).

@<owner> — summary above; see inline comments for details.
```

## Rules

- **Every comment tags the owner** (`@<owner>`). No exceptions.
- **Inline > general.** Comment on the exact line/block; only fall back to a general comment when there's no specific location.
- Be specific and kind: state the *why* and give a concrete suggestion — not just "this is wrong".
- Don't review style wars: defer to the formatters (Ruff/Prettier). NITPICK is for what the formatter can't catch.
- Never merge your own PR; the reviewer or the author merges after the author addresses feedback.
