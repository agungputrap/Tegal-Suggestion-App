import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { expireYesterdayCheckins } from "./expire-checkins";
import { placesRoutes } from "./routes/places";
import { categoriesRoutes } from "./routes/categories";
import { providersRoutes } from "./routes/providers";
import { checkinsRoutes } from "./routes/checkins";
import { confirmsRoutes } from "./routes/confirms";
import { listingsRoutes } from "./routes/listings";
import { botRoutes, sendDailyPing } from "./routes/bot";
import { photosRoutes } from "./routes/photos";
import { kelolaRoutes } from "./routes/kelola";
import { adminRoutes } from "./routes/admin";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Publik
app.route("/", placesRoutes);
app.route("/", categoriesRoutes);
app.route("/", providersRoutes);
app.route("/", checkinsRoutes);
app.route("/", confirmsRoutes);
app.route("/", listingsRoutes);
app.route("/", photosRoutes);
app.route("/", kelolaRoutes);
app.route("/", botRoutes);

// Admin (auth di dalam router)
app.route("/admin", adminRoutes);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // 0 23 * * * = 06:00 WIB — ping harian "Buka hari ini?" (fase 1 #29)
    if (event.cron === "0 23 * * *") {
      ctx.waitUntil(sendDailyPing(env));
      return;
    }
    // 0 17 * * * = 00:00 WIB — expire checkin kemarin
    ctx.waitUntil(expireYesterdayCheckins(env));
  },
};
