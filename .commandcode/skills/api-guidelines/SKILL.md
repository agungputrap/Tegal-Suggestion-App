---
name: api-guidelines
description: API endpoint conventions and response format for this project (Tegal Suggestion App). Use when creating, editing, or reviewing backend endpoints or the API contract.
---

# API Guidelines

Canonical contract lives in `docs/tech-spec.md` — this skill is the quick-reference for how to write endpoints that fit it. Stack: Hono on Cloudflare Workers + D1/KV/R2 (routes live in `backend/src/routes/`, one file per resource).

## Endpoint naming

- Base path: `/` (no `/api` prefix)
- Plural nouns: `/providers`, `/checkins`, `/listings`, `/places`
- Admin group: `/admin/*` (Bearer `ADMIN_TOKEN`, middleware `adminAuth`)
- Owner portal uses the magic token in the path: `/kelola/{token}/open`, `/kelola/{token}/close` — never in a query string

## Response format

- Always JSON.
- Collections come back wrapped: `{"categories": [...]}`, `{"listings": [...], "date", "count"}`, `{"places": [...], "count"}`; single resource: `{"provider": {...}}`; creations return the new id: `{"id": "..."}`.
- Errors use `{"error": "human readable message"}` (Indonesian, user-friendly).

## Status codes

| Code | When |
| ---- | ---- |
| 200 | success |
| 201 | created (registration, new resource) |
| 400 | validation error (e.g. bad WhatsApp number, missing field) |
| 401 | invalid/expired token (admin or owner) |
| 403 | forbidden (e.g. suspended provider) |
| 404 | resource not found |
| 409 | conflict (e.g. category still in use) |
| 413 | payload too large (photo upload) |

## Rules

- Validate at the boundary: read `await c.req.json()` and check required fields before touching D1; never trust internal code to pre-validate.
- Parametrize **all** SQL with `.bind()` — no string interpolation of values.
- `D1` is the source of truth; KV (`ACTIVE_CACHE`) is cache only. Any write that changes today's listings must call `invalidateListingsCache(env, date)` (see `src/cache.ts`).
- "Today" always means Jakarta time — use `todayJakarta()` from `src/geo.ts`, never `new Date()` directly.
- CPU budget on the free tier is 10 ms: prefilter with cheap SQL (bounding box) before expensive math (haversine); ship heavy JSON blobs (e.g. `/places`) as strings and let the client parse.
- Never expose the `owner_token` in public responses — it is returned once at registration and lives only in the portal URL.
- WhatsApp numbers are validated as digits with Indonesian format in mind (`08…` stored as-is for MVP, E.164 `628…` preferred); show friendly errors.
- Image uploads: `POST /providers/:id/photo` with raw image bytes (not multipart), `Content-Type: image/jpeg|png|webp`, max 5MB — rejects others with 400/413.
- Owner mutations (`open`, `close`, `update`, items CRUD) are token-authenticated via the portal path; public endpoints are read-only except register, checkin, photo upload.
- When adding an endpoint: update `backend/src/types.ts` (contract types), `docs/tech-spec.md` (contract table), and the frontend fetcher in `src/api.ts` / `src/adminApi.ts` in the same PR.
