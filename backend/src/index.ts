import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context, Next } from "hono";
import type { Env, ActiveListing, PlaceRecord } from "./types";
import { boundingBox, haversineKm, todayJakarta } from "./geo";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// ---------------------------------------------------------
// Auth admin: satu shared token (Bearer), disimpan sebagai Worker secret.
// Setup: wrangler secret put ADMIN_TOKEN
// Cocok untuk MVP satu-admin; kalau butuh banyak admin dengan hak berbeda,
// ganti ke sistem user+password di D1 pada Fase 2.
// ---------------------------------------------------------
async function adminAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const header = c.req.header("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");

  if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
}

app.use("/admin/*", adminAuth);

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB, cukup untuk foto HP tanpa bikin R2 write mahal
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// ---------------------------------------------------------
// GET /categories
// ---------------------------------------------------------
app.get("/categories", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, type, icon FROM categories ORDER BY type, name"
  ).all();
  return c.json({ categories: results });
});

// ---------------------------------------------------------
// GET /places -> dataset F&B Tegal dari Google Maps (read-only referensi)
// Data disemai via `npm run db:seed:places`, tidak pernah ditulis dari app.
// Payload besar (~1.5MB) karena membawa ulasan & foto — kolom JSON dikirim
// sebagai string supaya Worker tidak boros CPU parse; frontend yang parse.
// ---------------------------------------------------------
app.get("/places", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM places ORDER BY review_count DESC`
  ).all<PlaceRecord>();
  return c.json({ count: results.length, places: results });
});

// ---------------------------------------------------------
// POST /providers  -> daftar penyedia baru
// body: { name, phone, category_type, category_id, description?, base_lat?, base_lng?, service_radius_km? }
// ---------------------------------------------------------
app.post("/providers", async (c) => {
  const body = await c.req.json();

  if (!body.name || !body.phone || !body.category_type || !body.category_id) {
    return c.json(
      { error: "name, phone, category_type, category_id wajib diisi" },
      400
    );
  }

  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO providers
      (id, name, phone, category_type, category_id, description, base_lat, base_lng, service_radius_km)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.name,
      body.phone,
      body.category_type,
      body.category_id,
      body.description ?? null,
      body.base_lat ?? null,
      body.base_lng ?? null,
      body.service_radius_km ?? 0
    )
    .run();

  return c.json({ id }, 201);
});

// ---------------------------------------------------------
// GET /providers/:id
// ---------------------------------------------------------
app.get("/providers/:id", async (c) => {
  const id = c.req.param("id");
  const provider = await c.env.DB.prepare(
    "SELECT * FROM providers WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);
  return c.json({ provider });
});

// ---------------------------------------------------------
// POST /providers/:id/photo -> upload foto (body: raw bytes gambar)
// Header wajib: Content-Type: image/jpeg | image/png | image/webp
// Worker jadi proxy ke R2, jadi tidak perlu setup CORS terpisah di bucket.
// ---------------------------------------------------------
app.post("/providers/:id/photo", async (c) => {
  const providerId = c.req.param("id");
  const contentType = c.req.header("content-type") ?? "";

  const ext = EXT_BY_TYPE[contentType];
  if (!ext) {
    return c.json(
      { error: "Format tidak didukung. Gunakan JPEG, PNG, atau WebP." },
      400
    );
  }

  const provider = await c.env.DB.prepare(
    "SELECT id, photo_url FROM providers WHERE id = ?"
  )
    .bind(providerId)
    .first<{ id: string; photo_url: string | null }>();

  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);

  const body = await c.req.arrayBuffer();

  if (body.byteLength === 0) {
    return c.json({ error: "Body kosong, kirim data gambar mentah" }, 400);
  }
  if (body.byteLength > MAX_PHOTO_BYTES) {
    return c.json(
      { error: `Ukuran foto maksimal ${MAX_PHOTO_BYTES / 1024 / 1024}MB` },
      413
    );
  }

  const key = `providers/${providerId}/${Date.now()}.${ext}`;

  await c.env.PHOTOS.put(key, body, {
    httpMetadata: { contentType },
  });

  // Hapus foto lama biar tidak numpuk sampah di bucket
  if (provider.photo_url?.startsWith("/photos/")) {
    const oldKey = provider.photo_url.replace("/photos/", "");
    c.executionCtx.waitUntil(c.env.PHOTOS.delete(oldKey));
  }

  const photoUrl = `/photos/${key}`;
  await c.env.DB.prepare("UPDATE providers SET photo_url = ? WHERE id = ?")
    .bind(photoUrl, providerId)
    .run();

  return c.json({ photo_url: photoUrl });
});

// ---------------------------------------------------------
// GET /photos/* -> serve foto dari R2
// ---------------------------------------------------------
app.get("/photos/*", async (c) => {
  const key = c.req.path.replace(/^\/photos\//, "");
  const obj = await c.env.PHOTOS.get(key);

  if (!obj) return c.json({ error: "Foto tidak ditemukan" }, 404);

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: obj.httpEtag,
    },
  });
});

// ---------------------------------------------------------
// POST /checkins -> checkin harian (idempotent per hari)
// body: { provider_id, lat, lng }
// ---------------------------------------------------------
app.post("/checkins", async (c) => {
  const body = await c.req.json();

  if (!body.provider_id || body.lat == null || body.lng == null) {
    return c.json({ error: "provider_id, lat, lng wajib diisi" }, 400);
  }

  const provider = await c.env.DB.prepare(
    "SELECT suspended FROM providers WHERE id = ?"
  )
    .bind(body.provider_id)
    .first<{ suspended: number }>();

  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);
  if (provider.suspended) {
    return c.json(
      { error: "Akun ini dinonaktifkan admin. Hubungi pengelola." },
      403
    );
  }

  const date = todayJakarta();
  const id = crypto.randomUUID();

  // UPSERT: kalau sudah checkin hari ini, update lokasi & aktifkan lagi
  await c.env.DB.prepare(
    `INSERT INTO checkins (id, provider_id, date, lat, lng, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(provider_id, date)
     DO UPDATE SET lat = excluded.lat, lng = excluded.lng, is_active = 1`
  )
    .bind(id, body.provider_id, date, body.lat, body.lng)
    .run();

  // Invalidate cache KV untuk hari ini (sederhana: hapus key gabungan)
  // Strategi cache detail ada di /listings, di sini cukup tandai stale.
  await c.env.ACTIVE_CACHE.delete(`listings:${date}`);

  return c.json({ status: "ok", date });
});

// ---------------------------------------------------------
// GET /listings?type=jasa&category=tukang&lat=&lng=&radius=5
// Cari penyedia yang checkin aktif hari ini, difilter jarak.
// ---------------------------------------------------------
app.get("/listings", async (c) => {
  const type = c.req.query("type"); // 'jajanan' | 'jasa' | undefined
  const category = c.req.query("category");
  const lat = parseFloat(c.req.query("lat") ?? "");
  const lng = parseFloat(c.req.query("lng") ?? "");
  const radiusKm = parseFloat(c.req.query("radius") ?? "5");

  const date = todayJakarta();

  let sql = `
    SELECT p.*, ck.lat as checkin_lat, ck.lng as checkin_lng
    FROM checkins ck
    JOIN providers p ON p.id = ck.provider_id
    WHERE ck.date = ? AND ck.is_active = 1 AND p.suspended = 0
  `;
  const params: (string | number)[] = [date];

  if (type) {
    sql += " AND p.category_type = ?";
    params.push(type);
  }
  if (category) {
    sql += " AND p.category_id = ?";
    params.push(category);
  }

  // Bounding box filter dulu (murah secara CPU) sebelum haversine presisi
  if (!isNaN(lat) && !isNaN(lng)) {
    const bbox = boundingBox(lat, lng, radiusKm);
    sql += " AND ck.lat BETWEEN ? AND ? AND ck.lng BETWEEN ? AND ?";
    params.push(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng);
  }

  const { results } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all<ActiveListing>();

  let listings = results;

  // Hitung jarak presisi & filter radius sebenarnya (bbox itu kotak, bukan lingkaran)
  if (!isNaN(lat) && !isNaN(lng)) {
    listings = listings
      .map((r) => ({
        ...r,
        distance_km: haversineKm(lat, lng, r.checkin_lat, r.checkin_lng),
      }))
      .filter((r) => (r.distance_km as number) <= radiusKm)
      .sort((a, b) => (a.distance_km as number) - (b.distance_km as number));
  }

  return c.json({ date, count: listings.length, listings });
});

// ===========================================================
// ADMIN ROUTES (dilindungi adminAuth di atas)
// ===========================================================

// GET /admin/me -> dipakai frontend untuk verifikasi token saat "login"
app.get("/admin/me", (c) => c.json({ ok: true }));

// GET /admin/stats -> ringkasan angka untuk dashboard
app.get("/admin/stats", async (c) => {
  const today = todayJakarta();

  const [totalProviders, activeToday, byType, byCategory] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as n FROM providers WHERE suspended = 0").first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as n FROM checkins ck
       JOIN providers p ON p.id = ck.provider_id
       WHERE ck.date = ? AND ck.is_active = 1 AND p.suspended = 0`
    ).bind(today).first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT category_type as type, COUNT(*) as n FROM providers
       WHERE suspended = 0 GROUP BY category_type`
    ).all<{ type: string; n: number }>(),
    c.env.DB.prepare(
      `SELECT c.name as category, COUNT(*) as n FROM providers p
       JOIN categories c ON c.id = p.category_id
       WHERE p.suspended = 0 GROUP BY p.category_id ORDER BY n DESC`
    ).all<{ category: string; n: number }>(),
  ]);

  return c.json({
    total_providers: totalProviders?.n ?? 0,
    active_today: activeToday?.n ?? 0,
    by_type: byType.results,
    by_category: byCategory.results,
  });
});

// GET /admin/providers?type=jajanan|jasa&status=active|suspended|all&q=search
app.get("/admin/providers", async (c) => {
  const today = todayJakarta();
  const type = c.req.query("type"); // 'jajanan' | 'jasa' | undefined
  const status = c.req.query("status") ?? "all"; // 'active' | 'suspended' | 'all'
  const q = c.req.query("q");

  let sql = `
    SELECT p.*,
      CASE WHEN ck.is_active = 1 THEN 1 ELSE 0 END as active_today
    FROM providers p
    LEFT JOIN checkins ck ON ck.provider_id = p.id AND ck.date = ?
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [today];

  if (type) {
    sql += " AND p.category_type = ?";
    params.push(type);
  }
  if (status === "suspended") {
    sql += " AND p.suspended = 1";
  } else if (status === "active") {
    sql += " AND p.suspended = 0 AND ck.is_active = 1";
  }
  if (q) {
    sql += " AND (p.name LIKE ? OR p.phone LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += " ORDER BY p.created_at DESC";

  const { results } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all();

  return c.json({ providers: results });
});

