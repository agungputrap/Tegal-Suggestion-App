import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { expireYesterdayCheckins } from "./expire-checkins";
import { placesRoutes } from "./routes/places";
import { categoriesRoutes } from "./routes/categories";
import { providersRoutes } from "./routes/providers";
import { checkinsRoutes } from "./routes/checkins";
import { listingsRoutes } from "./routes/listings";
import { photosRoutes } from "./routes/photos";
import { adminRoutes } from "./routes/admin";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Publik
app.route("/", placesRoutes);
app.route("/", categoriesRoutes);
app.route("/", providersRoutes);
app.route("/", checkinsRoutes);
app.route("/", listingsRoutes);
app.route("/", photosRoutes);

// Admin (auth di dalam router)
app.route("/admin", adminRoutes);

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(expireYesterdayCheckins(env));
  },
};
