# TASKS.md — Live Task Ledger

> **Mutable, superseded daily.** One owner per task; shared files get a reviewer line. The AI reads this before starting work and updates it after finishing.
> When a task is done, mark it `[x]` and keep the commit hash — it's the handoff record for teammates.

> **2026-09-08:** Batch implementasi to-do MVP selesai (fase 0–6, PR #9–#16). Rincian keputusan di `docs/decisions.md`.

## Active

- [ ] _kosong — semua task aktif selesai_

## Done

- [x] #36 UI/UX Tier 1: freshness timestamp (`last_checkin_at` — **backend+frontend, SHARED types.ts, kedua owner mohon review**), bot visible via `VITE_BOT_NUMBER`, klaim tanpa reload (SPA), pending poll 15 detik, registrasi 2 langkah (3 field → profil opsional), bottom nav mobile (safe-area), hero live "X usaha · Y buka sekarang" — **frontend area Budi** (PR terkait issue #36)
- [x] #34 UI/UX Tier 0: fix bug trust `isOpenNow` (jam pecah + WIB, +13 test), error copy + tombol Coba lagi (4 halaman), meta/OG/favicon share preview, CTA WhatsApp di PlaceModal, touch target ≥44px, dark mode (tile peta/overscroll/kontras), reachability (tab Tersimpan mobile, Portal /kelola, link balik portal), a11y dasar (dialog + fokus, judul kartu button, focus-visible), skeleton dataset — **frontend area Budi, mohon review** (PR #35)

- [x] #31 Fase 3 strategi (#26): claim-and-verify — `providers.place_id` (migrasi 0005), registrasi+409 anti-hijack, `GET /places/:id`, PlaceModal badge "terverifikasi/buka hari ini" + tombol klaim → form ter-prefill — **backend+frontend, kedua owner mohon review** (PR #32)
- [x] #29 Fase 1 strategi (#26): bot WhatsApp — webhook `BUKA`/`TUTUP`/`STATUS`/pencarian bebas (sisi demand terbuka) + pencatatan lead (migrasi 0004) + ping harian cron 06:00 WIB + adapter Fonnte (NOOP tanpa token) — **area backend Arief, mohon review; pasang device Fonnte + secrets = langkah ops tim** (PR #30)

- [x] #27 Fase 0 strategi (#26): check-in wajib owner_token + GPS sanity (422) + rate limit tulisan publik + konfirmasi publik "masih buka" (migrasi 0003) + `streak_days`/`confirm_count` di listing + kartu/peta ikut tampil — **BREAKING: POST /checkins kontrak baru** — **backend+frontend, kedua owner mohon review** (PR #28)

- [x] #23 Seed penyedia demo `npm run db:seed:demo` — 18 bisnis campuran via API, idempoten, re-run refresh check-in — 72c5807 — **backend area Arief, mohon review** (PR #24)
- [x] #21 Peta satu fase 1 (opsi C): lapisan live "Buka Hari Ini" di tab peta Explorer — pin live pane terpisah + popup → /provider/<id>, toggle jenis/live-only, legenda 2 grup — 1803dd9 — frontend-only, rencana di `docs/proposals/unified-map.md` (#20)

- [x] #4a-lanjutan Provider detail sebagai halaman penuh `/provider/<id>` (pengganti modal, deep-link + back/refresh via pushState) — 8434204 — Budi's area, PR ditandai untuk review

- [x] #15 Frontend polish: code-split bundle (entry 628KB → 210KB), styles.css dipangkas, retry foto — Budi
- [x] #14 Filter by area (kecamatan, dropdown statis) + halal flag (food-only) — Arief + Budi
- [x] #13 Frontend: items di detail penyedia (modal) — Budi
- [x] #12 Backend: tabel `items` + endpoint publik/portal — Arief, **Budi reviews** (contract)
- [x] #10 Lint/format: ESLint flat config + Prettier (kedua sisi) — Arief, **Budi reviews**
- [x] #9 Test infra frontend: Vitest + RTL + jsdom (8 test) — Budi
- [x] #8 Test infra backend: Vitest + `@cloudflare/vitest-pool-workers` (13 test, D1 migrasi otomatis) — Arief
- [x] #7 Owner portal `/kelola/{token}`: buka/tutup hari ini + pilih item + catatan + edit usaha — Arief, **Budi reviews** (frontend)
- [x] #6 Registrasi: verify code 6 digit + approval admin (alur WhatsApp manual sesuai PRD Flow B) — Arief, **Budi reviews** (frontend)
- [x] #5 Frontend: provider detail view (modal dari ListingCard) — Budi
- [x] #4b Backend: trending sort (`/listings?sort=trending`, views per hari via `provider_views`) — Arief
- [x] #16 Explorer page: port `ref/index.html` F&B dashboard ke React + seed `places` dari `tegal-fnb.csv` (schema + `GET /places` + `db:seed:places`) — **both review** (shared: `schema.sql`→migrations, `types.ts`, tech-spec)
- [x] #11 Adopt `ref/` implementation as the codebase (`frontend/` + `backend/`), sync all docs — **both review** (shared files)
- [x] #1 Backend data model — superseded by adoption: `categories` + `providers` + `checkins` in `backend/migrations/` (#11)
- [x] #2 Frontend: Vite skeleton + map with markers — done via adoption (#11)
- [x] #3 API contract v1 — superseded: contract now in `backend/src/types.ts` + `docs/tech-spec.md` (#11)
- [x] #4a Backend: list/detail endpoints (`/listings`, `/providers/:id`) — done via adoption; trending sort split to #4b (#11)

## Backlog (explicitly cut from MVP, post-hackathon)

- Peta satu fase 3: claim-and-verify direktori ↔ provider (migrasi `providers.place_id`, alur klaim PlaceModal, OTP WhatsApp) — `docs/proposals/unified-map.md` bagian 5
- Migrasi direktori F&B ke Overture Maps (5.457 POI Tegal terukur, CDLA-Permissive; pengganti bersih-lisensi scrape GMaps) — `docs/decisions.md` 2026-09-29
- In-app payments, delivery, chat, reviews/ratings
- Photo contribution + moderation
- Story-card / OG image generation
- Real user accounts (provider WhatsApp OTP, multi-admin roles)