// POST /admin/providers/:id/deactivate-checkin
// Nonaktifkan checkin HARI INI saja tanpa suspend akun permanen -- cocok
// untuk kasus "checkin-nya kelihatan janggal" tapi belum layak diblokir total.
app.post("/admin/providers/:id/deactivate-checkin", async (c) => {
  const id = c.req.param("id");
  const today = todayJakarta();

  const result = await c.env.DB.prepare(
    "UPDATE checkins SET is_active = 0 WHERE provider_id = ? AND date = ?"
  )
    .bind(id, today)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Provider belum checkin hari ini" }, 404);
  }

  await c.env.ACTIVE_CACHE.delete(`listings:${today}`);
  return c.json({ status: "ok" });
});

// PATCH /admin/providers/:id -> toggle suspend (moderasi)
// body: { suspended: boolean }
app.patch("/admin/providers/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  if (typeof body.suspended !== "boolean") {
    return c.json({ error: "field 'suspended' (boolean) wajib diisi" }, 400);
  }

  const result = await c.env.DB.prepare(
    "UPDATE providers SET suspended = ? WHERE id = ?"
  )
    .bind(body.suspended ? 1 : 0, id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Provider tidak ditemukan" }, 404);
  }

  return c.json({ status: "ok" });
});

// DELETE /admin/providers/:id -> hapus permanen (provider, checkin, foto)
app.delete("/admin/providers/:id", async (c) => {
  const id = c.req.param("id");

  const provider = await c.env.DB.prepare(
    "SELECT photo_url FROM providers WHERE id = ?"
  )
    .bind(id)
    .first<{ photo_url: string | null }>();

  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM checkins WHERE provider_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM providers WHERE id = ?").bind(id),
  ]);

  if (provider.photo_url?.startsWith("/photos/")) {
    const key = provider.photo_url.replace("/photos/", "");
    c.executionCtx.waitUntil(c.env.PHOTOS.delete(key));
  }

  return c.json({ status: "ok" });
});

