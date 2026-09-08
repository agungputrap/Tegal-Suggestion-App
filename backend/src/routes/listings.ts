import { Hono } from "hono";
import type { ActiveListing, Env } from "../types";
import { boundingBox, haversineKm, todayJakarta } from "../geo";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// GET /listings?type=jasa&category=tukang&lat=&lng=&radius=5
// Cari penyedia yang checkin aktif hari ini, difilter jarak.
// ---------------------------------------------------------
router.get("/listings", async (c) => {
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

export const listingsRoutes = router;
