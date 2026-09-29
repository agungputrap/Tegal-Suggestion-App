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

## 2026-08-24 — Stack migrated to Cloudflare (FastAPI → Hono Workers)

- **Decision:** Adopted the working implementation from `ref/` (built by Claude) as the actual codebase: `ref/jajan-jasa-web` → `frontend/`, `ref/jajan-jasa-worker` → `backend/`. Backend is now **Hono on Cloudflare Workers** (D1 + KV + R2 + Cron); frontend stays React + Vite + TS but uses custom CSS design tokens instead of Tailwind/shadcn and plain Leaflet instead of react-leaflet. Deploy target is Cloudflare Pages + Workers (free tier) instead of Render/Railway + Vercel/Netlify.
- **API contract changed:** error shape is now `{"error": ...}` (was FastAPI `{"detail": ...}`); no `/api` prefix; data model is `categories` / `providers` / `checkins` (was `businesses` / `items` / `open_sessions` / `approvals`). The API contract shapes now live in `backend/src/types.ts` + `docs/tech-spec.md` (was `backend/app/schemas.py`).
- **Not yet ported from the old spec:** items (menu/price-list), WhatsApp verify code, owner portal `/kelola/{token}`, trending sort, area filter, halal flag — tracked as gaps in `docs/tech-spec.md` and `TASKS.md`.
- **Why:** the `ref/` implementation already ran end-to-end (register → checkin → map listings) and hosts free on Cloudflare; rewriting it in FastAPI would cost the hackathon week for zero user-visible gain. FastAPI on Cloudflare Python Workers was evaluated and rejected (Pyodide package limits, no SQLAlchemy/psycopg, rewrite of the DB layer anyway).
- **Review note:** this touches shared files (`docs/tech-spec.md`, `AGENTS.md`, `TASKS.md`, ownership map) — both owners must review before merge.

## 2026-09-07 — Explorer page: port ref F&B dashboard + seed 76 GMaps places

- **Decision:** The app's landing page is now the "Tegal F&B Explorer" — a React port of the `ref/index.html` dashboard (banner, glass header + 4 tabs, KPI cards, Direktori grid/list/table/split views, full map, analytics dashboard, favorites + comparison, place modal). The old app (Cari / Jualan-Jasa Saya / Admin, mobile shell) stays reachable from the Explorer header ("Buka Hari Ini" + admin buttons) and keeps its own bottom nav.
- **Schema change (shared file):** new `places` table in `backend/schema.sql` — read-only reference dataset of 76 F&B places scraped from Google Maps (`tegal-fnb.csv`). Seeded via `npm run db:seed:places` (parses `backend/seeds/tegal-fnb.csv` with papaparse → `seed-places.sql` → D1). Columns `open_hours`/`popular_times`/`images`/`about`/`user_reviews`/`reviews_per_rating` are stored as JSON **strings** on purpose: `GET /places` returns ~1.6 MB, and parsing it in the Worker would risk the 10 ms free-tier CPU limit — the frontend parses once on load.
- **New endpoint:** `GET /places` (public, no params) → `{ count, places: [...] }`. Frontend does all filtering/sorting client-side, same as the ref.
- **New frontend dependencies:** `tailwindcss` + `@tailwindcss/vite` (v4 — supersedes the "no Tailwind" rule from 2026-08-24; utilities are imported **without preflight** so legacy pages keep their custom-CSS look), `chart.js`, `leaflet.markercluster` (+types), papaparse (backend devDep, seed only). FontAwesome + Plus Jakarta Sans load from CDN (network is required anyway for OSM tiles & GMaps photos).
- **Why:** demo-day visual impact — the Explorer shows real Tegal F&B data with analytics out of the box; the check-in MVP flow stays one click away for the live demo.
- **Review note:** touches shared files (`backend/schema.sql`, `backend/src/types.ts`, `docs/tech-spec.md`) — backend owner please review the places contract; frontend owner review the App.tsx restructure.

## 2026-09-08 — Fase 0 fondasi: adopsi d1 migrations + split route backend