// DELETE /admin/providers/:id/photo -> moderasi foto (hapus tanpa hapus provider)
app.delete("/admin/providers/:id/photo", async (c) => {
  const id = c.req.param("id");

  const provider = await c.env.DB.prepare(
    "SELECT photo_url FROM providers WHERE id = ?"
  )
    .bind(id)
    .first<{ photo_url: string | null }>();

  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);

  if (provider.photo_url?.startsWith("/photos/")) {
    const key = provider.photo_url.replace("/photos/", "");
    c.executionCtx.waitUntil(c.env.PHOTOS.delete(key));
  }

  await c.env.DB.prepare("UPDATE providers SET photo_url = NULL WHERE id = ?")
    .bind(id)
    .run();

  return c.json({ status: "ok" });
});

// GET /admin/categories -> sama seperti publik, tapi lewat auth (dipakai form admin)
app.get("/admin/categories", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, type, icon FROM categories ORDER BY type, name"
  ).all();
  return c.json({ categories: results });
});

// POST /admin/categories -> tambah kategori baru
// body: { id, name, type, icon }
app.post("/admin/categories", async (c) => {
  const body = await c.req.json();

  if (!body.id || !body.name || !body.type) {
    return c.json({ error: "id, name, type wajib diisi" }, 400);
  }
  if (!["jajanan", "jasa"].includes(body.type)) {
    return c.json({ error: "type harus 'jajanan' atau 'jasa'" }, 400);
  }

  await c.env.DB.prepare(
    "INSERT INTO categories (id, name, type, icon) VALUES (?, ?, ?, ?)"
  )
    .bind(body.id, body.name, body.type, body.icon ?? "📍")
    .run();

  return c.json({ status: "ok" }, 201);
});

