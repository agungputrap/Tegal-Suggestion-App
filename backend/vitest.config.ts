import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

// Migrasi dibaca saat config load, disuntik ke binding TEST_MIGRATIONS,
// lalu diterapkan ke D1 oleh helper test (applyMigrations).
const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.ts",
      miniflare: {
        compatibilityDate: "2024-09-23",
        compatibilityFlags: ["nodejs_compat"],
        bindings: {
          ENVIRONMENT: "test",
          ADMIN_TOKEN: "test-admin-token",
          TEST_MIGRATIONS: migrations,
        },
        kvNamespaces: ["ACTIVE_CACHE"],
        r2Buckets: ["PHOTOS"],
        d1Databases: ["DB"],
      },
    }),
  ],
});
