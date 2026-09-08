import { Hono } from "hono";
import type { Env, PlaceRecord } from "../types";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// GET /places -> dataset F&B Tegal dari Google Maps (read-only referensi)
// Data disemai via `npm run db:seed:places`, tidak pernah ditulis dari app.
// Payload besar (~1.5MB) karena membawa ulasan & foto — kolom JSON dikirim
// sebagai string supaya Worker tidak boros CPU parse; frontend yang parse.
// ---------------------------------------------------------
router.get("/places", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM places ORDER BY review_count DESC`,
  ).all<PlaceRecord>();
  return c.json({ count: results.length, places: results });
});

export const placesRoutes = router;
