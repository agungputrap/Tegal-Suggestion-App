# Tegal Suggestion App

Peta rekomendasi untuk warga dan pendatang di Tegal — **kuliner** (jajanan, makanan, lagi trending) dan **jasa rumah tangga** (service AC, service mesin cuci, perbaikan rumah) dalam satu aplikasi berbasis peta.

Suggestion map for Tegal residents & newcomers — **food** (snacks, meals, trending) and **household services** (AC cleaning, washing machine repair, house repair) on one map.

**Core mechanic:** a business only appears on the map when its owner opens it *today*. Buyers tap "Chat WhatsApp" — the order/booking happens entirely in WhatsApp. No in-app transactions.

Dua wajah aplikasi:

1. **Tegal F&B Explorer** (halaman utama) — direktori & analisis 63 tempat kuliner Tegal hasil ekspor Google Maps: pencarian + filter, 4 mode tampilan (grid/list/tabel/split), peta ber-cluster, dashboard statistik (Chart.js), favorit + perbandingan, detail tempat (foto, jam buka, ulasan).
2. **App inti check-in** — penyedia daftar sekali lalu check-in harian via GPS; konsumen hanya melihat yang buka hari ini, dan menghubungi via WhatsApp.

## Features — sudah jadi

- Peta interaktif dengan **marker ber-cluster** per kategori (emoji/color) + list/grid view (Explorer)
- Filter kategori (jajanan/jasa, 17 kategori kuliner), filter wilayah & rating, quick-filter (buka sekarang, ramah laptop, outdoor, reservasi, budget) (Explorer)
- Detail tempat lengkap: foto, jam buka, distribusi rating, ulasan, street view, link Google Maps (Explorer)
- Dashboard analytics: komposisi kategori, distribusi rating, rentang harga, kurva jam sibuk, leaderboards (Explorer — admin saja)
- Favorit + tabel perbandingan berdampingan, ekspor JSON/CSV (Explorer — admin saja)
- Check-in harian via GPS ("open today") dengan lokasi terkini — idempotent per hari
- Filter kategori (food/service) + pencarian + radius jarak (app inti)
- **Chat WhatsApp CTA** di setiap listing
- Registrasi penyedia + upload foto (R2) + admin panel (statistik, moderasi, kelola kategori)
- **Detail penyedia sebagai halaman penuh** `/provider/<id>` (#4a/#19) — deep-link, back/refresh via pushState
- **"Satu peta" berlapis (#21/#22)** — tab Peta Explorer: direktori (scrape) + lapisan live "Buka Hari Ini" dari check-in (jajanan + jasa), popup live → `/provider/<id>`
- **Seed penyedia demo** `npm run db:seed:demo` (#23/#24) — 18 bisnis campuran food+jasa, idempoten, re-run refresh check-in hari ini

## Features — to do

Tidak ada untuk MVP — semua item semula "to do" sudah selesai (fase 0–6, lihat [`TASKS.md`](TASKS.md) & `docs/decisions.md`):

- ~~Filter area (kecamatan) + halal flag~~ (#14) — dropdown kecamatan + badge halal
- ~~Items (menu / daftar harga) di detail bisnis~~ (#12/#13)
- ~~Portal pemilik `/kelola/{token}` buka/tutup hari ini~~ (#7)
- ~~Trending sort by views per hari~~ (#4b)
- ~~Registrasi dengan verifikasi WhatsApp (kode 6 digit + approval admin)~~ (#6)
- ~~Cluster markers di peta check-in~~ — cluster penuh di peta Explorer; peta check-in menyusul jika dibutuhkan

Rencana berikutnya (post-hackathon): test coverage lebih luas, **claim-and-verify** direktori ↔ provider (fase 3 [`docs/proposals/unified-map.md`](docs/proposals/unified-map.md)), evaluasi **Overture Maps** sebagai sumber direktori bersih-lisensi (5.457 POI Tegal terukur, CDLA-Permissive), custom domain `.id`.

## Known gaps — F&B vs jasa

App ini didesain untuk **kuliner + jasa rumah tangga** (lihat [`docs/prd.md`](docs/prd.md)). Status setelah peta berlapis (#21/#22) & seed demo (#23/#24):

- ~~**"Satu peta" belum menyatu**~~ — **selesai untuk demo**: tab Peta Explorer kini dua lapisan (direktori F&B + live check-in jajanan/jasa). Sisa pekerjaan pasca-hackathon: klaim listing (fase 3 proposal).
- **Data jasa masih demo** — kategori jasa lengkap & alur end-to-end (registrasi → verifikasi → check-in → listing → WhatsApp), dan `npm run db:seed:demo` mengisi 18 bisnis campuran (10 buka hari ini). **Tapi** penyedia jasa NYATA belum ada — rekrutmen manual 5–10 usaha tetap jadi tugas tim sebelum demo day.
- **Direktori masih scrape Google Maps** — dataset `places` (63 F&B) read-only dari ekspor GMaps (ToS: hanya untuk demo/internal). Overture Maps teruji berisi 5.457 POI Tegal ber-lisensi CDLA-Permissive — kandidat migrasi direktori pasca-hackathon (lihat `docs/decisions.md` 2026-09-29).

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Frontend | React + Vite + TypeScript, Tailwind v4 (+ sedikit custom CSS), Leaflet + markercluster, Chart.js |
| Backend | Hono on Cloudflare Workers (TypeScript) |
| DB / cache / storage | Cloudflare D1 (SQLite) / KV / R2 |
| Deploy | Cloudflare Pages (frontend) + Workers (API) |

## Quick start

```bash
# backend
cd backend
npm install
npm run db:migrate:local          # schema + seeded categories (local D1)
npm run db:seed:places            # seed 63 tempat F&B (dataset Google Maps, baris luar area dibuang) untuk Explorer
cp .dev.vars.example .dev.vars    # set ADMIN_TOKEN for local admin login
npm run dev                       # API at http://localhost:8787

# frontend
cd frontend
npm install
cp .env.example .env              # VITE_API_URL=http://localhost:8787
npm run dev                       # http://localhost:5173
```

Full run / seed / test / deploy instructions: [`docs/runbook.md`](docs/runbook.md)

## Docs

| Doc | What it is |
| --- | ---------- |
| [`docs/prd.md`](docs/prd.md) | Product requirements: problem, users, flows, acceptance criteria |
| [`docs/tech-spec.md`](docs/tech-spec.md) | Canonical spec: stack, data model, API contract |
| [`docs/dev-standards.md`](docs/dev-standards.md) | Coding conventions + validation (Definition of Done) |
| [`docs/ownership.md`](docs/ownership.md) | Who owns what (team) |
| [`docs/decisions.md`](docs/decisions.md) | Decision log |
| [`docs/runbook.md`](docs/runbook.md) | Run / seed / test / deploy commands |
| [`TASKS.md`](TASKS.md) | Live task ledger |
