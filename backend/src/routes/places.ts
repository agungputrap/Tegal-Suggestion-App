import { Hono } from "hono";
import type { Env, PlaceRecord } from "../types";
import { todayJakarta } from "../geo";

const router = new Hono<{ Bindings: Env }>();

// Klaim listing (fase 3 #31): place yang sudah diklaim provider membawa
// identitas + status live hari ini — jembatan dataset scrape -> suplai live.
type PlaceWithClaim = PlaceRecord & {
  claimed_provider_id: string | null;
  claimed_name: string | null;
  claimed_open: number;
};

const CLAIM_SELECT = `
  SELECT pl.*,
         p.id as claimed_provider_id,
         p.name as claimed_name,
         CASE WHEN ck.is_active = 1 THEN 1 ELSE 0 END as claimed_open
  FROM places pl
  LEFT JOIN providers p ON p.place_id = pl.id
  LEFT JOIN checkins ck
    ON ck.provider_id = p.id AND ck.date = ? AND ck.is_active = 1
`;

// ---------------------------------------------------------
// GET /places -> dataset F&B Tegal dari Google Maps (read-only referensi)
// Data disemai via `npm run db:seed:places`, tidak pernah ditulis dari app.
// Payload besar (~1.5MB) karena membawa ulasan & foto — kolom JSON dikirim
// sebagai string supaya Worker tidak boros CPU parse; frontend yang parse.
// ---------------------------------------------------------
router.get("/places", async (c) => {
  const { results } = await c.env.DB.prepare(
    `${CLAIM_SELECT} ORDER BY pl.review_count DESC`,
  )
    .bind(todayJakarta())
    .all<PlaceWithClaim>();
  return c.json({ count: results.length, places: results });
});

// ---------------------------------------------------------
// GET /places/:id -> satu place (untuk prefill form klaim #31 tanpa
// harus memuat seluruh dataset 1.5MB)
// ---------------------------------------------------------
router.get("/places/:id", async (c) => {
  const place = await c.env.DB.prepare(`${CLAIM_SELECT} WHERE pl.id = ?`)
    .bind(todayJakarta(), c.req.param("id"))
    .first<PlaceWithClaim>();

  if (!place) return c.json({ error: "Place tidak ditemukan" }, 404);
  return c.json({ place });
});

export const placesRoutes = router;
