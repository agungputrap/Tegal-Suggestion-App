# Tech Spec — Tegal Suggestion App

> **Status:** Updated 2026-08-24 — stack migrated to Cloudflare (see `docs/decisions.md`).
> This is the canonical spec. Read it before touching the API or data model.

## Goal

Suggestion application for local residents and newcomers in Tegal regarding:

- **Food** — snacks, meals, trending foods
- **Household services** — AC cleaning, washing machine repair, house repair

MVP scope for hackathon. The core mechanic (from the reference app "Jajan Apa di Malang"):

1. Provider registers (name, WhatsApp number, category, base location)
2. Provider checks in daily from their phone ("open today") — with current GPS location
3. Public map/list only shows providers that are **checked in today**
4. Buyer taps "Chat WhatsApp" → the whole order/booking happens in WhatsApp
   - No in-app transactions, no in-app chat, no payments

## Stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Frontend | React + Vite + TypeScript | SPA statis, deploy ke Cloudflare Pages |
| Maps | Leaflet (`L.divIcon` emoji markers) | marker per kategori, ikon dari tabel `categories` |
| Backend | Hono on Cloudflare Workers | TypeScript, edge runtime |
| DB | Cloudflare D1 (SQLite) | source of truth |
| Cache | Cloudflare KV (`ACTIVE_CACHE`) | cache only — never the source of truth |
| Photos | Cloudflare R2 (`PHOTOS`) | Worker proxies uploads, serves via `/photos/*` |
| Cron | Workers Cron Trigger | `0 17 * * *` UTC = 00:00 WIB, expires yesterday's checkins |
| Deploy | Cloudflare Pages (frontend) + Workers (API) | free tier; custom `.id` domain via Cloudflare DNS |
| Notifications | none | WhatsApp is the interaction layer |

## Repository layout

```
/
├── frontend/          # React + Vite SPA (Cloudflare Pages)
│   └── src/
│       ├── api.ts, adminApi.ts   # typed API calls
│       ├── pages/                # ConsumerPage, ProviderPage, AdminPage
│       └── components/           # MapView, ListingCard, CategoryFilter, PhotoUpload
├── backend/           # Hono Worker (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts   # all routes + scheduled handler
│   │   ├── types.ts   # Env bindings + entity types (API contract shapes)
│   │   └── geo.ts     # bounding box + haversine + todayJakarta()
│   ├── schema.sql     # D1 schema + seeded categories
│   └── wrangler.toml  # D1/KV/R2 bindings + cron trigger
├── docs/              # tech-spec, ownership, decisions, runbook
├── AGENTS.md          # standing rules + pointers to docs
└── TASKS.md           # live task ledger
```

## Data model (3 tables)

### `categories`

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | text PK | slug, e.g. `servis-ac` |
| name | string | display name |
| type | enum | `jajanan` or `jasa` |
| icon | string | emoji, used as map marker icon |

### `providers`

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | text PK | UUID |
| name | string | |
| phone | string unique | WhatsApp number |
| category_type | enum | `jajanan` or `jasa` |
| category_id | FK → categories | |
| description | text nullable | |
| photo_url | string nullable | `/photos/providers/<id>/<ts>.<ext>`, served from R2 |
| base_lat / base_lng | float nullable | home base (jasa) |
| service_radius_km | float | jasa only, 0 = no radius limit |
| suspended | bool | 1 = hidden by admin (moderation) |
| created_at | timestamp | |

### `checkins`

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | text PK | UUID |
| provider_id | FK → providers | |
| date | date | Jakarta date; `UNIQUE(provider_id, date)` → checkin is idempotent per day |
| lat / lng | float | GPS location at checkin — this is what shows on the map |
| is_active | bool | 0 = expired (cron) or deactivated by admin |

## API contract (v1)

Base path: `/` (no prefix). All responses JSON. Errors use `{"error": "..."}` with an appropriate status code.

### Public

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/categories` | all categories (with icons) |
| POST | `/providers` | register provider `{name, phone, category_type, category_id, description?, base_lat?, base_lng?, service_radius_km?}` → `{id}` |
| GET | `/providers/:id` | provider detail |
| POST | `/providers/:id/photo` | upload photo — raw image bytes (not multipart), `Content-Type: image/jpeg|png|webp`, max 5MB |
| GET | `/photos/*` | serve photo from R2 (Cache-Control 1 year, immutable) |
| POST | `/checkins` | daily checkin `{provider_id, lat, lng}` — upsert per day, invalidates KV cache |
| GET | `/listings?type=&category=&lat=&lng=&radius=` | today's active providers; bounding-box prefilter + haversine, sorted by distance |

### Admin (header `Authorization: Bearer <ADMIN_TOKEN>`)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/admin/me` | verify token (frontend "login") |
| GET | `/admin/stats` | totals, active today, breakdown by type/category |
| GET | `/admin/providers?type=&status=&q=` | list/filter/search providers |
| PATCH | `/admin/providers/:id` | `{suspended: boolean}` — moderation |
| DELETE | `/admin/providers/:id` | permanent delete (provider + checkins + photo) |
| DELETE | `/admin/providers/:id/photo` | delete photo only |
| POST | `/admin/providers/:id/deactivate-checkin` | deactivate today's checkin without suspending |
| GET/POST/PATCH/DELETE | `/admin/categories[/:id]` | manage categories + icons (delete blocked while in use) |

## Key decisions locked

- **No auth system for providers.** Provider identity lives in the browser `localStorage` after registration; checkin uses `provider_id` directly. Sufficient for demo day; proper WhatsApp OTP is Phase 2.
- **Admin auth is one shared token** (`ADMIN_TOKEN` Worker secret). Multi-admin roles are Phase 2.
- **No payments/chat/orders in-app.** Everything routes to WhatsApp via `wa.me` links.
- **Daily checkin is the freshness signal.** `/listings` filters on `checkins.date = today (Jakarta) AND is_active = 1`. Cron expires old checkins at midnight WIB.
- **KV is cache only.** D1 is the source of truth; writes delete cache keys instead of writing to KV.

## Spec'd but not yet implemented (gaps vs PRD)

These were in the original FastAPI-era spec and are **not** in the current code — see `TASKS.md`:

- `items` table (menu / service price-list) + endpoints
- WhatsApp verify code + approval flow for new registrations
- Owner portal `/kelola/{token}` (open/close today, edit business) — current provider flow is localStorage-based
- Trending sort (views/likes per day), filter by area (kecamatan), halal flag for food

## Explicitly cut (post-hackathon)

- In-app payments, delivery tracking, in-app chat, ratings/reviews
- Photo contribution + moderation beyond admin, story-card/OG image generation
- Real user accounts/auth, push notifications, multi-language