- **Decision (migration):** skema D1 kini dikelola lewat **`wrangler d1 migrations`** (`backend/migrations/`, baseline = `0001_baseline.sql`), bukan lagi `schema.sql` tunggal. Alasan: SQLite tidak punya `ADD COLUMN IF NOT EXISTS`; fitur baru (items, approval, portal, trending) butuh kolom baru yang harus terlacak & idempotent per environment. Script `db:migrate:local|remote` sekarang menjalankan `d1 migrations apply`. `backend/schema.sql` dihapus (isi pindah utuh ke baseline). File bersama `backend/schema.sql` di AGENTS.md/ownership diganti `backend/migrations/`.
- **Decision (route split):** `backend/src/index.ts` (542 baris) sudah melampaui ambang ~500 baris di dev-standards → dipecah satu file per resource (`src/routes/{places,categories,providers,checkins,listings,photos,admin}.ts`) + `src/middleware.ts` (adminAuth), `src/constants.ts`, `src/cache.ts` (`invalidateListingsCache`), `src/expire-checkins.ts` (cron). `index.ts` jadi komposisi tipis (~33 baris). Tanpa perubahan perilaku.
- **Skill update:** `api-guidelines` (3 mirror) disinkronkan ke kontrak aktual (Hono, tanpa prefix `/api`, error `{"error": ...}`, upload raw-bytes 5MB, owner token tak pernah expose).
- **Why:** fondasi bersih sebelum implementasi to-do (#4b/#5/#6/#7/#12–#15) supaya tiap fitur masuk ke module kecil yang testable, bukan nambah file yang sudah terlalu besar.
- **Review note:** menyentuh AGENTS.md, ownership.md, dev-standards, tech-spec, runbook — kedua owner mohon review.

## 2026-09-08 — Dataset Explorer: 13 tempat Jakarta dibuang dari seed

- **Decision:** `scripts/seed-places.mjs` sekarang melewati baris yang `city`-nya Jakarta (hasil scrape Google Maps memang ikut menyertakan 13 tempat di Jakarta Pusat/Selatan, ±230 km dari Tegal). SQL hasil generate juga menjalankan `DELETE FROM places WHERE city LIKE '%Jakarta%'` supaya re-seed bersih dari data lama. Dataset turun 76 → 63 tempat. Opsi filter "Jakarta Area" + special-case filternya dihapus dari Explorer.
- **Why:** app ini untuk saran area Tegal — titik Jakarta merusak `fitBounds` peta (view awal melebar sampai Jakarta), mengotori KPI, dan membingungkan pengguna. CSV sumber (`backend/seeds/tegal-fnb.csv`) tidak diubah, filter hanya di pipeline seed.
- **Review note:** menyentuh `backend/scripts/` (area Arief) dan `frontend/src/explorer/` (area Budi) — kedua owner mohon review.

## 2026-09-29 — Peta satu: opsi C peta berlapis diadopsi, fase 1 shipped

- **Decision:** README gap #3 ("satu peta") diselesaikan dengan **opsi C — peta berlapis**: tab "Peta Interaktif" Explorer menampilkan lapisan direktori (63 place scrape, sudah ada) + lapisan live "Buka Hari Ini" (`GET /listings`, check-in realtime jajanan + jasa) sebagai dua lapisan marker dengan semantik freshness terpisah (direktori boleh basi; live = aktif sekarang). Fase 1 **frontend-only** (tanpa perubahan API): pin live di pane Leaflet terpisah (tidak ikut cluster), popup → halaman `/provider/<id>`, legenda 2 grup, toggle jenis/live-only. Rencana lengkap di `docs/proposals/unified-map.md` (#20), implementasi #21/#22.
- **Keputusan turunan:** jasa **tidak** di-scrape dari Google Maps — coverage OSM Tegal nyaris nol (terukur: 6 POI F&B, 0 jasa se-kota) dan ToS Google melarang penyimpanan sebagai direktori sendiri; kesenjangan jasa ditutup lewat seed demo + rekrutmen manual (entry berikutnya).
- **Hasil uji Overture (fase 4, jawaban open question #1 proposal):** dataset **Overture Maps** (CDLA-Permissive-2.0, sumber Meta) terbukti punya coverage Tegal: **5.457 POI** di bbox kota (`overturemaps download --bbox=109.08,-6.93,109.22,-6.80 -t place -f geojson`), ±1.153 makan-minum (restaurant 637, cafe 119, casual_eatery 119, coffee_shop 89), jasa rumah tangga tipis tapi ada (laundry_service 25, building_or_construction_service 17; di luar itu personal/beauty 154, otomotif 130). Kandidat pengganti bersih-lisensi untuk direktori scrape Google Maps — terutama F&B — pasca-hackathon. Catatan skema: properti terbaru memakai `basic_category`/`taxonomy`, bukan `categories.main`.
- **Why:** menepati janji produk "satu peta" (README, PRD Flow A, keputusan 2026-08-23) sebelum demo day tanpa menyentuh backend; riset menunjukkan "scrape jasa vs realtime" adalah false binary — keduanya dipakai, dipisah visual.
- **Review note:** fase 1 murni `frontend/` (area Budi); dicatat di sini karena mengubah halaman depan produk.

## 2026-09-29 — Seed penyedia demo via API (`npm run db:seed:demo`)

- **Decision:** script baru `backend/scripts/seed-demo-providers.mjs` menyemai **18 penyedia demo** (8 jajanan + 10 jasa, 9 kecamatan, 10 "buka hari ini") lewat **API publik/admin** — bukan SQL langsung — sehingga jalur demo == jalur produk nyata (register → approve → check-in → items portal) dan "today" konsisten dengan `todayJakarta()`. Idempoten per nomor HP; re-run me-refresh check-in hari ini (cron expire-kan listing tengah malam WIB — jalankan ulang pagi demo). Menutup bagian kode dari README gap #2 (data demo PRD "15–20 seeded businesses, several open"). Perekrutan penyedia NYATA tetap pekerjaan manual tim.
- **Why:** sebelumnya DB hanya berisi residu test suite; demo butuh data campuran food+jasa yang bisa di-refresh tanpa duplikasi.
- **Review note:** menyentuh `backend/scripts/` + 1 baris `package.json` (area Arief) — mohon review; tanpa perubahan `src/`, kontrak, atau migrasi.

## 2026-09-29 — Fase 0 strategi: sinyal freshness terkunci (breaking change kontrak)

- **Decision (API contract — SHARED):** menyusul `docs/strategy.md` (#26), permukaan tulis publik dikunci: (1) `POST /checkins` kini **wajib `owner_token`** (400/403 jika salah) — sebelumnya siapa pun bisa memalsukan "buka" usaha mana pun karena `provider_id` publik; (2) GPS check-in divalidasi terhadap lokasi dasar — **422** jika > `max(service_radius_km, 25 km)`; (3) `POST /providers/:id/photo` wajib header `X-Owner-Token`; (4) rate limit in-memory per isolate (best-effort): register 5/IP/jam, check-in 10/IP/10 menit, foto 10/IP/jam, konfirmasi 30/IP/jam.
- **Decision (fitur baru):** migrasi **0003_confirm_opens** (tabel `confirm_opens`, dedupe 1× per pengunjung/hari via sha256(IP+tanggal)) + endpoint publik `POST /providers/:id/confirm-open` — verifikasi pelanggan di atas self-report owner; `GET /listings` kini mengembalikan **`streak_days`** (check-in beruntun berakhir hari ini, dari histori 60 hari) dan **`confirm_count`** — bacaan pertama dari data moat liveness (`backend/src/types.ts` + `frontend` `Listing` ikut berubah).
- **Ripple:** seed demo (`db:seed:demo`) kini menyimpan `owner_token` ke `backend/seed-demo-tokens.json` (**gitignored**) dan mengirimnya saat refresh check-in; token demo lama dipulihkan dari D1 sekali. Test suite menyimulasikan klien berbeda via header `CF-Connecting-IP` acak supaya tidak saling memakan kuota rate limit.
- **Why:** satu-satunya pembeda produk ("open today") harus tidak bisa dipalsukan sebelum dibangun jadi panel liveness — langkah pertama rencana fase 0 strategi.
- **Review note:** menyentuh file bersama `backend/src/types.ts` + `docs/tech-spec.md` + kontrak API — **kedua owner wajib review sebelum merge**. Breaking change: pemanggil lama `POST /checkins` tanpa token akan 400.

## 2026-09-29 — Fase 1 strategi: bot WhatsApp (webhook + ping harian + lead)

- **Decision:** lapisan bot WhatsApp sebagai antarmuka utama (`docs/strategy.md` fase 1): `POST /bot/webhook` (auth header `X-Bot-Token` = secret `BOT_WEBHOOK_TOKEN`; payload `{sender, message}` JSON/form) dengan perintah owner `BUKA` (check-in dari koordinat dasar), `TUTUP`, `STATUS`, `BANTUAN`; **teks bebas = pencarian penyedia live yang terbuka untuk nomor tak terdaftar** (sisi demand) dan setiap hasil dicatat sebagai `leads` (migrasi **0004_bot_whatsapp**: tabel `leads` + `bot_pings`). Cron kedua `0 23 * * *` (06:00 WIB) mengirim ping "Buka hari ini?" ke semua provider approved + log `bot_pings` — basis metrik konversi ping→BUKA (kill criteria strategi).
- **Adapter kirim pluggable** (`src/whatsapp.ts`): Fonnte (gateway unofficial) jika secret `FONNTE_TOKEN` diset; **tanpa token = NOOP** — bot mati dengan rapi, app tidak terpengaruh. BSP resmi (Meta Cloud API) menyusul bila tim mau verifikasi bisnis.
- **Ripple:** `Env` bertambah binding opsional; cron trigger kedua di `wrangler.toml`; test suite +10 kasus bot (29 total). Tidak ada perubahan endpoint existing.
- **Why:** retensi check-in adalah titik mati kategori ini (Temuan 1 strategi) — check-in harus jadi satu reply WhatsApp dengan imbalan lead yang terlihat, bukan kewajiban buka portal.
- **Review note:** area backend (Arief) — mohon review; file bersama hanya `docs/tech-spec.md` (kontrak baru tercatat di sana).

## 2026-09-29 — Fase 3 strategi: claim-and-verify (klaim listing direktori)

- **Decision (skema — SHARED migrations):** migrasi **0005_claim_place** — `providers.place_id` (nullable) + unique partial index (satu place = satu pemilik) + index places. Provider ber-place_id = lahir dari klaim listing direktori.
- **Decision (API contract):** registrasi menerima `place_id` opsional (place harus ada → 400; sudah diklaim → **409**); `GET /places` & `GET /places/:id` (endpoint baru) mengembalikan `claimed_provider_id`/`claimed_name`/`claimed_open` (join providers + checkin hari ini); `place_id` masuk `PUBLIC_PROVIDER_COLUMNS` (bukan rahasia). **Anti-hijack:** klaim baru berdampak setelah approve admin (Flow B) — alur verifikasi tidak berubah.
- **Frontend:** PlaceModal menampilkan badge terverifikasi/"buka hari ini" + tombol ke `/provider/<id>` (place terklaim) atau tombol "Klaim listing ini" → `?view=saya&claim=<place_id>` (form registrasi ter-prefill nama + koordinat place). `GET /places/:id` sengaja dibuat supaya prefill tidak perlu memuat dataset 1.5MB.
- **Why:** menghubungkan dataset scrape (read-only) dengan suplai live — jalur akuisisi suplai berbiaya rendah sekaligus langkah menuju panel liveness (strategi fase 3).
- **Review note:** file bersama `backend/migrations/`, `backend/src/types.ts`, `docs/tech-spec.md` — **kedua owner wajib review**; area backend (Arief) & frontend (Budi) sama-sama tersentuh.
