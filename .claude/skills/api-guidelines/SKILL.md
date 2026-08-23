---
name: api-guidelines
description: API endpoint conventions and response format for this project (Tegal Suggestion App). Use when creating, editing, or reviewing backend endpoints or the API contract.
---

# API Guidelines

Canonical contract lives in `docs/tech-spec.md` — this skill is the quick-reference for how to write endpoints that fit it.

## Endpoint naming

- Base path: `/api`
- Plural nouns: `/api/businesses`, `/api/businesses/{slug}/items`
- Owner portal uses the magic token: `/api/kelola/{token}/open`

## Response format

- Always JSON.
- List endpoints return the collection directly (envelope TBD in `docs/tech-spec.md` — check it first).
- Errors use FastAPI's shape: `{"detail": "human readable message"}`.

## Status codes

| Code | When |
| ---- | ---- |
| 200 | success |
| 400 | validation error (e.g. bad WhatsApp number, missing field) |
| 401 | invalid/expired owner token |
| 404 | business or item not found |
| 409 | conflict (e.g. already registered today) |
| 500 | server error — never leak stack traces in `detail` |

## Rules

- All input goes through Pydantic schemas in `backend/app/schemas.py` — no raw dict parsing.
- `schemas.py` is a **shared file**: changing it requires the frontend owner's review (see `docs/ownership.md`).
- Never expose the `owner_token` in public responses — public endpoints return a `slug`, never the token.
- WhatsApp numbers stored in E.164 (`6281234567890`); validate with regex, show friendly errors.
- Image uploads: POST `/api/upload` multipart, returns `{"path": "..."}`. Reject files > 3MB and non-JPG/PNG/WebP.
- Owner mutations (`open`, `close`, `update`) are token-authenticated; public endpoints are read-only except `register`, `upload`, `report`.
