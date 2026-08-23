# Tech Spec — Tegal Suggestion App

> **Status:** Draft — update this file when the stack, data model, or API contract changes.
> This is the canonical spec. Read it before touching the API or data model.

## Goal

Suggestion application for local residents and newcomers in Tegal regarding:

- **Food** — snacks, meals, trending foods
- **Household services** — AC cleaning, washing machine repair, house repair

MVP scope for hackathon. The core mechanic (from the reference app "Jajan Apa di Malang"):

1. Business owner registers → admin approves via WhatsApp verification
2. Owner opens their business daily from a phone portal ("open today")
3. Public map/list only shows businesses that are **open today**
4. Buyer taps "Chat WhatsApp" → the whole order/booking happens in WhatsApp
   - No in-app transactions, no in-app chat, no payments

## Stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Frontend | React + Vite | Not CRA — Vite HMR saves time |
| UI | Tailwind CSS + shadcn/ui | Radix primitives, lucide icons |
| Maps | react-leaflet + Leaflet.markercluster | CARTO light tiles (free) |
| HTTP | Axios | shared instance with base URL |
| Routing | React Router | |
| Backend | FastAPI (Python) | free Swagger docs at `/docs` |
| ORM | SQLAlchemy | |
| DB | SQLite in dev, PostgreSQL in prod | same code via SQLAlchemy |
| Images | local disk in dev, Cloudinary/Supabase Storage in prod | |
| Deploy | Render/Railway (API + DB), Vercel/Netlify (frontend) | free tiers |
| Notifications | none | WhatsApp is the interaction layer |

## Repository layout

```
/
├── frontend/          # React + Vite app
├── backend/           # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py     # ← THE API CONTRACT (shared, review carefully)
│   │   └── routers/
│   ├── seed.sql
│   └── requirements.txt
├── docs/              # tech-spec, ownership, decisions, runbook
├── AGENTS.md          # standing rules + pointers to docs
└── TASKS.md           # live task ledger
```

## Data model (4 tables)

### `businesses`

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | int PK | |
| name | string | |
| slug | string unique | used in URLs |
| category | enum | `food` or `service` |
| subcategory | string | e.g. snack, meal, AC cleaning, washing machine repair |
| description | text | |
| whatsapp | string | E.164, e.g. `6281234567890` |
| lat / lng | float | |
| area | string | kecamatan/district |
| halal | bool nullable | food only |
| photo_path | string | |
| is_open | bool | today's status |
| views | int | for trending sort |
| owner_token | string unique | magic URL auth for owner portal |

### `items`

One shape for both verticals: menu item (food) or service price (home services).

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | int PK | |
| business_id | FK | |
| name | string | |
| price | int | in Rupiah |
| photo_path | string | |
| note | string | e.g. "pedas sedang", "termasuk suku cadang" |
| available | bool | |

### `open_sessions`

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | int PK | |
| business_id | FK | |
| date | date | |
| item_ids | json | which items are offered today |
| note | string | "catatan hari ini" |

### `approvals`

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | int PK | |
| business_id | FK | |
| status | enum | `pending`, `approved`, `rejected` |
| verify_code | string | 6-digit WhatsApp handoff code |

## API contract (v1)

Base path: `/api`. All responses JSON. Errors use FastAPI shape `{"detail": "..."}`.

| Method | Path | Purpose | Auth |
| ------ | ---- | ------- | ---- |
| GET | `/api/businesses` | list open-today businesses, filter `?category=&area=` | public |
| GET | `/api/businesses/{slug}` | detail + today's items + stats | public |
| GET | `/api/businesses/{slug}/items` | all items | public |
| POST | `/api/register` | business registration (creates approval + verify code) | public |
| POST | `/api/upload` | image upload, returns `{path}` | public |
| POST | `/api/businesses/{slug}/report` | report a business | public |
| GET | `/api/kelola/{token}` | owner portal: business + items + today status | owner token |
| POST | `/api/kelola/{token}/open` | open today with `{item_ids, note}` | owner token |
| POST | `/api/kelola/{token}/close` | close today | owner token |
| PUT | `/api/kelola/{token}/business` | update business fields | owner token |

Trending: sort by `views` (and likes) for the day — cheap "trending foods" signal.

## Key decisions locked

- **No auth system.** Owner login = magic token in URL (`/kelola/{token}`). Admin approval via WhatsApp code handoff.
- **No payments/chat/orders in-app.** Everything routes to WhatsApp via `wa.me` links.
- **"Open today" is the freshness signal.** Map filters on `is_open`.
- **One items table for both verticals.** Food menu and service price-list are the same shape.

## Explicitly cut (post-hackathon)

- In-app payments, delivery tracking, in-app chat, ratings/reviews
- Photo contribution + moderation, story-card/OG image generation
- Real user accounts/auth, push notifications, multi-language
