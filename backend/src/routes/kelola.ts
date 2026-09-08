import { Hono } from "hono";
import type { Context } from "hono";
import type { Env, Item } from "../types";
import { todayJakarta } from "../geo";
import { invalidateListingsCache } from "../cache";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// Portal pemilik /kelola/{token} (#7) — magic-link auth.
// Token HANYA di path; 401 kalau tidak cocok. Semua mutasi membuang
// cache listings karena mengubah visibilitas/isi publik hari ini.
// ---------------------------------------------------------

type PortalEnv = { Bindings: Env };

async function providerByToken(env: Env, token: string) {
  return env.DB.prepare("SELECT * FROM providers WHERE owner_token = ?")
    .bind(token)
    .first();
}

function unauthorized(c: Context<PortalEnv>) {
  return c.json({ error: "Token portal tidak valid" }, 401);
}

router.get("/kelola/:token", async (c) => {
  const provider = await providerByToken(c.env, c.req.param("token"));
  if (!provider) return unauthorized(c);

  const { results: items } = await c.env.DB.prepare(
    "SELECT * FROM items WHERE provider_id = ? ORDER BY sort_order, created_at"
  )
    .bind(provider.id)
    .all<Item>();

  const today = await c.env.DB.prepare(
    "SELECT lat, lng, note FROM checkins WHERE provider_id = ? AND date = ? AND is_active = 1"
  )
    .bind(provider.id, todayJakarta())
    .first<{ lat: number; lng: number; note: string | null }>();

  // Sama seperti endpoint publik: token & kode verifikasi tidak ikut.
  const { owner_token, verify_code, ...safeProvider } = provider;

  return c.json({
    provider: safeProvider,
    items,
    today: today ? { open: true, note: today.note } : { open: false },
  });
});

// POST /kelola/:token/open -> buka hari ini: upsert checkin + pilih item tersedia
// body: { item_ids?: string[], note?: string, lat?, lng? }
// Koordinat fallback ke base_lat/base_lng (portal bisa dibuka dari desktop).
router.post("/kelola/:token/open", async (c) => {
  const provider = await providerByToken(c.env, c.req.param("token"));
  if (!provider) return unauthorized(c);
  if (provider.suspended) {
    return c.json({ error: "Akun dinonaktifkan admin. Hubungi pengelola." }, 403);
  }

  const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
  const lat = typeof body.lat === "number" ? body.lat : provider.base_lat;
  const lng = typeof body.lng === "number" ? body.lng : provider.base_lng;

  if (lat == null || lng == null) {
    return c.json(
      { error: "Lokasi dibutuhkan: kirim lat/lng atau lengkapi lokasi dasar usaha" },
      400
    );
  }

  const date = todayJakarta();
  await c.env.DB.prepare(
    `INSERT INTO checkins (id, provider_id, date, lat, lng, is_active, note)
     VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(provider_id, date)
     DO UPDATE SET lat = excluded.lat, lng = excluded.lng, is_active = 1, note = excluded.note`
  )
    .bind(crypto.randomUUID(), provider.id, date, lat, lng, body.note ?? null)
    .run();

  // Pilihan item hari ini: yang ditandai tersedia, sisanya tidak
  if (Array.isArray(body.item_ids)) {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE items SET available = 0 WHERE provider_id = ?").bind(provider.id),
      c.env.DB.prepare(
        `UPDATE items SET available = 1 WHERE provider_id = ? AND id IN (${body.item_ids.map(() => "?").join(",")})`
      ).bind(provider.id, ...body.item_ids),
    ]);
  }

  await invalidateListingsCache(c.env, date);
  return c.json({ status: "ok", date });
});

