import { Hono } from "hono";
import type { Env, Item } from "../types";
import { PUBLIC_PROVIDER_COLUMNS } from "../types";
import { EXT_BY_TYPE, MAX_PHOTO_BYTES } from "../constants";
import { todayJakarta } from "../geo";

const router = new Hono<{ Bindings: Env }>();

// Kode verifikasi 6 digit yang ditampilkan ke pemilik (dikirim manual via
// WhatsApp ke admin — OTP otomatis eksplisit di-cut, lihat PRD Flow B).
function generateVerifyCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

// Token magic-link /kelola/{token} — 32 char URL-safe, dikembalikan sekali
// saat registrasi dan tidak pernah muncul di respons publik.
function generateOwnerToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// ---------------------------------------------------------
// POST /providers  -> daftar penyedia baru
// body: { name, phone, category_type, category_id, description?, base_lat?,
//         base_lng?, service_radius_km?, area?, halal? }
// Pendaftar baru berstatus 'pending' sampai admin approve (#6); respons
// membawa owner_token + verify_code SEKALI ini saja.
// ---------------------------------------------------------
router.post("/providers", async (c) => {
  const body = await c.req.json();

  if (!body.name || !body.phone || !body.category_type || !body.category_id) {
    return c.json(
      { error: "name, phone, category_type, category_id wajib diisi" },
      400
    );
  }

  const phone = String(body.phone).replace(/\D/g, "");
  if (phone.length < 9 || phone.length > 15) {
    return c.json({ error: "Nomor WhatsApp tidak valid" }, 400);
  }

  const id = crypto.randomUUID();
  const ownerToken = generateOwnerToken();
  const verifyCode = generateVerifyCode();

  await c.env.DB.prepare(
    `INSERT INTO providers
      (id, name, phone, category_type, category_id, description, base_lat,
       base_lng, service_radius_km, area, halal, approval_status,
       verify_code, owner_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  )
    .bind(
      id,
      body.name,
      phone,
      body.category_type,
      body.category_id,
      body.description ?? null,
      body.base_lat ?? null,
      body.base_lng ?? null,
      body.service_radius_km ?? 0,
      body.area ?? null,
      body.category_type === "jajanan" && body.halal ? 1 : null,
      verifyCode,
      ownerToken
    )
    .run();

  return c.json({ id, owner_token: ownerToken, verify_code: verifyCode }, 201);
});

// ---------------------------------------------------------
// GET /providers/:id
// SELECT eksplisit: kolom rahasia (owner_token, verify_code) tidak untuk publik
// ---------------------------------------------------------
router.get("/providers/:id", async (c) => {
  const id = c.req.param("id");
  const provider = await c.env.DB.prepare(
    `SELECT ${PUBLIC_PROVIDER_COLUMNS} FROM providers WHERE id = ?`
  )
    .bind(id)
    .first();

  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);
  return c.json({ provider });
});

// ---------------------------------------------------------
// GET /providers/:id/items -> menu / daftar harga (publik)
// ---------------------------------------------------------
router.get("/providers/:id/items", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, price, note, available, sort_order FROM items WHERE provider_id = ? ORDER BY sort_order, created_at"
  )
    .bind(id)
    .all<Item>();
  return c.json({ items: results });
});

// ---------------------------------------------------------
// POST /providers/:id/view -> catat 1 view hari ini (untuk trending #4b)
// Dijalankan via waitUntil: client tidak menunggu write selesai.
// ---------------------------------------------------------
router.post("/providers/:id/view", async (c) => {
  const id = c.req.param("id");
  const date = todayJakarta();

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      `INSERT INTO provider_views (provider_id, date, views)
       VALUES (?, ?, 1)
       ON CONFLICT(provider_id, date) DO UPDATE SET views = views + 1`
    )
      .bind(id, date)
      .run()
  );

  return c.json({ status: "ok" });
});

// ---------------------------------------------------------
// POST /providers/:id/photo -> upload foto (body: raw bytes gambar)
// Header wajib: Content-Type: image/jpeg | image/png | image/webp
// Worker jadi proxy ke R2, jadi tidak perlu setup CORS terpisah di bucket.
// ---------------------------------------------------------
router.post("/providers/:id/photo", async (c) => {
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

export const providersRoutes = router;
