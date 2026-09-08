import { env } from "cloudflare:workers";

// Terapkan migrasi D1 (disuntik via binding TEST_MIGRATIONS di vitest.config)
// ke database test. Dipanggil sekali di beforeAll suite yang menyentuh DB.
export async function applyMigrations() {
  const migrations = (env as { TEST_MIGRATIONS: { queries: string[] }[] })
    .TEST_MIGRATIONS;
  const statements = migrations.flatMap((m) =>
    m.queries.map((q) => env.DB.prepare(q))
  );
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}