// PATCH /admin/categories/:id -> edit nama/icon kategori
app.patch("/admin/categories/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  await c.env.DB.prepare(
    "UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon) WHERE id = ?"
  )
    .bind(body.name ?? null, body.icon ?? null, id)
    .run();

  return c.json({ status: "ok" });
});

// DELETE /admin/categories/:id -> hapus kategori (gagal kalau masih dipakai provider)
app.delete("/admin/categories/:id", async (c) => {
  const id = c.req.param("id");

  const inUse = await c.env.DB.prepare(
    "SELECT COUNT(*) as n FROM providers WHERE category_id = ?"
  )
    .bind(id)
    .first<{ n: number }>();

  if (inUse && inUse.n > 0) {
    return c.json(
      { error: `Kategori masih dipakai ${inUse.n} provider, tidak bisa dihapus` },
      409
    );
  }

  await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return c.json({ status: "ok" });
});

// ---------------------------------------------------------
// Scheduled handler: auto-expire checkin kemarin (dipanggil via Cron Trigger)
// ---------------------------------------------------------
async function expireYesterdayCheckins(env: Env) {
  const today = todayJakarta();
  // Tandai semua checkin yang tanggalnya bukan hari ini jadi non-aktif.
  // Data tidak dihapus (dipakai untuk histori/rating di Fase 2).
  await env.DB.prepare(
    "UPDATE checkins SET is_active = 0 WHERE date != ? AND is_active = 1"
  )
    .bind(today)
    .run();

  await env.ACTIVE_CACHE.delete(`listings:${today}`);
}

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(expireYesterdayCheckins(env));
  },
};
