import { Hono } from "hono";
import type { Env } from "../types";
import { todayJakarta } from "../geo";
import { invalidateListingsCache } from "../cache";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// POST /checkins -> checkin harian (idempotent per hari)
// body: { provider_id, lat, lng }
// ---------------------------------------------------------
router.post("/checkins", async (c) => {
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

  await invalidateListingsCache(c.env, date);

  return c.json({ status: "ok", date });
});

export const checkinsRoutes = router;
