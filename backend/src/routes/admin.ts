import { Hono } from "hono";
import type { Env } from "../types";
import { todayJakarta } from "../geo";
import { invalidateListingsCache } from "../cache";
import { adminAuth } from "../middleware";

const router = new Hono<{ Bindings: Env }>();

router.use("*", adminAuth);

// GET /admin/me -> dipakai frontend untuk verifikasi token saat "login"
router.get("/me", (c) => c.json({ ok: true }));

// GET /admin/stats -> ringkasan angka untuk dashboard
router.get("/stats", async (c) => {
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
router.get("/providers", async (c) => {
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
router.post("/providers/:id/deactivate-checkin", async (c) => {
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

  await invalidateListingsCache(c.env, today);
  return c.json({ status: "ok" });
});

// PATCH /admin/providers/:id -> toggle suspend (moderasi)
// body: { suspended: boolean }
router.patch("/providers/:id", async (c) => {
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
router.delete("/providers/:id", async (c) => {
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
router.delete("/providers/:id/photo", async (c) => {
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
router.get("/categories", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, type, icon FROM categories ORDER BY type, name"
  ).all();
  return c.json({ categories: results });
});

// POST /admin/categories -> tambah kategori baru
// body: { id, name, type, icon }
router.post("/categories", async (c) => {
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
router.patch("/categories/:id", async (c) => {
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
router.delete("/categories/:id", async (c) => {
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

export const adminRoutes = router;
