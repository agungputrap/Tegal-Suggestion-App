import type { Context, Next } from "hono";
import type { Env } from "./types";

// ---------------------------------------------------------
// Auth admin: satu shared token (Bearer), disimpan sebagai Worker secret.
// Setup: wrangler secret put ADMIN_TOKEN
// Cocok untuk MVP satu-admin; kalau butuh banyak admin dengan hak berbeda,
// ganti ke sistem user+password di D1 pada Fase 2.
// ---------------------------------------------------------
export async function adminAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const header = c.req.header("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");

  if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
}
