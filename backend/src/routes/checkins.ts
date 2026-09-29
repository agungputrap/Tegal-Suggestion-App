import { Hono } from "hono";
import type { Env } from "../types";
import { haversineKm, todayJakarta } from "../geo";
import { invalidateListingsCache } from "../cache";
import { clientIp, rateLimit } from "../rateLimit";

const router = new Hono<{ Bindings: Env }>();

// GPS sanity: check-in harus wajar dari lokasi dasar usaha. Batas bawah
// 25 km menoleransi teknisi berkeliling (service_radius_km default 0)
// sekaligus memblokir pemalsuan lintas kota; usaha dengan radius lebih
// besar memakai radiusnya sendiri.
const MIN_RADIUS_KM = 25;

// ---------------------------------------------------------
// POST /checkins -> checkin harian (idempotent per hari)
// body: { provider_id, lat, lng, owner_token }
// Fase 0 strategi (#27): check-in TIDAK lagi publik — wajib owner_token
// (dikembalikan sekali saat registrasi, disimpan di perangkat owner),
// dan koordinat divalidasi terhadap lokasi dasar usaha.
// ---------------------------------------------------------
router.post("/checkins", async (c) => {
  if (!rateLimit(`checkin:${clientIp(c.req.raw.headers)}`, 10, 10 * 60_000)) {
    return c.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, 429);
  }

  const body = await c.req.json();

  if (
    !body.provider_id ||
    body.lat == null ||
    body.lng == null ||
    !body.owner_token
  ) {
    return c.json(
      { error: "provider_id, lat, lng, owner_token wajib diisi" },
      400,
    );
  }

  const provider = await c.env.DB.prepare(
    `SELECT owner_token, suspended, approval_status, base_lat, base_lng,
            service_radius_km
     FROM providers WHERE id = ?`,
  )
    .bind(body.provider_id)
    .first<{
      owner_token: string;
      suspended: number;
      approval_status: string;
      base_lat: number | null;
      base_lng: number | null;
      service_radius_km: number;
    }>();

  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);
  if (provider.owner_token !== body.owner_token) {
    return c.json(
      { error: "owner_token tidak valid — check-in hanya oleh pemilik usaha" },
      403,
    );
  }
  if (provider.suspended) {
    return c.json(
      { error: "Akun ini dinonaktifkan admin. Hubungi pengelola." },
      403,
    );
  }
  if (provider.approval_status !== "approved") {
    return c.json(
      {
        error: "Pendaftaran belum disetujui admin. Kirim kode verifikasi dulu.",
      },
      403,
    );
  }

  // GPS sanity — hanya jika usaha punya lokasi dasar tercatat
  if (provider.base_lat != null && provider.base_lng != null) {
    const maxKm = Math.max(provider.service_radius_km || 0, MIN_RADIUS_KM);
    const distKm = haversineKm(
      provider.base_lat,
      provider.base_lng,
      body.lat,
      body.lng,
    );
    if (distKm > maxKm) {
      return c.json(
        {
          error: `Lokasi check-in ${distKm.toFixed(0)} km dari lokasi dasar usaha (maks ${maxKm} km).`,
        },
        422,
      );
    }
  }

  const date = todayJakarta();
  const id = crypto.randomUUID();

  // UPSERT: kalau sudah checkin hari ini, update lokasi & aktifkan lagi
  await c.env.DB.prepare(
    `INSERT INTO checkins (id, provider_id, date, lat, lng, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(provider_id, date)
     DO UPDATE SET lat = excluded.lat, lng = excluded.lng, is_active = 1`,
  )
    .bind(id, body.provider_id, date, body.lat, body.lng)
    .run();

  await invalidateListingsCache(c.env, date);

  return c.json({ status: "ok", date });
});

export const checkinsRoutes = router;
