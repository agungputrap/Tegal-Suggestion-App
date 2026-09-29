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
           ck.lat as checkin_lat, ck.lng as checkin_lng,
           ck.created_at as last_checkin_at
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

  // ---- Streak freshness & konfirmasi publik (fase 0 #27) ----
  // streak_days = berapa hari beruntun (berakhir hari ini) provider
  // check-in aktif — bacaan pertama dari data historis checkins.
  // confirm_count = berapa pelanggan menegaskan "masih buka" hari ini.
  if (listings.length > 0) {
    const ids = listings.map((l) => l.id);
    const placeholders = ids.map(() => "?").join(",");

    const hist = await c.env.DB.prepare(
      `SELECT provider_id, date FROM checkins
       WHERE provider_id IN (${placeholders})
         AND is_active = 1 AND date >= date(?, '-60 days')
       ORDER BY date DESC`,
    )
      .bind(...ids, date)
      .all<{ provider_id: string; date: string }>();

    const streakByProvider = new Map<string, number>();
    for (const row of hist.results) {
      // results terurut tanggal DESC; hitung rentetan yang tersambung
      // mulai hari ini (atau kemarin — check-in kemarin masih "beruntun"
      // sampai hari ini benar-benar lewat tanpa kabar)
      const streak = streakByProvider.get(row.provider_id);
      if (streak === undefined) {
        if (row.date === date || row.date === minusDays(date, 1)) {
          streakByProvider.set(row.provider_id, 1);
        }
        continue;
      }
      const lastDate = minusDays(date, streak - 1);
      if (row.date === minusDays(lastDate, 1)) {
        streakByProvider.set(row.provider_id, streak + 1);
      }
    }

    const confirms = await c.env.DB.prepare(
      `SELECT provider_id, COUNT(*) as count FROM confirm_opens
       WHERE date = ? GROUP BY provider_id`,
    )
      .bind(date)
      .all<{ provider_id: string; count: number }>();
    const confirmByProvider = new Map(
      confirms.results.map((r) => [r.provider_id, r.count]),
    );

    listings = listings.map((l) => ({
      ...l,
      streak_days: streakByProvider.get(l.id) ?? 0,
      confirm_count: confirmByProvider.get(l.id) ?? 0,
    }));
  }

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

// YYYY-MM-DD minus n hari (WIB-agnostic: input sudah tanggal Jakarta)
function minusDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export const listingsRoutes = router;
