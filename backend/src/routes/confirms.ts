import { Hono } from "hono";
import type { Env } from "../types";
import { todayJakarta } from "../geo";
import { clientIp, rateLimit } from "../rateLimit";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// POST /providers/:id/confirm-open -> konfirmasi publik "✓ Masih buka"
// (fase 0 strategi #27). Verifikasi kedua di atas self-report owner:
// pelanggan yang benar-benar datang menegaskan usaha buka hari ini.
// Dedupe 1x per pengunjung per hari per provider via visitor_hash
// (sha256(IP + tanggal) — tidak dapat dilacak lintas hari).
// ---------------------------------------------------------
router.post("/providers/:id/confirm-open", async (c) => {
  if (
    !rateLimit(`confirm:${clientIp(c.req.raw.headers)}`, 30, 60 * 60_000)
  ) {
    return c.json({ error: "Terlalu banyak konfirmasi. Coba lagi nanti." }, 429);
  }

  const providerId = c.req.param("id");
  const date = todayJakarta();

  const provider = await c.env.DB.prepare(
    "SELECT id FROM providers WHERE id = ? AND suspended = 0",
  )
    .bind(providerId)
    .first<{ id: string }>();
  if (!provider) return c.json({ error: "Provider tidak ditemukan" }, 404);

  const ip = clientIp(c.req.raw.headers);
  const visitorHash = await sha256(`${ip}:${date}`);

  // Konfirmasi ulang pengunjung sama tetap dihitung satu (UNIQUE), tapi
  // tetap balas 200 dengan count terkini supaya UI tidak error.
  await c.env.DB.prepare(
    `INSERT INTO confirm_opens (id, provider_id, date, visitor_hash)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(provider_id, date, visitor_hash) DO NOTHING`,
  )
    .bind(crypto.randomUUID(), providerId, date, visitorHash)
    .run();

  const row = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM confirm_opens WHERE provider_id = ? AND date = ?",
  )
    .bind(providerId, date)
    .first<{ count: number }>();

  return c.json({ status: "ok", confirm_count: row?.count ?? 0 });
});

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const confirmsRoutes = router;
