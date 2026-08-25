# Jajan + Jasa API (Cloudflare Workers)

Skeleton backend: Hono + D1 + KV + R2 + Cron Trigger.

## Setup

```bash
npm install

# Buat resource Cloudflare (sekali saja, catat ID yang muncul)
npm run db:create        # -> tempel database_id ke wrangler.toml
npm run kv:create        # -> tempel id ke wrangler.toml

# Migrasi schema
npm run db:migrate:local   # untuk dev lokal
npm run db:migrate:remote  # untuk production

# Buat R2 bucket (lewat dashboard atau CLI)
npx wrangler r2 bucket create jajan-jasa-photos

# Set token admin (JANGAN taruh di wrangler.toml, itu bukan secret yang aman)
npx wrangler secret put ADMIN_TOKEN
# untuk dev lokal, tulis manual di .dev.vars:
echo 'ADMIN_TOKEN=ganti-dengan-token-rahasia' >> .dev.vars
```

## Development

```bash
npm run dev
```

Coba endpoint:

```bash
# Lihat kategori
curl http://localhost:8787/categories

# Daftar provider
curl -X POST http://localhost:8787/providers \
  -H "Content-Type: application/json" \
  -d '{"name":"Tukang AC Pak Bud","phone":"08123456789","category_type":"jasa","category_id":"servis-ac","base_lat":-7.98,"base_lng":112.63}'

# Checkin
curl -X POST http://localhost:8787/checkins \
  -H "Content-Type: application/json" \
  -d '{"provider_id":"<id_dari_response_di_atas>","lat":-7.98,"lng":112.63}'

# Cari listing aktif di radius 5km
curl "http://localhost:8787/listings?type=jasa&lat=-7.98&lng=112.63&radius=5"

# Upload foto (body = bytes gambar mentah, bukan multipart/form-data)
curl -X POST http://localhost:8787/providers/<id>/photo \
  -H "Content-Type: image/jpeg" \
  --data-binary @foto.jpg

# Lihat foto yang sudah diupload
curl http://localhost:8787/photos/providers/<id>/<timestamp>.jpg --output hasil.jpg

# --- Admin (butuh header Authorization) ---
curl http://localhost:8787/admin/stats \
  -H "Authorization: Bearer ganti-dengan-token-rahasia"

curl -X PATCH http://localhost:8787/admin/providers/<id> \
  -H "Authorization: Bearer ganti-dengan-token-rahasia" \
  -H "Content-Type: application/json" \
  -d '{"suspended": true}'
```

## Deploy

```bash
npm run deploy
```

Setelah deploy, hubungkan domain `.id` lewat Cloudflare DNS ke Worker/Pages
(jangan pakai subdomain `.workers.dev` untuk submission lomba — syaratnya
domain `.id`).

## Catatan implementasi

- **Bounding box + haversine**: filter jarak dilakukan 2 tahap supaya murah
  secara CPU time (relevan untuk Workers free tier: 10ms CPU/request).
- **KV hanya cache**: source of truth tetap D1. Endpoint `/checkins`
  menghapus cache terkait, bukan menulis ke KV langsung, untuk menghindari
  masalah eventual consistency.
- **Cron Trigger** (`0 17 * * *` UTC = 00:00 WIB) menjalankan
  `expireYesterdayCheckins` — data checkin tidak dihapus, hanya ditandai
  `is_active = 0` agar bisa dipakai untuk histori/rating di Fase 2.
- **Upload foto**: `POST /providers/:id/photo` menerima body bytes gambar
  mentah (bukan multipart) dengan header `Content-Type` sesuai jenis file.
  Worker jadi proxy langsung ke R2 — jadi tidak perlu setup CORS di bucket
  R2 secara terpisah, cukup middleware `cors()` yang sudah ada di Worker.
  Foto lama otomatis dihapus saat diganti, supaya bucket tidak numpuk sampah.
- **Serve foto**: `GET /photos/*` streaming langsung dari R2 dengan cache
  header 1 tahun (`immutable`) — aman karena nama file pakai timestamp,
  jadi tidak akan ada foto lama yang ke-cache di URL yang sama.
- **Belum ada**: chat in-app, dan auth admin masih single shared token
  (cukup untuk satu admin/lomba; Fase 2 perlu user+password per admin kalau
  tim membesar). Ditulis sebagai "Rencana Pengembangan" di paper.

## Endpoint admin (butuh header `Authorization: Bearer <ADMIN_TOKEN>`)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/admin/me` | Verifikasi token (dipakai frontend saat "login") |
| GET | `/admin/stats` | Total provider, aktif hari ini, breakdown kategori |
| GET | `/admin/providers?type=&status=&q=` | List provider, bisa difilter jenis/status/cari nama-HP |
| PATCH | `/admin/providers/:id` | Suspend/aktifkan provider (moderasi) |
| DELETE | `/admin/providers/:id` | Hapus permanen (provider + checkin + foto) |
| DELETE | `/admin/providers/:id/photo` | Hapus foto saja (moderasi konten) |
| POST | `/admin/providers/:id/deactivate-checkin` | Nonaktifkan checkin **hari ini saja** tanpa suspend akun |
| GET/POST/PATCH/DELETE | `/admin/categories` | Kelola kategori + icon |
