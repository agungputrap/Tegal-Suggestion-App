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
│       ├── pages/                # ConsumerPage, ProviderPage, AdminPage (app inti, shell mobile)
│       ├── explorer/             # halaman utama: port ref F&B Explorer (ExplorerApp, tabs, modal)
│       └── components/           # MapView, ListingCard, CategoryFilter, PhotoUpload
├── backend/           # Hono Worker (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts   # all routes + scheduled handler
│   │   ├── types.ts   # Env bindings + entity types (API contract shapes)
│   │   └── geo.ts     # bounding box + haversine + todayJakarta()
│   ├── migrations/    # D1 migrations (baseline + perubahan skema)
│   └── wrangler.toml  # D1/KV/R2 bindings + cron trigger
├── docs/              # tech-spec, ownership, decisions, runbook
├── AGENTS.md          # standing rules + pointers to docs
└── TASKS.md           # live task ledger
```

## Data model (5 tables + 1 reference table)

> Skema dikelola lewat **d1 migrations** (`backend/migrations/`) — bukan lagi `schema.sql` (lihat `docs/decisions.md` 2026-09-08).

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
| area | text nullable | kecamatan (dropdown statis di frontend) |
| halal | bool nullable | food only; NULL untuk jasa |
| approval_status | enum | `pending` \| `approved` \| `rejected`; migrasi memberi default `approved` (data lama tetap tampil); registrasi baru = `pending` (#6) |
| verify_code | text nullable | kode 6 digit, ditampilkan ke pemilik saat daftar (#6) — **tidak pernah di respons publik** |
| owner_token | text unique nullable | magic-link `/kelola/{token}` (#7) — **tidak pernah di respons publik** |
| created_at | timestamp | |

### `items`

Satu bentuk untuk dua vertikal (menu jajanan / daftar harga jasa) — locked decision 2026-08-23.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | text PK | UUID |
| provider_id | FK → providers | ON DELETE CASCADE |
| name | string | |
| price | int | Rupiah |
| note | text nullable | mis. "pedas sedang", "termasuk suku cadang" |
| available | bool | portal pemilik (#7): item ditawarkan hari ini |
| sort_order | int | urutan tampil |
| created_at | timestamp | |

### `checkins`

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | text PK | UUID |
| provider_id | FK → providers | |
| date | date | Jakarta date; `UNIQUE(provider_id, date)` → checkin is idempotent per day |
| lat / lng | float | GPS location at checkin — this is what shows on the map |
| note | text nullable | catatan opsional saat buka dari portal pemilik (#7) |
| is_active | bool | 0 = expired (cron) or deactivated by admin |

### `provider_views`

Penghitung views per hari untuk trending sort (#4b); increment saat detail penyedia dibuka.

| Column | Type | Notes |
| ------ | ---- | ----- |
| provider_id + date | PK komposit | Jakarta date, pola sama dengan checkins |
| views | int | |

### `places` (reference data, read-only)

63 F&B places in Tegal & surroundings scraped from Google Maps (`tegal-fnb.csv`; 76 saat scrape — 13 titik Jakarta dibuang, lihat decisions 2026-09-08). Powers the Explorer page; never written by the app — seeded via `npm run db:seed:places`.

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | text PK | Google Maps cid (`0x…:0x…`) |
| title / category / address / city | text | `city` derived from address: Kota Tegal, Kabupaten Tegal, Kabupaten Brebes, Kota Jakarta … |
| rating / review_count / price_range | real / int / text | GMaps rating data |
| phone / website / thumbnail / link / street_view_url / plus_code | text | contact & source URLs |
| latitude / longitude | float | map position |
| open_hours / popular_times / images / about / user_reviews / reviews_per_rating | text (JSON) | stored as **JSON strings** — `GET /places` would risk the 10 ms Workers CPU limit if it parsed ~1.6 MB per request; the frontend parses once on load |

## API contract (v1)

Base path: `/` (no prefix). All responses JSON. Errors use `{"error": "..."}` with an appropriate status code.

### Public

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/categories` | all categories (with icons) |
| POST | `/providers` | register provider `{name, phone, category_type, category_id, description?, base_lat?, base_lng?, service_radius_km?, place_id?}` → `{id}` — rate limit 5/IP/jam; `place_id` = klaim listing direktori (fase 3 #31), duplikat → 409 |
| GET | `/providers/:id` | provider detail |
| POST | `/providers/:id/photo` | upload photo — raw image bytes (not multipart), `Content-Type: image/jpeg|png|webp`, max 5MB, **header `X-Owner-Token` wajib** (fase 0 #27), rate limit 10/IP/jam |
| GET | `/photos/*` | serve photo from R2 (Cache-Control 1 year, immutable) |
| POST | `/checkins` | daily checkin **`{provider_id, owner_token, lat, lng}`** — upsert per day, invalidates KV cache. Fase 0 (#27): `owner_token` wajib (403 jika salah); GPS divalidasi terhadap base (422 jika > max(service_radius_km, 25 km)); rate limit 10/IP/10 menit |
| POST | `/providers/:id/confirm-open` | **baru (fase 0 #27)** — konfirmasi publik "✓ Masih buka"; dedupe 1× per pengunjung/hari (hash IP+tanggal) → `{confirm_count}`; rate limit 30/IP/jam |
| POST | `/bot/webhook` | **baru (fase 1 #29)** — bot WhatsApp; header `X-Bot-Token: <BOT_WEBOOK_TOKEN>` wajib; payload `{sender, message}` (JSON atau form); balasan dikirim via adapter (`FONNTE_TOKEN`), teks balasan juga ada di respons |
| GET | `/listings?type=&category=&lat=&lng=&radius=` | today's active providers; bounding-box prefilter + haversine, sorted by distance; ikutkan **`streak_days`** (check-in beruntun berakhir hari ini) & **`confirm_count`** (konfirmasi hari ini) |
| GET | `/places` | all 63 reference F&B places (Explorer dataset); JSON columns returned as strings, client-side filter/sort; ikutkan `claimed_provider_id`/`claimed_name`/`claimed_open` untuk place yang diklaim (fase 3 #31) |
| GET | `/places/:id` | **baru (fase 3 #31)** — satu place + status klaim (untuk prefill form klaim tanpa memuat dataset penuh) |
| GET | `/places/summary` | **baru (UI/UX Tier 2 #36)** — ringkasan ringkan (~48KB vs ~1.3MB) untuk render pertama Explorer: id/title/category/address/city/rating/review_count/price_range/lat/lng/thumbnail/open_hours(JSON string)/images_count(`json_array_length`). Terdaftar SEBELUM `/places/:id`; dataset penuh tetap via `/places` (lazy-load frontend) |

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

- **No auth system for providers.** Provider identity lives in the browser `localStorage` after registration. *Update fase 0 (#27):* mutasi sensitif (check-in, upload foto) kini **terikat `owner_token`** (disimpan di localStorage, dikembalikan sekali saat registrasi) — bukan lagi `provider_id` publik. WhatsApp OTP penuh tetap Phase 2.
- **Admin auth is one shared token** (`ADMIN_TOKEN` Worker secret). Multi-admin roles are Phase 2.
- **No payments/chat/orders in-app.** Everything routes to WhatsApp via `wa.me` links.
- **Daily checkin is the freshness signal.** `/listings` filters on `checkins.date = today (Jakarta) AND is_active = 1`. Cron expires old checkins at midnight WIB. Sejak fase 0 (#27): histori check-in dibaca jadi **`streak_days`** (hari beruntun) dan dikawal **`confirm_count`** (konfirmasi pelanggan, tabel `confirm_opens` — migrasi 0003). Rate limit tulisan publik bersifat in-memory per isolate (best-effort).
- **Bot WhatsApp (fase 1 #29).** Owner interface via chat: `BUKA` (check-in dari koordinat dasar), `TUTUP`, `STATUS` (status + streak + lead 7 hari), `BANTUAN`; teks bebas = pencarian penyedia live (maks 3, **dicatat sebagai `leads`** — tabel migrasi 0004, basis metrik "N orang tanya minggu ini"). Cron kedua `0 23 * * *` (06:00 WIB) kirim ping "Buka hari ini?" ke semua provider approved + log `bot_pings` (basis metrik retensi). Secrets opsional: `BOT_WEBHOOK_TOKEN` (auth webhook), `FONNTE_TOKEN` (adapter kirim Fonnte — tanpa ini bot NOOP dan tidak mengganggu app); adapter BSP resmi menyusul.
- **KV is cache only.** D1 is the source of truth; writes delete cache keys instead of writing to KV.

## Gaps vs PRD — selesai (2026-09-08)

Semua gap di bawah sudah diimplementasikan (lihat `TASKS.md` + `docs/decisions.md`):

- `items` table (menu / service price-list) + endpoint publik & CRUD portal pemilik
- WhatsApp verify code (6 digit, ditampilkan ke pemilik) + approval admin
- Owner portal `/kelola/{token}` (buka/tutup hari ini + pilih item tersedia + catatan + edit usaha)
- Trending sort (`/listings?sort=trending`, berdasar views/hari), filter area (kecamatan), halal flag

## Explicitly cut (post-hackathon)

- In-app payments, delivery tracking, in-app chat, ratings/reviews
- Photo contribution + moderation beyond admin, story-card/OG image generation
- Real user accounts/auth, push notifications, multi-language
