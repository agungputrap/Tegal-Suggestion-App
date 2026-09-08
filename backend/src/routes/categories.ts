import { Hono } from "hono";
import type { Env } from "../types";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// GET /categories
// ---------------------------------------------------------
router.get("/categories", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, type, icon FROM categories ORDER BY type, name"
  ).all();
  return c.json({ categories: results });
});

export const categoriesRoutes = router;
