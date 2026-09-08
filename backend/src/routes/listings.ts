import { Hono } from "hono";
import type { ActiveListing, Env } from "../types";
import { boundingBox, haversineKm, todayJakarta } from "../geo";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// GET /listings?type=jasa&category=tukang&lat=&lng=&radius=5
//                    &area=Margadana&halal=1&sort=trending
// Cari penyedia yang checkin aktif hari ini, difilter jarak.
// ---------------------------------------------------------
router.get("/listings", async (c) => {
  const type = c.req.query("type"); // 'jajanan' | 'jasa' | undefined
  const category = c.req.query("category");
  const area = c.req.query("area"); // kecamatan (#14)
  const halal = c.req.query("halal"); // '1' = hanya berhalal (#14)
  const sort = c.req.query("sort"); // 'trending' (#4b) | default jarak
  const lat = parseFloat(c.req.query("lat") ?? "");
  const lng = parseFloat(c.req.query("lng") ?? "");
  const radiusKm = parseFloat(c.req.query("radius") ?? "5");

  const date = todayJakarta();

  let sql = `
    SELECT p.id, p.name, p.phone, p.category_type, p.category_id,
           p.description, p.photo_url, p.base_lat, p.base_lng,
           p.service_radius_km, p.suspended, p.area, p.halal,
           p.approval_status, p.created_at,
           COALESCE(pv.views, 0) as views,
           ck.lat as checkin_lat, ck.lng as checkin_lng
    FROM checkins ck
    JOIN providers p ON p.id = ck.provider_id
    LEFT JOIN provider_views pv ON pv.provider_id = p.id AND pv.date = ?
    WHERE ck.date = ? AND ck.is_active = 1 AND p.suspended = 0
      AND p.approval_status = 'approved'
  `;
  const params: (string | number)[] = [date, date];

  if (type) {
    sql += " AND p.category_type = ?";
    params.push(type);
  }
  if (category) {
    sql += " AND p.category_id = ?";
    params.push(category);
  }
  if (area) {
    sql += " AND p.area = ?";
    params.push(area);
  }
  if (halal === "1") {
    sql += " AND p.halal = 1";
  }

  // Bounding box filter dulu (murah secara CPU) sebelum haversine presisi
  if (!isNaN(lat) && !isNaN(lng)) {
    const bbox = boundingBox(lat, lng, radiusKm);
    sql += " AND ck.lat BETWEEN ? AND ? AND ck.lng BETWEEN ? AND ?";
    params.push(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng);
  }

  if (sort === "trending") {
    sql += " ORDER BY views DESC";
  }

  const { results } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all<ActiveListing & { views: number }>();

  let listings = results;

  // Hitung jarak presisi & filter radius sebenarnya (bbox itu kotak, bukan lingkaran).
  // Trending tetap diurutkan by views; jarak hanya tiebreak.
  if (!isNaN(lat) && !isNaN(lng)) {
    listings = listings
      .map((r) => ({
        ...r,
        distance_km: haversineKm(lat, lng, r.checkin_lat, r.checkin_lng),
      }))
      .filter((r) => (r.distance_km as number) <= radiusKm);

    listings =
      sort === "trending"
        ? listings.sort(
            (a, b) =>
              b.views - a.views ||
              (a.distance_km as number) - (b.distance_km as number),
          )
        : listings.sort(
            (a, b) => (a.distance_km as number) - (b.distance_km as number),
          );
  }

  return c.json({ date, count: listings.length, listings });
});

export const listingsRoutes = router;
