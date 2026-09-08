import { Hono } from "hono";
import type { Env } from "../types";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// GET /photos/* -> serve foto dari R2
// ---------------------------------------------------------
router.get("/photos/*", async (c) => {
  const key = c.req.path.replace(/^\/photos\//, "");
  const obj = await c.env.PHOTOS.get(key);

  if (!obj) return c.json({ error: "Foto tidak ditemukan" }, 404);

  return new Response(obj.body, {
    headers: {
      "Content-Type":
        obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: obj.httpEtag,
    },
  });
});

export const photosRoutes = router;