// POST /kelola/:token/close -> tutup hari ini (checkin dinonaktifkan)
router.post("/kelola/:token/close", async (c) => {
  const provider = await providerByToken(c.env, c.req.param("token"));
  if (!provider) return unauthorized(c);

  const date = todayJakarta();
  const result = await c.env.DB.prepare(
    "UPDATE checkins SET is_active = 0 WHERE provider_id = ? AND date = ?"
  )
    .bind(provider.id, date)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Memang belum buka hari ini" }, 409);
  }

  await invalidateListingsCache(c.env, date);
  return c.json({ status: "ok" });
});

// PUT /kelola/:token/business -> edit data usaha (partial)
// body: { name?, description?, area?, halal?, service_radius_km?, base_lat?, base_lng? }
router.put("/kelola/:token/business", async (c) => {
  const provider = await providerByToken(c.env, c.req.param("token"));
  if (!provider) return unauthorized(c);

  const body = await c.req.json();
  const halal =
    provider.category_type === "jasa"
      ? null
      : typeof body.halal === "boolean"
        ? body.halal ? 1 : 0
        : null;

  const result = await c.env.DB.prepare(
    `UPDATE providers SET
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       area = COALESCE(?, area),
       halal = COALESCE(?, halal),
       service_radius_km = COALESCE(?, service_radius_km),
       base_lat = COALESCE(?, base_lat),
       base_lng = COALESCE(?, base_lng)
     WHERE id = ?`
  )
    .bind(
      body.name ?? null,
      body.description ?? null,
      body.area ?? null,
      halal,
      typeof body.service_radius_km === "number" ? body.service_radius_km : null,
      typeof body.base_lat === "number" ? body.base_lat : null,
      typeof body.base_lng === "number" ? body.base_lng : null,
      provider.id
    )
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Tidak ada perubahan" }, 404);
  }

  await invalidateListingsCache(c.env, todayJakarta());
  return c.json({ status: "ok" });
});

// POST /kelola/:token/items -> tambah item
// body: { name, price, note?, sort_order? }
router.post("/kelola/:token/items", async (c) => {
  const provider = await providerByToken(c.env, c.req.param("token"));
  if (!provider) return unauthorized(c);

  const body = await c.req.json();
  if (!body.name || typeof body.price !== "number" || body.price < 0) {
    return c.json({ error: "name dan price (angka >= 0) wajib diisi" }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO items (id, provider_id, name, price, note, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, provider.id, body.name, body.price, body.note ?? null, body.sort_order ?? 0)
    .run();

  return c.json({ id }, 201);
});

// PUT /kelola/:token/items/:itemId -> edit item milik sendiri
router.put("/kelola/:token/items/:itemId", async (c) => {
  const provider = await providerByToken(c.env, c.req.param("token"));
  if (!provider) return unauthorized(c);

  const body = await c.req.json();
  const result = await c.env.DB.prepare(
    `UPDATE items SET
       name = COALESCE(?, name),
       price = COALESCE(?, price),
       note = COALESCE(?, note),
       available = COALESCE(?, available),
       sort_order = COALESCE(?, sort_order)
     WHERE id = ? AND provider_id = ?`
  )
    .bind(
      body.name ?? null,
      typeof body.price === "number" ? body.price : null,
      body.note ?? null,
      typeof body.available === "boolean" ? (body.available ? 1 : 0) : null,
      typeof body.sort_order === "number" ? body.sort_order : null,
      c.req.param("itemId"),
      provider.id
    )
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Item tidak ditemukan" }, 404);
  }
  return c.json({ status: "ok" });
});

// DELETE /kelola/:token/items/:itemId
router.delete("/kelola/:token/items/:itemId", async (c) => {
  const provider = await providerByToken(c.env, c.req.param("token"));
  if (!provider) return unauthorized(c);

  const result = await c.env.DB.prepare(
    "DELETE FROM items WHERE id = ? AND provider_id = ?"
  )
    .bind(c.req.param("itemId"), provider.id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Item tidak ditemukan" }, 404);
  }
  return c.json({ status: "ok" });
});

export const kelolaRoutes = router;
